---
title: Banner & FIGfonts
description: Render large ASCII-art lettering with any FIGfont, gradients, and layout control.
---

clif ships two complementary ways to draw a banner:

- **`banner(text, opts?)`** — from the core entry, a lightweight bordered title
  (see [Log & Divider](/components/log-divider/)). Zero font data.
- **`figlet(text, opts?)`** — from the opt-in **`@arshad-shah/clif/banner`**
  subpath, a full FIGfont engine that renders large ASCII-art lettering from
  **any** FIGfont you supply.

clif bundles **no fonts** — it ships only the engine, so the import stays tiny
and clif's concern stays purely CLI. You bring the `.flf`; `figlet` renders it.

## Getting a font

FIGfonts (`.flf` files) are widely available — the classic collection lives at
[github.com/xero/figlet-fonts](https://github.com/xero/figlet-fonts), and
[figlet.org/fontdb.cgi](http://www.figlet.org/fontdb.cgi) has hundreds more.
Popular picks: `Standard`, `Slant`, `Small`, `Big`, `ANSI Shadow`, `Banner`,
`Mini`. Download the `.flf` and drop it into your project.

## Basic usage

Parse a font once with `parseFont`, then render with it. `figlet` is
synchronous and pure.

```typescript
import { readFileSync } from "node:fs";
import { figlet, parseFont } from "@arshad-shah/clif/banner";

const standard = parseFont(readFileSync("./fonts/Standard.flf", "utf8"));

console.log(figlet("clif", { font: standard }));
//        _ _  __
//    ___| (_)/ _|
//   / __| | | |_
//  | (__| | |  _|
//   \___|_|_|_|
```

### Registering fonts by name

`registerFont` parses and stores a font so you can reference it by name from
anywhere — handy when several call sites share a font.

```typescript
import { figlet, registerFont } from "@arshad-shah/clif/banner";
import { readFileSync } from "node:fs";

registerFont("slant", readFileSync("./fonts/Slant.flf", "utf8"));

figlet("ship it", { font: "slant" }); // referenced by name
```

You can also drop down to `renderFont` for the raw, uncoloured grid:

```typescript
import { renderFont } from "@arshad-shah/clif/banner";

const rows = renderFont("fast", standard); // string[] — pure, no colour
```

## Colour

Banners build on clif's own [colour system](/guides/colors/). Pass a single
`Formatter`, or a multi-stop `gradient` painted **across the rendered grid**
(not naïvely per line). Colour automatically degrades on weaker terminals and
disappears entirely under `NO_COLOR`.

```typescript
import { figlet } from "@arshad-shah/clif/banner";
import { hex } from "@arshad-shah/clif";

// Single colour / style
figlet("clif", { font: big, color: hex("#f5c76a") });

// Gradient across the grid (horizontal | vertical | diagonal)
figlet("clif", {
  font: slant,
  gradient: ["#ff0080", "#7928ca"],
  gradientDirection: "diagonal",
});
```

## Composing with a box

`figlet` returns a plain multi-line string with uniform-width rows, so it
composes cleanly with [`box`](/components/box/) and every other renderer —
width math stays ANSI-aware.

```typescript
import { figlet } from "@arshad-shah/clif/banner";
import { box, hex } from "@arshad-shah/clif";

const art = figlet("ship it", {
  font: slant,
  gradient: ["#ff0080", "#f5c76a", "#7928ca"],
});
console.log(box(art, { padding: 1, borderColor: hex("#f5c76a") }));
```

## Layout, width, and alignment

`horizontalLayout` overrides the font's default spacing: `"default"` (the
font's controlled smushing), `"fitted"` (kerning), or `"full"` (no overlap).

```typescript
figlet("WAVE", { font, horizontalLayout: "full" }); // widest
figlet("WAVE", { font, horizontalLayout: "fitted" }); // kerned
figlet("WAVE", { font, horizontalLayout: "default" }); // smushed (tightest)
```

When the rendered art is wider than `width` (default `terminalWidth()`), it is
**clipped** by default, or **wrapped** onto stacked lines with `overflow: "wrap"`.
`align` positions each row within `width`.

```typescript
figlet("a long heading", {
  font,
  width: 40,
  overflow: "wrap",
  align: "center",
});
```

Embedded newlines in the input stack into separate blocks. Code points the font
doesn't define are skipped. Empty input returns `""`.

## `figlet` options

| Option              | Type                                       | Default           | Description                                              |
| ------------------- | ------------------------------------------ | ----------------- | -------------------------------------------------------- |
| `font`              | `Font \| string`                           | — (required)      | A parsed `Font`, or a name registered via `registerFont` |
| `width`             | `number`                                   | `terminalWidth()` | Target width for alignment / overflow                    |
| `align`             | `"left" \| "center" \| "right"`            | `"left"`          | Horizontal alignment within `width`                      |
| `overflow`          | `"clip" \| "wrap"`                         | `"clip"`          | Behaviour when art exceeds `width`                       |
| `horizontalLayout`  | `"default" \| "full" \| "fitted"`          | `"default"`       | Override the font's horizontal spacing                   |
| `verticalLayout`    | `"default" \| "full" \| "fitted"`          | `"default"`       | Vertical spacing between stacked (newline) blocks        |
| `printDirection`    | `0 \| 1 \| "ltr" \| "rtl"`                 | font default      | Text flow direction                                      |
| `color`             | `Formatter`                                | —                 | A single colour/style applied to the whole banner        |
| `gradient`          | `ColorStop[]`                              | —                 | Multi-stop gradient painted across the grid              |
| `gradientDirection` | `"horizontal" \| "vertical" \| "diagonal"` | `"horizontal"`    | Direction the gradient flows                             |

## API

| Export                          | Description                                           |
| ------------------------------- | ----------------------------------------------------- |
| `figlet(text, opts)`            | Render ASCII art with a supplied `font` (sync, pure)  |
| `renderFont(text, font, opts?)` | The raw `string[]` grid — no colour/alignment         |
| `parseFont(flf)`                | Parse raw `.flf` source into a `Font`                 |
| `registerFont(name, flf)`       | Parse and store a font so `figlet` can use it by name |
