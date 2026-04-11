const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Extract component and API info from a GL.iNet router.
 *
 * Two modes:
 *   glplugin extract root@<ip>          — SSH mode (extracts app.js components)
 *   glplugin extract <ip> --rpc         — RPC mode (tests all API endpoints, no SSH needed)
 *   glplugin extract root@<ip> --full   — Both SSH + RPC
 */
module.exports = async function extract(host) {
  if (!host) {
    host = process.argv[3];
  }

  const flags = process.argv.slice(4);
  const rpcMode = flags.includes('--rpc') || flags.includes('--full');
  const sshMode = !flags.includes('--rpc') || flags.includes('--full');

  if (!host) {
    console.error('Usage: glplugin extract <host> [--rpc|--full]');
    console.error('  root@<ip>    SSH mode (extracts app.js components)');
    console.error('  <ip> --rpc   RPC mode (tests all API endpoints)');
    console.error('  root@<ip> --full  Both modes combined');
    process.exit(1);
  }

  const result = {
    extractedAt: new Date().toISOString(),
    firmware: '',
  };

  // SSH-based extraction (components from app.js)
  if (sshMode && host.includes('@')) {
    console.log('Extracting components via SSH...');

    const tmpDir = path.join(require('os').tmpdir(), 'glplugin-extract');
    fs.mkdirSync(tmpDir, { recursive: true });

    const remoteAppJs = '/www/js/app.*.js.gz';
    const localGz = path.join(tmpDir, 'app.js.gz');
    const localJs = path.join(tmpDir, 'app.js');

    try {
      execSync(`ssh -o StrictHostKeyChecking=no ${host} "cat ${remoteAppJs}" > "${localGz}"`, { stdio: 'pipe' });
      execSync(`gunzip -f "${localGz}"`);
    } catch (e) {
      console.error('Failed to download app.js via SSH.');
      process.exit(1);
    }

    const content = fs.readFileSync(localJs, 'utf8');

    // Components
    const componentRegex = /"(gl-[a-z][-a-z]+)"/g;
    const components = new Set();
    let match;
    while ((match = componentRegex.exec(content)) !== null) components.add(match[1]);

    // CSS variables
    const cssVarRegex = /var\(--([a-z][-a-z0-9]*)/g;
    const cssVars = new Set();
    while ((match = cssVarRegex.exec(content)) !== null) cssVars.add('--' + match[1]);

    // Icons
    const iconRegex = /icon:"([a-z][-a-z0-9]*)"/g;
    const icons = new Set();
    while ((match = iconRegex.exec(content)) !== null) icons.add(match[1]);

    // RPC methods found in code
    const rpcRegex = /"call",\["sid","([^"]+)","([^"]+)"/g;
    const rpcMethods = new Set();
    while ((match = rpcRegex.exec(content)) !== null) rpcMethods.add(`${match[1]}.${match[2]}`);

    // Menu files
    let menus = [];
    try {
      const menuOutput = execSync(
        `ssh -o StrictHostKeyChecking=no ${host} "cat /usr/share/oui/menu.d/*.json"`,
        { encoding: 'utf8' }
      );
      const menuJson = '[' + menuOutput.replace(/\}\s*\{/g, '},{') + ']';
      menus = JSON.parse(menuJson);
    } catch (e) {}

    // Firmware version
    try {
      result.firmware = execSync(
        `ssh -o StrictHostKeyChecking=no ${host} "cat /etc/glversion 2>/dev/null || echo unknown"`,
        { encoding: 'utf8' }
      ).trim();
    } catch (e) {}

    result.components = [...components].sort();
    result.cssVariables = [...cssVars].sort();
    result.icons = [...icons].sort();
    result.rpcMethodsInCode = [...rpcMethods].sort();
    result.menus = menus;

    console.log(`  Components:     ${result.components.length}`);
    console.log(`  CSS Variables:  ${result.cssVariables.length}`);
    console.log(`  Icons:          ${result.icons.length}`);
    console.log(`  RPC in code:    ${result.rpcMethodsInCode.length}`);
    console.log(`  Menu entries:   ${result.menus.length}`);
  }

  // RPC-based extraction (live API testing)
  if (rpcMode) {
    const cleanHost = host.replace(/^root@/, '');
    console.log('\nTesting RPC endpoints...');

    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    const password = await new Promise((resolve) => {
      rl.question('Router password: ', (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    const { login, call } = require('./auth');
    let sid;

    try {
      const session = await login(cleanHost, password);
      sid = session.sid;
      console.log(`  Authenticated (sid=${sid.slice(0, 8)}...)`);
    } catch (e) {
      console.error('  Auth failed:', e.message);
      process.exit(1);
    }

    const METHODS = [
      ['system', 'get_status'], ['system', 'get_info'],
      ['clients', 'get_status'],
      ['wifi', 'get_status'], ['wifi', 'get_config'],
      ['led', 'get_config'],
      ['fan', 'get_status'], ['fan', 'get_config'],
      ['dns', 'get_config'], ['dns', 'get_info'],
      ['ddns', 'get_status'], ['ddns', 'get_config'],
      ['tailscale', 'get_status'], ['tailscale', 'get_config'],
      ['adguardhome', 'get_config'],
      ['repeater', 'get_status'], ['repeater', 'get_config'],
      ['tor', 'get_status'], ['tor', 'get_config'],
      ['upgrade', 'get_config'],
      ['cloud', 'get_config'],
      ['wireguard', 'get_status'], ['wireguard', 'get_config'],
      ['openvpn', 'get_status'], ['openvpn', 'get_config'],
      ['network', 'get_status'], ['network', 'get_config'],
      ['nas', 'get_status'], ['nas', 'get_config'],
      ['firewall', 'get_status'], ['firewall', 'get_config'],
    ];

    const working = [];
    const responses = {};

    for (const [mod, func] of METHODS) {
      try {
        const res = await call(cleanHost, sid, mod, func);
        if (res !== undefined && res !== null) {
          working.push(`${mod}.${func}`);
          responses[`${mod}.${func}`] = res;
          console.log(`  [OK]   ${mod}.${func}`);
        }
      } catch (e) {
        // silently skip
      }
    }

    result.confirmedMethods = working;
    result.apiResponses = responses;

    // Get firmware from API
    if (responses['system.get_info']) {
      result.firmware = responses['system.get_info'].firmware_version || result.firmware;
    }

    console.log(`\n  Confirmed working: ${working.length} methods`);
  }

  // Save
  const outFile = path.resolve(process.cwd(), 'extracted-components.json');
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
  console.log(`\n  Firmware: ${result.firmware}`);
  console.log(`  Saved to: ${outFile}\n`);
};
