/* games/wall-builder/game.js */

(function () {
  'use strict';

  // ─── 상수 ────────────────────────────────────────────────────────────────────
  var ROWS = 5;
  var COLS = 5;
  var MAX_WALLS = 5;    // 플레이어당 최대 벽 수

  // P1: row=0에서 row=4로 이동, P2: row=4에서 row=0으로 이동
  var PLAYER_START = [
    { row: 0, col: 2 },  // P1 시작 위치
    { row: 4, col: 2 }   // P2 시작 위치
  ];
  var PLAYER_GOAL_ROW = [4, 0];  // 각 플레이어의 목표 행
  var PLAYER_COLORS = ['#29B6F6', '#EF5350'];
  var PLAYER_NAMES  = ['P1', 'P2'];

  // ─── 화면 전환 ────────────────────────────────────────────────────────────────
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

  // ─── 사운드 ──────────────────────────────────────────────────────────────────
  var sounds = createSoundManager({
    // 이동: 경쾌한 짧은 클릭
    move: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    },
    // 벽 놓기: 탁하고 무거운 소리
    wall: function (ctx) {
      var buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + 0.15);
    },
    // 거부: 낮은 버저 소리
    reject: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 180;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    },
    // 승리 팡파레
    win: function (ctx) {
      var notes = [523, 659, 784, 1047, 1318];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    }
  });

  // 사운드 버튼
  var soundBtns = [
    document.getElementById('soundToggleIntro'),
    document.getElementById('soundToggleGame')
  ];

  function updateSoundBtns() {
    soundBtns.forEach(function (btn) {
      btn.textContent = sounds.isMuted() ? '🔇' : '🔊';
    });
  }

  soundBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });
  updateSoundBtns();

  // ─── 게임 상태 ────────────────────────────────────────────────────────────────
  /*
   * 벽 표현:
   *   hWalls[r][c] = true  — 셀 (r,c)과 셀 (r+1,c) 사이 수평 벽
   *                          (r: 0..3, c: 0..4)
   *   vWalls[r][c] = true  — 셀 (r,c)과 셀 (r,c+1) 사이 수직 벽
   *                          (r: 0..4, c: 0..3)
   */
  var hWalls;      // [ROWS-1][COLS] boolean
  var vWalls;      // [ROWS][COLS-1] boolean
  var wallOwner;   // { h: [[...]], v: [[...]] } player index (0|1|null)
  var playerPos;   // [{row, col}, {row, col}]
  var wallsLeft;   // [p1walls, p2walls]
  var currentPlayer;
  var actionMode;  // 'move' | 'wall'
  var gameOver;

  // 타이머 추적
  var timers = [];

  function safeTimeout(fn, delay) {
    var id = setTimeout(fn, delay);
    timers.push(id);
    return id;
  }

  function clearAllTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  // ─── DOM 요소 ─────────────────────────────────────────────────────────────────
  var boardContainer = document.getElementById('boardContainer');
  var turnDot        = document.getElementById('turnDot');
  var turnText       = document.getElementById('turnText');
  var actionMoveBtn  = document.getElementById('actionMove');
  var actionWallBtn  = document.getElementById('actionWall');
  var statusMsg      = document.getElementById('statusMsg');
  var p1Info         = document.getElementById('p1Info');
  var p2Info         = document.getElementById('p2Info');
  var p1WallPips     = document.getElementById('p1WallPips');
  var p2WallPips     = document.getElementById('p2WallPips');
  var resultTitle    = document.getElementById('resultTitle');
  var resultSub      = document.getElementById('resultSub');
  var trophySvg      = document.getElementById('trophySvg');

  // ─── SVG 보드 관련 변수 ───────────────────────────────────────────────────────
  var svg;
  var cellSize;    // px per cell
  var cellPad = 3; // padding inside cell
  var wallThick;   // wall thickness px
  var slotHit = 10; // wall slot hit area half-width

  // SVG 요소 참조
  var cellEls = [];    // cellEls[r][c] = <rect>
  var pieceEls = [];   // pieceEls[p] = <g>
  var hWallEls = [];   // hWallEls[r][c] = <rect> (wall visual)
  var vWallEls = [];   // vWallEls[r][c] = <rect>
  var hSlotEls = [];   // hSlotEls[r][c] = <rect> (hit area)
  var vSlotEls = [];   // vSlotEls[r][c] = <rect>

  // ─── 보드 크기 계산 ───────────────────────────────────────────────────────────
  function getBoardSize() {
    var vh = window.innerHeight;
    var vw = window.innerWidth;
    // 헤더 ~56px, 플레이어 바 ~56px, 액션 바 ~60px, 상태 msg ~36px, 여백
    var maxH = vh - 56 - 56 - 60 - 36 - 16;
    var maxW = vw - 24;
    var size = Math.min(maxH, maxW, 380);
    return Math.max(size, 220);
  }

  // ─── 게임 초기화 ──────────────────────────────────────────────────────────────
  function initGame() {
    clearAllTimers();
    gameOver = false;
    currentPlayer = 0;
    actionMode = 'move';

    playerPos = [
      { row: PLAYER_START[0].row, col: PLAYER_START[0].col },
      { row: PLAYER_START[1].row, col: PLAYER_START[1].col }
    ];

    wallsLeft = [MAX_WALLS, MAX_WALLS];

    // 벽 초기화
    hWalls = [];
    vWalls = [];
    wallOwner = { h: [], v: [] };
    for (var r = 0; r < ROWS - 1; r++) {
      hWalls[r] = [];
      wallOwner.h[r] = [];
      for (var c = 0; c < COLS; c++) {
        hWalls[r][c] = false;
        wallOwner.h[r][c] = null;
      }
    }
    for (var r2 = 0; r2 < ROWS; r2++) {
      vWalls[r2] = [];
      wallOwner.v[r2] = [];
      for (var c2 = 0; c2 < COLS - 1; c2++) {
        vWalls[r2][c2] = false;
        wallOwner.v[r2][c2] = null;
      }
    }

    buildBoard();
    updateWallPips();
    updatePlayerInfoUI();
    setActionMode('move');
    showScreen('game');
  }

  // ─── SVG 보드 빌드 ────────────────────────────────────────────────────────────
  function buildBoard() {
    boardContainer.innerHTML = '';
    boardContainer.classList.remove('shake');

    var size = getBoardSize();
    cellSize = size / COLS;
    wallThick = Math.max(5, Math.round(cellSize * 0.13));
    slotHit = Math.max(8, Math.round(cellSize * 0.2));

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.classList.add('board-svg');

    // 목표 행 하이라이트 (아주 연한 노랑)
    var goalP1 = makeSvgEl('rect');
    setAttrs(goalP1, { x: 0, y: PLAYER_GOAL_ROW[0] * cellSize, width: size, height: cellSize, fill: '#FFF9C4', rx: 6 });
    svg.appendChild(goalP1);

    var goalP2 = makeSvgEl('rect');
    setAttrs(goalP2, { x: 0, y: PLAYER_GOAL_ROW[1] * cellSize, width: size, height: cellSize, fill: '#FFF9C4', rx: 6 });
    svg.appendChild(goalP2);

    // ── 셀 (5x5 grid) ────────────────────────────────────────────────────────
    cellEls = [];
    for (var r = 0; r < ROWS; r++) {
      cellEls[r] = [];
      for (var c = 0; c < COLS; c++) {
        var rect = makeSvgEl('rect');
        var cx = c * cellSize + cellPad;
        var cy = r * cellSize + cellPad;
        var cw = cellSize - cellPad * 2;
        var ch = cellSize - cellPad * 2;
        setAttrs(rect, { x: cx, y: cy, width: cw, height: ch, rx: 6, fill: '#F5F5F5', stroke: '#E0E0E0', 'stroke-width': 1 });
        rect.setAttribute('data-row', r);
        rect.setAttribute('data-col', c);
        rect.style.cursor = 'default';
        svg.appendChild(rect);
        cellEls[r][c] = rect;

        // 탭 이벤트
        (function (row, col, el) {
          onTap(el, function () { handleCellTap(row, col); });
        })(r, c, rect);
      }
    }

    // ── 수평 벽 슬롯: 셀(r,c)과 셀(r+1,c) 사이 ──────────────────────────────
    hWallEls = [];
    hSlotEls = [];
    for (var wr = 0; wr < ROWS - 1; wr++) {
      hWallEls[wr] = [];
      hSlotEls[wr] = [];
      for (var wc = 0; wc < COLS; wc++) {
        // 벽 시각 요소 (처음에는 대시선)
        var wallVis = makeSvgEl('rect');
        var wx = wc * cellSize + cellPad * 2;
        var wy = (wr + 1) * cellSize - wallThick / 2;
        var ww = cellSize - cellPad * 4;
        setAttrs(wallVis, {
          x: wx, y: wy, width: ww, height: wallThick,
          rx: wallThick / 2,
          fill: 'none', stroke: '#BDBDBD', 'stroke-width': 1.5,
          'stroke-dasharray': '4 4',
          opacity: 0.5
        });
        svg.appendChild(wallVis);
        hWallEls[wr][wc] = wallVis;

        // 히트 영역 (투명, 넓은 영역)
        var hitRect = makeSvgEl('rect');
        setAttrs(hitRect, {
          x: wc * cellSize + cellPad,
          y: (wr + 1) * cellSize - slotHit,
          width: cellSize - cellPad * 2,
          height: slotHit * 2,
          fill: 'transparent',
          rx: 4
        });
        hitRect.setAttribute('data-hw', wr);
        hitRect.setAttribute('data-hc', wc);
        hitRect.style.cursor = 'pointer';
        svg.appendChild(hitRect);
        hSlotEls[wr][wc] = hitRect;

        (function (row, col, hit, vis) {
          hit.addEventListener('mouseenter', function () {
            if (!gameOver && actionMode === 'wall' && !hWalls[row][col]) {
              vis.setAttribute('fill', PLAYER_COLORS[currentPlayer]);
              vis.setAttribute('stroke', 'none');
              vis.setAttribute('opacity', 0.4);
            }
          });
          hit.addEventListener('mouseleave', function () {
            if (!hWalls[row][col]) {
              vis.setAttribute('fill', 'none');
              vis.setAttribute('stroke', '#BDBDBD');
              vis.setAttribute('stroke-dasharray', '4 4');
              vis.setAttribute('opacity', 0.5);
            }
          });
          onTap(hit, function () { handleWallTap('h', row, col); });
        })(wr, wc, hitRect, wallVis);
      }
    }

    // ── 수직 벽 슬롯: 셀(r,c)과 셀(r,c+1) 사이 ──────────────────────────────
    vWallEls = [];
    vSlotEls = [];
    for (var vr = 0; vr < ROWS; vr++) {
      vWallEls[vr] = [];
      vSlotEls[vr] = [];
      for (var vc = 0; vc < COLS - 1; vc++) {
        var vVis = makeSvgEl('rect');
        var vx = (vc + 1) * cellSize - wallThick / 2;
        var vy = vr * cellSize + cellPad * 2;
        var vh2 = cellSize - cellPad * 4;
        setAttrs(vVis, {
          x: vx, y: vy, width: wallThick, height: vh2,
          rx: wallThick / 2,
          fill: 'none', stroke: '#BDBDBD', 'stroke-width': 1.5,
          'stroke-dasharray': '4 4',
          opacity: 0.5
        });
        svg.appendChild(vVis);
        vWallEls[vr][vc] = vVis;

        var vHit = makeSvgEl('rect');
        setAttrs(vHit, {
          x: (vc + 1) * cellSize - slotHit,
          y: vr * cellSize + cellPad,
          width: slotHit * 2,
          height: cellSize - cellPad * 2,
          fill: 'transparent',
          rx: 4
        });
        vHit.setAttribute('data-vr', vr);
        vHit.setAttribute('data-vc', vc);
        vHit.style.cursor = 'pointer';
        svg.appendChild(vHit);
        vSlotEls[vr][vc] = vHit;

        (function (row, col, hit, vis) {
          hit.addEventListener('mouseenter', function () {
            if (!gameOver && actionMode === 'wall' && !vWalls[row][col]) {
              vis.setAttribute('fill', PLAYER_COLORS[currentPlayer]);
              vis.setAttribute('stroke', 'none');
              vis.setAttribute('opacity', 0.4);
            }
          });
          hit.addEventListener('mouseleave', function () {
            if (!vWalls[row][col]) {
              vis.setAttribute('fill', 'none');
              vis.setAttribute('stroke', '#BDBDBD');
              vis.setAttribute('stroke-dasharray', '4 4');
              vis.setAttribute('opacity', 0.5);
            }
          });
          onTap(hit, function () { handleWallTap('v', row, col); });
        })(vr, vc, vHit, vVis);
      }
    }

    // ── 말 (플레이어 기물) ───────────────────────────────────────────────────
    pieceEls = [];
    for (var p = 0; p < 2; p++) {
      var g = makeSvgEl('g');
      g.style.pointerEvents = 'none';
      var pieceR = Math.round(cellSize * 0.3);

      var circ = makeSvgEl('circle');
      circ.setAttribute('r', pieceR);
      circ.setAttribute('fill', PLAYER_COLORS[p]);
      circ.setAttribute('stroke', 'white');
      circ.setAttribute('stroke-width', 2.5);

      var label = makeSvgEl('text');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', Math.round(pieceR * 0.9));
      label.setAttribute('font-weight', '900');
      label.setAttribute('fill', 'white');
      label.textContent = (p + 1).toString();

      g.appendChild(circ);
      g.appendChild(label);
      svg.appendChild(g);
      pieceEls[p] = g;

      // 초기 위치 설정
      movePieceEl(p, playerPos[p].row, playerPos[p].col);
    }

    boardContainer.appendChild(svg);
    updateCellHighlights();
  }

  function movePieceEl(p, row, col) {
    var cx = col * cellSize + cellSize / 2;
    var cy = row * cellSize + cellSize / 2;
    pieceEls[p].setAttribute('transform', 'translate(' + cx + ',' + cy + ')');
  }

  // ─── 셀 하이라이트 (이동 모드) ────────────────────────────────────────────────
  function updateCellHighlights() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var el = cellEls[r][c];
        // 현재 플레이어 위치인지?
        var isP1 = (playerPos[0].row === r && playerPos[0].col === c);
        var isP2 = (playerPos[1].row === r && playerPos[1].col === c);

        if (isP1 || isP2) {
          el.setAttribute('fill', isP1 ? '#E3F2FD' : '#FFEBEE');
          el.style.cursor = 'default';
        } else if (actionMode === 'move') {
          var valid = isValidMove(currentPlayer, r, c);
          el.setAttribute('fill', valid ? '#E8F5E9' : '#F5F5F5');
          el.style.cursor = valid ? 'pointer' : 'default';
        } else {
          el.setAttribute('fill', '#F5F5F5');
          el.style.cursor = 'default';
        }
      }
    }

    // 벽 슬롯 커서 업데이트
    for (var wr = 0; wr < ROWS - 1; wr++) {
      for (var wc = 0; wc < COLS; wc++) {
        hSlotEls[wr][wc].style.cursor = (actionMode === 'wall' && !hWalls[wr][wc] && wallsLeft[currentPlayer] > 0) ? 'pointer' : 'default';
      }
    }
    for (var vr = 0; vr < ROWS; vr++) {
      for (var vc = 0; vc < COLS - 1; vc++) {
        vSlotEls[vr][vc].style.cursor = (actionMode === 'wall' && !vWalls[vr][vc] && wallsLeft[currentPlayer] > 0) ? 'pointer' : 'default';
      }
    }
  }

  // ─── 이동 유효성 검사 ─────────────────────────────────────────────────────────
  function isValidMove(player, toRow, toCol) {
    var pos = playerPos[player];
    var dr = toRow - pos.row;
    var dc = toCol - pos.col;

    // 인접 셀만 이동 가능 (상하좌우 1칸)
    if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
    if (toRow < 0 || toRow >= ROWS || toCol < 0 || toCol >= COLS) return false;

    // 상대방 위치는 이동 불가
    var other = 1 - player;
    if (playerPos[other].row === toRow && playerPos[other].col === toCol) return false;

    // 벽 체크
    return !isBlockedByWall(pos.row, pos.col, toRow, toCol);
  }

  function isBlockedByWall(fromRow, fromCol, toRow, toCol) {
    var dr = toRow - fromRow;
    var dc = toCol - fromCol;

    if (dr === 1) {
      // 아래로 이동: hWalls[fromRow][fromCol] 체크
      return hWalls[fromRow] && hWalls[fromRow][fromCol];
    }
    if (dr === -1) {
      // 위로 이동: hWalls[toRow][fromCol] 체크
      return hWalls[toRow] && hWalls[toRow][fromCol];
    }
    if (dc === 1) {
      // 오른쪽 이동: vWalls[fromRow][fromCol] 체크
      return vWalls[fromRow] && vWalls[fromRow][fromCol];
    }
    if (dc === -1) {
      // 왼쪽 이동: vWalls[fromRow][toCol] 체크
      return vWalls[fromRow] && vWalls[fromRow][toCol];
    }
    return false;
  }

  // ─── BFS: 플레이어가 목표 행에 도달 가능한지 체크 ────────────────────────────
  function canReachGoal(player) {
    var pos = playerPos[player];
    var goalRow = PLAYER_GOAL_ROW[player];
    var visited = [];
    for (var r = 0; r < ROWS; r++) {
      visited[r] = [];
      for (var c = 0; c < COLS; c++) visited[r][c] = false;
    }

    var queue = [{ row: pos.row, col: pos.col }];
    visited[pos.row][pos.col] = true;

    var dirs = [[-1,0],[1,0],[0,-1],[0,1]];

    while (queue.length > 0) {
      var cur = queue.shift();
      if (cur.row === goalRow) return true;
      for (var d = 0; d < dirs.length; d++) {
        var nr = cur.row + dirs[d][0];
        var nc = cur.col + dirs[d][1];
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (visited[nr][nc]) continue;
        if (isBlockedByWall(cur.row, cur.col, nr, nc)) continue;
        visited[nr][nc] = true;
        queue.push({ row: nr, col: nc });
      }
    }
    return false;
  }

  // ─── 액션 모드 전환 ───────────────────────────────────────────────────────────
  function setActionMode(mode) {
    actionMode = mode;
    actionMoveBtn.classList.toggle('active', mode === 'move');
    actionWallBtn.classList.toggle('active', mode === 'wall');

    if (mode === 'move') {
      statusMsg.textContent = '이동할 칸을 선택하세요 (녹색 칸)';
    } else {
      if (wallsLeft[currentPlayer] === 0) {
        statusMsg.textContent = '벽을 모두 사용했습니다. 이동만 가능해요';
        setActionMode('move');
        return;
      }
      statusMsg.textContent = '벽을 놓을 위치를 선택하세요';
    }
    updateCellHighlights();
  }

  // ─── 셀 탭 처리 (이동) ───────────────────────────────────────────────────────
  function handleCellTap(row, col) {
    if (gameOver) return;
    if (actionMode !== 'move') return;
    if (!isValidMove(currentPlayer, row, col)) return;

    // 이동 실행
    playerPos[currentPlayer] = { row: row, col: col };
    movePieceEl(currentPlayer, row, col);
    sounds.play('move');

    // 승리 조건 체크
    if (row === PLAYER_GOAL_ROW[currentPlayer]) {
      endGame(currentPlayer);
      return;
    }

    nextTurn();
  }

  // ─── 벽 탭 처리 ──────────────────────────────────────────────────────────────
  function handleWallTap(dir, row, col) {
    if (gameOver) return;
    if (actionMode !== 'wall') return;
    if (wallsLeft[currentPlayer] === 0) return;

    // 이미 벽이 있는지 체크
    if (dir === 'h' && hWalls[row][col]) return;
    if (dir === 'v' && vWalls[row][col]) return;

    // 임시로 벽 설치 후 BFS 검증
    if (dir === 'h') {
      hWalls[row][col] = true;
    } else {
      vWalls[row][col] = true;
    }

    // 두 플레이어 모두 경로가 있는지 확인
    var p0ok = canReachGoal(0);
    var p1ok = canReachGoal(1);

    if (!p0ok || !p1ok) {
      // 경로 차단 — 롤백
      if (dir === 'h') hWalls[row][col] = false;
      else             vWalls[row][col] = false;

      sounds.play('reject');
      statusMsg.textContent = '이 위치는 상대방의 길을 완전히 막아요!';
      boardContainer.classList.remove('shake');
      // reflow 강제
      void boardContainer.offsetWidth;
      boardContainer.classList.add('shake');
      safeTimeout(function () {
        boardContainer.classList.remove('shake');
        statusMsg.textContent = '벽을 놓을 위치를 선택하세요';
      }, 400);
      return;
    }

    // 벽 설치 확정
    if (dir === 'h') wallOwner.h[row][col] = currentPlayer;
    else             wallOwner.v[row][col] = currentPlayer;

    wallsLeft[currentPlayer]--;
    renderWall(dir, row, col);
    sounds.play('wall');
    updateWallPips();
    nextTurn();
  }

  // ─── 벽 렌더링 ───────────────────────────────────────────────────────────────
  function renderWall(dir, row, col) {
    var owner = (dir === 'h') ? wallOwner.h[row][col] : wallOwner.v[row][col];
    var color = PLAYER_COLORS[owner];
    var vis = (dir === 'h') ? hWallEls[row][col] : vWallEls[row][col];
    vis.setAttribute('fill', color);
    vis.setAttribute('stroke', 'none');
    vis.setAttribute('stroke-dasharray', 'none');
    vis.setAttribute('opacity', 1);
  }

  // ─── 다음 턴 ─────────────────────────────────────────────────────────────────
  function nextTurn() {
    currentPlayer = 1 - currentPlayer;
    setActionMode('move');
    updateTurnUI();
    updatePlayerInfoUI();
  }

  // ─── UI 업데이트 ─────────────────────────────────────────────────────────────
  function updateTurnUI() {
    turnDot.style.background = PLAYER_COLORS[currentPlayer];
    turnText.textContent = PLAYER_NAMES[currentPlayer] + '의 차례';
  }

  function updatePlayerInfoUI() {
    p1Info.classList.toggle('active', currentPlayer === 0);
    p2Info.classList.toggle('active', currentPlayer === 1);
  }

  function updateWallPips() {
    renderWallPips(p1WallPips, wallsLeft[0], 0);
    renderWallPips(p2WallPips, wallsLeft[1], 1);
  }

  function renderWallPips(container, remaining, playerIdx) {
    container.innerHTML = '';
    for (var i = 0; i < MAX_WALLS; i++) {
      var pip = document.createElement('div');
      pip.className = 'wall-pip' + (i >= remaining ? ' used' : '');
      container.appendChild(pip);
    }
  }

  // ─── 게임 종료 ────────────────────────────────────────────────────────────────
  function endGame(winner) {
    gameOver = true;
    sounds.play('win');

    var winnerColor = PLAYER_COLORS[winner];
    resultTitle.textContent = PLAYER_NAMES[winner] + ' 승리!';
    resultTitle.style.color = winnerColor;
    resultSub.textContent = PLAYER_NAMES[winner] + '이(가) 반대편 끝에 먼저 도달했어요!';

    // 트로피 색상 업데이트
    var trophyPaths = trophySvg.querySelectorAll('path, rect');
    // 이미 색 있으니 유지, 단 승자 색상으로 테두리 추가
    trophySvg.querySelector('circle') && (trophySvg.querySelector('circle').setAttribute('fill', winnerColor));

    safeTimeout(function () {
      showScreen('result');
    }, 600);
  }

  // ─── SVG 헬퍼 ────────────────────────────────────────────────────────────────
  function makeSvgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function setAttrs(el, attrs) {
    Object.keys(attrs).forEach(function (k) {
      el.setAttribute(k, attrs[k]);
    });
  }

  // ─── 버튼 이벤트 ─────────────────────────────────────────────────────────────
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

  actionMoveBtn.addEventListener('click', function () {
    if (!gameOver) setActionMode('move');
  });

  actionWallBtn.addEventListener('click', function () {
    if (!gameOver) setActionMode('wall');
  });

  // ─── 창 크기 변경 ─────────────────────────────────────────────────────────────
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (screens.game.classList.contains('active') && !gameOver) {
        rebuildBoardKeepState();
      }
    }, 200);
  });

  function rebuildBoardKeepState() {
    buildBoard();
    // 기존 벽 재렌더링
    for (var wr = 0; wr < ROWS - 1; wr++) {
      for (var wc = 0; wc < COLS; wc++) {
        if (hWalls[wr][wc]) renderWall('h', wr, wc);
      }
    }
    for (var vr = 0; vr < ROWS; vr++) {
      for (var vc = 0; vc < COLS - 1; vc++) {
        if (vWalls[vr][vc]) renderWall('v', vr, vc);
      }
    }
  }

})();
