import type {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectCardinality,
  ExpectedSemanticEffectKind,
} from './expected-effect.js';
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
  /** Source-backed RouteContext.getRouteParameters(...) read correlated with route path params. */
  | 'route-context-parameter-read'
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

type ExpectedSemanticEffectRowSource = (
  snapshot: ExpectedSemanticEffectObservationSnapshot,
) => ExpectedSemanticEffectObservableRows;

const expectedSemanticEffectRowSources: Partial<Record<ExpectedSemanticEffectKind, ExpectedSemanticEffectRowSource>> = {
  'project-tooling': (snapshot) => snapshot.projectSourceRoles,
  'component': (snapshot) => snapshot.components,
  'component-role': (snapshot) => snapshot.components
    .flatMap((component) => readObjectArray(component, 'roles')),
  'style-resource': (snapshot) => snapshot.styles,
  'service-class': (snapshot) => snapshot.services,
  'state-composition': (snapshot) => snapshot.stateCompositions,
  'service-interaction': (snapshot) => snapshot.serviceInteractions,
  'service-interaction-binding': (snapshot) => snapshot.serviceInteractionBindings,
  'external-template': (snapshot) => snapshot.components
    .filter((component) => readPath(component, 'template.source') != null),
  'template-diagnostic': (snapshot) => snapshot.templateDiagnostics,
  'runtime-controller': (snapshot) => snapshot.runtimeControllers,
  'runtime-watcher': (snapshot) => snapshot.runtimeWatchers,
  'runtime-watcher-observed-dependency': (snapshot) => snapshot.runtimeWatcherObservedDependencies,
  'runtime-composition': (snapshot) => snapshot.runtimeCompositions,
  'binding-target-access': (snapshot) => snapshot.bindingTargetAccesses,
  'target-operation': (snapshot) => snapshot.targetOperations,
  'binding-value-channel': (snapshot) => snapshot.bindingValueChannels,
  'binding-observed-dependency': (snapshot) => snapshot.bindingObservedDependencies,
  'computed-observation-definition': (snapshot) => snapshot.computedObservationDefinitions,
  'computed-observer-source': (snapshot) => snapshot.computedObserverSources,
  'computed-observer-observed-dependency': (snapshot) => snapshot.computedObserverObservedDependencies,
  'binding-behavior-application': (snapshot) => snapshot.bindingBehaviorApplications,
  'i18n-translation-key': (snapshot) => snapshot.i18nTranslationKeys,
  'i18n-translation-binding': (snapshot) => snapshot.i18nTranslationBindings,
  'state-store': (snapshot) => snapshot.stateStores,
  'binding-data-flow': (snapshot) => snapshot.bindingDataFlows,
  'authoring-repair': (snapshot) => snapshot.repairClusters,
  'open-seam': (snapshot) => snapshot.openSeams,
  'open-seam-closure': (snapshot) => snapshot.openSeams,
};

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
  const rowSource = expectedSemanticEffectRowSources[expectedEffect.effectKind];
  if (rowSource !== undefined) {
    return filteredRowCount(rowSource(snapshot), expectedEffect.filters);
  }

  switch (expectedEffect.effectKind) {
    case 'project-shape':
      return snapshot.projectShapeKind === 'aurelia-app' ? 1 : 0;
    case 'app-root':
      return snapshot.appRoots;
    case 'resource-definition':
      return snapshot.resourceDefinitions;
    case 'template-compilation':
      return snapshot.compiledResources;
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
  }
  return null;
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
