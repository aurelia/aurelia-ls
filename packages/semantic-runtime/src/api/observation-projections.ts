import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type { ObservationIssue } from '../observation/observation-issue.js';
import type { ComputedObservationDefinition } from '../observation/computed-observation.js';
import type {
  ComputedObserverObservedDependency,
  ComputedObserverSource,
} from '../observation/computed-observer-source.js';
import type {
  RuntimeEffect,
  RuntimeEffectObservedDependency,
} from '../observation/runtime-effect.js';
import type {
  ProxyObservableEscape,
} from '../observation/proxy-observable-escape.js';
import {
  ObservationProductDetails,
} from '../observation/product-details.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticComputedObservationDefinitionsResult,
  SemanticComputedObservationDefinitionRow,
  SemanticComputedObserverObservedDependenciesResult,
  SemanticComputedObserverObservedDependencyRow,
  SemanticComputedObserverSourcesResult,
  SemanticComputedObserverSourceRow,
  SemanticObservationIssueRow,
  SemanticObservationIssuesResult,
  SemanticProxyObservableEscapeRow,
  SemanticProxyObservableEscapesResult,
  SemanticRuntimeEffectObservedDependencyRow,
  SemanticRuntimeEffectObservedDependenciesResult,
  SemanticRuntimeEffectResult,
  SemanticRuntimeEffectRow,
} from './contracts.js';

export function readObservationIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticObservationIssuesResult['rows'] {
  return readProjectObservationIssues(emission, store)
    .map((issue) => observationIssueRow(store, issue, handles))
    .sort((left, right) =>
      `${left.phase}:${left.issueKind}:${left.source?.label ?? ''}`
        .localeCompare(`${right.phase}:${right.issueKind}:${right.source?.label ?? ''}`)
    );
}

export function readComputedObservationDefinitionRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticComputedObservationDefinitionsResult['rows'] {
  return emission.computedObservation.readDefinitions()
    .map((definition) => computedObservationDefinitionRow(store, definition, handles))
    .sort((left, right) =>
      `${left.memberKind}:${left.memberName ?? ''}:${left.dependencyMode}:${left.source?.label ?? ''}`
        .localeCompare(`${right.memberKind}:${right.memberName ?? ''}:${right.dependencyMode}:${right.source?.label ?? ''}`)
    );
}

export function readComputedObserverSourceRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticComputedObserverSourcesResult['rows'] {
  return emission.computedObserverSources.readComputedObservers()
    .map((observer) => computedObserverSourceRow(store, observer, handles))
    .sort((left, right) =>
      `${left.observerKind}:${left.className ?? ''}:${left.memberName ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.observerKind}:${right.className ?? ''}:${right.memberName ?? ''}:${right.source?.label ?? ''}`)
    );
}

export function readComputedObserverObservedDependencyRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticComputedObserverObservedDependenciesResult['rows'] {
  const observersByHandle = new Map(
    emission.computedObserverSources.readComputedObservers().map((observer) => [observer.productHandle, observer]),
  );
  return emission.computedObserverSources.readObservedDependencies()
    .map((dependency) => computedObserverObservedDependencyRow(store, dependency, observersByHandle, handles))
    .sort((left, right) =>
      `${left.observerKind}:${left.className ?? ''}:${left.memberName ?? ''}:${left.sourceName ?? ''}:${left.spanStart ?? -1}`
        .localeCompare(`${right.observerKind}:${right.className ?? ''}:${right.memberName ?? ''}:${right.sourceName ?? ''}:${right.spanStart ?? -1}`)
    );
}

export function readRuntimeEffectRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticRuntimeEffectResult['rows'] {
  return emission.runtimeEffects.readEffects()
    .map((effect) => runtimeEffectRow(store, emission.project.projectKey, effect, handles))
    .sort((left, right) =>
      `${left.effectKind}:${left.dependencyEvaluationKind}:${left.source?.label ?? ''}`
        .localeCompare(`${right.effectKind}:${right.dependencyEvaluationKind}:${right.source?.label ?? ''}`)
    );
}

export function readRuntimeEffectObservedDependencyRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticRuntimeEffectObservedDependenciesResult['rows'] {
  const effectsByHandle = new Map(
    emission.runtimeEffects.readEffects().map((effect) => [effect.productHandle, effect]),
  );
  return emission.runtimeEffects.readObservedDependencies()
    .map((dependency) => runtimeEffectObservedDependencyRow(store, emission.project.projectKey, dependency, effectsByHandle, handles))
    .sort((left, right) =>
      `${left.effectKind}:${left.dependencyEvaluationKind}:${left.sourceName ?? ''}:${left.spanStart ?? -1}`
        .localeCompare(`${right.effectKind}:${right.dependencyEvaluationKind}:${right.sourceName ?? ''}:${right.spanStart ?? -1}`)
    );
}

export function readProxyObservableEscapeRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticProxyObservableEscapesResult['rows'] {
  return emission.proxyObservableEscapes.readEscapes()
    .map((escape) => proxyObservableEscapeRow(store, emission.project.projectKey, escape, handles))
    .sort((left, right) =>
      `${left.escapeKind}:${left.argumentRootName ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.escapeKind}:${right.argumentRootName ?? ''}:${right.source?.label ?? ''}`)
    );
}

function readProjectObservationIssues(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly ObservationIssue[] {
  return store.productDetails.readBySlot(ObservationProductDetails.Issue)
    .map((entry) => entry.detail)
    .filter((issue) => issue.projectKey === emission.project.projectKey);
}

function computedObservationDefinitionRow(
  store: KernelStore,
  definition: ComputedObservationDefinition,
  handles: boolean,
): SemanticComputedObservationDefinitionRow {
  return {
    projectKey: definition.projectKey,
    memberKind: definition.memberKind,
    memberName: definition.memberName,
    dependencyMode: definition.dependencyMode,
    dependencyKeys: definition.dependencyKeys,
    dependencyFunctionCount: definition.dependencyFunctionCount,
    flush: definition.flush,
    deep: definition.deep,
    source: describeAddress(store, definition.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: definition.productHandle,
        identityHandle: definition.identityHandle,
        sourceAddressHandle: definition.sourceAddressHandle,
      },
    } : {}),
  };
}

function computedObserverSourceRow(
  store: KernelStore,
  observer: ComputedObserverSource,
  handles: boolean,
): SemanticComputedObserverSourceRow {
  return {
    projectKey: observer.projectKey,
    observerKind: observer.observerKind,
    triggerKind: observer.triggerKind,
    className: observer.className,
    memberName: observer.memberName,
    dependencyMode: observer.dependencyMode,
    dependencyKeys: observer.dependencyKeys,
    dependencyFunctionCount: observer.dependencyFunctionCount,
    flush: observer.flush,
    deep: observer.deep,
    observedDependencies: observer.observedDependencies.length,
    source: describeAddress(store, observer.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: observer.productHandle,
        identityHandle: observer.identityHandle,
        sourceAddressHandle: observer.sourceAddressHandle,
      },
    } : {}),
  };
}

function computedObserverObservedDependencyRow(
  store: KernelStore,
  dependency: ComputedObserverObservedDependency,
  observersByHandle: ReadonlyMap<string, ComputedObserverSource>,
  handles: boolean,
): SemanticComputedObserverObservedDependencyRow {
  const observer = dependency.computedObserver.productHandle == null
    ? null
    : observersByHandle.get(dependency.computedObserver.productHandle) ?? null;
  return {
    projectKey: observer?.projectKey ?? '',
    observerKind: dependency.computedObserver.observerKind,
    className: observer?.className ?? null,
    memberName: observer?.memberName ?? null,
    dependencyKind: dependency.dependencyKind,
    expressionKind: dependency.expressionKind,
    sourceName: dependency.sourceName,
    sourceRootName: dependency.sourceRootName,
    dependencyMemberName: dependency.memberName,
    keyExpression: dependency.keyExpression,
    methodName: dependency.methodName,
    spanStart: dependency.spanStart,
    spanEnd: dependency.spanEnd,
    source: describeAddress(store, dependency.sourceAddressHandle),
    ...(handles ? {
      handles: {
        computedObserverProductHandle: dependency.computedObserver.productHandle,
        observedDependencyProductHandle: dependency.productHandle,
        observedDependencyIdentityHandle: dependency.identityHandle,
        sourceAddressHandle: dependency.sourceAddressHandle,
      },
    } : {}),
  };
}

function runtimeEffectRow(
  store: KernelStore,
  projectKey: string,
  effect: RuntimeEffect,
  handles: boolean,
): SemanticRuntimeEffectRow {
  return {
    projectKey,
    effectKind: effect.effectKind,
    dependencyEvaluationKind: effect.dependencyEvaluationKind,
    immediate: effect.immediate,
    observedDependencies: effect.observedDependencies.length,
    source: describeAddress(store, effect.sourceAddressHandle),
    ...(handles ? {
      handles: {
        effectProductHandle: effect.productHandle,
        effectIdentityHandle: effect.identityHandle,
        sourceAddressHandle: effect.sourceAddressHandle,
      },
    } : {}),
  };
}

function runtimeEffectObservedDependencyRow(
  store: KernelStore,
  projectKey: string,
  dependency: RuntimeEffectObservedDependency,
  effectsByHandle: ReadonlyMap<string | null, RuntimeEffect>,
  handles: boolean,
): SemanticRuntimeEffectObservedDependencyRow {
  const effect = effectsByHandle.get(dependency.effect.productHandle) ?? null;
  return {
    projectKey,
    effectKind: dependency.effect.effectKind,
    dependencyEvaluationKind: dependency.effect.dependencyEvaluationKind,
    immediate: effect?.immediate ?? null,
    dependencyKind: dependency.dependencyKind,
    expressionKind: dependency.expressionKind,
    sourceName: dependency.sourceName,
    sourceRootName: dependency.sourceRootName,
    memberName: dependency.memberName,
    keyExpression: dependency.keyExpression,
    methodName: dependency.methodName,
    observedMemberKind: dependency.observedMemberKind,
    observedMemberSource: describeAddress(store, dependency.observedMemberSourceAddressHandle),
    spanStart: dependency.spanStart,
    spanEnd: dependency.spanEnd,
    source: describeAddress(store, dependency.sourceAddressHandle),
    ...(handles ? {
      handles: {
        effectProductHandle: dependency.effect.productHandle,
        observedDependencyProductHandle: dependency.productHandle,
        observedDependencyIdentityHandle: dependency.identityHandle,
        observedMemberSourceAddressHandle: dependency.observedMemberSourceAddressHandle,
        sourceAddressHandle: dependency.sourceAddressHandle,
      },
    } : {}),
  };
}

function proxyObservableEscapeRow(
  store: KernelStore,
  projectKey: string,
  escape: ProxyObservableEscape,
  handles: boolean,
): SemanticProxyObservableEscapeRow {
  return {
    projectKey,
    escapeKind: escape.escapeKind,
    argumentSourceName: escape.argumentSourceName,
    argumentRootName: escape.argumentRootName,
    source: describeAddress(store, escape.sourceAddressHandle),
    ...(handles ? {
      handles: {
        escapeProductHandle: escape.productHandle,
        escapeIdentityHandle: escape.identityHandle,
        sourceAddressHandle: escape.sourceAddressHandle,
      },
    } : {}),
  };
}

function observationIssueRow(
  store: KernelStore,
  issue: ObservationIssue,
  handles: boolean,
): SemanticObservationIssueRow {
  return {
    projectKey: issue.projectKey,
    phase: issue.phase,
    issueKind: issue.issueKind,
    diagnosticAuthority: issue.frameworkErrorCode == null ? 'semantic-runtime-product' : 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: 'error',
    message: issue.message,
    source: describeAddress(store, issue.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      },
    } : {}),
  };
}
