import Aurelia, {
  hydrateSSRDefinition,
  type ISSRDefinition,
} from "aurelia";
import { MyAppCustomElement } from "./my-app";

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

  class HydrateApp extends MyAppCustomElement {
    static $au = {
      type: "custom-element" as const,
      name: "my-app",
      template: hydratedDef.template,
      instructions: hydratedDef.instructions,
      needsCompile: false,
    };
  }

  const host = document.querySelector("my-app") as HTMLElement;
  if (host) {
    new Aurelia().hydrate({
      host,
      component: HydrateApp,
      ssrScope,
    });
  }
} else {
  // CSR mode: normal app start
  Aurelia.app(MyAppCustomElement).start();
}
