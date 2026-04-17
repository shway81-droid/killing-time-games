/* games/arrow-direction/game.js */

'use strict';

// ── Direction definitions ──────────────────────────────────
// rotate(0)=up, 90=right, 180=down, 270=left
const DIRECTIONS = [
  { id: 'up',    label: '위',    rotate: 0,   cssClass: 'dir-up',    btnColor: '#29B6F6', btnStroke: '#0277BD' },
  { id: 'right', label: '오른쪽', rotate: 90,  cssClass: 'dir-right', btnColor: '#66BB6A', btnStroke: '#2E7D32' },
  { id: 'down',  label: '아래',  rotate: 180, cssClass: 'dir-down',  btnColor: '#FFA726', btnStroke: '#E65100' },
  { id: 'left',  label: '왼쪽',  rotate: 270, cssClass: 'dir-left',  btnColor: '#AB47BC', btnStroke: '#6A1B9A' },
];

const DIR_BY_ID = {};
DIRECTIONS.forEach(d => { DIR_BY_ID[d.id] = d; });

// Arrow position offsets for the Stroop-like spatial trick
// Each entry shifts the central panel toward a quadrant
const POSITIONS = [
  { id: 'top-left',     style: 'top:22%;left:28%;'  },
  { id: 'top-right',    style: 'top:22%;right:28%;left:auto;' },
  { id: 'bottom-left',  style: 'top:62%;left:28%;'  },
  { id: 'bottom-right', style: 'top:62%;right:28%;left:auto;' },
  { id: 'center',       style: 'top:50%;left:50%;'  },
];

const TOTAL_ROUNDS = 15;

// Player zone config
const PLAYER_CONFIG = [
  { label: 'P1', hex: '#1565C0', bgTint: 'rgba(21,101,192,0.18)'  },
  { label: 'P2', hex: '#880E4F', bgTint: 'rgba(136,14,79,0.18)'   },
  { label: 'P3', hex: '#1B5E20', bgTint: 'rgba(27,94,32,0.18)'    },
  { label: 'P4', hex: '#E65100', bgTint: 'rgba(230,81,0,0.18)'    },
];

// ── Sound Manager ─────────────────────────────────────────
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
      gain.gain.setValueAtTime(0.30, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
      osc.start(t);
      osc.stop(t + 0.30);
    });
  },

  buzz(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, ctx.currentTime);
    gain.gain.setValueAtTime(0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.38);
  },

  fanfare(ctx) {
    [392, 523, 659, 784, 1047].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  },

  countdown(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);
  },
});

// ── State ─────────────────────────────────────────────────
let playerCount      = 2;
let currentRound     = 0;
let scores           = [];
let roundResults     = [];   // { winner, correctId, positionId, dq }
let phase            = 'idle';
let currentRoundData = null; // { correctId, positionStyle }
let roundDQ          = new Set();
let roundResolved    = false;
let nextRoundTimer   = null;
let pendingTimers    = [];

// ── DOM ───────────────────────────────────────────────────
const introScreen  = document.getElementById('introScreen');
const gameScreen   = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');

const backBtn          = document.getElementById('backBtn');
const playBtn          = document.getElementById('playBtn');
const closeBtn         = document.getElementById('closeBtn');
const retryBtn         = document.getElementById('retryBtn');
const homeBtn          = document.getElementById('homeBtn');
const soundToggleIntro = document.getElementById('soundToggleIntro');

const zonesWrap       = document.getElementById('zonesWrap');
const arrowPanel      = document.getElementById('arrowPanel');
const arrowSvg        = document.getElementById('arrowSvg');
const roundBadge      = document.getElementById('roundBadge');
const roundStatus     = document.getElementById('roundStatus');

const resultTitle     = document.getElementById('resultTitle');
const resultWinner    = document.getElementById('resultWinner');
const resultTableHead = document.getElementById('resultTableHead');
const resultTableBody = document.getElementById('resultTableBody');
const totalRow        = document.getElementById('totalRow');

// ── Helpers ───────────────────────────────────────────────
function showScreen(s) {
  [introScreen, gameScreen, resultScreen].forEach(el => el.classList.remove('active'));
  s.classList.add('active');
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randItemExcept(arr, excludeId) {
  const filtered = arr.filter(x => x.id !== excludeId);
  return randItem(filtered);
}

function updateSoundIcon() {
  const muted = sound.isMuted();
  soundToggleIntro.innerHTML = muted
    ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
       </svg>`;
}

// ── Sound toggle ──────────────────────────────────────────
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundIcon();
});
updateSoundIcon();

// ── Player count select ───────────────────────────────────
document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// ── Nav buttons ───────────────────────────────────────────
onTap(backBtn,  () => { clearAllTimers(); goHome(); });
onTap(closeBtn, () => { clearAllTimers(); goHome(); });
onTap(homeBtn,  () => { clearAllTimers(); goHome(); });
onTap(retryBtn, () => startGame());
onTap(playBtn,  () => startGame());

// ── SVG direction button builder ──────────────────────────
// Arrow polygon for the button (pointing up, rotated via transform)
function buildDirButtonSVG(dir) {
  const rotateDeg = dir.rotate;
  return `
    <svg viewBox="0 0 80 80" width="60" height="60" aria-hidden="true">
      <circle cx="40" cy="40" r="38" fill="${dir.btnColor}" stroke="${dir.btnStroke}" stroke-width="2.5"/>
      <g transform="rotate(${rotateDeg}, 40, 40)">
        <polygon points="40,14 58,44 47,44 47,66 33,66 33,44 22,44"
          fill="#ffffff" opacity="0.95"/>
      </g>
    </svg>`;
}

// Small inline SVG arrow for result table
function dirArrowSVG(dirId, size) {
  const dir = DIR_BY_ID[dirId];
  if (!dir) return '';
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="dir-icon" aria-hidden="true">
    <g transform="rotate(${dir.rotate}, 20, 20)">
      <polygon points="20,5 32,22 24,22 24,35 16,35 16,22 8,22"
        fill="${dir.btnColor}"/>
    </g>
  </svg>`;
}

// ── Build player zones ────────────────────────────────────
function buildZones() {
  zonesWrap.innerHTML = '';
  zonesWrap.className = `zones-wrap p${playerCount}`;

  for (let i = 0; i < playerCount; i++) {
    const cfg  = PLAYER_CONFIG[i];
    const zone = document.createElement('div');
    zone.className = 'zone state-idle';
    zone.dataset.player = i;
    zone.style.background = cfg.bgTint;

    // Direction button grid (2x2: up/right top row, left/down bottom row)
    const grid = document.createElement('div');
    grid.className = 'dir-grid';

    // Layout: [up, right] / [left, down]
    const layout = [
      DIRECTIONS[0], // up
      DIRECTIONS[1], // right
      DIRECTIONS[3], // left
      DIRECTIONS[2], // down
    ];

    layout.forEach(dir => {
      const btn = document.createElement('div');
      btn.className = 'dir-btn';
      btn.dataset.dirId = dir.id;
      btn.innerHTML = buildDirButtonSVG(dir);
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', dir.label);

      onTap(btn, (e) => {
        e.stopPropagation();
        handleDirTap(i, dir.id, zone, e);
      });

      grid.appendChild(btn);
    });

    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = cfg.label;

    const scoreLine = document.createElement('div');
    scoreLine.className = 'zone-score';
    scoreLine.dataset.scoreFor = i;
    scoreLine.textContent = '0점';

    zone.appendChild(label);
    zone.appendChild(grid);
    zone.appendChild(scoreLine);

    zonesWrap.appendChild(zone);
  }
}

function getZone(idx) {
  return zonesWrap.querySelector(`.zone[data-player="${idx}"]`);
}

function updateZoneScore(idx) {
  const el = zonesWrap.querySelector(`[data-score-for="${idx}"]`);
  if (el) el.textContent = scores[idx] + '점';
}

// ── Ripple ────────────────────────────────────────────────
function spawnRipple(zone, e) {
  const rect  = zone.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const x = (touch ? touch.clientX : rect.left + rect.width  / 2) - rect.left;
  const y = (touch ? touch.clientY : rect.top  + rect.height / 2) - rect.top;
  const size = Math.max(rect.width, rect.height);
  const r = document.createElement('span');
  r.className = 'zone-ripple';
  r.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin-left:-${size/2}px;margin-top:-${size/2}px;`;
  zone.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

// ── Round generation ──────────────────────────────────────
function generateRound() {
  const correctDir  = randItem(DIRECTIONS);  // the direction to tap
  const useMismatch = Math.random() < 0.5;   // 50% tricky

  // Pick a position for the panel
  // If mismatch: arrow is placed somewhere that suggests a DIFFERENT direction
  // We bias toward placing the arrow on the "wrong" side to maximise confusion
  let position;
  if (useMismatch) {
    // pick a position that doesn't naturally correspond to the arrow direction
    // i.e., if arrow points right, place it on the LEFT side, etc.
    const oppositeMap = { up: 'bottom-left', down: 'top-right', left: 'top-right', right: 'bottom-left' };
    const biasPos = POSITIONS.find(p => p.id === oppositeMap[correctDir.id]);
    position = biasPos || randItem(POSITIONS);
  } else {
    position = randItem(POSITIONS);
  }

  return { correctId: correctDir.id, positionStyle: position.style, positionId: position.id };
}

// ── Show arrow ────────────────────────────────────────────
function showArrow(roundData) {
  const dir = DIR_BY_ID[roundData.correctId];

  // Position the panel
  arrowPanel.style.cssText = `
    position: absolute;
    ${roundData.positionStyle}
    transform: translate(-50%, -50%);
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  `;

  // Rotate the arrow SVG
  arrowSvg.className = '';
  void arrowSvg.offsetWidth; // reflow to re-trigger animation
  arrowSvg.style.transform = `rotate(${dir.rotate}deg)`;
  arrowSvg.classList.add('arrow-pop');
}

function hideArrow() {
  arrowSvg.className = 'arrow-hidden';
}

// ── Direction tap handler ─────────────────────────────────
function handleDirTap(playerIdx, dirId, zone, e) {
  if (phase !== 'active') return;
  if (roundDQ.has(playerIdx))  return;
  if (roundResolved)            return;

  spawnRipple(zone, e);

  const isCorrect = (dirId === currentRoundData.correctId);

  if (isCorrect) {
    roundResolved = true;
    phase = 'result';
    sound.play('ding');

    scores[playerIdx]++;
    updateZoneScore(playerIdx);

    zone.classList.remove('state-idle', 'state-active', 'state-dq', 'state-wrong');
    zone.classList.add('state-correct');

    setAllZonesIdle(playerIdx);

    const cfg = PLAYER_CONFIG[playerIdx];
    roundStatus.textContent = cfg.label + ' 정답! +1점';
    roundStatus.className   = 'round-status correct';

    roundResults.push({
      winner:     playerIdx,
      correctId:  currentRoundData.correctId,
      positionId: currentRoundData.positionId,
      dq:         new Set(roundDQ),
    });

    scheduleNextOrEnd();
  } else {
    // Wrong → disqualified for this round
    sound.play('buzz');
    roundDQ.add(playerIdx);

    zone.classList.remove('state-idle', 'state-active', 'state-correct');
    zone.classList.add('state-dq', 'state-wrong');

    pendingTimers.push(setTimeout(() => zone.classList.remove('state-wrong'), 450));

    roundStatus.textContent = PLAYER_CONFIG[playerIdx].label + ' 오답 실격!';
    roundStatus.className   = 'round-status wrong';

    pendingTimers.push(setTimeout(() => {
      if (phase === 'active') {
        roundStatus.textContent = '';
        roundStatus.className   = 'round-status';
      }
    }, 800));

    // All players disqualified?
    const alive = Array.from({ length: playerCount }, (_, i) => i)
      .filter(i => !roundDQ.has(i));
    if (alive.length === 0) {
      roundResolved = true;
      phase = 'result';
      roundStatus.textContent = '전원 실격 — 무승부';
      roundStatus.className   = 'round-status wrong';
      roundResults.push({
        winner:     -1,
        correctId:  currentRoundData.correctId,
        positionId: currentRoundData.positionId,
        dq:         new Set(roundDQ),
      });
      scheduleNextOrEnd();
    }
  }
}

function setAllZonesIdle(exceptIdx) {
  for (let i = 0; i < playerCount; i++) {
    if (i === exceptIdx) continue;
    const z = getZone(i);
    if (!z) continue;
    if (!roundDQ.has(i)) {
      z.classList.remove('state-active', 'state-correct', 'state-wrong');
      z.classList.add('state-idle');
    }
  }
}

// ── Game flow ─────────────────────────────────────────────
function startGame() {
  clearAllTimers();
  scores       = new Array(playerCount).fill(0);
  roundResults = [];
  currentRound = 0;
  showScreen(gameScreen);
  buildZones();
  // Reset panel to center
  arrowPanel.style.cssText = '';
  pendingTimers.push(setTimeout(() => nextRound(), 300));
}

function nextRound() {
  currentRound++;
  roundDQ       = new Set();
  roundResolved = false;
  phase         = 'idle';

  roundBadge.textContent  = currentRound + ' / ' + TOTAL_ROUNDS;
  roundStatus.textContent = '준비...';
  roundStatus.className   = 'round-status';

  hideArrow();

  // Reset all zones to idle
  for (let i = 0; i < playerCount; i++) {
    const z = getZone(i);
    if (z) {
      z.classList.remove('state-correct', 'state-wrong', 'state-dq', 'state-active');
      z.classList.add('state-idle');
    }
  }

  sound.play('countdown');

  // Short pause then reveal arrow
  pendingTimers.push(setTimeout(() => {
    currentRoundData = generateRound();
    showArrow(currentRoundData);
    roundStatus.textContent = '';
    roundStatus.className   = 'round-status';

    // Activate all zones
    for (let i = 0; i < playerCount; i++) {
      const z = getZone(i);
      if (z) {
        z.classList.remove('state-idle', 'state-correct', 'state-wrong', 'state-dq');
        z.classList.add('state-active');
      }
    }
    phase = 'active';
  }, 750));
}

function clearNextRoundTimer() {
  if (nextRoundTimer) {
    clearTimeout(nextRoundTimer);
    nextRoundTimer = null;
  }
}

function clearAllTimers() {
  clearNextRoundTimer();
  pendingTimers.forEach(id => clearTimeout(id));
  pendingTimers = [];
}

function scheduleNextOrEnd() {
  clearNextRoundTimer();
  nextRoundTimer = setTimeout(() => {
    nextRoundTimer = null;
    if (currentRound >= TOTAL_ROUNDS) {
      showResult();
    } else {
      nextRound();
    }
  }, 1600);
}

// ── Result screen ─────────────────────────────────────────
function showResult() {
  sound.play('fanfare');

  const maxScore = Math.max(...scores);
  const winners  = scores.reduce((acc, s, i) => {
    if (s === maxScore) acc.push(i);
    return acc;
  }, []);

  if (winners.length === 1) {
    const cfg = PLAYER_CONFIG[winners[0]];
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = cfg.label + ' 최종 우승!';
    resultWinner.style.color = cfg.hex;
  } else {
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = '공동 우승: ' + winners.map(i => PLAYER_CONFIG[i].label).join(', ');
    resultWinner.style.color = '#FF5722';
  }

  const players = Array.from({ length: playerCount }, (_, i) => PLAYER_CONFIG[i]);

  resultTableHead.innerHTML = `
    <tr>
      <th>라운드</th>
      <th>정답 방향</th>
      ${players.map(p => `<th><span class="player-dot" style="background:${p.hex}"></span>${p.label}</th>`).join('')}
    </tr>
  `;

  resultTableBody.innerHTML = roundResults.map((r, ri) => {
    const dir = DIR_BY_ID[r.correctId];
    const dirCell = `${dirArrowSVG(r.correctId, 20)} ${dir ? dir.label : ''}`;
    const cells = players.map((_, pi) => {
      if (r.dq && r.dq.has(pi))  return `<td class="cell-dq">실격</td>`;
      if (r.winner === pi)         return `<td class="cell-win">★ 정답</td>`;
      return `<td class="cell-none">—</td>`;
    }).join('');
    return `<tr><td>${ri + 1}</td><td>${dirCell}</td>${cells}</tr>`;
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
