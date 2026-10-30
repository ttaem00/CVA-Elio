"""Scene links share one reading order; v2 stories add a topology overview."""
from html import escape

from .scene_minimap import layout_scene_minimap
from .story_layout import SCHEMA_VERSION


def render_scene_navigation(events, topology=None, phases=()):
    tree = bool(topology and topology.get("schema_version") == SCHEMA_VERSION)
    layout = layout_scene_minimap(topology, events, phases) if tree else None
    positions = {node["id"]: node for node in layout["nodes"]} if tree else {}
    numbers = {event["id"]: f'{index:02}' for index, event in enumerate(events, 1)}
    previous = {ident: [] for ident in numbers}
    following = {ident: [] for ident in numbers}
    returning = {ident: [] for ident in numbers}
    if tree:
        for edge in topology["edges"]:
            if edge.get("relation") == "return":
                returning[edge["from"]].append(numbers[edge["to"]])
                continue
            previous[edge["to"]].append(numbers[edge["from"]])
            following[edge["from"]].append(numbers[edge["to"]])
    rows = []
    for number, event in enumerate(events, 1):
        ident = escape(event["id"], quote=True)
        title = escape(event["title"], quote=True)
        attrs = ' aria-current="step"' if number == 1 else ''
        if tree:
            node = positions[event["id"]]
            attrs += (f' style="--map-x:{node["x"]}px;--map-y:{node["y"]}px;'
                      f'--nav-accent:{node["color"]}" aria-describedby="map-route-{ident}"')
            before = sorted(previous[event["id"]], key=int)
            after = sorted(following[event["id"]], key=int)
            description = (f'이전 장면 {", ".join(before)}' if before else '이 경로의 시작')
            description += (' · 다음 장면 ' + ', '.join(after)) if after else ' · 이 경로의 끝'
            if returning[event["id"]]:
                description += ' · 인과가 돌아가는 장면 ' + ', '.join(returning[event["id"]])
            rows.append(f'<span id="map-route-{ident}" class="sr-only">{description}</span>')
        rows.append(
            f'<a class="scene-nav__link" href="#{ident}" data-scene="{ident}" '
            f'data-title="{title}" aria-label="장면 {number:02}, {title}"{attrs}>'
            f'<span>{number:02}</span></a>'
        )
    links = ''.join(rows)
    heading = ('<div class="scene-nav__heading"><span>현재 장면</span>'
               f'<strong id="scene-current-label">{escape(events[0]["title"])}</strong></div>')
    if not tree:
        return ('<nav class="scene-nav" aria-label="장면 바로가기">' + heading
                + f'<div class="scene-nav__rail"><div class="scene-nav__track" style="--scene-count:{len(events)}">'
                + links + '</div></div></nav>')
    marker_id = 'scene-map-return-' + escape(events[0]['id'], quote=True)
    edges = ''.join(
        f'<path d="{edge["path"]}" stroke="{edge["color"]}" '
        + (f'data-relation="return" stroke-dasharray="4 3" marker-end="url(#{marker_id})" '
           if edge.get('relation') == 'return' else '')
        + f'data-from="{escape(edge["from"], quote=True)}" data-to="{escape(edge["to"], quote=True)}"/>'
        for edge in layout["edges"]
    )
    if any(returning.values()):
        edges = (
            f'<defs><marker id="{marker_id}" viewBox="0 0 10 10" refX="9" refY="5" '
            'markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">'
            '<polygon points="0,0 10,5 0,10" fill="#93628e"/></marker></defs>' + edges
        )
    phase_labels = []
    phase_regions = []
    for index, phase in enumerate(layout["phases"]):
        next_x = layout["phases"][index + 1]["x"] if index + 1 < len(layout["phases"]) else layout["width"]
        phase_width = next_x - phase["x"]
        phase_regions.append(
            f'<span class="scene-nav__phase-region" aria-hidden="true" '
            f'style="left:{phase["x"]}px;width:{phase_width}px"></span>'
        )
        # Keep author labels intact; only the existing middle-dot separates a
        # short act label from its title. Arbitrary labels remain a single label.
        short_label, separator, name = phase["label"].partition(' · ')
        label = f'<span class="scene-nav__phase-badge">{escape(short_label)}</span>'
        if separator:
            label += f'<span class="scene-nav__phase-name"> · {escape(name)}</span>'
        phase_labels.append(
            f'<a class="scene-nav__phase" href="#phase-{escape(phase["id"], quote=True)}" '
            f'aria-label="{escape(phase["label"], quote=True)} 시작으로 이동" '
            f'style="left:{phase["x"]}px;max-width:{max(44, phase_width - 12)}px">'
            f'{label}</a>'
        )
    tracks = [track for track in layout["tracks"] if track["color"] != '#718391']
    legend = ''.join(
        f'<span class="scene-nav__legend-item" style="--nav-accent:{track["color"]}">'
        f'<span class="scene-nav__legend-label">{escape(track["label"])}</span>'
        f'<span class="scene-nav__legend-hidden">경로 {index + 1}</span></span>'
        for index, track in enumerate(tracks)
    )
    return (
        '<nav class="scene-nav scene-nav--tree" aria-label="장면 바로가기">' + heading
        + f'<div class="scene-nav__legend">{legend}</div>'
        + '<div class="scene-nav__rail"><div class="scene-nav__map" '
        + f'style="width:{layout["width"]}px;height:{layout["height"]}px">'
        + ''.join(phase_regions)
        + f'<svg class="scene-nav__edges" width="{layout["width"]}" height="{layout["height"]}" '
        + f'viewBox="0 0 {layout["width"]} {layout["height"]}" aria-hidden="true" focusable="false">{edges}</svg>'
        + ''.join(phase_labels) + links + '</div></div></nav>'
    )
