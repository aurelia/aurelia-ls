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
  | "link"
  | "resolution"
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
export interface CompilerDiagnostic<
  TCode extends string = string,
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  code: TCode;
  message: string;
  source: DiagnosticSource;
  severity?: DiagnosticSeverity;
  span?: SourceSpan | null;
  related?: readonly DiagnosticRelated[];
  data?: Readonly<TData>;
  origin?: Origin | null;
}
