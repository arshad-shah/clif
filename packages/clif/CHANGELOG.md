# clif

## 1.0.0

### Major Changes

- 37e49fd: **v1.0.0 — first stable release.**

  `clif` is now stable. The framework's public API is frozen for the 1.x line:
  core (`createCLI`, `parseArgs`), colors (16 / 256 / truecolor + modifiers,
  `NO_COLOR` / `FORCE_COLOR` aware), output components (`box`, `table`,
  `keyValue`, `list`, `tree`, `divider`, `banner`, `log`), async UI
  (`createSpinner`, `createProgress`), and interactive prompts (`text`,
  `password`, `confirm`, `select`, `multiselect`, `number`, `group`) — all
  zero-dependency, under 15 KB gzipped, split across `clif` and `clif/prompts`
  entry points for tree-shaking.

### Patch Changes

- 37e49fd: Polish package metadata for v1 publishing.
  - Add `repository`, `bugs`, `homepage` fields.
  - Add `publishConfig: { access: "public", provenance: true }` for npm
    provenance attestations on release.
  - Add `sideEffects: false` to enable stricter tree-shaking by bundlers.
  - Add `./package.json` to the `exports` map (consumers occasionally need it).
  - Expand `keywords` for discoverability.
  - Add `@types/node` as a devDependency and `types: ["node"]` to
    `tsconfig.json` so strict `tsc --noEmit` catches missing ambient
    types before they leak into the published `.d.mts`.

- 37e49fd: Accept negative numbers as flag values in `parseArgs()`.

  `--offset -5` and `-t -40` used to throw `Missing value for …` because the
  flag-vs-value heuristic was a bare `token.startsWith("-")` test. Negative
  numeric literals are common (offsets, deltas, temperatures) and must be
  consumable as values.

  Introduced a `looksLikeFlag(token)` helper that treats `undefined`, bare `-`,
  and `/^-\d+(\.\d+)?$/` as non-flags. Real flags (`-x`, `--foo`) still
  short-circuit value consumption — `--a --b x` correctly throws
  `Missing value for --a`.

- 37e49fd: Remove the broken `bin` field from `package.json`.

  `bin: { "clif": "./dist/bin.js" }` referenced an entry that `tsdown` never
  builds, causing a pnpm install warning on every install
  (`Failed to create bin … bin.js.EXE`). `clif` is a framework consumed by
  other CLIs, not itself a CLI binary, so the field had no purpose.

- 37e49fd: Fix `exports` map to reference the actual emitted artifact extensions.

  The map previously declared `./dist/index.js` and `./dist/index.d.ts` while
  `tsdown` emits `./dist/index.mjs` and `./dist/index.d.mts`. This made the
  published package un-importable under strict module resolution (pnpm + Node 24
  - TypeScript bundler mode). Aligned `main` / `module` / `types` / `exports`
    with the actual emitted artifacts.

- 37e49fd: Fix `table()` corner and junction glyphs.

  The renderer reused one separator string for the top, middle, and bottom
  borders, joining segments with `┼` everywhere. Visually broken corners. Now
  uses the correct box-drawing characters:
  - Top: `┌─┬─┐`
  - Header divider: `├─┼─┤`
  - Bottom: `└─┴─┘`

  Regression tests added.
