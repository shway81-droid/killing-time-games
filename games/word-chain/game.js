/* games/word-chain/game.js */
'use strict';

// ── Constants ────────────────────────────────────────────────
const TOTAL_ROUNDS   = 10;
const ROUND_SECONDS  = 10;

const PLAYER_CONFIG = [
  { label: 'P1', hex: '#1E88E5', dimHex: '#0A3060', zoneClass: 'p1-zone', btnFill: '#1565C0', btnStroke: '#64B5F6' },
  { label: 'P2', hex: '#E53935', dimHex: '#3D0000', zoneClass: 'p2-zone', btnFill: '#B71C1C', btnStroke: '#EF9A9A' },
  { label: 'P3', hex: '#43A047', dimHex: '#0A2B0A', zoneClass: 'p3-zone', btnFill: '#1B5E20', btnStroke: '#A5D6A7' },
  { label: 'P4', hex: '#8E24AA', dimHex: '#200030', zoneClass: 'p4-zone', btnFill: '#4A148C', btnStroke: '#CE93D8' },
];

const WORD_POOL = [
  // 2-char
  '사과', '바다', '하늘', '나무', '구름', '노래', '사랑', '친구', '학교', '선생',
  '공부', '운동', '음악', '그림', '별빛',
  // 3-char
  '무지개', '고양이', '강아지', '비행기', '자전거',
];

const DISTRACTORS = [
  '가','나','다','라','마','바','아','자','차','카','타','파','하',
  '고','노','도','로','모','보','소','오','조','초','코','토','포','호'
];

// ── Sound Manager ────────────────────────────────────────────
const sound = createSoundManager({
  tap(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  },

  correct(ctx) {
    // Ascending two-tone chime
    [523, 659].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  },

  wrong(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  },

  complete(ctx) {
    // Fanfare: ascending arpeggio
    [392, 523, 659, 784, 1047].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  },
});

// ── State ────────────────────────────────────────────────────
let playerCount   = 2;
let currentRound  = 0;
let scores        = [];
let roundResults  = [];
let currentWord   = '';
let roundActive   = false;
let roundWon      = false;
let roundTimer    = null;
let nextRoundTimeout = null;

// Per-player state: progress index (how many chars correctly tapped)
let playerProgress = []; // [0..wordLen]

// ── DOM References ───────────────────────────────────────────
const introScreen  = document.getElementById('introScreen');
const gameScreen   = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');

const backBtn      = document.getElementById('backBtn');
const playBtn      = document.getElementById('playBtn');
const closeBtn     = document.getElementById('closeBtn');
const retryBtn     = document.getElementById('retryBtn');
const homeBtn      = document.getElementById('homeBtn');

const zonesWrap      = document.getElementById('zonesWrap');
const roundInfo      = document.getElementById('roundInfo');
const targetWordWrap = document.getElementById('targetWordWrap');
const timerFill      = document.getElementById('timerFill');
const timerText      = document.getElementById('timerText');
const roundOverlay   = document.getElementById('roundOverlay');
const roundResultBox = document.getElementById('roundResultBox');

const soundToggleIntro = document.getElementById('soundToggleIntro');
const soundIconIntro   = document.getElementById('soundIconIntro');

const resultTitle    = document.getElementById('resultTitle');
const resultWinner   = document.getElementById('resultWinner');
const resultScores   = document.getElementById('resultScores');
const resultTableHead = document.getElementById('resultTableHead');
const resultTableBody = document.getElementById('resultTableBody');

// ── Screen helpers ───────────────────────────────────────────
function showScreen(s) {
  [introScreen, gameScreen, resultScreen].forEach(x => x.classList.remove('active'));
  s.classList.add('active');
}

// ── Sound toggle ─────────────────────────────────────────────
function updateSoundIcon() {
  const muted = sound.isMuted();
  soundIconIntro.innerHTML = muted
    ? `<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
       <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>
       <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
}
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundIcon();
});
updateSoundIcon();

// ── Player select ─────────────────────────────────────────────
document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// ── Navigation ────────────────────────────────────────────────
onTap(backBtn, () => goHome());
onTap(closeBtn, () => { clearRoundTimers(); goHome(); });
onTap(homeBtn,  () => goHome());
onTap(retryBtn, () => startGame());
onTap(playBtn,  () => startGame());

// ── Utilities ────────────────────────────────────────────────
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(word, count) {
  const wordChars = new Set(word.split(''));
  const pool = DISTRACTORS.filter(c => !wordChars.has(c));
  return shuffle(pool).slice(0, count);
}

// ── Target word SVG renderer ─────────────────────────────────
// Renders each char of the word as a separate SVG box in the top bar.
function renderTargetWord(word) {
  targetWordWrap.innerHTML = '';
  const chars = word.split('');
  const boxW = 54, boxH = 54, r = 10;

  chars.forEach((ch, i) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', boxW);
    svg.setAttribute('height', boxH);
    svg.setAttribute('viewBox', `0 0 ${boxW} ${boxH}`);

    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', '2'); rect.setAttribute('y', '2');
    rect.setAttribute('width', boxW - 4); rect.setAttribute('height', boxH - 4);
    rect.setAttribute('rx', r);
    rect.setAttribute('fill', 'rgba(255,255,255,0.08)');
    rect.setAttribute('stroke', 'rgba(255,255,255,0.25)');
    rect.setAttribute('stroke-width', '2');
    svg.appendChild(rect);

    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', boxW / 2);
    text.setAttribute('y', boxH / 2 + 1);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-family', "'Noto Sans KR', 'Pretendard Variable', sans-serif");
    text.setAttribute('font-size', '26');
    text.setAttribute('font-weight', '800');
    text.setAttribute('fill', 'rgba(255,255,255,0.9)');
    text.textContent = ch;
    svg.appendChild(text);

    // Number label — overlay inside the same SVG
    const numCirc = document.createElementNS(ns, 'circle');
    numCirc.setAttribute('cx', boxW - 6); numCirc.setAttribute('cy', 6);
    numCirc.setAttribute('r', '8');
    numCirc.setAttribute('fill', '#FF7043');
    svg.appendChild(numCirc);

    const numTxt = document.createElementNS(ns, 'text');
    numTxt.setAttribute('x', boxW - 6); numTxt.setAttribute('y', 6);
    numTxt.setAttribute('text-anchor', 'middle');
    numTxt.setAttribute('dominant-baseline', 'middle');
    numTxt.setAttribute('font-family', 'sans-serif');
    numTxt.setAttribute('font-size', '9');
    numTxt.setAttribute('font-weight', '800');
    numTxt.setAttribute('fill', '#fff');
    numTxt.textContent = i + 1;
    svg.appendChild(numTxt);

    svg.dataset.charIndex = i;
    svg.id = `target-char-${i}`;
    targetWordWrap.appendChild(svg);
  });
}

// Highlight a target char box as "filled" (player completed up to this index)
function highlightTargetChar(charIdx, playerIdx) {
  const svg = document.getElementById(`target-char-${charIdx}`);
  if (!svg) return;
  const cfg = PLAYER_CONFIG[playerIdx];
  const rect = svg.querySelector('rect');
  if (rect) {
    rect.setAttribute('fill', cfg.hex);
    rect.setAttribute('stroke', cfg.hex);
    rect.setAttribute('fill-opacity', '0.8');
  }
  const txt = svg.querySelector('text');
  if (txt) txt.setAttribute('fill', '#fff');
}

function resetTargetWord() {
  const chars = currentWord.split('');
  chars.forEach((_, i) => {
    const svg = document.getElementById(`target-char-${i}`);
    if (!svg) return;
    const rect = svg.querySelector('rect');
    if (rect) {
      rect.setAttribute('fill', 'rgba(255,255,255,0.08)');
      rect.setAttribute('stroke', 'rgba(255,255,255,0.25)');
      rect.setAttribute('fill-opacity', '1');
    }
    const txt = svg.querySelector('text');
    if (txt) txt.setAttribute('fill', 'rgba(255,255,255,0.9)');
  });
}

// ── Character button SVG builder ─────────────────────────────
// Returns a div.char-btn containing an SVG rounded rect + char text.
function buildCharBtn(ch, playerIdx) {
  const cfg = PLAYER_CONFIG[playerIdx];
  const ns  = 'http://www.w3.org/2000/svg';
  const W = 64, H = 64, R = 14;

  const btn = document.createElement('div');
  btn.className = 'char-btn';
  btn.dataset.char = ch;

  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.pointerEvents = 'none';

  // Background rect
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', '3'); rect.setAttribute('y', '3');
  rect.setAttribute('width', W - 6); rect.setAttribute('height', H - 6);
  rect.setAttribute('rx', R);
  rect.setAttribute('fill', cfg.btnFill);
  rect.setAttribute('stroke', cfg.btnStroke);
  rect.setAttribute('stroke-width', '2.5');
  rect.setAttribute('class', 'char-rect');
  svg.appendChild(rect);

  // Character text
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', W / 2);
  text.setAttribute('y', H / 2 + 1);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-family', "'Noto Sans KR', 'Pretendard Variable', sans-serif");
  text.setAttribute('font-size', '28');
  text.setAttribute('font-weight', '800');
  text.setAttribute('fill', '#FFFFFF');
  text.setAttribute('class', 'char-text');
  text.textContent = ch;
  svg.appendChild(text);

  btn.appendChild(svg);
  return btn;
}

// Mark a char btn as correctly tapped (turn green, show order number)
function markCharCorrect(btn, orderNum, playerIdx) {
  const cfg = PLAYER_CONFIG[playerIdx];
  const rect = btn.querySelector('.char-rect');
  const text = btn.querySelector('.char-text');
  if (rect) {
    rect.setAttribute('fill', cfg.hex);
    rect.setAttribute('stroke', '#fff');
  }
  if (text) text.setAttribute('fill', '#fff');

  // Show order badge
  const badge = document.createElement('div');
  badge.className = 'char-order-badge';
  badge.textContent = orderNum;
  badge.style.color = cfg.hex;
  btn.appendChild(badge);
}

// Reset a char btn to default appearance
function resetCharBtn(btn, playerIdx) {
  const cfg = PLAYER_CONFIG[playerIdx];
  const rect = btn.querySelector('.char-rect');
  const text = btn.querySelector('.char-text');
  if (rect) {
    rect.setAttribute('fill', cfg.btnFill);
    rect.setAttribute('stroke', cfg.btnStroke);
  }
  if (text) text.setAttribute('fill', '#FFFFFF');
  // Remove any order badge
  const badge = btn.querySelector('.char-order-badge');
  if (badge) badge.remove();
}

// Flash red on wrong tap
function flashWrong(btn) {
  btn.classList.remove('flash-wrong');
  void btn.offsetWidth; // reflow
  btn.classList.add('flash-wrong');
  btn.addEventListener('animationend', () => btn.classList.remove('flash-wrong'), { once: true });
}

// ── Zone builder ─────────────────────────────────────────────
function buildZones(word) {
  zonesWrap.innerHTML = '';
  zonesWrap.className = `zones-wrap p${playerCount}`;

  const chars = word.split('');
  const wordLen = chars.length;

  for (let p = 0; p < playerCount; p++) {
    const cfg  = PLAYER_CONFIG[p];
    const zone = document.createElement('div');
    zone.className = `zone ${cfg.zoneClass}`;
    zone.dataset.player = p;

    // Player label
    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = cfg.label;
    zone.appendChild(label);

    // Score badge
    const scoreBadge = document.createElement('div');
    scoreBadge.className = 'zone-score';
    scoreBadge.id = `zone-score-${p}`;
    scoreBadge.textContent = scores[p] + '점';
    zone.appendChild(scoreBadge);

    // Build char set: word chars + 2 distractors, shuffled independently per zone
    const distractors = pickDistractors(word, 2);
    const allChars    = shuffle([...chars, ...distractors]);

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'char-grid ' + (wordLen === 2 ? 'grid-2x2' : 'grid-3');
    grid.id = `grid-p${p}`;

    allChars.forEach(ch => {
      const btn = buildCharBtn(ch, p);
      onTap(btn, () => handleCharTap(p, ch, btn));
      grid.appendChild(btn);
    });

    zone.appendChild(grid);
    zonesWrap.appendChild(zone);
  }
}

// ── Timer ─────────────────────────────────────────────────────
function startRoundTimer() {
  let remaining = ROUND_SECONDS;
  timerFill.style.transition = 'none';
  timerFill.style.width = '100%';
  timerFill.classList.remove('danger');
  timerText.textContent = remaining;

  // Force reflow then start transition
  void timerFill.offsetWidth;
  timerFill.style.transition = `width ${ROUND_SECONDS}s linear`;
  timerFill.style.width = '0%';

  roundTimer = createTimer(ROUND_SECONDS, (rem) => {
    timerText.textContent = rem;
    if (rem <= 3) timerFill.classList.add('danger');
  }, () => {
    if (roundActive) onRoundTimeout();
  });
  roundTimer.start();
}

function clearRoundTimers() {
  if (roundTimer) { roundTimer.stop(); roundTimer = null; }
  if (nextRoundTimeout) { clearTimeout(nextRoundTimeout); nextRoundTimeout = null; }
}

// ── Game flow ─────────────────────────────────────────────────
function startGame() {
  scores       = new Array(playerCount).fill(0);
  roundResults = [];
  currentRound = 0;
  showScreen(gameScreen);
  nextRound();
}

function nextRound() {
  clearRoundTimers();
  currentRound++;
  roundActive  = true;
  roundWon     = false;
  playerProgress = new Array(playerCount).fill(0);

  // Pick random word (avoid repeats where possible)
  const pool = WORD_POOL.slice();
  currentWord = pool[Math.floor(Math.random() * pool.length)];

  roundInfo.textContent = `Round ${currentRound} / ${TOTAL_ROUNDS}`;
  roundOverlay.classList.add('hidden');

  renderTargetWord(currentWord);
  buildZones(currentWord);
  updateAllZoneScores();
  startRoundTimer();
}

// ── Tap handler ───────────────────────────────────────────────
function handleCharTap(playerIdx, ch, btn) {
  if (!roundActive || roundWon) return;

  const expected = currentWord[playerProgress[playerIdx]];

  if (ch === expected) {
    // Correct tap
    sound.play(playerProgress[playerIdx] === 0 ? 'tap' : 'correct');
    const orderNum = playerProgress[playerIdx] + 1;
    markCharCorrect(btn, orderNum, playerIdx);
    highlightTargetChar(playerProgress[playerIdx], playerIdx);
    playerProgress[playerIdx]++;

    if (playerProgress[playerIdx] === currentWord.length) {
      // Word complete!
      onRoundWon(playerIdx);
    }
  } else {
    // Wrong tap
    sound.play('wrong');
    flashWrong(btn);
    // Reset this player's progress
    resetPlayerProgress(playerIdx);
  }
}

function resetPlayerProgress(playerIdx) {
  playerProgress[playerIdx] = 0;
  // Reset all buttons in this player's grid
  const grid = document.getElementById(`grid-p${playerIdx}`);
  if (!grid) return;
  grid.querySelectorAll('.char-btn').forEach(btn => resetCharBtn(btn, playerIdx));
  // Reset target word highlights (only those due to this player)
  // Re-render target word cleanly then re-highlight any other player's progress
  resetTargetWord();
  // Re-highlight progress for other players (show whichever is furthest)
  for (let p = 0; p < playerCount; p++) {
    if (p === playerIdx) continue;
    for (let ci = 0; ci < playerProgress[p]; ci++) {
      highlightTargetChar(ci, p);
    }
  }
}

function onRoundWon(playerIdx) {
  roundActive = false;
  roundWon    = true;
  clearRoundTimers();

  sound.play('complete');
  scores[playerIdx]++;
  roundResults.push({ winner: playerIdx });

  const cfg = PLAYER_CONFIG[playerIdx];
  roundResultBox.innerHTML = `
    <div style="color:${cfg.hex};font-size:1.1rem;margin-bottom:6px;">${cfg.label} 정답!</div>
    <div style="font-size:2.2rem;font-weight:900;letter-spacing:0.1em;">${currentWord}</div>
    <div style="font-size:0.9rem;color:rgba(255,255,255,0.5);margin-top:4px;">${scores[playerIdx]}점 획득</div>
  `;
  roundOverlay.classList.remove('hidden');

  // Flash zone
  const zone = zonesWrap.querySelector(`.zone[data-player="${playerIdx}"]`);
  if (zone) {
    zone.classList.add('zone-winner');
    zone.addEventListener('animationend', () => zone.classList.remove('zone-winner'), { once: true });
  }

  scheduleNext();
}

function onRoundTimeout() {
  roundActive = false;
  roundWon    = true; // prevent further taps
  clearRoundTimers();

  roundResults.push({ winner: -1 });

  roundResultBox.innerHTML = `
    <div style="color:rgba(255,255,255,0.5);font-size:1rem;margin-bottom:4px;">시간 초과!</div>
    <div style="font-size:2rem;font-weight:900;letter-spacing:0.1em;">${currentWord}</div>
  `;
  roundOverlay.classList.remove('hidden');

  scheduleNext();
}

function scheduleNext() {
  nextRoundTimeout = setTimeout(() => {
    nextRoundTimeout = null;
    if (currentRound >= TOTAL_ROUNDS) {
      showResult();
    } else {
      nextRound();
    }
  }, 2000);
}

function updateAllZoneScores() {
  for (let p = 0; p < playerCount; p++) {
    const el = document.getElementById(`zone-score-${p}`);
    if (el) el.textContent = scores[p] + '점';
  }
}

// ── Result screen ─────────────────────────────────────────────
function showResult() {
  sound.play('complete');

  const maxScore = Math.max(...scores);
  const winners  = scores.reduce((acc, s, i) => { if (s === maxScore) acc.push(i); return acc; }, []);

  if (winners.length === 1) {
    const cfg = PLAYER_CONFIG[winners[0]];
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `${cfg.label} 최종 우승!`;
    resultWinner.style.color = cfg.hex;
  } else {
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `공동 우승: ${winners.map(i => PLAYER_CONFIG[i].label).join(', ')}`;
    resultWinner.style.color = '#FF7043';
  }

  // Score chips
  resultScores.innerHTML = scores.map((s, i) => {
    const cfg = PLAYER_CONFIG[i];
    return `
      <div class="score-chip">
        <div class="score-chip-dot" style="background:${cfg.hex}"></div>
        <span>${cfg.label}</span>
        <span class="score-chip-val" style="color:${cfg.hex}">${s}점</span>
      </div>
    `;
  }).join('');

  // Table header
  const players = Array.from({ length: playerCount }, (_, i) => PLAYER_CONFIG[i]);
  resultTableHead.innerHTML = `
    <tr>
      <th>라운드</th>
      ${players.map(p => `<th><span class="player-dot" style="background:${p.hex}"></span>${p.label}</th>`).join('')}
    </tr>
  `;

  // Table body
  resultTableBody.innerHTML = roundResults.map((r, ri) => {
    const cells = players.map((_, pi) => {
      if (r.winner === pi) return `<td class="cell-win">★ 완성</td>`;
      if (r.winner === -1) return `<td class="cell-timeout">시간초과</td>`;
      return `<td class="cell-none">—</td>`;
    }).join('');
    return `<tr><td>${ri + 1}</td>${cells}</tr>`;
  }).join('');

  showScreen(resultScreen);
}
