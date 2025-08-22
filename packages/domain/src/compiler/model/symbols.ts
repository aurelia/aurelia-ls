/* =======================================================================================
 * SCOPE GRAPH MODEL (editor-agnostic)
 * ---------------------------------------------------------------------------------------
 * - Diagnostics for scoping stage (AU12xx)
 * - Frame ids/kinds and provenance (origin)
 * - Overlay base metadata for 'with' / 'promise'
 * - Locals (let/repeat/contextual/promiseAlias)
 * - Template/module containers
 * ======================================================================================= */

import type { SourceSpan, ExprId, BindingSourceIR } from "./ir.js";

/* ===========================
 * Diagnostics (scoping only)
 * =========================== */

/** AU12xx = ScopeGraph diagnostics (scoping-only; type errors belong to Typecheck). */
export type ScopeDiagCode =
  | "AU1201" // Invalid/unsupported repeat destructuring pattern (MVP: shallow only)
  | "AU1202"; // Duplicate local name in the same frame

export interface ScopeDiagnostic {
  code: ScopeDiagCode;
  message: string;
  span?: SourceSpan | null;
}

/* ===========================
 * Frames & templates
 * =========================== */

/** Frame ids are stable within a single ScopeTemplate only. */
export type FrameId = number & { __brand?: "FrameId" };

export type FrameKind =
  | "root"     // component root
  | "overlay"; // controllers that overlay current scope (repeat/with/promise in MVP)

/** Provenance for frames, to help later phases reconstruct types precisely. */
export type FrameOrigin =
  | { kind: "repeat";  forOfAstId: ExprId }
  | { kind: "with";    valueExprId: ExprId }
  | { kind: "promise"; valueExprId: ExprId; branch?: "then" | "catch" };

/**
 * Overlay base kinds:
 * - 'with'     : with.value
 * - 'promise'  : promise.value (Awaited), constrained by branch
 */
export type OverlayBase =
  | { kind: "with"; from: BindingSourceIR; span?: SourceSpan | null }
  | { kind: "promise"; from: BindingSourceIR; span?: SourceSpan | null };

/**
 * Symbols visible in a frame.
 * - 'let'                : <let foo.bind="...">
 * - 'repeatLocal'        : repeat.for declaration locals
 * - 'repeatContextual'   : $index/$first/... injected by repeat
 * - 'promiseAlias'       : <template then="r">/<template catch="e"> alias
 *
 * NOTE(binding-context): `<let to-binding-context>` does not change lexical visibility;
 * it only affects the *write lane* at runtime. We track names uniformly here.
 */
export type SymbolKind =
  | "let"
  | "repeatLocal"
  | "repeatContextual"
  | "promiseAlias";

export interface ScopeSymbol {
  kind: SymbolKind;
  name: string;
  span?: SourceSpan | null;
}

export interface ScopeFrame {
  id: FrameId;
  parent: FrameId | null;
  kind: FrameKind;

  /**
   * Optional overlay base. When present, unresolved identifiers should be interpreted
   * as properties of this base (before falling back to parent frames).
   *
   * - 'with'     → controller value
   * - 'promise'  → resolved value (branch)
   *
   * (repeat has explicit locals/contextuals instead of an overlay base.)
   */
  overlay?: OverlayBase | null;

  /** Symbols introduced in this frame (let/repeat locals/contextuals/promise alias). */
  symbols: ScopeSymbol[];

  /** Optional provenance of this frame. */
  origin?: FrameOrigin | null;

  /**
   * `<let>` locals: map local name → single ExprId used for the value.
   * - If authored value was an interpolation, record the first embedded expr id.
   * - Later phases use this to compute a concrete type for the local.
   */
  letValueExprs?: Record<string, ExprId> | null;
}

export interface ScopeTemplate {
  name?: string;

  /** All frames belonging to this template tree (root-first, stable order). */
  frames: ScopeFrame[];

  /** Root frame id for this template. */
  root: FrameId;

  /**
   * Map each expression occurrence to the frame where it is evaluated.
   * Keyed by ExprId (string brand).
   */
  exprToFrame: Record<string /* ExprId */, FrameId>;
}

export interface ScopeModule {
  version: "aurelia-scope@1";
  templates: ScopeTemplate[];
  /** Flat diagnostics related to scoping (not type analysis). */
  diags: ScopeDiagnostic[];
}
