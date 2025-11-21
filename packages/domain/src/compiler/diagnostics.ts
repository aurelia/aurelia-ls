import type { SourceSpan } from "./model/ir.js";

export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticSource =
  | "lower"
  | "resolve-host"
  | "bind"
  | "typecheck"
  | "plan"
  | "emit"
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
}
