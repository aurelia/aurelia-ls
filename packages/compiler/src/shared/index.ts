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

// Elm-style error handling (Diagnosed<T>)
export {
  // Core types
  type Diagnosed,
  type StubMarker,
  // Stub detection
  isStub,
  getStubMarker,
  withStub,
  // Constructors
  pure,
  diag,
  withDiags,
  // Transformations
  map,
  flatMap,
  all,
  collect,
  // Recovery helpers
  require,
  lookup,
  // Stub propagation
  propagateStub,
  anyStub,
  // Imperative helper
  DiagnosticAccumulator,
} from "./diagnosed.js";
