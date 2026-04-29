# Killing Time Mini-Games Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초등학교 교실용 웹 미니게임 컬렉션 — 런처 + 공통 유틸리티 엔진 + 두더지 잡기 게임 구현

**Architecture:** 정적 HTML/CSS/JS 사이트. `index.html` 런처가 `games/registry.json`에서 게임 목록을 로드하여 카드 그리드 표시. 각 게임은 `games/<이름>/` 독립 폴더에 자체 `index.html` 보유. `shared/engine.js`가 타이머, 점수, 사운드 등 유틸리티 함수를 제공하며 게임이 필요한 것만 골라 사용.

**Tech Stack:** HTML5, CSS3 (Custom Properties), Vanilla JavaScript (ES6+), Web Audio API

---

## File Structure

```
killing-time-games/
├── index.html                  ← 런처 메인 화면
├── shared/
│   ├── style.css               ← 디자인 토큰 + 공통 레이아웃
│   └── engine.js               ← 유틸리티 라이브러리
├── games/
│   ├── registry.json           ← 게임 폴더명 배열
│   └── whack-a-mole/
│       ├── index.html          ← 게임 페이지 (설명→플레이→결과)
│       ├── style.css           ← 게임 전용 스타일
│       ├── game.js             ← 게임 로직
│       └── game.json           ← 메타데이터
└── assets/
    └── icons/                  ← (향후 사용)
```

---

### Task 1: 공통 CSS — 디자인 토큰 및 기본 레이아웃

**Files:**
- Create: `shared/style.css`

- [ ] **Step 1: shared/style.css 작성**

```css
/* shared/style.css */
:root {
  /* Colors */
  --bg: #FFFFFF;
  --card-bg: #FFFFFF;
  --primary: #29B6F6;
  --secondary: #66BB6A;
  --danger: #EF5350;
  --accent-orange: #FFA726;
  --accent-yellow: #FFEE58;
  --text: #333333;
  --text-sub: #888888;

  /* Typography */
  --font-family: 'Pretendard Variable', -apple-system, 'Noto Sans KR', sans-serif;
  --font-size-title: 1.5rem;
  --font-size-body: 1rem;
  --font-size-card: 0.9rem;
  --font-size-small: 0.875rem;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Sizing */
  --card-min-size: 140px;
  --btn-min-touch: 48px;
  --card-radius: 16px;
  --btn-radius: 24px;

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(0,0,0,0.12);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.2);
}

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  color: var(--text);
  background: var(--bg);
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  overflow-x: hidden;
}

/* 터치 최적화 — 더블탭 줌 방지 */
html {
  touch-action: manipulation;
}

/* 공통 버튼 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--btn-min-touch);
  min-height: var(--btn-min-touch);
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: var(--btn-radius);
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn:active {
  transform: scale(0.95);
}

.btn-primary {
  background: var(--secondary);
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(102,187,106,0.3);
}

.btn-primary:active {
  box-shadow: 0 1px 4px rgba(102,187,106,0.3);
}

/* 사운드 토글 버튼 */
.sound-toggle {
  width: var(--btn-min-touch);
  height: var(--btn-min-touch);
  border-radius: 50%;
  background: #F0F0F0;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 원형 아이콘 버튼 (닫기, 뒤로가기) */
.icon-btn {
  width: var(--btn-min-touch);
  height: var(--btn-min-touch);
  border-radius: 50%;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  color: var(--text);
  box-shadow: var(--shadow-card);
}

/* 프로그레스 바 */
.progress-bar {
  width: 100%;
  height: 12px;
  background: #E0E0E0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--secondary);
  border-radius: 6px;
  transition: width 1s linear;
}
```

- [ ] **Step 2: 브라우저에서 빈 HTML로 스타일 로드 확인**

`shared/style.css`를 링크하는 임시 HTML을 열어 CSS 변수와 기본 스타일이 적용되는지 눈으로 확인.

- [ ] **Step 3: 커밋**

```bash
git add shared/style.css
git commit -m "feat: add shared CSS with design tokens and common components"
```

---

### Task 2: 공통 유틸리티 엔진 — shared/engine.js

**Files:**
- Create: `shared/engine.js`

- [ ] **Step 1: createTimer 함수 작성**

```javascript
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
```

- [ ] **Step 2: createScoreboard 함수 작성**

`shared/engine.js`에 이어서 추가:

```javascript
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
```

- [ ] **Step 3: createSoundManager 함수 작성**

`shared/engine.js`에 이어서 추가:

```javascript
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
```

- [ ] **Step 4: goHome, onTap 함수 작성**

`shared/engine.js`에 이어서 추가:

```javascript
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
```

- [ ] **Step 5: 브라우저 콘솔에서 수동 테스트**

브라우저 개발자도구 콘솔에서 `engine.js`를 `<script>`로 로드한 뒤:
- `createTimer(5, console.log, () => console.log('END'))` → `start()` 호출 → 5, 4, 3, 2, 1, END 출력 확인
- `createScoreboard(document.createElement('span'))` → `add(10)` → `get()` === 10 확인

- [ ] **Step 6: 커밋**

```bash
git add shared/engine.js
git commit -m "feat: add shared engine utilities (timer, scoreboard, sound, tap)"
```

---

### Task 3: 게임 레지스트리 및 두더지 잡기 메타데이터

**Files:**
- Create: `games/registry.json`
- Create: `games/whack-a-mole/game.json`

- [ ] **Step 1: registry.json 작성**

```json
["whack-a-mole"]
```

- [ ] **Step 2: game.json 작성**

```json
{
  "name": "두더지 잡기",
  "description": "나타나는 두더지를 빠르게 터치하세요!",
  "icon": "🔨",
  "color": "#81C784",
  "grades": [1, 2, 3, 4, 5, 6],
  "playTime": "1~2분"
}
```

참고: `color` 필드를 추가하여 런처 카드의 썸네일 배경색으로 사용. 스펙의 "각 카드 상단에 게임 고유 배경색" 요구사항 구현.

- [ ] **Step 3: 커밋**

```bash
git add games/registry.json games/whack-a-mole/game.json
git commit -m "feat: add game registry and whack-a-mole metadata"
```

---

### Task 4: 런처 HTML 및 게임 카드 로딩

**Files:**
- Create: `index.html`

- [ ] **Step 1: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>킬링타임 미니게임</title>
  <link rel="stylesheet" href="shared/style.css">
  <style>
    .launcher-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
    }

    .launcher-title {
      font-size: var(--font-size-title);
      font-weight: 700;
    }

    /* 학년 필터 */
    .filter-bar {
      display: flex;
      gap: var(--space-sm);
      padding: 0 var(--space-lg);
      margin-bottom: var(--space-md);
    }

    .filter-btn {
      padding: var(--space-sm) var(--space-md);
      border: 2px solid #E0E0E0;
      border-radius: var(--btn-radius);
      background: var(--bg);
      font-family: var(--font-family);
      font-size: var(--font-size-small);
      font-weight: 600;
      color: var(--text-sub);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-btn.active {
      border-color: var(--primary);
      background: var(--primary);
      color: #FFFFFF;
    }

    /* 게임 카드 그리드 */
    .game-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--card-min-size), 1fr));
      gap: var(--space-md);
      padding: 0 var(--space-lg) var(--space-lg);
    }

    .game-card {
      background: var(--card-bg);
      border-radius: var(--card-radius);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      text-decoration: none;
      color: inherit;
      display: block;
    }

    .game-card:active {
      transform: scale(1.03);
      box-shadow: var(--shadow-card-hover);
    }

    .game-card-thumb {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3.5rem;
    }

    .game-card-info {
      padding: var(--space-sm) var(--space-md);
      text-align: center;
    }

    .game-card-name {
      font-size: var(--font-size-card);
      font-weight: 700;
    }

    .game-card-time {
      font-size: var(--font-size-small);
      color: var(--text-sub);
      margin-top: 2px;
    }

    /* 카드 숨김 (필터) */
    .game-card.hidden {
      display: none;
    }
  </style>
</head>
<body>

  <header class="launcher-header">
    <h1 class="launcher-title">킬링타임 미니게임</h1>
    <button class="sound-toggle" id="soundToggle" aria-label="사운드 토글">🔇</button>
  </header>

  <nav class="filter-bar">
    <button class="filter-btn active" data-filter="all">전체</button>
    <button class="filter-btn" data-filter="low">저학년</button>
    <button class="filter-btn" data-filter="high">고학년</button>
  </nav>

  <main class="game-grid" id="gameGrid">
    <!-- JS가 카드를 동적으로 삽입 -->
  </main>

  <script src="shared/engine.js"></script>
  <script>
    const FALLBACK_GAMES = [
      {
        folder: 'whack-a-mole',
        name: '두더지 잡기',
        description: '나타나는 두더지를 빠르게 터치하세요!',
        icon: '🔨',
        color: '#81C784',
        grades: [1,2,3,4,5,6],
        playTime: '1~2분'
      }
    ];

    const grid = document.getElementById('gameGrid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const soundToggle = document.getElementById('soundToggle');
    let allGames = [];

    // --- 사운드 토글 (런처에서는 상태만 관리) ---
    function updateSoundIcon() {
      const muted = sessionStorage.getItem('sound-muted') !== 'false';
      soundToggle.textContent = muted ? '🔇' : '🔊';
    }
    soundToggle.addEventListener('click', function() {
      const wasMuted = sessionStorage.getItem('sound-muted') !== 'false';
      sessionStorage.setItem('sound-muted', !wasMuted);
      updateSoundIcon();
    });
    updateSoundIcon();

    // --- 카드 렌더링 ---
    function renderCards(games) {
      grid.innerHTML = '';
      allGames = games;
      games.forEach(function(game) {
        var a = document.createElement('a');
        a.className = 'game-card';
        a.href = 'games/' + game.folder + '/index.html';
        a.dataset.grades = JSON.stringify(game.grades);
        a.innerHTML =
          '<div class="game-card-thumb" style="background:' + game.color + '">' +
            '<span>' + game.icon + '</span>' +
          '</div>' +
          '<div class="game-card-info">' +
            '<div class="game-card-name">' + game.name + '</div>' +
            '<div class="game-card-time">' + game.playTime + '</div>' +
          '</div>';
        grid.appendChild(a);
      });
    }

    // --- 학년 필터 ---
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyFilter(btn.dataset.filter);
      });
    });

    function applyFilter(filter) {
      var cards = grid.querySelectorAll('.game-card');
      cards.forEach(function(card) {
        var grades = JSON.parse(card.dataset.grades);
        var show = true;
        if (filter === 'low') {
          show = grades.some(function(g) { return g >= 1 && g <= 3; });
        } else if (filter === 'high') {
          show = grades.some(function(g) { return g >= 4 && g <= 6; });
        }
        card.classList.toggle('hidden', !show);
      });
    }

    // --- 게임 목록 로딩 (fetch → fallback) ---
    async function loadGames() {
      try {
        var res = await fetch('games/registry.json');
        var folders = await res.json();
        var games = [];
        for (var i = 0; i < folders.length; i++) {
          var metaRes = await fetch('games/' + folders[i] + '/game.json');
          var meta = await metaRes.json();
          meta.folder = folders[i];
          games.push(meta);
        }
        renderCards(games);
      } catch (e) {
        // file:// 프로토콜 등에서 fetch 실패 시 fallback
        renderCards(FALLBACK_GAMES);
      }
    }

    loadGames();
  </script>

</body>
</html>
```

- [ ] **Step 2: 브라우저에서 런처 확인**

`index.html`을 브라우저에서 열어 확인:
- 제목 "킬링타임 미니게임" 표시
- 사운드 토글 버튼 동작 (아이콘 변경)
- 필터 버튼 3개 표시 (전체 활성)
- 게임 카드 1개 표시 (두더지 잡기, 초록 배경, 🔨 아이콘)
- 필터 전환 시 카드 표시/숨김 동작
- 카드 터치/클릭 시 `games/whack-a-mole/index.html`로 이동 시도

- [ ] **Step 3: 커밋**

```bash
git add index.html
git commit -m "feat: add launcher with game card grid and grade filter"
```

---

### Task 5: 두더지 잡기 — HTML 구조 (설명→플레이→결과 화면)

**Files:**
- Create: `games/whack-a-mole/index.html`

- [ ] **Step 1: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>두더지 잡기</title>
  <link rel="stylesheet" href="../../shared/style.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- 화면 1: 게임 설명 -->
  <section class="screen screen-intro active" id="introScreen">
    <header class="game-header">
      <button class="icon-btn" id="backBtn" aria-label="뒤로가기">←</button>
      <h1 class="game-title">두더지 잡기</h1>
      <button class="sound-toggle" id="soundToggleIntro" aria-label="사운드 토글">🔇</button>
    </header>
    <div class="intro-body">
      <div class="intro-illustration" aria-hidden="true">
        <!-- CSS로 구현한 두더지 일러스트 -->
        <div class="mole-preview">
          <div class="mole-char">
            <div class="mole-face">
              <div class="mole-eye left"></div>
              <div class="mole-eye right"></div>
              <div class="mole-nose"></div>
            </div>
          </div>
        </div>
      </div>
      <p class="intro-text">나타나는 두더지를 빠르게 터치하세요!</p>
      <p class="intro-subtext">제한시간 30초 안에 최대한 많이 잡아보세요.</p>
    </div>
    <button class="btn btn-primary btn-play" id="playBtn">PLAY</button>
  </section>

  <!-- 화면 2: 카운트다운 -->
  <section class="screen screen-countdown" id="countdownScreen">
    <div class="countdown-number" id="countdownNumber">3</div>
  </section>

  <!-- 화면 3: 게임 플레이 -->
  <section class="screen screen-game" id="gameScreen">
    <header class="game-hud">
      <div class="hud-score">
        <span class="hud-label">점수</span>
        <span class="hud-value" id="scoreDisplay">0</span>
      </div>
      <div class="hud-timer">
        <div class="progress-bar">
          <div class="progress-bar-fill" id="timerBar" style="width:100%"></div>
        </div>
      </div>
      <button class="sound-toggle" id="soundToggleGame" aria-label="사운드 토글">🔇</button>
    </header>

    <div class="mole-grid" id="moleGrid">
      <div class="hole" data-index="0"><div class="mole"></div></div>
      <div class="hole" data-index="1"><div class="mole"></div></div>
      <div class="hole" data-index="2"><div class="mole"></div></div>
      <div class="hole" data-index="3"><div class="mole"></div></div>
      <div class="hole" data-index="4"><div class="mole"></div></div>
      <div class="hole" data-index="5"><div class="mole"></div></div>
      <div class="hole" data-index="6"><div class="mole"></div></div>
      <div class="hole" data-index="7"><div class="mole"></div></div>
      <div class="hole" data-index="8"><div class="mole"></div></div>
    </div>

    <button class="icon-btn close-btn" id="closeBtn" aria-label="홈으로">✕</button>
  </section>

  <!-- 화면 4: 결과 -->
  <section class="screen screen-result" id="resultScreen">
    <div class="result-body">
      <div class="result-emoji">🎉</div>
      <h2 class="result-title">게임 끝!</h2>
      <div class="result-score">
        <span class="result-score-label">점수</span>
        <span class="result-score-value" id="finalScore">0</span>
      </div>
    </div>
    <div class="result-actions">
      <button class="btn btn-primary" id="retryBtn">다시하기</button>
      <button class="btn btn-secondary" id="homeBtn">홈으로</button>
    </div>
  </section>

  <script src="../../shared/engine.js"></script>
  <script src="game.js"></script>

</body>
</html>
```

- [ ] **Step 2: 커밋**

```bash
git add games/whack-a-mole/index.html
git commit -m "feat: add whack-a-mole HTML structure (intro, countdown, game, result)"
```

---

### Task 6: 두더지 잡기 — 게임 전용 CSS

**Files:**
- Create: `games/whack-a-mole/style.css`

- [ ] **Step 1: style.css 작성**

```css
/* games/whack-a-mole/style.css */

body {
  background: #81C784;
  overflow: hidden;
}

/* === 화면 전환 === */
.screen {
  display: none;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 100vh;
}

.screen.active {
  display: flex;
}

/* === 설명 화면 === */
.screen-intro {
  justify-content: space-between;
  padding: var(--space-lg);
  background: var(--bg);
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.game-title {
  font-size: var(--font-size-title);
  font-weight: 700;
}

.intro-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  justify-content: center;
}

.intro-text {
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
}

.intro-subtext {
  font-size: var(--font-size-small);
  color: var(--text-sub);
  text-align: center;
}

.btn-play {
  width: 80%;
  max-width: 300px;
  padding: var(--space-md) var(--space-xl);
  font-size: 1.3rem;
  margin-bottom: var(--space-xl);
}

/* 두더지 프리뷰 일러스트 */
.mole-preview {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mole-char {
  width: 80px;
  height: 80px;
  position: relative;
}

.mole-face {
  width: 80px;
  height: 80px;
  background: #8D6E63;
  border-radius: 50% 50% 45% 45%;
  position: relative;
}

.mole-eye {
  width: 12px;
  height: 14px;
  background: #333;
  border-radius: 50%;
  position: absolute;
  top: 28px;
}

.mole-eye.left { left: 20px; }
.mole-eye.right { right: 20px; }

.mole-nose {
  width: 16px;
  height: 12px;
  background: #D7837F;
  border-radius: 50%;
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
}

/* === 카운트다운 === */
.screen-countdown {
  justify-content: center;
  align-items: center;
  background: #81C784;
}

.countdown-number {
  font-size: 8rem;
  font-weight: 900;
  color: #FFFFFF;
  text-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: countPop 0.5s ease;
}

@keyframes countPop {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

/* === 게임 플레이 화면 === */
.screen-game {
  justify-content: space-between;
  padding: var(--space-md);
  background: #81C784;
  position: relative;
}

.game-hud {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
}

.hud-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.hud-label {
  font-size: var(--font-size-small);
  color: rgba(255,255,255,0.8);
  font-weight: 600;
}

.hud-value {
  font-size: 1.8rem;
  font-weight: 900;
  color: #FFFFFF;
}

.hud-timer {
  flex: 1;
}

.screen-game .progress-bar {
  height: 16px;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
}

.screen-game .progress-bar-fill {
  background: var(--accent-yellow);
  border-radius: 8px;
}

/* === 두더지 그리드 === */
.mole-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  width: 100%;
  max-width: 360px;
  flex: 1;
  align-content: center;
}

.hole {
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

/* 구멍 (타원 하단) */
.hole::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 30%;
  background: #5D4037;
  border-radius: 50%;
  z-index: 2;
}

/* 두더지 캐릭터 */
.mole {
  width: 70%;
  height: 70%;
  position: absolute;
  bottom: -70%;
  left: 15%;
  z-index: 1;
  transition: bottom 0.15s ease-out;
}

.mole::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: #8D6E63;
  border-radius: 50% 50% 40% 40%;
  position: relative;
}

/* 두더지 눈 - left */
.mole::after {
  content: '';
  position: absolute;
  top: 30%;
  left: 25%;
  width: 12px;
  height: 14px;
  background: #333;
  border-radius: 50%;
  box-shadow: calc(100% - 50px) 0 0 0 #333; /* right eye via shadow */
}

/* 두더지 등장 */
.hole.active .mole {
  bottom: 15%;
}

/* 터치 성공 이펙트 */
.hole.hit .mole {
  transform: scale(0.8);
  opacity: 0.5;
}

/* 닫기 버튼 */
.close-btn {
  position: absolute;
  bottom: var(--space-lg);
  right: var(--space-lg);
}

/* === 결과 화면 === */
.screen-result {
  justify-content: center;
  align-items: center;
  gap: var(--space-xl);
  padding: var(--space-xl);
  background: var(--bg);
}

.result-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.result-emoji {
  font-size: 4rem;
}

.result-title {
  font-size: 2rem;
  font-weight: 900;
}

.result-score {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-score-label {
  font-size: var(--font-size-small);
  color: var(--text-sub);
}

.result-score-value {
  font-size: 3rem;
  font-weight: 900;
  color: var(--primary);
}

.result-actions {
  display: flex;
  gap: var(--space-md);
}

.btn-secondary {
  background: #E0E0E0;
  color: var(--text);
}

/* === 히트 스타 이펙트 === */
@keyframes starBurst {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.hit-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  font-size: 2rem;
  z-index: 10;
  pointer-events: none;
  animation: starBurst 0.4s ease-out forwards;
}
```

- [ ] **Step 2: 브라우저에서 게임 HTML 열어 레이아웃 확인**

`games/whack-a-mole/index.html`을 열어 설명 화면 레이아웃 확인:
- 헤더 (← 두더지 잡기 🔇) 표시
- 두더지 일러스트 + 설명 텍스트 표시
- PLAY 버튼 표시
- 아직 화면 전환은 동작하지 않음 (game.js 미작성)

- [ ] **Step 3: 커밋**

```bash
git add games/whack-a-mole/style.css
git commit -m "feat: add whack-a-mole CSS with mole characters and screen layouts"
```

---

### Task 7: 두더지 잡기 — 게임 로직 (game.js)

**Files:**
- Create: `games/whack-a-mole/game.js`

- [ ] **Step 1: 화면 전환 + 사운드 토글 로직 작성**

```javascript
/* games/whack-a-mole/game.js */

(function() {
  'use strict';

  // --- 화면 전환 ---
  var screens = {
    intro: document.getElementById('introScreen'),
    countdown: document.getElementById('countdownScreen'),
    game: document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function(key) {
      screens[key].classList.toggle('active', key === name);
    });
  }

  // --- 사운드 ---
  var sounds = createSoundManager({
    pop: function(ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    },
    hit: function(ctx) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    },
    fanfare: function(ctx) {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function(freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    }
  });

  // 사운드 토글 버튼들
  var soundBtns = [
    document.getElementById('soundToggleIntro'),
    document.getElementById('soundToggleGame')
  ];

  function updateSoundBtns() {
    var icon = sounds.isMuted() ? '🔇' : '🔊';
    soundBtns.forEach(function(btn) { btn.textContent = icon; });
  }

  soundBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      sounds.toggleMute();
      updateSoundBtns();
    });
  });

  updateSoundBtns();
```

- [ ] **Step 2: 카운트다운 로직 작성**

`game.js`에 이어서 추가:

```javascript
  // --- 카운트다운 ---
  var countdownEl = document.getElementById('countdownNumber');

  function startCountdown(onDone) {
    var count = 3;
    countdownEl.textContent = count;
    showScreen('countdown');

    var interval = setInterval(function() {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        onDone();
      } else {
        countdownEl.textContent = count;
        // 팝 애니메이션 리셋
        countdownEl.style.animation = 'none';
        countdownEl.offsetHeight; // reflow
        countdownEl.style.animation = '';
      }
    }, 1000);
  }
```

- [ ] **Step 3: 게임 핵심 로직 작성 (두더지 등장/터치/점수)**

`game.js`에 이어서 추가:

```javascript
  // --- 게임 상태 ---
  var GAME_DURATION = 30;
  var holes = document.querySelectorAll('.hole');
  var scoreDisplay = document.getElementById('scoreDisplay');
  var timerBar = document.getElementById('timerBar');
  var finalScoreEl = document.getElementById('finalScore');

  var scoreboard = createScoreboard(scoreDisplay);
  var timer = null;
  var moleTimers = [];
  var gameRunning = false;

  // 난이도: 시간 경과에 따라 노출 시간 감소
  function getMoleShowTime(remaining) {
    // 30초 → 1500ms, 0초 → 800ms (선형 감소)
    var ratio = remaining / GAME_DURATION;
    return 800 + ratio * 700;
  }

  function getRandomHole() {
    var available = [];
    holes.forEach(function(hole, i) {
      if (!hole.classList.contains('active')) {
        available.push(i);
      }
    });
    if (available.length === 0) return -1;
    return available[Math.floor(Math.random() * available.length)];
  }

  function showMole() {
    if (!gameRunning) return;

    // 동시 최대 2마리
    var activeCount = document.querySelectorAll('.hole.active').length;
    if (activeCount >= 2) return;

    var idx = getRandomHole();
    if (idx === -1) return;

    var hole = holes[idx];
    hole.classList.add('active');
    sounds.play('pop');

    var remaining = timer ? GAME_DURATION : 0; // approximate
    var showTime = getMoleShowTime(remaining);

    var hideTimer = setTimeout(function() {
      hole.classList.remove('active');
    }, showTime);
    moleTimers.push(hideTimer);
  }

  function spawnLoop() {
    if (!gameRunning) return;
    showMole();
    // 다음 두더지: 600~1200ms 랜덤 간격
    var delay = 600 + Math.random() * 600;
    var t = setTimeout(spawnLoop, delay);
    moleTimers.push(t);
  }

  // 두더지 터치 처리
  holes.forEach(function(hole) {
    onTap(hole, function(e) {
      if (!gameRunning) return;
      if (!hole.classList.contains('active')) return;

      hole.classList.remove('active');
      hole.classList.add('hit');
      scoreboard.add(10);
      sounds.play('hit');

      // 히트 이펙트
      var star = document.createElement('div');
      star.className = 'hit-effect';
      star.textContent = '⭐';
      hole.appendChild(star);
      setTimeout(function() {
        hole.classList.remove('hit');
        if (star.parentNode) star.parentNode.removeChild(star);
      }, 400);
    });
  });
```

- [ ] **Step 4: 게임 시작/종료 + 화면 전환 연결**

`game.js`에 이어서 추가:

```javascript
  // --- 게임 시작 ---
  function startGame() {
    gameRunning = true;
    scoreboard.reset();
    timerBar.style.width = '100%';

    showScreen('game');

    var remaining = GAME_DURATION;

    timer = createTimer(GAME_DURATION, function(rem) {
      remaining = rem;
      timerBar.style.width = (rem / GAME_DURATION * 100) + '%';
    }, function() {
      endGame();
    });

    timer.start();
    spawnLoop();
  }

  function endGame() {
    gameRunning = false;
    // 모든 두더지 타이머 정리
    moleTimers.forEach(clearTimeout);
    moleTimers = [];
    // 모든 활성 두더지 숨기기
    holes.forEach(function(hole) {
      hole.classList.remove('active', 'hit');
    });

    sounds.play('fanfare');

    finalScoreEl.textContent = scoreboard.get();
    showScreen('result');
  }

  // --- 버튼 이벤트 ---
  document.getElementById('playBtn').addEventListener('click', function() {
    startCountdown(startGame);
  });

  document.getElementById('retryBtn').addEventListener('click', function() {
    startCountdown(startGame);
  });

  document.getElementById('homeBtn').addEventListener('click', function() {
    goHome();
  });

  document.getElementById('backBtn').addEventListener('click', function() {
    goHome();
  });

  document.getElementById('closeBtn').addEventListener('click', function() {
    if (gameRunning) {
      timer.stop();
      gameRunning = false;
      moleTimers.forEach(clearTimeout);
      moleTimers = [];
      holes.forEach(function(hole) {
        hole.classList.remove('active', 'hit');
      });
    }
    goHome();
  });

})();
```

- [ ] **Step 5: 브라우저에서 전체 게임 플레이 테스트**

`games/whack-a-mole/index.html`을 브라우저에서 열어 전체 흐름 확인:
1. 설명 화면 → PLAY 버튼 클릭
2. 3-2-1 카운트다운 표시
3. 게임 시작 — 두더지 등장, 터치 시 +10점, 타이머 바 감소
4. 30초 후 결과 화면 — 점수 표시
5. "다시하기" → 재시작, "홈으로" → 런처 이동
6. 사운드 토글 버튼 동작 확인
7. ← 뒤로가기, ✕ 닫기 동작 확인

- [ ] **Step 6: 커밋**

```bash
git add games/whack-a-mole/game.js
git commit -m "feat: add whack-a-mole game logic with mole spawning, scoring, and sound"
```

---

### Task 8: 통합 테스트 및 최종 조정

**Files:**
- Possible edits: any of the above files

- [ ] **Step 1: 런처 → 게임 → 런처 전체 흐름 테스트**

`index.html`을 HTTP 서버로 열어서 (fetch 동작 확인):
1. 런처에서 카드 클릭 → 두더지 잡기 설명 화면
2. PLAY → 카운트다운 → 게임 → 결과 → 홈으로 → 런처
3. 학년 필터 전환
4. 사운드 토글이 런처 ↔ 게임 간 상태 유지 확인

- [ ] **Step 2: file:// 프로토콜로 오프라인 테스트**

`index.html`을 파일 탐색기에서 직접 열기:
- fetch 실패 시 fallback 게임 목록이 표시되는지 확인
- 게임 카드 클릭 → 게임 정상 동작 확인

- [ ] **Step 3: 모바일/태블릿 뷰 테스트**

브라우저 개발자도구에서 모바일 뷰 (375px 등)로 전환:
- 카드 그리드 2열 표시
- 두더지 그리드 터치 영역 적절한지
- 버튼 터치 영역 48px 이상

- [ ] **Step 4: 발견된 문제 수정**

테스트에서 발견된 레이아웃, 동작 문제를 수정.

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "fix: address integration test feedback"
```

이 커밋은 수정 사항이 있을 때만 생성. 문제가 없으면 스킵.

---

### Task 9: .gitignore 및 정리

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: .gitignore 작성**

```
.superpowers/
.DS_Store
Thumbs.db
```

- [ ] **Step 2: 커밋**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```
