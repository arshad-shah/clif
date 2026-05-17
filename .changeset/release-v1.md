---
"clif": major
---

**v1.0.0 — first stable release.**

`clif` is now stable. The framework's public API is frozen for the 1.x line:
core (`createCLI`, `parseArgs`), colors (16 / 256 / truecolor + modifiers,
`NO_COLOR` / `FORCE_COLOR` aware), output components (`box`, `table`,
`keyValue`, `list`, `tree`, `divider`, `banner`, `log`), async UI
(`createSpinner`, `createProgress`), and interactive prompts (`text`,
`password`, `confirm`, `select`, `multiselect`, `number`, `group`) — all
zero-dependency, under 15 KB gzipped, split across `clif` and `clif/prompts`
entry points for tree-shaking.
