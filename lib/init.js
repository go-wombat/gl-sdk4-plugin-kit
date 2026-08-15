'use strict';

const fs = require('fs');
const path = require('path');
const { CliError, normalizePluginName } = require('./project');

const TEMPLATE_DIR = path.resolve(__dirname, '..', 'template');

function replaceTokens(value, tokens) {
  return Object.keys(tokens).reduce(function(result, token) {
    return result.split(token).join(tokens[token]);
  }, value);
}

function copyTemplate(sourceDir, targetDir, tokens) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const targetName = entry.name === 'gitignore'
      ? '.gitignore'
      : replaceTokens(entry.name, tokens);
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, targetName);

    if (entry.isDirectory()) {
      copyTemplate(source, target, tokens);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(source, 'utf8');
      fs.writeFileSync(target, replaceTokens(content, tokens));
    }
  }
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map(function(word) { return word[0].toUpperCase() + word.slice(1); })
    .join(' ');
}

module.exports = function init(name, options) {
  if (!name) {
    throw new CliError('Plugin name required. Usage: glplugin init <name>');
  }

  const cwd = options && options.cwd ? path.resolve(options.cwd) : process.cwd();
  const slug = normalizePluginName(name);
  const dir = path.join(cwd, slug);

  if (fs.existsSync(dir)) {
    throw new CliError(`Directory "${slug}" already exists.`);
  }

  const tokens = {
    '__PLUGIN_ID__': slug,
    '__PLUGIN_TITLE__': titleFromSlug(slug),
    '__I18N_KEY__': slug,
  };

  console.log(`Creating plugin "${slug}"...`);
  copyTemplate(TEMPLATE_DIR, dir, tokens);

  console.log(`
  Plugin "${slug}" created!

  Next steps:
    cd ${slug}
    npm install
    npm run build
    npm run package
  `);

  return { dir, slug, viewId: slug };
};

module.exports.copyTemplate = copyTemplate;
module.exports.normalizePluginName = normalizePluginName;
