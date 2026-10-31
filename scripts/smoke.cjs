'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({ URL });
context.window = context;
for (const name of ['tokens.js', 'components.js']) {
  vm.runInContext(fs.readFileSync('design/' + name, 'utf8'), context, { filename: name });
}
assert.equal(Object.keys(context.CVA_TOKENS.profiles).length, 8);
assert.equal(context.CVA_COMPONENTS.heading({ title: '<script>' }).includes('&lt;script&gt;'), true);
assert.throws(() => context.CVA_COMPONENTS.button('bad', { href: 'javascript:alert(1)' }));
assert.match(context.CVA_COMPONENTS.button('Read', { href: 'examples/story.html' }), /href="examples\/story.html"/);
console.log('ELIO_COMPONENT_API_PASS');
const full = vm.createContext({ URL, console, structuredClone });
full.window = full;
for (const name of ['catalog.js','engines.js','editorial.js','data-engines.js','story-data.js','content.js','bundle.js','assets-data.js',
  ...['tokens.js','patterns.js','components.js','elements-core.js','elements-vendor.js','elements-controls.js','elements-effects.js',
    'scene-catalog.js','modules.js','scene-renderer.js','focus.js','experience.js','help.js','forma-context.js','module-renderer.js',
    'sections.js','templates.js','exporter.js'].map(name=>'cva/'+name)]) {
  vm.runInContext(fs.readFileSync(name,'utf8'), full, { filename:name, timeout:10000 });
}
const model = full.CVA_MODULES.normalizeDocument(JSON.parse(fs.readFileSync('examples/page.cva.json','utf8')));
const json = JSON.stringify(model);
const html = full.CVA_EXPORTER.assemble(model, {css:fs.readFileSync('cva/module-styles.css','utf8'),bundleCss:full.FW_BUNDLE.css,bundleJS:full.FW_BUNDLE.js});
assert.match(html, /관측 기록의 분기와 합류/);
assert.match(html, /https:\/\/ttaem\.com/);
assert.equal(JSON.stringify(full.CVA_MODULES.normalizeDocument(JSON.parse(json))),json);
for(const item of full.CVA_TEMPLATES.entries) {
  full.CVA_RENDERER.renderDocument(full.CVA_TEMPLATES.create(item.id,'elio'));
}
assert.equal(full.ELIO_OWNED_RUNTIME.patterns.length,34);
console.log('ELIO_FULL_MODEL_EXPORT_REOPEN_PASS',full.CVA_TEMPLATES.entries.length);

async function checkBoardFileRecovery() {
  const adapter = require('../tools/elio_board/app/document-adapter.js');
  const original = JSON.parse(fs.readFileSync('examples/board.catalog.json', 'utf8'));
  const before = JSON.stringify(original), nodes = new Map(), installed = [];
  let current = original;
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', hidden: false, events: {}, classList: { toggle() {} },
      addEventListener(name, listener) { this.events[name] = listener; },
      querySelector: selector => get(selector.slice(1)), focus() {}, showModal() {}
    });
    return nodes.get(id);
  };
  const scope = vm.createContext({ window: { ElioBoardDocuments: adapter }, document: { getElementById: get } });
  vm.runInContext(fs.readFileSync('tools/elio_board/app/authoring-ui.js', 'utf8'), scope);
  scope.window.ElioBoardAuthoring.init({
    getDocument: () => current, getWork: () => ({ id: current.work_id, title: current.title }),
    getItem: () => current.items[0], installDocument: data => { current = data; installed.push(data); }
  });
  const select = file => get('document-file').events.change({ target: { files: [file] } });
  const apply = () => get('document-import-apply').events.click();

  get('document-file').value = 'unreadable.json';
  await select({ size: 100, text: async () => { throw new Error('The requested file could not be read.'); } });
  assert.equal(get('document-status').textContent, '선택한 파일을 읽지 못했습니다. 파일 위치와 접근 권한을 확인한 뒤 다시 선택해 주세요. 현재 문서는 그대로입니다.');
  assert.equal(get('document-file').value, '');
  assert.equal(get('document-review').hidden, true);
  apply();
  assert.equal(installed.length, 0);
  assert.equal(JSON.stringify(current), before, 'a failed read preserves the current document');

  const valid = { ...original, title: '다시 선택한 문서' };
  await select({ size: 100, text: async () => JSON.stringify(valid) });
  assert.equal(installed.length, 0, 'a readable file still needs explicit review and application');
  assert.equal(get('document-review').hidden, false);
  apply();
  assert.deepEqual(current, valid);

  await select({ size: 100, text: async () => JSON.stringify({ ...valid, work_id: 'INVALID ID' }) });
  assert.equal(get('document-status').textContent, '콘텐츠 ID를 확인해 주세요.', 'schema errors retain their specific message');
  assert.deepEqual(current, valid);

  let rejectOlder;
  const older = select({ size: 100, text: () => new Promise((resolve, reject) => { rejectOlder = reject; }) });
  const latest = { ...original, title: '마지막으로 고른 문서' };
  get('document-file').value = 'latest.json';
  await select({ size: 100, text: async () => JSON.stringify(latest) });
  const reviewMessage = get('document-status').textContent;
  rejectOlder(new Error('A late file read failed.'));
  await older;
  assert.equal(get('document-file').value, 'latest.json');
  assert.equal(get('document-status').textContent, reviewMessage);
  assert.equal(get('document-review').hidden, false);
  apply();
  assert.deepEqual(current, latest, 'a late failure cannot replace the newer reviewed document');
  console.log('ELIO_BOARD_FILE_READ_RECOVERY_PASS');
}

checkBoardFileRecovery().catch(error => { console.error(error); process.exitCode = 1; });
