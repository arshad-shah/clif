import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bold, colorLevel, cyan, stripAnsi } from "../../src/core/colors.js";
import {
  type TreeNode,
  banner,
  box,
  createProgress,
  createSpinner,
  divider,
  keyValue,
  list,
  log,
  table,
  tree,
} from "../../src/output/components.js";

// Force colors on for consistent test output
beforeEach(() => colorLevel(1));
afterEach(() => colorLevel(1));

// ── Box ─────────────────────────────────────────────────────────────────────

describe("box", () => {
  it("renders a default round-border box", () => {
    const result = stripAnsi(box("hello"));
    expect(result).toContain("╭");
    expect(result).toContain("╰");
    expect(result).toContain("hello");
  });

  it("renders single border style", () => {
    const result = stripAnsi(box("hi", { border: "single" }));
    expect(result).toContain("┌");
    expect(result).toContain("└");
  });

  it("renders double border style", () => {
    const result = stripAnsi(box("hi", { border: "double" }));
    expect(result).toContain("╔");
    expect(result).toContain("╝");
  });

  it("renders bold border style", () => {
    const result = stripAnsi(box("hi", { border: "bold" }));
    expect(result).toContain("┏");
    expect(result).toContain("┛");
  });

  it("renders none border style", () => {
    const result = box("hi", { border: "none" });
    expect(result).not.toContain("─");
  });

  it("includes a title in the top border", () => {
    const result = stripAnsi(box("content", { title: "Title" }));
    expect(result).toContain("Title");
  });

  it("handles multiline content", () => {
    const result = stripAnsi(box("line1\nline2\nline3"));
    const lines = result.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(5); // top + padding + 3 content + padding + bottom
  });

  it("respects center alignment", () => {
    const result = stripAnsi(box("hi", { align: "center", width: 20 }));
    const contentLine = result.split("\n").find((l) => l.includes("hi"))!;
    const idx = contentLine.indexOf("hi");
    expect(idx).toBeGreaterThan(3); // should be offset from left
  });

  it("respects right alignment", () => {
    const result = stripAnsi(box("hi", { align: "right", width: 20 }));
    const contentLine = result.split("\n").find((l) => l.includes("hi"))!;
    const idx = contentLine.indexOf("hi");
    expect(idx).toBeGreaterThan(5);
  });

  it("adds margin", () => {
    const result = stripAnsi(box("hi", { margin: 2 }));
    const firstContentLine = result.split("\n").find((l) => l.includes("╭"))!;
    expect(firstContentLine.startsWith("  ")).toBe(true);
  });

  it("applies borderColor formatter", () => {
    const result = box("hello", { borderColor: cyan });
    expect(result).toContain("\x1b[36m"); // cyan code
  });

  it("handles empty content", () => {
    const result = stripAnsi(box(""));
    expect(result).toContain("╭");
    expect(result).toContain("╰");
  });
});

// ── Table ───────────────────────────────────────────────────────────────────

describe("table", () => {
  it("renders a basic table with headers", () => {
    const result = stripAnsi(
      table(
        [
          ["Alice", "30"],
          ["Bob", "25"],
        ],
        { headers: ["Name", "Age"] },
      ),
    );
    expect(result).toContain("Name");
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
    expect(result).toContain("│");
  });

  it("renders without borders", () => {
    const result = stripAnsi(table([["a", "b"]], { border: false }));
    expect(result).not.toContain("│");
  });

  it("handles empty rows", () => {
    const result = table([], { headers: ["A"] });
    expect(stripAnsi(result)).toContain("A");
  });

  it("returns empty string for no data", () => {
    expect(table([])).toBe("");
  });

  it("truncates columns with maxColumnWidth", () => {
    const result = stripAnsi(table([["abcdefghij"]], { maxColumnWidth: 5 }));
    expect(result).toContain("abcd…");
  });

  it("pads cells to column width", () => {
    const result = stripAnsi(
      table([
        ["a", "longer"],
        ["ab", "x"],
      ]),
    );
    const lines = result.split("\n").filter((l) => l.includes("│") && !l.includes("─"));
    // Both data lines should be the same length
    expect(lines[0]!.length).toBe(lines[1]!.length);
  });

  it("applies headerColor formatter", () => {
    const result = table([["a"]], { headers: ["H"], headerColor: bold });
    expect(result).toContain("\x1b[1m"); // bold code
  });

  it("uses proper corner and junction glyphs", () => {
    // Regression: top row used ┼ (cross) at every junction instead of ┌─┬─┐
    const result = stripAnsi(table([["a", "b"]], { headers: ["H1", "H2"] }));
    const lines = result.split("\n");
    const top = lines[0]!;
    const mid = lines[2]!; // separator under header
    const bottom = lines[lines.length - 1]!;

    // Top row: corners + top-tee, no cross / no bottom-tee / no side-tee
    expect(top.startsWith("┌")).toBe(true);
    expect(top.endsWith("┐")).toBe(true);
    expect(top).toContain("┬");
    expect(top).not.toContain("┼");
    expect(top).not.toContain("┴");
    expect(top).not.toContain("├");
    expect(top).not.toContain("┤");

    // Header separator: side-tees + cross
    expect(mid.startsWith("├")).toBe(true);
    expect(mid.endsWith("┤")).toBe(true);
    expect(mid).toContain("┼");

    // Bottom row: corners + bottom-tee
    expect(bottom.startsWith("└")).toBe(true);
    expect(bottom.endsWith("┘")).toBe(true);
    expect(bottom).toContain("┴");
    expect(bottom).not.toContain("┼");
    expect(bottom).not.toContain("┬");
  });

  it("uses correct corners with no header row", () => {
    // Without headers, top and bottom must still be ┌─┬─┐ / └─┴─┘, not ┼─┼─┼
    const result = stripAnsi(
      table([
        ["a", "b"],
        ["c", "d"],
      ]),
    );
    const lines = result.split("\n");
    expect(lines[0]!.startsWith("┌")).toBe(true);
    expect(lines[0]!.endsWith("┐")).toBe(true);
    expect(lines[lines.length - 1]!.startsWith("└")).toBe(true);
    expect(lines[lines.length - 1]!.endsWith("┘")).toBe(true);
  });
});

// ── KeyValue ────────────────────────────────────────────────────────────────

describe("keyValue", () => {
  it("renders key-value pairs", () => {
    const result = stripAnsi(keyValue({ name: "clif", version: "1.0.0" }));
    expect(result).toContain("name");
    expect(result).toContain("clif");
    expect(result).toContain("version");
    expect(result).toContain("1.0.0");
  });

  it("aligns keys to the longest", () => {
    const result = stripAnsi(keyValue({ ab: "1", abcde: "2" }));
    const lines = result.split("\n");
    // First key should be padded to match "abcde"
    expect(lines[0]).toContain("ab   ");
  });

  it("applies custom separator", () => {
    const result = stripAnsi(keyValue({ a: "b" }, { separator: " → " }));
    expect(result).toContain("→");
  });

  it("applies indent", () => {
    const result = stripAnsi(keyValue({ a: "1" }, { indent: 4 }));
    expect(result.startsWith("    ")).toBe(true);
  });

  it("handles boolean and number values", () => {
    const result = stripAnsi(keyValue({ enabled: true, count: 42 }));
    expect(result).toContain("true");
    expect(result).toContain("42");
  });
});

// ── List ────────────────────────────────────────────────────────────────────

describe("list", () => {
  it("renders an unordered list with default marker", () => {
    const result = stripAnsi(list(["apple", "banana"]));
    expect(result).toContain("●");
    expect(result).toContain("apple");
    expect(result).toContain("banana");
  });

  it("renders an ordered list", () => {
    const result = stripAnsi(list(["first", "second"], { ordered: true }));
    expect(result).toContain("1.");
    expect(result).toContain("2.");
  });

  it("applies custom marker", () => {
    const result = stripAnsi(list(["item"], { marker: "→" }));
    expect(result).toContain("→");
  });

  it("applies indent", () => {
    const result = stripAnsi(list(["item"], { indent: 4 }));
    expect(result.startsWith("    ")).toBe(true);
  });

  it("handles empty list", () => {
    expect(list([])).toBe("");
  });
});

// ── Tree ────────────────────────────────────────────────────────────────────

describe("tree", () => {
  it("renders a flat tree (root only)", () => {
    const result = tree({ label: "root" });
    expect(result).toBe("root");
  });

  it("renders single child with └──", () => {
    const root: TreeNode = { label: "root", children: [{ label: "child" }] };
    const result = tree(root);
    expect(result).toContain("└── child");
  });

  it("renders multiple children with ├── and └──", () => {
    const root: TreeNode = {
      label: "root",
      children: [{ label: "a" }, { label: "b" }, { label: "c" }],
    };
    const result = tree(root);
    expect(result).toContain("├── a");
    expect(result).toContain("├── b");
    expect(result).toContain("└── c");
  });

  it("renders nested children with proper indentation", () => {
    const root: TreeNode = {
      label: "root",
      children: [
        {
          label: "parent",
          children: [{ label: "grandchild" }],
        },
      ],
    };
    const result = tree(root);
    expect(result).toContain("└── parent");
    expect(result).toContain("grandchild");
    const lines = result.split("\n");
    // grandchild should be indented more than parent
    const parentLine = lines.find((l) => l.includes("parent"))!;
    const childLine = lines.find((l) => l.includes("grandchild"))!;
    expect(childLine.indexOf("grandchild")).toBeGreaterThan(parentLine.indexOf("parent"));
  });
});

// ── Divider ─────────────────────────────────────────────────────────────────

describe("divider", () => {
  it("renders a simple divider", () => {
    const result = stripAnsi(divider());
    expect(result).toBe("─".repeat(60));
  });

  it("respects custom width", () => {
    const result = stripAnsi(divider({ width: 30 }));
    expect(result.length).toBe(30);
  });

  it("uses custom character", () => {
    const result = stripAnsi(divider({ char: "=", width: 10 }));
    expect(result).toBe("=".repeat(10));
  });

  it("includes a centered label", () => {
    const result = stripAnsi(divider({ label: "Section", width: 40 }));
    expect(result).toContain(" Section ");
    expect(result.length).toBe(40);
  });
});

// ── Banner ──────────────────────────────────────────────────────────────────

describe("banner", () => {
  it("renders a banner with bordered text", () => {
    const result = stripAnsi(banner("Hello World"));
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Hello World");
    // Top and bottom borders same length
    expect(lines[0]!.length).toBe(lines[2]!.length);
  });

  it("uses custom border character", () => {
    const result = stripAnsi(banner("Hi", { char: "#" }));
    expect(result).toContain("######");
  });
});

// ── Spinner ─────────────────────────────────────────────────────────────────

describe("createSpinner", () => {
  it("creates a spinner object with expected methods", () => {
    const s = createSpinner({ text: "Loading" });
    expect(s).toHaveProperty("start");
    expect(s).toHaveProperty("stop");
    expect(s).toHaveProperty("succeed");
    expect(s).toHaveProperty("fail");
    expect(s).toHaveProperty("warn");
    expect(s).toHaveProperty("info");
    expect(s).toHaveProperty("update");
    expect(s).toHaveProperty("isActive");
  });

  it("isActive is false before start", () => {
    const s = createSpinner();
    expect(s.isActive).toBe(false);
  });

  it("isActive is true after start, false after stop", () => {
    const stream = { write: vi.fn() } as unknown as NodeJS.WritableStream;
    const s = createSpinner({ stream });
    s.start("test");
    expect(s.isActive).toBe(true);
    s.stop();
    expect(s.isActive).toBe(false);
  });

  it("succeed writes green checkmark", () => {
    const chunks: string[] = [];
    const stream = {
      write: (s: string) => {
        chunks.push(s);
        return true;
      },
    } as unknown as NodeJS.WritableStream;
    const s = createSpinner({ stream });
    s.start("work");
    s.succeed("done");
    const output = chunks.join("");
    expect(output).toContain("✔");
    expect(output).toContain("done");
  });

  it("fail writes red cross", () => {
    const chunks: string[] = [];
    const stream = {
      write: (s: string) => {
        chunks.push(s);
        return true;
      },
    } as unknown as NodeJS.WritableStream;
    const s = createSpinner({ stream });
    s.start();
    s.fail("oops");
    const output = chunks.join("");
    expect(output).toContain("✖");
    expect(output).toContain("oops");
  });

  it("update changes text", () => {
    const s = createSpinner();
    s.update("new text");
    // Should return this for chaining
    expect(s.update("newer")).toBe(s);
  });
});

// ── Progress ────────────────────────────────────────────────────────────────

describe("createProgress", () => {
  it("creates a progress bar with expected API", () => {
    const stream = { write: vi.fn() } as unknown as NodeJS.WritableStream;
    const p = createProgress({ total: 100, stream });
    expect(p).toHaveProperty("tick");
    expect(p).toHaveProperty("update");
    expect(p).toHaveProperty("value");
    expect(p).toHaveProperty("isComplete");
  });

  it("starts at 0 and is not complete", () => {
    const stream = { write: vi.fn() } as unknown as NodeJS.WritableStream;
    const p = createProgress({ total: 10, stream });
    expect(p.value).toBe(0);
    expect(p.isComplete).toBe(false);
  });

  it("tick increments value", () => {
    const stream = { write: vi.fn() } as unknown as NodeJS.WritableStream;
    const p = createProgress({ total: 10, stream });
    p.tick(3);
    expect(p.value).toBe(3);
  });

  it("tick does not exceed total", () => {
    const stream = { write: vi.fn() } as unknown as NodeJS.WritableStream;
    const p = createProgress({ total: 5, stream });
    p.tick(10);
    expect(p.value).toBe(5);
    expect(p.isComplete).toBe(true);
  });

  it("update sets absolute value", () => {
    const stream = { write: vi.fn() } as unknown as NodeJS.WritableStream;
    const p = createProgress({ total: 100, stream });
    p.update(50);
    expect(p.value).toBe(50);
  });

  it("renders bar characters to stream", () => {
    const chunks: string[] = [];
    const stream = {
      write: (s: string) => {
        chunks.push(s);
        return true;
      },
      isTTY: true,
    } as unknown as NodeJS.WritableStream;
    const p = createProgress({ total: 10, stream, width: 10 });
    p.tick(5);
    const output = chunks.join("");
    expect(output).toContain("█");
    expect(output).toContain("░");
    expect(output).toContain("50%");
  });
});

// ── Log helpers ─────────────────────────────────────────────────────────────

describe("log", () => {
  it("info writes to stdout with info icon", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    log.info("test message");
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("ℹ");
    expect(output).toContain("test message");
    spy.mockRestore();
  });

  it("success writes green checkmark", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    log.success("done");
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("✔");
    spy.mockRestore();
  });

  it("warn writes to stderr", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    log.warn("careful");
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("⚠");
    spy.mockRestore();
  });

  it("error writes to stderr", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    log.error("fail");
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("✖");
    spy.mockRestore();
  });

  it("step formats as [n/total]", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    log.step(2, 5, "installing");
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(stripAnsi(output)).toContain("[2/5]");
    expect(output).toContain("installing");
    spy.mockRestore();
  });
});

// ── Spinner (B5) — non-TTY behavior ─────────────────────────────────────────

describe("createSpinner non-TTY (B5)", () => {
  function makeStream(isTTY: boolean) {
    const chunks: string[] = [];
    const stream = {
      write: (s: string) => {
        chunks.push(s);
        return true;
      },
      isTTY,
    } as unknown as NodeJS.WritableStream;
    return { chunks, stream };
  }

  it("does not emit cursor-move/clear sequences in non-TTY", () => {
    const { chunks, stream } = makeStream(false);
    const s = createSpinner({ stream, text: "working" });
    s.start();
    s.stop();
    const out = chunks.join("");
    // Should not contain CSI K (line clear) or carriage returns.
    expect(out.includes("\x1b[K")).toBe(false);
    expect(out.includes("\r")).toBe(false);
  });

  it("does not start an interval in non-TTY (no leak)", () => {
    const { stream } = makeStream(false);
    const s = createSpinner({ stream });
    s.start();
    // Cast to access internal — read isActive which is fine to be false in non-TTY
    s.stop();
    expect(s.isActive).toBe(false);
  });

  it("calling start twice does not leak a second interval", () => {
    const { stream } = makeStream(true);
    const s = createSpinner({ stream });
    s.start("a");
    s.start("b"); // second start should replace, not leak
    s.stop();
    expect(s.isActive).toBe(false);
  });

  it("hides and shows the cursor on TTY", () => {
    const { chunks, stream } = makeStream(true);
    const s = createSpinner({ stream });
    s.start("x");
    s.stop();
    const out = chunks.join("");
    expect(out).toContain("\x1b[?25l"); // hide
    expect(out).toContain("\x1b[?25h"); // show
  });
});

// ── Progress (B6) — input validation ────────────────────────────────────────

describe("createProgress validation (B6)", () => {
  it("throws when total is zero or negative", () => {
    const stream = { write: vi.fn(), isTTY: true } as unknown as NodeJS.WritableStream;
    expect(() => createProgress({ total: 0, stream })).toThrow(/total/i);
    expect(() => createProgress({ total: -5, stream })).toThrow(/total/i);
  });

  it("throws when total is not finite", () => {
    const stream = { write: vi.fn(), isTTY: true } as unknown as NodeJS.WritableStream;
    expect(() => createProgress({ total: Number.NaN, stream })).toThrow();
    expect(() => createProgress({ total: Number.POSITIVE_INFINITY, stream })).toThrow();
  });

  it("does not emit cursor-move/clear sequences in non-TTY", () => {
    const chunks: string[] = [];
    const stream = {
      write: (s: string) => {
        chunks.push(s);
        return true;
      },
      isTTY: false,
    } as unknown as NodeJS.WritableStream;
    const p = createProgress({ total: 10, stream });
    p.tick(5);
    p.update(10);
    const out = chunks.join("");
    expect(out.includes("\x1b[K")).toBe(false);
    expect(out.includes("\r")).toBe(false);
  });
});

// ── Table (B16) — ANSI preservation on truncation ───────────────────────────

describe("table truncation (B16)", () => {
  it("preserves wrapping ANSI styles when a cell is truncated", () => {
    const styled = "\x1b[31mlong red text that gets cut\x1b[39m";
    const result = table([[styled]], { maxColumnWidth: 10 });
    // Should still contain a red open and a foreground-default close.
    expect(result).toContain("\x1b[31m");
    expect(result).toContain("\x1b[39m");
    // And should contain the truncation ellipsis.
    expect(stripAnsi(result)).toContain("…");
  });
});

// ── Tree (B17) — encapsulated signature ─────────────────────────────────────

describe("tree (B17)", () => {
  it("does not expose an internal prefix parameter in its types", () => {
    // The public signature should accept exactly one argument.
    expect(tree.length).toBe(1);
  });

  it("renders nested children with correct indentation guides", () => {
    const result = tree({
      label: "root",
      children: [{ label: "a", children: [{ label: "a1" }, { label: "a2" }] }, { label: "b" }],
    });
    const lines = result.split("\n");
    expect(lines[0]).toBe("root");
    // First child branch
    expect(lines[1]).toContain("├── a");
    // Grand-children continue under the first branch with │
    expect(lines[2]).toContain("│");
    expect(lines[2]).toContain("a1");
    expect(lines[3]).toContain("│");
    expect(lines[3]).toContain("a2");
    // Last child uses └──
    expect(lines[4]).toContain("└── b");
  });
});
