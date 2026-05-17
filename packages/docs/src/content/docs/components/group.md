---
title: Group
description: Compose multiple prompts into a sequential flow.
---

## Group

Run multiple prompts in sequence and collect all results into a single object:

```typescript
import {
  group,
  text,
  select,
  confirm,
  multiselect,
} from "@arshad-shah/clif/prompts";

const answers = await group({
  name: () => text({ message: "Project name?" }),
  template: () =>
    select({
      message: "Template?",
      options: [
        { label: "Minimal", value: "minimal" },
        { label: "Full", value: "full" },
      ],
    }),
  features: () =>
    multiselect({
      message: "Features?",
      options: [
        { label: "TypeScript", value: "ts" },
        { label: "ESLint", value: "lint" },
        { label: "Testing", value: "test" },
      ],
    }),
  install: () => confirm({ message: "Install dependencies?" }),
});

// answers.name      → string
// answers.template  → string
// answers.features  → string[]
// answers.install   → boolean
```

Each prompt in the group is a factory function called in order. If the user cancels (Ctrl+C), the process exits gracefully.
