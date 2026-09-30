from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json
os.environ.pop('DISPLAY',None)
r=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('JULU_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 q=b.new_page(viewport={'width':1440,'height':900});q.set_content((r/'巨鹿之战_V3_连续运镜优化版.html').read_text(),wait_until='load');q.wait_for_function('window.__JULU?.ready',timeout=60000)
 q.evaluate('__JULU.start(false);__JULU.setQuality("balanced")')
 for t,n in [(2.9,'chapter_opening'),(69,'chapter_crossing'),(82,'crossing'),(103,'sinking'),(133,'supply'),(168,'battle'),(221,'allies')]:
  q.evaluate('(t)=>{__JULU.seek(t);__JULU.guide(true);__JULU.renderOnce()}',t);q.wait_for_timeout(700);q.screenshot(path=str(r/'previews'/f'{n}.png'));print(n,flush=True)
 q.set_viewport_size({'width':844,'height':390});q.evaluate('__JULU.seek(111);__JULU.guide(true);__JULU.renderOnce()');q.wait_for_timeout(1300);q.screenshot(path=str(r/'previews/mobile_landscape.png'))
 b.close()
