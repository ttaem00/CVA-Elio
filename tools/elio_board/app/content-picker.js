/* Content selection for the existing Elio app. Work, camera and route state remain owned by app.js. */
(() => {
  'use strict';
  const esc = window.CVA_COMPONENTS.escape;
  const chevron = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
  const check = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>';
  const closeIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>';
  const groups = [
    { id: 'story', title: '이야기·도감' },
    { id: 'product', title: '제품 여정' }
  ];
  let works;
  let getWork;
  let chooseWork;
  let trigger;
  let dialog;
  let search;
  let filter = 'all';
  const groupOf = work => work.product_flow ? 'product' : 'story';
  const groupTitle = work => work.product_flow ? '제품 여정' : '이야기·도감';

  function renderResults() {
    const query = search.value.trim().toLocaleLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    const current = getWork();
    const found = works.filter(work => {
      const text = [work.title, work.description || '', groupTitle(work), work.product_flow ? 'Product User Flow' : ''].join(' ').toLocaleLowerCase();
      return (filter === 'all' || groupOf(work) === filter) && words.every(word => text.includes(word));
    });
    dialog.querySelector('.content-picker-results').innerHTML = found.length ? groups.map(group => {
      const entries = found.filter(work => groupOf(work) === group.id);
      if (!entries.length) return '';
      return `<section class="content-picker-group" aria-labelledby="content-picker-group-${group.id}"><h3 id="content-picker-group-${group.id}">${group.title}<span>${entries.length}</span></h3><ul>${entries.map(work => {
        const selected = work.id === current.id;
        return `<li><button type="button" class="content-picker-option" data-content-work="${esc(work.id)}"${selected ? ' aria-current="true"' : ''}><span class="content-picker-option-copy"><strong>${esc(work.title)}</strong>${work.description ? `<span class="content-picker-description">${esc(work.description)}</span>` : ''}</span>${selected ? `<span class="content-picker-selected">${check}<span>선택됨</span></span>` : '<span class="content-picker-option-arrow" aria-hidden="true">→</span>'}</button></li>`;
      }).join('')}</ul></section>`;
    }).join('') : '<div class="content-picker-empty"><h3>맞는 콘텐츠가 없습니다.</h3><p>검색어를 바꾸거나 전체 목록에서 다시 찾아보세요.</p><button type="button" data-content-reset>검색과 분류 초기화</button></div>';
    dialog.querySelector('.content-picker-count').textContent = `${found.length}개 결과 · 전체 ${works.length}개 콘텐츠`;
    dialog.querySelector('[data-content-filter="all"] span').textContent = works.length;
    groups.forEach(group => { dialog.querySelector(`[data-content-filter="${group.id}"] span`).textContent = works.filter(work => groupOf(work) === group.id).length; });
    dialog.querySelectorAll('[data-content-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.contentFilter === filter)));
    dialog.querySelector('.content-picker-current').textContent = `현재: ${current.title}`;
  }

  function update(work) {
    if (!trigger) return;
    const current = work || getWork();
    trigger.innerHTML = `<span class="content-picker-trigger-copy"><small>${groupTitle(current)}</small><strong>${esc(current.title)}</strong></span>${chevron}`;
    trigger.setAttribute('aria-label', `콘텐츠 선택 열기. 현재 ${groupTitle(current)}: ${current.title}`);
    if (dialog.open) renderResults();
  }

  function init(options) {
    if (dialog) { update(options.getWork()); return; }
    works = options.works;
    getWork = options.getWork;
    chooseWork = options.chooseWork;
    trigger = document.getElementById('work-picker-trigger');
    dialog = document.getElementById('content-picker');
    trigger.classList.add('content-picker-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'content-picker');
    trigger.setAttribute('aria-expanded', 'false');
    dialog.classList.add('content-picker-dialog');
    dialog.setAttribute('aria-labelledby', 'content-picker-title');
    const counts = Object.fromEntries(groups.map(group => [group.id, works.filter(work => groupOf(work) === group.id).length]));
    dialog.innerHTML = `<header class="content-picker-header"><div><p>Elio</p><h2 id="content-picker-title">콘텐츠 선택</h2></div><button type="button" class="content-picker-close" data-content-close aria-label="콘텐츠 선택 닫기">${closeIcon}</button></header><label class="content-picker-search-label" for="content-picker-search">콘텐츠 이름이나 목적 찾기</label><input id="content-picker-search" class="content-picker-search" type="search" placeholder="이야기, 저장 영역, LoL…" autocomplete="off"><div class="content-picker-filters" role="group" aria-label="콘텐츠 분류"><button type="button" data-content-filter="all" aria-pressed="true">전체 <span>${works.length}</span></button>${groups.map(group => `<button type="button" data-content-filter="${group.id}" aria-pressed="false">${group.title} <span>${counts[group.id]}</span></button>`).join('')}</div><p class="content-picker-current"></p><p class="content-picker-count" role="status" aria-live="polite"></p><div class="content-picker-results"></div>`;
    search = dialog.querySelector('.content-picker-search');
    search.addEventListener('input', renderResults);
    trigger.addEventListener('click', () => {
      if (dialog.open) return;
      renderResults();
      dialog.showModal();
      trigger.setAttribute('aria-expanded', 'true');
      search.focus();
    });
    dialog.addEventListener('close', () => {
      trigger.setAttribute('aria-expanded', 'false');
      if (trigger.isConnected && !trigger.closest('[inert],[hidden]')) trigger.focus({ preventScroll: true });
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
      event.stopPropagation();
    });
    dialog.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-content-close')) { dialog.close(); return; }
      if (button.hasAttribute('data-content-reset')) {
        search.value = '';
        filter = 'all';
        renderResults();
        search.focus();
        return;
      }
      if (button.dataset.contentFilter) {
        filter = button.dataset.contentFilter;
        renderResults();
        return;
      }
      const id = button.dataset.contentWork;
      if (!id) return;
      const changed = id !== getWork().id;
      dialog.close();
      if (changed) chooseWork(id);
    });
    update(getWork());
  }
  window.ElioContentPicker = { init, update };
})();
