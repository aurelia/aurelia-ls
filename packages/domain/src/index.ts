export { compileTemplate, compileTemplateToOverlay } from "./compiler/facade.js";
export { PRELUDE_TS } from "./prelude.js";

export { getExpressionParser } from "./parsers/expression-parser.js";
export { DEFAULT_SYNTAX } from "./compiler/language/syntax.js";

export type { VmReflection } from "./compiler/phases/50-plan/types.js";
export type { TemplateCompilation } from "./compiler/facade.js";
export type {
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateQueryFacade,
  TemplateExpressionInfo,
  TemplateBindableInfo,
  TemplateNodeInfo,
  TemplateControllerInfo,
} from "./contracts.js";

export { compileTemplateToSSR } from "./compiler/facade.js";
export type { SsrPlanModule } from "./compiler/phases/50-plan/ssr-types.js";
