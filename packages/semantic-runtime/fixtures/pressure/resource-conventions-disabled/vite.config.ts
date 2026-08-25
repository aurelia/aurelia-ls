import aurelia from '@aurelia/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [aurelia({ enableConventions: false })],
});
