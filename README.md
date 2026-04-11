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

## CLI Commands

| Command | Description |
|---------|-------------|
| `glplugin init <name>` | Scaffold a new plugin project |
| `glplugin build` | Build plugin (webpack + gzip) |
| `glplugin deploy <host>` | Deploy to router via SCP |
| `glplugin extract <host>` | Extract component info from any firmware |
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

Your plugin is a standard Vue 2 single-file component. GL.iNet provides 49 built-in components you can use — they're already registered globally:

```vue
<template>
  <div>
    <gl-title :title="'My Plugin'" />
    <gl-card>
      <p>{{ info }}</p>
      <gl-btn type="primary" @click="refresh">Refresh</gl-btn>
    </gl-card>
  </div>
</template>

<script>
export default {
  name: 'my-plugin',
  data() {
    return { info: 'Loading...' };
  },
  created() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.$rpc.call('system', 'board', {}).then(res => {
        this.info = res.model;
      });
    },
  },
};
</script>

<style scoped>
/* Use GL.iNet theme variables */
p { color: var(--text-color); }
</style>
```

## Documentation

- [Components Reference](docs/components.md) — All 49 built-in `gl-*` Vue components
- [API Reference](docs/api.md) — RPC calls and backend communication
- [Menu Format](docs/menu.md) — How to define menu entries
- [Theme Variables](docs/theme.md) — CSS variables for native look and feel

## Examples

- [hello-world](examples/hello-world/) — Minimal plugin showing device info
- [network-info](examples/network-info/) — Plugin with tables and multiple cards

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
