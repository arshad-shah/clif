---
title: Log & Divider
description: Semantic log helpers and visual separators.
---

## Log helpers

```typescript
import { log } from "@arshad-shah/clif";

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
import { divider } from "@arshad-shah/clif";

console.log(divider());
// ────────────────────────────────────────────────────────────

console.log(divider({ label: "Configuration", width: 40 }));
// ──────────── Configuration ─────────────

console.log(divider({ char: "═", width: 30 }));
// ══════════════════════════════

import { cyan } from "@arshad-shah/clif";
console.log(divider({ label: "Section", color: cyan }));
```

### Divider options

| Option  | Type        | Default | Description                               |
| ------- | ----------- | ------- | ----------------------------------------- |
| `width` | `number`    | `60`    | Total width in characters                 |
| `char`  | `string`    | `─`     | Fill character                            |
| `label` | `string`    | —       | Optional centered label                   |
| `color` | `Formatter` | `dim`   | Color applied to the fill (not the label) |

## Banner

```typescript
import { banner, bold } from "@arshad-shah/clif";

console.log(banner("Deploy v2.0"));
// ══════════════════
// ═ Deploy v2.0   ═
// ══════════════════

console.log(banner("Release", { char: "#", color: bold }));
```

### Banner options

| Option  | Type        | Default | Description       |
| ------- | ----------- | ------- | ----------------- |
| `color` | `Formatter` | `bold`  | Color of the text |
| `char`  | `string`    | `═`     | Border character  |

## Key-Value display

```typescript
import { keyValue } from "@arshad-shah/clif";

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

### Key-Value options

| Option       | Type        | Default  | Description                           |
| ------------ | ----------- | -------- | ------------------------------------- |
| `separator`  | `string`    | `"  "`   | Text placed between the key and value |
| `keyColor`   | `Formatter` | `dim`    | Color applied to each key             |
| `valueColor` | `Formatter` | identity | Color applied to each value           |
| `indent`     | `number`    | `0`      | Leading spaces before each row        |
