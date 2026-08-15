'use strict';

function readValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
}

function parseRouterArgs(args, options) {
  const settings = options || {};
  const parsed = {
    host: '',
    username: 'root',
    https: false,
    insecure: false,
    json: false,
    passwordStdin: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--username') {
      parsed.username = readValue(args, index, '--username');
      index += 1;
    } else if (argument.startsWith('--username=')) {
      parsed.username = argument.slice('--username='.length);
    } else if (argument === '--https') {
      parsed.https = true;
    } else if (argument === '--insecure') {
      parsed.insecure = true;
    } else if (argument === '--password-stdin') {
      parsed.passwordStdin = true;
    } else if (argument === '--json' && settings.allowJson) {
      parsed.json = true;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (!parsed.host) {
      parsed.host = argument;
    } else {
      throw new Error('Passwords and extra positional arguments are not accepted.');
    }
  }

  if (!parsed.host) throw new Error(settings.usage || 'Router host is required.');
  if (!parsed.username) throw new Error('Router username must not be empty.');
  return parsed;
}

function authOptions(parsed) {
  return {
    https: parsed.https,
    insecure: parsed.insecure,
  };
}

module.exports = { authOptions, parseRouterArgs };
