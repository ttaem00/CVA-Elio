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

  function inlineLinks(value) {
    const text = String(value == null ? '' : value), parts = [];
    let cursor = 0;
    // Match the original Elio reader's bounded label and HTTPS reference syntax.
    for (const match of text.matchAll(/\[\[([^\[\]|]{1,80})\|(https:\/\/[^\]\s]+)\]\]/gu)) {
      parts.push(escape(text.slice(cursor, match.index)));
      const [, label, url] = match;
      try {
        parts.push('<a href="' + escape(safeHref(url)) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + '</a>');
      } catch {
        parts.push(escape(match[0]));
      }
      cursor = match.index + match[0].length;
    }
    parts.push(escape(text.slice(cursor)));
    return parts.join('');
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

  function media(reference, { caption = '', title = '', body = '', label = '', className = '' } = {}) {
    if (!reference) return '';
    const asset = (global.CVA_MODULES && global.CVA_MODULES.media || []).find(item => item.id === reference || item.src === reference);
    if (!asset) throw new Error('등록된 로컬 이미지만 사용할 수 있습니다.');
    if (!['', 'cva-item'].includes(className)) throw new Error('이미지 컴포넌트 변형이 올바르지 않습니다.');
    const captionHTML = badge(label) + (title ? '<h3 class="cva-item-title">' + escape(title) + '</h3>' : '') +
      (body ? '<p class="cva-item-body">' + escape(body) + '</p>' : '') + (caption ? '<p>' + escape(caption) + '</p>' : '');
    return '<figure class="cva-media' + (className ? ' ' + className : '') + '" data-media-id="' + asset.id + '">' +
      '<img src="' + escape(asset.src) + '" alt="' + escape(asset.alt) + '" loading="lazy" decoding="async">' +
      (captionHTML ? '<figcaption class="cva-caption">' + captionHTML + '</figcaption>' : '') + '</figure>';
  }

  function panel({ title = '', body = '', label = '', value = '', image = '' } = {}, { className = 'cva-item' } = {}) {
    if (!['cva-item', 'cva-node', 'cva-evidence-copy'].includes(className)) throw new Error('패널 변형이 올바르지 않습니다.');
    return '<article class="cva-panel ' + className + '">' + media(image) + '<div class="cva-item-copy">' + badge(label) +
      (title ? '<h3 class="cva-item-title">' + escape(title) + '</h3>' : '') +
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

  global.CVA_COMPONENTS = { version: '2.0', escape, safeHref, inlineLinks, heading, button, badge, media, panel, field, tabs, quote };
})(window);
