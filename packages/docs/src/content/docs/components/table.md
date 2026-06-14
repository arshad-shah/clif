---
title: Table
description: Render aligned tables with headers, borders, and column width control.
---

## Basic table

```typescript
import { table } from "@arshad-shah/clif";

console.log(
  table(
    [
      ["Alice", "30", "Engineer"],
      ["Bob", "25", "Designer"],
    ],
    { headers: ["Name", "Age", "Role"] },
  ),
);
```

## Without borders

```typescript
table(
  [
    ["a", "b"],
    ["c", "d"],
  ],
  { border: false },
);
```

## Column width limit

```typescript
table([["A very long cell value that should be truncated", "short"]], {
  maxColumnWidth: 20,
});
```

## Custom header color

```typescript
import { table, cyan } from "@arshad-shah/clif";
table([["data"]], { headers: ["Column"], headerColor: cyan });
```

## Column alignment

Pass a single value to align every column the same way, or an array to align
each column independently. Columns past the end of the array fall back to
`"left"`, and headers align with their column.

```typescript
// Right-align a numeric column
table(
  [
    ["clif", "11"],
    ["commander", "26000"],
  ],
  { headers: ["Package", "Stars"], align: ["left", "right"] },
);

// Center every column
table([["a", "b", "c"]], { align: "center" });
```

## Options

| Option           | Type               | Default  | Description                                                             |
| ---------------- | ------------------ | -------- | ----------------------------------------------------------------------- |
| `headers`        | `string[]`         | —        | Column headers                                                          |
| `border`         | `boolean`          | `true`   | Show borders                                                            |
| `headerColor`    | `Formatter`        | `bold`   | Header text style                                                       |
| `compact`        | `boolean`          | `false`  | Suppress the separator row between header and body                      |
| `maxColumnWidth` | `number`           | —        | Truncate columns                                                        |
| `align`          | `Align \| Align[]` | `"left"` | Per-column alignment (`"left" \| "center" \| "right"`); single or array |
