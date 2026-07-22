# Theme distribution decision

## Current decision

Themes are data, not CLI implementation. The `twskin` npm package
therefore contains no theme manifests or images.

The CLI loads themes from the user data directory:

```text
~/.trae-work-skin/themes/<theme-id>/
```

`TWSKIN_THEMES_DIR` can override this location for development, managed desktops
or portable installations. The npm-installed CLI asks before downloading the
official theme pack on first start; the package itself contains no themes.

This boundary allows CLI and themes to have independent release cadences and
keeps large visual assets out of normal CLI upgrades.

## Official GitHub Release protocol

Every CLI release attaches these independently downloadable assets:

```text
twskin-themes-v<version>.tar.gz
twskin-themes-v<version>.sha256
```

`twskin theme download [id]` resolves the latest GitHub Release and requires asset
names to match its tag exactly. With no ID, all themes are installed; with an ID,
only that theme is installed. The archive root contains `theme-pack.json` and
`themes/<id>/` directories.

The command limits metadata and archive sizes, uses a network timeout, verifies
SHA-256 before extraction, rejects absolute/traversal paths and link/special file
types, validates every theme manifest and performs an atomic directory swap with
rollback. It never changes the active theme implicitly.

For testing or an enterprise mirror, `TWSKIN_RELEASE_API_URL` may point to a
GitHub-compatible latest-release JSON endpoint.

## Local loading

`twskin theme load <directory>` accepts either a directory containing `theme.json`
or a parent whose immediate children are theme directories. Only `theme.json`,
optional `theme.css`, canonical backgrounds and side-panel assets, and supported
files below `icons/` are copied. Symlinks and oversized themes are rejected.

Publishing a second npm package is not preferred: it would place mutable theme
data under `node_modules` and make selective updates awkward. Package signatures
or a signed catalog should be added before third-party registries are enabled.
