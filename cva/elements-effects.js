/* Hallmark portions: native Specimen controls and sticky-diptych structure.
 * Adapted from https://github.com/Nutlope/hallmark/tree/65b5e4090ed95ee3dc2ff7db55b69aef8c5ff7b5
 * Font metrics, photos and global page handlers are not consumed.
 *
 * MIT License
 *
 * Copyright (c) 2026 Hallmark contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *
 * # Notice
 *
 * These design skills inspired Hallmark and shaped its rules.
 *
 * | Project | What Hallmark took | License |
 * | --- | --- | --- |
 * | [Impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus | Some slop rules, the edit-time hook, per-model tics, themes loaded one at a time | Apache-2.0 |
 * | [frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) by Anthropic | Commit to one direction, no generic fonts or purple gradients | Apache-2.0 |
 * | [Open Design](https://github.com/nexu-io/open-design) by nexu-io | The Editorial theme's look, the blue-to-cyan gradient tell | Apache-2.0 |
 * | [Kami](https://github.com/tw93/kami) by tw93 | No orphan on a grid's last row, no zigzag sections | MIT |
 * | [taste-skill](https://github.com/Leonxlnx/taste-skill) by Leonxlnx | Mirror a split once at most, the hero padding cap | MIT |
 * | [huashu-design](https://github.com/alchaincyf/huashu-design) by alchaincyf | Detail goes to the hero, pictures before layout | MIT |
 * | [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) by nextlevelbuilder | Picking a direction from the product type | MIT |
 * | [Emil Kowalski's skills](https://github.com/emilkowalski/skills) | Easing rules, testing with worst-case data | MIT |
 * | [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) by Vercel | Checks at every width, empty and error states | MIT |
 *
 * Photographs come from [Wikimedia Commons](https://commons.wikimedia.org), each under its own licence and credited on the page that uses it.
 */
/* Native CVA elements. Aceternity is a design reference, never copied source.
 * Section grid adapts HyperUI MIT structure at 252efcfe39161db6e67cd877da001ee248d2bbf6:
 * public/examples/marketing/feature-grids/1.html, feature-grids/2.html and application/grids/3.html.
 * CVA supplies escaped content, scoped CSS and intrinsic heights instead of demo placeholders. */
(function (global) {
  'use strict';
  const H = global.CVA_ELEMENTS.helpers;
  const e = H.e;
  const field = (key, label, kind = 'text', extra = {}) => ({ key, label, kind, ...extra });
  const variants = rows => rows.map(([id, label]) => ({ id, label }));
  const source = (name, url, method) => ({ name, url, method });
  const native = method => source('Native HTML · CVA', 'https://developer.mozilla.org/en-US/docs/Web/HTML', method);
  const common = [field('title', '제목'), field('body', '설명', 'textarea')];
  const head = p => '<h3 class="ce-title">' + e(p.title) + '</h3>' + (p.body ? '<p class="ce-body">' + e(p.body) + '</p>' : '');
  const rows = (value, max = 8) => H.lines(value, max).map(line => line.split('|').map(part => part.trim()));
  function validateRows(value, maximum, label, columns) {
    const lines = String(value).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length > maximum) throw new Error(label + ': ' + maximum + '행 이내로 입력하세요.');
    if (columns && lines.some(line => line.split('|').length > columns)) throw new Error(label + ': 한 행에 ' + columns + '개 열까지만 입력하세요.');
    return lines.map(line => line.split('|').map(part => part.trim()));
  }
  const assetFigure = (imageId, label) => '<div class="ce-compare-image">' + H.media(imageId, { caption: label }) + '</div>';
  const literalPattern = (query, flags = 'iu') => new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  function searchTools(context, label, target, suffix) {
    const id = H.id(context, suffix + '-query'), statusId = H.id(context, suffix + '-status');
    return '<div class="ce-search-tools"><label class="ce-field" for="' + id + '"><span>' + label + '</span><input id="' + id + '" data-ce-search-query type="search" maxlength="120" autocomplete="off" placeholder="찾을 단어나 문장" aria-controls="' + target + '" aria-describedby="' + statusId + '"></label><button class="ce-button secondary" type="button" data-ce-search-clear disabled>검색 지우기</button></div><p class="ce-status ce-search-result" id="' + statusId + '" data-ce-search-result role="status" aria-live="polite" aria-atomic="true"></p>';
  }

  const textEmphasis = {
    id: 'text-emphasis', name: '읽을 수 있는 텍스트 강조', category: 'text',
    description: '전체 문장을 보존하면서 강조·본문 검색·활자 시험·글자 위계 비교를 선택합니다. 활자 시험의 조절은 미리보기에만 적용됩니다.',
    keywords: ['text', 'gradient', 'underline', 'marker', 'outline', 'lift', 'reveal', 'search', 'specimen', 'type-scale', 'typography', 'font', 'Hallmark', '텍스트', '강조', '모션', '본문 검색', '활자 시험', '타이포그래피', '글자 크기', '굵기', '기울임', '글자 위계', 'poster', '색면 포스터'],
    source: source('Native CVA · Animate.css / Hallmark MIT', 'https://github.com/animate-css/animate.css/blob/4aa415199dd4ed7d877d10343e745e8bbb4b7a0c/source/fading_entrances/fadeInUp.css', 'lift는 MIT fadeInUp keyframe 적응. specimen은 https://github.com/Nutlope/hallmark/blob/65b5e4090ed95ee3dc2ff7db55b69aef8c5ff7b5/site/themes/specimen/page.js 의 native range→CSS 변수/output와 aria-pressed 조절을 인스턴스에 한정해 적응. 원문과 authored model은 보존하며 metric canvas·Aceternity 코드는 포함하지 않음.'),
    variants: variants([['gradient', '색의 흐름'], ['underline', '핵심 문장 밑줄'], ['sequence', '행별 한 번 강조'], ['marker', '문장에 형광펜'], ['outline', '채워진 글자와 윤곽'], ['lift', '글 묶음 한 번 등장'], ['search', '본문에서 구절 찾기'], ['specimen', '크기·굵기·기울임 활자 시험'], ['type-scale', '같은 문장의 글자 위계'], ['poster', '한 문장의 색면 포스터']]),
    controls: [field('text', '강조할 문장 · 행마다 한 구절', 'textarea', { hint: '원문 전체를 보존합니다. 행별 효과는 첫 12행을 한 번 강조하며 나머지는 정적으로 읽습니다.' }), field('caption', '문장 아래 설명'), field('fontSize', '활자 시험 초기 크기 · px', 'number', {min:14, max:96, step:1, variants:['specimen']}), field('fontWeight', '활자 시험 초기 굵기 · 100 단위', 'number', {min:100, max:900, step:100, variants:['specimen'], hint:'현재 글꼴이 지원하는 가장 가까운 굵기로 표시합니다. variable-font 축을 측정하는 도구가 아닙니다.'}), field('italic', '활자 시험 초기 기울임', 'checkbox', {variants:['specimen']})],
    defaults: { variant: 'gradient', text: '하나의 장면에서\n다음 이야기를 발견합니다.', caption: '글자는 처음부터 모두 읽을 수 있습니다.', fontSize:48, fontWeight:400, italic:false },
    validate(p) {
      if (p.variant !== 'specimen') return;
      if (!Number.isInteger(p.fontSize)) throw new Error('활자 시험 크기는 정수 px로 입력하세요.');
      if (!Number.isInteger(p.fontWeight) || p.fontWeight % 100 !== 0) throw new Error('활자 시험 굵기는 100 단위로 입력하세요.');
    },
    render(p, context) {
      if (p.variant === 'specimen') {
        const size = H.id(context, 'specimen-size'), weight = H.id(context, 'specimen-weight'), copy = H.id(context, 'specimen-copy'), help = H.id(context, 'specimen-help');
        return '<section class="ce-text-emphasis ce-text-specimen"><p class="ce-kicker">같은 문장으로 활자 시험</p><div class="ce-specimen-panel"><div class="ce-specimen-controls"><label class="ce-specimen-range" for="' + size + '"><span>글자 크기 <output for="' + size + '" data-ce-specimen-size-output>' + p.fontSize + '</output> px</span><input id="' + size + '" data-ce-specimen-size type="range" min="14" max="96" step="1" value="' + p.fontSize + '" aria-controls="' + copy + '" aria-describedby="' + help + '"></label><label class="ce-specimen-range" for="' + weight + '"><span>글자 굵기 <output for="' + weight + '" data-ce-specimen-weight-output>' + p.fontWeight + '</output></span><input id="' + weight + '" data-ce-specimen-weight type="range" min="100" max="900" step="100" value="' + p.fontWeight + '" aria-controls="' + copy + '" aria-describedby="' + help + '"></label><div class="ce-specimen-styles" role="group" aria-label="글자 기울임"><button type="button" data-ce-specimen-style="normal" aria-pressed="' + !p.italic + '" aria-controls="' + copy + '">기본</button><button type="button" data-ce-specimen-style="italic" aria-pressed="' + p.italic + '" aria-controls="' + copy + '">기울임</button></div></div><p id="' + copy + '" class="ce-specimen-copy" data-ce-specimen-copy style="--ce-specimen-size:' + p.fontSize + 'px;--ce-specimen-weight:' + p.fontWeight + ';--ce-specimen-style:' + (p.italic ? 'italic' : 'normal') + '">' + e(p.text) + '</p></div><p class="ce-status" id="' + help + '">조절은 현재 미리보기만 바꿉니다. 저장할 기본값과 문장은 제작실 편집 패널에서 바꾸세요.</p><p class="ce-body">' + e(p.caption) + '</p></section>';
      }
      if (p.variant === 'type-scale') {
        return '<section class="ce-text-emphasis ce-text-type-scale"><p class="ce-kicker">같은 문장, 다른 위계</p><dl class="ce-type-scale">' + [['display','표제'],['heading','중간 제목'],['body','본문']].map(([level, label]) => '<div class="ce-type-scale-level"><dt>' + label + '</dt><dd><p class="ce-type-scale-' + level + '">' + e(p.text) + '</p></dd></div>').join('') + '</dl><p class="ce-body">' + e(p.caption) + '</p></section>';
      }
      if (p.variant === 'search') {
        const id = H.id(context, 'search-copy');
        return '<section class="ce-text-emphasis ce-text-search">' + searchTools(context, '본문에서 찾기', id, 'text') + '<p class="ce-emphasis-copy" id="' + id + '" data-ce-search-copy>' + e(p.text) + '</p><p class="ce-body">' + e(p.caption) + '</p></section>';
      }
      return '<div class="ce-text-emphasis ce-text-' + e(p.variant) + '"><p class="ce-emphasis-copy">' + p.text.split(/\r?\n/).map(line => '<span data-ce-text-line>' + e(line) + '</span>').join('\n') + '</p><p class="ce-body">' + e(p.caption) + '</p>' + (['sequence', 'lift'].includes(p.variant) ? '<button class="ce-button secondary" type="button" data-ce-text-play>' + (p.variant === 'lift' ? '글 묶음 한 번 강조' : '한 번 강조') + '</button><p class="ce-status" data-ce-text-status role="status" aria-live="polite">명시적으로 재생할 때만 강조합니다.</p>' : '') + '</div>';
    },
    mount(node, p) {
      if (p.variant === 'specimen') {
        // Hallmark Specimen page.js:25-34 (MIT), scoped to one emitted CVA instance.
        const scope = H.scope(), size = node.querySelector('[data-ce-specimen-size]'), weight = node.querySelector('[data-ce-specimen-weight]');
        const copy = node.querySelector('[data-ce-specimen-copy]'), sizeOutput = node.querySelector('[data-ce-specimen-size-output]'), weightOutput = node.querySelector('[data-ce-specimen-weight-output]');
        const buttons = [...node.querySelectorAll('[data-ce-specimen-style]')];
        const initial = {size:size.value, weight:weight.value, style:copy.getAttribute('style'), sizeOutput:sizeOutput.textContent, weightOutput:weightOutput.textContent, pressed:buttons.map(button => button.getAttribute('aria-pressed'))};
        scope.on(size, 'input', () => { copy.style.setProperty('--ce-specimen-size', size.value + 'px'); sizeOutput.textContent = size.value; });
        scope.on(weight, 'input', () => { copy.style.setProperty('--ce-specimen-weight', weight.value); weightOutput.textContent = weight.value; });
        buttons.forEach(button => scope.on(button, 'click', () => {
          buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
          copy.style.setProperty('--ce-specimen-style', button.dataset.ceSpecimenStyle);
        }));
        scope.cleanup(() => {
          size.value = initial.size; weight.value = initial.weight;
          sizeOutput.textContent = initial.sizeOutput; weightOutput.textContent = initial.weightOutput;
          if (initial.style === null) copy.removeAttribute('style'); else copy.setAttribute('style', initial.style);
          buttons.forEach((button, index) => { if (initial.pressed[index] === null) button.removeAttribute('aria-pressed'); else button.setAttribute('aria-pressed', initial.pressed[index]); });
        });
        return scope.dispose;
      }
      if (p.variant === 'search') {
        const scope = H.scope(), doc = node.ownerDocument;
        const query = node.querySelector('[data-ce-search-query]'), clear = node.querySelector('[data-ce-search-clear]'), result = node.querySelector('[data-ce-search-result]'), copy = node.querySelector('[data-ce-search-copy]');
        const update = () => {
          const value = query.value.trim().slice(0, 120);
          clear.disabled = !query.value;
          if (!value) { copy.textContent = p.text; result.textContent = '검색어를 입력하면 일치하는 구절을 표시합니다.'; return; }
          const pattern = literalPattern(value, 'giu'), parts = [];
          let match, end = 0, count = 0;
          while ((match = pattern.exec(p.text))) {
            parts.push(doc.createTextNode(p.text.slice(end, match.index)));
            const mark = doc.createElement('mark');
            mark.textContent = match[0]; parts.push(mark);
            end = match.index + match[0].length; count++;
          }
          parts.push(doc.createTextNode(p.text.slice(end)));
          copy.replaceChildren(...parts);
          result.textContent = count ? count + '곳 일치' : '일치하는 구절이 없습니다.';
        };
        scope.on(query, 'input', event => { if (!event.isComposing) update(); });
        scope.on(query, 'compositionend', update);
        scope.on(clear, 'click', () => { query.value = ''; query.focus(); update(); });
        scope.cleanup(() => { query.value = ''; update(); });
        update();
        return scope.dispose;
      }
      const button = node.querySelector('[data-ce-text-play]');
      if (!button) return;
      const win = node.ownerDocument.defaultView, scope = H.scope(), preference = win.matchMedia('(prefers-reduced-motion: reduce)');
      const shell = node.querySelector('.ce-text-emphasis'), copy = node.querySelector('.ce-emphasis-copy');
      let animations = [];
      const stop = () => { shell.dataset.ceTextPlaying = 'false'; animations.forEach(animation => animation.cancel()); animations = []; };
      scope.on(button, 'click', () => {
        stop();
        const status = node.querySelector('[data-ce-text-status]');
        if (preference.matches) { status.textContent = '움직임 줄이기 설정에 따라 문장을 정적으로 표시합니다.'; return; }
        if (p.variant === 'lift') {
          // Flush the cancelled CSS animation before starting a new, finite replay.
          copy.getAnimations?.();
          shell.dataset.ceTextPlaying = 'true';
          animations = copy.getAnimations?.() || [];
          status.textContent = '전체 글 묶음을 한 번 강조합니다.';
          return;
        }
        const lines = [...node.querySelectorAll('[data-ce-text-line]')].slice(0, 12);
        if (!lines[0]?.animate) { status.textContent = '현재 환경에서는 문장을 정적으로 표시합니다.'; return; }
        animations = lines.map((line, index) => line.animate([{ opacity: .55, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, delay: index * 110, easing: 'ease-out', iterations: 1 }));
        status.textContent = '문장의 행을 순서대로 한 번 강조합니다.';
      });
      scope.on(copy, 'animationend', stop);
      scope.on(preference, 'change', event => { if (event.matches) stop(); });
      scope.cleanup(stop);
      return scope.dispose;
    }
  };

  const scrollStory = {
    id: 'scroll-story', name: '스크롤로 읽는 단계', category: 'scroll',
    description: '내부 읽기 창 또는 일반 문서 흐름에서 현재 읽는 단계와 목차를 확인합니다. 본문은 계속 남으며 사건의 시간이나 작업 완료율이 아닙니다.',
    keywords: ['scroll', 'sticky', 'progress', 'steps', 'diptych', 'Hallmark', '스크롤', '단계', '목차', '질문과 본문', '기준 설명', '나란히 읽기', '긴 글'],
    source: source('Native CVA · Animate.css / Hallmark MIT', 'https://github.com/animate-css/animate.css/blob/4aa415199dd4ed7d877d10343e745e8bbb4b7a0c/source/fading_entrances/fadeInUp.css', '자체 native 링크와 읽는 위치 계산. reveal은 MIT keyframe 적응. diptych는 https://github.com/Nutlope/hallmark/blob/65b5e4090ed95ee3dc2ff7db55b69aef8c5ff7b5/skills/hallmark/references/scroll-choreography.md 의 5:7 grid/sticky 구조를 기존 문서 흐름에 적응하며 좁은 화면에서는 정적으로 이어 읽음.'),
    variants: variants([['sticky', '목차와 본문 나란히'], ['progress', '진행선과 긴 본문'], ['steps', '이전·다음 단계'], ['document', '페이지에서 이어 읽기'], ['tracing', '읽는 위치의 보조선'], ['reveal', '문서의 선택형 진입 강조'], ['diptych', '고정한 질문과 이어 읽는 본문']]),
    controls: [...common, field('steps', '단계 · 제목 | 본문, 한 줄에 하나', 'textarea', { hint: '8단계 이내로 작성합니다. 본문은 항상 HTML에 보존됩니다.' }), field('motion', '문서 보조선·진입 강조 움직임 켜기', 'checkbox', { variants:['tracing','reveal'], hint: 'tracing·reveal에서 지원되는 CSS 스크롤 모션만 켭니다. 본문과 현재 단계는 모션 없이도 읽을 수 있습니다.' })],
    defaults: { variant: 'sticky', title: '자료에서 장면으로', body: '본문을 스크롤하거나 단계 이름을 선택하세요.', steps: '원자료 읽기 | 같은 장면의 실제 설명과 출처를 읽습니다. 아직 판단하지 않은 부분을 구분합니다.\n관계 살펴보기 | 앞뒤 장면과 같은 사건의 갈래를 살펴봅니다. 화면의 간격은 사건의 시간을 뜻하지 않습니다.\n내 문장으로 정리 | 확인한 내용과 남은 질문을 구분해 적습니다. 다시 원자료로 돌아갈 수 있게 출처를 보존합니다.', motion: false },
    validate(p) { validateRows(p.steps, 8, '단계', 2); },
    render(p, context) {
      const steps = rows(p.steps), scroller = H.id(context, 'story-scroll'), documentFlow = ['document', 'tracing', 'reveal', 'diptych'].includes(p.variant);
      const motionControl = ['tracing', 'reveal'].includes(p.variant) ? '<div class="ce-scroll-motion-control"><button class="ce-button secondary" type="button" data-ce-story-motion aria-pressed="false"' + (steps.length ? '' : ' disabled') + '>스크롤 강조 켜기</button><p class="ce-status" data-ce-story-motion-status role="status" aria-live="polite">' + (steps.length ? '정적 강조 · 본문과 읽는 위치는 그대로입니다.' : '단계 내용을 입력하면 스크롤 강조를 사용할 수 있습니다.') + '</p></div>' : '';
      return (p.variant === 'diptych' ? '' : head(p)) + '<div class="ce-scroll-story ce-scroll-' + e(p.variant) + (documentFlow ? ' ce-scroll-document-flow' : '') + '" data-motion="false"><aside class="ce-scroll-index">' + (p.variant === 'diptych' ? '<header class="ce-diptych-intro"><p class="ce-kicker">질문과 기준</p>' + head(p) + '</header>' : '') + '<p class="ce-kicker">읽는 위치</p><nav aria-label="' + e(p.title + ' 단계') + '">' + steps.map(([title], index) => '<a href="#' + H.id(context, 'step-' + index) + '" data-ce-story-link="' + index + '"' + (index === 0 ? ' aria-current="step"' : '') + '><span>' + String(index + 1).padStart(2, '0') + '</span>' + e(title) + '</a>').join('') + '</nav><p class="ce-status" data-ce-story-status>' + (steps.length ? 1 : 0) + ' / ' + steps.length + ' 단계</p><progress class="ce-story-progress" data-ce-story-progress max="' + Math.max(1, steps.length) + '" value="' + (steps.length ? 1 : 0) + '" aria-label="현재 읽는 단계"></progress>' + (p.variant === 'steps' ? '<div class="ce-row"><button class="ce-button secondary" type="button" data-ce-story-prev aria-controls="' + scroller + '"' + (steps.length ? '' : ' disabled') + '>이전</button><button class="ce-button secondary" type="button" data-ce-story-next aria-controls="' + scroller + '"' + (steps.length ? '' : ' disabled') + '>다음</button></div>' : '') + motionControl + '</aside><div class="ce-scroll-reader" id="' + scroller + '" data-ce-story-scroll' + (documentFlow ? '' : ' tabindex="0"') + ' role="region" aria-label="' + e(p.title + ' 본문 · ' + (documentFlow ? '페이지에서 이어 읽기' : '스크롤하여 읽기')) + '"><span class="ce-scroll-meter" aria-hidden="true"></span>' + steps.map(([title, body], index) => '<section class="ce-scroll-step" id="' + H.id(context, 'step-' + index) + '" data-ce-story-step="' + index + '"' + (documentFlow ? ' tabindex="-1"' : '') + '><p class="ce-kicker">' + String(index + 1).padStart(2, '0') + '</p><h4>' + e(title) + '</h4><p>' + e(body || '') + '</p></section>').join('') + (steps.length ? '' : '<p class="ce-body">단계 내용을 입력하세요.</p>') + '</div></div>';
    },
    mount(node, p) {
      const scope = H.scope(), win = node.ownerDocument.defaultView;
      const scroller = node.querySelector('[data-ce-story-scroll]'), steps = [...node.querySelectorAll('[data-ce-story-step]')], links = [...node.querySelectorAll('[data-ce-story-link]')];
      if (!steps.length) return scope.dispose;
      let current = 0;
      const update = index => {
        current = index;
        links.forEach((link, i) => { if (i === index) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current'); });
        node.querySelector('[data-ce-story-status]').textContent = (index + 1) + ' / ' + steps.length + ' 단계 · ' + steps[index].querySelector('h4').textContent;
        node.querySelector('[data-ce-story-progress]').value = index + 1;
        const previous = node.querySelector('[data-ce-story-prev]'), next = node.querySelector('[data-ce-story-next]');
        if (previous) previous.disabled = index === 0;
        if (next) next.disabled = index === steps.length - 1;
      };
      if (['document', 'tracing', 'reveal', 'diptych'].includes(p.variant)) {
        const shell = node.querySelector('.ce-scroll-story'), preference = win.matchMedia('(prefers-reduced-motion: reduce)');
        const toggle = node.querySelector('[data-ce-story-motion]'), motionStatus = node.querySelector('[data-ce-story-motion-status]');
        const supported = win.CSS?.supports('(animation-timeline: view()) and (animation-range: entry 0% entry 100%)') === true;
        let enabled = p.motion;
        const refresh = () => {
          const readingLine = win.innerHeight * .3;
          let index = 0;
          steps.forEach((step, i) => { if (step.getBoundingClientRect().top <= readingLine) index = i; });
          const page = node.ownerDocument.scrollingElement;
          if (page && page.scrollHeight > page.clientHeight && page.scrollTop + page.clientHeight >= page.scrollHeight - 2 && steps[steps.length - 1].getBoundingClientRect().bottom <= win.innerHeight) index = steps.length - 1;
          update(index);
        };
        const motion = () => {
          const active = Boolean(toggle && supported && enabled && !preference.matches);
          shell.dataset.motion = String(active);
          if (!toggle) return;
          toggle.setAttribute('aria-pressed', String(active));
          toggle.disabled = preference.matches || !supported;
          toggle.textContent = preference.matches ? '스크롤 강조 꺼짐 · 모션 감소' : !supported ? '스크롤 강조 꺼짐 · 정적 환경' : active ? '스크롤 강조 끄기' : '스크롤 강조 켜기';
          motionStatus.textContent = preference.matches ? '움직임 줄이기 설정에 따라 정적으로 표시합니다.' : !supported ? '현재 환경에서는 정적 강조를 사용합니다.' : active ? '장식 강조만 움직입니다. 본문과 읽는 위치는 그대로입니다.' : '정적 강조 · 본문과 읽는 위치는 그대로입니다.';
        };
        if (toggle) scope.on(toggle, 'click', () => { enabled = !enabled; motion(); });
        // Native anchors keep hash, keyboard focus and history. Only observe their resulting position.
        scope.on(win, 'scroll', refresh, { capture: true, passive: true });
        scope.on(win, 'resize', refresh); scope.on(win, 'pageshow', refresh); scope.on(win, 'hashchange', refresh);
        scope.on(scroller, 'load', refresh, true); scope.on(preference, 'change', motion);
        if (win.ResizeObserver) {
          const observer = new win.ResizeObserver(refresh);
          observer.observe(scroller); steps.forEach(step => observer.observe(step));
          scope.cleanup(() => observer.disconnect());
        }
        scope.cleanup(() => { enabled = false; motion(); });
        motion(); refresh();
        return scope.dispose;
      }
      const go = index => {
        index = Math.max(0, Math.min(steps.length - 1, index));
        scroller.scrollTop += steps[index].getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        update(index);
      };
      links.forEach((link, index) => scope.on(link, 'click', event => { event.preventDefault(); go(index); }));
      const previous = node.querySelector('[data-ce-story-prev]'), next = node.querySelector('[data-ce-story-next]');
      if (previous) scope.on(previous, 'click', () => go(current - 1));
      if (next) scope.on(next, 'click', () => go(current + 1));
      if (win.IntersectionObserver) {
        const observer = new win.IntersectionObserver(() => {
          const top = scroller.getBoundingClientRect().top + scroller.clientHeight * .3;
          let index = 0;
          steps.forEach((step, i) => { if (step.getBoundingClientRect().top <= top) index = i; });
          if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) index = steps.length - 1;
          update(index);
        }, { root: scroller, threshold: [0, .25, .5, .75, 1] });
        steps.forEach(step => observer.observe(step)); scope.cleanup(() => observer.disconnect());
      }
      update(0);
      return scope.dispose;
    }
  };

  const imageCompare = {
    id: 'image-compare', name: '두 이미지 비교', category: 'sliders',
    description: '등록된 두 이미지를 가르거나 겹치고, 한 장씩 선택하거나 나란히 읽습니다. 원본 보기와 native 키보드 입력을 유지합니다.',
    keywords: ['compare', 'range', 'slider', 'image', 'toggle', 'blend', '이미지', '비교', '슬라이더', '겹침'],
    source: native('자체 range와 clip-path. Aceternity Compare의 디자인 원리만 참고하며 source는 포함하지 않음.'),
    variants: variants([['wipe', '좌우 가르기'], ['vertical', '위아래 가르기'], ['side-by-side', '나란히 읽기'], ['toggle', '한 장씩 바꿔 읽기'], ['blend', '두 이미지 겹쳐 읽기']]),
    controls: [...common, field('beforeImage', '첫 이미지', 'image'), field('afterImage', '다음 이미지', 'image'), field('beforeLabel', '첫 이미지 설명'), field('afterLabel', '다음 이미지 설명'), field('position', '첫 이미지 비중', 'number', { min: 0, max: 100, step: 1 })],
    defaults: { variant: 'wipe', title: '두 장면을 비교해서 읽기', body: '두 이미지는 서로 다른 창작 이미지이며 실제 변화의 전후를 주장하지 않습니다.', beforeImage: 'adaptive-greenhouse', afterImage: 'adaptive-coast', beforeLabel: '첫 이미지 · 온실', afterLabel: '다음 이미지 · 해안', position: 50 },
    render(p, context) {
      const before = H.image(p.beforeImage), after = H.image(p.afterImage), range = H.id(context, 'compare-position');
      if (!before || !after) return head(p) + '<p class="ce-body">비교할 등록 이미지 두 개를 선택하세요.</p>';
      if (p.variant === 'side-by-side') return head(p) + '<div class="ce-compare-pair">' + assetFigure(p.beforeImage, p.beforeLabel) + assetFigure(p.afterImage, p.afterLabel) + '</div>';
      const originals = '<details class="ce-compare-originals ce-compare-originals-full"><summary>원본 두 이미지를 나란히 읽기</summary><div class="ce-compare-pair">' + assetFigure(p.beforeImage, p.beforeLabel) + assetFigure(p.afterImage, p.afterLabel) + '</div></details>';
      if (p.variant === 'toggle') return head(p) + '<div class="ce-row" role="group" aria-label="표시할 이미지">' + [p.beforeLabel, p.afterLabel].map((label, index) => '<button class="ce-button secondary" type="button" data-ce-compare-image="' + index + '" aria-pressed="' + (index === 0) + '" aria-controls="' + H.id(context, 'compare-image-' + index) + '">' + e(label) + '</button>').join('') + '</div><div class="ce-compare-toggle">' + [p.beforeImage, p.afterImage].map((image, index) => '<div id="' + H.id(context, 'compare-image-' + index) + '" data-ce-compare-panel="' + index + '"' + (index ? ' hidden' : '') + '>' + assetFigure(image, index ? p.afterLabel : p.beforeLabel) + '</div>').join('') + '</div><p class="ce-status" data-ce-compare-status role="status" aria-live="polite">현재 이미지: ' + e(p.beforeLabel) + '</p>' + originals;
      if (p.variant === 'blend') return head(p) + '<div class="ce-compare-stage ce-compare-blend" data-ce-compare-stage><img class="ce-compare-base" src="' + e(after.src) + '" alt="' + e(p.afterLabel + ' · ' + after.alt) + '"><img class="ce-compare-cover" data-ce-compare-cover src="' + e(before.src) + '" alt="' + e(p.beforeLabel + ' · ' + before.alt) + '" style="opacity:' + p.position / 100 + '"></div><div class="ce-field"><label for="' + range + '">첫 이미지 불투명도 <output data-ce-compare-value>' + p.position + '% · 다음 이미지 위에 겹침</output></label><input id="' + range + '" data-ce-compare-range type="range" min="0" max="100" step="1" value="' + p.position + '" aria-valuetext="' + e(p.beforeLabel + ' 불투명도 ' + p.position + '%') + '"></div>' + originals;
      const clip = p.variant === 'vertical' ? 'inset(0 0 ' + (100 - p.position) + '% 0)' : 'inset(0 ' + (100 - p.position) + '% 0 0)';
      return head(p) + '<div class="ce-compare-stage ce-compare-' + e(p.variant) + '" data-ce-compare-stage style="--ce-position:' + p.position + '%"><img class="ce-compare-base" src="' + e(after.src) + '" alt="' + e(p.afterLabel + ' · ' + after.alt) + '"><img class="ce-compare-cover" data-ce-compare-cover src="' + e(before.src) + '" alt="' + e(p.beforeLabel + ' · ' + before.alt) + '" style="clip-path:' + clip + '"><span class="ce-compare-divider" aria-hidden="true"></span><div class="ce-compare-labels" aria-hidden="true"><span>' + e(p.beforeLabel) + '</span><span>' + e(p.afterLabel) + '</span></div></div><div class="ce-field"><label for="' + range + '">첫 이미지 표시 비중 <output data-ce-compare-value>' + p.position + '%</output></label><input id="' + range + '" data-ce-compare-range type="range" min="0" max="100" step="1" value="' + p.position + '"></div><details class="ce-compare-originals"><summary>원본 두 이미지를 나란히 읽기</summary><div class="ce-compare-pair">' + assetFigure(p.beforeImage, p.beforeLabel) + assetFigure(p.afterImage, p.afterLabel) + '</div></details>';
    },
    mount(node, p) {
      if (p.variant === 'toggle') {
        const scope = H.scope(), buttons = [...node.querySelectorAll('[data-ce-compare-image]')], panels = [...node.querySelectorAll('[data-ce-compare-panel]')];
        buttons.forEach(button => scope.on(button, 'click', () => {
          buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          panels.forEach(panel => { panel.hidden = panel.dataset.ceComparePanel !== button.dataset.ceCompareImage; });
          node.querySelector('[data-ce-compare-status]').textContent = '현재 이미지: ' + (button.dataset.ceCompareImage === '0' ? p.beforeLabel : p.afterLabel);
        }));
        return scope.dispose;
      }
      const range = node.querySelector('[data-ce-compare-range]');
      if (!range) return;
      const scope = H.scope();
      scope.on(range, 'input', () => {
        const value = Number(range.value);
        if (p.variant === 'blend') {
          node.querySelector('[data-ce-compare-cover]').style.opacity = String(value / 100);
          node.querySelector('[data-ce-compare-value]').textContent = value + '% · 다음 이미지 위에 겹침';
          range.setAttribute('aria-valuetext', p.beforeLabel + ' 불투명도 ' + value + '%');
          return;
        }
        node.querySelector('[data-ce-compare-stage]').style.setProperty('--ce-position', value + '%');
        node.querySelector('[data-ce-compare-cover]').style.clipPath = p.variant === 'vertical' ? 'inset(0 0 ' + (100 - value) + '% 0)' : 'inset(0 ' + (100 - value) + '% 0 0)';
        node.querySelector('[data-ce-compare-value]').textContent = value + '%';
      });
      return scope.dispose;
    }
  };

  const sequencePosition = (index, count) => count === 1 ? 50 : 3 + index / (count - 1) * 94;
  function dataSequence(p, context, data, valueLabel) {
    const names = [p.firstName, p.secondName];
    const noteId = H.id(context, 'sequence-note'), readoutId = H.id(context, 'sequence-readout');
    const note = '<p class="ce-status" id="' + noteId + '">가로 간격은 입력 순서의 등간격이며 날짜·시간 간격을 추정하지 않습니다. 직선은 이웃한 기록만 잇고 미기록에서 끊습니다.</p>';
    if (!data.length) return '<figure class="ce-data-sequence"><figcaption>' + note + '</figcaption><p class="ce-body">비교할 항목과 값을 입력하세요.</p></figure>';
    const values = data.flatMap(row => row.values.filter(value => value !== null));
    const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values);
    // Scale before subtraction to keep the shared axis finite for opposite numeric extremes.
    const magnitude = Math.max(1, ...values.map(value => Math.abs(value)));
    const start = minimum / magnitude, span = maximum / magnitude - start;
    const y = value => span === 0 ? 50 : 4 + (1 - (value / magnitude - start) / span) * 92;
    const tickLabel = value => value && (Math.abs(value) >= 1e6 || Math.abs(value) < .001) ? value.toExponential(2) : new Intl.NumberFormat('ko-KR', {maximumSignificantDigits:4}).format(value);
    const ticks = [...new Set([maximum, 0, minimum])];
    const lines = [0, 1].map(series => {
      const runs = [], current = [];
      for (let index = 0; index < data.length; index++) {
        const value = data[index].values[series];
        if (value === null) { if (current.length > 1) runs.push(current.join(' ')); current.length = 0; }
        else current.push(sequencePosition(index, data.length) + ',' + y(value));
      }
      if (current.length > 1) runs.push(current.join(' '));
      return runs.map(points => '<polyline class="ce-sequence-line" data-ce-sequence-series="' + series + '" points="' + points + '" vector-effect="non-scaling-stroke"></polyline>').join('');
    }).join('');
    const markers = data.map((row, index) => row.values.map((value, series) => value === null ? '' : '<span class="ce-sequence-point" data-ce-sequence-index="' + index + '" data-ce-sequence-series="' + series + '" data-selected="' + (index === 0) + '" style="left:' + sequencePosition(index, data.length) + '%;top:' + y(value) + '%"></span>').join('')).join('');
    const legend = '<div class="ce-sequence-legend">' + names.map((name, series) => '<span><i data-ce-sequence-series="' + series + '" aria-hidden="true"></i>' + e(name) + '</span>').join('') + '</div>';
    const chart = '<div class="ce-sequence-chart" aria-hidden="true"><div class="ce-sequence-axis">' + ticks.map(value => '<span style="top:' + y(value) + '%">' + e(tickLabel(value)) + '</span>').join('') + '</div><div class="ce-sequence-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">' + ticks.map(value => '<line class="ce-sequence-grid' + (value === 0 ? ' ce-sequence-zero' : '') + '" x1="0" x2="100" y1="' + y(value) + '" y2="' + y(value) + '" vector-effect="non-scaling-stroke"></line>').join('') + lines + '</svg><span class="ce-sequence-guide" data-ce-sequence-guide style="left:' + sequencePosition(0, data.length) + '%"></span>' + markers + '</div><div class="ce-sequence-order">' + data.map((row, index) => '<span style="left:' + sequencePosition(index, data.length) + '%">' + (index + 1) + '</span>').join('') + '</div></div>';
    const first = data[0];
    const readout = '<div class="ce-sequence-readout" id="' + readoutId + '" role="status" aria-live="polite" aria-atomic="true"><div><span class="ce-sequence-count" data-ce-sequence-count>1 / ' + data.length + '</span><strong data-ce-sequence-label>' + e(first.label || '항목 1') + '</strong></div><dl>' + names.map((name, series) => '<div><dt>' + e(name) + '</dt><dd data-ce-sequence-value="' + series + '">' + e(valueLabel(first.values[series])) + '</dd></div>').join('') + '</dl></div>';
    const choices = '<div class="ce-sequence-picker" role="group" aria-label="관측 항목 선택" aria-describedby="' + noteId + '"><ol>' + data.map((row, index) => '<li><button type="button" class="ce-sequence-choice" data-ce-sequence-choice="' + index + '" aria-pressed="' + (index === 0) + '" aria-controls="' + readoutId + '"><span aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><span>' + e(row.label || '항목 ' + (index + 1)) + '</span></button></li>').join('') + '</ol></div>';
    return '<figure class="ce-data-sequence"><figcaption>' + legend + '<p class="ce-sequence-unit">공통 세로축' + (p.unit ? ' · ' + e(p.unit) : '') + '</p></figcaption>' + (values.length ? '' : '<p class="ce-body">모든 항목이 미기록입니다. 선을 그리지 않습니다.</p>') + chart + readout + choices + note + '</figure>';
  }

  const dataInspector = {
    id: 'data-inspector', name: '수치와 원자료 함께 읽기', category: 'data',
    description: '실제 값을 막대·차이·정렬·기준값·순서·표로 읽습니다. 0과 미기록을 구분하고 같은 단위·출처와 원자료 순서를 유지합니다.',
    keywords: ['chart', 'data', 'bar', 'table', 'series', 'delta', 'ranked', 'threshold', 'dot-plot', 'sequence', '데이터', '수치', '비교', '표', '정렬', '기준값', '공통 축', '두 관측값', '음수', '점 비교', '입력 순서', '선 그래프', '추이', '미기록'],
    source: native('자체 native controls/table와 실제 입력값의 CSS 막대·SVG 직선. 외부 chart engine을 복제하지 않음.'),
    variants: variants([['bars', '계열 하나의 값'], ['compare', '두 계열 나란히'], ['table', '원자료 표 중심'], ['delta', 'B − A 차이 읽기'], ['ranked', '선택 계열 순서 비교'], ['threshold', '기준값 이상·미만 구분'], ['dot-plot', '공통 축의 두 관측값'], ['sequence', '입력 순서의 두 계열 추이']]),
    controls: [...common, field('data', '자료 · 항목 | 계열 A | 계열 B · 빈 값은 미기록', 'textarea', { hint: '12행 이내의 유한한 수치입니다. dot-plot·sequence는 음수도 받으며 다른 변형은 0 이상입니다. sequence의 가로 간격은 입력 순서이며 날짜 간격을 추정하지 않습니다. 빈 값만 미기록입니다.' }), field('firstName', '계열 A 이름'), field('secondName', '계열 B 이름'), field('unit', '공통 단위'), field('citation', '출처·조건'), field('threshold', '비교 기준값', 'number', { min: 0, step: 'any', variants:['threshold'], hint: '기준값 변형에서 사용합니다. 0 이상의 유한한 소수도 입력할 수 있습니다.' })],
    defaults: { variant: 'bars', title: '같은 단위로 확인하기', body: '창작 기록 예시입니다. 빈 값은 0으로 바꾸지 않습니다.', data: '월요일 | 0 | 6\n화요일 | 8 | 10\n수요일 | 12 | \n목요일 | 4 | 7', firstName: '첫 기록', secondName: '다음 기록', unit: '권', citation: 'CVA 창작 예시 · 실제 관측 자료가 아닙니다.', threshold: 8 },
    validate(p) {
      const data = validateRows(p.data, 12, '자료', 3);
      for (const [index, row] of data.entries()) {
        if (row.slice(1).some(value => value !== '' && (!Number.isFinite(Number(value)) || (!['dot-plot', 'sequence'].includes(p.variant) && Number(value) < 0)))) throw new Error('자료 ' + (index + 1) + '행: 빈 값 또는 ' + (['dot-plot', 'sequence'].includes(p.variant) ? '' : '0 이상의 ') + '유한한 수치를 사용하세요.');
      }
    },
    render(p, context) {
      const data = rows(p.data, 12).map(([label, a, b]) => ({ label, values: [a, b].map(value => value === undefined || value === '' ? null : Number.isFinite(Number(value)) && (['dot-plot', 'sequence'].includes(p.variant) || Number(value) >= 0) ? Number(value) : value) }));
      const max = Math.max(1, ...data.flatMap(row => row.values.filter(value => typeof value === 'number')));
      const valueLabel = value => value === null ? '미기록' : typeof value === 'number' ? String(value) + (p.unit ? ' ' + p.unit : '') : '지원하지 않는 값: ' + value;
      const names = [p.firstName, p.secondName], selectId = H.id(context, 'data-series');
      const chart = '<div class="ce-data-bars" data-ce-data-bars>' + data.map((row, rowIndex) => '<div class="ce-data-row" data-ce-data-row="' + rowIndex + '"><strong>' + (p.variant === 'ranked' ? '<span class="ce-data-rank" data-ce-data-rank>' + (rowIndex + 1) + '</span> ' : '') + e(row.label) + '</strong><div>' + row.values.map((value, index) => '<div class="ce-data-series" data-ce-series="' + index + '"' + (p.variant !== 'compare' && index === 1 ? ' hidden' : '') + '><span class="ce-data-name">' + e(names[index]) + '</span><div class="ce-data-track" aria-hidden="true"><span style="width:' + (typeof value === 'number' ? value / max * 100 : 0) + '%"></span></div><span class="ce-data-value">' + e(valueLabel(value)) + '</span></div>').join('') + (p.variant === 'threshold' ? '<p class="ce-data-threshold-result" data-ce-threshold-result></p>' : '') + '</div></div>').join('') + '</div>';
      const table = '<div class="ce-data-table-wrap" tabindex="0" role="region" aria-label="' + e(p.title + ' 원자료 표') + '"><table class="ce-data-table"><caption>' + e(p.title + (p.unit ? ' · 단위 ' + p.unit : '')) + '</caption><thead><tr><th scope="col">항목</th>' + names.map(name => '<th scope="col">' + e(name) + '</th>').join('') + '</tr></thead><tbody>' + data.map(row => '<tr><th scope="row">' + e(row.label) + '</th>' + row.values.map(value => '<td>' + e(valueLabel(value)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      let visual = chart;
      if (p.variant === 'sequence') visual = dataSequence(p, context, data, valueLabel);
      if (p.variant === 'dot-plot') {
        const values = data.flatMap(row => row.values.filter(value => typeof value === 'number'));
        const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values) || (minimum === 0 ? 1 : 0);
        // Normalize geometry before subtraction so opposite finite extremes cannot overflow.
        const magnitude = Math.max(1, ...values.map(value => Math.abs(value)));
        const start = minimum / magnitude, span = maximum / magnitude - start;
        const position = value => Math.max(0, Math.min(100, (value / magnitude - start) / span * 100));
        visual = '<figure class="ce-data-dot-plot"><figcaption><p class="ce-body">같은 축에서 두 관측값을 비교합니다. 세로 점선은 0이며 연결선은 같은 항목의 두 값만 잇습니다. 추세나 오차 범위가 아닙니다.</p><div class="ce-dot-legend">' + names.map((name, index) => '<span><i class="ce-dot-key" data-series="' + index + '" aria-hidden="true"></i>' + e(name) + '</span>').join('') + '</div></figcaption><div class="ce-dot-axis"><span>' + e(valueLabel(minimum)) + '</span><span>' + e(valueLabel(maximum)) + '</span></div>' + data.map(row => {
          const [a, b] = row.values;
          const line = a !== null && b !== null ? '<span class="ce-dot-connector" style="left:' + Math.min(position(a), position(b)) + '%;width:' + Math.abs(position(b) - position(a)) + '%"></span>' : '';
          return '<div class="ce-dot-row"><h4>' + e(row.label) + '</h4><div class="ce-dot-track" aria-hidden="true"><span class="ce-dot-zero" style="left:' + position(0) + '%"></span>' + line + row.values.map((value, index) => value === null ? '' : '<span class="ce-dot-marker" data-ce-dot-series="' + index + '" style="left:' + position(value) + '%"></span>').join('') + '</div><dl class="ce-dot-values">' + row.values.map((value, index) => '<div><dt>' + e(names[index]) + '</dt><dd>' + e(valueLabel(value)) + '</dd></div>').join('') + '</dl></div>';
        }).join('') + (data.length ? '' : '<p class="ce-body">비교할 항목과 값을 입력하세요.</p>') + '</figure>';
      }
      if (p.variant === 'delta') visual = '<p class="ce-body">B − A: ' + e(p.secondName) + '에서 ' + e(p.firstName) + '을 뺀 차이입니다. 두 값이 모두 기록된 항목만 계산합니다.</p><dl class="ce-data-deltas">' + data.map(row => {
        const [a, b] = row.values, difference = a === null || b === null ? null : (b - a) || 0;
        const number = difference === null ? '' : new Intl.NumberFormat('ko-KR', { maximumSignificantDigits: 15 }).format(difference);
        const result = difference === null ? '계산하지 않음 · 미기록 포함' : (difference > 0 ? '+' : '') + number + (p.unit ? ' ' + p.unit : '') + ' · ' + (difference > 0 ? 'B가 큼' : difference < 0 ? 'B가 작음' : '같음');
        return '<div class="ce-data-delta"><dt>' + e(row.label) + '</dt><dd><span>' + e(p.firstName + ': ' + valueLabel(a) + ' / ' + p.secondName + ': ' + valueLabel(b)) + '</span><strong data-ce-data-delta>' + e(result) + '</strong></dd></div>';
      }).join('') + '</dl>';
      const series = ['bars', 'ranked', 'threshold'].includes(p.variant) ? '<div class="ce-field"><label for="' + selectId + '">표시할 계열</label><select id="' + selectId + '" data-ce-data-select>' + names.map((name, index) => '<option value="' + index + '">' + e(name) + '</option>').join('') + '</select></div>' : '';
      const order = p.variant === 'ranked' ? '<div class="ce-field"><label for="' + H.id(context, 'data-order') + '">화면에 표시할 순서</label><select id="' + H.id(context, 'data-order') + '" data-ce-data-order><option value="descending">큰 값부터</option><option value="ascending">작은 값부터</option><option value="original">원래 입력 순서</option></select></div><p class="ce-status" data-ce-data-order-status role="status" aria-live="polite"></p>' : '';
      const threshold = p.variant === 'threshold' ? '<div class="ce-field"><label for="' + H.id(context, 'data-threshold') + '">비교 기준값' + (p.unit ? ' · ' + e(p.unit) : '') + '</label><input id="' + H.id(context, 'data-threshold') + '" type="number" min="0" step="any" value="' + p.threshold + '" data-ce-data-threshold aria-describedby="' + H.id(context, 'threshold-error') + '"><p class="ce-status" id="' + H.id(context, 'threshold-error') + '" data-ce-threshold-error aria-live="polite"></p></div><p class="ce-status" data-ce-threshold-status role="status" aria-live="polite"></p>' : '';
      return head(p) + series + order + threshold + (p.variant === 'table' ? table : visual + '<details class="ce-data-original"><summary>전체 원자료 표 · 입력 순서 유지</summary>' + table + '</details>') + '<p class="ce-status">' + e(p.citation) + '</p>';
    },
    mount(node, p) {
      if (p.variant === 'sequence') {
        const choices = [...node.querySelectorAll('[data-ce-sequence-choice]')];
        if (!choices.length) return;
        const scope = H.scope(), data = rows(p.data, 12);
        const markers = [...node.querySelectorAll('[data-ce-sequence-index]')];
        const values = [...node.querySelectorAll('[data-ce-sequence-value]')];
        const selectObservation = index => {
          const row = data[index];
          choices.forEach((choice, current) => choice.setAttribute('aria-pressed', String(current === index)));
          markers.forEach(marker => marker.dataset.selected = String(Number(marker.dataset.ceSequenceIndex) === index));
          node.querySelector('[data-ce-sequence-guide]').style.left = sequencePosition(index, data.length) + '%';
          node.querySelector('[data-ce-sequence-count]').textContent = (index + 1) + ' / ' + data.length;
          node.querySelector('[data-ce-sequence-label]').textContent = row[0] || '항목 ' + (index + 1);
          values.forEach((output, series) => output.textContent = row[series + 1] === undefined || row[series + 1] === '' ? '미기록' : String(Number(row[series + 1])) + (p.unit ? ' ' + p.unit : ''));
        };
        choices.forEach((choice, index) => {
          scope.on(choice, 'click', () => selectObservation(index));
          scope.on(choice, 'keydown', event => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : event.key === 'ArrowRight' ? Math.min(index + 1, choices.length - 1) : event.key === 'ArrowLeft' ? Math.max(index - 1, 0) : -1;
            if (next === -1) return;
            event.preventDefault(); choices[next].focus(); selectObservation(next);
          });
        });
        return scope.dispose;
      }
      const select = node.querySelector('[data-ce-data-select]');
      if (!select) return;
      const scope = H.scope();
      const data = rows(p.data, 12).map(([, a, b]) => [a, b].map(value => value === undefined || value === '' ? null : Number(value)));
      const items = [...node.querySelectorAll('[data-ce-data-row]')], order = node.querySelector('[data-ce-data-order]'), input = node.querySelector('[data-ce-data-threshold]');
      let threshold = p.threshold;
      const update = () => {
        node.querySelectorAll('[data-ce-series]').forEach(series => { series.hidden = series.dataset.ceSeries !== select.value; });
        const selected = Number(select.value);
        if (order) {
          const sorted = items.slice();
          if (order.value !== 'original') sorted.sort((left, right) => {
            const a = data[Number(left.dataset.ceDataRow)][selected], b = data[Number(right.dataset.ceDataRow)][selected];
            if (a === null && b !== null) return 1;
            if (b === null && a !== null) return -1;
            return (a === null ? 0 : order.value === 'ascending' ? a - b : b - a) || Number(left.dataset.ceDataRow) - Number(right.dataset.ceDataRow);
          });
          sorted.forEach((item, index) => { item.querySelector('[data-ce-data-rank]').textContent = String(index + 1); node.querySelector('[data-ce-data-bars]').append(item); });
          node.querySelector('[data-ce-data-order-status]').textContent = (selected ? p.secondName : p.firstName) + ' · ' + order.selectedOptions[0].textContent + '. 같은 값은 입력 순서를 유지하며 미기록은 정렬 시 마지막에 둡니다. 원자료는 바뀌지 않습니다.';
        }
        if (input) {
          let above = 0, below = 0, missing = 0;
          items.forEach(item => {
            const value = data[Number(item.dataset.ceDataRow)][selected], result = item.querySelector('[data-ce-threshold-result]');
            if (value === null) { missing++; result.textContent = '미기록 · 분류하지 않음'; result.dataset.comparison = 'missing'; }
            else { const meets = value >= threshold; if (meets) above++; else below++; result.textContent = meets ? '기준 이상' : '기준 미만'; result.dataset.comparison = meets ? 'above' : 'below'; }
          });
          node.querySelector('[data-ce-threshold-status]').textContent = (selected ? p.secondName : p.firstName) + ' · 기준 ' + threshold + (p.unit ? ' ' + p.unit : '') + ': 이상 ' + above + '개 / 미만 ' + below + '개 / 미기록 ' + missing + '개';
        }
      };
      scope.on(select, 'change', update);
      if (order) scope.on(order, 'change', update);
      if (input) scope.on(input, 'input', () => {
        const value = input.valueAsNumber, error = node.querySelector('[data-ce-threshold-error]');
        if (input.value === '' || !input.validity.valid || !Number.isFinite(value) || value < 0) {
          input.setAttribute('aria-invalid', 'true'); error.textContent = '0 이상의 유한한 수를 입력하세요. 마지막 유효 기준 ' + threshold + (p.unit ? ' ' + p.unit : '') + '의 결과를 유지합니다.'; return;
        }
        threshold = value; input.removeAttribute('aria-invalid'); error.textContent = ''; update();
      });
      update();
      return scope.dispose;
    }
  };

  const sectionGrid = {
    id: 'section-grid', name: '내용에 맞는 섹션 그리드', category: 'layout',
    description: '동등한 특징, 대표 내용과 보조 내용, 검색과 분류로 좁히는 자료를 실제 문장과 이미지로 조립합니다.',
    keywords: ['grid', 'bento', 'feature', 'section', 'blocks', 'layout', 'grouped', 'search', 'filter', 'index', '그리드', '블록', '섹션', '분류', '자료 검색', '조건 해제', '번호 목록', '자료 색인', '순서대로 읽기'],
    source: source('HyperUI · Mark Mead · MIT', 'https://github.com/markmead/hyperui/blob/252efcfe39161db6e67cd877da001ee248d2bbf6/public/examples/marketing/feature-grids/1.html', 'MIT feature-grids/1.html의 heading/grid, /2.html의 소개 열+내용 목록과 application/grids/3.html의 2:1 span 구조를 scoped native CSS로 변환. SVG·placeholder·preview script는 미포함.'),
    variants: variants([['features', '동등한 세 열'], ['asymmetric', '대표 항목과 보조 항목'], ['bento', '내용을 묶는 벤토'], ['grouped', '분류 제목과 내용 묶음'], ['searchable', '제목과 설명으로 자료 찾기'], ['filtered', '검색과 분류로 자료 좁히기'], ['index', '번호가 있는 자료 읽기 목록']]),
    controls: [...common, field('items', '내용 · 제목 | 설명, 한 줄에 하나', 'textarea', { hint: '12개 이내로 작성합니다. 항목의 높이는 본문 길이를 따릅니다.' }), field('image', '대표 이미지 · 선택 사항', 'image'), field('groups', '항목별 분류 이름 · 한 줄에 하나', 'textarea', { variants:['grouped','filtered'], hint: '분류 묶음·검색과 분류 변형에서 사용합니다. 내용과 같은 행 순서이며 빈 줄·생략한 행은 분류 없음으로 묶습니다.' })],
    defaults: { variant: 'features', title: '하나의 자료, 서로 다른 역할', body: '제목과 설명의 길이가 달라도 필요한 본문을 자르지 않습니다.', items: '장면 읽기 | 선택한 장면의 설명과 앞뒤 맥락을 함께 읽습니다.\n관계 살펴보기 | 같은 사건의 갈래와 서로 다른 조건을 구분합니다.\n근거로 돌아가기 | 원자료와 작성한 해석을 구분하고 다시 원문으로 이동합니다.\n다시 수정하기 | 같은 입력의 문장과 구도를 바꾼 뒤 다시 열어 확인합니다.', image: 'adaptive-coast', groups: '' },
    validate(p) {
      const items = validateRows(p.items, 12, '내용', 2);
      if (['grouped', 'filtered'].includes(p.variant) && p.groups.split(/\r?\n/).slice(items.length).some(line => line.trim())) throw new Error('분류는 작성한 내용의 행 수 안에서 입력하세요.');
    },
    render(p, context) {
      if (p.variant === 'index') {
        const items = rows(p.items, 12);
        return '<section class="ce-section-grid ce-grid-index">' + head(p) + '<ol class="ce-grid-index-list">' + items.map(([title, body], index) => '<li><span class="ce-grid-index-number" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><div><h4>' + e(title) + '</h4><p>' + e(body || '') + '</p>' + (index === 0 && p.image ? H.media(p.image, {caption:'등록된 창작 이미지 · 실제 근거가 아닙니다.'}) : '') + '</div></li>').join('') + '</ol>' + (items.length ? '' : '<p class="ce-body">순서대로 읽을 자료를 입력하세요.</p>') + '</section>';
      }
      if (p.variant === 'searchable') {
        const items = rows(p.items, 12), id = H.id(context, 'search-grid');
        return '<section class="ce-section-grid ce-grid-searchable">' + head(p) + searchTools(context, '자료에서 찾기', id, 'grid') + '<div class="ce-grid-items" id="' + id + '">' + items.map(([title, body], index) => '<article class="ce-grid-item" data-ce-search-item>' + (index === 0 && p.image ? H.media(p.image, { caption: '등록된 창작 이미지 · 실제 근거가 아닙니다.' }) : '') + '<span class="ce-kicker">' + String(index + 1).padStart(2, '0') + '</span><h4>' + e(title) + '</h4><p>' + e(body || '') + '</p></article>').join('') + '</div><p class="ce-body ce-search-empty" data-ce-search-empty' + (items.length ? ' hidden' : '') + '>아직 찾을 자료가 없습니다.</p></section>';
      }
      if (p.variant === 'filtered') {
        const items = rows(p.items, 12), labels = p.groups.split(/\r?\n/);
        const groups = items.map((_, index) => labels[index]?.trim() || '분류 없음'), names = [...new Set(groups)];
        const id = H.id(context, 'filter-grid'), queryId = H.id(context, 'filter-query'), groupId = H.id(context, 'filter-group'), statusId = H.id(context, 'filter-status');
        const filters = '<div class="ce-grid-filters"><label class="ce-field" for="' + queryId + '"><span>제목과 설명에서 찾기</span><input id="' + queryId + '" data-ce-search-query type="search" maxlength="120" autocomplete="off" placeholder="찾을 단어나 문장" aria-controls="' + id + '" aria-describedby="' + statusId + '"></label><label class="ce-field" for="' + groupId + '"><span>자료 분류</span><select id="' + groupId + '" data-ce-grid-group aria-controls="' + id + '" aria-describedby="' + statusId + '"><option value="">모든 분류</option>' + names.map((name, index) => '<option value="' + index + '">' + e(name) + '</option>').join('') + '</select></label><button class="ce-button secondary" type="button" data-ce-grid-reset disabled>전체 해제</button></div>';
        const state = '<div class="ce-grid-filter-state"><p class="ce-status ce-search-result" id="' + statusId + '" data-ce-search-result role="status" aria-live="polite" aria-atomic="true"></p><div class="ce-grid-active-filters"><button class="ce-button secondary" type="button" data-ce-search-clear hidden>검색 해제</button><button class="ce-button secondary" type="button" data-ce-grid-group-clear hidden>분류 해제</button></div></div>';
        return '<section class="ce-section-grid ce-grid-filtered">' + head(p) + filters + state + '<div class="ce-grid-items" id="' + id + '">' + items.map(([title, body], index) => '<article class="ce-grid-item" data-ce-search-item>' + (index === 0 && p.image ? H.media(p.image, { caption: '등록된 창작 이미지 · 실제 근거가 아닙니다.' }) : '') + '<div class="ce-grid-item-meta"><span class="ce-kicker">' + String(index + 1).padStart(2, '0') + '</span><span class="ce-grid-group-label">' + e(groups[index]) + '</span></div><h4>' + e(title) + '</h4><p>' + e(body || '') + '</p></article>').join('') + '</div><p class="ce-body ce-search-empty" data-ce-search-empty' + (items.length ? ' hidden' : '') + '>아직 찾을 자료가 없습니다.</p></section>';
      }
      if (p.variant === 'grouped') {
        const groups = new Map(), labels = p.groups.split(/\r?\n/);
        rows(p.items, 12).forEach(([title, body], index) => {
          const label = labels[index]?.trim() || '분류 없음';
          if (!groups.has(label)) groups.set(label, []);
          groups.get(label).push({ title, body, index });
        });
        return '<section class="ce-section-grid ce-grid-grouped">' + head(p) + '<div class="ce-grid-groups">' + [...groups].map(([label, items], groupIndex) => '<section class="ce-grid-group" aria-labelledby="' + H.id(context, 'grid-group-' + groupIndex) + '"><header><h4 id="' + H.id(context, 'grid-group-' + groupIndex) + '">' + e(label) + '</h4><p class="ce-kicker">' + items.length + '개 항목</p></header><div class="ce-grid-group-items">' + items.map(item => '<article class="ce-grid-item">' + (item.index === 0 && p.image ? H.media(p.image, { caption: '등록된 창작 이미지 · 실제 근거가 아닙니다.' }) : '') + '<span class="ce-kicker">' + String(item.index + 1).padStart(2, '0') + '</span><div><h5>' + e(item.title) + '</h5><p>' + e(item.body || '') + '</p></div></article>').join('') + '</div></section>').join('') + (groups.size ? '' : '<p class="ce-body">묶어 읽을 내용을 입력하세요.</p>') + '</div></section>';
      }
      return '<section class="ce-section-grid ce-grid-' + e(p.variant) + '">' + head(p) + '<div class="ce-grid-items">' + rows(p.items, 12).map(([title, body], index) => '<article class="ce-grid-item">' + (index === 0 && p.image ? H.media(p.image, { caption: '등록된 창작 이미지 · 실제 근거가 아닙니다.' }) : '') + '<span class="ce-kicker">' + String(index + 1).padStart(2, '0') + '</span><h4>' + e(title) + '</h4><p>' + e(body || '') + '</p></article>').join('') + '</div></section>';
    },
    mount(node, p) {
      if (!['searchable', 'filtered'].includes(p.variant)) return;
      const scope = H.scope(), query = node.querySelector('[data-ce-search-query]'), clear = node.querySelector('[data-ce-search-clear]'), result = node.querySelector('[data-ce-search-result]'), empty = node.querySelector('[data-ce-search-empty]');
      const items = [...node.querySelectorAll('[data-ce-search-item]')], texts = rows(p.items, 12).map(([title, body]) => title + '\n' + (body || ''));
      const select = node.querySelector('[data-ce-grid-group]'), groupClear = node.querySelector('[data-ce-grid-group-clear]'), reset = node.querySelector('[data-ce-grid-reset]');
      const labels = p.groups.split(/\r?\n/), groups = items.map((_, index) => labels[index]?.trim() || '분류 없음'), names = [...new Set(groups)];
      const update = () => {
        const value = query.value.trim().slice(0, 120), pattern = value ? literalPattern(value) : null;
        const selected = select && select.value !== '' ? names[Number(select.value)] : null;
        let count = 0;
        items.forEach((item, index) => { item.hidden = Boolean((pattern && !pattern.test(texts[index])) || (selected !== null && groups[index] !== selected)); if (!item.hidden) count++; });
        clear.disabled = !query.value;
        if (select) {
          clear.hidden = !value;
          clear.textContent = value ? '검색: ' + value + ' · 해제' : '검색 해제';
          groupClear.hidden = selected === null;
          groupClear.textContent = selected === null ? '분류 해제' : '분류: ' + selected + ' · 해제';
          reset.disabled = !query.value && selected === null;
          result.textContent = count + ' / ' + items.length + '개 자료' + (!value && selected === null ? ' · 모든 자료를 보고 있습니다.' : '');
        } else result.textContent = value ? count + ' / ' + items.length + '개 자료' : items.length + '개 자료';
        empty.hidden = count > 0;
        empty.textContent = items.length ? (select ? '조건에 맞는 자료가 없습니다. 검색어나 분류를 바꾸거나 전체 해제를 선택하세요.' : '일치하는 자료가 없습니다.') : '아직 찾을 자료가 없습니다.';
      };
      scope.on(query, 'input', event => { if (!event.isComposing) update(); });
      scope.on(query, 'compositionend', update);
      scope.on(clear, 'click', () => { query.value = ''; query.focus(); update(); });
      if (select) {
        scope.on(select, 'change', update);
        scope.on(groupClear, 'click', () => { select.value = ''; select.focus(); update(); });
        scope.on(reset, 'click', () => { query.value = ''; select.value = ''; query.focus(); update(); });
      }
      scope.cleanup(() => { query.value = ''; if (select) select.value = ''; update(); });
      update();
      return scope.dispose;
    }
  };

  const backgroundEffect = {
    id: 'background-effect', name: '본문 뒤의 조용한 효과', category: 'effects',
    description: '내용을 가리지 않는 선·점·빛의 배경입니다. 연속 움직임은 직접 켤 때만 동작하며 정적 배경이 기본입니다.',
    keywords: ['background', 'effect', 'grid', 'dots', 'spotlight', 'aurora', 'halo', 'prism', 'contour', '등고선', '배경', '효과'],
    source: native('CSS gradient와 명시적 motion opt-in을 사용하는 자체 구현. Aceternity는 디자인 원리만 참고.'),
    variants: variants([['grid', '선으로 만든 공간'], ['dots', '점의 리듬'], ['spotlight', '빛의 중심'], ['aurora', '가장자리를 흐르는 빛'], ['halo', '고리로 감싼 공간'], ['prism', '비스듬히 겹친 색면'], ['contour', '차분한 등고선']]),
    controls: [...common, field('note', '보조 설명'), field('motion', '처음부터 움직임 켜기', 'checkbox', { variants: ['grid', 'dots', 'spotlight', 'aurora', 'halo', 'prism'] })],
    defaults: { variant: 'grid', title: '핵심 내용은 선명하게', body: '배경보다 문장과 다음에 읽을 내용이 먼저 보입니다.', note: '배경은 의미나 수치를 나타내지 않는 장식입니다.', motion: false },
    render(p) {
      if (p.variant === 'contour') return '<div class="ce-background ce-background-contour"><div class="ce-background-art" aria-hidden="true"></div><div class="ce-background-copy">' + head(p) + '<p class="ce-status">' + e(p.note) + '</p></div></div>';
      return '<div class="ce-background ce-background-' + e(p.variant) + '"><div class="ce-background-art" aria-hidden="true"></div><div class="ce-background-copy">' + head(p) + '<p class="ce-status">' + e(p.note) + '</p><button class="ce-button secondary" data-ce-background-toggle type="button" aria-pressed="false">배경 움직임 켜기</button><p class="ce-status" data-ce-background-status role="status" aria-live="polite">정적 배경</p></div></div>';
    },
    mount(node, p) {
      if (p.variant === 'contour') return;
      const scope = H.scope(), win = node.ownerDocument.defaultView, preference = win.matchMedia('(prefers-reduced-motion: reduce)');
      const shell = node.querySelector('.ce-background'), button = node.querySelector('[data-ce-background-toggle]'), status = node.querySelector('[data-ce-background-status]');
      let enabled = p.motion;
      const update = () => {
        const active = enabled && !preference.matches;
        shell.dataset.motion = String(active); button.setAttribute('aria-pressed', String(active));
        button.textContent = active ? '배경 움직임 끄기' : '배경 움직임 켜기';
        status.textContent = preference.matches ? '움직임 줄이기 설정에 따라 정적 배경을 유지합니다.' : active ? '장식 배경만 천천히 움직입니다.' : '정적 배경';
      };
      scope.on(button, 'click', () => { enabled = !enabled; update(); }); scope.on(preference, 'change', update);
      scope.cleanup(() => { shell.dataset.motion = 'false'; }); update();
      return scope.dispose;
    }
  };

  const pointerAffordance = {
    id: 'pointer-affordance', name: '영역 안의 포인터 반응', category: 'pointer', lab: true,
    description: '기본 커서를 보존하는 선택형 장식입니다. 정밀 포인터·모션 허용에서만 움직이고 키보드 초점에는 고정 강조를 제공합니다.',
    keywords: ['cursor', 'pointer', 'spotlight', 'link', 'labs', '포인터', '커서', '실험', '링크'],
    source: native('영역 내부 Pointer Events/CSS만 사용하는 자체 실험. 시스템 cursor를 숨기거나 전역 포인터를 추적하지 않음.'),
    variants: variants([['spotlight', '영역의 빛'], ['ring', '위치 링'], ['crosshair', '위치 가이드'], ['link', '실제 링크와 별도 장식']]),
    controls: [...common, field('actionLabel', '버튼·링크 문구'), field('url', '실제 링크 목적지 · 링크 변형만 사용', 'text', { hint: '페이지에 존재하는 #ID, 상대 .html 또는 로그인 정보 없는 http(s). 비우면 이동 링크를 만들지 않습니다.' })],
    defaults: { variant: 'spotlight', title: '포인터의 반응을 살펴보세요', body: '먼저 반응을 켠 뒤 아래 영역에서 포인터를 움직이거나 버튼에 키보드 초점을 주세요.', actionLabel: '이 자리 강조', url: '' },
    validate(p) { if (p.variant === 'link' && p.url) H.href(p.url); },
    render(p) {
      if (p.variant === 'link') return head(p) + '<div class="ce-row"><button class="ce-button secondary" type="button" data-ce-pointer-toggle aria-pressed="false">포인터 반응 켜기</button><span class="ce-status" data-ce-pointer-status role="status">정적 상태 · 기본 커서 유지</span></div><div class="ce-pointer-zone ce-pointer-link" data-ce-pointer-zone><span class="ce-pointer-art" aria-hidden="true"></span><p class="ce-kicker">실제 목적지로 이동</p><p>장식의 켜짐과 관계없이 링크는 키보드·터치로 이동합니다.</p>' + (p.url ? '<a class="ce-button" href="' + e(H.href(p.url)) + '">' + e(p.actionLabel) + '</a><p class="ce-status">목적지: ' + e(p.url) + '</p>' : '<p class="ce-status">페이지에 실제 목적지를 입력하면 이동 링크가 표시됩니다.</p>') + '</div>';
      return head(p) + '<div class="ce-row"><button class="ce-button secondary" type="button" data-ce-pointer-toggle aria-pressed="false">포인터 반응 켜기</button><span class="ce-status" data-ce-pointer-status role="status">정적 상태 · 기본 커서 유지</span></div><div class="ce-pointer-zone ce-pointer-' + e(p.variant) + '" data-ce-pointer-zone><span class="ce-pointer-art" aria-hidden="true"></span><p class="ce-kicker">POINTER LAB</p><h4>읽는 내용은 움직이지 않습니다.</h4><p>이 장식은 선택 상태나 실제 좌표 측정을 나타내지 않습니다.</p><button class="ce-button" data-ce-pointer-action type="button">' + e(p.actionLabel) + '</button></div>';
    },
    mount(node) {
      const scope = H.scope(), win = node.ownerDocument.defaultView, preference = win.matchMedia('(prefers-reduced-motion: reduce)'), fine = win.matchMedia('(hover: hover) and (pointer: fine)');
      const zone = node.querySelector('[data-ce-pointer-zone]'), toggle = node.querySelector('[data-ce-pointer-toggle]'), status = node.querySelector('[data-ce-pointer-status]');
      let enabled = false;
      const allowed = () => enabled && !preference.matches && fine.matches;
      const reset = () => { zone.style.setProperty('--ce-pointer-x', '50%'); zone.style.setProperty('--ce-pointer-y', '50%'); zone.dataset.pointerActive = 'false'; };
      const update = () => {
        toggle.setAttribute('aria-pressed', String(enabled)); toggle.textContent = enabled ? '포인터 반응 끄기' : '포인터 반응 켜기';
        status.textContent = !enabled ? '정적 상태 · 기본 커서 유지' : allowed() ? '이 영역에서만 반응합니다.' : '현재 입력·모션 설정에서는 정적 초점 강조를 사용합니다.';
        reset();
      };
      scope.on(toggle, 'click', () => { enabled = !enabled; update(); });
      scope.on(zone, 'pointermove', event => {
        if (!allowed() || event.pointerType === 'touch') return;
        const rect = zone.getBoundingClientRect();
        zone.style.setProperty('--ce-pointer-x', Math.max(0, Math.min(rect.width, event.clientX - rect.left)) + 'px');
        zone.style.setProperty('--ce-pointer-y', Math.max(0, Math.min(rect.height, event.clientY - rect.top)) + 'px');
        zone.dataset.pointerActive = 'true';
      });
      scope.on(zone, 'pointerleave', reset); scope.on(zone, 'focusin', reset);
      const practice = node.querySelector('[data-ce-pointer-action]');
      if (practice) scope.on(practice, 'click', () => { status.textContent = '현재 영역의 강조를 확인했습니다. 저장 작업은 실행하지 않습니다.'; });
      scope.on(preference, 'change', update); scope.on(fine, 'change', update); scope.cleanup(reset);
      update(); return scope.dispose;
    }
  };

  const depthSurface = {
    id: 'depth-surface', name: '깊이로 살펴보는 카드', category: 'interaction', lab: true,
    description: '정면 카드에서 시작해 얕은 기울기·앞뒤 내용·층의 역할을 명시적으로 살펴봅니다. 실제 3D 모델이나 공간 측정이 아닙니다.',
    keywords: ['3d', 'tilt', 'flip', 'layers', 'inspect', 'labs', '입체', '기울기', '실험', '층 상세'],
    source: native('native button과 CSS perspective의 자체 구현. Aceternity 3D의 원리만 참고하며 기존 Elio 보드/Three engine을 재구현하지 않음.'),
    variants: variants([['tilt', '정면과 얕은 기울기'], ['flip', '앞면과 설명'], ['layers', '세 층의 역할'], ['inspect', '선택한 층의 상세 읽기']]),
    controls: [...common, field('detail', '뒤쪽·상세 설명', 'textarea'), field('image', '대표 이미지', 'image'), field('layers', '층의 이름 · 한 줄에 하나', 'textarea', { hint: '개념 층 3개 이내. 상세 읽기 변형은 이름 | 해당 층 설명을 입력할 수 있습니다. 실제 거리나 크기를 나타내지 않습니다.' })],
    defaults: { variant: 'tilt', title: '한 장면을 여러 깊이로', body: '정면에서 읽은 뒤 필요한 만큼만 움직여 보세요.', detail: '카드의 앞뒤는 같은 자료의 다른 설명입니다. 원래 사건이나 관계를 바꾸지 않습니다.', image: 'adaptive-coast', layers: '원자료\n맥락과 관계\n작성한 설명' },
    validate(p) { validateRows(p.layers, 3, '층', p.variant === 'inspect' ? 2 : undefined); },
    render(p, context) {
      if (p.variant === 'inspect') {
        const layers = rows(p.layers, 3), detailId = H.id(context, 'depth-detail');
        return '<div class="ce-depth-surface ce-depth-inspect">' + head(p) + (p.image ? '<div class="ce-depth-inspect-image">' + H.media(p.image) + '</div>' : '') + '<div class="ce-depth-inspect-layout"><ol class="ce-depth-inspect-list" aria-label="상세를 읽을 개념 층">' + layers.map(([label], index) => '<li><button class="ce-button secondary" type="button" data-ce-depth-inspect="' + index + '" aria-pressed="' + (index === 0) + '" aria-controls="' + detailId + '"><span>' + (index + 1) + '</span> ' + e(label) + '</button></li>').join('') + '</ol><div class="ce-depth-inspect-detail" id="' + detailId + '">' + layers.map(([label, description], index) => '<section data-ce-depth-detail="' + index + '"' + (index ? ' hidden' : '') + '><p class="ce-kicker">선택한 개념 층 · ' + (index + 1) + '</p><h4>' + e(label) + '</h4><p>' + e(description || '이 층의 개별 설명은 아직 작성하지 않았습니다.') + '</p></section>').join('') + (layers.length ? '' : '<p class="ce-body">상세를 살펴볼 층의 이름과 설명을 입력하세요.</p>') + '</div></div><p class="ce-body">' + e(p.detail) + '</p><p class="ce-status" data-ce-depth-status role="status" aria-live="polite">' + (layers.length ? '현재 층: ' + e(layers[0][0]) : '선택할 층이 없습니다.') + ' · 개념별 설명이며 실제 3D 모델이 아닙니다.</p></div>';
      }
      const card = '<div class="ce-depth-card" data-ce-depth-card><div class="ce-depth-front" data-ce-depth-front>' + (p.image ? H.media(p.image) : '') + '<h4>' + e(p.title) + '</h4><p>' + e(p.body) + '</p></div>' + (p.variant === 'flip' ? '<div class="ce-depth-back" data-ce-depth-back hidden><p class="ce-kicker">같은 자료의 상세</p><h4>' + e(p.title) + '</h4><p>' + e(p.detail) + '</p></div>' : '') + '</div>';
      let controls;
      if (p.variant === 'flip') controls = '<button class="ce-button secondary" data-ce-depth-flip type="button" aria-pressed="false">뒤 설명 읽기</button>';
      else if (p.variant === 'layers') controls = '<button class="ce-button secondary" data-ce-depth-layers type="button" aria-pressed="false">층을 벌려 보기</button>';
      else controls = '<button class="ce-button secondary" data-ce-depth-toggle type="button" aria-pressed="false">기울기 반응 켜기</button><button class="ce-button secondary" data-ce-depth-left type="button">왼쪽에서 보기</button><button class="ce-button secondary" data-ce-depth-right type="button">오른쪽에서 보기</button><button class="ce-button secondary" data-ce-depth-reset type="button">정면</button>';
      return '<div class="ce-depth-surface ce-depth-' + e(p.variant) + '"><div class="ce-depth-stage" data-ce-depth-stage>' + (p.variant === 'layers' ? '<ol class="ce-depth-layers" data-ce-depth-layer-list>' + H.lines(p.layers, 3).map((label, index) => '<li style="--ce-layer:' + index + '"><span>' + (index + 1) + '</span><strong>' + e(label) + '</strong></li>').join('') + '</ol>' : card) + '</div><div class="ce-row">' + controls + '</div><p class="ce-status" data-ce-depth-status role="status" aria-live="polite">정적 정면 · 개념을 설명하는 장식입니다.</p>' + (p.variant === 'layers' ? '<h3 class="ce-title">' + e(p.title) + '</h3><p class="ce-body">' + e(p.body) + '</p><p class="ce-body">' + e(p.detail) + '</p>' : '') + '</div>';
    },
    mount(node, p) {
      if (p.variant === 'inspect') {
        const scope = H.scope(), buttons = [...node.querySelectorAll('[data-ce-depth-inspect]')], panels = [...node.querySelectorAll('[data-ce-depth-detail]')];
        buttons.forEach(button => scope.on(button, 'click', () => {
          buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          panels.forEach(panel => { panel.hidden = panel.dataset.ceDepthDetail !== button.dataset.ceDepthInspect; });
          node.querySelector('[data-ce-depth-status]').textContent = '현재 층: ' + rows(p.layers, 3)[Number(button.dataset.ceDepthInspect)][0] + ' · 설명만 선택했으며 원자료는 바뀌지 않습니다.';
        }));
        return scope.dispose;
      }
      const scope = H.scope(), win = node.ownerDocument.defaultView, preference = win.matchMedia('(prefers-reduced-motion: reduce)'), fine = win.matchMedia('(hover: hover) and (pointer: fine)');
      const stage = node.querySelector('[data-ce-depth-stage]'), card = node.querySelector('[data-ce-depth-card]'), status = node.querySelector('[data-ce-depth-status]');
      let enabled = false;
      const reset = () => { if (card) { card.style.setProperty('--ce-depth-x', '0deg'); card.style.setProperty('--ce-depth-y', '0deg'); } };
      if (p.variant === 'flip') {
        const button = node.querySelector('[data-ce-depth-flip]'), front = node.querySelector('[data-ce-depth-front]'), back = node.querySelector('[data-ce-depth-back]');
        scope.on(button, 'click', () => {
          enabled = !enabled; front.hidden = enabled; back.hidden = !enabled; button.setAttribute('aria-pressed', String(enabled)); button.textContent = enabled ? '앞면으로 돌아가기' : '뒤 설명 읽기';
          status.textContent = enabled ? '같은 자료의 상세 설명' : '앞면으로 돌아왔습니다.';
          if (!preference.matches && card.animate) card.animate([{ transform: 'perspective(900px) rotateY(-8deg)', opacity: .65 }, { transform: 'perspective(900px) rotateY(0)', opacity: 1 }], { duration: 240, easing: 'ease-out' });
        });
      } else if (p.variant === 'layers') {
        const button = node.querySelector('[data-ce-depth-layers]'), layers = node.querySelector('[data-ce-depth-layer-list]');
        scope.on(button, 'click', () => { enabled = !enabled; layers.dataset.expanded = String(enabled); button.setAttribute('aria-pressed', String(enabled)); button.textContent = enabled ? '층을 모아 보기' : '층을 벌려 보기'; status.textContent = enabled ? '번호와 같은 층의 역할을 읽습니다. 실제 거리의 척도가 아닙니다.' : '층을 모았습니다. 모든 이름은 계속 읽을 수 있습니다.'; });
        scope.cleanup(() => { layers.dataset.expanded = 'false'; });
      } else {
        const button = node.querySelector('[data-ce-depth-toggle]');
        const update = () => { reset(); button.setAttribute('aria-pressed', String(enabled)); button.textContent = enabled ? '기울기 반응 끄기' : '기울기 반응 켜기'; status.textContent = enabled && !preference.matches && fine.matches ? '포인터로 최대 5도 이내의 기울기를 확인하세요.' : '정적 정면 · 버튼으로도 시점을 선택할 수 있습니다.'; };
        scope.on(button, 'click', () => { enabled = !enabled; update(); });
        scope.on(stage, 'pointermove', event => {
          if (!enabled || preference.matches || !fine.matches || event.pointerType === 'touch') return;
          const rect = stage.getBoundingClientRect();
          card.style.setProperty('--ce-depth-x', Math.max(-5, Math.min(5, (event.clientY - rect.top) / rect.height * -10 + 5)) + 'deg');
          card.style.setProperty('--ce-depth-y', Math.max(-5, Math.min(5, (event.clientX - rect.left) / rect.width * 10 - 5)) + 'deg');
        });
        scope.on(stage, 'pointerleave', reset);
        for (const [selector, angle] of [['[data-ce-depth-left]', -5], ['[data-ce-depth-right]', 5]]) scope.on(node.querySelector(selector), 'click', () => { reset(); card.style.setProperty('--ce-depth-y', (preference.matches ? 0 : angle) + 'deg'); status.textContent = preference.matches ? '모션 감소 설정으로 정면을 유지합니다.' : angle < 0 ? '왼쪽 시점 · 5도' : '오른쪽 시점 · 5도'; });
        scope.on(node.querySelector('[data-ce-depth-reset]'), 'click', () => { reset(); status.textContent = '정면으로 돌아왔습니다.'; });
        scope.on(preference, 'change', update); scope.on(fine, 'change', update);
      }
      scope.on(preference, 'change', event => { if (event.matches && card?.getAnimations) card.getAnimations().forEach(animation => animation.cancel()); });
      scope.cleanup(() => { reset(); if (card?.getAnimations) card.getAnimations().forEach(animation => animation.cancel()); });
      return scope.dispose;
    }
  };

  global.CVA_ELEMENTS_EFFECTS = [textEmphasis, scrollStory, imageCompare, dataInspector, sectionGrid, backgroundEffect, pointerAffordance, depthSurface];
})(typeof window !== 'undefined' ? window : globalThis);
