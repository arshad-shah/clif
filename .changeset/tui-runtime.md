---
"@arshad-shah/clif": minor
---

Add a tiny full-screen TUI runtime under the new `clif/tui` entry.

`createApp({ render, onKey })` drives an imperative loop with the alternate
screen buffer, raw-input key decoding (escape sequences are reassembled even
when split across reads), a line-diff repaint that rewrites only changed rows,
and a bulletproof terminal restore on exit, Ctrl+C, or crash. Ships with three
composable widgets — `createList`, `createViewport`, and `createTextInput` —
that expose `render()` / `handleKey()` so they nest into any layout. Opt-in and
tree-shakeable, so it adds nothing to the bundle unless imported.
