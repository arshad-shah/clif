/**
 * clif/utils — Shared utility functions.
 */

import { makeAnsiRegex, visibleLength } from "../core/colors.js";

/** Check if stdout is a TTY */
export function isTTY(): boolean {
  return typeof process !== "undefined" && !!process.stdout?.isTTY;
}

/** Get terminal width, default 80 */
export function terminalWidth(): number {
  return process.stdout?.columns ?? 80;
}

/** Truncate a string to a max VISIBLE width with ellipsis (ANSI-aware). */
export function truncate(text: string, max: number, suffix = "…"): string {
  if (visibleLength(text) <= max) return text;
  const limit = Math.max(0, max - suffix.length);
  const ansi = makeAnsiRegex();
  let visible = 0;
  let out = "";
  let i = 0;
  while (i < text.length && visible < limit) {
    ansi.lastIndex = i;
    const m = ansi.exec(text);
    if (m && m.index === i) {
      out += m[0];
      i = m.index + m[0].length;
      continue;
    }
    out += text[i];
    visible++;
    i++;
  }
  // Append any remaining trailing ANSI close codes so styling terminates cleanly.
  ansi.lastIndex = i;
  let m: RegExpExecArray | null = ansi.exec(text);
  while (m) {
    out += m[0];
    m = ansi.exec(text);
  }
  return out + suffix;
}

/**
 * Wrap text to a given VISIBLE width, ignoring ANSI escape codes.
 *
 * Existing newlines are honored: each input line is wrapped independently and
 * blank lines (paragraph breaks) are preserved. This prevents a `"\n"` from
 * being swallowed into a word and counted as a visible column.
 */
export function wordWrap(text: string, width: number): string {
  if (text.length === 0) return "";
  return text
    .split("\n")
    .map((line) => wrapLine(line, width))
    .join("\n");
}

/** Wrap a single newline-free line to `width` visible columns. */
function wrapLine(line: string, width: number): string {
  if (line === "") return "";
  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";
  let currentVisible = 0;

  for (const word of words) {
    const wv = visibleLength(word);
    const sep = current ? 1 : 0;
    if (currentVisible + wv + sep > width) {
      if (current) lines.push(current);
      current = word;
      currentVisible = wv;
    } else {
      current = current ? `${current} ${word}` : word;
      currentVisible += wv + sep;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}

/** Indent every line of a string */
export function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

/** Dedent a template literal */
export function dedent(str: string): string {
  const lines = str.split("\n");
  // Remove leading empty line
  if (lines[0]?.trim() === "") lines.shift();
  // Remove trailing empty line
  if (lines.at(-1)?.trim() === "") lines.pop();

  const minIndent = lines
    .filter((line) => line.trim().length > 0)
    .reduce((min, line) => {
      const match = line.match(/^(\s*)/);
      return Math.min(min, match ? match[1]!.length : 0);
    }, Number.POSITIVE_INFINITY);

  if (minIndent === Number.POSITIVE_INFINITY) return str;
  return lines.map((line) => line.slice(minIndent)).join("\n");
}

/** Format bytes to human-readable. Accepts negatives and renders with a leading sign. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return String(bytes);
  const negative = bytes < 0;
  let size = Math.abs(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  const sign = negative ? "-" : "";
  return `${sign}${size.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

/** Format milliseconds to human-readable */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return String(ms);
  if (ms < 1000) return `${ms}ms`;
  // Sub-minute durations show one decimal of seconds — but guard the rounding
  // boundary so e.g. 59_999ms rolls up to "1m 0s" rather than the misleading
  // "60.0s".
  if (ms < 60_000 && (ms / 1000).toFixed(1) !== "60.0") {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  // Round to whole seconds first, then carry into minutes/hours. Computing the
  // components independently (the old approach) let a rounded-up seconds value
  // surface as the impossible "Xm 60s".
  const totalSecs = Math.round(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
}
