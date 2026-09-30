'use strict';
(()=>{
const {mix,clamp,smooth}=J;
J.DURATION=300;
J.chapters=[
 {at:0,key:'围城',title:'巨鹿被围',sub:'一座城，两支秦军，一条粮道。',text:'王离围攻巨鹿，章邯驻军其南，以甬道向围城军输粮。北面的救援军队尚未大举出战。',watch:'先看城南的运输线，再看北面的援军营垒。',source:'《史记·项羽本纪》《张耳陈馀列传》',supply:'输送中',chu:'河畔集结',qin:'围城 / 筑道',allies:'营垒观望'},
 {at:32,key:'先遣',title:'先遣部队渡河',sub:'先渡河的，不是全部楚军。',text:'项羽先遣当阳君、蒲将军率部渡河救援，取得初步战果；陈馀再请增兵。画面渡口与航线为示意。',watch:'观察楚军前锋乘舟过河，主力仍在南岸。',source:'《史记·项羽本纪》',supply:'输送中',chu:'前锋渡河',qin:'维持围困',allies:'等待战局'},
 {at:66,key:'渡河',title:'主力渡河 · 破釜沉舟',sub:'携三日粮，向战场推进。',text:'楚军主力渡河后沉船、破釜甑、烧庐舍。本演示压缩渡河与毁舟过程，不把五分钟对应为历史上的五分钟。',watch:'转到渡口，看船只抵岸、兵卒展开与毁舟。',source:'《史记·项羽本纪》',supply:'运输受扰',chu:'主力北进',qin:'南翼戒备',allies:'仍在营中'},
 {at:105,key:'断道',title:'切断甬道',sub:'围城军的粮食，来自城外。',text:'史书记楚军截断秦军甬道，围城部队出现缺粮。运输线受阻，是观察本战局变化的重要线索。',watch:'粮车停止前进；楚军与护道秦军接战。',source:'《史记·项羽本纪》《张耳陈馀列传》',supply:'反复受阻',chu:'截击粮道',qin:'护道 / 接战',allies:'关注战局'},
 {at:150,key:'交锋',title:'楚秦反复交锋',sub:'正面接战，侧面断粮。',text:'《项羽本纪》记“九战，绝其甬道”。楚军反复交锋、截断甬道，围城秦军面临战斗与补给中断的双重压力。',watch:'可暂停靠近：军阵推进、长兵交锋、箭矢与退阵。',source:'《史记·项羽本纪》',supply:'运输中断',chu:'多处接战',qin:'围城军受压',allies:'尚未全面投入'},
 {at:205,key:'合击',title:'诸侯军进击',sub:'营垒外，新的军阵开始移动。',text:'《张耳陈馀列传》记章邯退却后，诸侯军进击围城秦军。本段依此呈现援军由观望到出动的变化。',watch:'看北侧与东侧援军；章邯部与王离部并非同一结局。',source:'《史记·张耳陈馀列传》',supply:'已经断绝',chu:'继续进击',qin:'章邯部脱离',allies:'出营接战'},
 {at:240,key:'解围',title:'围城秦军败',sub:'王离被俘，巨鹿解围。',text:'围城秦军被击败，王离被俘。画面中的倒地、散退和降旗仅为战果的视觉表达，不对应精确伤亡。',watch:'对照城周围的军阵与仍在远处的章邯部。',source:'《史记·项羽本纪》《张耳陈馀列传》',supply:'围城体系瓦解',chu:'控制战场',qin:'王离部败',allies:'解除围困'},
 {at:270,key:'尾声',title:'战役尾声',sub:'同一座城，已经不同的局面。',text:'巨鹿之战后项羽成为诸侯上将军。章邯与项羽后续的相持、战斗和投降，属于后续过程，不并入这一场解围战。',watch:'回到全景，对照开场；仍可自由旋转与回看任一阶段。',source:'《史记·项羽本纪》',supply:'演示完成',chu:'战后集结',qin:'后续另叙',allies:'会于巨鹿'}
];
J.phaseAt=t=>{let i=0;while(i<J.chapters.length-1&&t>=J.chapters[i+1].at)i++;return i};
J.riverZ=x=>290+22*Math.sin(x*.006)+9*Math.sin(x*.014);
J.height=(x,z)=>{
 const rd=Math.abs(z-J.riverZ(x));
 const plain=3.2+Math.sin(x*.018+z*.014)*.48+Math.cos(z*.018-x*.01)*.3;
 const hillMask=smooth(420,850,Math.hypot(x*.95,z*.85));
 const hills=hillMask*(21+28*Math.pow(Math.sin(x*.004+1.1)*Math.cos(z*.0037),2)+55*Math.pow(Math.sin(x*.0025-z*.003),4));
 let h=plain+hills*smooth(45,185,rd);
 const plateau=(1-smooth(77,116,Math.abs(x)))*(1-smooth(64,94,Math.abs(z+170)));
 h=mix(h,3.5,plateau);
 h=mix(-2.5,h,smooth(21,47,rd));return h;
};
J.ground=(x,z)=>Math.max(J.height(x,z),.5);
const groups=J.groups=[];
const mkroute=(a)=>a.map((p,i)=>{if(p.length<4){let nx=i+1;while(nx<a.length&&Math.hypot(a[nx][1]-p[1],a[nx][2]-p[2])<.01)nx++;let yaw=nx<a.length?Math.atan2(a[nx][1]-p[1],a[nx][2]-p[2]):i?Math.atan2(p[1]-a[i-1][1],p[2]-a[i-1][2]):Math.PI;p=[...p,yaw]}return p});
// Hermite paths retain authored waypoints, align heading with actual velocity,
// and stop only at authored holds. Distances are MODEL meters, not historic measurements.
J.routeAt=(r,t)=>{
 let k=0;while(k<r.length-2&&t>r[k+1][0])k++;
 const a=r[k],b=r[k+1],dt=b[0]-a[0],u=clamp((t-a[0])/dt);
 const vel=(i)=>{let before=r[Math.max(0,i-1)],cur=r[i],after=r[Math.min(r.length-1,i+1)];
  if(i===0||i===r.length-1)return[0,0];
  const v0=[(cur[1]-before[1])/(cur[0]-before[0]),(cur[2]-before[2])/(cur[0]-before[0])],v1=[(after[1]-cur[1])/(after[0]-cur[0]),(after[2]-cur[2])/(after[0]-cur[0])];
  const s0=Math.hypot(...v0),s1=Math.hypot(...v1);if(s0<.02||s1<.02||v0[0]*v1[0]+v0[1]*v1[1]<0)return[0,0];
  const sum=[v0[0]/s0+v1[0]/s1,v0[1]/s0+v1[1]/s1],len=Math.hypot(...sum)||1,sp=Math.min(s0,s1)*.85;
  return sum.map(x=>x/len*sp);
 };
 if(!r._arc){r._arc=[];r._tangents=r.map((_,i)=>vel(i));let cumulative=0;
  for(let i=0;i<r.length-1;i++){let a=r[i],b=r[i+1],d=b[0]-a[0],m=r._tangents[i],n=r._tangents[i+1],prev=[a[1],a[2]],arr=[0];
   for(let j=1;j<=20;j++){let u=j/20,u2=u*u,u3=u2*u;let q=[0,1].map(c=>(2*u3-3*u2+1)*a[c+1]+(u3-2*u2+u)*d*m[c]+(-2*u3+3*u2)*b[c+1]+(u3-u2)*d*n[c]);arr.push(arr.at(-1)+Math.hypot(q[0]-prev[0],q[1]-prev[1]));prev=q;}
   r._arc.push({offset:cumulative,samples:arr});cumulative+=arr.at(-1);
  }
 }
 const m=r._tangents[k],n=r._tangents[k+1],u2=u*u,u3=u2*u;
 const pos=[0,1].map(c=>(2*u3-3*u2+1)*a[c+1]+(u3-2*u2+u)*dt*m[c]+(-2*u3+3*u2)*b[c+1]+(u3-u2)*dt*n[c]);
 const v=[0,1].map(c=>((6*u2-6*u)*a[c+1]+(3*u2-4*u+1)*dt*m[c]+(-6*u2+6*u)*b[c+1]+(3*u2-2*u)*dt*n[c])/dt);
 const speed=Math.hypot(...v),moving=Math.hypot(b[1]-a[1],b[2]-a[2])>.01;
 let yaw=moving?Math.atan2(speed>.015?v[0]:b[1]-a[1],speed>.015?v[1]:b[2]-a[2]):a[3];
 if(moving){const turn=J.smooth(.87,1,u),da=((b[3]-yaw+Math.PI*3)%(Math.PI*2))-Math.PI;yaw+=da*turn;}
 const arc=r._arc[k],iu=Math.min(19,Math.floor(u*20)),travel=arc.offset+mix(arc.samples[iu],arc.samples[iu+1],u*20-iu);
 return{x:pos[0],z:pos[1],yaw,walk:smooth(.02,.65,speed),speed,travel};
};
function add(name,team,route,battle,loss,role='步阵'){let g={id:groups.length,name,team,route:mkroute(route),battle,loss,role,cols:10,rows:12};groups.push(g);return g}
const PI=Math.PI;
// All coordinates, durations, rendered formations and losses are illustrative, not measured historical data.
for(let i=0;i<6;i++){
 let x=-80+i*31;
 add('王离 · 南面围城军',0,[[0,x,-66,0],[111,x,-66,0],[151,x,-10,0],[204,x,-10,0],[233,x+8,-45,0],[264,x+36,-52,1.5]], [135,243],[175,258,.79]);
}
for(let i=0;i<4;i++){
 let z=-215+i*40;
 add('王离 · 西面围城军',0,[[0,-115,z,-PI/2],[105,-115,z,-PI/2],[151,-144,z,-PI/2],[205,-144,z,-PI/2],[238,-103,z-10,PI/2],[264,-95,z-20,PI/2]],[129,242],[169,261,.80]);
}
for(let i=0;i<4;i++){
 let z=-220+i*43;
 add('王离 · 东面围城军',0,[[0,121,z,PI/2],[210,121,z,PI/2],[235,143,z,PI/2],[267,107,z+22,-PI/2]],[213,254],[226,268,.83]);
}
for(let i=0;i<4;i++){
 let x=-54+i*35;
 add('王离 · 北面围城军',0,[[0,x,-269,PI],[210,x,-269,PI],[237,x,-282,PI],[265,x,-251,0]],[215,255],[227,268,.82]);
}
for(let i=0;i<8;i++){
 let x,z,targetX,targetZ;
 if(i<3){x=95+i*31;z=34+i*51;targetX=x-1;targetZ=z+6;}
 else {x=197+(i-3)%3*32;z=150+Math.floor((i-3)/3)*36;targetX=130+(i-3)%3*28;targetZ=83+Math.floor((i-3)/3)*38;}
 add(i<3?'秦军 · 甬道守军':'章邯 · 南部军',0,[[0,x,z,-PI/2],[109,x,z,-PI/2],[150,targetX,targetZ,-PI/2],[198,targetX,targetZ,-PI/2],[229,302+(i%3)*28,120+Math.floor(i/3)*32,PI/2],[270,436+(i%3)*25,83+Math.floor(i/3)*34,PI/2]],[112+i*2,216],[145,227,i<3?.49:.23]);
}
const CHU_START=groups.length;
for(let i=0;i<16;i++){
 let col=i%4,row=Math.floor(i/4),sx=-256+col*40,sz=362+row*30;
 let crossingX=-245+col*41,crossStart=i<3?35+i*4:i===10?68:68+(i-3)*1.14,crossEnd=i<3?53+i*3:i===10?87:84+(i-3)*1.16;
 let route=[[0,sx,sz,PI],[crossStart,sx,sz,PI],[crossStart+6,crossingX,J.riverZ(crossingX)+33,PI],[crossEnd,crossingX,J.riverZ(crossingX)-40,PI]];
 let tx,tz,start,end=245,face=PI;
 if(i<4){tx=63+(i%2)*24;tz=39+Math.floor(i/2)*45;face=PI/2;route.push([98+i*2,-55+i*18,155,PI/2],[127,tx,tz,face],[210,tx,tz,face],[258,tx+24,tz-32,PI]);start=113;}
 else if(i<8){let ii=i-4;tx=-166;tz=-215+ii*40;face=PI/2;route.push([111,-218,24+ii*5,PI],[145,tx,tz,face],[212,tx,tz,face],[264,-115,tz,face]);start=130;}
 else if(i<14){let ii=i-8;tx=-80+ii*31;tz=12;route.push([113,-100+ii*22,127,PI],[152,tx,tz,PI],[215,tx,tz,PI],[264,tx,-46,PI]);start=137;}
 else {let ii=i-14;tx=124+ii*26;tz=111+ii*20;face=PI/2;route.push([113,30+ii*20,178,PI/2],[150,tx,tz,face],[208,tx,tz,face],[259,185+ii*25,100,PI/2]);start=133;}
 let g=add(i<3?'楚军先遣 · 当阳君、蒲将军':'楚军主力 · 项羽',1,route,[start,end],[151,237,.10+(i%4)*.025]);g.cross=[crossStart,crossEnd,crossingX];
}
const ALLIES_START=groups.length;
const allies=[[-275,-273],[-235,-352],[-184,-359],[-126,-364],[-45,-388],[65,-373],[207,-345],[264,-283]];
for(let i=0;i<8;i++){
 let [x,z]=allies[i],tx,tz,face;
 if(i<2){tx=-168;tz=-228+i*55;face=PI/2;}
 else if(i<6){tx=-54+(i-2)*35;tz=-307;face=0;}
 else{tx=167;tz=-220+(i-6)*60;face=-PI/2;}
 add('诸侯援军',2,[[0,x,z,face],[205+i*.7,x,z,face],[235,tx,tz,face],[256,tx,tz,face],[290,tx+(i<2?38:i>5?-20:0),tz+(i>1&&i<6?30:0),face]],[222,257],[232,267,.065]);
}
for(let i=0;i<2;i++){add('巨鹿 · 赵军',3,[[0,-25+i*50,-167,0],[300,-25+i*50,-167,0]],[0,0],[300,301,0]);}
J.CHU_START=CHU_START;J.ALLIES_START=ALLIES_START;
J.travel=new Float32Array(64*4);
J.pose=new Float32Array(64*4);J.anim=new Float32Array(64*4);J.fall=new Float32Array(64*4);
J.unitCount=groups.reduce((s,g)=>s+g.cols*g.rows,0);
J.updateBattle=function(t){
 for(let g of groups){let s=J.routeAt(g.route,t),b=g.battle;
 let combat=b[1]>b[0]?smooth(b[0],b[0]+9,t)*(1-smooth(b[1]-8,b[1]+3,t)):0;
 let loss=smooth(g.loss[0],g.loss[1],t)*g.loss[2];
 let rd=Math.abs(s.z-J.riverZ(s.x));let pack=g.cross?(1-smooth(24,52,rd))*(1-smooth(g.cross[1],g.cross[1]+5,t)):0;
 let y=J.height(s.x,s.z);y=mix(y,1.06,pack);y=Math.max(.45,y);
 let k=g.id*4;J.pose.set([s.x,y,s.z,s.yaw],k);J.anim.set([s.walk,combat,loss,pack],k);J.travel.set([s.travel,s.speed,0,0],k);
 let f=J.routeAt(g.route,g.loss[0]+6);J.fall.set([f.x,J.ground(f.x,f.z),f.z,f.yaw],k);
 g.state={...s,y,combat,loss,pack};
 }
};
J.updateBattle(0);
})();
