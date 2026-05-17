---
"@arshad-shah/clif": patch
---

**Library audit: bug fixes + previously no-op features implemented.**

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
