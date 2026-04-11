'use strict';

/**
 * GL.iNet Router API Mixin for Vue 2
 *
 * Provides typed API methods via `this.glApi` namespaces.
 * Each method calls this.$rpcRequest('call', ['sid', module, method, params])
 * and silently catches errors to prevent the global error popup.
 *
 * Usage:
 *   mixins: [require('gl-sdk4-plugin-kit/lib/api').glApiMixin]
 *   // then: this.glApi.system.getStatus()
 *
 * Or with a custom RPC function:
 *   var api = require('gl-sdk4-plugin-kit/lib/api').createGlApi(myRpcFn)
 */

function makeNs(rpc, mod, methods) {
  var ns = {};
  methods.forEach(function(m) {
    var snake = m.replace(/[A-Z]/g, function(c) { return '_' + c.toLowerCase(); });
    ns[m] = function(params) {
      return rpc('call', ['sid', mod, snake, params || {}])
        .then(function(r) { return r; })
        .catch(function() { return null; });
    };
  });
  return ns;
}

function createGlApi(rpc) {
  return {
    system: makeNs(rpc, 'system', [
      'getStatus', 'getInfo', 'getLoad', 'getTimezoneConfig', 'getUsb3Disable',
      'setPassword', 'setTimezoneConfig', 'setUsb3Disable', 'reboot', 'resetFirmware'
    ]),

    vpnClient: makeNs(rpc, 'vpn-client', [
      'getStatus', 'getAllConfigList', 'getTunnel', 'getConnectionMethods', 'getVpnUsingStatus',
      'addTunnel', 'setTunnel', 'removeTunnel', 'setDefaultTunnel', 'setGlobalMode',
      'setOptions', 'setTapS2s', 'setSingleMac', 'startRandomClient', 'stop',
      'orderTunnel', 'checkDomainOnline'
    ]),

    wgClient: makeNs(rpc, 'wg-client', [
      'getGroupList', 'getConfigList', 'addConfig', 'setConfig', 'removeConfig',
      'addGroup', 'setGroup', 'removeGroup', 'clearConfigList', 'clearUserPass',
      'checkConfig', 'confirmConfig'
    ]),

    wgClientProvider: makeNs(rpc, 'wg_client', [
      'genKey', 'getMaxClient', 'getProviderUserInfo', 'createProviderAccount',
      'updateProviderConfig'
    ]),

    wgServer: makeNs(rpc, 'wg-server', [
      'getConfig', 'getSetting', 'getPeerList', 'setConfig', 'setSetting',
      'addPeer', 'setPeer', 'removePeer', 'generateKey', 'generatePeer',
      'generatePublickey', 'start', 'stop'
    ]),

    ovpnClient: makeNs(rpc, 'ovpn-client', [
      'getGroupList', 'getConfigList', 'getRecommendConfig', 'getThirdConfig',
      'addConfig', 'setConfig', 'removeConfig', 'addGroup', 'setGroup', 'removeGroup',
      'clearConfigList', 'clearUserPass', 'checkConfig', 'confirmConfig'
    ]),

    ovpnServer: makeNs(rpc, 'ovpn-server', [
      'getConfig', 'getSetting', 'getUserList', 'setConfig', 'setSetting',
      'addUser', 'removeUser', 'exportConfig', 'generateCertificate'
    ]),

    wifi: makeNs(rpc, 'wifi', [
      'getStatus', 'getConfig', 'setConfig', 'setTxpower', 'getMloConfig', 'setMloConfig'
    ]),

    clients: makeNs(rpc, 'clients', [
      'getStatus', 'getList', 'setInfo', 'removeOffline', 'cleanTraffic'
    ]),

    firewall: makeNs(rpc, 'firewall', [
      'getPortForwardList', 'getRuleList', 'getZoneList', 'getDmz', 'getWanAccess',
      'addPortForward', 'setPortForward', 'removePortForward', 'orderPortForward',
      'addRule', 'setRule', 'removeRule', 'setDmz', 'setWanAccess'
    ]),

    dns: makeNs(rpc, 'dns', [
      'getConfig', 'getInfo', 'getHost', 'setConfig', 'setHost'
    ]),

    lan: makeNs(rpc, 'lan', [
      'getConfigList', 'getStaticBindList', 'getWanInfo',
      'setConfig', 'addStaticBind', 'setStaticBind', 'removeStaticBind'
    ]),

    network: makeNs(rpc, 'network', [
      'getAdvanceConfig', 'getNetnatConfig', 'getArpList', 'getAvailableAddressList',
      'checkWanCable', 'setAdvanceConfig', 'setNetnatConfig'
    ]),

    cable: makeNs(rpc, 'cable', [
      'getConfig', 'getPortsConfig', 'getPortsStatus', 'getStatus',
      'setConfig', 'setPortConfig', 'initStatus', 'wanProtoDetect'
    ]),

    repeater: makeNs(rpc, 'repeater', [
      'getStatus', 'getConfig', 'getSavedApList', 'getChannelPrompt',
      'scan', 'connect', 'disconnect', 'setConfig', 'removeSavedAp',
      'setChannelPrompt', 'enterBareMode', 'exitBareMode'
    ]),

    tethering: makeNs(rpc, 'tethering', [
      'getConfig', 'getStatus', 'setConnect', 'disconnect'
    ]),

    netmode: makeNs(rpc, 'netmode', [
      'getMode', 'setMode'
    ]),

    tailscale: makeNs(rpc, 'tailscale', [
      'getStatus', 'getConfig', 'getExitNodeList', 'getAuthUrl', 'setConfig', 'logout'
    ]),

    zerotier: makeNs(rpc, 'zerotier', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    tor: makeNs(rpc, 'tor', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    adguardhome: makeNs(rpc, 'adguardhome', [
      'getConfig', 'setConfig'
    ]),

    ddns: makeNs(rpc, 'ddns', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    cloud: makeNs(rpc, 'cloud', [
      'getConfig', 'setConfig', 'unbind'
    ]),

    led: makeNs(rpc, 'led', [
      'getConfig', 'setConfig'
    ]),

    fan: makeNs(rpc, 'fan', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    timer: makeNs(rpc, 'timer', [
      'getLed', 'getReboot', 'getWifi', 'getScreen',
      'setLed', 'setReboot', 'setWifi', 'setScreen'
    ]),

    plugins: makeNs(rpc, 'plugins', [
      'getConfig', 'getList', 'getRepositoryStatus', 'getPackageInfo',
      'installPackage', 'removePackage', 'setConfig', 'updateRepository'
    ]),

    parentalControl: makeNs(rpc, 'parental-control', [
      'getConfig', 'getStatus', 'getMode', 'getAppList', 'getBrief',
      'setConfig', 'setMode', 'setBrief', 'addGroup', 'setGroup', 'removeGroup',
      'addRule', 'setRule', 'removeRule', 'checkBlacklistOnline'
    ]),

    qos: makeNs(rpc, 'qos', [
      'getConfig', 'setSpeedLimitRule', 'removeSpeedLimitRule'
    ]),

    blackWhiteList: makeNs(rpc, 'black_white_list', [
      'getConfig', 'setConfig', 'setSingleMac'
    ]),

    switchButton: makeNs(rpc, 'switch-button', [
      'getConfig', 'getFuncs', 'setConfig', 'checkSyncStatus'
    ]),

    localAccess: makeNs(rpc, 'local-access', [
      'getConfig', 'setConfig'
    ]),

    luci: makeNs(rpc, 'luci', [
      'getStatus', 'installLuci', 'uninstallLuci'
    ]),

    logread: makeNs(rpc, 'logread', [
      'getSystemLog', 'getKernelLog', 'getCrashLog', 'getNginxLog', 'getEsimLog',
      'getModuleName', 'getConfig', 'setConfig', 'exportLogs', 'removeCrashLog'
    ]),

    upgrade: makeNs(rpc, 'upgrade', [
      'getConfig', 'setConfig', 'checkFirmwareOnline', 'checkFirmwareLocal',
      'checkCellularOnline', 'checkCellularLocal', 'getOnlineUpgradeStatus',
      'getCellularUpgradeStatus', 'resetCellularUpgradeStatus',
      'upgradeOnline', 'upgradeLocal'
    ]),

    ui: makeNs(rpc, 'ui', [
      'getMenuList', 'getRemoteLangs', 'setLang', 'setInitedInternet', 'updateLangs'
    ]),

    ipv6: makeNs(rpc, 'ipv6', [
      'getIpv6', 'setIpv6'
    ]),

    igmp: makeNs(rpc, 'igmp', [
      'getConfig', 'setConfig'
    ]),

    kmwan: makeNs(rpc, 'kmwan', [
      'getConfig', 'getStatus', 'getSensitivity',
      'setConfig', 'setInterface', 'setSensitivity'
    ]),

    edgerouter: makeNs(rpc, 'edgerouter', [
      'getConfig', 'getStatus', 'setConfig'
    ]),

    rtty: makeNs(rpc, 'rtty', [
      'getConfig', 'setConfig'
    ]),

    smsForward: makeNs(rpc, 'sms-forward', [
      'getConfig', 'setEmail', 'setPhoneNumber'
    ]),

    modem: makeNs(rpc, 'modem', [
      'getInfo', 'getStatus', 'getSimConfig', 'getSlotConfig', 'getCellsInfo',
      'getCellTower', 'getTrafficConfig', 'getOperatorConfig', 'getDebugMsg',
      'getProfileList', 'getApnPollEnabled', 'getSimcardInfo', 'getSmsList',
      'setSimConfig', 'setSlotConfig', 'setConnect', 'disconnect', 'setSimPinCode',
      'setCellTower', 'scanCellTower', 'scanOperatorList', 'setOperatorConfig',
      'setApnPollEnabled', 'setTrafficConfig', 'rebootModem', 'sendAtCommand',
      'sendSms', 'setSms', 'removeSms'
    ]),

    mptun: makeNs(rpc, 'mptun', [
      'getConfig', 'getToken', 'setConfig'
    ])
  };
}

var glApiMixin = {
  beforeCreate: function() {
    var vm = this;
    this.glApi = createGlApi(function(method, params) {
      return vm.$rpcRequest(method, params);
    });
  }
};

exports.createGlApi = createGlApi;
exports.glApiMixin = glApiMixin;
