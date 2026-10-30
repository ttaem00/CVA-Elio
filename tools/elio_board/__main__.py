"""Command-line packaging for completed Elio Board applications."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .authoring import build_app


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='Build a portable completed Elio Board app')
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('build', help='Build the sample app or supplied canonical documents')
    build.add_argument('--input', action='append', type=Path, default=[], help='Canonical JSON input; repeat for multiple works')
    build.add_argument('--output', required=True, type=Path, help='New output folder')
    build.add_argument('--asset-root', type=Path, help='Root folder for authored local images')
    build.add_argument('--runtime-root', type=Path, help='Previously built complete app to reuse without a source checkout')
    args = parser.parse_args(argv)
    try:
        documents = [json.loads(path.read_text(encoding='utf-8-sig')) for path in args.input] if args.input else None
        manifest = build_app(args.output, documents, asset_root=args.asset_root, runtime_root=args.runtime_root)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'Elio Board build failed: {error}\n')
    print(json.dumps({'output': str(args.output.resolve()), 'mode': manifest['mode'],
                      'files': len(manifest['files']), 'documents': len(manifest['documents'])}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
