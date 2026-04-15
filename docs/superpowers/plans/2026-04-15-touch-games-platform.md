# Touch Games Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학교 교실 대형 터치스크린에서 초등학생이 플레이할 수 있는 웹 게임 플랫폼 (런처 + 숨은 그림 찾기 게임) 구축

**Architecture:** Vanilla HTML/CSS/JS, 빌드 도구 없음. 런처(index.html)에서 게임 선택 후 각 게임의 독립 index.html로 이동. 공통 터치 유틸리티를 js/common.js에서 제공. 각 게임은 games/ 하위 독립 폴더.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+), SVG (placeholder 그래픽)

---

## File Structure

```
touch-games/
├── index.html              ← 런처 메인 화면
├── css/
│   └── common.css          ← 공통 스타일 (터치 최적화, 레이아웃)
├── js/
│   └── common.js           ← 공통 유틸 (터치 이벤트 헬퍼, 브라우저 기본동작 차단)
├── games/
│   └── i-spy/
│       ├── index.html      ← 숨은 그림 찾기 게임 페이지
│       ├── style.css       ← 게임 전용 스타일
│       ├── game.js         ← 게임 로직 (테마 데이터, 판정, 상태 관리)
│       └── assets/         ← placeholder SVG 아이콘
└── assets/
    └── icons/              ← 런처용 게임 아이콘
```

---

### Task 1: 프로젝트 초기화 및 공통 CSS

**Files:**
- Create: `css/common.css`

- [ ] **Step 1: common.css 작성**

```css
/* css/common.css */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
  background: #f0f4f8;
  -webkit-user-select: none;
  user-select: none;
  touch-action: none;
}

/* 터치 영역 최소 크기 보장 */
button, .touchable {
  min-width: 48px;
  min-height: 48px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

button {
  border: none;
  background: #4a90d9;
  color: white;
  font-size: 1.2rem;
  border-radius: 12px;
  padding: 12px 24px;
}

button:active {
  transform: scale(0.95);
  background: #357abd;
}

/* 뒤로가기 버튼 */
.back-button {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 1.5rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 가로 모드 고정 안내 (세로일 때 표시) */
.rotate-notice {
  display: none;
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  color: white;
  font-size: 2rem;
  z-index: 9999;
  align-items: center;
  justify-content: center;
  text-align: center;
}

@media (orientation: portrait) {
  .rotate-notice {
    display: flex;
  }
}
```

- [ ] **Step 2: 브라우저에서 확인**

빈 HTML 파일에서 `common.css`를 로드했을 때 오류 없는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add css/common.css
git commit -m "feat: add common CSS with touch optimization and landscape enforcement"
```

---

### Task 2: 공통 JavaScript 유틸리티

**Files:**
- Create: `js/common.js`

- [ ] **Step 1: common.js 작성**

```javascript
// js/common.js

/**
 * 브라우저 기본 터치 동작 비활성화
 * - 더블탭 줌, 핀치 줌(브라우저 레벨), 우클릭 메뉴, 드래그 선택
 */
function disableBrowserDefaults() {
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });
}

/**
 * 간단한 탭 감지 — 드래그와 구분
 * touchstart 위치와 touchend 위치가 threshold 이내이고
 * 시간이 maxDuration 이내이면 탭으로 판정
 *
 * @param {HTMLElement} element - 대상 엘리먼트
 * @param {function} callback - 탭 시 호출 (event, {x, y}) 전달
 * @param {object} options - { threshold: 10, maxDuration: 300 }
 */
function onTap(element, callback, options) {
  const threshold = (options && options.threshold) || 10;
  const maxDuration = (options && options.maxDuration) || 300;
  let startX, startY, startTime;

  element.addEventListener('touchstart', function (e) {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
  }, { passive: true });

  element.addEventListener('touchend', function (e) {
    if (startX === undefined) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - startTime;

    if (dist < threshold && duration < maxDuration) {
      callback(e, { x: touch.clientX, y: touch.clientY });
    }
    startX = undefined;
  }, { passive: true });

  // 마우스 지원 (개발/테스트용)
  element.addEventListener('click', function (e) {
    callback(e, { x: e.clientX, y: e.clientY });
  });
}

/**
 * 드래그(패닝) 지원
 * 엘리먼트를 터치로 드래그하여 내부 콘텐츠를 이동
 *
 * @param {HTMLElement} container - 스크롤 컨테이너
 * @param {HTMLElement} content - 이동 대상 콘텐츠
 * @returns {{ getOffset: () => {x,y}, setOffset: (x,y) => void }}
 */
function enableDrag(container, content) {
  let isDragging = false;
  let startX, startY, offsetX = 0, offsetY = 0, lastX, lastY;

  function clampOffset() {
    const cRect = container.getBoundingClientRect();
    const contentW = content.scrollWidth;
    const contentH = content.scrollHeight;
    const minX = cRect.width - contentW;
    const minY = cRect.height - contentH;
    offsetX = Math.min(0, Math.max(minX, offsetX));
    offsetY = Math.min(0, Math.max(minY, offsetY));
  }

  function applyTransform() {
    content.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px)';
  }

  container.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    startX = e.touches[0].clientX - offsetX;
    startY = e.touches[0].clientY - offsetY;
  }, { passive: true });

  container.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    e.preventDefault();
    offsetX = e.touches[0].clientX - startX;
    offsetY = e.touches[0].clientY - startY;
    clampOffset();
    applyTransform();
  }, { passive: false });

  container.addEventListener('touchend', function () {
    isDragging = false;
  }, { passive: true });

  // 마우스 드래그 지원 (개발용)
  container.addEventListener('mousedown', function (e) {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    clampOffset();
    applyTransform();
  });

  window.addEventListener('mouseup', function () {
    isDragging = false;
  });

  return {
    getOffset: function () { return { x: offsetX, y: offsetY }; },
    setOffset: function (x, y) { offsetX = x; offsetY = y; clampOffset(); applyTransform(); }
  };
}

// 페이지 로드 시 브라우저 기본 동작 차단
document.addEventListener('DOMContentLoaded', disableBrowserDefaults);
```

- [ ] **Step 2: 브라우저 콘솔에서 오류 없는지 확인**

HTML에 `<script src="../../js/common.js"></script>` 로드 후 콘솔 에러 없어야 함.

- [ ] **Step 3: 커밋**

```bash
git add js/common.js
git commit -m "feat: add common JS utilities for tap detection, drag panning, and browser default suppression"
```

---

### Task 3: 런처 메인 화면

**Files:**
- Create: `index.html`
- Create: `assets/icons/i-spy-icon.svg`

- [ ] **Step 1: 런처용 게임 아이콘 SVG 작성**

```svg
<!-- assets/icons/i-spy-icon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="20" fill="#ff8c42"/>
  <circle cx="100" cy="85" r="45" fill="white" opacity="0.9"/>
  <circle cx="100" cy="85" r="25" fill="#ff8c42"/>
  <circle cx="100" cy="85" r="12" fill="#1a1a2e"/>
  <line x1="130" y1="115" x2="160" y2="155" stroke="white" stroke-width="10" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Touch Games</title>
  <link rel="stylesheet" href="css/common.css">
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    h1 {
      color: white;
      font-size: 3rem;
      margin-bottom: 40px;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.3);
    }

    .game-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 30px;
      justify-content: center;
      padding: 20px;
    }

    .game-card {
      background: white;
      border-radius: 24px;
      width: 240px;
      height: 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      transition: transform 0.2s;
      text-decoration: none;
      color: #1a1a2e;
      padding: 20px;
    }

    .game-card:active {
      transform: scale(0.95);
    }

    .game-card img {
      width: 120px;
      height: 120px;
      margin-bottom: 16px;
    }

    .game-card h2 {
      font-size: 1.4rem;
      margin-bottom: 8px;
    }

    .game-card p {
      font-size: 0.9rem;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="rotate-notice">화면을 가로로 돌려주세요</div>

  <h1>Touch Games</h1>
  <div class="game-grid">
    <a href="games/i-spy/index.html" class="game-card touchable">
      <img src="assets/icons/i-spy-icon.svg" alt="숨은 그림 찾기">
      <h2>숨은 그림 찾기</h2>
      <p>그림 속에 숨은 물건을 찾아보세요!</p>
    </a>
  </div>

  <script src="js/common.js"></script>
</body>
</html>
```

- [ ] **Step 3: 브라우저에서 확인**

- `index.html`을 열면 보라색 그라데이션 배경에 "Touch Games" 제목 표시
- 숨은 그림 찾기 카드가 보이고, 클릭하면 `games/i-spy/index.html`로 이동 (아직 404)
- 세로 모드에서는 "화면을 가로로 돌려주세요" 메시지 표시

- [ ] **Step 4: 커밋**

```bash
git add index.html assets/icons/i-spy-icon.svg
git commit -m "feat: add launcher main screen with game card grid"
```

---

### Task 4: I-Spy 게임 — HTML 및 스타일

**Files:**
- Create: `games/i-spy/index.html`
- Create: `games/i-spy/style.css`

- [ ] **Step 1: style.css 작성**

```css
/* games/i-spy/style.css */

/* 테마 선택 화면 */
.theme-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #ff8c42 0%, #ff6f61 100%);
}

.theme-screen h1 {
  color: white;
  font-size: 2.5rem;
  margin-bottom: 30px;
}

.theme-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.theme-card {
  background: white;
  border-radius: 20px;
  width: 200px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(0,0,0,0.15);
  transition: transform 0.2s;
  cursor: pointer;
  font-size: 1.3rem;
  font-weight: bold;
  color: #333;
}

.theme-card:active {
  transform: scale(0.95);
}

.theme-card .theme-emoji {
  font-size: 3rem;
  margin-bottom: 10px;
}

/* 게임 플레이 화면 */
.game-screen {
  display: none;
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #e8e8e8;
}

.game-screen.active {
  display: block;
}

/* 배경 캔버스 (드래그 가능 영역) */
.game-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.game-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 2000px;
  height: 1200px;
}

/* 찾아야 할 아이템 목록 바 */
.item-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 90px;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 0 20px;
  z-index: 100;
}

.item-bar .item {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  transition: all 0.3s;
}

.item-bar .item.found {
  background: rgba(76, 175, 80, 0.8);
  transform: scale(0.9);
}

.item-bar .item.found::after {
  content: '\2713';
  position: absolute;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
}

/* 정답 피드백 애니메이션 */
.found-feedback {
  position: absolute;
  width: 80px;
  height: 80px;
  border: 4px solid #4caf50;
  border-radius: 50%;
  pointer-events: none;
  animation: foundPulse 0.6s ease-out forwards;
  z-index: 50;
}

@keyframes foundPulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* 축하 화면 */
.congrats-screen {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 200;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.congrats-screen.active {
  display: flex;
}

.congrats-screen h1 {
  font-size: 3rem;
  margin-bottom: 20px;
}

.congrats-screen .congrats-emoji {
  font-size: 5rem;
  margin-bottom: 20px;
}

.congrats-buttons {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.congrats-buttons button {
  font-size: 1.3rem;
  padding: 16px 32px;
}
```

- [ ] **Step 2: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>숨은 그림 찾기 - Touch Games</title>
  <link rel="stylesheet" href="../../css/common.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="rotate-notice">화면을 가로로 돌려주세요</div>

  <a href="../../index.html" class="back-button touchable">&larr;</a>

  <!-- 테마 선택 화면 -->
  <div class="theme-screen" id="themeScreen">
    <h1>테마를 골라주세요!</h1>
    <div class="theme-grid" id="themeGrid">
      <!-- game.js에서 동적 생성 -->
    </div>
  </div>

  <!-- 게임 플레이 화면 -->
  <div class="game-screen" id="gameScreen">
    <div class="game-viewport" id="gameViewport">
      <div class="game-canvas" id="gameCanvas">
        <!-- game.js에서 배경 + 히든 아이템 배치 -->
      </div>
    </div>
    <div class="item-bar" id="itemBar">
      <!-- game.js에서 찾아야 할 아이템 표시 -->
    </div>
  </div>

  <!-- 축하 화면 -->
  <div class="congrats-screen" id="congratsScreen">
    <div class="congrats-emoji">🎉</div>
    <h1>모두 찾았어요!</h1>
    <div class="congrats-buttons">
      <button id="btnRetry" class="touchable">다시 하기</button>
      <button id="btnThemes" class="touchable">다른 테마</button>
      <button id="btnHome" class="touchable">홈으로</button>
    </div>
  </div>

  <script src="../../js/common.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: 브라우저에서 확인**

- `games/i-spy/index.html`을 열면 "테마를 골라주세요!" 화면 표시
- 뒤로가기 버튼(←) 이 좌상단에 표시
- 아직 테마 카드는 없음 (game.js 미작성)

- [ ] **Step 4: 커밋**

```bash
git add games/i-spy/index.html games/i-spy/style.css
git commit -m "feat: add i-spy game HTML structure and styles"
```

---

### Task 5: I-Spy 게임 — 테마 데이터 및 게임 로직

**Files:**
- Create: `games/i-spy/game.js`

- [ ] **Step 1: game.js 작성**

```javascript
// games/i-spy/game.js

(function () {
  'use strict';

  // =====================
  // 테마 데이터
  // =====================
  // 각 테마: 배경색, 숨길 아이템(아이콘 + 위치), 난이도별 개수
  var THEMES = [
    {
      id: 'classroom',
      name: '교실',
      emoji: '🏫',
      bgColor: '#ffeaa7',
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 2000, h: 1200, fill: '#ffeaa7' },
        { type: 'rect', x: 100, y: 100, w: 600, h: 400, fill: '#dfe6e9', label: '칠판' },
        { type: 'rect', x: 150, y: 600, w: 300, h: 250, fill: '#b2bec3', label: '책상' },
        { type: 'rect', x: 550, y: 600, w: 300, h: 250, fill: '#b2bec3', label: '책상' },
        { type: 'rect', x: 950, y: 600, w: 300, h: 250, fill: '#b2bec3', label: '책상' },
        { type: 'rect', x: 1350, y: 100, w: 200, h: 500, fill: '#636e72', label: '사물함' },
        { type: 'circle', x: 1700, y: 200, r: 80, fill: '#fdcb6e', label: '시계' },
        { type: 'rect', x: 800, y: 50, w: 400, h: 300, fill: '#74b9ff', label: '창문' }
      ],
      items: [
        { icon: '⭐', x: 180, y: 150, size: 40 },
        { icon: '❤️', x: 620, y: 700, size: 35 },
        { icon: '🐱', x: 1400, y: 350, size: 45 },
        { icon: '📚', x: 400, y: 680, size: 40 },
        { icon: '🎨', x: 1100, y: 250, size: 38 },
        { icon: '⚽', x: 1600, y: 900, size: 42 },
        { icon: '🌈', x: 900, y: 150, size: 36 },
        { icon: '🦋', x: 300, y: 450, size: 34 }
      ]
    },
    {
      id: 'playground',
      name: '운동장',
      emoji: '🏃',
      bgColor: '#55efc4',
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 2000, h: 800, fill: '#81ecec' },
        { type: 'rect', x: 0, y: 800, w: 2000, h: 400, fill: '#55efc4' },
        { type: 'circle', x: 1700, y: 150, r: 100, fill: '#ffeaa7', label: '태양' },
        { type: 'rect', x: 200, y: 500, w: 60, h: 300, fill: '#636e72', label: '기둥' },
        { type: 'rect', x: 100, y: 480, w: 260, h: 20, fill: '#d63031', label: '그네' },
        { type: 'rect', x: 700, y: 600, w: 400, h: 200, fill: '#e17055', label: '미끄럼틀' },
        { type: 'circle', x: 1300, y: 700, r: 150, fill: '#dfe6e9', label: '모래밭' },
        { type: 'rect', x: 1500, y: 400, w: 300, h: 400, fill: '#00b894', label: '나무' }
      ],
      items: [
        { icon: '🐶', x: 350, y: 850, size: 45 },
        { icon: '🎈', x: 250, y: 400, size: 40 },
        { icon: '🌸', x: 1550, y: 500, size: 35 },
        { icon: '🐝', x: 800, y: 550, size: 32 },
        { icon: '🍎', x: 1650, y: 350, size: 38 },
        { icon: '🎵', x: 500, y: 700, size: 36 },
        { icon: '🐞', x: 1250, y: 650, size: 30 },
        { icon: '🌟', x: 1000, y: 400, size: 42 }
      ]
    },
    {
      id: 'forest',
      name: '숲',
      emoji: '🌳',
      bgColor: '#00b894',
      shapes: [
        { type: 'rect', x: 0, y: 0, w: 2000, h: 1200, fill: '#00b894' },
        { type: 'circle', x: 300, y: 400, r: 200, fill: '#00cec9', label: '나무' },
        { type: 'circle', x: 800, y: 350, r: 250, fill: '#00b894', label: '큰나무' },
        { type: 'circle', x: 1400, y: 450, r: 180, fill: '#55efc4', label: '나무' },
        { type: 'rect', x: 250, y: 500, w: 100, h: 300, fill: '#636e72', label: '줄기' },
        { type: 'rect', x: 750, y: 500, w: 120, h: 350, fill: '#636e72', label: '줄기' },
        { type: 'rect', x: 1350, y: 550, w: 100, h: 280, fill: '#636e72', label: '줄기' },
        { type: 'rect', x: 0, y: 900, w: 2000, h: 300, fill: '#6c5ce7', label: '땅' },
        { type: 'circle', x: 1700, y: 200, r: 80, fill: '#ffeaa7', label: '달' }
      ],
      items: [
        { icon: '🍄', x: 450, y: 950, size: 42 },
        { icon: '🐿️', x: 320, y: 350, size: 38 },
        { icon: '🦉', x: 850, y: 280, size: 44 },
        { icon: '🐸', x: 1200, y: 1000, size: 40 },
        { icon: '🌺', x: 600, y: 700, size: 36 },
        { icon: '🐛', x: 1500, y: 600, size: 30 },
        { icon: '🍂', x: 100, y: 800, size: 35 },
        { icon: '🦎', x: 1650, y: 950, size: 38 }
      ]
    }
  ];

  var DIFFICULTY = { easy: 3, normal: 5, hard: 8 };

  // =====================
  // 상태
  // =====================
  var currentTheme = null;
  var activeItems = [];   // 이번 판에 찾아야 할 아이템들
  var foundItems = [];    // 찾은 아이템 인덱스
  var difficulty = 'normal';
  var dragHelper = null;

  // =====================
  // DOM 참조
  // =====================
  var themeScreen = document.getElementById('themeScreen');
  var themeGrid = document.getElementById('themeGrid');
  var gameScreen = document.getElementById('gameScreen');
  var gameViewport = document.getElementById('gameViewport');
  var gameCanvas = document.getElementById('gameCanvas');
  var itemBar = document.getElementById('itemBar');
  var congratsScreen = document.getElementById('congratsScreen');
  var btnRetry = document.getElementById('btnRetry');
  var btnThemes = document.getElementById('btnThemes');
  var btnHome = document.getElementById('btnHome');

  // =====================
  // 화면 전환
  // =====================
  function showScreen(screen) {
    themeScreen.style.display = 'none';
    gameScreen.classList.remove('active');
    congratsScreen.classList.remove('active');

    if (screen === 'theme') {
      themeScreen.style.display = 'flex';
    } else if (screen === 'game') {
      gameScreen.classList.add('active');
    } else if (screen === 'congrats') {
      congratsScreen.classList.add('active');
    }
  }

  // =====================
  // 테마 선택 화면 렌더링
  // =====================
  function renderThemeGrid() {
    themeGrid.innerHTML = '';
    THEMES.forEach(function (theme) {
      var card = document.createElement('div');
      card.className = 'theme-card touchable';
      card.innerHTML = '<div class="theme-emoji">' + theme.emoji + '</div>' + theme.name;
      card.addEventListener('click', function () {
        startGame(theme);
      });
      themeGrid.appendChild(card);
    });
  }

  // =====================
  // 게임 시작
  // =====================
  function startGame(theme) {
    currentTheme = theme;
    foundItems = [];

    // 난이도에 따라 아이템 랜덤 선택
    var count = DIFFICULTY[difficulty];
    var shuffled = theme.items.slice().sort(function () { return Math.random() - 0.5; });
    activeItems = shuffled.slice(0, count);

    renderGameCanvas();
    renderItemBar();
    showScreen('game');

    // 드래그 활성화
    dragHelper = enableDrag(gameViewport, gameCanvas);
    // 초기 위치: 중앙
    var vw = gameViewport.clientWidth;
    var vh = gameViewport.clientHeight;
    dragHelper.setOffset(-(2000 - vw) / 2, -(1200 - vh) / 2);
  }

  // =====================
  // 배경 렌더링 (placeholder 도형)
  // =====================
  function renderGameCanvas() {
    gameCanvas.innerHTML = '';

    // 배경 도형 그리기
    currentTheme.shapes.forEach(function (shape) {
      var el = document.createElement('div');
      el.style.position = 'absolute';

      if (shape.type === 'rect') {
        el.style.left = shape.x + 'px';
        el.style.top = shape.y + 'px';
        el.style.width = shape.w + 'px';
        el.style.height = shape.h + 'px';
        el.style.background = shape.fill;
        el.style.borderRadius = '8px';
      } else if (shape.type === 'circle') {
        el.style.left = (shape.x - shape.r) + 'px';
        el.style.top = (shape.y - shape.r) + 'px';
        el.style.width = (shape.r * 2) + 'px';
        el.style.height = (shape.r * 2) + 'px';
        el.style.background = shape.fill;
        el.style.borderRadius = '50%';
      }

      if (shape.label) {
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = 'rgba(0,0,0,0.2)';
        el.style.fontSize = '1.2rem';
        el.textContent = shape.label;
      }

      gameCanvas.appendChild(el);
    });

    // 숨긴 아이템 배치
    activeItems.forEach(function (item, index) {
      var el = document.createElement('div');
      el.className = 'touchable';
      el.style.position = 'absolute';
      el.style.left = (item.x - item.size / 2) + 'px';
      el.style.top = (item.y - item.size / 2) + 'px';
      el.style.width = item.size + 'px';
      el.style.height = item.size + 'px';
      el.style.fontSize = item.size + 'px';
      el.style.lineHeight = '1';
      el.style.cursor = 'pointer';
      el.style.zIndex = '10';
      el.dataset.itemIndex = index;
      el.textContent = item.icon;

      el.addEventListener('click', function (e) {
        e.stopPropagation();
        onItemTap(index, item, el);
      });

      gameCanvas.appendChild(el);
    });
  }

  // =====================
  // 아이템 바 렌더링
  // =====================
  function renderItemBar() {
    itemBar.innerHTML = '';
    activeItems.forEach(function (item, index) {
      var el = document.createElement('div');
      el.className = 'item';
      el.dataset.itemIndex = index;
      el.textContent = item.icon;
      itemBar.appendChild(el);
    });
  }

  // =====================
  // 아이템 탭 처리
  // =====================
  function onItemTap(index, item, element) {
    // 이미 찾은 아이템이면 무시
    if (foundItems.indexOf(index) !== -1) return;

    foundItems.push(index);

    // 캔버스에서 아이템 시각적 피드백
    element.style.opacity = '0.3';
    element.style.pointerEvents = 'none';

    // 펄스 이펙트
    var feedback = document.createElement('div');
    feedback.className = 'found-feedback';
    feedback.style.left = (item.x - 40) + 'px';
    feedback.style.top = (item.y - 40) + 'px';
    gameCanvas.appendChild(feedback);
    setTimeout(function () { feedback.remove(); }, 600);

    // 아이템 바 업데이트
    var barItem = itemBar.querySelector('[data-item-index="' + index + '"]');
    if (barItem) {
      barItem.classList.add('found');
    }

    // 전부 찾았는지 확인
    if (foundItems.length === activeItems.length) {
      setTimeout(function () {
        showScreen('congrats');
      }, 800);
    }
  }

  // =====================
  // 축하 화면 버튼
  // =====================
  btnRetry.addEventListener('click', function () {
    startGame(currentTheme);
  });

  btnThemes.addEventListener('click', function () {
    showScreen('theme');
  });

  btnHome.addEventListener('click', function () {
    window.location.href = '../../index.html';
  });

  // =====================
  // 초기화
  // =====================
  renderThemeGrid();
  showScreen('theme');

})();
```

- [ ] **Step 2: 브라우저에서 전체 흐름 확인**

1. `games/i-spy/index.html` 열기
2. 테마 3개(교실, 운동장, 숲) 카드가 보이는지 확인
3. "교실" 선택 → 배경 도형 + 숨긴 아이콘 5개 표시
4. 하단 아이템 바에 찾아야 할 아이콘 5개 표시
5. 아이콘 클릭 → 초록 펄스 피드백 + 아이템 바에서 체크
6. 5개 모두 찾기 → "모두 찾았어요!" 축하 화면
7. "다시 하기" → 같은 테마 재시작
8. "다른 테마" → 테마 선택 화면
9. "홈으로" → 런처 이동
10. ← 뒤로가기 버튼 → 런처 이동

- [ ] **Step 3: 커밋**

```bash
git add games/i-spy/game.js
git commit -m "feat: add i-spy game logic with theme data, item detection, and win condition"
```

---

### Task 6: 난이도 선택 기능 추가

**Files:**
- Modify: `games/i-spy/game.js`
- Modify: `games/i-spy/style.css`

- [ ] **Step 1: style.css에 난이도 선택 스타일 추가**

`games/i-spy/style.css` 파일 끝에 추가:

```css
/* 난이도 선택 */
.difficulty-bar {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.difficulty-btn {
  padding: 12px 28px;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: bold;
  border: 3px solid transparent;
  background: rgba(255,255,255,0.8);
  color: #333;
  transition: all 0.2s;
}

.difficulty-btn.selected {
  border-color: white;
  background: white;
  color: #ff6f61;
}

.difficulty-btn:active {
  transform: scale(0.95);
}
```

- [ ] **Step 2: index.html에 난이도 바 추가**

`games/i-spy/index.html`의 `<div class="theme-screen">` 안, `<div class="theme-grid">` 바로 아래에 추가:

```html
    <div class="difficulty-bar" id="difficultyBar">
      <button class="difficulty-btn touchable" data-diff="easy">쉬움 (3개)</button>
      <button class="difficulty-btn touchable selected" data-diff="normal">보통 (5개)</button>
      <button class="difficulty-btn touchable" data-diff="hard">어려움 (8개)</button>
    </div>
```

- [ ] **Step 3: game.js에 난이도 선택 로직 추가**

`games/i-spy/game.js`에서 `renderThemeGrid()` 함수 뒤에 추가:

```javascript
  // =====================
  // 난이도 선택
  // =====================
  var difficultyBar = document.getElementById('difficultyBar');
  var diffBtns = difficultyBar.querySelectorAll('.difficulty-btn');

  diffBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      diffBtns.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      difficulty = btn.dataset.diff;
    });
  });
```

- [ ] **Step 4: 브라우저에서 확인**

- 테마 선택 화면 아래에 "쉬움/보통/어려움" 버튼 3개 표시
- "보통"이 기본 선택(하이라이트)
- "쉬움" 클릭 후 테마 선택 → 아이템 3개만 나오는지 확인
- "어려움" 클릭 후 테마 선택 → 아이템 8개 나오는지 확인

- [ ] **Step 5: 커밋**

```bash
git add games/i-spy/style.css games/i-spy/index.html games/i-spy/game.js
git commit -m "feat: add difficulty selection (easy 3, normal 5, hard 8 items)"
```

---

### Task 7: 최종 통합 테스트 및 정리

**Files:**
- Review: all files

- [ ] **Step 1: 런처 → 게임 → 런처 전체 흐름 테스트**

1. `index.html` 열기 → 런처 표시
2. "숨은 그림 찾기" 카드 클릭 → 게임 페이지 이동
3. 난이도 "쉬움" 선택 → "교실" 테마 선택
4. 아이템 3개 모두 찾기 → 축하 화면
5. "홈으로" → 런처로 복귀
6. 다시 게임 진입 → "어려움" → "숲" 테마 → 아이템 8개 확인
7. ← 뒤로가기 버튼 → 런처로 복귀

- [ ] **Step 2: 터치 동작 확인 (개발자 도구 터치 에뮬레이션)**

Chrome DevTools → Toggle device toolbar → 터치 모드:
- 드래그로 캔버스 이동 확인
- 탭으로 아이템 찾기 확인
- 드래그와 탭이 구분되는지 확인

- [ ] **Step 3: 세로 모드 경고 확인**

Chrome DevTools에서 세로 해상도 설정 → "화면을 가로로 돌려주세요" 표시 확인

- [ ] **Step 4: .gitignore 추가 및 최종 커밋**

```bash
echo ".superpowers/" > .gitignore
git add .gitignore
git commit -m "chore: add .gitignore for superpowers directory"
```
