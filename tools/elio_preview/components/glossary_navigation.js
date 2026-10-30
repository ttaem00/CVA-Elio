// Keep glossary visits tied to the passage that opened this history entry.
// The rendered #story links remain the no-JS / direct-entry fallback.
(() => {
  const backLinks = [...document.querySelectorAll('.story-glossary__back')];
  if (!backLinks.length) return;

  const stateKey = 'elioGlossaryReturn';
  const origins = new Map();
  // History survives reloads, but these DOM references must never cross loads.
  const visitPrefix = `${Date.now()}-${Math.random()}`;
  let visitNumber = 0;
  const defaults = new Map(backLinks.map((link) => [link, {
    href: link.getAttribute('href'),
    text: link.textContent,
  }]));

  function fragmentId(fragment) {
    try { return decodeURIComponent(fragment.slice(1)); } catch { return ''; }
  }

  function currentOrigin() {
    const visit = history.state?.[stateKey];
    if (!visit || visit.termId !== fragmentId(location.hash)) return null;
    const origin = origins.get(visit.token);
    return origin?.link.isConnected ? origin : null;
  }

  function syncBackLinks() {
    const origin = currentOrigin();
    backLinks.forEach((link) => {
      const fallback = defaults.get(link);
      link.setAttribute('href', origin ? origin.hash : fallback.href);
      link.textContent = origin ? '읽던 곳으로 돌아가기 ↑' : fallback.text;
    });
  }

  function moveTo(target) {
    // Focus restores the keyboard reading position as well as the viewport.
    // A covered passage stays covered: focus its existing reveal control.
    const termCover = target.matches('.story-glossary__term')
      ? target.querySelector('.spoiler-cover:not([hidden])') : null;
    const coveredTarget = termCover || (target.closest('[inert], [hidden]')
      ? target.closest('.item, .watch-moment, .reader-guide')?.querySelector('.spoiler-cover:not([hidden])')
      : target);
    const closedDetail = coveredTarget?.closest('details:not([open])');
    const focusTarget = closedDetail?.querySelector('summary') || coveredTarget;
    if (!focusTarget) return;
    const temporaryTabIndex = !focusTarget.hasAttribute('tabindex') && focusTarget.tabIndex < 0;
    if (temporaryTabIndex) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
    focusTarget.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    if (temporaryTabIndex) {
      focusTarget.addEventListener('blur', () => focusTarget.removeAttribute('tabindex'), { once: true });
    }
  }

  document.addEventListener('click', (event) => {
    if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    // The optional photo reader handles closing its dialog before this listener.
    // Preserve that lifecycle, then attach the origin to the resulting detour.
    const readerDialog = link.matches('.term-link') && link.closest('.story-detail');
    if (event.defaultPrevented && !readerDialog) return;

    if (link.matches('.story-glossary__back')) {
      const origin = currentOrigin();
      if (!origin) {
        syncBackLinks();
        return;
      }
      event.preventDefault();
      history.pushState(origin.state, '', origin.hash);
      const reader = origin.link.closest('.story-tree, .time-map')?.storyReader;
      if (reader?.compact && origin.sceneId) {
        if (reader.resume) reader.resume(origin.sceneId);
        else reader.show(origin.sceneId);
        history.replaceState(origin.state, '', origin.hash);
      }
      syncBackLinks();
      moveTo(origin.link);
      return;
    }

    const href = link.getAttribute('href') || '';
    if (!link.matches('.term-link') || !href.startsWith('#')) return;
    const term = document.getElementById(fragmentId(href));
    if (!term?.matches('.story-glossary__term') || link.closest('.story-glossary')) return;

    const owner = link.closest('.item[id], .watch-moment[id], .reader-guide[id]');
    const token = `${visitPrefix}-${++visitNumber}`;
    origins.set(token, {
      link,
      hash: owner ? `#${encodeURIComponent(owner.id)}` : '#top',
      sceneId: link.closest('.story-tree__scene')?.querySelector('.item')?.id || owner?.id,
      state: history.state,
    });
    const visitState = { ...history.state, [stateKey]: { token, termId: term.id } };
    if (readerDialog && event.defaultPrevented) {
      readerDialog.addEventListener('close', () => requestAnimationFrame(() => {
        history.replaceState(visitState, '', href);
        // Reuse the canonical back link instead of adding a second return button.
        term.querySelector('.story-detail__return')?.remove();
        syncBackLinks();
        moveTo(term);
      }), { once: true });
      return;
    }
    event.preventDefault();
    history.pushState(visitState, '', href);
    syncBackLinks();
    moveTo(term);
  });

  window.addEventListener('popstate', syncBackLinks);
  window.addEventListener('hashchange', syncBackLinks);
  syncBackLinks();
})();
