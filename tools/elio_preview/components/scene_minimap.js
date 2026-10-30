/* Keep the selected scene in the map viewport without scrolling the page. */
(() => {
  function revealOffset(left, width, scrollLeft, viewportWidth, padding = 10) {
    if (left < scrollLeft + padding) return Math.max(0, left - padding);
    if (left + width > scrollLeft + viewportWidth - padding) {
      return Math.max(0, left + width - viewportWidth + padding);
    }
    return scrollLeft;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { revealOffset };
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.scene-nav--tree').forEach(nav => {
    const rail = nav.querySelector('.scene-nav__rail');
    let lastCurrent;
    function reveal(link) {
      if (!link || !rail.clientWidth) return;
      const bounds = link.getBoundingClientRect(), viewport = rail.getBoundingClientRect();
      const left = bounds.left - viewport.left + rail.scrollLeft;
      rail.scrollLeft = revealOffset(left, bounds.width, rail.scrollLeft, rail.clientWidth);
    }
    function sync(forceReveal = false) {
      nav.querySelectorAll('.scene-nav__link').forEach(link => {
        // The core reader masks this label in spoiler mode; do not copy data-title.
        link.title = link.getAttribute('aria-label') || '';
      });
      const current = nav.querySelector('.scene-nav__link[aria-current="step"]');
      // Repeated label/scroll updates must not undo the reader's manual panning.
      if (forceReveal || current !== lastCurrent) reveal(current);
      lastCurrent = current;
    }
    nav.addEventListener('focusin', event => {
      if (event.target.matches('.scene-nav__link, .scene-nav__phase')) reveal(event.target);
    });
    new MutationObserver(() => sync()).observe(nav, {
      subtree:true, attributes:true, attributeFilter:['aria-current', 'aria-label'],
    });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => sync(true)).observe(rail);
    sync();
  });
})();
