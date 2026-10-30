/* Data contract for editable modules. No product state or browser storage is read. */
(function (global) {
  'use strict';
  const media = [{"id": "adaptive-notebook", "label": "창작 · 관측 수첩", "src": "adaptive-assets/catalog-observation-notebook.png", "alt": "창작 청록색 관측 수첩", "kind": "illustration"}, {"id": "adaptive-moonleaf", "label": "창작 · 달빛잎", "src": "adaptive-assets/catalog-moonleaf.png", "alt": "창작 청록색 달빛잎", "kind": "illustration"}, {"id": "adaptive-coast", "label": "창작 · 해안", "src": "adaptive-assets/coastal-observation-dawn.png", "alt": "창작 새벽 해안 풍경", "kind": "illustration"}, {"id": "adaptive-greenhouse", "label": "창작 · 온실", "src": "adaptive-assets/winter-greenhouse-path.png", "alt": "창작 눈 속의 온실", "kind": "illustration"}, {"id": "brand-welcome", "label": "TTaem CVA", "src": "assets/cva-color.svg", "alt": "TTaem CVA 로고", "kind": "brand"}, {"id": "scene-public-arrival", "label": "창작 장면 · 첫 만남", "src": "../assets/public-arrival.svg", "alt": "첫 만남 관계를 그린 창작 도식", "kind": "illustration"}, {"id": "scene-public-discovery", "label": "창작 장면 · 발견", "src": "../assets/public-discovery.svg", "alt": "발견 관계를 그린 창작 도식", "kind": "illustration"}, {"id": "scene-public-return", "label": "창작 장면 · 복귀", "src": "../assets/public-return.svg", "alt": "복귀 관계를 그린 창작 도식", "kind": "illustration"}, {"id": "scene-public-choice", "label": "창작 장면 · 선택", "src": "../assets/public-choice.svg", "alt": "선택 관계를 그린 창작 도식", "kind": "illustration"}, {"id": "scene-public-crossing", "label": "창작 장면 · 교차", "src": "../assets/public-crossing.svg", "alt": "교차 관계를 그린 창작 도식", "kind": "illustration"}, {"id": "public-workbench", "label": "창작 · 작업 흐름", "src": "../assets/public-workbench.svg", "alt": "작업 흐름의 개념적 구조를 그린 창작 도식", "kind": "illustration"}, {"id": "public-space", "label": "창작 · 공간", "src": "../assets/public-space.svg", "alt": "공간의 개념적 구조를 그린 창작 도식", "kind": "illustration"}, {"id": "public-paper", "label": "창작 · 페이지", "src": "../assets/public-paper.svg", "alt": "페이지의 개념적 구조를 그린 창작 도식", "kind": "illustration"}, {"id": "public-coast", "label": "창작 · 관측 지점", "src": "../assets/public-coast.svg", "alt": "관측 지점의 개념적 구조를 그린 창작 도식", "kind": "illustration"}];
  const profiles = ['ttaem', 'elio', 'editor', 'forma', 'cham', 'folio', 'signal', 'mist'];
  const orientations = ['original', 'vertical', 'horizontal'];
  const documentByteLimit = 2 * 1024 * 1024;
  const clone = value => JSON.parse(JSON.stringify(value));
  const variants = entries => entries.map(([id, label]) => ({ id, label }));
  const field = (key, label, kind = 'text', options) => ({ key, label, kind, ...(options ? { options } : {}) });
  const commonFields = () => [field('eyebrow', '상위 분류'), field('title', '제목'), field('body', '설명', 'textarea')];
  const common = (title, body, eyebrow = '') => ({ eyebrow, title, body });
  const item = (id, title, body, extra = {}) => ({ id, title, body, ...extra });
  const imageFields = () => [field('image', '기존 이미지', 'image'), field('caption', '이미지 설명', 'textarea')];
  const definitions = [
    { type: 'interface', name: 'UI 요소·이펙트', category: '인터랙티브', description: '버튼·폼·탐색·스크롤·시각 효과를 실제 속성과 동작으로 편집합니다.', variants: variants([['section','제목과 요소'],['bare','요소만']]), fields: [...commonFields(), field('elementId','사용할 요소','select',global.CVA_ELEMENTS.entries.map(entry=>({id:entry.id,label:entry.name}))), field('settings','요소 속성','json')], defaultProps: {...common('',''),elementId:'action-button',settings:global.CVA_ELEMENTS.defaults('action-button')} },
    { type: 'experience', name: '구조와 변화 탐색', category: '인터랙티브', description: '공간·단계·조건을 조작하며 관계와 제약을 이해합니다.', variants: variants([['spatial', '3D 구조 탐색'], ['story', '장면 전개'], ['simulation', '조건 실험']]), fields: [...commonFields(), field('items', '대상과 설명', 'items'), field('edges', '대상 사이 관계', 'json'), field('stages', '전개 단계', 'json'), field('model', '조건과 계산', 'json'), field('helpLabel', '도움말 제목'), field('help', '가정과 도움말', 'textarea')], defaultProps: { ...common('구조를 직접 살펴보세요.', '부분을 선택하면 그 역할과 연결을 함께 확인합니다.', 'CVA / EXPERIENCE'), items: [item('source', '입력', '내용이 들어오는 부분입니다.', {x:-2,y:0,z:0,role:'input',source:'작성된 개념 예시'}),item('result', '결과', '입력과 연결된 결과입니다.', {x:2,y:0,z:0,role:'output'})], edges:[{from:'source',to:'result',label:'전달'}], stages:[], model:{kind:'capacity',unit:'개',capacity:20,perItem:2,count:4,maxCount:20}, helpLabel:'구성과 표기 기준',help:'이 구조는 작성한 관계를 설명하는 개념도입니다. 실제 시설이나 물리 시뮬레이션이 아닙니다.' } },
    { type: 'focus', name: '선택과 상세', category: '탐색', description: '현재 선택을 장면·설명·근거와 연결합니다. 위치와 저장 상태를 구분합니다.', variants: variants([['reader', '장면 읽기'], ['review', '근거와 판단'], ['catalog', '항목 탐색'], ['notes', '인물·관점 수첩']]), fields: [...commonFields(), field('items', '선택할 항목', 'items'), field('helpLabel', '펼침 제목'), field('help', '선택적인 설명', 'textarea')], defaultProps: { ...common('지금 살펴볼 대상을 고르세요.', '', 'CVA / FOCUS'), items: [item('first', '첫 번째 장면', '선택한 대상의 내용이 같은 자리에서 이어집니다.', { detail: '이 문장은 창작 예시입니다.', source: '' })], helpLabel: '읽는 방법', help: '목록에서 대상을 선택하면 해당 설명과 자료가 함께 표시됩니다. 선택한 위치는 판단이나 저장 완료를 뜻하지 않습니다.' } },
    { type: 'hero', name: '히어로', category: '도입', description: '대표 메시지와 기존 이미지를 큰 비중으로 함께 놓습니다.', variants: variants([['split', '메시지와 이미지'], ['centered', '중심 강조'], ['immersive', '큰 이미지 중심'], ['editorial', '편집형 표지']]), fields: [...commonFields(), ...imageFields(), field('actionLabel', '다음 섹션 링크 문구')], defaultProps: { ...common('기존 분위기에서, 새로운 페이지를 만듭니다.', '내용과 관계는 그대로 두고, 기존 스타일에서 조립해 보세요.', 'CVA / PAGE'), image: 'brand-welcome', caption: '기존 CVA 브랜드 그림을 사용한 로컬 구성 예시입니다.', actionLabel: '다음 내용 살펴보기' } },
    { type: 'text', name: '본문', category: '설명', description: '제목과 충분한 본문을 읽는 흐름에 맞춰 배치합니다.', variants: variants([['prose', '이어 읽는 본문'], ['columns', '두 열 본문'], ['notice', '강조 안내']]), fields: commonFields(), defaultProps: common('먼저, 무엇을 전할지 정합니다.', '주요 메시지를 먼저 쓰고, 필요한 맥락과 근거를 이어갑니다. 내용이 길어져도 문장을 줄이거나 화면에 맞춰 축소하지 않습니다.', 'READING CONTEXT') },
    { type: 'metrics', name: '수치 묶음', category: '근거', description: '입력한 값과 단위·조건을 설명과 함께 보여줍니다.', variants: variants([['row', '한 줄 수치'], ['cards', '설명 카드']]), fields: [...commonFields(), field('items', '수치 항목', 'items')], defaultProps: { ...common('같은 기준에서 살펴봅니다.', '아래 값은 표현을 확인하기 위한 가상 예시입니다. 실제 결과를 주장하지 않습니다.', 'ILLUSTRATIVE DATA'), items: [item('research', '조사', '가상 작업 시간', { value: '36시간', label: '예시' }), item('build', '제작', '가상 작업 시간', { value: '48시간', label: '예시' }), item('review', '확인', '가상 작업 시간', { value: '24시간', label: '예시' })] } },
    { type: 'cards', name: '콘텐츠 카드', category: '구성', description: '동등한 내용이나 강조할 항목을 이미지·설명과 묶습니다.', variants: variants([['grid', '균등 그리드'], ['featured', '첫 항목 강조'], ['list', '수직 목록'], ['journal', '장면 저널']]), fields: [...commonFields(), field('items', '카드 항목', 'items')], defaultProps: { ...common('공간과 도구, 지속되는 리듬.', '이미지는 분위기를, 글은 각 항목의 역할을 설명하는 Forma 예시입니다.', 'CONTENT COLLECTION'), items: [item('space', '집중을 위한 공간', '오래 머물러도 편안한 공간에서 중요한 일에 집중합니다.', { label: 'SPACE', image: 'public-space' }), item('tools', '생각을 정리하는 도구', '필요한 정보를 가까이 두고 작업의 흐름을 이어갑니다.', { label: 'TOOLS', image: 'public-paper' }), item('rhythm', '오래 지속되는 리듬', '일과 휴식이 번갈아 이어지는 흐름을 살펴봅니다.', { label: 'RHYTHM', image: 'public-coast' })] } },
    { type: 'split', name: '이미지와 설명', category: '구성', description: '기존 이미지와 설명을 대응시키고 이미지 비중을 유지합니다.', variants: variants([['media-left', '이미지 왼쪽'], ['media-right', '이미지 오른쪽'], ['image-led', '큰 장면과 해설']]), fields: [...commonFields(), ...imageFields()], defaultProps: { ...common('장면과 그 맥락을 함께 읽습니다.', '이미지는 대상과 분위기를 보여주고, 본문은 의미와 조건을 설명합니다. 두 역할을 하나의 장식으로 합치지 않습니다.', 'MEDIA AND CONTEXT'), image: 'scene-public-arrival', caption: '사용자가 제공한 Elio 자료의 창작 관계 도식입니다.' } },
    { type: 'timeline', name: '장면·시간 목록', category: '관계', description: '입력한 장면 순서와 시간 라벨을 보존하며 사건을 이어 읽습니다.', variants: variants([['events', '사건 목록'], ['alternating', '중앙 축 교차'], ['compact', '간결한 기록']]), fields: [...commonFields(), field('items', '장면·사건', 'items')], defaultProps: { ...common('장면이 이어지는 읽기 경로.', '아래는 제공 자료의 일부 이미지를 고른 구성 예시입니다. 장면 사이의 간격은 실제 시간이나 인과를 뜻하지 않습니다.', 'SCENES / READING ORDER'), items: [item('hub', '관측소에서 조사자의 모습이 바뀌다', '이 장면에 관한 설명을 입력합니다.', { label: '제공 자료 중 선택한 장면', image: 'scene-public-arrival' }), item('memory', '조사자의 기억을 살펴보다', '이 장면에 관한 설명을 입력합니다.', { label: '제공 자료 중 선택한 장면', image: 'scene-public-discovery' }), item('reunion', '현실의 재회를 살펴보다', '이 장면에 관한 설명을 입력합니다.', { label: '제공 자료 중 선택한 장면', image: 'scene-public-return' })] } },
    { type: 'flow', name: '관계 흐름', category: '관계', description: '선택한 구조에 맞춰 순서·분기 후 합류·중심 연결을 명시합니다.', variants: variants([['sequence', '순서'], ['fork-join', '분기 후 합류 · 네 항목'], ['hub', '중심과 주변']]), fields: [...commonFields(), field('relationLabel', '연결의 의미'), field('items', '관계 항목', 'items')], defaultProps: { ...common('작업의 구조를 먼저 정합니다.', '아래는 실제 운영 관계가 아닌 작성용 과정 예시입니다. 연결 문구를 목적에 맞게 고치세요.', 'EXPLICIT RELATIONSHIP'), relationLabel: '다음 단계', items: [item('start', '질문 정하기', '무엇을 확인할지 정합니다.', { label: '작성용 예시' }), item('observe', '관찰하기', '대상과 사용 맥락을 살펴봅니다.', { label: '작성용 예시' }), item('make', '구체화하기', '관찰한 내용을 작은 시제품으로 표현합니다.', { label: '작성용 예시' }), item('review', '확인하기', '근거와 남은 질문을 기록합니다.', { label: '작성용 예시' })] } },
    { type: 'comparison', name: '비교', category: '근거', description: '대상마다 입력한 라벨·값·설명을 공통 틀에서 비교합니다.', variants: variants([['columns', '대상별 열'], ['table', '비교표']]), fields: [...commonFields(), field('items', '비교 대상', 'items'), field('labelHeading', '라벨 행 제목'), field('valueHeading', '값·조건 행 제목'), field('bodyHeading', '설명 행 제목')], defaultProps: { labelHeading: '구분', valueHeading: '값·조건', bodyHeading: '설명', ...common('같은 질문에서 두 방식을 봅니다.', '조건을 동일하게 정한 뒤 각 대상의 설명과 명시된 값을 입력하세요. 아래는 가상 예시입니다.', 'SHARED CRITERIA'), items: [item('before', '이전 구성', '항목별 설명을 서로 떨어진 위치에서 확인합니다.', { label: '가상 구성 예시', value: '3단계 탐색' }), item('after', '이후 구성', '같은 기준과 맥락에서 항목을 함께 읽습니다.', { label: '가상 구성 예시', value: '2단계 탐색' })] } },
    { type: 'gallery', name: '이미지 묶음', category: '이미지', description: '실제 이미지와 장면별 설명을 함께 나열합니다.', variants: variants([['grid', '이미지 그리드'], ['storyboard', '연속 장면'], ['featured', '대표 장면 강조']]), fields: [...commonFields(), field('caption', '자료 범위 안내', 'textarea'), field('items', '이미지와 캡션', 'items')], defaultProps: { ...common('설명 옆에 실제 장면을 둡니다.', '그림의 비중을 유지하면서 필요한 캡션으로 읽는 맥락을 연결합니다.', 'EXISTING MEDIA'), caption: '이미지는 기존 로컬 자료이며, 새로운 장면·시간·인과를 추가하지 않습니다.', items: [item('space', '공간', 'Forma의 기존 공간 이미지.', { label: '기존 로컬 이미지', image: 'public-space' }), item('paper', '도구', 'Forma의 기존 종이 이미지.', { label: '기존 로컬 이미지', image: 'public-paper' }), item('coast', '리듬', 'Forma의 기존 해안 이미지.', { label: '기존 로컬 이미지', image: 'public-coast' })] } },
    { type: 'quote', name: '인용·핵심 문장', category: '설명', description: '핵심 문장과 그 출처·역할을 구분해 보여줍니다.', variants: variants([['editorial', '짧은 문장 강조'], ['card', '긴 인용 읽기']]), fields: [...commonFields(), field('cite', '출처·문장의 역할')], defaultProps: { ...common('판단의 기준을 남깁니다.', '내용을 다른 스타일로 표현해도, 같은 사실과 관계가 유지되어야 합니다.', 'DESIGN PRINCIPLE'), cite: '이 구성 도구의 작성 원칙 · 실제 인물의 발언 아님' } },
    { type: 'evidence', name: '주장과 근거', category: '근거', description: '설명과 실제 화면·이미지를 대응하고 출처를 남깁니다.', variants: variants([['media', '이미지 근거'], ['document', '문서와 화면']]), fields: [...commonFields(), ...imageFields(), field('cite', '출처·확인 범위', 'textarea')], defaultProps: { ...common('실제 화면에서 확인합니다.', '기존 편집 작업실 화면을 근거로 작업 영역과 정보 위계를 살펴봅니다. 설치 제품을 이 도구에서 변경하거나 조작하지 않습니다.', 'SOURCE AND CLAIM'), image: 'public-workbench', caption: '관리자가 제공한 기존 탬패드 작업실 화면.', cite: '기존 제공 화면 · 실제 세션 동작의 새 검증을 뜻하지 않음' } },
    { type: 'accordion', name: '접기·펼치기', category: '탐색', description: '개요와 질문을 유지하고 필요한 상세를 펼쳐 읽습니다.', variants: variants([['stacked', '수직 질문 목록'], ['columns', '질문 두 열'], ['clues', 'Elio 깊게 읽기 · 근거와 장면']]), fields: [...commonFields(), field('items', '질문과 답', 'items')], defaultProps: { ...common('필요한 설명을 찾아 읽습니다.', '질문을 선택해 내용을 펼칠 수 있습니다. 본문은 실제 HTML에 보존됩니다.', 'READING NOTES'), items: [item('scope', '기존 사이트도 바뀌나요?', '새 문서와 로컬 미리보기에만 적용합니다. 기존 공개 Elio와 ttaem은 변경하지 않습니다.'), item('meaning', '스타일을 바꾸면 관계도 바뀌나요?', '스타일은 표현을 바꾸며, 입력한 내용과 원본 관계는 유지합니다.'), item('source', '이미지는 어디에서 오나요?', '관리자가 제공한 기존 로컬 자료에서 고릅니다. 원격 이미지를 자동 수집하지 않습니다.')] } },
    { type: 'cta', name: '다음 행동', category: '이어가기', description: '다음 페이지나 페이지 안의 행동을 하나의 문장으로 연결합니다.', variants: variants([['banner', '설명과 행동'], ['centered', '중심 행동']]), fields: [...commonFields(), field('actionLabel', '링크 문구'), field('actionHref', '다음 페이지 주소 · 비우면 처음으로')], defaultProps: { ...common('다시 읽으며, 구성을 확인하세요.', '다음 판단으로 이어지는 페이지나 행동을 짧고 구체적으로 안내합니다.', 'CONTINUE'), actionLabel: '페이지 처음으로 돌아가기', actionHref: '' } },
    { type: 'forma-pattern', name: 'Elio 관계 표현', category: '관계 표현', description: 'Elio가 독립적으로 작성한 관계 모델과 표현 엔진을 사용합니다.', variants: variants([['original', '기존 표현의 원본 variant']]), fields: [field('patternId', '원본 표현', 'select', (global.FW_CATALOG && global.FW_CATALOG.patterns || []).map(pattern => ({ id: pattern.id, label: pattern.name }))), field('title', '섹션 제목 · 비우면 원본'), field('body', '도입 설명 · 비우면 원본', 'textarea')], defaultProps: { patternId: 'linear-sequence', title: '', body: '' } }
  ];
  if (global.CVA_SCENES) definitions.push({
    type: 'scene-composition', name: '장면 중심 확장 표현', category: '확장 20개',
    description: '큰 장면·축·공간 배치로 이야기와 관계를 표현하는 편집 가능한 20개 구도입니다.',
    variants: global.CVA_SCENES.variants,
    fields: [...commonFields(), ...imageFields(), field('relationLabel', '배치·연결의 의미'), field('items', '장면·인물·아이템', 'items')],
    defaultProps: clone(global.CVA_SCENES.defaultProps)
  });
  const byType = new Map(definitions.map(definition => [definition.type, definition]));
  const mediaByReference = new Map(media.flatMap(asset => [[asset.id, asset.id], [asset.src, asset.id]]));
  const MAX_STRING = 20000;
  // Original Forma content is a separate, bounded data contract. These are existing
  // toolkit assets, not URLs discovered from a page or browser storage.
  const originalAssets = ["assets/public-arrival.svg", "assets/public-discovery.svg", "assets/public-return.svg", "assets/public-choice.svg", "assets/public-crossing.svg", "assets/public-workbench.svg", "assets/public-space.svg", "assets/public-paper.svg", "assets/public-coast.svg", "assets/catalog-observation-notebook.png", "assets/catalog-moonleaf.png", "assets/coastal-observation-dawn.png", "assets/winter-greenhouse-path.png"];
  const originalAssetSet = new Set(originalAssets);
  const relationKinds = ['sequence', 'merge', 'split', 'choice', 'requires', 'cause', 'association', 'exchange', 'feedback', 'uncertain', 'parallel', 'contains', 'fusion', 'flow'];
  const calculations = ['sum', 'average', 'multiply', 'ratio', 'balance'];
  const originalItemSchema = {
    id: 'id', title: 'text', body: 'text', label: 'text', image: 'asset', alt: 'text', date: 'text', start: 'text', end: 'text',
    group: 'text-or-texts', status: 'text', value: 'scalar', secondary: 'scalar', lower: 'scalar', upper: 'scalar', center: 'scalar',
    x: 'scalar', y: 'scalar', tags: ['text'], parentId: 'text', row: 'text', column: 'text', unit: 'text',
    min: 'number', max: 'number', step: 'number', defaultValue: 'number', criteria: 'observations',
    media: { src: 'asset', alt: 'text' }, action: { target: 'fragment', href: 'fragment', label: 'text' }
  };
  const originalSchemas = {
    groups: [{ id: 'id', title: 'text', label: 'text', body: 'text', parentId: 'text' }],
    edges: [{ from: 'id', to: 'id', kind: 'relation', label: 'text', value: 'number', amount: 'number' }],
    containment: [{ containerId: 'id', memberId: 'id', membershipType: 'membership' }],
    cycles: [{ id: 'id', title: 'text', items: ['id'] }],
    outcome: { title: 'text', body: 'text' }, operation: 'operation', context: { title: 'text', body: 'text' },
    axes: { x: { title: 'text', values: [{ id: 'id', title: 'text' }] }, y: { title: 'text', values: [{ id: 'id', title: 'text' }] } },
    criteria: [{ id: 'id', key: 'text', title: 'text', label: 'text' }],
    observations: [{ subjectId: 'id', criterionId: 'id', value: 'scalar', body: 'text' }],
    subjects: [originalItemSchema], inputs: [originalItemSchema],
    dataset: { rows: ['data-row'], measures: [{ key: 'id', label: 'text', unit: 'text' }], source: 'text' },
    measure: { current: 'number', target: 'number', min: 'number', max: 'number', unit: 'text', basis: 'text' },
    distribution: { variable: 'text', unit: 'text', interval: 'text', sampleCount: 'number' },
    uncertainty: { lower: ['number'], upper: ['number'], definition: 'text' },
    timeDomain: { timezone: 'text', precision: 'text', scaleMode: 'text' },
    model: 'model', statusDefinitions: [{ id: 'id', label: 'text' }],
    columnLabels: ['text'], assumptions: ['text'], sharedConditions: ['text'], order: ['id'],
    condition: 'text', mechanism: 'text', changes: 'text', unit: 'text', target: 'number', baseline: 'number', value: 'number',
    source: 'text', timeBasis: 'text', recurrence: 'text', xLabel: 'text', yLabel: 'text', dataTitle: 'text',
    measureKey: 'text', criterionLabel: 'text', primaryLabel: 'text', secondaryLabel: 'text', comparisonLabel: 'text',
    rowLabel: 'text', currentItemId: 'text', heading: 'text', mode: 'text', progressionBasis: 'text'
  };
  // Capabilities name the fields the existing engine actually reads. This single
  // registry powers generic content editing; it does not replace any engine.
  const originalCapabilities = {
    'ordered-story': 'timeBasis', 'workstream-section': 'groups edges columnLabels', 'decision-path': 'edges condition columnLabels',
    'branching-section': 'edges columnLabels', 'system-section': 'outcome', 'transformation-section': 'outcome operation changes',
    'cycle-section': 'condition outcome groups cycles edges', 'learning-journal': 'outcome progressionBasis', 'containment-section': 'groups containment',
    'relationship-section': 'edges columnLabels', 'causal-section': 'edges mechanism columnLabels',
    'calendar-section': 'groups timeBasis timeDomain recurrence', 'lineage-section': 'edges columnLabels timeBasis timeDomain',
    'taxonomy-section': 'groups axes', 'comparison-section': 'subjects criteria observations sharedConditions source unit criterionLabel primaryLabel secondaryLabel comparisonLabel',
    'evidence-section': 'dataset measure measureKey groups edges unit target baseline value source outcome xLabel yLabel rowLabel dataTitle timeDomain distribution uncertainty',
    'spatial-section': 'outcome', 'status-section': 'measure unit target baseline value source outcome currentItemId statusDefinitions',
    'intro-section': 'outcome', 'feature-section': 'groups outcome', 'image-story': '', 'annotated-figure': '', 'argument-section': '',
    'disclosure-section': 'mode heading', 'scenario-section': 'inputs model operation outcome assumptions unit target baseline source',
    'focus-section': 'groups context'
  };
  let sequence = 0;

  function fail(path, message) { throw new Error(path + ': ' + message); }
  function utf8Bytes(value) {
    let size = 0;
    for (let index = 0; index < value.length; index++) {
      const point = value.codePointAt(index);
      if (point <= 0x7f) size++;
      else if (point <= 0x7ff) size += 2;
      else if (point <= 0xffff) size += 3;
      else { size += 4; index++; }
    }
    return size;
  }
  function record(value, path) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') fail(path, '객체가 필요합니다.');
    const prototype = Object.getPrototypeOf(value);
    if ((prototype && Object.getPrototypeOf(prototype) !== null) || Object.getOwnPropertySymbols(value).length) fail(path, '일반 데이터 객체가 필요합니다.');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    Object.keys(descriptors).forEach(key => {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || descriptors[key].get || descriptors[key].set) fail(path, '허용되지 않은 속성입니다.');
    });
    return value;
  }
  function keys(value, allowed, path) {
    record(value, path);
    Object.keys(value).forEach(key => { if (!allowed.includes(key)) fail(path, '알 수 없는 필드입니다.'); });
  }
  function text(value, path) {
    if (typeof value !== 'string' || value.length > MAX_STRING) fail(path, '20000자 이하의 문자열이 필요합니다.');
    return value;
  }
  function identifier(value, path) {
    if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value) || ['cva-page-top', 'cva-page-end'].includes(value)) fail(path, '영문으로 시작하는 64자 이하의 고유 ID가 필요합니다.');
    return value;
  }
  function image(value, path) {
    if (value === '') return '';
    if (typeof value !== 'string' || !mediaByReference.has(value)) fail(path, '등록된 기존 로컬 이미지가 필요합니다.');
    return mediaByReference.get(value);
  }
  function normalizeItems(value, path, focus = false, experience = false, scene = false, guide = false) {
    if (!Array.isArray(value) || value.length > 24) fail(path, '24개 이하의 항목 목록이 필요합니다.');
    const seen = new Set();
    return value.map((entry, index) => {
      const location = path + '[' + index + ']';
      keys(entry, ['id', 'title', 'body', 'label', 'value', 'image', ...(focus ? ['detail', 'source'] : []), ...(guide ? ['sourceHref','relatedHref'] : []), ...(experience ? ['x','y','z','role'] : []), ...(scene ? ['lane'] : [])], location);
      const id = identifier(entry.id === undefined ? 'item-' + (index + 1) : entry.id, location + '.id');
      if (seen.has(id)) fail(location + '.id', '같은 모듈에서 ID가 중복되었습니다.');
      seen.add(id);
      const result = { id, title: text(entry.title === undefined ? '' : entry.title, location + '.title'), body: text(entry.body === undefined ? '' : entry.body, location + '.body') };
      if (entry.label !== undefined) result.label = text(entry.label, location + '.label');
      if (scene && entry.lane !== undefined) result.lane = text(entry.lane, location + '.lane');
      if (focus) for (const key of ['detail', 'source']) if (entry[key] !== undefined) result[key] = text(entry[key], location + '.' + key);
      if (guide) for (const key of ['sourceHref','relatedHref']) if (entry[key] !== undefined) { result[key] = entry[key] === '' ? '' : global.CVA_COMPONENTS.safeHref(entry[key]); if (key === 'relatedHref' && result[key] && !result[key].startsWith('#')) fail(location+'.'+key,'페이지 안 장면 연결이 필요합니다.'); }
      if (entry.image !== undefined) result.image = image(entry.image, location + '.image');
      if (experience) {
        for (const key of ['x','y','z']) if (entry[key] !== undefined) {
          if (typeof entry[key] !== 'number' || !Number.isFinite(entry[key]) || Math.abs(entry[key]) > 100) fail(location + '.' + key, '범위 -100~100의 유한 좌표가 필요합니다.');
          result[key] = entry[key];
        }
        if (entry.role !== undefined) {
          if (!['input','process','output','storage','support','cover'].includes(entry.role)) fail(location + '.role', '등록된 역할이 필요합니다.');
          result.role = entry.role;
        }
      }
      if (entry.value !== undefined) {
        if (typeof entry.value === 'number') {
          if (!Number.isFinite(entry.value)) fail(location + '.value', '유한한 숫자가 필요합니다.');
          result.value = entry.value;
        } else result.value = text(entry.value, location + '.value');
      }
      return result;
    });
  }
  function originalID(value, path) {
    if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) fail(path, '160자 이하의 비어 있지 않은 ID가 필요합니다.');
    return value;
  }
  function scanOriginal(value, path, budget, depth = 0) {
    if (++budget.nodes > 12000 || depth > 12) fail(path, '원본 콘텐츠의 구조가 너무 큽니다.');
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'string') { text(value, path); return; }
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail(path, '유한한 숫자가 필요합니다.'); return; }
    if (Array.isArray(value)) {
      if (value.length > 400 || Object.getOwnPropertySymbols(value).length) fail(path, '범위 안의 일반 목록이 필요합니다.');
      const prototype = Object.getPrototypeOf(value);
      if (!prototype || !Array.isArray(prototype) || Object.getPrototypeOf(Object.getPrototypeOf(prototype)) !== null) fail(path, '일반 데이터 목록이 필요합니다.');
      const descriptors = Object.getOwnPropertyDescriptors(value);
      Object.keys(descriptors).forEach(key => { if (key !== 'length' && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length || descriptors[key].get || descriptors[key].set)) fail(path, '허용되지 않은 목록 속성입니다.'); });
      for (let i = 0; i < value.length; i += 1) { if (!Object.prototype.hasOwnProperty.call(value, i)) fail(path, '비어 있는 목록 위치가 있습니다.'); scanOriginal(value[i], path + '[' + i + ']', budget, depth + 1); }
      return;
    }
    record(value, path);
    Object.keys(value).forEach(key => scanOriginal(value[key], path + '.' + key, budget, depth + 1));
  }
  function originalValue(value, schema, path, context, depth = 0) {
    if (++context.nodes > 12000 || depth > 12) fail(path, '원본 콘텐츠의 구조가 너무 큽니다.');
    if (Array.isArray(schema)) {
      if (!Array.isArray(value) || value.length > (path.endsWith('.edges') ? 400 : 200)) fail(path, '범위 안의 목록이 필요합니다.');
      return value.map((entry, index) => originalValue(entry, schema[0], path + '[' + index + ']', context, depth + 1));
    }
    if (schema && typeof schema === 'object') {
      keys(value, Object.keys(schema), path);
      const result = {};
      Object.keys(value).forEach(key => { result[key] = originalValue(value[key], schema[key], path + '.' + key, context, depth + 1); });
      return result;
    }
    if (schema === 'text') return text(value, path);
    if (schema === 'id') return originalID(value, path);
    if (schema === 'number') {
      if (value === null) return null;
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, '유한한 숫자 또는 비어 있는 값(null)이 필요합니다.');
      return value;
    }
    if (schema === 'scalar') {
      if (value === null || typeof value === 'boolean') return value;
      return typeof value === 'number' ? originalValue(value, 'number', path, context, depth + 1) : text(value, path);
    }
    if (schema === 'text-or-texts') return originalValue(value, Array.isArray(value) ? ['text'] : 'text', path, context, depth + 1);
    if (schema === 'asset') {
      if (value !== '' && !originalAssetSet.has(value)) fail(path, '원본 46개 로컬 이미지 중 하나가 필요합니다.');
      return value;
    }
    if (schema === 'fragment') {
      if (typeof value !== 'string' || !/^#[A-Za-z0-9_-]{1,160}$/.test(value)) fail(path, '페이지 내부의 안전한 #링크가 필요합니다.');
      return value;
    }
    if (schema === 'relation') { if (!relationKinds.includes(value)) fail(path, '기존 관계 유형이 필요합니다.'); return value; }
    if (schema === 'membership') { if (!['contains', 'part-of', 'member-of'].includes(value)) fail(path, '기존 포함 유형이 필요합니다.'); return value; }
    if (schema === 'operation' || schema === 'model') {
      if (typeof value === 'string') { if (!calculations.includes(value)) fail(path, '기존 계산 방식이 필요합니다.'); return value; }
      const shape = schema === 'model' ? { id: 'text', kind: 'text' } : { title: 'text', body: 'text' };
      const result = originalValue(value, shape, path, context, depth + 1);
      if (schema === 'model' && !calculations.includes(result.kind || result.id)) fail(path, '기존 계산 방식이 필요합니다.');
      return result;
    }
    if (schema === 'observations') {
      keys(value, context.criteria, path);
      return Object.fromEntries(Object.keys(value).map(key => [key, originalValue(value[key], 'scalar', path + '.' + key, context, depth + 1)]));
    }
    if (schema === 'data-row') {
      const rowSchema = { ...originalItemSchema, key: 'text', name: 'text', ...Object.fromEntries(context.measures.map(key => [key, 'scalar'])) };
      return originalValue(value, rowSchema, path, context, depth + 1);
    }
    fail(path, '알 수 없는 원본 데이터 구조입니다.');
  }
  function uniqueRecords(list, path, requireTitle = false) {
    const ids = new Set();
    (list || []).forEach((entry, index) => {
      originalID(entry.id, path + '[' + index + '].id');
      if (ids.has(entry.id)) fail(path, 'ID가 중복되었습니다.');
      ids.add(entry.id);
      if (requireTitle) text(entry.title, path + '[' + index + '].title');
    });
    return ids;
  }
  function checkParents(entries, path) {
    const parents = new Map(entries.filter(entry => entry.parentId).map(entry => [entry.id, entry.parentId]));
    const ids = new Set(entries.map(entry => entry.id));
    for (const [id, parent] of parents) {
      if (!ids.has(parent) || parent === id) fail(path, '상위 항목이 올바르지 않습니다.');
      const seen = new Set([id]); let current = parent;
      while (current) { if (seen.has(current)) fail(path, '포함 계층에 순환이 있습니다.'); seen.add(current); current = parents.get(current); }
    }
  }
  function normalizeSection(value, patternId, path) {
    const pattern = (global.FW_CATALOG && global.FW_CATALOG.patterns || []).find(entry => entry.id === patternId);
    if (!pattern || !(pattern.engine in originalCapabilities)) fail(path, '기존 원본 엔진이 필요합니다.');
    const itemSchema = pattern.engine === 'learning-journal' ? { ...originalItemSchema, attempt: 'text', observation: 'text', learning: 'text', nextChange: 'text' } : originalItemSchema;
    const core = { id: 'id', patternId: 'text', patternName: 'text', engine: 'text', variant: 'text', placement: 'text', theme: 'text', title: 'text', lead: 'text', eyebrow: 'text', navTitle: 'text', note: 'text', items: [itemSchema], order: ['id'] };
    const allowed = originalCapabilities[pattern.engine].split(' ').filter(Boolean);
    const shape = { ...core, ...Object.fromEntries(allowed.map(key => [key, originalSchemas[key]])) };
    scanOriginal(value, path, { nodes: 0 });
    if (value.criteria !== undefined && !Array.isArray(value.criteria)) fail(path + '.criteria', '비교 기준 목록이 필요합니다.');
    if (value.dataset !== undefined) record(value.dataset, path + '.dataset');
    if (value.dataset && value.dataset.measures !== undefined && !Array.isArray(value.dataset.measures)) fail(path + '.dataset.measures', '측정 기준 목록이 필요합니다.');
    const context = { nodes: 0, criteria: (value.criteria || []).map(entry => entry?.id), measures: (value.dataset && value.dataset.measures || []).map(entry => entry?.key) };
    if (context.measures.some(key => ['__proto__', 'constructor', 'prototype'].includes(key) || Object.prototype.hasOwnProperty.call(originalItemSchema, key) && key !== 'value')) fail(path + '.dataset.measures', '측정 키는 기존 필드와 충돌할 수 없습니다.');
    const result = originalValue(value, shape, path, context);
    ['patternId', 'engine', 'variant', 'placement'].forEach(key => { if (result[key] !== pattern[key === 'patternId' ? 'id' : key]) fail(path + '.' + key, '원본 카탈로그의 정체성과 일치해야 합니다.'); });
    originalID(result.id, path + '.id'); text(result.title, path + '.title'); text(result.lead, path + '.lead');
    if (!Array.isArray(result.items)) fail(path + '.items', '원본 항목 목록이 필요합니다.');
    if (result.theme !== undefined && !['forest', 'violet', 'ocean', 'amber'].includes(result.theme)) fail(path + '.theme', '기존 Forma 강조색이 필요합니다.');
    const ids = uniqueRecords(result.items, path + '.items', true);
    result.items.forEach((entry, index) => { if (entry.body !== undefined) text(entry.body, path + '.items[' + index + '].body'); });
    const groupIDs = uniqueRecords(result.groups, path + '.groups', true);
    checkParents(result.items, path + '.items'); checkParents(result.groups || [], path + '.groups');
    (result.edges || []).forEach(edge => { if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) fail(path + '.edges', '연결은 서로 다른 기존 항목을 가리켜야 합니다.'); });
    const memberships = new Set(), parents = [];
    (result.containment || []).forEach(member => {
      const containers = result.variant === 'shared-membership' ? groupIDs : ids;
      if (!containers.has(member.containerId) || !ids.has(member.memberId) || member.containerId === member.memberId) fail(path + '.containment', '기존 범위와 항목이 필요합니다.');
      const pair = JSON.stringify([member.containerId, member.memberId]); if (memberships.has(pair)) fail(path + '.containment', '같은 소속이 중복되었습니다.'); memberships.add(pair);
      if (result.variant !== 'shared-membership') { if (parents.some(entry => entry.id === member.memberId)) fail(path + '.containment', '한 항목의 상위 범위는 하나입니다.'); parents.push({ id: member.memberId, parentId: member.containerId }); }
    });
    if (parents.length) checkParents(result.items.map(entry => ({ id: entry.id, parentId: parents.find(parent => parent.id === entry.id)?.parentId })), path + '.containment');
    uniqueRecords(result.cycles, path + '.cycles', true);
    (result.cycles || []).forEach(cycle => { if (!Array.isArray(cycle.items) || cycle.items.some(id => !ids.has(id)) || new Set(cycle.items).size !== cycle.items.length) fail(path + '.cycles', '순환에 기존 항목을 중복 없이 지정하세요.'); });
    if (result.order && (result.order.some(id => !ids.has(id)) || new Set(result.order).size !== result.order.length)) fail(path + '.order', '순서는 기존 항목의 고유 ID를 사용해야 합니다.');
    uniqueRecords(result.subjects, path + '.subjects', true); uniqueRecords(result.inputs, path + '.inputs');
    const criteriaIDs = uniqueRecords(result.criteria, path + '.criteria');
    const subjectIDs = result.subjects ? new Set(result.subjects.map(entry => entry.id)) : ids;
    (result.observations || []).forEach(entry => { if (!subjectIDs.has(entry.subjectId) || !criteriaIDs.has(entry.criterionId)) fail(path + '.observations', '기존 대상과 비교 기준이 필요합니다.'); });
    for (const dimension of ['x', 'y']) if (result.axes && result.axes[dimension]) {
      const axis = uniqueRecords(result.axes[dimension].values, path + '.axes.' + dimension, true);
      result.items.forEach(entry => { if (entry[dimension] !== undefined && !axis.has(entry[dimension])) fail(path + '.items.' + dimension, '기존 분류 축의 값이 필요합니다.'); });
    }
    if (result.dataset) {
      const measureKeys = new Set();
      (result.dataset.measures || []).forEach((entry, index) => {
        originalID(entry.key, path + '.dataset.measures[' + index + '].key');
        if (measureKeys.has(entry.key)) fail(path + '.dataset.measures', '측정 키가 중복되었습니다.'); measureKeys.add(entry.key);
      });
      const rowIDs = new Set();
      (result.dataset.rows || []).forEach((entry, index) => { const id = entry.id || entry.key || 'data-' + index; if (rowIDs.has(id)) fail(path + '.dataset.rows', '자료 ID가 중복되었습니다.'); rowIDs.add(id); });
      if (result.measureKey && !measureKeys.has(result.measureKey) && result.measureKey !== 'value') fail(path + '.measureKey', '기존 측정 키가 필요합니다.');
    }
    if (JSON.stringify(result).length > 2 * 1024 * 1024) fail(path, '원본 콘텐츠는 2 MB 이하여야 합니다.');
    return result;
  }
  function normalizeExperienceField(name, value, path) {
    if (name === 'model') {
      keys(value, ['kind','unit','capacity','perItem','count','maxCount'], path);
      if (value.kind !== 'capacity') fail(path + '.kind', '등록된 capacity 계산이 필요합니다.');
      const result = { kind:'capacity', unit:text(value.unit, path+'.unit') };
      for (const key of ['capacity','perItem','count','maxCount']) {
        if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1000000) fail(path+'.'+key, '0~1000000의 유한 숫자가 필요합니다.');
        result[key] = value[key];
      }
      if (!Number.isInteger(result.count) || !Number.isInteger(result.maxCount) || result.maxCount < 1 || result.count > result.maxCount || result.capacity <= 0 || result.perItem <= 0) fail(path, '양수 용량·항목당 값과 범위 안의 정수 개수가 필요합니다.');
      return result;
    }
    if (!Array.isArray(value) || value.length > (name === 'edges' ? 72 : 24)) fail(path, '지원 범위 안의 목록이 필요합니다.');
    const seen = new Set();
    return value.map((entry,index) => {
      const at=path+'['+index+']';
      if (name === 'edges') {
        keys(entry,['from','to','label'],at);
        const result={from:identifier(entry.from,at+'.from'),to:identifier(entry.to,at+'.to'),label:text(entry.label||'',at+'.label')};
        const pair=JSON.stringify([result.from,result.to]); if(seen.has(pair))fail(at,'같은 연결이 중복되었습니다.');seen.add(pair);return result;
      }
      keys(entry,['id','title','body','activeIds'],at);
      const id=identifier(entry.id,at+'.id');if(seen.has(id))fail(at,'단계 ID가 중복되었습니다.');seen.add(id);
      if(!Array.isArray(entry.activeIds)||entry.activeIds.length>24||new Set(entry.activeIds).size!==entry.activeIds.length)fail(at+'.activeIds','중복 없는 항목 ID 목록이 필요합니다.');
      return {id,title:text(entry.title,at+'.title'),body:text(entry.body||'',at+'.body'),activeIds:entry.activeIds.map((id,i)=>identifier(id,at+'.activeIds['+i+']'))};
    });
  }
  function normalizeBlock(value, index) {
    const path = 'modules[' + index + ']';
    keys(value, ['id', 'type', 'variant', 'props', 'orientation'], path);
    const id = identifier(value.id, path + '.id');
    const definition = byType.get(value.type);
    if (!definition) fail(path + '.type', '등록된 모듈 종류가 필요합니다.');
    if (!definition.variants.some(variant => variant.id === value.variant)) fail(path + '.variant', '해당 모듈의 등록된 변형이 필요합니다.');
    if (value.orientation !== undefined && !orientations.includes(value.orientation)) fail(path + '.orientation', 'original/vertical/horizontal 중 하나가 필요합니다.');
    const props = value.props === undefined ? {} : value.props;
    keys(props, [...definition.fields.map(entry => entry.key), ...(definition.type === 'forma-pattern' ? ['section'] : [])], path + '.props');
    const normalized = {};
    definition.fields.forEach(entry => {
      const fieldPath = path + '.props.' + entry.key;
      const candidate = props[entry.key] === undefined ? clone(definition.type === 'interface' && entry.key === 'settings' ? global.CVA_ELEMENTS.defaults(normalized.elementId) : definition.defaultProps[entry.key]) : props[entry.key];
      if (entry.kind === 'items') normalized[entry.key] = normalizeItems(candidate, fieldPath, ['focus','experience','accordion'].includes(definition.type), definition.type === 'experience', definition.type === 'scene-composition', definition.type === 'accordion');
      else if (entry.kind === 'json' && definition.type === 'experience') normalized[entry.key] = normalizeExperienceField(entry.key, candidate, fieldPath);
      else if (entry.kind === 'json' && definition.type === 'interface') normalized[entry.key] = global.CVA_ELEMENTS.normalize(normalized.elementId, candidate);
      else if (entry.kind === 'image') normalized[entry.key] = image(candidate, fieldPath);
      else {
        normalized[entry.key] = text(candidate, fieldPath);
        if (entry.key === 'patternId') {
          if (!(global.FW_CATALOG && global.FW_CATALOG.patterns || []).some(pattern => pattern.id === candidate)) fail(fieldPath, '원본 카탈로그에 있는 표현 ID가 필요합니다.');
        } else if (entry.key === 'actionHref' && candidate !== '') {
          normalized[entry.key] = global.CVA_COMPONENTS.safeHref(normalized[entry.key]);
        } else if (entry.kind === 'select' && !entry.options.some(option => option.id === candidate)) fail(fieldPath, '등록된 선택 값이 필요합니다.');
      }
    });
    if (definition.type === 'forma-pattern' && props.section !== undefined) normalized.section = normalizeSection(props.section, normalized.patternId, path + '.props.section');
    if (definition.type === 'experience') {
      const ids = new Set(normalized.items.map(entry => entry.id));
      normalized.edges.forEach(edge => { if (!ids.has(edge.from) || !ids.has(edge.to)) fail(path + '.props.edges', '관계는 기존 항목을 연결해야 합니다.'); });
      normalized.stages.forEach(stage => { if (stage.activeIds.some(id => !ids.has(id))) fail(path + '.props.stages', '단계에 기존 항목을 지정하세요.'); });
      if (value.variant === 'story') normalized.items.forEach(entry => { for (const axis of ['x','y']) if (entry[axis] !== undefined && (entry[axis]<0 || entry[axis]>100)) fail(path + '.props.items', '장면의 위치는 0~100%여야 합니다.'); });
    }
    if (definition.type === 'flow') {
      if (value.variant === 'fork-join' && normalized.items.length !== 4) fail(path + '.props.items', '분기 후 합류는 시작·두 경로·결과의 네 항목이 필요합니다.');
      if (value.variant !== 'fork-join' && normalized.items.length < 2) fail(path + '.props.items', '이 흐름에는 두 항목 이상이 필요합니다.');
    }
    return { id, type: definition.type, variant: value.variant, ...(value.orientation === undefined ? {} : { orientation: value.orientation }), props: normalized };
  }
  function normalizeDocument(value) {
    keys(value, ['schema', 'title', 'description', 'profile', 'modules', 'presentation'], 'document');
    if (value.schema !== 'cva.page.v2') fail('document.schema', 'cva.page.v2 문서가 필요합니다.');
    if (!profiles.includes(value.profile)) fail('document.profile', profiles.join('/') + ' 중 하나가 필요합니다.');
    if (!Array.isArray(value.modules) || value.modules.length > 40) fail('document.modules', '40개 이하의 모듈 목록이 필요합니다.');
    const title = text(value.title, 'document.title');
    const description = text(value.description === undefined ? '' : value.description, 'document.description');
    const modules = value.modules.map(normalizeBlock);
    const ids = new Set();
    modules.forEach(block => { if (ids.has(block.id)) fail('document.modules', '모듈 ID가 중복되었습니다.'); ids.add(block.id); });
    const result = { schema: 'cva.page.v2', title, description, profile: value.profile, modules };
    if (value.presentation !== undefined) {
      keys(value.presentation, ['density', 'measure', 'palette'], 'document.presentation');
      result.presentation = {};
      for (const [key, allowed] of Object.entries({ density: ['comfortable', 'spacious', 'compact'], measure: ['reading', 'wide'], palette: Object.keys(global.CVA_TOKENS?.palettes || {}) })) {
        if (value.presentation[key] === undefined) continue;
        if (!allowed.includes(value.presentation[key])) fail('document.presentation.' + key, '등록된 표현 값을 선택하세요.');
        result.presentation[key] = value.presentation[key];
      }
    }
    if (utf8Bytes(JSON.stringify(result, null, 2) + '\n') > documentByteLimit) {
      fail('document', '페이지 전체 편집 JSON은 UTF-8 기준 2 MiB 이하여야 합니다. 내용을 나누거나 줄여 주세요.');
    }
    return result;
  }
  function create(type, id) {
    const definition = byType.get(type);
    if (!definition) fail('type', '등록된 모듈 종류가 필요합니다.');
    return { id: identifier(id === undefined ? 'cva-' + type + '-' + (++sequence) : id, 'id'), type, variant: definition.variants[0].id, props: clone(definition.defaultProps) };
  }

  function sectionFor(block) {
    const value = normalizeBlock(block, 0);
    if (value.type !== 'forma-pattern') fail('block.type', 'Elio 관계 표현 모듈이 필요합니다.');
    if (!global.FW_CONTENT || !global.FormaWeb) fail('Forma', '원본 콘텐츠와 표현 엔진을 먼저 불러와 주세요.');
    const props = value.props, override = {};
    if (props.title !== '') override.title = props.title;
    if (props.body !== '') override.lead = props.body;
    const section = props.section ? clone(props.section) : global.FW_CONTENT.makeSection(props.patternId);
    return { ...section, ...override };
  }

  function sectionSeed(block, path) {
    const section = sectionFor(block);
    const parts = Array.isArray(path) ? path.slice() : typeof path === 'string' ? path.split('.').filter(Boolean) : [];
    if (!parts.length || parts.some(part => typeof part !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$|^\d+$/.test(part) || ['__proto__', 'constructor', 'prototype'].includes(part))) fail('path', '원본 목록의 안전한 경로가 필요합니다.');
    const at = object => parts.reduce((current, part) => current && Object.prototype.hasOwnProperty.call(current, part) ? current[part] : undefined, object);
    const list = at(section);
    if (!Array.isArray(list)) fail('path', '기존 원본 목록을 선택하세요.');
    if (list.length >= (parts.length === 1 && parts[0] === 'edges' ? 400 : 200)) fail('path', '이 목록에 추가할 수 있는 항목 수를 넘었습니다.');
    const root = parts[0], key = parts.at(-1), newID = prefix => prefix + '-new-' + (++sequence);
    const available = (values, used) => values.find(value => !used.includes(value));
    if (parts.length === 1 && root === 'edges') {
      if (section.items.length < 2) fail('edges', '연결 전에 항목 두 개를 추가하세요.');
      return { from: section.items[0].id, to: section.items[1].id, kind: section.engine === 'evidence-section' ? 'flow' : 'association', label: '', ...(section.engine === 'evidence-section' ? { value: 0 } : {}) };
    }
    if (parts.length === 1 && root === 'containment') {
      const containers = section.variant === 'shared-membership' ? section.groups || [] : section.items;
      for (const container of containers) for (const member of section.items) if (container.id !== member.id && !list.some(entry => entry.containerId === container.id && entry.memberId === member.id) && (section.variant === 'shared-membership' || !list.some(entry => entry.memberId === member.id))) {
        const candidate = { containerId: container.id, memberId: member.id, membershipType: section.variant === 'shared-membership' ? 'member-of' : 'contains' };
        try { normalizeSection({ ...section, containment: [...list, candidate] }, section.patternId, 'section'); return candidate; } catch { /* Try another existing, noncyclic pair. */ }
      }
      fail('containment', '추가할 범위와 독립 항목이 필요합니다. 먼저 항목 또는 범위를 추가하세요.');
    }
    if (parts.length === 1 && root === 'cycles') return { id: newID('cycle'), title: '새 순환', items: [] };
    if (parts.length === 1 && root === 'groups') return { id: newID('group'), title: '새 분류' };
    if (parts.length === 1 && root === 'criteria') return { id: newID('criterion'), key: 'value', label: '비교 값' };
    if (parts.length === 1 && root === 'observations') {
      const subjects = section.subjects || section.items;
      if (!subjects.length || !section.criteria?.length) fail('observations', '비교 대상과 기준을 먼저 추가하세요.');
      return { subjectId: subjects[0].id, criterionId: section.criteria[0].id, value: null };
    }
    if (root === 'cycles' && key === 'items' || parts.length === 1 && root === 'order') {
      const id = available(section.items.map(entry => entry.id), list);
      if (!id) fail('path', '추가할 기존 항목이 없습니다.'); return id;
    }
    if (root === 'dataset' && key === 'measures') return { key: newID('measure'), label: '새 측정값', unit: '' };
    if (root === 'dataset' && key === 'rows') return { id: newID('data'), title: '새 자료', body: '', value: null, ...Object.fromEntries((section.dataset.measures || []).filter(entry => entry.key !== 'value').map(entry => [entry.key, null])) };
    if (root === 'axes' && key === 'values') return { id: newID('axis'), title: '새 분류' };
    if (parts.length === 1 && root === 'statusDefinitions') return { id: newID('status'), label: '새 상태' };
    if (root === 'items' && key === 'tags' || ['columnLabels', 'assumptions', 'sharedConditions'].includes(root)) return '';
    if (root === 'uncertainty' && ['lower', 'upper'].includes(key)) return null;
    const defaults = clone(global.FW_CONTENT.makeSection(section.patternId));
    const seed = at(defaults)?.[0] || list[0] || (parts.length === 1 && root === 'subjects' ? { title: '', body: '', value: 0 } :
      parts.length === 1 && root === 'inputs' ? { title: '', label: '', body: '', value: 0, min: 0, max: 100, step: 1 } : null);
    if (!seed || typeof seed !== 'object' || !['items', 'subjects', 'inputs'].includes(root) || parts.length !== 1) fail('path', '이 목록에 추가할 원본 구조가 없습니다.');
    const result = clone(seed);
    result.id = newID('item'); result.title = '새 항목'; result.body = ''; result.label = '';
    if (root === 'items' && section.engine === 'learning-journal') Object.assign(result, { attempt: '', observation: '', learning: '', nextChange: '' });
    delete result.parentId;
    if (result.group && section.groups?.length && !section.groups.some(group => group.id === result.group)) result.group = section.groups[0].id;
    for (const dimension of ['x', 'y']) if (section.axes?.[dimension]?.values?.length) result[dimension] = section.axes[dimension].values[0].id;
    return result;
  }

  global.CVA_MODULES = { version: '2.2', definitions, media, originalAssets: originalAssets.slice(), orientations: orientations.slice(), documentByteLimit, create, normalizeDocument, sectionFor, sectionSeed };
})(window);
