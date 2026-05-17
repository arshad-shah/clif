# clif

## 1.1.1

### Patch Changes

- a6acffd: **Library audit: bug fixes + previously no-op features implemented.**

  Bug fixes:
  - `divider({ label, width })` no longer crashes with `RangeError` when the
    label is wider than `width`. The border segments clamp to zero instead.
  - `createProgress` format placeholders (`:bar`, `:percent`, `:current`,
    `:total`) now replace every occurrence rather than only the first.
  - `box({ title })` keeps the top and bottom borders the same visible width
    when the title is wider than the content; inner width now accounts for
    the title as well as `width` and content.
  - `parseArgs` rejects a `default` that violates declared `choices` (for
    both scalar and `multiple: true` flags) at parse time, instead of
    silently flowing an invalid value through to your handler.
  - `parseArgs` rejects empty inline values for `number` flags (`--port=`
    used to coerce silently to `0`); `string` flags still accept empty.
  - `parseArgs` correctly classifies negative numbers in scientific notation
    (`-1e3`, `-2.5e2`) as flag values rather than misreading them as flags.
  - `parseArgs` throws a clear `ArgError` when a value is supplied to a
    `--no-*` negation of a known boolean (`--no-verbose=true`), instead of
    silently dropping it into `unknown[]`.
  - `rgb`, `rgb256`, `bgRgb`, `bgRgb256` validate channel range `[0, 255]`
    and throw `RangeError` on bad input rather than emitting invalid ANSI.
  - `formatDuration` returns a sensible string for non-finite input
    (previously rendered `"NaNm NaNs"` / `"Infinitym NaNs"`).

  Newly implemented (previously declared but no-op):
  - `TableOptions.compact: true` suppresses the separator row between the
    header and body rows for a denser layout.
  - `NumberOptions.step` is now enforced: the `number` prompt rejects values
    that aren't a multiple of `step`, anchored to `min` when set
    (`min: 1, step: 2` accepts `1, 3, 5, …`).

  Internal cleanup:
  - Removed a duplicate ANSI-aware truncation routine in `components.ts`;
    table cells now use the shared `truncate` helper from `utils/helpers`.
    Net: a small drop in bundle size.

- ea1524a: **Internal refactor: dedupe shared logic across core, prompts, and helpers.**

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

## 1.1.0

### Minor Changes

- c853478: **Staff-review bug sweep + DX upgrades.**

  New features:
  - **Strongly typed flags.** `parseArgs(defs)` now returns a fully inferred
    `ParsedArgs<T>` so `result.flags.port` is `number`, not
    `string | number | boolean`. Exposed `FlagValueOf<D>` and
    `FlagsFromDefs<T>` for downstream composition.
  - **`defineCommand` helper.** Identity helper that preserves literal types on
    a `CommandDef` so handlers get correctly-typed `ctx.args.flags` without an
    explicit annotation.
  - **`-h` / `-v` aliases.** `--help` and `--version` are listed in generated
    help output and have short-flag aliases. Aliases yield to a user-defined
    `-h` / `-v` so existing CLIs are not silently shadowed.
  - **Repeat / array flags.** `ArgDef.multiple: true` accumulates repeated
    occurrences into a typed array.
  - **`--no-foo` negation.** Honored for known boolean flags only.
  - **Unknown-subcommand error with "did you mean".** `git buidl` exits with a
    friendly error and suggests `git build` when sufficiently close.
  - **`ctx.parents`** in `CommandContext` exposes the ancestor command chain.
  - **`PromptError`** with discriminated `code: "cancelled" | "not-a-tty"`
    replaces silent `process.exit(130)` and undefined behavior on piped stdin.

  Bug fixes:
  - Stacked short flags (`-abc`) now validate each char as a boolean flag and
    route unknown chars through the normal unknown-flag path instead of
    silently setting `true` on string-typed flags.
  - `required` is honored even when `default` is set; the parser tracks
    user-provided vs. default origin.
  - Spinner and progress are TTY-aware: in non-TTY streams they emit a single
    static line (no `\r\x1b[K` flooding CI logs); on TTY the spinner hides and
    restores the terminal cursor and installs a SIGINT handler.
  - `createProgress` throws `RangeError` on non-finite / non-positive `total`
    instead of crashing inside `String.repeat(NaN)`.
  - `password` paste now emits one mask glyph per visible character and
    rejects with `PromptError("not-a-tty")` on piped stdin instead of crashing
    inside `setRawMode`.
  - `wordWrap` and `truncate` measure visible width and skip ANSI escapes.
  - `hex()` / `bgHex()` throw on invalid hex input instead of silently
    producing `\x1b[NaN;NaN;NaNm`.
  - Space no longer confirms `select` (it's reserved for `multiselect` toggle).
  - `multiselect` shows a visible "Select at least N" error when `min` not met
    instead of silently blocking Enter.
  - `confirm` cleanly rejects with `PromptError("cancelled")` on Ctrl+C.
  - Table truncation preserves the wrapping ANSI escape codes so styling
    doesn't leak into adjacent columns.
  - `tree()` no longer exposes its internal `prefix` parameter.
  - `formatBytes` handles negative inputs (`-512 B`).
  - `ArgError` now carries a `.flag` field with the offending canonical name.
  - Unhandled errors from `createCLI` render with a red `✖ Error` /
    `✖ Invalid argument` prefix.

  Hardening:
  - Argv keys `__proto__`, `constructor`, `prototype` are routed to
    `unknown[]` and never written to the flags object. `flags` is built on a
    null-prototype object and copied out.
  - Unknown flags now error by default at the CLI level instead of being
    silently absorbed; pass an explicit `allowUnknown: true` to `parseArgs`
    if you need the old behavior.

  51 new tests; 223 total.

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
