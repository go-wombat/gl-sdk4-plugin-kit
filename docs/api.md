# GL.iNet RPC/API Reference

## Overview

The GL.iNet admin panel communicates with the router backend via JSON-RPC over HTTP.
The frontend exposes a global Vue instance method for making API calls:

```js
this.$rpcRequest('call', ['sid', namespace, method, params])
```

The `"sid"` string is a placeholder that gets automatically replaced with the
current session token by the request interceptor.

---

## Call Format

```js
// Signature
this.$rpcRequest('call', ['sid', '<namespace>', '<method>', { ...params }])

// Returns a Promise that resolves with the result object.

// Examples
const board = await this.$rpcRequest('call', ['sid', 'system', 'board', {}]);
const info  = await this.$rpcRequest('call', ['sid', 'system', 'info', {}]);
```

### What happens under the hood

`$rpcRequest` sends a POST to `/rpc` with this JSON-RPC 2.0 body:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "call",
  "params": ["<session_token>", "system", "board", {}]
}
```

The response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "hostname": "GL-MT3000", "model": "GL-MT3000", ... }
}
```

`$rpcRequest` unwraps the result automatically — you get the inner object directly.

---

## Using $axios

For non-RPC HTTP requests (e.g. file uploads, external APIs):

```js
const response = await this.$axios.post('/rpc', {
  jsonrpc: '2.0',
  id: 1,
  method: 'call',
  params: [this.$store.state.sid, 'system', 'board', {}]
});
const result = response.data.result;
```

Use `$rpcRequest` for standard RPC calls — it handles session tokens and error
handling automatically. Use `$axios` only when you need full control.

---

## Authentication

- On login, the backend returns a session ID (SID).
- The SID is stored in the Vuex store (`this.$store.state.sid`).
- `$rpcRequest` replaces the `"sid"` placeholder with the real token automatically.
- Sessions expire after inactivity; the admin panel handles re-authentication.

---

## Important: Not All ubus Methods Are Proxied

GL.iNet's RPC layer does **not** expose all OpenWrt ubus methods. It only proxies
methods that GL.iNet has explicitly whitelisted. For example:

- `system.board` -- works (proxied)
- `system.get_load` -- works (proxied)
- `system.info` -- **does NOT work** (not proxied, triggers global error popup)

If you call a non-proxied method, the admin panel shows a global error:
"Unknown error occurred. Please check the network environment or reboot the device."

Always wrap RPC calls in try/catch to prevent error popups from crashing your plugin.

---

## Vuex Store (Global State)

The admin panel pre-fetches system data into Vuex on page load. Access it directly
without making RPC calls — this is how GL.iNet's own pages get system data.

### this.$store.state.systemStatus

```js
{
  system: {
    mode: 0,              // 0=router, 1=wds, 2=relay, 3=mesh, 4=ap, 6=passthrough
    lan_ip: "192.168.14.1",
    lan_netmask: "255.255.255.0",
    guest_ip: "192.168.9.1",
    guest_netmask: "255.255.255.0",
    uptime: 54525,        // seconds since boot
    timestamp: 1775919252,
    tzoffset: "+0100",
    cpu: {
      temperature: 55     // degrees Celsius
    },
    flash_total: 256,     // MB
    flash_free: 120,      // MB
    flash_app: 80,        // MB used by apps
    mcu: {}               // MCU status (model-dependent)
  },
  network: [              // WAN/LAN interface status
    { interface: "wan", proto: "dhcp", up: true, ipaddr: "...", device: "eth0" }
  ],
  wifi: [                 // Wi-Fi radio status
    { ssid: "GL-MT3000", channel: 36, signal: -45, guest: false }
  ],
  service: [              // Running services
    { name: "wireguard", status: 1 },
    { name: "adguardhome", status: 0 }
  ]
}
```

### this.$store.state.systemInfo

```js
{
  board_info: {
    hostname: "GL-MT3000",
    model: "GL-MT3000",
    architecture: "ARMv8 Processor rev 4",
    kernel_version: "5.4.211",
    openwrt_version: "21.02-SNAPSHOT"
  },
  firmware_version: "4.8.1",
  firmware_type: "release",
  country_code: "us",
  mac: "94:83:C4:xx:xx:xx",
  sn: "...",
  cpu_num: 2,
  ddns: false,
  hardware_feature: {
    fan: false,            // has fan control
    mcu: false,            // has MCU
    noled: false,          // LED disabled
    build_in_modem: false  // has cellular modem
  },
  software_feature: {
    repeater_eap: false    // supports WPA Enterprise repeater
  },
  hidden_features: []      // features hidden in UI
}
```

### Other store state

```js
this.$store.state.lang            // "en", "zh-cn", "de", etc.
this.$store.state.theme           // "dark" or "light"
this.$store.state.model           // "GL-MT3000"
this.$store.state.is2c            // boolean, 2.4GHz only model
this.$store.state.screenWidth     // viewport width in pixels
this.$store.state.clientList      // connected device list
this.$store.state.initInfo        // initialization data
```

### Getting Uptime (the correct way)

Do NOT call `system.info` via RPC — it is not proxied and triggers an error popup.
Use the Vuex store:

```js
computed: {
  uptime() {
    const status = this.$store.state.systemStatus;
    if (!status || !status.system) return '--';
    const s = status.system.uptime;
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d + 'd ' + h + 'h ' + m + 'm';
  },
  cpuTemp() {
    const sys = (this.$store.state.systemStatus || {}).system || {};
    return sys.cpu ? sys.cpu.temperature + ' C' : '--';
  },
  lanIp() {
    const sys = (this.$store.state.systemStatus || {}).system || {};
    return sys.lan_ip || '--';
  }
}
```

---

## Known API Namespaces

The following RPC methods have been **confirmed working** through reverse
engineering and testing on GL-MT3000 firmware 4.8.1:

| Namespace | Confirmed Methods |
|-----------|-------------------|
| `system` | `board`, `get_load`, `get_usb3_disable`, `set_usb3_disable` |
| `wifi` | `get_config` |
| `led` | `get_config`, `set_config` |
| `fan` | `get_status`, `get_config`, `set_config` |
| `timer` | `get_led` |
| `repeater` | `get_channel_prompt`, `set_channel_prompt` |
| `ui` | `get_menu_list`, `set_lang` |

The following are **likely available** but not yet confirmed:

| Namespace | Expected Methods |
|-----------|-----------------|
| `network` | `status`, `get_config` |
| `wireguard` | `status`, `get_config`, `start`, `stop` |
| `openvpn` | `status`, `get_config`, `start`, `stop` |
| `clients` | `list` |
| `dns` | `get_config`, `set_config` |
| `tailscale` | `status`, `get_config` |
| `adguardhome` | `status`, `get_config` |

> Available namespaces vary by firmware version and installed packages.
> Use `glplugin extract` to discover methods from your firmware version.

### Commonly Used Calls

```js
// Get hardware info (CONFIRMED WORKING)
this.$rpcRequest('call', ['sid', 'system', 'board', {}])
// => { hostname, model, board_name, kernel, system, release: { version, revision } }

// Get system load (CONFIRMED WORKING)
this.$rpcRequest('call', ['sid', 'system', 'get_load', {}])

// Get uptime (USE VUEX STORE, NOT RPC)
const uptime = this.$store.state.systemStatus.system.uptime;
```

---

## Global Vue Instance Methods

| Method | Description |
|--------|-------------|
| `this.$rpcRequest(method, params)` | Make an RPC call (see above) |
| `this.$axios` | Axios HTTP client instance |
| `this.$t(key)` | i18n — returns translated string |
| `this.$locale()` | Get or set current locale |
| `this.$setTheme(name)` | Switch UI theme |
| `this.$message({ type, message })` | Show toast notification |
| `this.$store` | Vuex store (contains `sid`, user info) |
| `this.$router` | Vue Router instance |
| `this.$route` | Current route object |

---

## Error Handling

```js
try {
  const data = await this.$rpcRequest('call', ['sid', 'system', 'info', {}]);
  this.systemInfo = data;
} catch (err) {
  this.$message({ type: 'error', message: 'Failed to load system info.' });
  console.error(err);
}
```

---

## Notes

- API namespaces and methods were discovered by reverse engineering firmware 4.8.1.
- Use `glplugin extract root@<router-ip>` to discover API calls used in any firmware.
- Some methods require specific packages to be installed on the router.
