/* Compatibility load point. Owned editorial rendering lives in engines.js. */
(function (global) { 'use strict'; if (!global.ELIO_OWNED_RUNTIME) throw new Error('Load catalog.js first'); })(typeof window !== 'undefined' ? window : globalThis);
