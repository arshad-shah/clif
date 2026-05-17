#!/usr/bin/env node
/**
 * Bundle-size budget check for clif's published artifacts.
 *
 * A consumer ever loads ONE format (ESM or CJS), never both, so we measure
 * each format independently. Shared chunks (the `colors-*.mjs` / `.cjs`
 * tsdown emits) are reported separately and counted once per format.
 *
 * The README claims "< 15 KB gzipped" — that's the per-format ceiling.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "packages", "clif", "dist");

// Per-format ceiling: total bytes a consumer pulls in when they `import "clif"`
// AND `import "clif/prompts"` together, including any shared chunks.
const PER_FORMAT_BUDGET = 15 * 1024;

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function gzSize(path) {
  return gzipSync(readFileSync(path)).length;
}

const formats = {
  ESM: { ext: ".mjs", files: [] },
  CJS: { ext: ".cjs", files: [] },
};

for (const file of readdirSync(distDir)) {
  if (!statSync(join(distDir, file)).isFile()) continue;
  if (
    file.endsWith(".map") ||
    file.endsWith(".d.ts") ||
    file.endsWith(".d.mts") ||
    file.endsWith(".d.cts")
  )
    continue;
  for (const fmtName of Object.keys(formats)) {
    if (file.endsWith(formats[fmtName].ext)) {
      formats[fmtName].files.push({ name: file, gz: gzSize(join(distDir, file)) });
      break;
    }
  }
}

let anyOver = false;
console.log("");
for (const [name, { files }] of Object.entries(formats)) {
  const total = files.reduce((s, f) => s + f.gz, 0);
  const over = total > PER_FORMAT_BUDGET;
  if (over) anyOver = true;

  console.log(
    `  ${name.padEnd(3)}  total ${fmt(total).padStart(8)}  (budget ${fmt(PER_FORMAT_BUDGET)}) ${over ? "✖ OVER" : "✓"}`,
  );
  for (const f of files.sort((a, b) => b.gz - a.gz)) {
    console.log(`        ${f.name.padEnd(28)} ${fmt(f.gz).padStart(8)}`);
  }
  console.log("");
}

if (anyOver) {
  console.error(
    "Size budget exceeded — trim the bundle or raise PER_FORMAT_BUDGET in scripts/check-size.mjs.",
  );
  process.exit(1);
}
console.log(`  ✓ both formats under per-format budget of ${fmt(PER_FORMAT_BUDGET)} gzipped.\n`);
