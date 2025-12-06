import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';
import { aureliaSSR } from '@aurelia-ls/build/vite';

// Custom HTML shell for SSR with hydration support
const ssrShell = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Child Component SSR Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/">
  <script type="module" src="/src/main.ts"></script>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; }
    .greeting-card { border: 2px solid #4a90d9; border-radius: 8px; padding: 1rem; margin: 1rem 0; background: #f0f7ff; }
    .greeting-card h2 { margin: 0 0 0.5rem 0; color: #2a5a9a; }
    .greeting-card p { margin: 0; color: #444; }
  </style>
</head>
<body>
  <my-app><!--ssr-outlet--></my-app>
  <!--ssr-state-->
</body>
</html>`;

export default defineConfig({
  server: {
    open: !process.env.CI,
    port: 9002,
  },
  esbuild: {
    target: 'es2022'
  },
  resolve: {
    conditions: ['development'],
  },
  plugins: [
    aurelia({
      useDev: true,
    }),
    aureliaSSR({
      entry: './src/my-app.html',
      tsconfig: './tsconfig.json', // Enable resolution for child component support
      stripMarkers: false,
      htmlShell: ssrShell,
      // State is not used in new flow - components use their class defaults
      state: () => ({}),
    }),
  ],
});
