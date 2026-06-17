/**
 * clif/banner — ASCII-art / FIGfont banner generator.
 *
 * Opt-in subpath: `import { figlet } from "@arshad-shah/clif/banner"`. clif ships
 * the FIGfont *engine* only — no bundled fonts — so importing it never inflates
 * the core bundle and clif's concern stays purely CLI. Bring any FIGfont
 * (`.flf`) you like via {@link parseFont} / {@link registerFont}.
 *
 * Built on clif's own colour system — pass a {@link Formatter} (e.g. `hex`,
 * `style`) or a multi-stop `gradient` applied across the rendered grid.
 *
 * @example
 * ```ts
 * import { readFileSync } from "node:fs";
 * import { figlet, parseFont } from "@arshad-shah/clif/banner";
 * import { box } from "@arshad-shah/clif";
 *
 * const slant = parseFont(readFileSync("./Slant.flf", "utf8"));
 * console.log(box(figlet("clif", { font: slant, gradient: ["#ff0080", "#7928ca"] })));
 * ```
 */

import { type ColorStop, type Formatter, gradient, rgb, visibleLength } from "../core/colors.js";
import { terminalWidth } from "../utils/helpers.js";
import { type Font, type RenderOptions, parseFont, renderFont } from "./figfont.js";

export { parseFont, renderFont } from "./figfont.js";
export type { Font, LayoutMode, PrintDirection, RenderOptions } from "./figfont.js";

/** Direction a multi-stop gradient flows across the rendered art. */
export type GradientDirection = "horizontal" | "vertical" | "diagonal";

/** What to do when rendered art is wider than the target `width`. */
export type Overflow = "clip" | "wrap";

export interface FigletOptions extends RenderOptions {
  /** A parsed {@link Font}, or the name of one registered via {@link registerFont}. */
  font: Font | string;
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
 * Register a custom font from raw FIGfont (`.flf`) source under `name`, so it can
 * later be referenced by name from {@link figlet}. Parsing happens once, here.
 */
export function registerFont(name: string, flf: string): Font {
  const font = parseFont(flf);
  registry.set(name, font);
  return font;
}

/** Resolve a `Font` value — pass-through for objects, registry lookup for names. */
function resolveFont(font: Font | string): Font {
  if (typeof font !== "string") return font;
  const found = registry.get(font);
  if (!found) {
    throw new Error(
      `figlet: no font registered as "${font}" — pass a parsed Font (parseFont) or registerFont() it first`,
    );
  }
  return found;
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

// ── Render entry point ───────────────────────────────────────────────────────────

/**
 * Render `text` as large ASCII-art lettering. Synchronous and pure: supply a
 * parsed {@link Font} (or a name registered via {@link registerFont}) in
 * `opts.font`.
 *
 * @returns The rendered, multi-line banner string. Returns `""` for empty input.
 *   Code points the font doesn't define are skipped.
 */
export function figlet(text: string, opts: FigletOptions): string {
  if (text.length === 0) return "";
  const font = resolveFont(opts.font);
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
