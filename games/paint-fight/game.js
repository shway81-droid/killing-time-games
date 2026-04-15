/* games/paint-fight/game.js */

(function () {
  'use strict';

  // ===================================
  // 상수 & 설정
  // ===================================
  var TOTAL_TIME = 30; // 초

  var PLAYERS = [
    { id: 1, name: '플레이어 1', color: '#29B6F6', label: 'P1' },
    { id: 2, name: '플레이어 2', color: '#EF5350', label: 'P2' },
    { id: 3, name: '플레이어 3', color: '#66BB6A', label: 'P3' },
    { id: 4, name: '플레이어 4', color: '#FFA726', label: 'P4' }
  ];

  var MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];

  // 플레이어 수별 그리드 크기
  var GRID_SIZE = { 2: 8, 3: 8, 4: 8 };

  // ===================================
  // 사운드
  // ===================================
  var sounds = createSoundManager({
    // 페인트 칠하기: 퍼지는 짧은 음
    paint: function (ctx) {
      var buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.8;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    },

    // 상대 칸 덧칠: 약간 다른 톤
    overPaint: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    },

    // 경고: 타이머 10초 이하
    warning: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    },

    // 팡파레: 게임 종료
    fanfare: function (ctx) {
      var notes = [523, 659, 784, 1047, 1319];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
    }
  });

  // ===================================
  // 화면 전환
  // ===================================
  var screens = {
    intro:  document.getElementById('introScreen'),
    game:   document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  // ===================================
  // 사운드 토글
  // ===================================
  var soundBtns = [
    document.getElementById('soundToggleIntro'),
    document.getElementById('soundToggleGame')
  ];

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

  // ===================================
  // 인트로: 플레이어 수 선택
  // ===================================
  var selectedCount = 2;
  var countBtns = document.querySelectorAll('.count-btn');
  var playerColorsPreview = document.getElementById('playerColorsPreview');

  function updateCountSelection(count) {
    selectedCount = count;
    countBtns.forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === count);
    });
    renderColorChips(count);
  }

  function renderColorChips(count) {
    playerColorsPreview.innerHTML = '';
    for (var i = 0; i < PLAYERS.length; i++) {
      var p = PLAYERS[i];
      var chip = document.createElement('div');
      chip.className = 'player-color-chip' + (i >= count ? ' hidden' : '');
      chip.innerHTML =
        '<div class="chip-dot" style="background:' + p.color + '"></div>' +
        '<span>' + p.name + '</span>';
      playerColorsPreview.appendChild(chip);
    }
  }

  countBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      updateCountSelection(parseInt(btn.dataset.count, 10));
    });
  });

  renderColorChips(2); // 초기 렌더

  // ===================================
  // 게임 상태
  // ===================================
  var gridSize;
  var totalCells;
  var board;           // board[idx] = playerIndex (0-based) | -1 (empty)
  var activePlayers;   // PLAYERS 배열 슬라이스
  var currentTurn;     // 0-based index into activePlayers
  var gameOver;
  var timer;
  var lastPaintedIdx = -1; // 최근에 칠한 셀 인덱스

  // DOM
  var paintGridEl      = document.getElementById('paintGrid');
  var scoreboardEl     = document.getElementById('scoreboard');
  var turnBannerEl     = document.getElementById('turnBanner');
  var turnBannerNameEl = document.getElementById('turnBannerName');
  var timerTextEl      = document.getElementById('timerText');
  var timerBarFillEl   = document.getElementById('timerBarFill');

  // ===================================
  // 그리드 생성
  // ===================================
  function buildGrid() {
    paintGridEl.innerHTML = '';

    var cellSize = calcCellSize(gridSize);

    paintGridEl.style.gridTemplateColumns = 'repeat(' + gridSize + ', ' + cellSize + 'px)';
    paintGridEl.style.gridTemplateRows    = 'repeat(' + gridSize + ', ' + cellSize + 'px)';

    for (var i = 0; i < totalCells; i++) {
      var cell = document.createElement('div');
      cell.className = 'paint-cell';
      cell.dataset.index = i;
      cell.style.width  = cellSize + 'px';
      cell.style.height = cellSize + 'px';

      // 터치 + 클릭 모두 지원
      (function (idx) {
        cell.addEventListener('touchstart', function (e) {
          e.preventDefault();
          handleCellTap(idx);
        }, { passive: false });
        cell.addEventListener('click', function () {
          handleCellTap(idx);
        });
      })(i);

      paintGridEl.appendChild(cell);
    }
  }

  function calcCellSize(size) {
    // 화면 크기에 맞춰 셀 크기 계산
    var maxW = Math.min(window.innerWidth - 24, 500);
    var maxH = Math.min(window.innerHeight - 200, 600);
    var available = Math.min(maxW, maxH);
    var gap = 3;
    var padding = 6;
    var cellPx = Math.floor((available - padding * 2 - gap * (size - 1)) / size);
    return Math.max(cellPx, 12);
  }

  // ===================================
  // 점수판 렌더
  // ===================================
  function buildScoreboard() {
    scoreboardEl.innerHTML = '';
    activePlayers.forEach(function (p, i) {
      var chip = document.createElement('div');
      chip.className = 'score-chip' + (i === currentTurn ? ' current-turn' : '');
      chip.id = 'scoreChip' + i;
      chip.innerHTML =
        '<div class="score-dot" style="background:' + p.color + '"></div>' +
        '<span class="score-label">' + p.label + '</span>' +
        '<span class="score-value" id="scoreVal' + i + '">0</span>';
      scoreboardEl.appendChild(chip);
    });
  }

  function updateScoreboard() {
    var counts = countCells();
    activePlayers.forEach(function (p, i) {
      var valEl = document.getElementById('scoreVal' + i);
      var chipEl = document.getElementById('scoreChip' + i);
      if (valEl) valEl.textContent = counts[i];
      if (chipEl) chipEl.classList.toggle('current-turn', i === currentTurn);
    });
  }

  function countCells() {
    var counts = new Array(activePlayers.length).fill(0);
    for (var i = 0; i < totalCells; i++) {
      if (board[i] >= 0) counts[board[i]]++;
    }
    return counts;
  }

  // ===================================
  // 턴 배너 업데이트
  // ===================================
  function updateTurnBanner() {
    var p = activePlayers[currentTurn];
    turnBannerNameEl.textContent = p.name;
    turnBannerNameEl.style.color = p.color;
    turnBannerEl.style.background =
      'linear-gradient(90deg, transparent, ' + hexToRgba(p.color, 0.12) + ', transparent)';
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ===================================
  // 셀 탭 처리
  // ===================================
  function handleCellTap(idx) {
    if (gameOver) return;

    var wasEmpty = board[idx] < 0;
    var wasOpponent = !wasEmpty && board[idx] !== currentTurn;

    // 이미 자기 색이면 무시하지 않고 진행 (효과음만 다름)
    // 자기 색이면 덧칠 의미 없으나 턴은 소비
    board[idx] = currentTurn;

    // 셀 색 업데이트
    var cells = paintGridEl.querySelectorAll('.paint-cell');
    var cellEl = cells[idx];
    var p = activePlayers[currentTurn];
    cellEl.style.background = p.color;
    cellEl.classList.add('painted');

    // 최근 칠한 셀 강조 제거
    if (lastPaintedIdx >= 0 && lastPaintedIdx !== idx) {
      cells[lastPaintedIdx].classList.remove('just-painted');
    }
    cellEl.classList.add('just-painted');
    lastPaintedIdx = idx;

    // 애니메이션 재트리거
    cellEl.addEventListener('animationend', function handler() {
      cellEl.classList.remove('painted');
      cellEl.removeEventListener('animationend', handler);
    });

    // 사운드
    if (wasOpponent) {
      sounds.play('overPaint');
    } else {
      sounds.play('paint');
    }

    // 점수 업데이트
    updateScoreboard();

    // 다음 턴
    currentTurn = (currentTurn + 1) % activePlayers.length;
    updateTurnBanner();
    updateScoreboard();
  }

  // ===================================
  // 타이머
  // ===================================
  function startTimer() {
    var remaining = TOTAL_TIME;

    timerTextEl.textContent = remaining;
    timerTextEl.className = 'timer-text';
    timerBarFillEl.style.width = '100%';
    timerBarFillEl.className = 'timer-bar-fill';

    timer = createTimer(TOTAL_TIME,
      function onTick(rem) {
        remaining = rem;
        timerTextEl.textContent = rem;

        // 프로그레스 바
        var pct = (rem / TOTAL_TIME) * 100;
        timerBarFillEl.style.width = pct + '%';

        if (rem <= 5) {
          timerTextEl.className = 'timer-text danger';
          timerBarFillEl.className = 'timer-bar-fill danger';
          sounds.play('warning');
        } else if (rem <= 10) {
          timerTextEl.className = 'timer-text warning';
          timerBarFillEl.className = 'timer-bar-fill warning';
          sounds.play('warning');
        }
      },
      function onEnd() {
        endGame();
      }
    );

    timer.start();
  }

  // ===================================
  // 게임 종료
  // ===================================
  function endGame() {
    gameOver = true;
    sounds.play('fanfare');
    setTimeout(function () {
      showResultScreen();
    }, 600);
  }

  // ===================================
  // 결과 화면
  // ===================================
  function showResultScreen() {
    var counts = countCells();
    var maxCount = Math.max.apply(null, counts);

    // 승자 결정 (동점 처리)
    var winnerIndices = [];
    counts.forEach(function (c, i) {
      if (c === maxCount) winnerIndices.push(i);
    });

    var isDraw = winnerIndices.length > 1;
    var winnerName = isDraw
      ? '무승부!'
      : activePlayers[winnerIndices[0]].name + ' 승리!';

    // 결과 미니 그리드
    renderResultGrid();

    // 승자 발표
    var trophyEl = document.querySelector('.result-trophy');
    var winnerNameEl = document.getElementById('resultWinnerName');
    trophyEl.textContent = isDraw ? '🤝' : '🏆';
    trophyEl.className = 'result-trophy' + (isDraw ? ' draw' : '');
    winnerNameEl.textContent = winnerName;
    if (!isDraw) {
      winnerNameEl.style.color = activePlayers[winnerIndices[0]].color;
    } else {
      winnerNameEl.style.color = '';
    }

    // 순위별 점수 목록
    var resultScoresEl = document.getElementById('resultScores');
    resultScoresEl.innerHTML = '';

    // 정렬
    var ranked = counts.map(function (c, i) {
      return { playerIdx: i, count: c };
    });
    ranked.sort(function (a, b) { return b.count - a.count; });

    ranked.forEach(function (item, rankIdx) {
      var p = activePlayers[item.playerIdx];
      var row = document.createElement('div');
      row.className = 'result-score-row' + (rankIdx === 0 ? ' rank-1' : '');

      var isWinner = rankIdx === 0 && !isDraw;
      row.innerHTML =
        '<span class="rank-medal">' + MEDALS[rankIdx] + '</span>' +
        '<div class="result-player-dot" style="background:' + p.color + '"></div>' +
        '<span class="result-player-name">' + p.name + '</span>' +
        '<span class="result-cell-count">' + item.count + '</span>' +
        '<span class="result-cell-label">칸</span>';

      resultScoresEl.appendChild(row);

      // 애니메이션 딜레이
      row.style.opacity = '0';
      row.style.transform = 'translateX(-20px)';
      setTimeout(function () {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, rankIdx * 120 + 100);
    });

    showScreen('result');
  }

  function renderResultGrid() {
    var miniGridEl = document.getElementById('resultMiniGrid');
    miniGridEl.innerHTML = '';

    var miniCellSize = Math.floor(180 / gridSize);
    miniGridEl.style.gridTemplateColumns = 'repeat(' + gridSize + ', ' + miniCellSize + 'px)';
    miniGridEl.style.gridTemplateRows    = 'repeat(' + gridSize + ', ' + miniCellSize + 'px)';

    for (var i = 0; i < totalCells; i++) {
      var cell = document.createElement('div');
      cell.className = 'result-mini-cell';
      cell.style.width  = miniCellSize + 'px';
      cell.style.height = miniCellSize + 'px';
      if (board[i] >= 0) {
        cell.style.background = activePlayers[board[i]].color;
      } else {
        cell.style.background = '#CCC';
      }
      miniGridEl.appendChild(cell);
    }
  }

  // ===================================
  // 게임 초기화
  // ===================================
  function initGame(count) {
    gameOver = false;
    currentTurn = 0;
    lastPaintedIdx = -1;

    activePlayers = PLAYERS.slice(0, count);
    gridSize = GRID_SIZE[count] || 8;
    totalCells = gridSize * gridSize;
    board = new Array(totalCells).fill(-1);

    // 그리드 구축
    buildGrid();

    // 점수판 구축
    buildScoreboard();

    // 턴 배너
    updateTurnBanner();

    // 타이머 시작
    if (timer) timer.stop();
    startTimer();

    showScreen('game');
  }

  // ===================================
  // 버튼 이벤트
  // ===================================
  document.getElementById('playBtn').addEventListener('click', function () {
    initGame(selectedCount);
  });

  document.getElementById('retryBtn').addEventListener('click', function () {
    if (timer) timer.stop();
    initGame(selectedCount);
  });

  document.getElementById('homeBtn').addEventListener('click', function () {
    if (timer) timer.stop();
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    if (timer) timer.stop();
    showScreen('intro');
  });

  // ===================================
  // 초기 상태
  // ===================================
  updateCountSelection(2);

})();
