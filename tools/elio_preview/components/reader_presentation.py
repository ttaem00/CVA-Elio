"""Validate reader-facing labels and scene transition aids.

Story evidence stays in ``story.json`` events and guides. This optional block
only controls how the same evidence is explained while the reader switches
between broadcast order and a spoiler-complete causal view.
"""

from __future__ import annotations

import html
import re


_STABLE_ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_TOP_FIELDS = {
    "main_view", "perspective_views", "transitions", "scene_links",
    "quote_labels", "preserve_line_breaks",
}
_OPTIONAL_TOP_FIELDS = {"text_only_scenes", "entry_scene", "experience"}
_MAIN_FIELDS = {"eyebrow", "title"}
_VIEW_FIELDS = {"eyebrow", "item_label", "legend"}
_LEGEND_FIELDS = {"title", "summary", "entries", "route"}
_LEGEND_ENTRY_FIELDS = {"relation", "label"}
_TRANSITION_FIELDS = {"event_id", "kind", "title", "summary"}
_SCENE_LINK_FIELDS = {
    "event_id", "guide_id", "item_id", "label", "spoiler_label",
}
_RELATIONS = {"sequence", "influence", "transfer"}


def _plain_text(value, field: str, limit: int) -> str:
    if (
        not isinstance(value, str)
        or not value.strip()
        or len(value) > limit
        or any(ord(char) < 32 for char in value)
    ):
        raise ValueError(f"Reader presentation {field} must be concise plain text")
    return value


def _exact_fields(value, fields: set[str], field: str) -> None:
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError(f"Reader presentation {field} must use canonical fields")


def validate_reader_presentation(value, *, event_ids, guide_items) -> dict:
    """Return a validated optional presentation block without normalizing it."""
    if value is None:
        return {}
    if (
        not isinstance(value, dict)
        or (not _TOP_FIELDS <= set(value) and not set(value) <= {"entry_scene", "experience"})
        or set(value) - (_TOP_FIELDS | _OPTIONAL_TOP_FIELDS)
    ):
        raise ValueError("Reader presentation top level must use canonical fields")
    known_events = set(event_ids)
    known_guides = {str(key): set(items) for key, items in guide_items.items()}

    if "entry_scene" in value and value["entry_scene"] != "memory_tape":
        raise ValueError("Reader presentation entry_scene must be memory_tape")
    if "experience" in value:
        from .reader_experience import validate_experience
        validate_experience(value["experience"])
    if not _TOP_FIELDS <= set(value):
        return value

    text_only_scenes = value.get("text_only_scenes", {})
    if not isinstance(text_only_scenes, dict) or set(text_only_scenes) - known_events:
        raise ValueError("Reader presentation text-only scenes name unknown events")
    for note in text_only_scenes.values():
        _plain_text(note, "text-only scene note", 160)

    main = value["main_view"]
    _exact_fields(main, _MAIN_FIELDS, "main view")
    _plain_text(main["eyebrow"], "main eyebrow", 80)
    _plain_text(main["title"], "main title", 80)

    views = value["perspective_views"]
    if not isinstance(views, dict) or set(views) - set(known_guides):
        raise ValueError("Reader presentation names an unknown perspective guide")
    for guide_id, view in views.items():
        _exact_fields(view, _VIEW_FIELDS, f"perspective view {guide_id}")
        _plain_text(view["eyebrow"], "perspective eyebrow", 100)
        _plain_text(view["item_label"], "perspective item label", 24)
        legend = view["legend"]
        _exact_fields(legend, _LEGEND_FIELDS, "legend")
        _plain_text(legend["title"], "legend title", 160)
        _plain_text(legend["summary"], "legend summary", 400)
        _plain_text(legend["route"], "legend route", 400)
        entries = legend["entries"]
        if not isinstance(entries, list) or not 1 <= len(entries) <= 4:
            raise ValueError("Reader presentation legend needs 1 to 4 entries")
        relations = set()
        for entry in entries:
            _exact_fields(entry, _LEGEND_ENTRY_FIELDS, "legend entry")
            if entry["relation"] not in _RELATIONS or entry["relation"] in relations:
                raise ValueError("Reader presentation legend relations must be unique and known")
            relations.add(entry["relation"])
            _plain_text(entry["label"], "legend label", 120)

    transitions = value["transitions"]
    if not isinstance(transitions, list) or len(transitions) > len(known_events):
        raise ValueError("Reader presentation transitions are invalid")
    transition_events = set()
    for row in transitions:
        _exact_fields(row, _TRANSITION_FIELDS, "transition")
        event_id = row["event_id"]
        if event_id not in known_events or event_id in transition_events:
            raise ValueError("Reader presentation transitions need unique known events")
        transition_events.add(event_id)
        if not isinstance(row["kind"], str) or not _STABLE_ID.fullmatch(row["kind"]):
            raise ValueError("Reader presentation transition kind must be a stable id")
        _plain_text(row["title"], "transition title", 100)
        _plain_text(row["summary"], "transition summary", 400)

    scene_links = value["scene_links"]
    if not isinstance(scene_links, list) or len(scene_links) > len(known_events):
        raise ValueError("Reader presentation scene links are invalid")
    linked_events = set()
    for row in scene_links:
        _exact_fields(row, _SCENE_LINK_FIELDS, "scene link")
        event_id, guide_id, item_id = row["event_id"], row["guide_id"], row["item_id"]
        if event_id not in known_events or event_id in linked_events:
            raise ValueError("Reader presentation scene links need unique known events")
        if guide_id not in known_guides or item_id not in known_guides[guide_id]:
            raise ValueError("Reader presentation scene link target is unknown")
        if not isinstance(item_id, str) or not _STABLE_ID.fullmatch(item_id):
            raise ValueError("Reader presentation scene link target must be a stable id")
        linked_events.add(event_id)
        _plain_text(row["label"], "scene link label", 100)
        if row["spoiler_label"] != "":
            _plain_text(row["spoiler_label"], "scene link spoiler label", 80)

    quote_labels = value["quote_labels"]
    if not isinstance(quote_labels, dict) or set(quote_labels) - known_events:
        raise ValueError("Reader presentation quote labels name unknown events")
    for label in quote_labels.values():
        _plain_text(label, "quote label", 80)

    preserved = value["preserve_line_breaks"]
    if (
        not isinstance(preserved, list)
        or len(preserved) != len(set(preserved))
        or any(event_id not in known_events for event_id in preserved)
    ):
        raise ValueError("Reader presentation line-break events must be unique known events")
    return value


def render_transition(row: dict | None) -> str:
    if not row:
        return ""
    esc = html.escape
    return (
        f'<p class="reading-time-note" data-transition-kind="{esc(row["kind"], quote=True)}">'
        f'<strong>{esc(row["title"])}</strong><span>{esc(row["summary"])}</span></p>'
    )


def render_scene_link(row: dict | None) -> str:
    if not row:
        return ""
    esc = html.escape
    guide_id = esc(row["guide_id"], quote=True)
    item_id = esc(row["item_id"], quote=True)
    warning = f'<small>{esc(row["spoiler_label"])}</small>' if row['spoiler_label'] else ''
    return (
        f'<a class="reader-guide__scene chronology-location-link" '
        f'href="?story=perspective-{guide_id}#perspective-{guide_id}-{item_id}">'
        f'<span>{esc(row["label"])}</span>{warning}</a>'
    )


def render_legend(legend: dict | None) -> str:
    if not legend:
        return ""
    esc = html.escape
    entries = "".join(
        f'<li><i class="story-{esc(row["relation"], quote=True)}"></i>{esc(row["label"])}</li>'
        for row in legend["entries"]
    )
    return (
        '<aside class="chronology-key" aria-label="이야기 읽는 법">'
        f'<strong>{esc(legend["title"])}</strong><p>{esc(legend["summary"])}</p>'
        f'<ul>{entries}</ul><p class="chronology-key__route">{esc(legend["route"])}</p></aside>'
    )
