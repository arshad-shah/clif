import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bgBlack,
  bgBlue,
  bgCyan,
  bgGray,
  bgGreen,
  bgHex,
  bgMagenta,
  bgRed,
  bgRgb,
  bgRgb256,
  bgWhite,
  bgYellow,
  black,
  blue,
  blueBright,
  bold,
  colorLevel,
  compose,
  cyan,
  cyanBright,
  dim,
  gradient,
  gray,
  green,
  greenBright,
  grey,
  hex,
  hidden,
  inverse,
  isColorSupported,
  italic,
  link,
  magenta,
  magentaBright,
  red,
  redBright,
  rgb,
  rgb256,
  rgbToAnsi16,
  rgbToAnsi256,
  strikethrough,
  stripAnsi,
  style,
  underline,
  visibleLength,
  white,
  whiteBright,
  yellow,
  yellowBright,
} from "../../src/core/colors.js";

describe("colors", () => {
  let originalLevel: 0 | 1 | 2 | 3;

  beforeEach(() => {
    originalLevel = colorLevel();
    colorLevel(1); // Enable basic colors for testing
  });

  afterEach(() => {
    colorLevel(originalLevel);
  });

  describe("color detection", () => {
    it("should report color support when level > 0", () => {
      colorLevel(1);
      expect(isColorSupported()).toBe(true);
    });

    it("should report no color support when level is 0", () => {
      colorLevel(0);
      expect(isColorSupported()).toBe(false);
    });

    it("should allow getting and setting color level", () => {
      colorLevel(3);
      expect(colorLevel()).toBe(3);
      colorLevel(0);
      expect(colorLevel()).toBe(0);
    });
  });

  describe("modifiers", () => {
    it("should apply bold", () => {
      expect(bold("hello")).toBe("\x1b[1mhello\x1b[22m");
    });

    it("should apply dim", () => {
      expect(dim("hello")).toBe("\x1b[2mhello\x1b[22m");
    });

    it("should apply italic", () => {
      expect(italic("hello")).toBe("\x1b[3mhello\x1b[23m");
    });

    it("should apply underline", () => {
      expect(underline("hello")).toBe("\x1b[4mhello\x1b[24m");
    });

    it("should apply inverse", () => {
      expect(inverse("hello")).toBe("\x1b[7mhello\x1b[27m");
    });

    it("should apply hidden", () => {
      expect(hidden("hello")).toBe("\x1b[8mhello\x1b[28m");
    });

    it("should apply strikethrough", () => {
      expect(strikethrough("hello")).toBe("\x1b[9mhello\x1b[29m");
    });
  });

  describe("foreground colors", () => {
    it("should apply red", () => {
      expect(red("hello")).toBe("\x1b[31mhello\x1b[39m");
    });

    it("should apply green", () => {
      expect(green("hello")).toBe("\x1b[32mhello\x1b[39m");
    });

    it("should apply yellow", () => {
      expect(yellow("hello")).toBe("\x1b[33mhello\x1b[39m");
    });

    it("should apply blue", () => {
      expect(blue("hello")).toBe("\x1b[34mhello\x1b[39m");
    });

    it("should apply magenta", () => {
      expect(magenta("hello")).toBe("\x1b[35mhello\x1b[39m");
    });

    it("should apply cyan", () => {
      expect(cyan("hello")).toBe("\x1b[36mhello\x1b[39m");
    });

    it("should apply white", () => {
      expect(white("hello")).toBe("\x1b[37mhello\x1b[39m");
    });

    it("should apply black", () => {
      expect(black("hello")).toBe("\x1b[30mhello\x1b[39m");
    });

    it("should apply gray and grey (identical)", () => {
      expect(gray("hello")).toBe("\x1b[90mhello\x1b[39m");
      expect(grey("hello")).toBe(gray("hello"));
    });
  });

  describe("bright foreground colors", () => {
    it("should apply bright variants", () => {
      expect(redBright("hi")).toBe("\x1b[91mhi\x1b[39m");
      expect(greenBright("hi")).toBe("\x1b[92mhi\x1b[39m");
      expect(yellowBright("hi")).toBe("\x1b[93mhi\x1b[39m");
      expect(blueBright("hi")).toBe("\x1b[94mhi\x1b[39m");
      expect(magentaBright("hi")).toBe("\x1b[95mhi\x1b[39m");
      expect(cyanBright("hi")).toBe("\x1b[96mhi\x1b[39m");
      expect(whiteBright("hi")).toBe("\x1b[97mhi\x1b[39m");
    });
  });

  describe("background colors", () => {
    it("should apply background colors", () => {
      expect(bgRed("hi")).toBe("\x1b[41mhi\x1b[49m");
      expect(bgGreen("hi")).toBe("\x1b[42mhi\x1b[49m");
      expect(bgYellow("hi")).toBe("\x1b[43mhi\x1b[49m");
      expect(bgBlue("hi")).toBe("\x1b[44mhi\x1b[49m");
      expect(bgMagenta("hi")).toBe("\x1b[45mhi\x1b[49m");
      expect(bgCyan("hi")).toBe("\x1b[46mhi\x1b[49m");
      expect(bgWhite("hi")).toBe("\x1b[47mhi\x1b[49m");
      expect(bgBlack("hi")).toBe("\x1b[40mhi\x1b[49m");
      expect(bgGray("hi")).toBe("\x1b[100mhi\x1b[49m");
    });
  });

  describe("NO_COLOR mode", () => {
    it("should return plain text when color level is 0", () => {
      colorLevel(0);
      expect(red("hello")).toBe("hello");
      expect(bold("hello")).toBe("hello");
      expect(bgBlue("hello")).toBe("hello");
    });
  });

  describe("nesting", () => {
    it("should handle nested formatters correctly", () => {
      const result = bold(red("error"));
      expect(result).toContain("\x1b[1m");
      expect(result).toContain("\x1b[31m");
      expect(result).toContain("error");
    });

    it("should preserve inner formatting in nested calls", () => {
      const result = bold(`hello ${red("world")} end`);
      expect(result).toBe("\x1b[1mhello \x1b[31mworld\x1b[39m end\x1b[22m");
    });
  });

  describe("256-color", () => {
    it("should downgrade to a basic 16-color code when level < 2", () => {
      colorLevel(1);
      // 196 (bright red in the cube) maps to bright-red SGR 91, not dropped.
      expect(rgb256(196)("hello")).toBe("\x1b[91mhello\x1b[39m");
    });

    it("should return plain text when color level is 0", () => {
      colorLevel(0);
      expect(rgb256(196)("hello")).toBe("hello");
    });

    it("should apply 256-color when level >= 2", () => {
      colorLevel(2);
      expect(rgb256(196)("hello")).toBe("\x1b[38;5;196mhello\x1b[39m");
    });

    it("should apply 256-color background", () => {
      colorLevel(2);
      expect(bgRgb256(21)("hello")).toBe("\x1b[48;5;21mhello\x1b[49m");
    });
  });

  describe("truecolor", () => {
    it("should downgrade to a 256-color code when level is 2", () => {
      colorLevel(2);
      // rgb(255,0,0) → nearest 256 cube index 196.
      expect(rgb(255, 0, 0)("hello")).toBe("\x1b[38;5;196mhello\x1b[39m");
    });

    it("should downgrade to a basic 16-color code when level is 1", () => {
      colorLevel(1);
      expect(rgb(255, 0, 0)("hello")).toBe("\x1b[91mhello\x1b[39m");
    });

    it("should return plain text when color level is 0", () => {
      colorLevel(0);
      expect(rgb(255, 0, 0)("hello")).toBe("hello");
    });

    it("should apply truecolor when level >= 3", () => {
      colorLevel(3);
      expect(rgb(255, 128, 0)("hello")).toBe("\x1b[38;2;255;128;0mhello\x1b[39m");
    });

    it("should apply truecolor background", () => {
      colorLevel(3);
      expect(bgRgb(0, 0, 255)("hello")).toBe("\x1b[48;2;0;0;255mhello\x1b[49m");
    });
  });

  describe("hex colors", () => {
    it("should parse hex with #", () => {
      colorLevel(3);
      expect(hex("#ff0000")("hello")).toBe("\x1b[38;2;255;0;0mhello\x1b[39m");
    });

    it("should parse hex without #", () => {
      colorLevel(3);
      expect(hex("00ff00")("hello")).toBe("\x1b[38;2;0;255;0mhello\x1b[39m");
    });

    it("should parse hex background", () => {
      colorLevel(3);
      expect(bgHex("#0000ff")("hello")).toBe("\x1b[48;2;0;0;255mhello\x1b[49m");
    });

    it("expands 3-digit shorthand", () => {
      colorLevel(3);
      // #fff → ffffff, #f00 → ff0000
      expect(hex("#fff")("hello")).toBe("\x1b[38;2;255;255;255mhello\x1b[39m");
      expect(hex("f0a")("hello")).toBe("\x1b[38;2;255;0;170mhello\x1b[39m");
    });

    it("throws on invalid hex strings", () => {
      expect(() => hex("xyz")).toThrow(/hex/i); // 3 chars but not all hex digits
      expect(() => hex("#zzzzzz")).toThrow(/hex/i);
      expect(() => hex("#ffff")).toThrow(/hex/i); // 4 digits is neither 3 nor 6
      expect(() => bgHex("not-a-hex")).toThrow(/hex/i);
    });

    it("throws on null/undefined hex inputs", () => {
      expect(() => hex(undefined as unknown as string)).toThrow();
    });
  });

  describe("rgb / rgb256 range validation", () => {
    it("rgb256 throws on values outside 0–255", () => {
      expect(() => rgb256(-1)).toThrow(RangeError);
      expect(() => rgb256(256)).toThrow(RangeError);
      expect(() => rgb256(300)).toThrow(RangeError);
    });

    it("bgRgb256 throws on values outside 0–255", () => {
      expect(() => bgRgb256(-1)).toThrow(RangeError);
      expect(() => bgRgb256(256)).toThrow(RangeError);
    });

    it("rgb throws on any channel outside 0–255", () => {
      expect(() => rgb(-1, 0, 0)).toThrow(RangeError);
      expect(() => rgb(0, 256, 0)).toThrow(RangeError);
      expect(() => rgb(0, 0, 999)).toThrow(RangeError);
    });

    it("bgRgb throws on any channel outside 0–255", () => {
      expect(() => bgRgb(0, 0, 256)).toThrow(RangeError);
    });

    it("rgb256(255) and rgb(255,255,255) still work", () => {
      colorLevel(2);
      expect(rgb256(255)("x")).toBe("\x1b[38;5;255mx\x1b[39m");
      colorLevel(3);
      expect(rgb(255, 255, 255)("x")).toBe("\x1b[38;2;255;255;255mx\x1b[39m");
    });
  });

  describe("compose", () => {
    it("should compose multiple formatters", () => {
      const errorStyle = compose(bold, red);
      const result = errorStyle("error!");
      expect(result).toContain("\x1b[1m");
      expect(result).toContain("\x1b[31m");
      expect(result).toContain("error!");
    });

    it("should apply formatters right-to-left", () => {
      const styled = compose(bold, underline);
      const result = styled("test");
      // bold wraps the outer, underline is inner
      expect(result).toBe(bold(underline("test")));
    });
  });

  describe("stripAnsi", () => {
    it("should remove ANSI codes", () => {
      expect(stripAnsi(red("hello"))).toBe("hello");
    });

    it("should handle nested ANSI codes", () => {
      expect(stripAnsi(bold(red("hello")))).toBe("hello");
    });

    it("should handle plain text", () => {
      expect(stripAnsi("hello")).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(stripAnsi("")).toBe("");
    });
  });

  describe("visibleLength", () => {
    it("should return correct length for colored text", () => {
      expect(visibleLength(red("hello"))).toBe(5);
    });

    it("should return correct length for nested styles", () => {
      expect(visibleLength(bold(cyan("world")))).toBe(5);
    });

    it("should return correct length for plain text", () => {
      expect(visibleLength("hello")).toBe(5);
    });

    it("should ignore OSC 8 hyperlink markup", () => {
      colorLevel(3);
      expect(visibleLength(link("docs", "https://example.com"))).toBe(4);
      expect(stripAnsi(link("docs", "https://example.com"))).toBe("docs");
    });
  });

  describe("rgb→ansi conversions", () => {
    it("maps pure red to 256 cube index 196", () => {
      expect(rgbToAnsi256(255, 0, 0)).toBe(196);
    });

    it("maps grayscale into the 232–255 ramp", () => {
      expect(rgbToAnsi256(128, 128, 128)).toBeGreaterThanOrEqual(232);
      expect(rgbToAnsi256(0, 0, 0)).toBe(16);
      expect(rgbToAnsi256(255, 255, 255)).toBe(231);
    });

    it("maps rgb to a basic SGR code", () => {
      expect(rgbToAnsi16(255, 0, 0)).toBe(91);
      expect(rgbToAnsi16(0, 0, 0)).toBe(30);
    });
  });

  describe("gradient", () => {
    it("paints one truecolor per visible char at level 3", () => {
      colorLevel(3);
      const out = gradient(["#ff0000", "#0000ff"])("ab");
      // 2 chars → endpoints are exactly the two stops.
      expect(out).toBe("\x1b[38;2;255;0;0ma\x1b[39m\x1b[38;2;0;0;255mb\x1b[39m");
    });

    it("accepts rgb tuples and a single stop", () => {
      colorLevel(3);
      expect(gradient([[255, 136, 0]])("hi")).toBe("\x1b[38;2;255;136;0mhi\x1b[39m");
    });

    it("downgrades through the same path as rgb()", () => {
      colorLevel(1);
      const out = gradient(["#ff0000", "#ff0000"])("x");
      expect(stripAnsi(out)).toBe("x");
      expect(out).toContain("\x1b[");
    });

    it("returns plain text at level 0", () => {
      colorLevel(0);
      expect(gradient(["#ff0000", "#0000ff"])("hello")).toBe("hello");
    });

    it("preserves visible length", () => {
      colorLevel(3);
      expect(visibleLength(gradient(["#f00", "#00f"])("hello world"))).toBe(11);
    });

    it("throws when given no stops", () => {
      expect(() => gradient([])).toThrow(/at least one/i);
    });
  });

  describe("link", () => {
    it("emits an OSC 8 sequence when color is supported", () => {
      colorLevel(3);
      expect(link("clif", "https://clif.dev")).toBe("\x1b]8;;https://clif.dev\x07clif\x1b]8;;\x07");
    });

    it("falls back to 'text (url)' at level 0", () => {
      colorLevel(0);
      expect(link("clif", "https://clif.dev")).toBe("clif (https://clif.dev)");
    });

    it("collapses to bare text when label equals url at level 0", () => {
      colorLevel(0);
      expect(link("https://clif.dev", "https://clif.dev")).toBe("https://clif.dev");
    });
  });

  describe("style (chainable)", () => {
    it("acts as identity with no styles", () => {
      expect(style("hello")).toBe("hello");
    });

    it("stacks named modifiers and colors", () => {
      expect(style.red("hello")).toBe(red("hello"));
      expect(style.bold.red("hello")).toBe(bold(red("hello")));
      expect(style.red.bold("hello")).toBe(red(bold("hello")));
    });

    it("supports background + foreground", () => {
      expect(style.bgBlue.white(" hi ")).toBe(bgBlue(white(" hi ")));
    });

    it("supports extended-color methods", () => {
      colorLevel(3);
      expect(style.hex("#ff8800")("x")).toBe(hex("#ff8800")("x"));
      expect(style.rgb(255, 136, 0).bold("x")).toBe(rgb(255, 136, 0)(bold("x")));
      expect(style.ansi256(208)("x")).toBe(rgb256(208)("x"));
    });

    it("produces immutable, reusable builders", () => {
      const heading = style.bold.cyan;
      expect(heading("a")).toBe(bold(cyan("a")));
      // Branching off the same builder must not mutate it.
      const alt = heading.underline;
      expect(alt("a")).toBe(bold(cyan(underline("a"))));
      expect(heading("b")).toBe(bold(cyan("b")));
    });

    it("respects NO_COLOR (level 0)", () => {
      colorLevel(0);
      expect(style.red.bold("hello")).toBe("hello");
    });
  });
});
