// Pure-track numerical regressions. Does not count as a browser / real-device test.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');global.window=global;
for(const name of['engine','battle','world','director','continuity'])vm.runInThisContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),{filename:name+'.js'});
J.supplyPath=[[196,214],[181,175],[157,135],[139,97],[117,56],[103,13],[84,-35],[64,-73]];
const results=[];function check(name,pass,detail){results.push({test:name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,JSON.stringify(detail??''));}
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const ad=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
check('52 military formations / 6240 representative soldiers',J.groups.length===52&&J.unitCount===6240);
check('16 stable unique boat identities',J.transports.length===16&&new Set(J.transports.map(t=>t.id)).size===16);
let peakPos=0,peakYaw=0,peakY=0;let worst={};const eps=1e-4;
for(const g of J.groups)for(const p of g.route){if(p[0]<=0)continue;const a=J.stateAt(g,p[0]-eps),b=J.stateAt(g,p[0]+eps);const d=Math.hypot(a.x-b.x,a.z-b.z);if(d>peakPos){peakPos=d;worst={id:g.id,t:p[0]}}peakYaw=Math.max(peakYaw,ad(a.yaw,b.yaw));peakY=Math.max(peakY,Math.abs(a.y-b.y));}
check('Route waypoints continuous in position (0.2ms sample gap)',peakPos<.02,{maxModelMeters:peakPos,worst});
check('Banners continuous in heading at every route waypoint',peakYaw<.015,{maxRadians:peakYaw});
check('Troop deck / shore height continuous at route waypoints',peakY<.02,{maxModelMeters:peakY});
let shipJump=0,shipYaw=0,minSeparation=Infinity,aboardError=0,submergeEarly=0;
for(const tr of J.transports){for(const t of[tr.board,tr.depart,tr.arrive,tr.clear,tr.sinkAt,tr.sinkAt+8]){const a=J.boatAt(tr,t-eps),b=J.boatAt(tr,t+eps);shipJump=Math.max(shipJump,dist([a.x,a.y,a.z],[b.x,b.y,b.z]));shipYaw=Math.max(shipYaw,ad(a.yaw,b.yaw));}
 for(let i=0;i<=30;i++){const t=J.mix(tr.depart,tr.arrive,i/30),s=J.stateAt(J.groups[tr.group],t),b=J.boatAt(tr,t);aboardError=Math.max(aboardError,Math.hypot(s.x-b.x,s.z-b.z),Math.abs(s.y-b.y-.99));}
 if(J.boatAt(tr,tr.clear).sink>0)submergeEarly++;
}
for(let t=0;t<=115;t+=.25){const boats=J.transports.map(tr=>J.boatAt(tr,t));for(let i=0;i<16;i++)for(let j=0;j<i;j++)minSeparation=Math.min(minSeparation,Math.hypot(boats[i].x-boats[j].x,boats[i].z-boats[j].z));}
check('Boats do not teleport at boarding / landing / sinking',shipJump<.005&&shipYaw<.001,{maxModelMeters:shipJump,maxRadians:shipYaw});
check('Boarded formations share their boat position and deck height',aboardError<1e-8,{maxError:aboardError});
check('No overlapping initial berths or hull crossings',minSeparation>8.1,{minCenterSeparation:minSeparation,hullWidth:7.8});
check('Sinking starts after troops have disembarked',submergeEarly===0);
function eye(p){return[p.target[0]+Math.sin(p.yaw)*Math.cos(p.elev)*p.distance,p.target[1]+Math.sin(p.elev)*p.distance,p.target[2]+Math.cos(p.yaw)*Math.cos(p.elev)*p.distance]}
let eyeJump=0,targetJump=0,lensJump=0;for(let i=1;i<J.shots.length;i++){const t=J.shots[i].at,a=J.directedPose(t-eps),b=J.directedPose(t+eps);eyeJump=Math.max(eyeJump,dist(eye(a),eye(b)));targetJump=Math.max(targetJump,dist(a.target,b.target));lensJump=Math.max(lensJump,Math.abs(a.fov-b.fov));}
check('All 29 shot boundaries have continuous camera positions',eyeJump<.03,{maxModelMeters:eyeJump});
check('All shot boundaries have continuous look target / lens',targetJump<.03&&lensJump<.01,{maxTargetChange:targetJump,maxFOVChange:lensJump});
check('30 shots cover the entire 0–300s timeline',J.shots.length===30&&J.shots[0].at===0&&J.shots.at(-1).end===300&&J.shots.slice(1).every((s,i)=>s.at===J.shots[i].end));
let deterministic=true;const snapshot=t=>{J.updateBattle(t);return JSON.stringify({pose:[...J.pose],anim:[...J.anim],boats:J.transports.map(tr=>J.boatAt(tr,t)),camera:J.directedPose(t)});};
for(const t of[0,34,47,73.75,82,96,107,158,219,249,300]){const a=snapshot(t);snapshot(300-t);snapshot(50);const b=snapshot(t);deterministic&&=a===b;}
check('Seeking backwards restores identical motion and director state',deterministic);
let finite=true;const begin=performance.now();for(let i=0;i<=18000;i++){const t=i/60;J.updateBattle(t);if(![...J.pose,...J.anim,...J.travel].every(Number.isFinite)){finite=false;break;}}check('Full 300s sampled at 60 Hz, no NaN/infinite state',finite,{samples:18001,wallSeconds:(performance.now()-begin)/1000});
let cJump=0;for(let i=0;i<20;i++)for(let t=1;t<140;t+=.1){const a=J.cartAt(i,t-eps),b=J.cartAt(i,t+eps);cJump=Math.max(cJump,Math.hypot(a.x-b.x,a.z-b.z));}check('Grain carts never wrap to the beginning of the route',cJump<.015,{maxModelMeters:cJump});
fs.writeFileSync(path.join(root,'tests/continuity_results.json'),JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
