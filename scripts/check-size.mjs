#!/usr/bin/env node
/**
 * Bundle-size budget check for clif's published artifacts.
 *
 * A consumer never loads both formats (ESM or CJS) at once, and rarely imports
 * every entry point — a TUI app pulls `clif` + `clif/tui`, a prompt-driven CLI
 * pulls `clif` + `clif/prompts`. So we measure each PUBLIC ENTRY's own import
 * graph: the entry file plus the transitive set of shared chunks it actually
 * `import`s / `require`s, counted once. Each graph must stay under the budget.
 *
 * The README claims "< 16 KB gzipped" — that's the per-entry-graph ceiling.
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "packages", "clif", "dist");

// Ceiling for a single entry's import graph (entry + its shared chunks).
const PER_GRAPH_BUDGET = 16 * 1024;

// Public entry points, by subpath. Filenames follow tsdown's `<entry>.<ext>`.
const ENTRIES = ["index", "prompts", "tui"];
const FORMATS = { ESM: ".mjs", CJS: ".cjs" };

// Match relative chunk specifiers in any quote style tsdown emits
// (`from"./x.mjs"`, `require(`./x.cjs`)`), restricted to bundle extensions.
const REF = /["'`](\.\/[A-Za-z0-9_.-]+\.[mc]js)["'`]/g;

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function gzSize(path) {
  return gzipSync(readFileSync(path)).length;
}

function exists(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Transitive closure of relative chunk files reachable from `entryFile`. */
function closure(entryFile) {
  const seen = new Set();
  const stack = [entryFile];
  while (stack.length > 0) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(join(distDir, file), "utf8");
    for (const m of src.matchAll(REF)) {
      const dep = m[1].slice(2); // strip leading "./"
      if (!seen.has(dep)) stack.push(dep);
    }
  }
  return seen;
}

let anyOver = false;
console.log("");

for (const [fmtName, ext] of Object.entries(FORMATS)) {
  console.log(`  ${fmtName}`);
  for (const entry of ENTRIES) {
    const entryFile = `${entry}${ext}`;
    if (!exists(join(distDir, entryFile))) {
      console.error(`  ✖ missing built entry: ${entryFile}`);
      anyOver = true;
      continue;
    }

    const files = [...closure(entryFile)].map((name) => ({
      name,
      gz: gzSize(join(distDir, name)),
    }));
    const total = files.reduce((s, f) => s + f.gz, 0);
    const over = total > PER_GRAPH_BUDGET;
    if (over) anyOver = true;

    const label = `    clif${entry === "index" ? "" : `/${entry}`}`.padEnd(16);
    console.log(
      `${label} ${fmt(total).padStart(8)}  (budget ${fmt(PER_GRAPH_BUDGET)}) ${over ? "✖ OVER" : "✓"}`,
    );
    for (const f of files.sort((a, b) => b.gz - a.gz)) {
      console.log(`        ${f.name.padEnd(28)} ${fmt(f.gz).padStart(8)}`);
    }
  }
  console.log("");
}

if (anyOver) {
  console.error(
    "Size budget exceeded — trim the bundle or raise PER_GRAPH_BUDGET in scripts/check-size.mjs.",
  );
  process.exit(1);
}
console.log(
  `  ✓ every entry graph is under the per-graph budget of ${fmt(PER_GRAPH_BUDGET)} gzipped.\n`,
);
