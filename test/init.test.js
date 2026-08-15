'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const init = require('../lib/init');
const { makeTempDir, removeTempDir } = require('./helpers');

function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function(entry) {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? allFiles(file) : [file];
  });
}

test('init normalizes names, preserves meaningful hyphens, and renders one template', function(t) {
  const cwd = makeTempDir('glplugin-init-');
  t.after(function() { removeTempDir(cwd); });

  const result = init('  Foo--BAR plugin!  ', { cwd });
  assert.equal(result.slug, 'foo-bar-plugin');
  assert.equal(result.viewId, 'foo-bar-plugin');

  const pkg = JSON.parse(fs.readFileSync(path.join(result.dir, 'package.json'), 'utf8'));
  const menu = JSON.parse(fs.readFileSync(path.join(result.dir, 'menu.json'), 'utf8'));
  assert.equal(pkg.pluginName, 'foo-bar-plugin');
  assert.deepEqual(pkg.glPlugin, {
    architecture: 'all',
    depends: ['libc', 'gl-sdk4-ui-core'],
    section: 'base',
  });
  assert.equal(menu.view, 'foo-bar-plugin');
  assert.deepEqual(menu.title, { translate: 'foo-bar-plugin.title' });
  assert.ok(fs.existsSync(path.join(result.dir, '.gitignore')));
  assert.ok(fs.existsSync(
    path.join(result.dir, 'i18n', 'gl-sdk4-ui-foo-bar-plugin.en.json')
  ));

  const rendered = allFiles(result.dir).map(function(file) {
    return fs.readFileSync(file, 'utf8');
  }).join('\n');
  assert.doesNotMatch(rendered, /__[A-Z_]+__/);
});

test('init rejects empty and conflicting names with controlled errors', function(t) {
  const cwd = makeTempDir('glplugin-init-errors-');
  t.after(function() { removeTempDir(cwd); });

  assert.throws(function() { init('---', { cwd }); }, /at least one letter or number/);
  init('existing', { cwd });
  assert.throws(function() { init('existing', { cwd }); }, /already exists/);

  const hyphenated = init('foo-bar', { cwd });
  const compact = init('foobar', { cwd });
  assert.notEqual(hyphenated.viewId, compact.viewId);
});
