# Security Policy

## Supported versions

Security fixes are provided for the latest minor release.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Include
the affected version, macOS and TRAE versions, reproduction steps and expected
impact. Do not include access tokens, personal data or unrelated application
content.

## Security boundaries

- CDP binds to `127.0.0.1` only.
- The CLI verifies that the configured CDP port belongs to TRAE before using it.
- The TRAE application bundle and code signature are never modified.
- Packaged engine files are covered by a SHA-256 manifest checked by
  `twskin doctor`.
- Themes are loaded from a user-controlled data directory, never `node_modules`.
- Remote theme packs are size-limited, SHA-256 verified, checked for unsafe tar
  paths and link/special-file entries, then installed atomically outside the npm
  package directory.
- Local theme loading rejects symlinks and copies only canonical theme assets.
