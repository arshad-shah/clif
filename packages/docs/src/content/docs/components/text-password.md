---
title: Text & Password
description: Interactive text input and masked password prompts.
---

## Text input

```typescript
import { text } from "clif/prompts";

const name = await text({
  message: "What is your name?",
  placeholder: "Enter your name",
  defaultValue: "World",
  required: true,
  validate: (val) =>
    val.length < 2 ? "Name must be at least 2 characters" : undefined,
});
```

### Text options

| Option         | Type                           | Description             |
| -------------- | ------------------------------ | ----------------------- |
| `message`      | `string`                       | Prompt message          |
| `placeholder`  | `string`                       | Placeholder text        |
| `defaultValue` | `string`                       | Default value           |
| `required`     | `boolean`                      | Require non-empty input |
| `validate`     | `(val) => string \| undefined` | Validation function     |

## Password input

```typescript
import { password } from "clif/prompts";

const secret = await password({
  message: "Enter API token:",
  mask: "•",
});
```

Input is masked with the specified character (default `*`). The actual value is returned.
