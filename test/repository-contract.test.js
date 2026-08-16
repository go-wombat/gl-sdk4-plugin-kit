'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const build = require('../lib/build');
const { checkProject } = require('../lib/check');
const { inspectPackage } = require('../lib/inspect');
const packagePlugin = require('../lib/package');
const { makeTempDir, removeTempDir } = require('./helpers');

const root = path.resolve(__dirname, '..');

test('documented examples are complete buildable plugin projects', function(t) {
  const temporary = makeTempDir('glplugin-examples-');
  t.after(() => removeTempDir(temporary));
  for (const name of ['hello-world', 'network-info']) {
    const source = path.join(root, 'examples', name);
    for (const file of [
      '.babelrc', 'gl-plugin.json', 'menu.json', 'package.json', 'webpack.config.js',
    ]) {
      assert.equal(fs.existsSync(path.join(source, file)), true, `${name}/${file}`);
    }
    const destination = path.join(temporary, name);
    fs.cpSync(source, destination, { recursive: true });
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(destination, 'node_modules'));
    assert.equal(checkProject(destination).ok, true);
    build({ cwd: destination, log() {} });
    const packaged = packagePlugin({ cwd: destination, log() {} });
    assert.equal(inspectPackage(packaged.ipkFile).ok, true);
  }
});

test('repository documentation follows current security and API contracts', function() {
  const pkg = require('../package.json');
  const security = fs.readFileSync(path.join(root, 'SECURITY.md'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'docs', 'api.md'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(security, new RegExp(`\\| ${pkg.version.split('.').slice(0, 2).join('\\.')}\\.x \\| Yes \\|`));
  assert.doesNotMatch(api, /openssl passwd[^\n]*\$PASSWORD/);
  assert.doesNotMatch(api, /\['sid', 'system', '(?:board|info)'/);
  assert.match(api, /challenge\.alg/);
  assert.match(readme, /docs\/assets\/gl-mt3000-beryl-ax\.jpg/);
});
