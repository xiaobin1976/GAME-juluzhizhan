from pathlib import Path
root=Path(__file__).resolve().parent
page=(root/'src/page.html').read_text()
for key,name in [('CSS','style.css'),('ENGINE','engine.js'),('BATTLE','battle.js'),('WORLD','world.js'),('DIRECTOR','director.js'),('CONTINUITY','continuity.js'),('CINEMA','cinema.js'),('AUDIO','audio.js'),('APP','app.js')]:
    page=page.replace('/*__'+key+'__*/',(root/'src'/name).read_text())
(root/'巨鹿之战_V3_连续运镜优化版.html').write_text(page)
print(len(page.encode()), 'bytes')
