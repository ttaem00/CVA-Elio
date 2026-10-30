/* The guide reads the copied CVA manifest; names, paths and provenance have one owner. */
(() => {
  'use strict';
  const sizes = [16, 20, 24, 32, 64];
  const variants = ['color', 'micro', 'mono', 'reverse'];
  const identifiers = ['cva', 'loki', 'ttaempad', 'temporal-loom', 'dayline', 'elio', 'manager-cue', 'timelink'];
  const labels = { color: '컬러', micro: 'micro', mono: '단색', reverse: '반전' };
  const grid = document.getElementById('icon-grid');
  const controls = document.getElementById('display-controls');
  const sizeInput = document.getElementById('icon-size');
  const modeInput = document.getElementById('icon-mode');
  const status = document.getElementById('display-status');
  const cards = [];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function assetPath(icon, mode) {
    return '../' + icon.files[mode].path;
  }

  function image(icon, mode, size) {
    const img = element('img');
    img.src = assetPath(icon, mode);
    img.alt = '';
    img.width = size;
    img.height = size;
    return img;
  }

  function validateManifest(data) {
    if (data?.source?.repository !== 'ttaem00/chzz-vod-analyzer' ||
        !/^[0-9a-f]{40}$/.test(data.source.commit) || !Array.isArray(data.icons) ||
        data.icons.length !== identifiers.length) throw Error('Invalid brand manifest');
    const seen = new Set();
    for (const icon of data.icons) {
      if (!identifiers.includes(icon.id) || seen.has(icon.id) ||
          typeof icon.name !== 'string' || !icon.name.trim() ||
          typeof icon.role !== 'string' || !icon.role.trim()) throw Error('Invalid icon identity');
      seen.add(icon.id);
      for (const mode of variants) {
        const file = icon.files?.[mode];
        if (file?.path !== 'cva/assets/brand-icons/v4/' + icon.id + '-' + mode + '.svg' ||
            !/^[0-9a-f]{64}$/.test(file.sha256)) throw Error('Invalid icon asset');
      }
    }
    return data;
  }

  function makeCard(icon) {
    const article = element('article', 'icon-card');
    const headingId = 'icon-' + icon.id;
    article.setAttribute('aria-labelledby', headingId);
    const preview = element('div', 'icon-preview');
    preview.dataset.mode = 'color';
    const large = image(icon, 'color', 64);
    preview.append(large);
    const body = element('div', 'icon-card-body');
    const title = element('h3', '', icon.name);
    title.id = headingId;
    body.append(title, element('p', 'icon-role', icon.role));
    const strip = element('ul', 'size-strip');
    strip.setAttribute('aria-label', icon.name + ' 크기 비교');
    for (const size of sizes.filter(value => value <= 32)) {
      const item = element('li');
      const sample = element('div', 'sample');
      sample.append(image(icon, size <= 20 ? 'micro' : 'color', size));
      item.append(sample, element('span', '', size + 'px'));
      strip.append(item);
    }
    const links = element('div', 'download-links');
    links.setAttribute('aria-label', icon.name + ' SVG 원본');
    for (const mode of variants) {
      const link = element('a', '', labels[mode] + ' ↓');
      link.href = assetPath(icon, mode);
      link.download = icon.id + '-' + mode + '.svg';
      link.setAttribute('aria-label', icon.name + ' ' + labels[mode] + ' SVG 다운로드');
      links.append(link);
    }
    body.append(strip, links);
    article.append(preview, body);
    cards.push({ icon, preview, large });
    return article;
  }

  function updateDisplay() {
    const requestedSize = Number(sizeInput.value);
    const size = sizes.includes(requestedSize) ? requestedSize : 64;
    const mode = ['color', 'mono', 'reverse'].includes(modeInput.value) ? modeInput.value : 'color';
    const fileMode = mode === 'color' && size <= 20 ? 'micro' : mode;
    for (const card of cards) {
      card.large.src = assetPath(card.icon, fileMode);
      card.large.width = size;
      card.large.height = size;
      card.preview.dataset.mode = mode;
    }
    status.textContent = '위쪽 미리보기: ' + size + 'px · ' + labels[fileMode] +
      '. 아래 비교 줄: 16·20px micro / 24·32px 컬러.';
  }

  controls.addEventListener('submit', event => event.preventDefault());
  controls.addEventListener('change', updateDisplay);
  fetch('../cva/assets/brand-icons/manifest.json')
    .then(response => { if (!response.ok) throw Error('Brand manifest unavailable'); return response.json(); })
    .then(validateManifest)
    .then(data => {
      const ordered = identifiers.map(id => data.icons.find(icon => icon.id === id));
      grid.replaceChildren(...ordered.map(makeCard));
      document.getElementById('collection-summary').textContent = data.icons.length + '개 표식 · ' + variants.length + '가지 자산';
      const source = document.getElementById('source-ref');
      const link = element('a', '', '정본 커밋 ' + data.source.commit.slice(0, 7));
      link.href = 'https://github.com/' + data.source.repository + '/commit/' + data.source.commit;
      source.replaceChildren(link);
      controls.querySelector('fieldset').disabled = false;
      updateDisplay();
    })
    .catch(() => {
      grid.replaceChildren();
      document.getElementById('load-error').hidden = false;
      document.getElementById('collection-summary').textContent = '목록 연결을 확인해 주세요.';
      status.textContent = '아이콘 목록을 불러오지 못했습니다.';
    });
})();
