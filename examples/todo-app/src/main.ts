import Aurelia from 'aurelia';
import { MyApp } from './my-app';

// Type declarations for SSR hydration data
declare global {
  interface Window {
    __SSR_STATE__?: Record<string, unknown>;
    __AU_DEF__?: {
      template: string; // Template HTML with markers
      instructions: unknown[][];
      nestedDefs: unknown[];
      targetCount: number;
    };
    __AU_MANIFEST__?: {
      targetCount: number;
      controllers: Record<number, unknown>;
    };
  }
}

const ssrState = window.__SSR_STATE__;
const ssrDef = window.__AU_DEF__;
const ssrManifest = window.__AU_MANIFEST__;

if (ssrState && ssrDef) {
  // SSR mode: hydrate with AOT definition
  // Create component class with pre-compiled definition to skip runtime compilation
  class HydrateApp extends MyApp {
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
        state: ssrState,
        manifest: ssrManifest,
      });
  }
} else {
  // Normal mode: create new app
  Aurelia
    .app(MyApp)
    .start();
}
