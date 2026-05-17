/**
 * clif/utils — Shared utility functions.
 */

/** Check if stdout is a TTY */
export function isTTY(): boolean {
  return typeof process !== "undefined" && !!process.stdout?.isTTY;
}

/** Get terminal width, default 80 */
export function terminalWidth(): number {
  return process.stdout?.columns ?? 80;
}

/** Truncate a string to a max length with ellipsis */
export function truncate(text: string, max: number, suffix = "…"): string {
  if (text.length <= max) return text;
  return text.slice(0, max - suffix.length) + suffix;
}

/** Wrap text to a given width */
export function wordWrap(text: string, width: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
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

/** Format bytes to human-readable */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

/** Format milliseconds to human-readable */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}
