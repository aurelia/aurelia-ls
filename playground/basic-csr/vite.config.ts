import { defineConfig } from "vite";
import { resolve } from "node:path";
import { aurelia } from "@aurelia-ls/vite-plugin";

// Resolve paths relative to this config file
const aureliaRoot = resolve(import.meta.dirname, "../../aurelia/packages");

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
      // @aurelia-ls/* packages resolve via workspace dependencies
    },
  },
  plugins: [
    aurelia({
      entry: resolve(import.meta.dirname, "./src/my-app.html"),
      tsconfig: resolve(import.meta.dirname, "./tsconfig.json"),
      // No ssr option - pure CSR with AOT
    }),
  ],
});
