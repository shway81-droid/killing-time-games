/* games/color-mix/game.js */

'use strict';

// ─── Player definitions ─────────────────────────────────────────
// Each player has: id, label, color hex, RGB contribution, Korean name
const PLAYER_DEFS = [
  { id: 'R', label: 'P1',  colorName: '빨강', hex: '#FF1744', r: 255, g: 0,   b: 0   },
  { id: 'B', label: 'P2',  colorName: '파랑', hex: '#2979FF', r: 0,   g: 0,   b: 255 },
  { id: 'Y', label: 'P3',  colorName: '노랑', hex: '#FFD600', r: 255, g: 230, b: 0   },
  { id: 'G', label: 'P4',  colorName: '초록', hex: '#00E676', r: 0,   g: 230, b: 70  },
];

// ─── Round definitions ────────────────────────────────────────────
// Each round: name, required player IDs ON (R/B/Y/G), target hex display
// The computed mix color is calculated from required set for the preview
const ALL_ROUNDS = [
  { name: '보라',  need: ['R','B'],     minPlayers: 2 },
  { name: '주황',  need: ['R','Y'],     minPlayers: 2 },
  { name: '연두',  need: ['B','Y'],     minPlayers: 2 },
  { name: '파랑',  need: ['B'],         minPlayers: 2 },
  { name: '분홍',  need: ['R','G'],     minPlayers: 3 },  // needs G
  { name: '노랑',  need: ['Y'],         minPlayers: 3 },  // needs Y
  { name: '흰색',  need: ['R','B','Y'], minPlayers: 3 },  // needs 3
  { name: '검정',  need: [],            minPlayers: 2 },  // all off
  { name: '빨강',  need: ['R'],         minPlayers: 2 },
  { name: '청록',  need: ['B','G'],     minPlayers: 3 },  // needs G
];

const ROUND_DURATION = 20; // seconds

// ─── State ────────────────────────────────────────────────────────
let playerCount = 2;
let currentRound = 0;
let rounds = [];      // filtered round list for this session
let toggleState = {}; // { R: false, B: false, Y: false, G: false }
let activePlayers = []; // PLAYER_DEFS slice for this session
let roundTimer = null;
let matchTimeout = null;
let steadyStart = null;
let roundSuccessCount = 0;
let isRoundActive = false;

// ─── Sound Manager ────────────────────────────────────────────────
const sound = createSoundManager({
  toggle(ctx) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 660;
    o.type = 'sine';
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.08);
  },
  match(ctx) {
    // Rising tone sweep
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.25);
    o.type = 'sine';
    g.gain.setValueAtTime(0.22, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.3);
  },
  advance(ctx) {
    // Success ding: two tones
    [[523, 0], [659, 0.12], [784, 0.24]].forEach(([freq, delay]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.22);
    });
  },
  fail(ctx) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(300, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.3);
    o.type = 'sawtooth';
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.35);
  },
  fanfare(ctx) {
    const notes = [[523,0],[659,0.15],[784,0.3],[1047,0.45],[784,0.6],[1047,0.75]];
    notes.forEach(([freq, delay]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'triangle';
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.3);
    });
  }
});

// ─── DOM refs ─────────────────────────────────────────────────────
const introScreen     = document.getElementById('introScreen');
const countdownScreen = document.getElementById('countdownScreen');
const gameScreen      = document.getElementById('gameScreen');
const resultScreen    = document.getElementById('resultScreen');

const countdownNumber = document.getElementById('countdownNumber');
const roundBadge      = document.getElementById('roundBadge');
const timerBarFill    = document.getElementById('timerBarFill');
const timerText       = document.getElementById('timerText');
const targetCircle    = document.getElementById('targetCircle');
const resultCircle    = document.getElementById('resultCircle');
const matchIndicator  = document.getElementById('matchIndicator');
const matchFlash      = document.getElementById('matchFlash');
const steadyRing      = document.getElementById('steadyRing');
const targetName      = document.getElementById('targetName');
const playerGrid      = document.getElementById('playerGrid');

const resultEmoji    = document.getElementById('resultEmoji');
const resultHeadline = document.getElementById('resultHeadline');
const resultDetail   = document.getElementById('resultDetail');
const statRounds     = document.getElementById('statRounds');
const statPlayers    = document.getElementById('statPlayers');

// ─── Screen transitions ───────────────────────────────────────────
function showScreen(screenEl) {
  [introScreen, countdownScreen, gameScreen, resultScreen].forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  screenEl.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { screenEl.classList.add('active'); });
  });
}

// ─── Color computation ────────────────────────────────────────────
// Compute the mixed RGB from currently ON players
function computeMixColor(onIds) {
  if (onIds.length === 0) return { r: 18, g: 18, b: 18 }; // near-black

  // Average the RGB contributions of all ON players
  let rSum = 0, gSum = 0, bSum = 0;
  onIds.forEach(id => {
    const p = PLAYER_DEFS.find(p => p.id === id);
    if (p) { rSum += p.r; gSum += p.g; bSum += p.b; }
  });
  const n = onIds.length;
  return {
    r: Math.round(rSum / n),
    g: Math.round(gSum / n),
    b: Math.round(bSum / n)
  };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

// Compute target color from the needed player IDs for a round
function getRoundTargetColor(round) {
  return computeMixColor(round.need);
}

// Check if current toggle state matches the required pattern
function isMatchingRequired(round) {
  const need = new Set(round.need);
  const on   = new Set(
    activePlayers.filter(p => toggleState[p.id]).map(p => p.id)
  );
  // Must have exactly the needed set ON
  if (on.size !== need.size) return false;
  for (const id of need) {
    if (!on.has(id)) return false;
  }
  return true;
}

// ─── Build player grid ────────────────────────────────────────────
function buildPlayerGrid() {
  playerGrid.innerHTML = '';
  playerGrid.className = `player-grid p${playerCount}`;

  activePlayers.forEach(p => {
    toggleState[p.id] = false;

    const card = document.createElement('div');
    card.className = 'player-toggle-card';
    card.id = `card-${p.id}`;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${p.colorName} 토글`);
    card.style.borderColor = p.hex + '55';

    // Build inline SVG for the toggle circle
    card.innerHTML = `
      <div class="ptcard-label">${p.label}</div>
      <div class="ptcard-circle-wrap" style="position:relative;width:52px;height:52px;">
        <svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true">
          <defs>
            <radialGradient id="grad-${p.id}" cx="38%" cy="32%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.4)"/>
              <stop offset="100%" stop-color="rgba(0,0,0,0.2)"/>
            </radialGradient>
            <filter id="glow-${p.id}">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- OFF state: dim circle -->
          <circle id="circle-off-${p.id}" cx="26" cy="26" r="23"
            fill="${p.hex}" opacity="0.25" stroke="${p.hex}" stroke-width="2"/>
          <!-- ON state: bright circle with glow -->
          <circle id="circle-on-${p.id}" cx="26" cy="26" r="23"
            fill="${p.hex}" opacity="0" stroke="${p.hex}" stroke-width="2.5"
            filter="url(#glow-${p.id})"/>
          <!-- Highlight sheen -->
          <circle id="circle-sheen-${p.id}" cx="26" cy="26" r="23"
            fill="url(#grad-${p.id})" opacity="0"/>
          <!-- OFF icon: power line -->
          <line id="icon-off-${p.id}" x1="26" y1="16" x2="26" y2="28"
            stroke="${p.hex}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
          <circle id="icon-off-ring-${p.id}" cx="26" cy="27" r="8"
            fill="none" stroke="${p.hex}" stroke-width="3"
            stroke-dasharray="40 10" stroke-dashoffset="-5" opacity="0.4"/>
          <!-- ON icon: checkmark -->
          <polyline id="icon-on-${p.id}" points="18,26 24,32 34,20"
            fill="none" stroke="#fff" stroke-width="3.5"
            stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
        </svg>
      </div>
      <div class="ptcard-state" id="state-${p.id}">OFF</div>
      <div class="ptcard-color-name">${p.colorName}</div>
    `;

    onTap(card, (e) => {
      if (!isRoundActive) return;
      togglePlayer(p.id, card, e);
    });

    playerGrid.appendChild(card);
  });
}

function togglePlayer(id, card, e) {
  toggleState[id] = !toggleState[id];
  updateCardVisual(id, toggleState[id]);
  sound.play('toggle');

  // Ripple
  if (e && (e.touches || e.clientX !== undefined)) {
    const rect = card.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const ripple = document.createElement('div');
    ripple.className = 'ptcard-ripple';
    ripple.style.left = (x - 5) + 'px';
    ripple.style.top  = (y - 5) + 'px';
    card.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  }

  updateMixPreview();
}

function updateCardVisual(id, isOn) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return;

  const p = PLAYER_DEFS.find(p => p.id === id);

  // SVG elements
  const circleOff   = document.getElementById(`circle-off-${id}`);
  const circleOn    = document.getElementById(`circle-on-${id}`);
  const circleSheen = document.getElementById(`circle-sheen-${id}`);
  const iconOff     = document.getElementById(`icon-off-${id}`);
  const iconOffRing = document.getElementById(`icon-off-ring-${id}`);
  const iconOn      = document.getElementById(`icon-on-${id}`);
  const stateEl     = document.getElementById(`state-${id}`);

  if (isOn) {
    card.classList.add('on');
    card.style.borderColor = p.hex;
    card.style.boxShadow = `0 0 18px ${p.hex}88, inset 0 0 8px ${p.hex}33`;
    circleOff.setAttribute('opacity', '0');
    circleOn.setAttribute('opacity', '1');
    circleSheen.setAttribute('opacity', '0.6');
    iconOff.setAttribute('opacity', '0');
    iconOffRing.setAttribute('opacity', '0');
    iconOn.setAttribute('opacity', '1');
    stateEl.textContent = 'ON';
  } else {
    card.classList.remove('on');
    card.style.borderColor = p.hex + '55';
    card.style.boxShadow = '';
    circleOff.setAttribute('opacity', '0.25');
    circleOn.setAttribute('opacity', '0');
    circleSheen.setAttribute('opacity', '0');
    iconOff.setAttribute('opacity', '0.5');
    iconOffRing.setAttribute('opacity', '0.4');
    iconOn.setAttribute('opacity', '0');
    stateEl.textContent = 'OFF';
  }
}

// ─── Mix preview + match detection ────────────────────────────────
function updateMixPreview() {
  const onIds = activePlayers.filter(p => toggleState[p.id]).map(p => p.id);
  const mixed = computeMixColor(onIds);
  resultCircle.style.backgroundColor = rgbToHex(mixed);

  const round = rounds[currentRound];
  const matched = isMatchingRequired(round);

  matchIndicator.classList.toggle('visible', matched);
  matchFlash.classList.toggle('show', matched);

  if (matched) {
    if (!steadyStart) {
      steadyStart = Date.now();
      sound.play('match');
      startSteadyRing();
      matchTimeout = setTimeout(() => {
        if (isMatchingRequired(rounds[currentRound])) {
          advanceRound(true);
        }
      }, 1000);
    }
  } else {
    cancelSteady();
  }

  // Remove glow quickly
  if (!matched) {
    setTimeout(() => matchFlash.classList.remove('show'), 150);
  }
}

function cancelSteady() {
  steadyStart = null;
  if (matchTimeout) { clearTimeout(matchTimeout); matchTimeout = null; }
  steadyRing.classList.remove('visible', 'animating');
}

function startSteadyRing() {
  steadyRing.classList.remove('animating');
  steadyRing.classList.add('visible');
  void steadyRing.offsetWidth; // reflow
  steadyRing.classList.add('animating');
}

// ─── Round flow ───────────────────────────────────────────────────
function buildRounds() {
  // Filter rounds based on player count:
  // a round needs all its players to be present
  // We map player slots: p2=R,B; p3=R,B,Y; p4=R,B,Y,G
  const presentIds = activePlayers.map(p => p.id);

  let filtered = ALL_ROUNDS.filter(r => {
    // All needed IDs must be in present player list
    return r.need.every(id => presentIds.includes(id));
  });

  // If fewer than 10, cycle through
  const result = [];
  let i = 0;
  while (result.length < 10) {
    result.push(filtered[i % filtered.length]);
    i++;
  }
  return result;
}

function startRound() {
  if (currentRound >= rounds.length) {
    endGame(true);
    return;
  }

  isRoundActive = true;
  cancelSteady();

  const round = rounds[currentRound];
  roundBadge.textContent = `라운드 ${currentRound + 1} / 10`;

  // Set target color circle
  const targetColor = getRoundTargetColor(round);
  targetCircle.style.backgroundColor = rgbToHex(targetColor);
  targetName.textContent = round.name;

  // Reset result circle (all OFF)
  resultCircle.style.backgroundColor = '#121212';
  matchIndicator.classList.remove('visible');
  matchFlash.classList.remove('show');

  // Reset all toggles
  activePlayers.forEach(p => {
    toggleState[p.id] = false;
    updateCardVisual(p.id, false);
  });

  // Start timer
  let remaining = ROUND_DURATION;
  timerBarFill.style.width = '100%';
  timerBarFill.classList.remove('danger');
  timerText.textContent = `${remaining}초`;

  if (roundTimer) roundTimer.stop();
  roundTimer = createTimer(ROUND_DURATION,
    (rem) => {
      remaining = rem;
      timerBarFill.style.width = `${(rem / ROUND_DURATION) * 100}%`;
      timerText.textContent = `${rem}초`;
      if (rem <= 5) timerBarFill.classList.add('danger');
    },
    () => {
      // Time's up
      if (isRoundActive) {
        sound.play('fail');
        advanceRound(false);
      }
    }
  );
  roundTimer.start();
}

function advanceRound(success) {
  if (!isRoundActive) return;
  isRoundActive = false;
  cancelSteady();
  if (roundTimer) { roundTimer.stop(); roundTimer = null; }

  if (success) {
    roundSuccessCount++;
    sound.play('advance');

    // Flash the match glow
    matchFlash.classList.add('show');
    setTimeout(() => matchFlash.classList.remove('show'), 400);
  }

  currentRound++;
  if (currentRound >= rounds.length) {
    setTimeout(() => endGame(roundSuccessCount >= 8), 500);
  } else {
    setTimeout(() => startRound(), success ? 600 : 800);
  }
}

// ─── Game flow ────────────────────────────────────────────────────
function startCountdown(callback) {
  showScreen(countdownScreen);
  let count = 3;
  countdownNumber.textContent = count;

  const iv = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(iv);
      callback();
    } else {
      countdownNumber.textContent = count;
    }
  }, 1000);
}

function startGame() {
  activePlayers = PLAYER_DEFS.slice(0, playerCount);
  rounds = buildRounds();
  currentRound = 0;
  roundSuccessCount = 0;
  toggleState = {};

  buildPlayerGrid();

  startCountdown(() => {
    showScreen(gameScreen);
    startRound();
  });
}

function endGame(victory) {
  if (roundTimer) { roundTimer.stop(); roundTimer = null; }
  isRoundActive = false;

  setTimeout(() => {
    showScreen(resultScreen);

    if (victory) {
      resultEmoji.textContent = '🎉';
      resultHeadline.textContent = '완벽해요!';
      resultHeadline.className = 'result-headline success';
      resultDetail.textContent = `${roundSuccessCount}라운드 모두 성공!`;
      sound.play('fanfare');
      spawnConfetti();
    } else {
      resultEmoji.textContent = '😅';
      resultHeadline.textContent = '아쉬워요!';
      resultHeadline.className = 'result-headline fail';
      resultDetail.textContent = `${roundSuccessCount}라운드 성공했어요!`;
      sound.play('fail');
    }

    statRounds.textContent = `${roundSuccessCount} / 10`;
    statPlayers.textContent = `${playerCount}명`;
  }, 300);
}

// ─── Confetti ─────────────────────────────────────────────────────
function spawnConfetti() {
  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  const colors = ['#FF1744','#2979FF','#FFD600','#00E676','#FF4081','#00BCD4'];
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      position: absolute;
      left: ${Math.random() * 100}%;
      top: -10px;
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-delay: ${Math.random() * 1.5}s;
      animation-duration: ${1.8 + Math.random() * 1.2}s;
    `;
    container.appendChild(el);
  }
}

// ─── UI event wiring ──────────────────────────────────────────────
// Player count select
document.querySelectorAll('#playerSelect .player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('#playerSelect .player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// Sound toggle (intro)
const soundToggleIntro = document.getElementById('soundToggleIntro');
function updateSoundBtn() {
  soundToggleIntro.textContent = sound.isMuted() ? '🔇' : '🔊';
}
updateSoundBtn();
onTap(soundToggleIntro, () => { sound.toggleMute(); updateSoundBtn(); });

// Back button
onTap(document.getElementById('backBtn'), () => goHome());

// Play button
onTap(document.getElementById('playBtn'), () => {
  sound.unmute();
  updateSoundBtn();
  startGame();
});

// Close game button
onTap(document.getElementById('closeBtn'), () => {
  if (roundTimer) roundTimer.stop();
  isRoundActive = false;
  goHome();
});

// Retry
onTap(document.getElementById('retryBtn'), () => {
  showScreen(introScreen);
});

// Home
onTap(document.getElementById('homeBtn'), () => goHome());
