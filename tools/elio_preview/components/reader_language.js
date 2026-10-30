(function () {
  'use strict';

  const STORAGE_KEY = 'elio.language';
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const blockedPath = new Set(['__proto__', 'prototype', 'constructor']);

  function normalizeLanguage(value) {
    const tag = String(value || '').trim().replaceAll('_', '-').toLowerCase();
    if (/^ko(?:-|$)/.test(tag)) return 'ko';
    if (/^en(?:-|$)/.test(tag)) return 'en';
    if (/^ja(?:-|$)/.test(tag)) return 'ja';
    if (tag === 'zh' || /^zh-(?:hans|cn|sg)(?:-|$)/.test(tag)) return 'zh-Hans';
    return null;
  }

  function resolveLanguage({ available = ['ko'], query = null, stored = null, languages = [] } = {}) {
    const supported = value => {
      const normalized = normalizeLanguage(value);
      return available.includes(normalized) ? normalized : null;
    };
    const explicit = supported(query);
    if (explicit) return explicit;
    const manual = query === 'auto' ? null : supported(stored);
    if (manual) return manual;
    if (query !== 'auto') return 'ko';
    for (const language of languages) {
      const detected = supported(language);
      if (detected) return detected;
    }
    return 'ko';
  }

  function formatMessage(template, values = {}) {
    return String(template).replace(/\{([\w]+)\}/g, (token, name) => own(values, name) ? String(values[name]) : token);
  }

  function compileTemplate(source) {
    const names = [];
    let literal = '', pattern = '', cursor = 0;
    for (const token of source.matchAll(/\{([\w]+)\}/g)) {
      const part = source.slice(cursor, token.index);
      literal += part;
      const capture = token[1] === 'number' ? '(\\d+)' : token[1] === 'time' ? '(\\d{1,3}:\\d{2}(?::\\d{2})?)' : '(.+?)';
      pattern += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + capture;
      names.push(token[1]);
      cursor = token.index + token[0].length;
    }
    if (!names.length || !literal.trim() && !source.slice(cursor).trim()) return null;
    pattern += source.slice(cursor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { names, expression: new RegExp('^' + pattern + '$') };
  }

  function createMessageTranslator(data, language) {
    const catalog = data.catalogs?.[language] || {};
    const messages = data.messages || {};
    const uiKeys = new Set(Object.values(data.ui_bindings || {}));
    const exact = new Map(), patterns = [];
    for (const [key, message] of Object.entries(messages)) {
      if (!message || message.kind !== 'text' || typeof message.source !== 'string' || typeof catalog[key] !== 'string') continue;
      const source = message.source, target = catalog[key];
      if (exact.has(source) && exact.get(source) !== target) exact.set(source, null);
      else if (!exact.has(source)) exact.set(source, target);
      const template = uiKeys.has(key) ? compileTemplate(source) : null;
      if (template) patterns.push({ ...template, target });
    }
    return value => {
      if (language === 'ko') return value;
      const leading = value.match(/^\s*/)[0], trailing = value.match(/\s*$/)[0];
      const core = value.slice(leading.length, value.length - trailing.length || undefined);
      const target = exact.get(core);
      if (typeof target === 'string') return leading + target + trailing;
      if (exact.has(core)) return value;
      for (const template of patterns) {
        const match = template.expression.exec(core);
        if (!match) continue;
        const values = Object.create(null);
        let consistent = true;
        template.names.forEach((name, index) => {
          if (own(values, name) && values[name] !== match[index + 1]) consistent = false;
          values[name] = match[index + 1];
        });
        if (consistent) return leading + formatMessage(template.target, values) + trailing;
      }
      return value;
    };
  }

  function setJsonPath(value, path, replacement) {
    if (!Array.isArray(path) || !path.length || typeof replacement !== 'string') return false;
    let current = value;
    for (let index = 0; index < path.length; index++) {
      const key = path[index];
      if ((typeof key !== 'string' && !Number.isInteger(key)) || blockedPath.has(String(key)) || !current || typeof current !== 'object' || !own(current, key)) return false;
      if (index === path.length - 1) {
        if (typeof current[key] !== 'string') return false;
        current[key] = replacement;
        return true;
      }
      current = current[key];
    }
    return false;
  }

  function bootstrap(doc, win) {
    const payload = doc.getElementById('elio-language-data');
    if (!payload) return null;
    let data;
    try { data = JSON.parse(payload.textContent); } catch { return null; }
    if (!data || !Array.isArray(data.available) || !data.catalogs) return null;
    let stored = null;
    try { stored = win.localStorage.getItem(STORAGE_KEY); } catch { /* URL selection and the Korean default still work. */ }
    const query = doc.documentElement.dataset.elioSearchLanguage || new URL(win.location.href).searchParams.get('lang');
    const language = resolveLanguage({ available: data.available, query, stored, languages: win.navigator.languages || [win.navigator.language] });
    const catalog = data.catalogs[language] || {};
    const translated = key => own(catalog, key) && typeof catalog[key] === 'string' ? catalog[key] : null;
    const translatePlain = createMessageTranslator(data, language);
    const lastText = new WeakMap();
    const lastAttributes = new WeakMap();
    const skip = element => /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|NOSCRIPT)$/.test(element.tagName) || element.isContentEditable;

    function walkText(node, action) {
      if (node.nodeType === 3) { action(node); return; }
      if (node.nodeType === 1 && skip(node)) return;
      for (const child of node.childNodes || []) walkText(child, action);
      if (node.tagName === 'TEMPLATE' && node.content) walkText(node.content, action);
    }

    function annotated(root, selector) {
      const elements = root.matches?.(selector) ? [root] : [];
      return elements.concat(Array.from(root.querySelectorAll?.(selector) || []));
    }

    function applyRoot(root) {
      for (const element of annotated(root, '[data-i18n-key]')) {
        const key = element.getAttribute('data-i18n-key'), value = translated(key);
        if (value === null || element.getAttribute('data-i18n-applied') === language) continue;
        // HTML is compiled and validated by the publisher; this is its sole HTML insertion boundary.
        if (data.kinds?.[key] === 'html') {
          if (element.innerHTML !== value) element.innerHTML = value;
        } else if (element.textContent !== value) element.textContent = value;
        // Template clones already carry translated children and may have reader listeners attached.
        element.setAttribute('data-i18n-applied', language);
        walkText(element, node => lastText.set(node, node.nodeValue));
      }
      for (const element of annotated(root, '[data-i18n-attrs]')) {
        let attributes;
        try { attributes = JSON.parse(element.getAttribute('data-i18n-attrs')); } catch { continue; }
        for (const [name, key] of Object.entries(attributes || {})) {
          if (!/^(?:aria-[\w-]+|data-[\w-]+|title|alt|placeholder|content)$/.test(name) || name.startsWith('data-i18n-')) continue;
          const value = translated(key);
          if (value !== null && element.getAttribute(name) !== value) element.setAttribute(name, value);
        }
      }
      for (const template of annotated(root, 'template')) if (template.content) applyRoot(template.content);
    }

    function translateText(node) {
      if (lastText.get(node) === node.nodeValue || node.parentElement?.isContentEditable || node.parentElement?.closest('script,style,textarea,input,select,[contenteditable="true"]')) return;
      const value = translatePlain(node.nodeValue);
      lastText.set(node, value);
      if (value !== node.nodeValue) node.nodeValue = value;
    }

    function translateAttribute(element, name) {
      const original = element.getAttribute(name);
      if (original === null) return;
      const previous = lastAttributes.get(element) || new Map();
      if (previous.get(name) === original) return;
      const value = translatePlain(original);
      previous.set(name, value);
      lastAttributes.set(element, previous);
      if (value !== original) element.setAttribute(name, value);
    }

    function translateAttributes(root) {
      for (const element of annotated(root, '[aria-label],[title],[alt]')) {
        for (const name of ['aria-label', 'title', 'alt']) translateAttribute(element, name);
      }
      for (const template of annotated(root, 'template')) if (template.content) translateAttributes(template.content);
    }

    function findReaderScript(root, id) {
      const direct = root.getElementById?.(id);
      if (direct) return direct;
      for (const template of root.querySelectorAll?.('template') || []) {
        if (template.content) {
          const nested = findReaderScript(template.content, id);
          if (nested) return nested;
        }
      }
      return null;
    }

    applyRoot(doc);
    for (const binding of data.json_bindings || []) {
      const script = findReaderScript(doc, binding.script_id), value = translated(binding.key);
      if (!script || script === payload || script.tagName !== 'SCRIPT' || script.type !== 'application/json' || value === null) continue;
      try {
        const json = JSON.parse(script.textContent);
        if (setJsonPath(json, binding.path, value)) script.textContent = JSON.stringify(json).replaceAll('<', '\\u003c');
      } catch { /* Invalid unrelated reader data retains its original error behavior. */ }
    }
    walkText(doc.documentElement, translateText);
    translateAttributes(doc);
    doc.documentElement.lang = language;
    const note = doc.getElementById('elio-translation-note');
    if (note) note.hidden = language === 'ko';
    const picker = doc.getElementById('elio-language');
    if (picker) {
      const explicit = normalizeLanguage(query), manual = normalizeLanguage(stored);
      picker.value = query === 'auto' ? 'auto' : data.available.includes(explicit) ? explicit : data.available.includes(manual) ? manual : 'ko';
      picker.addEventListener('change', () => {
        const choice = normalizeLanguage(picker.value), url = new URL(win.location.href);
        try {
          if (choice) win.localStorage.setItem(STORAGE_KEY, choice);
          else win.localStorage.removeItem(STORAGE_KEY);
        } catch { /* URL selection still works when preference storage is unavailable. */ }
        if (choice) url.searchParams.set('lang', choice);
        else url.searchParams.set('lang', 'auto');
        win.location.assign(url.href);
      });
    }
    const api = {
      language,
      t(name, values) {
        const key = data.ui_bindings?.[name] || name;
        return formatMessage(translated(key) ?? data.messages?.[key]?.source ?? name, values);
      },
    };
    win.ElioI18n = api;
    if (language !== 'ko' && win.MutationObserver) {
      const observer = new win.MutationObserver(records => {
        for (const record of records) {
          if (record.type === 'characterData') translateText(record.target);
          if (record.type === 'attributes') translateAttribute(record.target, record.attributeName);
          for (const node of record.addedNodes || []) { applyRoot(node); walkText(node, translateText); translateAttributes(node); }
        }
      });
      observer.observe(doc.body || doc.documentElement, { subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['aria-label', 'title', 'alt'] });
    }
    return api;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeLanguage, resolveLanguage, formatMessage, createMessageTranslator, setJsonPath, bootstrap };
  if (typeof document !== 'undefined' && typeof window !== 'undefined') bootstrap(document, window);
}());
