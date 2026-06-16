---
"@arshad-shah/clif": minor
---

Add a FIGfont ASCII-art generator on the new `@arshad-shah/clif/banner` subpath.

`figlet(text, opts?)` renders large ASCII-art lettering with a full FIGfont v2
engine (all six horizontal smushing rules, kerning, full-width, vertical
smushing, and print direction). It builds on clif's own colour system — a single
`Formatter` or a multi-stop `gradient` painted across the rendered grid
(horizontal/vertical/diagonal), with ANSI-aware width math so it composes with
`box()` and friends. Supports alignment, width-based clipping/wrapping, and
`NO_COLOR`/low-colour degradation.

Seven fonts ship built-in (`standard`, `slant`, `small`, `big`, `ansiShadow`,
`banner`, `mini`), each in its own lazily-loaded chunk, plus `registerFont()` /
`parseFont()` for bringing your own `.flf`. Font data lives entirely on the
subpath, so the core bundle is unchanged. The existing core `banner()` is
untouched and fully backward compatible.
