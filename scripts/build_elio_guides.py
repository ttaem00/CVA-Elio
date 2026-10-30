"""Embed the canonical reader guide templates in the existing CVA atoms."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2 if Path(__file__).parent.name == 'cva_design_system' else 1]
UI = ROOT / 'tools/cva_design_system' if (ROOT / 'tools/cva_design_system/components.js').is_file() else ROOT / 'cva'
SOURCE = ROOT / 'tools/elio_preview/components/reader_guide_templates.json'
TARGET = UI / 'components.js'
START = '  /* BEGIN CANONICAL ELIO GUIDES */'
END = '  /* END CANONICAL ELIO GUIDES */'


def generated():
    data = json.loads(SOURCE.read_text(encoding='utf-8'))
    if data.get('schema_version') != 'elio.reader-guide-templates.v1':
        raise ValueError('Unsupported canonical reader guide template schema')
    return START + '\n  const elioGuideTemplates = ' + json.dumps(data['templates'], ensure_ascii=False) + ';\n' + END


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    source = TARGET.read_text(encoding='utf-8')
    start, end = source.index(START), source.index(END) + len(END)
    expected = source[:start] + generated() + source[end:]
    if args.check:
        if expected != source:
            raise SystemExit('Canonical Elio guide templates are stale')
        print('CANONICAL_ELIO_GUIDES_CURRENT')
    else:
        TARGET.write_text(expected, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
