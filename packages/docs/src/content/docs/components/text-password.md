---
title: Text & Password
description: Interactive text input and masked password prompts.
---

## Text input

```typescript
import { text } from "@arshad-shah/clif/prompts";

const name = await text({
  message: "What is your name?",
  placeholder: "Enter your name",
  default: "World",
  required: true,
  validate: (val) =>
    val.length < 2 ? "Name must be at least 2 characters" : true,
});
```

`validate` returns `true` for success, or a `string` error message that is shown to the user before re-prompting.

### Text options

| Option        | Type                              | Description                  |
| ------------- | --------------------------------- | ---------------------------- |
| `message`     | `string`                          | Prompt message               |
| `placeholder` | `string`                          | Greyed-out hint text         |
| `default`     | `string`                          | Value used when Enter is hit |
| `required`    | `boolean`                         | Reject empty input           |
| `validate`    | `(val: string) => string \| true` | Custom validator             |

## Password input

```typescript
import { password } from "@arshad-shah/clif/prompts";

const secret = await password({
  message: "Enter API token:",
  mask: "•",
});
```

Each character typed is replaced with the mask character (default `●`). The actual value is returned to your handler.

`password` requires a TTY — when stdin is piped, it rejects with `PromptError { code: "not-a-tty" }`. Use `text` for non-interactive flows.

### Password options

| Option     | Type                              | Description                     |
| ---------- | --------------------------------- | ------------------------------- |
| `message`  | `string`                          | Prompt message                  |
| `mask`     | `string`                          | Replacement glyph (default `●`) |
| `validate` | `(val: string) => string \| true` | Custom validator                |
