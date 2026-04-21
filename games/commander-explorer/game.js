/* commander-explorer */
'use strict';

const SIZE=8;
const TIME_LIMIT=120;
const TREASURES_NEEDED=3;

// 0=empty, 1=wall, 2=trap, 3=treasure, 4=goal
let grid=[],playerPos={r:0,c:0},goalPos={r:0,c:0};
let hp=3,treasureCount=0,moves=0,timeLeft=TIME_LIMIT,gameActive=false,gameTimer=null,allTimeouts=[];
let visited=new Set();

const sfx=createSoundManager({
  step(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=440;g.gain.setValueAtTime(.12,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.07);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.07);},
  treasure(ctx){[784,988,1175].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.07;g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.3);});},
  trap(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(180,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+.3);g.gain.setValueAtTime(.28,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.32);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.35);},
  win(ctx){[523,659,784,1047,1319].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.1;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.55);});}
});

const $=id=>document.getElementById(id);
function showScreen(el){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));void el.offsetWidth;el.classList.add('active');}
function push(t){allTimeouts.push(t);return t;}
function clearAll(){allTimeouts.forEach(clearTimeout);allTimeouts=[];}

$('backBtn').addEventListener('click',goHome);
const stI=$('soundToggleIntro');stI.addEventListener('click',()=>{stI.textContent=sfx.toggleMute()?'🔇':'🔊';});stI.textContent=sfx.isMuted()?'🔇':'🔊';
const stG=$('soundToggleGame');stG.addEventListener('click',()=>{stG.textContent=sfx.toggleMute()?'🔇':'🔊';});
onTap($('playBtn'),startCountdown);onTap($('retryBtn'),startCountdown);onTap($('homeBtn'),goHome);
onTap($('closeBtn'),()=>{stopAll();goHome();});
onTap($('dirUp'),()=>move(-1,0));
onTap($('dirDown'),()=>move(1,0));
onTap($('dirLeft'),()=>move(0,-1));
onTap($('dirRight'),()=>move(0,1));

function stopAll(){gameActive=false;clearAll();if(gameTimer){gameTimer.stop();gameTimer=null;}}

function startCountdown(){
  stopAll();showScreen($('countdownScreen'));
  let n=3;$('countdownNumber').textContent=n;
  function tick(){n--;if(n<=0){$('countdownNumber').textContent='GO!';push(setTimeout(startGame,700));}else{$('countdownNumber').textContent=n;push(setTimeout(tick,1000));}}
  push(setTimeout(tick,1000));
}

function generateMaze(){
  // Fill with random walls (25% wall)
  grid=[];
  for(let r=0;r<SIZE;r++){
    const row=[];
    for(let c=0;c<SIZE;c++){
      row.push(Math.random()<.22?1:0);
    }
    grid.push(row);
  }
  // Clear start & goal
  grid[0][0]=0;
  grid[SIZE-1][SIZE-1]=0;
  playerPos={r:0,c:0};
  goalPos={r:SIZE-1,c:SIZE-1};
  // Ensure path exists via BFS - if not, carve
  if(!hasPath(0,0,SIZE-1,SIZE-1)){carvePath();}
  // Place traps (5) and treasures (3) on empty cells
  placeItems(2,5);
  placeItems(3,3);
  grid[goalPos.r][goalPos.c]=4;
  grid[playerPos.r][playerPos.c]=0;
}

function hasPath(r1,c1,r2,c2){
  const q=[[r1,c1]];const seen=new Set([r1+','+c1]);
  while(q.length){
    const [r,c]=q.shift();
    if(r===r2&&c===c2)return true;
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=r+dr,nc=c+dc;
      if(nr<0||nr>=SIZE||nc<0||nc>=SIZE)continue;
      const k=nr+','+nc;if(seen.has(k))continue;
      if(grid[nr][nc]===1)continue;
      seen.add(k);q.push([nr,nc]);
    }
  }
  return false;
}

function carvePath(){
  // Simple: carve diagonal path
  for(let i=0;i<SIZE;i++){grid[i][i]=0;if(i<SIZE-1)grid[i][i+1]=0;}
}

function placeItems(type,count){
  let placed=0,tries=0;
  while(placed<count&&tries<100){
    tries++;
    const r=Math.floor(Math.random()*SIZE),c=Math.floor(Math.random()*SIZE);
    if(grid[r][c]===0&&!(r===0&&c===0)&&!(r===SIZE-1&&c===SIZE-1)){grid[r][c]=type;placed++;}
  }
}

function startGame(){
  stopAll();
  hp=3;treasureCount=0;moves=0;timeLeft=TIME_LIMIT;visited=new Set(['0,0']);
  generateMaze();
  stG.textContent=sfx.isMuted()?'🔇':'🔊';
  showScreen($('gameScreen'));
  render();
  updateHud();
  gameActive=true;
  gameTimer=createTimer(TIME_LIMIT,rem=>{timeLeft=rem;updateHud();},()=>endGame(false,'시간 초과'));
  gameTimer.start();
}

function render(){
  const p1=$('mazeP1'),p2=$('mazeP2');
  p1.innerHTML='';p2.innerHTML='';
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const v=grid[r][c];
      // P1 full view
      const c1=document.createElement('div');
      c1.className='cell';
      if(v===1)c1.classList.add('wall');
      else if(v===2){c1.classList.add('trap');c1.textContent='🪤';}
      else if(v===3){c1.classList.add('goal');c1.textContent='⭐';}
      else if(v===4){c1.classList.add('goal');c1.textContent='🏁';}
      if(r===playerPos.r&&c===playerPos.c){c1.classList.add('player');c1.textContent='🧭';}
      p1.appendChild(c1);
      // P2 fog
      const c2=document.createElement('div');
      c2.className='cell';
      const dist=Math.max(Math.abs(r-playerPos.r),Math.abs(c-playerPos.c));
      if(dist<=1){
        c2.classList.add('visible');
        if(v===1)c2.classList.add('wall');
        else if(v===2){c2.classList.add('trap');c2.textContent='🪤';}
        else if(v===3){c2.classList.add('goal');c2.textContent='⭐';}
        else if(v===4){c2.classList.add('goal');c2.textContent='🏁';}
        if(r===playerPos.r&&c===playerPos.c){c2.classList.add('player');c2.textContent='🧭';}
      }
      p2.appendChild(c2);
    }
  }
}

function move(dr,dc){
  if(!gameActive)return;
  const nr=playerPos.r+dr,nc=playerPos.c+dc;
  if(nr<0||nr>=SIZE||nc<0||nc>=SIZE)return;
  if(grid[nr][nc]===1){
    showBanner('🚫 벽! 다른 길로!','ng');
    return;
  }
  playerPos={r:nr,c:nc};
  moves++;
  const v=grid[nr][nc];
  if(v===2){
    hp--;
    sfx.play('trap');
    showBanner('🪤 함정! HP -1','ng');
    grid[nr][nc]=0;
    if(hp<=0){render();updateHud();endGame(false,'HP 소진');return;}
  }else if(v===3){
    treasureCount++;
    sfx.play('treasure');
    showBanner('⭐ 보물 획득!','ok');
    grid[nr][nc]=0;
  }else if(v===4){
    if(treasureCount>=TREASURES_NEEDED){
      sfx.play('win');render();updateHud();endGame(true,'모든 임무 완료!');return;
    }else{
      showBanner('🏁 도착! 보물 '+(TREASURES_NEEDED-treasureCount)+'개 더 필요','ng');
    }
  }else{
    sfx.play('step');
  }
  render();updateHud();
}

function updateHud(){
  $('hudHp').textContent='❤️'.repeat(Math.max(0,hp))+'🖤'.repeat(Math.max(0,3-hp));
  $('hudTime').textContent='⭐ '+treasureCount+'/'+TREASURES_NEEDED;
  $('hudScore').textContent=timeLeft+'s';
}

function showBanner(t,c){const b=$('banner');b.textContent=t;b.className='banner '+c+' show';setTimeout(()=>b.classList.remove('show'),1500);}

function endGame(won,reason){
  gameActive=false;stopAll();
  $('resultEmoji').textContent=won?'🏆':'💀';
  $('resultHeadline').textContent=won?'탐험 성공!':'탐험 실패';
  $('resultHeadline').className='result-headline '+(won?'success':'fail');
  $('resultSub').textContent=won?'팀워크가 빛났어요!':reason;
  $('statTreasure').textContent=treasureCount+'/'+TREASURES_NEEDED;
  $('statHp').textContent=Math.max(0,hp)+'/3';
  $('statMoves').textContent=moves;
  push(setTimeout(()=>showScreen($('resultScreen')),500));
}
