/**
 * Kitchen Sink SSR Entry Point
 *
 * Supports both SSR hydration and CSR fallback modes.
 * When SSR data is present, hydrates the pre-rendered content.
 * Otherwise, falls back to standard client-side rendering.
 */
import Aurelia, {
  hydrateSSRDefinition,
  type ISSRDefinition,
} from "aurelia";
import { RouterConfiguration } from "@aurelia/router";
import { MyApp } from "./my-app";

// Import child components for registration
import { Home } from "./pages/home";
import { About } from "./pages/about";
import { Users } from "./pages/users";
import { User } from "./pages/user";

declare global {
  interface Window {
    __AU_DEF__?: ISSRDefinition;
    __AU_SSR_SCOPE__?: {
      name?: string;
      nodeCount?: number;
      children: unknown[];
    };
  }
}

const ssrDef = window.__AU_DEF__;
const ssrScope = window.__AU_SSR_SCOPE__;

if (ssrDef && ssrScope) {
  // SSR mode: hydrate with AOT definition
  const hydratedDef = hydrateSSRDefinition(ssrDef);

  // Create hydration class that extends MyApp to preserve routes/dependencies
  class HydrateApp extends MyApp {
    static $au = {
      type: "custom-element" as const,
      name: "my-app",
      template: hydratedDef.template,
      instructions: hydratedDef.instructions,
      needsCompile: false,
    };

    // Preserve static routes from MyApp for router
    static routes = MyApp.routes;
    static dependencies = MyApp.dependencies;
  }

  const host = document.querySelector("my-app") as HTMLElement;
  if (host) {
    new Aurelia()
      .register(RouterConfiguration)
      .register(Home, About, Users, User)
      .hydrate({
        host,
        component: HydrateApp,
        ssrScope,
      });
  }
} else {
  // CSR mode: normal app start
  Aurelia
    .register(RouterConfiguration)
    .register(Home, About, Users, User)
    .app(MyApp)
    .start();
}
