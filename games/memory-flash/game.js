/* games/memory-flash/game.js */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  var TOTAL_ROUNDS    = 10;
  var FLASH_DURATION  = 1500;  // ms cells stay lit
  var INPUT_DURATION  = 5;     // seconds to tap
  var REVEAL_DURATION = 1800;  // ms to show results before next round

  var PLAYER_COLORS = ['#AB47BC', '#29B6F6', '#EF5350', '#66BB6A'];
  var PLAYER_NAMES  = ['P1', 'P2', 'P3', 'P4'];

  // Cells lit per round bracket
  function cellsForRound(round) {
    if (round <= 3) return 3;
    if (round <= 6) return 4;
    return 5;
  }

  // ── Screen refs ───────────────────────────────────────────────────────────
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

  // ── Sound ─────────────────────────────────────────────────────────────────
  var sounds = createSoundManager({
    // Chime when cells light up
    flash: function (ctx) {
      [880, 1100].forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    },
    // Soft click on tap
    tap: function (ctx) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    },
    // Bright correct ding
    correct: function (ctx) {
      [660, 880, 1047].forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.08;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    },
    // Buzz for wrong
    wrong: function (ctx) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    },
    // Fanfare at end
    fanfare: function (ctx) {
      var notes = [523, 659, 784, 1047, 1319];
      notes.forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    }
  });

  // Sound toggle buttons
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

  // ── Intro: player count ───────────────────────────────────────────────────
  var playerCount = 2;
  var playerBtns  = document.querySelectorAll('.player-btn');

  playerBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      playerCount = parseInt(btn.getAttribute('data-count'), 10);
      playerBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // ── Game state ────────────────────────────────────────────────────────────
  var currentRound  = 0;
  var scores        = [];        // scores[playerIdx] = total points
  var litCells      = [];        // indices 0-8 that are lit this round
  var playerTapped  = [];        // playerTapped[p] = Set of cell indices tapped
  var phase         = 'idle';    // 'flash' | 'input' | 'reveal' | 'idle'
  var inputTimer    = null;      // createTimer instance
  var allTimers     = [];        // all setTimeout IDs to clean up

  // Per-player zone data
  var zones         = [];        // zones[p] = { el, svgEl, cells: [{ rect, overlay }] }

  // DOM refs
  var zonesContainer  = document.getElementById('zonesContainer');
  var scoreboardEl    = document.getElementById('scoreboard');
  var roundIndicator  = document.getElementById('roundIndicator');
  var statusMessage   = document.getElementById('statusMessage');
  var statusTimer     = document.getElementById('statusTimer');

  // ── Timer helper ──────────────────────────────────────────────────────────
  function safeTimeout(fn, delay) {
    var id = setTimeout(fn, delay);
    allTimers.push(id);
    return id;
  }

  function clearAllTimers() {
    allTimers.forEach(function (id) { clearTimeout(id); });
    allTimers = [];
    if (inputTimer) {
      inputTimer.stop();
      inputTimer = null;
    }
  }

  // ── Shuffle ───────────────────────────────────────────────────────────────
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ── SVG Grid builder ──────────────────────────────────────────────────────
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function buildPlayerZone(playerIdx) {
    var zone = document.createElement('div');
    zone.className = 'player-zone';
    zone.id = 'zone-' + playerIdx;

    var label = document.createElement('div');
    label.className = 'zone-label';
    label.textContent = PLAYER_NAMES[playerIdx];
    label.style.color = PLAYER_COLORS[playerIdx];

    var wrapper = document.createElement('div');
    wrapper.className = 'grid-svg-wrapper';

    // Build SVG
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('xmlns', SVG_NS);

    // Defs: glow filter per player
    var defs = document.createElementNS(SVG_NS, 'defs');

    var glowFilter = document.createElementNS(SVG_NS, 'filter');
    glowFilter.setAttribute('id', 'glow-lit-' + playerIdx);
    var blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '4');
    blur.setAttribute('result', 'coloredBlur');
    var merge = document.createElementNS(SVG_NS, 'feMerge');
    var mn1 = document.createElementNS(SVG_NS, 'feMergeNode');
    mn1.setAttribute('in', 'coloredBlur');
    var mn2 = document.createElementNS(SVG_NS, 'feMergeNode');
    mn2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mn1);
    merge.appendChild(mn2);
    glowFilter.appendChild(blur);
    glowFilter.appendChild(merge);
    defs.appendChild(glowFilter);
    svg.appendChild(defs);

    var cellData = [];
    // 3x3 grid: cell size 56, gap 8, offset 10
    var CELL = 56, GAP = 8, OFFSET = 10;

    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        var cellIdx = row * 3 + col;
        var x = OFFSET + col * (CELL + GAP);
        var y = OFFSET + row * (CELL + GAP);

        // Group for the cell (tap target)
        var g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'grid-cell');
        g.setAttribute('data-cell', cellIdx);
        g.style.cursor = 'pointer';

        // Background rect
        var rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', CELL);
        rect.setAttribute('height', CELL);
        rect.setAttribute('rx', '10');
        rect.setAttribute('fill', '#37474F');
        rect.setAttribute('stroke', '#263238');
        rect.setAttribute('stroke-width', '2');

        // Overlay: X mark (hidden by default)
        var xLine1 = document.createElementNS(SVG_NS, 'line');
        xLine1.setAttribute('x1', x + 12); xLine1.setAttribute('y1', y + 12);
        xLine1.setAttribute('x2', x + CELL - 12); xLine1.setAttribute('y2', y + CELL - 12);
        xLine1.setAttribute('stroke', '#fff');
        xLine1.setAttribute('stroke-width', '4');
        xLine1.setAttribute('stroke-linecap', 'round');
        xLine1.setAttribute('visibility', 'hidden');

        var xLine2 = document.createElementNS(SVG_NS, 'line');
        xLine2.setAttribute('x1', x + CELL - 12); xLine2.setAttribute('y1', y + 12);
        xLine2.setAttribute('x2', x + 12); xLine2.setAttribute('y2', y + CELL - 12);
        xLine2.setAttribute('stroke', '#fff');
        xLine2.setAttribute('stroke-width', '4');
        xLine2.setAttribute('stroke-linecap', 'round');
        xLine2.setAttribute('visibility', 'hidden');

        // Checkmark (hidden by default)
        var check = document.createElementNS(SVG_NS, 'polyline');
        check.setAttribute('points',
          (x + 14) + ',' + (y + CELL / 2) + ' ' +
          (x + CELL / 2 - 4) + ',' + (y + CELL - 16) + ' ' +
          (x + CELL - 12) + ',' + (y + 14)
        );
        check.setAttribute('fill', 'none');
        check.setAttribute('stroke', '#fff');
        check.setAttribute('stroke-width', '4');
        check.setAttribute('stroke-linecap', 'round');
        check.setAttribute('stroke-linejoin', 'round');
        check.setAttribute('visibility', 'hidden');

        g.appendChild(rect);
        g.appendChild(xLine1);
        g.appendChild(xLine2);
        g.appendChild(check);
        svg.appendChild(g);

        cellData.push({ g: g, rect: rect, xLine1: xLine1, xLine2: xLine2, check: check, tapped: false });

        // Tap handler — closure over cellIdx and playerIdx
        (function (ci, pi, cd) {
          onTap(g, function () { handleCellTap(pi, ci, cd); });
        })(cellIdx, playerIdx, cellData[cellIdx]);
      }
    }

    wrapper.appendChild(svg);
    zone.appendChild(label);
    zone.appendChild(wrapper);

    return { el: zone, svgEl: svg, cells: cellData };
  }

  // ── Build all zones for current playerCount ───────────────────────────────
  function buildZones() {
    zonesContainer.innerHTML = '';
    zones = [];

    // Remove layout classes
    zonesContainer.className = 'zones-container';

    if (playerCount === 3) {
      zonesContainer.classList.add('layout-3p');
    } else if (playerCount === 4) {
      zonesContainer.classList.add('layout-4p');
    }

    for (var p = 0; p < playerCount; p++) {
      var zoneData = buildPlayerZone(p);
      zones.push(zoneData);
      zonesContainer.appendChild(zoneData.el);
    }
  }

  // ── Scoreboard ────────────────────────────────────────────────────────────
  function buildScoreboard() {
    scoreboardEl.innerHTML = '';
    for (var p = 0; p < playerCount; p++) {
      var chip = document.createElement('div');
      chip.className = 'score-chip';
      chip.id = 'chip-' + p;
      chip.style.color = PLAYER_COLORS[p];

      var dot = document.createElement('span');
      dot.className = 'score-dot';
      dot.style.background = PLAYER_COLORS[p];

      var label = document.createElement('span');
      label.className = 'score-label';
      label.textContent = PLAYER_NAMES[p];

      var val = document.createElement('span');
      val.className = 'score-val';
      val.id = 'score-val-' + p;
      val.textContent = '0';

      chip.appendChild(dot);
      chip.appendChild(label);
      chip.appendChild(val);
      scoreboardEl.appendChild(chip);
    }
  }

  function updateScoreDisplay() {
    for (var p = 0; p < playerCount; p++) {
      var el = document.getElementById('score-val-' + p);
      if (el) el.textContent = scores[p];
    }
  }

  // ── Cell state helpers ────────────────────────────────────────────────────
  function setCellDefault(cell) {
    cell.rect.setAttribute('fill', '#37474F');
    cell.rect.setAttribute('stroke', '#263238');
    cell.rect.setAttribute('stroke-width', '2');
    cell.rect.removeAttribute('filter');
    cell.xLine1.setAttribute('visibility', 'hidden');
    cell.xLine2.setAttribute('visibility', 'hidden');
    cell.check.setAttribute('visibility', 'hidden');
    cell.tapped = false;
  }

  function setCellLit(cell) {
    cell.rect.setAttribute('fill', '#FFD54F');
    cell.rect.setAttribute('stroke', '#F9A825');
    cell.rect.setAttribute('stroke-width', '3');
  }

  function setCellTapped(cell, playerIdx) {
    cell.rect.setAttribute('stroke', PLAYER_COLORS[playerIdx]);
    cell.rect.setAttribute('stroke-width', '4');
  }

  function setCellCorrect(cell) {
    cell.rect.setAttribute('fill', '#4CAF50');
    cell.rect.setAttribute('stroke', '#2E7D32');
    cell.rect.setAttribute('stroke-width', '2');
    cell.check.setAttribute('visibility', 'visible');
    cell.xLine1.setAttribute('visibility', 'hidden');
    cell.xLine2.setAttribute('visibility', 'hidden');
  }

  function setCellWrong(cell) {
    cell.rect.setAttribute('fill', '#EF5350');
    cell.rect.setAttribute('stroke', '#C62828');
    cell.rect.setAttribute('stroke-width', '2');
    cell.xLine1.setAttribute('visibility', 'visible');
    cell.xLine2.setAttribute('visibility', 'visible');
    cell.check.setAttribute('visibility', 'hidden');
  }

  function setCellMissed(cell) {
    // Lit cell that wasn't tapped — show outline indicator
    cell.rect.setAttribute('fill', '#4CAF50');
    cell.rect.setAttribute('stroke', '#2E7D32');
    cell.rect.setAttribute('stroke-width', '2');
    cell.rect.setAttribute('opacity', '0.5');
  }

  function resetAllCells() {
    zones.forEach(function (zone) {
      zone.cells.forEach(function (cell) {
        cell.rect.removeAttribute('opacity');
        setCellDefault(cell);
      });
    });
  }

  // ── Flash phase ───────────────────────────────────────────────────────────
  function startFlashPhase() {
    phase = 'flash';
    statusMessage.textContent = '기억하세요!';
    statusTimer.textContent = '';

    // Pick random lit cells (same for all players)
    var count = cellsForRound(currentRound);
    var indices = shuffle([0,1,2,3,4,5,6,7,8]).slice(0, count);
    litCells = indices;

    // Reset all cells, then light the chosen ones
    resetAllCells();
    playerTapped = [];
    for (var p = 0; p < playerCount; p++) {
      playerTapped.push(new Set());
    }

    // Light cells
    zones.forEach(function (zone) {
      litCells.forEach(function (ci) {
        setCellLit(zone.cells[ci]);
      });
    });

    sounds.play('flash');

    // After flash duration, go dark
    safeTimeout(function () {
      zones.forEach(function (zone) {
        litCells.forEach(function (ci) {
          setCellDefault(zone.cells[ci]);
        });
      });
      startInputPhase();
    }, FLASH_DURATION);
  }

  // ── Input phase ───────────────────────────────────────────────────────────
  function startInputPhase() {
    phase = 'input';
    statusMessage.textContent = '터치하세요!';
    statusTimer.textContent = INPUT_DURATION;

    // Add visual cue on zones
    zones.forEach(function (zone) {
      zone.el.classList.add('input-phase');
    });

    inputTimer = createTimer(INPUT_DURATION, function (remaining) {
      statusTimer.textContent = remaining;
    }, function () {
      statusTimer.textContent = '';
      endInputPhase();
    });

    inputTimer.start();
  }

  function endInputPhase() {
    phase = 'reveal';
    zones.forEach(function (zone) {
      zone.el.classList.remove('input-phase');
    });
    revealResults();
  }

  // ── Cell tap ──────────────────────────────────────────────────────────────
  function handleCellTap(playerIdx, cellIdx, cellObj) {
    if (phase !== 'input') return;
    if (cellObj.tapped) return; // already tapped this cell

    cellObj.tapped = true;
    playerTapped[playerIdx].add(cellIdx);
    setCellTapped(cellObj, playerIdx);
    sounds.play('tap');
  }

  // ── Reveal results ────────────────────────────────────────────────────────
  function revealResults() {
    var litSet = new Set(litCells);
    var roundDeltas = []; // points gained this round per player

    zones.forEach(function (zone, p) {
      var tappedSet = playerTapped[p];
      var delta = 0;
      var allCorrect = true;
      var anyWrong = false;

      // Mark each cell
      zone.cells.forEach(function (cell, ci) {
        var wasLit    = litSet.has(ci);
        var wasTapped = tappedSet.has(ci);

        if (wasLit && wasTapped) {
          // Correct tap
          setCellCorrect(cell);
          delta += 1;
        } else if (!wasLit && wasTapped) {
          // Wrong tap
          setCellWrong(cell);
          delta -= 1;
          anyWrong = true;
          allCorrect = false;
        } else if (wasLit && !wasTapped) {
          // Missed lit cell
          setCellMissed(cell);
          allCorrect = false;
        }
        // else: dark and not tapped — leave default
      });

      // Bonus: all cells correct AND no wrong taps
      if (allCorrect && !anyWrong && tappedSet.size === litCells.length && litCells.length > 0) {
        delta += 2;
        sounds.play('correct');
      } else if (anyWrong) {
        sounds.play('wrong');
      }

      scores[p] += delta;
      roundDeltas.push(delta);
    });

    updateScoreDisplay();

    // Show mini result overlay
    showRoundResultOverlay(roundDeltas, function () {
      if (currentRound >= TOTAL_ROUNDS) {
        showFinalResult();
      } else {
        startRound();
      }
    });
  }

  // ── Round result overlay ──────────────────────────────────────────────────
  function showRoundResultOverlay(deltas, onDone) {
    var overlay = document.createElement('div');
    overlay.className = 'round-result-overlay';

    var box = document.createElement('div');
    box.className = 'round-result-box';

    var title = document.createElement('div');
    title.className = 'round-result-title';
    title.textContent = currentRound < TOTAL_ROUNDS
      ? '라운드 ' + currentRound + ' 결과'
      : '최종 결과';
    box.appendChild(title);

    var rowsEl = document.createElement('div');
    rowsEl.className = 'round-result-scores';

    for (var p = 0; p < playerCount; p++) {
      var row = document.createElement('div');
      row.className = 'round-score-row';

      var dot = document.createElement('span');
      dot.className = 'round-score-dot';
      dot.style.background = PLAYER_COLORS[p];

      var name = document.createElement('span');
      name.className = 'round-score-name';
      name.textContent = PLAYER_NAMES[p];

      var delta = document.createElement('span');
      delta.className = 'round-score-delta';
      var d = deltas[p];
      if (d > 0) {
        delta.textContent = '+' + d;
        delta.classList.add('positive');
      } else if (d < 0) {
        delta.textContent = '' + d;
        delta.classList.add('negative');
      } else {
        delta.textContent = '±0';
        delta.classList.add('zero');
      }

      var total = document.createElement('span');
      total.className = 'round-score-total';
      total.textContent = '계 ' + scores[p];

      row.appendChild(dot);
      row.appendChild(name);
      row.appendChild(delta);
      row.appendChild(total);
      rowsEl.appendChild(row);
    }

    box.appendChild(rowsEl);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    safeTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      onDone();
    }, REVEAL_DURATION);
  }

  // ── Round start ───────────────────────────────────────────────────────────
  function startRound() {
    currentRound++;
    roundIndicator.textContent = '라운드 ' + currentRound + ' / ' + TOTAL_ROUNDS;
    statusMessage.textContent = '준비...';
    statusTimer.textContent = '';

    // Brief pause before flash
    safeTimeout(function () {
      startFlashPhase();
    }, 600);
  }

  // ── Final result screen ───────────────────────────────────────────────────
  function showFinalResult() {
    sounds.play('fanfare');

    var maxScore = Math.max.apply(null, scores);
    var winners  = [];
    for (var p = 0; p < playerCount; p++) {
      if (scores[p] === maxScore) winners.push(p);
    }

    var resultTitleEl  = document.getElementById('resultTitle');
    var resultScoresEl = document.getElementById('resultScores');

    if (winners.length === 1) {
      resultTitleEl.textContent = PLAYER_NAMES[winners[0]] + ' 승리!';
      resultTitleEl.style.color = PLAYER_COLORS[winners[0]];
    } else {
      resultTitleEl.textContent = '무승부!';
      resultTitleEl.style.color = '#673AB7';
    }

    // Sort players by score desc
    var order = [];
    for (var i = 0; i < playerCount; i++) { order.push(i); }
    order.sort(function (a, b) { return scores[b] - scores[a]; });

    resultScoresEl.innerHTML = '';
    order.forEach(function (p) {
      var isWinner = scores[p] === maxScore;
      var row = document.createElement('div');
      row.className = 'result-score-row' + (isWinner ? ' winner-row' : '');

      var dot = document.createElement('span');
      dot.className = 'result-score-dot';
      dot.style.background = PLAYER_COLORS[p];

      var nameSp = document.createElement('span');
      nameSp.className = 'result-score-name';
      nameSp.textContent = PLAYER_NAMES[p];

      var pts = document.createElement('span');
      pts.className = 'result-score-points';
      pts.textContent = scores[p] + '점';

      row.appendChild(dot);
      row.appendChild(nameSp);
      row.appendChild(pts);

      if (isWinner && winners.length === 1) {
        var crown = document.createElement('span');
        crown.className = 'result-crown';
        crown.textContent = '👑';
        row.appendChild(crown);
      }

      resultScoresEl.appendChild(row);
    });

    showScreen('result');
  }

  // ── Init game ─────────────────────────────────────────────────────────────
  function initGame() {
    clearAllTimers();
    phase        = 'idle';
    currentRound = 0;
    scores       = [];
    litCells     = [];
    playerTapped = [];

    for (var p = 0; p < playerCount; p++) {
      scores.push(0);
    }

    buildZones();
    buildScoreboard();
    showScreen('game');

    // Start first round after brief intro delay
    safeTimeout(function () {
      startRound();
    }, 500);
  }

  // ── Button wiring ─────────────────────────────────────────────────────────
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
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    clearAllTimers();
    showScreen('intro');
  });

})();
