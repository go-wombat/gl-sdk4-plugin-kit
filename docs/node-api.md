# Node.js Toolkit API

The package root is the stable programmatic interface for Node.js tools and MCP
servers:

```js
const sdk = require('gl-sdk4-plugin-kit');
```

Native ESM consumers can use the same default object or named namespaces:

```js
import sdk, { project, router } from 'gl-sdk4-plugin-kit';
```

Do not build new integrations around `lib/*`. Those paths remain exported for
compatibility with existing consumers, but they are implementation modules rather
than the versioned public contract.

## Namespaces

| Namespace | Methods |
|---|---|
| `api` | `createApiClient`, `createClient` |
| `project` | `init`, `read`, `check` |
| `artifacts` | `build`, `package`, `inspect` |
| `router` | `inspect`, `listCapabilities` |
| `errors` | `CliError`, `EXIT_CODES` |

`version` contains the installed toolkit version. The root object and namespace
objects are frozen so integrations cannot accidentally replace shared functions.

## Project Workflow

```js
const sdk = require('gl-sdk4-plugin-kit');

const report = sdk.project.check('/work/my-plugin');
if (!report.ok) {
  console.error(report.checks);
  process.exitCode = sdk.errors.EXIT_CODES.VALIDATION;
} else {
  sdk.artifacts.build({ cwd: '/work/my-plugin' });
  const artifact = sdk.artifacts.package({ cwd: '/work/my-plugin' });
  const inspection = sdk.artifacts.inspect(artifact.ipkFile);
  console.log(inspection.metadata.Package, inspection.metadata.Version);
}
```

`project.init(name, options)` creates a plugin project. Dependency installation
remains opt-in through `options.install`, matching `glplugin init --install`.

## Router Inspection

```js
const sdk = require('gl-sdk4-plugin-kit');

const report = await sdk.router.inspect('192.168.8.1', password, {
  username: 'root',
  requiredCapabilities: ['wifi'],
});
```

`router.inspect` performs the same authenticated, read-only capability and firmware
inspection used by doctor and closes its RPC session in a cleanup path. Passwords
are function arguments held in process memory; never place them in command-line
arguments, logs, MCP tool results, or persisted target configuration.

## RPC Client

```js
const { api } = require('gl-sdk4-plugin-kit');
const client = await api.createClient('192.168.8.1', password);

try {
  const info = await client.system.getInfo();
  const clients = await client.clients.getList();
} finally {
  await client.close();
}
```

The generated namespaces preserve RPC rejection details. `close()` is idempotent
and logs out the authenticated session.

## Browser Entry

Vue plugins must import the browser-only entry so webpack does not include Node.js
filesystem, process, or SSH modules:

```js
const { glApiMixin } = require('gl-sdk4-plugin-kit/browser');
```

The `chart` and `admin-session` package subpaths expose their matching runtime
declarations. Generated projects normally consume those runtime modules through
the `@gl-sdk4-plugin-kit` webpack alias.
