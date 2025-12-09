import Aurelia from 'aurelia';
import { MyAppCustomElement } from './my-app';

// Type declarations for SSR hydration data
declare global {
  interface Window {
    __AU_DEF__?: {
      template: string; // Template HTML with markers
      instructions: unknown[][];
      nestedDefs: unknown[];
      targetCount: number;
    };
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
  // Create component class with pre-compiled definition to skip runtime compilation
  class HydrateApp extends MyAppCustomElement {
    static $au = {
      type: 'custom-element' as const,
      name: 'my-app',
      template: ssrDef.template, // Template with markers for target collection
      instructions: ssrDef.instructions,
      needsCompile: false, // Critical: skip runtime compilation
    };
  }

  const host = document.querySelector('my-app') as HTMLElement;
  if (host) {
    new Aurelia()
      .hydrate({
        host,
        component: HydrateApp,
        ssrScope: ssrScope as any,
      });
  }
} else {
  // Normal mode: create new app
  Aurelia
    .app(MyAppCustomElement)
    .start();
}
