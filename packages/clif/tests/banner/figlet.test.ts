import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Font, figlet, parseFont, registerFont, renderFont } from "../../src/banner/index.js";
import { colorLevel, stripAnsi, visibleLength } from "../../src/core/colors.js";
import { box } from "../../src/output/components.js";

// Real FIGfonts used as dev-only fixtures — they exercise the smushing engine
// but are never shipped (clif bundles no fonts). Sourced from the classic
// figlet font set.
const fixture = (name: string): Font =>
  parseFont(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}.flf`, import.meta.url)), "utf8"),
  );

const standard = fixture("Standard");
const ansiShadow = fixture("ANSIShadow");
const small = fixture("Small");

// Force colors on by default; individual tests opt into a different level.
beforeEach(() => colorLevel(1));
afterEach(() => colorLevel(1));

/**
 * Build a trivial but valid height-1 FIGfont where every glyph renders as the
 * literal character itself. Lets us test the parser/registry without depending
 * on a fixture font's exact pixels.
 */
function trivialFlf(): string {
  const codes: number[] = [];
  for (let c = 32; c <= 126; c++) codes.push(c);
  codes.push(196, 214, 220, 228, 246, 252, 223);
  // oldLayout 0 → kerning; hardblank `$`; one row per glyph (also the last row,
  // hence the `@@` endmark).
  const glyphs = codes.map((c) => `${String.fromCodePoint(c)}@@`).join("\n");
  return `flf2a$ 1 0 10 0 0\n${glyphs}\n`;
}

/** Visible width of the widest row in a rendered banner. */
function bannerWidth(s: string): number {
  return s.split("\n").reduce((m, r) => Math.max(m, visibleLength(r)), 0);
}

describe("parseFont", () => {
  it("rejects non-FIGfont input", () => {
    expect(() => parseFont("not a font")).toThrow(/flf2a/);
  });

  it("parses the header and exposes glyphs", () => {
    const font = parseFont(trivialFlf());
    expect(font.height).toBe(1);
    expect(font.hardblank).toBe("$");
    expect(font.glyphs.has("A".codePointAt(0)!)).toBe(true);
  });

  it("parses a real font's header (height + hardblank)", () => {
    expect(standard.height).toBe(6);
    expect(standard.hardblank).toBe("$");
  });

  it("normalises CRLF line endings", () => {
    const crlf = trivialFlf().replace(/\n/g, "\r\n");
    const font = parseFont(crlf);
    // A stray `\r` mistaken for the endmark would leave `@` in the glyph.
    expect(font.glyphs.get("A".codePointAt(0)!)).toEqual(["A"]);
  });
});

describe("renderFont (pure core)", () => {
  it("renders text through a trivial font verbatim", () => {
    expect(renderFont("Hi", parseFont(trivialFlf()))).toEqual(["Hi"]);
  });

  it("skips code points the font does not define", () => {
    // Emoji is absent from the trivial font and must be silently dropped.
    expect(renderFont("A😀B", parseFont(trivialFlf()))).toEqual(["AB"]);
  });

  it("stacks newlines into separate blocks", () => {
    expect(renderFont("A\nB", parseFont(trivialFlf()))).toEqual(["A", "B"]);
  });

  it("returns uniform-width rows with no hardblank leakage", () => {
    const rows = renderFont("clif", standard);
    const widths = new Set(rows.map((r) => r.length));
    expect(widths.size).toBe(1); // all rows equal width
    expect(rows.join("")).not.toContain(standard.hardblank);
    expect(rows.join("")).not.toContain("@"); // endmarks stripped
  });
});

describe("figlet", () => {
  it("renders ASCII art with a supplied font", () => {
    const art = stripAnsi(figlet("clif", { font: standard }));
    expect(art).toMatchInlineSnapshot(`
      "       _ _  __ 
         ___| (_)/ _|
        / __| | | |_ 
       | (__| | |  _|
        \\___|_|_|_|  
                     "
    `);
  });

  it("renders a font with full-layout smushing", () => {
    const art = stripAnsi(figlet("Hi", { font: ansiShadow }));
    expect(art).toMatchInlineSnapshot(`
      "██╗  ██╗██╗
      ██║  ██║██║
      ███████║██║
      ██╔══██║██║
      ██║  ██║██║
      ╚═╝  ╚═╝╚═╝
                 "
    `);
  });

  it("returns an empty string for empty input", () => {
    expect(figlet("", { font: standard })).toBe("");
  });

  it("honours horizontal layout overrides", () => {
    const w = (layout: "full" | "fitted" | "default") =>
      bannerWidth(figlet("WAVE", { font: standard, horizontalLayout: layout, width: 999 }));
    // Full width is widest; fitting (kerning) packs tighter; smushing tighter still.
    expect(w("full")).toBeGreaterThan(w("fitted"));
    expect(w("fitted")).toBeGreaterThan(w("default"));
  });

  it("reverses glyph order for right-to-left print direction", () => {
    expect(figlet("abc", { font: parseFont(trivialFlf()), printDirection: "rtl" })).toBe("cba");
  });
});

describe("width handling", () => {
  it("clips art wider than the target width", () => {
    const art = figlet("WIDE", { font: standard, width: 12, overflow: "clip" });
    expect(bannerWidth(art)).toBeLessThanOrEqual(12);
  });

  it("wraps art onto multiple lines when overflow is wrap", () => {
    const oneWord = figlet("hello", { font: small, width: 200 });
    const wrapped = figlet("hello world here", { font: small, width: 24, overflow: "wrap" });
    expect(bannerWidth(wrapped)).toBeLessThanOrEqual(24);
    // Wrapping stacks blocks vertically, so it is taller than a single word.
    expect(wrapped.split("\n").length).toBeGreaterThan(oneWord.split("\n").length);
  });

  it("aligns rows within the target width", () => {
    const lead = (s: string) => s.length - s.trimStart().length;
    const centered = figlet("hi", { font: small, width: 40, align: "center" });
    const left = figlet("hi", { font: small, width: 40, align: "left" });
    // Centering indents every row further than left alignment does.
    expect(lead(centered.split("\n")[1]!)).toBeGreaterThan(lead(left.split("\n")[1]!));
  });
});

describe("colour", () => {
  it("applies a single formatter and stays ANSI-aware in width", async () => {
    colorLevel(3);
    const { hex } = await import("../../src/core/colors.js");
    const plain = figlet("Go", { font: standard });
    const colored = figlet("Go", { font: standard, color: hex("#f5c76a") });
    expect(colored).toContain("\x1b[");
    // Colour must not change the visible geometry.
    expect(bannerWidth(colored)).toBe(bannerWidth(plain));
  });

  it("paints gradients across the grid (all directions)", () => {
    colorLevel(3);
    const plain = stripAnsi(figlet("Go", { font: standard }));
    for (const gradientDirection of ["horizontal", "vertical", "diagonal"] as const) {
      const art = figlet("Go", {
        font: standard,
        gradient: ["#ff0080", "#7928ca"],
        gradientDirection,
      });
      expect(art).toContain("\x1b[38;2;");
      expect(stripAnsi(art)).toBe(plain); // colour never alters geometry
    }
  });

  it("degrades to plain text when colour is disabled", () => {
    colorLevel(0);
    const art = figlet("Go", { font: standard, gradient: ["#ff0080", "#7928ca"] });
    expect(art).not.toContain("\x1b[");
  });

  it("composes inside a box with correct framing", () => {
    const framed = stripAnsi(box(figlet("Hi", { font: small }), { padding: 0 }));
    const widths = new Set(framed.split("\n").map(visibleLength));
    // One distinct width ⇒ the box measured the multi-line banner correctly.
    expect(widths.size).toBe(1);
  });
});

describe("registerFont", () => {
  it("round-trips a custom font and renders it by name", () => {
    registerFont("trivial", trivialFlf());
    expect(figlet("Hey", { font: "trivial" })).toBe("Hey");
  });

  it("throws a helpful error for an unregistered font name", () => {
    expect(() => figlet("x", { font: "nope" })).toThrow(/no font registered/);
  });
});
