/* Synthetic editable seeds for the owned Elio runtime. */
(function (global) {
  'use strict';
  let serial = 0;
  function makeSection(input) {
    const id = typeof input === 'string' ? input : input && input.id;
    const pattern = global.FW_CATALOG.patterns.find(row => row.id === id);
    if (!pattern) throw new Error('Unsupported Elio expression: ' + String(id));
    const count = id === 'taxonomic-tree' ? 6 : id === 'evolving-timeline' ? 5
      : ['fork-and-join', 'distributed-network', 'parallel-timeline'].includes(id) ? 4 : 3;
    const items = Array.from({ length: count }, (_, index) => ({
      id: String.fromCharCode(97 + index), title: '기록 ' + (index + 1),
      body: '직접 작성한 내용과 확인한 근거를 넣습니다.', label: '창작 예제', value: index === 1 ? 0 : index === 2 ? null : 4,
      image: '', alt: ''
    }));
    const section = { id: 'elio-section-' + (++serial), patternId: id, patternName: pattern.name,
      engine: pattern.engine, variant: pattern.variant, placement: pattern.placement,
      theme: 'forest', title: pattern.name, lead: '관계를 설명하는 창작 예제입니다.',
      eyebrow: 'ELIO / OWNED EXAMPLE', note: '실제 작품·관측·성과가 아닙니다. 원자료와 적용 범위를 적으세요.', items };
    const edge = (from, to, kind = 'sequence') => ({ from, to, kind, label: '작성한 연결' });
    if (['branch', 'graph', 'interactive-graph', 'cycle'].includes(pattern.variant)) {
      section.edges = id === 'fork-and-join'
        ? [edge('a','b','split'),edge('a','c','split'),edge('b','d','merge'),edge('c','d','merge')]
        : id === 'conditional-branch' || id === 'radial-diffusion'
          ? [edge('a','b','choice'),edge('a','c','choice')]
          : id === 'evolving-timeline'
            ? [edge('a','c','merge'),edge('b','c','merge'),edge('c','d','choice'),edge('c','e','choice')]
            : items.slice(1).map((item,index) => edge(items[index].id,item.id,'association'));
      if (pattern.variant === 'cycle') {
        section.edges = [edge('a','b','sequence'),edge('b','c','sequence'),edge('c','a','feedback')];
        section.cycles = [{ id:'round', title:'명시한 반복', items:['a','b','c'] }];
        section.condition = '같은 질문을 다시 확인할 때만 돌아갑니다.';
      }
    }
    if (pattern.variant === 'timeline') {
      section.groups = [{id:'g1',title:'원자료 A'},{id:'g2',title:'원자료 B'}];
      items.forEach((item,index) => { item.group = 'g' + (index % 2 + 1); item.date = '원본 시각 미기록'; });
      section.timeBasis = '행과 간격은 동시성·기간을 나타내지 않습니다.';
    }
    if (pattern.variant === 'classification' || pattern.variant === 'shared-membership') {
      section.groups = [1,2,3].map(n => ({id:'g'+n,title:'분류 '+n}));
      items.forEach((item,index) => { item.group = 'g'+(Math.floor(index/2)%3+1); });
      if (pattern.variant === 'shared-membership') section.containment = items.map((item,index) => ({containerId:section.groups[index%3].id,memberId:item.id,membershipType:'member-of'}));
    }
    if (pattern.variant === 'hierarchy') section.containment = [
      {containerId:'a',memberId:'b',membershipType:'contains'}, {containerId:'a',memberId:'c',membershipType:'contains'}
    ];
    if (pattern.variant === 'comparison') {
      section.criteria = [{id:'value',key:'value',label:'관측값'}];
      section.observations = items.map(item => ({subjectId:item.id,criterionId:'value',value:item.value}));
      section.sharedConditions = ['같은 기준의 창작 관측값'];
    }
    if (pattern.variant === 'data') section.unit = '개';
    if (pattern.variant === 'spatial') items.forEach((item,index) => { item.x = [0,4,10][index]; item.y = [0,6,2][index]; });
    if (pattern.variant === 'annotation') items.forEach((item,index) => { item.x = [25,50,75][index]; item.y = [30,65,40][index]; });
    if (pattern.variant === 'status') {
      section.statusDefinitions = [{id:'draft',label:'초안'},{id:'checked',label:'확인'}];
      items.forEach((item,index) => { item.status = index ? 'draft' : 'checked'; });
    }
    return section;
  }
  global.FW_CONTENT = { makeSection, presets: { sequence: () => ({ title:'Elio 창작 예제', sections:[makeSection('linear-sequence')] }) } };
})(typeof window !== 'undefined' ? window : globalThis);
