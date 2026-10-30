/* Share approved public identity, never the development or debug address. */
(() => {
  'use strict';
  const copy = {
    ko: ['공유', '링크를 복사했어요', '공유 링크', '링크 복사', '닫기', '주소를 선택했어요. 직접 복사해 주세요.', '공개한 뒤 공유할 수 있어요'],
    en: ['Share', 'Link copied', 'Share link', 'Copy link', 'Close', 'The address is selected. Copy it manually.', 'Available after publication'],
    ja: ['共有', 'リンクをコピーしました', '共有リンク', 'リンクをコピー', '閉じる', '選択したアドレスをコピーしてください。', '公開後に共有できます'],
    'zh-Hans': ['分享', '链接已复制', '分享链接', '复制链接', '关闭', '地址已选中，请手动复制。', '发布后即可分享'],
  };

  function shareUrl(base, current, language = 'ko') {
    let url, location;
    try { url = new URL(base); location = new URL(current); } catch { return null; }
    if (url.origin !== 'https://s.ttaem.com' || url.username || url.password || url.search || url.hash ||
        !/^\/(?:ww-\d+-\d+(?:-\d+)*|elio\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(url.pathname)) return null;
    const explicit = location.searchParams.get('lang');
    const lang = ['ko', 'en', 'ja', 'zh-Hans', 'zh', 'auto'].includes(explicit) ? explicit : language;
    if (['en', 'ja', 'zh-Hans', 'zh', 'auto'].includes(lang)) url.searchParams.set('lang', lang);
    const story = location.searchParams.get('story');
    if (story && story.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(story) && story !== 'main') url.searchParams.set('story', story);
    const view = location.searchParams.get('view');
    if (['cards', 'photos'].includes(view)) url.searchParams.set('view', view);
    if (/^#[a-zA-Z0-9_-]{1,160}$/.test(location.hash) && !['#top', '#story'].includes(location.hash)) url.hash = location.hash;
    return url.href;
  }

  function bindShare(doc, win) {
    const button = doc.getElementById('story-share-button');
    if (!button || button.dataset.shareBound) return;
    button.dataset.shareBound = 'true';
    const wrapper = button.closest('.reader-share');
    const toolbar = doc.querySelector('.hero-tools');
    if (!wrapper || !toolbar) return;
    toolbar.append(wrapper); wrapper.hidden = false;
    const words = copy[doc.documentElement.lang] || copy.ko;
    button.querySelector('[data-share-label]').textContent = words[0];
    if (button.disabled) { button.title = words[6]; return; }
    const status = doc.getElementById('story-share-status');
    const say = message => { status.textContent = message; };
    let busy = false, dialog;
    function manual(url) {
      if (!dialog) {
        dialog = doc.createElement('dialog');
        dialog.className = 'reader-share-dialog';
        dialog.setAttribute('aria-labelledby', 'reader-share-title');
        dialog.setAttribute('translate', 'no');
        const title = doc.createElement('h2'); title.id = 'reader-share-title'; title.textContent = words[2];
        const input = doc.createElement('input'); input.readOnly = true; input.type = 'url'; input.setAttribute('aria-label', words[2]);
        const note = doc.createElement('p'); note.setAttribute('role', 'status');
        const actions = doc.createElement('div'); actions.className = 'reader-share-dialog__actions';
        const retry = doc.createElement('button'); retry.type = 'button'; retry.textContent = words[3];
        const close = doc.createElement('button'); close.type = 'button'; close.textContent = words[4];
        retry.addEventListener('click', () => {
          if (win.navigator.clipboard?.writeText) {
            win.navigator.clipboard.writeText(input.value).then(() => { note.textContent = words[1]; }, () => { input.select(); note.textContent = words[5]; });
          } else { input.select(); note.textContent = words[5]; }
        });
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => button.focus());
        dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
        actions.append(retry, close); dialog.append(title, input, note, actions); doc.body.append(dialog);
      }
      dialog.querySelector('input').value = url;
      dialog.showModal(); dialog.querySelector('input').select();
    }
    button.addEventListener('click', () => {
      if (busy) return;
      const url = shareUrl(button.dataset.shareUrl, win.location.href, doc.documentElement.lang);
      if (!url) return;
      say(''); busy = true; button.setAttribute('aria-busy', 'true');
      const release = () => { busy = false; button.removeAttribute('aria-busy'); };
      // Invoke the native API in the original gesture, with no network preflight.
      if (typeof win.navigator.share === 'function') {
        let operation;
        try { operation = win.navigator.share({ title: doc.title, url }); }
        catch (error) { release(); if (error.name !== 'AbortError') manual(url); return; }
        Promise.resolve(operation).catch(error => { if (error.name !== 'AbortError') manual(url); }).finally(release);
      } else if (win.navigator.clipboard?.writeText) {
        let operation;
        try { operation = win.navigator.clipboard.writeText(url); }
        catch { release(); manual(url); return; }
        Promise.resolve(operation).then(() => say(words[1]), () => manual(url)).finally(release);
      } else { release(); manual(url); }
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { shareUrl, bindShare };
  if (typeof document !== 'undefined' && typeof window !== 'undefined') bindShare(document, window);
})();
