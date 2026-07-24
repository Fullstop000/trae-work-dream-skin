# TRAE Work Skin CLI

`twskin` provides the `twskin` command for installing, diagnosing,
switching and restoring local themes in TRAE Work on macOS.

> **Unofficial:** TRAE Work Skin is an unofficial community theme manager for TRAE
> Work. It is not affiliated with, endorsed by, or sponsored by TRAE or
> ByteDance.

## Requirements

- macOS
- Node.js 22 or newer
- TRAE Work CN installed locally

## Install

```bash
npm install --global twskin
twskin start
```

The command layer is written in strict TypeScript and uses Clack for interactive
prompts and progress feedback. It only connects to the local TRAE process
through CDP on `127.0.0.1`; it does not modify the TRAE application bundle or
its code signature.

On first start, an empty theme directory prompts before downloading from the
latest official GitHub Release. Use `twskin start --yes` for explicit consent in
automation. If TRAE is already running without CDP, the CLI asks the user to
save their work and confirm before restarting it; `--yes` also explicitly
confirms that restart. Later starts use the local themes without downloading.

## Commands

```text
twskin start [--yes]         Initialize and start Theme Manager and its watcher
twskin stop                  Stop Skin and restore native appearance without quitting TRAE
twskin status [--json]       Show App, CDP, watcher and active-theme status
twskin themes [--json]       List locally installed themes
twskin theme <id>            Select a theme
twskin theme download [id]   Download all or one theme from the latest GitHub Release
twskin theme load <directory> Install one theme, or immediate child theme directories
twskin doctor [--json]       Validate Node, TRAE, port and package integrity
twskin restore               Restore the native TRAE appearance
twskin uninstall [--yes]     Restore TRAE and remove TRAE Work Skin data
twskin version               Print the CLI version
twskin help                  Print command help
```

`twskin theme <id>` applies immediately while Theme Manager is active. Otherwise
the selection is saved and applied by the next `twskin start`. `twskin stop`
preserves the selected theme and its settings, so a later `twskin start` can
restore them.

## Theme directory

The CLI package does not contain themes. It loads them from:

```text
~/.trae-work-skin/themes
```

Set `TWSKIN_THEMES_DIR` to use another absolute directory.

In a source checkout, the default is the repository's top-level `themes/`
directory. `theme load` copies only the canonical theme payload and installs it
atomically. `theme download` reads the latest official GitHub Release, verifies
the attached SHA-256 file and archive structure, then installs into the same
directory. See
[docs/theme-distribution.md](docs/theme-distribution.md).

The canonical payload may include `theme.css` for theme-specific component
styling and motion. The injector replaces this stylesheet atomically whenever
the active theme changes; declarative colors and component roles remain in
`theme.json`.

## Development

```bash
cd packages/cli
npm install
npm run prepare:runtime
npm run check
npm test
npm pack --dry-run
```

TypeScript compiles to `dist/`. The tracked `runtime/` directory is the single
source of truth for the injection engine; `prepare:runtime` only generates its
SHA-256 manifest. npm publishes both outputs, while themes remain external.

## Security

Please read [SECURITY.md](SECURITY.md). Do not report vulnerabilities in public
issues before a fix is available.

## License

MIT © Fullstop000
