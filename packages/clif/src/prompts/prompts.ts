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

import { CLEAR_LINE, CLEAR_PREV_LINE, cursorUp } from "../core/ansi.js";
import { bold, cyan, dim, green, red } from "../core/colors.js";
import { statusIcon, symbols } from "../core/symbols.js";

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
  write(CLEAR_LINE);
}

/** Normalise a raw stdin chunk (Buffer or string) to a string. */
function toChunk(data: Buffer | string): string {
  return typeof data === "string" ? data : data.toString();
}

/** A red validation-error line (no trailing newline), shown when input fails. */
function errorLine(message: string): string {
  return `${red("!")} ${message}`;
}

/**
 * Raw input bytes the prompts decode. Centralised so the control-character
 * literals aren't re-typed across the line reader, password reader, and menu
 * key decoder.
 */
const KEY = {
  cr: "\r",
  lf: "\n",
  ctrlC: "\x03",
  del: "\x7f",
  backspace: "\b",
  arrowUp: "\x1b[A",
  arrowDown: "\x1b[B",
} as const;

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
  return `${cyan(symbols.question)} ${bold(message)}`;
}

/** Format the final "answered" summary line. Includes a trailing newline. */
function formatAnswer(message: string, display: string): string {
  return `${statusIcon("success")} ${bold(message)} ${dim("·")} ${display}\n`;
}

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
      const chunk = toChunk(data);
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]!;
        if (ch === KEY.cr || ch === KEY.lf) {
          cleanup();
          write("\n");
          resolve(buffer);
          return;
        }
        if (ch === KEY.ctrlC) {
          cleanup();
          write("\n");
          reject(new PromptError("cancelled"));
          return;
        }
        if (ch === KEY.del || ch === KEY.backspace) {
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
    write(`${cyan(symbols.pointer)} `);
    const input = await readLineRaw();
    const value = input.trim() || opts.default || "";

    if (required && !value) {
      write(`${errorLine("This field is required")}\n`);
      continue;
    }

    if (validate) {
      const result = validate(value);
      if (result !== true) {
        write(`${errorLine(result)}\n`);
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
  const { message, mask = symbols.bullet, validate } = opts;
  const { stdin } = getStdio();

  return new Promise<string>((resolve, reject) => {
    write(`${formatQuestion(message)}\n`);
    write(`${cyan(symbols.pointer)} `);

    const restoreMode = enterRawMode(stdin);

    let value = "";

    const cleanup = () => {
      stdin.off("data", onData);
      restoreMode();
    };

    const onData = (data: Buffer | string) => {
      const chunk = toChunk(data);

      // Process the chunk character-by-character so paste works correctly.
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]!;

        if (ch === KEY.cr || ch === KEY.lf) {
          if (validate) {
            const result = validate(value);
            if (result !== true) {
              write(`\n${errorLine(result)}\n`);
              write(`${cyan(symbols.pointer)} `);
              value = "";
              return;
            }
          }
          cleanup();
          write(`\n${CLEAR_PREV_LINE}${formatAnswer(message, mask.repeat(value.length))}`);
          resolve(value);
          return;
        }

        if (ch === KEY.del || ch === KEY.backspace) {
          if (value.length > 0) {
            value = value.slice(0, -1);
            clearLine();
            write(`${cyan(symbols.pointer)} ${mask.repeat(value.length)}`);
          }
          continue;
        }

        if (ch === KEY.ctrlC) {
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
  const { stdin } = getStdio();

  write(`${formatQuestion(message)} ${hint} `);

  return new Promise<boolean>((resolve, reject) => {
    const restoreMode = enterRawMode(stdin);

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.off("line", onLine);
      restoreMode();
    };

    const finish = (result: boolean) => {
      cleanup();
      const display = result ? green("Yes") : red("No");
      write("\n");
      clearLine();
      write(`${CLEAR_PREV_LINE}${formatAnswer(message, display)}`);
      resolve(result);
    };

    // Single keypress: y/n decide immediately, Enter takes the default.
    const onData = (data: Buffer | string) => {
      const chunk = toChunk(data);
      for (const ch of chunk) {
        if (ch === "y" || ch === "Y") return finish(true);
        if (ch === "n" || ch === "N") return finish(false);
        if (ch === KEY.cr || ch === KEY.lf) return finish(defaultVal);
        if (ch === KEY.ctrlC) {
          cleanup();
          write("\n");
          reject(new PromptError("cancelled"));
          return;
        }
        // ignore any other key and keep waiting
      }
    };

    // Line-oriented fast path (piped input / test stdio): accept y/yes.
    const onLine = (line: string) => {
      const val = line.trim().toLowerCase();
      finish(val === "" ? defaultVal : val === "y" || val === "yes");
    };

    stdin.on("data", onData);
    stdin.on("line", onLine);
  });
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
    up: s === KEY.arrowUp || s === "k",
    down: s === KEY.arrowDown || s === "j",
    enter: s === KEY.cr || s === KEY.lf,
    space: s === " ",
    toggleAll: s === "a",
    ctrlC: s === KEY.ctrlC,
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
    const prefix = active ? cyan(symbols.pointer) : " ";
    const checkbox = selected
      ? selected.has(i)
        ? `${green(symbols.radioOn)} `
        : `${dim(symbols.radioOff)} `
      : "";
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
      if (!firstPaint) write(cursorUp(lastLineCount));
      firstPaint = false;
      for (const line of lines) write(`${CLEAR_LINE}${line}\n`);
      lastLineCount = lines.length;
    },
    /** Clear the prior menu and emit a single summary line in its place. */
    replaceWith(summary: string): void {
      write(cursorUp(lastLineCount));
      for (let i = 0; i < lastLineCount; i++) write(`${CLEAR_LINE}\n`);
      write(cursorUp(lastLineCount));
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

/**
 * Shared interactive menu driver for `select` and `multiselect`. Owns the
 * raw-mode lifecycle, cursor movement, repaint, and key dispatch; the `multi`
 * flag turns on the selection set, space / `a` toggles, and min/max/required
 * validation. Resolves with the chosen option indices.
 */
function runMenu<T>(config: {
  message: string;
  options: SelectOption<T>[];
  multi: boolean;
  default?: T | T[];
  min?: number;
  max?: number;
  required?: boolean;
  hint: string | null;
}): Promise<number[]> {
  requireTTY();
  const kind = config.multi ? "multiselect" : "select";
  const { options } = config;
  if (options.length === 0) throw new Error(`${kind}: options must not be empty`);

  const selected = new Set<number>();
  let cursor: number;
  if (config.multi) {
    const defaults = (config.default as T[] | undefined) ?? [];
    for (let i = 0; i < options.length; i++) {
      if (defaults.includes(options[i]!.value)) selected.add(i);
    }
    cursor = 0;
  } else {
    cursor = options.findIndex((o) => o.value === config.default);
    if (cursor === -1) cursor = 0;
    while (options[cursor]?.disabled && cursor < options.length - 1) cursor++;
  }

  let errorMessage: string | null = null;
  const { stdin } = getStdio();
  const erased = options as SelectOption<unknown>[];

  return new Promise<number[]>((resolve, reject) => {
    const restoreMode = enterRawMode(stdin);
    const painter = createMenuPainter();
    const repaint = () => {
      painter.paint(
        renderMenu(
          config.message,
          erased,
          cursor,
          config.multi ? selected : null,
          errorMessage,
          config.hint,
        ),
      );
    };
    repaint();

    const cleanup = () => {
      stdin.off("data", onData);
      restoreMode();
    };

    const confirmSelection = () => {
      if (config.multi) {
        if (config.min !== undefined && selected.size < config.min) {
          errorMessage = `Select at least ${config.min}`;
          repaint();
          return;
        }
        if (config.required && selected.size === 0) {
          errorMessage = "Select at least 1";
          repaint();
          return;
        }
        cleanup();
        const labels = [...selected].map((i) => options[i]!.label).join(", ");
        painter.replaceWith(formatAnswer(config.message, labels));
        resolve([...selected]);
      } else {
        cleanup();
        painter.replaceWith(formatAnswer(config.message, options[cursor]!.label));
        resolve([cursor]);
      }
    };

    const onData = (data: Buffer | string) => {
      const k = decodeKey(toChunk(data));

      if (k.up) {
        cursor = moveCursor(erased, cursor, -1);
        errorMessage = null;
        repaint();
      } else if (k.down) {
        cursor = moveCursor(erased, cursor, 1);
        errorMessage = null;
        repaint();
      } else if (k.ctrlC) {
        cleanup();
        write("\n");
        reject(new PromptError("cancelled"));
      } else if (config.multi && k.space) {
        if (!options[cursor]?.disabled) {
          if (selected.has(cursor)) {
            selected.delete(cursor);
          } else if (!config.max || selected.size < config.max) {
            selected.add(cursor);
          } else {
            errorMessage = `Maximum ${config.max} selections allowed`;
          }
        }
        repaint();
      } else if (config.multi && k.toggleAll) {
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
        confirmSelection();
      }
      // For select, space is intentionally ignored — it is the multiselect
      // toggle key, and accepting it as confirm here trains the wrong muscle
      // memory.
    };

    stdin.on("data", onData);
  });
}

export async function select<T = string>(opts: SelectOptions<T>): Promise<T> {
  const [index] = await runMenu<T>({
    message: opts.message,
    options: opts.options,
    multi: false,
    default: opts.default,
    hint: null,
  });
  return opts.options[index!]!.value;
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
  const indices = await runMenu<T>({
    message: opts.message,
    options: opts.options,
    multi: true,
    default: opts.default,
    min: opts.min,
    max: opts.max,
    required: opts.required,
    hint: "(space to toggle, a to toggle all, enter to confirm)",
  });
  return indices.map((i) => opts.options[i]!.value);
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
  const { message, min, max, step } = opts;
  const { stdin } = getStdio();
  // Anchor the step grid to `min` if provided so e.g. min:1 step:2 accepts 1,3,5…
  const base = min ?? 0;
  const stepBy = step !== undefined && step > 0 ? step : 1;

  function validate(n: number): string | true {
    if (!Number.isFinite(n)) return "Please enter a valid number";
    if (min !== undefined && n < min) return `Minimum value is ${min}`;
    if (max !== undefined && n > max) return `Maximum value is ${max}`;
    if (step !== undefined && step > 0) {
      const offset = n - base;
      // Tolerate floating-point round-off (0.1 + 0.2 etc).
      const remainder = offset - Math.round(offset / step) * step;
      if (Math.abs(remainder) > 1e-9) {
        return `Value must be a multiple of ${step}${min !== undefined ? ` from ${min}` : ""}`;
      }
    }
    return true;
  }

  function clamp(n: number): number {
    let v = n;
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  }

  const defaultHint = opts.default !== undefined ? dim(` (${opts.default})`) : "";
  const stepHint = step !== undefined ? dim(" (↑/↓ to step)") : "";
  write(`${formatQuestion(message)}${defaultHint}${stepHint}\n`);

  let buffer = opts.default !== undefined ? String(opts.default) : "";

  return new Promise<number>((resolve, reject) => {
    const restoreMode = enterRawMode(stdin);

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.off("line", onLine);
      restoreMode();
    };

    const renderInput = () => {
      clearLine();
      write(`${cyan(symbols.pointer)} ${buffer}`);
    };

    const settle = (n: number) => {
      cleanup();
      write(`\n${CLEAR_PREV_LINE}${formatAnswer(message, String(n))}`);
      resolve(n);
    };

    // Validate `raw`; on success resolve, otherwise show the error and re-prompt.
    const submit = (raw: string): void => {
      const result = raw.trim() === "" ? validate(Number.NaN) : validate(Number(raw));
      if (result !== true) {
        write(`\n${errorLine(result)}\n`);
        buffer = "";
        renderInput();
        return;
      }
      settle(Number(raw));
    };

    const stepValue = (dir: 1 | -1): void => {
      const current = buffer.trim() === "" ? base : Number(buffer);
      const from = Number.isFinite(current) ? current : base;
      buffer = String(clamp(from + dir * stepBy));
      renderInput();
    };

    const onData = (data: Buffer | string) => {
      const chunk = toChunk(data);
      if (chunk === KEY.arrowUp) return stepValue(1);
      if (chunk === KEY.arrowDown) return stepValue(-1);
      for (const ch of chunk) {
        if (ch === KEY.cr || ch === KEY.lf) return submit(buffer);
        if (ch === KEY.ctrlC) {
          cleanup();
          write("\n");
          reject(new PromptError("cancelled"));
          return;
        }
        if (ch === KEY.del || ch === KEY.backspace) {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            renderInput();
          }
          continue;
        }
        // Accept the characters that can form a number literal.
        if (/[0-9.eE+-]/.test(ch)) {
          buffer += ch;
          renderInput();
        }
      }
    };

    // Line-oriented fast path (piped input / test stdio).
    const onLine = (line: string) => submit(line);

    renderInput();
    stdin.on("data", onData);
    stdin.on("line", onLine);
  });
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
