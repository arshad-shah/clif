---
title: Box
description: Render bordered boxes with titles, alignment, and colors.
---

## Basic box

```typescript
import { box } from "@arshad-shah/clif";
console.log(box("Hello, World!"));
```

## Border styles

Five built-in styles: `round` (default), `single`, `double`, `bold`, `none`.

```typescript
box("round", { border: "round" }); // ╭─────╮
box("single", { border: "single" }); // ┌─────┐
box("double", { border: "double" }); // ╔═════╗
box("bold", { border: "bold" }); // ┏━━━━━┓
```

## Title, alignment, and colors

```typescript
import { box, cyan, yellow } from "@arshad-shah/clif";

box("Content", {
  title: "Notice",
  align: "center",
  width: 30,
  borderColor: cyan,
  titleColor: yellow,
  dimBorder: true,
});
```

## Options

| Option        | Type                            | Default   | Description                                                           |
| ------------- | ------------------------------- | --------- | --------------------------------------------------------------------- |
| `border`      | `BoxBorder`                     | `"round"` | Border style                                                          |
| `title`       | `string`                        | —         | Title in top border                                                   |
| `padding`     | `number`                        | `1`       | Inner padding                                                         |
| `margin`      | `number`                        | `0`       | Outer margin                                                          |
| `width`       | `number`                        | auto      | Minimum inner width (the box also auto-expands to fit a long `title`) |
| `align`       | `"left" \| "center" \| "right"` | `"left"`  | Alignment                                                             |
| `borderColor` | `Formatter`                     | identity  | Border color                                                          |
| `titleColor`  | `Formatter`                     | `bold`    | Title color                                                           |
| `dimBorder`   | `boolean`                       | `false`   | Dim the border                                                        |
