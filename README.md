# clif

> Tiny, zero-dependency CLI framework with beautiful output and a composable API.

This repository is a pnpm monorepo containing the `clif` framework and its
documentation site.

## Packages

| Package                                  | Description                                  |
| ---------------------------------------- | -------------------------------------------- |
| [`packages/clif`](./packages/clif)       | The framework itself. Published to npm.      |
| [`packages/docs`](./packages/docs)       | Starlight-based documentation site.          |
| [`packages/example`](./packages/example) | End-to-end demo CLI (`kit`) for development. |

## Quick start

```bash
pnpm install            # install all workspace deps
pnpm build              # build clif
pnpm test               # run all clif tests
pnpm example demo all   # exercise every renderer end-to-end
pnpm docs:dev           # serve the docs site locally
```

## Development

Node and pnpm versions are pinned via both `volta` and the `packageManager`
field in `package.json`. If you use [Volta](https://volta.sh), `node` and
`pnpm` switch automatically when you `cd` into the repo.

```bash
pnpm lint               # Biome (JS/TS/JSON)
pnpm format             # Biome + Prettier (everything else)
pnpm typecheck          # tsc --noEmit across the workspace
pnpm changeset          # author a changeset for your PR
```

## License

MIT — see [LICENSE](./LICENSE).
