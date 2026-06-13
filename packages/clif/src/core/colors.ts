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

/**
 * Wrap `text` in an SGR open/close pair, rewriting any nested close sequences
 * back to the outer open so styles survive nesting (`bold(red(x))` keeps both).
 */
function wrap(open: string, close: string, text: string): string {
  return `\x1b[${open}m${text.replaceAll(`\x1b[${close}m`, `\x1b[${open}m`)}\x1b[${close}m`;
}

function fmt(open: string, close: string): Formatter {
  return (text: string) => (_level === 0 ? text : wrap(open, close, text));
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

// ── Color-space downgrading ──────────────────────────────────────────────────
// When a terminal can't render an exact RGB value, map it to the nearest color
// it CAN render (truecolor → 256 → 16) instead of dropping the color entirely.

/** Map an RGB triplet to the nearest 256-color palette index (0–255). */
export function rgbToAnsi256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  return (
    16 + 36 * Math.round((r / 255) * 5) + 6 * Math.round((g / 255) * 5) + Math.round((b / 255) * 5)
  );
}

/** Map a 256-color index to the nearest basic SGR code (30–37 / 90–97). */
function ansi256ToAnsi16(code: number): number {
  if (code < 8) return 30 + code;
  if (code < 16) return 90 + (code - 8);
  let r: number;
  let g: number;
  let b: number;
  if (code >= 232) {
    const c = ((code - 232) * 10 + 8) / 255;
    r = c;
    g = c;
    b = c;
  } else {
    const c = code - 16;
    const rem = c % 36;
    r = Math.floor(c / 36) / 5;
    g = Math.floor(rem / 6) / 5;
    b = (rem % 6) / 5;
  }
  const value = Math.max(r, g, b) * 2;
  if (value === 0) return 30;
  let result = 30 + ((Math.round(b) << 2) | (Math.round(g) << 1) | Math.round(r));
  if (value === 2) result += 60;
  return result;
}

/** Map an RGB triplet to the nearest basic SGR code (30–37 / 90–97). */
export function rgbToAnsi16(r: number, g: number, b: number): number {
  return ansi256ToAnsi16(rgbToAnsi256(r, g, b));
}

/** Level-aware 256-color formatter, downgrading to 16 colors when needed. */
function ansi256Formatter(code: number, bg: boolean): Formatter {
  const close = bg ? "49" : "39";
  return (text: string) => {
    if (_level === 0) return text;
    if (_level >= 2) return wrap(`${bg ? 48 : 38};5;${code}`, close, text);
    return wrap(String(ansi256ToAnsi16(code) + (bg ? 10 : 0)), close, text);
  };
}

/** Level-aware truecolor formatter, downgrading to 256 → 16 when needed. */
function rgbFormatter(r: number, g: number, b: number, bg: boolean): Formatter {
  const close = bg ? "49" : "39";
  return (text: string) => {
    if (_level === 0) return text;
    if (_level >= 3) return wrap(`${bg ? 48 : 38};2;${r};${g};${b}`, close, text);
    if (_level === 2) return wrap(`${bg ? 48 : 38};5;${rgbToAnsi256(r, g, b)}`, close, text);
    return wrap(String(rgbToAnsi16(r, g, b) + (bg ? 10 : 0)), close, text);
  };
}

/** 256-color foreground (0–255). Downgrades to 16 colors below level 2. */
export function rgb256(code: number): Formatter {
  assertByte("rgb256", code);
  return ansi256Formatter(code, false);
}

/** 256-color background (0–255). Downgrades to 16 colors below level 2. */
export function bgRgb256(code: number): Formatter {
  assertByte("bgRgb256", code);
  return ansi256Formatter(code, true);
}

/** Truecolor foreground. Downgrades to 256 → 16 colors on weaker terminals. */
export function rgb(r: number, g: number, b: number): Formatter {
  assertByte("rgb.r", r);
  assertByte("rgb.g", g);
  assertByte("rgb.b", b);
  return rgbFormatter(r, g, b, false);
}

/** Truecolor background. Downgrades to 256 → 16 colors on weaker terminals. */
export function bgRgb(r: number, g: number, b: number): Formatter {
  assertByte("bgRgb.r", r);
  assertByte("bgRgb.g", g);
  assertByte("bgRgb.b", b);
  return rgbFormatter(r, g, b, true);
}

const HEX6_RE = /^[0-9a-fA-F]{6}$/;
const HEX3_RE = /^[0-9a-fA-F]{3}$/;

function parseHex(color: string): [number, number, number] {
  if (typeof color !== "string") {
    throw new TypeError(`hex: expected a string, got ${typeof color}`);
  }
  let c = color.startsWith("#") ? color.slice(1) : color;
  // Expand 3-digit shorthand (#f0a → ff00aa) before validation.
  if (HEX3_RE.test(c)) {
    c = `${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
  }
  if (!HEX6_RE.test(c)) {
    throw new RangeError(
      `hex: expected a 3- or 6-digit hex color (e.g. "#f00", "#ff0000" or "ff0000"), got "${color}"`,
    );
  }
  return [
    Number.parseInt(c.slice(0, 2), 16),
    Number.parseInt(c.slice(2, 4), 16),
    Number.parseInt(c.slice(4, 6), 16),
  ];
}

/** Hex foreground (#ff0000, ff0000, or shorthand #f00). Throws on invalid input. */
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

// ── Gradient ──────────────────────────────────────────────────────────────────

/** A color stop: either a hex string (`"#ff0000"`, `"#f00"`) or an `[r, g, b]` triplet. */
export type ColorStop = string | readonly [number, number, number];

function stopToRgb(stop: ColorStop): [number, number, number] {
  if (typeof stop === "string") return parseHex(stop);
  const [r, g, b] = stop;
  assertByte("gradient.r", r);
  assertByte("gradient.g", g);
  assertByte("gradient.b", b);
  return [r, g, b];
}

/**
 * Paint text with a smooth multi-stop gradient — one interpolated color per
 * visible character. Composes like any formatter and inherits rgb() downgrading.
 *
 * @example
 * ```ts
 * console.log(gradient(["#ff0080", "#7928ca"])("hello world"));
 * console.log(gradient(["#f00", "#0f0", "#00f"])("rainbow"));
 * ```
 */
export function gradient(colors: readonly ColorStop[]): Formatter {
  if (colors.length === 0) {
    throw new RangeError("gradient: expected at least one color stop");
  }
  const stops = colors.map(stopToRgb);
  return (text: string) => {
    if (_level === 0) return text;
    const chars = [...text];
    const n = chars.length;
    if (n === 0) return text;
    if (stops.length === 1) {
      const [r, g, b] = stops[0]!;
      return rgb(r, g, b)(text);
    }
    const segments = stops.length - 1;
    let out = "";
    for (let i = 0; i < n; i++) {
      const pos = n === 1 ? 0 : (i / (n - 1)) * segments;
      const idx = Math.min(Math.floor(pos), segments - 1);
      const frac = pos - idx;
      const a = stops[idx]!;
      const b = stops[idx + 1]!;
      out += rgb(
        Math.round(a[0] + (b[0] - a[0]) * frac),
        Math.round(a[1] + (b[1] - a[1]) * frac),
        Math.round(a[2] + (b[2] - a[2]) * frac),
      )(chars[i]!);
    }
    return out;
  };
}

// ── Hyperlinks ────────────────────────────────────────────────────────────────

/**
 * Render a clickable terminal hyperlink (OSC 8). Without color/link support it
 * degrades to `text (url)` so the URL is never lost.
 *
 * @example
 * ```ts
 * console.log(link("clif docs", "https://clif.arshadshah.com"));
 * ```
 */
export function link(text: string, url: string): string {
  if (_level === 0) return text === url ? text : `${text} (${url})`;
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

// ── Chainable style API ─────────────────────────────────────────────────────

/**
 * A chainable, callable style builder. Stack any named formatter and call it on
 * a string: `style.red.bold.underline("error")`. Extended colors are methods:
 * `style.hex("#f5c76a").bold("title")`, `style.bgRgb(20, 20, 40).white(" hi ")`.
 *
 * Each access returns a fresh, immutable builder, so intermediate styles are
 * safe to capture and reuse: `const heading = style.bold.cyan;`.
 */
export interface Style {
  (text: string): string;
  // Modifiers
  readonly reset: Style;
  readonly bold: Style;
  readonly dim: Style;
  readonly italic: Style;
  readonly underline: Style;
  readonly inverse: Style;
  readonly hidden: Style;
  readonly strikethrough: Style;
  // Foreground
  readonly black: Style;
  readonly red: Style;
  readonly green: Style;
  readonly yellow: Style;
  readonly blue: Style;
  readonly magenta: Style;
  readonly cyan: Style;
  readonly white: Style;
  readonly gray: Style;
  readonly grey: Style;
  readonly redBright: Style;
  readonly greenBright: Style;
  readonly yellowBright: Style;
  readonly blueBright: Style;
  readonly magentaBright: Style;
  readonly cyanBright: Style;
  readonly whiteBright: Style;
  // Background
  readonly bgBlack: Style;
  readonly bgRed: Style;
  readonly bgGreen: Style;
  readonly bgYellow: Style;
  readonly bgBlue: Style;
  readonly bgMagenta: Style;
  readonly bgCyan: Style;
  readonly bgWhite: Style;
  readonly bgGray: Style;
  readonly bgRedBright: Style;
  readonly bgGreenBright: Style;
  readonly bgYellowBright: Style;
  readonly bgBlueBright: Style;
  readonly bgMagentaBright: Style;
  readonly bgCyanBright: Style;
  readonly bgWhiteBright: Style;
  // Extended-color methods
  rgb(r: number, g: number, b: number): Style;
  bgRgb(r: number, g: number, b: number): Style;
  rgb256(code: number): Style;
  bgRgb256(code: number): Style;
  ansi256(code: number): Style;
  bgAnsi256(code: number): Style;
  hex(color: string): Style;
  bgHex(color: string): Style;
}

const NAMED_STYLES: Record<string, Formatter> = {
  reset,
  bold,
  dim,
  italic,
  underline,
  inverse,
  hidden,
  strikethrough,
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  gray,
  grey,
  redBright,
  greenBright,
  yellowBright,
  blueBright,
  magentaBright,
  cyanBright,
  whiteBright,
  bgBlack,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,
  bgGray,
  bgRedBright,
  bgGreenBright,
  bgYellowBright,
  bgBlueBright,
  bgMagentaBright,
  bgCyanBright,
  bgWhiteBright,
};

type ColorMethod = (...args: (number | string)[]) => Formatter;

const STYLE_METHODS: Record<string, ColorMethod> = {
  rgb: rgb as ColorMethod,
  bgRgb: bgRgb as ColorMethod,
  rgb256: rgb256 as ColorMethod,
  bgRgb256: bgRgb256 as ColorMethod,
  ansi256: rgb256 as ColorMethod,
  bgAnsi256: bgRgb256 as ColorMethod,
  hex: hex as ColorMethod,
  bgHex: bgHex as ColorMethod,
};

function makeStyle(fns: readonly Formatter[]): Style {
  const apply = ((text: string) => fns.reduceRight((acc, fn) => fn(acc), text)) as Style;
  return new Proxy(apply, {
    get(target, prop, receiver) {
      if (typeof prop === "string") {
        const named = NAMED_STYLES[prop];
        if (named) return makeStyle([...fns, named]);
        const method = STYLE_METHODS[prop];
        if (method) {
          return (...args: (number | string)[]): Style => makeStyle([...fns, method(...args)]);
        }
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as Style;
}

/** Chainable style builder — see {@link Style}. */
export const style: Style = makeStyle([]);

// ── Strip ANSI ──────────────────────────────────────────────────────────────

/**
 * Build a fresh global RegExp matching one ANSI escape — an SGR code (`\x1b[…m`)
 * or an OSC 8 hyperlink wrapper (`\x1b]8;;…\x07`).
 *
 * A factory (rather than a shared instance) is exposed because `.exec()` on a
 * `/g` regex carries `lastIndex` state — sharing one instance across modules
 * would invite subtle cross-call bugs.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) and BEL (0x07) bound the ANSI escape sequences we strip.
export const makeAnsiRegex = (): RegExp => /\x1b\[[0-9;]*m|\x1b\]8;;[^\x07]*\x07/g;

const ANSI_RE = makeAnsiRegex();

/** Remove all ANSI escape sequences from a string */
export function stripAnsi(text: string): string {
  // Fast path: the vast majority of strings carry no escape sequences, so skip
  // the regex machinery and the throwaway allocation it produces. visibleLength
  // (and every renderer that calls it per cell/line) rides on this same check.
  return text.includes("\x1b") ? text.replace(ANSI_RE, "") : text;
}

/** Get the visible length of a string (excluding ANSI codes) */
export function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

export type { Formatter };
