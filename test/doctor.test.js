'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { RpcError } = require('../lib/auth');
const { formatDoctorReport, inspectRouter } = require('../lib/doctor');
const { parseRouterArgs } = require('../lib/router-command');

test('doctor reports model, firmware, auth, and feature-gated capabilities', async function() {
  const calls = [];
  const report = await inspectRouter('192.0.2.1', 'fixture-password', {
    username: 'root',
    login: async function() {
      return { sid: 'private-session', auth: { alg: '6', name: 'sha512-crypt' } };
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
          firmware_version: '4.9.0',
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
  assert.equal(report.router.firmware_version, '4.9.0');
  assert.equal(report.router.sdk_generation, 'SDK4');
  assert.deepEqual(report.auth, { alg: '6', name: 'sha512-crypt' });
  assert.equal(report.capabilities.find((item) => item.id === 'adguardhome').status, 'not-supported');
  assert.equal(report.capabilities.find((item) => item.id === 'fan').status, 'not-supported');
  assert.equal(report.capabilities.find((item) => item.id === 'dpi').status, 'unavailable');
  assert.equal(report.capabilities.find((item) => item.id === 'wifi').status, 'available');
  assert.equal(calls.includes('adguardhome.get_config'), false);
  assert.equal(calls.includes('fan.get_status'), false);
  assert.doesNotMatch(JSON.stringify(report), /private-session|fixture-password/);
  assert.match(formatDoctorReport(report), /Firmware: 4\.9\.0 \(testing\)/);
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
    json: true,
    passwordStdin: true,
  });
  assert.throws(() => parseRouterArgs(['router.local', 'secret']), /Passwords and extra positional/);
});
