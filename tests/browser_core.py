"""Real WebGL2 regression; SwiftShader is not hardware-device validation."""
from pathlib import Path
import os, json, hashlib
from playwright.sync_api import sync_playwright
os.environ.pop('DISPLAY',None)
ROOT=Path(__file__).resolve().parents[1];HTML=ROOT/'巨鹿之战_V3_连续运镜优化版.html';results=[]
def ck(n,ok,d=None):
 results.append({'test':n,'pass':bool(ok),'detail':d});print('PASS' if ok else 'FAIL',n,d if not ok else '',flush=True)
 (ROOT/'tests/browser_core_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('JULU_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 q=b.new_page(viewport={'width':1280,'height':800},accept_downloads=True);errors=[];requests=[]
 q.on('pageerror',lambda e:errors.append(str(e)));q.on('request',lambda r:requests.append(r.url))
 q.set_content(HTML.read_text(),wait_until='load');q.wait_for_function('window.__JULU?.ready',timeout=60000)
 E=q.evaluate;W=q.wait_for_timeout
 S=lambda:E('__JULU.state()')
 ck('V3/WebGL2启动',E('__JULU.version==="3.0.0"&&J.renderer.gl instanceof WebGL2RenderingContext'))
 q.locator('#explore').click();E("__JULU.setQuality('smooth');__JULU.seek(82);__JULU.guide(true)");W(500)
 ck('52编组/6240代表兵卒/16持久船只',S()['groups']==52 and S()['transportCount']==16 and S()['sceneSoldiers']==6240)
 for i,sh in enumerate(E('J.shots.map(s=>({at:s.at,end:s.end,name:s.name}))')):
  s=E('(t)=>{__JULU.seek(t);__JULU.guide(true);__JULU.renderOnce();return __JULU.state()}',sh['at']+min(3.1,(sh['end']-sh['at'])*.48))
  ck(f'{i+1:02d}号镜头实际绘制：{sh["name"]}',s['glError']==0 and s['drawCalls']>3 and all(abs(v)<10000 for v in s['eye']) and not s['errors'])
 ids=E('J.transports.map(x=>x.id)');a=E('()=>{__JULU.seek(82.5);__JULU.guide(true);return __JULU.state()}')
 E('__JULU.seek(220);__JULU.seek(12);__JULU.seek(82.5);__JULU.guide(true)');z=S()
 ck('倒回后军队/船/镜头一致',a['boats']==z['boats'] and a['battle']==z['battle'] and a['eye']==z['eye'])
 ck('倒回后船ID及数量不变',ids==E('J.transports.map(x=>x.id)'))
 E('__JULU.seek(80);__JULU.follow("xiang","side");__JULU.play()');W(1100)
 samples=E('''()=>new Promise(resolve=>{const out=[];let n=0;function f(){out.push({t:J.app.time,labels:__JULU.labels()});if(++n>=55)resolve(out);else requestAnimationFrame(f);}requestAnimationFrame(f);})''')
 E('__JULU.pause()');mx=0;seen=0
 for x,y in zip(samples,samples[1:]):
  for a,z in zip(x['labels'],y['labels']):
   if a['id']==z['id'] and a['alpha']>.5 and z['alpha']>.5:mx=max(mx,sum((a['offset'][i]-z['offset'][i])**2 for i in range(2))**.5);seen+=1
 (ROOT/'tests/label_tracking_samples.json').write_text(json.dumps(samples,ensure_ascii=False))
 ck('连续可见标签没有离散槽位跳换',seen>10 and mx<22,{'compared':seen,'maxOffsetStepPx':mx})
 E('__JULU.seek(165);__JULU.follow("xiang","orbit")');W(1800);a=S();W(650);z=S()
 ck('暂停冻结士兵与渡船',a['battle']==z['battle'] and a['boats']==z['boats'] and a['time']==z['time'])
 ck('暂停环绕不继续转动',max(abs(x-y) for x,y in zip(a['eye'],z['eye']))<.02)
 for angle in ['rear','side','front','orbit','overhead','contact']:
  q.locator('[data-angle="'+angle+'"]').click();W(160);ck('跟拍 '+angle,S()['angle']==angle and S()['mode']=='follow')
 E('__JULU.seek(168);__JULU.guide(true)');W(500)
 ck('笔记本局部放大入口不被裁切',q.locator('#inspectLocal').evaluate('(e)=>{const r=e.getBoundingClientRect(),p=document.getElementById("side").getBoundingClientRect();return r.bottom<=p.bottom+1&&r.top>=p.top}'))
 before=S()['time'];q.locator('#inspectLocal').click();W(1500)
 ck('局部放大是真实主镜头且时间不变',S()['mode']=='follow' and S()['distance']<51 and S()['time']==before)
 q.locator('#returnDirector').click();W(1100);ck('回导演不重播',S()['guide'] and S()['time']==before)
 E('__JULU.pause();__JULU.seek(30);__JULU.view("city");__JULU.navigate(127)')
 ck('章节快进进入导览且有进度',S()['transporting'] and S()['guide'] and q.locator('#travelNotice').is_visible())
 q.wait_for_function('!__JULU.state().transporting',timeout=8000);ck('快进到达并保留暂停',abs(S()['time']-127)<.01 and not S()['playing'])
 E('__JULU.play();__JULU.navigate(217)');q.wait_for_function('!__JULU.state().transporting',timeout=8000)
 ck('播放中快进后继续',S()['playing'] and 217<=S()['time']<220)
 E('__JULU.pause();__JULU.seek(40);__JULU.navigate(240)');W(700);q.locator('#cancelTravel').click()
 ck('快进可取消停在中途',not S()['transporting'] and 40<S()['time']<240 and not S()['playing'])
 E('__JULU.seek(32);__JULU.guide(true)');q.locator('#nextBeat').click();q.wait_for_function('!__JULU.state().transporting',timeout=8000)
 ck('下一重点',abs(S()['time']-34)<.01)
 ck('核心检查无JS/WebGL错误',not errors and S()['glError']==0,errors)
 b.close()
print('TOTAL',len(results),'PASS',sum(x['pass'] for x in results))
