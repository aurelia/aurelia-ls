import type { ExpectedSemanticEffect, ExpectedSemanticEffectCardinality } from './expected-effect.js';
import { authoringSupportStateRank, type AuthoringSupportState } from './ontology.js';

export type ExpectedSemanticEffectObservationOutcome =
  | 'satisfied'
  | 'failed'
  | 'unsupported';

export interface ExpectedSemanticEffectObservationSnapshot {
  readonly projectShapeKind: string;
  readonly projectSourceRoles: readonly object[];
  readonly appRoots: number;
  readonly resourceDefinitions: number;
  readonly components: readonly object[];
  readonly styles: readonly object[];
  readonly services: readonly object[];
  readonly stateCompositions: readonly object[];
  readonly serviceInteractions: readonly object[];
  readonly serviceInteractionBindings: readonly object[];
  readonly compiledResources: number;
  readonly templateDiagnostics: ExpectedSemanticEffectObservableRows;
  readonly runtimeControllers: ExpectedSemanticEffectObservableRows;
  readonly runtimeWatchers: ExpectedSemanticEffectObservableRows;
  readonly runtimeWatcherObservedDependencies: ExpectedSemanticEffectObservableRows;
  readonly runtimeCompositions: readonly object[];
  readonly bindingTargetAccesses: ExpectedSemanticEffectObservableRows;
  readonly targetOperations: ExpectedSemanticEffectObservableRows;
  readonly bindingValueChannels: ExpectedSemanticEffectObservableRows;
  readonly bindingObservedDependencies: ExpectedSemanticEffectObservableRows;
  readonly computedObservationDefinitions: ExpectedSemanticEffectObservableRows;
  readonly computedObserverSources: ExpectedSemanticEffectObservableRows;
  readonly computedObserverObservedDependencies: ExpectedSemanticEffectObservableRows;
  readonly bindingBehaviorApplications: readonly object[];
  readonly i18nTranslationKeys: readonly object[];
  readonly i18nTranslationBindings: readonly object[];
  readonly stateStores: readonly object[];
  readonly bindingDataFlows: ExpectedSemanticEffectObservableRows;
  readonly routeFacts: number;
  readonly routeFactRows: readonly object[];
  readonly routes: readonly object[];
  readonly dependencyInjectionFacts: number;
  readonly capabilities: readonly ExpectedSemanticEffectCapabilityRow[];
  readonly taste: readonly ExpectedSemanticEffectTasteAxisRow[];
  readonly repairClusters: readonly object[];
  readonly openSeams: ExpectedSemanticEffectObservableRows;
}

export type ExpectedSemanticEffectObservableRows =
  | number
  | readonly object[];

export type ExpectedSemanticEffectRouteProductKind =
  /** App-topology route summary row kept for compatibility with broad route-config effects. */
  | 'topology-route'
  /** RouterOptions product created from RouterConfiguration admissions and option folds. */
  | 'router-options'
  /** Normalized RouteConfig product, including origin/value-shape metadata. */
  | 'route-config'
  /** Runtime RouteContext topology product. */
  | 'route-context'
  /** Modeled au-viewport custom-element product. */
  | 'router-viewport'
  /** ViewportAgent product that hosts routed component activation. */
  | 'viewport-agent'
  /** ComponentAgent handoff product for a routed custom element. */
  | 'component-agent'
  /** TypedNavigationInstruction product produced from router resource values. */
  | 'typed-navigation-instruction'
  /** ViewportInstruction product before route-tree realization. */
  | 'viewport-instruction'
  /** ViewportInstructionTree product grouped by route context. */
  | 'viewport-instruction-tree'
  /** RouteTree product for initial or transition route tree state. */
  | 'route-tree'
  /** RouteNode product inside a route tree. */
  | 'route-node'
  /** Route-recognizer ConfigurableRoute pattern product. */
  | 'route-pattern'
  /** Route-recognizer Endpoint product. */
  | 'route-endpoint'
  /** Route-recognizer State graph product. */
  | 'route-recognizer-state'
  /** Route-recognizer known framework-failure issue product. */
  | 'route-recognizer-issue'
  /** Router issue product with framework error-code or semantic-runtime authority. */
  | 'router-issue'
  /** RecognizedRoute product from walking a static instruction through a recognizer. */
  | 'recognized-route';

export function expectedSemanticRouteFactRowsFor(
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
  rows: readonly object[],
): readonly object[] {
  return rows.map((row) => expectedSemanticRouteFactRow(routeProductKind, row));
}

export function expectedSemanticRouteFactRow(
  routeProductKind: ExpectedSemanticEffectRouteProductKind,
  row: object,
): object {
  const output: Record<string, unknown> = { routeProductKind };
  for (const [key, value] of Object.entries(row)) {
    output[key] = value;
  }
  return output;
}

export interface ExpectedSemanticEffectCapabilityRow {
  readonly key: string;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
}

export interface ExpectedSemanticEffectTasteAxisRow {
  readonly axisKey: string;
  readonly values: readonly ExpectedSemanticEffectTasteValueRow[];
}

export interface ExpectedSemanticEffectTasteValueRow {
  readonly valueKey: string;
}

export interface ExpectedSemanticEffectObservationResult {
  readonly observedCount: number | null;
  readonly outcome: ExpectedSemanticEffectObservationOutcome;
}

export function observeExpectedSemanticEffect(
  expectedEffect: ExpectedSemanticEffect,
  snapshot: ExpectedSemanticEffectObservationSnapshot,
): ExpectedSemanticEffectObservationResult {
  const observedCount = observedCountForExpectedSemanticEffect(expectedEffect, snapshot);
  if (observedCount == null) {
    return {
      observedCount: null,
      outcome: 'unsupported',
    };
  }
  return {
    observedCount,
    outcome: expectedSemanticEffectCardinalitySatisfied(
      expectedEffect.cardinality,
      observedCount,
      expectedEffect.count,
    )
      ? 'satisfied'
      : 'failed',
  };
}

export function observedCountForExpectedSemanticEffect(
  expectedEffect: ExpectedSemanticEffect,
  snapshot: ExpectedSemanticEffectObservationSnapshot,
): number | null {
  switch (expectedEffect.effectKind) {
    case 'project-shape':
      return snapshot.projectShapeKind === 'aurelia-app' ? 1 : 0;
    case 'project-tooling':
      return snapshot.projectSourceRoles.filter((role) =>
        matchesFilters(role, expectedEffect.filters)
      ).length;
    case 'app-root':
      return snapshot.appRoots;
    case 'resource-definition':
      return snapshot.resourceDefinitions;
    case 'component':
      return snapshot.components.filter((component) =>
        matchesFilters(component, expectedEffect.filters)
      ).length;
    case 'component-role':
      return snapshot.components
        .flatMap((component) => readObjectArray(component, 'roles'))
        .filter((role) => matchesFilters(role, expectedEffect.filters))
        .length;
    case 'style-resource':
      return snapshot.styles.filter((style) =>
        matchesFilters(style, expectedEffect.filters)
      ).length;
    case 'service-class':
      return snapshot.services.filter((service) =>
        matchesFilters(service, expectedEffect.filters)
      ).length;
    case 'state-composition':
      return snapshot.stateCompositions.filter((composition) =>
        matchesFilters(composition, expectedEffect.filters)
      ).length;
    case 'service-interaction':
      return snapshot.serviceInteractions.filter((interaction) =>
        matchesFilters(interaction, expectedEffect.filters)
      ).length;
    case 'service-interaction-binding':
      return snapshot.serviceInteractionBindings.filter((binding) =>
        matchesFilters(binding, expectedEffect.filters)
      ).length;
    case 'external-template':
      return snapshot.components.filter((component) =>
        readPath(component, 'template.source') != null &&
        matchesFilters(component, expectedEffect.filters)
      ).length;
    case 'template-compilation':
      return snapshot.compiledResources;
    case 'template-diagnostic':
      return filteredRowCount(snapshot.templateDiagnostics, expectedEffect.filters);
    case 'runtime-controller':
      return filteredRowCount(snapshot.runtimeControllers, expectedEffect.filters);
    case 'runtime-watcher':
      return filteredRowCount(snapshot.runtimeWatchers, expectedEffect.filters);
    case 'runtime-watcher-observed-dependency':
      return filteredRowCount(snapshot.runtimeWatcherObservedDependencies, expectedEffect.filters);
    case 'runtime-composition':
      return snapshot.runtimeCompositions.filter((composition) =>
        matchesFilters(composition, expectedEffect.filters)
      ).length;
    case 'binding-target-access':
      return filteredRowCount(snapshot.bindingTargetAccesses, expectedEffect.filters);
    case 'target-operation':
      return filteredRowCount(snapshot.targetOperations, expectedEffect.filters);
    case 'binding-value-channel':
      return filteredRowCount(snapshot.bindingValueChannels, expectedEffect.filters);
    case 'binding-observed-dependency':
      return filteredRowCount(snapshot.bindingObservedDependencies, expectedEffect.filters);
    case 'computed-observation-definition':
      return filteredRowCount(snapshot.computedObservationDefinitions, expectedEffect.filters);
    case 'computed-observer-source':
      return filteredRowCount(snapshot.computedObserverSources, expectedEffect.filters);
    case 'computed-observer-observed-dependency':
      return filteredRowCount(snapshot.computedObserverObservedDependencies, expectedEffect.filters);
    case 'binding-behavior-application':
      return snapshot.bindingBehaviorApplications.filter((application) =>
        matchesFilters(application, expectedEffect.filters)
      ).length;
    case 'i18n-translation-key':
      return snapshot.i18nTranslationKeys.filter((translationKey) =>
        matchesFilters(translationKey, expectedEffect.filters)
      ).length;
    case 'i18n-translation-binding':
      return snapshot.i18nTranslationBindings.filter((translationBinding) =>
        matchesFilters(translationBinding, expectedEffect.filters)
      ).length;
    case 'state-store':
      return snapshot.stateStores.filter((stateStore) =>
        matchesFilters(stateStore, expectedEffect.filters)
      ).length;
    case 'binding-data-flow':
      return filteredRowCount(snapshot.bindingDataFlows, expectedEffect.filters);
    case 'route':
      return expectedEffect.filters.length === 0
        ? snapshot.routeFacts
        : routeFactRows(snapshot).filter((route) => matchesFilters(route, expectedEffect.filters)).length;
    case 'dependency-injection':
      return snapshot.dependencyInjectionFacts;
    case 'authoring-capability':
      return authoringCapabilityCount(expectedEffect, snapshot);
    case 'authoring-taste':
      return authoringTasteValueCount(expectedEffect, snapshot);
    case 'authoring-repair':
      return snapshot.repairClusters.filter((cluster) =>
        matchesFilters(cluster, expectedEffect.filters)
      ).length;
    case 'open-seam':
      return filteredRowCount(snapshot.openSeams, expectedEffect.filters);
    case 'open-seam-closure':
      return filteredRowCount(snapshot.openSeams, expectedEffect.filters);
  }
}

function routeFactRows(
  snapshot: ExpectedSemanticEffectObservationSnapshot,
): readonly object[] {
  return snapshot.routeFactRows.length === 0
    ? snapshot.routes
    : snapshot.routeFactRows;
}

function filteredRowCount(
  rows: ExpectedSemanticEffectObservableRows,
  filters: readonly { readonly field: string; readonly value: string | number | boolean | null }[],
): number | null {
  if (typeof rows === 'number') {
    return filters.length === 0 ? rows : null;
  }
  return rows.filter((row) => matchesFilters(row, filters)).length;
}

export function expectedSemanticEffectCardinalitySatisfied(
  cardinality: ExpectedSemanticEffectCardinality,
  observedCount: number,
  requestedCount: number | null,
): boolean {
  switch (cardinality) {
    case 'present':
      return observedCount > 0;
    case 'absent':
      return observedCount === 0;
    case 'exactly':
      return observedCount === (requestedCount ?? 0);
    case 'at-least':
      return observedCount >= (requestedCount ?? 1);
  }
}

function authoringCapabilityCount(
  expectedEffect: ExpectedSemanticEffect,
  snapshot: ExpectedSemanticEffectObservationSnapshot,
): number {
  const capability = snapshot.capabilities.find((row) =>
    row.key === expectedEffect.capabilityKey
  );
  if (capability == null) {
    return 0;
  }
  const minimum = expectedEffect.minimumSupportState;
  return minimum == null || authoringSupportStateRank(capability.supportState) >= authoringSupportStateRank(minimum)
    ? 1
    : 0;
}

function authoringTasteValueCount(
  expectedEffect: ExpectedSemanticEffect,
  snapshot: ExpectedSemanticEffectObservationSnapshot,
): number {
  const axis = snapshot.taste.find((row) =>
    row.axisKey === expectedEffect.tasteAxisKey
  );
  if (axis == null) {
    return 0;
  }
  return axis.values.filter((value) => value.valueKey === expectedEffect.tasteValueKey).length;
}

function matchesFilters(
  row: object,
  filters: readonly { readonly field: string; readonly value: string | number | boolean | null }[],
): boolean {
  return filters.every((filter) => fieldMatches(readPath(row, filter.field), filter.value));
}

function fieldMatches(
  actual: unknown,
  expected: string | number | boolean | null,
): boolean {
  if (Array.isArray(actual)) {
    return actual.includes(expected);
  }
  return actual === expected;
}

function readObjectArray(row: object, field: string): readonly object[] {
  const value = readPath(row, field);
  return Array.isArray(value)
    ? value.filter((item): item is object => item != null && typeof item === 'object')
    : [];
}

function readPath(row: object, fieldPath: string): unknown {
  let value: unknown = row;
  for (const segment of fieldPath.split('.')) {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}
