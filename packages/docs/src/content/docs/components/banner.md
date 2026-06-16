---
title: Banner & FIGfonts
description: Render large ASCII-art lettering with FIGfonts, gradients, and layout control.
---

clif ships two complementary ways to draw a banner:

- **`banner(text, opts?)`** — from the core entry, a lightweight bordered title
  (see [Log & Divider](/components/log-divider/)). Zero font data, always
  synchronous.
- **`figlet(text, opts?)`** — from the opt-in **`@arshad-shah/clif/banner`**
  subpath, a full FIGfont engine that renders large ASCII-art lettering.

The FIGfont engine lives on its own subpath so its font data **never lands in
clif's core bundle**. Built-in fonts are split into separate chunks and loaded
lazily — you only pay for the fonts you actually use.

## Basic usage

`figlet` is asynchronous: it lazily loads the requested font the first time it
is used (and caches it thereafter).

```typescript
import { figlet } from "@arshad-shah/clif/banner";

console.log(await figlet("clif"));
//        _ _  __
//    ___| (_)/ _|
//   / __| | | |_
//  | (__| | |  _|
//   \___|_|_|_|
```

## Fonts

Seven fonts ship built-in: `standard` (default), `slant`, `small`, `big`,
`ansiShadow`, `banner`, and `mini`.

```typescript
await figlet("Hi", { font: "ansiShadow" });
// ██╗  ██╗██╗
// ██║  ██║██║
// ███████║██║
// ██╔══██║██║
// ██║  ██║██║
// ╚═╝  ╚═╝╚═╝
```

### Custom fonts

Bring any FIGfont (`.flf`) by registering its raw source — no bundle impact,
since the data is yours:

```typescript
import { registerFont, figlet } from "@arshad-shah/clif/banner";
import { readFileSync } from "node:fs";

registerFont("doom", readFileSync("./Doom.flf", "utf8"));
await figlet("boom", { font: "doom" });
```

You can also preload a font once and render synchronously with `renderFont`:

```typescript
import { loadFont, renderFont } from "@arshad-shah/clif/banner";

const font = await loadFont("slant");
const rows = renderFont("fast", font); // string[] — pure, no colour
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
await figlet("clif", { font: "big", color: hex("#f5c76a") });

// Gradient across the grid (horizontal | vertical | diagonal)
await figlet("clif", {
  font: "slant",
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

const art = await figlet("ship it", {
  font: "slant",
  gradient: ["#ff0080", "#f5c76a", "#7928ca"],
});
console.log(box(art, { padding: 1, borderColor: hex("#f5c76a") }));
```

## Layout, width, and alignment

`horizontalLayout` overrides the font's default spacing: `"default"` (the
font's controlled smushing), `"fitted"` (kerning), or `"full"` (no overlap).

```typescript
await figlet("WAVE", { horizontalLayout: "full" }); // widest
await figlet("WAVE", { horizontalLayout: "fitted" }); // kerned
await figlet("WAVE", { horizontalLayout: "default" }); // smushed (tightest)
```

When the rendered art is wider than `width` (default `terminalWidth()`), it is
**clipped** by default, or **wrapped** onto stacked lines with `overflow: "wrap"`.
`align` positions each row within `width`.

```typescript
await figlet("a long heading", {
  width: 40,
  overflow: "wrap",
  align: "center",
});
```

Embedded newlines in the input stack into separate blocks. Code points the font
doesn't define are skipped. Empty input returns `""`.

## `figlet` options

| Option              | Type                                       | Default           | Description                                           |
| ------------------- | ------------------------------------------ | ----------------- | ----------------------------------------------------- |
| `font`              | `BuiltinFontName \| string \| Font`        | `"standard"`      | Built-in name, registered name, or a preloaded `Font` |
| `width`             | `number`                                   | `terminalWidth()` | Target width for alignment / overflow                 |
| `align`             | `"left" \| "center" \| "right"`            | `"left"`          | Horizontal alignment within `width`                   |
| `overflow`          | `"clip" \| "wrap"`                         | `"clip"`          | Behaviour when art exceeds `width`                    |
| `horizontalLayout`  | `"default" \| "full" \| "fitted"`          | `"default"`       | Override the font's horizontal spacing                |
| `verticalLayout`    | `"default" \| "full" \| "fitted"`          | `"default"`       | Vertical spacing between stacked (newline) blocks     |
| `printDirection`    | `0 \| 1 \| "ltr" \| "rtl"`                 | font default      | Text flow direction                                   |
| `color`             | `Formatter`                                | —                 | A single colour/style applied to the whole banner     |
| `gradient`          | `ColorStop[]`                              | —                 | Multi-stop gradient painted across the grid           |
| `gradientDirection` | `"horizontal" \| "vertical" \| "diagonal"` | `"horizontal"`    | Direction the gradient flows                          |

## API

| Export                            | Description                                                   |
| --------------------------------- | ------------------------------------------------------------- |
| `figlet(text, opts?)`             | Async — load the font by name (lazily) and render to a string |
| `renderBanner(text, font, opts?)` | Sync — render with an already-loaded `Font`                   |
| `renderFont(text, font, opts?)`   | Sync, pure — the raw `string[]` grid (no colour/alignment)    |
| `loadFont(name)`                  | Async — resolve a built-in or registered font (cached)        |
| `parseFont(flf)`                  | Parse raw `.flf` source into a `Font`                         |
| `registerFont(name, flf)`         | Register a custom font by raw `.flf` source                   |
