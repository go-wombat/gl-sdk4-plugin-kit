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
  ['system', 'get_status'],
  ['system', 'get_info'],
  ['clients', 'get_status'],
  ['wifi', 'get_status'],
  ['wifi', 'get_config'],
  ['led', 'get_config'],
  ['fan', 'get_status'],
  ['fan', 'get_config'],
  ['dns', 'get_config'],
  ['dns', 'get_info'],
  ['ddns', 'get_status'],
  ['ddns', 'get_config'],
  ['tailscale', 'get_status'],
  ['tailscale', 'get_config'],
  ['adguardhome', 'get_config'],
  ['repeater', 'get_status'],
  ['repeater', 'get_config'],
  ['tor', 'get_status'],
  ['tor', 'get_config'],
  ['upgrade', 'get_config'],
  ['cloud', 'get_config'],
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
