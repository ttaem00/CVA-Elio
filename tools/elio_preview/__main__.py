"""Build an offline review candidate from source-backed editorial JSON."""
import argparse
import base64
import hashlib
import html
import ipaddress
import json
import re
from pathlib import Path

from . import ELIO_SYSTEM_VERSION
from .components.scene_shell import render_scene_shell
from urllib.parse import urlsplit

from .components.raster_validation import verify_raster, FORMATS
from tools.elio_preview.components import bundled_scripts, bundled_styles
from tools.elio_preview.components.reader_share import render_reader_share
from tools.elio_preview.components.time_map import validate_time_map
from tools.elio_preview.components.scene_navigation import render_scene_navigation
from tools.elio_preview.components.reader_guides import (
    SUPPORTED_GUIDE_KINDS,
    render_reader_guides,
)
from tools.elio_preview.components.perspective_timeline import (
    render_perspective_story_views,
)
from tools.elio_preview.components.reader_presentation import (
    render_scene_link,
    render_transition,
    validate_reader_presentation,
)
from tools.elio_preview.components.story_topology import (
    render_story_topology,
    topology_event_badges,
    validate_story_topology,
)
from tools.elio_preview.components.story_layout import (
    SCHEMA_VERSION as LAYOUT_SCHEMA_VERSION, render_story_layout, validate_story_layout,
)
from tools.elio_preview.connections import (
    format_clock,
    replay_policy,
    safe_rendered_connection_url,
    safe_rendered_profile_image,
    validate_connections,
    validate_moments,
    validate_official_videos,
    validate_pending_replays,
)
from tools.elio_preview.story_quality import (
    is_semantic_story_contract,
    validate_semantic_story,
)
from tools.elio_preview.story_contract import validate_event_count


ACCENTS = ('#52bdd8', '#a9cc38', '#ee6e99', '#e5c41c', '#f29a22', '#886fd6', '#3fa3d3', '#2db49d')
MOMENT_LABELS = {
    'cutscene': '핵심 컷신',
    'streamer_reaction': '같이보기 하이라이트',
    'watch_highlight': '하이라이트',
}
MOMENT_ACTION_LABEL = '같이보기'
RENDERER_VERSION = 'v2'
INLINE_LINK_RE = re.compile(r'\[\[([^\[\]|]{1,80})\|(https://[^\]\s]+)\]\]')
NAMU_FOOTNOTE_RE = re.compile(r'\[(?:\d+(?:\.\d+)*)\]')
TERM_FRAGMENT_RE = re.compile(r'#term-[a-f0-9]{16}')
WORK_GLOSSARY_RELATION_LABELS = {
    'alias': '다른 표기',
    'instance': '이 막의 사례',
    'title': '칭호',
    'former_name': '이전 이름',
    'related': '관련 용어',
}


def safe_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Source links must be HTTPS without credentials')
    hostname = parsed.hostname.lower()
    if hostname == 'localhost' or hostname.endswith('.localhost'):
        raise ValueError('Public source links cannot use a local host')
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        if not address.is_global:
            raise ValueError('Public source links cannot use a private or local address')
    return html.escape(value, quote=True)


def safe_site_asset(value):
    """Return a safe root-relative static-site asset URL."""
    parsed = urlsplit(value)
    if (not value.startswith('/') or value.startswith('//') or parsed.scheme or
            parsed.netloc or '..' in parsed.path.split('/')):
        raise ValueError('Site assets must use a root-relative path')
    return html.escape(value, quote=True)


def term_fragment(term):
    """Return a stable local glossary target without exposing term text in ids."""
    digest = hashlib.sha256(str(term).strip().encode()).hexdigest()[:16]
    return f'#term-{digest}'


def safe_term_href(value):
    if isinstance(value, str) and TERM_FRAGMENT_RE.fullmatch(value):
        return value
    return safe_url(value)


def validate_term_links(data):
    """Validate the optional work-level glossary used to link scene terminology."""
    rows = data.get('term_links', [])
    if not isinstance(rows, list) or len(rows) > 80:
        raise ValueError('term_links must be a list with at most 80 entries')
    normalized = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Each term link must be an object')
        term = row.get('term')
        url = row.get('url')
        if (not isinstance(term, str) or not term.strip() or len(term.strip()) > 80 or
                any(char in term for char in '[]|\r\n')):
            raise ValueError('Term-link labels must be short plain text')
        term = term.strip()
        if term in seen:
            raise ValueError('Duplicate term-link label')
        if not isinstance(url, str):
            raise ValueError('Term-link URLs must be strings')
        safe_term_href(url)
        seen.add(term)
        normalized.append((term, url))
    return sorted(normalized, key=lambda row: -len(row[0]))


def validate_work_glossary(rows):
    """Validate optional work-wide meaning while preserving the v1 baseline."""
    validate_term_links({'term_links': rows})
    allowed = {'term', 'url', 'definition', 'aliases', 'relations', 'role'}
    for row in rows:
        if set(row) - allowed:
            raise ValueError('Unexpected work-glossary fields')
        definition = row.get('definition')
        if definition is not None and (
                not isinstance(definition, str) or not definition.strip()
                or len(definition.strip()) > 500):
            raise ValueError('Work-glossary definitions must be concise text')
        aliases = row.get('aliases', [])
        if not isinstance(aliases, list) or len(aliases) > 8 or any(
                not isinstance(alias, str) or not alias.strip() or len(alias) > 80
                for alias in aliases):
            raise ValueError('Work-glossary aliases are invalid')
        relations = row.get('relations', [])
        if not isinstance(relations, list) or len(relations) > 8:
            raise ValueError('Work-glossary relations are invalid')
        for relation in relations:
            if (not isinstance(relation, dict)
                    or set(relation) != {'type', 'label'}
                    or relation.get('type') not in WORK_GLOSSARY_RELATION_LABELS
                    or not isinstance(relation.get('label'), str)
                    or not relation['label'].strip()
                    or len(relation['label'].strip()) > 80):
                raise ValueError('Work-glossary relation is invalid')


def project_story_glossary(data, work_glossary=None):
    """Enrich accepted unit copy without another research or LLM pass."""
    work_glossary = work_glossary or []
    validate_work_glossary(work_glossary)
    common = {
        str(row.get('term') or '').strip(): row
        for row in work_glossary if isinstance(row, dict)
    }
    projected = []
    for source_row in data.get('glossary_terms', []):
        if not isinstance(source_row, dict):
            continue
        row = dict(source_row)
        shared = common.get(str(row.get('term') or '').strip(), {})
        unit_context = str(row.get('context') or '').strip()
        definition = str(shared.get('definition') or unit_context).strip()
        relations = [dict(value) for value in shared.get('relations', [])]
        related_labels = {value['label'] for value in relations}
        for alias in row.get('aliases', []):
            label = str(alias or '').strip()
            if label and label not in related_labels:
                relations.append({'type': 'alias', 'label': label})
        row['definition'] = definition
        row['unit_context'] = (
            unit_context if definition and unit_context != definition else ''
        )
        row['relations'] = relations
        projected.append(row)
    return projected


def _render_glossary_links(text, term_links):
    if not text or not term_links:
        return html.escape(text)
    url_by_term = dict(term_links)
    pattern = re.compile('|'.join(re.escape(term) for term, _url in term_links))
    parts = []
    cursor = 0
    for match in pattern.finditer(text):
        parts.append(html.escape(text[cursor:match.start()]))
        term = match.group(0)
        href = url_by_term[term]
        if TERM_FRAGMENT_RE.fullmatch(href):
            attributes = (
                f'href="{href}" aria-label="{html.escape(term, quote=True)} '
                '현재 이야기 기준 용어 설명으로 이동"'
            )
        else:
            attributes = (
                f'href="{safe_url(href)}" target="_blank" rel="noopener noreferrer" '
                f'aria-label="{html.escape(term, quote=True)} 외부 용어 설명 보기"'
            )
        parts.append(
            f'<a class="term-link" {attributes}>{html.escape(term)}</a>'
        )
        cursor = match.end()
    parts.append(html.escape(text[cursor:]))
    return ''.join(parts)


def render_inline_links(value, term_links=None):
    """Render references and glossary links; ▶ YouTube labels opt into play pills."""
    text = str(value or '')
    term_links = term_links or []
    parts = []
    cursor = 0
    for match in INLINE_LINK_RE.finditer(text):
        parts.append(_render_glossary_links(text[cursor:match.start()], term_links))
        label, url = match.groups()
        play_link = label.startswith('▶') and urlsplit(url).hostname in {
            'www.youtube.com', 'youtube.com', 'youtu.be',
        }
        link_class = 'watch-stream__summary' if play_link else 'term-link'
        action = 'YouTube에서 재생' if play_link else '설명 보기'
        parts.append(
            f'<a class="{link_class}" href="{safe_url(url)}" target="_blank" '
            f'rel="noopener noreferrer" aria-label="{html.escape(label, quote=True)} {action}">'
            f'{html.escape(label)}</a>'
        )
        cursor = match.end()
    parts.append(_render_glossary_links(text[cursor:], term_links))
    return ''.join(parts)


def source_presentation(source_row, asset_urls=None):
    """Keep a scene's source brand and link bound to its own acquired document."""
    url = safe_url(source_row['requested_url'])
    host = (urlsplit(source_row['requested_url']).hostname or '').lower()
    is_namu = host == 'namu.wiki' or host.endswith('.namu.wiki')
    configured_label = source_row.get('site_name')
    label = (
        configured_label.strip()
        if isinstance(configured_label, str) and configured_label.strip()
        else ('나무위키' if is_namu else host)
    )
    return url, html.escape(label)


def display_source_quote(value, source_row):
    """Normalize display-only decorations without changing stored source evidence."""
    text = str(value or '')
    source_url = str(source_row.get('final_url') or source_row.get('requested_url') or '')
    hostname = (urlsplit(source_url).hostname or '').lower()
    if hostname == 'namu.wiki' or hostname.endswith('.namu.wiki'):
        text = NAMU_FOOTNOTE_RE.sub('', text)

    # The renderer owns the visible quotation marks. Some accepted source rows
    # already include one complete outer pair, which would otherwise render as
    # “"quote"”. Strip only a matching whole-string wrapper so inner dialogue
    # marks and provenance-canonical stored text remain intact.
    wrapped_text = text.strip()
    for opening, closing in (("\"", "\""), ('“', '”')):
        if (len(wrapped_text) >= 2 and wrapped_text.startswith(opening)
                and wrapped_text.endswith(closing)):
            return wrapped_text[len(opening):-len(closing)].strip()
    return text


def render_story_glossary(data, term_links, work_glossary=None):
    """Render reusable work meaning and unit-specific context separately."""
    local_targets = {url for _term, url in term_links if TERM_FRAGMENT_RE.fullmatch(url)}
    if not local_targets:
        return ''
    cards = []
    events = data.get('events', [])
    fallback_event = events[-1]['id'] if events else ''
    for row in project_story_glossary(data, work_glossary):
        term = str(row.get('term') or '').strip()
        target = term_fragment(term)
        if not term or target not in local_targets:
            continue
        context = str(row.get('unit_context') or '').strip()
        context_html = (
            '<div class="story-glossary__scope"><span>이번 막에서</span>'
            f'<p>{html.escape(context)}</p></div>' if context else ''
        )
        relation_html = ''.join(
            '<p class="story-glossary__relation">'
            f'<span>{WORK_GLOSSARY_RELATION_LABELS[relation["type"]]}</span>'
            f'<strong>{html.escape(relation["label"])}</strong></p>'
            for relation in row.get('relations', [])
        )
        cards.append(
            f'<article id="{target[1:]}" class="story-glossary__term" tabindex="-1" '
            f'data-reveal-after-event="{html.escape(row.get("reveal_after_event_id", fallback_event), quote=True)}">'
            '<div class="story-glossary__content" tabindex="-1">'
            f'<h3>{html.escape(term)}</h3>'
            f'<p class="story-glossary__definition">{html.escape(row["definition"])}</p>'
            f'{context_html}{relation_html}</div>'
            '<button class="spoiler-cover" type="button" aria-label="숨겨진 용어 설명 펼치기" hidden>'
            '<span><small>이야기 속 용어</small><strong>설명 펼치기</strong></span></button>'
            '<a class="story-glossary__back" href="#story">이야기 처음으로 ↑</a>'
            '</article>'
        )
    if not cards:
        return ''
    return (
        '<section class="story-glossary" aria-labelledby="story-glossary-title">'
        '<header><span>이야기 용어</span><h2 id="story-glossary-title">기본 뜻과 이번 막의 역할</h2>'
        '<p>이야기에 나온 이름과 물건을 짧게 짚어봅니다.</p>'
        f'</header><div class="story-glossary__grid">{"".join(cards)}</div></section>'
    )


def validate_reader_structure(data, event_ids):
    """Validate optional reusable story phases and reader-comprehension blocks."""
    phases = data.get('phases', [])
    if not isinstance(phases, list) or len(phases) > 8:
        raise ValueError('phases must be a list with at most 8 entries')
    phase_ids = set()
    for phase in phases:
        if not isinstance(phase, dict):
            raise ValueError('Each phase must be an object')
        phase_id = phase.get('id')
        label = phase.get('label')
        if (not isinstance(phase_id, str) or
                not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', phase_id) or
                phase_id in phase_ids):
            raise ValueError('Phase ids must be unique stable ids')
        if not isinstance(label, str) or not label.strip() or len(label.strip()) > 80:
            raise ValueError('Phase labels must be short non-empty text')
        summary = phase.get('summary', '')
        if not isinstance(summary, str) or len(summary) > 400:
            raise ValueError('Phase summaries must be at most 400 characters')
        phase_ids.add(phase_id)
    if phase_ids:
        used_phases = []
        for event in data.get('events', []):
            if not isinstance(event.get('phase_id'), str) or event['phase_id'] not in phase_ids:
                raise ValueError('Every event must reference a known phase when phases are used')
            if not used_phases or used_phases[-1] != event['phase_id']:
                used_phases.append(event['phase_id'])
        if used_phases != [phase['id'] for phase in phases]:
            raise ValueError('Story phases must be used once in contiguous reading order')
        by_event = {event['id']: event['phase_id'] for event in data.get('events', [])}
        topology = data.get('story_topology') or {}
        for group in topology.get('alignments', []):
            if len({by_event.get(ident) for ident in group.get('event_ids', [])}) > 1:
                raise ValueError('Story alignment cannot cross a reading phase boundary')
    elif any(event.get('phase_id') is not None for event in data.get('events', [])):
        raise ValueError('Event phase_id requires story phases')

    glossary_terms = data.get('glossary_terms', [])
    if not isinstance(glossary_terms, list):
        raise ValueError('Semantic glossary term list is invalid')
    for term in glossary_terms:
        if not isinstance(term, dict):
            raise ValueError('Unexpected semantic glossary term fields')
        if 'reveal_after_event_id' in term:
            dependency = term['reveal_after_event_id']
            if not isinstance(dependency, str) or dependency not in event_ids:
                raise ValueError('Glossary reveal dependency references an unknown event')

    guides = data.get('reader_guides', [])
    if not isinstance(guides, list) or len(guides) > 8:
        raise ValueError('reader_guides must be a list with at most 8 entries')
    guide_ids = set()
    for guide in guides:
        if not isinstance(guide, dict):
            raise ValueError('Each reader guide must be an object')
        guide_id = guide.get('id')
        if (not isinstance(guide_id, str) or
                not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', guide_id) or
                guide_id in guide_ids):
            raise ValueError('Reader-guide ids must be unique stable ids')
        if guide.get('kind') not in SUPPORTED_GUIDE_KINDS:
            raise ValueError(
                'Reader-guide kind is not a supported information module'
            )
        for field, limit in (('title', 160), ('summary', 1200)):
            value = guide.get(field, '')
            if not isinstance(value, str) or not value.strip() or len(value) > limit:
                raise ValueError(f'Reader-guide {field} is invalid')
        after_event_id = guide.get('after_event_id')
        if after_event_id is not None and after_event_id not in event_ids:
            raise ValueError('Reader guide references an unknown event')
        items = guide.get('items', [])
        if guide.get('time_map') is not None and guide['kind'] != 'perspective':
            raise ValueError('Only perspective guides accept a time map')
        if guide['kind'] in {'relationships', 'contrast', 'questions', 'clues', 'perspective'}:
            minimum = 1 if guide['kind'] == 'relationships' else 2
            maximum = 13 if guide['kind'] == 'perspective' else (8 if guide['kind'] in {'relationships', 'clues'} else 4)
            if not isinstance(items, list) or not minimum <= len(items) <= maximum:
                raise ValueError('Reader-guide item count is outside its information contract')
            for item in items:
                if not isinstance(item, dict):
                    raise ValueError('Interpretation items must be objects')
                if 'related_event_id' in item:
                    related = item['related_event_id']
                    if not isinstance(related, str) or related not in event_ids:
                        raise ValueError('Reader-guide item references an unknown related event')
                if guide['kind'] == 'perspective' and 'image_event_id' in item:
                    image_event_id = item['image_event_id']
                    if not isinstance(image_event_id, str) or image_event_id not in event_ids:
                        raise ValueError('Perspective image references an unknown event')
                fields = (
                    (('subject', 80), ('relation', 80), ('object', 80), ('summary', 600))
                    if guide['kind'] == 'relationships'
                    else (('label', 40), ('title', 120), ('summary', 600))
                )
                for field, limit in fields:
                    value = item.get(field, '')
                    if not isinstance(value, str) or not value.strip() or len(value) > limit:
                        raise ValueError(f'Interpretation-item {field} is invalid')
                if guide['kind'] == 'clues':
                    if item.get('confidence') not in {
                        'observed', 'supported_inference', 'unverified',
                    }:
                        raise ValueError('Clue items need an explicit confidence state')
                    reference = item.get('reference')
                    if not isinstance(reference, dict) or set(reference) != {'source_id', 'label'}:
                        raise ValueError('Clue items need one acquired reference link')
                    if (
                        not isinstance(reference.get('source_id'), str)
                        or not reference['source_id'].strip()
                        or reference['source_id'] not in guide.get('source_ids', [])
                    ):
                        raise ValueError('Clue reference must use one of the guide source ids')
                    reference_label = reference.get('label')
                    if (
                        not isinstance(reference_label, str)
                        or not reference_label.strip()
                        or len(reference_label) > 80
                    ):
                        raise ValueError('Clue reference label must be short non-empty text')
                    if reference_label not in item['title'] and reference_label not in item['summary']:
                        raise ValueError('Clue reference label must appear in its title or summary')
                elif 'confidence' in item:
                    raise ValueError('Only clue items accept a confidence state')
                if guide['kind'] == 'perspective' and item.get('evidence_state') not in {
                    'confirmed', 'in_world_legend', 'corrected_record', 'interpretation',
                }:
                    raise ValueError('Perspective items need an explicit evidence state')
                if guide['kind'] == 'perspective':
                    common_image_fields = {'image_alt', 'image_caption'}
                    external_image_fields = common_image_fields | {'image_url', 'image_source_url'}
                    managed_image_fields = common_image_fields | {
                        'image_asset_path', 'image_content_hash',
                    }
                    has_external = 'image_url' in item
                    has_managed = bool({'image_asset_path', 'image_content_hash'}.intersection(item))
                    if has_external and has_managed:
                        raise ValueError('Perspective image must use one asset mode')
                    expected_image_fields = (
                        external_image_fields if has_external else managed_image_fields
                    )
                    if (has_external or has_managed) and not expected_image_fields.issubset(item):
                        raise ValueError('Perspective image metadata must be complete')
                    for field in ('image_url', 'image_source_url'):
                        if item.get(field):
                            safe_url(item[field])
                    if has_managed:
                        relative = Path(item['image_asset_path'])
                        if (relative.is_absolute() or '..' in relative.parts
                                or not relative.parts or relative.parts[0] != 'assets'):
                            raise ValueError('Perspective managed image path is invalid')
                        if not re.fullmatch(r'[a-f0-9]{64}', item['image_content_hash']):
                            raise ValueError('Perspective managed image needs a SHA-256 hash')
                    for field in ('image_alt', 'image_caption'):
                        if field in item and (
                            not isinstance(item[field], str)
                            or not item[field].strip()
                            or len(item[field]) > 240
                        ):
                            raise ValueError('Perspective external image text is invalid')
            if guide['kind'] == 'perspective' and guide.get('time_map') is not None:
                validate_time_map(guide['time_map'], {item['id'] for item in items})
            if guide['kind'] == 'perspective' and guide.get('story_topology') is not None:
                item_ids = [item.get('id') for item in items]
                if (any(not isinstance(item_id, str) for item_id in item_ids)
                        or len(set(item_ids)) != len(item_ids)):
                    raise ValueError(
                        'Perspective topology requires unique stable ids on every item'
                    )
                validate_story_layout(guide['story_topology'], item_ids)
        elif items:
            raise ValueError('Conclusion guides cannot contain comparison items')
        source_ids = guide.get('source_ids', [])
        if not isinstance(source_ids, list) or len(source_ids) > 4 or any(
                not isinstance(source_id, str) or not source_id.strip()
                for source_id in source_ids):
            raise ValueError('Reader-guide source ids must be acquired-source references')
        guide_ids.add(guide_id)
    return phases, guides


def validate_story_presentation(data):
    return validate_reader_presentation(
        data.get('reader_presentation'),
        event_ids={event['id'] for event in data['events']},
        guide_items={
            guide['id']: [item.get('id') for item in guide.get('items', []) if item.get('id')]
            for guide in data.get('reader_guides', []) if guide.get('kind') == 'perspective'
        },
    )


def validate(data, source):
    if data.get('schema_version') != 'elio.preview.v1':
        raise ValueError('Unknown editorial schema')
    if source.get('schema_version') not in {'argus.read.v1', 'elio.source_content.v1'} or source.get('retrieval_status') != 'section_body_verified':
        raise ValueError('A verified section receipt is required')
    digest = hashlib.sha256(source['content_text'].encode()).hexdigest()
    if digest != source['content_hash'] or digest != data['source_hash']:
        raise ValueError('Source hash mismatch')
    safe_url(source['requested_url'])
    for field in ('work_id', 'unit_id'):
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', data[field]):
            raise ValueError('Invalid stable work/unit id')
    events = data['events']
    validate_event_count(events, source=source,
                         work_id=data['work_id'], unit_id=data['unit_id'])
    tags = data.get('tags', [])
    if not isinstance(tags, list) or len(tags) > 8 or any(
            not isinstance(tag, str) or not tag.strip() or len(tag) > 24 or
            tag.startswith('#') or '://' in tag or any(char.isspace() for char in tag)
            for tag in tags):
        raise ValueError('Tags must be short content labels without # or URLs')
    validate_term_links(data)
    ids = set()
    lines = source['content_text'].splitlines()
    semantic_story = is_semantic_story_contract(data.get('research_contract'))
    previous_by_source = {}
    for event in events:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', event['id']) or event['id'] in ids:
            raise ValueError('Invalid or duplicate event id')
        ids.add(event['id'])
        start, end = event['source_lines']
        if semantic_story:
            source_id = str(event.get('source_id') or '')
            previous = previous_by_source.get(source_id, 0)
            if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start or start < previous:
                raise ValueError('Invalid or out-of-order semantic source span')
            previous_by_source[source_id] = start
        else:
            previous = previous_by_source.get('primary', 0)
            if not 1 <= start <= end <= len(lines) or start < previous:
                raise ValueError('Invalid or out-of-order source span')
            previous_by_source['primary'] = start
        for field in ('title', 'summary', 'location'):
            if not isinstance(event[field], str) or not event[field].strip():
                raise ValueError('Empty event text')
        for field in ('image_url', 'image_source_url'):
            if event.get(field):
                safe_url(event[field])
        if event.get('image_site_asset'):
            safe_site_asset(event['image_site_asset'])
        if event.get('vod_links'):
            raise ValueError('E2 does not accept unverified VOD links; E4 owns alignment')
    validate_reader_structure(data, ids)
    validate_story_presentation(data)
    validate_story_topology(data.get('story_topology'), ids)
    validate_semantic_story(data, source)
    for field in ('watch_url', 'summary_url'):
        if data.get(field):
            safe_url(data[field])
    return events


def render(data, source, images=None, connections=None, *, asset_urls=None,
           publication_status='manager_review', work_glossary=None):
    events = validate(data, source)
    source_order = {event['id']: number for number, event in enumerate(events, 1)}
    overlay = data.get('story_topology')
    if overlay and overlay.get('schema_version') == LAYOUT_SCHEMA_VERSION:
        by_id = {event['id']: event for event in events}
        events = [by_id[node['event_id']] for node in overlay['nodes']]
    term_links = validate_term_links(data)
    esc = html.escape
    source_url = safe_url(source['requested_url'])
    acquired_sources = {'primary': source, **{
        str(row.get('source_id')).strip(): row
        for row in source.get('research_sources', [])
        if isinstance(row, dict) and row.get('source_id')
    }}
    source_presentations = {key: source_presentation(row, asset_urls) for key, row in acquired_sources.items()}
    image_map = {}
    if images:
        manifest, root = images
        if manifest.get('schema_version') != 'argus.images.v1':
            raise ValueError('Expected Argus image evidence')
        for row in manifest['images']:
            if row['status'] != 'downloaded':
                continue
            path = Path(row['local_path']).resolve()
            if path.parent != root.resolve():
                raise ValueError('Image must be inside the supplied manifest directory')
            raw = path.read_bytes()
            meta = verify_raster(raw)
            if meta['content_hash'] != row['content_hash']:
                raise ValueError('Image hash mismatch')
            image_map[row['content_hash']] = (row, 'data:'+FORMATS[meta['format']][0]+';base64,'+base64.b64encode(raw).decode())
    connection_map = validate_connections(connections, data) if connections else {}
    moment_map = validate_moments(connections, data) if connections else {}
    pending_replays = validate_pending_replays(connections, data) if connections else []
    if publication_status == 'publishable' and pending_replays:
        raise ValueError('Pending replays cannot be rendered as publishable')
    if publication_status == 'publishable' and replay_policy(connections or {})['mode'] != 'capture_only' and any(
        'stream_id' not in row for rows in moment_map.values() for row in rows
    ):
        raise ValueError('Streamless editorial moments cannot be rendered as publishable')
    official_videos = validate_official_videos(connections, data) if connections else []

    def render_avatar(stream):
        profile = stream.get('profile_image')
        if profile:
            return (
                f'<img class="event-avatar" src="{safe_rendered_profile_image(profile)}" alt="" '
                f'loading="lazy" decoding="async" referrerpolicy="no-referrer">'
            )
        return (
            f'<span class="event-avatar event-avatar--fallback" aria-hidden="true">'
            f'{esc(stream["streamer_name"][0])}</span>'
        )

    def stream_interaction_data(stream, *, start_seconds=None, transition_text=None):
        values = (
            'data-watch-transition="true" '
            f'data-provider="{esc(stream["provider"], quote=True)}" '
            f'data-streamer="{esc(stream["streamer_name"], quote=True)}"'
        )
        if isinstance(start_seconds, (int, float)):
            values += f' data-time="{esc(format_clock(start_seconds), quote=True)}"'
        if transition_text:
            values += f' data-watch-text="{esc(transition_text, quote=True)}"'
        return values

    def provider_label(stream):
        return {'chzzk': 'CHZZK', 'youtube': 'YouTube', 'soop': 'SOOP'}[stream['provider']]

    def provider_icon(stream):
        provider = stream['provider']
        if provider == 'chzzk':
            return '<span class="watch-provider-name">CHZZK</span>'
        shape = ('<circle cx="12" cy="12" r="10"/><path class="watch-provider-icon__cutout" d="m10 8 6 4-6 4z"/>'
                 if provider == 'soop' else
            '<rect x="2" y="5" width="20" height="14" rx="4"/>'
            '<path class="watch-provider-icon__cutout" d="m10 9 6 3-6 3z"/>'
        )
        return (
            f'<svg class="watch-provider-icon watch-provider-icon--{provider}" '
            f'viewBox="0 0 24 24" aria-hidden="true" focusable="false">{shape}</svg>'
        )

    def render_action_container(entries, *, aria_label, action_label='같이보기', trigger_label=None):
        entries = sorted(entries, key=lambda row: row['stream'].get('order', 0))
        count = len(entries)
        if count == 0:
            return ''
        names = list(dict.fromkeys(entry['stream']['streamer_name'] for entry in entries))
        compact = len(names) > 2
        controls = []
        for name in names:
            rows = [entry for entry in entries if entry['stream']['streamer_name'] == name]
            stream = rows[0]['stream']
            if len(rows) == 1:
                controls.append(rows[0]['icon_html'] if compact else rows[0]['full_html'])
                continue
            if compact:
                trigger = render_avatar(stream)
                trigger_class = 'streamer-picker__trigger--compact'
            else:
                trigger = (
                    f'{render_avatar(stream)}<span class="streamer-picker__name">'
                    f'{esc(trigger_label) if trigger_label else f"{esc(name)} {esc(action_label)}"}</span><span class="streamer-picker__caret" '
                    'aria-hidden="true">⌄</span>'
                )
                trigger_class = 'streamer-picker__trigger--full'
            controls.append(
                '<details class="streamer-picker">'
                f'<summary class="{trigger_class}" aria-label="{esc(name, quote=True)} '
                f'{esc(action_label, quote=True)} 플랫폼과 시점 선택">{trigger}</summary>'
                f'<div class="streamer-picker__panel"><strong>{esc(name)} 시점 선택</strong>'
                f'<div class="streamer-picker__options">{"".join(row["compact_html"] for row in rows)}</div>'
                '</div></details>'
            )
        return (
            f'<div class="event-actions event-actions--streamers" data-count="{count}" '
            f'data-streamer-count="{len(names)}" aria-label="{esc(aria_label, quote=True)}">'
            + ''.join(controls) + '</div>'
        )

    def render_pending_actions(target_field, target_ids):
        chips = []
        for pending in pending_replays:
            if pending.get(target_field) not in target_ids:
                continue
            avatar = render_avatar(pending)
            for clock in pending['clocks']:
                chips.append(
                    '<span class="event-action event-action--vod event-action--status" '
                    f'aria-label="{esc(pending["streamer_name"], quote=True)} 다시보기 · {clock} · 영상 연결 대기">'
                    f'{avatar}<span>{esc(pending["streamer_name"])} 다시보기 · {clock}</span></span>'
                )
        return (
            '<div class="event-actions" aria-label="영상 연결을 기다리는 다시보기 시각">'
            + ''.join(chips) + '</div>' if chips else ''
        )

    def render_moment(moment_rows):
        moment = moment_rows[0]
        is_review = moment.get('placement') == 'streamer_review'
        is_gallery = moment.get('placement') == 'watch_gallery'
        moment_title = moment['title']
        if moment['kind'] == 'watch_highlight' and not is_review:
            if not (moment_title.startswith('「') and moment_title.endswith('」')):
                moment_title = f'「{moment_title}」'
        kind_label = '방송 후기' if is_review else '같이보기' if is_gallery else MOMENT_LABELS[moment['kind']]
        moment_action_label = '후기 보기' if is_review else '영상 보기' if is_gallery else MOMENT_ACTION_LABEL
        moment_transition_text = moment.get('transition_text') or (
            moment_title if moment['kind'] == 'watch_highlight' else None
        )
        action_entries = []
        bindings = [row for row in moment_rows if row.get('stream')]
        for binding in sorted(bindings, key=lambda row: row['stream']['order']):
            stream = binding['stream']
            if is_review:
                stream = {**stream, 'streamer_name': moment['reviewer_name']}
            avatar = render_avatar(stream)
            streamer_name = esc(stream['streamer_name'])
            if binding['verification'] == 'verified':
                label = esc(binding.get('label') or format_clock(binding['start_seconds']))
                attributes = (
                    f'href="{safe_rendered_connection_url(binding["watch_url"], connections)}" '
                    f'{stream_interaction_data(stream, start_seconds=binding["start_seconds"], transition_text=moment_transition_text)} '
                    f'target="_blank" rel="noopener noreferrer" aria-label="'
                    + (f'{moment_action_label} · ' if is_gallery else '')
                    + f'{streamer_name} {provider_label(stream)} · '
                    f'{esc(moment_title, quote=True)}: '
                    f'{format_clock(binding["start_seconds"])}부터 다시보기"'
                )
                full_html = (
                    f'<a class="event-action event-action--vod watch-moment__play" '
                    f'{attributes}>{avatar}<span>'
                    + (moment_action_label if is_gallery else f'{streamer_name} {moment_action_label}') + '</span>'
                    + (f'<small class="streamer-review__clock">{label}</small>' if is_review or is_gallery else '')
                    + '</a>'
                )
                icon_html = (
                    f'<a class="event-action event-action--vod event-action--streamer watch-moment__play" '
                    f'{attributes}>{avatar}<span class="sr-only">'
                    f'{streamer_name} {moment_action_label} · {label}</span></a>'
                )
                compact_html = (
                    f'<a class="event-action event-action--vod watch-moment__play streamer-picker__option" '
                    f'{attributes}><small class="event-provider">{provider_label(stream)}</small>'
                    f'<span>{label}</span>'
                    + (f'<small>{esc(stream["access_note"])}</small>' if stream.get('access_note') else '')
                    + f'<span class="sr-only">{streamer_name} {moment_action_label} · {label}</span></a>'
                )
            else:
                full_html = (
                    f'<span class="event-action event-action--status" {stream_interaction_data(stream)}>{avatar}'
                    f'<small class="event-provider">{provider_label(stream)}</small>'
                    f'<span>{streamer_name} · 시점 확인 필요</span></span>'
                )
                icon_html = (
                    f'<span class="event-action event-action--status event-action--streamer" '
                    f'{stream_interaction_data(stream)} aria-label="{streamer_name} {provider_label(stream)} · 시점 확인 필요">'
                    f'{avatar}<span class="sr-only">{streamer_name} · 시점 확인 필요</span></span>'
                )
                compact_html = (
                    f'<span class="event-action event-action--status streamer-picker__option" '
                    f'{stream_interaction_data(stream)}><small class="event-provider">{provider_label(stream)}</small>'
                    '<span>시점 확인 필요</span></span>'
                )
            action_entries.append({
                'stream': stream, 'full_html': full_html,
                'icon_html': icon_html, 'compact_html': compact_html,
            })
        thumbnail = ''
        if moment.get('thumbnail'):
            image = moment['thumbnail']
            # Follow this image owner's verified moment, not its provenance clock.
            source = (moment['watch_url'] if moment.get('stream') and moment['verification'] == 'verified'
                      else image.get('source_url'))
            if image.get('crop'):
                from .connections import validate_moment_image_crop
                crop = validate_moment_image_crop(image['crop'])
                viewbox = ' '.join(format(crop[key], 'g') for key in ('x', 'y', 'width', 'height'))
                image_html = (
                    f'<svg class="watch-moment__sprite" viewBox="{viewbox}" '
                    f'role="img" aria-label="{esc(image["alt"], quote=True)}" preserveAspectRatio="xMidYMid meet">'
                    f'<image data-moment-image="true" href="{safe_rendered_profile_image(image)}" '
                    'onerror="this.setAttribute(\'data-moment-unavailable\', \'true\')" '
                    f'x="0" y="0" width="{crop["full_width"]:g}" height="{crop["full_height"]:g}" '
                    'preserveAspectRatio="none"></image></svg>'
                )
            else:
                image_html = (
                    f'<img data-moment-image="true" src="{safe_rendered_profile_image(image)}" '
                    f'alt="{esc(image["alt"], quote=True)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
                )
            image_html += '<span class="watch-moment__image-fallback" hidden>이미지를 불러오지 못했습니다. 장면 영상 보기 ↗</span>'
            thumbnail = (
                f'<a class="watch-moment__thumbnail" href="{safe_rendered_connection_url(source, connections)}" '
                f'target="_blank" rel="noopener noreferrer">{image_html}</a>' if source else
                f'<div class="watch-moment__thumbnail">{image_html}</div>'
            )
        moment_id = esc(moment.get('moment_group_id') or moment['moment_id'], quote=True)
        cover = (
            f'<button class="spoiler-cover" type="button" '
            f'aria-label="{kind_label} 내용 보기" hidden>'
            f'<span><small>{kind_label}</small><strong>클릭해서 내용 보기</strong></span></button>'
        )
        marker = '' if is_review or is_gallery else '<div class="watch-moment__marker" aria-hidden="true"></div>'
        pending_actions = render_pending_actions('moment_id', {row['moment_id'] for row in moment_rows})
        actions = (
            '<div class="watch-moment__actions">'
            + render_action_container(action_entries, aria_label=f"{kind_label} 영상 {len(action_entries)}개", action_label=moment_action_label,
                                      trigger_label=moment_action_label if is_gallery else None)
            + pending_actions + '</div>' if action_entries or pending_actions else ''
        )
        if is_review:
            return (
                f'<aside id="moment-{moment_id}" class="watch-moment streamer-review" data-kind="{moment["kind"]}">'
                f'<div class="watch-moment__card">{thumbnail}<div class="watch-moment__content">'
                f'<div class="streamer-review__text"><h3>{esc(moment["title"])}</h3>'
                f'<p>{render_inline_links(moment["summary"], term_links)}</p></div>'
                f'<div class="watch-moment__actions">'
                f'{render_action_container(action_entries, aria_label=f"{kind_label} 영상 {len(action_entries)}개", action_label=moment_action_label)}'
                f'</div></div></div>{cover}</aside>'
            )
        if is_gallery:
            return (
                f'<article id="moment-{moment_id}" class="watch-moment watch-gallery__card" data-kind="{moment["kind"]}">'
                f'<div class="watch-moment__card">{thumbnail}<div class="watch-moment__content">'
                f'<h3>{esc(moment_title)}</h3>'
                f'<p>{render_inline_links(moment["summary"], term_links)}</p>'
                f'{actions}</div></div>{cover}</article>'
            )
        return (
            f'<aside id="moment-{moment_id}" class="watch-moment{" streamer-review" if is_review else ""}" data-kind="{moment["kind"]}">'
            f'{marker}'
            f'<div class="watch-moment__card">{thumbnail}<div class="watch-moment__content">'
            f'<span class="watch-moment__badge">{kind_label}</span>'
            f'<h3>{esc(moment_title)}</h3>'
            f'<p>{render_inline_links(moment["summary"], term_links)}</p>'
            f'{actions}</div></div>{cover}</aside>'
        )
    phases, guides = validate_reader_structure(data, {event['id'] for event in events})
    presentation = validate_story_presentation(data)
    transition_by_event = {
        row['event_id']: row for row in presentation.get('transitions', [])
    }
    scene_link_by_event = {
        row['event_id']: row for row in presentation.get('scene_links', [])
    }
    quote_labels = presentation.get('quote_labels', {})
    text_only_scenes = presentation.get('text_only_scenes', {})
    preserve_line_breaks = set(presentation.get('preserve_line_breaks', []))
    topology = validate_story_topology(
        data.get('story_topology'), {event['id'] for event in events},
    )
    topology_badges = topology_event_badges(topology)
    phase_by_id = {phase['id']: phase for phase in phases}
    emitted_phases = set()
    rows = []
    event_fragments = {}
    event_visuals = {}
    for number, event in enumerate(events, 1):
        fragment_start = len(rows)
        ident = event['id']
        phase_id = event.get('phase_id')
        phase_attributes = (
            f' data-phase-id="{esc(phase_id, quote=True)}" '
            f'data-phase-label="{esc(phase_by_id[phase_id]["label"], quote=True)}"'
            if phase_id else ''
        )
        if phase_id and phase_id not in emitted_phases:
            phase = phase_by_id[phase_id]
            rows.append(
                f'<section class="story-phase" data-phase="{esc(phase_id, quote=True)}" '
                f'aria-labelledby="phase-{esc(phase_id, quote=True)}">'
                f'<div class="story-phase__gate"><span class="story-phase__sigil" aria-hidden="true"></span>'
                f'<span class="story-phase__label">이야기 전환</span>'
                f'<h2 id="phase-{esc(phase_id, quote=True)}">{esc(phase["label"])}</h2>'
                f'<p>{render_inline_links(phase.get("summary", ""), term_links)}</p></div></section>'
            )
            emitted_phases.add(phase_id)
        visual = f'''<div class="visual missing" aria-label="장면 이미지 미확보">
          <div class="scene-photo image-failed" data-fallback="{number:02}\n이미지 확인 중"></div>
          <span class="caption">관련 장면 이미지 확인 중</span></div>'''
        text_only_note = text_only_scenes.get(ident)
        if text_only_note:
            perspective_visual = (
                f'<div class="visual visual--text-only" role="note" aria-label="{esc(text_only_note, quote=True)} 미리보기 이미지 없음">'
                '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">'
                '<path d="M32 16c-6-4-14-5-24-3v34c10-2 18-1 24 4 6-5 14-6 24-4V13c-10-2-18-1-24 3Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>'
                '<path d="M32 16v35M14 22c5-.6 9-.2 13 1.5M14 29c5-.6 9-.2 13 1.5M50 22c-5-.6-9-.2-13 1.5M50 29c-5-.6-9-.2-13 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
                '</svg><strong>이야기로 전한 장면</strong>'
                '<span>미리보기 이미지 없음</span></div>'
            )
            visual = perspective_visual
        elif event.get('image_hash') in image_map:
            image_row, uri = image_map[event['image_hash']]
            visual = f'''<div class="visual"><a class="scene-photo" href="{safe_url(image_row['source_page_url'])}" target="_blank" rel="noopener noreferrer">
              <img src="{uri}" alt="{esc(event.get('image_alt','관련 장면'), quote=True)}" loading="lazy" decoding="async"></a>
              <span class="caption">{esc(event.get('image_caption','관련 장면 이미지'))}</span></div>'''
        elif event.get('image_url') and event.get('image_source_url'):
            visual = f'''<div class="visual"><a class="scene-photo" href="{safe_url(event['image_source_url'])}" target="_blank" rel="noopener noreferrer" data-fallback="{esc(event.get('image_alt','이미지 확인 중'), quote=True)}">
              <img src="{safe_url(event['image_url'])}" alt="{esc(event.get('image_alt','관련 장면'), quote=True)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('image-failed');this.style.display='none'"></a>
              <span class="caption">{esc(event.get('image_caption','관련 장면 이미지'))}</span></div>'''
        elif event.get('image_site_asset'):
            site_asset = safe_site_asset(event['image_site_asset'])
            source_href = safe_url(event['image_source_url']) if event.get('image_source_url') else site_asset
            visual = f'''<div class="visual"><a class="scene-photo" href="{source_href}" target="_blank" rel="noopener noreferrer" data-fallback="{esc(event.get('image_alt','이미지 확인 중'), quote=True)}">
              <img src="{site_asset}" alt="{esc(event.get('image_alt','관련 장면'), quote=True)}" loading="lazy" decoding="async" onerror="this.parentElement.classList.add('image-failed');this.style.display='none'"></a>
              <span class="caption">{esc(event.get('image_caption','관련 장면 이미지'))}</span></div>'''
        event_visuals[ident] = perspective_visual if text_only_note else visual
        start, end = event['source_lines']
        semantic_story = is_semantic_story_contract(data.get('research_contract'))
        show_quote = bool(event.get('source_quote')) and (
            event.get('highlight_kind') != 'none' if semantic_story else source_order[ident] in (6, 7, 8)
        )
        event_source_id = str(event.get('source_id') or 'primary').strip()
        event_source = acquired_sources.get(event_source_id, source)
        event_source_url, source_badge = source_presentations.get(
            event_source_id, source_presentations['primary'],
        )
        quote_text = display_source_quote(event.get('source_quote'), event_source)
        quote_label = (
            f'<strong class="thought-label">{esc(quote_labels[ident])}</strong>'
            if ident in quote_labels else ''
        )
        quote = f'<div class="quote">{quote_label}“{esc(quote_text)}”</div>' if show_quote else ''
        event_links = connection_map.get(ident, [])
        if connections:
            action_entries = []
            for link in sorted(event_links, key=lambda row: (
                    row['stream']['order'], not row.get('primary', False), row.get('start_seconds', 0))):
                if (
                    link['verification'] == 'absent'
                    and connections.get('publication_status') == 'publishable'
                ):
                    continue
                stream = link['stream']
                streamer_name = esc(stream['streamer_name'])
                avatar = render_avatar(stream)
                if link['verification'] != 'verified':
                    status_text = {
                        'absent':'해당 장면 없음',
                        'unresolved':'시점 확인 필요',
                    }[link['verification']]
                    full_html = (
                        f'<span class="event-action event-action--status" {stream_interaction_data(stream)}>{avatar}'
                        f'<small class="event-provider">{provider_label(stream)}</small>'
                        f'<span>{streamer_name} · {status_text}</span></span>'
                    )
                    icon_html = (
                        f'<span class="event-action event-action--status event-action--streamer" '
                        f'{stream_interaction_data(stream)} aria-label="{streamer_name} {provider_label(stream)} · {status_text}">'
                        f'{avatar}<span class="sr-only">{streamer_name} · {status_text}</span></span>'
                    )
                    compact_html = (
                        f'<span class="event-action event-action--status streamer-picker__option" '
                        f'{stream_interaction_data(stream)}><small class="event-provider">{provider_label(stream)}</small>'
                        f'<span>{status_text}</span></span>'
                    )
                    action_entries.append({
                        'stream': stream, 'full_html': full_html,
                        'icon_html': icon_html, 'compact_html': compact_html,
                    })
                    continue
                watch_url = safe_rendered_connection_url(link['watch_url'], connections)
                start_label = str(link.get('label') or format_clock(link['start_seconds']))
                end_seconds = link.get('end_seconds')
                display_label = (
                    f'{start_label}–{format_clock(end_seconds)}'
                    if isinstance(end_seconds, (int, float)) else start_label
                )
                label = esc(display_label)
                aria_time = (
                    f'{format_clock(link["start_seconds"])}부터 {format_clock(end_seconds)}까지 구간 다시보기'
                    if isinstance(end_seconds, (int, float))
                    else f'{format_clock(link["start_seconds"])}부터 다시보기'
                )
                full_html = (
                    f'<a class="event-action event-action--vod" href="{watch_url}" target="_blank" '
                    f'{stream_interaction_data(stream, start_seconds=link["start_seconds"])} '
                    f'rel="noopener noreferrer" aria-label="{streamer_name} {provider_label(stream)} · '
                    f'{esc(event["title"], quote=True)}: {aria_time}">'
                    f'{avatar}<span>{streamer_name} 같이보기</span></a>'
                )
                icon_html = (
                    f'<a class="event-action event-action--vod event-action--streamer" href="{watch_url}" target="_blank" '
                    f'{stream_interaction_data(stream, start_seconds=link["start_seconds"])} '
                    f'rel="noopener noreferrer" aria-label="{streamer_name} {provider_label(stream)} · '
                    f'{esc(event["title"], quote=True)}: {aria_time}">{avatar}'
                    f'<span class="sr-only">{streamer_name} 같이보기 · {label}</span></a>'
                )
                compact_html = (
                    f'<a class="event-action event-action--vod streamer-picker__option" href="{watch_url}" '
                    f'target="_blank" {stream_interaction_data(stream, start_seconds=link["start_seconds"])} '
                    f'rel="noopener noreferrer" aria-label="{esc(event["title"], quote=True)}: {aria_time}">'
                    f'<small class="event-provider">{provider_label(stream)}</small><span>{label}</span>'
                    f'<span class="sr-only">{streamer_name} 같이보기 · {label}</span></a>'
                )
                action_entries.append({
                    'stream': stream, 'full_html': full_html,
                    'icon_html': icon_html, 'compact_html': compact_html,
                })
            actions = render_action_container(
                action_entries, aria_label=f'다시보기 연결 {len(action_entries)}개', action_label='같이보기'
            )
        else:
            actions = ''
        actions += render_pending_actions('event_id', {ident})
        line_break_class = ' preserve-line-breaks' if ident in preserve_line_breaks else ''
        copy = f'''<div class="copy{line_break_class}"><div class="step">{number:02}</div>{topology_badges.get(ident, '')}
          {render_transition(transition_by_event.get(ident))}
          <h2 class="scene-title"><a href="#{ident}">{esc(event['title'])}</a></h2>
          <p class="scene-desc">{render_inline_links(event['summary'], term_links)}</p>{quote}
          <span class="keywords">{esc(event['location'])}</span>{actions}
          <details class="event-source"><summary>{source_badge}<span>상세 내용 보기</span></summary><p><a href="{event_source_url}" target="_blank" rel="noopener noreferrer">출처 페이지</a> · 근거 {start}–{end}행</p></details>
          {render_scene_link(scene_link_by_event.get(ident))}</div>'''
        side = 'left' if number % 2 else 'right'
        contents = copy + '<div class="node" aria-hidden="true"></div>' + visual if side == 'left' else visual + '<div class="node" aria-hidden="true"></div>' + copy
        spoiler_cover = f'''<button class="spoiler-cover" type="button" aria-label="장면 {number:02} 내용 보기" hidden>
          <span><small>장면 {number:02}</small><strong>클릭해서 내용 보기</strong></span></button>'''
        accent = ACCENTS[(number - 1) % len(ACCENTS)]
        text_class = ' item--text-only' if ident in text_only_scenes else ''
        rows.append(render_scene_shell(ident=ident, side=side, text_class=text_class,
                    attributes=phase_attributes, accent=accent, contents=contents, cover=spoiler_cover))
        grouped_moments = {}
        for moment in moment_map.get(ident, []):
            if moment.get('placement') in {'streamer_review', 'watch_gallery'}:
                continue
            group_id = moment.get('moment_group_id') or moment['moment_id']
            grouped_moments.setdefault(group_id, []).append(moment)
        rows.extend(render_moment(group) for group in grouped_moments.values())
        event_fragments[ident] = '\n'.join(rows[fragment_start:])
    uses_tree = bool(topology and topology.get('schema_version') == LAYOUT_SCHEMA_VERSION)
    # Canonical scene content, evidence and replay ownership are rendered once.
    # The optional overlay changes placement only, never the input events.
    event_html = render_story_layout(topology, event_fragments) if uses_tree else '\n'.join(rows)
    story_view_switch, perspective_views = render_perspective_story_views(
        guides,
        event_visuals,
        main_first_scene_id=events[0]['id'],
        render_inline_links=render_inline_links,
        term_links=term_links,
        safe_url=safe_url,
        safe_site_asset=safe_site_asset,
        presentation=presentation,
        main_scene_numbers=source_order,
    )
    guide_html = render_reader_guides(
        guides,
        source,
        term_links,
        render_inline_links=render_inline_links,
        safe_url=safe_url,
        exclude_kinds={'perspective'},
    )
    topology_html = render_story_topology(
        topology,
        events,
        term_links,
        render_inline_links=render_inline_links,
    )
    glossary_html = render_story_glossary(data, term_links, work_glossary)
    gallery_groups = {}
    review_groups = {}
    for bindings in moment_map.values():
        for moment in bindings:
            if moment.get('placement') == 'watch_gallery':
                group_id = moment.get('moment_group_id') or moment['moment_id']
                gallery_groups.setdefault(group_id, []).append(moment)
            elif moment.get('placement') == 'streamer_review':
                group_id = moment.get('moment_group_id') or moment['moment_id']
                review_groups.setdefault(group_id, []).append(moment)
    gallery_html = (
        '<section class="watch-gallery" aria-labelledby="watch-gallery-title">'
        '<header class="watch-gallery__head"><h2 id="watch-gallery-title">PV 같이보기</h2>'
        '<p>유튜버를 고르면 확인된 재생 시점으로 이동합니다.</p></header>'
        '<div class="watch-gallery__grid">'
        + ''.join(render_moment(group) for group in gallery_groups.values()) + '</div></section>'
    ) if gallery_groups else ''
    reviews_by_name = {}
    for group in review_groups.values():
        reviews_by_name.setdefault(group[0]['reviewer_name'], []).append(group)
    review_html = ''.join(
        f'<section id="streamer-reviews-{index}" class="streamer-reviews" '
        f'aria-labelledby="streamer-reviews-title-{index}">'
        '<header class="streamer-reviews__head">'
        '<div class="streamer-reviews__identity">'
        f'<span class="streamer-reviews__portrait" aria-hidden="true">{render_avatar(groups[0][0].get("stream") or {"streamer_name":name})}</span>'
        '<div class="streamer-reviews__heading">'
        '<span class="streamer-reviews__eyebrow">이야기 뒤의 한마디</span>'
        f'<h2 id="streamer-reviews-title-{index}">{esc(name)}의 후기</h2>'
        '</div></div>'
        '<svg class="streamer-reviews__quote" viewBox="0 0 80 64" aria-hidden="true" focusable="false">'
        '<path d="M5 29C5 12 16 3 34 3v10c-10 1-15 5-16 12h16v32H5V29Zm41 0C46 12 57 3 75 3v10c-10 1-15 5-16 12h16v32H46V29Z" fill="currentColor"/></svg>'
        '</header>'
        + ''.join(render_moment(group) for group in groups) + '</section>'
        for index, (name, groups) in enumerate(reviews_by_name.items(), 1)
    )
    template_root = Path(__file__).parent
    template = (template_root/'template.html').read_text(encoding='utf-8')
    scene_nav = render_scene_navigation(events, topology, data.get('phases', []))
    if story_view_switch:
        scene_nav = f'<div id="story-view-navigation">{scene_nav}</div>'
    tags = ''.join(f'<span>#{esc(tag)}</span>' for tag in data.get('tags', []))
    connection_streams = {}
    viewing_titles = {}
    for event_links in connection_map.values():
        for link in event_links:
            stream = link['stream']
            connection_streams.setdefault(stream['stream_id'], stream)
    for moment_links in moment_map.values():
        for link in moment_links:
            stream = link.get('stream')
            if stream:
                connection_streams.setdefault(stream['stream_id'], stream)
                if link.get('placement') == 'watch_gallery':
                    viewing_titles.setdefault(stream['stream_id'], link['title'])
    if connection_streams:
        watch_links = []
        grouped_streams = {}
        for stream in sorted(connection_streams.values(), key=lambda row: row['order']):
            grouped_streams.setdefault(stream['streamer_name'], []).append(stream)
        for streamer, streams in grouped_streams.items():
            streamer_name = esc(streamer)
            platform_summary = ' · '.join(dict.fromkeys(provider_label(stream) for stream in streams))
            identity_url = streams[0]['watch_url'] if len(streams) == 1 else None
            identity_label = f'{streamer} {provider_label(streams[0])} 전체 방송을 새 창에서 열기'
            if len(streams) > 1 and all(stream['provider'] == 'youtube' for stream in streams):
                channels = {stream['channel_id'] for stream in streams}
                if len(channels) == 1:
                    channel = streams[0]['channel_id']
                    if channel.startswith(('UC', '@')):
                        identity_url = 'https://www.youtube.com/' + (channel if channel.startswith('@') else 'channel/' + channel)
                        identity_label = f'{streamer} YouTube 채널을 새 창에서 열기'
            identity = (
                f'<a class="watch-stream__identity" href="{safe_rendered_connection_url(identity_url, connections)}" '
                f'target="_blank" rel="noopener noreferrer" aria-label="{esc(identity_label, quote=True)}">'
                if identity_url else '<div class="watch-stream__identity">'
            )
            identity += (
                f'{render_avatar(streams[0])}<span><strong>{streamer_name}</strong>'
                f'<small>{platform_summary}</small></span>' + ('</a>' if identity_url else '</div>')
            )
            platform_links = []
            provider_counts = {provider: sum(stream['provider'] == provider for stream in streams)
                               for provider in {stream['provider'] for stream in streams}}
            provider_positions = {}
            for stream in streams:
                provider = provider_label(stream)
                provider_positions[stream['provider']] = provider_positions.get(stream['provider'], 0) + 1
                recording_title = (
                    viewing_titles.get(stream['stream_id'])
                    or f'{provider} 전체 방송 {provider_positions[stream["provider"]]}'
                ) if provider_counts[stream['provider']] > 1 else None
                replay_label = f'{provider} · {recording_title}' if recording_title else f'{provider} 전체 방송'
                summary_url = stream.get('summary_url')
                summary_link = ''
                if summary_url:
                    summary_link = (
                        f'<a class="watch-stream__summary" href="{safe_rendered_connection_url(summary_url, connections)}" '
                        f'target="_blank" rel="noopener noreferrer" aria-label="{esc(streamer, quote=True)} '
                        f'{provider} 방송 요약을 새 창에서 열기"><span>요약</span>'
                        '<span aria-hidden="true">↗</span></a>'
                    )
                platform_links.append(
                    f'<div class="watch-stream__platform" data-provider="{esc(stream["provider"], quote=True)}">'
                    f'<a class="watch-all{" watch-all--labeled" if recording_title else ""}" href="{safe_rendered_connection_url(stream["watch_url"], connections)}" '
                    f'{stream_interaction_data(stream)} target="_blank" rel="noopener noreferrer" '
                    f'aria-label="{esc(streamer, quote=True)} {esc(replay_label, quote=True)} · 새 창에서 열기" '
                    f'title="{esc(replay_label, quote=True)}">{provider_icon(stream)}'
                    + (f'<span>{esc(recording_title)}</span>' if recording_title else f'<span class="sr-only">{provider} 전체 방송</span>') + '</a>'
                    f'{summary_link}</div>'
                )
            watch_links.append(
                f'<article class="watch-stream{" watch-stream--multiple" if len(streams) > 1 else ""}" data-platform-count="{len(streams)}">'
                f'{identity}'
                f'<div class="watch-stream__actions">{"".join(platform_links)}</div></article>'
            )
        watch = (
            '<div class="watch-all-list" aria-label="스트리머와 플랫폼별 전체 방송 및 요약">'
            + ''.join(watch_links) + '</div>'
        )
    elif data.get('watch_url') and replay_policy(connections or {})['mode'] != 'capture_only':
        watch = (
            f'<a class="watch-all" data-watch-transition="true" data-provider="external" data-streamer="전체 방송" '
            f'href="{safe_url(data["watch_url"])}" '
            f'target="_blank" rel="noopener noreferrer">전체 다시보기 열기 ↗</a>'
        )
    else:
        watch = ''
    official_kind_labels = {
        'version_trailer': '버전 트레일러',
        'resonator_showcase': '캐릭터 시네마틱',
        'music_video': '공식 EP',
        'short_animation': '단편 애니메이션',
        'special_video': '특별 영상',
        'story_trailer': '스토리 트레일러',
        'character_pv': '캐릭터 PV',
        'story_cutscene': '스토리 컷씬',
        'theme_song': '테마곡',
        'radio': '라디오',
        'song': '노래',
        'animation': '애니메이션',
    }
    official_video_cards = ''.join(
        '<a class="official-video" '
        f'href="{safe_rendered_connection_url(video["watch_url"], connections)}" '
        'target="_blank" rel="noopener noreferrer">'
        '<span class="official-video__meta">'
        f'<small>{official_kind_labels[video["kind"]]}</small>'
        f'<span>{esc(video["channel_name"])}</span></span>'
        f'<strong>{esc(video["title"])}</strong>'
        f'<p>{esc(video["summary"])}</p>'
        '<span class="official-video__action">YouTube에서 보기 <b aria-hidden="true">↗</b></span></a>'
        for video in official_videos
    )
    official_video_section = (
        '<section class="official-videos" aria-labelledby="official-videos-title">'
        '<header><span>OFFICIAL AFTER-STORY · 본편 감상 후</span>'
        '<h2 id="official-videos-title">공식 영상으로 여운 이어가기</h2>'
        '<p>이야기를 마친 뒤, 컷씬과 음악·애니메이션으로 여운을 이어가세요.</p></header>'
        f'<div class="official-videos__grid">{official_video_cards}</div></section>'
        if official_video_cards else ''
    )
    if publication_status not in {'manager_review', 'publishable'}:
        raise ValueError('Unknown publication status')
    if asset_urls is None or not asset_urls.get('css'):
        head_assets = '<style>' + bundled_styles(
            (template_root/'style.css').read_text(encoding='utf-8')
        ) + '</style>'
        body_assets = '<script>' + bundled_scripts(
            (template_root/'app.js').read_text(encoding='utf-8')
        ) + '</script>'
    else:
        css_url = safe_site_asset(asset_urls['css'])
        js_url = safe_site_asset(asset_urls['js'])
        head_assets = f'<link rel="stylesheet" href="{css_url}">'
        body_assets = f'<script src="{js_url}"></script>'
    breadcrumb = (
        '<nav class="story-breadcrumb" aria-label="스토리 위치">'
        '<a href="/storytimeline/">전체 작품</a><span aria-hidden="true">›</span>'
        f'<a href="/storytimeline/{esc(data["work_id"], quote=True)}/">{esc(data["work_title"])}</a>'
        f'<span aria-hidden="true">›</span><span aria-current="page">{esc(data["unit_label"])}</span></nav>'
    )
    fields = {'TITLE':esc(data['title']), 'WORK':esc(data['work_title']), 'UNIT':esc(data['unit_label']),
        'INTRO':render_inline_links(data['intro'], term_links), 'COUNT':str(len(events)),
        'COUNT_PADDED':str(len(events)).zfill(2), 'EVENTS':event_html,
        'LAYOUT_ATTR':' data-story-layout="tree"' if uses_tree else '',
        'FIRST_SCENE':esc(events[0]['title']), 'FIRST_SCENE_ID':esc(events[0]['id'], quote=True),
        'SCENE_NAV':scene_nav, 'STORY_VIEW_SWITCH':story_view_switch,
        'READER_SHARE':render_reader_share(data['work_id'], data['unit_id'], public=publication_status == 'publishable'),
        'PERSPECTIVE_VIEWS':perspective_views, 'TAGS':tags,
        'HEAD_ASSETS':head_assets, 'BODY_ASSETS':body_assets, 'WATCH':watch,
        'WATCH_HIDDEN':'' if watch else ' hidden',
        'BREADCRUMB':breadcrumb, 'TOPOLOGY':topology_html,
        'GUIDES':guide_html, 'GLOSSARY':glossary_html, 'WATCH_GALLERY':gallery_html, 'STREAMER_REVIEWS':review_html,
        'OFFICIAL_VIDEOS':official_video_section,
        'SOURCE_URL':source_url,
        'ROBOTS':'index,follow' if publication_status == 'publishable' else 'noindex,nofollow',
        'ELIO_VERSION':esc(ELIO_SYSTEM_VERSION)}
    return re.sub(r'\{\{([A-Z_]+)\}\}', lambda match: fields[match[1]], template)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('data', type=Path)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--images', type=Path)
    parser.add_argument('--connections', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    data = json.loads(args.data.read_text(encoding='utf-8'))
    source = json.loads(args.source.read_text(encoding='utf-8'))
    images = (json.loads(args.images.read_text(encoding='utf-8')), args.images.parent) if args.images else None
    connections = json.loads(args.connections.read_text(encoding='utf-8')) if args.connections else None
    page = render(data, source, images, connections)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Keep the receipt hash byte-identical on Windows instead of translating LF
    # to CRLF after hashing the rendered page.
    args.output.write_text(page, encoding='utf-8', newline='')
    connected = validate_connections(connections, data) if connections else {}
    print(json.dumps({'status':'draft_generated','path':str(args.output.resolve()),
        'events':len(data['events']), 'moments':len({
            row.get('moment_group_id') or row['moment_id']
            for rows in validate_moments(connections, data).values() for row in rows
        }) if connections else 0,
        'connected_events':sum(
            any(row['verification'] == 'verified' for row in rows) for rows in connected.values()),
        'source_hash':source['content_hash'],
        'html_sha256':hashlib.sha256(page.encode()).hexdigest(), 'published':False}))


if __name__ == '__main__':
    main()
