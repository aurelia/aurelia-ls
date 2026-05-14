import type {
  AuthoringCapabilityKey,
  AuthoringSupportState,
  AuthoringTasteAxisKey,
  AuthoringTasteValueKey,
  AuthoringTargetKind,
} from './ontology.js';

export type ExpectedSemanticEffectKind =
  /** The reopened project should have an Aurelia app shape. */
  | 'project-shape'
  /** The reopened project should expose package/typecheck tooling source roles. */
  | 'project-tooling'
  /** The reopened app should expose root app configuration. */
  | 'app-root'
  /** The reopened app should expose Aurelia resource definitions. */
  | 'resource-definition'
  /** The reopened app should expose custom element/component definitions. */
  | 'component'
  /** The reopened app should expose generated component-role evidence rows. */
  | 'component-role'
  /** The reopened app should expose stylesheet/style asset ownership rows. */
  | 'style-resource'
  /** The reopened app should expose source-backed state/service/model classes in app topology. */
  | 'service-class'
  /** The reopened app should expose source-backed calls into topology service/state/model classes. */
  | 'service-interaction'
  /** The reopened app should join template binding source members to service/state/model class interactions. */
  | 'service-interaction-binding'
  /** The reopened app should expose external template source ownership. */
  | 'external-template'
  /** The reopened app should expose compiled template analysis. */
  | 'template-compilation'
  /** The reopened app should expose runtime controller/hydration facts. */
  | 'runtime-controller'
  /** The reopened app should expose observer/accessor target facts for template bindings. */
  | 'binding-target-access'
  /** The reopened app should expose direct runtime target-operation facts for renderer or binding writes. */
  | 'target-operation'
  /** The reopened app should expose observer-backed value-channel facts for template bindings. */
  | 'binding-value-channel'
  /** The reopened app should expose runtime binding-behavior application facts. */
  | 'binding-behavior-application'
  /** The reopened app should expose source-to-target TypeChecker data-flow facts. */
  | 'binding-data-flow'
  /** The reopened app should expose route configuration or router topology facts. */
  | 'route'
  /** The reopened app should expose DI/container registration facts. */
  | 'dependency-injection'
  /** The authoring orientation should report a capability at or above a requested support state. */
  | 'authoring-capability'
  /** The authoring orientation should report a requested value; the value may be policy, observed shape, or derived reading. */
  | 'authoring-taste'
  /** The authoring orientation should report repair rows or repair clusters matching the requested filters. */
  | 'authoring-repair'
  /** The reopened app should have no open seams for the requested scope. */
  | 'open-seam-closure';

export type ExpectedSemanticEffectCardinality =
  /** At least one matching fact must be present. */
  | 'present'
  /** No matching facts should be present. */
  | 'absent'
  /** The observed fact count must be exactly `count`. */
  | 'exactly'
  /** The observed fact count must be greater than or equal to `count`. */
  | 'at-least';

export type ExpectedSemanticEffectScope =
  /** The expectation is scoped to project/package/tooling files. */
  | 'project'
  /** The expectation is over the whole opened project/app. */
  | 'app'
  /** The expectation is scoped to one component/resource/template when the verifier can filter that precisely. */
  | 'resource'
  /** The expectation is scoped to stylesheet/style asset facts. */
  | 'style'
  /** The expectation is scoped to template facts. */
  | 'template'
  /** The expectation is scoped to route/router facts. */
  | 'route'
  /** The expectation is scoped to DI/container facts. */
  | 'di'
  /** The expectation is scoped to authoring-orientation capability/taste rows. */
  | 'authoring';

export type ExpectedSemanticEffectRole =
  /** General app-health effect shared by many recipes; useful for verification but not enough to identify recipe fit. */
  | 'baseline'
  /** Effect that makes this recipe recognizable in an opened app and should drive candidate-fit reporting. */
  | 'signature'
  /** Required recipe-identifying effect; when it is absent, generic matching signatures should not make the app a candidate. */
  | 'discriminator';

/** Field/value predicate for an expected effect when count alone is too broad. */
export class ExpectedSemanticEffectFilter {
  readonly kind = 'expected-semantic-effect-filter' as const;

  constructor(
    /** Stable API row field or nested field path, such as `resourceKind` or `targetProperty`; arrays match by inclusion. */
    readonly field: string,
    /** Expected scalar value. Keep source text out of fixture-independent expectations. */
    readonly value: string | number | boolean | null,
  ) {}
}

/** Semantic effect an authoring plan expects after its edits are applied and the app is reopened. */
export class ExpectedSemanticEffect {
  readonly kind = 'expected-semantic-effect' as const;

  static fact(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = 'app',
    topologyNodeKind: AuthoringTargetKind | null = null,
    cardinality: ExpectedSemanticEffectCardinality = 'present',
    count: number | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
    role: ExpectedSemanticEffectRole = 'baseline',
  ): ExpectedSemanticEffect {
    return new ExpectedSemanticEffect(
      summary,
      topologyNodeKind,
      effectKind,
      scope,
      cardinality,
      count,
      filters,
      null,
      null,
      null,
      null,
      role,
    );
  }

  static signatureFact(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = 'app',
    topologyNodeKind: AuthoringTargetKind | null = null,
    cardinality: ExpectedSemanticEffectCardinality = 'present',
    count: number | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, cardinality, count, filters, 'signature');
  }

  static discriminatorFact(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = 'app',
    topologyNodeKind: AuthoringTargetKind | null = null,
    cardinality: ExpectedSemanticEffectCardinality = 'present',
    count: number | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, cardinality, count, filters, 'discriminator');
  }

  static atLeast(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: AuthoringTargetKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
    role: ExpectedSemanticEffectRole = 'baseline',
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, 'at-least', count, filters, role);
  }

  static signatureAtLeast(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: AuthoringTargetKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.atLeast(summary, effectKind, scope, count, topologyNodeKind, filters, 'signature');
  }

  static discriminatorAtLeast(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: AuthoringTargetKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.atLeast(summary, effectKind, scope, count, topologyNodeKind, filters, 'discriminator');
  }

  static exactly(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: AuthoringTargetKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
    role: ExpectedSemanticEffectRole = 'baseline',
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, 'exactly', count, filters, role);
  }

  static signatureExactly(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: AuthoringTargetKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.exactly(summary, effectKind, scope, count, topologyNodeKind, filters, 'signature');
  }

  static discriminatorExactly(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: AuthoringTargetKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.exactly(summary, effectKind, scope, count, topologyNodeKind, filters, 'discriminator');
  }

  static absent(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = 'app',
    topologyNodeKind: AuthoringTargetKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, 'absent', null, filters);
  }

  static capability(
    summary: string,
    capabilityKey: AuthoringCapabilityKey,
    minimumSupportState: AuthoringSupportState,
    topologyNodeKind: AuthoringTargetKind | null = null,
    role: ExpectedSemanticEffectRole = 'baseline',
  ): ExpectedSemanticEffect {
    return new ExpectedSemanticEffect(
      summary,
      topologyNodeKind,
      'authoring-capability',
      'authoring',
      'present',
      null,
      [],
      capabilityKey,
      minimumSupportState,
      null,
      null,
      role,
    );
  }

  static signatureCapability(
    summary: string,
    capabilityKey: AuthoringCapabilityKey,
    minimumSupportState: AuthoringSupportState,
    topologyNodeKind: AuthoringTargetKind | null = null,
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.capability(summary, capabilityKey, minimumSupportState, topologyNodeKind, 'signature');
  }

  static discriminatorCapability(
    summary: string,
    capabilityKey: AuthoringCapabilityKey,
    minimumSupportState: AuthoringSupportState,
    topologyNodeKind: AuthoringTargetKind | null = null,
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.capability(summary, capabilityKey, minimumSupportState, topologyNodeKind, 'discriminator');
  }

  static taste(
    summary: string,
    tasteAxisKey: AuthoringTasteAxisKey,
    tasteValueKey: AuthoringTasteValueKey,
    topologyNodeKind: AuthoringTargetKind | null = null,
    role: ExpectedSemanticEffectRole = 'baseline',
  ): ExpectedSemanticEffect {
    return new ExpectedSemanticEffect(
      summary,
      topologyNodeKind,
      'authoring-taste',
      'authoring',
      'present',
      null,
      [],
      null,
      null,
      tasteAxisKey,
      tasteValueKey,
      role,
    );
  }

  static signatureTaste(
    summary: string,
    tasteAxisKey: AuthoringTasteAxisKey,
    tasteValueKey: AuthoringTasteValueKey,
    topologyNodeKind: AuthoringTargetKind | null = null,
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.taste(summary, tasteAxisKey, tasteValueKey, topologyNodeKind, 'signature');
  }

  static discriminatorTaste(
    summary: string,
    tasteAxisKey: AuthoringTasteAxisKey,
    tasteValueKey: AuthoringTasteValueKey,
    topologyNodeKind: AuthoringTargetKind | null = null,
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.taste(summary, tasteAxisKey, tasteValueKey, topologyNodeKind, 'discriminator');
  }

  constructor(
    /** Product-facing expectation, not a file snapshot assertion. */
    readonly summary: string,
    /** Optional app topology node this expectation belongs to. */
    readonly topologyNodeKind: AuthoringTargetKind | null = null,
    /** Semantic fact family the verifier should inspect. */
    readonly effectKind: ExpectedSemanticEffectKind = 'resource-definition',
    /** Broad fact scope; used for reporting and verifier dispatch. */
    readonly scope: ExpectedSemanticEffectScope = 'app',
    /** Cardinality rule for matching facts. */
    readonly cardinality: ExpectedSemanticEffectCardinality = 'present',
    /** Count used by `exactly` and `at-least`; ignored for present/absent. */
    readonly count: number | null = null,
    /** Optional field predicates for row-shaped fact families. */
    readonly filters: readonly ExpectedSemanticEffectFilter[] = [],
    /** Capability key for `authoring-capability` effects. */
    readonly capabilityKey: AuthoringCapabilityKey | null = null,
    /** Minimum support state for `authoring-capability` effects. */
    readonly minimumSupportState: AuthoringSupportState | null = null,
    /** Orientation taste axis for `authoring-taste` effects; check the matched value layer before treating it as policy. */
    readonly tasteAxisKey: AuthoringTasteAxisKey | null = null,
    /** Orientation taste value for `authoring-taste` effects; not every value is a primitive policy preference. */
    readonly tasteValueKey: AuthoringTasteValueKey | null = null,
    /** Whether this expectation is general verification scaffolding or a recipe-identifying signal. */
    readonly role: ExpectedSemanticEffectRole = 'baseline',
  ) {
    validateExpectedSemanticEffectCardinality(cardinality, count);
  }

  /** Compact stable key for grouping this expected target across catalog, orientation, and pressure reports. */
  get semanticTargetKey(): string {
    return expectedSemanticEffectTargetKey(this);
  }
}

export function expectedSemanticEffectTargetKey(
  effect: ExpectedSemanticEffect,
): string {
  if (effect.effectKind === 'authoring-taste') {
    return `taste:${effect.tasteAxisKey ?? 'none'}:${effect.tasteValueKey ?? 'none'}`;
  }
  if (effect.effectKind === 'authoring-capability') {
    return `capability:${effect.capabilityKey ?? 'none'}:${effect.minimumSupportState ?? 'none'}`;
  }
  if (effect.filters.length > 0) {
    return `${effect.effectKind}:${effect.filters
      .slice()
      .sort(compareExpectedSemanticEffectFilters)
      .map((filter) => `${filter.field}=${expectedSemanticEffectTargetKeyValue(filter.value)}`)
      .join('&')}`;
  }
  const countPart = effect.count == null ? '' : `:${effect.count}`;
  return `${effect.effectKind}:${effect.cardinality}${countPart}`;
}

/**
 * Exact expectation identity for plan-local deduplication.
 * Summary text and role are intentionally excluded so equivalent baseline/signature/discriminator rows collapse with
 * the strongest role while stricter cardinality, filters, capability, or taste contracts stay distinct.
 */
export function expectedSemanticEffectContractKey(
  effect: ExpectedSemanticEffect,
): string {
  return [
    effect.effectKind,
    effect.scope,
    effect.topologyNodeKind ?? 'none',
    effect.cardinality,
    effect.count ?? 'count:none',
    effect.capabilityKey ?? 'capability:none',
    effect.minimumSupportState ?? 'support:none',
    effect.tasteAxisKey ?? 'taste-axis:none',
    effect.tasteValueKey ?? 'taste-value:none',
    expectedSemanticEffectFilterKey(effect),
  ].join('|');
}

function expectedSemanticEffectFilterKey(effect: ExpectedSemanticEffect): string {
  if (effect.filters.length === 0) {
    return 'filters:none';
  }
  return effect.filters
    .slice()
    .sort(compareExpectedSemanticEffectFilters)
    .map((filter) => JSON.stringify([filter.field, filter.value]))
    .join('&');
}

function compareExpectedSemanticEffectFilters(
  left: ExpectedSemanticEffectFilter,
  right: ExpectedSemanticEffectFilter,
): number {
  const fieldOrder = left.field.localeCompare(right.field);
  return fieldOrder === 0
    ? expectedSemanticEffectTargetKeyValue(left.value).localeCompare(expectedSemanticEffectTargetKeyValue(right.value))
    : fieldOrder;
}

function expectedSemanticEffectTargetKeyValue(value: string | number | boolean | null): string {
  return value == null ? 'null' : String(value);
}

function validateExpectedSemanticEffectCardinality(
  cardinality: ExpectedSemanticEffectCardinality,
  count: number | null,
): void {
  switch (cardinality) {
    case 'at-least':
    case 'exactly':
      if (count == null || !Number.isInteger(count) || count < 0) {
        throw new Error(`Expected semantic effect cardinality ${cardinality} requires a non-negative integer count.`);
      }
      break;
    case 'present':
    case 'absent':
      if (count != null) {
        throw new Error(`Expected semantic effect cardinality ${cardinality} must not carry a count.`);
      }
      break;
  }
}
