/**
 * clif/banner — ASCII-art / FIGfont banner generator.
 *
 * Opt-in subpath: `import { figlet } from "@arshad-shah/clif/banner"`. Font data
 * lives only in this graph, so importing it never inflates clif's core bundle.
 * Built-in fonts are loaded lazily (one chunk per font) via {@link loadFont}.
 *
 * Built on clif's own colour system — pass a {@link Formatter} (e.g. `hex`,
 * `style`) or a multi-stop `gradient` applied across the rendered grid.
 *
 * @example
 * ```ts
 * import { figlet } from "@arshad-shah/clif/banner";
 * import { box } from "@arshad-shah/clif";
 *
 * const art = await figlet("clif", { font: "ansiShadow", gradient: ["#ff0080", "#7928ca"] });
 * console.log(box(art, { padding: 1 }));
 * ```
 */

import { type ColorStop, type Formatter, gradient, rgb, visibleLength } from "../core/colors.js";
import { terminalWidth } from "../utils/helpers.js";
import { type Font, type RenderOptions, parseFont, renderFont } from "./figfont.js";

export { parseFont, renderFont } from "./figfont.js";
export type { Font, LayoutMode, PrintDirection, RenderOptions } from "./figfont.js";

/** Names of the fonts bundled with `@arshad-shah/clif/banner`. */
export type BuiltinFontName =
  | "standard"
  | "slant"
  | "small"
  | "big"
  | "ansiShadow"
  | "banner"
  | "mini";

/** Direction a multi-stop gradient flows across the rendered art. */
export type GradientDirection = "horizontal" | "vertical" | "diagonal";

/** What to do when rendered art is wider than the target `width`. */
export type Overflow = "clip" | "wrap";

export interface FigletOptions extends RenderOptions {
  /** Built-in font name, a registered name, or a preloaded {@link Font}. Default `"standard"`. */
  font?: BuiltinFontName | (string & {}) | Font;
  /** Target width for alignment / overflow handling. Default `terminalWidth()`. */
  width?: number;
  /** Horizontal alignment within `width`. Default `"left"`. */
  align?: "left" | "center" | "right";
  /** Behaviour when art exceeds `width`. Default `"clip"`. */
  overflow?: Overflow;
  /** A single colour/style applied to the whole banner. */
  color?: Formatter;
  /** Multi-stop gradient painted across the grid. Takes precedence over `color`. */
  gradient?: readonly ColorStop[];
  /** Direction the gradient flows. Default `"horizontal"`. */
  gradientDirection?: GradientDirection;
}

// ── Font registry ──────────────────────────────────────────────────────────────

const registry = new Map<string, Font>();

/**
 * Register a custom font from raw FIGfont (`.flf`) source under `name`, so it
 * can later be used by name. The parse happens once, here — the bundle is never
 * affected since the `.flf` string is supplied by the caller.
 */
export function registerFont(name: string, flf: string): Font {
  const font = parseFont(flf);
  registry.set(name, font);
  return font;
}

/** Dynamic-import the compact data for one built-in font (its own bundle chunk). */
async function importBuiltin(name: BuiltinFontName): Promise<string> {
  switch (name) {
    case "standard":
      return (await import("./fonts/standard.js")).flf;
    case "slant":
      return (await import("./fonts/slant.js")).flf;
    case "small":
      return (await import("./fonts/small.js")).flf;
    case "big":
      return (await import("./fonts/big.js")).flf;
    case "ansiShadow":
      return (await import("./fonts/ansiShadow.js")).flf;
    case "banner":
      return (await import("./fonts/banner.js")).flf;
    case "mini":
      return (await import("./fonts/mini.js")).flf;
    default:
      throw new Error(`loadFont: unknown built-in font "${String(name)}"`);
  }
}

/**
 * Resolve a font by name — a previously {@link registerFont}'d name, or one of
 * the built-ins (lazily imported and cached). Built-in font modules are split
 * into their own chunks, so only the fonts you actually use are ever loaded.
 */
export async function loadFont(name: BuiltinFontName | string): Promise<Font> {
  const cached = registry.get(name);
  if (cached) return cached;
  const flf = await importBuiltin(name as BuiltinFontName);
  const font = parseFont(flf);
  registry.set(name, font);
  return font;
}

// ── Colour helpers ──────────────────────────────────────────────────────────────

function stopToRgb(stop: ColorStop): [number, number, number] {
  if (typeof stop !== "string") return [stop[0], stop[1], stop[2]];
  let c = stop.startsWith("#") ? stop.slice(1) : stop;
  if (c.length === 3) c = `${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
  return [
    Number.parseInt(c.slice(0, 2), 16),
    Number.parseInt(c.slice(2, 4), 16),
    Number.parseInt(c.slice(4, 6), 16),
  ];
}

/** Interpolated colour at position `t` (0…1) across the stops, as a Formatter. */
function colorAt(stops: readonly [number, number, number][], t: number): Formatter {
  if (stops.length === 1) {
    const [r, g, b] = stops[0]!;
    return rgb(r, g, b);
  }
  const segments = stops.length - 1;
  const pos = Math.max(0, Math.min(1, t)) * segments;
  const idx = Math.min(Math.floor(pos), segments - 1);
  const frac = pos - idx;
  const a = stops[idx]!;
  const b = stops[idx + 1]!;
  return rgb(
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
  );
}

/**
 * Paint the grid with a multi-stop gradient. Rows are uniform width, so colour
 * is mapped by grid coordinate — flowing across columns, rows, or the diagonal —
 * rather than naïvely per output line.
 */
function paintGradient(
  rows: string[],
  stops: readonly ColorStop[],
  direction: GradientDirection,
): string[] {
  const rgbStops = stops.map(stopToRgb);
  const height = rows.length;
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);

  if (direction === "horizontal") {
    // Uniform-width rows + per-character gradient ⇒ columns share a colour.
    const paint = gradient(stops);
    return rows.map((r) => paint(r));
  }

  if (direction === "vertical") {
    return rows.map((row, y) => {
      const fn = colorAt(rgbStops, height <= 1 ? 0 : y / (height - 1));
      return fn(row);
    });
  }

  // Diagonal: colour each cell by (x + y).
  const span = Math.max(1, width - 1 + (height - 1));
  return rows.map((row, y) => {
    let out = "";
    for (let x = 0; x < row.length; x++) {
      out += colorAt(rgbStops, (x + y) / span)(row[x]!);
    }
    return out;
  });
}

// ── Alignment & overflow ─────────────────────────────────────────────────────────

function clipRow(row: string, max: number): string {
  // Rows are plain (uncoloured) at this stage, so a simple slice is ANSI-safe.
  return row.length > max ? row.slice(0, max) : row;
}

function alignRows(rows: string[], target: number, align: "left" | "center" | "right"): string[] {
  return rows.map((row) => {
    const space = Math.max(0, target - visibleLength(row));
    if (space === 0 || align === "left") return row;
    if (align === "right") return " ".repeat(space) + row;
    const left = Math.floor(space / 2);
    return " ".repeat(left) + row + " ".repeat(space - left);
  });
}

/** Greedily wrap input words so each rendered line fits within `target` columns. */
function wrapInput(text: string, font: Font, renderOpts: RenderOptions, target: number): string {
  const measure = (s: string): number =>
    renderFont(s, font, renderOpts).reduce((m, r) => Math.max(m, r.length), 0);
  const outLines: string[] = [];
  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(" ");
    let current = "";
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word;
      if (current === "" || measure(trial) <= target) {
        current = trial;
      } else {
        outLines.push(current);
        current = word;
      }
    }
    outLines.push(current);
  }
  return outLines.join("\n");
}

// ── Render entry points ──────────────────────────────────────────────────────────

/**
 * Render `text` into a finished banner string using an already-loaded `font`.
 * Synchronous and pure. Use {@link figlet} when you want a font loaded by name.
 */
export function renderBanner(text: string, font: Font, opts: FigletOptions = {}): string {
  if (text.length === 0) return "";
  const renderOpts: RenderOptions = {
    horizontalLayout: opts.horizontalLayout,
    verticalLayout: opts.verticalLayout,
    printDirection: opts.printDirection,
  };
  const target = opts.width ?? terminalWidth();
  const overflow = opts.overflow ?? "clip";

  const source = overflow === "wrap" ? wrapInput(text, font, renderOpts, target) : text;
  let rows = renderFont(source, font, renderOpts);

  const widest = rows.reduce((m, r) => Math.max(m, r.length), 0);
  if (overflow === "clip" && widest > target) {
    rows = rows.map((r) => clipRow(r, target));
  }

  const align = opts.align ?? "left";
  if (align !== "left" && target > 0) rows = alignRows(rows, target, align);

  if (opts.gradient && opts.gradient.length > 0) {
    rows = paintGradient(rows, opts.gradient, opts.gradientDirection ?? "horizontal");
  } else if (opts.color) {
    rows = rows.map((r) => opts.color!(r));
  }

  return rows.join("\n");
}

/**
 * Render `text` as large ASCII-art lettering, loading the requested font by
 * name (lazily, cached) when needed.
 *
 * @returns A promise of the rendered, multi-line banner string. Returns `""`
 *   for empty input. Code points the font doesn't define are skipped.
 */
export async function figlet(text: string, opts: FigletOptions = {}): Promise<string> {
  const fontOpt = opts.font ?? "standard";
  const font = typeof fontOpt === "string" ? await loadFont(fontOpt) : fontOpt;
  return renderBanner(text, font, opts);
}
