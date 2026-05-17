/**
 * clif/prompts — Interactive terminal prompts.
 *
 * Zero-dependency, raw stdin-based prompts.
 * Each prompt is a standalone async function.
 *
 * Errors:
 *  - User cancellation (Ctrl+C) rejects with a `PromptError` whose `code` is `"cancelled"`.
 *  - Running a prompt without a TTY rejects with code `"not-a-tty"`.
 *  - Validation errors stay inside the prompt; the user is re-prompted.
 */

import { bold, cyan, dim, green, red } from "../core/colors.js";

// ── Error type ──────────────────────────────────────────────────────────────

export type PromptErrorCode = "cancelled" | "not-a-tty";

export class PromptError extends Error {
  readonly code: PromptErrorCode;
  constructor(code: PromptErrorCode, message?: string) {
    super(message ?? code);
    this.name = "PromptError";
    this.code = code;
  }
}

// ── Injectable stdio (used by tests) ────────────────────────────────────────

interface StdinLike extends NodeJS.EventEmitter {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?(b: boolean): unknown;
  resume?(): unknown;
  pause?(): unknown;
}

interface StdoutLike {
  write(s: string): unknown;
  isTTY?: boolean;
}

interface Stdio {
  stdin: StdinLike;
  stderr: StdoutLike;
}

let stdio: Stdio | null = null;

function getStdio(): Stdio {
  return stdio ?? { stdin: process.stdin, stderr: process.stderr };
}

/** Test-only escape hatch. Not part of the public API. */
export const __testing = {
  setStdio(s: Stdio): void {
    stdio = s;
  },
  resetStdio(): void {
    stdio = null;
  },
};

function requireTTY(): void {
  const { stdin } = getStdio();
  if (!stdin.isTTY) {
    throw new PromptError(
      "not-a-tty",
      "Cannot run interactive prompt: stdin is not a TTY. Pipe input or run in an interactive terminal.",
    );
  }
}

// ── Shared utilities ────────────────────────────────────────────────────────

function write(text: string): void {
  getStdio().stderr.write(text);
}

function clearLine(): void {
  write("\r\x1b[K");
}

/**
 * Enter raw-input mode and return a teardown closure that restores the prior
 * mode. Centralises the save / set / restore dance used by every interactive
 * prompt so callers can't accidentally leave the terminal in raw mode.
 */
function enterRawMode(stdin: StdinLike): () => void {
  const wasRaw = stdin.isRaw ?? false;
  stdin.setRawMode?.(true);
  stdin.resume?.();
  return () => {
    stdin.setRawMode?.(wasRaw);
    stdin.pause?.();
  };
}

/** Format the interactive question header shown to the user. */
function formatQuestion(message: string): string {
  return `${cyan("?")} ${bold(message)}`;
}

/** Format the final "answered" summary line. Includes a trailing newline. */
function formatAnswer(message: string, display: string): string {
  return `${green("✔")} ${bold(message)} ${dim("·")} ${display}\n`;
}

/** Move the cursor up one row and clear it — used to overwrite a question
 * prompt with its answered-summary on completion. */
const CLEAR_PREV_LINE = "\x1b[1A\r\x1b[K";

/**
 * Read a single line of input character-by-character via raw stdin.
 * Returns the user's input on Enter, or rejects with PromptError on Ctrl+C.
 *
 * Used by `text` and `confirm` instead of node:readline so prompts behave
 * uniformly under raw mode (and so the test stdio can drive them).
 */
function readLineRaw(): Promise<string> {
  const { stdin } = getStdio();
  return new Promise<string>((resolve, reject) => {
    const restoreMode = enterRawMode(stdin);
    let buffer = "";

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.off("line", onLine);
      restoreMode();
    };

    // Test stdio emits "line" directly; honor it as a fast path.
    const onLine = (line: string) => {
      cleanup();
      resolve(line);
    };

    const onData = (data: Buffer | string) => {
      const chunk = typeof data === "string" ? data : data.toString();
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]!;
        if (ch === "\r" || ch === "\n") {
          cleanup();
          write("\n");
          resolve(buffer);
          return;
        }
        if (ch === "\x03") {
          cleanup();
          write("\n");
          reject(new PromptError("cancelled"));
          return;
        }
        if (ch === "\x7f" || ch === "\b") {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            write("\b \b");
          }
          continue;
        }
        if (ch.charCodeAt(0) < 0x20) continue;
        buffer += ch;
        write(ch);
      }
    };

    stdin.on("data", onData);
    stdin.on("line", onLine);
  });
}

// ── Text Input ──────────────────────────────────────────────────────────────

export interface TextOptions {
  message: string;
  default?: string;
  placeholder?: string;
  validate?: (value: string) => string | true;
  required?: boolean;
}

export async function text(opts: TextOptions): Promise<string> {
  const { message, placeholder, validate, required = false } = opts;
  const defaultHint = opts.default ? dim(` (${opts.default})`) : "";
  const placeholderHint = placeholder ? dim(placeholder) : "";

  write(`${formatQuestion(message)}${defaultHint} ${placeholderHint}\n`);

  while (true) {
    write(`${cyan("❯")} `);
    const input = await readLineRaw();
    const value = input.trim() || opts.default || "";

    if (required && !value) {
      write(`${red("!")} This field is required\n`);
      continue;
    }

    if (validate) {
      const result = validate(value);
      if (result !== true) {
        write(`${red("!")} ${result}\n`);
        continue;
      }
    }

    write(`${CLEAR_PREV_LINE}${formatAnswer(message, value)}`);
    return value;
  }
}

// ── Password ────────────────────────────────────────────────────────────────

export interface PasswordOptions {
  message: string;
  mask?: string;
  validate?: (value: string) => string | true;
}

export async function password(opts: PasswordOptions): Promise<string> {
  requireTTY();
  const { message, mask = "●", validate } = opts;
  const { stdin } = getStdio();

  return new Promise<string>((resolve, reject) => {
    write(`${formatQuestion(message)}\n`);
    write(`${cyan("❯")} `);

    const restoreMode = enterRawMode(stdin);

    let value = "";

    const cleanup = () => {
      stdin.off("data", onData);
      restoreMode();
    };

    const onData = (data: Buffer | string) => {
      const chunk = typeof data === "string" ? data : data.toString();

      // Process the chunk character-by-character so paste works correctly.
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]!;

        if (ch === "\r" || ch === "\n") {
          if (validate) {
            const result = validate(value);
            if (result !== true) {
              write(`\n${red("!")} ${result}\n`);
              write(`${cyan("❯")} `);
              value = "";
              return;
            }
          }
          cleanup();
          write(`\n${CLEAR_PREV_LINE}${formatAnswer(message, mask.repeat(value.length))}`);
          resolve(value);
          return;
        }

        if (ch === "\x7f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            clearLine();
            write(`${cyan("❯")} ${mask.repeat(value.length)}`);
          }
          continue;
        }

        if (ch === "\x03") {
          cleanup();
          write("\n");
          reject(new PromptError("cancelled"));
          return;
        }

        // Regular printable character (ignore other control chars).
        if (ch.charCodeAt(0) < 0x20) continue;
        value += ch;
        write(mask);
      }
    };

    stdin.on("data", onData);
  });
}

// ── Confirm ─────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  message: string;
  default?: boolean;
}

export async function confirm(opts: ConfirmOptions): Promise<boolean> {
  const { message } = opts;
  const defaultVal = opts.default ?? false;
  const hint = defaultVal ? dim("(Y/n)") : dim("(y/N)");

  write(`${formatQuestion(message)} ${hint} `);
  const input = await readLineRaw();
  const val = input.trim().toLowerCase();
  const result = val === "" ? defaultVal : val === "y" || val === "yes";
  const display = result ? green("Yes") : red("No");
  clearLine();
  write(`${CLEAR_PREV_LINE}${formatAnswer(message, display)}`);
  return result;
}

// ── Select / MultiSelect shared rendering ───────────────────────────────────

export interface SelectOption<T = string> {
  label: string;
  value: T;
  hint?: string;
  disabled?: boolean;
}

export interface SelectOptions<T = string> {
  message: string;
  options: SelectOption<T>[];
  default?: T;
}

interface MenuKey {
  up: boolean;
  down: boolean;
  enter: boolean;
  space: boolean;
  toggleAll: boolean;
  ctrlC: boolean;
}

function decodeKey(s: string): MenuKey {
  return {
    up: s === "\x1b[A" || s === "k",
    down: s === "\x1b[B" || s === "j",
    enter: s === "\r" || s === "\n",
    space: s === " ",
    toggleAll: s === "a",
    ctrlC: s === "\x03",
  };
}

function renderMenu(
  message: string,
  options: SelectOption<unknown>[],
  cursor: number,
  selected: Set<number> | null,
  errorMessage: string | null,
  hint: string | null,
): string {
  const lines: string[] = [];
  lines.push(hint ? `${formatQuestion(message)} ${dim(hint)}` : formatQuestion(message));
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const active = i === cursor;
    const prefix = active ? cyan("❯") : " ";
    const checkbox = selected ? (selected.has(i) ? `${green("◉")} ` : `${dim("○")} `) : "";
    const label = opt.disabled ? dim(opt.label) : active ? cyan(opt.label) : opt.label;
    const hintStr = opt.hint ? dim(` (${opt.hint})`) : "";
    const disabled = opt.disabled ? dim(" (disabled)") : "";
    lines.push(`${prefix} ${checkbox}${label}${hintStr}${disabled}`);
  }
  if (selected) lines.push(dim(`  ${selected.size} selected`));
  if (errorMessage) lines.push(red(`  ${errorMessage}`));
  return lines.join("\n");
}

/**
 * A stateful painter for the interactive menu used by `select` and
 * `multiselect`. It tracks how many lines were last emitted so each repaint
 * can rewind the cursor and overwrite cleanly, and exposes `replaceWith` to
 * swap the menu for a final one-line summary.
 */
function createMenuPainter() {
  let firstPaint = true;
  let lastLineCount = 0;

  return {
    paint(body: string): void {
      const lines = body.split("\n");
      if (!firstPaint) write(`\x1b[${lastLineCount}A`);
      firstPaint = false;
      for (const line of lines) write(`\r\x1b[K${line}\n`);
      lastLineCount = lines.length;
    },
    /** Clear the prior menu and emit a single summary line in its place. */
    replaceWith(summary: string): void {
      write(`\x1b[${lastLineCount}A`);
      for (let i = 0; i < lastLineCount; i++) write("\r\x1b[K\n");
      write(`\x1b[${lastLineCount}A`);
      write(summary);
    },
  };
}

/**
 * Step the cursor in `direction` (+1 / -1), skipping disabled options and
 * wrapping at the ends. Returns the new index. Callers are expected to have
 * an initial cursor that is already on an enabled option.
 */
function moveCursor(options: SelectOption<unknown>[], cursor: number, direction: 1 | -1): number {
  const n = options.length;
  let next = cursor;
  do {
    next = (next + direction + n) % n;
  } while (options[next]?.disabled && next !== cursor);
  return next;
}

export async function select<T = string>(opts: SelectOptions<T>): Promise<T> {
  requireTTY();
  const { message, options } = opts;
  if (options.length === 0) throw new Error("select: options must not be empty");
  let cursor = options.findIndex((o) => o.value === opts.default);
  if (cursor === -1) cursor = 0;
  while (options[cursor]?.disabled && cursor < options.length - 1) cursor++;

  const { stdin } = getStdio();
  const erasedOptions = options as SelectOption<unknown>[];

  return new Promise<T>((resolve, reject) => {
    const restoreMode = enterRawMode(stdin);
    const painter = createMenuPainter();

    const repaint = () => {
      painter.paint(renderMenu(message, erasedOptions, cursor, null, null, null));
    };

    repaint();

    const cleanup = () => {
      stdin.off("data", onData);
      restoreMode();
    };

    const onData = (data: Buffer | string) => {
      const s = typeof data === "string" ? data : data.toString();
      const k = decodeKey(s);

      if (k.up) {
        cursor = moveCursor(erasedOptions, cursor, -1);
        repaint();
      } else if (k.down) {
        cursor = moveCursor(erasedOptions, cursor, 1);
        repaint();
      } else if (k.enter) {
        cleanup();
        painter.replaceWith(formatAnswer(message, options[cursor]!.label));
        resolve(options[cursor]!.value);
      } else if (k.ctrlC) {
        cleanup();
        write("\n");
        reject(new PromptError("cancelled"));
      }
      // Note: space is intentionally NOT handled here. It is the multiselect toggle key;
      // accepting it as confirm in select trains users into the wrong muscle memory.
    };

    stdin.on("data", onData);
  });
}

// ── Multi-Select ────────────────────────────────────────────────────────────

export interface MultiSelectOptions<T = string> {
  message: string;
  options: SelectOption<T>[];
  default?: T[];
  min?: number;
  max?: number;
  required?: boolean;
}

export async function multiselect<T = string>(opts: MultiSelectOptions<T>): Promise<T[]> {
  requireTTY();
  const { message, options, min, max } = opts;
  if (options.length === 0) throw new Error("multiselect: options must not be empty");
  const selected = new Set<number>();
  let cursor = 0;
  let errorMessage: string | null = null;

  if (opts.default) {
    for (let i = 0; i < options.length; i++) {
      if (opts.default.includes(options[i]!.value)) selected.add(i);
    }
  }

  const { stdin } = getStdio();
  const erasedOptions = options as SelectOption<unknown>[];

  return new Promise<T[]>((resolve, reject) => {
    const restoreMode = enterRawMode(stdin);
    const painter = createMenuPainter();

    const repaint = () => {
      painter.paint(
        renderMenu(
          message,
          erasedOptions,
          cursor,
          selected,
          errorMessage,
          "(space to toggle, a to toggle all, enter to confirm)",
        ),
      );
    };

    repaint();

    const cleanup = () => {
      stdin.off("data", onData);
      restoreMode();
    };

    const onData = (data: Buffer | string) => {
      const s = typeof data === "string" ? data : data.toString();
      const k = decodeKey(s);

      if (k.up) {
        cursor = moveCursor(erasedOptions, cursor, -1);
        errorMessage = null;
        repaint();
      } else if (k.down) {
        cursor = moveCursor(erasedOptions, cursor, 1);
        errorMessage = null;
        repaint();
      } else if (k.space) {
        if (!options[cursor]?.disabled) {
          if (selected.has(cursor)) {
            selected.delete(cursor);
          } else if (!max || selected.size < max) {
            selected.add(cursor);
          } else {
            errorMessage = `Maximum ${max} selections allowed`;
          }
        }
        repaint();
      } else if (k.toggleAll) {
        const allEnabled = options.filter((o) => !o.disabled);
        if (selected.size === allEnabled.length) {
          selected.clear();
        } else {
          for (let i = 0; i < options.length; i++) {
            if (!options[i]?.disabled) selected.add(i);
          }
        }
        errorMessage = null;
        repaint();
      } else if (k.enter) {
        if (min !== undefined && selected.size < min) {
          errorMessage = `Select at least ${min}`;
          repaint();
          return;
        }
        if (opts.required && selected.size === 0) {
          errorMessage = "Select at least 1";
          repaint();
          return;
        }
        cleanup();
        const labels = [...selected].map((i) => options[i]!.label).join(", ");
        painter.replaceWith(formatAnswer(message, labels));
        resolve([...selected].map((i) => options[i]!.value));
      } else if (k.ctrlC) {
        cleanup();
        write("\n");
        reject(new PromptError("cancelled"));
      }
    };

    stdin.on("data", onData);
  });
}

// ── Number Input ────────────────────────────────────────────────────────────

export interface NumberOptions {
  message: string;
  default?: number;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

export async function number(opts: NumberOptions): Promise<number> {
  const result = await text({
    message: opts.message,
    default: opts.default !== undefined ? String(opts.default) : undefined,
    required: opts.required,
    validate: (val) => {
      const n = Number(val);
      if (!Number.isFinite(n)) return "Please enter a valid number";
      if (opts.min !== undefined && n < opts.min) return `Minimum value is ${opts.min}`;
      if (opts.max !== undefined && n > opts.max) return `Maximum value is ${opts.max}`;
      if (opts.step !== undefined && opts.step > 0) {
        // Anchor the step grid to `min` if provided so e.g. min:1 step:2 accepts 1,3,5…
        const base = opts.min ?? 0;
        const offset = n - base;
        // Tolerate floating-point round-off (0.1 + 0.2 etc).
        const remainder = offset - Math.round(offset / opts.step) * opts.step;
        if (Math.abs(remainder) > 1e-9) {
          return `Value must be a multiple of ${opts.step}${
            opts.min !== undefined ? ` from ${opts.min}` : ""
          }`;
        }
      }
      return true;
    },
  });
  return Number(result);
}

// ── Group prompts ───────────────────────────────────────────────────────────

type PromptFn<T> = () => Promise<T>;

export async function group<T extends Record<string, unknown>>(
  prompts: { [K in keyof T]: PromptFn<T[K]> },
): Promise<T> {
  const result = {} as T;
  for (const key of Object.keys(prompts) as (keyof T)[]) {
    result[key] = await prompts[key]();
  }
  return result;
}
