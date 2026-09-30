'use strict';
(()=>{
const G=J.Geometry,{rng,mix,smooth,clamp}=J;
J.buildWorld=function(R){
 const random=rng(207031),world={};
 const terra=new G();let NX=88,NZ=82,W=2800,D=2500;
 for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){
 const v=(xx,zz)=>{let a=xx/NX*W-W/2,b=zz/NZ*D-D/2;return[a,J.height(a,b),b]};let a=v(x,z),b=v(x+1,z),c=v(x+1,z+1),d=v(x,z+1);
 let center=[(a[0]+c[0])/2,(a[2]+c[2])/2],r=clamp(Math.abs(center[1]-J.riverZ(center[0]))/70),h=(a[1]+c[1])/2;
 let field=((Math.floor((center[0]+70)/85)+Math.floor((center[1]+70)/67)*3)%7);
 let col=field<2?[.51,.515,.387]:field<4?[.535,.52,.40]:[.48,.50,.375];
 if(h>18)col=[.455,.489,.396];col=col.map((v,i)=>mix([.56,.55,.445][i],v,smooth(.4,1,r)));
 // Central battle plain has a coherent earth palette; distant parcels remain subtle.
 if(Math.abs(center[0])<325&&Math.abs(center[1])<530)col=col.map((v,i)=>mix(v,[.555,.542,.434][i],.5));
 terra.tri(a,d,c,col);terra.tri(a,c,b,col);
 }
 world.terrain=R.mesh(terra);
 const grain=document.createElement('canvas');grain.width=grain.height=256;let gc=grain.getContext('2d'),gi=gc.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){let value=clamp(.45+Math.sin(x*.071)*Math.sin(y*.061)*.13+(random()-.5)*.49),k=(y*256+x)*4;gi.data[k]=gi.data[k+1]=gi.data[k+2]=Math.round(value*255);gi.data[k+3]=255}gc.putImageData(gi,0,0);
 R.gl.activeTexture(R.gl.TEXTURE1);world.groundTex=R.texture(grain);R.gl.texParameteri(R.gl.TEXTURE_2D,R.gl.TEXTURE_WRAP_S,R.gl.REPEAT);R.gl.texParameteri(R.gl.TEXTURE_2D,R.gl.TEXTURE_WRAP_T,R.gl.REPEAT);R.gl.activeTexture(R.gl.TEXTURE0);

 const water=new G();for(let i=0;i<300;i++){let x1=-1600+i*3200/300,x2=-1600+(i+1)*3200/300;for(let j=0;j<4;j++){let v1=j/4,v2=(j+1)/4;let a=[x1,.12,J.riverZ(x1)+(v1-.5)*64],b=[x2,.12,J.riverZ(x2)+(v1-.5)*64],c=[x2,.12,J.riverZ(x2)+(v2-.5)*64],d=[x1,.12,J.riverZ(x1)+(v2-.5)*64];water.quad(a,d,c,b,[1,1,1],0,[[0,v1],[0,v2],[1,v2],[1,v1]])}}
 world.water=R.mesh(water);
 const buildings=new G(),details=new G(),roads=new G(),stamps=new G();
 function lineRoad(points,width,col){for(let i=0;i<points.length-1;i++){let a=points[i],b=points[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/l*width/2,nz=(b[0]-a[0])/l*width/2;const v=(x,z)=>[x,J.ground(x,z)+.06,z];roads.quad(v(a[0]-nx,a[1]-nz),v(a[0]+nx,a[1]+nz),v(b[0]+nx,b[1]+nz),v(b[0]-nx,b[1]-nz),col)}}
 J.supplyPath=[[196,214],[181,175],[157,135],[139,97],[117,56],[103,13],[84,-35],[64,-73]];
 lineRoad(J.supplyPath,14,[.615,.579,.475]);
 for(let i=0;i<J.supplyPath.length-1;i++){
  let a=J.supplyPath[i],b=J.supplyPath[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),yaw=Math.atan2(b[0]-a[0],b[1]-a[1]);
  for(let side of[-1,1]){let nx=Math.cos(yaw)*9*side,nz=-Math.sin(yaw)*9*side,x=(a[0]+b[0])/2+nx,z=(a[1]+b[1])/2+nz;buildings.box(x,J.ground(x,z)+1.1,z,2.3,2.1,len+2,[.49,.452,.342],yaw)}
 }
 lineRoad([[-18,-230],[-18,-430]],7,[.55,.521,.43]);lineRoad([[0,-113],[0,-54]],9,[.61,.575,.485]);
 // Flat, rammed-earth city: open gate, crenellations and simple gabled watchtowers.
 const base=3.5,wall=[.525,.49,.40],roof=[.285,.326,.314];
 buildings.box(0,base+5.8,-229,142,11.6,5.5,wall);
 buildings.box(-69,base+5.8,-170,5.5,11.6,122,wall);buildings.box(69,base+5.8,-170,5.5,11.6,122,wall);
 buildings.box(-41,base+5.8,-111,59,11.6,5.5,wall);buildings.box(41,base+5.8,-111,59,11.6,5.5,wall);buildings.box(0,base+10.7,-111,24,2.2,5.5,wall);
 for(let z of[-111,-229])for(let x=-68;x<=68;x+=5.3){buildings.box(x,base+12.6,z,2.8,2,6,wall)}
 for(let x of[-69,69])for(let z=-224;z<-116;z+=5.3)buildings.box(x,base+12.6,z,6,2,2.8,wall);
 const tower=(x,z,gate=false)=>{let h=gate?13.5:13;buildings.box(x,base+h/2,z,gate?20:12,h,gate?10:12,[.50,.475,.402]);buildings.box(x,base+h+1.8,z,gate?16:10,3.6,gate?9:10,[.39,.37,.305]);buildings.roof(x,base+h+3.6,z,gate?23:16,4,gate?14:16,roof);for(let a=-1;a<=1;a+=2)buildings.box(x+a*(gate?6:3),base+h+1.8,z+5.08,1.3,2.1,.15,[.12,.17,.17]);};
 for(let x of[-69,69])for(let z of[-111,-229])tower(x,z);
 // Gatehouse sits above lintel, leaving a true passage below.
 buildings.box(0,base+13.2,-111,21,3.2,11,[.45,.421,.346]);buildings.roof(0,base+14.8,-111,25,4.1,15,roof);
 for(let xx of[-6.1,6.1])buildings.box(xx,base+3.6,-112,5.5,7.2,1.1,[.25,.254,.216],xx<0?-.4:.4);
 for(let i=0;i<92;i++){let x=-57+random()*114,z=-215+random()*93;if(Math.abs(x)<10||Math.abs(z+173)<9)continue;let w=6+random()*5,d=5+random()*5,h=3+random()*3;buildings.box(x,base+h/2,z,w,h,d,[.54+random()*.08,.50+random()*.07,.415+random()*.05]);buildings.roof(x,base+h,z,w+1.1,2.3,d+1.2,[.32+random()*.04,.35+random()*.035,.325]);stamps.ellipse(x+4,base+.04,z-2,w*.9,d*.8,[.40,.40,.33],8)}
 buildings.box(0,base+3,-198,21,6,13,[.48,.45,.37]);buildings.roof(0,base+6,-198,25,4,18,roof);
 // Wall texture: bands and buttress details, kept in a single static draw.
 for(let x of[-71.9,71.9])for(let z=-219;z<=-123;z+=13)details.box(x,base+4.5,z,1.1,9,1.7,[.46,.441,.369]);
 for(let x=-65;x<66;x+=14){if(Math.abs(x)>13)details.box(x,base+4,-107.9,1.7,8,1.3,[.46,.441,.369]);details.box(x,base+4,-232.1,1.7,8,1.3,[.46,.441,.369])}
 lineRoad([[-61,-172],[61,-172]],6,[.56,.529,.444]);lineRoad([[0,-219],[0,-119]],7,[.56,.529,.444]);
 // Camps are real structures, not map icons.
 function camp(cx,cz,n,team){const tcol=team===0?[.365,.39,.37]:team===1?[.47,.40,.32]:[.49,.49,.391];for(let i=0;i<n;i++){let x=cx+(i%5-2)*14,z=cz+(Math.floor(i/5)-1.5)*16,h=J.ground(x,z);buildings.roof(x,h,z,8.5,5.7,10,tcol);details.box(x,h+1.7,z+5.04,2.3,3.3,.15,[.20,.229,.21]);stamps.ellipse(x+4,h+.04,z-2,6,6,[.40,.414,.334],8)}for(let i=0;i<30;i++){let x=cx-42+i*2.8,z=cz-40;details.cylinder(x,J.ground(x,z)+2,z,.32,.2,4,[.32,.297,.225],5)} }
 camp(260,194,20,0);camp(170,200,15,0);camp(-320,480,20,1);camp(-78,490,15,1);camp(-253,-359,15,2);camp(-117,-415,15,2);camp(86,-427,15,2);camp(259,-375,15,2);
 // Shore shelter / clay cooking pots; broken pots replace the intact set at the scripted moment.
 const pots=new G(),broken=new G();for(let i=0;i<14;i++){let x=-250+i*10,z=J.riverZ(x)-52,y=J.ground(x,z);pots.cylinder(x,y+.8,z,.8,1.1,1.3,[.30,.31,.285],7);pots.cylinder(x,y+1.51,z,1.1,.92,.14,[.38,.37,.31],8);for(let k=0;k<3;k++)broken.box(x+(random()-.5)*3,y+.14,z+(random()-.5)*3,.7,.2,.9,[.34,.335,.29],random()*3);}
 world.pots=R.mesh(pots);world.brokenPots=R.mesh(broken);
 for(let i=0;i<4;i++){let x=-250+i*39,z=J.riverZ(x)-59;buildings.roof(x,J.ground(x,z),z,12,6.5,13,[.42,.40,.30])}
 // Smooth low hills and dispersed copses, never a mountainous strait.
 const tree=new G();tree.box(0,3,0,.7,6,.7,[.31,.32,.253]);tree.cylinder(0,6.6,0,3.7,0,6,[.38,.425,.324],4);tree.cylinder(0,9.4,0,2.7,0,5,[.42,.467,.362],4);
 let ti=[],ts=[];for(let i=0;i<650;i++){let x=(random()-.5)*2200,z=(random()-.5)*1920,r=Math.abs(z-J.riverZ(x));if(r<42||Math.abs(x)<320&&z>-450&&z<530)continue;if(Math.abs(x)<420&&z>-300&&z<230)continue;let sc=.5+random()*.7,h=J.ground(x,z);ti.push(x,h,z,random()*6.28);ts.push(sc,sc*(.8+random()*.6),sc,.88+random()*.24);stamps.ellipse(x+3,h+.06,z-2,sc*4,sc*3,[.405,.425,.335],7)}
 world.treeA=new Float32Array(ti);world.treeB=new Float32Array(ts);world.treeCullA=new Float32Array(ti.length);world.treeCullB=new Float32Array(ts.length);world.treeKey='';world.trees=R.mesh(tree,{a:world.treeA,b:world.treeB,dynamic:true});
 // Sparse rocks, shrubs and field edges add scale without per-object CPU updates.
 for(let i=0;i<240;i++){let x=(random()-.5)*1260,z=(random()-.5)*1120;if(Math.abs(x)<315&&z>-425&&z<510)continue;let y=J.ground(x,z);if(Math.abs(z-J.riverZ(x))<35)continue;let s=.7+random()*2.4;details.cylinder(x,y+s*.3,z,s,s*.35,s*.9,[.48,.492,.424],5)}
 const grass=new G();for(let i=0;i<2200;i++){let x=(random()-.5)*1600,z=(random()-.5)*1500;if(Math.abs(x)<310&&z>-420&&z<495)continue;let y=J.ground(x,z);if(Math.abs(z-J.riverZ(x))<30)continue;let s=.7+random()*1.8;grass.tri([x-s*.22,y,z],[x,y+s,z+.2],[x+s*.22,y,z],[.45,.473,.34]);}
 world.grass=R.mesh(grass);world.buildings=R.mesh(buildings);world.details=R.mesh(details);world.roads=R.mesh(roads);world.stamps=R.mesh(stamps);
 // Single merged infantry mesh, animated in the vertex shader; no CPU skeleton per soldier.
 const man=new G();
 man.box(0,1.20,0,.66,.70,.39,[.47,.48,.431]);
 man.box(0,.79,0,.76,.28,.47,[.50,.476,.403],0,6);
 man.box(0,1.12,.211,.52,.08,.07,[.27,.285,.255]);
 man.box(0,1.46,0,.76,.08,.48,[.31,.35,.325]);
 man.cylinder(0,1.76,0,.225,.20,.40,[.68,.562,.421],6);
 man.cylinder(0,1.94,0,.28,.21,.18,[.34,.37,.348],6);
 man.box(0,2.05,-.08,.17,.18,.2,[.23,.265,.249]);
 man.box(-.16,.39,0,.235,.68,.245,[.37,.369,.316],0,1);man.box(.16,.39,0,.235,.68,.245,[.37,.369,.316],0,2);
 man.box(-.16,.10,.07,.25,.20,.40,[.20,.245,.233],0,1);man.box(.16,.10,.07,.25,.20,.40,[.20,.245,.233],0,2);
 man.box(-.42,1.19,0,.24,.55,.25,[.49,.478,.4],0,3);man.box(.42,1.19,0,.24,.55,.25,[.49,.478,.4],0,4);
 man.box(-.57,1.02,.14,.12,.78,.62,[.305,.328,.295],0,3);man.box(-.645,1.03,.14,.03,.07,.6,[.56,.485,.32],0,3);
 man.cylinder(.5,2.10,.1,.035,.028,3.10,[.46,.376,.248],4,4);man.cylinder(.5,3.77,.1,.10,0,.30,[.69,.706,.648],4,4);
 let troopA=[],troopB=[];for(let g of J.groups)for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++){
 let x=(c-(g.cols-1)/2)*1.5+(random()-.5)*.10,z=(r-(g.rows-1)/2)*1.58+(random()-.5)*.10;
 const seed=.003+random()*.99;
 let fallTime=g.loss[1];if(seed<g.loss[2]){let lo=0,hi=1;const q=clamp((seed+.003)/Math.max(.00001,g.loss[2]));for(let j=0;j<19;j++){const m=(lo+hi)/2;if(m*m*(3-2*m)<q)lo=m;else hi=m;}fallTime=mix(g.loss[0],g.loss[1],(lo+hi)/2);}
 const fp=J.routeAt(g.route,fallTime);troopA.push(x,z,seed,g.id);troopB.push(g.team,fp.x,fp.z,fp.yaw);
 }
 world.troopA=new Float32Array(troopA);world.troopB=new Float32Array(troopB);
 
 // Three true 3D levels of detail. Only nearby, in-view formations use the detailed mesh.
 const medium=new G();medium.box(0,1.12,0,.66,.85,.4,[.46,.48,.425]);medium.box(0,1.74,0,.44,.39,.40,[.60,.548,.426]);medium.roof(0,1.91,0,.52,.18,.48,[.32,.367,.335]);medium.box(-.16,.39,0,.23,.72,.24,[.35,.368,.31],0,1);medium.box(.16,.39,0,.23,.72,.24,[.35,.368,.31],0,2);medium.box(.43,1.2,0,.22,.5,.23,[.47,.46,.40],0,4);medium.box(-.48,1.04,.1,.10,.79,.59,[.31,.34,.294],0,3);medium.quad([.46,.52,.10],[.46,3.71,.10],[.54,3.87,.10],[.54,.52,.10],[.47,.412,.295],4);medium.quad([.5,.52,.06],[.5,3.71,.06],[.5,3.87,.14],[.5,.52,.14],[.52,.46,.33],4);
 const far=new G();
 const body=[[-.31,.43,-.20],[.31,.43,-.20],[.31,1.60,-.20],[-.31,1.60,-.20],[-.31,.43,.20],[.31,.43,.20],[.31,1.60,.20],[-.31,1.60,.20]];
 for(const f of[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2]])far.quad(...f.map(i=>body[i]),[.44,.468,.402]);
 for(let i=0;i<4;i++){let a=i*Math.PI/2+Math.PI/4,b=a+Math.PI/2;far.tri([Math.cos(a)*.32,1.6,Math.sin(a)*.32],[0,2.03,0],[Math.cos(b)*.32,1.6,Math.sin(b)*.32],[.49,.50,.42]);}
 far.tri([-.29,0,0],[-.29,.65,0],[-.05,.65,0],[.32,.35,.29],1);far.tri([.05,.65,0],[.29,.65,0],[.29,0,0],[.32,.35,.29],2);
 far.quad([.47,.6,.1],[.47,3.76,.1],[.54,3.95,.1],[.54,.6,.1],[.51,.45,.32],4);

 world.lodMeshes=[man,medium,far].map(g=>R.mesh(g,{a:new Float32Array(world.troopA.length),b:new Float32Array(world.troopB.length),dynamic:true}));world.lodKeys=[null,null,null];world.lodCounts=[0,0,0];world.lodMemory=new Int8Array(J.groups.length).fill(-1);world.lodBuffers=[0,1,2,3].map(()=>[new Float32Array(world.troopA.length),new Float32Array(world.troopB.length)]);world.farPoints=R.dynamic([[4,4],[5,4]],J.unitCount);

 const shadow=new G();shadow.quad([-1,0,-1],[-1,0,1],[1,0,1],[1,0,-1],[0,0,0]);world.troopShadows=R.mesh(shadow,{a:world.troopA,b:world.troopB,dynamic:true});
 const armyA=[],armyB=[];for(let g of J.groups){armyA.push(0,0,.999,g.id);armyB.push(g.team,1,0,0)}world.armyShadows=R.mesh(shadow,{a:new Float32Array(armyA),b:new Float32Array(armyB)});world.shadowKey=null;

 // Banners use one self-generated texture atlas, four real Chinese faction glyphs.
 let flagCanvas=document.createElement('canvas');flagCanvas.width=1024;flagCanvas.height=256;let fc=flagCanvas.getContext('2d');['秦','楚','援','赵'].forEach((s,i)=>{fc.fillStyle=['#2b3436','#983e33','#526966','#9b8052'][i];fc.fillRect(i*256,0,256,256);fc.strokeStyle='#d1bd88';fc.lineWidth=7;fc.strokeRect(i*256+14,14,228,228);fc.fillStyle='#eee0bd';fc.font='bold 161px "Noto Serif CJK SC","SimSun",serif';fc.textAlign='center';fc.textBaseline='middle';fc.fillText(s,i*256+128,139)});world.flagTex=R.texture(flagCanvas);
 const flag=new G();for(let i=0;i<9;i++){let a=i/9,b=(i+1)/9;flag.quad([a*4.8,8.8,0],[a*4.8,4.2,0],[b*4.8,4.2,0],[b*4.8,8.8,0],[1,1,1],0,[[a,1],[a,0],[b,0],[b,1]])}
 let fi=[];for(let g of J.groups)fi.push(g.id,g.team,0,0);world.flagInstances=new Float32Array(fi);world.flags=R.mesh(flag,{a:world.flagInstances});
 let pole=new G();pole.cylinder(0,4.45,0,.085,.06,8.9,[.41,.346,.242],5);pole.cylinder(0,9.07,0,.21,0,.38,[.7,.616,.418],5);world.poles=R.mesh(pole,{a:world.flagInstances});
 // River transports. Main formations compress onto visible decks while on the river.
 const boat=new G();boat.box(0,.4,0,7.8,.9,18,[.34,.31,.24]);boat.box(-3.8,1.1,0,.5,1.5,18,[.40,.345,.252]);boat.box(3.8,1.1,0,.5,1.5,18,[.40,.345,.252]);boat.roof(0,.2,-9,7.8,1.8,3.4,[.34,.31,.24],Math.PI/2);boat.roof(0,.2,9,7.8,1.8,3.4,[.34,.31,.24],Math.PI/2);for(let z=-7;z<8;z+=2)boat.box(0,.93,z,7.2,.2,.33,[.48,.411,.301]);
 world.boatA=new Float32Array(16*4);world.boatB=new Float32Array(16*4);world.boats=R.mesh(boat,{a:world.boatA,b:world.boatB,dynamic:true});
 // Ox-drawn grain carts, simplified animal anatomy and functioning wheels.
 const cart=new G();cart.box(0,1.8,0,2.8,.6,4.2,[.43,.35,.249]);cart.box(-1.3,2.3,0,.16,1.,4.1,[.50,.409,.28]);cart.box(1.3,2.3,0,.16,1.,4.1,[.50,.409,.28]);for(let k=0;k<4;k++)cart.cylinder((k%2-.5)*1.2,2.65,Math.floor(k/2)*1.5-.75,.6,.56,1.0,[.64,.572,.413],6);for(let x of[-1.6,1.6])for(let z of[-1.5,1.5]){cart.box(x,.9,z,.23,1.5,1.5,[.29,.291,.238]);cart.box(x,.9,z,.28,.28,1.72,[.54,.465,.326]);}cart.box(0,1.3,4.1,.17,.15,4.0,[.39,.34,.25]);cart.box(0,1.63,5.5,1.4,1.25,2.7,[.40,.376,.307]);cart.box(0,1.83,7.0,1.0,.9,.9,[.37,.35,.297]);for(let x of[-.48,.48])for(let z of[4.6,6.5])cart.box(x,.54,z,.23,1.1,.24,[.29,.296,.247]);cart.box(0,2.33,6.95,1.8,.12,.13,[.70,.639,.48]);
 world.cartA=new Float32Array(20*4);world.cartB=new Float32Array(20*4);world.carts=R.mesh(cart,{a:world.cartA,b:world.cartB,dynamic:true});
 // Dynamic effects use a bounded pool. Nothing accumulates after scrubbing.
 world.effects=R.dynamic([[0,3],[2,4],[3,1]],1000);
 world.arrows=R.dynamic([[0,3],[2,3]],1500);
 world.paths=R.dynamic([[0,3],[2,3]],1500);
 world.motion=R.dynamic([[0,3],[2,4]],10000);
 // A small number of mounted command markers. Geometry is illustrative, not portraiture.
 const horse=new G();
 horse.box(0,1.40,0,.93,1.12,2.28,[.27,.245,.203]);
 horse.box(0,1.9,.95,.69,1.27,.68,[.28,.255,.205]);horse.box(0,2.4,1.40,.48,.63,.95,[.30,.262,.202]);
 for(let x of[-.34,.34])for(let z of[-.78,.77]){horse.box(x,.55,z,.22,1.13,.27,[.22,.223,.194]);horse.box(x,.08,z+.07,.25,.16,.36,[.12,.157,.16]);}
 horse.box(0,1.2,-1.33,.18,1.06,.19,[.13,.17,.16]);
 horse.box(0,2.04,-.15,1.02,.16,1.25,[.52,.255,.198]);
 horse.box(0,2.65,-.14,.69,.83,.44,[.38,.36,.284]);horse.box(0,3.32,-.14,.39,.40,.37,[.69,.575,.436]);
 horse.roof(0,3.52,-.14,.51,.28,.46,[.29,.34,.33]);horse.box(0,3.76,-.22,.13,.31,.24,[.65,.27,.19]);
 for(let x of[-.51,.51])horse.box(x,1.76,-.03,.21,.79,.28,[.22,.28,.266]);
 horse.box(-.39,2.56,-.14,.22,.60,.24,[.39,.36,.282]);horse.box(.39,2.56,-.14,.22,.60,.24,[.39,.36,.282]);
 horse.box(0,2.48,-.46,.75,.96,.09,[.52,.24,.19]);
 let ca=[];for(let id of[3,22,26,28,36,31,46,48])ca.push(id,0,0,0);world.commanders=R.mesh(horse,{a:new Float32Array(ca)});
 J.world=world;return world;
};
J.pathPoint=function(path,u){let lens=[],total=0;for(let i=0;i<path.length-1;i++){let l=Math.hypot(path[i+1][0]-path[i][0],path[i+1][1]-path[i][1]);lens.push(l);total+=l}let dist=clamp(u)*total;for(let i=0;i<lens.length;i++){if(dist<=lens[i]||i===lens.length-1){let p=clamp(dist/lens[i]),a=path[i],b=path[i+1];return{x:mix(a[0],b[0],p),z:mix(a[1],b[1],p),yaw:Math.atan2(b[0]-a[0],b[1]-a[1])}}dist-=lens[i]}};
J.updateWorld=function(R,w,t){
 for(let i=0;i<16;i++){
  const tr=J.transports[i],p=J.boatAt(tr,t),k=i*4;
  w.boatA.set([p.x,p.y,p.z,p.yaw],k);w.boatB.set([1,1,1,1],k);
 }
 R.updateInstances(w.boats,w.boatA,w.boatB);
 for(let i=0;i<20;i++){const p=J.cartAt(i,t),k=i*4;w.cartA.set([p.x,J.ground(p.x,p.z),p.z,p.yaw],k);w.cartB.set([p.visibility,p.visibility,p.visibility,.90],k);}
 R.updateInstances(w.carts,w.cartA,w.cartB);
 const fx=w.effects;let n=0;const point=(x,y,z,r,g,b,a,size)=>{if(n>=fx.capacity)return;fx.attrs[0].ar.set([x,y,z],n*3);fx.attrs[2].ar.set([r,g,b,a],n*4);fx.attrs[3].ar[n]=size;n++};
 // Marching dust, especially along the contact line; air remains transparent enough to read formations.
 for(let gr of J.groups){let s=gr.state,intensity=Math.max(s.walk*.42,s.combat);if(intensity<.02||s.pack>.2)continue;for(let j=0;j<6;j++){let seed=(gr.id*37+j*17)*.123,f=((t*.17+seed)%1+1)%1;let x=s.x+Math.sin(seed*37)*10+f*5,z=s.z+Math.cos(seed*21)*9;point(x,s.y+1.5+f*10,z,.64,.60,.49,intensity*smooth(0,.18,f)*(1-smooth(.55,1,f))*.145,5+f*11)}}
 // Fires are confined to the shore shelters and the interrupted transport corridor.
 let burn=smooth(90,99,t)*(1-smooth(119,143,t));for(let i=0;i<4;i++){let x=-250+i*39,z=J.riverZ(x)-58,y=J.ground(x,z);for(let j=0;j<15;j++){let f=(t*.25+j*.139+i*.07)%1;point(x+Math.sin(j*47+i)*2+f*7,y+3+f*32,z+Math.cos(j*53)*2,.32,.331,.30,burn*smooth(0,.18,f)*(1-f)*.2,5+f*17);if(j<9)point(x+Math.sin(j*77)*3,y+2+f*7,z+Math.cos(j*43)*2,1.,.50,.13,burn*(1-f)*.8,2.4+f*2.5)}}
 let roadBurn=smooth(119,137,t)*(1-smooth(216,248,t));for(let i=0;i<3;i++){let x=109+i*18,z=35+i*36,y=J.ground(x,z);for(let j=0;j<13;j++){let f=(t*.13+j*.079+i*.18)%1;point(x+f*6+Math.sin(j*41)*1.8,y+2+f*27,z+Math.cos(j*12)*2,.40,.40,.347,roadBurn*smooth(0,.16,f)*(1-f)*.14,4+f*18)}}
 R.updateDynamic(fx,n);
 // Archery volleys are an illustrative combat effect, not a casualty simulation.
 let a=w.arrows,an=0;const segment=(x,y,z,x2,y2,z2,col)=>{if(an+2>a.capacity)return;a.attrs[0].ar.set([x,y,z,x2,y2,z2],an*3);a.attrs[2].ar.set([...col,...col],an*3);an+=2};
 for(let g of J.groups){if(g.state.combat<.35||g.state.loss>.7)continue;let target=null,dd=1e9;for(let o of J.groups){if(o.id===g.id||(g.team===0)===(o.team===0)||o.team===3||o.state.combat<=.2)continue;let d=Math.hypot(o.state.x-g.state.x,o.state.z-g.state.z);if(d<dd){dd=d;target=o}}if(!target||dd>140||dd<12)continue;
 for(let j=0;j<9;j++){let p=(t*.45+j*.103+g.id*.051)%1;if(p>.78)continue;p/=.78;let s=g.state,e=target.state,off=(j-4)*1.35;let x=mix(s.x+off,e.x+off,p),z=mix(s.z-2,e.z+1,p),y=mix(s.y+2,e.y+1,p)+Math.sin(p*Math.PI)*Math.min(22,dd*.3);let p2=Math.max(0,p-.024),x2=mix(s.x+off,e.x+off,p2),z2=mix(s.z-2,e.z+1,p2),y2=mix(s.y+2,e.y+1,p2)+Math.sin(p2*Math.PI)*Math.min(22,dd*.3);segment(x,y,z,x2,y2,z2,[.47,.40,.265]);}}
 R.updateDynamic(a,an);
 // Optional tactical overlay: only a schematic path, never the claimed exact historic route.
 let lp=w.paths,ln=0;for(let i=0;i<7;i++){let a=J.supplyPath[i],b=J.supplyPath[i+1];lp.attrs[0].ar.set([a[0],J.ground(...a)+3,a[1],b[0],J.ground(...b)+3,b[1]],ln*3);let col=t<120?[.79,.675,.38]:[.67,.34,.28];lp.attrs[2].ar.set([...col,...col],ln*3);ln+=2;}R.updateDynamic(lp,ln);
};

J.updateLOD=function(R,w){
 let batches=[[],[],[]];for(let g of J.groups){let s=g.state,p=J.mat.project([s.x,s.y+2,s.z],R.vp),dist=Math.hypot(s.x-R.eye[0],s.y-R.eye[1],s.z-R.eye[2]),extent=60/Math.max(20,p[3]);let visible=dist<=52||!(p[3]<0||Math.abs(p[0])>1.13+extent||Math.abs(p[1])>1.12+extent||p[2]>1.002);if(s.loss>.001){let k=g.id*4,fp=J.mat.project([J.fall[k],J.fall[k+1]+1,J.fall[k+2]],R.vp),fd=Math.hypot(J.fall[k]-R.eye[0],J.fall[k+1]-R.eye[1],J.fall[k+2]-R.eye[2]),fe=60/Math.max(20,fp[3]);visible=visible||(fp[3]>0&&Math.abs(fp[0])<1.13+fe&&Math.abs(fp[1])<1.12+fe);dist=Math.min(dist,fd);}if(!visible)continue;let low=J.app.quality==='smooth'||J.app.quality==='auto'&&R.software, d0=low?27:52,d1=low?72:140,old=w.lodMemory[g.id];let tier=dist<d0?0:dist<d1?1:2;if(old===0&&dist<d0*1.22)tier=0;else if(old===1&&dist>d0*.83&&dist<d1*1.20)tier=1;else if(old===2&&dist>d1*.83)tier=2;w.lodMemory[g.id]=tier;batches[tier].push(g.id)}
 for(let tier=0;tier<3;tier++){let ids=batches[tier],key=ids.join(',');if(key===w.lodKeys[tier])continue;w.lodKeys[tier]=key;let count=ids.length*120,a=w.lodBuffers[tier][0].subarray(0,count*4),b=w.lodBuffers[tier][1].subarray(0,count*4);for(let i=0;i<ids.length;i++){let src=ids[i]*120*4;a.set(w.troopA.subarray(src,src+480),i*480);b.set(w.troopB.subarray(src,src+480),i*480)}R.updateInstances(w.lodMeshes[tier],a,b);if(tier===2){w.farPoints.attrs[4].ar.set(a);w.farPoints.attrs[5].ar.set(b);R.updateDynamic(w.farPoints,count);}w.lodMeshes[tier].instances=count;w.lodCounts[tier]=count;}
 let near=batches[0].concat(batches[1]),sk=near.join(',');if(sk!==w.shadowKey){w.shadowKey=sk;let aa=w.lodBuffers[3][0].subarray(0,near.length*480),bb=w.lodBuffers[3][1].subarray(0,near.length*480);for(let i=0;i<near.length;i++){let src=near[i]*480;aa.set(w.troopA.subarray(src,src+480),i*480);bb.set(w.troopB.subarray(src,src+480),i*480)}R.updateInstances(w.troopShadows,aa,bb);w.troopShadows.instances=near.length*120;}
};

J.renderWorld=function(R,w,t,opts){
 const gl=R.gl;J.updateLOD(R,w);let p=R.use('static',t);gl.uniform1i(R.loc(p,'uGround'),1);gl.uniform1i(R.loc(p,'uKind'),1);R.draw(w.terrain);gl.uniform1i(R.loc(p,'uKind'),0);R.draw(w.roads);R.draw(w.stamps);
 p=R.use('water',t);gl.uniform1i(R.loc(p,'uGround'),1);gl.uniform1f(R.loc(p,'uFlow'),opts.paths?1:0);R.draw(w.water);
 p=R.use('static',t);gl.uniform1i(R.loc(p,'uKind'),2);R.draw(w.buildings);R.draw(w.details);R.draw(t<98?w.pots:w.brokenPots);gl.uniform1i(R.loc(p,'uKind'),0);R.draw(w.grass);
 let treeKey='',treeN=0;for(let i=0;i<w.treeA.length;i+=4){const x=w.treeA[i],y=w.treeA[i+1]+6,z=w.treeA[i+2];if(R.sphereVisible([x,y,z],15)){treeKey+=i+',';w.treeCullA.set(w.treeA.subarray(i,i+4),treeN*4);w.treeCullB.set(w.treeB.subarray(i,i+4),treeN*4);treeN++;}}
 if(treeKey!==w.treeKey){w.treeKey=treeKey;R.updateInstances(w.trees,w.treeCullA.subarray(0,treeN*4),w.treeCullB.subarray(0,treeN*4));w.trees.instances=treeN;}
 R.use('inst',t);R.draw(w.trees);R.draw(w.boats);R.draw(w.carts);
 gl.enable(gl.BLEND);gl.depthMask(false);R.use('shadow',t,true);R.draw(w.armyShadows);R.draw(w.troopShadows);gl.depthMask(true);gl.disable(gl.BLEND);
 R.use('troop',t,true);R.draw(w.lodMeshes[0]);R.draw(w.lodMeshes[1]);if(opts.quality==='smooth'||opts.quality==='auto'&&(R.software||opts.adaptivePoints)){p=R.use('crowd',t,true);gl.uniform1f(R.loc(p,'uPointScale'),R.height*R.pixelRatio/(2*Math.tan((J.camera.fov||48)*Math.PI/360)));gl.uniform1f(R.loc(p,'uViewElev'),J.camera.elev);gl.uniform1f(R.loc(p,'uViewYaw'),J.camera.yaw);R.draw(w.farPoints,gl.POINTS);}else{R.use('troopfar',t,true);R.draw(w.lodMeshes[2]);}
 R.use('pole',t,true);R.draw(w.poles);R.draw(w.commanders);
 p=R.use('flag',t,true);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,w.flagTex);gl.uniform1i(R.loc(p,'uAtlas'),0);R.draw(w.flags);
 gl.enable(gl.BLEND);gl.depthMask(false);if(opts.paths){J.updateMotion(R,w,t,opts);R.use('motion',t);R.draw(w.motion,gl.TRIANGLES);}R.use('line',t);R.draw(w.arrows,gl.LINES);
 p=R.use('point',t);gl.uniform1f(R.loc(p,'uPointScale'),R.height*R.pixelRatio*1.07);R.draw(w.effects,gl.POINTS);
 gl.depthMask(true);gl.disable(gl.BLEND);
};
})();
