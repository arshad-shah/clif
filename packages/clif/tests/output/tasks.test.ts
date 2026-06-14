import { describe, expect, it, vi } from "vitest";
import { colorLevel, stripAnsi } from "../../src/core/colors.js";
import { createTaskList } from "../../src/output/tasks.js";

// Deterministic, color-on output; non-TTY stream unless a test opts into TTY.
function makeStream(isTTY = false) {
  const chunks: string[] = [];
  const stream = {
    write: (s: string) => {
      chunks.push(s);
      return true;
    },
    isTTY,
  } as unknown as NodeJS.WritableStream;
  return { chunks, stream, out: () => stripAnsi(chunks.join("")) };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createTaskList", () => {
  it("runs top-level tasks sequentially in order", async () => {
    colorLevel(1);
    const { stream } = makeStream();
    const order: string[] = [];
    const result = await createTaskList(
      [
        { title: "first", task: () => void order.push("first") },
        { title: "second", task: () => void order.push("second") },
      ],
      { stream },
    ).run();
    expect(order).toEqual(["first", "second"]);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("runs a parent task then its embedded children", async () => {
    const { stream, out } = makeStream();
    const order: string[] = [];
    await createTaskList(
      [
        {
          title: "build",
          task: () => void order.push("build"),
          children: [
            { title: "lint", task: () => void order.push("lint") },
            { title: "typecheck", task: () => void order.push("typecheck") },
          ],
        },
      ],
      { stream },
    ).run();
    expect(order).toEqual(["build", "lint", "typecheck"]);
    // children render indented beneath the parent
    const settled = out()
      .split("\n")
      .find((l) => l.includes("lint"))!;
    expect(settled.startsWith("  ")).toBe(true);
  });

  it("skips a task when skip() returns a reason and does not run it", async () => {
    const { stream, out } = makeStream();
    const fn = vi.fn();
    const result = await createTaskList([{ title: "deploy", task: fn, skip: () => "dry run" }], {
      stream,
    }).run();
    expect(fn).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(out()).toContain("dry run");
    expect(out()).toContain("⊘");
  });

  it("stops on the first failure by default and rejects", async () => {
    const { stream } = makeStream();
    const second = vi.fn();
    const list = createTaskList(
      [
        {
          title: "boom",
          task: () => {
            throw new Error("kaboom");
          },
        },
        { title: "after", task: second },
      ],
      { stream },
    );
    await expect(list.run()).rejects.toThrow(/kaboom/);
    expect(second).not.toHaveBeenCalled();
  });

  it("continues past failures with continueOnError and reports them", async () => {
    const { stream, out } = makeStream();
    const second = vi.fn();
    const result = await createTaskList(
      [
        {
          title: "boom",
          task: () => {
            throw new Error("kaboom");
          },
        },
        { title: "after", task: second },
      ],
      { stream, continueOnError: true },
    ).run();
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.title).toBe("boom");
    expect(out()).toContain("✖");
    expect(out()).toContain("✔");
  });

  it("runs sibling children concurrently when concurrent is set", async () => {
    const { stream } = makeStream();
    const order: string[] = [];
    await createTaskList(
      [
        {
          title: "group",
          concurrent: true,
          children: [
            {
              title: "a",
              task: async () => {
                order.push("a-start");
                await tick();
                order.push("a-end");
              },
            },
            {
              title: "b",
              task: async () => {
                order.push("b-start");
                await tick();
                order.push("b-end");
              },
            },
          ],
        },
      ],
      { stream },
    ).run();
    // Concurrent: both start before either finishes.
    expect(order.slice(0, 2).sort()).toEqual(["a-start", "b-start"]);
  });

  it("reflects a live label update in TTY output", async () => {
    const { stream, out } = makeStream(true);
    await createTaskList(
      [
        {
          title: "build",
          task: async (t) => {
            t.update("compiling…");
            await tick();
          },
        },
      ],
      { stream },
    ).run();
    expect(out()).toContain("compiling…");
  });

  it("animates the spinner frame across ticks on a running step (TTY)", async () => {
    vi.useFakeTimers();
    const { stream, out } = makeStream(true);
    let resolveTask!: () => void;
    const p = createTaskList(
      [
        {
          title: "work",
          task: () =>
            new Promise<void>((r) => {
              resolveTask = r;
            }),
        },
      ],
      { stream, interval: 10 },
    ).run();
    await vi.advanceTimersByTimeAsync(35); // ~3 animation ticks while still running
    resolveTask();
    await p;
    vi.useRealTimers();
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const seen = frames.filter((f) => out().includes(f));
    // More than one distinct frame proves the animation advanced.
    expect(seen.length).toBeGreaterThan(1);
  });

  it("does not emit cursor-control sequences in non-TTY", async () => {
    const { chunks, stream } = makeStream(false);
    await createTaskList([{ title: "x", task: () => {} }], { stream }).run();
    const raw = chunks.join("");
    expect(raw.includes("\x1b[?25l")).toBe(false); // no cursor hide
    expect(raw.includes("\x1b[1A")).toBe(false); // no cursor-up repaint
  });
});
