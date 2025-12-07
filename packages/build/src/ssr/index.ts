/**
 * SSR Module - Server-Side Rendering for Aurelia templates
 *
 * Uses the actual Aurelia runtime for rendering to ensure perfect parity
 * with client-side behavior.
 *
 * Key principle: Components define their own state naturally. No external
 * state injection - that's not how Aurelia works.
 */

// Primary render API
export {
  render,
  renderWithComponents, // backwards compat alias
  type RenderOptions,
  type RenderResult,
  type ComponentClass,
} from "./render.js";

// Server platform setup
export {
  createServerPlatform,
  getDocument,
  type ServerPlatformOptions,
} from "./platform.js";

// Instruction translation (AOT → runtime format)
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
  syncPropertiesForSSR,
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
  type ComponentClass as PatchComponentClass,
} from "./patch.js";

// Re-export manifest types from Aurelia runtime for convenience
export type {
  IControllerManifest as ControllerManifest,
  IViewManifest as ViewManifest,
} from "@aurelia/runtime-html";
