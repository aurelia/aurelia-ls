import { defineConfig } from 'vite';
import aureliaPlugin from '@aurelia/vite-plugin';
import { aureliaSSR } from '@aurelia-ls/build/vite';
import { Registration, IContainer } from '@aurelia/kernel';
import { AppTask } from 'aurelia';
import {
  IRouter,
  ILocationManager,
  ServerLocationManager,
  IRouterOptions,
  RouterOptions,
  ViewportCustomElement,
  LoadCustomAttribute,
  HrefCustomAttribute,
  RouteContext,
} from '@aurelia/router';

/**
 * Vite configuration for Aurelia Router SSR example.
 *
 * Both dev and production builds work with Vite. The aureliaSSR plugin
 * handles .html template imports via virtual files to avoid conflicts
 * with vite:build-html.
 */

// HTML shell for SSR with hydration support
const ssrShell = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aurelia Router SSR</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/">
  <script type="module" src="/src/main.ts"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
    nav { margin-bottom: 20px; }
    nav a { margin-right: 15px; text-decoration: none; color: #0066cc; }
    nav a:hover { text-decoration: underline; }
    .page { padding: 20px; border: 1px solid #ddd; border-radius: 4px; }
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
    port: 9001,
  },
  esbuild: {
    target: 'es2022'
  },
  resolve: {
    conditions: ['development'],
  },
  plugins: [
    // Use standard aurelia plugin only for dev mode
    // For production, aureliaSSR handles all transforms with AOT
    process.env.NODE_ENV !== 'production' && aureliaPlugin({
      useDev: true,
    }),
    aureliaSSR({
      entry: './src/my-app.html',
      tsconfig: './tsconfig.json',
      stripMarkers: false,
      htmlShell: ssrShell,
      baseHref: '/',
      // SSR entry point for production builds
      ssrEntry: './src/entry-server.ts',
      // SSG can be enabled here, or run via scripts/generate-static.mjs
      ssg: {
        enabled: false,
      },
      // Register router for SSR (dev mode)
      register: (container: IContainer, req) => {
        const url = req?.url ?? '/';
        const locationManager = new ServerLocationManager(url, '/');
        const routerOptions = RouterOptions.create({});

        container.register(
          // ServerLocationManager for URL handling without browser APIs
          Registration.instance(ILocationManager, locationManager),
          Registration.instance(IRouterOptions, routerOptions),
          Registration.instance(RouterOptions, routerOptions),
          IRouter,
          // Router resources
          ViewportCustomElement,
          LoadCustomAttribute,
          HrefCustomAttribute,
          // Set up route context
          AppTask.hydrated(IContainer, RouteContext.setRoot),
          // Activate routes to render matched components
          AppTask.activated(IRouter, router => router.load(url)),
        );
      },
    }),
  ],
});
