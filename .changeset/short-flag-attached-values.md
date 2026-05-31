---
"@arshad-shah/clif": minor
---

`parseArgs` now supports getopt-style attached values for short flags: the
value may follow the flag within the same token (`-n5`, `-palice`), optionally
separated by `=` (`-n=5`). Booleans may still be stacked ahead of a
value-taking flag (`-vn5` ≡ `-v -n 5`). Previously a non-boolean flag inside a
stacked token threw; it now consumes the remainder of the token (or the next
argument) as its value.
