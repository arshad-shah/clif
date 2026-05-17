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

`createCLI` returns `{ run, command }`. Call `run()` to drive the resolver against `process.argv` (or pass `{ argv }` to override).

## Subcommands

Commands nest arbitrarily deep:

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
      handler: async () => {
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

## `defineCommand` helper

Identity function for better IDE autocomplete and a single import-site for go-to-definition. Equivalent to passing the literal directly.

```typescript
import { defineCommand } from "@arshad-shah/clif";

const migrate = defineCommand({
  name: "migrate",
  description: "Run database migrations",
  args: { steps: { type: "number", default: 0 } },
  handler: async (ctx) => {
    /* ctx.args.flags.steps is fully typed */
  },
});
```

## Setup hooks

`setup` runs before the handler — useful for auth checks, config loading, or middleware-like patterns. Use `ctx.meta` to pass data forward:

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

Every handler (and `setup`) receives a `CommandContext`:

```typescript
interface CommandContext {
  command: CommandDef; // The resolved command
  parents: CommandDef[]; // Ancestor chain, root → parent (excludes self)
  args: ParsedArgs; // Parsed flags + positional + rest + unknown
  rawArgs: string[]; // Original argv slice
  meta: Record<string, unknown>; // Metadata bag for composition
}
```

`parents` lets a handler walk back to its root — useful for emitting fully-qualified usage hints or threading shared config.

## Auto-help and version

`--help` (`-h`) is always available. `--version` (`-v`) is only added if the root command defines a `version`. If you define your own flag with the same alias (e.g. `verbose` aliased to `v`), clif yields the short flag to you and keeps the long form (`--help` / `--version`) reserved.

When a command has subcommands but no handler, running it just prints help.

## Strict subcommands

When `command.commands` is non-empty and there's no `handler`, an unrecognized first positional becomes an error with a "did you mean?" suggestion. Set `strictSubcommands` explicitly to override this default in either direction:

```typescript
const cli = createCLI({
  name: "git",
  strictSubcommands: true, // even if a handler is defined
  commands: [{ name: "add", handler: () => {} }],
});
// `git buidl` → ✖ Unknown command: buidl   Did you mean "build"?
```

## Error handling

```typescript
cli.run({
  onError: (err) => {
    console.error("Custom error handler:", err.message);
    process.exit(1);
  },
});
```

Without `onError`, errors are written to stderr with a friendly icon and `process.exitCode` is set to 1. `ArgError`s are rendered with `✖ Invalid argument`; other errors get `✖ Error`.
