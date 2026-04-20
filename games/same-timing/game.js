/* games/same-timing/game.js */
'use strict';

// ══════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════

var TOTAL_ROUNDS      = 10;
var PULSE_GROW_MS     = 2000;   // t=0 → t=2000ms: circle grows
var PULSE_SHRINK_MS   = 800;    // t=2000ms → t=2800ms: circle shrinks
var TAP_WINDOW_START  = 1800;   // ms into pulse when window opens
var TAP_WINDOW_BASE   = 300;    // ms window at round 1
var TAP_WINDOW_SHRINK = 20;     // ms reduced per round (rounds 1-10 → 300..120ms)
var MIN_CIRCLE_R      = 60;     // SVG units
var MAX_CIRCLE_R      = 130;    // SVG units
var BETWEEN_ROUNDS_MS = 1200;   // pause between rounds

var PLAYER_CONFIG = [
  { label: 'P1', color: '#00BCD4', tint: 'rgba(0,188,212,0.14)' },
  { label: 'P2', color: '#FF5722', tint: 'rgba(255,87,34,0.14)'  },
  { label: 'P3', color: '#9C27B0', tint: 'rgba(156,39,176,0.14)' },
  { label: 'P4', color: '#4CAF50', tint: 'rgba(76,175,80,0.14)'  },
];

var RESULT_MESSAGES = [
  ['0점이지만 같이했잖아요! 💪', 1],
  ['조금씩 맞춰가고 있어요! 🌱', 3],
  ['절반 성공! 팀워크 좋은데요! 👏', 5],
  ['훌륭한 팀워크예요! 🎯', 7],
  ['거의 완벽해요! 🔥', 9],
  ['완벽한 싱크로! 최강팀! 🏆', 10],
];

// ══════════════════════════════════════════════════════
// SOUND
// ══════════════════════════════════════════════════════

var sound = createSoundManager({
  // Rising tone during pulse growth (short preview at round start)
  pulse: function(ctx) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + PULSE_GROW_MS / 1000);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + PULSE_GROW_MS / 1000 * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + PULSE_GROW_MS / 1000 + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + PULSE_GROW_MS / 1000 + 0.1);
  },
  // Chime when tap window opens
  chime: function(ctx) {
    [880, 1108, 1320].forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      var t = ctx.currentTime + i * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  },
  // Individual tap click
  tap: function(ctx) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  },
  // All tapped in window — triumphant
  success: function(ctx) {
    [523, 659, 784, 1047].forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      var t = ctx.currentTime + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  },
  // Miss — sad buzz
  fail: function(ctx) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  },
  // Fanfare at game end
  fanfare: function(ctx) {
    [392, 523, 659, 784, 1047].forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      var t = ctx.currentTime + i * 0.13;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  },
  // Consolation
  consolation: function(ctx) {
    [523, 440, 349].forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      var t = ctx.currentTime + i * 0.18;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }
});

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════

var playerCount   = 2;
var currentRound  = 0;
var successCount  = 0;
var gameActive    = false;

// Per-round timing state
var roundPhase       = 'idle';  // idle | growing | window | shrinking | result
var roundStartTime   = 0;       // Date.now() when current pulse started
var playerTapTimes   = [];      // [null | timestamp] per player — null = not tapped
var tapWindowMs      = TAP_WINDOW_BASE;
var tapWindowOpen    = false;

// Active timeouts — tracked so they can be cleared on cleanup
var activeTimeouts = [];

// ══════════════════════════════════════════════════════
// DOM REFS
// ══════════════════════════════════════════════════════

var introScreen      = document.getElementById('introScreen');
var countdownScreen  = document.getElementById('countdownScreen');
var countdownNumber  = document.getElementById('countdownNumber');
var gameScreen       = document.getElementById('gameScreen');
var resultScreen     = document.getElementById('resultScreen');
var backBtn          = document.getElementById('backBtn');
var playBtn          = document.getElementById('playBtn');
var closeBtn         = document.getElementById('closeBtn');
var retryBtn         = document.getElementById('retryBtn');
var homeBtn          = document.getElementById('homeBtn');
var soundToggleIntro = document.getElementById('soundToggleIntro');
var hudRound         = document.getElementById('hudRound');
var hudScore         = document.getElementById('hudScore');
var tapZones         = document.getElementById('tapZones');
var pulseSvg         = document.getElementById('pulseSvg');
var pulseCircle      = document.getElementById('pulseCircle');
var pulseInner       = document.getElementById('pulseInner');
var glowRing         = document.getElementById('glowRing');
var tapLabel         = document.getElementById('tapLabel');
var resultLabelEl    = document.getElementById('resultLabel');
var resultEmoji      = document.getElementById('resultEmoji');
var resultTitle      = document.getElementById('resultTitle');
var resultScore      = document.getElementById('resultScore');
var resultMessage    = document.getElementById('resultMessage');
var confettiContainer= document.getElementById('confettiContainer');

// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════

function showScreen(el) {
  [introScreen, countdownScreen, gameScreen, resultScreen].forEach(function(s) {
    s.classList.remove('active');
  });
  el.classList.add('active');
}

function safeTimeout(fn, ms) {
  var id = setTimeout(function() {
    // Remove from list when fired
    var idx = activeTimeouts.indexOf(id);
    if (idx !== -1) activeTimeouts.splice(idx, 1);
    fn();
  }, ms);
  activeTimeouts.push(id);
  return id;
}

function clearAllTimeouts() {
  activeTimeouts.forEach(function(id) { clearTimeout(id); });
  activeTimeouts = [];
}

function updateSoundToggle() {
  soundToggleIntro.textContent = sound.isMuted() ? '🔇' : '🔊';
}

function lerp(a, b, t) { return a + (b - a) * t; }

function easeInOut(t) {
  // Smooth cubic ease-in-out
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Circle animation (driven by setInterval, not rAF) ──
var pulseInterval = null;
var pulseIntervalMs = 16; // ~60fps via setInterval

function setPulseRadius(r) {
  var rStr = String(r);
  pulseCircle.setAttribute('r', rStr);
  pulseInner.setAttribute('r', String(Math.max(0, r - 20)));
}

function startPulseAnimation() {
  if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null; }
  roundStartTime = Date.now();
  setPulseRadius(MIN_CIRCLE_R);

  pulseInterval = setInterval(function() {
    if (!gameActive) { clearInterval(pulseInterval); pulseInterval = null; return; }

    var elapsed = Date.now() - roundStartTime;

    if (elapsed <= PULSE_GROW_MS) {
      // Growing phase
      var t = elapsed / PULSE_GROW_MS;
      var r = Math.round(lerp(MIN_CIRCLE_R, MAX_CIRCLE_R, easeInOut(t)));
      setPulseRadius(r);
    } else if (elapsed <= PULSE_GROW_MS + PULSE_SHRINK_MS) {
      // Shrinking phase
      var ts = (elapsed - PULSE_GROW_MS) / PULSE_SHRINK_MS;
      var rs = Math.round(lerp(MAX_CIRCLE_R, MIN_CIRCLE_R, easeInOut(ts)));
      setPulseRadius(rs);
    } else {
      // Done
      clearInterval(pulseInterval);
      pulseInterval = null;
      setPulseRadius(MIN_CIRCLE_R);
    }
  }, pulseIntervalMs);
}

function stopPulseAnimation() {
  if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null; }
  setPulseRadius(MIN_CIRCLE_R);
}

// ══════════════════════════════════════════════════════
// ZONE BUILDING
// ══════════════════════════════════════════════════════

function buildTapZones() {
  tapZones.innerHTML = '';
  tapZones.className = 'tap-zones p' + playerCount;

  for (var i = 0; i < playerCount; i++) {
    var cfg  = PLAYER_CONFIG[i];
    var zone = document.createElement('div');
    zone.className = 'tap-zone state-wait';
    zone.dataset.player = i;
    zone.style.setProperty('--zone-color', cfg.color);
    zone.style.setProperty('--zone-tint', cfg.tint);
    zone.style.background = cfg.tint;

    // Inline SVG tap button
    zone.innerHTML =
      '<div class="tap-zone-label">' + cfg.label + '</div>' +
      '<svg class="tap-btn-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
        '<circle class="tap-circle-fill" cx="40" cy="40" r="36" />' +
        '<circle class="tap-circle-stroke" cx="40" cy="40" r="36"' +
          ' fill="none" stroke="' + cfg.color + '" stroke-width="4"/>' +
        '<text class="tap-icon" x="40" y="48" text-anchor="middle"' +
          ' font-size="26" font-family="sans-serif" fill="rgba(255,255,255,0.7)">👆</text>' +
      '</svg>';

    (function(zoneEl, playerIdx) {
      onTap(zoneEl, function() {
        handlePlayerTap(playerIdx, zoneEl);
      });
    })(zone, i);

    tapZones.appendChild(zone);
  }
}

function getZoneEl(idx) {
  return tapZones.querySelector('.tap-zone[data-player="' + idx + '"]');
}

function setZoneState(idx, state) {
  var zone = getZoneEl(idx);
  if (!zone) return;
  zone.classList.remove('state-wait', 'state-ready', 'state-tapped',
                         'state-success', 'state-fail', 'state-missed');
  zone.classList.add('state-' + state);
}

function setZoneIcon(idx, icon) {
  var zone = getZoneEl(idx);
  if (!zone) return;
  var iconEl = zone.querySelector('.tap-icon');
  if (iconEl) iconEl.textContent = icon;
}

function spawnTapRipple(zoneEl, cfg) {
  var r = document.createElement('div');
  r.className = 'tap-ripple';
  r.style.background = cfg.color;
  r.style.left = '50%';
  r.style.top  = '50%';
  r.style.transform = 'translate(-50%,-50%)';
  zoneEl.appendChild(r);
  r.addEventListener('animationend', function() { r.remove(); });
}

// ══════════════════════════════════════════════════════
// TAP HANDLER
// ══════════════════════════════════════════════════════

function handlePlayerTap(playerIdx, zoneEl) {
  if (!gameActive) return;
  if (roundPhase !== 'growing' && roundPhase !== 'window') return;
  if (playerTapTimes[playerIdx] !== null) return; // already tapped

  var tapTime = Date.now() - roundStartTime; // ms since pulse started
  playerTapTimes[playerIdx] = tapTime;

  var cfg = PLAYER_CONFIG[playerIdx];
  sound.play('tap');
  spawnTapRipple(zoneEl, cfg);

  // Mark tapped (gold border while we wait for window result)
  setZoneState(playerIdx, 'tapped');
  setZoneIcon(playerIdx, '✓');

  // Check if all players have now tapped (may resolve early)
  checkAllTapped();
}

function checkAllTapped() {
  for (var i = 0; i < playerCount; i++) {
    if (playerTapTimes[i] === null) return; // someone hasn't tapped
  }
  // Everyone has tapped — resolve immediately
  resolveRound();
}

// ══════════════════════════════════════════════════════
// ROUND FLOW
// ══════════════════════════════════════════════════════

function startGame() {
  clearAllTimeouts();
  stopPulseAnimation();
  gameActive   = true;
  currentRound = 0;
  successCount = 0;

  hudScore.textContent = '0 / ' + TOTAL_ROUNDS;
  hudRound.textContent  = '1 / ' + TOTAL_ROUNDS;

  showScreen(gameScreen);
  buildTapZones();

  // Reset SVG state
  setPulseRadius(MIN_CIRCLE_R);
  glowRing.classList.remove('visible');
  glowRing.setAttribute('opacity', '0');
  tapLabel.setAttribute('opacity', '0');
  pulseSvg.classList.remove('tap-open');
  resultLabelEl.setAttribute('opacity', '0');

  safeTimeout(function() { nextRound(); }, 400);
}

function nextRound() {
  if (!gameActive) return;

  currentRound++;
  roundPhase = 'idle';
  tapWindowOpen = false;
  playerTapTimes = [];
  for (var i = 0; i < playerCount; i++) { playerTapTimes.push(null); }

  // Window narrows each round: 300ms → ~120ms at round 10
  tapWindowMs = Math.max(120, TAP_WINDOW_BASE - (currentRound - 1) * TAP_WINDOW_SHRINK);

  hudRound.textContent = currentRound + ' / ' + TOTAL_ROUNDS;

  // Reset zones to ready
  for (var j = 0; j < playerCount; j++) {
    setZoneState(j, 'ready');
    setZoneIcon(j, '👆');
  }

  // Reset SVG
  glowRing.classList.remove('visible');
  glowRing.setAttribute('opacity', '0');
  tapLabel.setAttribute('opacity', '0');
  pulseSvg.classList.remove('tap-open');
  resultLabelEl.setAttribute('opacity', '0');
  setPulseRadius(MIN_CIRCLE_R);

  // Short pre-round pause, then start pulse
  safeTimeout(function() {
    if (!gameActive) return;
    startPulse();
  }, 500);
}

function startPulse() {
  if (!gameActive) return;
  roundPhase = 'growing';

  // Start the circle animation
  startPulseAnimation();

  // Play rising tone alongside pulse
  sound.play('pulse');

  // At TAP_WINDOW_START: open the tap window
  safeTimeout(function() {
    if (!gameActive || roundPhase !== 'growing') return;
    openTapWindow();
  }, TAP_WINDOW_START);

  // At PULSE_GROW_MS: circle is at max, close tap window if not already resolved
  safeTimeout(function() {
    if (!gameActive) return;
    if (roundPhase === 'window') {
      closeTapWindow();
    }
    roundPhase = 'shrinking';
  }, PULSE_GROW_MS);

  // After full pulse cycle (grow + shrink): resolve round if not already
  safeTimeout(function() {
    if (!gameActive) return;
    if (roundPhase !== 'result') {
      resolveRound();
    }
  }, PULSE_GROW_MS + PULSE_SHRINK_MS);
}

function openTapWindow() {
  roundPhase   = 'window';
  tapWindowOpen = true;

  // Visual: green glow ring + "지금!" label
  glowRing.classList.add('visible');
  glowRing.setAttribute('opacity', '0.8');
  tapLabel.setAttribute('opacity', '1');
  pulseSvg.classList.add('tap-open');

  sound.play('chime');

  // Close window after tapWindowMs
  safeTimeout(function() {
    if (!gameActive) return;
    if (roundPhase === 'window') {
      closeTapWindow();
    }
  }, tapWindowMs);
}

function closeTapWindow() {
  tapWindowOpen = false;
  glowRing.classList.remove('visible');
  glowRing.setAttribute('opacity', '0');
  tapLabel.setAttribute('opacity', '0');
  pulseSvg.classList.remove('tap-open');
}

function resolveRound() {
  if (roundPhase === 'result') return; // already resolved
  roundPhase = 'result';
  stopPulseAnimation();
  closeTapWindow();

  // Evaluate: did all players tap within the window?
  var success = evaluateRound();

  if (success) {
    successCount++;
    hudScore.textContent = successCount + ' / ' + TOTAL_ROUNDS;
    sound.play('success');
    showRoundResult(true);
    spawnFlash('green');
    spawnConfetti(5);
  } else {
    sound.play('fail');
    showRoundResult(false);
    spawnFlash('red');
  }

  // Show per-zone result icons
  for (var i = 0; i < playerCount; i++) {
    var tapped = playerTapTimes[i] !== null;
    var inWindow = tapped &&
      playerTapTimes[i] >= TAP_WINDOW_START &&
      playerTapTimes[i] <= TAP_WINDOW_START + tapWindowMs;

    if (success) {
      setZoneState(i, 'success');
      setZoneIcon(i, '✓');
    } else if (inWindow) {
      // Tapped in window but others didn't
      setZoneState(i, 'tapped');
      setZoneIcon(i, '✓');
    } else if (tapped) {
      // Tapped but outside window
      setZoneState(i, 'fail');
      setZoneIcon(i, '✗');
    } else {
      // Never tapped
      setZoneState(i, 'missed');
      setZoneIcon(i, '✗');
    }
  }

  safeTimeout(function() {
    if (!gameActive) return;
    if (currentRound >= TOTAL_ROUNDS) {
      showResult();
    } else {
      nextRound();
    }
  }, BETWEEN_ROUNDS_MS);
}

function evaluateRound() {
  // All players must have tapped within the window [TAP_WINDOW_START, TAP_WINDOW_START + tapWindowMs]
  for (var i = 0; i < playerCount; i++) {
    var t = playerTapTimes[i];
    if (t === null) return false;
    if (t < TAP_WINDOW_START) return false;
    if (t > TAP_WINDOW_START + tapWindowMs) return false;
  }
  return true;
}

function showRoundResult(success) {
  resultLabelEl.textContent = success ? '성공! ✓' : '실패 ✗';
  resultLabelEl.setAttribute('fill', success ? '#69F0AE' : '#EF5350');
  resultLabelEl.setAttribute('opacity', '1');

  safeTimeout(function() {
    resultLabelEl.setAttribute('opacity', '0');
  }, 900);
}

// ══════════════════════════════════════════════════════
// VISUAL EFFECTS
// ══════════════════════════════════════════════════════

function spawnFlash(color) {
  var el = document.createElement('div');
  el.className = 'flash-overlay ' + color;
  document.body.appendChild(el);
  el.addEventListener('animationend', function() { el.remove(); });
}

var CONFETTI_COLORS = ['#FFD54F', '#69F0AE', '#CE93D8', '#80DEEA', '#FF8A65', '#fff'];

function spawnConfetti(count) {
  for (var i = 0; i < count; i++) {
    (function(delay) {
      safeTimeout(function() {
        var el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = (10 + Math.random() * 80) + '%';
        el.style.top  = '-10px';
        el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        el.style.animationDuration = (1.5 + Math.random()) + 's';
        el.style.animationDelay = '0s';
        document.body.appendChild(el);
        el.addEventListener('animationend', function() { el.remove(); });
      }, delay);
    })(i * 80);
  }
}

function spawnResultConfetti() {
  confettiContainer.innerHTML = '';
  for (var i = 0; i < 30; i++) {
    var el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = (Math.random() * 100) + '%';
    el.style.top  = '-10px';
    el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.width  = (6 + Math.random() * 8) + 'px';
    el.style.height = (6 + Math.random() * 8) + 'px';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
    el.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    el.style.animationDelay    = (Math.random() * 0.8) + 's';
    el.style.animationIterationCount = '1';
    confettiContainer.appendChild(el);
  }
}

// ══════════════════════════════════════════════════════
// RESULT SCREEN
// ══════════════════════════════════════════════════════

function showResult() {
  gameActive = false;
  stopPulseAnimation();
  clearAllTimeouts();

  var ratio = successCount / TOTAL_ROUNDS;

  // Pick message
  var msg = RESULT_MESSAGES[0][0];
  for (var i = RESULT_MESSAGES.length - 1; i >= 0; i--) {
    if (successCount >= RESULT_MESSAGES[i][1]) {
      msg = RESULT_MESSAGES[i][0];
      break;
    }
  }

  resultScore.textContent = successCount + ' / ' + TOTAL_ROUNDS;
  resultMessage.textContent = msg;

  if (ratio >= 0.8) {
    resultEmoji.textContent = '🏆';
    resultTitle.textContent = '완벽한 팀워크!';
    sound.play('fanfare');
    spawnResultConfetti();
  } else if (ratio >= 0.5) {
    resultEmoji.textContent = '👏';
    resultTitle.textContent = '잘 했어요!';
    sound.play('fanfare');
  } else {
    resultEmoji.textContent = '💪';
    resultTitle.textContent = '다시 도전!';
    sound.play('consolation');
  }

  showScreen(resultScreen);
}

// ══════════════════════════════════════════════════════
// COUNTDOWN
// ══════════════════════════════════════════════════════

var countdownInterval = null;

function startCountdown(onDone) {
  showScreen(countdownScreen);
  var count = 3;
  countdownNumber.textContent = count;
  countdownNumber.style.animation = 'none';
  countdownNumber.offsetHeight; // reflow
  countdownNumber.style.animation = '';

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

// ══════════════════════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════════════════════

function cleanup() {
  gameActive = false;
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  clearAllTimeouts();
  stopPulseAnimation();
}

// ══════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════

// Sound toggle
onTap(soundToggleIntro, function() {
  sound.toggleMute();
  updateSoundToggle();
});
updateSoundToggle();

// Player count select
document.querySelectorAll('.player-btn').forEach(function(btn) {
  onTap(btn, function() {
    document.querySelectorAll('.player-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    playerCount = parseInt(btn.getAttribute('data-count'), 10);
  });
});

// Nav buttons
onTap(backBtn,  function() { cleanup(); goHome(); });
onTap(playBtn,  function() { startCountdown(function() { startGame(); }); });
onTap(closeBtn, function() { cleanup(); goHome(); });
onTap(retryBtn, function() { cleanup(); startCountdown(function() { startGame(); }); });
onTap(homeBtn,  function() { cleanup(); goHome(); });
