import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/prompts.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: "node22",
  shims: false,
});
