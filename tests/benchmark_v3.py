"""Matched-case benchmark, matched camera/buffer and live playback; no paused idle frames."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json,hashlib,statistics
os.environ.pop('DISPLAY',None)
ROOT=Path(__file__).resolve().parents[1]
base=Path(os.environ.get('JULU_BASELINE', str(ROOT.parent/'巨鹿之战_V2_电影导览交互版.html')))
versions=([('V2',base)] if base.exists() else [])+[('V3',ROOT/'巨鹿之战_V3_连续运镜优化版.html')]
shots=[{'t':82,'target':[-190,3,278],'d':175,'yaw':-.7,'e':.42}, {'t':158,'target':[-18,5,1],'d':115,'yaw':-.8,'e':.30}, {'t':218,'target':[-18,5,1],'d':115,'yaw':-.8,'e':.30}]
result={'environment':{},'samples':[],'summary':[],'notes':'软件渲染；完整运行时、画质均为流畅，1x静音。每段预热1秒后采样5秒；单轮三机位对照。只统计连续播放帧；两版本优化后细节级别和渡河编排不同，非逐像素相同工作负载。'}
if os.environ.get('BENCH_RESUME') and (ROOT/'tests/benchmark_results.json').exists():
 result=json.loads((ROOT/'tests/benchmark_results.json').read_text());result['notes']='软件渲染；1280×800视口、922×576缓冲、流畅画质、1x静音；单轮三机位，各预热1秒采样5秒。只取连续播放帧。优化后细节级别与渡河编排不同，非逐像素相同工作负载。';result['summary']=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('JULU_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 result['environment']={'browser':b.version,'viewport':[1280,800],'buffer':[922,576],'source_hashes':{name:hashlib.sha256(path.read_bytes()).hexdigest() for name,path in versions}}
 for round in range(1):
  order=versions if round==0 else list(reversed(versions))
  for name,path in order:
   if not path.exists() or all(any(v['version']==name and v['start']==s['t'] for v in result['samples']) for s in shots):continue
   page=b.new_page(viewport={'width':1280,'height':800});page.set_content(path.read_text(),wait_until='load');page.wait_for_function('window.__JULU?.ready',timeout=60000)
   page.evaluate('__JULU.start(false);__JULU.setQuality("smooth");__JULU.setSpeed(1)')
   for sh in shots:
    if any(v['version']==name and v['start']==sh['t'] for v in result['samples']):continue
    page.evaluate('''s=>{__JULU.pause();__JULU.seek(s.t);J.camera.manual();Object.assign(J.camera,{target:[...s.target],dest:[...s.target],distance:s.d,ddistance:s.d,yaw:s.yaw,dyaw:s.yaw,elev:s.e,delev:s.e,fov:50,dfov:50});__JULU.renderOnce();}''',sh)
    page.wait_for_timeout(1000)
    page.evaluate('J.app.frameLog=[];__JULU.play()');page.wait_for_timeout(5000)
    diag=page.evaluate('()=>{__JULU.pause();return __JULU.diagnostics()}')
    logs=[f for f in diag['frameLog'] if f.get('playing',True) and f.get('rendered',True)]
    ms=[f['ms'] for f in logs]; fps=len(ms)*1000/sum(ms)
    rec={'version':name,'round':round+1,'start':sh['t'],'camera':sh,'frames':len(ms),'meanFPS':fps,'p95Ms':sorted(ms)[int(len(ms)*.95)],'meanTriangles':statistics.mean(f['triangles'] for f in logs),'buffer':diag['drawingBuffer'],'errors':diag['errors']}
    result['environment']['renderer']=diag['renderer'];result['samples'].append(rec)
    (ROOT/'tests/benchmark_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(name,round+1,sh['t'],float(format(fps,'.2f')),flush=True)
   page.close()
 b.close()
for sh in shots:
 row={'start':sh['t']}
 for name,_ in versions:
  vals=[x for x in result['samples'] if x['version']==name and x['start']==sh['t']]
  row[name]={'meanFPS':statistics.mean(v['meanFPS'] for v in vals),'meanP95Ms':statistics.mean(v['p95Ms'] for v in vals),'meanTriangles':statistics.mean(v['meanTriangles'] for v in vals)}
 if 'V2' in row and 'V3' in row:row['ratio']=row['V3']['meanFPS']/row['V2']['meanFPS']
 result['summary'].append(row)
(ROOT/'tests/benchmark_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result['summary'],ensure_ascii=False,indent=2))
