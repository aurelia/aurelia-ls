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
      // Deep imports: @aurelia-ls/<pkg>/<path>.js → packages/<pkg>/out/<path>.js
      { find: /^@aurelia-ls\/([^/]+)\/(.+)\.js$/, replacement: path.join(packagesDir, "$1/out/$2.js") },
      // Bare package imports: @aurelia-ls/<pkg> → packages/<pkg>/out/index.js
      { find: /^@aurelia-ls\/([^/]+)$/, replacement: path.join(packagesDir, "$1/out/index.js") },
      // Internal src/ → out/ rewrite: skip vitest transform for pre-compiled code
      { find: /^(\.\.?\/.*)\/src\/(.*)\.js$/, replacement: "$1/out/$2.js" },
    ],
  },
});
