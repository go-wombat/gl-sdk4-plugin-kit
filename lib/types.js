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
 */

/**
 * @typedef {object} SystemStatus
 * @property {number} uptime - Seconds since boot
 * @property {number} timestamp - Unix timestamp
 * @property {string} tzoffset - Timezone offset (e.g. "+0100")
 * @property {number} mode - 0=router, 1=wds, 2=relay, 3=mesh, 4=ap, 6=passthrough
 * @property {string} lan_ip - LAN IP address
 * @property {string} lan_netmask
 * @property {string} guest_ip - Guest network IP
 * @property {string} guest_netmask
 * @property {CpuStatus} cpu
 * @property {number} flash_total - Flash total MB
 * @property {number} flash_free - Flash free MB
 * @property {number} flash_app - Flash used by apps MB
 * @property {object} mcu - MCU status (model-dependent)
 */

/**
 * @typedef {object} CpuStatus
 * @property {number} temperature - CPU temperature in Celsius
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
 * @property {boolean} enabled
 * @property {string} [ip] - Tailscale IP
 */

/**
 * Response from dns.get_config
 * @typedef {object} DnsGetConfig
 * @property {string} mode
 * @property {string[]} [servers]
 */

/**
 * Response from ddns.get_status
 * @typedef {object} DdnsGetStatus
 * @property {boolean} enabled
 * @property {string} [domain]
 */

module.exports = {};
