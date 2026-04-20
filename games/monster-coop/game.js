/* games/monster-coop/game.js */
'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const GAME_DURATION = 60;          // seconds
const COMBO_WINDOW  = 1500;        // ms — break window
const COMBO_MAX     = 5;           // max multiplier
// Combo thresholds: hit these consecutive taps to reach multiplier level
const COMBO_THRESH  = [0, 5, 15, 30, 50]; // index = multiplier-1

// Player colours and labels
const PLAYER_CFG = [
  { color: '#FF5252', bg: 'rgba(255,82,82,0.18)',  label: 'P1', icon: '🗡️' },
  { color: '#40C4FF', bg: 'rgba(64,196,255,0.18)', label: 'P2', icon: '🔥' },
  { color: '#69F0AE', bg: 'rgba(105,240,174,0.18)',label: 'P3', icon: '⚡' },
  { color: '#FFD740', bg: 'rgba(255,215,64,0.18)', label: 'P4', icon: '💥' },
];

// Monster body colours based on HP %
const MONSTER_COLORS = [
  { pct: 1.0, body: '#7C4DFF', arms: '#7C4DFF' },   // full HP — purple
  { pct: 0.6, body: '#C62828', arms: '#C62828' },   // 60% — dark red
  { pct: 0.3, body: '#B71C1C', arms: '#B71C1C' },   // 30% — deeper red
  { pct: 0.0, body: '#4A0000', arms: '#4A0000' },   // near death — black-red
];

// ─── State ───────────────────────────────────────────────────────────────────
let playerCount   = 2;
let maxHP         = 400;
let currentHP     = 400;
let combo         = 0;
let maxCombo      = 0;
let totalTaps     = 0;
let timeRemaining = GAME_DURATION;
let gameActive    = false;
let comboTimeout  = null;
let gameTimer     = null;
let allTimeouts   = [];   // for cleanup

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const introScreen     = document.getElementById('introScreen');
const countdownScreen = document.getElementById('countdownScreen');
const gameScreen      = document.getElementById('gameScreen');
const resultScreen    = document.getElementById('resultScreen');
const countdownNum    = document.getElementById('countdownNumber');
const hpBarFill       = document.getElementById('hpBarFill');
const hpNumbers       = document.getElementById('hpNumbers');
const timerVal        = document.getElementById('timerVal');
const comboBox        = document.getElementById('comboBox');
const comboValEl      = document.getElementById('comboVal');
const comboMultEl     = document.getElementById('comboMult');
const comboFlash      = document.getElementById('comboFlash');
const monsterWrap     = document.getElementById('monsterWrap');
const monsterBody     = document.getElementById('monsterBody');
const armL            = document.getElementById('armL');
const armR            = document.getElementById('armR');
const monsterArea     = document.getElementById('monsterArea');
const zonesGrid       = document.getElementById('zonesGrid');
const resultEmoji     = document.getElementById('resultEmoji');
const resultHeadline  = document.getElementById('resultHeadline');
const resultDetail    = document.getElementById('resultDetail');
const statTime        = document.getElementById('statTime');
const statCombo       = document.getElementById('statCombo');
const statTaps        = document.getElementById('statTaps');

// ─── Sound Manager ───────────────────────────────────────────────────────────
const sfx = createSoundManager({
  attack(ctx) {
    // punchy thud
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start();

    // add a click transient
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
    og.gain.setValueAtTime(0.4, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  },

  combo(ctx) {
    // ascending tone based on combo level
    const mult = getMultiplier();
    const freqs = [523, 659, 784, 988, 1175]; // C5 D5 G5 B5 D6
    const freq = freqs[Math.min(mult - 1, freqs.length - 1)];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.05, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  },

  victory(ctx) {
    // triumphant fanfare — chord arpeggio
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  },

  defeat(ctx) {
    // descending sad tones
    const notes = [400, 330, 260, 200];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }
});

// ─── Screens ─────────────────────────────────────────────────────────────────
function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // force reflow so transition fires
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
  // Reset state
  maxHP         = 200 * playerCount;
  currentHP     = maxHP;
  combo         = 0;
  maxCombo      = 0;
  totalTaps     = 0;
  timeRemaining = GAME_DURATION;
  gameActive    = true;
  comboTimeout  = null;

  // Build zones
  buildZones();

  // Reset UI
  updateHpBar();
  updateComboUI();
  updateTimerUI(GAME_DURATION);
  resetMonsterColor();
  comboFlash.classList.remove('show');
  comboBox.classList.remove('active');

  showScreen(gameScreen);

  // Start timer
  gameTimer = createTimer(
    GAME_DURATION,
    (rem) => {
      timeRemaining = rem;
      updateTimerUI(rem);
    },
    () => {
      endGame(false);
    }
  );
  gameTimer.start();
}

function buildZones() {
  zonesGrid.innerHTML = '';
  zonesGrid.className = 'zones-grid p' + playerCount;

  for (let i = 0; i < playerCount; i++) {
    const cfg = PLAYER_CFG[i];
    const zone = document.createElement('div');
    zone.className = 'player-zone';
    zone.style.background = cfg.bg;
    zone.style.borderColor = cfg.color + '55';
    zone.dataset.player = i;

    zone.innerHTML = `
      <span class="zone-label">${cfg.label}</span>
      <div class="zone-attack-btn" style="background:${cfg.color}22; border-color:${cfg.color}88;">
        <span style="font-size:1.5rem;">${cfg.icon}</span>
      </div>
    `;

    onTap(zone, (e) => {
      if (!gameActive) return;
      handleAttack(i, e, zone);
    });

    zonesGrid.appendChild(zone);
  }
}

// ─── Attack / Combo logic ─────────────────────────────────────────────────────
function getMultiplier() {
  // Multiplier 1-5 based on combo count
  for (let m = COMBO_MAX; m >= 2; m--) {
    if (combo >= COMBO_THRESH[m - 1]) return m;
  }
  return 1;
}

function handleAttack(playerIdx, e, zoneEl) {
  // Increment combo
  combo++;
  if (combo > maxCombo) maxCombo = combo;
  totalTaps++;

  // Clear existing combo break timer
  if (comboTimeout) clearTimeout(comboTimeout);

  // Calculate damage
  const mult = getMultiplier();
  const damage = mult;

  // Apply damage
  currentHP = Math.max(0, currentHP - damage);
  updateHpBar();
  updateMonsterColor();

  // Sounds
  sfx.play('attack');
  if (mult >= 2) sfx.play('combo');

  // Monster hit animation
  triggerMonsterHit();

  // Damage float
  spawnDamageFloat(damage, mult >= 2);

  // Zone ripple + tap flash
  triggerZoneRipple(e, zoneEl);
  zoneEl.classList.add('tapped');
  setTimeout(() => zoneEl.classList.remove('tapped'), 150);

  // Combo UI
  updateComboUI();

  // Combo flash tint
  if (mult >= 2) {
    comboFlash.classList.add('show');
    setTimeout(() => comboFlash.classList.remove('show'), 120);
  }

  // Schedule combo break
  comboTimeout = setTimeout(() => {
    combo = 0;
    updateComboUI();
  }, COMBO_WINDOW);

  // Check victory
  if (currentHP <= 0) {
    // Cancel pending combo timeout
    clearTimeout(comboTimeout);
    endGame(true);
  }
}

// ─── UI Updates ───────────────────────────────────────────────────────────────
function updateHpBar() {
  const pct = currentHP / maxHP;
  hpBarFill.style.width = (pct * 100) + '%';
  hpNumbers.textContent = currentHP + ' / ' + maxHP;
}

function updateComboUI() {
  comboValEl.textContent = combo;
  const mult = getMultiplier();
  if (mult >= 2) {
    comboMultEl.textContent = 'x' + mult;
    comboBox.classList.add('active');
  } else {
    comboMultEl.textContent = '';
    comboBox.classList.remove('active');
  }
}

function updateTimerUI(rem) {
  timerVal.textContent = rem;
  if (rem <= 10) {
    timerVal.classList.add('danger');
  } else {
    timerVal.classList.remove('danger');
  }
}

function resetMonsterColor() {
  monsterBody.setAttribute('fill', '#7C4DFF');
  armL.setAttribute('fill', '#7C4DFF');
  armR.setAttribute('fill', '#7C4DFF');
}

function updateMonsterColor() {
  const pct = currentHP / maxHP;
  // Find applicable color
  let chosen = MONSTER_COLORS[0];
  for (const c of MONSTER_COLORS) {
    if (pct <= c.pct) chosen = c;
  }
  monsterBody.setAttribute('fill', chosen.body);
  armL.setAttribute('fill', chosen.arms);
  armR.setAttribute('fill', chosen.arms);
}

// ─── Monster hit animation ────────────────────────────────────────────────────
let hitFlashTimeout = null;
function triggerMonsterHit() {
  // Flash red
  monsterBody.setAttribute('fill', '#FF1744');
  armL.setAttribute('fill', '#FF1744');
  armR.setAttribute('fill', '#FF1744');
  monsterWrap.classList.add('hit');

  clearTimeout(hitFlashTimeout);
  hitFlashTimeout = setTimeout(() => {
    monsterWrap.classList.remove('hit');
    updateMonsterColor();
  }, 350);
}

// ─── Damage float ─────────────────────────────────────────────────────────────
function spawnDamageFloat(damage, isCombo) {
  const el = document.createElement('div');
  el.className = 'damage-float' + (isCombo ? ' combo' : '');
  el.textContent = '-' + damage;

  // Random position within monster area
  const areaRect = monsterArea.getBoundingClientRect();
  const left = 30 + Math.random() * 140;
  const top  = 20 + Math.random() * 60;

  el.style.left = left + 'px';
  el.style.top  = top + 'px';
  monsterArea.style.position = 'relative';
  monsterArea.appendChild(el);

  setTimeout(() => el.remove(), 900);
}

// ─── Zone ripple ──────────────────────────────────────────────────────────────
function triggerZoneRipple(e, zoneEl) {
  const rect = zoneEl.getBoundingClientRect();
  let x, y;
  if (e.touches && e.touches[0]) {
    x = e.touches[0].clientX - rect.left;
    y = e.touches[0].clientY - rect.top;
  } else {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }
  const ripple = document.createElement('div');
  ripple.className = 'zone-ripple';
  ripple.style.left = (x - 5) + 'px';
  ripple.style.top  = (y - 5) + 'px';
  zoneEl.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

// ─── Game end ─────────────────────────────────────────────────────────────────
function endGame(success) {
  gameActive = false;

  // Stop timer
  if (gameTimer) gameTimer.stop();

  // Clear all pending timeouts
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];
  if (comboTimeout) clearTimeout(comboTimeout);
  if (hitFlashTimeout) clearTimeout(hitFlashTimeout);

  // Show result
  if (success) {
    sfx.play('victory');
    resultEmoji.textContent = '🎉';
    resultHeadline.textContent = '몬스터 처치!';
    resultHeadline.className = 'result-headline success';
    resultDetail.textContent = '힘을 합쳐 몬스터를 물리쳤어요!';
    statTime.textContent = timeRemaining + '초 남음';
    spawnConfetti();
  } else {
    sfx.play('defeat');
    resultEmoji.textContent = '💀';
    resultHeadline.textContent = '패배...';
    resultHeadline.className = 'result-headline fail';
    resultDetail.textContent = 'HP ' + currentHP + ' 남기고 시간 초과';
    statTime.textContent = '0초 (시간 초과)';
  }

  statCombo.textContent = maxCombo + ' 연속';
  statTaps.textContent  = totalTaps + '회';

  const t = setTimeout(() => showScreen(resultScreen), 300);
  allTimeouts.push(t);
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#7C4DFF','#FF5252','#40C4FF','#69F0AE','#FFD740','#FF9800'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -10px;
      width: ${6 + Math.random() * 6}px;
      height: ${6 + Math.random() * 6}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall ${1.5 + Math.random() * 1.5}s ease-in ${Math.random() * 0.8}s forwards;
      z-index: 999;
      pointer-events: none;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

// ─── Result actions ───────────────────────────────────────────────────────────
onTap(document.getElementById('retryBtn'), () => {
  startCountdown();
});

onTap(document.getElementById('homeBtn'), () => {
  goHome();
});

onTap(document.getElementById('closeBtn'), () => {
  if (gameTimer) gameTimer.stop();
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];
  goHome();
});

// ─── Confetti keyframe (injected once) ───────────────────────────────────────
(function injectConfettiKeyframe() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confettiFall {
      0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
})();
