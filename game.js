'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('battle'), ctx = canvas.getContext('2d');
  const warAssets=globalThis.Combate16Assets;
  const arcade=globalThis.CombateArcade;
  const HEIGHT = 540, GRAVITY = 300, STEP = 1 / 120, FRONT = 600;
  const LIGHT_PHASE_SECONDS=50, EFFECTS_VOLUME=2;
  let WORLD=1200;
  const barrier={left:FRONT-16,right:FRONT+16,top:200,wireTop:178,bottom:HEIGHT+100};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const themes = [
    {name:'VALE ESMERALDA', sky:['#168ee0','#89edcb'], far:'#7866ca', mid:'#28bfa8', near:'#157a6b', grass:'#b5ff54', edge:'#46b946', soil:'#b57a42', deep:'#704a39', fleck:'#d3ad6b', sun:'#fff2ac'},
    {name:'FRONTEIRA ÂMBAR', sky:['#8053d2','#ffc17e'], far:'#a48dc9', mid:'#dc78b3', near:'#9162a8', grass:'#ffd088', edge:'#d68b59', soil:'#b06c55', deep:'#744757', fleck:'#e8a774', sun:'#ffed9b'},
    {name:'SERRA BOREAL', sky:['#286bdb','#9beaff'], far:'#8985e5', mid:'#4baed7', near:'#2578a3', grass:'#f1fff1', edge:'#a6e3df', soil:'#7b9da7', deep:'#4b647f', fleck:'#b9d8da', sun:'#fff6bb'},
    {name:'DUNAS DO OCASO', sky:['#9a55cd','#ffb35c'], far:'#d56eb4', mid:'#f38a83', near:'#cc6a72', grass:'#ffe19a', edge:'#efb55b', soil:'#c68b55', deep:'#8b5f51', fleck:'#f4bc73', sun:'#fff3b3'}
  ];
  const sprites=arcade.sprites;
  let state='menu', paused=false, terrain=[], soldiers=[], team=0, current=null, actions=2, fuel=100;
  let round=1, turnCount=0, seed=0, random, theme=themes[0], biome=0, wind=0;
  const sceneryNames={scene:'SELVA FORTIFICADA',city:'CIDADE EM RUÍNAS',desert:'FRONTEIRA DO DESERTO',mountains:'MONTANHAS DO NORTE',japan:'CIDADE JAPONESA'};
  let sceneryChoice='random',sceneryKey='scene';
  let angle=55, power=65, previous=null, projectile=null, path=[], particles=[], floats=[], crates=[];
  let ghosts=[], plane=null, pendingFlights=0, supplyCount=0;
  let special=null,specialQueue=[],endAge=0,instructionNext=false;
  const musicFiles={menu:'assets/music-menu.mp3',game:'assets/music-game.mp3',end:'assets/music-end.mp3'};
  const musicTracks={};let musicKey='',ambienceNodes=null;
  for(const key of Object.keys(musicFiles)){if(typeof Audio!=='undefined'){const track=new Audio(musicFiles[key]);track.id='music-'+key;track.volume=1;track.loop=key!=='end';track.preload='none';track.hidden=true;document.body?.appendChild(track);musicTracks[key]=track;}}
  let deploymentTeam=0, selectedSoldier=0;
  let camera=0, view=1200, offsetY=0, manualCamera=null, moving=0, held=new Set(), sling=null;
  let combatFx=[],walkTouch=null,aiMove=null;
  let aimMode='sling',impactFocus=null;
  let ambient={time:0,blasts:[],aircraft:[],shells:[],tracers:[],tracerClock:.3,blastClock:.6,planeClock:1.5,gunClock:2,nuclearClock:35};
  let phase='aim', wait=0, aiTimer=0, elapsed=0, shots=0, damage=0, toastTime=0, last=0, accumulator=0;
  let mode='solo', difficulty='normal', musicEnabled=true, audio=null,audioUnlocked=false, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const roster=[['ATLAS','ECHO','NOVA'],['FALCÃO','BRASA','ÔNIX']];
  const selection=[0,0];
  const freshStats=()=>[{shots:0,hits:0,kills:0},{shots:0,hits:0,kills:0}];
  let level=1, stats=freshStats(), stageStats=freshStats(), canAdvance=false, raining=false;
  let bestScore=Number(read('best','0'))||0;
  function accuracy(s){return s.shots?100*s.hits/s.shots:0;}
  function scoreFor(s){return Math.round(s.kills*1000*(1+accuracy(s)/100));}
  function aiPrecision(stage=level){const base=difficulty==='easy'?35:difficulty==='hard'?65:50;return Math.min(95,base+3*(stage-1));}
  function environment(time=elapsed){const n=Math.floor(time/LIGHT_PHASE_SECONDS)%4,f=(time%LIGHT_PHASE_SECONDS)/LIGHT_PHASE_SECONDS,t=clamp((f-.72)/.28,0,1);return{index:n,next:(n+1)%4,blend:t*t*(3-2*t),name:['MANHÃ','DIA','TARDE','NOITE'][n]};}
  function mixColor(a,b,t){const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16);return '#'+[16,8,0].map(s=>Math.round(lerp((aa>>s)&255,(bb>>s)&255,t)).toString(16).padStart(2,'0')).join('');}
  function nightAmount(env=environment()){return lerp(env.index===3?1:0,env.next===3?1:0,env.blend);}
  function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function read(key,fallback){try{return localStorage.getItem('combate16-'+key)||fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem('combate16-'+key,value);}catch{/* Storage can be disabled in private browsers. */}}
  $('mode').value=read('mode','solo'); $('difficulty').value=read('difficulty','normal');
  const savedScenery=read('scenery','random');sceneryChoice=savedScenery==='random'||sceneryNames[savedScenery]?savedScenery:'random';$('scenery').value=sceneryChoice;
  function unlockAudio(){
    // Music uses native media playback. Never route file:// MP3s through Web Audio:
    // MediaElementAudioSource can output silence for an opaque local origin.
    audioUnlocked=true;
    for(const track of Object.values(musicTracks))track._blocked=false;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume()?.catch(()=>{});}catch{/* Music works even when synthesized effects are unavailable. */}
    syncMusic();
  }
  function syncSound(){syncMusic();$('sound').textContent=musicEnabled?'♫':'♪';$('sound').setAttribute('aria-label',musicEnabled?'Silenciar música':'Ativar música');$('sound').setAttribute('aria-pressed',String(musicEnabled));$('sound').title=musicEnabled?'Música ligada · silenciar apenas música':'Música silenciada · efeitos ativos';$('sound').style.color=musicEnabled?'var(--lime)':'';}
  function tone(freq=240,duration=.12,type='square',volume=.035){
    if(!audioUnlocked||document.hidden)return;
    volume=Math.min(.3,volume*EFFECTS_VOLUME);
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.3),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{/* Sound is optional. */}
  }

  function syncMusic(){
    const key=state==='ended'?'end':(['playing','deployment'].includes(state)&&!paused?'game':'menu');
    const enabled=musicEnabled&&audioUnlocked&&!document.hidden;
    for(const [name,track] of Object.entries(musicTracks)){
      // MP3 assets are pre-attenuated: battle 6% of original (15% of v1.10), menu/end 40%.
      track.volume=1;
      if(key!==musicKey)track._blocked=false;
      if(name!==key||!enabled){track.pause();if(name!==key&&name===musicKey)track.currentTime=0;}
      else if(track.paused&&!track._pending&&!track._blocked&&(name!=='end'||!track.ended||musicKey!==key)){track._pending=true;const attempt=track.play();attempt?.catch(error=>{track._blocked=error?.name!=='AbortError';}).finally(()=>{track._pending=false;});}
    }
    musicKey=key;
  }
  function noiseShot(volume=.018,duration=.1,low=150){
    if(!audioUnlocked||document.hidden||!audio?.createBuffer)return;
    volume=Math.min(.3,volume*EFFECTS_VOLUME);
    const n=Math.ceil(audio.sampleRate*duration),buffer=audio.createBuffer(1,n,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=low;gain.gain.value=volume;source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();
  }
  function updateAmbience(){
    syncMusic();if(!audioUnlocked||!audio?.createBuffer)return;
    if(!ambienceNodes){
      const engine=audio.createOscillator(),rotor=audio.createOscillator(),eg=audio.createGain(),rg=audio.createGain();eg.gain.value=0;rg.gain.value=0;engine.type='sine';engine.frequency.value=58;rotor.type='sine';rotor.frequency.value=24;engine.connect(eg);rotor.connect(rg);eg.connect(audio.destination);rg.connect(audio.destination);engine.start();rotor.start();
      const rain=audio.createBufferSource(),buf=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buf.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+.025*(Math.random()*2-1))/1.025;data[i]=brown*2;}rain.buffer=buf;rain.loop=true;const rainGain=audio.createGain(),rainFilter=audio.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=650;rainGain.gain.value=0;rain.connect(rainFilter);rainFilter.connect(rainGain);rainGain.connect(audio.destination);rain.start();ambienceNodes={eg,rg,rainGain};
    }
    const active=!paused&&!document.hidden&&['playing','deployment'].includes(state),vehicles=[...ambient.aircraft,...(plane?[plane]:[]),...(special?[special.aircraft]:[])];
    ambienceNodes.eg.gain.setTargetAtTime(active&&vehicles.length?.0025*EFFECTS_VOLUME:0,audio.currentTime,.15);
    ambienceNodes.rg.gain.setTargetAtTime(active&&vehicles.some(p=>p.kind==='helicopter')?.003*EFFECTS_VOLUME:0,audio.currentTime,.15);
    ambienceNodes.rainGain.gain.setTargetAtTime(active&&raining?.004*EFFECTS_VOLUME:0,audio.currentTime,.2);
  }

  function notify(text,time=2){$('toast').textContent=text;$('toast').classList.add('show');toastTime=Math.min(time,2.5);}
  function resize(){cancelWalk();cancelSling();const r=$('stage').getBoundingClientRect();view=Math.min(Math.round(r.width/r.height*HEIGHT),1200);canvas.width=view;canvas.height=Math.round(view*r.height/r.width);offsetY=Math.min(170,Math.max(0,HEIGHT-canvas.height));ctx.imageSmoothingEnabled=false;}
  new ResizeObserver(resize).observe($('stage'));
  function generate(){
    seed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;random=rng(seed);biome=Math.floor(random()*themes.length);theme=themes[biome];
    const previousScenery=sceneryKey,keys=Object.keys(sceneryNames).filter(k=>k!==previousScenery);sceneryKey=sceneryChoice==='random'?keys[Math.floor(random()*keys.length)]:sceneryChoice;
    if(!sceneryNames[sceneryKey])sceneryKey='scene';
    if(sceneryKey==='desert')biome=3;else if(sceneryKey==='mountains')biome=2;else if(sceneryKey==='japan')biome=1;theme=themes[biome];
    const counts=[3,mode==='solo'?level*3:3];WORLD=Math.max(1200,760+counts[1]*52);raining=random()<.35;
    let p=random()*7,q=random()*8,r=random()*6;
    const broad=90+random()*45,medium=39+random()*25,fine=18+random()*13;
    const rise=55+random()*16,ripple=27+random()*12,detail=9+random()*7;
    terrain=Array.from({length:WORLD},(_,x)=>clamp(367+Math.sin(x/broad+p)*rise+Math.sin(x/medium+q)*ripple+Math.sin(x/fine+r)*detail,255,465));
    soldiers=[];selection[0]=selection[1]=0;
    for(let t=0;t<2;t++)for(let i=0;i<counts[t];i++){
      const x=t?Math.round(720+i*(WORLD-780)/Math.max(1,counts[t]-1)):115+i*105+Math.floor(random()*30);
      const level=terrain[Math.floor(x)];for(let j=-19;j<=19;j++)terrain[Math.floor(x+j)]=lerp(terrain[Math.floor(x+j)],level,Math.cos(Math.abs(j)/20*Math.PI/2)**2);
      soldiers.push({team:t,index:i,name:roster[t][i%3]+(i>=3?' '+(Math.floor(i/3)+1):''),x,y:level,hp:100,boost:false,face:t?-1:1,walk:0,placed:true});
    }
    // Reject the occasional phase combination that flattens one deployment side.
    for(let attempt=0;attempt<16;attempt++){
      const span=(a,b)=>{const strip=terrain.slice(a,b);return Math.max(...strip)-Math.min(...strip);};
      if(span(32,560)>110&&span(640,Math.min(1168,WORLD-32))>110)break;
      p=random()*Math.PI*2;q=random()*Math.PI*2;r=random()*Math.PI*2;
      terrain=Array.from({length:WORLD},(_,x)=>attempt===15?367+Math.sin(x/70)*75+Math.sin(x/29)*22:clamp(367+Math.sin(x/broad+p)*rise+Math.sin(x/medium+q)*ripple+Math.sin(x/fine+r)*detail,255,465));
      for(const soldier of soldiers){const height=terrain[Math.floor(soldier.x)];for(let j=-19;j<=19;j++)terrain[Math.floor(soldier.x+j)]=lerp(terrain[Math.floor(soldier.x+j)],height,Math.cos(Math.abs(j)/20*Math.PI/2)**2);soldier.y=height;}
    }
    crates=[];ghosts=[];plane=null;pendingFlights=0;supplyCount=0;special=null;specialQueue=[];
    combatFx=[];impactFocus=null;ambient={time:0,blasts:[],aircraft:[],shells:[],tracers:[],tracerClock:.3,blastClock:.6,planeClock:1.5,gunClock:2,nuclearClock:rand(32,48)};
    wind=Math.round((random()-.5)*36);particles=[];floats=[];projectile=null;previous=null;manualCamera=null;
    $('biome-label').textContent=sceneryNames[sceneryKey];$('seed-label').textContent=`SEED ${seed.toString(16).toUpperCase()}`;
  }
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function start(){unlockAudio();aimMode='sling';mode=$('mode').value;difficulty=$('difficulty').value;sceneryChoice=$('scenery').value;save('scenery',sceneryChoice);save('mode',mode);save('difficulty',difficulty);level=1;stats=freshStats();shots=0;prepareStage();}
  function prepareStage(){cancelWalk();aiMove=null;cancelSling();aimMode='sling';closeDialogs();canAdvance=false;generate();stageStats=freshStats();state='deployment';phase='placement';paused=false;team=0;current=null;deploymentTeam=0;selectedSoldier=0;round=1;turnCount=0;elapsed=0;damage=0;angle=55;power=65;for(const s of soldiers)s.placed=s.team===1&&mode==='solo';selectPlacement(0);syncMusic();notify(mode==='solo'?`Fase ${level} · ${level*3} rivais. Prepare seu trio!`:'Prepare seu trio para o duelo!',4);tone(480,.16);}
  function nextStage(){if(state!=='ended'||!canAdvance||mode!=='solo')return;level++;prepareStage();}
  function selectPlacement(index){selectedSoldier=index;const s=soldiers.find(s=>s.team===deploymentTeam&&s.index===index);const min=deploymentTeam?FRONT+40:32,max=deploymentTeam?WORLD-32:FRONT-40;$('deploy-position').min=min;$('deploy-position').max=max;$('deploy-position').value=clamp(s.x,min,max);manualCamera=null;sync();}
  function placeSoldier(x){
    if(state!=='deployment'||paused)return false;
    const min=deploymentTeam?FRONT+40:32,max=deploymentTeam?WORLD-32:FRONT-40;
    if(x<min||x>max){notify('Posicione o soldado na área do seu esquadrão.');return false;}
    if(soldiers.some(s=>s.team===deploymentTeam&&s.index!==selectedSoldier&&s.placed&&Math.abs(s.x-x)<44)){notify('Deixe um espacinho entre os soldados.');return false;}
    const s=soldiers.find(s=>s.team===deploymentTeam&&s.index===selectedSoldier);s.x=Math.round(x);s.y=terrain[Math.floor(s.x)];s.placed=true;$('deploy-position').value=s.x;tone(510,.07,'triangle');
    const next=soldiers.find(s=>s.team===deploymentTeam&&!s.placed);if(next)selectPlacement(next.index);else sync();return true;
  }
  function confirmDeployment(){
    if(state!=='deployment'||paused||soldiers.some(s=>s.team===deploymentTeam&&!s.placed))return;
    if(mode==='local'&&deploymentTeam===0){deploymentTeam=1;team=1;selectPlacement(0);paused=true;$('handoff-title').textContent='Escarlate, prepare seu trio!';$('handoff').showModal();return;}
    state='playing';team=0;beginTurn(false);notify('Todos em posição. Que comece o combate!',3);
  }
  function isHuman(){return mode==='local'||team===0;}
  function canAct(){return state==='playing'&&!paused&&!impactFocus&&!special&&!specialQueue.length&&phase==='aim'&&isHuman()&&current?.hp>0;}
  function beginTurn(pass=true){
    const alive=soldiers.filter(s=>s.team===team&&s.hp>0);if(!alive.length){finish();return;}
    current=alive.find(s=>s.index>=selection[team])||alive[0];selection[team]=(current.index+1)%soldiers.filter(s=>s.team===team).length;
    cancelWalk();aiMove=null;aimMode='sling';actions=2;fuel=100;previous=null;phase='aim';aiTimer=1.1;manualCamera=null;moving=0;held.clear();
    angle=team===0?55:125;power=65;
    if(pass&&mode==='local'){$('handoff-title').textContent=`${team===0?'Vanguarda':'Escarlate'}, sua vez.`;paused=true;$('handoff').showModal();}
    if(!isHuman()&&Math.random()<.55)planAiMove();
    notify(`${current.name} em posição · 2 disparos`);sync();
  }
  function nextTurn(){team=1-team;turnCount++;round=1+Math.floor(turnCount/2);if(team===0)wind=Math.round(rand(-18,18));beginTurn();}
  function sync(){
    const deploying=state==='deployment';$('deployment').hidden=!deploying;$('controls').hidden=deploying;
    if(deploying){
      const trio=soldiers.filter(s=>s.team===deploymentTeam),count=trio.filter(s=>s.placed).length;
      $('deploy-progress').textContent=`${deploymentTeam?'ESCARLATE':'VANGUARDA'} · ${count}/3 EM POSIÇÃO`;
      $('deploy-confirm').disabled=count!==3;
      for(const s of trio){const button=$('deploy-'+s.index);button.textContent=`${s.placed?'✓':'◇'} ${s.name}`;button.className='deploy-card'+(s.index===selectedSoldier?' selected':'');button.setAttribute('aria-pressed',String(s.index===selectedSoldier));}
      $('deploy-choice').textContent=`POSICIONAR ${trio[selectedSoldier].name}`;
    }
    $('angle').value=angle;$('power').value=power;$('angle-value').value=`${Math.round(angle)}°`;$('power-value').value=`${Math.round(power)}%`;
    $('wind-label').textContent=`VENTO ${wind<0?'←':'→'} ${Math.abs(wind)}`;
    [0,1].forEach(t=>{const roster=soldiers.filter(s=>s.team===t);if(roster.length>3){const e=document.createElement('span');e.className='roster-count';e.textContent=`${roster.filter(s=>s.hp>0).length}/${roster.length}`;$('health'+t).replaceChildren(e);}else $('health'+t).replaceChildren(...roster.map(s=>{const e=document.createElement('span');e.className=s.hp<=0?'dead':'';e.style.opacity=s.hp>0?Math.max(.25,s.hp/100):'';e.title=`${s.name}: ${Math.ceil(s.hp)} de vida`;return e;}));});
    $('round-label').textContent=`${mode==='solo'?'FASE '+level+' · ':''}RODADA ${String(round).padStart(2,'0')}`;
    $('turn-label').textContent=deploying?'POSICIONE SEU TRIO':state==='menu'?'PRONTO PARA O COMBATE?':`${team===0?'VANGUARDA':'ESCARLATE'} ${!isHuman()?' / IA':''}`;
    if(current){$('active-name').textContent=`${current.name} · ${Math.ceil(current.hp)} PV`;$('active-team').textContent=`${team===0?'VANGUARDA':'ESCARLATE'}`;const portrait=$('portrait').getContext('2d');portrait.imageSmoothingEnabled=false;portrait.clearRect(0,0,48,54);portrait.drawImage(sprites[team][current.index%3],2,0,44,53);}
    $('action-label').textContent=phase==='flight'?'Projétil em voo…':phase==='settle'?(impactFocus?'Observando o impacto · 3s':'Aguardando impacto…'):aiMove?'Mudando de posição…':`${actions===2?'1º':'2º'} tiro · ${aimMode==='manual'?'mira manual':'estilingue'}`;
    $('fuel').textContent=`${Math.round(fuel)}%`;
    ['fire','angle','power'].forEach(id=>$(id).disabled=!canAct());$('restore').disabled=!canAct()||!previous;
    $('hint').textContent=deploying?'TOQUE NO SEU LADO DO CAMPO PARA POSICIONAR':aimMode==='manual'?'MIRA MANUAL · AJUSTE ÂNGULO/FORÇA E USE DISPARAR':'PUXE SOBRE SEU SOLDADO · SEGURE AO LADO PARA MOVER';
    $('supply-label').title='Disparos até o próximo avião de suprimentos';$('supply-label').textContent=`✈ ${6-shots%6}`;
    $('campaign-phase').textContent=mode==='solo'?`FASE ${String(level).padStart(2,'0')}`:'DUELO LOCAL';
    $('ai-label').textContent=mode==='solo'?`MIRA IA ${aiPrecision()}% · +3% / FASE`:'2 COMANDANTES';
    for(let t=0;t<2;t++){$('score-'+t).textContent=(scoreFor(stats[t])>=100000?new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(scoreFor(stats[t])):scoreFor(stats[t]).toLocaleString('pt-BR'));$('kills-'+t).textContent=`${stats[t].kills} ELIM.`;$('accuracy-'+t).textContent=`${accuracy(stats[t]).toFixed(1).replace('.',',')}% PRECISÃO`;}
    $('best-score').textContent=`RECORDE ${bestScore.toLocaleString('pt-BR')}`;updateWeatherLabel();
    $('restart').textContent=mode==='solo'?'RECOMEÇAR CAMPANHA':'RECOMEÇAR DUELO';
  }
  function launch(s,a,p){
    const speed=230+p*4.3,rad=a*Math.PI/180;
    return{x:s.x+Math.cos(rad)*20,y:s.y-19-Math.sin(rad)*12,vx:Math.cos(rad)*speed,vy:-Math.sin(rad)*speed,time:0};
  }
  function integrate(b,dt){b.prevX=b.x;b.prevY=b.y;b.vx+=wind*dt;b.vy+=GRAVITY*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.time+=dt;}
  function barrierImpact(b){
    const x0=b.prevX??b.x,y0=b.prevY??b.y,dx=b.x-x0,dy=b.y-y0;
    let enter=0,leave=1;
    for(const [origin,delta,min,max] of [[x0,dx,barrier.left-2,barrier.right+2],[y0,dy,barrier.wireTop-2,barrier.bottom]]){
      if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return null;continue;}
      let a=(min-origin)/delta,c=(max-origin)/delta;if(a>c)[a,c]=[c,a];enter=Math.max(enter,a);leave=Math.min(leave,c);if(enter>leave)return null;
    }
    return {x:x0+dx*enter,y:y0+dy*enter};
  }
  function impact(b){
    const wallHit=barrierImpact(b);if(wallHit){b.x=wallHit.x;b.y=wallHit.y;return'wall';}
    if(b.x<0||b.x>=WORLD||b.y>HEIGHT+100||b.time>9)return'out';
    if(b.y>=terrain[Math.floor(b.x)])return'ground';
    if(soldiers.some(s=>s.hp>0&&!(s===current&&b.time<.16)&&Math.abs(s.x-b.x)<10&&b.y>s.y-49&&b.y<s.y+2))return'soldier';
    return null;
  }
  function trajectory(a=angle,p=power,s=current,record=true){
    if(!s)return[];const b=launch(s,a,p),points=[{x:b.x,y:b.y}];
    for(let i=0;i<1080;i++){integrate(b,STEP);if(record&&i%7===0)points.push({x:b.x,y:b.y});if(impact(b)){if(record)points.push({x:b.x,y:b.y});break;}}
    return record?points:b;
  }
  function fire(){
    if(special||specialQueue.length)return;
    if(!canAct()&&!(state==='playing'&&!paused&&!isHuman()&&phase==='aim'))return;
    cancelWalk();aiMove=null;sling=null;projectile=launch(current,angle,power);projectile.owner=team;projectile.hitRecorded=false;stats[team].shots++;stageStats[team].shots++;projectile.boost=current.boost;current.boost=false;current.face=projectile.vx>0?1:-1;
    combatFx.push({type:'muzzle',x:projectile.x,y:projectile.y+20,age:0,life:.2,scale:.7,flip:projectile.vx<0});
    for(let i=0;i<3;i++)particles.push({x:current.x,y:current.y-25,vx:rand(-35,35),vy:rand(-75,-35),life:.5,max:.5,size:2,color:'#d6b66f'});
    path=[{x:projectile.x,y:projectile.y}];previous={angle,power,path:[]};phase='flight';shots++;if(shots%6===0)pendingFlights++;manualCamera=null;moving=0;tone(180,.15,'sawtooth');sync();
  }
  function burst(x,y,radius,boost,shot=projectile){
    const r=boost?radius*1.4:radius;
    combatFx.push({type:'explosion',x,y:y+20,age:0,life:1.15,scale:boost?2.1:1.65});
    for(let x2=Math.max(0,Math.floor(x-r));x2<Math.min(WORLD,x+r);x2++){
      const depth=y+Math.sqrt(Math.max(0,r*r-(x2-x)**2));terrain[x2]=clamp(terrain[x2]+Math.max(0,depth-terrain[x2])*.5*(shot?.damageScale??1),0,HEIGHT-35);
    }
    let enemyHit=false,kills=0;const victims=[];
    for(const s of soldiers){if(s.hp<=0)continue;const d=Math.hypot(s.x-x,s.y-22-y);if(d<r+26){const hit=Math.round((boost?105:82)*(shot?.damageScale??1)*clamp(1-d/(r+26),.12,1));s.hp=Math.max(0,s.hp-hit);victims.push({soldier:s,distance:d});damage+=hit;if(shot&&s.team!==shot.owner){enemyHit=true;if(s.hp===0)kills++;}floats.push({x:s.x,y:s.y-48,text:`−${hit}`,life:1.5,color:s.team?'#ffd1b5':'#e5efa4'});if(s.hp===0){ghosts.push({x:s.x,y:s.y-25,startX:s.x,age:0,life:3.8,team:s.team});tone(850,.45,'sine');}}}
    if(victims.length){victims.sort((a,b)=>a.distance-b.distance);impactFocus={target:victims[0].soldier,remaining:3};manualCamera=null;camera=clamp(impactFocus.target.x-view/2,0,WORLD-view);notify(`IMPACTO EM ${impactFocus.target.name} · observando resultado`,3);}
    if(shot&&[0,1].includes(shot.owner)){if(enemyHit&&!shot.hitRecorded){stats[shot.owner].hits++;stageStats[shot.owner].hits++;shot.hitRecorded=true;}stats[shot.owner].kills+=kills;stageStats[shot.owner].kills+=kills;}
    for(let i=0;i<(reduced?18:55);i++)particles.push({x,y,vx:rand(-170,170),vy:rand(-230,60),life:rand(.25,1),max:1,size:rand(2,9),color:i%3?'#edb66a':'#fff2ba'});
    particles.push({x,y,vx:0,vy:0,life:.32,max:.32,size:r,color:'#ffdf9b',ring:true});
    noiseShot(.12,.6,650);tone(65,.5,'sawtooth',.04);if(navigator.vibrate&&!reduced)navigator.vibrate(25);
  }
  function finish(){
    if(state==='ended')return true;
    const alive=[0,1].map(t=>soldiers.some(s=>s.hp>0&&s.team===t));
    if(alive[0]&&alive[1])return false;
    state='ended';phase='ended';projectile=null;endAge=0;cancelWalk();cancelSling();$('result').classList.remove('stats-visible');
    const winner=alive[0]?0:alive[1]?1:-1;
    canAdvance=mode==='solo'&&winner===0;
    bestScore=Math.max(bestScore,scoreFor(stats[0]));save('best',String(bestScore));
    $('result-title').textContent=winner<0?'Empate no horizonte.':mode==='solo'?(canAdvance?`Fase ${level} concluída!`:`Campanha encerrada · fase ${level}`):`${winner===0?'Vanguarda':'Escarlate'} venceu.`;
    $('result-copy').textContent=canAdvance?`A seguir: ${(level+1)*3} inimigos · IA ${aiPrecision(level+1)}%. Seu trio retorna completo.`:winner<0?'Os dois esquadrões foram eliminados.':`${winner===0?'Vanguarda':'Escarlate'} venceu em ${round} ${round===1?'rodada':'rodadas'}.`;
    const s=stageStats[mode==='local'&&winner===1?1:0],total=stats[mode==='local'&&winner===1?1:0];
    $('result-stats').innerHTML=`<div class="stat-cell"><strong>${total.kills}</strong><span>ELIMINAÇÕES</span></div><div class="stat-cell"><strong>${accuracy(total).toFixed(1)}%</strong><span>PRECISÃO</span></div><div class="stat-cell"><strong>${total.hits}/${total.shots}</strong><span>TIROS CERTOS</span></div><small>NESTA FASE · ${s.kills} eliminações · ${accuracy(s).toFixed(1)}% de precisão</small>`;
    $('next-stage').hidden=!canAdvance;$('next-stage').textContent=`SEGUIR PARA A FASE ${level+1} →`;$('again').textContent=mode==='solo'?'RECOMEÇAR CAMPANHA':'NOVO DUELO';
    $('final-score').textContent=scoreFor(total).toLocaleString('pt-BR');$('result').showModal();syncMusic();tone(winner===0?640:160,.5,'triangle');sync();return true;
  }
  function completeShot(){
    if(impactFocus||special||specialQueue.length)return;
    actions--;if(finish())return;
    if(actions<=0||current.hp<=0){nextTurn();return;}
    aimMode='sling';phase='aim';aiTimer=.9;manualCamera=null;
    notify(isHuman()?'Segundo tiro · puxe para mirar ou ajuste os controles.':'O rival está recalculando a mira.');sync();
  }
  function ai(){
    const targets=soldiers.filter(s=>s.hp>0&&s.team!==team).sort((a,b)=>a.hp-b.hp);
    let best={score:Infinity,a:125,p:65};
    for(const target of targets)for(let a=15;a<=165;a+=3)for(let p=28;p<=100;p+=4){
      const end=trajectory(a,p,current,false);
      const score=Math.hypot(end.x-target.x,end.y-target.y+12)+target.hp*.08;
      const ally=soldiers.some(s=>s.hp>0&&s.team===team&&Math.hypot(end.x-s.x,end.y-s.y)<78);
      if(!ally&&score<best.score)best={score,a,p};
    }
    const error=(100-aiPrecision())*.16;
    angle=clamp(best.a+rand(-error,error),10,170);power=clamp(best.p+rand(-error*.7,error*.7),20,100);fire();
  }
  function movementBlocked(from,to,fromY=current.y){
    if(to<22||to>WORLD-22)return true;
    if(Math.min(from,to)-14<barrier.right&&Math.max(from,to)+14>barrier.left)return true;
    return fromY-terrain[Math.floor(to)]>22||soldiers.some(s=>s!==current&&s.hp>0&&Math.abs(s.x-to)<25);
  }
  function moveCurrent(dir,dt){
    if(!dir||fuel<=0||!current||current.hp<=0)return false;
    const x=clamp(current.x+dir*62*dt,22,WORLD-22);if(x===current.x||movementBlocked(current.x,x))return false;
    current.x=x;current.face=dir;current.walk+=dt*12;fuel=Math.max(0,fuel-dt*29);manualCamera=null;$('fuel').textContent=String(Math.round(fuel))+'%';return true;
  }
  function move(dt){
    if(!canAct())return;
    moveCurrent(moving,dt);
  }
  function planAiMove(){
    if(isHuman()||!current||current.hp<=0||phase!=='aim')return null;
    const choices=[];
    for(const delta of [-100,-64,-24,24,64,100]){
      const goal=current.x+delta,dir=Math.sign(delta);let x=current.x,y=current.y,valid=true;
      for(let d=4;d<=Math.abs(delta);d+=4){const next=current.x+dir*d;if(movementBlocked(x,next,y)){valid=false;break;}x=next;y=terrain[Math.floor(x)];}
      if(!valid)continue;
      const bonus=crates.filter(c=>!c.taken&&c.landed).reduce((best,c)=>Math.max(best,Math.max(0,100-Math.abs(c.x-goal))*.35),0);
      choices.push({goal,score:(current.y-terrain[Math.floor(goal)])*.35+bonus+rand(0,24)});
    }
    choices.sort((a,b)=>b.score-a.score);aiMove=choices.length?{goal:choices[0].goal,remaining:2}:null;return aiMove;
  }
  function updateAiMovement(dt){
    if(!aiMove)return;
    const gap=aiMove.goal-current.x;aiMove.remaining-=dt;
    if(Math.abs(gap)<2||aiMove.remaining<=0||!moveCurrent(Math.sign(gap),Math.min(dt,Math.abs(gap)/62))){aiMove=null;aiTimer=.5;sync();}
  }
  function updateSupplies(dt){
    if(!plane&&pendingFlights>0){
      pendingFlights--;const dir=supplyCount%2?-1:1;plane={kind:supplyCount%2?'helicopter':'plane',x:dir>0?-100:WORLD+100,y:Math.min(280,offsetY+85),dir,prop:0,drops:[{x:rand(300,520),type:supplyCount%2?'power':'health',released:false},{x:rand(680,900),type:supplyCount%2?'health':'power',released:false}]};
      if(Math.random()<.3)plane.drops[Math.random()<.5?0:1].type=Math.random()<.5?'revive':'bombard';
      supplyCount++;notify('✈ APOIO AÉREO · suprimentos a caminho',3);tone(240,.25,'triangle');
    }
    if(plane){
      plane.x+=plane.dir*225*dt;plane.prop+=dt*32;
      for(const drop of plane.drops)if(!drop.released&&(plane.dir>0?plane.x>=drop.x:plane.x<=drop.x)){
        drop.released=true;crates.push({x:plane.x,y:plane.y+16,vy:28,type:drop.type,landed:false,taken:false,sway:rand(0,6)});
      }
      if(plane.x>WORLD+120||plane.x<-120){plane=null;crates=crates.filter(c=>!c.taken).slice(-8);}
    }
    for(const c of crates){if(c.taken)continue;const ground=terrain[Math.floor(clamp(c.x,0,WORLD-1))]-22;
      if(c.y<ground){c.landed=false;c.vy=Math.min(48,c.vy+12*dt);c.y=Math.min(ground,c.y+c.vy*dt);c.x=clamp(c.x+wind*.12*dt,20,WORLD-20);c.sway+=dt*2;}
      if(c.y>=ground){c.y=ground;c.landed=true;c.vy=0;}
    }
  }

  function collectCrate(c,s){
    c.taken=true;
    if(c.type==='revive'||c.type==='bombard'){specialQueue.push({type:c.type,team:s.team});cancelWalk();cancelSling();notify(c.type==='revive'?'★ REFORÇO ALIADO A CAMINHO':'★ BOMBARDEIO SOLICITADO');}
    else if(c.type==='health'){s.hp=Math.min(100,s.hp+30);notify(s.name+' recuperou 30 PV');}
    else{s.boost=true;notify(s.name+': próximo tiro reforçado');}
    tone(700,.2,'triangle');sync();
  }
  function landingX(owner){
    const min=owner?FRONT+55:45,max=owner?WORLD-45:FRONT-55;
    let best=min,gap=-1;
    for(let i=0;i<60;i++){const x=Math.round(rand(min,max)),near=soldiers.filter(s=>s.hp>0&&s.team===owner).reduce((n,s)=>Math.min(n,Math.abs(x-s.x)),Infinity);if(near>gap){best=x;gap=near;}if(near>48)return x;}
    return best;
  }
  function beginSpecial(request){
    const side=request.type==='bombard'?1-request.team:request.team,min=side?FRONT+50:45,max=side?WORLD-45:FRONT-50;
    const dir=side?-1:1,start=dir>0?min-100:max+100;
    special={...request,side,age:0,aircraft:{kind:'plane',x:start,y:offsetY+65,dir,prop:0},min,max,drops:[],bullets:[],paratrooper:null,departed:false};
    if(request.type==='revive')special.drops=[{x:landingX(request.team),released:false}];
    else{special.drops=Array.from({length:5},()=>({x:rand(min,max),released:false})).sort((a,b)=>dir*(a.x-b.x));}
    manualCamera=null;
  }
  function updateSpecial(dt){
    if(!special&&specialQueue.length)beginSpecial(specialQueue.shift());if(!special)return false;
    const a=special,p=a.aircraft;a.age+=dt;p.x+=p.dir*175*dt;p.prop+=dt*32;
    for(const drop of a.drops)if(!drop.released&&(p.dir>0?p.x>=drop.x:p.x<=drop.x)){
      drop.released=true;
      if(a.type==='revive'){
        const old=soldiers.find(s=>s.team===a.team&&s.hp<=0),index=old?.index??soldiers.filter(s=>s.team===a.team).length;
        a.paratrooper={team:a.team,index,name:old?.name??roster[a.team][index%3]+' APOIO',x:Math.round(drop.x),y:p.y+42,hp:100,boost:false,face:a.team?-1:1,walk:0,placed:true,old};
      }else{a.bullets.push({x:drop.x,y:p.y+15,targetY:terrain[Math.floor(drop.x)]-12,owner:a.team,damageScale:.5,hitRecorded:false});stats[a.team].shots++;stageStats[a.team].shots++;noiseShot(.045,.12,1400);}
    }
    for(const b of a.bullets){b.y+=380*dt;const victim=soldiers.find(s=>s.hp>0&&s.team!==a.team&&Math.abs(s.x-b.x)<17&&b.y>=s.y-45);if(!b.done&&(b.y>=b.targetY||victim)){b.done=true;burst(b.x,victim?victim.y-22:b.targetY,60,false,b);}}
    a.bullets=a.bullets.filter(b=>!b.done);
    if(a.paratrooper&&!a.paratrooper.landed){const s=a.paratrooper;s.y=Math.min(terrain[Math.floor(s.x)],s.y+65*dt);if(s.y>=terrain[Math.floor(s.x)]){s.landed=true;if(s.old){Object.assign(s.old,{x:s.x,y:s.y,hp:100,placed:true,boost:false});}else{const {old,...ally}=s;soldiers.push(ally);}notify(s.name+' pousou · aliado em campo');sync();}}
    a.departed=p.dir>0?p.x>a.max+130:p.x<a.min-130;
    if(a.departed&&a.drops.every(d=>d.released)&&!a.bullets.length&&(!a.paratrooper||a.paratrooper.landed)&&!impactFocus){special=null;manualCamera=null;sync();if(!specialQueue.length&&!finish()&&current?.hp<=0&&phase==='aim')nextTurn();}
    return true;
  }
  function specialCamera(){if(!special)return null;const a=special;return a.paratrooper&&!a.paratrooper.landed?a.paratrooper.x:a.bullets[0]?.x??a.aircraft.x;}
  function drawSpecial(){
    if(!special)return;const a=special,p=a.aircraft;drawAirVehicle('plane',p.prop,p.x-camera,p.y,1.05,p.dir<0);
    for(const b of a.bullets){rect(b.x-camera-3,b.y-15,6,20,'#f86521');rect(b.x-camera-1,b.y-8,2,13,'#fff2ad');}
    const s=a.paratrooper;if(s&&!s.landed){const x=s.x-camera,y=s.y;ctx.strokeStyle='#e2dfbd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-27,y-89);ctx.lineTo(x,y-45);ctx.lineTo(x+27,y-89);ctx.stroke();poly([[x-32,y-87],[x-22,y-107],[x,y-115],[x+22,y-107],[x+32,y-87]],'#d3c685');rect(x-28,y-90,56,4,'#6c7545');drawSoldier(s);}
  }

  function update(dt){
    if(paused)return;
    if(state==='ended'){endAge+=dt;if(endAge>=3)$('result').classList.add('stats-visible');return;}
    for(const fx of combatFx)fx.age+=dt;combatFx=combatFx.filter(fx=>fx.age<fx.life);
    if(impactFocus){impactFocus.remaining-=dt;if(impactFocus.remaining<=0)impactFocus=null;}
    if(state==='playing'||state==='deployment')updateAmbient(dt);
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(!p.ring)p.vy+=220*dt;}
    floats=floats.filter(f=>f.life>0);for(const f of floats){f.life-=dt;f.y-=22*dt;}
    ghosts=ghosts.filter(g=>g.life>0);for(const g of ghosts){g.age+=dt;g.life-=dt;g.y-=(reduced?24:43)*dt;g.x=g.startX+Math.sin(g.age*3.4)*9;}
    if(state!=='playing')return;elapsed+=dt;updateWeatherLabel();
    if(updateSpecial(dt))return;
    move(dt);updateSupplies(dt);
    for(const s of soldiers){if(s.hp<=0)continue;s.y=Math.min(terrain[Math.floor(s.x)],s.y+140*dt);for(const c of crates){if(!c.taken&&c.landed&&Math.abs(s.x-c.x)<24&&Math.abs(s.y-c.y-22)<28){collectCrate(c,s);}}}
    if(phase==='flight'&&projectile){
      integrate(projectile,dt);const hit=impact(projectile);path.push({x:projectile.x,y:projectile.y});
      if(hit){const b=projectile;previous.path=path.slice();if(hit==='wall')notify('Muro central · lance por cima.');if(hit!=='out')burst(b.x,b.y,60,b.boost);else notify('Fora do campo. Corrija a força e o ângulo.');projectile=null;phase='settle';wait=impactFocus?3:.85;sync();}
    }else if(phase==='settle'){wait-=dt;if(wait<=0)completeShot();}
    else if(!isHuman()&&phase==='aim'){if(aiMove)updateAiMovement(dt);else{aiTimer-=dt;if(aiTimer<=0)ai();}}
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
  function ambientBlast(x,y,type='explosion',scale=1){noiseShot(type==='nuclear'?.025:.012,type==='nuclear'?1.8:.35,250);tone(type==='nuclear'?38:55,.25,'triangle',.005);ambient.blasts.push({x,y,type,scale,age:0,life:type==='nuclear'?10:2.8});if(ambient.blasts.length>10)ambient.blasts.shift();}
  function updateAmbient(dt){
    ambient.time+=dt;ambient.blastClock-=dt;ambient.planeClock-=dt;ambient.gunClock-=dt;ambient.nuclearClock-=dt;ambient.tracerClock-=dt;
    if(ambient.blastClock<=0){ambientBlast(camera*.28+rand(65,Math.max(66,view-65)),rand(268,292),'explosion',rand(.65,1.05));ambient.blastClock=rand(2.5,5.5);if(!reduced)tone(55,.2,'triangle',.008);}
    if(ambient.planeClock<=0){const dir=Math.random()<.5?1:-1;ambient.aircraft.push({kind:Math.random()<.5?'helicopter':'plane',x:camera*.28+(dir>0?-75:view+75),y:Math.min(240,offsetY+rand(48,102)),vx:dir*rand(50,80),life:25,smoking:false});ambient.planeClock=rand(11,19);if(ambient.aircraft.length>3)ambient.aircraft.shift();}
    if(ambient.gunClock<=0){const aircraft=ambient.aircraft.find(p=>p.life>0),sx=camera*.28+rand(80,Math.max(81,view-80)),sy=290;
      noiseShot(.014,.13,1000);ambient.shells.push({sx,sy,ex:aircraft?aircraft.x+aircraft.vx*1.1+rand(-35,35):sx+rand(-160,160),ey:aircraft?aircraft.y+rand(-22,22):offsetY+rand(45,110),age:0,duration:rand(.9,1.5),arc:rand(18,42)});ambient.gunClock=rand(1.2,2.7);}
    if(ambient.nuclearClock<=0){ambientBlast(camera*.28+rand(view*.25,view*.8),288,'nuclear',1.55);ambient.nuclearClock=rand(55,90);}
    if(ambient.tracerClock<=0){
      const x=camera*.28+rand(30,Math.max(31,view-30)),dx=rand(-120,120),top=offsetY+rand(20,95);
      for(let i=0;i<(reduced?3:7);i++)ambient.tracers.push({x,y:300,vx:dx,vy:-(300-top)/.85,age:-i*.065,life:.95,color:Math.random()<.5?'#ffda58':'#82ffb0'});
      ambient.tracerClock=rand(1.7,3.2);
    }
    for(const t of ambient.tracers){const before=t.age;t.age+=dt;if(before<=0&&t.age>=0)noiseShot(.012,.065,1800);if(t.age>=0){t.x+=t.vx*dt;t.y+=t.vy*dt;}}
    ambient.tracers=ambient.tracers.filter(t=>t.age<t.life).slice(-42);
    for(const p of ambient.aircraft){p.x+=p.vx*dt;p.life-=dt;}
    ambient.aircraft=ambient.aircraft.filter(p=>p.life>0);
    for(const s of ambient.shells){s.age+=dt;if(s.age>=s.duration&&!s.done){s.done=true;ambientBlast(s.ex,s.ey,'explosion',.45);const p=ambient.aircraft.find(p=>Math.hypot(p.x-s.ex,p.y-s.ey)<35);if(p)p.smoking=true;}}
    ambient.shells=ambient.shells.filter(s=>!s.done);
    for(const b of ambient.blasts)b.age+=dt;ambient.blasts=ambient.blasts.filter(b=>b.age<b.life);
  }
  function assetFrame(type,index,x,y,scale=1,flip=false){const frames=warAssets.frames[type],f=frames[Math.min(frames.length-1,Math.max(0,index))];ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(warAssets.atlas,f.x,f.y,f.w,f.h,-32*scale,-64*scale,64*scale,64*scale);ctx.restore();}
  function backdropGlow(night=nightAmount()){return reduced?.1+.12*night:.16+.44*night;}
  function drawDistantBattle(){
    const night=nightAmount(),parallax=camera*.28;
    for(const b of ambient.blasts){const x=b.x-parallax,scale=b.scale,frame=Math.min(7,Math.floor(b.age/(b.type==='nuclear'?.55:.15))),fade=Math.min(1,b.age*5,(b.life-b.age)/1.5);
      ctx.save();const radius=(b.type==='nuclear'?80:40)*scale;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=backdropGlow(night)*fade*(b.type==='nuclear'?1:.75);
      rect(x-radius,b.y-radius*1.4,radius*2,radius*1.3,'#f0a368');rect(x-radius*.7,b.y-radius*1.7,radius*1.4,radius*1.9,'#edb981');rect(x-radius*.4,b.y-radius*1.9,radius*.8,radius*2,'#ffdaa0');ctx.restore();
      ctx.save();ctx.globalAlpha=fade*(.82+.18*night);assetFrame(b.type,frame,x,b.y,scale);ctx.restore();
    }
    for(const p of ambient.aircraft){if(p.smoking){ctx.save();ctx.globalAlpha=.65;assetFrame('smoke',Math.floor(ambient.time*4)%4,p.x-parallax-Math.sign(p.vx)*23,p.y+12,.45);ctx.restore();}drawAirVehicle(p.kind,ambient.time*20,p.x-parallax,p.y,.55,p.vx<0);}
    for(const s of ambient.shells){const t=clamp(s.age/s.duration,0,1),x=lerp(s.sx,s.ex,t)-parallax,y=lerp(s.sy,s.ey,t)-Math.sin(t*Math.PI)*s.arc;ctx.save();ctx.globalAlpha=.7+night*.3;rect(x-2,y-7,2,7,'#fff3ba');rect(x-1,y,2,3,'#ffa46a');ctx.restore();}
    for(const t of ambient.tracers){if(t.age<0)continue;ctx.save();ctx.globalAlpha=Math.min(1,(t.life-t.age)*5)*(.65+night*.35);const x=t.x-parallax;for(let j=0;j<5;j++)rect(x-t.vx*j*.009,t.y-t.vy*j*.009,2,j?3:5,j?t.color:'#fffad5');ctx.restore();}
    for(const x of [view*.18,view*.72])assetFrame('battery',0,x,terrain[Math.floor(clamp(x+camera,0,WORLD-1))]+3,.55);
  }
  function updateWeatherLabel(){const text=`${environment().name} · ${raining?'CHUVA':'CÉU ABERTO'}`;if($('weather-label').textContent!==text)$('weather-label').textContent=text;}
  function background(){
    const env=environment(),night=nightAmount(env),colors=[['#8c9e84','#d9c99b'],theme.sky,['#836b62','#d79c6e'],['#142b35','#53665d']],sky=ctx.createLinearGradient(0,offsetY,0,HEIGHT);
    sky.addColorStop(0,mixColor(colors[env.index][0],colors[env.next][0],env.blend));sky.addColorStop(1,mixColor(colors[env.index][1],colors[env.next][1],env.blend));ctx.fillStyle=sky;ctx.fillRect(0,offsetY,view,canvas.height);
    const image=arcade[sceneryKey]||arcade.scene;
    if(image){
      const width=900,height=width*image.height/image.width,offset=camera*.22+biome*217,first=Math.floor(offset/width);
      ctx.save();ctx.filter=sceneryKey==='scene'&&biome===2?'saturate(.65)':'none';
      for(let i=first-1;i<=first+Math.ceil(view/width)+1;i++){const x=i*width-offset;ctx.save();if(Math.abs(i)%2){ctx.translate(x+width,0);ctx.scale(-1,1);ctx.drawImage(image,0,-40,width,height);}else ctx.drawImage(image,x,-40,width,height);ctx.restore();}
      ctx.filter='none';ctx.fillStyle=['#ac874729','#00000000','#547b8129','#d79a4b22'][env.index];ctx.fillRect(0,offsetY,view,canvas.height);
      if(night>0){ctx.globalAlpha=night*.62;rect(0,offsetY,view,canvas.height,'#081e30');ctx.globalAlpha=1;}ctx.restore();
    }else{
      for(let layer=0;layer<3;layer++){const pts=[[0,HEIGHT]],base=210+layer*45;for(let x=-20;x<=view+20;x+=8){const wx=x+camera*(.1+layer*.1);pts.push([x,base+Math.sin(wx/90+layer)*35+Math.cos(wx/27)*8]);}pts.push([view,HEIGHT]);poly(pts,mixColor(['#759282','#536e52','#344d36'][layer],'#142b35',night*.7));}
    }
    if(night>.3){ctx.save();ctx.globalAlpha=night;for(let i=0;i<30;i++)rect((i*97+seed%71)%view,offsetY+15+(i*43)%100,1+i%2,1,'#e6dcaa');ctx.restore();}
    drawDistantBattle();
    // Hardware on the distant defensive line; illustrated ruins supply the architecture.
    for(let i=0;i<Math.ceil(WORLD/300)+2;i++){const x=i*300+seed%140-camera*.38;if(x<-100||x>view+100)continue;if(i%2)assetFrame('tank',0,x,terrain[Math.floor(clamp(x+camera,0,WORLD-1))]+4,.65,i%3===0);}
  }
  function drawBackgroundFog(){
    const night=nightAmount(),amount=lerp(.25,.065,night),fog=ctx.createLinearGradient(0,offsetY,0,HEIGHT);
    fog.addColorStop(0,'rgba(236,242,228,'+amount*.4+')');fog.addColorStop(.55,'rgba(236,242,228,'+amount+')');fog.addColorStop(1,'rgba(236,242,228,'+amount*1.15+')');ctx.save();ctx.fillStyle=fog;ctx.fillRect(0,offsetY,view,canvas.height);ctx.restore();
  }
  function drawWeather(){
    const night=nightAmount();if(night>0){ctx.globalAlpha=night*.3;rect(0,offsetY,view,canvas.height,'#102450');ctx.globalAlpha=1;const x=585-camera,y=terrain[585];rect(x-12,y-14,23,4,'#ffe8a2');}
    if(!raining)return;
    const time=reduced?0:elapsed;ctx.strokeStyle=night>.5?'#bed8ec9c':'#e0f6ffb5';ctx.lineWidth=1;
    for(let i=0;i<(reduced?25:100);i++){const x=((i*137-time*(35-wind))%view+view)%view,y=offsetY+(i*67+time*280)%canvas.height;ctx.beginPath();ctx.moveTo(Math.round(x),Math.round(y));ctx.lineTo(Math.round(x-3),Math.round(y+9));ctx.stroke();}
    for(let i=0;i<14;i++){const x=(i*89+seed%71)%WORLD;if(x<camera||x>camera+view)continue;const y=terrain[x];if((i+Math.floor(time*5))%3===0){rect(x-camera-2,y-1,5,1,'#c1e6efb0');rect(x-camera,y-4,1,2,'#c1e6efb0');}}
  }
  function drawBarrier(){
    const x=FRONT-camera,l=barrier.left-camera,r=barrier.right-camera,top=barrier.top;
    if(r<-35||l>view+35)return;
    rect(l-2,top-2,36,HEIGHT-top+4,'#202a25');rect(l,top,32,HEIGHT-top,'#5d6357');
    for(let y=top+4,row=0;y<HEIGHT;y+=11,row++){
      for(let j=0;j<3;j++){const xx=l-8+j*17+(row%2)*8,left=Math.max(l,xx),right=Math.min(r,xx+15);if(right<=left)continue;
        rect(left,y,right-left,9,'#7b7d69');rect(left,y,right-left,2,'#b4ad8a');rect(left,y+7,right-left,2,'#454e42');if(j%2===row%2)rect(left+2,y+3,Math.max(1,right-left-5),1,'#92917a');
      }
      rect(l,y,2,10,'#a19b7d');rect(r-3,y,3,10,'#3b473b');
    }
    rect(l-4,top-4,40,6,'#373f35');rect(l-3,top-4,38,2,'#c2b68c');
    rect(l+3,top+17,26,13,'#27372c');for(let i=0;i<5;i++){rect(l+4+i*5,top+18,3,5,'#d7b963');rect(l+2+i*5,top+23,3,5,'#d7b963');}
    for(const px of [l-3,r+1]){rect(px,barrier.wireTop-2,2,24,'#303f35');rect(px,barrier.wireTop-2,1,24,'#aeb59b');rect(px-2,barrier.wireTop-3,6,2,'#b3b394');}
    // Pixel coils and crossed barbs; their height matches the physical collision cap.
    const wireY=barrier.wireTop+7;rect(l-8,wireY,48,1,'#c3c4aa');rect(l-8,wireY+7,48,1,'#657560');
    for(let px=l-7;px<r+7;px+=9){rect(px,wireY-5,5,1,'#cbd0b9');rect(px-2,wireY-3,1,7,'#a3b39a');rect(px+5,wireY-3,1,7,'#cbd0b9');rect(px,wireY+4,5,1,'#7c9077');rect(px+1,wireY-2,1,6,'#314936');rect(px-1,wireY,5,1,'#e0dbc1');rect(px,wireY-2,1,5,'#e0dbc1');}
  }
  function drawTerrain(){
    const start=Math.max(0,Math.floor(camera)),end=Math.min(WORLD,Math.ceil(camera+view)),tile=arcade.tiles[biome];
    for(let x=start;x<end;x+=2){const y=terrain[x],sx=x-camera;
      for(let yy=Math.floor(y);yy<HEIGHT;){const ty=((yy%96)+96)%96,h=Math.min(96-ty,HEIGHT-yy);ctx.drawImage(tile,x%96,ty,2,h,Math.round(sx),yy,2,h);yy+=h;}
      const n=Math.sin(x*2.31+seed)*2;rect(sx,y,2,3,biome===3?'#c4b27a':'#b4bb72');rect(sx,y+3,2,5,biome===3?'#89794f':'#667a42');rect(sx,y+8,2,4,'#303c28');
      if(x%6===0){rect(sx,y-2+n,2,4,biome===3?'#d3b36b':'#c0ca7d');rect(sx+1,y+12,1,7,'#b9a776');}
    }
    // Exposed roots, loose stones, grass blades and small foliage clusters.
    for(let i=0;i<140;i++){const x=(i*83+seed%83)%WORLD;if(x<camera-10||x>camera+view+10)continue;const sx=x-camera,y=terrain[x];
      if(i%3===0){rect(sx-4,y-3,11,4,'#343d2b');rect(sx-3,y-5,8,3,'#8b8b58');rect(sx-1,y-5,4,1,'#c9bd83');}
      else{rect(sx,y-5-i%5,1,8,'#a3b75c');rect(sx-3,y-4,3,1,'#849c43');rect(sx+1,y-6,4,2,'#bec873');rect(sx+1,y+3,1,9,'#92804a');}
    }
    const x=585-camera,y=terrain[585];ctx.drawImage(arcade.props[2],x-35,y-70,75,75);
  }
  function drawSoldier(s){
    if(!s.placed&&state==='deployment')return;
    if(s.hp<=0){rect(s.x-camera-7,terrain[Math.floor(s.x)]-4,14,4,'#243633');return;}
    const x=s.x-camera,y=s.y,unit=view/canvas.getBoundingClientRect().width;if(x<-40||x>view+40)return;
    ctx.save();ctx.globalAlpha=.25;rect(x-15,y-2,30,5,'#0c2023');ctx.restore();
    const active=s===current&&state==='playing',bounce=(moving||aiMove)&&active?Math.sin(s.walk)*2:(!reduced&&active?Math.sin(elapsed*3)*.45:0),recoil=active&&combatFx.some(f=>f.type==='muzzle')?s.face*2:0;
    ctx.save();ctx.translate(Math.round(x-recoil),Math.round(y+bounce));if(s.face<0)ctx.scale(-1,1);for(const [dx,dy] of [[-unit,0],[unit,0],[0,-unit],[0,unit]])ctx.drawImage(arcade.outlines[s.team][s.index%3],-24+dx,-54+dy,48,56);ctx.drawImage(sprites[s.team][s.index%3],-24,-54,48,56);ctx.restore();
    rect(x-14,y-61,28,4,'#263654');rect(x-13,y-60,26*s.hp/100,2,s.team?'#ff8597':'#baf966');
    const nameWidth=Math.max(44,s.name.length*6.5+10)*unit;rect(x-nameWidth/2,y-71-11*unit,nameWidth,14*unit,'#18291feb');ctx.font='bold '+Math.round(11*unit)+'px Arial, sans-serif';ctx.textAlign='center';ctx.fillStyle=active?'#ffe8a5':'#eee7c7';ctx.fillText(s.name,Math.round(x),Math.round(y-71));
    if(active||(state==='deployment'&&s.team===deploymentTeam&&s.index===selectedSoldier)){poly([[x-4*unit,y-71-20*unit],[x+4*unit,y-71-20*unit],[x,y-71-15*unit]],s.team?'#ff92ab':'#eeff8b');ctx.strokeStyle=s.team?'#ff92ab':'#e6ff87';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y+2,17,4,0,0,Math.PI*2);ctx.stroke();}
    if(s.boost){ctx.fillStyle='#ffdb65';ctx.fillText('◆',x+19,y-30);}
  }
  function drawGhost(g){
    const x=g.x-camera,y=g.y;ctx.save();ctx.globalAlpha=Math.min(1,g.age*4,g.life/1.2);
    for(let yy=-15;yy<12;yy++){const w=yy<-5?Math.sqrt(Math.max(0,100-(yy+5)**2)):10+Math.sin(yy*.5+g.age*4)*2;rect(x-w,y+yy,w*2,1,'#abc7bb');rect(x-w+2,y+yy,w*2-4,1,'#e3ead4');if(yy<4)rect(x-w+3,y+yy,4,1,'#fff4ca');}
    for(let i=0;i<4;i++)rect(x-10+i*6,y+9+Math.sin(g.age*4+i)*2,4,5,'#d9e3ce');
    rect(x-5,y-6,3,5,'#394b43');rect(x+3,y-6,3,5,'#394b43');rect(x-4,y-6,1,2,'#ffffff');rect(x+4,y-6,1,2,'#ffffff');rect(x-1,y+2,3,2,'#8eaa9a');
    rect(x-8,y-20,16,1,'#edcb73');rect(x-10,y-19,3,2,'#c5a658');rect(x+7,y-19,3,2,'#c5a658');rect(x-7,y-17,14,1,'#fff0a7');
    if(!reduced)for(let i=0;i<3;i++)rect(x+Math.sin(g.age*3+i)*17,y+18+i*9,1,2,'#e6e0a4');ctx.restore();
  }
  function drawAirVehicle(kind,frame,x,y,scale=1,flip=false){
    const model=arcade.aircraft?.[kind==='helicopter'?1:0];
    if(!model){assetFrame('plane',Math.floor(frame)%3,x,y+30,scale*1.6,flip);return;}
    ctx.save();ctx.translate(Math.round(x),Math.round(y+(kind==='helicopter'?Math.sin(frame*.2)*1.5:0)));ctx.scale(flip?-scale:scale,scale);ctx.drawImage(model,-64,-40,128,80);
    if(kind==='helicopter'){const length=18+Math.abs(Math.sin(frame))*45;rect(9-length,-34,length*2,1,'#2d3834');rect(13-length,-35,length*2-8,1,'#d4d7c2');rect(4,-34,10,3,'#647367');rect(-52,-12+Math.sin(frame)*7,2,12,'#c5cbb4');}
    else{rect(59,-12,1,24,'#c0c9b5');rect(58,Math.sin(frame)*10-3,3,6,'#eef1d7');}ctx.restore();
  }
  function drawPlane(){
    if(!plane)return;const x=plane.x-camera;rect(x-plane.dir*60,plane.y,30,1,'#c6c9ad66');drawAirVehicle(plane.kind,plane.prop,x,plane.y,1.05,plane.dir<0);
  }
  function drawCrate(c){
    if(c.taken)return;const x=c.x-camera,y=c.y;
    if(!c.landed){const sway=Math.sin(c.sway)*4;
      ctx.strokeStyle='#d5c49a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-22+sway,y-33);ctx.lineTo(x-6,y);ctx.moveTo(x+22+sway,y-33);ctx.lineTo(x+6,y);ctx.moveTo(x+sway,y-48);ctx.lineTo(x,y);ctx.stroke();
      poly([[x-26+sway,y-32],[x-22+sway,y-44],[x-12+sway,y-52],[x+12+sway,y-52],[x+22+sway,y-44],[x+26+sway,y-32]],'#353e2d');
      poly([[x-24+sway,y-34],[x-20+sway,y-44],[x-10+sway,y-50],[x+10+sway,y-50],[x+20+sway,y-44],[x+24+sway,y-34]],'#a29d68');
      for(let i=-2;i<=2;i++)rect(x+i*8+sway,y-45+Math.abs(i)*2,2,11,'#d4c796');rect(x-22+sway,y-34,44,2,'#4d5736');
    }
    assetFrame('crate',c.type==='health'?0:1,x,y+24,1);
    if(c.type==='revive'||c.type==='bombard'){rect(x-13,y-4,26,25,c.type==='revive'?'#2b8769':'#8c3d2f');ctx.fillStyle='#fff0ae';ctx.font='bold 21px Arial';ctx.textAlign='center';ctx.fillText(c.type==='revive'?'+':'★',x,y+16);}
  }
  function aimPreview(){
    if(!canAct())return{kind:'none',points:[]};
    const unit=view/canvas.getBoundingClientRect().width,rad=angle*Math.PI/180,strength=clamp((power-20)/80,0,1);
    return{kind:'direction',points:Array.from({length:3},(_,i)=>{const distance=26+(i+1)*lerp(12,22,strength)*unit;return{x:current.x+Math.cos(rad)*distance,y:current.y-19-Math.sin(rad)*distance-strength*10*unit*(i+1)/3};})};
  }
  function drawAimIndicator(points){const unit=view/canvas.getBoundingClientRect().width;for(const p of points){rect(p.x-camera-4*unit,p.y-4*unit,8*unit,8*unit,'#172b40');rect(p.x-camera-2.5*unit,p.y-2.5*unit,5*unit,5*unit,'#fff4ad');}const end=points[points.length-1];if(end){const x=end.x-camera,y=end.y;rect(x-9*unit,y-1.5*unit,18*unit,3*unit,'#fff3a8');rect(x-1.5*unit,y-9*unit,3*unit,18*unit,'#fff3a8');rect(x-unit,y-unit,2*unit,2*unit,'#293d4e');}}
  function drawFireProjectile(){
    const unit=view/canvas.getBoundingClientRect().width,trail=path.slice(-14);
    for(let i=0;i<trail.length;i+=2){const p=trail[i],fade=(i+1)/trail.length;ctx.save();ctx.globalAlpha=fade*.7;rect(p.x-camera-3*unit,p.y-2*unit,6*unit,4*unit,'#f56722');rect(p.x-camera-unit,p.y-unit,2*unit,2*unit,'#ffd66f');ctx.restore();}
    ctx.save();ctx.translate(projectile.x-camera,projectile.y);ctx.rotate(Math.atan2(projectile.vy,projectile.vx));ctx.scale(unit,unit);
    rect(-15,-8,26,16,'#ff6a222b');poly([[-26,-2],[-18,-5],[-21,-8],[-9,-5],[-3,-7],[7,-4],[11,0],[7,4],[-3,7],[-12,4],[-22,7],[-18,2]],'#ec641e');
    poly([[-18,-1],[-12,-4],[-5,-3],[5,-4],[9,0],[5,4],[-7,3],[-16,4],[-12,1]],'#ffba3e');rect(-5,-2,12,4,'#fff1a2');rect(1,-1,7,2,'#fffde4');ctx.restore();
  }
  function drawPath(points,color,dotted=true){ctx.fillStyle=color;for(let i=0;i<points.length;i+=dotted?2:1){const p=points[i];if(p.y<0)continue;rect(p.x-camera-1,p.y-1,2,2,color);}}
  function drawDeployment(){
    const min=deploymentTeam?640:32,max=deploymentTeam?1168:560,color=deploymentTeam?'#ffc0cb':'#e8ffab';
    ctx.save();ctx.globalAlpha=.12;rect(min-camera,offsetY,max-min,HEIGHT-offsetY,color);ctx.restore();
    for(let x=min;x<=max;x+=12)rect(x-camera,terrain[Math.floor(x)]-3,7,2,color);
    for(const x of [min,max]){const y=terrain[Math.floor(x)];rect(x-camera,y-28,2,28,'#fff4c4');rect(x-camera+2,y-28,13,9,deploymentTeam?'#ee7189':'#9ed879');}
    ctx.font='bold '+Math.round(13*view/canvas.getBoundingClientRect().width)+'px Arial';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText('ESCOLHA UM LUGAR PARA SEU TRIO',clamp((min+max)/2-camera,130,view-130),offsetY+72);
  }
  function minimap(){
    const width=Math.min(250,view*.5),x=(view-width)/2,y=offsetY+canvas.height-30;
    rect(x-8,y-9,width+16,29,'#202d25e6');rect(x-7,y-8,width+14,1,'#a4a079');rect(x-6,y-6,width+12,23,'#0d2b20');
    for(let i=0;i<width;i+=12)rect(x+i,y-6,1,23,'#39613c88');for(let j=0;j<23;j+=6)rect(x-6,y-6+j,width+12,1,'#39613c88');
    for(let i=0;i<width;i+=2){const h=(HEIGHT-terrain[Math.floor(i/width*(WORLD-1))])*.065;rect(x+i,y+10-h,2,h,'#62894d');}
    soldiers.filter(s=>s.hp>0&&s.placed).forEach(s=>rect(x+s.x/WORLD*width-2,y+2,3,3,s.team?'#ffb66a':'#def8a0'));
    ctx.strokeStyle='#d8d2a3';ctx.strokeRect(Math.round(x+camera/WORLD*width),y-6,Math.round(view/WORLD*width),22);rect(x-5,y-5,1,1,'#f2dea0');rect(x+width+3,y+14,1,1,'#f2dea0');
  }
  function draw(){
    ctx.setTransform(1,0,0,1,0,-offsetY);
    const target=specialCamera()??impactFocus?.target.x??manualCamera??(state==='deployment'?(soldiers.find(s=>s.team===deploymentTeam&&s.index===selectedSoldier)?.x??300):projectile?projectile.x:current?.x??600);
    const desired=clamp(target-view/2,0,WORLD-view);camera=paused||sling?camera:lerp(camera,desired,reduced?1:.075);camera=clamp(camera,0,WORLD-view);
    const victim=special?.paratrooper&&!special.paratrooper.landed?special.paratrooper:impactFocus?.target,focusY=victim?(victim.hp>0?victim.y:terrain[Math.floor(victim.x)]):Math.max(projectile?.y??0,current?.y??0),baseY=Math.min(170,Math.max(0,HEIGHT-canvas.height)),targetY=clamp(Math.max(baseY,focusY-canvas.height+60),baseY,Math.max(baseY,HEIGHT-canvas.height));
    if(!paused&&!sling)offsetY=lerp(offsetY,targetY,reduced?1:.1);
    background();drawBackgroundFog();drawBarrier();drawTerrain();
    if(state==='deployment')drawDeployment();
    const preview=aimPreview();
    if(preview.kind!=='none'){
      drawAimIndicator(preview.points);
    }
    drawPlane();crates.forEach(drawCrate);
    soldiers.forEach(drawSoldier);drawSpecial();
    for(const fx of combatFx){const frames=warAssets.frames[fx.type].length;ctx.save();ctx.globalAlpha=Math.min(1,(fx.life-fx.age)*8);assetFrame(fx.type,Math.min(frames-1,Math.floor(fx.age/fx.life*frames)),fx.x-camera,fx.y,fx.scale,fx.flip);ctx.restore();}
    if(projectile){drawFireProjectile();if(projectile.y<offsetY+10){ctx.fillStyle='#e7efbc';ctx.font='bold '+Math.round(14*view/canvas.getBoundingClientRect().width)+'px Arial';ctx.textAlign='center';ctx.fillText('↑ PROJÉTIL',clamp(projectile.x-camera,60,view-60),offsetY+60);}}
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);if(p.ring){ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x-camera,p.y,p.size*(1-p.life/p.max)+4,0,Math.PI*2);ctx.stroke();}else rect(p.x-camera,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
    drawWeather();drawSling();ghosts.forEach(drawGhost);
    for(const f of floats){ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.fillText(f.text,f.x-camera,f.y);}ctx.globalAlpha=1;
    if(view<WORLD-20){
      for(const side of [-1,1]){const rivals=soldiers.filter(s=>s.hp>0&&(side<0?s.x<camera:s.x>camera+view));if(rivals.length){const x=side<0?18:view-18;ctx.fillStyle=rivals[0].team?'#f3b18d':'#d9ee8b';ctx.font='bold 12px monospace';ctx.textAlign=side<0?'left':'right';ctx.fillText(`${side<0?'◀':'▶'} ${rivals.length}`,x,270);}}
    }
    minimap();
  }
  function frame(time){updateAmbience();const dt=Math.min(.1,(time-(last||time))/1000);last=time;accumulator+=dt;while(accumulator>=STEP){update(STEP);accumulator-=STEP;}draw();requestAnimationFrame(frame);}
  function slingshotAim(dx,dy){const distance=Math.hypot(dx,dy);return{angle:clamp(Math.atan2(Math.max(1,dy),dx)*180/Math.PI,10,170),power:clamp((distance-12)/110*100,20,100),valid:distance>=18&&dy>=6};}
  function cancelSling(){if(!sling)return;angle=sling.oldAngle;power=sling.oldPower;sling=null;sync();}
  function setAimMode(mode){cancelSling();aimMode=mode;sync();}
  function moveSling(e){if(!sling||aimMode!=='sling'||sling.id!==e.pointerId||!canAct())return;const aim=slingshotAim(sling.x-e.clientX,e.clientY-sling.y);sling.tipX=e.clientX;sling.tipY=e.clientY;sling.valid=aim.valid;if(aim.valid){angle=aim.angle;power=aim.power;}sync();}
  function endSling(e,cancel=false){if(!sling||sling.id!==e.pointerId)return;if(cancel){cancelSling();return;}moveSling(e);const saved=sling,valid=sling.valid;sling=null;if(valid&&canAct())fire();else{angle=saved.oldAngle;power=saved.oldPower;sync();notify('Puxe para trás e para baixo; solte para disparar.');}}
  function drawSling(){
    if(!sling)return;const r=canvas.getBoundingClientRect(),sx=view/r.width,sy=canvas.height/r.height;
    const x=(sling.x-r.left)*sx,y=(sling.y-r.top)*sy+offsetY,tx=(sling.tipX-r.left)*sx,ty=(sling.tipY-r.top)*sy+offsetY;
    const unit=sx;ctx.strokeStyle=sling.valid?'#ffdc8b':'#bacac8';ctx.lineWidth=4*unit;ctx.beginPath();ctx.moveTo(x-6*unit,y);ctx.lineTo(tx,ty);ctx.lineTo(x+6*unit,y);ctx.stroke();rect(x-9*unit,y-4*unit,5*unit,10*unit,'#986b47');rect(x+4*unit,y-4*unit,5*unit,10*unit,'#986b47');rect(tx-6*unit,ty-6*unit,12*unit,12*unit,'#172b40');rect(tx-4*unit,ty-4*unit,8*unit,8*unit,'#fff2b4');
    const label=sling.valid?`${Math.round(power)}% · ${Math.round(angle)}° · SOLTE!`:'PUXE PARA BAIXO E PARA TRÁS';ctx.font=`bold ${Math.round(14*unit)}px monospace`;ctx.textAlign='center';const textX=clamp(tx,view*.25,view*.75),textY=clamp(ty-22*unit,offsetY+80,offsetY+canvas.height-60);ctx.fillStyle='#182a40';ctx.fillText(label,textX+unit,textY+unit);ctx.fillStyle='#fff0bf';ctx.fillText(label,textX,textY);
  }
  function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*view+camera,y:(e.clientY-r.top)/r.height*canvas.height+offsetY,unit:view/r.width};}
  function onActiveSoldier(p){const padding=Math.max(24,24*p.unit);return current&&Math.abs(p.x-current.x)<=padding&&p.y>=current.y-58-8*p.unit&&p.y<=current.y+8*p.unit;}
  function cancelWalk(){walkTouch=null;moving=0;}
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0||e.isPrimary===false||sling||walkTouch)return;
    if((!canAct()&&state!=='deployment')||paused)return;
    const p=canvasPoint(e),x=p.x-camera,mw=Math.min(250,view*.5),mx=(view-mw)/2;
    if(p.y>offsetY+canvas.height-42&&x>=mx-8&&x<=mx+mw+8){manualCamera=clamp((x-mx)/mw*WORLD,0,WORLD);return;}
    if(state==='deployment'){placeSoldier(p.x);return;}
    e.preventDefault();canvas.setPointerCapture(e.pointerId);
    if(onActiveSoldier(p)){setAimMode('sling');cancelWalk();sling={id:e.pointerId,x:e.clientX,y:e.clientY,tipX:e.clientX,tipY:e.clientY,oldAngle:angle,oldPower:power,valid:false};}
    else if(Math.abs(p.x-current.x)>24*p.unit){moving=p.x>current.x?1:-1;walkTouch={id:e.pointerId};}
    else notify('Puxe sobre o soldado para mirar. Segure ao lado para mover.');
  });
  canvas.addEventListener('pointermove',e=>{if(sling)moveSling(e);else if(walkTouch?.id===e.pointerId&&canAct()){const p=canvasPoint(e);moving=Math.abs(p.x-current.x)<18*p.unit?0:p.x>current.x?1:-1;}});
  canvas.addEventListener('pointerup',e=>{if(walkTouch?.id===e.pointerId)cancelWalk();endSling(e);});
  ['pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,e=>{if(walkTouch?.id===e.pointerId)cancelWalk();endSling(e,true);}));
  ['angle','power'].forEach(id=>$(id).addEventListener('input',()=>{const a=Number($('angle').value),p=Number($('power').value);setAimMode('manual');angle=a;power=p;sync();}));
  ['angle','power'].forEach(id=>['pointerdown','focus'].forEach(event=>$(id).addEventListener(event,()=>{if(canAct())setAimMode('manual');})));
  function pause(){if(!['playing','deployment'].includes(state)||paused)return;cancelWalk();cancelSling();paused=true;moving=0;held.clear();$('pause-modal').showModal();syncMusic();sync();}
  function resume(){closeDialogs();paused=false;syncMusic();sync();}
  function showMenu(){cancelWalk();aiMove=null;cancelSling();closeDialogs();state='menu';special=null;specialQueue=[];paused=false;phase='aim';moving=0;held.clear();$('splash').showModal();sync();}
  function showTutorial(){cancelWalk();cancelSling();if(['playing','deployment'].includes(state)){paused=true;moving=0;held.clear();}$('tutorial-modal').showModal();}
  $('close-tutorial').onclick=()=>{$('tutorial-modal').close();if(['playing','deployment'].includes(state)&&!$('pause-modal').open){paused=false;sync();}};
  $('tutorial').onclick=showTutorial;$('help').onclick=showTutorial;
  $('enter-menu').onclick=()=>{unlockAudio();$('splash').close();instructionNext=true;paintInstructions();$('intro-guide').showModal();};
  $('guide-continue').onclick=()=>{$('intro-guide').close();if(instructionNext){instructionNext=false;$('menu').showModal();}};
  $('back-splash').onclick=showMenu;
  $('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;
  $('next-stage').onclick=nextStage;
  $('pause').onclick=pause;$('resume').onclick=resume;$('ready').onclick=resume;
  $('exit').onclick=showMenu;$('result-menu').onclick=showMenu;$('fire').onclick=fire;
  for(let i=0;i<3;i++)$('deploy-'+i).onclick=()=>selectPlacement(i);
  $('deploy-place').onclick=()=>placeSoldier(Number($('deploy-position').value));
  $('deploy-confirm').onclick=confirmDeployment;
  $('restore').onclick=()=>{if(canAct()&&previous){setAimMode('manual');angle=previous.angle;power=previous.power;sync();notify('Ângulo e força do último tiro restaurados.');}};
  $('sound').onclick=()=>{musicEnabled=!musicEnabled;unlockAudio();syncSound();tone(520,.1,'triangle');};
  document.addEventListener('pointerdown',unlockAudio);document.addEventListener('keydown',unlockAudio);
  $('mode').addEventListener('change',()=>{$('difficulty').disabled=$('mode').value==='local';});
  $('difficulty').disabled=$('mode').value==='local';
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,select'))return;
    if(e.key.toLowerCase()==='m'){$('sound').click();return;}
    if(e.key==='Escape'&&sling){cancelSling();return;}
    if(e.key.toLowerCase()==='p'||e.key==='Escape'){if($('pause-modal').open)resume();else if(!document.querySelector('dialog[open]'))pause();return;}
    if(!canAct())return;
    if(['ArrowUp','ArrowDown','+','=','-'].includes(e.key))setAimMode('manual');
    if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();
    held.add(e.key);if(e.key===' '&&!e.repeat)fire();
    if(e.key==='ArrowUp')angle=clamp(angle+(team? -1:1),10,170);
    if(e.key==='ArrowDown')angle=clamp(angle+(team?1:-1),10,170);
    if(e.key==='+'||e.key==='=')power=clamp(power+1,20,100);
    if(e.key==='-')power=clamp(power-1,20,100);sync();
  });
  document.addEventListener('keyup',e=>held.delete(e.key));
  window.addEventListener('blur',()=>{cancelWalk();moving=0;held.clear();if(['playing','deployment'].includes(state)&&!document.querySelector('dialog[open]'))pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  // Native Escape must never dismiss a blocking handoff/result/menu or unpause physics silently.
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='pause-modal')resume();else if(d.id==='tutorial-modal')$('close-tutorial').click();}));

  function paintInstructions(){
    for(let i=0;i<3;i++){
      const c=$('guide-'+i),g=c.getContext('2d');c.width=320;c.height=180;g.imageSmoothingEnabled=false;
      const sky=g.createLinearGradient(0,0,0,180);sky.addColorStop(0,'#9baea4');sky.addColorStop(1,'#e5dfb4');g.fillStyle=sky;g.fillRect(0,0,320,180);g.fillStyle='#615438';g.fillRect(0,137,320,43);g.drawImage(arcade.tiles?.[0]??sprites[0][0],0,145,320,38);g.fillStyle='#9faa57';g.fillRect(0,134,320,5);g.drawImage(sprites[0][i],112,24,96,115);
      g.lineWidth=4;g.strokeStyle='#fff1ac';g.fillStyle='#fff1ac';g.font='bold 18px Arial';g.textAlign='center';
      if(i===0){for(const x of [65,255]){g.beginPath();g.arc(x,105,24,0,Math.PI*2);g.stroke();g.fillText(x<160?'←':'→',x,112);}g.fillText('SEGURE AO LADO',160,26);}
      if(i===1){g.setLineDash([6,5]);g.beginPath();g.moveTo(158,95);g.lineTo(83,146);g.stroke();g.setLineDash([]);g.beginPath();g.arc(158,95,25,0,Math.PI*2);g.stroke();g.fillText('PUXE SOBRE O SOLDADO',160,26);g.fillText('↙',82,140);}
      if(i===2){g.fillStyle='#ff7628';g.fillRect(214,66,48,8);g.fillStyle='#fff6b3';g.fillRect(233,67,29,5);g.fillText('SOLTE PARA DISPARAR',160,26);g.fillStyle='#243c36';g.fillRect(16,151,288,25);g.fillStyle='#fff1ac';g.font='bold 13px Arial';g.fillText('OU AJUSTE ÂNGULO + FORÇA',160,168);}
    }
  }

  function paintMenu(){
    const c=$('menu-scene'),g=c.getContext('2d');g.imageSmoothingEnabled=false;
    if(arcade.cover){c.width=640;c.height=960;g.imageSmoothingEnabled=false;g.drawImage(arcade.cover,0,0,640,960);return;}
    c.width=640;c.height=960;g.fillStyle='#1d302b';g.fillRect(0,0,640,960);
    g.drawImage(arcade.props[1],0,200,320,320);g.drawImage(arcade.props[0],300,310,320,320);
    g.drawImage(sprites[0][0],130,470,200,240);g.drawImage(sprites[1][1],330,500,200,240);
  }
  arcade.onCover=paintMenu;
  generate();resize();paintMenu();syncSound();sync();$('splash').showModal();requestAnimationFrame(frame);
})();


