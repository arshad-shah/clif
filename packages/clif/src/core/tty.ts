/**
 * clif/tty — Shared raw-mode + stdin plumbing.
 *
 * The interactive prompts (`clif/prompts`) and the full-screen TUI runtime
 * (`clif/tui`) both need to flip stdin into raw mode, restore it cleanly, and
 * normalise incoming chunks. Those primitives live here so the save / set /
 * restore dance and the Buffer→string coercion exist in exactly one place
 * rather than being re-typed per consumer.
 */

/** The slice of `process.stdin` interactive readers depend on (test-injectable). */
export interface StdinLike extends NodeJS.EventEmitter {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?(b: boolean): unknown;
  resume?(): unknown;
  pause?(): unknown;
}

/** The slice of `process.stdout` / `process.stderr` writers depend on. */
export interface StdoutLike {
  write(s: string): unknown;
  isTTY?: boolean;
  columns?: number;
  rows?: number;
}

/** Normalise a raw stdin chunk (Buffer or string) to a string. */
export function toChunk(data: Buffer | string): string {
  return typeof data === "string" ? data : data.toString();
}

/**
 * Enter raw-input mode and return a teardown closure that restores the prior
 * mode. Centralises the save / set / restore dance so callers can't
 * accidentally leave the terminal in raw mode.
 */
export function enterRawMode(stdin: StdinLike): () => void {
  const wasRaw = stdin.isRaw ?? false;
  stdin.setRawMode?.(true);
  stdin.resume?.();
  return () => {
    stdin.setRawMode?.(wasRaw);
    stdin.pause?.();
  };
}
