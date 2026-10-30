/* Plain-text atoms shared by the local CVA page renderer and property editor. */
(function (global) {
  'use strict';
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeId = value => {
    if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)) throw new Error('컴포넌트 ID가 올바르지 않습니다.');
    return value;
  };
  const hasText = value => value !== '' && value !== null && value !== undefined;

  function safeHref(value) {
    if (typeof value === 'string' && !/[\s\\\u0000-\u001f\u007f-\u009f]/u.test(value)) {
      if (value.startsWith('#')) return '#' + safeId(value.slice(1));
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        if (url.hostname && !url.username && !url.password) return value;
      } else if (/^(?!\/)(?![^?#]*\/\/)[\p{L}\p{N}._~%/-]+\.html(?:\?[^#]*)?(?:#[A-Za-z][A-Za-z0-9_-]{0,63})?$/iu.test(value)) return value;
    }
    throw new Error('링크는 로그인 정보 없는 http(s), #ID 또는 상대 .html 주소를 사용하세요.');
  }

  function heading({ eyebrow = '', title = '', body = '', level = 2 } = {}) {
    if (![1, 2, 3].includes(level)) throw new Error('제목 단계가 올바르지 않습니다.');
    return '<header class="cva-module-head">' + (eyebrow ? '<p class="cva-eyebrow">' + escape(eyebrow) + '</p>' : '') +
      (title ? '<h' + level + ' class="cva-title">' + escape(title) + '</h' + level + '>' : '') +
      (body ? '<p class="cva-lead">' + escape(body) + '</p>' : '') + '</header>';
  }

  function button(label, { target = 'cva-page-top', tone = 'primary', href } = {}) {
    if (!['primary', 'secondary'].includes(tone)) throw new Error('버튼 변형이 올바르지 않습니다.');
    const destination = href === undefined ? '#' + safeId(target) : safeHref(href);
    return '<a class="cva-button cva-button-' + tone + '" href="' + escape(destination) + '">' + escape(label) + '</a>';
  }

  function badge(label, { kind = 'neutral' } = {}) {
    if (!['neutral', 'current', 'complete', 'warning'].includes(kind)) throw new Error('라벨 상태가 올바르지 않습니다.');
    return hasText(label) ? '<span class="cva-badge" data-kind="' + kind + '">' + escape(label) + '</span>' : '';
  }

  function media(reference, { caption = '', title = '', body = '', label = '', className = '', titleLevel = 3 } = {}) {
    if (!reference) return '';
    const asset = (global.CVA_MODULES && global.CVA_MODULES.media || []).find(item => item.id === reference || item.src === reference);
    if (!asset) throw new Error('등록된 로컬 이미지만 사용할 수 있습니다.');
    if (!['', 'cva-item'].includes(className)) throw new Error('이미지 컴포넌트 변형이 올바르지 않습니다.');
    if (![1, 2, 3].includes(titleLevel)) throw new Error('제목 단계가 올바르지 않습니다.');
    const captionHTML = badge(label) + (title ? '<h' + titleLevel + ' class="cva-item-title">' + escape(title) + '</h' + titleLevel + '>' : '') +
      (body ? '<p class="cva-item-body">' + escape(body) + '</p>' : '') + (caption ? '<p>' + escape(caption) + '</p>' : '');
    return '<figure class="cva-media' + (className ? ' ' + className : '') + '" data-media-id="' + asset.id + '">' +
      '<img src="' + escape(asset.src) + '" alt="' + escape(asset.alt) + '" loading="lazy" decoding="async">' +
      (captionHTML ? '<figcaption class="cva-caption">' + captionHTML + '</figcaption>' : '') + '</figure>';
  }

  function panel({ title = '', body = '', label = '', value = '', image = '' } = {}, { className = 'cva-item', titleLevel = 3 } = {}) {
    if (!['cva-item', 'cva-node', 'cva-evidence-copy'].includes(className)) throw new Error('패널 변형이 올바르지 않습니다.');
    if (![1, 2, 3].includes(titleLevel)) throw new Error('제목 단계가 올바르지 않습니다.');
    return '<article class="cva-panel ' + className + '">' + media(image) + '<div class="cva-item-copy">' + badge(label) +
      (title ? '<h' + titleLevel + ' class="cva-item-title">' + escape(title) + '</h' + titleLevel + '>' : '') +
      (hasText(value) ? '<p class="cva-value">' + escape(value) + '</p>' : '') +
      (body ? '<p class="cva-item-body">' + escape(body) + '</p>' : '') + '</div></article>';
  }

  function field({ id, label = '', kind = 'text', value = '', options = [], hint = '', error = '', required = false, disabled = false } = {}) {
    safeId(id);
    if (!['text', 'textarea', 'select', 'image', 'items'].includes(kind)) throw new Error('입력 필드 종류가 올바르지 않습니다.');
    const described = [hint && id + '-hint', error && id + '-error'].filter(Boolean);
    const attributes = (required ? ' required' : '') + (disabled ? ' disabled' : '') +
      (error ? ' aria-invalid="true"' : '') + (described.length ? ' aria-describedby="' + described.join(' ') + '"' : '');
    let input;
    if (kind === 'select' || kind === 'image') {
      input = '<select id="' + id + '" class="cva-field-control"' + attributes + '>' + options.map(option => '<option value="' + escape(option.id) + '"' +
        (String(option.id) === String(value) ? ' selected' : '') + '>' + escape(option.label) + '</option>').join('') + '</select>';
    } else if (kind === 'textarea' || kind === 'items') {
      input = '<textarea id="' + id + '" class="cva-field-control" rows="4"' + attributes + '>' + escape(kind === 'items' && Array.isArray(value) ? JSON.stringify(value, null, 2) : value) + '</textarea>';
    } else input = '<input id="' + id + '" class="cva-field-control" type="text" value="' + escape(value) + '"' + attributes + '>';
    return '<div class="cva-field"><label for="' + id + '">' + escape(label) + (required ? ' <span class="cva-field-required">필수</span>' : '') + '</label>' + input +
      (hint ? '<p id="' + id + '-hint" class="cva-field-hint">' + escape(hint) + '</p>' : '') +
      (error ? '<p id="' + id + '-error" class="cva-field-error">' + escape(error) + '</p>' : '') + '</div>';
  }

  function tabs(items, { active = null, label = '부분 탐색' } = {}) {
    if (!Array.isArray(items)) throw new Error('탭 항목은 목록이어야 합니다.');
    // Links keep native keyboard and history behavior; no fake tab roles without a controller.
    return '<nav class="cva-tabs" aria-label="' + escape(label) + '">' + items.map(item => '<a href="#' + safeId(item.id) + '"' +
      (item.id === active ? ' aria-current="location"' : '') + '>' + escape(item.title || item.label) + '</a>').join('') + '</nav>';
  }

  function quote(body, cite = '') {
    return '<blockquote class="cva-quote"><p class="cva-body">' + escape(body) + '</p>' +
      (cite ? '<cite class="cva-cite">' + escape(cite) + '</cite>' : '') + '</blockquote>';
  }

  /* BEGIN CANONICAL ELIO GUIDES */
  const elioGuideTemplates = {"guide": "<section id=\"guide-{{GUIDE_ID}}\" class=\"reader-guide reader-guide--{{KIND}}\" aria-labelledby=\"{{TITLE_ID}}\"><div class=\"reader-guide__content\">{{HEADER}}{{ITEMS}}{{SOURCES}}</div>{{COVER}}</section>", "header": "<header class=\"reader-guide__header\"><span>{{LABEL}}</span><h{{LEVEL}} id=\"{{TITLE_ID}}\">{{TITLE}}</h{{LEVEL}}><p>{{SUMMARY}}</p></header>", "disclosure": "<details class=\"reader-guide__disclosure\"{{OPEN}}><summary><span class=\"reader-guide__meta\"><span>{{LABEL}}</span></span><strong>{{TITLE}}</strong><i aria-hidden=\"true\"></i></summary><div class=\"reader-guide__answer\">{{ANSWER}}</div></details>", "disclosures": "<div class=\"reader-guide__disclosures\">{{ITEMS}}</div>", "paragraph": "<p>{{TEXT}}</p>", "source_note": "<p class=\"reader-guide__source-note\"><strong>근거</strong> {{TEXT}}</p>", "reference": "<a class=\"reader-guide__reference\" href=\"{{HREF}}\" target=\"_blank\" rel=\"noopener noreferrer\">원문 근거<span aria-hidden=\"true\">↗</span></a>", "related_scene": "<a class=\"reader-guide__scene\" href=\"{{HREF}}\" data-main-scene=\"true\">관련 장면 돌아보기 ↑</a>", "cover": "<button class=\"spoiler-cover\" type=\"button\" aria-label=\"이야기 이해 내용 보기\" hidden><span><small>이야기 이해</small><strong>클릭해서 내용 보기</strong></span></button>"};
  /* END CANONICAL ELIO GUIDES */

  function elioGuide({ id, title = '', body = '', eyebrow = '', items = [] } = {}, context = {}) {
    safeId(id);
    if (!Array.isArray(items) || items.length > 200) throw new Error('Elio 해설 항목 목록이 필요합니다.');
    const kind = context.kind ?? 'questions', level = context.titleLevel ?? 3;
    if (!['questions', 'clues'].includes(kind) || ![1, 2, 3].includes(level)) throw new Error('Elio 해설의 종류와 제목 단계를 확인하세요.');
    const render = (name, values) => elioGuideTemplates[name].replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
      if (!Object.hasOwn(values, key)) throw new Error('Elio 해설 템플릿 입력이 부족합니다: ' + key);
      return values[key];
    });
    const titleId = 'guide-' + id + '-title';
    const entries = items.map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error('Elio 해설 항목이 필요합니다.');
      let answer = render('paragraph', { TEXT: escape(item.body ?? '') });
      if (hasText(item.detail)) answer += render('paragraph', { TEXT: escape(item.detail) });
      if (hasText(item.source)) answer += render('source_note', { TEXT: escape(item.source) });
      if (hasText(item.sourceHref)) answer += render('reference', { HREF: escape(safeHref(item.sourceHref)) });
      if (hasText(item.relatedHref)) {
        if (typeof item.relatedHref !== 'string' || !item.relatedHref.startsWith('#')) throw new Error('관련 장면은 확인한 페이지 내부 #ID로 연결하세요.');
        answer += render('related_scene', { HREF: escape(safeHref(item.relatedHref)) });
      }
      return render('disclosure', { OPEN: index === 0 ? ' open' : '', LABEL: escape(item.label ?? ''), TITLE: escape(item.title ?? ''), ANSWER: answer });
    }).join('');
    const header = render('header', { LABEL: escape(eyebrow || (kind === 'clues' ? '떡밥과 상징' : '질문과 답')), LEVEL: String(level), TITLE_ID: titleId, TITLE: escape(title), SUMMARY: escape(body) });
    return render('guide', { GUIDE_ID: id, KIND: kind, TITLE_ID: titleId, HEADER: header,
      ITEMS: render('disclosures', { ITEMS: entries }), SOURCES: '', COVER: '' });
  }

  const previewDownloadSelector = '.cva-element[data-ce-id="action-button"][data-ce-variant="download"] a[data-download][download]';
  function forwardPreviewDownloads(root, host, origin) {
    root.addEventListener('click', event => {
      const link = event.target.closest(previewDownloadSelector);
      if (!link || !link.href.startsWith('blob:')) return;
      event.preventDefault();
      host.postMessage({ type: 'cva.preview.download', url: link.href, filename: link.download }, origin);
    });
  }
  function receivePreviewDownload(event, frames) {
    if (event.origin !== global.location.origin || event.data?.type !== 'cva.preview.download') return false;
    const frame = frames.find(frame => frame && frame.contentWindow === event.source);
    if (!frame || typeof event.data.url !== 'string') return false;
    try { const url = new URL(event.data.url); if (url.protocol !== 'blob:' || url.origin !== global.location.origin) return false; } catch (_) { return false; }
    const link = [...(frame.contentDocument?.querySelectorAll(previewDownloadSelector) || [])].find(link => link.href === event.data.url && link.download === event.data.filename);
    if (!link) return false;
    const download = global.document.createElement('a');
    download.href = link.href; download.download = link.download; download.hidden = true;
    global.document.body.append(download); download.click(); download.remove();
    return true;
  }
  global.CVA_COMPONENTS = { version: '2.0', escape, safeHref, heading, button, badge, media, panel, field, tabs, quote, elioGuide, forwardPreviewDownloads, receivePreviewDownload };
})(window);
