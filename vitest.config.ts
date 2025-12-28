import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    globals: false,
    testTimeout: 30000, // 30 seconds for slow tests
    hookTimeout: 60000, // 60 seconds for beforeAll/afterAll hooks (TS program creation)
    coverage: {
      provider: "v8",
      include: ["packages/*/out/**/*.js"],
      exclude: ["**/*.test.*", "**/test/**"],
      reporter: ["text", "html", "lcov", "json-summary", "json"],
    },
    // For build package tests that need development conditions
    alias: {
      "@aurelia-ls/compiler": "./packages/compiler/out/index.js",
      "@aurelia-ls/resolution": "./packages/resolution/out/index.js",
      "@aurelia-ls/transform": "./packages/transform/out/index.js",
      "@aurelia-ls/build": "./packages/build/out/index.js",
    },
  },
});
