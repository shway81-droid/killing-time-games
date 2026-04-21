/* bomb-relay */
'use strict';

const GOAL=10;
const MAX_FAIL=3;
const SPEED_START=0.8; // fraction per sec
const SPEED_MAX=1.8;
const ZONE_WIDTH_START=0.25; // fraction of track
const ZONE_WIDTH_MIN=0.14;

let holder=1; // 1 or 2 — who currently holds bomb
let cursorPos=0,cursorDir=1,speed=SPEED_START,zoneW=ZONE_WIDTH_START,zoneStart=0;
let successCount=0,failCount=0,gameActive=false,anim=null,lastT=0,allTimeouts=[];

const sfx=createSoundManager({
  ok(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(660,ctx.currentTime);o.frequency.linearRampToValueAtTime(880,ctx.currentTime+.1);g.gain.setValueAtTime(.2,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.15);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.15);},
  bad(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(200,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+.4);g.gain.setValueAtTime(.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.45);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.45);},
  win(ctx){[523,659,784,1047,1319].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.1;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.55);});},
  boom(ctx){const b=ctx.createBuffer(1,ctx.sampleRate*.4,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);const s=ctx.createBufferSource();s.buffer=b;const g=ctx.createGain();g.gain.setValueAtTime(.4,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.4);s.connect(g);g.connect(ctx.destination);s.start();}
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

function stopAll(){gameActive=false;clearAll();if(anim){cancelAnimationFrame(anim);anim=null;}}

function startCountdown(){
  stopAll();showScreen($('countdownScreen'));
  let n=3;$('countdownNumber').textContent=n;
  function tick(){n--;if(n<=0){$('countdownNumber').textContent='GO!';push(setTimeout(startGame,700));}else{$('countdownNumber').textContent=n;push(setTimeout(tick,1000));}}
  push(setTimeout(tick,1000));
}

function startGame(){
  stopAll();
  holder=1;cursorPos=0;cursorDir=1;successCount=0;failCount=0;
  speed=SPEED_START;zoneW=ZONE_WIDTH_START;randomizeZone();
  stG.textContent=sfx.isMuted()?'🔇':'🔊';
  showScreen($('gameScreen'));
  updateHud();updateHolder();
  gameActive=true;lastT=performance.now();
  loop();
}

function randomizeZone(){
  zoneStart=Math.random()*(1-zoneW);
  updateZoneDisplay();
}

function updateZoneDisplay(){
  const trackW = 100; // percent
  ['zoneP1','zoneP2'].forEach(id=>{
    const el=$(id);
    el.style.left=(zoneStart*100)+'%';
    el.style.width=(zoneW*100)+'%';
  });
}

function updateHolder(){
  $('panelP1').classList.toggle('armed',holder===1);
  $('panelP2').classList.toggle('armed',holder===2);
  $('bombP1').className='bomb '+(holder===1?'active':'');
  $('bombP2').className='bomb '+(holder===2?'active':'');
  $('bombP1').textContent=holder===1?'💣':'⚫';
  $('bombP2').textContent=holder===2?'💣':'⚫';
  $('btnP1').disabled=holder!==1;
  $('btnP2').disabled=holder!==2;
}

function loop(){
  anim=requestAnimationFrame(loop);
  if(!gameActive)return;
  const now=performance.now();
  const dt=(now-lastT)/1000;lastT=now;
  cursorPos+=cursorDir*speed*dt;
  if(cursorPos>=1){cursorPos=1;cursorDir=-1;}
  if(cursorPos<=0){cursorPos=0;cursorDir=1;}
  const id=holder===1?'cursorP1':'cursorP2';
  const el=$(id);
  el.style.left=(cursorPos*100)+'%';
  // Hide the other cursor
  const other=holder===1?'cursorP2':'cursorP1';
  $(other).style.opacity='0.2';
  $(id).style.opacity='1';
}

function handleTap(p){
  if(!gameActive||holder!==p)return;
  const inZone=cursorPos>=zoneStart&&cursorPos<=zoneStart+zoneW;
  if(inZone){
    sfx.play('ok');
    successCount++;
    showFb(p,'✓','#FFEB3B');
    if(successCount>=GOAL){endGame(true);return;}
    // Pass to other
    holder=holder===1?2:1;
    cursorPos=0;cursorDir=1;
    // Scale difficulty
    const prog=successCount/GOAL;
    speed=SPEED_START+prog*(SPEED_MAX-SPEED_START);
    zoneW=ZONE_WIDTH_START-prog*(ZONE_WIDTH_START-ZONE_WIDTH_MIN);
    randomizeZone();
    updateHolder();
  }else{
    sfx.play('bad');
    failCount++;
    showFb(p,'✗','#FF5252');
    if(failCount>=MAX_FAIL){endGame(false);return;}
    // Reset cursor but same holder
    cursorPos=0;cursorDir=1;
  }
  updateHud();
}

function showFb(p,t,c){
  const fb=$('fb'+(p===1?'P1':'P2'));
  fb.textContent=t;fb.style.color=c;
  fb.classList.remove('show');void fb.offsetWidth;fb.classList.add('show');
}

function updateHud(){
  $('hudRound').textContent=successCount+'/'+GOAL;
  $('hudScore').textContent='❤️'.repeat(MAX_FAIL-failCount)+'🖤'.repeat(failCount);
  $('hudTime').textContent=holder===1?'P1 차례':'P2 차례';
}

function endGame(won){
  gameActive=false;stopAll();
  if(won)sfx.play('win');else sfx.play('boom');
  $('resultEmoji').textContent=won?'🏆':'💥';
  $('resultHeadline').textContent=won?'폭탄 해체 성공!':'💥 폭발!';
  $('resultHeadline').className='result-headline '+(won?'success':'fail');
  $('resultSub').textContent=won?'완벽한 호흡이었어요!':'다음엔 더 집중!';
  $('statOk').textContent=successCount+'회';
  $('statFail').textContent=failCount+'회';
  push(setTimeout(()=>showScreen($('resultScreen')),600));
}
