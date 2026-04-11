const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function extract(host) {
  if (!host) {
    console.error('Error: Host required. Usage: glplugin extract root@<router-ip>');
    process.exit(1);
  }

  if (!host.includes('@')) {
    host = `root@${host}`;
  }

  console.log(`Extracting component info from ${host}...`);

  const tmpDir = path.join(require('os').tmpdir(), 'glplugin-extract');
  fs.mkdirSync(tmpDir, { recursive: true });

  const remoteAppJs = '/www/js/app.*.js.gz';
  const localGz = path.join(tmpDir, 'app.js.gz');
  const localJs = path.join(tmpDir, 'app.js');

  try {
    // Download app.js.gz
    console.log('  Downloading app.js...');
    execSync(`ssh -o StrictHostKeyChecking=no ${host} "cat ${remoteAppJs}" > "${localGz}"`, { stdio: 'pipe' });
    execSync(`gunzip -f "${localGz}"`);
  } catch (e) {
    console.error('Failed to download app.js from router.');
    process.exit(1);
  }

  const content = fs.readFileSync(localJs, 'utf8');

  // Extract gl- components
  const componentRegex = /"(gl-[a-z][-a-z]+)"/g;
  const components = new Set();
  let match;
  while ((match = componentRegex.exec(content)) !== null) {
    components.add(match[1]);
  }

  // Extract CSS variables
  const cssVarRegex = /var\(--([a-z][-a-z0-9]*)/g;
  const cssVars = new Set();
  while ((match = cssVarRegex.exec(content)) !== null) {
    cssVars.add('--' + match[1]);
  }

  // Extract icon names
  const iconRegex = /icon:"([a-z][-a-z0-9]*)"/g;
  const icons = new Set();
  while ((match = iconRegex.exec(content)) !== null) {
    icons.add(match[1]);
  }

  // Extract RPC methods
  const rpcRegex = /\$rpc\.call\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g;
  const rpcMethods = new Set();
  while ((match = rpcRegex.exec(content)) !== null) {
    rpcMethods.add(`${match[1]}.${match[2]}`);
  }

  // Extract menu.d files
  let menus = [];
  try {
    const menuOutput = execSync(
      `ssh -o StrictHostKeyChecking=no ${host} "cat /usr/share/oui/menu.d/*.json"`,
      { encoding: 'utf8' }
    );
    // Split on }{ boundary (files are concatenated without separator)
    const menuJson = '[' + menuOutput.replace(/\}\s*\{/g, '},{') + ']';
    menus = JSON.parse(menuJson);
  } catch (e) {
    console.warn('  Warning: Could not read menu.d files.');
  }

  const result = {
    firmware: '',
    extractedAt: new Date().toISOString(),
    components: [...components].sort(),
    cssVariables: [...cssVars].sort(),
    icons: [...icons].sort(),
    rpcMethods: [...rpcMethods].sort(),
    menus: menus,
  };

  // Get firmware version
  try {
    const board = execSync(
      `ssh -o StrictHostKeyChecking=no ${host} "cat /etc/glversion 2>/dev/null || echo unknown"`,
      { encoding: 'utf8' }
    ).trim();
    result.firmware = board;
  } catch (e) {}

  const outFile = path.resolve(process.cwd(), 'extracted-components.json');
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');

  console.log(`
  Extraction complete!

  Components:     ${result.components.length}
  CSS Variables:  ${result.cssVariables.length}
  Icons:          ${result.icons.length}
  RPC Methods:    ${result.rpcMethods.length}
  Menu Entries:   ${result.menus.length}
  Firmware:       ${result.firmware}

  Saved to: ${outFile}
  `);
};
