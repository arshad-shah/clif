---
title: Colors
description: Full ANSI color support with automatic detection and graceful fallbacks.
---

clif includes a complete ANSI color system that respects `NO_COLOR`, `FORCE_COLOR`, and pipe detection out of the box.

## Basic usage

Every color is a pure function that wraps text in ANSI escape codes:

```typescript
import { red, green, blue, bold, dim, underline } from "clif";

console.log(red("Error!"));
console.log(green("Success!"));
console.log(bold(blue("Important")));
```

## Composition

Colors compose naturally through nesting:

```typescript
import { bold, red, underline, compose } from "clif";

// Nested calls
console.log(bold(red("critical error")));

// Or use compose() for reusable styles
const heading = compose(bold, underline);
const error = compose(bold, red);

console.log(heading("Section Title"));
console.log(error("Something went wrong"));
```

## Available formatters

### Modifiers

`bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`, `reset`

### Foreground colors

`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray` (alias: `grey`)

### Bright variants

`redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`

### Background colors

`bgBlack`, `bgRed`, `bgGreen`, `bgYellow`, `bgBlue`, `bgMagenta`, `bgCyan`, `bgWhite`, `bgGray`

### Bright backgrounds

`bgRedBright`, `bgGreenBright`, `bgYellowBright`, `bgBlueBright`, `bgMagentaBright`, `bgCyanBright`, `bgWhiteBright`

## Extended colors

```typescript
import { rgb256, bgRgb256, rgb, bgRgb, hex, bgHex } from "clif";

// 256-color palette (0–255)
console.log(rgb256(208)("orange"));

// Truecolor (RGB values)
console.log(rgb(255, 136, 0)("custom orange"));

// Hex colors
console.log(hex("#ff8800")("hex orange"));
console.log(bgHex("#1a1a2e")("dark background"));
```

## Color detection

clif automatically detects the terminal's color level:

```typescript
import { colorLevel, isColorSupported } from "clif";

console.log(colorLevel()); // 0 | 1 | 2 | 3
console.log(isColorSupported()); // boolean

// Override for testing
colorLevel(0); // Force no color
colorLevel(3); // Force truecolor
```

**Levels:** 0 = no color, 1 = basic 16, 2 = 256-color, 3 = truecolor.

## Utilities

```typescript
import { stripAnsi, visibleLength } from "clif";

const colored = red("hello");
stripAnsi(colored); // "hello"
visibleLength(colored); // 5
```
