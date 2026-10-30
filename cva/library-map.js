/* Discovery and usage metadata. Rendering and authored data stay with their existing owners. */
(function (global) {
  'use strict';

  const categories = [
    { id: 'pages', name: '페이지·섹션', description: '완성 페이지에서 시작하거나 도입과 다음 행동을 조합합니다.' },
    { id: 'text', name: '제목·본문·인용', description: '읽는 순서와 글의 역할, 출처를 구분합니다.' },
    { id: 'actions', name: '버튼·행동', description: '실행과 이동을 구분하고 현재 행동의 결과를 확인합니다.' },
    { id: 'status', name: '상태·라벨·시각 부호', description: '이름·색·크기의 역할을 구분하고 선택·완료·주의를 실제 상태와 연결합니다.' },
    { id: 'media', name: '이미지·갤러리', description: '대표 이미지와 설명·출처·순서를 함께 다룹니다.' },
    { id: 'cards', name: '카드·내용 묶음', description: '동등한 항목과 대표 항목의 비중을 구분합니다.' },
    { id: 'forms', name: '입력·폼', description: '라벨·입력값·안내·오류·비활성 상태를 확인합니다.' },
    { id: 'navigation', name: '탐색·목차', description: '현재 위치와 다음에 읽을 대상을 찾습니다.' },
    { id: 'details', name: '상세·근거·펼침', description: '필요한 상세와 출처를 열고 읽는 맥락으로 돌아옵니다.' },
    { id: 'layout', name: '레이아웃·그리드', description: '정보의 우선순위와 이미지·글의 대응을 배치합니다.' },
    { id: 'relations', name: '관계·분기·구조', description: '순서·연결·포함·합류의 실제 의미를 보존합니다.' },
    { id: 'time', name: '시간·타임라인', description: '읽는 순서·사건 시간·방송 시각을 구분합니다.' },
    { id: 'data', name: '수치·비교·시각화', description: '같은 기준의 값과 단위·조건·출처를 읽습니다.' },
    { id: 'scenes', name: '장면·이야기', description: '장면과 인물의 이야기를 원래 내용과 관계로 전개합니다.' },
    { id: 'space', name: '공간·위치', description: '전체와 부분의 위치를 실제 좌표 또는 개념 배치로 구분합니다.' },
    { id: 'interaction', name: '조작·변화·3D', description: '선택과 조건을 바꾸어 같은 대상의 변화를 살펴봅니다.' },
    { id: 'effects', name: '배경·시각 효과', description: '내용의 읽기와 조작을 유지하며 분위기와 강조를 더합니다.' },
    { id: 'scroll', name: '스크롤·전개', description: '현재 읽는 단계와 전체 진행을 같은 본문에 연결합니다.' },
    { id: 'overlays', name: '오버레이·대화상자', description: '필요한 내용을 열고 닫은 뒤 원래 위치로 돌아옵니다.' },
    { id: 'sliders', name: '슬라이더·캐러셀', description: '값·이미지·현재 항목을 직접 바꾸며 비교합니다.' },
    { id: 'pointer', name: '커서·포인터', description: '기본 포인터와 키보드 조작을 보존하는 국소 효과입니다.' },
    { id: 'labs', name: 'Labs · 실험실', description: '포인터·깊이의 실험적 표현입니다. 정지 상태에서 시작하고 명시적으로 켭니다.' }
  ];
  const text = (key, label, kind = 'text') => ({ key, label, kind });
  const select = (key, label, values) => ({ key, label, kind: 'select', options: values.map(([value, name]) => ({ value, label: name })) });
  const levels = [[1, 'H1 · 페이지'], [2, 'H2 · 섹션'], [3, 'H3 · 항목']];
  const mediaOptions = (global.CVA_MODULES?.media || []).map(asset => [asset.id, asset.label]);
  const consumer = (type, label, fields) => ({ type, label, fields });
  const code = (name, args) => 'CVA_COMPONENTS.' + name + '(' + args.map(value => JSON.stringify(value, null, 2)).join(', ') + ')';
  const components = [
    {
      id: 'heading', name: '제목과 설명', category: 'text',
      description: '상위 분류·제목·본문을 묶습니다. 제목 단계는 페이지 문맥에 맞춰 지정합니다.',
      keywords: ['heading', 'text', '제목', '타이포그래피', '설명'],
      signature: 'CVA_COMPONENTS.heading({eyebrow, title, body, level})', source: 'cva/components.js',
      controls: [text('eyebrow', '상위 분류'), text('title', '제목'), text('body', '설명', 'textarea'), select('level', '제목 단계', levels)],
      defaults: { eyebrow: '관측 일지', title: '같은 장면에서 발견한 변화', body: '무엇을 읽는지 제목에서 알리고 필요한 맥락을 이어갑니다.', level: 2 },
      render(props = {}) { const p = { ...this.defaults, ...props }; return global.CVA_COMPONENTS.heading({ ...p, level: Number(p.level) }); },
      code(props = {}) { const p = { ...this.defaults, ...props }; return code('heading', [{ ...p, level: Number(p.level) }]); },
      consumers: [consumer('hero', '도입 메시지', ['props.eyebrow', 'props.title', 'props.body']), consumer('text', '본문의 제목과 설명', ['props.eyebrow', 'props.title', 'props.body']), consumer('cards', '카드 묶음의 제목', ['props.eyebrow', 'props.title', 'props.body'])]
    },
    {
      id: 'button', name: '행동 링크', category: 'actions',
      description: '실제 목적지로 이동하는 native 링크입니다. 저장·실행 버튼의 상태 관리는 이 API의 기능이 아닙니다.',
      keywords: ['button', 'link', '버튼', '이동', 'CTA'],
      signature: 'CVA_COMPONENTS.button(label, {target, tone, href})', source: 'cva/components.js',
      controls: [text('label', '링크 문구'), text('href', '이동할 주소 또는 #ID'), select('tone', '강조', [['primary', '주요 행동'], ['secondary', '보조 행동']])],
      defaults: { label: '선택한 내용 읽기', href: '#library-preview', tone: 'primary' },
      render(props = {}) { const p = { ...this.defaults, ...props }; return global.CVA_COMPONENTS.button(p.label, { href: p.href, tone: p.tone }); },
      code(props = {}) { const p = { ...this.defaults, ...props }; return code('button', [p.label, { href: p.href, tone: p.tone }]); },
      consumers: [consumer('hero', '다음 섹션으로 이동', ['props.actionLabel']), consumer('cta', '마지막 행동과 목적지', ['props.actionLabel', 'props.actionHref'])]
    },
    {
      id: 'badge', name: '상태 라벨', category: 'status',
      description: '이름과 강조로 현재·완료·주의를 구분합니다. 라벨을 그린다고 실제 작업 상태가 바뀌지는 않습니다.',
      keywords: ['badge', 'status', '상태', '라벨', '완료', '주의'],
      signature: 'CVA_COMPONENTS.badge(label, {kind})', source: 'cva/components.js',
      controls: [text('label', '상태 이름'), select('kind', '표시 상태', [['neutral', '일반'], ['current', '현재'], ['complete', '완료'], ['warning', '주의']])],
      defaults: { label: '원자료 확인 필요', kind: 'warning' },
      render(props = {}) { const p = { ...this.defaults, ...props }; return global.CVA_COMPONENTS.badge(p.label, { kind: p.kind }); },
      code(props = {}) { const p = { ...this.defaults, ...props }; return code('badge', [p.label, { kind: p.kind }]); },
      consumers: [consumer('cards', '항목의 종류와 이름', ['props.items[].label']), consumer('timeline', '장면의 라벨과 시점', ['props.items[].label']), consumer('accordion', '펼친 항목의 라벨', ['props.items[].label'])]
    },
    {
      id: 'media', name: '이미지와 캡션', category: 'media',
      description: '등록된 로컬 이미지를 원래 대체 설명과 함께 사용합니다. 제목·본문·캡션은 각각 조정할 수 있습니다.',
      keywords: ['media', 'image', '이미지', '사진', '캡션', '출처', 'gallery'],
      signature: 'CVA_COMPONENTS.media(reference, {caption, title, body, label, className, titleLevel})', source: 'cva/components.js',
      controls: [select('image', '등록 이미지', mediaOptions), text('title', '이미지 제목'), text('body', '설명', 'textarea'), text('caption', '캡션·출처', 'textarea'), text('label', '라벨'), select('titleLevel', '제목 단계', levels)],
      defaults: { image: 'adaptive-coast', title: '새벽의 해안', body: '같은 이미지가 무엇을 설명하는지 본문과 연결합니다.', caption: 'CVA의 창작 풍경이며 실제 관측의 증거가 아닙니다.', label: '창작 예시', titleLevel: 3 },
      render(props = {}) { const { image, ...p } = { ...this.defaults, ...props }; return global.CVA_COMPONENTS.media(image, { ...p, titleLevel: Number(p.titleLevel) }); },
      code(props = {}) { const { image, ...p } = { ...this.defaults, ...props }; return code('media', [image, { ...p, titleLevel: Number(p.titleLevel) }]); },
      consumers: [consumer('hero', '대표 이미지와 캡션', ['props.image', 'props.caption']), consumer('split', '본문과 대응하는 이미지', ['props.image', 'props.caption']), consumer('gallery', '이미지별 제목과 설명', ['props.items[].image', 'props.items[].title', 'props.items[].body', 'props.items[].label'])]
    },
    {
      id: 'panel', name: '내용 패널', category: 'cards',
      description: '한 대상의 이미지·라벨·제목·값·설명을 묶습니다. 이미지가 없는 항목에는 빈 사진틀을 만들지 않습니다.',
      keywords: ['panel', 'card', '카드', '패널', '항목', '값'],
      signature: 'CVA_COMPONENTS.panel({title, body, label, value, image}, {className, titleLevel})', source: 'cva/components.js',
      controls: [text('title', '제목'), text('body', '설명', 'textarea'), text('label', '라벨'), text('value', '값·단위'), select('image', '이미지', [['', '이미지 없음'], ...mediaOptions]), select('titleLevel', '제목 단계', levels)],
      defaults: { title: '관측 수첩', body: '확인한 내용과 아직 남은 질문을 같은 항목에 기록합니다.', label: '창작 예시', value: '확인할 조건', image: '', titleLevel: 3 },
      render(props = {}) { const { titleLevel, ...p } = { ...this.defaults, ...props }; return global.CVA_COMPONENTS.panel(p, { titleLevel: Number(titleLevel) }); },
      code(props = {}) { const { titleLevel, ...p } = { ...this.defaults, ...props }; return code('panel', [p, { titleLevel: Number(titleLevel) }]); },
      consumers: [consumer('cards', '동등 목록·대표 항목·수직 목록', ['props.items[].title', 'props.items[].body', 'props.items[].label', 'props.items[].value', 'props.items[].image']), consumer('metrics', '수치와 조건', ['props.items[].title', 'props.items[].body', 'props.items[].value']), consumer('comparison', '대상별 열 변형의 항목', ['props.items[].title', 'props.items[].body', 'props.items[].label', 'props.items[].value'])]
    },
    {
      id: 'field', name: '입력 필드', category: 'forms',
      description: '직접 API로 라벨·입력값·안내·오류·필수·비활성을 조정합니다. Studio 속성창은 별도의 native 편집 owner이며 field 모듈은 없습니다.',
      keywords: ['field', 'input', 'form', '입력', '폼', '오류', '필수'],
      signature: 'CVA_COMPONENTS.field({id, label, kind, value, options, hint, error, required, disabled})', source: 'cva/components.js',
      controls: [text('id', '고유 ID'), text('label', '입력 이름'), select('kind', '입력 종류', [['text', '한 줄'], ['textarea', '여러 줄']]), text('value', '입력값', 'textarea'), text('hint', '입력 안내'), text('error', '오류 안내'), { key: 'required', label: '필수 입력', kind: 'checkbox' }, { key: 'disabled', label: '비활성', kind: 'checkbox' }],
      defaults: { id: 'library-field', label: '기록 제목', kind: 'text', value: '해안 관측 일지', hint: '원자료를 다시 찾을 수 있는 제목을 적으세요.', error: '', required: true, disabled: false },
      render(props = {}) { return global.CVA_COMPONENTS.field({ ...this.defaults, ...props }); },
      code(props = {}) { return code('field', [{ ...this.defaults, ...props }]); },
      consumers: []
    },
    {
      id: 'tabs', name: '부분 탐색 링크', category: 'navigation',
      description: '실제 본문 ID로 이동하는 목차 링크입니다. 현재 위치 표시와 native 링크를 제공하며 상태를 전환하는 tab controller가 아닙니다.',
      keywords: ['tabs', 'navigation', '탭', '목차', '부분 탐색', '링크'],
      signature: 'CVA_COMPONENTS.tabs(items, {active, label})', source: 'cva/components.js',
      controls: [text('firstTitle', '첫 부분 이름'), text('secondTitle', '다음 부분 이름'), text('label', '탐색 영역 이름'), select('active', '현재 위치', [['library-overview', '첫 부분'], ['library-sources', '다음 부분'], ['', '지정 없음']])],
      defaults: { firstTitle: '전체 설명', secondTitle: '근거 자료', label: '관측 일지 목차', active: 'library-overview' },
      render(props = {}) { const p = { ...this.defaults, ...props }; return global.CVA_COMPONENTS.tabs([{ id: 'library-overview', title: p.firstTitle }, { id: 'library-sources', title: p.secondTitle }], { active: p.active, label: p.label }); },
      code(props = {}) { const p = { ...this.defaults, ...props }; return code('tabs', [[{ id: 'library-overview', title: p.firstTitle }, { id: 'library-sources', title: p.secondTitle }], { active: p.active, label: p.label }]); },
      consumers: []
    },
    {
      id: 'quote', name: '인용과 출처', category: 'text',
      description: '인용한 말과 출처를 구분합니다. 원문과 작성자의 해석을 섞지 않고 본문 길이를 보존합니다.',
      keywords: ['quote', 'blockquote', '인용', '출처', '원문'],
      signature: 'CVA_COMPONENTS.quote(body, cite)', source: 'cva/components.js',
      controls: [text('body', '인용문', 'textarea'), text('cite', '작성자·출처')],
      defaults: { body: '같은 장면도 무엇을 확인하는지에 따라 다시 읽을 수 있습니다.', cite: '작성한 예시 문장 · 실제 자료의 인용이 아닙니다.' },
      render(props = {}) { const p = { ...this.defaults, ...props }; return global.CVA_COMPONENTS.quote(p.body, p.cite); },
      code(props = {}) { const p = { ...this.defaults, ...props }; return code('quote', [p.body, p.cite]); },
      consumers: [consumer('quote', '인용 섹션', ['props.body', 'props.cite'])]
    }
  ];

  const elioRender = 'python scripts/render_story.py --input examples/templates/complete.story.json --source examples/templates/complete.source.json --connections examples/templates/complete.connections.json --output <new-reader.html>';
  const elio = [
    { id: 'scene-reader', name: 'Elio 장면 읽기·탐색', category: 'scenes', description: '원래 events의 장면과 공개 순서를 읽습니다. CVA 모듈 문서와 다른 Elio 저작 입력입니다.', input: 'elio.preview.v1', fields: ['events[].id', 'events[].title', 'events[].summary'], source: 'tools/elio_preview/__main__.py', inputs: ['story.json', 'source.json'], example: 'tools/elio_preview/examples/reusable_demo.py', previewUrl: '../examples/templates/complete.html', keywords: ['Elio', '장면', '리더', 'navigation', 'scenes', 'scroll', '스크롤'] },
    { id: 'story-topology', name: 'Elio 분기·합류·순환', category: 'relations', description: '같은 사건 ID의 분기·합류·되돌아가는 관계를 원래 이야기 모델에서 작성합니다. 보드 geometry의 자유 편집과 구분합니다.', input: 'elio.story-topology.v2', fields: ['story_topology.nodes', 'story_topology.edges', 'story_topology.alignments'], source: 'tools/elio_preview/components/story_topology.py', inputs: ['story.json', 'source.json'], example: 'tools/elio_preview/examples/branching_demo.py', previewUrl: '../examples/templates/branches.html', keywords: ['Elio', '분기', '합류', '순환', 'topology'] },
    { id: 'reader-guides', name: 'Elio 인물·관계·단서 해설', category: 'details', description: '원래 reader_guides에 해설과 출처·관련 장면을 작성합니다. 본편 순서를 바꾸지 않고 다른 읽는 방식을 더합니다.', input: 'story.reader_guides', fields: ['reader_guides[].kind', 'reader_guides[].items', 'reader_guides[].source_ids'], source: 'tools/elio_preview/components/reader_guides.py', inputs: ['story.json', 'source.json'], example: 'tools/elio_preview/examples/reusable_demo.py', previewUrl: '../examples/templates/complete.html', keywords: ['Elio', '인물', '관계', 'clues', 'perspective', '상세'] },
    { id: 'time-map', name: 'Elio 독립 시간선·공유 공간', category: 'time', description: '시대와 인물 축, 같은 사건의 만남과 공유 공간을 원래 time_map 입력으로 연결합니다. 화면 위치와 사건 시간을 혼동하지 않습니다.', input: 'reader_guides[].time_map', fields: ['time_map.eras', 'time_map.lanes', 'time_map.nodes', 'time_map.edges', 'time_map.shared_space.node_ids'], source: 'tools/elio_preview/components/time_map.py', inputs: ['story.json', 'source.json'], example: 'tools/elio_preview/examples/reusable_demo.py', previewUrl: '../examples/templates/complete.html', keywords: ['Elio', 'time_map', '타임라인', '독립 시계', '공유 공간'] },
    { id: 'replay-connections', name: 'Elio 장면과 영상 연결', category: 'media', description: '원래 connections에서 컷씬·같이보기·후기와 장면을 연결합니다. 새 방송 시각이나 공개 승인을 만들지 않습니다.', input: 'elio.connections.v3', fields: ['streams', 'moments', 'pending_replays'], source: 'tools/elio_preview/connections.py', inputs: ['story.json', 'source.json', 'connections.json'], example: 'tools/elio_preview/examples/reusable_demo.py', previewUrl: '../examples/templates/complete.html', keywords: ['Elio', 'connections', '영상', '다시보기', '방송', '시각'] },
    { id: 'scene-dialog', name: 'Elio 시간선의 장면 상세', category: 'details', description: '시간선의 같은 장면을 원래 native dialog로 열고 닫아 초점·스크롤을 복원합니다. 범용 팝오버나 독립 modal API는 아닙니다.', input: 'reader_guides[].time_map + guide items', fields: ['time_map.nodes[].item_id', 'reader_guides[].items[].id', 'reader_guides[].items[].title', 'reader_guides[].items[].summary'], source: 'tools/elio_preview/components/time_map.js', inputs: ['story.json', 'source.json'], example: 'tools/elio_preview/examples/reusable_demo.py', previewUrl: '../examples/templates/complete.html', keywords: ['Elio', 'dialog', 'modal', 'overlay', '오버레이', '장면 상세', '초점 복귀'] },
    { id: 'reader-presentation', name: 'Elio 읽기 표제·전환·장면 링크', category: 'navigation', description: '기존 reader_presentation의 표제와 전환·링크를 원래 사건 ID에 연결합니다. 전용 시각 예제는 아직 연결하지 않았으며 독립 UI 부품의 Studio 삽입 기능은 아닙니다.', input: 'story.reader_presentation', fields: ['main_view', 'perspective_views', 'transitions', 'scene_links', 'quote_labels', 'preserve_line_breaks'], source: 'tools/elio_preview/components/reader_presentation.py', inputs: ['story.json', 'source.json'], example: 'docs/STORY_AUTHORING.md', previewUrl: '', keywords: ['Elio', '표제', '전환', '읽기', 'navigation'] }
  ].map(entry => ({ ...entry, kind: 'elio', studioUrl: '../examples/templates/index.html', code: elioRender, authoring: 'docs/STORY_AUTHORING.md', export: 'scripts/render_story.py' }));

  const moduleCategories = { hero: 'pages', text: 'text', metrics: 'data', cards: 'cards', split: 'layout', timeline: 'time', flow: 'relations', comparison: 'data', gallery: 'media', quote: 'text', evidence: 'details', accordion: 'details', cta: 'actions', 'forma-pattern': 'relations', 'scene-composition': 'scenes', focus: 'navigation', experience: 'interaction' };
  const familyCategories = { '1': 'relations', '2': 'relations', '3': 'relations', '4': 'relations', '5': 'relations', '6': 'relations', '7': 'time', '8': 'navigation', '9': 'data', '10': 'data', '11': 'space', '12': 'status', '13': 'layout', '14': 'media', '15': 'media', '16': 'scenes', '17': 'interaction' };
  function resources() {
    const rows = components.map(entry => ({ id: entry.id, kind: 'component', name: entry.name, description: entry.description, category: entry.category, keywords: entry.keywords, source: entry.source, studioUrl: '', previewUrl: '' }));
    for (const entry of global.CVA_ELEMENTS?.entries || []) rows.push({id:entry.id,kind:'element',name:entry.name,description:entry.description,category:entry.category,lab:Boolean(entry.lab),keywords:[...entry.keywords,...entry.variants.map(v=>v.label)],source:'cva/'+(entry.lab||global.CVA_ELEMENTS_EFFECTS?.includes(entry)?'elements-effects.js':'elements-controls.js'),variants:entry.variants,studioUrl:'index.html?element='+encodeURIComponent(entry.id),previewUrl:'thumb.html?element='+encodeURIComponent(entry.id)+'&profile=elio'});
    for (const entry of global.CVA_MODULES?.definitions || []) rows.push({ id: entry.type, kind: 'module', name: entry.name, description: entry.description, category: moduleCategories[entry.type] || 'pages', keywords: [entry.type, entry.category, ...entry.variants.map(variant => variant.label), ...(entry.type === 'experience' ? ['3d', '3D', 'range', '조건 슬라이더', '직접 조절'] : [])], source: 'cva/modules.js', studioUrl: 'index.html?module=' + encodeURIComponent(entry.type), previewUrl: 'thumb.html?module=' + encodeURIComponent(entry.type) });
    for (const entry of global.CVA_SECTIONS?.entries || []) rows.push({id:entry.id,kind:'section',purpose:entry.purpose,name:entry.name,description:entry.description,category:entry.category,keywords:[entry.id,entry.purpose,...entry.keywords],source:'cva/sections.js',studioUrl:'index.html?section='+encodeURIComponent(entry.id)+'&profile='+encodeURIComponent(entry.preferredProfile),previewUrl:'thumb.html?section='+encodeURIComponent(entry.id)+'&profile='+encodeURIComponent(entry.preferredProfile)});
    for (const entry of global.CVA_TEMPLATES?.entries || []) rows.push({ id: entry.id, kind: 'template', purpose: entry.purpose, name: entry.name, description: entry.description, category: 'pages', keywords: [entry.id, entry.category, entry.purpose, entry.preferredProfile], source: 'cva/templates.js', studioUrl: 'index.html?template=' + encodeURIComponent(entry.id), previewUrl: 'thumb.html?template=' + encodeURIComponent(entry.id) + '&profile=' + encodeURIComponent(entry.preferredProfile) });
    const patterns = global.CVA_PATTERNS?.enrich(global.FW_CATALOG) || [];
    for (const entry of patterns) rows.push({ id: entry.id, kind: 'pattern', name: entry.title, description: entry.description || entry.question || '', category: familyCategories[entry.familyId] || 'relations', keywords: [entry.id, entry.engine, entry.variant, entry.familyName, entry.axisName], source: 'catalog.js → cva/patterns.js', studioUrl: 'index.html?pattern=' + encodeURIComponent(entry.id), previewUrl: 'thumb.html?pattern=' + encodeURIComponent(entry.id) });
    for (const entry of global.CVA_SCENES?.entries || []) rows.push({ id: entry.id, kind: 'scene', name: entry.name, description: entry.description, category: familyCategories[entry.familyId] || 'scenes', keywords: [entry.id, entry.variant, entry.purpose], source: 'cva/scene-catalog.js', studioUrl: 'index.html?scene=' + encodeURIComponent(entry.id), previewUrl: 'thumb.html?scene=' + encodeURIComponent(entry.id) });
    rows.push(...elio);
    rows.push(
      { id: 'async-action', kind: 'interaction', name: '실행 중·완료·실패와 다시 시도', description: '실제 Promise의 pending·success·error를 native 버튼과 상태 안내에 연결합니다. 예제의 비동기 작업과 실제 저장 결과를 구분하며 독립 로더 컴포넌트는 아닙니다.', category: 'actions', keywords: ['button', 'async', 'Promise', '버튼', '실행 중', '실패', '다시 시도', 'loading', 'loader', '로더'], source: 'cva/library-interactions.js', studioUrl: '', previewUrl: '' },
      { id: 'text-reveal', kind: 'interaction', name: '짧은 제목의 명시적 강조', description: '전체 원문을 항상 읽을 수 있는 짧은 제목 강조입니다. 사용자가 재생을 눌렀을 때 한 번만 명도를 바꾸고, 움직임 줄이기 설정에서는 정지 상태를 유지합니다.', category: 'text', keywords: ['text', 'motion', 'reveal', '텍스트', '공개', '다시 재생', '모션 감소'], source: 'cva/library-interactions.js', studioUrl: '', previewUrl: '' }
    );
    return rows;
  }

  global.CVA_LIBRARY = { categories, components, elio, resources };
})(window);
