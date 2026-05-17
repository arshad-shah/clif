---
"clif": patch
---

Accept negative numbers as flag values in `parseArgs()`.

`--offset -5` and `-t -40` used to throw `Missing value for …` because the
flag-vs-value heuristic was a bare `token.startsWith("-")` test. Negative
numeric literals are common (offsets, deltas, temperatures) and must be
consumable as values.

Introduced a `looksLikeFlag(token)` helper that treats `undefined`, bare `-`,
and `/^-\d+(\.\d+)?$/` as non-flags. Real flags (`-x`, `--foo`) still
short-circuit value consumption — `--a --b x` correctly throws
`Missing value for --a`.
