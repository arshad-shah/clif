import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { colorLevel } from "../../src/core/colors.js";
import { TuiError, __testing, createApp } from "../../src/tui/app.js";

beforeEach(() => colorLevel(0));
afterEach(() => {
  colorLevel(1);
  __testing.resetStdio();
});

/** A fake TTY stdin/stdout pair we can script and inspect. */
function fakeStdio(opts: { isTTY?: boolean; cols?: number; rows?: number } = {}) {
  const isTTY = opts.isTTY ?? true;
  const stdin = new EventEmitter() as EventEmitter & {
    isTTY: boolean;
    isRaw: boolean;
    setRawMode: (b: boolean) => void;
    resume: () => void;
    pause: () => void;
  };
  stdin.isTTY = isTTY;
  stdin.isRaw = false;
  stdin.setRawMode = (b: boolean) => {
    stdin.isRaw = b;
  };
  stdin.resume = () => {};
  stdin.pause = () => {};

  const writes: string[] = [];
  const stdout = new EventEmitter() as EventEmitter & {
    write: (s: string) => boolean;
    isTTY: boolean;
    columns: number;
    rows: number;
  };
  stdout.write = (s: string) => {
    writes.push(s);
    return true;
  };
  stdout.isTTY = isTTY;
  stdout.columns = opts.cols ?? 80;
  stdout.rows = opts.rows ?? 24;

  return {
    stdio: { stdin, stdout } as Parameters<typeof __testing.setStdio>[0],
    stdin,
    stdout,
    writes,
    pushKey: (s: string) => stdin.emit("data", Buffer.from(s)),
  };
}

describe("createApp", () => {
  it("throws on a non-TTY stdin", () => {
    const { stdio } = fakeStdio({ isTTY: false });
    __testing.setStdio(stdio);
    expect(() => createApp({ render: () => "x" }).run()).toThrowError(TuiError);
  });

  it("enters the alternate screen and paints the first frame", () => {
    const { stdio, writes } = fakeStdio();
    __testing.setStdio(stdio);
    const app = createApp({ render: () => "hello", onKey: (_k, a) => a.exit() });
    void app.run();
    const out = writes.join("");
    expect(out).toContain("\x1b[?1049h"); // alt screen enter
    expect(out).toContain("\x1b[?25l"); // cursor hide
    expect(out).toContain("hello");
  });

  it("routes keys and resolves run() with the exit code", async () => {
    const { stdio, pushKey } = fakeStdio();
    __testing.setStdio(stdio);
    const app = createApp({
      render: () => "menu",
      onKey: (key, a) => {
        if (key.char === "q") a.exit(7);
      },
    });
    const p = app.run();
    pushKey("q");
    expect(await p).toBe(7);
  });

  it("exits on Ctrl+C even without a handler", async () => {
    const { stdio, pushKey } = fakeStdio();
    __testing.setStdio(stdio);
    const app = createApp({ render: () => "x" });
    const p = app.run();
    pushKey("\x03");
    expect(await p).toBe(130);
  });

  it("restores the terminal on exit", async () => {
    const { stdio, writes, pushKey } = fakeStdio();
    __testing.setStdio(stdio);
    const app = createApp({ render: () => "x", onKey: (_k, a) => a.exit() });
    const p = app.run();
    writes.length = 0;
    pushKey(" ");
    await p;
    const out = writes.join("");
    expect(out).toContain("\x1b[?1049l"); // alt screen exit
    expect(out).toContain("\x1b[?25h"); // cursor show
  });

  it("updates size and repaints on resize", async () => {
    const { stdio, stdout, pushKey } = fakeStdio({ cols: 80 });
    __testing.setStdio(stdio);
    let observed = 0;
    const app = createApp({
      render: () => "x",
      onResize: (size) => {
        observed = size.cols;
      },
      onKey: (_k, a) => a.exit(),
    });
    const p = app.run();
    stdout.columns = 120;
    stdout.emit("resize");
    expect(observed).toBe(120);
    pushKey(" ");
    await p;
  });

  it("coalesces rerender() calls into a single paint", async () => {
    vi.useFakeTimers();
    try {
      const { stdio, writes, pushKey } = fakeStdio();
      __testing.setStdio(stdio);
      let count = 0;
      const app = createApp({
        fps: 60,
        render: () => `count ${count}`,
        onKey: (key, a) => {
          if (key.name === "down") {
            count++;
            a.rerender();
            a.rerender(); // second call within the frame is a no-op
          }
          if (key.char === "q") a.exit();
        },
      });
      const p = app.run();
      writes.length = 0;
      pushKey("\x1b[B"); // down
      vi.advanceTimersByTime(20);
      expect(writes.join("")).toContain("count 1");
      pushKey("q");
      await p;
    } finally {
      vi.useRealTimers();
    }
  });
});
