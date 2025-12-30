import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';
import { aureliaSSR } from '@aurelia-ls/vite-plugin';

// Custom HTML shell for SSR with hydration support
// <!--ssr-state--> is replaced with serialized state for client hydration
const ssrShell = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aurelia Todo (SSR)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/">
  <script type="module" src="/src/main.ts"></script>
</head>
<body>
  <my-app><!--ssr-outlet--></my-app>
  <!--ssr-state-->
</body>
</html>`;

export default defineConfig({
  server: {
    open: !process.env.CI,
    port: 9000,
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
      tsconfig: './tsconfig.json', // Required for resource resolution
      stripMarkers: false, // Keep markers for client hydration
      htmlShell: ssrShell,
    }),
  ],
});
