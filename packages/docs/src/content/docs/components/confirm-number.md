---
title: Confirm & Number
description: Yes/no confirmation and numeric input prompts.
---

## Confirm

```typescript
import { confirm } from "clif/prompts";

const proceed = await confirm({
  message: "Deploy to production?",
  defaultValue: false,
});

if (proceed) {
  // deploy
}
```

Displays `(Y/n)` or `(y/N)` based on the default. Accepts `y`, `yes`, `n`, `no` (case-insensitive), and Enter for the default.

## Number

```typescript
import { number } from "clif/prompts";

const port = await number({
  message: "Port number:",
  defaultValue: 3000,
  min: 1024,
  max: 65535,
});
```

Validates that input is a valid number within the optional min/max range.

### Number options

| Option         | Type      | Description           |
| -------------- | --------- | --------------------- |
| `message`      | `string`  | Prompt message        |
| `defaultValue` | `number`  | Default value         |
| `min`          | `number`  | Minimum allowed value |
| `max`          | `number`  | Maximum allowed value |
| `required`     | `boolean` | Require input         |
