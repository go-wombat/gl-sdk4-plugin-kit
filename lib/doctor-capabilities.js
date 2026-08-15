'use strict';

const catalog = require('./api-catalog');
const { camelToSnake } = require('./api-factory');

const CAPABILITIES = [
  { id: 'clients', label: 'Client inventory', namespace: 'clients', method: 'getStatus' },
  { id: 'wifi', label: 'Wi-Fi management', namespace: 'wifi', method: 'getStatus' },
  { id: 'network', label: 'Network configuration', namespace: 'network', method: 'getAdvanceConfig' },
  { id: 'firewall', label: 'Firewall', namespace: 'firewall', method: 'getZoneList' },
  { id: 'dns', label: 'DNS', namespace: 'dns', method: 'getInfo' },
  { id: 'repeater', label: 'Repeater', namespace: 'repeater', method: 'getStatus' },
  { id: 'plugins', label: 'Plugin manager', namespace: 'plugins', method: 'getConfig' },
  { id: 'ui', label: 'Admin UI menu', namespace: 'ui', method: 'getMenuList' },
  {
    id: 'vpn-client', label: 'VPN client', namespace: 'vpnClient', method: 'getStatus',
    gate: { source: 'software_feature', key: 'vpn' }
  },
  {
    id: 'wireguard-client', label: 'WireGuard client', namespace: 'wgClient', method: 'getGroupList',
    gate: { source: 'software_feature', key: 'vpn' }
  },
  {
    id: 'openvpn-client', label: 'OpenVPN client', namespace: 'ovpnClient', method: 'getGroupList',
    gate: { source: 'software_feature', key: 'vpn' }
  },
  {
    id: 'adguardhome', label: 'AdGuard Home', namespace: 'adguardhome', method: 'getConfig',
    gate: { source: 'software_feature', key: 'adguard' }
  },
  {
    id: 'ipv6', label: 'IPv6', namespace: 'ipv6', method: 'getIpv6',
    gate: { source: 'software_feature', key: 'ipv6' }
  },
  {
    id: 'tor', label: 'Tor', namespace: 'tor', method: 'getStatus',
    gate: { source: 'software_feature', key: 'tor' }
  },
  { id: 'tailscale', label: 'Tailscale', namespace: 'tailscale', method: 'getStatus' },
  { id: 'zerotier', label: 'ZeroTier', namespace: 'zerotier', method: 'getStatus' },
  {
    id: 'fan', label: 'Fan control', namespace: 'fan', method: 'getStatus',
    gate: { source: 'hardware_feature', key: 'fan' }
  },
  {
    id: 'modem', label: 'Cellular modem', namespace: 'modem', method: 'getStatus',
    gate: { source: 'hardware_feature', key: 'build_in_modem' }
  },
  { id: 'sqm', label: 'Smart Queue Management (4.9+)', namespace: 'sqm', method: 'getConfig' },
  { id: 'dpi', label: 'Deep Packet Inspection (4.9+)', namespace: 'dpi', method: 'getDpiStatus' },
];

function resolveProbe(definition) {
  const namespace = catalog[definition.namespace];
  if (!namespace) throw new Error(`Unknown RPC namespace in doctor: ${definition.namespace}`);
  if (!namespace.methods.includes(definition.method)) {
    throw new Error(`Unknown RPC method in doctor: ${definition.namespace}.${definition.method}`);
  }
  return {
    ...definition,
    module: namespace.module,
    rpcMethod: camelToSnake(definition.method),
  };
}

module.exports = CAPABILITIES.map(resolveProbe);
