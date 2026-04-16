/* games/spot-the-match/game.js */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  var TOTAL_ROUNDS   = 10;
  var SUB_TIMER_SECS = 5;   // seconds to pick 2 cells after buzzing in

  var PLAYER_COLORS = ['#AB47BC', '#29B6F6', '#EF5350', '#66BB6A'];
  var PLAYER_BG     = ['#7B1FA2', '#0277BD', '#C62828', '#2E7D32'];
  var PLAYER_NAMES  = ['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4'];

  // 32 unique emojis — enough to pick 24 for a 5x5 grid
  var EMOJI_POOL = [
    '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍌','🍉',
    '🥕','🌽','🍕','🍔','🍟','🧁','🍩','🎈','🎸','🚀',
    '🌟','⚽','🎯','🏆','💎','🔔','🎵','🌸','🌺','🍀',
    '🦊','🐬'
  ];

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
    // Buzzer press: sharp ascending blip
    buzzer: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    },
    // Tap / select: soft high click
    select: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    },
    // Match found: two bright rising tones
    match: function (ctx) {
      [660, 880, 1100].forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    },
    // Wrong: descending dull thud
    wrong: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.32);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    },
    // Timeout: descending buzz
    timeout: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    },
    // Fanfare: ascending arpeggio
    fanfare: function (ctx) {
      var notes = [523, 659, 784, 1047, 1319, 1568];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
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

  // ── Intro: player count selection ─────────────────────────────────────────
  var playerCount = 2;
  var playerBtns  = document.querySelectorAll('.player-btn');

  playerBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      playerCount = parseInt(btn.getAttribute('data-count'), 10);
      playerBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // ── Intro: difficulty selection ───────────────────────────────────────────
  var roundSeconds = 10;
  var difficultyBtns = document.querySelectorAll('.difficulty-btn');

  difficultyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      roundSeconds = parseInt(btn.getAttribute('data-seconds'), 10);
      difficultyBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var emojiGridEl    = document.getElementById('emojiGrid');
  var gridOverlayEl  = document.getElementById('gridOverlay');
  var buzzerZonesEl  = document.getElementById('buzzerZones');
  var roundDisplayEl = document.getElementById('roundDisplay');
  var feedbackEl     = document.getElementById('feedbackMsg');
  var timerBarFill   = document.getElementById('timerBarFill');
  var timerNumber    = document.getElementById('timerNumber');

  // ── Game state ─────────────────────────────────────────────────────────────
  //
  // STATE MACHINE per round:
  //   'LOOKING'   → all buzzers active, main timer counting
  //   'ANSWERING' → one player buzzed in, 5s sub-timer, grid interactive for them
  //   'TRANSITION'→ brief pause before next round
  //
  var STATE_LOOKING    = 'LOOKING';
  var STATE_ANSWERING  = 'ANSWERING';
  var STATE_TRANSITION = 'TRANSITION';

  var roundState    = STATE_LOOKING;
  var cells         = [];   // array of { emoji, index, el }
  var selectedIndex = -1;   // index into cells[] of first selected cell, or -1
  var scores        = [];
  var roundsPlayed  = 0;    // rounds completed (0..TOTAL_ROUNDS)
  var lockedOut     = [];   // boolean[] — players locked out this round
  var answeringPlayer = -1; // which player is currently answering (-1 = none)

  // Timers
  var mainTimer = null;
  var subTimer  = null;

  // Zone UI elements per player
  var zoneEls      = [];   // { zoneEl, btnEl, scoreEl, subTimerEl }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ── Timer UI ──────────────────────────────────────────────────────────────
  function updateMainTimerUI(remaining) {
    var pct = (remaining / roundSeconds) * 100;
    timerBarFill.style.width = pct + '%';
    timerNumber.textContent = remaining;
    var danger = remaining <= 3;
    timerBarFill.classList.toggle('danger', danger);
    timerNumber.classList.toggle('danger', danger);
  }

  function stopMainTimer() {
    if (mainTimer) {
      mainTimer.stop();
      mainTimer = null;
    }
  }

  function stopSubTimer() {
    if (subTimer) {
      subTimer.stop();
      subTimer = null;
    }
    // Clear all sub-timer displays
    zoneEls.forEach(function (z) {
      if (z.subTimerEl) z.subTimerEl.textContent = '';
    });
  }

  function startMainTimer() {
    stopMainTimer();

    timerBarFill.style.transition = 'none';
    timerBarFill.style.width = '100%';
    timerBarFill.classList.remove('danger');
    timerNumber.classList.remove('danger');
    timerNumber.textContent = roundSeconds;

    setTimeout(function () {
      timerBarFill.style.transition = 'width 0.9s linear, background 0.3s ease';

      mainTimer = createTimer(
        roundSeconds,
        function onTick(remaining) {
          updateMainTimerUI(remaining);
        },
        function onEnd() {
          handleRoundTimeout();
        }
      );
      mainTimer.start();
    }, 50);
  }

  function startSubTimer(playerIdx) {
    stopSubTimer();

    var z = zoneEls[playerIdx];
    if (z && z.subTimerEl) z.subTimerEl.textContent = SUB_TIMER_SECS;

    subTimer = createTimer(
      SUB_TIMER_SECS,
      function onTick(remaining) {
        if (z && z.subTimerEl) z.subTimerEl.textContent = remaining;
      },
      function onEnd() {
        handleSubTimerExpired(playerIdx);
      }
    );
    subTimer.start();
  }

  // ── Build buzzer zones ────────────────────────────────────────────────────
  function buildBuzzerZones() {
    buzzerZonesEl.innerHTML = '';
    zoneEls = [];

    for (var p = 0; p < playerCount; p++) {
      (function (idx) {
        var zone = document.createElement('div');
        zone.className = 'buzzer-zone';
        zone.id = 'buzzer-zone-' + idx;
        zone.style.background = PLAYER_BG[idx];
        zone.style.color = PLAYER_COLORS[idx];

        var label = document.createElement('div');
        label.className = 'buzzer-label';
        label.textContent = PLAYER_NAMES[idx];

        var score = document.createElement('div');
        score.className = 'buzzer-score';
        score.id = 'buzzer-score-' + idx;
        score.textContent = '0점';

        var btn = document.createElement('button');
        btn.className = 'buzzer-btn';
        btn.id = 'buzzer-btn-' + idx;
        btn.textContent = '찾았다!';

        var subTimerEl = document.createElement('div');
        subTimerEl.className = 'sub-timer';
        subTimerEl.id = 'sub-timer-' + idx;

        zone.appendChild(label);
        zone.appendChild(score);
        zone.appendChild(btn);
        zone.appendChild(subTimerEl);
        buzzerZonesEl.appendChild(zone);

        zoneEls.push({ zoneEl: zone, btnEl: btn, scoreEl: score, subTimerEl: subTimerEl });

        onTap(btn, function () {
          handleBuzzerPress(idx);
        });
      })(p);
    }
  }

  function updateScoreUI(playerIdx) {
    var z = zoneEls[playerIdx];
    if (z && z.scoreEl) z.scoreEl.textContent = scores[playerIdx] + '점';
  }

  function updateRoundDisplay() {
    var display = roundsPlayed + 1;
    roundDisplayEl.textContent = display > TOTAL_ROUNDS ? TOTAL_ROUNDS : display;
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  var feedbackTimer = null;

  function showFeedback(msg, type) {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    var cls = 'feedback-msg visible ';
    if (type === 'correct')      cls += 'correct-msg';
    else if (type === 'timeout') cls += 'timeout-msg';
    else                         cls += 'wrong-msg';
    feedbackEl.textContent = msg;
    feedbackEl.className = cls;
    feedbackTimer = setTimeout(function () {
      feedbackEl.className = 'feedback-msg';
    }, 1500);
  }

  // ── Grid overlay (blocks non-answering taps) ─────────────────────────────
  function showGridOverlay(playerIdx) {
    gridOverlayEl.innerHTML = '';
    var lbl = document.createElement('div');
    lbl.className = 'grid-overlay-label';
    lbl.textContent = PLAYER_NAMES[playerIdx] + ' 선택 중...';
    gridOverlayEl.appendChild(lbl);
    gridOverlayEl.className = 'grid-overlay active';
    gridOverlayEl.style.background = 'rgba(0,0,0,0)';  // transparent — label only
  }

  function hideGridOverlay() {
    gridOverlayEl.className = 'grid-overlay';
    gridOverlayEl.innerHTML = '';
  }

  // ── Zone state helpers ────────────────────────────────────────────────────
  function setZoneLooking() {
    // All non-locked-out players get active buzzers
    for (var p = 0; p < playerCount; p++) {
      var z = zoneEls[p];
      if (!z) continue;
      if (lockedOut[p]) {
        z.btnEl.textContent = '❌';
        z.btnEl.className = 'buzzer-btn locked-btn';
        z.btnEl.disabled = true;
        z.zoneEl.classList.add('locked');
        z.zoneEl.classList.remove('answering');
      } else {
        z.btnEl.textContent = '찾았다!';
        z.btnEl.className = 'buzzer-btn';
        z.btnEl.disabled = false;
        z.zoneEl.classList.remove('locked', 'answering');
      }
      if (z.subTimerEl) z.subTimerEl.textContent = '';
    }
  }

  function setZoneAnswering(playerIdx) {
    for (var p = 0; p < playerCount; p++) {
      var z = zoneEls[p];
      if (!z) continue;
      if (p === playerIdx) {
        z.btnEl.textContent = '선택 중...';
        z.btnEl.className = 'buzzer-btn answering-btn';
        z.btnEl.disabled = true;
        z.zoneEl.classList.add('answering');
        z.zoneEl.classList.remove('locked');
      } else {
        z.btnEl.textContent = lockedOut[p] ? '❌' : '대기 중';
        z.btnEl.className = 'buzzer-btn locked-btn';
        z.btnEl.disabled = true;
        z.zoneEl.classList.remove('answering');
        if (lockedOut[p]) z.zoneEl.classList.add('locked');
      }
    }
  }

  // ── Build a new 5x5 grid ──────────────────────────────────────────────────
  function buildGrid() {
    var chosen   = shuffle(EMOJI_POOL).slice(0, 24);
    var dupEmoji = chosen[Math.floor(Math.random() * 24)];
    var emojiList = shuffle(chosen.concat([dupEmoji]));

    emojiGridEl.innerHTML = '';
    cells = [];
    selectedIndex = -1;

    emojiList.forEach(function (emoji, i) {
      var cell = document.createElement('div');
      cell.className = 'emoji-cell';
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', '이모지 ' + (i + 1));
      cell.textContent = emoji;

      var cellData = { emoji: emoji, index: i, el: cell };
      cells.push(cellData);

      onTap(cell, function () { handleCellTap(cellData); });
      emojiGridEl.appendChild(cell);
    });
  }

  // ── Buzzer press ─────────────────────────────────────────────────────────
  function handleBuzzerPress(playerIdx) {
    if (roundState !== STATE_LOOKING) return;
    if (lockedOut[playerIdx]) return;

    sounds.play('buzzer');

    roundState = STATE_ANSWERING;
    answeringPlayer = playerIdx;

    // Pause main timer
    if (mainTimer) mainTimer.pause();

    // Update zones UI
    setZoneAnswering(playerIdx);

    // Show overlay (but allow THIS player to tap grid — overlay just shows label)
    showGridOverlay(playerIdx);

    // Clear any previous selection
    selectedIndex = -1;
    cells.forEach(function (c) {
      c.el.classList.remove('selected');
      c.el.style.borderColor = '';
    });

    // Start 5s sub-timer
    startSubTimer(playerIdx);
  }

  // ── Sub-timer expired: player ran out of time to pick ─────────────────────
  function handleSubTimerExpired(playerIdx) {
    if (roundState !== STATE_ANSWERING) return;
    if (answeringPlayer !== playerIdx) return;

    sounds.play('wrong');

    // Deselect
    if (selectedIndex !== -1) {
      cells[selectedIndex].el.classList.remove('selected');
      cells[selectedIndex].el.style.borderColor = '';
      selectedIndex = -1;
    }

    showFeedback(PLAYER_NAMES[playerIdx] + ' 시간 초과! -1점', 'wrong');

    scores[playerIdx] = Math.max(0, scores[playerIdx] - 1);
    updateScoreUI(playerIdx);

    // Lock out this player for the round
    lockedOut[playerIdx] = true;

    returnToLooking();
  }

  // ── Return to LOOKING state (others can buzz in) ──────────────────────────
  function returnToLooking() {
    stopSubTimer();
    hideGridOverlay();
    answeringPlayer = -1;
    selectedIndex = -1;

    // Check if all players locked out → skip round
    var allLocked = true;
    for (var p = 0; p < playerCount; p++) {
      if (!lockedOut[p]) { allLocked = false; break; }
    }

    if (allLocked) {
      handleRoundTimeout();
      return;
    }

    roundState = STATE_LOOKING;
    setZoneLooking();

    // Resume main timer
    if (mainTimer) mainTimer.start();
  }

  // ── Main timer timeout ────────────────────────────────────────────────────
  function handleRoundTimeout() {
    if (roundState === STATE_TRANSITION) return;
    roundState = STATE_TRANSITION;

    stopMainTimer();
    stopSubTimer();
    hideGridOverlay();
    answeringPlayer = -1;

    sounds.play('timeout');

    // Flash cells
    cells.forEach(function (c) {
      c.el.classList.add('timeout-flash');
      setTimeout(function () { c.el.classList.remove('timeout-flash'); }, 550);
    });

    showFeedback('시간 초과! ⏰ 아무도 못 찾았어요', 'timeout');

    roundsPlayed++;

    setTimeout(function () {
      if (roundsPlayed >= TOTAL_ROUNDS) {
        showResult();
      } else {
        updateRoundDisplay();
        startNewRound();
      }
    }, 1600);
  }

  // ── Cell tap handler ──────────────────────────────────────────────────────
  function handleCellTap(cellData) {
    if (roundState !== STATE_ANSWERING) return;
    if (answeringPlayer === -1) return;

    var tapIdx = cellData.index;

    // Tapping already-selected cell → deselect
    if (selectedIndex === tapIdx) {
      cellData.el.classList.remove('selected');
      cellData.el.style.borderColor = '';
      selectedIndex = -1;
      return;
    }

    // First selection
    if (selectedIndex === -1) {
      selectedIndex = tapIdx;
      cellData.el.classList.add('selected');
      cellData.el.style.borderColor = PLAYER_COLORS[answeringPlayer];
      sounds.play('select');
      return;
    }

    // Second selection — evaluate
    sounds.play('select');
    var firstCell  = cells[selectedIndex];
    var secondCell = cellData;
    var player     = answeringPlayer;

    secondCell.el.classList.add('selected');
    secondCell.el.style.borderColor = PLAYER_COLORS[player];

    // Prevent further taps during animation
    var prevState = roundState;
    roundState = STATE_TRANSITION;
    stopSubTimer();

    if (firstCell.emoji === secondCell.emoji) {
      // ── Correct ──
      setTimeout(function () {
        sounds.play('match');

        firstCell.el.classList.add('correct');
        secondCell.el.classList.add('correct');
        firstCell.el.style.borderColor  = PLAYER_COLORS[player];
        secondCell.el.style.borderColor = PLAYER_COLORS[player];

        setTimeout(function () {
          firstCell.el.classList.remove('selected', 'correct');
          secondCell.el.classList.remove('selected', 'correct');
          firstCell.el.style.borderColor  = '';
          secondCell.el.style.borderColor = '';
          selectedIndex = -1;

          stopMainTimer();
          hideGridOverlay();
          answeringPlayer = -1;

          scores[player]++;
          updateScoreUI(player);
          showFeedback(PLAYER_NAMES[player] + ' 정답! +1점 🎉', 'correct');

          roundsPlayed++;

          setTimeout(function () {
            if (roundsPlayed >= TOTAL_ROUNDS) {
              showResult();
            } else {
              updateRoundDisplay();
              startNewRound();
            }
          }, 1000);
        }, 400);
      }, 180);

    } else {
      // ── Wrong ──
      setTimeout(function () {
        sounds.play('wrong');

        firstCell.el.classList.add('wrong');
        secondCell.el.classList.add('wrong');

        setTimeout(function () {
          firstCell.el.classList.remove('selected', 'wrong');
          secondCell.el.classList.remove('selected', 'wrong');
          firstCell.el.style.borderColor  = '';
          secondCell.el.style.borderColor = '';
          selectedIndex = -1;

          scores[player] = Math.max(0, scores[player] - 1);
          updateScoreUI(player);
          showFeedback(PLAYER_NAMES[player] + ' 틀렸어요! -1점', 'wrong');

          // Lock out this player
          lockedOut[player] = true;

          // Back to LOOKING (others can try)
          returnToLooking();
        }, 420);
      }, 200);
    }
  }

  // ── Start a new round ────────────────────────────────────────────────────
  function startNewRound() {
    roundState = STATE_LOOKING;
    answeringPlayer = -1;
    selectedIndex = -1;
    lockedOut = [];
    for (var p = 0; p < playerCount; p++) {
      lockedOut.push(false);
    }

    hideGridOverlay();
    setZoneLooking();
    buildGrid();
    startMainTimer();
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  function showResult() {
    stopMainTimer();
    stopSubTimer();
    sounds.play('fanfare');

    var maxScore = Math.max.apply(null, scores);
    var winners  = [];
    for (var p = 0; p < playerCount; p++) {
      if (scores[p] === maxScore) winners.push(p);
    }

    var resultEmojiEl  = document.getElementById('resultEmoji');
    var resultTitleEl  = document.getElementById('resultTitle');
    var resultScoresEl = document.getElementById('resultScores');

    if (winners.length === 1) {
      resultEmojiEl.textContent = '🎉';
      resultTitleEl.textContent = PLAYER_NAMES[winners[0]] + ' 승리!';
      resultTitleEl.style.color = PLAYER_COLORS[winners[0]];
    } else {
      resultEmojiEl.textContent = '🤝';
      resultTitleEl.textContent = '무승부!';
      resultTitleEl.style.color = '#F9A825';
    }

    resultScoresEl.innerHTML = '';
    var order = [];
    for (var i = 0; i < playerCount; i++) { order.push(i); }
    order.sort(function (x, y) { return scores[y] - scores[x]; });

    order.forEach(function (p) {
      var isWinner = (scores[p] === maxScore) && (winners.length === 1);
      var row = document.createElement('div');
      row.className = 'result-score-row' + (scores[p] === maxScore ? ' winner-row' : '');

      var dot = document.createElement('span');
      dot.className = 'result-score-dot';
      dot.style.background = PLAYER_COLORS[p];

      var name = document.createElement('span');
      name.className = 'result-score-name';
      name.textContent = PLAYER_NAMES[p];

      var val = document.createElement('span');
      val.className = 'result-score-val';
      val.textContent = scores[p] + '점';

      row.appendChild(dot);
      row.appendChild(name);
      row.appendChild(val);

      if (isWinner) {
        var crown = document.createElement('span');
        crown.className = 'result-crown';
        crown.textContent = '👑';
        row.appendChild(crown);
      }

      resultScoresEl.appendChild(row);
    });

    showScreen('result');
  }

  // ── Init / reset game ──────────────────────────────────────────────────────
  function initGame() {
    stopMainTimer();
    stopSubTimer();

    roundsPlayed    = 0;
    answeringPlayer = -1;
    selectedIndex   = -1;
    roundState      = STATE_LOOKING;
    scores          = [];

    for (var p = 0; p < playerCount; p++) {
      scores.push(0);
    }

    feedbackEl.className = 'feedback-msg';
    updateRoundDisplay();
    buildBuzzerZones();
    startNewRound();

    showScreen('game');
  }

  // ── Button wiring ──────────────────────────────────────────────────────────
  document.getElementById('playBtn').addEventListener('click', function () {
    initGame();
  });

  document.getElementById('retryBtn').addEventListener('click', function () {
    initGame();
  });

  document.getElementById('homeBtn').addEventListener('click', function () {
    stopMainTimer();
    stopSubTimer();
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    stopMainTimer();
    stopSubTimer();
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    stopMainTimer();
    stopSubTimer();
    showScreen('intro');
  });

})();
