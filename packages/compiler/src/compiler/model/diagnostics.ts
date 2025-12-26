/* =======================================================================================
 * DIAGNOSTIC MODEL (foundation types only)
 * ---------------------------------------------------------------------------------------
 * Pure type definitions with no external dependencies.
 * Builder functions live in shared/diagnostics.ts.
 * ======================================================================================= */

import type { SourceSpan } from "./ir.js";
import type { Origin } from "./origin.js";

export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticSource =
  | "lower"
  | "resolve-host"
  | "bind"
  | "typecheck"
  | "overlay-plan"
  | "overlay-emit";

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
