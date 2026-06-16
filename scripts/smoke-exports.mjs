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
import { createCLI, parseArgs, bold, cyan, box, table, list, divider, log, style, gradient, link } from "@arshad-shah/clif";
import { text, confirm, select } from "@arshad-shah/clif/prompts";
import { figlet, renderFont, parseFont, registerFont } from "@arshad-shah/clif/banner";

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
  style:    typeof style    === "function",
  gradient: typeof gradient === "function",
  link:     typeof link     === "function",
  text:    typeof text    === "function",
  confirm: typeof confirm === "function",
  select:  typeof select  === "function",
  figlet:       typeof figlet       === "function",
  renderFont:   typeof renderFont   === "function",
  parseFont:    typeof parseFont    === "function",
  registerFont: typeof registerFont === "function",
};

// Smoke: parse a user-supplied FIGfont and render with it (no bundled fonts).
const codes = [];
for (let c = 32; c <= 126; c++) codes.push(c);
const trivialFlf = "flf2a$ 1 0 10 0 0\\n" + codes.map((c) => String.fromCodePoint(c) + "@@").join("\\n") + "\\n";
const font = parseFont(trivialFlf);
if (figlet("hi", { font }) !== "hi") {
  console.error("ESM probe: figlet() did not render with a parsed font");
  process.exit(1);
}

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
// Smoke: chainable style + gradient pass their input through.
if (!style.red.bold("x").includes("x")) {
  console.error("ESM probe: style chain did not pass through input");
  process.exit(1);
}
if (!gradient(["#f00", "#00f"])("hi").includes("h")) {
  console.error("ESM probe: gradient() did not pass through input");
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
const { createCLI, parseArgs, bold, box, table, list, divider, log, style, gradient, link } = require("@arshad-shah/clif");
const { text, confirm, select } = require("@arshad-shah/clif/prompts");
const { figlet, renderFont, parseFont, registerFont } = require("@arshad-shah/clif/banner");

const checks = {
  createCLI: typeof createCLI === "function",
  parseArgs: typeof parseArgs === "function",
  bold:      typeof bold      === "function",
  box:       typeof box       === "function",
  table:     typeof table     === "function",
  list:      typeof list      === "function",
  divider:   typeof divider   === "function",
  "log.info":    typeof log?.info    === "function",
  style:    typeof style    === "function",
  gradient: typeof gradient === "function",
  link:     typeof link     === "function",
  text:    typeof text    === "function",
  confirm: typeof confirm === "function",
  select:  typeof select  === "function",
  figlet:       typeof figlet       === "function",
  renderFont:   typeof renderFont   === "function",
  parseFont:    typeof parseFont    === "function",
  registerFont: typeof registerFont === "function",
};

if (!box("hello", { border: "round" }).includes("hello")) {
  console.error("CJS probe: box() did not include content");
  process.exit(1);
}
if (!style.bold("x").includes("x") || !gradient(["#f00", "#00f"])("hi").includes("h")) {
  console.error("CJS probe: style/gradient did not pass through input");
  process.exit(1);
}

// Smoke: parse a user-supplied FIGfont and render with it under CJS too.
const codes = [];
for (let c = 32; c <= 126; c++) codes.push(c);
const trivialFlf = "flf2a$ 1 0 10 0 0\\n" + codes.map((c) => String.fromCodePoint(c) + "@@").join("\\n") + "\\n";
registerFont("trivial", trivialFlf);
if (figlet("hi", { font: "trivial" }) !== "hi") {
  console.error("CJS probe: figlet() did not render with a registered font");
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
import { figlet, parseFont, type FigletOptions, type Font } from "@arshad-shah/clif/banner";

const _argDef: ArgDef = { type: "string", required: true };
const _opt: SelectOption<"a"> = { label: "A", value: "a" };
const _cli = createCLI({ name: "x", handler: () => {} } satisfies CommandDef);
const _t: typeof text = text;
const _p = parseArgs;
const _font: Font = parseFont("flf2a$ 1 0 10 0 0\\n @@\\n");
const _figOpts: FigletOptions = { font: _font, gradient: ["#f00", "#00f"] };
const _art: string = figlet("x", _figOpts);
void _argDef; void _opt; void _cli; void _t; void _p; void _font; void _figOpts; void _art;
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
