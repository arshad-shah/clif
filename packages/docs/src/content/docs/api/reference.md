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
`rgbToAnsi256(r, g, b)`, `rgbToAnsi16(r, g, b)`
`style`, `gradient(colors)`, `link(text, url)`
`compose(...formatters)`, `stripAnsi(text)`, `visibleLength(text)`
`colorLevel(level?)`, `isColorSupported()`

`rgb256` / `bgRgb256` accept integers in `[0, 255]`; `rgb` / `bgRgb` accept the same range per channel. `hex` / `bgHex` accept a 3- or 6-digit value with or without the leading `#` (`#f80` expands to `#ff8800`). Out-of-range or malformed input throws `RangeError`.

Truecolor and 256-color formatters automatically **downgrade** to the nearest renderable color (truecolor → 256 → 16) on weaker terminals rather than dropping color; `rgbToAnsi256` / `rgbToAnsi16` expose those conversions directly.

`style` is a chainable, immutable builder — `style.red.bold.underline("x")`, `style.hex("#f5c76a").bold("title")`, `style.rgb(r, g, b)(text)`. Extended-color methods include `rgb`, `bgRgb`, `rgb256`, `bgRgb256`, `ansi256` (alias of `rgb256`), `bgAnsi256` (alias of `bgRgb256`), `hex`, and `bgHex`. `gradient(colors)` paints one interpolated color per visible character (`ColorStop` = hex string or `[r, g, b]`); `link(text, url)` emits an OSC 8 hyperlink with a `text (url)` fallback.

### Argument parsing

`parseArgs(defs, opts?)` → `ParsedArgs { flags, positional, rest, unknown, values }`
`ArgError` — thrown on validation failures (exposes `.flag` for the offending name)

Pass `opts.positionals` (an array of `PositionalDef`) to get named/typed/validated positional values on `result.values`. Each definition supports `type`, `required`, `choices`, `variadic`, and `description`.

### Command system

`createCLI(def)` → `{ run(opts?), command }`
`defineCommand(def)` → `def` — identity helper for type inference on nested command literals.

### Output components

`box(content, opts?)`, `table(rows, opts?)`, `keyValue(data, opts?)`,
`list(items, opts?)`, `tree(root)`,
`divider(opts?)`, `banner(text, opts?)`,
`createSpinner(opts?)`, `createProgress(opts?)`, `createTaskList(tasks, opts?)`,
`log.info(msg)`, `log.success(msg)`, `log.warn(msg)`, `log.error(msg)`, `log.debug(msg)`, `log.step(n, total, msg)`

### Utilities

`isTTY()`, `terminalWidth()`, `truncate(text, max, suffix?)`,
`wordWrap(text, width)`, `indent(text, spaces)`, `dedent(str)`,
`formatBytes(bytes)`, `formatDuration(ms)`

## `@arshad-shah/clif/prompts` exports

`text(opts)`, `password(opts)`, `confirm(opts)`, `select(opts)`, `multiselect(opts)`, `number(opts)`, `group(prompts)`
`PromptError` — thrown on user cancellation (`code: "cancelled"`) or non-TTY stdin (`code: "not-a-tty"`).

## Types

`Formatter`, `Style`, `ColorStop`, `Align`,
`BoxBorder`, `BoxOptions`, `TableOptions`, `KeyValueOptions`, `ListOptions`,
`TreeNode`, `SpinnerOptions`, `ProgressOptions`,
`TaskNode`, `TaskContext`, `TaskListOptions`, `TaskListResult`, `TaskStatus`,
`ArgDef`, `ParsedArgs`, `ParseOptions`, `PositionalDef`, `PositionalValue`, `FlagValueOf`, `FlagsFromDefs`,
`CommandDef`, `CommandContext`, `RunOptions`,
`TextOptions`, `PasswordOptions`, `ConfirmOptions`, `SelectOption`, `SelectOptions`, `MultiSelectOptions`, `NumberOptions`,
`PromptErrorCode`
