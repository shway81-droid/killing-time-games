/* shared/engine.js */

/**
 * 카운트다운 타이머 생성
 * @param {number} seconds - 총 시간 (초)
 * @param {function} onTick - 매초 호출 (remaining 전달)
 * @param {function} onEnd - 종료 시 호출
 * @returns {{ start(), pause(), stop() }}
 */
function createTimer(seconds, onTick, onEnd) {
  let remaining = seconds;
  let intervalId = null;

  function tick() {
    remaining--;
    onTick(remaining);
    if (remaining <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      onEnd();
    }
  }

  return {
    start() {
      if (intervalId) return;
      onTick(remaining);
      intervalId = setInterval(tick, 1000);
    },
    pause() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      remaining = seconds;
    }
  };
}

/**
 * 점수 표시 관리
 * @param {HTMLElement} element - 점수를 표시할 DOM 요소
 * @returns {{ add(n), get(), reset() }}
 */
function createScoreboard(element) {
  let score = 0;

  function render() {
    element.textContent = score;
  }

  render();

  return {
    add(n) {
      score += n;
      render();
    },
    get() {
      return score;
    },
    reset() {
      score = 0;
      render();
    }
  };
}

/**
 * Web Audio API 기반 효과음 관리
 * soundMap: { name: function(audioCtx) => AudioNode } 형태
 * 각 함수는 audioCtx를 받아 oscillator 등을 설정하고 재생
 * @param {Object} soundMap
 * @returns {{ play(name), mute(), unmute(), isMuted(), toggleMute() }}
 */
function createSoundManager(soundMap) {
  let audioCtx = null;
  // 기본 음소거, sessionStorage에서 복원
  let muted = sessionStorage.getItem('sound-muted') !== 'false';

  function getContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function saveMuteState() {
    sessionStorage.setItem('sound-muted', muted);
  }

  return {
    play(name) {
      if (muted) return;
      const fn = soundMap[name];
      if (!fn) return;
      const ctx = getContext();
      fn(ctx);
    },
    mute() {
      muted = true;
      saveMuteState();
    },
    unmute() {
      muted = false;
      saveMuteState();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      saveMuteState();
      return muted;
    }
  };
}

/**
 * 런처(홈)로 이동
 */
function goHome() {
  window.location.href = '../../index.html';
}

/**
 * 클릭 + 터치 통합 핸들러
 * 300ms 딜레이 없이 즉시 반응
 * @param {HTMLElement} element
 * @param {function} callback
 */
function onTap(element, callback) {
  let touched = false;

  element.addEventListener('touchstart', function(e) {
    touched = true;
    e.preventDefault();
    callback(e);
  }, { passive: false });

  element.addEventListener('click', function(e) {
    if (!touched) {
      callback(e);
    }
    touched = false;
  });
}
