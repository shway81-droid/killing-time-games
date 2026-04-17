/* games/sequence-sort/game.js */
'use strict';

// ── Constants ────────────────────────────────────────────────
const TOTAL_ROUNDS  = 10;
const ROUND_SECONDS = 15;
const BAR_HEIGHTS   = [30, 45, 60, 75, 90]; // px values (viewBox height)
const BAR_WIDTH     = 36;
const BAR_PADDING   = 2;
const BAR_RADIUS    = 6;

const PLAYER_CONFIG = [
  { label: 'P1', colorClass: 'p-blue',   hex: '#1E88E5', barFill: '#42A5F5', barStroke: '#1565C0' },
  { label: 'P2', colorClass: 'p-red',    hex: '#E53935', barFill: '#EF5350', barStroke: '#B71C1C' },
  { label: 'P3', colorClass: 'p-orange', hex: '#FB8C00', barFill: '#FFA726', barStroke: '#E65100' },
  { label: 'P4', colorClass: 'p-purple', hex: '#8E24AA', barFill: '#AB47BC', barStroke: '#4A148C' },
];

const DEFAULT_BAR_FILL   = '#78909C';
const DEFAULT_BAR_STROKE = '#37474F';

// Full circumference of timer ring (r=24, 2πr ≈ 150.8)
const RING_CIRCUMFERENCE = 2 * Math.PI * 24; // 150.796...

// ── Sound Manager ────────────────────────────────────────────
const sound = createSoundManager({
  tap(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  },
  correctOrder(ctx) {
    // Ascending tone sequence
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  },
  wrong(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.28);
  },
  complete(ctx) {
    [392, 494, 587, 659, 784, 988, 1175].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  },
  roundEnd(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  },
});

// ── State ────────────────────────────────────────────────────
let playerCount  = 2;
let currentRound = 0;
let scores       = [];
let roundResults = [];
let roundActive  = false;
let roundWon     = false;

// Per-player data (rebuilt each round)
// playerZoneData[i] = { bars: [{height, order, placed}], nextExpected, done }
let playerZoneData = [];

// Timers
let roundTimer     = null;
let nextRoundDelay = null;
let countdownDelay = null;

// ── DOM refs ─────────────────────────────────────────────────
const introScreen  = document.getElementById('introScreen');
const gameScreen   = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');

const backBtn    = document.getElementById('backBtn');
const playBtn    = document.getElementById('playBtn');
const closeBtn   = document.getElementById('closeBtn');
const retryBtn   = document.getElementById('retryBtn');
const homeBtn    = document.getElementById('homeBtn');

const zonesWrap  = document.getElementById('zonesWrap');
const roundBadge = document.getElementById('roundBadge');
const timerArc   = document.getElementById('timerArc');
const timerLabel = document.getElementById('timerLabel');
const roundMsg   = document.getElementById('roundMsg');

const soundToggleIntro = document.getElementById('soundToggleIntro');
const soundIconIntro   = document.getElementById('soundIconIntro');

const resultTitle     = document.getElementById('resultTitle');
const resultWinner    = document.getElementById('resultWinner');
const resultTableHead = document.getElementById('resultTableHead');
const resultTableBody = document.getElementById('resultTableBody');
const totalRow        = document.getElementById('totalRow');

// ── Helpers ──────────────────────────────────────────────────
function showScreen(screen) {
  [introScreen, gameScreen, resultScreen].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function updateSoundIcon() {
  if (sound.isMuted()) {
    soundIconIntro.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>`;
  } else {
    soundIconIntro.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clearAllTimers() {
  if (roundTimer)     { roundTimer.stop(); roundTimer = null; }
  if (nextRoundDelay) { clearTimeout(nextRoundDelay); nextRoundDelay = null; }
  if (countdownDelay) { clearTimeout(countdownDelay); countdownDelay = null; }
}

// ── SVG Bar builder ───────────────────────────────────────────
function makeSvgBar(height, fill, stroke) {
  const w = BAR_WIDTH + BAR_PADDING * 2;
  const h = height + BAR_PADDING * 2;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${BAR_PADDING}" y="${BAR_PADDING}" width="${BAR_WIDTH}" height="${height}"
          rx="${BAR_RADIUS}" ry="${BAR_RADIUS}"
          fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  </svg>`;
}

// ── Timer ring ────────────────────────────────────────────────
function updateTimerRing(remaining) {
  const pct    = remaining / ROUND_SECONDS;
  const offset = RING_CIRCUMFERENCE * (1 - pct);
  timerArc.style.strokeDashoffset = offset;
  timerLabel.textContent = remaining;
  // Color shift as time runs out
  if (remaining <= 5) {
    timerArc.setAttribute('stroke', '#EF5350');
    timerLabel.style.color = '#EF5350';
  } else if (remaining <= 8) {
    timerArc.setAttribute('stroke', '#FFA726');
    timerLabel.style.color = '#FFA726';
  } else {
    timerArc.setAttribute('stroke', '#FFD54F');
    timerLabel.style.color = '#FFD54F';
  }
}

function resetTimerRing() {
  timerArc.style.strokeDashoffset = 0;
  timerArc.setAttribute('stroke', '#FFD54F');
  timerLabel.textContent = ROUND_SECONDS;
  timerLabel.style.color = '#FFD54F';
}

// ── Sound Toggle ─────────────────────────────────────────────
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundIcon();
});
updateSoundIcon();

// ── Intro selectors ──────────────────────────────────────────
document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// ── Nav ──────────────────────────────────────────────────────
onTap(backBtn,  () => { clearAllTimers(); goHome(); });
onTap(closeBtn, () => { clearAllTimers(); goHome(); });
onTap(homeBtn,  () => { clearAllTimers(); goHome(); });
onTap(retryBtn, () => startGame());
onTap(playBtn,  () => startGame());

// ── Zone building ─────────────────────────────────────────────
function buildZones() {
  zonesWrap.innerHTML = '';
  zonesWrap.className = `zones-wrap p${playerCount}`;

  for (let i = 0; i < playerCount; i++) {
    const cfg  = PLAYER_CONFIG[i];
    const zone = document.createElement('div');
    zone.className = `zone ${cfg.colorClass} state-wait`;
    zone.dataset.player = i;

    zone.innerHTML = `
      <div class="zone-info">
        <span class="zone-label">${cfg.label}</span>
        <span class="zone-score" id="score-${i}">0점</span>
      </div>
      <div class="zone-progress" id="progress-${i}">0 / 5</div>
      <div class="bars-stage" id="stage-${i}"></div>
    `;

    zonesWrap.appendChild(zone);
  }
}

function getZone(idx) {
  return zonesWrap.querySelector(`.zone[data-player="${idx}"]`);
}

// ── Bar rendering per zone ────────────────────────────────────
function renderBars(playerIdx) {
  const stage = document.getElementById(`stage-${playerIdx}`);
  if (!stage) return;
  const data  = playerZoneData[playerIdx];
  const cfg   = PLAYER_CONFIG[playerIdx];

  stage.innerHTML = '';

  data.bars.forEach((barInfo, barIdx) => {
    const btn = document.createElement('button');
    btn.className = 'bar-btn';
    btn.dataset.barIdx = barIdx;
    btn.setAttribute('aria-label', `막대 ${barInfo.height}px`);

    const fill   = barInfo.placed ? cfg.barFill   : DEFAULT_BAR_FILL;
    const stroke = barInfo.placed ? cfg.barStroke : DEFAULT_BAR_STROKE;

    btn.innerHTML = makeSvgBar(barInfo.height, fill, stroke);
    onTap(btn, (e) => handleBarTap(playerIdx, barIdx, btn, e));
    stage.appendChild(btn);
  });
}

// ── Generate new round bars ───────────────────────────────────
function generateRoundBars() {
  // Each player gets same set of shuffled heights (independent shuffles)
  playerZoneData = [];
  for (let i = 0; i < playerCount; i++) {
    const shuffled = shuffle(BAR_HEIGHTS);
    // Build bar objects with their sorted order (0 = shortest)
    const bars = shuffled.map(h => ({
      height: h,
      order:  BAR_HEIGHTS.indexOf(h), // 0..4, ascending
      placed: false,
    }));
    playerZoneData.push({ bars, nextExpected: 0, done: false });
  }
}

// ── Bar tap handler ───────────────────────────────────────────
function handleBarTap(playerIdx, barIdx, btn, e) {
  if (!roundActive) return;
  const data = playerZoneData[playerIdx];
  if (data.done) return;

  const bar = data.bars[barIdx];
  if (bar.placed) return; // already placed, ignore

  sound.play('tap');
  spawnRipple(btn, e);

  if (bar.order === data.nextExpected) {
    // Correct!
    bar.placed = true;
    data.nextExpected++;

    // Re-render bars to show highlight
    renderBars(playerIdx);
    updateProgress(playerIdx);

    if (data.nextExpected === 5) {
      // Player completed all bars
      data.done = true;
      sound.play('correctOrder');
      resolveRound(playerIdx);
    }
  } else {
    // Wrong bar — flash red briefly
    sound.play('wrong');
    btn.classList.remove('flash-wrong');
    // Force reflow to restart animation
    void btn.offsetWidth;
    btn.classList.add('flash-wrong');
    btn.addEventListener('animationend', () => btn.classList.remove('flash-wrong'), { once: true });
  }
}

function updateProgress(playerIdx) {
  const el   = document.getElementById(`progress-${playerIdx}`);
  const data = playerZoneData[playerIdx];
  if (el) el.textContent = `${data.nextExpected} / 5`;
}

// ── Ripple effect ─────────────────────────────────────────────
function spawnRipple(btn, e) {
  const zone  = btn.closest('.zone');
  if (!zone) return;
  const rect  = zone.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const x     = (touch ? touch.clientX : rect.left + rect.width  / 2) - rect.left;
  const y     = (touch ? touch.clientY : rect.top  + rect.height / 2) - rect.top;
  const size  = Math.max(rect.width, rect.height);
  const ripple = document.createElement('span');
  ripple.className  = 'zone-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top  = y + 'px';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.marginLeft = ripple.style.marginTop = `-${size / 2}px`;
  zone.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// ── Game flow ─────────────────────────────────────────────────
function startGame() {
  clearAllTimers();
  scores       = new Array(playerCount).fill(0);
  roundResults = [];
  currentRound = 0;
  showScreen(gameScreen);
  buildZones();
  nextRound();
}

function nextRound() {
  clearAllTimers();
  currentRound++;
  roundActive = false;
  roundWon    = false;

  roundBadge.textContent = `${currentRound} / ${TOTAL_ROUNDS}`;
  setRoundMsg('준비하세요!');
  resetTimerRing();
  setAllZoneState('state-wait');

  // Generate fresh bar layouts
  generateRoundBars();

  // Render bars for all zones
  for (let i = 0; i < playerCount; i++) {
    renderBars(i);
    updateProgress(i);
  }

  // Brief ready pause then activate
  nextRoundDelay = setTimeout(() => {
    nextRoundDelay = null;
    activateRound();
  }, 800);
}

function activateRound() {
  setAllZoneState('state-active');
  setRoundMsg('짧은 순서대로 터치!');
  roundActive = true;

  roundTimer = createTimer(
    ROUND_SECONDS,
    (remaining) => updateTimerRing(remaining),
    () => {
      // Time up — no winner
      roundTimer = null;
      onRoundTimeout();
    }
  );
  roundTimer.start();
}

function resolveRound(winnerIdx) {
  if (!roundActive || roundWon) return;
  roundActive = false;
  roundWon    = true;

  if (roundTimer) { roundTimer.pause(); }

  sound.play('complete');
  scores[winnerIdx]++;
  updateScoreDisplay(winnerIdx);

  const zone = getZone(winnerIdx);
  if (zone) {
    zone.classList.remove('state-wait', 'state-active', 'state-timeout');
    zone.classList.add('state-done');
  }

  const cfg = PLAYER_CONFIG[winnerIdx];
  setRoundMsg(`${cfg.label} 완성! +1점`);

  roundResults.push({ winner: winnerIdx });

  scheduleNextRound();
}

function onRoundTimeout() {
  if (roundWon) return;
  roundActive = false;

  sound.play('roundEnd');
  setRoundMsg('시간 초과! 다음 라운드...');
  setAllZoneState('state-timeout');

  roundResults.push({ winner: -1 });

  scheduleNextRound();
}

function scheduleNextRound() {
  nextRoundDelay = setTimeout(() => {
    nextRoundDelay = null;
    if (currentRound >= TOTAL_ROUNDS) {
      showResult();
    } else {
      nextRound();
    }
  }, 1600);
}

// ── Zone state helpers ────────────────────────────────────────
function setAllZoneState(stateClass) {
  for (let i = 0; i < playerCount; i++) {
    const z = getZone(i);
    if (!z) continue;
    z.classList.remove('state-wait', 'state-active', 'state-done', 'state-timeout');
    z.classList.add(stateClass);
  }
}

function setRoundMsg(msg) {
  roundMsg.textContent = msg;
}

function updateScoreDisplay(idx) {
  const el = document.getElementById(`score-${idx}`);
  if (el) el.textContent = `${scores[idx]}점`;
}

// ── Result screen ─────────────────────────────────────────────
function showResult() {
  clearAllTimers();
  sound.play('complete');

  const maxScore = Math.max(...scores);
  const winners  = scores.reduce((acc, s, i) => {
    if (s === maxScore) acc.push(i);
    return acc;
  }, []);

  if (winners.length === 1) {
    const cfg = PLAYER_CONFIG[winners[0]];
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `${cfg.label} 최종 우승! (${maxScore}점)`;
    resultWinner.style.color = cfg.hex;
  } else {
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `공동 우승: ${winners.map(i => PLAYER_CONFIG[i].label).join(', ')} (${maxScore}점)`;
    resultWinner.style.color = '#607D8B';
  }

  const players = Array.from({ length: playerCount }, (_, i) => PLAYER_CONFIG[i]);

  resultTableHead.innerHTML = `
    <tr>
      <th>라운드</th>
      ${players.map(p => `<th><span class="player-dot" style="background:${p.hex}"></span>${p.label}</th>`).join('')}
    </tr>
  `;

  resultTableBody.innerHTML = roundResults.map((r, ri) => {
    const cells = players.map((_, pi) => {
      if (r.winner === pi) return `<td class="cell-win">완성!</td>`;
      return `<td class="cell-none">—</td>`;
    }).join('');
    return `<tr><td>${ri + 1}</td>${cells}</tr>`;
  }).join('');

  totalRow.innerHTML = players.map((p, i) => `
    <div class="total-chip">
      <span class="chip-dot" style="background:${p.hex}"></span>
      <span>${p.label}</span>
      <span class="chip-score">${scores[i]}점</span>
    </div>
  `).join('');

  showScreen(resultScreen);
}
