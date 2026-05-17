---
title: Log & Divider
description: Semantic log helpers and visual separators.
---

## Log helpers

```typescript
import { log } from "clif";

log.info("Server started on port 3000"); // ℹ Server started on port 3000
log.success("Build complete"); // ✔ Build complete
log.warn("Deprecation notice"); // ⚠ Deprecation notice
log.error("Connection refused"); // ✖ Connection refused
log.debug("Query took 12ms"); // ● Query took 12ms (only when DEBUG is set)
log.step(2, 5, "Compiling TypeScript..."); // [2/5] Compiling TypeScript...
```

`info`, `success`, and `step` write to stdout. `warn`, `error`, and `debug` write to stderr.

## Divider

```typescript
import { divider } from "clif";

console.log(divider());
// ────────────────────────────────────────────────────────────

console.log(divider({ label: "Configuration", width: 40 }));
// ──────────── Configuration ─────────────

console.log(divider({ char: "═", width: 30 }));
// ══════════════════════════════
```

## Banner

```typescript
import { banner } from "clif";

console.log(banner("Deploy v2.0"));
// ══════════════════
// ═ Deploy v2.0   ═
// ══════════════════
```

## Key-Value display

```typescript
import { keyValue } from "clif";

console.log(
  keyValue({
    version: "2.1.0",
    node: process.version,
    platform: process.platform,
    uptime: "3h 42m",
  }),
);
// version    2.1.0
// node       v22.22.2
// platform   linux
// uptime     3h 42m
```
