/* The guide sends the same authored document to the existing canvas. The
   application's profile IDs, renderer, models and exported data stay owned by
   their existing modules. Only profile and presentation.palette vary here. */
(() => {
  'use strict';
  const intents = {
    ttaem: ['브랜드의 약속과 도구를 함께 소개할 때.', '네이비 바탕, 황동색 강조, 따뜻한 기록의 분위기.'],
    elio: ['이야기의 장면을 따라 순서대로 읽을 때.', '밝은 바탕, 중앙 축과 장면 중심의 읽기.'],
    editor: ['많은 기록과 조건을 가까이 두고 비교할 때.', '네이비와 청색, 짧은 간격과 조밀한 구성.'],
    forma: ['항목의 차이와 관계를 차분하게 비교할 때.', '밝은 바탕, 초록색 강조, 넉넉한 여백.'],
    cham: ['큰 글씨로 핵심과 보조 설명을 전달할 때.', '베이지와 주황, 큰 글자와 또렷한 윤곽.'],
    folio: ['긴 문장과 기록을 천천히 이어 읽을 때.', '종이색, 세리프 글자, 작은 곡률과 긴 호흡.'],
    signal: ['짧은 선언과 분명한 대조를 보여 줄 때.', '굵은 제목, 각진 면, 선명한 붉은 강조.'],
    mist: ['적은 정보를 여유 있게 살펴볼 때.', '푸른 회색, 보랏빛 강조, 부드러운 면과 여백.']
  };
  // This authored sample is illustrative. Missing replay/result times remain
  // missing; story labels and reading order are not converted into timestamps.
  const sample = JSON.stringify({
    schema: 'cva.page.v2', title: '새벽의 관측 노트',
    description: '같은 창작 기록의 표현을 비교하는 Elio 디자인 기준 예시입니다.', profile: 'forma',
    modules: [
      { id: 'observation-cover', type: 'hero', variant: 'split', props: {
        eyebrow: 'FIELD NOTES / 창작 관측 노트', title: '장면을 보고,\n근거를 남깁니다.',
        body: '같은 해안 삽화를 보고 쓴 가상의 관측 노트입니다. 관찰과 해석을 나누어 읽습니다.',
        image: 'adaptive-coast', caption: 'CVA 창작 삽화 · 새벽 해안 / 실제 관측 자료 아님', actionLabel: '두 기록 이어 읽기'
      } },
      { id: 'observation-sequence', type: 'timeline', variant: 'events', props: {
        eyebrow: 'READING ORDER / 읽는 순서', title: '본 장면에서, 남은 질문으로.',
        body: '번호는 이 페이지를 읽는 순서입니다. 두 항목 사이의 간격은 경과 시간이나 인과를 뜻하지 않습니다.',
        items: [
          { id: 'coast-record', title: '해안의 풍경을 살펴봅니다.', body: '그림에는 등대와 바다, 밝아지는 하늘이 있습니다. 장소의 실제 이름과 정확한 시각은 이 삽화만으로 확인할 수 없습니다.', label: '관찰 · 창작 예시', value: '작품 속 시간: 새벽 · 정확한 시각 없음', image: 'adaptive-coast' },
          { id: 'notebook-record', title: '수첩에 질문을 남깁니다.', body: '본 것과 아직 모르는 것을 다른 문장으로 적습니다. 그림의 분위기를 실제 관측 결과로 바꾸지 않습니다.', label: '질문 · 창작 예시', value: '작품 속 시간: 미정', image: 'adaptive-notebook' }
        ]
      } },
      { id: 'observation-evidence', type: 'evidence', variant: 'document', props: {
        eyebrow: 'SOURCE / 자료의 범위', title: '그림과 설명의 역할을 함께 남깁니다.',
        body: '두 이미지는 CVA가 보관한 창작 삽화입니다. 위 문장은 스타일 비교를 위해 작성한 가상 기록이며, 실제 사건이나 측정 결과의 근거가 아닙니다.',
        image: 'adaptive-notebook', caption: 'CVA 창작 정물 · 관측 수첩',
        cite: '출처: CVA 창작 자산 coastal-observation-dawn.png · catalog-observation-notebook.png. 원본 영상과 편집 결과가 없어 해당 재생 시각은 입력하지 않았습니다.'
      } },
      { id: 'observation-return', type: 'cta', variant: 'banner', props: {
        eyebrow: 'RETURN / 다시 읽기', title: '같은 장면으로 돌아갑니다.',
        body: '스타일은 달라도 기록의 내용과 순서는 같습니다.', actionLabel: '첫 장면으로 돌아가기', actionHref: '#observation-cover'
      } }
    ]
  });

  const frame = document.getElementById('profile-preview');
  const fallback = document.getElementById('preview-fallback');
  const shell = document.getElementById('preview-shell');
  const profile = document.getElementById('profile-select');
  const palette = document.getElementById('palette-select');
  const feedback = document.getElementById('profile-feedback');
  const retry = document.getElementById('preview-retry');
  const applied = document.getElementById('applied-profile');
  let frameReady = false, requestId = 0, timer;
  const origin = location.origin;

  function status(message, state) {
    feedback.textContent = message;
    feedback.dataset.state = state;
  }
  function fail(message) {
    clearTimeout(timer);
    shell.setAttribute('aria-busy', 'false');
    frame.hidden = true;
    fallback.hidden = false;
    retry.hidden = false;
    applied.textContent = '미리보기를 불러오지 못했습니다';
    status(message, 'error');
  }
  function watch() {
    clearTimeout(timer);
    timer = setTimeout(() => fail('미리보기 응답을 받지 못했습니다. 다시 불러오거나 요소 라이브러리에서 같은 구성을 살펴보세요.'), 12000);
  }
  function describe() {
    const intent = intents[profile.value];
    if (!intent) return;
    document.getElementById('profile-intent').textContent = intent[0];
    document.getElementById('profile-character').textContent = intent[1];
  }
  function render() {
    if (!frameReady) return;
    if (!Object.hasOwn(intents, profile.value) || !Object.hasOwn(window.CVA_TOKENS.profiles, profile.value) ||
      (palette.value && !Object.hasOwn(window.CVA_TOKENS.palettes, palette.value))) {
      fail('등록된 스타일과 강조색을 골라 주세요.');
      return;
    }
    const model = JSON.parse(sample);
    model.profile = profile.value;
    if (palette.value) model.presentation = { palette: palette.value };
    describe();
    shell.setAttribute('aria-busy', 'true');
    retry.hidden = true;
    status('선택한 스타일로 같은 내용을 불러오고 있습니다.', 'pending');
    watch();
    frame.contentWindow.postMessage({ type: 'cva.canvas.document', document: model,
      documentKey: 'elio-foundations-observation', editable: false, navigation: true,
      requestId: ++requestId }, origin);
  }
  function loadFrame() {
    frameReady = false;
    requestId++;
    shell.setAttribute('aria-busy', 'true');
    retry.hidden = true;
    status('같은 내용을 불러오고 있습니다.', 'pending');
    watch();
    frame.src = frame.dataset.src;
  }

  // The frame can report ready before its load event. Install the receiver before
  // setting src, and acknowledge only the current request from this exact frame.
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== frame.contentWindow || !event.data) return;
    if (event.data.type === 'cva.canvas.ready') {
      frameReady = true;
      render();
      return;
    }
    if (event.data.requestId !== requestId) return;
    if (event.data.type === 'cva.canvas.error') {
      fail('이 구성을 불러오지 못했습니다. 다시 불러오거나 다른 스타일을 선택해 주세요.');
    } else if (event.data.type === 'cva.canvas.rendered' && event.data.profile === profile.value && event.data.count === 4) {
      clearTimeout(timer);
      shell.setAttribute('aria-busy', 'false');
      fallback.hidden = true;
      frame.hidden = false;
      retry.hidden = true;
      const label = window.CVA_TOKENS.profiles[profile.value].label;
      applied.textContent = label;
      frame.title = label + ' · 새벽의 관측 노트';
      status(label + '로 같은 내용을 표시했습니다. 미리보기 안에서 이어 읽을 수 있습니다.', 'success');
    }
  });
  window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
  frame.addEventListener('error', () => fail('미리보기를 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.'));
  retry.addEventListener('click', loadFrame);

  for (const group of document.querySelectorAll('[data-choice-group]')) {
    const buttons = [...group.querySelectorAll('[data-example-choice]')];
    const note = group.parentElement.querySelector('[data-choice-feedback]');
    for (const button of buttons) button.addEventListener('click', () => {
      for (const candidate of buttons) candidate.setAttribute('aria-pressed', String(candidate === button));
      note.textContent = button.dataset.exampleChoice + '를 선택한 표현입니다.';
    });
  }
  if (window.CVA_LIBRARY_ICONS) for (const slot of document.querySelectorAll('[data-ui-icon]')) {
    slot.innerHTML = window.CVA_LIBRARY_ICONS.render(slot.dataset.uiIcon, { size: 18 });
  }

  if (!window.CVA_TOKENS?.profiles || !window.CVA_TOKENS?.palettes ||
    !Object.keys(intents).every(id => Object.hasOwn(window.CVA_TOKENS.profiles, id)) || origin === 'null') {
    fail('스타일 정보를 불러오지 못했습니다. 페이지를 다시 열거나 요소 라이브러리로 이동해 주세요.');
    retry.hidden = true;
    return;
  }
  const table = document.getElementById('profile-intent-table');
  profile.replaceChildren();
  table.replaceChildren();
  for (const [id, intent] of Object.entries(intents)) {
    const label = window.CVA_TOKENS.profiles[id].label;
    const option = document.createElement('option');
    option.value = id; option.textContent = label; profile.append(option);
    const row = document.createElement('tr'), name = document.createElement('th');
    name.scope = 'row'; name.textContent = label; row.append(name);
    for (const text of intent) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); }
    table.append(row);
  }
  for (const [id, definition] of Object.entries(window.CVA_TOKENS.palettes)) {
    const option = document.createElement('option');
    option.value = id; option.textContent = definition.label; palette.append(option);
  }
  profile.value = 'forma';
  profile.disabled = false;
  palette.disabled = false;
  profile.addEventListener('change', () => { describe(); render(); });
  palette.addEventListener('change', render);
  loadFrame();
})();
