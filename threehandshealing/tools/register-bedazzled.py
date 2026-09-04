#!/usr/bin/env python3
"""Insert the bedazzled styles into styles/gallery.js STYLES array (after monolith).
Usage: register.py <workflow-output.json>  — reads the build workflow's result array."""
import json, re, sys
OUT = sys.argv[1]
GJS = '/home/koh/Documents/handprotocol/web/threehandshealing/styles/gallery.js'
ORDER = ['nouveau', 'talavera', 'vellum', 'enamel', 'curtain', 'loom', 'lenticular', 'meander', 'popup', 'nightgarden']
res = json.load(open(OUT))
res = res['result'] if isinstance(res, dict) and 'result' in res else res
by = {r['slug']: r for r in res if r}
src = open(GJS).read()
if 'tag: "bedazzled"' in src:
    sys.exit('already registered')
def js(s): return s.replace('\\', '\\\\').replace('"', '\\"')
entries = []
for slug in ORDER:
    r = by.get(slug)
    if not r or not r.get('build'):
        print('skip (no build):', slug); continue
    b = r['build']
    name = r.get('name') or slug.capitalize()
    desc = b['desc'].strip()
    if len(desc) > 130: print('WARN long desc', slug, len(desc))
    fonts = b['fonts'].strip()
    pal = [c for c in b['palette'] if re.fullmatch(r'#[0-9a-fA-F]{6}', c.strip())][:5]
    if len(pal) < 5: print('WARN palette', slug, b['palette'])
    entries.append(f'''    {{ slug: "{slug}", name: "{js(name)}", tag: "bedazzled",
      desc: "{js(desc)}",
      fonts: "{js(fonts)}", colors: [{", ".join('"%s"' % c.strip().lower() for c in pal)}] }},''')
block = '\n' + '\n'.join(entries) + '\n'
anchor = 'fonts: "Bricolage Grotesque + Inter Tight", colors: ["#0a0a0a", "#f2f0eb", "#e7c9a5", "#3b3b3b", "#8a7a6a"] },\n'
assert anchor in src, 'anchor not found'
src = src.replace(anchor, anchor + block, 1)
open(GJS, 'w').write(src)
print('registered', len(entries), 'styles')
