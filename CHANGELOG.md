# Changelog

All notable changes to this project are documented in this file. The format is
based on Keep a Changelog, and versions follow Semantic Versioning.

## [Unreleased]

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

[Unreleased]: https://github.com/go-wombat/gl-sdk4-plugin-kit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/go-wombat/gl-sdk4-plugin-kit/releases/tag/v0.2.0
