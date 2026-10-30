"""Embed original Elio map templates, styling, geometry and its CVA field adapter."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2 if Path(__file__).parent.name == 'cva_design_system' else 1]
COMPONENTS = ROOT / 'tools/elio_preview/components'
UI = ROOT / 'tools/cva_design_system' if (ROOT / 'tools/cva_design_system/components.js').is_file() else ROOT / 'cva'
TARGET = UI / 'public_runtime/engines.js' if (UI / 'public_runtime').is_dir() else ROOT / 'engines.js'
START = '  /* BEGIN CANONICAL ELIO MAP */'
END = '  /* END CANONICAL ELIO MAP */'
RUNTIME_START = '  /* BEGIN CANONICAL ELIO MAP RUNTIME */'
RUNTIME_END = '  /* END CANONICAL ELIO MAP RUNTIME */'


def fragments():
    templates = json.loads((COMPONENTS / 'time_map_templates.json').read_text('utf-8'))
    runtime = '\n'.join((COMPONENTS / name).read_text('utf-8') for name in ['diagram_geometry.js','time_map.js'])
    css = '\n'.join((COMPONENTS / name).read_text('utf-8') for name in ['reader_guides.css','time_map.css','story_tree_reader.css'])
    adapter = (TARGET.parent / 'map-adapter.js').read_text('utf-8')
    return (START + '\n  const canonicalMap = ' + json.dumps(dict(templates=templates,runtime=runtime,css=css),ensure_ascii=False) + ';\n' + adapter + '\n' + END,
            RUNTIME_START + '\n' + runtime + '\n' + RUNTIME_END)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    source = TARGET.read_text('utf-8')
    expected = source
    for start,end,generated in [(START,END,fragments()[0]),(RUNTIME_START,RUNTIME_END,fragments()[1])]:
        a,b = expected.index(start),expected.index(end)+len(end)
        expected = expected[:a]+generated+expected[b:]
    if args.check:
        if source != expected: raise SystemExit('Canonical Elio map bundle is stale')
        print('CANONICAL_ELIO_MAP_CURRENT')
    else: TARGET.write_text(expected,encoding='utf-8',newline='\n')


if __name__ == '__main__': main()
