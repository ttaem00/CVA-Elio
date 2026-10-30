/* The standalone HTML uses the same owned styles and local interaction owner. */
(function (global) {
  'use strict';
  if (!global.ELIO_OWNED_RUNTIME?.mountSource) throw new Error('Load the owned Elio engines before bundle.js');
  global.FW_BUNDLE = { css: global.ELIO_OWNED_RUNTIME.styles, js: global.ELIO_OWNED_RUNTIME.mountSource };
})(typeof window !== 'undefined' ? window : globalThis);
