'use strict';

const { createNamespacedApi } = require('./api-factory');

/**
 * Create the namespaced SDK4 API for a Vue plugin.
 * RPC rejections are preserved so callers can distinguish failures from empty data.
 *
 * @param {function} rpc Vue $rpcRequest-compatible function
 * @returns {object} Namespaced API
 */
function createGlApi(rpc) {
  return createNamespacedApi(function(module, method, params) {
    return rpc('call', ['sid', module, method, params]);
  });
}

const glApiMixin = {
  beforeCreate: function() {
    const vm = this;
    this.glApi = createGlApi(function(method, params) {
      return vm.$rpcRequest(method, params);
    });
  }
};

exports.createGlApi = createGlApi;
exports.glApiMixin = glApiMixin;
