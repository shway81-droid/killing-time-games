/* games/tic-tac-toe/game.js */

(function () {
  'use strict';

  // --- 화면 전환 ---
  var screens = {
    intro: document.getElementById('introScreen'),
    game:  document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  // --- 사운드 ---
  var sounds = createSoundManager({
    // 마크 놓기: 짧고 경쾌한 클릭음
    place: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    },
    // 승리: 밝은 상승 팡파레
    win: function (ctx) {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    },
    // 무승부: 낮고 짧은 하강음
    draw: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  });

  // 사운드 토글 버튼 동기화
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
  // board[i] = null | 'O' | 'X'
  var board = [];
  var currentPlayer = 'O';   // O가 먼저
  var gameOver = false;

  var WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // 가로
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // 세로
    [0, 4, 8], [2, 4, 6]             // 대각선
  ];

  // --- DOM 참조 ---
  var boardEl    = document.getElementById('board');
  var cells      = boardEl.querySelectorAll('.cell');
  var turnDot    = document.getElementById('turnDot');
  var turnText   = document.getElementById('turnText');
  var resultEmoji = document.getElementById('resultEmoji');
  var resultTitle = document.getElementById('resultTitle');
  var resultSub   = document.getElementById('resultSub');

  // --- SVG 마크 생성 ---
  function makeSvgO() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.classList.add('cell-mark', 'mark-o');

    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '30');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#29B6F6');
    circle.setAttribute('stroke-width', '10');
    circle.setAttribute('stroke-linecap', 'round');

    svg.appendChild(circle);
    return svg;
  }

  function makeSvgX() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.classList.add('cell-mark', 'mark-x');

    var line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '20'); line1.setAttribute('y1', '20');
    line1.setAttribute('x2', '80'); line1.setAttribute('y2', '80');
    line1.setAttribute('stroke', '#EF5350');
    line1.setAttribute('stroke-width', '10');
    line1.setAttribute('stroke-linecap', 'round');

    var line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '80'); line2.setAttribute('y1', '20');
    line2.setAttribute('x2', '20'); line2.setAttribute('y2', '80');
    line2.setAttribute('stroke', '#EF5350');
    line2.setAttribute('stroke-width', '10');
    line2.setAttribute('stroke-linecap', 'round');

    svg.appendChild(line1);
    svg.appendChild(line2);
    return svg;
  }

  // --- 턴 UI 업데이트 ---
  function updateTurnUI() {
    if (currentPlayer === 'O') {
      turnDot.classList.remove('x-turn');
      turnText.textContent = 'O의 차례';
    } else {
      turnDot.classList.add('x-turn');
      turnText.textContent = 'X의 차례';
    }
  }

  // --- 승리 체크 ---
  function checkWin(player) {
    for (var i = 0; i < WIN_LINES.length; i++) {
      var line = WIN_LINES[i];
      if (board[line[0]] === player &&
          board[line[1]] === player &&
          board[line[2]] === player) {
        return line;
      }
    }
    return null;
  }

  function checkDraw() {
    return board.every(function (cell) { return cell !== null; });
  }

  // --- 셀 클릭 처리 ---
  function handleCellTap(index) {
    if (gameOver) return;
    if (board[index] !== null) return;

    // 마크 배치
    board[index] = currentPlayer;
    var cell = cells[index];
    var mark = currentPlayer === 'O' ? makeSvgO() : makeSvgX();
    cell.appendChild(mark);
    cell.setAttribute('data-mark', currentPlayer);
    sounds.play('place');

    // 승리 체크
    var winLine = checkWin(currentPlayer);
    if (winLine) {
      gameOver = true;
      boardEl.classList.add('done');
      // 승리 셀 강조
      var winClass = currentPlayer === 'O' ? 'win-o' : 'win-x';
      winLine.forEach(function (idx) {
        cells[idx].classList.add(winClass);
      });
      sounds.play('win');
      setTimeout(function () { showResult('win', currentPlayer); }, 700);
      return;
    }

    // 무승부 체크
    if (checkDraw()) {
      gameOver = true;
      boardEl.classList.add('done');
      sounds.play('draw');
      setTimeout(function () { showResult('draw', null); }, 400);
      return;
    }

    // 다음 차례
    currentPlayer = currentPlayer === 'O' ? 'X' : 'O';
    updateTurnUI();
  }

  // 각 셀에 탭 이벤트 연결
  cells.forEach(function (cell) {
    var index = parseInt(cell.getAttribute('data-index'), 10);
    onTap(cell, function () {
      handleCellTap(index);
    });
  });

  // --- 결과 화면 ---
  function showResult(type, winner) {
    if (type === 'win') {
      if (winner === 'O') {
        resultEmoji.textContent = '🎉';
        resultTitle.textContent = 'O 승리!';
        resultTitle.className = 'result-title o-win';
        resultSub.textContent = 'O가 3줄을 완성했어요!';
      } else {
        resultEmoji.textContent = '🎉';
        resultTitle.textContent = 'X 승리!';
        resultTitle.className = 'result-title x-win';
        resultSub.textContent = 'X가 3줄을 완성했어요!';
      }
    } else {
      resultEmoji.textContent = '🤝';
      resultTitle.textContent = '무승부!';
      resultTitle.className = 'result-title draw';
      resultSub.textContent = '아무도 이기지 못했어요. 다시 해봐요!';
    }
    showScreen('result');
  }

  // --- 게임 초기화 ---
  function initGame() {
    board = [null, null, null, null, null, null, null, null, null];
    currentPlayer = 'O';
    gameOver = false;

    boardEl.classList.remove('done');

    cells.forEach(function (cell) {
      // 기존 마크 제거
      var mark = cell.querySelector('.cell-mark');
      if (mark) cell.removeChild(mark);
      cell.removeAttribute('data-mark');
      cell.classList.remove('win-o', 'win-x');
    });

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
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    goHome();
  });

})();
