/* games/flag-quiz/game.js */

'use strict';

// ── Constants ────────────────────────────────────────────────
const TOTAL_ROUNDS    = 10;
const ROUND_TIME      = 8;     // seconds per round
const RESULT_PAUSE_MS = 2000;

// Player config
const PLAYER_CONFIG = [
  { label: 'P1', dot: '#0288D1', zoneBg: '#B3E5FC', cls: 'p1' },
  { label: 'P2', dot: '#E53935', zoneBg: '#FFCDD2', cls: 'p2' },
  { label: 'P3', dot: '#388E3C', zoneBg: '#C8E6C9', cls: 'p3' },
  { label: 'P4', dot: '#F57C00', zoneBg: '#FFE0B2', cls: 'p4' },
];

// ── SVG Flag Library ─────────────────────────────────────────
// Each returns an SVG string with viewBox="0 0 90 60"

function flagKorea() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#fff"/>
    <!-- Taeguk simplified: red top arc, blue bottom arc -->
    <circle cx="45" cy="30" r="13" fill="#CD2E3A"/>
    <clipPath id="kr-clip">
      <rect x="32" y="30" width="26" height="13"/>
    </clipPath>
    <circle cx="45" cy="30" r="13" fill="#003478" clip-path="url(#kr-clip)"/>
    <circle cx="45" cy="23.5" r="6.5" fill="#CD2E3A"/>
    <circle cx="45" cy="36.5" r="6.5" fill="#003478"/>
    <!-- Simplified trigrams as black bars -->
    <g fill="#000">
      <rect x="18" y="18" width="10" height="3"/>
      <rect x="18" y="23" width="10" height="3"/>
      <rect x="18" y="28" width="4" height="3"/>
      <rect x="26" y="28" width="4" height="3"/>
      <rect x="62" y="18" width="10" height="3"/>
      <rect x="62" y="23" width="4" height="3"/>
      <rect x="68" y="23" width="4" height="3"/>
      <rect x="62" y="28" width="10" height="3"/>
      <rect x="18" y="36" width="4" height="3"/>
      <rect x="24" y="36" width="4" height="3"/>
      <rect x="18" y="41" width="10" height="3"/>
      <rect x="18" y="46" width="4" height="3"/>
      <rect x="24" y="46" width="4" height="3"/>
      <rect x="62" y="36" width="10" height="3"/>
      <rect x="62" y="41" width="10" height="3"/>
      <rect x="62" y="46" width="10" height="3"/>
    </g>
  </svg>`;
}

function flagJapan() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#fff"/>
    <circle cx="45" cy="30" r="18" fill="#BC002D"/>
  </svg>`;
}

function flagChina() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#DE2910"/>
    <!-- Large star -->
    <polygon points="15,8 17.4,15.5 25,15.5 19,20 21.4,27.5 15,23 8.6,27.5 11,20 5,15.5 12.6,15.5"
             fill="#FFDE00" transform="translate(0,-2)"/>
    <!-- 4 small stars -->
    <polygon points="30,5 31.2,8.7 35,8.7 32,11 33.2,14.7 30,12.5 26.8,14.7 28,11 25,8.7 28.8,8.7"
             fill="#FFDE00" transform="scale(0.55) translate(25,3)"/>
    <polygon points="38,12 39.2,15.7 43,15.7 40,18 41.2,21.7 38,19.5 34.8,21.7 36,18 33,15.7 36.8,15.7"
             fill="#FFDE00" transform="scale(0.55) translate(25,3)"/>
    <polygon points="38,24 39.2,27.7 43,27.7 40,30 41.2,33.7 38,31.5 34.8,33.7 36,30 33,27.7 36.8,27.7"
             fill="#FFDE00" transform="scale(0.55) translate(25,3)"/>
    <polygon points="30,30 31.2,33.7 35,33.7 32,36 33.2,39.7 30,37.5 26.8,39.7 28,36 25,33.7 28.8,33.7"
             fill="#FFDE00" transform="scale(0.55) translate(25,3)"/>
  </svg>`;
}

function flagUSA() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#B22234"/>
    <!-- White stripes -->
    <rect y="4.6" width="90" height="4.6" fill="#fff"/>
    <rect y="13.8" width="90" height="4.6" fill="#fff"/>
    <rect y="23.1" width="90" height="4.6" fill="#fff"/>
    <rect y="32.3" width="90" height="4.6" fill="#fff"/>
    <rect y="41.5" width="90" height="4.6" fill="#fff"/>
    <rect y="50.8" width="90" height="4.6" fill="#fff"/>
    <!-- Blue canton -->
    <rect width="38" height="32" fill="#3C3B6E"/>
    <!-- Stars (simplified dots) -->
    <g fill="#fff">
      <circle cx="5"  cy="4"  r="2"/><circle cx="11" cy="4"  r="2"/><circle cx="17" cy="4"  r="2"/><circle cx="23" cy="4"  r="2"/><circle cx="29" cy="4"  r="2"/><circle cx="35" cy="4"  r="2"/>
      <circle cx="8"  cy="8"  r="2"/><circle cx="14" cy="8"  r="2"/><circle cx="20" cy="8"  r="2"/><circle cx="26" cy="8"  r="2"/><circle cx="32" cy="8"  r="2"/>
      <circle cx="5"  cy="12" r="2"/><circle cx="11" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="23" cy="12" r="2"/><circle cx="29" cy="12" r="2"/><circle cx="35" cy="12" r="2"/>
      <circle cx="8"  cy="16" r="2"/><circle cx="14" cy="16" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="26" cy="16" r="2"/><circle cx="32" cy="16" r="2"/>
      <circle cx="5"  cy="20" r="2"/><circle cx="11" cy="20" r="2"/><circle cx="17" cy="20" r="2"/><circle cx="23" cy="20" r="2"/><circle cx="29" cy="20" r="2"/><circle cx="35" cy="20" r="2"/>
      <circle cx="8"  cy="24" r="2"/><circle cx="14" cy="24" r="2"/><circle cx="20" cy="24" r="2"/><circle cx="26" cy="24" r="2"/><circle cx="32" cy="24" r="2"/>
      <circle cx="5"  cy="28" r="2"/><circle cx="11" cy="28" r="2"/><circle cx="17" cy="28" r="2"/><circle cx="23" cy="28" r="2"/><circle cx="29" cy="28" r="2"/><circle cx="35" cy="28" r="2"/>
    </g>
  </svg>`;
}

function flagFrance() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="30" height="60" fill="#002395"/>
    <rect x="30" width="30" height="60" fill="#fff"/>
    <rect x="60" width="30" height="60" fill="#ED2939"/>
  </svg>`;
}

function flagGermany() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="20" fill="#000"/>
    <rect y="20" width="90" height="20" fill="#DD0000"/>
    <rect y="40" width="90" height="20" fill="#FFCE00"/>
  </svg>`;
}

function flagItaly() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="30" height="60" fill="#009246"/>
    <rect x="30" width="30" height="60" fill="#fff"/>
    <rect x="60" width="30" height="60" fill="#CE2B37"/>
  </svg>`;
}

function flagUK() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#012169"/>
    <!-- White diagonals -->
    <line x1="0" y1="0" x2="90" y2="60" stroke="#fff" stroke-width="12"/>
    <line x1="90" y1="0" x2="0" y2="60" stroke="#fff" stroke-width="12"/>
    <!-- Red diagonals -->
    <line x1="0" y1="0" x2="90" y2="60" stroke="#C8102E" stroke-width="7"/>
    <line x1="90" y1="0" x2="0" y2="60" stroke="#C8102E" stroke-width="7"/>
    <!-- White cross -->
    <rect x="35" y="0" width="20" height="60" fill="#fff"/>
    <rect y="20" width="90" height="20" fill="#fff"/>
    <!-- Red cross -->
    <rect x="38" y="0" width="14" height="60" fill="#C8102E"/>
    <rect y="23" width="90" height="14" fill="#C8102E"/>
  </svg>`;
}

function flagBrazil() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#009C3B"/>
    <!-- Yellow diamond -->
    <polygon points="45,5 85,30 45,55 5,30" fill="#FFDF00"/>
    <!-- Blue circle -->
    <circle cx="45" cy="30" r="14" fill="#002776"/>
    <!-- White band -->
    <rect x="30" y="27" width="30" height="6" fill="#fff" rx="3"/>
  </svg>`;
}

function flagCanada() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="22" height="60" fill="#FF0000"/>
    <rect x="22" width="46" height="60" fill="#fff"/>
    <rect x="68" width="22" height="60" fill="#FF0000"/>
    <!-- Simplified maple leaf as polygon -->
    <polygon points="45,10 48,20 58,18 52,25 60,30 50,29 48,38 45,32 42,38 40,29 30,30 38,25 32,18 42,20"
             fill="#FF0000"/>
    <rect x="43" y="38" width="4" height="10" fill="#FF0000"/>
  </svg>`;
}

function flagThailand() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#A51931"/>
    <rect y="10" width="90" height="10" fill="#fff"/>
    <rect y="20" width="90" height="20" fill="#2D2A4A"/>
    <rect y="40" width="90" height="10" fill="#fff"/>
  </svg>`;
}

function flagIndonesia() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="30" fill="#CE1126"/>
    <rect y="30" width="90" height="30" fill="#fff"/>
  </svg>`;
}

function flagSweden() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#006AA7"/>
    <!-- Yellow cross -->
    <rect x="25" y="0" width="15" height="60" fill="#FECC02"/>
    <rect y="22" width="90" height="15" fill="#FECC02"/>
  </svg>`;
}

function flagSwitzerland() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#FF0000"/>
    <!-- White cross -->
    <rect x="36" y="13" width="18" height="34" fill="#fff"/>
    <rect x="22" y="22" width="46" height="16" fill="#fff"/>
  </svg>`;
}

function flagBangladesh() {
  return `<svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="90" height="60" fill="#006A4E"/>
    <!-- Red circle, shifted slightly left of center -->
    <circle cx="42" cy="30" r="18" fill="#F42A41"/>
  </svg>`;
}

// ── Flag Data ────────────────────────────────────────────────
const ALL_FLAGS = [
  { name: '대한민국', svg: flagKorea },
  { name: '일본',     svg: flagJapan },
  { name: '중국',     svg: flagChina },
  { name: '미국',     svg: flagUSA },
  { name: '프랑스',   svg: flagFrance },
  { name: '독일',     svg: flagGermany },
  { name: '이탈리아', svg: flagItaly },
  { name: '영국',     svg: flagUK },
  { name: '브라질',   svg: flagBrazil },
  { name: '캐나다',   svg: flagCanada },
  { name: '태국',     svg: flagThailand },
  { name: '인도네시아', svg: flagIndonesia },
  { name: '스웨덴',   svg: flagSweden },
  { name: '스위스',   svg: flagSwitzerland },
  { name: '방글라데시', svg: flagBangladesh },
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
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.start(t);
      osc.stop(t + 0.32);
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
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
  },
  timeout(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  },
  tick(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  },
  fanfare(ctx) {
    [392, 494, 523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  },
});

// ── State ────────────────────────────────────────────────────
let playerCount   = 2;
let roundIdx      = 0;
let scores        = [];
let roundLog      = [];    // { flagName, winnerIdx(-1=timeout), dqPlayers[], timedOut }
let currentFlag   = null;  // { name, svg }
let currentChoices = [];   // 4 country names for this round (includes correct)
let dqSet         = new Set();
let phase         = 'idle';
let timerHandle   = null;
let nextHandle    = null;
let timeRemaining = ROUND_TIME;
let gameRounds    = [];    // 10 selected flags

// ── DOM refs ─────────────────────────────────────────────────
const introScreen     = document.getElementById('introScreen');
const countdownScreen = document.getElementById('countdownScreen');
const countdownNumber = document.getElementById('countdownNumber');
const gameScreen    = document.getElementById('gameScreen');
const resultScreen  = document.getElementById('resultScreen');

const backBtn       = document.getElementById('backBtn');
const playBtn       = document.getElementById('playBtn');
const closeBtn      = document.getElementById('closeBtn');
const retryBtn      = document.getElementById('retryBtn');
const homeBtn       = document.getElementById('homeBtn');

const zonesWrap     = document.getElementById('zonesWrap');
const questionCounter = document.getElementById('questionCounter');
const problemTimer  = document.getElementById('problemTimer');
const flagDisplay   = document.getElementById('flagDisplay');
const problemStatus = document.getElementById('problemStatus');
const scoreBar      = document.getElementById('scoreBar');

const soundToggleIntro = document.getElementById('soundToggleIntro');
const introFlagRow  = document.getElementById('introFlagRow');

const resultTitle   = document.getElementById('resultTitle');
const resultWinner  = document.getElementById('resultWinner');
const resultTableHead = document.getElementById('resultTableHead');
const resultTableBody = document.getElementById('resultTableBody');
const totalRow      = document.getElementById('totalRow');

// ── Helpers ──────────────────────────────────────────────────
function showScreen(s) {
  [introScreen, countdownScreen, gameScreen, resultScreen].forEach(x => x.classList.remove('active'));
  s.classList.add('active');
}

var countdownInterval = null;
function startPreGameCountdown(onDone) {
  showScreen(countdownScreen);
  var count = 3;
  countdownNumber.textContent = count;
  countdownInterval = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      onDone();
    } else {
      countdownNumber.textContent = count;
      countdownNumber.style.animation = 'none';
      countdownNumber.offsetHeight;
      countdownNumber.style.animation = '';
    }
  }, 1000);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clearTimers() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  if (nextHandle)  { clearTimeout(nextHandle);   nextHandle  = null; }
}

function updateSoundBtn(btn) {
  btn.textContent = sound.isMuted() ? '🔇' : '🔊';
}

// Pick 4 answer choices: correct + 3 random wrong ones
function makeChoices(correctName) {
  const others = shuffle(ALL_FLAGS.filter(f => f.name !== correctName));
  const wrong = others.slice(0, 3).map(f => f.name);
  return shuffle([correctName, ...wrong]);
}

// ── Intro flag preview ───────────────────────────────────────
function renderIntroFlags() {
  introFlagRow.innerHTML = '';
  const sample = shuffle(ALL_FLAGS).slice(0, 3);
  sample.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'intro-flag-thumb';
    wrap.innerHTML = f.svg();
    introFlagRow.appendChild(wrap);
  });
}
renderIntroFlags();

// ── Player count selection ───────────────────────────────────
document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// ── Sound toggle ─────────────────────────────────────────────
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundBtn(soundToggleIntro);
});
updateSoundBtn(soundToggleIntro);

// ── Navigation ───────────────────────────────────────────────
onTap(backBtn,  () => goHome());
onTap(closeBtn, () => { clearTimers(); goHome(); });
onTap(homeBtn,  () => goHome());
onTap(retryBtn, () => startPreGameCountdown(() => startGame()));
onTap(playBtn,  () => startPreGameCountdown(() => startGame()));

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

    // 2x2 answer button grid
    const grid = document.createElement('div');
    grid.className = 'answer-grid';
    grid.id = `answer-grid-${i}`;

    zone.appendChild(header);
    zone.appendChild(grid);
    zonesWrap.appendChild(zone);
  }
}

function getZone(idx) {
  return zonesWrap.querySelector(`.zone[data-player="${idx}"]`);
}

function getAnswerBtns(playerIdx) {
  const grid = document.getElementById(`answer-grid-${playerIdx}`);
  return grid ? Array.from(grid.querySelectorAll('.answer-btn')) : [];
}

function updateScoreChip(playerIdx) {
  const chip = document.getElementById(`score-chip-${playerIdx}`);
  if (chip) chip.textContent = `${scores[playerIdx]}점`;
}

// ── Score bar ────────────────────────────────────────────────
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

// ── Populate answer buttons for a round ─────────────────────
function populateAnswerBtns() {
  for (let i = 0; i < playerCount; i++) {
    const grid = document.getElementById(`answer-grid-${i}`);
    if (!grid) continue;
    grid.innerHTML = '';

    currentChoices.forEach((name, ci) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.player = i;
      btn.dataset.choice = name;
      btn.setAttribute('aria-label', `P${i + 1} ${name}`);

      // SVG answer button: rounded rect + text
      btn.innerHTML = `<svg viewBox="0 0 110 44" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="106" height="40" rx="14" ry="14"
              fill="${PLAYER_CONFIG[i].dot}" opacity="0.18" stroke="${PLAYER_CONFIG[i].dot}" stroke-width="2"/>
        <text x="55" y="28" text-anchor="middle" dominant-baseline="middle"
              font-family="'Pretendard Variable',-apple-system,'Noto Sans KR',sans-serif"
              font-size="16" font-weight="800" fill="#222">${name}</text>
      </svg>`;

      onTap(btn, () => handleAnswerTap(i, name, btn));
      grid.appendChild(btn);
    });
  }
}

// ── Reset buttons for new round ──────────────────────────────
function resetBtnsForRound() {
  for (let i = 0; i < playerCount; i++) {
    const btns = getAnswerBtns(i);
    const zone = getZone(i);
    btns.forEach(btn => {
      btn.className = 'answer-btn';
      btn.disabled = false;
      if (dqSet.has(i)) {
        btn.classList.add('state-disabled');
        btn.disabled = true;
      }
    });
    if (zone) {
      if (dqSet.has(i)) zone.classList.add('dq-zone');
      else zone.classList.remove('dq-zone');
    }
  }
}

// ── Ripple effect ────────────────────────────────────────────
function spawnRipple(zone, e) {
  const rect  = zone.getBoundingClientRect();
  const touch = e && e.touches ? e.touches[0] : (e || null);
  const x     = touch ? touch.clientX - rect.left : rect.width  / 2;
  const y     = touch ? touch.clientY - rect.top  : rect.height / 2;
  const size  = Math.max(rect.width, rect.height);
  const r     = document.createElement('span');
  r.className = 'zone-ripple';
  r.style.left   = x + 'px';
  r.style.top    = y + 'px';
  r.style.width  = r.style.height = size + 'px';
  r.style.marginLeft = r.style.marginTop = `-${size / 2}px`;
  zone.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

// ── Timer logic ──────────────────────────────────────────────
function startCountdown() {
  timeRemaining = ROUND_TIME;
  problemTimer.textContent = timeRemaining;
  problemTimer.classList.remove('urgent');

  timerHandle = setInterval(() => {
    timeRemaining--;
    problemTimer.textContent = timeRemaining;

    if (timeRemaining <= 2) {
      problemTimer.classList.add('urgent');
      sound.play('tick');
    }

    if (timeRemaining <= 0) {
      clearTimers();
      handleTimeout();
    }
  }, 1000);
}

// ── Disable / enable all answer buttons ─────────────────────
function setAllBtnsDisabled(disabled) {
  zonesWrap.querySelectorAll('.answer-btn').forEach(btn => {
    btn.disabled = disabled;
    if (disabled) btn.classList.add('state-disabled');
    else btn.classList.remove('state-disabled');
  });
}

// ── Answer tap handler ───────────────────────────────────────
function handleAnswerTap(playerIdx, chosenName, btn) {
  if (phase !== 'active') return;
  if (dqSet.has(playerIdx)) return;

  const zone = getZone(playerIdx);
  spawnRipple(zone, null);

  const correct = (chosenName === currentFlag.name);

  if (correct) {
    resolveRound(playerIdx);
  } else {
    // Wrong — penalise and disqualify for this round
    sound.play('buzz');
    btn.classList.add('state-wrong');
    setTimeout(() => btn.classList.remove('state-wrong'), 400);

    dqSet.add(playerIdx);
    scores[playerIdx] = Math.max(0, scores[playerIdx] - 1);
    updateScoreChip(playerIdx);
    updateBarScore(playerIdx);

    // -1 float
    const penalty = document.createElement('div');
    penalty.className = 'penalty-flash';
    penalty.textContent = '-1';
    zone.style.position = 'relative';
    zone.appendChild(penalty);
    penalty.addEventListener('animationend', () => penalty.remove());

    // Disable this player's buttons
    getAnswerBtns(playerIdx).forEach(b => {
      b.classList.add('state-disabled');
      b.disabled = true;
    });
    zone.classList.add('dq-zone');

    // Check if all players are DQ'd
    let anyActive = false;
    for (let i = 0; i < playerCount; i++) {
      if (!dqSet.has(i)) { anyActive = true; break; }
    }
    if (!anyActive) {
      clearTimers();
      nextHandle = setTimeout(() => handleTimeout(), 300);
    }
  }
}

// ── Correct answer resolved ──────────────────────────────────
function resolveRound(winnerIdx) {
  phase = 'done';
  clearTimers();
  sound.play('ding');

  scores[winnerIdx]++;
  updateScoreChip(winnerIdx);
  updateBarScore(winnerIdx);

  // Highlight correct button for winner
  getAnswerBtns(winnerIdx).forEach(btn => {
    if (btn.dataset.choice === currentFlag.name) {
      btn.classList.add('state-correct');
    } else {
      btn.classList.add('state-disabled');
      btn.disabled = true;
    }
  });

  // Dim all other zones
  for (let i = 0; i < playerCount; i++) {
    if (i !== winnerIdx) {
      getAnswerBtns(i).forEach(b => { b.classList.add('state-disabled'); b.disabled = true; });
    }
  }

  const winnerLabel = PLAYER_CONFIG[winnerIdx].label;
  problemStatus.textContent = `${winnerLabel} 정답!`;

  roundLog.push({
    flagName: currentFlag.name,
    winnerIdx,
    dqPlayers: [...dqSet],
    timedOut: false,
  });

  nextHandle = setTimeout(() => nextRound(), RESULT_PAUSE_MS);
}

// ── Timeout ──────────────────────────────────────────────────
function handleTimeout() {
  phase = 'done';
  clearTimers();
  sound.play('timeout');

  // Reveal correct answer on all zones
  for (let i = 0; i < playerCount; i++) {
    getAnswerBtns(i).forEach(btn => {
      if (btn.dataset.choice === currentFlag.name) {
        btn.classList.add('state-reveal');
      } else {
        btn.classList.add('state-disabled');
        btn.disabled = true;
      }
    });
    const zone = getZone(i);
    if (zone) zone.classList.remove('dq-zone');
  }

  problemStatus.textContent = `시간 초과! 정답: ${currentFlag.name}`;

  roundLog.push({
    flagName: currentFlag.name,
    winnerIdx: -1,
    dqPlayers: [...dqSet],
    timedOut: true,
  });

  nextHandle = setTimeout(() => nextRound(), RESULT_PAUSE_MS);
}

// ── Load round ───────────────────────────────────────────────
function loadRound() {
  phase        = 'active';
  currentFlag  = gameRounds[roundIdx];
  currentChoices = makeChoices(currentFlag.name);
  dqSet        = new Set();

  questionCounter.textContent = `${roundIdx + 1} / ${TOTAL_ROUNDS}`;
  flagDisplay.innerHTML = currentFlag.svg();
  problemStatus.textContent = '';
  problemTimer.classList.remove('urgent');

  populateAnswerBtns();
  resetBtnsForRound();
  startCountdown();
}

// ── Next round ───────────────────────────────────────────────
function nextRound() {
  roundIdx++;
  if (roundIdx >= TOTAL_ROUNDS) {
    showResult();
  } else {
    loadRound();
  }
}

// ── Start game ───────────────────────────────────────────────
function startGame() {
  gameRounds  = shuffle(ALL_FLAGS).slice(0, TOTAL_ROUNDS);
  roundIdx    = 0;
  scores      = new Array(playerCount).fill(0);
  roundLog    = [];
  dqSet       = new Set();
  phase       = 'idle';

  clearTimers();
  buildZones();
  buildScoreBar();
  showScreen(gameScreen);
  loadRound();
}

// ── Show result ──────────────────────────────────────────────
function showResult() {
  clearTimers();
  phase = 'idle';
  sound.play('fanfare');

  const maxScore = Math.max(...scores);
  const winners  = scores
    .map((s, i) => ({ s, i }))
    .filter(x => x.s === maxScore)
    .map(x => x.i);

  if (maxScore === 0) {
    resultTitle.textContent  = '무승부!';
    resultWinner.textContent = '아무도 점수를 얻지 못했어요.';
  } else if (winners.length === 1) {
    const w = winners[0];
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `${PLAYER_CONFIG[w].label} 승리! (${maxScore}점)`;
  } else {
    const labels = winners.map(w => PLAYER_CONFIG[w].label).join(', ');
    resultTitle.textContent  = '동점!';
    resultWinner.textContent = `${labels} 공동 1위! (${maxScore}점)`;
  }

  // Build table header
  const headRow = document.createElement('tr');
  headRow.innerHTML = '<th>국기</th>' +
    Array.from({ length: playerCount }, (_, i) =>
      `<th><span class="player-dot" style="background:${PLAYER_CONFIG[i].dot}"></span>${PLAYER_CONFIG[i].label}</th>`
    ).join('');
  resultTableHead.innerHTML = '';
  resultTableHead.appendChild(headRow);

  // Build table body
  resultTableBody.innerHTML = '';
  roundLog.forEach((log, idx) => {
    const tr = document.createElement('tr');
    let cells = `<td style="text-align:left;font-size:0.82rem;">${idx + 1}. ${log.flagName}</td>`;

    for (let i = 0; i < playerCount; i++) {
      if (log.timedOut) {
        cells += `<td class="cell-timeout">시간초과</td>`;
      } else if (log.winnerIdx === i) {
        cells += `<td class="cell-win">+1</td>`;
      } else if (log.dqPlayers.includes(i)) {
        cells += `<td class="cell-wrong">-1</td>`;
      } else {
        cells += `<td class="cell-none">—</td>`;
      }
    }
    tr.innerHTML = cells;
    resultTableBody.appendChild(tr);
  });

  // Total chips
  totalRow.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const cfg   = PLAYER_CONFIG[i];
    const isWin = winners.includes(i);
    const chip  = document.createElement('div');
    chip.className = 'total-chip';
    chip.innerHTML = `
      <span class="chip-dot" style="background:${cfg.dot}"></span>
      <span>${cfg.label}</span>
      <span class="chip-score" style="color:${isWin ? '#2E7D32' : '#555'}">${scores[i]}점</span>
      ${isWin ? '<span style="font-size:1.1rem;">★</span>' : ''}
    `;
    totalRow.appendChild(chip);
  }

  showScreen(resultScreen);
}
