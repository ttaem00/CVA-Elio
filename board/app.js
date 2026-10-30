/* Review prototype. Original narrative records stay in data.js; camera and visual modes are view state. */
(async () => {
  'use strict';
  const C = window.CVA_COMPONENTS, P = window.ElioGameProjection, esc = C.escape;
  const product = window.ElioProductFlow;
  const documents = window.ElioBoardDocuments;
  let inputs;
  try { inputs = await documents.loadDocuments({href:location.href,documents:window.ELIO_BOARD_DOCUMENTS||[],fetch:window.fetch.bind(window)}); }
  catch(error) { window.ElioBoardStartup?.error(error);const status=document.getElementById('status-line');status.textContent=`문서를 열지 못했습니다: ${error.message}`;status.setAttribute('role','alert');return; }
  window.ElioBoardStartup?.message('장면과 관계를 배치하고 있습니다.');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const canonical = new Map(inputs.map(data=>[data.work_id,data]));
  const works = inputs.length ? inputs.map(data=>documents.projectDocument(data,window.ELIO_BOARD_ASSETS,window.ELIO_BOARD_READER_BASE||location.href)) : [...(window.CVA_VISUAL_DATA?.works||[]),...(window.ELIO_PRODUCT_DATA?.works||[]).map(w=>({...w,product_flow:true}))];
  const elioCard = window.ElioDepthCard;
  const contentPicker = window.ElioContentPicker;
  const closeIcon = '<svg class="ui-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>';
  const $ = id => document.getElementById(id);
  const viewport = $('viewport'), camera = $('camera'), world = $('world'), reading = $('reading');
  const captions = { atlas:'장면과 선택의 연결을 한눈에 봅니다.', tapestry:'그림 속에 머물며, 다음 갈래를 발견합니다.', depth:'기본은 정면. 카드에 포인터를 올리면 얕게 기울어집니다.', hud:'하나의 패널이 함께 기울어지고, 프레임의 빛이 반응합니다.' };
  const roleNames = {scene:'장면', decision:'선택·갈래', outcome:'이 갈래의 끝', item:'항목'};
  const memory = new Map();
  const readerReplayDocuments = new Map();
  const selectionHistory = new Map(works.map(w=>[w.id,[]]));
  const readMarks = new Map(works.map(w => [w.id,new Set()]));
  const defaults = { 'glass-city-fiction':'mirror-decision', 'detroit-become-human':'negotiate', 'archive-catalog':'observation-notebook' };
  const params = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  const audience=query.get('audience');
  const reader=(typeof document!=='undefined'&&document.documentElement.dataset.readerOnly==='true')||/^\/storytimeline\/board(?:\/(?:index\.html)?)?$/.test(location.pathname)||audience==='reader';
  const continuousReader=current=>reader&&current.kind==='story'&&Boolean(current.reader_context?.unit_id);
  function readerView(current,viewId) {
    const views=current.views||current.display_groups||[],requested=views.find(view=>view.id===viewId);
    const unit=requested?.unit_id||(!requested?current.reader_context?.unit_id:null);
    if(requested&&requested.id!==unit)return requested;
    const candidates=views.filter(view=>!view.parent_view_id&&(!unit||view.unit_id===unit));
    const meaningful=view=>Boolean(view.time_map?.nodes?.length||view.story_topology?.edges?.length||view.story_topology?.alignments?.length);
    return candidates.find(view=>view.id===current.reading_state?.view&&meaningful(view))
      ||candidates.find(view=>view.time_map?.nodes?.length)
      ||candidates.find(view=>view.perspective_id&&meaningful(view))
      ||requested||candidates.find(view=>view.id===unit);
  }
  const minScale = reader ? .008 : .04;
  for(const value of works){
    value.reader_audience=reader;
    value.reader_all_flows=continuousReader(value);
    if(reader&&!value.board_presentation?.image_fit)value.board_presentation={...value.board_presentation,image_fit:'cover'};
  }
  const productEntry = query.get('experience')==='product';
  const initialWork = works.find(w => w.id===params.get('work')) || works.find(w=>w.id===query.get('work')) || works.find(w=>w.id===(productEntry?'overview':'glass-city-fiction')) || works[0];
  const initialDocument = canonical.get(initialWork.id), savedBoard = initialDocument?.board_state||{};
  const initialContinuous=continuousReader(initialWork);
  const requestedView=params.get('view')||query.get('view');
  const wholeReaderRoute=initialContinuous&&params.has('work')&&!params.get('view');
  const initialPerspectiveView=initialContinuous&&!wholeReaderRoute?(initialWork.views||[]).find(view=>view.id===requestedView&&view.perspective_id):null;
  const logicalView=wholeReaderRoute?null:reader?((initialWork.views||initialWork.display_groups||[]).find(view=>view.id===params.get('view'))||readerView(initialWork,query.get('view'))):initialDocument?.views?.find(view=>view.id===(requestedView||savedBoard.view||initialDocument.reading_state?.view));
  if(logicalView)initialWork.display_view=logicalView.id;
  else if(wholeReaderRoute)initialWork.display_view=undefined;
  const initialRows = initialWork.events || initialWork.items;
  const requestedNode = params.get('node')||query.get('node')||query.get('scene')||query.get('selected')?.replace(/^event:/,'')||(query.get('view')&&logicalView?logicalView.event_ids[0]:savedBoard.node||initialDocument?.reading_state?.selected?.replace(/^event:/,'')||logicalView?.event_ids[0]);
  const entryUnit=logicalView?.unit_id||initialWork.reader_context?.unit_id;
  const matchedId = initialRows.find(i=>i.id===requestedNode)?.id
    || initialRows.find(i=>i.original_event_id===requestedNode&&(!entryUnit||i.unit_id===entryUnit))?.id
    || logicalView?.event_ids[0] || initialRows.find(i=>i.id===defaults[initialWork.id])?.id || initialRows[0].id;
  const initialId=reader&&!initialContinuous&&logicalView&&!logicalView.event_ids.includes(matchedId)?logicalView.event_ids[0]:matchedId;
  const initialMode=reader?(initialContinuous?'hud':documents.presentation(initialWork).style||'atlas'):params.get('mode')||query.get('mode')||documents.presentation(initialWork).style||savedBoard.mode||(captions[query.get('view')]?query.get('view'):'hud');
  const initialScope=reader?(initialContinuous?'chapter':params.get('scope')==='chapter'?'chapter':logicalView?'stage':'chapter'):params.get('scope')||(query.get('view')&&logicalView?'stage':savedBoard.scope||(logicalView?'stage':null));
  const state = {work:initialWork.id, selected:initialId, mode:captions[initialMode]?initialMode:'hud', scope:['chapter','stage','focus'].includes(initialScope)?initialScope:(productEntry?'chapter':'focus'), preview:!reader&&Boolean(initialDocument||product?.isWork(initialWork)), hudEffect:!reader&&(params.get('card')||savedBoard.card)==='glow'?'glow':'3d', query:'', category:'전체', orbit:false, angleX:0, angleY:0, camera:{x:0,y:0,scale:1}, reduced:null, trail:[]};
  const motion=params.get('motion')||(reader?query.get('motion'):savedBoard.motion);
  state.reduced=motion==='full'?false:motion==='reduced'?true:null;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const depthPose = () => ({angleX:0,angleY:0});
  Object.assign(state,depthPose(state.mode));
  let layout, motionRAF=0, toastTimer=0, resizeRAF=0, viewTransition, transitionId=0, drag=null, lastPointer=null;
  let graphWork=null, graphKey='', graphSelection='', catalogKey='', cameraRAF=0, highlightKey=null, lastZoom='';
  let paintTargets=[],lastLabelScale='';
  let readerPanelRAF=0;
  const readerPanels=new Set();
  let readingContext=null;
  const imageRatios=new Map();
  let mediaRAF=0, pendingMedia=false;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let hudPanel=null, hudBounds=null, hudPoint=null, hudRAF=0;
  function resetHudPanel() {
    cancelAnimationFrame(hudRAF);hudRAF=0;hudPoint=null;
    if(hudPanel){hudPanel.classList.remove('hud-pointer-active');hudPanel.style.removeProperty('--hud-px');hudPanel.style.removeProperty('--hud-py');}
    hudPanel=null;hudBounds=null;
  }
  function moveHudPanel(e) {
    if(state.mode!=='hud'||panelEffect()==='flat'||motionReduced()||e.pointerType!=='mouse'||drag||e.buttons){resetHudPanel();return;}
    const panel=e.target.closest('[data-hud-panel]');
    if(!panel||panel.closest('[hidden],[inert]')){resetHudPanel();return;}
    if(panel!==hudPanel){resetHudPanel();hudPanel=panel;hudBounds=panel.getBoundingClientRect();panel.classList.add('hud-pointer-active');}
    hudPoint={x:e.clientX,y:e.clientY};
    if(hudRAF)return;
    hudRAF=requestAnimationFrame(()=>{
      hudRAF=0;if(!hudPanel?.isConnected||!hudPoint||!hudBounds?.width||!hudBounds.height){resetHudPanel();return;}
      const x=clamp((hudPoint.x-hudBounds.left)/hudBounds.width,0,1),y=clamp((hudPoint.y-hudBounds.top)/hudBounds.height,0,1);
      hudPanel.style.setProperty('--hud-px',`${(x*100).toFixed(1)}%`);hudPanel.style.setProperty('--hud-py',`${(y*100).toFixed(1)}%`);
    });
  }
  const work=()=>works.find(w=>w.id===state.work);
  // Color/layout style and the card's interaction are independent author choices.
  function panelEffect() {
    const panel=documents.presentation(work()).panel;
    return panel==='auto'?(state.mode==='hud'?state.hudEffect:'auto'):panel;
  }
  const usesPanels=()=>Boolean(elioCard&&['3d','glow'].includes(panelEffect()));
  const rows=()=>work().events||work().items;
  const item=(id=state.selected)=>rows().find(i=>i.id===id)||rows()[0];
  function focusSelection() {
    if(!reading.hidden)return;
    const container=work().kind==='catalog'?$('catalog-grid'):$('nodes');
    const candidates=[container.querySelector(`[data-node="${CSS.escape(state.selected)}"]`),state.preview?$('preview').querySelector('[data-action="read"]'):null,work().kind==='catalog'?$('catalog-search'):viewport];
    candidates.find(el=>el&&el.getClientRects().length&&!el.disabled&&!el.closest('[hidden],[inert]'))?.focus({preventScroll:true});
  }
  const edges=()=>work().edges||[];
  const role=i=>P.role(work(),i);
  const roleLabel=i=>product?.isWork(work())?({scene:'행동·상태',decision:'조건·선택',outcome:'결과',item:'항목'}[role(i)]||'단계'):(roleNames[role(i)]||'장면');
  const outgoing=(id=state.selected)=>edges().filter(e=>e.from===id);
  const incoming=(id=state.selected)=>edges().filter(e=>e.to===id);
  const number=i=>{const ids=continuousReader(work())?(work().views||[]).find(view=>!view.parent_view_id&&view.event_ids.includes(i.id))?.event_ids:reader&&state.scope==='stage'?P.groupFor(work(),i.id)?.event_ids:null;return String((ids?ids.indexOf(i.id):rows().findIndex(r=>r.id===i.id))+1).padStart(2,'0');};
  const sceneMeta=(i,label=roleLabel(i))=>i.map_context||`${number(i)} · ${work().kind==='catalog'?(i.category||'항목'):label}`;
  function art(i) {
    if(work().authored) {
      const image=i.image||(i.image_site_asset||i.image_url?{src:i.image_site_asset||i.image_url,alt:i.image_alt||i.title}:null);
      return typeof image==='string'?{src:image,alt:i.title}:image?{...image,position:image.position||'center'}:null;
    }
    if(work().id==='glass-city-fiction') {
      const key=i.id.includes('crown-')?'city':i.id.includes('exile-')?'village':i.id.includes('roof')?'beacon':i.id==='mirror-decision'?'crown':null;
      return {src:key?`assets/${key}-scene.png`:'assets/palace-background.png',alt:`${i.title}의 분위기를 표현한 창작 일러스트`,position:key==='beacon'?'35% center':key==='city'?'60% center':'center'};
    }
    if(work().kind==='catalog' && i.image) return typeof i.image==='string'?{src:i.image,alt:i.title}:i.image;
    return null;
  }
  function mediaSizes() {
    return Object.fromEntries(rows().map(i=>{const image=art(i);return [i.id,{aspectRatio:imageRatios.get(image?.src)}];}));
  }
  function mediaStyle(n) {
    return n.mediaHeight?`--node-media-height:${n.mediaHeight}px;--node-image-fit:${n.imageFit==='cover'?'cover':'contain'};`:'';
  }
  function applyPresentation() {
    const presentation=documents.presentation(work()),background=presentation.background;
    const shell=document.querySelector('.stage-shell'),backdrop=document.querySelector('.scene-backdrop');
    // The illustration belongs to this sample, never to an imported story.
    const image=background.image||(!work().authored&&work().id==='glass-city-fiction'?'assets/palace-background.png':'');
    backdrop.style.backgroundImage=image?`url(${JSON.stringify(image)})`:'none';
    if(background.image)backdrop.style.opacity=String(background.opacity);else backdrop.style.removeProperty('opacity');
    if(background.color)shell.style.backgroundColor=background.color;else shell.style.removeProperty('background-color');
    shell.dataset.imageFit=presentation.image_fit;
    document.body.dataset.panel=panelEffect();
    document.body.style.setProperty('--accent',presentation.accent||'');
    document.body.style.setProperty('--panel-accent',presentation.accent||'');
    document.body.style.setProperty('--accent-rgb',presentation.accent?presentation.accent.slice(1).match(/../g).map(hex=>parseInt(hex,16)).join(','):'');
  }
  function rememberImage(image) {
    if(!image.naturalWidth||!image.naturalHeight)return;
    const src=image.getAttribute('src'),ratio=image.naturalWidth/image.naturalHeight;
    if(imageRatios.get(src)===ratio)return;
    imageRatios.set(src,ratio);
    if(work().board_presentation?.image_fit==='cover')return;
    if(!rows().some(i=>art(i)?.src===src))return;
    pendingMedia=true;
    if(mediaRAF||readingContext||!reading.hidden)return;
    mediaRAF=requestAnimationFrame(()=>{mediaRAF=0;refreshMedia();});
  }
  function refreshMedia() {
    if(!pendingMedia||readingContext||!reading.hidden)return;
    pendingMedia=false;
    const focused=document.activeElement?.closest('#nodes [data-node],#catalog-grid [data-node]');
    const focusId=focused?.dataset.node;
    const selected=layout?.nodes.find(n=>n.item.id===state.selected);
    const center=selected?{x:state.camera.x+(selected.x+selected.w/2)*state.camera.scale,y:state.camera.y+(selected.y+selected.h/2)*state.camera.scale}:null;
    graphWork=null;catalogKey='';
    if(work().kind==='catalog')renderCatalog();else {
      drawGraph();
      const next=layout.nodes.find(n=>n.item.id===state.selected);
      if(center&&next){stopMotion();state.camera={...state.camera,x:center.x-(next.x+next.w/2)*state.camera.scale,y:center.y-(next.y+next.h/2)*state.camera.scale};applyCamera();keepSelectionVisible(false,false);}
    }
    if(focusId){const container=work().kind==='catalog'?$('catalog-grid'):$('nodes');const target=container.querySelector(`[data-node="${CSS.escape(focusId)}"]`);if(target)target.focus({preventScroll:true});else focusSelection();}
  }
  function captureLoadedImages(container) {
    container.querySelectorAll('img').forEach(image=>{if(image.complete)rememberImage(image);});
  }
  function condition(e) {
    const source=work().edge_conditions;
    if(Array.isArray(source)) { const row=source.find(c=>c.from===e.from&&c.to===e.to); return row?.condition||row?.label||e.label||''; }
    return source?.[`${e.from}->${e.to}`]||e.label||'';
  }
  function announce(text){clearTimeout(toastTimer);$('toast').textContent='';$('selection-status').textContent=text;}
  function notify(text) { clearTimeout(toastTimer); $('toast').textContent=text; toastTimer=setTimeout(()=>$('toast').textContent='',2200); }
  function route(push=false) { const hash=`#${new URLSearchParams({work:state.work,mode:state.mode,node:state.selected,scope:state.scope,...(work().display_view?{view:work().display_view}:{}),...(state.hudEffect==='glow'?{card:'glow'}:{}),...(state.reduced===null?{}:{motion:state.reduced?'reduced':'full'})})}`;if(location.hash===hash)return;history[push?'pushState':'replaceState'](null,'',hash); }
  function restoreRoute() {
    const p=new URLSearchParams(location.hash.slice(1)),requested=works.find(w=>w.id===p.get('work'));
    if(!requested)return;
    const previousView=requested.display_view;
    const continuous=continuousReader(requested);
    const routeView=[...(requested.views||[]),...(requested.display_groups||[])].find(group=>group.id===p.get('view'));
    const view=reader&&!continuous?(routeView||readerView(requested,requested.display_view)):routeView;
    if(view)requested.display_view=view.id;
    else if(continuous)requested.display_view=undefined;
    const records=requested.events||requested.items,matched=records.find(i=>i.id===p.get('node'))?.id||records[0].id;
    const scope=reader?(continuous?'chapter':p.get('scope')==='chapter'?'chapter':view?'stage':'chapter'):['chapter','stage','focus'].includes(p.get('scope'))?p.get('scope'):'focus';
    const id=reader&&!continuous&&scope==='stage'&&view&&!view.event_ids.includes(matched)?view.event_ids[0]:matched,mode=reader?(continuous?'hud':documents.presentation(requested).style||'atlas'):captions[p.get('mode')]?p.get('mode'):'hud',hudEffect=!reader&&p.get('card')==='glow'?'glow':'3d';
    const reduced=p.get('motion')==='full'?false:p.get('motion')==='reduced'?true:null;
    if(state.work===requested.id&&state.selected===id&&state.mode===mode&&state.scope===scope&&state.hudEffect===hudEffect&&state.reduced===reduced&&previousView===requested.display_view&&reading.hidden&&!readingContext)return;
    if(state.work!==requested.id||state.selected!==id||state.scope!==scope){const visits=selectionHistory.get(requested.id),index=visits.findLastIndex(v=>v.id===id&&v.scope===scope);if(index>=0)visits.splice(index);else if(state.work===requested.id){visits.push({id:state.selected,scope:state.scope,preview:state.preview,camera:{...state.camera},width:viewport.clientWidth,height:viewport.clientHeight});if(visits.length>40)visits.shift();}}
    saveWork();stopMotion();resetHudPanel();viewTransition?.skipTransition();transitionId++;
    readingContext=null;reading.hidden=true;$('app').inert=false;
    const saved=memory.get(requested.id);
    Object.assign(state,{work:requested.id,selected:id,mode,scope,hudEffect,reduced,preview:!reader,query:saved?.query||'',category:saved?.category||'전체',orbit:false,...depthPose(mode)});
    render();if(continuous&&view)focusReaderView(view.id,false);else fit(false);focusSelection();
  }
  function modeCaption(){return state.mode==='hud'&&state.hudEffect==='glow'?'고정 카드 · 형태는 유지하고 프레임의 빛만 움직입니다.':captions[state.mode];}
  function motionReduced() { return state.reduced===null?(reader||prefersReduced.matches):state.reduced; }
  function applyMotion() {
    resetHudPanel();
    window.ElioDepthHover?.reset();
    document.body.classList.toggle('motion-reduced',motionReduced());
    document.body.classList.toggle('motion-full',!motionReduced());
    elioCard?.setEffect?.(usesPanels()?panelEffect():state.hudEffect);elioCard?.setMotionEnabled?.(!motionReduced());
    $('motion-button').setAttribute('aria-pressed',String(motionReduced()));
    $('motion-button').title=motionReduced()?'움직임 감소 켜짐 · 눌러서 3D 움직임 켜기':'3D 움직임 켜짐 · 눌러서 움직임 줄이기';
    $('mode-caption').textContent=motionReduced()&&['hud','depth'].includes(state.mode)?'움직임 감소 켜짐 · 기울기 없이 읽기와 선택을 유지합니다.':modeCaption();
    if(motionReduced()){state.orbit=false;world.style.setProperty('--orbit-x','0deg');world.style.setProperty('--orbit-y','0deg');viewport.style.setProperty('--px','0px');viewport.style.setProperty('--py','0px');}
    else{world.style.setProperty('--orbit-x',`${state.angleX}deg`);world.style.setProperty('--orbit-y',`${state.angleY}deg`);}
    $('orbit-button').setAttribute('aria-pressed',String(state.orbit));
    $('orbit-button').disabled=motionReduced();$('reset-angle').disabled=motionReduced();
    queueReaderPanels();
  }
  function saveWork() { memory.set(state.work,{selected:state.selected,mode:state.mode,scope:state.scope,query:state.query,category:state.category,camera:{...state.camera}}); }
  function chooseWork(id, options={}) {
    if(!works.some(w=>w.id===id))return;
    if(readingContext||!reading.hidden){viewTransition?.skipTransition();transitionId++;readingContext=null;reading.hidden=true;$('app').inert=false;}
    saveWork(); stopMotion(); state.work=id;
    const saved=memory.get(id), list=rows(), appearance=documents.presentation(work()),continuous=continuousReader(work()),mode=reader?(continuous?'hud':appearance.style||'atlas'):options.mode||saved?.mode||appearance.style||canonical.get(id)?.board_state?.mode||'hud';
    const savedState=canonical.get(id)?.board_state||{};
    state.hudEffect=savedState.card==='glow'?'glow':'3d';
    state.reduced=reader?null:savedState.motion==='full'?false:savedState.motion==='reduced'?true:null;
    Object.assign(state,{selected:list.find(r=>r.id===options.node)?.id||saved?.selected||list.find(r=>r.id===defaults[id])?.id||list[0].id,mode,scope:continuous?'chapter':options.scope||saved?.scope||((reader||product?.isWork(work()))?'chapter':'focus'),query:saved?.query||'',category:saved?.category||'전체',preview:!reader,orbit:false,...depthPose(mode)});
    render(); if(saved?.camera&&!options.node){state.camera={...saved.camera};applyCamera();}else fit(false);
    route(true); announce(`${work().title}, ${modeCaption()}`);
  }
  function chooseMode(mode) {
    if(reader||!captions[mode]||mode===state.mode)return;
    stopMotion();window.ElioDepthHover?.reset(); state.mode=mode;state.orbit=false;Object.assign(state,depthPose(mode));
    document.body.dataset.mode=mode; updateChrome(); applyMotion();
    if(work().kind==='catalog'){renderCatalog();renderPreview();}else drawGraph();
    fit(true); route(true); announce(`${$('mode-caption').textContent} 선택한 ${item().title}은 유지됩니다.`);
  }
  function updateReaderChrome() {
    const current=work(),context=current.reader_context||{},continuous=continuousReader(current);
    const views=current.views||current.display_groups||[],chosen=views.find(view=>view.id===current.display_view);
    const active=continuous?(chosen?.parent_view_id||chosen?.id||''):state.scope==='stage'?P.groupFor(current,state.selected)?.id:'',activeView=views.find(view=>view.id===active);
    const select=$('reader-view-select'),options=views.filter(view=>!view.parent_view_id);
    select.innerHTML=`<option value="">${continuous?'전체 흐름':'수록된 이야기 전체'}</option>`+options.map(view=>`<option value="${esc(view.id)}"${view.id===active?' selected':''}>${esc(!continuous&&view.id===activeView?.parent_view_id?`${view.title} · ${activeView.title}`:view.title)}</option>`).join('');
    select.value=activeView?.parent_view_id||active||'';
    $('reader-navigation').hidden=current.kind==='catalog';
    $('chapter-button').textContent=continuous?'전체 흐름 맞추기':'여기까지 전체';
    $('stage-button').textContent=continuous?'고른 관점으로 이동':'고른 막·관점';
    $('stage-button').disabled=continuous?!activeView:!views.length;
    if(continuous)for(const id of ['chapter-button','stage-button'])$(id).removeAttribute('aria-pressed');
    $('material-note').textContent=context.chapter_label||current.title;
    const through=context.through_label||context.unit_label;
    const sourceCount=current.overview_event_ids?.length||rows().length,perspectiveCount=rows().length-sourceCount;
    const chapter=current.chapters?.find(row=>row.id===activeView?.chapter_id),count=activeView?.event_ids.length||rows().length;
    const unitCount=views.find(view=>view.id===activeView?.unit_id)?.event_ids.length||count;
    const description=layout?.overviewKind?`${layout.nodes.length}개 구간 · ${layout.sceneCount}개 장면`:activeView?.perspective_id?`${count}개 핵심 장면 · 본편 ${unitCount}개 장면`:`${count}개 장면`;
    $('board-context').innerHTML=continuous?`<strong>${esc(context.chapter_label||current.title)}</strong>${through?` · ${esc(through)}까지`:''} · 본편 ${sourceCount}개 장면${perspectiveCount?` · 관점 ${perspectiveCount}개 노드`:''}`:`<strong>${esc(state.scope==='stage'?(chapter?.title||activeView?.title||current.title):(context.chapter_label||current.title))}</strong>${state.scope==='chapter'&&through?` · ${esc(through)}까지`:''} · ${esc(description)}`;
    $('scope-label').textContent=activeView?.title||'수록된 이야기 전체';
    const map=continuous?(layout?.timeMaps?.find(frame=>frame.id===active)||layout?.timeMap):state.scope==='stage'?layout?.timeMap:null,summary=$('reader-map-summary');
    const kinds=map?.edgeKinds||['life','world','actor-a','actor-b'];
    summary.hidden=!map;
    summary.innerHTML=map?`<strong>${esc(map.title)}</strong> ${esc(map.summary)}<span class="reader-map-legend">${kinds.includes('life')?'<span class="map-life">흐름</span>':''}${kinds.includes('world')?'<span class="map-world">인과</span>':''}${kinds.includes('actor-a')?`<span class="map-actor-a">${esc(map.lanes[0]?.label||'첫째 경로')}</span>`:''}${kinds.includes('actor-b')?`<span class="map-actor-b">${esc(map.lanes[1]?.label||'둘째 경로')}</span>`:''}</span>`:'';
    const back=$('reader-return'),destination=views.find(view=>view.id===active)?.reader_url||context.return_url||current.reader_url;
    back.hidden=true;
    if(destination){try{back.href=C.safeHref(new URL(destination,window.ELIO_BOARD_READER_BASE||location.href).href);back.hidden=false;}catch{}}
  }
  function updateChrome() {
    applyPresentation();
    document.body.dataset.hudEffect=state.hudEffect;document.body.dataset.mode=state.mode;document.body.dataset.work=state.work;document.body.dataset.scope=state.scope;document.body.dataset.product=String(Boolean(product?.isWork(work())));product?.update(work(),state.mode);
    $('hud-effects-open').hidden=state.mode!=='hud'||documents.presentation(work()).panel!=='auto';document.querySelectorAll('[data-hud-effect]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hudEffect===state.hudEffect)));if($('hud-effects-open').hidden&&$('hud-effects-dialog').open)$('hud-effects-dialog').close();
    document.querySelector('.stage-shell').dataset.ceVariant=`${state.work}-${state.mode}`;
    document.querySelectorAll('.mode-nav [data-mode]').forEach(b=>{const on=b.dataset.mode===state.mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));if(on&&innerWidth<700)b.scrollIntoView({block:'nearest',inline:'nearest'});});
    $('mode-caption').textContent=motionReduced()&&['hud','depth'].includes(state.mode)?'움직임 감소 켜짐 · 기울기 없이 읽기와 선택을 유지합니다.':modeCaption();contentPicker?.update(work());
    $('material-note').textContent=work().authored?(work().material||'제공한 Elio 콘텐츠'):product?.isWork(work())?'Product User Flow · 현재 동작과 제안 구분':work().kind==='catalog'?'창작 도감 · 이미지 2종':work().id==='glass-city-fiction'?'창작 이야기 · 일러스트':'문헌에 근거한 편집 요약 · 이미지 없는 사건';
    const catalog=work().kind==='catalog';
    $('camera-controls').hidden=catalog;$('map-toolbar').hidden=catalog;$('minimap').hidden=catalog;$('status-line').hidden=catalog;
    $('orbit-button').hidden=state.mode!=='depth'||catalog;$('reset-angle').hidden=state.mode!=='depth'||catalog;
    $('camera').hidden=catalog;$('catalog-stage').hidden=!catalog;
    $('chapter-button').textContent=product?.isWork(work())?'이 여정 전체':'장 전체';$('focus-button').textContent=product?.isWork(work())?'현재 단계 주변':'현재 갈래';
    const homeLabel=product?.isWork(work())?'현재 단계로 이동':'현재 장면으로 이동';$('home-button').setAttribute('aria-label',homeLabel);$('home-button').title=homeLabel;
    $('chapter-button').setAttribute('aria-pressed',String(state.scope==='chapter'));
    $('stage-button').setAttribute('aria-pressed',String(state.scope==='stage'));
    $('stage-button').disabled=!(work().display_groups||[]).length;
    $('focus-button').setAttribute('aria-pressed',String(state.scope==='focus'));
    $('back-selection-button').disabled=selectionHistory.get(state.work).length===0;
    viewport.setAttribute('aria-label',`${product?.isWork(work())?'사용자 여정 지도':'이야기 지도'}. 빈 공간을 끌어 이동하고, 확대 버튼 또는 휠로 확대합니다.`);
    for(const [kind,label] of Object.entries(product?.isWork(work())?{scene:'행동·상태',decision:'조건·선택',outcome:'결과'}:{scene:'장면',decision:'선택',outcome:'갈래의 끝'}))document.querySelector(`.board-legend [data-kind="${kind}"]`).textContent=label;
    const returnKey=document.querySelector('.board-legend [data-kind="return"]');if(edges().some(edge=>edge.relation==='return')){const key=returnKey||document.createElement('span');key.dataset.kind='return';key.textContent=product?.isWork(work())?'재시도·복귀':'되돌아가는 연결';if(!returnKey)document.querySelector('.board-legend').append(key);}else returnKey?.remove();
    $('stage-tabs').innerHTML=(work().display_groups||[]).map((g,n)=>`<button data-stage="${esc(g.id)}"${g.id===P.groupFor(work(),state.selected)?.id?' class="active" aria-current="step"':''}><span>${String(n+1).padStart(2,'0')}</span> ${esc(g.title)}</button>`).join('');
    if(reader)updateReaderChrome();
    const count=readMarks.get(state.work).size;
    $('status-line').textContent=catalog?'항목을 선택해 쓰임과 자료를 읽어보세요.':`빈 공간을 끌어 이동 · ${product?.isWork(work())?'단계를 골라 제품 화면 확인':'장면을 골라 읽기'}${state.mode==='hud'?' · 프레임 빛 반응':''}${count?` · 이 세션에서 열어본 장면 ${count}개`:''}`;
  }
  function nodeMarkup(n) {
    const i=n.item, image=art(i), stage=n.groupView?` data-stage="${esc(n.groupView)}"`:'',selected=i.id===state.selected, near=edges().some(e=>(e.from===state.selected&&e.to===i.id)||(e.to===state.selected&&e.from===i.id));
    const type=typeof n.role==='string'?n.role:role(i);
    const classes=`scene-node ${i.map_label?'has-map-label':''} ${image?'has-image':'text-only'} ${selected?'is-selected':''} ${near?'is-near':''} ${readMarks.get(state.work).has(i.id)?'is-read':''} ${type==='outcome'?'is-ending':''} ${type==='decision'?'is-decision':''} ${n.boundary?'is-boundary':''}`;
    const position=`${mediaStyle(n)}left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px`;
    const panels=usesPanels(),deferred=reader&&panels;
    if(panels&&!deferred)return `<div class="${classes}" data-elio-card-host="${esc(i.id)}"${stage} style="${position}">${portsMarkup(n)}</div>`;
    const native=`<button class="${deferred?'reader-card-fallback':classes}"${deferred?' data-reader-fallback':''} data-hud-panel data-node="${esc(i.id)}"${stage}${deferred?'':` style="${position}"`} aria-label="${esc(i.title)} · ${esc(n.groupView?'구간':roleNames[type]||'장면')}${selected?' · 현재 선택':''}"${selected?' aria-current="true"':''}>
      <span class="node-surface">${image?`<span class="node-art"><img src="${esc(image.src)}" alt="${esc(image.alt)}" style="object-position:${image.position||'center'}" decoding="async" draggable="false"></span>`:''}<span class="node-title"><span class="node-meta">${esc(n.groupLabel||sceneMeta(i,roleNames[type]||'장면'))}</span><strong class="node-name">${esc(i.map_label||i.title)}</strong>${(!image||n.groupView)&&P.textSummary(i)?`<span class="node-summary">${esc(P.textSummary(i))}</span>`:''}</span></span>${deferred?'':portsMarkup(n)}</button>`;
    return deferred?`<div class="${classes}" data-elio-card-host="${esc(i.id)}" data-reader-panel${stage} style="${position}">${native}${portsMarkup(n)}</div>`:native;
  }
  function portsMarkup(n) { return ['in','out'].map(side=>{const ports=n.ports?.[side]||[n.h/2];return ports.map(y=>`<span class="node-port ${side} ${side}-port" style="top:${y}px" aria-hidden="true"></span>`).join('');}).join(''); }
  function syncNodeSelection(container) {
    const near=new Set(edges().flatMap(e=>e.from===state.selected?[e.to]:e.to===state.selected?[e.from]:[]));
    for(const host of container.children){
      const id=host.dataset.elioCardHost||host.dataset.node;if(!id)continue;
      const selected=id===state.selected;
      host.classList.toggle('is-selected',selected);host.classList.toggle('selected',selected&&work().kind==='catalog');
      host.classList.toggle('is-near',near.has(id));host.classList.toggle('is-read',readMarks.get(state.work).has(id));
      if(host.dataset.elioCardHost)elioCard?.updateSelection?.(host,selected);
      else{const shown=host.dataset.stage?layout.nodes.find(node=>node.item.id===id)?.item||item(id):item(id);host.setAttribute('aria-label',`${shown.title} · ${host.dataset.stage?'구간':roleLabel(shown)}${selected?' · 현재 선택':''}`);if(selected)host.setAttribute('aria-current','true');else host.removeAttribute('aria-current');}
      const fallback=host.dataset.readerPanel!==undefined?host.querySelector('[data-reader-fallback]'):null;
      if(fallback){const shown=host.dataset.stage?layout.nodes.find(node=>node.item.id===id)?.item||item(id):item(id);fallback.setAttribute('aria-label',`${shown.title} · ${roleLabel(shown)}${selected?' · 현재 선택':''}`);if(selected)fallback.setAttribute('aria-current','true');else fallback.removeAttribute('aria-current');}
    }
  }
  function timeMapMarkup(map,width,height) {
    if(!map)return '';
    const lanes=map.lanes.map(lane=>`<section class="board-time-lane" style="left:${lane.x}px;top:${lane.y}px;width:${lane.w}px;height:${lane.h}px"><h3>${esc(lane.label)}</h3></section>`).join('');
    const eras=map.eras.map(era=>`<div class="board-time-era" style="left:${era.x}px;top:${era.y}px;width:${era.w}px">${esc(era.label)}</div>`).join('');
    const hub=map.sharedSpace;
    const shared=hub?`<section class="board-shared-space" data-shared-space="true" style="left:${hub.x}px;top:${hub.y}px;width:${hub.w}px;height:${hub.h}px"><h3>${esc(hub.title)}</h3><p>${esc(hub.summary)}</p></section>${hub.origins.map(origin=>{const target=rows().find(row=>row.id===origin.event_id),image=target?art(target):null;return `<button class="board-space-origin${image?' has-origin-image':''}" data-next="${esc(origin.event_id)}" style="left:${origin.x}px;top:${origin.y}px;width:${origin.w}px;height:${origin.h}px">${image?`<img class="origin-image" src="${esc(image.src)}" alt="" loading="lazy" decoding="async">`:''}<span class="origin-copy"><small>${esc(origin.era_label)} · ${esc(origin.lane_label)}</small><strong>${esc(origin.label)}</strong><span>보이드스페이스에서 보기 ↗</span></span></button>`;}).join('')}`:'';
    return lanes+shared+eras;
  }
  function drawGraph() {
    resetHudPanel();
    const sameWork=graphWork===work()&&layout?.scope===state.scope&&(state.scope!=='stage'||layout.stage===P.groupFor(work(),state.selected)?.id);
    layout=(sameWork&&(graphSelection===state.selected?layout:P.reselect(work(),layout,state.selected)))||P.project(work(),state.selected,state.scope,mediaSizes());
    window.ElioBoardStartup?.mark?.('projection-ready',{nodes:layout.nodes.length,edges:layout.edges.length});
    if(layout.overviewKind)state.selected=layout.nodes.find(node=>node.selected)?.item.id||state.selected;
    if(layout.scope&&layout.scope!==state.scope){state.scope=layout.scope;updateChrome();}
    const key=JSON.stringify([state.work,state.mode,panelEffect(),layout.nodes.map(n=>[n.item.id,n.x,n.y,n.w,n.h,n.boundary,n.ports,n.groupView])]);
    const replaceNodes=key!==graphKey;
    if(replaceNodes){elioCard?.unmountAll();readerPanels.clear();catalogKey='';}
    graphWork=work();graphSelection=state.selected;graphKey=key;
    world.style.width=`${layout.width}px`;world.style.height=`${layout.height}px`;
    const sections=(layout.sections||[]).map(section=>`<section class="reader-flow-section" data-reader-section="${esc(section.id)}" style="left:${section.x}px;top:${section.y}px;width:${section.width}px;height:${section.height}px"><header><h2>${esc(section.title)}</h2><p>${section.event_ids.length}개 ${section.perspective_id?'관점 노드':'장면'}</p></header></section>`).join('');
    $('groups').innerHTML=sections+(layout.timeMaps||[layout.timeMap]).map(map=>timeMapMarkup(map,layout.width,layout.height)).join('')+layout.groups.map(g=>`<section class="stage-group" data-group-kind="${esc(g.kind||'context')}" style="left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px"><h3>${esc(product?.isWork(work())?({'context-before':'앞선 단계','context-current':'현재 단계','context-after':'다음 단계'}[g.id]||g.title.replace('장면','단계').replace('이어지는 갈래','다음 단계')):g.title)}</h3>${g.summary?`<p class="stage-group-summary">${esc(g.summary)}</p>`:''}</section>`).join('');
    if(replaceNodes){$('nodes').innerHTML=layout.nodes.map(nodeMarkup).join('');mountDepthCards($('nodes'));captureLoadedImages($('nodes'));}
    syncNodeSelection($('nodes'));
    const svg=$('connections');svg.setAttribute('width',layout.width);svg.setAttribute('height',layout.height);svg.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);
    svg.innerHTML=`<defs><marker id="edge-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L9 5L0 10" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker>${layout.edges.map((edge,index)=>edge.underpasses?.length?`<mask id="edge-gap-${index}" maskUnits="userSpaceOnUse"><rect width="${layout.width}" height="${layout.height}" fill="white"/>${edge.underpasses.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${p.r||6}" fill="black"/>`).join('')}</mask>`:'').join('')}</defs>`+layout.edges.map((e,index)=>{
      const near=e.from===state.selected||e.to===state.selected, trail=state.trail.some(t=>t[0]===e.from&&t[1]===e.to);
      const pulse=state.trail.at(-1)?.[0]===e.from&&state.trail.at(-1)?.[1]===e.to;
      return `<path class="edge ${e.mapKind?`map-${esc(e.mapKind)}`:''} ${e.edge?.relation==='return'?'is-return':''} ${near?'is-near':''} ${e.from===state.selected?'is-outgoing':''} ${e.to===state.selected?'is-incoming':''} ${trail?'is-trail':''} ${pulse?'is-pulse':''}" data-connection="${index}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" d="${esc(e.path)}"${e.underpasses?.length?` mask="url(#edge-gap-${index})"`:''} marker-end="url(#edge-arrow)"><title>${esc(e.label||condition(e.edge))}</title></path>`;
    }).join('');
    highlightKey=null;
    const oldChoices=world.querySelector('.edge-choices');oldChoices?.remove();
    const choices=document.createElement('div');choices.className='edge-choices';
    choices.innerHTML=layout.edges.filter(e=>P.isVisibleLabel(work(),e,state.selected)).map(e=>`<button class="edge-choice" data-next="${esc(e.to)}" data-connection="${layout.edges.indexOf(e)}" style="left:${e.x}px;top:${e.y}px;width:${Math.min(170,e.labelWidth||160)}px" aria-label="${esc(condition(e.edge))} → ${esc(item(e.to).title)}">${esc(condition(e.edge))}</button>`).join('');world.append(choices);
    $('scope-label').textContent=state.scope==='chapter'?'전체 구조':state.scope==='stage'?'구간과 인접 연결':'현재 장면과 직접 연결';
    const group=P.groupFor(work(),state.selected);
    const boundaryCount=layout.nodes.filter(n=>n.boundary).length;
    $('board-context').textContent=`${state.scope==='chapter'?work().title:(group?.title||work().title)} · ${layout.nodes.length}${product?.isWork(work())?'단계':'장면'}${boundaryCount?`(인접 ${boundaryCount})`:''} · ${layout.edges.length}연결`;
    if(reader)updateReaderChrome();
    camera.style.width=`${layout.width}px`;camera.style.height=`${layout.height}px`;
    cachePaintTargets(choices);
    updatePaintVisibility(viewport.clientWidth,viewport.clientHeight);
    renderMini();
    window.ElioBoardStartup?.mark?.('cards-ready',{nodes:layout.nodes.length,depthCards:reader?readerPanels.size:$('nodes').querySelectorAll('[data-elio-card-host]').length});
  }
  function renderMini() {
    if(!layout)return;
    $('minimap').innerHTML=`<button id="mini-fit" aria-label="장 전체 구조 보기"><svg viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true">${layout.edges.map(e=>`<path d="${esc(e.path)}" fill="none" stroke="currentColor" stroke-width="5" opacity=".4"/>`).join('')}${layout.nodes.map(n=>`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="${n.item.id===state.selected?'#2371dd':'currentColor'}" opacity="${n.item.id===state.selected?1:.35}"/>`).join('')}<rect id="mini-window" fill="none" stroke="#2371dd" stroke-width="9"/></svg><span>구조 보기</span></button>`;
    updateMini();
  }
  function updateMini(width=viewport.clientWidth,height=viewport.clientHeight){const r=$('mini-window');if(!r||!layout)return;const c=state.camera;for(const [name,value] of Object.entries({x:-c.x/c.scale,y:-c.y/c.scale,width:width/c.scale,height:height/c.scale})){const text=String(value);if(r.getAttribute(name)!==text)r.setAttribute(name,text);}}
  function sourceMarkup(i) {
    if(i.source)return `<details class="source-details"><summary>자료와 범위</summary><p>${esc(i.source)}</p></details>`;
    const sources=(work().sources||[]).filter(s=>!i.source_ids?.length||i.source_ids.includes(s.id));
    return `<details class="source-details"><summary>근거와 수록 범위</summary>${sources.map(s=>{let href='';try{href=C.safeHref(s.url);}catch{}return `<p>${href?`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(s.title||s.id)}</a>`:esc(s.title||s.id)}${s.note?`<small>${esc(s.note)}</small>`:''}</p>`;}).join('')}<p>${esc(work().coverage?.note||work().material||'')}</p></details>`;
  }
  function branchMarkup(i) {
    const group=reader&&!layout?.overviewKind?P.groupFor(work(),i.id):null;
    const readingSequence=group&&!group.time_map&&!edges().some(edge=>group.event_ids.includes(edge.from)&&group.event_ids.includes(edge.to));
    const next=readingSequence?layout.edges.filter(edge=>edge.from===i.id).map(edge=>edge.edge||edge):outgoing(i.id);
    if(!next.length)return `<p class="terminal-note">${readingSequence?'이 읽기 구간은 여기까지입니다.':product?.isWork(work())?'수록된 다음 단계가 없습니다.':'수록된 연결에서 이 갈래는 여기까지입니다.'}</p>`;
    const groups=[{label:readingSequence?'이어서 읽기':'이어지는 연결',links:next.filter(e=>e.relation!=='return')},{label:'되돌아가는 연결',links:next.filter(e=>e.relation==='return')}];
    return groups.filter(group=>group.links.length).map(group=>`<div class="preview-branches"><span>${group.label}</span>${group.links.map(e=>`<button data-next="${esc(e.to)}">${e.relation==='influence'||e.relation==='transfer'?`<small class="branch-relation">${e.relation==='influence'?'영향':'전달'}</small>`:''}<strong>${esc(item(e.to).title)}</strong>${condition(e)?`<small>${esc(condition(e))}</small>`:''}<span aria-hidden="true">${e.relation==='return'?'↶':'→'}</span></button>`).join('')}</div>`).join('');
  }
  function renderPreview() {
    const i=item(), image=art(i), node=(work().nodes||[]).find(n=>n.event_id===i.id);
    $('preview').classList.toggle('is-open',state.preview);
    $('preview').setAttribute('aria-hidden',String(!state.preview));$('preview').inert=!state.preview;
    const selectionLabel=work().kind==='catalog'?'선택한 항목':product?.isWork(work())?'선택한 단계':'선택한 장면';
    $('preview').setAttribute('aria-label',`${selectionLabel} 미리보기`);
    $('preview').innerHTML=`<button class="preview-close" data-action="close-preview" aria-label="미리보기 닫기" title="미리보기 닫기">${closeIcon}</button>${image?`<div class="preview-art"><img src="${esc(image.src)}" alt="${esc(image.alt)}" style="object-position:${image.position||'center'}"></div>`:''}<div class="preview-body"><div class="preview-meta"><span class="selection-caption">${selectionLabel}</span>${C.badge(roleLabel(i),{kind:'current'})}<span>${i.map_context?esc(i.map_context):number(i)}${node?.time?.label?` · ${esc(node.time.label)}`:''}</span></div><h2>${esc(i.title)}</h2><p>${C.inlineLinks(i.summary||i.body||'')}</p><div class="detail-actions"><button class="primary" data-action="read">${work().kind==='catalog'?'항목 자세히 읽기':product?.isWork(work())?'단계 상세':'장면 읽기'} <span aria-hidden="true">→</span></button></div>${product?.isWork(work())?product.preview(i,work(),state.mode):''}${work().kind==='story'?branchMarkup(i):''}</div>`;
    updateCatalogNotice();
    if(state.preview&&reading.hidden&&product?.isWork(work()))product.select(i,work());
    else product?.suspend(reading.hidden?'closed':'reading');
    syncPreviewDock();
  }
  function previewPanel(){const panel=$('product-screen');return panel&&!panel.hidden?panel:$('preview');}
  function syncPreviewDock(){
    const shell=document.querySelector('.stage-shell'),preview=previewPanel();
    const dock=state.preview?(getComputedStyle(preview).getPropertyValue('--board-inspector-dock').trim()||'side'):'none';
    shell.dataset.previewDock=dock;
    shell.style.setProperty('--board-preview-height',`${state.preview?preview.getBoundingClientRect().height:0}px`);
    shell.style.setProperty('--board-preview-width',`${state.preview?preview.getBoundingClientRect().width:0}px`);
  }
  function catalogMatches(i){return (state.category==='전체'||i.category===state.category)&&[i.title,i.body,i.detail,i.category].join(' ').toLocaleLowerCase().includes(state.query.trim().toLocaleLowerCase());}
  function updateCatalogNotice(){const old=$('preview').querySelector('.selection-notice');old?.remove();if(work().kind==='catalog'&&!catalogMatches(item())){const p=document.createElement('p');p.className='selection-notice';p.textContent='검색 결과 밖의 선택 항목을 보고 있습니다.';$('preview').querySelector('.preview-body')?.prepend(p);}}
  function renderCatalog() {
    resetHudPanel();
    const found=rows().filter(catalogMatches);
    const key=JSON.stringify([state.work,state.mode,panelEffect(),found.map(i=>i.id)]),replaceNodes=key!==catalogKey;
    if(replaceNodes){elioCard?.unmountAll();readerPanels.clear();graphKey='';catalogKey=key;}
    const categories=['전체',...new Set(rows().map(i=>i.category).filter(Boolean))];
    $('category-tabs').innerHTML=categories.map(c=>`<button data-category="${esc(c)}" aria-pressed="${c===state.category}"${c===state.category?' class="active"':''}>${esc(c)}</button>`).join('');
    $('catalog-search').value=state.query;
    if(replaceNodes){$('catalog-grid').innerHTML=found.length?found.map(i=>{const image=art(i);if(usesPanels())return `<div class="catalog-item ${i.id===state.selected?'selected':''} ${image?'has-image':'text-only'}" data-elio-card-host="${esc(i.id)}"></div>`;return `<button class="catalog-item ${i.id===state.selected?'selected':''} ${image?'has-image':'text-only'}" data-hud-panel data-node="${esc(i.id)}"${i.id===state.selected?' aria-current="true"':''}><span class="node-surface">${image?`<span class="item-art"><img src="${esc(image.src)}" alt="${esc(image.alt||i.title)}"></span>`:''}<span class="item-body"><span class="item-meta">${number(i)} · ${esc(i.category||'항목')}</span><strong>${esc(i.title)}</strong><span>${esc(i.body||'')}</span></span></span></button>`;}).join(''):'<div class="empty"><h2>찾는 항목이 없습니다.</h2><p>다른 이름이나 분류로 찾아보세요.</p><button data-action="reset-search">검색과 분류 초기화</button></div>';mountDepthCards($('catalog-grid'));}
    syncNodeSelection($('catalog-grid'));
    for(const host of $('catalog-grid').querySelectorAll('[data-node],[data-elio-card-host]')) {
      const i=item(host.dataset.elioCardHost||host.dataset.node),image=art(i),ratio=imageRatios.get(image?.src)||(image?.width&&image?.height?image.width/image.height:16/9);
      host.style.setProperty('--node-media-height',`${clamp((host.clientWidth-18)/ratio,90,320)}px`);
    }
    captureLoadedImages($('catalog-grid'));
    $('catalog-count').textContent=`${found.length}개 항목 · 전체 ${rows().length}개`;
    updateCatalogNotice();
  }
  function render() {
    updateChrome();applyMotion();
    if(work().kind==='catalog')renderCatalog();else drawGraph();
    renderPreview();
    window.ElioBoardAuthoring?.refresh();
  }
  function mountDepthCards(container) {
    if(!usesPanels()||reader&&work().kind==='story')return;
    container.querySelectorAll('[data-elio-card-host]').forEach(mountPanel);
  }
  function mountPanel(host) {
    const node=work().kind==='story'?layout?.nodes.find(row=>row.item.id===host.dataset.elioCardHost):null,i=node?.item||item(host.dataset.elioCardHost);
    elioCard.mount(host,{id:i.id,title:i.map_label||i.title,meta:node?.groupLabel||sceneMeta(i),image:art(i),description:work().kind==='catalog'?(i.body||''):P.textSummary(i),selected:i.id===state.selected,motionEnabled:!motionReduced(),kind:work().kind==='catalog'?'item':'scene'});
  }
  function queueReaderPanels() {
    if(!reader||!layout||work().kind!=='story'||readerPanelRAF)return;
    readerPanelRAF=requestAnimationFrame(()=>{readerPanelRAF=0;syncReaderPanels();});
  }
  function syncReaderPanels() {
    if(!reader||!layout||work().kind!=='story')return;
    if(viewport.classList.contains('is-dragging')||viewport.classList.contains('is-navigating'))return;
    const detail=state.camera.scale>=.58&&!motionReduced()&&usesPanels();
    for(const target of paintTargets){
      const fallback=target.fallback;if(!fallback)continue;
      const host=target.element,mounted=readerPanels.has(host),visible=detail&&!target.hidden;
      if(visible&&!mounted){
        const focused=fallback===document.activeElement;
        mountPanel(host);readerPanels.add(host);fallback.hidden=true;fallback.removeAttribute('data-node');
        if(focused)host.querySelector('.elio-card-button')?.focus({preventScroll:true});
      }else if(!visible&&mounted){
        const focused=host.contains(document.activeElement);
        elioCard.unmount(host);readerPanels.delete(host);fallback.hidden=false;fallback.dataset.node=target.nodeId;
        if(focused)fallback.focus({preventScroll:true});
      }
    }
  }
  function cachePaintTargets(choices) {
    paintTargets=[];
    if(!reader||!layout)return;
    const nodes=new Map(layout.nodes.map(node=>[node.item.id,node]));
    for(const element of $('nodes').children){
      const id=element.dataset.elioCardHost||element.dataset.node,node=nodes.get(id);
      if(node)paintTargets.push({element,nodeId:id,left:node.x,top:node.y,right:node.x+node.w,bottom:node.y+node.h,hidden:element.classList.contains('is-offscreen'),fallback:element.dataset.readerPanel!==undefined?element.querySelector('[data-reader-fallback]'):null});
    }
    const bounds=layout.edges.map(edge=>({left:Math.min(...edge.points.map(point=>point[0]))-8,
      top:Math.min(...edge.points.map(point=>point[1]))-8,right:Math.max(...edge.points.map(point=>point[0]))+8,
      bottom:Math.max(...edge.points.map(point=>point[1]))+8}));
    for(const element of [...$('connections').querySelectorAll('[data-connection]'),...(choices?.children||[])]){
      const index=Number(element.dataset.connection);
      if(bounds[index])paintTargets.push({element,edgeIndex:String(index),...bounds[index],hidden:element.classList.contains('is-offscreen')});
    }
  }
  function updatePaintVisibility(width,height) {
    if(!reader||!paintTargets.length)return;
    const c=state.camera,overscan=128/c.scale;
    const left=-c.x/c.scale-overscan,top=-c.y/c.scale-overscan;
    const right=(width-c.x)/c.scale+overscan,bottom=(height-c.y)/c.scale+overscan;
    const focused=document.activeElement?.closest('[data-node],[data-elio-card-host],[data-connection]');
    const focusedNode=focused?.dataset.elioCardHost||focused?.dataset.node,focusedEdge=focused?.dataset.connection;
    for(const target of paintTargets){
      const keep=target.nodeId&&(target.nodeId===state.selected||target.nodeId===focusedNode)
        ||target.edgeIndex!==undefined&&target.edgeIndex===focusedEdge;
      const hidden=!keep&&(target.right<left||target.left>right||target.bottom<top||target.top>bottom);
      if(hidden!==target.hidden){target.element.classList.toggle('is-offscreen',hidden);target.hidden=hidden;}
    }
    queueReaderPanels();
  }
  function stopMotion(){cancelAnimationFrame(motionRAF);motionRAF=0;cancelAnimationFrame(cameraRAF);cameraRAF=0;viewport.classList.remove('is-navigating');}
  function applyCamera(){const c=state.camera,width=viewport.clientWidth,height=viewport.clientHeight;camera.style.transform=reader?`translate(${c.x}px,${c.y}px) scale(${c.scale})`:`translate3d(${c.x}px,${c.y}px,0) scale(${c.scale})`;const labelScale=(clamp(1/c.scale,1,20)).toFixed(3);if(lastLabelScale!==labelScale){world.style.setProperty('--reader-label-scale',labelScale);lastLabelScale=labelScale;}const zoomText=`${Math.round(c.scale*100)}%`;if(lastZoom!==zoomText){$('zoom-value').textContent=zoomText;lastZoom=zoomText;}viewport.classList.toggle('zoom-overview',c.scale<.58);updatePaintVisibility(width,height);updateMini(width,height);}
  function queueCamera(){if(!cameraRAF)cameraRAF=requestAnimationFrame(()=>{cameraRAF=0;applyCamera();});}
  function moveCamera(target,animate=true) {
    stopMotion();
    if(!animate||motionReduced()){state.camera=target;applyCamera();return;}
    if(reader)viewport.classList.add('is-navigating');
    const start={...state.camera},time=performance.now();
    function step(now){const t=clamp((now-time)/360,0,1),ease=1-Math.pow(1-t,3);state.camera={x:start.x+(target.x-start.x)*ease,y:start.y+(target.y-start.y)*ease,scale:start.scale+(target.scale-start.scale)*ease};applyCamera();if(t<1)motionRAF=requestAnimationFrame(step);else{motionRAF=0;viewport.classList.remove('is-navigating');}}
    motionRAF=requestAnimationFrame(step);
  }
  function safeRect() {
    const rect=viewport.getBoundingClientRect(),toolbar=$('map-toolbar').getBoundingClientRect();
    let right=28,bottom=90,left=28,top=toolbar.bottom-rect.top+(product?.isWork(work())&&innerWidth<760?24:36);
    if(state.preview){const preview=previewPanel(),panel=preview.getBoundingClientRect(),dock=getComputedStyle(preview).getPropertyValue('--board-inspector-dock').trim();if(dock==='bottom')bottom=Math.max(bottom,rect.bottom-panel.top+18);else right=rect.right-panel.left+28;}
    return {x:left,y:top,w:Math.max(1,viewport.clientWidth-left-right),h:Math.max(1,viewport.clientHeight-top-bottom)};
  }
  function fit(animate=true) {
    if(readingContext||!reading.hidden||work().kind==='catalog'||!layout)return;
    const safe=safeRect(),ns=layout.nodes;
    if(innerWidth<700&&state.scope==='focus'){const n=ns.find(n=>n.item.id===state.selected);const scale=clamp(Math.min(1,(safe.w-24)/n.w,(safe.h-24)/n.h),minScale,1);moveCamera({scale,x:safe.x+safe.w/2-(n.x+n.w/2)*scale,y:safe.y+safe.h/2-(n.y+n.h/2)*scale},animate);return;}
    const boxes=layout.allFlows?[...ns,...layout.sections.map(section=>({x:section.x,y:section.y,w:section.width,h:section.height}))]:layout.timeMap?[...ns,{x:0,y:40,w:layout.width,h:layout.height-40}]:ns;
    const minX=Math.min(...boxes.map(n=>n.x))-25,minY=Math.min(...boxes.map(n=>n.y))-30,maxX=Math.max(...boxes.map(n=>n.x+n.w))+25,maxY=Math.max(...boxes.map(n=>n.y+n.h))+14;
    const scale=clamp(Math.min(safe.w/(maxX-minX),safe.h/(maxY-minY)),minScale,1.2);
    if(state.scope==='focus'&&scale<.8){centerCurrent(animate);return;}
    moveCamera({scale,x:safe.x+(safe.w-(maxX-minX)*scale)/2-minX*scale,y:safe.y+(safe.h-(maxY-minY)*scale)/2-minY*scale},animate);
  }
  function centerCurrent(animate=true) {
    if(work().kind==='catalog'||!layout)return;
    const n=layout.nodes.find(n=>n.item.id===state.selected);if(!n)return;
    const s=safeRect(),scale=clamp(Math.min(Math.max(.95,state.camera.scale),(s.w-32)/n.w,(s.h-32)/n.h),minScale,1.8);
    moveCamera({scale,x:s.x+s.w/2-(n.x+n.w/2)*scale,y:s.y+s.h/2-(n.y+n.h/2)*scale},animate);
  }
  function focusReaderView(viewId,animate=true) {
    const view=(work().views||[]).find(row=>row.id===viewId);
    const section=layout?.sections?.find(row=>row.id===viewId||row.view_ids?.includes(viewId)||row.id===view?.parent_view_id);
    if(!section){centerCurrent(animate);return;}
    const safe=safeRect(),scale=clamp(Math.min(safe.w/(section.width+48),safe.h/(section.height+40)),minScale,1.2);
    if(scale<.28){centerCurrent(animate);return;}
    moveCamera({scale,x:safe.x+safe.w/2-(section.x+section.width/2)*scale,y:safe.y+safe.h/2-(section.y+section.height/2)*scale},animate);
  }
  function keepSelectionVisible(animate=true,includeContext=true) {
    if(!layout)return;
    const n=layout.nodes.find(n=>n.item.id===state.selected),safe=safeRect(),c=state.camera;
    if(!n)return;
    if(n.w*c.scale>safe.w-24||n.h*c.scale>safe.h-24){const scale=clamp(Math.min(c.scale,(safe.w-24)/n.w,(safe.h-24)/n.h),minScale,1.8);moveCamera({scale,x:safe.x+safe.w/2-(n.x+n.w/2)*scale,y:safe.y+safe.h/2-(n.y+n.h/2)*scale},animate);return;}
    let x=c.x,y=c.y;
    if(includeContext&&state.scope==='focus'){
      const left=Math.min(...layout.nodes.map(n=>n.x))*c.scale+c.x,right=Math.max(...layout.nodes.map(n=>n.x+n.w))*c.scale+c.x,top=Math.min(...layout.nodes.map(n=>n.y))*c.scale+c.y,bottom=Math.max(...layout.nodes.map(n=>n.y+n.h))*c.scale+c.y;
      if(right-left<safe.w-24&&bottom-top<safe.h-24){if(left<safe.x+12)x+=safe.x+12-left;else if(right>safe.x+safe.w-12)x-=right-(safe.x+safe.w-12);if(top<safe.y+12)y+=safe.y+12-top;else if(bottom>safe.y+safe.h-12)y-=bottom-(safe.y+safe.h-12);moveCamera({scale:c.scale,x,y},animate);return;}
      const contextScale=Math.min((safe.w-24)/((right-left)/c.scale+50),(safe.h-24)/((bottom-top)/c.scale+44));
      if(contextScale>=.58&&contextScale<c.scale){fit(animate);return;}
    }
    const left=c.x+n.x*c.scale,right=left+n.w*c.scale,top=c.y+n.y*c.scale,bottom=top+n.h*c.scale;
    if(n.w*c.scale>safe.w-24)x=safe.x+safe.w/2-(n.x+n.w/2)*c.scale;
    else if(left<safe.x+12)x+=safe.x+12-left;else if(right>safe.x+safe.w-12)x-=right-(safe.x+safe.w-12);
    if(n.h*c.scale>safe.h-24)y=safe.y+safe.h/2-(n.y+n.h/2)*c.scale;
    else if(top<safe.y+12)y+=safe.y+12-top;else if(bottom>safe.y+safe.h-12)y-=bottom-(safe.y+safe.h-12);
    moveCamera({scale:c.scale,x,y},animate);
  }
  function zoom(delta,anchor) {
    if(work().kind==='catalog')return;
    stopMotion();const c=state.camera,scale=clamp(c.scale*delta,minScale,1.8),r=viewport.getBoundingClientRect(),safe=safeRect(),x=anchor?anchor.x-r.left:safe.x+safe.w/2,y=anchor?anchor.y-r.top:safe.y+safe.h/2;
    moveCamera({scale,x:x-(x-c.x)*scale/c.scale,y:y-(y-c.y)*scale/c.scale},false);
  }
  function select(id,{trail=false,scope=state.scope,remember=true,preview=true}={}) {
    if(!rows().some(i=>i.id===id))return;
    if(state.mode==='hud'&&id===state.selected&&scope===state.scope&&state.preview&&preview&&!trail&&(scope!=='stage'||layout?.stage===P.groupFor(work(),id)?.id)){document.querySelector(`[data-node="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return;}
    const oldScope=state.scope,oldStage=layout?.stage;
    if(remember&&(id!==state.selected||scope!==state.scope)){const visits=selectionHistory.get(state.work);visits.push({id:state.selected,scope:state.scope,preview:state.preview,camera:{...state.camera},width:viewport.clientWidth,height:viewport.clientHeight});if(visits.length>40)visits.shift();}
    if(trail&&edges().some(e=>e.from===state.selected&&e.to===id))state.trail.push([state.selected,id]);
    if(continuousReader(work())){
      scope='chapter';
      const views=(work().views||[]).filter(view=>!view.parent_view_id);
      const active=views.find(view=>view.id===work().display_view&&view.event_ids.includes(id))||views.find(view=>view.event_ids.includes(id));
      if(active)work().display_view=active.id;
    }else if(reader&&scope==='focus')scope='stage';
    stopMotion();state.selected=id;state.scope=scope;state.preview=preview;
    if(work().kind==='catalog')renderCatalog();else drawGraph();
    updateChrome();renderPreview();if(work().kind==='story'&&!readingContext&&reading.hidden){if(state.scope===oldScope&&(state.scope!=='stage'||layout?.stage===oldStage)){if(state.camera.scale<.8)centerCurrent(true);else keepSelectionVisible(true);}else fit(true);}route(true);
    requestAnimationFrame(focusSelection);
    announce(`${item().title}, 선택했습니다.`);
  }
  function performTransition(update,focus) {
    viewTransition?.skipTransition();const epoch=++transitionId;
    const ready=()=>{if(epoch===transitionId)focus?.();};
    if(!document.startViewTransition||motionReduced()){update();ready();return;}
    viewTransition=document.startViewTransition(()=>{if(epoch===transitionId){update();ready();}});
    viewTransition.finished.catch(()=>{}).finally(()=>{if(epoch===transitionId){document.querySelectorAll('[data-transition-media]').forEach(el=>el.style.viewTransitionName='none');viewTransition=null;}});
  }
  function originalReaderMarkup(i) {
    const url=i.reader_url||work().reader_url;
    if(!url)return '';
    try{return `<p class="original-reader-link"><a class="reader-origin-action" href="${esc(C.safeHref(url))}"><svg class="ui-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5v12M10 5C7 3 4 3 2 4v11c3-1 5 0 8 2 3-2 5-3 8-2V4c-2-1-5-1-8 1Z"/></svg><span>Elio에서 이 장면 읽기<small>원문과 관련 해설로 이어집니다</small></span><span aria-hidden="true">↗</span></a></p>`;}catch{return '';}
  }
  function readerReplayTarget(i) {
    if(!continuousReader(work())||!i.reader_url)return null;
    try{
      const url=new URL(C.safeHref(i.reader_url),location.href),anchor=decodeURIComponent(url.hash.slice(1));
      if(url.origin!==location.origin||!/^https?:$/.test(url.protocol)||!anchor)return null;
      url.hash='';url.searchParams.delete('story');
      return {url:url.href,anchor};
    }catch{return null;}
  }
  function replayHref(value,base) {
    if(!value)return '';
    try{const url=new URL(value,base);return /^https?:$/.test(url.protocol)&&!url.username&&!url.password?C.safeHref(url.href):'';}catch{return '';}
  }
  function readerReplayControlMarkup(node,base) {
    // Reuse the approved reader's actual grouped controls, with an inert scalar-only projection.
    if(node.nodeType===3)return esc(node.textContent);
    if(node.nodeType!==1||!['DIV','DETAILS','SUMMARY','A','SPAN','IMG','STRONG','SMALL'].includes(node.tagName))return '';
    const tag=node.tagName.toLowerCase(),attrs=[];
    const classes=[...node.classList].filter(name=>/^(?:event-actions?(?:--[a-z-]+)?|event-avatar(?:--fallback)?|event-provider|streamer-picker(?:__[a-z-]+)?|sr-only)$/.test(name));
    if(classes.length)attrs.push(`class="${esc(classes.join(' '))}"`);
    for(const name of ['aria-label','aria-hidden','title','data-streamer','data-provider','data-time']){
      const value=node.getAttribute(name);if(value!==null)attrs.push(`${name}="${esc(value)}"`);
    }
    if(tag==='a'||tag==='img'){
      const key=tag==='a'?'href':'src',url=replayHref(node.getAttribute(key),base);
      if(!url)return '';
      attrs.push(`${key}="${esc(url)}"`);
      if(tag==='a')attrs.push('target="_blank" rel="noopener noreferrer"');
      else return `<img ${attrs.join(' ')} alt="" loading="lazy" decoding="async" referrerpolicy="origin">`;
    }
    return `<${tag} ${attrs.join(' ')}>${[...node.childNodes].map(child=>readerReplayControlMarkup(child,base)).join('')}</${tag}>`;
  }
  function closeReaderReplayPickers(except=null) {
    for(const picker of reading.querySelectorAll('[data-reader-replays] .streamer-picker[open]')){
      if(picker!==except)picker.removeAttribute('open');
    }
  }
  function positionReaderReplayPicker(picker) {
    const panel=picker.open&&picker.querySelector('.streamer-picker__panel');
    if(!panel)return;
    panel.style.left='0';panel.style.right='auto';
    const bounds=reading.querySelector('.reading-scene-layout').getBoundingClientRect(),rect=panel.getBoundingClientRect();
    const left=Math.max(bounds.left+12,Math.min(rect.left,bounds.right-rect.width-12));
    panel.style.left=`${left-picker.getBoundingClientRect().left}px`;
    panel.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  }
  function readerReplayDocument(url) {
    if(readerReplayDocuments.has(url))return readerReplayDocuments.get(url);
    const pending=(async()=>{
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
      try{
        const response=await fetch(url,{signal:controller.signal,credentials:'omit',redirect:'follow'});
        if(!response.ok||new URL(response.url).origin!==new URL(url).origin||!response.headers.get('content-type')?.toLowerCase().includes('text/html'))throw new Error('reader_replays_unavailable');
        const template=document.createElement('template'),scenes=new Map();
        template.innerHTML=await response.text();
        for(const controls of template.content.querySelectorAll('.event-actions--streamers')){
          const scene=controls.closest('[id]');
          if(!scene||![...controls.querySelectorAll('a.event-action--vod[data-streamer]')].some(link=>replayHref(link.getAttribute('href'),response.url)))continue;
          const markup=readerReplayControlMarkup(controls,response.url);
          scenes.set(scene.id,(scenes.get(scene.id)||'')+markup);
        }
        return scenes;
      }finally{clearTimeout(timeout);}
    })();
    readerReplayDocuments.set(url,pending);
    pending.catch(()=>{if(readerReplayDocuments.get(url)===pending)readerReplayDocuments.delete(url);});
    return pending;
  }
  async function hydrateReaderReplays(i=item()) {
    const host=reading.querySelector('[data-reader-replays]'),target=readerReplayTarget(i);
    if(!host||!target)return;
    host.innerHTML='<p class="reading-replay-status" role="status">같이보기 연결을 불러오는 중…</p>';
    try{
      const scenes=await readerReplayDocument(target.url);
      if(!host.isConnected)return;
      const controls=scenes.get(target.anchor)||'';
      host.hidden=!controls;
      host.innerHTML=controls?`<h2>이 장면 같이보기</h2>${controls}`:'';
    }catch{
      if(host.isConnected)host.innerHTML='<p class="reading-replay-status" role="status">같이보기 연결을 불러오지 못했어요.</p><button class="reading-replay-retry" data-action="reload-replays">다시 불러오기</button>';
    }
  }
  function renderReading() {
    reading.classList.toggle('scene-dialog',continuousReader(work()));
    reading.innerHTML=readingMarkup();
    void hydrateReaderReplays();
  }
  function imageCaptionMarkup(i,figure=false) {
    const supplied=typeof i.image_caption==='string'?i.image_caption.trim():'';
    const caption=supplied||(!work().authored&&work().id==='glass-city-fiction'?'시안을 위해 만든 창작 일러스트':'제공된 이미지');
    let credit='';
    if(i.image_source_url){try{credit=` · <a href="${esc(C.safeHref(i.image_source_url))}" target="_blank" rel="noopener noreferrer">이미지 출처</a>`;}catch{}}
    return figure?`<figcaption class="image-caption">${esc(caption)}${credit}</figcaption>`:`<p>${esc(caption)}${credit}</p>`;
  }
  function readingMarkup() {
    const i=item(),image=art(i),node=(work().nodes||[]).find(n=>n.event_id===i.id);
    const notes=(Array.isArray(i.observations)?i.observations:[]).map(n=>typeof n==='string'?n:n.text||n.note||n.summary).filter(Boolean);
    const sceneReader=continuousReader(work());
    const close=`<button class="reading-close" data-action="close-reading"><span aria-hidden="true">←</span> ${work().kind==='catalog'?'목록으로 돌아가기':'지도로 돌아가기'}</button>`;
    const header=sceneReader?`<header class="reading-scene-header"><span>${esc(work().title)} · ${esc(sceneMeta(i))}</span>${close}</header><div class="reading-scene-layout">`:close;
    return `<article class="${sceneReader?'reading-scene':''}">${header}${image?(sceneReader?`<figure class="reading-hero" data-hud-panel><div class="reading-image-frame"><img data-transition-media src="${esc(image.src)}" alt="${esc(image.alt)}"></div>${imageCaptionMarkup(i,true)}</figure>`:`<div class="reading-hero" data-hud-panel><img data-transition-media src="${esc(image.src)}" alt="${esc(image.alt)}">${imageCaptionMarkup(i)}</div>`):''}<div class="reading-content" data-hud-panel>${sceneReader?'':`<p class="reading-meta">${esc(work().title)} · ${esc(sceneMeta(i))}</p>`}<h1 id="reading-title" tabindex="-1">${esc(i.title)}</h1><p class="reading-lead">${C.inlineLinks(i.summary||i.body||'')}</p>${i.detail?`<p>${esc(i.detail)}</p>`:''}${node?.condition?`<section><h2>이 장면의 조건</h2><p>${esc(node.condition)}</p></section>`:''}${node?.time?.label?`<p class="clock-note">작품 속 시각: ${esc(node.time.label)}</p>`:''}${notes.length?`<section><h2>선택과 관찰</h2><ul>${notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></section>`:''}${originalReaderMarkup(i)}${readerReplayTarget(i)?'<section class="reading-replays" data-reader-replays aria-label="이 장면 같이보기"></section>':''}${work().kind==='story'?`<section class="reading-next">${branchMarkup(i)}</section>`:''}${product?.isWork(work())?product.details(i,work(),state.mode):''}${sourceMarkup(i)}${sceneReader?'':`<p class="material-note">${esc(work().material||'')} · ${product?.isWork(work())?'예시 확인과 실제 설치·외부 서비스 동작 검증을 구분합니다.':'읽기와 게임 진행 상태는 구분합니다.'}</p>`}</div>${sceneReader?'</div>':''}</article>`;
  }
  function openReading() {
    if(readingContext||!reading.hidden)return;
    cancelAnimationFrame(resizeRAF);resizeRAF=0;
    stopMotion();
    if(work().kind!=='catalog')applyCamera();
    readingContext={work:state.work,selected:state.selected,scope:state.scope,mode:state.mode,camera:{...state.camera},width:viewport.clientWidth,height:viewport.clientHeight};
    readMarks.get(state.work).add(state.selected);
    product?.suspend('reading');window.ElioDepthHover?.reset();
    const before=$('preview').querySelector('.preview-art img')||document.querySelector('.scene-node.is-selected img');
    if(before)before.style.viewTransitionName='scene-media';
    performTransition(()=>{if(before)before.style.viewTransitionName='none';renderReading();reading.hidden=false;reading.querySelector('[data-transition-media]')?.style.setProperty('view-transition-name','scene-media');$('app').inert=true;},()=>$('reading-title')?.focus({preventScroll:true}));
    updateChrome();
  }
  function closeReading() {
    if(!readingContext&&reading.hidden)return;
    const context=readingContext;
    performTransition(()=>{
      readingContext=null;reading.hidden=true;$('app').inert=false;
      if(work().kind==='story')drawGraph();
      renderPreview();
      if(work().kind!=='catalog'){
        const unchanged=context&&context.work===state.work&&context.selected===state.selected&&context.scope===state.scope&&context.mode===state.mode&&context.width===viewport.clientWidth&&context.height===viewport.clientHeight;
        if(unchanged){stopMotion();state.camera={...context.camera};applyCamera();}
        else keepSelectionVisible(false,false);
      }
      refreshMedia();
      const image=$('preview').querySelector('.preview-art img');if(image){image.dataset.transitionMedia='';image.style.viewTransitionName='scene-media';}
    },focusSelection);
  }
  reading.addEventListener('click',e=>{
    if(!reading.hidden){
      const summary=e.target.closest('[data-reader-replays] .streamer-picker > summary');
      if(summary){
        closeReaderReplayPickers(summary.parentElement);
        requestAnimationFrame(()=>positionReaderReplayPicker(summary.parentElement));
        return;
      }
      if(!e.target.closest('[data-reader-replays] .streamer-picker'))closeReaderReplayPickers();
      e.target.closest('[data-reader-replays] a')?.closest('.streamer-picker')?.removeAttribute('open');
    }
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||reader&&b.id!=='motion-button'&&b.closest('[data-authoring-control]'))return;
    if(b.id==='hud-effects-open'){$('hud-effects-dialog').showModal();$('hud-effects-dialog').querySelector(`[data-hud-effect="${state.hudEffect}"]`).focus();return;}
    if(b.id==='hud-effects-close'){$('hud-effects-dialog').close();return;}
    if(b.dataset.hudEffect){state.hudEffect=b.dataset.hudEffect;elioCard?.setEffect?.(state.hudEffect);updateChrome();applyMotion();route(true);$('hud-effects-dialog').close();return;}
    if(b.dataset.mode){chooseMode(b.dataset.mode);return;}
    const stage=b.dataset.stage||b.closest('[data-stage]')?.dataset.stage;
    if(stage){const group=reader?readerView(work(),stage):[...(work().views||[]),...(work().display_groups||[])].find(g=>g.id===stage);if(group){work().display_view=group.id;select(group.focus_id||group.event_ids[0],{scope:continuousReader(work())?'chapter':'stage',preview:!reader});if(continuousReader(work()))focusReaderView(group.id);}return;}
    if(b.dataset.node){select(b.dataset.node);return;}
    if(b.dataset.action==='reload-replays'){void hydrateReaderReplays();return;}
    if(b.dataset.next){const wasReading=!reading.hidden;select(b.dataset.next,{trail:true});if(reader&&b.classList?.contains('board-space-origin'))centerCurrent(true);if(wasReading){readMarks.get(state.work).add(state.selected);updateChrome();renderReading();$('reading-title')?.focus({preventScroll:true});}return;}
    if(b.dataset.category){state.category=b.dataset.category;renderCatalog();return;}
    if(b.dataset.action==='read'){openReading();return;}
    if(b.dataset.action==='close-reading'){closeReading();return;}
    if(b.dataset.action==='close-preview'){state.preview=false;renderPreview();focusSelection();return;}
    if(b.dataset.action==='reset-search'){state.query='';state.category='전체';renderCatalog();$('catalog-search').focus();return;}
    if(b.id==='mini-fit'||b.id==='fit-button'){fit(true);return;}
    if(b.id==='chapter-button'){if(continuousReader(work())||state.scope==='chapter')fit(true);else select(state.selected,{scope:'chapter',preview:reader?false:state.preview});}
    if(b.id==='stage-button'){if(continuousReader(work())){focusReaderView(work().display_view);return;}if(state.scope==='stage')fit(true);else{const view=reader?((work().views||work().display_groups||[]).find(row=>row.id===work().display_view)||readerView(work())):P.groupFor(work(),state.selected);if(view){work().display_view=view.id;select(view.event_ids.includes(state.selected)?state.selected:view.focus_id||view.event_ids[0],{scope:'stage',preview:reader?false:state.preview});}}}
    if(!reader&&b.id==='focus-button'){if(state.scope==='focus')fit(true);else select(state.selected,{scope:'focus',preview:state.preview});}
    if(b.id==='home-button'){select(state.selected,{scope:reader?state.scope:'focus',preview:state.preview});centerCurrent();}
    if(b.id==='back-selection-button'){const previous=selectionHistory.get(state.work).pop();if(previous){select(previous.id,{scope:previous.scope,remember:false,preview:previous.preview});stopMotion();if(previous.width===viewport.clientWidth&&previous.height===viewport.clientHeight){state.camera={...previous.camera};applyCamera();}else fit(false);updateChrome();notify('이전 선택과 지도 위치로 돌아왔습니다.');}}
    if(b.id==='zoom-in')zoom(1.18);if(b.id==='zoom-out')zoom(1/1.18);
    if(b.id==='motion-button'){state.reduced=!motionReduced();applyMotion();route();notify(motionReduced()?'움직임을 줄였습니다.':'레이어 움직임을 켰습니다.');}
    if(b.id==='orbit-button'){state.orbit=!state.orbit;applyMotion();notify(state.orbit?'빈 공간을 끌어 입체 각도를 둘러봅니다.':'빈 공간을 끌어 지도를 이동합니다.');}
    if(b.id==='reset-angle'){state.angleX=0;state.angleY=0;world.style.setProperty('--orbit-x','0deg');world.style.setProperty('--orbit-y','0deg');state.orbit=false;applyMotion();}
  });
  $('catalog-search').addEventListener('input',e=>{state.query=e.target.value;renderCatalog();});
  $('reader-view-select').addEventListener('change',e=>{
    const view=(work().views||work().display_groups||[]).find(row=>row.id===e.target.value);
    if(view){work().display_view=view.id;select(view.event_ids.includes(state.selected)?state.selected:view.focus_id||view.event_ids[0],{scope:continuousReader(work())?'chapter':'stage',preview:false});if(continuousReader(work()))focusReaderView(view.id);}
    else if(continuousReader(work())){work().display_view=undefined;state.preview=false;renderPreview();updateChrome();fit(true);route(true);}
    else select(state.selected,{scope:'chapter',preview:false});
  });
  viewport.addEventListener('wheel',e=>{if(work().kind==='catalog')return;e.preventDefault();zoom(Math.exp(-e.deltaY*.0012),{x:e.clientX,y:e.clientY});},{passive:false});
  viewport.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,input,a,select,summary')||work().kind==='catalog'||e.button!==0)return;
    stopMotion();drag={id:e.pointerId,x:e.clientX,y:e.clientY,camera:{...state.camera},angleX:state.angleX,angleY:state.angleY};viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove',e=>{
    if(drag?.id===e.pointerId){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(state.orbit&&state.mode==='depth'&&!motionReduced()){state.angleX=clamp(drag.angleX-dy*.08,-12,18);state.angleY=clamp(drag.angleY+dx*.08,-20,20);world.style.setProperty('--orbit-x',`${state.angleX}deg`);world.style.setProperty('--orbit-y',`${state.angleY}deg`);}else{state.camera={...drag.camera,x:drag.camera.x+dx,y:drag.camera.y+dy};queueCamera();}return;}
    if(usesPanels()||panelEffect()==='flat'||motionReduced()||e.pointerType==='touch')return;
    lastPointer={x:e.clientX,y:e.clientY};const r=viewport.getBoundingClientRect();viewport.style.setProperty('--px',`${((e.clientX-r.left)/r.width-.5)*12}px`);viewport.style.setProperty('--py',`${((e.clientY-r.top)/r.height-.5)*8}px`);
    const node=e.target.closest('.scene-node,.catalog-item');if(node){const b=node.getBoundingClientRect();node.style.setProperty('--tilt-x',`${-(e.clientY-b.top-b.height/2)/b.height*5}deg`);node.style.setProperty('--tilt-y',`${(e.clientX-b.left-b.width/2)/b.width*6}deg`);}
  });
  viewport.addEventListener('pointerout',e=>{if(usesPanels())return;const node=e.target.closest('.scene-node,.catalog-item');if(node&&!node.contains(e.relatedTarget)){node.style.setProperty('--tilt-x','0deg');node.style.setProperty('--tilt-y','0deg');}});
  const endDrag=e=>{if(drag?.id!==e.pointerId)return;cancelAnimationFrame(cameraRAF);cameraRAF=0;applyCamera();drag=null;viewport.classList.remove('is-dragging');};
  viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);viewport.addEventListener('lostpointercapture',endDrag);
  document.addEventListener('keydown',e=>{
    if(e.target.closest('dialog[open]'))return;
    if(!reading.hidden){if(e.key==='Escape'){e.preventDefault();const picker=reading.querySelector('[data-reader-replays] .streamer-picker[open]');if(picker){closeReaderReplayPickers();picker.querySelector('summary')?.focus();}else closeReading();}if(e.key==='Tab'){const focusable=[...reading.querySelectorAll('button,a,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length>0&&!el.disabled);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
    if(e.target.matches('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='Escape'&&state.preview){state.preview=false;renderPreview();focusSelection();return;}
    if(e.target!==viewport)return;
    const shifts={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};if(shifts[e.key]){e.preventDefault();const[dX,dY]=shifts[e.key];moveCamera({...state.camera,x:state.camera.x+dX,y:state.camera.y+dY},false);}
    if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.18);}if(e.key==='-'){e.preventDefault();zoom(1/1.18);}if(e.key==='Home'){e.preventDefault();fit();}
  });
  document.addEventListener('error',e=>{if(e.target.tagName!=='IMG')return;const image=e.target;image.hidden=true;image.parentElement.classList.add('media-unavailable');if(!image.parentElement.querySelector('.media-fallback')){const span=document.createElement('span');span.className='media-fallback';span.textContent='이미지를 불러오지 못함';image.parentElement.append(span);}},true);
  document.addEventListener('load',e=>{if(e.target.tagName!=='IMG')return;const image=e.target;image.hidden=false;image.parentElement.classList.remove('media-unavailable');image.parentElement.querySelector('.media-fallback')?.remove();rememberImage(image);},true);
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeRAF);resizeRAF=0;if(readingContext||!reading.hidden)return;resizeRAF=requestAnimationFrame(()=>{resizeRAF=0;if(readingContext||!reading.hidden)return;syncPreviewDock();fit(false);});});
  prefersReduced.addEventListener('change',applyMotion);
  document.addEventListener('pointermove',moveHudPanel,{passive:true});
  document.addEventListener('pointerout',e=>{if(hudPanel&&!hudPanel.contains(e.relatedTarget))resetHudPanel();},{passive:true});
  document.addEventListener('pointercancel',resetHudPanel,{passive:true});
  document.addEventListener('keydown',resetHudPanel);
  window.addEventListener('blur',resetHudPanel);
  window.addEventListener('resize',resetHudPanel);
  finePointer.addEventListener('change',()=>{resetHudPanel();elioCard?.setEffect?.(usesPanels()?panelEffect():state.hudEffect);elioCard?.setMotionEnabled?.(!motionReduced());});
  function highlightConnections(target) {
    const choice=target?.closest?.('.edge-choice'),node=target?.closest?.('.scene-node'),id=node?.getAttribute('data-elio-card-host')||node?.getAttribute('data-node');
    const key=choice?`edge:${choice.dataset.connection}`:id?`node:${id}`:'';if(key===highlightKey)return;highlightKey=key;
    document.querySelectorAll('.edge[data-connection]').forEach(edge=>edge.classList.toggle('is-hover',choice?edge.dataset.connection===choice.dataset.connection:Boolean(id&&(edge.dataset.from===id||edge.dataset.to===id))));
  }
  document.addEventListener('pointerover',e=>highlightConnections(e.target),{passive:true});
  document.addEventListener('focusin',e=>highlightConnections(e.target));
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget?.closest?.('.scene-node,.edge-choice'))highlightConnections(null);},{passive:true});
  let routeRestoreRAF=0;
  const queueRouteRestore=()=>{cancelAnimationFrame(routeRestoreRAF);routeRestoreRAF=requestAnimationFrame(restoreRoute);};
  window.addEventListener('popstate',queueRouteRestore);
  window.addEventListener('hashchange',queueRouteRestore);
  $('hud-effects-dialog').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();$('hud-effects-dialog').close();}});
  if(!reader)contentPicker?.init({works,getWork:work,chooseWork});
  function installDocument(input, activate) {
    const data=documents.normalizeDocument(input), projected=documents.projectDocument(data,window.ELIO_BOARD_ASSETS,window.ELIO_BOARD_READER_BASE||location.href);
    projected.display_view=data.board_state?.view||(data.work_id===state.work?work().display_view:undefined);
    canonical.set(data.work_id,data);
    const index=works.findIndex(row=>row.id===data.work_id);
    if(index<0)works.push(projected);else works[index]=projected;
    if(!selectionHistory.has(data.work_id))selectionHistory.set(data.work_id,[]);
    if(!readMarks.has(data.work_id))readMarks.set(data.work_id,new Set());
    graphWork=null;graphKey='';catalogKey='';
    if(activate){memory.delete(data.work_id);selectionHistory.set(data.work_id,[]);const saved=data.board_state||{},records=data.events||data.items,requested=saved.node||data.reading_state?.selected?.replace(/^event:/,''),node=records.find(row=>row.id===requested)?.id||records[0].id;chooseWork(data.work_id,{node,mode:documents.presentation(data).style||(captions[saved.mode]?saved.mode:state.mode),scope:['chapter','stage','focus'].includes(saved.scope)?saved.scope:'focus'});}
    else {if(data.work_id===state.work&&documents.presentation(data).style)state.mode=documents.presentation(data).style;render();if(!reading.hidden)renderReading();}
  }
  if(!reader)window.ElioBoardAuthoring?.init({getDocument:()=>canonical.get(state.work),getWork:work,getItem:item,getState:()=>({node:state.selected,mode:state.mode,scope:state.scope,view:P.groupFor(work(),state.selected)?.id,reading:!reading.hidden,card:state.hudEffect,...(state.reduced===null?{}:{motion:state.reduced?'reduced':'full'})}),installDocument});
  product?.init({getMode:()=>state.mode,navigate:(workId,nodeId)=>{if(readingContext||!reading.hidden){viewTransition?.skipTransition();transitionId++;readingContext=null;reading.hidden=true;$('app').inert=false;}if(workId===state.work)select(nodeId,{scope:'focus'});else chooseWork(workId,{node:nodeId,scope:'focus',mode:state.mode});requestAnimationFrame(focusSelection);}});
  render();if(initialPerspectiveView)focusReaderView(initialPerspectiveView.id,false);else fit(false);
  window.ElioBoardStartup?.ready();
  const initialCamera=state.camera,initialSelection=state.selected;
  route();if(!reader&&savedBoard.reading)openReading();document.fonts.ready.then(()=>{
    // Late font readiness must not replace a camera the user has already read from.
    if(state.camera===initialCamera&&work()===initialWork&&state.selected===initialSelection){if(initialPerspectiveView)focusReaderView(initialPerspectiveView.id,false);else fit(false);}
  });
})();
