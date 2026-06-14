---
title: List & Tree
description: Render ordered/unordered lists and recursive tree structures.
---

## List

```typescript
import { list } from "@arshad-shah/clif";

// Unordered (default)
console.log(list(["Apple", "Banana", "Cherry"]));
// ● Apple
// ● Banana
// ● Cherry

// Ordered
console.log(list(["First", "Second", "Third"], { ordered: true }));
// 1. First
// 2. Second
// 3. Third

// Custom marker + indent
list(["Item"], { marker: "→", indent: 4 });
```

### List options

| Option        | Type        | Default | Description                                       |
| ------------- | ----------- | ------- | ------------------------------------------------- |
| `marker`      | `string`    | `●`     | Bullet glyph (ignored when `ordered` is `true`)   |
| `markerColor` | `Formatter` | `cyan`  | Color applied to the marker / ordinal             |
| `indent`      | `number`    | `0`     | Leading spaces before each item                   |
| `ordered`     | `boolean`   | `false` | Render `1.`, `2.`, … instead of the bullet marker |

## Tree

```typescript
import { tree } from "@arshad-shah/clif";

console.log(
  tree({
    label: "src",
    children: [
      {
        label: "core",
        children: [{ label: "colors.ts" }, { label: "args.ts" }],
      },
      { label: "output", children: [{ label: "components.ts" }] },
      { label: "index.ts" },
    ],
  }),
);
// src
// ├── core
// │   ├── colors.ts
// │   └── args.ts
// ├── output
// │   └── components.ts
// └── index.ts
```
