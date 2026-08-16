# Changelog

All notable changes to this project are documented in this file. The format is
based on Keep a Changelog, and versions follow Semantic Versioning.

## [Unreleased]

## [0.4.0] - 2026-08-16

### Added

- Project-specific `compatibility.requiredCapabilities` manifest contract with
  schema validation and `X-GL-RPC-Capabilities` package metadata.
- Local `glplugin capabilities` discovery command for valid IDs, probes, and gates.

### Changed

- Project-aware `doctor` and `test` now fail when a declared RPC capability is not
  available while preserving skip behavior for optional capabilities.

## [0.3.0] - 2026-08-15

### Added

- Strict `sdk4-modern-v1` compatibility policy with a firmware 4.8 minimum,
  exact model/firmware/bundle tuples, portable component requirements, and an
  explicit `--allow-unverified` development override.
- Official firmware artifact matrix for GL-MT3000 4.8.1, GL-AXT1800 4.8.3,
  GL-SFT1200 4.8.3, and GL-MT6000 4.9.1.
- SSH platform preflight for firmware, UI runtime, `opkg`, package architecture,
  lifecycle dispatch, and free overlay space.
- Firmware contract CI that verifies vendor SHA-256 values and inspects the
  official SquashFS images.

### Changed

- `doctor` now identifies the exact HTTP admin bundle instead of treating every
  `4.x` firmware as compatible.
- `test` now requires the project menu entry from `ui.get_menu_list` in addition
  to the installed view and Vue export.
- Generated manifests and package metadata declare their firmware/runtime
  requirements.
- CI actions run on their supported Node 24 runtime.

### Validation

- Repeated the live MT3000 workflow with strict preflight: doctor, package install,
  menu RPC verification, view evaluation, and uninstall all passed.
- Production dependency audit reports zero vulnerabilities. The unpatched Vue 2
  compiler advisory remains documented as a build-time-only constraint.

## [0.2.0] - 2026-08-15

### Added

- Unified `glplugin` command dispatcher with command help, JSON output, quiet and
  verbose modes, stable exit codes, and `--cwd` support.
- Project-local router targets without credential storage.
- `check`, safe `.ipk` inspection, install, uninstall, and watch workflows.
- `ui-only` and `full-stack` manifests with filesystem overlays, dependencies,
  conffiles, and lifecycle hooks.
- Firmware doctor with challenge-algorithm negotiation and feature-gated RPC probes.
- Fingerprint-bound component catalogs for GL-MT3000 firmware 4.8.1 and 4.9.0 beta6.
- Linux and macOS CI plus an npm release workflow.

### Changed

- Router tests now reuse the doctor's capability catalog instead of probing a
  separate hard-coded method list.
- Deploy, install, extract, and development cycles reuse bounded OpenSSH master
  connections to avoid repeated password prompts.
- Install removes its temporary router-side `.ipk` while preserving the `opkg`
  result.
- Unknown firmware bundles fail closed instead of presenting static string matches
  as a verified global component registry.

### Security

- Router passwords are accepted only through a hidden TTY prompt or stdin and are
  never placed in process arguments.
- SSH/SCP use validated argument arrays with `shell: false` and host-key checking.
- RPC extraction redacts recognized credentials and private keys by default.
- Archive paths, package metadata, project paths, and lifecycle scripts are
  validated before packaging or inspection.

### Validation

- The complete CLI workflow was tested against a live GL-MT3000 running firmware
  4.8.1 `release8`, including full-stack install, backend execution, development
  redeploy, and package cleanup.

[Unreleased]: https://github.com/go-wombat/gl-sdk4-plugin-kit/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/go-wombat/gl-sdk4-plugin-kit/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/go-wombat/gl-sdk4-plugin-kit/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/go-wombat/gl-sdk4-plugin-kit/releases/tag/v0.2.0
