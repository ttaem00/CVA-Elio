"""Render and independently recheck a fictional Story with the original renderer."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.render_story import render_page
from tools.elio_preview.examples.reusable_demo import build_demo
from tools.elio_board.authoring import application_files
from scripts.template_gallery import outputs as template_outputs


def outputs():
    story, source, connections = build_demo()
    # Use the supplied fictional illustration; do not request remote game images.
    page = render_page(story, source, connections, ROOT / 'examples/story.html')
    files = {**{f'examples/{name}.json': json.dumps(data, ensure_ascii=False, indent=2) + '\n'
               for name, data in [('story', story), ('source', source), ('connections', connections)]},
            'examples/story.html': page}
    catalog = json.loads((ROOT / 'examples/board.catalog.json').read_text(encoding='utf-8'))
    files.update({'board/' + name: raw for name, raw in application_files([catalog]).items()})
    files.update(template_outputs())
    return files


files = outputs()
if '--list' in sys.argv:
    print(json.dumps(sorted(files)))
    raise SystemExit(0)
for name, value in files.items():
    raw = value if isinstance(value, bytes) else value.encode('utf-8')
    path = ROOT / name
    if '--check' in sys.argv:
        if path.read_bytes() != raw:
            raise ValueError('Detached renderer output differs: ' + name)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
print('ELIO_STORY_RENDER_AND_REOPEN_PASS')
