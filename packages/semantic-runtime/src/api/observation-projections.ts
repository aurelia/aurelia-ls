import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import {
  ObservationIssueKind,
  ObservationIssueRelatedSourceKind,
  type ObservationIssue,
  type ObservationIssueRelatedSource,
} from '../observation/observation-issue.js';
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
import {
  filterObservedDependencyRows,
  observedDependencyOccurrenceRow,
  observedDependencyOwnerRow,
  observedDependencyRowKey,
} from './observed-dependency-projections.js';
import { RuntimeExpressionAccessOwnerKind } from '../runtime-expression/runtime-expression-access-use.js';
import type {
  SemanticComputedObservationDefinitionsResult,
  SemanticComputedObservationDefinitionRow,
  SemanticComputedObserverObservedDependenciesResult,
  SemanticComputedObserverObservedDependencyRow,
  SemanticObservedDependencyLocus,
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
  locus?: SemanticObservedDependencyLocus | null,
): SemanticComputedObserverObservedDependenciesResult['rows'] {
  const observersByHandle = new Map(
    emission.computedObserverSources.readComputedObservers().map((observer) => [observer.productHandle, observer]),
  );
  const rows = emission.computedObserverSources.readObservedDependencies()
    .map((dependency) => computedObserverObservedDependencyRow(store, dependency, observersByHandle, handles))
    .sort((left, right) =>
      `${left.observerKind}:${left.className ?? ''}:${left.memberName ?? ''}:${left.occurrence.sourceName ?? ''}:${left.occurrence.spanStart ?? -1}`
        .localeCompare(`${right.observerKind}:${right.className ?? ''}:${right.memberName ?? ''}:${right.occurrence.sourceName ?? ''}:${right.occurrence.spanStart ?? -1}`)
    );
  return filterObservedDependencyRows(rows, locus);
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
  locus?: SemanticObservedDependencyLocus | null,
): SemanticRuntimeEffectObservedDependenciesResult['rows'] {
  const effectsByHandle = new Map(
    emission.runtimeEffects.readEffects().map((effect) => [effect.productHandle, effect]),
  );
  const rows = emission.runtimeEffects.readObservedDependencies()
    .map((dependency) => runtimeEffectObservedDependencyRow(store, emission.project.projectKey, dependency, effectsByHandle, handles))
    .sort((left, right) =>
      `${left.effectKind}:${left.dependencyEvaluationKind}:${left.occurrence.sourceName ?? ''}:${left.occurrence.spanStart ?? -1}`
        .localeCompare(`${right.effectKind}:${right.dependencyEvaluationKind}:${right.occurrence.sourceName ?? ''}:${right.occurrence.spanStart ?? -1}`)
    );
  return filterObservedDependencyRows(rows, locus);
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
  const owner = observedDependencyOwnerRow(store, {
    kind: RuntimeExpressionAccessOwnerKind.ComputedObserver,
    productHandle: dependency.computedObserver.productHandle,
    identityHandle: dependency.computedObserver.identityHandle,
    sourceAddressHandle: dependency.computedObserver.addressHandle,
  }, handles);
  const occurrence = observedDependencyOccurrenceRow(store, dependency.occurrence, handles);
  return {
    projectKey: observer?.projectKey ?? '',
    observerKind: dependency.computedObserver.observerKind,
    className: observer?.className ?? null,
    memberName: observer?.memberName ?? null,
    rowKey: observedDependencyRowKey(owner, dependency.identityHandle),
    owner,
    occurrence,
    ...(handles ? {
      handles: {
        computedObserverProductHandle: dependency.computedObserver.productHandle,
        observedDependencyProductHandle: dependency.productHandle,
        observedDependencyIdentityHandle: dependency.identityHandle,
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
  const owner = observedDependencyOwnerRow(store, {
    kind: RuntimeExpressionAccessOwnerKind.SourceEffectPlan,
    productHandle: dependency.effect.productHandle,
    identityHandle: dependency.effect.identityHandle,
    sourceAddressHandle: dependency.effect.addressHandle,
  }, handles);
  const occurrence = observedDependencyOccurrenceRow(store, dependency.occurrence, handles);
  return {
    projectKey,
    effectKind: dependency.effect.effectKind,
    dependencyEvaluationKind: dependency.effect.dependencyEvaluationKind,
    immediate: effect?.immediate ?? null,
    rowKey: observedDependencyRowKey(owner, dependency.identityHandle),
    owner,
    occurrence,
    ...(handles ? {
      handles: {
        effectProductHandle: dependency.effect.productHandle,
        observedDependencyProductHandle: dependency.productHandle,
        observedDependencyIdentityHandle: dependency.identityHandle,
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
    severity: observationIssueSeverity(issue),
    message: issue.message,
    subjectName: issue.subjectName,
    source: describeAddress(store, issue.sourceAddressHandle),
    relatedInformation: issue.relatedSources.map((related) => ({
      relationKind: related.kind,
      message: observationIssueRelatedSourceMessage(related),
      source: describeAddress(store, related.addressHandle),
    })),
    suggestion: observationIssueSuggestion(store, issue),
    ...(handles ? {
      handles: {
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
        relatedSourceAddressHandles: issue.relatedSources.map((related) => related.addressHandle),
      },
    } : {}),
  };
}

function observationIssueSeverity(
  issue: ObservationIssue,
): SemanticObservationIssueRow['severity'] {
  switch (issue.issueKind) {
    case ObservationIssueKind.NonTrackableTemplateMethodCall:
      return 'warning';
    default:
      return 'error';
  }
}

function observationIssueRelatedSourceMessage(
  related: ObservationIssueRelatedSource,
): string {
  switch (related.kind) {
    case ObservationIssueRelatedSourceKind.SubjectDeclaration:
      return related.displayName == null
        ? 'The called method is declared here.'
        : `Method '${related.displayName}' is declared here.`;
    case ObservationIssueRelatedSourceKind.HiddenStateRead:
      return related.displayName == null
        ? 'This method-body state read is not observed through the template call.'
        : `Method-body read '${related.displayName}' is not observed through the template call.`;
  }
}

function observationIssueSuggestion(
  store: KernelStore,
  issue: ObservationIssue,
): SemanticObservationIssueRow['suggestion'] {
  switch (issue.issueKind) {
    case ObservationIssueKind.NonTrackableTemplateMethodCall:
      return {
        suggestionKind: 'make-method-trackable',
        actionKind: 'configure-observer',
        actionTarget: {
          targetKind: 'observer-config',
          source: describeAddress(
            store,
            issue.relatedSources.find((related) =>
              related.kind === ObservationIssueRelatedSourceKind.SubjectDeclaration
            )?.addressHandle ?? null,
          ),
          memberName: issue.subjectName,
          typeDisplay: null,
        },
        summary: 'Make the called method trackable with @computed/@astTrack, convert it to an observable getter, or bind the dependency directly.',
        targetMemberName: issue.subjectName,
        ownerTypeDisplay: null,
        valueTypeDisplay: null,
        valueTypeSource: null,
      };
    default:
      return null;
  }
}
