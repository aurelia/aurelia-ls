export enum ExpectedSemanticEffectTopologyNodeKind {
  /** Workspace-level product shape. */
  Workspace = 'workspace',
  /** Project-level product shape. */
  Project = 'project',
  /** Package manifest source or topology node. */
  PackageManifest = 'package-manifest',
  /** Build or typecheck tooling source. */
  BuildTool = 'build-tool',
  /** Semantic-runtime opened app root. */
  SemanticApp = 'semantic-app',
  /** Custom element resource definition or topology node. */
  CustomElement = 'custom-element',
  /** Custom attribute resource definition or topology node. */
  CustomAttribute = 'custom-attribute',
  /** Template compilation or template-owned product. */
  Template = 'template',
  /** Template binding product. */
  TemplateBinding = 'template-binding',
  /** Template-controller product. */
  TemplateController = 'template-controller',
  /** App component topology node. */
  Component = 'component',
  /** App state model topology node. */
  StateModel = 'state-model',
  /** App service topology node. */
  Service = 'service',
  /** Domain model topology node. */
  DomainModel = 'domain-model',
  /** Router route topology node. */
  Route = 'route',
  /** Router topology node. */
  Router = 'router',
  /** Plugin topology node. */
  Plugin = 'plugin',
  /** Style asset topology node. */
  Style = 'style',
}

export enum ExpectedSemanticEffectKind {
  /** The reopened project should have an Aurelia app shape. */
  ProjectShape = 'project-shape',
  /** The reopened project should expose package/typecheck tooling source roles. */
  ProjectTooling = 'project-tooling',
  /** The reopened app should expose root app configuration. */
  AppRoot = 'app-root',
  /** The reopened app should expose Aurelia resource definitions. */
  ResourceDefinition = 'resource-definition',
  /** The reopened app should expose custom element/component definitions. */
  Component = 'component',
  /** The reopened app should expose generated component-role evidence rows. */
  ComponentRole = 'component-role',
  /** The reopened app should expose stylesheet/style asset ownership rows. */
  StyleResource = 'style-resource',
  /** The reopened app should expose source-backed state/service/model classes in app topology. */
  ServiceClass = 'service-class',
  /** The reopened app should expose public composed state/domain objects owned by a state class. */
  StateComposition = 'state-composition',
  /** The reopened app should expose source-backed calls into topology service/state/model classes. */
  ServiceInteraction = 'service-interaction',
  /** The reopened app should join template binding source members to service/state/model class interactions. */
  ServiceInteractionBinding = 'service-interaction-binding',
  /** The reopened app should expose external template source ownership. */
  ExternalTemplate = 'external-template',
  /** The reopened app should expose compiled template analysis. */
  TemplateCompilation = 'template-compilation',
  /** The reopened app should expose template diagnostic rows. */
  TemplateDiagnostic = 'template-diagnostic',
  /** The reopened app should expose runtime controller/hydration facts. */
  RuntimeController = 'runtime-controller',
  /** The reopened app should expose controller-owned runtime watcher facts. */
  RuntimeWatcher = 'runtime-watcher',
  /** The reopened app should expose concrete observed dependencies collected by runtime watchers. */
  RuntimeWatcherObservedDependency = 'runtime-watcher-observed-dependency',
  /** The reopened app should expose dynamic AuCompose runtime composition facts. */
  RuntimeComposition = 'runtime-composition',
  /** The reopened app should expose observer/accessor target facts for template bindings. */
  BindingTargetAccess = 'binding-target-access',
  /** The reopened app should expose source-side operation facts for ref and state-dispatch bindings. */
  BindingSourceOperation = 'binding-source-operation',
  /** The reopened app should expose direct runtime target-operation facts for renderer or binding writes. */
  TargetOperation = 'target-operation',
  /** The reopened app should expose observer-backed value-channel facts for template bindings. */
  BindingValueChannel = 'binding-value-channel',
  /** The reopened app should expose runtime binding-behavior application facts. */
  BindingBehaviorApplication = 'binding-behavior-application',
  /** The reopened app should expose source-side template connectable dependency reads for template bindings. */
  BindingObservedDependency = 'binding-observed-dependency',
  /** The reopened app should expose source-backed @computed getter/method dependency declarations. */
  ComputedObservationDefinition = 'computed-observation-definition',
  /** The reopened app should expose ObserverLocator ComputedObserver/ControlledComputedObserver source rows for getters. */
  ComputedObserverSource = 'computed-observer-source',
  /** The reopened app should expose source-side dependency reads projected for computed observer getter semantics. */
  ComputedObserverObservedDependency = 'computed-observer-observed-dependency',
  /** The reopened app should expose static i18n translation-key products. */
  I18nTranslationKey = 'i18n-translation-key',
  /** The reopened app should expose rendered i18n TranslationBinding target groups. */
  I18nTranslationBinding = 'i18n-translation-binding',
  /** The reopened app should expose @aurelia/state store configuration products. */
  StateStore = 'state-store',
  /** The reopened app should expose source-to-target TypeChecker data-flow facts. */
  BindingDataFlow = 'binding-data-flow',
  /** The reopened app should expose route configuration or router topology facts. */
  Route = 'route',
  /** The reopened app should expose DI/container registration facts. */
  DependencyInjection = 'dependency-injection',
  /** The reopened app should expose open seam rows matching the requested filters. */
  OpenSeam = 'open-seam',
  /** The reopened app should have no open seams for the requested scope. */
  OpenSeamClosure = 'open-seam-closure',
}

export enum ExpectedSemanticEffectCardinality {
  /** At least one matching fact must be present. */
  Present = 'present',
  /** No matching facts should be present. */
  Absent = 'absent',
  /** The observed fact count must be exactly `count`. */
  Exactly = 'exactly',
  /** The observed fact count must be greater than or equal to `count`. */
  AtLeast = 'at-least',
}

export enum ExpectedSemanticEffectScope {
  /** The expectation is scoped to project/package/tooling files. */
  Project = 'project',
  /** The expectation is over the whole opened project/app. */
  App = 'app',
  /** The expectation is scoped to one component/resource/template when the verifier can filter that precisely. */
  Resource = 'resource',
  /** The expectation is scoped to stylesheet/style asset facts. */
  Style = 'style',
  /** The expectation is scoped to template facts. */
  Template = 'template',
  /** The expectation is scoped to route/router facts. */
  Route = 'route',
  /** The expectation is scoped to DI/container facts. */
  Di = 'di',
}

export enum ExpectedSemanticEffectRole {
  /** General app-health effect shared by many recipes; useful for verification but not enough to identify recipe fit. */
  Baseline = 'baseline',
  /** Effect that makes this recipe recognizable in an opened app and should drive candidate-fit reporting. */
  Signature = 'signature',
  /** Required recipe-identifying effect; when it is absent, generic matching signatures should not make the app a candidate. */
  Discriminator = 'discriminator',
}

export type ExpectedSemanticEffectFilterValue = string | number | boolean | null;

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

export function expectedSemanticEffectFilters(
  ...entries: readonly (readonly [string, ExpectedSemanticEffectFilterValue])[]
): readonly ExpectedSemanticEffectFilter[] {
  return entries.map(([field, value]) => new ExpectedSemanticEffectFilter(field, value));
}

/** Semantic effect a fixture or source plan expects after its source is applied and the app is reopened. */
export class ExpectedSemanticEffect {
  readonly kind = 'expected-semantic-effect' as const;

  static fact(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = ExpectedSemanticEffectScope.App,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    cardinality: ExpectedSemanticEffectCardinality = ExpectedSemanticEffectCardinality.Present,
    count: number | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
    role: ExpectedSemanticEffectRole = ExpectedSemanticEffectRole.Baseline,
  ): ExpectedSemanticEffect {
    return new ExpectedSemanticEffect(
      summary,
      topologyNodeKind,
      effectKind,
      scope,
      cardinality,
      count,
      filters,
      role,
    );
  }

  static signatureFact(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = ExpectedSemanticEffectScope.App,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    cardinality: ExpectedSemanticEffectCardinality = ExpectedSemanticEffectCardinality.Present,
    count: number | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, cardinality, count, filters, ExpectedSemanticEffectRole.Signature);
  }

  static discriminatorFact(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = ExpectedSemanticEffectScope.App,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    cardinality: ExpectedSemanticEffectCardinality = ExpectedSemanticEffectCardinality.Present,
    count: number | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, cardinality, count, filters, ExpectedSemanticEffectRole.Discriminator);
  }

  static atLeast(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
    role: ExpectedSemanticEffectRole = ExpectedSemanticEffectRole.Baseline,
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, ExpectedSemanticEffectCardinality.AtLeast, count, filters, role);
  }

  static signatureAtLeast(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.atLeast(summary, effectKind, scope, count, topologyNodeKind, filters, ExpectedSemanticEffectRole.Signature);
  }

  static discriminatorAtLeast(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.atLeast(summary, effectKind, scope, count, topologyNodeKind, filters, ExpectedSemanticEffectRole.Discriminator);
  }

  static exactly(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
    role: ExpectedSemanticEffectRole = ExpectedSemanticEffectRole.Baseline,
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, ExpectedSemanticEffectCardinality.Exactly, count, filters, role);
  }

  static signatureExactly(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.exactly(summary, effectKind, scope, count, topologyNodeKind, filters, ExpectedSemanticEffectRole.Signature);
  }

  static discriminatorExactly(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope,
    count: number,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.exactly(summary, effectKind, scope, count, topologyNodeKind, filters, ExpectedSemanticEffectRole.Discriminator);
  }

  static absent(
    summary: string,
    effectKind: ExpectedSemanticEffectKind,
    scope: ExpectedSemanticEffectScope = ExpectedSemanticEffectScope.App,
    topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    filters: readonly ExpectedSemanticEffectFilter[] = [],
  ): ExpectedSemanticEffect {
    return ExpectedSemanticEffect.fact(summary, effectKind, scope, topologyNodeKind, ExpectedSemanticEffectCardinality.Absent, null, filters);
  }

  constructor(
    /** Product-facing expectation, not a file snapshot assertion. */
    readonly summary: string,
    /** Optional app topology node this expectation belongs to. */
    readonly topologyNodeKind: ExpectedSemanticEffectTopologyNodeKind | null = null,
    /** Semantic fact family the verifier should inspect. */
    readonly effectKind: ExpectedSemanticEffectKind = ExpectedSemanticEffectKind.ResourceDefinition,
    /** Broad fact scope; used for reporting and verifier dispatch. */
    readonly scope: ExpectedSemanticEffectScope = ExpectedSemanticEffectScope.App,
    /** Cardinality rule for matching facts. */
    readonly cardinality: ExpectedSemanticEffectCardinality = ExpectedSemanticEffectCardinality.Present,
    /** Count used by `exactly` and `at-least`; ignored for present/absent. */
    readonly count: number | null = null,
    /** Optional field predicates for row-shaped fact families. */
    readonly filters: readonly ExpectedSemanticEffectFilter[] = [],
    /** Whether this expectation is general verification scaffolding or a recipe-identifying signal. */
    readonly role: ExpectedSemanticEffectRole = ExpectedSemanticEffectRole.Baseline,
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
    case ExpectedSemanticEffectCardinality.AtLeast:
    case ExpectedSemanticEffectCardinality.Exactly:
      if (count == null || !Number.isInteger(count) || count < 0) {
        throw new Error(`Expected semantic effect cardinality ${cardinality} requires a non-negative integer count.`);
      }
      break;
    case ExpectedSemanticEffectCardinality.Present:
    case ExpectedSemanticEffectCardinality.Absent:
      if (count != null) {
        throw new Error(`Expected semantic effect cardinality ${cardinality} must not carry a count.`);
      }
      break;
  }
}
