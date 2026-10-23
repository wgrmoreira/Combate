'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
for(const name of ['capa-arcade.png','cenario-arcade.png','cidade-arcade.png','soldados-arcade.png','terreno-arcade.png','aeronaves-arcade.png','fim-arcade.png','deserto-arcade.png','montanhas-arcade.png','japao-arcade.png','cargueiro-arcade.png','vitoria-arcade.png']){
 const buf=fs.readFileSync(path.join(root,'assets',name));assert.equal(buf.subarray(1,4).toString(),'PNG');
 const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);assert.ok(w>=512&&h>=512,name+' must be a production raster');
 if(name==='cargueiro-arcade.png')assert.equal(buf[25],6,'Cargo plane alpha retained');
 if(name==='aeronaves-arcade.png'){assert.equal(w%2,0,'Aircraft sheet has two equal columns');assert.equal(buf[25],6,'Aircraft alpha retained');}
 if(name==='soldados-arcade.png'){assert.equal(w*2,h*3,'Six sprites must form a 3×2 sheet');assert.equal(buf[25],6,'Sprites must retain their alpha channel');}
}
const atlas=JSON.parse(fs.readFileSync(path.join(root,'assets','guerra-16bits.json')));
for(const [name,count] of [['explosion',8],['nuclear',8],['smoke',4],['plane',3],['muzzle',3],['crate',2],['tank',1]])assert.equal(atlas.frames[name].length,count,name);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Unique HTML IDs');
assert.ok(!ids.includes('left')&&!ids.includes('right'),'Side touch replaces movement buttons');
assert.ok(!ids.includes('aim-mode'),'No aim-mode toggle: each shot starts with the sling');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(scripts,['arcade-art.js','war-assets.js','game.js']);scripts.forEach(s=>assert.ok(fs.existsSync(path.join(root,s))));
for(const name of ['music-menu.mp3','music-game.mp3','music-end.mp3']){const buf=fs.readFileSync(path.join(root,'assets',name));assert.ok(buf.length>100000,name);assert.ok(buf.subarray(0,3).toString()==='ID3'||buf[0]===255,'MP3 header');}
assert.equal((html.match(/id="guide-scene"/g)||[]).length,1);assert.equal((html.match(/id="guide-tab-[0-3]"/g)||[]).length,4);assert.ok(fs.existsSync(path.join(root,"assets/Anton-Regular.ttf")));
console.log('Assets OK: twelve production PNGs and three supplied MP3s, transparent 3×2 soldier sheet, effect atlas, unique IDs and script load order.');
