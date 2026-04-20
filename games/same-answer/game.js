/* games/same-answer/game.js */
'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_ROUNDS   = 10;
const ROUND_TIME     = 5;     // seconds per round
const SUCCESS_GOAL   = 8;     // rounds correct to win
const REVEAL_DELAY   = 1200;  // ms to show result before next round
const NEXT_DELAY     = 600;   // ms after reveal to start next round

// Player config
const PLAYER_CFG = [
  { color: '#EF5350', bg: 'rgba(239,83,80,0.15)',   label: 'P1', name: 'P1', selColor: '#EF5350' },
  { color: '#42A5F5', bg: 'rgba(66,165,245,0.15)',  label: 'P2', name: 'P2', selColor: '#42A5F5' },
  { color: '#66BB6A', bg: 'rgba(102,187,106,0.15)', label: 'P3', name: 'P3', selColor: '#66BB6A' },
  { color: '#FFA726', bg: 'rgba(255,167,38,0.15)',  label: 'P4', name: 'P4', selColor: '#FFA726' },
];

// ─── SVG Shape Library (20 shapes) ───────────────────────────────────────────
// Each returns an SVG string (viewBox 0 0 80 80) no outer <svg> tag needed
const SHAPES = {
  cat(color = '#FF8A65') {
    return `
      <ellipse cx="40" cy="46" rx="24" ry="22" fill="${color}"/>
      <circle cx="40" cy="30" r="16" fill="${color}"/>
      <polygon points="26,18 20,4 32,14" fill="${color}"/>
      <polygon points="54,18 60,4 48,14" fill="${color}"/>
      <ellipse cx="33" cy="29" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="47" cy="29" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="33" cy="30" rx="3" ry="4" fill="#333"/>
      <ellipse cx="47" cy="30" rx="3" ry="4" fill="#333"/>
      <ellipse cx="40" cy="35" rx="4" ry="3" fill="#FFAB91"/>
      <line x1="26" y1="34" x2="10" y2="30" stroke="#888" stroke-width="1.5"/>
      <line x1="26" y1="36" x2="10" y2="36" stroke="#888" stroke-width="1.5"/>
      <line x1="54" y1="34" x2="70" y2="30" stroke="#888" stroke-width="1.5"/>
      <line x1="54" y1="36" x2="70" y2="36" stroke="#888" stroke-width="1.5"/>`;
  },
  dog(color = '#BCAAA4') {
    return `
      <ellipse cx="40" cy="46" rx="22" ry="20" fill="${color}"/>
      <circle cx="40" cy="30" r="16" fill="${color}"/>
      <ellipse cx="26" cy="22" rx="8" ry="13" fill="${color}" transform="rotate(-10 26 22)"/>
      <ellipse cx="54" cy="22" rx="8" ry="13" fill="${color}" transform="rotate(10 54 22)"/>
      <ellipse cx="34" cy="29" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="46" cy="29" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="34" cy="30" rx="3" ry="4" fill="#333"/>
      <ellipse cx="46" cy="30" rx="3" ry="4" fill="#333"/>
      <ellipse cx="40" cy="37" rx="7" ry="5" fill="#D7CCC8"/>
      <circle cx="40" cy="36" r="3" fill="#795548"/>`;
  },
  rabbit(color = '#F8BBD0') {
    return `
      <ellipse cx="40" cy="50" rx="20" ry="18" fill="${color}"/>
      <circle cx="40" cy="34" r="14" fill="${color}"/>
      <ellipse cx="30" cy="14" rx="6" ry="15" fill="${color}"/>
      <ellipse cx="50" cy="14" rx="6" ry="15" fill="${color}"/>
      <ellipse cx="30" cy="14" rx="3" ry="12" fill="#F48FB1"/>
      <ellipse cx="50" cy="14" rx="3" ry="12" fill="#F48FB1"/>
      <ellipse cx="35" cy="33" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="45" cy="33" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="35" cy="34" rx="3" ry="4" fill="#6A1B9A"/>
      <ellipse cx="45" cy="34" rx="3" ry="4" fill="#6A1B9A"/>
      <ellipse cx="40" cy="40" rx="5" ry="3" fill="#F48FB1"/>`;
  },
  fish(color = '#42A5F5') {
    return `
      <ellipse cx="36" cy="40" rx="26" ry="16" fill="${color}"/>
      <polygon points="70,40 78,28 78,52" fill="${color}"/>
      <circle cx="22" cy="36" r="4" fill="#fff"/>
      <circle cx="21" cy="35" r="2" fill="#333"/>
      <line x1="44" y1="30" x2="56" y2="28" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="44" y1="36" x2="60" y2="36" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <line x1="44" y1="42" x2="56" y2="46" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
      <ellipse cx="36" cy="40" rx="26" ry="16" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;
  },
  bird(color = '#FFCA28') {
    return `
      <ellipse cx="40" cy="44" rx="22" ry="18" fill="${color}"/>
      <circle cx="40" cy="28" r="14" fill="${color}"/>
      <ellipse cx="30" cy="44" rx="16" ry="8" fill="${color}" transform="rotate(-20 30 44)"/>
      <ellipse cx="50" cy="44" rx="16" ry="8" fill="${color}" transform="rotate(20 50 44)"/>
      <ellipse cx="35" cy="27" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="45" cy="27" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="35" cy="28" rx="3" ry="4" fill="#1A237E"/>
      <ellipse cx="45" cy="28" rx="3" ry="4" fill="#1A237E"/>
      <polygon points="34,34 40,38 46,34 40,30" fill="#FF8F00"/>`;
  },
  apple(color = '#EF5350') {
    return `
      <path d="M40 18 Q30 12 22 20 Q10 30 12 48 Q14 62 24 68 Q30 72 36 68 Q38 66 40 68 Q44 72 52 68 Q62 64 66 50 Q70 32 58 20 Q50 12 40 18Z" fill="${color}"/>
      <path d="M36 68 Q38 66 40 68 Q42 70 40 72 Q38 70 36 68Z" fill="#FFCDD2" opacity="0.5"/>
      <path d="M38 16 Q40 8 44 10 Q42 16 40 18Z" fill="#66BB6A"/>
      <ellipse cx="28" cy="36" rx="7" ry="10" fill="rgba(255,255,255,0.25)" transform="rotate(-20 28 36)"/>`;
  },
  banana(color = '#FFEE58') {
    return `
      <path d="M18 60 Q20 20 40 14 Q58 10 62 28 Q66 44 52 56 Q40 66 28 64 Q18 62 18 60Z" fill="${color}"/>
      <path d="M18 60 Q22 58 28 64" stroke="#F9A825" stroke-width="2" fill="none"/>
      <path d="M62 28 Q60 24 56 22" stroke="#F9A825" stroke-width="2" fill="none"/>
      <ellipse cx="38" cy="38" rx="16" ry="8" fill="rgba(255,255,255,0.2)" transform="rotate(-30 38 38)"/>`;
  },
  star(color = '#FFD600') {
    return `
      <polygon points="40,8 47,30 70,30 52,44 59,66 40,52 21,66 28,44 10,30 33,30" fill="${color}"/>
      <polygon points="40,18 45,32 58,32 48,41 52,54 40,46 28,54 32,41 22,32 35,32" fill="rgba(255,255,255,0.3)"/>`;
  },
  heart(color = '#E91E63') {
    return `
      <path d="M40 64 Q14 48 12 32 Q10 16 24 14 Q32 12 40 22 Q48 12 56 14 Q70 16 68 32 Q66 48 40 64Z" fill="${color}"/>
      <path d="M28 24 Q20 22 18 30" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  },
  moon(color = '#FFD54F') {
    return `
      <path d="M40 12 Q22 12 14 28 Q8 42 16 54 Q24 68 40 68 Q30 60 28 48 Q24 32 36 20 Q42 14 40 12Z" fill="${color}"/>
      <circle cx="54" cy="24" r="4" fill="${color}" opacity="0.6"/>
      <circle cx="60" cy="40" r="3" fill="${color}" opacity="0.4"/>
      <circle cx="52" cy="52" r="2.5" fill="${color}" opacity="0.4"/>`;
  },
  cloud(color = '#90CAF9') {
    return `
      <ellipse cx="40" cy="46" rx="28" ry="16" fill="${color}"/>
      <circle cx="28" cy="42" r="14" fill="${color}"/>
      <circle cx="44" cy="36" r="18" fill="${color}"/>
      <circle cx="58" cy="44" r="12" fill="${color}"/>
      <ellipse cx="40" cy="40" rx="20" ry="10" fill="rgba(255,255,255,0.35)"/>`;
  },
  tree(color = '#43A047') {
    return `
      <polygon points="40,8 66,54 14,54" fill="${color}"/>
      <polygon points="40,18 62,52 18,52" fill="#66BB6A"/>
      <rect x="34" y="54" width="12" height="18" rx="2" fill="#795548"/>
      <circle cx="30" cy="36" r="6" fill="#81C784" opacity="0.6"/>
      <circle cx="52" cy="42" r="5" fill="#81C784" opacity="0.6"/>`;
  },
  flower(color = '#AB47BC') {
    return `
      <circle cx="40" cy="40" r="10" fill="#FFD600"/>
      <ellipse cx="40" cy="20" rx="8" ry="14" fill="${color}"/>
      <ellipse cx="40" cy="60" rx="8" ry="14" fill="${color}"/>
      <ellipse cx="20" cy="40" rx="14" ry="8" fill="${color}"/>
      <ellipse cx="60" cy="40" rx="14" ry="8" fill="${color}"/>
      <ellipse cx="26" cy="26" rx="8" ry="12" fill="${color}" transform="rotate(45 26 26)"/>
      <ellipse cx="54" cy="26" rx="8" ry="12" fill="${color}" transform="rotate(-45 54 26)"/>
      <ellipse cx="26" cy="54" rx="8" ry="12" fill="${color}" transform="rotate(-45 26 54)"/>
      <ellipse cx="54" cy="54" rx="8" ry="12" fill="${color}" transform="rotate(45 54 54)"/>
      <circle cx="40" cy="40" r="10" fill="#FFD600"/>
      <circle cx="40" cy="40" r="5" fill="#FF8F00"/>`;
  },
  car(color = '#1E88E5') {
    return `
      <rect x="10" y="38" width="60" height="24" rx="6" fill="${color}"/>
      <path d="M18 38 Q24 22 36 20 L48 20 Q58 22 62 38Z" fill="${color}"/>
      <rect x="24" y="24" width="14" height="14" rx="3" fill="#B3E5FC"/>
      <rect x="42" y="24" width="14" height="14" rx="3" fill="#B3E5FC"/>
      <circle cx="22" cy="62" r="8" fill="#37474F"/>
      <circle cx="22" cy="62" r="4" fill="#90A4AE"/>
      <circle cx="58" cy="62" r="8" fill="#37474F"/>
      <circle cx="58" cy="62" r="4" fill="#90A4AE"/>
      <rect x="8" y="44" width="8" height="6" rx="2" fill="#FFEE58"/>
      <rect x="64" y="44" width="8" height="6" rx="2" fill="#FF7043"/>`;
  },
  rocket(color = '#7E57C2') {
    return `
      <path d="M40 8 Q52 16 56 40 L40 52 L24 40 Q28 16 40 8Z" fill="${color}"/>
      <ellipse cx="40" cy="46" rx="16" ry="8" fill="#B39DDB"/>
      <circle cx="40" cy="28" r="8" fill="#B3E5FC"/>
      <circle cx="40" cy="28" r="5" fill="#0288D1"/>
      <polygon points="24,40 14,56 30,48" fill="#EF5350"/>
      <polygon points="56,40 66,56 50,48" fill="#EF5350"/>
      <rect x="36" y="52" width="8" height="14" rx="4" fill="#7E57C2"/>
      <ellipse cx="40" cy="66" rx="10" ry="6" fill="#FF8A65" opacity="0.8"/>`;
  },
  house(color = '#EF5350') {
    return `
      <polygon points="40,8 70,36 10,36" fill="${color}"/>
      <rect x="14" y="34" width="52" height="34" rx="2" fill="#FFCC80"/>
      <rect x="28" y="44" width="14" height="14" rx="2" fill="#90CAF9"/>
      <rect x="38" y="50" width="14" height="18" rx="2" fill="#795548"/>
      <rect x="40" y="50" width="2" height="18" fill="#BCAAA4"/>
      <circle cx="39" cy="60" r="1.5" fill="#FFD600"/>`;
  },
  sun(color = '#FFD600') {
    return `
      <circle cx="40" cy="40" r="18" fill="${color}"/>
      <line x1="40" y1="6" x2="40" y2="16" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <line x1="40" y1="64" x2="40" y2="74" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <line x1="6" y1="40" x2="16" y2="40" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <line x1="64" y1="40" x2="74" y2="40" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <line x1="17" y1="17" x2="24" y2="24" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <line x1="56" y1="56" x2="63" y2="63" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <line x1="63" y1="17" x2="56" y2="24" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <line x1="17" y1="63" x2="24" y2="56" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="40" r="18" fill="${color}"/>
      <circle cx="40" cy="40" r="12" fill="#FFF176"/>`;
  },
  umbrella(color = '#42A5F5') {
    return `
      <path d="M10 42 Q10 14 40 12 Q70 14 70 42Z" fill="${color}"/>
      <path d="M10 42 Q20 36 25 42 Q30 48 35 42 Q40 36 45 42 Q50 48 55 42 Q60 36 65 42 Q70 36 70 42" fill="rgba(255,255,255,0.25)"/>
      <path d="M40 42 L40 62 Q40 70 48 70 Q56 70 56 62" stroke="#1565C0" stroke-width="3" fill="none" stroke-linecap="round"/>
      <line x1="40" y1="12" x2="40" y2="42" stroke="#1565C0" stroke-width="2"/>`;
  },
  book(color = '#66BB6A') {
    return `
      <rect x="12" y="14" width="56" height="52" rx="4" fill="${color}"/>
      <rect x="12" y="14" width="28" height="52" fill="#81C784"/>
      <rect x="36" y="14" width="4" height="52" fill="#388E3C"/>
      <line x1="44" y1="24" x2="62" y2="24" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
      <line x1="44" y1="32" x2="62" y2="32" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
      <line x1="44" y1="40" x2="62" y2="40" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
      <line x1="44" y1="48" x2="55" y2="48" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
      <line x1="18" y1="24" x2="32" y2="24" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
      <line x1="18" y1="32" x2="32" y2="32" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
      <line x1="18" y1="40" x2="32" y2="40" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>`;
  },
  key(color = '#FFA726') {
    return `
      <circle cx="30" cy="36" r="18" fill="${color}" stroke="#E65100" stroke-width="2"/>
      <circle cx="30" cy="36" r="10" fill="#F1F8E9"/>
      <rect x="44" y="32" width="28" height="8" rx="4" fill="${color}" stroke="#E65100" stroke-width="1.5"/>
      <rect x="62" y="40" width="6" height="8" rx="2" fill="${color}" stroke="#E65100" stroke-width="1.5"/>
      <rect x="54" y="40" width="6" height="6" rx="2" fill="${color}" stroke="#E65100" stroke-width="1.5"/>`;
  }
};

const SHAPE_KEYS = Object.keys(SHAPES);

// ─── SVG wrapper helper ───────────────────────────────────────────────────────
function makeSvg(shapeKey, size = 80) {
  const inner = SHAPES[shapeKey]();
  return `<svg viewBox="0 0 80 80" width="${size}" height="${size}" aria-label="${shapeKey}">${inner}</svg>`;
}

// ─── State ───────────────────────────────────────────────────────────────────
let playerCount   = 2;
let round         = 0;
let score         = 0;
let agreeCount    = 0;
let disagreeCount = 0;
let roundActive   = false;
let roundTimer    = null;
let allTimeouts   = [];

// Per-round state
let currentTarget   = '';      // shape key for target
let currentOptions  = [];      // array of 4 shape keys [correct, wrong, wrong, wrong] shuffled
let correctIndex    = 0;       // index in currentOptions that is correct
let playerSelections = [];     // [null, null, null, null] — selected option index per player

// ─── Sound Manager ────────────────────────────────────────────────────────────
const sfx = createSoundManager({
  select(ctx) {
    // Soft click
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type  = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.08);
  },
  chime(ctx) {
    // Agreement chime (all picked same)
    [784, 988, 1175].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'triangle';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.35);
    });
  },
  fanfare(ctx) {
    // Correct fanfare
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'triangle';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.45);
    });
  },
  sad(ctx) {
    // Wrong but agreed
    [440, 370, 330].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sine';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.15;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
    });
  },
  buzz(ctx) {
    // Disagree buzz
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 200;
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start();
  },
  gameEnd(ctx) {
    // Final fanfare
    const notes = [392, 523, 659, 784, 659, 784, 1047];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'triangle';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.55);
    });
  }
});

// ─── DOM Refs ──────────────────────────────────────────────────────────────────
const introScreen      = document.getElementById('introScreen');
const countdownScreen  = document.getElementById('countdownScreen');
const gameScreen       = document.getElementById('gameScreen');
const resultScreen     = document.getElementById('resultScreen');
const countdownNum     = document.getElementById('countdownNumber');
const hudRound         = document.getElementById('hudRound');
const hudScore         = document.getElementById('hudScore');
const hudTimerFill     = document.getElementById('hudTimerFill');
const targetSvgWrap    = document.getElementById('targetSvgWrap');
const roundResultBanner= document.getElementById('roundResultBanner');
const zonesGrid        = document.getElementById('zonesGrid');
const resultEmoji      = document.getElementById('resultEmoji');
const resultHeadline   = document.getElementById('resultHeadline');
const resultSub        = document.getElementById('resultSub');
const statScore        = document.getElementById('statScore');
const statAgree        = document.getElementById('statAgree');
const statDisagree     = document.getElementById('statDisagree');

// ─── Screen helper ────────────────────────────────────────────────────────────
function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  void el.offsetWidth;
  el.classList.add('active');
}

// ─── Intro wiring ─────────────────────────────────────────────────────────────
document.getElementById('playerSelect').addEventListener('click', e => {
  const btn = e.target.closest('.player-btn');
  if (!btn) return;
  document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  playerCount = parseInt(btn.dataset.count, 10);
});

document.getElementById('backBtn').addEventListener('click', goHome);

const soundToggleIntro = document.getElementById('soundToggleIntro');
soundToggleIntro.addEventListener('click', () => {
  const muted = sfx.toggleMute();
  soundToggleIntro.textContent = muted ? '🔇' : '🔊';
});
soundToggleIntro.textContent = sfx.isMuted() ? '🔇' : '🔊';

const soundToggleGame = document.getElementById('soundToggleGame');
soundToggleGame.addEventListener('click', () => {
  const muted = sfx.toggleMute();
  soundToggleGame.textContent = muted ? '🔇' : '🔊';
});

onTap(document.getElementById('playBtn'), startCountdown);

// ─── Countdown ────────────────────────────────────────────────────────────────
function startCountdown() {
  clearAllTimeouts();
  showScreen(countdownScreen);
  let n = 3;
  countdownNum.textContent = n;

  function tick() {
    n--;
    if (n <= 0) {
      countdownNum.textContent = 'GO!';
      push(setTimeout(() => startGame(), 700));
    } else {
      countdownNum.textContent = n;
      push(setTimeout(tick, 1000));
    }
  }
  push(setTimeout(tick, 1000));
}

// ─── Game Setup ───────────────────────────────────────────────────────────────
function startGame() {
  round         = 0;
  score         = 0;
  agreeCount    = 0;
  disagreeCount = 0;
  roundActive   = false;

  buildZones();
  updateHud();
  showScreen(gameScreen);
  soundToggleGame.textContent = sfx.isMuted() ? '🔇' : '🔊';

  push(setTimeout(() => startRound(), 400));
}

// ─── Player zones ─────────────────────────────────────────────────────────────
function buildZones() {
  zonesGrid.innerHTML = '';
  zonesGrid.className = 'zones-grid p' + playerCount;

  for (let p = 0; p < playerCount; p++) {
    const cfg  = PLAYER_CFG[p];
    const zone = document.createElement('div');
    zone.className = 'player-zone';
    zone.style.background   = cfg.bg;
    zone.style.borderColor  = cfg.color + '55';
    zone.dataset.player = p;

    zone.innerHTML = `
      <div class="zone-name" style="color:${cfg.color};">${cfg.name}</div>
      <div class="answer-grid" id="answerGrid${p}"></div>
      <div class="zone-waiting" id="zoneWaiting${p}">대기 중...</div>
    `;
    zonesGrid.appendChild(zone);
  }
}

function renderAnswerButtons() {
  for (let p = 0; p < playerCount; p++) {
    const grid = document.getElementById('answerGrid' + p);
    grid.innerHTML = '';
    const letters = ['A','B','C','D'];
    currentOptions.forEach((shapeKey, idx) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.option = idx;
      btn.dataset.player = p;
      btn.innerHTML = `
        <span class="ans-letter">${letters[idx]}</span>
        ${makeSvg(shapeKey, 40)}
      `;
      onTap(btn, () => handleSelect(p, idx));
      grid.appendChild(btn);
    });
    // Reset waiting label
    const waiting = document.getElementById('zoneWaiting' + p);
    waiting.textContent = '선택하세요!';
  }
}

// ─── Round logic ──────────────────────────────────────────────────────────────
function startRound() {
  if (round >= TOTAL_ROUNDS) {
    endGame();
    return;
  }
  round++;
  playerSelections = new Array(playerCount).fill(null);
  roundActive      = true;

  // Pick target + 3 distractors
  const shuffled = shuffle([...SHAPE_KEYS]);
  currentTarget   = shuffled[0];
  const wrong     = shuffled.slice(1, 4);
  const pool      = [currentTarget, ...wrong];
  currentOptions  = shuffle(pool);
  correctIndex    = currentOptions.indexOf(currentTarget);

  // Render target
  targetSvgWrap.innerHTML = makeSvg(currentTarget, 110);
  targetSvgWrap.className = 'target-svg-wrap';

  // Render player buttons
  renderAnswerButtons();

  // Hide banner
  roundResultBanner.className = 'round-result-banner';
  roundResultBanner.textContent = '';

  // Update HUD
  updateHud();

  // Start timer
  let timeLeft = ROUND_TIME;
  hudTimerFill.style.width = '100%';
  hudTimerFill.className   = 'hud-timer-fill';

  if (roundTimer) roundTimer.stop();
  roundTimer = createTimer(
    ROUND_TIME,
    (rem) => {
      timeLeft = rem;
      const pct = (rem / ROUND_TIME) * 100;
      hudTimerFill.style.width = pct + '%';
      if (rem <= 2) hudTimerFill.className = 'hud-timer-fill danger';
    },
    () => {
      if (!roundActive) return;
      evaluateRound();
    }
  );
  roundTimer.start();
}

// ─── Selection handling ───────────────────────────────────────────────────────
function handleSelect(playerIdx, optionIdx) {
  if (!roundActive) return;
  // Already selected — allow change
  playerSelections[playerIdx] = optionIdx;

  // Reflect visual selection in this player's grid only
  const grid = document.getElementById('answerGrid' + playerIdx);
  grid.querySelectorAll('.answer-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.style.borderColor = '';
    btn.style.background  = '';
  });
  const chosen = grid.querySelector(`[data-option="${optionIdx}"]`);
  if (chosen) {
    chosen.classList.add('selected');
    chosen.style.borderColor = PLAYER_CFG[playerIdx].color;
    chosen.style.background  = PLAYER_CFG[playerIdx].color + '22';
  }

  // Update waiting label
  const waiting = document.getElementById('zoneWaiting' + playerIdx);
  waiting.textContent = '✓ 선택 완료';
  waiting.style.color = PLAYER_CFG[playerIdx].color;

  sfx.play('select');

  // Check if all players selected
  if (playerSelections.every(s => s !== null)) {
    if (roundTimer) roundTimer.pause();
    push(setTimeout(() => evaluateRound(), 200));
  }
}

// ─── Evaluate round ───────────────────────────────────────────────────────────
function evaluateRound() {
  roundActive = false;
  if (roundTimer) roundTimer.pause();

  // Lock all buttons
  document.querySelectorAll('.answer-btn').forEach(btn => btn.classList.add('locked'));

  // Fill in any player who didn't select
  for (let p = 0; p < playerCount; p++) {
    if (playerSelections[p] === null) {
      const waiting = document.getElementById('zoneWaiting' + p);
      waiting.textContent = '시간 초과';
      waiting.style.color = '#EF5350';
    }
  }

  // Determine agreement
  const nonNull     = playerSelections.filter(s => s !== null);
  const allSelected = nonNull.length === playerCount;
  const allSame     = allSelected && nonNull.every(s => s === nonNull[0]);
  const isCorrect   = allSame && nonNull[0] === correctIndex;

  // Show correct answer highlight always
  for (let p = 0; p < playerCount; p++) {
    const grid = document.getElementById('answerGrid' + p);
    grid.querySelectorAll('.answer-btn').forEach(btn => {
      const idx = parseInt(btn.dataset.option, 10);
      if (idx === correctIndex) {
        btn.classList.add('reveal-correct');
      } else if (playerSelections[p] === idx && idx !== correctIndex) {
        btn.classList.add('reveal-wrong');
      } else {
        btn.classList.add('reveal-dim');
      }
    });
  }

  // Animate target
  targetSvgWrap.className = 'target-svg-wrap ' + (isCorrect ? 'reveal-correct' : 'reveal-wrong');

  // Banner + sound
  let bannerText  = '';
  let bannerClass = '';

  if (isCorrect) {
    score++;
    agreeCount++;
    sfx.play('fanfare');
    bannerText  = '🎉 정답! 모두 같은 답!';
    bannerClass = 'correct';
  } else if (allSame) {
    // Agreed but wrong
    agreeCount++;
    sfx.play('sad');
    bannerText  = '😅 같은 답이지만 오답!';
    bannerClass = 'wrong';
  } else {
    // Disagreement (includes timeout cases)
    disagreeCount++;
    sfx.play('buzz');
    bannerText  = '😬 서로 다른 답!';
    bannerClass = 'disagree';
  }

  roundResultBanner.textContent = bannerText;
  roundResultBanner.className   = `round-result-banner show ${bannerClass}`;
  updateHud();

  // Proceed to next round
  push(setTimeout(() => startRound(), REVEAL_DELAY + NEXT_DELAY));
}

// ─── HUD update ───────────────────────────────────────────────────────────────
function updateHud() {
  hudRound.textContent = `${round}/${TOTAL_ROUNDS}`;
  hudScore.textContent = `${score}점`;
}

// ─── Game end ─────────────────────────────────────────────────────────────────
function endGame() {
  clearAllTimeouts();
  if (roundTimer) roundTimer.stop();

  const success = score >= SUCCESS_GOAL;
  sfx.play('gameEnd');

  resultEmoji.textContent    = success ? '🏆' : '😔';
  resultHeadline.textContent = success ? '성공!' : '아쉬워요...';
  resultHeadline.className   = 'result-headline ' + (success ? 'success' : 'fail');
  resultSub.textContent      = success
    ? `${score}점으로 목표를 달성했어요!`
    : `${score}점. 8점 이상이어야 성공!`;

  statScore.textContent    = `${score} / ${TOTAL_ROUNDS}`;
  statAgree.textContent    = `${agreeCount}번`;
  statDisagree.textContent = `${disagreeCount}번`;

  if (success) spawnConfetti();

  push(setTimeout(() => showScreen(resultScreen), 300));
}

// ─── Result buttons ───────────────────────────────────────────────────────────
onTap(document.getElementById('retryBtn'), startCountdown);
onTap(document.getElementById('homeBtn'),  goHome);
onTap(document.getElementById('closeBtn'), () => {
  clearAllTimeouts();
  if (roundTimer) roundTimer.stop();
  goHome();
});

// ─── Confetti ─────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#43A047','#EF5350','#42A5F5','#FFD600','#AB47BC','#FF8A65'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -12px;
      width: ${6 + Math.random() * 7}px;
      height: ${6 + Math.random() * 7}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall ${1.6 + Math.random() * 1.4}s ease-in ${Math.random() * 0.9}s forwards;
      z-index: 999;
      pointer-events: none;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function push(t) { allTimeouts.push(t); return t; }
function clearAllTimeouts() {
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];
}
