'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const zlib = require('zlib');
const cli = require('../lib/cli');
const { checkProject } = require('../lib/check');
const dev = require('../lib/dev');
const init = require('../lib/init');
const { normalizeArchiveEntry } = require('../lib/inspect');
const targetConfig = require('../lib/target-config');
const { verifyRouter } = require('../lib/test');
const { installPlugin, uninstallPlugin } = require('../lib/workflow');
const { compatiblePlatform, makeTempDir, removeTempDir } = require('./helpers');

const repositoryRoot = path.resolve(__dirname, '..');

function memoryStream() {
  return {
    value: '',
    write(chunk) { this.value += String(chunk); },
  };
}

function successful(stdout) {
  return { status: 0, stdout: stdout || Buffer.alloc(0), stderr: Buffer.alloc(0) };
}

test('command help is side-effect free and global options parse consistently', async function() {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const code = await cli.run(['build', '--help'], { cwd: repositoryRoot, stdout, stderr });
  assert.equal(code, 0);
  assert.match(stdout.value, /Usage: glplugin build/);
  assert.doesNotMatch(stdout.value + stderr.value, /Building plugin|No gl-plugin/);

  const parsed = cli.parseGlobalArgs([
    '--cwd', 'test', 'doctor', '--json', '--quiet', 'router.local', '--https',
  ], repositoryRoot);
  assert.equal(parsed.command, 'doctor');
  assert.equal(parsed.cwd, path.join(repositoryRoot, 'test'));
  assert.equal(parsed.json, true);
  assert.equal(parsed.quiet, true);
  assert.deepEqual(parsed.args, ['router.local', '--https']);

  const targetHelp = memoryStream();
  assert.equal(await cli.run(
    ['target', 'add', '--help'],
    { cwd: repositoryRoot, stdout: targetHelp, stderr: memoryStream() }
  ), 0);
  assert.match(targetHelp.value, /target add <name> <\[user@\]host>/);
});

test('target commands persist validated connection settings without credentials', async function(t) {
  const cwd = makeTempDir('glplugin-target-');
  t.after(() => removeTempDir(cwd));
  const stdout = memoryStream();
  const stderr = memoryStream();

  assert.equal(await cli.run([
    '--cwd', cwd, 'target', 'add', 'beryl', 'admin@router.local',
    '--rpc-host', 'rpc.router.local', '--https', '--use',
  ], { stdout, stderr }), 0);

  const file = targetConfig.configPath(cwd);
  const persisted = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(persisted, /password|secret|token/i);
  assert.equal(fs.statSync(file).mode & 0o077, 0);
  assert.deepEqual(targetConfig.resolveTarget('beryl', { cwd }), {
    name: 'beryl',
    source: 'config',
    ssh: 'admin@router.local',
    rpcHost: 'rpc.router.local',
    username: 'admin',
    https: true,
    insecure: false,
    insecureHostKey: false,
  });
  assert.equal(targetConfig.resolveTarget(null, { cwd }).name, 'beryl');
  assert.equal(
    targetConfig.resolveTarget(null, { cwd, env: { GLPLUGIN_HOST: 'env.router' } }).source,
    'environment'
  );

  const jsonOut = memoryStream();
  assert.equal(await cli.run(
    ['--cwd', cwd, 'target', 'list', '--json'],
    { stdout: jsonOut, stderr: memoryStream() }
  ), 0);
  const listed = JSON.parse(jsonOut.value);
  assert.equal(listed.ok, true);
  assert.equal(listed.result.targets[0].name, 'beryl');
});

test('project check validates menu, locales, toolchain, and strict warnings', async function(t) {
  const cwd = makeTempDir('glplugin-check-');
  t.after(() => removeTempDir(cwd));
  const project = init('check-fixture', { cwd, log() {} });
  fs.symlinkSync(path.join(repositoryRoot, 'node_modules'), path.join(project.dir, 'node_modules'));

  const report = checkProject(project.dir);
  assert.equal(report.ok, true);
  assert.equal(report.checks.find((item) => item.id === 'artifact').status, 'warn');
  assert.equal(checkProject(project.dir, { strict: true }).ok, false);

  const jsonOut = memoryStream();
  const successCode = await cli.run(
    ['--cwd', project.dir, 'check', '--json'],
    { stdout: jsonOut, stderr: memoryStream() }
  );
  assert.equal(successCode, 0);
  const output = JSON.parse(jsonOut.value);
  assert.equal(output.ok, true);
  assert.equal(output.result.project.id, 'check-fixture');

  const menuFile = path.join(project.dir, 'menu.json');
  const menu = JSON.parse(fs.readFileSync(menuFile, 'utf8'));
  menu.view = 'wrong-view';
  fs.writeFileSync(menuFile, JSON.stringify(menu));
  const invalid = checkProject(project.dir);
  assert.equal(invalid.ok, false);
  assert.match(invalid.checks.find((item) => item.id === 'menu').message, /must be "check-fixture"/);

  const errorOut = memoryStream();
  const failureCode = await cli.run(
    ['--cwd', project.dir, 'check', '--json'],
    { stdout: errorOut, stderr: memoryStream() }
  );
  assert.equal(failureCode, 3);
  const failure = JSON.parse(errorOut.value);
  assert.equal(failure.ok, false);
  assert.equal(failure.error.exitCode, 3);
  assert.equal(failure.error.details.ok, false);
});

test('archive path validation rejects traversal before package inspection', function() {
  assert.equal(normalizeArchiveEntry('./www/views/plugin.js.gz'), 'www/views/plugin.js.gz');
  assert.throws(() => normalizeArchiveEntry('../etc/passwd'), /Unsafe archive path/);
  assert.throws(() => normalizeArchiveEntry('/etc/passwd'), /Unsafe archive path/);
});

test('install and uninstall workflows use exact SCP and SSH argument arrays', function(t) {
  const cwd = makeTempDir('glplugin-workflow-');
  t.after(() => removeTempDir(cwd));
  const project = init('workflow-fixture', { cwd, log() {} });
  const ipkFile = path.join(project.dir, 'workflow-fixture_1.0.0_all.ipk');
  fs.writeFileSync(ipkFile, 'fixture');
  const calls = [];
  const spawnSync = (command, args, options) => {
    calls.push({ command, args, options });
    return successful();
  };
  const target = { ssh: 'root@router.local' };

  const installed = installPlugin({
    cwd: project.dir,
    target,
    checkProject() { return { ok: true }; },
    buildPlugin() {},
    packagePlugin() {
      return { ipkFile, packageName: 'gl-sdk4-ui-workflow-fixture' };
    },
    inspectPlatform() { return compatiblePlatform(); },
    log() {},
    spawnSync,
  });
  assert.equal(installed.remotePath, '/tmp/workflow-fixture_1.0.0_all.ipk');
  assert.deepEqual(calls.map((call) => call.command), ['ssh', 'scp', 'ssh', 'ssh']);
  assert.equal(calls[0].args.includes('ControlMaster=yes'), true);
  assert.match(
    calls[2].args.at(-1),
    /^opkg install \/tmp\/workflow-fixture.*; status=\$\?; rm -f \/tmp\/workflow-fixture.*; exit "\$status"$/
  );
  assert.equal(calls[3].args.includes('exit'), true);

  uninstallPlugin({ cwd: project.dir, target, log() {}, spawnSync });
  assert.equal(calls[4].command, 'ssh');
  assert.equal(calls[4].args.at(-1), 'opkg remove gl-sdk4-ui-workflow-fixture');
  calls.forEach((call) => assert.equal(call.options.shell, false));
});

test('dev performs an initial build/deploy and closes all watchers', function(t) {
  const cwd = makeTempDir('glplugin-dev-');
  t.after(() => removeTempDir(cwd));
  const project = init('dev-fixture', { cwd, log() {} });
  const watchers = [];
  let deploys = 0;
  let sessionCloses = 0;
  const controller = dev.startDev({
    cwd: project.dir,
    target: { ssh: 'root@router.local' },
    signals: false,
    log() {},
    warn() {},
    deployPlugin(args, options) {
      deploys += 1;
      assert.equal(args.includes('--build'), true);
      assert.equal(options.controlPath, '/tmp/test-control-socket');
    },
    openSshSession() {
      return {
        options: { controlPath: '/tmp/test-control-socket' },
        close() { sessionCloses += 1; },
      };
    },
    watch() {
      const watcher = { closed: false, close() { this.closed = true; } };
      watchers.push(watcher);
      return watcher;
    },
  });
  assert.equal(deploys, 1);
  assert.equal(controller.watched, watchers.length);
  controller.close();
  assert.equal(watchers.every((watcher) => watcher.closed), true);
  assert.equal(sessionCloses, 1);
  controller.close();
  assert.equal(sessionCloses, 1);
});

test('router test reuses doctor capabilities and never exposes a session identifier', async function(t) {
  const cwd = makeTempDir('glplugin-router-test-');
  t.after(() => removeTempDir(cwd));
  const project = init('router-test-fixture', { cwd, log() {} });
  const bundle = zlib.gzipSync('(function(){return {name:"fixture",render:function(){}}})()');
  const report = await verifyRouter('router.local', 'private-password', {
    cwd: project.dir,
    username: 'root',
    transportOptions: {},
    httpGet: async (host, urlPath) => ({
      status: 200,
      body: urlPath === '/' ? Buffer.from('admin') : bundle,
    }),
    inspectRouter: async () => ({
      ok: true,
      target: 'http://router.local',
      router: { model: 'GL-MT3000', firmware_version: '4.8.1' },
      compatibility: {
        compatible: true,
        status: 'live-supported',
        reason: 'fixture',
      },
      plugin: { menu_view: 'router-test-fixture', menu_loaded: true },
      capabilities: [
        { id: 'wifi', status: 'available' },
        { id: 'dpi', status: 'unavailable' },
      ],
    }),
  });
  assert.equal(report.ok, true);
  assert.equal(report.checks.find((item) => item.id === 'plugin-export').status, 'pass');
  assert.equal(report.capabilities.find((item) => item.id === 'dpi').testStatus, 'skip');
  assert.deepEqual(report.capabilitySummary, { available: 1, unavailable: 1 });
  assert.doesNotMatch(JSON.stringify(report), /private-password|sid|session/i);
});
