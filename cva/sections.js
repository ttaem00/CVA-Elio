/* Reusable authored sections. Each recipe expands into the existing flat page model. */
(function (global) {
  'use strict';

  const modules = global.CVA_MODULES;
  if (!modules || !global.CVA_ELEMENTS || !global.CVA_SCENES) throw new Error('CVA 모듈·요소·장면 정의를 먼저 불러와 주세요.');
  const clone = value => JSON.parse(JSON.stringify(value));
  const item = (id, title, body, extra = {}) => ({ id, title, body, ...extra });
  const fiction = 'CVA가 작성한 「유리의 해안」 창작 예시 · 실제 작품·방송·관측 기록이 아닙니다.';
  function block(type, id, variant, props) {
    const value = modules.create(type, id);
    value.variant = variant;
    Object.assign(value.props, props);
    return value;
  }
  function element(id, elementId, settings, title = '') {
    return block('interface', id, title ? 'section' : 'bare', { title, elementId, settings: { ...global.CVA_ELEMENTS.defaults(elementId), ...settings } });
  }
  function scene(id, variant, props) {
    const seed = global.CVA_SCENES.entries.find(entry => entry.variant === variant);
    if (!seed) throw new Error('등록된 장면 구성이 필요합니다: ' + variant);
    return block('scene-composition', id, variant, { ...clone(seed.props), ...props });
  }
  function entry(id, name, description, category, purpose, profile, density, measure, keywords, blocks) {
    return { id, name, description, category, purpose, preferredProfile: profile, density, measure, keywords,
      document: modules.normalizeDocument({ schema: 'cva.page.v2', title: name, description, profile,
        presentation: { density, measure }, modules: blocks }) };
  }

  const entries = [
    entry('chapter-opening', '장·회차의 첫 화면', '큰 장면과 한 문장으로 시작하고, 읽을 범위를 짧게 안내합니다.', 'pages', 'story', 'elio', 'spacious', 'wide', ['표지', 'chapter', 'hero', '회차', 'Elio'], [
      block('hero', 'chapter-cover', 'editorial', { eyebrow: '유리의 해안 / 창작 단편', title: '불빛이 사라진 밤,\n한 통의 편지가 도착했다.', body: '등대지기가 자리를 비운 뒤, 기록자 유안은 해안의 마지막 불빛을 찾아 길을 나선다.', image: 'adaptive-coast', caption: 'CVA 창작 풍경 · 이야기의 해안을 떠올리는 삽화', actionLabel: '이야기의 시작 읽기' }),
      block('text', 'chapter-scope', 'notice', { eyebrow: '읽기 전에', title: '등대에서 온실까지, 세 장면의 기록', body: '편지가 도착한 새벽, 불빛 없는 등대, 눈 속의 온실을 차례로 읽습니다. 그림은 각 장소를 떠올리는 창작 삽화이며 장면을 촬영한 사진은 아닙니다.' })
    ]),
    entry('scene-essay', '장면과 문장의 해설', '사진의 역할과 해설의 역할을 나누고, 한 문장으로 장면의 질문을 남깁니다.', 'text', 'story', 'elio', 'spacious', 'reading', ['에세이', '해설', '인용', '장면', 'split'], [
      block('split', 'essay-scene', 'image-led', { eyebrow: '두 번째 장면 / 창작 해설', title: '등대는 어두웠고,\n편지는 젖지 않았다.', body: '유안은 파도에 젖은 계단에서 마른 편지 한 통을 발견한다. 편지가 놓인 시간은 알 수 없다. 다만 누군가 최근까지 이곳을 다녀갔다는 가능성을 떠올린다.\n\n불빛이 사라졌다는 관찰과 누군가 다녀갔다는 추측은 서로 다른 문장이다. 이 장면은 그 사이의 작은 틈에서 시작된다.', image: 'adaptive-coast', caption: 'CVA 창작 풍경 · 실제 사건이나 실측 위치를 나타내지 않습니다.' }),
      block('quote', 'essay-question', 'editorial', { eyebrow: '장면에 남은 질문', title: '누가 먼저 이곳을 지나갔을까.', body: '그가 찾던 것은 사라진 불빛일까, 아직 돌아오지 않은 사람일까.', cite: '「유리의 해안」을 위해 작성한 창작 문장' })
    ]),
    entry('perspective-compare', '인물의 관점과 같은 사건', '인물을 선택해 경험을 읽고, 같은 사건에서 알고 있는 사실을 비교합니다.', 'relations', 'relations', 'elio', 'comfortable', 'wide', ['인물', '관점', 'perspective', '선택', '비교'], [
      block('focus', 'perspective-selection', 'notes', { eyebrow: '인물 노트 / 창작 예시', title: '같은 불빛을, 다르게 기억합니다.', body: '목록에서 인물을 선택하면 그가 본 장면과 아직 모르는 일을 함께 읽을 수 있습니다.', helpLabel: '관점과 사실의 차이', help: '인물의 기억은 이 창작 이야기 안의 진술입니다. 인물 사이의 차이를 해소하기 위해 새로운 사건을 추가하지 않습니다.', items: [
        item('yuan', '유안 · 해안의 기록자', '새벽에 편지를 발견했고, 등대의 불빛이 꺼진 것을 보았다.', { label: '편지를 발견한 사람', image: 'adaptive-notebook', detail: '유안은 편지가 언제 놓였는지 모른다. 메모에는 본 것과 짐작한 것을 다른 줄에 적었다.', source: 'CVA 창작 입력 · 유안의 기록' }),
        item('keeper', '서하 · 온실의 관리인', '밤에 길을 비추던 빛을 보았지만, 그것이 등대의 빛인지는 확인하지 못했다.', { label: '밤의 빛을 본 사람', image: 'adaptive-greenhouse', detail: '서하는 온실의 문을 열어 두었다. 누군가 도착할 것을 기다렸는지는 아직 말하지 않았다.', source: 'CVA 창작 입력 · 서하의 진술' })
      ] }),
      block('comparison', 'perspective-criteria', 'columns', { eyebrow: '같은 질문', title: '두 사람이 직접 확인한 것은 무엇일까.', body: '기억하는 시간과 알고 있는 범위를 같은 질문으로 나누어 봅니다.', items: [item('yuan-view', '유안의 기록', '편지의 주인과 놓인 시각은 모른다.', { label: '새벽 · 등대 계단', value: '마른 편지를 발견함' }), item('keeper-view', '서하의 진술', '빛의 출처와 움직인 사람은 모른다.', { label: '전날 밤 · 온실', value: '길 위의 빛을 봄' })] })
    ]),
    entry('clue-index', '단서 색인과 짧은 해설', '찾을 이름을 먼저 제시하고, 해설과 확정할 수 없는 부분을 펼쳐 읽습니다.', 'details', 'items', 'forma', 'comfortable', 'reading', ['단서', '용어', 'clues', '색인', '수첩'], [
      block('cards', 'clue-cards', 'list', { eyebrow: '세 가지 단서 / 창작 예시', title: '작은 물건이 다음 장면을 가리킵니다.', body: '모양과 발견 장소는 기록으로, 의미는 해설로 구분합니다.', items: [item('letter', '마른 편지', '등대 계단에서 발견했다. 봉투에는 받는 사람의 이름이 없다.', { label: '발견한 것' }), item('thread', '초록색 실', '온실 손잡이에 짧게 묶여 있다. 유안의 수첩에도 같은 색의 실이 꽂혀 있다.', { label: '대응하는 모양' }), item('lamp', '작은 손전등', '온실 안 선반에 놓여 있다. 밤에 길을 비춘 빛과 같은 물건인지는 알 수 없다.', { label: '아직 남은 질문' })] }),
      element('clue-disclosures', 'disclosure', { variant: 'exclusive', title: '단서가 말하는 것과 말하지 않는 것', items: '편지는 누가 썼나요? | 이 예시에서는 작성자를 정하지 않았습니다. 발견한 사람을 작성자로 바꾸어 읽지 않습니다.\n초록색 실은 같은 물건인가요? | 색이 같다는 기록만 있습니다. 같은 한 가닥이라는 근거는 없습니다.\n빛은 어디에서 왔나요? | 서하가 본 빛과 선반의 손전등은 아직 연결되지 않았습니다.', openFirst: false })
    ]),
    entry('world-overview', '영역과 장소의 안내', '큰 그림에서 장소의 역할을 보고, 거리·좌표와 개념 배치를 구분합니다.', 'space', 'items', 'elio', 'comfortable', 'wide', ['세계', '장소', 'atlas', '공간', '영역'], [
      scene('world-atlas', 'world-atlas', { eyebrow: '유리의 해안 / 창작 장소', title: '길은 세 장소를 잇고, 기록은 그 사이에 남습니다.', body: '장소 이름을 따라가며 각 장면의 역할을 읽습니다. 아래 풍경은 지도나 실제 이동 경로가 아닙니다.', image: 'adaptive-coast', caption: 'CVA 창작 풍경 · 위치와 거리를 표시하지 않는 개념 삽화', relationLabel: '항목의 번호는 읽는 순서이며 위치·거리·동시성을 나타내지 않습니다.', items: [item('coast', '해안길', '유안이 등대로 향하는 길. 바람과 파도 때문에 종이 기록을 오래 펼칠 수 없다.', { label: '출발의 장소' }), item('lighthouse', '불빛 없는 등대', '마른 편지를 발견한 장소. 등대지기가 떠난 이유는 아직 알려지지 않았다.', { label: '질문이 생기는 장소' }), item('greenhouse', '눈 속의 온실', '서하가 밤의 빛을 보았다고 말한 장소. 다음 대화가 이곳에서 시작된다.', { label: '이야기가 이어지는 장소' })] }),
      block('text', 'world-boundary', 'notice', { eyebrow: '공간의 범위', title: '장소의 관계를 읽는 안내입니다.', body: '해안·등대·온실은 이 창작 이야기의 장소입니다. 그림은 각 장소의 분위기를 보여 줍니다. 방향·거리·이동 시간은 이 기록에서 정하지 않았습니다.' })
    ]),
    entry('choice-dossier', '선택 조건과 경로의 검토', '하나의 질문에서 나뉜 두 경로와 돌아온 결과를 명시적으로 비교합니다.', 'relations', 'story', 'elio', 'comfortable', 'wide', ['선택', '갈래', '조건', 'fork', '회고'], [
      block('flow', 'choice-flow', 'fork-join', { eyebrow: '가능한 조사 / 창작 경로', title: '어디에서 편지의 다음 단서를 찾을까.', body: '두 경로는 조사 방법의 대안입니다. 실제 게임의 선택지나 이미 일어난 두 사건을 뜻하지 않습니다.', relationLabel: '같은 편지를 확인하는 조사', items: [item('question', '편지의 출처를 묻는다', '발견 장소와 문장을 먼저 기록한다.', { label: '공통 질문' }), item('coast-path', '해안에서 흔적을 찾는다', '발자국과 물건의 위치를 관찰한다.', { label: '관찰 경로' }), item('keeper-path', '서하의 기억을 듣는다', '기억하는 시간과 직접 본 것을 구분해 묻는다.', { label: '대화 경로' }), item('review', '기록을 나란히 읽는다', '새로 확인한 사실과 남은 질문을 한 수첩에 모은다.', { label: '검토의 합류' })] }),
      block('comparison', 'choice-conditions', 'table', { eyebrow: '경로를 고르는 기준', title: '얻을 수 있는 근거가 다릅니다.', body: '어느 경로도 편지의 작성자를 자동으로 밝혀 주지 않습니다.', labelHeading: '필요한 입력', valueHeading: '확인할 수 있는 것', bodyHeading: '남는 한계', items: [item('observe', '해안 관찰', '흔적이 남긴 사람과 시각은 별도 확인이 필요하다.', { label: '현장에 남은 물건·위치', value: '직접 보이는 상태' }), item('interview', '서하와 대화', '기억과 관찰의 차이를 원자료와 대조해야 한다.', { label: '질문과 인물의 진술', value: '인물이 기억하는 범위' })] })
    ]),
    entry('record-introduction', '기록 모음의 소개', '기록의 성격을 먼저 밝히고, 서로 다른 자료의 읽는 입구를 만듭니다.', 'pages', 'intro', 'ttaem', 'spacious', 'wide', ['소개', '기록', 'bento', 'collection', '블록'], [
      block('hero', 'record-cover', 'split', { eyebrow: '유리의 해안 / 기록 모음', title: '이야기를 읽는 사람을 위한\n작은 기록 보관함.', body: '한 장면을 깊게 읽거나, 인물과 장소에서 시작하거나, 아직 답하지 않은 질문을 찾아보세요.', image: 'adaptive-notebook', caption: 'CVA 창작 정물 · 기록 모음의 표지 삽화', actionLabel: '기록의 갈래 보기' }),
      element('record-grid', 'section-grid', { variant: 'bento', title: '무엇에서 읽기를 시작할까요.', body: '같은 창작 자료를 질문에 맞는 깊이로 읽습니다.', image: 'adaptive-greenhouse', items: '장면의 문장 | 눈에 보이는 관찰과 해석을 나누어 읽습니다.\n인물의 기억 | 같은 사건에서 각자가 알고 있는 범위를 살펴봅니다.\n장소의 역할 | 해안과 등대, 온실이 어떤 질문을 이어 주는지 봅니다.\n남은 단서 | 아직 확정하지 않은 연결을 질문으로 남깁니다.' })
    ]),
    entry('image-inspection', '두 이미지와 비교 기준', '비교의 목적을 먼저 밝히고, 같은 크기의 두 창작 이미지를 직접 살펴봅니다.', 'media', 'intro', 'forma', 'comfortable', 'wide', ['이미지', '비교', 'wipe', '사진', '가림막'], [
      block('text', 'image-premise', 'prose', { eyebrow: '이미지 읽기 / 창작 삽화', title: '빛이 시선을 이끄는 두 가지 방식', body: '해안의 수평선과 온실의 문을 같은 질문으로 봅니다. 가장 밝은 곳은 어디인지, 시선이 어느 방향으로 이어지는지 살펴보세요. 두 그림은 서로 다른 장소이며 같은 장소의 전후 사진이 아닙니다.' }),
      element('image-wipe', 'image-compare', { variant: 'wipe', title: '넓게 열리는 빛, 안으로 모이는 빛', body: '가림막을 움직이거나 키보드 방향키로 비교 비율을 바꾸세요. 아래의 원본 이미지 펼침에서도 두 그림을 나란히 읽을 수 있습니다.', beforeImage: 'adaptive-coast', afterImage: 'adaptive-greenhouse', beforeLabel: '해안 · 수평선으로 퍼지는 빛', afterLabel: '온실 · 문 안으로 모이는 빛', position: 50 })
    ]),
    entry('source-notes', '출처와 해설의 범위', '사용한 자료와 작성한 해설의 경계를 가까이 놓고 필요한 안내를 펼칩니다.', 'details', 'story', 'elio', 'comfortable', 'reading', ['출처', '근거', '범위', 'evidence', 'source'], [
      block('evidence', 'source-evidence', 'document', { eyebrow: '자료와 해설', title: '이 기록은 어디에서 왔나요.', body: '인물·사건·편지의 문장은 CVA가 「유리의 해안」을 위해 작성했습니다. 풍경과 정물은 기존 CVA 창작 이미지입니다. 장면의 관찰, 인물의 진술, 해설이 제기한 질문을 서로 구분해 읽을 수 있습니다.', image: '', caption: '', cite: fiction }),
      block('accordion', 'source-questions', 'stacked', { eyebrow: '기록의 범위', title: '무엇을 알게 되었고, 무엇이 남았을까.', body: '', items: [item('source-fact', '이 이야기에서 드러난 것은 무엇인가요?', '유안은 등대에서 마른 편지를 발견했습니다. 서하는 전날 밤 길 위의 빛을 보았다고 말했습니다. 두 사람은 서로 다른 시간과 장소에서 경험한 일을 기록했습니다.'), item('source-open', '아직 답하지 않은 질문은 무엇인가요?', '편지를 쓴 사람과 그것이 놓인 시각, 서하가 본 빛의 출처는 정하지 않았습니다. 이 기록은 그 질문을 해결한 결말까지 다루지 않습니다.') ] })
    ]),
    entry('reading-route', '읽는 순서와 다시 보기', '단계 목차로 긴 설명을 읽고, 같은 섹션의 시작점으로 돌아옵니다.', 'navigation', 'story', 'elio', 'spacious', 'reading', ['목차', '순서', 'scroll', '읽기', '되돌아가기'], [
      block('text', 'route-heading', 'prose', { eyebrow: '읽는 길', title: '세 번의 질문으로, 장면에 가까워집니다.', body: '아래 단계는 독자의 읽는 순서입니다. 작품 속 시각이나 사건의 인과 순서를 새로 정하지 않습니다.' }),
      element('route-steps', 'scroll-story', { variant: 'steps', title: '무엇을 보았고, 무엇을 더 물을까요.', body: '단계 이름을 선택하거나 본문을 이어 읽으세요.', steps: '관찰에서 시작 | 어두운 등대와 마른 편지를 먼저 기록합니다. 누가 놓았는지는 아직 알 수 없습니다.\n다른 기억과 만나기 | 서하가 본 밤의 빛을 듣습니다. 같은 빛인지 연결하기 전에 인물이 직접 본 범위를 확인합니다.\n다음 질문 남기기 | 편지의 출처와 불빛의 행방을 질문으로 남깁니다. 해석을 확정한 사실과 같은 줄에 놓지 않습니다.' }),
      block('cta', 'route-return', 'banner', { eyebrow: '다시 살펴보기', title: '처음의 질문이 달라졌나요.', body: '읽기 단계의 첫 문장으로 돌아가 처음 보았던 것과 새로 알게 된 것을 비교해 보세요.', actionLabel: '읽는 순서 처음으로', actionHref: '#route-heading' })
    ]),
    entry('scene-gallery', '장면과 캡션의 기록', '그림을 충분한 크기로 보고, 각 장면이 맡는 역할을 짧은 캡션으로 읽습니다.', 'media', 'story', 'elio', 'comfortable', 'wide', ['갤러리', '장면', 'caption', 'storyboard', '이미지'], [
      block('cards', 'gallery-scenes', 'journal', { eyebrow: '세 장의 창작 삽화', title: '남겨진 물건과 기다리는 장소', body: '넓은 해안에서 작은 수첩을 거쳐 온실의 문으로 시선을 옮깁니다. 세 그림은 서로 다른 CVA 창작 자산이며 같은 장소의 연속 촬영은 아닙니다.', items: [item('gallery-coast', '해안의 새벽', '불빛이 보이지 않는 등대에서 질문이 시작됩니다.', { image: 'adaptive-coast', label: '넓은 장면' }), item('gallery-book', '유안의 수첩', '보았던 것과 짐작한 것을 서로 다른 줄에 남깁니다.', { image: 'adaptive-notebook', label: '기록의 도구' }), item('gallery-house', '온실의 문', '서하의 기억과 만나며 다음 대화를 시작합니다.', { image: 'adaptive-greenhouse', label: '이어지는 장소' })] })
    ]),
    entry('reading-finale', '다음 읽기를 남기는 마무리', '해결한 질문과 남은 질문을 구분하고 첫 장면으로 돌아가는 행동을 제시합니다.', 'pages', 'story', 'elio', 'spacious', 'reading', ['마무리', '다음 행동', 'cta', '이어 읽기', '결말'], [
      block('text', 'finale-note', 'notice', { eyebrow: '첫 기록을 덮으며', title: '답을 얻지 못한 질문도,\n다음 장면의 시작이 됩니다.', body: '유안은 편지의 주인을 찾지 못했다. 대신 밤의 빛을 보았다는 사람을 만났다. 해결되지 않은 질문을 지우지 않은 채 다음 기록을 시작한다.' }),
      block('cta', 'finale-next', 'centered', { eyebrow: '다시 읽기', title: '처음의 편지로 돌아가 볼까요.', body: '첫 장면의 관찰과 지금 남은 질문을 함께 읽어 보세요.', actionLabel: '페이지 첫 장면으로 돌아가기', actionHref: '' })
    ]),
    entry('light-and-scene', '빛과 장면의 짧은 쉼', '조용한 조명과 큰 삽화를 연결해 장면의 분위기를 읽고, 인물이 직접 본 범위를 구분합니다.', 'effects', 'story', 'elio', 'spacious', 'wide', ['분위기', 'halo', 'aurora', '이펙트', 'Elio', '조명'], [
      element('light-pause', 'background-effect', { variant: 'halo', title: '불빛의 출처는, 아직 알 수 없습니다.', body: '서하는 밤에 길을 비추던 빛을 보았습니다. 등대의 빛이었는지는 확인하지 못했습니다.', note: '「유리의 해안」 창작 문장 · 조명은 분위기를 위한 장식입니다.', motion: false }),
      block('split', 'light-scene', 'image-led', { eyebrow: '다른 사람이 본 장면', title: '온실의 문은\n열려 있었습니다.', body: '서하는 온실의 문을 열어 두었습니다. 누군가를 기다렸는지는 아직 말하지 않았습니다. 유안이 발견한 편지와 이 기억을 바로 하나의 답으로 잇지는 않습니다.', image: 'adaptive-greenhouse', caption: 'CVA 창작 삽화 · 실제 장면 촬영이나 빛의 출처를 증명하는 자료가 아닙니다.' })
    ]),
    entry('reading-thread', '문장을 따라가는 읽기선', '짧은 핵심 문장에서 시작해 페이지의 자연스러운 흐름으로 세 가지 질문을 이어 읽습니다.', 'scroll', 'story', 'elio', 'spacious', 'reading', ['스크롤', 'tracing', '읽기선', '문서', 'marker', '텍스트'], [
      element('thread-sentence', 'text-emphasis', { variant: 'marker', text: '보았던 것과,\n아직 모르는 것을 나눕니다.', caption: '같은 장면을 다시 읽을 때도 질문의 범위를 유지합니다.' }),
      element('thread-reading', 'scroll-story', { variant: 'tracing', title: '편지에서 밤의 빛까지', body: '본문을 따라 페이지를 내려 읽거나 단계 이름으로 이동하세요. 읽는 위치는 이야기 속 시간이 아닙니다.', steps: '새벽의 계단 | 유안은 등대의 계단에서 마른 편지를 발견했습니다. 누가 언제 놓았는지는 알지 못합니다.\n전날 밤의 길 | 서하는 길을 비추던 빛을 보았습니다. 등대에서 온 빛인지는 확인하지 못했습니다.\n다음에 남길 질문 | 편지의 출처와 밤의 빛을 질문으로 남깁니다. 아직 확인하지 않은 연결을 사실처럼 적지 않습니다.', motion: false })
    ]),
    entry('note-action', '기록 확인과 한 문장 복사', '내 메모의 실제 줄·글자 수를 확인하고, 다음에 살펴볼 질문을 복사합니다.', 'actions', 'intro', 'editor', 'comfortable', 'reading', ['버튼', 'solid', '로더', 'flow', '메모', '복사', 'loader'], [
      element('note-count', 'loading-status', { variant: 'flow', title: '메모의 줄과 글자를 확인합니다.', text: '유안은 마른 편지를 발견했다.\n편지를 놓은 사람과 시각은 모른다.\n불빛의 출처는 다음 기록에서 확인한다.', motion: false }),
      element('note-copy', 'action-button', { variant: 'copy', appearance: 'solid', label: '다음 질문 복사', text: '누가 편지를 놓았으며, 서하가 본 빛은 어디에서 왔을까.' })
    ])
  ];

  entries.push(
    entry('reading-index', '기록의 갈래와 곁에 두는 안내', '기록의 이름으로 본문을 골라 읽고, 같은 창에서 자료의 범위를 곁에 둡니다.', 'navigation', 'story', 'elio', 'comfortable', 'reading', ['탐색', 'overflow', '탭', 'nonmodal', '자료', '읽기'], [
      element('index-records', 'controlled-tabs', { variant: 'overflow', title: '어떤 기록에서 읽기를 시작할까요.', items: '마른 편지가 놓인 새벽 | 유안은 등대 계단에서 마른 편지 한 통을 발견했습니다. 누가 언제 놓았는지는 알지 못합니다.\n서하가 기억하는 전날 밤 | 서하는 길을 비추던 빛을 보았다고 말했습니다. 등대에서 나온 빛인지는 확인하지 못했습니다.\n서로 잇지 않은 두 기록 | 편지의 발견과 밤의 빛은 서로 다른 시간과 장소의 기록입니다. 둘을 연결할 근거는 아직 없습니다.\n다음에 확인할 편지의 출처 | 받는 사람의 이름이 없는 편지입니다. 발견한 사람을 작성자로 바꾸어 읽지 않습니다.', selected: 1 }),
      element('index-scope', 'overlay', { variant: 'nonmodal', title: '곁에 두고 읽는 자료 안내', body: '이 기록은 CVA가 작성한 「유리의 해안」 창작 예시입니다.\n유안이 직접 본 것과 서하가 기억하는 진술을 구분합니다. 편지 작성자와 밤의 빛의 출처는 아직 정하지 않았습니다.\n이 안내를 열어 둔 채 바깥의 기록을 계속 읽을 수 있습니다.', trigger: '자료 안내 곁에 두기', closeLabel: '안내 닫기' })
    ]),
    entry('note-and-detail', '내 메모와 자료의 범위', '내 문장을 이 페이지에서 확인하고, 편집한 메모와 별개의 고정 자료 안내를 읽습니다.', 'forms', 'intro', 'editor', 'comfortable', 'reading', ['메모', 'note', '폼', 'confirm', '확인', '자료'], [
      element('note-entry', 'form-group', { variant: 'note', title: '직접 확인한 문장을 남깁니다.', description: '메모를 고친 뒤 입력 확인으로 내용을 읽어 보세요. 이 페이지에서만 확인하며 자동으로 보관하거나 전송하지 않습니다.', fieldLabel: '내가 직접 확인한 문장', text: '유안은 등대 계단에서 마른 편지를 발견했다.\n편지를 놓은 사람과 시각은 아직 모른다.', required: true, buttonLabel: '내 메모 확인' }),
      element('note-source-scope', 'overlay', { variant: 'confirm', title: '이 창작 기록의 범위', body: '이 안내는 CVA가 작성한 「유리의 해안」 창작 예시입니다.\n유안의 편지 발견과 서하가 빛을 보았다는 진술을 다룹니다. 편지 작성자와 빛의 출처는 정하지 않았습니다.\n확인 버튼은 이 고정 자료 안내를 읽었다는 뜻입니다. 앞에서 편집한 메모를 저장하거나 확정하지 않습니다.', trigger: '자료 안내 확인', closeLabel: '나중에 읽기', confirmLabel: '자료 범위를 읽었습니다' })
    ]),
    entry('reading-budget', '다음에 읽을 기록과 분량', '다시 살펴볼 기록 하나와 문장 수를 각각 골라 확인합니다. 다른 기록이나 화면을 자동으로 바꾸지 않습니다.', 'forms', 'intro', 'editor', 'comfortable', 'reading', ['select', 'number', '선택', '슬라이더', '문장', '계획'], [
      element('budget-source', 'form-group', { variant: 'select', title: '다시 읽을 기록 하나를 고릅니다.', description: '선택한 이름을 이곳에서 확인합니다. 기록을 자동으로 열거나 읽기 순서를 바꾸지는 않습니다.', fieldLabel: '다음에 다시 읽을 기록', options: '편지의 발견 장소\n서하가 기억하는 밤의 빛\n초록색 실이 남긴 질문', required: true, buttonLabel: '읽을 기록 확인' }),
      element('budget-sentences', 'range', { variant: 'number', label: '이번에 읽어 볼 문장 수', min: 1, max: 8, value: 3, step: 1, unit: '문장' })
    ])
  );

  entries.push(
    entry('media-contact-sheet', '장면을 직접 고르는 자료판', '이름과 작은 이미지로 장면에 바로 접근하고, 같은 갤러리에서 장면과 설명을 함께 읽습니다.', 'sliders', 'story', 'elio', 'comfortable', 'wide', ['캐러셀', '썸네일', '장면', 'thumbnails'], [
      element('contact-scenes', 'carousel', { variant: 'thumbnails', title: '해안에서 온실까지, 먼저 보고 싶은 장면', items: '등대 아래 | 유안은 마른 편지를 발견합니다. 놓인 위치와 편지의 작성자는 서로 다른 질문입니다.\n온실의 문 | 서하는 전날 밤 빛을 보았다고 말합니다. 빛의 출처는 아직 모릅니다.\n열린 수첩 | 보았던 것과 들었던 말을 다른 문장에 남깁니다.', image1: 'adaptive-coast', image2: 'adaptive-greenhouse', image3: 'adaptive-notebook', smooth: false }),
      block('text', 'contact-scope', 'notice', { eyebrow: '자료를 고르는 기준', title: '이미지를 바꿔도 사건은 바뀌지 않습니다.', body: '이 자료판은 CVA 창작 삽화를 직접 고르는 갤러리입니다. 장면 선택은 읽는 위치만 바꾸며, 다른 모듈의 입력이나 원래 Elio의 사건·관계를 수정하지 않습니다.' })
    ]),
    entry('same-question-comparison', '두 자료를 같은 질문으로 비교', '전체 이미지를 번갈아 보고 합성 비중을 조절한 뒤, 수치 차이는 원자료와 따로 확인합니다.', 'data', 'intro', 'forma', 'comfortable', 'wide', ['비교', 'delta', 'toggle', 'blend', '원자료'], [
      element('comparison-whole', 'image-compare', { variant: 'toggle', title: '두 장소의 빛을 번갈아 읽습니다.', body: '해안과 온실은 서로 다른 창작 이미지입니다. 같은 장소의 변화 전후를 뜻하지 않습니다.', beforeImage: 'adaptive-coast', afterImage: 'adaptive-greenhouse', beforeLabel: '해안 · 밖으로 열린 빛', afterLabel: '온실 · 안으로 모인 빛', position: 50 }),
      element('comparison-blend', 'image-compare', { variant: 'blend', title: '겹쳐 보며 구도의 차이를 찾습니다.', body: '두 그림의 위치는 정합된 측정 자료가 아닙니다. 겹침은 시선을 비교하기 위한 보기입니다.', beforeImage: 'adaptive-coast', afterImage: 'adaptive-greenhouse', beforeLabel: '해안 삽화', afterLabel: '온실 삽화', position: 50 }),
      element('comparison-delta', 'data-inspector', { variant: 'delta', title: '두 번 읽고 남긴 질문의 차이', body: '아래 수치는 설명을 위한 창작 예시입니다. 그림에서 자동으로 계산한 결과가 아닙니다. 차이는 두 번째 기록에서 첫 기록을 뺀 값입니다.', data: '장소 | 8 | 5\n인물 | 2 | 6\n편지 | 0 | 0\n불빛 | 3 | ', firstName: '첫 기록', secondName: '다음 기록', unit: '개', citation: fiction })
    ]),
    entry('grouped-records', '소속과 기준으로 읽는 기록', '소속별 자료의 위치를 읽고, 계열 정렬과 직접 바꿀 수 있는 기준값으로 수치를 살펴봅니다.', 'data', 'items', 'forma', 'comfortable', 'wide', ['그룹', '그리드', '정렬', '기준', 'ranked', 'threshold'], [
      element('grouped-index', 'section-grid', { variant: 'grouped', title: '장소·진술·질문을 구분해 둡니다.', body: '카드의 소속은 자료의 종류입니다. 같은 묶음에 있다는 사실이 사건의 인과관계를 뜻하지 않습니다.', items: '해안의 등대 | 편지가 발견된 곳과 불빛이 보인 방향을 읽습니다.\n온실의 문 | 서하의 진술이 시작되는 장소입니다.\n유안의 메모 | 직접 본 사실과 아직 모르는 것을 나누어 적었습니다.\n서하의 진술 | 빛을 보았다는 기억이며 출처는 확정하지 않았습니다.\n편지의 작성자 | 이름을 확인할 근거가 아직 없습니다.\n밤의 불빛 | 누가 켰는지 다음 기록에서 살펴볼 질문입니다.', groups: '장소\n장소\n진술\n진술\n남은 질문\n남은 질문', image: 'adaptive-coast' }),
      element('grouped-rank', 'data-inspector', { variant: 'ranked', title: '어떤 기록부터 다시 볼까요?', body: '계열과 정렬 순서를 직접 고릅니다. 원자료의 순서는 아래 표에서 유지합니다.', data: '장소 | 8 | 5\n인물 | 2 | 6\n편지 | 0 | 0\n불빛 | 3 | ', firstName: '첫 기록', secondName: '다음 기록', unit: '개', citation: fiction }),
      element('grouped-threshold', 'data-inspector', { variant: 'threshold', title: '내 기준으로 수치를 나누어 봅니다.', body: '기준은 읽기를 돕는 선택값입니다. 조사 완료나 자료의 중요도를 판정하지 않습니다.', data: '장소 | 8 | 5\n인물 | 2 | 6\n편지 | 0 | 0\n불빛 | 3 | ', firstName: '첫 기록', secondName: '다음 기록', unit: '개', threshold: 3, citation: fiction })
    ]),
    entry('scene-surface-lab', '자료의 층을 살펴보는 실험', '원자료·맥락·해설의 층을 선택해 설명을 읽고, 실제 링크로 같은 자료의 범위에 돌아옵니다.', 'labs', 'story', 'elio', 'comfortable', 'wide', ['3d', 'Lab', '포인터', '깊이', 'inspect', '층'], [
      element('lab-layer', 'depth-surface', { variant: 'inspect', title: '한 자료의 세 가지 역할', body: '입체 배치는 개념을 구분하기 위한 표현입니다. 실제 공간의 거리나 사건의 시간축을 나타내지 않습니다.', image: 'adaptive-greenhouse', detail: '어느 층을 선택해도 같은 자료의 제목과 설명은 유지됩니다.', layers: '원자료 | 유안이 발견한 편지와 서하가 남긴 진술은 서로 다른 기록입니다.\n맥락 | 두 기록은 같은 밤을 말하지만 빛의 출처를 확정하지는 않습니다.\n해설 | 이 페이지는 관찰과 추론을 구분해 읽는 방법을 제안합니다.' }),
      element('lab-return', 'pointer-affordance', { variant: 'link', title: '장식에서, 읽을 자료로 돌아갑니다.', body: '포인터 반응은 선택 사항입니다. 아래 링크는 키보드나 터치로도 같은 층 설명에 이동합니다.', actionLabel: '자료의 세 층 다시 읽기', url: '#lab-layer' })
    ])
  );

  entries.push(
    entry('searchable-reading-shelf', '찾아 읽는 자료 서가', '자료의 제목·설명을 검색하고, 질문별 답을 따로 펼쳐 읽습니다.', 'layout', 'items', 'elio', 'comfortable', 'wide', ['검색', '서가', '목록', 'FAQ', 'search', 'filter'], [
      element('shelf-find', 'section-grid', { variant: 'searchable', title: '어떤 기록을 찾고 있나요?', body: '장소나 인물의 이름으로 필요한 자료를 좁혀 보세요.', items: '해안의 등대 | 유안이 마른 편지를 발견한 계단의 기록입니다.\n온실의 문 | 서하가 전날 밤을 떠올리며 남긴 진술입니다.\n유안의 메모 | 직접 본 것과 아직 모르는 일을 나누어 적었습니다.\n서하의 진술 | 밤에 빛을 보았다는 기억을 읽습니다.\n편지의 작성자 | 이름을 확인할 단서는 아직 없습니다.\n밤의 불빛 | 어디에서 온 빛인지 다음 기록에서 살펴봅니다.', image: 'adaptive-coast' }, '자료의 서가'),
      element('shelf-questions', 'disclosure', { variant: 'search', title: '읽다가 궁금해진 것', items: '편지는 어디에서 발견했나요? | 유안이 새벽의 등대 계단에서 발견했습니다. 언제 놓였는지는 모릅니다.\n온실의 빛은 등대에서 왔나요? | 서하는 빛을 보았다고 말했습니다. 출처를 확인한 기록은 없습니다.\n메모와 진술은 무엇이 다른가요? | 메모는 유안의 기록이고 진술은 서하의 기억입니다. 서로 다른 자료로 읽습니다.\n다음에 무엇을 살펴보면 되나요? | 편지의 작성자와 빛의 출처를 각각의 질문으로 남겨 보세요.', openFirst: false })
    ]),
    entry('illustrated-reading', '그림과 문장을 자세히 읽기', '큰 그림의 전체 구도를 살펴보고, 원문에서 찾은 단어를 강조합니다.', 'details', 'story', 'elio', 'comfortable', 'wide', ['상세', '이미지', '원문', '본문 검색', 'dialog', 'highlight'], [
      element('source-picture', 'overlay', { variant: 'media', title: '밤의 온실', body: '눈 덮인 길 끝, 창문 너머로 불빛이 남아 있습니다. 그림의 전체 구도를 살펴보세요.', trigger: '온실 그림 크게 보기', closeLabel: '원래 읽던 곳으로', image: 'adaptive-greenhouse', caption: '「유리의 해안」을 위한 CVA 창작 삽화' }, '그림과 문장'),
      element('source-passage', 'text-emphasis', { variant: 'search', text: '유안은 등대의 계단에서 마른 편지를 발견했다.\n서하는 온실의 창가에서 전날 밤의 빛을 떠올렸다.\n두 사람의 기록에는 아직 편지의 작성자가 없다.\n유안은 편지의 이름을, 서하는 빛의 출처를 다음 질문으로 남겼다.', caption: '「유리의 해안」 창작 단편 · 원문을 유지하며 찾은 말만 강조합니다.' })
    ]),
    entry('reading-takeaway', '읽기 확인과 발췌 가져가기', '검토할 원문의 줄을 확인하고, 별도로 작성한 발췌를 텍스트 파일로 가져갑니다.', 'actions', 'intro', 'forma', 'comfortable', 'reading', ['발췌', '내려받기', '로더', '처리 상태', 'download', 'text'], [
      element('takeaway-check', 'loading-status', { variant: 'ledger', title: '검토할 원문', text: '새벽의 등대 계단에는 마른 편지가 놓여 있었다.\n유안은 편지를 발견한 장소를 메모했다.\n서하는 전날 밤에 보았던 빛을 떠올렸다.\n두 기록은 서로 다른 질문을 남겼다.', motion: false }, '읽고 남기는 노트'),
      element('takeaway-file', 'action-button', { variant: 'download', appearance: 'solid', downloadLabel: '발췌를 텍스트로 가져가기', text: '유리의 해안 · 읽기 발췌\n\n관찰: 유안은 새벽의 등대 계단에서 마른 편지를 발견했다.\n진술: 서하는 전날 밤에 빛을 보았다고 말했다.\n남은 질문: 편지의 작성자와 빛의 출처는 아직 확인하지 못했다.', filename: '유리의해안-읽기발췌.txt' })
    ])
  );

  entries.push(
    entry('filtered-source-shelf', '조건으로 찾는 자료 서가', '검색어와 분류를 함께 적용하고 현재 조건을 해제해 전체 자료로 돌아옵니다. 그림 상세는 별도 고정 자료입니다.', 'layout', 'items', 'elio', 'comfortable', 'wide', ['검색', '분류', '필터', '조건', '서가', 'filter', 'collection'], [
      element('source-shelf', 'section-grid', { variant: 'filtered', title: '지금 필요한 기록부터.', body: '이름이나 내용을 찾고, 자료의 종류를 함께 골라 보세요. 조건을 풀면 처음 순서로 돌아옵니다.', items: '등대의 편지 | 유안이 등대 계단에서 발견한 마른 편지입니다. 작성자와 놓인 시각은 모릅니다.\n온실의 불빛 | 서하가 전날 밤에 빛을 보았다고 남긴 진술입니다. 빛의 출처는 확인되지 않았습니다.\n유안의 관찰 | 편지가 놓인 위치와 종이의 상태를 직접 확인한 메모입니다.\n서하의 기억 | 온실 창가에서 떠올린 기억입니다. 관찰 기록과 구분해 읽습니다.\n편지의 작성자 | 누가 편지를 놓았는지는 다음에 확인할 질문입니다.\n밤의 빛은 어디에서 | 빛의 방향과 출처를 확인할 자료가 더 필요합니다.', groups: '원자료\n진술\n관찰\n진술\n남은 질문\n남은 질문', image: 'adaptive-coast' }, '자료 서가'),
      element('shelf-picture', 'overlay', { variant: 'media', title: '기록의 배경, 밤의 온실', body: '검색 목록과 별도로 준비한 창작 삽화입니다. 서하의 진술이 사실인지 증명하는 사진은 아닙니다.', trigger: '온실 삽화 크게 보기', closeLabel: '자료 서가로 돌아가기', image: 'adaptive-greenhouse', caption: '「유리의 해안」 CVA 창작 삽화 · 검색 조건과 관계없이 같은 그림입니다.' })
    ]),
    entry('criteria-notebook', '기준을 남기는 비교 수첩', '비교할 기준을 직접 적고, 같은 단위의 두 초안과 차이를 원자료까지 확인합니다. 메모와 수치는 각각 편집합니다.', 'data', 'intro', 'forma', 'comfortable', 'wide', ['비교', '기준', '메모', '차이', '원자료', 'compare', 'delta'], [
      element('comparison-criteria', 'form-group', { variant: 'note', title: '무엇을 기준으로 읽을까요?', description: '내가 확인할 기준을 한 문장으로 적어 보세요. 입력 확인은 이 페이지의 메모만 바꾸며 아래 수치에 점수를 매기거나 저장하지 않습니다.', fieldLabel: '내 비교 기준', text: '같은 자료에서 관찰·진술·질문을 구분했는가?\n미기록은 0으로 바꾸지 않았는가?', buttonLabel: '내 기준 확인' }, '비교 수첩'),
      element('comparison-records', 'data-inspector', { variant: 'compare', title: '두 초안에서 남긴 질문 수', body: '별도로 작성한 모의 검토 기록입니다. 검색 결과나 위 메모에서 계산한 값이 아닙니다. 두 초안을 같은 단위로 읽습니다.', data: '등대의 편지 | 2 | 4\n온실의 불빛 | 3 | 3\n유안의 관찰 | 0 | 2\n서하의 기억 | 1 | ', firstName: '첫 초안', secondName: '검토 초안', unit: '개', citation: 'CVA 창작 수치 · 동일 자료 4종의 모의 기록. 빈 값은 아직 기록하지 않았다는 뜻입니다.' }),
      element('comparison-difference', 'data-inspector', { variant: 'delta', title: '어느 질문이 늘었을까요?', body: '위와 같은 모의 원자료를 별도 입력으로 다시 읽습니다. 두 값을 모두 적은 자료만 차이를 계산합니다.', data: '등대의 편지 | 2 | 4\n온실의 불빛 | 3 | 3\n유안의 관찰 | 0 | 2\n서하의 기억 | 1 | ', firstName: '첫 초안', secondName: '검토 초안', unit: '개', citation: 'CVA 창작 수치 · 검토 초안 − 첫 초안. 두 표는 각각 편집하므로 같은 자료인지 확인하세요.' })
    ])
  );

  entries.push(
    entry('typography-study', '문장을 조절하는 활자 연구', '같은 문장의 크기·굵기·기울임을 직접 시험하고, 표제와 본문의 읽는 리듬을 비교합니다.', 'text', 'intro', 'editor', 'spacious', 'reading', ['활자', '서체', '문장', '크기', '굵기', 'specimen', 'type-scale', 'typography'], [
      element('type-specimen', 'text-emphasis', { variant: 'specimen', text: '불빛을 따라,\n문장을 읽습니다.', caption: 'CVA 창작 문장 · 실제 사용 중인 프로필의 글꼴로 시험합니다.', fontSize: 48, fontWeight: 400, italic: false }, '한 문장을 직접 조절하기'),
      element('type-hierarchy', 'text-emphasis', { variant: 'type-scale', text: '불빛을 따라, 문장을 읽습니다.', caption: '같은 문장을 표제·중간 제목·본문의 역할로 읽습니다. 글자의 실측 높이나 폰트 성능을 비교하는 도표는 아닙니다.' })
    ]),
    entry('parallel-reading-desk', '질문과 본문을 나란히 읽기', '한쪽에 질문을 남겨 두고 관찰·진술·해석을 페이지의 흐름에서 이어 읽습니다.', 'scroll', 'story', 'elio', 'spacious', 'wide', ['질문', '긴 글', '나란히', '고정', 'diptych', 'sticky', 'scroll'], [
      element('parallel-source', 'scroll-story', { variant: 'diptych', title: '편지는 왜 젖지 않았을까.', body: '관찰한 사실과 아직 확인하지 못한 해석을 나누어 읽습니다. 이 질문은 옆에 남고 본문은 페이지에서 이어집니다.', steps: '발견한 것 | 유안은 새벽의 등대 계단에서 마른 편지 한 통을 발견했다. 파도에 젖은 계단과 종이의 상태는 직접 살펴본 관찰이다. 편지의 작성자와 놓인 시각까지 확인한 것은 아니다.\n들은 이야기 | 서하는 전날 밤 길 위에서 빛을 보았다고 말했다. 그 빛이 등대에서 나왔는지, 다른 사람이 들고 있었는지는 아직 모른다. 서하가 기억하는 빛과 유안이 발견한 편지는 별개의 기록이다.\n떠올린 해석 | 두 사람은 누군가 최근까지 이 길을 다녀갔을 가능성을 떠올린다. 그러나 가능성은 새로운 사건이 아니다. 해석을 문장으로 남길 때에는 어디까지가 관찰이고 어디부터가 짐작인지 함께 적는다.\n남겨 둔 질문 | 편지를 놓은 사람과 빛의 출처를 찾으려면 다른 원자료가 더 필요하다. 지금 읽은 문장을 유지하면서 다음에 확인할 자료를 고른다. 답을 정하지 않았다는 사실도 이 기록의 일부다.' }),
      block('quote', 'parallel-question', 'card', { eyebrow: '읽은 뒤 남은 질문', title: '아직 모르는 것은, 모른 채 남깁니다.', body: '편지가 마른 이유는 아직 알 수 없다.\n그 사실을 지키면, 다음에 무엇을 확인해야 하는지도 선명해진다.', cite: fiction })
    ]),
    entry('paired-observations', '두 기록을 같은 눈금에서 읽기', '두 관측값과 0·미기록을 한 축에서 읽고, 별도의 범위 선택을 직접 시험합니다.', 'data', 'intro', 'forma', 'comfortable', 'wide', ['두 기록', '공통 축', '음수', '미기록', 'dot-plot', 'interval', '범위'], [
      element('paired-records', 'data-inspector', { variant: 'dot-plot', title: '같은 기준선에서 적은 두 기록', body: 'CVA가 작성한 모의 눈금입니다. 같은 축의 두 점을 비교하며, 점이 없는 쪽은 미기록으로 읽습니다.', data: '해안 쪽 표식 | -2 | 1\n온실 쪽 표식 | 0 | 0\n통로의 표식 | 3 | ', firstName: '첫 기록', secondName: '다음 기록', unit: '눈금', citation: 'CVA 연습 자료 · 실측이 아닙니다. 두 점을 잇는 선은 두 기록의 차이이며 경로·오차 범위가 아닙니다.' }),
      element('paired-range', 'range', { variant: 'interval', label: '다시 살펴볼 눈금의 범위 · 위 표와 독립된 선택', min: -5, max: 5, value: -2, upperValue: 3, step: 1, unit: '눈금' })
    ]),
    entry('depth-scene-shelf', '직접 넘기는 입체 장면 서가', '그림·본문을 한 장씩 직접 넘기고, 아래에서 열리는 안내로 이 창작 자료의 범위를 읽습니다.', 'sliders', 'story', 'elio', 'comfortable', 'wide', ['입체', '장면', '갤러리', '상세', 'depth', 'sheet', 'carousel'], [
      element('depth-scenes', 'carousel', { variant: 'depth', title: '해안에서 온실까지, 직접 넘겨 읽기', items: '등대 아래 | 마른 편지가 놓인 계단입니다. 이 삽화는 편지의 작성자나 놓인 시각을 증명하지 않습니다.\n온실의 문 | 서하가 빛을 기억하는 장소입니다. 그림은 이 창작 이야기의 배경을 떠올리는 자료입니다.\n열린 수첩 | 관찰한 것과 들은 말을 다른 문장으로 남깁니다. 장면을 넘겨도 원래 내용과 순서는 유지됩니다.', image1: 'adaptive-coast', image2: 'adaptive-greenhouse', image3: 'adaptive-notebook', smooth: false }),
      element('depth-scope', 'overlay', { variant: 'sheet', title: '그림과 기록의 범위', body: '이 서가는 CVA가 작성한 「유리의 해안」 창작 예시입니다.\n\n세 그림은 장소를 떠올리는 삽화이며 실제 사건·방송·관측을 촬영한 사진이 아닙니다.\n\n이 안내는 선택한 장면에 따라 바뀌는 상세가 아니라 서가 전체에 대한 고정 안내입니다. 원문의 내용·순서·출처는 각 장면과 함께 남아 있습니다.', trigger: '삽화와 기록의 범위 읽기', closeLabel: '장면 서가로 돌아가기' })
    ])
  );

  entries.push(
    entry('reading-gateway', '이야기로 들어가는 읽기 입구', '자료실과 현재 글의 위치를 읽고, 장면의 소개에서 본문으로 이동합니다.', 'navigation', 'story', 'elio', 'spacious', 'wide', ['breadcrumb', 'navigation', '경로', '현재 위치', '읽기 입구', 'Elio'], [
      element('gateway-route', 'route-navigation', { variant: 'breadcrumb', title: '이 글의 위치', items: '자료실 | library.html\n유리의 해안 | #gateway-cover', current: 2 }),
      block('hero', 'gateway-cover', 'editorial', { eyebrow: '유리의 해안 / 창작 단편', title: '편지가 남긴 자리에서,\n이야기를 읽습니다.', body: '유안은 등대의 계단에서 마른 편지를 발견했다. 서하는 전날 보았던 빛을 떠올렸다. 서로 다른 두 기록에서 같은 질문을 찾아봅니다.', image: 'adaptive-coast', caption: fiction, actionLabel: '다음 기록 읽기' })
    ]),
    entry('inline-note-desk', '한 단어를 남기는 읽기 노트', '짧은 입력을 이 페이지에서 확인하고, 별도의 원문 한 줄을 복사합니다. 입력과 고정 발췌는 독립된 내용입니다.', 'forms', 'story', 'elio', 'comfortable', 'reading', ['inline', 'form', '한 줄', '짧은 입력', '읽기 노트', 'Enter', '복사'], [
      element('inline-note', 'form-group', { variant: 'inline', title: '다시 읽고 싶은 단어', description: '떠오른 단어나 짧은 문장을 적고 확인하세요. 이 입력은 지금 열린 페이지에서만 확인합니다.', fieldLabel: '내가 고른 단어 또는 짧은 문장', text: '', required: true, buttonLabel: '적은 문장 확인' }),
      element('inline-source-copy', 'action-button', { variant: 'copy', appearance: 'outline', label: '원문 한 줄 복사', text: '편지가 마른 이유는 아직 알 수 없다.' }, '곁에 두는 원문'),
      element('inline-note-help', 'disclosure', { title: '메모와 원문을 보관하려면', items: '입력한 메모는 어디에 남나요? | 위 입력 확인은 현재 페이지의 임시 결과입니다. 다시 열어도 남길 문장은 제작실에서 기본 내용으로 편집하고 JSON과 독립 HTML로 보관하세요.\n복사 버튼은 무엇을 가져오나요? | 바로 위에 표시된 고정 원문 한 줄을 복사합니다. 입력 칸의 임시 메모를 가져오는 버튼은 아닙니다.' })
    ])
  );

  entries.push(
    entry('color-story-opening', '한 문장으로 여는 색의 장면', '큰 문장의 색면 포스터와 정적 등고선 안내를 조합합니다. 그림이나 움직임 없이도 문장과 다음 읽을 범위가 먼저 보입니다.', 'text', 'story', 'ttaem', 'spacious', 'reading', ['poster', 'contour', '포스터', '색면', '등고선', '톤', 'tone'], [
      element('color-poster', 'text-emphasis', { variant: 'poster', text: '밤이 남긴 것은,\n아직 읽지 않은 문장.', caption: 'CVA 창작 문장 · 내용과 순서는 스타일을 바꾸어도 유지됩니다.' }),
      element('color-contour', 'background-effect', { variant: 'contour', title: '서로 다른 기록을, 각자의 말로.', body: '유안의 관찰과 서하의 진술은 별개의 기록입니다. 그 사이에서 떠오른 해석을 사실과 나누어 읽습니다.', note: '등고선은 공간이나 수치를 나타내지 않는 정적 장식입니다.' })
    ]),
    entry('colored-review-desk', '같은 눈금에서 읽는 작은 검토대', '모의 자료의 음수·0·미기록을 표와 함께 읽고, 독립된 한 줄 메모를 확인합니다.', 'data', 'items', 'editor', 'compact', 'wide', ['색상', '팔레트', '작업실', '검토', 'palette', 'dot-plot', 'inline'], [
      element('colored-data', 'data-inspector', { variant: 'dot-plot', title: '두 기록을 같은 기준선에서', body: '디자인을 시험하기 위한 모의 기록입니다. 값이 없는 쪽에는 점을 만들지 않습니다.', data: '해안 표식 | -2 | 1\n온실 표식 | 0 | 0\n통로 표식 | 3 | ', firstName: '첫 기록', secondName: '다음 기록', unit: '눈금', citation: 'CVA 모의 자료 · 색상은 스타일이며 두 계열의 이름·위치·원자료 표를 함께 읽습니다.' }),
      element('colored-note', 'form-group', { variant: 'inline', title: '다음에 확인할 질문', description: '표와 독립된 임시 메모입니다. 지금 열린 페이지에서 입력만 확인합니다.', fieldLabel: '확인할 짧은 문장', required: true, text: '', buttonLabel: '문장 확인' })
    ])
  );

  entries.push(
    entry('ordered-record-desk', '순서대로 읽는 두 기록', '입력 순서의 두 계열을 같은 축으로 비교하고, 빠진 기록과 임시 읽기 메모를 구별합니다.', 'data', 'items', 'folio', 'comfortable', 'wide', ['sequence', '순서', '추이', '두 계열', '관측', '기록', '누락', 'line'], [
      element('ordered-comparison', 'data-inspector', { variant: 'sequence', title: '어디서 기록이 달라졌을까요?', body: 'CVA가 만든 모의 기록입니다. 세로는 같은 눈금이며, 가로는 기록한 순서입니다.', data: '첫째 기록 | -2 | 4\n둘째 기록 | 0 | 6\n셋째 기록 | 5 | \n넷째 기록 | 3 | 2\n다섯째 기록 | 7 | 5', firstName: '해안 기록', secondName: '온실 기록', unit: '눈금', citation: 'CVA 창작 모의 자료 · 실제 작품의 사건·관측·진행 상태가 아닙니다. 빈 값은 미기록이며 순서 간 실제 시간 간격은 알려져 있지 않습니다.' }),
      element('ordered-note', 'form-group', { variant: 'inline', title: '다음에 확인할 질문', description: '그래프와 별개의 임시 입력입니다. 보관할 질문은 제작실의 기본 내용에 쓰고 JSON으로 남깁니다.', fieldLabel: '원자료에서 확인할 문장', text: '', required: false, buttonLabel: '문장 확인' })
    ])
  );

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }
  function create(id, { namespace = id, profile } = {}) {
    const selected = entries.find(entry => entry.id === id);
    if (!selected) throw new Error('알 수 없는 섹션 조합: ' + String(id));
    if (typeof namespace !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(namespace)) throw new Error('섹션 namespace는 영문으로 시작하는 32자 이하의 ID여야 합니다.');
    const doc = clone(selected.document);
    const identifiers = new Map(doc.modules.map(block => [block.id, namespace + '-' + block.id]));
    doc.modules = doc.modules.map(block => {
      block.id = identifiers.get(block.id);
      // actionHref is the existing page-link owner. Text and inner engine IDs
      // can resemble fragments but retain their authored meaning.
      const target = block.props.actionHref;
      if (typeof target === 'string' && target.startsWith('#') && identifiers.has(target.slice(1))) block.props.actionHref = '#' + identifiers.get(target.slice(1));
      const elementTarget = block.type === 'interface' && block.props.settings?.url;
      if (typeof elementTarget === 'string' && elementTarget.startsWith('#') && identifiers.has(elementTarget.slice(1))) block.props.settings.url = '#' + identifiers.get(elementTarget.slice(1));
      if (block.type === 'interface' && block.props.elementId === 'route-navigation') {
        block.props.settings.items = block.props.settings.items.replace(/(^|\n)([^\n]*?\|)([ \t]*)(#[A-Za-z][A-Za-z0-9_-]*)([ \t]*)(?=\r?$|\n)/g, (row, start, label, before, href, after) =>
          identifiers.has(href.slice(1)) ? start + label + before + '#' + identifiers.get(href.slice(1)) + after : row);
      }
      return block;
    });
    if (profile !== undefined) doc.profile = profile;
    return modules.normalizeDocument(doc);
  }
  global.CVA_SECTIONS = Object.freeze({ version: 'cva.sections.v1', entries: deepFreeze(entries), create });
}(window));
