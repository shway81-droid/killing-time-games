/* games/whack-a-mole/game.js */

(function() {
  'use strict';

  // --- 화면 전환 ---
  var screens = {
    intro: document.getElementById('introScreen'),
    countdown: document.getElementById('countdownScreen'),
    game: document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function(key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  // --- 사운드 ---
  var sounds = createSoundManager({
    pop: function(ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    },
    hit: function(ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    },
    fanfare: function(ctx) {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    }
  });

  // 사운드 토글 버튼들
  var soundBtns = [
    document.getElementById('soundToggleIntro'),
    document.getElementById('soundToggleGame')
  ];

  function updateSoundBtns() {
    var icon = sounds.isMuted() ? '🔇' : '🔊';
    soundBtns.forEach(function(btn) { btn.textContent = icon; });
  }

  soundBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });

  updateSoundBtns();

  // --- 카운트다운 ---
  var countdownEl = document.getElementById('countdownNumber');

  function startCountdown(onDone) {
    var count = 3;
    countdownEl.textContent = count;
    showScreen('countdown');

    var interval = setInterval(function() {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        onDone();
      } else {
        countdownEl.textContent = count;
        // 팝 애니메이션 리셋
        countdownEl.style.animation = 'none';
        countdownEl.offsetHeight; // reflow
        countdownEl.style.animation = '';
      }
    }, 1000);
  }

  // --- 게임 상태 ---
  var GAME_DURATION = 30;
  var holes = document.querySelectorAll('.hole');
  var scoreDisplay = document.getElementById('scoreDisplay');
  var timerBar = document.getElementById('timerBar');
  var finalScoreEl = document.getElementById('finalScore');

  var scoreboard = createScoreboard(scoreDisplay);
  var timer = null;
  var moleTimers = [];
  var gameRunning = false;

  // 난이도: 시간 경과에 따라 노출 시간 감소
  function getMoleShowTime(remaining) {
    // 30초 → 1500ms, 0초 → 800ms (선형 감소)
    var ratio = remaining / GAME_DURATION;
    return 800 + ratio * 700;
  }

  function getRandomHole() {
    var available = [];
    holes.forEach(function(hole, i) {
      if (!hole.classList.contains('active')) {
        available.push(i);
      }
    });
    if (available.length === 0) return -1;
    return available[Math.floor(Math.random() * available.length)];
  }

  function showMole() {
    if (!gameRunning) return;

    // 동시 최대 2마리
    var activeCount = document.querySelectorAll('.hole.active').length;
    if (activeCount >= 2) return;

    var idx = getRandomHole();
    if (idx === -1) return;

    var hole = holes[idx];
    hole.classList.add('active');
    sounds.play('pop');

    var remaining = timer ? GAME_DURATION : 0; // approximate
    var showTime = getMoleShowTime(remaining);

    var hideTimer = setTimeout(function() {
      hole.classList.remove('active');
    }, showTime);
    moleTimers.push(hideTimer);
  }

  function spawnLoop() {
    if (!gameRunning) return;
    showMole();
    // 다음 두더지: 600~1200ms 랜덤 간격
    var delay = 600 + Math.random() * 600;
    var t = setTimeout(spawnLoop, delay);
    moleTimers.push(t);
  }

  // 두더지 터치 처리
  holes.forEach(function(hole) {
    onTap(hole, function(e) {
      if (!gameRunning) return;
      if (!hole.classList.contains('active')) return;

      hole.classList.remove('active');
      hole.classList.add('hit');
      scoreboard.add(10);
      sounds.play('hit');

      // 히트 이펙트
      var star = document.createElement('div');
      star.className = 'hit-effect';
      star.textContent = '⭐';
      hole.appendChild(star);
      setTimeout(function() {
        hole.classList.remove('hit');
        if (star.parentNode) star.parentNode.removeChild(star);
      }, 400);
    });
  });

  // --- 게임 시작 ---
  function startGame() {
    gameRunning = true;
    scoreboard.reset();
    timerBar.style.width = '100%';

    showScreen('game');

    var remaining = GAME_DURATION;

    timer = createTimer(GAME_DURATION, function(rem) {
      remaining = rem;
      timerBar.style.width = (rem / GAME_DURATION * 100) + '%';
    }, function() {
      endGame();
    });

    timer.start();
    spawnLoop();
  }

  function endGame() {
    gameRunning = false;
    // 모든 두더지 타이머 정리
    moleTimers.forEach(clearTimeout);
    moleTimers = [];
    // 모든 활성 두더지 숨기기
    holes.forEach(function(hole) {
      hole.classList.remove('active', 'hit');
    });

    sounds.play('fanfare');

    finalScoreEl.textContent = scoreboard.get();
    showScreen('result');
  }

  // --- 버튼 이벤트 ---
  document.getElementById('playBtn').addEventListener('click', function() {
    startCountdown(startGame);
  });

  document.getElementById('retryBtn').addEventListener('click', function() {
    startCountdown(startGame);
  });

  document.getElementById('homeBtn').addEventListener('click', function() {
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function() {
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function() {
    if (gameRunning) {
      timer.stop();
      gameRunning = false;
      moleTimers.forEach(clearTimeout);
      moleTimers = [];
      holes.forEach(function(hole) {
        hole.classList.remove('active', 'hit');
      });
    }
    goHome();
  });

})();
