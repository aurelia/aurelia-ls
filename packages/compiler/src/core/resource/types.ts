/**
 * Resource Manifest Types — The Green Resource Layer
 *
 * The canonical representation for "everything we know about a resource."
 * This is the green layer of the resource model: structural content only,
 * no spans, no ts.Node, no Sourced<T>. JSON-serializable. Internable.
 *
 * Three consumers:
 * 1. The reactive graph — conclusion nodes assemble into these types
 * 2. Manifest files — JSON.stringify produces a manifest, JSON.parse reads one
 * 3. The query surface — template analysis and features consume these
 *
 * Design constraints (from semantic-model-requirements.md):
 * - Per-field three-state lattice (absent/unknown/known) from resource-model L1
 * - Per-kind field schemas from F1 entity catalog + L3 product.md
 * - ControllerSemantics co-located (migration OQ-4 resolved)
 * - Vocabulary (BC, AP) structurally separate (migration SC-4)
 * - JSON-serializable: no Maps, no functions, no circular references
 * - Schema-versioned for forward/backward compatibility
 *
 * Relationship to existing types:
 * - ResourceDef (schema/types.ts): the Sourced<T>-wrapped definition —
 *   the red layer. These types are the green extraction of that.
 * - ElementRes/AttrRes (schema/types.ts): the consumer-facing projection.
 *   These types subsume them — ElementRes is derivable from CustomElementGreen
 *   by unwrapping FieldValue<T> to T | undefined.
 * - GreenValue (value/green.ts): the per-field internable value. These types
 *   are per-RESOURCE assemblies of per-field values — a higher-level shape
 *   that the graph projects conclusions into.
 */

import type { BindingMode } from '../../model/ir.js';

// =============================================================================
// Domain Value Types (used within FieldValue<T> for complex fields)
// =============================================================================

/**
 * A resolved entry in a CE/CA's `dependencies` array.
 *
 * The subject's `Key` type admits string, Constructable, InterfaceSymbol,
 * IResolver. In practice, resource dependencies are string (name key) or
 * Constructable (class reference). Other Key types are services, not
 * resources. From L3 product.md §2.3.
 */
export type DependencyRef =
  | { readonly refKind: 'resource'; readonly name: string; readonly resourceKind: ResourceKind }
  | { readonly refKind: 'class-ref'; readonly className: string }
  | { readonly refKind: 'unresolvable'; readonly reason: string };

/**
 * Representation of capture configuration.
 *
 * D4 (tier 1 spec): the product preserves the CaptureFilter predicate
 * so the classification algorithm can evaluate it for known attribute
 * names. `boolean` is the common case; `filter` is the full-fidelity case.
 */
export type CaptureValue =
  | boolean
  | { readonly kind: 'filter'; readonly description: string };

/**
 * Representation of processContent hook presence.
 *
 * D4 (tier 1 spec): processContent is `ProcessContentHook | null`,
 * NEVER boolean. The product preserves the hook reference. The hook
 * is opaque to static analysis but its presence gates template
 * analysis behavior (NL-4 from template-analysis L1).
 */
export type ProcessContentValue =
  | null
  | { readonly kind: 'hook'; readonly description?: string };

/**
 * Shadow DOM options.
 */
export interface ShadowOptions {
  readonly mode: 'open' | 'closed';
}

/**
 * Watch definition — a reactive observer declared via @watch.
 */
export interface WatchDefinition {
  readonly expression: string;
  readonly callback?: string;
}

// =============================================================================
// Schema Version
// =============================================================================

/**
 * Manifest schema version. Bump on breaking changes.
 * Readers check this before parsing. Unknown versions are rejected.
 *
 * Minor version: additive fields (readers ignore unknown fields).
 * Major version: structural changes (readers must understand the shape).
 */
export const MANIFEST_SCHEMA_VERSION = '1.0' as const;

// =============================================================================
// Three-State Per-Field Value
// =============================================================================

/**
 * The information lattice for a single field.
 *
 * Three states from resource-model L1 §Gap Structure:
 * - absent: the field was not specified. The runtime default applies.
 *   This is a SUCCESSFUL evaluation result, not a gap.
 * - unknown: analysis was blocked (B+C ceiling hit, opaque code,
 *   dynamic behavior). Carries a reason kind for gap taxonomy.
 * - known: value determined with confidence.
 *
 * This type is the green layer of Sourced<T>. It carries the value state
 * (structural, participates in cutoff) without the provenance (positional,
 * does not participate in cutoff).
 */
export type FieldValue<T> =
  | { readonly state: 'absent' }
  | { readonly state: 'unknown'; readonly reasonKind: string }
  | { readonly state: 'known'; readonly value: T };

// Convenience constructors (not exported from the type file — implementation concern)
// export const absent = <T>(): FieldValue<T> => ({ state: 'absent' });
// export const unknown = <T>(reasonKind: string): FieldValue<T> => ({ state: 'unknown', reasonKind });
// export const known = <T>(value: T): FieldValue<T> => ({ state: 'known', value });

// =============================================================================
// Resource Kind
// =============================================================================

/**
 * The 5 resource kinds that participate in convergence.
 *
 * Template controllers are a separate product kind (L3 product.md §1.1).
 * Binding commands and attribute patterns are vocabulary, not resources —
 * they use Configured<T>, not Sourced<T>, and don't participate in
 * convergence. They have their own type system (see vocabulary section).
 */
export type ResourceKind =
  | 'custom-element'
  | 'custom-attribute'
  | 'template-controller'
  | 'value-converter'
  | 'binding-behavior';

// =============================================================================
// Bindable
// =============================================================================

/**
 * Per-bindable green record.
 *
 * 6 fields from L3 product.md §2.8:
 * - property: identity field (locked-identity operator)
 * - attribute: kebab-case HTML name (known-over-unknown)
 * - mode: declared binding mode (known-over-unknown)
 * - primary: whether this is the default property (derived from container)
 * - type: TypeScript type annotation (stratum 1 at tier C — source-derivable
 *   from TS annotations/inference, uses FieldValue)
 * - doc: documentation string (stratum 2 — product-assigned only, never
 *   source-derivable, uses plain type)
 */
export interface BindableGreen {
  readonly property: string;
  readonly attribute: FieldValue<string>;
  readonly mode: FieldValue<BindingMode>;
  readonly primary: FieldValue<boolean>;
  /** Stratum 1: TS type annotation. Source-derivable at tier C. */
  readonly type: FieldValue<string>;
  /** Stratum 2: product-assigned documentation. Never source-derivable.
   *  Two-state (present/absent), not three-state. */
  readonly doc?: string;
}

// =============================================================================
// Resource Identity
// =============================================================================

/**
 * Fields common to all resource kinds.
 *
 * kind + name are the identity pair. className is the declaration-side
 * identity (locked-identity operator — conflicts detected).
 */
export interface ResourceIdentity {
  readonly kind: ResourceKind;
  readonly name: string;
  readonly className: string;
}

// =============================================================================
// Provenance Types (red layer — NOT on green resource types)
// =============================================================================

// The following types describe provenance metadata that consumers
// (hover, rename, diagnostics, navigation) need. They are NOT carried
// on the green resource types because they don't affect structural
// evaluation (template analysis produces the same output regardless
// of origin or declaration form).
//
// These are queried through the red/provenance layer — the graph's
// Sourced<T> wrappers and convergence decision records. Defined here
// for vocabulary consistency but structurally separate from the green
// resource types above.

/**
 * Evidence origin tier — where a resource's winning observation came from.
 * Red layer: does not participate in cutoff.
 */
export type EvidenceOrigin = 'builtin' | 'config' | 'manifest' | 'source';

/**
 * How the resource was discovered.
 * Red layer: consumed by rename (name-form determination) and
 * navigation (source linking), not by template analysis.
 */
export type DeclarationForm =
  | 'decorator'
  | 'static-property'
  | 'define-call'
  | 'convention'
  | 'local-template'
  | 'manifest'
  | 'builtin';

/**
 * Gap summary — aggregate gap state for a resource.
 * DERIVED from per-field FieldValue states, not an independent signal.
 * Computed at query time, not stored on the green type.
 *
 * In the manifest format, may be included as a pre-computed cache for
 * readers that don't want to walk all fields. But it is never
 * authoritative — the per-field states are.
 */
export interface GapSummary {
  /** Total fields in unknown state. */
  readonly total: number;
  /** Fields where the gap is intrinsic (mandatory-declaration). */
  readonly intrinsic: number;
}

// =============================================================================
// Custom Element
// =============================================================================

/**
 * Green representation of a custom element.
 *
 * 16 fields from L3 product.md §2.3:
 * - Identity: kind, name, className (on ResourceIdentity)
 * - Scalar S1 fields: containerless, capture, processContent,
 *   shadowOptions, template, enhance, strict, boundary
 * - Collection S1 fields: aliases, dependencies
 * - Nested: bindables (per-bindable BindableGreen records)
 *
 * Provenance (origin, declarationForm, file, package) and derived
 * metadata (gap summary) are NOT on this type — they are red-layer
 * concerns queried through the provenance surface.
 *
 * 14 structural fields from L3 product.md §2.3 (excluding kind,
 * className, name on ResourceIdentity, and file/package on provenance).
 */
export interface CustomElementGreen extends ResourceIdentity {
  readonly kind: 'custom-element';
  readonly containerless: FieldValue<boolean>;
  /** D4: boolean | CaptureFilter, never collapsed to boolean.
   *  CaptureFilter predicates are opaque but their presence changes
   *  attribute classification (step 2). */
  readonly capture: FieldValue<CaptureValue>;
  /** D4: ProcessContentHook | null, NEVER boolean. Hook presence
   *  gates child compilation (NL-4). */
  readonly processContent: FieldValue<ProcessContentValue>;
  readonly shadowOptions: FieldValue<ShadowOptions | null>;
  readonly template: FieldValue<string>;
  readonly enhance: FieldValue<boolean>;
  /** Three-valued: true, false, or undefined. undefined ≠ false (D5). */
  readonly strict: FieldValue<boolean | undefined>;
  readonly aliases: FieldValue<readonly string[]>;
  /** Structured refs, not strings. Each entry is a resource key,
   *  class-ref, or unresolvable gap. From L3 §2.3 DependencyRef. */
  readonly dependencies: FieldValue<readonly DependencyRef[]>;
  readonly watches: FieldValue<readonly WatchDefinition[]>;
  readonly bindables: Readonly<Record<string, BindableGreen>>;
}

// =============================================================================
// Custom Attribute
// =============================================================================

/**
 * Green representation of a custom attribute.
 *
 * 11 fields from L3 product.md §2.4.
 */
/**
 * 9 structural fields from L3 product.md §2.4.
 */
export interface CustomAttributeGreen extends ResourceIdentity {
  readonly kind: 'custom-attribute';
  readonly noMultiBindings: FieldValue<boolean>;
  readonly defaultProperty: FieldValue<string>;
  readonly aliases: FieldValue<readonly string[]>;
  readonly dependencies: FieldValue<readonly DependencyRef[]>;
  readonly watches: FieldValue<readonly WatchDefinition[]>;
  readonly bindables: Readonly<Record<string, BindableGreen>>;
}

// =============================================================================
// Template Controller
// =============================================================================

/**
 * Green representation of a template controller.
 *
 * Inherits all CA structural fields (L3 product.md §2.5) plus
 * ControllerSemantics (stratum 2, product-assigned).
 *
 * TC is a separate product kind (L3 §1.1) even though the subject
 * models it as CA + isTemplateController flag.
 */
/**
 * Inherits all CA structural fields (L3 product.md §2.5) plus
 * containerStrategy and semantics.
 */
export interface TemplateControllerGreen extends ResourceIdentity {
  readonly kind: 'template-controller';
  readonly noMultiBindings: FieldValue<boolean>;
  readonly defaultProperty: FieldValue<string>;
  readonly containerStrategy: FieldValue<'reuse' | 'new'>;
  readonly aliases: FieldValue<readonly string[]>;
  readonly dependencies: FieldValue<readonly DependencyRef[]>;
  readonly watches: FieldValue<readonly WatchDefinition[]>;
  readonly bindables: Readonly<Record<string, BindableGreen>>;
  /**
   * Behavioral semantics — stratum 2, product-assigned.
   * Builtins: fully specified. User-defined: generic defaults or
   * mandatory-declaration from manifest.
   */
  readonly semantics: ControllerSemanticsGreen | null;
}

/**
 * TC behavioral metadata — product knowledge about how the TC affects
 * template compilation, scope chain, and view lifecycle.
 *
 * These are NOT Sourced<T> wrapped — they are product-assigned fields
 * (stratum 2) that use assigned-over-unassigned merge (L1 convergence
 * §Product-Assigned Fields).
 *
 * From L3 product.md §2.5 and F1 entity catalog §Template Controllers.
 */
export interface ControllerSemanticsGreen {
  /** Which resource this semantics definition originates from. */
  readonly origin: string;
  /** How the TC activates — determines the expression entry point. */
  readonly trigger: ControllerTrigger;
  /** Whether the TC creates a new scope or reuses the parent's. */
  readonly scope: 'reuse' | 'overlay';
  /** How many views the TC manages. */
  readonly cardinality?: 'zero-one' | 'zero-many' | 'one-of-n' | 'one';
  /** Whether the TC renders in-place or relocates content. */
  readonly placement?: 'in-place' | 'teleported';
  /** Branch relationships (else→if, case→switch, etc.). */
  readonly branches?: ControllerBranches;
  /** Which parent TC this TC links to at runtime. */
  readonly linksTo?: string;
  /** Contextual variables and alias injections. */
  readonly injects?: ControllerInjects;
  /** Non-bindable tail properties (repeat: key, contextual). */
  readonly tailProps?: Readonly<Record<string, TailPropSpec>>;
}

export type ControllerTrigger =
  | { readonly kind: 'value'; readonly prop: string }
  | { readonly kind: 'iterator'; readonly prop: string; readonly command?: string }
  | { readonly kind: 'branch'; readonly parent: string }
  | { readonly kind: 'marker' };

export interface ControllerBranches {
  readonly names: readonly string[];
  readonly relationship: 'sibling' | 'child';
}

export interface ControllerInjects {
  readonly contextuals?: readonly string[];
  readonly alias?: {
    readonly prop: string;
    readonly defaultName: string;
  };
}

export interface TailPropSpec {
  readonly name: string;
  readonly type?: string;
  readonly accepts?: readonly ('bind' | null)[];
  readonly doc?: string;
}

// =============================================================================
// Value Converter
// =============================================================================

/**
 * Green representation of a value converter.
 *
 * 10 fields from L3 product.md §2.6.
 * At tier B+C, TypeScript type analysis provides method signatures
 * (fromType, toType, hasFromView, signals).
 */
export interface ValueConverterGreen extends ResourceIdentity {
  readonly kind: 'value-converter';
  readonly aliases: FieldValue<readonly string[]>;
  readonly fromType: FieldValue<string>;
  readonly toType: FieldValue<string>;
  readonly hasFromView: FieldValue<boolean>;
  readonly signals: FieldValue<readonly string[]>;
}

// =============================================================================
// Binding Behavior
// =============================================================================

/**
 * Green representation of a binding behavior.
 *
 * 7 fields from L3 product.md §2.7.
 */
export interface BindingBehaviorGreen extends ResourceIdentity {
  readonly kind: 'binding-behavior';
  readonly aliases: FieldValue<readonly string[]>;
  readonly isFactory: FieldValue<boolean>;
}

// =============================================================================
// Resource Green (discriminated union)
// =============================================================================

/**
 * The discriminated union of all resource kinds.
 * Discriminant is `kind`.
 */
export type ResourceGreen =
  | CustomElementGreen
  | CustomAttributeGreen
  | TemplateControllerGreen
  | ValueConverterGreen
  | BindingBehaviorGreen;

// =============================================================================
// Vocabulary Types (structurally separate from resources — SC-4)
// =============================================================================

/**
 * Binding command configuration.
 *
 * Commands use Configured<T> (2 origins: builtin, config), not Sourced<T>.
 * They don't participate in convergence. They freeze before template
 * analysis begins (vocabulary closure invariant).
 *
 * From L3 product.md §2.9 and F1 entity catalog §Binding Commands.
 */
export interface BindingCommandGreen {
  readonly name: string;
  readonly commandKind: BindingCommandKind;
  readonly mode?: BindingMode;
  readonly capture?: boolean;
  readonly forceAttribute?: string;
  readonly ignoreAttr: boolean;
  readonly expressionEntry: ExpressionEntry;
  readonly package?: string;
}

export type BindingCommandKind =
  | 'property'
  | 'listener'
  | 'iterator'
  | 'ref'
  | 'attribute'
  | 'style'
  | 'translation';

/**
 * Expression parser entry point — determines what grammar is accepted
 * for the attribute value when this command is used.
 *
 * From F1 entity catalog §Expression Entry Points.
 */
export type ExpressionEntry =
  | 'IsProperty'
  | 'IsFunction'
  | 'IsIterator'
  | 'Interpolation'
  | 'IsCustom';

/**
 * Attribute pattern configuration.
 *
 * From L3 product.md §2.10 and F1 entity catalog §Attribute Patterns.
 */
export interface AttributePatternGreen {
  readonly pattern: string;
  readonly symbols: string;
  readonly interpret: PatternInterpret;
  readonly package?: string;
}

export type PatternInterpret =
  | { readonly kind: 'target-command' }
  | { readonly kind: 'fixed'; readonly target: string; readonly command: string }
  | { readonly kind: 'fixed-command'; readonly command: string; readonly mode?: BindingMode }
  | { readonly kind: 'mapped-fixed-command'; readonly command: string; readonly targetMap?: Readonly<Record<string, string>> }
  | { readonly kind: 'event-modifier'; readonly command: string; readonly injectCommand?: boolean }
  | { readonly kind: 'passthrough'; readonly target: string; readonly command: string };

/**
 * Frozen vocabulary — the complete set of BCs and APs that template
 * analysis operates with. Vocabulary closure (F3 §Freeze invariant)
 * requires this to be frozen before any template is analyzed.
 */
export interface VocabularyGreen {
  readonly commands: Readonly<Record<string, BindingCommandGreen>>;
  readonly patterns: readonly AttributePatternGreen[];
}

// =============================================================================
// Manifest Container
// =============================================================================

/**
 * A serializable manifest — the top-level container for cached
 * resource knowledge.
 *
 * Can represent:
 * - Builtin catalog (origin: builtin for all entries)
 * - Package scan result (origin: source or manifest)
 * - Explicit declaration file (origin: config)
 * - Converged project state (mixed origins)
 *
 * Provenance (origin, file, package) lives at the manifest level,
 * not per-resource. All resources in a manifest share the same
 * evidence origin. For converged state with mixed origins, provenance
 * is queried through the graph's red layer, not through the manifest.
 */
export interface ResourceManifest {
  readonly schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  /** Evidence origin for all resources in this manifest. */
  readonly origin: EvidenceOrigin;
  /** Package identity when this manifest represents a package. */
  readonly package?: string;
  /** Package version for cache invalidation. */
  readonly version?: string;
  /** All resources in this manifest. */
  readonly resources: readonly ResourceGreen[];
  /** Vocabulary entries (if this manifest contributes BCs or APs). */
  readonly vocabulary?: VocabularyGreen;
  /** Pre-computed gap summary (derived, not authoritative). */
  readonly gaps?: GapSummary;
}

// =============================================================================
// Resource Collections (lookup-optimized projection)
// =============================================================================

/**
 * Name-indexed resource collections for O(1) lookup.
 *
 * This is the reactive equivalent of ResourceCollections from
 * schema/types.ts — same shape, different source. The old version
 * was batch-materialized from ProjectSemantics. This version is
 * assembled from graph conclusions or manifest entries on demand.
 */
export interface ResourceCatalogGreen {
  readonly elements: Readonly<Record<string, CustomElementGreen>>;
  readonly attributes: Readonly<Record<string, CustomAttributeGreen>>;
  readonly controllers: Readonly<Record<string, TemplateControllerGreen>>;
  readonly valueConverters: Readonly<Record<string, ValueConverterGreen>>;
  readonly bindingBehaviors: Readonly<Record<string, BindingBehaviorGreen>>;
}

// =============================================================================
// Scope-Aware Query Result
// =============================================================================

/**
 * Scope completeness state — whether negative assertions ("resource X
 * is absent") are safe in this scope.
 *
 * From scope-resolution L1: positive claims don't need completeness
 * (finding one instance is sufficient). Negative claims require
 * completeness (all registration paths must be analyzed).
 */
export interface ScopeCompleteness {
  readonly complete: boolean;
  readonly gaps: readonly ScopeGap[];
}

export interface ScopeGap {
  readonly site: string;
  readonly reason: string;
}

/**
 * A scoped resource catalog — resources visible in a specific CE's
 * template, accounting for two-level lookup (local → root).
 *
 * The completeness field gates negative assertions: if incomplete,
 * "resource not found" must be demoted (F8 §Confidence-based severity).
 */
export interface ScopedCatalogGreen {
  readonly resources: ResourceCatalogGreen;
  readonly completeness: ScopeCompleteness;
}
