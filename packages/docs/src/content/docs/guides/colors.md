---
title: Colors
description: Full ANSI color support with automatic detection and graceful fallbacks.
---

clif includes a complete ANSI color system that respects `NO_COLOR`, `FORCE_COLOR`, and pipe detection out of the box.

## Basic usage

Every color is a pure function that wraps text in ANSI escape codes:

```typescript
import { red, green, blue, bold, dim, underline } from "@arshad-shah/clif";

console.log(red("Error!"));
console.log(green("Success!"));
console.log(bold(blue("Important")));
```

## Composition

Colors compose naturally through nesting:

```typescript
import { bold, red, underline, compose } from "@arshad-shah/clif";

// Nested calls
console.log(bold(red("critical error")));

// Or use compose() for reusable styles
const heading = compose(bold, underline);
const error = compose(bold, red);

console.log(heading("Section Title"));
console.log(error("Something went wrong"));
```

## Chainable styles

Prefer a fluent, chalk-style API? `style` lets you stack any formatter and call
it on a string. Every access returns a fresh, immutable builder, so intermediate
styles are safe to capture and reuse.

```typescript
import { style } from "@arshad-shah/clif";

console.log(style.red.bold.underline("error"));
console.log(style.bgBlue.white(" status "));

// Extended colors are methods on the chain
console.log(style.hex("#f5c76a").bold("title"));
console.log(style.rgb(255, 136, 0)("custom orange"));
console.log(style.ansi256(208)("palette orange"));

// Capture a builder and branch off it — the original is never mutated
const heading = style.bold.cyan;
console.log(heading("Section"));
console.log(heading.underline("Emphasised section"));
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
import { rgb256, bgRgb256, rgb, bgRgb, hex, bgHex } from "@arshad-shah/clif";

// 256-color palette (0–255)
console.log(rgb256(208)("orange"));

// Truecolor (RGB values)
console.log(rgb(255, 136, 0)("custom orange"));

// Hex colors — full or 3-digit shorthand (#f80 → #ff8800)
console.log(hex("#ff8800")("hex orange"));
console.log(hex("#f80")("shorthand orange"));
console.log(bgHex("#1a1a2e")("dark background"));
```

## Gradients

`gradient` paints text with a smooth multi-stop gradient — one interpolated
color per visible character. It returns a regular formatter, so it composes and
inherits the same automatic downgrading as `rgb`.

```typescript
import { gradient, bold } from "@arshad-shah/clif";

console.log(gradient(["#ff0080", "#7928ca"])("hello world"));
console.log(gradient(["#f00", "#0f0", "#00f"])("rainbow"));

// Accepts [r, g, b] tuples too, and composes with other formatters
console.log(bold(gradient([[255, 136, 0], [255, 0, 128]])("fire")));
```

## Hyperlinks

`link` emits an OSC 8 terminal hyperlink. On terminals without link/color
support it degrades to `text (url)` so the URL is never lost.

```typescript
import { link } from "@arshad-shah/clif";

console.log(link("clif docs", "https://clif.arshadshah.com"));
```

## Automatic downgrading

Truecolor and 256-color formatters never silently drop color on weaker
terminals — they map to the nearest color the terminal can render
(truecolor → 256 → 16):

```typescript
import { rgb, colorLevel } from "@arshad-shah/clif";

colorLevel(3); // rgb(255, 0, 0) → exact truecolor
colorLevel(2); // → nearest 256-color index (196)
colorLevel(1); // → nearest basic color (bright red)
colorLevel(0); // → plain text
```

You can reach the conversions directly when you need them:

```typescript
import { rgbToAnsi256, rgbToAnsi16 } from "@arshad-shah/clif";

rgbToAnsi256(255, 136, 0); // 214
rgbToAnsi16(255, 0, 0); // 91 (bright red SGR code)
```

## Color detection

clif automatically detects the terminal's color level:

```typescript
import { colorLevel, isColorSupported } from "@arshad-shah/clif";

console.log(colorLevel()); // 0 | 1 | 2 | 3
console.log(isColorSupported()); // boolean

// Override for testing
colorLevel(0); // Force no color
colorLevel(3); // Force truecolor
```

**Levels:** 0 = no color, 1 = basic 16, 2 = 256-color, 3 = truecolor.

## Utilities

```typescript
import { stripAnsi, visibleLength } from "@arshad-shah/clif";

const colored = red("hello");
stripAnsi(colored); // "hello"
visibleLength(colored); // 5
```
