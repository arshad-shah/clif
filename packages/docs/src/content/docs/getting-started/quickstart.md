---
title: Quick Start
description: Get up and running with clif in under 2 minutes.
---

## Installation

```bash
npm install @arshad-shah/clif
```

## Your first CLI

```typescript
import { createCLI, green, bold, box } from "@arshad-shah/clif";

const cli = createCLI({
  name: "greet",
  version: "1.0.0",
  description: "A friendly greeter",
  args: {
    name: {
      type: "string",
      alias: "n",
      description: "Who to greet",
      default: "World",
    },
    loud: {
      type: "boolean",
      alias: "l",
      description: "Shout the greeting",
    },
  },
  handler: (ctx) => {
    const name = ctx.args.flags.name as string;
    let greeting = `Hello, ${green(name)}!`;
    if (ctx.args.flags.loud) greeting = bold(greeting.toUpperCase());

    console.log(box(greeting, { title: "Greeting", border: "round" }));
  },
});

cli.run();
```

## Run it

```bash
# Default greeting
npx tsx greet.ts
# ╭ Greeting ──────────╮
# │  Hello, World!      │
# ╰────────────────────╯

# Custom name
npx tsx greet.ts --name Alice

# Loud mode
npx tsx greet.ts -n Alice --loud

# Built-in help
npx tsx greet.ts --help
```

## Interactive prompts

Prompts live in a separate entry point to keep the core bundle tiny:

```typescript
import { text, select, confirm } from "@arshad-shah/clif/prompts";

const name = await text({ message: "Project name?" });

const template = await select({
  message: "Pick a template",
  options: [
    { label: "Minimal", value: "minimal" },
    { label: "Full", value: "full", hint: "recommended" },
  ],
});

const install = await confirm({ message: "Install dependencies?" });
```

## What's next?

- [Colors](/guides/colors) — full color API reference
- [Arguments](/guides/arguments) — flags, types, choices, and aliases
- [Commands](/guides/commands) — nested subcommands and setup hooks
- [Components](/components/box) — box, table, list, tree, spinner, progress
