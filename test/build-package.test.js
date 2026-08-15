'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');
const build = require('../lib/build');
const init = require('../lib/init');
const { inspectPackage } = require('../lib/inspect');
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
  assert.equal(packageResult.profile, 'ui-only');
  assert.ok(fs.existsSync(packageResult.ipkFile));

  const inspection = inspectPackage(packageResult.ipkFile);
  assert.equal(inspection.ok, true);
  assert.equal(inspection.metadata.Package, 'gl-sdk4-ui-package-fixture');
  assert.equal(inspection.metadata.Architecture, 'all');
  assert.deepEqual(inspection.summary.viewFiles, [
    'www/views/gl-sdk4-ui-package-fixture.common.js.gz',
  ]);
  assert.deepEqual(inspection.summary.menuFiles, [
    'usr/share/oui/menu.d/package-fixture.json',
  ]);

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

  const manifestFile = path.join(project.dir, 'gl-plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.package.architecture = 'aarch64_cortex-a53';
  manifest.package.depends.push('gl-sdk4-fixture-backend');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

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

test('full-stack package preserves overlay, conffiles, and OpenWrt lifecycle dispatch', function(t) {
  const cwd = makeTempDir('glplugin-full-stack-');
  t.after(function() { removeTempDir(cwd); });

  const project = init('full-stack-fixture', { cwd, profile: 'full-stack' });
  fs.symlinkSync(path.join(repositoryRoot, 'node_modules'), path.join(project.dir, 'node_modules'));
  build({ cwd: project.dir });

  const packageResult = packagePlugin({ cwd: project.dir });
  assert.equal(packageResult.profile, 'full-stack');

  const outer = path.join(cwd, 'outer');
  const control = path.join(cwd, 'control');
  const data = path.join(cwd, 'data');
  extractTarGz(packageResult.ipkFile, outer);
  extractTarGz(path.join(outer, 'control.tar.gz'), control);
  extractTarGz(path.join(outer, 'data.tar.gz'), data);

  const backend = path.join(
    data, 'usr', 'libexec', 'full-stack-fixture', 'example-backend'
  );
  assert.ok(fs.existsSync(path.join(data, 'etc', 'config', 'full-stack-fixture')));
  assert.ok(fs.statSync(backend).mode & 0o100);
  assert.match(fs.readFileSync(backend, 'utf8'), /"status":"ok"/);
  assert.equal(
    fs.readFileSync(path.join(control, 'conffiles'), 'utf8'),
    '/etc/config/full-stack-fixture\n'
  );
  assert.match(fs.readFileSync(path.join(control, 'postinst'), 'utf8'), /default_postinst/);
  assert.match(fs.readFileSync(path.join(control, 'prerm'), 'utf8'), /default_prerm/);
  assert.match(fs.readFileSync(path.join(control, 'postinst-pkg'), 'utf8'), /exit 0/);
  assert.match(fs.readFileSync(path.join(control, 'prerm-pkg'), 'utf8'), /exit 0/);
  assert.ok(fs.statSync(path.join(control, 'postinst-pkg')).mode & 0o100);
  assert.ok(fs.statSync(path.join(control, 'prerm-pkg')).mode & 0o100);

  const manifestFile = path.join(project.dir, 'gl-plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  manifest.package.conffiles.push('/etc/config/not-packaged');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  assert.throws(
    () => packagePlugin({ cwd: project.dir }),
    /Conffile is not present in package data: \/etc\/config\/not-packaged/
  );

  manifest.package.conffiles.pop();
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  const collisionDir = path.join(project.dir, 'overlay', 'www', 'views');
  fs.mkdirSync(collisionDir, { recursive: true });
  const collisionFile = path.join(collisionDir, 'gl-sdk4-ui-full-stack-fixture.common.js.gz');
  fs.writeFileSync(collisionFile, 'overlay collision');
  assert.throws(
    () => packagePlugin({ cwd: project.dir }),
    /Overlay path collision: \/www\/views\/gl-sdk4-ui-full-stack-fixture/
  );
  fs.rmSync(collisionFile);

  const postinst = path.join(project.dir, 'hooks', 'postinst');
  const validPostinst = fs.readFileSync(postinst, 'utf8');
  fs.writeFileSync(postinst, '#!/bin/sh\nif broken; then\n');
  assert.throws(() => packagePlugin({ cwd: project.dir }), /sh exited with status/);
  fs.writeFileSync(postinst, validPostinst);
});
