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

## `clif` exports

### Colors

`bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`, `reset`,
`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `grey`,
`redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`,
`bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`, `bgGray`,
`bgRedBright`, `bgGreenBright`, `bgYellowBright`, `bgBlueBright`, `bgMagentaBright`, `bgCyanBright`, `bgWhiteBright`

`rgb256(code)`, `bgRgb256(code)`, `rgb(r, g, b)`, `bgRgb(r, g, b)`, `hex(color)`, `bgHex(color)`
`compose(...formatters)`, `stripAnsi(text)`, `visibleLength(text)`
`colorLevel(level?)`, `isColorSupported()`

### Argument parsing

`parseArgs(defs, opts?)` → `ParsedArgs { flags, positional, rest, unknown }`
`ArgError` — thrown on validation failures

### Command system

`createCLI(def)` → `{ run(opts?), command }`

### Output components

`box(content, opts?)`, `table(rows, opts?)`, `keyValue(data, opts?)`,
`list(items, opts?)`, `tree(root, prefix?)`,
`divider(opts?)`, `banner(text, opts?)`,
`createSpinner(opts?)`, `createProgress(opts?)`,
`log.info(msg)`, `log.success(msg)`, `log.warn(msg)`, `log.error(msg)`, `log.debug(msg)`, `log.step(n, total, msg)`

### Utilities

`isTTY()`, `terminalWidth()`, `truncate(text, max, suffix?)`,
`wordWrap(text, width)`, `indent(text, spaces)`, `dedent(str)`,
`formatBytes(bytes)`, `formatDuration(ms)`

## `clif/prompts` exports

`text(opts)`, `password(opts)`, `confirm(opts)`, `select(opts)`, `multiselect(opts)`, `number(opts)`, `group(prompts)`

## Types

`Formatter`, `BoxBorder`, `BoxOptions`, `TableOptions`, `KeyValueOptions`, `ListOptions`,
`TreeNode`, `SpinnerOptions`, `ProgressOptions`,
`ArgDef`, `ParsedArgs`, `ParseOptions`, `CommandDef`, `CommandContext`, `RunOptions`,
`TextOptions`, `PasswordOptions`, `ConfirmOptions`, `SelectOptions`, `MultiselectOptions`, `NumberOptions`, `SelectOption`
