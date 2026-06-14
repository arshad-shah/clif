---
"@arshad-shah/clif": minor
---

Table column alignment + correct box padding:

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
