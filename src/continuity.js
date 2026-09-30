'use strict';
/* V3 — authoritative continuous time. No spawn/despawn lists, no accumulated physics.
   Every replay/seek samples the same immutable tracks. All distances are illustrative. */
(()=>{
 const {clamp,mix,smooth}=J,PI=Math.PI;
 const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
 J.ease=ease;
 J.angleMix=(a,b,u)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*u;
 const rawRoute=J.routeAt;
 // The old last-13%-of-segment yaw rule became discontinuous on arriving at a hold.
 // Keep position/velocity Hermite, but author continuous headings independently.
 J.routeAt=(r,t)=>{
  const s=rawRoute(r,t);let k=0;while(k<r.length-2&&t>=r[k+1][0])k++;
  const a=r[k],b=r[k+1],span=b[0]-a[0],u=clamp((t-a[0])/span);
  const moving=Math.hypot(b[1]-a[1],b[2]-a[2])>.01;
  if(!moving)s.yaw=J.angleMix(a[3],b[3],ease(u));
  else{
   // Velocity direction is sampled inside the segment, avoiding atan2(0,0).
   const h=Math.min(.06,span*.002),q0=rawRoute(r,clamp(t-h,a[0]+.0001,b[0]-.0001)),q1=rawRoute(r,clamp(t+h,a[0]+.0001,b[0]-.0001));
   const dx=q1.x-q0.x,dz=q1.z-q0.z;
   let heading=Math.hypot(dx,dz)>.000001?Math.atan2(dx,dz):Math.atan2(b[1]-a[1],b[2]-a[2]);
   heading=J.angleMix(a[3],heading,ease(u/.20));
   s.yaw=J.angleMix(heading,b[3],ease((u-.76)/.24));
  }
  return s;
 };
 // Sixteen persistent boats, each with its own berth. Formerly four overlapping berths
 // separated instantaneously on landing. The new route and its passenger share x/z.
 J.transports=[];
 for(let i=0;i<16;i++){
  const g=J.groups[J.CHU_START+i],old=g.route,start=g.cross[0],end=g.cross[1];
  const lane=i%4,row=Math.floor(i/4),x=-282+lane*49+row*10.9,rz=J.riverZ(x);
  const depart=start+6,arrive=end-2,clear=end+5;
  const board=start+2,approach=Math.max(1,start-9);
  const tr={id:'boat-'+String(i+1).padStart(2,'0'),group:g.id,x,rz,board,depart,arrive,clear,sinkAt:Math.max(94,clear+5)};
  const tail=old.slice(4).filter(p=>p[0]>clear+.3);
  const initial=[old[0][0],old[0][1],old[0][2],PI];
  g.route=[initial,[approach,initial[1],initial[2],PI],[board,x,rz+44,PI],
   [depart,x,rz+21,PI],[arrive,x,rz-21,PI],[end+2,x,rz-44,PI],[clear,x,rz-54,PI],...tail];
  g.transport=tr;g.cross=[approach,clear,x];J.transports.push(tr);
 }
 J.boatAt=(tr,t)=>{
  const g=J.groups[tr.group];let p=J.routeAt(g.route,clamp(t,tr.depart,tr.arrive));
  const sink=ease((t-tr.sinkAt)/8);
  const heave=Math.sin(t*1.35+tr.group*.73)*.055;
  const y=-.03+heave-sink*5.6;
  return{id:tr.id,x:p.x,y,z:p.z,yaw:PI,roll:Math.sin(t*.93+tr.group)*.022*(1-sink),sink,
    phase:t<tr.board?'泊岸':t<tr.depart?'登舟':t<tr.arrive?'渡河':t<tr.clear?'离舟':sink>0?'沉舟':'北岸停泊'};
 };
 // Sparse analytic samples used by director, tests and overlays. One shared elevation.
 J.stateAt=(g,t)=>{
  const s=J.routeAt(g.route,t),b=g.battle;
  s.combat=b[1]>b[0]?smooth(b[0],b[0]+9,t)*(1-smooth(b[1]-8,b[1]+3,t)):0;
  s.loss=smooth(g.loss[0],g.loss[1],t)*g.loss[2];s.pack=0;s.aboard=0;
  s.y=J.ground(s.x,s.z);
  if(g.transport){const tr=g.transport,boat=J.boatAt(tr,t);
   s.pack=smooth(tr.board-1,tr.depart,t)*(1-smooth(tr.arrive,tr.clear,t));
   s.aboard=smooth(tr.board,tr.depart,t)*(1-smooth(tr.arrive,tr.clear-1,t));
   s.y=mix(s.y,boat.y+.99,s.aboard);
   // Marching stops on deck; a moving boat is not a running infantry animation.
   s.walk*=1-smooth(.75,1,s.aboard);
  }
  return s;
 };
 // Cache loss anchors; they are constants, not O(groups × route-length) each frame.
 for(const g of J.groups){const p=J.routeAt(g.route,g.loss[0]+6);g.fallAnchor=[p.x,J.ground(p.x,p.z),p.z,p.yaw];}
 J.updateBattle=t=>{
  J.simulationTime=t;
  for(const g of J.groups){const s=g.state=J.stateAt(g,t),k=g.id*4;
   J.pose.set([s.x,s.y,s.z,s.yaw],k);J.anim.set([s.walk,s.combat,s.loss,s.pack],k);
   J.travel.set([s.travel,s.speed,Math.cos(s.yaw),Math.sin(s.yaw)],k);J.fall.set(g.fallAnchor,k);
  }
 };
 // A contact partner remains a specific military formation, not a per-frame nearest
 // neighbour that can flip between two lines of soldiers while the camera is tracking.
 const enemyIds={xiang:2,bu:18,pu:19,wang:36,west:7,qinWest:31,guard:26,east:20,zhang:40,chen:15,ao:11,qinNorth:46,allies:6,zhao:3};
 J.contactPartners=enemyIds;
 J.contactAnchor=(id,t)=>{
  const f=J.forceById[id],s=J.stateAt(J.groups[f.lead],t),other=J.groups[enemyIds[id]],e=other?J.stateAt(other,t):s;
  const d=Math.hypot(e.x-s.x,e.z-s.z),k=(1-smooth(95,160,d))*.5;
  return[mix(s.x,e.x,k),mix(s.y,e.y,k)+2.8,mix(s.z,e.z,k)];
 };
 // No looping cart anchor: the escorted wagon has a persistent identity and slows
 // to a halt at the interrupted supply route instead of respawning at the road end.
 J.cartAt=(i,t)=>{
  const start=-.20+i*.047,advance=.0064*(t<121?t:t<127?121+6*((t-121)/6-Math.pow((t-121)/6,2)/2):124);
  const u=clamp(start+advance,0,.977),p=J.pathPoint(J.supplyPath,u);
  const vis=smooth(0,.025,start+advance)*(1-smooth(.95,1,start+advance));
  return{...p,u,visibility:vis};
 };
 J.anchor=(shot,t)=>{
  if(Array.isArray(shot.anchor))return [...shot.anchor];
  if(shot.anchor==='cart'){const p=J.cartAt(7,t);return[p.x,J.ground(p.x,p.z)+2,p.z];}
  if(shot.anchor==='contact')return J.contactAnchor(shot.focus,t);
  const s=J.stateAt(J.groups[J.forceById[shot.focus].lead],t);return[s.x,s.y+3.2,s.z];
 };
 const poseOf=(shot,t)=>{
  const u=ease((t-shot.at)/(shot.end-shot.at));
  return{target:J.anchor(shot,t),distance:mix(...shot.r,u),yaw:mix(...shot.y,u),elev:mix(...shot.e,u),fov:mix(...shot.fov,u)};
 };
 J.directedPose=t=>{
  const shot=J.shotAt(t),idx=J.shots.indexOf(shot),out=poseOf(shot,t);
  let blend=1;
  if(idx>0){const prev=J.shots[idx-1],end=poseOf(prev,t),length=1.75;
   blend=ease((t-shot.at)/length);
   if(blend<1){
    out.target=out.target.map((v,i)=>mix(end.target[i],v,blend));
    out.distance=Math.exp(mix(Math.log(end.distance),Math.log(out.distance),blend));
    out.yaw=J.angleMix(end.yaw,out.yaw,blend);out.elev=mix(end.elev,out.elev,blend);out.fov=mix(end.fov,out.fov,blend);
   }
  }
  return{...out,shot,blend};
 };
 J.chapterMoments=[0,34,70,93,127,152,217,249,273];
 J.updateBattle(0);
})();
