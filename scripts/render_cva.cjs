#!/usr/bin/env node
'use strict';

// Run the shipped module, renderer and exporter APIs; JSON is never evaluated as code.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const USAGE = 'node scripts/render_cva.cjs --input page.cva.json --output new-page.html [--package-root kit]';
const ROOT_SCRIPTS = [
  'catalog.js', 'engines.js', 'editorial.js', 'data-engines.js',
  'story-data.js', 'content.js', 'bundle.js', 'assets-data.js'
];
const CVA_SCRIPTS = [
  'tokens.js', 'components.js', 'elements-core.js', 'elements-vendor.js', 'elements-controls.js', 'elements-effects.js',
  'scene-catalog.js', 'modules.js', 'focus.js', 'experience.js', 'help.js',
  'scene-renderer.js', 'forma-context.js', 'module-renderer.js', 'sections.js', 'templates.js', 'exporter.js'
];
const ELEMENT_SCRIPTS = ['components.js', 'elements-core.js', 'elements-vendor.js', 'elements-controls.js', 'elements-effects.js'];
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function options(args) {
  const result = { '--package-root': path.resolve(__dirname, '..') };

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];

    if (key === '--help' || key === '-h') {
      console.log(USAGE);
      process.exit(0);
    }

    if (!['--input', '--output', '--package-root'].includes(key)
        || index + 1 >= args.length || args[index + 1].startsWith('--')) {
      throw new Error(USAGE);
    }

    result[key] = path.resolve(args[index + 1]);
  }

  if (!result['--input'] || !result['--output']) throw new Error(USAGE);
  return result;
}

function packageFile(root, relative) {
  const candidate = path.resolve(root, relative);
  const resolved = fs.realpathSync(candidate);
  const distance = path.relative(root, resolved);

  if (distance === '..' || distance.startsWith('..' + path.sep) || path.isAbsolute(distance)
      || !fs.statSync(resolved).isFile()) {
    throw new Error('Asset is outside this package: ' + relative);
  }

  return resolved;
}

function dataURL(root, relative) {
  const mime = MIME[path.extname(relative).toLowerCase()];
  if (!mime) throw new Error('Unsupported packaged asset: ' + relative);
  return 'data:' + mime + ';base64,' + fs.readFileSync(packageFile(root, relative)).toString('base64');
}

function render(root, input) {
  const context = vm.createContext({ console, URL, structuredClone });
  context.window = context;

  for (const relative of [...ROOT_SCRIPTS, ...CVA_SCRIPTS.map(name => 'cva/' + name)]) {
    const source = fs.readFileSync(packageFile(root, relative), 'utf8');
    vm.runInContext(source, context, { filename: relative, timeout: 10000 });
  }

  if (Buffer.byteLength(input, 'utf8') > context.CVA_MODULES.documentByteLimit) {
    throw new Error('CVA document exceeds its supported JSON byte limit');
  }

  context.inputJSON = input;
  const model = vm.runInContext('CVA_MODULES.normalizeDocument(JSON.parse(inputJSON))', context, { timeout: 10000 });
  context.portableModel = model;
  const markup = vm.runInContext('CVA_RENDERER.renderDocument(portableModel)', context, { timeout: 10000 });
  const assets = Object.assign({}, context.FW_ASSETS);

  for (const match of markup.matchAll(/\bsrc="([^"]+)"/g)) {
    const source = match[1];
    const key = source.replace(/^\.\.\//, '');

    if (!assets[source] && !assets[key]) {
      assets[source] = dataURL(root, path.posix.join('cva', source));
    }
  }

  const font = dataURL(root, 'cva/assets/PretendardVariable.woff2');
  const fontCSS = '@font-face{font-family:Pretendard;src:url("' + font + '") format("woff2");'
    + 'font-weight:100 900;font-style:normal;font-display:swap}';
  const css = [fontCSS, ...['cva.css', 'module-styles.css', 'scene-styles.css', 'experience.css', 'help.css', 'elements.css', 'elements-controls.css', 'elements-effects.css'].map(
    name => fs.readFileSync(packageFile(root, 'cva/' + name), 'utf8')
  )].join('\n').replace(/url\(['"]?assets\/PretendardVariable\.woff2['"]?\)/g, 'url("' + font + '")');
  context.portableOptions = {
    css, bundleCss: context.FW_BUNDLE.css, bundleJS: context.FW_BUNDLE.js, assets,
    threeJS: fs.readFileSync(packageFile(root, 'cva/vendor/three-0.186.1.min.js'), 'utf8'),
    elementsJS: model.modules.some(block => block.type === 'interface')
      ? ELEMENT_SCRIPTS.map(name => fs.readFileSync(packageFile(root, 'cva/' + name), 'utf8')).join('\n') : ''
  };

  return vm.runInContext('CVA_EXPORTER.assemble(portableModel, portableOptions)', context, { timeout: 10000 });
}

function main() {
  const args = options(process.argv.slice(2));
  const root = fs.realpathSync(args['--package-root']);
  const output = args['--output'];

  if (path.extname(output).toLowerCase() !== '.html') throw new Error('Output must use a new .html filename');
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new filename: ' + output);

  const input = fs.readFileSync(args['--input'], 'utf8').replace(/^\uFEFF/, '');
  const html = render(root, input);
  fs.writeFileSync(output, html, { encoding: 'utf8', flag: 'wx' });
  console.log('Created ' + output);
}

try {
  main();
} catch (error) {
  console.error('CVA render failed: ' + error.message);
  process.exitCode = 1;
}
