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
- The travel router was offline during the latest implementation pass, so the final CLI validation used official firmware artifacts, cryptographic fixtures, and an in-process mock RPC transport.
- HTTPS certificate validation requires a trusted router certificate. A self-signed certificate needs an explicit `--insecure` opt-out.
- Local auth currently requires an `openssl` executable with `passwd -1`, `-5`, `-6`, and `-stdin` support.
