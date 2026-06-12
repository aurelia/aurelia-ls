import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  esbuild: {
    target: 'es2022',
  },
  plugins: [aurelia({
    include: ['src/**/*.{ts,js,html}', '**/src/**/*.{ts,js,html}'],
    hmr: false,
  })],
});
