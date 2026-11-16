/* Story reader display mode: device / light / dark. Browser preference only; never in URLs or story data. */
(() => {
  'use strict';
  const KEY = 'elio-reader-theme';
  const MODES = ['system', 'light', 'dark'];
  const copy = {
    ko: ['화면 모드', '기기 설정', '라이트', '다크'],
    en: ['Display', 'Device setting', 'Light', 'Dark'],
    ja: ['表示モード', '端末の設定', 'ライト', 'ダーク'],
    'zh-Hans': ['显示模式', '跟随设备', '浅色', '深色'],
  };

  const normalizeTheme = value => (value === 'light' || value === 'dark' ? value : 'system');
  const resolveTheme = (mode, query) => (mode === 'system' ? (query && query.matches ? 'dark' : 'light') : mode);
  function themeWords(language) {
    const lang = String(language || 'ko');
    return copy[lang] || (lang.toLowerCase().startsWith('zh') ? copy['zh-Hans'] : copy[lang.split('-')[0]]) || copy.ko;
  }
  function applyTheme(doc, mode, query) {
    const root = doc.documentElement;
    root.setAttribute('data-reader-theme-mode', mode);
    root.setAttribute('data-reader-theme', resolveTheme(mode, query));
  }

  function bindTheme(doc, win) {
    const toolbar = doc.querySelector('.hero-tools');
    if (!toolbar || !doc.getElementById('spoiler-toggle') || doc.getElementById('reader-theme-select')) return null;
    let query = null, stored = null;
    try { query = typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-color-scheme: dark)') : null; } catch { query = null; }
    try { stored = win.localStorage.getItem(KEY); } catch { /* Blocked storage still allows a per-tab choice. */ }
    let mode = normalizeTheme(stored);
    applyTheme(doc, mode, query);

    const label = doc.createElement('label');
    label.className = 'reader-theme';
    label.setAttribute('translate', 'no');
    const text = doc.createElement('span');
    const select = doc.createElement('select');
    select.id = 'reader-theme-select';
    for (const value of MODES) {
      const option = doc.createElement('option');
      option.value = value;
      select.append(option);
    }
    label.append(text, select);
    toolbar.append(label);
    // The page translator skips select/option, so follow the settled reader language here.
    const relabel = () => {
      const words = themeWords(doc.documentElement.lang);
      if (text.textContent !== words[0]) text.textContent = words[0];
      MODES.forEach((_value, index) => {
        if (select.options[index].textContent !== words[index + 1]) select.options[index].textContent = words[index + 1];
      });
    };
    relabel();
    select.value = mode;

    select.addEventListener('change', () => {
      mode = normalizeTheme(select.value);
      applyTheme(doc, mode, query);
      try {
        if (mode === 'system') win.localStorage.removeItem(KEY);
        else win.localStorage.setItem(KEY, mode);
      } catch { /* The current tab keeps the choice when storage is unavailable. */ }
    });
    const follow = () => { if (mode === 'system') applyTheme(doc, mode, query); };
    if (query && typeof query.addEventListener === 'function') query.addEventListener('change', follow);
    else if (query && typeof query.addListener === 'function') query.addListener(follow);
    if (typeof win.MutationObserver === 'function') {
      new win.MutationObserver(relabel).observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    return select;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { bindTheme, normalizeTheme, resolveTheme, themeWords };
  if (typeof document !== 'undefined' && typeof window !== 'undefined') bindTheme(document, window);
})();
