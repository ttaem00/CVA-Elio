import {replayUrl} from './replay-url.js?v=74592d85e134';
import {createCassetteTransition} from './cassette-transition.js?v=e152150431b7';
import {entryPresentation,sampleEntryPresentation,sampleIntroTypography,sampleTextSignal} from './entry-presentation.js?v=ce88a15e7107';
import {createMemoryLocale} from './locale-ui.js?v=a8b6ae35d399';
import {createLinkEffectsPreference} from './link-effects.js?v=10038ab989e2';
// One prewarmed scene remains alive across reading, replay and help interactions.
const config = window.ELIO_MEMORY_CONFIG;
const root = document.getElementById('elio-memory');
const reader = document.getElementById('elio-memory-reader');
const frame = document.getElementById('elio-memory-scene');
const inverseEntry = new URLSearchParams(location.search).get('transition') === 'inverse';
root.dataset.transition = inverseEntry ? 'inverse' : 'standard';
// The approved Memory motif includes position-driven text fragments. Keep the
// inverse comparison and an explicit glitch=off inspection path independent.
const softSignal = !inverseEntry && [null, 'soft'].includes(new URLSearchParams(location.search).get('glitch'));
if (softSignal) root.dataset.glitch = 'soft';
const cassetteTransition = createCassetteTransition(root, document, { inverse: inverseEntry, watchGlow:!inverseEntry });
const get = (id) => document.getElementById(`elio-memory-${id}`);
function setMemoryTools(expanded) {
  if (!get('tools') || !get('actions')) return;
  get('tools').setAttribute('aria-expanded', String(expanded));
  get('actions').dataset.expanded = String(expanded);
}
const memoryUi = createMemoryLocale({window, document, reader});
memoryUi.localize(root);
if (softSignal && get('title')) {
  for (const node of [get('title'),...(get('near')?.querySelectorAll('span') || [])]) {
    const lines = [...node.querySelectorAll('span')].map(span => span.textContent);
    node.dataset.signalText = lines.length ? lines.join('\n') : node.textContent;
  }
}
const linkPresentation = config.experience?.link || 'memory_tape';
if (linkPresentation === 'memory_tape') {
  let pageIdentity = config.pageIdentity;
  if (!pageIdentity) {
    try { pageIdentity = new URL(config.canonicalUrl, location.href).pathname.match(/^\/storytimeline\/([^/]+\/[^/]+)\/?$/)?.[1]; }
    catch { /* An invalid canonical identity cannot share another page's choice. */ }
  }
  createLinkEffectsPreference({identity:pageIdentity,button:get('link-effects'),
    labels:{on:memoryUi.t('link_on'),off:memoryUi.t('link_off')},window,document});
} else {
  if (get('link-effects')) get('link-effects').hidden = true;
  document.documentElement.dataset.elioLinkEffects = linkPresentation === 'none' ? 'off' : 'on';
}
const sceneOrigin = new URL(config.sceneUrl, location.href).origin;
let ready = false;
let opened = false;
let mode = 'intro';
let returnFocus = null;
let readerWasInert = false;
let originalOverflow = '';
let scrollBefore = { x: 0, y: 0 };
let pendingLink = null;
let travelTimer = null;
let closeTimer = null;
let sceneTimer = null;
let beginWatch = null;
let presentation = null;
let presentationFrame = null;
let readerReleased = true;
let posterTimer = null;
const usesPresentation=()=>['live','image'].includes(root.dataset.source);

function isPreparing() {
  return !ready && root.dataset.state !== 'error';
}

function syncPreparation() {
  // The reader is already present; scene preparation owns only scene input.
  get('read').disabled = false;
  get('read').setAttribute('aria-busy', 'false');
  const waitingForPoster = mode === 'intro' && get('poster') && !get('poster').hidden;
  frame.inert = !ready || mode === 'watch' || Boolean(presentation) || Boolean(waitingForPoster);
  frame.tabIndex = frame.inert ? -1 : 0;
}

// Loading stills reuse the approved first frame, at the scene's same letterbox.
async function revealInitialScene() {
  const poster = get('poster');
  if (poster && !poster.hidden) {
    try { await poster.decode(); } catch { /* A failed still never blocks the scene. */ }
  }
  if (!ready || !opened || mode !== 'intro' || poster?.hidden || root.dataset.poster === 'fading') return;
  root.dataset.poster = 'fading';
  send('active', {enabled:true});
  posterTimer = setTimeout(() => {
    if (poster) poster.hidden = true;
    if (opened && mode === 'intro') syncPreparation();
  }, 460);
}

function releaseReader() {
  if (readerReleased) return false;
  readerReleased = true;
  document.body.style.overflow = originalOverflow;
  reader.inert = readerWasInert;
  window.scrollTo(scrollBefore.x, scrollBefore.y);
  markReaderVisited();
  get('return').hidden = false;
  return true;
}

function releaseReadTail(state) {
  if (readerReleased) return;
  // Native modal inertness must actually end. Keep only a noninteractive visual
  // tail above the reader; its original feather/opacity clock keeps running.
  root.close();
  root.dataset.readerTail = 'true';
  root.inert = true;
  // The remaining mask is already a faint veil. Freeze its expensive blur and
  // fade that snapshot while the reader scrolls; never keep redrawing a scene.
  presentation.tailOpacity = Math.max(.0001, 1-state.surroundings**2*(3-2*state.surroundings));
  releaseReader();
  send('active', {enabled:false});
  const title = reader.querySelector('h1');
  if (title) { title.setAttribute('tabindex','-1'); title.focus({preventScroll:true}); }
}

function clearSoftSignal() {
  for (const key of ['title','question','quote','slice','pixel-x','pixel-y']) root.style.removeProperty(`--memory-signal-${key}`);
}

function paintTextSignal(progress) {
  if (!softSignal) return;
  const signal = sampleTextSignal(progress);
  for (const key of ['title','question','quote']) root.style.setProperty(`--memory-signal-${key}`,String(signal[key]));
  root.style.setProperty('--memory-signal-slice',`${signal.slice}px`);
  root.style.setProperty('--memory-signal-pixel-x',`${signal.pixelX}px`);
  root.style.setProperty('--memory-signal-pixel-y',`${signal.pixelY}px`);
}

function stopPresentation() {
  if (root.dataset.glitch === 'soft') clearSoftSignal();
  if (presentationFrame !== null) cancelAnimationFrame(presentationFrame);
  presentationFrame = null;
  presentation = null;
  delete root.dataset.presentation;
}

function paintPresentation(now) {
  if (!presentation || !opened) return;
  let seconds = (now - presentation.started) / 1000;
  // A delayed frame must not finish the visual before the video is requested.
  if (presentation.plan.mode === 'watch' && pendingLink) seconds = Math.min(seconds, presentation.plan.linkAt);
  const state = sampleEntryPresentation(presentation.plan, seconds, presentation.initial);
  if (presentation.tailOpacity !== undefined) {
    const veil = 1-state.surroundings**2*(3-2*state.surroundings);
    root.style.setProperty('--memory-overlay-opacity', String(state.overlayOpacity*veil/presentation.tailOpacity));
    if (state.done) close({immediate:true});
    return;
  }
  const outline = presentation.scene?.cassetteOutline;
  const masked = cassetteTransition.update(state.entry, outline, state);
  root.classList.toggle('is-entering', masked && state.entry > 0);
  root.style.setProperty('--memory-entry-progress', String(state.entry));
  root.style.setProperty('--memory-core-progress', String(state.core));
  root.style.setProperty('--memory-spread-progress', String(state.spread));
  root.style.setProperty('--memory-surround-progress', String(state.surroundings));
  root.style.setProperty('--memory-glow-opacity', String(state.glow));
  root.style.setProperty('--memory-overlay-opacity', String(state.overlayOpacity));
  root.style.setProperty('--memory-scene-opacity', '1');
  root.style.setProperty('--memory-title-opacity', String(state.titleOpacity));
  root.style.setProperty('--memory-near-opacity', String(state.questionOpacity));
  root.style.setProperty('--memory-quote-opacity', String(state.quoteOpacity));
  root.style.setProperty('--memory-watch-opacity', String(state.metadataOpacity));
  if (state.handoff && pendingLink) goToVideo();
  if (presentation?.plan.mode === 'read' && seconds >= presentation.plan.readerAt) releaseReadTail(state);
  if (state.done && presentation) close({immediate:true});
}

function beginPresentation(kind) {
  stopPresentation();
  const plan = entryPresentation(kind);
  const initial = {titleOpacity:Number(root.style.getPropertyValue('--memory-title-opacity') || 1),
    questionOpacity:Number(root.style.getPropertyValue('--memory-near-opacity') || 0)};
  presentation = {plan, started:performance.now(), scene:null, initial};
  root.dataset.presentation = kind;
  root.dataset.playing = 'true';
  frame.inert = true;
  paintPresentation(presentation.started);
  send('play', {duration:plan.cameraDuration,endProgress:plan.endProgress,curveHandle:1,lockInput:true});
  const tick = now => {
    presentationFrame = null;
    paintPresentation(now);
    if (presentation) presentationFrame = requestAnimationFrame(tick);
  };
  presentationFrame = requestAnimationFrame(tick);
  return plan;
}

function send(command, values = {}) {
  frame.contentWindow?.postMessage({ channel: 'memory-tape', version: 1, command, ...values }, sceneOrigin);
}

function setInputGuidance(pointerType) {
  if (pointerType === 'mouse' || pointerType === 'touch') root.dataset.input = pointerType;
  const images = ['film', 'image'].includes(root.dataset.source);
  frame.title = memoryUi.t(images ? 'frame_images' : root.dataset.input === 'touch' ? 'frame_touch' : 'frame_desktop');
}

function setHelp(visible) {
  if (root.dataset.input === 'touch' && mode === 'intro') visible = true;
  get('help').hidden = !visible;
  get('info').hidden = visible;
  get('info').setAttribute('aria-expanded', String(visible));
}

function markReaderVisited() {
  const previous = history.state && typeof history.state === 'object' ? history.state : {};
  history.replaceState({ ...previous, elioMemoryReader: true }, '', location.href);
}

function clearPending() {
  beginWatch = null;
  pendingLink?.removeAttribute('aria-busy');
  pendingLink = null;
  clearTimeout(travelTimer);
}

function show(nextMode, origin = document.activeElement) {
  setMemoryTools(false);
  stopPresentation();
  clearTimeout(closeTimer);
  returnFocus = origin;
  if (!opened || readerReleased) {
    scrollBefore = { x: scrollX, y: scrollY };
    originalOverflow = document.body.style.overflow;
    readerWasInert = reader.inert;
    document.body.style.overflow = 'hidden';
    reader.inert = true;
    readerReleased = false;
  }
  delete root.dataset.readerTail;
  root.inert = false;
  mode = nextMode;
  if (mode === 'watch') {
    clearTimeout(posterTimer);
    if (get('poster')) get('poster').hidden = true;
  }
  syncPreparation();
  opened = true;
  root.dataset.mode = mode;
  root.setAttribute('aria-labelledby', mode === 'watch' ? 'elio-memory-streamer' : 'elio-memory-title');
  root.dataset.playing = 'false';
  cassetteTransition.clear();
  root.style.setProperty('--memory-overlay-opacity', '1');
  root.style.setProperty('--memory-scene-opacity', '1');
  root.style.setProperty('--memory-backdrop-opacity', '1');
  root.style.setProperty('--memory-entry-progress', '0');
  root.classList.remove('is-entering');
  root.classList.remove('is-leaving');
  root.removeAttribute('aria-hidden');
  root.hidden = false;
  if (!root.open) root.showModal();
  get('return').hidden = true;
  get('video').hidden = true;
  get('continue').hidden = true;
  if (mode === 'intro' && usesPresentation() && !inverseEntry) {
    root.style.setProperty('--memory-title-opacity', '1');
    root.style.setProperty('--memory-near-opacity', '0');
  }
  if (mode === 'intro') setHelp(true);
  const introPoster = mode === 'intro' && get('poster') && !get('poster').hidden;
  if (introPoster) frame.inert = true;
  send('active', { enabled: ready && !introPoster });
  send('ambient', { enabled: true });
  if (mode === 'intro') get('read').focus({ preventScroll: true });
  else root.focus({ preventScroll: true });
  if (ready && mode === 'intro' && get('poster') && !get('poster').hidden) revealInitialScene();
}

function close({ restoreFocus = true, immediate = false } = {}) {
  if (!opened) return;
  opened = false;
  clearTimeout(closeTimer);
  closeTimer = null;
  if (root.dataset.state === 'handoff') root.dataset.state = ready ? 'ready' : 'loading';
  stopPresentation();
  clearPending();
  clearTimeout(posterTimer);
  if (get('poster')) get('poster').hidden = true;
  send('active', { enabled: false });
  root.classList.add('is-leaving');
  root.setAttribute('aria-hidden', 'true');
  const releasedHere = releaseReader();
  const finishClose = () => {
    if (opened) return;
    root.close();
    root.hidden = true;
    delete root.dataset.readerTail;
    root.inert = false;
    cassetteTransition.clear();
    if (restoreFocus && releasedHere) {
      const destination = returnFocus instanceof HTMLElement && returnFocus.isConnected
        && returnFocus !== document.body && !root.contains(returnFocus)
        ? returnFocus : reader.querySelector('h1');
      if (destination instanceof HTMLElement) {
        if (!destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
      }
    }
  };
  if (immediate) finishClose();
  else closeTimer = setTimeout(finishClose, 220);
}

function beginVideoHandoff() {
  // A returned WindowProxy does not mean the browser has shown the new tab.
  // Keep moving while the tab opens; the presentation then returns to the reader.
  if (presentation?.plan.mode === 'watch') {
    // Keep the remaining visual tail after the actual request, even after a stall.
    presentation.started = Math.max(presentation.started, performance.now() - presentation.plan.linkAt * 1000);
  }
  root.dataset.state = 'handoff';
  clearPending();
  clearTimeout(closeTimer);
  closeTimer = null;
  root.style.setProperty('--memory-overlay-opacity', '1');
  get('status').textContent = memoryUi.t('handoff');
  get('continue').hidden = true;
  if (!presentation) closeTimer = setTimeout(() => close({immediate:true}), 1500);
}

function goToVideo() {
  if (!pendingLink) return;
  const destination = replayUrl(pendingLink.href);
  const hold = usesPresentation() && !inverseEntry;
  if (hold) beginVideoHandoff();
  else { stopPresentation(); beginWatch = null; }
  clearTimeout(travelTimer);
  const videoTab = window.open(destination, '_blank');
  if (videoTab) {
    videoTab.opener = null;
    if (!hold || document.hidden) close({ immediate: true, restoreFocus: !document.hidden });
  } else {
    // A real anchor preserves new-tab access if the browser blocks delayed popups.
    stopPresentation();
    clearTimeout(closeTimer);
    root.dataset.state = 'blocked';
    root.dataset.playing = 'false';
    send('active', { enabled: false });
    cassetteTransition.clear();
    root.style.setProperty('--memory-overlay-opacity', '1');
    root.style.setProperty('--memory-scene-opacity', '0');
    get('status').textContent = memoryUi.t('blocked');
    get('video').href = destination;
    get('video').hidden = false;
    get('continue').hidden = false;
    get('video').focus({ preventScroll: true });
  }
}

function playForReader() {
  if (isPreparing()) { close({immediate:true}); return; }
  if (!ready || root.dataset.state === 'error') { close(); return; }
  clearTimeout(posterTimer);
  if (get('poster')) get('poster').hidden = true;
  send('active', {enabled:true});
  setHelp(false);
  if (usesPresentation() && !inverseEntry) { beginPresentation('read'); return; }
  root.dataset.playing = 'true';
  frame.inert = true;
  send('play', { duration: 3.6, lockInput: true });
}

function playForVideo() {
  if (!pendingLink || !ready) return;
  const link = pendingLink;
  const livePresentation = usesPresentation() && !inverseEntry;
  const moment = link.closest('.watch-moment:not(.streamer-review)');
  const rawQuote = moment && config.momentQuotes?.[moment.id];
  const quote = memoryUi.quoteFor(moment, rawQuote);
  const titleNode = moment?.querySelector('.watch-moment__content > h3')
    || (livePresentation ? link.closest('article')?.querySelector('h2') : null);
  const title = titleNode?.textContent.trim();
  const words = quote?.text || title?.replace(/^「|」$/g, '') || (livePresentation ? `${link.dataset.streamer} · ${link.dataset.time}` : '');
  // Translated character counts must not change the approved playback clock.
  const timingWords = rawQuote?.text || memoryUi.originalText(titleNode).replace(/^「|」$/g, '') || words;
  const duration = words ? Math.min(4.8, Math.max(3.6, 1.4 + timingWords.length * 0.045)) : 2.0;
  get('moment').hidden = !words;
  get('moment-kind').textContent = quote ? quote.kind : memoryUi.t('selected');
  get('quote').textContent = words;
  if (root.dataset.glitch === 'soft') {
    const bands = document.createElement('span');
    bands.className = 'elio-memory__signal-copy';
    bands.setAttribute('aria-hidden', 'true');
    bands.dataset.signalText = quote ? `“${words}”` : words;
    get('quote').append(bands);
  }
  root.dataset.quoted = String(Boolean(quote));
  root.dataset.longQuote = String(words.length > 65);
  root.style.setProperty('--memory-quote-opacity', '0');
  root.style.setProperty('--memory-watch-opacity', '1');
  link.removeAttribute('aria-busy');
  // Wait for the source's wide pose before exposing a previously zoomed iframe.
  beginWatch = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (pendingLink !== link) return;
    get('streamer').textContent = memoryUi.t('streamer', {streamer:link.dataset.streamer});
    get('time').textContent = link.dataset.time;
    root.dataset.state = 'ready';
    show('watch', link);
    if (usesPresentation() && !inverseEntry) {
      const plan = beginPresentation('watch');
      travelTimer = setTimeout(goToVideo, plan.linkAt * 1000);
      return;
    }
    root.dataset.playing = 'true';
    send('play', { duration, lockInput: true });
    travelTimer = setTimeout(goToVideo, duration * 1000 + 1400);
  }));
  // The existing renderer and compiled scene are reused; nothing is reloaded.
  send('active', { enabled: true });
  send('seek', { progress: 0 });
}

function sceneFailed() {
  if (readerReleased && root.dataset.readerTail && !pendingLink) {
    ready = false;
    root.dataset.state = 'error';
    close({immediate:true,restoreFocus:false});
    return;
  }
  stopPresentation();
  beginWatch = null;
  clearTimeout(sceneTimer);
  ready = false;
  root.dataset.state = 'error';
  root.dataset.playing = 'false';
  syncPreparation();
  cassetteTransition.clear();
  root.style.setProperty('--memory-overlay-opacity', '1');
  root.style.setProperty('--memory-scene-opacity', '1');
  root.style.setProperty('--memory-backdrop-opacity', '1');
  root.style.setProperty('--memory-entry-progress', '0');
  root.classList.remove('is-entering');
  get('status').textContent = memoryUi.t('error');
  if (opened && mode === 'intro') setHelp(true);
  if (pendingLink) {
    const link = pendingLink;
    get('streamer').textContent = memoryUi.t('streamer', {streamer:link.dataset.streamer});
    get('time').textContent = link.dataset.time;
    show('watch', link);
    goToVideo();
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== frame.contentWindow || event.origin !== sceneOrigin) return;
  const data = event.data;
  if (!data || data.channel !== 'memory-tape' || data.version !== 1) return;
  if (data.event === 'input') { setInputGuidance(data.pointerType); return; }
  if (root.dataset.state === 'handoff' && (!presentation || data.event !== 'progress')) return;
  if (data.event === 'ready') {
    const images = data.sourceMode === 'prerender-image';
    const software = images || data.sourceMode === 'prerender-video';
    root.dataset.source = images ? 'image' : software ? 'film' : 'live';
    setInputGuidance();
    ready = true;
    clearTimeout(sceneTimer);
    root.dataset.state = 'ready';
    syncPreparation();
    if (opened && mode === 'intro' && get('poster') && !get('poster').hidden) revealInitialScene();
    else send('active', { enabled: opened || Boolean(pendingLink) });
    send('ambient', { enabled: true });
    if (pendingLink && !opened) playForVideo();
  } else if (data.event === 'interaction' && ready && opened && mode === 'intro') {
    setHelp(false);
  } else if (data.event === 'progress' && ready && Number.isFinite(data.progress) && root.dataset.state !== 'error') {
    if (beginWatch && data.progress < 1e-6 && data.radius > 1.3 && data.playing === false
        && (root.dataset.source !== 'image' || data.frameKind === 'approach')) {
      const begin = beginWatch;
      beginWatch = null;
      begin();
    }
    paintTextSignal(Math.max(0, Math.min(1, data.progress)));
    if (presentation) {
      presentation.scene = data;
      root.style.setProperty('--memory-progress', String(data.progress));
      return;
    }
    const p = Math.max(0, Math.min(1, data.progress));
    // Reveal the reader through the whole dialog. Fading only the iframe leaves
    // its opaque dialog/backdrop behind and turns the final dissolve into a cut.
    const distance = Number.isFinite(data.radius) && data.radius > 0 ? data.radius : 1.40779;
    const logBetween = (far, close) => Math.max(0, Math.min(1, Math.log(far / distance) / Math.log(far / close)));
    const fade = logBetween(1.2, 0.6);
    const near = logBetween(0.6, 0.4);
    const live = usesPresentation();
    const inverse = live && root.dataset.transition === 'inverse';
    const entry = logBetween(inverse ? 0.40 : 0.30, 0.17);
    const dissolve = 1 - entry * entry * (3 - 2 * entry);
    const masked = live && cassetteTransition.update(entry, data.cassetteOutline);
    const words = logBetween(inverse ? 0.46 : 0.37, inverse ? 0.40 : 0.30);
    const tail = Math.max(0, Math.min(1, (entry - 0.82) / 0.18));
    const overlayOpacity = root.dataset.state === 'blocked' || inverse && masked ? 1 : masked ? 1 - tail * tail * (3 - 2 * tail) : dissolve;
    root.classList.toggle('is-entering', masked && entry > 0 && root.dataset.state !== 'blocked');
    root.style.setProperty('--memory-entry-progress', String(entry));
    root.style.setProperty('--memory-progress', String(p));
    const typography = live && mode === 'intro' && !inverse ? sampleIntroTypography(p) : null;
    root.style.setProperty('--memory-title-opacity', String(typography ? typography.titleOpacity : 1 - fade));
    const questionOpacity = typography ? typography.questionOpacity : near * (1 - words * words * (3 - 2 * words));
    root.style.setProperty('--memory-near-opacity', String(questionOpacity));
    root.style.setProperty('--memory-overlay-opacity', String(overlayOpacity));
    const tapeFade = Math.max(0, Math.min(1, (entry - 0.72) / 0.28));
    const tapeOpacity = 1 - tapeFade * tapeFade * (3 - 2 * tapeFade);
    const backgroundClear = Math.max(0, Math.min(1, (entry - 0.48) / 0.14));
    root.style.setProperty('--memory-backdrop-opacity', String(inverse && masked ? 1 - backgroundClear * backgroundClear * (3 - 2 * backgroundClear) : 1));
    const sceneOpacity = mode === 'watch' && root.dataset.state === 'blocked' ? 0 : inverse && masked ? tapeOpacity : 1;
    root.style.setProperty('--memory-scene-opacity', String(sceneOpacity));
    // Reading time belongs to the playback clock, independent of camera easing.
    const timeline = mode === 'watch' && Number.isFinite(data.timelineProgress)
      ? Math.max(0, Math.min(1, data.timelineProgress)) : p;
    const quoteIn = Math.max(0, Math.min(1, (timeline - 0.10) / 0.14));
    const quoteOut = Math.max(0, Math.min(1, (timeline - 0.76) / 0.13));
    root.style.setProperty('--memory-quote-opacity', String(quoteIn * (1 - quoteOut)));
    root.style.setProperty('--memory-watch-opacity', String(1 - Math.max(0, Math.min(1, (timeline - 0.72) / 0.17))));
    if (typeof data.playing === 'boolean') root.dataset.playing = String(data.playing);
    // The visible reveal owns completion; do not keep accelerating an already
    // invisible scene, or hold an opaque host before opening the external tab.
    if (opened && root.dataset.state === 'ready' && data.playing === true && entry >= 1 && !inverse) {
      if (mode === 'watch') goToVideo(); else close({ immediate: true });
    }
  } else if (data.event === 'start' && ready) {
    root.dataset.playing = 'true';
  } else if (data.event === 'complete' && ready && opened && !presentation && root.dataset.state !== 'blocked') {
    if (mode === 'watch') goToVideo(); else close({ immediate: true });
  } else if (data.event === 'cancel' && opened) {
    close();
  } else if (data.event === 'error') {
    sceneFailed();
  }
});

frame.addEventListener('load', () => {
  send('status');
  const waitingForPoster = mode === 'intro' && get('poster') && !get('poster').hidden;
  send('active', { enabled: ready && opened && !waitingForPoster });
});
get('read').addEventListener('click', playForReader);
get('info').addEventListener('click', () => {
  setHelp(true);
  get('read').focus({ preventScroll: true });
});
get('video').addEventListener('click', () => {
  if (usesPresentation() && !inverseEntry) beginVideoHandoff();
  else close();
});
get('continue').addEventListener('click', () => close({immediate:true}));
root.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
// Link travel owns the camera until the destination opens; gestures belong only to the intro.
root.addEventListener('pointerover', event => setInputGuidance(event.pointerType), { passive: true });
for (const type of ['pointerdown', 'touchstart']) {
  root.addEventListener(type, event => {
    if (type === 'pointerdown') setInputGuidance(event.pointerType);
    const control = event.target instanceof Element && event.target.closest('button,a');
    if (opened && isPreparing() && !control) event.preventDefault();
  }, { passive: false });
}
for (const type of ['wheel', 'touchmove']) {
  root.addEventListener(type, (event) => {
    if (type === 'wheel') setInputGuidance('mouse');
    if (opened && (isPreparing() || mode === 'watch' || root.dataset.playing === 'true')) event.preventDefault();
    else if (type === 'wheel' && opened && mode === 'intro' && ready) {
      // Events over the help/button belong to this document, not the iframe.
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientHeight : 1);
      send('scroll', { pixels });
    }
  }, { passive: false });
}
get('reopen').addEventListener('click', () => {
  clearPending();
  send('reset');
  root.dataset.state = ready ? 'ready' : root.dataset.state;
  show('intro', matchMedia('(max-width: 600px)').matches ? get('tools') : get('reopen'));
});
get('tools')?.addEventListener('click', () => setMemoryTools(get('tools').getAttribute('aria-expanded') !== 'true'));
document.addEventListener('pointerdown', event => {
  if (!get('return').contains(event.target)) setMemoryTools(false);
});

document.addEventListener('click', (event) => {
  if (linkPresentation !== 'memory_tape' || document.documentElement.dataset.elioLinkEffects === 'off') return;
  if ((event.button != null && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a[data-streamer][data-time][href]') : null;
  if (!link || root.contains(link) || !['http:', 'https:'].includes(new URL(link.href).protocol)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  // Capture owns this click, so perform the common reader's normal picker close.
  link.closest('.streamer-picker')?.removeAttribute('open');
  clearPending();
  pendingLink = link;
  link.setAttribute('aria-busy', 'true');
  if (ready) playForVideo();
  else if (root.dataset.state === 'error') sceneFailed();
}, true);

document.addEventListener('keydown', (event) => {
  if (opened && event.key === 'Escape') { event.preventDefault(); close(); }
  else if (event.key === 'Escape' && get('tools')?.getAttribute('aria-expanded') === 'true') {
    setMemoryTools(false);
    get('tools').focus({preventScroll:true});
  }
  else if (opened && isPreparing() && !(event.target instanceof Element && event.target.closest('button,a'))
      && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '].includes(event.key)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
window.addEventListener('pagehide', () => { stopPresentation(); clearTimeout(travelTimer); send('active', { enabled: false }); });
document.addEventListener('visibilitychange', () => {
  if (root.dataset.glitch === 'soft' && document.hidden) clearSoftSignal();
  if (document.hidden && (presentation || root.dataset.state === 'handoff')) close({immediate:true,restoreFocus:false});
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && opened) close({ restoreFocus: false });
  if (!opened) send('active', { enabled: false });
});

// Preload even direct hash/reader entries. CSS preserves full layout while hidden.
const sceneUrl = new URL(config.sceneUrl, location.href);
// Explicit private renderer reviews keep normal automatic device selection intact.
const renderReview = new URLSearchParams(location.search).get('render');
if (['gaussian', 'film', 'images'].includes(renderReview)) sceneUrl.searchParams.set('render', renderReview);
if (inverseEntry) sceneUrl.searchParams.set('transition', 'inverse');
if (get('poster')) sceneUrl.searchParams.set('entry', 'poster');
setInputGuidance(matchMedia('(any-hover: hover) and (any-pointer: fine)').matches
  || !matchMedia('(pointer: coarse)').matches ? 'mouse' : 'touch');
syncPreparation();
frame.src = sceneUrl.href;
// One scene or decoded film is prepared here, before any replay activation.
sceneTimer = setTimeout(sceneFailed, 45000);
const navigation = performance.getEntriesByType('navigation')[0];
const restored = navigation?.type === 'back_forward' || Boolean(history.state?.elioMemoryReader);
if (config.experience?.entry !== 'reader' && !location.hash && !restored) show('intro');
else get('return').hidden = false;
// The dialog now covers the screen; reveal its reader underneath for the mask.
window.ELIO_MEMORY_STARTUP?.();
