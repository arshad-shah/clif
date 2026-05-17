---
title: Arguments
description: Parse CLI arguments with types, aliases, defaults, and validation.
---

clif's argument parser is fast, correct, and requires no configuration objects beyond what you need.

## Basic parsing

```typescript
import { parseArgs } from "clif";

const result = parseArgs(
  {
    name: { type: "string", alias: "n", description: "Your name" },
    port: { type: "number", alias: "p", default: 3000 },
    verbose: { type: "boolean", alias: "v" },
  },
  { args: process.argv.slice(2) },
);

console.log(result.flags.name); // "alice"
console.log(result.flags.port); // 3000
console.log(result.flags.verbose); // true
console.log(result.positional); // ["file.txt"]
```

## Flag formats

All standard formats are supported:

```bash
# Long flags
--name alice
--name=alice

# Short flags
-n alice
-p 8080

# Stacked booleans
-vdf  # same as -v -d -f

# Stop parsing
-- --not-a-flag
```

## Type coercion

Supported types: `"string"`, `"number"`, `"boolean"`.

Numbers are automatically coerced from strings. Invalid numbers throw an `ArgError`.

## Choices

Constrain values to a set of allowed options:

```typescript
const args = parseArgs({
  env: {
    type: "string",
    choices: ["dev", "staging", "prod"],
    default: "dev",
  },
});
```

## Required flags

```typescript
const args = parseArgs({
  token: { type: "string", required: true },
});
// Throws ArgError if --token is missing
```

## Positional arguments

Everything that isn't a flag or its value ends up in `result.positional`:

```bash
mycli build src/index.ts --minify
#          ^^^^^^^^^^^^^ positional
```

## The `--` separator

Arguments after `--` are collected in `result.rest` and are not parsed:

```bash
mycli --verbose -- --some-other-tool-flag
#                  ^^^^^^^^^^^^^^^^^^^^^^^^ result.rest
```

## Error handling

Parse errors throw `ArgError` with a descriptive message:

```typescript
import { parseArgs, ArgError } from "clif";

try {
  parseArgs({ port: { type: "number" } }, { args: ["--port", "abc"] });
} catch (err) {
  if (err instanceof ArgError) {
    console.error(err.message); // "Invalid number for --port: abc"
  }
}
```
