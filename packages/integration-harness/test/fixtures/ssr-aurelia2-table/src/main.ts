import Aurelia, { hydrateSSRDefinition, type ISSRDefinition } from "aurelia";
import { AureliaTableConfiguration } from "aurelia2-table";
import { AppRoot } from "./app-root";

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
  const hydratedDef = hydrateSSRDefinition(ssrDef);

  class HydrateApp extends AppRoot {
    static $au = {
      type: "custom-element" as const,
      name: "app-root",
      template: hydratedDef.template,
      instructions: hydratedDef.instructions,
      needsCompile: false,
    };
  }

  const host = document.querySelector("app-root") as HTMLElement | null;
  if (host) {
    const app = new Aurelia()
      .register(AureliaTableConfiguration)
      .hydrate({
        host,
        component: HydrateApp,
        ssrScope,
      });
    Promise.resolve(app).then(() => {
      host.dataset.auHydrated = "true";
    });
  }
} else {
  Aurelia.register(AureliaTableConfiguration)
    .app(AppRoot)
    .start();
}
