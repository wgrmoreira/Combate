'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('battle'), ctx = canvas.getContext('2d');
  const WORLD = 1200, HEIGHT = 540, GRAVITY = 300, STEP = 1 / 120;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const themes = [
    {name:'VALE ESMERALDA', sky:['#294c58','#759a8c'], far:'#365d63', mid:'#386b67', near:'#2c514d', grass:'#a5bf68', edge:'#667c47', soil:'#435445', deep:'#293c38', fleck:'#6b7855', sun:'#e9d59c'},
    {name:'FRONTEIRA ÂMBAR', sky:['#443c59','#c78777'], far:'#695464', mid:'#7e6265', near:'#655657', grass:'#dbb77b', edge:'#a08055', soil:'#705a49', deep:'#453e38', fleck:'#aa8561', sun:'#ffd39b'},
    {name:'SERRA BOREAL', sky:['#253e60','#91b6c0'], far:'#506885', mid:'#577b88', near:'#345567', grass:'#d0e4d9', edge:'#92b7ba', soil:'#526a72', deep:'#2c4656', fleck:'#839a9e', sun:'#e6f1d6'},
    {name:'DUNAS DO OCASO', sky:['#5e434c','#dca680'], far:'#886969', mid:'#a1806c', near:'#796855', grass:'#e0c38a', edge:'#b49a66', soil:'#8b7353', deep:'#514c3d', fleck:'#b39a6c', sun:'#ffe2a6'}
  ];
  const sprite = [
    '......HHHHHH......', '.....HLLLLLLH.....', '....HLLLLLLLLH....',
    '....HHHHHHHHHH....', '.....SKKSSKS......', '.....SSSSSSS......',
    '......SSSSS.......', '....DDDDDDDD......', '...DCCCDCCCDD.....',
    '..SDCCCDCCCDSS....', '..SSCCCDCCCDSS....', '...DCCCCCCCCD.....',
    '...DCCDDDDCCD.....', '...DDDDDDDDDD.....', '....CCC..CCC......',
    '....CCC..CCC......', '...DBBB..BBBD.....', '...DDDD..DDDD.....'
  ];
  const sprites = [0,1].map(team => {
    const c = document.createElement('canvas'); c.width=18; c.height=18;
    const g=c.getContext('2d');
    const palette = {H:'#172a2b',L:team?'#bf7768':'#a5bf68',S:'#e6b58c',K:'#25353a',D:'#243637',C:team?'#a65953':'#67865a',B:'#18272c'};
    sprite.forEach((line,y)=>[...line].forEach((p,x)=>{if(palette[p]){g.fillStyle=palette[p];g.fillRect(x,y,1,1);}}));
    return c;
  });
  let state='menu', paused=false, terrain=[], soldiers=[], team=0, current=null, actions=2, fuel=100;
  let round=1, turnCount=0, seed=0, random, theme=themes[0], biome=0, wind=0;
  let angle=55, power=65, previous=null, projectile=null, path=[], particles=[], floats=[], crates=[];
  let camera=0, view=1200, offsetY=0, manualCamera=null, moving=0, held=new Set(), aimPointer=null;
  let phase='aim', wait=0, aiTimer=0, elapsed=0, shots=0, damage=0, toastTime=0, last=0, accumulator=0;
  let mode='solo', difficulty='normal', sound=false, audio=null, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const roster=[['ATLAS','ECHO','NOVA'],['FALCÃO','BRASA','ÔNIX']];
  const selection=[0,0];
  function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function read(key,fallback){try{return localStorage.getItem('combate16-'+key)||fallback;}catch{return fallback;}}
  function save(key,value){try{localStorage.setItem('combate16-'+key,value);}catch{/* Storage can be disabled in private browsers. */}}
  $('mode').value=read('mode','solo'); $('difficulty').value=read('difficulty','normal');
  function tone(freq=240,duration=.12,type='square',volume=.035){
    if(!sound)return;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.3),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{/* Sound is optional. */}
  }
  function notify(text,time=2.6){$('toast').textContent=text;$('toast').classList.add('show');toastTime=time;}
  function resize(){const r=$('stage').getBoundingClientRect();view=Math.min(Math.round(r.width/r.height*HEIGHT),1200);canvas.width=view;canvas.height=Math.round(view*r.height/r.width);offsetY=HEIGHT-canvas.height;ctx.imageSmoothingEnabled=false;}
  new ResizeObserver(resize).observe($('stage'));
  function generate(){
    seed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;random=rng(seed);biome=Math.floor(random()*themes.length);theme=themes[biome];
    const p=random()*7,q=random()*8,r=random()*6;
    terrain=Array.from({length:WORLD},(_,x)=>clamp(378+Math.sin(x/175+p)*37+Math.sin(x/72+q)*18+Math.sin(x/32+r)*6,295,435));
    soldiers=[];selection[0]=selection[1]=0;
    for(let t=0;t<2;t++)for(let i=0;i<3;i++){
      const x=(t?865:115)+i*105+Math.floor(random()*30);
      const level=terrain[Math.floor(x)];for(let j=-19;j<=19;j++)terrain[Math.floor(x+j)]=lerp(terrain[Math.floor(x+j)],level,1-Math.abs(j)/24);
      soldiers.push({team:t,index:i,name:roster[t][i],x,y:level,hp:100,boost:false,face:t?-1:1,walk:0});
    }
    crates=[{x:460+random()*75,type:'health'},{x:660+random()*75,type:'power'}];
    wind=Math.round((random()-.5)*36);particles=[];floats=[];projectile=null;previous=null;manualCamera=null;
    $('biome-label').textContent=`0${biome+1} / ${theme.name}`;$('seed-label').textContent=`SEED ${seed.toString(16).toUpperCase()}`;
  }
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function start(){closeDialogs();mode=$('mode').value;difficulty=$('difficulty').value;save('mode',mode);save('difficulty',difficulty);generate();state='playing';paused=false;team=0;round=1;turnCount=0;elapsed=0;shots=0;damage=0;angle=55;power=65;beginTurn(false);tone(480,.16);}
  function isHuman(){return mode==='local'||team===0;}
  function canAct(){return state==='playing'&&!paused&&phase==='aim'&&isHuman()&&current?.hp>0;}
  function beginTurn(pass=true){
    const alive=soldiers.filter(s=>s.team===team&&s.hp>0);if(!alive.length){finish();return;}
    current=alive.find(s=>s.index>=selection[team])||alive[0];selection[team]=(current.index+1)%3;
    actions=2;fuel=100;previous=null;phase='aim';aiTimer=1.1;manualCamera=null;moving=0;held.clear();
    angle=team===0?55:125;power=65;
    if(pass&&mode==='local'){$('handoff-title').textContent=`${team===0?'Vanguarda':'Escarlate'}, sua vez.`;paused=true;$('handoff').showModal();}
    notify(`${current.name} em posição · 2 disparos`);sync();
  }
  function nextTurn(){team=1-team;turnCount++;round=1+Math.floor(turnCount/2);if(team===0)wind=Math.round(rand(-18,18));beginTurn();}
  function sync(){
    $('angle').value=angle;$('power').value=power;$('angle-value').value=`${Math.round(angle)}°`;$('power-value').value=`${Math.round(power)}%`;
    $('wind-label').textContent=`VENTO ${wind<0?'←':'→'} ${Math.abs(wind)}`;
    [0,1].forEach(t=>{$('health'+t).replaceChildren(...soldiers.filter(s=>s.team===t).map(s=>{const e=document.createElement('span');e.className=s.hp<=0?'dead':'';e.style.opacity=s.hp>0?Math.max(.25,s.hp/100):'';e.title=`${s.name}: ${Math.ceil(s.hp)} de vida`;return e;}));});
    $('round-label').textContent=`RODADA ${String(round).padStart(2,'0')}`;
    $('turn-label').textContent=state==='menu'?'PRONTO PARA O COMBATE?':`${team===0?'VANGUARDA':'ESCARLATE'} ${!isHuman()?' / IA':''}`;
    if(current){$('active-name').textContent=`${current.name} · ${Math.ceil(current.hp)} PV`;$('active-team').textContent=`${team===0?'VANGUARDA':'ESCARLATE'} / 0${current.index+1}`;}
    $('action-label').textContent=phase==='flight'?'Projétil em voo…':phase==='settle'?'Aguardando impacto…':`${actions} disparo${actions===1?'':'s'} ${actions===1?'disponível':'disponíveis'}`;
    $('fuel').textContent=`${Math.round(fuel)}%`;
    ['fire','angle','power','left','right'].forEach(id=>$(id).disabled=!canAct());$('restore').disabled=!canAct()||!previous;
    $('hint').textContent=view<700?'ARRASTE PARA MIRAR · TOQUE NO MINIMAPA PARA EXPLORAR':'ARRASTE PARA MIRAR · ← → MOVER · P PAUSAR';
  }
  function launch(s,a,p){
    const speed=230+p*4.3,rad=a*Math.PI/180;
    return{x:s.x+Math.cos(rad)*20,y:s.y-25-Math.sin(rad)*14,vx:Math.cos(rad)*speed,vy:-Math.sin(rad)*speed,time:0};
  }
  function integrate(b,dt){b.vx+=wind*dt;b.vy+=GRAVITY*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.time+=dt;}
  function impact(b){
    if(b.x<0||b.x>=WORLD||b.y>HEIGHT+100||b.time>9)return'out';
    if(b.y>=terrain[Math.floor(b.x)])return'ground';
    if(soldiers.some(s=>s.hp>0&&!(s===current&&b.time<.16)&&Math.abs(s.x-b.x)<11&&b.y>s.y-33&&b.y<s.y+2))return'soldier';
    return null;
  }
  function trajectory(a=angle,p=power,s=current,record=true){
    if(!s)return[];const b=launch(s,a,p),points=[{x:b.x,y:b.y}];
    for(let i=0;i<1080;i++){integrate(b,STEP);if(record&&i%7===0)points.push({x:b.x,y:b.y});if(impact(b)){if(record)points.push({x:b.x,y:b.y});break;}}
    return record?points:b;
  }
  function fire(){
    if(!canAct()&&!(state==='playing'&&!paused&&!isHuman()&&phase==='aim'))return;
    projectile=launch(current,angle,power);projectile.boost=current.boost;current.boost=false;current.face=projectile.vx>0?1:-1;
    path=[{x:projectile.x,y:projectile.y}];previous={angle,power,path:[]};phase='flight';shots++;manualCamera=null;moving=0;tone(180,.15,'sawtooth');sync();
  }
  function burst(x,y,radius,boost){
    const r=boost?radius*1.4:radius;
    for(let x2=Math.max(0,Math.floor(x-r));x2<Math.min(WORLD,x+r);x2++){
      const depth=y+Math.sqrt(Math.max(0,r*r-(x2-x)**2));terrain[x2]=clamp(Math.max(terrain[x2],depth),0,HEIGHT-35);
    }
    for(const s of soldiers){if(s.hp<=0)continue;const d=Math.hypot(s.x-x,s.y-15-y);if(d<r+26){const hit=Math.round((boost?105:82)*clamp(1-d/(r+26),.12,1));s.hp=Math.max(0,s.hp-hit);damage+=hit;floats.push({x:s.x,y:s.y-45,text:`−${hit}`,life:1.5,color:s.team?'#ffd1b5':'#e5efa4'});}}
    for(let i=0;i<(reduced?18:55);i++)particles.push({x,y,vx:rand(-170,170),vy:rand(-230,60),life:rand(.25,1),max:1,size:rand(2,9),color:i%3?'#edb66a':'#fff2ba'});
    particles.push({x,y,vx:0,vy:0,life:.32,max:.32,size:r,color:'#ffdf9b',ring:true});
    tone(65,.5,'sawtooth',.09);if(navigator.vibrate&&!reduced)navigator.vibrate(25);
  }
  function finish(){
    const alive=[0,1].map(t=>soldiers.some(s=>s.hp>0&&s.team===t));
    if(alive[0]&&alive[1])return false;
    state='ended';phase='ended';projectile=null;
    const winner=alive[0]?0:alive[1]?1:-1;
    $('result-title').textContent=winner<0?'Empate no horizonte.':mode==='solo'?(winner===0?'Missão cumprida.':'Reagrupar e tentar de novo.'):`${winner===0?'Vanguarda':'Escarlate'} venceu.`;
    $('result-copy').textContent=winner<0?'Os dois esquadrões foram eliminados.':`${winner===0?'Vanguarda':'Escarlate'} conquistou o campo em ${round} rodada${round>1?'s':''}.`;
    $('result-stats').textContent=`${shots} disparos · ${damage} de dano total · ${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s`;
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
    const error=difficulty==='easy'?9:difficulty==='hard'?1.1:3.4;
    angle=clamp(best.a+rand(-error,error),10,170);power=clamp(best.p+rand(-error*.4,error*.4),20,100);fire();
  }
  function move(dt){
    if(!canAct())return;
    const dir=moving||(held.has('ArrowRight')||held.has('d')?1:0)-(held.has('ArrowLeft')||held.has('a')?1:0);
    if(!dir||fuel<=0)return;
    const x=clamp(current.x+dir*62*dt,22,WORLD-22),y=terrain[Math.floor(x)];
    if(current.y-y>22||soldiers.some(s=>s!==current&&s.hp>0&&Math.abs(s.x-x)<25))return;
    current.x=x;current.face=dir;current.walk+=dt*12;fuel=Math.max(0,fuel-dt*29);manualCamera=null;$('fuel').textContent=`${Math.round(fuel)}%`;
  }
  function update(dt){
    if(paused)return;
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(!p.ring)p.vy+=220*dt;}
    floats=floats.filter(f=>f.life>0);for(const f of floats){f.life-=dt;f.y-=22*dt;}
    if(state!=='playing')return;elapsed+=dt;move(dt);
    for(const s of soldiers){if(s.hp<=0)continue;s.y=Math.min(terrain[Math.floor(s.x)],s.y+140*dt);for(const c of crates){if(!c.taken&&Math.abs(s.x-c.x)<22){c.taken=true;if(c.type==='health')s.hp=Math.min(100,s.hp+30);else s.boost=true;notify(c.type==='health'?`${s.name} recuperou 30 PV`:`${s.name}: próximo tiro reforçado`);tone(700,.2,'triangle');sync();}}}
    if(phase==='flight'&&projectile){
      integrate(projectile,dt);path.push({x:projectile.x,y:projectile.y});const hit=impact(projectile);
      if(hit){const b=projectile;previous.path=path.slice();if(hit!=='out')burst(b.x,b.y,60,b.boost);else notify('Fora do campo. Corrija a força e o ângulo.');projectile=null;phase='settle';wait=.85;sync();}
    }else if(phase==='settle'){wait-=dt;if(wait<=0)completeShot();}
    else if(!isHuman()&&phase==='aim'){aiTimer-=dt;if(aiTimer<=0)ai();}
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
  function background(){
    const g=ctx.createLinearGradient(0,0,0,410);g.addColorStop(0,theme.sky[0]);g.addColorStop(1,theme.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,view,HEIGHT);
    const sunX=view*.72-camera*.04;rect(sunX,87,54,54,theme.sun);rect(sunX-7,96,68,34,theme.sun);
    for(let i=0;i<7;i++){const x=((i*203+seed%150)-camera*.09)%(view+220)-70,y=62+(i*47)%105;rect(x,y,74,7,'#e5e4c01c');rect(x+18,y-6,36,6,'#e5e4c01c');}
    for(let layer=0;layer<3;layer++){
      const pts=[[0,HEIGHT]];const base=225+layer*46;
      for(let x=-20;x<=view+20;x+=12){const wx=x+camera*(.12+layer*.14);let y=base+Math.sin(wx/(97-layer*12)+layer+seed%8)*37+Math.cos(wx/47)*13;pts.push([x,y]);}pts.push([view,HEIGHT]);poly(pts,[theme.far,theme.mid,theme.near][layer]);
    }
    for(let i=0;i<22;i++){
      const x=i*85-camera*.55-30,base=330+Math.sin(i*3)*24,size=35+i%3*12;
      if(biome===3){rect(x,base-size,6,size,theme.near);rect(x-7,base-size+12,7,5,theme.near);rect(x-10,base-size+2,4,15,theme.near);}else{rect(x,base-20,4,26,theme.near);for(let j=0;j<3;j++)poly([[x-13-j*4,base-j*11],[x+2,base-size-j*5],[x+17+j*4,base-j*11]],theme.near);}
    }
    if(biome===2)for(let i=0;i<28;i++)rect((i*59+elapsed*9)%(view+30),((i*41+elapsed*13)%340),2,2,'#dbe9de66');
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
    if(s.hp<=0){rect(s.x-camera-7,terrain[Math.floor(s.x)]-4,14,4,'#243633');return;}
    const x=s.x-camera,y=s.y;if(x<-40||x>view+40)return;
    ctx.save();ctx.globalAlpha=.25;rect(x-15,y-2,30,5,'#0c2023');ctx.restore();
    const active=s===current&&state==='playing',bounce=moving&&active?Math.sin(s.walk)*2:0;
    ctx.save();ctx.translate(Math.round(x),Math.round(y+bounce));if(s.face<0)ctx.scale(-1,1);ctx.drawImage(sprites[s.team],-18,-36,36,36);rect(6,-19,25,5,'#172c30');rect(8,-20,12,2,'#7c8b7e');rect(22,-18,10,2,'#a3b09a');ctx.restore();
    rect(x-17,y-49,34,4,'#14282a');rect(x-17,y-49,34*s.hp/100,3,s.team?'#eca382':'#cbe484');
    ctx.font='8px Consolas, monospace';ctx.textAlign='center';ctx.fillStyle=active?'#f4f5d3':'#d8e5d0';ctx.fillText(s.name,Math.round(x),Math.round(y-56));
    if(active){poly([[x-5,y-73],[x+5,y-73],[x,y-67]],s.team?'#f2ad89':'#dfef99');if(phase==='aim'){ctx.strokeStyle=s.team?'#efad86':'#d4e887';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y+2,23,6,0,0,Math.PI*2);ctx.stroke();}}
    if(s.boost){ctx.fillStyle='#f4ca80';ctx.fillText('◆',x+24,y-38);}
  }
  function drawPath(points,color,dotted=true){ctx.fillStyle=color;for(let i=0;i<points.length;i+=dotted?2:1){const p=points[i];if(p.y<0)continue;rect(p.x-camera-1,p.y-1,2,2,color);}}
  function minimap(){
    const width=Math.min(250,view*.5),x=(view-width)/2,y=HEIGHT-30;
    rect(x-8,y-9,width+16,29,'#11272bba');
    for(let i=0;i<width;i+=2){const h=(HEIGHT-terrain[Math.floor(i/width*(WORLD-1))])*.065;rect(x+i,y+10-h,2,h,'#70876a');}
    soldiers.filter(s=>s.hp>0).forEach(s=>rect(x+s.x/WORLD*width-2,y+2,4,4,s.team?'#efac88':'#d9ee8b'));
    ctx.strokeStyle='#d3e6c6aa';ctx.strokeRect(Math.round(x+camera/WORLD*width),y-6,Math.round(view/WORLD*width),22);
  }
  function draw(){
    ctx.setTransform(1,0,0,1,0,-offsetY);
    const target=manualCamera??(projectile?projectile.x:current?.x??600);
    const desired=clamp(target-view/2,0,WORLD-view);camera=paused?camera:lerp(camera,desired,reduced?1:.075);camera=clamp(camera,0,WORLD-view);
    background();drawTerrain();
    if(previous?.path.length)drawPath(previous.path,'#d7e1d05c');
    if(canAct()){
      const points=trajectory();drawPath(points,'#ebf4c3b0');const end=points.at(-1);if(end&&end.x>=0&&end.x<WORLD&&end.y>=0){ctx.strokeStyle='#e3efae';ctx.lineWidth=1;ctx.strokeRect(Math.round(end.x-camera)-4,Math.round(end.y)-4,8,8);}
    }
    for(const c of crates){if(c.taken)continue;const x=c.x-camera,y=terrain[Math.floor(c.x)]-18;rect(x-9,y,18,18,'#243b38');rect(x-7,y+2,14,14,c.type==='health'?'#b9cf8b':'#dca270');rect(x-1,y+5,3,9,'#324a3e');if(c.type==='health')rect(x-4,y+8,9,3,'#324a3e');else rect(x-3,y+5,6,3,'#324a3e');}
    soldiers.forEach(drawSoldier);
    if(projectile){drawPath(path.filter((_,i)=>i%6===0),'#fff3c680',false);ctx.save();ctx.translate(projectile.x-camera,projectile.y);ctx.rotate(Math.atan2(projectile.vy,projectile.vx));rect(-7,-2,13,4,'#e9eec2');rect(-12,-1,5,2,'#ffba65');rect(3,-2,3,4,'#f3ab79');ctx.restore();if(projectile.y<offsetY+10){ctx.fillStyle='#e7efbc';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText('↑ PROJÉTIL',clamp(projectile.x-camera,60,view-60),offsetY+60);}}
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);if(p.ring){ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x-camera,p.y,p.size*(1-p.life/p.max)+4,0,Math.PI*2);ctx.stroke();}else rect(p.x-camera,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
    for(const f of floats){ctx.globalAlpha=Math.min(1,f.life*2);ctx.fillStyle=f.color;ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.fillText(f.text,f.x-camera,f.y);}ctx.globalAlpha=1;
    if(view<WORLD-20){
      for(const side of [-1,1]){const rivals=soldiers.filter(s=>s.hp>0&&(side<0?s.x<camera:s.x>camera+view));if(rivals.length){const x=side<0?18:view-18;ctx.fillStyle=rivals[0].team?'#f3b18d':'#d9ee8b';ctx.font='bold 12px monospace';ctx.textAlign=side<0?'left':'right';ctx.fillText(`${side<0?'◀':'▶'} ${rivals.length}`,x,270);}}
    }
    minimap();
  }
  function frame(time){const dt=Math.min(.1,(time-(last||time))/1000);last=time;accumulator+=dt;while(accumulator>=STEP){update(STEP);accumulator-=STEP;}draw();requestAnimationFrame(frame);}
  function aimFromPointer(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*view+camera,y=(e.clientY-r.top)/r.height*canvas.height+offsetY;const dx=x-current.x,dy=current.y-25-y;angle=clamp(Math.atan2(Math.max(8,dy),dx)*180/Math.PI,10,170);power=clamp((Math.hypot(dx,dy)-30)/4,20,100);sync();}
  canvas.addEventListener('pointerdown',e=>{
    if(!canAct())return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*view,y=(e.clientY-r.top)/r.height*canvas.height+offsetY;
    const mw=Math.min(250,view*.5),mx=(view-mw)/2;
    if(y>HEIGHT-42&&x>=mx-8&&x<=mx+mw+8){manualCamera=clamp((x-mx)/mw*WORLD,0,WORLD);return;}
    aimPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);aimFromPointer(e);
  });
  canvas.addEventListener('pointermove',e=>{if(aimPointer===e.pointerId&&canAct())aimFromPointer(e);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>{aimPointer=null;}));
  ['angle','power'].forEach(id=>$(id).addEventListener('input',()=>{angle=Number($('angle').value);power=Number($('power').value);sync();}));
  for(const [id,dir] of [['left',-1],['right',1]]){
    $(id).addEventListener('pointerdown',e=>{if(!canAct())return;e.preventDefault();moving=dir;$(id).setPointerCapture(e.pointerId);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(event=>$(id).addEventListener(event,()=>{moving=0;}));
  }
  function pause(){if(state!=='playing'||paused)return;paused=true;moving=0;held.clear();$('pause-modal').showModal();sync();}
  function resume(){closeDialogs();paused=false;sync();}
  function showMenu(){closeDialogs();state='menu';paused=false;phase='aim';moving=0;held.clear();$('menu').showModal();sync();}
  function showTutorial(){if(state==='playing'){paused=true;moving=0;held.clear();}$('tutorial-modal').showModal();}
  $('close-tutorial').onclick=()=>{$('tutorial-modal').close();if(state==='playing'&&!$('pause-modal').open){paused=false;sync();}};
  $('tutorial').onclick=showTutorial;$('help').onclick=showTutorial;
  $('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;
  $('pause').onclick=pause;$('resume').onclick=resume;$('ready').onclick=resume;
  $('exit').onclick=showMenu;$('result-menu').onclick=showMenu;$('fire').onclick=fire;
  $('restore').onclick=()=>{if(canAct()&&previous){angle=previous.angle;power=previous.power;sync();notify('Ângulo e força do último tiro restaurados.');}};
  $('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Desativar som':'Ativar som');$('sound').title=sound?'Desativar som':'Ativar som';$('sound').style.color=sound?'var(--lime)':'';tone(520,.1,'triangle');};
  $('mode').addEventListener('change',()=>{$('difficulty').disabled=$('mode').value==='local';});
  $('difficulty').disabled=$('mode').value==='local';
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,select'))return;
    if(e.key.toLowerCase()==='m'){$('sound').click();return;}
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
  window.addEventListener('blur',()=>{moving=0;held.clear();if(state==='playing'&&!document.querySelector('dialog[open]'))pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  // Native Escape must never dismiss a blocking handoff/result/menu or unpause physics silently.
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='pause-modal')resume();else if(d.id==='tutorial-modal')$('close-tutorial').click();}));
  generate();resize();sync();$('menu').showModal();requestAnimationFrame(frame);
})();
