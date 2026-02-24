import type ts from "typescript";
import type { BindingMode } from "../model/ir.js";
export type { BindingMode } from "../model/ir.js";
import type { NormalizedPath, StringId } from "../model/identity.js";

// ============================================================================
// L2 Gap Primitives — Stub<T> and Resolved<T>
// ============================================================================

/**
 * Six gap categories from L2 (F7). Compose downstream: declaration→all,
 * registration→scope→template, type→expression, config→registration.
 */
export type GapCategory =
  | 'declaration'
  | 'registration'
  | 'type'
  | 'scope'
  | 'expression'
  | 'configuration';

/**
 * Opaque reference to a gap record in the convergence model.
 */
export type GapRef = { readonly resourceKey: string; readonly field: string; readonly __brand: 'GapRef' };

/**
 * Stub value for gapped fields.
 *
 * When a convergence field could not be resolved (state: 'unknown'), the
 * query interface returns a Stub instead of undefined. The stub carries:
 * - A safe fallback value for pipeline processing (so the pipeline doesn't halt)
 * - The gap category (for diagnostic classification)
 * - A reference to the gap record (for provenance queries)
 *
 * The pipeline treats the stub's fallback as the field value for processing.
 * The stub's presence triggers a diagnostic. The diagnostic's severity is
 * confidence-adjusted per L1 surface-projection.
 */
export interface Stub<T> {
  readonly __stub: true;
  readonly fallback: T;
  readonly gapCategory: GapCategory;
  readonly gapRef: GapRef;
}

/**
 * A resolved value: either the actual value or a Stub.
 *
 * Consumers check `isStub(value)` to determine whether a diagnostic
 * should be emitted, then use `resolveValue(value)` to get the usable
 * value (actual or fallback).
 */
export type Resolved<T> = T | Stub<T>;

/** Type guard for Stub<T>. */
export function isStub<T>(value: Resolved<T>): value is Stub<T> {
  return value !== null && typeof value === 'object' && '__stub' in value && (value as Stub<T>).__stub === true;
}

/** Extract the usable value from a Resolved<T> (actual value or stub fallback). */
export function resolveValue<T>(value: Resolved<T>): T {
  return isStub(value) ? value.fallback : value;
}

/** Create a stub for a gapped field. */
export function createStub<T>(fallback: T, gapCategory: GapCategory, resourceKey: string, field: string): Stub<T> {
  return {
    __stub: true,
    fallback,
    gapCategory,
    gapRef: { resourceKey, field, __brand: 'GapRef' } as GapRef,
  };
}

// ============================================================================
// L2 Resource Views (consumer-facing, carries Resolved<T> for gapped fields)
// ============================================================================

/**
 * Opaque identity reference for provenance queries.
 * Follow this ref to get convergence decision and gap details.
 */
export type ConvergenceRef = { readonly resourceKey: string; readonly __brand: 'ConvergenceRef' };

/**
 * Base view for all resource kinds.
 * Consumer-facing: resolved values for known fields, Stubs for gapped fields.
 */
export interface ResourceView {
  readonly kind: string;
  readonly name: string;
  readonly className: string;
  readonly file: Resolved<NormalizedPath | undefined>;
  readonly package: Resolved<string | undefined>;
  readonly ref: ConvergenceRef;
}

/**
 * Bindable view — consumer-facing bindable metadata.
 */
export interface BindableView {
  readonly property: string;
  readonly attribute: Resolved<string>;
  readonly mode: Resolved<BindingMode>;
  readonly primary: Resolved<boolean>;
  readonly type: string | undefined;
  readonly doc: string | undefined;
}

// ============================================================================
// L2 Confidence Cascade
// ============================================================================

/**
 * Four confidence levels — per-position confidence from the cascade.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Four independent confidence signals. Per-position confidence is
 * the minimum of all four signals.
 */
export interface ConfidenceSignals {
  /** Is the resource known? How was it declared? */
  readonly resource: ConfidenceLevel;
  /** Are relevant types annotated? (tier C raises this) */
  readonly type: ConfidenceLevel;
  /** Is the scope chain fully determined? (dynamic registration lowers this) */
  readonly scope: ConfidenceLevel;
  /** Is the expression fully analyzable? */
  readonly expression: ConfidenceLevel;
}

/**
 * Compute composite confidence from individual signals.
 * Returns the minimum signal level.
 */
export function computeConfidence(signals: ConfidenceSignals): ConfidenceLevel {
  const order: ConfidenceLevel[] = ['none', 'low', 'medium', 'high'];
  const min = Math.min(
    order.indexOf(signals.resource),
    order.indexOf(signals.type),
    order.indexOf(signals.scope),
    order.indexOf(signals.expression),
  );
  return order[min]!;
}

// ============================================================================
// L2 Invalidation Scope
// ============================================================================

/**
 * What changed — determines the blast radius of a re-execution.
 */
export type InvalidationScope =
  | { readonly kind: 'global' }
  | { readonly kind: 'file'; readonly paths: readonly NormalizedPath[] }
  | { readonly kind: 'resource'; readonly keys: readonly string[] }
  | { readonly kind: 'template'; readonly paths: readonly NormalizedPath[] }
  | { readonly kind: 'type'; readonly paths: readonly NormalizedPath[] };

// ============================================================================
// L2 Feature Response (degradation ladder)
// ============================================================================

/**
 * Degradation response — honest partial output or no-knowledge explanation.
 * Rung 2 = partial knowledge. Rung 3 = no knowledge.
 */
export interface Degradation {
  readonly __degraded: true;
  readonly rung: 2 | 3;
  readonly what: string;
  readonly why: string;
  readonly howToClose: string | null;
}

/**
 * Not applicable — cursor on non-semantic position (whitespace, comment, plain HTML).
 */
export interface NotApplicable {
  readonly __notApplicable: true;
}

/**
 * Feature response type — the universal return type for all feature queries.
 * Rung 1 = success (T). Rung 2-3 = degradation. Rung 4 = not applicable.
 */
export type FeatureResponse<T> = T | Degradation | NotApplicable;

/** Type guard for degradation. */
export function isDegradation<T>(response: FeatureResponse<T>): response is Degradation {
  return response !== null && typeof response === 'object' && '__degraded' in response;
}

/** Type guard for not applicable. */
export function isNotApplicable<T>(response: FeatureResponse<T>): response is NotApplicable {
  return response !== null && typeof response === 'object' && '__notApplicable' in response;
}

export interface SourceLocation {
  readonly file: NormalizedPath;
  readonly pos: number;
  readonly end: number;
}

// Extensible via config, but always has a known value
export type Configured<T> =
  | { origin: 'builtin'; value: T }
  | { origin: 'config'; value: T; location: SourceLocation };

// Full provenance - source analysis can result in unknown
export type Sourced<T> =
  | { origin: 'builtin'; value: T }
  | { origin: 'config'; value: T; location: SourceLocation }
  | { origin: 'source'; state: 'known'; value: T; node?: ts.Node; location?: SourceLocation }
  | { origin: 'source'; state: 'unknown'; value?: undefined; node?: ts.Node; location?: SourceLocation };


export type TypeRef =
  | { kind: 'ts'; name: string }
  | { kind: 'any' }
  | { kind: 'unknown' };

export interface BindableDef {
  readonly property: Sourced<string>;
  readonly attribute: Sourced<string>;
  readonly mode: Sourced<BindingMode>;
  readonly primary: Sourced<boolean>;
  readonly type?: Sourced<string>;
  readonly doc?: Sourced<string>;
}

export interface Bindable {
  readonly name: string;
  readonly attribute?: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly type?: TypeRef;
  readonly doc?: string;
}

export type ResourceKind =
  | 'custom-element'
  | 'custom-attribute'
  | 'template-controller'
  | 'value-converter'
  | 'binding-behavior';

// Extensible string type that preserves ResourceKind literals.
export type ResourceKindLike = ResourceKind | (string & {});

export interface ResourceKey {
  readonly kind: ResourceKind;
  readonly name: string;
}

export type SymbolId = StringId<"SymbolId">;

export interface ResourceDefBase {
  readonly className: Sourced<string>;
  readonly file?: NormalizedPath;
  readonly package?: string;
}

export interface CustomElementDef extends ResourceDefBase {
  readonly kind: 'custom-element';
  readonly name: Sourced<string>;
  readonly aliases: readonly Sourced<string>[];
  readonly containerless: Sourced<boolean>;
  readonly shadowOptions: Sourced<{ readonly mode: 'open' | 'closed' } | undefined>;
  readonly capture: Sourced<boolean>;
  readonly processContent: Sourced<boolean>;
  readonly inlineTemplate?: Sourced<string>;
  readonly boundary: Sourced<boolean>;
  readonly bindables: Readonly<Record<string, BindableDef>>;
  readonly dependencies: readonly Sourced<string>[];
}

export interface CustomAttributeDef extends ResourceDefBase {
  readonly kind: 'custom-attribute';
  readonly name: Sourced<string>;
  readonly aliases: readonly Sourced<string>[];
  readonly noMultiBindings: Sourced<boolean>;
  readonly primary?: Sourced<string>;
  readonly bindables: Readonly<Record<string, BindableDef>>;
  readonly dependencies: readonly Sourced<string>[];
}

export type ControllerTrigger =
  | { kind: 'value'; prop: string }
  | { kind: 'iterator'; prop: string; command?: string }
  | { kind: 'branch'; parent: string }
  | { kind: 'marker' };

export type ScopeBehavior = 'reuse' | 'overlay';

export type ControllerCardinality = 'zero-one' | 'zero-many' | 'one-of-n' | 'one';

export type ControllerPlacement = 'in-place' | 'teleported';

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

export interface IteratorTailPropSpec {
  readonly name: string;
  readonly type?: string;
  readonly accepts?: readonly ('bind' | null)[];
  readonly doc?: string;
}

export interface ControllerSemantics {
  readonly origin: string;
  readonly trigger: ControllerTrigger;
  readonly scope: ScopeBehavior;
  readonly cardinality?: ControllerCardinality;
  readonly placement?: ControllerPlacement;
  readonly branches?: ControllerBranches;
  readonly linksTo?: string;
  readonly injects?: ControllerInjects;
  readonly tailProps?: Readonly<Record<string, IteratorTailPropSpec>>;
}

export interface TemplateControllerDef extends ResourceDefBase {
  readonly kind: 'template-controller';
  readonly name: Sourced<string>;
  readonly aliases: Sourced<readonly string[]>;
  readonly noMultiBindings: Sourced<boolean>;
  readonly bindables: Readonly<Record<string, BindableDef>>;
  readonly semantics?: ControllerSemantics;
}

export interface ValueConverterDef extends ResourceDefBase {
  readonly kind: 'value-converter';
  readonly name: Sourced<string>;
  readonly fromType?: Sourced<string>;
  readonly toType?: Sourced<string>;
}

export interface BindingBehaviorDef extends ResourceDefBase {
  readonly kind: 'binding-behavior';
  readonly name: Sourced<string>;
}

export type ResourceDef =
  | CustomElementDef
  | CustomAttributeDef
  | TemplateControllerDef
  | ValueConverterDef
  | BindingBehaviorDef;

export type BindingCommandKind =
  | 'property'
  | 'listener'
  | 'iterator'
  | 'ref'
  | 'attribute'
  | 'style'
  | 'translation';

export interface BindingCommandDef {
  readonly name: Sourced<string>;
  readonly commandKind: Sourced<BindingCommandKind>;
  readonly mode?: Sourced<BindingMode>;
  readonly capture?: Sourced<boolean>;
  readonly forceAttribute?: Sourced<string>;
  readonly package?: Sourced<string>;
}

export type PatternInterpret =
  | { kind: 'target-command' }
  | { kind: 'fixed'; target: string; command: string }
  | { kind: 'fixed-command'; command: string; mode?: BindingMode }
  | { kind: 'mapped-fixed-command'; command: string; targetMap?: Record<string, string> }
  | { kind: 'event-modifier'; command: string; injectCommand?: boolean }
  | { kind: 'passthrough'; target: string; command: string };

export interface AttributePatternDef {
  readonly pattern: Sourced<string>;
  readonly symbols: Sourced<string>;
  readonly interpret: Sourced<PatternInterpret>;
  readonly package?: Sourced<string>;
}

// ============================================================================
// Derived Semantics (compiler-facing, no provenance)
// ============================================================================

export interface ElementRes {
  readonly kind: 'element';
  readonly name: string;
  readonly bindables: Readonly<Record<string, Bindable>>;
  readonly aliases?: readonly string[];
  readonly containerless?: boolean;
  readonly shadowOptions?: { readonly mode: 'open' | 'closed' } | undefined;
  readonly capture?: boolean;
  readonly processContent?: boolean;
  readonly boundary?: boolean;
  readonly dependencies?: readonly string[];
  readonly className?: string;
  readonly file?: NormalizedPath;
  readonly package?: string;
  /** Convergence identity ref for provenance queries. Set when entries available. */
  readonly __convergenceRef?: ConvergenceRef;
}

export interface AttrRes {
  readonly kind: 'attribute';
  readonly name: string;
  readonly bindables: Readonly<Record<string, Bindable>>;
  readonly aliases?: readonly string[];
  readonly primary?: string;
  readonly isTemplateController?: boolean;
  readonly noMultiBindings?: boolean;
  readonly dependencies?: readonly string[];
  readonly className?: string;
  readonly file?: NormalizedPath;
  readonly package?: string;
  /** Convergence identity ref for provenance queries. Set when entries available. */
  readonly __convergenceRef?: ConvergenceRef;
}

export interface ValueConverterSig {
  readonly name: string;
  readonly in: TypeRef;
  readonly out: TypeRef;
  readonly className?: string;
  readonly file?: NormalizedPath;
  readonly package?: string;
}

export interface BindingBehaviorSig {
  readonly name: string;
  readonly className?: string;
  readonly file?: NormalizedPath;
  readonly package?: string;
}

export interface ControllerConfig {
  readonly name: string;
  readonly trigger: ControllerTrigger;
  readonly scope: ScopeBehavior;
  readonly cardinality?: ControllerCardinality;
  readonly placement?: ControllerPlacement;
  readonly branches?: ControllerBranches;
  readonly linksTo?: string;
  readonly injects?: ControllerInjects;
  readonly tailProps?: Readonly<Record<string, IteratorTailPropSpec>>;
  readonly props?: Readonly<Record<string, Bindable>>;
  /** Class name of the TC implementation. Carries provenance for navigation. */
  readonly className?: string;
  /** Source file where the TC class is declared. Carries provenance for navigation. */
  readonly file?: NormalizedPath;
}

export type ControllerName = string;

export interface BindingCommandConfig {
  readonly name: string;
  readonly kind: BindingCommandKind;
  readonly mode?: BindingMode;
  readonly capture?: boolean;
  readonly forceAttribute?: string;
  readonly package?: string;
}

export interface AttributePatternConfig {
  readonly pattern: string;
  readonly symbols: string;
  readonly interpret: PatternInterpret;
  readonly package?: string;
}

// ============================================================================
// Static Config (no provenance needed - always builtin)
// ============================================================================

export interface DomProp {
  readonly type: string;
  readonly mode?: BindingMode;
}

export interface DomElement {
  readonly tag: string;
  readonly props: Readonly<Record<string, DomProp>>;
  readonly attrToProp?: Readonly<Record<string, string>>;
}

export interface DomSchema {
  readonly ns: 'html';
  /** HTMLElement.prototype — inherited by every element. */
  readonly base: DomElement;
  readonly elements: Readonly<Record<string, DomElement>>;
}

export interface EventSchema {
  readonly byName: Readonly<Record<string, TypeRef | string>>;
  readonly byElement?: Readonly<Record<string, Readonly<Record<string, TypeRef | string>>>>;
}

export interface Naming {
  readonly attrToPropGlobal: Readonly<Record<string, string>>;
  readonly perTag?: Readonly<Record<string, Record<string, string>>>;
  readonly preserveAttrPrefixes?: readonly string[];
}

export interface TwoWayDefaults {
  readonly byTag: Readonly<Record<string, readonly string[]>>;
  readonly globalProps: readonly string[];
  readonly conditional?: readonly { readonly prop: string; readonly requiresAttr: string }[];
}

// ============================================================================
// Resource Graph (scoping)
// ============================================================================

export type ResourceScopeId = string & { readonly __brand: 'ResourceScopeId' };

export interface ResourceCollections {
  readonly elements: Readonly<Record<string, ElementRes>>;
  readonly attributes: Readonly<Record<string, AttrRes>>;
  readonly controllers: Readonly<Record<string, ControllerConfig>>;
  readonly valueConverters: Readonly<Record<string, ValueConverterSig>>;
  readonly bindingBehaviors: Readonly<Record<string, BindingBehaviorSig>>;
}

export interface ScopeUnresolvedRegistration {
  readonly source: "site" | "analysis";
  readonly reason: string;
  readonly file: NormalizedPath;
  readonly span: Readonly<{
    readonly start: number;
    readonly end: number;
  }>;
  readonly pattern?: Readonly<Record<string, unknown>>;
  readonly resourceName?: string;
}

export interface ScopeCompleteness {
  readonly complete: boolean;
  readonly unresolvedRegistrations: readonly ScopeUnresolvedRegistration[];
}

export interface ResourceScope {
  readonly id: ResourceScopeId;
  readonly parent: ResourceScopeId | null;
  readonly label?: string;
  readonly resources: Partial<ResourceCollections>;
  readonly completeness?: ScopeCompleteness;
}

export interface ResourceGraph {
  readonly version: 'aurelia-resource-graph@1';
  readonly root: ResourceScopeId;
  readonly scopes: Readonly<Record<ResourceScopeId, ResourceScope>>;
}

export interface ScopedResources {
  readonly scope: ResourceScopeId | null;
  readonly resources: ResourceCollections;
}

// ============================================================================
// Semantics Container
// ============================================================================

export interface ProjectSemantics {
  readonly resourceGraph?: ResourceGraph | null;
  readonly defaultScope?: ResourceScopeId | null;
  readonly controllers: Readonly<Record<string, TemplateControllerDef>>;
  readonly elements: Readonly<Record<string, CustomElementDef>>;
  readonly attributes: Readonly<Record<string, CustomAttributeDef>>;
  readonly valueConverters: Readonly<Record<string, ValueConverterDef>>;
  readonly bindingBehaviors: Readonly<Record<string, BindingBehaviorDef>>;
  readonly commands: Readonly<Record<string, BindingCommandDef>>;
  readonly patterns: readonly AttributePatternDef[];
  readonly resources?: ResourceCollections;
  readonly bindingCommands?: Readonly<Record<string, BindingCommandConfig>>;
  readonly attributePatterns?: readonly AttributePatternConfig[];
  readonly catalog?: ResourceCatalog;
  readonly dom: DomSchema;
  readonly events: EventSchema;
  readonly naming: Naming;
  readonly twoWayDefaults: TwoWayDefaults;
}

// ============================================================================
// Catalog + Lookup
// ============================================================================

export interface CatalogGap {
  readonly kind: string;
  readonly message: string;
  /** Source file path where the gap originates */
  readonly resource?: string;
  /** Resource kind affected by this gap (same vocabulary as ResourceDef) */
  readonly resourceKind?: ResourceKind;
  /** Resource name affected by this gap (registration name, not class name) */
  readonly resourceName?: string;
}

export type CatalogConfidence = 'complete' | 'high' | 'partial' | 'conservative';

export interface ResourceCatalog {
  readonly resources: ResourceCollections;
  readonly bindingCommands: Readonly<Record<string, BindingCommandConfig>>;
  readonly attributePatterns: readonly AttributePatternConfig[];
  readonly gaps?: readonly CatalogGap[];
  readonly confidence?: CatalogConfidence;
  /** Per-resource gap index, keyed by `${resourceKind}:${resourceName}` */
  readonly gapsByResource?: Readonly<Record<string, readonly CatalogGap[]>>;
  /** Gaps without resource identity — project-level analysis uncertainty */
  readonly projectLevelGaps?: readonly CatalogGap[];
  /** Scope completeness metadata keyed by scope id. */
  readonly scopeCompleteness?: Readonly<Record<ResourceScopeId, ScopeCompleteness>>;
}

// ============================================================================
// Syntax Registry
// ============================================================================

export type TemplateSyntaxMatchInput = unknown;
export type TemplateSyntaxMatch = unknown;
export type TemplateSyntaxEmitInput = unknown;
export type TemplateSyntaxEmitResult = unknown;

export interface TemplateSyntaxMatcher<
  TInput = TemplateSyntaxMatchInput,
  TMatch = TemplateSyntaxMatch,
> {
  readonly name: string;
  match(input: TInput): TMatch | null;
}

export interface TemplateSyntaxEmitter<
  TInput = TemplateSyntaxEmitInput,
  TResult = TemplateSyntaxEmitResult,
> {
  readonly name: string;
  emit(input: TInput): TResult | null;
}

export interface TemplateSyntaxRegistry {
  readonly bindingCommands: Readonly<Record<string, BindingCommandConfig>>;
  readonly attributePatterns: readonly AttributePatternConfig[];
  readonly controllers: Readonly<Record<string, ControllerConfig>>;
  readonly matchers?: readonly TemplateSyntaxMatcher[];
  readonly emitters?: readonly TemplateSyntaxEmitter[];
}

export type MaterializedSemantics = ProjectSemantics & {
  readonly resources: ResourceCollections;
  readonly bindingCommands: Readonly<Record<string, BindingCommandConfig>>;
  readonly attributePatterns: readonly AttributePatternConfig[];
  readonly catalog: ResourceCatalog;
};

export interface LocalImportDef {
  readonly name: string;
  readonly bindables?: Readonly<Record<string, Bindable>>;
  readonly alias?: string;
  readonly aliases?: readonly string[];
}

export interface SemanticsLookupOptions {
  readonly resources?: ResourceCollections;
  readonly graph?: ResourceGraph | null;
  readonly scope?: ResourceScopeId | null;
  readonly localImports?: readonly LocalImportDef[];
  /**
   * Convergence entries from SemanticModel.
   * When provided, lookup results carry ConvergenceRef for provenance queries
   * and gap state is derived from entry Sourced<T> fields (not just catalog).
   */
  readonly entries?: ReadonlyMap<string, import("./model.js").ConvergenceEntry>;
}

export interface SemanticsLookup {
  readonly sem: MaterializedSemantics;
  readonly resources: ResourceCollections;
  readonly catalog: ResourceCatalog;
  element(name: string): ElementRes | null;
  attribute(name: string): AttrRes | null;
  controller(name: string): ControllerConfig | null;
  domElement(tag: string): DomElement | null;
  event(name: string, tag?: string): { name: string; type: TypeRef };
  hasPreservedPrefix(attr: string): boolean;
  /** Returns gaps that affect a specific resource, identified by kind and registration name. */
  gapsFor(kind: ResourceKind, name: string): readonly CatalogGap[];
  /** Returns true if any gaps exist for a specific resource. */
  hasGaps(kind: ResourceKind, name: string): boolean;
  /** Returns gaps without resource identity — project-level analysis uncertainty. */
  projectLevelGaps(): readonly CatalogGap[];
  /** Returns completeness metadata for the active scope (or an explicitly provided scope). */
  scopeCompleteness(scope?: ResourceScopeId | null): ScopeCompleteness;
  /** Returns true when scope analysis is complete for the active scope (or explicitly provided scope). */
  isScopeComplete(scope?: ResourceScopeId | null): boolean;
}

// ============================================================================
// Pipeline Artifacts
// ============================================================================

export interface FeatureUsageFlags {
  readonly usesCompose?: boolean;
  readonly usesDynamicCompose?: boolean;
  readonly usesTemplateControllers?: boolean;
}

export interface FeatureUsageSet {
  readonly elements: readonly string[];
  readonly attributes: readonly string[];
  readonly controllers: readonly string[];
  readonly commands: readonly string[];
  readonly patterns: readonly string[];
  readonly valueConverters: readonly string[];
  readonly bindingBehaviors: readonly string[];
  readonly flags?: FeatureUsageFlags;
}

export interface RegistrationScopePlan {
  readonly scope: ResourceScopeId;
  readonly resources: ResourceCollections;
}

export type RegistrationPlanDirective =
  | { readonly kind: 'dedupe'; readonly resource: ResourceKey; readonly scopes: readonly ResourceScopeId[] }
  | { readonly kind: 'hoist'; readonly resource: ResourceKey; readonly from: ResourceScopeId; readonly to: ResourceScopeId }
  | { readonly kind: 'flatten'; readonly scope: ResourceScopeId };

export interface RegistrationPlan {
  readonly scopes: Readonly<Record<ResourceScopeId, RegistrationScopePlan>>;
  readonly directives?: readonly RegistrationPlanDirective[];
}

export interface StyleProfile {
  readonly naming?: {
    readonly element?: "convention" | "kebab" | "pascal" | "preserve";
    readonly attribute?: "convention" | "kebab" | "camel" | "preserve";
    readonly bindableProperty?: "camel" | "preserve";
    readonly converter?: "kebab" | "camel" | "preserve";
    readonly behavior?: "kebab" | "camel" | "preserve";
    readonly controller?: "kebab" | "preserve";
  };
  readonly shorthand?: {
    readonly prefer?: "registry-default" | "always" | "never";
    readonly collapseSameName?: boolean;
    readonly preserveCommandAliases?: boolean;
  };
  readonly imports?: {
    readonly addWhenMissing?: "always" | "prompt";
    readonly organize?: "preserve" | "sort" | "group";
    readonly aliasStyle?: "preserve" | "kebab" | "camel";
    readonly preferLocal?: boolean;
  };
  readonly declaration?: {
    readonly resource?: {
      readonly element?: "preserve" | "decorator" | "define" | "static-au" | "convention";
      readonly attribute?: "preserve" | "decorator" | "define" | "static-au" | "convention";
      readonly controller?: "preserve" | "decorator" | "define" | "static-au" | "convention";
      readonly converter?: "preserve" | "decorator" | "define" | "static-au" | "convention";
      readonly behavior?: "preserve" | "decorator" | "define" | "static-au" | "convention";
    };
    readonly bindable?: {
      readonly prefer?: "template" | "member-decorator" | "resource-config" | "static-bindables" | "static-au";
    };
  };
  readonly refactors?: {
    readonly renameStyle?: "preserve" | "attribute" | "property";
    readonly updateTemplateAliases?: "preserve" | "normalize";
    readonly updateCommandAliases?: "preserve" | "normalize";
  };
  readonly completion?: {
    readonly insertShorthand?: "registry-default" | "always" | "never";
    readonly insertCommandAliases?: "registry-default" | "preserve";
    readonly includeEnumLiterals?: boolean;
    readonly includeLiteralAttributes?: boolean;
  };
  readonly formatting?: {
    readonly quoteStyle?: "double" | "single" | "preserve";
    readonly multiBindingSeparator?: ";" | "preserve";
    readonly whitespace?: "preserve";
  };
  readonly diagnostics?: {
    readonly preferAttributeName?: "preserve" | "kebab" | "camel";
    readonly suggestShorthand?: "on" | "off";
  };
}

export interface SemanticSymbolSnapshot {
  readonly id: SymbolId;
  readonly kind: ResourceKindLike;
  readonly name: string;
  readonly source?: NormalizedPath;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface SemanticSnapshot {
  readonly version: string;
  readonly symbols: readonly SemanticSymbolSnapshot[];
  readonly catalog?: ResourceCatalog;
  readonly graph?: ResourceGraph | null;
  readonly gaps?: readonly CatalogGap[];
  readonly confidence?: CatalogConfidence;
}

export interface ApiSurfaceBindable {
  readonly name: string;
  readonly attribute?: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
}

export interface ApiSurfaceSymbol {
  readonly id: SymbolId;
  readonly kind: ResourceKindLike;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly bindables?: readonly ApiSurfaceBindable[];
  readonly source?: NormalizedPath;
}

export interface ApiSurfaceSnapshot {
  readonly version: string;
  readonly symbols: readonly ApiSurfaceSymbol[];
}
