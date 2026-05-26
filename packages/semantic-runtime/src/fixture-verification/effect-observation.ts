import type {
  ExpectedSemanticEffect,
} from './expected-effect.js';
import {
  ExpectedSemanticEffectCardinality,
  ExpectedSemanticEffectKind,
} from './expected-effect.js';

export enum ExpectedSemanticEffectObservationOutcome {
  /** The observed app rows satisfy the expected semantic effect. */
  Satisfied = 'satisfied',
  /** The observed app rows are present but do not satisfy the expected semantic effect. */
  Failed = 'failed',
  /** The verifier has no observer for this effect kind yet. */
  Unsupported = 'unsupported',
}

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
  readonly openSeams: ExpectedSemanticEffectObservableRows;
}

export type ExpectedSemanticEffectObservableRows =
  | number
  | readonly object[];

export enum ExpectedSemanticEffectRouteProductKind {
  /** App-topology route summary row kept for compatibility with broad route-config effects. */
  TopologyRoute = 'topology-route',
  /** RouterOptions product created from RouterConfiguration admissions and option folds. */
  RouterOptions = 'router-options',
  /** Normalized RouteConfig product, including origin/value-shape metadata. */
  RouteConfig = 'route-config',
  /** Runtime RouteContext topology product. */
  RouteContext = 'route-context',
  /** Source-backed RouteContext.getRouteParameters(...) read correlated with route path params. */
  RouteContextParameterRead = 'route-context-parameter-read',
  /** Modeled au-viewport custom-element product. */
  RouterViewport = 'router-viewport',
  /** ViewportAgent product that hosts routed component activation. */
  ViewportAgent = 'viewport-agent',
  /** ComponentAgent handoff product for a routed custom element. */
  ComponentAgent = 'component-agent',
  /** TypedNavigationInstruction product produced from router resource values. */
  TypedNavigationInstruction = 'typed-navigation-instruction',
  /** ViewportInstruction product before route-tree realization. */
  ViewportInstruction = 'viewport-instruction',
  /** ViewportInstructionTree product grouped by route context. */
  ViewportInstructionTree = 'viewport-instruction-tree',
  /** RouteTree product for initial or transition route tree state. */
  RouteTree = 'route-tree',
  /** RouteNode product inside a route tree. */
  RouteNode = 'route-node',
  /** Route-recognizer ConfigurableRoute pattern product. */
  RoutePattern = 'route-pattern',
  /** Route-recognizer Endpoint product. */
  RouteEndpoint = 'route-endpoint',
  /** Route-recognizer State graph product. */
  RouteRecognizerState = 'route-recognizer-state',
  /** Route-recognizer known framework-failure issue product. */
  RouteRecognizerIssue = 'route-recognizer-issue',
  /** Router issue product with framework error-code or semantic-runtime authority. */
  RouterIssue = 'router-issue',
  /** RecognizedRoute product from walking a static instruction through a recognizer. */
  RecognizedRoute = 'recognized-route',
}

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

export interface ExpectedSemanticEffectObservationResult {
  readonly observedCount: number | null;
  readonly outcome: ExpectedSemanticEffectObservationOutcome;
}

type ExpectedSemanticEffectRowSource = (
  snapshot: ExpectedSemanticEffectObservationSnapshot,
) => ExpectedSemanticEffectObservableRows;

const expectedSemanticEffectRowSources: Partial<Record<ExpectedSemanticEffectKind, ExpectedSemanticEffectRowSource>> = {
  [ExpectedSemanticEffectKind.ProjectTooling]: (snapshot) => snapshot.projectSourceRoles,
  [ExpectedSemanticEffectKind.Component]: (snapshot) => snapshot.components,
  [ExpectedSemanticEffectKind.ComponentRole]: (snapshot) => snapshot.components
    .flatMap((component) => readObjectArray(component, 'roles')),
  [ExpectedSemanticEffectKind.StyleResource]: (snapshot) => snapshot.styles,
  [ExpectedSemanticEffectKind.ServiceClass]: (snapshot) => snapshot.services,
  [ExpectedSemanticEffectKind.StateComposition]: (snapshot) => snapshot.stateCompositions,
  [ExpectedSemanticEffectKind.ServiceInteraction]: (snapshot) => snapshot.serviceInteractions,
  [ExpectedSemanticEffectKind.ServiceInteractionBinding]: (snapshot) => snapshot.serviceInteractionBindings,
  [ExpectedSemanticEffectKind.ExternalTemplate]: (snapshot) => snapshot.components
    .filter((component) => readPath(component, 'template.source') != null),
  [ExpectedSemanticEffectKind.TemplateDiagnostic]: (snapshot) => snapshot.templateDiagnostics,
  [ExpectedSemanticEffectKind.RuntimeController]: (snapshot) => snapshot.runtimeControllers,
  [ExpectedSemanticEffectKind.RuntimeWatcher]: (snapshot) => snapshot.runtimeWatchers,
  [ExpectedSemanticEffectKind.RuntimeWatcherObservedDependency]: (snapshot) => snapshot.runtimeWatcherObservedDependencies,
  [ExpectedSemanticEffectKind.RuntimeComposition]: (snapshot) => snapshot.runtimeCompositions,
  [ExpectedSemanticEffectKind.BindingTargetAccess]: (snapshot) => snapshot.bindingTargetAccesses,
  [ExpectedSemanticEffectKind.TargetOperation]: (snapshot) => snapshot.targetOperations,
  [ExpectedSemanticEffectKind.BindingValueChannel]: (snapshot) => snapshot.bindingValueChannels,
  [ExpectedSemanticEffectKind.BindingObservedDependency]: (snapshot) => snapshot.bindingObservedDependencies,
  [ExpectedSemanticEffectKind.ComputedObservationDefinition]: (snapshot) => snapshot.computedObservationDefinitions,
  [ExpectedSemanticEffectKind.ComputedObserverSource]: (snapshot) => snapshot.computedObserverSources,
  [ExpectedSemanticEffectKind.ComputedObserverObservedDependency]: (snapshot) => snapshot.computedObserverObservedDependencies,
  [ExpectedSemanticEffectKind.BindingBehaviorApplication]: (snapshot) => snapshot.bindingBehaviorApplications,
  [ExpectedSemanticEffectKind.I18nTranslationKey]: (snapshot) => snapshot.i18nTranslationKeys,
  [ExpectedSemanticEffectKind.I18nTranslationBinding]: (snapshot) => snapshot.i18nTranslationBindings,
  [ExpectedSemanticEffectKind.StateStore]: (snapshot) => snapshot.stateStores,
  [ExpectedSemanticEffectKind.BindingDataFlow]: (snapshot) => snapshot.bindingDataFlows,
  [ExpectedSemanticEffectKind.OpenSeam]: (snapshot) => snapshot.openSeams,
  [ExpectedSemanticEffectKind.OpenSeamClosure]: (snapshot) => snapshot.openSeams,
};

export function observeExpectedSemanticEffect(
  expectedEffect: ExpectedSemanticEffect,
  snapshot: ExpectedSemanticEffectObservationSnapshot,
): ExpectedSemanticEffectObservationResult {
  const observedCount = observedCountForExpectedSemanticEffect(expectedEffect, snapshot);
  if (observedCount == null) {
    return {
      observedCount: null,
      outcome: ExpectedSemanticEffectObservationOutcome.Unsupported,
    };
  }
  return {
    observedCount,
    outcome: expectedSemanticEffectCardinalitySatisfied(
      expectedEffect.cardinality,
      observedCount,
      expectedEffect.count,
    )
      ? ExpectedSemanticEffectObservationOutcome.Satisfied
      : ExpectedSemanticEffectObservationOutcome.Failed,
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
    case ExpectedSemanticEffectKind.ProjectShape:
      return snapshot.projectShapeKind === 'aurelia-app' ? 1 : 0;
    case ExpectedSemanticEffectKind.AppRoot:
      return snapshot.appRoots;
    case ExpectedSemanticEffectKind.ResourceDefinition:
      return snapshot.resourceDefinitions;
    case ExpectedSemanticEffectKind.TemplateCompilation:
      return snapshot.compiledResources;
    case ExpectedSemanticEffectKind.Route:
      return expectedEffect.filters.length === 0
        ? snapshot.routeFacts
        : routeFactRows(snapshot).filter((route) => matchesFilters(route, expectedEffect.filters)).length;
    case ExpectedSemanticEffectKind.DependencyInjection:
      return snapshot.dependencyInjectionFacts;
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
    case ExpectedSemanticEffectCardinality.Present:
      return observedCount > 0;
    case ExpectedSemanticEffectCardinality.Absent:
      return observedCount === 0;
    case ExpectedSemanticEffectCardinality.Exactly:
      return observedCount === (requestedCount ?? 0);
    case ExpectedSemanticEffectCardinality.AtLeast:
      return observedCount >= (requestedCount ?? 1);
  }
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
    if (Array.isArray(value)) {
      value = value.flatMap((item) =>
        item != null && typeof item === 'object'
          ? [(item as Record<string, unknown>)[segment]]
          : []
      );
      continue;
    }
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}
