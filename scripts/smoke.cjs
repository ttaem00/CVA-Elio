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
