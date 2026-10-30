"""An optional, authored era/actor map linking existing perspective scenes."""
from __future__ import annotations
import html
import math
import re
import json
from pathlib import Path
from html.parser import HTMLParser

from .diagram_layout import safe_diagram_json, validate_diagram_layout

KINDS = {"life": ("#89939b", "생애와 여행"), "actor-a": ("#16869a", "첫 인물의 시간 이동"),
         "actor-b": ("#7954aa", "둘째 인물의 시간 이동"), "world": ("#ab7a29", "과거와 현재의 인과")}
TEMPLATES = json.loads(Path(__file__).with_name('time_map_templates.json').read_text(encoding='utf-8'))


def _fragment(name, **values):
    return re.sub(r'\{\{([A-Z_]+)\}\}', lambda match: str(values[match[1]]), TEMPLATES[name])


def validate_time_map(value, item_ids):
    if value is None:
        return
    fields = {"title", "summary", "eras", "lanes", "nodes", "edges"}
    if not isinstance(value, dict) or not fields.issubset(value) or set(value) - fields - {"shared_space", "diagram_layout"}:
        raise ValueError("Time map must use canonical fields")
    for key, limit in (("title", 120), ("summary", 400)):
        if not isinstance(value[key], str) or not value[key].strip() or len(value[key]) > limit:
            raise ValueError("Time map needs concise text")
    for key, maximum in (("eras", 6), ("lanes", 4)):
        if not isinstance(value[key], list) or not 2 <= len(value[key]) <= maximum:
            raise ValueError("Time map axes are out of range")
        if any(not isinstance(x, str) or not x.strip() or len(x) > 40 for x in value[key]):
            raise ValueError("Time map axes need short labels")
    nodes = value["nodes"]
    if not isinstance(nodes, list) or not 2 <= len(nodes) <= 16:
        raise ValueError("Time map needs bounded nodes")
    seen, cells = set(), set()
    for node in nodes:
        required = {"id", "item_id", "era", "lane", "label"}
        if not isinstance(node, dict) or not required.issubset(node) or set(node) - required - {"image_item_id", "image_crop", "lane_span"}:
            raise ValueError("Time map node fields are invalid")
        ident = node["id"]
        if not isinstance(ident, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", ident) or ident in seen:
            raise ValueError("Time map node ids must be unique")
        if not isinstance(node["item_id"], str) or node["item_id"] not in item_ids:
            raise ValueError("Time map node needs an existing perspective item")
        if "image_item_id" in node and (not isinstance(node["image_item_id"], str) or node["image_item_id"] not in item_ids):
            raise ValueError("Time map image needs an existing perspective item")
        if "image_crop" in node:
            crop = node["image_crop"]
            if not isinstance(crop, dict) or set(crop) != {"x","y","width","height","full_width","full_height"}:
                raise ValueError("Time map image crop needs complete source dimensions")
            if any(type(crop[k]) not in (int,float) or not math.isfinite(crop[k]) for k in crop):
                raise ValueError("Time map image crop must be finite")
            if (not 0 <= crop["x"] < crop["full_width"] <= 8192 or not 0 <= crop["y"] < crop["full_height"] <= 8192
                    or not 0 < crop["width"] <= crop["full_width"]-crop["x"] or not 0 < crop["height"] <= crop["full_height"]-crop["y"]):
                raise ValueError("Time map image crop is outside the verified source")
        if not isinstance(node["label"], str) or not node["label"].strip() or len(node["label"]) > 70:
            raise ValueError("Time map node label is invalid")
        for key, axis in (("era", "eras"), ("lane", "lanes")):
            if type(node[key]) is not int or not 0 <= node[key] < len(value[axis]):
                raise ValueError("Time map node is outside its axis")
        span = node.get("lane_span", 1)
        if type(span) is not int or not 1 <= span <= len(value["lanes"])-node["lane"]:
            raise ValueError("Time map shared scene must stay within its lanes")
        occupied = {(node["era"], lane) for lane in range(node["lane"], node["lane"]+span)}
        if occupied & cells:
            raise ValueError("Time map cells cannot overlap")
        cells.update(occupied)
        seen.add(ident)
    if "shared_space" in value:
        space = value["shared_space"]
        if not isinstance(space, dict) or set(space) != {"title", "summary", "node_ids"}:
            raise ValueError("Time map shared space fields are invalid")
        for key, limit in (("title", 80), ("summary", 300)):
            if not isinstance(space[key], str) or not space[key].strip() or len(space[key]) > limit:
                raise ValueError("Time map shared space needs concise text")
        ids = space["node_ids"]
        if not isinstance(ids, list) or not 2 <= len(ids) <= 6 or any(not isinstance(n, str) or n not in seen for n in ids) or len(set(ids)) != len(ids):
            raise ValueError("Time map shared space needs unique known nodes")
    if not isinstance(value["edges"], list) or len(value["edges"]) > 24:
        raise ValueError("Time map edges are out of range")
    pairs = set()
    for edge in value["edges"]:
        if not isinstance(edge, dict) or set(edge) != {"from", "to", "kind", "label", "via"}:
            raise ValueError("Time map edge fields are invalid")
        if any(not isinstance(edge[k], str) for k in ("from","to","kind")) or edge["from"] not in seen or edge["to"] not in seen or edge["kind"] not in KINDS:
            raise ValueError("Time map edge needs known nodes and relation")
        pair = (edge["from"], edge["to"])
        if pair in pairs:
            raise ValueError("Time map edges must be unique")
        pairs.add(pair)
        if not isinstance(edge["label"], str) or not edge["label"].strip() or len(edge["label"]) > 100:
            raise ValueError("Time map edges need meaningful labels")
        if not isinstance(edge["via"], list) or len(edge["via"]) > 4:
            raise ValueError("Time map routing is out of range")
        for point in edge["via"]:
            if not isinstance(point, list) or len(point) != 2:
                raise ValueError("Time map routing needs an era/lane pair")
            for coordinate, axis in zip(point, ("eras", "lanes")):
                if type(coordinate) not in (float, int) or not math.isfinite(coordinate) or not -.55 <= coordinate <= len(value[axis])-.45:
                    raise ValueError("Time map route is outside the map")
    if "diagram_layout" in value:
        validate_diagram_layout(value["diagram_layout"], node_ids=seen, edges=value["edges"])


class _SceneImage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.src = ""
    def handle_starttag(self, tag, attrs):
        if tag == "img" and not self.src:
            self.src = dict(attrs).get("src", "")


def render_time_map(guide, render_inline_links, term_links, event_visuals=None, *, item_visuals=None):
    """One semantic DOM per scene; CSS transposes axes without scaling type."""
    value = guide["time_map"]
    esc = html.escape
    prefix = f'perspective-{guide["id"]}'
    visuals = {
        item["id"]: (item_visuals or {}).get(item["id"],
            (event_visuals or {}).get(item.get("image_event_id") or item.get("related_event_id"), ""))
        for item in guide["items"]
    }
    images = {}
    for item in guide["items"]:
        parser = _SceneImage()
        parser.feed(visuals[item["id"]])
        if parser.src:
            images[item["id"]] = parser.src
    labels = {kind: label for kind, (_, label) in KINDS.items()}
    labels["actor-a"] = value["lanes"][0] + " · 역행과 구조"
    labels["actor-b"] = value["lanes"][1] + " · 추적과 구조"
    legend = "".join(f'<span style="--map-color:{color}">{esc(labels[kind])}</span>' for kind, (color, _) in KINDS.items())
    axes = []
    for i, label in enumerate(value["eras"]):
        axes.append(f'<span class="time-map__era" style="--era:{i+2}">{esc(label)}</span>')
    for i, label in enumerate(value["lanes"]):
        axes.append(f'<span class="time-map__lane" style="--lane:{i+2}">{esc(label)}</span>')
    nodes = []
    for node in sorted(value["nodes"], key=lambda n: (n["era"], n["lane"])):
        target = f'{prefix}-{node["item_id"]}'
        src = images.get(node.get("image_item_id") or node["item_id"])
        photo = ""
        if src:
            if crop := node.get("image_crop"):
                box = " ".join(str(crop[k]) for k in ("x", "y", "width", "height"))
                photo = (f'<svg viewBox="{box}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
                         f'<image href="{esc(src, quote=True)}" width="{crop["full_width"]}" height="{crop["full_height"]}"/></svg>')
            else:
                photo = f'<img src="{esc(src, quote=True)}" alt="" loading="lazy" decoding="async">'
        lines = node["label"].split("\n", 1)
        caption = f'<span class="time-map__role">{esc(lines[0])}</span>'
        if len(lines) > 1:
            caption += f'<span class="time-map__action">{esc(lines[1])}</span>'
        nodes.append(_fragment('node', TARGET=target, ID=node['id'], ERA=node['era'],
                     LANE=node['lane'], SPAN=node.get('lane_span', 1), ERA_CSS=node['era']+2,
                     LANE_CSS=node['lane']+2, LABEL=esc(node['label'].replace(chr(10), ' · '), quote=True),
                     PHOTO=photo, CAPTION=caption))
    space_html = ""
    if space := value.get("shared_space"):
        by_id = {n["id"]: n for n in value["nodes"]}
        portals = []
        for ident in space["node_ids"]:
            node = by_id[ident]
            action = node["label"].split("\n", 1)[-1]
            target = f'{prefix}-{node["item_id"]}'
            portals.append(f'<a class="time-map__portal" href="#{target}" data-time-portal="{ident}" '
                           f'data-time-item="{target}" data-era="{node["era"]}" aria-haspopup="dialog">'
                           f'<span>{esc(value["eras"][node["era"]])}</span><strong>{esc(action)}</strong></a>')
        space_html = (f'<section class="time-map__space" aria-label="{esc(space["title"], quote=True)}">'
                      f'<div class="time-map__space-heading"><h3>{esc(space["title"])}</h3>'
                      '<span>같은 공간 · 서로 다른 시간</span></div>'
                      f'<p>{render_inline_links(space["summary"], term_links)}</p>'
                      f'<div class="time-map__portals">{"".join(portals)}</div></section>')
    edges = "".join(f'<li data-from="{e["from"]}" data-to="{e["to"]}" data-kind="{e["kind"]}">{esc(e["label"])}</li>' for e in value["edges"])
    details = []
    for item in guide["items"]:
        ident = f'{prefix}-{item["id"]}'
        main = esc(item.get("related_event_id", ""), quote=True)
        visual = visuals[item["id"]]
        details.append(_fragment('detail', TARGET=ident, TITLE=esc(item['title']), VISUAL=visual,
                       BODY=render_inline_links(item['summary'], term_links),
                       LINK=f'<a href="#{main}" data-main-scene="{main}" class="perspective-scene-link">본편 장면 보기 ↗</a>'))
    return _fragment('frame', PREFIX=prefix, TITLE=esc(value['title'], quote=True), SUMMARY=esc(value['summary']),
                     SPACE=space_html, LEGEND=legend, ERAS=len(value['eras']), LANES=len(value['lanes']),
                     AXES=''.join(axes), NODES=''.join(nodes), MODEL=safe_diagram_json(value),
                     DETAILS=''.join(details), EDGES=edges)
