// Shared by story motifs; only this page's link presentation preference is saved.
export function createLinkEffectsPreference({identity,button,labels,window:win,document:doc}) {
  const key = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identity || '')
    ? `elio.linkEffects:${identity}` : null;
  let enabled = true;
  try { if (key) enabled = win.localStorage.getItem(key) !== 'off'; }
  catch { /* A storage restriction leaves the current page fully usable. */ }
  function paint() {
    doc.documentElement.dataset.elioLinkEffects = enabled ? 'on' : 'off';
    if (!button) return;
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? labels.on : labels.off;
  }
  function setEnabled(value) {
    enabled = value === true;
    paint();
    try { if (key) win.localStorage.setItem(key, enabled ? 'on' : 'off'); }
    catch { /* Keep the choice for this visit even if it cannot be persisted. */ }
  }
  button?.addEventListener('click', () => setEnabled(!enabled));
  paint();
  return {get enabled() { return enabled; }, setEnabled};
}
