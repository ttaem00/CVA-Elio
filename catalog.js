/* Owned Elio expression registry. No Forma source, styles or seed assets. */
(function (global) {
  'use strict';
  const families = [
    '순서·단계·진행', '분기·합류·배분', '연결·통합·조립·융합·변환',
    '순환·반복·피드백', '포함·위계·부분과 전체', '연결·상호작용·인과·의존',
    '시간·타임라인', '분류·정보 조직', '비교·평가·차이', '정량 정보·데이터 시각화',
    '공간·위치·거리·범위', '시각적 부호', '화면 레이아웃', '이미지 배치',
    '이미지와 텍스트의 관계', '설명·스토리텔링·설득', '탐색·인터랙션·동적 표현'
  ];
  const specs = [
    ['linear-sequence', 1, 'ordered-story', 'sequence', '순서대로 읽기'],
    ['role-process', 1, 'workstream-section', 'sequence', '담당과 인계'],
    ['conditional-branch', 2, 'decision-path', 'branch', '조건에 따른 갈림길'],
    ['fork-and-join', 2, 'branching-section', 'branch', '갈라진 일의 합류'],
    ['radial-diffusion', 2, 'branching-section', 'branch', '하나에서 여러 대상으로'],
    ['modular-assembly', 3, 'system-section', 'assembly', '부분에서 결과로'],
    ['cumulative-build', 3, 'transformation-section', 'assembly', '변경과 결과'],
    ['closed-cycle', 4, 'cycle-section', 'cycle', '돌아오는 경로'],
    ['feedback-loop', 4, 'cycle-section', 'cycle', '관찰과 다음 변경'],
    ['pyramid-hierarchy', 5, 'containment-section', 'hierarchy', '전체와 하위 범위'],
    ['shared-membership', 5, 'containment-section', 'shared-membership', '여러 범위의 소속'],
    ['distributed-network', 6, 'relationship-section', 'graph', '대상과 연결'],
    ['linked-elements', 6, 'relationship-section', 'graph', '명시된 관계'],
    ['parallel-timeline', 7, 'calendar-section', 'timeline', '원본별 시간 기록'],
    ['evolving-timeline', 7, 'lineage-section', 'graph', '합류와 다음 갈래'],
    ['taxonomic-tree', 8, 'taxonomy-section', 'classification', '분류 기준과 항목'],
    ['paired-comparison', 9, 'comparison-section', 'comparison', '같은 기준의 비교'],
    ['before-after', 9, 'comparison-section', 'comparison', '앞뒤 상태 비교'],
    ['priority-ranking', 10, 'evidence-section', 'data', '값과 기준'],
    ['time-trend', 10, 'evidence-section', 'data', '입력 순서의 관측값'],
    ['physical-location', 11, 'spatial-section', 'spatial', '명시한 좌표'],
    ['relative-distance', 11, 'spatial-section', 'spatial', '좌표와 위치 비교'],
    ['status-encoding', 12, 'status-section', 'status', '이름과 상태 표식'],
    ['size-encoding', 12, 'status-section', 'status', '강조와 수치 구분'],
    ['editorial-layout', 13, 'intro-section', 'layout', '핵심과 보충 설명'],
    ['radial-layout', 13, 'feature-section', 'layout', '주제별 설명 구획'],
    ['image-storyboard', 14, 'image-story', 'images', '사진의 읽는 순서'],
    ['layered-images', 14, 'image-story', 'images', '각 이미지와 설명'],
    ['annotated-callout', 15, 'annotated-figure', 'annotation', '사진의 부분과 설명'],
    ['context-hotspots', 15, 'annotated-figure', 'annotation', '위치별 주석'],
    ['claim-evidence', 16, 'argument-section', 'argument', '주장과 근거'],
    ['conclusion-first', 16, 'argument-section', 'argument', '결론부터 읽기'],
    ['linked-selection', 17, 'relationship-section', 'interactive-graph', '대상과 관계 선택'],
    ['section-explorer', 17, 'disclosure-section', 'disclosure', '필요한 설명 펼치기']
  ];
  const patterns = specs.map(([id, family, engine, variant, name]) => Object.freeze({
    id, familyId: String(family), group: families[family - 1], name, title: name,
    engine, variant, placement: 'section', publicOwned: true,
    description: 'Elio 자체 구현 · ' + name + '. 입력한 내용과 관계만 표시합니다.'
  }));
  global.FW_CATALOG = Object.freeze({ version: 'elio-owned.v1', patterns: Object.freeze(patterns) });
  global.ELIO_OWNED_RUNTIME = { version: 'elio-owned.v1', families: families.slice(),
    patterns: patterns.map(({ id, familyId, engine, variant }) => ({ id, familyId, engine, variant })),
    provenance: 'CVA-owned contract reconstruction; no Forma implementation or seeds',
    unsupported: 'Unknown pattern IDs, engine identities and unsupported rich models fail explicitly.' };
})(typeof window !== 'undefined' ? window : globalThis);
