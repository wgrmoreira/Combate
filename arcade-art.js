/* Original COMBATE 16 pixel models, material tiles and decorative objects. */
'use strict';
globalThis.CombateArcade=(()=>{
  const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const sprites=[0,1].map(team=>[0,1,2].map(variant=>{
    const c=make(40,48),g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const p=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    const ink='#20251d',shadow=team?'#4b342d':'#303b23',dark=team?'#754a37':'#4d5d32',cloth=team?'#a7734d':'#82934a',light=team?'#d5a878':'#b8bd70',skin=['#e6b278','#d19866','#ecc493'][variant],skinLight='#ffe0a0',skinDark='#9e6841',metal='#7a847c';
    // Heavy boots, bent trousers and leather gaiters.
    p(7,38,11,9,ink);p(23,38,11,9,ink);p(5,44,14,4,ink);p(24,44,13,4,ink);
    p(8,37,8,7,dark);p(23,37,8,7,dark);p(9,36,6,6,cloth);p(24,36,6,6,cloth);p(9,37,3,3,light);p(26,37,3,3,light);
    p(7,43,10,3,'#5a4a32');p(25,43,9,3,'#5a4a32');p(6,46,12,1,'#ae986b');p(26,46,10,1,'#ae986b');p(10,43,3,1,'#ad9b73');p(28,43,3,1,'#ad9b73');
    p(9,30,22,10,shadow);p(11,31,18,7,cloth);p(12,33,5,6,dark);p(21,33,6,6,dark);p(14,32,11,2,light);p(19,35,3,7,ink);p(11,38,5,2,'#b7a16c');p(25,38,5,2,'#b7a16c');
    // Backpack with rolled blanket, buckled webbing and ammo pouches.
    p(4,21,10,15,ink);p(5,22,8,12,shadow);p(6,22,5,10,dark);p(4,20,9,4,'#a3996a');p(5,20,7,1,'#d1c18b');p(6,26,2,7,'#c1ad78');p(5,32,7,2,'#4e402e');
    p(12,21,17,14,ink);p(13,22,14,11,cloth);p(14,22,4,9,light);p(24,23,3,9,dark);p(19,23,2,11,'#d2c394');p(13,31,16,4,'#4e402c');p(16,31,4,3,'#b8a574');p(22,31,4,3,'#b8a574');p(17,32,2,1,'#f4dba3');
    // Face with pronounced brow, nose, ear and dark jawline.
    p(13,9,16,14,ink);p(14,10,13,12,skin);p(14,11,3,9,skinDark);p(18,11,8,6,skinLight);p(26,15,4,4,skin);p(27,16,2,1,skinLight);
    p(19,13,6,2,'#574632');p(21,15,2,3,'#2a2c25');p(23,15,1,1,'#fff1bc');p(18,18,7,2,skin);p(19,20,8,2,skinDark);p(15,21,6,2,'#684b32');p(12,14,3,5,skin);p(12,15,1,2,skinLight);
    // Helmet / field cap / goggles variants have separate silhouettes.
    if(variant===1){p(12,6,15,6,ink);p(14,5,11,3,ink);p(13,7,13,5,team?'#8d4133':'#796b39');p(14,6,10,2,team?'#d57c52':'#c1a35a');p(11,11,19,3,'#ccb479');p(14,13,13,2,team?'#ab453a':'#4b6439');p(10,13,4,9,team?'#ad4f37':'#687c40');p(8,19,5,3,dark);}
    else{p(10,5,19,7,ink);p(13,3,13,3,ink);p(11,6,17,7,dark);p(13,4,12,6,cloth);p(14,4,9,2,light);p(11,9,17,4,cloth);p(9,12,22,3,ink);p(10,12,19,2,light);p(26,7,2,5,shadow);p(14,8,2,4,'#615e39');
      if(variant===2){p(14,8,14,4,'#272f2d');p(15,8,5,3,'#aab3a0');p(22,8,5,3,'#7dada8');p(16,8,2,1,'#d6eee1');p(23,8,2,1,'#d6eee1');}else{p(19,6,4,4,team?'#db9b66':'#d2cb86');p(20,7,2,2,'#e5e0b0');}}
    // Bare muscular arm holding a detailed gas-operated rifle.
    p(14,23,8,7,ink);p(15,23,5,5,skin);p(15,23,4,2,skinLight);p(16,27,7,3,skinDark);p(19,26,6,3,skin);p(26,26,6,4,skinDark);p(27,25,5,3,skinLight);
    p(18,23,21,4,ink);p(20,23,15,2,metal);p(25,22,7,1,'#bfc6a3');p(20,25,10,3,'#454c43');p(24,27,4,5,ink);p(25,27,2,4,'#59624f');p(16,25,7,3,'#755333');p(17,25,5,1,'#c49b60');p(33,24,6,1,'#c4c9ab');p(36,22,1,3,ink);p(32,25,3,2,'#b7ab78');p(30,26,3,3,skin);p(30,26,2,1,skinLight);
    // Purposeful one-pixel material wear, not smooth gradients.
    for(const [x,y] of [[12,7],[17,5],[24,10],[15,25],[12,34],[27,35],[8,23]])p(x,y,1,1,'#e1d6a0');
    return c;
  }));
  const tiles=[0,1,2,3].map(type=>{
    const c=make(96,96),g=c.getContext('2d');
    const palettes=[['#493d2b','#615139','#7d6c45','#a58c57'],['#514036','#705747','#94755a','#b69b70'],['#394448','#4d6263','#718785','#9fa98c'],['#5c4932','#80623d','#a3814e','#c29e60']];
    const colors=palettes[type];let s=191+type*17;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
    g.fillStyle=colors[0];g.fillRect(0,0,96,96);
    for(let y=-8;y<100;y+=12)for(let x=-12;x<110;x+=19){const xx=x+((y/12)%2)*9+Math.floor(rnd()*4),yy=y+Math.floor(rnd()*3),w=12+Math.floor(rnd()*7),h=7+Math.floor(rnd()*4);g.fillStyle=colors[1];g.fillRect(xx,yy,w,h);g.fillStyle=colors[2];g.fillRect(xx+1,yy,w-2,2);g.fillStyle=colors[3];g.fillRect(xx+2,yy+1,3,1);g.fillStyle=colors[0];g.fillRect(xx+w-3,yy+h-3,3,3);}
    for(let i=0;i<130;i++){g.fillStyle=colors[i%4];g.fillRect(Math.floor(rnd()*96),Math.floor(rnd()*96),i%4?1:3,1);}
    return c;
  });
  // Reusable scenery pieces in local transparent canvases; ground remains physical.
  const props=[0,1,2,3].map(type=>{
    const c=make(128,128),g=c.getContext('2d');const p=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
    if(type===0){ // ruined masonry and corrugated roof
      p(15,44,92,75,'#272e26');p(18,47,86,71,'#6f6a48');
      for(let y=48;y<119;y+=9)for(let x=16;x<106;x+=17){const xx=x+(y%2)*5;p(xx,y,15,7,'#8b8156');p(xx,y,13,2,'#b5a16a');p(xx+2,y+5,13,2,'#57533c');}
      p(48,70,27,49,'#272f28');p(48,70,27,3,'#b9aa79');p(23,60,18,20,'#272f28');p(25,62,14,2,'#b8a46b');p(31,62,2,18,'#888258');p(20,39,88,8,'#353f35');
      for(let x=17;x<113;x+=5){p(x,30+(x%3),4,14,'#747d5a');p(x,31+(x%3),1,12,'#c3bd85');}p(29,96,4,22,'#5d7538');p(30,99,16,3,'#788642');p(89,47,5,39,'#586a34');p(82,55,16,4,'#91a057');
    }else if(type===1){ // tall gnarly tree, vines and layered foliage
      p(56,40,18,78,'#272f22');p(53,55,26,54,'#494932');p(57,49,7,66,'#807548');p(62,62,3,45,'#a18d58');p(73,80,3,31,'#6e663c');p(45,108,18,9,'#7a7046');p(72,108,22,8,'#4b4d30');
      for(let i=0;i<16;i++){const x=15+(i*29)%95,y=10+(i*17)%57;p(x,y,24,12,'#263b29');p(x+2,y-4,18,11,'#47603c');p(x+4,y-3,12,5,'#6b7c42');p(x+6,y-2,4,2,'#99a258');}
      p(37,44,2,44,'#7f8045');p(36,85,4,3,'#ac9e5a');p(91,50,2,48,'#62713e');p(46,116,49,4,'#3c4930');
    }else if(type===2){ // sandbags, barrel and damaged communications aerial
      p(9,100,109,20,'#2d332a');for(let row=0;row<3;row++)for(let col=0;col<4;col++){const x=12+col*24+(row%2)*4,y=103-row*8;p(x,y,22,7,'#776d46');p(x+2,y,18,2,'#b3a16c');p(x+1,y+5,19,2,'#4c4d32');p(x+17,y+2,2,3,'#968553');}
      p(72,64,20,38,'#313c32');p(74,65,16,35,'#64724c');p(75,66,5,32,'#a7a46b');p(72,70,20,3,'#303c32');p(72,92,20,3,'#303c32');p(80,65,8,2,'#c6bb7e');p(36,32,3,62,'#7b8060');p(23,39,28,2,'#b0b08a');p(28,32,2,17,'#464f38');p(46,32,2,17,'#464f38');p(37,22,2,18,'#b6ba8d');
    }else{ // rocky overhang, exposed roots and ferns
      for(let i=0;i<12;i++){const x=8+(i*23)%90,y=87+(i*11)%25;p(x,y,25,12,'#343d32');p(x+2,y-3,20,9,'#666a49');p(x+5,y-3,12,3,'#9a9564');p(x+3,y+6,18,2,'#4b5139');}
      for(let i=0;i<8;i++){const x=20+i*12;p(x,91-i%3*4,2,24,'#87904d');p(x-5,94-i%3*4,6,3,'#55703a');p(x+1,98-i%3*4,8,3,'#92a555');p(x-7,104-i%3*4,8,3,'#6c8944');}
    }
    return c;
  });
  const outlines=sprites.map(row=>row.map(()=>make(40,48)));
  const updateOutlines=()=>{for(let t=0;t<2;t++)for(let v=0;v<3;v++){const g=outlines[t][v].getContext('2d');g.clearRect(0,0,40,48);g.drawImage(sprites[t][v],0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fffef3';g.fillRect(0,0,40,48);g.globalCompositeOperation='source-over';}};
  updateOutlines();
  const art={aircraft:[null,null],sprites,outlines,tiles,props,cover:null,scene:null,city:null,onCover:null};
  const script=document.currentScript?.src;
  function load(name,key){if(typeof Image==='undefined')return;const im=new Image();im.onload=()=>{art[key]=im;if(key==='cover')art.onCover?.();};im.src=script?new URL('./assets/'+name,script).href:name;}
  load('capa-arcade.png','cover');load('cenario-arcade.png','scene');load('cidade-arcade.png','city');
  if(typeof Image!=='undefined'){
    const sheet=new Image();sheet.onload=()=>{const cw=sheet.width/3,ch=sheet.height/2;for(let t=0;t<2;t++)for(let v=0;v<3;v++){const c=sprites[t][v],g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;g.drawImage(sheet,v*cw,t*ch,cw,ch,0,0,40,48);}updateOutlines();};
    sheet.src=script?new URL('./assets/soldados-arcade.png',script).href:'soldados-arcade.png';
  }
  if(typeof Image!=='undefined'){
    const ground=new Image();ground.onload=()=>{for(let i=0;i<4;i++){const g=tiles[i].getContext('2d');g.imageSmoothingEnabled=false;g.filter='saturate(.6)';g.drawImage(ground,0,0,96,96);g.filter='none';if(i){g.globalCompositeOperation='multiply';g.fillStyle=['#ffffff','#dfba9c','#a8b9ac','#e9c482'][i];g.fillRect(0,0,96,96);g.globalCompositeOperation='source-over';}}};
    ground.src=script?new URL('./assets/terreno-arcade.png',script).href:'terreno-arcade.png';
  }
  if(typeof Image!=='undefined'){
    const vehicles=new Image();vehicles.onload=()=>{const cw=vehicles.width/2,ch=vehicles.height,scale=Math.min(128/cw,80/ch);
      for(let i=0;i<2;i++){const c=make(128,80),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(vehicles,i*cw,0,cw,ch,(128-cw*scale)/2,(80-ch*scale)/2,cw*scale,ch*scale);art.aircraft[i]=c;}
    };vehicles.src=script?new URL('./assets/aeronaves-arcade.png',script).href:'aeronaves-arcade.png';
  }
  return art;
})();
