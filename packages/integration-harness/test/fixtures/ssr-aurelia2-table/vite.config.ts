import { defineConfig } from "vite";
import { resolve } from "node:path";
import { aurelia } from "../../../../vite-plugin/src/index";

const repoRoot = resolve(import.meta.dirname, "../../../../../");
const aureliaRoot = resolve(repoRoot, "aurelia/packages");
const aurelia2PluginsRoot = resolve(repoRoot, "aurelia2-plugins/packages");

const ssrShell = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SSR Table Fixture</title>
  <script type="module" src="/src/main.ts"></script>
</head>
<body>
  <app-root><!--ssr-outlet--></app-root>
  <!--ssr-state-->
</body>
</html>`;

export default defineConfig({
  server: {
    port: 4185,
    strictPort: true,
  },
  resolve: {
    conditions: ["development"],
    alias: {
      aurelia: resolve(aureliaRoot, "aurelia"),
      "@aurelia/kernel": resolve(aureliaRoot, "kernel"),
      "@aurelia/metadata": resolve(aureliaRoot, "metadata"),
      "@aurelia/platform": resolve(aureliaRoot, "platform"),
      "@aurelia/platform-browser": resolve(aureliaRoot, "platform-browser"),
      "@aurelia/runtime": resolve(aureliaRoot, "runtime"),
      "@aurelia/runtime-html": resolve(aureliaRoot, "runtime-html"),
      "@aurelia/expression-parser": resolve(aureliaRoot, "expression-parser"),
      "@aurelia/template-compiler": resolve(aureliaRoot, "template-compiler"),
      "@aurelia-ls/compiler": resolve(repoRoot, "packages/compiler/src/index.ts"),
      "@aurelia-ls/resolution": resolve(repoRoot, "packages/resolution/src/index.ts"),
      "@aurelia-ls/ssr": resolve(repoRoot, "packages/ssr/src/index.ts"),
      "@aurelia-ls/transform": resolve(repoRoot, "packages/transform/src/index.ts"),
      "aurelia2-table": resolve(
        aurelia2PluginsRoot,
        "aurelia2-table/dist/index.js"
      ),
    },
  },
  optimizeDeps: {
    exclude: ["aurelia2-table"],
  },
  ssr: {
    noExternal: [
      "aurelia",
      "@aurelia/kernel",
      "@aurelia/metadata",
      "@aurelia/platform",
      "@aurelia/platform-browser",
      "@aurelia/runtime",
      "@aurelia/runtime-html",
      "@aurelia/expression-parser",
      "@aurelia/template-compiler",
      "@aurelia-ls/ssr",
      "@aurelia-ls/compiler",
      "aurelia2-table",
    ],
  },
  plugins: [
    aurelia({
      entry: resolve(import.meta.dirname, "./src/app-root.html"),
      tsconfig: resolve(import.meta.dirname, "./tsconfig.json"),
      useDev: true,
      thirdParty: {
        resources: {
          attributes: {
            "aurelia-table": {
              bindables: {
                data: {},
                displayData: { mode: "two-way" },
                filters: {},
              },
            },
          },
        },
      },
      ssr: {
        stripMarkers: false,
        htmlShell: ssrShell,
        register: "./src/ssr-register.ts",
      },
    }),
  ],
});
