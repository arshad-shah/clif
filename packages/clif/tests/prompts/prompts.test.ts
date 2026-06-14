import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { colorLevel } from "../../src/core/colors.js";
import {
  PromptError,
  __testing,
  confirm,
  multiselect,
  number,
  password,
  select,
  text,
} from "../../src/prompts/prompts.js";

beforeEach(() => colorLevel(0));
afterEach(() => colorLevel(1));

/**
 * Build a fake TTY-like stdin + a writable stderr we can inspect.
 * Tests script the input by calling `pushKey` after kicking off the prompt.
 */
function fakeStdio(opts: { isTTY?: boolean } = {}) {
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

  const chunks: string[] = [];
  const stderr = {
    write: (s: string) => {
      chunks.push(s);
      return true;
    },
    isTTY,
  } as unknown as NodeJS.WritableStream;

  function pushKey(s: string) {
    stdin.emit("data", Buffer.from(s));
  }

  function pushLine(s: string) {
    // Simulate readline line event by pushing data then newline.
    stdin.emit("line", s);
  }

  return {
    stdio: { stdin, stderr } as Parameters<typeof __testing.setStdio>[0],
    chunks,
    pushKey,
    pushLine,
  };
}

describe("password", () => {
  it("rejects non-TTY stdin with a clear error", async () => {
    const { stdio } = fakeStdio({ isTTY: false });
    __testing.setStdio(stdio);
    await expect(password({ message: "secret" })).rejects.toBeInstanceOf(PromptError);
    __testing.resetStdio();
  });

  it("emits one mask glyph per visible character on paste", async () => {
    const { stdio, chunks, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = password({ message: "secret" });
    // Simulate a paste of 5 chars in one chunk
    pushKey("abcde");
    pushKey("\r");
    const value = await p;
    __testing.resetStdio();
    expect(value).toBe("abcde");
    // The visible mask output should contain 5 dots (default mask).
    const masks = chunks.join("").split("●").length - 1;
    expect(masks).toBeGreaterThanOrEqual(5);
  });

  it("supports backspace correctly after multi-char paste", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = password({ message: "secret" });
    pushKey("abcd");
    pushKey("\x7f"); // backspace
    pushKey("\r");
    const value = await p;
    __testing.resetStdio();
    expect(value).toBe("abc");
  });
});

describe("text", () => {
  it("trims input and returns value on Enter", async () => {
    const { stdio, pushLine } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    // For text prompt we use readline.line, but our stub wires .on('line')
    const p = text({ message: "name" });
    pushLine("  alice  ");
    expect(await p).toBe("alice");
    __testing.resetStdio();
  });
});

describe("confirm", () => {
  it("rejects with PromptError on Ctrl+C", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = confirm({ message: "go?" });
    pushKey("\x03"); // Ctrl+C
    await expect(p).rejects.toBeInstanceOf(PromptError);
    __testing.resetStdio();
  });

  it("returns true on y", async () => {
    const { stdio, pushLine } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = confirm({ message: "go?" });
    pushLine("y");
    expect(await p).toBe(true);
    __testing.resetStdio();
  });

  it("accepts a single keypress without requiring Enter", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = confirm({ message: "go?" });
    pushKey("y");
    expect(await p).toBe(true);
    __testing.resetStdio();
  });

  it("returns false on a single 'n' keypress", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = confirm({ message: "go?", default: true });
    pushKey("n");
    expect(await p).toBe(false);
    __testing.resetStdio();
  });

  it("returns the default when Enter is pressed with no choice", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = confirm({ message: "go?", default: true });
    pushKey("\r");
    expect(await p).toBe(true);
    __testing.resetStdio();
  });
});

describe("select", () => {
  it("does NOT treat Space as confirm", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = select({
      message: "pick",
      options: [
        { label: "a", value: "a" },
        { label: "b", value: "b" },
      ],
    });
    pushKey(" "); // should be ignored
    pushKey("\x1b[B"); // down to b
    pushKey("\r"); // enter
    expect(await p).toBe("b");
    __testing.resetStdio();
  });

  it("rejects with PromptError on Ctrl+C", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = select({
      message: "pick",
      options: [{ label: "a", value: "a" }],
    });
    pushKey("\x03");
    await expect(p).rejects.toBeInstanceOf(PromptError);
    __testing.resetStdio();
  });

  it("resolves the focused option on Enter and honors the default", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = select({
      message: "pick",
      options: [
        { label: "a", value: "a" },
        { label: "b", value: "b" },
        { label: "c", value: "c" },
      ],
      default: "b",
    });
    pushKey("\r"); // confirm the default (b)
    expect(await p).toBe("b");
    __testing.resetStdio();
  });

  it("skips disabled options when moving the cursor", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = select({
      message: "pick",
      options: [
        { label: "a", value: "a" },
        { label: "b", value: "b", disabled: true },
        { label: "c", value: "c" },
      ],
    });
    pushKey("\x1b[B"); // down from a, skipping disabled b → c
    pushKey("\r");
    expect(await p).toBe("c");
    __testing.resetStdio();
  });
});

describe("multiselect toggle-all", () => {
  it("selects every enabled option with 'a', then confirms", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = multiselect({
      message: "pick",
      options: [
        { label: "a", value: "a" },
        { label: "b", value: "b" },
      ],
    });
    pushKey("a"); // toggle all on
    pushKey("\r");
    expect(await p).toEqual(["a", "b"]);
    __testing.resetStdio();
  });
});

describe("number step", () => {
  it("rejects values that are not multiples of step, then accepts a multiple", async () => {
    const { stdio, chunks, pushLine } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = number({ message: "n", min: 0, max: 100, step: 5 });
    pushLine("7"); // not a multiple of 5 — should re-prompt with an error
    // Let the validation reject + re-prompt re-attach its "line" listener
    // before we push the next value.
    await new Promise((r) => setImmediate(r));
    pushLine("10");
    const value = await p;
    __testing.resetStdio();
    expect(value).toBe(10);
    expect(chunks.join("").toLowerCase()).toMatch(/multiple of 5|step/);
  });

  it("accepts a value with step undefined", async () => {
    const { stdio, pushLine } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = number({ message: "n", min: 0, max: 100 });
    pushLine("7");
    expect(await p).toBe(7);
    __testing.resetStdio();
  });

  it("steps the value up by `step` on the up arrow", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = number({ message: "n", default: 10, step: 5, max: 100 });
    pushKey("\x1b[A"); // up → 15
    pushKey("\r"); // submit
    expect(await p).toBe(15);
    __testing.resetStdio();
  });

  it("steps down and clamps to min", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = number({ message: "n", default: 2, step: 5, min: 0 });
    pushKey("\x1b[B"); // down → -3, clamped to 0
    pushKey("\r");
    expect(await p).toBe(0);
    __testing.resetStdio();
  });

  it("accepts typed digits then Enter", async () => {
    const { stdio, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = number({ message: "n" });
    pushKey("4");
    pushKey("2");
    pushKey("\r");
    expect(await p).toBe(42);
    __testing.resetStdio();
  });
});

describe("multiselect", () => {
  it("shows a visible error and blocks Enter when min not met", async () => {
    const { stdio, chunks, pushKey } = fakeStdio({ isTTY: true });
    __testing.setStdio(stdio);
    const p = multiselect({
      message: "pick",
      options: [
        { label: "a", value: "a" },
        { label: "b", value: "b" },
      ],
      min: 1,
    });
    pushKey("\r"); // try to confirm with 0 selected
    // Now select one and confirm.
    pushKey(" ");
    pushKey("\r");
    await p;
    __testing.resetStdio();
    const out = chunks.join("");
    expect(out).toMatch(/select at least 1/i);
  });
});
