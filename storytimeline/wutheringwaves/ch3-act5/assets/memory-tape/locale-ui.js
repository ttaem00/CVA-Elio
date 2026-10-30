// Small overlay-only UI fallback. Story and dialogue reuse the localized reader.
const UI = {
  ko: {
    work:'명조: 워더링 웨이브', act:'제3장 제5막', title:['어젯밤의','뭇별들'],
    question:['알 수 없는 경계에 닿기 위해서','이 별바다 아래로 온 거 아닌가요?'],
    views:'같은 장면, 다른 시선', selected:'선택한 장면', dialogue:'대사', screen:'화면 문구',
    loading:'테이프에 남은 장면을 불러오고 있어요.', read:'이야기 읽기', scroll:'아래로 스크롤',
    pinch:'두 손가락으로 확대', rotate:'드래그로 회전', swipe:'위아래로 쓸어 다가가기',
    help:'조작 안내 보기', video:'새 탭에서 영상 열기 ↗', continue:'이 페이지 계속 읽기', reopen:'기억 장면 다시 보기',
    link_on:'링크 연출 켜짐', link_off:'링크 연출 꺼짐', tools:'기억 장면과 링크 연출 설정',
    handoff:'선택한 영상은 새 탭에서 확인해 주세요.', blocked:'새 탭에서 선택한 영상으로 이어가세요.',
    error:'장면을 연결할 수 없습니다. 이야기 읽기로 이어갈 수 있어요.', streamer:'{streamer}의 시점으로',
    frame_live:'에이메스가 건넨 테이프. 스크롤 또는 두 손가락으로 확대하고, 드래그로 회전합니다.',
    frame_touch:'에이메스가 건넨 테이프. 두 손가락으로 확대하고, 드래그로 회전합니다.',
    frame_desktop:'에이메스가 건넨 테이프. 아래로 스크롤해 다가가고, 드래그로 회전합니다.',
    frame_images:'에이메스가 건넨 테이프. 스크롤이나 한 손가락 위아래 쓸기로 다가갑니다.',
  },
  en: {
    work:'Wuthering Waves', act:'Chapter 3 · Act 5', title:['Starlights','from Yesterdays'],
    question:['Didn’t we come beneath this sea of stars','to reach an unknown frontier?'],
    views:'The same scene, another perspective', selected:'Selected scene', dialogue:'Dialogue', screen:'On-screen text',
    loading:'Loading the scene held on this tape.', read:'Read the story', scroll:'Scroll down',
    pinch:'Pinch to zoom', rotate:'Drag to rotate', swipe:'Swipe up or down to move closer',
    help:'Show controls', video:'Open video in a new tab ↗', continue:'Keep reading this page', reopen:'Revisit the memory',
    link_on:'Link effects on', link_off:'Link effects off', tools:'Memory scene and link effects',
    handoff:'View the selected video in the new tab.', blocked:'Continue to the selected video in a new tab.',
    error:'This scene could not load. You can continue reading the story.', streamer:'From {streamer}’s perspective',
    frame_live:'The tape Aemeath gave you. Scroll or pinch to zoom, and drag to rotate.',
    frame_touch:'The tape Aemeath gave you. Pinch to zoom and drag to rotate.',
    frame_desktop:'The tape Aemeath gave you. Scroll down to move closer and drag to rotate.',
    frame_images:'The tape Aemeath gave you. Scroll or swipe up and down with one finger to move closer.',
  },
  ja: {
    work:'鳴潮', act:'第3章 第5幕', title:['昨夜を照らす','星々'],
    question:['未知の境界へ届くために、','この星の海の下へ来たのではありませんか？'],
    views:'同じ場面、違う視点', selected:'選んだ場面', dialogue:'台詞', screen:'画面の文字',
    loading:'テープに残された場面を読み込んでいます。', read:'物語を読む', scroll:'下にスクロール',
    pinch:'2本の指で拡大', rotate:'ドラッグして回転', swipe:'上下にスワイプして近づく',
    help:'操作方法を表示', video:'新しいタブで動画を開く ↗', continue:'このページを読み続ける', reopen:'記憶の場面をもう一度見る',
    link_on:'リンク演出 オン', link_off:'リンク演出 オフ', tools:'記憶の場面とリンク演出の設定',
    handoff:'選んだ動画は新しいタブでご覧ください。', blocked:'新しいタブで選んだ動画へ進めます。',
    error:'場面を読み込めませんでした。物語の続きは読めます。', streamer:'{streamer}の視点へ',
    frame_live:'エイメスが渡したテープ。スクロールまたは2本の指で拡大し、ドラッグして回転できます。',
    frame_touch:'エイメスが渡したテープ。2本の指で拡大し、ドラッグして回転できます。',
    frame_desktop:'エイメスが渡したテープ。下にスクロールして近づき、ドラッグして回転できます。',
    frame_images:'エイメスが渡したテープ。スクロールか1本の指での上下スワイプで近づけます。',
  },
  'zh-Hans': {
    work:'鸣潮', act:'第3章 第5幕', title:['昨夜','群星'],
    question:['我们不正是为了触及未知的边界，','才来到这片星海之下的吗？'],
    views:'同一幕，不同的视角', selected:'所选场景', dialogue:'台词', screen:'画面文字',
    loading:'正在载入留在磁带里的场景。', read:'阅读故事', scroll:'向下滚动',
    pinch:'双指缩放', rotate:'拖动旋转', swipe:'上下滑动以靠近',
    help:'查看操作说明', video:'在新标签页打开视频 ↗', continue:'继续阅读本页', reopen:'重温记忆中的场景',
    link_on:'链接动画：已开启', link_off:'链接动画：已关闭', tools:'记忆场景与链接动画设置',
    handoff:'请在新标签页查看所选视频。', blocked:'在新标签页继续观看所选视频。',
    error:'场景加载失败。你仍可继续阅读故事。', streamer:'从{streamer}的视角观看',
    frame_live:'爱弥斯交给你的磁带。滚动或双指缩放，拖动可旋转。',
    frame_touch:'爱弥斯交给你的磁带。双指缩放，拖动可旋转。',
    frame_desktop:'爱弥斯交给你的磁带。向下滚动以靠近，拖动可旋转。',
    frame_images:'爱弥斯交给你的磁带。滚动或单指上下滑动以靠近。',
  },
};

const plain = value => {
  const text = String(value || '').trim(), closing = {'「':'」','“':'”','"':'"'}[text[0]];
  return closing && text.endsWith(closing) ? text.slice(1, -1).trim() : text;
};
const quoted = value => [...String(value).matchAll(/「([^「」]+)」|“([^“”]+)”|"([^"\n]+)"/g)]
  .map(match => match[1] || match[2] || match[3]);
const join = (lines, language) => lines.join(language === 'ko' || language === 'en' ? ' ' : '');

export function createMemoryLocale({window: win, document: doc, reader}) {
  const tag = win.ElioI18n?.language || doc.documentElement?.lang || 'ko';
  const language = /^en(?:-|$)/i.test(tag) ? 'en' : /^ja(?:-|$)/i.test(tag) ? 'ja'
    : /^zh(?:-Hans|-CN|-SG)?$/i.test(tag) ? 'zh-Hans' : 'ko';
  let messages = {};
  try { messages = JSON.parse(doc.getElementById?.('elio-language-data')?.textContent || '{}').messages || {}; }
  catch { /* A missing translation payload still permits overlay UI controls. */ }
  const originalText = node => messages[node?.getAttribute?.('data-i18n-key')]?.source || '';
  function t(name, values = {}) {
    const key = `memory_${name}`, existing = win.ElioI18n?.t(key, values);
    const value = typeof existing === 'string' && existing !== key ? existing : UI[language][name] ?? UI.ko[name];
    return String(value).replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? String(values[name]) : token);
  }
  function localizedSource(source) {
    const nodes = reader.querySelectorAll?.('[data-i18n-key]') || [];
    const values = new Set([...nodes].filter(node => plain(originalText(node)) === plain(source))
      .map(node => plain(node.textContent)).filter(value => value && (language === 'ko' || value !== plain(source))));
    return values.size === 1 ? [...values][0] : '';
  }
  function quoteFor(moment, raw) {
    if (!raw?.text) return null;
    if (language === 'ko') return raw;
    // Match only this selected card's exact source, never adjacent choices or a
    // different quote elsewhere on the page. Ambiguity falls back to its title.
    const content = moment?.querySelector('.watch-moment__content');
    for (const node of content?.querySelectorAll('h3,p,blockquote,q') || []) {
      const source = originalText(node), value = plain(node.textContent);
      if (source && plain(source) === plain(raw.text) && value && value !== plain(raw.text)) {
        return {text:value, kind:t(raw.kind === '화면 문구' ? 'screen' : 'dialogue')};
      }
      const before = quoted(source), after = quoted(node.textContent);
      if (before.length === 1 && after.length === 1 && plain(before[0]) === plain(raw.text)
          && plain(after[0]) !== plain(raw.text)) {
        return {text:plain(after[0]), kind:t(raw.kind === '화면 문구' ? 'screen' : 'dialogue')};
      }
    }
    return null;
  }
  function write(node, value) {
    if (!node) return;
    const text = [...node.childNodes].find(child => child.nodeType === 3 && child.textContent.trim());
    if (text) text.textContent = ` ${value} `; // Preserve arrows and gesture SVGs.
    else node.textContent = value;
  }
  function localize(root) {
    if (language === 'ko') return;
    const get = name => doc.getElementById(`elio-memory-${name}`);
    for (const name of ['read','video','continue','reopen']) write(get(name), t(name));
    get('status').textContent = t('loading');
    get('info').setAttribute('aria-label', t('help'));
    get('tools')?.setAttribute('aria-label', t('tools'));
    const eyebrow = root.querySelector('.elio-memory__type > .elio-memory__eyebrow');
    write(eyebrow, t('work')); write(eyebrow?.querySelector('span'), t('act'));
    write(root.querySelector('.elio-memory__watch > .elio-memory__eyebrow'), t('views'));
    const heading = localizedSource('제3장 제5막 「어젯밤의 뭇별들」');
    const title = quoted(heading), defaults = UI[language].title;
    const lines = title.length === 1 && plain(title[0]) !== join(defaults, language)
      ? [plain(title[0]), ''] : defaults;
    [...(get('title')?.querySelectorAll('span') || [])].forEach((node, index) => { node.textContent = lines[index] || ''; });
    const question = localizedSource(join(UI.ko.question, 'ko'));
    const questionLines = UI[language].question;
    const near = root.querySelector('.elio-memory__near');
    const spans = [...(near?.querySelectorAll('span') || [])];
    if (question && plain(question) !== join(questionLines, language)) {
      // Preserve the reader's exact approved wording; natural wrapping needs no
      // extra punctuation or dialogue invented by this presentation layer.
      if (spans[0]) spans[0].textContent = question;
      if (spans[1]) spans[1].textContent = '';
    } else spans.forEach((node, index) => { node.textContent = questionLines[index]; });
    for (const [selector, key] of [['span.elio-memory__desktop-hint','scroll'],['span.elio-memory__touch-hint','pinch'],
      ['.elio-memory__rotation-hint','rotate'],['.elio-memory__film-touch-hint','swipe']]) {
      write(root.querySelector(selector), t(key));
    }
  }
  return {language, t, originalText, quoteFor, localize};
}
