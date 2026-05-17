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

  it("routes to a subcommand and parses flags", async () => {
    const r = await run(["args", "--port", "3000", "-v", "file.txt", "--", "--passthrough"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("port");
    expect(r.stdout).toContain("3000");
    expect(r.stdout).toContain("verbose");
    expect(r.stdout).toContain("positional");
    expect(r.stdout).toContain("file.txt");
    expect(r.stdout).toContain("after `--`");
    expect(r.stdout).toContain("--passthrough");
  });

  it("rejects an invalid choice with a clear error and non-zero exit", async () => {
    const r = await run(["args", "--env", "qa"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("Invalid value");
    expect(r.stderr).toContain("--env");
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
});
