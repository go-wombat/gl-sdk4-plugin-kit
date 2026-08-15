# CLI Workflow

The CLI is organized around a project-local plugin and an optional project-local
router target. It never stores router passwords.

## First Run

```bash
glplugin init airbnb-radar --profile full-stack
cd airbnb-radar
npm install

glplugin target add beryl root@192.168.8.1 --use
glplugin check
glplugin install
glplugin doctor
```

`install` runs project checks, builds the view, creates the `.ipk`, uploads it to
`/tmp`, and invokes `opkg install`. Use `--no-build` to package and install an
existing build artifact. The temporary router-side `.ipk` is removed after the
install attempt while preserving the `opkg` exit status.

## Targets

Targets are stored in `.glpluginrc.json` in the project root. New projects ignore
this file in Git. The file is written with mode `0600` and may contain only:

- SSH target and optional separate RPC host
- RPC username
- HTTP/HTTPS and TLS verification settings
- SSH host-key policy

Passwords, session IDs, tokens, and challenge values are never accepted or stored.
Passwords continue to use the hidden prompt or `--password-stdin`.

```bash
glplugin target add beryl root@192.168.8.1
glplugin target add lab admin@lab-router.local --rpc-host lab-router.local --https
glplugin target list
glplugin target use beryl
glplugin target show
glplugin target remove lab
```

Router commands resolve their target in this order:

1. Explicit target alias or host argument
2. `GLPLUGIN_HOST`
3. Current project target

Command-line transport flags override target defaults. Use `--http`/`--secure` to
override stored `--https`/`--insecure` settings and `--strict-host-key` to override
a stored insecure SSH policy.

## Development

```bash
glplugin check
glplugin deploy --build
glplugin dev
```

`deploy --build` validates, builds, and uploads the view, menu, and locale files.
`dev` performs that cycle once and then watches source, locale, menu, manifest, and
webpack configuration files with debounced rebuilds.

Multi-step SSH commands open one temporary OpenSSH master connection per command,
so `deploy`, `install`, and SSH extraction require one SSH authentication instead
of one prompt per transferred file or remote probe. `dev` keeps that connection
until the watcher stops and reuses it for every rebuild. The connection is closed
on normal completion, failure, or `Ctrl+C`; no password is written to the target
configuration.

Development deploy uploads UI assets only. A full-stack overlay, dependencies, and
lifecycle hooks require `glplugin install` because those files must be applied by
the package manager.

## Packages

```bash
glplugin build
glplugin package
glplugin inspect dist/gl-sdk4-ui-airbnb-radar_1.0.0_all.ipk
glplugin install --no-build
glplugin uninstall
```

`inspect` validates archive paths before reading package members. It reports control
metadata, dependencies, lifecycle scripts, conffiles, view files, menu files, and
the complete data file list.

Do not use the exit code of `opkg status <package>` alone to verify removal. The
`opkg` version observed on GL-MT3000 firmware 4.8.1 returns status 0 even when it
prints no package record. Parse the status/list output or verify package files.

## Global Options

Global options can appear before or after the command:

| Option | Behavior |
|---|---|
| `--cwd <dir>` | Run against another project directory |
| `--json` | Emit one JSON object to stdout |
| `--quiet`, `-q` | Suppress human progress and subprocess output |
| `--verbose`, `-v` | Print additional diagnostics to stderr |
| `--help`, `-h` | Print help without executing the command |
| `--version` | Print the toolkit version |

Examples:

```bash
glplugin build --help
glplugin --cwd ../airbnb-radar check --json
glplugin doctor --json
```

Successful JSON output has the shape `{ "ok": true, "result": ... }`. Errors use
`{ "ok": false, "error": { "message": ..., "exitCode": ... } }`. Validation and
connectivity failures can additionally include a structured `details` report.

## Exit Codes

| Code | Meaning |
|---:|---|
| `0` | Success |
| `1` | Runtime/tool failure |
| `2` | Invalid command or arguments |
| `3` | Project/package validation failure |
| `4` | Router connectivity, authentication, SCP, or SSH failure |

Core modules return data or throw `CliError`; they do not terminate the Node process.
This keeps the toolkit usable from tests and other JavaScript programs.
