---
"@arshad-shah/clif": minor
---

Enrich the color layer with new composable APIs and smarter rendering:

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
