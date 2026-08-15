'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function run(command, args, options) {
  const result = spawnSync(command, args, Object.assign({ encoding: 'utf8' }, options));
  if (result.status !== 0 || result.error) {
    throw result.error || new Error(
      `${command} failed: ${String(result.stderr || result.stdout).trim()}`
    );
  }
  return result;
}

function extractTarGz(archive, destination) {
  fs.mkdirSync(destination, { recursive: true });
  run('tar', ['-xzf', archive, '-C', destination]);
}

function removeTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { extractTarGz, makeTempDir, removeTempDir, run };
