const aureliaPlugin = require('@aurelia/vite-plugin').default;
const { defineConfig } = require('vite');

module.exports = defineConfig({
  plugins: [aureliaPlugin({ enableConventions: true })],
});
