'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('battle'), ctx = canvas.getContext('2d');
  const HEIGHT = 540, GRAVITY = 300, STEP = 1 / 120, FRONT = 600;
  let WORLD=1200;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const themes = [
    {name:'VALE ESMERALDA', sky:['#3289bc','#a5e4bf'], far:'#657dbb', mid:'#3ba5a0', near:'#287f68', grass:'#c9f06b', edge:'#6fbc4c', soil:'#a0794c', deep:'#624d40', fleck:'#d3ad6b', sun:'#fff2ac'},
    {name:'FRONTEIRA ÂMBAR', sky:['#7563b8','#f5b99b'], far:'#a48dc9', mid:'#c586a6', near:'#80658e', grass:'#ffd088', edge:'#d68b59', soil:'#b06c55', deep:'#744757', fleck:'#e8a774', sun:'#ffed9b'},
    {name:'SERRA BOREAL', sky:['#4279be','#a5e1ee'], far:'#7c90d2', mid:'#639dc3', near:'#3d759a', grass:'#f1fff1', edge:'#a6e3df', soil:'#7b9da7', deep:'#4b647f', fleck:'#b9d8da', sun:'#fff6bb'},
    {name:'DUNAS DO OCASO', sky:['#9167b7','#ffc58e'], far:'#bd82b0', mid:'#de9b8d', near:'#bc8370', grass:'#ffe19a', edge:'#efb55b', soil:'#c68b55', deep:'#8b5f51', fleck:'#f4bc73', sun:'#fff3b3'}
  ];
  // Minimal chibi: oversized helmet, two dot eyes, tiny body and short boots.
  const sprites = [0,1].map(team => [0,1,2].map(variant => {
    const c=document.createElement('canvas');c.width=24;c.height=26;const g=c.getContext('2d');
    const px=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    const ink='#233139',dark=team?'#a73544':'#287440',base=team?'#ed5b61':'#48b961',light=team?'#ff9390':'#8bdb83',skin=['#ffdaa0','#efbd85','#ffe0b0'][variant];
    px(6,22,6,4,ink);px(14,22,6,4,ink);px(6,22,5,2,base);px(14,22,5,2,base);
    px(4,15,16,8,ink);px(5,16,14,6,base);px(5,16,3,4,light);px(5,20,14,2,dark);
    px(5,8,15,8,ink);px(6,9,13,6,skin);px(6,9,2,6,'#e6aa6b');px(9,10,2,3,ink);px(15,10,2,3,ink);
    px(2,3,20,6,ink);px(5,1,14,3,ink);px(6,1,12,2,base);px(3,4,18,4,base);px(3,7,18,2,dark);px(6,2,11,4,base);px(18,3,2,2,light);px(3,4,3,1,light);
    px(9,16,15,3,ink);px(13,16,7,1,'#9ca5ac');px(21,17,3,1,'#cad2d0');px(14,18,4,3,'#424b56');px(10,19,2,2,skin);px(19,19,2,2,skin);
    if(variant===1)px(5,6,2,1,light);
    if(variant===2)px(17,2,2,1,'#fff4bc');
    return c;
  }));
  let state='menu', paused=false, terrain=[], soldiers=[], team=0, current=null, actions=2, fuel=100;
  let round=1, turnCount=0, seed=0, random, theme=themes[0], biome=0, wind=0;
  let angle=55, power=65, previous=null, projectile=null, path=[], particles=[], floats=[], crates=[];
  let ghosts=[], plane=null, pendingFlights=0, supplyCount=0;
  let deploymentTeam=0, selectedSoldier=0;
  let camera=0, view=1200, offsetY=0, manualCamera=null, moving=0, held=new Set(), sling=null;
  let phase='aim', wait=0, aiTimer=0, elapsed=0, shots=0, damage=0, toastTime=0, last=0, accumulator=0;
  let mode='solo', difficulty='normal', sound=false, audio=null, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  function tone(freq=240,duration=.12,type='square',volume=.035){
    if(!sound)return;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.3),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{/* Sound is optional. */}
  }
  function notify(text,time=2.6){$('toast').textContent=text;$('toast').classList.add('show');toastTime=time;}
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
    wind=Math.round((random()-.5)*36);particles=[];floats=[];projectile=null;previous=null;manualCamera=null;
    $('biome-label').textContent=`0${biome+1} / ${theme.name}`;$('seed-label').textContent=`SEED ${seed.toString(16).toUpperCase()}`;
  }
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function start(){mode=$('mode').value;difficulty=$('difficulty').value;save('mode',mode);save('difficulty',difficulty);level=1;stats=freshStats();shots=0;prepareStage();}
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
  function canAct(){return state==='playing'&&!paused&&phase==='aim'&&isHuman()&&current?.hp>0;}
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
    if(current){$('active-name').textContent=`${current.name} · ${Math.ceil(current.hp)} PV`;$('active-team').textContent=`${team===0?'VANGUARDA':'ESCARLATE'} / ${String(current.index+1).padStart(2,'0')}`;const portrait=$('portrait').getContext('2d');portrait.imageSmoothingEnabled=false;portrait.clearRect(0,0,48,54);portrait.drawImage(sprites[team][current.index%3],0,1,48,52);}
    $('action-label').textContent=phase==='flight'?'Projétil em voo…':phase==='settle'?'Aguardando impacto…':`${actions===2?'1º':'2º'} tiro · mira livre`;
    $('fuel').textContent=`${Math.round(fuel)}%`;
    ['fire','angle','power','left','right'].forEach(id=>$(id).disabled=!canAct());$('restore').disabled=!canAct()||!previous;
    $('hint').textContent=deploying?'TOQUE NO SEU LADO DO CAMPO PARA POSICIONAR':'PUXE PARA TRÁS E PARA BAIXO · SOLTE PARA DISPARAR';
    $('supply-label').textContent=`✈ APOIO EM ${6-shots%6} TIROS`;
    $('campaign-phase').textContent=mode==='solo'?`FASE ${String(level).padStart(2,'0')} · ${level*3} RIVAIS`:'DUELO LOCAL';
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
    if(soldiers.some(s=>s.hp>0&&!(s===current&&b.time<.16)&&Math.abs(s.x-b.x)<10&&b.y>s.y-33&&b.y<s.y+2))return'soldier';
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
    path=[{x:projectile.x,y:projectile.y}];previous={angle,power,path:[]};phase='flight';shots++;if(shots%6===0)pendingFlights++;manualCamera=null;moving=0;tone(180,.15,'sawtooth');sync();
  }
  function burst(x,y,radius,boost,shot=projectile){
    const r=boost?radius*1.4:radius;
    for(let x2=Math.max(0,Math.floor(x-r));x2<Math.min(WORLD,x+r);x2++){
      const depth=y+Math.sqrt(Math.max(0,r*r-(x2-x)**2));terrain[x2]=clamp(Math.max(terrain[x2],depth),0,HEIGHT-35);
    }
    let enemyHit=false,kills=0;
    for(const s of soldiers){if(s.hp<=0)continue;const d=Math.hypot(s.x-x,s.y-22-y);if(d<r+26){const hit=Math.round((boost?105:82)*clamp(1-d/(r+26),.12,1));s.hp=Math.max(0,s.hp-hit);damage+=hit;if(shot&&s.team!==shot.owner){enemyHit=true;if(s.hp===0)kills++;}floats.push({x:s.x,y:s.y-48,text:`−${hit}`,life:1.5,color:s.team?'#ffd1b5':'#e5efa4'});if(s.hp===0){ghosts.push({x:s.x,y:s.y-25,startX:s.x,age:0,life:3.8,team:s.team});tone(850,.45,'sine');}}}
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
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(!p.ring)p.vy+=220*dt;}
    floats=floats.filter(f=>f.life>0);for(const f of floats){f.life-=dt;f.y-=22*dt;}
    ghosts=ghosts.filter(g=>g.life>0);for(const g of ghosts){g.age+=dt;g.life-=dt;g.y-=(reduced?24:43)*dt;g.x=g.startX+Math.sin(g.age*3.4)*9;}
    if(state!=='playing')return;elapsed+=dt;updateWeatherLabel();move(dt);updateSupplies(dt);
    for(const s of soldiers){if(s.hp<=0)continue;s.y=Math.min(terrain[Math.floor(s.x)],s.y+140*dt);for(const c of crates){if(!c.taken&&c.landed&&Math.abs(s.x-c.x)<24&&Math.abs(s.y-c.y-22)<28){c.taken=true;if(c.type==='health')s.hp=Math.min(100,s.hp+30);else s.boost=true;notify(c.type==='health'?`${s.name} recuperou 30 PV`:`${s.name}: próximo tiro reforçado`);tone(700,.2,'triangle');sync();}}}
    if(phase==='flight'&&projectile){
      integrate(projectile,dt);path.push({x:projectile.x,y:projectile.y});const hit=impact(projectile);
      if(hit){const b=projectile;previous.path=path.slice();if(hit!=='out')burst(b.x,b.y,60,b.boost);else notify('Fora do campo. Corrija a força e o ângulo.');projectile=null;phase='settle';wait=ghosts.some(g=>g.age<.1)?2.5:.85;sync();}
    }else if(phase==='settle'){wait-=dt;if(wait<=0)completeShot();}
    else if(!isHuman()&&phase==='aim'){aiTimer-=dt;if(aiTimer<=0)ai();}
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
  function updateWeatherLabel(){const text=`${environment().name} · ${raining?'CHUVA':'CÉU ABERTO'}`;if($('weather-label').textContent!==text)$('weather-label').textContent=text;}
  function background(){
    const env=environment(),night=nightAmount(env),palettes=[['#ca9fab','#ffe6bd'],theme.sky,['#8562a9','#f6ae8b'],['#10233f','#36547b']];
    const colors=[0,1].map(i=>{let c=mixColor(palettes[env.index][i],palettes[env.next][i],env.blend);return raining?mixColor(c,'#596f88',.34):c;});
    const g=ctx.createLinearGradient(0,offsetY,0,HEIGHT);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);ctx.fillStyle=g;ctx.fillRect(0,offsetY,view,canvas.height);
    if(night>.05){ctx.globalAlpha=night;for(let i=0;i<36;i++){const x=(i*97+seed%77)%view,y=offsetY+18+(i*47)%125;rect(x,y,i%5===0?3:1,2,'#fff1c8');}const mx=view*.77,my=offsetY+30;rect(mx,my,28,28,'#fff3c2');rect(mx-4,my+5,36,18,'#fff3c2');rect(mx+13,my-1,18,23,colors[0]);ctx.globalAlpha=1;}
    ctx.globalAlpha=1-night;const sunX=view*(.22+.55*(elapsed%75)/75)-camera*.025,sy=offsetY+18;rect(sunX,sy,42,42,theme.sun);rect(sunX-6,sy+8,54,26,theme.sun);ctx.globalAlpha=1;
    for(let i=0;i<7;i++){const x=((i*203+seed%150)-camera*.09)%(view+220)-70,y=offsetY+55+(i*47)%105;rect(x,y,74,7,raining?'#b8c5ce66':'#fff0d44a');rect(x+18,y-6,36,6,raining?'#b8c5ce66':'#fff0d44a');}
    for(let layer=0;layer<3;layer++){
      const pts=[[0,HEIGHT]];const base=225+layer*46;
      for(let x=-20;x<=view+20;x+=12){const wx=x+camera*(.12+layer*.14);let y=base+Math.sin(wx/(97-layer*12)+layer+seed%8)*37+Math.cos(wx/47)*13;pts.push([x,y]);}pts.push([view,HEIGHT]);poly(pts,mixColor([theme.far,theme.mid,theme.near][layer],'#203955',night*.7));
    }
    for(let i=0;i<22;i++){
      const x=i*85-camera*.55-30,base=330+Math.sin(i*3)*24,size=35+i%3*12;
      if(biome===3){rect(x,base-size,6,size,theme.near);rect(x-7,base-size+12,7,5,theme.near);rect(x-10,base-size+2,4,15,theme.near);}else{rect(x,base-20,4,26,theme.near);for(let j=0;j<3;j++)poly([[x-13-j*4,base-j*11],[x+2,base-size-j*5],[x+17+j*4,base-j*11]],theme.near);}
    }
    if(biome===2)for(let i=0;i<28;i++)rect((i*59+elapsed*9)%(view+30),((i*41+elapsed*13)%340),2,2,'#dbe9de66');
  }
  function drawWeather(){
    const night=nightAmount();if(night>0){ctx.globalAlpha=night*.3;rect(0,offsetY,view,canvas.height,'#102450');ctx.globalAlpha=1;const x=585-camera,y=terrain[585];rect(x-12,y-14,23,4,'#ffe8a2');}
    if(!raining)return;
    const time=reduced?0:elapsed;ctx.strokeStyle=night>.5?'#bed8ec9c':'#e0f6ffb5';ctx.lineWidth=1;
    for(let i=0;i<(reduced?25:100);i++){const x=((i*137-time*(35-wind))%view+view)%view,y=offsetY+(i*67+time*280)%canvas.height;ctx.beginPath();ctx.moveTo(Math.round(x),Math.round(y));ctx.lineTo(Math.round(x-3),Math.round(y+9));ctx.stroke();}
    for(let i=0;i<14;i++){const x=(i*89+seed%71)%WORLD;if(x<camera||x>camera+view)continue;const y=terrain[x];if((i+Math.floor(time*5))%3===0){rect(x-camera-2,y-1,5,1,'#c1e6efb0');rect(x-camera,y-4,1,2,'#c1e6efb0');}}
  }
  function drawTerrain(){
    const start=Math.max(0,Math.floor(camera)),end=Math.min(WORLD,Math.ceil(camera+view));
    for(let x=start;x<end;x+=2){const y=terrain[x],sx=x-camera;rect(sx,y,2,HEIGHT-y,theme.soil);rect(sx,y+25,2,HEIGHT-y,theme.deep);rect(sx,y,2,5,theme.grass);rect(sx,y+5,2,8,theme.edge);}
    for(let i=0;i<750;i++){
      const x=(i*137+seed%97)%WORLD,y=340+(i*67)%205;if(x<camera||x>camera+view||y<terrain[x]+15)continue;
      rect(x-camera,y,2+i%5,2,theme.fleck);
    }
    for(let i=0;i<110;i++){
      const x=(i*83+seed%83)%WORLD;if(x<camera||x>camera+view)continue;const y=terrain[x];
      rect(x-camera,y-4-i%5,2,6,theme.grass);if(i%8===0)rect(x-camera-2,y-7,5,2,biome===1?'#e3ac94':'#c9d79c');
    }
    // Abandoned bunker and radio mast, built from low-resolution blocks.
    const bx=585-camera,by=terrain[585];rect(bx-25,by-18,50,18,'#3b4943');rect(bx-19,by-25,38,9,'#6d7961');rect(bx-13,by-14,26,5,'#152c30');rect(bx+33,by-64,3,64,'#65766c');rect(bx+24,by-53,22,2,'#82917b');rect(bx+34,by-64,15,7,'#e1bb7f');
  }
  function drawSoldier(s){
    if(!s.placed&&state==='deployment')return;
    if(s.hp<=0){rect(s.x-camera-7,terrain[Math.floor(s.x)]-4,14,4,'#243633');return;}
    const x=s.x-camera,y=s.y;if(x<-40||x>view+40)return;
    ctx.save();ctx.globalAlpha=.25;rect(x-15,y-2,30,5,'#0c2023');ctx.restore();
    const active=s===current&&state==='playing',bounce=moving&&active?Math.sin(s.walk)*2:0;
    ctx.save();ctx.translate(Math.round(x),Math.round(y+bounce));if(s.face<0)ctx.scale(-1,1);ctx.drawImage(sprites[s.team][s.index%3],-15,-33,30,33);ctx.restore();
    rect(x-14,y-41,28,4,'#263654');rect(x-13,y-40,26*s.hp/100,2,s.team?'#ff8597':'#baf966');
    ctx.font='bold 7px Consolas, monospace';ctx.textAlign='center';ctx.fillStyle='#263654';ctx.fillText(s.name,Math.round(x+1),Math.round(y-46));ctx.fillStyle=active?'#fff5b5':'#ffffff';ctx.fillText(s.name,Math.round(x),Math.round(y-47));
    if(active||(state==='deployment'&&s.team===deploymentTeam&&s.index===selectedSoldier)){poly([[x-4,y-59],[x+4,y-59],[x,y-54]],s.team?'#ff92ab':'#eeff8b');ctx.strokeStyle=s.team?'#ff92ab':'#e6ff87';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y+2,17,4,0,0,Math.PI*2);ctx.stroke();}
    if(s.boost){ctx.fillStyle='#ffdb65';ctx.fillText('◆',x+19,y-30);}
  }
  function drawGhost(g){
    const x=g.x-camera,y=g.y;ctx.save();ctx.globalAlpha=Math.min(1,g.age*4,g.life/1.2);
    const glow=g.team?'#ffa4da':'#a2faff';
    rect(x-10,y-12,20,22,glow);rect(x-14,y-7,28,17,glow);rect(x-10,y-13,20,3,'#ffffff');
    rect(x-9,y-8,18,15,'#f3fcff');rect(x-12,y+5,7,7,'#f3fcff');rect(x-3,y+5,7,9,'#f3fcff');rect(x+6,y+5,7,6,'#f3fcff');
    rect(x-6,y-5,4,6,'#494d87');rect(x+4,y-5,4,6,'#494d87');rect(x-5,y-5,1,2,'#ffffff');rect(x+5,y-5,1,2,'#ffffff');rect(x,y+4,3,3,'#b4c4e7');
    rect(x-7,y-21,14,2,'#ffe595');rect(x-10,y-19,3,2,'#ffe595');rect(x+7,y-19,3,2,'#ffe595');
    if(!reduced)for(let i=0;i<3;i++)rect(x+Math.sin(g.age*3+i)*19,y+19+i*10,2,2,glow);
    ctx.restore();
  }
  function drawPlane(){
    if(!plane)return;ctx.save();ctx.translate(Math.round(plane.x-camera),Math.round(plane.y));ctx.scale(plane.dir,1);
    rect(-45,7,20,2,'#ffffff55');rect(-56,12,28,2,'#ffffff33');
    poly([[-36,-3],[-31,-18],[-22,-18],[-19,-2],[36,-2],[45,3],[36,10],[-30,10],[-40,6]],'#263451');
    rect(-26,0,61,7,'#f3be68');rect(-23,0,52,2,'#ffe7a5');rect(-21,7,50,3,'#ca7656');
    poly([[-6,1],[8,-22],[18,-22],[10,2]],'#658bd4');poly([[-8,8],[7,24],[17,24],[8,8]],'#3a5eae');
    rect(21,-4,11,5,'#9bf3ef');rect(23,-4,2,5,'#fff6cf');rect(-29,-15,5,10,'#f1798d');
    rect(42,-12,3,31,'#cad8e9');rect(41,Math.sin(plane.prop)*10-2,5,5,'#ffffff');rect(44,0,4,6,'#e9a45d');ctx.restore();
  }
  function drawCrate(c){
    if(c.taken)return;const x=c.x-camera,y=c.y;
    if(!c.landed){const sway=Math.sin(c.sway)*4;ctx.strokeStyle='#ffefce';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-22+sway,y-33);ctx.lineTo(x-6,y);ctx.moveTo(x+22+sway,y-33);ctx.lineTo(x+6,y);ctx.moveTo(x+sway,y-48);ctx.lineTo(x,y);ctx.stroke();
      poly([[x-26+sway,y-32],[x-22+sway,y-44],[x-12+sway,y-52],[x+12+sway,y-52],[x+22+sway,y-44],[x+26+sway,y-32]],'#fff0b7');
      rect(x-9+sway,y-51,18,19,c.type==='health'?'#f47595':'#56bced');rect(x-24+sway,y-34,48,3,'#3c4264');
    }
    rect(x-12,y,24,22,'#343653');rect(x-10,y+2,20,18,c.type==='health'?'#ff6e8b':'#ffc65e');rect(x-9,y+3,18,3,c.type==='health'?'#ffb1b4':'#fff09b');
    rect(x-11,y+15,22,4,c.type==='health'?'#b7446d':'#bb7b44');rect(x-8,y+4,3,15,'#f8e7bc');rect(x+6,y+4,3,15,'#f8e7bc');
    if(c.type==='health'){rect(x-2,y+7,5,9,'#ffffff');rect(x-4,y+9,9,4,'#ffffff');}else{rect(x-1,y+6,4,10,'#545981');rect(x-2,y+8,6,5,'#545981');}
  }
  function aimPreview(){
    if(!canAct())return{kind:'none',points:[]};
    const rad=angle*Math.PI/180;return{kind:'direction',points:Array.from({length:3},(_,i)=>({x:current.x+Math.cos(rad)*(20+i*8),y:current.y-19-Math.sin(rad)*(20+i*8)}))};
  }
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
    rect(x-8,y-9,width+16,29,'#11272bba');
    for(let i=0;i<width;i+=2){const h=(HEIGHT-terrain[Math.floor(i/width*(WORLD-1))])*.065;rect(x+i,y+10-h,2,h,'#70876a');}
    soldiers.filter(s=>s.hp>0&&s.placed).forEach(s=>rect(x+s.x/WORLD*width-2,y+2,4,4,s.team?'#efac88':'#d9ee8b'));
    ctx.strokeStyle='#d3e6c6aa';ctx.strokeRect(Math.round(x+camera/WORLD*width),y-6,Math.round(view/WORLD*width),22);
  }
  function draw(){
    ctx.setTransform(1,0,0,1,0,-offsetY);
    const target=manualCamera??(state==='deployment'?(deploymentTeam?900:300):projectile?projectile.x:current?.x??600);
    const desired=clamp(target-view/2,0,WORLD-view);camera=paused||sling?camera:lerp(camera,desired,reduced?1:.075);camera=clamp(camera,0,WORLD-view);
    const baseY=Math.min(170,Math.max(0,HEIGHT-canvas.height)),focusY=Math.max(projectile?.y??0,current?.y??0),targetY=clamp(Math.max(baseY,focusY-canvas.height+60),baseY,Math.max(baseY,HEIGHT-canvas.height));
    if(!paused&&!sling)offsetY=lerp(offsetY,targetY,reduced?1:.1);
    background();drawTerrain();
    if(state==='deployment')drawDeployment();
    const preview=aimPreview();
    if(preview.kind!=='none'){
      drawPath(preview.points,'#fff8bddd',false);
    }
    drawPlane();crates.forEach(drawCrate);
    soldiers.forEach(drawSoldier);
    if(projectile){drawPath(path.slice(-18).filter((_,i)=>i%4===0),'#fff3c680',false);ctx.save();ctx.translate(projectile.x-camera,projectile.y);ctx.rotate(Math.atan2(projectile.vy,projectile.vx));rect(-7,-2,13,4,'#e9eec2');rect(-12,-1,5,2,'#ffba65');rect(3,-2,3,4,'#f3ab79');ctx.restore();if(projectile.y<offsetY+10){ctx.fillStyle='#e7efbc';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText('↑ PROJÉTIL',clamp(projectile.x-camera,60,view-60),offsetY+60);}}
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
  function moveSling(e){if(!sling||sling.id!==e.pointerId||!canAct())return;const aim=slingshotAim(sling.x-e.clientX,e.clientY-sling.y);sling.tipX=e.clientX;sling.tipY=e.clientY;sling.valid=aim.valid;if(aim.valid){angle=aim.angle;power=aim.power;}sync();}
  function endSling(e,cancel=false){if(!sling||sling.id!==e.pointerId)return;if(cancel){cancelSling();return;}moveSling(e);const saved=sling,valid=sling.valid;sling=null;if(valid&&canAct())fire();else{angle=saved.oldAngle;power=saved.oldPower;sync();notify('Puxe para trás e para baixo; solte para disparar.');}}
  function drawSling(){
    if(!sling)return;const r=canvas.getBoundingClientRect(),sx=view/r.width,sy=canvas.height/r.height;
    const x=(sling.x-r.left)*sx,y=(sling.y-r.top)*sy+offsetY,tx=(sling.tipX-r.left)*sx,ty=(sling.tipY-r.top)*sy+offsetY;
    ctx.strokeStyle=sling.valid?'#ffdc8b':'#bacac8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(tx,ty);ctx.lineTo(x+6,y);ctx.stroke();rect(x-8,y-3,4,8,'#986b47');rect(x+4,y-3,4,8,'#986b47');rect(tx-4,ty-4,8,8,'#fff2b4');
    const label=sling.valid?`${Math.round(power)}% · ${Math.round(angle)}° · SOLTE!`:'PUXE PARA BAIXO E PARA TRÁS';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillStyle='#182a40';ctx.fillText(label,clamp(tx,105,view-105)+1,clamp(ty-18,offsetY+80,HEIGHT-65)+1);ctx.fillStyle='#fff0bf';ctx.fillText(label,clamp(tx,105,view-105),clamp(ty-18,offsetY+80,HEIGHT-65));
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    if((!canAct()&&state!=='deployment')||paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*view,y=(e.clientY-r.top)/r.height*canvas.height+offsetY;
    const mw=Math.min(250,view*.5),mx=(view-mw)/2;
    if(y>offsetY+canvas.height-42&&x>=mx-8&&x<=mx+mw+8){manualCamera=clamp((x-mx)/mw*WORLD,0,WORLD);return;}
    if(state==='deployment'){placeSoldier(x+camera);return;}
    if(sling||e.isPrimary===false)return;e.preventDefault();moving=0;sling={id:e.pointerId,x:e.clientX,y:e.clientY,tipX:e.clientX,tipY:e.clientY,oldAngle:angle,oldPower:power,valid:false};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',moveSling);
  canvas.addEventListener('pointerup',e=>endSling(e));
  ['pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,e=>endSling(e,true)));
  ['angle','power'].forEach(id=>$(id).addEventListener('input',()=>{angle=Number($('angle').value);power=Number($('power').value);sync();}));
  for(const [id,dir] of [['left',-1],['right',1]]){
    $(id).addEventListener('pointerdown',e=>{if(!canAct())return;e.preventDefault();moving=dir;$(id).setPointerCapture(e.pointerId);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(event=>$(id).addEventListener(event,()=>{moving=0;}));
  }
  function pause(){if(!['playing','deployment'].includes(state)||paused)return;cancelSling();paused=true;moving=0;held.clear();$('pause-modal').showModal();sync();}
  function resume(){closeDialogs();paused=false;sync();}
  function showMenu(){cancelSling();closeDialogs();state='menu';paused=false;phase='aim';moving=0;held.clear();$('menu').showModal();sync();}
  function showTutorial(){cancelSling();if(['playing','deployment'].includes(state)){paused=true;moving=0;held.clear();}$('tutorial-modal').showModal();}
  $('close-tutorial').onclick=()=>{$('tutorial-modal').close();if(['playing','deployment'].includes(state)&&!$('pause-modal').open){paused=false;sync();}};
  $('tutorial').onclick=showTutorial;$('help').onclick=showTutorial;
  $('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;
  $('next-stage').onclick=nextStage;
  $('pause').onclick=pause;$('resume').onclick=resume;$('ready').onclick=resume;
  $('exit').onclick=showMenu;$('result-menu').onclick=showMenu;$('fire').onclick=fire;
  for(let i=0;i<3;i++)$('deploy-'+i).onclick=()=>selectPlacement(i);
  $('deploy-place').onclick=()=>placeSoldier(Number($('deploy-position').value));
  $('deploy-confirm').onclick=confirmDeployment;
  $('restore').onclick=()=>{if(canAct()&&previous){angle=previous.angle;power=previous.power;sync();notify('Ângulo e força do último tiro restaurados.');}};
  $('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Desativar som':'Ativar som');$('sound').title=sound?'Desativar som':'Ativar som';$('sound').style.color=sound?'var(--lime)':'';tone(520,.1,'triangle');};
  $('mode').addEventListener('change',()=>{$('difficulty').disabled=$('mode').value==='local';});
  $('difficulty').disabled=$('mode').value==='local';
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,select'))return;
    if(e.key.toLowerCase()==='m'){$('sound').click();return;}
    if(e.key==='Escape'&&sling){cancelSling();return;}
    if(e.key.toLowerCase()==='p'||e.key==='Escape'){if($('pause-modal').open)resume();else if(!document.querySelector('dialog[open]'))pause();return;}
    if(!canAct())return;
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
    const box=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    box(0,0,320,440,'#6674c8');box(0,100,320,340,'#9b9bdb');box(0,180,320,260,'#f3b5a5');
    box(205,66,56,56,'#fff2ae');box(198,77,70,34,'#fff2ae');
    for(let i=0;i<5;i++){box(i*83-20,100+i%2*35,59,6,'#e5daea');box(i*83,94+i%2*35,25,6,'#e5daea');}
    for(let x=0;x<320;x+=4){const y=240+Math.sin(x/60)*25;box(x,y,4,440-y,'#637fa6');const y2=295+Math.sin(x/55+3)*20;box(x,y2,4,440-y2,'#367f87');const y3=362+Math.sin(x/58)*17;box(x,y3,4,440-y3,'#439c72');box(x,y3,4,5,'#bce97a');}
    // Hero models, scaled by whole pixels to preserve the sprite grid.
    g.drawImage(sprites[1][1],184,244,96,104);g.drawImage(sprites[0][0],54,231,120,130);
    box(38,391,244,3,'#f8d88d');g.fillStyle='#fff2bf';g.font='bold 11px monospace';g.textAlign='center';g.fillText('DOIS TIROS. UMA LENDA.',160,416);
  }
  generate();resize();paintMenu();sync();$('menu').showModal();requestAnimationFrame(frame);
})();
