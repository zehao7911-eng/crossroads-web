from pathlib import Path
import re
import runpy
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent


def read(name):
    return (root / name).read_text(encoding='utf-8')


def module(name, binding=None):
    source = read(name)
    names = re.findall(r'^export (?:function|class|const) (\w+)', source, re.M)
    source = re.sub(r'^import .*;\n', '', source, flags=re.M)
    source = re.sub(r'^export ', '', source, flags=re.M)
    return f'const {binding}=(()=>{{\n{source}\nreturn {{{",".join(names)}}};\n}})();\n' if binding else source


runpy.run_path(str(root / 'export-map.py'), run_name='__main__')
html = read('index-source.html')
code = ''.join(module(name, binding) for name, binding in [('map.mjs', None), ('core.mjs', 'C'), ('art.mjs', 'Art'), ('audio.mjs', 'AudioKit'), ('sdk.mjs', 'SDK')])
code += 'const {ArenaView}=Art,{RushAudio}=AudioKit,{bridge}=SDK;\n' + module('app.mjs')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + read('style.css') + '\n</style>')
html = html.replace('<script src="vendor/three.min.js"></script>', '<script>\n/*\n' + read('vendor/THREE-LICENSE.txt') + '\n*/\n' + read('vendor/three.min.js') + '\n</script>')
html = html.replace('<script type="module" src="app.mjs"></script>', '<script>(()=>{\n' + code + '\n})();</script>')
for name in ['index.html', 'standalone.html']:
    (root / name).write_text(html, encoding='utf-8', newline='\n')

files = sorted(p for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
archive = root.parent / 'CROSSROADS-WEB.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=9) as zipfile:
    for path in files:
        zipfile.write(path, path.relative_to(root).as_posix())
with ZipFile(archive) as zipfile:
    assert zipfile.testzip() is None
    assert zipfile.read('index.html') == zipfile.read('standalone.html')
    assert all(zipfile.read(path.relative_to(root).as_posix()) == path.read_bytes() for path in files)
print(f'{archive.name}: {len(files)} files, {archive.stat().st_size:,} bytes')
