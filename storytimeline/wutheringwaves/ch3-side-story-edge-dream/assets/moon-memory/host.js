// First entry follows Memory Tape; direct scene links keep their reader context.
(() => {
  const dialog = document.getElementById('elio-moon');
  const frame = document.getElementById('elio-moon-scene');
  const closeButton = document.getElementById('elio-moon-close');
  const reader = document.getElementById('elio-moon-reader');
  if (!dialog || !frame || !closeButton || !reader) return;

  const targets = new Set(['guide-edgerunners-the-survivors', 'strange-gate']);
  let epoch = 0;
  let mode = 'closed';
  let saved = null;
  let readyTimer = null;
  let tailTimer = null;
  let expectedOrigin = null;

  function rememberReader() {
    const previous = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({...previous, elioMoonReader: true}, '', location.href);
  }

  function clearTimers() {
    clearTimeout(readyTimer);
    clearTimeout(tailTimer);
    readyTimer = tailTimer = null;
  }

  function restoreReader(returnToLauncher) {
    if (!saved) return;
    const previous = saved;
    saved = null;
    reader.inert = previous.inert;
    document.body.style.overflow = previous.overflow;
    window.scrollTo(previous.x, previous.y);
    if (returnToLauncher && previous.focus?.isConnected) {
      previous.focus.focus({preventScroll: true});
    }
  }

  function removeScene() {
    // Removing the document releases its videos, WebGL context and RAF owner.
    frame.removeAttribute('src');
    frame.inert = false;
    dialog.hidden = true;
    dialog.inert = false;
    delete dialog.dataset.handoff;
    expectedOrigin = null;
  }

  function close() {
    const wasOpen = mode !== 'closed';
    ++epoch;
    mode = 'closed';
    clearTimers();
    if (dialog.open) dialog.close();
    restoreReader(true);
    removeScene();
    if (wasOpen) rememberReader();
  }

  function finishTail(token) {
    if (token !== epoch || mode !== 'tail') return;
    mode = 'closed';
    clearTimers();
    removeScene();
  }

  function handoff(target) {
    if (mode !== 'modal' || !targets.has(target)) return;
    const destination = document.getElementById(target);
    if (!destination) { close(); return; }
    const token = epoch;
    rememberReader();
    mode = 'tail';
    clearTimeout(readyTimer);
    dialog.dataset.handoff = 'true';
    dialog.close();
    dialog.inert = true;
    frame.inert = true;
    restoreReader(false);
    // Respect the reader's spoiler cover instead of exposing its hidden copy.
    const cover = destination.querySelector('.spoiler-cover:not([hidden])');
    const focus = cover || destination.querySelector('h2,h3,.scene-title a') || destination;
    if (!focus.hasAttribute('tabindex') && !focus.matches('button,a,input')) focus.tabIndex = -1;
    history.replaceState(history.state, '', '#' + target);
    destination.scrollIntoView({block: 'start', behavior: 'instant'});
    focus.focus({preventScroll: true});
    tailTimer = setTimeout(() => finishTail(token), 1000);
  }

  function open(launcher = reader.querySelector('[data-moon-open]')) {
    if (mode === 'modal') return;
    close();
    // The pinned renderer requires WebGL2; keep the reader usable without it.
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      if (!context) return;
      context.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { return; }
    const raw = frame.dataset.src || dialog.dataset.sceneUrl;
    let url;
    try {
      url = new URL(raw, location.href);
      if (!raw || url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return;
    } catch { return; }
    const token = ++epoch;
    url.searchParams.set('moonSession', String(token));
    expectedOrigin = url.origin;
    saved = {focus: launcher, x: scrollX, y: scrollY,
      overflow: document.body.style.overflow, inert: reader.inert};
    mode = 'modal';
    document.body.style.overflow = 'hidden';
    reader.inert = true;
    dialog.hidden = false;
    dialog.inert = false;
    dialog.dataset.state = 'loading';
    delete dialog.dataset.handoff;
    try { dialog.showModal(); }
    catch { close(); return; }
    frame.src = url.href;
    // Space must start the film, not activate the reader/skip action.
    dialog.tabIndex = -1;
    dialog.focus({preventScroll: true});
    readyTimer = setTimeout(() => {
      if (token === epoch && mode === 'modal') close();
    }, 45000);
  }

  document.addEventListener('click', event => {
    const launcher = event.target instanceof Element ? event.target.closest('[data-moon-open]') : null;
    if (!launcher || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    open(launcher);
  });
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    // A queued close event from the last session must not close a fresh modal.
    if (!dialog.open && mode === 'modal') close();
  });
  frame.addEventListener('error', () => { if (mode === 'modal') close(); });
  function control(action) {
    frame.contentWindow.postMessage({type:'elio-moon-control',session:String(epoch),action},expectedOrigin);
  }
  window.addEventListener('keydown', event => {
    if(mode!=='modal'||event.key!==' '||event.target?.closest?.('button,a,input,textarea,select,[contenteditable=true]'))return;
    event.preventDefault();
    if(!event.repeat&&dialog.dataset.state==='ready')control('toggle-play');
  });
  window.addEventListener('message', event => {
    const data = event.data;
    if (mode === 'closed' || event.source !== frame.contentWindow || event.origin !== expectedOrigin
      || !data || data.type !== 'elio-moon' || data.session !== String(epoch)) return;
    if (data.action === 'ready' && mode === 'modal') {
      clearTimeout(readyTimer);
      dialog.dataset.state = 'ready';
      control('focus-play');
    } else if (data.action === 'reader') handoff(data.target);
    else if (data.action === 'done') finishTail(epoch);
    else if (data.action === 'close') close();
  });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => {
    if (event.persisted && mode !== 'closed') close();
  });

  const navigation = performance.getEntriesByType('navigation')[0];
  const restored = navigation?.type === 'back_forward' || Boolean(history.state?.elioMoonReader);
  if (!location.hash && !restored) open();
  // Remove the first-paint cover only after the dialog or readable fallback owns it.
  window.ELIO_MOON_STARTUP?.();
})();
