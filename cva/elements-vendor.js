/*
MIT License

Copyright (c) 2025 Ronan Berder

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/*
MIT License

Copyright (c) Mark Mead

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/* Adapted from Basecoat v1.1.0 tabs/range, MIT (c) 2025 Ronan Berder.
 * Exact source and full notices: upstream/basecoat/ and NATIVE_SOURCES.md.
 * Registration glue is replaced by explicit, instance-owned mount/dispose. */
(function (global) {
  'use strict';

  function mountTabs(root, { onSelect } = {}) {
    const tablist = root.querySelector('[role="tablist"]');
    if (!tablist) return () => {};
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    const isDisabled = tab => tab.disabled || tab.getAttribute('aria-disabled') === 'true';
    const panelFor = tab => panels.find(panel => panel.id === tab.getAttribute('aria-controls'));
    const selectTab = (selected, focus = false) => {
      if (!tabs.includes(selected) || isDisabled(selected)) return;
      tabs.forEach(tab => {
        const active = tab === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.setAttribute('tabindex', active ? '0' : '-1');
        const panel = panelFor(tab);
        if (panel) panel.hidden = !active;
      });
      if (focus) selected.focus();
      if (onSelect) onSelect(selected, tabs.indexOf(selected));
    };
    const handleClick = event => {
      const tab = event.target.closest('[role="tab"]');
      if (tabs.includes(tab)) selectTab(tab);
    };
    const handleKeydown = event => {
      const enabledTabs = tabs.filter(tab => !isDisabled(tab));
      const currentIndex = enabledTabs.indexOf(event.target);
      if (currentIndex === -1) return;
      const vertical = tablist.getAttribute('aria-orientation') === 'vertical';
      let next;
      if (event.key === (vertical ? 'ArrowDown' : 'ArrowRight')) next = enabledTabs[(currentIndex + 1) % enabledTabs.length];
      if (event.key === (vertical ? 'ArrowUp' : 'ArrowLeft')) next = enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length];
      if (event.key === 'Home') next = enabledTabs[0];
      if (event.key === 'End') next = enabledTabs[enabledTabs.length - 1];
      if (!next) return;
      event.preventDefault();
      selectTab(next, true);
    };
    selectTab(tabs.find(tab => tab.getAttribute('aria-selected') === 'true' && !isDisabled(tab)) || tabs.find(tab => !isDisabled(tab)));
    tablist.addEventListener('click', handleClick);
    tablist.addEventListener('keydown', handleKeydown);
    return () => {
      tablist.removeEventListener('click', handleClick);
      tablist.removeEventListener('keydown', handleKeydown);
    };
  }

  function mountRange(element) {
    function updateRange() {
      const min = parseFloat(element.min || '0');
      const max = parseFloat(element.max || '100');
      const value = parseFloat(element.value || '0');
      const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      element.style.setProperty('--slider-value', `${percent}%`);
    }
    updateRange();
    element.addEventListener('input', updateRange);
    return () => element.removeEventListener('input', updateRange);
  }

  global.CVA_ELEMENT_VENDOR = Object.freeze({ mountTabs, mountRange });
})(typeof window !== 'undefined' ? window : globalThis);
