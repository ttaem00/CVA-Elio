/* Canonical Elio input and exports. S53 Work objects are display projections only. */
(function (root, factory) {
  'use strict';
  const board = root.ElioBoard || (typeof module !== 'undefined' && module.exports ? require('./vendor/board-model.js') : null);
  const api = factory(board);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ElioBoardDocuments = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (board) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const text = (value, label, max, empty = false) => check(typeof value === 'string' && (empty || value.trim()) && value.length <= max, `${label}을 확인해 주세요.`);
  const id = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const modes = ['atlas', 'tapestry', 'depth', 'hud'];

  function safeImageURL(value) {
    check(typeof value === 'string' && !/[\s\\"'<>\u0000-\u001f\u007f-\u009f]/u.test(value), '배경 이미지 주소를 확인해 주세요.');
    if (!value) return '';
    if (/^data:/i.test(value)) {
      check(/^data:image\/(?:png|jpeg|webp|gif|avif|svg\+xml);base64,[a-z\d+/]+={0,2}$/i.test(value), '배경에는 일반 이미지 파일을 사용해 주세요.');
      return value;
    }
    check(!value.startsWith('//') && !value.startsWith('#'), '배경 이미지 주소를 확인해 주세요.');
    check(!/^[a-z][a-z\d+.-]*:/i.test(value) || /^https?:\/\//i.test(value), '배경 이미지 주소를 확인해 주세요.');
    let url;
    try { url = new URL(value, 'https://elio.invalid/'); } catch { check(false, '배경 이미지 주소를 확인해 주세요.'); }
    check(/^https?:$/.test(url.protocol) && !url.username && !url.password, '배경은 로그인 정보 없는 HTTP(S) 또는 이미지 파일 경로를 사용해 주세요.');
    return value;
  }

  function presentation(input) {
    const value = input?.board_presentation;
    check(value === undefined || value && typeof value === 'object' && !Array.isArray(value), '보드 표현 설정을 확인해 주세요.');
    if (value?.style !== undefined) check(value.style === '' || modes.includes(value.style), '보드 표시 스타일을 확인해 주세요.');
    if (value?.panel !== undefined) check(['auto', '3d', 'glow', 'flat'].includes(value.panel), '보드 패널 표현을 확인해 주세요.');
    if (value?.accent !== undefined) check(typeof value.accent === 'string' && (value.accent === '' || /^#[a-f\d]{6}$/i.test(value.accent)), '강조 색상은 #과 여섯 자리 색상값을 사용해 주세요.');
    if (value?.image_fit !== undefined) check(['natural', 'cover'].includes(value.image_fit), '카드 이미지 표시 방식을 확인해 주세요.');
    const background = value?.background;
    check(background === undefined || background && typeof background === 'object' && !Array.isArray(background), '배경 설정을 확인해 주세요.');
    if (background?.image !== undefined) safeImageURL(background.image);
    if (background?.color !== undefined) check(typeof background.color === 'string' && (background.color === '' || /^#[a-f\d]{6}$/i.test(background.color)), '배경 색상은 #과 여섯 자리 색상값을 사용해 주세요.');
    if (background?.opacity !== undefined) check(Number.isFinite(background.opacity) && background.opacity >= 0 && background.opacity <= 1, '배경 농도는 0부터 1 사이로 지정해 주세요.');
    return { style: value?.style || '', panel: value?.panel || 'auto', accent: value?.accent || '', image_fit: value?.image_fit || 'natural', background: { image: background?.image || '', color: background?.color || '', opacity: background?.opacity ?? 0.3 } };
  }

  function normalizeDocument(input) {
    const json = JSON.stringify(input);
    const bytes = Array.from(json).reduce((total, char) => { const n = char.codePointAt(0); return total + (n <= 0x7f ? 1 : n <= 0x7ff ? 2 : n <= 0xffff ? 3 : 4); }, 0);
    check(bytes <= board.MAX_BYTES, 'JSON 파일은 2MB 이하로 선택해 주세요.');
    check(typeof input?.work_id === 'string' && id.test(input.work_id), '콘텐츠 ID를 확인해 주세요.');
    presentation(input);
    if (input?.schema_version === 'elio.board.v1') {
      const data = board.normalizeDataset(input);
      if (data.overview_event_ids !== undefined) {
        const events = new Set(data.events.map(event => event.id));
        check(Array.isArray(data.overview_event_ids) && data.overview_event_ids.length > 0
          && new Set(data.overview_event_ids).size === data.overview_event_ids.length
          && data.overview_event_ids.every(id => events.has(id)), '장 전체 보기는 현재 문서의 장면을 가리켜야 합니다.');
      }
      if (data.reader_context !== undefined) {
        check(data.reader_context && typeof data.reader_context === 'object' && !Array.isArray(data.reader_context), '읽는 구간 정보를 확인해 주세요.');
        for (const key of ['unit_id', 'unit_label', 'chapter_label', 'through_label', 'return_url']) {
          if (data.reader_context[key] !== undefined) text(data.reader_context[key], '읽는 구간 정보', 2000);
        }
      }
      return data;
    }
    check(input?.schema_version === 'elio.catalog.v1', 'Elio 이야기 또는 도감 JSON 파일을 선택해 주세요.');
    const data = clone(input);
    check(!['events', 'story_topology', 'edge_conditions'].some(name => Object.hasOwn(data, name)), '도감에는 이야기 관계 대신 항목을 사용해 주세요.');
    text(data.title, '도감 제목', 150);
    if (data.description !== undefined) text(data.description, '도감 소개', 2000, true);
    check(Array.isArray(data.items) && data.items.length > 0 && data.items.length <= 4096, '도감 항목 목록을 확인해 주세요.');
    const ids = new Set();
    data.items.forEach(item => {
      check(item && typeof item.id === 'string' && id.test(item.id) && !ids.has(item.id), '도감 항목 ID가 없거나 중복됩니다.'); ids.add(item.id);
      text(item.title, '항목 제목', 150); text(item.body, '항목 본문', 2000, true);
    });
    if (data.sources !== undefined) check(Array.isArray(data.sources) && data.sources.every(source => source && typeof source === 'object'), '도감 출처 목록을 확인해 주세요.');
    return data;
  }

  function validReaderBase(value) {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
  }

  function projectDocument(input, assets = {}, readerBase) {
    const data = normalizeDocument(input);
    const work = { ...data, id: data.work_id, kind: data.schema_version === 'elio.catalog.v1' ? 'catalog' : 'story', authored: true, description: data.description || data.subtitle || '', material: data.material || '제공한 Elio 콘텐츠' };
    if (work.kind === 'story') {
      work.nodes = clone(data.story_topology.nodes);
      work.edges = clone(data.story_topology.edges);
      work.alignments = clone(data.story_topology.alignments);
      work.display_groups = clone(data.display_groups || (data.views || []).map(view => ({ id: view.id, title: view.title, event_ids: view.event_ids, focus_id: view.event_ids[0] })));
    }
    for (const row of work.events || work.items) {
      if (typeof row.image === 'string' && Object.hasOwn(assets, row.image)) row.image = assets[row.image];
      else if (row.image?.src && Object.hasOwn(assets, row.image.src)) row.image.src = assets[row.image.src];
      if (row.image_site_asset && Object.hasOwn(assets, row.image_site_asset)) row.image_site_asset = assets[row.image_site_asset];
      if (row.image_url && Object.hasOwn(assets, row.image_url)) row.image_url = assets[row.image_url];
    }
    const background = work.board_presentation?.background;
    if (background?.image && Object.hasOwn(assets, background.image)) background.image = assets[background.image];
    const base = validReaderBase(readerBase);
    if (base) {
      const resolveReader = value => {
        try {
          if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f-\u009f]/u.test(value)) return value;
          const url = new URL(value, base);
          if (!/^https?:$/.test(url.protocol) || url.username || url.password) return value;
          // The reading renderer still applies the existing safeHref policy to this display URL.
          return /^https?:\/\//i.test(value) ? value : url.href;
        } catch { return value; }
      };
      if (work.reader_url) work.reader_url = resolveReader(work.reader_url);
      for (const row of work.events || work.items) if (row.reader_url) row.reader_url = resolveReader(row.reader_url);
    }
    return work;
  }

  function editDocument(input, selected, changes) {
    const data = normalizeDocument(input), row = (data.events || data.items).find(item => item.id === selected);
    check(row, '수정할 장면 또는 항목을 찾을 수 없습니다.');
    const titleLimit = data.schema_version === 'elio.board.v1' ? board.MAX_BYTES : 150;
    text(changes.workTitle, '콘텐츠 제목', titleLimit); text(changes.title, '제목', titleLimit); text(changes.body, '본문', data.schema_version === 'elio.board.v1' ? board.MAX_BYTES : 2000, data.schema_version === 'elio.catalog.v1');
    data.title = changes.workTitle.trim(); row.title = changes.title.trim();
    row[data.schema_version === 'elio.board.v1' ? 'summary' : 'body'] = changes.body;
    if (changes.presentation !== undefined) {
      const next = changes.presentation;
      check(next && typeof next === 'object' && !Array.isArray(next), '보드 표현 설정을 확인해 주세요.');
      presentation({ board_presentation: next });
      data.board_presentation = { ...data.board_presentation, ...clone(next), background: { ...data.board_presentation?.background, ...clone(next.background || {}) } };
    }
    return normalizeDocument(data);
  }

  function exportDocument(input, state) {
    const data = normalizeDocument(input), records = data.events || data.items;
    const selected = records.some(row => row.id === state.node) ? state.node : records[0].id;
    // Presentation state is stored alongside the original narrative, never in its clocks/edges.
    data.board_state = { node: selected, mode: modes.includes(state.mode) ? state.mode : 'hud', scope: ['chapter', 'stage', 'focus'].includes(state.scope) ? state.scope : 'focus' };
    if (state.reading === true) data.board_state.reading = true;
    if (['3d', 'glow'].includes(state.card)) data.board_state.card = state.card;
    if (['full', 'reduced'].includes(state.motion)) data.board_state.motion = state.motion;
    if (data.views?.some(view => view.id === state.view)) data.board_state.view = state.view;
    return data;
  }

  async function loadDocuments(options) {
    const page = new URL(options.href), source = page.searchParams.get('document');
    let documents = options.documents || [];
    if (source) {
      const url = new URL(source, page);
      check(!/^(?:[a-z][a-z\d+.-]*:|[\\/])/i.test(source) && url.origin === page.origin && /^https?:$/.test(url.protocol), '같은 사이트의 상대 JSON 경로만 열 수 있습니다.');
      const response = await options.fetch(url.href, { credentials: 'same-origin', redirect: 'error' });
      check(response.ok, '문서 파일을 불러오지 못했습니다.');
      const value = await response.json(); documents = Array.isArray(value) ? value : [value];
    } else documents = await documents;
    check(Array.isArray(documents), 'Elio 문서 목록을 확인해 주세요.');
    const normalized = documents.map(normalizeDocument), ids = new Set();
    normalized.forEach(data => { check(!ids.has(data.work_id), '콘텐츠 ID가 중복됩니다.'); ids.add(data.work_id); });
    return normalized;
  }

  async function replaceAsync(value, pattern, replace) {
    const pieces = []; let cursor = 0;
    for (const match of value.matchAll(pattern)) {
      pieces.push(value.slice(cursor, match.index), await replace(...match)); cursor = match.index + match[0].length;
    }
    pieces.push(value.slice(cursor)); return pieces.join('');
  }

  async function standaloneHTML(input, state, resources) {
    const data = exportDocument(input, state);
    const assets = Object.create(null);
    const inlineImage = async value => { if (value && !/^(?:data:|#)/i.test(value) && !assets[value]) assets[value] = await resources.readDataURL(value); };
    await inlineImage(data.board_presentation?.background?.image);
    for (const row of data.events || data.items) {
      if (typeof row.image === 'string') await inlineImage(row.image);
      else if (row.image?.src) await inlineImage(row.image.src);
      if (row.image_site_asset) await inlineImage(row.image_site_asset);
      if (row.image_url) await inlineImage(row.image_url);
    }
    const payloadStart = '<!-- elio-board-' + 'payload:start -->';
    const payloadEnd = '<!-- elio-board-' + 'payload:end -->';
    let html = resources.template.replace(new RegExp(payloadStart + '[\\s\\S]*?' + payloadEnd, 'g'), '');
    html = html.replace(/<script\b[^>]*\bsrc="(?:data|documents|product-[^"]+)\.js[^"]*"[^>]*><\/script>/gi, '');
    html = html.replace(/<link\b[^>]*href="product-[^"]+"[^>]*>/gi, '');
    html = await replaceAsync(html, /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi, async (tag, name) => {
      let css = await resources.readText(name);
      css = await replaceAsync(css, /url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi, async (match, asset) => {
        if (/^(?:data:|#)/i.test(asset)) return match;
        const relative = new URL(asset, new URL(name, 'https://elio.invalid/')).pathname.slice(1);
        return `url("${await resources.readDataURL(relative)}")`;
      });
      return `<style data-elio-source="${name.split('?')[0]}">${css.replace(/<\/style/gi, '<\\/style')}</style>`;
    });
    const scripts = [];
    html = await replaceAsync(html, /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi, async (tag, name) => {
      const js = (await resources.readText(name)).replace(/^\s*\/\/[#@] sourceMappingURL=.*$/gm, '');
      scripts.push(`<script data-elio-source="${name.split('?')[0]}">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
      return '';
    });
    const payload = JSON.stringify([data]).replace(/</g, '\\u003c');
    const assetPayload = JSON.stringify(assets).replace(/</g, '\\u003c');
    const readerBase = validReaderBase(resources.readerBase);
    const readerPayload = readerBase ? `window.ELIO_BOARD_READER_BASE=${JSON.stringify(readerBase).replace(/</g, '\\u003c')};` : '';
    html = html.replace(/<head([^>]*)>/i, (tag, attributes) => `<head${attributes}>${payloadStart}<script id="elio-board-payload">window.ELIO_BOARD_DOCUMENTS=${payload};window.ELIO_BOARD_ASSETS=${assetPayload};${readerPayload}</script>${payloadEnd}`);
    // Moving the runtime to the body preserves the original deferred script ordering.
    return html.replace(/<\/body>/i, () => `${scripts.join('\n')}</body>`);
  }

  return { normalizeDocument, presentation, safeImageURL, projectDocument, editDocument, exportDocument, loadDocuments, standaloneHTML, MAX_BYTES: board.MAX_BYTES };
});
