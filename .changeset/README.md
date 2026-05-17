# Changesets

This directory holds [Changesets](https://github.com/changesets/changesets) —
human-readable notes describing what changed in each PR and how the version
should bump.

## Authoring a changeset

```bash
pnpm changeset
```

The wizard asks which packages changed, picks a bump level (patch / minor /
major), and writes a markdown file here. Commit it alongside your code.

## Releasing

CI (or a maintainer) runs:

```bash
pnpm version-packages   # consume the changesets, bump versions, write CHANGELOG.md
pnpm release            # build then publish to npm
```

## What this repo publishes

Only `clif` is published. `clif-docs` and `@clif/example` are listed in
`config.json` under `ignore`, so they never get versioned or published.
