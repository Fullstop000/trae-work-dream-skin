# Contributing

Thank you for improving TRAE Work Skin.

## Development setup

Use a supported Node.js LTS release (22 or 24):

```bash
cd packages/cli
npm run prepare:runtime
npm run check
npm test
```

Before opening a pull request, also inspect the exact npm payload:

```bash
npm pack --dry-run
```

## Pull requests

- Keep CLI behavior backward compatible unless the change is explicitly marked
  as breaking.
- Add tests for successful behavior and failure atomicity.
- Do not add network downloads without integrity verification and rollback.
- Do not add runtime dependencies without explaining the security and package
  size trade-off.
- Never include source artwork, credentials, local state or CDP logs in the npm
  tarball.

## Releases

Versions follow Semantic Versioning. Publishing is performed from CI with npm
trusted publishing/provenance; maintainers should not publish ad hoc local
tarballs to the public registry.
