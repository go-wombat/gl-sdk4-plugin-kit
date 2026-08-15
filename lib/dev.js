'use strict';

const fs = require('fs');
const path = require('path');
const deploy = require('./deploy');
const { CliError, EXIT_CODES } = require('./project');
const { openSshSession } = require('./ssh-transport');

function parseDevArgs(args) {
  const parsed = { target: '', debounce: 300, hostKeyPolicy: null };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--debounce') {
      const delay = Number(args[index + 1]);
      if (!Number.isInteger(delay) || delay < 50 || delay > 10000) {
        throw new CliError('--debounce must be an integer from 50 to 10000.', EXIT_CODES.USAGE);
      }
      parsed.debounce = delay;
      index += 1;
    } else if (value === '--insecure-host-key') parsed.hostKeyPolicy = 'insecure';
    else if (value === '--strict-host-key') parsed.hostKeyPolicy = 'strict';
    else if (value.startsWith('-')) throw new CliError(`Unknown dev option: ${value}`, EXIT_CODES.USAGE);
    else if (!parsed.target) parsed.target = value;
    else throw new CliError('Usage: glplugin dev [target|host] [--debounce <ms>]', EXIT_CODES.USAGE);
  }
  return parsed;
}

function watchDirectories(root) {
  const result = [];
  function visit(dir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    result.push(dir);
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
        visit(path.join(dir, entry.name));
      }
    });
  }
  ['src', 'i18n'].forEach((name) => visit(path.join(root, name)));
  return result;
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

  let running = false;
  let pending = false;
  let timer = null;
  let closed = false;
  const watchers = [];
  const session = createSession(settings.target.ssh, {
    insecureHostKey: settings.insecureHostKey,
    spawnSync: settings.spawnSync,
  });

  function cycle() {
    if (closed) return;
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      deployPlugin(deployArgs, {
        controlPath: session.options.controlPath,
        cwd: root,
        log,
        spawnSync: settings.spawnSync,
      });
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
    watchDirectories(root).forEach((dir) => {
      watchers.push(watch(dir, { persistent: true }, schedule));
    });
    const rootFiles = new Set(['menu.json', 'gl-plugin.json', 'webpack.config.js']);
    watchers.push(watch(root, { persistent: true }, (event, filename) => {
      if (filename && rootFiles.has(String(filename))) schedule();
    }));
  } catch (error) {
    watchers.forEach((watcher) => watcher.close());
    session.close();
    throw error;
  }
  log(`Watching ${watchers.length} project path(s). Press Ctrl+C to stop.`);

  let signalHandler = null;
  const controller = {
    target: settings.target.ssh,
    watched: watchers.length,
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
    log: options.log,
    warn: options.warn,
    target,
  });
}

module.exports = { cli: devCli, parseDevArgs, startDev, watchDirectories };
