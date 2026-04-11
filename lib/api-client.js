'use strict';

/**
 * GL.iNet Router API Client (standalone, Node.js)
 *
 * Wraps lib/auth.js to provide the same namespaced API as lib/api.js,
 * but as a standalone authenticated client (no Vue dependency).
 *
 * Usage:
 *   const { createClient } = require('gl-sdk4-plugin-kit/lib/api-client');
 *   const router = await createClient('192.168.8.1', 'mypassword');
 *   const info = await router.system.getInfo();
 *   const status = await router.system.getStatus();
 */

var auth = require('./auth');

/**
 * Build a namespace object whose methods call `rpc(module, snakeMethod, params)`.
 * Mirrors the makeNs factory in lib/api.js but without the .catch(null) swallow.
 *
 * @param {function} rpc - Bound RPC caller (module, func, params) => Promise
 * @param {string}   mod - RPC module name (e.g. "system", "wg-client")
 * @param {string[]} methods - camelCase method names
 * @returns {object} Namespace with one function per method
 */
function makeNs(rpc, mod, methods) {
  var ns = {};
  methods.forEach(function(m) {
    var snake = m.replace(/[A-Z]/g, function(c) { return '_' + c.toLowerCase(); });
    ns[m] = function(params) { return rpc(mod, snake, params || {}); };
  });
  return ns;
}

/**
 * Create an authenticated API client for a GL.iNet router.
 *
 * @param {string} host - Router IP or hostname (e.g. "192.168.8.1")
 * @param {string} password - Admin password
 * @param {string} [username="root"] - Username
 * @returns {Promise<object>} Client object with `.sid`, `.host`, and namespaced API methods
 */
async function createClient(host, password, username) {
  var session = await auth.login(host, password, username || 'root');
  var sid = session.sid;

  function rpc(module, func, params) {
    return auth.call(host, sid, module, func, params || {});
  }

  return {
    /** Active session ID */
    sid: sid,

    /** Router host used for this client */
    host: host,

    /** Raw RPC call — rpc(module, func, params) */
    rpc: rpc,

    // ── System ────────────────────────────────────────────────────────
    system: makeNs(rpc, 'system', [
      'getStatus', 'getInfo', 'getLoad', 'getTimezoneConfig', 'getUsb3Disable',
      'setPassword', 'setTimezoneConfig', 'setUsb3Disable', 'reboot', 'resetFirmware'
    ]),

    // ── VPN Client (tunnel manager) ──────────────────────────────────
    vpnClient: makeNs(rpc, 'vpn-client', [
      'getStatus', 'getAllConfigList', 'getTunnel', 'getConnectionMethods', 'getVpnUsingStatus',
      'addTunnel', 'setTunnel', 'removeTunnel', 'setDefaultTunnel', 'setGlobalMode',
      'setOptions', 'setTapS2s', 'setSingleMac', 'startRandomClient', 'stop',
      'orderTunnel', 'checkDomainOnline'
    ]),

    // ── WireGuard Client ─────────────────────────────────────────────
    wgClient: makeNs(rpc, 'wg-client', [
      'getGroupList', 'getConfigList', 'addConfig', 'setConfig', 'removeConfig',
      'addGroup', 'setGroup', 'removeGroup', 'clearConfigList', 'clearUserPass',
      'checkConfig', 'confirmConfig'
    ]),

    // ── WireGuard Client (provider accounts) ─────────────────────────
    wgClientProvider: makeNs(rpc, 'wg_client', [
      'genKey', 'getMaxClient', 'getProviderUserInfo', 'createProviderAccount',
      'updateProviderConfig'
    ]),

    // ── WireGuard Server ─────────────────────────────────────────────
    wgServer: makeNs(rpc, 'wg-server', [
      'getConfig', 'getSetting', 'getPeerList', 'setConfig', 'setSetting',
      'addPeer', 'setPeer', 'removePeer', 'generateKey', 'generatePeer',
      'generatePublickey', 'start', 'stop'
    ]),

    // ── OpenVPN Client ───────────────────────────────────────────────
    ovpnClient: makeNs(rpc, 'ovpn-client', [
      'getGroupList', 'getConfigList', 'getRecommendConfig', 'getThirdConfig',
      'addConfig', 'setConfig', 'removeConfig', 'addGroup', 'setGroup', 'removeGroup',
      'clearConfigList', 'clearUserPass', 'checkConfig', 'confirmConfig'
    ]),

    // ── OpenVPN Server ───────────────────────────────────────────────
    ovpnServer: makeNs(rpc, 'ovpn-server', [
      'getConfig', 'getSetting', 'getUserList', 'setConfig', 'setSetting',
      'addUser', 'removeUser', 'exportConfig', 'generateCertificate'
    ]),

    // ── Wi-Fi ────────────────────────────────────────────────────────
    wifi: makeNs(rpc, 'wifi', [
      'getStatus', 'getConfig', 'setConfig', 'setTxpower', 'getMloConfig', 'setMloConfig'
    ]),

    // ── Clients ──────────────────────────────────────────────────────
    clients: makeNs(rpc, 'clients', [
      'getStatus', 'getList', 'setInfo', 'removeOffline', 'cleanTraffic'
    ]),

    // ── Firewall ─────────────────────────────────────────────────────
    firewall: makeNs(rpc, 'firewall', [
      'getPortForwardList', 'getRuleList', 'getZoneList', 'getDmz', 'getWanAccess',
      'addPortForward', 'setPortForward', 'removePortForward', 'orderPortForward',
      'addRule', 'setRule', 'removeRule', 'setDmz', 'setWanAccess'
    ]),

    // ── DNS ──────────────────────────────────────────────────────────
    dns: makeNs(rpc, 'dns', [
      'getConfig', 'getInfo', 'getHost', 'setConfig', 'setHost'
    ]),

    // ── LAN / DHCP ───────────────────────────────────────────────────
    lan: makeNs(rpc, 'lan', [
      'getConfigList', 'getStaticBindList', 'getWanInfo',
      'setConfig', 'addStaticBind', 'setStaticBind', 'removeStaticBind'
    ]),

    // ── Network ──────────────────────────────────────────────────────
    network: makeNs(rpc, 'network', [
      'getAdvanceConfig', 'getNetnatConfig', 'getArpList', 'getAvailableAddressList',
      'checkWanCable', 'setAdvanceConfig', 'setNetnatConfig'
    ]),

    // ── Cable / WAN ──────────────────────────────────────────────────
    cable: makeNs(rpc, 'cable', [
      'getConfig', 'getPortsConfig', 'getPortsStatus', 'getStatus',
      'setConfig', 'setPortConfig', 'initStatus', 'wanProtoDetect'
    ]),

    // ── Repeater ─────────────────────────────────────────────────────
    repeater: makeNs(rpc, 'repeater', [
      'getStatus', 'getConfig', 'getSavedApList', 'getChannelPrompt',
      'scan', 'connect', 'disconnect', 'setConfig', 'removeSavedAp',
      'setChannelPrompt', 'enterBareMode', 'exitBareMode'
    ]),

    // ── USB Tethering ────────────────────────────────────────────────
    tethering: makeNs(rpc, 'tethering', [
      'getConfig', 'getStatus', 'setConnect', 'disconnect'
    ]),

    // ── Network Mode ─────────────────────────────────────────────────
    netmode: makeNs(rpc, 'netmode', [
      'getMode', 'setMode'
    ]),

    // ── Tailscale ────────────────────────────────────────────────────
    tailscale: makeNs(rpc, 'tailscale', [
      'getStatus', 'getConfig', 'getExitNodeList', 'getAuthUrl', 'setConfig', 'logout'
    ]),

    // ── ZeroTier ─────────────────────────────────────────────────────
    zerotier: makeNs(rpc, 'zerotier', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    // ── Tor ──────────────────────────────────────────────────────────
    tor: makeNs(rpc, 'tor', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    // ── AdGuard Home ─────────────────────────────────────────────────
    adguardhome: makeNs(rpc, 'adguardhome', [
      'getConfig', 'setConfig'
    ]),

    // ── Dynamic DNS ──────────────────────────────────────────────────
    ddns: makeNs(rpc, 'ddns', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    // ── GoodCloud ────────────────────────────────────────────────────
    cloud: makeNs(rpc, 'cloud', [
      'getConfig', 'setConfig', 'unbind'
    ]),

    // ── LED ──────────────────────────────────────────────────────────
    led: makeNs(rpc, 'led', [
      'getConfig', 'setConfig'
    ]),

    // ── Fan ──────────────────────────────────────────────────────────
    fan: makeNs(rpc, 'fan', [
      'getStatus', 'getConfig', 'setConfig'
    ]),

    // ── Timers (LED, reboot, Wi-Fi, screen) ──────────────────────────
    timer: makeNs(rpc, 'timer', [
      'getLed', 'getReboot', 'getWifi', 'getScreen',
      'setLed', 'setReboot', 'setWifi', 'setScreen'
    ]),

    // ── Plugins / Packages ───────────────────────────────────────────
    plugins: makeNs(rpc, 'plugins', [
      'getConfig', 'getList', 'getRepositoryStatus', 'getPackageInfo',
      'installPackage', 'removePackage', 'setConfig', 'updateRepository'
    ]),

    // ── Parental Control ─────────────────────────────────────────────
    parentalControl: makeNs(rpc, 'parental-control', [
      'getConfig', 'getStatus', 'getMode', 'getAppList', 'getBrief',
      'setConfig', 'setMode', 'setBrief', 'addGroup', 'setGroup', 'removeGroup',
      'addRule', 'setRule', 'removeRule', 'checkBlacklistOnline'
    ]),

    // ── QoS / Speed Limits ───────────────────────────────────────────
    qos: makeNs(rpc, 'qos', [
      'getConfig', 'setSpeedLimitRule', 'removeSpeedLimitRule'
    ]),

    // ── MAC Blacklist / Whitelist ────────────────────────────────────
    blackWhiteList: makeNs(rpc, 'black_white_list', [
      'getConfig', 'setConfig', 'setSingleMac'
    ]),

    // ── Hardware Switch Button ───────────────────────────────────────
    switchButton: makeNs(rpc, 'switch-button', [
      'getConfig', 'getFuncs', 'setConfig', 'checkSyncStatus'
    ]),

    // ── Local Access (SSH, HTTP, HTTPS) ──────────────────────────────
    localAccess: makeNs(rpc, 'local-access', [
      'getConfig', 'setConfig'
    ]),

    // ── LuCI ─────────────────────────────────────────────────────────
    luci: makeNs(rpc, 'luci', [
      'getStatus', 'installLuci', 'uninstallLuci'
    ]),

    // ── Log Reader ───────────────────────────────────────────────────
    logread: makeNs(rpc, 'logread', [
      'getSystemLog', 'getKernelLog', 'getCrashLog', 'getNginxLog', 'getEsimLog',
      'getModuleName', 'getConfig', 'setConfig', 'exportLogs', 'removeCrashLog'
    ]),

    // ── Firmware Upgrade ─────────────────────────────────────────────
    upgrade: makeNs(rpc, 'upgrade', [
      'getConfig', 'setConfig', 'checkFirmwareOnline', 'checkFirmwareLocal',
      'checkCellularOnline', 'checkCellularLocal', 'getOnlineUpgradeStatus',
      'getCellularUpgradeStatus', 'resetCellularUpgradeStatus',
      'upgradeOnline', 'upgradeLocal'
    ]),

    // ── UI ───────────────────────────────────────────────────────────
    ui: makeNs(rpc, 'ui', [
      'getMenuList', 'getRemoteLangs', 'setLang', 'setInitedInternet', 'updateLangs'
    ]),

    // ── IPv6 ─────────────────────────────────────────────────────────
    ipv6: makeNs(rpc, 'ipv6', [
      'getIpv6', 'setIpv6'
    ]),

    // ── IGMP Snooping ────────────────────────────────────────────────
    igmp: makeNs(rpc, 'igmp', [
      'getConfig', 'setConfig'
    ]),

    // ── Multi-WAN ────────────────────────────────────────────────────
    kmwan: makeNs(rpc, 'kmwan', [
      'getConfig', 'getStatus', 'getSensitivity',
      'setConfig', 'setInterface', 'setSensitivity'
    ]),

    // ── Edge Router ──────────────────────────────────────────────────
    edgerouter: makeNs(rpc, 'edgerouter', [
      'getConfig', 'getStatus', 'setConfig'
    ]),

    // ── Remote Terminal (rtty) ───────────────────────────────────────
    rtty: makeNs(rpc, 'rtty', [
      'getConfig', 'setConfig'
    ]),

    // ── SMS Forwarding ───────────────────────────────────────────────
    smsForward: makeNs(rpc, 'sms-forward', [
      'getConfig', 'setEmail', 'setPhoneNumber'
    ]),

    // ── Cellular Modem ───────────────────────────────────────────────
    modem: makeNs(rpc, 'modem', [
      'getInfo', 'getStatus', 'getSimConfig', 'getSlotConfig', 'getCellsInfo',
      'getCellTower', 'getTrafficConfig', 'getOperatorConfig', 'getDebugMsg',
      'getProfileList', 'getApnPollEnabled', 'getSimcardInfo', 'getSmsList',
      'setSimConfig', 'setSlotConfig', 'setConnect', 'disconnect', 'setSimPinCode',
      'setCellTower', 'scanCellTower', 'scanOperatorList', 'setOperatorConfig',
      'setApnPollEnabled', 'setTrafficConfig', 'rebootModem', 'sendAtCommand',
      'sendSms', 'setSms', 'removeSms'
    ]),

    // ── AstroWarp Tunnel ─────────────────────────────────────────────
    mptun: makeNs(rpc, 'mptun', [
      'getConfig', 'getToken', 'setConfig'
    ]),

    // ── Bark (parental-control provider) ─────────────────────────────
    bark: makeNs(rpc, 'bark', [
      'getConfig', 'getStatus', 'setConfig', 'logout'
    ]),

    // ── MVAS (multi-SIM virtual access) ──────────────────────────────
    mvas: makeNs(rpc, 'mvas', [
      'getConnectInfo', 'setConnectSlotNet', 'disconnectSlotNet', 'switchSimSlot'
    ])
  };
}

module.exports = { createClient };
