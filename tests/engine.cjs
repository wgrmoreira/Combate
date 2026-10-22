const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
const elements=new Map();const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
function element(id){if(!elements.has(id))elements.set(id,{id,value:id==='mode'?'solo':id==='difficulty'?'normal':'',open:false,style:{},classList:{add(){},remove(){}},events:{},addEventListener(type,fn){(this.events[type] ||= []).push(fn)},setPointerCapture(){},getContext:()=>context,getBoundingClientRect:()=>({width:1200,height:540,left:0,top:0}),setAttribute(){},replaceChildren(){},showModal(){this.open=true},close(){this.open=false},matches:()=>false});return elements.get(id);}
const document={getElementById:element,createElement:()=>element('temp'+Math.random()),querySelectorAll:selector=>selector.includes('open')?[...elements.values()].filter(e=>e.open):['menu','tutorial-modal','pause-modal','result','handoff'].map(element),querySelector:()=>null,addEventListener(){}};
const sandbox={console,Math,Date,document,window:{addEventListener(){}},navigator:{},matchMedia:()=>({matches:true}),localStorage:{getItem:()=>null,setItem(){}},ResizeObserver:class{observe(){}},requestAnimationFrame(){}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..','arcade-art.js'),'utf8'),sandbox);vm.runInContext(fs.readFileSync(require("node:path").join(__dirname,"..","war-assets.js"),"utf8"),sandbox);
const src=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8').replace(/\}\)\(\);\s*$/,`globalThis.test={planAiMove,updateAiMovement,moveCurrent,cancelWalk,canvasPoint,onActiveSoldier,barrierImpact,impact,integrate,start,placeSoldier,selectPlacement,confirmDeployment,nextStage,nextTurn,resize,setAimMode,updateAmbient,ambientBlast,backdropGlow,aiPrecision,slingshotAim,moveSling,endSling,cancelSling,environment,nightAmount,accuracy,scoreFor,update,fire,ai,trajectory,burst,finish,draw,pause,resume,generate,move,aimPreview,updateSupplies,read:()=>({walkTouch,aiMove,offsetY,barrier,combatFx,state,phase,team,actions,angle,power,previous,projectile,soldiers,terrain,wind,round,fuel,seed,current,elapsed,ghosts,plane,crates,supplyCount,pendingFlights,shots,deploymentTeam,selectedSoldier,stats,stageStats,level,canAdvance,raining,WORLD,sling,sound,aimMode,impactFocus,ambient,camera,view}),set:(a,p)=>{angle=a;power=p},local:()=>{mode='local'},ready:()=>{paused=false},step:STEP};})();`);
vm.runInContext(src,sandbox);const t=sandbox.test;
assert.ok(element('splash').open,'Illustrated opening is the initial screen');assert.equal(element('menu').open,false);
element('enter-menu').onclick();assert.equal(element('splash').open,false);assert.ok(element('menu').open,'Start opens separate configuration');
element('back-splash').onclick();assert.ok(element('splash').open);assert.equal(element('menu').open,false);

function beginGame(){t.start();for(const x of [120,240,380])assert.ok(t.placeSoldier(x));t.confirmDeployment();if(t.read().state==='deployment'){t.ready();for(const x of [820,950,1080])assert.ok(t.placeSoldier(x));t.confirmDeployment();}assert.equal(t.read().state,'playing');}
const stepUntil=(predicate,max=1800)=>{for(let i=0;i<max;i++){if(predicate())return;t.update(t.step);}assert.ok(predicate(),'Timed out waiting for engine transition');};
t.start();assert.equal(t.read().state,'deployment');assert.equal(t.read().soldiers.filter(s=>s.team===0&&s.placed).length,0);
t.confirmDeployment();assert.equal(t.read().state,'deployment');assert.equal(t.placeSoldier(700),false,'Cannot place in enemy territory');assert.ok(t.placeSoldier(100));assert.equal(t.placeSoldier(120),false,'Soldiers need separation');assert.ok(t.placeSoldier(230));assert.ok(t.placeSoldier(400));t.selectPlacement(0);assert.ok(t.placeSoldier(165));assert.equal(t.read().soldiers[0].x,165);t.confirmDeployment();assert.equal(t.read().state,'playing');
beginGame();assert.equal(t.read().soldiers.length,6);assert.equal(t.read().actions,2);
const seeds=new Set();for(let i=0;i<12;i++){t.generate();const s=t.read();seeds.add(s.seed);assert.equal(s.terrain.length,1200);assert.ok(s.terrain.every(y=>Number.isFinite(y)&&y>=255&&y<=465));}assert.equal(seeds.size,12);
beginGame();assert.equal(t.aimPreview().kind,'direction');assert.equal(t.aimPreview().points.length,3);t.set(48,91);const predicted=t.trajectory().at(-1);t.fire();assert.equal(t.read().phase,'flight');assert.ok(t.read().projectile.vx>0);assert.equal(t.aimPreview().kind,'none');
stepUntil(()=>t.read().phase==='settle');let s=t.read();const actual=s.previous.path.at(-1);assert.ok(Math.hypot(predicted.x-actual.x,predicted.y-actual.y)<.00001,'Preview and projectile follow identical physics');
stepUntil(()=>t.read().phase==='aim');s=t.read();assert.equal(s.actions,1);assert.equal(s.angle,48);assert.equal(s.power,91);assert.ok(s.previous.path.length>20);assert.equal(t.aimPreview().kind,'direction');assert.equal(t.aimPreview().points.length,3);
t.fire();stepUntil(()=>t.read().team===1);assert.equal(t.read().actions,2);assert.equal(t.read().previous,null);
stepUntil(()=>t.read().team===0,4000);assert.equal(t.read().round,2);
t.pause();const before=t.read().elapsed;for(let i=0;i<120;i++)t.update(t.step);assert.equal(t.read().elapsed,before);t.resume();
beginGame();s=t.read();const enemy=s.soldiers.find(p=>p.team===1),ground=s.terrain[Math.floor(enemy.x)];t.burst(enemy.x,enemy.y-10,60,false);assert.ok(enemy.hp<100);assert.ok(s.terrain[Math.floor(enemy.x)]>ground,'Explosion makes crater');
enemy.hp=1;t.burst(enemy.x,enemy.y-20,60,false);assert.equal(enemy.hp,0);assert.equal(t.read().ghosts.length,1);const ghost=t.read().ghosts[0],ghostY=ghost.y;
t.update(.1);assert.ok(ghost.y<ghostY,'Ghost rises after death');t.pause();const pausedY=ghost.y;t.update(.5);assert.equal(ghost.y,pausedY);t.resume();
t.burst(enemy.x,enemy.y-20,60,false);assert.equal(t.read().ghosts.length,1,'A dead soldier cannot spawn a second ghost');for(let i=0;i<500;i++)t.update(t.step);assert.equal(t.read().ghosts.length,0,'Ghost fades and expires');
beginGame();assert.equal(t.read().crates.length,0,'No preplaced crates');
for(let i=0;i<6000;i++)t.updateSupplies(t.step);assert.equal(t.read().plane,null,'Time alone cannot trigger an aircraft');assert.equal(t.read().supplyCount,0);
function harmlessShot(){t.set(90,80);t.fire();assert.equal(t.read().phase,'flight');stepUntil(()=>t.read().phase==='aim'||t.read().state==='ended',1500);if(t.read().team===1)t.local();t.ready();}
t.local();for(let i=0;i<5;i++)harmlessShot();assert.equal(t.read().shots,5);assert.equal(t.read().supplyCount,0,'No plane before six actual shots');
t.set(90,80);t.fire();assert.equal(t.read().shots,6);assert.equal(t.read().pendingFlights,1);t.updateSupplies(0);assert.equal(t.read().supplyCount,1,'First plane is scheduled by shot six');
for(let i=0;i<720&&t.read().crates.length<2;i++)t.updateSupplies(t.step);assert.equal(t.read().crates.length,2,'Plane releases both bonuses');assert.ok(t.read().crates.some(c=>!c.landed),'Parachute descent takes time');t.draw();
for(let i=0;i<1400;i++)t.updateSupplies(t.step);assert.ok(t.read().crates.every(c=>c.landed),'Crates land on terrain');
stepUntil(()=>t.read().phase==='aim');t.ready();
const landed=t.read().crates.find(c=>c.type==='health'),receiver=t.read().soldiers[0];landed.x=500;landed.y=t.read().terrain[500]-22;landed.landed=true;landed.taken=false;receiver.x=500;receiver.y=t.read().terrain[500];receiver.hp=40;t.update(t.step);assert.equal(receiver.hp,70);assert.ok(landed.taken,'Landed health crate can be collected');
for(let i=0;i<5;i++)harmlessShot();assert.equal(t.read().supplyCount,1,'Five more shots cannot trigger plane two');harmlessShot();assert.equal(t.read().shots,12);assert.equal(t.read().supplyCount,2,'Second plane is scheduled by shot twelve');
element('mode').value='local';beginGame();t.set(45,80);t.fire();stepUntil(()=>t.read().phase==='aim'&&t.read().actions===1);t.fire();stepUntil(()=>t.read().team===1);assert.ok(element('handoff').open);t.ready();
// Complete real matches using the ballistic solver for both teams; exercise elimination and results.
element('mode').value='solo';let results=[];
for(let game=0;game<4;game++){
 beginGame();let ticks=0,fireCount=0;
 while(t.read().state==='playing'&&ticks<120000){if(t.read().phase==='aim'&&t.read().team===0){t.ai();fireCount++;}t.update(t.step);ticks++;}
 assert.equal(t.read().state,'ended','Full match must reach victory');assert.ok(element('result').open);results.push({ticks,playerShots:fireCount,rounds:t.read().round});
}
// Scores credit enemy damage once per projectile, and credit every enemy eliminated.
beginGame();let scored=t.read();const foes=scored.soldiers.filter(s=>s.team===1);foes.forEach((s,i)=>{s.x=800+i*10;s.y=360;s.hp=1;});t.fire();const scoringShot=t.read().projectile;t.burst(810,338,60,false,scoringShot);
assert.equal(scored.stats[0].kills,3);assert.equal(scored.stats[0].hits,1);assert.equal(scored.stats[0].shots,1);assert.equal(t.scoreFor(scored.stats[0]),6000);
t.burst(810,338,60,false,scoringShot);assert.equal(scored.stats[0].hits,1);assert.equal(scored.stats[0].kills,3,'No double credit for dead targets');
assert.equal(t.scoreFor({kills:3,hits:2,shots:4}),4500);assert.equal(t.accuracy({hits:0,shots:0}),0);assert.equal(t.scoreFor({kills:0,hits:0,shots:0}),0);
// A win offers the next stage and keeps the campaign score. Trio and stage metrics reset.
assert.ok(t.finish());assert.ok(t.read().canAdvance);t.nextStage();assert.equal(t.read().level,2);assert.equal(t.read().state,'deployment');assert.equal(t.read().soldiers.filter(s=>s.team===1).length,6);assert.equal(t.read().stats[0].kills,3);assert.equal(t.read().stageStats[0].kills,0);assert.ok(t.read().soldiers.filter(s=>s.team===0).every(s=>s.hp===100));assert.equal(t.read().shots,1);
assert.equal(t.aiPrecision(1),50);assert.equal(t.aiPrecision(2),53);assert.equal(t.aiPrecision(3),56);assert.equal(t.aiPrecision(100),95);
for(const x of [120,240,380])t.placeSoldier(x);t.confirmDeployment();for(let i=0;i<7;i++)t.nextTurn();assert.equal(t.read().team,1);assert.equal(t.read().current.index,3,'Enemy roster rotates beyond the original three');t.draw();
for(let goal=3;goal<=5;goal++){t.read().soldiers.filter(s=>s.team===1).forEach(s=>s.hp=0);t.finish();t.nextStage();assert.equal(t.read().level,goal);assert.equal(t.read().soldiers.filter(s=>s.team===1).length,goal*3);assert.equal(t.placeSoldier(590),false,'Player territory stays on the left when the map grows');}
assert.ok(t.read().WORLD>1200);assert.equal(t.read().terrain.length,t.read().WORLD);
// Friendly fire and enemy self-elimination never count as player kills/accuracy.
beginGame();t.fire();const own=t.read().soldiers[0];own.hp=1;t.burst(own.x,own.y-22,60,false,t.read().projectile);assert.equal(t.read().stats[0].kills,0);assert.equal(t.read().stats[0].hits,0);
// Pulling left/down shoots right/up; farther pull increases power, release fires once.
beginGame();const weak=t.slingshotAim(35,35),strong=t.slingshotAim(90,90);assert.equal(weak.angle,45);assert.ok(strong.power>weak.power);assert.equal(t.slingshotAim(-40,40).angle,135);assert.equal(t.slingshotAim(3,3).valid,false);assert.equal(t.slingshotAim(90,-10).valid,false);
function finger(x,y,id){const s=t.read(),r=element('battle').getBoundingClientRect();return{clientX:(x-s.camera)/s.view*r.width,clientY:(y-s.offsetY)/element('battle').height*r.height,pointerId:id,preventDefault(){}};}
function activeFinger(id){const c=t.read().current;return finger(c.x,c.y-25,id);}
const down=element('battle').events.pointerdown[0];let grab=activeFinger(7);down(grab);let pull={...grab,clientX:grab.clientX-80,clientY:grab.clientY+80};t.moveSling(pull);assert.equal(t.read().shots,0,'Pulling does not fire until release');t.endSling(pull);assert.equal(t.read().shots,1);t.endSling({clientX:320,clientY:280,pointerId:7});assert.equal(t.read().shots,1,'Release cannot fire twice');
beginGame();const oldAim=t.read().angle;grab=activeFinger(8);down(grab);t.moveSling({...grab,clientX:grab.clientX-60,clientY:grab.clientY+90});t.endSling({pointerId:8},true);assert.equal(t.read().shots,0);assert.equal(t.read().angle,oldAim);assert.equal(t.read().sling,null);
// Every stage runs a 100-second morning/day/afternoon/night cycle, frozen on pause.
assert.equal(t.environment(0).name,'MANHÃ');assert.equal(t.environment(25).name,'DIA');assert.equal(t.environment(50).name,'TARDE');assert.equal(t.environment(75).name,'NOITE');assert.equal(t.environment(100).name,'MANHÃ');assert.equal(t.nightAmount(t.environment(75)),1);
t.update(25);assert.equal(t.environment().name,'DIA');t.pause();t.update(60);assert.equal(t.environment().name,'DIA');t.resume();
const rainStates=new Set();for(let i=0;i<50;i++){t.generate();rainStates.add(t.read().raining);}assert.equal(rainStates.size,2,'Weather generation can produce rainy and dry stages');t.draw();
// Manual sliders opt out of sling input, including dragging on the battlefield.
beginGame();assert.equal(t.read().sound,true,'Game defaults to sound enabled');element('angle').value=70;element('power').value=62;element('angle').events.input[0]();assert.equal(t.read().aimMode,'manual');assert.equal(t.read().angle,70);assert.equal(t.read().power,62);
down({clientX:400,clientY:200,pointerId:20,preventDefault(){}});t.moveSling({clientX:300,clientY:300,pointerId:20});t.endSling({clientX:300,clientY:300,pointerId:20});assert.equal(t.read().shots,0);assert.equal(t.read().sling,null);t.fire();assert.equal(t.read().shots,1,'Manual mode fires only by explicit command');
// Camera centers on every damaged soldier for a full 3 seconds, frozen while paused.
element('stage').getBoundingClientRect=()=>({width:400,height:540,left:0,top:0});t.resize();beginGame();const target=t.read().soldiers.find(s=>s.team===1);t.fire();Object.assign(t.read().projectile,{x:target.x,y:target.y-20,vx:0,vy:0,time:.2});t.update(t.step);
assert.equal(t.read().phase,'settle');assert.equal(t.read().impactFocus.target,target);assert.equal(t.read().impactFocus.remaining,3);assert.equal(t.read().actions,2);assert.ok(t.read().camera>300);t.draw();
for(let i=0;i<359;i++)t.update(t.step);assert.ok(t.read().impactFocus);assert.equal(t.read().actions,2);const remaining=t.read().impactFocus.remaining;t.pause();t.update(20);assert.equal(t.read().impactFocus.remaining,remaining);t.resume();t.update(t.step*2);assert.equal(t.read().impactFocus,null);assert.equal(t.read().actions,1);
// A fatal final hit must be observed before the result menu appears.
beginGame();const foes2=t.read().soldiers.filter(s=>s.team===1);foes2.slice(1).forEach(s=>s.hp=0);foes2[0].hp=1;t.fire();Object.assign(t.read().projectile,{x:foes2[0].x,y:foes2[0].y-20,vx:0,vy:0,time:.2});t.update(t.step);assert.equal(t.read().state,'playing');for(let i=0;i<359;i++)t.update(t.step);assert.equal(t.read().state,'playing');t.update(t.step*2);assert.equal(t.read().state,'ended');
// Distant war effects are cosmetic, bounded and brighter at night.
beginGame();const beforeStats=JSON.stringify(t.read().stats),hp=t.read().soldiers.map(s=>s.hp).join();let sawPlane=false,sawShell=false,sawNuclear=false,sawTracers=false;
for(let i=0;i<70*120;i++){t.updateAmbient(t.step);const a=t.read().ambient;sawPlane ||= a.aircraft.length>0;sawShell ||= a.shells.length>0;sawNuclear ||= a.blasts.some(b=>b.type==='nuclear');sawTracers ||= a.tracers.some(t=>t.age>=0&&t.vy<0);assert.ok(a.tracers.length<=42);}assert.ok(sawPlane&&sawShell&&sawNuclear&&sawTracers);assert.equal(JSON.stringify(t.read().stats),beforeStats);assert.equal(t.read().soldiers.map(s=>s.hp).join(),hp);assert.ok(t.read().ambient.blasts.length<=10);assert.ok(t.read().ambient.aircraft.length<=3);assert.ok(t.backdropGlow(1)>t.backdropGlow(0));t.draw();
const ambientTime=t.read().ambient.time;t.pause();t.update(3);assert.equal(t.read().ambient.time,ambientTime);t.resume();
// Larger undulations are present on each deployment side, with bounded slopes.
for(let run=0;run<24;run++){t.generate();const heights=t.read().terrain;for(const strip of [heights.slice(32,560),heights.slice(640,1168)]){assert.ok(Math.max(...strip)-Math.min(...strip)>95,'Each side needs substantial hills and valleys');}for(let x=1;x<heights.length;x++)assert.ok(Math.abs(heights[x]-heights[x-1])<12,'Walkable continuous slopes');}
// The physical wall catches both directions, fast segments, wire-height shots and undercuts.
beginGame();const wall=t.read().barrier;
for(const [x0,x1,hitX] of [[540,660,wall.left-2],[660,540,wall.right+2]]){const b={prevX:x0,prevY:230,x:x1,y:230,time:.3};assert.equal(t.impact(b),'wall');assert.equal(b.x,hitX);}
assert.equal(t.impact({prevX:540,prevY:150,x:660,y:150,time:.3}),null,'High arcs can clear the wire');
assert.equal(t.impact({prevX:540,prevY:wall.wireTop+3,x:660,y:wall.wireTop+3,time:.3}),'wall','Wire is part of the collision cap');
const fast={x:540,y:230,vx:1500,vy:0,time:0};t.integrate(fast,.15);assert.equal(t.impact(fast),'wall','No tunneling through the wall');
t.burst(600,220,85,false,null);assert.equal(t.impact({prevX:540,prevY:500,x:660,y:500,time:.3}),'wall','Crater cannot make a tunnel beneath the wall');assert.equal(wall.top,200,'Wall remains intact');t.draw();
// Soldiers cannot cross the central fortification in either direction.
beginGame();let mover=t.read().current;mover.x=wall.left-15;mover.y=t.read().terrain[Math.floor(mover.x)];let oldX=mover.x;down(finger(mover.x+60,mover.y-20,91));t.move(.2);assert.equal(mover.x,oldX);
t.local();t.nextTurn();t.ready();mover=t.read().current;mover.x=wall.right+15;mover.y=t.read().terrain[Math.floor(mover.x)];oldX=mover.x;down(finger(mover.x-60,mover.y-20,92));t.move(.2);assert.equal(mover.x,oldX);
// Every shot opportunity starts with the sling, even after a manual shot or a turn change.
beginGame();t.setAimMode('manual');t.fire();stepUntil(()=>t.read().phase==='aim',1800);assert.equal(t.read().actions,1);assert.equal(t.read().aimMode,'sling');t.setAimMode('manual');t.nextTurn();assert.equal(t.read().aimMode,'sling');
// A held pointer beside the active soldier walks and never arms a shot.
beginGame();let startX=t.read().current.x;down(finger(startX+90,t.read().current.y-20,101));assert.ok(t.read().walkTouch);assert.equal(t.read().sling,null);for(let i=0;i<20;i++)t.update(t.step);assert.ok(t.read().current.x>startX);assert.equal(t.read().shots,0);
element('battle').events.pointerup[0]({pointerId:101});const stopped=t.read().current.x;for(let i=0;i<20;i++)t.update(t.step);assert.equal(t.read().current.x,stopped);assert.equal(t.read().shots,0);assert.equal(t.read().walkTouch,null);
down(finger(stopped-80,t.read().current.y-20,102));assert.ok(t.read().walkTouch);element('battle').events.pointercancel[0]({pointerId:102});assert.equal(t.read().walkTouch,null);
// A gesture on an inactive ally remains movement, whereas the active soldier can aim.
const ally=t.read().soldiers.find(p=>p.team===0&&p!==t.read().current);down(finger(ally.x,ally.y-20,103));assert.equal(t.read().sling,null);element('battle').events.pointerup[0]({pointerId:103});
t.setAimMode('manual');grab=activeFinger(104);down(grab);assert.equal(t.read().aimMode,'sling');assert.ok(t.read().sling);t.endSling({pointerId:104},true);assert.equal(t.read().shots,0);
t.set(55,25);const lowCue=t.aimPreview().points.at(-1);t.set(55,100);assert.ok(t.aimPreview().points.at(-1).y<lowCue.y,'Power raises the short aiming cue');
// AI relocates before shooting, uses fuel, respects pause and finishes its move.
beginGame();t.nextTurn();t.ready();const plan=t.planAiMove();assert.ok(plan);const enemyStart=t.read().current.x;for(let i=0;i<48;i++)t.update(t.step);assert.notEqual(t.read().current.x,enemyStart);assert.ok(t.read().fuel<100);assert.equal(t.read().phase,'aim');const aiX=t.read().current.x;t.pause();t.update(1);assert.equal(t.read().current.x,aiX);t.resume();stepUntil(()=>!t.read().aiMove,600);assert.ok(t.read().current.x>t.read().barrier.right+14);t.draw();
// Combat effects share the paused simulation clock and expire independently of turns.
beginGame();t.fire();assert.ok(t.read().combatFx.some(f=>f.type==='muzzle'));t.pause();const flashAge=t.read().combatFx[0].age;t.update(2);assert.equal(t.read().combatFx[0].age,flashAge);t.resume();t.update(.21);assert.ok(!t.read().combatFx.some(f=>f.type==='muzzle'));
t.burst(600,250,60,false,null);const expiryBlast=t.read().combatFx.findLast(f=>f.type==='explosion');assert.ok(expiryBlast);t.update(1.2);assert.ok(!t.read().combatFx.includes(expiryBlast),'The original explosion expires even when another projectile impacts');t.draw();
console.log(JSON.stringify({passed:true,checks:['active-soldier-only sling gestures','held side-touch movement, release and cancel','power-responsive aiming cue','AI relocation, fuel and paused movement','larger hills on both deployment sides','solid central wall, wire and swept collision','wall blocks soldier movement','sling reset for every shot and turn','opening to configuration navigation','bounded upward tracer bursts','campaign, score, formation and complete battles','slingshot gestures and explicit manual-control mode','sound enabled by default','3-second impact camera with paused timer','final elimination observed before result dialog','pixel asset atlas and animated distant war','planes, anti-aircraft shells and occasional nuclear cloud','background effects do not affect health or score','stronger glow at night and bounded effects','100-second day cycle, random rain and render smoke test'],matches:results},null,2));

