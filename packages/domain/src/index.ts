export { compileTemplateToOverlay } from "./compiler/facade.js";
export { PRELUDE_TS } from "./prelude.js";

// Export the DI-backed parser so the server can construct once and reuse.
export { getExpressionParser } from "./parsers/expression-parser.js";
export { DEFAULT_SYNTAX } from "./compiler/language/syntax.js";

export type { VmReflection } from "./compiler/phases/50-plan/types.js";

export { compileTemplateToSSR } from "./compiler/facade.js";
export type { SsrPlanModule } from "./compiler/phases/50-plan/ssr-types.js";
