const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function deploy(host) {
  if (!host) {
    host = process.argv[3];
  }

  if (!host) {
    console.error('Error: Host required. Usage: glplugin deploy root@<router-ip>');
    process.exit(1);
  }

  if (!host.includes('@')) {
    host = `root@${host}`;
  }

  const pkgPath = path.resolve(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error('Error: No package.json found. Run this from a plugin directory.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const name = pkg.pluginName;

  const gzFile = path.resolve(process.cwd(), 'dist', `gl-sdk4-ui-${name}.common.js.gz`);
  const menuFile = path.resolve(process.cwd(), 'menu.json');

  if (!fs.existsSync(gzFile)) {
    console.error(`Error: Build artifact not found: ${gzFile}\nRun "glplugin build" first.`);
    process.exit(1);
  }

  if (!fs.existsSync(menuFile)) {
    console.error(`Error: menu.json not found.`);
    process.exit(1);
  }

  console.log(`Deploying "${name}" to ${host}...`);

  try {
    // Upload view
    console.log(`  Uploading view...`);
    execSync(
      `scp -O -o StrictHostKeyChecking=no "${gzFile}" ${host}:/www/views/gl-sdk4-ui-${name}.common.js.gz`,
      { stdio: 'inherit' }
    );

    // Upload menu
    console.log(`  Uploading menu...`);
    execSync(
      `scp -O -o StrictHostKeyChecking=no "${menuFile}" ${host}:/usr/share/oui/menu.d/${name}.json`,
      { stdio: 'inherit' }
    );

    // Upload i18n files if they exist
    const i18nDir = path.resolve(process.cwd(), 'i18n');
    if (fs.existsSync(i18nDir)) {
      const i18nFiles = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json'));
      if (i18nFiles.length) {
        console.log(`  Uploading i18n (${i18nFiles.length} files)...`);
        execSync(`ssh -o StrictHostKeyChecking=no ${host} "mkdir -p /www/i18n"`, { stdio: 'inherit' });
        for (const f of i18nFiles) {
          execSync(
            `scp -O -o StrictHostKeyChecking=no "${path.join(i18nDir, f)}" ${host}:/www/i18n/${f}`,
            { stdio: 'inherit' }
          );
        }
      }
    }

    console.log(`\nDeployed! Refresh your browser to see "${name}" in the admin panel.`);
  } catch (e) {
    console.error('\nDeploy failed. Check SSH connection and password.');
    process.exit(1);
  }
};
