# Firmware Compatibility

This document separates inspected firmware evidence from live-router validation. The toolkit must not infer compatibility from a model name or a firmware version alone.

## Inspected Official Artifacts

| Model | Firmware | Channel | Artifact | SHA-256 | Evidence |
|---|---|---|---|---|---|
| GL-MT3000 | 4.8.1 | release | `mt3000-4.8.1-0819-1755615825.tar` | `ee038ee0f399c1454cc660dd47811b44697f5304e0f61af145c7dca6817d0e5c` | Root filesystem, login bundle, core bundle, package metadata, RPC runtime |
| GL-MT3000 | 4.9.0 beta6 | testing | `mt3000-4.9.0_beta6-1047-0703-1783066682.tar` | `03a9ed1d99ca9728eca6042f06c56cea5df299cd1e168b5f9fb51663bda24a32` | Root filesystem, login bundle, core bundle, package metadata, RPC modules including SQM and DPI |

Metadata and download URLs came from the official GL.iNet firmware API:

`https://firmware-api.gl-inet.com/cloud-api/model/info?model=MT3000`

No firmware image, extracted bundle, vendor source, serial number, session token, or router password is stored in this repository. The sanitized auth vectors in `test/fixtures/auth-vectors.json` contain only synthetic credentials.

## Component Registry Evidence

The official admin view loader evaluates `/views/gl-sdk4-ui-*.common.js` and mounts
the returned component through the same Vue constructor as the core admin app.
Plugin views therefore inherit that constructor's global registry; they do not get
an isolated component registry.

The catalog in `lib/component-catalog.js` was captured from
`Object.keys(Vue.options.components)` after synchronous core registration:

| Model | Firmware | Decompressed app bundle SHA-256 | UI | Router helpers | Result |
|---|---|---|---:|---:|---|
| GL-MT3000 | 4.8.1 | `0409574b320a74de904a690df723134fc07471cddf5d622691ebbaa403116705` | 52 | 2 | Runtime verified |
| GL-MT3000 | 4.9.0 beta6 | `d85b8cf6573572bbe4ba096a8c6f7043c7c2cd1df5541933c6b83192f05240c7` | 57 | 2 | Runtime verified |

The live 4.8.1 router's compressed app bundle was byte-for-byte identical to the
official 4.8.1 artifact. The 4.9.0 beta6 catalog adds `gl-agree-check`,
`gl-number-input`, `gl-otp-input`, `gl-select-timezone`, and `gl-steps`; it removes
no 4.8.1 registry entries.

Registry presence proves that Vue can resolve the component. It does not prove that
the component is standalone: several entries inject a parent component, while
router-specific entries can depend on store, RPC, or hardware context. The catalog
records known parent dependencies and keeps `RouterLink`/`RouterView` separate from
the UI count.

## Live Validation

| Model | Firmware | Date | Result |
|---|---|---|---|
| GL-MT3000 | 4.8.1 `release8` | 2026-08-15 | Core doctor passed; `challenge.alg=1`; 17 read-only capability probes available; built-in modem correctly gated as unsupported; 4.9-only SQM and DPI methods unavailable |

The live report was reviewed but is not committed as a raw fixture. It contained
no SID, password, challenge values, serial number, or MAC address. The hidden TTY
prompt initially left stdin in flowing mode after printing the report; the prompt
now restores raw/encoding state, pauses a previously non-flowing stream, and the
same live command exits normally with status 0.

### Live CLI workflow validation

The same GL-MT3000 was used for an end-to-end generated `full-stack` project:

| Workflow | Observed result |
|---|---|
| `check -> build -> package -> inspect` | Passed; package contained the official view/menu/i18n layout plus config, executable backend, lifecycle scripts, and conffile metadata |
| `deploy --build` | Passed; view, menu, and one locale uploaded after one SSH authentication |
| `install --no-build` | Passed; `opkg` installed and configured the generated package after one SSH authentication; the uploaded `.ipk` was removed from `/tmp` |
| `test` | HTTP 200, core RPC, 2,679-byte deployed view, and evaluated Vue component all passed |
| `extract` | 52 verified UI components, 2 router helpers, 60 CSS variables, 5 RPC methods in code, and 44 menu entries; one SSH authentication |
| `dev` | Initial build/deploy and a second source-triggered build/deploy shared one SSH session; `Ctrl+C` closed the watcher and left no ControlMaster process or socket directory |
| `uninstall` | Package record output became empty and all five installed files were absent |

The installed backend executable returned `{"status":"ok"}`. The package declared
`libc` and `gl-sdk4-ui-core`, installed one conffile, and exposed exactly the five
files reported by `opkg files`.

On this firmware, both `opkg status <removed-package>` and
`opkg list-installed <removed-package>` returned exit code 0 with empty output.
Automated cleanup checks must inspect output rather than treat that exit code as an
installed-package signal.

## Authentication Contract

The 4.8.1 release and 4.9.0 beta6 login bundles use the same flow:

1. Call `challenge` with `{ username }`.
2. Read `alg`, `salt`, and `nonce` from the challenge.
3. Compute Unix crypt with the setting `$<alg>$<salt>$`.
4. Compute SHA-256 over `username + ":" + crypted + ":" + nonce`.
5. Call `login` with `{ username, hash }`.

The official core bundles implement Unix crypt algorithms `1`, `5`, and `6`. The toolkit maps those to OpenSSL `-1`, `-5`, and `-6`. The password is passed to `openssl passwd` through stdin, never through argv or shell interpolation. An unrecognized challenge algorithm is an explicit compatibility failure.

## Doctor Contract

`glplugin doctor` detects compatibility from live behavior:

- Authentication must complete with a supported challenge algorithm.
- `system.get_info` and `system.get_status` are the required core probes.
- Model, firmware, OpenWrt, kernel, architecture, and declared hardware/software features come from those responses.
- Optional probes use read-only `get_*` methods from the shared RPC catalog.
- A feature explicitly disabled by `software_feature` or `hardware_feature` is not probed.
- RPC codes `-32601` and `-32001` mean an optional capability is unavailable, not that the router failed doctor.
- Other optional RPC failures are warnings and preserve their JSON-RPC code/data.
- Session IDs, nonces, salts, passwords, serial numbers, and raw system responses are excluded from the report.

The 4.9 probes include `sqm.get_config` and `dpi.get_dpi_status`. Older firmware is expected to report these modules as unavailable.

## Current Validation Limits

- The 4.9.0 artifact is beta firmware, not a stable compatibility claim.
- The 4.9.0 flow has not yet been run against a live router.
- HTTPS certificate validation requires a trusted router certificate. A self-signed certificate needs an explicit `--insecure` opt-out.
- Local auth currently requires an `openssl` executable with `passwd -1`, `-5`, `-6`, and `-stdin` support.
- SDK4 requires the Vue 2 template compiler. Its published XSS advisory has no Vue 2-compatible patched release; it remains a developer-side compiler dependency and plugin source/templates must be trusted. The vulnerable PostCSS 7 transitive dependency is overridden to patched PostCSS 8 and covered by the full build/package suite.
- The current vendor-modified Vue style pipeline builds successfully but emits `postcss.plugin was deprecated` warnings from its `trim` and `add-id` plugins. This is a toolchain maintenance issue, not a failed build or router compatibility error.
- `vue-loader` pulls deprecated `consolidate@0.15.1` through `@vue/component-compiler-utils`. It has no active npm security advisory and is not a runtime dependency of the published CLI, but remains legacy toolchain debt.
