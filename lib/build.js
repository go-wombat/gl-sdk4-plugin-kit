'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { readPluginProject } = require('./manifest');
const { CliError } = require('./project');

function run(command, args, options) {
  const result = spawnSync(command, args, options);
  if (result.error) {
    throw new CliError(`Cannot run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new CliError(`${command} exited with status ${result.status}.`);
  }
}

function wrapBundleForEval(source) {
  return [
    '(function () {',
    '  var module = { exports: {} };',
    '  var exports = module.exports;',
    source,
    '  return (module.exports && module.exports.default) || module.exports;',
    '})()',
    '',
  ].join('\n');
}

module.exports = function build(options) {
  const cwd = options && options.cwd ? path.resolve(options.cwd) : process.cwd();
  const project = readPluginProject(cwd);
  const name = project.manifest.id;
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  console.log(`Building plugin "${name}"...`);
  run(npx, ['webpack', '--config', 'webpack.config.js'], { stdio: 'inherit', cwd });

  const jsFile = path.join(cwd, 'dist', `gl-sdk4-ui-${name}.common.js`);
  if (!fs.existsSync(jsFile)) {
    throw new CliError(`Expected output not found: ${jsFile}`);
  }

  const rawSource = fs.readFileSync(jsFile, 'utf8');
  fs.writeFileSync(jsFile, wrapBundleForEval(rawSource));
  run('gzip', ['-kf', jsFile], { stdio: 'inherit', cwd });

  const gzFile = jsFile + '.gz';
  const stats = fs.statSync(gzFile);
  console.log(`\nBuild complete: ${path.basename(gzFile)} (${(stats.size / 1024).toFixed(1)} KB)`);

  return { jsFile, gzFile };
};

module.exports.wrapBundleForEval = wrapBundleForEval;
