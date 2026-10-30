/* Use the same story perspective while keeping the whole act available. */
(() => {
  'use strict';
  for (const entry of document.querySelectorAll('.reader-board-entry')) {
    const link = entry.querySelector('[data-reader-board-views]');
    if (!link || link.dataset.readerBoardBound) continue;
    link.dataset.readerBoardBound = 'true';
    const views = JSON.parse(link.dataset.readerBoardViews);
    const current = new URLSearchParams(location.search).get('story') || 'main';
    const destination = new URL(link.href, location.href);
    destination.searchParams.set('view', views[current] || views.main);
    link.href = destination.href;
    entry.addEventListener('keydown', event => {
      if (event.key === 'Escape') entry.dataset.tooltipDismissed = '';
    });
    entry.addEventListener('focusout', () => delete entry.dataset.tooltipDismissed);
    entry.addEventListener('pointerleave', () => delete entry.dataset.tooltipDismissed);
  }
})();
