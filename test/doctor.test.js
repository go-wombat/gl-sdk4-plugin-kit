'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { RpcError } = require('../lib/auth');
const { formatDoctorReport, inspectRouter, menuContainsView } = require('../lib/doctor');
const { applyRouterTarget, parseRouterArgs } = require('../lib/router-command');

test('doctor reports model, firmware, auth, and feature-gated capabilities', async function() {
  const calls = [];
  const report = await inspectRouter('192.0.2.1', 'fixture-password', {
    username: 'root',
    login: async function() {
      return { sid: 'private-session', auth: { alg: '6', name: 'sha512-crypt' } };
    },
    inspectPlatform: async function() {
      return {
        source: 'test-fixture',
        appPath: '/js/app.fixture.js',
        analysis: {
          bundleSha256: '0409574b320a74de904a690df723134fc07471cddf5d622691ebbaa403116705',
          contracts: { viewLoader: true, rpcRequest: true },
          portableComponents: ['gl-card', 'gl-title'],
        },
      };
    },
    call: async function(host, sid, module, method) {
      calls.push(`${module}.${method}`);
      assert.equal(sid, 'private-session');
      if (module === 'system' && method === 'get_info') {
        return {
          board_info: {
            model: 'GL-MT3000',
            hostname: 'beryl-ax',
            architecture: 'ARMv8',
            kernel_version: '5.4.211',
            openwrt_version: 'OpenWrt 21.02-SNAPSHOT',
          },
          firmware_version: '4.8.1',
          firmware_type: 'testing',
          software_feature: { vpn: true, adguard: false, ipv6: true, tor: false },
          hardware_feature: { fan: false, build_in_modem: '' },
        };
      }
      if (module === 'system' && method === 'get_status') return { system: { mode: 0 } };
      if (module === 'sqm' || module === 'dpi' || module === 'tailscale') {
        throw new RpcError('Method not found', { code: -32601 });
      }
      return {};
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.router.model, 'GL-MT3000');
  assert.equal(report.router.firmware_version, '4.8.1');
  assert.equal(report.router.sdk_generation, 'SDK4 modern');
  assert.equal(report.compatibility.status, 'live-supported');
  assert.deepEqual(report.auth, { alg: '6', name: 'sha512-crypt' });
  assert.equal(report.capabilities.find((item) => item.id === 'adguardhome').status, 'not-supported');
  assert.equal(report.capabilities.find((item) => item.id === 'fan').status, 'not-supported');
  assert.equal(report.capabilities.find((item) => item.id === 'dpi').status, 'unavailable');
  assert.equal(report.capabilities.find((item) => item.id === 'wifi').status, 'available');
  assert.equal(calls.includes('adguardhome.get_config'), false);
  assert.equal(calls.includes('fan.get_status'), false);
  assert.doesNotMatch(JSON.stringify(report), /private-session|fixture-password/);
  assert.match(formatDoctorReport(report), /Firmware: 4\.8\.1 \(testing\)/);
  assert.match(formatDoctorReport(report), /Deep Packet Inspection \(4\.9\+\): unavailable/);
});

test('router CLI arguments reject positional passwords', function() {
  assert.deepEqual(parseRouterArgs([
    'router.local', '--https', '--insecure', '--username', 'admin', '--password-stdin', '--json',
  ], { allowJson: true }), {
    host: 'router.local',
    username: 'admin',
    https: true,
    insecure: true,
    allowUnverified: false,
    json: true,
    passwordStdin: true,
  });
  assert.throws(() => parseRouterArgs(['router.local', 'secret']), /Passwords and extra positional/);

  const defaults = applyRouterTarget(
    parseRouterArgs([], { allowMissingHost: true }),
    {
      rpcHost: 'configured.local', username: 'admin', https: true, insecure: true,
    }
  );
  assert.equal(defaults.host, 'configured.local');
  assert.equal(defaults.username, 'admin');
  assert.equal(defaults.https, true);
  assert.equal(defaults.insecure, true);

  const overrides = applyRouterTarget(
    parseRouterArgs(['--http', '--secure'], { allowMissingHost: true }),
    {
      rpcHost: 'configured.local', username: 'admin', https: true, insecure: true,
    }
  );
  assert.equal(overrides.https, false);
  assert.equal(overrides.insecure, false);
});

test('menu verification finds nested plugin entries without relying on client history', function() {
  const result = {
    menus: [
      { view: 'overview' },
      { view: 'applications', children: [{ view: 'airbnb-radar' }] },
    ],
  };
  assert.equal(menuContainsView(result, 'airbnb-radar'), true);
  assert.equal(menuContainsView(result, 'missing-plugin'), false);
});
