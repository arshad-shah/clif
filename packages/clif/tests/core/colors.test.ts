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
  gray,
  green,
  greenBright,
  grey,
  hex,
  hidden,
  inverse,
  isColorSupported,
  italic,
  magenta,
  magentaBright,
  red,
  redBright,
  rgb,
  rgb256,
  strikethrough,
  stripAnsi,
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
    it("should return plain text when color level < 2", () => {
      colorLevel(1);
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
    it("should return plain text when color level < 3", () => {
      colorLevel(2);
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
  });
});
