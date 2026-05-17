---
"@arshad-shah/clif": patch
---

**Internal refactor: dedupe shared logic across core, prompts, and helpers.**

No behavior change — the public API and every test/snapshot stay
identical. The goal is a tighter, easier-to-maintain codebase ahead of
future feature work.

- `core/command.ts`: the implicit `--help` / `--version` flag-merging
  block was duplicated between the parse path and the help printer.
  Extracted into a single `buildMergedArgs(command, root)` helper, so
  there is exactly one source of truth for which short aliases get bound
  and when `--version` shows up.
- `core/colors.ts` / `utils/helpers.ts`: the ANSI SGR regex
  (`/\x1b\[[0-9;]*m/g`) was declared in two places. Exposed
  `makeAnsiRegex()` as a factory (fresh instance per call, since `.exec`
  on a `/g` regex carries `lastIndex` state) and switched `truncate` to
  use it.
- `prompts/prompts.ts`: the raw-stdin save / set / restore dance was
  open-coded in `readLineRaw`, `password`, `select`, and `multiselect`.
  Extracted `enterRawMode(stdin)` which returns a teardown closure, so
  no prompt can accidentally leave the terminal in raw mode.
- `prompts/prompts.ts`: the menu paint loop (line-counting + rewind +
  repaint) and the "clear menu, write summary line" routine were
  copy-pasted between `select` and `multiselect`. Extracted
  `createMenuPainter()` with `paint(body)` / `replaceWith(summary)`.
- `prompts/prompts.ts`: cursor navigation with disabled-option skip was
  duplicated. Extracted `moveCursor(options, cursor, direction)` — and
  the new version doesn't infinite-loop when every option is disabled.
- `prompts/prompts.ts`: nine occurrences of the
  `${cyan("?")} ${bold(message)}…` and
  `${green("✔")} ${bold(message)} ${dim("·")} …` template strings
  collapsed into `formatQuestion`, `formatAnswer`, and a
  `CLEAR_PREV_LINE` constant.
- `output/components.ts`: `isStreamTTY` used a structural cast
  (`(stream as { isTTY?: boolean }).isTTY`). Replaced with an
  `"isTTY" in stream && stream.isTTY === true` check that is actually
  type-checked rather than asserted.

**Tooling**: the monorepo `version-packages` script now runs `pnpm
format` after `changeset version`, so the auto-opened Version Packages
PR no longer reformats `package.json` away from biome's `lineWidth:100`
canonical form. This changeset is also the first opportunity to verify
that fix end-to-end.
