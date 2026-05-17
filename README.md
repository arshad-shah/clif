# clif

[![CI](https://github.com/arshad-shah/clif/actions/workflows/ci.yml/badge.svg)](https://github.com/arshad-shah/clif/actions/workflows/ci.yml)
[![Release](https://github.com/arshad-shah/clif/actions/workflows/release.yml/badge.svg)](https://github.com/arshad-shah/clif/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/@arshad-shah/clif?logo=npm)](https://www.npmjs.com/package/@arshad-shah/clif)
[![npm downloads](https://img.shields.io/npm/dm/@arshad-shah/clif?logo=npm&color=cb3837)](https://www.npmjs.com/package/@arshad-shah/clif)
[![bundle size](https://img.shields.io/bundlejs/size/@arshad-shah/clif?label=bundle&color=f5c76a)](https://bundlejs.com/?q=@arshad-shah/clif)
[![License: MIT](https://img.shields.io/npm/l/@arshad-shah/clif?color=blue)](./LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-11-f69220?logo=pnpm)](https://pnpm.io)
[![types: included](https://img.shields.io/npm/types/@arshad-shah/clif?logo=typescript)](./packages/clif/src)

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
