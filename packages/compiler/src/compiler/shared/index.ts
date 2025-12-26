// Shared compiler infrastructure
//
// Cross-cutting utilities used by multiple layers.
// IMPORTANT: This module only imports from model/ - no other compiler layers.

// VM Reflection - cross-cutting compiler input
export type { VmReflection, SynthesisOptions } from "./vm-reflection.js";

// Diagnostics
export {
  buildDiagnostic,
  diagnosticSpan,
  type DiagnosticSeverity,
  type DiagnosticSource,
  type DiagnosticRelated,
  type BuildDiagnosticInput,
  type CompilerDiagnostic,
} from "./diagnostics.js";

// Expression utilities
export {
  collectExprSpans,
  indexExprTable,
  ensureExprSpan,
  resolveExprSpanIndex,
  buildExprSpanIndex,
  exprIdsOf,
  primaryExprId,
  collectExprMemberSegments,
  isInterpolation,
  type HtmlMemberSegment,
  type ExprSpanIndex,
} from "./expr-utils.js";
