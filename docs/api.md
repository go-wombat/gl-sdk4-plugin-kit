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

The admin panel pre-fetches system data and stores it in Vuex. You can access it
directly without making RPC calls:

```js
// System status (uptime, load, etc.)
this.$store.state.systemStatus
// => { system: { uptime: 54525, ... }, memory: { total, free, ... } }

// System info (board info)
this.$store.state.systemInfo
// => { board_info: { hostname, model, ... } }

// Session ID
this.$store.state.sid
```

### Getting Uptime (the correct way)

Do NOT call `system.info` via RPC. Use the Vuex store instead:

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
