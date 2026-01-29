/**
 * @aurelia-ls/ssr - Server-side rendering for Aurelia applications
 *
 * This package provides SSR rendering primitives for Aurelia templates.
 * It is used by the Vite plugin for dev server SSR and production builds.
 *
 * Primary exports:
 * - createSSRHandler() - Production SSR entry point
 * - render() / renderWithComponents() - Low-level rendering
 * - compileWithAot() - AOT compilation bridge
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
  type SSRRequestContext,
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
  stripAuMarkers,
  syncPropertiesForSSR,
  type SSRProcessOptions,
  type SSRProcessResult,
} from "./ssr-processor.js";

// Manifest recording (tree-based SSR manifest)
// Functions live here (cross-package awareness), types come from runtime (hydration needs them)
export {
  recordManifest,
  debugControllerTree,
} from "./manifest-recorder.js";

export {
  isSSRTemplateController,
  isSSRScope,
  type ISSRManifest,
  type ISSRScope,
  type ISSRScopeChild,
  type ISSRTemplateController,
} from "@aurelia/runtime-html";

// Component definition patching (for SSR with real classes)
export {
  patchComponentDefinition,
  hasComponentDefinition,
  getComponentName,
  type StaticAuDefinition,
  type ComponentClass as PatchComponentClass,
} from "./patch.js";

// SSR Handler (production SSR entry point)
export {
  createSSRHandler,
  isSSRHandler,
  type SSRHandler,
  type SSRHandlerConfig,
  type SSRRenderOptions,
  type SSRResult,
} from "./handler.js";

// AOT compilation API
export {
  compileWithAot,
  compileAndRenderAot,
  type AotCompileOptions,
  type AotCompileResult,
  type CompileAndRenderAotOptions,
  type CompileAndRenderAotResult,
} from "./aot.js";

// Re-export compile functions from compiler for convenience
// Use `compileAot` for CSR-only builds (no server rendering needed)
// Use `compileWithAot` when you need instruction translation for SSR
export {
  compileAot,
  type CompileAotOptions,
  type CompileAotResult,
  lowerDocument,
  linkTemplateSemantics,
  bindScopes,
  planAot,
  emitAotCode,
  emitTemplate,
  getExpressionParser,
  DEFAULT_SYNTAX,
  BUILTIN_SEMANTICS,
  DEFAULT_SEMANTICS, // Legacy alias
  type AotPlanModule,
  type AotCodeResult,
  type SerializedDefinition,
  type TemplateEmitResult,
  type ProjectSemantics,
  type ResourceGraph,
  type ResourceScopeId,
} from "@aurelia-ls/compiler";

// Runtime re-exports for SSR consumers
export { DI, Registration } from "@aurelia/kernel";
export { Aurelia, IPlatform, StandardConfiguration, CustomElement } from "@aurelia/runtime-html";
export type { IInstruction } from "@aurelia/template-compiler";
