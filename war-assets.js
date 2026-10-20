/* Original 16-bit-style pixel assets. Runtime canvas and exported PNG atlas share this source. */
'use strict';
globalThis.Combate16Assets=(()=>{
  const atlas=document.createElement('canvas');atlas.width=512;atlas.height=256;
  const g=atlas.getContext('2d');g.imageSmoothingEnabled=false;
  const frames={explosion:[],nuclear:[],smoke:[],plane:[],shell:[],battery:[]};
  let ox=0,oy=0;
  const box=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(ox+Math.round(x),oy+Math.round(y),Math.round(w),Math.round(h));};
  const puff=(x,y,r,c)=>{box(x-r,y-r/2,r*2,r,c);box(x-r/2,y-r,r,r*2,c);box(x-r*.8,y-r*.8,r*1.6,r*1.6,c);};
  function cell(type,i,col,row,paint){ox=col*64;oy=row*64;frames[type][i]={x:ox,y:oy,w:64,h:64};paint();}
  for(let i=0;i<8;i++)cell('explosion',i,i,0,()=>{
    const r=[5,11,19,25,27,25,22,18][i],cy=37-i*1.2;
    if(i>3){puff(25,cy-5,r*.73,'#56516b');puff(40,cy-10,r*.6,'#77718a');puff(31,cy-17,r*.48,'#a39aae');}
    const fire=i<5?r:r*(8-i)/5;puff(31,cy,fire,'#a74756');puff(31,cy-2,fire*.81,'#ed7853');puff(28,cy-3,fire*.57,'#ffbd65');puff(28,cy-5,fire*.3,'#fff2b3');
    if(i<5){box(30,cy-r-5,3,5,'#fff1a5');box(31-r-6,cy,5,3,'#ffd37c');box(32+r,cy-3,5,3,'#ffb276');}
    if(i>1){box(10+i,54-i,3,3,'#fba268');box(48-i,45-i,2,3,'#ffe6a0');}
  });
  for(let i=0;i<8;i++)cell('nuclear',i,i,1,()=>{
    const growth=Math.min(1,(i+1)/4),capY=40-growth*23,capR=8+growth*19;
    box(26,capY+4,12,55-capY,'#845775');box(29,capY+5,7,52-capY,'#de956e');box(31,capY+8,3,47-capY,'#ffcf8b');
    box(12,52,40,9,'#8b647e');box(17,48,30,11,'#c58a8d');box(9,55,46,4,'#edb58d');
    box(32-capR,capY-4,capR*2,13,'#81546d');box(36-capR,capY-9,capR*2-8,21,'#965f77');
    puff(19,capY-2,capR*.44,'#c57473');puff(43,capY-2,capR*.44,'#c57473');puff(31,capY-7,capR*.58,'#f2a477');
    puff(21,capY-5,capR*.3,'#efaf7e');puff(41,capY-5,capR*.3,'#e99271');puff(31,capY-10,capR*.34,'#ffcf8c');puff(29,capY-12,capR*.2,'#ffe4a2');
    box(13,capY+8,38,3,'#965f77');if(i<4){box(30,capY+14,3,Math.max(2,32-capY),'#ffecb2');box(17,56,31,3,'#fff1bb');}
  });
  for(let i=0;i<4;i++)cell('smoke',i,i,2,()=>{puff(30,43-i*6,9+i*4,'#636179');puff(36,34-i*5,8+i*3,'#898298');puff(25,28-i*3,7+i*2,'#b3a3b1');});
  for(let i=0;i<3;i++)cell('plane',i,i+4,2,()=>{
    box(8,29,44,8,'#263b52');box(12,27,37,8,'#8da6b4');box(15,28,34,3,'#c4d5d1');box(45,29,10,4,'#dfe6d4');box(40,26,8,4,'#99e0e6');
    box(25,18,7,13,'#526f92');box(28,15,7,6,'#749cba');box(24,34,10,13,'#365774');box(28,44,9,4,'#527a99');
    box(8,21,5,10,'#527188');box(5,19,7,4,'#92a5b1');box(53,25,2,i%2?15:10,'#e6dbae');box(13,31,8,4,'#d98579');box(16,32,2,2,'#fff0b9');
  });
  for(let i=0;i<2;i++)cell('shell',i,i,3,()=>{box(28,28,9,4,'#fff5bb');box(22,29,7,2,'#ffb566');box(18,29,4,1,'#ef805a');});
  cell('battery',0,2,3,()=>{box(13,47,38,8,'#324858');box(17,42,28,6,'#67817c');box(27,34,11,12,'#4e646c');box(34,24,6,16,'#8ca198');box(39,19,5,11,'#aac0a8');box(12,54,10,4,'#253d4b');box(43,54,10,4,'#253d4b');});
  const assets={atlas,frames};
  // Folder build uses the exported PNG; inline HTML keeps the identical embedded atlas.
  const scriptSrc=document.currentScript?.src;
  if(scriptSrc){const image=new Image();image.onload=()=>{assets.atlas=image;};image.src=new URL('./assets/guerra-16bits.png',scriptSrc).href;}
  return assets;
})();
