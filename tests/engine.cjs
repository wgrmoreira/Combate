const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
const elements=new Map();const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
function element(id){if(!elements.has(id))elements.set(id,{id,value:id==='mode'?'solo':id==='difficulty'?'normal':'',open:false,style:{},classList:{add(){},remove(){}},events:{},addEventListener(type,fn){(this.events[type] ||= []).push(fn)},setPointerCapture(){},getContext:()=>context,getBoundingClientRect:()=>({width:1200,height:540,left:0,top:0}),setAttribute(){},replaceChildren(){},showModal(){this.open=true},close(){this.open=false},matches:()=>false});return elements.get(id);}
const document={getElementById:element,createElement:()=>element('temp'+Math.random()),querySelectorAll:selector=>selector.includes('open')?[...elements.values()].filter(e=>e.open):['menu','tutorial-modal','pause-modal','result','handoff'].map(element),querySelector:()=>null,addEventListener(){}};
const sandbox={console,Math,Date,document,window:{addEventListener(){}},navigator:{},matchMedia:()=>({matches:true}),localStorage:{getItem:()=>null,setItem(){}},ResizeObserver:class{observe(){}},requestAnimationFrame(){}};
vm.createContext(sandbox);
const src=fs.readFileSync(require('node:path').join(__dirname,'..','game.js'),'utf8').replace(/\}\)\(\);\s*$/,`globalThis.test={start,placeSoldier,selectPlacement,confirmDeployment,nextStage,nextTurn,aiPrecision,slingshotAim,moveSling,endSling,cancelSling,environment,nightAmount,accuracy,scoreFor,update,fire,ai,trajectory,burst,finish,draw,pause,resume,generate,move,aimPreview,updateSupplies,read:()=>({state,phase,team,actions,angle,power,previous,projectile,soldiers,terrain,wind,round,fuel,seed,current,elapsed,ghosts,plane,crates,supplyCount,pendingFlights,shots,deploymentTeam,selectedSoldier,stats,stageStats,level,canAdvance,raining,WORLD,sling}),set:(a,p)=>{angle=a;power=p},local:()=>{mode='local'},ready:()=>{paused=false},step:STEP};})();`);
vm.runInContext(src,sandbox);const t=sandbox.test;
function beginGame(){t.start();for(const x of [120,240,380])assert.ok(t.placeSoldier(x));t.confirmDeployment();if(t.read().state==='deployment'){t.ready();for(const x of [820,950,1080])assert.ok(t.placeSoldier(x));t.confirmDeployment();}assert.equal(t.read().state,'playing');}
const stepUntil=(predicate,max=1800)=>{for(let i=0;i<max;i++){if(predicate())return;t.update(t.step);}assert.ok(predicate(),'Timed out waiting for engine transition');};
t.start();assert.equal(t.read().state,'deployment');assert.equal(t.read().soldiers.filter(s=>s.team===0&&s.placed).length,0);
t.confirmDeployment();assert.equal(t.read().state,'deployment');assert.equal(t.placeSoldier(700),false,'Cannot place in enemy territory');assert.ok(t.placeSoldier(100));assert.equal(t.placeSoldier(120),false,'Soldiers need separation');assert.ok(t.placeSoldier(230));assert.ok(t.placeSoldier(400));t.selectPlacement(0);assert.ok(t.placeSoldier(165));assert.equal(t.read().soldiers[0].x,165);t.confirmDeployment();assert.equal(t.read().state,'playing');
beginGame();assert.equal(t.read().soldiers.length,6);assert.equal(t.read().actions,2);
const seeds=new Set();for(let i=0;i<12;i++){t.generate();const s=t.read();seeds.add(s.seed);assert.equal(s.terrain.length,1200);assert.ok(s.terrain.every(y=>Number.isFinite(y)&&y>=295&&y<=435));}assert.equal(seeds.size,12);
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
const down=element('battle').events.pointerdown[0];down({clientX:400,clientY:200,pointerId:7,preventDefault(){}});t.moveSling({clientX:320,clientY:280,pointerId:7});assert.equal(t.read().shots,0,'Pulling does not fire until release');t.endSling({clientX:320,clientY:280,pointerId:7});assert.equal(t.read().shots,1);t.endSling({clientX:320,clientY:280,pointerId:7});assert.equal(t.read().shots,1,'Release cannot fire twice');
beginGame();const oldAim=t.read().angle;down({clientX:400,clientY:200,pointerId:8,preventDefault(){}});t.moveSling({clientX:340,clientY:290,pointerId:8});t.endSling({pointerId:8},true);assert.equal(t.read().shots,0);assert.equal(t.read().angle,oldAim);assert.equal(t.read().sling,null);
// Every stage runs a 100-second morning/day/afternoon/night cycle, frozen on pause.
assert.equal(t.environment(0).name,'MANHÃ');assert.equal(t.environment(25).name,'DIA');assert.equal(t.environment(50).name,'TARDE');assert.equal(t.environment(75).name,'NOITE');assert.equal(t.environment(100).name,'MANHÃ');assert.equal(t.nightAmount(t.environment(75)),1);
t.update(25);assert.equal(t.environment().name,'DIA');t.pause();t.update(60);assert.equal(t.environment().name,'DIA');t.resume();
const rainStates=new Set();for(let i=0;i<50;i++){t.generate();rainStates.add(t.read().raining);}assert.equal(rainStates.size,2,'Weather generation can produce rainy and dry stages');t.draw();
console.log(JSON.stringify({passed:true,checks:['manual formation and local duel','hidden trajectory on both shots','ballistic physics, craters and damage','pause and ghost lifecycle','supply flights at six and twelve shots','four completed battles','kills, precision, combined score and friendly-fire attribution','cumulative campaign score, fresh trio and per-stage metrics','stages 1–5 with 3, 6, 9, 12, 15 enemies','growing map and fixed player territory','enemy turn rotation beyond three soldiers','AI precision starts at 50%, rises 3 percentage points, caps at 95%','slingshot angle, power, release, cancellation and duplicate release','100-second day cycle and paused clock','random rainy and dry stages','render smoke test'],matches:results},null,2));
