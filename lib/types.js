/**
 * @fileoverview JSDoc type definitions for GL.iNet RPC API responses.
 * Based on live testing against GL-MT3000 firmware 4.8.1.
 *
 * Usage:
 *   const { SystemGetInfo, SystemGetStatus } = require('gl-sdk4-plugin-kit/lib/types');
 *   // Types are only for JSDoc/IDE support — no runtime code.
 */

/**
 * Response from system.get_info
 * @typedef {object} SystemGetInfo
 * @property {BoardInfo} board_info
 * @property {string} firmware_version - e.g. "4.8.1"
 * @property {string} firmware_type - e.g. "release8"
 * @property {string} mac - e.g. "94:83:C4:xx:xx:xx"
 * @property {string} sn - Serial number
 * @property {number} cpu_num - Number of CPU cores
 * @property {string} country_code - e.g. "DE", "US"
 * @property {string} vendor - e.g. "GL.iNet"
 * @property {string} hardware_version
 * @property {HardwareFeature} hardware_feature
 * @property {SoftwareFeature} software_feature
 * @property {string[]} hidden_features
 * @property {boolean} ddns
 */

/**
 * @typedef {object} BoardInfo
 * @property {string} hostname - e.g. "GL-MT3000"
 * @property {string} model - e.g. "GL-MT3000"
 * @property {string} architecture - e.g. "ARMv8 Processor rev 4"
 * @property {string} kernel_version - e.g. "5.4.211"
 * @property {string} openwrt_version - e.g. "OpenWrt 21.02-SNAPSHOT"
 */

/**
 * @typedef {object} HardwareFeature
 * @property {boolean} fan - Has fan control
 * @property {boolean} mcu - Has MCU
 * @property {boolean} bluetooth - Has Bluetooth
 * @property {boolean} noled - LED disabled
 * @property {boolean} nand - NAND flash
 * @property {boolean} gps - Has GPS
 * @property {boolean} screen - Has screen
 * @property {boolean} hwnat - Hardware NAT support
 * @property {boolean} nowds - WDS disabled
 * @property {boolean} simo - SIM only
 * @property {boolean} rs485 - Has RS485
 * @property {string} wan - WAN interface (e.g. "eth0")
 * @property {string} lan - LAN interface (e.g. "eth1")
 * @property {string} usb - USB ports (e.g. "1-1,2-1")
 * @property {string} usb3 - USB3 port (e.g. "2-1")
 * @property {string} radio - Radio modules
 * @property {string} build_in_modem - Built-in modem
 * @property {string} slot - SIM slot type (e.g. "single")
 * @property {string} reset_button - GPIO for reset
 * @property {string} switch_button - GPIO for switch
 * @property {string} microsd - MicroSD slot
 * @property {string} usb_power - USB power control
 * @property {string} usb_reset - USB reset
 * @property {string} submodel
 * @property {number} modem_reset
 */

/**
 * @typedef {object} SoftwareFeature
 * @property {boolean} vpn
 * @property {boolean} tor
 * @property {boolean} nas
 * @property {boolean} adguard - AdGuard Home
 * @property {boolean} ipv6
 * @property {boolean} passthrough
 * @property {boolean} repeater_eap - WPA Enterprise repeater
 * @property {boolean} ids_ips - IDS/IPS
 * @property {boolean} sms_forward
 * @property {boolean} cellular_upgrade
 * @property {boolean} secondwan
 * @property {boolean} mlo
 * @property {boolean} ksmbd
 * @property {boolean} bark
 */

/**
 * Response from system.get_status
 * @typedef {object} SystemGetStatus
 * @property {SystemStatus} system
 * @property {NetworkInterface[]} network
 * @property {WifiInterface[]} wifi
 * @property {Service[]} service
 * @property {ClientCount[]} client
 */

/**
 * @typedef {object} SystemStatus
 * @property {number} uptime - Seconds since boot (float)
 * @property {number} timestamp - Unix timestamp
 * @property {string} tzoffset - Timezone offset (e.g. "+0200")
 * @property {number} mode - 0=router, 1=wds, 2=relay, 3=mesh, 4=ap, 6=passthrough
 * @property {string} lan_ip - LAN IP address (e.g. "192.168.14.1")
 * @property {string} lan_netmask - (e.g. "255.255.255.0")
 * @property {string} guest_ip - Guest network IP (e.g. "192.168.9.1")
 * @property {string} guest_netmask
 * @property {CpuStatus} cpu
 * @property {number} flash_total - Flash total in bytes
 * @property {number} flash_free - Flash free in bytes
 * @property {number} flash_app - Flash used by apps in bytes
 * @property {number} memory_total - RAM total in bytes
 * @property {number} memory_free - RAM free in bytes
 * @property {number} memory_buff_cache - RAM buffered/cached in bytes
 * @property {number[]} load_average - System load [1min, 5min, 15min] as floats
 * @property {boolean} netnat_enabled - Hardware NAT enabled
 * @property {boolean} ipv6_enabled
 * @property {boolean} ddns_enabled
 */

/**
 * @typedef {object} CpuStatus
 * @property {number} temperature - CPU temperature in Celsius
 */

/**
 * @typedef {object} ClientCount
 * @property {number} wireless_total
 * @property {number} cable_total
 */

/**
 * @typedef {object} NetworkInterface
 * @property {string} interface - Interface name (e.g. "wan", "wwan")
 * @property {boolean} up - Interface is up
 * @property {boolean} online - Has internet connectivity
 */

/**
 * @typedef {object} WifiInterface
 * @property {string} ssid - Network name
 * @property {string} band - "2G" or "5G"
 * @property {number} channel - Wi-Fi channel
 * @property {string} encryption - e.g. "sae-mixed"
 * @property {string} passwd - Wi-Fi password
 * @property {boolean} hidden - SSID hidden
 * @property {boolean} guest - Is guest network
 * @property {boolean} up - Radio is up
 * @property {string} name - Internal name (e.g. "wifi2g")
 * @property {boolean} mld - Multi-Link Device
 */

/**
 * @typedef {object} Service
 * @property {string} name - Service name (e.g. "wireguard", "openvpn", "adguardhome")
 * @property {number} status - 0=stopped, 1=running
 */

/**
 * Response from clients.get_status
 * @typedef {object} ClientsGetStatus
 * @property {number} wireless_total - Number of wireless clients
 * @property {number} cable_total - Number of wired clients
 */

/**
 * Response from wifi.get_status
 * @typedef {object} WifiGetStatus
 * @property {WifiRadio[]} res
 */

/**
 * @typedef {object} WifiRadio
 * @property {string} state - e.g. "ready"
 * @property {string} name - Radio name (e.g. "mt798111")
 * @property {number} [channel] - Current channel
 */

/**
 * Response from tailscale.get_status
 * @typedef {object} TailscaleGetStatus
 * @property {string[]} dns - DNS servers (e.g. ["192.168.1.67", "1.1.1.1"])
 */

/**
 * Response from tailscale.get_config
 * @typedef {object} TailscaleGetConfig
 * @property {boolean} enabled
 * @property {boolean} wan_enabled - Allow Tailscale over WAN
 * @property {boolean} lan_enabled - Allow LAN access via Tailscale
 * @property {string} lan_ip - LAN subnet (e.g. "192.168.14.0/24")
 */

/**
 * Response from dns.get_config
 * @typedef {object} DnsGetConfig
 * @property {string} mode - DNS mode
 * @property {boolean} rebind_protection
 * @property {boolean} dns_over_tls
 * @property {string} [custom_dns_1]
 * @property {string} [custom_dns_2]
 * @property {boolean} override_client_dns
 * @property {boolean} fallback_dns
 * @property {DnsServer[]} dns_server_list - Available DNS servers
 * @property {number} dnscrypt_version
 */

/**
 * @typedef {object} DnsServer
 * @property {string} name - Server name (e.g. "quad9-dnscrypt-ip6-filter-pri")
 * @property {string} proto - "DNSCrypt" or "DoH"
 * @property {boolean} nolog - No logging policy
 * @property {boolean} nofilter - No filtering
 * @property {boolean} ipv6 - IPv6 support
 * @property {boolean} dnssec - DNSSEC support
 */

/**
 * Response from ddns.get_status
 * @typedef {object} DdnsGetStatus
 * @property {number} status - 0=disabled, 1=updating, 2=active
 * @property {DdnsIp[]} ips - IP addresses per interface
 */

/**
 * @typedef {object} DdnsIp
 * @property {string} interface - e.g. "wan", "wan6"
 * @property {string[]} ip - IP addresses
 */

/**
 * Response from ddns.get_config
 * @typedef {object} DdnsGetConfig
 * @property {boolean} enable_ddns
 * @property {string} device_id - GL.iNet device ID (e.g. "ik69035")
 */

/**
 * Response from adguardhome.get_config
 * @typedef {object} AdGuardHomeGetConfig
 * @property {boolean} enabled
 * @property {boolean} dns_enabled
 */

/**
 * Response from repeater.get_status
 * @typedef {object} RepeaterGetStatus
 * @property {number} state - 0=idle, 1=connecting, 2=connected
 * @property {string} state_s - Human readable: "idle", "connecting", "connected"
 */

/**
 * Response from repeater.get_config
 * @typedef {object} RepeaterGetConfig
 * @property {string} macaddr - Repeater MAC address
 * @property {number} auto - Auto-connect (1=enabled)
 * @property {boolean} dfs_support - DFS channel support
 */

/**
 * Response from tor.get_config
 * @typedef {object} TorGetConfig
 * @property {boolean} enable
 * @property {boolean} manual - Manual exit node selection
 * @property {string[]} countries - Selected exit node countries
 */

/**
 * Response from upgrade.get_config
 * @typedef {object} UpgradeGetConfig
 * @property {boolean} rc_upgrade - Allow release candidate upgrades
 * @property {boolean} prompt - Show upgrade prompt
 */

/**
 * Response from cloud.get_config
 * @typedef {object} CloudGetConfig
 * @property {boolean} cloud_enable
 * @property {boolean} rtty_web - Remote web terminal
 * @property {boolean} rtty_ssh - Remote SSH terminal
 * @property {boolean} token_invalid
 * @property {string} aw_url - AstroWarp URL
 * @property {string} aw_api_url - AstroWarp API URL
 * @property {string[]} serverzones - Available regions (e.g. ["Europe", "America", "Asia Pacific"])
 */

/**
 * Response from fan.get_status
 * @typedef {object} FanGetStatus
 * @property {number} speed - Fan speed in RPM
 * @property {number} [temperature] - Current temperature
 */

/**
 * Response from fan.get_config
 * @typedef {object} FanGetConfig
 * @property {number} temperature - Temperature threshold for fan activation
 * @property {number} warn_temperature - Warning temperature
 */

/**
 * Response from led.get_config
 * @typedef {object} LedGetConfig
 * @property {boolean} enabled - LED enabled
 */

module.exports = {};
