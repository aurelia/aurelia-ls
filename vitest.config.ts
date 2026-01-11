import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    globals: false,
    testTimeout: 30000,
    hookTimeout: 30000, // Needed for coverage runs (instrumentation adds overhead)
    coverage: {
      provider: "v8",
      include: ["packages/*/out/**/*.js"],
      exclude: ["**/*.test.*", "**/test/**"],
      reporter: ["text", "html", "lcov", "json-summary", "json"],
    },
    // Aliases for package imports in tests
    alias: {
      "@aurelia-ls/compiler": "./packages/compiler/out/index.js",
      "@aurelia-ls/integration-harness": "./packages/integration-harness/out/index.js",
      "@aurelia-ls/resolution": "./packages/resolution/out/index.js",
      "@aurelia-ls/transform": "./packages/transform/out/index.js",
      "@aurelia-ls/ssr": "./packages/ssr/out/index.js",
      "@aurelia-ls/ssg": "./packages/ssg/out/index.js",
      "@aurelia-ls/vite-plugin": "./packages/vite-plugin/out/index.js",
    },
  },
});
