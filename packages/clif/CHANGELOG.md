# clif

## 1.4.0

### Minor Changes

- e1120ed: Add a FIGfont ASCII-art engine on the new `@arshad-shah/clif/banner` subpath.

  `figlet(text, opts)` renders large ASCII-art lettering from **any** FIGfont you
  supply — clif bundles no fonts, only the engine, so the import stays tiny and
  clif's concern stays purely CLI. Load a `.flf` with `parseFont(flf)` or
  `registerFont(name, flf)`, then pass it as `opts.font`.

  The engine implements FIGfont v2 in full: all six horizontal smushing rules,
  kerning, full-width, vertical smushing, and print direction. Rendering builds on
  clif's own colour system — a single `Formatter` or a multi-stop `gradient`
  painted across the rendered grid (horizontal/vertical/diagonal), with ANSI-aware
  width math so it composes with `box()` and friends. Supports alignment,
  width-based clipping/wrapping, and `NO_COLOR`/low-colour degradation.

  `figlet` is synchronous and pure. The existing core `banner()` is untouched and
  fully backward compatible.

  New exports from `@arshad-shah/clif/banner`: `figlet`, `renderFont`, `parseFont`,
  `registerFont`, and the types `Font`, `FigletOptions`, `RenderOptions`,
  `LayoutMode`, `PrintDirection`, `GradientDirection`, `Overflow`.

## 1.3.0

### Minor Changes

- ad490ac: Enrich the color layer with new composable APIs and smarter rendering:
  - **Chainable `style` API** — fluent, chalk-style styling such as
    `style.red.bold.underline("error")` and `style.hex("#f5c76a").bold("title")`.
    Each access returns a fresh, immutable builder that is safe to capture and reuse.
  - **`gradient`** — paint text with a smooth multi-stop gradient
    (`gradient(["#ff0080", "#7928ca"])("hello")`), one interpolated color per
    visible character. Returns a regular formatter, so it composes.
  - **`link`** — OSC 8 terminal hyperlinks with a `text (url)` fallback when
    links/color are unsupported.
  - **Automatic color downgrading** — `rgb`, `rgb256`, `hex`, and friends now map
    to the nearest renderable color (truecolor → 256 → 16) on weaker terminals
    instead of silently dropping all color. Exposes `rgbToAnsi256` and
    `rgbToAnsi16` helpers.
  - **3-digit hex shorthand** — `hex("#f80")` now expands to `#ff8800`.
  - `stripAnsi` / `visibleLength` are now hyperlink-aware (OSC 8 markup no longer
    counts toward visible width).

  Published bundles are now minified, keeping the artifacts well under the size
  budget despite the added features.

- 0d1cda7: Six new capabilities across prompts, output, and argument parsing (all
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

- 0d1cda7: Table column alignment + correct box padding:
  - **`table` column alignment** — new `align` option on `TableOptions`, exported
    as the `Align` type (`"left" | "center" | "right"`). Pass a single value to
    align every column the same way, or an array to align each column
    independently (columns past the array's end fall back to `"left"`, and headers
    align with their column). Defaults to `"left"`, so existing output is
    unchanged.
  - **`box` padding now applies to every side** — `padding` previously scaled the
    horizontal space but always emitted exactly one blank line top/bottom
    regardless of its value. It now adds `padding` blank lines vertically to match
    the horizontal columns, and normalises negative/fractional input to a
    non-negative integer. The default (`padding: 1`) renders identically to
    before.

  Docs: refreshed the API reference (it was missing `style`, `gradient`, `link`,
  `rgbToAnsi256`/`rgbToAnsi16`, and the `Style`/`ColorStop`/`Align` types, and
  incorrectly claimed `hex` required a 6-digit value) and filled in the missing
  option tables for `list`, `divider`, `banner`, `keyValue`, and the progress
  bar's `stream`.

- 0d1cda7: Add **`createTaskList`** — a hierarchical task runner. A run is a step with
  embedded sub-steps; the orchestrator awaits each `task` and renders live status
  as an indented tree (animated spinner on running steps, `✔`/`✖`/`⊘` on settle).
  On a TTY it repaints in place; in a non-TTY stream it degrades to plain, ordered
  lines with no cursor-control sequences.

  ```ts
  await createTaskList([
    { title: "Resolve deps", task: () => resolve() },
    {
      title: "Build",
      task: async (t) => {
        t.update("compiling…");
        await compile();
      },
      children: [
        { title: "Lint", task: () => lint() },
        { title: "Typecheck", task: () => typecheck() },
      ],
    },
  ]).run();
  ```

  - **Embedded steps** via `children` (a step's own `task` runs before its kids).
  - **`skip()`** — return a reason string (rendered `⊘ title (reason)`), `true` to
    skip silently, or falsy to run.
  - **Concurrency** — `concurrent: true` on a node runs its children in parallel,
    or on the list options to parallelise the top level.
  - **`continueOnError`** — keep going after a failure and inspect
    `result.errors`; otherwise the first failure aborts and `run()` rejects.
  - **Live label** — `ctx.update(text)` changes a running step's label.

  Exposes `TaskNode`, `TaskContext`, `TaskListOptions`, `TaskListResult`, and
  `TaskStatus`.

### Patch Changes

- 0d1cda7: Internal quality pass — faster rendering and less duplication, no API or
  output changes:
  - **`wrap` fast-path** — styled formatters skip the nested-close `replaceAll`
    (and its throwaway allocation) when the input carries no escape sequence,
    which is the overwhelmingly common case.
  - **`gradient` per-character cost** — interpolated channels go straight to the
    internal RGB formatter instead of re-validating every character through the
    public `rgb()` guard.
  - **`box`** strips ANSI once per line and reuses the widths across the
    max-width and alignment passes instead of computing `visibleLength` twice.
  - Centralised the remaining raw glyph/escape literals: `tree` connectors and
    the full set of `box` / `table` border glyphs (`boxStyles`) now live in
    `symbols.ts`, and the OSC 8 hyperlink introducer/terminator are named
    constants — no box-drawing characters are inlined in the renderer anymore.
  - De-duplicated the formatter fold shared by `compose` and the `style` builder,
    and the raw-stdin chunk decoding plus validation-error line shared across the
    prompts.

## 1.2.0

### Minor Changes

- 2733eec: `parseArgs` now supports getopt-style attached values for short flags: the
  value may follow the flag within the same token (`-n5`, `-palice`), optionally
  separated by `=` (`-n=5`). Booleans may still be stacked ahead of a
  value-taking flag (`-vn5` ≡ `-v -n 5`). Previously a non-boolean flag inside a
  stacked token threw; it now consumes the remainder of the token (or the next
  argument) as its value.

### Patch Changes

- 53545a2: perf: fast-path ANSI-free strings in `stripAnsi`

  `stripAnsi` now skips the regex scan and the throwaway allocation it produces
  when a string contains no escape sequences — the overwhelmingly common case.
  `visibleLength` rides on the same check (it delegates to `stripAnsi`), and that
  function sits in the inner loop of `box`, `table`, `divider`, and the prompt
  renderers, so the win compounds:
  - `visibleLength` / `stripAnsi` on plain strings: ~3.4× faster
  - `table` rendering: ~29% faster
  - `box` rendering: ~19% faster

  No API or output changes; bundle size stays within budget.

- 2733eec: Fix two correctness/robustness bugs in the helper utilities:
  - `formatDuration` no longer emits an impossible seconds component of `60`
    (e.g. `119_999ms` now formats as `2m 0s` instead of `1m 60s`, and
    `59_999ms` as `1m 0s` instead of `60.0s`). Durations of an hour or more now
    include an hours component (`3_600_000ms` → `1h 0m 0s`).
  - `wordWrap` now honors existing newlines: each line is wrapped independently
    and blank lines (paragraph breaks) are preserved, instead of collapsing a
    multi-line string into a single un-wrappable token.

- 2733eec: `createSpinner` no longer swallows the first `Ctrl+C`. While a spinner is
  active it installs a `SIGINT` handler to restore the cursor; that handler now
  re-raises `SIGINT` after cleanup so the process terminates as the user expects,
  instead of absorbing the interrupt and leaving the program running.

## 1.1.2

### Patch Changes

- f42f92d: **Library audit: tree() depth bug fix + typed command handlers.**

  Bug fix:
  - `tree()` was double-prefixing every node past depth 2. Each level of
    recursion bakes its column prefix into the lines it emits, but the
    outer loop was also prepending `prefix + childPrefix` to those lines
    when stitching them back together, so a four-level tree got two
    extra indentation columns at the deepest level. The documented
    example in `components/list-tree.md`
    (`src ▸ core ▸ colors.ts`, etc.) now renders exactly as shown in the
    docs:

    ```
    src
    ├── core
    │   ├── colors.ts
    │   └── args.ts
    └── output
        └── components.ts
    ```

    Previously it printed `│   │   ├── colors.ts` (one phantom column
    per nested level). Added regression tests for three- and four-level
    depths and for the mixed-siblings example shipped in the docs.

  Type narrowing for command handlers:
  - `CommandDef` and `CommandContext` are now generic over the
    command's args record (defaulting to the old shape, so every
    existing import keeps working). `defineCommand` and `createCLI` use
    the TS 5.0 `const` modifier on their type parameter, so an `args`
    literal is inferred narrowly without the caller having to write
    `as const`:

    ```ts
    defineCommand({
      name: "migrate",
      args: { steps: { type: "number", default: 0 } },
      handler: (ctx) => {
        const n: number = ctx.args.flags.steps; // ✓ typed as number
      },
    });
    ```

    This brings the runtime in line with the long-standing claim in
    `guides/commands.md` that `ctx.args.flags.<name>` is "fully typed"
    inside handlers. Subcommand arrays still accept commands with any
    args shape (`commands?: CommandDef<any>[]`), so heterogeneous
    command trees compose without per-entry type gymnastics.

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
