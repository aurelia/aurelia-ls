export { PRELUDE_TS } from './prelude.js';
export { compileTemplate } from './facade.js';
export type {
  CompileOptions,
  CompileOverlayResult,
  StageMetaSnapshot,
  TemplateCompilation,
  TemplateDiagnostics,
} from './facade.js';
export { compileAot } from './facade-aot.js';
export type {
  AotSemanticSnapshot,
  CompileAotOptions,
  CompileAotResult,
} from './facade-aot.js';
export { lowerDocument } from './analysis/10-lower/lower.js';
export { linkTemplateSemantics } from './analysis/20-link/resolve.js';
export { bindScopes } from './analysis/30-bind/bind.js';
export { getExpressionParser } from './parsing/expression-parser.js';
export { DEFAULT_SYNTAX } from './parsing/attribute-parser.js';
export {
  BUILTIN_SEMANTICS,
  buildTemplateSyntaxRegistry,
  prepareProjectSemantics,
} from './schema/registry.js';
export { buildResourceCatalog } from './schema/catalog.js';
export { createSemanticModel } from './schema/model.js';
export { canonicalDocumentUri } from './program/paths.js';
export { DefaultTemplateProgram } from './program/program.js';
export { DefaultTemplateBuildService } from './program/services.js';
export type {
  MaterializedSemantics,
  ProjectSemantics,
  ProjectSemantics as Semantics,
  ResourceCatalog,
  TemplateSyntaxRegistry,
} from './schema/types.js';
export { planAot } from './synthesis/aot/plan.js';
export { emitAotCode } from './synthesis/aot/emit.js';
export { collectNestedTemplateHtmlTree, emitTemplate } from './synthesis/aot/emit-template.js';
export type {
  AotCodeResult,
  AotPlanModule,
} from './synthesis/aot/types.js';
