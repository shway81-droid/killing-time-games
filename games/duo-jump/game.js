/* duo-jump */
'use strict';

const GAME_TIME = 30;
const SYNC_WINDOW = 350; // ms — 두 탭이 이 시간 내면 성공
const OBSTACLE_SPEED_START = 3.5; // px/frame (~60fps)
const OBSTACLE_SPEED_MAX = 7;
const OBSTACLE_INTERVAL_START = 2200;
const OBSTACLE_INTERVAL_MIN = 900;

let timeLeft = GAME_TIME;
let hp = 3;
let score = 0;
let successCount = 0;
let failCount = 0;
let p1TapTime = 0;
let p2TapTime = 0;
let jumping = false;
let gameActive = false;
let gameTimer = null;
let spawnTimer = null;
let anim = null;
let obstacles = []; // {el, x, passed, resolved}
let speed = OBSTACLE_SPEED_START;
let spawnInterval = OBSTACLE_INTERVAL_START;
let allTimeouts = [];

const sfx = createSoundManager({
  jump(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(300,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(800,ctx.currentTime+.15);g.gain.setValueAtTime(.2,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.2);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.2);},
  success(ctx){[523,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.06;g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.3);});},
  fail(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(180,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+.3);g.gain.setValueAtTime(.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.35);},
  end(ctx){[523,659,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.1;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.55);});}
});

const introScreen=document.getElementById('introScreen');
const countdownScreen=document.getElementById('countdownScreen');
const gameScreen=document.getElementById('gameScreen');
const resultScreen=document.getElementById('resultScreen');
const countdownNum=document.getElementById('countdownNumber');
const hudHp=document.getElementById('hudHp');
const hudTime=document.getElementById('hudTime');
const hudScore=document.getElementById('hudScore');
const trackArea=document.getElementById('trackArea');
const character=document.getElementById('character');
const feedback=document.getElementById('feedback');
const zone1=document.getElementById('zone1');
const zone2=document.getElementById('zone2');

function showScreen(el){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));void el.offsetWidth;el.classList.add('active');}
function push(t){allTimeouts.push(t);return t;}
function clearAll(){allTimeouts.forEach(clearTimeout);allTimeouts=[];}

document.getElementById('backBtn').addEventListener('click',goHome);
const stI=document.getElementById('soundToggleIntro');
stI.addEventListener('click',()=>{stI.textContent=sfx.toggleMute()?'🔇':'🔊';});
stI.textContent=sfx.isMuted()?'🔇':'🔊';
const stG=document.getElementById('soundToggleGame');
stG.addEventListener('click',()=>{stG.textContent=sfx.toggleMute()?'🔇':'🔊';});

onTap(document.getElementById('playBtn'),startCountdown);
onTap(document.getElementById('retryBtn'),startCountdown);
onTap(document.getElementById('homeBtn'),goHome);
onTap(document.getElementById('closeBtn'),()=>{stop();goHome();});

// Pause rAF-based animation when tab hidden to avoid huge dt jumps on return
let wasActive=false;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){wasActive=gameActive;gameActive=false;}
  else if(wasActive){gameActive=true;wasActive=false;}
});

function startCountdown(){
  clearAll();stop();showScreen(countdownScreen);
  let n=3;countdownNum.textContent=n;
  function tick(){n--;if(n<=0){countdownNum.textContent='GO!';push(setTimeout(startGame,700));}else{countdownNum.textContent=n;push(setTimeout(tick,1000));}}
  push(setTimeout(tick,1000));
}

function stop(){
  gameActive=false;
  if(gameTimer){gameTimer.stop();gameTimer=null;}
  if(spawnTimer){clearTimeout(spawnTimer);spawnTimer=null;}
  if(anim){cancelAnimationFrame(anim);anim=null;}
  obstacles.forEach(o=>o.el.remove());
  obstacles=[];
}

function startGame(){
  stop();
  timeLeft=GAME_TIME;hp=3;score=0;successCount=0;failCount=0;
  speed=OBSTACLE_SPEED_START;spawnInterval=OBSTACLE_INTERVAL_START;
  updateHud();
  stG.textContent=sfx.isMuted()?'🔇':'🔊';
  showScreen(gameScreen);
  gameActive=true;

  onTap(zone1,()=>handleTap(1));
  onTap(zone2,()=>handleTap(2));

  gameTimer=createTimer(GAME_TIME,rem=>{timeLeft=rem;updateHud();},endGame);
  gameTimer.start();
  spawnLoop();
  tickLoop();
}

function spawnLoop(){
  if(!gameActive)return;
  spawnObstacle();
  // difficulty scaling
  const prog=1-(timeLeft/GAME_TIME);
  spawnInterval=Math.max(OBSTACLE_INTERVAL_MIN,OBSTACLE_INTERVAL_START-prog*1300);
  speed=Math.min(OBSTACLE_SPEED_MAX,OBSTACLE_SPEED_START+prog*3.5);
  spawnTimer=setTimeout(spawnLoop,spawnInterval);
}

function spawnObstacle(){
  const el=document.createElement('div');
  el.className='obstacle';
  el.textContent=Math.random()<.5?'🪨':'🌵';
  const w=trackArea.clientWidth;
  el.style.left=w+'px';
  trackArea.appendChild(el);
  obstacles.push({el,x:w,passed:false,resolved:false});
}

function tickLoop(){
  anim=requestAnimationFrame(tickLoop);
  if(!gameActive)return;
  const charCenter=trackArea.clientWidth/2;
  for(const ob of obstacles){
    ob.x-=speed;
    ob.el.style.left=ob.x+'px';
    // Arm zones when obstacle near character
    if(!ob.resolved && Math.abs(ob.x+18 - charCenter) < 60){
      if(!ob.armed){
        ob.armed=true;ob.armTime=performance.now();
        zone1.classList.add('armed');zone2.classList.add('armed');
      }
      // Collision check at overlap point
      if(ob.x < charCenter && !ob.passed){
        ob.passed=true;
        // Evaluate taps
        evaluate(ob);
      }
    }
    if(ob.x < -50){ob.el.remove();}
  }
  obstacles=obstacles.filter(o=>o.x>=-50);
}

function handleTap(p){
  if(!gameActive)return;
  const now=performance.now();
  if(p===1){p1TapTime=now;zone1.classList.add('tapped');setTimeout(()=>zone1.classList.remove('tapped'),200);}
  else{p2TapTime=now;zone2.classList.add('tapped');setTimeout(()=>zone2.classList.remove('tapped'),200);}
  sfx.play('jump');
  checkJump();
}

function checkJump(){
  if(p1TapTime && p2TapTime && Math.abs(p1TapTime-p2TapTime) < SYNC_WINDOW){
    if(!jumping){
      jumping=true;
      character.classList.add('jumping');
      setTimeout(()=>{character.classList.remove('jumping');jumping=false;},500);
    }
  }
}

function evaluate(ob){
  ob.resolved=true;
  zone1.classList.remove('armed');zone2.classList.remove('armed');
  const bothTapped = p1TapTime>0 && p2TapTime>0 && Math.abs(p1TapTime-p2TapTime)<SYNC_WINDOW;
  const recentP1 = p1TapTime > 0 && (performance.now() - p1TapTime) < 800;
  const recentP2 = p2TapTime > 0 && (performance.now() - p2TapTime) < 800;

  if(bothTapped && recentP1 && recentP2){
    successCount++;
    score+=10;
    sfx.play('success');
    showFeedback('🎉 성공!','#43A047');
  }else{
    failCount++;
    hp--;
    sfx.play('fail');
    showFeedback('💥 실패!','#D32F2F');
    if(hp<=0){endGame();return;}
  }
  // Reset tap times so next obstacle requires fresh taps
  p1TapTime=0;p2TapTime=0;
  updateHud();
}

function showFeedback(txt,color){
  feedback.textContent=txt;
  feedback.style.color=color;
  feedback.classList.remove('show');
  void feedback.offsetWidth;
  feedback.classList.add('show');
}

function updateHud(){
  hudHp.textContent = '❤'.repeat(Math.max(0,hp)) + '🖤'.repeat(Math.max(0,3-hp));
  hudTime.textContent=timeLeft;
  hudScore.textContent=score+'점';
}

function endGame(){
  if(!gameActive)return;
  gameActive=false;
  stop();
  sfx.play('end');
  const success=score>=60;
  document.getElementById('resultEmoji').textContent=success?'🏆':'😔';
  document.getElementById('resultHeadline').textContent=success?'대단해요!':'아쉬워요';
  document.getElementById('resultHeadline').className='result-headline '+(success?'success':'fail');
  document.getElementById('resultSub').textContent=success?'호흡이 딱 맞았어요!':'다시 도전해보세요!';
  document.getElementById('statSuccess').textContent=successCount+'회';
  document.getElementById('statFail').textContent=failCount+'회';
  document.getElementById('statScore').textContent=score+'점';
  push(setTimeout(()=>showScreen(resultScreen),400));
}
