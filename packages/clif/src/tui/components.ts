/**
 * clif/tui/components — Composable widgets for the TUI runtime.
 *
 * Each widget is a small stateful object exposing `render()` (returns the lines
 * it occupies) and `handleKey()` (mutates its own state, returns whether it
 * consumed the key). They don't own the loop or the screen — the caller embeds
 * their output inside `render` and routes keys to them — so any number can be
 * composed into a larger layout. This is the foundation later widgets build on.
 */

import { cyan, dim, inverse } from "../core/colors.js";
import { symbols } from "../core/symbols.js";
import type { Key } from "./keys.js";

/**
 * Clamp `value` into `[0, max]`. Shared by every scroll/cursor widget so the
 * bounds logic isn't re-derived per widget.
 */
function clamp(value: number, max: number): number {
  return value < 0 ? 0 : value > max ? max : value;
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface ListOptions<T> {
  items: T[];
  /** Visible rows. Omit to show every item (no scrolling). */
  height?: number;
  /** Initially highlighted row (default 0). */
  selectedIndex?: number;
  /** Render one item. Defaults to the active-row pointer + `String(item)`. */
  format?: (item: T, info: { selected: boolean; index: number }) => string;
}

export interface List<T> {
  render(): string;
  /** Returns `true` if the key moved the selection. */
  handleKey(key: Key): boolean;
  readonly selectedIndex: number;
  readonly selected: T | undefined;
  readonly items: readonly T[];
  /** Replace the items, clamping the selection into range. */
  setItems(items: T[]): void;
  /** Move the selection to `index` (clamped). */
  select(index: number): void;
}

/** A scrollable, single-selection list with a viewport that follows the cursor. */
export function createList<T>(opts: ListOptions<T>): List<T> {
  let items = opts.items;
  let selectedIndex = clamp(opts.selectedIndex ?? 0, Math.max(0, items.length - 1));
  let offset = 0;
  const format = opts.format;

  const visibleRows = () => Math.min(opts.height ?? items.length, items.length);

  // Keep the selected row inside the [offset, offset + height) window.
  const scrollIntoView = () => {
    const height = visibleRows();
    if (height <= 0) {
      offset = 0;
      return;
    }
    if (selectedIndex < offset) offset = selectedIndex;
    else if (selectedIndex >= offset + height) offset = selectedIndex - height + 1;
    offset = clamp(offset, Math.max(0, items.length - height));
  };

  const move = (to: number) => {
    selectedIndex = clamp(to, Math.max(0, items.length - 1));
    scrollIntoView();
  };

  const renderRow = (item: T, index: number): string => {
    const selected = index === selectedIndex;
    if (format) return format(item, { selected, index });
    const label = String(item);
    return selected ? `${cyan(symbols.pointer)} ${cyan(label)}` : `  ${label}`;
  };

  return {
    render(): string {
      if (items.length === 0) return dim("(empty)");
      const height = visibleRows();
      const lines: string[] = [];
      for (let i = offset; i < offset + height && i < items.length; i++) {
        lines.push(renderRow(items[i]!, i));
      }
      return lines.join("\n");
    },

    handleKey(key: Key): boolean {
      const height = visibleRows();
      switch (key.name) {
        case "up":
          move(selectedIndex - 1);
          return true;
        case "down":
          move(selectedIndex + 1);
          return true;
        case "home":
          move(0);
          return true;
        case "end":
          move(items.length - 1);
          return true;
        case "pageup":
          move(selectedIndex - height);
          return true;
        case "pagedown":
          move(selectedIndex + height);
          return true;
        default:
          return false;
      }
    },

    get selectedIndex() {
      return selectedIndex;
    },
    get selected() {
      return items[selectedIndex];
    },
    get items() {
      return items;
    },
    setItems(next: T[]): void {
      items = next;
      move(selectedIndex);
    },
    select(index: number): void {
      move(index);
    },
  };
}

// ── Viewport ────────────────────────────────────────────────────────────────

export interface ViewportOptions {
  /** Text to display; `\n`-separated or pre-split into lines. */
  content: string | string[];
  /** Visible rows. */
  height: number;
}

export interface Viewport {
  render(): string;
  /** Returns `true` if the key scrolled the content. */
  handleKey(key: Key): boolean;
  readonly scroll: number;
  setContent(content: string | string[]): void;
  scrollTo(line: number): void;
}

/** A fixed-height scrollable text region (logs, help, long output). */
export function createViewport(opts: ViewportOptions): Viewport {
  const toLines = (c: string | string[]) => (Array.isArray(c) ? c : c.split("\n"));
  let lines = toLines(opts.content);
  const height = Math.max(1, opts.height);
  let scroll = 0;

  const maxScroll = () => Math.max(0, lines.length - height);
  const scrollBy = (delta: number) => {
    scroll = clamp(scroll + delta, maxScroll());
  };

  return {
    render(): string {
      const out: string[] = [];
      for (let i = 0; i < height; i++) {
        out.push(lines[scroll + i] ?? "");
      }
      return out.join("\n");
    },

    handleKey(key: Key): boolean {
      switch (key.name) {
        case "up":
          scrollBy(-1);
          return true;
        case "down":
          scrollBy(1);
          return true;
        case "pageup":
          scrollBy(-height);
          return true;
        case "pagedown":
          scrollBy(height);
          return true;
        case "home":
          scroll = 0;
          return true;
        case "end":
          scroll = maxScroll();
          return true;
        default:
          return false;
      }
    },

    get scroll() {
      return scroll;
    },
    setContent(content: string | string[]): void {
      lines = toLines(content);
      scroll = clamp(scroll, maxScroll());
    },
    scrollTo(line: number): void {
      scroll = clamp(line, maxScroll());
    },
  };
}

// ── Text input ────────────────────────────────────────────────────────────────

export interface TextInputOptions {
  /** Initial value (default empty). */
  value?: string;
  /** Dim hint shown while the field is empty. */
  placeholder?: string;
}

export interface TextInput {
  render(): string;
  /** Returns `true` if the key changed the value or cursor. */
  handleKey(key: Key): boolean;
  value: string;
  /** Caret position within the value. */
  readonly cursor: number;
}

/** A single-line editable field with a visible block caret. */
export function createTextInput(opts: TextInputOptions = {}): TextInput {
  let value = opts.value ?? "";
  let cursor = value.length;
  const placeholder = opts.placeholder ?? "";

  const insert = (text: string) => {
    value = value.slice(0, cursor) + text + value.slice(cursor);
    cursor += text.length;
  };

  return {
    render(): string {
      if (value.length === 0) {
        // Caret sits on the first placeholder column (or a lone space).
        const rest = placeholder.length > 1 ? dim(placeholder.slice(1)) : "";
        return inverse(placeholder[0] ?? " ") + rest;
      }
      const head = value.slice(0, cursor);
      const at = value[cursor] ?? " ";
      const tail = cursor < value.length ? value.slice(cursor + 1) : "";
      return head + inverse(at) + tail;
    },

    handleKey(key: Key): boolean {
      switch (key.name) {
        case "char":
          insert(key.char!);
          return true;
        case "space":
          insert(" ");
          return true;
        case "backspace":
          if (cursor > 0) {
            value = value.slice(0, cursor - 1) + value.slice(cursor);
            cursor--;
            return true;
          }
          return false;
        case "delete":
          if (cursor < value.length) {
            value = value.slice(0, cursor) + value.slice(cursor + 1);
            return true;
          }
          return false;
        case "left":
          if (cursor > 0) {
            cursor--;
            return true;
          }
          return false;
        case "right":
          if (cursor < value.length) {
            cursor++;
            return true;
          }
          return false;
        case "home":
          cursor = 0;
          return true;
        case "end":
          cursor = value.length;
          return true;
        default:
          return false;
      }
    },

    get value() {
      return value;
    },
    set value(next: string) {
      value = next;
      cursor = clamp(cursor, value.length);
    },
    get cursor() {
      return cursor;
    },
  };
}
