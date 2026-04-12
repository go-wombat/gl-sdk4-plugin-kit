const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

module.exports = function build() {
  const pkgPath = path.resolve(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error('Error: No package.json found. Run this from a plugin directory.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const name = pkg.pluginName;

  if (!name) {
    console.error('Error: "pluginName" not set in package.json.');
    process.exit(1);
  }

  console.log(`Building plugin "${name}"...`);

  try {
    execSync('npx webpack --config webpack.config.js', { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error('Webpack build failed.');
    process.exit(1);
  }

  const jsFile = path.resolve(process.cwd(), 'dist', `gl-sdk4-ui-${name}.common.js`);

  if (!fs.existsSync(jsFile)) {
    console.error(`Error: Expected output not found: ${jsFile}`);
    process.exit(1);
  }

  // GL.iNet's loader does `const component = eval(res.data)`, so the bundle
  // must return the Vue component value, not only assign to module.exports.
  const rawSource = fs.readFileSync(jsFile, 'utf8');
  fs.writeFileSync(jsFile, wrapBundleForEval(rawSource));

  // Gzip
  try {
    execSync(`gzip -kf "${jsFile}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error('gzip failed. Install gzip or run: gzip -kf dist/*.js');
    process.exit(1);
  }

  const gzFile = jsFile + '.gz';
  const stats = fs.statSync(gzFile);
  console.log(`\nBuild complete: ${path.basename(gzFile)} (${(stats.size / 1024).toFixed(1)} KB)`);
};
