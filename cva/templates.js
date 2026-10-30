/* Page templates composed from the shared CVA module API, never product source edits. */
(function (global) {
  'use strict';

  const modules = global.CVA_MODULES;
  if (!modules || typeof modules.create !== 'function' || typeof modules.normalizeDocument !== 'function') {
    throw new Error('CVA_MODULES must load before CVA_TEMPLATES');
  }

  function block(type, id, variant, props) {
    const result = modules.create(type, id);
    result.variant = variant;
    Object.assign(result.props, props);
    return result;
  }

  function item(id, title, body, extra) {
    return Object.assign({ id, title, body }, extra || {});
  }

  function document(title, description, profile, blocks, relationOrientation) {
    if (relationOrientation) {
      blocks.filter(entry => ['timeline', 'flow', 'forma-pattern'].includes(entry.type))
        .forEach(entry => { entry.orientation = relationOrientation; });
    }
    return modules.normalizeDocument({ schema: 'cva.page.v2', title, description, profile, modules: blocks });
  }

  function authoredPattern(id, patternId, title, body, adapt) {
    if (typeof modules.sectionFor !== 'function') throw new Error('CVA_MODULES.sectionFor must load before authored templates');
    const result = block('forma-pattern', id, 'original', { patternId, title: '', body: '' });
    const section = modules.sectionFor(result);
    adapt(section);
    section.title = title;
    section.lead = body;
    section.eyebrow = '작성 예시';
    section.navTitle = title;
    section.note = '페이지의 작성 예시입니다. 실제 작품·방송에 적용할 때는 원자료와 적용 범위를 함께 남깁니다.';
    result.props.section = section;
    return result;
  }

  function nameItems(section, entries) {
    if (section.items.length !== entries.length) throw new Error('Original template item shape changed: ' + section.patternId);
    section.items.forEach((entry, index) => {
      entry.title = entries[index][0];
      entry.body = entries[index][1];
      if (entries[index][2] !== undefined) entry.label = entries[index][2];
    });
  }

  const entries = [
    {
      id: 'brand-overview', name: '브랜드 소개', category: '소개', preferredProfile: 'ttaem',
      description: '환영 이미지와 핵심 약속에서 시작해 도구의 역할과 실제 작업 화면으로 이어집니다.',
      document: document('찾던 순간을, 다시 만나세요.', 'CVA의 기존 역할과 참고 자산을 사용한 페이지 구성 예시입니다.', 'ttaem', [
        block('hero', 'brand-hero', 'split', {
          eyebrow: 'CVA / 치즈 직조기', title: '찾던 순간을,\n다시 만나세요.',
          body: '방송의 흐름을 읽는 Loki, 같은 순간을 비교하는 TTaempad, 작품의 장면을 따라가는 Elio. 오늘 하고 싶은 일에서 시작하세요.',
          image: 'brand-welcome', caption: 'CVA의 기존 환영 그림', actionLabel: '세 도구의 역할 보기'
        }),
        block('cards', 'brand-tools', 'grid', {
          eyebrow: '치즈 요원의 도구', title: '지금 하고 싶은 일은 무엇인가요?',
          body: '긴 방송에서 장면을 찾고 싶은지, 여러 시점을 비교하고 싶은지, 작품의 이야기를 읽고 싶은지 살펴보세요.',
          items: [
            item('role-loki', 'Loki', '긴 방송의 흐름과 다시 볼 장면을 읽습니다.', { label: '읽다' }),
            item('role-editor', 'TTaempad', '같은 순간의 시점을 비교하고 필요한 컷을 담습니다.', { label: '담다' }),
            item('role-elio', 'Elio', '작품의 장면과 인물의 이야기를 따라갑니다.', { label: '따라가다' })
          ]
        }),
        block('split', 'brand-workspace', 'media-right', {
          eyebrow: '내가 만드는 결과', title: '선택한 장면을, 내 작업으로.',
          body: '원본과 다른 시점을 비교하고, 컷 목록과 결과를 같은 작업실에서 확인합니다.',
          image: 'public-workbench', caption: 'TTaempad의 실제 작업실 참고 캡처 · 이 페이지는 도구 소개입니다.'
        }),
        block('cta', 'brand-next', 'banner', {
          eyebrow: '이어 보기', title: '오늘 다시 만나고 싶은 순간은 무엇인가요?',
          body: '긴 방송의 장면을 찾거나, 시점을 비교하거나, 작품을 다시 읽는 일. 세 도구의 역할에서 나의 시작점을 찾아보세요.', actionLabel: '도구 소개 처음으로 돌아가기'
        })
      ])
    },
    {
      id: 'product-story', name: '제품 이야기', category: '소개', preferredProfile: 'ttaem',
      description: '대표 메시지, 교차하는 이미지와 설명, 기능·조건·질문을 조립한 제품 안내입니다.',
      document: document('자료에서, 읽을 수 있는 기록으로.', '가상 제품 ‘기록서가’의 안내입니다. 원자료 보관과 설명 읽기를 소개하는 창작 예시입니다.', 'ttaem', [
        block('hero', 'product-hero', 'split', {
          eyebrow: '기록서가 / 가상 제품 안내', title: '자료에서,\n읽을 수 있는 기록으로.',
          body: '읽던 자료를 다시 찾고, 왜 남겼는지 기억하는 곳. 기록서가는 원자료의 위치와 내가 붙인 설명을 함께 모으는 가상 서비스입니다.',
          image: 'public-paper', caption: 'Forma의 기존 생성 이미지', actionLabel: '자료 모으기부터 읽기'
        }),
        block('split', 'product-collect', 'media-left', {
          eyebrow: '01 / 모으기', title: '내용의 출처부터 남깁니다.',
          body: '자료가 어디에서 왔는지, 어느 범위를 다루는지 함께 남깁니다. 내용을 다시 확인할 때 원래 자료로 돌아갈 수 있습니다.',
          image: 'public-space', caption: '자료의 구조를 소개하는 참고 이미지'
        }),
        block('split', 'product-read', 'media-right', {
          eyebrow: '02 / 읽기', title: '필요한 깊이로 읽습니다.',
          body: '핵심을 먼저 읽고, 관심 있는 항목에서 상세를 확인합니다. 짧게 훑어보거나 필요한 내용에 오래 머물 수 있습니다.',
          image: 'public-coast', caption: '이미지와 설명을 짝지은 구성'
        }),
        block('evidence', 'product-proof', 'document', {
          eyebrow: '확인할 자료', title: '약속은 실제 결과와 함께.',
          body: '이 안내의 이미지 세 장은 Forma의 참고 이미지입니다. 실제 서비스 화면이나 출시·성능의 증거로 사용하지 않았습니다. 기록서가의 기능 설명은 페이지 구성을 보여 주는 창작 설정입니다.',
          image: '', caption: '', cite: '창작 제품 · Forma 참고 이미지 · 실제 성능 수치 미사용'
        }),
        block('accordion', 'product-questions', 'stacked', {
          eyebrow: '시작 전 질문', title: '무엇을 먼저 확인할까요?',
          body: '자료 준비와 결과 보관부터 알아보세요.',
          items: [item('question-source', '어떤 자료를 준비하나요?', '읽고 싶은 원자료와 출처, 필요한 구간을 함께 준비합니다.'), item('question-result', '결과에는 무엇을 남기나요?', '핵심 설명과 원자료의 위치를 함께 남겨 나중에도 확인할 수 있게 합니다.')]
        }),
        block('cta', 'product-next', 'centered', { eyebrow: '다시 읽기', title: '내 자료에는 무엇이 필요할까요?', body: '모으기부터 결과까지, 내 상황에 필요한 부분을 다시 살펴보세요.', actionLabel: '처음으로 돌아가기' })
      ])
    },
    {
      id: 'story-reader', name: 'Elio 이야기 읽기', category: '읽기 · Elio', preferredProfile: 'elio',
      description: '목록에서 장면을 선택해 원래 사진·본문·출처를 같은 자리에서 읽습니다.',
      document: document('선택한 장면에서, 이어지는 맥락으로.', '제공된 Elio 자료에서 고른 일부 장면을 배치한 읽기 예시입니다.', 'elio', [
        block('hero', 'story-hero', 'centered', {
          eyebrow: 'ELIO STORY / 창작 이야기', title: '선택한 장면에서,\n이어지는 맥락으로.',
          body: '관측소의 첫 만남에서 서로 다른 기록의 발견과 다시 나누는 이야기로 이어집니다.',
          image: '', caption: '', actionLabel: '세 장면 선택해 읽기'
        }),
        block('focus', 'story-scenes', 'reader', {
          eyebrow: '장면을 따라 읽기', title: '각자의 선택은 어떻게 이어졌을까.',
          body: '목록에서 장면을 고르면 사진과 설명이 함께 바뀝니다. 세 장면의 번호는 읽기 순서이며, 중간 장면은 생략했습니다.',
          helpLabel: '이 세 장면의 범위', help: '창작 이야기 제2장 6막에서 고른 세 장면입니다. 작품 속 시각이나 장면 사이의 기간을 표시한 시간선은 아닙니다. 전체 이야기는 원래 Elio 자료에서 이어 읽습니다.',
          items: FW_STORY.slice(0,3).map(scene => ({id:scene.id,title:scene.title,body:scene.body,label:scene.eyebrow,image:'scene-'+scene.id,detail:'창작 장면의 본문과 그림을 함께 읽습니다.',source:'패키지에 동봉한 창작 예제 · 실제 작품의 인용이 아닙니다.'}))
        }),
        block('evidence', 'story-source', 'document', {
          eyebrow: '장면의 출처', title: '원래 장면과 함께 읽습니다.',
          body: '장면 이름과 설명, 그림은 패키지의 창작 예제입니다. 전체 흐름이 궁금하다면 앞뒤 장면도 함께 읽어 보세요.',
          image: '', caption: '', cite: 'Elio 장면 자료 · public-arrival / public-discovery / public-return'
        }),
        block('cta', 'story-next', 'centered', { eyebrow: '다시 읽기', title: '달라진 선택을 다시 살펴보세요.', body: '처음 장면으로 돌아가 인물의 선택과 남은 흔적을 함께 읽어 보세요.', actionLabel: '처음부터 다시 읽기' })
      ], 'vertical')
    },
    {
      id: 'editing-workspace', name: '편집 작업실', category: '작업', preferredProfile: 'editor',
      description: '실제 작업실 캡처 한 장과 컷·두 시각의 기준으로 편집 흐름을 소개합니다.',
      document: document('같은 순간을 비교하고, 필요한 컷을 담습니다.', '기존 편집 작업실의 흐름을 소개하는 구성 예시입니다.', 'editor', [
        block('hero', 'editor-hero', 'split', { eyebrow: 'TTaempad / 작업실 구성 예시', title: '같은 순간을 비교하고,\n필요한 컷을 담습니다.', body: '아래 캡처는 TTaempad 작업실을 소개하는 정적 화면입니다. 이 페이지에서는 컷의 역할과 두 시각의 기준을 읽으며 실제 편집 순서를 살펴봅니다.', image: 'public-workbench', caption: 'TTaempad 작업실의 참고 캡처 · 이 이미지에서 영상을 재생하거나 컷을 편집할 수 없습니다.', actionLabel: '작업 구조 보기' }),
        block('timeline', 'editor-cuts', 'compact', { eyebrow: '컷 목록', title: '선택한 구간을 읽는 순서', body: '도입에서 주요 장면을 거쳐 마무리까지, 컷이 맡은 역할을 살펴봅니다.', items: [item('cut-open', '도입 구간', '선택한 컷의 시작 맥락을 확인합니다.', { label: '출처를 유지' }), item('cut-main', '주요 장면', '필요한 내용을 결과에서 검토합니다.', { label: '선택과 재생을 구분' }), item('cut-close', '마무리 구간', '연결과 끝 범위를 확인합니다.', { label: '미리보기 후 저장' })] }),
        block('comparison', 'editor-inspect', 'table', { eyebrow: '선택 정보', title: '원본 시각과 결과 시각', body: '원본 시각은 출처 영상에서의 위치이고, 결과 시각은 컷을 조립한 뒤의 누적 위치입니다. 비교 재생 위치를 옮겨도 이미 담은 컷의 출처가 바뀌는 것은 아닙니다.', items: [item('clock-source', '원본 시각', '원래 영상에서의 위치', { label: '시각의 기준', value: '원본 영상' }), item('clock-result', '결과 시각', '조립된 결과에서의 누적 위치', { label: '시각의 기준', value: '결과 영상' })] }),
        block('flow', 'editor-process', 'sequence', { eyebrow: '편집 흐름', title: '검토를 끝내고 보관하기까지', body: '출처를 확인하고, 다른 시점과 비교하고, 결과를 미리 본 뒤 보관합니다.', relationLabel: '다음 확인', items: [item('edit-find', '찾기', '장면과 출처를 확인'), item('edit-compare', '비교', '다른 시점과 구간을 확인'), item('edit-preview', '미리보기', '결과를 읽고 재생'), item('edit-save', '보관', '확인한 결과를 저장')] }),
        block('cta', 'editor-next', 'banner', { eyebrow: '작업 돌아보기', title: '결과와 원본을 함께 확인하세요.', body: '작업실 흐름을 다시 읽으며 다음 편집에 필요한 내용을 정리해 보세요.', actionLabel: '작업 소개 다시 읽기' })
      ])
    },
    {
      id: 'case-study', name: '사례 소개', category: '근거', preferredProfile: 'forma',
      description: '문제와 변화, 같은 기준의 비교, 과정 이미지와 관찰 근거로 사례를 읽게 합니다.',
      document: document('무엇이 달라졌는지, 같은 기준으로.', '가상 팀의 자료 정리 과정을 소개하는 페이지 예시입니다.', 'forma', [
        block('hero', 'case-hero', 'split', { eyebrow: 'CASE STUDY / 가상 사례', title: '무엇이 달라졌는지,\n같은 기준으로.', body: '출발 상태와 바꾼 과정을 설명하고, 확인 가능한 결과로 돌아옵니다.', image: 'public-space', caption: '기존 생성 이미지를 사용한 구성 예시', actionLabel: '변화 과정 읽기' }),
        block('text', 'case-context', 'prose', { eyebrow: '맥락', title: '여러 자료에서 한 질문을 찾았습니다.', body: '가상의 팀 ‘서가’는 회의 메모·인터뷰·결정 문서를 각각 보관하고 있었습니다. 새로 합류한 동료가 한 결정의 이유를 찾으려면 세 종류의 자료를 따로 열어야 했습니다.' }),
        block('comparison', 'case-before-after', 'columns', { eyebrow: '같은 기준', title: '자료를 찾고, 내용을 확인하는 방식', body: '자료에 접근하는 방식과 맥락을 확인하는 방법을 같은 질문으로 비교합니다.', items: [item('case-before', '이전', '여러 자료를 각각 열어 맥락을 찾습니다.', { label: '자료 접근', value: '분산된 입력' }), item('case-after', '이후', '목차와 출처를 함께 확인합니다.', { label: '자료 접근', value: '연결된 읽기' })] }),
        block('gallery', 'case-gallery', 'storyboard', { eyebrow: '기록', title: '과정을 세 장면으로', body: '자료를 모으고, 구조를 만들고, 전체 맥락에서 돌아봅니다.', caption: '기존 생성 이미지로 구성한 가상 사례', items: [item('case-image-a', '출발점', '자료와 질문을 모읍니다.', { image: 'public-paper' }), item('case-image-b', '구성', '관계와 읽기 순서를 정리합니다.', { image: 'public-space' }), item('case-image-c', '돌아보기', '전체 맥락에서 결과를 검토합니다.', { image: 'public-coast' })] }),
        block('evidence', 'case-evidence', 'document', { eyebrow: '근거', title: '결과를 다시 확인할 수 있도록.', body: '이 사례에서 바꾼 것은 문서를 찾는 경로와 출처 표시입니다. 실제 이용 시간이나 성과를 측정하지 않았습니다. 그림은 과정을 설명하기 위한 기존 참고 이미지이며 실제 팀의 작업 캡처가 아닙니다.', image: '', caption: '', cite: '서가 팀 · 창작 사례 · 실제 관찰 수치 및 성과 미주장' }),
        block('cta', 'case-next', 'centered', { eyebrow: '내 상황에 적용', title: '같은 질문에서 시작하세요.', body: '자료를 찾고 내용을 확인하는 방식이 내 상황에서는 어떻게 달라질지 돌아보세요.', actionLabel: '사례 처음부터 읽기' })
      ])
    },
    {
      id: 'process-guide', name: '과정 안내', category: '관계', preferredProfile: 'forma',
      description: '진행 순서와 선택·합류의 의미를 실제 모듈과 기존 Elio 관계 표현으로 조립합니다.',
      document: document('나눈 일을, 함께 확인하는 과정.', '두 검토 경로가 다시 모이는 가상 과정의 구성 예시입니다.', 'forma', [
        block('hero', 'process-hero', 'centered', { eyebrow: 'HOW IT WORKS / 구성 예시', title: '나눈 일을,\n함께 확인하는 과정.', body: '하나의 질문에서 두 검토 경로로 나눈 뒤, 확인한 내용을 같은 자리에서 모으는 예시입니다.', image: '', caption: '', actionLabel: '과정 따라 읽기' }),
        authoredPattern('process-original-pattern', 'fork-and-join', '내용과 읽는 경험을 나누어 검토합니다.', '같은 초안을 두 관점에서 검토한 뒤, 근거와 화면을 함께 확인하는 페이지 제작 과정입니다.', section => {
          nameItems(section, [['질문과 초안', '누가 무엇을 읽어야 하는지 정하고 원자료와 초안을 준비합니다.'], ['내용 검토', '장면 이름·설명·출처가 서로 맞는지 원자료에서 확인합니다.', '자료와 의미'], ['읽기 검토', '화면에서 항목을 찾고 선택하고 돌아갈 수 있는지 확인합니다.', '화면과 동작'], ['결과 함께 확인', '두 검토에서 나온 수정 사항을 반영하고 출력물을 다시 엽니다.']]);
          section.columnLabels=['초안 준비','두 관점의 검토','결과 확인']; section.items.forEach((item,index)=>{item.image='assets/'+['catalog-observation-notebook.png','coastal-observation-dawn.png','winter-greenhouse-path.png','catalog-moonleaf.png'][index];});
          section.edges.forEach(edge => { edge.label = edge.kind === 'merge' ? '두 검토를 함께 확인' : '같은 초안에서 검토'; });
        }),
        block('comparison', 'process-steps', 'table', { eyebrow: '단계별 산출물', title: '다음 사람이 이어 볼 수 있는 기록', body: '진행 표시보다 어떤 결과를 남겼는지 확인합니다.', labelHeading: '출발 자료', valueHeading: '남기는 것', bodyHeading: '확인할 질문', items: [item('step-input', '입력', '어느 범위까지 다루는가?', { label: '목적과 원자료', value: '자료 목록·출처' }), item('step-draft', '초안', '내용과 관계를 읽을 수 있는가?', { label: '자료 목록', value: '읽을 수 있는 페이지' }), item('step-review', '확인', '출력 후에도 같은 내용과 동작인가?', { label: '완성한 페이지', value: '출력·재열기 결과' })] }),
        block('accordion', 'process-faq', 'columns', { eyebrow: '다음 질문', title: '모이기 전에 확인할 것', body: '예외와 되돌아갈 조건을 실제 작업에 맞춰 씁니다.', items: [item('process-missing', '한 경로의 결과가 없으면?', '어떤 입력이 필요한지 표시하고 확인된 결과와 섞지 않습니다.'), item('process-change', '질문이 달라지면?', '기존 결과의 적용 범위를 다시 확인합니다.')] }),
        block('cta', 'process-next', 'banner', { eyebrow: '처음 질문', title: '질문과 자료를 준비하세요.', body: '함께 확인할 질문을 정하고, 각 경로에서 필요한 자료를 살펴보세요.', actionLabel: '과정 처음으로 돌아가기' })
      ])
    },
    {
      id: 'comparison-page', name: '비교 페이지', category: '근거', preferredProfile: 'editor',
      description: '동일 기준의 비교표와 근거를 조밀한 선택 화면으로 구성합니다.',
      document: document('같은 질문으로, 두 선택을 읽습니다.', '개요 중심과 상세 중심의 가상 구성을 비교한 페이지 예시입니다.', 'editor', [
        block('hero', 'compare-hero', 'centered', { eyebrow: 'COMPARE / 가상 구성안', title: '같은 질문으로,\n두 선택을 읽습니다.', body: '대상과 기준·조건을 먼저 맞춘 뒤 차이와 적용 범위를 확인합니다.', image: '', caption: '', actionLabel: '비교 기준 보기' }),
        block('comparison', 'compare-options', 'table', { eyebrow: '같은 기준', title: '한 번에 볼 범위', body: '먼저 전체를 볼지, 관심 있는 상세에서 시작할지 같은 읽기 질문으로 비교합니다.', items: [item('option-summary', '개요 중심', '먼저 전체 흐름을 읽고 필요한 상세로 이동합니다.', { label: '읽기 범위', value: '전체 → 상세' }), item('option-detail', '상세 중심', '개별 내용을 먼저 읽고 전체 관계를 다시 확인합니다.', { label: '읽기 범위', value: '상세 → 전체' })] }),
        block('accordion', 'compare-criteria', 'columns', { eyebrow: '상황에 맞는 선택', title: '어떤 독자에게 더 맞을까요?', body: '두 구성은 같은 자료를 다른 깊이에서 시작합니다. 읽는 목적에 따라 선택합니다.', items: [item('criteria-a', '처음 읽는 독자라면', '개요 중심 구성이 전체 등장인물과 사건을 먼저 보여 줍니다. 전체를 이해한 뒤 궁금한 장면으로 이동합니다.'), item('criteria-b', '다시 찾아온 독자라면', '상세 중심 구성에서 기억하는 장면을 바로 찾습니다. 장면을 읽은 뒤 전체 흐름으로 돌아갈 수 있어야 합니다.'), item('criteria-c', '함께 제공한다면', '같은 장면 ID를 두 구성에서 유지합니다. 개요에서 선택한 장면이 상세에서도 같은 설명과 출처로 열리도록 연결합니다.')] }),
        block('evidence', 'compare-evidence', 'document', { eyebrow: '비교의 범위', title: '설계 방향을 비교한 예시입니다.', body: '이 페이지는 읽기 시작점과 탐색 방식을 비교합니다. 실제 제품의 속도·성과·사용성 우위를 측정하지 않았습니다. 제품 비교에 적용할 때는 동일 상태의 화면과 관찰 조건을 함께 둡니다.', image: '', caption: '', cite: '가상 구성안 · 성능 수치 및 전후 화면 미사용' }),
        block('cta', 'compare-next', 'banner', { eyebrow: '결정', title: '내 질문에 맞는 구성을 고르세요.', body: '먼저 알고 싶은 질문을 생각하며 두 읽기 구성을 다시 비교해 보세요.', actionLabel: '비교 처음으로 돌아가기' })
      ])
    },
    {
      id: 'knowledge-guide', name: '지식 안내', category: '읽기', preferredProfile: 'forma',
      description: '조사·설계·검증에서 남기는 여섯 기록을 원래 Forma 분류 표현으로 안내합니다.',
      document: document('다음 동료가, 이어 읽을 수 있는 기록.', '조사·설계·검증 기록의 용도와 차이를 소개하는 지식 안내 예시입니다.', 'forma', [
        block('hero', 'knowledge-hero', 'split', { eyebrow: 'KNOWLEDGE / 팀의 기록', title: '다음 동료가,\n이어 읽을 수 있는 기록.', body: '무엇을 보았고, 왜 그렇게 만들었고, 결과는 어땠는가. 여섯 기록을 목적에 맞게 찾아보세요.', image: 'public-paper', caption: '기록을 주제로 한 Forma의 기존 참고 이미지', actionLabel: '기록의 종류 살펴보기' }),
        block('cards', 'knowledge-groups', 'grid', { eyebrow: '세 가지 시작점', title: '어떤 질문에서 시작하나요?', body: '자료를 찾는지, 설계 이유가 궁금한지, 결과를 확인하는지에 따라 읽을 기록이 달라집니다.', items: [item('group-structure', '무엇을 알게 되었나', '관찰 기록과 인터뷰에서 사람의 상황과 원래 말을 확인합니다.', { label: '조사' }), item('group-relationship', '왜 이렇게 만들었나', '설계 원칙과 시제품에서 판단 기준과 확인하려던 가설을 읽습니다.', { label: '설계' }), item('group-evidence', '무엇이 달라졌나', '사용성 기록과 결정 기록에서 관찰한 결과와 다음 선택을 확인합니다.', { label: '검증' })] }),
        block('forma-pattern', 'knowledge-original-pattern', 'original', { patternId: 'taxonomic-tree', title: '여섯 기록이 속한 자리', body: 'Forma 원형의 조사·설계·검증 분류를 그대로 읽습니다. 선은 소속 관계이며 작업의 선후 순서를 뜻하지 않습니다.' }),
        block('accordion', 'knowledge-terms', 'stacked', { eyebrow: '기록을 남길 때', title: '섞이기 쉬운 세 가지', body: '내용을 구분하면 다음 사람이 같은 자료에서 다시 판단할 수 있습니다.', items: [item('term-order', '관찰과 해석', '관찰 기록에는 실제로 본 행동과 말을 먼저 씁니다. 그 의미에 대한 해석은 이유와 함께 구분합니다.'), item('term-containment', '원칙과 예외', '원칙에는 적용되는 조건을 적습니다. 다른 선택이 필요한 경우에는 조건과 이유를 함께 남깁니다.'), item('term-link', '결과와 결정', '사용성 기록에는 어떤 시도에서 어디가 막혔는지 남깁니다. 결정 기록에는 그 결과로 무엇을 바꾸기로 했는지 씁니다.')] }),
        block('cta', 'knowledge-next', 'centered', { eyebrow: '다시 읽기', title: '지금 필요한 기록은 무엇인가요?', body: '조사·설계·검증 중에서 오늘의 질문에 맞는 기록을 다시 살펴보세요.', actionLabel: '안내 처음으로 돌아가기' })
      ])
    },
    {
      id: 'game-item-catalog', name: '게임 아이템 도감', category: '게임 · 분류와 포함', preferredProfile: 'forma',
      description: '여섯 아이템의 분류를 읽고 이름·용도로 검색해 상세를 선택하는 도감입니다.',
      document: document('아이템을 찾고, 어디에 쓰는지 읽습니다.', '기록보관소를 배경으로 한 창작 예시 도감입니다. 실제 게임의 아이템·수치·획득 조건을 주장하지 않습니다.', 'forma', [
        block('hero', 'items-hero', 'centered', { eyebrow: '게임 도감 / 창작 예시', title: '아이템을 찾고,\n어디에 쓰는지 읽습니다.', body: '기록보관소에서 발견한 여섯 물건. 단서·수집·제작의 분류를 읽고, 필요한 물건을 검색해 쓰임을 살펴보세요.', image: '', caption: '', actionLabel: '아이템 찾기' }),
        block('focus', 'items-list', 'catalog', { eyebrow: '찾아보기 / 6개 항목', title: '이름이나 용도로 찾아보세요.', body: '물건을 선택하면 같은 자리에서 설명과 상세 정보가 바뀝니다. 예를 들어 ‘단서’ 또는 ‘수선’으로 찾아보세요.', helpLabel: '이 도감의 표기 기준', help: '여섯 물건과 쓰임은 창작 예시입니다. 아이템 그림과 게임 버전은 제공되지 않아 표시하지 않았습니다. 실제 도감을 만들 때는 각 항목의 출처·조건·그림을 확인한 자료로 바꿉니다.', items: [
          item('item-record', '조사 기록', '사건이 기록된 문서입니다. 증언과 시간의 차이를 다시 읽는 데 씁니다.', { label: '단서', detail: '기록에는 작성자와 발견 장소를 함께 남깁니다. 서술 내용이 실제 사건과 일치하는지는 다른 단서와 대조합니다.', source: '기록보관소 · 창작 예시. 실제 게임의 설명문이나 수치가 아닙니다.' }),
          item('item-fragment', '문장 조각', '흩어진 문장의 일부입니다. 모은 조각을 대조해 빠진 기록을 읽습니다.', { label: '수집', detail: '순서를 아직 모르는 조각은 발견 순서와 문장 안의 순서를 나누어 기록합니다. 필요한 총수량은 이 예시에서 정하지 않았습니다.', source: '기록보관소 · 창작 예시. 실제 게임의 획득 조건이 아닙니다.' }),
          item('item-material', '봉인 재료', '열린 보관함을 다시 봉인하는 제작에 쓰는 재료입니다.', { label: '제작', detail: '사용할 보관함과 다른 재료를 함께 확인합니다. 조합 수량과 성공률은 설정하지 않았습니다.', source: '기록보관소 · 창작 예시. 실제 게임의 제작식이 아닙니다.' }),
          item('item-clue', '현장 단서', '발견 장소에 남은 흔적입니다. 조사 기록의 내용과 대조합니다.', { label: '단서', detail: '같은 흔적이 다른 장소에서도 발견되었는지 확인합니다. 발견했다는 사실과 그 의미에 대한 해석을 구분합니다.', source: '기록보관소 · 창작 예시.' }),
          item('item-emblem', '낡은 문양', '여러 장소에 남은 같은 계열의 표식입니다.', { label: '수집', detail: '모양이 비슷하다는 이유만으로 같은 집단의 소유라고 단정하지 않습니다. 발견 장소와 함께 비교합니다.', source: '기록보관소 · 창작 예시.' }),
          item('item-repair', '조합 재료', '오래된 조사 도구를 수선하는 데 쓰는 재료입니다.', { label: '제작', detail: '수선할 도구와 필요한 공정을 함께 기록합니다. 실제 제작식과 수량은 원자료가 있을 때 추가합니다.', source: '기록보관소 · 창작 예시.' })
        ] }),
        authoredPattern('items-taxonomy', 'taxonomic-tree', '큰 범주에서 개별 아이템으로', '단서·수집·제작의 세 범주에 속하는 아이템 작성 예시입니다.', section => {
          section.groups.forEach((group, index) => { group.title = ['단서', '수집', '제작'][index]; });
          nameItems(section, [['조사 기록', '사건이 기록된 문서를 다시 읽습니다.', '단서'], ['현장 단서', '발견 장소와 흔적을 대조합니다.', '단서'], ['문장 조각', '흩어진 글을 한 기록으로 모읍니다.', '수집'], ['낡은 문양', '여러 장소에 남은 표식을 비교합니다.', '수집'], ['봉인 재료', '보관함을 봉인하는 제작에 씁니다.', '제작'], ['조합 재료', '도구를 수선하는 제작에 씁니다.', '제작']]);
        }),
        block('evidence', 'items-source', 'document', { eyebrow: '자료의 범위', title: '설명은 읽을 수 있게, 설정은 분명하게.', body: '이 도감은 탐색과 상세 읽기를 보여 주는 창작 예시입니다. 실제 게임 자료를 사용할 때는 항목별 설명문·그림의 출처와 적용 버전을 함께 남깁니다.', image: '', caption: '', cite: '창작 예시 · 실제 게임 데이터 미사용 · 이미지 미제공' }),
        block('cta', 'items-next', 'centered', { eyebrow: '찾아보기', title: '필요한 범주에서 다시 시작하세요.', body: '같은 범주의 아이템을 읽고 용도의 차이를 비교해 보세요.', actionLabel: '도감 처음으로 돌아가기' })
      ], 'vertical')
    },
    {
      id: 'character-relations', name: '인물 관계와 갈래', category: '이야기 · 방향과 관계', preferredProfile: 'elio',
      description: '창작 이야기의 네 인물과 도움·정보·대립 방향을 읽고 한 인물의 조건부 선택을 따릅니다.',
      document: document('닫힌 기록보관소의 네 사람.', '기록보관소를 배경으로 한 창작 예시입니다. 실제 작품의 인물이나 관계를 주장하지 않습니다.', 'elio', [
        block('hero', 'characters-hero', 'centered', { eyebrow: '인물 관계 / 창작 예시', title: '닫힌 기록보관소의\n네 사람.', body: '문을 열려는 서윤, 기록을 찾는 도현, 열쇠를 맡은 민하, 보존을 우선하는 가온. 같은 장소에 모였지만 원하는 것은 다릅니다.', image: '', caption: '', actionLabel: '네 사람의 관계 읽기' }),
        authoredPattern('characters-network', 'distributed-network', '도움은 어디로, 정보는 누구에게', '각 선에 행동과 방향을 적었습니다. 함께 등장했다는 이유로 모든 인물을 연결하지 않았습니다.', section => {
          nameItems(section, [['서윤', '닫힌 문을 열어 도현이 기록에 접근하도록 돕습니다.'], ['도현', '발견한 기록의 위치를 민하에게 전합니다.'], ['민하', '열쇠를 사용해 기록을 꺼내려 합니다.'], ['가온', '기록을 꺼내면 훼손될 수 있다며 민하와 대립합니다.']]);
          section.edges.forEach((edge, index) => { edge.kind = ['cause', 'cause', 'exchange'][index]; edge.label = ['서윤 → 도현 · 접근을 도움', '도현 → 민하 · 위치 전달', '민하 ↔ 가온 · 기록 반출에 대립'][index]; });
        }),
        authoredPattern('characters-choice', 'conditional-branch', '서윤은 누구와 문을 열 것인가', '한 갈림점의 두 가능성을 보여 줍니다. 두 경로가 모두 일어났거나 나중에 합류한다고 정하지 않았습니다.', section => {
          nameItems(section, [['서윤의 선택', '기록을 꺼낼지 보존할지 결정하기 위해 보관실 문 앞에 섭니다.'], ['도현과 함께 조사', '기록의 내용을 먼저 확인하러 갑니다.', '함께 조사하기를 택하면'], ['가온과 보관실에 남기', '기록을 옮기기 전 보존 방법을 찾습니다.', '보존을 먼저 택하면']]);
          section.edges.forEach((edge, index) => { edge.label = ['함께 조사하기를 택하면', '보존을 먼저 택하면'][index]; });
        }),
        block('evidence', 'characters-source', 'document', { eyebrow: '자료와 해석', title: '행동의 방향을 남기는 관계도.', body: '인물과 행동은 이 페이지를 위한 창작 설정입니다. 실제 작품에 적용할 때는 각 관계를 확인한 행동·대사·장면 위치를 함께 남깁니다. 한 방향의 도움과 양방향의 대립은 서로 다른 관계로 유지합니다.', image: '', caption: '', cite: '창작 예시 · 실제 작품의 대사·장면 미사용' }),
        block('cta', 'characters-next', 'centered', { eyebrow: '다시 보기', title: '선택을 알면, 관계도 다르게 보입니다.', body: '서윤의 선택이 누구의 목적과 이어지는지 네 사람의 관계에서 다시 읽어 보세요.', actionLabel: '네 사람의 소개로 돌아가기' })
      ], 'vertical')
    },
    {
      id: 'broadcast-flow', name: '방송 흐름과 편집 후보', category: '방송 · 시각과 순서', preferredProfile: 'editor',
      description: '두 방송의 원형 평행 시간선과 후보 표를 쓰는 시작본입니다. 미입력 시각과 검토 상태를 명시합니다.',
      document: document('방송의 흐름에서, 다시 볼 구간으로.', '방송 기록과 후보 구간을 작성하는 예시입니다. 실제 방송 시각이나 검증된 컷을 생성한 것이 아닙니다.', 'editor', [
        block('hero', 'broadcast-hero', 'split', { eyebrow: '방송 흐름 / 작성 예시', title: '방송의 흐름에서,\n다시 볼 구간으로.', body: '두 방송의 장면과 편집 후보를 구분하는 작성 시작본입니다. 원본 영상과 시각은 아직 입력하지 않았으며, 아래 후보는 확정한 컷이 아닙니다.', image: 'public-workbench', caption: '기존 편집 작업실 화면 · 아래 방송 기록은 작성 예시', actionLabel: '방송 순서 살펴보기' }),
        authoredPattern('broadcast-parallel', 'parallel-timeline', '여러 방송의 장면을 나란히 읽습니다.', '방송 A·B의 장면을 나누어 기록하는 작성 예시입니다. 각 시각은 원본에서 확인해 넣습니다.', section => {
          section.groups.forEach((group, index) => { group.title = ['방송 A', '방송 B'][index]; });
          nameItems(section, [['방송 A의 도입', '첫 방송의 도입 구간을 입력합니다.', 'A · 도입'], ['방송 B의 도입', '다른 방송의 도입 구간을 입력합니다.', 'B · 도입'], ['방송 A의 주요 장면', '첫 방송의 후보 구간을 입력합니다.', 'A · 후보'], ['방송 B의 주요 장면', '다른 방송의 후보 구간을 입력합니다.', 'B · 후보']]);
          section.items.forEach(entry => { entry.date = '원본 시각 입력'; delete entry.start; delete entry.end; delete entry.status; });
        }),
        block('comparison', 'broadcast-candidates', 'table', { eyebrow: '편집 후보', title: '후보와 확인한 컷을 구분합니다.', body: '후보마다 원본 구간과 선정 이유를 적고, 맥락을 확인한 뒤 결과에 담습니다.', items: [item('candidate-a', '후보 A', '원본 구간과 장면의 의미를 입력합니다.', { label: '검토 상태', value: '원자료 확인 전' }), item('candidate-b', '후보 B', '다른 시점과 앞뒤 맥락을 입력합니다.', { label: '검토 상태', value: '원자료 확인 전' })] }),
        block('evidence', 'broadcast-evidence', 'document', { eyebrow: '후보의 근거', title: '다시 찾을 수 있는 기록을 남깁니다.', body: '각 방송의 시각은 해당 원본을 기준으로 적습니다. 서로 같은 사건인지 확인한 뒤 보정 값을 별도로 남깁니다. 결과 영상의 누적 시각은 원본 시각과 구분합니다. 레인의 같은 행은 동시성을 보장하지 않습니다.', image: '', caption: '', cite: '작성 시작본 · 원본 영상 및 시각 미입력 · 후보 상태: 원자료 확인 전' }),
        block('cta', 'broadcast-next', 'banner', { eyebrow: '다시 살펴보기', title: '후보를 방송 흐름 안에서 확인하세요.', body: '같은 구간을 원본 순서에서 다시 읽고 선정 이유를 정리해 보세요.', actionLabel: '방송 흐름 처음으로 돌아가기' })
      ], 'vertical')
    },
    {
      id: 'event-merge-split', name: '사건 합류와 재분기', category: '이야기 · 갈래와 시간', preferredProfile: 'elio',
      description: '갈라진 사건 경로가 모이고 다시 나뉘는 구조를 실제 관계 표현으로 읽습니다.',
      document: document('정전이 끝난 뒤, 두 길이 남았습니다.', '기록보관소의 정전을 배경으로 한 창작 분기 이야기입니다. 실제 작품의 사건·시각을 주장하지 않습니다.', 'elio', [
        block('hero', 'events-hero', 'centered', { eyebrow: '사건의 갈래 / 창작 예시', title: '정전이 끝난 뒤,\n두 길이 남았습니다.', body: '제어실에서 전원을 찾는 서윤과 보관실에서 기록을 지키는 도현. 복도에서 만난 두 사람은 다음 행동을 결정합니다.', image: '', caption: '', actionLabel: '두 경로와 다음 선택 읽기' }),
        authoredPattern('events-lineage', 'evolving-timeline', '따로 움직인 두 사람, 복도에서의 합류', '합류 이전의 두 경로와 이후의 두 가능성입니다. 선의 라벨에서 만남과 선택의 조건을 나누어 읽습니다.', section => {
          nameItems(section, [['서윤 · 제어실', '정전 원인을 확인하고 비상 전원을 찾습니다.', '경로 A'], ['도현 · 보관실', '어둠 속에서 훼손될 기록을 모읍니다.', '경로 B'], ['공동 사건 · 복도의 재회', '비상등이 켜지자 두 사람이 복도에서 만나 정보를 나눕니다.', '두 경로 합류'], ['기록을 가지고 대피', '안전을 먼저 택하면 기록을 들고 건물 밖으로 나갑니다.', '대피를 선택하면'], ['남아서 전원을 복구', '복구를 택하면 제어실로 함께 돌아갑니다.', '복구를 선택하면']]);
          section.edges.forEach(edge => { edge.label = edge.kind === 'merge' ? '비상등이 켜진 뒤 복도에서 만남' : edge.to === 'c' ? '대피를 선택하면' : '복구를 선택하면'; });
          section.timeBasis = '창작 예시 · 경로와 읽기 순서. 작품 속 시각·소요 시간 미설정';
        }),
        block('focus', 'events-reading-order', 'reader', { eyebrow: '한 장면 더 읽기', title: '만남이 선택으로 바뀌는 순간', body: '두 관점과 공동 사건을 선택해 읽습니다. 이 목록의 순서는 사건의 동시성이나 소요 시간을 정하지 않습니다.', help: '', items: [item('event-read-start', '서윤의 관점', '비상 전원은 찾았지만 혼자서는 기록이 안전한지 알 수 없습니다.', { label: '경로 A', detail: '서윤은 불을 밝힌 뒤 다른 사람을 찾으러 복도로 나갑니다.', source: '기록보관소의 정전 · 창작 예시.' }), item('event-read-paths', '도현의 관점', '기록은 모았지만 어두운 복도로 옮길 수 없습니다.', { label: '경로 B', detail: '비상등이 켜진 뒤에야 기록을 들고 복도로 나갈 수 있습니다.', source: '기록보관소의 정전 · 창작 예시.' }), item('event-read-join', '복도에서의 재회', '두 사람은 전원과 기록의 상태를 서로에게 알립니다.', { label: '공동 사건', detail: '대피하면 안전을 먼저 확보합니다. 복구를 택하면 건물에 남아 전원 장치를 살펴봅니다. 두 결과는 선택에 따른 대안입니다.', source: '기록보관소의 정전 · 창작 예시. 이후 두 경로의 재합류는 설정하지 않았습니다.' })] }),
        block('accordion', 'events-questions', 'columns', { eyebrow: '경로의 의미', title: '갈래를 그리기 전에 확인할 것', body: '단순한 교차와 실제 합류를 구분해 읽습니다.', items: [item('event-same-time', '함께 보이면 동시에 일어난 일인가요?', '읽기 배치는 장면을 나란히 보여 줄 수 있습니다. 동시에 일어났다는 관계는 원자료에서 확인한 경우에만 적습니다.'), item('event-terminal', '모든 경로가 다시 만나나요?', '끝나는 경로와 계속되는 경로를 따로 남깁니다. 확인된 합류가 없는 경로를 하나로 잇지 않습니다.')] }),
        block('evidence', 'events-source', 'document', { eyebrow: '자료의 범위', title: '선택 뒤의 가능성을 함께 읽습니다.', body: '두 입력 경로는 복도에서 합류합니다. 이후 대피와 복구는 조건부 대안이며 두 경로의 재합류는 정하지 않았습니다. 실제 작품에 적용할 때는 장면 ID·선택 조건·끝나는 경로를 원자료와 함께 남깁니다.', image: '', caption: '', cite: '창작 예시 · 작품 속 시각 및 실제 게임 분기 데이터 미사용' }),
        block('cta', 'events-next', 'centered', { eyebrow: '다시 읽기', title: '각 경로의 끝에서 처음을 돌아보세요.', body: '읽기 순서와 사건 경로를 다시 살펴보며 이어지는 의미를 확인합니다.', actionLabel: '사건의 시작으로 돌아가기' })
      ], 'vertical')
    }
  ];

  if (global.CVA_SCENES) global.CVA_SCENES.templates.slice().reverse().forEach(template => {
    const blocks = template.compositions.map((id, index) => {
      const scene = global.CVA_SCENES.entries.find(entry => entry.id === id);
      if (!scene) throw new Error('등록된 확장 표현이 필요합니다: ' + id);
      // Keep the retained feedback section's published ID when removing the
      // unrelated ladder/comparison sections from this authored page.
      const position = template.id === 'scene-broadcast' && scene.variant === 'feedback-ring' ? 4 : index + 1;
      const result = block('scene-composition', template.id + '-' + position, scene.variant, scene.props);
      if (template.id === 'scene-story' && scene.variant === 'chapter-cover') result.props.items = [];
      if (template.id === 'scene-story' && scene.variant === 'evidence-focus') Object.assign(result.props, {
        eyebrow: '선택한 자료의 범위', title: '세 장면에서 읽은 것과 남은 맥락',
        body: '장면의 번호는 작품이 보여 준 읽기 순서입니다. 실제 기간이나 새로운 인과 관계를 뜻하지 않습니다.', image: '', caption: '',
        items: [item('evidence-scene', '원래 장면의 식별자', 'public-arrival / public-discovery / public-return. 사진과 설명은 각 장면의 ID에 함께 대응합니다.', {label:'제공된 Elio 자료'}), item('evidence-scope', '중간 장면은 생략했습니다.', '이 페이지는 창작 이야기 제2장 6막의 세 장면을 골라 읽는 예시입니다. 앞뒤 과정은 원래 이야기에서 이어 읽습니다.', {label:'선택 범위'})]
      });
      if (template.id === 'scene-items' && scene.variant === 'item-dossier') Object.assign(result.props, {
        eyebrow: '아이템 등장 기록 / 제공된 Elio 자료',
        items: [result.props.items[0], item('dossier-category', '그림과 장면이 있는 기록', '대표 이미지는 관측 기록이 등장하는 장면입니다. 독립된 아이템 도감 그림이나 장비 화면이 아닙니다.', {label:'자료의 종류'}), item('dossier-use', '장면의 맥락에서 읽습니다.', '위의 원래 장면 설명에서 등장 상황을 확인합니다. 도감 속 사용 효과나 능력치까지 주장하지 않습니다.', {label:'읽을 수 있는 것'}), item('dossier-condition', '획득 조건과 제작식', '제공된 장면 자료만으로 확정할 수 없어 표시하지 않았습니다. 원자료에서 확인한 뒤 해당 설정의 출처와 함께 보완합니다.', {label:'확인되지 않은 것'}), item('dossier-source', '자료의 출처', '창작 예제 장면 public-choice의 이름·설명·이미지를 사용했습니다.', {label:'출처'})]
      });
      result.orientation = 'vertical';
      return result;
    });
    if (template.id === 'scene-intro') blocks.push(
      block('split', 'scene-intro-workspace', 'media-left', {eyebrow:'TTaempad / 작업실 소개',title:'같은 순간을 비교하고, 필요한 컷을 담습니다.',body:'원본의 위치와 결과의 위치를 나누어 보고, 다른 시점의 맥락을 확인합니다. 이 캡처는 기존 작업실을 소개하는 정적 이미지입니다.',image:'public-workbench',caption:'기존 TTaempad 작업실 · 이 이미지에서 영상을 재생하거나 편집할 수 없습니다.'}),
      block('cta', 'scene-intro-next', 'banner', {eyebrow:'도구의 역할',title:'오늘 필요한 일부터 시작하세요.',body:'방송을 읽는 Loki, 컷을 담는 TTaempad, 작품을 따라가는 Elio의 역할을 다시 살펴보세요.',actionLabel:'도구 소개 처음으로 돌아가기'})
    );
    if (template.id === 'scene-items') blocks.push(block('evidence', 'scene-items-source', 'document', {
      eyebrow: '확인한 범위', title: '장면과 아이템 설정을 구분합니다.',
      body: '앞의 사진은 관측 기록이 등장하는 제공 장면입니다. 독립 아이템 그림·능력치·획득 조건·제작식은 확인하지 않았습니다. 실제 도감으로 확장할 때는 각 설정의 원문 위치를 따로 남깁니다.',
      image: '', caption: '', cite: '창작 예제 장면 · public-choice · 확인하지 않은 게임 수치·제작식은 수록하지 않음'
    }));
    entries.unshift({ ...template, document: document(template.name, template.description, template.preferredProfile, blocks) });
  });

  // Reading, comparison and working overviews need different measures even in
  // the same profile. These are the existing editable presentation axes, not
  // additional renderers or changes to the stored scene/relation model.
  function element(id, elementId, settings) {
    return block('interface',id,'bare',{elementId,settings:{...global.CVA_ELEMENTS.defaults(elementId),...settings}});
  }
  entries.push(
    {id:'observation-notebook',name:'관측 수첩 · 읽기와 단계',category:'읽기·섹션',preferredProfile:'elio',description:'한 장면의 메시지·읽는 단계·보충 설명을 텍스트 강조, 스크롤 목차, native 펼침으로 조합합니다.',document:document('작은 관측에서 시작한 이야기','CVA 창작 예시 · 자료의 읽는 순서와 실제 사건 시간을 구분합니다.','elio',[
      block('hero','notebook-cover','split',{eyebrow:'FIELD NOTES / 창작 예시',title:'오늘의 장면을,\n내일의 문장으로.',body:'오래 보고 싶은 순간을 고르고, 같은 자료에서 발견한 차이를 기록합니다.',image:'adaptive-notebook',caption:'CVA 창작 정물 · 관측 수첩',actionLabel:'관측 수첩 읽기'}),
      element('notebook-emphasis','text-emphasis',{variant:'underline',text:'먼저 보고,\n다음에 해석합니다.',caption:'관측한 사실과 떠오른 질문을 같은 문장에 섞지 않습니다.'}),
      element('notebook-reading','scroll-story',{variant:'sticky',title:'해안의 아침을 읽는 세 단계',body:'목차에서 이동하거나 같은 본문을 이어 읽으세요.',steps:'장면을 바라보기 | 창작 풍경 속 수평선과 작은 등대를 먼저 살펴봅니다. 이 페이지는 실제 관측 기록이 아닙니다.\n차이를 적어 보기 | 밝은 부분과 그늘의 위치를 비교합니다. 보이는 것과 해석한 의미를 나누어 적습니다.\n질문을 남기기 | 다음 장면에서 다시 확인할 질문을 남깁니다. 읽는 위치는 기록 완료를 뜻하지 않습니다.'}),
      element('notebook-notes','disclosure',{title:'읽기 뒤에 남기는 질문',items:'무엇을 다시 볼까요? | 같은 장면에서 빛과 색이 달라지는 부분을 다시 살펴봅니다.\n어디까지가 창작인가요? | 이 페이지의 이미지와 문장은 디자인을 확인하기 위한 창작 예시입니다.\n내 자료로 바꾸려면? | 제작실에서 제목과 설명을 바꾸고 편집 JSON으로 보관합니다.'})
    ])},
    {id:'record-workshop',name:'기록 폼 · 입력과 확인',category:'입력·섹션',preferredProfile:'forma',description:'라벨·검증·선택·범위·확인 대화상자를 조합한 로컬 입력 연습입니다. 서버 저장을 가장하지 않습니다.',document:document('기록하기 전에 확인할 것','입력과 결과 확인의 동작을 살펴보는 로컬 예제입니다. 입력값을 서버에 저장하지 않습니다.','forma',[
      block('text','record-intro','prose',{eyebrow:'LOCAL FORM / 입력 연습',title:'무엇을 기록할지,\n분명하게 정해 보세요.',body:'입력값을 확인하고, 필요한 선택을 고른 뒤 결과를 읽습니다. 이 예제는 서버로 전송하거나 저장하지 않습니다.'}),
      element('record-form','form-group',{variant:'contact',title:'오늘의 관측 메모',description:'이름과 메모를 입력하고 입력 확인을 누르세요. 이 페이지 안에서만 결과를 보여줍니다.',buttonLabel:'입력 확인'}),
      element('record-range','range',{variant:'steps',label:'관측 시간 예시',min:10,max:60,value:30,step:10,unit:'분'}),
      element('record-choices','form-group',{variant:'segmented',title:'다음에 살펴볼 대상',description:'키보드 방향키나 터치로 한 항목을 고르세요.',options:'장면의 빛\n인물의 선택\n이야기의 갈래',buttonLabel:'선택 확인'}),
      element('record-confirm','overlay',{variant:'dialog',title:'입력과 보관은 다른 단계입니다',body:'입력 확인은 현재 페이지의 결과를 읽는 단계입니다. 장기 보관이 필요하면 실제 서비스의 저장 기능을 연결해야 합니다. 디자인 구성은 제작실의 편집 JSON으로 보관할 수 있습니다.',trigger:'보관 범위 확인',closeLabel:'입력으로 돌아가기'})
    ])},
    {id:'media-observatory',name:'이미지·데이터 관측실',category:'미디어·데이터',preferredProfile:'cham',description:'이미지 비교·가로 탐색·수치와 원자료를 한 페이지에 조립합니다. 창작 자료와 실제 값을 구분합니다.',document:document('같은 기준에서, 다른 장면을 읽습니다.','이미지와 수치를 비교하는 CVA 창작 예시입니다. 실제 관측이나 전후 효과를 주장하지 않습니다.','cham',[
      block('text','observatory-intro','prose',{eyebrow:'VISUAL OBSERVATORY / 창작 예시',title:'다른 장면을,\n같은 기준에서 읽습니다.',body:'두 이미지의 차이를 먼저 살펴보고, 기록의 단위와 원자료를 확인하세요. 이 페이지의 그림과 수치는 디자인을 확인하기 위한 창작 예시입니다.'}),
      element('observatory-grid','section-grid',{variant:'asymmetric',title:'다르게 읽는 세 가지 방법',body:'이미지의 차이, 설명의 순서, 수치의 기준을 각각 살펴봅니다.',image:'adaptive-coast',items:'장면 비교 | 두 창작 풍경을 가림막으로 살펴봅니다. 같은 장소의 시간 변화가 아닙니다.\n순서대로 읽기 | 가로 목록에서 현재 항목과 설명을 함께 읽습니다.\n기준 확인 | 수치가 0인지 아직 기록되지 않았는지 구분합니다.'}),
      element('observatory-compare','image-compare',{variant:'wipe',title:'두 창작 풍경을 나란히',body:'가림막을 움직여 그림의 차이를 살펴보세요. 같은 장소의 전후 사진이 아닙니다.',beforeImage:'adaptive-coast',afterImage:'adaptive-greenhouse',beforeLabel:'창작 · 해안',afterLabel:'창작 · 온실'}),
      element('observatory-gallery','carousel',{variant:'gallery',title:'장면마다 다른 읽기',items:'해안의 빛 | 넓은 수평선과 작은 등대가 시선을 이끕니다.\n온실의 길 | 밝은 내부와 차가운 외부의 대비를 읽습니다.\n수첩의 표면 | 기록 도구의 재료와 질감을 살펴봅니다.',image1:'adaptive-coast',image2:'adaptive-greenhouse',image3:'adaptive-notebook'}),
      element('observatory-data','data-inspector',{variant:'compare',title:'기록의 수를 같은 단위로',body:'창작 예시입니다. 빈 칸은 미기록이며 0과 구분합니다.',data:'첫 주 | 0 | 3\n둘째 주 | 5 | 8\n셋째 주 | 7 | \n넷째 주 | 4 | 6',firstName:'장면 기록',secondName:'질문 기록',unit:'개',citation:'CVA 창작 수치 · 실제 작업 성과가 아닙니다.'})
    ])}
  );

  // The same section recipes are consumed by standalone authoring and Studio
  // insertion. A page remains the existing flat module list after composition.
  if (!global.CVA_SECTIONS) throw new Error('CVA_SECTIONS must load before CVA_TEMPLATES');
  const sectionBlocks = (id, namespace, profile) => global.CVA_SECTIONS.create(id, { namespace, profile }).modules;
  const finish = (id, title, body) => block('cta', id, 'banner', { eyebrow: '다시 읽기', title, body, actionLabel: '페이지 처음으로 돌아가기', actionHref: '' });
  const opening = (id, eyebrow, title, body, image, caption, actionLabel = '본문 읽기', variant = 'split') => block('hero', id, variant, { eyebrow, title, body, image, caption, actionLabel });
  entries.push(
    { id: 'chapter-gateway', name: 'Elio 장·회차의 문', category: '이야기 · 장의 시작', purpose: 'story', preferredProfile: 'elio', density: 'spacious', measure: 'wide',
      description: '큰 표지·장면 캡션·읽기 단계로 한 장의 범위를 안내하고 첫 기록으로 돌아옵니다.',
      document: document('유리의 해안 · 불빛이 사라진 밤', '큰 장면에서 시작해 세 번의 질문으로 읽는 CVA 창작 단편의 진입 페이지입니다.', 'elio', [
        ...sectionBlocks('chapter-opening', 'gateway-cover', 'elio'),
        ...sectionBlocks('scene-gallery', 'gateway-scenes', 'elio'),
        ...sectionBlocks('reading-route', 'gateway-route', 'elio'),
        ...sectionBlocks('reading-finale', 'gateway-end', 'elio')
      ]) },
    { id: 'scene-essay', name: 'Elio 한 장면의 에세이', category: '이야기 · 깊게 읽기', purpose: 'story', preferredProfile: 'elio', density: 'spacious', measure: 'reading',
      description: '한 장면의 관찰·해설·질문·출처를 편집 글의 리듬으로 이어 읽습니다.',
      document: document('마른 편지가 놓여 있던 자리', '관찰과 해석을 다른 문장으로 남기는 「유리의 해안」 창작 해설입니다.', 'elio', [
        opening('essay-cover', 'SCENE ESSAY / 창작 단편', '눈앞의 장면에서,\n아직 모르는 이야기로.', '한 통의 편지가 발견된 자리를 천천히 읽습니다. 본 것과 짐작한 것을 구분하면 다음 질문이 선명해집니다.', '', '', '편지가 놓인 장면 읽기', 'centered'),
        ...sectionBlocks('scene-essay', 'essay-main', 'elio'),
        ...sectionBlocks('source-notes', 'essay-source', 'elio'),
        finish('essay-return', '장면을 다시 보면, 무엇이 달라질까요.', '첫 문장으로 돌아가 관찰과 질문을 다시 읽어 보세요.')
      ]) },
    { id: 'character-perspective', name: 'Elio 인물의 두 관점', category: '인물 · 경험과 진술', purpose: 'relations', preferredProfile: 'elio', density: 'comfortable', measure: 'wide',
      description: '인물 선택과 상세, 같은 질문의 비교로 기억과 확인한 사실의 차이를 읽습니다.',
      document: document('유안과 서하 · 같은 빛의 다른 기억', '인물이 경험한 범위에서 같은 사건을 다시 읽는 창작 관점 페이지입니다.', 'elio', [
        opening('perspective-cover', 'CHARACTER NOTES / 창작 단편', '누구의 기억에서\n이야기를 읽을까요.', '유안은 새벽의 편지를 기억하고, 서하는 밤의 빛을 기억합니다. 서로가 모르는 부분을 먼저 확인해 보세요.', '', '', '인물의 기록 선택하기', 'centered'),
        ...sectionBlocks('perspective-compare', 'people-main', 'elio'),
        ...sectionBlocks('source-notes', 'people-source', 'elio'),
        finish('perspective-return', '두 기록 사이에 남은 질문을 살펴보세요.', '인물의 진술을 고른 뒤, 직접 확인한 범위와 아직 모르는 부분을 다시 비교합니다.')
      ]) },
    { id: 'clue-notebook', name: '단서와 용어의 수첩', category: '기록 · 단서와 해설', purpose: 'items', preferredProfile: 'forma', density: 'comfortable', measure: 'reading',
      description: '단서의 이름을 빠르게 훑고, 필요한 해설과 남은 질문만 펼쳐 읽습니다.',
      document: document('편지·실·손전등 · 세 가지 단서 수첩', '이름에서 해설로, 해설에서 출처로 돌아가는 창작 자료 수첩입니다.', 'forma', [
        opening('clue-cover', 'CLUE NOTEBOOK / 창작 단편', '이름을 기억하면,\n장면을 다시 찾을 수 있습니다.', '등대와 온실에 남은 작은 물건을 모았습니다. 발견한 상태와 추측한 연결을 각각 읽어 보세요.', 'adaptive-notebook', 'CVA 창작 정물 · 단서 수첩의 표지', '세 가지 단서 읽기', 'editorial'),
        ...sectionBlocks('clue-index', 'clues-main', 'forma'),
        ...sectionBlocks('source-notes', 'clues-source', 'forma'),
        finish('clue-return', '아직 연결하지 않은 단서도 남겨 둡니다.', '알 수 없는 부분을 빈칸으로 보존한 채, 각 단서가 처음 등장한 맥락을 다시 살펴보세요.')
      ]) },
    { id: 'world-fieldguide', name: 'Elio 장소와 세계의 안내', category: '세계 · 장소의 역할', purpose: 'items', preferredProfile: 'elio', density: 'comfortable', measure: 'wide',
      description: '장소의 역할과 전체 범위를 읽으며 실측 지도와 개념 삽화를 구분합니다.',
      document: document('해안길에서 온실까지 · 장소의 작은 안내', '좌표나 거리를 만들지 않고 창작 장소의 역할을 설명하는 페이지입니다.', 'elio', [
        opening('world-cover', 'WORLD FIELDGUIDE / 창작 단편', '이야기가 머무는 곳을\n한 장소씩 읽습니다.', '어떤 장소는 질문을 시작하고, 다른 장소는 그 질문을 새로운 사람에게 건넵니다. 세 장소의 역할을 따라가 보세요.', 'adaptive-greenhouse', 'CVA 창작 풍경 · 눈 속의 온실', '장소의 역할 살펴보기', 'immersive'),
        ...sectionBlocks('world-overview', 'world-main', 'elio'),
        ...sectionBlocks('source-notes', 'world-source', 'elio'),
        finish('world-return', '장소를 기억하며, 장면으로 돌아갑니다.', '처음 읽은 장소의 역할과 그곳에 남은 질문을 함께 떠올려 보세요.')
      ]) },
    { id: 'choice-review', name: 'Elio 선택 경로의 회고', category: '이야기 · 조건과 경로', purpose: 'story', preferredProfile: 'elio', density: 'comfortable', measure: 'wide',
      description: '공통 질문·두 조사 경로·검토의 합류와 각 경로의 한계를 같은 화면에 둡니다.',
      document: document('편지의 출처를 묻는 두 가지 길', '실제 게임 분기를 주장하지 않는 창작 조사 경로의 비교 페이지입니다.', 'elio', [
        opening('choice-cover', 'ROUTE REVIEW / 창작 조사', '같은 질문에서,\n다른 근거를 찾습니다.', '해안에서 흔적을 찾을지, 밤의 빛을 본 사람에게 물을지. 조사 경로가 줄 수 있는 답의 범위를 먼저 비교합니다.', '', '', '두 경로와 조건 읽기', 'centered'),
        ...sectionBlocks('choice-dossier', 'choices-main', 'elio'),
        ...sectionBlocks('source-notes', 'choices-source', 'elio'),
        finish('choice-return', '다음 선택은 어떤 근거를 필요로 하나요.', '같은 질문으로 돌아가 지금 가진 입력과 아직 필요한 자료를 나누어 보세요.')
      ]) },
    { id: 'record-introduction', name: '작품과 기록 모음의 소개', category: '소개 · 기록의 입구', purpose: 'intro', preferredProfile: 'ttaem', density: 'spacious', measure: 'wide',
      description: '대표 메시지·내용 bento·자료 묶음·출처를 조합해 기록 전체의 성격을 소개합니다.',
      document: document('유리의 해안 · 작은 기록 보관함', '한 장면·인물·장소·단서로 접근하는 창작 기록 모음의 소개 페이지입니다.', 'ttaem', [
        ...sectionBlocks('record-introduction', 'record-main', 'ttaem'),
        block('cards', 'record-materials', 'featured', { eyebrow: '보관하는 자료', title: '긴 이야기에도, 다시 찾을 이름이 있습니다.', body: '자료가 맡은 역할을 기억해 두면 다음 읽기의 시작점을 고르기 쉽습니다.', items: [item('record-scene', '장면 해설', '한 문장에서 시작해 관찰과 질문을 천천히 읽는 기록입니다.', { image: 'adaptive-coast', label: '깊게 읽기' }), item('record-person', '인물의 진술', '같은 장면을 서로 다르게 기억하는 범위를 비교합니다.', { image: 'adaptive-greenhouse', label: '나란히 읽기' }), item('record-clue', '단서 수첩', '작은 물건의 이름과 발견한 상태를 빠르게 찾아봅니다.', { image: 'adaptive-notebook', label: '찾아 읽기' })] }),
        ...sectionBlocks('source-notes', 'record-source', 'ttaem'),
        finish('record-return', '지금 궁금한 질문에서 다시 시작하세요.', '페이지 처음에서 기록의 갈래를 살펴보고, 내 자료에 필요한 읽는 방식을 골라 보세요.')
      ]) },
    { id: 'image-comparison-record', name: '이미지의 비교와 해설 기록', category: '이미지 · 같은 질문의 비교', purpose: 'intro', preferredProfile: 'forma', density: 'comfortable', measure: 'wide',
      description: '직접 움직이는 이미지 비교와 동일 기준의 관찰표를 연결하고 해석의 범위를 남깁니다.',
      document: document('수평선과 온실의 문 · 빛을 읽는 기록', '서로 다른 두 창작 이미지에서 시선과 대비를 살펴보는 페이지입니다.', 'forma', [
        ...sectionBlocks('image-inspection', 'images-main', 'forma'),
        block('comparison', 'image-observations', 'table', { eyebrow: '같은 질문으로 읽기', title: '밝은 곳과 시선의 방향을 적어 봅니다.', body: '두 창작 그림에서 보이는 시각적 차이입니다. 실제 조도나 효과를 측정한 값은 아닙니다.', labelHeading: '가장 밝은 부분', valueHeading: '시선이 이어지는 방향', bodyHeading: '함께 볼 요소', items: [item('image-coast', '해안 풍경', '작은 등대와 넓은 여백이 장면의 크기를 함께 보여 줍니다.', { label: '수평선 가까이의 하늘', value: '넓게 펼쳐지는 가로 방향' }), item('image-greenhouse', '온실 풍경', '눈 덮인 길과 밝은 문이 장면의 안쪽을 가리킵니다.', { label: '온실의 문과 내부', value: '문을 향해 모이는 안쪽 방향' })] }),
        block('quote', 'image-reading-question', 'card', { eyebrow: '다음 관찰', title: '그림이 달라져도, 질문은 이어집니다.', body: '처음 눈이 머무는 곳을 찾고, 그다음 시선이 어디로 움직이는지 살펴보세요.', cite: 'CVA가 작성한 이미지 읽기 안내 · 사용자 관찰 결과를 자동 측정하지 않습니다.' }),
        block('evidence', 'image-source', 'document', { eyebrow: '이미지의 출처', title: '서로 다른 두 창작 삽화입니다.', body: '해안과 온실은 CVA의 기존 창작 자산입니다. 이 기록은 두 그림의 빛과 시선 방향을 해설합니다. 같은 장소의 시간 변화나 디자인 개선의 전후 효과를 다루지는 않습니다.', image: '', caption: '', cite: 'CVA 창작 자산 · adaptive-coast / adaptive-greenhouse' }),
        finish('image-return', '처음 눈이 머물렀던 곳으로 돌아갑니다.', '비교 가림막을 움직여, 같은 질문에서 두 이미지를 다시 살펴보세요.')
      ]) }
  );
  entries.push(
    { id: 'illuminated-story', name: '빛과 문장으로 읽는 이야기', category: '이야기 · 분위기와 읽기선', purpose: 'story', preferredProfile: 'elio', density: 'spacious', measure: 'wide',
      description: '큰 창작 장면과 조용한 조명, 문장 표식과 일반 문서형 읽기선을 조합합니다.',
      document: document('유리의 해안 · 질문을 따라 남은 빛', '기존 창작 이야기의 관찰과 남은 질문을 빛·문장·읽기선으로 읽는 페이지입니다.', 'elio', [
        opening('light-cover', '유리의 해안 / 창작 단편', '불빛은 사라져도,\n질문은 이어집니다.', '새벽의 편지와 전날 밤의 빛. 서로 다른 두 기록을 읽고, 아직 모르는 연결을 남깁니다.', 'adaptive-coast', 'CVA 창작 해안 삽화 · 실제 작품이나 방송의 장면이 아닙니다.', '첫 장면 읽기', 'editorial'),
        ...sectionBlocks('light-and-scene', 'light-mood', 'elio'),
        ...sectionBlocks('reading-thread', 'light-thread', 'elio'),
        ...sectionBlocks('source-notes', 'light-source', 'elio'),
        element('light-return', 'action-button', { variant: 'link', appearance: 'glow', label: '첫 장면 다시 읽기', url: '#light-cover' })
      ]) },
    { id: 'annotation-workshop', name: '한 문장을 남기는 기록 작업실', category: '기록 · 확인과 복사', purpose: 'intro', preferredProfile: 'editor', density: 'comfortable', measure: 'reading',
      description: '메모 읽기·글자 확인·실제 복사를 먼저 놓고, 짧은 문장 강조와 다음 읽기를 연결합니다.',
      document: document('읽은 장면에서, 한 문장을 남깁니다.', '로컬 메모 확인과 실제 복사를 기존 읽기 자료와 연결하는 기록 페이지입니다.', 'editor', [
        block('text', 'annotation-intro', 'prose', { eyebrow: '읽은 뒤의 기록', title: '한 장면을 읽고,\n내 문장으로 남깁니다.', body: '아래 메모를 직접 고쳐 줄과 글자를 확인하세요. 다음에 살펴볼 질문은 별도로 복사할 수 있습니다. 입력은 이 페이지에서 확인하며 자동 저장하거나 전송하지 않습니다.' }),
        ...sectionBlocks('note-action', 'annotation-task', 'editor'),
        element('annotation-reminder', 'text-emphasis', { variant: 'lift', text: '확인한 것은 또렷하게,\n모르는 것은 질문으로.', caption: '재생하지 않아도 문장 전체를 읽을 수 있습니다.' }),
        element('annotation-return', 'scroll-story', { variant: 'document', title: '기록을 다시 살펴볼 때', body: '내 메모를 읽는 순서입니다. 작업 완료율이나 평가 점수가 아닙니다.', steps: '이름과 장면 | 누구의 어느 장면인지 먼저 확인합니다.\n사실과 질문 | 직접 확인한 내용과 아직 모르는 연결을 다른 문장에 적습니다.\n다시 볼 자료 | 다음에 살펴볼 원자료를 남깁니다. 이 창작 예시는 실제 작품의 출처를 대신하지 않습니다.' }),
        block('cta', 'annotation-first', 'banner', { eyebrow: '다시 다듬기', title: '질문이 달라졌다면, 메모도 바꿔 봅니다.', body: '처음 적은 문장으로 돌아가 확인한 범위와 남은 질문을 다시 읽어 보세요.', actionLabel: '기록 처음으로', actionHref: '#annotation-intro' })
      ]) }
  );

  entries.push(
    { id: 'reader-notebook', name: '갈래를 따라 읽는 이야기 수첩', category: '이야기 · 기록과 읽기', purpose: 'story', preferredProfile: 'elio', density: 'spacious', measure: 'reading',
      description: '큰 장면에서 출발해 기록의 갈래를 읽고, 곁에 둔 자료 안내와 세 가지 질문으로 다시 살펴봅니다.',
      document: document('유리의 해안 · 편지의 가장자리에서', '서로 다른 기록을 성급히 잇지 않고, 직접 본 것과 남은 질문을 읽는 CVA 창작 이야기 수첩입니다.', 'elio', [
        opening('reader-cover', '유리의 해안 / 창작 이야기 수첩', '편지의 가장자리에서,\n다음 질문을 읽습니다.', '새벽에 발견한 편지와 전날 밤의 빛. 같은 답으로 묶기 전에 각 기록이 말하는 범위를 읽어 봅니다.', 'adaptive-coast', 'CVA 창작 해안 삽화 · 실제 작품이나 방송의 장면이 아닙니다.', '기록의 갈래 읽기', 'editorial'),
        ...sectionBlocks('reading-index', 'reader-index', 'elio'),
        block('split', 'reader-greenhouse', 'image-led', { eyebrow: '서하의 기록 / 창작 장면', title: '빛을 보았다는 말은,\n출처를 안다는 말과 다릅니다.', body: '서하는 전날 밤 길을 비추던 빛을 기억합니다. 유안이 등대 계단에서 편지를 발견한 것은 그다음 새벽입니다. 다른 시간의 두 기록을 하나의 사건으로 단정하지 않습니다.', image: 'adaptive-greenhouse', caption: 'CVA 창작 온실 삽화 · 기억의 분위기를 보여 주며 빛의 출처를 증명하지 않습니다.' }),
        block('quote', 'reader-pause', 'editorial', { eyebrow: '읽는 사이에', title: '모르는 연결을 남겨 두어도,\n기록은 앞으로 나아갑니다.', body: '확인한 문장과 다음에 물을 질문을 다른 줄에 둡니다.', cite: '「유리의 해안」을 위해 작성한 창작 문장' }),
        element('reader-questions', 'controlled-tabs', { variant: 'stepper', title: '내 질문을 다듬는 세 번의 읽기', items: '장소를 확인하기 | 편지가 놓인 곳은 등대 계단입니다. 발견 장소를 작성 장소로 바꾸어 읽지 않습니다.\n진술의 범위 읽기 | 서하는 빛을 보았다고 말했습니다. 어디에서 나온 빛인지는 확인하지 못했습니다.\n남은 질문 적기 | 편지의 작성자와 빛의 출처는 아직 모릅니다. 이 순서는 읽는 안내이며 조사 완료를 뜻하지 않습니다.', selected: 1 }),
        block('evidence', 'reader-source', 'document', { eyebrow: '작성과 자료', title: '이 수첩에 실린 기록의 출처', body: '인물·사건·편지의 문장은 CVA가 「유리의 해안」을 위해 작성했습니다. 해안과 온실은 기존 CVA 창작 삽화입니다. 이 페이지는 독자가 기록을 골라 읽는 예시이며 원래 Elio 사건·관계 자료를 바꾸거나 공개하지 않습니다.', image: '', caption: '', cite: 'CVA 창작 예시 · 실제 작품·방송·관측 기록이 아닙니다.' }),
        finish('reader-return', '처음 읽은 문장이 달라 보이나요.', '첫 기록으로 돌아가 처음 알았던 것과 지금 남은 질문을 나란히 읽어 보세요.')
      ]) },
    { id: 'next-record-desk', name: '다음 기록을 준비하는 메모 책상', category: '기록 · 메모와 다음 읽기', purpose: 'intro', preferredProfile: 'editor', density: 'comfortable', measure: 'reading',
      description: '내 문장을 먼저 고치고 로컬에서 확인한 뒤, 자료 안내와 다음에 읽을 문장 수를 따로 살펴봅니다.',
      document: document('확인한 한 문장부터, 다음 기록으로', '편집한 메모·고정 자료 안내·다음 읽기의 분량을 구분하는 CVA의 로컬 기록 책상입니다.', 'editor', [
        opening('desk-cover', '유리의 해안 / 로컬 메모 책상', '확인한 한 문장부터,\n다음 기록을 준비합니다.', '보았던 사실을 내 문장으로 고쳐 보세요. 메모 확인과 자료 안내의 확인은 서로 다른 행동이며, 이 페이지 밖으로 저장하거나 전송하지 않습니다.', 'adaptive-notebook', 'CVA 창작 수첩 삽화 · 내 메모를 위한 시작 화면', '내 메모 다듬기', 'editorial'),
        ...sectionBlocks('note-and-detail', 'desk-note', 'editor'),
        element('desk-next-amount', 'range', { variant: 'buttons', label: '다음에 천천히 읽을 문장 수', min: 1, max: 6, value: 2, step: 1, unit: '문장' }),
        block('text', 'desk-amount-note', 'notice', { eyebrow: '다음 읽기의 분량', title: '적은 문장부터 다시 살펴봅니다.', body: '문장 수는 다음 읽기를 계획해 보는 값입니다. 이 값을 골라도 앞의 메모를 자르거나 다른 기록을 열지는 않습니다. 필요한 만큼 읽은 뒤 내 문장으로 돌아와 새로 알게 된 것을 보태 보세요.' }),
        block('split', 'desk-open-question', 'image-led', { eyebrow: '다음 기록 / 창작 장면', title: '온실의 문 너머에,\n아직 남은 말이 있습니다.', body: '유안은 편지의 주인을 찾지 못했습니다. 대신 밤의 빛을 보았다는 사람을 만났습니다. 다음 메모에는 새로 들은 진술과 여전히 모르는 것을 따로 적을 수 있습니다.', image: 'adaptive-greenhouse', caption: 'CVA 창작 온실 삽화 · 다음 대화를 떠올리는 장면' }),
        finish('desk-return', '질문이 달라졌다면, 문장도 다시 읽어 봅니다.', '처음의 메모로 돌아가 직접 확인한 범위와 아직 모르는 연결을 다른 문장에 남겨 보세요.')
      ]) }
  );

  entries.push(
    { id: 'comparison-notebook', name: '두 자료를 읽는 비교 수첩', category: '자료 · 선택과 비교', purpose: 'intro', preferredProfile: 'forma', density: 'comfortable', measure: 'wide',
      description: '장면 직접 선택, 전체 이미지 전환·겹침, 부호가 있는 차이와 원자료를 같은 질문으로 읽습니다.',
      document: document('같은 질문으로, 두 자료를 읽습니다.', '이미지의 구도와 창작 수치의 차이를 구분해 살펴보는 CVA 비교 수첩입니다.', 'forma', [
        opening('comparison-cover', 'FIELD NOTES / 창작 비교 수첩', '같은 질문으로,\n두 자료를 읽습니다.', '먼저 보고 싶은 장면을 고르세요. 그림의 차이와 수치의 차이를 각각 확인하고, 아직 모르는 것은 질문으로 남깁니다.', 'adaptive-notebook', 'CVA 창작 수첩 삽화 · 비교의 질문을 남기는 자리', '비교할 자료 고르기', 'editorial'),
        ...sectionBlocks('media-contact-sheet', 'comparison-pick', 'forma'),
        ...sectionBlocks('same-question-comparison', 'comparison-read', 'forma'),
        block('evidence', 'comparison-source', 'document', { eyebrow: '자료의 범위', title: '보이는 것과 계산한 값을 구분합니다.', body: '해안·온실·수첩은 기존 CVA 창작 삽화입니다. 질문의 개수는 상호작용 설명을 위한 가상 수치이며 이미지에서 계산하지 않았습니다. 실제 자료를 넣을 때에는 같은 단위·기간·조건인지 먼저 확인하세요.', image: '', caption: '', cite: 'CVA 창작 예시 · 실제 작품·관측·성과 자료가 아닙니다.' }),
        finish('comparison-return', '질문을 바꿔, 다시 읽어 보세요.', '정답을 고르는 대신 어떤 자료가 질문에 답하는지 살펴보는 수첩입니다.')
      ]) },
    { id: 'scene-collection-lab', name: '장면 서가와 자료의 층', category: '이야기 · 자료와 실험', purpose: 'items', preferredProfile: 'elio', density: 'comfortable', measure: 'wide',
      description: '자료를 소속별로 읽고 원하는 장면을 직접 고른 뒤, 수치 기준과 개념의 층을 따로 살펴봅니다.',
      document: document('장면은 한곳에, 질문은 각자의 자리에.', '유리의 해안의 장소·진술·질문을 함께 두되 서로 다른 자료의 의미를 섞지 않는 Elio 스타일 서가입니다.', 'elio', [
        opening('collection-cover', '유리의 해안 / 자료의 서가', '장면은 한곳에,\n질문은 각자의 자리에.', '장소를 골라보고, 기록을 정렬하고, 원자료와 해설의 층을 나누어 읽습니다. 장식이나 수치가 이야기의 사실을 대신하지 않습니다.', 'adaptive-greenhouse', 'CVA 창작 온실 삽화 · 이야기의 자료를 펼쳐 놓는 장소', '자료의 서가 살펴보기'),
        ...sectionBlocks('grouped-records', 'collection-index', 'elio'),
        element('collection-scenes', 'carousel', { variant: 'vertical', title: '세 장면을 위아래로 이어 읽습니다.', items: '해안의 편지 | 유안은 등대 계단에서 마른 편지를 발견했습니다. 장소는 알지만 작성자는 아직 모릅니다.\n온실의 대화 | 서하는 빛을 보았다고 말합니다. 진술과 빛의 출처를 같은 사실로 합치지 않습니다.\n다음의 질문 | 이미 아는 것을 반복하기보다 확인할 단서를 다른 문장으로 남깁니다.', image1: 'adaptive-coast', image2: 'adaptive-greenhouse', image3: 'adaptive-notebook', smooth: false }),
        ...sectionBlocks('scene-surface-lab', 'collection-lab', 'elio'),
        finish('collection-return', '다른 층에서도, 같은 자료로 돌아옵니다.', '이 서가는 원래 Elio의 사건·관계 입력을 바꾸지 않는 창작 예시입니다. 자료를 읽은 뒤 자신의 문장과 질문으로 바꿔 보세요.')
      ]) }
  );

  entries.push(
    { id: 'scene-reading-room', name: 'Elio 찾아 읽는 자료실', category: '이야기 · 검색과 상세', purpose: 'story', preferredProfile: 'elio', density: 'comfortable', measure: 'wide',
      description: '필요한 기록을 찾고 큰 그림과 원문을 자세히 읽는 장면 자료실입니다.',
      document: document('찾은 문장에서,\n다음 장면으로.', '「유리의 해안」의 장소·인물·기록을 찾아 읽는 CVA 창작 자료실입니다.', 'elio', [
        opening('reading-room-cover', '유리의 해안 / 창작 단편의 자료실', '찾은 문장에서,\n다음 장면으로.', '유안의 편지와 서하의 기억을 나란히 두었습니다. 궁금한 이름을 찾고, 그림과 문장을 천천히 펼쳐 보세요.', 'adaptive-greenhouse', 'CVA 창작 삽화 · 눈 속에 불빛이 남은 온실', '자료 서가로'),
        ...sectionBlocks('searchable-reading-shelf', 'reading-room-shelf', 'elio'),
        ...sectionBlocks('illustrated-reading', 'reading-room-source', 'elio'),
        finish('reading-room-return', '읽은 뒤에도, 남겨 둘 질문이 있습니다.', '편지는 누가 놓았을까요. 서하가 본 빛은 어디에서 왔을까요. 서로 다른 질문을 한 문장으로 서둘러 합치지 않습니다.')
      ]) },
    { id: 'reading-fieldnotes', name: 'Forma 읽기와 발췌 노트', category: '자료 · 읽기와 보관', purpose: 'intro', preferredProfile: 'forma', density: 'comfortable', measure: 'reading',
      description: '원문 확인과 별도의 발췌 보관을 구분하며 읽을 내용을 정리합니다.',
      document: document('읽은 것을,\n자신의 문장으로 남기세요.', '원문을 확인하고 관찰·진술·질문을 구분해 발췌하는 CVA 창작 예시입니다.', 'forma', [
        opening('fieldnotes-cover', 'FIELD NOTES / 읽기와 발췌', '읽은 것을,\n자신의 문장으로 남기세요.', '원문의 길이를 확인하고, 보관할 발췌는 따로 읽어 봅니다. 사실과 해석 사이에 작은 여백을 남겨두세요.', 'adaptive-notebook', 'CVA 창작 삽화 · 관찰과 질문을 적는 수첩', '원문과 발췌 읽기', 'editorial'),
        block('text', 'fieldnotes-method', 'prose', { eyebrow: '두 가지 문서', title: '원문은 확인하고, 발췌는 골라 남깁니다.', body: '아래의 검토할 원문과 내려받을 발췌는 각각 편집하는 두 입력입니다. 원문에 적힌 관찰을 살피고, 가져갈 문장에서 무엇이 남고 빠졌는지 비교해 보세요.' }),
        ...sectionBlocks('reading-takeaway', 'fieldnotes-work', 'forma'),
        element('fieldnotes-questions', 'disclosure', { variant: 'search', title: '발췌하기 전 확인할 질문', items: '관찰은 어떻게 적나요? | 직접 확인한 대상과 행동을 구체적으로 적습니다.\n진술은 어떻게 구분하나요? | 누가 한 말인지 함께 남기고, 그 말이 곧 확인된 사실이라고 바꾸지 않습니다.\n모르는 것은 어떻게 남기나요? | 빈 답을 채우기보다 다음에 확인할 질문으로 남깁니다.', openFirst: false }),
        finish('fieldnotes-return', '다시 읽을 때, 질문도 함께 가져가세요.', '이 노트는 「유리의 해안」을 위한 CVA 창작 입력입니다. 자신의 자료로 바꿀 때에는 원문과 발췌를 각각 확인하세요.')
      ]) }
  );

  entries.push(
    { id: 'scene-research-shelf', name: 'Elio 조건으로 읽는 자료실', category: '이야기 · 조건과 자료', purpose: 'items', preferredProfile: 'elio', density: 'comfortable', measure: 'wide',
      description: '한 자료 집합의 검색·분류를 결합하고, 고정 삽화와 별도 모의 수치 기록을 구분해 읽습니다.',
      document: document('찾고, 살피고,\n다시 전체로.', '「유리의 해안」의 관찰·진술·질문을 조건으로 찾아 읽는 CVA 창작 자료실입니다.', 'elio', [
        opening('research-cover', '유리의 해안 / 관찰과 질문', '찾고, 살피고,\n다시 전체로.', '모든 자료를 한 번에 읽을 필요는 없습니다. 먼저 종류와 이름으로 좁히고, 조건을 풀어 다른 기록과의 맥락을 다시 살펴보세요.', 'adaptive-greenhouse', 'CVA 창작 삽화 · 기록의 배경이 되는 온실', '자료 서가로'),
        ...sectionBlocks('filtered-source-shelf', 'research-shelf', 'elio'),
        element('research-order', 'data-inspector', { variant: 'ranked', title: '모의 기록을 다른 순서로 읽기', body: '서가와 독립된 모의 질문 수입니다. 계열과 표시 순서를 바꿔도 원자료 표는 입력 순서로 남습니다.', data: '등대의 편지 | 2 | 4\n온실의 불빛 | 3 | 3\n유안의 관찰 | 0 | 2\n서하의 기억 | 1 | ', firstName: '첫 초안', secondName: '검토 초안', unit: '개', citation: 'CVA 창작 수치 · 검색 결과에서 계산하지 않았으며, 질문이 많다는 것이 더 좋은 자료라는 뜻은 아닙니다.' }, '모의 기록 살펴보기'),
        element('research-threshold', 'data-inspector', { variant: 'threshold', title: '기준을 바꾸면 어떻게 보일까요?', body: '위와 같은 모의 수치를 별도로 작성한 입력입니다. 기준값은 질문 수만 나누며 원문의 신뢰도를 평가하지 않습니다.', data: '등대의 편지 | 2 | 4\n온실의 불빛 | 3 | 3\n유안의 관찰 | 0 | 2\n서하의 기억 | 1 | ', firstName: '첫 초안', secondName: '검토 초안', unit: '개', threshold: 3, citation: 'CVA 창작 수치 · 미기록은 기준 이상·미만 어느 쪽에도 넣지 않습니다.' }),
        finish('research-return', '조건을 풀고, 맥락을 다시 읽으세요.', '자료 서가의 전체 해제로 처음 목록에 돌아갈 수 있습니다. 수치·삽화·진술은 각자의 역할로 남습니다.')
      ]) },
    { id: 'comparison-fieldbook', name: 'Forma 기준과 차이의 비교 수첩', category: '자료 · 기준과 비교', purpose: 'intro', preferredProfile: 'forma', density: 'comfortable', measure: 'wide',
      description: '직접 쓴 판단 기준과 두 초안의 같은 단위 수치·차이·원자료를 한 흐름에서 확인합니다.',
      document: document('같은 기준에서,\n다른 점을 읽습니다.', '비교하기 전 기준을 적고 두 초안의 질문 수와 원자료를 읽는 CVA 창작 수첩입니다.', 'forma', [
        opening('fieldbook-cover', 'FIELD BOOK / 선택의 기준', '같은 기준에서,\n다른 점을 읽습니다.', '큰 수치를 먼저 고르기보다 무엇을 비교하는지 정해 보세요. 기준을 적고, 두 기록을 나란히 보고, 차이가 생긴 원자료로 돌아옵니다.', 'adaptive-notebook', 'CVA 창작 삽화 · 기준과 기록을 남기는 수첩', '비교 기준 적기', 'editorial'),
        ...sectionBlocks('criteria-notebook', 'fieldbook-compare', 'forma'),
        block('text', 'fieldbook-reading', 'prose', { eyebrow: '수치를 읽은 뒤', title: '질문의 수가 곧 자료의 가치는 아닙니다.', body: '첫 초안과 검토 초안은 같은 단위로 작성한 모의 기록입니다. 0은 적은 값이고 빈 칸은 적지 않은 값입니다. 차이가 생긴 이유는 표만으로 확정하지 말고 실제 원문과 함께 확인하세요.\n이 수첩의 메모와 두 표는 각각 편집합니다. 값을 바꿀 때에는 같은 자료를 비교하는지 출처와 조건도 함께 맞춰 주세요.' }),
        finish('fieldbook-return', '선택한 이유도, 함께 남겨 두세요.', '자신의 원문과 기록으로 바꾸고 제작실에서 JSON과 독립 HTML로 보관할 수 있습니다.')
      ]) }
  );

  entries.push(
    { id: 'typography-workbench', name: '문장을 시험하는 활자 작업실', category: '작업실 · 활자와 입력', purpose: 'intro', preferredProfile: 'editor', density: 'spacious', measure: 'reading',
      description: '한 문장을 specimen으로 직접 조절하고 type-scale에서 읽는 위계를 비교합니다. 원문·기본값·임시 시험을 구분하는 실제 활자 작업면입니다.',
      document: document('한 문장을,\n여러 크기로.', '크기·굵기·기울임을 직접 시험하고 같은 문장의 역할을 비교하는 CVA 활자 작업실입니다.', 'editor', [
        block('text', 'type-workbench-intro', 'prose', { eyebrow: '문장을 시험하는 작업실', title: '한 문장을, 여러 크기로.', body: '한 번에 한 가지를 바꾸어 보세요. 같은 문장에서 무엇이 먼저 보이고 어디에서 줄이 바뀌는지 확인합니다. 마음에 드는 기본값은 제작실에서 문장과 함께 편집할 수 있습니다.' }),
        ...sectionBlocks('typography-study', 'workbench-type', 'editor'),
        element('type-reading-note', 'form-group', { variant: 'note', title: '읽으며 발견한 점', description: '이 메모는 여기에서 입력을 확인하는 예시입니다. 글자의 설정을 자동으로 바꾸거나 전송하지 않습니다.', fieldLabel: '어떤 크기와 굵기가 읽기 편했나요?', text: '큰 제목은 짧게, 본문은 줄을 따라 읽기 편하게.\n같은 크기라도 실제 문장과 화면 폭으로 다시 확인한다.', required: true, buttonLabel: '적은 내용 확인' }),
        element('type-default-copy', 'action-button', { variant: 'copy', appearance: 'outline', label: '기본 예문 복사', text: '불빛을 따라, 문장을 읽습니다.' }, '다른 문장으로도 시험해 보세요'),
        block('text', 'type-workbench-end', 'notice', { eyebrow: '다시 고칠 수 있게', title: '선택한 문장과 기본값을 함께 남기세요.', body: '위 복사 버튼은 고정된 기본 예문을 복사합니다. 임시로 조절한 크기나 메모를 가져오는 버튼은 아닙니다. 제작실에서 실제 문장과 기본값을 고친 뒤 편집 JSON과 독립 HTML로 보관하고 다시 열 수 있습니다.' })
      ]) },
    { id: 'parallel-reading-essay', name: 'Elio 질문을 곁에 둔 읽기', category: '이야기 · 질문과 원자료', purpose: 'story', preferredProfile: 'elio', density: 'spacious', measure: 'wide',
      description: '고정 질문과 window-flow 본문을 나란히 읽는 diptych, 번호형 index와 필요한 설명을 함께 엮은 Elio 창작 해설입니다.',
      document: document('질문은 곁에,\n이야기는 앞으로.', '관찰·진술·해석과 남겨 둔 질문을 함께 읽는 「유리의 해안」 CVA 창작 해설입니다.', 'elio', [
        block('hero', 'parallel-cover', 'editorial', { eyebrow: '유리의 해안 / 창작 해설', title: '질문은 곁에,\n이야기는 앞으로.', body: '불빛 없는 등대와 젖지 않은 편지. 확인한 사실을 지키면서, 아직 답하지 못한 질문을 따라 읽습니다.', image: 'adaptive-coast', caption: 'CVA 창작 삽화 · 실제 사건이나 방송의 사진이 아닙니다.', actionLabel: '질문과 함께 읽기' }),
        ...sectionBlocks('parallel-reading-desk', 'essay-parallel', 'elio'),
        element('parallel-record-index', 'section-grid', { variant: 'index', title: '다시 살펴볼 세 기록', body: '목록의 번호는 읽는 순서이며 사건의 시각이나 인과를 뜻하지 않습니다.', items: '유안의 관찰 | 새벽의 등대 계단에서 마른 편지를 발견했다. 종이의 상태와 발견한 장소가 기록되어 있다.\n서하의 진술 | 전날 밤 길 위의 빛을 기억한다. 빛의 출처와 움직인 사람은 확인하지 못했다.\n남겨 둔 질문 | 편지를 놓은 사람과 시각, 빛이 나온 곳을 확인할 자료가 더 필요하다.', image: 'adaptive-notebook', groups: '' }),
        element('parallel-explanation', 'disclosure', { variant: 'faq', title: '문장을 읽으며 확인할 것', items: '관찰과 진술은 어떻게 다를까요? | 이 창작 예시에서 관찰은 직접 살펴본 내용이고, 진술은 다른 인물이 기억해 말한 내용입니다. 둘을 같은 근거로 합치지 않습니다.\n그림으로 사건을 확인할 수 있나요? | 제공된 그림은 이 이야기의 장소를 떠올리는 창작 삽화입니다. 실제 사건의 관측 자료가 아닙니다.\n왜 답을 정하지 않았나요? | 편지의 작성자와 빛의 출처를 정하지 않은 상태가 현재 원문의 일부이기 때문입니다.' }),
        finish('parallel-return', '다음 질문을 고르고, 원문으로 돌아가세요.', '내용을 자신의 자료로 바꿀 때에도 관찰·진술·해석과 출처를 나누어 남깁니다. 이 페이지는 원래 Elio의 사건이나 관계를 수정하지 않습니다.')
      ]) },
    { id: 'interaction-field-lab', name: 'Forma 직접 조절하는 표현 실험실', category: '실험실 · 조작과 근거', purpose: 'intro', preferredProfile: 'forma', density: 'comfortable', measure: 'wide',
      description: '같은 축의 dot-plot, interval 범위, depth 갤러리와 sheet 상세를 기존 탭·입체 층·포인터·읽기 로더와 함께 직접 시험합니다.',
      document: document('직접 바꾸고,\n같은 근거를 봅니다.', '각 조작의 역할과 원자료를 분리해 확인하는 CVA의 재사용 표현 실험실입니다.', 'forma', [
        block('text', 'field-lab-intro', 'prose', { eyebrow: '직접 조절하는 표현 실험실', title: '직접 바꾸고, 같은 근거를 봅니다.', body: '값을 고르고, 장면을 넘기고, 자료의 범위를 읽어 보세요. 아래의 조작은 각각 독립된 예시입니다. 한 곳의 값을 바꾸어 다른 표나 장면이 자동으로 달라지지는 않습니다.' }),
        ...sectionBlocks('paired-observations', 'lab-pair', 'forma'),
        ...sectionBlocks('depth-scene-shelf', 'lab-depth', 'forma'),
        element('field-lab-navigation', 'controlled-tabs', { variant: 'vertical', title: '조작을 읽는 세 관점', items: '현재 선택 | 누른 버튼과 고른 값을 같은 자리에서 확인합니다. 이 탭은 아래 예시의 설정을 바꾸지 않습니다.\n원래 자료 | 값과 문장의 출처를 먼저 봅니다. 빈 값은0으로 바꾸지 않고, 그림의 역할도 구분합니다.\n다시 시작 | 각 예시의 원래 입력에서 다시 고칩니다. 전체 문서는 제작실에서 편집 JSON과 독립 HTML로 보관합니다.', selected: 1 }),
        element('field-lab-layers', 'depth-surface', { variant: 'inspect', title: '같은 자료의 층을 골라 읽기', body: '선택한 층의 역할을 읽는 별도의 입체 실험입니다. 위 갤러리와 자료를 자동으로 연결하지 않습니다.', detail: '원자료, 맥락, 설명은 서로 다른 역할입니다. 이 선택은 사건을 추가하거나 원문을 고치지 않습니다.', image: 'adaptive-notebook', layers: '원자료 | 원래 적힌 관찰과 진술을 구분해 읽습니다. 빈 값은 기록되지 않은 상태로 남깁니다.\n맥락과 관계 | 누가 어디에서 확인했는지 원자료의 범위를 함께 읽습니다. 연결을 새 인과로 해석하지 않습니다.\n작성한 설명 | 확인한 내용과 아직 남은 질문을 나누어 적습니다. 설명을 원자료의 새 사실로 바꾸지 않습니다.' }),
        element('field-lab-pointer', 'pointer-affordance', { variant: 'ring', title: '같은 자리에서 초점 확인', body: '반응을 켠 뒤 포인터나 키보드 초점으로 같은 자리의 강조를 확인합니다. 읽을 내용은 움직임 없이도 보입니다.', actionLabel: '이 자리 강조' }),
        element('field-lab-reading', 'loading-status', { variant: 'ledger', title: '실제로 읽은 줄과 현재 상태', text: '숫자와 문장의 출처를 확인합니다.\n빈 값과0을 구분합니다.\n현재 선택과 원래 자료를 함께 읽습니다.\n다른 예시와 독립된 상태임을 확인합니다.', motion: false })
      ]) }
  );

  entries.push(
    { id: 'wayfinding-reading-room', name: 'Elio 길을 잃지 않는 읽기방', category: '이야기 · 경로와 읽기 노트', purpose: 'story', preferredProfile: 'elio', density: 'spacious', measure: 'wide',
      description: '현재 글의 경로에서 시작해 질문과 본문을 함께 읽고, 한 줄 노트를 확인하는 창작 읽기 페이지입니다.',
      document: document('편지가 남긴 자리에서.', '현재 위치와 다음 기록을 읽고 한 줄 노트를 남기는 「유리의 해안」 CVA 창작 예시입니다.', 'elio', [
        ...sectionBlocks('reading-gateway', 'reading-room-entry', 'elio'),
        ...sectionBlocks('parallel-reading-desk', 'reading-room-story', 'elio'),
        ...sectionBlocks('inline-note-desk', 'reading-room-note', 'elio')
      ]) },
    { id: 'reference-workbench', name: '자료를 고르는 작은 작업대', category: '작업실 · 자료와 짧은 입력', purpose: 'items', preferredProfile: 'editor', density: 'comfortable', measure: 'wide',
      description: '이름이 보이는 rail 탐색, 자료 검색·분류, 한 줄 입력과 필요한 설명을 기존 컴포넌트로 조합합니다.',
      document: document('필요한 기록부터, 천천히.', '자료를 고르고 짧은 문장을 확인하는 CVA 작업대입니다. 각 입력과 선택은 독립된 상태입니다.', 'editor', [
        element('reference-route', 'route-navigation', { variant: 'rail', title: '다른 작업으로 이동', items: '자료실 | library.html\n현재 작업대 | #cva-page-top\n제작실 | index.html', current: 2 }),
        block('text', 'reference-intro', 'prose', { eyebrow: '읽고 고르는 작은 작업대', title: '필요한 기록부터, 천천히.', body: '제목이나 문장으로 자료를 찾고 분류를 좁혀 보세요. 다시 읽고 싶은 문장은 아래 입력에서 확인할 수 있습니다. 검색 결과·입력 확인·고정 발췌는 각자의 내용을 유지합니다.' }),
        ...sectionBlocks('filtered-source-shelf', 'reference-shelf', 'editor'),
        ...sectionBlocks('inline-note-desk', 'reference-note', 'editor')
      ]) }
  );

  entries.push(
    { id: 'afterglow-reading', name: '밤의 여운을 읽는 문장집', category: '이야기 · 짙은 색과 활자', purpose: 'story', preferredProfile: 'ttaem', density: 'spacious', measure: 'reading',
      description: 'CVA의 짙은 밤색 구조와 보랏빛 팔레트에 색면 포스터·정적 등고선·나란히 읽기·메모를 조합합니다.',
      document: document('밤이 남긴 문장.', '밤의 여운과 두 기록을 읽는 CVA 창작 문장집입니다.', 'ttaem', [
        block('text', 'afterglow-title', 'prose', { eyebrow: '창작 문장집 / NIGHT NOTES', title: '밤이 남긴 문장.', body: '같은 문장을 다른 색으로 읽어 보세요. 분위기가 달라져도 누가 무엇을 보았는지, 어디까지 확인했는지는 달라지지 않습니다.' }),
        ...sectionBlocks('color-story-opening', 'afterglow-opening', 'ttaem'),
        ...sectionBlocks('parallel-reading-desk', 'afterglow-reading', 'ttaem'),
        element('afterglow-note', 'form-group', { variant: 'note', title: '읽은 뒤 남은 문장', description: '이 페이지에서 확인하는 임시 메모입니다. 보관할 기본 문장은 제작실에서 편집하고 파일로 남깁니다.', fieldLabel: '남겨 둘 메모', text: '', required: false, buttonLabel: '메모 확인' })
      ]) },
    { id: 'warm-field-notes', name: '따뜻한 종이 위의 관측 노트', category: '소개 · 따뜻한 색과 큰 위계', purpose: 'items', preferredProfile: 'cham', density: 'comfortable', measure: 'wide',
      description: 'cham의 베이지·큰 글자와 호박색 팔레트로 포스터·모의 비교 자료·한 줄 입력을 읽습니다. 짙은 문장집과 같은 원문을 다른 톤으로 조합합니다.',
      document: document('작은 관측을, 선명하게.', '큰 글자와 따뜻한 색으로 읽는 CVA 모의 관측 노트입니다.', 'cham', [
        block('text', 'warm-title', 'prose', { eyebrow: '창작 관측 노트', title: '작은 관측을, 선명하게.', body: '차이는 같은 눈금으로 비교하고, 기록이 없는 곳은 비워 둡니다. 중요한 것은 색이 아니라 문장과 값의 뜻입니다.' }),
        ...sectionBlocks('color-story-opening', 'warm-opening', 'cham'),
        ...sectionBlocks('colored-review-desk', 'warm-review', 'cham')
      ]) }
  );
  entries.find(entry => entry.id === 'afterglow-reading').document.presentation = { palette: 'violet' };
  entries.find(entry => entry.id === 'warm-field-notes').document.presentation = { palette: 'amber' };

  entries.push(
    { id: 'sequence-fieldnotes', name: '기록의 변화를 읽는 관측 수첩', category: '자료 · 순서와 비교', purpose: 'items', preferredProfile: 'folio', density: 'comfortable', measure: 'wide',
      description: '짧은 질문에서 시작해 순서에 따른 두 자료의 변화·미기록·원자료와 읽기 메모를 함께 살펴봅니다.',
      document: document('두 기록 사이에 남은 것.', '같은 눈금과 입력 순서로 읽는 CVA 창작 관측 수첩입니다.', 'folio', [
        block('text', 'sequence-opening', 'prose', { eyebrow: 'FIELD NOTES / CVA 창작 예시', title: '두 기록 사이에\n남은 것.', body: '같은 질문을 서로 다른 곳에서 기록했습니다. 두 자료를 차례대로 읽되, 기록이 없는 곳은 추측으로 채우지 않습니다.' }),
        ...sectionBlocks('ordered-record-desk', 'sequence-desk', 'folio'),
        block('text', 'sequence-reading', 'notice', { eyebrow: '이야기를 저작할 때', title: '순서와 시간은 다른 관계입니다.', body: '이 수첩의 값은 차트를 시험하는 모의 자료입니다. Elio의 사건·인물·공개 순서를 숫자로 바꾸지 않습니다. 실제 이야기의 시간선과 순환은 기존 Elio 원본 입력과 리더에서 작성합니다.' }),
        element('sequence-reader', 'action-button', { variant: 'link', appearance: 'outline', label: 'Elio 원본 시간선 예제 읽기', url: 'https://ttaem.com/storytimeline/templates/temporal.html?story=perspective-times#perspective-times-map' })
      ]) }
  );
  entries.find(entry => entry.id === 'sequence-fieldnotes').document.presentation = { palette: 'ocean' };

  const presentationByPurpose = {
    'observation-notebook':['spacious','reading'],
    'record-workshop':['comfortable','reading'],
    'media-observatory':['comfortable','wide'],
    'scene-story': ['spacious', 'reading'],
    'scene-characters': ['comfortable', 'wide'],
    'scene-items': ['compact', 'wide'],
    'scene-broadcast': ['compact', 'wide'],
    'scene-intro': ['spacious', 'wide'],
    'brand-overview': ['spacious', 'wide'],
    'product-story': ['spacious', 'reading'],
    'story-reader': ['spacious', 'reading'],
    'editing-workspace': ['compact', 'wide'],
    'case-study': ['comfortable', 'reading'],
    'process-guide': ['comfortable', 'reading'],
    'comparison-page': ['compact', 'wide'],
    'knowledge-guide': ['comfortable', 'reading'],
    'game-item-catalog': ['compact', 'wide'],
    'character-relations': ['comfortable', 'wide'],
    'broadcast-flow': ['compact', 'wide'],
    'event-merge-split': ['spacious', 'reading']
  };
  const purposeByTemplate = {
    ...Object.fromEntries((global.CVA_SCENES?.templates || []).map(entry => [entry.id, entry.purpose])),
    'observation-notebook': 'story', 'record-workshop': 'intro', 'media-observatory': 'intro',
    'story-reader': 'story', 'event-merge-split': 'story', 'character-relations': 'relations',
    'game-item-catalog': 'items', 'broadcast-flow': 'broadcast', 'editing-workspace': 'broadcast',
    'brand-overview': 'intro', 'product-story': 'intro', 'case-study': 'intro', 'process-guide': 'intro',
    'comparison-page': 'intro', 'knowledge-guide': 'items'
  };
  for (const entry of entries) {
    const [density, measure] = entry.density ? [entry.density, entry.measure] : presentationByPurpose[entry.id];
    entry.purpose = entry.purpose || purposeByTemplate[entry.id];
    entry.density = density;
    entry.measure = measure;
    entry.document.modules.filter(block => block.type === 'timeline' && block.variant === 'parallel' || block.type === 'forma-pattern' && block.props.patternId === 'parallel-timeline').forEach(block => { block.orientation = 'horizontal'; });
    entry.document = modules.normalizeDocument({...entry.document, presentation: {...entry.document.presentation, density, measure}});
  }

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }

  deepFreeze(entries);

  global.CVA_TEMPLATES = Object.freeze({
    version: 'cva.templates.v2',
    entries,
    create: function (id, profile) {
      const entry = entries.find(value => value.id === id);
      if (!entry) throw new Error('알 수 없는 페이지 템플릿: ' + String(id));
      const result = JSON.parse(JSON.stringify(entry.document));
      if (profile !== undefined) result.profile = profile;
      return modules.normalizeDocument(result);
    }
  });
}(window));
