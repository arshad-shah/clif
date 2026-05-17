---
title: Select & Multiselect
description: Arrow-key navigable single and multi-choice selection prompts.
---

Both prompts require a TTY — they reject with `PromptError { code: "not-a-tty" }` when stdin is piped. Use `text` and parse the value yourself for scripted flows.

## Select

```typescript
import { select } from "@arshad-shah/clif/prompts";

const color = await select({
  message: "Pick a color",
  default: "blue",
  options: [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue", hint: "recommended" },
    { label: "Purple", value: "purple", disabled: true },
  ],
});
```

Navigate with ↑/↓ (or `j`/`k`), confirm with Enter. Disabled options are visible but skipped by the cursor. Space is intentionally ignored on single-select so muscle memory carries over to multiselect.

## Multiselect

```typescript
import { multiselect } from "@arshad-shah/clif/prompts";

const features = await multiselect({
  message: "Select features to enable",
  default: ["ts"],
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

Space toggles the current option, `a` toggles all enabled options, Enter confirms. If the selection violates `min` / `max` / `required`, an inline error is shown and Enter is blocked until the constraint is satisfied.

### Select / Multiselect options

| Option        | Type             | Description                                          |
| ------------- | ---------------- | ---------------------------------------------------- |
| `message`     | `string`         | Prompt message                                       |
| `options`     | `SelectOption[]` | Choices to display                                   |
| `default`     | `T` / `T[]`      | Initial cursor (select) or pre-checked items (multi) |
| `required`    | `boolean`        | Multi: require at least one selection                |
| `min` / `max` | `number`         | Multi: lower / upper bound on selection count        |

### Option shape

| Field      | Type      | Description                                    |
| ---------- | --------- | ---------------------------------------------- |
| `label`    | `string`  | Display text                                   |
| `value`    | `T`       | Returned value (generic, defaults to `string`) |
| `hint`     | `string`  | Hint shown after label                         |
| `disabled` | `boolean` | Greyed out, not selectable                     |

## Cancellation

Ctrl+C rejects the promise with `PromptError { code: "cancelled" }`. Catch it to perform cleanup before exiting:

```typescript
import { select, PromptError } from "@arshad-shah/clif/prompts";

try {
  await select({ message: "Pick", options: [...] });
} catch (err) {
  if (err instanceof PromptError && err.code === "cancelled") {
    process.exit(130); // 128 + SIGINT
  }
  throw err;
}
```
