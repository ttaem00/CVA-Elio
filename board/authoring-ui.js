/* Native file selection, explicit edit application, and portable canonical exports. */
(() => {
  'use strict';
  const A = window.ElioBoardDocuments;
  let dialog, trigger, options, pending, request = 0;
  const $ = id => dialog.querySelector(`#${id}`);
  const message = (text, error = false) => { $('document-status').textContent = text; $('document-status').classList.toggle('is-error', error); };

  function refresh() {
    if (!dialog) return;
    const data = options.getDocument(), row = options.getItem();
    $('document-current').textContent = `${options.getWork().title} · ${row.title}`;
    $('document-edit').hidden = !data;
    $('document-sample-note').hidden = Boolean(data);
    if (!data) return;
    $('document-work-title').maxLength = $('document-item-title').maxLength = data.schema_version === 'elio.board.v1' ? A.MAX_BYTES : 150;
    $('document-work-title').value = data.title;
    $('document-item-title').value = row.title;
    $('document-item-body').value = data.schema_version === 'elio.board.v1' ? row.summary : row.body;
    $('document-item-body').maxLength = data.schema_version === 'elio.board.v1' ? A.MAX_BYTES : 2000;
    $('document-item-label').textContent = data.schema_version === 'elio.board.v1' ? '선택한 장면 제목' : '선택한 항목 제목';
    const appearance = A.presentation(data);
    $('document-image-fit').value = appearance.image_fit;
    $('document-style').value = appearance.style;
    $('document-panel').value = appearance.panel;
    $('document-accent').value = appearance.accent;
    $('document-background-image').value = appearance.background.image;
    $('document-background-color').value = appearance.background.color;
    $('document-background-opacity').value = String(Math.round(appearance.background.opacity * 100));
  }

  function applyEdits() {
    const current = options.getDocument();
    const opacity = $('document-background-opacity').value;
    const changed = A.editDocument(current, options.getItem().id, {
      workTitle: $('document-work-title').value, title: $('document-item-title').value, body: $('document-item-body').value,
      presentation: {
        image_fit: $('document-image-fit').value,
        style: $('document-style').value, panel: $('document-panel').value, accent: $('document-accent').value.trim(),
        background: { image: $('document-background-image').value.trim(), color: $('document-background-color').value.trim(), opacity: opacity === '' ? NaN : Number(opacity) / 100 }
      }
    });
    options.installDocument(changed, false);
    refresh(); return changed;
  }

  function download(value, type, extension) {
    const url = URL.createObjectURL(new Blob([value], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = `${options.getWork().id}.${extension}`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function readAsset(name, binary = false) {
    if (binary && window.ELIO_BOARD_ASSETS?.[name]) return window.ELIO_BOARD_ASSETS[name];
    const response = await fetch(new URL(name, location.href));
    if (!response.ok) throw new Error(`내보낼 파일을 읽지 못했습니다: ${name}`);
    if (!binary) return response.text();
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
    });
  }

  function exportShell() {
    const shell = document.documentElement.cloneNode(true);
    for (const id of ['nodes', 'groups', 'connections', 'category-tabs', 'catalog-grid', 'preview', 'product-screen', 'minimap', 'stage-tabs', 'reading', 'selection-status', 'toast', 'content-picker', 'document-tools']) shell.querySelector(`#${id}`)?.replaceChildren();
    shell.querySelectorAll('dialog[open]').forEach(element => element.removeAttribute('open'));
    shell.querySelector('#reading').hidden = true; shell.querySelector('#app').removeAttribute('inert');
    shell.querySelector('title').textContent = options.getWork().title + ' · Elio Board';
    return '<!doctype html>\n' + shell.outerHTML;
  }

  function init(settings) {
    options = settings; trigger = document.getElementById('document-tools-open'); dialog = document.getElementById('document-tools');
    dialog.innerHTML = `<header><div><p>Elio Board</p><h2 id="document-tools-title">입력·편집·내보내기</h2></div><button id="document-close" type="button" aria-label="입력·편집·내보내기 닫기">×</button></header><div class="document-context"><p class="document-context-label">현재 선택</p><p id="document-current"></p></div><section class="document-import"><h3>Elio JSON 가져오기</h3><p>이야기 또는 도감 파일을 검토한 뒤 이 보드에서 엽니다.</p><label for="document-file">JSON 파일 선택</label><input id="document-file" type="file" accept=".json,application/json"><div id="document-review" hidden><p id="document-review-copy"></p><div class="document-actions"><button id="document-import-apply" type="button">이 문서 열기</button><button id="document-import-cancel" type="button">가져오기 취소</button></div></div></section><p id="document-sample-note">기본 예제는 원래 시안 그대로 읽을 수 있습니다. 직접 편집하고 저장하려면 Elio JSON을 가져오세요.</p><form id="document-edit"><h3>선택한 내용 편집</h3><label for="document-work-title">콘텐츠 제목</label><input id="document-work-title" maxlength="150" required><label id="document-item-label" for="document-item-title">선택한 장면 제목</label><input id="document-item-title" maxlength="150" required><label for="document-item-body">본문</label><textarea id="document-item-body" rows="5" maxlength="2000"></textarea><fieldset class="document-appearance"><legend>보드 표현</legend><label for="document-style">표시 스타일</label><select id="document-style"><option value="">현재 보기 유지</option><option value="atlas">밝은 지도</option><option value="tapestry">그림 중심</option><option value="depth">깊이 있는 지도</option><option value="hud">어두운 HUD</option></select><label for="document-panel">패널 효과</label><select id="document-panel"><option value="auto">보기의 기존 효과</option><option value="3d">3D 패널</option><option value="glow">빛이 반응하는 고정 패널</option><option value="flat">평면 패널 · 효과 끄기</option></select><label for="document-accent">강조 색상</label><input id="document-accent" type="text" placeholder="#245fce 또는 비워 두기" maxlength="7" autocomplete="off" spellcheck="false"><p>표시 스타일과 패널 효과는 따로 지정합니다. 밝은 지도를 유지하면서 3D 패널만 더할 수 있습니다. 비운 강조 색상은 스타일의 기본색을 사용합니다.</p><label for="document-image-fit">카드 이미지</label><select id="document-image-fit"><option value="natural">카드 이미지 전체 보기</option><option value="cover">고정 썸네일</option></select><label for="document-background-image">배경 이미지 주소</label><input id="document-background-image" type="text" placeholder="비워 두면 중립 배경" autocomplete="off" spellcheck="false"><div class="document-appearance-row"><div><label for="document-background-color">배경 색상</label><input id="document-background-color" type="text" placeholder="#10202e 또는 비워 두기" maxlength="7" autocomplete="off" spellcheck="false"></div><div><label for="document-background-opacity">배경 농도 (%)</label><input id="document-background-opacity" type="number" min="0" max="100" step="1"></div></div><p>이 콘텐츠의 모든 장면·항목에 적용되며 JSON과 독립 HTML에 함께 저장됩니다.</p></fieldset><p class="document-edit-note">ID·연결·조건·시각·출처는 원본에 그대로 남습니다.</p><div class="document-actions"><button class="primary" type="submit">보드에 변경 적용</button></div><p>현재 보드에만 적용됩니다. 다음에도 이어가려면 파일로 저장하세요.</p><section class="document-export" aria-labelledby="document-export-title"><h3 id="document-export-title">파일로 저장</h3><div class="document-actions"><button id="document-save-json" type="button">편집 파일 저장 (.json)</button><button id="document-save-html" type="button">페이지 파일 저장 (.html)</button></div><p>저장은 입력한 변경을 적용한 뒤 다운로드합니다. JSON은 다시 가져와 편집하고, HTML은 직접 열어 읽고 편집할 수 있습니다.</p></section></form><p id="document-status" role="status" aria-live="polite"></p>`;
    trigger.addEventListener('click', () => { refresh(); message(''); dialog.showModal(); });
    $('document-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('close', () => { request++; pending = undefined; $('document-review').hidden = true; $('document-file').value = ''; trigger.focus({ preventScroll: true }); });
    $('document-file').addEventListener('change', async event => {
      const ticket = ++request, file = event.target.files[0]; pending = undefined; $('document-review').hidden = true;
      if (!file) return;
      message('파일을 확인하고 있습니다…');
      try {
        if (file.size > A.MAX_BYTES) throw new Error('JSON 파일은 2MB 이하로 선택해 주세요.');
        const data = A.normalizeDocument(JSON.parse(await file.text()));
        if (ticket !== request) return;
        pending = data;
        $('document-review-copy').textContent = `${data.title} · ${data.schema_version === 'elio.board.v1' ? '이야기' : '도감'} · ${(data.events || data.items).length}개 ${data.events ? '장면' : '항목'}`;
        $('document-review').hidden = false; message('내용을 확인한 뒤 이 문서 열기를 눌러 주세요.');
      } catch (error) { if (ticket === request) message(error.message, true); }
    });
    $('document-import-cancel').addEventListener('click', () => { request++; pending = undefined; $('document-review').hidden = true; $('document-file').value = ''; message('가져오기를 취소했습니다. 현재 문서는 그대로입니다.'); });
    $('document-import-apply').addEventListener('click', () => {
      if (!pending) return;
      const data = pending; request++; pending = undefined;
      options.installDocument(data, true); $('document-review').hidden = true; $('document-file').value = ''; refresh(); message('가져온 문서를 열었습니다.');
    });
    $('document-edit').addEventListener('submit', event => { event.preventDefault(); try { applyEdits(); message('변경을 보드에 적용했습니다. 파일로 저장하면 다시 열 수 있습니다.'); } catch (error) { message(error.message, true); } });
    $('document-save-json').addEventListener('click', () => {
      try { const data = A.exportDocument(applyEdits(), options.getState()); download(JSON.stringify(data, null, 2), 'application/json;charset=utf-8', 'json'); message('편집 파일(.json) 다운로드를 시작했습니다. 현재 문서와 읽기 위치를 포함합니다.'); } catch (error) { message(error.message, true); }
    });
    $('document-save-html').addEventListener('click', async () => {
      const button = $('document-save-html'); button.disabled = true;
      try {
        const data = applyEdits(); message('현재 문서와 화면 파일을 하나로 묶고 있습니다…');
        const html = await A.standaloneHTML(data, options.getState(), { template: exportShell(), readerBase: window.ELIO_BOARD_READER_BASE || location.href, readText: name => readAsset(name), readDataURL: name => readAsset(name, true) });
        download(html, 'text/html;charset=utf-8', 'html'); message('페이지 파일(.html) 다운로드를 시작했습니다. 파일을 열어 이어서 읽고 편집할 수 있습니다.');
      } catch (error) { message(error.message, true); } finally { button.disabled = false; }
    });
    refresh();
  }
  window.ElioBoardAuthoring = { init, refresh };
})();
