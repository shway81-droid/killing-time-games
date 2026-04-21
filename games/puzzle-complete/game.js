/* games/puzzle-complete/game.js */
'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_PIECES  = 12;  // 4x3 grid
const GAME_DURATION = 90;  // seconds

const PLAYER_CFG = [
  { color: '#FF5252', bg: 'rgba(255,82,82,0.15)',  label: 'P1' },
  { color: '#40C4FF', bg: 'rgba(64,196,255,0.15)', label: 'P2' },
  { color: '#FFCA28', bg: 'rgba(255,202,40,0.15)', label: 'P3' },
  { color: '#AB47BC', bg: 'rgba(171,71,188,0.15)', label: 'P4' },
];

// Piece colors — one per piece (1-12)
const PIECE_COLORS = [
  '#E53935', // 1  — red arc
  '#FB8C00', // 2  — orange arc
  '#FDD835', // 3  — yellow arc
  '#43A047', // 4  — green arc
  '#1E88E5', // 5  — blue arc
  '#8E24AA', // 6  — violet arc
  '#00ACC1', // 7  — sky / cloud
  '#F57F17', // 8  — sun
  '#388E3C', // 9  — grass
  '#78909C', // 10 — cloud
  '#F06292', // 11 — flower
  '#5D4037', // 12 — tree trunk
];

// ─── State ────────────────────────────────────────────────────────────────────
let playerCount   = 2;
let nextPiece     = 1;      // 1-based: next piece that must be tapped
let placedCount   = 0;
let mistakes      = 0;
let timeRemaining = GAME_DURATION;
let gameActive    = false;
let gameTimer     = null;
let allTimeouts   = [];

// pieceOwner[pieceNum] = playerIndex (0-based)
let pieceOwner = {};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const introScreen     = document.getElementById('introScreen');
const countdownScreen = document.getElementById('countdownScreen');
const gameScreen      = document.getElementById('gameScreen');
const resultScreen    = document.getElementById('resultScreen');
const countdownNum    = document.getElementById('countdownNumber');
const timerVal        = document.getElementById('timerVal');
const nextNumEl       = document.getElementById('nextNum');
const progressValEl   = document.getElementById('progressVal');
const puzzleBoard     = document.getElementById('puzzleBoard');
const zonesGrid       = document.getElementById('zonesGrid');
const wrongFlash      = document.getElementById('wrongFlash');
const resultEmoji     = document.getElementById('resultEmoji');
const resultHeadline  = document.getElementById('resultHeadline');
const resultDetail    = document.getElementById('resultDetail');
const resultPreview   = document.getElementById('resultPuzzlePreview');
const statPieces      = document.getElementById('statPieces');
const statTime        = document.getElementById('statTime');
const statMistakes    = document.getElementById('statMistakes');

// ─── Sound Manager ────────────────────────────────────────────────────────────
const sfx = createSoundManager({
  place(ctx) {
    // Satisfying "click" + rising tone
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    // Click transient
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.2, ctx.currentTime);
    src.connect(ng);
    ng.connect(ctx.destination);
    src.start();
  },

  wrong(ctx) {
    // Buzzy descending
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  },

  complete(ctx) {
    // Fanfare arpeggio
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  },

  fail(ctx) {
    // Sad descending
    const notes = [440, 370, 311, 247];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.2;
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }
});

// ─── Screen helper ───────────────────────────────────────────────────────────
function showScreen(el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  void el.offsetWidth;
  el.classList.add('active');
}

// ─── Intro ────────────────────────────────────────────────────────────────────
document.getElementById('playerSelect').addEventListener('click', e => {
  const btn = e.target.closest('.player-btn');
  if (!btn) return;
  document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  playerCount = parseInt(btn.dataset.count, 10);
});

document.getElementById('backBtn').addEventListener('click', function() {
  if (gameTimer) gameTimer.stop();
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];
  goHome();
});

const soundToggleIntro = document.getElementById('soundToggleIntro');
soundToggleIntro.addEventListener('click', () => {
  const muted = sfx.toggleMute();
  soundToggleIntro.textContent = muted ? '🔇' : '🔊';
});
soundToggleIntro.textContent = sfx.isMuted() ? '🔇' : '🔊';

onTap(document.getElementById('playBtn'), () => startCountdown());

// ─── Countdown ────────────────────────────────────────────────────────────────
function startCountdown() {
  showScreen(countdownScreen);
  let n = 3;
  countdownNum.textContent = n;

  function tick() {
    n--;
    if (n <= 0) {
      countdownNum.textContent = '시작!';
      const t = setTimeout(() => startGame(), 700);
      allTimeouts.push(t);
    } else {
      countdownNum.textContent = n;
      const t = setTimeout(tick, 1000);
      allTimeouts.push(t);
    }
  }
  const t = setTimeout(tick, 1000);
  allTimeouts.push(t);
}

// ─── Piece distribution ───────────────────────────────────────────────────────
// 2 players: P1 gets 1,3,5,7,9,11 / P2 gets 2,4,6,8,10,12
// 3 players: P1 gets 1,4,7,10 / P2 gets 2,5,8,11 / P3 gets 3,6,9,12
// 4 players: P1 gets 1,5,9 / P2 gets 2,6,10 / P3 gets 3,7,11 / P4 gets 4,8,12
function distributePieces() {
  pieceOwner = {};
  for (let piece = 1; piece <= TOTAL_PIECES; piece++) {
    // 0-based player index: (piece-1) mod playerCount
    pieceOwner[piece] = (piece - 1) % playerCount;
  }
}

// ─── Puzzle SVG pieces ───────────────────────────────────────────────────────
// The target image is a 4x3 grid showing a rainbow scene.
// col 0-3, row 0-2. Piece number = row*4 + col + 1
// viewBox per cell: we clip from a 400x300 master image, cell = 100x100
function getPieceSvg(pieceNum, forSlot = false) {
  // col = (pieceNum-1) % 4,  row = Math.floor((pieceNum-1) / 4)
  const col = (pieceNum - 1) % 4;
  const row = Math.floor((pieceNum - 1) / 4);
  const cx  = col * 100;  // clip x in 400x300 space
  const cy  = row * 100;  // clip y in 400x300 space

  // The rainbow scene occupies a 400x300 virtual canvas
  // Pieces are clipped windows into that canvas
  return `<svg viewBox="${cx} ${cy} 100 100" preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Background sky -->
    <rect x="0" y="0" width="400" height="220" fill="#B3E5FC"/>
    <!-- Grass -->
    <rect x="0" y="220" width="400" height="80" fill="#388E3C"/>
    <!-- Ground details -->
    <ellipse cx="60" cy="235" rx="30" ry="12" fill="#2E7D32"/>
    <ellipse cx="200" cy="240" rx="40" ry="10" fill="#2E7D32"/>
    <ellipse cx="340" cy="232" rx="25" ry="10" fill="#2E7D32"/>

    <!-- Rainbow arcs (center at 200,240) -->
    <!-- Red -->
    <path d="M 30,240 Q 200,40 370,240" stroke="#E53935" stroke-width="18" fill="none" stroke-linecap="round"/>
    <!-- Orange -->
    <path d="M 45,240 Q 200,60 355,240" stroke="#FB8C00" stroke-width="18" fill="none" stroke-linecap="round"/>
    <!-- Yellow -->
    <path d="M 60,240 Q 200,80 340,240" stroke="#FDD835" stroke-width="18" fill="none" stroke-linecap="round"/>
    <!-- Green -->
    <path d="M 75,240 Q 200,100 325,240" stroke="#43A047" stroke-width="18" fill="none" stroke-linecap="round"/>
    <!-- Blue -->
    <path d="M 90,240 Q 200,120 310,240" stroke="#1E88E5" stroke-width="18" fill="none" stroke-linecap="round"/>
    <!-- Violet -->
    <path d="M 105,240 Q 200,140 295,240" stroke="#8E24AA" stroke-width="18" fill="none" stroke-linecap="round"/>

    <!-- Sun (top-right area, ~340,50) -->
    <circle cx="340" cy="50" r="30" fill="#FDD835"/>
    <circle cx="340" cy="50" r="22" fill="#FFEE58"/>
    <!-- Sun rays -->
    <line x1="340" y1="10" x2="340" y2="0"  stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
    <line x1="368" y1="22" x2="378" y2="12" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
    <line x1="380" y1="50" x2="392" y2="50" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
    <line x1="368" y1="78" x2="378" y2="88" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
    <line x1="340" y1="90" x2="340" y2="100" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
    <line x1="312" y1="78" x2="302" y2="88" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
    <line x1="300" y1="50" x2="288" y2="50" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>
    <line x1="312" y1="22" x2="302" y2="12" stroke="#FDD835" stroke-width="5" stroke-linecap="round"/>

    <!-- Cloud (left area, ~70,60) -->
    <ellipse cx="70" cy="65" rx="35" ry="20" fill="#fff" opacity="0.9"/>
    <ellipse cx="55" cy="72" rx="22" ry="16" fill="#fff" opacity="0.9"/>
    <ellipse cx="88" cy="70" rx="25" ry="15" fill="#fff" opacity="0.9"/>

    <!-- Flower (bottom center area, ~160,250) -->
    <circle cx="160" cy="252" r="8" fill="#FFEE58"/>
    <circle cx="148" cy="252" r="7" fill="#F06292"/>
    <circle cx="172" cy="252" r="7" fill="#F06292"/>
    <circle cx="160" cy="241" r="7" fill="#F06292"/>
    <circle cx="160" cy="263" r="7" fill="#F06292"/>
    <circle cx="150" cy="244" r="6" fill="#F06292"/>
    <circle cx="170" cy="244" r="6" fill="#F06292"/>
    <circle cx="150" cy="261" r="6" fill="#F06292"/>
    <circle cx="170" cy="261" r="6" fill="#F06292"/>
    <rect   x="158" y="258" width="4" height="20" fill="#388E3C"/>

    <!-- Tree (right side, ~320,230) -->
    <rect x="316" y="240" width="12" height="40" fill="#5D4037"/>
    <!-- Tree canopy layers -->
    <polygon points="322,195 295,240 350,240" fill="#2E7D32"/>
    <polygon points="322,210 300,248 344,248" fill="#388E3C"/>
    <polygon points="322,225 305,255 340,255" fill="#43A047"/>
  </svg>`;
}

// ─── Build board slots ────────────────────────────────────────────────────────
function buildBoard() {
  puzzleBoard.innerHTML = '';
  for (let i = 1; i <= TOTAL_PIECES; i++) {
    const slot = document.createElement('div');
    slot.className = 'puzzle-slot';
    slot.id = 'slot-' + i;
    slot.dataset.piece = i;
    // Faint number label
    const num = document.createElement('span');
    num.className = 'slot-num';
    num.textContent = i;
    slot.appendChild(num);
    puzzleBoard.appendChild(slot);
  }
}

// ─── Build player zones ────────────────────────────────────────────────────────
function buildZones() {
  zonesGrid.innerHTML = '';
  zonesGrid.className = 'zones-grid p' + playerCount;

  for (let p = 0; p < playerCount; p++) {
    const cfg  = PLAYER_CFG[p];
    const zone = document.createElement('div');
    zone.className = 'player-zone';
    zone.style.background = cfg.bg;
    zone.style.borderColor = cfg.color + '55';
    zone.id = 'zone-' + p;

    const header = document.createElement('div');
    header.className = 'zone-header';
    header.innerHTML = `<div class="zone-dot" style="background:${cfg.color}"></div>
                        <span class="zone-label">${cfg.label}</span>`;

    const piecesWrap = document.createElement('div');
    piecesWrap.className = 'zone-pieces';
    piecesWrap.id = 'zone-pieces-' + p;

    zone.appendChild(header);
    zone.appendChild(piecesWrap);
    zonesGrid.appendChild(zone);
  }

  // Create piece elements
  for (let n = 1; n <= TOTAL_PIECES; n++) {
    const owner = pieceOwner[n];
    const wrap  = document.getElementById('zone-pieces-' + owner);
    const piece = document.createElement('div');
    piece.className = 'piece';
    piece.id        = 'piece-' + n;
    piece.dataset.pieceNum = n;
    piece.style.background = PIECE_COLORS[n - 1];
    piece.textContent = n;
    onTap(piece, () => handlePieceTap(n, piece));
    wrap.appendChild(piece);
  }

  highlightNextPiece();
}

// ─── Highlight next target piece ──────────────────────────────────────────────
function highlightNextPiece() {
  document.querySelectorAll('.piece').forEach(p => p.classList.remove('next-target'));
  if (nextPiece <= TOTAL_PIECES) {
    const el = document.getElementById('piece-' + nextPiece);
    if (el) el.classList.add('next-target');
  }
  nextNumEl.textContent = nextPiece <= TOTAL_PIECES ? '#' + nextPiece : '완료!';
}

// ─── Handle piece tap ─────────────────────────────────────────────────────────
function handlePieceTap(pieceNum, pieceEl) {
  if (!gameActive) return;
  if (pieceEl.classList.contains('placed')) return;

  if (pieceNum === nextPiece) {
    // CORRECT
    sfx.play('place');
    animatePieceToSlot(pieceNum, pieceEl);
  } else {
    // WRONG
    mistakes++;
    sfx.play('wrong');
    pieceEl.classList.remove('wrong');
    void pieceEl.offsetWidth;
    pieceEl.classList.add('wrong');
    setTimeout(() => pieceEl.classList.remove('wrong'), 420);

    // Flash screen red
    wrongFlash.classList.add('show');
    setTimeout(() => wrongFlash.classList.remove('show'), 200);
  }
}

// ─── Animate piece flying to slot ─────────────────────────────────────────────
function animatePieceToSlot(pieceNum, pieceEl) {
  const slot     = document.getElementById('slot-' + pieceNum);
  const pieceRect = pieceEl.getBoundingClientRect();
  const slotRect  = slot.getBoundingClientRect();

  // Create flying clone
  const fly = document.createElement('div');
  fly.className = 'piece-fly';
  fly.style.background = PIECE_COLORS[pieceNum - 1];
  fly.style.left = pieceRect.left + 'px';
  fly.style.top  = pieceRect.top  + 'px';
  fly.textContent = pieceNum;
  document.body.appendChild(fly);

  // Hide original
  pieceEl.classList.add('placed');

  // Trigger fly animation next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const targetX = slotRect.left + (slotRect.width  - 54) / 2;
      const targetY = slotRect.top  + (slotRect.height - 54) / 2;
      fly.style.left      = targetX + 'px';
      fly.style.top       = targetY + 'px';
      fly.style.transform = 'scale(0.7)';
      fly.style.opacity   = '0.6';
    });
  });

  const t = setTimeout(() => {
    fly.remove();
    // Fill slot with SVG image piece
    slot.innerHTML = getPieceSvg(pieceNum, true);
    slot.classList.add('filled');
    slot.classList.add('slot-land');
    setTimeout(() => slot.classList.remove('slot-land'), 600);

    // Advance state
    placedCount++;
    nextPiece++;
    progressValEl.textContent = placedCount + '/12';
    highlightNextPiece();

    if (placedCount === TOTAL_PIECES) {
      endGame(true);
    }
  }, 420);
  allTimeouts.push(t);
}

// ─── Game start ────────────────────────────────────────────────────────────────
function startGame() {
  // Reset state
  nextPiece     = 1;
  placedCount   = 0;
  mistakes      = 0;
  timeRemaining = GAME_DURATION;
  gameActive    = true;
  allTimeouts   = [];

  distributePieces();
  buildBoard();
  buildZones();

  // Reset HUD
  timerVal.textContent      = GAME_DURATION;
  timerVal.classList.remove('danger');
  nextNumEl.textContent     = '#1';
  progressValEl.textContent = '0/12';

  showScreen(gameScreen);

  gameTimer = createTimer(
    GAME_DURATION,
    (rem) => {
      timeRemaining = rem;
      timerVal.textContent = rem;
      if (rem <= 10) timerVal.classList.add('danger');
      else timerVal.classList.remove('danger');
    },
    () => endGame(false)
  );
  gameTimer.start();
}

// ─── Game end ─────────────────────────────────────────────────────────────────
function endGame(success) {
  gameActive = false;
  if (gameTimer) gameTimer.stop();
  allTimeouts.forEach(clearTimeout);
  allTimeouts = [];

  const pct = Math.round((placedCount / TOTAL_PIECES) * 100);

  if (success) {
    sfx.play('complete');
    resultEmoji.textContent = '🌈';
    resultHeadline.textContent = '퍼즐 완성!';
    resultHeadline.className = 'result-headline success';
    resultDetail.textContent = '모두 힘을 합쳐 무지개를 완성했어요!';
    statTime.textContent = timeRemaining + '초 남음';
    spawnConfetti();
  } else {
    sfx.play('fail');
    resultEmoji.textContent = '😢';
    resultHeadline.textContent = '시간 초과!';
    resultHeadline.className = 'result-headline fail';
    resultDetail.textContent = `${pct}% 완성 — 조금만 더!`;
    statTime.textContent = '0초 (시간 초과)';
  }

  statPieces.textContent   = placedCount + '/12';
  statMistakes.textContent = mistakes + '회';

  // Build result preview (show placed pieces + empty slots)
  buildResultPreview();

  const t = setTimeout(() => showScreen(resultScreen), 400);
  allTimeouts.push(t);
}

// ─── Result puzzle preview ────────────────────────────────────────────────────
function buildResultPreview() {
  resultPreview.innerHTML = '';
  for (let i = 1; i <= TOTAL_PIECES; i++) {
    const cell = document.createElement('div');
    cell.className = 'result-slot';
    if (i <= placedCount) {
      cell.innerHTML = getPieceSvg(i, true);
      cell.style.border = '1px solid rgba(255,255,255,0.2)';
    } else {
      cell.style.background = 'rgba(255,255,255,0.06)';
      cell.style.border = '1px dashed rgba(255,255,255,0.12)';
    }
    resultPreview.appendChild(cell);
  }
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const colors = ['#00897B','#FFD740','#FF5252','#40C4FF','#AB47BC','#69F0AE'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -10px;
      width: ${6 + Math.random() * 7}px;
      height: ${6 + Math.random() * 7}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall ${1.6 + Math.random() * 1.5}s ease-in ${Math.random() * 0.8}s forwards;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

// ─── Result actions ───────────────────────────────────────────────────────────
onTap(document.getElementById('retryBtn'), () => startCountdown());
onTap(document.getElementById('homeBtn'),  () => goHome());
onTap(document.getElementById('closeBtn'), () => {
  if (gameTimer) gameTimer.stop();
  allTimeouts.forEach(clearTimeout);
  goHome();
});

// Inject confetti keyframe
(function() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes confettiFall {
      0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
})();
