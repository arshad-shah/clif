---
title: TUI Runtime
description: Build small, performant full-screen terminal apps with an imperative render loop and composable widgets.
---

The `clif/tui` entry adds a tiny full-screen UI runtime. It's imperative: **you own the state**, return the whole screen as a string from `render`, and handle keys. clif drives the alternate screen buffer, raw input decoding, a **line-diff repaint** (only changed rows are rewritten), and a bulletproof terminal restore on exit, Ctrl+C, or a crash.

It's a separate import, so it adds nothing to your bundle unless you use it.

```typescript
import { createApp } from "@arshad-shah/clif/tui";

let count = 0;

const app = createApp({
  render: () => `Count: ${count}\n\n↑/↓ to change · q to quit`,
  onKey: (key, app) => {
    if (key.name === "up") count++;
    else if (key.name === "down") count--;
    else if (key.char === "q") return app.exit();
    app.rerender();
  },
});

await app.run();
```

`createApp` requires a TTY — it throws `TuiError { code: "not-a-tty" }` when stdin is piped.

## How it renders

`render` returns the **entire frame** as a newline-separated string. Every call to `app.rerender()` schedules a repaint; multiple calls within one frame are coalesced (capped by `fps`, default 30). The renderer diffs your frame against the previous one and only rewrites the rows that changed, so an unchanged screen costs nothing and there's no flicker.

Lines wider than the terminal are clamped to its width. On resize, the screen is cleared and fully repainted, and `onResize` fires with the new size.

### `AppOptions`

| Option       | Type                 | Description                                             |
| ------------ | -------------------- | ------------------------------------------------------- |
| `render`     | `(size) => string`   | Produce the full frame for the current `{ rows, cols }` |
| `onKey`      | `(key, app) => void` | Handle a decoded keypress                               |
| `onResize`   | `(size) => void`     | Called after a terminal resize, before the repaint      |
| `onExit`     | `() => void`         | Runs once during teardown (success or error)            |
| `fullscreen` | `boolean`            | Use the alternate screen buffer (default `true`)        |
| `fps`        | `number`             | Max repaints per second (default `30`)                  |

### `AppHandle`

Passed to `onKey`. `app.rerender()` requests a repaint, `app.exit(code?)` tears down and resolves `run()` with the exit code, and `app.size` is the live `{ rows, cols }`.

## Keys

`onKey` receives a decoded `Key`:

| Field   | Type      | Description                                                              |
| ------- | --------- | ------------------------------------------------------------------------ |
| `name`  | `KeyName` | `"up"`, `"down"`, `"enter"`, `"escape"`, `"tab"`, `"char"`, …            |
| `char`  | `string?` | The printable character when `name === "char"` (and the Ctrl letter)     |
| `ctrl`  | `boolean` | Ctrl was held — e.g. Ctrl+C is `{ name: "char", char: "c", ctrl: true }` |
| `shift` | `boolean` | Shift+Tab reports as `{ name: "backtab", shift: true }`                  |
| `raw`   | `string`  | The raw bytes this key decoded from                                      |

Escape sequences split across reads (the terminal may deliver `ESC` and `[A` separately) are reassembled into a single key. **Ctrl+C always exits** with code `130`, even if you don't handle it. Mouse input is not supported in this version.

## Widgets

Widgets are small stateful objects with `render()` (returns the lines they occupy) and `handleKey()` (mutates their state, returns whether they consumed the key). They don't own the loop — you embed their output in `render` and route keys to them — so any number compose into a larger layout.

### List

A scrollable single-select list whose viewport follows the cursor.

```typescript
import { createApp, createList } from "@arshad-shah/clif/tui";

const list = createList({
  items: ["Build", "Test", "Lint", "Release"],
  height: 5, // visible rows; omit to show all
});

const app = createApp({
  render: () => `Pick a task:\n\n${list.render()}\n\n↑/↓ · enter · q`,
  onKey: (key, app) => {
    if (list.handleKey(key)) return app.rerender(); // ↑/↓/Home/End/PgUp/PgDn
    if (key.name === "enter") {
      run(list.selected); // list.selectedIndex is also available
      return app.exit();
    }
    if (key.char === "q") app.exit();
  },
});
```

Pass `format: (item, { selected, index }) => string` to customise each row.

### Viewport

A fixed-height scrollable text region for logs, help, or long output.

```typescript
import { createViewport } from "@arshad-shah/clif/tui";

const vp = createViewport({ content: lines, height: 10 });
// vp.handleKey(key) → ↑/↓ scroll, PgUp/PgDn page, Home/End jump
// vp.setContent(...), vp.scrollTo(line), vp.scroll
```

### Text input

A single-line editable field with a visible block caret.

```typescript
import { createTextInput } from "@arshad-shah/clif/tui";

const input = createTextInput({ placeholder: "type your name…" });
// input.handleKey(key) → typing, Backspace/Delete, ←/→, Home/End
// input.value is the current string
```

## Cleanup

The runtime always restores the cursor, leaves the alternate screen, and restores raw mode when `run()` resolves — including on Ctrl+C and on a thrown error. For the real process it also guards `SIGINT` and `process.exit`, so a crash never leaves the terminal in a broken state.
