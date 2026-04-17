/* games/number-bingo/game.js */

(function () {
  'use strict';

  // ── 상수 ──────────────────────────────────────────────────────────────
  var GRID = 5;           // 5x5
  var TARGET_LINES = 3;   // 3줄 완성 시 승리
  var P1 = 0, P2 = 1;
  var P_COLORS = ['#29B6F6', '#EF5350'];
  var P_NAMES  = ['P1', 'P2'];

  // 라인 체크용: 행 5개, 열 5개, 대각선 2개
  var LINES = [];
  (function buildLines() {
    var r, c;
    // rows
    for (r = 0; r < GRID; r++) {
      var row = [];
      for (c = 0; c < GRID; c++) row.push(r * GRID + c);
      LINES.push(row);
    }
    // cols
    for (c = 0; c < GRID; c++) {
      var col = [];
      for (r = 0; r < GRID; r++) col.push(r * GRID + c);
      LINES.push(col);
    }
    // diag TL-BR
    var d1 = [];
    for (r = 0; r < GRID; r++) d1.push(r * GRID + r);
    LINES.push(d1);
    // diag TR-BL
    var d2 = [];
    for (r = 0; r < GRID; r++) d2.push(r * GRID + (GRID - 1 - r));
    LINES.push(d2);
  })();

  // ── DOM ───────────────────────────────────────────────────────────────
  var screens = {
    intro:  document.getElementById('introScreen'),
    game:   document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  var turnDot        = document.getElementById('turnDot');
  var turnText       = document.getElementById('turnText');
  var p1LinesEl      = document.getElementById('p1Lines');
  var p2LinesEl      = document.getElementById('p2Lines');
  var p1DotsEl       = document.getElementById('p1Dots');
  var p2DotsEl       = document.getElementById('p2Dots');
  var p1CounterEl    = document.getElementById('p1Counter');
  var p2CounterEl    = document.getElementById('p2Counter');
  var historyChips   = document.getElementById('historyChips');
  var p1BoardSvg     = document.getElementById('p1Board');
  var p2BoardSvg     = document.getElementById('p2Board');
  var p1OverlayEl    = document.getElementById('p1Overlay');
  var p2OverlayEl    = document.getElementById('p2Overlay');
  var resultWinner   = document.getElementById('resultWinner');
  var resultSubEl    = document.getElementById('resultSub');
  var resultBoardsEl = document.getElementById('resultBoards');

  // ── 사운드 ────────────────────────────────────────────────────────────
  var sounds = createSoundManager({
    // 숫자 호출: 짧고 경쾌한 클릭
    call: function (ctx) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    },
    // 줄 완성: 밝은 딩 두 음
    line: function (ctx) {
      [[700, 0], [900, 0.1], [1100, 0.2]].forEach(function (item) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = item[0];
        var t = ctx.currentTime + item[1];
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    },
    // 승리 팡파레
    win: function (ctx) {
      var notes = [523, 659, 784, 1047, 1319];
      notes.forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    }
  });

  // 사운드 버튼 아이콘 SVG 경로 (mute/unmute)
  var SOUND_ON_PATHS = [
    'M3 8H7L12 3V19L7 14H3V8Z',
    'M15 7C16.5 8.5 16.5 13.5 15 15',
    'M17.5 4.5C20.5 7.5 20.5 14.5 17.5 17.5'
  ];
  var SOUND_OFF_PATH = 'M14 8L20 14M20 8L14 14';

  function updateSoundIcons() {
    var muted = sounds.isMuted();
    ['soundIconIntro', 'soundIconGame'].forEach(function (id) {
      var svg = document.getElementById(id);
      if (!svg) return;
      svg.innerHTML = '';
      if (muted) {
        // Speaker body
        var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p1.setAttribute('d', 'M3 8H7L12 3V19L7 14H3V8Z');
        p1.setAttribute('fill', '#bbb');
        svg.appendChild(p1);
        // X lines
        var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p2.setAttribute('d', 'M15 8L21 14M21 8L15 14');
        p2.setAttribute('stroke', '#bbb');
        p2.setAttribute('stroke-width', '2');
        p2.setAttribute('stroke-linecap', 'round');
        svg.appendChild(p2);
      } else {
        var pBody = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pBody.setAttribute('d', 'M3 8H7L12 3V19L7 14H3V8Z');
        pBody.setAttribute('fill', '#555');
        svg.appendChild(pBody);
        var pw1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pw1.setAttribute('d', 'M15 7C16.5 8.5 16.5 13.5 15 15');
        pw1.setAttribute('stroke', '#555');
        pw1.setAttribute('stroke-width', '2');
        pw1.setAttribute('stroke-linecap', 'round');
        pw1.setAttribute('fill', 'none');
        svg.appendChild(pw1);
        var pw2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pw2.setAttribute('d', 'M17.5 4.5C20.5 7.5 20.5 14.5 17.5 17.5');
        pw2.setAttribute('stroke', '#555');
        pw2.setAttribute('stroke-width', '2');
        pw2.setAttribute('stroke-linecap', 'round');
        pw2.setAttribute('fill', 'none');
        svg.appendChild(pw2);
      }
    });
  }

  ['soundToggleIntro', 'soundToggleGame'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function () {
        sounds.toggleMute();
        updateSoundIcons();
      });
    }
  });
  updateSoundIcons();

  // ── 화면 전환 ─────────────────────────────────────────────────────────
  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  // ── 게임 상태 ─────────────────────────────────────────────────────────
  var boards;         // boards[player][25] = number (1..25)
  var linesDone;      // linesDone[player] = Set of line-index strings completed
  var completedCells; // completedCells[player] = Set of cell indices in a completed line
  var currentPlayer;  // P1 or P2
  var gameOver;
  var calledNumbers;  // array of numbers called so far

  // timers to clean up
  var pendingTimers = [];

  function safeTimeout(fn, ms) {
    var id = setTimeout(fn, ms);
    pendingTimers.push(id);
    return id;
  }

  function clearAllTimers() {
    pendingTimers.forEach(function (id) { clearTimeout(id); });
    pendingTimers = [];
  }

  // cell SVG element references per board
  var cellGroups;  // cellGroups[player][cellIdx] = <g> element

  // ── 숫자 셔플 ─────────────────────────────────────────────────────────
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function makeBoard() {
    var nums = [];
    for (var i = 1; i <= 25; i++) nums.push(i);
    return shuffle(nums);
  }

  // ── 게임 초기화 ────────────────────────────────────────────────────────
  function initGame() {
    clearAllTimers();

    boards = [makeBoard(), makeBoard()];
    markedNums    = {};
    linesDone     = [{}, {}];  // player -> {lineIdx: true}
    completedCells = [[], []]; // track cell indices in completed lines per player
    currentPlayer = P1;
    gameOver      = false;
    calledNumbers = [];
    cellGroups    = [[], []];

    historyChips.innerHTML = '';
    buildBoards();
    updateTurnUI();
    updateLineCounterUI();

    showScreen('game');
  }

  // ── 보드 빌드 (SVG) ────────────────────────────────────────────────────
  function buildBoards() {
    buildBoardSvg(p1BoardSvg, P1);
    buildBoardSvg(p2BoardSvg, P2);
    updateOverlays();
  }

  function getCellSize() {
    // Each board gets roughly half the screen width minus gaps
    var totalW = window.innerWidth - 24 - 6;  // padding + divider
    var boardW = Math.floor(totalW / 2);
    // Height budget: screen - header - counters - history - label
    var headerH   = 54;
    var counterH  = 44;
    var historyH  = 36;
    var labelH    = 28;
    var padding   = 16;
    var availH = window.innerHeight - headerH - counterH - historyH - labelH - padding;
    var maxFromH = Math.floor(availH / GRID);
    var maxFromW = Math.floor(boardW / GRID);
    var cellSize = Math.min(maxFromH, maxFromW);
    return Math.max(cellSize, 36);
  }

  var NS = 'http://www.w3.org/2000/svg';

  function buildBoardSvg(svgEl, player) {
    svgEl.innerHTML = '';
    cellGroups[player] = [];

    var cs = getCellSize();
    var gap = 3;
    var boardPx = GRID * cs + (GRID - 1) * gap;
    var rx = Math.max(4, Math.round(cs * 0.18));

    svgEl.setAttribute('viewBox', '0 0 ' + boardPx + ' ' + boardPx);
    svgEl.setAttribute('width', boardPx);
    svgEl.setAttribute('height', boardPx);

    for (var i = 0; i < 25; i++) {
      var row = Math.floor(i / GRID);
      var col = i % GRID;
      var x = col * (cs + gap);
      var y = row * (cs + gap);
      var num = boards[player][i];

      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'cell-default');
      g.setAttribute('data-idx', i);
      g.setAttribute('data-player', player);
      g.style.cursor = 'pointer';

      // Background rect
      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('class', 'cell-bg');
      rect.setAttribute('x', x + 1);
      rect.setAttribute('y', y + 1);
      rect.setAttribute('width', cs - 2);
      rect.setAttribute('height', cs - 2);
      rect.setAttribute('rx', rx);
      rect.setAttribute('fill', 'white');
      rect.setAttribute('stroke', '#E0E0E0');
      rect.setAttribute('stroke-width', '1.5');
      g.appendChild(rect);

      // Number text
      var txt = document.createElementNS(NS, 'text');
      txt.setAttribute('class', 'cell-num');
      txt.setAttribute('x', x + cs / 2);
      txt.setAttribute('y', y + cs / 2 + 1);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('font-size', Math.max(11, Math.round(cs * 0.32)));
      txt.setAttribute('font-weight', '700');
      txt.setAttribute('fill', '#333');
      txt.setAttribute('pointer-events', 'none');
      txt.textContent = num;
      g.appendChild(txt);

      // X mark group (hidden initially)
      var xg = document.createElementNS(NS, 'g');
      xg.setAttribute('class', 'cell-x');
      xg.style.display = 'none';

      var pad = Math.round(cs * 0.18);
      var x1 = x + pad, y1 = y + pad;
      var x2 = x + cs - pad, y2 = y + cs - pad;
      var sw = Math.max(2.5, Math.round(cs * 0.09));

      var xl1 = document.createElementNS(NS, 'line');
      xl1.setAttribute('x1', x1); xl1.setAttribute('y1', y1);
      xl1.setAttribute('x2', x2); xl1.setAttribute('y2', y2);
      xl1.setAttribute('stroke', 'white');
      xl1.setAttribute('stroke-width', sw);
      xl1.setAttribute('stroke-linecap', 'round');
      xg.appendChild(xl1);

      var xl2 = document.createElementNS(NS, 'line');
      xl2.setAttribute('x1', x2); xl2.setAttribute('y1', y1);
      xl2.setAttribute('x2', x1); xl2.setAttribute('y2', y2);
      xl2.setAttribute('stroke', 'white');
      xl2.setAttribute('stroke-width', sw);
      xl2.setAttribute('stroke-linecap', 'round');
      xg.appendChild(xl2);

      g.appendChild(xg);

      // Attach tap handler only to the current player's own board
      (function (grp, pIdx, cellIdx) {
        onTap(grp, function () {
          handleCellTap(pIdx, cellIdx);
        });
      })(g, player, i);

      svgEl.appendChild(g);
      cellGroups[player][i] = g;
    }
  }

  // ── 셀 시각 업데이트 ──────────────────────────────────────────────────
  function updateCellVisual(player, cellIdx) {
    var g    = cellGroups[player][cellIdx];
    var rect = g.querySelector('.cell-bg');
    var xg   = g.querySelector('.cell-x');
    var txt  = g.querySelector('.cell-num');

    // find global number
    var num  = boards[player][cellIdx];
    // find marked index
    var isMarked = getMarkedForNum(num);
    var isLineCell = completedCells[player].indexOf(cellIdx) >= 0;

    if (isMarked && isLineCell) {
      rect.setAttribute('fill', '#FF8F00');
      rect.setAttribute('stroke', '#E65100');
      rect.setAttribute('stroke-width', '2.5');
      xg.style.display = '';
      txt.setAttribute('fill', 'rgba(255,255,255,0.6)');
    } else if (isMarked) {
      rect.setAttribute('fill', '#E91E63');
      rect.setAttribute('stroke', '#C2185B');
      rect.setAttribute('stroke-width', '1.5');
      xg.style.display = '';
      txt.setAttribute('fill', 'rgba(255,255,255,0.7)');
    } else if (isLineCell) {
      rect.setAttribute('fill', '#FFD54F');
      rect.setAttribute('stroke', '#FFA726');
      rect.setAttribute('stroke-width', '2.5');
      xg.style.display = 'none';
      txt.setAttribute('fill', '#333');
    } else {
      rect.setAttribute('fill', 'white');
      rect.setAttribute('stroke', '#E0E0E0');
      rect.setAttribute('stroke-width', '1.5');
      xg.style.display = 'none';
      txt.setAttribute('fill', '#333');
    }
  }

  // ── 숫자가 marked 되었는지 확인 (number 기준) ──────────────────────────
  // boards[player][cellIdx] = number; we use a separate marked array indexed by number
  var markedNums;  // Set-like: markedNums[1..25] = true/false

  function getMarkedForNum(num) {
    return !!markedNums[num];
  }

  // ── 탭 처리 ───────────────────────────────────────────────────────────
  function handleCellTap(player, cellIdx) {
    if (gameOver) return;
    // Only current player can tap, only on their own board
    if (player !== currentPlayer) return;

    var num = boards[player][cellIdx];
    // Already called?
    if (markedNums[num]) return;

    // Mark number
    markedNums[num] = true;
    calledNumbers.push(num);

    sounds.play('call');

    // Update history
    addHistoryChip(num);

    // Update visuals on both boards for this number
    markNumberOnBoards(num);

    // Check for newly completed lines on BOTH boards
    var newLinesP1 = checkNewLines(P1);
    var newLinesP2 = checkNewLines(P2);

    if (newLinesP1 > 0 || newLinesP2 > 0) {
      // Re-render cells that are now part of completed lines
      refreshAllCells(P1);
      refreshAllCells(P2);
      updateLineCounterUI();

      safeTimeout(function () {
        sounds.play('line');
      }, 60);

      // Check win after a brief delay for visual update
      safeTimeout(function () {
        if (countLines(P1) >= TARGET_LINES) {
          triggerWin(P1);
        } else if (countLines(P2) >= TARGET_LINES) {
          triggerWin(P2);
        } else {
          switchTurn();
        }
      }, 350);
    } else {
      switchTurn();
    }
  }

  function markNumberOnBoards(num) {
    // Find and animate the cell on BOTH boards
    [P1, P2].forEach(function (player) {
      for (var i = 0; i < 25; i++) {
        if (boards[player][i] === num) {
          updateCellVisual(player, i);
          // Animate
          var g = cellGroups[player][i];
          g.style.transition = 'transform 0.2s';
          animateCell(g);
          break;
        }
      }
    });
  }

  function animateCell(g) {
    // Scale animation via transform
    g.setAttribute('transform', 'scale(0.85)');
    safeTimeout(function () {
      g.setAttribute('transform', 'scale(1.05)');
      safeTimeout(function () {
        g.setAttribute('transform', 'scale(1)');
      }, 100);
    }, 80);
  }

  function refreshAllCells(player) {
    for (var i = 0; i < 25; i++) {
      updateCellVisual(player, i);
    }
  }

  // ── 라인 체크 ─────────────────────────────────────────────────────────
  // Returns count of NEWLY completed lines this turn for given player
  function checkNewLines(player) {
    var newCount = 0;
    for (var li = 0; li < LINES.length; li++) {
      if (linesDone[player][li]) continue;  // already done
      var line = LINES[li];
      var complete = true;
      for (var j = 0; j < line.length; j++) {
        var cellIdx = line[j];
        var num = boards[player][cellIdx];
        if (!markedNums[num]) { complete = false; break; }
      }
      if (complete) {
        linesDone[player][li] = true;
        newCount++;
        // Record completed cells for highlight
        for (var k = 0; k < line.length; k++) {
          var ci = line[k];
          if (completedCells[player].indexOf(ci) < 0) {
            completedCells[player].push(ci);
          }
        }
      }
    }
    return newCount;
  }

  function countLines(player) {
    var c = 0;
    for (var li in linesDone[player]) {
      if (linesDone[player][li]) c++;
    }
    return c;
  }

  // ── 턴 전환 ───────────────────────────────────────────────────────────
  function switchTurn() {
    currentPlayer = currentPlayer === P1 ? P2 : P1;
    updateTurnUI();
    updateOverlays();
  }

  function updateTurnUI() {
    turnDot.style.background = P_COLORS[currentPlayer];
    turnText.textContent = P_NAMES[currentPlayer] + '의 차례';

    p1CounterEl.classList.toggle('active-player', currentPlayer === P1);
    p2CounterEl.classList.toggle('active-player', currentPlayer === P2);
  }

  function updateOverlays() {
    // Block opponent board
    if (currentPlayer === P1) {
      p1OverlayEl.classList.remove('blocked');
      p2OverlayEl.classList.add('blocked');
    } else {
      p1OverlayEl.classList.add('blocked');
      p2OverlayEl.classList.remove('blocked');
    }
  }

  function updateLineCounterUI() {
    var l1 = countLines(P1);
    var l2 = countLines(P2);

    p1LinesEl.textContent = l1 + '줄';
    p2LinesEl.textContent = l2 + '줄';

    // Update dots for P1
    var p1DotEls = p1DotsEl.querySelectorAll('.lc-dot');
    p1DotEls.forEach(function (d, i) {
      d.classList.toggle('filled-p1', i < l1);
      d.classList.toggle('empty', i >= l1);
    });

    // Update dots for P2
    var p2DotEls = p2DotsEl.querySelectorAll('.lc-dot');
    p2DotEls.forEach(function (d, i) {
      d.classList.toggle('filled-p2', i < l2);
      d.classList.toggle('empty', i >= l2);
    });
  }

  // ── 히스토리 칩 ───────────────────────────────────────────────────────
  function addHistoryChip(num) {
    var chip = document.createElement('div');
    chip.className = 'history-chip';
    chip.textContent = num;
    historyChips.appendChild(chip);
    // Scroll to end
    historyChips.scrollLeft = historyChips.scrollWidth;
  }

  // ── 승리 처리 ─────────────────────────────────────────────────────────
  function triggerWin(winner) {
    if (gameOver) return;
    gameOver = true;

    // Block both boards
    p1OverlayEl.classList.add('blocked');
    p2OverlayEl.classList.add('blocked');

    sounds.play('win');

    safeTimeout(function () {
      showResult(winner);
    }, 600);
  }

  // ── 결과 화면 ──────────────────────────────────────────────────────────
  function showResult(winner) {
    resultWinner.textContent = P_NAMES[winner] + ' 승리!';
    resultWinner.style.color = P_COLORS[winner];
    resultSubEl.textContent  = P_NAMES[winner] + '가 먼저 3줄을 완성했어요!';

    // Build mini board previews
    resultBoardsEl.innerHTML = '';
    [P1, P2].forEach(function (player) {
      var item = document.createElement('div');
      item.className = 'result-board-item';

      var lbl = document.createElement('div');
      lbl.className = 'result-board-label';
      lbl.textContent = P_NAMES[player] + ' (' + countLines(player) + '줄)';
      lbl.style.color = P_COLORS[player];
      item.appendChild(lbl);

      var miniSvg = buildMiniBoard(player);
      item.appendChild(miniSvg);
      resultBoardsEl.appendChild(item);
    });

    showScreen('result');
  }

  function buildMiniBoard(player) {
    var cs  = 20;
    var gap = 2;
    var boardPx = GRID * cs + (GRID - 1) * gap;
    var rx = 3;

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + boardPx + ' ' + boardPx);
    svg.setAttribute('width', boardPx);
    svg.setAttribute('height', boardPx);

    for (var i = 0; i < 25; i++) {
      var row = Math.floor(i / GRID);
      var col = i % GRID;
      var x = col * (cs + gap);
      var y = row * (cs + gap);
      var num = boards[player][i];
      var isMarked  = !!markedNums[num];
      var isLineCel = completedCells[player].indexOf(i) >= 0;

      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x + 1);
      rect.setAttribute('y', y + 1);
      rect.setAttribute('width', cs - 2);
      rect.setAttribute('height', cs - 2);
      rect.setAttribute('rx', rx);
      if (isMarked && isLineCel) {
        rect.setAttribute('fill', '#FF8F00');
      } else if (isMarked) {
        rect.setAttribute('fill', '#E91E63');
      } else if (isLineCel) {
        rect.setAttribute('fill', '#FFD54F');
      } else {
        rect.setAttribute('fill', '#F5F5F5');
        rect.setAttribute('stroke', '#E0E0E0');
        rect.setAttribute('stroke-width', '1');
      }
      svg.appendChild(rect);

      // X mark for marked cells
      if (isMarked) {
        var pad = 4;
        var sw  = 2;
        var xl1 = document.createElementNS(NS, 'line');
        xl1.setAttribute('x1', x + pad); xl1.setAttribute('y1', y + pad);
        xl1.setAttribute('x2', x + cs - pad); xl1.setAttribute('y2', y + cs - pad);
        xl1.setAttribute('stroke', 'white');
        xl1.setAttribute('stroke-width', sw);
        xl1.setAttribute('stroke-linecap', 'round');
        svg.appendChild(xl1);

        var xl2 = document.createElementNS(NS, 'line');
        xl2.setAttribute('x1', x + cs - pad); xl2.setAttribute('y1', y + pad);
        xl2.setAttribute('x2', x + pad); xl2.setAttribute('y2', y + cs - pad);
        xl2.setAttribute('stroke', 'white');
        xl2.setAttribute('stroke-width', sw);
        xl2.setAttribute('stroke-linecap', 'round');
        svg.appendChild(xl2);
      }
    }
    return svg;
  }

  // ── 버튼 이벤트 ──────────────────────────────────────────────────────
  document.getElementById('playBtn').addEventListener('click', function () {
    initGame();
  });

  document.getElementById('retryBtn').addEventListener('click', function () {
    initGame();
  });

  document.getElementById('homeBtn').addEventListener('click', function () {
    clearAllTimers();
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    clearAllTimers();
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    clearAllTimers();
    showScreen('intro');
  });

  // ── 리사이즈 ─────────────────────────────────────────────────────────
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (screens.game.classList.contains('active') && !gameOver) {
        rebuildBoardsKeepState();
      }
    }, 200);
  });

  function rebuildBoardsKeepState() {
    buildBoards();
    // Re-apply marked state to all cells
    [P1, P2].forEach(function (player) {
      refreshAllCells(player);
    });
    updateTurnUI();
    updateOverlays();
  }

})();
