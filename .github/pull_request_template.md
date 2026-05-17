<!--
  Thanks for opening a PR! A few quick checks make review faster.
  Delete sections that don't apply.
-->

## What

<!-- A one-line summary of what this PR changes. -->

## Why

<!-- The user-visible reason this change matters. Issue link if there is one. -->

Closes #

## How

<!-- Brief sketch of the approach. Anything subtle reviewers should know? -->

## Checklist

- [ ] Tests added / updated for any behavior change
- [ ] `pnpm test` passes locally
- [ ] `pnpm lint` and `pnpm format:check` pass
- [ ] `pnpm typecheck` passes
- [ ] A `.changeset/*.md` is included (run `pnpm changeset`) if this
      change touches `packages/clif/`
- [ ] Docs updated under `packages/docs/` if a public API changed
- [ ] No new runtime dependencies added (clif is zero-dependency)
