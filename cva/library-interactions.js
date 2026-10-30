/* Native catalogue actions. Aceternity references and the original CVA implementation
 * are distinguished in docs/design/cva-design-system/SOURCE_REUSE_ACETERNITY.md. */
(function (global) {
  'use strict';

  const pending = new WeakMap();
  const reveals = new WeakMap();

  function updateStatus(status, state, message) {
    if (!status) return;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    status.dataset.state = state;
    status.textContent = message;
  }

  /** Run the real action once per button; callers receive failures as explicit results. */
  function run(button, task, status, labels = {}) {
    if (pending.has(button)) return pending.get(button);
    const children = Array.from(button.childNodes);
    const disabled = button.disabled;
    const busy = button.getAttribute('aria-busy');
    const accessibleLabel = button.getAttribute('aria-label');
    const pendingLabel = labels.pending || '처리 중…';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-label', pendingLabel);
    button.textContent = pendingLabel;
    updateStatus(status, 'pending', pendingLabel);

    const operation = (async () => {
      try {
        // Defer invocation until the reentry owner is registered below.
        const value = await Promise.resolve().then(task);
        updateStatus(status, 'success', labels.success || '완료했습니다.');
        return { ok: true, value };
      } catch (error) {
        const message = error && typeof error.message === 'string' ? error.message : '';
        updateStatus(status, 'error', (labels.error || '처리하지 못했습니다.') + (message ? ' ' + message : ''));
        return { ok: false, error };
      } finally {
        button.replaceChildren(...children);
        button.disabled = disabled;
        if (busy === null) button.removeAttribute('aria-busy');
        else button.setAttribute('aria-busy', busy);
        if (accessibleLabel === null) button.removeAttribute('aria-label');
        else button.setAttribute('aria-label', accessibleLabel);
        pending.delete(button);
      }
    })();
    pending.set(button, operation);
    return operation;
  }

  /** Explicit finite emphasis; the original complete text and DOM stay readable. */
  function reveal(element) {
    const previous = reveals.get(element);
    if (previous) previous();
    const preference = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || typeof element.animate !== 'function' || !preference || preference.matches) return () => {};

    const animation = element.animate([{ opacity: 0.6 }, { opacity: 1 }], {
      duration: 420,
      easing: 'ease-out',
      iterations: 1,
      fill: 'none'
    });
    let stopped = false;
    function stop() {
      if (stopped) return;
      stopped = true;
      animation.onfinish = null;
      animation.oncancel = null;
      preference.removeEventListener('change', onPreferenceChange);
      animation.cancel();
      if (reveals.get(element) === stop) reveals.delete(element);
    }
    function onPreferenceChange(event) {
      if (event.matches) stop();
    }
    animation.onfinish = stop;
    animation.oncancel = stop;
    preference.addEventListener('change', onPreferenceChange);
    reveals.set(element, stop);
    return stop;
  }

  global.CVA_LIBRARY_INTERACTIONS = { run, reveal };
})(window);
