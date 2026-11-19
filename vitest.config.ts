import { defineConfig } from "vitest/config";
import { testEnv } from "./tests/setup/test-env.ts";

export default defineConfig({
  test: {
    // Explicit `import { describe, it, expect, vi } from "vitest"` in every test file.
    globals: false,
    environment: "node",
    env: testEnv,
    setupFiles: ["./tests/setup/guard.ts"],
    // Spies and mocks never leak between tests.
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/types/**", "src/index.ts", "src/**/*.d.ts"],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/setup/global-setup.ts"],
          // Integration files share one database and one Redis: run them one at a time.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});