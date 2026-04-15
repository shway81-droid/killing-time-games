/* games/simon-says/game.js */

(function () {
  'use strict';

  // ─── 색깔 정의 ───────────────────────────────────────────────────
  var COLORS = ['red', 'blue', 'green', 'yellow'];

  // 각 색깔의 음계 주파수
  var COLOR_FREQ = {
    red:    262,  // C4
    blue:   330,  // E4
    green:  392,  // G4
    yellow: 523   // C5
  };

  // 플레이어 칩 색상 (식별용)
  var PLAYER_COLORS = ['#EF5350', '#29B6F6', '#66BB6A', '#FFEE58'];
  var PLAYER_TEXT_DARK = [false, false, false, true]; // 노랑만 어두운 텍스트

  // ─── 화면 전환 ───────────────────────────────────────────────────
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

  // ─── 사운드 ──────────────────────────────────────────────────────
  function makeColorTone(freq) {
    return function (ctx) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    };
  }

  var sounds = createSoundManager({
    red:    makeColorTone(COLOR_FREQ.red),
    blue:   makeColorTone(COLOR_FREQ.blue),
    green:  makeColorTone(COLOR_FREQ.green),
    yellow: makeColorTone(COLOR_FREQ.yellow),

    // 오답 버저
    wrong: function (ctx) {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    },

    // 승리 팡파레
    fanfare: function (ctx) {
      var notes = [523, 659, 784, 1047, 1319];
      notes.forEach(function (freq, i) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + i * 0.11;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
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
    onTap(btn, function () {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });

  updateSoundBtns();

  // ─── 인트로: 플레이어 수 선택 ───────────────────────────────────
  var selectedCount = 2;
  var countBtns = document.querySelectorAll('.count-btn');

  countBtns.forEach(function (btn) {
    onTap(btn, function () {
      selectedCount = parseInt(btn.getAttribute('data-count'), 10);
      countBtns.forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
    });
  });

  // ─── 게임 상태 ───────────────────────────────────────────────────
  var sequence      = [];   // 지금까지 누적된 색깔 시퀀스
  var round         = 0;    // 현재 라운드 (1부터)
  var MAX_ROUNDS    = 15;

  // players[i] = { name, color, eliminated, rank }
  var players = [];
  var activePlayers = [];   // 살아있는 플레이어 인덱스 (players 배열 기준)
  var currentPlayerIdx = 0; // activePlayers 내 인덱스

  // 현재 플레이어 입력 상태
  var inputIndex = 0;   // 현재 입력 중인 시퀀스 위치
  var accepting  = false; // 입력 수락 중 여부

  // 이번 라운드에서 틀린 플레이어들 (제거 예정)
  var eliminatedThisRound = [];

  // 라운드 생존자 추적 (이번 라운드 성공한 플레이어)
  var survivorsThisRound = [];

  var eliminationRank = []; // 탈락 순서 (나중에 탈락 = 높은 순위)

  // ─── DOM 참조 ────────────────────────────────────────────────────
  var statusText     = document.getElementById('statusText');
  var playerStatusRow = document.getElementById('playerStatusRow');
  var roundIndicator = document.getElementById('roundIndicator');
  var colorGrid      = document.getElementById('colorGrid');
  var inputDots      = document.getElementById('inputDots');
  var colorBtns      = {};

  COLORS.forEach(function (color) {
    colorBtns[color] = document.getElementById('btn-' + color);
  });

  // ─── 버튼 시각 효과 ──────────────────────────────────────────────
  function lightBtn(color) {
    var btn = colorBtns[color];
    btn.classList.add('lit');
  }

  function dimBtn(color) {
    var btn = colorBtns[color];
    btn.classList.remove('lit');
  }

  function flashTap(color) {
    var btn = colorBtns[color];
    btn.classList.add('tapped');
    setTimeout(function () {
      btn.classList.remove('tapped');
    }, 150);
  }

  // ─── 시퀀스 표시 ─────────────────────────────────────────────────
  function showSequence(callback) {
    colorGrid.classList.add('locked');
    setStatus('보여주는 중...');

    var i = 0;
    var delay = 200; // 초기 딜레이

    function showNext() {
      if (i >= sequence.length) {
        // 시퀀스 끝 — 잠시 후 입력 요청
        setTimeout(function () {
          colorGrid.classList.remove('locked');
          callback();
        }, 400);
        return;
      }

      var color = sequence[i];

      setTimeout(function () {
        lightBtn(color);
        sounds.play(color);

        setTimeout(function () {
          dimBtn(color);
          i++;
          showNext();
        }, 500); // 켜져 있는 시간 0.5초

      }, delay);

      delay = 300; // 이후 항목은 0.3초 간격
    }

    showNext();
  }

  // ─── 입력 도트 렌더 ──────────────────────────────────────────────
  function renderInputDots() {
    inputDots.innerHTML = '';
    for (var i = 0; i < sequence.length; i++) {
      var dot = document.createElement('div');
      dot.className = 'input-dot' + (i < inputIndex ? ' filled' : '');
      inputDots.appendChild(dot);
    }
  }

  // ─── 상태 텍스트 ─────────────────────────────────────────────────
  function setStatus(text) {
    statusText.textContent = text;
  }

  // ─── 플레이어 칩 렌더 ────────────────────────────────────────────
  function renderPlayerChips() {
    playerStatusRow.innerHTML = '';
    players.forEach(function (p, i) {
      var chip = document.createElement('div');
      chip.className = 'player-chip' + (p.eliminated ? ' eliminated' : '');
      chip.id = 'chip-' + i;

      var dot = document.createElement('div');
      dot.className = 'player-chip-dot';
      dot.style.background = PLAYER_COLORS[i];

      var name = document.createElement('span');
      name.textContent = p.name;

      chip.appendChild(dot);
      chip.appendChild(name);
      playerStatusRow.appendChild(chip);
    });
  }

  function highlightActivePlayer() {
    // 모든 칩 active-turn 제거
    players.forEach(function (_, i) {
      var chip = document.getElementById('chip-' + i);
      if (chip) chip.classList.remove('active-turn');
    });

    if (accepting && activePlayers.length > 0) {
      var pi = activePlayers[currentPlayerIdx];
      var chip = document.getElementById('chip-' + pi);
      if (chip) chip.classList.add('active-turn');
    }
  }

  // ─── 다음 플레이어 차례 ──────────────────────────────────────────
  function startPlayerTurn() {
    if (activePlayers.length === 0) {
      // 모두 탈락 — 라운드 진행 (실제로는 게임 종료)
      endGame();
      return;
    }

    var pi = activePlayers[currentPlayerIdx];
    var player = players[pi];

    inputIndex = 0;
    accepting  = true;

    setStatus('P' + (pi + 1) + ' ' + player.name + '의 차례');
    renderInputDots();
    highlightActivePlayer();
  }

  // ─── 색깔 버튼 탭 처리 ───────────────────────────────────────────
  function handleColorTap(color) {
    if (!accepting) return;

    flashTap(color);
    sounds.play(color);

    var expected = sequence[inputIndex];

    if (color !== expected) {
      // 오답!
      sounds.play('wrong');
      accepting = false;

      var pi = activePlayers[currentPlayerIdx];
      eliminatedThisRound.push(pi);

      // 짧은 시각 피드백 후 다음 처리
      document.getElementById('gameScreen').classList.add('eliminate-flash');
      setTimeout(function () {
        document.getElementById('gameScreen').classList.remove('eliminate-flash');
        advanceAfterTurn(false);
      }, 500);
      return;
    }

    // 정답
    inputIndex++;
    renderInputDots();

    if (inputIndex >= sequence.length) {
      // 시퀀스 완료!
      accepting = false;
      var pi2 = activePlayers[currentPlayerIdx];
      survivorsThisRound.push(pi2);

      setTimeout(function () {
        advanceAfterTurn(true);
      }, 300);
    }
  }

  // ─── 차례 완료 후 다음 처리 ──────────────────────────────────────
  function advanceAfterTurn(survived) {
    currentPlayerIdx++;

    // 이번 라운드의 모든 생존자가 차례를 마쳤는지 확인
    // (라운드 시작 당시 activePlayers 수만큼 차례가 돌아야 함)
    if (currentPlayerIdx >= activePlayers.length) {
      // 라운드 종료
      finishRound();
    } else {
      startPlayerTurn();
    }
  }

  // ─── 라운드 종료 처리 ────────────────────────────────────────────
  function finishRound() {
    // 이번 라운드 탈락자 처리
    eliminatedThisRound.forEach(function (pi) {
      players[pi].eliminated = true;
      eliminationRank.unshift(pi); // 앞에 추가 (먼저 탈락 = 낮은 순위)
    });

    renderPlayerChips();

    // activePlayers 업데이트 (생존자만 남김)
    activePlayers = activePlayers.filter(function (pi) {
      return !players[pi].eliminated;
    });

    // 승자 결정 조건
    if (activePlayers.length === 1) {
      // 마지막 1명 — 우승!
      sounds.play('fanfare');
      setTimeout(function () { endGame(); }, 600);
      return;
    }

    if (activePlayers.length === 0) {
      // 동시 탈락 — 모두 탈락
      setTimeout(function () { endGame(); }, 400);
      return;
    }

    if (round >= MAX_ROUNDS) {
      // 최대 라운드 도달 — 남은 모두 공동 우승
      sounds.play('fanfare');
      setTimeout(function () { endGame(); }, 600);
      return;
    }

    // 다음 라운드
    setTimeout(function () {
      startRound();
    }, 600);
  }

  // ─── 라운드 시작 ─────────────────────────────────────────────────
  function startRound() {
    round++;
    eliminatedThisRound = [];
    survivorsThisRound  = [];
    currentPlayerIdx    = 0;

    // 시퀀스에 색깔 1개 추가
    var randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    sequence.push(randomColor);

    roundIndicator.textContent = '라운드 ' + round;
    setStatus('보여주는 중...');
    inputDots.innerHTML = '';
    highlightActivePlayer(); // 모두 비활성

    // 잠시 후 시퀀스 표시
    setTimeout(function () {
      showSequence(function () {
        startPlayerTurn();
      });
    }, 500);
  }

  // ─── 게임 종료 ───────────────────────────────────────────────────
  function endGame() {
    // 남은 activePlayers는 공동 우승자 (순위 상위에 추가)
    // activePlayers 순서대로 1위 처리
    var winners = activePlayers.slice(); // 복사
    // eliminationRank는 탈락 역순 (마지막 탈락 = 2위, 그 전 탈락 = 3위 ...)
    // winners는 1위(들)

    showResult(winners);
  }

  // ─── 결과 화면 ───────────────────────────────────────────────────
  function showResult(winners) {
    var resultEmoji   = document.getElementById('resultEmoji');
    var resultWinner  = document.getElementById('resultWinner');
    var resultRanking = document.getElementById('resultRanking');

    resultRanking.innerHTML = '';

    // 전체 순위 구성
    // 1위: winners
    // 2위~: eliminationRank 역순 (마지막 탈락부터)
    var rankingList = []; // [{ playerIdx, rank }]

    if (winners.length === 0) {
      resultEmoji.textContent = '😮';
      resultWinner.textContent = '모두 탈락!';
    } else if (winners.length === 1) {
      resultEmoji.textContent = '🏆';
      resultWinner.textContent = players[winners[0]].name + ' 우승!';
    } else {
      resultEmoji.textContent = '🎉';
      resultWinner.textContent = '공동 우승!';
    }

    // 1위 추가
    winners.forEach(function (pi) {
      rankingList.push({ pi: pi, rank: 1 });
    });

    // eliminationRank는 [ 가장먼저탈락, ..., 마지막탈락 ]
    // 2위부터 내림차순
    for (var i = eliminationRank.length - 1; i >= 0; i--) {
      var rank = winners.length + (eliminationRank.length - i);
      rankingList.push({ pi: eliminationRank[i], rank: rank });
    }

    // 렌더
    var medals = ['🥇', '🥈', '🥉'];
    rankingList.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'rank-item' + (item.rank === 1 ? ' rank-first' : '');

      var badge = document.createElement('div');
      badge.className = 'rank-badge';
      badge.textContent = item.rank <= 3 ? medals[item.rank - 1] : item.rank + '위';

      var name = document.createElement('div');
      name.className = 'rank-name';
      name.textContent = players[item.pi].name;

      var dot = document.createElement('div');
      dot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:' + PLAYER_COLORS[item.pi] + ';flex-shrink:0;';

      div.appendChild(badge);
      div.appendChild(dot);
      div.appendChild(name);
      resultRanking.appendChild(div);
    });

    showScreen('result');
  }

  // ─── 게임 초기화 ─────────────────────────────────────────────────
  function initGame() {
    sequence             = [];
    round                = 0;
    eliminatedThisRound  = [];
    survivorsThisRound   = [];
    eliminationRank      = [];
    inputIndex           = 0;
    accepting            = false;
    currentPlayerIdx     = 0;

    // 플레이어 생성
    players = [];
    for (var i = 0; i < selectedCount; i++) {
      players.push({
        name:       'P' + (i + 1),
        eliminated: false
      });
    }
    activePlayers = players.map(function (_, i) { return i; });

    // 버튼 초기 상태
    COLORS.forEach(function (color) {
      colorBtns[color].classList.remove('lit', 'tapped');
    });
    colorGrid.classList.remove('locked');

    renderPlayerChips();
    roundIndicator.textContent = '라운드 1';
    inputDots.innerHTML = '';
    setStatus('준비 중...');

    showScreen('game');

    // 첫 라운드 시작
    setTimeout(function () {
      startRound();
    }, 600);
  }

  // ─── 색깔 버튼 탭 이벤트 연결 ───────────────────────────────────
  COLORS.forEach(function (color) {
    onTap(colorBtns[color], function () {
      handleColorTap(color);
    });
  });

  // ─── 화면 버튼 이벤트 ────────────────────────────────────────────
  onTap(document.getElementById('playBtn'), function () {
    initGame();
  });

  onTap(document.getElementById('retryBtn'), function () {
    initGame();
  });

  onTap(document.getElementById('homeBtn'), function () {
    goHome();
  });

  onTap(document.getElementById('backBtn'), function () {
    goHome();
  });

  onTap(document.getElementById('closeBtn'), function () {
    showScreen('intro');
  });

})();
