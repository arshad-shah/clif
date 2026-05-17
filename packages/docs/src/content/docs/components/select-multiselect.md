---
title: Select & Multiselect
description: Arrow-key navigable single and multi-choice selection prompts.
---

## Select

```typescript
import { select } from "@arshad-shah/clif/prompts";

const color = await select({
  message: "Pick a color",
  options: [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue", hint: "recommended" },
    { label: "Purple", value: "purple", disabled: true },
  ],
});
```

Navigate with ↑/↓ arrow keys, confirm with Enter. Disabled options are visible but not selectable.

## Multiselect

```typescript
import { multiselect } from "@arshad-shah/clif/prompts";

const features = await multiselect({
  message: "Select features to enable",
  options: [
    { label: "TypeScript", value: "ts" },
    { label: "ESLint", value: "eslint" },
    { label: "Prettier", value: "prettier" },
    { label: "Vitest", value: "vitest" },
  ],
  required: true,
  min: 1,
  max: 3,
});
```

Press Space to toggle, `a` to toggle all, Enter to confirm.

### Select/Multiselect options

| Option        | Type       | Description                    |
| ------------- | ---------- | ------------------------------ |
| `message`     | `string`   | Prompt message                 |
| `options`     | `Option[]` | Choices to display             |
| `required`    | `boolean`  | Require at least one           |
| `min` / `max` | `number`   | Selection bounds (multiselect) |

### Option shape

| Field      | Type      | Description                |
| ---------- | --------- | -------------------------- |
| `label`    | `string`  | Display text               |
| `value`    | `string`  | Return value               |
| `hint`     | `string`  | Hint shown after label     |
| `disabled` | `boolean` | Grayed out, not selectable |
