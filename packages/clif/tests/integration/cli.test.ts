import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { colorLevel } from "../../src/core/colors.js";
import { createCLI } from "../../src/core/command.js";

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
      handler: (ctx) => {
        raw = ctx.rawArgs;
      },
    });

    await cli.run({ argv: ["--foo", "bar"] });
    expect(raw).toEqual(["--foo", "bar"]);
  });
});
