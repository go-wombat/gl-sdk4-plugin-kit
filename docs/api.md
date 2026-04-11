# GL.iNet RPC/API Reference

## Overview

The GL.iNet admin panel communicates with the router backend via JSON-RPC over HTTP.
The frontend exposes two primary mechanisms for making API calls:

1. `this.$rpc.call(namespace, method, params)` -- high-level Vue instance method
2. `this.$axios` POST to `/rpc` -- lower-level HTTP client

Both ultimately send JSON-RPC 2.0 requests to the router.

---

## JSON-RPC Format

All API requests use the JSON-RPC 2.0 protocol via HTTP POST to `/rpc`.

### Request Structure

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "call",
  "params": ["<session_id>", "<namespace>", "<method>", { ...params }]
}
```

| Field | Description |
|-------|-------------|
| `jsonrpc` | Always `"2.0"` |
| `id` | Request identifier (incrementing integer) |
| `method` | Always `"call"` for RPC invocations |
| `params` | Array: `[session_id, namespace, method, params_object]` |

### Response Structure

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ...data }
}
```

On error:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Error description"
  }
}
```

---

## Using $rpc.call

The recommended way to call APIs from within a Vue plugin component:

```js
// Signature
this.$rpc.call(namespace, method, params)

// Returns a Promise that resolves with the result object.

// Examples
const board = await this.$rpc.call('system', 'board', {});
const info  = await this.$rpc.call('system', 'info', {});
```

The `$rpc.call` wrapper automatically injects the current session token into
the params array, so you do not need to manage authentication manually.

---

## Using $axios

For lower-level control you can use the axios instance directly:

```js
const response = await this.$axios.post('/rpc', {
  jsonrpc: '2.0',
  id: 1,
  method: 'call',
  params: [this.$store.state.sid, 'system', 'board', {}]
});
const result = response.data.result;
```

---

## Authentication

The admin panel uses session-based authentication.

- On login, the backend returns a session ID (SID).
- The SID is stored in the Vuex store (`this.$store.state.sid`).
- Every RPC call includes the SID as the first element of the `params` array.
- `$rpc.call` handles this automatically; when using `$axios` directly you must
  include it yourself.

---

## Known API Namespaces

The following namespaces have been observed in the firmware. Each namespace
exposes multiple methods.

| Namespace | Description | Example Methods |
|-----------|-------------|-----------------|
| `system` | System information and management | `board`, `info`, `reboot` |
| `network` | Network interfaces and configuration | `status`, `get_config` |
| `wifi` | Wireless radio settings | `status`, `get_config`, `set_config` |
| `wireguard` | WireGuard VPN | `status`, `get_config` |
| `openvpn` | OpenVPN | `status`, `get_config` |
| `firewall` | Firewall rules | `get_rules`, `set_rules` |
| `clients` | Connected client devices | `list` |
| `dns` | DNS settings | `get_config`, `set_config` |
| `ddns` | Dynamic DNS | `status`, `get_config` |
| `tailscale` | Tailscale VPN | `status`, `get_config` |
| `adguardhome` | AdGuard Home integration | `status`, `get_config` |

> **Note:** Available namespaces and methods vary by firmware version and installed
> packages. The list above is not exhaustive.

### Commonly Used Calls

```js
// Get hardware/board information
this.$rpc.call('system', 'board', {})
// Returns: { hostname, model, board_name, kernel, system, release, ... }

// Get runtime system info
this.$rpc.call('system', 'info', {})
// Returns: { uptime, localtime, memory, load, ... }

// Get connected clients
this.$rpc.call('clients', 'list', {})

// Get Wi-Fi status
this.$rpc.call('wifi', 'status', {})
```

---

## Global Vue Instance Methods

The admin panel Vue instance provides several global helper methods available
via `this` in any component:

| Method | Description |
|--------|-------------|
| `this.$t(key)` | Internationalization -- returns translated string for the given key |
| `this.$locale()` | Get or set the current locale |
| `this.$setTheme(name)` | Switch the active UI theme |
| `this.$rpc.call(ns, method, params)` | Make an RPC call (see above) |
| `this.$message({ type, message })` | Show a toast notification |
| `this.$store` | Vuex store instance (contains `sid`, user info, etc.) |
| `this.$router` | Vue Router instance |
| `this.$route` | Current route object |

---

## Error Handling

Wrap RPC calls in try/catch to handle network or backend errors gracefully:

```js
try {
  const data = await this.$rpc.call('system', 'info', {});
  this.systemInfo = data;
} catch (err) {
  this.$message({ type: 'error', message: 'Failed to load system info.' });
  console.error(err);
}
```

---

## Notes

- API namespaces and methods were discovered by reverse engineering. Not all
  parameters or return values are fully documented.
- Some methods may require specific firmware packages to be installed.
- The session token expires after a period of inactivity; the admin panel
  handles re-authentication automatically.
