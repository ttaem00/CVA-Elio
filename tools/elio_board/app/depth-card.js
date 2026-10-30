/* CVA-owned DOM cards. View effects never change the authored board or ports. */
(() => {
  'use strict';
  const cards = new Map();
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let enabled = true, effect = '3d';

  function reset(card) {
    cancelAnimationFrame(card.frame);
    card.frame = 0;
    card.root.dataset.active = 'false';
    for (const key of ['--card-turn-x', '--card-turn-y', '--card-light-x', '--card-light-y']) card.button.style.removeProperty(key);
  }
  function selection(host, selected) {
    const card = cards.get(host);
    if (!card) return;
    card.data.selected = Boolean(selected);
    host.classList.toggle(card.data.kind === 'item' ? 'selected' : 'is-selected', Boolean(selected));
    card.button.setAttribute('aria-label', `${card.data.title} · ${card.data.meta}${selected ? ' · 현재 선택' : ''}`);
    if (selected) card.button.setAttribute('aria-current', 'true');
    else card.button.removeAttribute('aria-current');
  }
  function sync(card) {
    card.root.dataset.effect = effect;
    card.root.dataset.motion = String(enabled && card.data.motionEnabled !== false && fine.matches);
    reset(card);
  }
  function track(card, event) {
    if (event.pointerType !== 'mouse' || event.buttons !== 0 || card.root.dataset.motion !== 'true') { reset(card); return; }
    card.point = {x: event.clientX, y: event.clientY};
    if (card.frame) return;
    card.frame = requestAnimationFrame(() => {
      card.frame = 0;
      if (!card.root.isConnected || card.root.dataset.motion !== 'true') return;
      const bounds = card.host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const unit = (value, start, size) => Math.max(0, Math.min(1, (value - start) / size));
      const x = unit(card.point.x, bounds.left, bounds.width), y = unit(card.point.y, bounds.top, bounds.height);
      card.button.style.setProperty('--card-light-x', `${(x * 100).toFixed(2)}%`);
      card.button.style.setProperty('--card-light-y', `${(y * 100).toFixed(2)}%`);
      card.button.style.setProperty('--card-turn-x', `${((.5 - y) * 8).toFixed(2)}deg`);
      card.button.style.setProperty('--card-turn-y', `${((x - .5) * 8).toFixed(2)}deg`);
      card.root.dataset.active = 'true';
    });
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function unmount(host) {
    const card = cards.get(host);
    if (!card) return;
    reset(card); card.root.remove(); cards.delete(host);
  }
  function mount(host, data) {
    unmount(host);
    const root = element('div', 'elio-card-root');
    const button = element('button', 'elio-card-button');
    button.type = 'button'; button.dataset.node = data.id;
    if (data.image) {
      const art = element('span', 'elio-card-art'), image = document.createElement('img');
      image.src = data.image.src; image.alt = data.image.alt || data.title;
      image.draggable = false; image.style.objectPosition = data.image.position || 'center';
      art.append(image); button.append(art);
    }
    const copy = element('span', 'elio-card-copy');
    copy.append(element('span', 'elio-card-meta', data.meta), element('strong', 'elio-card-title', data.title));
    if ((data.kind === 'item' || !data.image) && data.description) copy.append(element('span', 'elio-card-description', data.description));
    button.append(copy);
    const hint = element('span', 'elio-card-hint', '선택해 읽기 ');
    hint.setAttribute('aria-hidden', 'true'); hint.append(element('span', '', '↗')); button.append(hint);
    root.append(button); host.append(root);
    const card = {host, root, button, data: {...data}, frame: 0, point: null};
    cards.set(host, card);
    root.addEventListener('pointermove', event => track(card, event), {passive: true});
    for (const type of ['pointerleave', 'pointercancel', 'pointerdown', 'focusout']) root.addEventListener(type, () => reset(card));
    sync(card); selection(host, data.selected);
  }
  function setMotionEnabled(value) {
    enabled = Boolean(value);
    for (const card of cards.values()) { card.data.motionEnabled = enabled; sync(card); }
  }
  function setEffect(value) {
    if (!['3d', 'glow'].includes(value)) return;
    effect = value; for (const card of cards.values()) sync(card);
  }
  fine.addEventListener('change', () => { for (const card of cards.values()) sync(card); });
  window.addEventListener('blur', () => { for (const card of cards.values()) reset(card); });
  window.ElioDepthCard = {mount, unmount, unmountAll: () => { for (const host of cards.keys()) unmount(host); }, updateSelection: selection, setMotionEnabled, setEffect};
})();
