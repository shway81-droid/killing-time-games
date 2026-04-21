/* shield-sword */
'use strict';

const GAME_TIME=60;
const MONSTER_HP_MAX=100;
const DAMAGE_PER_TAP=2;
const FALL_INTERVAL_START=2000;
const FALL_INTERVAL_MIN=700;
const FALL_DURATION=1800; // ms from top to bottom

let gameActive=false,timeLeft=GAME_TIME,hp=3,monsterHp=MONSTER_HP_MAX;
let fallTimer=null,gameTimer=null,anim=null;
let lastSpawn=0,spawnInt=FALL_INTERVAL_START;
let falling=[]; // {el,lane,startTime,resolved}
let selectedLane=1;
let allTimeouts=[];

const sfx=createSoundManager({
  hit(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.setValueAtTime(200,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(400,ctx.currentTime+.08);g.gain.setValueAtTime(.2,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.1);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.1);},
  block(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(800,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(300,ctx.currentTime+.15);g.gain.setValueAtTime(.22,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.18);},
  damage(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(180,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+.3);g.gain.setValueAtTime(.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.35);},
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

document.querySelectorAll('.lane-btn').forEach(b=>{onTap(b,()=>selectLane(parseInt(b.dataset.lane)));});
onTap($('attackBtn'),attackMonster);
onTap($('monster'),attackMonster);

function stopAll(){
  gameActive=false;clearAll();
  if(gameTimer){gameTimer.stop();gameTimer=null;}
  if(anim){cancelAnimationFrame(anim);anim=null;}
  falling.forEach(f=>f.el.remove());falling=[];
}

function startCountdown(){
  stopAll();showScreen($('countdownScreen'));
  let n=3;$('countdownNumber').textContent=n;
  function tick(){n--;if(n<=0){$('countdownNumber').textContent='GO!';push(setTimeout(startGame,700));}else{$('countdownNumber').textContent=n;push(setTimeout(tick,1000));}}
  push(setTimeout(tick,1000));
}

function startGame(){
  stopAll();
  timeLeft=GAME_TIME;hp=3;monsterHp=MONSTER_HP_MAX;
  selectedLane=1;spawnInt=FALL_INTERVAL_START;lastSpawn=performance.now();
  stG.textContent=sfx.isMuted()?'🔇':'🔊';
  showScreen($('gameScreen'));
  updateHud();
  document.querySelectorAll('.lane-btn').forEach((b,i)=>b.classList.toggle('active',i===selectedLane));
  gameActive=true;
  gameTimer=createTimer(GAME_TIME,rem=>{timeLeft=rem;updateHud();},()=>endGame(false,'시간 초과'));
  gameTimer.start();
  loop();
}

function loop(){
  anim=requestAnimationFrame(loop);
  if(!gameActive)return;
  const now=performance.now();
  // Spawn
  if(now-lastSpawn>spawnInt){
    spawn();lastSpawn=now;
    // Scale difficulty
    const prog=1-(timeLeft/GAME_TIME);
    spawnInt=Math.max(FALL_INTERVAL_MIN,FALL_INTERVAL_START-prog*1200);
  }
  // Update falling
  const area=$('attackArea');
  const h=area.clientHeight;
  for(const f of falling){
    if(f.resolved)continue;
    const t=(now-f.startTime)/FALL_DURATION;
    if(t>=1){
      // Hit bottom - check if correct lane was selected
      if(selectedLane===f.lane){
        sfx.play('block');
        f.resolved=true;f.el.style.transition='opacity .2s,transform .3s';f.el.style.opacity='0';f.el.style.transform='scale(1.5)';
        setTimeout(()=>f.el.remove(),300);
      }else{
        sfx.play('damage');
        hp--;
        f.resolved=true;
        f.el.style.background='#EF5350';
        setTimeout(()=>f.el.remove(),200);
        if(hp<=0){updateHud();endGame(false,'HP 소진');return;}
        updateHud();
      }
    }else{
      f.el.style.top=(t*(h-30))+'px';
    }
  }
  falling=falling.filter(f=>!f.resolved||f.el.parentNode);
}

function spawn(){
  const area=$('attackArea');
  const lane=Math.floor(Math.random()*3);
  const el=document.createElement('div');
  el.className='falling';
  el.textContent='🔥';
  const w=area.clientWidth;
  const laneX=(lane+.5)*(w/3)-15;
  el.style.left=laneX+'px';
  el.style.top='0px';
  area.appendChild(el);
  falling.push({el,lane,startTime:performance.now(),resolved:false});
}

function selectLane(l){
  selectedLane=l;
  document.querySelectorAll('.lane-btn').forEach((b,i)=>b.classList.toggle('active',i===l));
}

function attackMonster(){
  if(!gameActive)return;
  monsterHp=Math.max(0,monsterHp-DAMAGE_PER_TAP);
  sfx.play('hit');
  const m=$('monster');
  m.classList.remove('hit');void m.offsetWidth;m.classList.add('hit');
  // Floating damage
  const d=document.createElement('div');
  d.className='damage-float';
  d.textContent='-'+DAMAGE_PER_TAP;
  d.style.left=(50+Math.random()*20-10)+'%';
  d.style.top='40%';
  $('monsterArea').appendChild(d);
  setTimeout(()=>d.remove(),600);
  updateHud();
  if(monsterHp<=0){endGame(true,'몬스터 처치');}
}

function updateHud(){
  $('hudHp').textContent='❤️'.repeat(Math.max(0,hp))+'🖤'.repeat(Math.max(0,3-hp));
  $('hudTime').textContent=timeLeft;
  $('monsterFill').style.width=(monsterHp/MONSTER_HP_MAX*100)+'%';
}

function endGame(won,reason){
  if(!gameActive&&!reason)return;
  gameActive=false;stopAll();
  if(won)sfx.play('win');else sfx.play('damage');
  $('resultEmoji').textContent=won?'🏆':'💀';
  $('resultHeadline').textContent=won?'승리!':'패배...';
  $('resultHeadline').className='result-headline '+(won?'success':'fail');
  $('resultSub').textContent=won?'찰떡 호흡으로 몬스터 처치!':reason;
  $('statMon').textContent=monsterHp;
  $('statHp').textContent=Math.max(0,hp)+'/3';
  $('statTime').textContent=timeLeft+'초';
  push(setTimeout(()=>showScreen($('resultScreen')),500));
}
