import { defineConfig } from "vite";
import { resolve } from "node:path";
import { aurelia } from "@aurelia-ls/vite-plugin";

export default defineConfig({
  plugins: [
    aurelia({
      // Use AOT compilation
      useDev: false,
    }),
  ],
  resolve: {
    alias: {
      "@domain": resolve(__dirname, "src/domain"),
      "@pages": resolve(__dirname, "src/pages"),
      "@components": resolve(__dirname, "src/components"),
      "@locales": resolve(__dirname, "src/locales"),
    },
  },
  server: {
    port: 3000,
  },
});
