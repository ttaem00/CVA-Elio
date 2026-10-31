"""Render authored Story JSON to a new local HTML, retaining packaged assets."""
import argparse
import html
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.elio_preview.__main__ import render


def render_page(story, source, connections, output):
    page = render(story, source, connections=connections, publication_status='manager_review')
    def relative(name):
        return Path(os.path.relpath(ROOT / name, output.parent)).as_posix()
    page = page.replace('/storytimeline/templates/assets/', relative('examples/assets') + '/')
    page = page.replace('/assets/ttaem-cva-logo.svg', relative('assets/logo.svg'))
    page = page.replace('<a href="/storytimeline/">전체 작품</a>',
                        '<a href="' + html.escape(relative('index.html'), quote=True) + '">Elio 홈</a>', 1)
    work_title = html.escape(story['work_title'], quote=True)
    page = page.replace('<a href="/storytimeline/' + html.escape(story['work_id'], quote=True) + '/">' + work_title + '</a>',
                        '<span>' + work_title + '</span>', 1)
    page = page.replace('href="/storytimeline/templates/"', 'href="https://ttaem.com/storytimeline/templates/"')
    page = page.replace('</head>', '<link rel="stylesheet" href="' + relative('assets/font.css') + '"></head>', 1)
    return page


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--connections', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.suffix.lower() != '.html':
        parser.error('Output must use a new .html filename')
    load = lambda path: json.loads(path.read_text(encoding='utf-8-sig'))
    page = render_page(load(args.input), load(args.source),
                       load(args.connections) if args.connections else None, args.output.resolve())
    with args.output.open('x', encoding='utf-8', newline='\n') as target:
        target.write(page)
    print('Created', args.output)


if __name__ == '__main__':
    main()
