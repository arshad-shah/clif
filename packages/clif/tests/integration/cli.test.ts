import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { colorLevel } from "../../src/core/colors.js";
import { createCLI, defineCommand } from "../../src/core/command.js";

beforeEach(() => colorLevel(0)); // Disable colors for clean output
afterEach(() => colorLevel(1));

describe("createCLI integration", () => {
  it("runs a simple command handler", async () => {
    const handler = vi.fn();
    const cli = createCLI({
      name: "test",
      handler,
    });

    await cli.run({ argv: [] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("passes parsed flags to handler", async () => {
    let received: any;
    const cli = createCLI({
      name: "test",
      args: {
        name: { type: "string", alias: "n", description: "Name" },
        verbose: { type: "boolean", alias: "v" },
      },
      handler: (ctx) => {
        received = ctx.args;
      },
    });

    await cli.run({ argv: ["--name", "alice", "-v"] });
    expect(received.flags.name).toBe("alice");
    expect(received.flags.verbose).toBe(true);
  });

  it("resolves subcommands", async () => {
    const addHandler = vi.fn();
    const cli = createCLI({
      name: "git",
      commands: [
        {
          name: "add",
          description: "Add files",
          handler: addHandler,
        },
      ],
    });

    await cli.run({ argv: ["add"] });
    expect(addHandler).toHaveBeenCalledTimes(1);
  });

  it("resolves nested subcommands", async () => {
    const handler = vi.fn();
    const cli = createCLI({
      name: "tool",
      commands: [
        {
          name: "config",
          commands: [
            {
              name: "set",
              handler,
            },
          ],
        },
      ],
    });

    await cli.run({ argv: ["config", "set"] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("passes flags to subcommands", async () => {
    let received: any;
    const cli = createCLI({
      name: "app",
      commands: [
        {
          name: "deploy",
          args: {
            env: { type: "string", default: "staging" },
          },
          handler: (ctx) => {
            received = ctx.args;
          },
        },
      ],
    });

    await cli.run({ argv: ["deploy", "--env", "production"] });
    expect(received.flags.env).toBe("production");
  });

  it("runs setup hook before handler", async () => {
    const order: string[] = [];
    const cli = createCLI({
      name: "app",
      setup: () => {
        order.push("setup");
      },
      handler: () => {
        order.push("handler");
      },
    });

    await cli.run({ argv: [] });
    expect(order).toEqual(["setup", "handler"]);
  });

  it("populates meta bag for middleware-style composition", async () => {
    let meta: Record<string, unknown> = {};
    const cli = createCLI({
      name: "app",
      setup: (ctx) => {
        ctx.meta.user = "admin";
      },
      handler: (ctx) => {
        meta = ctx.meta;
      },
    });

    await cli.run({ argv: [] });
    expect(meta.user).toBe("admin");
  });

  it("prints help on --help flag", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cli = createCLI({
      name: "myapp",
      description: "My awesome app",
      args: {
        port: { type: "number", alias: "p", description: "Port number" },
      },
    });

    await cli.run({ argv: ["--help"] });
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("My awesome app");
    expect(output).toContain("--port");
    expect(output).toContain("Port number");
    spy.mockRestore();
  });

  it("prints version on --version flag", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cli = createCLI({
      name: "myapp",
      version: "2.5.0",
    });

    await cli.run({ argv: ["--version"] });
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("2.5.0");
    spy.mockRestore();
  });

  it("calls onError for handler errors", async () => {
    const onError = vi.fn();
    const cli = createCLI({
      name: "app",
      handler: () => {
        throw new Error("boom");
      },
    });

    await cli.run({ argv: [], onError });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0].message).toBe("boom");
  });

  it("writes error to stderr by default", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const cli = createCLI({
      name: "app",
      handler: () => {
        throw new Error("unhandled");
      },
    });

    await cli.run({ argv: [] });
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("unhandled");
    spy.mockRestore();
  });

  it("shows subcommand list when no handler and has subcommands", async () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const cli = createCLI({
      name: "tool",
      commands: [
        { name: "init", description: "Initialize project" },
        { name: "build", description: "Build project" },
      ],
    });

    await cli.run({ argv: [] });
    const output = spy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("init");
    expect(output).toContain("build");
    spy.mockRestore();
  });

  it("provides rawArgs in context", async () => {
    let raw: string[] = [];
    const cli = createCLI({
      name: "app",
      args: { foo: { type: "string" } },
      handler: (ctx) => {
        raw = ctx.rawArgs;
      },
    });

    await cli.run({ argv: ["--foo", "bar"] });
    expect(raw).toEqual(["--foo", "bar"]);
  });

  describe("help/version aliases", () => {
    it("prints help on -h", async () => {
      const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const cli = createCLI({ name: "myapp", description: "App" });
      await cli.run({ argv: ["-h"] });
      const output = spy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("App");
      spy.mockRestore();
    });

    it("prints version on -v", async () => {
      const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const cli = createCLI({ name: "myapp", version: "1.2.3" });
      await cli.run({ argv: ["-v"] });
      const output = spy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("1.2.3");
      spy.mockRestore();
    });

    it("does NOT shadow user-defined -v on a flag with same alias", async () => {
      let received: unknown;
      const cli = createCLI({
        name: "myapp",
        version: "1.0.0",
        args: { verbose: { type: "boolean", alias: "v" } },
        handler: (ctx) => {
          received = ctx.args.flags.verbose;
        },
      });
      await cli.run({ argv: ["-v"] });
      expect(received).toBe(true);
    });

    it("lists --help and --version in help output", async () => {
      const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      const cli = createCLI({ name: "myapp", version: "1.0.0" });
      await cli.run({ argv: ["--help"] });
      const output = spy.mock.calls.map((c) => c[0]).join("");
      expect(output).toContain("--help");
      expect(output).toContain("--version");
      spy.mockRestore();
    });
  });

  describe("unknown subcommand", () => {
    it("errors when an unknown subcommand is given", async () => {
      const onError = vi.fn();
      const cli = createCLI({
        name: "git",
        commands: [{ name: "add", handler: () => {} }],
      });
      await cli.run({ argv: ["buidl"], onError });
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0]![0].message).toMatch(/Unknown command: buidl/);
    });

    it("suggests close matches via did-you-mean", async () => {
      const onError = vi.fn();
      const cli = createCLI({
        name: "git",
        commands: [
          { name: "build", handler: () => {} },
          { name: "clean", handler: () => {} },
        ],
      });
      await cli.run({ argv: ["buidl"], onError });
      expect(onError.mock.calls[0]![0].message).toMatch(/build/);
    });

    it("does not error when first positional is consumed and root has handler", async () => {
      const handler = vi.fn();
      const cli = createCLI({ name: "app", handler });
      await cli.run({ argv: ["somefile.txt"] });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe("parent chain in context", () => {
    it("exposes ancestors via ctx.parents", async () => {
      let parents: string[] = [];
      const cli = createCLI({
        name: "tool",
        commands: [
          {
            name: "config",
            commands: [
              {
                name: "set",
                handler: (ctx) => {
                  parents = ctx.parents.map((p) => p.name);
                },
              },
            ],
          },
        ],
      });
      await cli.run({ argv: ["config", "set"] });
      expect(parents).toEqual(["tool", "config"]);
    });
  });

  describe("defineCommand helper", () => {
    it("returns the command definition unchanged for type inference", () => {
      const cmd = defineCommand({ name: "x", handler: () => {} });
      expect(cmd.name).toBe("x");
    });
  });

  describe("error formatting", () => {
    it("formats ArgError with a friendly prefix", async () => {
      const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const cli = createCLI({
        name: "app",
        args: { port: { type: "number" } },
      });
      await cli.run({ argv: ["--port", "abc"] });
      const output = spy.mock.calls.map((c) => c[0]).join("");
      expect(output).toMatch(/Expected number.*--port/);
      spy.mockRestore();
    });

    it("sets process.exitCode to 1 on unhandled error", async () => {
      const prev = process.exitCode;
      const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const cli = createCLI({
        name: "app",
        handler: () => {
          throw new Error("boom");
        },
      });
      await cli.run({ argv: [] });
      expect(process.exitCode).toBe(1);
      process.exitCode = prev;
      spy.mockRestore();
    });
  });
});
