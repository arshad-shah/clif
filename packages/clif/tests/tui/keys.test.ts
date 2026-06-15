import { describe, expect, it } from "vitest";
import { createKeyDecoder } from "../../src/tui/keys.js";

describe("createKeyDecoder", () => {
  it("decodes printable characters", () => {
    const d = createKeyDecoder();
    expect(d.push("a")).toEqual([{ name: "char", char: "a", ctrl: false, shift: false, raw: "a" }]);
  });

  it("decodes arrow keys", () => {
    const d = createKeyDecoder();
    expect(d.push("\x1b[A").map((k) => k.name)).toEqual(["up"]);
    expect(d.push("\x1b[B").map((k) => k.name)).toEqual(["down"]);
    expect(d.push("\x1b[C").map((k) => k.name)).toEqual(["right"]);
    expect(d.push("\x1b[D").map((k) => k.name)).toEqual(["left"]);
  });

  it("decodes application-cursor-mode sequences", () => {
    const d = createKeyDecoder();
    expect(d.push("\x1bOA").map((k) => k.name)).toEqual(["up"]);
  });

  it("decodes home/end/page/delete", () => {
    const d = createKeyDecoder();
    expect(d.push("\x1b[H\x1b[F\x1b[5~\x1b[6~\x1b[3~").map((k) => k.name)).toEqual([
      "home",
      "end",
      "pageup",
      "pagedown",
      "delete",
    ]);
  });

  it("decodes shift-tab as backtab", () => {
    const d = createKeyDecoder();
    expect(d.push("\x1b[Z")).toEqual([
      { name: "backtab", ctrl: false, shift: true, raw: "\x1b[Z" },
    ]);
  });

  it("reassembles an escape sequence split across chunks", () => {
    const d = createKeyDecoder();
    expect(d.push("\x1b")).toEqual([]); // incomplete — buffered
    expect(d.push("[")).toEqual([]); // still incomplete
    expect(d.push("A").map((k) => k.name)).toEqual(["up"]);
  });

  it("surfaces a lone Escape followed by another key", () => {
    const d = createKeyDecoder();
    // ESC then a printable char that can't continue a sequence.
    expect(d.push("\x1ba").map((k) => k.name)).toEqual(["escape", "char"]);
  });

  it("decodes control combinations as ctrl+letter", () => {
    const d = createKeyDecoder();
    expect(d.push("\x03")).toEqual([
      { name: "char", char: "c", ctrl: true, shift: false, raw: "\x03" },
    ]);
  });

  it("decodes enter, tab, backspace, space", () => {
    const d = createKeyDecoder();
    expect(d.push("\r\t\x7f ").map((k) => k.name)).toEqual(["enter", "tab", "backspace", "space"]);
  });

  it("decodes a multi-key chunk in order", () => {
    const d = createKeyDecoder();
    expect(d.push("ab\x1b[Bc").map((k) => k.name)).toEqual(["char", "char", "down", "char"]);
  });
});
