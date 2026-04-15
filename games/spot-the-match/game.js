/* games/spot-the-match/game.js */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  var TOTAL_ROUNDS = 10;

  var PLAYER_COLORS = ['#AB47BC', '#29B6F6', '#EF5350', '#66BB6A'];
  var PLAYER_NAMES  = ['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4'];

  // 30+ diverse emoji pool
  var EMOJI_POOL = [
    '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍌','🍉',
    '🥕','🌽','🍕','🍔','🍟','🧁','🍩','🎈','🎸','🚀',
    '🌟','⚽','🎯','🏆','💎','🔔','🎵','🌸','🌺','🍀'
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

  // ── Game state ─────────────────────────────────────────────────────────────
  var cells         = [];   // array of { emoji, index, el }
  var selectedIndex = -1;   // index into cells[] of first selected cell, or -1
  var locked        = false;
  var currentPlayer = 0;
  var scores        = [];
  var roundsFound   = 0;    // how many pairs have been found so far (0..10)

  // DOM refs
  var emojiGridEl   = document.getElementById('emojiGrid');
  var scoreboardEl  = document.getElementById('scoreboard');
  var turnDotEl     = document.getElementById('turnDot');
  var turnTextEl    = document.getElementById('turnText');
  var roundDisplayEl = document.getElementById('roundDisplay');
  var feedbackEl    = document.getElementById('feedbackMsg');

  // ── Helpers ───────────────────────────────────────────────────────────────
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ── Build a new 3x3 grid: 8 unique + 1 duplicate = 9 ─────────────────────
  function buildGrid() {
    // Pick 8 unique emojis
    var chosen = shuffle(EMOJI_POOL).slice(0, 8);
    // Pick one to duplicate
    var dupEmoji = chosen[Math.floor(Math.random() * 8)];
    // Build array of 9
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

  // ── Scoreboard UI ─────────────────────────────────────────────────────────
  function buildScoreboard() {
    scoreboardEl.innerHTML = '';
    for (var p = 0; p < playerCount; p++) {
      var chip = document.createElement('div');
      chip.className = 'score-chip' + (p === 0 ? ' active-turn' : '');
      chip.id = 'chip-' + p;
      chip.style.color = PLAYER_COLORS[p];

      var dot = document.createElement('span');
      dot.className = 'score-dot';
      dot.style.background = PLAYER_COLORS[p];

      var label = document.createElement('span');
      label.className = 'score-label';
      label.textContent = 'P' + (p + 1);

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

  function updateScoreUI(playerIdx) {
    var el = document.getElementById('score-val-' + playerIdx);
    if (el) el.textContent = scores[playerIdx];
  }

  function updateTurnUI() {
    turnDotEl.style.background = PLAYER_COLORS[currentPlayer];
    turnTextEl.textContent = PLAYER_NAMES[currentPlayer] + '의 차례';
    for (var p = 0; p < playerCount; p++) {
      var chip = document.getElementById('chip-' + p);
      if (chip) chip.classList.toggle('active-turn', p === currentPlayer);
    }
  }

  function updateRoundDisplay() {
    roundDisplayEl.textContent = roundsFound + 1 > TOTAL_ROUNDS ? TOTAL_ROUNDS : roundsFound + 1;
  }

  // ── Feedback message ───────────────────────────────────────────────────────
  var feedbackTimer = null;

  function showFeedback(msg, type) {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackEl.textContent = msg;
    feedbackEl.className = 'feedback-msg visible ' + (type === 'correct' ? 'correct-msg' : 'wrong-msg');
    feedbackTimer = setTimeout(function () {
      feedbackEl.className = 'feedback-msg';
    }, 1200);
  }

  // ── Cell tap handler ───────────────────────────────────────────────────────
  function handleCellTap(cellData) {
    if (locked) return;
    if (cellData.el.classList.contains('solved')) return;

    var tapIdx = cellData.index;

    // Tapping the already-selected cell → deselect
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
      cellData.el.style.borderColor = PLAYER_COLORS[currentPlayer];
      sounds.play('select');
      return;
    }

    // Second selection
    sounds.play('select');
    var firstCell = cells[selectedIndex];
    var secondCell = cellData;

    // Visually select second
    secondCell.el.classList.add('selected');
    secondCell.el.style.borderColor = PLAYER_COLORS[currentPlayer];

    locked = true;

    if (firstCell.emoji === secondCell.emoji) {
      // Correct match!
      setTimeout(function () {
        sounds.play('match');

        // Animate correct
        firstCell.el.classList.add('correct');
        secondCell.el.classList.add('correct');
        firstCell.el.style.borderColor = PLAYER_COLORS[currentPlayer];
        secondCell.el.style.borderColor = PLAYER_COLORS[currentPlayer];

        setTimeout(function () {
          // Mark as solved / dim
          firstCell.el.classList.remove('selected', 'correct');
          secondCell.el.classList.remove('selected', 'correct');
          firstCell.el.classList.add('solved');
          secondCell.el.classList.add('solved');

          scores[currentPlayer]++;
          updateScoreUI(currentPlayer);
          roundsFound++;

          showFeedback('정답! 🎉 한 번 더!', 'correct');

          selectedIndex = -1;
          locked = false;

          if (roundsFound >= TOTAL_ROUNDS) {
            setTimeout(showResult, 600);
          } else {
            // Same player keeps turn — build new grid after short delay
            updateRoundDisplay();
            setTimeout(function () {
              buildGrid();
            }, 500);
          }
        }, 400);
      }, 180);

    } else {
      // Wrong!
      setTimeout(function () {
        sounds.play('wrong');

        firstCell.el.classList.add('wrong');
        secondCell.el.classList.add('wrong');

        setTimeout(function () {
          firstCell.el.classList.remove('selected', 'wrong');
          secondCell.el.classList.remove('selected', 'wrong');
          firstCell.el.style.borderColor = '';
          secondCell.el.style.borderColor = '';

          selectedIndex = -1;
          locked = false;

          showFeedback('틀렸어요! 다음 플레이어 차례', 'wrong');

          // Next player
          currentPlayer = (currentPlayer + 1) % playerCount;
          updateTurnUI();
        }, 420);
      }, 200);
    }
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  function showResult() {
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

    // Build score rows sorted by score desc
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
    currentPlayer = 0;
    roundsFound   = 0;
    selectedIndex = -1;
    locked        = false;
    scores        = [];

    for (var p = 0; p < playerCount; p++) {
      scores.push(0);
    }

    buildScoreboard();
    updateTurnUI();
    updateRoundDisplay();
    buildGrid();

    // Clear feedback
    feedbackEl.className = 'feedback-msg';

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
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function () {
    showScreen('intro');
  });

})();
