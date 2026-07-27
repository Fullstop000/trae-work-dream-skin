# TRAE Work Skin

An unofficial theme manager for TRAE Work CN on macOS.

## Requirements

- macOS
- Node.js 22 or later
- TRAE Work CN

## Install

```bash
npm install --global twskin@latest --registry=https://registry.npmjs.org
twskin start
```

On first start, approve the theme-pack download. Save your work if `twskin` asks to restart TRAE.

Open Theme Manager from the palette button in the bottom-right corner of TRAE.

## Commands

| Action | Command |
| --- | --- |
| Start Theme Manager | `twskin start` |
| Stop and restore the native appearance | `twskin stop` |
| Show status | `twskin status` |
| Check the environment | `twskin doctor` |
| List installed themes | `twskin themes` |
| Switch themes | `twskin theme <id>` |
| Download themes | `twskin theme download [id]` |
| Load local themes | `twskin theme load <directory>` |
| Restore TRAE | `twskin restore` |
| Uninstall | `twskin uninstall` |
| Show version or help | `twskin version` / `twskin help` |

## Themes

Themes are stored in:

```text
~/.trae-work-skin/themes
```

Set `TWSKIN_THEMES_DIR` to use another directory. See [Theme Schema v3](docs/schema-v3.md) to create a theme.

## Development

```bash
node --test "tests/*.test.mjs"
(cd packages/cli && npm run prepare:runtime && npm test)
```

## Security

`twskin` connects to TRAE through CDP on `127.0.0.1` and does not modify the application bundle or code signature.

## License

[MIT](LICENSE) © Fullstop000
