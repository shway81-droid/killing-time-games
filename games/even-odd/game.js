/* games/even-odd/game.js */

'use strict';

// ── Constants ────────────────────────────────────────────────
const TOTAL_ROUNDS   = 15;
const RESULT_PAUSE_MS = 1100;  // pause between rounds

// Circle fill colors cycling each round
const CIRCLE_COLORS = [
  { fill: '#5C6BC0', stroke: '#3949AB' }, // indigo
  { fill: '#26A69A', stroke: '#00796B' }, // teal
  { fill: '#FFA726', stroke: '#E65100' }, // orange
  { fill: '#EC407A', stroke: '#AD1457' }, // pink
  { fill: '#42A5F5', stroke: '#1565C0' }, // blue
  { fill: '#AB47BC', stroke: '#6A1B9A' }, // purple
  { fill: '#66BB6A', stroke: '#2E7D32' }, // green
  { fill: '#EF5350', stroke: '#B71C1C' }, // red
];

// Player config: label, dot colour, zone bg class
const PLAYER_CONFIG = [
  { label: 'P1', dot: '#1565C0', cls: 'p1' },
  { label: 'P2', dot: '#C62828', cls: 'p2' },
  { label: 'P3', dot: '#2E7D32', cls: 'p3' },
  { label: 'P4', dot: '#E65100', cls: 'p4' },
];

// ── Sound Manager ────────────────────────────────────────────
const sound = createSoundManager({
  ding(ctx) {
    [523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  },

  buzz(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.28);
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  },

  fanfare(ctx) {
    [392, 494, 523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.13;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  },
});

// ── State ────────────────────────────────────────────────────
let playerCount  = 2;
let roundIdx     = 0;        // 0-based
let scores       = [];
let roundLog     = [];       // { number, isEven, winnerIdx, dqSet }
let currentNumber = 0;
let dqSet        = new Set();
let phase        = 'idle';   // 'idle' | 'active' | 'resolved'
let nextHandle   = null;

// ── DOM refs ─────────────────────────────────────────────────
const introScreen  = document.getElementById('introScreen');
const gameScreen   = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');

const backBtn      = document.getElementById('backBtn');
const playBtn      = document.getElementById('playBtn');
const closeBtn     = document.getElementById('closeBtn');
const retryBtn     = document.getElementById('retryBtn');
const homeBtn      = document.getElementById('homeBtn');

const zonesWrap    = document.getElementById('zonesWrap');
const roundCounter = document.getElementById('roundCounter');
const numberDisplay = document.getElementById('numberDisplay');
const centerLabel  = document.getElementById('centerLabel');
const roundStatus  = document.getElementById('roundStatus');
const scoreBar     = document.getElementById('scoreBar');

const soundToggleIntro = document.getElementById('soundToggleIntro');

const resultTitle     = document.getElementById('resultTitle');
const resultWinner    = document.getElementById('resultWinner');
const resultTableHead = document.getElementById('resultTableHead');
const resultTableBody = document.getElementById('resultTableBody');
const totalRow        = document.getElementById('totalRow');

// ── Helpers ──────────────────────────────────────────────────
function showScreen(s) {
  [introScreen, gameScreen, resultScreen].forEach(x => x.classList.remove('active'));
  s.classList.add('active');
}

function updateSoundBtn(btn) {
  btn.textContent = sound.isMuted() ? '🔇' : '🔊';
}

function clearTimers() {
  if (nextHandle) { clearTimeout(nextHandle); nextHandle = null; }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── SVG builders ─────────────────────────────────────────────

/**
 * Build the SVG number circle for the center display.
 * @param {number} num   - the number to show
 * @param {number} round - 0-based round index (for color cycling)
 */
function buildNumberSVG(num, round) {
  const c = CIRCLE_COLORS[round % CIRCLE_COLORS.length];
  const label = String(num);
  // Slightly smaller font for 2-digit numbers
  const fontSize = label.length === 1 ? 68 : 56;
  return `<svg viewBox="0 0 160 160" width="150" height="150" aria-label="${label}번">
  <circle cx="80" cy="80" r="72" fill="${c.fill}" stroke="${c.stroke}" stroke-width="4"/>
  <text x="80" y="96" text-anchor="middle" font-size="${fontSize}" font-weight="900" fill="#FFF" font-family="sans-serif" dominant-baseline="auto">${label}</text>
</svg>`;
}

/**
 * Build even (짝) button SVG.
 */
function buildEvenSVG(width, height) {
  return `<svg viewBox="0 0 100 70" width="${width}" height="${height}" aria-label="짝수">
  <rect x="3" y="3" width="94" height="64" rx="16" fill="#29B6F6" stroke="#0277BD" stroke-width="3"/>
  <text x="50" y="47" text-anchor="middle" font-size="30" font-weight="800" fill="#FFF" font-family="sans-serif">짝</text>
</svg>`;
}

/**
 * Build odd (홀) button SVG.
 */
function buildOddSVG(width, height) {
  return `<svg viewBox="0 0 100 70" width="${width}" height="${height}" aria-label="홀수">
  <rect x="3" y="3" width="94" height="64" rx="16" fill="#EF5350" stroke="#C62828" stroke-width="3"/>
  <text x="50" y="47" text-anchor="middle" font-size="30" font-weight="800" fill="#FFF" font-family="sans-serif">홀</text>
</svg>`;
}

// ── Sound toggle ─────────────────────────────────────────────
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundBtn(soundToggleIntro);
});
updateSoundBtn(soundToggleIntro);

// ── Player count selection ───────────────────────────────────
document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// ── Navigation ───────────────────────────────────────────────
onTap(backBtn,  () => { clearTimers(); goHome(); });
onTap(closeBtn, () => { clearTimers(); goHome(); });
onTap(homeBtn,  () => { clearTimers(); goHome(); });
onTap(retryBtn, () => startGame());
onTap(playBtn,  () => startGame());

// ── Build zone grid ──────────────────────────────────────────
function buildZones() {
  zonesWrap.innerHTML = '';
  zonesWrap.className = `zones-wrap p${playerCount}`;

  for (let i = 0; i < playerCount; i++) {
    const cfg  = PLAYER_CONFIG[i];
    const zone = document.createElement('div');
    zone.className = `zone ${cfg.cls}`;
    zone.dataset.player = i;

    // Header
    const header = document.createElement('div');
    header.className = 'zone-header';
    header.innerHTML = `
      <span class="zone-label">${cfg.label}</span>
      <span class="zone-score-chip" id="score-chip-${i}">0점</span>
    `;

    // Answer row: 짝 (even) and 홀 (odd) buttons
    const row = document.createElement('div');
    row.className = 'answer-row';

    const btnEven = document.createElement('button');
    btnEven.className = 'answer-tap';
    btnEven.dataset.player = i;
    btnEven.dataset.answer = 'even';
    btnEven.setAttribute('aria-label', '짝수');
    btnEven.innerHTML = buildEvenSVG('100%', '100%');

    const btnOdd = document.createElement('button');
    btnOdd.className = 'answer-tap';
    btnOdd.dataset.player = i;
    btnOdd.dataset.answer = 'odd';
    btnOdd.setAttribute('aria-label', '홀수');
    btnOdd.innerHTML = buildOddSVG('100%', '100%');

    onTap(btnEven, () => handleTap(i, 'even', btnEven));
    onTap(btnOdd,  () => handleTap(i, 'odd',  btnOdd));

    row.appendChild(btnEven);
    row.appendChild(btnOdd);
    zone.appendChild(header);
    zone.appendChild(row);
    zonesWrap.appendChild(zone);
  }
}

function getZone(idx) {
  return zonesWrap.querySelector(`.zone[data-player="${idx}"]`);
}

function getAnswerBtns(playerIdx) {
  return zonesWrap.querySelectorAll(`.answer-tap[data-player="${playerIdx}"]`);
}

function updateScoreChip(playerIdx) {
  const chip = document.getElementById(`score-chip-${playerIdx}`);
  if (chip) chip.textContent = `${scores[playerIdx]}점`;
}

// ── Build score bar ──────────────────────────────────────────
function buildScoreBar() {
  scoreBar.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const cfg  = PLAYER_CONFIG[i];
    const chip = document.createElement('div');
    chip.className = 'score-chip';
    chip.innerHTML = `
      <span class="score-chip-dot" style="background:${cfg.dot}"></span>
      <span>${cfg.label}</span>
      <span class="score-chip-val" id="bar-score-${i}">0</span>
    `;
    scoreBar.appendChild(chip);
  }
}

function updateBarScore(playerIdx) {
  const el = document.getElementById(`bar-score-${playerIdx}`);
  if (el) el.textContent = scores[playerIdx];
}

// ── Ripple ───────────────────────────────────────────────────
function spawnRipple(zone, e) {
  const rect  = zone.getBoundingClientRect();
  const src   = e && e.touches ? e.touches[0] : e;
  const x     = (src ? src.clientX : rect.left + rect.width  / 2) - rect.left;
  const y     = (src ? src.clientY : rect.top  + rect.height / 2) - rect.top;
  const r     = document.createElement('span');
  r.className = 'zone-ripple';
  const size  = Math.max(rect.width, rect.height);
  r.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin-left:${-size/2}px;margin-top:${-size/2}px`;
  zone.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

// ── Tap handler ──────────────────────────────────────────────
function handleTap(playerIdx, answer, btn) {
  if (phase !== 'active') return;
  if (dqSet.has(playerIdx)) return;

  const zone    = getZone(playerIdx);
  const rect    = btn.getBoundingClientRect();
  const zoneRect = zone.getBoundingClientRect();
  const syntheticE = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  spawnRipple(zone, syntheticE);

  const isEven   = currentNumber % 2 === 0;
  const correct  = (answer === 'even' && isEven) || (answer === 'odd' && !isEven);

  if (correct) {
    resolveRound(playerIdx, btn);
  } else {
    sound.play('buzz');
    btn.classList.add('state-wrong');
    disqualifyPlayer(playerIdx);
  }
}

function disqualifyPlayer(playerIdx) {
  if (dqSet.has(playerIdx)) return;
  dqSet.add(playerIdx);

  getAnswerBtns(playerIdx).forEach(b => {
    b.classList.add('state-disabled');
    b.disabled = true;
  });

  // All players DQ'd → no winner
  const allDQ = Array.from({ length: playerCount }, (_, i) => i).every(i => dqSet.has(i));
  if (allDQ) {
    resolveRound(-1, null);
  }
}

// ── Resolve round ────────────────────────────────────────────
function resolveRound(winnerIdx, winBtn) {
  if (phase !== 'active') return;
  phase = 'resolved';

  const isEven = currentNumber % 2 === 0;

  roundLog.push({
    number: currentNumber,
    isEven,
    winnerIdx,
    dqSet: new Set(dqSet),
  });

  if (winnerIdx >= 0) {
    sound.play('ding');
    scores[winnerIdx]++;
    updateScoreChip(winnerIdx);
    updateBarScore(winnerIdx);
    if (winBtn) winBtn.classList.add('state-correct');
    const cfg = PLAYER_CONFIG[winnerIdx];
    roundStatus.textContent = `${cfg.label} 정답!`;
  } else {
    sound.play('buzz');
    roundStatus.textContent = '모두 실격!';
  }

  nextHandle = setTimeout(nextRound, RESULT_PAUSE_MS);
}

// ── Round flow ───────────────────────────────────────────────
function startGame() {
  clearTimers();
  scores    = new Array(playerCount).fill(0);
  roundLog  = [];
  roundIdx  = 0;

  showScreen(gameScreen);
  buildZones();
  buildScoreBar();
  nextRound();
}

function nextRound() {
  if (roundIdx >= TOTAL_ROUNDS) {
    showResult();
    return;
  }

  dqSet  = new Set();
  phase  = 'idle';
  roundStatus.textContent = '';

  roundCounter.textContent = `${roundIdx + 1} / ${TOTAL_ROUNDS}`;

  // Re-enable all buttons
  for (let i = 0; i < playerCount; i++) {
    const z = getZone(i);
    if (z) z.classList.remove('dq-zone');
    getAnswerBtns(i).forEach(b => {
      b.className   = 'answer-tap';
      b.disabled    = false;
    });
  }

  // Pick a new random number (avoid same number back-to-back)
  let num;
  do {
    num = rand(1, 99);
  } while (num === currentNumber);
  currentNumber = num;

  // Update SVG display with pop animation
  numberDisplay.classList.remove('pop');
  numberDisplay.innerHTML = buildNumberSVG(currentNumber, roundIdx);
  // Force reflow for re-trigger
  void numberDisplay.offsetWidth;
  numberDisplay.classList.add('pop');

  roundIdx++;
  phase = 'active';
}

// ── Result screen ────────────────────────────────────────────
function showResult() {
  clearTimers();
  sound.play('fanfare');

  const maxScore = Math.max(...scores);
  const winners  = scores.reduce((acc, s, i) => { if (s === maxScore) acc.push(i); return acc; }, []);

  if (winners.length === 1) {
    const cfg = PLAYER_CONFIG[winners[0]];
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `${cfg.label} 최종 우승! 🎉`;
    resultWinner.style.color = cfg.dot;
  } else {
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `공동 우승: ${winners.map(i => PLAYER_CONFIG[i].label).join(', ')} 🎉`;
    resultWinner.style.color = '#3F51B5';
  }

  // Table header
  const players = Array.from({ length: playerCount }, (_, i) => PLAYER_CONFIG[i]);
  resultTableHead.innerHTML = `
    <tr>
      <th>#</th>
      <th>숫자</th>
      <th>정답</th>
      ${players.map(p => `<th><span class="player-dot" style="background:${p.dot}"></span>${p.label}</th>`).join('')}
    </tr>
  `;

  // Table body
  resultTableBody.innerHTML = roundLog.map((r, ri) => {
    const answer = r.isEven ? '짝' : '홀';
    const cells  = players.map((_, pi) => {
      if (r.winnerIdx === pi) return `<td class="cell-win">★</td>`;
      if (r.dqSet.has(pi))   return `<td class="cell-dq">실격</td>`;
      return `<td class="cell-none">—</td>`;
    }).join('');
    return `<tr>
      <td>${ri + 1}</td>
      <td style="font-weight:900;font-size:1.05rem">${r.number}</td>
      <td style="font-weight:800">${answer}</td>
      ${cells}
    </tr>`;
  }).join('');

  // Total chips
  totalRow.innerHTML = players.map((p, i) => `
    <div class="total-chip">
      <span class="chip-dot" style="background:${p.dot}"></span>
      <span>${p.label}</span>
      <span class="chip-score">${scores[i]}점</span>
    </div>
  `).join('');

  showScreen(resultScreen);
}
