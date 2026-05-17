/**
 * clif/colors — Zero-dependency ANSI color toolkit.
 *
 * Respects NO_COLOR (https://no-color.org), FORCE_COLOR, and pipe detection.
 * Each formatter is a pure function: `red("hello")` → `"\x1b[31mhello\x1b[39m"`.
 * Formatters compose via nesting: `bold(red("err"))`.
 */

// ── Detect color support ────────────────────────────────────────────────────

const env = typeof process !== "undefined" ? process.env : {};
const argv = typeof process !== "undefined" ? process.argv : [];

function detectColorLevel(): 0 | 1 | 2 | 3 {
  if ("NO_COLOR" in env || argv.includes("--no-color")) return 0;
  if ("FORCE_COLOR" in env || argv.includes("--color")) {
    const fc = env.FORCE_COLOR;
    if (fc === "0") return 0;
    if (fc === "2") return 2;
    if (fc === "3") return 3;
    return 1;
  }
  if (typeof process !== "undefined" && process.stdout && !process.stdout.isTTY) return 0;
  if (env.TERM === "dumb") return 0;
  if (env.CI) return 1;
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit") return 3;
  if (env.TERM_PROGRAM === "iTerm.app" || env.TERM_PROGRAM === "Hyper") return 3;
  if (env.TERM?.includes("256color")) return 2;
  if (env.TERM?.includes("color") || env.TERM?.includes("xterm")) return 1;
  return 1;
}

let _level = detectColorLevel();

/** Get / set the color level. 0 = none, 1 = basic, 2 = 256, 3 = truecolor */
export function colorLevel(level?: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  if (level !== undefined) _level = level;
  return _level;
}

export function isColorSupported(): boolean {
  return _level > 0;
}

// ── Formatter factory ───────────────────────────────────────────────────────

type Formatter = (text: string) => string;

function fmt(open: string, close: string): Formatter {
  return (text: string) => {
    if (_level === 0) return text;
    // Handle nested resets: replace inner close sequences so nesting works
    return `\x1b[${open}m${text.replaceAll(`\x1b[${close}m`, `\x1b[${open}m`)}\x1b[${close}m`;
  };
}

// ── Modifiers ───────────────────────────────────────────────────────────────

export const reset: Formatter = fmt("0", "0");
export const bold: Formatter = fmt("1", "22");
export const dim: Formatter = fmt("2", "22");
export const italic: Formatter = fmt("3", "23");
export const underline: Formatter = fmt("4", "24");
export const inverse: Formatter = fmt("7", "27");
export const hidden: Formatter = fmt("8", "28");
export const strikethrough: Formatter = fmt("9", "29");

// ── Foreground colors ───────────────────────────────────────────────────────

export const black: Formatter = fmt("30", "39");
export const red: Formatter = fmt("31", "39");
export const green: Formatter = fmt("32", "39");
export const yellow: Formatter = fmt("33", "39");
export const blue: Formatter = fmt("34", "39");
export const magenta: Formatter = fmt("35", "39");
export const cyan: Formatter = fmt("36", "39");
export const white: Formatter = fmt("37", "39");
export const gray: Formatter = fmt("90", "39");
export const grey: Formatter = gray;

// Bright variants
export const redBright: Formatter = fmt("91", "39");
export const greenBright: Formatter = fmt("92", "39");
export const yellowBright: Formatter = fmt("93", "39");
export const blueBright: Formatter = fmt("94", "39");
export const magentaBright: Formatter = fmt("95", "39");
export const cyanBright: Formatter = fmt("96", "39");
export const whiteBright: Formatter = fmt("97", "39");

// ── Background colors ──────────────────────────────────────────────────────

export const bgBlack: Formatter = fmt("40", "49");
export const bgRed: Formatter = fmt("41", "49");
export const bgGreen: Formatter = fmt("42", "49");
export const bgYellow: Formatter = fmt("43", "49");
export const bgBlue: Formatter = fmt("44", "49");
export const bgMagenta: Formatter = fmt("45", "49");
export const bgCyan: Formatter = fmt("46", "49");
export const bgWhite: Formatter = fmt("47", "49");
export const bgGray: Formatter = fmt("100", "49");

export const bgRedBright: Formatter = fmt("101", "49");
export const bgGreenBright: Formatter = fmt("102", "49");
export const bgYellowBright: Formatter = fmt("103", "49");
export const bgBlueBright: Formatter = fmt("104", "49");
export const bgMagentaBright: Formatter = fmt("105", "49");
export const bgCyanBright: Formatter = fmt("106", "49");
export const bgWhiteBright: Formatter = fmt("107", "49");

// ── Extended colors ─────────────────────────────────────────────────────────

function assertByte(label: string, n: number): void {
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new RangeError(`${label}: expected an integer in [0, 255], got ${String(n)}`);
  }
}

/** 256-color foreground (0–255) */
export function rgb256(code: number): Formatter {
  assertByte("rgb256", code);
  return (text: string) => {
    if (_level < 2) return text;
    return `\x1b[38;5;${code}m${text}\x1b[39m`;
  };
}

/** 256-color background (0–255) */
export function bgRgb256(code: number): Formatter {
  assertByte("bgRgb256", code);
  return (text: string) => {
    if (_level < 2) return text;
    return `\x1b[48;5;${code}m${text}\x1b[49m`;
  };
}

/** Truecolor foreground */
export function rgb(r: number, g: number, b: number): Formatter {
  assertByte("rgb.r", r);
  assertByte("rgb.g", g);
  assertByte("rgb.b", b);
  return (text: string) => {
    if (_level < 3) return text;
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
  };
}

/** Truecolor background */
export function bgRgb(r: number, g: number, b: number): Formatter {
  assertByte("bgRgb.r", r);
  assertByte("bgRgb.g", g);
  assertByte("bgRgb.b", b);
  return (text: string) => {
    if (_level < 3) return text;
    return `\x1b[48;2;${r};${g};${b}m${text}\x1b[49m`;
  };
}

const HEX6_RE = /^[0-9a-fA-F]{6}$/;

function parseHex(color: string): [number, number, number] {
  if (typeof color !== "string") {
    throw new TypeError(`hex: expected a string, got ${typeof color}`);
  }
  const c = color.startsWith("#") ? color.slice(1) : color;
  if (!HEX6_RE.test(c)) {
    throw new RangeError(
      `hex: expected a 6-digit hex color (e.g. "#ff0000" or "ff0000"), got "${color}"`,
    );
  }
  return [
    Number.parseInt(c.slice(0, 2), 16),
    Number.parseInt(c.slice(2, 4), 16),
    Number.parseInt(c.slice(4, 6), 16),
  ];
}

/** Hex foreground (#ff0000 or ff0000). Throws on invalid input. */
export function hex(color: string): Formatter {
  const [r, g, b] = parseHex(color);
  return rgb(r, g, b);
}

/** Hex background. Throws on invalid input. */
export function bgHex(color: string): Formatter {
  const [r, g, b] = parseHex(color);
  return bgRgb(r, g, b);
}

// ── Compose helper ──────────────────────────────────────────────────────────

/** Compose multiple formatters: `compose(bold, red, underline)("hello")` */
export function compose(...formatters: Formatter[]): Formatter {
  return (text: string) => formatters.reduceRight((acc, fn) => fn(acc), text);
}

// ── Strip ANSI ──────────────────────────────────────────────────────────────

/**
 * Build a fresh global RegExp that matches a single ANSI SGR escape sequence.
 *
 * A factory (rather than a shared instance) is exposed because `.exec()` on a
 * `/g` regex carries `lastIndex` state — sharing one instance across modules
 * would invite subtle cross-call bugs.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) is the leading byte of every ANSI escape sequence we want to strip.
export const makeAnsiRegex = (): RegExp => /\x1b\[[0-9;]*m/g;

const ANSI_RE = makeAnsiRegex();

/** Remove all ANSI escape sequences from a string */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

/** Get the visible length of a string (excluding ANSI codes) */
export function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

export type { Formatter };
