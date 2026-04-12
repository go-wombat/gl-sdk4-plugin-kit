const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = function pkg() {
  const pkgPath = path.resolve(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error('Error: No package.json found. Run this from a plugin directory.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const name = pkg.pluginName;
  const version = pkg.version || '1.0.0';

  if (!name) {
    console.error('Error: "pluginName" not set in package.json.');
    process.exit(1);
  }

  const gzFile = path.resolve(process.cwd(), 'dist', `gl-sdk4-ui-${name}.common.js.gz`);
  const menuFile = path.resolve(process.cwd(), 'menu.json');

  if (!fs.existsSync(gzFile)) {
    console.error(`Error: Build artifact not found: ${gzFile}\nRun "glplugin build" first.`);
    process.exit(1);
  }

  if (!fs.existsSync(menuFile)) {
    console.error('Error: menu.json not found.');
    process.exit(1);
  }

  const ipkName = `gl-sdk4-ui-${name}`;
  const ipkFile = path.resolve(process.cwd(), 'dist', `${ipkName}_${version}_all.ipk`);

  console.log(`Packaging "${name}" as .ipk...`);

  // Create temp build directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glplugin-ipk-'));
  const dataDir = path.join(tmpDir, 'data');
  const controlDir = path.join(tmpDir, 'control');

  try {
    // Create data directory structure (files that get installed on router)
    const viewsDir = path.join(dataDir, 'www', 'views');
    const menuDir = path.join(dataDir, 'usr', 'share', 'oui', 'menu.d');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.mkdirSync(menuDir, { recursive: true });

    // Copy view bundle
    fs.copyFileSync(gzFile, path.join(viewsDir, `gl-sdk4-ui-${name}.common.js.gz`));

    // Copy menu.json
    fs.copyFileSync(menuFile, path.join(menuDir, `${name}.json`));

    // Copy i18n files if they exist
    const i18nDir = path.resolve(process.cwd(), 'i18n');
    if (fs.existsSync(i18nDir)) {
      const wwwI18n = path.join(dataDir, 'www', 'i18n');
      fs.mkdirSync(wwwI18n, { recursive: true });
      for (const f of fs.readdirSync(i18nDir)) {
        fs.copyFileSync(path.join(i18nDir, f), path.join(wwwI18n, f));
      }
    }

    // Create control file
    fs.mkdirSync(controlDir, { recursive: true });

    const controlContent = [
      `Package: ${ipkName}`,
      `Version: ${version}`,
      `Description: GL.iNet admin panel plugin: ${name}`,
      `Section: gl-ui`,
      `Architecture: all`,
      `Maintainer: ${pkg.author || 'unknown'}`,
      `Source: gl-sdk4-plugin-kit`,
      ``,
    ].join('\n');
    fs.writeFileSync(path.join(controlDir, 'control'), controlContent);

    // Create conffiles (mark menu.json as config so it survives upgrades)
    fs.writeFileSync(
      path.join(controlDir, 'conffiles'),
      `/usr/share/oui/menu.d/${name}.json\n`
    );

    // Create postinst script (optional — could clear caches)
    const postinst = [
      '#!/bin/sh',
      '[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0',
      'exit 0',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(controlDir, 'postinst'), postinst, { mode: 0o755 });

    // Create prerm script
    const prerm = [
      '#!/bin/sh',
      '[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0',
      'exit 0',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(controlDir, 'prerm'), prerm, { mode: 0o755 });

    // Create debian-binary
    fs.writeFileSync(path.join(tmpDir, 'debian-binary'), '2.0\n');

    // Build data.tar.gz (COPYFILE_DISABLE + ustar avoids macOS PaxHeader/AppleDouble junk)
    execSync(
      `cd "${dataDir}" && COPYFILE_DISABLE=1 tar --format ustar --numeric-owner --group=0 --owner=0 -czf "${path.join(tmpDir, 'data.tar.gz')}" .`,
      { stdio: 'pipe' }
    );

    // Build control.tar.gz
    execSync(
      `cd "${controlDir}" && COPYFILE_DISABLE=1 tar --format ustar --numeric-owner --group=0 --owner=0 -czf "${path.join(tmpDir, 'control.tar.gz')}" .`,
      { stdio: 'pipe' }
    );

    // Assemble .ipk (ar archive)
    const distDir = path.resolve(process.cwd(), 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    // Assemble .ipk as tar+gzip (macOS ar produces broken archives; tar-based .ipk verified on GL-MT3000)
    execSync(
      `cd "${tmpDir}" && COPYFILE_DISABLE=1 tar --format ustar --numeric-owner --group=0 --owner=0 -czf "${ipkFile}" debian-binary control.tar.gz data.tar.gz`,
      { stdio: 'pipe' }
    );

    const stats = fs.statSync(ipkFile);
    console.log(`
  Package created: ${path.basename(ipkFile)} (${(stats.size / 1024).toFixed(1)} KB)

  Install on router:
    scp -O ${path.basename(ipkFile)} root@<router-ip>:/tmp/
    ssh root@<router-ip> "opkg install /tmp/${path.basename(ipkFile)}"

  Uninstall:
    ssh root@<router-ip> "opkg remove ${ipkName}"
    `);
  } finally {
    // Cleanup temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};
