/* =======================================================================================
 * SCOPE GRAPH MODEL (editor-agnostic)
 * ---------------------------------------------------------------------------------------
 * - Diagnostics for scoping stage (AU12xx)
 * - Frame ids/kinds and provenance (origin)
 * - Overlay base metadata for 'with' / 'promise'
 * - Locals (let/repeat/contextual/promiseAlias)
 * - Template/module containers
 * ======================================================================================= */

import type { SourceSpan, BindingSourceIR } from "./ir.js";
import type { FrameId, ExprId, ReadonlyExprIdMap } from "./identity.js";
import type { Provenance } from "./origin.js";
import type { CompilerDiagnostic } from "../diagnostics.js";

export type { FrameId } from "./identity.js";

/* ===========================
 * Diagnostics (scoping only)
 * =========================== */

/** AU12xx = ScopeGraph diagnostics (scoping-only; type errors belong to Typecheck). */
export type ScopeDiagCode =
  | "AU1201" // Invalid/unsupported repeat destructuring pattern (MVP: shallow only)
  | "AU1202" // Duplicate local name in the same frame
  | "AU1203"; // Invalid or unsupported expression (parser error)

export type ScopeDiagnostic = CompilerDiagnostic<ScopeDiagCode>;

/* ===========================
 * Frames & templates
 * =========================== */

export type FrameKind =
  | "root"     // component root
  | "overlay"; // controllers that overlay current scope (repeat/with/promise in MVP)

/** Provenance for frames, to help later phases reconstruct types precisely. */
export type FrameOrigin =
  | ({ kind: "repeat";  forOfAstId: ExprId } & Provenance)
  | ({ kind: "with";    valueExprId: ExprId } & Provenance)
  | ({ kind: "promise"; valueExprId: ExprId; branch?: "then" | "catch" } & Provenance);

/**
 * Overlay base kinds:
 * - 'with'     : with.value
 */
export type OverlayBase =
  | { kind: "with"; from: BindingSourceIR; span?: SourceSpan | null };

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
export type ScopeSymbol =
  | { kind: "let"; name: string; span?: SourceSpan | null }
  | { kind: "repeatLocal"; name: string; span?: SourceSpan | null }
  | { kind: "repeatContextual"; name: string; span?: SourceSpan | null }
  | { kind: "promiseAlias"; name: string; branch: "then" | "catch"; span?: SourceSpan | null };

export interface ScopeFrame {
  id: FrameId;
  parent: FrameId | null;
  kind: FrameKind;

  /**
   * Optional overlay base. When present, unresolved identifiers should be interpreted
   * as properties of this base (before falling back to parent frames).
   *
   * - 'with': controller value
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
  exprToFrame: ReadonlyExprIdMap<FrameId>;
}

export interface ScopeModule {
  version: "aurelia-scope@1";
  templates: ScopeTemplate[];
  /** Flat diagnostics related to scoping (not type analysis). */
  diags: ScopeDiagnostic[];
}
