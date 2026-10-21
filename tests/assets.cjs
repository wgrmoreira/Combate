'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
for(const name of ['capa-arcade.png','cenario-arcade.png','cidade-arcade.png','soldados-arcade.png','terreno-arcade.png']){
 const buf=fs.readFileSync(path.join(root,'assets',name));assert.equal(buf.subarray(1,4).toString(),'PNG');
 const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);assert.ok(w>=512&&h>=512,name+' must be a production raster');
 if(name==='soldados-arcade.png'){assert.equal(w*2,h*3,'Six sprites must form a 3×2 sheet');assert.equal(buf[25],6,'Sprites must retain their alpha channel');}
}
const atlas=JSON.parse(fs.readFileSync(path.join(root,'assets','guerra-16bits.json')));
for(const [name,count] of [['explosion',8],['nuclear',8],['smoke',4],['plane',3],['muzzle',3],['crate',2],['tank',1]])assert.equal(atlas.frames[name].length,count,name);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Unique HTML IDs');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(scripts,['arcade-art.js','war-assets.js','game.js']);scripts.forEach(s=>assert.ok(fs.existsSync(path.join(root,s))));
console.log('Assets OK: five production PNGs, transparent 3×2 soldier sheet, effect atlas, unique IDs and script load order.');
