/**
 * @aurelia-ls/build - Build tools and SSR for Aurelia
 *
 * This package provides:
 * - Server-side rendering (SSR) for Aurelia templates
 * - AOT compilation utilities
 * - Build tool integrations (Vite) [in progress]
 *
 * Key principle: Components define their own state naturally. No external
 * state injection - parent-child communication happens via bindables.
 */

// SSR Core
export * from "./ssr/index.js";

// SSR Handler (production entry point)
export {
  createSSRHandler,
  isSSRHandler,
  type SSRHandler,
  type SSRHandlerConfig,
  type SSRRenderOptions,
  type SSRResult,
} from "./ssr/handler.js";

// Re-export compile functions from domain for convenience
export {
  lowerDocument,
  resolveHost,
  bindScopes,
  planAot,
  emitAotCode,
  emitTemplate,
  getExpressionParser,
  DEFAULT_SYNTAX,
  DEFAULT_SEMANTICS,
  type AotPlanModule,
  type AotCodeResult,
  type SerializedDefinition,
  type TemplateEmitResult,
  type Semantics,
  type ResourceGraph,
  type ResourceScopeId,
} from "@aurelia-ls/domain";

// AOT compilation API
export {
  compileWithAot,
  compileAndRenderAot,
  type AotCompileOptions,
  type AotCompileResult,
  type CompileAndRenderAotOptions,
  type CompileAndRenderAotResult,
} from "./aot.js";

// Runtime re-exports for SSR consumers
export { DI, Registration } from "@aurelia/kernel";
export { Aurelia, IPlatform, StandardConfiguration, CustomElement } from "@aurelia/runtime-html";
export type { IInstruction } from "@aurelia/template-compiler";
