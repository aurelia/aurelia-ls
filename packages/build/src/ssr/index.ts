/**
 * SSR Module - Server-Side Rendering for Aurelia templates
 *
 * Uses the actual Aurelia runtime for rendering to ensure perfect parity
 * with client-side behavior.
 */

export {
  renderToString,
  renderComponent,
  renderWithComponents,
  type RenderOptions,
  type RenderResult,
  type RenderWithComponentsOptions,
  type ComponentDefinition,
  type ComponentClass as RenderComponentClass,
} from "./render.js";

export {
  createServerPlatform,
  getDocument,
  type ServerPlatformOptions,
} from "./platform.js";

export {
  translateInstructions,
  type TranslationContext,
  type NestedDefinition,
} from "./instruction-translator.js";

// SSR Post-Processing (clean HTML output)
export {
  processSSROutput,
  computeElementPaths,
  computePath,
  stripAuHidAttributes,
  embedManifest,
  resolvePath,
  type HydrationManifest,
  type SSRProcessOptions,
  type SSRProcessResult,
} from "./ssr-processor.js";

// Component definition patching (for SSR with real classes)
export {
  patchComponentDefinition,
  hasComponentDefinition,
  getComponentName,
  type StaticAuDefinition,
  type ComponentClass,
} from "./patch.js";

// Re-export manifest types from Aurelia runtime for convenience
export type {
  IControllerManifest as ControllerManifest,
  IViewManifest as ViewManifest,
} from "@aurelia/runtime-html";
