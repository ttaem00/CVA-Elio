// Match the reader entry contract used by Memory Tape, before first paint.
// Without JavaScript the original reader remains visible and usable.
(() => {
  const page = document.documentElement;
  const navigation = performance.getEntriesByType('navigation')[0];
  if (location.hash || navigation?.type === 'back_forward' || history.state?.elioMoonReader) return;
  page.setAttribute('data-moon-startup', 'intro');
  let timer;
  const release = () => {
    page.removeAttribute('data-moon-startup');
    clearTimeout(timer);
    window.removeEventListener('error', failed, true);
    delete window.ELIO_MOON_STARTUP;
  };
  const abandon = () => {
    release();
    // A late controller cannot reopen over a reader already recovered here.
    const previous = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({...previous, elioMoonReader: true}, '', location.href);
  };
  const failed = event => {
    if (event.target?.getAttribute?.('data-moon-controller') === 'true') abandon();
  };
  window.ELIO_MOON_STARTUP = release;
  window.addEventListener('error', failed, true);
  timer = setTimeout(abandon, 45000);
})();
