/* games/basketball/game.js */

(function () {
  'use strict';

  /* =====================================================
     상수
     ===================================================== */
  var SHOTS_PER_PLAYER = 5;
  var PLAYER_COLORS = ['#EF5350', '#29B6F6', '#66BB6A', '#FFA726'];
  var PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'];

  // SVG 좌표계 기준 (viewBox 0 0 360 600)
  var SVG_W = 360;
  var SVG_H = 600;
  var HOOP_CX = 180;   // 림 중심 X
  var HOOP_CY = 118;   // 림 중심 Y
  var HOOP_RX = 38;    // 림 반지름 X
  var BALL_REST_X = 180;
  var BALL_REST_Y = 520;
  var BALL_R = 26;

  // 슛 판정 허용 범위
  var SWISH_X_RANGE = 22;  // 림 중심으로부터 X 거리
  var SWISH_Y_RANGE = 14;  // 림 중심으로부터 Y 거리
  var RIM_HIT_X_RANGE = 36;
  var RIM_HIT_Y_RANGE = 22;

  var GRAVITY = 0.32;      // SVG 유닛/frame² (pixels-equivalent)
  var MIN_SWIPE_UP = 60;   // 최소 업 스와이프 SVG 유닛 (드래그 거리)

  /* =====================================================
     DOM 요소
     ===================================================== */
  var screens = {
    intro: document.getElementById('introScreen'),
    game: document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
  }

  // 인트로
  var playerCountBtns = document.querySelectorAll('.player-count-btn');
  var playBtn = document.getElementById('playBtn');
  var backBtn = document.getElementById('backBtn');
  var soundToggleIntro = document.getElementById('soundToggleIntro');

  // 게임
  var hudPlayer = document.getElementById('hudPlayer');
  var hudShots = document.getElementById('hudShots');
  var hudScore = document.getElementById('hudScore');
  var closeGameBtn = document.getElementById('closeGameBtn');
  var courtArea = document.getElementById('courtArea');
  var courtSvg = document.getElementById('courtSvg');
  var ballGroup = document.getElementById('ballGroup');
  var ballCircle = document.getElementById('ballCircle');
  var ballLineV = document.getElementById('ballLineV');
  var ballLineH1 = document.getElementById('ballLineH1');
  var ballLineH2 = document.getElementById('ballLineH2');
  var ballOutline = document.getElementById('ballOutline');
  var trajectoryGuide = document.getElementById('trajectoryGuide');
  var dragArrow = document.getElementById('dragArrow');
  var rimFront = document.getElementById('rimFront');
  var netGroup = document.getElementById('netGroup');
  var scorePopup = document.getElementById('scorePopup');
  var shotResult = document.getElementById('shotResult');
  var playerHandoff = document.getElementById('playerHandoff');
  var handoffPlayer = document.getElementById('handoffPlayer');
  var handoffScores = document.getElementById('handoffScores');
  var handoffBtn = document.getElementById('handoffBtn');
  var scoreboardBar = document.getElementById('scoreboardBar');

  // 결과
  var resultTrophy = document.getElementById('resultTrophy');
  var resultTitle = document.getElementById('resultTitle');
  var resultWinner = document.getElementById('resultWinner');
  var resultScores = document.getElementById('resultScores');
  var retryBtn = document.getElementById('retryBtn');
  var homeBtn = document.getElementById('homeBtn');

  /* =====================================================
     사운드
     ===================================================== */
  var sounds = createSoundManager({
    // 드리블 / 바운스
    bounce: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    },
    // 림 맞음
    rim: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);

      // 두번째 "탁" 소리
      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(300, ctx.currentTime + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.05);
      osc2.stop(ctx.currentTime + 0.2);
    },
    // 스위시 (깔끔하게 통과)
    swish: function (ctx) {
      // 네트 스윙 + 달달한 사운드
      var buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 4000;
      filter.Q.value = 0.8;
      var gain = ctx.createGain();
      gain.gain.value = 0.3;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();

      // 맑은 tone
      var osc = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0.18, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain2);
      gain2.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    },
    // 관중 환호 (퍼펙트 슛 시)
    cheer: function (ctx) {
      // 박수 소리 시뮬레이션
      for (var j = 0; j < 6; j++) {
        (function (delay) {
          var buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
          var d = buf.getChannelData(0);
          for (var i = 0; i < d.length; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
          }
          var src = ctx.createBufferSource();
          src.buffer = buf;
          var filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 1200;
          var gain = ctx.createGain();
          gain.gain.value = 0.22;
          src.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          src.start(ctx.currentTime + delay);
        })(j * 0.11);
      }
      // 팡파레
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.25);
      });
    },
    // 미스 소리
    miss: function (ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    },
    // 게임 종료
    fanfare: function (ctx) {
      var melody = [523, 523, 659, 523, 784, 740];
      var times = [0, 0.18, 0.36, 0.54, 0.72, 1.0];
      melody.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        var t = ctx.currentTime + times[i];
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    }
  });

  function updateSoundBtn(btn) {
    btn.textContent = sounds.isMuted() ? '🔇' : '🔊';
  }

  soundToggleIntro.addEventListener('click', function () {
    sounds.toggleMute();
    updateSoundBtn(soundToggleIntro);
  });

  updateSoundBtn(soundToggleIntro);

  /* =====================================================
     인트로 — 플레이어 수 선택
     ===================================================== */
  var selectedPlayerCount = 2;

  playerCountBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      playerCountBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedPlayerCount = parseInt(btn.dataset.count, 10);
    });
  });

  onTap(backBtn, function () { goHome(); });
  onTap(playBtn, function () { initGame(selectedPlayerCount); });

  /* =====================================================
     게임 상태
     ===================================================== */
  var state = {
    numPlayers: 2,
    scores: [],        // scores[playerIdx] = total points
    shotHistory: [],   // shotHistory[playerIdx] = [pts, pts, ...] up to 5
    currentPlayer: 0,
    currentShot: 0,    // 0-based shot index for current player
    // Turn order: round-robin (P1 shot1, P2 shot1, P1 shot2 ...)
    roundIndex: 0,     // which shot round (0..4)
    turnIndex: 0,      // which player in this round (0..numPlayers-1)
    totalTurns: 0,     // total turns done
    maxTurns: 0,
    ballInFlight: false,
    isDragging: false,
    dragStartSvg: null,
    dragCurrentSvg: null
  };

  /* =====================================================
     SVG 좌표 변환 헬퍼
     ===================================================== */
  function clientToSvg(clientX, clientY) {
    var rect = courtSvg.getBoundingClientRect();
    var scaleX = SVG_W / rect.width;
    var scaleY = SVG_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  /* =====================================================
     볼 SVG 업데이트
     ===================================================== */
  function setBallPos(cx, cy) {
    var r = BALL_R;
    ballCircle.setAttribute('cx', cx);
    ballCircle.setAttribute('cy', cy);
    ballOutline.setAttribute('cx', cx);
    ballOutline.setAttribute('cy', cy);
    // 수직 줄
    ballLineV.setAttribute('d',
      'M' + cx + ' ' + (cy - r) +
      ' Q' + (cx - 6) + ' ' + cy +
      ' ' + cx + ' ' + (cy + r));
    // 위 곡선
    ballLineH1.setAttribute('d',
      'M' + (cx - r) + ' ' + cy +
      ' Q' + cx + ' ' + (cy - 6) +
      ' ' + (cx + r) + ' ' + cy);
    // 아래 곡선
    ballLineH2.setAttribute('d',
      'M' + (cx - r) + ' ' + cy +
      ' Q' + cx + ' ' + (cy + 6) +
      ' ' + (cx + r) + ' ' + cy);
  }

  function resetBall() {
    setBallPos(BALL_REST_X, BALL_REST_Y);
    ballGroup.style.filter = '';
    ballGroup.classList.remove('ball-ready');
  }

  /* =====================================================
     궤적 가이드 그리기 (드래그 중)
     ===================================================== */
  function computeTrajectoryPath(svgStartX, svgStartY, vx, vy, steps, dt) {
    var pts = [];
    var x = svgStartX;
    var y = svgStartY;
    var velX = vx;
    var velY = vy;
    for (var i = 0; i < steps; i++) {
      pts.push(x + ',' + y);
      x += velX * dt;
      y += velY * dt;
      velY += GRAVITY * dt;
      if (y < 0 || y > SVG_H || x < -50 || x > SVG_W + 50) break;
    }
    if (pts.length < 2) return '';
    return 'M' + pts.join(' L');
  }

  function updateTrajectoryGuide(ballX, ballY, vx, vy) {
    if (!vx && !vy) {
      trajectoryGuide.setAttribute('display', 'none');
      dragArrow.setAttribute('display', 'none');
      return;
    }
    var path = computeTrajectoryPath(ballX, ballY, vx, vy, 60, 1.5);
    trajectoryGuide.setAttribute('d', path);
    trajectoryGuide.setAttribute('display', '');

    // 방향 화살표 (볼 중심에서 방향으로 짧게)
    var arrowLen = 38;
    var mag = Math.sqrt(vx * vx + vy * vy) || 1;
    var nx = vx / mag;
    var ny = vy / mag;
    dragArrow.setAttribute('x1', ballX);
    dragArrow.setAttribute('y1', ballY);
    dragArrow.setAttribute('x2', ballX + nx * arrowLen);
    dragArrow.setAttribute('y2', ballY + ny * arrowLen);
    dragArrow.setAttribute('display', '');
  }

  /* =====================================================
     드래그 입력 처리
     ===================================================== */
  var dragStart = null; // { svgX, svgY }

  function onDragStart(clientX, clientY) {
    if (state.ballInFlight) return;
    if (playerHandoff.classList.contains('active')) return;

    var sv = clientToSvg(clientX, clientY);
    // 볼 근처인지 체크 (히트 영역 넉넉히)
    var dx = sv.x - BALL_REST_X;
    var dy = sv.y - BALL_REST_Y;
    if (Math.sqrt(dx * dx + dy * dy) > BALL_R * 2.5) return;

    state.isDragging = true;
    dragStart = { x: sv.x, y: sv.y };
    ballGroup.style.filter = 'drop-shadow(0 0 8px rgba(255,200,100,0.8))';
    trajectoryGuide.setAttribute('display', '');
  }

  function onDragMove(clientX, clientY) {
    if (!state.isDragging) return;
    var sv = clientToSvg(clientX, clientY);

    // 드래그 벡터 (뒤집기: 위로 드래그 = 위로 발사)
    var dx = (sv.x - dragStart.x) * 0.12;
    var dy = (sv.y - dragStart.y) * 0.12;

    // 위로 드래그된 경우만 궤적 표시
    if (sv.y < dragStart.y) {
      updateTrajectoryGuide(BALL_REST_X, BALL_REST_Y, dx, dy);
    } else {
      trajectoryGuide.setAttribute('display', 'none');
      dragArrow.setAttribute('display', 'none');
    }
  }

  function onDragEnd(clientX, clientY) {
    if (!state.isDragging) return;
    state.isDragging = false;
    trajectoryGuide.setAttribute('display', 'none');
    dragArrow.setAttribute('display', 'none');
    ballGroup.style.filter = '';

    var sv = clientToSvg(clientX, clientY);
    var dx = dragStart.x - sv.x;
    var dy = dragStart.y - sv.y;

    // 위쪽으로 충분히 스와이프했는지
    if (dy < MIN_SWIPE_UP) {
      // 너무 짧으면 무시
      resetBall();
      return;
    }

    // 초기 속도 계산 (드래그 거리 비례, 클램프)
    var speedScale = 0.115;
    var vx = -dx * speedScale;
    var vy = -dy * speedScale;

    // 속도 클램프
    var maxVY = 9.5;
    var minVY = 3.5;
    if (-vy > maxVY) { vx *= maxVY / (-vy); vy = -maxVY; }
    if (-vy < minVY) { vx *= minVY / (-vy); vy = -minVY; }

    sounds.play('bounce');
    throwBall(BALL_REST_X, BALL_REST_Y, vx, vy);
  }

  // 터치 이벤트
  courtArea.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    onDragStart(t.clientX, t.clientY);
  }, { passive: false });

  courtArea.addEventListener('touchmove', function (e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    onDragMove(t.clientX, t.clientY);
  }, { passive: false });

  courtArea.addEventListener('touchend', function (e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    onDragEnd(t.clientX, t.clientY);
  }, { passive: false });

  // 마우스 이벤트 (PC 테스트용)
  courtArea.addEventListener('mousedown', function (e) {
    onDragStart(e.clientX, e.clientY);
  });

  courtArea.addEventListener('mousemove', function (e) {
    onDragMove(e.clientX, e.clientY);
  });

  courtArea.addEventListener('mouseup', function (e) {
    onDragEnd(e.clientX, e.clientY);
  });

  courtArea.addEventListener('mouseleave', function (e) {
    if (state.isDragging) {
      state.isDragging = false;
      trajectoryGuide.setAttribute('display', 'none');
      dragArrow.setAttribute('display', 'none');
      ballGroup.style.filter = '';
      resetBall();
    }
  });

  /* =====================================================
     볼 물리 애니메이션
     ===================================================== */
  var animFrame = null;

  function throwBall(startX, startY, vx, vy) {
    if (animFrame) cancelAnimationFrame(animFrame);
    state.ballInFlight = true;

    var x = startX;
    var y = startY;
    var velX = vx;
    var velY = vy;
    var scored = false;
    var hoopPassedBelow = false; // 공이 림 위에서 아래로 통과 판정
    var hoopCheckStarted = false;
    var frameCount = 0;
    var maxFrames = 240; // 4초 제한

    function frame() {
      frameCount++;
      x += velX;
      y += velY;
      velY += GRAVITY;

      setBallPos(x, y);

      // 림 통과 판정
      // 공 중심이 림 Y 위에서 내려올 때 (위에서 아래로 통과)
      if (!scored) {
        if (y < HOOP_CY - 4 && Math.abs(x - HOOP_CX) < HOOP_RX + BALL_R) {
          hoopCheckStarted = true;
        }
        if (hoopCheckStarted && y >= HOOP_CY && !hoopPassedBelow) {
          hoopPassedBelow = true;
          // 판정
          var distX = Math.abs(x - HOOP_CX);
          var distY = Math.abs(y - HOOP_CY);
          if (distX < SWISH_X_RANGE && distY < SWISH_Y_RANGE) {
            // 스위시!
            scored = true;
            onShotResult('swish', x, y);
            return;
          } else if (distX < RIM_HIT_X_RANGE && distY < RIM_HIT_Y_RANGE) {
            // 림 맞고 들어감
            scored = true;
            onShotResult('rim', x, y);
            return;
          }
        }
      }

      // 화면 밖 또는 최대 프레임 초과
      if (frameCount > maxFrames || y > SVG_H + 60 || x < -80 || x > SVG_W + 80) {
        if (!scored) {
          onShotResult('miss', x, y);
        }
        return;
      }

      // 상단 벽 반사 (공이 위로 나가지 않도록)
      if (y < BALL_R && velY < 0) {
        velY = -velY * 0.5;
        y = BALL_R;
      }

      animFrame = requestAnimationFrame(frame);
    }

    animFrame = requestAnimationFrame(frame);
  }

  /* =====================================================
     슛 결과 처리
     ===================================================== */
  function onShotResult(type, finalX, finalY) {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    state.ballInFlight = false;

    var pts = 0;
    var label = '';

    if (type === 'swish') {
      pts = 3;
      label = '🏀 스위시! +3';
      sounds.play('swish');
      setTimeout(function () { sounds.play('cheer'); }, 200);
      flashHoop();
    } else if (type === 'rim') {
      pts = 2;
      label = '🎯 림 인! +2';
      sounds.play('rim');
      setTimeout(function () { sounds.play('swish'); }, 180);
    } else {
      pts = 0;
      label = '😅 미스!';
      sounds.play('miss');
    }

    // 점수 기록
    var pi = state.currentPlayer;
    state.scores[pi] += pts;
    state.shotHistory[pi].push(pts);

    // 팝업 표시
    showScorePopup(pts, type);
    showShotResultLabel(label);

    // HUD 업데이트
    updateHud();
    updateScoreboardBar();

    // 잠시 뒤 공 리셋 후 다음 턴
    setTimeout(function () {
      resetBall();
      setTimeout(function () {
        advanceTurn();
      }, 300);
    }, 900);
  }

  function flashHoop() {
    var hoopEl = rimFront;
    hoopEl.style.animation = 'none';
    hoopEl.offsetHeight; // reflow
    hoopEl.style.animation = 'rimFlash 0.5s ease-out';
    // 네트도 흔들기
    netGroup.style.animation = 'none';
    netGroup.offsetHeight;
    netGroup.style.animation = 'rimFlash 0.5s ease-out';
    setTimeout(function () {
      hoopEl.style.animation = '';
      netGroup.style.animation = '';
    }, 600);
  }

  function showScorePopup(pts, type) {
    scorePopup.classList.remove('show-3', 'show-2', 'show-miss');
    scorePopup.offsetHeight; // reflow

    if (pts === 3) {
      scorePopup.textContent = '+3점 🔥';
      scorePopup.style.color = '#FFD54F';
      scorePopup.classList.add('show-3');
    } else if (pts === 2) {
      scorePopup.textContent = '+2점';
      scorePopup.style.color = '#FFFFFF';
      scorePopup.classList.add('show-2');
    } else {
      scorePopup.textContent = '미스...';
      scorePopup.style.color = 'rgba(255,255,255,0.7)';
      scorePopup.classList.add('show-miss');
    }
  }

  function showShotResultLabel(label) {
    shotResult.textContent = label;
    shotResult.classList.remove('show');
    shotResult.offsetHeight;
    shotResult.classList.add('show');
    setTimeout(function () {
      shotResult.classList.remove('show');
    }, 1100);
  }

  /* =====================================================
     턴 진행
     ===================================================== */
  function advanceTurn() {
    state.totalTurns++;

    if (state.totalTurns >= state.maxTurns) {
      // 게임 종료
      setTimeout(showResult, 200);
      return;
    }

    // 다음 플레이어/라운드 계산
    state.turnIndex++;
    if (state.turnIndex >= state.numPlayers) {
      state.turnIndex = 0;
      state.roundIndex++;
    }
    state.currentPlayer = state.turnIndex;
    state.currentShot = state.roundIndex;

    // 플레이어 교체 오버레이 표시
    showHandoff();
  }

  function showHandoff() {
    // 현재 점수 표시
    var scoresHtml = '';
    for (var i = 0; i < state.numPlayers; i++) {
      var isCurrent = (i === state.currentPlayer);
      scoresHtml +=
        '<div class="handoff-score-row' + (isCurrent ? ' current' : '') + '">' +
        '<span>' + PLAYER_LABELS[i] + '</span>' +
        '<span class="handoff-score-pts">' + state.scores[i] + '점</span>' +
        '</div>';
    }
    handoffScores.innerHTML = scoresHtml;

    var playerColor = PLAYER_COLORS[state.currentPlayer];
    handoffPlayer.textContent = PLAYER_LABELS[state.currentPlayer] + ' 차례!';
    handoffPlayer.style.color = '#FFEE58';

    playerHandoff.classList.add('active');
  }

  onTap(handoffBtn, function () {
    playerHandoff.classList.remove('active');
    updateHud();
    // 공 준비 상태 표시
    setTimeout(function () {
      ballGroup.classList.add('ball-ready');
      setTimeout(function () {
        ballGroup.classList.remove('ball-ready');
      }, 1500);
    }, 100);
  });

  /* =====================================================
     HUD 업데이트
     ===================================================== */
  function updateHud() {
    var pi = state.currentPlayer;
    hudPlayer.textContent = PLAYER_LABELS[pi];
    hudPlayer.style.color = PLAYER_COLORS[pi];
    hudScore.textContent = state.scores[pi];

    // 남은 슛 (●)
    var shotsLeft = SHOTS_PER_PLAYER - state.roundIndex;
    // 현재 이번 라운드 처리 전이면 roundIndex가 현재 번호
    var shotsText = '';
    for (var i = 0; i < SHOTS_PER_PLAYER; i++) {
      shotsText += (i < shotsLeft) ? '●' : '○';
    }
    hudShots.textContent = shotsText;
  }

  function updateScoreboardBar() {
    var html = '';
    for (var i = 0; i < state.numPlayers; i++) {
      var isActive = (i === state.currentPlayer);
      html +=
        '<div class="scorebar-player' + (isActive ? ' active' : '') + '">' +
        '<div class="scorebar-name" style="color:' + PLAYER_COLORS[i] + '">' + PLAYER_LABELS[i] + '</div>' +
        '<div class="scorebar-pts">' + state.scores[i] + '</div>' +
        '</div>';
    }
    scoreboardBar.innerHTML = html;
  }

  /* =====================================================
     게임 초기화
     ===================================================== */
  function initGame(numPlayers) {
    state.numPlayers = numPlayers;
    state.scores = [];
    state.shotHistory = [];
    for (var i = 0; i < numPlayers; i++) {
      state.scores.push(0);
      state.shotHistory.push([]);
    }
    state.currentPlayer = 0;
    state.roundIndex = 0;
    state.turnIndex = 0;
    state.totalTurns = 0;
    state.maxTurns = numPlayers * SHOTS_PER_PLAYER;
    state.ballInFlight = false;
    state.isDragging = false;

    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    resetBall();

    updateHud();
    updateScoreboardBar();

    playerHandoff.classList.remove('active');

    showScreen('game');

    // 첫 번째 플레이어 핸드오프 표시
    setTimeout(function () {
      showHandoff();
    }, 200);
  }

  /* =====================================================
     결과 화면
     ===================================================== */
  function showResult() {
    sounds.play('fanfare');

    // 최고 점수 찾기
    var maxScore = -1;
    var winners = [];
    for (var i = 0; i < state.numPlayers; i++) {
      if (state.scores[i] > maxScore) {
        maxScore = state.scores[i];
        winners = [i];
      } else if (state.scores[i] === maxScore) {
        winners.push(i);
      }
    }

    var isTie = winners.length > 1;

    if (isTie) {
      resultTrophy.textContent = '🤝';
      resultTitle.textContent = '무승부!';
      resultWinner.textContent = winners.map(function (i) { return PLAYER_LABELS[i]; }).join(', ') + ' 동점!';
    } else {
      resultTrophy.textContent = '🏆';
      resultTitle.textContent = '게임 끝!';
      resultWinner.textContent = PLAYER_LABELS[winners[0]] + ' 승리! 🎉';
    }

    // 점수 상세
    var html = '';
    for (var j = 0; j < state.numPlayers; j++) {
      var isWinner = (winners.indexOf(j) !== -1);
      var dotsHtml = '';
      for (var s = 0; s < SHOTS_PER_PLAYER; s++) {
        var pts = state.shotHistory[j][s];
        var cls = 'result-dot';
        if (pts === 3) cls += ' pts3';
        else if (pts === 2) cls += ' pts2';
        else cls += ' pts0';
        dotsHtml += '<div class="' + cls + '" title="' + pts + '점"></div>';
      }
      html +=
        '<div class="result-score-row' + (isWinner ? ' winner' : '') + '">' +
        '<span class="result-player-label" style="color:' + PLAYER_COLORS[j] + '">' + PLAYER_LABELS[j] + '</span>' +
        '<div class="result-player-dots">' + dotsHtml + '</div>' +
        '<span class="result-player-pts">' + state.scores[j] + '</span>' +
        (isWinner ? '<span class="result-crown">👑</span>' : '') +
        '</div>';
    }
    resultScores.innerHTML = html;

    showScreen('result');
  }

  /* =====================================================
     버튼 이벤트
     ===================================================== */
  onTap(closeGameBtn, function () {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    state.ballInFlight = false;
    playerHandoff.classList.remove('active');
    goHome();
  });

  onTap(retryBtn, function () {
    initGame(state.numPlayers);
  });

  onTap(homeBtn, function () {
    goHome();
  });

})();
