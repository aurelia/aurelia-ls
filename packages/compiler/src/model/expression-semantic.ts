/* =======================================================================================
 * EXPRESSION SEMANTIC MODEL — types for demand-driven expression type resolution
 * ---------------------------------------------------------------------------------------
 * Operates at Tiers 1-3 independently of full template compilation.
 * Tier 4 (overlay-validated) remains in the compilation pipeline.
 *
 * The expression model is a sibling of the compilation pipeline, not a stage within it.
 * Its inputs (DOM tree, VM class type, TS checker) are always available during editing.
 *
 * derived_from:
 *   l1: models/attractor/l1/template-analysis.md §The Expression Semantic Model
 *   l2: models/attractor/l2/types.ts §Expression Semantic Model
 * ======================================================================================= */

import type { SourceSpan } from "./ir.js";
import type { NormalizedPath } from "./identity.js";
import type { ScopeFrame, FrameOrigin } from "./symbols.js";

// ============================================================================
// Resolution Tiers
// ============================================================================

/** Expression resolution tier — graduated from syntactic to overlay-validated. */
export type ExpressionResolutionTier = 0 | 1 | 2 | 3 | 4;

// ============================================================================
// Type Information
// ============================================================================

/** Per-expression type attribution. Decorates each expression node with its resolved type. */
export interface ExpressionTypeInfo {
  /** The tier that produced this result. */
  tier: ExpressionResolutionTier;
  /** Serialized TS type string (e.g., "string", "Item[]"). Undefined when unresolvable. */
  type: string | undefined;
  /** TS symbol name (for display and navigation). */
  symbol: string | undefined;
  /** Parent type for member access (e.g., "Item" for `.name`). */
  memberOf: string | undefined;
  /** Confidence level in the result. */
  confidence: "high" | "medium" | "low";
}

// ============================================================================
// Scope Context
// ============================================================================

/** VM class reference for root scope identifier resolution. */
export interface VmClassRef {
  file: NormalizedPath;
  className: string;
}

/**
 * Scope context at an expression position, built from template structure (Tier 1).
 *
 * The scope chain is a structural property of the template, determined by TC wrapping
 * order and each TC's scope effect. It does NOT require Link/Bind/Typecheck.
 */
export interface ExpressionScopeContext {
  /** The VM class providing root scope identifiers. Null when the template's owning CE hasn't been identified. */
  vmClass: VmClassRef | null;
  /** Innermost scope frame at this position. Walk parent chain outward via frame.parent → frame lookup. */
  frameId: string;
  /** All frames in the lightweight scope chain (flat list, root-first). */
  frames: LightweightScopeFrame[];
}

/**
 * Lightweight scope frame for the expression model.
 *
 * Uses the same symbol types as the compilation pipeline's ScopeFrame, but carries
 * additional expression-model-specific data (overlay expression AST for with.bind).
 * Parent references are by id (string), not direct reference.
 */
export interface LightweightScopeFrame {
  id: string;
  parent: string | null;
  kind: "root" | "overlay";
  symbols: import("./symbols.js").ScopeSymbol[];
  isBoundary: boolean;
  /** Frame origin metadata — same as ScopeFrame.origin from the bind stage. */
  origin?: FrameOrigin | null;
}

// ============================================================================
// Completions
// ============================================================================

/** Completion item at a position within an expression. */
export interface ExpressionCompletion {
  label: string;
  kind: "property" | "method" | "variable" | "contextual" | "converter" | "behavior";
  type: string | undefined;
  insertText: string | undefined;
  tier: ExpressionResolutionTier;
  /** Sort priority — lower = higher in list. Inner scope items get lower values. */
  sortPriority: number;
}

// ============================================================================
// Expression Semantic Model Interface
// ============================================================================

/**
 * Demand-driven expression type resolution (Tiers 1-3).
 *
 * STATELESS with respect to TypeScript types. Every query goes fresh to the TS
 * checker at request time. No type results are cached. Currency is inherited from
 * TypeScript's own language service. This makes Tiers 1-3 immune to staleness by
 * construction — not by correct invalidation, but by the absence of cached state
 * that could become stale.
 */
export interface ExpressionSemanticModel {
  /** Tier 1: scope context from template structure. Always available. */
  getScopeAt(offset: number): ExpressionScopeContext;

  /** Tier 2: resolve a root identifier against the scope chain + VM class. */
  resolveIdentifier(name: string, scope: ExpressionScopeContext): ExpressionTypeInfo;

  /** Tier 3: type at a cursor position within an expression. */
  getTypeAt(offset: number): ExpressionTypeInfo | null;

  /** Tier 3: completions at a position (auto-detects scope vs member context). */
  getCompletionsAt(offset: number): ExpressionCompletion[];

  /** Tier 3: member completions for the expression ending just before the offset. */
  getMemberCompletionsAt(offset: number): ExpressionCompletion[];

  /**
   * Tier 3: member completions by resolving a property chain text.
   * Used as fallback when AST-based resolution fails (e.g., incomplete `obj.`).
   * @param chain - dot-separated property path before the dot (e.g., "obj" or "obj.nested")
   * @param offset - template offset for scope resolution
   */
  getMemberCompletionsForChain(chain: string, offset: number): ExpressionCompletion[];

  /** Highest tier currently available for this template. */
  availableTier(): ExpressionResolutionTier;
}
