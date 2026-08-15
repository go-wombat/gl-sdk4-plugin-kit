'use strict';

const fs = require('fs');
const path = require('path');
const { PROFILES } = require('./manifest');
const { CliError, normalizePluginName } = require('./project');

const TEMPLATE_DIR = path.resolve(__dirname, '..', 'template');

function replaceTokens(value, tokens) {
  return Object.keys(tokens).reduce(function(result, token) {
    return result.split(token).join(tokens[token]);
  }, value);
}

function copyTemplate(sourceDir, targetDir, tokens, options) {
  const settings = options || {};
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (settings.exclude && settings.exclude.includes(entry.name)) continue;
    const targetName = entry.name === 'gitignore'
      ? '.gitignore'
      : replaceTokens(entry.name, tokens);
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, targetName);

    if (entry.isDirectory()) {
      copyTemplate(source, target, tokens);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(source, 'utf8');
      const mode = fs.statSync(source).mode & 0o777;
      fs.writeFileSync(target, replaceTokens(content, tokens), { mode });
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
  const profile = options && options.profile ? options.profile : 'ui-only';
  if (!PROFILES.includes(profile)) {
    throw new CliError(`Unsupported plugin profile: ${profile}`);
  }
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

  console.log(`Creating ${profile} plugin "${slug}"...`);
  copyTemplate(TEMPLATE_DIR, dir, tokens, { exclude: ['profiles'] });
  copyTemplate(path.join(TEMPLATE_DIR, 'profiles', profile), dir, tokens);

  console.log(`
  Plugin "${slug}" created!

  Next steps:
    cd ${slug}
    npm install
    npm run build
    npm run package
  `);

  return { dir, profile, slug, viewId: slug };
};

function parseInitArgs(args) {
  const values = Array.isArray(args) ? args : [];
  let name;
  let profile = 'ui-only';

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--profile') {
      if (!values[index + 1]) {
        throw new CliError('--profile requires ui-only or full-stack.');
      }
      profile = values[index + 1];
      index += 1;
    } else if (/^--[a-z]/i.test(value)) {
      throw new CliError(`Unknown init option: ${value}`);
    } else if (name) {
      throw new CliError('Usage: glplugin init <name> [--profile ui-only|full-stack]');
    } else {
      name = value;
    }
  }

  return { name, profile };
}

module.exports.cli = function initCli(args) {
  const parsed = parseInitArgs(args);
  return module.exports(parsed.name, { profile: parsed.profile });
};

module.exports.copyTemplate = copyTemplate;
module.exports.normalizePluginName = normalizePluginName;
module.exports.parseInitArgs = parseInitArgs;
