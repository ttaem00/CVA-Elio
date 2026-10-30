/* Optional contextual help. It never changes an experience's product state. */
(function (global) {
  'use strict';

  function installHelp(target) {
    const document = target.document;
    const mountedTips = new WeakSet(), mountedTours = new WeakSet();
    let sequence = 0, activeTour = null;

    function uniqueId(kind) {
      let id;
      do { id = 'cva-help-' + kind + '-' + (++sequence); } while (document.getElementById(id));
      return id;
    }
    function elements(root, selector) {
      const result = [...root.querySelectorAll(selector)];
      if (root.matches?.(selector)) result.unshift(root);
      return result;
    }
    function token(element, attribute, id, add) {
      const values = new Set((element.getAttribute(attribute) || '').split(/\s+/).filter(Boolean));
      if (add) values.add(id); else values.delete(id);
      if (values.size) element.setAttribute(attribute, [...values].join(' '));
      else element.removeAttribute(attribute);
    }
    function position(box, anchor, container, preferredWidth) {
      const viewportWidth = target.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = target.innerHeight || document.documentElement.clientHeight;
      const bounds = container.getBoundingClientRect(), at = anchor.getBoundingClientRect();
      const left = Math.max(12, bounds.left + 8), right = Math.min(viewportWidth - 12, bounds.right - 8);
      const top = Math.max(12, bounds.top + 8), bottom = Math.min(viewportHeight - 12, bounds.bottom - 8);
      // A scrolled-out container cannot supply a useful visible anchoring area.
      const minX = right > left ? left : 12, maxX = right > left ? right : viewportWidth - 12;
      const minY = bottom > top ? top : 12, maxY = bottom > top ? bottom : viewportHeight - 12;
      const width = Math.max(1, Math.min(preferredWidth, maxX - minX));
      box.style.width = width + 'px';
      box.style.maxHeight = Math.max(1, maxY - minY) + 'px';
      const height = box.getBoundingClientRect().height;
      const x = Math.max(minX, Math.min(at.left + at.width / 2 - width / 2, maxX - width));
      const below = at.bottom + 12, above = at.top - height - 12;
      const side = below + height <= maxY || above < minY ? 'below' : 'above';
      const y = Math.max(minY, Math.min(side === 'below' ? below : above, maxY - height));
      box.style.left = x + 'px'; box.style.top = y + 'px';
      box.style.setProperty('--cva-help-arrow', Math.max(16, Math.min(width - 16, at.left + at.width / 2 - x)) + 'px');
      box.dataset.side = side;
    }
    function mount(root) {
      const cleanups = [];
      elements(root, '[data-cva-tip]').forEach(trigger => {
        const page = trigger.closest('.cva-page'), text = trigger.dataset.cvaTip?.trim();
        if (!page || !text || mountedTips.has(trigger)) return;
        mountedTips.add(trigger);
        const controller = new target.AbortController(), options = { signal: controller.signal };
        const tip = document.createElement('div');
        tip.className = 'cva-help-tip'; tip.id = uniqueId('tip'); tip.setAttribute('role', 'tooltip');
        tip.textContent = text; tip.hidden = true; page.append(tip);
        token(trigger, 'aria-describedby', tip.id, true);
        let overTrigger = false, overTip = false, focused = false, dismissed = false, timer = 0;
        const clearTimer = () => target.clearTimeout(timer);
        function show() {
          clearTimer();
          if (dismissed || activeTour) return;
          tip.hidden = false; position(tip, trigger, page, 280);
        }
        function leave() {
          clearTimer();
          if (dismissed && !overTrigger && !focused) { overTip = false; dismissed = false; return; }
          timer = target.setTimeout(() => {
            if (overTrigger || overTip || focused) return;
            tip.hidden = true; dismissed = false;
          }, 120);
        }
        trigger.addEventListener('pointerenter', event => {
          if (event.pointerType === 'touch') return;
          overTrigger = true; show();
        }, options);
        trigger.addEventListener('pointerdown', event => {
          if (event.pointerType === 'touch') { clearTimer(); dismissed = true; tip.hidden = true; }
        }, options);
        trigger.addEventListener('pointerleave', () => { overTrigger = false; leave(); }, options);
        trigger.addEventListener('focus', () => { focused = true; show(); }, options);
        trigger.addEventListener('blur', () => { focused = false; leave(); }, options);
        tip.addEventListener('pointerenter', () => { overTip = true; clearTimer(); }, options);
        tip.addEventListener('pointerleave', () => { overTip = false; leave(); }, options);
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape' && !tip.hidden) { clearTimer(); dismissed = true; tip.hidden = true; }
        }, options);
        const reposition = () => { if (!tip.hidden) position(tip, trigger, page, 280); };
        target.addEventListener('resize', reposition, options);
        document.addEventListener('scroll', reposition, { ...options, capture: true, passive: true });
        cleanups.push(() => {
          clearTimer(); controller.abort(); token(trigger, 'aria-describedby', tip.id, false);
          tip.remove(); mountedTips.delete(trigger);
        });
      });

      const tourScope = '.cva-experience,[data-cva-help-scope]';
      elements(root, tourScope).forEach(experience => {
        if (mountedTours.has(experience) || !experience.closest('.cva-page')) return;
        const starts = [...experience.querySelectorAll('button[data-cva-tour-start]')].filter(button => button.closest(tourScope) === experience);
        if (!starts.length) return;
        mountedTours.add(experience);
        const controller = new target.AbortController(), options = { signal: controller.signal };
        const dialog = document.createElement('section');
        dialog.className = 'cva-help-tour'; dialog.id = uniqueId('tour'); dialog.hidden = true;
        dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'false');
        const title = document.createElement('h3'), description = document.createElement('p'), count = document.createElement('p');
        title.className = 'cva-help-tour-title'; title.id = uniqueId('title');
        description.className = 'cva-help-tour-text'; description.id = uniqueId('text');
        description.setAttribute('aria-live', 'polite'); description.setAttribute('aria-atomic', 'true');
        count.className = 'cva-help-tour-count'; count.setAttribute('aria-live', 'polite');
        dialog.setAttribute('aria-labelledby', title.id); dialog.setAttribute('aria-describedby', description.id);
        const controls = document.createElement('div'); controls.className = 'cva-help-tour-controls';
        function button(label, className, action) {
          const element = document.createElement('button');
          element.type = 'button'; element.className = className; element.textContent = label;
          element.addEventListener('click', action, options); return element;
        }
        let current = -1, steps = [], highlighted = null, highlightOwned = false, origin = null;
        const tour = { close };
        function unhighlight() {
          if (highlightOwned) highlighted?.classList.remove('cva-help-target');
          highlighted = null; highlightOwned = false;
        }
        function close(returnFocus = true) {
          const wasOpen = !dialog.hidden;
          dialog.hidden = true; unhighlight(); current = -1;
          starts.forEach(start => start.setAttribute('aria-expanded', 'false'));
          if (activeTour === tour) activeTour = null;
          if (wasOpen && returnFocus && origin?.isConnected) origin.focus({ preventScroll: true });
        }
        const closeButton = button('닫기', 'cva-help-tour-close', () => close());
        const skip = button('건너뛰기', 'cva-help-tour-skip', () => close());
        const previous = button('이전', 'cva-help-tour-previous', () => show(current - 1));
        const next = button('다음', 'cva-help-tour-next', () => current === steps.length - 1 ? close() : show(current + 1));
        controls.append(skip, previous, next); dialog.append(closeButton, count, title, description, controls); experience.append(dialog);
        const originalAttributes = starts.map(start => ({ start, expanded: start.getAttribute('aria-expanded'), popup: start.getAttribute('aria-haspopup') }));
        starts.forEach(start => {
          token(start, 'aria-controls', dialog.id, true); start.setAttribute('aria-haspopup', 'dialog'); start.setAttribute('aria-expanded', 'false');
          start.addEventListener('click', () => {
            steps = [
              ['subject', '무엇을 살펴보나요?', '살펴볼 대상과 현재 위치를 확인하세요.'],
              ['controls', '어떻게 바꾸나요?', '조작을 바꾸면 같은 대상의 표현이 함께 달라집니다.'],
              ['result', '무엇이 달라졌나요?', '바뀐 모습과 설명을 함께 확인하세요.']
            ].flatMap(([name, heading, fallback]) => {
              const anchor = [...experience.querySelectorAll('[data-tour-target="' + name + '"]')].find(element => element.closest(tourScope) === experience && !element.closest('[hidden],[inert],[aria-hidden="true"]'));
              return anchor ? [{ anchor, heading, text: anchor.dataset.tourText?.trim() || fallback }] : [];
            });
            if (!steps.length) return;
            if (activeTour) activeTour.close(false);
            experience.closest('.cva-page').querySelectorAll('.cva-help-tip').forEach(tip=>{tip.hidden=true;});
            origin = start; activeTour = tour; start.setAttribute('aria-expanded', 'true'); show(0);
          }, options);
        });
        function reposition() {
          if (dialog.hidden || !steps[current]) return;
          if (!steps[current].anchor.isConnected) { close(false); return; }
          position(dialog, steps[current].anchor, experience, 336);
        }
        function show(index) {
          if (!steps[index]) return;
          unhighlight(); current = index;
          const step = steps[index]; highlighted = step.anchor;
          highlightOwned = !highlighted.classList.contains('cva-help-target'); highlighted.classList.add('cva-help-target');
          title.textContent = step.heading; description.textContent = step.text;
          count.textContent = '사용법 ' + (index + 1) + ' / ' + steps.length;
          previous.disabled = index === 0; next.textContent = index === steps.length - 1 ? '안내 닫기' : '다음';
          dialog.hidden = false;
          highlighted.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          reposition(); next.focus({ preventScroll: true });
        }
        document.addEventListener('keydown', event => {
          if (activeTour === tour && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
        }, { ...options, capture: true });
        target.addEventListener('resize', reposition, options);
        document.addEventListener('scroll', reposition, { ...options, capture: true, passive: true });
        cleanups.push(() => {
          close(false); controller.abort(); dialog.remove();
          originalAttributes.forEach(({ start, expanded, popup }) => {
            token(start, 'aria-controls', dialog.id, false);
            if (expanded === null) start.removeAttribute('aria-expanded'); else start.setAttribute('aria-expanded', expanded);
            if (popup === null) start.removeAttribute('aria-haspopup'); else start.setAttribute('aria-haspopup', popup);
          });
          mountedTours.delete(experience);
        });
      });
      return () => cleanups.forEach(dispose => dispose());
    }
    target.CVA_HELP_INTERACTIONS = { mount };
  }

  installHelp(global);
  global.CVA_HELP = { runtimeSource: '(' + installHelp.toString() + ')(window);window.CVA_HELP_INTERACTIONS.mount(window.document);' };
})(window);
