---
"@arshad-shah/clif": patch
---

Fix two correctness/robustness bugs in the helper utilities:

- `formatDuration` no longer emits an impossible seconds component of `60`
  (e.g. `119_999ms` now formats as `2m 0s` instead of `1m 60s`, and
  `59_999ms` as `1m 0s` instead of `60.0s`). Durations of an hour or more now
  include an hours component (`3_600_000ms` → `1h 0m 0s`).
- `wordWrap` now honors existing newlines: each line is wrapped independently
  and blank lines (paragraph breaks) are preserved, instead of collapsing a
  multi-line string into a single un-wrappable token.
