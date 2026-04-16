/* games/quick-sort/game.js */
'use strict';

// ── SVG Item Definitions ───────────────────────────────────
// Each function returns an SVG string, viewBox="0 0 50 50"
// 3-4 basic shapes, clear silhouettes

// ── Category 1: 과일 (Fruits) ──────────────────────────────
function svgApple() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="32" rx="16" ry="14" fill="#E53935"/>
    <ellipse cx="17" cy="22" rx="8" ry="6" fill="#EF9A9A" opacity="0.5"/>
    <path d="M25 18 Q28 8 35 10" stroke="#388E3C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="37" cy="9" rx="4" ry="3" fill="#4CAF50" transform="rotate(-20,37,9)"/>
  </svg>`;
}

function svgBanana() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 38 Q12 18 28 10 Q38 6 40 14 Q38 16 34 14 Q22 16 16 34 Z" fill="#FDD835"/>
    <path d="M10 38 Q14 36 16 34" stroke="#F57F17" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M28 10 Q30 8 34 10" stroke="#F57F17" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function svgGrape() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="22" r="7" fill="#7B1FA2"/>
    <circle cx="32" cy="22" r="7" fill="#7B1FA2"/>
    <circle cx="25" cy="33" r="7" fill="#9C27B0"/>
    <circle cx="25" cy="13" r="4" fill="#AB47BC"/>
    <line x1="25" y1="9" x2="25" y2="5" stroke="#388E3C" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M25 5 Q30 3 34 6" stroke="#4CAF50" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function svgStrawberry() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 42 L10 22 Q12 12 25 14 Q38 12 40 22 Z" fill="#E53935"/>
    <path d="M25 14 Q22 8 18 10" stroke="#4CAF50" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M25 14 Q28 8 32 10" stroke="#4CAF50" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="20" cy="24" r="1.8" fill="#FFCDD2"/>
    <circle cx="30" cy="26" r="1.8" fill="#FFCDD2"/>
    <circle cx="25" cy="33" r="1.8" fill="#FFCDD2"/>
  </svg>`;
}

function svgWatermelon() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 32 Q8 10 25 10 Q42 10 42 32 Z" fill="#4CAF50"/>
    <path d="M10 32 Q10 14 25 14 Q40 14 40 32 Z" fill="#81C784"/>
    <path d="M12 32 Q12 18 25 18 Q38 18 38 32 Z" fill="#E53935"/>
    <circle cx="20" cy="26" r="2" fill="#212121"/>
    <circle cx="30" cy="24" r="2" fill="#212121"/>
    <circle cx="25" cy="30" r="2" fill="#212121"/>
  </svg>`;
}

function svgCherry() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 20 Q24 10 32 12" stroke="#388E3C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M20 20 Q16 10 24 8" stroke="#388E3C" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="16" cy="34" r="9" fill="#C62828"/>
    <circle cx="33" cy="34" r="9" fill="#E53935"/>
    <circle cx="13" cy="30" r="3" fill="#EF9A9A" opacity="0.5"/>
  </svg>`;
}

function svgPeach() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="30" rx="17" ry="15" fill="#FFAB91"/>
    <ellipse cx="25" cy="30" rx="9" ry="12" fill="#FF8A65" opacity="0.35"/>
    <path d="M25 15 Q28 8 33 10" stroke="#388E3C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="17" cy="22" rx="5" ry="4" fill="#FFCCBC" opacity="0.6"/>
  </svg>`;
}

function svgKiwi() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="28" rx="18" ry="16" fill="#5D4037"/>
    <ellipse cx="25" cy="28" rx="15" ry="13" fill="#8BC34A"/>
    <ellipse cx="25" cy="28" rx="10" ry="9" fill="#DCEDC8"/>
    <line x1="25" y1="15" x2="25" y2="41" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>
    <line x1="12" y1="28" x2="38" y2="28" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>
    <line x1="16" y1="18" x2="34" y2="38" stroke="#FFFFFF" stroke-width="1" opacity="0.5"/>
    <line x1="34" y1="18" x2="16" y2="38" stroke="#FFFFFF" stroke-width="1" opacity="0.5"/>
    <circle cx="25" cy="28" r="3" fill="#5D4037"/>
  </svg>`;
}

// ── Category 2: 동물 (Animals) ─────────────────────────────
function svgCat() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="30" rx="16" ry="13" fill="#FF8F00"/>
    <polygon points="12,22 8,10 18,20" fill="#FF8F00"/>
    <polygon points="38,22 42,10 32,20" fill="#FF8F00"/>
    <circle cx="19" cy="30" r="3" fill="#212121"/>
    <circle cx="31" cy="30" r="3" fill="#212121"/>
    <ellipse cx="25" cy="35" rx="3" ry="2" fill="#F48FB1"/>
    <line x1="15" y1="34" x2="8" y2="32" stroke="#FF8F00" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="15" y1="36" x2="8" y2="36" stroke="#FF8F00" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="35" y1="34" x2="42" y2="32" stroke="#FF8F00" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="35" y1="36" x2="42" y2="36" stroke="#FF8F00" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

function svgDog() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="28" rx="16" ry="13" fill="#A1887F"/>
    <ellipse cx="14" cy="22" rx="5" ry="8" fill="#8D6E63"/>
    <ellipse cx="36" cy="22" rx="5" ry="8" fill="#8D6E63"/>
    <circle cx="19" cy="28" r="3" fill="#212121"/>
    <circle cx="31" cy="28" r="3" fill="#212121"/>
    <ellipse cx="25" cy="35" rx="5" ry="3" fill="#BCAAA4"/>
    <ellipse cx="25" cy="34" rx="3" ry="2" fill="#F48FB1"/>
  </svg>`;
}

function svgRabbit() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="34" rx="13" ry="11" fill="#ECEFF1"/>
    <ellipse cx="18" cy="16" rx="5" ry="12" fill="#ECEFF1"/>
    <ellipse cx="32" cy="16" rx="5" ry="12" fill="#ECEFF1"/>
    <ellipse cx="18" cy="14" rx="2.5" ry="8" fill="#F48FB1" opacity="0.7"/>
    <ellipse cx="32" cy="14" rx="2.5" ry="8" fill="#F48FB1" opacity="0.7"/>
    <circle cx="20" cy="33" r="3" fill="#90A4AE"/>
    <circle cx="30" cy="33" r="3" fill="#90A4AE"/>
    <ellipse cx="25" cy="38" rx="3" ry="2" fill="#F48FB1"/>
  </svg>`;
}

function svgFish() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="23" cy="26" rx="16" ry="10" fill="#1565C0"/>
    <polygon points="40,26 50,18 50,34" fill="#1E88E5"/>
    <circle cx="14" cy="23" r="3.5" fill="#fff"/>
    <circle cx="13" cy="23" r="2" fill="#212121"/>
    <ellipse cx="26" cy="20" rx="5" ry="3" fill="#42A5F5" opacity="0.5"/>
  </svg>`;
}

function svgBird() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="28" cy="30" rx="12" ry="10" fill="#FFA726"/>
    <circle cx="20" cy="24" r="8" fill="#FFA726"/>
    <path d="M4 26 Q12 18 20 24" fill="#FFB74D" stroke="none"/>
    <path d="M4 26 Q12 32 20 28" fill="#FFB74D" stroke="none"/>
    <path d="M38 26 Q44 18 48 22" fill="#FFB74D" stroke="none"/>
    <path d="M38 28 Q44 34 48 30" fill="#FFB74D" stroke="none"/>
    <circle cx="17" cy="22" r="2.5" fill="#212121"/>
    <polygon points="12,24 8,26 12,28" fill="#F57F17"/>
  </svg>`;
}

function svgBear() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <circle cx="25" cy="28" r="15" fill="#6D4C41"/>
    <circle cx="14" cy="16" r="7" fill="#6D4C41"/>
    <circle cx="36" cy="16" r="7" fill="#6D4C41"/>
    <circle cx="14" cy="16" r="4" fill="#8D6E63"/>
    <circle cx="36" cy="16" r="4" fill="#8D6E63"/>
    <ellipse cx="25" cy="34" rx="8" ry="5" fill="#8D6E63"/>
    <circle cx="19" cy="26" r="3" fill="#212121"/>
    <circle cx="31" cy="26" r="3" fill="#212121"/>
    <ellipse cx="25" cy="32" rx="2.5" ry="1.5" fill="#212121"/>
  </svg>`;
}

function svgPenguin() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="30" rx="13" ry="16" fill="#212121"/>
    <ellipse cx="25" cy="32" rx="8" ry="10" fill="#ECEFF1"/>
    <circle cx="25" cy="17" r="10" fill="#212121"/>
    <ellipse cx="25" cy="17" rx="5" ry="4" fill="#ECEFF1"/>
    <circle cx="21" cy="15" r="2.5" fill="#fff"/>
    <circle cx="20.5" cy="14.5" r="1.5" fill="#212121"/>
    <circle cx="29" cy="15" r="2.5" fill="#fff"/>
    <circle cx="28.5" cy="14.5" r="1.5" fill="#212121"/>
    <polygon points="25,20 22,23 28,23" fill="#FFA726"/>
    <ellipse cx="12" cy="30" rx="4" ry="8" fill="#212121"/>
    <ellipse cx="38" cy="30" rx="4" ry="8" fill="#212121"/>
  </svg>`;
}

function svgFox() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="30" rx="15" ry="12" fill="#E64A19"/>
    <polygon points="13,24 6,8 18,20" fill="#E64A19"/>
    <polygon points="37,24 44,8 32,20" fill="#E64A19"/>
    <polygon points="13,24 10,8 16,20" fill="#fff"/>
    <polygon points="37,24 40,8 34,20" fill="#fff"/>
    <ellipse cx="25" cy="34" rx="9" ry="6" fill="#FFCCBC"/>
    <circle cx="19" cy="28" r="3" fill="#212121"/>
    <circle cx="31" cy="28" r="3" fill="#212121"/>
    <ellipse cx="25" cy="33" rx="2" ry="1.5" fill="#212121"/>
  </svg>`;
}

// ── Category 3: 탈것 (Vehicles) ───────────────────────────
function svgCar() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="28" width="42" height="14" rx="4" fill="#1565C0"/>
    <path d="M10 28 L16 18 Q18 16 22 16 L32 16 Q36 16 38 18 L44 28 Z" fill="#1E88E5"/>
    <rect x="18" y="18" width="14" height="9" rx="2" fill="#B3E5FC"/>
    <circle cx="13" cy="42" r="5" fill="#212121"/>
    <circle cx="13" cy="42" r="2.5" fill="#757575"/>
    <circle cx="37" cy="42" r="5" fill="#212121"/>
    <circle cx="37" cy="42" r="2.5" fill="#757575"/>
    <rect x="36" y="30" width="6" height="4" rx="1" fill="#FFEE58"/>
    <rect x="8" y="30" width="5" height="4" rx="1" fill="#EF5350"/>
  </svg>`;
}

function svgBus() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="12" width="40" height="28" rx="4" fill="#F57F17"/>
    <rect x="5" y="12" width="40" height="6" rx="4" fill="#E65100"/>
    <rect x="9" y="20" width="9" height="7" rx="2" fill="#B3E5FC"/>
    <rect x="21" y="20" width="9" height="7" rx="2" fill="#B3E5FC"/>
    <rect x="33" y="20" width="9" height="7" rx="2" fill="#B3E5FC"/>
    <rect x="9" y="30" width="32" height="6" rx="2" fill="#FFB74D"/>
    <circle cx="14" cy="42" r="5" fill="#212121"/>
    <circle cx="14" cy="42" r="2.5" fill="#757575"/>
    <circle cx="36" cy="42" r="5" fill="#212121"/>
    <circle cx="36" cy="42" r="2.5" fill="#757575"/>
  </svg>`;
}

function svgAirplane() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="25" cy="26" rx="18" ry="7" fill="#E0E0E0"/>
    <path d="M6 26 L44 26 Q46 24 44 22 L30 22 L22 8 L16 8 L22 22 L6 22 Q4 24 6 26 Z" fill="#ECEFF1"/>
    <path d="M36 26 L44 26 L44 30 L36 30 Z" fill="#ECEFF1"/>
    <ellipse cx="23" cy="26" rx="10" ry="5" fill="#B0BEC5"/>
    <rect x="14" y="22" width="22" height="8" rx="3" fill="#FAFAFA"/>
    <circle cx="20" cy="26" r="2" fill="#B3E5FC"/>
    <circle cx="27" cy="26" r="2" fill="#B3E5FC"/>
  </svg>`;
}

function svgShip() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 32 L44 32 L40 44 L10 44 Z" fill="#1565C0"/>
    <rect x="10" y="20" width="30" height="14" rx="2" fill="#1E88E5"/>
    <rect x="18" y="14" width="14" height="8" rx="2" fill="#42A5F5"/>
    <rect x="22" y="8" width="6" height="8" rx="1" fill="#EF5350"/>
    <rect x="14" y="23" width="7" height="5" rx="1" fill="#B3E5FC"/>
    <rect x="25" y="23" width="7" height="5" rx="1" fill="#B3E5FC"/>
    <path d="M4 38 Q25 34 46 38" stroke="#81D4FA" stroke-width="2" fill="none"/>
  </svg>`;
}

function svgBicycle() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="34" r="10" fill="none" stroke="#212121" stroke-width="3"/>
    <circle cx="38" cy="34" r="10" fill="none" stroke="#212121" stroke-width="3"/>
    <circle cx="12" cy="34" r="2" fill="#757575"/>
    <circle cx="38" cy="34" r="2" fill="#757575"/>
    <path d="M12 34 L25 20 L38 34" stroke="#E53935" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M25 20 L25 14 L30 14" stroke="#212121" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M20 20 L30 20" stroke="#212121" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

function svgRocket() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 6 Q32 10 32 26 L25 30 L18 26 Q18 10 25 6 Z" fill="#E53935"/>
    <ellipse cx="25" cy="24" rx="7" ry="8" fill="#EF9A9A"/>
    <rect x="19" y="28" width="12" height="8" rx="2" fill="#ECEFF1"/>
    <path d="M19 34 L12 40 L12 46 L19 42 Z" fill="#FFA726"/>
    <path d="M31 34 L38 40 L38 46 L31 42 Z" fill="#FFA726"/>
    <circle cx="25" cy="22" r="4" fill="#B3E5FC"/>
    <ellipse cx="25" cy="42" rx="6" ry="4" fill="#FF8A65" opacity="0.7"/>
  </svg>`;
}

function svgTrain() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="16" width="34" height="24" rx="6" fill="#1565C0"/>
    <rect x="8" y="16" width="34" height="10" rx="6" fill="#1E88E5"/>
    <rect x="14" y="19" width="10" height="6" rx="2" fill="#B3E5FC"/>
    <rect x="27" y="19" width="10" height="6" rx="2" fill="#B3E5FC"/>
    <rect x="10" y="30" width="30" height="8" rx="2" fill="#1565C0"/>
    <circle cx="16" cy="42" r="5" fill="#212121"/>
    <circle cx="16" cy="42" r="2" fill="#757575"/>
    <circle cx="34" cy="42" r="5" fill="#212121"/>
    <circle cx="34" cy="42" r="2" fill="#757575"/>
    <rect x="22" y="12" width="6" height="6" rx="1" fill="#EF5350"/>
  </svg>`;
}

function svgHelicopter() {
  return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="24" width="24" height="12" rx="4" fill="#7B1FA2"/>
    <ellipse cx="20" cy="30" rx="6" ry="4" fill="#CE93D8" opacity="0.6"/>
    <path d="M34 28 L44 26 Q46 30 44 32 L34 30 Z" fill="#9C27B0"/>
    <rect x="22" y="18" width="6" height="8" rx="2" fill="#7B1FA2"/>
    <line x1="4" y1="18" x2="46" y2="18" stroke="#AB47BC" stroke-width="3" stroke-linecap="round"/>
    <circle cx="25" cy="18" r="3" fill="#CE93D8"/>
    <line x1="38" y1="36" x2="38" y2="42" stroke="#7B1FA2" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="34" y1="42" x2="42" y2="42" stroke="#7B1FA2" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

// ── Item catalog ───────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'fruit',
    label: '과일만 터치!',
    items: [
      { id: 'apple',      svg: svgApple },
      { id: 'banana',     svg: svgBanana },
      { id: 'grape',      svg: svgGrape },
      { id: 'strawberry', svg: svgStrawberry },
      { id: 'watermelon', svg: svgWatermelon },
      { id: 'cherry',     svg: svgCherry },
      { id: 'peach',      svg: svgPeach },
      { id: 'kiwi',       svg: svgKiwi },
    ],
  },
  {
    id: 'animal',
    label: '동물만 터치!',
    items: [
      { id: 'cat',     svg: svgCat },
      { id: 'dog',     svg: svgDog },
      { id: 'rabbit',  svg: svgRabbit },
      { id: 'fish',    svg: svgFish },
      { id: 'bird',    svg: svgBird },
      { id: 'bear',    svg: svgBear },
      { id: 'penguin', svg: svgPenguin },
      { id: 'fox',     svg: svgFox },
    ],
  },
  {
    id: 'vehicle',
    label: '탈것만 터치!',
    items: [
      { id: 'car',        svg: svgCar },
      { id: 'bus',        svg: svgBus },
      { id: 'airplane',   svg: svgAirplane },
      { id: 'ship',       svg: svgShip },
      { id: 'bicycle',    svg: svgBicycle },
      { id: 'rocket',     svg: svgRocket },
      { id: 'train',      svg: svgTrain },
      { id: 'helicopter', svg: svgHelicopter },
    ],
  },
];

const PLAYER_CONFIG = [
  { label: 'P1', hex: '#C62828', bgTint: 'rgba(198,40,40,0.15)' },
  { label: 'P2', hex: '#1565C0', bgTint: 'rgba(21,101,192,0.15)' },
  { label: 'P3', hex: '#2E7D32', bgTint: 'rgba(46,125,50,0.15)' },
  { label: 'P4', hex: '#6A1B9A', bgTint: 'rgba(106,27,154,0.15)' },
];

const GAME_DURATION = 30; // seconds
const ITEMS_PER_ZONE = 8; // 2 rows × 4 columns
const MATCH_COUNT = 4;    // ~50% matching items per zone

// ── Sound Manager ─────────────────────────────────────────
const sound = createSoundManager({
  correct(ctx) {
    // Bright pop — quick ascending two-tone
    [660, 880].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  },
  wrong(ctx) {
    // Buzz
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
  },
  fanfare(ctx) {
    [392, 523, 659, 784, 1047].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  },
});

// ── State ─────────────────────────────────────────────────
let playerCount   = 2;
let currentCat    = null;   // active category object
let scores        = [];     // score per player
let gameActive    = false;
let timer         = null;
let timeoutIds    = [];     // all setTimeout IDs for cleanup

// Per-zone item state: array of { itemDef, isMatch } for each cell
let zoneItems     = [];     // zoneItems[playerIdx][cellIdx]

// ── DOM ───────────────────────────────────────────────────
const introScreen   = document.getElementById('introScreen');
const gameScreen    = document.getElementById('gameScreen');
const resultScreen  = document.getElementById('resultScreen');
const backBtn       = document.getElementById('backBtn');
const playBtn       = document.getElementById('playBtn');
const closeBtn      = document.getElementById('closeBtn');
const retryBtn      = document.getElementById('retryBtn');
const homeBtn       = document.getElementById('homeBtn');
const soundToggleIntro = document.getElementById('soundToggleIntro');
const zonesWrap     = document.getElementById('zonesWrap');
const categoryText  = document.getElementById('categoryText');
const timerBarFill  = document.getElementById('timerBarFill');
const resultTitle   = document.getElementById('resultTitle');
const resultWinner  = document.getElementById('resultWinner');
const resultScores  = document.getElementById('resultScores');

// ── Helpers ───────────────────────────────────────────────
function showScreen(s) {
  [introScreen, gameScreen, resultScreen].forEach(el => el.classList.remove('active'));
  s.classList.add('active');
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeTimeout(fn, delay) {
  const id = setTimeout(() => {
    timeoutIds = timeoutIds.filter(x => x !== id);
    fn();
  }, delay);
  timeoutIds.push(id);
  return id;
}

function clearAllTimeouts() {
  timeoutIds.forEach(id => clearTimeout(id));
  timeoutIds = [];
}

function updateSoundToggle() {
  soundToggleIntro.textContent = sound.isMuted() ? '🔇' : '🔊';
}

// ── Item generation ────────────────────────────────────────
/**
 * Build an array of 8 item state objects for one zone:
 * exactly MATCH_COUNT matching items + (ITEMS_PER_ZONE - MATCH_COUNT) non-matching.
 * Non-matching come from the other two categories combined.
 */
function buildZoneItemList(cat) {
  const matchItems  = shuffle(cat.items).slice(0, MATCH_COUNT);
  const nonCats     = CATEGORIES.filter(c => c.id !== cat.id);
  const nonPool     = nonCats.flatMap(c => c.items);
  const nonMatches  = shuffle(nonPool).slice(0, ITEMS_PER_ZONE - MATCH_COUNT);

  const combined = shuffle([
    ...matchItems.map(item => ({ itemDef: item, isMatch: true })),
    ...nonMatches.map(item => ({ itemDef: item, isMatch: false })),
  ]);
  return combined;
}

/**
 * Pick a replacement item for a correctly-tapped cell.
 * Maintains ~50% ratio: decide randomly whether to add a match or non-match.
 */
function pickReplacement(cat, currentItems) {
  const matchCount = currentItems.filter(x => x && x.isMatch).length;
  const needMatch  = matchCount < MATCH_COUNT;

  // Decide: if under target match count, give a match; else give non-match (50/50)
  const giveMatch = needMatch || (matchCount === MATCH_COUNT && Math.random() < 0.5);

  if (giveMatch) {
    return { itemDef: rand(cat.items), isMatch: true };
  } else {
    const nonCats = CATEGORIES.filter(c => c.id !== cat.id);
    const nonPool = nonCats.flatMap(c => c.items);
    return { itemDef: rand(nonPool), isMatch: false };
  }
}

// ── Build player zones ────────────────────────────────────
function buildZones() {
  zonesWrap.innerHTML = '';
  zonesWrap.className = `zones-wrap p${playerCount}`;
  zoneItems = [];

  for (let p = 0; p < playerCount; p++) {
    const cfg   = PLAYER_CONFIG[p];
    const items = buildZoneItemList(currentCat);
    zoneItems.push(items);

    const zone  = document.createElement('div');
    zone.className = 'zone';
    zone.dataset.player = p;
    zone.style.background = cfg.bgTint;
    zone.style.borderColor = cfg.hex + '33';

    // Zone header row
    const header = document.createElement('div');
    header.className = 'zone-header';

    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = cfg.label;
    label.style.color = cfg.hex;

    const scoreEl = document.createElement('div');
    scoreEl.className = 'zone-score';
    scoreEl.dataset.scoreFor = p;
    scoreEl.textContent = '0점';

    header.appendChild(label);
    header.appendChild(scoreEl);
    zone.appendChild(header);

    // Item grid
    const grid = document.createElement('div');
    grid.className = 'item-grid';
    grid.dataset.gridFor = p;

    items.forEach((itemState, cellIdx) => {
      const cell = buildItemCell(p, cellIdx, itemState);
      grid.appendChild(cell);
    });

    zone.appendChild(grid);
    zonesWrap.appendChild(zone);
  }
}

function buildItemCell(playerIdx, cellIdx, itemState) {
  const cell = document.createElement('div');
  cell.className = 'item-cell';
  cell.dataset.cell = cellIdx;
  cell.innerHTML = itemState.itemDef.svg();

  onTap(cell, () => handleItemTap(playerIdx, cellIdx, cell));
  return cell;
}

function getGrid(playerIdx) {
  return zonesWrap.querySelector(`[data-grid-for="${playerIdx}"]`);
}

function updateZoneScore(playerIdx) {
  const el = zonesWrap.querySelector(`[data-score-for="${playerIdx}"]`);
  if (el) el.textContent = scores[playerIdx] + '점';
}

// ── Tap handler ───────────────────────────────────────────
function handleItemTap(playerIdx, cellIdx, cell) {
  if (!gameActive) return;

  const itemState = zoneItems[playerIdx][cellIdx];
  if (!itemState) return; // cell mid-transition

  if (itemState.isMatch) {
    // Correct tap
    sound.play('correct');
    scores[playerIdx]++;
    updateZoneScore(playerIdx);

    // Mark slot as transitioning
    zoneItems[playerIdx][cellIdx] = null;

    cell.classList.add('correct-flash');

    safeTimeout(() => {
      // Replace with new item after animation
      const replacement = pickReplacement(currentCat, zoneItems[playerIdx]);
      zoneItems[playerIdx][cellIdx] = replacement;

      cell.innerHTML = replacement.itemDef.svg();
      cell.className = 'item-cell slide-in';
      cell.addEventListener('animationend', () => {
        cell.classList.remove('slide-in');
      }, { once: true });

      // Re-bind tap (onTap adds listeners, but cell still has them from buildItemCell)
      // The tap listener closure still refers to the same cell index, which is correct.
    }, 360);

  } else {
    // Wrong tap
    sound.play('wrong');
    scores[playerIdx]--;
    if (scores[playerIdx] < 0) scores[playerIdx] = 0;
    updateZoneScore(playerIdx);

    cell.classList.add('wrong-shake');
    cell.addEventListener('animationend', () => {
      cell.classList.remove('wrong-shake');
    }, { once: true });
  }
}

// ── Game flow ─────────────────────────────────────────────
function startGame() {
  // Pick random category
  currentCat = rand(CATEGORIES);
  scores     = new Array(playerCount).fill(0);
  gameActive = false;
  clearAllTimeouts();

  categoryText.textContent = '준비!';
  timerBarFill.style.transition = 'none';
  timerBarFill.style.width = '100%';

  showScreen(gameScreen);
  buildZones();

  // Countdown 3-2-1
  safeTimeout(() => {
    categoryText.textContent = '3';
    safeTimeout(() => {
      categoryText.textContent = '2';
      safeTimeout(() => {
        categoryText.textContent = '1';
        safeTimeout(() => {
          categoryText.textContent = currentCat.label;
          gameActive = true;

          // Start timer bar drain
          timerBarFill.style.transition = `width ${GAME_DURATION}s linear`;
          timerBarFill.style.width = '0%';

          // Start countdown timer
          if (timer) timer.stop();
          timer = createTimer(GAME_DURATION,
            (remaining) => {
              // Urgent color when 10s left
              if (remaining <= 10) {
                timerBarFill.style.background = '#EF5350';
              }
            },
            () => {
              gameActive = false;
              showResult();
            }
          );
          timer.start();
        }, 700);
      }, 700);
    }, 700);
  }, 300);
}

function stopGame() {
  gameActive = false;
  clearAllTimeouts();
  if (timer) {
    timer.stop();
    timer = null;
  }
}

// ── Result screen ─────────────────────────────────────────
function showResult() {
  stopGame();
  sound.play('fanfare');

  const maxScore = Math.max(...scores);
  const winners  = scores.reduce((acc, s, i) => {
    if (s === maxScore) acc.push(i);
    return acc;
  }, []);

  resultTitle.textContent = '게임 종료!';
  if (winners.length === 1) {
    const cfg = PLAYER_CONFIG[winners[0]];
    resultWinner.textContent = cfg.label + ' 최종 우승! 🎉';
    resultWinner.style.color = cfg.hex;
  } else {
    resultWinner.textContent = '공동 우승: ' + winners.map(i => PLAYER_CONFIG[i].label).join(', ');
    resultWinner.style.color = '#4CAF50';
  }

  // Sort players by score descending
  const ranked = scores.map((s, i) => ({ idx: i, score: s }))
    .sort((a, b) => b.score - a.score);

  const rankSymbols = ['🥇', '🥈', '🥉'];

  resultScores.innerHTML = ranked.map((r, ri) => {
    const cfg = PLAYER_CONFIG[r.idx];
    const rankText = ri < 3 ? rankSymbols[ri] : `${ri + 1}위`;
    return `
      <div class="score-card">
        <div class="score-card-rank">${rankText}</div>
        <div class="score-card-name" style="color:${cfg.hex}">${cfg.label}</div>
        <div class="score-card-pts">${r.score}점</div>
      </div>
    `;
  }).join('');

  showScreen(resultScreen);
}

// ── Navigation ────────────────────────────────────────────
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundToggle();
});
updateSoundToggle();

document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

onTap(backBtn,  () => goHome());
onTap(playBtn,  () => startGame());
onTap(closeBtn, () => { stopGame(); goHome(); });
onTap(retryBtn, () => startGame());
onTap(homeBtn,  () => goHome());
