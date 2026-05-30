---
"@arshad-shah/clif": patch
---

perf: fast-path ANSI-free strings in `stripAnsi`

`stripAnsi` now skips the regex scan and the throwaway allocation it produces
when a string contains no escape sequences — the overwhelmingly common case.
`visibleLength` rides on the same check (it delegates to `stripAnsi`), and that
function sits in the inner loop of `box`, `table`, `divider`, and the prompt
renderers, so the win compounds:

- `visibleLength` / `stripAnsi` on plain strings: ~3.4× faster
- `table` rendering: ~29% faster
- `box` rendering: ~19% faster

No API or output changes; bundle size stays within budget.
