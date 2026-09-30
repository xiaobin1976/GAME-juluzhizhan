'use strict';
(()=>{
 const {mix,clamp,smooth}=J,PI=Math.PI;
 const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
 // Unit identities have source support; subdivisions and placement are explicitly illustrative.
 J.forces=[
 {id:'xiang',label:'项羽',force:'楚军主力',team:1,lead:36,ids:range(34,39),role:'主力推进',note:'统领救赵楚军。画面按观察需要分为数个分队，不等于史载“左军、右军”。',source:7},
 {id:'bu',label:'英布',force:'楚军先遣 · 当阳君',team:1,lead:26,ids:[26,27],role:'先遣渡河',note:'《黥布列传》记英布为当阳君、先渡河击秦；与蒲将军的精确分兵及路线不详。',source:91},
 {id:'pu',label:'蒲将军',force:'楚军先遣',team:1,lead:28,ids:[28],role:'先遣救援',note:'《项羽本纪》记当阳君、蒲将军合率二万人先渡河；此处不拆分确定人数。',source:7},
 {id:'wang',label:'王离',force:'秦军 · 围城部',team:0,lead:3,ids:range(0,5),role:'围攻巨鹿',note:'王离围巨鹿有记载；围城军在不同城侧的编组、阵位为示意。',source:7},
 {id:'zhang',label:'章邯',force:'秦军 · 南部军',team:0,lead:22,ids:range(21,25),role:'南部驻军 / 输粮',note:'章邯军巨鹿南、筑甬道输粮。其后续投降不并入本场解围。',source:89},
 {id:'chen',label:'陈馀',force:'赵军 · 城北援军',team:2,lead:46,ids:range(44,47),role:'城北驻军',note:'《张耳陈馀列传》记陈馀收常山兵、军巨鹿北。出营动作与具体交战位置为示意。',source:89},
 {id:'ao',label:'张敖',force:'代地援军',team:2,lead:48,ids:[48,49],role:'收代兵来援',note:'列传记张敖收代兵万余人来援，壁陈馀旁；本场阵位、行军方向均为示意。',source:89},
 {id:'zhao',label:'张耳 · 赵王歇',force:'巨鹿城内',team:3,lead:50,ids:[50,51],role:'被围 / 守城',note:'二人在巨鹿城中。守城军的具体编制、城池规模不作考证性主张。',source:89},
 {id:'west',label:'楚军 · 西侧分队',force:'项羽统属 / 示意编组',team:1,lead:31,ids:range(30,33),role:'西侧推进',note:'为显示多方向接敌而设置的视觉分队；不冒称史载左军或某将独立军。',source:7},
 {id:'east',label:'楚军 · 粮道分队',force:'项羽统属 / 示意编组',team:1,lead:40,ids:[29,40,41],role:'接应断道',note:'截断甬道有史载；具体参与分队、行军路线、位置与时刻为示意。',source:7},
 {id:'guard',label:'秦军 · 护道分队',force:'甬道守军 / 示意编组',team:0,lead:19,ids:[18,19,20],role:'守护粮运',note:'为解释甬道关系而作的编组。不据此指认苏角或涉间的确切部署。',source:89},
 {id:'qinWest',label:'秦军 · 城西部',force:'王离围城军 / 示意编组',team:0,lead:7,ids:range(6,9),role:'围城西侧',note:'具体阵位与分队为示意，非史载独立军号。',source:7},
 {id:'qinNorth',label:'秦军 · 北东部',force:'王离围城军 / 示意编组',team:0,lead:15,ids:range(10,17),role:'围城北东侧',note:'具体阵位与分队为示意，非史载独立军号。',source:7},
 {id:'allies',label:'诸侯援军',force:'其他援军 / 合并示意',team:2,lead:42,ids:[42,43],role:'营中观望',note:'燕、齐、楚来救赵见《张耳陈馀列传》；合并显示未能具体定位的援军。',source:89}
 ];
 J.forceById=Object.fromEntries(J.forces.map(f=>[f.id,f]));
 for(const f of J.forces)for(const id of f.ids)J.groups[id].forceId=f.id;
 J.forceState=(id,t)=>{
  const f=J.forceById[id]||J.forces[0],g=J.groups[f.lead],s=g.state;
  let status='驻守',action='驻阵',sp=s.speed;
  if(f.team===1){status=t<32?'河畔集结':t<66?(f.id==='bu'||f.id==='pu'?'先遣北进':'待命集结'):t<102?'渡河 / 展开':t<150?'向战场推进':t<240?'持续接战':'战后集结';}
  else if(f.team===0){status=f.id==='zhang'?(t<110?'南部驻军':t<198?'与楚军接战':t<270?'脱离战场':'后续另叙'):(t<110?'围城 / 护道':t<150?'粮运受扰':t<235?'补给中断':'围城军败');}
  else if(f.team===2){status=t<205?'营垒观望':t<235?'出营进击':t<258?'接战解围':'城下会合';}
  else status=t<245?'被围守城':'围困解除';
  if(s.pack>.28)action='渡河';else if(s.loss>.64)action='溃退 / 失序';else if(sp>.15)action=f.id==='zhang'&&t>198?'撤离':s.combat>.4?'推进接敌':'行进';else if(s.combat>.4)action='交锋';else action=f.team===2&&t<205?'观望':'驻阵';
  return{f,g,s,status,action,speed:sp};
 };
 // [start,end,shot title,narrative,focus,anchor, start/end radius,yaw,elevation,FOV,world title]
 // yaw values are intentional screen directions, not historic camera positions.
 const S=(at,end,name,line,focus,anchor,r,y,e,fov=48,title='')=>({at,end,name,line,focus,anchor,r:Array.isArray(r)?r:[r,r],y:Array.isArray(y)?y:[y,y],e:Array.isArray(e)?e:[e,e],fov:Array.isArray(fov)?fov:[fov,fov],title});
 J.shots=[
 S(0,9,'城内与城外','巨鹿被围。秦军驻在城外，救援诸军的营垒在更远处。','zhao',[0,8,-169],[590,450],[-.72,-.48],[.52,.42],[47,48],'巨 鹿'),
 S(9,18,'城下的压力','王离部驻于城外。守城者与援军之间，隔着秦军。','wang',[0,8,-104],[175,135],[.48,.18],[.20,.24],51,''),
 S(18,26,'甬道输粮','章邯部通过甬道输粮，王离的围城军依靠这条通路。','zhang','cart',[78,106],[-1.0,-.75],[.27,.43],50,'甬 道'),
 S(26,32,'北面的营垒','城北已有援军，但围困还没有解开。','chen','unit',[160,185],[2.6,2.85],[.27,.43],48,'城 北'),
 S(32,42,'先遣北渡','当阳君英布与蒲将军率先渡河，楚军主力仍在南岸。','bu','unit',[80,65],[-.7,-.30],[.25,.21],50,'楚军先遣'),
 S(42,52,'渡水向北','前部渡河，后队仍在岸边。楚军先遣逐次向北推进。','bu','unit',[58,68],[-1.23,-1.52],[.13,.22],51,''),
 S(52,60,'前部抵岸','先遣部队抵岸展开。主力仍在后面。','pu','unit',[97,84],[2.45,2.80],[.25,.32],49,''),
 S(60,66,'南岸与北岸','先遣已经渡河；楚军主力尚在后面，巨鹿在更远的北方。','bu',[-90,5,98],[560,630],[-.42,-.35],[1.09,1.16],50,''),
 S(66,77,'主力渡河','楚军主力离开集结地，向渡口推进。','xiang','unit',[96,73],[-.32,-.16],[.26,.16],52,'主力渡河'),
 S(77,88,'河面上的军阵','楚军乘舟渡河，抵岸后重新集结，准备继续北进。','xiang','unit',[182,215],[-1.05,-.84],[.50,.67],48,''),
 S(88,96,'不再准备归舟','部队抵岸之后，舟船开始沉下。','xiang',[-168,2,279],[125,89],[-1.35,-1.0],[.27,.15],50,'破釜沉舟'),
 S(96,105,'岸边的余火','舟船沉没，釜甑破碎，岸边庐舍起火；楚军向前。','xiang',[-185,5,237],[118,167],[-1.0,-.66],[.21,.39],49,''),
 S(105,116,'楚军北进','渡河之后，楚军向巨鹿方向推进。前方是秦军的围城与粮运体系。','xiang','unit',[78,64],[-1.15,-.83],[.18,.17],53,'北 进'),
 S(116,127,'先遣接敌','楚军先遣靠近运输通道，与附近秦军接战。','bu','unit',[118,101],[-1.05,-.71],[.40,.30],50,''),
 S(127,138,'粮道中断','看这条通路：运输停止，围城军的补给受到影响。','guard',[125,4,65],[240,178],[-.61,-.42],[.90,.72],47,'断其甬道'),
 S(138,150,'西侧接战','西侧楚军与城外秦军接战，另一侧的甬道仍受攻击。','west','unit',[89,74],[-.58,-.99],[.22,.17],51,''),
 S(150,161,'长兵相接','楚秦双方在城外反复交锋。前排接战，后排维持队形。','xiang','contact',[88,70],[-1.35,-1.15],[.24,.16],54,'楚秦交锋'),
 S(161,171,'围城军受压','秦军正面承受进攻，身后的粮食供应也已经中断。','wang','contact',[96,77],[1.31,1.08],[.23,.18],51,''),
 S(171,183,'交锋未止','城南交锋持续，城内赵军的围困尚未解除。','xiang','contact',[122,105],[-.70,.45],[.43,.32],50,''),
 S(183,193,'西侧交锋','秦楚交锋不止一处。西侧战线，双方仍在接战。','west','contact',[61,73],[-1.72,-1.31],[.16,.24],52,''),
 S(193,205,'围城与断粮','围城军、甬道与南部秦军，原本相互支持；断粮正在改变这一局面。','zhang',[35,4,-47],[560,650],[-.37,-.25],[1.04,1.17],48,'战 局'),
 S(205,216,'章邯部退却','章邯部向外脱离，与仍在巨鹿城外的王离部逐渐分开。','zhang','unit',[102,80],[2.6,2.9],[.31,.20],50,''),
 S(216,228,'援军走出营垒','北面的军阵开始移动。观望的局面发生了变化。','chen','unit',[111,89],[2.90,2.62],[.29,.20],52,'诸侯进击'),
 S(228,240,'诸军合击','诸侯军出营进击，围城秦军受到新的攻击。','ao',[24,5,-254],[285,235],[2.80,2.35],[.72,.62],49,''),
 S(240,249,'围城军败','王离部败，围城军阵瓦解。巨鹿的围困即将解除。','wang','unit',[101,83],[.45,.12],[.29,.25],50,''),
 S(249,260,'巨鹿解围','王离被俘，巨鹿得以解围。城外已经是另一种局面。','zhao',[0,10,-111],[229,270],[.36,.67],[.22,.35],48,'巨鹿解围'),
 S(260,270,'围困解除','秦军的围城体系瓦解，楚军与诸侯援军在城下会合。','xiang',[0,4,-155],[520,635],[-.50,-.70],[.86,.97],48,''),
 S(270,282,'楚军在城下','楚军在巨鹿城下集结。章邯部退去后的战事，属于后续过程。','xiang','unit',[100,137],[-.82,-.36],[.24,.38],50,''),
 S(282,292,'回望巨鹿','城仍在这里。围城的军阵退散，前来救援的军队已经抵达。','zhao',[0,4,-126],[660,820],[-.63,-.43],[.76,.85],48,''),
 S(292,300,'尾声','解围战至此结束。时间可以回看，战局不会因观察而改变。','zhao',[0,5,-75],[900,975],[-.42,-.34],[.91,.99],48,'巨 鹿 · 解 围')
 ];
 J.shotAt=t=>J.shots.find(s=>t>=s.at&&t<s.end)||J.shots.at(-1);
 J.nearestEnemy=(g)=>{let best=null,dd=Infinity;for(let o of J.groups){if((g.team===0)===(o.team===0)||o.team===3)continue;let d=Math.hypot(o.state.x-g.state.x,o.state.z-g.state.z);if(d<dd){best=o;dd=d;}}return best;};
 J.anchor=(shot,t)=>{
  const f=J.forceById[shot.focus],s=J.groups[f.lead].state;
  if(Array.isArray(shot.anchor))return [...shot.anchor];
  if(shot.anchor==='cart'){let p=J.pathPoint(J.supplyPath,(.38+Math.min(t,127)*.008)%1);return[p.x,J.ground(p.x,p.z)+2,p.z];}
  if(shot.anchor==='contact'){let enemy=J.nearestEnemy(J.groups[f.lead]);if(enemy&&Math.hypot(s.x-enemy.state.x,s.z-enemy.state.z)<120)return[(s.x+enemy.state.x)/2,(s.y+enemy.state.y)/2+2.2,(s.z+enemy.state.z)/2];}
  return[s.x,s.y+3.2,s.z];
 };
 J.directedPose=t=>{const shot=J.shotAt(t),u=clamp((t-shot.at)/(shot.end-shot.at)),v=u*u*(3-2*u);return{shot,target:J.anchor(shot,t),distance:mix(...shot.r,v),yaw:mix(...shot.y,v),elev:mix(...shot.e,v),fov:mix(...shot.fov,v)};};
 // Ground-projected motion graphics: bounded buffers and no timeline-dependent accumulation.
 J.updateMotion=(R,w,t,opts)=>{
  const mesh=w.motion;let n=0;const sh=J.shotAt(t),motionAlpha=opts.guide?smooth(.1,1.45,t-sh.at):1;
  const vertex=(x,y,z,col)=>{if(n>=mesh.capacity)return;mesh.attrs[0].ar.set([x,y,z],n*3);mesh.attrs[2].ar.set([col[0],col[1],col[2],col[3]*motionAlpha],n*4);n++;};
  const strip=(a,b,width,col)=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.05)return;const nx=-dz/len*width*.5,nz=dx/len*width*.5;
   const vs=[[a[0]+nx,a[1]+nz],[a[0]-nx,a[1]-nz],[b[0]-nx,b[1]-nz],[b[0]+nx,b[1]+nz]];
   for(const i of[0,1,2,0,2,3])vertex(vs[i][0],J.ground(...vs[i])+.55,vs[i][1],col);
  };
  const focus=opts.focusId||'xiang',selected=J.forceById[focus]||J.forces[0],wide=J.camera?.distance>380;
  let fs=wide?J.forces.filter(f=>['xiang','bu','pu','zhang','chen','ao','west'].includes(f.id)):[selected];
  for(const f of fs){const g=J.groups[f.lead],s=g.state,col=f.team===0?[.78,.87,.90]:f.team===1?[.94,.44,.29]:[.49,.84,.76];
   if(s.speed<.18||s.loss>.65)continue;
   let previous=null;
   for(let i=0;i<=22;i++){let tt=Math.max(0,t-13+i*13/22),p=J.routeAt(g.route,tt),pos=[p.x,p.z];if(previous)strip(previous,pos,wide?3.2:1.1,[...col,.08+i/22*.20]);previous=pos;}
   // Forward chevrons flow with simulation time and freeze when paused.
   for(let j=0;j<4;j++){const loop=(t*.22+j/4)%1,fade=smooth(0,.16,loop)*(1-smooth(.73,1,loop)),tt=t+loop*9,p=J.routeAt(g.route,tt);if(p.speed<.1)continue;const dx=Math.sin(p.yaw),dz=Math.cos(p.yaw),q=[p.x,p.z],w=wide?9:5.6;
    strip([q[0]-dx*w+dz*w*.6,q[1]-dz*w-dx*w*.6],q,.8,[...col,.65*fade]);strip([q[0]-dx*w-dz*w*.6,q[1]-dz*w+dx*w*.6],q,.8,[...col,.65*fade]);
   }
   // Thin streaks outside the formation read as motion without obscuring soldiers.
   for(let j=0;j<4&&!wide;j++){const p=J.routeAt(g.route,Math.max(0,t-(j*.63+(t*.8)%1)*1.2)),dx=Math.sin(p.yaw),dz=Math.cos(p.yaw),off=(j%2?1:-1)*12,len=clamp(s.speed*1.4,3,13),fa=smooth(0,.12,(t*.8)%1)*(1-smooth(.72,1,(t*.8)%1));strip([p.x+dz*off-dx*len,p.z-dx*off-dz*len],[p.x+dz*off,p.z-dx*off],.22,[...col,.47*fa]);}
  }
  // Supply flow, independent of camera; stops when supply is cut in the narrative.
  if(wide||['zhang','guard','bu','pu','east'].includes(focus)){
   for(let i=0;i<J.supplyPath.length-1;i++)strip(J.supplyPath[i],J.supplyPath[i+1],2.4,t<127?[.90,.73,.39,.21]:[.87,.35,.25,.22]);
   for(let j=0;j<9;j++){let q=J.pathPoint(J.supplyPath,(j/9+Math.min(t,127)*.012)%1),d=[Math.sin(q.yaw),Math.cos(q.yaw)],c=t<127?[.97,.80,.45,.75]:[.85,.33,.24,.5];strip([q.x-d[0]*4+d[1]*2,q.z-d[1]*4-d[0]*2],[q.x,q.z],.5,c);strip([q.x-d[0]*4-d[1]*2,q.z-d[1]*4+d[0]*2],[q.x,q.z],.5,c);}
  }
  // Four small brackets, not a game selection disc.
  if(!wide){let s=J.groups[selected.lead].state;for(let sx of[-1,1])for(let sz of[-1,1]){let x=s.x+sx*13,z=s.z+sz*13;strip([x-sx*4,z],[x,z],.35,[.96,.85,.59,.63]);strip([x,z-sz*4],[x,z],.35,[.96,.85,.59,.63]);}}
  R.updateDynamic(mesh,n);
 };
})();
