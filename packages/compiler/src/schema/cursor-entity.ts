// Cursor Entity — L2 Shared Entity Resolution
//
// Every cursor position in a template maps to at most one CursorEntity.
// All features (hover, definition, references, rename, semantic tokens)
// resolve the SAME entity for a given position, then project what they need.
//
// This replaces per-feature resolveHoverPosition / resolveNavigablePosition /
// resolveRenameableSymbol with a single shared resolution.
//
// L2 reference: models/attractor/l2/types.ts lines 1530-1553
//
// The entity types cover the full template position taxonomy from F3:
// elements, attributes, bindings, commands, expressions, scope tokens,
// contextual variables, ref targets, let bindings, interpolations,
// au-slot, as-element, import-from, local-template, spread.

import type { NormalizedPath } from "../model/index.js";
import type {
  BindingMode,
  ResourceScopeId,
  ElementRes,
  AttrRes,
  Bindable,
  ControllerConfig,
  ValueConverterSig,
  BindingBehaviorSig,
  BindingCommandConfig,
  ConfidenceLevel,
  ConfidenceSignals,
  ResourceView,
  BindableView,
  ConvergenceRef,
} from "./types.js";
import type { SourceSpan } from "../model/ir.js";

// ============================================================================
// Cursor Entity — Discriminated Union
// ============================================================================

/**
 * The semantic entity at a cursor position.
 *
 * Shared across all features: hover reads it for display, navigation follows
 * its provenance, rename collects its references, diagnostics evaluates rules
 * at it, semantic tokens classifies it.
 *
 * Each feature projects the subset it needs; the resolution from cursor
 * offset to entity happens once.
 */
export type CursorEntity =
  // --- Resource-level positions ---
  | CETagEntity
  | CAAttrEntity
  | TCAttrEntity
  | BindableEntity
  | CommandEntity

  // --- Expression-level positions ---
  | ScopeIdentifierEntity
  | MemberAccessEntity
  | GlobalAccessEntity
  | ValueConverterEntity
  | BindingBehaviorEntity

  // --- Scope positions ---
  | ContextualVarEntity
  | ScopeTokenEntity
  | IteratorDeclEntity

  // --- Template structure positions ---
  | AuSlotEntity
  | RefTargetEntity
  | LetBindingEntity
  | PlainAttrBindingEntity
  | PlainAttrFallbackEntity
  | InterpolationEntity
  | AsElementEntity
  | ImportFromEntity
  | LocalTemplateNameEntity
  | SpreadEntity;

// --- Resource entities ---

export interface CETagEntity {
  readonly kind: 'ce-tag';
  readonly element: ElementRes;
  readonly name: string;
  readonly scopeId: ResourceScopeId | null;
  readonly span: SourceSpan;
  readonly ref: ConvergenceRef | null;
}

export interface CAAttrEntity {
  readonly kind: 'ca-attr';
  readonly attribute: AttrRes;
  readonly name: string;
  readonly usedAlias: string | null;
  readonly span: SourceSpan;
  readonly ref: ConvergenceRef | null;
}

export interface TCAttrEntity {
  readonly kind: 'tc-attr';
  readonly attribute: AttrRes;
  readonly controller: ControllerConfig | null;
  readonly name: string;
  readonly span: SourceSpan;
  readonly ref: ConvergenceRef | null;
}

export interface BindableEntity {
  readonly kind: 'bindable';
  readonly bindable: Bindable;
  readonly parentKind: string;
  readonly parentName: string;
  readonly effectiveMode: BindingMode | null;
  readonly span: SourceSpan;
  readonly parentRef: ConvergenceRef | null;
}

export interface CommandEntity {
  readonly kind: 'command';
  readonly command: BindingCommandConfig;
  readonly name: string;
  readonly span: SourceSpan;
}

// --- Expression entities ---
// All expression entities carry vmRef: the ConvergenceRef of the owning
// CE view-model class, derived by walking the scope chain to the CE boundary.
// This enables the full cross-domain traversal: template binding → resource
// identity → epistemic provenance → source location.
// L1 cross-domain-provenance-mapping §Cross-domain traversals.

export interface ScopeIdentifierEntity {
  readonly kind: 'scope-identifier';
  readonly name: string;
  readonly type: string | undefined;
  readonly vmRef: ConvergenceRef | null;
  readonly span: SourceSpan;
}

export interface MemberAccessEntity {
  readonly kind: 'member-access';
  readonly memberName: string;
  readonly parentType: string | undefined;
  readonly memberType: string | undefined;
  readonly vmRef: ConvergenceRef | null;
  readonly span: SourceSpan;
}

export interface GlobalAccessEntity {
  readonly kind: 'global-access';
  readonly globalName: string;
  readonly globalType: string;
  readonly vmRef: ConvergenceRef | null;
  readonly span: SourceSpan;
}

export interface ValueConverterEntity {
  readonly kind: 'value-converter';
  readonly name: string;
  readonly converter: ValueConverterSig | null;
  readonly span: SourceSpan;
  readonly ref: ConvergenceRef | null;
}

export interface BindingBehaviorEntity {
  readonly kind: 'binding-behavior';
  readonly name: string;
  readonly behavior: BindingBehaviorSig | null;
  readonly span: SourceSpan;
  readonly ref: ConvergenceRef | null;
}

// --- Scope entities ---

export interface ContextualVarEntity {
  readonly kind: 'contextual-var';
  readonly name: string;
  readonly type: string;
  readonly span: SourceSpan;
}

export interface ScopeTokenEntity {
  readonly kind: 'scope-token';
  readonly token: '$this' | '$parent' | 'this';
  readonly resolvedType: string | undefined;
  readonly parentHops: number;
  readonly span: SourceSpan;
}

export interface IteratorDeclEntity {
  readonly kind: 'iterator-decl';
  readonly iteratorVar: string;
  readonly itemType: string | undefined;
  readonly collectionType: string | undefined;
  readonly span: SourceSpan;
}

// --- Template structure entities ---

export interface AuSlotEntity {
  readonly kind: 'au-slot';
  readonly slotName: string;
  readonly targetCEName: string | undefined;
  readonly span: SourceSpan;
}

export interface RefTargetEntity {
  readonly kind: 'ref-target';
  readonly targetName: string;
  readonly variableName: string;
  readonly span: SourceSpan;
}

export interface LetBindingEntity {
  readonly kind: 'let-binding';
  readonly targetName: string;
  readonly attributeName: string;
  readonly toBindingContext: boolean;
  readonly expressionType: string | undefined;
  readonly span: SourceSpan;
}

export interface PlainAttrBindingEntity {
  readonly kind: 'plain-attr-binding';
  readonly attributeName: string;
  readonly domProperty: string | undefined;
  readonly effectiveMode: BindingMode | null;
  readonly span: SourceSpan;
}

export interface PlainAttrFallbackEntity {
  readonly kind: 'plain-attr-fallback';
  readonly attributeName: string;
  readonly parentCEGapCount: number;
  readonly span: SourceSpan;
}

export interface InterpolationEntity {
  readonly kind: 'interpolation';
  readonly innerEntity: CursorEntity;
  readonly span: SourceSpan;
}

export interface AsElementEntity {
  readonly kind: 'as-element';
  readonly targetCEName: string;
  readonly targetCE: ElementRes | null;
  readonly span: SourceSpan;
  readonly ref: ConvergenceRef | null;
}

export interface ImportFromEntity {
  readonly kind: 'import-from';
  readonly path: string;
  readonly file: NormalizedPath;
  readonly span: SourceSpan;
}

export interface LocalTemplateNameEntity {
  readonly kind: 'local-template-name';
  readonly name: string;
  readonly containingTemplate: NormalizedPath;
  readonly span: SourceSpan;
}

export interface SpreadEntity {
  readonly kind: 'spread';
  readonly spreadKind: 'transferred' | 'value';
  readonly span: SourceSpan;
}

// ============================================================================
// Entity Resolution (stub — to be implemented per-feature)
// ============================================================================

/**
 * Resolve the semantic entity at a cursor offset in a compiled template.
 *
 * Returns null for non-semantic positions (whitespace, comments, plain HTML
 * without semantic significance). This is rung 4 (not applicable).
 *
 * All features call this first, then project what they need from the entity.
 */
export type ResolveCursorEntity = (
  offset: number,
  templatePath: NormalizedPath,
) => CursorEntity | null;

// ============================================================================
// Feature Projection Helpers
// ============================================================================

/** Does this entity have a navigable definition? */
export function isNavigable(entity: CursorEntity): boolean {
  switch (entity.kind) {
    case 'ce-tag':
    case 'ca-attr':
    case 'tc-attr':
    case 'bindable':
    case 'value-converter':
    case 'binding-behavior':
    case 'scope-identifier':
    case 'member-access':
    case 'as-element':
    case 'import-from':
    case 'local-template-name':
    case 'au-slot':
    case 'ref-target':
    case 'scope-token':
      return true;
    case 'command':
    case 'contextual-var':
    case 'global-access':
    case 'iterator-decl':
    case 'let-binding':
    case 'plain-attr-binding':
    case 'plain-attr-fallback':
    case 'spread':
      return false;
    case 'interpolation':
      return isNavigable(entity.innerEntity);
  }
}

/** Does this entity support rename? */
export function isRenameable(entity: CursorEntity): boolean {
  switch (entity.kind) {
    case 'ce-tag':
    case 'ca-attr':
    case 'tc-attr':
    case 'bindable':
    case 'scope-identifier':
    case 'member-access':
    case 'local-template-name':
      return true;
    default:
      return false;
  }
}

/** Get the ConvergenceRef for provenance queries, if the entity has one. */
export function entityRef(entity: CursorEntity): ConvergenceRef | null {
  switch (entity.kind) {
    // Resource entities — direct ref
    case 'ce-tag': return entity.ref;
    case 'ca-attr': return entity.ref;
    case 'tc-attr': return entity.ref;
    case 'bindable': return entity.parentRef;
    case 'value-converter': return entity.ref;
    case 'binding-behavior': return entity.ref;
    case 'as-element': return entity.ref;
    // Expression entities — vmRef to owning CE
    case 'scope-identifier': return entity.vmRef;
    case 'member-access': return entity.vmRef;
    case 'global-access': return entity.vmRef;
    // Structural
    case 'interpolation': return entityRef(entity.innerEntity);
    default: return null;
  }
}
