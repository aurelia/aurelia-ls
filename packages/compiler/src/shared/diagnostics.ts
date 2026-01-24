import { normalizeSpanMaybe } from "../model/span.js";
import { originFromSpan, provenanceSpan } from "../model/origin.js";
import type { SourceSpan } from "../model/ir.js";
import type { Origin } from "../model/origin.js";

// Re-export foundation types from model
export type {
  DiagnosticSeverity,
  DiagnosticSource,
  DiagnosticRelated,
  CompilerDiagnostic,
} from "../model/diagnostics.js";

import type { DiagnosticSeverity, DiagnosticSource, DiagnosticRelated, CompilerDiagnostic } from "../model/diagnostics.js";

export interface BuildDiagnosticInput<
  TCode extends string = string,
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  code: TCode;
  message: string;
  source: DiagnosticSource;
  severity?: DiagnosticSeverity;
  span?: SourceSpan | null | undefined;
  origin?: Origin | null;
  related?: readonly DiagnosticRelated[];
  data?: Readonly<TData>;
  /**
   * Optional description for the origin trace when a span is provided.
   * Handy for differentiating between multiple diagnostics emitted at the same site.
   */
  description?: string;
}

/** Centralized diagnostic builder that normalizes spans and attaches provenance. */
export function buildDiagnostic<
  TCode extends string,
  TData extends Record<string, unknown> = Record<string, unknown>,
>(input: BuildDiagnosticInput<TCode, TData>): CompilerDiagnostic<TCode, TData> {
  const span = normalizeSpanMaybe(input.span);
  const origin = input.origin ?? (span ? originFromSpan(input.source, span, input.description) : null);
  const diag: CompilerDiagnostic<TCode, TData> = {
    code: input.code,
    message: input.message,
    source: input.source,
    ...(input.severity ? { severity: input.severity } : {}),
    span,
    origin,
    ...(input.related ? { related: input.related } : {}),
    ...(input.data ? { data: input.data } : {}),
  };
  return diag;
}

/** Resolve the canonical span for a diagnostic, preferring provenance when available. */
export function diagnosticSpan(diag: CompilerDiagnostic): SourceSpan | null {
  const resolved = provenanceSpan(diag.origin ?? null) ?? diag.span ?? null;
  return normalizeSpanMaybe(resolved);
}
