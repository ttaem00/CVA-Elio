"""Validate and render Elio's optional nonlinear story overview."""

from __future__ import annotations

import html
import re
from pathlib import Path

from .story_layout import SCHEMA_VERSION as LAYOUT_SCHEMA_VERSION, validate_story_layout


SCHEMA_VERSION = "elio.story-topology.v1"
SUPPORTED_KINDS = {
    "parallel": ("동시 진행", "⇉"),
    "choice": ("선택 분기", "⑂"),
    "convergence": ("재합류", "⇥"),
    "uncertain": ("순서 미확정", "≈"),
    "alternate": ("대체 세계선", "◇"),
}
TOP_LEVEL_FIELDS = {"schema_version", "title", "summary", "groups"}
GROUP_FIELDS = {
    "id", "kind", "label", "summary", "time_label", "anchor_event_id",
    "rejoin_event_id", "lanes",
}
LANE_FIELDS = {"id", "label", "perspective", "condition", "event_ids"}
STABLE_ID_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def _text(value, *, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise ValueError(f"Story-topology {field} must be short non-empty text")
    return value.strip()


def _event_ref(value, *, field: str, event_ids: set[str]) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or value not in event_ids:
        raise ValueError(f"Story-topology {field} references an unknown event")
    return value


def validate_story_topology(value, event_ids: set[str]) -> dict | None:
    """Fail closed on ambiguous topology while keeping the feature optional."""
    if value is None:
        return None
    if isinstance(value, dict) and value.get("schema_version") == LAYOUT_SCHEMA_VERSION:
        return validate_story_layout(value, event_ids)
    if not isinstance(value, dict) or set(value) != TOP_LEVEL_FIELDS:
        raise ValueError("story_topology must use the canonical top-level fields")
    if value.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unknown story-topology schema")
    _text(value.get("title"), field="title", limit=100)
    _text(value.get("summary"), field="summary", limit=320)
    groups = value.get("groups")
    if not isinstance(groups, list) or not 1 <= len(groups) <= 8:
        raise ValueError("story_topology needs 1 to 8 relationship groups")

    group_ids: set[str] = set()
    memberships: dict[str, int] = {}
    for group in groups:
        if not isinstance(group, dict) or set(group) != GROUP_FIELDS:
            raise ValueError("Story-topology groups must use the canonical fields")
        group_id = group.get("id")
        if (
            not isinstance(group_id, str)
            or not STABLE_ID_RE.fullmatch(group_id)
            or group_id in group_ids
        ):
            raise ValueError("Story-topology group ids must be unique stable ids")
        kind = group.get("kind")
        if kind not in SUPPORTED_KINDS:
            raise ValueError("Unsupported story-topology relationship kind")
        _text(group.get("label"), field="group label", limit=100)
        _text(group.get("summary"), field="group summary", limit=360)
        _text(group.get("time_label"), field="time label", limit=80)
        anchor = _event_ref(
            group.get("anchor_event_id"), field="anchor_event_id", event_ids=event_ids,
        )
        rejoin = _event_ref(
            group.get("rejoin_event_id"), field="rejoin_event_id", event_ids=event_ids,
        )
        if kind == "choice" and anchor is None:
            raise ValueError("Choice topology groups require an anchor event")
        if kind == "convergence" and rejoin is None:
            raise ValueError("Convergence topology groups require a rejoin event")
        lanes = group.get("lanes")
        if not isinstance(lanes, list) or not 2 <= len(lanes) <= 4:
            raise ValueError("Story-topology groups need 2 to 4 lanes")
        lane_ids: set[str] = set()
        group_events: set[str] = set()
        for lane in lanes:
            if not isinstance(lane, dict) or set(lane) != LANE_FIELDS:
                raise ValueError("Story-topology lanes must use the canonical fields")
            lane_id = lane.get("id")
            if (
                not isinstance(lane_id, str)
                or not STABLE_ID_RE.fullmatch(lane_id)
                or lane_id in lane_ids
            ):
                raise ValueError("Story-topology lane ids must be unique within a group")
            _text(lane.get("label"), field="lane label", limit=80)
            _text(lane.get("perspective"), field="lane perspective", limit=100)
            _text(lane.get("condition"), field="lane condition", limit=100)
            lane_events = lane.get("event_ids")
            if not isinstance(lane_events, list) or not 1 <= len(lane_events) <= 6:
                raise ValueError("Story-topology lanes need 1 to 6 events")
            if any(not isinstance(event_id, str) or event_id not in event_ids for event_id in lane_events):
                raise ValueError("Story-topology lanes reference an unknown event")
            if len(set(lane_events)) != len(lane_events) or group_events.intersection(lane_events):
                raise ValueError("An event cannot appear twice within one topology group")
            if anchor in lane_events or rejoin in lane_events:
                raise ValueError("Anchor and rejoin events must stay outside topology lanes")
            for event_id in lane_events:
                memberships[event_id] = memberships.get(event_id, 0) + 1
                if memberships[event_id] > 3:
                    raise ValueError("An event cannot belong to more than three topology groups")
            group_events.update(lane_events)
            lane_ids.add(lane_id)
        group_ids.add(group_id)
    return value


def _event_link(event_id: str, event_map: dict[str, tuple[int, dict]]) -> str:
    number, event = event_map[event_id]
    return (
        f'<a class="story-topology__event" href="#{html.escape(event_id, quote=True)}">'
        f'<span>{number:02}</span><strong>{html.escape(event["title"])}</strong></a>'
    )


def _junction(role: str, event_id: str | None, event_map: dict[str, tuple[int, dict]]) -> str:
    if event_id is None:
        return ""
    labels = {"anchor": "갈림점", "rejoin": "다시 만나는 지점"}
    return (
        f'<div class="story-topology__junction story-topology__junction--{role}">'
        f'<span>{labels[role]}</span>{_event_link(event_id, event_map)}</div>'
    )


def render_story_topology(topology: dict | None, events: list[dict], term_links: list[dict], *, render_inline_links) -> str:
    if topology is None or topology.get("schema_version") == LAYOUT_SCHEMA_VERSION:
        return ""
    event_map = {event["id"]: (index, event) for index, event in enumerate(events, 1)}
    groups = []
    for group in topology["groups"]:
        label, symbol = SUPPORTED_KINDS[group["kind"]]
        lane_rows = []
        for lane in group["lanes"]:
            event_links = "".join(_event_link(event_id, event_map) for event_id in lane["event_ids"])
            lane_rows.append(
                '<article class="story-topology__lane" role="listitem">'
                f'<header><span>{html.escape(lane["condition"])}</span>'
                f'<strong>{html.escape(lane["label"])}</strong>'
                f'<small>{html.escape(lane["perspective"])}</small></header>'
                f'<div class="story-topology__sequence">{event_links}</div></article>'
            )
        group_id = html.escape(group["id"], quote=True)
        groups.append(
            f'<section id="topology-{group_id}" class="story-topology__group" '
            f'data-topology-kind="{group["kind"]}" aria-labelledby="topology-{group_id}-title">'
            '<header class="story-topology__group-head">'
            f'<span class="story-topology__kind"><b aria-hidden="true">{symbol}</b>{label}</span>'
            f'<span class="story-topology__time">{html.escape(group["time_label"])}</span>'
            f'<h3 id="topology-{group_id}-title">{html.escape(group["label"])}</h3>'
            f'<p>{render_inline_links(group["summary"], term_links)}</p></header>'
            f'{_junction("anchor", group["anchor_event_id"], event_map)}'
            f'<div class="story-topology__lanes" role="list">{"".join(lane_rows)}</div>'
            f'{_junction("rejoin", group["rejoin_event_id"], event_map)}</section>'
        )
    template = Path(__file__).with_name("story_topology.html").read_text(encoding="utf-8")
    return (
        template.replace("{{TITLE}}", html.escape(topology["title"]))
        .replace("{{SUMMARY}}", render_inline_links(topology["summary"], term_links))
        .replace("{{GROUPS}}", "".join(groups))
    )


def topology_event_badges(topology: dict | None) -> dict[str, str]:
    """Return compact back-links from detailed scenes to the overview."""
    if topology is None or topology.get("schema_version") == LAYOUT_SCHEMA_VERSION:
        return {}
    memberships: dict[str, list[tuple[str, str, str]]] = {}
    for group in topology["groups"]:
        kind_label, symbol = SUPPORTED_KINDS[group["kind"]]
        roles = [(group["anchor_event_id"], "갈림점"), (group["rejoin_event_id"], "재합류점")]
        roles.extend((event_id, kind_label) for lane in group["lanes"] for event_id in lane["event_ids"])
        for event_id, role in roles:
            if event_id:
                memberships.setdefault(event_id, []).append((group["id"], group["label"], f"{symbol} {role}"))
    return {
        event_id: '<nav class="scene-topology-tags" aria-label="이 장면의 서사 관계">' + "".join(
            f'<a href="#topology-{html.escape(group_id, quote=True)}" '
            f'aria-label="{html.escape(group_label, quote=True)} 관계도로 이동">{html.escape(role)}</a>'
            for group_id, group_label, role in rows
        ) + "</nav>"
        for event_id, rows in memberships.items()
    }
