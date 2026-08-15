'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const catalog = require('../lib/api-catalog');
const { createGlApi } = require('../lib/api');
const { createApiClient } = require('../lib/api-client');

function shape(api) {
  return Object.fromEntries(Object.keys(api).map(function(namespace) {
    return [namespace, Object.keys(api[namespace])];
  }));
}

test('catalog has the documented namespace and method counts', function() {
  const namespaces = Object.keys(catalog);
  const methods = namespaces.reduce(function(total, namespace) {
    return total + catalog[namespace].methods.length;
  }, 0);
  assert.equal(namespaces.length, 49);
  assert.equal(methods, 326);
});

test('Vue and Node APIs are generated from the same catalog', function() {
  const vueApi = createGlApi(function() { return Promise.resolve({}); });
  const nodeApi = createApiClient(function() { return Promise.resolve({}); });
  assert.deepEqual(shape(vueApi), shape(nodeApi));
});

test('Vue API converts method names and preserves RPC failures', async function() {
  const expectedError = new Error('rpc failed');
  const calls = [];
  const api = createGlApi(function(method, params) {
    calls.push([method, params]);
    return Promise.reject(expectedError);
  });

  await assert.rejects(api.system.getInfo({ detail: true }), function(error) {
    return error === expectedError;
  });
  assert.deepEqual(calls, [[
    'call',
    ['sid', 'system', 'get_info', { detail: true }],
  ]]);
});

test('Node API uses the same module and snake_case mapping', async function() {
  const calls = [];
  const api = createApiClient(function(module, method, params) {
    calls.push([module, method, params]);
    return Promise.resolve({ ok: true });
  });

  assert.deepEqual(await api.vpnClient.getAllConfigList(), { ok: true });
  assert.deepEqual(calls, [['vpn-client', 'get_all_config_list', {}]]);
});
