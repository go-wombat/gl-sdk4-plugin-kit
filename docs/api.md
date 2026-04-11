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

## Known API Namespaces

| Namespace | Description | Example Methods |
|-----------|-------------|-----------------|
| `system` | System info and management | `board`, `info`, `reboot`, `get_load`, `get_usb3_disable`, `set_usb3_disable` |
| `network` | Network interfaces | `status`, `get_config` |
| `wifi` | Wireless settings | `status`, `get_config`, `set_config` |
| `wireguard` | WireGuard VPN | `status`, `get_config`, `start`, `stop` |
| `openvpn` | OpenVPN | `status`, `get_config`, `start`, `stop` |
| `firewall` | Firewall rules | `get_rules`, `set_rules` |
| `clients` | Connected devices | `list` |
| `dns` | DNS settings | `get_config`, `set_config` |
| `ddns` | Dynamic DNS | `status`, `get_config` |
| `tailscale` | Tailscale VPN | `status`, `get_config` |
| `adguardhome` | AdGuard Home | `status`, `get_config` |
| `led` | LED control | `get_config`, `set_config` |
| `fan` | Fan control | `get_status`, `get_config`, `set_config` |
| `timer` | Scheduled tasks | `get_led` |

> Available namespaces vary by firmware version and installed packages.

### Commonly Used Calls

```js
// Get hardware info
this.$rpcRequest('call', ['sid', 'system', 'board', {}])
// => { hostname, model, board_name, kernel, system, release: { version, revision } }

// Get runtime info
this.$rpcRequest('call', ['sid', 'system', 'info', {}])
// => { uptime, localtime, memory: { total, free, buffered }, load: [1m, 5m, 15m] }

// Get connected clients
this.$rpcRequest('call', ['sid', 'clients', 'list', {}])

// Get Wi-Fi status
this.$rpcRequest('call', ['sid', 'wifi', 'status', {}])

// Get WireGuard status
this.$rpcRequest('call', ['sid', 'wireguard', 'status', {}])
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
