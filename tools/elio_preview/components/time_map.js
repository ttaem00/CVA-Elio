// Scene text stays in the DOM. Only connections use SVG coordinates.
(() => {
const mounted = new WeakMap();
function mountMap(map, {restoreHash = true} = {}) {
  if (mounted.has(map)) return mounted.get(map);
  const document = map.ownerDocument || globalThis.document;
  const window = document.defaultView || globalThis.window;
  const location = window.location || globalThis.location;
  const history = window.history || globalThis.history;
  const listeners = [], observers = [];
  let disposed = false, frame = 0;
  const on = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };
  const details = [...map.querySelectorAll('.time-map__detail')];
  const links = [...map.querySelectorAll('[data-time-node]')];
  const portals = [...map.querySelectorAll('[data-time-portal]')];
  const sceneLinks = [...links, ...portals];
  const relations = [...map.querySelectorAll('.time-map__reading li')];
  const canvas = map.querySelector('.time-map__canvas');
  const svg = map.querySelector('.time-map__connections');
  const data = map.querySelector('.time-map__data');
  const model = data ? JSON.parse(data.textContent) : null;
  const prior = {
    enhanced: map.classList.contains?.('time-map--enhanced') || false,
    detailOpen: details.map(detail => detail.open),
    attributes: sceneLinks.map(link => [link, link.getAttribute?.('aria-current'), link.getAttribute?.('aria-haspopup')]),
    transforms: links.map(link => link.style.transform), paddingBottom: canvas.style.paddingBottom,
    svgChildren: [...(svg.childNodes || svg.children)], viewBox: svg.getAttribute?.('viewBox'),
    warning: map.dataset.diagramLayoutWarning, storyReader: map.storyReader, elioDiagram: map.elioDiagram,
  };
  const geometry = globalThis.elioDiagramGeometry;
  let diagramLayout = geometry.clone(model?.diagram_layout), lastGeometry = null;
  const colors = {life:'#89939b','actor-a':'#16869a','actor-b':'#7954aa',world:'#ab7a29'};
  const ns = 'http://www.w3.org/2000/svg';
  let selected = null;
  map.classList.add('time-map--enhanced');
  // Reuse the photo-flow reader's native dialog shell and typography.
  const dialog=document.createElement('dialog');dialog.className='story-detail';
  const header=document.createElement('header');header.className='story-detail__header';
  const context=document.createElement('span');context.className='story-detail__context';
  const close=document.createElement('button');close.type='button';close.className='story-detail__close';close.textContent='흐름으로 돌아가기 ×';
  const body=document.createElement('div');body.className='story-detail__body';
  header.append(context,close);dialog.append(header,body);map.append(dialog);
  dialog.style.setProperty('--route-color','#16869a');
  let opened=null,returnFocus=null,savedScroll=0;
  const restore=()=>{if(opened){opened.append(body.querySelector('.time-map__scene'));opened=null;}};
  on(dialog,'close',()=>{restore();document.body.classList.remove('story-detail-open');if(!disposed){returnFocus?.focus({preventScroll:true});window.scrollTo({top:savedScroll,behavior:'instant'});}});
  on(close,'click',()=>dialog.close());
  on(dialog,'click',event=>{if(event.target===dialog)dialog.close();});
  const highlight = () => map.querySelectorAll('.time-map__edge, .time-map__arrow').forEach((edge) => {
    edge.style.opacity = !selected || edge.dataset.from === selected || edge.dataset.to === selected ? '1' : '.25';
  });
  const select = (id, node) => {
    selected = node;
    details.forEach((detail) => { detail.open = false; });
    sceneLinks.forEach((link) => {
      if (link.dataset.timeItem === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    highlight();
  };
  const show=(link)=>{
    if(disposed)return;
    if(map.closest('.spoilers-on') && !map.classList.contains('spoiler-revealed'))return;
    const detail=details.find(d=>d.dataset.timeDetail===link.dataset.timeItem);if(!detail)return;
    if(!dialog.open){returnFocus=link;savedScroll=window.scrollY;}
    restore();select(detail.dataset.timeDetail,link.dataset.timeNode || link.dataset.timePortal);opened=detail;
    const era=map.querySelectorAll('.time-map__era')[+link.dataset.era]?.textContent||'';
    context.textContent=era;
    dialog.setAttribute('aria-label',detail.querySelector('summary').textContent);
    body.append(detail.querySelector('.time-map__scene'));
    if(!dialog.open){dialog.showModal();document.body.classList.add('story-detail-open');}
    dialog.scrollTop=0;close.focus({preventScroll:true});
  };
  sceneLinks.forEach((link) => on(link,'click', (event) => {
    if (event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(link);
    history.replaceState(null, '', `#${link.dataset.timeItem}`);
  }));
  links.forEach(link=>link.setAttribute('aria-haspopup','dialog'));
  map.storyReader={compact:true,resume:(id)=>{const link=links.find(l=>l.dataset.timeItem===id);if(link)show(link);}};
  // The shared glossary listener records the original scene and resumes this
  // reader through the same contract used by the photo-flow dialog.
  on(dialog,'click',event=>{
    const anchor=event.target.closest('a.term-link[href^="#"]');
    if(!anchor || event.button>0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    const target=document.getElementById(anchor.hash.slice(1));
    if(target && !dialog.contains(target)){event.preventDefault();dialog.close();}
  });
  const syncHash = () => {
    if(disposed)return;
    const link = links.find((row) => row.hash === location.hash);
    if(link)show(link);else {if(dialog.open)dialog.close();select(null,null);}
  };
  if (restoreHash) {
    syncHash();
    on(window,'hashchange', syncHash);
  }
  const draw = () => {
    if (disposed || !canvas.clientWidth) return;
    links.forEach(link=>{link.style.transform='';});
    canvas.style.paddingBottom='';
    const origin = canvas.getBoundingClientRect();
    const relative = (el) => {
      const r = el.getBoundingClientRect();
      return {left:r.left-origin.left,top:r.top-origin.top,right:r.right-origin.left,bottom:r.bottom-origin.top,width:r.width,height:r.height,cx:(r.left+r.right)/2-origin.left,cy:(r.top+r.bottom)/2-origin.top};
    };
    const portrait = getComputedStyle(canvas).getPropertyValue('--map-orientation').trim() === 'portrait';
    const nodes = links.map((link) => ({id:link.dataset.timeNode,era:+link.dataset.era,lane:+link.dataset.lane,span:+link.dataset.laneSpan,
      box:relative(link),photo:relative(link.querySelector('.time-map__photo'))}));
    const W=origin.width,baseHeight=origin.height,basePadding=parseFloat(getComputedStyle(canvas).paddingBottom)||0;
    const offsets=geometry.resolveOffsets(nodes,geometry.mode(diagramLayout,portrait).nodes,W,{minY:Math.min(...nodes.map(n=>n.box.top))});
    const warnings=[...offsets.warnings];
    nodes.forEach((node,index)=>{
      const offset=offsets.offsets[node.id];links[index].style.transform=`translate(${offset.x}px,${offset.y}px)`;
      for(const key of ['box','photo']){const r=node[key];node[key]={...r,left:r.left+offset.x,right:r.right+offset.x,top:r.top+offset.y,bottom:r.bottom+offset.y,cx:r.cx+offset.x,cy:r.cy+offset.y};}
    });
    const byId = new Map(nodes.map((n) => [n.id,n]));
    let H=Math.max(baseHeight,...nodes.map(n=>n.box.bottom+18));
    const obstacles=nodes.map(n=>n.box);
    // Gateways are outside the full caption, never through its text.
    const port = (n, side) => {
      const b=n.box,p=n.photo;
      const space={obstacles:nodes.filter(node=>node.id!==n.id).map(node=>node.box),width:W,height:H};
      if(side==='left') return geometry.terminalPort({side,tip:[p.left-8,p.cy],gate:[b.left-9,p.cy]},side,24,space);
      if(side==='right') return geometry.terminalPort({side,tip:[p.right+8,p.cy],gate:[b.right+9,p.cy]},side,24,space);
      if(side==='top') return geometry.terminalPort({side,tip:[p.cx,p.top-8],gate:[p.cx,b.top-9]},side,24,space);
      return geometry.terminalPort({side,tip:[p.cx,b.bottom+8],gate:[p.cx,b.bottom+9]},side,24,space);
    };
    const returnRails = new Map();
    const plan = relations.map((relation) => {
      const s=byId.get(relation.dataset.from),t=byId.get(relation.dataset.to);
      let a,b,via=[];
      const sameLane=s.lane===t.lane || s.span>1 || t.span>1;
      // Shared scenes span lanes: different actors may use the same physical
      // return corridor. Allocate bands by geometry, not actor/kind identity.
      const key=portrait ? Math.min(s.box.left,t.box.left)
        : Math.min(...nodes.filter(n=>n.lane===t.lane).map(n=>n.box.top));
      const returnLevel=s.era>t.era && sameLane ? (returnRails.get(key)||0) : 0;
      if(s.era>t.era && sameLane)returnRails.set(key,returnLevel+1);
      if(portrait){
        if(s.era===t.era){ a=s.lane<t.lane?'right':'left'; b=s.lane<t.lane?'left':'right'; }
        else if(s.era<t.era){a='bottom';b='top';}
        else if(sameLane){
          a='left';b='left';
          const rail=Math.max(43,Math.min(s.box.left,t.box.left)-17-returnLevel*6-(relation.dataset.kind==='life'?6:0));
          via=[[rail,s.photo.cy],[rail,t.photo.cy]];
        }else{
          a='top';b='bottom';
        }
      }else{
        if(s.era===t.era){a=s.lane<t.lane?'bottom':'top';b=s.lane<t.lane?'top':'bottom';}
        else if(s.era>t.era && sameLane){
          a='top';b='top';
          const band=Math.min(...nodes.filter(n=>n.lane===t.lane).map(n=>n.box.top))-18-returnLevel*9;
          via=[[s.photo.cx,band],[t.photo.cx,band]];
        }else if(s.era<t.era && sameLane){a='right';b='left';}
        else{
          // Cross-lane causes are not temporal return loops. Let visibility
          // routing use the nearest clear corridor, in either time direction.
          a=s.era<t.era?'right':'left';b=s.era<t.era?'left':'right';
        }
      }
      const defaultSides=[a,b],override=geometry.edgeOverride(diagramLayout,portrait,s.id,t.id);
      if(override.source_port)a=override.source_port;
      if(override.target_port)b=override.target_port;
      if(override.source_port||override.target_port)via=[];
      if(override.via?.length)via=geometry.waypoints(override.via,W,{x:s.photo.cx,y:s.photo.cy});
      const manual=Boolean(override.via?.length||override.source_port||override.target_port);
      let alternate=null;
      if(!manual&&s.span===1&&t.span===1){
        if(s.era!==t.era&&s.lane!==t.lane)alternate=portrait?(s.lane<t.lane?['right','left']:['left','right']):(s.lane<t.lane?['bottom','top']:['top','bottom']);
        else if(t.era-s.era>1&&s.lane===t.lane){
          // A continuing branch can use the shared inner corridor instead of
          // circling below every caption. Still compare it with the old ports.
          const inner=portrait?(s.photo.cx<W/2?'right':'left'):(s.photo.cy<H/2?'bottom':'top');
          alternate=[inner,inner];
        }
      }
      return {relation,id:geometry.edgeId(s.id,t.id),defaultSides,alternate,start:{...port(s,a),node:s.id,side:a,other:t.photo},end:{...port(t,b),node:t.id,side:b,other:s.photo},via,manual};
    });
    const fans=new Map();
    plan.forEach(p=>[p.start,p.end].forEach(endpoint=>{
      const key=`${endpoint.node}:${endpoint.side}`;
      if(!fans.has(key))fans.set(key,[]);fans.get(key).push(endpoint);
    }));
    fans.forEach(endpoints=>endpoints.sort((a,b)=>['top','bottom'].includes(a.side)?a.other.cx-b.other.cx:a.other.cy-b.other.cy).forEach((endpoint,i)=>{
      const axis=['top','bottom'].includes(endpoint.side)?0:1;
      const offset=(i-(endpoints.length-1)/2)*10;
      endpoint.tip[axis]+=offset;endpoint.gate[axis]+=offset;
    }));
    // A free port can align with the opposing fan port. Keep a clear forward
    // connection straight rather than drawing a five-pixel decorative jog.
    plan.forEach(p=>{
      const s=byId.get(p.start.node),t=byId.get(p.end.node);
      const axis=portrait?0:1;
      const aligned=portrait?s.photo.cx===t.photo.cx:s.photo.cy===t.photo.cy;
      const forward=portrait?p.start.side==='bottom' && p.end.side==='top'
        :p.start.side==='right' && p.end.side==='left';
      if(p.via.length || !aligned || !forward)return;
      const freeStart=fans.get(`${p.start.node}:${p.start.side}`).length===1;
      const freeEnd=fans.get(`${p.end.node}:${p.end.side}`).length===1;
      const endpoint=freeStart?p.start:freeEnd?p.end:null;
      if(endpoint){const v=(freeStart?p.end:p.start).tip[axis];endpoint.tip[axis]=v;endpoint.gate[axis]=v;}
    });
    plan.forEach(p=>{
      if(!p.via.length||p.manual)return;
      if(!portrait && p.start.side==='top' && p.end.side==='top'){
        p.via[0][0]=p.start.gate[0];p.via.at(-1)[0]=p.end.gate[0];
        const band=Math.min(p.via[0][1],p.start.gate[1],p.end.gate[1]);p.via.forEach(point=>{point[1]=band;});
      }else if(portrait && p.start.side==='left' && p.end.side==='left'){
        p.via[0][1]=p.start.gate[1];p.via.at(-1)[1]=p.end.gate[1];
        const rail=Math.min(p.via[0][0],p.start.gate[0],p.end.gate[0]);p.via.forEach(point=>{point[0]=rail;});
      }
    });
    plan.forEach(p=>p.via.forEach(point=>{if(Number.isFinite(point[1]))H=Math.max(H,point[1]+18);}));
    canvas.style.paddingBottom=`${basePadding+H-baseHeight}px`;
    const el=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
    svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const routed=new Map(),terminals=new Map(),occupied=[];
    const reservations=new Map([...fans].map(([key,endpoints])=>[key,endpoints.map(endpoint=>endpoint.tip[['top','bottom'].includes(endpoint.side)?0:1])]));
    const alternatePort=(id,side)=>{
      const node=byId.get(id),photo=node.photo,vertical=['top','bottom'].includes(side);
      return geometry.availablePort(port(node,side),side,reservations.get(`${id}:${side}`)||[],vertical?photo.left+4:photo.top+4,vertical?photo.right-4:photo.bottom-4);
    };
    const reserve=(id,side,endpoint)=>{const key=`${id}:${side}`;if(!reservations.has(key))reservations.set(key,[]);reservations.get(key).push(endpoint.tip[['top','bottom'].includes(side)?0:1]);};
    const length=p=>Math.abs(p.start.gate[0]-p.end.gate[0])+Math.abs(p.start.gate[1]-p.end.gate[1]);
    const route=(start,end,via=[],preferStraightStops=false)=>geometry.routeOrthogonal({start:start.gate,end:end.gate,startTip:start.tip,endTip:end.tip,via,obstacles,width:W,height:H,occupied,preferStraightStops});
    [...plan].sort((a,b)=>Number(b.manual)-Number(a.manual)||length(a)-length(b)).forEach(p=>{
      let {start,end}=p;
      ({start,end}=geometry.adaptTerminalPair(start,end,obstacles));
      const otherObstacles=nodes.filter(node=>node.id!==p.start.node&&node.id!==p.end.node).map(node=>node.box);
      const direct=!p.manual&&!p.via.length&&geometry.straightRoute(start.tip,end.tip,otherObstacles);
      if(direct){routed.set(p.id,direct);terminals.set(p.id,{start,end});occupied.push(...geometry.segments(direct));return;}
      let path=route(start,end,p.via,p.manual&&p.via.length>0);
      if(p.alternate){
        let altStart=alternatePort(p.start.node,p.alternate[0]),altEnd=alternatePort(p.end.node,p.alternate[1]);
        if(altStart&&altEnd)({start:altStart,end:altEnd}=geometry.adaptTerminalPair(altStart,altEnd,obstacles));
        const alternative=altStart&&altEnd&&route(altStart,altEnd);
        if(alternative&&(!path||geometry.pathCost([altStart.tip,...alternative,altEnd.tip],occupied,obstacles)<geometry.pathCost([start.tip,...path,end.tip],occupied,obstacles)-1)){
          start=altStart;end=altEnd;path=alternative;
          reserve(p.start.node,p.alternate[0],start);reserve(p.end.node,p.alternate[1],end);
        }
      }
      if(!path){
        if(p.manual)warnings.push(`Edge ${p.id}: requested waypoints or ports are blocked; automatic route shown.`);
        path=route(start,end);
      }
      if(!path){
        start=port(byId.get(p.start.node),p.defaultSides[0]);end=port(byId.get(p.end.node),p.defaultSides[1]);
        ({start,end}=geometry.adaptTerminalPair(start,end,obstacles));
        path=route(start,end);
      }
      if(!path){warnings.push(`Edge ${p.id}: no clear route; its relation remains in the text list.`);return;}
      const full=[start.tip,...path,end.tip],points=p.manual?geometry.compact(full):geometry.simplifyAuto(full,otherObstacles);routed.set(p.id,points);terminals.set(p.id,{start,end});occupied.push(...geometry.segments(points));
    });
    const arrows=[];
    plan.forEach(({relation,id})=>{
      const points=routed.get(id);if(!points)return;
      const d=geometry.roundedPath(points,7,9);
      // A narrow surface-colored bridge makes a necessary crossing visibly
      // distinct from a junction; adjacent return rails have separate bands.
      svg.append(el('path',{class:'time-map__bridge',d,stroke:'#f8fbfc','stroke-width':5.5,fill:'none','stroke-linejoin':'round'}));
      svg.append(el('path',{class:'time-map__edge','data-from':relation.dataset.from,'data-to':relation.dataset.to,d,stroke:colors[relation.dataset.kind]}));
      arrows.push(el('polygon',{class:'time-map__arrow','data-from':relation.dataset.from,'data-to':relation.dataset.to,points:geometry.arrowHead(points).map(point=>point.join(',')).join(' '),fill:colors[relation.dataset.kind],stroke:'none'}));
    });
    // Later crossing bridges may cover an earlier body, never its arrowhead.
    svg.append(...arrows);
    highlight();
    if(warnings.length)map.dataset.diagramLayoutWarning=warnings.join('\n');else delete map.dataset.diagramLayoutWarning;
    const terminalSnapshot=id=>terminals.has(id)?Object.fromEntries(Object.entries(terminals.get(id)).map(([key,{tip,gate,side}])=>[key,{tip,gate,side}])):undefined;
    lastGeometry={variant:portrait?'mobile':'desktop',width:W,height:H,obstacles,nodes:nodes.map(node=>({id:node.id,box:{left:node.box.left,top:node.box.top,width:node.box.width,height:node.box.height},anchor:{x:node.photo.cx,y:node.photo.cy},offsetCurrent:geometry.mode(diagramLayout,portrait).nodes?.[node.id]||{x:0,y:0}})),edges:plan.map(p=>({id:p.id,from:p.relation.dataset.from,to:p.relation.dataset.to,points:routed.get(p.id)||[],terminals:terminalSnapshot(p.id)}))};
    if(typeof CustomEvent==='function')map.dispatchEvent(new CustomEvent('elio:diagram-drawn',{bubbles:true}));
  };
  let queued=false;
  const schedule=()=>{if(disposed||queued)return;queued=true;frame=requestAnimationFrame(()=>{frame=0;queued=false;if(!disposed)draw();});};
  map.elioDiagram={kind:'time_map',surface:canvas,nodes:links.map(link=>({id:link.dataset.timeNode,label:model?.nodes?.find(node=>node.id===link.dataset.timeNode)?.label||link.textContent||link.dataset.timeNode})),edges:relations.map(relation=>({id:geometry.edgeId(relation.dataset.from,relation.dataset.to),from:relation.dataset.from,to:relation.dataset.to,label:relation.textContent||''})),getLayout:()=>geometry.clone(diagramLayout),setLayout:value=>{diagramLayout=geometry.clone(value);schedule();},geometry:()=>geometry.clone(lastGeometry)};
  const diagram = map.elioDiagram, reader = map.storyReader;
  for(const element of [canvas,...links]){const observer=new ResizeObserver(schedule);observer.observe(element);observers.push(observer);}
  document.fonts?.ready.then(schedule);
  schedule();
  const dispose=()=>{
    if(disposed)return;
    disposed=true;cancelAnimationFrame(frame);frame=0;queued=false;
    observers.forEach(observer=>observer.disconnect());
    listeners.forEach(remove=>remove());
    restore();
    if(dialog.open)dialog.close();
    dialog.remove();
    if(!document.querySelector('dialog.story-detail[open]'))document.body.classList.remove('story-detail-open');
    if(!prior.enhanced)map.classList.remove('time-map--enhanced');
    details.forEach((detail,index)=>{detail.open=prior.detailOpen[index];});
    for(const [link,current,popup] of prior.attributes){
      if(current===null||current===undefined)link.removeAttribute('aria-current');else link.setAttribute('aria-current',current);
      if(popup===null||popup===undefined)link.removeAttribute('aria-haspopup');else link.setAttribute('aria-haspopup',popup);
    }
    links.forEach((link,index)=>{link.style.transform=prior.transforms[index]||'';});
    canvas.style.paddingBottom=prior.paddingBottom||'';
    svg.replaceChildren(...prior.svgChildren);
    if(prior.viewBox===null||prior.viewBox===undefined)svg.removeAttribute('viewBox');else svg.setAttribute('viewBox',prior.viewBox);
    if(prior.warning===undefined)delete map.dataset.diagramLayoutWarning;else map.dataset.diagramLayoutWarning=prior.warning;
    if(map.storyReader===reader){if(prior.storyReader===undefined)delete map.storyReader;else map.storyReader=prior.storyReader;}
    if(map.elioDiagram===diagram){if(prior.elioDiagram===undefined)delete map.elioDiagram;else map.elioDiagram=prior.elioDiagram;}
    if(mounted.get(map)===dispose)mounted.delete(map);
  };
  mounted.set(map,dispose);
  return dispose;
}
function mount(root, {restoreHash = true} = {}) {
  const maps=[...(root.matches?.('.time-map')?[root]:[]),...root.querySelectorAll('.time-map')];
  const disposers=maps.map(map=>mountMap(map,{restoreHash}));
  let disposed=false;
  return ()=>{if(disposed)return;disposed=true;disposers.forEach(dispose=>dispose());};
}
globalThis.ElioTimeMap={mount};
if(typeof document!=='undefined')mount(document);
})();
