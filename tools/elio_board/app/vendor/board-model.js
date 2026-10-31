/* Existing ElioBoard canonical normalization from fieldguide/elio-board.js.
 * This consumer omits the separate reader/layout editor mount and UI. */
(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    require('./diagram_geometry.js');
    require('./story_layout.js');
  }
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ElioBoard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_ROWS = 4096;
  const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const clone = value => JSON.parse(JSON.stringify(value));
  const edgeId = edge => `${edge.from}->${edge.to}`;
  const sourceKinds = ['official','game-capture','guide','user-document','game-transcript','transcript-editor-note','interpretation'];
  function check(ok, message) { if (!ok) throw new Error(message); }
  function text(value, label, max = MAX_BYTES, empty = false) {
    check(typeof value === 'string' && (empty || value.trim()) && value.length <= max, `${label}을 확인해 주세요.`);
  }
  function unique(rows, label, field = 'id') {
    check(Array.isArray(rows) && rows.length > 0 && rows.length <= MAX_ROWS, `${label} 목록을 확인해 주세요.`);
    const ids = new Set();
    rows.forEach(row => { check(row && typeof row === 'object' && ID.test(row[field]) && !ids.has(row[field]), `${label} ID가 없거나 중복됩니다.`); ids.add(row[field]); });
    return ids;
  }
  function normalizeDataset(input) {
    check(input && typeof input === 'object' && input.schema_version === 'elio.board.v1', 'Elio 보드 파일 형식이 아닙니다.');
    const data = clone(input);
    text(data.title, '이야기 제목', MAX_BYTES); text(data.subtitle, '소개', MAX_BYTES);
    check(data.coverage && Array.isArray(data.coverage.limits), '수록 범위가 필요합니다.');
    ['index', 'detail', 'spoilers'].forEach(key => text(data.coverage[key], '수록 범위', MAX_BYTES));
    data.coverage.limits.forEach(line => text(line, '수록 한계', MAX_BYTES));
    const people = unique(data.protagonists, '주인공'), sources = unique(data.sources, '출처');
    data.protagonists.forEach(person => { text(person.name, '인물 이름', MAX_BYTES); text(person.role, '인물 역할', MAX_BYTES); check(/^#[0-9a-f]{6}$/i.test(person.color), '인물 색상을 확인해 주세요.'); });
    data.sources.forEach(source => {
      text(source.title, '출처 제목', MAX_BYTES); text(source.note, '출처 범위', MAX_BYTES);
      check(sourceKinds.includes(source.kind), '출처 종류를 확인해 주세요.');
      if(source.kind==='user-document'&&!source.url)text(source.locator,'제공 문서 위치', MAX_BYTES);
      else { const url = new URL(source.url); check(url.protocol === 'https:' && !url.username && !url.password, '출처는 인증정보 없는 HTTPS 주소여야 합니다.'); }
    });
    const citations = row => check(Array.isArray(row.source_ids) && row.source_ids.length > 0 && row.source_ids.every(id => sources.has(id)), '확인할 수 없는 출처 참조가 있습니다.');
    const viewpoints = row => check(Array.isArray(row.protagonists) && row.protagonists.length > 0 && new Set(row.protagonists).size === row.protagonists.length && row.protagonists.every(id => people.has(id)), '주인공 참조를 확인해 주세요.');
    const chapters = unique(data.chapters, '챕터'), orders = new Set();
    data.chapters.forEach(chapter => {
      text(chapter.title, '챕터 제목', MAX_BYTES); text(chapter.summary, '챕터 설명'); text(chapter.availability, '등장 범위', MAX_BYTES);
      check(Number.isInteger(chapter.order) && chapter.order > 0 && !orders.has(chapter.order), '챕터 순서가 없거나 중복됩니다.'); orders.add(chapter.order);
      check(['index', 'partial','major-branches'].includes(chapter.coverage), '챕터의 확인 범위를 확인해 주세요.'); citations(chapter); viewpoints(chapter);
    });
    const events = unique(data.events, '장면');
    data.events.forEach(event => {
      text(event.title, '장면 제목', MAX_BYTES); text(event.summary, '장면 설명', MAX_BYTES);
      check(chapters.has(event.chapter_id) && ['scene', 'decision', 'outcome'].includes(event.kind) && typeof event.spoiler === 'boolean', '장면의 챕터·종류·스포일러를 확인해 주세요.');
      citations(event); viewpoints(event);
      if (event.observations) { check(Array.isArray(event.observations), '장면 근거를 확인해 주세요.'); event.observations.forEach(line => text(line, '장면 근거', MAX_BYTES)); }
    });
    const graph = data.story_topology;
    check(graph && graph.schema_version === 'elio.story-topology.v2', '원래 Elio 이야기 관계가 필요합니다.');
    text(graph.title, '관계 제목', MAX_BYTES); text(graph.summary, '관계 설명', MAX_BYTES);
    const nodes = unique(graph.nodes, '관계 노드', 'event_id'), tracks = new Map();
    check(nodes.size === events.size && [...nodes].every(id => events.has(id)), '관계 노드는 모든 장면을 한 번씩 가리켜야 합니다.');
    graph.nodes.forEach(node => {
      check(ID.test(node.track_id) && Number.isInteger(node.lane_count) && node.lane_count >= 1 && node.lane_count <= 4 && Number.isInteger(node.lane_index) && node.lane_index >= 0 && node.lane_index < node.lane_count, '관계의 경로·칸을 확인해 주세요.');
      text(node.track_label, '경로 이름', MAX_BYTES); text(node.condition, '경로 조건', MAX_BYTES, true);
      check(Number.isFinite(node.lead) && node.lead >= 0 && node.lead <= 6 && (node.time === null || (node.time && ['time', 'date', 'order'].includes(node.time.kind) && ID.test(node.time.domain) && typeof node.time.label === 'string' && (node.time.value === null || Number.isFinite(node.time.value)))), '이야기 시간과 배치를 확인해 주세요.');
      const signature = `${node.track_label}\n${node.condition}`;
      check(!tracks.has(node.track_id) || tracks.get(node.track_id) === signature, '같은 경로의 이름·조건이 다릅니다.'); tracks.set(node.track_id, signature);
    });
    check(Array.isArray(graph.edges) && graph.edges.length <= 1200 && Array.isArray(graph.alignments), '연결 목록을 확인해 주세요.');
    const pairs = new Set(), order = new Map(graph.nodes.map((node, index) => [node.event_id, index]));
    check(data.edge_conditions && typeof data.edge_conditions === 'object' && !Array.isArray(data.edge_conditions), '갈래의 조건이 필요합니다.');
    graph.edges.forEach(edge => {
      const id = edgeId(edge), relation = edge.relation || 'sequence';
      check(events.has(edge.from) && events.has(edge.to) && !pairs.has(id), '연결이 중복되거나 알 수 없는 장면을 가리킵니다.'); pairs.add(id);
      check(['sequence', 'influence', 'transfer', 'return'].includes(relation), '알 수 없는 연결 종류입니다.');
      check(relation === 'return' || order.get(edge.from) < order.get(edge.to), '읽는 순서를 거스르는 연결은 돌아가는 관계로 구분해야 합니다.');
      text(data.edge_conditions[id], '연결의 조건', MAX_BYTES);
    });
    check(Object.keys(data.edge_conditions).every(id => pairs.has(id)), '실제 연결이 없는 조건이 있습니다.');
    const alignmentIds=new Set(),aligned=new Set(),nodeById=new Map(graph.nodes.map(row=>[row.event_id,row]));
    graph.alignments.forEach(group => {
      check(group && ID.test(group.id) && !alignmentIds.has(group.id) && ['layout', 'simultaneous'].includes(group.kind) && Array.isArray(group.event_ids) && group.event_ids.length>=2 && group.event_ids.every(id=>events.has(id)&&!aligned.has(id)) && new Set(group.event_ids).size===group.event_ids.length, '정렬 관계를 확인해 주세요.');
      text(group.label,'정렬 설명', MAX_BYTES,true);alignmentIds.add(group.id);
      check(!graph.edges.some(edge=>edge.relation!=='return'&&group.event_ids.includes(edge.from)&&group.event_ids.includes(edge.to)),'앞뒤로 이어지는 장면을 같은 정렬로 묶을 수 없습니다.');
      const members=group.event_ids.map(id=>nodeById.get(id));
      members.forEach((member,index)=>check(members.slice(0,index).every(other=>member.lane_index/member.lane_count>=(other.lane_index+1)/other.lane_count||other.lane_index/other.lane_count>=(member.lane_index+1)/member.lane_count),'정렬한 장면의 칸이 겹칩니다.'));
      if(group.kind==='simultaneous'){
        const times=members.map(member=>member.time),supplied=times.filter(Boolean),known=supplied.filter(time=>time.value!==null);
        check(!supplied.length||supplied.length===times.length&&supplied.every(time=>time.kind===supplied[0].kind&&time.domain===supplied[0].domain)&&known.every(time=>time.value===known[0].value),'동시 정렬의 시계와 값을 확인해 주세요.');
      }
      group.event_ids.forEach(id=>aligned.add(id));
    });
    const layout=globalThis.elioStoryLayout||(typeof module!=='undefined'&&module.exports?require('./story_layout.js'):null);
    check(layout,'Elio 배치 도구를 확인해 주세요.');
    // Use the original placement constraints before an import can replace data.
    // No event order, alignment or authored clock is repaired on the user's behalf.
    layout.packStoryTree(graph,{},900,false,false,[],{direction:'horizontal'});
    if(Object.hasOwn(graph,'diagram_layout')){
      const geometry=globalThis.elioDiagramGeometry||(typeof module!=='undefined'&&module.exports?require('./diagram_geometry.js'):null);
      check(geometry,'Elio 배치 검사 도구를 확인해 주세요.'); geometry.validateLayout(graph.diagram_layout,events,graph.edges);
    }
    if(data.views){unique(data.views,'흐름 보기');data.views.forEach(view=>{text(view.title,'흐름 보기 제목', MAX_BYTES);check((view.chapter_id===null||chapters.has(view.chapter_id))&&Array.isArray(view.event_ids)&&view.event_ids.length>0&&new Set(view.event_ids).size===view.event_ids.length&&view.event_ids.every(id=>events.has(id)),'흐름 보기가 알려진 챕터·장면을 가리켜야 합니다.');viewpoints(view);});}
    if(data.choice_groups){check(Array.isArray(data.choice_groups),'선택군을 확인해 주세요.');const seen=new Set();data.choice_groups.forEach(group=>{check(ID.test(group.id)&&!seen.has(group.id)&&group.exclusive===true&&Array.isArray(group.event_ids)&&group.event_ids.length>1&&new Set(group.event_ids).size===group.event_ids.length&&group.event_ids.every(id=>events.has(id)),'배타적 선택군을 확인해 주세요.');text(group.label,'선택군 이름', MAX_BYTES);seen.add(group.id);});}
    if(data.provenance){
      for(const kind of ['events','edges']){
        const entries=data.provenance[kind]||{};check(entries&&typeof entries==='object'&&!Array.isArray(entries),'근거 목록을 확인해 주세요.');
        Object.entries(entries).forEach(([id,refs])=>{check((kind==='events'?events:pairs).has(id)&&Array.isArray(refs)&&refs.length>0,'근거가 알려진 장면·연결을 가리켜야 합니다.');refs.forEach(ref=>{check(sources.has(ref.source_id)&&sourceKinds.includes(ref.kind)&&['document-supported','source-checked','unverified','conflicting'].includes(ref.status),'근거 종류·확인 상태를 확인해 주세요.');text(ref.locator,'원문 위치', MAX_BYTES);text(ref.note,'근거 설명', MAX_BYTES,true);if(ref.translation_keys)check(Array.isArray(ref.translation_keys)&&ref.translation_keys.every(key=>typeof key==='string'&&key.length<=200),'대사 키를 확인해 주세요.');});});
      }
    }
    data.annotations = data.annotations || {};
    check(typeof data.annotations === 'object' && !Array.isArray(data.annotations), '메모 형식을 확인해 주세요.');
    Object.entries(data.annotations).forEach(([key, note]) => { check(validSelection(data, key), '메모가 알 수 없는 장면을 가리킵니다.'); text(note, '내 메모', MAX_BYTES, true); });
    return data;
  }
  function validSelection(data, selection) {
    if (typeof selection !== 'string') return false;
    return selection.startsWith('event:') ? data.events.some(row => `event:${row.id}` === selection) : data.chapters.some(row => `chapter:${row.id}` === selection);
  }
  return { normalizeDataset, MAX_BYTES };
});
