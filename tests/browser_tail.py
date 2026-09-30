"""Real WebGL2 regression; SwiftShader is not hardware-device validation."""
from pathlib import Path
import os, json, hashlib
from playwright.sync_api import sync_playwright
os.environ.pop('DISPLAY',None)
ROOT=Path(__file__).resolve().parents[1];HTML=ROOT/'巨鹿之战_V3_连续运镜优化版.html';results=[]
def ck(n,ok,d=None):
 results.append({'test':n,'pass':bool(ok),'detail':d});print('PASS' if ok else 'FAIL',n,d if not ok else '',flush=True)
 (ROOT/'tests/browser_tail_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
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
 q.locator('#chapterMenu').click();q.locator('.chapter-choice[data-chapter="4"]').click();q.wait_for_function('!__JULU.state().transporting',timeout=8000)
 ck('章节目录定位交锋',abs(S()['time']-150)<.01)
 E('__JULU.seek(59.5);__JULU.setSpeed(4);__JULU.play()');q.locator('#loopBeat').click();W(5200)
 ck('循环本章返回当前章',S()['loop'] and 32<=S()['time']<66,S()['time'])
 q.locator('#loopBeat').click();E('__JULU.pause();__JULU.setSpeed(1)');ck('可关闭循环',not S()['loop'])
 q.locator('#seek').evaluate('(e)=>{e.value="111.5";e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}')
 ck('时间滑块精确定位',abs(S()['time']-111.5)<.01)
 for speed in ['0.25','0.5','1','2','4']:
  q.locator('[data-speed="'+speed+'"]').click();ck('倍速 '+speed,S()['speed']==float(speed))
 E('__JULU.setSpeed(1);__JULU.pause();__JULU.seek(155);__JULU.guide(true)')
 xy=E('(()=>{for(let y=210;y<500;y+=35)for(let x=80;x<830;x+=40)if(document.elementFromPoint(x,y)?.id==="stage"&&document.elementFromPoint(x+80,y+25)?.id==="stage")return [x,y];return [700,250]})()');q.mouse.move(*xy);q.mouse.down();q.mouse.move(xy[0]+80,xy[1]+25,steps=8);q.mouse.up();W(300)
 ck('鼠标接管不改变战局时间',S()['mode']=='free' and S()['time']==155)
 dist=S()['distance'];q.mouse.wheel(0,-180);W(650);ck('滚轮缩放',S()['distance']<dist)
 q.keyboard.press('d');W(1000);ck('D返回导览',S()['guide'] and S()['time']==155)
 q.locator('#paths').click();ck('方向线可关闭',not S()['paths']);q.locator('#paths').click()
 for btn,dialog in [('sources','sourcesDialog'),('help','helpDialog'),('settings','settingsDialog')]:
  q.locator('#'+btn).click();ck(btn+'窗口打开',q.locator('#'+dialog).evaluate('(e)=>e.open'));q.locator('[data-close="'+dialog+'"]').click()
 q.locator('#settings').click();q.locator('#labelToggle').uncheck();q.wait_for_function('__JULU.labels().every(l=>l.alpha<.02)',timeout=8000);ck('标签关闭淡出',E('__JULU.labels().every(l=>l.alpha<.02)'))
 q.locator('#labelToggle').check();q.locator('#cinemaToggle').uncheck();E('__JULU.seek(68);__JULU.guide(true)');W(220)
 ck('章节标题开关',q.locator('#chapterCurtain').evaluate('(e)=>+e.style.opacity===0'))
 q.locator('#cinemaToggle').check();q.locator('#insetToggle').uncheck();ck('局部示意开关',not q.locator('#localMap').is_visible());q.locator('#insetToggle').check()
 with q.expect_download() as dl:q.locator('#exportDiag').click()
 obj=json.loads(Path(dl.value.path()).read_text());ck('实际V3诊断导出',obj['version']=='3.0.0' and not obj['errors'] and obj['frames']>0)
 with q.expect_download() as dl:q.locator('#screenshot').click()
 ck('真实PNG导出',Path(dl.value.path()).read_bytes()[:8]==b'\x89PNG\r\n\x1a\n')
 q.locator('[data-close="settingsDialog"]').click();q.locator('#sound').click();W(350);ck('音频用户操作后启用',E('J.audio.enabled'));q.locator('#sound').click()
 q.locator('#hideUI').click();ck('净览可恢复',q.locator('#restoreUI').is_visible());q.locator('#restoreUI').click()
 E('__JULU.seek(300)');ck('终点暂停结尾可见',q.locator('#ending').is_visible() and not S()['playing'])
 q.locator('#stayEnd').click();ck('结尾可留在战场',not q.locator('#ending').is_visible() and S()['mode']=='free')
 q.locator('#restart').click();E('__JULU.pause()');ck('重播复位',S()['time']<2)
 ck('无外部资源请求',not [r for r in requests if r.startswith(('http:','https:'))],requests)
 ck('无JS/WebGL错误',not errors and S()['glError']==0,errors)
 (ROOT/'tests/browser_input.json').write_text(json.dumps({'sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'browser':b.version,'viewport':[1280,800],'loading':'set_content; file navigation blocked by test environment','renderer':E('(()=>{const g=J.renderer.gl,e=g.getExtension("WEBGL_debug_renderer_info");return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):"unknown"})()')},indent=2))
 b.close()
print('TOTAL',len(results),'PASS',sum(x['pass'] for x in results),flush=True)
