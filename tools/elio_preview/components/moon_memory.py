"""Compose Edge Dream's reviewed film and 3D package around its exact reader.

The supplied distribution is pinned by content hash and kept in managed runtime
data. No story field can supply executable code, asset paths, or camera data.
"""
from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath, PureWindowsPath

from .memory_tape import _DocumentSpans, _version_asset_references

UNIT = 'wutheringwaves/ch3-side-story-edge-dream'
PACKAGE = Path(__file__).parents[1] / 'experiments/moon_memory'
PREFIX = 'ELIO_MOON_'
BLOCKS = ('HEAD', 'LAUNCHER', 'ENTRY', 'SHELL')
BODY_START = '<!--ELIO_MOON_READER_BEGIN--><div id="elio-moon-reader">'
BODY_END = '</div><!--ELIO_MOON_READER_END-->'
DERIVED_NAMES = ('reach-first.webp', 'grasp-first.webp', 'merge-first.webp', 'imprint-first.webp',
                 'ending-first.webp', 'cut-reach.mp4', 'cut-grasp.mp4', 'cut-merge.mp4',
                 'cut-imprint.mp4', 'ending.mp4', 'embrace-eyelids-fixed-ffd.glb.gz')


def _block(name, body):
    return f'<!--{PREFIX}{name}_BEGIN-->{body}<!--{PREFIX}{name}_END-->'


def unwrap_moon_presentation(page):
    if PREFIX not in page:
        return page
    for name in BLOCKS:
        first, last = f'<!--{PREFIX}{name}_BEGIN-->', f'<!--{PREFIX}{name}_END-->'
        if page.count(first) != 1 or page.count(last) != 1 or page.index(first) >= page.index(last):
            raise ValueError('Invalid Moon presentation markers')
        start, end = page.index(first), page.index(last) + len(last)
        page = page[:start] + page[end:]
    if page.count(BODY_START) != 1 or page.count(BODY_END) != 1:
        raise ValueError('Invalid Moon reader markers')
    page = page.replace(BODY_START, '', 1).replace(BODY_END, '', 1)
    if PREFIX in page:
        raise ValueError('Incomplete Moon presentation')
    return page


class _MoonSpans(_DocumentSpans):
    def __init__(self, page):
        self.guide_at = self.tools_at = None
        super().__init__(page)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        classes = dict(attrs).get('class', '').split()
        if tag == 'section' and 'reader-guides' in classes and self.guide_at is None:
            self.guide_at = self.position()
        if tag == 'div' and 'hero-tools' in classes and self.tools_at is None:
            self.tools_at = self.position() + len(self.get_starttag_text())


def _renderer_runtime(app):
    """Keep the pinned Three/GLTF renderer before the original UI starts."""
    boundary = '};var ue=s=>document.getElementById(s),'
    license_marker = '/*! Bundled license information:'
    if app.count(boundary) != 1 or app.count(license_marker) != 1:
        raise ValueError('Supplied Moon renderer differs from the reviewed package')
    end = app.index(boundary) + 2  # Include the renderer class's closing `};`.
    if not 0 <= app.find('var Oa=class') < end < app.index(license_marker):
        raise ValueError('Supplied Moon renderer boundary is invalid')
    license_tail = app[app.index(license_marker):]
    license_end = license_tail.find('*/')
    if license_end < 0:
        raise ValueError('Supplied Moon renderer license is incomplete')
    return (app[:end] + '\n'
            'export {Oa as MoonScene,I as Vector3,dd as nativeCamera,fd as viewBounds};\n'
            + license_tail[:license_end + 2] + '\n').encode('utf-8')


def _derived_assets(runtime_root):
    """Bind the reviewed playback media and fixed model to managed authoring data."""
    manifest = json.loads((PACKAGE / 'derived-assets-manifest.json').read_text(encoding='utf-8'))
    original = (Path(runtime_root) / 'data/storytimeline' / UNIT / 'authoring'
                / '20261027-cinematic-repair/derived-assets').resolve()
    if set(manifest['files']) != set(DERIVED_NAMES):
        raise ValueError('Moon derived assets differ from the reviewed allowlist')
    assets = {}
    for name in DERIVED_NAMES:
        row = manifest['files'][name]
        relative = row.get('relative_path', name)
        if (not isinstance(relative, str) or not relative or '\\' in relative
                or PureWindowsPath(relative).drive or PurePosixPath(relative).is_absolute()
                or '..' in PurePosixPath(relative).parts):
            raise ValueError('Moon derived asset escapes its authoring directory')
        path = (original / relative).resolve()
        if not path.is_relative_to(original):
            raise ValueError('Moon derived asset escapes its authoring directory')
        raw = path.read_bytes()
        if len(raw) != row['bytes'] or hashlib.sha256(raw).hexdigest() != row['sha256']:
            raise ValueError('Moon derived asset differs from its reviewed source')
        assets['assets/' + name] = raw
    return assets


def _scene_assets(runtime_root):
    if runtime_root is None:
        raise ValueError('Moon presentation requires the managed runtime root')
    manifest = json.loads((PACKAGE / 'package-manifest.json').read_text(encoding='utf-8'))
    original = Path(runtime_root).resolve() / 'data/storytimeline' / UNIT / 'assets/moon-memory-original'
    reviewed = {}
    # Verify the whole supplied distribution, including UI files we do not serve.
    for name, row in manifest['files'].items():
        path = (original / name).resolve()
        if not path.is_relative_to(original.resolve()):
            raise ValueError('Moon package asset escapes its unit')
        raw = path.read_bytes()
        if len(raw) != row['bytes'] or hashlib.sha256(raw).hexdigest() != row['sha256']:
            raise ValueError('Moon package differs from its reviewed source')
        reviewed[name] = raw
    assets = {name: raw for name, raw in reviewed.items()
              if name.startswith('assets/') or name == 'THREE_LICENSE.txt'}
    assets['scene-runtime.js'] = _renderer_runtime(gzip.decompress(reviewed['app.js.gz']).decode('utf-8'))
    scene = json.loads(assets['assets/scene.json'])
    # The original review model is an external authoring route, not a dependency.
    scene['character'].pop('nativeReview', None)
    scene['character']['url'] = 'assets/embrace-eyelids-fixed-ffd.glb.gz'
    assets['assets/scene.json'] = json.dumps(scene, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    assets.update(_derived_assets(runtime_root))
    for name in ('scene.js', 'camera.js', 'motion.js', 'scene.css', 'film-player.js',
                 'host.js', 'host.css', 'startup.js', 'startup.css'):
        assets[name] = (PACKAGE / name).read_bytes()
    assets['index.html'] = (PACKAGE / 'scene.html').read_bytes()
    return _version_asset_references(assets)


def _wrap_moon_reader(page, blocks):
    spans = _MoonSpans(page)
    if None in (spans.insert_at, spans.body_at, spans.body_end, spans.guide_at, spans.tools_at):
        raise ValueError('Moon presentation requires a complete reader and story notes')
    changes = [(spans.insert_at, _block('HEAD', blocks['HEAD'])),
               (spans.body_at, BODY_START + _block('ENTRY', blocks['ENTRY'])),
               (spans.guide_at, _block('LAUNCHER', blocks['LAUNCHER'])),
               (spans.body_end, BODY_END + _block('SHELL', blocks['SHELL']))]
    result = page
    for at, value in sorted(changes, reverse=True):
        result = result[:at] + value + result[at:]
    if unwrap_moon_presentation(result) != page:
        raise ValueError('Moon presentation altered the reader')
    return result


def restore_moon_presentation(page, original):
    """Retain a verified shell around transformed reader text, without drafts."""
    if PREFIX not in original:
        return page
    unwrap_moon_presentation(original)  # Validate the complete source-owned envelope.
    blocks = {}
    for name in BLOCKS:
        first, last = f'<!--{PREFIX}{name}_BEGIN-->', f'<!--{PREFIX}{name}_END-->'
        blocks[name] = original[original.index(first) + len(first):original.index(last)]
    return _wrap_moon_reader(unwrap_moon_presentation(page), blocks)


def compose_unit_moon(page, story, *, public=True, runtime_root=None):
    if f'{story.get("work_id")}/{story.get("unit_id")}' != UNIT:
        return page, {}
    original = unwrap_moon_presentation(page)
    assets = _scene_assets(runtime_root)
    digest = lambda name: hashlib.sha256(assets[name]).hexdigest()[:12]
    base = f'/storytimeline/{UNIT}/assets/moon-memory/'
    scene_url = f'{base}{"" if public else "index.html"}?v={digest("index.html")}'
    startup_css = (PACKAGE / 'startup.css').read_text(encoding='utf-8')
    startup_js = (PACKAGE / 'startup.js').read_text(encoding='utf-8')
    head = (f'<style id="elio-moon-startup-style">{startup_css}</style>'
            f'<script id="elio-moon-startup">{startup_js}</script>'
            f'<link rel="stylesheet" href="{base}host.css?v={digest("host.css")}">')
    entry = ('<div class="elio-moon-return"><button type="button" id="elio-moon-reopen" '
             'class="elio-moon-entry" data-moon-open><span aria-hidden="true">↶</span> '
             '달의 기억 다시 보기</button></div>')
    shell = f'''<dialog id="elio-moon" hidden aria-label="엣지 드림 · 달의 기억" data-scene-url="{scene_url}">
      <button id="elio-moon-close" type="button" aria-label="연출을 건너뛰고 이야기 읽기">이야기 바로 읽기 ×</button>
      <p id="elio-moon-status" role="status">달의 기억을 준비하고 있어요.</p>
      <iframe id="elio-moon-scene" title="엣지 드림 · 달에서의 작별" data-src="{scene_url}"></iframe>
      </dialog><script type="module" data-moon-controller="true" src="{base}host.js?v={digest('host.js')}"></script>'''
    # Retain the reversible legacy marker without a second reader entry.
    result = _wrap_moon_reader(original, {'HEAD': head, 'ENTRY': entry, 'LAUNCHER': '', 'SHELL': shell})
    return result, {'assets/moon-memory/'+name: raw for name, raw in assets.items()}
