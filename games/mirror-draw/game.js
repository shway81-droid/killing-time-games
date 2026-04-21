/* mirror-draw */
'use strict';

const TOTAL_ROUNDS=3;
const ROUND_TIME=30;
const DOTS_PER_ROUND=[5,7,9];

let round=0,score=0,totalAcc=0;
let targetCells=new Set(),inputCells=new Set(),roundActive=false,roundTimer=null,allTimeouts=[];

const sfx=createSoundManager({
  tap(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=500;g.gain.setValueAtTime(.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.08);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.08);},
  correct(ctx){[523,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.08;g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.35);});},
  wrong(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(180,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(80,ctx.currentTime+.3);g.gain.setValueAtTime(.22,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.32);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.35);},
  end(ctx){[523,659,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;const t=ctx.currentTime+i*.1;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.55);});}
});

const $=id=>document.getElementById(id);
const introScreen=$('introScreen'),countdownScreen=$('countdownScreen'),gameScreen=$('gameScreen'),resultScreen=$('resultScreen');
const gridTarget=$('gridTarget'),gridInput=$('gridInput'),banner=$('banner'),hudFill=$('hudTimerFill');

function showScreen(el){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));void el.offsetWidth;el.classList.add('active');}
function push(t){allTimeouts.push(t);return t;}
function clearAll(){allTimeouts.forEach(clearTimeout);allTimeouts=[];}

$('backBtn').addEventListener('click',goHome);
const stI=$('soundToggleIntro');stI.addEventListener('click',()=>{stI.textContent=sfx.toggleMute()?'🔇':'🔊';});stI.textContent=sfx.isMuted()?'🔇':'🔊';
const stG=$('soundToggleGame');stG.addEventListener('click',()=>{stG.textContent=sfx.toggleMute()?'🔇':'🔊';});
onTap($('playBtn'),startCountdown);onTap($('retryBtn'),startCountdown);onTap($('homeBtn'),goHome);
onTap($('closeBtn'),()=>{stopAll();goHome();});

function stopAll(){clearAll();if(roundTimer){roundTimer.stop();roundTimer=null;}roundActive=false;}

function startCountdown(){
  stopAll();showScreen(countdownScreen);
  let n=3;$('countdownNumber').textContent=n;
  function tick(){n--;if(n<=0){$('countdownNumber').textContent='GO!';push(setTimeout(startGame,700));}else{$('countdownNumber').textContent=n;push(setTimeout(tick,1000));}}
  push(setTimeout(tick,1000));
}

function startGame(){
  round=0;score=0;totalAcc=0;
  stG.textContent=sfx.isMuted()?'🔇':'🔊';
  showScreen(gameScreen);
  nextRound();
}

function nextRound(){
  if(round>=TOTAL_ROUNDS){endGame();return;}
  round++;
  // Generate target cells
  targetCells=new Set();
  const n=DOTS_PER_ROUND[round-1];
  while(targetCells.size<n){targetCells.add(Math.floor(Math.random()*25));}
  inputCells=new Set();
  $('hudRound').textContent=round+'/'+TOTAL_ROUNDS;
  $('hudScore').textContent=score+'점';
  renderTarget();
  renderInput();
  showBanner('🗣 P1: 칸 위치를 말해주세요!','info');
  roundActive=true;
  if(roundTimer)roundTimer.stop();
  hudFill.style.width='100%';hudFill.className='hud-timer-fill';
  roundTimer=createTimer(ROUND_TIME,rem=>{
    const pct=(rem/ROUND_TIME)*100;hudFill.style.width=pct+'%';
    if(rem<=5)hudFill.className='hud-timer-fill danger';
  },()=>evaluate());
  roundTimer.start();
}

function renderTarget(){
  gridTarget.innerHTML='';
  for(let i=0;i<25;i++){
    const c=document.createElement('div');
    c.className='cell';
    // Show row/col hint on empty cells
    const r=Math.floor(i/5)+1,col=(i%5)+1;
    if(!targetCells.has(i))c.textContent=r+','+col;
    else c.classList.add('filled-target');
    gridTarget.appendChild(c);
  }
}

function renderInput(){
  gridInput.innerHTML='';
  for(let i=0;i<25;i++){
    const c=document.createElement('div');
    c.className='cell';
    if(inputCells.has(i))c.classList.add('filled');
    const r=Math.floor(i/5)+1,col=(i%5)+1;
    if(!inputCells.has(i))c.textContent=r+','+col;
    onTap(c,()=>toggleCell(i,c));
    gridInput.appendChild(c);
  }
}

function toggleCell(i,el){
  if(!roundActive)return;
  sfx.play('tap');
  if(inputCells.has(i)){inputCells.delete(i);el.classList.remove('filled');el.textContent=(Math.floor(i/5)+1)+','+((i%5)+1);}
  else{inputCells.add(i);el.classList.add('filled');el.textContent='';}
  // Finish early if input count matches target count
  if(inputCells.size===targetCells.size){
    push(setTimeout(()=>evaluate(),500));
  }
}

function evaluate(){
  if(!roundActive)return;
  roundActive=false;
  if(roundTimer)roundTimer.pause();
  // Lock
  gridInput.querySelectorAll('.cell').forEach(c=>c.classList.add('locked'));
  // Reveal
  let hit=0,miss=0,extra=0;
  const children=gridInput.children;
  for(let i=0;i<25;i++){
    const inTarget=targetCells.has(i),inInput=inputCells.has(i);
    const el=children[i];
    el.classList.remove('filled');
    el.textContent='';
    if(inTarget && inInput){el.classList.add('reveal-hit');hit++;}
    else if(inTarget && !inInput){el.classList.add('reveal-miss');miss++;}
    else if(!inTarget && inInput){el.classList.add('reveal-extra');extra++;}
  }
  const total=targetCells.size;
  const acc=Math.round((hit/total)*100);
  totalAcc+=acc;
  const ok=acc>=80;
  if(ok){score++;sfx.play('correct');showBanner('🎉 정확도 '+acc+'% 성공!','ok');}
  else{sfx.play('wrong');showBanner('😅 정확도 '+acc+'% 아쉬워요','ng');}
  $('hudScore').textContent=score+'점';
  push(setTimeout(nextRound,2500));
}

function showBanner(t,c){banner.textContent=t;banner.className='banner '+c+' show';}

function endGame(){
  stopAll();sfx.play('end');
  const success=score>=2;
  const avgAcc=Math.round(totalAcc/TOTAL_ROUNDS);
  $('resultEmoji').textContent=success?'🏆':'😔';
  $('resultHeadline').textContent=success?'대단해요!':'아쉬워요';
  $('resultHeadline').className='result-headline '+(success?'success':'fail');
  $('resultSub').textContent=success?'말로 잘 전달했어요!':'다시 도전!';
  $('statScore').textContent=score+'/'+TOTAL_ROUNDS;
  $('statAcc').textContent=avgAcc+'%';
  push(setTimeout(()=>showScreen(resultScreen),400));
}
