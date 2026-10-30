"""Validate an optional story layout and wrap existing Elio event fragments.

Story time, replay clocks, and measured browser geometry have separate owners.
This module never parses a time label, invents a timestamp, or renders a scene.
"""

from __future__ import annotations

from collections import deque
from collections.abc import Iterable, Mapping
import html
import json
import math
import re

from .diagram_layout import validate_diagram_layout


SCHEMA_VERSION = "elio.story-topology.v2"
TOP_LEVEL_FIELDS = {"schema_version", "title", "summary", "nodes", "edges", "alignments"}
NODE_FIELDS = {
    "event_id", "track_id", "track_label", "condition", "lane_index",
    "lane_count", "lead", "time",
}
TIME_FIELDS = {"kind", "domain", "label", "value"}
EDGE_FIELDS = {"from", "to"}
EDGE_OPTIONAL_FIELDS = {"relation"}
EDGE_RELATIONS = {"sequence", "influence", "transfer", "return"}
ALIGNMENT_FIELDS = {"id", "kind", "label", "event_ids"}
STABLE_ID_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def _fields(value, expected: set[str], field: str) -> None:
    if not isinstance(value, dict) or set(value) != expected:
        raise ValueError(f"Story layout {field} must use the canonical fields")


def _text(value, field: str, limit: int, *, empty: bool = False) -> None:
    if (
        not isinstance(value, str)
        or (not empty and not value.strip())
        or len(value) > limit
        or any(
            ord(char) < 32 or 127 <= ord(char) <= 159 or 0xD800 <= ord(char) <= 0xDFFF
            for char in value
        )
    ):
        raise ValueError(f"Story layout {field} must be concise plain text")


def _stable_id(value, field: str) -> None:
    if not isinstance(value, str) or not STABLE_ID_RE.fullmatch(value):
        raise ValueError(f"Story layout {field} must be a stable id")


def _finite_number(value, field: str) -> None:
    try:
        # JSON crosses into JavaScript; avoid integer comparisons losing bits.
        valid = type(value) in (int, float) and math.isfinite(value) and abs(value) <= 2**53 - 1
    except OverflowError:
        valid = False
    if not valid:
        raise ValueError(f"Story layout {field} must be a finite number")


def _topological_order(ids: Iterable, edges: Iterable[tuple]) -> list:
    successors = {ident: set() for ident in ids}
    indegrees = dict.fromkeys(successors, 0)
    for source, target in edges:
        if target not in successors[source]:
            successors[source].add(target)
            indegrees[target] += 1
    ready = deque(ident for ident, degree in indegrees.items() if degree == 0)
    ordered = []
    while ready:
        ident = ready.popleft()
        ordered.append(ident)
        for target in successors[ident]:
            indegrees[target] -= 1
            if indegrees[target] == 0:
                ready.append(target)
    if len(ordered) != len(successors):
        raise ValueError("Story layout has a cycle or an alignment joins ancestor and descendant")
    return ordered


def _lanes_overlap(first: dict, second: dict) -> bool:
    # Compare exact rational intervals; lane 1/2 is not lane 1/3.
    first_left = first["lane_index"] * second["lane_count"]
    first_right = (first["lane_index"] + 1) * second["lane_count"]
    second_left = second["lane_index"] * first["lane_count"]
    second_right = (second["lane_index"] + 1) * first["lane_count"]
    return max(first_left, second_left) < min(first_right, second_right)


def _validate_chronology(nodes: dict[str, dict], edges: list[tuple[str, str]],
                         order: list[str], effective_times: dict[str, dict | None]) -> None:
    parents = {ident: [] for ident in nodes}
    for source, target in edges:
        parents[target].append(source)
    latest_by_node = {}
    for ident in order:
        latest = {}
        for parent in parents[ident]:
            for clock, value in latest_by_node[parent].items():
                latest[clock] = max(value, latest.get(clock, value))
        time = effective_times[ident]
        if time is not None and time["value"] is not None:
            clock = (time["domain"], time["kind"])
            previous = latest.get(clock)
            if previous is not None and time["value"] < previous:
                raise ValueError(f"Story layout event precedes its ancestor: {ident}")
            latest[clock] = time["value"]
        latest_by_node[ident] = latest


def validate_story_layout(value, event_ids: Iterable[str]) -> dict | None:
    """Return the original optional value; never reorder or normalize story data."""
    if value is None:
        return None
    if not isinstance(value, dict) or not TOP_LEVEL_FIELDS <= set(value) or set(value) - TOP_LEVEL_FIELDS - {"diagram_layout"}:
        raise ValueError("Story layout top level must use the canonical fields")
    if value["schema_version"] != SCHEMA_VERSION:
        raise ValueError("Unknown story layout schema")
    _text(value["title"], "title", 100)
    _text(value["summary"], "summary", 320)
    expected = set(event_ids)
    for ident in expected:
        _stable_id(ident, "existing event id")
    rows = value["nodes"]
    if not isinstance(rows, list) or not rows:
        raise ValueError("Story layout needs event nodes")
    nodes, tracks = {}, {}
    for node in rows:
        _fields(node, NODE_FIELDS, "node")
        ident = node["event_id"]
        _stable_id(ident, "event id")
        if ident in nodes:
            raise ValueError("Story layout event ids must be unique")
        _stable_id(node["track_id"], "track id")
        _text(node["track_label"], "track label", 80)
        _text(node["condition"], "condition", 100, empty=True)
        description = (node["track_label"], node["condition"])
        if tracks.setdefault(node["track_id"], description) != description:
            raise ValueError("Story layout track labels and conditions must be consistent")
        if type(node["lane_count"]) is not int or not 1 <= node["lane_count"] <= 4:
            raise ValueError("Story layout lane count must be an integer from 1 to 4")
        if type(node["lane_index"]) is not int or not 0 <= node["lane_index"] < node["lane_count"]:
            raise ValueError("Story layout lane index is out of range")
        _finite_number(node["lead"], "lead")
        if not 0 <= node["lead"] <= 6:
            raise ValueError("Story layout visual lead must be between 0 and 6")
        time = node["time"]
        if time is not None:
            _fields(time, TIME_FIELDS, "time")
            if time["kind"] not in ("time", "date", "order"):
                raise ValueError("Story layout time kind must be time, date, or order")
            _stable_id(time["domain"], "time domain")
            _text(time["label"], "time label", 100)
            if time["value"] is not None:
                _finite_number(time["value"], "time value")
        nodes[ident] = node
    if set(nodes) != expected:
        raise ValueError("Story layout nodes must cover all existing events exactly once")

    if not isinstance(value["edges"], list):
        raise ValueError("Story layout edges must be a list")
    edges, seen_edges = [], set()
    reading_index = {ident: index for index, ident in enumerate(nodes)}
    for edge in value["edges"]:
        if not isinstance(edge, dict) or not EDGE_FIELDS.issubset(edge) or set(edge) - (EDGE_FIELDS | EDGE_OPTIONAL_FIELDS):
            raise ValueError("Story layout edge must use the canonical fields")
        if edge.get("relation", "sequence") not in EDGE_RELATIONS:
            raise ValueError("Story layout edge relation is unsupported")
        pair = (edge["from"], edge["to"])
        if any(not isinstance(ident, str) or ident not in nodes for ident in pair):
            raise ValueError("Story layout edge references an unknown event")
        if pair in seen_edges:
            raise ValueError("Story layout edges must be unique")
        seen_edges.add(pair)
        if edge.get("relation") == "return":
            if reading_index[pair[0]] < reading_index[pair[1]]:
                raise ValueError("Story layout return must target the same or an earlier event")
            # An explicit causal return is not a forward reading/clock constraint.
            continue
        if reading_index[pair[0]] >= reading_index[pair[1]]:
            raise ValueError(
                f"Story layout reading order must place {pair[0]} before {pair[1]}"
            )
        edges.append(pair)
    order = _topological_order(nodes, edges)

    if not isinstance(value["alignments"], list):
        raise ValueError("Story layout alignments must be a list")
    alignment_ids, aligned = set(), set()
    components = {ident: ("event", ident) for ident in nodes}
    effective_times = {ident: node["time"] for ident, node in nodes.items()}
    for alignment in value["alignments"]:
        _fields(alignment, ALIGNMENT_FIELDS, "alignment")
        _stable_id(alignment["id"], "alignment id")
        if alignment["id"] in alignment_ids:
            raise ValueError("Story layout alignment ids must be unique")
        alignment_ids.add(alignment["id"])
        if alignment["kind"] not in ("simultaneous", "layout"):
            raise ValueError("Story layout alignment kind is unsupported")
        _text(alignment["label"], "alignment label", 100)
        members = alignment["event_ids"]
        if not isinstance(members, list) or len(members) < 2:
            raise ValueError("Story layout alignment needs at least two events")
        if any(not isinstance(ident, str) or ident not in nodes for ident in members):
            raise ValueError("Story layout alignment references an unknown event")
        if len(set(members)) != len(members) or aligned.intersection(members):
            raise ValueError("Story layout alignment groups must be disjoint")
        for index, ident in enumerate(members):
            if any(_lanes_overlap(nodes[ident], nodes[other]) for other in members[:index]):
                raise ValueError("Story layout aligned horizontal lanes must not overlap")
            components[ident] = ("alignment", alignment["id"])
        aligned.update(members)
        if alignment["kind"] == "simultaneous":
            times = [nodes[ident]["time"] for ident in members]
            supplied = [time for time in times if time is not None]
            if supplied and len(supplied) != len(times):
                raise ValueError("Simultaneous events must all declare a clock or all omit time")
            if supplied:
                clocks = {(time["domain"], time["kind"]) for time in supplied}
                known = {time["value"] for time in supplied if time["value"] is not None}
                if len(clocks) != 1 or len(known) > 1:
                    raise ValueError("Simultaneous events require compatible clocks and values")
                if known:
                    shared_value = next(iter(known))
                    for ident in members:
                        effective_times[ident] = {**nodes[ident]["time"], "value": shared_value}
    _validate_chronology(nodes, edges, order, effective_times)
    constraints = {(components[source], components[target]) for source, target in edges}
    for index, first in enumerate(rows):
        first_id = first["event_id"]
        for second in rows[index + 1:]:
            second_id = second["event_id"]
            first_group, second_group = components[first_id], components[second_id]
            if first_group == second_group:
                continue
            # Collision and clock ordering constrain packing, not story paths.
            if _lanes_overlap(first, second):
                constraints.add((first_group, second_group))
            first_time, second_time = effective_times[first_id], effective_times[second_id]
            if (
                first_time is not None and second_time is not None
                and first_time["value"] is not None and second_time["value"] is not None
                and (first_time["domain"], first_time["kind"])
                == (second_time["domain"], second_time["kind"])
            ):
                if first_time["value"] < second_time["value"]:
                    constraints.add((first_group, second_group))
                elif first_time["value"] > second_time["value"]:
                    constraints.add((second_group, first_group))
    _topological_order(dict.fromkeys(components.values()), constraints)
    if "diagram_layout" in value:
        validate_diagram_layout(value["diagram_layout"], node_ids=nodes, edges=value["edges"])
    return value


def _safe_json(value: dict) -> str:
    serialized = json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    for character, escaped in (
        ("&", "\\u0026"), ("<", "\\u003c"), (">", "\\u003e"),
        ("\u2028", "\\u2028"), ("\u2029", "\\u2029"),
    ):
        serialized = serialized.replace(character, escaped)
    return serialized


def render_story_layout(topology: dict | None, event_fragments: Mapping[str, str]) -> str:
    """Wrap trusted renderer output once per event; escape all author metadata."""
    if topology is None:
        return ""
    validate_story_layout(topology, event_fragments.keys())
    if any(not isinstance(fragment, str) for fragment in event_fragments.values()):
        raise ValueError("Story layout requires pre-rendered event fragments")
    esc = html.escape
    alignments = {
        ident: group for group in topology["alignments"] for ident in group["event_ids"]
    }
    numbers = {node["event_id"]: index for index, node in enumerate(topology["nodes"], 1)}
    predecessors = {ident: [] for ident in numbers}
    returns = {ident: [] for ident in numbers}
    for edge in topology["edges"]:
        if edge.get("relation") == "return":
            returns[edge["from"]].append(edge["to"])
        else:
            predecessors[edge["to"]].append(edge["from"])
    rows = []
    for node in topology["nodes"]:
        ident, time = node["event_id"], node["time"]
        metadata = [f'<span class="story-tree__track">{esc(node["track_label"])}</span>']
        if node["condition"]:
            metadata.append(f'<span class="story-tree__condition">{esc(node["condition"])}</span>')
        if time is not None:
            metadata.append(
                f'<span class="story-tree__time" data-time-kind="{time["kind"]}" '
                f'data-time-domain="{esc(time["domain"], quote=True)}">{esc(time["label"])}</span>'
            )
        group = alignments.get(ident)
        if group and group["kind"] == "simultaneous":
            metadata.append(
                f'<span class="story-tree__alignment" data-alignment-kind="{group["kind"]}">'
                f'같은 시각 · {esc(group["label"])}</span>'
            )
        relations = ""
        if predecessors[ident] or returns[ident]:
            links = "".join(
                f'<a href="#{esc(source, quote=True)}">이전 경로 {numbers[source]:02}</a>'
                for source in predecessors[ident]
            )
            links += "".join(
                f'<a class="story-tree__return-link" href="#{esc(target, quote=True)}">'
                f'↶ 인과가 돌아가는 장면 {numbers[target]:02}</a>'
                for target in returns[ident]
            )
            relations = (
                '<nav class="story-tree__relations" aria-label="이 장면의 연결 경로">'
                f'{links}</nav>'
            )
        rows.append(
            f'<div class="story-tree__node" data-event-id="{esc(ident, quote=True)}" '
            f'data-track-id="{esc(node["track_id"], quote=True)}" '
            f'data-lane-index="{node["lane_index"]}" data-lane-count="{node["lane_count"]}" '
            f'data-lead="{node["lead"]}"><div class="story-tree__meta">'
            f'{"".join(metadata)}</div>{relations}{event_fragments[ident]}</div>'
        )
    payload = {key: topology[key] for key in ("nodes", "edges", "alignments")}
    if "diagram_layout" in topology:
        payload["diagram_layout"] = topology["diagram_layout"]
    return (
        f'<div class="story-tree" data-story-layout="{SCHEMA_VERSION}" '
        f'aria-label="{esc(topology["title"], quote=True)}">'
        '<svg class="story-tree__edges" aria-hidden="true" focusable="false"></svg>'
        f'<div class="story-tree__nodes">{"".join(rows)}</div>'
        f'<script type="application/json" class="story-tree__data">{_safe_json(payload)}</script>'
        '</div>'
    )
