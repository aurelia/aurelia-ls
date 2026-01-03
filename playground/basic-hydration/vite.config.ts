import { defineConfig } from "vite";
import { resolve } from "node:path";
import { aurelia } from "@aurelia-ls/vite-plugin";

// Resolve paths relative to this config file
const aureliaRoot = resolve(import.meta.dirname, "../../aurelia/packages");

const ssrShell = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Basic Hydration Test</title>
  <script type="module" src="/src/main.ts"></script>
</head>
<body>
  <my-app><!--ssr-outlet--></my-app>
  <!--ssr-state-->
</body>
</html>`;

export default defineConfig({
  server: {
    port: 0, // Random port
    strictPort: false,
  },
  resolve: {
    conditions: ["development"],
    alias: {
      // Aurelia runtime packages (from submodule)
      aurelia: resolve(aureliaRoot, "aurelia"),
      "@aurelia/kernel": resolve(aureliaRoot, "kernel"),
      "@aurelia/metadata": resolve(aureliaRoot, "metadata"),
      "@aurelia/platform": resolve(aureliaRoot, "platform"),
      "@aurelia/platform-browser": resolve(aureliaRoot, "platform-browser"),
      "@aurelia/runtime": resolve(aureliaRoot, "runtime"),
      "@aurelia/runtime-html": resolve(aureliaRoot, "runtime-html"),
      "@aurelia/expression-parser": resolve(aureliaRoot, "expression-parser"),
      "@aurelia/template-compiler": resolve(aureliaRoot, "template-compiler"),
      "@aurelia/router": resolve(aureliaRoot, "router"),
      "@aurelia/route-recognizer": resolve(aureliaRoot, "route-recognizer"),
      // @aurelia-ls/* packages resolve via workspace dependencies
    },
  },
  plugins: [
    aurelia({
      entry: resolve(import.meta.dirname, "./src/my-app.html"),
      tsconfig: resolve(import.meta.dirname, "./tsconfig.json"),
      ssr: {
        stripMarkers: false,
        htmlShell: ssrShell,
      },
    }),
  ],
});
