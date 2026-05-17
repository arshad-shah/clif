# Contributing to clif

Thanks for taking the time to contribute! This document covers the
workflow for getting changes into the project.

## Prerequisites

- **Node** 22+ (24 recommended — pinned via Volta in `package.json`)
- **pnpm** 11+ (pinned via `packageManager` and Volta)

If you use [Volta](https://volta.sh), `cd` into the repo and the right
versions of Node + pnpm activate automatically. Otherwise Corepack
(`corepack enable`) will install the pinned pnpm.

## Setup

```bash
git clone https://github.com/arshad-shah/clif.git
cd clif
pnpm install
pnpm build           # build clif so the example can resolve it
pnpm test            # 172 tests should pass
pnpm example demo all  # exercise every renderer end-to-end
```

## Making changes

### 1. Write the test first

Every bug fix or behavior change needs a regression test. The repo uses
**vitest**:

```bash
pnpm --filter clif test          # one-shot
pnpm --filter clif test:watch    # watch mode while developing
pnpm --filter clif test:coverage # coverage report
```

### 2. Lint and format

Biome handles JS / TS / JSON; Prettier handles Markdown, MDX, YAML, CSS,
Astro. Both run together:

```bash
pnpm lint            # check
pnpm lint:fix        # autofix safe issues
pnpm format          # apply Prettier + Biome formatting
pnpm format:check    # CI-equivalent dry-run
```

### 3. Add a changeset

Any change that affects the published `clif` package needs a changeset.
Run:

```bash
pnpm changeset
```

The wizard asks which packages changed and the bump level
(`patch` / `minor` / `major`). It writes a markdown file under
`.changeset/`. Commit it alongside your code. When the release workflow
runs, all queued changesets are rolled into `packages/clif/CHANGELOG.md`.

Skip the changeset only for changes that don't touch `packages/clif/`
(docs site, example CLI, CI tweaks).

### 4. Verify before opening the PR

```bash
pnpm typecheck                # tsc --noEmit across all packages
pnpm --filter clif validate   # build + publint + exports smoke + size budget
pnpm docs:build               # docs site still builds
```

CI runs the equivalent on every PR; running locally first is faster.

## Pull requests

- One logical change per PR. Refactors and feature work in separate PRs.
- Title in conventional-commits style: `fix(clif): …`, `feat(clif): …`,
  `docs: …`, `chore: …`. The release workflow doesn't parse titles, but
  consistent titles read better in `git log`.
- Link the issue you're closing in the description.
- Include a changeset (see above) unless the change is doc-only or
  CI-only.
- All status checks must be green before merge.

## Reporting bugs

Open a GitHub issue with:

- The `clif` version (`npm ls clif`)
- The Node version and platform
- A minimal reproduction (ideally a runnable snippet that imports
  `clif` and shows the unexpected behavior)
- Expected vs. actual output

For security issues, **don't** open a public issue — follow
[SECURITY.md](./SECURITY.md).

## Code of conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
By participating, you agree to abide by its terms.

## License

By contributing, you agree your contributions will be licensed under the
project's [MIT License](./LICENSE).
