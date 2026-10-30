"""Adapt a documented story board to the existing Elio reader.

The board stays the canonical event/condition/provenance input. Each authored
chapter or route is a normal Elio page; the original reader owns its layout,
scene navigation, spoiler controls and story-tree behavior.
"""
from __future__ import annotations

import copy
import hashlib
import html
import json
import re
from urllib.parse import urlsplit


STABLE_ID = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*')
PREFIX = 'elio-original/'
EDITORIAL_ICON = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
    '<title>Elio 편집 수록본</title><path fill="none" stroke="#6e747c" stroke-width="1.8" '
    'd="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>'
).encode('utf-8')
READER_PRESENTATION = '''/* Board-reader composition only; the original reader owns navigation and scene DOM. */
.board-story-reader .reader-library-nav { margin-bottom:1.5rem; }
.board-story-reader .story-detail .item--text-only > .visual--text-only {
  display:flex; flex-direction:row; justify-content:flex-start; gap:.75rem;
  width:100%!important; height:auto!important; min-height:0; aspect-ratio:auto;
  margin:0!important; padding:0 0 1rem; border:0; border-bottom:1px solid #dce4e9;
  border-radius:0; background:none; box-shadow:none;
}
.board-story-reader .story-detail .visual--text-only::after { display:none; }
.board-story-reader .story-detail .visual--text-only svg { width:1.5rem; height:1.5rem; flex-shrink:0; filter:none; }
.board-story-reader .story-detail .visual--text-only strong { font-size:.75rem; }
.board-story-reader .story-detail .visual--text-only span { font-size:.7rem; }
.board-story-reader .reader-context { font-size:.8125rem; line-height:1.7; }
.board-story-reader .reader-context summary { min-height:2rem; cursor:pointer; }
.board-story-reader .reader-context ul { padding-inline-start:1.2rem; }
.board-story-reader .reader-context li + li { margin-top:1rem; }
.board-story-reader .reader-context a { color:#276c87; text-underline-offset:.15em; }
'''.encode('utf-8')


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def reader_views(board: dict) -> list[dict]:
    """Use logical authored views, never arbitrary slices of the whole graph."""
    views = board.get('views') or [{
        'id': chapter['id'], 'chapter_id': chapter['id'], 'title': chapter['title'],
        'event_ids': [event['id'] for event in board['events'] if event['chapter_id'] == chapter['id']],
    } for chapter in board['chapters']]
    result = [view for view in views if 0 < len(view['event_ids']) <= 40]
    covered = {ident for view in result for ident in view['event_ids']}
    missing = {event['id'] for event in board['events']} - covered
    if missing:
        raise ValueError('Author chapter/route views of at most 40 scenes for: ' + ', '.join(sorted(missing)))
    for view in result:
        if not STABLE_ID.fullmatch(view['id']):
            raise ValueError('Reader view needs a stable id')
    return result


def board_from_story(story: dict, source: dict) -> dict:
    """Adapt explicit preview data; sample-specific facts belong to its caller."""
    topology = copy.deepcopy(story.get('story_topology'))
    if topology is None:
        topology = {
            'schema_version': 'elio.story-topology.v2', 'title': story['title'],
            'summary': '입력의 장면 순서입니다. 별도의 인과·선택·시간 관계는 제공되지 않았습니다.',
            'nodes': [{'event_id': event['id'], 'track_id': 'reading-order', 'track_label': '입력 순서',
                       'condition': '', 'lane_index': 0, 'lane_count': 1, 'lead': 0, 'time': None}
                      for event in story['events']],
            'edges': [], 'alignments': [],
        }
    for node in topology['nodes']:
        node.setdefault('time', None)
    people = list(dict.fromkeys(node['track_id'] for node in topology['nodes']))
    track_names = {node['track_id']: node['track_label'] for node in topology['nodes']}
    by_event = {node['event_id']: node for node in topology['nodes']}
    colors = ('#26766e', '#74609a', '#96712e', '#427b99')
    source_id, chapter_id = source.get('id', 'primary-source'), story['unit_id']
    events = []
    for event in story['events']:
        row = copy.deepcopy(event)
        for name, value in {'chapter_id': chapter_id, 'kind': 'scene', 'spoiler': False,
                            'protagonists': [by_event[event['id']]['track_id']], 'source_ids': [source_id]}.items():
            row.setdefault(name, value)
        events.append(row)
    conditions = {}
    for edge in topology['edges']:
        target = by_event[edge['to']]
        key = f"{edge['from']}->{edge['to']}"
        conditions[key] = story.get('edge_conditions', {}).get(key, edge.get('condition') or target['condition'] or '다음 장면')
    board = {
        'schema_version': 'elio.board.v1', 'work_id': story['work_id'],
        'title': story['work_title'], 'subtitle': story['intro'],
        'material_type': story.get('material_type', source.get('material_type', 'unverified')),
        'coverage': {
            'index': story['title'], 'detail': story['intro'],
            'limits': ['입력 자료의 문장과 관계를 보존합니다. 별도 사실 확인을 수행하지 않았습니다.'],
            'spoilers': '스포일러 공개 범위는 입력 자료의 장면 설정을 따릅니다.',
        },
        'protagonists': [{'id': ident, 'name': track_names[ident], 'role': '이 이야기의 경로·시점',
                          'color': colors[index % len(colors)]} for index, ident in enumerate(people)],
        'sources': [{**copy.deepcopy(source), 'id': source_id, 'title': source.get('title', source.get('site_name', '제공 원문')),
                     'url': source.get('url', source.get('requested_url')), 'kind': source.get('kind', 'user-document'),
                     'locator': source.get('locator', story['unit_id']),
                     'note': source.get('note', '제공된 Elio 원문 입력입니다. 사실 확인 상태는 원문 메타데이터를 따릅니다.')}],
        'chapters': [{'id': chapter_id, 'title': story['unit_label'], 'order': 1,
                      'summary': story['intro'], 'availability': story['unit_label'],
                      'coverage': 'partial', 'source_ids': [source_id], 'protagonists': people}],
        'events': events, 'story_topology': topology, 'edge_conditions': conditions,
        'views': [{'id': chapter_id, 'chapter_id': chapter_id, 'title': story['unit_label'],
                   'protagonists': people, 'event_ids': [event['id'] for event in events]}],
        'provenance': {'events': {}, 'edges': {}}, 'annotations': {},
    }
    for name in ('coverage', 'material_type', 'protagonists', 'sources', 'chapters', 'views',
                 'choice_groups', 'provenance', 'annotations', 'reading_state', 'board_presentation'):
        if name in story:
            board[name] = copy.deepcopy(story[name])
    from tools.elio_preview.components.reader_board import add_perspective_views
    return add_perspective_views(board, story)


def reader_inputs(board: dict, view: dict) -> tuple[dict, dict, dict]:
    """Return canonical preview input, an explicitly editorial source, and trace."""
    if board.get('schema_version') != 'elio.board.v1' or not STABLE_ID.fullmatch(board.get('work_id', '')):
        raise ValueError('Expected a board with a stable work id')
    ids = view['event_ids']
    if not 1 <= len(ids) <= 40 or len(set(ids)) != len(ids):
        raise ValueError('The original reader accepts 1 to 40 unique scenes per authored view')
    selected = set(ids)
    by_id = {event['id']: event for event in board['events']}
    sources = {row['id']: row for row in board['sources']}
    nodes = {node['event_id']: node for node in board['story_topology']['nodes']}
    summaries = [by_id[ident]['summary'].replace('\n', ' ') for ident in ids]
    content = '\n'.join(f'{ident}: {summary}' for ident, summary in zip(ids, summaries)) + '\n'
    digest = hashlib.sha256(content.encode('utf-8')).hexdigest()
    notice = ('기존 Elio의 창작 문장과 일러스트를 보존한 예시입니다. 실제 작품이나 게임 기록이 아닙니다.'
              if board.get('material_type') == 'authored_design_fiction' else
              '이 수록본은 사건별 근거를 연결한 편집 요약입니다. 전사 원문이나 게임 대사의 직접 인용이 아닙니다.')
    external = next((row['url'] for row in board['sources'] if row.get('url')), None)
    if external is None:
        raise ValueError('The original Elio reader needs an HTTPS primary source URL; URL-free documents remain supported by the board. Do not invent a source URL.')
    source = {
        'schema_version': 'elio.source_content.v1', 'retrieval_status': 'section_body_verified',
        'material_type': board.get('material_type', 'source_grounded_editorial_summary'),
        'content_text': content, 'content_hash': digest, 'requested_url': external,
        'site_name': 'Elio 편집 수록본', 'content_notice': notice,
    }
    events = []
    text_only = {}
    for number, ident in enumerate(ids, 1):
        original, node = by_id[ident], nodes[ident]
        chapter = next(row for row in board['chapters'] if row['id'] == original['chapter_id'])
        event = {'id': ident, 'title': original['title'], 'summary': original['summary'],
                 'location': chapter['title'] + ' · ' + node['track_label'],
                 'source_lines': [number, number], 'source_quote': None, 'vod_links': []}
        for name in ('image_site_asset', 'image_alt', 'image_caption', 'image_url', 'image_source_url'):
            if original.get(name):
                event[name] = original[name]
        if not event.get('image_site_asset') and not event.get('image_url'):
            text_only[ident] = '사건의 문장·조건·근거로 읽는 장면'
        events.append(event)
    topology = copy.deepcopy(board['story_topology'])
    topology.pop('diagram_layout', None)  # Editor offsets do not become reader-time or reading-layout facts.
    topology['nodes'] = [copy.deepcopy(nodes[ident]) for ident in ids]
    topology['edges'] = [edge for edge in topology['edges'] if edge['from'] in selected and edge['to'] in selected]
    topology['alignments'] = [group for group in topology['alignments'] if all(ident in selected for ident in group['event_ids'])]
    chapter = next((row for row in board['chapters'] if row['id'] == view.get('chapter_id')), None)
    story = {
        'schema_version': 'elio.preview.v1', 'work_id': board['work_id'], 'unit_id': view['id'],
        'work_title': board['title'], 'title': view['title'], 'unit_label': view['title'],
        'intro': (chapter['summary'] if chapter else board['subtitle']) + ' ' + notice,
        'tags': ['선택과조건', '이야기갈래', '원문근거'], 'source_hash': digest,
        'events': events, 'story_topology': topology,
        'reader_presentation': {
            'main_view': {'eyebrow': '장면·조건·갈래', 'title': '이야기 따라 읽기'},
            'perspective_views': {}, 'transitions': [], 'scene_links': [], 'quote_labels': {},
            'preserve_line_breaks': [], 'text_only_scenes': text_only,
        },
    }
    incident = [edge for edge in board['story_topology']['edges'] if edge['from'] in selected or edge['to'] in selected]
    trace = {
        'work_id': board['work_id'], 'view_id': view['id'], 'canonical_event_ids': ids,
        'edge_conditions': {f"{edge['from']}->{edge['to']}": board['edge_conditions'][f"{edge['from']}->{edge['to']}"] for edge in incident},
        'edge_provenance': {f"{edge['from']}->{edge['to']}": copy.deepcopy(board.get('provenance', {}).get('edges', {}).get(f"{edge['from']}->{edge['to']}", [])) for edge in incident},
        'provenance': {ident: copy.deepcopy(board.get('provenance', {}).get('events', {}).get(ident, [])) for ident in ids},
        'source_ids': {ident: by_id[ident]['source_ids'] for ident in ids},
        'observations': {ident: copy.deepcopy(by_id[ident].get('observations', [])) for ident in ids},
        'source_catalog': sources,
        'layout_policy': 'Original reader automatic layout; the source board retains its separate edited geometry.',
        'source_notice': notice,
    }
    return story, source, trace


def _event_context(board: dict, view: dict, event: dict, event_pages: dict[str, str]) -> str:
    from tools.elio_preview.__main__ import safe_url

    esc, ident = html.escape, event['id']
    status_labels = {'document-supported': '제공 문서 근거', 'source-checked': '원문 대조',
                     'unverified': '미확인', 'conflicting': '출처 충돌'}
    refs = board.get('provenance', {}).get('events', {}).get(ident, [])
    sources = {row['id']: row for row in board['sources']}
    rows = []
    for ref in refs:
        source = sources[ref['source_id']]
        label = esc(source['title'])
        if source.get('url'):
            label = f'<a href="{safe_url(source["url"])}" target="_blank" rel="noopener noreferrer">{label}</a>'
        rows.append(f'<li>{label}<p>{esc(ref["locator"])} · {esc(status_labels.get(ref["status"], ref["status"]))}<br>{esc(ref.get("note", ""))}</p></li>')
    links = []
    by_id = {row['id']: row for row in board['events']}
    for edge in board['story_topology']['edges']:
        if edge['from'] != ident and edge['to'] != ident:
            continue
        outgoing = edge['from'] == ident
        target = edge['to'] if outgoing else edge['from']
        local_scene = target in view['event_ids']
        destination = ('#' + target) if local_scene else event_pages[target] + '#' + target
        scene_hook = ' class="reader-guide__scene" data-main-scene="true"' if local_scene else ''
        condition = board['edge_conditions'][f"{edge['from']}->{edge['to']}"]
        direction = '이어지는 장면' if outgoing else '앞에서 남은 조건'
        evidence = []
        for ref in board.get('provenance', {}).get('edges', {}).get(f"{edge['from']}->{edge['to']}", []):
            source = sources[ref['source_id']]
            label = esc(source['title'])
            if source.get('url'):
                label = f'<a href="{safe_url(source["url"])}" target="_blank" rel="noopener noreferrer">{label}</a>'
            evidence.append(f'<p>{label} · {esc(status_labels.get(ref["status"], ref["status"]))}<br>{esc(ref["locator"])}<br>{esc(ref.get("note", ""))}</p>')
        links.append(f'<li><a href="{esc(destination, quote=True)}"{scene_hook}>{direction} · {esc(by_id[target]["title"])}</a><p>{esc(condition)}</p>{"".join(evidence)}</li>')
    original = next(row for row in board['events'] if row['id'] == ident)
    observations = ''.join(f'<li>{esc(note)}</li>' for note in original.get('observations', []))
    observation_body = f'<p><strong>장면의 선택·관찰</strong></p><ul>{observations}</ul>' if observations else ''
    return ('<details class="event-source reader-context"><summary>이 장면의 조건·갈래·원문 근거</summary>'
            f'{observation_body}<ul>{"".join(links)}</ul><ul>{"".join(rows)}</ul></details>')


def _reader_navigation(board: dict, view: dict, views: list[dict]) -> str:
    esc, work_id = html.escape, board['work_id']
    links = [f'<a href="{work_id}-index.html"><small>이야기 목록</small><strong>{esc(board["title"])} · 챕터 고르기</strong></a>']
    links.append(f'<a href="../fieldguide/elio-board.html?work={work_id}&amp;view={view["id"]}"><small>같은 사건의 제작자 도구</small><strong>이 보기의 배치 편집</strong></a>')
    links.append(f'<a href="{board_link(board, view, view["event_ids"][0])}"><small>같은 자료의 탐색 화면</small><strong>Elio Board로 보기</strong></a>')
    return ('<nav class="story-view-switch reader-library-nav" aria-label="작품·챕터 읽기">'
            f'<div class="story-view-switch__heading"><span>이야기 탐색</span><strong>{esc(view["title"])}</strong></div>'
            '<div class="story-view-switch__options">' + ''.join(links) + '</div></nav>')


def board_link(board: dict, view: dict, node_id: str) -> str:
    """Keep story, logical view and exact event identity across the two readers."""
    from urllib.parse import urlencode
    query = urlencode({'document': f'../elio-original/data/{board["work_id"]}-board.json', 'view': view['id']})
    state = urlencode({'work': board['work_id'], 'mode': 'hud', 'node': node_id, 'scope': 'focus'})
    return html.escape('../elio-board/index.html?' + query + '#' + state, quote=True)


def reader_index(board: dict, views: list[dict]) -> bytes:
    esc, work_id = html.escape, board['work_id']
    groups = []
    for chapter in board['chapters']:
        options = [view for view in views if view.get('chapter_id') == chapter['id']]
        if not options:
            continue
        cards = ''.join(f'<li><a href="{work_id}-{view["id"]}.html">{esc(view["title"])}<span>{len(view["event_ids"])}장면 · 읽기 →</span></a></li>' for view in options)
        groups.append(f'<section class="reader-chapter"><p>{chapter["order"]:02}</p><div><h2>{esc(chapter["title"])}</h2><p>{esc(chapter["summary"])}</p><ul>{cards}</ul></div></section>')
    page = ('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta name="robots" content="noindex,nofollow">'
            f'<title>{esc(board["title"])} · Elio 이야기 읽기</title><link rel="stylesheet" href="local-font.css">'
            '<link rel="stylesheet" href="../fieldguide/base.css"><link rel="stylesheet" href="../fieldguide/elio.css">'
            '<style>.reader-library{max-width:1080px;margin:auto;padding:3rem 6vw 7rem}.reader-library>header{padding:3rem 0 4rem;border-bottom:1px solid var(--elio-rule)}'
            '.reader-library h1{font-size:clamp(2.4rem,5vw,4.6rem);margin:1rem 0;max-width:18ch}.reader-library p{line-height:1.85;max-width:72ch;color:var(--elio-muted)}'
            '.reader-library nav{display:flex;gap:1.5rem;flex-wrap:wrap;margin:1.5rem 0}.reader-chapter{display:grid;grid-template-columns:3rem 1fr;gap:1.2rem;padding:2rem 0;border-bottom:1px solid var(--elio-rule)}'
            '.reader-chapter>p{color:var(--elio-teal);font-weight:800}.reader-chapter h2{font-size:1.45rem;margin:0 0 .7rem}.reader-chapter ul{list-style:none;padding:0;margin:1rem 0 0;display:grid;gap:.65rem}'
            '.reader-chapter li a{display:flex;justify-content:space-between;gap:1rem;background:white;padding:1rem 1.2rem;border:1px solid var(--elio-rule);border-radius:12px;text-decoration:none;font-weight:700}'
            '.reader-chapter li span{font-size:.8rem;font-weight:500;color:var(--elio-teal);white-space:nowrap}@media(max-width:560px){.reader-library{padding-inline:1.25rem}.reader-chapter{grid-template-columns:2rem 1fr;gap:.6rem}.reader-chapter li a{display:block}.reader-chapter li span{display:block;margin-top:.5rem}}</style></head>'
            '<body class="cva-page elio-page"><main class="reader-library"><a href="../fieldguide/elio.html">← Elio 이야기 고르기</a><header>'
            f'<p class="elio-eyebrow">ELIO · STORY READER</p><h1>{esc(board["title"])}</h1><p>{esc(board["subtitle"])}</p>'
            f'<p>{esc(board["coverage"]["detail"])}</p><nav><a class="elio-primary" href="{work_id}-{views[0]["id"]}.html">처음부터 읽기 →</a>'
            f'<a href="../fieldguide/elio-board.html?work={work_id}">같은 이야기의 배치 편집</a></nav>'
            f'<details><summary>수록 범위와 확인한 자료</summary><p>{esc(board["coverage"]["index"])}</p><ul>'
            + ''.join(f'<li>{esc(note)}</li>' for note in board['coverage']['limits']) + '</ul></details></header>'
            + ''.join(groups) + '</main></body></html>')
    return page.encode('utf-8')


def render_reader_view(board: dict, view: dict, views: list[dict], event_pages: dict[str, str], render, relocate):
    story, source, trace = reader_inputs(board, view)
    page = render(story, source, publication_status='manager_review')
    if page.count('<div class="story-tree"') != 1 or page.count('<body id="top">') != 1:
        raise ValueError('Original reader overview boundary changed')
    page = page.replace('<div class="story-tree"', '<div class="story-tree" data-default-view="photos"', 1)
    page = page.replace('<body id="top">', '<body id="top" class="board-story-reader">', 1)
    page = page.replace('</head>', '<link rel="stylesheet" href="assets/board-reader.css"></head>', 1)
    navigation = _reader_navigation(board, view, views)
    page = page.replace('<header class="hero">', navigation + '<header class="hero">', 1)
    for event in story['events']:
        marker = f'<span class="keywords">{html.escape(event["location"])}</span>'
        start = page.index(f'<article id="{event["id"]}" class="item ')
        end = page.index('</article>', start)
        scene = page[start:end]
        if scene.count(marker) != 1:
            raise ValueError('Original reader scene boundary changed')
        scene = scene.replace(marker, marker + '<p class="reader-context"><a href="' + board_link(board, view, event['id']) + '">이 장면을 Elio Board에서 보기 ↗</a></p>' + _event_context(board, view, event, event_pages), 1)
        page = page[:start] + scene + page[end:]
    page = page.replace('<p class="sources">', '<p class="sources">' + html.escape(source['content_notice']) + ' ', 1)
    page, _ = relocate(page, board['work_id'], fictional=board.get('material_type') == 'authored_design_fiction')
    if source['material_type'] != 'authored_design_fiction':
        icon = f'https://{urlsplit(source["requested_url"]).hostname}/favicon.ico'
        page = page.replace(f'src="{html.escape(icon, quote=True)}"', 'src="assets/editorial-source.svg"')
    return page, story, source, trace


def build_board_readers(board: dict, render, relocate, style: str, script: str) -> tuple[dict[str, bytes], dict]:
    views = reader_views(board)
    work_id = board['work_id']
    event_pages = {}
    for view in views:
        for ident in view['event_ids']:
            event_pages.setdefault(ident, f'{work_id}-{view["id"]}.html')
    board_document = copy.deepcopy(board)
    for event in board_document['events']:
        if event['id'] in event_pages:
            event['reader_url'] = f'../elio-original/{event_pages[event["id"]]}#{event["id"]}'
    bundle = {
        PREFIX + f'data/{work_id}-board.json': json_bytes(board_document),
        PREFIX + 'assets/reader-original.css': style.encode('utf-8'),
        PREFIX + 'assets/reader-original.js': script.encode('utf-8'),
        PREFIX + 'assets/editorial-source.svg': EDITORIAL_ICON,
        PREFIX + 'assets/board-reader.css': READER_PRESENTATION,
    }
    traces, reader_paths, asset_map = [], {}, {}
    for view in views:
        page, story, source, trace = render_reader_view(board, view, views, event_pages, render, relocate)
        # Keep one identical canonical runtime for this generated reader family.
        # The existing standalone examples remain fully inline and independent.
        for original, asset in (
            ('<style>' + style + '</style>', '<link rel="stylesheet" href="assets/reader-original.css">'),
            ('<script>' + script + '</script>', '<script src="assets/reader-original.js"></script>'),
        ):
            if page.count(original) != 1:
                raise ValueError('Original Elio runtime boundary changed')
            page = page.replace(original, asset, 1)
        filename = f'{work_id}-{view["id"]}.html'
        bundle[PREFIX + filename] = page.encode('utf-8')
        bundle[PREFIX + f'data/{work_id}-{view["id"]}.story.json'] = json_bytes(story)
        bundle[PREFIX + f'data/{work_id}-{view["id"]}.source.json'] = json_bytes(source)
        reader_paths[view['id']] = filename
        trace.update(path=filename, editorial_source_hash=source['content_hash'])
        traces.append(trace)
        if source['material_type'] != 'authored_design_fiction':
            asset_map[f'https://{urlsplit(source["requested_url"]).hostname}/favicon.ico'] = 'assets/editorial-source.svg'
    index = work_id + '-index.html'
    bundle[PREFIX + index] = reader_index(board, views)
    for view in board.get('views', []):
        reader_paths.setdefault(view['id'], index)
    manifest = {'schema': 'elio.board-reader-trace.v1', 'work_id': work_id,
                'renderer': 'tools.elio_preview.__main__.render', 'published': False,
                'canonical_event_pages': event_pages, 'reader_views': traces,
                'shared_runtime': {'css': 'assets/reader-original.css', 'js': 'assets/reader-original.js',
                                   'css_sha256': hashlib.sha256(style.encode('utf-8')).hexdigest(),
                                   'js_sha256': hashlib.sha256(script.encode('utf-8')).hexdigest()},
                'canonical_event_count': len(board['events']), 'reader_event_count': len(event_pages)}
    bundle[PREFIX + f'data/{work_id}-reader-trace.json'] = json_bytes(manifest)
    if asset_map:
        bundle[PREFIX + f'{work_id}-editorial-assets.json'] = json_bytes(asset_map)
    return bundle, {'id': work_id, 'title': board['title'], 'description': board['subtitle'],
                    'reader_index': '../' + index, 'readers': {ident: '../' + path for ident, path in reader_paths.items()}}
