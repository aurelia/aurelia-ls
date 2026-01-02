import { defineConfig } from "vite";
import { resolve } from "node:path";
import { aurelia } from "../../packages/vite-plugin/out/index.js";

// Resolve paths relative to this config file
const aureliaRoot = resolve(import.meta.dirname, "../../aurelia/packages");
const packagesRoot = resolve(import.meta.dirname, "../../packages");

export default defineConfig({
  server: {
    port: 0, // Random port
    strictPort: false,
  },
  resolve: {
    conditions: ["development"],
    alias: {
      // Aurelia runtime packages
      aurelia: resolve(aureliaRoot, "aurelia"),
      "@aurelia/kernel": resolve(aureliaRoot, "kernel"),
      "@aurelia/metadata": resolve(aureliaRoot, "metadata"),
      "@aurelia/platform": resolve(aureliaRoot, "platform"),
      "@aurelia/platform-browser": resolve(aureliaRoot, "platform-browser"),
      "@aurelia/runtime": resolve(aureliaRoot, "runtime"),
      "@aurelia/runtime-html": resolve(aureliaRoot, "runtime-html"),
      "@aurelia/expression-parser": resolve(aureliaRoot, "expression-parser"),
      "@aurelia/template-compiler": resolve(aureliaRoot, "template-compiler"),
      // Aurelia LS packages (for AOT)
      "@aurelia-ls/compiler": resolve(packagesRoot, "compiler/out/index.js"),
      "@aurelia-ls/resolution": resolve(packagesRoot, "resolution/out/index.js"),
      "@aurelia-ls/transform": resolve(packagesRoot, "transform/out/index.js"),
      "@aurelia-ls/vite-plugin": resolve(packagesRoot, "vite-plugin/out/index.js"),
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
