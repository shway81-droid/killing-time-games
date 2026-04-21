/* relay-carry */
'use strict';

const GAME_TIME=60;
const BALL_SPEED_START=0.6; // fraction per sec
const BALL_SPEED_MAX=1.3;
const GOAL_ZONE_START=0.75; // right 25% is goal zone

let turn=1,ballPos=0,speed=BALL_SPEED_START;
let goals=0,miss=0,gameActive=false,timeLeft=GAME_TIME,gameTimer=null,anim=null,lastT=0,allTimeouts=[];

const sfx=createSoundManager({
  kick(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(400,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(800,ctx.currentTime+.1);g.gain.setValueAtTime(.22,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.12);},
  goal(ctx){[523,784,1047,1319].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.07;g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.3);});},
  miss(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(220,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(100,ctx.currentTime+.2);g.gain.setValueAtTime(.22,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.25);},
  end(ctx){[523,659,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.1;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.55);});}
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
onTap($('btnP1'),()=>handleTap(1));
onTap($('btnP2'),()=>handleTap(2));

function stopAll(){gameActive=false;clearAll();if(gameTimer){gameTimer.stop();gameTimer=null;}if(anim){cancelAnimationFrame(anim);anim=null;}}

function startCountdown(){
  stopAll();showScreen($('countdownScreen'));
  let n=3;$('countdownNumber').textContent=n;
  function tick(){n--;if(n<=0){$('countdownNumber').textContent='GO!';push(setTimeout(startGame,700));}else{$('countdownNumber').textContent=n;push(setTimeout(tick,1000));}}
  push(setTimeout(tick,1000));
}

function startGame(){
  stopAll();
  turn=1;ballPos=0;goals=0;miss=0;timeLeft=GAME_TIME;speed=BALL_SPEED_START;
  stG.textContent=sfx.isMuted()?'🔇':'🔊';
  showScreen($('gameScreen'));
  updateHud();setTurn(1);
  gameActive=true;lastT=performance.now();
  gameTimer=createTimer(GAME_TIME,rem=>{timeLeft=rem;updateHud();},endGame);
  gameTimer.start();
  loop();
}

function setTurn(t){
  turn=t;
  ballPos=0;
  $('laneP1').classList.toggle('armed',t===1);
  $('laneP2').classList.toggle('armed',t===2);
  $('btnP1').disabled=t!==1;
  $('btnP2').disabled=t!==2;
  $('ballP1').style.opacity=t===1?'1':'0';
  $('ballP2').style.opacity=t===2?'1':'0';
  $('hudStatus').textContent=t===1?'P1 차례!':'P2 차례!';
}

function loop(){
  anim=requestAnimationFrame(loop);
  if(!gameActive)return;
  const now=performance.now();
  const dt=(now-lastT)/1000;lastT=now;
  ballPos+=speed*dt;
  if(ballPos>=1){
    // Missed — ball went off track
    miss++;sfx.play('miss');showFb(turn,'😖','#D32F2F');
    setTurn(1);updateHud();return;
  }
  const el=turn===1?$('ballP1'):$('ballP2');
  const track=el.parentElement;
  const w=track.clientWidth-30;
  el.style.left=(ballPos*w)+'px';
}

function handleTap(p){
  if(!gameActive||turn!==p)return;
  const inZone=ballPos>=GOAL_ZONE_START&&ballPos<=1;
  if(inZone){
    sfx.play('kick');
    if(p===1){
      showFb(1,'✓','#43A047');
      setTurn(2);
    }else{
      goals++;sfx.play('goal');
      showFb(2,'⚽ GOAL!','#FFEB3B');
      // speed up slightly
      speed=Math.min(BALL_SPEED_MAX,speed+0.05);
      setTurn(1);
    }
  }else{
    miss++;sfx.play('miss');showFb(p,'✗','#D32F2F');
    setTurn(1);
  }
  updateHud();
}

function showFb(p,t,c){
  const fb=$('fb'+(p===1?'P1':'P2'));
  fb.textContent=t;fb.style.color=c;
  fb.classList.remove('show');void fb.offsetWidth;fb.classList.add('show');
}

function updateHud(){
  $('hudRound').textContent=goals+'골';
  $('hudTime').textContent=timeLeft;
}

function endGame(){
  if(!gameActive)return;gameActive=false;stopAll();
  sfx.play('end');
  const success=goals>=5;
  $('resultEmoji').textContent=success?'🏆':'😔';
  $('resultHeadline').textContent=success?'멋진 릴레이!':'아쉬워요';
  $('resultHeadline').className='result-headline '+(success?'success':'fail');
  $('resultSub').textContent=success?'호흡이 착착 맞았어요!':'5골 이상이 목표!';
  $('statGoals').textContent=goals+'개';
  $('statMiss').textContent=miss+'번';
  push(setTimeout(()=>showScreen($('resultScreen')),500));
}
