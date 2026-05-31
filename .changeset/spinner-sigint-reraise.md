---
"@arshad-shah/clif": patch
---

`createSpinner` no longer swallows the first `Ctrl+C`. While a spinner is
active it installs a `SIGINT` handler to restore the cursor; that handler now
re-raises `SIGINT` after cleanup so the process terminates as the user expects,
instead of absorbing the interrupt and leaving the program running.
