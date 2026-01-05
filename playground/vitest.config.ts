import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use playground as root so globs are relative to it
    root: import.meta.dirname,
    include: ["**/*.test.ts"],
    // Browser tests need time for page navigation + Aurelia bootstrap
    testTimeout: 15000,
    // Hooks need time for Vite server startup/shutdown
    hookTimeout: 20000,
    // Run sequentially to avoid port conflicts between tests
    fileParallelism: false,
  },
});
