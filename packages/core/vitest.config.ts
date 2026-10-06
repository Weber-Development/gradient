import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/bin.ts", "src/index.ts"],
      reporter: ["text-summary", "text"],
      // The floor of the release candidate: lower it only on purpose.
      thresholds: { statements: 94, lines: 95, functions: 96, branches: 84 },
    },
  },
});
