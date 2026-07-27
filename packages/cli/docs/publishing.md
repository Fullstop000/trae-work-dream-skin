# Publishing `twskin`

The public npm package is unscoped: `twskin`.

## First release

Run these commands locally after signing in to the public npm registry. Keep your npm password and one-time code private.

```bash
npm login --registry=https://registry.npmjs.org
cd packages/cli
npm ci --ignore-scripts
npm run prepare:runtime
npm test
npm pack --dry-run
npm publish --access public
```

This creates the current `twskin` version on npm. Verify it with:

```bash
npm view twskin version --registry=https://registry.npmjs.org
npm install --global twskin@latest --registry=https://registry.npmjs.org
```

## Trusted publishing

After the first release, configure npm Trusted Publishing for `twskin`:

- GitHub owner: `Fullstop000`
- Repository: `trae-work-dream-skin`
- Workflow: `npm-publish.yml`
- Environment: `npm`
- Allowed action: `npm publish`

The workflow publishes automatically when a `v*` tag is pushed. It can also be run manually with an existing tag. The package version must match the tag without its `v` prefix.

Use the GitHub `npm` environment to require release approval. Do not add a long-lived npm publish token to repository secrets.

## Later releases

1. Update `packages/cli/package.json` and `package-lock.json` to the next version.
2. Commit the version change and create a matching `v<version>` tag.
3. Push the commit and tag. The npm workflow publishes the CLI.
4. Create a GitHub Release from the same tag. The theme-release workflow publishes the matching theme pack.
