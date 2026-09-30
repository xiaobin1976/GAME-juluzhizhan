/* Julu / direct WebGL2 micro-battle renderer. Original implementation. */
'use strict';
const J = window.J = {};
J.clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
J.mix=(a,b,t)=>a+(b-a)*t;
J.smooth=(a,b,x)=>{x=J.clamp((x-a)/(b-a));return x*x*(3-2*x)};
J.rng=(seed=207)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
J.v3={sub:(a,b)=>a.map((v,i)=>v-b[i]),add:(a,b)=>a.map((v,i)=>v+b[i]),dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let n=Math.hypot(...a)||1;return a.map(v=>v/n)}};
J.mat={
 perspective(fov,aspect,near,far){let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])},
 lookAt(eye,target){const z=J.v3.norm(J.v3.sub(eye,target)),x=J.v3.norm(J.v3.cross([0,1,0],z)),y=J.v3.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-J.v3.dot(x,eye),-J.v3.dot(y,eye),-J.v3.dot(z,eye),1])},
 mul(a,b){let out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=a[r]*b[c*4]+a[r+4]*b[c*4+1]+a[r+8]*b[c*4+2]+a[r+12]*b[c*4+3];return out},
 project(p,m){let x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];return [(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w,w]}
};
J.color=(hex)=>{if(Array.isArray(hex))return hex;let h=parseInt(hex.replace('#',''),16);return[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255]};
class Geometry{
 constructor(){this.p=[];this.n=[];this.c=[];this.part=[];this.uv=[]}
 tri(a,b,c,color,part=0,uv=null,normals=null){let n=normals?null:J.v3.norm(J.v3.cross(J.v3.sub(b,a),J.v3.sub(c,a)));color=J.color(color);[a,b,c].forEach((v,i)=>{this.p.push(...v);this.n.push(...(normals?normals[i]:n));this.c.push(...color);this.part.push(part);this.uv.push(...(uv?uv[i]:[0,0]))});return this}
 quad(a,b,c,d,color,part=0,uv=null){this.tri(a,b,c,color,part,uv?[uv[0],uv[1],uv[2]]:null);this.tri(a,c,d,color,part,uv?[uv[0],uv[2],uv[3]]:null);return this}
 box(x,y,z,w,h,d,color,yaw=0,part=0){let pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>{let xx=p[0]*w/2,zz=p[2]*d/2;return[x+xx*Math.cos(yaw)+zz*Math.sin(yaw),y+p[1]*h/2,z-xx*Math.sin(yaw)+zz*Math.cos(yaw)]});[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]].forEach(f=>this.quad(...f.map(i=>pts[i]),color,part));return this}
 cylinder(x,y,z,r1,r2,h,color,sides=8,part=0){for(let i=0;i<sides;i++){let a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;const v=(an,r,yy)=>[x+Math.cos(an)*r,yy,z+Math.sin(an)*r];let p=v(a,r1,y-h/2),q=v(b,r1,y-h/2),r=v(b,r2,y+h/2),s=v(a,r2,y+h/2);this.quad(p,s,r,q,color,part);if(r1)this.tri([x,y-h/2,z],p,q,color,part);if(r2)this.tri([x,y+h/2,z],r,s,color,part)}return this}
 roof(x,y,z,w,h,d,color,yaw=0,part=0){let p=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[0,h,-d/2],[0,h,d/2]].map(p=>[x+p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),y+p[1],z-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw)]);this.quad(p[0],p[3],p[5],p[4],color,part);this.quad(p[4],p[5],p[2],p[1],color,part);this.tri(p[0],p[4],p[1],color,part);this.tri(p[3],p[2],p[5],color,part);return this}
 ellipse(x,y,z,rx,rz,color,n=12){for(let i=0;i<n;i++){let a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;this.tri([x,y,z],[x+rx*Math.cos(b),y,z+rz*Math.sin(b)],[x+rx*Math.cos(a),y,z+rz*Math.sin(a)],color)}return this}
}
J.Geometry=Geometry;
const COMMON=`
precision highp float;
uniform mat4 uVP;
uniform vec3 uEye;
uniform float uTime;
uniform vec3 uSun;
`;
const OUTPUT=`
vec3 finishColor(vec3 rgb, vec3 pos){
 float d=length(pos-uEye);float fog=1.-exp(-max(0.,d-220.)*.00038);
 fog*=.77+.23*exp(-max(pos.y,0.)*.012);
 vec3 haze=vec3(.76,.76,.70);rgb=mix(rgb,haze,clamp(fog,0.,.9));
 rgb=rgb/(rgb*.18+.92);return clamp(rgb,0.,1.);
}
vec3 lighting(vec3 n,vec3 base,vec3 p){
 n=normalize(n);float lam=max(dot(n,uSun),0.);float sky=n.y*.5+.5;
 vec3 amb=mix(vec3(.38,.40,.40),vec3(.66,.68,.66),sky);
 vec3 col=base*(amb+lam*vec3(.59,.51,.39));
 return finishColor(col,p);
}
`;
const STATIC_VS=`#version 300 es
${COMMON}
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNorm;layout(location=2)in vec3 aColor;layout(location=3)in float aPart;layout(location=6)in vec2 aUV;
out vec3 vPos;out vec3 vNorm;out vec3 vColor;out vec2 vUV;
${OUTPUT}
void main(){vPos=aPos;vNorm=aNorm;vColor=lighting(aNorm,aColor,aPos);vUV=aUV;gl_Position=uVP*vec4(aPos,1.);}`;
const STATIC_FS=`#version 300 es
${COMMON}
in vec3 vPos;in vec3 vNorm;in vec3 vColor;in vec2 vUV;uniform int uKind;uniform sampler2D uGround;out vec4 frag;
${OUTPUT}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){vec3 base=vColor;if(uKind==1){float large=texture(uGround,vPos.xz*.002).r;float grain=texture(uGround,vPos.xz*.026).r;base*=.88+.17*large+.10*grain;}else if(uKind==2){base*=.91+.11*texture(uGround,(vPos.xz+vPos.y*.4)*.025).r;}frag=vec4(base,1.);}`;
const GROUPS=`uniform vec4 uPose[64];uniform vec4 uAnim[64];uniform vec4 uFall[64];uniform vec4 uTravel[64];
vec3 ry(vec3 p,float a){float s=sin(a),c=cos(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 rx(vec3 p,float a){float s=sin(a),c=cos(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
`;
const SOLDIER_VS=`#version 300 es
${COMMON}${GROUPS}
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNorm;layout(location=2)in vec3 aColor;layout(location=3)in float aPart;
layout(location=4)in vec4 aTroop;layout(location=5)in vec4 aData;
out vec3 vPos;out vec3 vNorm;out vec3 vColor;
uniform int uShadow;
${OUTPUT}
void main(){
 int g=int(aTroop.w+.5);vec4 pose=uPose[g],an=uAnim[g];float seed=aTroop.z;float dead=smoothstep(seed,seed+.006,an.z)*step(.001,an.z);
 vec3 p=aPos,n=aNorm;float walk=an.x*(1.-dead);float fight=an.y*(1.-dead);float rhythm=sin(uTravel[g].x*4.7+seed*61.);
 if(aPart>0.5&&aPart<2.5){float signP=aPart<1.5?1.:-1.;float angle=rhythm*.42*walk*signP;vec3 pivot=vec3(aPart<1.5?-.16:.16,.76,0.);p=rx(p-pivot,angle)+pivot;n=rx(n,angle);}
 if(aPart>2.5&&aPart<4.5){float side=aPart<3.5?-1.:1.;float attack=fight*(.45+.6*max(0.,sin(uTime*6.+seed*82.)));float angle=side*rhythm*.3*walk+attack;vec3 pivot=vec3(side*.36,1.36,0.);p=rx(p-pivot,angle)+pivot;n=rx(n,angle);}
 p.y+=abs(rhythm)*.065*walk;p.z+=sin(uTime*5.+seed*43.)*.22*fight;
 if(dead>.001){vec3 fp=rx(p,1.48)+vec3(sin(seed*111.)*.5,.16,0.);p=mix(p,fp,dead);n=mix(n,rx(n,1.48),dead);pose=mix(pose,vec4(aData.y,uFall[g].y,aData.z,aData.w),dead);}
 float packing=mix(1.,.32,an.w);vec3 local=vec3(aTroop.x*packing,0.,aTroop.y*mix(1.,.48,an.w));
 p=ry(p+local,pose.w)+pose.xyz;n=ry(n,pose.w);
 vPos=p;vNorm=n;vColor=aColor;
 if(aData.x<.5)vColor*=vec3(.64,.7,.70);else if(aData.x<1.5)vColor*=vec3(1.14,.49,.40);else if(aData.x<2.5)vColor*=vec3(.62,.86,.82);else vColor*=vec3(1.15,.92,.53);
 if(aPart<.5)vColor=mix(aColor,vColor,.62);vColor*=mix(.92,1.07,seed);vColor=mix(vColor,vec3(.28,.275,.24),dead*.6);
 vColor=lighting(vNorm,vColor,p);gl_Position=uVP*vec4(p,1.);
}`;
const SOLDIER_FS=`#version 300 es
${COMMON}
in vec3 vPos;in vec3 vNorm;in vec3 vColor;out vec4 frag;${OUTPUT}
void main(){frag=vec4(vColor,1.);}`;

const FAR_VS=`#version 300 es
${COMMON}${GROUPS}
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNorm;layout(location=2)in vec3 aColor;layout(location=3)in float aPart;layout(location=4)in vec4 aTroop;layout(location=5)in vec4 aData;
out vec3 vPos;out vec3 vNorm;out vec3 vColor;
${OUTPUT}
void main(){int g=int(aTroop.w+.5);vec4 pose=uPose[g],an=uAnim[g];float seed=aTroop.z;float dead=smoothstep(seed,seed+.006,an.z)*step(.001,an.z);vec3 p=aPos,n=aNorm;
if(aPart>3.5&&aPart<4.5){p=rx(p-vec3(.43,1.36,0.),an.y*.82)+vec3(.43,1.36,0.);n=rx(n,an.y*.82);}
if(dead>.001){p=mix(p,rx(p,1.48)+vec3(0.,.16,0.),dead);n=mix(n,rx(n,1.48),dead);pose=mix(pose,vec4(aData.y,uFall[g].y,aData.z,aData.w),dead);}
vec3 local=vec3(aTroop.x*mix(1.,.32,an.w),0.,aTroop.y*mix(1.,.48,an.w));float c=cos(pose.w),ss=sin(pose.w);p+=local;vPos=vec3(c*p.x+ss*p.z,p.y,-ss*p.x+c*p.z)+pose.xyz;vNorm=vec3(c*n.x+ss*n.z,n.y,-ss*n.x+c*n.z);
vec3 tint=aData.x<.5?vec3(.64,.7,.7):aData.x<1.5?vec3(1.14,.49,.4):aData.x<2.5?vec3(.62,.86,.82):vec3(1.15,.92,.53);vColor=aColor*mix(vec3(1.),tint,.75)*(.93+seed*.12);vColor=mix(vColor,vec3(.28,.275,.24),dead*.6);vColor=lighting(vNorm,vColor,vPos);gl_Position=uVP*vec4(vPos,1.);}`;

const SHADOW_VS=`#version 300 es
${COMMON}${GROUPS}
layout(location=0)in vec3 aPos;layout(location=4)in vec4 aTroop;layout(location=5)in vec4 aData;
out vec2 vUV;out float vAlpha;
void main(){int g=int(aTroop.w+.5);vec4 pose=uPose[g],an=uAnim[g];if(aTroop.z<an.z)pose=aTroop.z>.997?uFall[g]:vec4(aData.y,uFall[g].y,aData.z,aData.w);vec3 p=vec3(aTroop.x,0.,aTroop.y);p=ry(p,pose.w)+pose.xyz; p.y+=.035;p.xz+=aPos.xz*(aTroop.z>.997?vec2(10.,12.):vec2(.8,1.2));vUV=aPos.xz;vAlpha=(1.-an.w)*(aTroop.z>.997?.045:.20);gl_Position=uVP*vec4(p,1.);}`;
const SHADOW_FS=`#version 300 es
precision highp float;in vec2 vUV;in float vAlpha;out vec4 frag;void main(){float a=(1.-smoothstep(.25,1.,length(vUV)))*vAlpha;if(a<.01)discard;frag=vec4(.16,.17,.16,a);}`;
const INST_VS=`#version 300 es
${COMMON}
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNorm;layout(location=2)in vec3 aColor;layout(location=4)in vec4 aOffset;layout(location=5)in vec4 aScale;
out vec3 vPos;out vec3 vNorm;out vec3 vColor;
${OUTPUT}
void main(){float c=cos(aOffset.w),s=sin(aOffset.w);vec3 p=aPos*aScale.xyz;vec3 n=aNorm;vPos=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z)+aOffset.xyz;vNorm=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);vColor=aColor*aScale.w;vColor=lighting(vNorm,vColor,vPos);gl_Position=uVP*vec4(vPos,1.);}`;
const WATER_VS=`#version 300 es
${COMMON}
layout(location=0)in vec3 aPos;layout(location=6)in vec2 aUV;out vec3 vPos;out vec2 vUV;
void main(){vUV=aUV;vPos=aPos;vPos.y+=sin(aPos.x*.17+uTime*.8)*.11+sin(aPos.z*.22-uTime*.6)*.07;gl_Position=uVP*vec4(vPos,1.);}`;
const WATER_FS=`#version 300 es
${COMMON}
in vec3 vPos;in vec2 vUV;out vec4 frag;uniform sampler2D uGround;uniform float uFlow;
${OUTPUT}
void main(){
 vec2 uv=vPos.xz;float n0=texture(uGround,uv*vec2(.038,.17)+vec2(uTime*.045,0.)).r;
 float n1=texture(uGround,uv*vec2(.013,.075)-vec2(uTime*.015,0.)).r;
 vec3 view=normalize(uEye-vPos);float fr=1.-clamp(view.y,0.,1.);fr*=fr;
 vec3 c=mix(vec3(.22,.335,.36),vec3(.54,.64,.66),fr);
 c+=(n0-.5)*.037+(n1-.5)*.028;
 float edge=smoothstep(.85,1.,abs(vUV.y*2.-1.));c=mix(c,vec3(.53,.565,.49),edge*.42);
 float line=1.-smoothstep(.035,.11,abs(fract(uv.y*.34)-.5));
 float dash=smoothstep(.0,.18,fract(uv.x*.043+uTime*.09))* (1.-smoothstep(.68,.99,fract(uv.x*.043+uTime*.09)));
 c+=vec3(.19,.30,.31)*line*dash*(.18+.38*uFlow)*(1.-edge);
 frag=vec4(finishColor(c,vPos),1.);
}`;
const FLAG_VS=`#version 300 es
${COMMON}${GROUPS}
layout(location=0)in vec3 aPos;layout(location=6)in vec2 aUV;layout(location=4)in vec4 aFlag;
out vec3 vPos;out vec2 vUV;out float vShade;out float vAlive;
void main(){int g=int(aFlag.x+.5);vec4 pose=uPose[g];vec3 p=aPos;float loss=uAnim[g].z;float down=smoothstep(.63,.84,loss);p.z+=sin(p.x*1.2+uTime*3.2+float(g))*p.x*.17;p.x+=sin(uTime*1.7+float(g))*.06*p.x;p=rx(p,down*1.05);p=ry(p,pose.w)+pose.xyz;vPos=p;vUV=vec2((aUV.x+aFlag.y)/4.,aUV.y);vShade=.93+.07*sin(uTime*3.+aPos.x*1.2+float(g));vAlive=1.-down*.6;gl_Position=uVP*vec4(p,1.);}`;
const FLAG_FS=`#version 300 es
${COMMON}
uniform sampler2D uAtlas;in vec3 vPos;in vec2 vUV;in float vShade;in float vAlive;out vec4 frag;${OUTPUT}
void main(){vec4 c=texture(uAtlas,vUV);if(c.a<.3)discard;frag=vec4(finishColor(c.rgb*vShade,vPos),c.a*vAlive);}`;
const POLE_VS=`#version 300 es
${COMMON}${GROUPS}
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNorm;layout(location=2)in vec3 aColor;layout(location=4)in vec4 aFlag;
out vec3 vPos;out vec3 vNorm;out vec3 vColor;
${OUTPUT}
void main(){int g=int(aFlag.x+.5);vec4 pose=uPose[g];vec3 p=aPos;float down=smoothstep(.63,.84,uAnim[g].z);p=rx(p,down*1.05);p=ry(p,pose.w)+pose.xyz;vPos=p;vNorm=ry(aNorm,pose.w);vColor=lighting(vNorm,aColor,p);gl_Position=uVP*vec4(p,1.);}`;
const POINT_VS=`#version 300 es
${COMMON}
layout(location=0)in vec3 aPos;layout(location=2)in vec4 aColor;layout(location=3)in float aSize;
uniform float uPointScale;out vec4 vColor;
void main(){vColor=aColor;gl_Position=uVP*vec4(aPos,1.);gl_PointSize=clamp(aSize*uPointScale/max(gl_Position.w,1.),1.,120.);}`;
const POINT_FS=`#version 300 es
precision highp float;in vec4 vColor;out vec4 frag;
void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,d))*vColor.a;if(a<.012)discard;frag=vec4(vColor.rgb,a);}`;
const LINE_VS=`#version 300 es
${COMMON}
layout(location=0)in vec3 aPos;layout(location=2)in vec3 aColor;out vec3 vPos;out vec3 vColor;
void main(){vPos=aPos;vColor=aColor;gl_Position=uVP*vec4(aPos,1.);}`;
const LINE_FS=`#version 300 es
${COMMON}
in vec3 vPos;in vec3 vColor;out vec4 frag;${OUTPUT}
void main(){frag=vec4(finishColor(vColor,vPos),.86);}`;
const MOTION_VS=`#version 300 es
${COMMON}
layout(location=0)in vec3 aPos;layout(location=2)in vec4 aColor;out vec4 vColor;out vec3 vPos;
void main(){vColor=aColor;vPos=aPos;gl_Position=uVP*vec4(aPos,1.);}`;
const MOTION_FS=`#version 300 es
${COMMON}
in vec4 vColor;in vec3 vPos;out vec4 frag;${OUTPUT}
void main(){frag=vec4(finishColor(vColor.rgb,vPos),vColor.a);}`;
// Distant sprite LOD is used only by the smooth/slow-device path. Every close
// soldier remains a true articulated 3D mesh; all LODs use the same formations.
const CROWD_VS=`#version 300 es
${COMMON}${GROUPS}
layout(location=4)in vec4 aTroop;layout(location=5)in vec4 aData;
uniform float uPointScale;uniform float uViewElev;uniform float uViewYaw;
out vec3 vColor;out float vElev;out float vDead;out float vSeed;out float vFace;
${OUTPUT}
void main(){int g=int(aTroop.w+.5);vec4 po=uPose[g],an=uAnim[g];float seed=aTroop.z;float dead=smoothstep(seed,seed+.006,an.z)*step(.001,an.z);
 vec3 loc=vec3(aTroop.x*mix(1.,.32,an.w),1.82,aTroop.y*mix(1.,.48,an.w));if(dead>.01){po=mix(po,vec4(aData.y,uFall[g].y,aData.z,aData.w),dead);loc.y=mix(1.82,.4,dead);}
 vec3 pos=ry(loc,po.w)+po.xyz;vec4 clip=uVP*vec4(pos,1.);gl_Position=clip;gl_PointSize=clamp(uPointScale*4.35/max(1.,clip.w),2.,42.);
 vec3 base=aData.x<.5?vec3(.28,.34,.32):aData.x<1.5?vec3(.61,.265,.185):aData.x<2.5?vec3(.34,.47,.37):vec3(.61,.48,.25);
 vColor=finishColor(base*(.93+seed*.13),pos);vDead=dead;vElev=uViewElev;vSeed=seed;vFace=cos(po.w-uViewYaw);
}`;
const CROWD_FS=`#version 300 es
precision highp float;in vec3 vColor;in float vElev;in float vDead;in float vSeed;in float vFace;out vec4 frag;
void main(){vec2 q=gl_PointCoord-.5;float ce=max(.17,cos(vElev));float headY=-.09*ce;float head=step(length((q-vec2(0.,headY))*vec2(1.,1.1)),.066);
 float body=step(abs(q.x),.079)*step(.005*ce,q.y)*step(q.y,.22*ce+.025);
 float leg=step(.023,abs(q.x))*step(abs(q.x),.079)*step(.21*ce,q.y)*step(q.y,.38*ce+.023);
 float shield=step(abs(q.x+.09),.039)*step(.06*ce,q.y)*step(q.y,.23*ce+.026);
 float spear=step(abs(q.x-.15),.009)*step(-.45*ce-.025,q.y)*step(q.y,.27*ce+.03);
 if(vDead>.5){body=step(abs(q.x),.20)*step(abs(q.y),.045);head=0.;leg=0.;shield=0.;spear=0.;}
 if(max(max(max(head,body),max(leg,shield)),spear)<.5)discard;
 vec3 col=vColor;if(head>.5)col=mix(vColor*.75,vec3(.59,.56,.42),max(vFace,0.)*.5);if(leg>.5||shield>.5)col*=.74;if(spear>.5)col=vec3(.50,.43,.28);if(vDead>.5)col=mix(col,vec3(.28,.28,.24),.68);frag=vec4(col,1.);
}`;
const SKY_VS=`#version 300 es
precision highp float;out vec2 vUV;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,1.,1.);}`;
const SKY_FS=`#version 300 es
precision highp float;in vec2 vUV;out vec4 frag;uniform vec3 uForward;uniform vec3 uRight;uniform vec3 uUp;uniform float uAspect;uniform float uTanFov;uniform float uShift;uniform vec3 uSun;
void main(){vec2 q=(vUV*2.-1.+vec2(uShift,0.))*vec2(uAspect,1.)*uTanFov;
 vec3 ray=uForward+uRight*q.x+uUp*q.y;float h=clamp(ray.y*.86,0.,1.);vec3 col=mix(vec3(.755,.781,.755),vec3(.435,.55,.59),h);
 float front=dot(uSun,uForward);if(front>.04){vec2 sp=vec2(dot(uSun,uRight),dot(uSun,uUp))/front;float ds=dot(q-sp,q-sp);float glow=1.-smoothstep(0.,.80,ds);col+=vec3(.10,.071,.024)*glow*glow;float disc=1.-smoothstep(.00011,.00019,ds);col+=vec3(.23,.21,.14)*disc;}
 frag=vec4(col,1.);}`;
class Renderer{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});if(!this.gl)throw new Error('当前浏览器未能创建 WebGL2。请使用已开启硬件加速的新版桌面浏览器。');this.programs={};this.calls=0;this.triangles=0;this.points=0;this.buffers=0;this.pixelRatio=1;this.sun=J.v3.norm([-.65,1,.35]);this.vp=J.mat.perspective(.87,1,1,4000);this.eye=[0,500,600];this.compileAll();const g=this.gl;const info=g.getExtension('WEBGL_debug_renderer_info');this.software=!!(info&&/swiftshader|llvmpipe|software/i.test(g.getParameter(info.UNMASKED_RENDERER_WEBGL)));g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);}
 program(name,vs,fs){const gl=this.gl;const shader=(t,s)=>{let sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){let err=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error(name+' shader: '+err)}return sh};let v=shader(gl.VERTEX_SHADER,vs),f=shader(gl.FRAGMENT_SHADER,fs),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(name+' link: '+gl.getProgramInfoLog(p));gl.deleteShader(v);gl.deleteShader(f);this.programs[name]={p,u:{}};return this.programs[name]}
 compileAll(){this.program('static',STATIC_VS,STATIC_FS);this.program('troop',SOLDIER_VS,SOLDIER_FS);this.program('troopfar',FAR_VS,SOLDIER_FS);this.program('shadow',SHADOW_VS,SHADOW_FS);this.program('inst',INST_VS,SOLDIER_FS);this.program('water',WATER_VS,WATER_FS);this.program('flag',FLAG_VS,FLAG_FS);this.program('pole',POLE_VS,SOLDIER_FS);this.program('point',POINT_VS,POINT_FS);this.program('line',LINE_VS,LINE_FS);this.program('sky',SKY_VS,SKY_FS);this.program('motion',MOTION_VS,MOTION_FS);this.program('crowd',CROWD_VS,CROWD_FS);}
 loc(p,k){if(!(k in p.u))p.u[k]=this.gl.getUniformLocation(p.p,k);return p.u[k]}
 use(name,time,groups=false){let p=this.programs[name],gl=this.gl;gl.useProgram(p.p);gl.uniformMatrix4fv(this.loc(p,'uVP'),false,this.vp);gl.uniform3fv(this.loc(p,'uEye'),this.eye);gl.uniform1f(this.loc(p,'uTime'),time);gl.uniform3fv(this.loc(p,'uSun'),this.sun);if(groups){gl.uniform4fv(this.loc(p,'uPose[0]'),J.pose);gl.uniform4fv(this.loc(p,'uAnim[0]'),J.anim);gl.uniform4fv(this.loc(p,'uFall[0]'),J.fall);gl.uniform4fv(this.loc(p,'uTravel[0]'),J.travel)}this.active=p;return p}
 attrib(loc,size,array,usage,divisor=0){let gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,array instanceof Float32Array?array:new Float32Array(array),usage||gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);if(divisor)gl.vertexAttribDivisor(loc,divisor);this.buffers++;return b}
 mesh(geo,instances=null){
 const gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);
 // Reuse equal vertices (including face normals). Instancing remains per formation.
 const specs=[[0,3,'p'],[1,3,'n'],[2,3,'c'],[3,1,'part'],[6,2,'uv']].filter(q=>geo[q[2]]?.length),count=geo.p.length/3;
 const arrays=Object.fromEntries(specs.map(q=>[q[2],[]])),seen=new Map(),indices=[];let unique=0;
 for(let i=0;i<count;i++){let key='';for(const [,size,k]of specs)for(let j=0;j<size;j++)key+=Math.round(geo[k][i*size+j]*100000)+',';
 let id=seen.get(key);if(id===undefined){id=unique++;seen.set(key,id);for(const [,size,k]of specs)for(let j=0;j<size;j++)arrays[k].push(geo[k][i*size+j]);}indices.push(id);}
 for(const [loc,size,k]of specs)this.attrib(loc,size,arrays[k]);
 const element=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,element);const wide=unique>65535;gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,wide?new Uint32Array(indices):new Uint16Array(indices),gl.STATIC_DRAW);
 let m={vao,n:count,vertices:unique,indexed:true,indexType:wide?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,instances:0,instanced:!!instances};
 if(instances){m.i0=this.attrib(4,4,instances.a,instances.dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW,1);if(instances.b)m.i1=this.attrib(5,4,instances.b,instances.dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW,1);m.instances=instances.a.length/4;}gl.bindVertexArray(null);
 if(!instances && count>6000){
  const cells=new Map();
  for(let i=0;i<count;i+=3){let x=0,y=0,z=0;for(let j=0;j<3;j++){x+=geo.p[(i+j)*3];y+=geo.p[(i+j)*3+1];z+=geo.p[(i+j)*3+2];}x/=3;y/=3;z/=3;
   const key=Math.floor(x/150)+','+Math.floor(z/150);let c=cells.get(key);
   if(!c){c={ids:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};cells.set(key,c);}
   for(let j=0;j<3;j++){c.ids.push(indices[i+j]);for(let k=0;k<3;k++){c.min[k]=Math.min(c.min[k],geo.p[(i+j)*3+k]);c.max[k]=Math.max(c.max[k],geo.p[(i+j)*3+k]);}}
  }
  const Type=wide?Uint32Array:Uint16Array;
  m.chunks=[...cells.values()].map(c=>({ids:new Type(c.ids),center:c.min.map((v,i)=>(v+c.max[i])/2),radius:Math.hypot(...c.min.map((v,i)=>(c.max[i]-v)/2))+3}));
  m.cullBuffer=new Type(count);m.element=element;m.fullCount=count;m.cullKey=null;
 }
 return m;
 }
 dynamic(locations,count){const gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);let d={vao,n:0,attrs:{},capacity:count};for(let [loc,size]of locations){let ar=new Float32Array(count*size),b=this.attrib(loc,size,ar,gl.DYNAMIC_DRAW);d.attrs[loc]={ar,b,size}}gl.bindVertexArray(null);return d}
 updateDynamic(m,count){let gl=this.gl;m.n=count;gl.bindVertexArray(m.vao);for(let a of Object.values(m.attrs)){gl.bindBuffer(gl.ARRAY_BUFFER,a.b);gl.bufferSubData(gl.ARRAY_BUFFER,0,a.ar.subarray(0,count*a.size))}gl.bindVertexArray(null)}
 updateInstances(m,a,b){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,m.i0);gl.bufferSubData(gl.ARRAY_BUFFER,0,a);if(b){gl.bindBuffer(gl.ARRAY_BUFFER,m.i1);gl.bufferSubData(gl.ARRAY_BUFFER,0,b)}}
 sphereVisible(p,r){if(!this.frustum)return true;for(const f of this.frustum)if(f[0]*p[0]+f[1]*p[1]+f[2]*p[2]+f[3]<-r)return false;return true;}
 cull(mesh){
  let key='',count=0;
  for(let i=0;i<mesh.chunks.length;i++){const c=mesh.chunks[i];if(this.sphereVisible(c.center,c.radius)){key+=i+',';mesh.cullBuffer.set(c.ids,count);count+=c.ids.length;}}
  if(mesh.cullKey!==key){mesh.cullKey=key;this.gl.bindVertexArray(mesh.vao);this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,mesh.element);this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER,0,mesh.cullBuffer.subarray(0,count));}
  mesh.n=count;
 }
 draw(mesh,mode=null){const gl=this.gl;if(mesh.chunks)this.cull(mesh);if(!mesh.n||(mesh.instanced&&mesh.instances===0))return;gl.bindVertexArray(mesh.vao);let md=mode??gl.TRIANGLES;if(mesh.indexed){if(mesh.instanced)gl.drawElementsInstanced(md,mesh.n,mesh.indexType,0,mesh.instances);else gl.drawElements(md,mesh.n,mesh.indexType,0);}else if(mesh.instanced)gl.drawArraysInstanced(md,0,mesh.n,mesh.instances);else gl.drawArrays(md,0,mesh.n);this.calls++;if(md===gl.POINTS)this.points+=mesh.n*(mesh.instances||1);if(md===gl.TRIANGLES)this.triangles+=mesh.n/3*(mesh.instances||1)}
 texture(canvas){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,canvas);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.generateMipmap(g.TEXTURE_2D);return t}
 resize(w,h,dpr){this.width=w;this.height=h;this.pixelRatio=dpr;let ww=Math.max(1,Math.round(w*dpr)),hh=Math.max(1,Math.round(h*dpr));if(this.canvas.width!==ww||this.canvas.height!==hh){this.canvas.width=ww;this.canvas.height=hh;this.gl.viewport(0,0,ww,hh)}}
 begin(camera,time){const gl=this.gl;this.eye=camera.eye;let projection=J.mat.perspective((camera.fov||48)*Math.PI/180,this.width/this.height,.7,4400);projection[8]=camera.shiftX||0;this.vp=J.mat.mul(projection,J.mat.lookAt(camera.eye,camera.target));const m=this.vp;this.frustum=[];for(let axis=0;axis<3;axis++)for(let sign of[-1,1]){const a=[m[3]+sign*m[axis],m[7]+sign*m[4+axis],m[11]+sign*m[8+axis],m[15]+sign*m[12+axis]],n=Math.hypot(a[0],a[1],a[2]);this.frustum.push(a.map(x=>x/n));}this.calls=0;this.triangles=0;this.points=0;gl.clearColor(.7,.74,.72,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);let p=this.use('sky',time);let forward=J.v3.norm(J.v3.sub(camera.target,camera.eye)),right=J.v3.norm(J.v3.cross(forward,[0,1,0])),up=J.v3.cross(right,forward);gl.uniform3fv(this.loc(p,'uForward'),forward);gl.uniform3fv(this.loc(p,'uRight'),right);gl.uniform3fv(this.loc(p,'uUp'),up);gl.uniform1f(this.loc(p,'uAspect'),this.width/this.height);gl.uniform1f(this.loc(p,'uTanFov'),Math.tan((camera.fov||48)*Math.PI/360));gl.uniform1f(this.loc(p,'uShift'),camera.shiftX||0);gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);this.calls++;gl.enable(gl.DEPTH_TEST);gl.depthMask(true);}
}
J.Renderer=Renderer;
