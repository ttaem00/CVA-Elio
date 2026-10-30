"""Embed the actual reader stylesheet and shared scene template, without restyling them."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2 if Path(__file__).parent.name == 'cva_design_system' else 1]
UI = ROOT / 'tools/cva_design_system' if (ROOT / 'tools/cva_design_system/components.js').is_file() else ROOT / 'cva'
TARGET = UI / 'module-renderer.js'
START = '  /* BEGIN CANONICAL ELIO READER */'
END = '  /* END CANONICAL ELIO READER */'


def generated():
    css = (ROOT / 'tools/elio_preview/style.css').read_text(encoding='utf-8')
    guide_css = (ROOT / 'tools/elio_preview/components/reader_guides.css').read_text(encoding='utf-8')
    shell = (ROOT / 'tools/elio_preview/components/scene_shell.html').read_text(encoding='utf-8').rstrip('\n')
    page = (ROOT / 'tools/elio_preview/template.html').read_text(encoding='utf-8')
    hero = page.split('<header class="hero">', 1)[1].split('<div class="quest-chips"', 1)[0]
    data = dict(css=css+ '\n'+guide_css, baseCSS=css, sceneShell=shell, heroHead=hero, cssSHA256=hashlib.sha256(css.encode()).hexdigest())
    return START + '\n  const elioOriginal = ' + json.dumps(data, ensure_ascii=False) + ';\n' + END


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    source = TARGET.read_text(encoding='utf-8')
    start, end = source.index(START), source.index(END) + len(END)
    expected = source[:start] + generated() + source[end:]
    if args.check:
        if expected != source:
            raise SystemExit('Canonical Elio reader bundle is stale')
        print('CANONICAL_ELIO_READER_CURRENT')
    else:
        TARGET.write_text(expected, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
