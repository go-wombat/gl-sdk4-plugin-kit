'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');
const build = require('../lib/build');
const init = require('../lib/init');
const packagePlugin = require('../lib/package');
const { extractTarGz, makeTempDir, removeTempDir } = require('./helpers');

const repositoryRoot = path.resolve(__dirname, '..');

test('bundle wrapper returns CommonJS exports to the router eval loader', function() {
  const source = build.wrapBundleForEval('module.exports = { name: "fixture" };');
  const result = vm.runInNewContext(source);
  assert.equal(result.name, 'fixture');
});

test('generated plugin builds and packages with the official SDK4 layout', function(t) {
  const cwd = makeTempDir('glplugin-e2e-');
  t.after(function() { removeTempDir(cwd); });

  const project = init('package-fixture', { cwd });
  fs.symlinkSync(path.join(repositoryRoot, 'node_modules'), path.join(project.dir, 'node_modules'));
  fs.writeFileSync(path.join(project.dir, 'i18n', 'README.txt'), 'not package data\n');
  fs.mkdirSync(path.join(project.dir, 'i18n', 'nested'));

  const buildResult = build({ cwd: project.dir });
  assert.ok(fs.existsSync(buildResult.gzFile));

  const packageResult = packagePlugin({ cwd: project.dir });
  assert.equal(packageResult.architecture, 'all');
  assert.ok(fs.existsSync(packageResult.ipkFile));

  const outer = path.join(cwd, 'outer');
  const control = path.join(cwd, 'control');
  const data = path.join(cwd, 'data');
  extractTarGz(packageResult.ipkFile, outer);
  extractTarGz(path.join(outer, 'control.tar.gz'), control);
  extractTarGz(path.join(outer, 'data.tar.gz'), data);

  assert.equal(fs.readFileSync(path.join(outer, 'debian-binary'), 'utf8'), '2.0\n');
  assert.ok(fs.existsSync(path.join(data, 'www', 'views', 'gl-sdk4-ui-package-fixture.common.js.gz')));
  assert.ok(fs.existsSync(path.join(data, 'usr', 'share', 'oui', 'menu.d', 'package-fixture.json')));
  assert.ok(fs.existsSync(path.join(data, 'www', 'i18n', 'gl-sdk4-ui-package-fixture.en.json')));
  assert.ok(!fs.existsSync(path.join(data, 'www', 'i18n', 'README.txt')));
  assert.ok(!fs.existsSync(path.join(control, 'conffiles')));

  const metadata = fs.readFileSync(path.join(control, 'control'), 'utf8');
  assert.match(metadata, /^Package: gl-sdk4-ui-package-fixture$/m);
  assert.match(metadata, /^Depends: libc, gl-sdk4-ui-core$/m);
  assert.match(metadata, /^Architecture: all$/m);
  assert.match(metadata, /^Installed-Size: [1-9][0-9]*$/m);
  assert.match(metadata, /^SourceName: gl-sdk4-ui-package-fixture$/m);
  assert.match(fs.readFileSync(path.join(control, 'postinst'), 'utf8'), /default_postinst/);
  assert.match(fs.readFileSync(path.join(control, 'prerm'), 'utf8'), /default_prerm/);

  const pkgFile = path.join(project.dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  pkg.glPlugin.architecture = 'aarch64_cortex-a53';
  pkg.glPlugin.depends.push('gl-sdk4-fixture-backend');
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');

  const configuredPackage = packagePlugin({ cwd: project.dir });
  assert.match(configuredPackage.ipkFile, /_aarch64_cortex-a53\.ipk$/);
  const configuredOuter = path.join(cwd, 'configured-outer');
  const configuredControl = path.join(cwd, 'configured-control');
  extractTarGz(configuredPackage.ipkFile, configuredOuter);
  extractTarGz(path.join(configuredOuter, 'control.tar.gz'), configuredControl);
  const configuredMetadata = fs.readFileSync(path.join(configuredControl, 'control'), 'utf8');
  assert.match(
    configuredMetadata,
    /^Depends: libc, gl-sdk4-ui-core, gl-sdk4-fixture-backend$/m
  );
  assert.match(configuredMetadata, /^Architecture: aarch64_cortex-a53$/m);
});
