---
title: Confirm & Number
description: Yes/no confirmation and numeric input prompts.
---

## Confirm

```typescript
import { confirm } from "@arshad-shah/clif/prompts";

const proceed = await confirm({
  message: "Deploy to production?",
  default: false,
});

if (proceed) {
  // deploy
}
```

Displays `(Y/n)` or `(y/N)` based on the default. Accepts `y` or `yes` (case-insensitive) as `true`, anything else as `false`. Enter alone returns the default.

### Confirm options

| Option    | Type      | Description                  |
| --------- | --------- | ---------------------------- |
| `message` | `string`  | Prompt message               |
| `default` | `boolean` | Value used when Enter is hit |

## Number

```typescript
import { number } from "@arshad-shah/clif/prompts";

const port = await number({
  message: "Port number:",
  default: 3000,
  min: 1024,
  max: 65535,
  step: 1,
});
```

Validates that input is a finite number, within the optional `min`/`max` range, and (if `step` is set) a multiple of `step` anchored to `min` (so `min: 1, step: 2` accepts 1, 3, 5, …). Invalid input re-prompts with a descriptive error.

### Number options

| Option     | Type      | Description                                                  |
| ---------- | --------- | ------------------------------------------------------------ |
| `message`  | `string`  | Prompt message                                               |
| `default`  | `number`  | Value used when Enter is hit                                 |
| `min`      | `number`  | Minimum allowed value (inclusive)                            |
| `max`      | `number`  | Maximum allowed value (inclusive)                            |
| `step`     | `number`  | Required step grid (e.g. `5` → accepts 0, 5, 10, …)          |
| `required` | `boolean` | Reject empty input (otherwise empty falls back to `default`) |
