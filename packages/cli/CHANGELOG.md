# Changelog

All notable changes to this package are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.2] - 2026-07-24

### Changed

- Ask users to save their work and confirm before `twskin start` restarts a
  running TRAE process to enable CDP. Non-interactive callers must pass `--yes`.

## [0.5.1] - 2026-07-24

### Changed

- Download the latest fixed-name theme assets directly from GitHub Release
  redirects instead of consuming anonymous GitHub API quota.

## [0.5.0] - 2026-07-24

### Added

- `twskin theme download [id]` for verified official GitHub Release theme packs.
- `twskin theme load <directory>` for atomic local theme installation.
- Independent, checksummed theme-pack build and Release upload automation.
- Per-theme background brightness and main-workspace overlay controls in Theme
  Manager, with values persisted in each theme's settings.
- A V3 bridge for VS Code core color variables so IM Channel and legacy
  workbench surfaces follow the active theme palette.

### Changed

- Renamed the unpublished package and command to `twskin`; the default data
  directory is now `~/.trae-work-skin` and public environment variables use the
  `TWSKIN_` prefix.
- Rebuilt the command layer in strict TypeScript and moved the executable to the
  compiled `dist/` entrypoint.
- Adopted Clack for first-start confirmation, download progress, cancellation,
  and completion guidance while preserving clean `--json` output.
- Standardized installation on the npm CLI and its external theme download
  flow.
- Consolidated the injection engine into the tracked `runtime/` directory;
  manifest generation no longer copies a second runtime tree.
- Split shared and Theme Manager CSS out of `skin.js`, and moved EVA/Xianzhou
  component styling into each theme's dynamically loaded `theme.css`.
- Resolve runtime, data and theme paths consistently from
  `~/.trae-work-skin`, including global and internal-registry installations.
- Theme Manager configuration now exposes only controls supported by the
  selected theme.

### Fixed

- Allow authenticated GitHub Release downloads when anonymous API quota is
  unavailable, without forwarding credentials to configured mirrors.
- Clear stale theme artwork variables when switching between themes.
- Keep the generated runtime manifest limited to the canonical payload files.
- Restore and startup scripts now use the same data directory as the CLI.

## [0.4.0] - 2026-07-22

### Added

- First npm-ready `twskin` CLI package.
- Commands for start, status, themes, theme selection, doctor, restore,
  uninstall, version and help.
- External theme-directory loading with `TWSKIN_THEMES_DIR` support.
- Integrity-manifested injection runtime with no bundled theme assets.
- Structured JSON output for status, themes and doctor.
- Concurrency lock and stale-lock recovery for mutating commands.
