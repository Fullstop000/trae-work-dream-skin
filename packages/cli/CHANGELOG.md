# Changelog

All notable changes to this package are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] - 2026-07-29

### Added

- Added `--version` and `-V` aliases for printing the CLI version.
- Added global `--dry-run` (with `--dryrun` compatibility alias). Mutating
  commands now return a no-side-effect execution plan, while read-only commands
  mark their JSON response with `dryRun: true`.

### Changed

- Moved CLI command and option parsing to Commander, while retaining the
  established Chinese diagnostics and JSON error contract.

## [0.5.10] - 2026-07-29

### Fixed

- Updated `Solvay 1927 · Solarized Light` to theme version `1.0.11`. Task
  previews now remain on a readable light-paper surface, user messages use a
  tighter index-card layout, and the composer has one coherent archive frame
  instead of competing inner and outer borders.
- Made the sidebar and update-banner actions follow every theme's semantic
  popover, text, border and interaction colors, preventing unreadable dark
  fills in light themes.

### For contributors

- Documented the token, component and host-adapter mapping chain, and added
  regression checks for unmapped runtime variables and theme overrides of
  runtime-owned update actions.

## [0.5.9] - 2026-07-29

### Fixed

- Updated `Solvay 1927 · Solarized Light` to theme version `1.0.5`. Its
  Markdown text now follows the original Solarized Light content hierarchy:
  Base00 body text, Base01 headings and emphasis, and Base0 auxiliary text.

## [0.5.8] - 2026-07-29

### Fixed

- Restored reliable reading contrast in `墨`, `极光`, `雾林`, `深海`, `樱夜`,
  and `日落`. Their dark artwork now activates TRAE's dark appearance contract
  and uses dark, opaque-enough working surfaces instead of pale panels over a
  dark background.

### Changed

- Rebuilt the six monochrome-gradient theme backgrounds with their own visual
  grammar: ink texture, aurora ribbons, mist layers, ocean currents, night
  blossom branches, and sunset dunes.
- Bumped the six updated theme packages to `1.1.0` and added complete semantic
  tokens for chat, menus, settings, focus, scrollbars, and the embedded
  workbench.

### For contributors

- Added release coverage that keeps dark-art themes on the dark appearance
  contract with complete panel and interaction roles.

## [0.5.7] - 2026-07-29

### Fixed

- Prevented theme artwork from bleeding through right-side working content by
  making layout-surface ownership a runtime contract. The main workspace now
  retains its declared surface color, opacity, and blur beneath Markdown,
  Task Summary, and Code/Design content.
- Updated `Solvay 1927 · Solarized Light` to theme version `1.0.4`, restoring
  a readable warm-paper surface in the right workspace and Monaco editor.

### Changed

- Added catalog validation that rejects official theme CSS which overrides a
  runtime-owned layout surface directly; themes use surface-decoration
  variables for optional texture instead.

## [0.5.6] - 2026-07-27

### Changed

- Reorganized Theme Manager controls by ownership: current-theme settings now
  contain only per-theme appearance controls, while catalog updates, local theme
  scanning, and restoring TRAE's native appearance live in Theme Library Settings.
- Moved Theme Library Settings to a compact, accessible gear button in the
  manager header. Manual update checks and their status now live there, keeping
  the theme gallery focused on browsing and switching themes.

## [0.5.5] - 2026-07-27

### Added

- Versioned theme metadata (`version` and `engines.twskin`) and the generated
  GitHub Release Catalog.
- `twskin theme check`, `twskin theme sync` and `twskin theme auto-update`.
- Theme Manager update status, manual sync action and automatic-update toggle.
- The official `Solvay 1927 · Solarized Light` theme.

## [0.5.4] - 2026-07-27

### Fixed

- Installation now explicitly uses npm's public registry.

### Changed

- Theme Manager now reports the matching `0.5.4` package version.

### For contributors

- The npm publish workflow now performs the package build and validation once,
  and serializes duplicate publishes for the same release tag.

## [0.5.3] - 2026-07-26

### Added

- `twskin stop` now stops the watcher and restores TRAE's native appearance
  without quitting TRAE, while preserving the selected theme and its settings.
- The selected theme is reapplied automatically after TRAE restarts while the
  watcher remains active.

### Changed

- The watcher now remains available while TRAE is closed and reconnects on a later
  launch.
- JSONC comments, unrelated settings and any existing `remote-debugging-port`
  value are preserved when enabling automatic reconnection, then restored on
  stop, restore or uninstall.

### Removed

- The misspelled `twskin unisntall` compatibility alias is no longer accepted.

### Fixed

- The restore control now returns from `取消 / 确认恢复` to `恢复默认` after the
  user confirms restoration.

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
