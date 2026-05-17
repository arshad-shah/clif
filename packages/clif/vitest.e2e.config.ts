import { defineConfig } from "vitest/config";

/**
 * Separate config for end-to-end tests: they spawn the example CLI as a
 * child process, are slower, and must NOT be included in coverage (which
 * only sees in-process code).
 */
export default defineConfig({
  test: {
    globals: false,
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
