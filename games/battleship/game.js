/* games/battleship/game.js */

(function () {
  'use strict';

  // ===== CONSTANTS =====
  var GRID_SIZE = 8;
  var COLS_LABELS = ['A','B','C','D','E','F','G','H'];
  var ROWS_LABELS = ['1','2','3','4','5','6','7','8'];

  // Ships: [size, label]
  var SHIP_DEFS = [
    { size: 3, name: '구축함 (3칸)' },
    { size: 2, name: '잠수함 (2칸)' },
    { size: 2, name: '순양함 (2칸)' }
  ];

  // ===== SOUND MANAGER =====
  var sounds = createSoundManager({

    // Splash — miss: watery bubbling descend
    splash: function (ctx) {
      // noise burst via buffer
      var duration = 0.45;
      var bufSize = ctx.sampleRate * duration;
      var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;

      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);
      filter.Q.value = 1.5;

      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + duration);
    },

    // Explosion — hit: sharp thud + ringing
    explosion: function (ctx) {
      // Thud
      var osc = ctx.createOscillator();
      var oGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.18);
      oGain.gain.setValueAtTime(0.5, ctx.currentTime);
      oGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(oGain);
      oGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);

      // Noise crack
      var crackBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      var crackData = crackBuf.getChannelData(0);
      for (var i = 0; i < crackData.length; i++) {
        crackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackData.length, 1.5);
      }
      var crackSrc = ctx.createBufferSource();
      crackSrc.buffer = crackBuf;
      var crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.35, ctx.currentTime);
      crackGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      crackSrc.connect(crackGain);
      crackGain.connect(ctx.destination);
      crackSrc.start();
      crackSrc.stop(ctx.currentTime + 0.15);
    },

    // Sinking ship — low grinding descend
    sink: function (ctx) {
      var notes = [200, 170, 140, 110, 80];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.08;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    },

    // Victory fanfare
    victory: function (ctx) {
      var melody = [523, 659, 784, 1047, 784, 1047, 1319];
      melody.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
      // bass drum
      var bd = ctx.createOscillator();
      var bdGain = ctx.createGain();
      bd.type = 'sine';
      bd.frequency.setValueAtTime(90, ctx.currentTime);
      bd.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.18);
      bdGain.gain.setValueAtTime(0.4, ctx.currentTime);
      bdGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      bd.connect(bdGain);
      bdGain.connect(ctx.destination);
      bd.start();
      bd.stop(ctx.currentTime + 0.18);
    },

    // Place ship — gentle click
    place: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  });

  // ===== SOUND TOGGLE BUTTONS =====
  var soundButtons = [
    document.getElementById('soundToggleIntro'),
    document.getElementById('soundToggleSetup'),
    document.getElementById('soundToggleGame')
  ];

  function updateSoundBtns() {
    var icon = sounds.isMuted() ? '🔇' : '🔊';
    soundButtons.forEach(function (btn) { if (btn) btn.textContent = icon; });
  }

  soundButtons.forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });

  updateSoundBtns();

  // ===== SCREEN MANAGEMENT =====
  var screens = {
    intro:   document.getElementById('introScreen'),
    setup:   document.getElementById('setupScreen'),
    handoff: document.getElementById('handoffScreen'),
    game:    document.getElementById('gameScreen'),
    result:  document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  // ===== GAME STATE =====
  // Each player state:
  // { board: 8x8 array (0=water, shipId=1..3), ships: [{id, cells, hits}], attacks: 8x8 boolean }
  var players = [null, null]; // index 0 = P1, 1 = P2
  var currentSetupPlayer = 0; // 0 or 1
  var currentAttackPlayer = 0; // whose turn to attack
  var pendingHandoff = null;   // function to call after handoff

  // ===== GRID DOM BUILDERS =====

  function buildLabels(colEl, rowEl, cellSize) {
    colEl.innerHTML = '';
    rowEl.innerHTML = '';

    // Set grid template for col labels
    colEl.style.gridTemplateColumns = 'repeat(8, ' + cellSize + 'px)';
    colEl.style.display = 'grid';

    COLS_LABELS.forEach(function (lbl) {
      var d = document.createElement('div');
      d.className = 'col-label';
      d.textContent = lbl;
      d.style.height = '16px';
      d.style.lineHeight = '16px';
      colEl.appendChild(d);
    });

    ROWS_LABELS.forEach(function (lbl) {
      var d = document.createElement('div');
      d.className = 'row-label';
      d.textContent = lbl;
      d.style.height = cellSize + 'px';
      d.style.lineHeight = cellSize + 'px';
      rowEl.appendChild(d);
    });
  }

  function buildGrid(gridEl, cellSize, clickHandler) {
    gridEl.innerHTML = '';
    // gap=2px, padding=3px each side => total = 3+3 + 7*2 = 20
    var totalSize = cellSize * 8 + 2 * 7 + 6; // 8 cells + 7 gaps + 6px padding
    gridEl.style.width = totalSize + 'px';
    gridEl.style.height = totalSize + 'px';

    var cells = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      cells[r] = [];
      for (var c = 0; c < GRID_SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'grid-cell water';
        cell.style.width = cellSize + 'px';
        cell.style.height = cellSize + 'px';
        if (clickHandler) {
          (function (row, col) {
            onTap(cell, function () { clickHandler(row, col); });
          }(r, c));
        }
        gridEl.appendChild(cell);
        cells[r][c] = cell;
      }
    }
    return cells;
  }

  // Compute cell size based on available screen
  function calcCellSize(forGame) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (forGame) {
      // Two grids stacked — need to fit both with labels + header + divider
      // Rough: allocate ~37% of vh for each grid
      var available = Math.min(vw - 40, vh * 0.36);
      // grid total = cellSize*8 + 20
      var size = Math.floor((available - 20) / 8);
      return Math.max(24, Math.min(size, 42));
    } else {
      // Single grid for setup
      var available2 = Math.min(vw - 60, vh * 0.6);
      var size2 = Math.floor((available2 - 20) / 8);
      return Math.max(28, Math.min(size2, 52));
    }
  }

  // ===== PLAYER INIT =====
  function createPlayerState() {
    var board = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      board[r] = [];
      for (var c = 0; c < GRID_SIZE; c++) {
        board[r][c] = 0;
      }
    }
    return {
      board: board,
      ships: [],  // [{id, cells: [[r,c],...], hits: Set}]
      attacks: createEmptyGrid() // opponent's attacks on this player's grid
    };
  }

  function createEmptyGrid() {
    var g = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      g[r] = [];
      for (var c = 0; c < GRID_SIZE; c++) {
        g[r][c] = false;
      }
    }
    return g;
  }

  // ===== SETUP PHASE =====
  var setupCells = [];
  var setupShipIndex = 0;  // which ship we're placing (0..2)
  var setupOrientation = 'H'; // H or V
  var setupHoverRow = -1;
  var setupHoverCol = -1;
  var allPlaced = false;

  var setupGrid    = document.getElementById('setupGrid');
  var setupTitle   = document.getElementById('setupTitle');
  var shipLabel    = document.getElementById('shipLabel');
  var shipPreview  = document.getElementById('shipPreview');
  var shipSizeLabel = document.getElementById('shipSizeLabel');
  var confirmBtn   = document.getElementById('confirmBtn');
  var rotateBtn    = document.getElementById('rotateBtn');

  function startSetupPhase(playerIndex) {
    currentSetupPlayer = playerIndex;
    setupShipIndex = 0;
    setupOrientation = 'H';
    setupHoverRow = -1;
    setupHoverCol = -1;
    allPlaced = false;

    players[playerIndex] = createPlayerState();

    setupTitle.textContent = '플레이어 ' + (playerIndex + 1) + ' 배치';

    var cellSize = calcCellSize(false);

    buildLabels(
      document.getElementById('setupColLabels'),
      document.getElementById('setupRowLabels'),
      cellSize
    );

    setupCells = buildGrid(setupGrid, cellSize, null);

    // Add hover + tap handlers manually
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        (function (row, col) {
          var cell = setupCells[row][col];

          cell.addEventListener('mouseenter', function () {
            if (allPlaced) return;
            setupHoverRow = row;
            setupHoverCol = col;
            renderSetupPreview();
          });

          cell.addEventListener('mouseleave', function () {
            if (allPlaced) return;
            setupHoverRow = -1;
            setupHoverCol = -1;
            renderSetupPreview();
          });

          onTap(cell, function () {
            if (allPlaced) return;
            handleSetupTap(row, col);
          });
        }(r, c));
      }
    }

    renderSetupGrid();
    updateShipInfo();
    confirmBtn.disabled = true;
    showScreen('setup');
  }

  function updateShipInfo() {
    if (setupShipIndex >= SHIP_DEFS.length) {
      shipLabel.textContent = '배치 완료!';
      shipPreview.innerHTML = '';
      shipSizeLabel.textContent = '';
      allPlaced = true;
      confirmBtn.disabled = false;
      return;
    }

    var def = SHIP_DEFS[setupShipIndex];
    shipLabel.textContent = '배치할 함선:';
    shipSizeLabel.textContent = def.name;

    shipPreview.innerHTML = '';
    for (var i = 0; i < def.size; i++) {
      var dot = document.createElement('div');
      dot.className = 'ship-cell-dot';
      shipPreview.appendChild(dot);
    }
    allPlaced = false;
    confirmBtn.disabled = true;
  }

  function getCells(row, col, size, orientation) {
    var cells = [];
    for (var i = 0; i < size; i++) {
      if (orientation === 'H') {
        cells.push([row, col + i]);
      } else {
        cells.push([row + i, col]);
      }
    }
    return cells;
  }

  function isValid(cells, board) {
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i][0];
      var c = cells[i][1];
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
      if (board[r][c] !== 0) return false;
    }
    return true;
  }

  function renderSetupGrid() {
    var state = players[currentSetupPlayer];
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var cell = setupCells[r][c];
        cell.className = 'grid-cell';
        if (state.board[r][c] !== 0) {
          cell.classList.add('ship');
        } else {
          cell.classList.add('water');
        }
      }
    }
  }

  function renderSetupPreview() {
    renderSetupGrid();
    if (allPlaced || setupHoverRow < 0 || setupShipIndex >= SHIP_DEFS.length) return;

    var def = SHIP_DEFS[setupShipIndex];
    var previewCells = getCells(setupHoverRow, setupHoverCol, def.size, setupOrientation);
    var valid = isValid(previewCells, players[currentSetupPlayer].board);

    previewCells.forEach(function (rc) {
      var r = rc[0], c = rc[1];
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
      var cell = setupCells[r][c];
      cell.classList.remove('water', 'ship');
      cell.classList.add(valid ? 'preview-valid' : 'preview-invalid');
    });
  }

  function handleSetupTap(row, col) {
    if (setupShipIndex >= SHIP_DEFS.length) return;
    var def = SHIP_DEFS[setupShipIndex];
    var cells = getCells(row, col, def.size, setupOrientation);
    var state = players[currentSetupPlayer];

    if (!isValid(cells, state.board)) return;

    // Place ship
    var shipId = setupShipIndex + 1;
    cells.forEach(function (rc) {
      state.board[rc[0]][rc[1]] = shipId;
    });

    state.ships.push({
      id: shipId,
      cells: cells,
      hits: []
    });

    sounds.play('place');
    setupShipIndex++;
    setupHoverRow = -1;
    setupHoverCol = -1;
    renderSetupGrid();
    updateShipInfo();

    if (setupShipIndex >= SHIP_DEFS.length) {
      confirmBtn.disabled = false;
    }
  }

  rotateBtn.addEventListener('click', function () {
    setupOrientation = (setupOrientation === 'H') ? 'V' : 'H';
    renderSetupPreview();
  });

  confirmBtn.addEventListener('click', function () {
    if (confirmBtn.disabled) return;
    if (currentSetupPlayer === 0) {
      // P1 done — show handoff to P2 setup
      showHandoff(
        '화면을 플레이어 2에게 넘기세요',
        '플레이어 2 함선 배치 준비',
        function () { startSetupPhase(1); }
      );
    } else {
      // P2 done — start game, P1 attacks first
      currentAttackPlayer = 0;
      showHandoff(
        '화면을 플레이어 1에게 넘기세요',
        '플레이어 1이 먼저 공격합니다!',
        function () { startGameTurn(); }
      );
    }
  });

  // ===== HANDOFF SCREEN =====
  var handoffTitle = document.getElementById('handoffTitle');
  var handoffSub   = document.getElementById('handoffSub');
  var handoffBtn   = document.getElementById('handoffBtn');

  function showHandoff(title, sub, callback) {
    handoffTitle.textContent = title;
    handoffSub.textContent = sub;
    pendingHandoff = callback;
    showScreen('handoff');
  }

  handoffBtn.addEventListener('click', function () {
    if (pendingHandoff) {
      var fn = pendingHandoff;
      pendingHandoff = null;
      fn();
    }
  });

  // ===== GAME PHASE =====
  var attackCells = [];  // DOM cells for attack grid (opponent's sea)
  var myCells     = [];  // DOM cells for my sea

  var attackGrid  = document.getElementById('attackGrid');
  var myGrid      = document.getElementById('myGrid');
  var turnText    = document.getElementById('turnText');

  var attackColLabels = document.getElementById('attackColLabels');
  var attackRowLabels = document.getElementById('attackRowLabels');
  var myColLabels     = document.getElementById('myColLabels');
  var myRowLabels     = document.getElementById('myRowLabels');

  function startGameTurn() {
    var attacker = currentAttackPlayer;        // 0 or 1
    var defender = 1 - currentAttackPlayer;

    turnText.textContent = '플레이어 ' + (attacker + 1) + '의 공격';

    var cellSize = calcCellSize(true);

    // Build attack grid (defender's sea, ships hidden)
    buildLabels(attackColLabels, attackRowLabels, cellSize);
    attackCells = buildGrid(attackGrid, cellSize, function (r, c) {
      handleAttack(r, c);
    });

    // Build my grid (attacker's sea, ships visible)
    buildLabels(myColLabels, myRowLabels, cellSize);
    myCells = buildGrid(myGrid, cellSize, null);

    // Render attacker's own sea (their ships + defender's prior attacks)
    renderMyGrid(attacker);

    // Render attack grid: show previous attacks on defender's sea
    renderAttackGrid(attacker, defender);

    showScreen('game');
  }

  function renderMyGrid(playerIndex) {
    var state = players[playerIndex];
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var cell = myCells[r][c];
        cell.className = 'grid-cell';
        var shipId = state.board[r][c];
        var attacked = state.attacks[r][c];

        if (shipId !== 0 && attacked) {
          // Check if ship is sunk
          var ship = getShipById(state, shipId);
          if (isShipSunk(state, ship)) {
            cell.classList.add('sunk', 'attacked');
          } else {
            cell.classList.add('hit', 'attacked');
          }
        } else if (shipId !== 0) {
          cell.classList.add('ship');
        } else if (attacked) {
          cell.classList.add('miss', 'attacked');
        } else {
          cell.classList.add('water');
        }
      }
    }
  }

  function renderAttackGrid(attacker, defender) {
    var defState = players[defender];
    // Track what the attacker has already attacked: stored in defState.attacks
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var cell = attackCells[r][c];
        cell.className = 'grid-cell';
        var attacked = defState.attacks[r][c];
        if (attacked) {
          var shipId = defState.board[r][c];
          if (shipId !== 0) {
            var ship = getShipById(defState, shipId);
            if (isShipSunk(defState, ship)) {
              cell.classList.add('sunk', 'attacked');
            } else {
              cell.classList.add('hit', 'attacked');
            }
          } else {
            cell.classList.add('miss', 'attacked');
          }
        } else {
          cell.classList.add('water');
        }
      }
    }
  }

  function getShipById(state, id) {
    for (var i = 0; i < state.ships.length; i++) {
      if (state.ships[i].id === id) return state.ships[i];
    }
    return null;
  }

  function isShipSunk(state, ship) {
    if (!ship) return false;
    var hitCount = 0;
    ship.cells.forEach(function (rc) {
      if (state.attacks[rc[0]][rc[1]]) hitCount++;
    });
    return hitCount >= ship.cells.length;
  }

  function allShipsSunk(state) {
    for (var i = 0; i < state.ships.length; i++) {
      if (!isShipSunk(state, state.ships[i])) return false;
    }
    return true;
  }

  var attackLocked = false;

  function handleAttack(row, col) {
    if (attackLocked) return;

    var attacker = currentAttackPlayer;
    var defender = 1 - currentAttackPlayer;
    var defState = players[defender];

    // Already attacked?
    if (defState.attacks[row][col]) return;

    attackLocked = true;
    defState.attacks[row][col] = true;

    var shipId = defState.board[row][col];
    var attackCell = attackCells[row][col];

    if (shipId !== 0) {
      // Hit!
      var ship = getShipById(defState, shipId);
      ship.hits.push([row, col]);
      sounds.play('explosion');

      if (isShipSunk(defState, ship)) {
        // Mark all sunk cells
        setTimeout(function () {
          sounds.play('sink');
          ship.cells.forEach(function (rc) {
            attackCells[rc[0]][rc[1]].className = 'grid-cell sunk attacked';
          });

          // Check win
          if (allShipsSunk(defState)) {
            sounds.play('victory');
            setTimeout(function () {
              showResult(attacker);
            }, 700);
            return;
          }

          attackLocked = false;
        }, 300);
      } else {
        attackCell.className = 'grid-cell hit attacked';
        attackLocked = false;
      }
    } else {
      // Miss
      sounds.play('splash');
      attackCell.className = 'grid-cell miss attacked';
      attackLocked = false;
    }

    // No win: switch turn after short delay
    if (!allShipsSunk(defState)) {
      setTimeout(function () {
        if (!allShipsSunk(defState)) {
          currentAttackPlayer = 1 - currentAttackPlayer;
          var nextPlayer = currentAttackPlayer;
          showHandoff(
            '화면을 상대에게 넘기세요',
            '플레이어 ' + (nextPlayer + 1) + '의 차례입니다',
            function () { startGameTurn(); }
          );
        }
      }, 600);
    }
  }

  // ===== RESULT SCREEN =====
  var resultEmoji  = document.getElementById('resultEmoji');
  var resultTitle  = document.getElementById('resultTitle');
  var resultSub    = document.getElementById('resultSub');
  var resultGrid1El = document.getElementById('resultGrid1');
  var resultGrid2El = document.getElementById('resultGrid2');

  function showResult(winnerIndex) {
    resultEmoji.textContent = '🎉';
    resultTitle.textContent = '플레이어 ' + (winnerIndex + 1) + ' 승리!';
    resultTitle.className = 'result-title ' + (winnerIndex === 0 ? 'p1-win' : 'p2-win');
    resultSub.textContent = '적 함선 3척을 모두 격침했어요!';

    // Build small result grids
    var cellSize = Math.min(26, Math.floor((window.innerWidth / 2 - 40) / 9));
    buildResultGrid(resultGrid1El, players[0], cellSize, true);
    buildResultGrid(resultGrid2El, players[1], cellSize, true);

    showScreen('result');
  }

  function buildResultGrid(gridEl, state, cellSize, revealAll) {
    gridEl.innerHTML = '';
    var total = cellSize * 8 + 2 * 7 + 6;
    gridEl.style.width = total + 'px';
    gridEl.style.height = total + 'px';

    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.style.width = cellSize + 'px';
        cell.style.height = cellSize + 'px';

        var shipId = state.board[r][c];
        var attacked = state.attacks[r][c];

        if (shipId !== 0 && attacked) {
          var ship = getShipById(state, shipId);
          if (isShipSunk(state, ship)) {
            cell.classList.add('sunk', 'attacked');
          } else {
            cell.classList.add('hit', 'attacked');
          }
        } else if (shipId !== 0) {
          cell.classList.add('ship');
        } else if (attacked) {
          cell.classList.add('miss', 'attacked');
        } else {
          cell.classList.add('water');
        }

        gridEl.appendChild(cell);
      }
    }
  }

  // ===== BUTTONS =====
  document.getElementById('playBtn').addEventListener('click', function () {
    startSetupPhase(0);
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    goHome();
  });

  document.getElementById('setupBackBtn').addEventListener('click', function () {
    showScreen('intro');
  });

  document.getElementById('gameBackBtn').addEventListener('click', function () {
    goHome();
  });

  document.getElementById('retryBtn').addEventListener('click', function () {
    startSetupPhase(0);
  });

  document.getElementById('homeBtn').addEventListener('click', function () {
    goHome();
  });

}());
