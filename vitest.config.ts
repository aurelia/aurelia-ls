import { defineConfig } from "vitest/config";
import path from "node:path";

const packagesDir = path.resolve(__dirname, "packages");

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    globals: false,
    globalSetup: ["./vitest.global-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000, // Needed for coverage runs (instrumentation adds overhead)
    coverage: {
      provider: "v8",
      include: ["packages/*/out/**/*.js"],
      exclude: ["**/*.test.*", "**/test/**"],
      reporter: ["text", "html", "lcov", "json-summary", "json"],
    },
    // Aliases for package imports in tests
    alias: [
      // Package-level aliases: @aurelia-ls/<pkg> → pre-compiled out/
      { find: "@aurelia-ls/compiler", replacement: path.join(packagesDir, "compiler/out/index.js") },
      { find: "@aurelia-ls/integration-harness", replacement: path.join(packagesDir, "integration-harness/out/index.js") },
      { find: "@aurelia-ls/transform", replacement: path.join(packagesDir, "transform/out/index.js") },
      { find: "@aurelia-ls/semantic-workspace", replacement: path.join(packagesDir, "semantic-workspace/out/index.js") },
      { find: "@aurelia-ls/ssr", replacement: path.join(packagesDir, "ssr/out/index.js") },
      { find: "@aurelia-ls/ssg", replacement: path.join(packagesDir, "ssg/out/index.js") },
      { find: "@aurelia-ls/vite-plugin", replacement: path.join(packagesDir, "vite-plugin/out/index.js") },
      // Internal src/ → out/ rewrite: skip vitest transform for pre-compiled code
      { find: /^(\.\.?\/.*)\/src\/(.*)\.js$/, replacement: "$1/out/$2.js" },
    ],
  },
});
