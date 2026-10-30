// Inlined in <head>: paint the intro background before the deferred controller.
// No script execution means no startup attribute and an ordinary readable page.
(() => {
  const page = document.documentElement;
  const navigation = performance.getEntriesByType('navigation')[0];
  if (location.hash || navigation?.type === 'back_forward' || history.state?.elioMemoryReader) return;
  page.setAttribute('data-memory-startup', 'intro');
  let timer;
  const release = () => {
    page.removeAttribute('data-memory-startup');
    clearTimeout(timer);
    window.removeEventListener('error', finished, true);
    delete window.ELIO_MEMORY_STARTUP;
  };
  const abandon = () => {
    release();
    // A controller arriving after the timeout must not reopen over this reader.
    const previous = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({ ...previous, elioMemoryReader: true }, '', location.href);
  };
  const finished = event => {
    if (event.target?.getAttribute?.('data-memory-controller') !== 'true') return;
    abandon();
  };
  window.ELIO_MEMORY_STARTUP = release;
  window.addEventListener('error', finished, true);
  timer = setTimeout(abandon, 45000);
})();
