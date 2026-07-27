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
twskin-themes.tar.gz
twskin-themes.sha256
twskin-themes-v<version>.tar.gz
twskin-themes-v<version>.sha256
twskin-catalog-v1.json
twskin-catalog-v1-v<version>.json
```

`twskin theme download [id]` downloads the fixed-name assets through GitHub's
`releases/latest/download` redirect, without calling the rate-limited Releases
API. The versioned copies remain available for archival and manual downloads.
With no ID, all themes are installed; with an ID, only that theme is installed.
The archive root contains `theme-pack.json` and `themes/<id>/` directories.

`twskin-catalog-v1.json` is uploaded after all theme assets. It contains the
release tag, a versioned package filename, size and SHA-256, plus each theme's
ID, SemVer version, schema version and compatible CLI range. Catalog sync
downloads the package from `releases/download/<release-tag>/`, never through the
mutable `latest/download` alias. The CLI caches it locally and uses `ETag`
conditional requests; the Theme Manager watcher checks at most once every six
hours. `twskin theme check` only checks the catalog, while
`twskin theme sync` downloads the pack only when compatible themes are new or
have a higher version. Automatic official-theme updates can be toggled with
`twskin theme auto-update on|off`.

The command limits metadata and archive sizes, uses a network timeout, verifies
SHA-256 before extraction, rejects absolute/traversal paths and link/special file
types, validates every theme manifest and performs an atomic directory swap with
rollback. It never changes the active theme implicitly.

For testing or an enterprise mirror, `TWSKIN_RELEASE_ASSET_BASE_URL` may point
to a directory containing the versioned asset names declared by the Catalog.
The legacy
`TWSKIN_RELEASE_API_URL` override remains available for a GitHub-compatible
latest-release JSON endpoint.

`TWSKIN_THEME_CATALOG_URL` can override the Catalog URL for tests or an
enterprise deployment. Its referenced package assets still resolve from
`TWSKIN_RELEASE_ASSET_BASE_URL`.

When GitHub's anonymous API quota is unavailable, set `TWSKIN_GITHUB_TOKEN`,
`GH_TOKEN`, or `GITHUB_TOKEN`. The CLI only sends that token to HTTPS requests
for `api.github.com` and `github.com`; it is never forwarded to a configured
mirror.

## Local loading

`twskin theme load <directory>` accepts either a directory containing `theme.json`
or a parent whose immediate children are theme directories. Only `theme.json`,
optional `theme.css`, canonical backgrounds and side-panel assets, and supported
files below `icons/` are copied. Symlinks and oversized themes are rejected.

Publishing a second npm package is not preferred: it would place mutable theme
data under `node_modules` and make selective updates awkward. Package signatures
or a signed catalog should be added before third-party registries are enabled.
