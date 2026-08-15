# gl-sdk4-plugin-kit

Unofficial toolkit for building native SDK4 admin panel plugins for GL.iNet routers.

GL.iNet routers run an SDK4 Vue.js admin UI on top of OpenWrt. GL.iNet publishes firmware build tooling and prebuilt SDK4 packages, but no complete extension SDK for adding native admin pages. This project documents the package contract and automates building, testing, and deploying compatible plugins.

## How It Works

GL.iNet's admin panel loads plugins dynamically:

1. **Menu entries** are JSON files in `/usr/share/oui/menu.d/` on the router
2. **Views** are webpack-bundled Vue 2 components in `/www/views/gl-sdk4-ui-{name}.common.js.gz`
3. The app fetches the JS bundle, runs `eval()`, and mounts the Vue component

This toolkit automates the entire workflow: scaffold, build, and deploy.

## Quick Start

```bash
# Until the first npm release, install the CLI from this repository
git clone https://github.com/go-wombat/gl-sdk4-plugin-kit.git
cd gl-sdk4-plugin-kit
npm install
npm link

# Create a UI-only plugin (default)
glplugin init my-plugin

# Or create a package with router-side files and lifecycle hooks
glplugin init my-router-tool --profile full-stack

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
| `glplugin init <name> [--profile ui-only\|full-stack]` | Scaffold a UI-only or full-stack plugin project |
| `glplugin build` | Build plugin (webpack + gzip) |
| `glplugin package` | Create `.ipk` package (installable via opkg, survives reboots) |
| `glplugin deploy <host>` | Deploy UI assets to a router via SCP for development |
| `glplugin test <host>` | Test plugin and API connectivity against live router |
| `glplugin doctor <host>` | Detect model, firmware, auth algorithm, and read-only capabilities |
| `glplugin extract <host>` | Extract components via SSH |
| `glplugin extract <ip> --rpc` | Discover API endpoints via RPC (no SSH needed) |
| `glplugin extract <host> --full` | Both SSH + RPC extraction |
| `glplugin help` | Show help |

### Router authentication and doctor

This authentication is only for developer-side CLI commands such as `doctor`, `test`, and RPC extraction. A plugin page loaded inside the GL.iNet admin UI continues to use the existing admin session and does not show a second login.

Router passwords are never accepted as positional CLI arguments. Interactive commands use a hidden TTY prompt; automation can provide one password line on stdin:

```bash
glplugin doctor 192.168.8.1
printf '%s\n' "$ROUTER_PASSWORD" | glplugin doctor 192.168.8.1 --password-stdin --json
```

The CLI negotiates `challenge.alg` instead of assuming MD5 crypt. Algorithms `1` (MD5 crypt), `5` (SHA-256 crypt), and `6` (SHA-512 crypt) are supported because all three are implemented by the official 4.8.1 and 4.9.0 UI bundles. Unknown algorithms fail explicitly.

HTTP remains the default for local router access. For HTTPS, certificate verification is enabled by default:

```bash
glplugin doctor router.local --https
glplugin doctor router.local --https --insecure # explicit opt-out for a self-signed certificate
```

`doctor` calls only read methods. Missing optional modules are reported as unavailable or not supported; they do not make the core router check fail.

## Plugin Structure

```
my-plugin/
├── gl-plugin.json        # Plugin/package manifest
├── src/
│   └── index.vue          # Your Vue component
├── i18n/                  # Plugin translations
├── menu.json              # Menu entry definition
├── webpack.config.js      # Build config (pre-configured)
├── package.json
└── dist/                  # Build output
    └── gl-sdk4-ui-my-plugin.common.js.gz
```

## Writing Plugins

Your plugin is a standard Vue 2 single-file component. RPC failures reject normally, so handle them explicitly:

```vue
<template>
  <div>
    <gl-title :title="'My Plugin'" />
    <gl-card>
      <p>{{ model }} - {{ uptime }}</p>
      <p v-if="error">{{ error }}</p>
      <gl-button type="primary" @click="fetchData">Refresh</gl-button>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'my-plugin',
  data() {
    return { model: '', uptime: '', error: '' };
  },
  created() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.error = '';
      try {
        const info = await this.$rpcRequest('call', ['sid', 'system', 'get_info', {}]);
        const status = await this.$rpcRequest('call', ['sid', 'system', 'get_status', {}]);
        this.model = info.board_info.model;
        const s = status.system.uptime;
        this.uptime = Math.floor(s/3600) + 'h ' + Math.floor(s%3600/60) + 'm';
      } catch (error) {
        this.error = error.message || 'RPC request failed';
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
# After the npm release, install locally so lib/ imports resolve
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

The toolkit can be installed or linked as a build-time dependency. Webpack includes
the API factory and catalog in the plugin bundle, so the router does not need the
Node package at runtime. Until the npm release, run `npm link gl-sdk4-plugin-kit`
inside the generated plugin before importing it.

For reference, the full mixin provides 49 namespaces with 326 methods. Calls preserve RPC rejections instead of converting failures to `null`:

```js
const { glApiMixin } = require('gl-sdk4-plugin-kit/lib/api');

export default {
  mixins: [glApiMixin],
  async created() {
    const info = await this.glApi.system.getInfo();
    const clients = await this.glApi.clients.getList();
  }
};
```

## Package Configuration

`gl-plugin.json` is the single source for the plugin ID, profile, OpenWrt package
metadata, filesystem overlay, and lifecycle hooks. `package.json` remains the
Node/build manifest.

```json
{
  "schemaVersion": 1,
  "id": "my-plugin",
  "profile": "full-stack",
  "package": {
    "name": "gl-sdk4-ui-my-plugin",
    "architecture": "all",
    "depends": ["libc", "gl-sdk4-ui-core"],
    "section": "base",
    "conffiles": ["/etc/config/my-plugin"]
  },
  "overlay": "overlay",
  "lifecycle": {
    "postinst": "hooks/postinst",
    "prerm": "hooks/prerm"
  }
}
```

The default `ui-only` profile packages the admin view, menu, and translations.
`full-stack` additionally copies `overlay/` into the router root filesystem,
supports package dependencies and conffiles, and validates POSIX shell lifecycle
hooks. Existing pre-manifest projects using `package.json.pluginName/glPlugin`
remain readable through a legacy adapter.

`glplugin package` also writes `Installed-Size`, `SourceName`, and the standard
OpenWrt lifecycle wrappers. Menu files are package-owned and are not marked as
`conffiles`. See [Package Manifest and Profiles](docs/packaging.md) for the full
contract and the firmware evidence behind hook dispatch.

## Documentation

- [Components Reference](docs/components.md) — All 49 built-in `gl-*` Vue components
- [API Reference](docs/api.md) — RPC calls and backend communication
- [Firmware Compatibility](docs/compatibility.md) - inspected firmware artifacts, auth contract, and doctor behavior
- [Package Manifest and Profiles](docs/packaging.md) - UI/full-stack packaging, overlays, conffiles, and lifecycle hooks
- [Menu Format](docs/menu.md) — How to define menu entries
- [Theme Variables](docs/theme.md) — CSS variables for native look and feel
- [Extracted API Methods](docs/api-methods.md) - 302 methods found in the inspected firmware bundle
- [Runtime API Catalog](lib/api-catalog.js) - 49 namespaces and 326 callable method mappings
- [Type Definitions](lib/types.js) - JSDoc response and parameter types
- [Write Methods - VPN](docs/write-methods-vpn.md) - VPN write method parameters
- [Write Methods - Network](docs/write-methods-network.md) - Network and firewall parameters
- [Write Methods - System](docs/write-methods-system.md) - System and service parameters
- [Vue API Mixin](lib/api.js) - Browser API generated from the shared catalog
- [Node.js Client](lib/api-client.js) - Standalone API generated from the same catalog

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

## Compatibility Status

- GL-MT3000 (Beryl AX), firmware 4.8.1 release: official artifacts inspected and live doctor validated on 2026-08-15
- GL-MT3000 (Beryl AX), firmware 4.9.0 beta6: official root filesystem, UI auth flow, and RPC modules inspected; not yet tested on a live router

The package layout is also checked against official SDK4 UI packages. Compatibility is capability-based rather than tied to MT3000, but other models and firmware versions still require explicit live testing. See [the compatibility notes](docs/compatibility.md) for exact evidence and limits.

## Disclaimer

This is an unofficial, community-driven project. It is not affiliated with, endorsed by, or supported by GL.iNet. Component documentation was obtained through reverse engineering of the publicly accessible admin panel JavaScript. No proprietary source code is included in this repository.

## Contributing

Contributions welcome! If you've tested on a different model or firmware version, please open a PR with your `extracted-components.json`.

## License

MIT
