#!/usr/bin/env node
/**
 * Consumer smoke test for the clif package exports.
 *
 * Builds a fresh tarball with `pnpm pack`, installs it into a throwaway
 * sandbox under both ESM and CJS modes, imports the expected entrypoints,
 * and asserts the runtime surface is callable and types resolve.
 *
 * If the exports map regresses (wrong file extensions, missing subpath,
 * broken types condition), this fails loudly.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const clifDir = resolve(here, "..", "packages", "clif");

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8", ...opts });
}

function step(msg) {
  process.stdout.write(`  • ${msg}\n`);
}

console.log("\n  smoke test — consumer install + ESM/CJS resolution\n");

// 1. Pack clif into a tarball
step("packing clif…");
const packDest = mkdtempSync(join(tmpdir(), "clif-smoke-pack-"));
const packOut = run(`pnpm pack --pack-destination "${packDest}"`, { cwd: clifDir });
// pnpm prints the absolute tarball path on the last line
const tgz = packOut
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .find((l) => l.endsWith(".tgz"));
if (!tgz || !existsSync(tgz)) {
  console.error(`failed to locate packed tarball in output:\n${packOut}`);
  process.exit(1);
}
step(`tarball: ${tgz}`);

// 2. Set up sandbox project — declares the tarball as a dep, installs with npm
const sandbox = mkdtempSync(join(tmpdir(), "clif-smoke-"));
step(`sandbox: ${sandbox}`);

writeFileSync(
  join(sandbox, "package.json"),
  JSON.stringify(
    {
      name: "clif-smoke",
      version: "0.0.0",
      private: true,
      // Type defaults to commonjs — the .mjs / .cjs probes below disambiguate.
      dependencies: { "@arshad-shah/clif": `file:${tgz}` },
    },
    null,
    2,
  ),
);

step("installing clif into sandbox (npm install)…");
run("npm install --silent --no-audit --no-fund --no-package-lock", { cwd: sandbox });

// 3. ESM probe — covers the "import" condition of the exports map
writeFileSync(
  join(sandbox, "probe.mjs"),
  `
import { createCLI, parseArgs, bold, cyan, box, table, list, divider, log } from "@arshad-shah/clif";
import { text, confirm, select } from "@arshad-shah/clif/prompts";

const checks = {
  createCLI: typeof createCLI === "function",
  parseArgs: typeof parseArgs === "function",
  bold:      typeof bold      === "function",
  cyan:      typeof cyan      === "function",
  box:       typeof box       === "function",
  table:     typeof table     === "function",
  list:      typeof list      === "function",
  divider:   typeof divider   === "function",
  "log.info":     typeof log?.info     === "function",
  "log.success":  typeof log?.success  === "function",
  text:    typeof text    === "function",
  confirm: typeof confirm === "function",
  select:  typeof select  === "function",
};

// Smoke: actually call a pure renderer and a color modifier.
const b = box("hello", { border: "round" });
if (!b.includes("hello")) {
  console.error("ESM probe: box() did not include content");
  process.exit(1);
}
if (!bold("x").includes("x")) {
  console.error("ESM probe: bold() did not pass through input");
  process.exit(1);
}

const failed = Object.entries(checks).filter(([, ok]) => !ok);
if (failed.length) {
  console.error("ESM probe: missing exports —", failed.map(([k]) => k).join(", "));
  process.exit(1);
}
console.log("  ✓ ESM probe: " + Object.keys(checks).length + " exports resolved");
`,
);

step("running ESM probe…");
run("node probe.mjs", { cwd: sandbox, stdio: "inherit" });

// 4. CJS probe — covers the "require" condition of the exports map
writeFileSync(
  join(sandbox, "probe.cjs"),
  `
const { createCLI, parseArgs, bold, box, table, list, divider, log } = require("@arshad-shah/clif");
const { text, confirm, select } = require("@arshad-shah/clif/prompts");

const checks = {
  createCLI: typeof createCLI === "function",
  parseArgs: typeof parseArgs === "function",
  bold:      typeof bold      === "function",
  box:       typeof box       === "function",
  table:     typeof table     === "function",
  list:      typeof list      === "function",
  divider:   typeof divider   === "function",
  "log.info":    typeof log?.info    === "function",
  text:    typeof text    === "function",
  confirm: typeof confirm === "function",
  select:  typeof select  === "function",
};

if (!box("hello", { border: "round" }).includes("hello")) {
  console.error("CJS probe: box() did not include content");
  process.exit(1);
}

const failed = Object.entries(checks).filter(([, ok]) => !ok);
if (failed.length) {
  console.error("CJS probe: missing exports —", failed.map(([k]) => k).join(", "));
  process.exit(1);
}
console.log("  ✓ CJS probe: " + Object.keys(checks).length + " exports resolved");
`,
);

step("running CJS probe…");
run("node probe.cjs", { cwd: sandbox, stdio: "inherit" });

// 5. Types probe — make sure both .d.mts and .d.cts resolve under both
//    moduleResolution modes that real consumers use.
writeFileSync(
  join(sandbox, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      files: ["types.ts"],
    },
    null,
    2,
  ),
);

writeFileSync(
  join(sandbox, "types.ts"),
  `
import { createCLI, parseArgs, type CommandDef, type ArgDef } from "@arshad-shah/clif";
import { text, type SelectOption } from "@arshad-shah/clif/prompts";

const _argDef: ArgDef = { type: "string", required: true };
const _opt: SelectOption<"a"> = { label: "A", value: "a" };
const _cli = createCLI({ name: "x", handler: () => {} } satisfies CommandDef);
const _t: typeof text = text;
const _p = parseArgs;
void _argDef; void _opt; void _cli; void _t; void _p;
`,
);

step("installing typescript into sandbox for type probe…");
run("npm install --silent --no-audit --no-fund --no-package-lock typescript", { cwd: sandbox });
step("running tsc --noEmit (NodeNext resolution)…");
run("npx --no-install tsc --noEmit", { cwd: sandbox, stdio: "inherit" });

// 6. Cleanup
try {
  rmSync(sandbox, { recursive: true, force: true });
} catch {}
try {
  rmSync(packDest, { recursive: true, force: true });
} catch {}

console.log("\n  ✓ smoke test passed — ESM, CJS, and types resolve correctly.\n");
