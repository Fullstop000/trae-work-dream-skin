# Changelog

All notable changes to this package are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `twskin theme download [id]` for verified official GitHub Release theme packs.
- `twskin theme load <directory>` for atomic local theme installation.
- Independent, checksummed theme-pack build and Release upload automation.

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

## [0.4.0] - 2026-07-22

### Added

- First npm-ready `twskin` CLI package.
- Commands for start, status, themes, theme selection, doctor, restore,
  uninstall, version and help.
- External theme-directory loading with `TWSKIN_THEMES_DIR` support.
- Integrity-manifested injection runtime with no bundled theme assets.
- Structured JSON output for status, themes and doctor.
- Concurrency lock and stale-lock recovery for mutating commands.
