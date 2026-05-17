import { describe, expect, it } from "vitest";
import {
  dedent,
  formatBytes,
  formatDuration,
  indent,
  truncate,
  wordWrap,
} from "../../src/utils/helpers.js";

// ── truncate ────────────────────────────────────────────────────────────────

describe("truncate", () => {
  it("returns text unchanged if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns text unchanged if exactly at limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates with ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
  });

  it("uses custom suffix", () => {
    expect(truncate("hello world", 8, "...")).toBe("hello...");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("handles very short max", () => {
    expect(truncate("hello", 2)).toBe("h…");
  });
});

// ── wordWrap ────────────────────────────────────────────────────────────────

describe("wordWrap", () => {
  it("wraps text at specified width", () => {
    const result = wordWrap("hello world foo bar", 11);
    const lines = result.split("\n");
    expect(lines[0]).toBe("hello world");
    expect(lines[1]).toBe("foo bar");
  });

  it("does not wrap short text", () => {
    expect(wordWrap("hello", 20)).toBe("hello");
  });

  it("handles single long word", () => {
    const result = wordWrap("superlongword", 5);
    // Single word exceeds width but can't be broken
    expect(result).toContain("superlongword");
  });

  it("handles empty string", () => {
    expect(wordWrap("", 10)).toBe("");
  });

  it("wraps each word individually at width 1", () => {
    const result = wordWrap("a b c", 1);
    const lines = result.split("\n").filter(Boolean);
    expect(lines).toEqual(["a", "b", "c"]);
  });
});

// ── indent ──────────────────────────────────────────────────────────────────

describe("indent", () => {
  it("indents single line", () => {
    expect(indent("hello", 4)).toBe("    hello");
  });

  it("indents multiple lines", () => {
    const result = indent("a\nb\nc", 2);
    expect(result).toBe("  a\n  b\n  c");
  });

  it("indent of 0 is identity", () => {
    expect(indent("hello", 0)).toBe("hello");
  });
});

// ── dedent ──────────────────────────────────────────────────────────────────

describe("dedent", () => {
  it("removes common leading whitespace", () => {
    const result = dedent(`
      hello
      world
    `);
    expect(result).toBe("hello\nworld");
  });

  it("preserves relative indentation", () => {
    const result = dedent(`
      parent
        child
    `);
    expect(result).toBe("parent\n  child");
  });

  it("handles mixed indentation levels", () => {
    const result = dedent(`
        deep
      shallow
    `);
    expect(result).toBe("  deep\nshallow");
  });

  it("handles empty string", () => {
    expect(dedent("")).toBe("");
  });
});

// ── formatBytes ─────────────────────────────────────────────────────────────

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1_048_576)).toBe("1.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1_073_741_824)).toBe("1.0 GB");
  });

  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats fractional sizes", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});

// ── formatDuration ──────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(250)).toBe("250ms");
  });

  it("formats seconds", () => {
    expect(formatDuration(3500)).toBe("3.5s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125_000)).toBe("2m 5s");
  });

  it("formats exactly 1 minute", () => {
    expect(formatDuration(60_000)).toBe("1m 0s");
  });

  it("formats 0ms", () => {
    expect(formatDuration(0)).toBe("0ms");
  });

  it("formats just under 1 second", () => {
    expect(formatDuration(999)).toBe("999ms");
  });
});
