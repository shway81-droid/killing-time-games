/* games/whack-a-mole/game.js */
(function () {
  'use strict';

  var GAME_DURATION = 30;
  var MOLE_SVG = '<svg viewBox="0 0 100 90"><ellipse cx="50" cy="65" rx="32" ry="22" fill="#8D6E63"/><ellipse cx="50" cy="42" rx="28" ry="26" fill="#A1887F"/><circle cx="26" cy="24" r="10" fill="#8D6E63"/><circle cx="26" cy="24" r="6" fill="#D7837F"/><circle cx="74" cy="24" r="10" fill="#8D6E63"/><circle cx="74" cy="24" r="6" fill="#D7837F"/><ellipse cx="38" cy="38" rx="6" ry="7" fill="#FFF"/><ellipse cx="39" cy="40" rx="3.5" ry="4.5" fill="#333"/><circle cx="40" cy="38" r="1.2" fill="#FFF"/><ellipse cx="62" cy="38" rx="6" ry="7" fill="#FFF"/><ellipse cx="63" cy="40" rx="3.5" ry="4.5" fill="#333"/><circle cx="64" cy="38" r="1.2" fill="#FFF"/><ellipse cx="50" cy="50" rx="5" ry="3.5" fill="#D7837F"/><path d="M43 56 Q50 63 57 56" fill="none" stroke="#6D4C41" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="28" cy="50" rx="7" ry="4" fill="#FFAB91" opacity="0.5"/><ellipse cx="72" cy="50" rx="7" ry="4" fill="#FFAB91" opacity="0.5"/></svg>';

  var PLAYER_NAMES = ['P1', 'P2', 'P3', 'P4'];
  var PLAYER_COLORS = ['#1565C0', '#C62828', '#2E7D32', '#E65100'];

  // ===== 화면 =====
  var screens = {
    intro: document.getElementById('introScreen'),
    countdown: document.getElementById('countdownScreen'),
    game: document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  // ===== 사운드 =====
  var sounds = createSoundManager({
    pop: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    },
    hit: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    },
    fanfare: function (ctx) {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    }
  });

  // 사운드 버튼
  var soundBtnIntro = document.getElementById('soundToggleIntro');

  function updateSoundBtn() {
    soundBtnIntro.textContent = sounds.isMuted() ? '🔇' : '🔊';
  }

  soundBtnIntro.addEventListener('click', function () {
    sounds.toggleMute();
    updateSoundBtn();
  });
  updateSoundBtn();

  // ===== 인원 선택 =====
  var selectedCount = 2;
  var playerBtns = document.querySelectorAll('.player-btn');

  playerBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedCount = parseInt(btn.dataset.count, 10);
      playerBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // ===== 카운트다운 =====
  var countdownEl = document.getElementById('countdownNumber');
  var countdownTimers = [];

  function clearCountdownTimers() {
    countdownTimers.forEach(clearTimeout);
    countdownTimers = [];
  }

  function startCountdown(onDone) {
    showScreen('countdown');
    var count = 3;
    countdownEl.textContent = count;

    function tick() {
      count--;
      if (count <= 0) {
        onDone();
        return;
      }
      countdownEl.textContent = count;
      countdownEl.style.animation = 'none';
      void countdownEl.offsetHeight;
      countdownEl.style.animation = '';
      var t = setTimeout(tick, 1000);
      countdownTimers.push(t);
    }

    var t = setTimeout(tick, 1000);
    countdownTimers.push(t);
  }

  // ===== 게임 상태 =====
  var gameRunning = false;
  var playerCount = 2;
  var playerScores = [];      // [p0score, p1score, ...]
  var zoneHoles = [];         // array of NodeList per player
  var allTimers = [];         // every setTimeout ref for cleanup
  var gameTimer = null;
  var timerRemaining = GAME_DURATION;

  // HUD refs
  var timerFill = document.getElementById('timerFill');
  var timerText = document.getElementById('timerText');
  var hudScoresEl = document.getElementById('hudScores');

  // ===== 구역 구성 =====
  function buildZones(count) {
    var zonesEl = document.getElementById('gameZones');
    zonesEl.innerHTML = '';
    zonesEl.className = 'game-zones layout-' + count;

    hudScoresEl.innerHTML = '';
    playerScores = [];
    zoneHoles = [];

    for (var p = 0; p < count; p++) {
      // zone
      var zone = document.createElement('div');
      zone.className = 'player-zone';
      zone.dataset.player = p + 1;

      // label
      var label = document.createElement('div');
      label.className = 'zone-label';
      label.textContent = PLAYER_NAMES[p];
      zone.appendChild(label);

      // score display inside zone
      var scoreEl = document.createElement('div');
      scoreEl.className = 'zone-score';
      scoreEl.id = 'zoneScore' + p;
      scoreEl.textContent = '0';
      zone.appendChild(scoreEl);

      // 3x3 grid
      var grid = document.createElement('div');
      grid.className = 'mole-grid';

      for (var h = 0; h < 9; h++) {
        var hole = document.createElement('div');
        hole.className = 'hole';
        hole.dataset.player = p;
        hole.dataset.hole = h;

        var mole = document.createElement('div');
        mole.className = 'mole';
        mole.innerHTML = MOLE_SVG;
        hole.appendChild(mole);

        // hit handler
        (function (holeEl, playerIdx) {
          onTap(holeEl, function () {
            if (!gameRunning) return;
            if (!holeEl.classList.contains('active')) return;

            holeEl.classList.remove('active');
            holeEl.classList.add('hit');
            sounds.play('hit');
            addScore(playerIdx, 1);

            // star effect
            var star = document.createElement('div');
            star.className = 'hit-effect';
            star.textContent = '⭐';
            holeEl.appendChild(star);

            var t = setTimeout(function () {
              holeEl.classList.remove('hit');
              if (star.parentNode) star.parentNode.removeChild(star);
            }, 420);
            allTimers.push(t);
          });
        })(hole, p);

        grid.appendChild(hole);
      }

      zone.appendChild(grid);
      zonesEl.appendChild(zone);

      // collect holes per player
      zoneHoles.push(grid.querySelectorAll('.hole'));
      playerScores.push(0);

      // HUD chip
      var chip = document.createElement('div');
      chip.className = 'hud-score-chip';
      chip.dataset.player = p + 1;
      chip.id = 'hudChip' + p;
      chip.textContent = PLAYER_NAMES[p] + ' 0';
      hudScoresEl.appendChild(chip);
    }
  }

  function addScore(playerIdx, amount) {
    playerScores[playerIdx] += amount;
    var val = playerScores[playerIdx];

    var zoneScoreEl = document.getElementById('zoneScore' + playerIdx);
    if (zoneScoreEl) zoneScoreEl.textContent = val;

    var chip = document.getElementById('hudChip' + playerIdx);
    if (chip) chip.textContent = PLAYER_NAMES[playerIdx] + ' ' + val;
  }

  // ===== 두더지 로직 (per-zone) =====
  function getMoleShowTime(remaining) {
    // 30s -> 1500ms, 0s -> 800ms
    var ratio = remaining / GAME_DURATION;
    return 800 + ratio * 700;
  }

  function spawnZone(playerIdx) {
    if (!gameRunning) return;

    var holes = zoneHoles[playerIdx];
    var activeCount = 0;
    var available = [];

    holes.forEach(function (h) {
      if (h.classList.contains('active')) {
        activeCount++;
      } else if (!h.classList.contains('hit')) {
        available.push(h);
      }
    });

    // max 2 moles per zone
    if (activeCount < 2 && available.length > 0) {
      var hole = available[Math.floor(Math.random() * available.length)];
      hole.classList.add('active');
      sounds.play('pop');

      var showTime = getMoleShowTime(timerRemaining);
      var t = setTimeout(function () {
        hole.classList.remove('active');
      }, showTime);
      allTimers.push(t);
    }

    // next spawn: 500~1000ms
    var delay = 500 + Math.random() * 500;
    var t2 = setTimeout(function () { spawnZone(playerIdx); }, delay);
    allTimers.push(t2);
  }

  // ===== 게임 시작/종료 =====
  function startGame() {
    playerCount = selectedCount;
    buildZones(playerCount);

    gameRunning = true;
    timerRemaining = GAME_DURATION;
    timerFill.style.width = '100%';
    timerText.textContent = GAME_DURATION;

    showScreen('game');

    gameTimer = createTimer(GAME_DURATION, function (rem) {
      timerRemaining = rem;
      var pct = (rem / GAME_DURATION * 100);
      timerFill.style.width = pct + '%';
      timerText.textContent = rem;
    }, function () {
      endGame();
    });

    gameTimer.start();

    // start spawn loop per zone
    for (var p = 0; p < playerCount; p++) {
      (function (idx) {
        var initialDelay = Math.random() * 400;
        var t = setTimeout(function () { spawnZone(idx); }, initialDelay);
        allTimers.push(t);
      })(p);
    }
  }

  function endGame() {
    gameRunning = false;

    // cleanup all timers
    allTimers.forEach(clearTimeout);
    allTimers = [];

    // hide all moles
    zoneHoles.forEach(function (holes) {
      holes.forEach(function (h) {
        h.classList.remove('active', 'hit');
      });
    });

    sounds.play('fanfare');
    showResult();
  }

  function cleanupGame() {
    if (gameTimer) { gameTimer.stop(); gameTimer = null; }
    gameRunning = false;
    allTimers.forEach(clearTimeout);
    allTimers = [];
    clearCountdownTimers();
  }

  // ===== 결과 화면 =====
  function showResult() {
    // find winner (highest score, ties: first player wins)
    var maxScore = -1;
    var winnerIdx = 0;
    playerScores.forEach(function (s, i) {
      if (s > maxScore) { maxScore = s; winnerIdx = i; }
    });

    var isTie = playerScores.filter(function (s) { return s === maxScore; }).length > 1;

    var winnerLabel = document.getElementById('resultWinnerLabel');
    var winnerName = document.getElementById('resultWinnerName');
    var resultScoresEl = document.getElementById('resultScores');

    winnerLabel.textContent = isTie ? '동점!' : '승자';
    winnerName.textContent = isTie ? '무승부' : PLAYER_NAMES[winnerIdx];
    winnerName.style.color = isTie ? '#888' : PLAYER_COLORS[winnerIdx];

    // build score rows sorted by score desc
    var order = playerScores.map(function (s, i) { return { s: s, i: i }; });
    order.sort(function (a, b) { return b.s - a.s; });

    resultScoresEl.innerHTML = '';
    order.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'result-score-row' + (item.i === winnerIdx && !isTie ? ' winner' : '');
      row.dataset.player = item.i + 1;

      var nameEl = document.createElement('div');
      nameEl.className = 'result-score-name';
      nameEl.textContent = (item.i === winnerIdx && !isTie ? '🏆 ' : '') + PLAYER_NAMES[item.i];

      var valEl = document.createElement('div');
      valEl.className = 'result-score-val';
      valEl.textContent = item.s + '점';

      row.appendChild(nameEl);
      row.appendChild(valEl);
      resultScoresEl.appendChild(row);
    });

    showScreen('result');
  }

  // ===== 버튼 이벤트 =====
  document.getElementById('playBtn').addEventListener('click', function () {
    startCountdown(startGame);
  });

  document.getElementById('retryBtn').addEventListener('click', function () {
    cleanupGame();
    startCountdown(startGame);
  });

  document.getElementById('homeBtn').addEventListener('click', function () {
    cleanupGame();
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    cleanupGame();
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    cleanupGame();
    goHome();
  });

  // cleanup on page unload
  window.addEventListener('beforeunload', cleanupGame);
  window.addEventListener('pagehide', cleanupGame);

})();
