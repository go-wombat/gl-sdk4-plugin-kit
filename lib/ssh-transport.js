'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { CliError } = require('./project');

const MAX_CAPTURE_BYTES = 64 * 1024 * 1024;
const USER_PATTERN = /^[A-Za-z0-9._-]+$/;
const HOST_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/;
const BRACKETED_HOST_PATTERN = /^\[[A-Za-z0-9:._%-]+\]$/;
const REMOTE_PATH_PATTERN = /^\/[A-Za-z0-9._/-]+$/;
const REMOTE_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function normalizeSshTarget(value, options) {
  const settings = options || {};
  if (typeof value !== 'string' || !value.trim()) {
    throw new CliError('SSH target is required.');
  }

  const input = value.trim();
  if (input !== value || /[\0\r\n\t ]/.test(input)) {
    throw new CliError('Invalid SSH target.');
  }

  const parts = input.split('@');
  if (parts.length > 2) throw new CliError('Invalid SSH target.');
  const user = parts.length === 2 ? parts[0] : (settings.defaultUser || 'root');
  const host = parts.length === 2 ? parts[1] : parts[0];

  if (!USER_PATTERN.test(user) ||
      (!HOST_PATTERN.test(host) && !BRACKETED_HOST_PATTERN.test(host))) {
    throw new CliError('Invalid SSH target. Use [user@]hostname or [user@][IPv6].');
  }

  return { host, target: `${user}@${host}`, user };
}

function validateRemotePath(value, field) {
  const label = field || 'Remote path';
  if (typeof value !== 'string' || !REMOTE_PATH_PATTERN.test(value) ||
      path.posix.normalize(value) !== value) {
    throw new CliError(`${label} must be a normalized absolute router path.`);
  }
  return value;
}

function validateRemoteFilename(value) {
  if (typeof value !== 'string' || !REMOTE_FILENAME_PATTERN.test(value)) {
    throw new CliError(`Unsafe remote filename: ${String(value)}`);
  }
  return value;
}

function validateLocalPath(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /[\0\r\n]/.test(value)) {
    throw new CliError('Local upload path must be absolute.');
  }
  return value;
}

function hostKeyArgs(insecureHostKey) {
  return ['-o', `StrictHostKeyChecking=${insecureHostKey ? 'no' : 'accept-new'}`];
}

function run(command, args, options) {
  const settings = options || {};
  const execute = settings.spawnSync || spawnSync;
  const result = execute(command, args, {
    encoding: settings.encoding,
    maxBuffer: settings.maxBuffer || MAX_CAPTURE_BYTES,
    shell: false,
    stdio: settings.stdio,
  });

  if (result.error) {
    throw new CliError(`Cannot run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new CliError(
      `${command} exited with status ${result.status}${detail ? `: ${detail}` : '.'}`
    );
  }
  return result;
}

function sshRun(target, remoteCommand, options) {
  const normalized = normalizeSshTarget(target);
  const settings = options || {};
  return run(
    'ssh',
    hostKeyArgs(settings.insecureHostKey).concat(normalized.target, remoteCommand),
    { ...settings, stdio: 'inherit' }
  );
}

function sshCapture(target, remoteCommand, options) {
  const normalized = normalizeSshTarget(target);
  const settings = options || {};
  const result = run(
    'ssh',
    hostKeyArgs(settings.insecureHostKey).concat(normalized.target, remoteCommand),
    { ...settings, encoding: settings.encoding || 'buffer', stdio: ['inherit', 'pipe', 'pipe'] }
  );
  return result.stdout;
}

function scpUpload(target, localPath, remotePath, options) {
  const normalized = normalizeSshTarget(target);
  const destination = `${normalized.target}:${validateRemotePath(remotePath)}`;
  const source = validateLocalPath(localPath);
  const settings = options || {};
  return run(
    'scp',
    ['-O'].concat(hostKeyArgs(settings.insecureHostKey), source, destination),
    { ...settings, stdio: 'inherit' }
  );
}

module.exports = {
  hostKeyArgs,
  normalizeSshTarget,
  run,
  scpUpload,
  sshCapture,
  sshRun,
  validateLocalPath,
  validateRemoteFilename,
  validateRemotePath,
};
