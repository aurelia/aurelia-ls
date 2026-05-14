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
  readonly serviceInteractions: readonly object[];
  readonly serviceInteractionBindings: readonly object[];
  readonly compiledResources: number;
  readonly runtimeControllers: number;
  readonly bindingTargetAccesses: ExpectedSemanticEffectObservableRows;
  readonly targetOperations: ExpectedSemanticEffectObservableRows;
  readonly bindingValueChannels: ExpectedSemanticEffectObservableRows;
  readonly bindingBehaviorApplications: readonly object[];
  readonly bindingDataFlows: ExpectedSemanticEffectObservableRows;
  readonly routeFacts: number;
  readonly routes: readonly object[];
  readonly dependencyInjectionFacts: number;
  readonly capabilities: readonly ExpectedSemanticEffectCapabilityRow[];
  readonly taste: readonly ExpectedSemanticEffectTasteAxisRow[];
  readonly repairClusters: readonly object[];
  readonly openSeams: number;
}

export type ExpectedSemanticEffectObservableRows =
  | number
  | readonly object[];

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
    case 'runtime-controller':
      return snapshot.runtimeControllers;
    case 'binding-target-access':
      return filteredRowCount(snapshot.bindingTargetAccesses, expectedEffect.filters);
    case 'target-operation':
      return filteredRowCount(snapshot.targetOperations, expectedEffect.filters);
    case 'binding-value-channel':
      return filteredRowCount(snapshot.bindingValueChannels, expectedEffect.filters);
    case 'binding-behavior-application':
      return snapshot.bindingBehaviorApplications.filter((application) =>
        matchesFilters(application, expectedEffect.filters)
      ).length;
    case 'binding-data-flow':
      return filteredRowCount(snapshot.bindingDataFlows, expectedEffect.filters);
    case 'route':
      return expectedEffect.filters.length === 0
        ? snapshot.routeFacts
        : snapshot.routes.filter((route) => matchesFilters(route, expectedEffect.filters)).length;
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
    case 'open-seam-closure':
      return snapshot.openSeams;
  }
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
