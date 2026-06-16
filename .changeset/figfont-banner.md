---
"@arshad-shah/clif": minor
---

Add a FIGfont ASCII-art engine on the new `@arshad-shah/clif/banner` subpath.

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
