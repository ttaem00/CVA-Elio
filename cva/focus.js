/* Shared selection/detail behavior for CVA readers, review examples and catalogues.
   Content is validated by CVA_MODULES. Export embeds this exact runtime. */
(function (global) {
  'use strict';

  function installInteractions(target) {
    const mounted = new WeakSet();
    const drafts = new Map();
    function capture(root) {
      return [...root.querySelectorAll('.cva-focus')].map(focus => ({
        id: focus.dataset.focusId, kind: focus.dataset.focusKind,
        selected: focus.querySelector('[data-focus-target][aria-pressed="true"]')?.dataset.focusTarget,
        query: focus.querySelector('[data-focus-search]')?.value || ''
      }));
    }
    function mount(root, priorState = []) {
      const cleanups = [];
      root.querySelectorAll('.cva-focus').forEach(focus => {
        if (mounted.has(focus)) return;
        mounted.add(focus);
        const controller = new AbortController();
        const options = { signal: controller.signal };
        const buttons = [...focus.querySelectorAll('[data-focus-target]')];
        const panels = [...focus.querySelectorAll('[data-focus-panel]')];
        const count = focus.querySelector('[data-focus-count]');
        const previous = priorState.find(state => state.id === focus.dataset.focusId && state.kind === focus.dataset.focusKind);
        function select(id, announce = true) {
          buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.focusTarget === id)));
          panels.forEach(panel => { panel.hidden = panel.id !== id; });
          const selected = buttons.find(button => button.dataset.focusTarget === id);
          if (announce && selected) count.textContent = '현재 선택: ' + selected.querySelector('.cva-focus-name').textContent;
        }
        buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.focusTarget), options));
        const search = focus.querySelector('[data-focus-search]');
        function filter() {
          const query = search.value.trim().toLocaleLowerCase('ko');
          buttons.forEach(button => { button.hidden = !button.dataset.focusQuery.toLocaleLowerCase('ko').includes(query); });
          const visible = buttons.filter(button => !button.hidden);
          focus.querySelector('[data-focus-empty]').hidden = visible.length > 0;
          if (!visible.length) panels.forEach(panel => { panel.hidden = true; });
          else if (!visible.some(button => button.getAttribute('aria-pressed') === 'true')) select(visible[0].dataset.focusTarget, false);
          else select(visible.find(button => button.getAttribute('aria-pressed') === 'true').dataset.focusTarget, false);
          count.textContent = query ? '검색 결과 ' + visible.length + '개' : '전체 ' + buttons.length + '개';
        }
        search?.addEventListener('input', filter, options);
        panels.forEach(panel => {
          const form = panel.querySelector('[data-review-form]');
          if (!form) return;
          const note = form.querySelector('textarea');
          const decision = form.querySelector('select');
          const status = form.querySelector('[data-review-status]');
          const signature = panel.querySelector('[data-review-signature]').textContent;
          const key = 'cva-review.v1:' + form.dataset.reviewKey;
          let saved = null;
          try {
            const record = JSON.parse(target.localStorage.getItem(key));
            if (record && record.signature === signature && typeof record.note === 'string' && record.note.length <= 20000 && ['pending', 'use', 'hold'].includes(record.decision)) {
              saved = record; note.value = record.note; decision.value = record.decision;
              status.textContent = '이 브라우저의 저장본을 다시 열었습니다.';
            }
          } catch (_) { status.textContent = '아직 저장하지 않았습니다. 브라우저 저장소를 사용할 수 없으면 저장 시 알려드립니다.'; }
          const draft = drafts.get(key);
          if (draft?.signature === signature) { note.value = draft.note; decision.value = draft.decision; status.textContent = '미저장 초안을 이어서 보고 있습니다.'; }
          const changed = () => {
            drafts.set(key, { signature, note: note.value, decision: decision.value });
            status.textContent = saved && saved.note === note.value && saved.decision === decision.value ? '저장본과 같습니다.' : '미저장 변경이 있습니다.';
          };
          form.addEventListener('input', changed, options);
          form.addEventListener('submit', event => {
            event.preventDefault();
            const record = { signature, note: note.value, decision: decision.value };
            try {
              target.localStorage.setItem(key, JSON.stringify(record)); saved = record; drafts.delete(key);
              status.textContent = '이 브라우저에 저장했습니다. 공개되거나 서버로 전송되지 않습니다.';
            } catch (_) { status.textContent = '저장하지 못했습니다. 입력은 유지됩니다. 메모를 복사해 보관하고 다시 시도하세요.'; }
          }, options);
        });
        if (buttons.length) select((buttons.find(button => button.dataset.focusTarget === previous?.selected) || buttons[0]).dataset.focusTarget, false);
        if (search) { search.value = previous?.query || ''; filter(); }
        focus.dataset.enhanced = 'true';
        cleanups.push(() => { controller.abort(); mounted.delete(focus); });
      });
      return () => cleanups.forEach(dispose => dispose());
    }
    target.CVA_INTERACTIONS = { capture, mount };
  }

  function render(block, documentTitle = '', context = {}) {
    const C = global.CVA_COMPONENTS, e = C.escape, p = block.props;
    const kind = block.variant;
    const reading = kind === 'reader' || kind === 'notes';
    const detailLevel = context.index === 0 ? 2 : 3;
    const name = kind === 'reader' ? '장면' : kind === 'notes' ? '인물' : kind === 'review' ? '검토 대상' : '항목';
    const panelId = entry => 'focus-' + block.id.length + '-' + block.id + '-' + entry.id;
    const items = p.items;
    const nav = items.map((entry, index) => '<button type="button" class="cva-focus-option" data-focus-query="' + e([entry.title, entry.body, entry.label, entry.value, entry.detail].filter(value => value !== undefined).join(' ')) + '" data-focus-target="' + e(panelId(entry)) + '" aria-controls="' + e(panelId(entry)) + '" aria-pressed="' + (index === 0) + '">' +
      '<span class="cva-focus-order" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><span><span class="cva-focus-name">' + e(entry.title) + '</span>' +
      (entry.label ? '<span class="cva-focus-label">' + e(entry.label) + '</span>' : '') + '</span>' + (entry.value !== undefined && entry.value !== '' ? '<span class="cva-focus-value">' + e(entry.value) + '</span>' : '') + '</button>').join('');
    const panels = items.map(entry => {
      const id = panelId(entry);
      const signature = JSON.stringify(entry);
      return '<section id="' + e(id) + '" class="cva-focus-detail" data-focus-panel aria-labelledby="' + e(id + '-title') + '">' +
        (entry.image ? C.media(entry.image) : '') + '<div class="cva-focus-copy">' + (entry.label ? '<p class="cva-eyebrow">' + e(entry.label) + '</p>' : '') +
        '<h' + detailLevel + ' id="' + e(id + '-title') + '" class="cva-focus-detail-title">' + e(entry.title) + '</h' + detailLevel + '>' +
        (entry.value !== undefined && entry.value !== '' ? '<p class="cva-focus-key">' + e(entry.value) + '</p>' : '') +
        '<p class="cva-body">' + e(entry.body) + '</p>' +
        (reading && entry.detail ? '<p class="cva-body cva-focus-prose">' + e(entry.detail) + '</p>' : '') +
        (entry.source ? kind !== 'review' ? '<details class="cva-context-help"><summary>' + (kind === 'reader' ? '장면 자료의 범위' : '자료와 표기 기준') + '</summary><p>' + e(entry.source) + '</p></details>' : '<div class="cva-focus-source"><p class="cva-focus-label">판단 근거</p><blockquote>' + e(entry.source) + '</blockquote></div>' : '') +
        (!reading && entry.detail ? '<details class="cva-context-help"><summary>' + (kind === 'catalog' ? '상세 정보' : '검토 조건') + '</summary><p>' + e(entry.detail) + '</p></details>' : '') +
        (kind === 'review' ? '<form class="cva-review" data-review-form data-review-key="' + e(JSON.stringify([documentTitle, block.id, entry.id])) + '"><p class="cva-focus-label">이 예시의 판단</p><label for="' + e(id + '-decision') + '">판단 상태</label><select id="' + e(id + '-decision') + '"><option value="pending">확인 필요</option><option value="use">사용</option><option value="hold">보류</option></select><label for="' + e(id + '-note') + '">판단 메모</label><textarea id="' + e(id + '-note') + '" rows="3" maxlength="20000" placeholder="근거를 확인하고 판단 이유를 남기세요."></textarea><p class="cva-focus-label">메모는 이 브라우저에만 저장됩니다. HTML·편집 JSON에는 포함되지 않습니다.</p><button type="submit" class="cva-button">판단 메모 저장</button><p class="cva-review-status" data-review-status role="status">아직 저장하지 않았습니다.</p><span data-review-signature hidden>' + e(signature) + '</span></form>' : '') + '</div></section>';
    }).join('');
    return '<div class="cva-focus" data-focus-id="' + e(block.id) + '" data-focus-kind="' + kind + '"><div class="cva-focus-browser">' +
      (kind === 'catalog' ? '<label class="cva-focus-search">이름·분류로 찾기<input type="search" data-focus-search placeholder="찾을 항목을 입력하세요"></label>' : '<p class="cva-focus-overline">' + name + ' 선택</p>') +
      '<nav class="cva-focus-options" aria-label="' + name + ' 선택">' + nav + '</nav><p class="cva-focus-count" data-focus-count role="status">전체 ' + items.length + '개</p></div><div class="cva-focus-stage">' +
      '<p class="cva-empty" data-focus-empty' + (items.length ? ' hidden' : '') + '>맞는 항목이 없습니다. 검색어를 지우거나 다른 이름으로 찾아보세요.</p>' + panels + '</div></div>' +
      (p.help ? '<details class="cva-context-help cva-focus-help"><summary>' + e(p.helpLabel || '더 알아보기') + '</summary><p>' + e(p.help) + '</p></details>' : '');
  }
  installInteractions(global);
  global.CVA_FOCUS = { render, runtimeSource: '(' + installInteractions.toString() + ')(window);CVA_INTERACTIONS.mount(document);' };
})(window);
