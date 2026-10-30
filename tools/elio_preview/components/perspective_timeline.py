"""Promote an evidence-labelled character perspective into the main timeline shell."""

import html

from .diagram_layout import remap_diagram_layout

from .reader_guides import PERSPECTIVE_STATE_LABELS
from .reader_presentation import render_legend
from .scene_navigation import render_scene_navigation
from .story_layout import render_story_layout
from .time_map import render_time_map


def _view_key(guide: dict) -> str:
    return f'perspective-{guide["id"]}'


def _item_id(guide: dict, index: int, item: dict | None = None) -> str:
    suffix = item.get("id") if item else None
    return f'{_view_key(guide)}-{suffix or f"{index:02d}"}'


def _related_scene_label(number: int | None) -> str:
    if number is None:
        return "관련 장면으로 가기"
    particle = "로" if number % 10 in {1, 2, 4, 5, 7, 8, 9} else "으로"
    return f"관련 장면 {number:02d}{particle} 가기"


def _prefixed_topology(guide: dict) -> dict:
    """Namespace a perspective topology without changing its editorial meaning."""
    topology = guide["story_topology"]
    prefix = _view_key(guide)
    event_ids = {item["id"]: f'{prefix}-{item["id"]}' for item in guide["items"]}
    return {
        "schema_version": topology["schema_version"],
        "title": topology["title"],
        "summary": topology["summary"],
        "nodes": [
            {**node, "event_id": event_ids[node["event_id"]]}
            for node in topology["nodes"]
        ],
        "edges": [
            {
                "from": event_ids[edge["from"]],
                "to": event_ids[edge["to"]],
                **({"relation": edge["relation"]} if "relation" in edge else {}),
            }
            for edge in topology["edges"]
        ],
        "alignments": [
            {
                **alignment,
                "id": f'{prefix}-{alignment["id"]}',
                "event_ids": [event_ids[item_id] for item_id in alignment["event_ids"]],
            }
            for alignment in topology["alignments"]
        ],
        **({"diagram_layout": remap_diagram_layout(topology["diagram_layout"], event_ids)}
           if "diagram_layout" in topology else {}),
    }


def _external_visual(item: dict, safe_url) -> str:
    image_url = safe_url(item["image_url"])
    source_url = safe_url(item["image_source_url"])
    alt = html.escape(item["image_alt"], quote=True)
    caption = html.escape(item["image_caption"])
    return (
        '<div class="visual"><a class="scene-photo" '
        f'href="{source_url}" target="_blank" rel="noopener noreferrer" '
        f'data-fallback="{alt}"><img src="{image_url}" alt="{alt}" loading="lazy" '
        'decoding="async" referrerpolicy="no-referrer" '
        'onerror="this.parentElement.classList.add(\'image-failed\');this.style.display=\'none\'">'
        f'</a><span class="caption">{caption}</span></div>'
    )


def _managed_visual(item: dict, safe_url, safe_site_asset) -> str:
    image_url = safe_site_asset(item["image_site_asset"])
    source_url = (
        safe_url(item["image_source_url"])
        if item.get("image_source_url") else image_url
    )
    alt = html.escape(item["image_alt"], quote=True)
    caption = html.escape(item["image_caption"])
    return (
        '<div class="visual"><a class="scene-photo" '
        f'href="{source_url}" target="_blank" rel="noopener noreferrer" '
        f'data-fallback="{alt}"><img src="{image_url}" alt="{alt}" loading="lazy" '
        'decoding="async" '
        'onerror="this.parentElement.classList.add(\'image-failed\');this.style.display=\'none\'">'
        f'</a><span class="caption">{caption}</span></div>'
    )


def _missing_visual(number: int) -> str:
    return (
        '<div class="visual missing" aria-label="인물 생애 이미지 미확보">'
        f'<div class="scene-photo image-failed" data-fallback="{number:02d}\n이미지 확인 중"></div>'
        '<span class="caption">관련 이미지 확인 중</span></div>'
    )


def _perspective_rows(
    guide: dict,
    event_visuals: dict[str, str],
    *,
    render_inline_links,
    term_links,
    safe_url,
    safe_site_asset,
    presentation=None,
    main_scene_numbers=None,
) -> tuple[str, list[dict]]:
    rows = []
    fragments = {}
    item_visuals = {}
    navigation_events = []
    for index, item in enumerate(guide["items"], 1):
        ident = _item_id(guide, index, item)
        navigation_events.append({"id": ident, "title": item["title"]})
        image_event_id = item.get("image_event_id") or item.get("related_event_id")
        visual = event_visuals.get(image_event_id or "", "")
        if item.get("image_url"):
            visual = _external_visual(item, safe_url)
        elif item.get("image_site_asset"):
            visual = _managed_visual(item, safe_url, safe_site_asset)
        if not visual:
            visual = _missing_visual(index)
        item_visuals[item.get("id", str(index))] = visual
        state = item["evidence_state"]
        scene_link = ""
        if item.get("related_event_id"):
            related = html.escape(item["related_event_id"], quote=True)
            number = (main_scene_numbers or {}).get(item["related_event_id"]) if presentation else None
            label = _related_scene_label(number)
            scene_link = (
                f'<a class="perspective-scene-link" href="#{related}" '
                f'data-main-scene="{related}">{label} <span aria-hidden="true">↗</span></a>'
            )
        copy = (
            '<div class="copy"><div class="step">'
            f'{index:02d}</div><div class="perspective-state">'
            f'<span>{html.escape(item["label"])}</span>'
            f'<em class="reader-guide__evidence reader-guide__evidence--{state}">'
            f'{PERSPECTIVE_STATE_LABELS[state]}</em></div>'
            f'<h2 class="scene-title">{render_inline_links(item["title"], term_links)}</h2>'
            f'<p class="scene-desc">{render_inline_links(item["summary"], term_links)}</p>'
            f'{scene_link}</div>'
        )
        side = "left" if index % 2 else "right"
        contents = (
            copy + '<div class="node" aria-hidden="true"></div>' + visual
            if side == "left"
            else visual + '<div class="node" aria-hidden="true"></div>' + copy
        )
        item_label = html.escape((presentation or {}).get("item_label", "생애"))
        cover = (
            f'<button class="spoiler-cover" type="button" aria-label="{item_label} 장면 {index:02d} 내용 보기" hidden>'
            f'<span><small>{item_label} {index:02d}</small><strong>클릭해서 내용 보기</strong></span></button>'
        )
        fragment = (
            f'<article id="{ident}" class="item item--perspective {side}" '
            f'style="--accent:var(--perspective-accent,{"#52bdd8" if index % 2 else "#886fd6"})">'
            f'{contents}{cover}</article>'
        )
        rows.append(fragment)
        fragments[ident] = fragment
    if guide.get("time_map") is not None:
        return render_time_map(guide, render_inline_links, term_links, event_visuals, item_visuals=item_visuals), navigation_events
    if guide.get("story_topology") is not None:
        timeline = render_story_layout(_prefixed_topology(guide), fragments)
    else:
        timeline = "\n".join(rows)
    timeline = render_legend((presentation or {}).get("legend")) + timeline
    return timeline, navigation_events


def render_perspective_story_views(
    guides: list[dict],
    event_visuals: dict[str, str],
    *,
    main_first_scene_id: str,
    render_inline_links,
    term_links,
    safe_url,
    safe_site_asset,
    presentation=None,
    main_scene_numbers=None,
) -> tuple[str, str]:
    """Return the view switch and inert templates for perspective timelines."""
    perspectives = [guide for guide in guides if guide["kind"] == "perspective"]
    if not perspectives:
        return "", ""
    main_presentation = (presentation or {}).get("main_view", {})
    links = [
        '<a href="#story" data-story-view-link="main" '
        f'data-story-view-first="{html.escape(main_first_scene_id, quote=True)}" aria-current="page">'
        f'<small>{html.escape(main_presentation.get("eyebrow", "본편"))}</small>'
        f'<strong>{html.escape(main_presentation.get("title", "사건 순서"))}</strong></a>'
    ]
    templates = []
    for guide in perspectives:
        key = _view_key(guide)
        view_presentation = (presentation or {}).get("perspective_views", {}).get(guide["id"], {})
        timeline_html, navigation_events = _perspective_rows(
            guide,
            event_visuals,
            render_inline_links=render_inline_links,
            term_links=term_links,
            safe_url=safe_url,
            safe_site_asset=safe_site_asset,
            presentation=view_presentation,
            main_scene_numbers=main_scene_numbers,
        )
        first = f'{key}-map' if guide.get("time_map") is not None else navigation_events[0]["id"]
        layout = "map" if guide.get("time_map") is not None else ("tree" if guide.get("story_topology") is not None else "linear")
        links.append(
            f'<a href="#story" data-story-view-link="{html.escape(key, quote=True)}" '
            f'data-story-view-first="{html.escape(first, quote=True)}">'
            f'<small>{html.escape(view_presentation.get("eyebrow", "인물"))}</small>'
            f'<strong>{html.escape(guide["title"])}</strong></a>'
        )
        navigation_topology = (
            _prefixed_topology(guide)
            if guide.get("story_topology") is not None else None
        )
        navigation = "" if layout == "map" else render_scene_navigation(navigation_events, navigation_topology)
        templates.append(
            f'<template data-story-view-navigation="{html.escape(key, quote=True)}">{navigation}</template>'
            f'<template data-story-view-timeline="{html.escape(key, quote=True)}" '
            f'data-story-view-layout="{layout}" '
            f'data-story-view-label="{html.escape(guide["title"], quote=True)}">{timeline_html}</template>'
        )
    switch = (
        '<nav class="story-view-switch" aria-label="타임라인 관점 선택">'
        '<div class="story-view-switch__heading"><span>읽는 방식</span>'
        f'<strong id="story-view-current">{html.escape(main_presentation.get("title", "본편 사건 순서"))}</strong></div>'
        f'<div class="story-view-switch__options">{"".join(links)}</div></nav>'
    )
    return switch, "".join(templates)
