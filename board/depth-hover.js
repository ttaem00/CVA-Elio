/* Depth only: shallow pointer tilt on the surface, never the saved host/ports. */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = null, point = null, frame = 0;

  function allowed() {
    const body = document.body;
    const reading = document.getElementById('reading');
    return body.dataset.mode === 'depth' && body.dataset.panel !== 'flat'
      && !body.classList.contains('motion-reduced')
      && (body.classList.contains('motion-full') || !reduced.matches)
      && !document.getElementById('app')?.inert
      && (!reading || reading.hidden)
      && !document.getElementById('viewport')?.classList.contains('is-dragging');
  }

  function clear(immediate) {
    cancelAnimationFrame(frame);
    frame = 0;
    point = null;
    if (active) {
      active.host.dataset.depthHover = 'false';
      if (immediate) active.host.dataset.depthReset = 'true';
      active.surface.style.setProperty('--depth-hover-x', '0deg');
      active.surface.style.setProperty('--depth-hover-y', '0deg');
    }
    active = null;
  }

  function reset() { clear(true); }

  function track(event) {
    if (event.pointerType !== 'mouse' || event.buttons !== 0 || !allowed()) {
      reset();
      return;
    }
    const host = event.target instanceof Element
      ? event.target.closest('#nodes button.scene-node[data-node]') : null;
    const surface = host?.querySelector(':scope > .node-surface');
    if (!host || !surface || host.closest('[inert]')) {
      clear(false);
      return;
    }
    if (active?.host !== host) {
      clear(false);
      active = { host, surface };
      delete host.dataset.depthReset;
    }
    point = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const current = active, latest = point;
      point = null;
      if (!current || !latest || !allowed() || !current.host.isConnected || !current.surface.isConnected) {
        reset();
        return;
      }
      // The host remains flat even while its child surface turns. Measuring
      // that stable rectangle avoids feedback from the animated surface.
      const bounds = current.host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) { reset(); return; }
      const unit = (value, start, size) => Math.max(0, Math.min(1, (value - start) / size));
      const x = unit(latest.x, bounds.left, bounds.width);
      const y = unit(latest.y, bounds.top, bounds.height);
      current.surface.style.setProperty('--depth-hover-x', `${((.5 - y) * 4).toFixed(2)}deg`);
      current.surface.style.setProperty('--depth-hover-y', `${((x - .5) * 4).toFixed(2)}deg`);
      current.host.dataset.depthHover = 'true';
    });
  }

  function leave(event) {
    if (!active) return;
    if (event.relatedTarget instanceof Node && active.host.contains(event.relatedTarget)) return;
    clear(false);
  }

  document.addEventListener('pointerover', track, { capture: true, passive: true });
  document.addEventListener('pointermove', track, { capture: true, passive: true });
  document.addEventListener('pointerout', leave, { capture: true, passive: true });
  document.addEventListener('pointerdown', reset, { capture: true, passive: true });
  document.addEventListener('pointercancel', reset, { capture: true, passive: true });
  window.addEventListener('blur', reset);
  reduced.addEventListener('change', reset);

  // The app calls reset before mode/work/read/motion changes. There is no
  // observer, per-card listener, geometry mutation or recurring RAF loop.
  window.ElioDepthHover = { reset };
})();
