/* Native control families. Upstream fragments and notices: NATIVE_SOURCES.md. */
(function (global) {
  'use strict';
  const H = global.CVA_ELEMENTS.helpers;
  const e = H.e;
  const field = (key, label, kind = 'text', extra = {}) => ({ key, label, kind, ...extra });
  const variants = values => values.map(([id, label]) => ({ id, label }));
  const source = (name, url, method) => ({ name, url, method });
  const hyperui = 'https://github.com/markmead/hyperui/blob/252efcfe39161db6e67cd877da001ee248d2bbf6/public/examples/';
  const basecoat = 'https://github.com/hunvreus/basecoat/blob/6769c83c9644ec4195ed30af028a9e66fe670215/';
  const pairs = (value, max = 8) => H.lines(value, max).map(line => {
    const separator = line.indexOf('|');
    return separator < 0 ? { title: line, body: '' } : { title: line.slice(0, separator).trim(), body: line.slice(separator + 1).trim() };
  });
  const requireText = (value, label) => { if (!value.trim()) throw new Error(label + '을 입력하세요.'); };
  function validateRows(value, label, paired = false) {
    const rows = H.lines(value, 9);
    if (rows.length > 8) throw new Error(label + '은 8개 이하로 입력하세요.');
    if (paired && rows.some(row => row.startsWith('|'))) throw new Error(label + '의 각 줄에 제목을 입력하세요.');
    return rows;
  }
  const head = (title, body) => '<div class="cec-head"><h3 class="ce-title">' + e(title) + '</h3>' + (body ? '<p class="ce-body">' + e(body) + '</p>' : '') + '</div>';
  const status = (text = '') => '<p class="ce-status cec-status" role="status" aria-live="polite" aria-atomic="true" data-status>' + e(text) + '</p>';

  const actionButton = {
    id: 'action-button', name: '실제 행동 버튼', category: 'actions',
    description: '복사·선택·분할·이동·텍스트 내려받기의 실제 행동을 유지하고, 주 행동·윤곽·부드러운 면·빛 테두리의 외형을 따로 고릅니다.',
    keywords: ['button', 'copy', 'toggle', 'split', 'link', 'download', 'solid', 'outline', 'soft', 'glow', '버튼', '복사', '내려받기', '외형', '윤곽', '빛 테두리'],
    source: source('HyperUI offset button', hyperui + 'neobrutalism/buttons/3.html', 'MIT HTML의 offset shadow·focus 표현을 CVA CSS로 변환; 행동은 native caller가 소유'),
    variants: variants([['copy', '텍스트 복사'], ['toggle', '켜짐 선택'], ['split', '복사와 보조 행동'], ['link', '링크 이동'], ['download', '텍스트 파일 내려받기']]),
    controls: [field('appearance', '버튼 외형', 'select', { options: [{value:'raised',label:'입체 테두리 · 기본'}, {value:'solid',label:'주 행동 · 채운 면'}, {value:'outline',label:'보조 행동 · 윤곽'}, {value:'soft',label:'조용한 행동 · 부드러운 면'}, {value:'glow',label:'강조 행동 · 빛 테두리'}], hint: '외형을 바꾸어도 복사·선택·이동의 행동은 유지됩니다.' }), field('label', '버튼 이름', 'text', { hint: '비우면 선택한 행동에 맞는 기본 이름을 표시합니다.' }), field('text', '복사·내려받을 텍스트', 'textarea'), field('url', '이동할 주소', 'text', { hint: 'http(s), #ID 또는 상대 .html 주소' }), field('pressed', '처음부터 켜짐', 'checkbox'), field('downloadLabel', '내려받기 링크 이름'), field('filename', '텍스트 파일 이름', 'text', { hint: '.txt로 끝나는 파일 이름 하나를 입력하세요.' })],
    defaults: { variant: 'copy', appearance: 'raised', label: '', text: '긴 이야기를 짧은 한 문장으로 연결합니다.', url: 'library.html', pressed: false, downloadLabel: '텍스트 내려받기', filename: '읽기메모.txt' },
    validate(p) {
      if (p.variant === 'link') H.href(p.url);
      if (p.variant === 'download') {
        requireText(p.downloadLabel, '내려받기 링크 이름');
        if (p.filename.length > 100 || p.filename !== p.filename.trim() || !/^[^.\s].*\.txt$/iu.test(p.filename) || /[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/u.test(p.filename) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(p.filename)) throw new Error('파일 이름은 경로·특수문자 없이 100자 이내의 .txt 이름으로 입력하세요.');
      }
    },
    render(p, context) {
      const valueId = H.id(context, 'copy-value');
      const buttonClass = 'ce-button cec-' + e(p.appearance);
      const label = p.label.trim() ? p.label : p.variant === 'toggle' ? '선택 켜기·끄기' : p.variant === 'link' ? '연결된 페이지 열기' : '문장 복사';
      if (p.variant === 'download') return '<div class="cec-action cec-action--download"><label class="ce-field" for="' + valueId + '">내려받을 내용<textarea id="' + valueId + '" data-download-value readonly rows="4">' + e(p.text) + '</textarea></label><div class="ce-row cec-download-row"><a class="' + buttonClass + '" data-download download="' + e(p.filename) + '" aria-disabled="true">' + e(p.downloadLabel) + '<span aria-hidden="true"> ↓</span></a><span class="ce-body cec-download-name">' + e(p.filename) + '</span></div>' + status('텍스트 파일을 준비하고 있습니다.') + '</div>';
      if (p.variant === 'link') return '<div class="cec-action"><a class="' + buttonClass + '" href="' + e(H.href(p.url)) + '">' + e(label) + ' <span aria-hidden="true">↗</span></a><p class="ce-body cec-url">' + e(p.url) + '</p></div>';
      if (p.variant === 'toggle') return '<div class="cec-action"><button type="button" class="' + buttonClass + '" data-toggle aria-pressed="' + String(p.pressed) + '">' + e(label) + '</button>' + status(p.pressed ? '켜져 있습니다.' : '꺼져 있습니다.') + '</div>';
      return '<div class="cec-action"><label class="ce-field" for="' + valueId + '">복사할 내용<textarea id="' + valueId + '" data-copy-value readonly rows="3">' + e(p.text) + '</textarea></label><div class="ce-row cec-action-row"><button type="button" class="' + buttonClass + '" data-copy>' + e(label) + '</button>' + (p.variant === 'split' ? '<details class="cec-split"><summary>다른 행동</summary><div class="cec-split-options"><button type="button" class="ce-button" data-select>텍스트 선택</button><button type="button" class="ce-button" data-clear-selection>선택 해제</button></div></details>' : '') + '</div>' + status() + '</div>';
    },
    mount(node, p) {
      const scope = H.scope();
      const result = node.querySelector('[data-status]');
      const download = node.querySelector('[data-download]');
      if (download) {
        const win = node.ownerDocument.defaultView;
        let address;
        scope.on(download, 'click', event => {
          if (!address) { event.preventDefault(); return; }
          result.textContent = '텍스트 파일 내려받기를 요청했습니다.';
        });
        scope.cleanup(() => {
          if (address) win.URL.revokeObjectURL(address);
          address = undefined;
          download.removeAttribute('href');
          download.setAttribute('aria-disabled', 'true');
        });
        try {
          if (typeof win.Blob !== 'function' || typeof win.URL?.createObjectURL !== 'function' || typeof win.URL?.revokeObjectURL !== 'function') throw new Error('download-unavailable');
          address = win.URL.createObjectURL(new win.Blob([p.text], {type: 'text/plain;charset=utf-8'}));
          download.setAttribute('href', address);
          download.removeAttribute('aria-disabled');
          result.textContent = '텍스트 파일을 준비했습니다.';
        } catch (_) {
          result.textContent = '파일을 준비하지 못했습니다. 위의 원문을 선택해 복사할 수 있습니다.';
        }
        return () => scope.dispose();
      }
      const toggle = node.querySelector('[data-toggle]');
      if (toggle) scope.on(toggle, 'click', () => {
        const pressed = toggle.getAttribute('aria-pressed') !== 'true';
        toggle.setAttribute('aria-pressed', String(pressed));
        result.textContent = pressed ? '켜졌습니다.' : '꺼졌습니다.';
      });
      const text = node.querySelector('[data-copy-value]');
      const copy = node.querySelector('[data-copy]');
      let disposed = false;
      scope.cleanup(() => {
        disposed = true;
        if (copy) {
          if (copy.disabled) result.textContent = '복사 결과 확인을 멈췄습니다. 필요하면 다시 복사하세요.';
          copy.disabled = false; copy.removeAttribute('aria-busy');
        }
      });
      if (copy) scope.on(copy, 'click', async () => {
        if (copy.disabled) return;
        copy.disabled = true; copy.setAttribute('aria-busy', 'true');
        result.textContent = '복사 중입니다.';
        try {
          if (!global.navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
          await global.navigator.clipboard.writeText(text.value);
          if (!disposed) result.textContent = '텍스트를 클립보드에 복사했습니다.';
        } catch (_) {
          if (!disposed) {
            text.focus(); text.select();
            result.textContent = '자동 복사를 사용할 수 없어 내용을 선택했습니다. Ctrl+C 또는 복사 메뉴를 사용하세요.';
          }
        } finally { if (!disposed) { copy.disabled = false; copy.removeAttribute('aria-busy'); } }
      });
      const select = node.querySelector('[data-select]');
      const clear = node.querySelector('[data-clear-selection]');
      if (select) scope.on(select, 'click', () => { text.focus(); text.select(); result.textContent = '복사할 내용을 선택했습니다.'; select.closest('details').open = false; });
      if (clear) scope.on(clear, 'click', () => { text.setSelectionRange(0, 0); result.textContent = '텍스트 선택을 해제했습니다.'; clear.closest('details').open = false; (copy.disabled ? clear.closest('details').querySelector('summary') : copy).focus(); });
      return () => scope.dispose();
    }
  };

  const loadingStatus = {
    id: 'loading-status', name: '읽히는 처리 상태', category: 'status',
    description: '실제 로컬 텍스트 읽기의 시작·결과를 표시하며, 진행률은 처리한 줄 수에만 연결합니다.',
    keywords: ['loader', 'spinner', 'dots', 'skeleton', 'progress', 'flow', 'bars', 'orbit', 'ledger', '로더', '진행률', '현재 줄', '물결', '막대', '궤도'],
    source: source('HyperUI spinner · SpinKit Flow/Wave', 'https://github.com/tobiasahlin/SpinKit/blob/742a71277c49b69053b5beb9fad80d720840a2ab/spinkit.css', 'MIT HyperUI SVG와 SpinKit Flow/Wave 구조·keyframes 변환; orbit·실제 작업·모션 선택·cleanup은 CVA'),
    variants: variants([['spinner', '텍스트와 회전 표시'], ['dots', '세 점 상태'], ['skeleton', '본문 골격'], ['progress', '처리한 줄 수'], ['flow', '점의 흐름'], ['bars', '막대의 물결'], ['orbit', '조용한 궤도'], ['ledger', '현재 줄과 읽은 기록']]),
    controls: [field('title', '제목'), field('text', '읽을 내용', 'textarea'), field('motion', '처리 중 장식 움직임 허용', 'checkbox')],
    defaults: { variant: 'spinner', title: '내용 길이 확인', text: '첫 장면에서 만났습니다.\n다음 장면에서 관계가 달라졌습니다.\n마지막 장면에서 다시 연결됩니다.', motion: false },
    validate(p) { requireText(p.title, '제목'); },
    render(p, context) {
      const inputId = H.id(context, 'loading-input');
      const visuals = {
        spinner: '<svg class="cec-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="cec-spinner-ring" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>',
        dots: '<span class="cec-dots" aria-hidden="true"><i></i><i></i><i></i></span>',
        skeleton: '<span class="cec-skeleton" aria-hidden="true"><i></i><i></i><i></i></span>',
        progress: '<progress class="cec-progress" value="0" max="1" aria-label="읽은 줄 수" data-progress></progress>',
        flow: '<span class="cec-flow" aria-hidden="true"><i></i><i></i><i></i></span>',
        bars: '<span class="cec-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>',
        orbit: '<span class="cec-orbit" aria-hidden="true"><i></i></span>',
        ledger: '<div class="cec-ledger"><div class="cec-ledger-head"><span data-ledger-label>읽을 내용</span><output data-ledger-count>0 / ' + p.text.split(/\r?\n/).length + '줄</output></div><p class="ce-body" data-ledger-line>내용 읽기를 누르면 현재 줄을 보여줍니다.</p><progress class="cec-progress" value="0" max="1" aria-label="읽은 줄 수" data-progress></progress></div>'
      };
      const visual = visuals[p.variant];
      return '<div class="cec-loading' + (p.variant === 'ledger' ? ' cec-loading--ledger' : '') + '" data-busy="false" data-motion="' + String(p.motion) + '">' + head(p.title, '입력한 텍스트를 이 페이지 안에서 읽습니다.') + '<label class="ce-field" for="' + inputId + '">확인할 내용<textarea id="' + inputId + '" rows="3" data-work-text>' + e(p.text) + '</textarea></label><div class="ce-row"><button type="button" class="ce-button" data-run>내용 읽기</button><div class="cec-loading-visual">' + visual + '</div></div>' + status('아직 읽기를 실행하지 않았습니다.') + '</div>';
    },
    mount(node) {
      const scope = H.scope();
      const root = node.querySelector('.cec-loading');
      const button = node.querySelector('[data-run]');
      const input = node.querySelector('[data-work-text]');
      const result = node.querySelector('[data-status]');
      const progress = node.querySelector('[data-progress]');
      const ledgerCount = node.querySelector('[data-ledger-count]');
      const ledgerLine = node.querySelector('[data-ledger-line]');
      const ledgerLabel = node.querySelector('[data-ledger-label]');
      let disposed = false;
      scope.cleanup(() => { disposed = true; button.disabled = false; input.readOnly = false; root.dataset.busy = 'false'; root.removeAttribute('aria-busy'); });
      scope.on(button, 'click', async () => {
        if (button.disabled) return;
        const lines = input.value.split(/\r?\n/);
        button.disabled = true; input.readOnly = true;
        root.dataset.busy = 'true'; root.setAttribute('aria-busy', 'true');
        result.textContent = '입력한 내용을 읽고 있습니다.';
        if (progress) { progress.max = lines.length; progress.value = 0; }
        if (ledgerCount) ledgerCount.textContent = '0 / ' + lines.length + '줄';
        if (ledgerLabel) ledgerLabel.textContent = '읽는 줄';
        let characters = 0;
        try {
          for (let index = 0; index < lines.length; index += 1) {
            if (ledgerLine) ledgerLine.textContent = (index + 1) + '. ' + (lines[index] || '(빈 줄)');
            const content = await new Blob([lines[index]]).text();
            if (disposed) return;
            characters += Array.from(content).length;
            if (progress) progress.value = index + 1;
            if (ledgerCount) ledgerCount.textContent = (index + 1) + ' / ' + lines.length + '줄';
          }
          if (ledgerLabel) ledgerLabel.textContent = '마지막으로 읽은 줄';
          result.textContent = lines.length + '줄을 읽었습니다. 줄바꿈을 제외한 글자는 ' + characters.toLocaleString('ko-KR') + '개입니다.';
        } catch (_) {
          if (!disposed) {
            if (ledgerLabel) ledgerLabel.textContent = '읽던 줄';
            result.textContent = '이 환경에서 내용을 읽지 못했습니다. 입력은 그대로 남아 있습니다.';
          }
        } finally {
          if (!disposed) { button.disabled = false; input.readOnly = false; root.dataset.busy = 'false'; root.removeAttribute('aria-busy'); }
        }
      });
      return () => scope.dispose();
    }
  };

  const controlledTabs = {
    id: 'controlled-tabs', name: '내용 선택 탭', category: 'navigation',
    description: '미리 렌더한 내용을 화살표·Home·End로 선택하며 페이지 이동과 구별합니다.',
    keywords: ['tabs', 'navigation', 'pills', 'vertical', 'overflow', 'stepper', '탭', '탐색', '읽기 순서'],
    source: source('Basecoat tabs', basecoat + 'src/js/tabs.js', 'MIT 선택·keyboard·listener cleanup을 instance mount로 변환'),
    variants: variants([['underline', '밑줄 탭'], ['pills', '선택 칩'], ['vertical', '세로 탐색'], ['overflow', '가로로 넘기는 탭'], ['stepper', '순서대로 읽는 탭']]),
    controls: [field('title', '탭 묶음 이름'), field('items', '탭 이름 | 본문 (한 줄에 하나)', 'textarea', { hint: '최대 8개. 본문은 미리 렌더되어 즉시 선택됩니다.' }), field('selected', '처음 선택할 순서', 'number', { min: 1, max: 8, step: 1 })],
    defaults: { variant: 'underline', title: '이야기 읽기', items: '장면 | 처음 만난 장소와 계기를 읽습니다.\n관계 | 인물의 선택이 서로에게 미친 영향을 살펴봅니다.\n근거 | 장면과 원문의 연결을 확인합니다.', selected: 1 },
    validate(p) {
      requireText(p.title, '탭 묶음 이름');
      const rows = validateRows(p.items, '탭', true);
      if (!Number.isInteger(p.selected) || (rows.length && p.selected > rows.length)) throw new Error('처음 선택할 순서는 실제 탭 번호로 입력하세요.');
    },
    render(p, context) {
      const id = H.id(context, 'tabs');
      const items = pairs(p.items);
      if (!items.length) return '<div class="cec-tabs">' + head(p.title, '아직 탭이 없습니다. 탭 이름과 본문을 추가하세요.') + '</div>';
      const selected = p.selected - 1;
      return '<div class="cec-tabs cec-tabs--' + p.variant + '">' + head(p.title, '') + '<div class="cec-tabs-layout"><div class="cec-tablist" role="tablist" aria-label="' + e(p.title) + '" aria-orientation="' + (p.variant === 'vertical' ? 'vertical' : 'horizontal') + '">' + items.map((item, index) => '<button type="button" role="tab" id="' + id + '-tab-' + index + '" aria-controls="' + id + '-panel-' + index + '" aria-selected="' + String(index === selected) + '" tabindex="' + (index === selected ? '0' : '-1') + '">' + (p.variant === 'stepper' ? '<span class="cec-reading-number" aria-hidden="true">' + (index + 1) + '</span>' : '') + e(item.title) + '</button>').join('') + '</div><div class="cec-tabpanels">' + items.map((item, index) => '<section class="ce-panel cec-tabpanel" role="tabpanel" id="' + id + '-panel-' + index + '" aria-labelledby="' + id + '-tab-' + index + '" tabindex="0"' + (index === selected ? '' : ' hidden') + '><h4 class="ce-title">' + e(item.title) + '</h4><p class="ce-body">' + e(item.body) + '</p></section>').join('') + '</div></div>' + (p.variant === 'stepper' ? '<div class="ce-row cec-reading-controls"><button type="button" class="ce-button secondary" data-reading-prev' + (selected === 0 ? ' disabled' : '') + '>이전 내용</button><p class="ce-status" data-reading-status role="status" aria-live="polite" aria-atomic="true">읽는 순서 ' + (selected + 1) + ' / ' + items.length + '</p><button type="button" class="ce-button" data-reading-next' + (selected === items.length - 1 ? ' disabled' : '') + '>다음 내용</button></div>' : '') + '</div>';
    },
    mount(node, p) {
      const root = node.querySelector('.cec-tabs');
      if (p.variant !== 'overflow' && p.variant !== 'stepper') return global.CVA_ELEMENT_VENDOR.mountTabs(root);
      const scope = H.scope();
      const tablist = root.querySelector('[role="tablist"]');
      if (!tablist) return () => scope.dispose();
      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const previous = root.querySelector('[data-reading-prev]');
      const next = root.querySelector('[data-reading-next]');
      const revealSelected = () => {
        const tab = tabs.find(item => item.getAttribute('aria-selected') === 'true');
        if (!tab) return;
        const bounds = tablist.getBoundingClientRect();
        const selectedBounds = tab.getBoundingClientRect();
        if (selectedBounds.left < bounds.left) tablist.scrollLeft += selectedBounds.left - bounds.left;
        else if (selectedBounds.right > bounds.right) tablist.scrollLeft += selectedBounds.right - bounds.right;
      };
      const onSelect = (tab, index) => {
        if (p.variant === 'overflow') revealSelected();
        if (previous) {
          previous.disabled = index === 0;
          next.disabled = index === tabs.length - 1;
          root.querySelector('[data-reading-status]').textContent = '읽는 순서 ' + (index + 1) + ' / ' + tabs.length;
        }
      };
      scope.cleanup(global.CVA_ELEMENT_VENDOR.mountTabs(root, { onSelect }));
      if (previous) {
        const move = direction => {
          const index = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
          const target = tabs[index + direction];
          if (target) { target.click(); target.focus({ preventScroll: true }); }
        };
        scope.on(previous, 'click', () => move(-1));
        scope.on(next, 'click', () => move(1));
      }
      if (p.variant === 'overflow' && global.ResizeObserver) {
        const observer = new global.ResizeObserver(revealSelected);
        observer.observe(tablist); scope.cleanup(() => observer.disconnect());
      }
      return () => scope.dispose();
    }
  };

  function routeRows(value) {
    const rows = value.split(/\r?\n/);
    if (rows.length > 8) throw new Error('이동 항목은 8개 이하로 입력하세요.');
    return rows.map((row, index) => {
      const separator = row.indexOf('|');
      const label = separator < 0 ? '' : row.slice(0, separator).trim();
      const url = separator < 0 ? '' : row.slice(separator + 1).trim();
      if (!label || !url) throw new Error('이동 항목 ' + (index + 1) + '에 이름 | 주소를 입력하세요.');
      return { label, url: H.href(url) };
    });
  }

  const routeNavigation = {
    id: 'route-navigation', name: '현재 위치와 페이지 이동', category: 'navigation',
    description: '경로·상단 메뉴·세로 메뉴에서 실제 목적지와 현재 페이지를 읽고 native 링크로 이동합니다.',
    keywords: ['navigation', 'breadcrumb', 'header', 'rail', 'links', 'current', '경로', '현재 위치', '페이지 이동', '메뉴'],
    source: source('Basecoat breadcrumb', basecoat + 'site/src/docs/components/breadcrumb.mdx', 'MIT native nav·ol·li·ancestor link·현재 span 원형을 CVA 경로로 변환; 상단·세로 native 링크는 CVA'),
    variants: variants([['breadcrumb', '상위 경로와 현재 위치'], ['header', '상단 페이지 메뉴'], ['rail', '이름이 보이는 세로 메뉴']]),
    controls: [field('title', '탐색 이름'), field('items', '이름 | 이동할 주소 (한 줄에 하나)', 'textarea', { hint: '1~8개. http(s), #ID 또는 상대 .html 주소를 입력하세요. 경로의 현재 항목은 마지막입니다.' }), field('current', '현재 페이지 순서', 'number', { min: 1, max: 8, step: 1 })],
    defaults: { variant: 'breadcrumb', title: '현재 위치', items: '자료실 | library.html\n현재 문서 | #cva-page-top', current: 2 },
    validate(p) {
      requireText(p.title, '탐색 이름');
      const rows = routeRows(p.items);
      if (!Number.isInteger(p.current) || p.current > rows.length) throw new Error('현재 페이지 순서는 실제 이동 항목 번호로 입력하세요.');
      if (p.variant === 'breadcrumb' && p.current !== rows.length) throw new Error('경로의 현재 항목은 마지막 순서여야 합니다.');
    },
    render(p, context) {
      const titleId = H.id(context, 'route-title');
      const breadcrumb = p.variant === 'breadcrumb';
      const list = breadcrumb ? 'ol' : 'ul';
      return '<nav class="cec-route cec-route--' + p.variant + '" aria-labelledby="' + titleId + '"><h3 class="ce-title cec-route-title" id="' + titleId + '">' + e(p.title) + '</h3><' + list + ' class="cec-route-list">' + routeRows(p.items).map((item, index) => {
        const current = index === p.current - 1;
        const label = breadcrumb && current ? '<span aria-current="page">' + e(item.label) + '</span>' : '<a href="' + e(item.url) + '"' + (current ? ' aria-current="page"' : '') + '>' + e(item.label) + '</a>';
        return '<li>' + (breadcrumb && index ? '<span class="cec-route-separator" aria-hidden="true">/</span>' : '') + label + '</li>';
      }).join('') + '</' + list + '></nav>';
    }
  };

  const formGroup = {
    id: 'form-group', name: '입력과 선택 묶음', category: 'forms',
    description: 'native 검증 후 입력한 결과를 이 페이지에 표시합니다. 외부 전송이나 저장을 가장하지 않습니다.',
    keywords: ['form', 'contact', 'checkbox', 'radio', 'segmented', 'select', 'note', 'inline', '폼', '선택', '메모', '한 줄 입력'],
    source: source('Native HTML forms / CVA field', 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation', '기존 CVA field와 native validation·FormData 사용'),
    variants: variants([['contact', '이름과 메시지'], ['choices', '여러 항목 선택'], ['segmented', '한 가지 방식 선택'], ['select', '목록에서 한 항목 선택'], ['note', '짧은 메모 확인'], ['inline', '한 줄 입력과 확인']]),
    controls: [field('title', '제목'), field('description', '설명'), field('options', '선택 항목 (한 줄에 하나)', 'textarea', { variants: ['choices', 'segmented', 'select'], hint: '최대 8개. 입력 확인은 외부 전송이나 저장을 수행하지 않습니다.' }), field('required', '입력 또는 선택 필수', 'checkbox'), field('buttonLabel', '확인 버튼 이름'), field('fieldLabel', '선택·메모 입력 이름', 'text', { variants: ['select', 'note', 'inline'] }), field('text', '처음 표시할 입력', 'textarea', { variants: ['note', 'inline'], hint: '메모 또는 한 줄 입력에 사용합니다. 한 줄 입력은 줄바꿈을 포함할 수 없습니다.' })],
    defaults: { variant: 'contact', title: '함께 읽을 내용', description: '입력 확인 결과가 아래에 표시됩니다.', options: '이야기 흐름\n인물 관계\n장면 근거', required: true, buttonLabel: '입력 확인', fieldLabel: '확인할 내용', text: '' },
    validate(p) {
      requireText(p.title, '제목'); requireText(p.buttonLabel, '확인 버튼 이름');
      if (p.variant !== 'inline') validateRows(p.options, '선택 항목');
      if (['select', 'note', 'inline'].includes(p.variant)) requireText(p.fieldLabel, '입력 이름');
      if (p.variant === 'inline' && /[\r\n]/.test(p.text)) throw new Error('한 줄 입력에는 줄바꿈 없이 입력하세요. 여러 줄은 메모 변형을 사용하세요.');
    },
    render(p, context) {
      const id = H.id(context, 'form');
      const required = p.required ? ' required' : '';
      let fields;
      if (p.variant === 'contact') fields = '<label class="ce-field" for="' + id + '-name">이름<input id="' + id + '-name" name="name" autocomplete="name"' + required + '></label><label class="ce-field" for="' + id + '-email">이메일<input id="' + id + '-email" name="email" type="email" autocomplete="email"' + required + '></label><label class="ce-field" for="' + id + '-message">메시지<textarea id="' + id + '-message" name="message" rows="3"' + required + '></textarea></label>';
      else if (p.variant === 'select') fields = '<label class="ce-field" for="' + id + '-choice">' + e(p.fieldLabel) + (p.required ? ' (필수)' : '') + '<select id="' + id + '-choice" name="choice"' + required + '><option value="">항목을 선택하세요</option>' + H.lines(p.options, 8).map(label => '<option value="' + e(label) + '">' + e(label) + '</option>').join('') + '</select></label>';
      else if (p.variant === 'note') fields = '<label class="ce-field" for="' + id + '-note">' + e(p.fieldLabel) + (p.required ? ' (필수)' : '') + '<textarea id="' + id + '-note" name="note" rows="4"' + required + '>' + e(p.text) + '</textarea></label>';
      else if (p.variant === 'inline') fields = '<label class="ce-field" for="' + id + '-text">' + e(p.fieldLabel) + (p.required ? ' (필수)' : '') + '<input id="' + id + '-text" name="text" type="text" value="' + e(p.text) + '"' + required + '></label>';
      else fields = '<fieldset class="cec-choices"><legend>' + (p.variant === 'choices' ? '확인할 항목' : '읽기 방식') + (p.required ? ' (필수)' : '') + '</legend><div class="cec-choice-list' + (p.variant === 'segmented' ? ' cec-segments' : '') + '">' + H.lines(p.options, 8).map((label, index) => '<label class="cec-choice" for="' + id + '-choice-' + index + '"><input id="' + id + '-choice-' + index + '" type="' + (p.variant === 'choices' ? 'checkbox' : 'radio') + '" name="choice" value="' + e(label) + '"' + (p.variant === 'segmented' ? required : '') + '><span>' + e(label) + '</span></label>').join('') + '</div></fieldset>';
      const empty = ['choices', 'segmented', 'select'].includes(p.variant) && !H.lines(p.options, 8).length;
      return '<div class="cec-form' + (p.variant === 'inline' ? ' cec-form--inline' : '') + '">' + head(p.title, p.description) + '<form data-local-form><div class="cec-form-fields">' + fields + '</div><button class="ce-button" type="submit"' + (empty ? ' disabled' : '') + '>' + e(p.buttonLabel) + '</button></form>' + status(empty ? '아직 선택 항목이 없습니다. 항목을 추가하세요.' : '결과는 이 페이지에서만 확인합니다.') + '</div>';
    },
    mount(node, p) {
      const scope = H.scope();
      const form = node.querySelector('form');
      const choices = Array.from(form.querySelectorAll('input[type="checkbox"]'));
      const result = node.querySelector('[data-status]');
      let reviewed = false;
      const markChanged = () => {
        if (!reviewed) return;
        reviewed = false;
        result.textContent = '입력이 바뀌었습니다. 현재 내용을 다시 확인하세요.';
      };
      scope.on(form, 'input', markChanged);
      scope.on(form, 'change', markChanged);
      scope.on(form, 'invalid', markChanged, true);
      if (['select', 'note', 'inline'].includes(p.variant)) {
        const input = form.querySelector(p.variant === 'inline' ? 'input[name="text"]' : 'select, textarea');
        const syncValidity = () => { if (input.validity.valid) input.removeAttribute('aria-invalid'); else input.setAttribute('aria-invalid', 'true'); };
        scope.on(input, 'blur', syncValidity);
        scope.on(input, 'invalid', syncValidity);
        scope.on(input, 'input', () => { if (input.validity.valid) input.removeAttribute('aria-invalid'); });
      }
      const validateChoices = () => {
        if (choices.length) choices[0].setCustomValidity(p.required && !choices.some(choice => choice.checked) ? '한 가지 이상 선택하세요.' : '');
      };
      validateChoices();
      if (choices.length) scope.on(form, 'change', validateChoices);
      scope.on(form, 'submit', event => {
        event.preventDefault(); validateChoices();
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        result.textContent = p.variant === 'contact' ? '입력 확인: ' + String(data.get('name') || '이름 없음') + ' · ' + String(data.get('email') || '이메일 없음') + ' · 메시지 ' + Array.from(String(data.get('message') || '')).length + '자. 외부로 전송하지 않았습니다.' : p.variant === 'inline' ? '입력 확인: ' + (String(data.get('text') || '') || '내용 없음') + '. 이 페이지에서 확인한 결과입니다.' : p.variant === 'note' ? '메모 확인: ' + (String(data.get('note') || '') || '내용 없음') + ' · ' + Array.from(String(data.get('note') || '')).length + '자. 이 페이지에서 확인한 결과입니다.' : '현재 선택: ' + (data.getAll('choice').join(', ') || '선택 없음') + '. 이 페이지에서 확인한 결과입니다.';
        reviewed = true;
      });
      return () => scope.dispose();
    }
  };

  const overlay = {
    id: 'overlay', name: '상세 창과 짧은 도움말', category: 'overlays',
    description: '상세·이미지·옆쪽 또는 아래쪽 읽기 창·도움말·내용 확인을 native 열기·닫기와 초점 복귀로 구별합니다.',
    keywords: ['dialog', 'drawer', 'popover', 'modal', 'nonmodal', 'confirm', 'media', 'sheet', 'overlay', '상세', '이미지', '도움말', '확인', '아래쪽 상세 창', '바닥 창'],
    source: source('Basecoat native dialog / MDN Popover', basecoat + 'site/src/docs/components/dialog.mdx', 'MIT native dialog 구조를 CVA로 한정 변환; popover는 플랫폼 API 사용'),
    variants: variants([['dialog', '중앙 상세 창'], ['drawer', '옆쪽 읽기 창'], ['popover', '짧은 도움말'], ['nonmodal', '본문과 함께 보는 창'], ['confirm', '읽고 확인하는 창'], ['media', '그림과 설명 자세히 보기'], ['sheet', '아래에서 펼치는 읽기 창']]),
    controls: [field('title', '창 제목'), field('body', '본문', 'textarea'), field('trigger', '여는 버튼'), field('closeLabel', '닫는 버튼'), field('confirmLabel', '내용 확인 버튼'), field('image', '상세 이미지', 'image'), field('caption', '이미지 설명')],
    defaults: { variant: 'dialog', title: '장면의 근거', body: '이 장면은 같은 만남을 다른 인물의 시점에서 보여줍니다.\n원문의 내용과 현재 판단을 구분해 읽어 주세요.', trigger: '근거 자세히 읽기', closeLabel: '닫기', confirmLabel: '내용 확인', image: '', caption: '' },
    validate(p) { requireText(p.title, '창 제목'); requireText(p.trigger, '여는 버튼 이름'); requireText(p.closeLabel, '닫는 버튼 이름'); if (p.variant === 'confirm') requireText(p.confirmLabel, '내용 확인 버튼 이름'); },
    render(p, context) {
      const id = H.id(context, 'overlay');
      const popover = p.variant === 'popover';
      const nonmodal = p.variant === 'nonmodal';
      const confirm = p.variant === 'confirm';
      const media = p.variant === 'media';
      const topClose = media || p.variant === 'sheet';
      const openAttrs = popover ? ' popovertarget="' + id + '"' : nonmodal ? ' aria-controls="' + id + '" aria-expanded="false" aria-haspopup="dialog"' : ' commandfor="' + id + '" command="show-modal" aria-haspopup="dialog"';
      const closeAttrs = popover ? ' popovertarget="' + id + '" popovertargetaction="hide"' : nonmodal ? '' : ' commandfor="' + id + '" command="close"';
      const openButton = '<button type="button" class="ce-button" data-overlay-open' + openAttrs + '>' + e(p.trigger) + '</button>';
      const closeButton = '<button type="button" class="ce-button' + (confirm ? ' secondary' : '') + '" data-overlay-close autofocus' + closeAttrs + '>' + e(p.closeLabel) + '</button>';
      const summary = media ? '<div class="cec-media-summary">' + H.media(p.image) + '<div class="cec-media-summary-copy"><p class="ce-title">' + e(p.title) + '</p>' + openButton + '</div></div>' : openButton;
      return '<div class="cec-overlay cec-overlay--' + p.variant + '">' + summary + '<' + (popover ? 'div' : 'dialog') + ' id="' + id + '" class="cec-overlay-panel" data-overlay-panel aria-labelledby="' + id + '-title"' + (popover ? ' popover="auto"' : ' aria-describedby="' + id + '-body"') + '><header><h3 class="ce-title" id="' + id + '-title">' + e(p.title) + '</h3>' + (topClose ? closeButton : '') + '</header>' + (media ? H.media(p.image, {caption: p.caption}) : '') + '<div class="ce-body cec-overlay-body" id="' + id + '-body">' + e(p.body) + '</div>' + (topClose ? '' : '<footer>' + closeButton + (confirm ? '<button type="button" class="ce-button" data-overlay-confirm>' + e(p.confirmLabel) + '</button>' : '') + '</footer>') + '</' + (popover ? 'div' : 'dialog') + '>' + (confirm ? status('아직 내용을 확인하지 않았습니다.') : '') + '</div>';
    },
    mount(node, p) {
      const scope = H.scope();
      const panel = node.querySelector('[data-overlay-panel]');
      const trigger = node.querySelector('[data-overlay-open]');
      const close = node.querySelector('[data-overlay-close]');
      const confirm = node.querySelector('[data-overlay-confirm]');
      const result = node.querySelector('[data-status]');
      const popover = p.variant === 'popover';
      const nonmodal = p.variant === 'nonmodal';
      const native = popover ? typeof panel.showPopover === 'function' : typeof panel[nonmodal ? 'show' : 'showModal'] === 'function';
      const invoker = !popover && native && global.HTMLButtonElement && 'commandForElement' in global.HTMLButtonElement.prototype;
      let backdropPress = false;
      const isBackdrop = event => {
        const bounds = panel.getBoundingClientRect();
        return event.target === panel && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
      };
      const restoreFocus = () => { if (trigger.isConnected) trigger.focus(); };
      const showResult = confirmed => { if (result) result.textContent = confirmed ? '내용을 확인했습니다. 이 페이지에서 확인한 결과입니다.' : '내용 확인을 취소했습니다. 다시 열어 확인할 수 있습니다.'; };
      const resetResult = () => { panel.returnValue = ''; if (result) result.textContent = '내용을 읽고 확인 또는 닫기를 선택하세요.'; };
      const fallbackClose = (confirmed = false) => { panel.hidden = true; panel.removeAttribute('open'); trigger.setAttribute('aria-expanded', 'false'); showResult(confirmed); restoreFocus(); };
      if (!native) {
        panel.dataset.fallback = 'true'; panel.hidden = true;
        panel.removeAttribute('popover'); panel.removeAttribute('aria-modal');
        panel.setAttribute('role', 'region'); trigger.setAttribute('aria-expanded', 'false');
        scope.on(trigger, 'click', () => {
          if (!panel.hidden) { fallbackClose(); return; }
          resetResult(); panel.hidden = false; panel.setAttribute('open', ''); trigger.setAttribute('aria-expanded', 'true'); close.focus();
        });
        scope.on(close, 'click', () => fallbackClose());
        if (confirm) scope.on(confirm, 'click', () => fallbackClose(true));
        scope.on(node, 'keydown', event => { if (event.key === 'Escape' && !panel.hidden && (!nonmodal || panel.contains(event.target))) { event.preventDefault(); fallbackClose(); } });
      } else if (!popover) {
        scope.on(trigger, 'click', () => {
          if (panel.open) return;
          resetResult();
          if (nonmodal) { panel.show(); trigger.setAttribute('aria-expanded', 'true'); close.focus(); }
          else if (!invoker) panel.showModal();
        });
        if (!invoker || nonmodal) {
          scope.on(close, 'click', () => panel.close());
        }
        if (confirm) scope.on(confirm, 'click', () => panel.close('confirmed'));
        scope.on(panel, 'close', () => { if (nonmodal) trigger.setAttribute('aria-expanded', 'false'); showResult(panel.returnValue === 'confirmed'); restoreFocus(); });
        if (nonmodal) scope.on(panel, 'keydown', event => { if (event.key === 'Escape') { event.preventDefault(); panel.close(); } });
        else {
          scope.on(panel, 'pointerdown', event => { backdropPress = isBackdrop(event); });
          scope.on(panel, 'click', event => { if (backdropPress && isBackdrop(event)) panel.close(); backdropPress = false; });
        }
      }
      scope.cleanup(() => {
        if (native && popover && panel.matches(':popover-open')) panel.hidePopover();
        if (native && !popover && panel.open) panel.close();
        if (!native) { panel.hidden = true; panel.removeAttribute('open'); trigger.setAttribute('aria-expanded', 'false'); }
      });
      return () => scope.dispose();
    }
  };

  const range = {
    id: 'range', name: '값을 고르는 슬라이더', category: 'sliders',
    description: 'native range로 한 값 또는 시작과 끝 범위를 고릅니다. 키보드·단위·현재 값과 미리보기의 채움을 함께 유지합니다.',
    keywords: ['range', 'slider', 'steps', 'output', 'number', 'buttons', 'interval', '슬라이더', '값', '숫자 입력', '범위 선택', '시작과 끝', '두 값'],
    source: source('Basecoat range', basecoat + 'src/js/range.js', 'MIT min/max/value→CSS percent와 cleanup 재사용; native label·output은 CVA'),
    variants: variants([['single', '단일 값'], ['steps', '눈금 선택'], ['output', '큰 숫자와 값'], ['number', '숫자로 함께 입력'], ['buttons', '버튼으로 한 단위씩 조정'], ['interval', '시작과 끝 범위 선택']]),
    controls: [field('label', '값 이름'), field('min', '최솟값', 'number', { min: -10000, max: 10000, step: 'any' }), field('max', '최댓값', 'number', { min: -9999, max: 10001, step: 'any' }), field('value', '처음 값 · 범위의 시작', 'number', { min: -10000, max: 10001, step: 'any' }), field('upperValue', '범위의 끝 값', 'number', { min: -10000, max: 10001, step: 'any', variants: ['interval'] }), field('step', '조정 단위', 'number', { min: 0.1, max: 1000, step: 'any' }), field('unit', '표시 단위')],
    defaults: { variant: 'single', label: '두 장면의 비교 비율', min: 0, max: 100, value: 40, upperValue: 80, step: 10, unit: '%' },
    validate(p) {
      requireText(p.label, '값 이름');
      if (p.min >= p.max) throw new Error('최댓값은 최솟값보다 커야 합니다.');
      if (p.step > p.max - p.min) throw new Error('조정 단위는 전체 범위 이내로 입력하세요.');
      if (p.value < p.min || p.value > p.max) throw new Error('처음 값은 최솟값과 최댓값 사이로 입력하세요.');
      const steps = (p.value - p.min) / p.step;
      if (Math.abs(steps - Math.round(steps)) > 1e-7) throw new Error('처음 값은 최솟값에서 조정 단위에 맞춰 입력하세요.');
      if (p.variant === 'interval') {
        if (p.upperValue < p.value || p.upperValue > p.max) throw new Error('끝 값은 시작 값과 최댓값 사이로 입력하세요.');
        const upperSteps = (p.upperValue - p.min) / p.step;
        if (Math.abs(upperSteps - Math.round(upperSteps)) > 1e-7) throw new Error('끝 값은 최솟값에서 조정 단위에 맞춰 입력하세요.');
      }
    },
    render(p, context) {
      const id = H.id(context, 'range');
      const max = p.max;
      const value = p.value;
      if (p.variant === 'interval') {
        return '<div class="cec-range cec-range--interval"><div class="cec-range-head"><h3 class="ce-title">' + e(p.label) + '</h3><output for="' + id + ' ' + id + '-upper" data-range-output>' + e(value + p.unit + ' – ' + p.upperValue + p.unit) + '</output></div><div class="cec-interval-input"><label for="' + id + '">' + e(p.label + ' 시작') + '</label><output for="' + id + '" data-range-lower-output>' + e(value + p.unit) + '</output><input id="' + id + '" data-range type="range" min="' + p.min + '" max="' + p.upperValue + '" step="' + p.step + '" value="' + value + '" aria-describedby="' + id + '-hint"></div><div class="cec-interval-input"><label for="' + id + '-upper">' + e(p.label + ' 끝') + '</label><output for="' + id + '-upper" data-range-upper-output>' + e(p.upperValue + p.unit) + '</output><input id="' + id + '-upper" data-range-upper type="range" min="' + value + '" max="' + max + '" step="' + p.step + '" value="' + p.upperValue + '" aria-describedby="' + id + '-hint"></div><div class="cec-range-ends"><span>전체 ' + e(p.min + p.unit) + '</span><span>' + e(max + p.unit) + '</span></div><p class="ce-body" id="' + id + '-hint">시작과 끝은 서로 넘지 않습니다. 화살표 키로 ' + e(p.step + p.unit) + '씩 조절합니다. 이 조절은 미리보기에만 적용됩니다.</p></div>';
      }
      const steps = Math.floor((max - p.min) / p.step);
      const count = Math.min(10, steps);
      const ticks = Array.from({ length: count + 1 }, (_, index) => p.min + Math.round(index * steps / count) * p.step);
      const slider = '<input id="' + id + '" data-range type="range" min="' + p.min + '" max="' + max + '" step="' + p.step + '" value="' + value + '" aria-describedby="' + id + '-hint"' + (p.variant === 'steps' ? ' list="' + id + '-ticks"' : '') + '>';
      const adjustment = p.variant === 'buttons' ? '<div class="cec-range-adjust"><button type="button" class="ce-button secondary" data-range-down aria-label="' + e(p.label + ' ' + p.step + p.unit + ' 줄이기') + '" aria-controls="' + id + '">−</button>' + slider + '<button type="button" class="ce-button secondary" data-range-up aria-label="' + e(p.label + ' ' + p.step + p.unit + ' 늘리기') + '" aria-controls="' + id + '">+</button></div>' : slider;
      const number = p.variant === 'number' ? '<label class="ce-field cec-range-number" for="' + id + '-number">' + e(p.label) + ' 숫자로 입력' + (p.unit ? ' (' + e(p.unit) + ')' : '') + '<input id="' + id + '-number" data-range-number type="number" min="' + p.min + '" max="' + max + '" step="' + p.step + '" value="' + value + '" required aria-describedby="' + id + '-hint ' + id + '-error" aria-errormessage="' + id + '-error"></label><p class="cec-range-error" id="' + id + '-error" data-range-error role="status" aria-live="polite" hidden></p>' : '';
      return '<div class="cec-range cec-range--' + p.variant + '"><div class="cec-range-head"><label class="ce-title" for="' + id + '">' + e(p.label) + '</label><output for="' + id + '" data-range-output>' + e(value + p.unit) + '</output></div>' + adjustment + (p.variant === 'steps' ? '<datalist id="' + id + '-ticks">' + ticks.map(tick => '<option value="' + tick + '"></option>').join('') + '</datalist>' : '') + '<div class="cec-range-ends" aria-hidden="true"><span>' + e(p.min + p.unit) + '</span><span>' + e(max + p.unit) + '</span></div><p class="ce-body" id="' + id + '-hint">화살표 키로 ' + e(p.step + p.unit) + '씩 조절합니다.</p>' + number + '</div>';
    },
    mount(node, p) {
      const scope = H.scope();
      const input = node.querySelector('[data-range]');
      const output = node.querySelector('[data-range-output]');
      if (p.variant === 'interval') {
        const upper = node.querySelector('[data-range-upper]');
        const lowerOutput = node.querySelector('[data-range-lower-output]');
        const upperOutput = node.querySelector('[data-range-upper-output]');
        const inputs = [input, upper], outputs = [output, lowerOutput, upperOutput];
        const originalInputs = inputs.map(control => ({ value: control.value, min: control.min, max: control.max, text: control.getAttribute('aria-valuetext'), fill: control.style.getPropertyValue('--slider-value'), priority: control.style.getPropertyPriority('--slider-value') }));
        const originalOutputs = outputs.map(control => ({ value: control.value, text: control.textContent }));
        scope.cleanup(global.CVA_ELEMENT_VENDOR.mountRange(input));
        scope.cleanup(global.CVA_ELEMENT_VENDOR.mountRange(upper));
        const update = () => {
          input.max = upper.value; upper.min = input.value;
          lowerOutput.value = input.value + p.unit; lowerOutput.textContent = lowerOutput.value;
          upperOutput.value = upper.value + p.unit; upperOutput.textContent = upperOutput.value;
          output.value = lowerOutput.value + ' – ' + upperOutput.value; output.textContent = output.value;
          inputs.forEach(control => {
            control.setAttribute('aria-valuetext', control.value + p.unit);
            // Both native bounds change together; refresh the same Basecoat fill after either input.
            const minimum = Number(control.min), maximum = Number(control.max);
            control.style.setProperty('--slider-value', (maximum === minimum ? 0 : (control.valueAsNumber - minimum) / (maximum - minimum) * 100) + '%');
          });
        };
        update(); scope.on(input, 'input', update); scope.on(upper, 'input', update);
        scope.cleanup(() => {
          inputs.forEach((control, index) => {
            const original = originalInputs[index];
            control.min = original.min; control.max = original.max; control.value = original.value;
            if (original.text === null) control.removeAttribute('aria-valuetext'); else control.setAttribute('aria-valuetext', original.text);
            if (original.fill) control.style.setProperty('--slider-value', original.fill, original.priority); else control.style.removeProperty('--slider-value');
          });
          outputs.forEach((control, index) => { control.value = originalOutputs[index].value; control.textContent = originalOutputs[index].text; });
        });
        return () => scope.dispose();
      }
      const number = node.querySelector('[data-range-number]');
      const error = node.querySelector('[data-range-error]');
      const down = node.querySelector('[data-range-down]');
      const up = node.querySelector('[data-range-up]');
      scope.cleanup(global.CVA_ELEMENT_VENDOR.mountRange(input));
      const clearError = () => { if (number) { number.removeAttribute('aria-invalid'); error.hidden = true; error.textContent = ''; } };
      const update = () => {
        output.value = input.value + p.unit; output.textContent = output.value; input.setAttribute('aria-valuetext', input.value + p.unit);
        if (number) {
          if (number.valueAsNumber !== input.valueAsNumber) number.value = input.value;
          clearError();
        }
        if (down) {
          const stepIndex = Math.round((input.valueAsNumber - p.min) / p.step);
          down.disabled = stepIndex === 0;
          up.disabled = stepIndex >= Math.floor((p.max - p.min) / p.step + 1e-7);
        }
      };
      update(); scope.on(input, 'input', update);
      const notify = () => input.dispatchEvent(new global.Event('input', { bubbles: true }));
      if (number) {
        const syncNumber = () => {
          if (!number.validity.valid || number.value === '') return;
          input.value = number.value; notify();
        };
        const validateNumber = () => {
          if (number.validity.valid && number.value !== '') { syncNumber(); return; }
          number.setAttribute('aria-invalid', 'true'); error.hidden = false;
          error.textContent = number.value === '' || number.validity.badInput ? '숫자를 입력하세요.' : number.validity.rangeUnderflow || number.validity.rangeOverflow ? p.min + p.unit + '부터 ' + p.max + p.unit + ' 사이로 입력하세요.' : p.min + p.unit + '에서 ' + p.step + p.unit + '씩 맞춰 입력하세요.';
        };
        scope.on(number, 'input', syncNumber);
        scope.on(number, 'blur', validateNumber);
        scope.on(number, 'change', validateNumber);
      }
      if (down) {
        scope.on(down, 'click', () => { input.stepDown(); notify(); });
        scope.on(up, 'click', () => { input.stepUp(); notify(); });
      }
      return () => scope.dispose();
    }
  };

  const carousel = {
    id: 'carousel', name: '직접 넘기는 갤러리', category: 'sliders',
    description: 'native 가로·세로 스크롤, 얕은 입체 서가와 이름 있는 작은 그림으로 장면을 고릅니다. 자동 재생 없이 현재 장면을 유지합니다.',
    keywords: ['carousel', 'gallery', 'scroll-snap', 'cards', 'thumbnails', 'vertical', 'depth', '갤러리', '캐러셀', '작은 그림', '세로', '입체 서가', '앞뒤 장면', '얕은 깊이'],
    source: source('WAI Carousel / native scroll snap', 'https://www.w3.org/WAI/ARIA/apg/patterns/carousel/', '제어·슬라이드 이름 원칙을 기존 CVA media와 native 스크롤에 적용; 외부 코드 payload 없음'),
    variants: variants([['snap', '한 장씩 읽기'], ['gallery', '이미지와 캡션'], ['cards', '다음 항목이 보이는 카드'], ['thumbnails', '작은 그림과 이름으로 선택'], ['vertical', '위아래로 읽기'], ['depth', '앞뒤가 보이는 입체 서가']]),
    controls: [field('title', '갤러리 이름'), field('items', '제목 | 설명 (한 줄에 하나)', 'textarea', { hint: '최대 8개. gallery·thumbnails·vertical·depth의 첫 세 장면에만 등록 이미지를 연결합니다. 나머지는 번호와 이름으로 읽습니다.' }), field('image1', '첫 번째 이미지', 'image'), field('image2', '두 번째 이미지', 'image'), field('image3', '세 번째 이미지', 'image'), field('smooth', '버튼으로 넘길 때 부드럽게 이동', 'checkbox')],
    defaults: { variant: 'snap', title: '장면의 흐름', items: '시작 | 익숙한 장소에서 이야기가 시작됩니다.\n전환 | 작은 선택이 다음 장면을 바꿉니다.\n다시 만남 | 앞선 장면과 새로운 의미로 연결됩니다.', image1: '', image2: '', image3: '', smooth: false },
    validate(p) { requireText(p.title, '갤러리 이름'); validateRows(p.items, '장면', true); },
    render(p, context) {
      const id = H.id(context, 'carousel');
      const items = pairs(p.items);
      const images = [p.image1, p.image2, p.image3];
      const withImages = ['gallery', 'thumbnails', 'vertical', 'depth'].includes(p.variant);
      const vertical = p.variant === 'vertical';
      const depth = p.variant === 'depth';
      const hint = vertical ? '본문 위아래로 스크롤합니다. 위·아래 화살표와 Home·End로 장면을 고를 수 있습니다. 끝에서는 페이지 스크롤을 이어갑니다.' : '본문을 좌우로 스크롤합니다. 왼쪽·오른쪽 화살표와 Home·End로 장면을 고를 수 있습니다.';
      const thumbnails = p.variant === 'thumbnails' && items.length ? '<div class="cec-thumbnail-list" data-slide-choices role="group" aria-label="' + e(p.title + ' 장면 직접 선택') + '">' + items.map((item, index) => {
        const image = H.image(images[index]);
        return '<button type="button" class="cec-thumbnail" data-slide-select="' + index + '" aria-controls="' + id + '-slide-' + index + '"' + (index === 0 ? ' aria-current="true"' : '') + ' aria-label="' + e((index + 1) + '번째 장면: ' + item.title) + '">' + (image ? '<img src="' + e(image.src) + '" alt="" aria-hidden="true" loading="lazy" decoding="async">' : '<span class="cec-thumbnail-index" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span>') + '<span class="cec-thumbnail-title">' + e(item.title) + '</span></button>';
      }).join('') + '</div>' : '';
      return '<section class="cec-carousel cec-carousel--' + p.variant + '" aria-roledescription="carousel" aria-labelledby="' + id + '-title"><h3 class="ce-title" id="' + id + '-title">' + e(p.title) + '</h3><p class="ce-status cec-carousel-hint" id="' + id + '-hint">' + hint + '</p><ul class="cec-track" id="' + id + '" data-track tabindex="0" aria-describedby="' + id + '-hint" aria-label="' + e(p.title) + ' 슬라이드">' + items.map((item, index) => '<li class="cec-slide" id="' + id + '-slide-' + index + '" role="group" aria-roledescription="slide" aria-label="' + e((index + 1) + ' / ' + items.length + ' · ' + item.title) + '"' + (depth ? ' data-current="' + (index === 0) + '"><div class="cec-depth-card">' : '>') + (withImages && images[index] ? H.media(images[index]) : '<div class="cec-slide-art cec-slide-art--' + index % 3 + '" aria-hidden="true"><span>' + String(index + 1).padStart(2, '0') + '</span></div>') + '<div class="cec-slide-copy"><h4 class="ce-title">' + e(item.title) + '</h4><p class="ce-body">' + e(item.body) + '</p></div>' + (depth ? '</div>' : '') + '</li>').join('') + '</ul>' + thumbnails + '<div class="ce-row cec-carousel-controls"><button type="button" class="ce-button" data-prev aria-controls="' + id + '" aria-label="' + (vertical ? '위의 장면 읽기' : '이전 장면 읽기') + '" disabled>이전</button><p class="ce-status" data-slide-status role="status" aria-live="polite" aria-atomic="true">' + (items.length ? '1 / ' + items.length : '장면 없음') + '</p><button type="button" class="ce-button" data-next aria-controls="' + id + '" aria-label="' + (vertical ? '아래 장면 읽기' : '다음 장면 읽기') + '"' + (items.length < 2 ? ' disabled' : '') + '>다음</button></div></section>';
    },
    mount(node, p) {
      const scope = H.scope();
      const track = node.querySelector('[data-track]');
      const slides = Array.from(track.children);
      const previous = node.querySelector('[data-prev]');
      const next = node.querySelector('[data-next]');
      const result = node.querySelector('[data-slide-status]');
      const selectors = Array.from(node.querySelectorAll('[data-slide-select]'));
      const selectorTrack = node.querySelector('[data-slide-choices]');
      const vertical = p.variant === 'vertical';
      const depth = p.variant === 'depth';
      const start = vertical ? 'top' : 'left', end = vertical ? 'bottom' : 'right';
      const scrollPosition = vertical ? 'scrollTop' : 'scrollLeft';
      const scrollSize = vertical ? 'scrollHeight' : 'scrollWidth';
      const viewportSize = vertical ? 'clientHeight' : 'clientWidth';
      const motion = global.matchMedia?.('(prefers-reduced-motion: reduce)');
      let current = 0;
      let requested = null;
      let previousStatus = '';
      const update = () => {
        if (!slides.length) return;
        const bounds = track.getBoundingClientRect();
        const slideBounds = slides.map(slide => slide.getBoundingClientRect());
        let nearest = 0;
        slideBounds.forEach((slide, index) => {
          if (vertical ? slide.top <= bounds.top + 2 : Math.abs(slide.left - bounds.left) < Math.abs(slideBounds[nearest].left - bounds.left)) nearest = index;
        });
        const maximum = Math.max(0, track[scrollSize] - track[viewportSize]);
        if (requested !== null) {
          const destination = Math.min(maximum, Math.max(0, slideBounds[requested][start] - slideBounds[0][start]));
          if (Math.abs(track[scrollPosition] - destination) <= 2) requested = null;
        }
        if (p.variant !== 'cards' && maximum > 2 && track[scrollPosition] >= maximum - 2) nearest = slides.length - 1;
        current = nearest;
        if (depth) slides.forEach((slide, index) => slide.setAttribute('data-current', String(index === current)));
        const visible = slideBounds.map((slide, index) => ({ slide, index })).filter(({ slide }) => Math.min(slide[end], bounds[end]) - Math.max(slide[start], bounds[start]) > 2);
        const text = p.variant === 'cards' && visible.length > 1 ? (visible[0].index + 1) + '–' + (visible[visible.length - 1].index + 1) + ' / ' + slides.length : (nearest + 1) + ' / ' + slides.length;
        if (text !== previousStatus) { result.textContent = text; previousStatus = text; }
        previous.disabled = maximum <= 2 || (requested !== null ? requested === 0 : vertical ? current === 0 : track[scrollPosition] <= 2);
        next.disabled = maximum <= 2 || (requested !== null ? requested === slides.length - 1 : vertical ? current === slides.length - 1 : track[scrollPosition] >= maximum - 2);
        selectors.forEach((button, index) => { if (index === current) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current'); });
        if (selectorTrack && selectors[current]) {
          const strip = selectorTrack.getBoundingClientRect(), selected = selectors[current].getBoundingClientRect();
          const delta = selected.right - selected.left > strip.right - strip.left || selected.left < strip.left ? selected.left - strip.left : selected.right > strip.right ? selected.right - strip.right : 0;
          if (delta) selectorTrack.scrollBy({ left: delta, behavior: 'auto' });
        }
      };
      const behavior = () => p.smooth && !motion?.matches ? 'smooth' : 'auto';
      const go = index => {
        if (!slides.length) return;
        // Intent advances independently while a native smooth scroll is still painting.
        requested = Math.max(0, Math.min(slides.length - 1, index));
        const selected = slides[requested];
        const offset = selected.getBoundingClientRect()[start] - slides[0].getBoundingClientRect()[start];
        track.scrollTo({ [start]: offset, behavior: behavior() });
        update();
      };
      const move = direction => {
        update();
        go((requested ?? current) + direction);
      };
      const cancelRequest = () => {
        requested = null;
        track.scrollTo({ [start]: track[scrollPosition], behavior: 'auto' });
        update();
      };
      scope.on(previous, 'click', () => move(-1));
      scope.on(next, 'click', () => move(1));
      selectors.forEach((button, index) => scope.on(button, 'click', () => go(index)));
      scope.on(track, 'scroll', update, { passive: true });
      scope.on(track, 'wheel', cancelRequest, { passive: true });
      scope.on(track, 'pointerdown', cancelRequest);
      scope.on(track, 'keydown', event => {
        if (event.target !== track || !slides.length || event.altKey || event.ctrlKey || event.metaKey) return;
        const forward = vertical ? 'ArrowDown' : 'ArrowRight', backward = vertical ? 'ArrowUp' : 'ArrowLeft';
        if (![forward, backward, 'Home', 'End'].includes(event.key)) {
          if (['PageUp', 'PageDown', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) cancelRequest();
          return;
        }
        update();
        // At a vertical boundary the native key can continue scrolling the page.
        if ((event.key === forward && next.disabled) || (event.key === backward && previous.disabled)) {
          if (requested !== null) event.preventDefault();
          return;
        }
        event.preventDefault();
        if (event.key === forward) go((requested ?? current) + 1);
        if (event.key === backward) go((requested ?? current) - 1);
        if (event.key === 'Home') go(0);
        if (event.key === 'End') go(slides.length - 1);
      });
      if (motion) scope.on(motion, 'change', () => { if (motion.matches) cancelRequest(); });
      if (global.ResizeObserver) {
        const resize = new global.ResizeObserver(() => { update(); if (requested !== null) go(requested); });
        resize.observe(track); slides.forEach(slide => resize.observe(slide));
        if (selectorTrack) resize.observe(selectorTrack);
        scope.cleanup(() => resize.disconnect());
      }
      update();
      return () => scope.dispose();
    }
  };

  const disclosure = {
    id: 'disclosure', name: '필요할 때 펼쳐 읽기', category: 'details',
    description: 'FAQ·단계 설명·한 항목씩 읽기·질문 검색을 details/summary의 native 상태로 표현합니다.',
    keywords: ['disclosure', 'accordion', 'details', 'faq', 'steps', 'search', '펼침', '질문 검색', '단계'],
    source: source('HyperUI native accordion', hyperui + 'application/accordions/1.html', 'MIT details/summary·chevron 구조를 CVA typography·선택 방식으로 변환'),
    variants: variants([['faq', '질문과 답'], ['steps', '번호가 있는 단계'], ['exclusive', '한 항목씩 읽기'], ['search', '질문과 답에서 찾기']]),
    controls: [field('title', '묶음 제목'), field('items', '제목 | 본문 (한 줄에 하나)', 'textarea', { hint: '최대 8개. 각 항목은 native details 상태를 유지합니다.' }), field('openFirst', '첫 항목 펼쳐 두기', 'checkbox')],
    defaults: { variant: 'faq', title: '읽기 전에 궁금한 점', items: '무엇을 먼저 읽나요? | 첫 장면과 인물의 목적부터 읽어 주세요.\n관계는 어디에서 확인하나요? | 장면의 연결과 함께 관계 설명을 펼칠 수 있습니다.\n원문을 다시 읽을 수 있나요? | 각 근거에 연결된 원문의 위치로 돌아갈 수 있습니다.', openFirst: false },
    validate(p) { requireText(p.title, '묶음 제목'); validateRows(p.items, '펼침 항목', true); },
    render(p, context) {
      const id = H.id(context, 'disclosure');
      const items = pairs(p.items);
      const search = p.variant === 'search' ? '<div class="cec-disclosure-search"><label class="ce-field" for="' + id + '-query">질문과 답에서 찾기<input type="search" id="' + id + '-query" data-disclosure-search aria-controls="' + id + '-items" aria-describedby="' + id + '-count" placeholder="검색어 입력"></label><button type="button" class="ce-button secondary" data-disclosure-reset disabled>검색 지우기</button></div><p class="ce-status cec-search-count" id="' + id + '-count" data-disclosure-count role="status" aria-live="polite" aria-atomic="true">전체 ' + items.length + '개 항목</p><p class="ce-body cec-search-empty" data-disclosure-empty hidden>일치하는 질문이나 답이 없습니다. 검색어를 바꾸거나 지워 보세요.</p>' : '';
      return '<section class="cec-disclosure cec-disclosure--' + p.variant + '">' + head(p.title, items.length ? '' : '아직 펼칠 항목이 없습니다. 제목과 본문을 추가하세요.') + search + '<div class="cec-disclosures"' + (p.variant === 'search' ? ' id="' + id + '-items"' : '') + '>' + items.map((item, index) => '<details' + (p.variant === 'exclusive' ? ' name="' + id + '"' : '') + (p.openFirst && index === 0 ? ' open' : '') + '><summary>' + (p.variant === 'steps' ? '<span class="cec-step-number" aria-hidden="true">' + (index + 1) + '</span>' : '') + '<span>' + e(item.title) + '</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></summary><div class="ce-body cec-disclosure-body">' + e(item.body) + '</div></details>').join('') + '</div></section>';
    },
    mount(node, p) {
      const scope = H.scope();
      const details = Array.from(node.querySelectorAll('.cec-disclosures > details'));
      if (p.variant === 'exclusive' && details.length && !('name' in details[0])) details.forEach(current => scope.on(current, 'toggle', () => { if (current.open) details.forEach(other => { if (other !== current) other.open = false; }); }));
      if (p.variant === 'search') {
        const input = node.querySelector('[data-disclosure-search]');
        const reset = node.querySelector('[data-disclosure-reset]');
        const count = node.querySelector('[data-disclosure-count]');
        const empty = node.querySelector('[data-disclosure-empty]');
        const corpus = pairs(p.items).map(item => (item.title + '\n' + item.body).toLocaleLowerCase());
        const update = () => {
          const query = input.value.trim().toLocaleLowerCase();
          let matches = 0;
          details.forEach((detail, index) => { detail.hidden = Boolean(query && !corpus[index].includes(query)); if (!detail.hidden) matches += 1; });
          count.textContent = query ? matches + ' / ' + details.length + '개 항목' : '전체 ' + details.length + '개 항목';
          reset.disabled = input.value.length === 0;
          empty.hidden = !query || matches > 0;
        };
        scope.on(input, 'input', update);
        scope.on(reset, 'click', () => { input.value = ''; update(); input.focus(); });
        scope.cleanup(() => { input.value = ''; update(); });
        update();
      }
      return () => scope.dispose();
    }
  };

  global.CVA_ELEMENTS_CONTROLS = [actionButton, loadingStatus, controlledTabs, routeNavigation, formGroup, overlay, range, carousel, disclosure];
})(typeof window !== 'undefined' ? window : globalThis);
