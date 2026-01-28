/* =======================================================================================
 * SCOPE GRAPH MODEL (editor-agnostic)
 * ---------------------------------------------------------------------------------------
 * - Diagnostics for scoping stage
 * - Frame ids/kinds and provenance (origin)
 * - Overlay base metadata
 * - Locals (let/iterator/contextual/alias)
 * - Template/module containers
 *
 * ## Design: Pattern-Based Frame Origins
 *
 * FrameOrigin kinds are intentionally GENERIC (iterator, valueOverlay, promiseBranch)
 * rather than controller-specific (repeat, with, then). This enables:
 *
 * 1. **Custom Template Controllers**: `virtual-repeat` or a custom `async-with` can
 *    opt into the same type inference as built-in controllers by using the same
 *    trigger/scope configuration. The type-analysis phase doesn't need to know about
 *    every controller name — it just handles patterns.
 *
 * 2. **Single Source of Truth**: Controller behavior is defined entirely in
 *    ControllerConfig (trigger, scope, injects). The bind phase reads the config
 *    to decide which origin pattern applies, rather than hardcoding controller names.
 *
 * 3. **Extensibility**: Adding a new iterator-based TC requires only adding its
 *    ControllerConfig — no changes to bind.ts or type-analysis.ts.
 *
 * The mapping from config → origin pattern:
 * - trigger.kind="iterator" + scope="overlay" → FrameOrigin.kind="iterator"
 * - trigger.kind="value" + scope="overlay" + injects.alias → FrameOrigin.kind="valueOverlay"
 * - trigger.kind="value" + scope="overlay" (promise) → FrameOrigin.kind="promiseValue"
 * - trigger.kind="branch" + linksTo="promise" → FrameOrigin.kind="promiseBranch"
 *
 * ======================================================================================= */

import type { SourceSpan, BindingSourceIR } from "./ir.js";
import type { FrameId, ExprId, ReadonlyExprIdMap } from "./identity.js";
import type { Provenance } from "./origin.js";
import type { CompilerDiagnostic } from "./diagnostics.js";
import type { DiagnosticCodeForStage, DiagnosticDataFor } from "../diagnostics/catalog/index.js";

export type { FrameId } from "./identity.js";

/* ===========================
 * Diagnostics (scoping only)
 * =========================== */

/** ScopeGraph diagnostics (scoping-only; type errors belong to Typecheck). */
export type ScopeDiagCode = DiagnosticCodeForStage<"bind">;

export type ScopeDiagnostic = CompilerDiagnostic<ScopeDiagCode, DiagnosticDataFor<ScopeDiagCode>>;

/* ===========================
 * Frames & templates
 * =========================== */

export type FrameKind =
  | "root"     // component root
  | "overlay"; // controllers that overlay current scope

/**
 * Frame origin — provenance metadata for type inference.
 *
 * These are PATTERN-BASED, not controller-specific. This allows userland template
 * controllers to get the same type inference as built-ins by using matching configs.
 *
 * | Pattern        | What it means                          | Type inference behavior              |
 * |----------------|----------------------------------------|--------------------------------------|
 * | iterator       | ForOfStatement-based iteration         | Extract element type, project locals |
 * | valueOverlay   | Value expression overlays scope        | Overlay base becomes implicit `this` |
 * | promiseValue   | Promise expression (parent of branches)| Extract promise type for branches    |
 * | promiseBranch  | Branch of a promise (then/catch)       | Alias typed from parent's promise    |
 */
export type FrameOrigin =
  // Iterator pattern: repeat, virtual-repeat, or any TC with trigger.kind="iterator"
  | ({ kind: "iterator"; forOfAstId: ExprId; controller: string } & Provenance)
  // Value overlay pattern: with, or any TC with scope="overlay" + injects.alias
  | ({ kind: "valueOverlay"; valueExprId: ExprId; controller: string } & Provenance)
  // Promise value pattern: promise controller (parent that holds the promise expression)
  | ({ kind: "promiseValue"; valueExprId: ExprId; controller: string } & Provenance)
  // Promise branch pattern: then/catch (child branches that receive resolved/rejected value)
  | ({ kind: "promiseBranch"; branch: "then" | "catch"; valueExprId?: ExprId; controller: string } & Provenance);

/**
 * Overlay base — the value that becomes the implicit scope for unqualified names.
 *
 * When present, unresolved identifiers are first looked up as properties of this
 * base before falling back to parent frames. Used by `with` and similar controllers.
 */
export type OverlayBase =
  | { kind: "value"; from: BindingSourceIR; span?: SourceSpan | null };

/**
 * Symbols visible in a frame.
 *
 * These are GENERIC symbol kinds that work for any controller:
 * - 'let'         : <let foo.bind="...">
 * - 'iteratorLocal'    : Loop variable from iterator destructuring (repeat, virtual-repeat, etc.)
 * - 'contextual'  : Injected variable ($index, $first, etc.) from config.injects.contextuals
 * - 'alias'       : Named alias from config.injects.alias (with, then, catch, etc.)
 *
 * NOTE(binding-context): `<let to-binding-context>` does not change lexical visibility;
 * it only affects the *write lane* at runtime. We track names uniformly here.
 */
export type ScopeSymbol =
  | { kind: "let"; name: string; span?: SourceSpan | null }
  | { kind: "iteratorLocal"; name: string; span?: SourceSpan | null }
  | { kind: "contextual"; name: string; span?: SourceSpan | null }
  | { kind: "alias"; name: string; aliasKind: "value" | "then" | "catch"; span?: SourceSpan | null };

export interface ScopeFrame {
  id: FrameId;
  parent: FrameId | null;
  kind: FrameKind;

  /**
   * Optional overlay base. When present, unresolved identifiers should be interpreted
   * as properties of this base (before falling back to parent frames).
   *
   * Used by controllers with scope="overlay" and injects.alias (e.g., `with`).
   * Iterator-based controllers (e.g., `repeat`) use explicit locals instead.
   */
  overlay?: OverlayBase | null;

  /** Symbols introduced in this frame (let, iterator locals, contextuals, aliases). */
  symbols: ScopeSymbol[];

  /** Origin metadata for type inference. See FrameOrigin for pattern-based design. */
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
}
