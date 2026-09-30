'use strict';
(()=>{
const $=id=>document.getElementById(id),{mix,clamp,smooth}=J;
const app=J.app={time:0,playing:false,speed:1,started:false,paths:true,labels:true,places:true,guide:true,quality:'auto',dpr:1,clean:false,scrubbing:false,focusId:'zhao',selectedId:'xiang',autoReturn:false,lastInteraction:0,frameLog:[],errors:[],version:'3.0.0',build:'2026-09-29',roster:false};
let R,w,camera,audio,frameId,lastNow=0,lastScene=-1,lastHUD=0,lastMap=0,lastAuto=0,startNow=0,currentPhase=-1,currentShot=-1,toastTimeout,lastFocus='',cinema=null,lastRenderKey='';
const clock=t=>Math.floor(Math.max(0,t)/60)+':'+String(Math.floor(Math.max(0,t))%60).padStart(2,'0');
function toast(msg){$('toast').textContent=msg;document.body.classList.add('toast-on');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>document.body.classList.remove('toast-on'),2500);}
function interact(){app.lastInteraction=performance.now();}
window.addEventListener('error',e=>app.errors.push(e.message));window.addEventListener('unhandledrejection',e=>app.errors.push(String(e.reason)));
function fail(e){app.errors.push(String(e));console.error(e);$('loading').style.display='flex';$('loading').replaceChildren();let d=document.createElement('div');d.className='error-panel';let h=document.createElement('h2');h.textContent='战场未能启动';let p=document.createElement('p');p.textContent=String(e.message||e);let q=document.createElement('p');q.textContent='请用支持 WebGL2 的浏览器打开，并检查硬件加速。';let b=document.createElement('button');b.textContent='重新载入';b.onclick=()=>location.reload();d.append(h,p,q,b);$('loading').append(d);}
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
class Camera{
 constructor(){this.target=[0,6,-157];this.dest=[...this.target];this.yaw=-.68;this.dyaw=this.yaw;this.distance=610;this.ddistance=610;this.elev=.40;this.delev=.4;this.fov=48;this.dfov=48;this.mode='guided';this.angle='side';this.eye=[0,250,450];this.keys=new Set();this.orbitClock=0;this.rejoin=null;this.focusBlend=null;this.shiftX=0;this.update(1,0);}
 guided(t){const p=J.directedPose(t);app.focusId=p.shot.focus;let target=p.target,yaw=p.yaw,e=p.elev,d=p.distance,fov=p.fov;
  if(this.rejoin){const u=smooth(0,.85,(performance.now()-this.rejoin.start)/1000),b=this.rejoin;target=target.map((v,i)=>mix(b.target[i],v,u));yaw=b.yaw+angleDelta(b.yaw,yaw)*u;e=mix(b.elev,e,u);d=mix(b.distance,d,u);fov=mix(b.fov,fov,u);if(u>=1)this.rejoin=null;}
  this.target=target;this.dest=[...target];this.yaw=this.dyaw=yaw;this.distance=this.ddistance=d;this.elev=this.delev=e;this.fov=this.dfov=fov;
 }
 follow(id,angle='side'){
  if(cinema?.transport)cinema.cancelNavigation();
  if(!J.forceById[id])id='xiang';app.guide=false;app.focusId=app.selectedId=id;this.mode='follow';this.angle=angle;this.orbitClock=0;this.orbitStart=app.time;this.inspection=false;this.focusBlend={start:performance.now(),target:[...this.target]};this.rejoin=null;interact();updateModes();
 }
 returnGuide(instant=false){app.guide=true;this.mode='guided';this.inspection=false;this.focusBlend=null;this.rejoin=instant?null:{start:performance.now(),target:[...this.target],yaw:this.yaw,elev:this.elev,distance:this.distance,fov:this.fov};interact();updateModes();}
 manual(){if(cinema?.transport)cinema.cancelNavigation();if(app.guide||this.mode!=='free'){this.dest=[...this.target];this.dyaw=this.yaw;this.delev=this.elev;this.ddistance=this.distance;this.dfov=this.fov;app.guide=false;this.mode='free';this.rejoin=null;this.focusBlend=null;this.inspection=false;updateModes();}interact();}
 preset(name){this.manual();let t,d,y,e;
  if(name==='overview'){t=[0,4,10];d=1030;y=-.26;e=1.08;}
  else if(name==='river'){t=[-173,3,272];d=220;y=-.75;e=.40;}
  else if(name==='supply'){t=[127,4,79];d=290;y=-.69;e=.79;}
  else if(name==='city'){t=[0,11,-128];d=219;y=.68;e=.35;}
  else if(name==='follow'){this.follow(app.selectedId,'side');return;}
  else if(name==='battle'){let id=app.time<140?'bu':app.time<210?'xiang':'chen';this.follow(id,'contact');return;}
  else return;
  this.dest=t;this.ddistance=d;this.dyaw=y;this.delev=e;this.dfov=48;updateModes(name);
 }
 pan(dx,dy){let s=this.ddistance*.0012;this.dest[0]-=(Math.cos(this.dyaw)*dx+Math.sin(this.dyaw)*dy)*s;this.dest[2]-=(-Math.sin(this.dyaw)*dx+Math.cos(this.dyaw)*dy)*s;this.dest[0]=clamp(this.dest[0],-820,820);this.dest[2]=clamp(this.dest[2],-760,720);this.dest[1]=J.ground(this.dest[0],this.dest[2])+3;}
 update(dt,t){
  this.shiftX=innerWidth>1100&&!app.clean?.16:innerWidth>800&&!app.clean?.12:0;
  if(app.started&&app.guide){this.mode='guided';this.guided(t);}
  else{
   if(this.mode==='follow'){
    const f=J.forceById[app.selectedId],g=J.groups[f.lead],s=g.state;app.focusId=f.id;this.orbitClock=t-(this.orbitStart??t);
    let target=[s.x,s.y+2.8,s.z],heading=s.yaw;
    let configs={rear:[heading+Math.PI+.15,77,.21,52],side:[heading-Math.PI/2,82,.25,51],front:[heading+.14,80,.22,51],orbit:[-.6+this.orbitClock*.12,114,.38,50],overhead:[-.28,205,1.26,48],contact:[heading-Math.PI/2,67,.19,53]};
    const c=configs[this.angle]||configs.side;this.dyaw=c[0];this.ddistance=c[1];this.delev=c[2];this.dfov=c[3];
    if(this.angle==='contact')target=J.contactAnchor(f.id,t);if(this.inspection){this.ddistance=50;this.delev=.25;this.dfov=52;}
    if(this.focusBlend){let k=smooth(0,.75,(performance.now()-this.focusBlend.start)/1000);target=target.map((v,i)=>mix(this.focusBlend.target[i],v,k));if(k>=1)this.focusBlend=null;}
    // Translation follows the unit exactly after the blend. Only relative lens motion eases.
    this.target=target;this.dest=[...target];
   }
   let ix=(this.keys.has('l')?1:0)-(this.keys.has('j')?1:0),iy=(this.keys.has('k')?1:0)-(this.keys.has('i')?1:0);if(ix||iy){this.manual();this.pan(ix*dt*200,iy*dt*200);}
   let k=1-Math.exp(-dt*8);if(this.mode!=='follow')for(let i=0;i<3;i++)this.target[i]=mix(this.target[i],this.dest[i],k);
   this.yaw+=angleDelta(this.yaw,this.dyaw)*k;this.distance=mix(this.distance,this.ddistance,k);this.elev=mix(this.elev,this.delev,k);this.fov=mix(this.fov,this.dfov,k);
  }
  if(cinema?.transport)cinema.overrideCamera();const ce=Math.cos(this.elev);this.eye=[this.target[0]+Math.sin(this.yaw)*ce*this.distance,this.target[1]+Math.sin(this.elev)*this.distance,this.target[2]+Math.cos(this.yaw)*ce*this.distance];this.eye[1]=Math.max(this.eye[1],J.ground(this.eye[0],this.eye[2])+3.8);
 }
}
function updateModes(active=''){
 if(!camera)return;document.body.classList.toggle('manual-view',app.started&&!app.guide);$('guide').classList.toggle('active',app.guide);$('guide').setAttribute('aria-pressed',String(app.guide));document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===active));document.querySelectorAll('[data-angle]').forEach(b=>b.classList.toggle('active',camera.mode==='follow'&&b.dataset.angle===camera.angle));$('modeName').textContent=app.guide?'电影导览 · 连续运镜':camera.mode==='follow'?'部队跟拍 · '+J.forceById[app.selectedId].label:'自由观察 · 战局不受影响';
 if(camera.mode==='follow')$('forceSelect').value=app.selectedId;
}
function updatePlay(){$('play').textContent=app.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',app.playing?'暂停':'播放');$('topStatus').innerHTML='<span class="status-dot"></span>'+(app.playing?'战役进行中':'时间暂停');}
async function start(play){if(app.started){setPlay(play);return;}app.started=true;app.playing=!!play;app.guide=!!play;camera.mode=play?'guided':'free';document.body.classList.remove('prestart');$('intro').classList.add('hidden');if(play)camera.returnGuide(true);updateModes();updatePlay();if(play){try{if(!audio.enabled)await audio.toggle();$('sound').textContent=audio.enabled?'声音 开':'声音 关';$('sound').setAttribute('aria-pressed',String(audio.enabled));}catch(e){audio.enabled=false;toast('可继续观看；声音未能启用。');}}audio.sync(app.playing);}
function setPlay(v){if(cinema?.transport)cinema.cancelNavigation();if(!app.started){start(v);return;}app.playing=!!v;if(app.playing&&app.time>=300)setTime(0);audio?.sync(app.playing);updatePlay();}
function setTime(t){if(cinema?.transport)cinema.cancelNavigation();app.time=clamp(Number(t)||0,0,300);if(!R)return;labelReset=true;w?.lodMemory?.fill(-1);J.updateBattle(app.time);J.updateWorld(R,w,app.time);lastScene=app.time;camera.rejoin=null;camera.focusBlend=null;camera.update(.016,app.time);if(app.time<300)document.body.classList.remove('completed','continue-looking');else{app.playing=false;audio.sync(false);document.body.classList.add('completed');}currentPhase=-1;currentShot=-1;for(const l of labels){l.alpha=0;l.active=false;}updatePlay();updateHUD(true);}
function setSpeed(v){app.speed=clamp(Number(v)||1,.25,4);document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',+b.dataset.speed===app.speed));updateHUD();}
function measureFooter(){const h=document.querySelector('.bottom').getBoundingClientRect().height;if(h>0){app.footerHeight=h;document.documentElement.style.setProperty('--actual-bottom',h+'px');}}
function resize(){measureFooter();if(!R)return;const q=app.quality,dpr=q==='smooth'?.72:q==='balanced'?1:q==='sharp'?Math.min(1.65,devicePixelRatio||1):app.dpr;R.resize(innerWidth,innerHeight,dpr);const st=$('stems');st.width=innerWidth;st.height=innerHeight;labelReset=true;cachedSideVisible=innerWidth>800&&innerHeight>=590;}
function setQuality(q){if(!['auto','smooth','balanced','sharp'].includes(q))return;app.quality=q;if(q==='auto'){app.dpr=Math.min(1.2,devicePixelRatio||1);app.adaptivePoints=false;}$('quality').value=$('qualityDialog').value=q;w.lodKeys=['!','!','!'];w.lodMemory?.fill(-1);resize();lastAuto=performance.now();}
function download(name,blob){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);}
function diagnostics(){const arr=app.frameLog.map(f=>f.ms),sum=arr.reduce((a,b)=>a+b,0),sorted=[...arr].sort((a,b)=>a-b);let ext=R.gl.getExtension('WEBGL_debug_renderer_info');return{product:'巨鹿之战 · 战场纪实',version:app.version,build:app.build,exportedAt:new Date().toISOString(),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],drawingBuffer:[R.canvas.width,R.canvas.height],renderer:ext?R.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):R.gl.getParameter(R.gl.RENDERER),quality:app.quality,speed:app.speed,time:app.time,mode:camera.mode,shot:J.shots.indexOf(J.shotAt(app.time))+1,focus:app.focusId,farPointLOD:app.quality==='smooth'||app.quality==='auto'&&(R.software||!!app.adaptivePoints),sceneSoldiers:J.unitCount,visibleSoldiers:w.lodCounts.reduce((a,b)=>a+b,0),groups:J.groups.length,drawCalls:R.calls,triangles:R.triangles,pointSprites:R.points,frames:arr.length,renderedFrames:app.frameLog.filter(f=>f.rendered!==false).length,idleFrames:app.frameLog.filter(f=>f.rendered===false).length,meanFPS:sum?arr.length*1000/sum:0,p95FrameMs:sorted[Math.floor(sorted.length*.95)]||0,frameLog:app.frameLog,errors:app.errors,notice:'本机实测；暂停时未变化的场景不重复绘制，rendered=false表示仅刷新界面。性能比较应只取连续播放段。场景米制不是历史实测。'};}
function exportDiagnostics(){download('巨鹿之战_V3_运行诊断.json',new Blob([JSON.stringify(diagnostics(),null,2)],{type:'application/json'}));toast('已保存最近最多900帧运行记录。');}
function screenshot(){R.begin(camera,app.time);J.renderWorld(R,w,app.time,app);let cv=document.createElement('canvas');cv.width=R.canvas.width;cv.height=R.canvas.height;let c=cv.getContext('2d'),k=cv.width/innerWidth;c.drawImage(R.canvas,0,0);c.fillStyle='#10212abb';c.fillRect(0,cv.height-78*k,cv.width,78*k);c.font=`${24*k}px "Noto Serif CJK SC",SimSun,serif`;c.fillStyle='#eadbb4';c.fillText('巨鹿之战 · '+J.shotAt(app.time).name,26*k,cv.height-43*k);c.font=`${10*k}px Arial`;c.fillStyle='#c9d4bd';c.fillText('战场纪实 V3  /  叙事 '+clock(app.time)+'  /  地形与军阵示意重建',27*k,cv.height-19*k);cv.toBlob(b=>b&&download('巨鹿之战_V3_'+clock(app.time).replace(':','-')+'.png',b));}
// Stable identities and persistent screen offsets. The geographic anchor itself is
// projected exactly; only the offset of a card eases. No per-frame layout reassignment.
let labels=[],labelReset=true,labelLayoutAt=-1,labelFocus='',cachedSideVisible=true;
const stems=$('stems').getContext('2d');
function buildLabels(){
 for(let f of J.forces){const b=document.createElement('button');b.className='world-label';b.dataset.team=f.team;b.title=f.label+' / '+f.force+'。点击跟拍。'+f.note;
  b.innerHTML='<b></b><span class=unit></span><small><span></span><em></em></small>';b.querySelector('.unit').textContent=f.force;b.querySelector('b').textContent=f.label;
  b.onclick=e=>{e.stopPropagation();camera.follow(f.id,'side');toast('跟拍 '+f.label+'；切换机位只改变观察。');};$('labels').append(b);
  labels.push({f,el:b,actionEl:b.querySelector('small span'),speedEl:b.querySelector('small em'),placed:false,active:false,alpha:0,off:[0,-78],dest:[0,-78],pos:[0,0],lastChange:0});
 }
 for(let f of J.forces){let opt=document.createElement('option');opt.value=f.id;opt.textContent=f.label+' · 跟拍';$('forceSelect').append(opt);let b=document.createElement('button');b.dataset.force=f.id;b.innerHTML='<span><b></b><small></small></span><i>跟拍 ↗</i>';b.querySelector('b').textContent=f.label;b.querySelector('small').textContent=f.force;b.title=f.note;b.onclick=()=>camera.follow(f.id,'side');$('forceRoster').append(b);}
 $('forceSelect').value='xiang';
}
function project(p){const q=J.mat.project(p,R.vp);return{x:(q[0]*.5+.5)*innerWidth,y:(.5-q[1]*.5)*innerHeight,z:q[2],w:q[3]};}
function updateLabels(dt=.016){
 stems.clearRect(0,0,innerWidth,innerHeight);
 const W=innerWidth,H=innerHeight,mobile=W<=800,landscape=H<590,bottom=app.footerHeight||109;
 const right=(!mobile&&!landscape?W-(W>1650?319:286):W-12),top=landscape?120:mobile?146:155,foot=H-bottom-62;
 const width=mobile?150:174,height=61,maxCount=mobile||landscape||W<1100?2:camera.distance>380?4:3,now=performance.now();
 for(const l of labels){const s=J.groups[l.f.lead].state;l.base=project([s.x,s.y+8.7,s.z]);l.distance=Math.hypot(s.x-camera.target[0],s.z-camera.target[2]);l.inFrame=l.base.w>3&&l.base.z<1&&l.base.x>-45&&l.base.x<right+45&&l.base.y>top-20&&l.base.y<foot+height+50;}
 const focusChanged=labelFocus!==app.focusId;
 if(labelReset||focusChanged||now-labelLayoutAt>850){
  labelFocus=app.focusId;labelLayoutAt=now;
  const selected=labels.find(l=>l.f.id===app.focusId),eligible=labels.filter(l=>l.inFrame&&(l.base.w<1150)&&(camera.distance>360||l.distance<210));
  // Keep already occupied identities first, rather than sorting by fluctuating distance.
  const keep=eligible.filter(l=>l.active&&l!==selected).sort((a,b)=>a.lastChange-b.lastChange);
  const fresh=eligible.filter(l=>!l.active&&l!==selected).sort((a,b)=>a.distance-b.distance);
  const active=[selected?.inFrame?selected:null,...keep,...fresh].filter(Boolean).slice(0,maxCount);
  const occupied=[];
  for(const l of labels)if(!active.includes(l))l.active=false;
  for(const l of active){
   l.active=true;const p=l.base;let ox=l.dest[0],oy=l.dest[1];
   // Card retains its side unless a real collision occurs. Change the offset smoothly.
   const candidates=[[ox,oy],[0,-78],[115,-91],[-115,-91],[0,-150],[150,-150],[-150,-150]];
   let best=null,bestCost=Infinity;
   for(const [dx,dy]of candidates){const x=clamp(p.x+dx-width/2,12,Math.max(12,right-width)),y=clamp(p.y+dy,top,Math.max(top,foot-height));
    const overlap=occupied.reduce((sum,r)=>sum+Math.max(0,Math.min(x+width+8,r.x+r.w)-Math.max(x,r.x))*Math.max(0,Math.min(y+height+7,r.y+r.h)-Math.max(y,r.y)),0);
    const cost=overlap*8+Math.hypot(x+width/2-p.x-ox,y-p.y-oy)+Math.hypot(x+width/2-p.x,y+height/2-p.y)*.03;
    if(cost<bestCost){bestCost=cost;best={x,y,dx:x+width/2-p.x,dy:y-p.y};}
   }
   if(best){l.dest=[best.dx,best.dy];if(labelReset||l.alpha<.02)l.off=[...l.dest];occupied.push({x:best.x,y:best.y,w:width+8,h:height+7});}
   if(focusChanged)l.lastChange=now;
  }
  labelReset=false;
 }
 const k=1-Math.exp(-Math.min(dt,.15)*7.5),fade=1-Math.exp(-Math.min(dt,.15)*9);
 const reduce=1-(cinema?.chapterAlpha||0)*.86,navAlpha=cinema?.transport?1-Math.sin(cinema.transport.u*Math.PI)*.97:1;
 for(const l of labels){const p=l.base,isFocus=l.f.id===app.focusId;
  l.off[0]=mix(l.off[0],l.dest[0],k);l.off[1]=mix(l.off[1],l.dest[1],k);
  let x=p.x+l.off[0]-width/2,y=p.y+l.off[1];
  const edge=smooth(-20,15,p.x)*(1-smooth(right,right+30,p.x))*smooth(top-35,top+5,p.y)*(1-smooth(foot+35,foot+90,p.y));
  const goal=app.started&&app.labels&&l.active&&p.w>3&&p.z<1?edge*reduce*navAlpha:0;
  l.alpha=mix(l.alpha,goal,fade);l.placed=l.alpha>.12;
  l.el.style.opacity=l.alpha.toFixed(3);l.el.style.visibility=l.alpha>.005?'visible':'hidden';l.el.style.pointerEvents=l.alpha>.3?'auto':'none';
  if(p.w>3&&Number.isFinite(x)&&Number.isFinite(y)){l.pos=[x,y];l.el.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;}
  l.el.classList.toggle('selected',isFocus);
  if(l.alpha>.02&&p.w>3&&Number.isFinite(x)){
   const lx=x+width/2,ly=y+height;stems.globalAlpha=l.alpha;stems.strokeStyle=isFocus?'#e2c990a8':'#b7cab264';stems.lineWidth=.85;
   stems.beginPath();stems.moveTo(lx,ly);stems.lineTo(lx,ly+8);stems.lineTo(p.x,p.y);stems.stroke();stems.fillStyle=isFocus?'#e9c88c':'#d8dcc3';stems.beginPath();stems.arc(p.x,p.y,2,0,Math.PI*2);stems.fill();
  }
 }
 stems.globalAlpha=1;$('rose').style.transform=`rotate(${-camera.yaw*180/Math.PI}deg)`;
}
function updatePlace(){if(cinema)cinema.frame(app.time,app.delta||.016,R,project);$('placeTitle').style.opacity='0';}
function updateScale(){let right=J.v3.norm(J.v3.cross(J.v3.norm(J.v3.sub(camera.target,camera.eye)),[0,1,0])),base=[camera.target[0],J.ground(camera.target[0],camera.target[2]),camera.target[2]],p=project(base),q=project([base[0]+right[0]*10,base[1],base[2]+right[2]*10]);let px=Math.hypot(p.x-q.x,p.y-q.y)/10;if(!Number.isFinite(px)||px<.01)return;let values=[1,2,5,10,20,50,100,200,500],v=values.reduce((best,x)=>Math.abs(x*px-93)<Math.abs(best*px-93)?x:best,50),width=clamp(v*px,16,230);$('scaleRule').style.width=width.toFixed(1)+'px';$('scaleText').textContent=v+' 场景米';$('scaleHud').title='只量取当前焦点地面平面上的模型距离。地形与城池非历史实测。';}
function updateMap(){let cv=$('map'),c=cv.getContext('2d'),W=cv.width,H=cv.height,X=x=>(x+520)/1040*W,Z=z=>(z+500)/1040*H;c.clearRect(0,0,W,H);c.fillStyle='#253738';c.fillRect(0,0,W,H);c.strokeStyle='#71877b24';c.lineWidth=1;for(let i=1;i<8;i++){c.beginPath();c.moveTo(i*W/8,0);c.lineTo(i*W/8,H);c.stroke();c.beginPath();c.moveTo(0,i*H/8);c.lineTo(W,i*H/8);c.stroke();}
 c.strokeStyle='#6e9292';c.lineWidth=12;c.beginPath();for(let x=-550;x<=550;x+=20)x===-550?c.moveTo(X(x),Z(J.riverZ(x))):c.lineTo(X(x),Z(J.riverZ(x)));c.stroke();c.fillStyle='#d0bf8790';c.fillRect(X(-69),Z(-229),138/1040*W,118/1040*H);c.fillStyle='#243735';c.fillRect(X(-61),Z(-221),122/1040*W,101/1040*H);c.strokeStyle=app.time<127?'#d1b772':'#c17159';c.lineWidth=2;c.beginPath();J.supplyPath.forEach(([x,z],i)=>i?c.lineTo(X(x),Z(z)):c.moveTo(X(x),Z(z)));c.stroke();
 for(let g of J.groups){let s=g.state;c.save();c.translate(X(s.x),Z(s.z));c.rotate(-s.yaw);c.globalAlpha=1-s.loss*.5;c.fillStyle=['#c9d7d0','#dc8166','#80bba0','#dcc182'][g.team];c.fillRect(-2,-2.4,4,4.8);c.restore();}
 let tx=X(camera.target[0]),tz=Z(camera.target[2]),ex=clamp(X(camera.eye[0]),0,W),ez=clamp(Z(camera.eye[2]),0,H);c.strokeStyle='#e6d19699';c.lineWidth=1;c.beginPath();c.moveTo(ex,ez);c.lineTo(tx,tz);c.stroke();c.fillStyle='#dcc58b22';c.beginPath();c.moveTo(ex,ez);c.lineTo(tx-22,tz-10);c.lineTo(tx+22,tz+10);c.closePath();c.fill();c.strokeStyle='#f0d695';c.beginPath();c.arc(tx,tz,6,0,PI2);c.stroke();c.fillStyle='#e8d6a9';c.font='10px Arial';c.fillText('N ↑',W-30,14);c.fillStyle='#9caf98';c.font='9px Arial';c.fillText('示意',W-29,H-8);
}
const PI2=Math.PI*2;
function updateHUD(force=false){if(!camera)return;const i=J.phaseAt(app.time),ch=J.chapters[i],sh=J.shotAt(app.time),si=J.shots.indexOf(sh),fc=J.forceState(app.focusId,app.time);
 if(currentPhase!==i||force){currentPhase=i;$('chapterNo').textContent=String(i+1).padStart(2,'0')+' / 08';$('chapterTitle').textContent=ch.title;$('chapterText').textContent=ch.text;$('supplyStatus').textContent=ch.supply;$('supplyStatus').classList.toggle('cut',i>=3);$('sourceHint').textContent='史料：'+ch.source+' · 具体军阵与路线示意';document.querySelectorAll('.chapter-marker').forEach((b,j)=>{b.classList.toggle('current',j===i);b.setAttribute('aria-current',j===i?'step':'false');});}
 if(si!==currentShot||force){currentShot=si;$('shotNo').textContent='镜头 '+String(si+1).padStart(2,'0')+' / '+J.shots.length;$('captionTitle').textContent=sh.name;$('captionText').textContent=sh.line;$('captionKicker').textContent=String(i+1).padStart(2,'0')+' / '+ch.key+'  ·  '+String(si+1).padStart(2,'0');$('eventText').textContent=sh.name;}
 $('shotType').textContent=app.guide?'连续运镜':camera.mode==='follow'?'部队跟拍':'自由机位';$('cameraDescription').textContent=app.guide?'电影导览':camera.mode==='follow'?J.forceById[app.selectedId].label+' · '+{rear:'后随',side:'侧拍',front:'迎面',orbit:'环绕',overhead:'俯瞰',contact:'交锋线'}[camera.angle]:'自由观察';
 $('timeNow').textContent=clock(app.time);$('trackFill').style.width=(app.time/3)+'%';$('trackThumb').style.left=(app.time/3)+'%';if(!app.scrubbing)$('seek').value=app.time;$('seek').setAttribute('aria-valuetext',clock(app.time)+'，'+ch.title);
 $('focusName').textContent=fc.f.label;$('focusUnit').textContent=fc.f.force;$('focusAction').textContent=fc.action;$('focusName').title=fc.f.note;$('marchSpeed').textContent=fc.speed.toFixed(1);$('speedNeedle').style.transform=`rotate(${clamp(fc.speed/24)*180}deg)`;$('actualSpeed').textContent=(app.playing?'播放 '+app.speed+'×':'已暂停')+' · '+(app.playing?fc.speed*app.speed:0).toFixed(1)+' 米/秒';
 if(lastFocus!==app.focusId){lastFocus=app.focusId;$('followFocus').textContent='跟拍 '+fc.f.label+' ↗';document.querySelectorAll('[data-force]').forEach(b=>b.classList.toggle('active',b.dataset.force===app.focusId));}
 for(let l of labels){const fs=J.forceState(l.f.id,app.time);J.setText(l.actionEl,fs.action);J.setText(l.speedEl,fs.speed>.15?fs.speed.toFixed(1)+' 场景m/s':fs.f.team===3?(app.time<245?'城内':'解围'):fs.status.split(' / ')[0]);}
 let recent=app.frameLog.slice(-100),mean=recent.reduce((v,x)=>v+x.ms,0)/(recent.length||1);$('perf').textContent=(mean?(1000/mean).toFixed(1):'—')+' FPS  ·  '+R.calls+' draw\n'+(R.triangles/1000).toFixed(0)+'k tris / '+w.lodCounts.reduce((a,b)=>a+b,0)+' 可见兵卒\n'+R.canvas.width+'×'+R.canvas.height+' · '+app.quality;
 updateModes();updateScale();
}
function setPaths(v){app.paths=!!v;$('paths').classList.toggle('active',app.paths);$('paths').setAttribute('aria-pressed',String(app.paths));$('pathToggle').checked=app.paths;}
function fullscreen(){try{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen().catch(()=>toast('可使用浏览器全屏功能。'));}catch(e){toast('当前浏览器未能全屏。');}}
function toggleUI(){app.clean=!app.clean;document.body.classList.toggle('clean',app.clean);}
function installControls(){
 $('start').onclick=()=>start(true);$('explore').onclick=()=>start(false);$('play').onclick=()=>setPlay(!app.playing);$('restart').onclick=()=>{if(!app.started)start(true);setTime(0);camera.returnGuide(true);setPlay(true);};
 $('guide').onclick=()=>{if(!app.started)start(true);else{camera.returnGuide();toast('回到当前时刻的电影导览。');}};$('returnDirector').onclick=()=>camera.returnGuide();
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(!app.started)start(false);camera.preset(b.dataset.view);});
 document.querySelectorAll('[data-angle]').forEach(b=>b.onclick=()=>{if(!app.started)start(false);camera.follow(camera.mode==='follow'?app.selectedId:app.focusId,b.dataset.angle);});
 $('forceSelect').onchange=e=>{if(!app.started)start(false);camera.follow(e.target.value,'side');};$('followFocus').onclick=()=>camera.follow(app.focusId,'side');
 document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>setSpeed(+b.dataset.speed));
 J.chapters.forEach((ch,i)=>{let b=document.createElement('button');b.className='chapter-marker';b.style.left=ch.at/3+'%';b.textContent=ch.key;b.title=clock(ch.at)+' · '+ch.title;b.setAttribute('aria-label','跳转到'+ch.title);b.onclick=()=>{if(!app.started)start(false);cinema.navigate(ch.at);};$('timeline').append(b);});
 let wasPlayingSeek=false;$('seek').onpointerdown=()=>{wasPlayingSeek=app.playing;app.scrubbing=true;app.playing=false;audio.sync(false);updatePlay();};$('seek').oninput=e=>{if(!app.started)start(false);setTime(e.target.value);};const endSeek=()=>{if(app.scrubbing){app.scrubbing=false;app.playing=wasPlayingSeek&&app.time<300;audio.sync(app.playing);updatePlay();}};window.addEventListener('pointerup',endSeek);window.addEventListener('pointercancel',endSeek);
 $('sound').onclick=async()=>{try{const v=await audio.toggle();$('sound').textContent=v?'声音 开':'声音 关';$('sound').setAttribute('aria-pressed',String(v));}catch(e){audio.enabled=false;toast('声音未能启用。');}};
 $('paths').onclick=()=>setPaths(!app.paths);$('pathToggle').onchange=e=>setPaths(e.target.checked);$('labelToggle').onchange=e=>app.labels=e.target.checked;$('placeToggle').onchange=e=>app.places=e.target.checked;$('autoReturn').onchange=e=>{app.autoReturn=e.target.checked;interact();};
 $('quality').onchange=e=>setQuality(e.target.value);$('qualityDialog').onchange=e=>setQuality(e.target.value);$('volume').oninput=e=>{audio.volume=e.target.value/100;audio.sync(app.playing);$('volumeValue').textContent=e.target.value+'%';};$('musicToggle').onchange=e=>audio.music=e.target.checked;$('perfToggle').onchange=e=>document.body.classList.toggle('show-perf',e.target.checked);$('exportDiag').onclick=exportDiagnostics;$('screenshot').onclick=screenshot;
 for(let [b,d]of[['sources','sourcesDialog'],['help','helpDialog'],['settings','settingsDialog']])$(b).onclick=()=>$(d).showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){let r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
 $('sideToggle').onclick=()=>{$('side').classList.toggle('open');$('sideToggle').classList.toggle('active',$('side').classList.contains('open'));};
 function tab(roster){app.roster=roster;$('forceRoster').hidden=!roster;$('situationBody').hidden=roster;$('tabForces').classList.toggle('active',roster);$('tabSituation').classList.toggle('active',!roster);}$('tabSituation').onclick=()=>tab(false);$('tabForces').onclick=()=>tab(true);
 $('hideUI').onclick=toggleUI;$('restoreUI').onclick=toggleUI;$('fullscreen').onclick=fullscreen;
 $('replayEnd').onclick=()=>{setTime(0);camera.returnGuide(true);setPlay(true);};$('stayEnd').onclick=()=>{document.body.classList.add('continue-looking');camera.manual();};
 $('map').onclick=e=>{let r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*1040-520,z=(e.clientY-r.top)/r.height*1040-500;camera.manual();camera.dest=[x,J.ground(x,z)+3,z];camera.ddistance=Math.min(camera.ddistance,350);camera.delev=.9;toast('地图定位；没有改变战局。');};
 window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;let k=e.key.toLowerCase();if(k===' '){e.preventDefault();setPlay(!app.playing);}else if(k==='arrowleft'||k==='arrowright'){e.preventDefault();setTime(app.time+(k==='arrowleft'?-1:1)*(e.shiftKey?15:5));}else if(k==='d'){if(app.started)camera.returnGuide();}else if(k==='0')camera.preset('overview');else if(k==='h')toggleUI();else if(k==='f')fullscreen();else if(k==='m')$('sound').click();else if(k==='+'||k==='=')setSpeed(app.speed*2);else if(k==='-')setSpeed(app.speed/2);else if(['i','j','k','l'].includes(k))camera.keys.add(k);});
 window.addEventListener('keyup',e=>camera.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>camera.keys.clear());
 const pointers=new Map();let gesture=null,down=null,moved=false;const canvas=$('stage');canvas.oncontextmenu=e=>e.preventDefault();
 canvas.addEventListener('pointerdown',e=>{if(!app.started)start(false);canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:e.button});down={x:e.clientX,y:e.clientY};moved=false;gesture=null;interact();});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,button:prev.button});let arr=[...pointers.values()];if(arr.length>=2){moved=true;camera.manual();let a=arr[0],b=arr[1],g={x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};if(gesture){camera.ddistance=clamp(camera.ddistance*gesture.d/Math.max(2,g.d),20,1550);camera.pan(g.x-gesture.x,g.y-gesture.y);}gesture=g;}
 else{let dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(!moved&&down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)moved=true;if(!moved)return;camera.manual();canvas.classList.add('dragging');if(prev.button===2||e.shiftKey)camera.pan(dx,dy);else{camera.dyaw-=dx*.0045;camera.delev=clamp(camera.delev+dy*.0035,.09,1.53);}}
 });
 const endPointer=e=>{const was=pointers.has(e.pointerId);pointers.delete(e.pointerId);gesture=null;if(!pointers.size){canvas.classList.remove('dragging');if(was&&!moved&&e.type==='pointerup'&&e.button===0){let best=null,d=Infinity;for(let f of J.forces){let s=J.groups[f.lead].state,p=project([s.x,s.y+3,s.z]),dist=Math.hypot(p.x-e.clientX,p.y-e.clientY);if(p.w>0&&dist<Math.max(18,Math.min(65,1700/p.w))&&dist<d){best=f;d=dist;}}if(best)camera.follow(best.id,'side');}down=null;}};
 canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
 canvas.addEventListener('wheel',e=>{e.preventDefault();camera.manual();camera.ddistance=clamp(camera.ddistance*Math.exp(e.deltaY*.001),20,1550);},{passive:false});
 canvas.addEventListener('dblclick',e=>{const fw=J.v3.norm(J.v3.sub(camera.target,camera.eye)),rt=J.v3.norm(J.v3.cross(fw,[0,1,0])),up=J.v3.cross(rt,fw),f=Math.tan(camera.fov*Math.PI/360),nx=(e.clientX/innerWidth*2-1+camera.shiftX)*innerWidth/innerHeight*f,ny=(1-e.clientY/innerHeight*2)*f,ray=J.v3.norm(fw.map((v,i)=>v+rt[i]*nx+up[i]*ny));if(ray[1]>-.035)return;const d=(3-camera.eye[1])/ray[1],x=clamp(camera.eye[0]+ray[0]*d,-820,820),z=clamp(camera.eye[2]+ray[2]*d,-750,720);camera.manual();camera.dest=[x,J.ground(x,z)+3,z];});
 const footerObserver=new ResizeObserver(measureFooter);footerObserver.observe(document.querySelector('.bottom'));window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){if(cinema?.transport)cinema.cancelNavigation();app.playing=false;audio.sync(false);camera.keys.clear();updatePlay();}lastNow=performance.now();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frameId);app.playing=false;audio.sync(false);toast('图形上下文中断，等待恢复。');});canvas.addEventListener('webglcontextrestored',()=>location.reload());
}
function frame(now){const elapsed=lastNow?(now-lastNow)/1000:.016,dt=Math.min(.25,elapsed),ms=lastNow?now-lastNow:16.67;lastNow=now;app.delta=dt;cinema?.beforeFrame(now);
 if(app.playing&&!app.scrubbing&&!cinema?.transport){app.time=Math.min(300,app.time+Math.min(1,elapsed)*app.speed);if(app.time>=300){app.playing=false;document.body.classList.add('completed');audio.sync(false);updatePlay();}}
 if(lastScene!==app.time){J.updateBattle(app.time);J.updateWorld(R,w,app.time);lastScene=app.time;}
 if(app.autoReturn&&!app.guide&&app.playing&&now-app.lastInteraction>20000&&!document.querySelector('dialog[open]'))camera.returnGuide();
 camera.update(dt,app.time);
 // A frozen scene is not redrawn merely because the UI has another animation frame.
 // Time, camera, canvas size and visual switches all invalidate this cache.
 const renderKey=[app.time,...camera.eye.map(v=>v.toFixed(4)),...camera.target.map(v=>v.toFixed(4)),camera.fov.toFixed(4),camera.shiftX,R.canvas.width,R.canvas.height,app.quality,app.paths].join('|');
 const rendered=renderKey!==lastRenderKey;
 if(rendered){R.begin(camera,app.time);J.renderWorld(R,w,app.time,app);lastRenderKey=renderKey;}
 updatePlace();updateLabels(dt);audio.update(app.time,app.playing,camera);
 if(ms>0&&Number.isFinite(ms)){app.frameLog.push({ms:+ms.toFixed(3),rendered,playing:app.playing,time:+app.time.toFixed(3),shot:J.shots.indexOf(J.shotAt(app.time))+1,mode:camera.mode,dpr:R.pixelRatio,triangles:R.triangles});if(app.frameLog.length>900)app.frameLog.shift();}
 if(now-lastHUD>120){lastHUD=now;updateHUD();}if(now-lastMap>240){lastMap=now;if(cachedSideVisible||$('side').classList.contains('open'))updateMap();}
 // Resize without rebuilding geometry, motion or camera; hysteresis prevents oscillation.
 if(app.quality==='auto'&&now-startNow>6500&&now-lastAuto>8000&&app.frameLog.length>60){const l=app.frameLog.slice(-60),mean=l.reduce((a,b)=>a+b.ms,0)/l.length;if(mean>30&&app.dpr>.70){if(app.dpr<.97)app.adaptivePoints=true;app.dpr=Math.max(.70,app.dpr-.12);resize();lastAuto=now;}}
 frameId=requestAnimationFrame(frame);
}
async function init(){try{
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));R=J.renderer=new J.Renderer($('stage'));$('loadSub').textContent='构建军阵、地形与三十个镜头';await new Promise(r=>setTimeout(r,10));w=J.buildWorld(R);camera=J.camera=new Camera();audio=J.audio=new J.BattleAudio();app.dpr=Math.min(devicePixelRatio||1,1.2);resize();J.updateBattle(0);J.updateWorld(R,w,0);lastScene=0;buildLabels();cinema=J.cinema=new J.Cinema(app,camera,{toast,start,updatePlay});installControls();setPaths(true);updateModes();updatePlay();setSpeed(1);updateHUD(true);$('loading').style.display='none';startNow=performance.now();frameId=requestAnimationFrame(frame);
 window.__JULU={navigate:t=>cinema.navigate(t),cancelNavigation:()=>cinema.cancelNavigation(),inspect:()=>cinema.inspect(),labels:()=>labels.map(l=>({id:l.f.id,alpha:l.alpha,active:l.active,offset:[...l.off],pos:[...l.pos],anchor:l.base})),ready:true,version:app.version,seek:setTime,play:()=>setPlay(true),pause:()=>setPlay(false),start,guide:(instant=false)=>camera.returnGuide(instant),follow:(id,angle='side')=>camera.follow(id,angle),setSpeed,setQuality,view:name=>camera.preset(name),diagnostics,exportDiagnostics,renderOnce:()=>{camera.update(.016,app.time);R.begin(camera,app.time);J.renderWorld(R,w,app.time,app);updateHUD(true);updatePlace();updateLabels();},state:()=>({time:app.time,transporting:!!cinema.transport,loop:cinema.loop,playing:app.playing,started:app.started,speed:app.speed,phase:J.phaseAt(app.time),chapter:J.chapters[J.phaseAt(app.time)].title,mode:camera.mode,guide:app.guide,angle:camera.angle,focus:app.focusId,shot:J.shots.indexOf(J.shotAt(app.time)),shotCount:J.shots.length,eye:[...camera.eye],target:[...camera.target],distance:camera.distance,fov:camera.fov,dpr:R.pixelRatio,farPointLOD:app.quality==='smooth'||app.quality==='auto'&&(R.software||!!app.adaptivePoints),sceneSoldiers:J.unitCount,visibleSoldiers:w.lodCounts.reduce((a,b)=>a+b,0),groups:J.groups.length,drawCalls:R.calls,triangles:R.triangles,pointSprites:R.points,lodCounts:[...w.lodCounts],frameCount:app.frameLog.length,transportCount:J.transports.length,boats:J.transports.map(tr=>J.boatAt(tr,app.time)),visibleLabels:labels.filter(l=>l.placed).map(l=>l.f.id),marchSpeed:J.forceState(app.focusId,app.time).speed,paths:app.paths,errors:[...app.errors],glError:R.gl.getError(),battle:J.groups.map(g=>({id:g.id,team:g.team,x:+g.state.x.toFixed(5),z:+g.state.z.toFixed(5),yaw:+g.state.yaw.toFixed(5),speed:+g.state.speed.toFixed(5),loss:+g.state.loss.toFixed(5),combat:+g.state.combat.toFixed(5),pack:+g.state.pack.toFixed(5)}))})};
 }catch(e){fail(e);}}
init();
})();
