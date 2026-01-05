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

// Instrumentation (CompileTrace)
export {
  // Core types
  type Span,
  type SpanEvent,
  type AttributeValue,
  type AttributeMap,
  type ReadonlyAttributeMap,
  type CompileTrace,
  type TraceExporter,
  type CreateTraceOptions,
  type CompilerAttributeKey,
  // Semantic attribute keys
  CompilerAttributes,
  // No-op implementations (zero cost when disabled)
  NOOP_SPAN,
  NOOP_TRACE,
  // Factory
  createTrace,
  // Utilities
  nowNanos,
  formatDuration,
} from "./trace.js";

// Trace Exporters
export {
  // No-op exporter
  NOOP_EXPORTER,
  // Console exporter (dev debugging)
  ConsoleExporter,
  createConsoleExporter,
  type ConsoleExporterOptions,
  // Collecting exporter (testing)
  CollectingExporter,
  createCollectingExporter,
  // Multi-exporter (fan-out)
  MultiExporter,
  createMultiExporter,
  // JSON exporter (build analysis)
  JSONExporter,
  createJSONExporter,
  type JSONExporterOptions,
  type SerializedSpan,
  type SerializedEvent,
  type SerializedTrace,
  type TraceSummary,
} from "./trace-exporters.js";

// Debug Channels (decision/data visibility)
export {
  debug,
  refreshDebugChannels,
  configureDebug,
  isDebugEnabled,
  type Debug,
  type DebugChannel,
  type DebugData,
  type DebugConfig,
} from "./debug.js";

// String Suggestions ("Did you mean?")
export {
  levenshteinDistance,
  findSimilar,
  findBestMatch,
  formatSuggestion,
  type FindSimilarOptions,
} from "./suggestions.js";
