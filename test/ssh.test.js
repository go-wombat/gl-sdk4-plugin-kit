'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const zlib = require('zlib');
const deploy = require('../lib/deploy');
const extract = require('../lib/extract');
const init = require('../lib/init');
const {
  normalizeSshTarget,
  scpUpload,
  sshCapture,
  validateLocalPath,
  validateRemoteFilename,
  validateRemotePath,
} = require('../lib/ssh-transport');
const { makeTempDir, removeTempDir } = require('./helpers');

function successful(stdout) {
  return { status: 0, stdout: stdout || Buffer.alloc(0), stderr: Buffer.alloc(0) };
}

test('SSH targets and legacy SCP paths reject option and shell injection', function() {
  assert.deepEqual(normalizeSshTarget('router.local'), {
    host: 'router.local', target: 'root@router.local', user: 'root',
  });
  assert.deepEqual(normalizeSshTarget('admin@[fe80::1]'), {
    host: '[fe80::1]', target: 'admin@[fe80::1]', user: 'admin',
  });

  [
    '-oProxyCommand=touch /tmp/pwned',
    'router.local;touch-x',
    'root@router.local:/tmp/file',
    'root@router.local $(id)',
    'root@@router.local',
  ].forEach((target) => assert.throws(() => normalizeSshTarget(target), /Invalid SSH target/));

  assert.equal(validateRemotePath('/www/views/plugin.js'), '/www/views/plugin.js');
  assert.throws(() => validateRemotePath('/www/../etc/passwd'), /normalized absolute/);
  assert.throws(() => validateRemotePath('/www/file;reboot'), /normalized absolute/);
  assert.equal(validateRemoteFilename('gl-sdk4-ui-demo.en.json'), 'gl-sdk4-ui-demo.en.json');
  assert.throws(() => validateRemoteFilename('demo;reboot.json'), /Unsafe remote filename/);
  assert.equal(validateLocalPath('/tmp/local file.js'), '/tmp/local file.js');
  assert.throws(() => validateLocalPath('-oProxyCommand=touch-x'), /must be absolute/);
});

test('SSH transport passes exact argv to spawnSync without a local shell', function() {
  const calls = [];
  const spawnSync = (command, args, options) => {
    calls.push({ args, command, options });
    return successful(Buffer.from('router output'));
  };

  scpUpload(
    'router.local',
    '/tmp/local file.js',
    '/www/views/plugin.js',
    { spawnSync }
  );
  const output = sshCapture(
    'root@router.local',
    'cat /etc/glversion',
    { insecureHostKey: true, spawnSync }
  );

  assert.equal(output.toString(), 'router output');
  assert.deepEqual(calls[0].args, [
    '-O', '-o', 'StrictHostKeyChecking=accept-new',
    '/tmp/local file.js', 'root@router.local:/www/views/plugin.js',
  ]);
  assert.deepEqual(calls[1].args, [
    '-o', 'StrictHostKeyChecking=no', 'root@router.local', 'cat /etc/glversion',
  ]);
  calls.forEach((call) => assert.equal(call.options.shell, false));
});

test('deploy preflights inputs and uploads every asset through argument arrays', function(t) {
  const cwd = makeTempDir('glplugin-deploy-');
  t.after(() => removeTempDir(cwd));
  const project = init('deploy-fixture', { cwd });
  fs.mkdirSync(path.join(project.dir, 'dist'));
  fs.writeFileSync(
    path.join(project.dir, 'dist', 'gl-sdk4-ui-deploy-fixture.common.js.gz'),
    'bundle'
  );

  const calls = [];
  const spawnSync = (command, args, options) => {
    calls.push({ args, command, options });
    return successful();
  };
  const result = deploy(['router.local'], {
    cwd: project.dir,
    log() {},
    spawnSync,
  });

  assert.deepEqual(result, { target: 'root@router.local', uploaded: 3 });
  assert.deepEqual(calls.map((call) => call.command), ['scp', 'scp', 'ssh', 'scp']);
  calls.forEach((call) => {
    assert.equal(call.options.shell, false);
    assert.equal(call.args.includes('StrictHostKeyChecking=accept-new'), true);
  });

  fs.writeFileSync(path.join(project.dir, 'i18n', 'bad;touch.json'), '{}\n');
  let unsafeCalls = 0;
  assert.throws(() => deploy(['router.local'], {
    cwd: project.dir,
    log() {},
    spawnSync() {
      unsafeCalls += 1;
      return successful();
    },
  }), /Unsafe remote filename/);
  assert.equal(unsafeCalls, 0);
});

test('SSH extraction analyzes a gzipped bundle and framed menu documents', function() {
  const source = [
    '"gl-button"',
    'var(--primary-color)',
    'icon:"setting"',
    '"call",["sid","system","get_info"',
  ].join(';');
  const bundle = zlib.gzipSync(source);
  const menus = Buffer.from('{"view":"one"}\0[{"view":"two"}]\0');
  const calls = [];
  const spawnSync = (command, args, options) => {
    calls.push({ args, command, options });
    const remoteCommand = args[args.length - 1];
    if (remoteCommand === extract.APP_BUNDLE_COMMAND) return successful(bundle);
    if (remoteCommand === extract.MENU_COMMAND) return successful(menus);
    if (remoteCommand === extract.FIRMWARE_COMMAND) return successful(Buffer.from('4.8.1\n'));
    return { status: 1, stdout: Buffer.alloc(0), stderr: Buffer.from('unexpected command') };
  };

  const result = extract.extractViaSsh('router.local', { spawnSync });
  assert.deepEqual(result.components, ['gl-button']);
  assert.deepEqual(result.cssVariables, ['--primary-color']);
  assert.deepEqual(result.icons, ['setting']);
  assert.deepEqual(result.rpcMethodsInCode, ['system.get_info']);
  assert.deepEqual(result.menus, [{ view: 'one' }, { view: 'two' }]);
  assert.equal(result.firmware, '4.8.1');
  assert.deepEqual(result.sshErrors, []);
  assert.equal(calls.length, 3);
  calls.forEach((call) => assert.equal(call.options.shell, false));
});

test('RPC extraction does not print or persist credentials and redacts response secrets', async function(t) {
  const cwd = makeTempDir('glplugin-extract-rpc-');
  t.after(() => removeTempDir(cwd));
  const logs = [];
  const result = await extract(['root@router.local', '--rpc', '--password-stdin'], {
    call: async (host, sid, module, method) => {
      assert.equal(host, 'router.local');
      assert.equal(sid, 'private-session-id');
      return module === 'system' && method === 'get_info'
        ? {
          firmware_version: '4.9.0',
          nested: { private_key: 'private-key-value', token: 'private-token' },
          passwd: 'wifi-password',
        }
        : null;
    },
    cwd,
    log(value) { logs.push(value); },
    login: async () => ({ sid: 'private-session-id' }),
    now: () => new Date('2026-08-15T00:00:00.000Z'),
    readRouterPassword: async () => 'private-password',
  });

  const persisted = fs.readFileSync(result.outFile, 'utf8');
  assert.doesNotMatch(logs.join('\n'), /private-session-id|private-password/);
  assert.doesNotMatch(
    persisted,
    /private-session-id|private-password|private-key-value|private-token|wifi-password/
  );
  assert.equal(result.result.apiResponses['system.get_info'].passwd, '<redacted>');
  assert.deepEqual(result.result.apiResponses['system.get_info'].nested, {
    private_key: '<redacted>', token: '<redacted>',
  });
  assert.equal(result.result.firmware, '4.9.0');
  assert.deepEqual(result.result.confirmedMethods, ['system.get_info']);
});

test('deploy and extract parsers reject unknown flags and extra positionals', function() {
  assert.deepEqual(deploy.parseDeployArgs(['router.local', '--insecure-host-key']), {
    host: 'router.local', insecureHostKey: true,
  });
  assert.throws(() => deploy.parseDeployArgs(['router.local', '--port', '22']), /Unknown/);
  assert.equal(extract.parseExtractArgs(['router.local', '--full']).sshMode, true);
  assert.equal(extract.parseExtractArgs(['router.local', '--full']).rpcMode, true);
  assert.equal(
    extract.parseExtractArgs(['router.local', '--rpc', '--include-sensitive']).includeSensitive,
    true
  );
  assert.throws(
    () => extract.parseExtractArgs(['router.local', '--include-sensitive']),
    /require --rpc/
  );
  assert.throws(
    () => extract.parseExtractArgs(['router.local', '--rpc', '--insecure-host-key']),
    /requires SSH mode/
  );
  assert.throws(() => extract.parseExtractArgs(['router.local', '--unknown']), /Unknown/);
});

test('RPC response sanitizer preserves shape while redacting known secret fields', function() {
  assert.deepEqual(extract.sanitizeApiValue({
    enabled: true,
    peers: [{ auth_token: 'token', public_key: 'public', presharedkey: 'shared' }],
    wifi: { key: 'wifi-secret', ssid: 'Guest' },
  }), {
    enabled: true,
    peers: [{ auth_token: '<redacted>', public_key: 'public', presharedkey: '<redacted>' }],
    wifi: { key: '<redacted>', ssid: 'Guest' },
  });
});
