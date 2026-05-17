/**
 * clif/output — Rich terminal output components.
 *
 * All components return strings by default (pure, testable).
 * Call `.print()` variants or pass `{ print: true }` to write to stdout.
 */

import {
  type Formatter,
  bold,
  cyan,
  dim,
  green,
  red,
  stripAnsi,
  visibleLength,
  yellow,
} from "../core/colors.js";

// ── Box ─────────────────────────────────────────────────────────────────────

export type BoxBorder = "single" | "double" | "round" | "bold" | "none";

const BORDERS: Record<
  BoxBorder,
  { tl: string; tr: string; bl: string; br: string; h: string; v: string }
> = {
  single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
  round: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
  bold: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
  none: { tl: " ", tr: " ", bl: " ", br: " ", h: " ", v: " " },
};

export interface BoxOptions {
  title?: string;
  border?: BoxBorder;
  padding?: number;
  margin?: number;
  width?: number;
  align?: "left" | "center" | "right";
  borderColor?: Formatter;
  titleColor?: Formatter;
  dimBorder?: boolean;
}

export function box(content: string, opts: BoxOptions = {}): string {
  const {
    border = "round",
    padding = 1,
    margin = 0,
    align = "left",
    borderColor = (s: string) => s,
    titleColor = bold,
    dimBorder = false,
  } = opts;

  const b = BORDERS[border];
  const applyBorder = dimBorder ? (s: string) => dim(borderColor(s)) : borderColor;

  const lines = content.split("\n");
  const maxContent = Math.max(...lines.map(visibleLength));
  const innerWidth = Math.max(opts.width ?? 0, maxContent + padding * 2);

  const padStr = " ".repeat(padding);
  const marginStr = " ".repeat(margin);

  // Title in top border
  const titleStr = opts.title ? ` ${titleColor(opts.title)} ` : "";
  const titleLen = opts.title ? visibleLength(titleStr) : 0;

  const topFill = b.h.repeat(Math.max(0, innerWidth - titleLen));
  const top = `${marginStr}${applyBorder(b.tl)}${titleStr}${applyBorder(topFill + b.tr)}`;
  const bottom = `${marginStr}${applyBorder(b.bl + b.h.repeat(innerWidth) + b.br)}`;

  const emptyLine = `${marginStr}${applyBorder(b.v)}${" ".repeat(innerWidth)}${applyBorder(b.v)}`;

  const paddedLines: string[] = [];

  // Top padding
  for (let i = 0; i < (padding > 0 ? 1 : 0); i++) paddedLines.push(emptyLine);

  for (const line of lines) {
    const stripped = visibleLength(line);
    const space = innerWidth - padding * 2 - stripped;
    let aligned: string;
    if (align === "center") {
      const left = Math.floor(space / 2);
      const right = space - left;
      aligned = " ".repeat(left) + line + " ".repeat(right);
    } else if (align === "right") {
      aligned = " ".repeat(space) + line;
    } else {
      aligned = line + " ".repeat(Math.max(0, space));
    }
    paddedLines.push(
      `${marginStr}${applyBorder(b.v)}${padStr}${aligned}${padStr}${applyBorder(b.v)}`,
    );
  }

  // Bottom padding
  for (let i = 0; i < (padding > 0 ? 1 : 0); i++) paddedLines.push(emptyLine);

  const topMargin = "\n".repeat(margin > 0 ? 1 : 0);
  const bottomMargin = "\n".repeat(margin > 0 ? 1 : 0);

  return `${topMargin}${top}\n${paddedLines.join("\n")}\n${bottom}${bottomMargin}`;
}

// ── Table ───────────────────────────────────────────────────────────────────

export interface TableOptions {
  headers?: string[];
  border?: boolean;
  headerColor?: Formatter;
  compact?: boolean;
  maxColumnWidth?: number;
}

export function table(rows: string[][], opts: TableOptions = {}): string {
  const { headers, border = true, headerColor = bold, compact = false, maxColumnWidth } = opts;
  const allRows = headers ? [headers, ...rows] : rows;

  if (allRows.length === 0) return "";

  const colCount = Math.max(...allRows.map((r) => r.length));

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
  const segs = widths.map((w) => "─".repeat(w + 2));
  const topSep = border ? `┌${segs.join("┬")}┐` : "";
  const midSep = border ? `├${segs.join("┼")}┤` : "";
  const bottomSep = border ? `└${segs.join("┴")}┘` : "";

  if (border) lines.push(topSep);

  for (let r = 0; r < allRows.length; r++) {
    const row = allRows[r]!;
    const isHeader = headers && r === 0;
    const cells = widths.map((w, c) => {
      const raw = row[c] ?? "";
      const trimmed =
        maxColumnWidth && visibleLength(raw) > maxColumnWidth
          ? `${stripAnsi(raw).slice(0, maxColumnWidth - 1)}…`
          : raw;
      const padded = trimmed + " ".repeat(Math.max(0, w - visibleLength(trimmed)));
      return isHeader ? headerColor(padded) : padded;
    });

    if (border) {
      lines.push(`│ ${cells.join(" │ ")} │`);
    } else {
      lines.push(`  ${cells.join("  ")}  `);
    }

    if (isHeader) lines.push(midSep);
    if (!compact && r < allRows.length - 1 && !isHeader && border) {
      // No extra lines between rows unless compact is false (keep border lines)
    }
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
  const { marker = "●", indent = 0, markerColor = cyan, ordered = false } = opts;
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

export function tree(root: TreeNode, prefix = ""): string {
  const lines: string[] = [root.label];

  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i]!;
      const isLast = i === root.children.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const childPrefix = isLast ? "    " : "│   ";

      const childTree = tree(child, prefix + childPrefix);
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
}

const DEFAULT_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function createSpinner(opts: SpinnerOptions = {}) {
  const { frames = DEFAULT_FRAMES, interval = 80, color = cyan, stream = process.stderr } = opts;

  let text = opts.text ?? "";
  let frameIdx = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let isSpinning = false;

  function render() {
    const frame = color(frames[frameIdx % frames.length]!);
    stream.write(`\r\x1b[K${frame} ${text}`);
    frameIdx++;
  }

  return {
    start(msg?: string) {
      if (msg) text = msg;
      isSpinning = true;
      render();
      timer = setInterval(render, interval);
      return this;
    },
    stop(finalText?: string) {
      if (timer) clearInterval(timer);
      timer = null;
      isSpinning = false;
      stream.write("\r\x1b[K");
      if (finalText) stream.write(`${finalText}\n`);
      return this;
    },
    succeed(msg?: string) {
      return this.stop(`${green("✔")} ${msg ?? text}`);
    },
    fail(msg?: string) {
      return this.stop(`${red("✖")} ${msg ?? text}`);
    },
    warn(msg?: string) {
      return this.stop(`${yellow("⚠")} ${msg ?? text}`);
    },
    info(msg?: string) {
      return this.stop(`${cyan("ℹ")} ${msg ?? text}`);
    },
    update(msg: string) {
      text = msg;
      return this;
    },
    get isActive() {
      return isSpinning;
    },
  };
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
  const {
    total,
    width = 30,
    complete = "█",
    incomplete = "░",
    format = ":bar :percent :current/:total",
    color = green,
    stream = process.stderr,
  } = opts;

  let current = 0;

  function render() {
    const ratio = Math.min(current / total, 1);
    const filled = Math.round(width * ratio);
    const empty = width - filled;
    const bar = color(complete.repeat(filled)) + dim(incomplete.repeat(empty));
    const percent = `${Math.round(ratio * 100)}%`;

    const output = format
      .replace(":bar", bar)
      .replace(":percent", percent)
      .replace(":current", String(current))
      .replace(":total", String(total));

    stream.write(`\r\x1b[K${output}`);
  }

  return {
    tick(amount = 1) {
      current = Math.min(current + amount, total);
      render();
      if (current >= total) stream.write("\n");
      return this;
    },
    update(value: number) {
      current = Math.min(value, total);
      render();
      if (current >= total) stream.write("\n");
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
    const remaining = width - labelStr.length;
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
  info: (msg: string) => process.stdout.write(`${cyan("ℹ")} ${msg}\n`),
  success: (msg: string) => process.stdout.write(`${green("✔")} ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`${yellow("⚠")} ${msg}\n`),
  error: (msg: string) => process.stderr.write(`${red("✖")} ${msg}\n`),
  debug: (msg: string) => {
    if (process.env.DEBUG) process.stderr.write(`${dim("●")} ${dim(msg)}\n`);
  },
  step: (n: number, total: number, msg: string) =>
    process.stdout.write(`${dim(`[${n}/${total}]`)} ${msg}\n`),
};
