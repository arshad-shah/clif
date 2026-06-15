import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { colorLevel } from "../../src/core/colors.js";
import { createRenderer } from "../../src/tui/renderer.js";

beforeEach(() => colorLevel(0));
afterEach(() => colorLevel(1));

function collector() {
  const writes: string[] = [];
  return { writes, write: (s: string) => writes.push(s) };
}

describe("createRenderer", () => {
  it("paints every row on the first frame", () => {
    const { writes, write } = collector();
    const r = createRenderer(write);
    r.paint("a\nb", 80);
    const out = writes.join("");
    expect(out).toContain("a");
    expect(out).toContain("b");
    // Each row is cursor-addressed.
    expect(out).toContain("\x1b[1;1H");
    expect(out).toContain("\x1b[2;1H");
  });

  it("rewrites only the rows that changed", () => {
    const { writes, write } = collector();
    const r = createRenderer(write);
    r.paint("a\nb\nc", 80);
    writes.length = 0;
    r.paint("a\nX\nc", 80); // only row 2 changed
    const out = writes.join("");
    expect(out).toContain("\x1b[2;1H");
    expect(out).toContain("X");
    expect(out).not.toContain("\x1b[1;1H");
    expect(out).not.toContain("\x1b[3;1H");
  });

  it("writes nothing when the frame is unchanged", () => {
    const { writes, write } = collector();
    const r = createRenderer(write);
    r.paint("a\nb", 80);
    writes.length = 0;
    r.paint("a\nb", 80);
    expect(writes.join("")).toBe("");
  });

  it("erases trailing rows when the frame shrinks", () => {
    const { writes, write } = collector();
    const r = createRenderer(write);
    r.paint("a\nb\nc", 80);
    writes.length = 0;
    r.paint("a", 80);
    expect(writes.join("")).toContain("\x1b[2;1H\x1b[J");
  });

  it("clamps lines wider than the terminal", () => {
    const { writes, write } = collector();
    const r = createRenderer(write);
    r.paint("abcdef", 3);
    expect(writes.join("")).toContain("abc");
    expect(writes.join("")).not.toContain("abcdef");
  });

  it("reset() forces a full repaint", () => {
    const { writes, write } = collector();
    const r = createRenderer(write);
    r.paint("a\nb", 80);
    writes.length = 0;
    r.reset();
    r.paint("a\nb", 80);
    expect(writes.join("")).toContain("\x1b[1;1H");
  });
});
