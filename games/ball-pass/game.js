/* games/ball-pass/game.js */
'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_PASSES = 30;

// Time limits per phase (ms)
function getTimeLimit(passes) {
  if (passes <= 10)  return 2000;   // passes 1-10:  2s
  if (passes <= 20)  return 1500;   // passes 11-20: 1.5s
  return 1000;                       // passes 21-30: 1s
}

function getSpeedLabel(passes) {
  if (passes <= 10)  return '보통 (2초)';
  if (passes <= 20)  return '빠름 (1.5초)';
  return '매우 빠름 (1초)';
}

// Player config
const PLAYER_CFG = [
  { color: '#E53935', bg: 'rgba(229,57,53,0.22)',  label: 'P1' },
  { color: '#1E88E5', bg: 'rgba(30,136,229,0.22)', label: 'P2' },
  { color: '#8E24AA', bg: 'rgba(142,36,170,0.22)', label: 'P3' },
  { color: '#F9A825', bg: 'rgba(249,168,37,0.22)', label: 'P4' },
];

// Ball SVG (inline, reused per zone)
function ballSVG(size) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="공">
    <circle cx="50" cy="52" r="40" fill="#E65100"/>
    <circle cx="50" cy="50" r="40" fill="#FF9800"/>
    <path d="M50 10 Q30 50 50 90" fill="none" stroke="#E65100" stroke-width="2"/>
    <path d="M50 10 Q70 50 50 90" fill="none" stroke="#E65100" stroke-width="2"/>
    <path d="M10 50 L90 50" stroke="#E65100" stroke-width="2"/>
    <ellipse cx="35" cy="35" rx="12" ry="8" fill="rgba(255,255,255,0.35)"/>
  </svg>`;
}

// ─── State ───────────────────────────────────────────────────────────────────
let playerCount     = 2;
let passCount       = 0;
let currentPlayer   = -1;
let prevPlayer      = -1;
let gameActive      = false;
let timerRaf        = null;   // requestAnimationFrame id
let roundStart      = 0;      // timestamp when current round began
let roundLimit      = 2000;   // ms for this round
let allTimeouts     = [];

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const introScreen     = document.getElementById('introScreen');
const countdownScreen = document.getElementById('countdownScreen');
const gameScreen      = document.getElementById('gameScreen');
const resultScreen    = document.getElementById('resultScreen');
const countdownNum    = document.getElementById('countdownNumber');
const zonesGrid       = document.getElementById('zonesGrid');
const passVal         = document.getElementById('passVal');
const hudProgressFill = document.getElementById('hudProgressFill');
const resultEmoji     = document.getElementById('resultEmoji');
const resultHeadline  = document.getElementById('resultHeadline');
const resultDetail    = document.getElementById('resultDetail');
const statPasses      = document.getElementById('statPasses');
const statPlayers     = document.getElementById('statPlayers');
const statSpeed       = document.getElementById('statSpeed');

// ─── Sound Manager ────────────────────────────────────────────────────────────
const sfx = createSoundManager({
  // soft thud when ball lands
  land(ctx) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5) * 0.6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    src.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    src.start();
  },

  // satisfying "catch" pop
  catch(ctx) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  },

  // urgent beep (last 0.5s)
  tick(ctx) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  },

  // sad descending fail
  fail(ctx) {
    const notes = [450, 360, 280, 200];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.2;
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  },

  // triumphant fanfare
  success(ctx) {
    const melody = [523, 659, 784, 659, 784, 1047];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }
});

// ─── Screen helper ────────────────────────────────────────────────────────────
function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  void el.offsetWidth; // reflow
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

document.getElementById('backBtn').addEventListener('click', function() {
  if (timerRaf) cancelAnimationFrame(timerRaf);
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];
  goHome();
});

const soundToggleIntro = document.getElementById('soundToggleIntro');
soundToggleIntro.addEventListener('click', () => {
  const muted = sfx.toggleMute();
  soundToggleIntro.textContent = muted ? '🔇' : '🔊';
});
soundToggleIntro.textContent = sfx.isMuted() ? '🔇' : '🔊';

onTap(document.getElementById('playBtn'), () => {
  startCountdown();
});

// ─── Countdown ────────────────────────────────────────────────────────────────
function startCountdown() {
  showScreen(countdownScreen);
  let n = 3;
  countdownNum.textContent = n;

  function tick() {
    n--;
    if (n <= 0) {
      countdownNum.textContent = 'GO!';
      const t = setTimeout(() => startGame(), 700);
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

// ─── Game setup ───────────────────────────────────────────────────────────────
function startGame() {
  passCount   = 0;
  currentPlayer = -1;
  prevPlayer    = -1;
  gameActive  = true;

  buildZones();
  updateHUD();
  showScreen(gameScreen);

  // Short delay then launch first ball
  const t = setTimeout(() => serveBall(), 300);
  allTimeouts.push(t);
}

// ─── Build zones ──────────────────────────────────────────────────────────────
function buildZones() {
  zonesGrid.innerHTML = '';
  zonesGrid.className = 'zones-grid p' + playerCount;

  const ballSize = playerCount === 4 ? 60 : 80;

  for (let i = 0; i < playerCount; i++) {
    const cfg = PLAYER_CFG[i];
    const zone = document.createElement('div');
    zone.className = 'player-zone waiting';
    zone.style.background = cfg.bg;
    zone.style.borderColor = cfg.color + '44';
    zone.dataset.player = i;

    zone.innerHTML = `
      <span class="zone-label">${cfg.label}</span>
      <div class="zone-ball-wrap">
        <div class="ball-svg" id="ball-${i}">
          ${ballSVG(ballSize)}
        </div>
      </div>
      <span class="tap-indicator">탭!</span>
      <div class="zone-timer-bar-wrap">
        <div class="zone-timer-bar" id="timerBar-${i}"></div>
      </div>
    `;

    onTap(zone, (e) => {
      if (!gameActive) return;
      if (parseInt(zone.dataset.player, 10) !== currentPlayer) return;
      handleCatch(e, zone);
    });

    zonesGrid.appendChild(zone);
  }
}

// ─── Pick next player (not same as current) ───────────────────────────────────
function pickNextPlayer() {
  if (playerCount === 1) return 0;
  let next;
  do {
    next = Math.floor(Math.random() * playerCount);
  } while (next === currentPlayer);
  return next;
}

// ─── Serve ball to a player ───────────────────────────────────────────────────
function serveBall() {
  if (!gameActive) return;

  const next = pickNextPlayer();
  prevPlayer  = currentPlayer;
  currentPlayer = next;
  roundLimit  = getTimeLimit(passCount + 1);
  roundStart  = performance.now();

  // Update zone states
  for (let i = 0; i < playerCount; i++) {
    const zone = zonesGrid.children[i];
    zone.classList.remove('active-zone', 'waiting');
    zone.classList.add(i === currentPlayer ? 'active-zone' : 'waiting');
  }

  // Animate ball in
  const ballEl = document.getElementById('ball-' + currentPlayer);
  ballEl.classList.remove('ball-visible', 'ball-hidden');
  void ballEl.offsetWidth;
  ballEl.classList.add('ball-visible');

  // Reset timer bar
  const bar = document.getElementById('timerBar-' + currentPlayer);
  bar.style.transition = 'none';
  bar.style.width = '100%';
  bar.classList.remove('urgent');

  sfx.play('land');

  // Start RAF-based timer
  if (timerRaf) cancelAnimationFrame(timerRaf);
  let tickedUrgent = false;

  function timerLoop(now) {
    if (!gameActive) return;
    const elapsed = now - roundStart;
    const remaining = roundLimit - elapsed;
    const pct = Math.max(0, remaining / roundLimit);

    bar.style.transition = 'none';
    bar.style.width = (pct * 100) + '%';

    // Urgent (last 0.5s)
    if (remaining <= 500 && !bar.classList.contains('urgent')) {
      bar.classList.add('urgent');
    }

    // Tick sound once at ~0.5s remaining
    if (remaining <= 500 && !tickedUrgent) {
      tickedUrgent = true;
      sfx.play('tick');
    }

    if (remaining <= 0) {
      // Miss — game over
      bar.style.width = '0%';
      endGame(false);
      return;
    }

    timerRaf = requestAnimationFrame(timerLoop);
  }

  timerRaf = requestAnimationFrame(timerLoop);
}

// ─── Handle catch ─────────────────────────────────────────────────────────────
function handleCatch(e, zoneEl) {
  if (timerRaf) {
    cancelAnimationFrame(timerRaf);
    timerRaf = null;
  }

  sfx.play('catch');

  // Ripple
  const rect = zoneEl.getBoundingClientRect();
  let x, y;
  if (e.touches && e.touches[0]) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    x = (e.clientX || rect.width / 2) - rect.left;
    y = (e.clientY || rect.height / 2) - rect.top;
  }
  const ripple = document.createElement('div');
  ripple.className = 'zone-ripple';
  ripple.style.left = (x - 5) + 'px';
  ripple.style.top  = (y - 5) + 'px';
  zoneEl.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);

  // Hide ball
  const ballEl = document.getElementById('ball-' + currentPlayer);
  ballEl.classList.remove('ball-visible');
  ballEl.classList.add('ball-hidden');

  passCount++;
  updateHUD();

  if (passCount >= TOTAL_PASSES) {
    endGame(true);
    return;
  }

  // Brief pause then serve next
  const t = setTimeout(() => serveBall(), 350);
  allTimeouts.push(t);
}

// ─── HUD update ───────────────────────────────────────────────────────────────
function updateHUD() {
  passVal.textContent = passCount;
  const pct = (passCount / TOTAL_PASSES) * 100;
  hudProgressFill.style.width = pct + '%';
}

// ─── Game end ─────────────────────────────────────────────────────────────────
function endGame(success) {
  gameActive = false;

  if (timerRaf) {
    cancelAnimationFrame(timerRaf);
    timerRaf = null;
  }
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];

  // Mark all zones as waiting
  for (let i = 0; i < playerCount; i++) {
    const zone = zonesGrid.children[i];
    if (zone) {
      zone.classList.remove('active-zone');
      zone.classList.add('waiting');
    }
    const ballEl = document.getElementById('ball-' + i);
    if (ballEl) {
      ballEl.classList.remove('ball-visible');
      ballEl.classList.add('ball-hidden');
    }
  }

  const speedLabel = getSpeedLabel(passCount);

  if (success) {
    sfx.play('success');
    resultEmoji.textContent    = '🎉';
    resultHeadline.textContent = '30번 전달 성공!';
    resultHeadline.className   = 'result-headline success';
    resultDetail.textContent   = '모두 힘을 합쳐 해냈어요!';
    spawnConfetti();
  } else {
    sfx.play('fail');
    resultEmoji.textContent    = '😢';
    resultHeadline.textContent = '아쉽게 실패!';
    resultHeadline.className   = 'result-headline fail';
    resultDetail.textContent   = `${passCount}번 전달 후 시간 초과`;
  }

  statPasses.textContent  = passCount + ' / ' + TOTAL_PASSES + '번';
  statPlayers.textContent = playerCount + '명';
  statSpeed.textContent   = speedLabel;

  const t = setTimeout(() => showScreen(resultScreen), 450);
  allTimeouts.push(t);
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#FF9800','#FFD54F','#FF5252','#40C4FF','#69F0AE','#CE93D8'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -12px;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall ${1.6 + Math.random() * 1.6}s ease-in ${Math.random() * 0.9}s forwards;
      z-index: 999;
      pointer-events: none;
      opacity: 0.85;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

// ─── Result actions ────────────────────────────────────────────────────────────
onTap(document.getElementById('retryBtn'), () => {
  startCountdown();
});

onTap(document.getElementById('homeBtn'), () => {
  goHome();
});

onTap(document.getElementById('closeBtn'), () => {
  if (timerRaf) cancelAnimationFrame(timerRaf);
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];
  goHome();
});

// ─── Inject confetti keyframe ──────────────────────────────────────────────────
(function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confettiFall {
      0%   { transform: translateY(0) rotate(0deg);   opacity: 0.9; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
})();
