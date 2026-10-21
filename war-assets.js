/* Original military arcade effects. Exported PNG and embedded fallback use this source. */
'use strict';
globalThis.Combate16Assets=(()=>{
 const atlas=document.createElement('canvas');atlas.width=512;atlas.height=256;
 const g=atlas.getContext('2d');g.imageSmoothingEnabled=false;
 const frames={explosion:[],nuclear:[],smoke:[],plane:[],shell:[],battery:[],crate:[],muzzle:[],tank:[]};let ox=0,oy=0;
 const box=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+Math.round(x),oy+Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
 const puff=(x,y,r,c)=>{for(let yy=-Math.ceil(r);yy<=r;yy++){const width=Math.sqrt(Math.max(0,r*r-yy*yy)),edge=Math.sin(yy*2.8+x)*1.2;box(x-width,y+yy,width*2+edge,1,c);}};
 const cloud=(x,y,r,hot=false)=>{puff(x,y,r,hot?'#793328':'#30372f');puff(x-1,y-2,r*.88,hot?'#c04e27':'#515647');puff(x-3,y-4,r*.64,hot?'#f99838':'#7a7a5e');puff(x-4,y-5,r*.39,hot?'#ffdd76':'#a5a087');if(hot)puff(x-4,y-6,r*.19,'#fff5bf');};
 const rivet=(x,y)=>{box(x,y,2,2,'#1e2c29');box(x,y,1,1,'#e4d49d');};
 function cell(type,i,col,row,paint){ox=col*64;oy=row*64;frames[type][i]={x:ox,y:oy,w:64,h:64};paint();}
 for(let i=0;i<8;i++)cell('explosion',i,i,0,()=>{
   const r=[6,13,20,25,27,26,24,20][i],cy=41-i*1.2;
   if(i>=3)for(let j=0;j<6;j++){const a=j*2.4;cloud(31+Math.cos(a)*r*.55,cy-10+Math.sin(a)*r*.5,r*.5,false);}
   if(i<7){for(let j=0;j<7;j++){const a=j*2.4;cloud(31+Math.cos(a)*r*.48,cy+Math.sin(a)*r*.48,r*(i>4?.31:.53),true);}cloud(30,cy,r*(i>4?.38:.6),true);}
   for(let j=0;j<12;j++){const a=j*2.4,dist=r+3+j%3*3;box(31+Math.cos(a)*dist,cy+Math.sin(a)*dist,j%3?1:2,2,j%2?'#f6b34d':'#a36b3e');}
   if(i<4){box(27,cy-r-4,2,5,'#ffeda4');box(30-r-6,cy,6,2,'#ffdc68');box(34+r,cy-1,5,2,'#fff0a9');}
 });
 for(let i=0;i<8;i++)cell('nuclear',i,i,1,()=>{
   const growth=Math.min(1,(i+1)/4),cy=42-growth*24,rr=9+growth*17;
   for(let j=0;j<6;j++)cloud(31+Math.sin(j*1.9)*3,54-j*5,7-j*.3,i<5);
   for(let j=0;j<6;j++)cloud(12+j*8,55+Math.sin(j)*2,7,i<3);
   for(let j=0;j<7;j++){const a=Math.PI+j*Math.PI/6;cloud(32+Math.cos(a)*rr*.73,cy+Math.sin(a)*8,rr*.43,i<6);}
   cloud(32,cy-5,rr*.53,i<6);box(15,cy+11,34,2,'#715e40');
 });
 for(let i=0;i<4;i++)cell('smoke',i,i,2,()=>{cloud(30,44-i*5,12+i*3);cloud(38,33-i*4,9+i*2);cloud(25,29-i*3,7+i*2);});
 for(let i=0;i<3;i++)cell('plane',i,i+4,2,()=>{
   box(4,30,52,9,'#202e2a');box(9,28,43,9,'#63705a');box(12,28,36,3,'#c5bea0');box(12,34,37,3,'#414d3d');box(47,30,11,5,'#9a9d83');box(53,31,8,3,'#d9cf9d');
   box(23,18,9,14,'#303d34');box(25,18,8,11,'#858970');box(26,16,5,4,'#c6be92');box(27,21,2,9,'#b0aa84');box(23,36,12,16,'#293d35');box(25,38,10,12,'#69775f');box(26,49,10,3,'#a69b6e');
   box(7,21,7,11,'#4a5e49');box(5,21,8,3,'#a9ac7d');box(38,25,10,5,'#202e2a');box(39,25,7,3,'#8bb8b2');box(40,25,2,1,'#d4e8d2');box(38,28,11,2,'#c1ba90');
   box(16,31,6,3,'#b8432d');box(18,31,2,3,'#ecd990');box(59,25,1,18,'#d5c599');box(58,26+i*3,3,5,'#ffffd5');
   for(const x of [13,23,33,48])rivet(x,32);
 });
 cell('tank',0,7,2,()=>{box(8,47,48,12,'#1e2b24');box(5,46,53,7,'#313e2e');box(10,43,43,6,'#9d9e66');box(14,35,34,9,'#536140');box(18,34,27,3,'#b1ad73');box(33,31,26,4,'#313f30');box(34,31,24,1,'#d7cc8e');box(23,27,17,9,'#667247');box(25,26,13,2,'#b9b37d');for(let i=0;i<6;i++){puff(13+i*7,53,4,'#687255');puff(13+i*7,53,2,'#202c24');}for(let x=8;x<57;x+=4)box(x,59,2,2,'#b3a674');rivet(20,39);rivet(43,39);});
 for(let i=0;i<2;i++)cell('shell',i,i,3,()=>{box(23,30,14,5,'#252f26');box(25,30,10,3,'#d3bf81');box(26,30,8,1,'#ffffd5');box(35,31,5,3,'#b97b40');box(18,31,6,2,'#ffdd6b');box(13,31,5,1,'#dd793b');});
 cell('battery',0,2,3,()=>{box(9,50,46,8,'#24382b');box(14,45,34,7,'#647450');box(16,45,30,2,'#aca978');box(26,33,12,16,'#41553b');box(29,32,9,4,'#9b9b68');for(let i=0;i<5;i++)box(33+i*2,29-i*3,6,6,i%2?'#777d56':'#b1ad7d');box(41,15,5,3,'#26392b');rivet(20,49);rivet(44,49);box(12,57,9,4,'#1f3025');box(45,57,9,4,'#1f3025');});
 for(let i=0;i<2;i++)cell('crate',i,i+3,3,()=>{box(20,40,25,22,'#262d22');box(22,41,21,19,'#827648');box(23,42,18,3,'#c5b57b');box(23,47,18,3,'#625d37');box(23,53,18,3,'#625d37');box(23,58,18,2,'#413f2c');box(24,42,3,18,'#a5a482');box(38,42,3,18,'#a5a482');rivet(24,44);rivet(38,57);if(!i){box(29,46,7,11,'#d5cba1');box(27,48,11,7,'#d5cba1');box(31,47,3,9,'#a7422e');box(28,50,9,3,'#a7422e');}else{box(29,47,3,10,'#e3c47d');box(34,47,3,10,'#e3c47d');box(29,46,3,2,'#9a5a2f');box(34,46,3,2,'#9a5a2f');}});
 for(let i=0;i<3;i++)cell('muzzle',i,i+5,3,()=>{const r=13-i*3;for(let j=0;j<9;j++){const a=j*2.4;box(32+Math.cos(a)*r,32+Math.sin(a)*r,2,2,'#f0a23d');}cloud(32,32,r*.6,true);box(32-r,31,r*2,2,'#fff1a0');box(31,32-r,2,r*2,'#ffe06d');puff(32,32,3,'#ffffde');});
 const assets={atlas,frames};const scriptSrc=document.currentScript?.src;
 if(scriptSrc){const image=new Image();image.onload=()=>{assets.atlas=image;};image.src=new URL('./assets/guerra-16bits.png',scriptSrc).href;}
 return assets;
})();
