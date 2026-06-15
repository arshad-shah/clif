import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { colorLevel } from "../../src/core/colors.js";
import { createList, createTextInput, createViewport } from "../../src/tui/components.js";
import type { Key } from "../../src/tui/keys.js";

beforeEach(() => colorLevel(0));
afterEach(() => colorLevel(1));

const k = (name: Key["name"], extra: Partial<Key> = {}): Key => ({
  name,
  ctrl: false,
  shift: false,
  raw: "",
  ...extra,
});

describe("createList", () => {
  it("moves the selection with arrows and clamps at the ends", () => {
    const list = createList({ items: ["a", "b", "c"] });
    expect(list.selectedIndex).toBe(0);
    expect(list.handleKey(k("down"))).toBe(true);
    expect(list.selected).toBe("b");
    list.handleKey(k("up"));
    list.handleKey(k("up")); // already at top — clamps
    expect(list.selectedIndex).toBe(0);
    list.handleKey(k("end"));
    expect(list.selected).toBe("c");
  });

  it("ignores keys it does not handle", () => {
    const list = createList({ items: ["a", "b"] });
    expect(list.handleKey(k("char", { char: "x" }))).toBe(false);
  });

  it("scrolls the viewport to keep the selection visible", () => {
    const list = createList({ items: ["a", "b", "c", "d", "e"], height: 2 });
    expect(list.render().split("\n")).toHaveLength(2);
    list.handleKey(k("end")); // jump to last
    const lines = list.render().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines.some((l) => l.includes("e"))).toBe(true);
    expect(lines.some((l) => l.includes("a"))).toBe(false);
  });

  it("marks the active row with the pointer", () => {
    const list = createList({ items: ["a", "b"] });
    expect(list.render().split("\n")[0]).toContain("❯");
  });

  it("re-clamps the selection when items shrink", () => {
    const list = createList({ items: ["a", "b", "c"], selectedIndex: 2 });
    list.setItems(["x"]);
    expect(list.selectedIndex).toBe(0);
    expect(list.selected).toBe("x");
  });

  it("renders an empty placeholder", () => {
    const list = createList<string>({ items: [] });
    expect(list.render()).toContain("empty");
  });
});

describe("createViewport", () => {
  it("shows a fixed window and scrolls within bounds", () => {
    const vp = createViewport({ content: ["1", "2", "3", "4"], height: 2 });
    expect(vp.render().split("\n")).toEqual(["1", "2"]);
    vp.handleKey(k("down"));
    expect(vp.render().split("\n")).toEqual(["2", "3"]);
    vp.handleKey(k("end"));
    expect(vp.scroll).toBe(2); // 4 lines - height 2
    vp.handleKey(k("down")); // clamp
    expect(vp.scroll).toBe(2);
  });

  it("pads short content to the full height", () => {
    const vp = createViewport({ content: "only", height: 3 });
    expect(vp.render().split("\n")).toEqual(["only", "", ""]);
  });
});

describe("createTextInput", () => {
  it("inserts characters at the cursor", () => {
    const input = createTextInput();
    input.handleKey(k("char", { char: "h" }));
    input.handleKey(k("char", { char: "i" }));
    expect(input.value).toBe("hi");
    expect(input.cursor).toBe(2);
  });

  it("moves the cursor and inserts in the middle", () => {
    const input = createTextInput({ value: "ac" });
    input.handleKey(k("left"));
    input.handleKey(k("char", { char: "b" }));
    expect(input.value).toBe("abc");
  });

  it("backspaces and deletes", () => {
    const input = createTextInput({ value: "abc" });
    input.handleKey(k("backspace"));
    expect(input.value).toBe("ab");
    input.handleKey(k("home"));
    input.handleKey(k("delete"));
    expect(input.value).toBe("b");
  });

  it("renders a placeholder while empty", () => {
    const input = createTextInput({ placeholder: "name" });
    // colorLevel(0) strips the inverse caret styling, leaving plain text.
    expect(input.render()).toBe("name");
  });
});
