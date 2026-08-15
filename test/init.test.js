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

test('init creates a manifest-based ui-only project from one template', function(t) {
  const cwd = makeTempDir('glplugin-init-');
  t.after(function() { removeTempDir(cwd); });

  const result = init('  Foo--BAR plugin!  ', { cwd });
  assert.equal(result.slug, 'foo-bar-plugin');
  assert.equal(result.viewId, 'foo-bar-plugin');

  const pkg = JSON.parse(fs.readFileSync(path.join(result.dir, 'package.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(result.dir, 'gl-plugin.json'), 'utf8'));
  const menu = JSON.parse(fs.readFileSync(path.join(result.dir, 'menu.json'), 'utf8'));
  assert.equal(pkg.pluginName, undefined);
  assert.equal(pkg.glPlugin, undefined);
  assert.equal(manifest.id, 'foo-bar-plugin');
  assert.equal(manifest.profile, 'ui-only');
  assert.deepEqual(manifest.package, {
    name: 'gl-sdk4-ui-foo-bar-plugin',
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
  assert.equal(fs.existsSync(path.join(result.dir, 'profiles')), false);
  assert.equal(fs.existsSync(path.join(result.dir, 'overlay')), false);

  const rendered = allFiles(result.dir).map(function(file) {
    return fs.readFileSync(file, 'utf8');
  }).join('\n');
  assert.doesNotMatch(rendered, /__[A-Z_]+__/);
});

test('init creates a full-stack overlay with executable backend and lifecycle hooks', function(t) {
  const cwd = makeTempDir('glplugin-init-full-');
  t.after(function() { removeTempDir(cwd); });

  const result = init('router-tools', { cwd, profile: 'full-stack' });
  const manifest = JSON.parse(fs.readFileSync(path.join(result.dir, 'gl-plugin.json'), 'utf8'));
  const backend = path.join(
    result.dir, 'overlay', 'usr', 'libexec', 'router-tools', 'example-backend'
  );

  assert.equal(result.profile, 'full-stack');
  assert.equal(manifest.profile, 'full-stack');
  assert.equal(manifest.overlay, 'overlay');
  assert.deepEqual(manifest.package.conffiles, ['/etc/config/router-tools']);
  assert.deepEqual(manifest.lifecycle, {
    postinst: 'hooks/postinst',
    prerm: 'hooks/prerm',
  });
  assert.ok(fs.statSync(backend).mode & 0o100);
  assert.ok(fs.statSync(path.join(result.dir, 'hooks', 'postinst')).mode & 0o100);
  assert.match(fs.readFileSync(backend, 'utf8'), /"status":"ok"/);
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
  assert.throws(
    function() { init('invalid-profile', { cwd, profile: 'backend-only' }); },
    /Unsupported plugin profile/
  );
  assert.deepEqual(
    init.parseInitArgs(['cli-fixture', '--profile', 'full-stack']),
    { name: 'cli-fixture', profile: 'full-stack' }
  );
  assert.throws(
    () => init.parseInitArgs(['cli-fixture', '--unknown']),
    /Unknown init option/
  );
});
