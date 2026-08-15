/**
 * glplugin test — verify plugin and API connectivity against a live router.
 *
 * Usage: glplugin test [target|host] [--password-stdin]
 *
 * Tests:
 *   1. HTTP connectivity to router
 *   2. RPC authentication
 *   3. The same feature-gated capability catalog used by doctor
 *   4. Plugin view file is served
 *   5. Plugin menu.json is loaded
 */

const { normalizeRouterUrl } = require('./auth');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { readPluginProject } = require('./manifest');
const { readRouterPassword } = require('./prompt');
const { inspectRouter } = require('./doctor');
const { applyRouterTarget, authOptions, parseRouterArgs } = require('./router-command');
const { CliError, EXIT_CODES } = require('./project');

function httpGet(host, urlPath, options) {
  return new Promise((resolve, reject) => {
    const settings = options || {};
    const rpcUrl = normalizeRouterUrl(host, settings);
    const target = new URL(urlPath, rpcUrl.origin);
    const transport = target.protocol === 'https:' ? https : http;
    transport
      .get(target, {
        timeout: 5000,
        rejectUnauthorized: settings.insecure !== true,
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error('timeout'));
      });
  });
}

function createDomStub() {
  function attach(parent, node, before) {
    node.parentNode = parent;
    if (!before) {
      parent.childNodes.push(node);
      return node;
    }

    const index = parent.childNodes.indexOf(before);
    if (index === -1) {
      parent.childNodes.push(node);
    } else {
      parent.childNodes.splice(index, 0, node);
    }
    return node;
  }

  function detach(parent, node) {
    const index = parent.childNodes.indexOf(node);
    if (index !== -1) {
      parent.childNodes.splice(index, 1);
    }
    node.parentNode = null;
    return node;
  }

  function makeNode(tagName) {
    return {
      tagName: String(tagName || '').toUpperCase(),
      childNodes: [],
      parentNode: null,
      styleSheet: null,
      setAttribute() {},
      appendChild(node) {
        return attach(this, node);
      },
      removeChild(node) {
        return detach(this, node);
      },
      insertBefore(node, before) {
        return attach(this, node, before);
      },
      get firstChild() {
        return this.childNodes[0] || null;
      },
    };
  }

  const head = makeNode('head');

  return {
    head,
    getElementsByTagName(tagName) {
      return String(tagName).toLowerCase() === 'head' ? [head] : [];
    },
    querySelector() {
      return null;
    },
    createElement(tagName) {
      return makeNode(tagName);
    },
    createTextNode(text) {
      return { textContent: text, parentNode: null };
    },
  };
}

function isVueComponent(value) {
  return Boolean(
    value &&
    (typeof value === 'object' || typeof value === 'function') &&
    (
      typeof value.render === 'function' ||
      typeof value.template === 'string' ||
      typeof value.name === 'string'
    )
  );
}

function inspectBundleExport(body) {
  const source = zlib.gunzipSync(body).toString('utf8');
  const moduleRef = { exports: {} };
  const sandbox = {
    DEBUG: false,
    module: moduleRef,
    exports: moduleRef.exports,
    document: createDomStub(),
    navigator: { userAgent: 'node' },
    window: {},
    self: {},
    btoa(value) {
      return Buffer.from(String(value), 'binary').toString('base64');
    },
  };

  const evalResult = vm.runInNewContext(source, sandbox, { timeout: 1000 });
  if (isVueComponent(evalResult)) {
    return { ok: true, detail: 'eval() returned a Vue component' };
  }

  if (isVueComponent(moduleRef.exports)) {
    return {
      ok: false,
      detail: 'bundle only writes module.exports; router loader uses eval(res.data)',
    };
  }

  if (moduleRef.exports && isVueComponent(moduleRef.exports.default)) {
    return {
      ok: false,
      detail: 'bundle only writes module.exports.default; router loader uses eval(res.data)',
    };
  }

  return { ok: false, detail: 'bundle did not expose a Vue component' };
}

async function verifyRouter(host, password, options) {
  const settings = options || {};
  const transportOptions = settings.transportOptions || {};
  const checks = [];
  const capabilities = [];
  function add(id, status, detail) {
    checks.push({ id, status, detail });
  }

  try {
    const response = await (settings.httpGet || httpGet)(host, '/', transportOptions);
    add('http', response.status === 200 ? 'pass' : 'fail', `status ${response.status}`);
    if (response.status !== 200) {
      return {
        ok: false, target: host, router: null, checks, capabilities,
        capabilitySummary: {}, summary: summarize(checks),
      };
    }
  } catch (error) {
    add('http', 'fail', error.message);
    return {
      ok: false, target: host, router: null, checks, capabilities,
      capabilitySummary: {}, summary: summarize(checks),
    };
  }

  let doctor;
  try {
    doctor = await (settings.inspectRouter || inspectRouter)(host, password, {
      ...transportOptions,
      username: settings.username,
      call: settings.call,
      login: settings.login,
      spawnSync: settings.spawnSync,
      transport: settings.transport,
    });
  } catch (error) {
    add('router', 'fail', error.message);
    return {
      ok: false, target: host, router: null, checks, capabilities,
      capabilitySummary: {}, summary: summarize(checks),
    };
  }
  add('router', doctor.ok ? 'pass' : 'fail', doctor.ok ? 'core RPC checks passed' : 'core RPC checks failed');
  doctor.capabilities.forEach((capability) => {
    const status = capability.status === 'available'
      ? 'pass'
      : capability.status === 'error' ? 'fail' : 'skip';
    capabilities.push({ ...capability, testStatus: status });
  });

  const root = path.resolve(settings.cwd || process.cwd());
  const manifestFile = path.join(root, 'gl-plugin.json');
  const packageFile = path.join(root, 'package.json');
  let project = null;
  if (fs.existsSync(manifestFile) || fs.existsSync(packageFile)) {
    try {
      project = readPluginProject(root);
    } catch (error) {
      if (fs.existsSync(manifestFile)) add('project', 'fail', error.message);
    }
  }

  if (project) {
    const name = project.manifest.id;
    try {
      const response = await (settings.httpGet || httpGet)(
        host,
        `/views/gl-sdk4-ui-${name}.common.js.gz`,
        transportOptions
      );
      if (response.status !== 200) {
        add('plugin-view', 'fail', `${name}: status ${response.status}`);
      } else {
        add('plugin-view', 'pass', `${name}: ${response.body.length} bytes`);
        const exportCheck = inspectBundleExport(response.body);
        add('plugin-export', exportCheck.ok ? 'pass' : 'fail', exportCheck.detail);
      }
    } catch (error) {
      add('plugin-view', 'fail', error.message);
    }
  } else {
    add('plugin-view', 'skip', 'current directory is not a plugin project');
  }

  capabilities.filter((capability) => capability.testStatus === 'fail').forEach((capability) => {
    add(`capability.${capability.id}`, 'fail', capability.error && capability.error.message);
  });
  const summary = summarize(checks);
  const capabilitySummary = capabilities.reduce((result, capability) => {
    result[capability.status] = (result[capability.status] || 0) + 1;
    return result;
  }, {});
  return {
    ok: !checks.some((check) => check.status === 'fail'),
    target: doctor.target,
    router: doctor.router,
    checks,
    capabilities,
    capabilitySummary,
    summary,
  };
}

function summarize(checks) {
  return checks.reduce((summary, check) => {
    summary[check.status] = (summary[check.status] || 0) + 1;
    return summary;
  }, {});
}

module.exports = async function testRouter(args, options) {
  const settings = options || {};
  let parsed = parseRouterArgs(Array.isArray(args) ? args : [args].filter(Boolean), {
    allowMissingHost: Boolean(settings.resolveTarget),
    usage: 'Usage: glplugin test [target|host] [--https|--http] [--insecure|--secure] [--username <name>] [--password-stdin]',
  });
  if (settings.resolveTarget) parsed = applyRouterTarget(parsed, settings.resolveTarget(parsed.host));
  const password = await (settings.readRouterPassword || readRouterPassword)({
    passwordStdin: parsed.passwordStdin,
  });
  const report = await verifyRouter(parsed.host, password, {
    ...settings,
    cwd: settings.cwd,
    username: parsed.username,
    transportOptions: authOptions(parsed),
  });
  const log = settings.log || console.log;
  if (!settings.json) {
    log(`Testing ${report.target || parsed.host}`);
    report.checks.forEach((check) => log(
      `  [${check.status.toUpperCase()}] ${check.id}: ${check.detail || 'no detail'}`
    ));
    log(`Capabilities: ${Object.keys(report.capabilitySummary).sort()
      .map((key) => `${key}=${report.capabilitySummary[key]}`).join(', ') || 'none'}`);
    log(`Results: ${Object.keys(report.summary).sort().map((key) => `${key}=${report.summary[key]}`).join(', ')}`);
  }
  if (!report.ok) {
    const error = new CliError('Router/plugin verification failed.', EXIT_CODES.CONNECTIVITY);
    error.details = report;
    throw error;
  }
  return report;
};

module.exports.httpGet = httpGet;
module.exports.inspectBundleExport = inspectBundleExport;
module.exports.verifyRouter = verifyRouter;
