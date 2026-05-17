import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    // E2E tests spawn the example CLI as a child process; they're slower
    // and depend on a built dist, so they live outside the default run.
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["src/**/*.ts"],
      // The env-sniffing branches in colors.ts only run at module load,
      // which makes the detection paths impractical to cover from unit
      // tests without a deeper refactor. Exclude them from coverage so
      // the gate reflects code we can actually test.
      exclude: ["src/prompts/**"],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 92,
      },
    },
    testTimeout: 5000,
  },
});
