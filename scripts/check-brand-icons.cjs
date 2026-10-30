'use strict';
// Verify the copied assets against their manifest and, optionally, a local CVA source.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const directory = 'cva/assets/brand-icons';
const manifest = JSON.parse(fs.readFileSync(path.join(root, directory, 'manifest.json'), 'utf8'));
const ids = ['cva', 'loki', 'ttaempad', 'temporal-loom', 'dayline', 'elio', 'manager-cue', 'timelink'];
const modes = ['color', 'micro', 'mono', 'reverse'];
const canonicalFlag = process.argv.indexOf('--canonical');
const canonical = canonicalFlag < 0 ? null : process.argv[canonicalFlag + 1];
assert.ok(canonicalFlag < 0 || (canonical && !canonical.startsWith('--')), '--canonical needs the CVA media/icons/v4 directory');
assert.equal(manifest.source.repository, 'ttaem00/chzz-vod-analyzer');
assert.match(manifest.source.commit, /^[0-9a-f]{40}$/);
assert.equal(manifest.source.path, 'docs/design/cva-brand-v1/media/icons/v4');
assert.deepEqual(manifest.icons.map(icon => icon.id).sort(), [...ids].sort());
const expected = [];
for (const icon of manifest.icons) {
  assert.ok(typeof icon.name === 'string' && icon.name.trim(), 'Missing icon name');
  assert.ok(typeof icon.role === 'string' && icon.role.trim(), 'Missing icon role');
  for (const mode of modes) {
    const filename = icon.id + '-' + mode + '.svg';
    const file = icon.files[mode];
    assert.equal(file.path, directory + '/v4/' + filename);
    const bytes = fs.readFileSync(path.join(root, file.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, 'Asset drift: ' + filename);
    assert.match(bytes.toString('utf8'), /viewBox="0 0 64 64"/, filename);
    if (canonical) assert.ok(bytes.equals(fs.readFileSync(path.join(canonical, filename))), 'CVA copy differs: ' + filename);
    expected.push(filename);
  }
}
assert.deepEqual(fs.readdirSync(path.join(root, directory, 'v4')).filter(name => name.endsWith('.svg')).sort(), expected.sort());
for (const [consumer, asset] of [['cva-symbol.svg', 'cva-color.svg'], ['cva-symbol-micro.svg', 'cva-micro.svg']]) {
  assert.ok(fs.readFileSync(path.join(root, 'cva/assets', consumer)).equals(fs.readFileSync(path.join(root, directory, 'v4', asset))), 'Header copy differs: ' + consumer);
}
console.log('ELIO_BRAND_ICONS_PASS', expected.length, canonical ? 'canonical bytes matched' : 'manifest hashes matched');
