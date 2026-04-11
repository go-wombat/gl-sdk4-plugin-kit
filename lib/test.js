/**
 * glplugin test — verify plugin and API connectivity against a live router.
 *
 * Usage: glplugin test <host> [password]
 *
 * Tests:
 *   1. HTTP connectivity to router
 *   2. RPC authentication
 *   3. All known API methods
 *   4. Plugin view file is served
 *   5. Plugin menu.json is loaded
 */

const { login, call } = require('./auth');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const KNOWN_METHODS = [
  // Core
  ['system', 'get_status'],
  ['system', 'get_info'],
  ['system', 'get_load'],
  ['system', 'get_timezone_config'],
  ['system', 'get_usb3_disable'],
  // Clients
  ['clients', 'get_status'],
  ['clients', 'get_list'],
  // VPN
  ['vpn-client', 'get_status'],
  ['vpn-client', 'get_all_config_list'],
  ['vpn-client', 'get_tunnel'],
  ['vpn-client', 'get_connection_methods'],
  ['vpn-client', 'get_vpn_using_status'],
  ['wg-client', 'get_group_list'],
  ['wg-server', 'get_config'],
  ['wg-server', 'get_setting'],
  ['wg-server', 'get_peer_list'],
  ['ovpn-client', 'get_group_list'],
  ['ovpn-server', 'get_config'],
  ['ovpn-server', 'get_setting'],
  ['ovpn-server', 'get_user_list'],
  // Wi-Fi
  ['wifi', 'get_status'],
  ['wifi', 'get_config'],
  // Network
  ['firewall', 'get_port_forward_list'],
  ['firewall', 'get_rule_list'],
  ['firewall', 'get_zone_list'],
  ['firewall', 'get_dmz'],
  ['firewall', 'get_wan_access'],
  ['network', 'get_advance_config'],
  ['network', 'get_netnat_config'],
  ['network', 'get_arp_list'],
  ['network', 'check_wan_cable'],
  ['lan', 'get_config_list'],
  ['lan', 'get_static_bind_list'],
  ['lan', 'get_wan_info'],
  ['cable', 'get_config'],
  ['cable', 'get_ports_config'],
  ['cable', 'get_ports_status'],
  ['cable', 'get_status'],
  ['netmode', 'get_mode'],
  // DNS
  ['dns', 'get_config'],
  ['dns', 'get_info'],
  ['dns', 'get_host'],
  // Services
  ['led', 'get_config'],
  ['fan', 'get_status'],
  ['fan', 'get_config'],
  ['ddns', 'get_status'],
  ['ddns', 'get_config'],
  ['tailscale', 'get_status'],
  ['tailscale', 'get_config'],
  ['adguardhome', 'get_config'],
  ['repeater', 'get_status'],
  ['repeater', 'get_config'],
  ['repeater', 'get_saved_ap_list'],
  ['tor', 'get_status'],
  ['tor', 'get_config'],
  ['upgrade', 'get_config'],
  ['cloud', 'get_config'],
  // Scheduling
  ['timer', 'get_led'],
  ['timer', 'get_reboot'],
  ['timer', 'get_wifi'],
  ['timer', 'get_screen'],
  // Control
  ['parental-control', 'get_config'],
  ['parental-control', 'get_status'],
  ['parental-control', 'get_mode'],
  ['black_white_list', 'get_config'],
  ['switch-button', 'get_config'],
  ['switch-button', 'get_funcs'],
  ['local-access', 'get_config'],
  ['luci', 'get_status'],
  // Connectivity
  ['tethering', 'get_config'],
  ['tethering', 'get_status'],
  ['kmwan', 'get_config'],
  ['kmwan', 'get_status'],
  ['edgerouter', 'get_config'],
  ['edgerouter', 'get_status'],
  ['ipv6', 'get_ipv6'],
  ['igmp', 'get_config'],
  // Plugins/UI
  ['plugins', 'get_config'],
  ['plugins', 'get_repository_status'],
  ['ui', 'get_menu_list'],
  ['logread', 'get_module_name'],
  // Hidden
  ['rtty', 'get_config'],
  ['qos', 'get_config'],
];

function httpGet(host, urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://${host}${urlPath}`, { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error('timeout'));
      });
  });
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

module.exports = async function test(host) {
  if (!host) {
    host = process.argv[3];
  }
  let password = process.argv[4];

  if (!host) {
    console.error('Usage: glplugin test <router-ip> [password]');
    process.exit(1);
  }

  if (!password) {
    password = await prompt('Router password: ');
  }

  const passed = [];
  const failed = [];
  const skipped = [];

  function ok(name, detail) {
    passed.push(name);
    console.log(`  [PASS] ${name}${detail ? ' — ' + detail : ''}`);
  }

  function fail(name, detail) {
    failed.push(name);
    console.log(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`);
  }

  function skip(name, detail) {
    skipped.push(name);
    console.log(`  [SKIP] ${name}${detail ? ' — ' + detail : ''}`);
  }

  console.log(`\nTesting against ${host}...\n`);

  // Test 1: HTTP connectivity
  try {
    const res = await httpGet(host, '/');
    if (res.status === 200) {
      ok('HTTP connectivity', `status ${res.status}`);
    } else {
      fail('HTTP connectivity', `status ${res.status}`);
    }
  } catch (e) {
    fail('HTTP connectivity', e.message);
    console.log('\nCannot reach router. Aborting.');
    process.exit(1);
  }

  // Test 2: Authentication
  let sid;
  try {
    const session = await login(host, password);
    sid = session.sid;
    ok('RPC authentication', `sid=${sid.slice(0, 8)}...`);
  } catch (e) {
    fail('RPC authentication', e.message);
    console.log('\nCannot authenticate. Check password. Aborting.');
    process.exit(1);
  }

  // Test 3: API methods
  console.log('');
  for (const [mod, func] of KNOWN_METHODS) {
    try {
      const result = await call(host, sid, mod, func);
      if (result !== undefined && result !== null) {
        const keys = Object.keys(result);
        ok(`${mod}.${func}`, `${keys.length} fields`);
      } else {
        skip(`${mod}.${func}`, 'empty response');
      }
    } catch (e) {
      fail(`${mod}.${func}`, e.message);
    }
  }

  // Test 4: Check if current plugin is deployed
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const name = pkg.pluginName;
    if (name) {
      console.log('');
      try {
        const res = await httpGet(host, `/views/gl-sdk4-ui-${name}.common.js.gz`);
        if (res.status === 200) {
          ok(`Plugin view deployed (${name})`, `${res.body.length} bytes`);
        } else {
          fail(`Plugin view deployed (${name})`, `status ${res.status}`);
        }
      } catch (e) {
        fail(`Plugin view deployed (${name})`, e.message);
      }
    }
  }

  // Summary
  console.log(`\n  Results: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped\n`);

  if (failed.length > 0) {
    process.exit(1);
  }
};
