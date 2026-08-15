'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const init = require('../lib/init');
const { readPluginProject } = require('../lib/manifest');
const { makeTempDir, removeTempDir } = require('./helpers');

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

test('manifest is authoritative and rejects profile/path typos', function(t) {
  const cwd = makeTempDir('glplugin-manifest-');
  t.after(function() { removeTempDir(cwd); });
  const project = init('manifest-fixture', { cwd });
  const manifestFile = path.join(project.dir, 'gl-plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));

  manifest.packge = {};
  writeJson(manifestFile, manifest);
  assert.throws(() => readPluginProject(project.dir), /Unknown manifest field: packge/);

  delete manifest.packge;
  manifest.profile = 'full-stack';
  manifest.overlay = '../outside';
  writeJson(manifestFile, manifest);
  assert.throws(() => readPluginProject(project.dir), /must stay inside the plugin project/);

  manifest.overlay = '.';
  writeJson(manifestFile, manifest);
  assert.throws(() => readPluginProject(project.dir), /must stay inside the plugin project/);

  manifest.profile = 'ui-only';
  manifest.overlay = 'overlay';
  writeJson(manifestFile, manifest);
  assert.throws(() => readPluginProject(project.dir), /only supported by the full-stack profile/);

  delete manifest.overlay;
  delete manifest.package.conffiles;
  manifest.package.architecture = 64;
  writeJson(manifestFile, manifest);
  assert.throws(() => readPluginProject(project.dir), /"package\.architecture" must be a string/);
});

test('legacy package.json projects remain readable without a manifest', function(t) {
  const cwd = makeTempDir('glplugin-legacy-');
  t.after(function() { removeTempDir(cwd); });
  writeJson(path.join(cwd, 'package.json'), {
    name: 'legacy-fixture',
    version: '1.0.0',
    pluginName: 'legacy-fixture',
    glPlugin: {
      architecture: 'mipsel_24kc',
      depends: ['libc', 'gl-sdk4-ui-core', 'legacy-backend'],
    },
  });

  const project = readPluginProject(cwd);
  assert.equal(project.legacy, true);
  assert.equal(project.manifest.id, 'legacy-fixture');
  assert.equal(project.manifest.profile, 'ui-only');
  assert.equal(project.manifest.package.architecture, 'mipsel_24kc');
  assert.deepEqual(
    project.manifest.package.depends,
    ['libc', 'gl-sdk4-ui-core', 'legacy-backend']
  );
});

test('a package directory without manifest or legacy ID is not a plugin project', function(t) {
  const cwd = makeTempDir('glplugin-not-project-');
  t.after(function() { removeTempDir(cwd); });
  writeJson(path.join(cwd, 'package.json'), { name: 'ordinary-package' });
  assert.throws(() => readPluginProject(cwd), /No gl-plugin\.json found/);
});
