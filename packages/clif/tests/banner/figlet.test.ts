import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type Font,
  figlet,
  loadFont,
  parseFont,
  registerFont,
  renderBanner,
  renderFont,
} from "../../src/banner/index.js";
import { colorLevel, stripAnsi, visibleLength } from "../../src/core/colors.js";
import { box } from "../../src/output/components.js";

// Force colors on by default; individual tests opt into a different level.
beforeEach(() => colorLevel(1));
afterEach(() => colorLevel(1));

/**
 * Build a trivial but valid height-1 FIGfont where every glyph renders as the
 * literal character itself. Lets us test the parser/registry without depending
 * on a bundled font's exact pixels.
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

  it("normalises CRLF line endings", () => {
    const crlf = trivialFlf().replace(/\n/g, "\r\n");
    const font = parseFont(crlf);
    // A stray `\r` mistaken for the endmark would leave `@` in the glyph.
    expect(font.glyphs.get("A".codePointAt(0)!)).toEqual(["A"]);
  });
});

describe("renderFont (pure core)", () => {
  let font: Font;
  beforeEach(() => {
    font = parseFont(trivialFlf());
  });

  it("renders text through a trivial font verbatim", () => {
    expect(renderFont("Hi", font)).toEqual(["Hi"]);
  });

  it("skips code points the font does not define", () => {
    // Emoji is absent from the trivial font and must be silently dropped.
    expect(renderFont("A😀B", font)).toEqual(["AB"]);
  });

  it("stacks newlines into separate blocks", () => {
    expect(renderFont("A\nB", font)).toEqual(["A", "B"]);
  });

  it("returns uniform-width rows with no hardblank leakage", async () => {
    const std = await loadFont("standard");
    const rows = renderFont("clif", std);
    const widths = new Set(rows.map((r) => r.length));
    expect(widths.size).toBe(1); // all rows equal width
    expect(rows.join("")).not.toContain(std.hardblank);
    expect(rows.join("")).not.toContain("@"); // endmarks stripped
  });
});

describe("figlet", () => {
  it("renders default (Standard) ASCII art", async () => {
    const art = stripAnsi(await figlet("clif"));
    expect(art).toMatchInlineSnapshot(`
      "       _ _  __ 
         ___| (_)/ _|
        / __| | | |_ 
       | (__| | |  _|
        \\___|_|_|_|  
                     "
    `);
  });

  it("renders the ANSI Shadow font", async () => {
    const art = stripAnsi(await figlet("Hi", { font: "ansiShadow" }));
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

  it("returns an empty string for empty input", async () => {
    expect(await figlet("")).toBe("");
  });

  it("honours horizontal layout overrides", async () => {
    const w = async (layout: "full" | "fitted" | "default") =>
      bannerWidth(await figlet("WAVE", { font: "standard", horizontalLayout: layout, width: 999 }));
    // Full width is widest; fitting (kerning) packs tighter; smushing tighter still.
    expect(await w("full")).toBeGreaterThan(await w("fitted"));
    expect(await w("fitted")).toBeGreaterThan(await w("default"));
  });

  it("reverses glyph order for right-to-left print direction", () => {
    const font = parseFont(trivialFlf());
    expect(renderBanner("abc", font, { printDirection: "rtl" })).toBe("cba");
  });
});

describe("width handling", () => {
  it("clips art wider than the target width", async () => {
    const art = await figlet("WIDE", { font: "big", width: 12, overflow: "clip" });
    expect(bannerWidth(art)).toBeLessThanOrEqual(12);
  });

  it("wraps art onto multiple lines when overflow is wrap", async () => {
    const oneWord = await figlet("hello", { font: "small", width: 200 });
    const wrapped = await figlet("hello world here", {
      font: "small",
      width: 24,
      overflow: "wrap",
    });
    expect(bannerWidth(wrapped)).toBeLessThanOrEqual(24);
    // Wrapping stacks blocks vertically, so it is taller than a single word.
    expect(wrapped.split("\n").length).toBeGreaterThan(oneWord.split("\n").length);
  });

  it("aligns rows within the target width", async () => {
    const lead = (s: string) => s.length - s.trimStart().length;
    const centered = await figlet("hi", { font: "small", width: 40, align: "center" });
    const left = await figlet("hi", { font: "small", width: 40, align: "left" });
    // Centering indents every row further than left alignment does.
    const row = 1;
    expect(lead(centered.split("\n")[row]!)).toBeGreaterThan(lead(left.split("\n")[row]!));
  });
});

describe("colour", () => {
  it("applies a single formatter and stays ANSI-aware in width", async () => {
    colorLevel(3);
    const plain = await figlet("Go", { font: "standard" });
    const { hex } = await import("../../src/core/colors.js");
    const colored = await figlet("Go", { font: "standard", color: hex("#f5c76a") });
    expect(colored).toContain("\x1b[");
    // Colour must not change the visible geometry.
    expect(bannerWidth(colored)).toBe(bannerWidth(plain));
  });

  it("paints a gradient across the grid", async () => {
    colorLevel(3);
    const art = await figlet("Go", { font: "standard", gradient: ["#ff0080", "#7928ca"] });
    expect(art).toContain("\x1b[38;2;");
    expect(stripAnsi(art)).toBe(stripAnsi(await figlet("Go", { font: "standard" })));
  });

  it("degrades to plain text when colour is disabled", async () => {
    colorLevel(0);
    const art = await figlet("Go", { font: "standard", gradient: ["#ff0080", "#7928ca"] });
    expect(art).not.toContain("\x1b[");
  });

  it("composes inside a box with correct framing", async () => {
    const art = await figlet("Hi", { font: "small" });
    const framed = stripAnsi(box(art, { padding: 0 }));
    const lines = framed.split("\n");
    // Every framed line is the same visible width — proof the box measured the
    // multi-line banner correctly.
    const widths = new Set(lines.map(visibleLength));
    expect(widths.size).toBe(1);
  });
});

describe("registerFont & loadFont", () => {
  it("round-trips a custom font registered from raw .flf", async () => {
    registerFont("trivial", trivialFlf());
    expect(await figlet("Hey", { font: "trivial" })).toBe("Hey");
  });

  it("caches built-in fonts across loads", async () => {
    const a = await loadFont("mini");
    const b = await loadFont("mini");
    expect(a).toBe(b); // same cached instance
  });

  it("rejects an unknown built-in font", async () => {
    await expect(loadFont("does-not-exist")).rejects.toThrow();
  });

  it("loads and renders every built-in font", async () => {
    const fonts = ["standard", "slant", "small", "big", "ansiShadow", "banner", "mini"] as const;
    for (const font of fonts) {
      const art = await figlet("Ab", { font, width: 999 });
      // Every font produces non-empty, multi-row art with stripped endmarks.
      expect(art.length).toBeGreaterThan(0);
      expect(art).not.toContain("@");
    }
  });
});

describe("gradient directions & accepts a preloaded font", () => {
  it("supports vertical and diagonal gradients with rgb stops", async () => {
    colorLevel(3);
    const font = await loadFont("standard");
    const vertical = renderBanner("Hi", font, {
      gradient: [
        [255, 0, 128],
        [120, 40, 200],
      ],
      gradientDirection: "vertical",
    });
    const diagonal = renderBanner("Hi", font, {
      gradient: ["#ff0080", "#7928ca"],
      gradientDirection: "diagonal",
    });
    expect(vertical).toContain("\x1b[38;2;");
    expect(diagonal).toContain("\x1b[38;2;");
    // A preloaded Font object renders the same geometry as loading by name.
    expect(stripAnsi(vertical)).toBe(stripAnsi(await figlet("Hi", { font: "standard" })));
  });
});
