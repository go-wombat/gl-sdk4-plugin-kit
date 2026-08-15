'use strict';

const { call, login, normalizeRouterUrl } = require('./auth');
const capabilities = require('./doctor-capabilities');
const { readRouterPassword } = require('./prompt');
const { applyRouterTarget, authOptions, parseRouterArgs } = require('./router-command');
const { CliError, EXIT_CODES } = require('./project');

function serializeError(error) {
  const result = { message: error && error.message ? error.message : String(error) };
  if (error && error.code !== undefined) result.code = error.code;
  if (error && error.data !== undefined) result.data = error.data;
  if (error && error.httpStatus !== undefined) result.http_status = error.httpStatus;
  return result;
}

function getGateState(definition, systemInfo) {
  if (!definition.gate) return { state: 'unknown' };
  const group = systemInfo[definition.gate.source];
  if (!group || !Object.prototype.hasOwnProperty.call(group, definition.gate.key)) {
    return { state: 'unknown' };
  }

  const value = group[definition.gate.key];
  return {
    state: value === false || value === '' || value === null ? 'unsupported' : 'supported',
    source: `system.get_info.${definition.gate.source}.${definition.gate.key}`,
  };
}

function isMissingMethod(error) {
  return error && (error.code === -32601 || error.code === -32001);
}

function sortedEnabledFeatures(group) {
  if (!group || typeof group !== 'object') return [];
  return Object.keys(group).filter((key) => Boolean(group[key])).sort();
}

function normalizeRouterInfo(info, status) {
  const board = info.board_info || {};
  const system = status.system || {};
  const firmwareVersion = info.firmware_version || 'unknown';
  const majorMatch = String(firmwareVersion).match(/^(\d+)/);

  return {
    model: board.model || info.model || 'unknown',
    hostname: board.hostname || 'unknown',
    vendor: info.vendor || 'unknown',
    firmware_version: firmwareVersion,
    firmware_type: info.firmware_type || 'unknown',
    hardware_version: info.hardware_version || 'unknown',
    architecture: board.architecture || 'unknown',
    kernel_version: board.kernel_version || 'unknown',
    openwrt_version: board.openwrt_version || 'unknown',
    network_mode: system.mode === undefined ? 'unknown' : system.mode,
    software_features: sortedEnabledFeatures(info.software_feature),
    hardware_features: sortedEnabledFeatures(info.hardware_feature),
    sdk_generation: majorMatch && majorMatch[1] === '4' ? 'SDK4' : 'unverified',
  };
}

async function probeCapability(definition, context) {
  const gate = getGateState(definition, context.systemInfo);
  if (gate.state === 'unsupported') {
    return {
      id: definition.id,
      label: definition.label,
      rpc: `${definition.module}.${definition.rpcMethod}`,
      status: 'not-supported',
      reason: `disabled by ${gate.source}`,
    };
  }

  try {
    await context.rpcCall(
      context.host,
      context.sid,
      definition.module,
      definition.rpcMethod,
      {},
      context.transportOptions
    );
    return {
      id: definition.id,
      label: definition.label,
      rpc: `${definition.module}.${definition.rpcMethod}`,
      status: 'available',
      declared: gate.state === 'supported' ? 'supported' : 'unknown',
    };
  } catch (error) {
    return {
      id: definition.id,
      label: definition.label,
      rpc: `${definition.module}.${definition.rpcMethod}`,
      status: isMissingMethod(error) ? 'unavailable' : 'error',
      error: serializeError(error),
    };
  }
}

async function inspectRouter(host, password, options) {
  const settings = options || {};
  const transportOptions = {
    https: settings.https,
    insecure: settings.insecure,
    timeout: settings.timeout,
    transport: settings.transport,
    spawnSync: settings.spawnSync,
  };
  const authenticate = settings.login || login;
  const rpcCall = settings.call || call;
  const endpoint = normalizeRouterUrl(host, transportOptions);
  const startedAt = new Date().toISOString();
  const session = await authenticate(host, password, settings.username || 'root', transportOptions);
  const report = {
    ok: false,
    checked_at: startedAt,
    target: endpoint.origin,
    transport: {
      protocol: endpoint.protocol.slice(0, -1),
      tls_verification: endpoint.protocol === 'https:'
        ? (settings.insecure ? 'disabled-by-user' : 'enabled')
        : 'not-applicable',
    },
    auth: session.auth,
    router: null,
    capabilities: [],
    errors: [],
  };

  const coreResults = await Promise.allSettled([
    rpcCall(host, session.sid, 'system', 'get_info', {}, transportOptions),
    rpcCall(host, session.sid, 'system', 'get_status', {}, transportOptions),
  ]);

  coreResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      report.errors.push({
        rpc: index === 0 ? 'system.get_info' : 'system.get_status',
        ...serializeError(result.reason),
      });
    }
  });

  if (coreResults[0].status !== 'fulfilled' || coreResults[1].status !== 'fulfilled') {
    return report;
  }

  const systemInfo = coreResults[0].value || {};
  const systemStatus = coreResults[1].value || {};
  report.router = normalizeRouterInfo(systemInfo, systemStatus);
  report.capabilities = await Promise.all(capabilities.map((definition) => probeCapability(definition, {
    host,
    sid: session.sid,
    systemInfo,
    rpcCall,
    transportOptions,
  })));

  report.summary = report.capabilities.reduce((summary, capability) => {
    summary[capability.status] = (summary[capability.status] || 0) + 1;
    return summary;
  }, {});
  report.ok = true;
  return report;
}

function value(valueToPrint) {
  if (Array.isArray(valueToPrint)) return valueToPrint.length ? valueToPrint.join(', ') : 'none reported';
  return valueToPrint === undefined || valueToPrint === null || valueToPrint === ''
    ? 'unknown'
    : String(valueToPrint);
}

function formatDoctorReport(report) {
  const lines = [
    '',
    'GL.iNet Plugin Doctor',
    `Target: ${report.target}`,
    `Auth: ${report.auth.name} (challenge.alg=${report.auth.alg})`,
    `TLS verification: ${report.transport.tls_verification}`,
  ];

  if (report.router) {
    lines.push(
      '',
      'Router',
      `  Model: ${value(report.router.model)}`,
      `  Hostname: ${value(report.router.hostname)}`,
      `  Firmware: ${value(report.router.firmware_version)} (${value(report.router.firmware_type)})`,
      `  SDK generation: ${value(report.router.sdk_generation)}`,
      `  OpenWrt: ${value(report.router.openwrt_version)}`,
      `  Kernel: ${value(report.router.kernel_version)}`,
      `  Architecture: ${value(report.router.architecture)}`,
      `  Network mode: ${value(report.router.network_mode)}`,
      `  Software features: ${value(report.router.software_features)}`,
      `  Hardware features: ${value(report.router.hardware_features)}`
    );
  }

  lines.push('', 'Capabilities');
  report.capabilities.forEach((capability) => {
    const marker = capability.status === 'available'
      ? 'PASS'
      : capability.status === 'error' ? 'WARN' : 'SKIP';
    const detail = capability.reason || (capability.error && capability.error.message) || capability.rpc;
    lines.push(`  [${marker}] ${capability.label}: ${capability.status} (${detail})`);
  });

  report.errors.forEach((error) => {
    lines.push(`  [FAIL] ${error.rpc}: ${error.message}`);
  });

  if (report.summary) {
    const counts = Object.keys(report.summary).sort().map((key) => `${key}=${report.summary[key]}`);
    lines.push('', `Summary: ${counts.join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function doctor(args, options) {
  const settings = options || {};
  let parsed = parseRouterArgs(args || [], {
    allowJson: true,
    allowMissingHost: Boolean(settings.resolveTarget),
    usage: 'Usage: glplugin doctor [target|host] [--https|--http] [--insecure|--secure] [--username <name>] [--password-stdin]',
  });
  if (settings.resolveTarget) parsed = applyRouterTarget(parsed, settings.resolveTarget(parsed.host));
  const readPassword = settings.readRouterPassword || readRouterPassword;
  const password = await readPassword({ passwordStdin: parsed.passwordStdin });
  let report;
  try {
    report = await inspectRouter(parsed.host, password, {
      ...authOptions(parsed),
      username: parsed.username,
      call: settings.call,
      login: settings.login,
      spawnSync: settings.spawnSync,
      timeout: settings.timeout,
      transport: settings.transport,
    });
  } catch (cause) {
    const error = new CliError(`Router doctor failed: ${cause.message}`, EXIT_CODES.CONNECTIVITY);
    error.cause = cause;
    throw error;
  }

  if (!(settings.json || parsed.json)) {
    const write = settings.output && settings.output.write
      ? settings.output.write
      : (value) => process.stdout.write(value);
    write(formatDoctorReport(report));
  }
  if (!report.ok) {
    const error = new CliError('Router doctor failed its core checks.', EXIT_CODES.CONNECTIVITY);
    error.details = report;
    throw error;
  }
  return report;
}

module.exports = doctor;
module.exports.formatDoctorReport = formatDoctorReport;
module.exports.inspectRouter = inspectRouter;
