---
title: Commands
description: Build nested command trees with setup hooks and auto-help.
---

## Creating a CLI

```typescript
import { createCLI } from "@arshad-shah/clif";

const cli = createCLI({
  name: "deploy",
  version: "2.0.0",
  description: "Deployment toolkit",
  handler: (ctx) => {
    console.log("Default command ran");
  },
});

cli.run();
```

## Subcommands

Commands can nest arbitrarily deep:

```typescript
const cli = createCLI({
  name: "db",
  commands: [
    {
      name: "migrate",
      description: "Run database migrations",
      commands: [
        {
          name: "up",
          description: "Apply pending migrations",
          args: {
            steps: {
              type: "number",
              default: 0,
              description: "Number of steps",
            },
          },
          handler: async (ctx) => {
            const steps = ctx.args.flags.steps;
            // ...
          },
        },
        {
          name: "down",
          description: "Rollback migrations",
          handler: async (ctx) => {
            /* ... */
          },
        },
      ],
    },
    {
      name: "seed",
      description: "Seed the database",
      handler: async (ctx) => {
        /* ... */
      },
    },
  ],
});
```

```bash
db migrate up --steps 3
db migrate down
db seed
```

## Setup hooks

The `setup` function runs before the handler — useful for auth checks, config loading, or middleware-like patterns:

```typescript
const cli = createCLI({
  name: "api",
  setup: async (ctx) => {
    const token = process.env.API_TOKEN;
    if (!token) throw new Error("API_TOKEN is required");
    ctx.meta.token = token;
  },
  handler: (ctx) => {
    console.log("Authed with token:", ctx.meta.token);
  },
});
```

## The context object

Every handler receives a `CommandContext`:

```typescript
interface CommandContext {
  command: CommandDef; // The resolved command
  args: ParsedArgs; // Parsed flags + positional
  rawArgs: string[]; // Original argv
  meta: Record<string, unknown>; // Metadata bag for composition
}
```

## Auto-help and version

`--help` and `--version` are handled automatically. When a command has subcommands but no handler, running it displays the help screen.

## Error handling

```typescript
cli.run({
  onError: (err) => {
    console.error("Custom error handler:", err.message);
    process.exit(1);
  },
});
```

Without `onError`, errors are written to stderr and `process.exitCode` is set to 1.
