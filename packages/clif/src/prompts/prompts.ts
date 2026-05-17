/**
 * clif/prompts — Interactive terminal prompts.
 *
 * Zero-dependency, raw stdin-based prompts.
 * Each prompt is a standalone async function.
 */

import * as readline from "node:readline";
import { bold, cyan, dim, green, red } from "../core/colors.js";

// ── Shared utilities ────────────────────────────────────────────────────────

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: true,
  });
}

function write(text: string): void {
  process.stderr.write(text);
}

function clearLine(): void {
  write("\r\x1b[K");
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

  const rl = createInterface();
  const defaultHint = opts.default ? dim(` (${opts.default})`) : "";
  const placeholderHint = placeholder ? dim(placeholder) : "";

  return new Promise<string>((resolve) => {
    write(`${cyan("?")} ${bold(message)}${defaultHint} ${placeholderHint}\n`);
    write(`${cyan("❯")} `);

    rl.on("line", (input) => {
      const value = input.trim() || opts.default || "";

      if (required && !value) {
        clearLine();
        write(`${red("!")} This field is required\n`);
        write(`${cyan("❯")} `);
        return;
      }

      if (validate) {
        const result = validate(value);
        if (result !== true) {
          clearLine();
          write(`${red("!")} ${result}\n`);
          write(`${cyan("❯")} `);
          return;
        }
      }

      rl.close();
      // Move up and rewrite the answer line
      write(`\x1b[1A\r\x1b[K${green("✔")} ${bold(message)} ${dim("·")} ${value}\n`);
      resolve(value);
    });
  });
}

// ── Password ────────────────────────────────────────────────────────────────

export interface PasswordOptions {
  message: string;
  mask?: string;
  validate?: (value: string) => string | true;
}

export async function password(opts: PasswordOptions): Promise<string> {
  const { message, mask = "●", validate } = opts;

  return new Promise<string>((resolve) => {
    write(`${cyan("?")} ${bold(message)}\n`);
    write(`${cyan("❯")} `);

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    let value = "";

    const onData = (data: Buffer) => {
      const char = data.toString();

      if (char === "\r" || char === "\n") {
        stdin.removeListener("data", onData);
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();

        if (validate) {
          const result = validate(value);
          if (result !== true) {
            write(`\n${red("!")} ${result}\n`);
            write(`${cyan("❯")} `);
            value = "";
            stdin.setRawMode(true);
            stdin.resume();
            stdin.on("data", onData);
            return;
          }
        }

        write(
          `\n\x1b[1A\r\x1b[K${green("✔")} ${bold(message)} ${dim("·")} ${mask.repeat(value.length)}\n`,
        );
        resolve(value);
        return;
      }

      if (char === "\x7f" || char === "\b") {
        // Backspace
        if (value.length > 0) {
          value = value.slice(0, -1);
          clearLine();
          write(`${cyan("❯")} ${mask.repeat(value.length)}`);
        }
        return;
      }

      if (char === "\x03") {
        // Ctrl+C
        stdin.removeListener("data", onData);
        stdin.setRawMode(wasRaw ?? false);
        write("\n");
        process.exit(130);
      }

      // Regular character
      value += char;
      write(mask);
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

  const rl = createInterface();

  return new Promise<boolean>((resolve) => {
    write(`${cyan("?")} ${bold(message)} ${hint} `);

    rl.on("line", (input) => {
      rl.close();
      const val = input.trim().toLowerCase();
      const result = val === "" ? defaultVal : val === "y" || val === "yes";
      const display = result ? green("Yes") : red("No");
      clearLine();
      write(`\r${green("✔")} ${bold(message)} ${dim("·")} ${display}\n`);
      resolve(result);
    });
  });
}

// ── Select ──────────────────────────────────────────────────────────────────

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

export async function select<T = string>(opts: SelectOptions<T>): Promise<T> {
  const { message, options } = opts;
  let cursor = options.findIndex((o) => o.value === opts.default);
  if (cursor === -1) cursor = 0;

  // Skip disabled options
  while (options[cursor]?.disabled && cursor < options.length - 1) cursor++;

  return new Promise<T>((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    function render() {
      // Clear previous render
      write(`\x1b[${options.length + 1}A`);
      clearLine();
      write(`${cyan("?")} ${bold(message)}\n`);

      for (let i = 0; i < options.length; i++) {
        clearLine();
        const opt = options[i]!;
        const active = i === cursor;
        const prefix = active ? cyan("❯") : " ";
        const label = opt.disabled ? dim(opt.label) : active ? cyan(opt.label) : opt.label;
        const hint = opt.hint ? dim(` (${opt.hint})`) : "";
        const disabled = opt.disabled ? dim(" (disabled)") : "";
        write(`${prefix} ${label}${hint}${disabled}\n`);
      }
    }

    // Initial render
    write(`${cyan("?")} ${bold(message)}\n`);
    for (let i = 0; i < options.length; i++) {
      const opt = options[i]!;
      const active = i === cursor;
      const prefix = active ? cyan("❯") : " ";
      const label = opt.disabled ? dim(opt.label) : active ? cyan(opt.label) : opt.label;
      const hint = opt.hint ? dim(` (${opt.hint})`) : "";
      const disabled = opt.disabled ? dim(" (disabled)") : "";
      write(`${prefix} ${label}${hint}${disabled}\n`);
    }

    const onData = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x1b[A" || key === "k") {
        // Up
        do {
          cursor = (cursor - 1 + options.length) % options.length;
        } while (options[cursor]?.disabled);
        render();
      } else if (key === "\x1b[B" || key === "j") {
        // Down
        do {
          cursor = (cursor + 1) % options.length;
        } while (options[cursor]?.disabled);
        render();
      } else if (key === "\r" || key === "\n" || key === " ") {
        // Enter / Space
        stdin.removeListener("data", onData);
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        // Clear menu
        write(`\x1b[${options.length + 1}A`);
        for (let i = 0; i <= options.length; i++) {
          clearLine();
          write(i < options.length ? "\n" : "");
        }
        write(`\x1b[${options.length + 1}A`);
        write(`${green("✔")} ${bold(message)} ${dim("·")} ${options[cursor]!.label}\n`);
        resolve(options[cursor]!.value);
      } else if (key === "\x03") {
        stdin.removeListener("data", onData);
        stdin.setRawMode(wasRaw ?? false);
        write("\n");
        process.exit(130);
      }
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
  const { message, options, min, max } = opts;
  const selected = new Set<number>();
  let cursor = 0;

  // Apply defaults
  if (opts.default) {
    for (let i = 0; i < options.length; i++) {
      if (opts.default.includes(options[i]!.value)) selected.add(i);
    }
  }

  return new Promise<T[]>((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    function render() {
      write(`\x1b[${options.length + 2}A`);
      clearLine();
      write(`${cyan("?")} ${bold(message)} ${dim("(space to toggle, enter to confirm)")}\n`);

      for (let i = 0; i < options.length; i++) {
        clearLine();
        const opt = options[i]!;
        const active = i === cursor;
        const isSelected = selected.has(i);
        const prefix = active ? cyan("❯") : " ";
        const checkbox = isSelected ? green("◉") : dim("○");
        const label = opt.disabled ? dim(opt.label) : active ? cyan(opt.label) : opt.label;
        const hint = opt.hint ? dim(` (${opt.hint})`) : "";
        write(`${prefix} ${checkbox} ${label}${hint}\n`);
      }
      clearLine();
      write(dim(`  ${selected.size} selected\n`));
    }

    // Initial render
    write(`${cyan("?")} ${bold(message)} ${dim("(space to toggle, enter to confirm)")}\n`);
    for (let i = 0; i < options.length; i++) {
      const opt = options[i]!;
      const active = i === cursor;
      const isSelected = selected.has(i);
      const prefix = active ? cyan("❯") : " ";
      const checkbox = isSelected ? green("◉") : dim("○");
      const label = active ? cyan(opt.label) : opt.label;
      const hint = opt.hint ? dim(` (${opt.hint})`) : "";
      write(`${prefix} ${checkbox} ${label}${hint}\n`);
    }
    write(dim(`  ${selected.size} selected\n`));

    const onData = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x1b[A" || key === "k") {
        do {
          cursor = (cursor - 1 + options.length) % options.length;
        } while (options[cursor]?.disabled);
        render();
      } else if (key === "\x1b[B" || key === "j") {
        do {
          cursor = (cursor + 1) % options.length;
        } while (options[cursor]?.disabled);
        render();
      } else if (key === " ") {
        if (!options[cursor]?.disabled) {
          if (selected.has(cursor)) {
            selected.delete(cursor);
          } else {
            if (!max || selected.size < max) selected.add(cursor);
          }
        }
        render();
      } else if (key === "a") {
        // Toggle all
        if (selected.size === options.filter((o) => !o.disabled).length) {
          selected.clear();
        } else {
          for (let i = 0; i < options.length; i++) {
            if (!options[i]?.disabled) selected.add(i);
          }
        }
        render();
      } else if (key === "\r" || key === "\n") {
        if (min && selected.size < min) {
          // Don't allow submit
          return;
        }
        stdin.removeListener("data", onData);
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        // Clear
        write(`\x1b[${options.length + 2}A`);
        for (let i = 0; i <= options.length + 1; i++) {
          clearLine();
          write(i < options.length + 1 ? "\n" : "");
        }
        write(`\x1b[${options.length + 2}A`);
        const labels = [...selected].map((i) => options[i]!.label).join(", ");
        write(`${green("✔")} ${bold(message)} ${dim("·")} ${labels}\n`);
        resolve([...selected].map((i) => options[i]!.value));
      } else if (key === "\x03") {
        stdin.removeListener("data", onData);
        stdin.setRawMode(wasRaw ?? false);
        write("\n");
        process.exit(130);
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
      if (Number.isNaN(n)) return "Please enter a valid number";
      if (opts.min !== undefined && n < opts.min) return `Minimum value is ${opts.min}`;
      if (opts.max !== undefined && n > opts.max) return `Maximum value is ${opts.max}`;
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
  const result: Partial<T> = {};
  for (const [key, fn] of Object.entries(prompts)) {
    result[key as keyof T] = await (fn as PromptFn<T[keyof T]>)();
  }
  return result as T;
}
