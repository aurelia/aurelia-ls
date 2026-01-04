import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use playground as root so globs are relative to it
    root: import.meta.dirname,
    include: ["**/*.test.ts"],
    // Aggressive timeouts - no test should take more than 10s
    testTimeout: 10000,
    // Hooks get 15s for server startup/shutdown
    hookTimeout: 15000,
    // Run sequentially to avoid port conflicts between tests
    fileParallelism: false,
  },
});
