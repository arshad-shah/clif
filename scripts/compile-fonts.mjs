#!/usr/bin/env node
/**
 * Compile vendored FIGfont `.flf` sources into compact TS modules.
 *
 * Reads `packages/clif/fonts/*.flf`, strips the human-readable comment block
 * (it plays no part in rendering), and emits one module per font under
 * `packages/clif/src/banner/fonts/`. Each module exports the cleaned `.flf`
 * string, which `@arshad-shah/clif/banner` parses lazily on first use.
 *
 * Run via `pnpm --filter @arshad-shah/clif fonts` (also wired into `build`).
 * The generated modules are committed so builds stay deterministic and offline.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "packages", "clif", "fonts");
const outDir = join(here, "..", "packages", "clif", "src", "banner", "fonts");

// `.flf` basename → generated module / export name (camelCase).
const MODULE_NAMES = {
  Standard: "standard",
  Slant: "slant",
  Small: "small",
  Big: "big",
  ANSIShadow: "ansiShadow",
  Banner: "banner",
  Mini: "mini",
};

/** Drop the comment block and zero its header count, leaving glyph data intact. */
function stripComments(flf) {
  const lines = flf.replace(/\r\n?/g, "\n").split("\n");
  const header = lines[0];
  if (!header || !header.startsWith("flf2a")) {
    throw new Error("not a FIGfont (missing flf2a signature)");
  }
  const prefix = header.slice(0, 6); // "flf2a" + hardblank
  const fields = header.slice(6).trim().split(/\s+/);
  const commentLines = Number.parseInt(fields[4], 10) || 0;
  fields[4] = "0";
  const newHeader = `${prefix} ${fields.join(" ")}`;
  return [newHeader, ...lines.slice(1 + commentLines)].join("\n");
}

mkdirSync(outDir, { recursive: true });

let count = 0;
for (const file of readdirSync(srcDir)) {
  if (!file.endsWith(".flf")) continue;
  const base = file.replace(/\.flf$/, "");
  const moduleName = MODULE_NAMES[base];
  if (!moduleName) {
    console.warn(`  skip ${file} (no module-name mapping)`);
    continue;
  }
  const raw = readFileSync(join(srcDir, file), "utf8");
  const cleaned = stripComments(raw);
  const out = `/**
 * Compact FIGfont data — generated from \`fonts/${file}\` by
 * \`scripts/compile-fonts.mjs\`. Do not edit by hand.
 */
export const flf = ${JSON.stringify(cleaned)};
`;
  writeFileSync(join(outDir, `${moduleName}.ts`), out);
  count++;
  console.log(`  ${base.padEnd(12)} → src/banner/fonts/${moduleName}.ts`);
}

console.log(`\n  ✓ compiled ${count} font${count === 1 ? "" : "s"}.\n`);
