/* Additive metadata for Forma's existing catalog. It does not alter its renderers. */
(function (global) {
  'use strict';

  const axes = [
    { id: 'relation', name: '정보의 관계·구조', question: '정보들이 어떤 관계인가?', prompt: '순서·분기·합류·포함·비교의 의미를 먼저 정합니다.' },
    { id: 'encoding', name: '수치·공간·시각적 부호', question: '양과 차이, 위치와 중요도를 무엇으로 나타내는가?', prompt: '실제 양과 편집적 강조를 구분하고 단위·기준·범례를 남깁니다.' },
    { id: 'composition', name: '화면 구성·이미지와 텍스트', question: '무엇을 어디에 놓고, 서로 어떤 역할을 맡기는가?', prompt: '기존 이미지 비중과 읽는 순서를 지키며 배치와 의미 역할을 따로 고릅니다.' },
    { id: 'interaction', name: '전개·동작', question: '어떤 순서로 이해시키고, 어떻게 탐색하게 하는가?', prompt: '필수 내용을 먼저 보존하고 탐색·선택·단계적 설명을 더합니다.' }
  ];

  // Recipes are conditional authoring guidance, not facts inferred from content.
  const families = [
    { id: '1', name: '순서·단계·진행', axis: 'relation', question: '무엇이 먼저이고, 다음에는 무엇이 오는가?', preserve: '순서만으로 인과·소요 시간·동시성을 주장하지 않습니다.', recipe: { when: '선후 순서나 담당 주체가 명시된 과정', relation: '선형 순서·선행 조건·역할 인계 중 실제 관계', encoding: '번호와 현재 단계 라벨', composition: '읽는 순서를 유지하는 단계 목록 또는 역할별 레인', interaction: '필요한 상세만 펼치기' } },
    { id: '2', name: '분기·합류·배분', axis: 'relation', question: '어디서 갈라지고, 어디서 다시 만나는가?', preserve: '교차한 선을 합류로 해석하지 않고 조건과 경로를 명시합니다.', recipe: { when: '출발·경로·도착 및 분기 조건이 있는 내용', relation: '분기·합류·분기 후 재합류', encoding: '방향과 관계 문장', composition: '기존 연결 카드와 좁은 화면의 세로 흐름', interaction: '선택한 항목의 연결 강조' } },
    { id: '3', name: '연결·통합·조립·융합·변환', axis: 'relation', question: '기존 요소의 정체성이 유지되는가, 새로운 결과가 생기는가?', preserve: '연결·통합·조립·융합을 구분하고 입력·과정·결과를 섞지 않습니다.', recipe: { when: '구성 요소와 변화 과정·결과가 설명된 내용', relation: '정체성 유지 여부에 맞는 연결·통합·변환', encoding: '입력·과정·결과 라벨', composition: '요소 설명과 결과 이미지를 대응', interaction: '변화 전후를 직접 전환하기' } },
    { id: '4', name: '순환·반복·피드백', axis: 'relation', question: '끝난 뒤 어디로 돌아가며, 반복이 무엇을 바꾸는가?', preserve: '반복 조건과 종료 조건, 피드백의 영향을 구분합니다.', recipe: { when: '되돌아가는 경로 또는 반복에 따른 변화가 명시된 내용', relation: '순환·조건 반복·결과에서 앞 단계로의 피드백', encoding: '반복 회차와 돌아가는 이유', composition: '내용이 늘어나는 순환 단계와 변화 기록', interaction: '회차별 상세 선택' } },
    { id: '5', name: '포함·위계·부분과 전체', axis: 'relation', question: '무엇이 무엇 안에 있고, 전체가 어떻게 구성되는가?', preserve: '분류 배치와 실제 소속을 구분하고 명시된 포함 관계만 표현합니다.', recipe: { when: '상위 범위와 실제 소속 또는 부분이 선언된 내용', relation: '포함·위계·공유 소속', encoding: '범위 이름과 부분 라벨', composition: '깊은 단계에서도 본문 폭을 보존하는 중첩', interaction: '전체 맥락에서 부분을 펼치기' } },
    { id: '6', name: '연결·상호작용·인과·의존', axis: 'relation', question: '누가 누구와 연결되고, 어떤 영향을 주고받는가?', preserve: '연관·인과·의존·불확실한 연결을 구분하고 원인의 근거를 남깁니다.', recipe: { when: '대상과 연결 종류·방향·이유가 명시된 내용', relation: '상호작용·인과·의존 중 확인된 관계', encoding: '선의 방향과 문장 범례', composition: '원본 관계 카드와 연결 문장 목록', interaction: '관련 대상 연동 강조' } },
    { id: '7', name: '시간·타임라인', axis: 'relation', question: '언제 시작하고, 얼마나 지속되며, 어떤 사건과 겹치는가?', preserve: '읽는 순서와 실제 시간을 구분하고 화면 간격을 기간으로 해석하지 않습니다.', recipe: { when: '실제 날짜·기간·경로의 연속성이 입력된 내용', relation: '사건·기간·병렬·합류 또는 분기 타임라인', encoding: '공통 시간축과 명시적 날짜', composition: '기존 사건 레인 또는 기간 목록', interaction: '전체 시간 맥락을 유지하는 상세 탐색' } },
    { id: '8', name: '분류·정보 조직', axis: 'relation', question: '어떤 기준으로 묶고, 어디에서 찾아보게 할 것인가?', preserve: '명시된 분류 기준을 쓰고 미분류 항목과 전체 본문을 보존합니다.', recipe: { when: '범주·계층·분류 축·태그가 명시된 자료', relation: '범주별·계층·교차·다면 분류', encoding: '이름 있는 축과 범주 라벨', composition: '분류 목록 또는 선언된 두 축의 교차표', interaction: '검색·필터·정렬' } },
    { id: '9', name: '비교·평가·차이', axis: 'relation', question: '무엇이 어떻게 다르며, 무엇을 선택해야 하는가?', preserve: '동일한 대상·기준·조건을 확인하고 비교 설명과 이미지를 보존합니다.', recipe: { when: '비교 대상과 공통 기준이 정해진 내용', relation: '일대일·전후·다항목·기준 대비 비교', encoding: '같은 척도와 차이 라벨', composition: '분할 화면 또는 동일 기준 비교표', interaction: '차이만 보기 또는 상태 전환' } },
    { id: '10', name: '정량 정보·데이터 시각화', axis: 'encoding', question: '어떤 양과 차이를, 어떤 단위와 척도로 보여주는가?', preserve: '단위·분모·기준·출처·범위를 명시하고 없는 값을 만들지 않습니다.', recipe: { when: '수치와 계산 범위·출처가 입력된 내용', relation: '비교·구성·추세·배분 중 실제 질문', encoding: '실제 값에 맞춘 길이·좌표·강도', composition: '원본 차트 구현과 읽을 수 있는 데이터 표', interaction: '필요한 비교 조건 선택' } },
    { id: '11', name: '공간·위치·거리·범위', axis: 'encoding', question: '어디에 있으며, 어느 범위와 경로를 보여주는가?', preserve: '실제 좌표·축척과 개념적 거리를 구분합니다.', recipe: { when: '위치·경로·범위·부분 위치가 명시된 내용', relation: '공간 안의 경로 또는 전체와 부분', encoding: '명시된 위치와 범위', composition: '전체 공간과 부분 설명의 대응', interaction: '맥락을 잃지 않는 부분 확대' } },
    { id: '12', name: '시각적 부호', axis: 'encoding', question: '크기·색·위치·형태·글자가 어떤 의미를 맡는가?', preserve: '실제 양과 중요도 강조를 구분하고 색만으로 의미를 전달하지 않습니다.', recipe: { when: '강조·상태·소속 또는 수량의 의미가 정해진 내용', relation: '먼저 정한 정보 관계', encoding: '범례와 함께 쓰는 크기·색·선·타입', composition: '원본 위계와 그룹 간 여백', interaction: '포커스와 선택 상태를 함께 표시' } },
    { id: '13', name: '화면 레이아웃', axis: 'composition', question: '독자가 무엇을 먼저 보고, 무엇을 함께 읽어야 하는가?', preserve: '배치 방식만으로 정보의 관계를 확정하지 않고 기존 톤과 이미지 비중을 지킵니다.', recipe: { when: '정보의 우선순위와 대응 관계가 정해진 페이지', relation: '별도로 정한 비교·분류·순서 관계', encoding: '주요 메시지의 타입 위계', composition: '원본 히어로·분할·그리드·수직 섹션 중 적절한 구성', interaction: '필요할 때만 탐색 추가' } },
    { id: '14', name: '이미지 배치', axis: 'composition', question: '이미지들이 대표·비교·장면 전개에서 어떤 관계를 이루는가?', preserve: '이미지 크롭·비중·읽는 순서와 설명을 유지합니다.', recipe: { when: '대표 장면·비교 이미지·연속 장면이 준비된 내용', relation: '대표·동일 조건 비교·연속 장면 중 실제 역할', encoding: '이미지 크기와 번호의 의미', composition: '원본 갤러리·패널·스토리보드·레이어', interaction: '이미지 확대 또는 수동 탐색' } },
    { id: '15', name: '이미지와 텍스트의 관계', axis: 'composition', question: '이미지와 글이 각각 무엇을 설명하는가?', preserve: '배치와 의미 역할을 구분하고 캡션·출처·대체 텍스트를 보존합니다.', recipe: { when: '이미지와 텍스트의 설명 역할이 정해진 내용', relation: '명명·상호 보완·주장과 증거', encoding: '같은 부분을 가리키는 라벨·콜아웃', composition: '원본 이미지와 설명을 대응', interaction: '필요한 주석을 선택해 확인' } },
    { id: '16', name: '설명·스토리텔링·설득', axis: 'interaction', question: '어떤 순서로 독자를 결론과 근거에 연결하는가?', preserve: '전개 순서가 원작의 시간·인과를 새로 만들지 않게 하고 근거를 연결합니다.', recipe: { when: '주장·맥락·근거·다음 행동이 준비된 설명', relation: '문제·원인·해결 또는 전체와 부분', encoding: '메시지와 근거의 위계', composition: '원본 수직 섹션과 증거 이미지', interaction: '결론부터 또는 단계별로 읽는 경로' } },
    { id: '17', name: '탐색·인터랙션·동적 표현', axis: 'interaction', question: '독자가 무엇을 찾아보고, 선택하고, 바꾸어 보는가?', preserve: '필수 본문·키보드 조작·모션 감소·선택 상태를 보존합니다.', recipe: { when: '사용자가 바꿀 관점·조건과 그 결과가 정해진 내용', relation: '화면이 설명하는 관계는 별도로 정의', encoding: '선택·결과·불확실성 라벨', composition: '전체 맥락을 유지하는 탐색 영역', interaction: '탭·접기·필터·확대·직접 전환 중 필요한 동작' } }
  ];

  const familyByGroup = new Map(families.map(family => [family.name, family]));
  const axisById = new Map(axes.map(axis => [axis.id, axis]));

  function enrich(catalog) {
    const entries = Array.isArray(catalog) ? catalog : catalog && catalog.patterns;
    if (!Array.isArray(entries)) return [];
    return entries.map(pattern => {
      const family = familyByGroup.get(pattern.group);
      const axis = family && axisById.get(family.axis);
      return {
        ...pattern,
        title: pattern.name || pattern.title || pattern.id,
        familyId: family ? family.id : null,
        familyName: family ? family.name : pattern.group || null,
        axis: family ? family.axis : null,
        axisName: axis ? axis.name : null,
        question: family ? family.question : null,
        preservationRule: family ? family.preserve : null,
        recipe: family ? { ...family.recipe } : null,
        metadataStatus: family ? 'exact-group-match' : 'unmapped-group',
        recipeStatus: family ? 'conditional-authoring-guidance' : null
      };
    });
  }

  global.CVA_PATTERNS = { version: '1.0', axes, families, enrich };
})(window);
