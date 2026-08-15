'use strict';

const auth = require('./auth');
const { createNamespacedApi } = require('./api-factory');

function createApiClient(rpc) {
  return createNamespacedApi(rpc);
}

/**
 * Create an authenticated standalone SDK4 API client.
 *
 * @param {string} host Router IP or hostname
 * @param {string} password Admin password
 * @param {string} [username="root"] Username
 * @param {object} [options] RPC transport options (`https`, `insecure`, `timeout`)
 * @returns {Promise<object>} Authenticated namespaced API client
 */
async function createClient(host, password, username, options) {
  const session = await auth.login(host, password, username || 'root', options);

  function rpc(module, method, params) {
    return auth.call(host, session.sid, module, method, params || {}, options);
  }

  return Object.assign(
    {
      sid: session.sid,
      host: host,
      auth: session.auth,
      rpc: rpc,
    },
    createApiClient(rpc)
  );
}

module.exports = { createApiClient, createClient };
