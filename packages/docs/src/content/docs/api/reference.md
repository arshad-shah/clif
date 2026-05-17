---
title: Full API Reference
description: Complete API surface of the clif package.
---

## Entry points

```typescript
// Core — colors, args, commands, output components, utilities
import { ... } from "@arshad-shah/clif";

// Prompts — interactive input (separate to keep core bundle tiny)
import { ... } from "@arshad-shah/clif/prompts";
```

## `@arshad-shah/clif` exports

### Colors

`bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`, `reset`,
`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `grey`,
`redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`,
`bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`, `bgGray`,
`bgRedBright`, `bgGreenBright`, `bgYellowBright`, `bgBlueBright`, `bgMagentaBright`, `bgCyanBright`, `bgWhiteBright`

`rgb256(code)`, `bgRgb256(code)`, `rgb(r, g, b)`, `bgRgb(r, g, b)`, `hex(color)`, `bgHex(color)`
`compose(...formatters)`, `stripAnsi(text)`, `visibleLength(text)`
`colorLevel(level?)`, `isColorSupported()`

`rgb256` / `bgRgb256` accept integers in `[0, 255]`; `rgb` / `bgRgb` accept the same range per channel. `hex` / `bgHex` require a 6-digit value with or without the leading `#`. Out-of-range or malformed input throws `RangeError`.

### Argument parsing

`parseArgs(defs, opts?)` → `ParsedArgs { flags, positional, rest, unknown }`
`ArgError` — thrown on validation failures (exposes `.flag` for the offending name)

### Command system

`createCLI(def)` → `{ run(opts?), command }`
`defineCommand(def)` → `def` — identity helper for type inference on nested command literals.

### Output components

`box(content, opts?)`, `table(rows, opts?)`, `keyValue(data, opts?)`,
`list(items, opts?)`, `tree(root)`,
`divider(opts?)`, `banner(text, opts?)`,
`createSpinner(opts?)`, `createProgress(opts?)`,
`log.info(msg)`, `log.success(msg)`, `log.warn(msg)`, `log.error(msg)`, `log.debug(msg)`, `log.step(n, total, msg)`

### Utilities

`isTTY()`, `terminalWidth()`, `truncate(text, max, suffix?)`,
`wordWrap(text, width)`, `indent(text, spaces)`, `dedent(str)`,
`formatBytes(bytes)`, `formatDuration(ms)`

## `@arshad-shah/clif/prompts` exports

`text(opts)`, `password(opts)`, `confirm(opts)`, `select(opts)`, `multiselect(opts)`, `number(opts)`, `group(prompts)`
`PromptError` — thrown on user cancellation (`code: "cancelled"`) or non-TTY stdin (`code: "not-a-tty"`).

## Types

`Formatter`, `BoxBorder`, `BoxOptions`, `TableOptions`, `KeyValueOptions`, `ListOptions`,
`TreeNode`, `SpinnerOptions`, `ProgressOptions`,
`ArgDef`, `ParsedArgs`, `ParseOptions`, `FlagValueOf`, `FlagsFromDefs`,
`CommandDef`, `CommandContext`, `RunOptions`,
`TextOptions`, `PasswordOptions`, `ConfirmOptions`, `SelectOption`, `SelectOptions`, `MultiSelectOptions`, `NumberOptions`,
`PromptErrorCode`
