import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/prompts.ts", "src/tui.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Minify published bundles: drops comments/whitespace and mangles internals,
  // keeping the shipped artifacts well under the per-format size budget. Source
  // and the generated .d.ts (with full JSDoc) stay human-readable.
  minify: true,
  target: "node22",
  shims: false,
});
