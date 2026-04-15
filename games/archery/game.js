/* games/archery/game.js */
(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────
  var SHOTS_PER_PLAYER = 3;
  var TARGET_CX = 150;   // SVG coordinate center
  var TARGET_CY = 150;
  var TARGET_R  = 140;   // outer radius in SVG coords

  // Ring radii & points (innermost first for scoring)
  var RINGS = [
    { r: 28,  pts: 10, color: '#FFD700' },
    { r: 56,  pts: 8,  color: '#EF5350' },
    { r: 84,  pts: 6,  color: '#1565C0' },
    { r: 112, pts: 4,  color: '#222222' },
    { r: 140, pts: 2,  color: '#FFFFFF' }
  ];

  var PLAYER_COLORS = ['#EF5350', '#29B6F6', '#66BB6A', '#FFA726'];
  var PLAYER_NAMES  = ['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4'];

  // ── Screens ────────────────────────────────────────────────────
  var screens = {
    intro:  document.getElementById('introScreen'),
    game:   document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
  }

  // ── Sound ──────────────────────────────────────────────────────
  var sounds = createSoundManager({
    // Bow draw: rising tension
    draw: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    },
    // Release / whoosh
    release: function (ctx) {
      // Whoosh: filtered noise-like sweep
      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.18);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(640, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(); osc1.stop(ctx.currentTime + 0.22);
      osc2.start(); osc2.stop(ctx.currentTime + 0.22);
    },
    // Hit target: thud
    hit: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    },
    // Bullseye: celebratory ding!
    bullseye: function (ctx) {
      var notes = [784, 988, 1175, 1568];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.48);
      });
    },
    // Miss: soft low thud
    miss: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    },
    // Win fanfare
    win: function (ctx) {
      var melody = [523, 659, 784, 1047, 1319, 1047, 1319];
      melody.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.10;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }
  });

  var soundBtns = [
    document.getElementById('soundToggleIntro'),
    document.getElementById('soundToggleGame')
  ];

  function updateSoundBtns() {
    var icon = sounds.isMuted() ? '🔇' : '🔊';
    soundBtns.forEach(function (b) { b.textContent = icon; });
  }

  soundBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });

  updateSoundBtns();

  // ── Intro: player count selection ──────────────────────────────
  var selectedPlayerCount = 2;

  var playerCountBtns = document.querySelectorAll('.player-count-btn');
  playerCountBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      playerCountBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedPlayerCount = parseInt(btn.getAttribute('data-count'), 10);
    });
  });

  onTap(document.getElementById('backBtn'), function () { goHome(); });
  onTap(document.getElementById('playBtn'), function () { startGame(); });
  onTap(document.getElementById('closeBtn'), function () { goHome(); });
  onTap(document.getElementById('retryBtn'), function () { startGame(); });
  onTap(document.getElementById('homeBtn'), function () { goHome(); });

  // ── Game State ─────────────────────────────────────────────────
  var numPlayers = 2;
  var currentPlayer = 0;   // 0-based index
  var shotsLeft = 0;
  var playerScores = [];   // playerScores[i] = total score
  var playerShots  = [];   // playerShots[i]  = array of shot scores
  var playerDone   = [];   // playerDone[i]   = bool
  var wind = { dir: 1, strength: 0, label: '약' };  // dir: +1 right, -1 left

  // Aiming state
  var isAiming = false;
  var dragStart = { x: 0, y: 0 };
  var dragCurrent = { x: 0, y: 0 };
  var canShoot = false;
  var shooting = false;

  // ── DOM refs ────────────────────────────────────────────────────
  var targetArea     = document.getElementById('targetArea');
  var targetSvg      = document.getElementById('targetSvg');
  var arrowDotsLayer = document.getElementById('arrowDotsLayer');
  var aimLineLayer   = document.getElementById('aimLineLayer');
  var windArrow      = document.getElementById('windArrow');
  var windLabel      = document.getElementById('windLabel');
  var playerStatusBar   = document.getElementById('playerStatusBar');
  var currentPlayerLabel = document.getElementById('currentPlayerLabel');
  var arrowsRemaining   = document.getElementById('arrowsRemaining');

  // Turn overlay (created once, appended to body)
  var turnOverlay = document.createElement('div');
  turnOverlay.className = 'turn-overlay';
  turnOverlay.innerHTML =
    '<div class="turn-overlay-inner">' +
      '<div class="turn-overlay-name" id="overlayName"></div>' +
      '<div class="turn-overlay-sub" id="overlaySub">의 차례입니다!</div>' +
      '<div class="turn-overlay-tap">화면을 터치하면 시작해요</div>' +
    '</div>';
  document.body.appendChild(turnOverlay);

  var overlayName = document.getElementById('overlayName');
  var overlaySub  = document.getElementById('overlaySub');

  turnOverlay.addEventListener('click', function () {
    if (turnOverlay.classList.contains('visible')) {
      hideTurnOverlay();
    }
  });
  turnOverlay.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (turnOverlay.classList.contains('visible')) {
      hideTurnOverlay();
    }
  }, { passive: false });

  function showTurnOverlay(name, color) {
    overlayName.textContent = name;
    overlayName.style.color = color;
    overlaySub.textContent = '의 차례입니다!';
    turnOverlay.classList.add('visible');
    canShoot = false;
  }

  function hideTurnOverlay() {
    turnOverlay.classList.remove('visible');
    canShoot = true;
  }

  // ── Wind ────────────────────────────────────────────────────────
  var WIND_PRESETS = [
    { dir:  1, strength:  8, label: '약' },
    { dir: -1, strength:  8, label: '약' },
    { dir:  1, strength: 18, label: '중' },
    { dir: -1, strength: 18, label: '중' },
    { dir:  1, strength: 30, label: '강' },
    { dir: -1, strength: 30, label: '강' },
    { dir:  1, strength:  0, label: '없음' }
  ];

  function rollWind() {
    var preset = WIND_PRESETS[Math.floor(Math.random() * WIND_PRESETS.length)];
    wind.dir      = preset.dir;
    wind.strength = preset.strength;
    wind.label    = preset.label;
    updateWindUI();
  }

  function updateWindUI() {
    if (wind.strength === 0) {
      windArrow.textContent = '○';
      windLabel.textContent = '없음';
    } else {
      windArrow.textContent = wind.dir > 0 ? '→' : '←';
      windLabel.textContent = wind.label;
    }
  }

  // ── Player status bar ──────────────────────────────────────────
  function buildStatusBar() {
    playerStatusBar.innerHTML = '';
    for (var i = 0; i < numPlayers; i++) {
      var chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.id = 'chip-' + i;
      chip.style.color = PLAYER_COLORS[i];
      chip.innerHTML =
        '<span class="chip-dot" style="background:' + PLAYER_COLORS[i] + '"></span>' +
        '<span class="chip-name">' + PLAYER_NAMES[i] + '</span>' +
        '<span class="chip-score" id="chip-score-' + i + '">0점</span>';
      playerStatusBar.appendChild(chip);
    }
  }

  function updateStatusBar() {
    for (var i = 0; i < numPlayers; i++) {
      var chip = document.getElementById('chip-' + i);
      var scoreEl = document.getElementById('chip-score-' + i);
      if (!chip || !scoreEl) continue;
      chip.classList.toggle('active-turn', i === currentPlayer && !playerDone[i]);
      chip.classList.toggle('done-turn', playerDone[i]);
      scoreEl.textContent = playerScores[i] + '점';
    }
  }

  // ── Arrows remaining display ────────────────────────────────────
  function updateArrowsUI() {
    var filled   = shotsLeft;
    var empty    = SHOTS_PER_PLAYER - shotsLeft;
    var str = '';
    for (var i = 0; i < filled; i++) str += '●';
    for (var i = 0; i < empty; i++)  str += '○';
    arrowsRemaining.textContent = str;
    currentPlayerLabel.textContent = PLAYER_NAMES[currentPlayer];
    currentPlayerLabel.style.color = PLAYER_COLORS[currentPlayer];
  }

  // ── Game startup ───────────────────────────────────────────────
  function startGame() {
    numPlayers = selectedPlayerCount;
    currentPlayer = 0;
    playerScores = [];
    playerShots  = [];
    playerDone   = [];

    for (var i = 0; i < numPlayers; i++) {
      playerScores.push(0);
      playerShots.push([]);
      playerDone.push(false);
    }

    // Clear SVG layers
    arrowDotsLayer.innerHTML = '';
    aimLineLayer.innerHTML   = '';

    buildStatusBar();
    rollWind();
    startPlayerTurn();
    showScreen('game');
  }

  function startPlayerTurn() {
    shotsLeft = SHOTS_PER_PLAYER;
    shooting  = false;
    isAiming  = false;
    canShoot  = false;

    updateArrowsUI();
    updateStatusBar();

    // Show turn overlay
    showTurnOverlay(PLAYER_NAMES[currentPlayer], PLAYER_COLORS[currentPlayer]);
  }

  function advanceTurn() {
    // Find next player who hasn't gone yet
    var next = -1;
    for (var i = currentPlayer + 1; i < numPlayers; i++) {
      if (!playerDone[i]) { next = i; break; }
    }

    if (next === -1) {
      // All players done → result
      setTimeout(showResult, 400);
      return;
    }

    currentPlayer = next;
    rollWind();
    startPlayerTurn();
  }

  // ── SVG coordinate utilities ────────────────────────────────────
  function getSvgPoint(clientX, clientY) {
    var rect = targetSvg.getBoundingClientRect();
    var scaleX = 300 / rect.width;
    var scaleY = 300 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY
    };
  }

  // ── Aim line drawing ────────────────────────────────────────────
  var aimLine = null;
  var aimCircle = null;

  function startAimLine(sx, sy) {
    aimLineLayer.innerHTML = '';

    aimLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    aimLine.setAttribute('class', 'aim-line');
    aimLine.setAttribute('x1', sx);
    aimLine.setAttribute('y1', sy);
    aimLine.setAttribute('x2', sx);
    aimLine.setAttribute('y2', sy);
    aimLineLayer.appendChild(aimLine);

    aimCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    aimCircle.setAttribute('r', '8');
    aimCircle.setAttribute('fill', 'rgba(255,255,255,0.55)');
    aimCircle.setAttribute('stroke', 'white');
    aimCircle.setAttribute('stroke-width', '2');
    aimCircle.setAttribute('cx', sx);
    aimCircle.setAttribute('cy', sy);
    aimLineLayer.appendChild(aimCircle);
  }

  function updateAimLine(sx, sy, tx, ty) {
    if (!aimLine) return;
    aimLine.setAttribute('x1', sx);
    aimLine.setAttribute('y1', sy);
    aimLine.setAttribute('x2', tx);
    aimLine.setAttribute('y2', ty);
    aimCircle.setAttribute('cx', tx);
    aimCircle.setAttribute('cy', ty);
  }

  function clearAimLine() {
    aimLineLayer.innerHTML = '';
    aimLine   = null;
    aimCircle = null;
  }

  // Power bar
  var powerBarWrap = null;
  var powerBarFill = null;

  function createPowerBar() {
    if (powerBarWrap) return;
    powerBarWrap = document.createElement('div');
    powerBarWrap.className = 'power-bar-wrap';
    powerBarWrap.innerHTML =
      '<span class="power-label">파워</span>' +
      '<div class="power-bar-track"><div class="power-bar-fill"></div></div>';
    targetArea.appendChild(powerBarWrap);
    powerBarFill = powerBarWrap.querySelector('.power-bar-fill');
  }

  function removePowerBar() {
    if (powerBarWrap) {
      powerBarWrap.remove();
      powerBarWrap = null;
      powerBarFill = null;
    }
  }

  function updatePowerBar(pct) {
    if (powerBarFill) powerBarFill.style.height = Math.min(100, pct * 100) + '%';
  }

  // ── Scoring ─────────────────────────────────────────────────────
  function scoreForPosition(x, y) {
    var dx = x - TARGET_CX;
    var dy = y - TARGET_CY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    for (var i = 0; i < RINGS.length; i++) {
      if (dist <= RINGS[i].r) return RINGS[i].pts;
    }
    return 0;  // miss (outside target)
  }

  // ── Drag-to-aim and shoot ────────────────────────────────────────
  // The shoot zone and target area are the drag surface.
  // Drag direction (from start to current) reversed = aim direction on target.
  // The drag distance maps to power (max ~120px client = full power).
  var MAX_DRAG_CLIENT = 130;  // px in client coords for full power

  function getClientFromEvent(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onPointerDown(e) {
    if (!canShoot || shooting || shotsLeft <= 0) return;
    if (e.target.closest && e.target.closest('.game-header')) return;
    if (e.target.closest && e.target.closest('.player-status-bar')) return;

    e.preventDefault();
    var pt = getClientFromEvent(e);
    dragStart.x = pt.x;
    dragStart.y = pt.y;
    dragCurrent.x = pt.x;
    dragCurrent.y = pt.y;
    isAiming = true;

    // Draw start in SVG coords – from target center
    startAimLine(TARGET_CX, TARGET_CY);
    createPowerBar();
    sounds.play('draw');
  }

  function onPointerMove(e) {
    if (!isAiming) return;
    e.preventDefault();
    var pt = getClientFromEvent(e);
    dragCurrent.x = pt.x;
    dragCurrent.y = pt.y;

    // Compute drag vector in client px
    var dx = dragCurrent.x - dragStart.x;
    var dy = dragCurrent.y - dragStart.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var pct  = Math.min(dist / MAX_DRAG_CLIENT, 1);

    // Aim direction is opposite of drag (pull bow back = arrow goes that way)
    // We show the aim line extending toward where arrow will roughly go
    // In SVG: project from center in -drag direction with scale
    var svgMaxRadius = TARGET_R * 0.9;
    var normX = dist > 1 ? dx / dist : 0;
    var normY = dist > 1 ? dy / dist : 0;

    // Aim tip: center + -direction * pct * radius
    var tipX = TARGET_CX + (-normX) * pct * svgMaxRadius;
    var tipY = TARGET_CY + (-normY) * pct * svgMaxRadius;

    updateAimLine(TARGET_CX, TARGET_CY, tipX, tipY);
    updatePowerBar(pct);
  }

  function onPointerUp(e) {
    if (!isAiming) return;
    e.preventDefault();
    isAiming = false;
    clearAimLine();
    removePowerBar();

    if (!canShoot || shooting || shotsLeft <= 0) return;

    // Compute shot parameters
    var dx = dragCurrent.x - dragStart.x;
    var dy = dragCurrent.y - dragStart.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    // Minimum drag to count as a shot
    if (dist < 10) return;

    var pct  = Math.min(dist / MAX_DRAG_CLIENT, 1);
    var normX = dist > 0 ? dx / dist : 0;
    var normY = dist > 0 ? dy / dist : 0;

    // Landing in SVG coords:
    // Arrow goes in opposite direction of drag, scaled by power + some spread
    var spread = (1 - pct) * 30 + 5;   // less power = more spread
    var spreadX = (Math.random() - 0.5) * spread;
    var spreadY = (Math.random() - 0.5) * spread;

    // Wind offset (horizontal, in SVG units; full strength ~ 40 SVG units at max)
    var windOffsetX = wind.dir * (wind.strength / 30) * 40 * pct;

    var landX = TARGET_CX + (-normX) * pct * TARGET_R + spreadX + windOffsetX;
    var landY = TARGET_CY + (-normY) * pct * TARGET_R + spreadY;

    // Clamp so arrow dot stays within a wider bound (can miss)
    // No clamp – landing outside RINGS radius = 0 pts (miss)

    fireArrow(landX, landY, pct);
  }

  // ── Arrow flight ─────────────────────────────────────────────────
  function fireArrow(landX, landY, power) {
    shooting = true;
    canShoot = false;
    shotsLeft--;

    sounds.play('release');

    // Animate a projectile dot flying from center to landing
    var flyDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    flyDot.setAttribute('cx', TARGET_CX);
    flyDot.setAttribute('cy', TARGET_CY);
    flyDot.setAttribute('r', '5');
    flyDot.setAttribute('fill', PLAYER_COLORS[currentPlayer]);
    flyDot.setAttribute('opacity', '0.85');
    aimLineLayer.appendChild(flyDot);

    var startTime = null;
    var FLIGHT_MS = 320;

    function animateFly(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      var t = Math.min(elapsed / FLIGHT_MS, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - t, 3);

      var cx = TARGET_CX + (landX - TARGET_CX) * eased;
      var cy = TARGET_CY + (landY - TARGET_CY) * eased;
      flyDot.setAttribute('cx', cx);
      flyDot.setAttribute('cy', cy);

      if (t < 1) {
        requestAnimationFrame(animateFly);
      } else {
        // Remove fly dot, place permanent dot
        flyDot.remove();
        placeArrowDot(landX, landY);
      }
    }

    requestAnimationFrame(animateFly);
  }

  function placeArrowDot(x, y) {
    var pts = scoreForPosition(x, y);
    var isBullseye = pts === 10;
    var isMiss     = pts === 0;

    // Add to scores
    playerScores[currentPlayer] += pts;
    playerShots[currentPlayer].push(pts);

    // Create permanent dot
    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', '8');
    dot.setAttribute('fill', PLAYER_COLORS[currentPlayer]);
    dot.setAttribute('stroke', 'white');
    dot.setAttribute('stroke-width', '2.5');
    dot.setAttribute('class', 'arrow-dot');
    arrowDotsLayer.appendChild(dot);

    // Pop-in animation
    requestAnimationFrame(function () {
      dot.classList.add('visible', 'pop-in');
    });

    // Sound
    if (isMiss) {
      sounds.play('miss');
    } else if (isBullseye) {
      sounds.play('bullseye');
    } else {
      sounds.play('hit');
    }

    // Score popup
    if (!isMiss) {
      showScorePopup(x, y, pts);
    }

    // Update UI
    updateArrowsUI();
    updateStatusBar();

    var chipScore = document.getElementById('chip-score-' + currentPlayer);
    if (chipScore) chipScore.textContent = playerScores[currentPlayer] + '점';

    shooting = false;

    if (shotsLeft > 0) {
      // More arrows: re-enable
      setTimeout(function () { canShoot = true; }, 500);
    } else {
      // Player done
      playerDone[currentPlayer] = true;
      setTimeout(advanceTurn, 900);
    }
  }

  // ── Score popup ─────────────────────────────────────────────────
  function showScorePopup(svgX, svgY, pts) {
    var rect = targetSvg.getBoundingClientRect();
    var scaleX = rect.width  / 300;
    var scaleY = rect.height / 300;

    var clientX = rect.left + svgX * scaleX;
    var clientY = rect.top  + svgY * scaleY;

    var popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + pts;
    popup.style.left = clientX + 'px';
    popup.style.top  = clientY + 'px';
    popup.style.color = pts === 10 ? '#FFD700' : PLAYER_COLORS[currentPlayer];
    document.body.appendChild(popup);

    setTimeout(function () { popup.remove(); }, 1200);
  }

  // ── Touch / mouse event wiring ─────────────────────────────────
  // Attach to the full game screen (not just target), so dragging anywhere works
  var gameScreen = document.getElementById('gameScreen');

  gameScreen.addEventListener('mousedown',  onPointerDown, { passive: false });
  gameScreen.addEventListener('mousemove',  onPointerMove, { passive: false });
  gameScreen.addEventListener('mouseup',    onPointerUp,   { passive: false });
  gameScreen.addEventListener('mouseleave', onPointerUp,   { passive: false });

  gameScreen.addEventListener('touchstart', onPointerDown, { passive: false });
  gameScreen.addEventListener('touchmove',  onPointerMove, { passive: false });
  gameScreen.addEventListener('touchend',   onPointerUp,   { passive: false });
  gameScreen.addEventListener('touchcancel',onPointerUp,   { passive: false });

  // ── Result screen ───────────────────────────────────────────────
  function showResult() {
    sounds.play('win');

    // Determine winner(s)
    var maxScore = Math.max.apply(null, playerScores);
    var winners  = [];
    for (var i = 0; i < numPlayers; i++) {
      if (playerScores[i] === maxScore) winners.push(i);
    }

    var resultTitle  = document.getElementById('resultTitle');
    var resultTrophy = document.getElementById('resultTrophy');
    var scoreTable   = document.getElementById('scoreTable');

    if (winners.length === 1) {
      resultTitle.textContent = PLAYER_NAMES[winners[0]] + ' 우승! 🎉';
      resultTitle.style.color = PLAYER_COLORS[winners[0]];
      resultTrophy.textContent = '🏆';
    } else {
      resultTitle.textContent = '공동 우승! 🤝';
      resultTitle.style.color = '#FF7043';
      resultTrophy.textContent = '🤝';
    }

    // Build score table (sorted by score desc)
    var ranking = [];
    for (var i = 0; i < numPlayers; i++) {
      ranking.push({ idx: i, score: playerScores[i], shots: playerShots[i] });
    }
    ranking.sort(function (a, b) { return b.score - a.score; });

    scoreTable.innerHTML = '';
    ranking.forEach(function (r) {
      var isWinner = winners.indexOf(r.idx) !== -1;
      var row = document.createElement('div');
      row.className = 'score-row' + (isWinner ? ' winner-row' : '');
      var shotDetail = r.shots.join(' + ') + ' = ';
      row.innerHTML =
        '<span class="score-row-dot" style="background:' + PLAYER_COLORS[r.idx] + '"></span>' +
        '<span class="score-row-name">' + PLAYER_NAMES[r.idx] + '</span>' +
        '<span class="score-row-detail">' + shotDetail + '</span>' +
        '<span class="score-row-total">' + r.score + '점</span>' +
        (isWinner ? '<span class="winner-crown">👑</span>' : '');
      scoreTable.appendChild(row);
    });

    showScreen('result');
  }

}());
