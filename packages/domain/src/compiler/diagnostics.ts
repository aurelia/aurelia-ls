import { normalizeSpanMaybe } from "./model/span.js";
import { originFromSpan, provenanceSpan } from "./model/origin.js";
import type { SourceSpan } from "./model/ir.js";
import type { Origin } from "./model/origin.js";

export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticSource =
  | "lower"
  | "resolve-host"
  | "bind"
  | "typecheck"
  | "overlay-plan"
  | "overlay-emit"
  | "ssr-plan"
  | "ssr-emit";

export interface DiagnosticRelated {
  code?: string;
  message: string;
  span?: SourceSpan | null;
}

export interface BuildDiagnosticInput<TCode extends string = string> {
  code: TCode;
  message: string;
  source: DiagnosticSource;
  severity?: DiagnosticSeverity;
  span?: SourceSpan | null | undefined;
  origin?: Origin | null;
  /**
   * Optional description for the origin trace when a span is provided.
   * Handy for differentiating between multiple diagnostics emitted at the same site.
   */
  description?: string;
}

/** Unified diagnostic envelope for compiler/LSP phases. */
export interface CompilerDiagnostic<TCode extends string = string> {
  code: TCode;
  message: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  span?: SourceSpan | null;
  related?: DiagnosticRelated[];
  origin?: Origin | null;
}

/** Centralized diagnostic builder that normalizes spans and attaches provenance. */
export function buildDiagnostic<TCode extends string>(input: BuildDiagnosticInput<TCode>): CompilerDiagnostic<TCode> {
  const span = normalizeSpanMaybe(input.span);
  const origin = input.origin ?? (span ? originFromSpan(input.source, span, input.description) : null);
  const diag: CompilerDiagnostic<TCode> = {
    code: input.code,
    message: input.message,
    source: input.source,
    severity: input.severity ?? "error",
    span,
    origin,
  };
  return diag;
}

/** Resolve the canonical span for a diagnostic, preferring provenance when available. */
export function diagnosticSpan(diag: CompilerDiagnostic): SourceSpan | null {
  const resolved = provenanceSpan(diag.origin ?? null) ?? diag.span ?? null;
  return normalizeSpanMaybe(resolved);
}
