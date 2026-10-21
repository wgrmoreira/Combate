'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('battle'), ctx = canvas.getContext('2d');
  const warAssets=globalThis.Combate16Assets;
  const arcade=globalThis.CombateArcade;
  const HEIGHT = 540, GRAVITY = 300, STEP = 1 / 120, FRONT = 600;
  let WORLD=1200;
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
  let angle=55, power=65, previous=null, projectile=null, path=[], particles=[], floats=[], crates=[];
  let ghosts=[], plane=null, pendingFlights=0, supplyCount=0;
  let deploymentTeam=0, selectedSoldier=0;
  let camera=0, view=1200, offsetY=0, manualCamera=null, moving=0, held=new Set(), sling=null;
  let combatFx=[];
  let aimMode='sling',impactFocus=null;
  let ambient={time:0,blasts:[],aircraft:[],shells:[],tracers:[],tracerClock:.3,blastClock:.6,planeClock:1.5,gunClock:2,nuclearClock:35};
  let phase='aim', wait=0, aiTimer=0, elapsed=0, shots=0, damage=0, toastTime=0, last=0, accumulator=0;
  let mode='solo', difficulty='normal', sound=true, audio=null,audioUnlocked=false, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const roster=[['ATLAS','ECHO','NOVA'],['FALCÃO','BRASA','ÔNIX']];
  const selection=[0,0];
  const freshStats=()=>[{shots:0,hits:0,kills:0},{shots:0,hits:0,kills:0}];
  let level=1, stats=freshStats(), stageStats=freshStats(), canAdvance=false, raining=false;
  let bestScore=Number(read('best','0'))||0;
  function accuracy(s){return s.shots?100*s.hits/s.shots:0;}
  function scoreFor(s){return Math.round(s.kills*1000*(1+accuracy(s)/100));}
  function aiPrecision(stage=level){const base=difficulty==='easy'?35:difficulty==='hard'?65:50;return Math.min(95,base+3*(stage-1));}
  function environment(time=elapsed){const n=Math.floor(time/25)%4,f=(time%25)/25,t=clamp((f-.72)/.28,0,1);return{index:n,next:(n+1)%4,blend:t*t*(3-2*t),name:['MANHÃ','DIA','TARDE','NOITE'][n]};}
  function mixColor(a,b,t){const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16);return '#'+[16,8,0].map(s=>Math.round(lerp((aa>>s)&255,(bb>>s)&255,t)).toString(16).padStart(2,'0')).join('');}
  function nightAmount(env=environment()){return lerp(env.index===3?1:0,env.next===3?1:0,env.blend);}
  function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function read(key,fallback){try{return localStorage.getItem('combate16-'+key)||fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem('combate16-'+key,value);}catch{/* Storage can be disabled in private browsers. */}}
  $('mode').value=read('mode','solo'); $('difficulty').value=read('difficulty','normal');
  function unlockAudio(){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume()?.catch(()=>{});audioUnlocked=true;}catch{/* Browsers unlock audio on the first user gesture. */}}
  function syncSound(){$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Desativar som':'Ativar som');$('sound').setAttribute('aria-pressed',String(sound));$('sound').title=sound?'Som ligado · desativar':'Som desligado · ativar';$('sound').style.color=sound?'var(--lime)':'';}
  function tone(freq=240,duration=.12,type='square',volume=.035){
    if(!sound||!audioUnlocked)return;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.3),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{/* Sound is optional. */}
  }
  function notify(text,time=2){$('toast').textContent=text;$('toast').classList.add('show');toastTime=Math.min(time,2.5);}
  function resize(){cancelSling();const r=$('stage').getBoundingClientRect();view=Math.min(Math.round(r.width/r.height*HEIGHT),1200);canvas.width=view;canvas.height=Math.round(view*r.height/r.width);offsetY=Math.min(170,Math.max(0,HEIGHT-canvas.height));ctx.imageSmoothingEnabled=false;}
  new ResizeObserver(resize).observe($('stage'));
  function generate(){
    seed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;random=rng(seed);biome=Math.floor(random()*themes.length);theme=themes[biome];
    const counts=[3,mode==='solo'?level*3:3];WORLD=Math.max(1200,760+counts[1]*52);raining=random()<.35;
    const p=random()*7,q=random()*8,r=random()*6;
    terrain=Array.from({length:WORLD},(_,x)=>clamp(378+Math.sin(x/175+p)*37+Math.sin(x/72+q)*18+Math.sin(x/32+r)*6,295,435));
    soldiers=[];selection[0]=selection[1]=0;
    for(let t=0;t<2;t++)for(let i=0;i<counts[t];i++){
      const x=t?Math.round(720+i*(WORLD-780)/Math.max(1,counts[t]-1)):115+i*105+Math.floor(random()*30);
      const level=terrain[Math.floor(x)];for(let j=-19;j<=19;j++)terrain[Math.floor(x+j)]=lerp(terrain[Math.floor(x+j)],level,1-Math.abs(j)/24);
      soldiers.push({team:t,index:i,name:roster[t][i%3]+(i>=3?' '+(Math.floor(i/3)+1):''),x,y:level,hp:100,boost:false,face:t?-1:1,walk:0,placed:true});
    }
    crates=[];ghosts=[];plane=null;pendingFlights=0;supplyCount=0;
    combatFx=[];impactFocus=null;ambient={time:0,blasts:[],aircraft:[],shells:[],tracers:[],tracerClock:.3,blastClock:.6,planeClock:1.5,gunClock:2,nuclearClock:rand(32,48)};
    wind=Math.round((random()-.5)*36);particles=[];floats=[];projectile=null;previous=null;manualCamera=null;
    $('biome-label').textContent=`0${biome+1} / ${theme.name}`;$('seed-label').textContent=`SEED ${seed.toString(16).toUpperCase()}`;
  }
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function start(){unlockAudio();aimMode='sling';mode=$('mode').value;difficulty=$('difficulty').value;save('mode',mode);save('difficulty',difficulty);level=1;stats=freshStats();shots=0;prepareStage();}
  function prepareStage(){cancelSling();closeDialogs();canAdvance=false;generate();stageStats=freshStats();state='deployment';phase='placement';paused=false;team=0;current=null;deploymentTeam=0;selectedSoldier=0;round=1;turnCount=0;elapsed=0;damage=0;angle=55;power=65;for(const s of soldiers)s.placed=s.team===1&&mode==='solo';selectPlacement(0);notify(mode==='solo'?`Fase ${level} · ${level*3} rivais. Prepare seu trio!`:'Prepare seu trio para o duelo!',4);tone(480,.16);}
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
  function canAct(){return state==='playing'&&!paused&&!impactFocus&&phase==='aim'&&isHuman()&&current?.hp>0;}
  function beginTurn(pass=true){
    const alive=soldiers.filter(s=>s.team===team&&s.hp>0);if(!alive.length){finish();return;}
    current=alive.find(s=>s.index>=selection[team])||alive[0];selection[team]=(current.index+1)%soldiers.filter(s=>s.team===team).length;
    actions=2;fuel=100;previous=null;phase='aim';aiTimer=1.1;manualCamera=null;moving=0;held.clear();
    angle=team===0?55:125;power=65;
    if(pass&&mode==='local'){$('handoff-title').textContent=`${team===0?'Vanguarda':'Escarlate'}, sua vez.`;paused=true;$('handoff').showModal();}
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
    $('action-label').textContent=phase==='flight'?'Projétil em voo…':phase==='settle'?(impactFocus?'Observando o impacto · 3s':'Aguardando impacto…'):`${actions===2?'1º':'2º'} tiro · ${aimMode==='manual'?'mira manual':'estilingue'}`;
    $('fuel').textContent=`${Math.round(fuel)}%`;
    ['fire','angle','power','left','right'].forEach(id=>$(id).disabled=!canAct());$('restore').disabled=!canAct()||!previous;
    $('hint').textContent=deploying?'TOQUE NO SEU LADO DO CAMPO PARA POSICIONAR':aimMode==='manual'?'MIRA MANUAL · AJUSTE ÂNGULO/FORÇA E USE DISPARAR':'PUXE PARA TRÁS E PARA BAIXO · SOLTE PARA DISPARAR';
    $('aim-mode').textContent=aimMode==='manual'?'↔ ESTILINGUE':'⌖ MIRA MANUAL';$('aim-mode').disabled=!canAct();
    $('supply-label').title='Disparos até o próximo avião de suprimentos';$('supply-label').textContent=`✈ ${6-shots%6}`;
    $('campaign-phase').textContent=mode==='solo'?`FASE ${String(level).padStart(2,'0')}`:'DUELO LOCAL';
    $('ai-label').textContent=mode==='solo'?`MIRA IA ${aiPrecision()}% · +3% / FASE`:'2 COMANDANTES';
    for(let t=0;t<2;t++){$('score-'+t).textContent=scoreFor(stats[t]).toLocaleString('pt-BR')+' PTS';$('kills-'+t).textContent=`${stats[t].kills} ELIM.`;$('accuracy-'+t).textContent=`${accuracy(stats[t]).toFixed(1).replace('.',',')}% PRECISÃO`;}
    $('best-score').textContent=`RECORDE ${bestScore.toLocaleString('pt-BR')}`;updateWeatherLabel();
    $('restart').textContent=mode==='solo'?'RECOMEÇAR CAMPANHA':'RECOMEÇAR DUELO';
  }
  function launch(s,a,p){
    const speed=230+p*4.3,rad=a*Math.PI/180;
    return{x:s.x+Math.cos(rad)*20,y:s.y-19-Math.sin(rad)*12,vx:Math.cos(rad)*speed,vy:-Math.sin(rad)*speed,time:0};
  }
  function integrate(b,dt){b.vx+=wind*dt;b.vy+=GRAVITY*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.time+=dt;}
  function impact(b){
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
    if(!canAct()&&!(state==='playing'&&!paused&&!isHuman()&&phase==='aim'))return;
    sling=null;projectile=launch(current,angle,power);projectile.owner=team;projectile.hitRecorded=false;stats[team].shots++;stageStats[team].shots++;projectile.boost=current.boost;current.boost=false;current.face=projectile.vx>0?1:-1;
    combatFx.push({type:'muzzle',x:projectile.x,y:projectile.y+20,age:0,life:.2,scale:.7,flip:projectile.vx<0});
    for(let i=0;i<3;i++)particles.push({x:current.x,y:current.y-25,vx:rand(-35,35),vy:rand(-75,-35),life:.5,max:.5,size:2,color:'#d6b66f'});
    path=[{x:projectile.x,y:projectile.y}];previous={angle,power,path:[]};phase='flight';shots++;if(shots%6===0)pendingFlights++;manualCamera=null;moving=0;tone(180,.15,'sawtooth');sync();
  }
  function burst(x,y,radius,boost,shot=projectile){
    const r=boost?radius*1.4:radius;
    combatFx.push({type:'explosion',x,y:y+20,age:0,life:1.15,scale:boost?2.1:1.65});
    for(let x2=Math.max(0,Math.floor(x-r));x2<Math.min(WORLD,x+r);x2++){
      const depth=y+Math.sqrt(Math.max(0,r*r-(x2-x)**2));terrain[x2]=clamp(Math.max(terrain[x2],depth),0,HEIGHT-35);
    }
    let enemyHit=false,kills=0;const victims=[];
    for(const s of soldiers){if(s.hp<=0)continue;const d=Math.hypot(s.x-x,s.y-22-y);if(d<r+26){const hit=Math.round((boost?105:82)*clamp(1-d/(r+26),.12,1));s.hp=Math.max(0,s.hp-hit);victims.push({soldier:s,distance:d});damage+=hit;if(shot&&s.team!==shot.owner){enemyHit=true;if(s.hp===0)kills++;}floats.push({x:s.x,y:s.y-48,text:`−${hit}`,life:1.5,color:s.team?'#ffd1b5':'#e5efa4'});if(s.hp===0){ghosts.push({x:s.x,y:s.y-25,startX:s.x,age:0,life:3.8,team:s.team});tone(850,.45,'sine');}}}
    if(victims.length){victims.sort((a,b)=>a.distance-b.distance);impactFocus={target:victims[0].soldier,remaining:3};manualCamera=null;camera=clamp(impactFocus.target.x-view/2,0,WORLD-view);notify(`IMPACTO EM ${impactFocus.target.name} · observando resultado`,3);}
    if(shot&&[0,1].includes(shot.owner)){if(enemyHit&&!shot.hitRecorded){stats[shot.owner].hits++;stageStats[shot.owner].hits++;shot.hitRecorded=true;}stats[shot.owner].kills+=kills;stageStats[shot.owner].kills+=kills;}
    for(let i=0;i<(reduced?18:55);i++)particles.push({x,y,vx:rand(-170,170),vy:rand(-230,60),life:rand(.25,1),max:1,size:rand(2,9),color:i%3?'#edb66a':'#fff2ba'});
    particles.push({x,y,vx:0,vy:0,life:.32,max:.32,size:r,color:'#ffdf9b',ring:true});
    tone(65,.5,'sawtooth',.09);if(navigator.vibrate&&!reduced)navigator.vibrate(25);
  }
  function finish(){
    if(state==='ended')return true;
    const alive=[0,1].map(t=>soldiers.some(s=>s.hp>0&&s.team===t));
    if(alive[0]&&alive[1])return false;
    state='ended';phase='ended';projectile=null;
    const winner=alive[0]?0:alive[1]?1:-1;
    canAdvance=mode==='solo'&&winner===0;
    bestScore=Math.max(bestScore,scoreFor(stats[0]));save('best',String(bestScore));
    $('result-title').textContent=winner<0?'Empate no horizonte.':mode==='solo'?(canAdvance?`Fase ${level} concluída!`:`Campanha encerrada · fase ${level}`):`${winner===0?'Vanguarda':'Escarlate'} venceu.`;
    $('result-copy').textContent=canAdvance?`Próxima fase: ${(level+1)*3} inimigos · precisão da IA ${aiPrecision(level+1)}%. Seu trio retorna com a vida completa e novas posições.`:winner<0?'Os dois esquadrões foram eliminados.':`${winner===0?'Vanguarda':'Escarlate'} conquistou o campo em ${round} rodadas.`;
    const s=stageStats[mode==='local'&&winner===1?1:0],total=stats[mode==='local'&&winner===1?1:0];
    $('result-stats').textContent=`NESTA FASE: ${s.kills} eliminações · ${s.hits}/${s.shots} tiros com acerto · ${accuracy(s).toFixed(1)}% de precisão. TOTAL: ${scoreFor(total).toLocaleString('pt-BR')} pontos · ${total.kills} eliminações · ${accuracy(total).toFixed(1)}% de precisão. PLACAR = eliminações × 1.000 × (1 + precisão ÷ 100).`;
    $('next-stage').hidden=!canAdvance;$('next-stage').textContent=`SEGUIR PARA A FASE ${level+1} →`;$('again').textContent=mode==='solo'?'RECOMEÇAR CAMPANHA':'NOVO DUELO';
    $('result').showModal();tone(winner===0?640:160,.5,'triangle');sync();return true;
  }
  function completeShot(){
    if(impactFocus)return;
    actions--;if(finish())return;
    if(actions<=0||current.hp<=0){nextTurn();return;}
    phase='aim';aiTimer=.9;manualCamera=null;
    notify(isHuman()?'Segundo tiro: mira mantida. Ajuste e confirme.':'O rival está recalculando a mira.');sync();
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
  function move(dt){
    if(!canAct())return;
    const dir=moving||(held.has('ArrowRight')||held.has('d')?1:0)-(held.has('ArrowLeft')||held.has('a')?1:0);
    if(!dir||fuel<=0)return;
    const x=clamp(current.x+dir*62*dt,22,WORLD-22),y=terrain[Math.floor(x)];
    if(current.y-y>22||soldiers.some(s=>s!==current&&s.hp>0&&Math.abs(s.x-x)<25))return;
    current.x=x;current.face=dir;current.walk+=dt*12;fuel=Math.max(0,fuel-dt*29);manualCamera=null;$('fuel').textContent=`${Math.round(fuel)}%`;
  }
  function updateSupplies(dt){
    if(!plane&&pendingFlights>0){
      pendingFlights--;const dir=supplyCount%2?-1:1;plane={x:dir>0?-100:WORLD+100,y:Math.min(280,offsetY+85),dir,prop:0,drops:[{x:rand(300,520),type:supplyCount%2?'power':'health',released:false},{x:rand(680,900),type:supplyCount%2?'health':'power',released:false}]};
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
  function update(dt){
    if(paused)return;
    for(const fx of combatFx)fx.age+=dt;combatFx=combatFx.filter(fx=>fx.age<fx.life);
    if(impactFocus){impactFocus.remaining-=dt;if(impactFocus.remaining<=0)impactFocus=null;}
    if(state==='playing'||state==='deployment')updateAmbient(dt);
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(!p.ring)p.vy+=220*dt;}
    floats=floats.filter(f=>f.life>0);for(const f of floats){f.life-=dt;f.y-=22*dt;}
    ghosts=ghosts.filter(g=>g.life>0);for(const g of ghosts){g.age+=dt;g.life-=dt;g.y-=(reduced?24:43)*dt;g.x=g.startX+Math.sin(g.age*3.4)*9;}
    if(state!=='playing')return;elapsed+=dt;updateWeatherLabel();move(dt);updateSupplies(dt);
    for(const s of soldiers){if(s.hp<=0)continue;s.y=Math.min(terrain[Math.floor(s.x)],s.y+140*dt);for(const c of crates){if(!c.taken&&c.landed&&Math.abs(s.x-c.x)<24&&Math.abs(s.y-c.y-22)<28){c.taken=true;if(c.type==='health')s.hp=Math.min(100,s.hp+30);else s.boost=true;notify(c.type==='health'?`${s.name} recuperou 30 PV`:`${s.name}: próximo tiro reforçado`);tone(700,.2,'triangle');sync();}}}
    if(phase==='flight'&&projectile){
      integrate(projectile,dt);path.push({x:projectile.x,y:projectile.y});const hit=impact(projectile);
      if(hit){const b=projectile;previous.path=path.slice();if(hit!=='out')burst(b.x,b.y,60,b.boost);else notify('Fora do campo. Corrija a força e o ângulo.');projectile=null;phase='settle';wait=impactFocus?3:.85;sync();}
    }else if(phase==='settle'){wait-=dt;if(wait<=0)completeShot();}
    else if(!isHuman()&&phase==='aim'){aiTimer-=dt;if(aiTimer<=0)ai();}
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
  function ambientBlast(x,y,type='explosion',scale=1){ambient.blasts.push({x,y,type,scale,age:0,life:type==='nuclear'?10:2.8});if(ambient.blasts.length>10)ambient.blasts.shift();}
  function updateAmbient(dt){
    ambient.time+=dt;ambient.blastClock-=dt;ambient.planeClock-=dt;ambient.gunClock-=dt;ambient.nuclearClock-=dt;ambient.tracerClock-=dt;
    if(ambient.blastClock<=0){ambientBlast(camera*.28+rand(65,Math.max(66,view-65)),rand(268,292),'explosion',rand(.65,1.05));ambient.blastClock=rand(2.5,5.5);if(!reduced)tone(55,.2,'triangle',.008);}
    if(ambient.planeClock<=0){const dir=Math.random()<.5?1:-1;ambient.aircraft.push({x:camera*.28+(dir>0?-75:view+75),y:Math.min(240,offsetY+rand(48,102)),vx:dir*rand(50,80),life:25,smoking:false});ambient.planeClock=rand(11,19);if(ambient.aircraft.length>3)ambient.aircraft.shift();}
    if(ambient.gunClock<=0){const aircraft=ambient.aircraft.find(p=>p.life>0),sx=camera*.28+rand(80,Math.max(81,view-80)),sy=290;
      ambient.shells.push({sx,sy,ex:aircraft?aircraft.x+aircraft.vx*1.1+rand(-35,35):sx+rand(-160,160),ey:aircraft?aircraft.y+rand(-22,22):offsetY+rand(45,110),age:0,duration:rand(.9,1.5),arc:rand(18,42)});ambient.gunClock=rand(1.2,2.7);}
    if(ambient.nuclearClock<=0){ambientBlast(camera*.28+rand(view*.25,view*.8),288,'nuclear',1.55);ambient.nuclearClock=rand(55,90);}
    if(ambient.tracerClock<=0){
      const x=camera*.28+rand(30,Math.max(31,view-30)),dx=rand(-120,120),top=offsetY+rand(20,95);
      for(let i=0;i<(reduced?3:7);i++)ambient.tracers.push({x,y:300,vx:dx,vy:-(300-top)/.85,age:-i*.065,life:.95,color:Math.random()<.5?'#ffda58':'#82ffb0'});
      ambient.tracerClock=rand(1.7,3.2);
    }
    for(const t of ambient.tracers){t.age+=dt;if(t.age>=0){t.x+=t.vx*dt;t.y+=t.vy*dt;}}
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
    for(const p of ambient.aircraft){if(p.smoking){ctx.save();ctx.globalAlpha=.65;assetFrame('smoke',Math.floor(ambient.time*4)%4,p.x-parallax-Math.sign(p.vx)*23,p.y+12,.45);ctx.restore();}assetFrame('plane',Math.floor(ambient.time*9)%3,p.x-parallax,p.y+27,.7,p.vx<0);}
    for(const s of ambient.shells){const t=clamp(s.age/s.duration,0,1),x=lerp(s.sx,s.ex,t)-parallax,y=lerp(s.sy,s.ey,t)-Math.sin(t*Math.PI)*s.arc;ctx.save();ctx.globalAlpha=.7+night*.3;rect(x-2,y-7,2,7,'#fff3ba');rect(x-1,y,2,3,'#ffa46a');ctx.restore();}
    for(const t of ambient.tracers){if(t.age<0)continue;ctx.save();ctx.globalAlpha=Math.min(1,(t.life-t.age)*5)*(.65+night*.35);const x=t.x-parallax;for(let j=0;j<5;j++)rect(x-t.vx*j*.009,t.y-t.vy*j*.009,2,j?3:5,j?t.color:'#fffad5');ctx.restore();}
    for(const x of [view*.18,view*.72])assetFrame('battery',0,x,terrain[Math.floor(clamp(x+camera,0,WORLD-1))]+3,.55);
  }
  function updateWeatherLabel(){const text=`${environment().name} · ${raining?'CHUVA':'CÉU ABERTO'}`;if($('weather-label').textContent!==text)$('weather-label').textContent=text;}
  function background(){
    const env=environment(),night=nightAmount(env),colors=[['#8c9e84','#d9c99b'],theme.sky,['#836b62','#d79c6e'],['#142b35','#53665d']],sky=ctx.createLinearGradient(0,offsetY,0,HEIGHT);
    sky.addColorStop(0,mixColor(colors[env.index][0],colors[env.next][0],env.blend));sky.addColorStop(1,mixColor(colors[env.index][1],colors[env.next][1],env.blend));ctx.fillStyle=sky;ctx.fillRect(0,offsetY,view,canvas.height);
    const image=biome%2?(arcade.city||arcade.scene):arcade.scene;
    if(image){
      const width=900,height=width*image.height/image.width,offset=camera*.22+biome*217,first=Math.floor(offset/width);
      ctx.save();ctx.filter=biome===2?'saturate(.65) hue-rotate(14deg)':biome===3?'sepia(.35) saturate(1.15)':'none';
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
  function drawWeather(){
    const night=nightAmount();if(night>0){ctx.globalAlpha=night*.3;rect(0,offsetY,view,canvas.height,'#102450');ctx.globalAlpha=1;const x=585-camera,y=terrain[585];rect(x-12,y-14,23,4,'#ffe8a2');}
    if(!raining)return;
    const time=reduced?0:elapsed;ctx.strokeStyle=night>.5?'#bed8ec9c':'#e0f6ffb5';ctx.lineWidth=1;
    for(let i=0;i<(reduced?25:100);i++){const x=((i*137-time*(35-wind))%view+view)%view,y=offsetY+(i*67+time*280)%canvas.height;ctx.beginPath();ctx.moveTo(Math.round(x),Math.round(y));ctx.lineTo(Math.round(x-3),Math.round(y+9));ctx.stroke();}
    for(let i=0;i<14;i++){const x=(i*89+seed%71)%WORLD;if(x<camera||x>camera+view)continue;const y=terrain[x];if((i+Math.floor(time*5))%3===0){rect(x-camera-2,y-1,5,1,'#c1e6efb0');rect(x-camera,y-4,1,2,'#c1e6efb0');}}
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
    const x=s.x-camera,y=s.y;if(x<-40||x>view+40)return;
    ctx.save();ctx.globalAlpha=.25;rect(x-15,y-2,30,5,'#0c2023');ctx.restore();
    const active=s===current&&state==='playing',bounce=moving&&active?Math.sin(s.walk)*2:(!reduced&&active?Math.sin(elapsed*3)*.45:0),recoil=active&&combatFx.some(f=>f.type==='muzzle')?s.face*2:0;
    ctx.save();ctx.translate(Math.round(x-recoil),Math.round(y+bounce));if(s.face<0)ctx.scale(-1,1);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])ctx.drawImage(arcade.outlines[s.team][s.index%3],-24+dx,-54+dy,48,56);ctx.drawImage(sprites[s.team][s.index%3],-24,-54,48,56);ctx.restore();
    rect(x-14,y-61,28,4,'#263654');rect(x-13,y-60,26*s.hp/100,2,s.team?'#ff8597':'#baf966');
    rect(x-17,y-74,34,9,'#18291fd9');ctx.font='bold 7px Consolas, monospace';ctx.textAlign='center';ctx.fillStyle=active?'#ffe8a5':'#eee7c7';ctx.fillText(s.name,Math.round(x),Math.round(y-67));
    if(active||(state==='deployment'&&s.team===deploymentTeam&&s.index===selectedSoldier)){poly([[x-4,y-77],[x+4,y-77],[x,y-72]],s.team?'#ff92ab':'#eeff8b');ctx.strokeStyle=s.team?'#ff92ab':'#e6ff87';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y+2,17,4,0,0,Math.PI*2);ctx.stroke();}
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
  function drawPlane(){
    if(!plane)return;
    const x=plane.x-camera;rect(x-plane.dir*50,plane.y,30,1,'#c6c9ad66');
    assetFrame('plane',Math.floor(plane.prop)%3,x,plane.y+42,1.55,plane.dir<0);
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
  }
  function aimPreview(){
    if(!canAct())return{kind:'none',points:[]};
    const unit=view/canvas.getBoundingClientRect().width,rad=angle*Math.PI/180;return{kind:'direction',points:Array.from({length:3},(_,i)=>({x:current.x+Math.cos(rad)*(24+i*15*unit),y:current.y-19-Math.sin(rad)*(24+i*15*unit)}))};
  }
  function drawAimIndicator(points){const unit=view/canvas.getBoundingClientRect().width;for(const p of points){rect(p.x-camera-4*unit,p.y-4*unit,8*unit,8*unit,'#172b40');rect(p.x-camera-2.5*unit,p.y-2.5*unit,5*unit,5*unit,'#fff4ad');}const end=points[points.length-1];if(end){const x=end.x-camera,y=end.y;rect(x-9*unit,y-1.5*unit,18*unit,3*unit,'#fff3a8');rect(x-1.5*unit,y-9*unit,3*unit,18*unit,'#fff3a8');rect(x-unit,y-unit,2*unit,2*unit,'#293d4e');}}
  function drawPath(points,color,dotted=true){ctx.fillStyle=color;for(let i=0;i<points.length;i+=dotted?2:1){const p=points[i];if(p.y<0)continue;rect(p.x-camera-1,p.y-1,2,2,color);}}
  function drawDeployment(){
    const min=deploymentTeam?640:32,max=deploymentTeam?1168:560,color=deploymentTeam?'#ffc0cb':'#e8ffab';
    ctx.save();ctx.globalAlpha=.12;rect(min-camera,offsetY,max-min,HEIGHT-offsetY,color);ctx.restore();
    for(let x=min;x<=max;x+=12)rect(x-camera,terrain[Math.floor(x)]-3,7,2,color);
    for(const x of [min,max]){const y=terrain[Math.floor(x)];rect(x-camera,y-28,2,28,'#fff4c4');rect(x-camera+2,y-28,13,9,deploymentTeam?'#ee7189':'#9ed879');}
    ctx.font='bold 10px monospace';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText('ESCOLHA UM LUGAR PARA SEU TRIO',clamp((min+max)/2-camera,130,view-130),offsetY+72);
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
    const target=impactFocus?.target.x??manualCamera??(state==='deployment'?(soldiers.find(s=>s.team===deploymentTeam&&s.index===selectedSoldier)?.x??300):projectile?projectile.x:current?.x??600);
    const desired=clamp(target-view/2,0,WORLD-view);camera=paused||sling?camera:lerp(camera,desired,reduced?1:.075);camera=clamp(camera,0,WORLD-view);
    const victim=impactFocus?.target,focusY=victim?(victim.hp>0?victim.y:terrain[Math.floor(victim.x)]):Math.max(projectile?.y??0,current?.y??0),baseY=Math.min(170,Math.max(0,HEIGHT-canvas.height)),targetY=clamp(Math.max(baseY,focusY-canvas.height+60),baseY,Math.max(baseY,HEIGHT-canvas.height));
    if(!paused&&!sling)offsetY=lerp(offsetY,targetY,reduced?1:.1);
    background();drawTerrain();
    if(state==='deployment')drawDeployment();
    const preview=aimPreview();
    if(preview.kind!=='none'){
      drawAimIndicator(preview.points);
    }
    drawPlane();crates.forEach(drawCrate);
    soldiers.forEach(drawSoldier);
    for(const fx of combatFx){const frames=warAssets.frames[fx.type].length;ctx.save();ctx.globalAlpha=Math.min(1,(fx.life-fx.age)*8);assetFrame(fx.type,Math.min(frames-1,Math.floor(fx.age/fx.life*frames)),fx.x-camera,fx.y,fx.scale,fx.flip);ctx.restore();}
    if(projectile){drawPath(path.slice(-18).filter((_,i)=>i%4===0),'#fff3c680',false);ctx.save();ctx.translate(projectile.x-camera,projectile.y);ctx.rotate(Math.atan2(projectile.vy,projectile.vx));assetFrame('shell',0,0,24,.75);ctx.restore();if(projectile.y<offsetY+10){ctx.fillStyle='#e7efbc';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText('↑ PROJÉTIL',clamp(projectile.x-camera,60,view-60),offsetY+60);}}
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);if(p.ring){ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x-camera,p.y,p.size*(1-p.life/p.max)+4,0,Math.PI*2);ctx.stroke();}else rect(p.x-camera,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
    drawWeather();drawSling();ghosts.forEach(drawGhost);
    for(const f of floats){ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.fillText(f.text,f.x-camera,f.y);}ctx.globalAlpha=1;
    if(view<WORLD-20){
      for(const side of [-1,1]){const rivals=soldiers.filter(s=>s.hp>0&&(side<0?s.x<camera:s.x>camera+view));if(rivals.length){const x=side<0?18:view-18;ctx.fillStyle=rivals[0].team?'#f3b18d':'#d9ee8b';ctx.font='bold 12px monospace';ctx.textAlign=side<0?'left':'right';ctx.fillText(`${side<0?'◀':'▶'} ${rivals.length}`,x,270);}}
    }
    minimap();
  }
  function frame(time){const dt=Math.min(.1,(time-(last||time))/1000);last=time;accumulator+=dt;while(accumulator>=STEP){update(STEP);accumulator-=STEP;}draw();requestAnimationFrame(frame);}
  function slingshotAim(dx,dy){const distance=Math.hypot(dx,dy);return{angle:clamp(Math.atan2(Math.max(1,dy),dx)*180/Math.PI,10,170),power:clamp((distance-12)/110*100,20,100),valid:distance>=18&&dy>=6};}
  function cancelSling(){if(!sling)return;angle=sling.oldAngle;power=sling.oldPower;sling=null;sync();}
  function setAimMode(mode){cancelSling();aimMode=mode;sync();}
  function moveSling(e){if(!sling||aimMode!=='sling'||sling.id!==e.pointerId||!canAct())return;const aim=slingshotAim(sling.x-e.clientX,e.clientY-sling.y);sling.tipX=e.clientX;sling.tipY=e.clientY;sling.valid=aim.valid;if(aim.valid){angle=aim.angle;power=aim.power;}sync();}
  function endSling(e,cancel=false){if(!sling||sling.id!==e.pointerId)return;if(cancel){cancelSling();return;}moveSling(e);const saved=sling,valid=sling.valid;sling=null;if(valid&&canAct())fire();else{angle=saved.oldAngle;power=saved.oldPower;sync();notify('Puxe para trás e para baixo; solte para disparar.');}}
  function drawSling(){
    if(!sling)return;const r=canvas.getBoundingClientRect(),sx=view/r.width,sy=canvas.height/r.height;
    const x=(sling.x-r.left)*sx,y=(sling.y-r.top)*sy+offsetY,tx=(sling.tipX-r.left)*sx,ty=(sling.tipY-r.top)*sy+offsetY;
    const unit=sx;ctx.strokeStyle=sling.valid?'#ffdc8b':'#bacac8';ctx.lineWidth=4*unit;ctx.beginPath();ctx.moveTo(x-6*unit,y);ctx.lineTo(tx,ty);ctx.lineTo(x+6*unit,y);ctx.stroke();rect(x-9*unit,y-4*unit,5*unit,10*unit,'#986b47');rect(x+4*unit,y-4*unit,5*unit,10*unit,'#986b47');rect(tx-6*unit,ty-6*unit,12*unit,12*unit,'#172b40');rect(tx-4*unit,ty-4*unit,8*unit,8*unit,'#fff2b4');
    const label=sling.valid?`${Math.round(power)}% · ${Math.round(angle)}° · SOLTE!`:'PUXE PARA BAIXO E PARA TRÁS';ctx.font=`bold ${Math.round(11*unit)}px monospace`;ctx.textAlign='center';const textX=clamp(tx,view*.25,view*.75),textY=clamp(ty-22*unit,offsetY+80,offsetY+canvas.height-60);ctx.fillStyle='#182a40';ctx.fillText(label,textX+unit,textY+unit);ctx.fillStyle='#fff0bf';ctx.fillText(label,textX,textY);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    if((!canAct()&&state!=='deployment')||paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*view,y=(e.clientY-r.top)/r.height*canvas.height+offsetY;
    const mw=Math.min(250,view*.5),mx=(view-mw)/2;
    if(y>offsetY+canvas.height-42&&x>=mx-8&&x<=mx+mw+8){manualCamera=clamp((x-mx)/mw*WORLD,0,WORLD);return;}
    if(state==='deployment'){placeSoldier(x+camera);return;}
    if(aimMode==='manual'){notify('Mira manual: ajuste ângulo/força e toque em DISPARAR.');return;}
    if(sling||e.isPrimary===false)return;e.preventDefault();moving=0;sling={id:e.pointerId,x:e.clientX,y:e.clientY,tipX:e.clientX,tipY:e.clientY,oldAngle:angle,oldPower:power,valid:false};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',moveSling);
  canvas.addEventListener('pointerup',e=>endSling(e));
  ['pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,e=>endSling(e,true)));
  ['angle','power'].forEach(id=>$(id).addEventListener('input',()=>{const a=Number($('angle').value),p=Number($('power').value);setAimMode('manual');angle=a;power=p;sync();}));
  ['angle','power'].forEach(id=>['pointerdown','focus'].forEach(event=>$(id).addEventListener(event,()=>{if(canAct())setAimMode('manual');})));
  for(const [id,dir] of [['left',-1],['right',1]]){
    $(id).addEventListener('pointerdown',e=>{if(!canAct())return;e.preventDefault();moving=dir;$(id).setPointerCapture(e.pointerId);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(event=>$(id).addEventListener(event,()=>{moving=0;}));
  }
  function pause(){if(!['playing','deployment'].includes(state)||paused)return;cancelSling();paused=true;moving=0;held.clear();$('pause-modal').showModal();sync();}
  function resume(){closeDialogs();paused=false;sync();}
  function showMenu(){cancelSling();closeDialogs();state='menu';paused=false;phase='aim';moving=0;held.clear();$('splash').showModal();sync();}
  function showTutorial(){cancelSling();if(['playing','deployment'].includes(state)){paused=true;moving=0;held.clear();}$('tutorial-modal').showModal();}
  $('close-tutorial').onclick=()=>{$('tutorial-modal').close();if(['playing','deployment'].includes(state)&&!$('pause-modal').open){paused=false;sync();}};
  $('tutorial').onclick=showTutorial;$('help').onclick=showTutorial;
  $('enter-menu').onclick=()=>{unlockAudio();$('splash').close();$('menu').showModal();};
  $('back-splash').onclick=showMenu;
  $('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;
  $('next-stage').onclick=nextStage;
  $('pause').onclick=pause;$('resume').onclick=resume;$('ready').onclick=resume;
  $('exit').onclick=showMenu;$('result-menu').onclick=showMenu;$('fire').onclick=fire;
  $('aim-mode').onclick=()=>setAimMode(aimMode==='manual'?'sling':'manual');
  for(let i=0;i<3;i++)$('deploy-'+i).onclick=()=>selectPlacement(i);
  $('deploy-place').onclick=()=>placeSoldier(Number($('deploy-position').value));
  $('deploy-confirm').onclick=confirmDeployment;
  $('restore').onclick=()=>{if(canAct()&&previous){setAimMode('manual');angle=previous.angle;power=previous.power;sync();notify('Ângulo e força do último tiro restaurados.');}};
  $('sound').onclick=()=>{sound=!sound;if(sound)unlockAudio();syncSound();tone(520,.1,'triangle');};
  document.addEventListener('pointerdown',unlockAudio,{once:true});document.addEventListener('keydown',unlockAudio,{once:true});
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
  window.addEventListener('blur',()=>{moving=0;held.clear();if(['playing','deployment'].includes(state)&&!document.querySelector('dialog[open]'))pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  // Native Escape must never dismiss a blocking handoff/result/menu or unpause physics silently.
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='pause-modal')resume();else if(d.id==='tutorial-modal')$('close-tutorial').click();}));
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
