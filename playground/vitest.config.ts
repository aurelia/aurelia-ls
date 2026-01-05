import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use playground as root so globs are relative to it
    root: import.meta.dirname,
    include: ["**/*.test.ts"],
    // CI is slower - browser tests need time for navigation + Aurelia bootstrap
    testTimeout: 30000,
    // Hooks need time for Vite server startup/shutdown
    hookTimeout: 30000,
    // Run sequentially to avoid port conflicts between tests
    fileParallelism: false,
  },
});
