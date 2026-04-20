/* games/bomb-defuse/game.js */
'use strict';

// ─── Wire definitions ────────────────────────────────────────────────────────
const WIRES = [
  { id: 'red',    color: '#F44336', bg: 'rgba(244,67,54,0.2)',   border: 'rgba(244,67,54,0.7)',   nameKo: '빨강' },
  { id: 'blue',   color: '#2196F3', bg: 'rgba(33,150,243,0.2)',  border: 'rgba(33,150,243,0.7)',  nameKo: '파랑' },
  { id: 'green',  color: '#4CAF50', bg: 'rgba(76,175,80,0.2)',   border: 'rgba(76,175,80,0.7)',   nameKo: '초록' },
  { id: 'yellow', color: '#FFEB3B', bg: 'rgba(255,235,59,0.2)',  border: 'rgba(255,235,59,0.7)',  nameKo: '노랑' },
  { id: 'purple', color: '#9C27B0', bg: 'rgba(156,39,176,0.2)',  border: 'rgba(156,39,176,0.7)',  nameKo: '보라' },
  { id: 'orange', color: '#FF9800', bg: 'rgba(255,152,0,0.2)',   border: 'rgba(255,152,0,0.7)',   nameKo: '주황' },
  { id: 'pink',   color: '#E91E63', bg: 'rgba(233,30,99,0.2)',   border: 'rgba(233,30,99,0.7)',   nameKo: '분홍' },
  { id: 'cyan',   color: '#00BCD4', bg: 'rgba(0,188,212,0.2)',   border: 'rgba(0,188,212,0.7)',   nameKo: '청록' },
];

const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];
const PLAYER_ZONE_BG = [
  'rgba(255,82,82,0.07)',
  'rgba(64,196,255,0.07)',
  'rgba(105,240,174,0.07)',
  'rgba(255,215,64,0.07)',
];
const PLAYER_ZONE_BORDER = [
  'rgba(255,82,82,0.3)',
  'rgba(64,196,255,0.3)',
  'rgba(105,240,174,0.3)',
  'rgba(255,215,64,0.3)',
];

const GAME_DURATION   = 45;
const WRONG_PENALTY   = 5;    // seconds deducted per wrong wire
const MAX_MISTAKES    = 2;    // instant fail on 2nd wrong
const TOTAL_WIRES     = 8;

// ─── State ───────────────────────────────────────────────────────────────────
let playerCount   = 2;
let sequence      = [];    // wire IDs in cut order
let playerWires   = [];    // [playerIdx] -> [wireId, ...]
let currentStep   = 0;     // index into sequence
let timeRemaining = GAME_DURATION;
let gameActive    = false;
let mistakes      = 0;
let cutCount      = 0;
let gameTimer     = null;
let allTimeouts   = [];

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const introScreen     = document.getElementById('introScreen');
const countdownScreen = document.getElementById('countdownScreen');
const gameScreen      = document.getElementById('gameScreen');
const resultScreen    = document.getElementById('resultScreen');
const countdownNum    = document.getElementById('countdownNumber');
const codeSequenceEl  = document.getElementById('codeSequence');
const timerVal        = document.getElementById('timerVal');
const stepVal         = document.getElementById('stepVal');
const bombWrap        = document.getElementById('bombWrap');
const bombTimerText   = document.getElementById('bombTimerText');
const bombBody        = document.getElementById('bombBody');
const bombSuccess     = document.getElementById('bombSuccess');
const zonesGrid       = document.getElementById('zonesGrid');
const explosionOverlay= document.getElementById('explosionOverlay');
const wrongOverlay    = document.getElementById('wrongOverlay');
const resultEmoji     = document.getElementById('resultEmoji');
const resultHeadline  = document.getElementById('resultHeadline');
const resultDetail    = document.getElementById('resultDetail');
const statTime        = document.getElementById('statTime');
const statWires       = document.getElementById('statWires');
const statMistakes    = document.getElementById('statMistakes');

// ─── Sound Manager ───────────────────────────────────────────────────────────
const sfx = createSoundManager({

  snip(ctx) {
    // Satisfying wire-cut: sharp click + metallic ping
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.28, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);

    // Metallic ping
    const osc2 = ctx.createOscillator();
    const g2   = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2200, ctx.currentTime + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.18);
    g2.gain.setValueAtTime(0.15, ctx.currentTime + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.02);
    osc2.stop(ctx.currentTime + 0.22);
  },

  wrong(ctx) {
    // Error buzz + alarm beep
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2) * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    src.connect(g);
    g.connect(ctx.destination);
    src.start();

    // Alarm double-beep
    [0, 0.22].forEach(delay => {
      const osc = ctx.createOscillator();
      const og  = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 440;
      og.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
      osc.connect(og);
      og.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.18);
    });
  },

  tick(ctx) {
    // Urgent beep for last 10s
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  },

  explosion(ctx) {
    // Boom: noise burst + low thud
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    src.connect(lowpass);
    lowpass.connect(g);
    g.connect(ctx.destination);
    src.start();

    // Subsonic thud
    const osc = ctx.createOscillator();
    const og  = ctx.createGain();
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
    og.gain.setValueAtTime(0.7, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  },

  success(ctx) {
    // Triumphant relief — ascending arpeggio
    const notes = [261, 329, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    // Final sustained chord
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + notes.length * 0.09 + 0.05;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  },
});

// ─── Screen management ───────────────────────────────────────────────────────
function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  void el.offsetWidth;
  el.classList.add('active');
}

// ─── Intro ────────────────────────────────────────────────────────────────────
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

onTap(document.getElementById('playBtn'), () => startCountdown());

// ─── Countdown ────────────────────────────────────────────────────────────────
function startCountdown() {
  showScreen(countdownScreen);
  let n = 3;
  countdownNum.textContent = n;

  function tick() {
    n--;
    if (n <= 0) {
      countdownNum.textContent = 'GO!';
      const t = setTimeout(startGame, 700);
      allTimeouts.push(t);
    } else {
      countdownNum.textContent = n;
      const t = setTimeout(tick, 1000);
      allTimeouts.push(t);
    }
  }
  const t = setTimeout(tick, 1000);
  allTimeouts.push(t);
}

// ─── Wire / sequence setup ────────────────────────────────────────────────────
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSequenceAndDistribution() {
  // Pick 8 wires from the 8 available (all 8 used, possibly repeated if < 8)
  const wireIds = WIRES.map(w => w.id);
  sequence = shuffle(wireIds); // all 8, random order

  // Distribute wires to players
  // 2P: 4 each, 3P: 3,3,2 (or 3,2,3 etc), 4P: 2 each
  playerWires = Array.from({ length: playerCount }, () => []);

  if (playerCount === 2) {
    // Half each
    const half = TOTAL_WIRES / 2;
    const shuffled = shuffle(wireIds);
    playerWires[0] = shuffled.slice(0, half);
    playerWires[1] = shuffled.slice(half);
  } else if (playerCount === 3) {
    const shuffled = shuffle(wireIds);
    playerWires[0] = shuffled.slice(0, 3);
    playerWires[1] = shuffled.slice(3, 6);
    playerWires[2] = shuffled.slice(6, 8);
  } else {
    // 4P: 2 each
    const shuffled = shuffle(wireIds);
    for (let p = 0; p < 4; p++) {
      playerWires[p] = shuffled.slice(p * 2, p * 2 + 2);
    }
  }
}

// ─── Game start ───────────────────────────────────────────────────────────────
function startGame() {
  // Reset state
  currentStep   = 0;
  timeRemaining = GAME_DURATION;
  gameActive    = true;
  mistakes      = 0;
  cutCount      = 0;

  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];

  buildSequenceAndDistribution();
  buildCodeSequence();
  buildZones();

  // Reset bomb visuals
  bombBody.setAttribute('fill', '#2a2a2a');
  bombSuccess.style.display = 'none';
  bombWrap.classList.remove('explode');
  bombTimerText.setAttribute('fill', '#FF1744');
  updateBombTimer(GAME_DURATION);
  updateTimerUI(GAME_DURATION);
  updateStepUI();

  showScreen(gameScreen);

  // Start countdown timer
  gameTimer = createTimer(
    GAME_DURATION,
    (rem) => {
      timeRemaining = rem;
      updateTimerUI(rem);
      updateBombTimer(rem);
      if (rem <= 10) sfx.play('tick');
    },
    () => {
      if (gameActive) endGame(false, 'timeout');
    }
  );
  gameTimer.start();
}

// ─── Code sequence display ────────────────────────────────────────────────────
function buildCodeSequence() {
  codeSequenceEl.innerHTML = '';
  sequence.forEach((wireId, idx) => {
    const wire = WIRES.find(w => w.id === wireId);

    if (idx > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'seq-arrow';
      arrow.textContent = '→';
      codeSequenceEl.appendChild(arrow);
    }

    const dot = document.createElement('div');
    dot.className = 'seq-dot' + (idx === 0 ? ' current' : '');
    dot.id = 'seqDot' + idx;
    dot.style.background = wire.color;
    dot.title = wire.nameKo;
    codeSequenceEl.appendChild(dot);
  });

  // Scroll to show current dot
  scrollToCurrent();
}

function updateCodeSequence() {
  // Mark done
  for (let i = 0; i < currentStep; i++) {
    const dot = document.getElementById('seqDot' + i);
    if (dot) {
      dot.classList.remove('current');
      dot.classList.add('done');
    }
  }
  // Mark current
  if (currentStep < sequence.length) {
    const dot = document.getElementById('seqDot' + currentStep);
    if (dot) {
      dot.classList.remove('done');
      dot.classList.add('current');
    }
  }
  scrollToCurrent();
}

function scrollToCurrent() {
  const dot = document.getElementById('seqDot' + currentStep);
  if (dot) dot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// ─── Player zones ──────────────────────────────────────────────────────────────
function buildZones() {
  zonesGrid.innerHTML = '';
  zonesGrid.className = 'zones-grid p' + playerCount;

  for (let p = 0; p < playerCount; p++) {
    const zone = document.createElement('div');
    zone.className = 'player-zone';
    zone.style.background = PLAYER_ZONE_BG[p];
    zone.style.borderColor = PLAYER_ZONE_BORDER[p];

    const label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = PLAYER_LABELS[p];
    zone.appendChild(label);

    const wireList = document.createElement('div');
    wireList.className = 'wire-list';

    playerWires[p].forEach(wireId => {
      const wire = WIRES.find(w => w.id === wireId);
      const btn  = buildWireBtn(wire, p);
      wireList.appendChild(btn);
    });

    zone.appendChild(wireList);
    zonesGrid.appendChild(zone);
  }
}

function buildWireBtn(wire, playerIdx) {
  const btn = document.createElement('button');
  btn.className = 'wire-btn';
  btn.id = 'wireBtn-' + wire.id;
  btn.style.background = wire.bg;
  btn.style.borderColor = wire.border;
  btn.dataset.wireId = wire.id;
  btn.dataset.player = playerIdx;

  btn.innerHTML = `
    <div class="wire-graphic">
      ${buildWireSvg(wire.color)}
    </div>
    <span class="wire-name-ko">${wire.nameKo}</span>
    <span class="wire-cut-label">자르기</span>
    <span class="wire-cut-x">✂️</span>
  `;

  onTap(btn, () => handleWireCut(wire.id, btn));
  return btn;
}

function buildWireSvg(color) {
  return `<svg viewBox="0 0 32 28" width="32" height="28" aria-hidden="true">
    <line x1="2" y1="14" x2="30" y2="14" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="2"  cy="14" r="4" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
    <circle cx="30" cy="14" r="4" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
    <circle cx="16" cy="14" r="3" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}

// ─── Wire cut logic ───────────────────────────────────────────────────────────
function handleWireCut(wireId, btnEl) {
  if (!gameActive) return;

  const expectedId = sequence[currentStep];

  if (wireId === expectedId) {
    // Correct!
    sfx.play('snip');
    cutCount++;

    // Animate wire as cut
    btnEl.classList.add('cut', 'correct-flash');

    // Draw cut SVG on top
    const svg = btnEl.querySelector('svg');
    if (svg) {
      // Add a cut line through the wire
      const cutLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cutLine.setAttribute('x1', '10'); cutLine.setAttribute('y1', '2');
      cutLine.setAttribute('x2', '22'); cutLine.setAttribute('y2', '26');
      cutLine.setAttribute('stroke', 'rgba(255,255,255,0.85)');
      cutLine.setAttribute('stroke-width', '2.5');
      cutLine.setAttribute('stroke-linecap', 'round');
      svg.appendChild(cutLine);
    }

    currentStep++;
    updateCodeSequence();
    updateStepUI();

    if (currentStep >= sequence.length) {
      // All wires cut!
      const t = setTimeout(() => endGame(true), 300);
      allTimeouts.push(t);
    }
  } else {
    // Wrong wire!
    mistakes++;
    sfx.play('wrong');

    // Red flash on button
    btnEl.classList.add('wrong-flash');
    const t1 = setTimeout(() => btnEl.classList.remove('wrong-flash'), 450);
    allTimeouts.push(t1);

    // Wrong overlay flash
    wrongOverlay.classList.add('flash');
    const t2 = setTimeout(() => wrongOverlay.classList.remove('flash'), 380);
    allTimeouts.push(t2);

    // -5 sec penalty
    applyTimePenalty();

    // Penalty float
    spawnPenaltyFloat();

    // Check instant fail (2 mistakes)
    if (mistakes >= MAX_MISTAKES) {
      const t3 = setTimeout(() => endGame(false, 'mistakes'), 400);
      allTimeouts.push(t3);
    }
  }
}

function applyTimePenalty() {
  if (!gameTimer) return;
  // Deduct 5 seconds by stopping, adjusting remaining, restarting
  gameTimer.pause();
  timeRemaining = Math.max(0, timeRemaining - WRONG_PENALTY);
  updateTimerUI(timeRemaining);
  updateBombTimer(timeRemaining);

  if (timeRemaining <= 0) {
    endGame(false, 'timeout');
    return;
  }

  // Restart timer with new remaining
  gameTimer = createTimer(
    timeRemaining,
    (rem) => {
      timeRemaining = rem;
      updateTimerUI(rem);
      updateBombTimer(rem);
      if (rem <= 10) sfx.play('tick');
    },
    () => {
      if (gameActive) endGame(false, 'timeout');
    }
  );
  gameTimer.start();
}

function spawnPenaltyFloat() {
  const el = document.createElement('div');
  el.className = 'penalty-float';
  el.textContent = '-5초!';
  document.body.appendChild(el);
  const t = setTimeout(() => el.remove(), 1000);
  allTimeouts.push(t);
}

// ─── UI updates ───────────────────────────────────────────────────────────────
function updateTimerUI(rem) {
  timerVal.textContent = rem;
  if (rem <= 10) {
    timerVal.classList.add('danger');
    bombTimerText.setAttribute('fill', '#FF1744');
  } else {
    timerVal.classList.remove('danger');
    bombTimerText.setAttribute('fill', '#FF1744');
  }
  // Timer danger color ramp
  if (rem <= 5) {
    bombBody.setAttribute('fill', '#4a0000');
  } else if (rem <= 15) {
    bombBody.setAttribute('fill', '#3a1010');
  } else {
    bombBody.setAttribute('fill', '#2a2a2a');
  }
}

function updateBombTimer(rem) {
  bombTimerText.textContent = rem < 10 ? '0' + rem : rem;
}

function updateStepUI() {
  stepVal.textContent = Math.min(currentStep + 1, TOTAL_WIRES) + ' / ' + TOTAL_WIRES;
}

// ─── Game end ─────────────────────────────────────────────────────────────────
function endGame(success, reason) {
  gameActive = false;
  if (gameTimer) { gameTimer.pause(); gameTimer = null; }
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];

  if (success) {
    sfx.play('success');

    // Show bomb success state
    bombSuccess.style.display = 'block';

    // Remove fuse spark
    document.getElementById('sparkOuter').style.display = 'none';
    document.getElementById('sparkInner').style.display = 'none';

    const t = setTimeout(() => {
      resultEmoji.textContent = '🎉';
      resultHeadline.textContent = '해체 성공!';
      resultHeadline.className = 'result-headline success';
      resultDetail.textContent = '모든 선을 성공적으로 잘랐어요!';
      statTime.textContent = timeRemaining + '초 남음';
      statWires.textContent = cutCount + ' / ' + TOTAL_WIRES + '개';
      statMistakes.textContent = mistakes + '번';
      spawnConfetti();
      showScreen(resultScreen);
    }, 600);
    allTimeouts.push(t);

  } else {
    sfx.play('explosion');

    // Explode bomb visual
    bombWrap.classList.add('explode');
    bombBody.setAttribute('fill', '#FF1744');
    bombTimerText.textContent = '00';

    // Explosion overlay
    explosionOverlay.classList.add('bang');
    const t1 = setTimeout(() => explosionOverlay.classList.remove('bang'), 750);
    allTimeouts.push(t1);

    // Shake the whole screen briefly
    document.body.style.animation = 'none';
    gameScreen.style.animation = 'screenShake 0.6s ease';
    const t2 = setTimeout(() => { gameScreen.style.animation = ''; }, 650);
    allTimeouts.push(t2);

    const t3 = setTimeout(() => {
      const reasonText = reason === 'mistakes'
        ? `오답 ${mistakes}번으로 즉시 폭발!`
        : '시간 초과로 폭발!';

      resultEmoji.textContent = '💥';
      resultHeadline.textContent = '폭발!!';
      resultHeadline.className = 'result-headline fail';
      resultDetail.textContent = reasonText;
      statTime.textContent = timeRemaining + '초';
      statWires.textContent = cutCount + ' / ' + TOTAL_WIRES + '개';
      statMistakes.textContent = mistakes + '번';
      showScreen(resultScreen);
    }, 900);
    allTimeouts.push(t3);
  }
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#F44336','#2196F3','#4CAF50','#FFEB3B','#9C27B0','#FF9800','#E91E63','#00BCD4'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -10px;
      width: ${5 + Math.random() * 7}px;
      height: ${5 + Math.random() * 7}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall ${1.5 + Math.random() * 1.5}s ease-in ${Math.random() * 0.6}s forwards;
      z-index: 999;
      pointer-events: none;
    `;
    document.body.appendChild(el);
    const t = setTimeout(() => el.remove(), 3200);
    allTimeouts.push(t);
  }
}

// ─── Result actions ───────────────────────────────────────────────────────────
onTap(document.getElementById('retryBtn'), () => {
  explosionOverlay.classList.remove('bang');
  wrongOverlay.classList.remove('flash');
  startCountdown();
});

onTap(document.getElementById('homeBtn'), () => {
  if (gameTimer) gameTimer.pause();
  allTimeouts.forEach(clearTimeout);
  goHome();
});

onTap(document.getElementById('closeBtn'), () => {
  if (gameTimer) gameTimer.pause();
  allTimeouts.forEach(clearTimeout);
  goHome();
});

// ─── Inject keyframes ────────────────────────────────────────────────────────
(function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confettiFall {
      0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
    @keyframes screenShake {
      0%   { transform: translate(0,0); }
      10%  { transform: translate(-8px, -4px); }
      20%  { transform: translate(8px, 4px); }
      30%  { transform: translate(-7px, 5px); }
      40%  { transform: translate(7px, -3px); }
      50%  { transform: translate(-5px, 3px); }
      65%  { transform: translate(4px, -2px); }
      80%  { transform: translate(-2px, 1px); }
      100% { transform: translate(0, 0); }
    }
  `;
  document.head.appendChild(style);
})();
