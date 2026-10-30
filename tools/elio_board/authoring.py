"""Build the completed Elio Board app around its existing canonical documents."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
from urllib.parse import unquote, urlsplit

from tools.cva_design_system.elio_readers import board_from_story


APP = Path(__file__).resolve().parent / 'app'
REPO = Path(__file__).resolve().parents[2]
RUNTIME_FILES = (
    'index.html', 'styles.css', 'hud-panels.css', 'board-refinement.css',
    'depth-hover.css', 'content-picker.css', 'authoring.css',
    'app.js', 'projection.js', 'depth-hover.js', 'content-picker.js',
    'document-adapter.js', 'authoring-ui.js', 'vendor/board-model.js',
    'vendor/components.js', 'vendor/diagram_geometry.js', 'vendor/story_layout.js',
    'depth-card.css', 'depth-card.js',
    'assets/pretendard.woff2', 'assets/PRETENDARD-LICENSE.md',
)
SAMPLE_FILES = (
    'data.js', 'product-data.js', 'product-flow.js', 'product-flow.css',
    'product-screen.js', 'product-screen.css',
    'assets/village-scene.png', 'assets/crown-scene.png', 'assets/city-scene.png',
    'assets/beacon-scene.png', 'assets/catalog-observation-notebook.png', 'assets/catalog-moonleaf.png',
    'vendor/timerlink/journeys/journey-preview.mjs', 'vendor/timerlink/journeys/journey-screen-bindings.mjs',
    'vendor/timerlink/screen-extras.mjs', 'vendor/timerlink/PROVENANCE.md',
    'vendor/timerlink/source-manifest.json', 'vendor/timerlink/screen-source-manifest.json',
)
LICENSE_FILES = ()
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'}
CARD_NOTICE = '''Elio Board CVA depth cards

The delivered depth-card.js and depth-card.css use CVA-authored native DOM,
CSS perspective and Pointer Events. They do not contain Aceternity source,
its compiled bundle, React or another component-library runtime.
Saved document schemas, board layout and connection ports remain unchanged.
Pointer effects are optional; every card remains an ordinary keyboard button.
The source project's license and the separate Pretendard font notice apply.
'''


def _json(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def _digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _document(value: dict) -> dict:
    if isinstance(value, dict) and isinstance(value.get('story'), dict):
        story, source = value['story'], value.get('source')
    elif isinstance(value, dict) and value.get('schema_version') == 'elio.preview.v1':
        story, source = value, value.get('source')
    else:
        story = source = None
    if story is not None:
        if not isinstance(source, dict):
            raise ValueError('elio.preview.v1 requires its source receipt')
        from tools.elio_preview.__main__ import validate
        validate(story, source)
        return board_from_story(story, source)
    return copy.deepcopy(value)


def _consumer_documents(documents: list, root: Path) -> list[dict]:
    """Use the actual delivered browser consumer, without a second schema."""
    node = shutil.which('node')
    if node is None:
        raise ValueError('Elio Board authored builds require Node.js on PATH')
    script = """
const fs = require('node:fs');
try {
  const api = require(process.argv[1]);
  const documents = JSON.parse(fs.readFileSync(0, 'utf8'));
  process.stdout.write(JSON.stringify(documents.map(document => api.normalizeDocument(document))));
} catch (error) {
  process.stderr.write(error.message);
  process.exitCode = 1;
}
"""
    result = subprocess.run([node, '-e', script, str(root / 'document-adapter.js')],
                            input=json.dumps(documents, ensure_ascii=False), text=True, encoding='utf-8',
                            capture_output=True, check=False)
    if result.returncode:
        raise ValueError(result.stderr.strip() or 'Elio Board document consumer failed')
    return json.loads(result.stdout)


def _stage_images(document: dict, asset_root: Path | None, files: dict[str, bytes], records: dict) -> None:
    """Copy explicitly provided local images; never change the original document/files."""
    if asset_root is None:
        return
    root = asset_root.resolve()

    def image_url(value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme in {'https', 'http', 'data'}:
            return value
        if parsed.scheme or parsed.netloc or parsed.query:
            raise ValueError('Local images must resolve inside the provided asset root')
        relative = Path(unquote(parsed.path).replace('\\', '/').lstrip('/'))
        source = (root / relative).resolve()
        if not source.is_relative_to(root) or source.suffix.lower() not in IMAGE_SUFFIXES:
            raise ValueError('Local images must resolve inside the provided asset root')
        raw = source.read_bytes()
        target = f'assets/authored/{_digest(raw)}{source.suffix.lower()}'
        files[target] = raw
        records[target] = {'source': relative.as_posix(), 'source_sha256': _digest(raw), 'delivered_sha256': _digest(raw)}
        return target + ('#' + parsed.fragment if parsed.fragment else '')

    background = document.get('board_presentation', {}).get('background', {})
    if background.get('image'):
        background['image'] = image_url(background['image'])
    for row in document.get('events', document.get('items', [])):
        for field in ('image_site_asset', 'image_url'):
            if isinstance(row.get(field), str) and row[field]:
                row[field] = image_url(row[field])
        image = row.get('image')
        if isinstance(image, str) and image:
            row['image'] = image_url(image)
        elif isinstance(image, dict) and isinstance(image.get('src'), str) and image['src']:
            image['src'] = image_url(image['src'])


def _completed_runtime(root: Path) -> dict:
    manifest = json.loads((root / 'build-manifest.json').read_bytes())
    if manifest.get('schema_version') != 'elio.board-build.v1' or not isinstance(manifest.get('files'), dict):
        raise ValueError('Expected a completed Elio Board runtime manifest')
    return manifest


def _runtime_file(root: Path, manifest: dict, name: str) -> bytes:
    path = PurePosixPath(name)
    if path.is_absolute() or '\\' in name or ':' in name or any(part in {'', '.', '..'} for part in name.split('/')):
        raise ValueError('Completed runtime contains an unsafe asset path')
    source = (root / name).resolve()
    if not source.is_relative_to(root.resolve()):
        raise ValueError('Completed runtime asset escapes its root')
    raw = source.read_bytes()
    if _digest(raw) != manifest['files'].get(name):
        raise ValueError(f'Completed runtime hash mismatch: {name}')
    return raw


def versioned_index(files: dict[str, bytes]) -> bytes:
    """Address local scripts/styles by their delivered bytes, including site overrides."""
    def version(match):
        attribute, value = match.groups()
        url = urlsplit(value)
        if url.scheme or url.netloc or url.path not in files or not url.path.endswith(('.js', '.css')):
            return match.group(0)
        suffix = '#' + url.fragment if url.fragment else ''
        return f'{attribute}="{url.path}?v={_digest(files[url.path])[:16]}{suffix}"'
    return re.sub(r'\b(src|href)="([^"<>]+)"', version, files['index.html'].decode('utf-8')).encode('utf-8')


def application_files(documents=None, *, asset_root=None, runtime_root=None) -> dict[str, bytes]:
    """Return only the completed app bytes for a site builder or portable package.

    ``None`` packages the default sample library and its same-app product
    fixtures. Authored documents replace that library and retain their canonical
    shapes; browser projection belongs to document-adapter.js.
    """
    runtime = Path(runtime_root).resolve() if runtime_root is not None else None
    runtime_manifest = _completed_runtime(runtime) if runtime is not None else None
    if documents is None:
        raise ValueError('Public Board requires explicit authored input')
    authored = True
    normalized = [_document(value) for value in documents] if authored else []
    if authored and not normalized:
        raise ValueError('Provide at least one authored document, or omit documents for the default app')
    files, records = {}, {}
    for name in RUNTIME_FILES + (() if authored else SAMPLE_FILES):
        raw = _runtime_file(runtime, runtime_manifest, name) if runtime is not None else (APP / name).read_bytes()
        delivered = re.sub(rb'(?m)^//# sourceMappingURL=[^\r\n]*(?:\r?\n)?', b'', raw) if name.endswith('.js') else raw
        files[name] = delivered
        records[name] = {'source': f'completed-runtime/{name}' if runtime is not None else f'tools/elio_board/app/{name}', 'source_sha256': _digest(raw),
                         'delivered_sha256': _digest(delivered)}
    if authored:
        # The adapter and its board/geometry/layout dependencies above have all
        # passed the completed-runtime manifest check before Node loads them.
        normalized = _consumer_documents(normalized, runtime if runtime is not None else APP)
        if len({document['work_id'] for document in normalized}) != len(normalized):
            raise ValueError('Input work_id values must be unique')
    if not authored:
        name = 'assets/multiverse-scenes.svg'
        raw = (_runtime_file(runtime, runtime_manifest, name) if runtime is not None
               else (REPO / 'tools/elio_preview/examples/assets/multiverse-scenes.svg').read_bytes())
        files[name] = raw
        records[name] = {'source': f'completed-runtime/{name}' if runtime is not None else 'tools/elio_preview/examples/assets/multiverse-scenes.svg',
                         'source_sha256': _digest(raw), 'delivered_sha256': _digest(raw)}
    files['notices/CVA-DEPTH-CARDS.txt'] = CARD_NOTICE.encode('utf-8')
    page = files['index.html'].decode('utf-8')
    # A completed app is a supported input to the same builder, including an
    # authored app. Replace its data/notice insertion rather than nesting it.
    page = re.sub(r'<script id="elio-board-notices">.*?</script>', '', page, flags=re.DOTALL)
    page = re.sub(r'<script\b[^>]*\bsrc="documents\.js(?:\?[^"<>]*)?"[^>]*></script>', '', page)
    notices = {'cva_depth_cards': CARD_NOTICE,
               'pretendard': files['assets/PRETENDARD-LICENSE.md'].decode('utf-8')}
    notice_literal = json.dumps(notices, ensure_ascii=False).replace('<', '\\u003c')
    page = page.replace('</head>', '<script id="elio-board-notices">window.ELIO_BOARD_NOTICES=' + notice_literal + ';</script></head>', 1)
    if authored:
        for name in ('data.js', 'product-data.js', 'product-flow.js', 'product-screen.js'):
            page = re.sub(r'<script\b[^>]*\bsrc="' + re.escape(name) + r'(?:\?[^"<>]*)?"[^>]*></script>', '', page)
        for name in ('product-flow.css', 'product-screen.css'):
            page = re.sub(r'<link\b[^>]*\bhref="' + re.escape(name) + r'(?:\?[^"<>]*)?"[^>]*>', '', page)
        for document in normalized:
            _stage_images(document, Path(asset_root) if asset_root is not None else None, files, records)
            files[f'documents/{document["work_id"]}.json'] = _json(document)
        literal = json.dumps(normalized, ensure_ascii=False).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
        files['documents.js'] = ('window.ELIO_BOARD_DOCUMENTS = ' + literal + ';\n').encode('utf-8')
        marker = re.search(r'<script\b[^>]*\bsrc="document-adapter\.js(?:\?[^"<>]*)?"[^>]*>', page)
        if marker is None:
            raise ValueError('The complete app index must load document-adapter.js')
        page = page[:marker.start()] + '<script defer src="documents.js"></script>' + page[marker.start():]
    files['index.html'] = page.encode('utf-8')
    files['index.html'] = versioned_index(files)
    records['index.html']['delivered_sha256'] = _digest(files['index.html'])
    fixtures = None
    if not authored:
        if runtime is None:
            from .fixtures import fixture_files
            files.update(fixture_files())
        else:
            files.update({name: _runtime_file(runtime, runtime_manifest, name)
                          for name in runtime_manifest['files'] if name.startswith('fixtures/timerlink/')})
        fixtures = {'manifest': 'fixtures/timerlink/manifest.json',
                    'files': len([name for name in files if name.startswith('fixtures/timerlink/')])}
    manifest = {
        'schema_version': 'elio.board-build.v1', 'mode': 'authored' if authored else 'default-samples',
        'documents': [{'work_id': value['work_id'], 'schema_version': value['schema_version'],
                       'path': f'documents/{value["work_id"]}.json'} for value in normalized],
        'assets': records, 'files': {name: _digest(raw) for name, raw in sorted(files.items())},
        'fixtures': fixtures,
    }
    files['build-manifest.json'] = _json(manifest)
    return files


def build_app(output, documents=None, *, asset_root=None, runtime_root=None) -> dict:
    """Write a new completed-app folder and return its recorded build manifest."""
    destination = Path(output)
    if destination.exists():
        raise FileExistsError(f'Output folder already exists: {destination}')
    files = application_files(documents, asset_root=asset_root, runtime_root=runtime_root)
    destination.mkdir(parents=True, exist_ok=False)
    for name, raw in files.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
    return json.loads(files['build-manifest.json'])
