"""Display-only, device-specific offsets shared by Elio's existing diagrams."""

from __future__ import annotations

import json
import math


_PORTS = {"left", "right", "top", "bottom"}


def _number(value, low, high):
    if type(value) not in (int, float) or not low <= value <= high or not math.isfinite(value):
        raise ValueError("Diagram layout coordinates must be finite and within bounds")


def validate_diagram_layout(value, *, node_ids, edges):
    """Validate without normalizing IDs, story meaning, or the supplied offsets."""
    if not isinstance(value, dict) or set(value) - {"desktop", "mobile"}:
        raise ValueError("Diagram layout needs only desktop and mobile modes")
    known_nodes = set(node_ids)
    known_edges = {f'{edge["from"]}->{edge["to"]}' for edge in edges}
    for mode in value.values():
        if not isinstance(mode, dict) or set(mode) - {"nodes", "edges"}:
            raise ValueError("Diagram layout mode needs nodes or edges")
        nodes, routes = mode.get("nodes", {}), mode.get("edges", {})
        if not isinstance(nodes, dict) or set(nodes) - known_nodes:
            raise ValueError("Diagram layout references an unknown node")
        for point in nodes.values():
            if not isinstance(point, dict) or set(point) != {"x", "y"}:
                raise ValueError("Diagram layout node needs x and y offsets")
            _number(point["x"], -1, 1)
            _number(point["y"], -5000, 5000)
        if not isinstance(routes, dict) or set(routes) - known_edges:
            raise ValueError("Diagram layout references an unknown edge")
        for route in routes.values():
            if not isinstance(route, dict) or "via" not in route or set(route) - {"via", "source_port", "target_port"}:
                raise ValueError("Diagram layout edge fields are invalid")
            if not isinstance(route["via"], list) or len(route["via"]) > 8:
                raise ValueError("Diagram layout edge has too many waypoints")
            for point in route["via"]:
                if not isinstance(point, dict) or set(point) != {"x", "y"}:
                    raise ValueError("Diagram layout waypoint needs x and y")
                _number(point["x"], 0, 1)
                _number(point["y"], -100000, 100000)
            for key in ("source_port", "target_port"):
                if key in route and (not isinstance(route[key], str) or route[key] not in _PORTS):
                    raise ValueError("Diagram layout port is invalid")
    return value


def safe_diagram_json(value):
    """Embed JSON data without allowing its text to terminate an HTML script."""
    text = json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    for character, escaped in (("&", "\\u0026"), ("<", "\\u003c"), (">", "\\u003e"),
                               ("\u2028", "\\u2028"), ("\u2029", "\\u2029")):
        text = text.replace(character, escaped)
    return text


def remap_diagram_layout(value, node_ids):
    """Namespace perspective display IDs alongside the existing scene IDs."""
    result = {}
    for name, mode in value.items():
        updated = dict(mode)
        if "nodes" in mode:
            updated["nodes"] = {node_ids[key]: dict(point) for key, point in mode["nodes"].items()}
        if "edges" in mode:
            updated["edges"] = {
                "->".join(node_ids[ident] for ident in key.split("->")): {
                    **route, "via": [dict(point) for point in route["via"]]
                } for key, route in mode["edges"].items()
            }
        result[name] = updated
    return result


def trim_diagram_layout(value, *, node_ids, edges):
    """Drop only hints whose semantic node or edge no longer exists."""
    known_nodes = set(node_ids)
    known_edges = {f'{edge["from"]}->{edge["to"]}' for edge in edges}
    result = json.loads(json.dumps(value))
    for mode in result.values():
        if "nodes" in mode:
            mode["nodes"] = {key: point for key, point in mode["nodes"].items() if key in known_nodes}
        if "edges" in mode:
            mode["edges"] = {key: route for key, route in mode["edges"].items() if key in known_edges}
    return result
