/* fire-chain */
'use strict';

const GAME_TIME=60;
const PHASE_TIME=4; // seconds for each player's task
const FIRE_GOAL=90; // percent
const FIRE_PER_TAP=12;
const FIRE_DECAY=18; // per sec
const ICE_PER_TAP=10;

let phase=0; // 0=P1 fire, 1=P2 ice
let fireLevel=0,iceLevel=100;
let chains=0,streak=0,bestStreak=0;
let phaseTimeLeft=PHASE_TIME,gameTimeLeft=GAME_TIME;
let gameActive=false,gameTimer=null,phaseTimer=null,decayAnim=null,lastT=0,allTimeouts=[];

const sfx=createSoundManager({
  tap(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=500+Math.random()*200;g.gain.setValueAtTime(.12,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.06);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.06);},
  pass(ctx){[523,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.06;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.25);});},
  chain(ctx){[659,784,988,1319].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.07;g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.3);});},
  fail(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(200,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(80,ctx.currentTime+.3);g.gain.setValueAtTime(.25,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.32);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.35);},
  end(ctx){[523,659,784,1047,1319].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.1;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.55);});}
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
onTap($('btnP1'),()=>handleTap(0));
onTap($('btnP2'),()=>handleTap(1));

// Pause rAF-based decay when tab hidden; reset lastT on return to prevent dt explosion
let wasActive=false;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){wasActive=gameActive;gameActive=false;}
  else if(wasActive){lastT=performance.now();gameActive=true;wasActive=false;}
});

function stopAll(){gameActive=false;clearAll();if(gameTimer){gameTimer.stop();gameTimer=null;}if(phaseTimer){phaseTimer.stop();phaseTimer=null;}if(decayAnim){cancelAnimationFrame(decayAnim);decayAnim=null;}}

function startCountdown(){
  stopAll();showScreen($('countdownScreen'));
  let n=3;$('countdownNumber').textContent=n;
  function tick(){n--;if(n<=0){$('countdownNumber').textContent='GO!';push(setTimeout(startGame,700));}else{$('countdownNumber').textContent=n;push(setTimeout(tick,1000));}}
  push(setTimeout(tick,1000));
}

function startGame(){
  stopAll();
  phase=0;fireLevel=0;iceLevel=100;chains=0;streak=0;bestStreak=0;gameTimeLeft=GAME_TIME;
  stG.textContent=sfx.isMuted()?'🔇':'🔊';
  showScreen($('gameScreen'));
  updateHud();startPhase();
  gameActive=true;lastT=performance.now();
  gameTimer=createTimer(GAME_TIME,rem=>{gameTimeLeft=rem;updateHud();},endGame);
  gameTimer.start();
  decayLoop();
}

function startPhase(){
  phaseTimeLeft=PHASE_TIME;
  if(phase===0){
    fireLevel=0;$('fireFill').style.width='0%';
    $('panelP1').classList.remove('dim');$('panelP1').classList.add('armed');
    $('panelP2').classList.add('dim');$('panelP2').classList.remove('armed');
    $('btnP1').disabled=false;$('btnP2').disabled=true;
    $('hudStatus').textContent='🔥 P1: 빠르게 탭해서 불씨 키우기!';
  }else{
    iceLevel=100;$('iceFill').style.width='100%';
    $('panelP2').classList.remove('dim');$('panelP2').classList.add('armed');
    $('panelP1').classList.add('dim');$('panelP1').classList.remove('armed');
    $('btnP2').disabled=false;$('btnP1').disabled=true;
    $('hudStatus').textContent='❄️ P2: 얼음을 녹여라!';
  }
  if(phaseTimer)phaseTimer.stop();
  phaseTimer=createTimer(PHASE_TIME,rem=>{
    phaseTimeLeft=rem;
    $('badgeP1').textContent=phase===0?rem:'';
    $('badgeP2').textContent=phase===1?rem:'';
  },()=>phaseTimeout());
  phaseTimer.start();
}

function decayLoop(){
  decayAnim=requestAnimationFrame(decayLoop);
  if(!gameActive||phase!==0)return;
  const now=performance.now();
  const dt=(now-lastT)/1000;lastT=now;
  fireLevel=Math.max(0,fireLevel-FIRE_DECAY*dt);
  $('fireFill').style.width=fireLevel+'%';
}

function handleTap(ph){
  if(!gameActive||phase!==ph)return;
  lastT=performance.now();
  sfx.play('tap');
  if(ph===0){
    fireLevel=Math.min(100,fireLevel+FIRE_PER_TAP);
    $('fireFill').style.width=fireLevel+'%';
    $('fire').style.transform='scale('+(1+fireLevel/150)+')';
    if(fireLevel>=FIRE_GOAL){
      // pass to P2
      sfx.play('pass');
      showFb(0,'🔥 전달!','#FFEB3B');
      phase=1;
      if(phaseTimer)phaseTimer.stop();
      push(setTimeout(startPhase,500));
    }
  }else{
    iceLevel=Math.max(0,iceLevel-ICE_PER_TAP);
    $('iceFill').style.width=iceLevel+'%';
    $('ice').style.transform='scale('+(1-((100-iceLevel)/150))+')';
    if(iceLevel<=0){
      // Chain success
      chains++;streak++;if(streak>bestStreak)bestStreak=streak;
      sfx.play('chain');
      showFb(1,'✨ 체인 성공!','#4FC3F7');
      $('ice').textContent='💧';
      push(setTimeout(()=>{$('ice').textContent='🧊';$('ice').style.transform='scale(1)';$('fire').style.transform='scale(1)';},500));
      phase=0;
      if(phaseTimer)phaseTimer.stop();
      push(setTimeout(startPhase,700));
    }
  }
  updateHud();
}

function phaseTimeout(){
  if(!gameActive)return;
  streak=0;
  sfx.play('fail');
  showFb(phase,'⏰ 시간 초과','#D32F2F');
  // Reset
  phase=0;
  $('ice').textContent='🧊';$('ice').style.transform='scale(1)';$('fire').style.transform='scale(1)';
  push(setTimeout(startPhase,800));
  updateHud();
}

function showFb(p,t,c){
  const fb=$('fb'+(p===0?'P1':'P2'));
  fb.textContent=t;fb.style.color=c;
  fb.classList.remove('show');void fb.offsetWidth;fb.classList.add('show');
}

function updateHud(){
  $('hudRound').textContent=chains+'점';
  $('hudTime').textContent=gameTimeLeft;
}

function endGame(){
  if(!gameActive)return;gameActive=false;stopAll();sfx.play('end');
  const success=chains>=5;
  $('resultEmoji').textContent=success?'🏆':'😔';
  $('resultHeadline').textContent=success?'완벽한 체인!':'아쉬워요';
  $('resultHeadline').className='result-headline '+(success?'success':'fail');
  $('resultSub').textContent=success?'호흡이 정말 잘 맞았어요!':'5체인 이상이 목표!';
  $('statChains').textContent=chains+'회';
  $('statStreak').textContent=bestStreak+'회';
  push(setTimeout(()=>showScreen($('resultScreen')),500));
}
