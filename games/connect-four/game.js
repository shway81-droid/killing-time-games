/* games/connect-four/game.js */

(function () {
  'use strict';

  var COLS = 7;
  var ROWS = 6;

  // --- 화면 전환 ---
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

  // --- 사운드 ---
  var sounds = createSoundManager({
    // 피스 낙하: 짧은 통통 소리
    drop: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    },
    // 승리 팡파레: 밝게 상승하는 화음
    win: function (ctx) {
      var notes = [523, 659, 784, 1047, 1319];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(0.20, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      // 베이스 드럼 효과
      var noise = ctx.createOscillator();
      var noiseGain = ctx.createGain();
      noise.type = 'sine';
      noise.frequency.setValueAtTime(80, ctx.currentTime);
      noise.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
      noiseGain.gain.setValueAtTime(0.35, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + 0.15);
    },
    // 무승부: 낮고 무거운 하강음
    draw: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.55);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    }
  });

  // 사운드 토글 버튼
  var soundBtns = [
    document.getElementById('soundToggleIntro'),
    document.getElementById('soundToggleGame')
  ];

  function updateSoundBtns() {
    var icon = sounds.isMuted() ? '🔇' : '🔊';
    soundBtns.forEach(function (btn) { btn.textContent = icon; });
  }

  soundBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });

  updateSoundBtns();

  // --- 게임 상태 ---
  // board[row][col] = 0 (빈) | 1 (플레이어1) | 2 (플레이어2)
  var board = [];
  var currentPlayer = 1;
  var gameOver = false;
  var dropping = false; // 낙하 애니메이션 중 입력 차단

  // 낙하 애니메이션 타이머 ID (네비게이션 시 취소용)
  var dropTimerId = null;
  var resultTimerId = null;

  // --- DOM 참조 ---
  var boardEl       = document.getElementById('board');
  var boardOuter    = document.getElementById('boardOuter');
  var ghostRow      = document.getElementById('ghostRow');
  var columnOverlay = document.getElementById('columnOverlay');
  var turnPiece     = document.getElementById('turnPiece');
  var turnText      = document.getElementById('turnText');
  var resultEmoji   = document.getElementById('resultEmoji');
  var resultTitle   = document.getElementById('resultTitle');
  var resultSub     = document.getElementById('resultSub');

  // cellEls[row][col] — 실제 DOM 셀
  var cellEls = [];
  // ghostEls[col] — 고스트 피스 DOM
  var ghostEls = [];
  // colTapEls[col] — 열 터치 영역
  var colTapEls = [];

  // --- 보드 DOM 초기화 (1회) ---
  function buildBoardDOM() {
    boardEl.innerHTML = '';
    columnOverlay.innerHTML = '';
    ghostRow.innerHTML = '';

    cellEls = [];
    ghostEls = [];
    colTapEls = [];

    // 셀 생성: row 0 = 맨 위, row 5 = 맨 아래
    for (var r = 0; r < ROWS; r++) {
      cellEls[r] = [];
      for (var c = 0; c < COLS; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('data-row', r);
        cell.setAttribute('data-col', c);
        boardEl.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }

    // 열 오버레이 생성
    for (var c = 0; c < COLS; c++) {
      var tap = document.createElement('div');
      tap.className = 'col-tap';
      tap.setAttribute('data-col', c);
      columnOverlay.appendChild(tap);
      colTapEls[c] = tap;

      // 호버 → 고스트 표시
      (function (col) {
        tap.addEventListener('mouseenter', function () {
          showGhost(col);
        });
        tap.addEventListener('mouseleave', function () {
          hideAllGhosts();
        });
        onTap(tap, function () {
          handleColumnTap(col);
        });
      }(c));
    }

    // 고스트 슬롯 생성
    for (var c = 0; c < COLS; c++) {
      var slot = document.createElement('div');
      slot.className = 'ghost-slot';
      var ghost = document.createElement('div');
      ghost.className = 'ghost-piece';
      slot.appendChild(ghost);
      ghostRow.appendChild(slot);
      ghostEls[c] = ghost;
    }
  }

  // --- 고스트 피스 ---
  function showGhost(col) {
    if (gameOver || dropping) return;
    // 열이 가득 찼으면 표시 안 함
    if (board[0][col] !== 0) return;

    hideAllGhosts();
    var ghost = ghostEls[col];
    ghost.classList.remove('ghost-red', 'ghost-yellow');
    ghost.classList.add(currentPlayer === 1 ? 'ghost-red' : 'ghost-yellow');
    ghost.classList.add('visible');
  }

  function hideAllGhosts() {
    ghostEls.forEach(function (g) {
      g.classList.remove('visible');
    });
  }

  // --- 게임 로직 ---
  function initBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) {
      board[r] = [];
      for (var c = 0; c < COLS; c++) {
        board[r][c] = 0;
      }
    }
  }

  // 가장 낮은 빈 행 반환 (-1이면 열이 가득 참)
  function getDropRow(col) {
    for (var r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) return r;
    }
    return -1;
  }

  // 4개 연결 확인 → 승리 셀 좌표 배열 반환 (없으면 null)
  function checkWin(player) {
    var dirs = [
      [0, 1],   // 가로
      [1, 0],   // 세로
      [1, 1],   // 대각선 ↘
      [1, -1]   // 대각선 ↙
    ];

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (board[r][c] !== player) continue;
        for (var d = 0; d < dirs.length; d++) {
          var dr = dirs[d][0];
          var dc = dirs[d][1];
          var cells = [[r, c]];
          for (var k = 1; k < 4; k++) {
            var nr = r + dr * k;
            var nc = c + dc * k;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
            if (board[nr][nc] !== player) break;
            cells.push([nr, nc]);
          }
          if (cells.length === 4) return cells;
        }
      }
    }
    return null;
  }

  function checkDraw() {
    for (var c = 0; c < COLS; c++) {
      if (board[0][c] === 0) return false;
    }
    return true;
  }

  // --- 턴 UI 업데이트 ---
  function updateTurnUI() {
    if (currentPlayer === 1) {
      turnPiece.classList.remove('player2');
      turnText.textContent = '플레이어 1 차례';
    } else {
      turnPiece.classList.add('player2');
      turnText.textContent = '플레이어 2 차례';
    }
  }

  // --- 열 탭 처리 ---
  function handleColumnTap(col) {
    if (gameOver || dropping) return;

    var row = getDropRow(col);
    if (row === -1) return; // 열이 가득 참

    hideAllGhosts();
    dropping = true;

    // 보드 상태 업데이트
    board[row][col] = currentPlayer;

    // 피스 DOM 생성 및 낙하 애니메이션
    var cell = cellEls[row][col];
    var piece = document.createElement('div');
    piece.className = 'piece ' + (currentPlayer === 1 ? 'player1' : 'player2');

    // 낙하 거리에 따른 애니메이션 속도
    if (row <= 1) {
      piece.classList.add('drop-fast');
    } else if (row <= 3) {
      piece.classList.add('drop-medium');
    } else {
      piece.classList.add('drop-slow');
    }

    cell.appendChild(piece);

    // 다음 프레임에 landed 클래스 추가 → CSS transition 트리거
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        piece.classList.add('landed');
        sounds.play('drop');

        // 낙하 완료 후 체크
        var duration = row <= 1 ? 250 : row <= 3 ? 380 : 520;
        dropTimerId = setTimeout(function () {
          dropTimerId = null;
          if (gameOver) return;
          dropping = false;

          var winCells = checkWin(currentPlayer);
          if (winCells) {
            gameOver = true;
            boardOuter.classList.add('board-done');
            highlightWin(winCells, currentPlayer);
            sounds.play('win');
            resultTimerId = setTimeout(function () {
              resultTimerId = null;
              if (gameOver) showResult('win', currentPlayer);
            }, 900);
            return;
          }

          if (checkDraw()) {
            gameOver = true;
            boardOuter.classList.add('board-done');
            sounds.play('draw');
            resultTimerId = setTimeout(function () {
              resultTimerId = null;
              if (gameOver) showResult('draw', null);
            }, 400);
            return;
          }

          // 다음 차례
          currentPlayer = currentPlayer === 1 ? 2 : 1;
          updateTurnUI();
        }, duration + 50);
      });
    });
  }

  // --- 승리 셀 강조 ---
  function highlightWin(winCells, player) {
    winCells.forEach(function (rc) {
      var r = rc[0];
      var c = rc[1];
      var cell = cellEls[r][c];
      var piece = cell.querySelector('.piece');
      if (piece) {
        piece.classList.add('winning');
      }
    });
  }

  // --- 결과 화면 ---
  function showResult(type, winner) {
    if (type === 'win') {
      if (winner === 1) {
        resultEmoji.textContent = '🎉';
        resultTitle.textContent = '플레이어 1 승리!';
        resultTitle.className = 'result-title p1-win';
        resultSub.textContent = '빨간 말 4개를 연결했어요!';
      } else {
        resultEmoji.textContent = '🎉';
        resultTitle.textContent = '플레이어 2 승리!';
        resultTitle.className = 'result-title p2-win';
        resultSub.textContent = '노란 말 4개를 연결했어요!';
      }
    } else {
      resultEmoji.textContent = '🤝';
      resultTitle.textContent = '무승부!';
      resultTitle.className = 'result-title draw';
      resultSub.textContent = '보드가 가득 찼어요. 다시 해봐요!';
    }
    showScreen('result');
  }

  // --- 타이머 정리 ---
  function clearAnimTimers() {
    if (dropTimerId !== null) {
      clearTimeout(dropTimerId);
      dropTimerId = null;
    }
    if (resultTimerId !== null) {
      clearTimeout(resultTimerId);
      resultTimerId = null;
    }
    dropping = false;
  }

  // --- 게임 초기화 ---
  function initGame() {
    clearAnimTimers();
    initBoard();
    currentPlayer = 1;
    gameOver = false;
    dropping = false;

    boardOuter.classList.remove('board-done');

    // 기존 피스 제거
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = cellEls[r][c];
        var piece = cell.querySelector('.piece');
        if (piece) cell.removeChild(piece);
      }
    }

    hideAllGhosts();
    updateTurnUI();
    showScreen('game');
  }

  // --- 버튼 이벤트 ---
  document.getElementById('playBtn').addEventListener('click', function () {
    initGame();
  });

  document.getElementById('retryBtn').addEventListener('click', function () {
    initGame();
  });

  document.getElementById('homeBtn').addEventListener('click', function () {
    clearAnimTimers();
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    clearAnimTimers();
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    clearAnimTimers();
    goHome();
  });

  // --- 초기 DOM 구축 ---
  buildBoardDOM();

}());
