# gl-sdk4-plugin-kit

Unofficial toolkit for building native admin panel plugins for GL.iNet routers (firmware 4.x).

GL.iNet routers run a closed-source Vue.js admin UI on top of OpenWrt. There is no official SDK or documentation for extending it. This project provides everything you need to build, test, and deploy custom plugins that appear as native menu items in the GL.iNet admin panel.

## How It Works

GL.iNet's admin panel loads plugins dynamically:

1. **Menu entries** are JSON files in `/usr/share/oui/menu.d/` on the router
2. **Views** are webpack-bundled Vue 2 components in `/www/views/gl-sdk4-ui-{name}.common.js.gz`
3. The app fetches the JS bundle, runs `eval()`, and mounts the Vue component

This toolkit automates the entire workflow: scaffold, build, and deploy.

## Quick Start

```bash
# Install globally
npm install -g gl-sdk4-plugin-kit

# Create a new plugin
glplugin init my-plugin

# Build it
cd my-plugin
npm install
npm run build

# Deploy to your router
glplugin deploy root@192.168.8.1
```

Open your router's admin panel and refresh — your plugin appears in the sidebar.

### Create an installable .ipk package

```bash
glplugin package
# Output: dist/gl-sdk4-ui-my-plugin_1.0.0_all.ipk

# Install on router (survives reboots):
scp -O dist/*.ipk root@192.168.8.1:/tmp/
ssh root@192.168.8.1 "opkg install /tmp/gl-sdk4-ui-my-plugin_1.0.0_all.ipk"

# Uninstall:
ssh root@192.168.8.1 "opkg remove gl-sdk4-ui-my-plugin"
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `glplugin init <name>` | Scaffold a new plugin project |
| `glplugin build` | Build plugin (webpack + gzip) |
| `glplugin package` | Create `.ipk` package (installable via opkg, survives reboots) |
| `glplugin deploy <host>` | Deploy to router via SCP |
| `glplugin test <host>` | Test plugin and API connectivity against live router |
| `glplugin extract <host>` | Extract components via SSH |
| `glplugin extract <ip> --rpc` | Discover API endpoints via RPC (no SSH needed) |
| `glplugin extract <host> --full` | Both SSH + RPC extraction |
| `glplugin help` | Show help |

## Plugin Structure

```
my-plugin/
├── src/
│   └── index.vue          # Your Vue component
├── menu.json              # Menu entry definition
├── webpack.config.js      # Build config (pre-configured)
├── package.json
└── dist/                  # Build output
    └── gl-sdk4-ui-my-plugin.common.js.gz
```

## Writing Plugins

Your plugin is a standard Vue 2 single-file component. Add a `rpc()` helper for safe API calls:

```vue
<template>
  <div>
    <gl-title :title="'My Plugin'" />
    <gl-card>
      <p>{{ model }} — {{ uptime }}</p>
      <gl-btn type="primary" @click="fetchData">Refresh</gl-btn>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'my-plugin',
  data() {
    return { model: '', uptime: '' };
  },
  created() {
    this.fetchData();
  },
  methods: {
    rpc(module, func, params) {
      return this.$rpcRequest('call', ['sid', module, func, params || {}])
        .then(r => r).catch(() => null);
    },
    async fetchData() {
      const info = await this.rpc('system', 'get_info');
      const status = await this.rpc('system', 'get_status');
      if (info) this.model = info.board_info.model;
      if (status) {
        const s = status.system.uptime;
        this.uptime = Math.floor(s/3600) + 'h ' + Math.floor(s%3600/60) + 'm';
      }
    },
  },
};
</script>

<style scoped>
p { color: var(--text-color); }
</style>
```

## Node.js API Client

Control your router from scripts without SSH:

```bash
# Install locally in your project (NOT global — global install won't resolve lib/ imports)
npm install gl-sdk4-plugin-kit
```

```js
const { createClient } = require('gl-sdk4-plugin-kit/lib/api-client');

const client = await createClient('192.168.8.1', 'your-password');

// Read
const info = await client.system.getInfo();
const clients = await client.clients.getList();
const vpn = await client.vpnClient.getStatus();

// Write
await client.wifi.setConfig({ ... });
await client.firewall.addPortForward({ name: 'SSH', proto: 'tcp', dest_ip: '192.168.8.100', dest_port: '22', src_dport: '2222' });

// VPN control (use set_tunnel, not stop)
const tunnels = await client.vpnClient.getTunnel();
tunnels.tunnels[0].enabled = false;
await client.rpc('vpn-client', 'set_tunnel', tunnels.tunnels[0]); // disable
tunnels.tunnels[0].enabled = true;
await client.rpc('vpn-client', 'set_tunnel', tunnels.tunnels[0]); // re-enable
```

## Vue API Mixin

> **Note:** Plugins are webpack-bundled independently and cannot `require()` from
> the toolkit at runtime. The mixin code must be **copied into your plugin** or
> inlined. See [lib/api.js](lib/api.js) for the source. The simpler `rpc()` helper
> shown in the Writing Plugins section above is the recommended approach.

For reference, the full mixin provides 46 namespaces with ~300 methods:

```js
// Copy createGlApi() and glApiMixin from lib/api.js into your plugin, then:
export default {
  mixins: [glApiMixin],
  async created() {
    const info = await this.glApi.system.getInfo();
    const clients = await this.glApi.clients.getList();
  }
};
```

## Documentation

- [Components Reference](docs/components.md) — All 49 built-in `gl-*` Vue components
- [API Reference](docs/api.md) — RPC calls and backend communication
- [Menu Format](docs/menu.md) — How to define menu entries
- [Theme Variables](docs/theme.md) — CSS variables for native look and feel
- [Complete API Methods](docs/api-methods.md) — 302 RPC methods discovered, ~295 confirmed working
- [Type Definitions](lib/types.js) — JSDoc types for all API responses (IDE autocomplete)
- [Write Methods — VPN](docs/write-methods-vpn.md) — 38 VPN write method parameters
- [Write Methods — Network](docs/write-methods-network.md) — 34 network/firewall write method parameters
- [Write Methods — System](docs/write-methods-system.md) — 42 system/service write method parameters
- [Vue API Mixin](lib/api.js) — Typed API with 44 namespaces for Vue plugins
- [Node.js Client](lib/api-client.js) — Standalone API client with auth

## Examples

- [hello-world](examples/hello-world/) — Minimal plugin showing device info
- [network-info](examples/network-info/) — Plugin with tables and multiple cards
- [vpn-status](examples/vpn-status/) — VPN dashboard with service status
- [wifi-scanner](examples/wifi-scanner/) — Scan nearby Wi-Fi networks
- [client-monitor](examples/client-monitor/) — Connected devices with traffic stats
- [firewall-viewer](examples/firewall-viewer/) — Port forwards, rules, WAN access

## Extract Components from Any Firmware

If you're running a different firmware version, extract fresh component data:

```bash
glplugin extract root@192.168.8.1
```

This SSHs into the router, downloads `app.js`, and extracts all component names, CSS variables, icons, and RPC methods into `extracted-components.json`.

## Tested On

- GL-MT3000 (Beryl AX) — Firmware 4.8.1

Should work on any GL.iNet router running firmware 4.x with the same UI framework.

## Disclaimer

This is an unofficial, community-driven project. It is not affiliated with, endorsed by, or supported by GL.iNet. Component documentation was obtained through reverse engineering of the publicly accessible admin panel JavaScript. No proprietary source code is included in this repository.

## Contributing

Contributions welcome! If you've tested on a different model or firmware version, please open a PR with your `extracted-components.json`.

## License

MIT
