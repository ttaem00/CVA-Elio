/* Lucide SVG paths, unchanged from lucide-icons/lucide
 * revision 7faf87628a1ad6175975bc595344337ce14a7db4, icons/{name}.svg.
 * ISC: Copyright (c) 2026 Lucide Icons and Contributors.
 * Feather-derived icons also retain MIT, Copyright (c) 2013-present Cole Bemis.
 * Full upstream notices: LUCIDE_NOTICE.txt, distributed beside this file.
 * Local changes: fixed safe-name lookup, decorative SVG wrapper, size/class adapter. */
(function (global) {
  'use strict';

  const paths = Object.freeze({
    search: '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />',
    'arrow-right': '<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />',
    code: '<path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" />',
    'sliders-horizontal': '<path d="M10 5H3" /><path d="M12 19H3" /><path d="M14 3v4" /><path d="M16 17v4" /><path d="M21 12h-9" /><path d="M21 19h-5" /><path d="M21 5h-7" /><path d="M8 10v4" /><path d="M8 12H3" />',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />',
    'external-link': '<path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />',
    check: '<path d="M20 6 9 17l-5-5" />',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />',
    x: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
    'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" />'
  });
  const escapeAttribute = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  // Icons are decorative. The owning link/button keeps its visible accessible name.
  function render(name, { size = 18, className = '' } = {}) {
    if (!Object.hasOwn(paths, name)) return '';
    const dimension = typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : 18;
    const classes = ' class="ui-icon' + (typeof className === 'string' && className ? ' ' + escapeAttribute(className) : '') + '"';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + dimension + '" height="' + dimension +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' + classes + '>' + paths[name] + '</svg>';
  }

  global.CVA_LIBRARY_ICONS = { render, names: Object.freeze(Object.keys(paths)), sourceRef: '7faf87628a1ad6175975bc595344337ce14a7db4' };
})(window);
