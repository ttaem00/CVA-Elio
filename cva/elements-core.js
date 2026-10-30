/* Native, reusable elements. Descriptors also drive Studio, the library and the LLM map. */
(function (global) {
  'use strict';
  const mounted = new WeakMap();
  const entries = () => [...(global.CVA_ELEMENTS_CONTROLS || []), ...(global.CVA_ELEMENTS_EFFECTS || [])];
  const get = id => {
    const entry = entries().find(item => item.id === id);
    if (!entry) throw new Error('등록되지 않은 UI 요소입니다: ' + id);
    return entry;
  };
  const e = value => global.CVA_COMPONENTS.escape(value);
  function normalize(id, value = {}) {
    const entry = get(id);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('요소 속성은 객체여야 합니다.');
    const fields = [{key:'variant',kind:'select',options:entry.variants.map(v => ({value:v.id,label:v.label}))}, ...entry.controls.filter(c => c.key !== 'variant')];
    const allowed = new Set(fields.map(f => f.key));
    for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error('지원하지 않는 요소 속성입니다: ' + key);
    const result = {};
    for (const field of fields) {
      const v = value[field.key] === undefined ? entry.defaults[field.key] : value[field.key];
      if (field.kind === 'checkbox') {
        if (typeof v !== 'boolean') throw new Error(field.label + ': 켜짐/꺼짐을 선택하세요.');
      } else if (field.kind === 'number') {
        if (typeof v !== 'number' || !Number.isFinite(v) || (field.min !== undefined && v < field.min) || (field.max !== undefined && v > field.max)) throw new Error(field.label + ': 허용 범위의 숫자를 입력하세요.');
      } else {
        if (typeof v !== 'string' || v.length > 12000) throw new Error((field.label || field.key) + ': 12,000자 이내의 텍스트를 입력하세요.');
        if (field.kind === 'select' && !field.options.some(option => (typeof option === 'string' ? option : option.value) === v)) throw new Error('등록된 선택값을 사용하세요: ' + field.key);
        if (field.kind === 'image' && v && !(global.CVA_MODULES?.media || []).some(image => image.id === v)) throw new Error('등록된 이미지 ID를 사용하세요.');
      }
      result[field.key] = v;
    }
    entry.validate?.(result);
    return result;
  }
  function scope() {
    const abort = new AbortController(), cleanups = [];
    return {
      on(target, type, listener, options = {}) { target.addEventListener(type, listener, {...(typeof options === 'boolean' ? {capture:options} : options),signal:abort.signal}); },
      cleanup(callback) { cleanups.push(callback); },
      dispose() { abort.abort(); for (const cleanup of cleanups.splice(0).reverse()) cleanup(); }
    };
  }
  const helpers = {
    e, href:value => global.CVA_COMPONENTS.safeHref(value),
    id(context, suffix) { if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(context.id)||!/^[A-Za-z0-9_-]+$/.test(suffix))throw new Error('요소의 고유 ID를 확인하세요.');return 'ce-' + context.id + '-' + suffix; },
    media:(id, options) => global.CVA_COMPONENTS.media(id, options),
    image:id => (global.CVA_MODULES?.media || []).find(image => image.id === id),
    lines:(value, max = 12) => String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0,max),
    scope
  };
  function render(id, value, context = {id:'element-preview'}) {
    const entry = get(id), settings = normalize(id,value);
    const model = JSON.stringify({id,settings,instance:context.id}).replace(/</g,'\\u003c');
    return '<div class="cva-element" data-ce-id="' + e(id) + '" data-ce-variant="' + e(settings.variant) + '">' + entry.render(settings,context) + '<script type="application/json" data-ce-model>' + model + '</script></div>';
  }
  function mount(root) {
    const nodes = [...(root.matches?.('.cva-element[data-ce-id]') ? [root] : []), ...root.querySelectorAll('.cva-element[data-ce-id]')];
    const owned = [];
    for (const node of nodes) {
      mounted.get(node)?.();
      const modelNode = [...node.children].find(child => child.matches('script[data-ce-model]'));
      if (!modelNode) continue;
      const model = JSON.parse(modelNode.textContent), entry = get(model.id);
      // The model was validated before rendering. Mount only consumes that local, emitted model;
      // an independent HTML does not need the editor's complete media/module registry.
      let disposed = false;
      const cleanup = entry.mount?.(node,model.settings,{id:model.instance});
      const dispose = () => { if (disposed) return; disposed = true; if (typeof cleanup === 'function') cleanup(); if (mounted.get(node) === dispose) mounted.delete(node); };
      mounted.set(node,dispose); owned.push(dispose);
    }
    return () => owned.reverse().forEach(dispose => dispose());
  }
  global.CVA_ELEMENTS = {get entries(){return entries();},get,defaults:id=>({...get(id).defaults}),normalize,render,mount,helpers,
    code(id,value) { return 'CVA_ELEMENTS.render(' + JSON.stringify(id) + ', ' + JSON.stringify(normalize(id,value),null,2) + ', {id: "my-element"});\n// After insertion: const dispose = CVA_ELEMENTS.mount(container);\n// Before replacement/removal: dispose();'; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
