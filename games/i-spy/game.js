// games/i-spy/game.js

(function () {
  'use strict';

  // =====================
  // 테마 데이터
  // =====================
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
  var activeItems = [];
  var foundItems = [];
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

    var count = DIFFICULTY[difficulty];
    var shuffled = theme.items.slice().sort(function () { return Math.random() - 0.5; });
    activeItems = shuffled.slice(0, count);

    renderGameCanvas();
    renderItemBar();
    showScreen('game');

    dragHelper = enableDrag(gameViewport, gameCanvas);
    var vw = gameViewport.clientWidth;
    var vh = gameViewport.clientHeight;
    dragHelper.setOffset(-(2000 - vw) / 2, -(1200 - vh) / 2);
  }

  // =====================
  // 배경 렌더링
  // =====================
  function renderGameCanvas() {
    gameCanvas.innerHTML = '';

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
    if (foundItems.indexOf(index) !== -1) return;

    foundItems.push(index);

    element.style.opacity = '0.3';
    element.style.pointerEvents = 'none';

    var feedback = document.createElement('div');
    feedback.className = 'found-feedback';
    feedback.style.left = (item.x - 40) + 'px';
    feedback.style.top = (item.y - 40) + 'px';
    gameCanvas.appendChild(feedback);
    setTimeout(function () { feedback.remove(); }, 600);

    var barItem = itemBar.querySelector('[data-item-index="' + index + '"]');
    if (barItem) {
      barItem.classList.add('found');
    }

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
