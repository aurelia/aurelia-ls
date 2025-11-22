import { normalizeSpan } from "./model/span.js";
import { provenanceSpan } from "./model/origin.js";
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

/** Resolve the canonical span for a diagnostic, preferring provenance when available. */
export function diagnosticSpan(diag: CompilerDiagnostic): SourceSpan | null {
  const resolved = provenanceSpan(diag.origin ?? null) ?? diag.span ?? null;
  return resolved ? normalizeSpan(resolved) : null;
}
