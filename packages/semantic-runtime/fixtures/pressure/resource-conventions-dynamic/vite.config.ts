import aurelia from '@aurelia/vite-plugin';
import { defineConfig } from 'vite';

declare const conventionOptions: { enableConventions: boolean };

function uninvokedPluginFactory() {
  return aurelia({ enableConventions: true });
}

export default defineConfig({
  plugins: [aurelia(conventionOptions)],
});
