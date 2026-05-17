---
"@arshad-shah/clif": minor
---

**Staff-review bug sweep + DX upgrades.**

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
