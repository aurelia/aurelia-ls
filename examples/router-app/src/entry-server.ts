/**
 * SSR Entry Point for Production Builds
 *
 * This file is the entry point for `vite build --ssr`.
 * It exports an SSR handler that can render any URL to HTML.
 *
 * Usage:
 *   1. Build client: vite build
 *   2. Build SSR:    vite build --ssr src/entry-server.ts --outDir dist/server
 *   3. Use handler:  import handler from './dist/server/entry-server.js'
 *                    const { html } = await handler.render('/about')
 */

import { createSSRHandler } from '@aurelia-ls/build';
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

// Import components - these will have $au injected by Vite transform
import { MyAppCustomElement } from './my-app';
import { Home } from './pages/home';
import { About } from './pages/about';

// HTML shell for SSR output
const ssrShell = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aurelia Router SSR</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/">
  <script type="module" src="/assets/main.js"></script>
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

/**
 * The SSR handler for this application.
 * Use this to render pages on the server or generate static HTML.
 */
export default createSSRHandler({
  // Root component
  root: MyAppCustomElement,

  // Child components (needed for rendering)
  components: [Home, About],

  // HTML shell with placeholders
  shell: ssrShell,

  // Router registration for SSR
  register: (container, request) => {
    const url = request?.url ?? '/';
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
});
