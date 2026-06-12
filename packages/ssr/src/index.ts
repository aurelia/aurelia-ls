export { render } from './render.js';
export type {
  ComponentClass,
  RenderOptions,
  RenderResult,
  SSRRequestContext,
} from './render.js';
export { createServerPlatform, getDocument } from './platform.js';
export type { ServerPlatformOptions } from './platform.js';
export { translateInstructions } from './instruction-translator.js';
export type { NestedDefinition, TranslationContext } from './instruction-translator.js';
export {
  processSSROutput,
  stripAuMarkers,
  syncPropertiesForSSR,
} from './ssr-processor.js';
export type { SSRProcessOptions, SSRProcessResult } from './ssr-processor.js';
export { debugControllerTree, recordManifest } from './manifest-recorder.js';
export { isSSRScope, isSSRTemplateController } from '@aurelia/runtime-html';
export {
  getComponentName,
  hasComponentDefinition,
  patchComponentDefinition,
} from './patch.js';
export type { PatchOptions, StaticAuDefinition } from './patch.js';
export { createSSRHandler, isSSRHandler } from './handler.js';
export type {
  SSRHandler,
  SSRHandlerConfig,
  SSRRenderOptions,
  SSRResult,
} from './handler.js';
export { compileAndRenderAot, compileWithAot } from './aot.js';
export type {
  AotCompileOptions,
  AotCompileResult,
  CompileAndRenderAotOptions,
  CompileAndRenderAotResult,
} from './aot.js';
export {
  bindScopes,
  BUILTIN_SEMANTICS,
  compileAot,
  DEFAULT_SYNTAX,
  emitAotCode,
  emitTemplate,
  getExpressionParser,
  linkTemplateSemantics,
  lowerDocument,
  planAot,
} from '@aurelia-ls/compiler';
export { DI, Registration } from '@aurelia/kernel';
export {
  Aurelia,
  CustomElement,
  IPlatform,
  StandardConfiguration,
} from '@aurelia/runtime-html';
