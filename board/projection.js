/* Display projection only. Narrative IDs, edges, clocks and saved geometry are untouched. */
(() => {
  'use strict';

  const geometry = globalThis.elioDiagramGeometry;
  const storyLayout = globalThis.elioStoryLayout;

  function role(work, item) {
    if (work.kind === 'catalog') return 'item';
    if (work.authored && ['scene', 'decision', 'outcome'].includes(item.kind)) return item.kind;
    if (item.kind === 'outcome') return 'outcome';
    if (item.kind === 'decision' || (work.edges || []).filter(edge => edge.from === item.id).length > 1) return 'decision';
    return 'scene';
  }

  function hasPicture(work, item) {
    return Boolean(item.image || item.image_site_asset || item.image_url || !work.authored && work.id === 'glass-city-fiction');
  }

  function dimensions(work, item, media = {}) {
    const type = role(work, item);
    // Selection changes the front layer, never the layout's measured size.
    if (hasPicture(work, item)) {
      const size = type === 'decision' ? { w: 284, h: 204 }
        : type === 'outcome' ? { w: 264, h: 184 } : { w: 244, h: 180 };
      if (work.board_presentation?.image_fit === 'cover') {
        if (!work.reader_audience) return { ...size, imageFit: 'cover' };
        const mediaHeight = Math.round((size.w - 18) * (item.reading_group ? 3 / 7 : 9 / 16));
        return {w: size.w, h: mediaHeight + 112 + (item.reading_group ? 82 : 0), mediaHeight, imageFit: 'cover'};
      }
      const image = item.image;
      const metadataRatio = Number.isFinite(image?.width) && image.width > 0
        && Number.isFinite(image?.height) && image.height > 0 ? image.width / image.height : 0;
      const ratio = Number.isFinite(media.aspectRatio) && media.aspectRatio > 0 ? media.aspectRatio
        : Number.isFinite(metadataRatio) && metadataRatio > 0 ? metadataRatio : 16 / 9;
      // Keep the complete image inside a bounded media plane. The text area
      // and all geometry consume this same height, including before load.
      const mediaHeight = Math.max(90, Math.min(320, Math.round((size.w - 18) / ratio)));
      return { w: size.w, h: mediaHeight + 112 + (item.reading_group ? 82 : 0), mediaHeight, imageFit: 'natural' };
    }
    const w = type === 'decision' ? 284 : 272;
    // Text is the content of these cards. Reserve the same title/body room in
    // every visual mode rather than sizing them like an empty picture caption.
    const lineCount = (text, font, limit) => Math.max(1, Math.min(limit, Math.ceil(
      Array.from(text).reduce((width, char) => width + (/[^\u0000-\u00ff]/u.test(char) ? 1 : .55), 0) / ((w - 40) / font))));
    const titleLines = lineCount(item.map_label || item.title || '', 18, 5);
    const summary = textSummary(item);
    const summaryLines = summary ? lineCount(summary, 12, 3) : 0;
    return { w, h: Math.max(154, 80 + (item.map_context ? 14 : 0) + titleLines * 26 + (summaryLines ? 14 + summaryLines * 20 : 0)) };
  }

  function textSummary(item) {
    return String(item.summary || item.body || '').replace(/\[\[([^\[\]|]+)\|[^\]]+\]\]/g, '$1').replace(/\s+/g, ' ').trim();
  }

  function groupFor(work, id) {
    const groups = work.display_groups || [];
    return (work.views || []).find(view => view.id === work.display_view && view.event_ids.includes(id))
      || groups.find(group => group.id === work.display_view && group.event_ids.includes(id)) || groups.find(group => group.event_ids.includes(id));
  }

  function stageId(work, id) {
    return groupFor(work, id)?.id || '';
  }

  function condition(work, edge) {
    const conditions = work.edge_conditions;
    if (Array.isArray(conditions)) {
      const row = conditions.find(value => value.from === edge.from && value.to === edge.to);
      return row?.label || row?.condition || edge.label || '';
    }
    return conditions?.[`${edge.from}->${edge.to}`] || edge.label || '';
  }

  function isVisibleLabel(work, edge, selected) {
    const source = edge.edge || edge;
    return source.from === selected && Boolean(condition(work, source))
      && (work.edges || []).filter(row => row.from === source.from).length > 1;
  }

  function labelSize(label) {
    return { labelWidth: Math.min(170, Math.max(108, Array.from(label).length * 10 + 24)), labelHeight: 56 };
  }

  function groupBounds(id, title, members, padding = 14) {
    if (!members.length) return null;
    const x = Math.min(...members.map(node => node.x)) - padding;
    const y = Math.min(...members.map(node => node.y)) - padding - 24;
    return {
      id, title, x, y, event_ids: members.map(node => node.item.id),
      w: Math.max(...members.map(node => node.x + node.w)) - x + padding,
      h: Math.max(...members.map(node => node.y + node.h)) - y + padding,
    };
  }

  function catalogProjection(work, selectedId) {
    const columns = 3, gapX = 46, gapY = 50, width = 320, height = 220;
    const nodes = (work.items || []).map((item, index) => ({
      item,
      x: 80 + index % columns * (width + gapX),
      y: 104 + Math.floor(index / columns) * (height + gapY),
      w: width, h: height, role: 'item', stage: item.category || '',
      selected: item.id === selectedId, boundary: false, ports: { in: [], out: [] },
    }));
    return {
      nodes, edges: [], groups: [],
      width: columns * (width + gapX) + 100,
      height: Math.max(620, 164 + Math.ceil(nodes.length / columns) * (height + gapY)),
    };
  }

  function portSlots(node, count) {
    const span = Math.min(node.h - 48, Math.max(0, count - 1) * 22);
    return Array.from({ length: count }, (_, index) => node.h / 2 + (count > 1 ? index / (count - 1) * span - span / 2 : 0));
  }

  function allocatePorts(nodes, edges) {
    const byId = new Map(nodes.map(node => [node.item.id, node]));
    const allocated = new Map();
    for (const node of nodes) {
      node.ports = { in: [], out: [] };
      for (const [side, key, opposite] of [['out', 'from', 'to'], ['in', 'to', 'from']]) {
        const connected = edges.filter(edge => edge[key] === node.item.id).sort((a, b) => {
          const first = byId.get(a[opposite]), second = byId.get(b[opposite]);
          return first.y + first.h / 2 - second.y - second.h / 2 || first.x - second.x || a[opposite].localeCompare(b[opposite]);
        });
        node.ports[side] = portSlots(node, connected.length);
        connected.forEach((edge, index) => {
          if (!allocated.has(edge)) allocated.set(edge, {});
          allocated.get(edge)[side] = { y: node.ports[side][index], index, count: connected.length };
        });
      }
    }
    // A lone terminal may align with its counterpart inside the real side of
    // the card. This removes 1–20px doglegs without moving either rectangle.
    for (const edge of edges) {
      const ports = allocated.get(edge), from = byId.get(edge.from), to = byId.get(edge.to);
      const targetY = from.y + ports.out.y - to.y;
      if (ports.in.count === 1 && targetY >= 22 && targetY <= to.h - 22) {
        ports.in.y = targetY; to.ports.in[0] = targetY;
      } else {
        const sourceY = to.y + ports.in.y - from.y;
        if (ports.out.count === 1 && sourceY >= 22 && sourceY <= from.h - 22) {
          ports.out.y = sourceY; from.ports.out[0] = sourceY;
        }
      }
    }
    return allocated;
  }

  function routeBetween(from, to, ports, nodes, bounds, occupied, edge, decorations = []) {
    const start = [from.x + from.w, from.y + ports.out.y];
    const end = [to.x, to.y + ports.in.y];
    const rect = node => ({ left: node.x - 10, top: node.y - 10, width: node.w + 20, height: node.h + 20 });
    const otherObstacles = [...nodes.filter(node => node !== from && node !== to).map(rect), ...decorations];
    const obstacles = [...nodes.map(rect), ...decorations];
    const returning = edge.relation === 'return' || end[0] <= start[0];
    const direct = !returning && geometry.straightRoute(start, end, otherObstacles);
    if (direct) return direct;

    // The original reader owns terminal clearance and adapts tight opposing
    // gates. Consume the same helpers instead of extending leads into cards.
    const space = { obstacles, width: bounds.width, height: bounds.height };
    // Nested turns need the opposite lane order below a card. A constant
    // index order makes a sibling's lead cross another sibling's vertical leg.
    const outLane = to.y + to.h / 2 < from.y + from.h / 2 ? ports.out.index : ports.out.count - 1 - ports.out.index;
    const inLane = from.y + from.h / 2 < to.y + to.h / 2 ? ports.in.index : ports.in.count - 1 - ports.in.index;
    const terminals = geometry.adaptTerminalPair(
      geometry.terminalPort({ side: 'right', tip: start, gate: start }, 'right', 24 + outLane * 12, space),
      geometry.terminalPort({ side: 'left', tip: end, gate: end }, 'left', 24 + inLane * 12, space),
      obstacles,
    );
    const gateStart = terminals.start.gate, gateEnd = terminals.end.gate;
    const candidates = [];
    const low = gateStart[0], high = gateEnd[0];
    if (high >= low) {
      const count = Math.max(ports.out.count, ports.in.count, 3);
      for (let channel = 0; channel <= count; channel++) {
        const x = low + (high - low) * channel / count;
        candidates.push([gateStart, [x, start[1]], [x, end[1]], gateEnd]);
      }
    }
    for (const y of [Math.min(start[1], end[1]) - 38, Math.max(start[1], end[1]) + 38, 30, bounds.height - 30]) {
      candidates.push([gateStart, [gateStart[0], y], [gateEnd[0], y], gateEnd]);
    }
    if (returning) {
      const left = Math.min(from.x, to.x), right = Math.max(from.x + from.w, to.x + to.w);
      const span = nodes.filter(node => node.x + node.w >= left && node.x <= right);
      // Transpose the original story-return recipe to this horizontal board.
      // Rails stay outside complete scene cards, including self-return loops.
      for (const rail of [Math.max(20, Math.min(...span.map(node => node.y)) - 38), Math.min(bounds.height - 20, Math.max(...span.map(node => node.y + node.h)) + 38)]) {
        const recipe = storyLayout.routeStoryReturn({ x1: start[1], y1: start[0], x2: end[1], y2: end[0], sourceBottom: gateStart[0] - 18, targetTop: gateEnd[0] + 18, rail });
        candidates.push(recipe.map(([y, x]) => [x, y]).slice(1, -1));
      }
    }
    // Nearby reserved lanes are useful candidates, rather than a reason to
    // escape to the far canvas edge. The upstream cost still chooses the path.
    for (const [a, b] of occupied) {
      if (a[0] === b[0] && high >= low) for (const x of [a[0] - 10, a[0] + 10]) {
        if (x >= low && x <= high) candidates.push([gateStart, [x, start[1]], [x, end[1]], gateEnd]);
      }
    }
    let body = null, bestCost = Infinity;
    for (const candidate of candidates) {
      const path = geometry.compact(candidate);
      if (path.some(([x, y]) => x < 0 || y < 0 || x > bounds.width || y > bounds.height)
          || !geometry.segments(path).every(([a, b]) => geometry.straightRoute(a, b, obstacles))) continue;
      const cost = geometry.pathCost(path, occupied, obstacles);
      if (cost < bestCost) { body = path; bestCost = cost; }
    }
    // The upstream router handles obstructed corridors; its occupied-line cost
    // is also consulted when a short candidate would share an ambiguous trunk.
    if (!body || bestCost > Math.abs(end[0] - start[0]) + Math.abs(end[1] - start[1]) + 140) {
      const routed = geometry.routeOrthogonal({ start: gateStart, end: gateEnd, startTip: start, endTip: end,
        obstacles, width: bounds.width, height: bounds.height, occupied });
      if (routed && (!body || geometry.pathCost(routed, occupied, obstacles) < bestCost)) body = routed;
    }
    return body ? geometry.compact([start, ...body, end]) : null;
  }

  const intersects = (a, b, gap = 0) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

  function separateCrossings(edges) {
    edges.forEach(edge => { edge.crossings = []; });
    for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
      const under = edges[i], over = edges[j];
      geometry.segments(under.points).forEach(([a, b]) => {
        geometry.segments(over.points).forEach(([c, d]) => {
          const horizontal = a[1] === b[1];
          if (horizontal === (c[1] === d[1])) return;
          const h = horizontal ? [a, b] : [c, d], v = horizontal ? [c, d] : [a, b];
          const x = v[0][0], y = h[0][1];
          // Only interior crossings are gaps. Endpoints/corners belong to real
          // terminals and must never be made to resemble disconnected joins.
          if (x <= Math.min(h[0][0], h[1][0]) + 14 || x >= Math.max(h[0][0], h[1][0]) - 14
              || y <= Math.min(v[0][1], v[1][1]) + 14 || y >= Math.max(v[0][1], v[1][1]) - 14) return;
          under.crossings.push({ x, y, over: false, other: geometry.edgeId(over.from, over.to) });
          over.crossings.push({ x, y, over: true, other: geometry.edgeId(under.from, under.to) });
        });
      });
    }
    for (const edge of edges) {
      // Keep path continuous: marker-end on split SVG subpaths would invent
      // extra arrows. The renderer may mask just these underpass circles.
      edge.underpasses = edge.crossings.filter(crossing => !crossing.over)
        .filter((crossing, index, rows) => rows.findIndex(other => other.x === crossing.x && other.y === crossing.y) === index)
        .map(({ x, y }) => ({ x, y, r: 6 }));
    }
  }

  function labelPosition(points, nodes, bounds, occupiedLabels, label, preferTarget = false) {
    const { labelWidth, labelHeight } = labelSize(label);
    const clear = box => box.x >= 12 && box.y >= 12 && box.x + box.w <= bounds.width - 12 && box.y + box.h <= bounds.height - 12
      && !nodes.some(node => intersects(box, node, 10)) && !occupiedLabels.some(other => intersects(box, other, 8));
    if (preferTarget && points.at(-1)[0] > points[0][0]) {
      const [endX, endY] = points.at(-1);
      const x = endX - 14 - labelWidth / 2, y = endY;
      const box = { x: x - labelWidth / 2, y: y - labelHeight / 2, w: labelWidth, h: labelHeight };
      const anchor = { x: endX - 24, y: endY };
      const onTerminal = geometry.segments(points).some(([a, b]) => a[1] === endY && b[1] === endY
        && anchor.x >= Math.min(a[0], b[0]) && anchor.x <= Math.max(a[0], b[0]));
      // Pair the choice with the destination row. Its line anchor sits inside
      // the plate; minimizing centre-to-line distance would obscure that pair.
      if (onTerminal && clear(box)) {
        occupiedLabels.push(box);
        return { x, y, labelWidth, labelHeight, labelAnchor: anchor, labelSide: 'on', labelPlacement: 'target-adjacent' };
      }
    }
    const candidates = [];
    for (const [a, b] of geometry.segments(points)) {
      const horizontal = a[1] === b[1];
      for (const fraction of [.5, .45, .55, .4, .6, .35, .65, .3, .7, .2, .8, .1, .9]) {
        const anchor = { x: a[0] + (b[0] - a[0]) * fraction, y: a[1] + (b[1] - a[1]) * fraction };
        for (const offset of [0, -34, 34, -66, 66, -98, 98, -130, 130, -162, 162, -194, 194]) {
          const x = anchor.x + (horizontal ? 0 : offset), y = anchor.y + (horizontal ? offset : 0);
          const box = { x: x - labelWidth / 2, y: y - labelHeight / 2, w: labelWidth, h: labelHeight };
          if (!clear(box)) continue;
          candidates.push({ x, y, box, anchor, offset, horizontal, cost: Math.abs(offset) + Math.abs(fraction - .5) * 36 });
        }
      }
    }
    candidates.sort((a, b) => a.cost - b.cost || a.x - b.x || a.y - b.y);
    const best = candidates[0];
    if (!best) return null;
    occupiedLabels.push(best.box);
    return { x: best.x, y: best.y, labelWidth, labelHeight, labelAnchor: best.anchor, labelPlacement: 'route-space',
      labelSide: !best.offset ? 'on' : best.horizontal ? (best.offset < 0 ? 'above' : 'below') : (best.offset < 0 ? 'left' : 'right') };
  }

  function exactGroups(groups, nodes, kind) {
    return groups.flatMap(group => {
      const members = nodes.filter(node => group.event_ids.includes(node.item.id));
      const foreign = nodes.filter(node => !group.event_ids.includes(node.item.id));
      const parts = members.map(node => [node]);
      for (;;) {
        let pair = null, smallest = Infinity;
        for (let a = 0; a < parts.length; a++) for (let b = a + 1; b < parts.length; b++) {
          const box = groupBounds(group.id, group.title, [...parts[a], ...parts[b]]);
          if (foreign.some(node => intersects(box, node, 4))) continue;
          const cost = box.w * box.h;
          if (cost < smallest) { pair = [a, b]; smallest = cost; }
        }
        if (!pair) break;
        parts[pair[0]].push(...parts[pair[1]]); parts.splice(pair[1], 1);
      }
      return parts.map((part, index) => {
        const box = groupBounds(group.id, group.title, part);
        // Two frame pieces of one canonical group may touch. List every real
        // member they touch, never an unrelated group's intervening event.
        return { ...box, event_ids: members.filter(node => intersects(box, node)).map(node => node.item.id),
          id: parts.length > 1 ? `${group.id}--region-${index + 1}` : group.id,
          stageId: group.id, kind, boundary: part.every(node => node.boundary), regionIndex: index,
          title: index ? `${group.title} · 이어짐` : group.title };
      });
    });
  }

  function placeLabels(work, projectedEdges, nodes, bounds, selected) {
    const occupiedLabels = [];
    for (const edge of projectedEdges) {
      // A retained route may have belonged to the previous selection. Clear
      // its old plate before deciding whether the renderer will paint it.
      for (const key of ['x', 'y', 'labelWidth', 'labelHeight', 'labelAnchor', 'labelSide', 'labelPlacement']) delete edge[key];
      if (!isVisibleLabel(work, edge, selected)) continue;
      const placement = labelPosition(edge.points, nodes, bounds, occupiedLabels, edge.label, true);
      if (!placement) throw new Error(`Elio condition label has no clear anchor: ${edge.from} → ${edge.to}`);
      Object.assign(edge, placement);
    }
  }

  // Chapter and unchanged-stage selections change labels, not node/port routes.
  // The app owns the immutable work identity; focus changes still project fully.
  function reselect(work, layout, selected) {
    const group = groupFor(work, selected);
    if (!layout || layout.overviewKind || !layout.nodes.some(node => node.item.id === selected)
      || !(layout.allFlows || layout.scope === 'chapter' || layout.scope === 'stage' && group?.id === layout.stage)) return null;
    const nodes = layout.nodes.map(node => ({ ...node, selected: node.item.id === selected }));
    const edges = layout.edges.map(edge => ({ ...edge }));
    placeLabels(work, edges, nodes, layout, selected);
    return { ...layout, nodes, edges, stage: group?.id || null };
  }

  function readingOverview(work, sections, selectedId, scope, kind, stage) {
    const records = new Map(work.events.map(item => [item.id, item]));
    const groups = sections.filter(section => section.event_ids.some(id => records.has(id)));
    const events = groups.map(section => ({...records.get(section.event_ids.find(id => records.has(id))),
      title: section.title || section.label, summary: section.summary || '',
      map_label: undefined, map_context: undefined, reading_group: true}));
    const ids = events.map(item => item.id);
    // These are the already-authored reading sections, not inferred causes.
    const display = {...work, events, nodes: [], display_groups: [], views: [],
      overview_event_ids: ids, edges: ids.slice(1).map((id, index) =>
        ({from: ids[index], to: id, relation: 'sequence', label: '읽는 순서'}))};
    const selected = records.get(selectedId);
    const chosen = groups.findIndex(group => group.event_ids.includes(selectedId) || group.event_ids.includes(selected?.related_event_id));
    const sameUnit = groups.findIndex(group => group.event_ids.some(id => records.get(id)?.unit_id === selected?.unit_id));
    const layout = project(display, ids[Math.max(0, chosen >= 0 ? chosen : sameUnit)], 'chapter');
    layout.nodes.forEach((node, index) => {
      node.groupView = groups[index].view_id || groups[index].id;
      node.groupLabel = `${groups[index].event_ids.length}개 장면`;
    });
    return {...layout, scope, stage, overviewKind: kind,
      sceneCount: new Set(groups.flatMap(group => group.event_ids)).size};
  }

  function sharedSpaceObstacles(space) {
    return [{left: space.x + 8, top: space.y + 8, width: space.w - 16, height: space.headerHeight},
      ...space.origins.map(origin => ({left: origin.x - 8, top: origin.y - 8, width: origin.w + 16, height: origin.h + 16}))];
  }

  function routeEdges(work, nodes, edges, bounds, selected, decorations = []) {
    const byId = new Map(nodes.map(node => [node.item.id, node]));
    const ports = allocatePorts(nodes, edges);
    const occupied = [], routed = new Map();
    const distance = edge => { const a = byId.get(edge.from), b = byId.get(edge.to); return Math.abs(b.x - a.x - a.w) + Math.abs(b.y + ports.get(edge).in.y - a.y - ports.get(edge).out.y); };
    const returning = edge => edge.relation === 'return' || byId.get(edge.to).x <= byId.get(edge.from).x;
    // Match the original reader: reserve short local links before long links.
    // Return connections use the remaining corridors, never story rank edges.
    for (const edge of [...edges].sort((a, b) => Number(returning(a)) - Number(returning(b)) || distance(a) - distance(b))) {
      const points = routeBetween(byId.get(edge.from), byId.get(edge.to), ports.get(edge), nodes, bounds, occupied, edge, decorations);
      if (!points) throw new Error(`Elio display route could not be placed: ${edge.from} → ${edge.to}`);
      occupied.push(...geometry.segments(points));
      routed.set(edge, points);
    }
    const projectedEdges = edges.map(edge => {
      const points = routed.get(edge);
      return {
        edge, from: edge.from, to: edge.to, points,
        path: geometry.roundedPath(points, 14, 24), label: condition(work, edge),
        routeKind: returning(edge) ? 'return' : 'forward',
        sourcePort: { side: 'right', y: ports.get(edge).out.y }, targetPort: { side: 'left', y: ports.get(edge).in.y },
      };
    });
    separateCrossings(projectedEdges);
    placeLabels(work, projectedEdges, nodes, bounds, selected);
    return projectedEdges;
  }

  function allFlowsProjection(work, selectedId, scope, media) {
    const records = work.events || [], recordIds = new Set(records.map(item => item.id));
    const selected = recordIds.has(selectedId) ? selectedId : records[0]?.id;
    const roots = (work.views?.length ? work.views : work.display_groups || []).filter(view => !view.parent_view_id);
    const claimed = new Set(), sections = [], nodes = [], edges = [], groups = [], timeMaps = [];
    let top = 0;

    function append(view) {
      const eventIds = view.event_ids.filter(id => recordIds.has(id) && !claimed.has(id));
      if (!eventIds.length) return;
      const memberIds = new Set(eventIds);
      let timeMap = view.time_map;
      if (timeMap) {
        const mapNodes = timeMap.nodes.filter((node, index) => memberIds.has(view.event_ids[index]));
        const mapIds = new Set(mapNodes.map(node => node.id));
        timeMap = {...timeMap, nodes: mapNodes,
          edges: timeMap.edges.filter(edge => mapIds.has(edge.from) && mapIds.has(edge.to))};
        if (timeMap.shared_space) timeMap.shared_space = {...timeMap.shared_space,
          node_ids: timeMap.shared_space.node_ids.filter(id => mapIds.has(id))};
      }
      // Each existing view keeps its own packer and authored map. Section
      // summaries are navigation in the filtered reader, never a replacement
      // for the actual scenes on this continuous canvas.
      const displayView = {...view, event_ids: eventIds, phases: [], time_map: timeMap,
        reading_sequence: view.reading_sequence || !view.perspective_id};
      const displayWork = {...work, reader_all_flows: false, display_view: view.id,
        display_groups: [], views: [displayView]};
      const local = project(displayWork, memberIds.has(selected) ? selected : eventIds[0], 'stage', media);
      const dy = top + 112;
      sections.push({id: view.id, view_ids: [view.id], title: view.title, unit_id: view.unit_id || view.id,
        perspective_id: view.perspective_id, event_ids: eventIds,
        x: 0, y: top, width: local.width, height: local.height + 112});
      for (const node of local.nodes) {
        nodes.push({...node, y: node.y + dy, selected: node.item.id === selected});
        claimed.add(node.item.id);
      }
      for (const phase of view.phases || []) {
        const band = groupBounds(phase.id, phase.label || phase.title,
          local.nodes.filter(node => phase.event_ids.includes(node.item.id)));
        if (band) groups.push({...band, y: band.y + dy, kind: 'phase', summary: phase.summary || ''});
      }
      for (const edge of local.edges) {
        const points = edge.points.map(([x, y]) => [x, y + dy]);
        const shifted = {...edge, points, path: geometry.roundedPath(points, 14, 24),
          crossings: edge.crossings.map(crossing => ({...crossing, y: crossing.y + dy})),
          underpasses: edge.underpasses.map(crossing => ({...crossing, y: crossing.y + dy}))};
        if (Number.isFinite(edge.y)) shifted.y = edge.y + dy;
        if (edge.labelAnchor) shifted.labelAnchor = {...edge.labelAnchor, y: edge.labelAnchor.y + dy};
        edges.push(shifted);
      }
      if (local.timeMap) {
        const frame = {...local.timeMap, id: view.id, unit_id: view.unit_id || view.id, event_ids: eventIds,
          x: 0, y: dy, width: local.width, height: local.height,
          eras: local.timeMap.eras.map(era => ({...era, y: era.y + dy})),
          lanes: local.timeMap.lanes.map(lane => ({...lane, y: lane.y + dy}))};
        if (frame.sharedSpace) frame.sharedSpace = {...frame.sharedSpace, y: frame.sharedSpace.y + dy,
          origins: frame.sharedSpace.origins.map(origin => ({...origin, y: origin.y + dy}))};
        timeMaps.push(frame);
      }
      top += local.height + 208;
    }

    roots.forEach(append);
    const remaining = records.filter(item => !claimed.has(item.id)).map(item => item.id);
    if (remaining.length) append({id: 'remaining-scenes', title: work.title || '이야기', event_ids: remaining});
    for (const view of roots) {
      if (sections.some(section => section.id === view.id)) continue;
      const shared = sections.find(section => view.event_ids.some(id => section.event_ids.includes(id)));
      if (shared) shared.view_ids.push(view.id);
    }
    const bounds = {width: Math.max(1080, ...sections.map(section => section.width)), height: Math.max(620, top - 96)};
    // Canonical links can also join views in a general authored document.
    // Route those with the same original geometry helpers, retaining every
    // source edge and the existing per-map kind.
    const projectedSources = new Set(edges.map(edge => edge.edge));
    const crossViewEdges = (work.edges || []).filter(edge => recordIds.has(edge.from) && recordIds.has(edge.to) && !projectedSources.has(edge));
    let projectedEdges = edges;
    if (crossViewEdges.length) {
      const mapKinds = new Map(edges.map(edge => [edge.edge, edge.mapKind]));
      const decorations = timeMaps.flatMap(frame => frame.sharedSpace ? sharedSpaceObstacles(frame.sharedSpace) : []);
      projectedEdges = routeEdges(work, nodes, [...edges.map(edge => edge.edge), ...crossViewEdges], bounds, selected, decorations);
      projectedEdges.forEach(edge => { edge.mapKind = mapKinds.get(edge.edge); });
    } else placeLabels(work, projectedEdges, nodes, bounds, selected);
    return {nodes, edges: projectedEdges, groups, sections, timeMaps, allFlows: true,
      scope, stage: groupFor(work, selected)?.id || null,
      sceneCount: work.overview_event_ids ? work.overview_event_ids.filter(id => recordIds.has(id)).length : records.length, ...bounds};
  }

  function project(work, selectedId, scope = 'focus', media = {}) {
    if (!geometry || !storyLayout) throw new Error('Elio layout and geometry sources must load before the game projection.');
    if (work.kind === 'catalog') return catalogProjection(work, selectedId);
    if (work.reader_audience && work.reader_all_flows) return allFlowsProjection(work, selectedId, scope, media);

    const records = work.events || [];
    const recordIds = new Set(records.map(item => item.id));
    const canonicalEdges = (work.edges || []).filter(edge => recordIds.has(edge.from) && recordIds.has(edge.to));
    const selected = recordIds.has(selectedId) ? selectedId : records[0]?.id;
    const selectedGroup = groupFor(work, selected);
    const effectiveScope = scope === 'stage' && !selectedGroup ? 'focus' : scope;
    const timeMap = work.reader_audience && effectiveScope === 'stage' ? selectedGroup?.time_map : null;
    if (work.reader_audience && effectiveScope === 'chapter' && work.display_groups?.length) {
      return readingOverview(work, work.display_groups.map(group => ({...group,
        summary: work.chapters?.find(chapter => chapter.id === records.find(item => group.event_ids.includes(item.id))?.chapter_id)?.summary || ''})), selected, 'chapter', 'act', null);
    }
    if (work.reader_audience && effectiveScope === 'stage' && !timeMap && selectedGroup.phases?.length
      && !canonicalEdges.some(edge => selectedGroup.event_ids.includes(edge.from) && selectedGroup.event_ids.includes(edge.to))) {
      return readingOverview(work, selectedGroup.phases, selected, 'stage', 'phase', selectedGroup.id);
    }
    const stageIds = new Set(effectiveScope === 'stage' ? selectedGroup.event_ids.filter(id => recordIds.has(id)) : []);
    const overview = work.reader_audience && work.overview_event_ids ? work.overview_event_ids.filter(id => recordIds.has(id)) : recordIds;
    const visibleIds = effectiveScope === 'chapter' ? new Set(overview) : effectiveScope === 'stage' ? new Set(stageIds) : new Set([selected]);
    if (effectiveScope !== 'chapter' && !(work.reader_audience && effectiveScope === 'stage')) canonicalEdges.forEach(edge => {
      if (effectiveScope === 'stage' ? stageIds.has(edge.from) || stageIds.has(edge.to) : edge.from === selected || edge.to === selected) {
        visibleIds.add(edge.from);
        visibleIds.add(edge.to);
      }
    });
    const items = records.filter(item => visibleIds.has(item.id));
    if (!items.length) return { nodes: [], edges: [], groups: [], width: 1000, height: 620 };
    const sourceNodes = new Map((work.nodes || []).map(node => [node.event_id, node]));
    let edges = canonicalEdges.filter(edge => visibleIds.has(edge.from) && visibleIds.has(edge.to)
      && (effectiveScope !== 'stage' || stageIds.has(edge.from) || stageIds.has(edge.to)));
    if (work.reader_audience && effectiveScope === 'stage' && !timeMap && !edges.length
      && (selectedGroup.reading_sequence || items.every(item => {
        const node = sourceNodes.get(item.id); return !node?.time && (node?.lane_count || 1) === 1;
      }) && !work.alignments?.some(group => group.event_ids.filter(id => visibleIds.has(id)).length > 1))) {
      const ordered = selectedGroup.event_ids.filter(id => visibleIds.has(id));
      edges = ordered.slice(1).map((id, index) => ({from: ordered[index], to: id, relation: 'sequence', label: '읽는 순서'}));
    }
    const sizes = Object.fromEntries(items.map(item => [item.id, dimensions(work, item, media[item.id])]));
    const model = {
      nodes: items.map(item => ({
        lane_index: 0, lane_count: 1, lead: 0,
        ...sourceNodes.get(item.id), event_id: item.id,
        // lead is a legacy visual spacing hint; this independent projection
        // keeps its own denser layout without changing the source model.
        lead: 0,
      })),
      edges,
      alignments: (work.alignments || []).map(group => ({
        ...group, event_ids: group.event_ids.filter(id => visibleIds.has(id)),
      })).filter(group => group.event_ids.length > 1),
    };
    const packed = storyLayout.packStoryTree(
      model, Object.fromEntries(items.map(item => [item.id, sizes[item.id].w])),
      1440, false, false, [],
      { direction: 'horizontal', nodeHeights: Object.fromEntries(items.map(item => [item.id, sizes[item.id].h])) },
    );
    const mapColumns = timeMap ? Math.max(...items.map(item => sizes[item.id].w)) + 196 : 0;
    const mapRows = timeMap ? Math.max(...items.map(item => sizes[item.id].h)) + 180 : 0;
    const mapTop = 70;
    if (timeMap) timeMap.nodes.forEach((node, index) => {
      const id = selectedGroup.event_ids[index];
      packed.positions[id] = {left: 96 + node.era * mapColumns,
        top: mapTop + (node.lane + ((node.lane_span || 1) - 1) / 2) * mapRows};
    });
    // Keep the upstream order. Only a conditional fan-out can paint a plate:
    // reserve its measured width where the original gap is too narrow. The
    // allowance is selection-independent, so reselect never moves cards.
    const columns = [...new Set(items.map(item => packed.positions[item.id].left))].sort((a, b) => a - b);
    const extraBefore = new Map();
    for (const edge of edges) {
      if (!isVisibleLabel(work, edge, edge.from)) continue;
      const from = packed.positions[edge.from], to = packed.positions[edge.to];
      if (edge.relation === 'return' || to.left <= from.left) continue;
      const needed = labelSize(condition(work, edge)).labelWidth + 28;
      const extra = Math.max(0, needed - (to.left - from.left - sizes[edge.from].w));
      extraBefore.set(to.left, Math.max(extraBefore.get(to.left) || 0, extra));
    }
    const corridorOffset = new Map();
    let offset = 0;
    for (const left of columns) {
      offset += extraBefore.get(left) || 0;
      corridorOffset.set(left, offset);
    }
    const nodes = items.map(item => {
      const position = packed.positions[item.id];
      return {
        item, x: position.left + 64 + corridorOffset.get(position.left), y: position.top + 88,
        ...sizes[item.id],
        role: role(work, item), stage: stageId(work, item.id), selected: item.id === selected,
        boundary: effectiveScope === 'stage' && !stageIds.has(item.id),
      };
    });
    let sharedSpace;
    if (timeMap?.shared_space) {
      const members = new Set(timeMap.shared_space.node_ids);
      const originals = new Map(timeMap.nodes.flatMap((node, index) => members.has(node.id) ? [[selectedGroup.event_ids[index], node]] : []));
      const contained = nodes.filter(node => originals.has(node.item.id));
      if (contained.length) {
        const origins = contained.map(node => {
          const original = originals.get(node.item.id);
          return {event_id: node.item.id, x: node.x, y: node.y, w: node.w, h: 76,
            label: original.label, era_label: timeMap.eras[original.era],
            lane_label: timeMap.lanes.slice(original.lane, original.lane + (original.lane_span || 1)).join(' · ')};
        });
        const y = mapTop + 18 + timeMap.lanes.length * mapRows + 80;
        contained.forEach((node, index) => { node.x = 160 + index * mapColumns; node.y = y + 112; });
        sharedSpace = {title: timeMap.shared_space.title, summary: timeMap.shared_space.summary,
          x: 128, y, w: (contained.length - 1) * mapColumns + Math.max(...contained.map(node => node.w)) + 64,
          h: 144 + Math.max(...contained.map(node => node.h)), headerHeight: 88,
          event_ids: contained.map(node => node.item.id), origins, portals: []};
      }
    }
    const bounds = {
      width: Math.max(1080, ...nodes.map(node => node.x + node.w + 96), ...(sharedSpace?.origins || []).map(origin => origin.x + origin.w + 96)),
      height: Math.max(620, ...nodes.map(node => node.y + node.h + 150), sharedSpace ? sharedSpace.y + sharedSpace.h + 32 : 0),
    };
    const projectedEdges = routeEdges(work, nodes, edges, bounds, selected, sharedSpace ? sharedSpaceObstacles(sharedSpace) : []);
    if (timeMap) {
      const mapped = new Map(timeMap.nodes.map((node, index) => [node.id, selectedGroup.event_ids[index]]));
      const kinds = new Map(timeMap.edges.map(edge => [`${mapped.get(edge.from)}->${mapped.get(edge.to)}`, edge.kind]));
      projectedEdges.forEach(edge => { edge.mapKind = kinds.get(`${edge.from}->${edge.to}`); });
    }
    let groups;
    if (effectiveScope === 'chapter' || effectiveScope === 'stage') {
      groups = (work.display_groups || []).map(group => groupBounds(
        group.id, group.title, nodes.filter(node => group.event_ids.includes(node.item.id)),
      )).filter(Boolean);
    } else {
      const preceding = new Set(edges.filter(edge => edge.to === selected && edge.from !== selected).map(edge => edge.from));
      const following = new Set(edges.filter(edge => edge.from === selected && edge.to !== selected).map(edge => edge.to));
      groups = [
        groupBounds('context-before', '들어오는 연결', nodes.filter(node => preceding.has(node.item.id))),
        groupBounds('context-current', '지금 고른 장면', nodes.filter(node => node.item.id === selected)),
        groupBounds('context-after', '나가는 연결', nodes.filter(node => following.has(node.item.id))),
      ].filter(Boolean);
    }
    groups = exactGroups(groups, nodes, effectiveScope === 'focus' ? 'context' : 'stage');
    let mapFrame;
    if (timeMap) {
      const eras = timeMap.eras.map((label, index) => ({label,
        x: 160 + index * mapColumns + (corridorOffset.get(96 + index * mapColumns) || 0), y: mapTop + 20, w: mapColumns - 70}));
      const lanes = timeMap.lanes.map((label, index) => ({label, x: 8, y: mapTop + 88 + index * mapRows,
        w: bounds.width - 24, h: mapRows - 70}));
      mapFrame = {title: timeMap.title, summary: timeMap.summary, eras, lanes,
        edgeKinds: [...new Set(timeMap.edges.map(edge => edge.kind))]};
      if (sharedSpace) mapFrame.sharedSpace = sharedSpace;
      groups = [];
    }
    return { nodes, edges: projectedEdges, groups, timeMap: mapFrame, scope: effectiveScope, stage: selectedGroup?.id || null, ...bounds };
  }

  const api = { project, reselect, dimensions, textSummary, role, isVisibleLabel, groupFor };
  globalThis.ElioGameProjection = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
