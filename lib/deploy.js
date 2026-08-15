'use strict';

const fs = require('fs');
const path = require('path');
const { readPluginProject } = require('./manifest');
const { CliError } = require('./project');
const {
  normalizeSshTarget,
  scpUpload,
  sshRun,
  validateRemoteFilename,
} = require('./ssh-transport');

function parseDeployArgs(args) {
  const values = Array.isArray(args) ? args : [args].filter(Boolean);
  const parsed = { host: '', insecureHostKey: false };

  values.forEach((value) => {
    if (value === '--insecure-host-key') parsed.insecureHostKey = true;
    else if (value.startsWith('-')) throw new CliError(`Unknown deploy option: ${value}`);
    else if (!parsed.host) parsed.host = value;
    else throw new CliError('Usage: glplugin deploy <host> [--insecure-host-key]');
  });

  if (!parsed.host) {
    throw new CliError('Host required. Usage: glplugin deploy <host> [--insecure-host-key]');
  }
  return parsed;
}

module.exports = function deploy(input, options) {
  const settings = options || {};
  const parsed = parseDeployArgs(input);
  const target = normalizeSshTarget(parsed.host).target;
  const cwd = settings.cwd ? path.resolve(settings.cwd) : process.cwd();
  const project = readPluginProject(cwd);
  const name = project.manifest.id;
  const log = settings.log || console.log;
  const transportOptions = {
    insecureHostKey: parsed.insecureHostKey,
    spawnSync: settings.spawnSync,
  };
  const gzFile = path.join(cwd, 'dist', `gl-sdk4-ui-${name}.common.js.gz`);
  const menuFile = path.join(cwd, 'menu.json');

  if (!fs.existsSync(gzFile) || !fs.lstatSync(gzFile).isFile()) {
    throw new CliError(`Build artifact not found: ${gzFile}\nRun "glplugin build" first.`);
  }
  if (!fs.existsSync(menuFile) || !fs.lstatSync(menuFile).isFile()) {
    throw new CliError('menu.json not found.');
  }

  const i18nDir = path.join(cwd, 'i18n');
  let i18nFiles = [];
  if (fs.existsSync(i18nDir) && fs.lstatSync(i18nDir).isDirectory()) {
    i18nFiles = fs.readdirSync(i18nDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => validateRemoteFilename(entry.name));
  }

  log(`Deploying "${name}" to ${target}...`);
  if (project.manifest.profile === 'full-stack') {
    log(
      '  Warning: deploy uploads UI assets only; use glplugin package and opkg install ' +
      'to apply the full-stack overlay and lifecycle hooks.'
    );
  }

  log('  Uploading view...');
  scpUpload(
    target,
    gzFile,
    `/www/views/gl-sdk4-ui-${name}.common.js.gz`,
    transportOptions
  );

  log('  Uploading menu...');
  scpUpload(target, menuFile, `/usr/share/oui/menu.d/${name}.json`, transportOptions);

  if (i18nFiles.length) {
    log(`  Uploading i18n (${i18nFiles.length} files)...`);
    sshRun(target, 'mkdir -p /www/i18n', transportOptions);
    i18nFiles.forEach((filename) => {
      scpUpload(
        target,
        path.join(i18nDir, filename),
        `/www/i18n/${filename}`,
        transportOptions
      );
    });
  }

  log(`\nDeployed! Refresh your browser to see "${name}" in the admin panel.`);
  return { target, uploaded: 2 + i18nFiles.length };
};

module.exports.parseDeployArgs = parseDeployArgs;
