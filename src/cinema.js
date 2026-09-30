'use strict';
/* V3 presentation director. DOM typography is separate from WebGL geometry.
   Real-time navigation and layout easing never alter the historical demonstration. */
(()=>{
 const $=id=>document.getElementById(id),{clamp,mix,smooth}=J;
 const text=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
 J.setText=text;
 J.Cinema=class {
  constructor(app,camera,actions){
   this.app=app;this.camera=camera;this.actions=actions;this.phase=-1;this.landmarks=[];this.lastInset=-1;
   this.transport=null;this.loop=false;this.lastFocus='';this.chapterAlpha=0;
   for(const [label,p]of[['巨鹿城',[0,24,-174]],['渡口 · 示意',[-208,5,277]],['甬道',[129,6,81]],['城北营垒',[-50,7,-390]]]){
    const el=document.createElement('span');el.className='landmark';el.textContent=label;$('landmarks').append(el);this.landmarks.push({el,p});
   }
   const names=['一','二','三','四','五','六','七','八'];
   for(let i=0;i<J.chapters.length;i++){
    const ch=J.chapters[i],el=document.createElement('button');el.className='chapter-choice';el.dataset.chapter=i;
    el.innerHTML='<span class="chapter-index">'+String(i+1).padStart(2,'0')+'</span><span><b></b><small></small></span><em></em>';
    el.querySelector('b').textContent=ch.title;el.querySelector('small').textContent=ch.sub;el.querySelector('em').textContent=Math.floor(ch.at/60)+':'+String(ch.at%60).padStart(2,'0')+' →';
    el.onclick=()=>{$('chaptersDialog').close();this.navigate(ch.at);};$('chapterChoices').append(el);
   }
   $('chapterMenu').onclick=()=>{$('chaptersDialog').showModal();};
   $('nextBeat').onclick=()=>this.next();$('cancelTravel').onclick=()=>this.cancelNavigation();
   $('loopBeat').onclick=()=>{this.loop=!this.loop;this.loopRange=this.loop?[J.chapters[J.phaseAt(app.time)].at,J.chapters[J.phaseAt(app.time)+1]?.at||300]:null;$('loopBeat').classList.toggle('active',this.loop);$('loopBeat').setAttribute('aria-pressed',String(this.loop));actions.toast(this.loop?'循环当前章节；再次点击关闭。':'已关闭章节循环。');};
   $('inspectLocal').onclick=()=>this.inspect();$('inset').onclick=()=>this.inspect();
   $('cinemaToggle').onchange=e=>app.cinema=e.target.checked;
   $('insetToggle').onchange=e=>{$('localMap').hidden=!e.target.checked;app.inset=e.target.checked;};
   window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;if(e.key===']'){e.preventDefault();this.next();}if(e.key==='Escape'&&this.transport)this.cancelNavigation();});
   this.names=names;app.cinema=true;app.inset=true;
  }
  navigate(target){
   target=clamp(Number(target)||0,0,300);if(!this.app.started)this.actions.start(false);
   if(Math.abs(target-this.app.time)<.05)return;
   const c=this.camera,now=performance.now();
   this.transport={startTime:this.app.time,target,start:now,duration:clamp(.7+Math.abs(target-this.app.time)*.025,.9,2.8),wasPlaying:this.app.playing,
    camera:{target:[...c.target],yaw:c.yaw,elev:c.elev,distance:c.distance,fov:c.fov},destination:J.directedPose(target),u:0};
   c.returnGuide(true);
   this.app.playing=false;this.actions.updatePlay();J.audio?.sync(false);
   this.loop=false;this.loopRange=null;$('loopBeat').classList.remove('active');$('loopBeat').setAttribute('aria-pressed','false');
   text($('travelTitle'),(target>this.app.time?'快速推进':'回看')+' · '+J.chapters[J.phaseAt(target)].title);$('travelNotice').hidden=false;
  }
  next(){const n=J.chapterMoments.find(t=>t>this.app.time+1);this.navigate(n===undefined?300:n);}
  cancelNavigation(){if(!this.transport)return;const was=this.transport.wasPlaying;this.transport=null;$('travelNotice').hidden=true;this.app.playing=was;this.actions.updatePlay();J.audio?.sync(was);this.camera.rejoin={start:performance.now(),target:[...this.camera.target],yaw:this.camera.yaw,elev:this.camera.elev,distance:this.camera.distance,fov:this.camera.fov};}
  beforeFrame(now){
   if(this.transport){const n=this.transport;n.u=clamp((now-n.start)/(n.duration*1000));this.app.time=mix(n.startTime,n.target,J.ease(n.u));
    $('travelProgress').style.transform='scaleX('+n.u+')';
    if(n.u>=1){this.app.time=n.target;const was=n.wasPlaying;this.transport=null;$('travelNotice').hidden=true;this.app.playing=was&&this.app.time<300;this.actions.updatePlay();J.audio?.sync(this.app.playing);if(this.app.time===300)document.body.classList.add('completed');else document.body.classList.remove('completed','continue-looking');}
   }else if(this.loop&&this.app.playing&&this.loopRange&&this.app.time>=this.loopRange[1]){const range=[...this.loopRange];this.navigate(range[0]);this.loop=true;this.loopRange=range;$('loopBeat').classList.add('active');$('loopBeat').setAttribute('aria-pressed','true');}
  }
  overrideCamera(){
   const nav=this.transport,c=this.camera;if(!nav||!this.app.guide)return;
   const u=J.ease(nav.u),a=nav.camera,b=nav.destination;
   c.target=a.target.map((v,i)=>mix(v,b.target[i],u));c.dest=[...c.target];c.yaw=J.angleMix(a.yaw,b.yaw,u);c.dyaw=c.yaw;
   c.distance=Math.exp(mix(Math.log(a.distance),Math.log(b.distance),u));c.ddistance=c.distance;c.elev=mix(a.elev,b.elev,u);c.delev=c.elev;c.fov=mix(a.fov,b.fov,u);c.dfov=c.fov;
   const ce=Math.cos(c.elev);c.eye=[c.target[0]+Math.sin(c.yaw)*ce*c.distance,c.target[1]+Math.sin(c.elev)*c.distance,c.target[2]+Math.cos(c.yaw)*ce*c.distance];c.eye[1]=Math.max(c.eye[1],J.ground(c.eye[0],c.eye[2])+5);
  }
  inspect(){
   if(!this.app.started)this.actions.start(false);
   const id=this.app.focusId||'xiang';this.camera.follow(id,'contact');this.camera.inspection=true;
   this.actions.toast('局部观察：拖动看细节；按 D 回到此刻的电影导览。');
  }
  frame(t,dt,R,project){
   const app=this.app,c=this.camera,idx=J.phaseAt(t),ch=J.chapters[idx],local=t-ch.at;
   if(idx!==this.phase){this.phase=idx;text($('chapterKicker'),'第'+this.names[idx]+'章 / '+String(idx+1).padStart(2,'0'));text($('chapterBig'),ch.title.replace(' · ',' · '));text($('chapterSub'),ch.sub);}
   let a=app.started&&app.guide&&app.cinema?smooth(.45,1.5,local)*(1-smooth(4.0,5.3,local)):0;
   if(this.transport)a=0;this.chapterAlpha=a;
   const title=$('chapterCurtain');title.style.opacity=String(a*.96);title.style.transform='translate3d(0,'+(mix(16,0,smooth(.45,2.1,local))).toFixed(2)+'px,0)';
   $('chapterRule').style.transform='scaleX('+smooth(.45,2.4,local)+')';
   const sh=J.shotAt(t),elapsed=t-sh.at,remaining=sh.end-t;
   let copyAlpha=app.started?Math.min(smooth(.2,1.25,elapsed),smooth(.12,.65,remaining)):0;
   if(!app.guide)copyAlpha=1;if(a>.1)copyAlpha*=1-a*.95;if(this.transport)copyAlpha*=1-Math.sin(this.transport.u*Math.PI);
   document.querySelector('.caption').style.opacity=String(copyAlpha);
   document.querySelector('.caption').style.transform='translate3d(0,'+(12*(1-smooth(0,1.5,elapsed))).toFixed(2)+'px,0)';
   const lmVisible=app.labels&&app.places&&app.started&&!app.clean;
   for(const l of this.landmarks){const p=project(l.p),visible=lmVisible&&p.w>1&&p.z<1&&p.x>28&&p.x<innerWidth-30&&p.y>148&&p.y<innerHeight-(app.footerHeight||109)-32;
    const d=Math.hypot(l.p[0]-c.target[0],l.p[2]-c.target[2]);const opacity=visible?(1-a*.8)*smooth(45,145,d)*.72:0;
    l.el.style.opacity=String(opacity);if(visible)l.el.style.transform=`translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,0)`;
   }
   // Screen-aligned currents are never used: lines are on the actual water plane.
   const f=J.forceState(app.focusId,t);text($('insetTitle'),f.f.force);text($('insetState'),f.action);
   text($('inspectLocal'),f.s.combat>.3?'放大交锋处 ↗':f.s.pack>.25?'靠近渡船 ↗':'靠近这支部队 ↗');
   const timestamp=performance.now();if(app.inset&&timestamp-this.lastInset>100&&!app.clean){this.lastInset=timestamp;this.drawInset(t,f);}
  }
  drawInset(t,fc){
   const cv=$('inset'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height,s=fc.s;
   const radius=s.pack>.2?91:s.combat>.2?108:126,k=W/(radius*2),cx=s.x,cz=s.z;
   const X=x=>(x-cx)*k+W/2,Z=z=>(z-cz)*k+H/2;
   ctx.fillStyle='#18292b';ctx.fillRect(0,0,W,H);
   ctx.strokeStyle='#c7d4be12';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
   ctx.beginPath();for(let x=cx-radius;x<=cx+radius;x+=5){const z=J.riverZ(x);if(x===cx-radius)ctx.moveTo(X(x),Z(z));else ctx.lineTo(X(x),Z(z));}ctx.strokeStyle='#6c96975c';ctx.lineWidth=64*k;ctx.stroke();
   ctx.fillStyle='#ccb87820';ctx.strokeStyle='#cabd89aa';ctx.lineWidth=2;ctx.fillRect(X(-69),Z(-229),138*k,118*k);ctx.strokeRect(X(-69),Z(-229),138*k,118*k);
   ctx.strokeStyle=t<127?'#c3aa64':'#b16b53';ctx.lineWidth=4;ctx.beginPath();J.supplyPath.forEach(([x,z],i)=>i?ctx.lineTo(X(x),Z(z)):ctx.moveTo(X(x),Z(z)));ctx.stroke();
   for(const g of J.groups){const a=g.state;if(Math.abs(a.x-cx)>radius+20||Math.abs(a.z-cz)>radius+20)continue;ctx.save();ctx.translate(X(a.x),Z(a.z));ctx.rotate(-a.yaw);ctx.fillStyle=['#adc7cb','#dc8269','#94bba3','#d9be81'][g.team];ctx.globalAlpha=1-a.loss*.5;ctx.fillRect(-6*k,-8*k,12*k,16*k);
    if(a.speed>.3&&this.app.paths){const flow=(a.travel*.06)%1;ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2;ctx.globalAlpha*=.7;ctx.beginPath();ctx.moveTo(-3*k,12*k);ctx.lineTo(0,(18+flow*4)*k);ctx.lineTo(3*k,12*k);ctx.stroke();}ctx.restore();}
   ctx.strokeStyle='#edcf8e';ctx.lineWidth=1;for(let sx of[-1,1])for(let sy of[-1,1]){const x=W/2+sx*18,y=H/2+sy*18;ctx.beginPath();ctx.moveTo(x-sx*6,y);ctx.lineTo(x,y);ctx.lineTo(x,y-sy*6);ctx.stroke();}
   ctx.fillStyle='#b4c4b5';ctx.font='15px Arial';ctx.fillText('N ↑',W-42,23);ctx.fillStyle='#a9b9a788';ctx.font='12px Arial';ctx.fillText('动态示意 · 非另一路摄像机',12,H-12);
  }
 };
})();
