"""Pure horizontal geometry for the existing, validated Elio story graph.

Coordinates are node centres. Labels remain plain data for the caller to escape;
only numeric coordinates and the fixed reader palette enter SVG path strings.
Ranks express graph/packing order, never elapsed time or replay timestamps.
"""

from __future__ import annotations

import heapq
from fractions import Fraction

from .story_layout import validate_story_layout


COLORS = ("#287f9d", "#8b63bb", "#c47d25", "#278778", "#b85979", "#576ead")
NEUTRAL_COLOR = "#718391"
X_STEP = 54
LANE_STEP = 62
HIT_SIZE = 44
PADDING = 28
PHASE_HEADER = 48


def _number(value: float) -> str:
    return f"{value:.3f}".rstrip("0").rstrip(".")


def _path(points: list[tuple[float, float]]) -> str:
    compact = []
    for point in points:
        if compact and point == compact[-1]:
            continue
        if len(compact) >= 2:
            first, second = compact[-2:]
            if first[0] == second[0] == point[0] or first[1] == second[1] == point[1]:
                compact.pop()
        compact.append(point)
    return " ".join(
        f"{'M' if index == 0 else 'L'} {_number(x)} {_number(y)}"
        for index, (x, y) in enumerate(compact)
    )


def _clear(points, obstacles) -> bool:
    """Keep all orthogonal segments outside unrelated 44px hit boxes."""
    radius = HIT_SIZE / 2
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        for node in obstacles:
            x, y = node["x"], node["y"]
            if x1 == x2:
                if abs(x1 - x) < radius and max(min(y1, y2), y - radius) < min(max(y1, y2), y + radius):
                    return False
            elif abs(y1 - y) < radius and max(min(x1, x2), x - radius) < min(max(x1, x2), x + radius):
                return False
    return True


def _shares_rail(points, other_paths) -> bool:
    """Unrelated edges may cross, but must not look like one merged rail."""
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        if (x1, y1) == (x2, y2):
            continue
        for other in other_paths:
            for (ox1, oy1), (ox2, oy2) in zip(other, other[1:]):
                if x1 == x2 == ox1 == ox2:
                    if max(min(y1, y2), min(oy1, oy2)) < min(max(y1, y2), max(oy1, oy2)):
                        return True
                elif y1 == y2 == oy1 == oy2:
                    if max(min(x1, x2), min(ox1, ox2)) < min(max(x1, x2), max(ox1, ox2)):
                        return True
    return False


def _ranks(group_ids, constraints):
    children = {group: set() for group in group_ids}
    indegrees = dict.fromkeys(group_ids, 0)
    for source, target in constraints:
        if source == target:
            raise ValueError("Minimap alignment joins connected scenes")
        children[source].add(target)
        indegrees[target] += 1
    ready = [group for group in group_ids if not indegrees[group]]
    heapq.heapify(ready)
    ranks = dict.fromkeys(group_ids, 0)
    visited = 0
    while ready:
        group = heapq.heappop(ready)
        visited += 1
        for child in sorted(children[group]):
            ranks[child] = max(ranks[child], ranks[group] + 1)
            indegrees[child] -= 1
            if not indegrees[child]:
                heapq.heappush(ready, child)
    if visited != len(group_ids):
        raise ValueError("Minimap phase or alignment constraints have a cycle")
    return ranks


def layout_scene_minimap(topology: dict, events, phases=()) -> dict:
    """Lay out v2 nodes in their existing reading order, with actual edges only.

    Explicit alignment groups share a rank without becoming story edges. Phase
    boundaries separate whole groups; they never become nodes or joins. The
    caller must escape labels and retain the story's spoiler/accessibility state.
    No input object is changed and no I/O is performed.
    """
    events = list(events)
    event_map = {event["id"]: event for event in events}
    if len(event_map) != len(events):
        raise ValueError("Minimap events must have unique IDs")
    if topology is None:
        raise ValueError("Minimap requires a validated v2 story topology")
    validate_story_layout(topology, event_map)
    rows = topology["nodes"]
    row_map = {row["event_id"]: row for row in rows}
    forward_edges = [edge for edge in topology["edges"] if edge.get("relation") != "return"]
    incoming = {ident: [] for ident in row_map}
    for edge in forward_edges:
        incoming[edge["to"]].append(edge["from"])

    phase_map = {}
    for phase in phases:
        if phase["id"] in phase_map:
            raise ValueError("Minimap phase IDs must be unique")
        phase_map[phase["id"]] = phase["label"]
    phase_for = {}
    phase_order = []
    for row in rows:
        ident = row["event_id"]
        phase_id = event_map[ident].get("phase_id") if phase_map else None
        if phase_id is not None and phase_id not in phase_map:
            raise ValueError("Minimap event references an unknown phase")
        if not phase_order or phase_id != phase_order[-1]:
            if phase_id in phase_order:
                raise ValueError("Minimap phases must be contiguous in reading order")
            phase_order.append(phase_id)
        phase_for[ident] = phase_id
    phase_index = {ident: index for index, ident in enumerate(phase_order)}

    groups = {row["event_id"]: index for index, row in enumerate(rows)}
    for alignment in topology["alignments"]:
        members = alignment["event_ids"]
        if len({phase_for[ident] for ident in members}) != 1:
            raise ValueError("Minimap alignment cannot cross a phase boundary")
        first = min(groups[ident] for ident in members)
        for ident in members:
            groups[ident] = first

    lane_count = max(row["lane_count"] for row in rows)
    authored_centres = {
        row["event_id"]: Fraction(2 * row["lane_index"] + 1, 2 * row["lane_count"])
        for row in rows
    }
    track_centres = {}
    for row in rows:
        track_centres.setdefault(row["track_id"], authored_centres[row["event_id"]])
    centres = {row["event_id"]: track_centres[row["track_id"]] for row in rows}
    # Body card lanes expand and contract as other branches appear. A minimap
    # track keeps its first baseline, so a continuing path does not imply a
    # branch merely because the body's lane_count changed. Explicit alignments
    # are stronger: a track may itself occupy parallel authored lanes. Restore
    # the authored centres for conflicting tracks rather than overlap targets
    # or reject an otherwise valid story. Recheck after each restoration because
    # it can affect another alignment containing the same track.
    restored_tracks = set()
    while True:
        conflicts = set()
        for alignment in topology["alignments"]:
            members = alignment["event_ids"]
            for index, first in enumerate(members):
                for second in members[index + 1:]:
                    if abs(centres[first] - centres[second]) * lane_count * LANE_STEP < HIT_SIZE:
                        conflicts.update((row_map[first]["track_id"], row_map[second]["track_id"]))
        conflicts -= restored_tracks
        if not conflicts:
            break
        restored_tracks.update(conflicts)
        for row in rows:
            if row["track_id"] in restored_tracks:
                centres[row["event_id"]] = authored_centres[row["event_id"]]
    lane_origin = min(centres.values())
    header = PHASE_HEADER if any(ident is not None for ident in phase_order) else 0
    ys = {
        ident: round(header + PADDING + float(centre - lane_origin) * lane_count * LANE_STEP, 3)
        for ident, centre in centres.items()
    }
    constraints = {(groups[edge["from"]], groups[edge["to"]]) for edge in forward_edges}
    for index, first in enumerate(rows):
        first_id = first["event_id"]
        for second in rows[index + 1:]:
            second_id = second["event_id"]
            if groups[first_id] == groups[second_id]:
                continue
            # These are packing constraints, not new semantic connections.
            phase_break = phase_index[phase_for[first_id]] < phase_index[phase_for[second_id]]
            authored_gap = abs(authored_centres[first_id] - authored_centres[second_id]) * lane_count * LANE_STEP
            if phase_break or authored_gap < HIT_SIZE:
                constraints.add((groups[first_id], groups[second_id]))

    group_ids = set(groups.values())
    baseline_ranks = _ranks(group_ids, constraints)
    # Stable rails can create a new collision with a node preceding an aligned
    # group. Preserve the already valid graph/author alignment order when adding
    # that packing constraint; raw row order could create an artificial cycle.
    for index, first in enumerate(rows):
        first_id = first["event_id"]
        for second in rows[index + 1:]:
            second_id = second["event_id"]
            if groups[first_id] != groups[second_id] and abs(ys[first_id] - ys[second_id]) < HIT_SIZE:
                ordered = sorted((groups[first_id], groups[second_id]), key=lambda group: (baseline_ranks[group], group))
                constraints.add(tuple(ordered))
    ranks = _ranks(group_ids, constraints)

    colors = {}
    tracks = []
    nodes = []
    color_index = 0
    for row in rows:
        ident, track = row["event_id"], row["track_id"]
        if track not in colors:
            # Exact story_tree_reader.js first-encounter rule, including roots
            # and joins on a one-lane or multi-lane track.
            colors[track] = NEUTRAL_COLOR if len(incoming[ident]) != 1 else COLORS[color_index % len(COLORS)]
            if len(incoming[ident]) == 1:
                color_index += 1
            tracks.append({"id": track, "label": row["track_label"], "color": colors[track]})
        nodes.append({
            "id": ident, "x": PADDING + X_STEP * ranks[groups[ident]], "y": ys[ident],
            "color": colors[track], "track_label": row["track_label"], "track_id": track,
        })
    positions = {node["id"]: node for node in nodes}
    maximum_y = max(node["y"] for node in nodes)
    height = maximum_y + PADDING
    edges = []
    routed = []
    detours = 0
    for edge_index, edge in enumerate(topology["edges"]):
        source, target = positions[edge["from"]], positions[edge["to"]]
        sx, sy, tx, ty = source["x"], source["y"], target["x"], target["y"]
        obstacles = [node for node in nodes if node["id"] not in (source["id"], target["id"])]
        endpoints = {source["id"], target["id"]}
        unrelated_paths = [path for ids, path in routed if not endpoints.intersection(ids)]
        points = None
        is_return = edge.get("relation") == "return"
        # Column gaps leave 10px between hit boxes. Try a clean in-graph elbow
        # before reserving a separate outer channel for a skipping connection.
        bends = list(range(int(sx + X_STEP / 2), int(tx), X_STEP))
        if len(incoming[target["id"]]) > 1:
            # A shorter branch keeps its rail until the actual join. A fork
            # still turns near its source so the new path is apparent early.
            bends.reverse()
        for bend in ([] if is_return else bends):
            candidate = [(sx, sy), (bend, sy), (bend, ty), (tx, ty)]
            if _clear(candidate, obstacles) and not _shares_rail(candidate, unrelated_paths):
                points = candidate
                break
        if points is None:
            channel_y = maximum_y + PADDING + detours * 12
            detours += 1
            # Outgoing and incoming channels use opposite halves of the 10px
            # column gap. Each edge has a distinct offset; separate skipping
            # paths cannot accidentally share a vertical segment or an elbow.
            offset = 1 + 3 * (edge_index + 1) / (len(topology["edges"]) + 1)
            exit_x = round(sx + HIT_SIZE / 2 + offset, 3)
            entry_x = round(tx - HIT_SIZE / 2 - offset, 3)
            points = [(sx, sy), (exit_x, sy), (exit_x, channel_y),
                      (entry_x, channel_y), (entry_x, ty),
                      (tx - HIT_SIZE / 2 if is_return else tx, ty)]
            height = max(height, channel_y + 16)
        routed.append((endpoints, points))
        same_track = source["track_id"] == target["track_id"]
        route = source if len(incoming[target["id"]]) > 1 and not same_track else target
        edges.append({"from": source["id"], "to": target["id"], "path": _path(points),
                      "color": "#93628e" if is_return else route["color"],
                      **({"relation": "return"} if is_return else {})})

    phase_rows = []
    for phase_id in phase_order:
        if phase_id is not None:
            first_x = min(node["x"] for node in nodes if phase_for[node["id"]] == phase_id)
            phase_rows.append({"id": phase_id, "label": phase_map[phase_id], "x": first_x - X_STEP / 2})
    return {
        "width": max(node["x"] for node in nodes) + PADDING,
        "height": height, "nodes": nodes, "edges": edges,
        "phases": phase_rows, "tracks": tracks,
    }
