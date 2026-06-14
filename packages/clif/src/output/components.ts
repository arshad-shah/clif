/**
 * clif/output — Rich terminal output components.
 *
 * All components return strings by default (pure, testable).
 * Spinners and progress bars are TTY-aware: in non-TTY streams
 * (CI logs, files), they degrade to plain newline-terminated output
 * instead of spamming cursor-control sequences.
 */

import { CLEAR_LINE, CURSOR_HIDE, CURSOR_SHOW } from "../core/ansi.js";
import { type Formatter, bold, cyan, dim, green, visibleLength } from "../core/colors.js";
import { boxChars, boxStyles, statusIcon, symbols, treeChars } from "../core/symbols.js";
import { truncate, wordWrap } from "../utils/helpers.js";

// ── Box ─────────────────────────────────────────────────────────────────────

export type BoxBorder = "single" | "double" | "round" | "bold" | "none";

/** Horizontal alignment shared by `box` content and `table` cells. */
export type Align = "left" | "center" | "right";

/**
 * Pad `text` to `width` columns under the given alignment. `vis` is the text's
 * pre-computed visible width (ANSI-excluded), so callers that already know it
 * don't pay for a second strip. A `width` smaller than `vis` yields no padding.
 */
function padTo(text: string, vis: number, width: number, align: Align): string {
  const space = Math.max(0, width - vis);
  if (space === 0) return text;
  if (align === "right") return " ".repeat(space) + text;
  if (align === "center") {
    const left = Math.floor(space / 2);
    return " ".repeat(left) + text + " ".repeat(space - left);
  }
  return text + " ".repeat(space);
}

// Border glyph sets are centralised in symbols.ts (`boxStyles`) so no raw
// box-drawing characters are inlined here.
const BORDERS: Record<BoxBorder, (typeof boxStyles)[BoxBorder]> = boxStyles;

export interface BoxOptions {
  title?: string;
  border?: BoxBorder;
  padding?: number;
  margin?: number;
  width?: number;
  align?: Align;
  borderColor?: Formatter;
  titleColor?: Formatter;
  dimBorder?: boolean;
}

export function box(content: string, opts: BoxOptions = {}): string {
  const {
    border = "round",
    padding: rawPadding = 1,
    margin = 0,
    align = "left",
    borderColor = (s: string) => s,
    titleColor = bold,
    dimBorder = false,
  } = opts;
  // Normalise to a non-negative integer so it can drive both the horizontal
  // space count and the vertical blank-line count without throwing on
  // fractional or negative input.
  const padding = Math.max(0, Math.trunc(rawPadding));

  const b = BORDERS[border];
  const applyBorder = dimBorder ? (s: string) => dim(borderColor(s)) : borderColor;

  const lines = content.split("\n");
  // Strip ANSI once per line up front — both the max-width pass and the
  // per-line alignment pass below need the visible width, and visibleLength
  // walks the whole string each time.
  const lineWidths = lines.map(visibleLength);
  const maxContent = lineWidths.length ? Math.max(...lineWidths) : 0;

  // Title in top border
  const titleStr = opts.title ? ` ${titleColor(opts.title)} ` : "";
  const titleLen = opts.title ? visibleLength(titleStr) : 0;

  // The inner width must also fit the title; otherwise the top border (which
  // embeds the title) ends up longer than the bottom and the box looks
  // lopsided. Account for the explicit `width` option, the content, and the
  // title length all at once.
  const innerWidth = Math.max(opts.width ?? 0, maxContent + padding * 2, titleLen);

  const padStr = " ".repeat(padding);
  const marginStr = " ".repeat(margin);

  const topFill = b.h.repeat(Math.max(0, innerWidth - titleLen));
  const top = `${marginStr}${applyBorder(b.tl)}${titleStr}${applyBorder(topFill + b.tr)}`;
  const bottom = `${marginStr}${applyBorder(b.bl + b.h.repeat(innerWidth) + b.br)}`;

  const emptyLine = `${marginStr}${applyBorder(b.v)}${" ".repeat(innerWidth)}${applyBorder(b.v)}`;

  const paddedLines: string[] = [];

  // Top padding — one blank line per unit of padding.
  for (let i = 0; i < padding; i++) paddedLines.push(emptyLine);

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    const aligned = padTo(line, lineWidths[li]!, innerWidth - padding * 2, align);
    paddedLines.push(
      `${marginStr}${applyBorder(b.v)}${padStr}${aligned}${padStr}${applyBorder(b.v)}`,
    );
  }

  // Bottom padding — symmetric with the top.
  for (let i = 0; i < padding; i++) paddedLines.push(emptyLine);

  const topMargin = "\n".repeat(margin > 0 ? 1 : 0);
  const bottomMargin = "\n".repeat(margin > 0 ? 1 : 0);

  return `${topMargin}${top}\n${paddedLines.join("\n")}\n${bottom}${bottomMargin}`;
}

// ── Table ───────────────────────────────────────────────────────────────────

export interface TableOptions {
  headers?: string[];
  border?: boolean;
  headerColor?: Formatter;
  /** Suppress the separator row between header and body for a denser layout. */
  compact?: boolean;
  maxColumnWidth?: number;
  /**
   * Per-column horizontal alignment. A single value applies to every column;
   * an array aligns each column independently (columns past the array's end
   * fall back to `"left"`). Headers align with their column.
   */
  align?: Align | Align[];
  /**
   * Wrap cells wider than `maxColumnWidth` onto multiple lines instead of
   * truncating them. No effect without `maxColumnWidth`.
   */
  wrap?: boolean;
}

export function table(rows: string[][], opts: TableOptions = {}): string {
  const {
    headers,
    border = true,
    headerColor = bold,
    compact = false,
    maxColumnWidth,
    align = "left",
    wrap = false,
  } = opts;
  const allRows = headers ? [headers, ...rows] : rows;

  if (allRows.length === 0) return "";

  const colCount = Math.max(...allRows.map((r) => r.length));
  const alignments: Align[] = Array.from({ length: colCount }, (_, c) =>
    Array.isArray(align) ? (align[c] ?? "left") : align,
  );

  // Calculate column widths
  const widths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let max = 0;
    for (const row of allRows) {
      const cell = row[c] ?? "";
      max = Math.max(max, visibleLength(cell));
    }
    widths.push(maxColumnWidth ? Math.min(max, maxColumnWidth) : max);
  }

  const lines: string[] = [];
  const segs = widths.map((w) => boxChars.horizontal.repeat(w + 2));
  const topSep = border
    ? `${boxChars.topLeft}${segs.join(boxChars.teeDown)}${boxChars.topRight}`
    : "";
  const midSep = border
    ? `${boxChars.teeRight}${segs.join(boxChars.cross)}${boxChars.teeLeft}`
    : "";
  const bottomSep = border
    ? `${boxChars.bottomLeft}${segs.join(boxChars.teeUp)}${boxChars.bottomRight}`
    : "";

  if (border) lines.push(topSep);

  for (let r = 0; r < allRows.length; r++) {
    const row = allRows[r]!;
    const isHeader = headers && r === 0;

    // Resolve each cell to one or more physical lines: wrapped (when `wrap`
    // and the cell overflows its column), truncated (when capped without
    // wrap), or a single verbatim line.
    const colLines = widths.map((w, c) => {
      const raw = row[c] ?? "";
      if (wrap && maxColumnWidth && visibleLength(raw) > w) {
        return wordWrap(raw, w).split("\n");
      }
      const trimmed =
        maxColumnWidth && visibleLength(raw) > maxColumnWidth ? truncate(raw, maxColumnWidth) : raw;
      return [trimmed];
    });
    const height = Math.max(1, ...colLines.map((l) => l.length));

    for (let li = 0; li < height; li++) {
      const cells = widths.map((w, c) => {
        const text = colLines[c]![li] ?? "";
        const padded = padTo(text, visibleLength(text), w, alignments[c]!);
        return isHeader ? headerColor(padded) : padded;
      });
      if (border) {
        const v = boxChars.vertical;
        lines.push(`${v} ${cells.join(` ${v} `)} ${v}`);
      } else {
        lines.push(`  ${cells.join("  ")}  `);
      }
    }

    if (isHeader && !compact && border) lines.push(midSep);
  }

  if (border) lines.push(bottomSep);

  return lines.join("\n");
}

// ── Key-Value Display ───────────────────────────────────────────────────────

export interface KeyValueOptions {
  separator?: string;
  keyColor?: Formatter;
  valueColor?: Formatter;
  indent?: number;
}

export function keyValue(
  data: Record<string, string | number | boolean>,
  opts: KeyValueOptions = {},
): string {
  const { separator = "  ", keyColor = dim, valueColor = (s: string) => s, indent = 0 } = opts;
  const entries = Object.entries(data);
  const maxKey = Math.max(...entries.map(([k]) => k.length));
  const pad = " ".repeat(indent);

  return entries
    .map(([k, v]) => `${pad}${keyColor(k.padEnd(maxKey))}${separator}${valueColor(String(v))}`)
    .join("\n");
}

// ── List ────────────────────────────────────────────────────────────────────

export interface ListOptions {
  marker?: string;
  indent?: number;
  markerColor?: Formatter;
  ordered?: boolean;
}

export function list(items: string[], opts: ListOptions = {}): string {
  const { marker = symbols.bullet, indent = 0, markerColor = cyan, ordered = false } = opts;
  const pad = " ".repeat(indent);

  return items
    .map((item, i) => {
      const bullet = ordered ? `${markerColor(`${i + 1}.`)}` : markerColor(marker);
      return `${pad}${bullet} ${item}`;
    })
    .join("\n");
}

// ── Tree ────────────────────────────────────────────────────────────────────

export interface TreeNode {
  label: string;
  children?: TreeNode[];
}

export function tree(root: TreeNode): string {
  return renderTree(root, "");
}

function renderTree(root: TreeNode, prefix: string): string {
  const lines: string[] = [root.label];

  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i]!;
      const isLast = i === root.children.length - 1;
      const connector = isLast ? treeChars.lastBranch : treeChars.branch;
      const childPrefix = isLast ? treeChars.indent : treeChars.vertical;

      // Recurse with the column owned by this child's subtree as the prefix.
      // The recursion bakes that prefix into every line below the child's
      // label, so we only prepend our own `prefix + connector` to the first
      // line (the child label) and pass the rest through verbatim — otherwise
      // grandchildren get double-indented.
      const childTree = renderTree(child, prefix + childPrefix);
      const childLines = childTree.split("\n");
      lines.push(prefix + connector + childLines[0]!);
      for (let j = 1; j < childLines.length; j++) {
        lines.push(childLines[j]!);
      }
    }
  }

  return lines.join("\n");
}

// ── Spinner ─────────────────────────────────────────────────────────────────

export interface SpinnerOptions {
  text?: string;
  frames?: string[];
  interval?: number;
  color?: Formatter;
  stream?: NodeJS.WritableStream;
  /** Text printed before the frame/icon on every line (e.g. a step counter). */
  prefixText?: string;
  /** Text printed after the label on every line. */
  suffixText?: string;
}

const DEFAULT_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function isStreamTTY(stream: NodeJS.WritableStream): boolean {
  // `tty.WriteStream` exposes `isTTY`, but the base `WritableStream` type
  // does not — probe defensively without an unchecked structural cast.
  return "isTTY" in stream && stream.isTTY === true;
}

export function createSpinner(opts: SpinnerOptions = {}) {
  const {
    frames = DEFAULT_FRAMES,
    interval = 80,
    color = cyan,
    stream = process.stderr,
    prefixText = "",
    suffixText = "",
  } = opts;
  const tty = isStreamTTY(stream);

  let text = opts.text ?? "";
  let frameIdx = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let isSpinning = false;
  let sigintHandler: (() => void) | null = null;

  /** Frame a body (frame/icon + label) with the fixed prefix/suffix. */
  function line(body: string): string {
    return `${prefixText}${body}${suffixText}`;
  }

  function render() {
    const frame = color(frames[frameIdx % frames.length]!);
    stream.write(`${CLEAR_LINE}${line(`${frame} ${text}`)}`);
    frameIdx++;
  }

  function cleanup() {
    if (timer) clearInterval(timer);
    timer = null;
    if (tty) stream.write(`${CLEAR_LINE}${CURSOR_SHOW}`);
    if (sigintHandler) {
      process.off("SIGINT", sigintHandler);
      sigintHandler = null;
    }
    isSpinning = false;
  }

  const api = {
    start(msg?: string) {
      if (msg !== undefined) text = msg;
      // Idempotent: if already running, just refresh text and continue.
      if (isSpinning) return api;
      isSpinning = true;
      if (tty) {
        stream.write(CURSOR_HIDE);
        render();
        timer = setInterval(render, interval);
        sigintHandler = () => {
          cleanup();
          // A registered SIGINT listener suppresses Node's default termination,
          // so a spinner would otherwise swallow the first Ctrl+C. Once our
          // listener is removed by cleanup, re-raise the interrupt — but only
          // when no other handlers remain, to avoid double-firing a SIGINT
          // handler the host program installed itself.
          if (process.listenerCount("SIGINT") === 0) {
            process.kill(process.pid, "SIGINT");
          }
        };
        process.once("SIGINT", sigintHandler);
      } else {
        // Non-TTY: single static line so logs stay readable.
        stream.write(`${line(`${color(frames[0]!)} ${text}`)}\n`);
      }
      return api;
    },
    stop(finalText?: string) {
      cleanup();
      if (finalText) stream.write(`${finalText}\n`);
      return api;
    },
    succeed(msg?: string) {
      return api.stop(line(`${statusIcon("success")} ${msg ?? text}`));
    },
    fail(msg?: string) {
      return api.stop(line(`${statusIcon("error")} ${msg ?? text}`));
    },
    warn(msg?: string) {
      return api.stop(line(`${statusIcon("warning")} ${msg ?? text}`));
    },
    info(msg?: string) {
      return api.stop(line(`${statusIcon("info")} ${msg ?? text}`));
    },
    update(msg: string) {
      text = msg;
      return api;
    },
    get isActive() {
      return isSpinning;
    },
  };
  return api;
}

// ── Progress Bar ────────────────────────────────────────────────────────────

export interface ProgressOptions {
  total: number;
  width?: number;
  complete?: string;
  incomplete?: string;
  format?: string;
  color?: Formatter;
  stream?: NodeJS.WritableStream;
}

export function createProgress(opts: ProgressOptions) {
  if (!Number.isFinite(opts.total) || opts.total <= 0) {
    throw new RangeError(
      `createProgress: total must be a positive finite number, got ${String(opts.total)}`,
    );
  }
  const {
    total,
    width = 30,
    complete = "█",
    incomplete = "░",
    format = ":bar :percent :current/:total",
    color = green,
    stream = process.stderr,
  } = opts;
  const tty = isStreamTTY(stream);

  let current = 0;

  function format_(): string {
    const ratio = Math.min(current / total, 1);
    const filled = Math.round(width * ratio);
    const empty = width - filled;
    const bar = color(complete.repeat(filled)) + dim(incomplete.repeat(empty));
    const percent = `${Math.round(ratio * 100)}%`;
    return format
      .replaceAll(":bar", bar)
      .replaceAll(":percent", percent)
      .replaceAll(":current", String(current))
      .replaceAll(":total", String(total));
  }

  function render() {
    if (tty) {
      stream.write(`${CLEAR_LINE}${format_()}`);
      if (current >= total) stream.write("\n");
    } else {
      // Non-TTY: only emit on completion (every tick would flood logs).
      if (current >= total) stream.write(`${format_()}\n`);
    }
  }

  return {
    tick(amount = 1) {
      current = Math.min(current + amount, total);
      render();
      return this;
    },
    update(value: number) {
      current = Math.min(Math.max(value, 0), total);
      render();
      return this;
    },
    get value() {
      return current;
    },
    get isComplete() {
      return current >= total;
    },
  };
}

// ── Divider ─────────────────────────────────────────────────────────────────

export function divider(
  opts: { width?: number; char?: string; label?: string; color?: Formatter } = {},
): string {
  const { width = 60, char = "─", color: colorFn = dim, label } = opts;
  if (label) {
    const labelStr = ` ${label} `;
    // Clamp to 0 so a label wider than `width` doesn't pass a negative count
    // to String.repeat (which throws RangeError).
    const remaining = Math.max(0, width - labelStr.length);
    const left = Math.floor(remaining / 2);
    const right = remaining - left;
    return colorFn(char.repeat(left)) + labelStr + colorFn(char.repeat(right));
  }
  return colorFn(char.repeat(width));
}

// ── Banner ──────────────────────────────────────────────────────────────────

export function banner(text: string, opts: { color?: Formatter; char?: string } = {}): string {
  const { color: colorFn = bold, char = "═" } = opts;
  const width = visibleLength(text) + 4;
  const border = char.repeat(width);
  return `${colorFn(border)}\n${colorFn(char)} ${text} ${colorFn(char)}\n${colorFn(border)}`;
}

// ── Log helpers ─────────────────────────────────────────────────────────────

export const log = {
  info: (msg: string) => process.stdout.write(`${statusIcon("info")} ${msg}\n`),
  success: (msg: string) => process.stdout.write(`${statusIcon("success")} ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`${statusIcon("warning")} ${msg}\n`),
  error: (msg: string) => process.stderr.write(`${statusIcon("error")} ${msg}\n`),
  debug: (msg: string) => {
    if (process.env.DEBUG) process.stderr.write(`${dim(symbols.bullet)} ${dim(msg)}\n`);
  },
  step: (n: number, total: number, msg: string) =>
    process.stdout.write(`${dim(`[${n}/${total}]`)} ${msg}\n`),
};
