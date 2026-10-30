"""Render the original Elio templates with explicit fictional authoring inputs.

This module only returns deterministic files. The public package's existing
writer owns creating them and checking them; importing this module writes nothing.
"""
from __future__ import annotations

from copy import deepcopy
import html
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.render_story import render_page
from tools.elio_preview.__main__ import term_fragment
from tools.elio_preview.examples.reusable_demo import build_demo
from tools.elio_preview.examples.branching_demo import build_demo as branching_demo
from tools.elio_preview.components.reader_experience import loading_markup


def _json(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def _guides(story: dict) -> None:
    """Exercise all six real information contracts, without generic-card substitutes."""
    story['reader_guides'] += [
        dict(id='overview', kind='conclusion', title='만남을 지키는 여행',
             summary='보호자가 지킨 마을과 여행자의 구조는 서로 다른 시간에서 같은 만남을 가능하게 한다.',
             after_event_id=None, source_ids=['primary'], items=[]),
        dict(id='people', kind='relationships', title='서로를 돕는 두 사람',
             summary='행동과 도움의 방향을 구분해 읽는다.', after_event_id=None,
             source_ids=['primary'], items=[
                 dict(subject='보호자', relation='여행을 도움', object='여행자',
                      summary='첫 만남에서 낯선 문턱을 건너도록 돕는다.', related_event_id='arrival'),
                 dict(subject='여행자', relation='어린 시절에 구조', object='어린 보호자',
                      summary='나중에 문턱을 넘어 호수의 구조자가 된다.', related_event_id='rescue'),
             ]),
        dict(id='comparison', kind='contrast', title='처음 읽은 만남과 다시 읽은 만남',
             summary='독자에게 알려진 사실의 범위가 달라지는 두 관점을 나란히 둔다.',
             after_event_id=None, source_ids=['primary'], items=[
                 dict(label='처음 읽을 때', title='도움을 받는 여행자',
                      summary='보호자는 여행자가 문턱을 넘도록 돕는다.', related_event_id='arrival'),
                 dict(label='끝까지 읽은 뒤', title='서로의 만남을 지키는 두 사람',
                      summary='여행자의 구조도 앞선 만남을 성립시킨다.', related_event_id='rescue'),
             ]),
        dict(id='questions', kind='questions', title='시간의 여행에서 남는 질문',
             summary='확인한 사건과 해석의 경계를 질문으로 남긴다.', after_event_id=None,
             source_ids=['primary'], items=[
                 dict(label='장면의 순서', title='나중에 읽는 사건이 먼저 일어났나요?',
                      summary='공개 순서와 작품 속 시각은 다르다. 이 예제의 구조는 어린 시절로 향하는 여행을 명시한다.',
                      related_event_id='rescue'),
                 dict(label='남는 해석', title='편지가 곧 새로운 만남을 뜻하나요?',
                      summary='편지는 다시 만날 길을 찾게 하지만, 이 예제는 그 뒤의 만남을 확정하지 않는다.',
                      related_event_id='promise'),
             ]),
    ]


def _presentation(story: dict) -> dict:
    return dict(
        main_view=dict(eyebrow='본편 · 공개 순서', title='먼저 보여 준 장면을 따라 읽기'),
        perspective_views=dict(times=dict(
            eyebrow='인물의 경험', item_label='경험한 장면', legend=dict(
                title='선을 읽는 기준', summary='읽는 순서와 시간 이동, 세계의 인과를 구분한다.',
                entries=[dict(relation='sequence', label='이야기에서 이어 읽는 순서'),
                         dict(relation='influence', label='확인한 사건의 영향'),
                         dict(relation='transfer', label='다른 시점으로 전한 것')],
                route='각자의 경험을 따라가고, 같은 장면에서 본편으로 돌아온다.'))),
        transitions=[dict(event_id='rescue', kind='time-return', title='어린 시절로 돌아가는 장면',
                          summary='공개 순서는 앞으로 이어지지만 작품 속 시간은 앞선 호수로 이동한다.')],
        scene_links=[dict(event_id='rescue', guide_id='times', item_id='lake',
                         label='같은 구조 장면을 두 사람의 시간선에서 읽기', spoiler_label='결말까지의 연결 포함')],
        quote_labels={}, preserve_line_breaks=['promise'])


def examples() -> list[dict]:
    story, source, connections = build_demo()
    connections['pending_replays'] = []
    complete = deepcopy(story)
    _guides(complete)
    complete['term_links'] = [dict(term='문턱', url=term_fragment('문턱'))]
    complete['glossary_terms'] = [dict(term='문턱', context='이 창작 이야기에서 서로 다른 시간이 만나는 공간이다.',
                                       reveal_after_event_id='threshold')]
    complete['reader_presentation'] = _presentation(complete)
    complete['phases'] = [dict(id='meeting', label='1부 · 만남과 문턱', summary='처음 읽는 만남을 기록한다.'),
                          dict(id='returning', label='2부 · 귀환과 약속', summary='앞선 장면을 다시 읽게 하는 연결이다.')]
    for index, event in enumerate(complete['events']):
        event['phase_id'] = 'meeting' if index < 3 else 'returning'
    linear = deepcopy(complete)
    linear.pop('story_topology')
    life = deepcopy(complete)
    life['reader_guides'][0].pop('time_map')
    text_only = deepcopy(complete)
    text_only['reader_presentation']['text_only_scenes'] = {'memory':'호수에서 구조된 어린 시절의 기록'}
    for event in text_only['events']:
        if event['id'] == 'memory':
            for key in ('image_site_asset', 'image_alt', 'image_caption'):
                event.pop(key, None)
    branched, branch_source = branching_demo()
    for event in branched['events']:
        event['image_site_asset'] = event['image_site_asset'].replace('/assets/elio-examples/multiverse-scenes.svg',
                                                                    '/storytimeline/templates/assets/scenes.svg')
    return [
        dict(id='complete', title='원본 구성요소 전체 보기', story=complete, source=source, connections=connections),
        dict(id='linear', title='선형 장면과 원형 사진', story=linear, source=source, connections=connections),
        dict(id='life', title='인물의 삶과 확인 수준', story=life, source=source, connections=connections),
        dict(id='text-only', title='이미지 없는 장면', story=text_only, source=source, connections=connections),
        dict(id='branches', title='분기·합류·동시 사건·다른 결말', story=branched, source=branch_source, connections=None),
    ]


def catalog() -> list[dict]:
    def row(ident, title, target, source, fields, note=''):
        return dict(id=ident, title=title, href=target, source=source, inputs=fields, note=note,
                    status='rendered_original' if target else 'source_only')
    rows = [
        row('linear', '선형 장면·원형 사진·교차 본문', 'linear.html?view=cards', '__main__.py + template.html + style.css', ['events']),
        row('cards', '장면 카드로 읽기', 'complete.html?view=cards', 'components/story_tree_reader.js', ['events', 'story_topology']),
        row('photos', '사진 흐름·장면 상세·초점 복귀', 'complete.html?view=photos', 'components/story_tree_reader.js', ['events', 'story_topology']),
        row('branches', '중첩 분기·합류·독립 결말', 'branches.html?view=photos', 'components/story_layout.py/js', ['story_topology.nodes', 'edges', 'alignments']),
        row('return', '앞 장면·같은 노드로 돌아오는 관계', 'complete.html?view=photos#rescue', 'components/story_layout.py/js', ['story_topology.edges[].relation']),
        row('time-map', '행·열 시간선·사진 노드·관계별 연결선', 'complete.html?story=perspective-times#perspective-times-map', 'components/time_map.py/css/js + diagram_geometry.js', ['reader_guides[].time_map']),
        row('shared-space', '여러 시간이 만나는 공유 공간', 'complete.html?story=perspective-times#perspective-times-map', 'components/time_map.py/css/js', ['time_map.shared_space', 'time_map.nodes[].lane_span']),
        row('perspective', '인물의 삶·확인된 사실과 해석', 'life.html?story=perspective-times', 'components/perspective_timeline.py', ['reader_guides[].kind=perspective', 'items[].evidence_state']),
        row('phases', '부·장 단위 구분과 장면 지도', 'complete.html#story', 'components/scene_navigation.py + scene_minimap.py/js', ['phases', 'events[].phase_id']),
        row('glossary', '용어·본문 연결·다시 읽기', 'complete.html#story-glossary-title', '__main__.py + components/glossary_navigation.js', ['term_links', 'glossary_terms']),
        row('presentation', '읽기 표제·전환·관련 관점으로 이동', 'complete.html#rescue', 'components/reader_presentation.py', ['reader_presentation']),
        row('text-only', '이미지 없는 장면의 원래 읽기', 'text-only.html#memory', '__main__.py + components/story_tree_reader.js', ['reader_presentation.text_only_scenes']),
        row('highlight-draft', '하이라이트 편집 초안', 'complete.html#moment-promise-highlight', '__main__.py + connections.py', ['connections.moments'], '실제 방송이나 재생 시각을 만들지 않는 미확인 창작 입력이다.'),
        row('replay', '원본 영상·같이보기·시점·후기', '', 'connections.py + __main__.py + app.js', ['connections.streams', 'links', 'moments'], '소스는 동봉한다. 실제 동일 장면의 영상·검증 시각 없이 재생 가능한 예제를 만들지 않는다.'),
        row('watch-gallery', '장면 썸네일·방송 하이라이트 갤러리', '', '__main__.py + connections.py', ['moments[].placement=watch_gallery'], '소스는 동봉한다. 검증된 방송·썸네일 입력이 필요한 원래 계약이다.'),
        row('streamer-review', '방송 감상 후기', '', '__main__.py + connections.py', ['moments[].placement=streamer_review'], '소스는 동봉한다. 실제 방송 후기를 작성한 것처럼 표시하지 않는다.'),
        row('share', '공유·현재 장면 주소', 'complete.html', 'components/reader_share.py/js/css', ['work_id', 'unit_id', 'publication_status'], '로컬 미리보기에서는 원래 계약대로 공개 공유 버튼이 비활성이다. 원격 short-link 개설은 포함하지 않는다.'),
        row('board', 'Elio Board 진입·관점·장면 도감', '../../board/index.html', 'components/reader_board.py/js/css + tools/elio_board/', ['elio.board.v1', 'elio.catalog.v1', 'story/source']),
    ]
    for ident, title in [('overview','핵심 흐름'), ('people','인물·세력 관계'), ('comparison','두 관점'),
                         ('questions','질문과 답'), ('letter','이야기를 더 깊게 읽기 · 단서와 근거')]:
        rows.append(row('guide-'+ident, title, 'complete.html#guide-'+ident, 'components/reader_guides.py/html/css/js', ['reader_guides']))
    for ident, title, source, fields in [
        ('loading-none','준비 문구만','components/reader_experience.py',['experience.loading=none']),
        ('loading-cassette','카세트 릴 로딩','components/reader_experience.py + memory_tape.py',['experience.loading=cassette_reels']),
        ('loading-orbit','신호 공전 로딩','components/reader_experience.py + memory_tape.py',['experience.loading=signal_orbit']),
        ('memory-tape','기억 테이프 · 3D 첫 진입·링크 연출','components/memory_tape.py + experiments/memory_tape/',['experience.entry/link=memory_tape']),
        ('moon-memory','달의 기억 · 영상·3D 첫 진입','components/moon_memory.py + experiments/moon_memory/',['experience.entry=moon_memory']),
        ('link-none','바로 새 탭에서 열기','components/reader_experience.py',['experience.link=none']),
        ('link-standard','기본 영상 이동','components/reader_experience.py + components/link_effects.js',['experience.link=standard']),
    ]:
        rows.append(row(ident, title, '', source, fields,
                        '연출 registry 항목이다. 공개 패키지의 실제 source closure·범용 창작 입력 이식은 별도 확인이 필요하다.'))
    for entry in rows:
        if entry['id'] in {'memory-tape','moon-memory'}:
            unit='ch3-act5' if entry['id']=='memory-tape' else 'ch3-side-story-edge-dream'
            entry['href']='../../storytimeline/wutheringwaves/'+unit+'/index.html'
            entry['status']='retained_original_example'
            entry['note']=('명조 3장 5막 「어젯밤의 뭇별들」' if entry['id']=='memory-tape' else '명조 3장 「엣지 드림」')+'의 기존 완성본입니다. 본문·영상·3D·카메라·다시보기·본문 복귀를 그대로 사용합니다.'
        elif entry['id'].startswith('loading-'):
            entry['href']='loading.html#'+entry['id']
            entry['status']='rendered_original'
            entry['note']='원래 loading_markup의 벡터·문구를 보여 주는 템플릿입니다. 다운로드 진행률을 가정하지 않습니다.'
        elif entry['id'] in {'link-none','link-standard'}:
            entry['href']='complete.html'
            entry['note']='원래 링크 정책 소스와 선택 입력을 동봉합니다. 실제 영상 연결에는 확인한 원본 URL·시각이 필요합니다.'
    return rows


def outputs() -> dict[str, bytes]:
    files = {}
    for case in examples():
        base = 'examples/templates/' + case['id']
        files[base + '.story.json'] = _json(case['story'])
        files[base + '.source.json'] = _json(case['source'])
        if case['connections'] is not None:
            files[base + '.connections.json'] = _json(case['connections'])
        page = render_page(case['story'], case['source'], case['connections'], ROOT / (base+'.html'))
        files[base+'.html'] = page.encode('utf-8')
    loaders=''.join('<section id="loading-'+name+'"><h2>'+html.escape(label)+'</h2>'+loading_markup(module)+'</section>'
                    for name,label,module in [('none','준비 문구만','none'),('cassette','카세트 릴','cassette_reels'),('orbit','신호 공전','signal_orbit')])
    files['examples/templates/loading.html']=('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elio 원본 준비 연출</title><link rel="stylesheet" href="../../assets/font.css"><style>body{margin:0;background:#141d2b;color:#f5ecda;font:16px/1.8 Pretendard,system-ui}main{max-width:900px;margin:auto;padding:40px 24px}section{margin:28px 0;padding:24px;border:1px solid #435363;border-radius:20px}svg{display:block;width:180px;max-width:100%;fill:none;stroke:#f4be70;stroke-width:2}a{color:#7fd2df}</style></head><body><main><a href="index.html">Elio 원본 템플릿</a><h1>원본 준비 연출</h1><p>원래 벡터 모듈입니다. 실제 준비·실패·본문 복귀는 시네마틱 템플릿에서 확인할 수 있습니다.</p>'+loaders+'</main></body></html>').encode('utf-8')
    rows = catalog()
    files['examples/templates/catalog.json'] = _json(rows)
    cards = []
    for row in rows:
        title = html.escape(row['title'])
        action = ('<a href="'+html.escape(row['href'],quote=True)+'">원본 예제 열기 →</a>' if row['href'] else
                  '<span>원래 입력·실행 조건 확인 필요</span>')
        cards.append('<article id="'+row['id']+'"><h2>'+title+'</h2>'+action+
                     ('<p>'+html.escape(row['note'])+'</p>' if row['note'] else '')+'</article>')
    files['examples/templates/index.html'] = (
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Elio 원본 템플릿 전체 목록</title><link rel="stylesheet" href="../../assets/font.css">'
        '<style>body{margin:0;background:#f4f6f7;color:#23272d;font:16px/1.8 Pretendard,system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:48px 24px}h1{font-size:clamp(30px,5vw,54px)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:20px}article{padding:24px;background:white;border:1px solid #d5dfe5;border-radius:24px}h2{font-size:21px}a{color:#16869a}p{color:#596573}a:focus-visible{outline:3px solid #16869a;outline-offset:5px}</style></head><body><main>'
        '<a href="../../index.html">Elio 처음으로</a><h1>Elio 원본 템플릿</h1>'
        '<p>원본 Story renderer의 공통 창작 예제와, 기존 명조 3장 5막·엣지 드림의 완성본을 함께 제공합니다. 기억 테이프와 달의 기억은 기존 내용과 연출을 그대로 사용합니다.</p>'
        '<p><a href="complete.story.json" download>전체 예제 이야기 JSON</a> · <a href="complete.source.json" download>창작 원문 JSON</a> · <a href="../../docs/ELIO_TEMPLATE_COVERAGE.md">전체 소스·입력·지원 범위</a></p>'
        '<div class="grid">'+''.join(cards)+'</div><footer><a href="https://ttaem.com">ttaem.com · Elio</a></footer></main></body></html>'
    ).encode('utf-8')
    return files


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list', action='store_true')
    args = parser.parse_args()
    result = outputs()
    if args.list:
        print(json.dumps(sorted(result)))
    else:
        print('ORIGINAL_ELIO_GALLERY_RENDERED', len(result))
