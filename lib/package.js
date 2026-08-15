'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CliError, readProjectPackage, safeControlValue } = require('./project');

function run(command, args, options) {
  const result = spawnSync(command, args, Object.assign({ encoding: 'utf8' }, options));
  if (result.error) {
    throw new CliError(`Cannot run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new CliError(
      `${command} exited with status ${result.status}${detail ? `: ${detail}` : '.'}`
    );
  }
}

function directorySize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) total += directorySize(file);
    if (entry.isFile()) total += fs.statSync(file).size;
  }
  return total;
}

function maintainerName(author) {
  if (typeof author === 'string' && author.trim()) return author.trim();
  if (author && typeof author === 'object' && author.name) {
    return author.email ? `${author.name} <${author.email}>` : author.name;
  }
  return 'unknown';
}

function writeLifecycleScripts(controlDir) {
  const postinst = [
    '#!/bin/sh',
    '[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0',
    '[ -s ${IPKG_INSTROOT}/lib/functions.sh ] || exit 0',
    '. ${IPKG_INSTROOT}/lib/functions.sh',
    'default_postinst $0 $@',
    '',
  ].join('\n');
  const prerm = [
    '#!/bin/sh',
    '[ -s ${IPKG_INSTROOT}/lib/functions.sh ] || exit 0',
    '. ${IPKG_INSTROOT}/lib/functions.sh',
    'default_prerm $0 $@',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(controlDir, 'postinst'), postinst, { mode: 0o755 });
  fs.writeFileSync(path.join(controlDir, 'prerm'), prerm, { mode: 0o755 });
}

module.exports = function packagePlugin(options) {
  const cwd = options && options.cwd ? path.resolve(options.cwd) : process.cwd();
  const pkg = readProjectPackage(cwd);
  const config = pkg.glPlugin || {};
  const name = pkg.pluginName;
  const version = safeControlValue(pkg.version || '1.0.0', 'Version');
  const architecture = safeControlValue(config.architecture || 'all', 'Architecture');
  const section = safeControlValue(config.section || 'base', 'Section');
  const description = safeControlValue(
    config.description || pkg.description || `GL.iNet admin panel plugin: ${name}`,
    'Description'
  );
  const dependsList = config.depends == null ? ['libc', 'gl-sdk4-ui-core'] : config.depends;

  if (!Array.isArray(dependsList) || dependsList.some(function(value) { return typeof value !== 'string'; })) {
    throw new CliError('"glPlugin.depends" must be an array of package names.');
  }

  const dependencies = dependsList.map(function(value) {
    return safeControlValue(value, 'Depends');
  });
  const gzFile = path.join(cwd, 'dist', `gl-sdk4-ui-${name}.common.js.gz`);
  const menuFile = path.join(cwd, 'menu.json');

  if (!fs.existsSync(gzFile)) {
    throw new CliError(`Build artifact not found: ${gzFile}\nRun "glplugin build" first.`);
  }
  if (!fs.existsSync(menuFile)) {
    throw new CliError('menu.json not found.');
  }

  const ipkName = `gl-sdk4-ui-${name}`;
  const distDir = path.join(cwd, 'dist');
  const ipkFile = path.join(distDir, `${ipkName}_${version}_${architecture}.ipk`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glplugin-ipk-'));
  const dataDir = path.join(tmpDir, 'data');
  const controlDir = path.join(tmpDir, 'control');

  console.log(`Packaging "${name}" as .ipk...`);

  try {
    const viewsDir = path.join(dataDir, 'www', 'views');
    const menuDir = path.join(dataDir, 'usr', 'share', 'oui', 'menu.d');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.mkdirSync(menuDir, { recursive: true });
    fs.copyFileSync(gzFile, path.join(viewsDir, `gl-sdk4-ui-${name}.common.js.gz`));
    fs.copyFileSync(menuFile, path.join(menuDir, `${name}.json`));

    const i18nDir = path.join(cwd, 'i18n');
    if (fs.existsSync(i18nDir)) {
      const files = fs.readdirSync(i18nDir, { withFileTypes: true }).filter(function(entry) {
        return entry.isFile() && entry.name.endsWith('.json');
      });
      if (files.length) {
        const targetDir = path.join(dataDir, 'www', 'i18n');
        fs.mkdirSync(targetDir, { recursive: true });
        files.forEach(function(entry) {
          fs.copyFileSync(path.join(i18nDir, entry.name), path.join(targetDir, entry.name));
        });
      }
    }

    fs.mkdirSync(controlDir, { recursive: true });
    const control = [
      `Package: ${ipkName}`,
      `Version: ${version}`,
      dependencies.length ? `Depends: ${dependencies.join(', ')}` : null,
      `Source: ${safeControlValue(config.source || 'gl-sdk4-plugin-kit', 'Source')}`,
      `SourceName: ${ipkName}`,
      `Section: ${section}`,
      `Architecture: ${architecture}`,
      `Installed-Size: ${directorySize(dataDir)}`,
      `Maintainer: ${safeControlValue(maintainerName(pkg.author), 'Maintainer')}`,
      `Description: ${description}`,
      '',
    ].filter(function(line) { return line !== null; }).join('\n');
    fs.writeFileSync(path.join(controlDir, 'control'), control);
    writeLifecycleScripts(controlDir);
    fs.writeFileSync(path.join(tmpDir, 'debian-binary'), '2.0\n');

    const tarEnvironment = Object.assign({}, process.env, { COPYFILE_DISABLE: '1' });
    const tarArgs = ['--format', 'ustar', '--numeric-owner', '--group=0', '--owner=0', '-czf'];
    run('tar', tarArgs.concat(path.join(tmpDir, 'data.tar.gz'), '.'), {
      cwd: dataDir,
      env: tarEnvironment,
    });
    run('tar', tarArgs.concat(path.join(tmpDir, 'control.tar.gz'), '.'), {
      cwd: controlDir,
      env: tarEnvironment,
    });

    fs.mkdirSync(distDir, { recursive: true });
    run(
      'tar',
      tarArgs.concat(ipkFile, 'debian-binary', 'control.tar.gz', 'data.tar.gz'),
      { cwd: tmpDir, env: tarEnvironment }
    );

    const stats = fs.statSync(ipkFile);
    console.log(`
  Package created: ${path.relative(cwd, ipkFile)} (${(stats.size / 1024).toFixed(1)} KB)

  Install on router:
    scp -O ${path.relative(cwd, ipkFile)} root@<router-ip>:/tmp/
    ssh root@<router-ip> "opkg install /tmp/${path.basename(ipkFile)}"

  Uninstall:
    ssh root@<router-ip> "opkg remove ${ipkName}"
    `);

    return { architecture, ipkFile, packageName: ipkName };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

module.exports.directorySize = directorySize;
