'use strict';

const fs = require('fs');
const path = require('path');
const build = require('./build');
const { checkProject } = require('./check');
const { readPluginProject } = require('./manifest');
const { CliError, EXIT_CODES } = require('./project');
const {
  normalizeSshTarget,
  scpUpload,
  sshRun,
  validateRemoteFilename,
  withSshSession,
} = require('./ssh-transport');

function parseDeployArgs(args, options) {
  const values = Array.isArray(args) ? args : [args].filter(Boolean);
  const settings = options || {};
  const parsed = { host: '', build: false, hostKeyPolicy: null };

  values.forEach((value) => {
    if (value === '--build') parsed.build = true;
    else if (value === '--insecure-host-key') parsed.hostKeyPolicy = 'insecure';
    else if (value === '--strict-host-key') parsed.hostKeyPolicy = 'strict';
    else if (value.startsWith('-')) {
      throw new CliError(`Unknown deploy option: ${value}`, EXIT_CODES.USAGE);
    }
    else if (!parsed.host) parsed.host = value;
    else throw new CliError(
      'Usage: glplugin deploy [target|host] [--build] [--insecure-host-key]',
      EXIT_CODES.USAGE
    );
  });

  if (!parsed.host && !settings.allowMissingHost) {
    throw new CliError(
      'Target required. Usage: glplugin deploy [target|host] [--build] [--insecure-host-key]',
      EXIT_CODES.USAGE
    );
  }
  return parsed;
}

module.exports = function deploy(input, options) {
  const settings = options || {};
  const parsed = parseDeployArgs(input, { allowMissingHost: Boolean(settings.resolveTarget) });
  const configuredTarget = settings.resolveTarget
    ? settings.resolveTarget(parsed.host)
    : { ssh: normalizeSshTarget(parsed.host).target, insecureHostKey: false };
  const target = configuredTarget.ssh;
  const cwd = settings.cwd ? path.resolve(settings.cwd) : process.cwd();
  const project = readPluginProject(cwd);
  const name = project.manifest.id;
  const log = settings.log || console.log;
  const transportOptions = {
    insecureHostKey: parsed.hostKeyPolicy === 'insecure' ||
      (parsed.hostKeyPolicy === null && configuredTarget.insecureHostKey),
    spawnSync: settings.spawnSync,
    quiet: settings.quiet || settings.json,
  };
  const gzFile = path.join(cwd, 'dist', `gl-sdk4-ui-${name}.common.js.gz`);
  const menuFile = path.join(cwd, 'menu.json');

  if (parsed.build) {
    const report = (settings.checkProject || checkProject)(cwd);
    if (!report.ok) {
      const error = new CliError('Project check failed before deploy.', EXIT_CODES.VALIDATION);
      error.details = report;
      throw error;
    }
    (settings.buildPlugin || build)({
      cwd, log, quiet: settings.quiet, json: settings.json,
    });
  }

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

  return withSshSession(target, (sessionOptions) => {
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
      sessionOptions
    );

    log('  Uploading menu...');
    scpUpload(target, menuFile, `/usr/share/oui/menu.d/${name}.json`, sessionOptions);

    if (i18nFiles.length) {
      log(`  Uploading i18n (${i18nFiles.length} files)...`);
      sshRun(target, 'mkdir -p /www/i18n', sessionOptions);
      i18nFiles.forEach((filename) => {
        scpUpload(
          target,
          path.join(i18nDir, filename),
          `/www/i18n/${filename}`,
          sessionOptions
        );
      });
    }

    log(`\nDeployed! Refresh your browser to see "${name}" in the admin panel.`);
    return { target, uploaded: 2 + i18nFiles.length };
  }, {
    ...transportOptions,
    controlPath: settings.controlPath,
  });
};

module.exports.parseDeployArgs = parseDeployArgs;
