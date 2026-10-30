/* Layout distances are visual only. Never consume replay seconds or parse dates. */
(() => {
  const RETURN_GUTTER = 42;
  const geometry = globalThis.elioDiagramGeometry;
  function packStoryTree(model, sizes, width, mobile = false, compact = false, phases = [], options = {}) {
    const horizontal = options.direction === 'horizontal';
    const nodes = model.nodes;
    const returnGutter = model.edges.some(edge => edge.relation === 'return') ? RETURN_GUTTER : 0;
    const returnInset = returnGutter ? 24 : 0;
    const contentWidth = width - returnGutter;
    const byId = new Map(nodes.map((node, index) => [node.event_id, { ...node, index }]));
    // Phase gates are measured reading barriers, not story edges or clock values.
    const phaseByEvent = new Map(), phaseIds = new Set();
    let phaseCursor = 0;
    if (!Array.isArray(phases)) throw new Error('Invalid story-tree phase partition');
    phases.forEach(phase => {
      if (!phase || typeof phase.id !== 'string' || !phase.id || phaseIds.has(phase.id)
          || !Array.isArray(phase.event_ids) || !phase.event_ids.length
          || !Number.isFinite(phase.height) || phase.height < 0) {
        throw new Error('Invalid story-tree phase partition');
      }
      phaseIds.add(phase.id);
      phase.event_ids.forEach(id => {
        const node = nodes[phaseCursor];
        if (!node || node.event_id !== id || (node.phase_id && node.phase_id !== phase.id)) {
          throw new Error('Story-tree phases must match contiguous node reading order');
        }
        phaseByEvent.set(id, phase.id);
        phaseCursor += 1;
      });
    });
    if (phases.length && phaseCursor !== nodes.length) {
      throw new Error('Story-tree phases must cover all nodes');
    }
    model.alignments.forEach(group => {
      const memberships = new Set(group.event_ids.map(id => phaseByEvent.get(id) || byId.get(id)?.phase_id).filter(Boolean));
      if (memberships.size > 1) throw new Error('Cross-phase story-tree alignment is not supported');
    });
    const owner = new Map(nodes.map(node => [node.event_id, `event:${node.event_id}`]));
    if (!mobile) model.alignments.forEach(group => group.event_ids.forEach(id => owner.set(id, `alignment:${group.id}`)));
    const groups = new Map();
    nodes.forEach(node => {
      const key = owner.get(node.event_id);
      if (!groups.has(key)) groups.set(key, { ids: [], before: new Set(), after: new Set() });
      groups.get(key).ids.push(node.event_id);
    });
    function constrainOwners(a, b) {
      if (a === b) return;
      groups.get(a).after.add(b);
      groups.get(b).before.add(a);
    }
    function constrain(from, to) { constrainOwners(owner.get(from), owner.get(to)); }
    model.edges.filter(edge => edge.relation !== 'return').forEach(edge => constrain(edge.from, edge.to));
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i], b = nodes[j];
        const overlaps = a.lane_index / a.lane_count < (b.lane_index + 1) / b.lane_count
          && b.lane_index / b.lane_count < (a.lane_index + 1) / a.lane_count;
        // A stacking constraint is not an edge in the story and is never drawn.
        if (!horizontal && (mobile || overlaps)) constrain(a.event_id, b.event_id);
        if (!mobile && a.time && b.time && a.time.kind === b.time.kind && a.time.domain === b.time.domain
            && Number.isFinite(a.time.value) && Number.isFinite(b.time.value) && a.time.value !== b.time.value) {
          constrain(...(a.time.value < b.time.value ? [a.event_id, b.event_id] : [b.event_id, a.event_id]));
        }
      }
    }
    phases.forEach((phase, index) => {
      const key = `phase:${phase.id}`;
      groups.set(key, { ids: [], before: new Set(), after: new Set(), phase });
      if (index) phases[index - 1].event_ids.forEach(id => constrainOwners(owner.get(id), key));
      phase.event_ids.forEach(id => constrainOwners(key, owner.get(id)));
    });
    const pending = new Set(groups.keys());
    const placed = new Map();
    const gap = horizontal ? 110 : compact ? 38 : mobile ? 38 : 64, unit = compact ? 24 : mobile ? 24 : 56;
    while (pending.size) {
      const key = [...pending].find(id => [...groups.get(id).before].every(parent => placed.has(parent)));
      if (key === undefined) throw new Error('Conflicting story-tree placement constraints');
      const group = groups.get(key);
      const parentBottom = Math.max(returnInset, ...[...group.before].map(id => placed.get(id).bottom + gap));
      const lead = group.phase ? 0 : Math.max(...group.ids.map(id => byId.get(id).lead)) * unit;
      const top = parentBottom + lead;
      const height = group.phase ? group.phase.height : Math.max(...group.ids.map(id => sizes[id] || 0));
      placed.set(key, { top, bottom: top + height });
      pending.delete(key);
    }
    const positions = {};
    if (horizontal) {
      // Reuse the same ordered groups and predecessor packing along the other
      // display axis. Cross-axis collision slots are visual, never story edges.
      const heights=options.nodeHeights||{},laneGap=44;
      const maxHeight=Math.max(80,...nodes.map(node=>heights[node.event_id]||120));
      const occupied=[];
      nodes.forEach(node=>{
        const left=32+placed.get(owner.get(node.event_id)).top;
        const cardWidth=sizes[node.event_id]||210,height=heights[node.event_id]||120;
        const parents=model.edges.filter(edge=>edge.to===node.event_id&&edge.relation!=='return').map(edge=>positions[edge.from]).filter(Boolean);
        let top=32+node.lane_index*(maxHeight+laneGap);
        if(node.lane_count===1&&parents.length)top=Math.max(32,parents.reduce((sum,p)=>sum+p.top+p.height/2,0)/parents.length-height/2);
        for(let pass=0;pass<=occupied.length;pass++){
          const collisions=occupied.filter(box=>left<box.left+box.width+24&&left+cardWidth+24>box.left&&top<box.top+box.height+laneGap&&top+height+laneGap>box.top);
          if(!collisions.length)break;
          top=Math.max(...collisions.map(box=>box.top+box.height+laneGap));
        }
        const box={left,top,width:cardWidth,height};positions[node.event_id]=box;occupied.push(box);
      });
      return {positions,direction:'horizontal',width:Math.max(320,...occupied.map(box=>box.left+box.width+48)),height:Math.max(240,...occupied.map(box=>box.top+box.height+48))};
    }
    nodes.forEach(node => {
      const gutter = compact || mobile || node.lane_count === 1 ? 0 : 24;
      const cell = contentWidth / node.lane_count;
      positions[node.event_id] = {
        top: placed.get(owner.get(node.event_id)).top,
        left: returnGutter + (mobile ? 0 : cell * node.lane_index + gutter / 2),
        width: mobile ? contentWidth : cell - gutter,
      };
    });
    const result = { positions, height: returnInset + Math.max(0, ...[...placed.values()].map(group => group.bottom)) };
    if (phases.length) result.phases = Object.fromEntries(phases.map(phase => [phase.id, {
      top: placed.get(`phase:${phase.id}`).top, height: phase.height,
    }]));
    return result;
  }

  function routeStoryEdge({ x1, y1, x2, y2, bend, targetTop, width, mobile, crossesScene }) {
    // Only an intervening story scene can require an outside detour. A phase
    // is a reading separator, not a branch, destination or scene obstacle.
    const outside = mobile || x1 < width / 2 ? 3 : width - 3;
    const route = crossesScene
      ? [[x1,y1],[x1,bend],[outside,bend],[outside,targetTop-18],[x2,targetTop-18],[x2,y2]]
      : [[x1,y1],[x1,bend],[x2,bend],[x2,y2]];
    return route.filter((point,index) => !index || point[0] !== route[index-1][0] || point[1] !== route[index-1][1]);
  }

  function routeStoryReturn({ x1, y1, x2, y2, sourceBottom, targetTop, rail = 14 }) {
    // Cross horizontally in the gaps before/after each complete scene, never
    // through its photo or copy. This also gives a self return a visible loop.
    const lower = sourceBottom + 18, upper = Math.max(3, targetTop - 18);
    return [[x1,y1],[x1,lower],[rail,lower],[rail,upper],[x2,upper],[x2,y2]];
  }

  const layoutAPI={packStoryTree,routeStoryEdge,routeStoryReturn};
  if (typeof module !== 'undefined' && module.exports) module.exports = layoutAPI;
  globalThis.elioStoryLayout=layoutAPI;
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.story-tree').forEach(tree => {
    const data = tree.querySelector('.story-tree__data');
    const container = tree.querySelector('.story-tree__nodes');
    const svg = tree.querySelector('.story-tree__edges');
    if (!data || !container || !svg) return;
    const model = JSON.parse(data.textContent);
    let diagramLayout = geometry.clone(model.diagram_layout), lastGeometry = null;
    const returnGutter = model.edges.some(edge => edge.relation === 'return') ? RETURN_GUTTER : 0;
    const elements = new Map([...container.children].filter(element => element.matches('.story-tree__node'))
      .map(element => [element.dataset.eventId, element]));
    const phaseGates = tree.storyReader?.phaseGates || new Map();
    const mobileQuery = window.matchMedia('(max-width: 900px)');
    let frame;
    const tracks = [...new Set(model.nodes.map(node => node.track_id))];
    function update() {
      frame = undefined;
      const compact = tree.storyReader?.compact || false;
      if (tree.dataset.linear === 'true' && !compact) return;
      if (tree.storyReader?.opened && !compact) return;
      const mobile = mobileQuery.matches && !compact;
      const width = container.clientWidth;
      if (!width) return;
      const contentWidth = width - returnGutter;
      const runtimeModel = { ...model, nodes: model.nodes.map(node => {
        const element = elements.get(node.event_id);
        return { ...node, ...(element.dataset.phaseId ? {
          phase_id: element.dataset.phaseId, phase_label: element.dataset.phaseLabel || '',
        } : {}) };
      }) };
      const phases = [];
      if (phaseGates.size) runtimeModel.nodes.forEach(node => {
        let phase = phases.at(-1);
        if (!phase || (node.phase_id || '') !== phase.nodePhaseId) {
          const id = node.phase_id || `@unphased:${phases.length}`;
          const gate = phaseGates.get(id);
          if (gate) gate.style.width = `${contentWidth}px`;
          phase = { id, nodePhaseId: node.phase_id || '', event_ids: [], height: gate?.offsetHeight || 0 };
          phases.push(phase);
        }
        phase.event_ids.push(node.event_id);
      });
      const sizes = {};
      model.nodes.forEach(node => {
        const element = elements.get(node.event_id);
        element.style.width = `${mobile ? contentWidth : contentWidth / node.lane_count - (compact || node.lane_count === 1 ? 0 : 24)}px`;
        element.style.setProperty('--mobile-rail', `${8 + tracks.indexOf(node.track_id) % 4 * 9}px`);
        sizes[node.event_id] = element.offsetHeight;
      });
      let layout;
      try { layout = packStoryTree(runtimeModel, sizes, width, mobile, compact, phases); }
      catch (error) {
        tree.classList.remove('is-laid-out');
        container.style.height = '';
        [...elements.values(), ...phaseGates.values()].forEach(element => {
          element.style.width = ''; element.style.left = ''; element.style.top = '';
        });
        svg.replaceChildren();
        console.error('Elio: tree placement failed; retaining all scenes in reading order.', error);
        return;
      }
      tree.classList.add('is-laid-out');
      const baseNodes=model.nodes.map(node=>({id:node.event_id,box:{...layout.positions[node.event_id],height:sizes[node.event_id]}}));
      const orderPairs=model.edges.filter(edge=>edge.relation!=='return').map(edge=>[edge.from,edge.to]);
      for(let i=0;i<model.nodes.length;i++)for(let j=i+1;j<model.nodes.length;j++){
        const a=model.nodes[i],b=model.nodes[j];
        if(mobile||a.lane_index/a.lane_count<(b.lane_index+1)/b.lane_count&&b.lane_index/b.lane_count<(a.lane_index+1)/a.lane_count)orderPairs.push([a.event_id,b.event_id]);
      }
      const reserved=Object.values(layout.phases||{}).map(phase=>({left:returnGutter,top:phase.top,width:contentWidth,height:phase.height}));
      const offsets=geometry.resolveOffsets(baseNodes,geometry.mode(diagramLayout,mobile).nodes,width,{reserved,orderPairs,minY:returnGutter?24:0});
      const warnings=[...offsets.warnings];
      Object.entries(layout.positions).forEach(([id, position]) => {
        const element = elements.get(id);
        element.style.left = `${position.left+offsets.offsets[id].x}px`;
        element.style.top = `${position.top+offsets.offsets[id].y}px`;
      });
      Object.entries(layout.phases || {}).forEach(([id, position]) => {
        const gate = phaseGates.get(id);
        if (!gate) return;
        gate.style.left = `${returnGutter}px`; gate.style.top = `${position.top}px`; gate.style.width = `${contentWidth}px`;
      });
      container.style.height = `${Math.max(layout.height,...baseNodes.map(node=>node.box.top+offsets.offsets[node.id].y+node.box.height+24))}px`;
      const bounds = svg.parentElement.getBoundingClientRect();
      let svgHeight = svg.parentElement.offsetHeight;
      const relative=element=>{const rect=element.getBoundingClientRect();return {left:rect.left-bounds.left,top:rect.top-bounds.top,width:rect.width,height:rect.height,cx:rect.left+rect.width/2-bounds.left,cy:rect.top+rect.height/2-bounds.top};};
      const measured=new Map(model.nodes.map(node=>{
        const element=elements.get(node.event_id),box=relative(element),photo=relative(element.querySelector(compact?'.story-tree__picture':'.item .node'));
        const painted=compact?[]:[...(element.querySelectorAll?.('.copy, .visual, .story-tree__track, .story-tree__condition, .story-tree__time, .story-tree__alignment, .story-tree__relations a, .watch-moment__content')||[])].map(relative).filter(rect=>rect.width>0&&rect.height>0);
        const content=painted.length?{left:Math.min(...painted.map(rect=>rect.left)),top:Math.min(...painted.map(rect=>rect.top)),width:0,height:0}:box;
        if(painted.length){content.width=Math.max(...painted.map(rect=>rect.left+rect.width))-content.left;content.height=Math.max(...painted.map(rect=>rect.top+rect.height))-content.top;}
        return [node.event_id,{id:node.event_id,box,photo,content}];
      }));
      // Full cards deliberately leave a blank rail beside the copy. Treating
      // their full-width wrapper as solid closes that existing mobile corridor.
      // Keep the marker solid separately so a continuing branch cannot join it.
      const routingBoxes=node=>compact?[node.box]:[node.content,node.photo];
      const port=(node,side)=>{
        const {box:b,photo:p}=node;
        const space={obstacles:[...measured.values()].filter(other=>other.id!==node.id).flatMap(routingBoxes),width,height:svgHeight};
        if(side==='left')return geometry.terminalPort({side,tip:[b.left-8,p.cy],gate:[b.left-9,p.cy]},side,32,space);
        if(side==='right')return geometry.terminalPort({side,tip:[b.left+b.width+8,p.cy],gate:[b.left+b.width+9,p.cy]},side,32,space);
        const top=side==='top',edge=compact?(top?b.top:b.top+b.height):(top?p.top:p.top+p.height),sign=top?-1:1;
        let result=geometry.terminalPort({side,tip:[p.cx,edge+sign*8],gate:[p.cx,edge+sign*9]},side,32,space);
        // A visible blank rail can leave the marker immediately. A centered
        // desktop card (or missing child measurements) may still have content
        // at that gate, so retain its existing outer-card gateway instead.
        const content=node.content,[x,y]=result.gate;
        if(!compact&&x>content.left-4&&x<content.left+content.width+4&&y>content.top-4&&y<content.top+content.height+4){
          result=geometry.terminalPort({...result,gate:[p.cx,(top?b.top:b.top+b.height)+sign*9]},side,32,space);
        }
        return result;
      };
      const plans=model.edges.map(edge=>{
        const source=measured.get(edge.from),target=measured.get(edge.to),override=geometry.edgeOverride(diagramLayout,mobile,edge.from,edge.to);
        const start={...port(source,override.source_port||'bottom'),node:source.id,side:override.source_port||'bottom',other:target.photo};
        const end={...port(target,override.target_port||'top'),node:target.id,side:override.target_port||'top',other:source.photo};
        let via=edge.relation==='return'?[[14,start.gate[1]],[14,end.gate[1]]]:[];
        if(override.source_port||override.target_port)via=[];
        if(override.via?.length)via=geometry.waypoints(override.via,width,{x:source.photo.cx,y:source.photo.cy});
        via.forEach(point=>{if(Number.isFinite(point[1]))svgHeight=Math.max(svgHeight,point[1]+18);});
        const manual=Boolean(override.via?.length||override.source_port||override.target_port);
        const alternate=!manual&&edge.relation!=='return'&&source.box.width<width*.95&&target.box.width<width*.95&&Math.abs(source.photo.cx-target.photo.cx)>20
          ?source.photo.cx<target.photo.cx?['right','left']:['left','right']:null;
        return {edge,id:geometry.edgeId(edge.from,edge.to),start,end,via,manual,alternate};
      });
      if(svgHeight>svg.parentElement.offsetHeight)container.style.height=`${parseFloat(container.style.height)+svgHeight-svg.parentElement.offsetHeight}px`;
      svg.setAttribute('viewBox', `0 0 ${width} ${svgHeight}`);
      const fans=new Map();
      plans.forEach(plan=>[plan.start,plan.end].forEach(endpoint=>{const key=`${endpoint.node}:${endpoint.side}`;if(!fans.has(key))fans.set(key,[]);fans.get(key).push(endpoint);}));
      fans.forEach(endpoints=>endpoints.sort((a,b)=>['top','bottom'].includes(a.side)?a.other.cx-b.other.cx:a.other.cy-b.other.cy).forEach((endpoint,index)=>{const axis=['top','bottom'].includes(endpoint.side)?0:1,offset=(index-(endpoints.length-1)/2)*10;endpoint.tip[axis]+=offset;endpoint.gate[axis]+=offset;}));
      const reservations=new Map([...fans].map(([key,endpoints])=>[key,endpoints.map(endpoint=>endpoint.tip[['top','bottom'].includes(endpoint.side)?0:1])]));
      const alternatePort=(id,side)=>{
        const node=measured.get(id),photo=node.photo,vertical=['top','bottom'].includes(side);
        return geometry.availablePort(port(node,side),side,reservations.get(`${id}:${side}`)||[],vertical?photo.left+4:photo.top+4,vertical?photo.left+photo.width-4:photo.top+photo.height-4);
      };
      const reserve=(id,side,endpoint)=>{const key=`${id}:${side}`;if(!reservations.has(key))reservations.set(key,[]);reservations.get(key).push(endpoint.tip[['top','bottom'].includes(side)?0:1]);};
      const occupied=[],routed=new Map(),terminals=new Map(),obstacles=[...measured.values()].flatMap(routingBoxes);
      const distance=plan=>Math.abs(plan.start.gate[0]-plan.end.gate[0])+Math.abs(plan.start.gate[1]-plan.end.gate[1]);
      const route=(start,end,via=[],preferStraightStops=false)=>geometry.routeOrthogonal({start:start.gate,end:end.gate,startTip:start.tip,endTip:end.tip,via,obstacles,width,height:svgHeight,occupied,preferStraightStops});
      [...plans].sort((a,b)=>Number(b.manual)-Number(a.manual)||distance(a)-distance(b)).forEach(plan=>{
        let {start,end}=plan;
        ({start,end}=geometry.adaptTerminalPair(start,end,obstacles));
        const otherObstacles=[...measured.values()].filter(node=>node.id!==plan.edge.from&&node.id!==plan.edge.to).flatMap(routingBoxes);
        const direct=!plan.manual&&plan.edge.relation!=='return'&&geometry.straightRoute(start.tip,end.tip,otherObstacles);
        if(direct){routed.set(plan.id,direct);terminals.set(plan.id,{start,end});occupied.push(...geometry.segments(direct));return;}
        let points=route(start,end,plan.via,plan.manual&&plan.via.length>0);
        if(plan.alternate){
          let altStart=alternatePort(plan.edge.from,plan.alternate[0]),altEnd=alternatePort(plan.edge.to,plan.alternate[1]);
          if(altStart&&altEnd)({start:altStart,end:altEnd}=geometry.adaptTerminalPair(altStart,altEnd,obstacles));
          const alternative=altStart&&altEnd&&route(altStart,altEnd);
          if(alternative&&(!points||geometry.pathCost([altStart.tip,...alternative,altEnd.tip],occupied,obstacles)<geometry.pathCost([start.tip,...points,end.tip],occupied,obstacles)-1)){
            start=altStart;end=altEnd;points=alternative;reserve(plan.edge.from,plan.alternate[0],start);reserve(plan.edge.to,plan.alternate[1],end);
          }
        }
        if(!points){
          if(plan.manual)warnings.push(`Edge ${plan.id}: requested waypoints or ports are blocked; automatic route shown.`);
          points=route(start,end);
        }
        if(!points){start=port(measured.get(plan.edge.from),'bottom');end=port(measured.get(plan.edge.to),'top');({start,end}=geometry.adaptTerminalPair(start,end,obstacles));points=route(start,end);}
        if(!points){warnings.push(`Edge ${plan.id}: no clear route; its relation remains in the scene links.`);return;}
        const full=[start.tip,...points,end.tip],path=plan.manual?geometry.compact(full):geometry.simplifyAuto(full,otherObstacles);routed.set(plan.id,path);terminals.set(plan.id,{start,end});occupied.push(...geometry.segments(path));
      });
      // Rails continue through chapter boundaries. Only the opaque phase card
      // above the SVG occludes them; never cut a full-width band out of the tree.
      const arrows=[];
      const paths = model.edges.map(edge => {
        const points=routed.get(geometry.edgeId(edge.from,edge.to));if(!points)return null;
        const d=geometry.roundedPath(points,14,9);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.dataset.from = edge.from;
        path.dataset.to = edge.to;
        path.dataset.relation = edge.relation || 'sequence';
        if (edge.relation === 'return') {
          const arrow=document.createElementNS('http://www.w3.org/2000/svg','polygon');
          arrow.dataset.from=edge.from;arrow.dataset.to=edge.to;arrow.dataset.relation='return';
          arrow.setAttribute('class','story-tree__arrow');arrow.setAttribute('points',geometry.arrowHead(points).map(point=>point.join(',')).join(' '));
          arrow.setAttribute('fill','#93628e');arrow.setAttribute('stroke','none');arrows.push(arrow);
        }
        const sameTrack = model.nodes.find(node => node.event_id === edge.from).track_id === model.nodes.find(node => node.event_id === edge.to).track_id;
        const merging = model.edges.filter(item => item.relation !== 'return' && item.to === edge.to).length > 1;
        const routeId = merging && !sameTrack ? edge.from : edge.to;
        path.style.setProperty('--route-color', tree.storyReader?.color(routeId) || '#879099');
        path.setAttribute('d', d);
        return path;
      }).filter(Boolean);
      svg.replaceChildren(...paths,...arrows);
      if(warnings.length)tree.dataset.diagramLayoutWarning=warnings.join('\n');else delete tree.dataset.diagramLayoutWarning;
      const terminalSnapshot=id=>terminals.has(id)?Object.fromEntries(Object.entries(terminals.get(id)).map(([key,{tip,gate,side}])=>[key,{tip,gate,side}])):undefined;
      lastGeometry={variant:mobile?'mobile':'desktop',width,height:svgHeight,obstacles,nodes:[...measured.values()].map(node=>({id:node.id,box:{left:node.box.left,top:node.box.top,width:node.box.width,height:node.box.height},anchor:{x:node.photo.cx,y:node.photo.cy},offsetCurrent:geometry.mode(diagramLayout,mobile).nodes?.[node.id]||{x:0,y:0}})),edges:plans.map(plan=>({id:plan.id,from:plan.edge.from,to:plan.edge.to,points:routed.get(plan.id)||[],terminals:terminalSnapshot(plan.id)}))};
      tree.dispatchEvent(new CustomEvent('elio:diagram-drawn',{bubbles:true}));
      if (typeof scheduleSceneGeometryRefresh === 'function') scheduleSceneGeometryRefresh();
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(schedule);
      elements.forEach(element => observer.observe(element));
      phaseGates.forEach(gate => observer.observe(gate));
      // The tree height changes during packing; observe width separately via resize.
    }
    window.addEventListener('resize', schedule, { passive: true });
    tree.addEventListener('story-tree:layout', schedule);
    window.addEventListener('load', schedule, { once: true });
    container.addEventListener('toggle', schedule, true);
    document.fonts?.ready.then(schedule);
    const sceneLabel=id=>elements.get(id)?.querySelector('.scene-title')?.textContent?.trim()||model.nodes.find(node=>node.event_id===id)?.track_label||id;
    const relationLabels={sequence:'이야기 흐름',influence:'영향과 원인',transfer:'인물의 이동',return:'돌아가는 연결'};
    tree.elioDiagram={kind:'story_layout',surface:svg.parentElement,nodes:model.nodes.map(node=>({id:node.event_id,label:sceneLabel(node.event_id)})),edges:model.edges.map(edge=>({id:geometry.edgeId(edge.from,edge.to),from:edge.from,to:edge.to,label:`${sceneLabel(edge.from)} → ${sceneLabel(edge.to)} · ${relationLabels[edge.relation||'sequence']}`})),getLayout:()=>geometry.clone(diagramLayout),setLayout:value=>{diagramLayout=geometry.clone(value);schedule();},geometry:()=>geometry.clone(lastGeometry)};
    update();
    // Restore deep links after initial placement / image and font geometry settles.
    window.addEventListener('load', () => {
      update();
      let fragment;
      try { fragment = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(fragment);
      if (target && tree.contains(target)) {
        if (tree.storyReader?.compact) tree.storyReader.revealAnchor(fragment);
        else target.scrollIntoView({ behavior:'instant', block:'start' });
      }
    }, { once:true });
  });
})();
