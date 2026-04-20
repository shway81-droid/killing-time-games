/* games/relay-numbers/game.js */
'use strict';

// ── Constants ─────────────────────────────────────────────────
const TARGET_NUMBER = 30;
const TURN_SECONDS  = 3;

const PLAYER_CONFIG = [
  { label: 'P1', colorClass: 'p-blue',   hex: '#5C6BC0', accent: '#FFD740' },
  { label: 'P2', colorClass: 'p-red',    hex: '#AB47BC', accent: '#FF80AB' },
  { label: 'P3', colorClass: 'p-orange', hex: '#FF7043', accent: '#FFD180' },
  { label: 'P4', colorClass: 'p-green',  hex: '#66BB6A', accent: '#CCFF90' },
];

// ── Sound Manager ─────────────────────────────────────────────
const sound = createSoundManager({
  tap(ctx) {
    // Ascending ping: correct tap
    [523, 659, 784].forEach((freq, i) => {
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
    // Low descending buzz: wrong player or timeout
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  },

  tick(ctx) {
    // Short click for last-second warning
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  },

  success(ctx) {
    // Fanfare: major arpeggio + chord
    const freqs = [392, 523, 659, 784, 1047];
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  },
});

// ── State ─────────────────────────────────────────────────────
let playerCount   = 2;
let currentNumber = 0;       // the number just tapped (0 = not started)
let assignment    = [];      // assignment[i] = playerIndex for number i+1 (1-indexed)
let gameActive    = false;
let turnTimerInterval = null;
let turnRemaining = TURN_SECONDS;
let countdownInterval = null;

// Timers to clean up
let allTimers = [];

function safeTimeout(fn, ms) {
  const id = setTimeout(fn, ms);
  allTimers.push({ type: 'timeout', id });
  return id;
}

function safeInterval(fn, ms) {
  const id = setInterval(fn, ms);
  allTimers.push({ type: 'interval', id });
  return id;
}

function clearAllTimers() {
  allTimers.forEach(t => {
    if (t.type === 'timeout') clearTimeout(t.id);
    else clearInterval(t.id);
  });
  allTimers = [];
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (turnTimerInterval) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
}

// ── DOM references ─────────────────────────────────────────────
const introScreen     = document.getElementById('introScreen');
const countdownScreen = document.getElementById('countdownScreen');
const countdownNumber = document.getElementById('countdownNumber');
const gameScreen      = document.getElementById('gameScreen');
const resultScreen    = document.getElementById('resultScreen');

const backBtn         = document.getElementById('backBtn');
const playBtn         = document.getElementById('playBtn');
const closeBtn        = document.getElementById('closeBtn');
const retryBtn        = document.getElementById('retryBtn');
const homeBtn         = document.getElementById('homeBtn');

const zonesWrap       = document.getElementById('zonesWrap');
const progressLabel   = document.getElementById('progressLabel');
const progressFill    = document.getElementById('progressFill');
const turnTimerBadge  = document.getElementById('turnTimerBadge');
const announceText    = document.getElementById('announceText');

const resultTitle     = document.getElementById('resultTitle');
const resultSub       = document.getElementById('resultSub');
const resultReached   = document.getElementById('resultReached');
const resultSvg       = document.getElementById('resultSvg');
const confettiLayer   = document.getElementById('confettiLayer');
const soundToggleIntro = document.getElementById('soundToggleIntro');

// ── Helpers ────────────────────────────────────────────────────
function showScreen(screen) {
  [introScreen, countdownScreen, gameScreen, resultScreen].forEach(s => {
    s.classList.remove('active');
    s.style.display = '';
  });
  screen.classList.add('active');
}

function updateSoundToggle() {
  soundToggleIntro.textContent = sound.isMuted() ? '🔇' : '🔊';
}

// ── Assignment generator ──────────────────────────────────────
// Distributes numbers 1..TARGET_NUMBER across players.
// Guarantees each player gets at least one turn, and
// nobody gets two consecutive numbers (unless forced by small playerCount).
function generateAssignment(count) {
  const arr = new Array(TARGET_NUMBER);
  // Round-robin shuffle: create a shuffled queue per player
  // We cycle through random permutations to ensure no two consecutive same player
  let lastPlayer = -1;

  for (let i = 0; i < TARGET_NUMBER; i++) {
    // Build list of eligible players (not the same as last)
    const eligible = [];
    for (let p = 0; p < count; p++) {
      if (p !== lastPlayer) eligible.push(p);
    }
    // Pick randomly from eligible
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    arr[i] = chosen;
    lastPlayer = chosen;
  }

  // Verify all players appear (edge case with count > TARGET_NUMBER is impossible here)
  // Force any missing players in: swap with a run of same player elsewhere
  for (let p = 0; p < count; p++) {
    if (!arr.includes(p)) {
      // Find a position where the previous and next are not p, swap
      for (let i = 1; i < TARGET_NUMBER - 1; i++) {
        if (arr[i - 1] !== p && arr[i + 1] !== p && arr[i] !== arr[i - 1]) {
          arr[i] = p;
          break;
        }
      }
    }
  }

  return arr; // arr[i] is the player for number (i+1)
}

// ── Init ───────────────────────────────────────────────────────
updateSoundToggle();

// Sound toggle
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundToggle();
});

// Player count selection
document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// Nav buttons
onTap(backBtn, () => { clearAllTimers(); goHome(); });
onTap(closeBtn, () => { clearAllTimers(); goHome(); });
onTap(homeBtn, () => { clearAllTimers(); goHome(); });
onTap(retryBtn, () => { clearAllTimers(); startCountdown(() => startGame()); });
onTap(playBtn, () => startCountdown(() => startGame()));

// ── Countdown ─────────────────────────────────────────────────
function startCountdown(onDone) {
  showScreen(countdownScreen);
  let count = 3;
  countdownNumber.textContent = count;
  countdownNumber.style.animation = 'none';

  countdownInterval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      onDone();
    } else {
      countdownNumber.style.animation = 'none';
      // Trigger reflow to restart animation
      void countdownNumber.offsetWidth;
      countdownNumber.style.animation = '';
      countdownNumber.textContent = count;
    }
  }, 1000);
}

// ── Build zones ────────────────────────────────────────────────
function buildZones() {
  zonesWrap.innerHTML = '';
  zonesWrap.className = `zones-wrap p${playerCount}`;

  for (let i = 0; i < playerCount; i++) {
    const cfg  = PLAYER_CONFIG[i];
    const zone = document.createElement('div');
    zone.className = `zone ${cfg.colorClass} state-wait`;
    zone.dataset.player = i;

    // Inline SVG: player label + number display
    zone.innerHTML = `
      <svg class="zone-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <text class="zone-player-svg-label" x="100" y="28" text-anchor="middle"
              font-size="16" font-weight="700" fill="rgba(255,255,255,0.45)"
              font-family="'Pretendard Variable', -apple-system, 'Noto Sans KR', sans-serif">
          ${cfg.label}
        </text>
        <text class="zone-number-text" x="100" y="78" text-anchor="middle"
              font-family="'Pretendard Variable', -apple-system, 'Noto Sans KR', sans-serif">
          대기 중
        </text>
      </svg>
    `;

    onTap(zone, (e) => handleZoneTap(i, zone, e));
    zonesWrap.appendChild(zone);
  }
}

function getZone(idx) {
  return zonesWrap.querySelector(`.zone[data-player="${idx}"]`);
}

function getZoneNumberText(idx) {
  const z = getZone(idx);
  return z ? z.querySelector('.zone-number-text') : null;
}

// ── Game start ─────────────────────────────────────────────────
function startGame() {
  assignment    = generateAssignment(playerCount);
  currentNumber = 0;
  gameActive    = false;

  showScreen(gameScreen);
  buildZones();
  updateProgress();

  // Short pause, then begin first turn
  safeTimeout(() => nextTurn(), 500);
}

// ── Turn logic ─────────────────────────────────────────────────
function nextTurn() {
  const nextNum    = currentNumber + 1;
  const playerIdx  = assignment[nextNum - 1]; // 0-indexed
  const cfg        = PLAYER_CONFIG[playerIdx];

  // Update all zones
  for (let i = 0; i < playerCount; i++) {
    const z    = getZone(i);
    const txt  = getZoneNumberText(i);
    if (!z || !txt) continue;

    z.classList.remove('state-active', 'state-correct', 'state-wrong', 'state-wait');

    if (i === playerIdx) {
      // Active zone: show target number
      z.classList.add('state-active');
      txt.textContent  = String(nextNum);
      txt.setAttribute('font-size', nextNum >= 10 ? '52' : '62');
    } else {
      // Waiting zone
      z.classList.add('state-wait');
      txt.textContent  = '대기 중';
      txt.setAttribute('font-size', '16');
    }
  }

  // Announce
  announceText.textContent = `${cfg.label}의 차례! (숫자 ${nextNum})`;

  // Timer badge
  turnRemaining = TURN_SECONDS;
  updateTimerBadge(turnRemaining);

  gameActive = true;

  // Start per-second countdown
  if (turnTimerInterval) clearInterval(turnTimerInterval);
  turnTimerInterval = safeInterval(() => {
    turnRemaining--;
    updateTimerBadge(turnRemaining);

    if (turnRemaining === 1) {
      sound.play('tick');
    }

    if (turnRemaining <= 0) {
      clearInterval(turnTimerInterval);
      turnTimerInterval = null;
      if (gameActive) {
        handleTimeout(nextNum);
      }
    }
  }, 1000);
}

function updateTimerBadge(remaining) {
  turnTimerBadge.textContent = remaining;
  if (remaining <= 1) {
    turnTimerBadge.classList.add('urgent');
  } else {
    turnTimerBadge.classList.remove('urgent');
  }
}

function updateProgress() {
  const pct = (currentNumber / TARGET_NUMBER) * 100;
  progressLabel.textContent = `${currentNumber} / ${TARGET_NUMBER}`;
  progressFill.style.width  = pct + '%';
}

// ── Tap handler ────────────────────────────────────────────────
function handleZoneTap(playerIdx, zone, e) {
  if (!gameActive) return;

  spawnRipple(zone, e);

  const nextNum       = currentNumber + 1;
  const correctPlayer = assignment[nextNum - 1];

  if (playerIdx === correctPlayer) {
    // Correct!
    handleCorrectTap(zone, nextNum);
  } else {
    // Wrong player tapped
    handleWrongTap(zone);
  }
}

function handleCorrectTap(zone, num) {
  gameActive = false;
  clearInterval(turnTimerInterval);
  turnTimerInterval = null;

  sound.play('tap');
  currentNumber = num;
  updateProgress();

  // Flash correct
  zone.classList.remove('state-active', 'state-wait', 'state-wrong');
  zone.classList.add('state-correct');
  turnTimerBadge.classList.remove('urgent');
  announceText.textContent = `✓ ${num}번 완료!`;

  if (currentNumber >= TARGET_NUMBER) {
    // WIN!
    safeTimeout(() => showResult(true), 600);
  } else {
    safeTimeout(() => nextTurn(), 700);
  }
}

function handleWrongTap(zone) {
  if (!gameActive) return;
  gameActive = false;
  clearInterval(turnTimerInterval);
  turnTimerInterval = null;

  sound.play('wrong');

  // Flash the wrong zone red briefly
  zone.classList.add('state-wrong');
  announceText.textContent = '❌ 틀린 플레이어가 눌렀어요!';

  safeTimeout(() => showResult(false), 900);
}

function handleTimeout(num) {
  gameActive = false;
  clearInterval(turnTimerInterval);
  turnTimerInterval = null;

  sound.play('wrong');

  const playerIdx = assignment[num - 1];
  const z = getZone(playerIdx);
  if (z) {
    z.classList.remove('state-active');
    z.classList.add('state-wrong');
  }
  announceText.textContent = '⏰ 시간 초과!';

  safeTimeout(() => showResult(false), 900);
}

// ── Ripple ─────────────────────────────────────────────────────
function spawnRipple(zone, e) {
  const rect   = zone.getBoundingClientRect();
  const src    = e.touches ? e.touches[0] : e;
  const x      = (src ? src.clientX : rect.left + rect.width  / 2) - rect.left;
  const y      = (src ? src.clientY : rect.top  + rect.height / 2) - rect.top;
  const size   = Math.max(rect.width, rect.height) * 2;
  const ripple = document.createElement('span');
  ripple.className  = 'zone-ripple';
  ripple.style.left = (x - size / 2) + 'px';
  ripple.style.top  = (y - size / 2) + 'px';
  ripple.style.width = ripple.style.height = size + 'px';
  zone.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

// ── Result screen ──────────────────────────────────────────────
function showResult(success) {
  clearAllTimers();
  gameActive = false;

  if (success) {
    sound.play('success');
    resultTitle.textContent   = '🎉 성공!';
    resultSub.textContent     = '모두 함께 30까지 세었어요!';
    resultReached.textContent = '30 / 30';

    // Trophy SVG
    resultSvg.innerHTML = `
      <circle cx="45" cy="45" r="42" fill="#5E35B1" opacity="0.25"/>
      <text x="45" y="60" text-anchor="middle" font-size="48" font-family="sans-serif">🏆</text>
    `;

    // Confetti
    spawnConfetti();
  } else {
    sound.play('wrong');
    resultTitle.textContent   = '아쉬워요!';
    resultSub.textContent     = `${currentNumber}까지 도달했어요\n다시 도전해봐요!`;
    resultReached.textContent = `${currentNumber} / 30`;

    // Sad SVG
    resultSvg.innerHTML = `
      <circle cx="45" cy="45" r="42" fill="#5E35B1" opacity="0.25"/>
      <text x="45" y="60" text-anchor="middle" font-size="48" font-family="sans-serif">😔</text>
    `;

    confettiLayer.innerHTML = '';
  }

  showScreen(resultScreen);
}

function spawnConfetti() {
  confettiLayer.innerHTML = '';
  const colors = ['#FFD740', '#FF6E40', '#69F0AE', '#40C4FF', '#E040FB', '#FFAB40'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left    = Math.random() * 100 + '%';
    el.style.top     = '-10px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay    = (Math.random() * 1.5) + 's';
    el.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
    el.style.width   = (6 + Math.random() * 6) + 'px';
    el.style.height  = (6 + Math.random() * 6) + 'px';
    confettiLayer.appendChild(el);
  }
}
