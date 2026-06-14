---
"@arshad-shah/clif": minor
---

Six new capabilities across prompts, output, and argument parsing (all
additive — existing behavior and output are unchanged):

- **Named positional schema** — `parseArgs` accepts a `positionals` array
  (`PositionalDef`) and surfaces named, typed, validated values on
  `result.values`. Supports `type`, `required`, `choices`, `variadic`, and
  `description`. `CommandDef.positionals` wires the same into `createCLI`,
  including a usage line and an `Arguments:` help section.
- **`table` cell wrapping** — `wrap: true` wraps cells past `maxColumnWidth`
  onto multiple lines (rows grow to their tallest cell) instead of truncating.
- **`spinner` prefix/suffix** — `prefixText` / `suffixText` frame the animated
  label (and the final success/fail/warn/info line), e.g. for step counters.
- **`confirm` single-keypress** — a single `y`/`n` resolves immediately without
  Enter; Enter alone still takes the default, and piped `y`/`yes` lines work.
- **`number` arrow-stepping** — ↑/↓ adjust the value by `step` (default 1),
  clamped to `min`/`max`, alongside direct typing.

Internal: `select` and `multiselect` now share a single raw-mode menu driver
(`runMenu`), removing the duplicated key-handling/repaint/cleanup logic with no
behavior change.
