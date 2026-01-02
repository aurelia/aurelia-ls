import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Run sequentially to avoid port conflicts between tests
    fileParallelism: false,
  },
});
