/* games/catch-the-fly/game.js */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     Constants
  ───────────────────────────────────────── */
  var GAME_DURATION = 30;          // seconds
  var FLY_MIN_ALIVE = 1000;        // ms
  var FLY_MAX_ALIVE = 2200;        // ms
  var SPAWN_INTERVAL_MIN = 400;    // ms between spawn attempts per zone
  var SPAWN_INTERVAL_MAX = 900;
  var MAX_FLIES_PER_ZONE = 3;      // max simultaneous flies per zone

  /* Player zone colors (bg already set via CSS .zone-N) */
  var PLAYER_NAMES = ['P1', 'P2', 'P3', 'P4'];
  var PLAYER_COLORS = ['#4da6e8', '#e85555', '#44bb66', '#f0992a'];

  /* ─────────────────────────────────────────
     Screens
  ───────────────────────────────────────── */
  var screens = {
    intro:     document.getElementById('introScreen'),
    countdown: document.getElementById('countdownScreen'),
    game:      document.getElementById('gameScreen'),
    result:    document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  /* ─────────────────────────────────────────
     Sound
  ───────────────────────────────────────── */
  var sounds = createSoundManager({
    /* Fly appears: soft buzz */
    buzz: function (ctx) {
      var buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 180;
      filter.Q.value = 0.8;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    },
    /* Fly caught: satisfying splat */
    splat: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    },
    /* Game over fanfare */
    fanfare: function (ctx) {
      var melody = [523, 659, 784, 1047, 784, 1047];
      var times  = [0, 0.13, 0.26, 0.39, 0.55, 0.65];
      melody.forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + times[i];
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    }
  });

  /* Sound toggle buttons */
  var soundBtns = [document.getElementById('soundToggleIntro')];

  function updateSoundBtns() {
    var icon = sounds.isMuted() ? '🔇' : '🔊';
    soundBtns.forEach(function (btn) { if (btn) btn.textContent = icon; });
  }

  soundBtns.forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });
  updateSoundBtns();

  /* ─────────────────────────────────────────
     Player count selection
  ───────────────────────────────────────── */
  var selectedCount = 2;
  var playerBtns = document.querySelectorAll('.player-btn');

  playerBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedCount = parseInt(btn.dataset.count, 10);
      playerBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  /* ─────────────────────────────────────────
     Fly SVG factory
  ───────────────────────────────────────── */
  function makeFlyEl() {
    var div = document.createElement('div');
    div.className = 'fly';
    div.innerHTML = [
      '<svg viewBox="0 0 40 40" width="44" height="44">',
        '<ellipse cx="20" cy="25" rx="6" ry="8" fill="#2a2a2a"/>',
        '<circle cx="20" cy="16" r="5.5" fill="#444"/>',
        /* Wings with class for CSS animation */
        '<ellipse class="wing-l" cx="11" cy="15" rx="8" ry="4.5" fill="rgba(200,210,255,0.65)" transform="rotate(-20 11 15)"/>',
        '<ellipse class="wing-r" cx="29" cy="15" rx="8" ry="4.5" fill="rgba(200,210,255,0.65)" transform="rotate(20 29 15)"/>',
        /* Eyes */
        '<circle cx="18" cy="14.5" r="1.8" fill="#ff2020"/>',
        '<circle cx="22" cy="14.5" r="1.8" fill="#ff2020"/>',
        /* Highlight */
        '<circle cx="17.5" cy="14" r="0.6" fill="rgba(255,255,255,0.7)"/>',
        '<circle cx="21.5" cy="14" r="0.6" fill="rgba(255,255,255,0.7)"/>',
      '</svg>'
    ].join('');
    return div;
  }

  /* ─────────────────────────────────────────
     Splat effect factory
  ───────────────────────────────────────── */
  function makeSplatEl(color) {
    var div = document.createElement('div');
    div.className = 'splat';
    var c = color || '#888';
    div.innerHTML = [
      '<svg viewBox="0 0 60 60" width="60" height="60">',
        '<circle cx="30" cy="30" r="12" fill="' + c + '" opacity="0.7"/>',
        '<ellipse cx="30" cy="18" rx="4" ry="7" fill="' + c + '" opacity="0.6"/>',
        '<ellipse cx="30" cy="42" rx="4" ry="7" fill="' + c + '" opacity="0.6"/>',
        '<ellipse cx="18" cy="30" rx="7" ry="4" fill="' + c + '" opacity="0.6"/>',
        '<ellipse cx="42" cy="30" rx="7" ry="4" fill="' + c + '" opacity="0.6"/>',
        '<ellipse cx="21" cy="21" rx="3.5" ry="5.5" fill="' + c + '" opacity="0.5" transform="rotate(-45 21 21)"/>',
        '<ellipse cx="39" cy="21" rx="3.5" ry="5.5" fill="' + c + '" opacity="0.5" transform="rotate(45 39 21)"/>',
        '<ellipse cx="21" cy="39" rx="3.5" ry="5.5" fill="' + c + '" opacity="0.5" transform="rotate(45 21 39)"/>',
        '<ellipse cx="39" cy="39" rx="3.5" ry="5.5" fill="' + c + '" opacity="0.5" transform="rotate(-45 39 39)"/>',
      '</svg>'
    ].join('');
    return div;
  }

  /* ─────────────────────────────────────────
     Game State
  ───────────────────────────────────────── */
  var playerCount = 2;
  var scores = [];
  var scoreEls = [];
  var zones = [];
  var flyTimers = [];
  var spawnTimers = [];
  var gameRunning = false;
  var mainTimer = null;
  var timerBarEl = null;

  /* ─────────────────────────────────────────
     Build HUD
  ───────────────────────────────────────── */
  function buildHud(count) {
    var hud = document.getElementById('gameHud');
    hud.innerHTML = '';
    scoreEls = [];

    for (var i = 0; i < count; i++) {
      var cell = document.createElement('div');
      cell.className = 'hud-player';
      cell.style.borderRight = i < count - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none';

      var label = document.createElement('div');
      label.className = 'hud-player-label';
      label.textContent = PLAYER_NAMES[i];
      label.style.color = PLAYER_COLORS[i];

      var scoreDiv = document.createElement('div');
      scoreDiv.className = 'hud-player-score';
      scoreDiv.textContent = '0';
      scoreEls.push(scoreDiv);

      cell.appendChild(label);
      cell.appendChild(scoreDiv);
      hud.appendChild(cell);
    }

    /* Timer bar */
    var bar = document.createElement('div');
    bar.className = 'hud-timer-bar';
    bar.id = 'hudTimerBar';
    hud.appendChild(bar);
    timerBarEl = bar;
  }

  /* ─────────────────────────────────────────
     Build Arena (zones)
  ───────────────────────────────────────── */
  function buildArena(count) {
    var arena = document.getElementById('gameArena');
    arena.innerHTML = '';
    arena.className = 'game-arena arena-' + count + 'p';
    zones = [];

    for (var i = 0; i < count; i++) {
      var zone = document.createElement('div');
      zone.className = 'zone zone-' + i;
      zone.dataset.player = i;

      var lbl = document.createElement('div');
      lbl.className = 'zone-label';
      lbl.textContent = PLAYER_NAMES[i];
      zone.appendChild(lbl);

      arena.appendChild(zone);
      zones.push(zone);
    }
  }

  /* ─────────────────────────────────────────
     Score update
  ───────────────────────────────────────── */
  function addScore(playerIdx) {
    scores[playerIdx]++;
    var el = scoreEls[playerIdx];
    el.textContent = scores[playerIdx];
    el.classList.remove('bump');
    /* Force reflow for animation restart */
    void el.offsetWidth;
    el.classList.add('bump');
  }

  /* ─────────────────────────────────────────
     Fly spawning
  ───────────────────────────────────────── */
  function spawnFly(zoneEl, playerIdx) {
    if (!gameRunning) return;

    /* Limit flies per zone */
    var activeFlyCount = zoneEl.querySelectorAll('.fly').length;
    if (activeFlyCount >= MAX_FLIES_PER_ZONE) return;

    var rect = zoneEl.getBoundingClientRect();
    var margin = 28;
    var x = margin + Math.random() * (rect.width  - margin * 2);
    var y = margin + Math.random() * (rect.height - margin * 2);

    var fly = makeFlyEl();
    fly.style.left = x + 'px';
    fly.style.top  = y + 'px';
    zoneEl.appendChild(fly);

    sounds.play('buzz');

    /* Auto-remove after alive time */
    var aliveTime = FLY_MIN_ALIVE + Math.random() * (FLY_MAX_ALIVE - FLY_MIN_ALIVE);
    var hideTimer = setTimeout(function () {
      if (fly.parentNode) fly.parentNode.removeChild(fly);
    }, aliveTime);
    flyTimers.push(hideTimer);

    /* Tap handler */
    onTap(fly, function (e) {
      if (!gameRunning) return;
      if (!fly.parentNode) return;
      e.stopPropagation();

      /* Cancel auto-remove */
      clearTimeout(hideTimer);

      /* Get position before removing */
      var fx = parseFloat(fly.style.left);
      var fy = parseFloat(fly.style.top);

      fly.parentNode.removeChild(fly);

      /* Splat effect */
      var splat = makeSplatEl(PLAYER_COLORS[playerIdx]);
      splat.style.left = fx + 'px';
      splat.style.top  = fy + 'px';
      zoneEl.appendChild(splat);
      setTimeout(function () {
        if (splat.parentNode) splat.parentNode.removeChild(splat);
      }, 450);

      sounds.play('splat');
      addScore(playerIdx);
    });
  }

  function scheduleSpawn(zoneEl, playerIdx) {
    if (!gameRunning) return;
    spawnFly(zoneEl, playerIdx);
    var delay = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
    var t = setTimeout(function () {
      scheduleSpawn(zoneEl, playerIdx);
    }, delay);
    spawnTimers.push(t);
  }

  /* ─────────────────────────────────────────
     Countdown → Game
  ───────────────────────────────────────── */
  var countdownEl = document.getElementById('countdownNumber');

  function startCountdown(onDone) {
    var count = 3;
    countdownEl.textContent = count;
    showScreen('countdown');

    var interval = setInterval(function () {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        onDone();
      } else {
        countdownEl.textContent = count;
        countdownEl.style.animation = 'none';
        void countdownEl.offsetWidth;
        countdownEl.style.animation = '';
      }
    }, 1000);
  }

  /* ─────────────────────────────────────────
     Start / End Game
  ───────────────────────────────────────── */
  function startGame() {
    playerCount = selectedCount;
    scores = [];
    for (var i = 0; i < playerCount; i++) scores.push(0);

    buildHud(playerCount);
    buildArena(playerCount);

    gameRunning = true;
    showScreen('game');

    /* Start timer */
    mainTimer = createTimer(GAME_DURATION, function (rem) {
      if (timerBarEl) {
        timerBarEl.style.width = (rem / GAME_DURATION * 100) + '%';
      }
    }, function () {
      endGame();
    });
    mainTimer.start();

    /* Start spawn loops per zone */
    zones.forEach(function (zone, idx) {
      /* Stagger start slightly so zones don't all spawn simultaneously */
      var stagger = setTimeout(function () {
        scheduleSpawn(zone, idx);
      }, idx * 150);
      spawnTimers.push(stagger);
    });
  }

  function clearAllTimers() {
    flyTimers.forEach(clearTimeout);
    flyTimers = [];
    spawnTimers.forEach(clearTimeout);
    spawnTimers = [];
  }

  function endGame() {
    gameRunning = false;
    clearAllTimers();

    /* Remove all flies */
    zones.forEach(function (zone) {
      var flies = zone.querySelectorAll('.fly');
      flies.forEach(function (f) { if (f.parentNode) f.parentNode.removeChild(f); });
    });

    sounds.play('fanfare');
    showResultScreen();
  }

  /* ─────────────────────────────────────────
     Result Screen
  ───────────────────────────────────────── */
  function showResultScreen() {
    /* Find winner(s) */
    var maxScore = Math.max.apply(null, scores);
    var winners = [];
    scores.forEach(function (s, i) { if (s === maxScore) winners.push(i); });

    /* Title */
    var titleEl = document.getElementById('resultTitle');
    if (winners.length === 1) {
      titleEl.textContent = PLAYER_NAMES[winners[0]] + ' 우승! 🎉';
    } else {
      titleEl.textContent = '무승부! 🤝';
    }

    /* Score cards */
    var container = document.getElementById('resultScores');
    container.innerHTML = '';

    /* Sort by score desc for display */
    var order = scores.map(function (s, i) { return i; });
    order.sort(function (a, b) { return scores[b] - scores[a]; });

    order.forEach(function (playerIdx) {
      var card = document.createElement('div');
      card.className = 'result-score-card';
      var isWinner = winners.indexOf(playerIdx) !== -1;
      if (isWinner) {
        card.classList.add('winner');
        var crown = document.createElement('span');
        crown.className = 'crown';
        crown.textContent = '👑';
        card.appendChild(crown);
      }

      var pLabel = document.createElement('div');
      pLabel.className = 'result-score-player';
      pLabel.textContent = PLAYER_NAMES[playerIdx];
      pLabel.style.color = PLAYER_COLORS[playerIdx];

      var val = document.createElement('div');
      val.className = 'result-score-value';
      val.textContent = scores[playerIdx];

      var unit = document.createElement('div');
      unit.className = 'result-score-unit';
      unit.textContent = '마리';

      card.appendChild(pLabel);
      card.appendChild(val);
      card.appendChild(unit);
      container.appendChild(card);
    });

    showScreen('result');
  }

  /* ─────────────────────────────────────────
     Button Handlers
  ───────────────────────────────────────── */
  document.getElementById('playBtn').addEventListener('click', function () {
    startCountdown(startGame);
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    goHome();
  });

  document.getElementById('retryBtn').addEventListener('click', function () {
    startCountdown(startGame);
  });

  document.getElementById('homeBtn').addEventListener('click', function () {
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    if (gameRunning) {
      if (mainTimer) mainTimer.stop();
      gameRunning = false;
      clearAllTimers();
    }
    goHome();
  });

})();
