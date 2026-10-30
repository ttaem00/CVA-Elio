/* Optional tree reader. Move the canonical scene DOM, never clone its controls. */
(() => {
  const COLORS = ['#287f9d', '#8b63bb', '#c47d25', '#278778', '#b85979', '#576ead'];
  function routeOptions(model, id, direction, visited = []) {
    const ids = model.edges.filter(edge => edge.relation !== 'return' && (direction > 0 ? edge.from : edge.to) === id)
      .map(edge => direction > 0 ? edge.to : edge.from);
    if (direction < 0 && ids.includes(visited.at(-1))) return [visited.at(-1)];
    return ids;
  }
  function returnOptions(model, id) {
    return model.edges.filter(edge => edge.relation === 'return' && edge.from === id).map(edge => edge.to);
  }
  // Reading geometry only. A replay timestamp never implies a story branch.
  function linearTopology(ids) {
    return { nodes:ids.map(event_id => ({ event_id, track_id:'story', track_label:'이야기 흐름',
      condition:'', lane_index:0, lane_count:1, lead:0, time:null })),
      edges:ids.slice(1).map((to,index) => ({ from:ids[index],to })), alignments:[] };
  }
  function readerContext(node, covered = false, number = 1) {
    return covered ? `장면 ${number}` : [node.track_label, node.time?.label].filter(Boolean).join(' · ');
  }
  function thumbnailFallbackTitle(title, imageState, covered = false) {
    return !covered && ['missing', 'error'].includes(imageState) ? title : '';
  }
  function thumbnailImageLabel(state, textOnly = false) {
    if (state === 'ready') return '';
    if (textOnly) return '문장으로 읽기';
    return state === 'missing' ? '장면 사진 없음' : state === 'error' ? '이미지 불러오기 실패' : '이미지 불러오는 중';
  }
  function initialReaderMode(requested, authored, isLinear, narrow) {
    const selected = ['photos', 'cards'].includes(requested) ? requested : authored;
    const explicitMode = ['photos', 'cards'].includes(selected);
    return { explicitMode, compact:explicitMode ? selected === 'photos' : !isLinear && narrow };
  }
  function initialSceneId(model, currentId) {
    return model.nodes.some(node => node.event_id === currentId) ? currentId : model.nodes[0].event_id;
  }
  // The thumbnail follows the selected canonical image, including responsive URLs
  // and its request policy. A missing/error state is never a selected replacement.
  function bindThumbnailImage(source, image, onState) {
    let requested = '', policy = '';
    function state(value) { image.hidden = value !== 'ready'; onState(value); }
    function settled() { state(image.complete && image.naturalWidth > 0 ? 'ready' : 'error'); }
    function sync(event) {
      const url = source?.currentSrc || source?.getAttribute('src') || '';
      const nextPolicy = source?.referrerPolicy || source?.getAttribute('referrerpolicy') || '';
      if (!url) { requested = ''; image.removeAttribute('src'); state('missing'); return; }
      const retry = event?.type === 'load' && source.naturalWidth > 0 && image.complete && !image.naturalWidth;
      if (url !== requested || policy !== nextPolicy || retry) {
        requested = url; policy = nextPolicy; state('loading');
        image.referrerPolicy = policy; image.src = url;
      }
      if (image.complete) settled();
    }
    image.addEventListener('load', settled);
    image.addEventListener('error', () => state('error'));
    source?.addEventListener('load', sync);
    source?.addEventListener('error', sync);
    if (source && typeof MutationObserver !== 'undefined') {
      new MutationObserver(sync).observe(source, { attributes:true, attributeFilter:['src','srcset','sizes','referrerpolicy'] });
    }
    sync();
    return sync;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { routeOptions, returnOptions, linearTopology, readerContext, thumbnailFallbackTitle, bindThumbnailImage, initialSceneId, initialReaderMode, thumbnailImageLabel };
  if (typeof document === 'undefined') return;
  const linearTimeline = document.querySelector('.timeline:not([data-story-layout="tree"])');
  if (linearTimeline && !linearTimeline.querySelector('.story-tree')) {
    const original = [...linearTimeline.children];
    const events = original.filter(child => child.matches('.item'));
    if (events.length) {
      const tree = document.createElement('div'); tree.className = 'story-tree'; tree.dataset.linear = 'true';
      const container = document.createElement('div'); container.className = 'story-tree__nodes';
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.classList.add('story-tree__edges'); svg.setAttribute('aria-hidden','true');
      const payload = document.createElement('script'); payload.type = 'application/json'; payload.className = 'story-tree__data';
      payload.textContent = JSON.stringify(linearTopology(events.map(event => event.id)));
      let wrapper = null, pending = [];
      original.forEach(child => {
        if (child.matches('.item')) {
          wrapper = document.createElement('div'); wrapper.className = 'story-tree__node';
          Object.assign(wrapper.dataset,{eventId:child.id,trackId:'story',laneCount:'1',laneIndex:'0',lead:'0'});
          container.append(wrapper); wrapper.append(...pending,child); pending = [];
        } else if (child.matches('.story-phase')) pending.push(child);
        else if (wrapper) wrapper.append(child);
        else pending.push(child);
      });
      wrapper?.append(...pending);
      tree.append(svg,container,payload); tree.linearOriginal = original; linearTimeline.append(tree);
    }
  }
  document.querySelectorAll('.story-tree').forEach(tree => {
    const isLinear = tree.dataset.linear === 'true';
    const model = JSON.parse(tree.querySelector('.story-tree__data').textContent);
    const container = tree.querySelector('.story-tree__nodes');
    const wrappers = new Map([...container.children].map(el => [el.dataset.eventId, el]));
    const nodes = new Map(model.nodes.map(node => [node.event_id, node]));
    const articles = new Map([...wrappers].map(([id, el]) => [id, el.querySelector('.item')]));
    const contents = new Map(), buttons = new Map(), colors = new Map(), phaseGates = new Map();
    const media = matchMedia('(max-width: 900px)');
    const requestedMode = new URL(location.href).searchParams.get('view');
    let { explicitMode, compact } = initialReaderMode(requestedMode, tree.dataset.defaultView, isLinear, media.matches);
    let selected = initialSceneId(model, tree.querySelector('.item.is-current')?.id);
    let opened = null, returnFocus = null, savedScroll = 0, visited = [];
    let outsideTarget = null, printState = null, suppressCloseRestore = false, excursionBookmark = null;
    const ownedParts = new Map(), highlightButtons = new Map();
    const effects = [document.getElementById('watch-fx-layer'),document.getElementById('watch-live-status')]
      .filter(Boolean).map(element => ({ element,parent:element.parentNode,next:element.nextSibling }));
    let colorIndex = 0;
    function el(tag, className, text) {
      const result = document.createElement(tag);
      if (className) result.className = className;
      if (text) result.textContent = text;
      return result;
    }
    function button(text, action, className = '') {
      const result = el('button', className, text); result.type = 'button';
      result.addEventListener('click', action); return result;
    }
    const mode = button('', () => {
      explicitMode = true; setMode(!compact, true);
      const url = new URL(location.href); url.searchParams.set('view', compact ? 'photos' : 'cards');
      history.replaceState(null, '', url);
    }, 'story-tree__mode');
    const viewport = el('div', 'story-tree__viewport');
    const canvas = el('div', 'story-tree__canvas');
    const svg = tree.querySelector('.story-tree__edges');
    canvas.append(svg, container); viewport.append(canvas); tree.append(viewport);
    // Reuse the template's reading controls instead of adding a second toolbar.
    const controls = document.querySelector('.hero-tools') || tree;
    controls.append(mode);
    const dialog = el('dialog', 'story-detail');
    dialog.setAttribute('aria-label', '선택한 장면 상세');
    const header = el('header', 'story-detail__header');
    const context = el('span', 'story-detail__context');
    const close = button('흐름으로 돌아가기 ×', () => dialog.close(), 'story-detail__close');
    header.append(context, close);
    const body = el('div', 'story-detail__body');
    const facts = el('p', 'story-detail__facts'); body.append(facts);
    const nav = el('nav', 'story-detail__nav'); nav.setAttribute('aria-label', '연결된 장면 이동');
    dialog.append(header, body, nav); tree.append(dialog);
    const choices = el('div', 'story-tree__choices'); choices.hidden = true;
    choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', '경로 선택');
    document.getElementById('scene-dock')?.append(choices);

    function title(id) {
      return sceneIsCovered(articles.get(id)) ? '숨겨진 이야기' : articles.get(id).querySelector('.scene-title').textContent;
    }
    function track(id) { return sceneIsCovered(articles.get(id)) ? `장면 ${model.nodes.findIndex(node => node.event_id === id) + 1}` : nodes.get(id).track_label; }
    function contextLabel(id) { return readerContext(nodes.get(id), sceneIsCovered(articles.get(id)), model.nodes.findIndex(node => node.event_id === id) + 1); }
    model.nodes.forEach((node, index) => {
      const id = node.event_id, wrapper = wrappers.get(id), article = articles.get(id);
      wrapper.dataset.phaseId = article.dataset.phaseId || '';
      wrapper.dataset.phaseLabel = article.dataset.phaseLabel || '';
      const phase = wrapper.querySelector('.story-phase');
      if (phase) {
        const phaseId = article.dataset.phaseId || phase.dataset.phase;
        phase.dataset.phaseId = phaseId;
        phase.classList.add('story-tree__phase');
        container.insertBefore(phase, wrapper); phaseGates.set(phaseId, phase);
      }
      const incoming = model.edges.filter(edge => edge.relation !== 'return' && edge.to === id);
      if (!colors.has(node.track_id)) {
        colors.set(node.track_id, !incoming.length || incoming.length > 1 ? '#718391' : COLORS[colorIndex++ % COLORS.length]);
      }
      wrapper.style.setProperty('--route-color', colors.get(node.track_id));
      const content = el('div', 'story-tree__scene');
      [...wrapper.children].filter(child => !child.matches('.story-tree__meta, .story-tree__relations')).forEach(child => content.append(child));
      ownedParts.set(id,[...content.children]);
      wrapper.append(content); contents.set(id, content);
      const thumb = button('', () => show(id), 'story-tree__thumb');
      thumb.setAttribute('aria-haspopup', 'dialog');
      const picture = el('span', 'story-tree__picture');
      const source = article.querySelector('.visual img');
      // It stays hidden until load succeeds, so lazy loading would never start.
      const img = el('img'); img.loading = 'eager'; img.decoding = 'async'; img.alt = ''; img.hidden = true;
      const textOnly = article.classList.contains('item--text-only');
      const imageState = el('span', 'story-tree__image-state');
      picture.append(img, imageState);
      picture.append(el('span', 'story-tree__hidden-mark', '…'));
      picture.append(el('span', 'story-tree__number', String(index + 1).padStart(2, '0')));
      const label = el('span', 'story-tree__thumb-label');
      const fallbackTitle = el('span', 'story-tree__thumb-title');
      fallbackTitle.hidden = true;
      const timeLabel = el('span', 'story-tree__thumb-time', node.time?.label || '');
      // Identify a route at its entrance, not above every image.
      label.textContent = !incoming.length || incoming.some(edge => nodes.get(edge.from).track_id !== node.track_id) ? node.track_label : '';
      thumb.append(picture, label, fallbackTitle, timeLabel); wrapper.prepend(thumb); buttons.set(id, thumb);
      const attached = [...content.querySelectorAll('.watch-moment')];
      if (attached.length) {
        const highlights = button(`하이라이트 ${attached.length}`, () => revealAnchor(attached[0].id), 'story-tree__highlights');
        highlights.title = '이 장면 다음의 하이라이트 펼치기';
        wrapper.insertBefore(highlights,content); highlightButtons.set(id,highlights);
      }
      function refreshThumbnail() {
        const covered = sceneIsCovered(article);
        thumb.classList.toggle('is-covered', covered);
        timeLabel.hidden = covered || !node.time?.label;
        fallbackTitle.textContent = thumbnailFallbackTitle(title(id), picture.dataset.imageState, covered);
        fallbackTitle.hidden = !fallbackTitle.textContent;
        thumb.setAttribute('aria-label', `${index + 1}. ${contextLabel(id)} · ${title(id)}${!covered && !imageState.hidden ? ' · ' + imageState.textContent : ''} · 장면 펼치기`);
        thumb.title = title(id);
        highlightButtons.get(id)?.setAttribute('aria-label', `${index + 1}번 장면 다음 하이라이트 ${attached.length}개 펼치기`);
        if (selected === id) syncDock(id);
        if (opened === id) { context.textContent = contextLabel(id); renderFacts(); renderNav(); }
      }
      const observer = new MutationObserver(refreshThumbnail);
      observer.observe(article, { attributes:true, attributeFilter:['class'] });
      // Covering a never-revealed article need not change its own class list.
      // The global spoiler-mode class is also an input to thumbnail visibility.
      observer.observe(tree.closest('.timeline'), { attributes:true, attributeFilter:['class'] });
      bindThumbnailImage(source, img, value => {
        picture.dataset.imageState = value;
        imageState.hidden = value === 'ready';
        imageState.textContent = thumbnailImageLabel(value, textOnly);
        refreshThumbnail();
        tree.dispatchEvent(new Event('story-tree:layout'));
      });
      refreshThumbnail();
    });
    function syncDock(id) {
      if (!nodes.has(id)) return;
      if (selected !== id) visited = [];
      selected = id;
      buttons.forEach((b, key) => { b.setAttribute('aria-pressed', String(key === id)); });
      const count = document.getElementById('scene-dock-count');
      if (count && !isLinear) count.textContent = track(id);
      document.getElementById('scene-dock-previous')?.toggleAttribute('disabled', !routeOptions(model,id,-1,visited).length);
      document.getElementById('scene-dock-next')?.toggleAttribute('disabled', !routeOptions(model,id,1).length);
    }
    function restoreContent() {
      if (opened) { wrappers.get(opened).append(contents.get(opened)); contents.get(opened).hidden = compact; }
      opened = null;
    }
    function select(id, direction = 0) {
      if (direction > 0 && id !== selected) visited.push(selected);
      else if (direction < 0 && id === visited.at(-1)) visited.pop();
      else if (!direction && id !== selected) visited = [];
      selected = id; choices.hidden = true;
      lockSceneNavigation(); setCurrentScene(id); syncDock(id);
      history.replaceState(null, '', `#${id}`);
    }
    function show(id, direction = 0, bookmark = null) {
      if (!nodes.has(id)) return;
      if (!dialog.open) {
        returnFocus = bookmark ? bookmark.focus : document.activeElement;
        savedScroll = bookmark ? bookmark.scroll : window.scrollY;
        excursionBookmark = null;
      }
      restoreContent(); select(id, direction); opened = id;
      context.textContent = contextLabel(id);
      dialog.style.setProperty('--route-color', colors.get(nodes.get(id).track_id));
      contents.get(id).hidden = false;
      body.append(contents.get(id)); renderFacts(); renderNav();
      if (!dialog.open) {
        effects.forEach(({element}) => dialog.append(element));
        dialog.showModal(); document.body.classList.add('story-detail-open');
      }
      dialog.scrollTop = 0; close.focus({ preventScroll:true });
    }
    function resume(id) {
      const bookmark = excursionBookmark;
      excursionBookmark = null;
      show(id, 0, bookmark?.id === id ? bookmark : null);
    }
    function go(id, direction) {
      if (dialog.open || compact) show(id, direction);
      else {
        select(id, direction);
        if (isLinear) scrollToScene(articles.get(id));
        else wrappers.get(id).scrollIntoView({ behavior:'smooth', block:'center' });
      }
    }
    function renderFacts() {
      const node = nodes.get(selected);
      const simultaneous = model.alignments.find(group => group.kind === 'simultaneous' && group.event_ids.includes(selected));
      const labels = sceneIsCovered(articles.get(selected)) ? [] : [node.condition, simultaneous?.label].filter(Boolean);
      facts.textContent = labels.join(' · '); facts.hidden = !labels.length;
    }
    function renderNav() {
      nav.replaceChildren();
      const before = routeOptions(model, selected, -1, visited), after = routeOptions(model, selected, 1);
      if (before.length) {
        const previous = el('div', 'story-detail__routes');
        previous.append(el('small', '', before.length > 1 ? '이 장면으로 이어진 경로' : '이전 장면'));
        before.forEach(id => previous.append(button(`‹ ${before.length > 1 ? track(id) : title(id)}`, () => go(id,-1))));
        nav.append(previous);
      }
      const next = el('div', 'story-detail__routes');
      next.append(el('small', '', !after.length ? '이 경로의 이야기는 여기까지입니다.' : after.length > 1 ? '다음으로 살펴볼 경로' : '다음 장면'));
      after.forEach(id => next.append(button(`${after.length > 1 ? track(id) : title(id)} ›`, () => go(id,1))));
      nav.append(next);
      const returning = returnOptions(model, selected);
      if (returning.length) {
        const group = el('div', 'story-detail__routes story-detail__causal-return');
        group.append(el('small', '', '인과가 돌아가는 장면'));
        returning.forEach(id => group.append(button(`↶ ${title(id)}`, () => go(id,0))));
        nav.append(group);
      }
    }
    function navigate(direction) {
      const targets = routeOptions(model, selected, direction, visited);
      if (targets.length === 1) go(targets[0], direction);
      else if (targets.length > 1) {
        choices.replaceChildren(el('small', '', direction > 0 ? '다음으로 살펴볼 경로' : '이 장면으로 이어진 경로'));
        targets.forEach(id => choices.append(button(track(id), () => go(id,direction))));
        choices.hidden = false; choices.querySelector('button').focus();
      }
    }
    function focusNode(id) {
      if (!nodes.has(id)) return;
      select(id); wrappers.get(id).scrollIntoView({ behavior:'instant', block:'center', inline:'center' });
    }
    function revealAnchor(fragment) {
      if (nodes.has(fragment)) { focusNode(fragment); return true; }
      const target = document.getElementById(fragment);
      const owner = [...ownedParts].find(([,parts]) => parts.some(part => part === target || part.contains(target)));
      if (!target || !owner) return false;
      show(owner[0]); history.replaceState(null,'',`#${encodeURIComponent(fragment)}`);
      requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
      return true;
    }
    function setMode(value, preserveContext = false) {
      const anchorId = preserveContext ? selected : null;
      const before = anchorId && (compact ? buttons.get(anchorId) : articles.get(anchorId));
      const anchorTop = before ? Math.max(64, Math.min(before.getBoundingClientRect().top, window.innerHeight * .65)) : 0;
      if (anchorId) lockSceneNavigation(1500);
      if (dialog.open) { suppressCloseRestore = Boolean(anchorId); restoreContent(); dialog.close(); }
      compact = value; tree.classList.toggle('is-compact', compact);
      document.querySelector('.page')?.classList.toggle('has-compact-tree', compact);
      tree.closest('.timeline')?.classList.toggle('has-photo-reader',compact);
      if (isLinear) {
        if (compact) {
          ownedParts.forEach((parts,id) => contents.get(id).append(...parts));
          phaseGates.forEach((gate,id) => {
            gate.classList.add('story-tree__phase');
            const first = [...wrappers.values()].find(wrapper => wrapper.dataset.phaseId === id);
            if (first) container.insertBefore(gate,first);
          });
        } else {
          phaseGates.forEach(gate => { gate.classList.remove('story-tree__phase'); gate.style.left = ''; gate.style.top = ''; gate.style.width = ''; });
          tree.linearOriginal.forEach(child => tree.parentNode.insertBefore(child,tree));
        }
      }
      mode.textContent = compact ? '장면 카드로 보기' : tree.dataset.defaultView === 'photos' ? '장면 지도로 보기' : '사진 흐름으로 보기';
      mode.setAttribute('aria-pressed', String(compact));
      canvas.style.minWidth = compact ? `${Math.max(...model.nodes.map(node => node.lane_count)) * 102}px` : '';
      buttons.forEach(b => b.hidden = !compact);
      contents.forEach(content => content.hidden = compact);
      tree.dispatchEvent(new Event('story-tree:layout'));
      scheduleSceneGeometryRefresh();
      if (anchorId) requestAnimationFrame(() => requestAnimationFrame(() => {
        const target = compact ? buttons.get(anchorId) : articles.get(anchorId);
        if (!target?.isConnected) return;
        window.scrollTo({ top:Math.max(0, window.scrollY + target.getBoundingClientRect().top - anchorTop), behavior:'instant' });
        setCurrentScene(anchorId); syncDock(anchorId);
      }));
    }
    dialog.addEventListener('close', () => {
      restoreContent(); document.body.classList.remove('story-detail-open');
      effects.forEach(({element,parent,next}) => parent.insertBefore(element,next?.parentNode === parent ? next : null));
      if (suppressCloseRestore) { suppressCloseRestore = false; tree.dispatchEvent(new Event('story-tree:layout')); return; }
      window.scrollTo({ top:savedScroll, behavior:'instant' });
      if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll:true });
      else buttons.get(selected)?.focus({ preventScroll:true });
      tree.dispatchEvent(new Event('story-tree:layout'));
      requestAnimationFrame(() => {
        if (outsideTarget) {
          const target = outsideTarget; outsideTarget = null;
          target.scrollIntoView({block:'center',behavior:'instant'});
          const returnId = selected;
          const back = button('읽던 장면으로 돌아가기',() => resume(returnId),'story-detail__return');
          target.querySelector('.story-detail__return')?.remove(); target.append(back); back.focus({preventScroll:true});
        } else window.scrollTo({ top:savedScroll, behavior:'instant' });
      });
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') choices.hidden = true; });
    document.addEventListener('click', event => {
      if (!event.target.closest('#scene-dock')) choices.hidden = true;
      const link = event.target.closest('.story-tree__relations a');
      if (link) { event.preventDefault(); go(link.hash.slice(1),-1); }
      const anchor = event.target.closest('a[href]');
      if (dialog.open && anchor && dialog.contains(anchor)) {
        const url = new URL(anchor.href,location.href);
        if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
          let fragment; try { fragment = decodeURIComponent(url.hash.slice(1)); } catch (_) { return; }
          const target = document.getElementById(fragment);
          if (target && !dialog.contains(target)) {
            event.preventDefault(); outsideTarget = target;
            excursionBookmark = {id:selected,focus:returnFocus,scroll:savedScroll};
            history.replaceState(null,'',url.hash); dialog.close();
          }
        }
      }
    });
    document.getElementById('scene-dock-current')?.addEventListener('click', event => {
      if (isLinear && !compact) return;
      event.preventDefault(); show(selected);
    });
    media.addEventListener('change', () => { if (!explicitMode && !isLinear) setMode(media.matches, true); });
    window.addEventListener('beforeprint',() => { printState = {compact,opened}; setMode(false); });
    window.addEventListener('afterprint',() => { if (printState) { setMode(printState.compact); if(printState.opened) show(printState.opened); printState = null; } });
    tree.storyReader = { get compact() { return compact; }, get opened() { return opened; }, phaseGates, syncDock, navigate, show, resume, focusNode, revealAnchor,
      color(id) { return colors.get(nodes.get(id).track_id); } };
    setMode(compact); syncDock(selected);
  });
})();
