---
"@arshad-shah/clif": patch
---

Internal quality pass — faster rendering and less duplication, no API or
output changes:

- **`wrap` fast-path** — styled formatters skip the nested-close `replaceAll`
  (and its throwaway allocation) when the input carries no escape sequence,
  which is the overwhelmingly common case.
- **`gradient` per-character cost** — interpolated channels go straight to the
  internal RGB formatter instead of re-validating every character through the
  public `rgb()` guard.
- **`box`** strips ANSI once per line and reuses the widths across the
  max-width and alignment passes instead of computing `visibleLength` twice.
- Centralised the remaining raw glyph/escape literals: `tree` connectors now
  live in `symbols.ts` alongside the other box-drawing characters, and the
  OSC 8 hyperlink introducer/terminator are named constants.
- De-duplicated the formatter fold shared by `compose` and the `style` builder,
  and the raw-stdin chunk decoding plus validation-error line shared across the
  prompts.
