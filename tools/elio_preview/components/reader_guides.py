"""Render reader notes by information type instead of one generic card."""

import html
import json
from pathlib import Path
import re
from urllib.parse import urlsplit


SUPPORTED_GUIDE_KINDS = {
    "conclusion", "relationships", "contrast", "questions", "clues",
    "perspective",
}
GUIDE_LABELS = {
    "conclusion": "핵심 흐름",
    "relationships": "인물·세력 관계",
    "contrast": "두 관점",
    "questions": "질문과 답",
    "clues": "떡밥과 상징",
    "perspective": "인물의 삶",
}
PERSPECTIVE_STATE_LABELS = {
    "confirmed": "확인된 사건",
    "in_world_legend": "작품 속 전승",
    "corrected_record": "뒤에 밝혀진 사실",
    "interpretation": "관점 재구성",
}

GUIDE_TEMPLATES = json.loads(
    Path(__file__).with_name("reader_guide_templates.json").read_text(encoding="utf-8")
)["templates"]


def _template(name: str, **values: str) -> str:
    """Substitute prepared HTML once; authored text cannot introduce new slots."""
    return re.sub(r"\{\{([A-Z_]+)\}\}", lambda match: values[match[1]], GUIDE_TEMPLATES[name])
def _source_rows(source: dict) -> dict[str, dict]:
    return {"primary": source, **{
        str(row.get("source_id")): row
        for row in source.get("research_sources", [])
        if isinstance(row, dict) and row.get("source_id")
    }}


def _clue_source_link(item: dict, source: dict, safe_url) -> str:
    reference = item["reference"]
    row = _source_rows(source).get(reference["source_id"])
    if not row:
        raise ValueError("Clue reference points outside the acquired source bundle")
    url = row.get("final_url") or row.get("requested_url")
    return _template("reference", HREF=safe_url(str(url)))


def _item_disclosures(guide: dict, source: dict, render_inline_links, term_links, safe_url) -> str:
    rows = []
    for index, item in enumerate(guide["items"], 1):
        opened = " open" if index == 1 else ""
        title = render_inline_links(item["title"], term_links)
        summary = render_inline_links(item["summary"], term_links)
        source_link = _clue_source_link(item, source, safe_url) if guide["kind"] == "clues" else ""
        rows.append(_template(
            "disclosure", OPEN=opened, LABEL=html.escape(item["label"]), TITLE=title,
            ANSWER=_template("paragraph", TEXT=summary) + source_link + _related_scene(item),
        ))
    return _template("disclosures", ITEMS="".join(rows))


def _related_scene(item: dict) -> str:
    ident = item.get("related_event_id")
    if not ident:
        return ""
    return _template("related_scene", HREF="#" + html.escape(ident, quote=True))


def _comparison(guide: dict, render_inline_links, term_links) -> str:
    rows = []
    for index, item in enumerate(guide["items"], 1):
        rows.append(
            '<article class="reader-guide__comparison-item" role="listitem">'
            f'<span>{html.escape(item["label"])}</span>'
            f'<h4>{render_inline_links(item["title"], term_links)}</h4>'
            f'<p>{render_inline_links(item["summary"], term_links)}</p>{_related_scene(item)}'
            '</article>'
        )
    return '<div class="reader-guide__comparison" role="list">' + "".join(rows) + "</div>"


def _relationships(guide: dict, render_inline_links, term_links) -> str:
    rows = []
    for item in guide["items"]:
        rows.append(
            '<article class="reader-guide__relationship" role="listitem">'
            '<div class="reader-guide__relationship-line">'
            f'<strong>{render_inline_links(item["subject"], term_links)}</strong>'
            f'<span>{html.escape(item["relation"])}</span>'
            f'<strong>{render_inline_links(item["object"], term_links)}</strong>'
            '</div>'
            f'<p>{render_inline_links(item["summary"], term_links)}</p>{_related_scene(item)}'
            '</article>'
        )
    return '<div class="reader-guide__relationships" role="list">' + "".join(rows) + "</div>"


def _perspective(guide: dict, render_inline_links, term_links) -> str:
    rows = []
    for index, item in enumerate(guide["items"], 1):
        state = item["evidence_state"]
        rows.append(
            '<li class="reader-guide__life-item">'
            '<div class="reader-guide__life-rail" aria-hidden="true">'
            f'<span>{index:02d}</span></div>'
            '<article class="reader-guide__life-card">'
            '<div class="reader-guide__life-meta">'
            f'<span>{html.escape(item["label"])}</span>'
            f'<em class="reader-guide__evidence reader-guide__evidence--{state}">'
            f'{PERSPECTIVE_STATE_LABELS[state]}</em></div>'
            f'<h4>{render_inline_links(item["title"], term_links)}</h4>'
            f'<p>{render_inline_links(item["summary"], term_links)}</p>'
            f'{_related_scene(item)}</article></li>'
        )
    return '<ol class="reader-guide__life">' + "".join(rows) + "</ol>"


def _source_disclosure(guide: dict, source: dict, safe_url) -> str:
    source_rows = _source_rows(source)
    links = []
    for source_id in guide.get("source_ids", []):
        row = source_rows.get(source_id)
        if not row:
            raise ValueError("Reader guide references an unknown acquired source")
        url = row.get("final_url") or row.get("requested_url")
        host = (urlsplit(str(url)).hostname or "").removeprefix("www.")
        label = row.get("site_name") or row.get("section_title") or host
        links.append(
            f'<a href="{safe_url(str(url))}" target="_blank" rel="noopener noreferrer">'
            f'{html.escape(str(label))}<span aria-hidden="true">↗</span></a>'
        )
    if not links:
        return ""
    return (
        '<details class="reader-guide__sources">'
        f'<summary>근거 자료 <strong>{len(links)}개</strong><i aria-hidden="true"></i></summary>'
        '<div>' + "".join(links) + '</div></details>'
    )


def _guide(guide: dict, source: dict, term_links, render_inline_links, safe_url) -> str:
    kind = guide["kind"]
    guide_id = html.escape(guide["id"], quote=True)
    title_id = f"guide-{guide_id}-title"
    if kind == "relationships":
        items = _relationships(guide, render_inline_links, term_links)
    elif kind == "perspective":
        items = _perspective(guide, render_inline_links, term_links)
    elif kind == "contrast":
        items = _comparison(guide, render_inline_links, term_links)
    elif kind in {"questions", "clues"}:
        items = _item_disclosures(guide, source, render_inline_links, term_links, safe_url)
    else:
        items = ""
    sources = _source_disclosure(guide, source, safe_url)
    header = _template("header", LABEL=GUIDE_LABELS[kind], LEVEL="3", TITLE_ID=title_id,
                       TITLE=render_inline_links(guide["title"], term_links),
                       SUMMARY=render_inline_links(guide["summary"], term_links))
    return _template("guide", GUIDE_ID=guide_id, KIND=kind, TITLE_ID=title_id,
                     HEADER=header, ITEMS=items, SOURCES=sources, COVER=GUIDE_TEMPLATES["cover"])


def render_reader_guides(
    guides: list[dict], source: dict, term_links: list[dict],
    *, render_inline_links, safe_url, exclude_kinds=(),
) -> str:
    guides = [guide for guide in guides if guide["kind"] not in set(exclude_kinds)]
    if not guides:
        return ""
    nav = "".join(
        f'<a href="#guide-{html.escape(guide["id"], quote=True)}" '
        f'data-guide-target="guide-{html.escape(guide["id"], quote=True)}">'
        f'<span>{GUIDE_LABELS[guide["kind"]]}</span>'
        f'<strong class="reader-guide__nav-title">{html.escape(guide["title"])}</strong></a>'
        for guide in guides
    )
    body = "".join(
        _guide(guide, source, term_links, render_inline_links, safe_url)
        for guide in guides
    )
    template = Path(__file__).with_name("reader_guides.html").read_text(encoding="utf-8")
    return template.replace("{{NAV}}", nav).replace("{{GUIDES}}", body)
