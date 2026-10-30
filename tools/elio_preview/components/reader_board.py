"""Project authored reader views into the existing Board input, without editing stories."""
from __future__ import annotations

from copy import deepcopy
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .diagram_layout import remap_diagram_layout, trim_diagram_layout
from .perspective_timeline import _item_id, _prefixed_topology


_COLORS = ("#26766e", "#74609a", "#96712e", "#427b99")
_IMAGE_FIELDS = ("image_site_asset", "image_url", "image_alt", "image_caption", "image_source_url")
_NUMBERED_ACT = re.compile(r"(?:^|-)act\d+(?:-|$)", re.IGNORECASE)


def _scoped(unit_id: str, kind: str, ident: str) -> str:
    # Length framing disambiguates IDs that already contain another unit's prefix.
    return f"u{len(unit_id)}-{unit_id}-{kind}{len(ident)}-{ident}"


def _perspective_url(base: str, guide_id: str, anchor: str) -> str:
    parts = urlsplit(base)
    query = [(key, value) for key, value in parse_qsl(parts.query) if key != "story"]
    query.append(("story", f"perspective-{guide_id}"))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), anchor))


def add_perspective_views(board: dict, story: dict) -> dict:
    """Add the reader's authored maps as separate views; keep the main overview intact."""
    result = deepcopy(board)
    result["overview_event_ids"] = list(board.get("overview_event_ids", [e["id"] for e in board["events"]]))
    by_event = {event["id"]: event for event in board["events"]}
    used_events = set(by_event)
    used_views = {view["id"] for view in result.get("views", [])}
    unit_id = story["unit_id"]
    chapter = next((row for row in result["chapters"] if row["id"] == unit_id), result["chapters"][0])
    reader = board.get("reader_url") or f"/storytimeline/{story['work_id']}/{unit_id}/"
    main_view = next((row for row in result["views"] if row["id"] == unit_id), result["views"][0])
    if story.get("phases"):
        main_view["phases"] = []
        for phase in story["phases"]:
            view_id = f"phase-{phase['id']}"
            if view_id in used_views:
                raise ValueError(f"Reader Board view ID already exists: {view_id}")
            used_views.add(view_id)
            event_ids = [ident for ident in main_view["event_ids"]
                         if by_event[ident].get("phase_id") == phase["id"]]
            main_view["phases"].append({"id": phase["id"], "label": phase["label"],
                                       "summary": phase.get("summary", ""), "event_ids": event_ids,
                                       "view_id": view_id})
            result["views"].append({"id": view_id, "chapter_id": chapter["id"], "title": phase["label"],
                                    "protagonists": list(dict.fromkeys(person for ident in event_ids
                                                                      for person in by_event[ident]["protagonists"])),
                                    "event_ids": event_ids, "parent_view_id": main_view["id"],
                                    "reading_sequence": True,
                                    "reader_url": by_event[event_ids[0]].get("reader_url") or
                                        urlunsplit(urlsplit(reader)._replace(fragment=event_ids[0]))})
    transitions = story.get("reader_presentation", {}).get("transitions", [])
    if transitions:
        main_view["transitions"] = [{key: deepcopy(row[key]) for key in ("event_id", "kind", "title", "summary")}
                                    for row in transitions if row["event_id"] in main_view["event_ids"]]

    for guide in story.get("reader_guides", []):
        if guide.get("kind") != "perspective" or not (guide.get("time_map") or guide.get("story_topology")):
            continue
        guide_id = guide["id"]
        view_id = f"perspective-{guide_id}"
        if view_id in used_views:
            raise ValueError(f"Reader Board view ID already exists: {view_id}")
        used_views.add(view_id)
        items = {item["id"]: (number, item) for number, item in enumerate(guide["items"], 1)}
        track_prefix = f"{view_id}-"

        if guide.get("time_map"):
            source_map = guide["time_map"]
            map_ids = {node["id"]: f"{view_id}-node-{node['id']}" for node in source_map["nodes"]}
            view_items = [(map_ids[node["id"]], node["item_id"]) for node in source_map["nodes"]]
            nodes = [{"event_id": map_ids[node["id"]],
                      "track_id": f"{track_prefix}lane-{node['lane']}",
                      "track_label": source_map["lanes"][node["lane"]], "condition": "",
                      "lane_index": node["lane"], "lane_count": len(source_map["lanes"]),
                      "lead": 0, "time": None} for node in source_map["nodes"]]
            order = {node["event_id"]: index for index, node in enumerate(nodes)}
            edges, conditions = [], {}
            relations = {"life": "sequence", "world": "influence", "actor-a": "transfer", "actor-b": "transfer"}
            for edge in source_map["edges"]:
                start, end = map_ids[edge["from"]], map_ids[edge["to"]]
                relation = "return" if order[start] >= order[end] else relations[edge["kind"]]
                edges.append({"from": start, "to": end, "relation": relation})
                conditions[f"{start}->{end}"] = edge["label"]
            graph = {"schema_version": "elio.story-topology.v2", "title": source_map["title"],
                     "summary": source_map["summary"], "nodes": nodes, "edges": edges, "alignments": []}
        else:
            graph = deepcopy(_prefixed_topology(guide))
            for node in graph["nodes"]:
                node["track_id"] = track_prefix + node["track_id"]
                node.setdefault("time", None)
            projected_ids = {_id: _item_id(guide, number, item) for _id, (number, item) in items.items()}
            by_projected = {value: ident for ident, value in projected_ids.items()}
            view_items = [(node["event_id"], by_projected[node["event_id"]]) for node in graph["nodes"]]
            target_nodes = {node["event_id"]: node for node in graph["nodes"]}
            conditions = {f"{edge['from']}->{edge['to']}":
                          target_nodes[edge["to"]]["condition"] or "다음 장면"
                          for edge in graph["edges"]}

        if used_events.intersection(ident for ident, _ in view_items):
            raise ValueError(f"Reader Board perspective event ID already exists: {guide_id}")
        node_by_id = {node["event_id"]: node for node in graph["nodes"]}
        people = {}
        new_events = []
        for event_id, ident in view_items:
            number, item = items[ident]
            node = node_by_id[event_id]
            people.setdefault(node["track_id"], node["track_label"])
            event = {"id": event_id, "title": item["title"], "summary": item["summary"],
                     "chapter_id": chapter["id"], "kind": "scene", "spoiler": False,
                     "protagonists": [node["track_id"]], "source_ids": list(chapter["source_ids"]),
                     "perspective_id": guide_id, "perspective_item_id": ident,
                     "evidence_state": item.get("evidence_state", "interpretation"),
                     "reader_url": _perspective_url(reader, guide_id, _item_id(guide, number, item))}
            if item.get("related_event_id"):
                event["related_event_id"] = item["related_event_id"]
            image = item if item.get("image_site_asset") or item.get("image_url") else by_event.get(item.get("image_event_id"), {})
            for key in _IMAGE_FIELDS:
                if image.get(key):
                    event[key] = image[key]
            new_events.append(event)
            if guide.get("time_map"):
                original_node = next(row for row in source_map["nodes"] if map_ids[row["id"]] == event_id)
                event["map_context"] = " · ".join((source_map["eras"][original_node["era"]], source_map["lanes"][original_node["lane"]]))
                event["map_label"] = original_node["label"]
        result["events"].extend(new_events)
        used_events.update(event["id"] for event in new_events)
        result["protagonists"].extend({"id": ident, "name": name, "role": "이 이야기의 경로·시점",
                                       "color": _COLORS[index % len(_COLORS)]}
                                      for index, (ident, name) in enumerate(people.items()))
        result["story_topology"]["nodes"].extend(graph["nodes"])
        result["story_topology"]["edges"].extend(graph["edges"])
        result["story_topology"]["alignments"].extend(graph["alignments"])
        result["edge_conditions"].update(conditions)
        view = {"id": view_id, "chapter_id": chapter["id"], "title": guide["title"],
                "unit_id": unit_id, "perspective_id": guide_id, "protagonists": list(people),
                "event_ids": [node["event_id"] for node in graph["nodes"]],
                "reader_url": _perspective_url(reader, guide_id,
                    f"{view_id}-map" if guide.get("time_map") else graph["nodes"][0]["event_id"]),
                "story_topology": deepcopy(graph)}
        if guide.get("time_map"):
            view["time_map"] = deepcopy(guide["time_map"])
        result.setdefault("views", []).append(view)
    return result


def _remap_graph(graph: dict, event_ids: dict, track_ids: dict, unit_id: str) -> dict:
    result = deepcopy(graph)
    for node in result["nodes"]:
        node["event_id"] = event_ids[node["event_id"]]
        node["track_id"] = track_ids[node["track_id"]]
        if node.get("time"):
            node["time"]["domain"] = _scoped(unit_id, "clock", node["time"]["domain"])
    for edge in result["edges"]:
        edge["from"], edge["to"] = event_ids[edge["from"]], event_ids[edge["to"]]
    for group in result["alignments"]:
        group["id"] = _scoped(unit_id, "alignment", group["id"])
        group["event_ids"] = [event_ids[ident] for ident in group["event_ids"]]
    if "diagram_layout" in graph:
        result["diagram_layout"] = remap_diagram_layout(graph["diagram_layout"], event_ids)
    return result


def chapter_prefix(documents: list[dict], through_unit_id: str, chapter_label: str) -> dict:
    """Compose only the inclusive entry prefix; future documents are never inspected."""
    prefix = []
    for descriptor in documents:
        prefix.append(descriptor)
        if descriptor["unit_id"] == through_unit_id:
            break
    if not prefix or prefix[-1]["unit_id"] != through_unit_id:
        raise ValueError("The entry unit is not in this chapter")
    # Use the catalogue's numbered-act convention for main-act entry boards.
    # Separate prologues, epilogues and side stories keep their own reader units.
    if _NUMBERED_ACT.search(through_unit_id):
        prefix = [row for row in prefix if _NUMBERED_ACT.search(row["unit_id"])]
    if len({row["unit_id"] for row in prefix}) != len(prefix):
        raise ValueError("Chapter unit IDs must be unique")
    first, entry = prefix[0]["document"], prefix[-1]["document"]
    if any(row["document"]["work_id"] != first["work_id"] for row in prefix):
        raise ValueError("A chapter prefix must belong to one work")
    entry_label = entry.get("reader_context", {}).get("unit_label") or next(
        (row["title"] for row in entry["chapters"] if row["id"] == through_unit_id), entry["chapters"][0]["title"])
    return_url = entry.get("reader_url") or f"/storytimeline/{first['work_id']}/{through_unit_id}/"
    result = {"schema_version": "elio.board.v1", "work_id": first["work_id"], "title": first["title"],
              "subtitle": entry["subtitle"], "material_type": first.get("material_type", "unverified"),
              "coverage": {**deepcopy(entry["coverage"]), "index": f"{chapter_label} · {entry_label}까지"},
              "sources": [], "protagonists": [], "chapters": [], "events": [], "views": [],
              "story_topology": {"schema_version": "elio.story-topology.v2", "title": chapter_label,
                                 "summary": entry["story_topology"]["summary"], "nodes": [], "edges": [], "alignments": []},
              "edge_conditions": {}, "provenance": {"events": {}, "edges": {}}, "annotations": {},
              "display_groups": [], "overview_event_ids": [], "reader_url": return_url,
              "reader_context": {"unit_id": through_unit_id, "unit_label": entry_label,
                                 "chapter_label": chapter_label, "through_label": entry_label, "return_url": return_url}}
    if "board_presentation" in entry:
        result["board_presentation"] = deepcopy(entry["board_presentation"])
    view_ids = set()
    chapter_order = 0
    for descriptor in prefix:
        unit_id, document = descriptor["unit_id"], descriptor["document"]
        events = {row["id"]: _scoped(unit_id, "event", row["id"]) for row in document["events"]}
        sources = {row["id"]: _scoped(unit_id, "source", row["id"]) for row in document["sources"]}
        people = {row["id"]: _scoped(unit_id, "track", row["id"]) for row in document["protagonists"]}
        chapters = {row["id"]: _scoped(unit_id, "chapter", row["id"]) for row in document["chapters"]}
        phases = {phase["id"]: _scoped(unit_id, "phase", phase["id"])
                  for row in document["views"] for phase in row.get("phases", [])}
        tracks = {row["track_id"]: _scoped(unit_id, "track", row["track_id"])
                  for row in document["story_topology"]["nodes"]}
        for field, mapping in (("sources", sources), ("protagonists", people)):
            for row in document[field]:
                result[field].append({**deepcopy(row), "id": mapping[row["id"]]})
        for row in document["chapters"]:
            chapter_order += 1
            result["chapters"].append({**deepcopy(row), "id": chapters[row["id"]], "order": chapter_order,
                                        "source_ids": [sources[ident] for ident in row["source_ids"]],
                                        "protagonists": [people[ident] for ident in row["protagonists"]]})
        for row in document["events"]:
            event = {**deepcopy(row), "id": events[row["id"]], "original_event_id": row["id"],
                     "unit_id": unit_id, "chapter_id": chapters[row["chapter_id"]],
                     "source_ids": [sources[ident] for ident in row["source_ids"]],
                     "protagonists": [people[ident] for ident in row["protagonists"]]}
            if row.get("related_event_id") in events:
                event["related_event_id"] = events[row["related_event_id"]]
            if row.get("phase_id") in phases:
                event["phase_id"] = phases[row["phase_id"]]
            result["events"].append(event)
        graph = _remap_graph(document["story_topology"], events, tracks, unit_id)
        for key in ("nodes", "edges", "alignments"):
            result["story_topology"][key].extend(graph[key])
        for key, condition in document["edge_conditions"].items():
            start, end = key.split("->", 1)
            result["edge_conditions"][f"{events[start]}->{events[end]}"] = condition
        main_ids = document.get("overview_event_ids", [row["id"] for row in document["events"]])
        main_ids = [events[ident] for ident in main_ids]
        result["overview_event_ids"].extend(main_ids)
        main_view = next((row for row in document["views"] if row["id"] == unit_id), document["views"][0])
        unit_label = next((row["title"] for row in document["chapters"] if row["id"] == main_view.get("chapter_id")), main_view["title"])
        mapped_views = {}
        unit_views = []
        for row in document["views"]:
            perspective_id = row.get("perspective_id")
            view_id = f"{unit_id}-perspective-{perspective_id}" if perspective_id else (
                unit_id if row is main_view else _scoped(unit_id, "view", row["id"]))
            if view_id in view_ids:
                raise ValueError(f"Chapter Board view ID already exists: {view_id}")
            view_ids.add(view_id)
            mapped_views[row["id"]] = view_id
            view = {**deepcopy(row), "id": view_id, "original_view_id": row["id"], "unit_id": unit_id,
                    "chapter_id": chapters.get(row.get("chapter_id")),
                    "event_ids": [events[ident] for ident in row["event_ids"]],
                    "protagonists": [people[ident] for ident in row["protagonists"]]}
            view.setdefault("reader_url", document.get("reader_url") or f"/storytimeline/{document['work_id']}/{unit_id}/")
            if row.get("story_topology"):
                view["story_topology"] = _remap_graph(row["story_topology"], events, tracks, unit_id)
            if "phases" in row:
                view["phases"] = [{**deepcopy(phase), "id": phases[phase["id"]],
                                    "event_ids": [events[ident] for ident in phase["event_ids"]]}
                                   for phase in row["phases"]]
            if "transitions" in row:
                view["transitions"] = [{**deepcopy(transition), "event_id": events[transition["event_id"]]}
                                        for transition in row["transitions"]]
            result["views"].append(view)
            unit_views.append(view)
        for view in unit_views:
            if "parent_view_id" in view:
                view["parent_view_id"] = mapped_views[view["parent_view_id"]]
            for phase in view.get("phases", []):
                phase["view_id"] = mapped_views[phase["view_id"]]
        result["display_groups"].append({"id": unit_id, "title": unit_label,
                                           "event_ids": main_ids, "focus_id": main_ids[0]})
        for field, mapping in (("events", events), ("edges", None)):
            for ident, references in document.get("provenance", {}).get(field, {}).items():
                if field == "edges":
                    start, end = ident.split("->", 1)
                    mapped = f"{events[start]}->{events[end]}"
                else:
                    mapped = mapping[ident]
                result["provenance"][field][mapped] = [
                    {**deepcopy(ref), "source_id": sources[ref["source_id"]]} for ref in references]
        for selected, note in document.get("annotations", {}).items():
            kind, separator, ident = selected.partition(":")
            mapping = events if kind == "event" else chapters if kind == "chapter" else {}
            if separator and ident in mapping:
                result["annotations"][f"{kind}:{mapping[ident]}"] = note
        if document.get("choice_groups"):
            result.setdefault("choice_groups", []).extend(
                {**deepcopy(group), "id": _scoped(unit_id, "choice", group["id"]),
                 "event_ids": [events[ident] for ident in group["event_ids"]]}
                for group in document["choice_groups"])
        if unit_id == through_unit_id:
            state = document.get("reading_state", {})
            selection = state.get("selected", "")
            reading_state = {}
            if selection.startswith("event:") and selection[6:] in events:
                reading_state["selected"] = "event:" + events[selection[6:]]
            if state.get("view") in mapped_views:
                reading_state["view"] = mapped_views[state["view"]]
            if reading_state:
                result["reading_state"] = reading_state
    return result


def without_units(document: dict, unit_ids: set[str]) -> dict:
    """Withdraw whole units from a delivered prefix without reopening drafts."""
    removed = {row["id"] for row in document["events"] if row.get("unit_id") in unit_ids}
    if not removed:
        return document
    result = deepcopy(document)
    prefixes = tuple(f"u{len(unit_id)}-{unit_id}-" for unit_id in unit_ids)
    result["events"] = [row for row in result["events"] if row["id"] not in removed]
    kept = {row["id"] for row in result["events"]}
    if not kept:
        raise ValueError("A retained Board entry must keep its own scenes")
    for row in result["events"]:
        if row.get("related_event_id") in removed:
            row.pop("related_event_id")
    for field in ("sources", "protagonists", "chapters"):
        result[field] = [row for row in result[field] if not row["id"].startswith(prefixes)]
    result["views"] = [row for row in result["views"] if row.get("unit_id") not in unit_ids]
    result["display_groups"] = [row for row in result["display_groups"] if row["id"] not in unit_ids]
    result["overview_event_ids"] = [ident for ident in result["overview_event_ids"] if ident in kept]
    graph = result["story_topology"]
    graph["nodes"] = [row for row in graph["nodes"] if row["event_id"] in kept]
    graph["edges"] = [row for row in graph["edges"] if row["from"] in kept and row["to"] in kept]
    graph["alignments"] = [row for row in graph["alignments"] if all(ident in kept for ident in row["event_ids"])]
    if "diagram_layout" in graph:
        graph["diagram_layout"] = trim_diagram_layout(graph["diagram_layout"], node_ids=kept, edges=graph["edges"])
    if "choice_groups" in result:
        result["choice_groups"] = [row for row in result["choice_groups"] if all(ident in kept for ident in row["event_ids"])]
    def retained_edge(key):
        start, end = key.split("->", 1)
        return start in kept and end in kept
    result["edge_conditions"] = {key: value for key, value in result["edge_conditions"].items() if retained_edge(key)}
    provenance = result["provenance"]
    provenance["events"] = {key: value for key, value in provenance["events"].items() if key in kept}
    provenance["edges"] = {key: value for key, value in provenance["edges"].items() if retained_edge(key)}
    source_ids = {row["id"] for row in result["sources"]}
    for field in ("events", "edges"):
        provenance[field] = {key: references for key, value in provenance[field].items()
                             if (references := [ref for ref in value if ref["source_id"] in source_ids])}
    result["annotations"] = {key: value for key, value in result["annotations"].items()
                             if not key.partition(":")[2].startswith(prefixes)}
    state = result.get("reading_state", {})
    if state.get("selected", "").startswith("event:") and state["selected"][6:] not in kept:
        state.pop("selected")
    if "view" in state and state["view"] not in {row["id"] for row in result["views"]}:
        state.pop("view")
    return result
