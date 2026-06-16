#!/usr/bin/env node
/**
 * Bundle-size budget check for clif's published artifacts.
 *
 * A consumer ever loads ONE format (ESM or CJS), never both, so we measure each
 * format independently. Within a format we follow the *import graph* from each
 * public entry, so a chunk only counts against the entries that actually reach
 * it. This keeps the three public entries budgeted independently:
 *
 *   • core    — `import "clif"` + `import "clif/prompts"` (the README's
 *               "< 16 KB gzipped" claim). Must NOT include the banner graph.
 *   • banner  — `import "clif/banner"`. Fonts are lazy (one chunk per font),
 *               so the realistic cost is the engine + shared chunks + the single
 *               largest font a consumer might select.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "..", "packages", "clif", "dist");

const CORE_BUDGET = 16 * 1024; // `clif` + `clif/prompts`, per format
const BANNER_BUDGET = 16 * 1024; // `clif/banner` engine + shared + one font

// Lazy per-font chunks, identified by the basenames `compile-fonts.mjs` emits.
const FONT_CHUNK_RE = /^(standard|slant|small|big|ansiShadow|banner|mini)-/;
// Any quoted relative specifier ending in .mjs/.cjs (static `from` or dynamic
// `import()` / `require()` — minified output quotes them with " or `).
const SPECIFIER_RE = /[`"'](\.\.?\/[^`"'\n]+\.(?:mjs|cjs))[`"']/g;

function fmt(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

/** Recursively collect every code file in `dir` (absolute paths). */
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collect(full));
      continue;
    }
    if (/\.(mjs|cjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const allFiles = collect(distDir);
const gzCache = new Map();
const gz = (file) => {
  if (!gzCache.has(file)) gzCache.set(file, gzipSync(readFileSync(file)).length);
  return gzCache.get(file);
};

/** Edges: file → set of files it imports (static or dynamic). */
const imports = new Map();
for (const file of allFiles) {
  const code = readFileSync(file, "utf8");
  const deps = new Set();
  for (const m of code.matchAll(SPECIFIER_RE)) {
    const target = resolve(dirname(file), m[1]);
    if (imports.has(target) || allFiles.includes(target)) deps.add(target);
  }
  imports.set(file, deps);
}

/** Transitive closure of files reachable from `entry` (inclusive). */
function reachable(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    for (const dep of imports.get(f) ?? []) stack.push(dep);
  }
  return seen;
}

const name = (f) => relative(distDir, f);

const formats = {
  ESM: ".mjs",
  CJS: ".cjs",
};

let anyOver = false;
console.log("");

for (const [label, ext] of Object.entries(formats)) {
  const entry = (rel) => join(distDir, rel + ext);
  const coreEntries = [entry("index"), entry("prompts")].filter((f) => allFiles.includes(f));
  const bannerEntry = entry(join("banner", "index"));

  // ── core (clif + clif/prompts) ──────────────────────────────────────────────
  const coreSet = new Set();
  for (const e of coreEntries) for (const f of reachable(e)) coreSet.add(f);
  const coreTotal = [...coreSet].reduce((s, f) => s + gz(f), 0);
  const coreOver = coreTotal > CORE_BUDGET;
  anyOver ||= coreOver;

  console.log(
    `  ${label} core    ${fmt(coreTotal).padStart(8)}  (budget ${fmt(CORE_BUDGET)}) ${coreOver ? "✖ OVER" : "✓"}`,
  );
  for (const f of [...coreSet].sort((a, b) => gz(b) - gz(a))) {
    console.log(`        ${name(f).padEnd(30)} ${fmt(gz(f)).padStart(8)}`);
  }

  // ── banner (clif/banner) ────────────────────────────────────────────────────
  if (allFiles.includes(bannerEntry)) {
    const bannerSet = reachable(bannerEntry);
    const fontChunks = [...bannerSet].filter((f) => FONT_CHUNK_RE.test(name(f).split("/").pop()));
    const base = [...bannerSet].filter((f) => !fontChunks.includes(f));
    const baseTotal = base.reduce((s, f) => s + gz(f), 0);
    const largestFont = fontChunks.reduce((m, f) => Math.max(m, gz(f)), 0);
    const bannerTotal = baseTotal + largestFont;
    const bannerOver = bannerTotal > BANNER_BUDGET;
    anyOver ||= bannerOver;

    console.log(
      `\n  ${label} banner  ${fmt(bannerTotal).padStart(8)}  (budget ${fmt(BANNER_BUDGET)}, engine+shared+largest font) ${bannerOver ? "✖ OVER" : "✓"}`,
    );
    for (const f of base.sort((a, b) => gz(b) - gz(a))) {
      console.log(`        ${name(f).padEnd(30)} ${fmt(gz(f)).padStart(8)}`);
    }
    console.log(
      `        ${`+ largest of ${fontChunks.length} font chunks`.padEnd(30)} ${fmt(largestFont).padStart(8)}`,
    );
  }
  console.log("");
}

if (anyOver) {
  console.error(
    "Size budget exceeded — trim the bundle or raise a budget in scripts/check-size.mjs.",
  );
  process.exit(1);
}
console.log("  ✓ all entries under budget gzipped.\n");
