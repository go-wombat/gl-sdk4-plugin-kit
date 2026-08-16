'use strict';

const fs = require('fs');
const path = require('path');
const deploy = require('./deploy');
const { readPluginProject } = require('./manifest');
const { CliError, EXIT_CODES } = require('./project');
const { openSshSession } = require('./ssh-transport');

function parseDevArgs(args) {
  const parsed = {
    target: '', debounce: 300, hostKeyPolicy: null, allowUnverified: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--debounce') {
      const delay = Number(args[index + 1]);
      if (!Number.isInteger(delay) || delay < 50 || delay > 10000) {
        throw new CliError('--debounce must be an integer from 50 to 10000.', EXIT_CODES.USAGE);
      }
      parsed.debounce = delay;
      index += 1;
    } else if (value === '--allow-unverified') parsed.allowUnverified = true;
    else if (value === '--insecure-host-key') parsed.hostKeyPolicy = 'insecure';
    else if (value === '--strict-host-key') parsed.hostKeyPolicy = 'strict';
    else if (value.startsWith('-')) throw new CliError(`Unknown dev option: ${value}`, EXIT_CODES.USAGE);
    else if (!parsed.target) parsed.target = value;
    else throw new CliError(
      'Usage: glplugin dev [target|host] [--debounce <ms>] [--allow-unverified]',
      EXIT_CODES.USAGE
    );
  }
  return parsed;
}

function watchDirectories(root, project) {
  const result = [];
  const pluginProject = project || readPluginProject(root);
  const topLevelDirectories = new Set(['i18n']);
  pluginProject.manifest.views.forEach((view) => {
    [view.entry, view.menu].forEach((relativePath) => {
      if (relativePath.includes('/')) topLevelDirectories.add(relativePath.split('/')[0]);
    });
  });
  function visit(dir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    result.push(dir);
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
        visit(path.join(dir, entry.name));
      }
    });
  }
  topLevelDirectories.forEach((name) => visit(path.join(root, name)));
  return result;
}

function platformSignature(project) {
  return JSON.stringify({
    architecture: project.manifest.package.architecture,
    compatibility: project.manifest.compatibility,
    id: project.manifest.id,
    profile: project.manifest.profile,
    views: project.manifest.views,
  });
}

function startDev(options) {
  const settings = options || {};
  const root = path.resolve(settings.cwd || process.cwd());
  const log = settings.log || console.log;
  const watch = settings.watch || fs.watch;
  const deployPlugin = settings.deployPlugin || deploy;
  const createSession = settings.openSshSession || openSshSession;
  const deployArgs = [settings.target.ssh, '--build'];
  if (settings.insecureHostKey) deployArgs.push('--insecure-host-key');
  else deployArgs.push('--strict-host-key');
  if (settings.allowUnverified) deployArgs.push('--allow-unverified');

  let running = false;
  let pending = false;
  let timer = null;
  let closed = false;
  let verifiedSignature = null;
  const watchers = new Map();
  const session = createSession(settings.target.ssh, {
    insecureHostKey: settings.insecureHostKey,
    spawnSync: settings.spawnSync,
  });

  function syncWatchers(project) {
    const desired = new Set(watchDirectories(root, project));
    for (const [dir, watcher] of watchers) {
      if (dir !== root && !desired.has(dir)) {
        watcher.close();
        watchers.delete(dir);
      }
    }
    desired.forEach((dir) => {
      if (!watchers.has(dir)) {
        watchers.set(dir, watch(dir, { persistent: true }, schedule));
      }
    });
  }

  function cycle() {
    if (closed) return;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      const project = readPluginProject(root);
      const signature = platformSignature(project);
      deployPlugin(deployArgs, {
        controlPath: session.options.controlPath,
        cwd: root,
        log,
        skipPlatformCheck: verifiedSignature === signature,
        spawnSync: settings.spawnSync,
      });
      verifiedSignature = signature;
      syncWatchers(readPluginProject(root));
    } catch (error) {
      (settings.warn || console.error)(`Development deploy failed: ${error.message}`);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        cycle();
      }
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(cycle, settings.debounce || 300);
  }

  try {
    cycle();
    watchers.set(root, watch(root, { persistent: true }, (event, filename) => {
      if (!filename) return;
      const rootFiles = new Set(['gl-plugin.json', 'webpack.config.js']);
      try {
        readPluginProject(root).manifest.views.forEach((view) => {
          [view.entry, view.menu].forEach((relativePath) => {
            if (!relativePath.includes('/')) rootFiles.add(relativePath);
          });
        });
      } catch (error) {
        rootFiles.add('gl-plugin.json');
      }
      if (rootFiles.has(String(filename))) schedule();
    }));
  } catch (error) {
    watchers.forEach((watcher) => watcher.close());
    session.close();
    throw error;
  }
  log(`Watching ${watchers.size} project path(s). Press Ctrl+C to stop.`);

  let signalHandler = null;
  const controller = {
    target: settings.target.ssh,
    get watched() { return watchers.size; },
    close() {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
      watchers.forEach((watcher) => watcher.close());
      session.close();
      if (signalHandler) process.off('SIGINT', signalHandler);
    },
  };
  if (settings.signals !== false) {
    signalHandler = () => {
      controller.close();
      log('Development watcher stopped.');
    };
    process.once('SIGINT', signalHandler);
  }
  return controller;
}

function devCli(args, options) {
  const parsed = parseDevArgs(args);
  const target = options.resolveTarget(parsed.target);
  const insecureHostKey = parsed.hostKeyPolicy === 'insecure' ||
    (parsed.hostKeyPolicy === null && target.insecureHostKey);
  return startDev({
    cwd: options.cwd,
    debounce: parsed.debounce,
    insecureHostKey,
    allowUnverified: parsed.allowUnverified,
    log: options.log,
    warn: options.warn,
    target,
  });
}

module.exports = { cli: devCli, parseDevArgs, startDev, watchDirectories };
