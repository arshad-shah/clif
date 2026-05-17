---
title: Arguments
description: Parse CLI arguments with types, aliases, defaults, and validation.
---

clif's argument parser is fast, correct, and requires no configuration objects beyond what you need.

## Basic parsing

```typescript
import { parseArgs } from "@arshad-shah/clif";

const result = parseArgs({
  name: { type: "string", alias: "n", description: "Your name" },
  port: { type: "number", alias: "p", default: 3000 },
  verbose: { type: "boolean", alias: "v" },
});

result.flags.name; // string
result.flags.port; // number
result.flags.verbose; // boolean
result.positional; // string[] — non-flag tokens
result.rest; // string[] — everything after `--`
result.unknown; // string[] — flags not defined in your schema
```

`parseArgs` defaults to `process.argv.slice(2)`. Pass `{ args: [...] }` only when you want to override — useful for tests, scripted invocations, or parsing a string you've already tokenised.

When you pass the defs as `as const`, the return type of `result.flags.*` is fully inferred — no casts needed.

## Flag formats

```bash
# Long flags
--name alice
--name=alice

# Short flags
-n alice
-p 8080

# Stacked booleans (each char must resolve to a boolean def)
-vdf  # same as -v -d -f

# Negation — sets a known boolean flag to false
--no-verbose

# Negative numbers (including scientific notation) are values, not flags
--offset -5
--scale -1.5e3

# Stop parsing — everything after goes into result.rest
-- --not-a-flag
```

## Type coercion

Supported types: `"string"`, `"number"`, `"boolean"`.

- `number` — coerced via `Number(value)`. An empty value (`--port=`) or a non-finite result throws `ArgError`.
- `boolean` — `true` / `1` / empty (`--flag=`) → `true`; anything else → `false`. Bare `--flag` is `true`; bare `--no-flag` is `false`.
- `string` — passed through verbatim. Empty values (`--name=`) are accepted.

## Choices

Constrain values to a set of allowed options:

```typescript
parseArgs({
  env: {
    type: "string",
    choices: ["dev", "staging", "prod"],
    default: "dev",
  },
});
```

Choices are validated against both user input AND any `default` value — a default that isn't in `choices` throws immediately.

## Required flags

```typescript
parseArgs({ token: { type: "string", required: true } });
// → ArgError: Missing required flag: --token
```

A `default` does not satisfy `required` — the user must still pass the flag explicitly.

## Repeated / array flags

Set `multiple: true` to accumulate every occurrence into an array:

```typescript
const r = parseArgs(
  { include: { type: "string", multiple: true } },
  { args: ["--include", "a", "--include", "b", "--include=c"] },
);
r.flags.include; // ["a", "b", "c"]
```

Array flags work with `number` types and `choices` too. A missing array flag defaults to `[]`.

## Positional arguments

Everything that isn't a flag or its value ends up in `result.positional`:

```bash
mycli build src/index.ts --minify
#          ^^^^^^^^^^^^^ positional
```

Pass `{ stopEarly: true }` to treat the first non-flag token as a hard stop — useful when delegating to a subprocess that has its own flag parser.

## The `--` separator

Arguments after `--` are collected in `result.rest` and are not parsed:

```bash
mycli --verbose -- --some-other-tool-flag
#                  ^^^^^^^^^^^^^^^^^^^^^^^ result.rest
```

## Unknown flags

By default, unknown flags collect into `result.unknown` so you can decide what to do:

```typescript
const r = parseArgs({}, { args: ["--unknown"] });
r.unknown; // ["unknown"]
```

Pass `{ allowUnknown: true }` to instead land them in `result.flags` (boolean `true` for bare flags, raw string for `=value` form).

## Error handling

Parse errors throw `ArgError` with a descriptive message and the offending flag name:

```typescript
import { parseArgs, ArgError } from "@arshad-shah/clif";

try {
  parseArgs({ port: { type: "number" } }, { args: ["--port", "abc"] });
} catch (err) {
  if (err instanceof ArgError) {
    err.message; // Expected number for --port, got "abc"
    err.flag; // "port"
  }
}
```

When you use `createCLI`, this is handled for you — `ArgError`s render with a friendly `✖ Invalid argument` prefix and set `process.exitCode = 1`.
