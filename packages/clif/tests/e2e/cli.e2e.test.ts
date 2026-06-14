/**
 * End-to-end tests for the `kit` example CLI.
 *
 * Spawns the built CLI as a child process and asserts on the real
 * stdout/stderr/exit code. This is the only suite that exercises the
 * library through the same code path a published consumer would.
 *
 * Excluded from the default `vitest run` (see vitest.config.ts) so the
 * unit suite stays fast; run with `pnpm test:e2e`.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..", "..");
const exampleDir = resolve(repoRoot, "packages", "example");
const kitEntry = resolve(exampleDir, "src", "index.ts");
const clifDist = resolve(repoRoot, "packages", "clif", "dist", "index.mjs");

interface RunResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function run(args: string[], opts: { input?: string } = {}): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    // Run from the example package so `--import tsx` resolves from the
    // package that actually depends on tsx.
    const child = spawn("node", ["--import", "tsx", kitEntry, ...args], {
      cwd: exampleDir,
      // NO_COLOR keeps assertions stable; FORCE_COLOR=0 doubles down.
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => {
      stdout += b.toString();
    });
    child.stderr.on("data", (b) => {
      stderr += b.toString();
    });
    if (opts.input !== undefined) {
      child.stdin.write(opts.input);
      child.stdin.end();
    }
    child.on("close", (code) => resolvePromise({ stdout, stderr, code }));
  });
}

describe("kit CLI end-to-end", () => {
  beforeAll(() => {
    if (!existsSync(clifDist)) {
      throw new Error(
        `clif dist not found at ${clifDist}. Run \`pnpm build\` before \`pnpm test:e2e\`.`,
      );
    }
    if (!existsSync(kitEntry)) {
      throw new Error(`kit entry not found at ${kitEntry}.`);
    }
  });

  it("prints the top-level banner when invoked with no args", async () => {
    const r = await run([]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("kit");
    expect(r.stdout).toContain("clif e2e harness");
  });

  it("prints help on --help", async () => {
    const r = await run(["--help"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Usage:");
    expect(r.stdout).toContain("Commands:");
    expect(r.stdout).toContain("demo");
    expect(r.stdout).toContain("prompt");
    expect(r.stdout).toContain("args");
  });

  it("prints version on --version", async () => {
    const r = await run(["--version"]);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe("0.0.0");
  });

  it("routes to a subcommand and parses flags, positionals, and the -- separator", async () => {
    const r = await run([
      "args",
      "build",
      "src/index.ts",
      "test.ts",
      "--port",
      "3000",
      "-v",
      "--",
      "--passthrough",
    ]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("port");
    expect(r.stdout).toContain("3000");
    expect(r.stdout).toContain("verbose");
    // Typed positionals are surfaced on ctx.args.values (named + variadic).
    expect(r.stdout).toContain("named positionals");
    expect(r.stdout).toContain('"command":"build"');
    expect(r.stdout).toContain("src/index.ts");
    expect(r.stdout).toContain("test.ts");
    expect(r.stdout).toContain("after `--`");
    expect(r.stdout).toContain("--passthrough");
    // The setup hook runs before the handler and stamps ctx.meta.
    expect(r.stdout).toContain("setup stamped ctx.meta.startedAt");
  });

  it("accumulates a repeatable (multiple) flag into an array", async () => {
    const r = await run(["args", "build", "-t", "a", "-t", "b", "--tag", "c"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("tag");
    expect(r.stdout).toContain("a, b, c");
  });

  it("shows (none) for an omitted repeatable flag", async () => {
    const r = await run(["args", "build"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/tag\s+\(none\)/);
  });

  it("renders typed positionals in --help with -h reaching help (no host alias shadow)", async () => {
    const r = await run(["args", "-h"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Usage:");
    expect(r.stdout).toContain("Arguments:");
    expect(r.stdout).toContain("command");
    expect(r.stdout).toContain("files");
  });

  it("rejects an invalid flag choice with a clear error and non-zero exit", async () => {
    const r = await run(["args", "build", "--env", "qa"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Invalid value");
    expect(r.stderr).toContain("--env");
  });

  it("rejects an invalid positional choice against the schema", async () => {
    const r = await run(["args", "frobnicate"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Invalid value");
    expect(r.stderr).toContain("command");
  });

  it("errors on bad number coercion with the parser-supplied message", async () => {
    const r = await run(["args", "--port", "not-a-number"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/Expected number/);
    expect(r.stderr).toContain("--port");
  });

  it("errors on unknown flag", async () => {
    const r = await run(["args", "--nonsense"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Unknown flag");
    expect(r.stderr).toContain("nonsense");
  });

  it("runs a non-interactive renderer demo", async () => {
    const r = await run(["demo", "box"]);
    expect(r.code).toBe(0);
    // Box output should contain at least one border glyph.
    expect(r.stdout).toMatch(/[╭╰┌└╔╚┏┗]/);
  });

  it("renders the enriched table demo (alignment, wrapping, borderless)", async () => {
    const r = await run(["demo", "table"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Package");
    expect(r.stdout).toContain("Version");
    // The borderless/compact variant prints the HTTP method/status rows.
    expect(r.stdout).toContain("Method");
    expect(r.stdout).toContain("Status");
  });

  it("renders both bulleted and ordered lists", async () => {
    const r = await run(["demo", "tree"]);
    expect(r.code).toBe(0);
    // Ordered list emits numeric markers; bulleted list emits its content.
    expect(r.stdout).toContain("Zero dependencies");
    expect(r.stdout).toMatch(/1\.\s+Define commands/);
  });

  it("runs the task-runner demo with nesting, skip, and error collection", async () => {
    const r = await run(["demo", "tasks"]);
    expect(r.code).toBe(0);
    // Task lines render to stderr (the task list's default stream).
    expect(r.stderr).toContain("Install dependencies");
    expect(r.stderr).toContain("Quality checks");
    // skip() reason and a collected failure (continueOnError) both surface.
    expect(r.stderr).toContain("dry run");
    expect(r.stderr).toContain("simulated failure");
  });

  it("runs the utilities demo (wrapping + human-readable formatting)", async () => {
    const r = await run(["demo", "utils"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("wordWrap");
    expect(r.stdout).toContain("1.5 KB"); // formatBytes(1536)
    expect(r.stdout).toContain("1h 1m 1s"); // formatDuration(3_661_000)
    expect(r.stdout).toContain("stripAnsi");
  });
});
