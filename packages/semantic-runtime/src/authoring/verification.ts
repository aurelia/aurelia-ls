import type { ApplicationTopology } from '../application/index.js';
import type {
  SemanticAppSummary,
  SemanticAppQuery,
  SemanticRuntimeAnswer,
  SemanticAuthoringOrientationResult,
  SemanticBindingBehaviorApplicationRow,
  SemanticComputedObservationDefinitionRow,
  SemanticComputedObserverObservedDependencyRow,
  SemanticComputedObserverSourceRow,
  SemanticBindingDataFlowRow,
  SemanticBindingObservedDependencyRow,
  SemanticBindingTargetAccessRow,
  SemanticBindingValueChannelRow,
  SemanticI18nTranslationBindingRow,
  SemanticI18nTranslationKeyRow,
  SemanticOpenSeamRow,
  SemanticRuntimeCompositionRow,
  SemanticRuntimeControllerRow,
  SemanticRuntimeWatcherObservedDependencyRow,
  SemanticRuntimeWatcherRow,
  SemanticStateStoreRow,
  SemanticTargetOperationRow,
  SemanticTemplateDiagnosticRow,
} from '../api/contracts.js';
import { SemanticAppQueryKind, SemanticRuntimeAnswerOutcome, SemanticRuntimeDetail } from '../api/contracts.js';
import type { SemanticApplicationTopologyResult } from '../api/app-topology.js';
import { semanticRouteEffectQueryKinds } from '../api/route-effect-facts.js';
import type {
  ExpectedSemanticEffect,
} from './expected-effect.js';
import {
  expectedSemanticRouteFactRowsFor,
  observeExpectedSemanticEffect,
  type ExpectedSemanticEffectObservationSnapshot,
} from './effect-observation.js';

export type AuthoringVerificationOutcome =
  | 'satisfied'
  | 'open'
  | 'failed'
  | 'unsupported';

/** Compact seam row preserved from verification without depending on the API facade. */
export class AuthoringVerificationOpenSeam {
  readonly kind = 'authoring-verification-open-seam' as const;

  constructor(
    readonly seamKindKey: string,
    readonly summary: string,
    readonly sourceLabel: string | null = null,
  ) {}
}

/** Request to reopen an authored app and compare semantic facts against plan expectations. */
export class AuthoringVerificationRequest {
  readonly kind = 'authoring-verification-request' as const;

  constructor(
    readonly expectedTopology: ApplicationTopology | null,
    readonly expectedEffects: readonly ExpectedSemanticEffect[],
  ) {}
}

/** Reopened app facts used to compare expected semantic effects with observed API rows. */
export class AuthoringVerificationSnapshot {
  readonly kind = 'authoring-verification-snapshot' as const;

  constructor(
    readonly summary: SemanticAppSummary,
    readonly topology: SemanticApplicationTopologyResult,
    readonly authoringOrientation: SemanticAuthoringOrientationResult,
    readonly openSeams: readonly SemanticOpenSeamRow[] = [],
    readonly runtimeControllerRows: readonly SemanticRuntimeControllerRow[] | null = null,
    readonly runtimeWatchers: readonly SemanticRuntimeWatcherRow[] | null = null,
    readonly runtimeWatcherObservedDependencies: readonly SemanticRuntimeWatcherObservedDependencyRow[] | null = null,
    readonly runtimeCompositions: readonly SemanticRuntimeCompositionRow[] = [],
    readonly templateDiagnostics: readonly SemanticTemplateDiagnosticRow[] | null = null,
    readonly bindingBehaviorApplications: readonly SemanticBindingBehaviorApplicationRow[] = [],
    readonly bindingTargetAccesses: readonly SemanticBindingTargetAccessRow[] | null = null,
    readonly targetOperations: readonly SemanticTargetOperationRow[] | null = null,
    readonly bindingValueChannels: readonly SemanticBindingValueChannelRow[] | null = null,
    readonly bindingObservedDependencies: readonly SemanticBindingObservedDependencyRow[] | null = null,
    readonly computedObservationDefinitions: readonly SemanticComputedObservationDefinitionRow[] | null = null,
    readonly computedObserverSources: readonly SemanticComputedObserverSourceRow[] | null = null,
    readonly computedObserverObservedDependencies: readonly SemanticComputedObserverObservedDependencyRow[] | null = null,
    readonly i18nTranslationKeys: readonly SemanticI18nTranslationKeyRow[] = [],
    readonly i18nTranslationBindings: readonly SemanticI18nTranslationBindingRow[] = [],
    readonly stateStores: readonly SemanticStateStoreRow[] = [],
    readonly bindingDataFlows: readonly SemanticBindingDataFlowRow[] | null = null,
    readonly routeFactRows: readonly object[] = [],
  ) {}
}

/** Minimal app facade shape needed to build a complete verification snapshot. */
export interface AuthoringVerificationAppSnapshotSource {
  summary(): SemanticRuntimeAnswer<SemanticAppSummary>;
  ask(query: SemanticAppQuery): SemanticRuntimeAnswer<unknown>;
}

export interface AuthoringVerificationSnapshotOptions {
  /** Page size used while collecting row-backed verification projections. */
  readonly pageSize?: number | null;
}

export function readAuthoringVerificationSnapshot(
  app: AuthoringVerificationAppSnapshotSource,
  options: AuthoringVerificationSnapshotOptions = {},
): AuthoringVerificationSnapshot {
  const pageSize = normalizeVerificationSnapshotPageSize(options.pageSize);
  const summary = app.summary().value;
  const topology = readAnswerValue<SemanticApplicationTopologyResult>(app, SemanticAppQueryKind.AppTopology);
  const authoringOrientation = readAuthoringOrientationForVerification(app);
  return new AuthoringVerificationSnapshot(
    summary,
    topology,
    authoringOrientation,
    readPagedRows<SemanticOpenSeamRow>(app, SemanticAppQueryKind.OpenSeams, pageSize),
    readPagedRows<SemanticRuntimeControllerRow>(app, SemanticAppQueryKind.RuntimeControllers, pageSize),
    readPagedRows<SemanticRuntimeWatcherRow>(app, SemanticAppQueryKind.RuntimeWatchers, pageSize),
    readPagedRows<SemanticRuntimeWatcherObservedDependencyRow>(app, SemanticAppQueryKind.RuntimeWatcherObservedDependencies, pageSize),
    readPagedRows<SemanticRuntimeCompositionRow>(app, SemanticAppQueryKind.RuntimeCompositions, pageSize),
    readPagedRows<SemanticTemplateDiagnosticRow>(app, SemanticAppQueryKind.TemplateDiagnostics, pageSize),
    readPagedRows<SemanticBindingBehaviorApplicationRow>(app, SemanticAppQueryKind.BindingBehaviorApplications, pageSize),
    readPagedRows<SemanticBindingTargetAccessRow>(app, SemanticAppQueryKind.BindingTargetAccesses, pageSize),
    readPagedRows<SemanticTargetOperationRow>(app, SemanticAppQueryKind.TargetOperations, pageSize),
    readPagedRows<SemanticBindingValueChannelRow>(app, SemanticAppQueryKind.BindingValueChannels, pageSize),
    readPagedRows<SemanticBindingObservedDependencyRow>(app, SemanticAppQueryKind.BindingObservedDependencies, pageSize),
    readPagedRows<SemanticComputedObservationDefinitionRow>(app, SemanticAppQueryKind.ComputedObservationDefinitions, pageSize),
    readPagedRows<SemanticComputedObserverSourceRow>(app, SemanticAppQueryKind.ComputedObserverSources, pageSize),
    readPagedRows<SemanticComputedObserverObservedDependencyRow>(app, SemanticAppQueryKind.ComputedObserverObservedDependencies, pageSize),
    readPagedRows<SemanticI18nTranslationKeyRow>(app, SemanticAppQueryKind.I18nTranslationKeys, pageSize),
    readPagedRows<SemanticI18nTranslationBindingRow>(app, SemanticAppQueryKind.I18nTranslationBindings, pageSize),
    readPagedRows<SemanticStateStoreRow>(app, SemanticAppQueryKind.StateStores, pageSize),
    readPagedRows<SemanticBindingDataFlowRow>(app, SemanticAppQueryKind.BindingDataFlows, pageSize),
    readRouteFactRows(app, topology, pageSize),
  );
}

/** Result of one expected semantic effect after reopening the app. */
export class AuthoringVerificationEffectResult {
  readonly kind = 'authoring-verification-effect-result' as const;

  constructor(
    readonly expectedEffect: ExpectedSemanticEffect,
    readonly outcome: AuthoringVerificationOutcome,
    readonly summary: string,
  ) {}
}

/** Closed-loop answer after applying a plan and re-analyzing the app. */
export class AuthoringVerificationResult {
  readonly kind = 'authoring-verification-result' as const;

  constructor(
    readonly effectResults: readonly AuthoringVerificationEffectResult[],
    readonly openSeams: readonly AuthoringVerificationOpenSeam[] = [],
  ) {}
}

export function verifyAuthoringEffects(
  request: AuthoringVerificationRequest,
  snapshot: AuthoringVerificationSnapshot,
): AuthoringVerificationResult {
  const effectResults = request.expectedEffects.map((expectedEffect) =>
    verifyExpectedSemanticEffect(expectedEffect, snapshot)
  );
  return new AuthoringVerificationResult(
    effectResults,
    snapshot.openSeams.map((openSeam) =>
      new AuthoringVerificationOpenSeam(
        openSeam.seamKindKey,
        openSeam.summary,
        openSeam.source?.label ?? null,
      )
    ),
  );
}

export function verifyExpectedSemanticEffect(
  expectedEffect: ExpectedSemanticEffect,
  snapshot: AuthoringVerificationSnapshot,
): AuthoringVerificationEffectResult {
  const observation = observeExpectedSemanticEffect(
    expectedEffect,
    verificationObservationSnapshot(snapshot),
  );
  const observedCount = observation.observedCount;
  if (observedCount == null) {
    return new AuthoringVerificationEffectResult(
      expectedEffect,
      'unsupported',
    `Expected effect '${expectedEffect.effectKind}' is not supported by the verifier yet.`,
    );
  }
  return new AuthoringVerificationEffectResult(
    expectedEffect,
    observation.outcome,
    `${expectedEffect.summary} Observed ${observedCount} matching semantic fact(s).`,
  );
}

function readAnswerValue<TValue>(
  app: AuthoringVerificationAppSnapshotSource,
  kind: SemanticAppQueryKind,
): TValue {
  const answer = app.ask({ kind });
  assertVerificationSnapshotAnswerSupported(answer, kind);
  return answer.value as TValue;
}

function readAuthoringOrientationForVerification(
  app: AuthoringVerificationAppSnapshotSource,
): SemanticAuthoringOrientationResult {
  const answer = app.ask({
    kind: SemanticAppQueryKind.AuthoringOrientation,
    detail: SemanticRuntimeDetail.Handles,
  });
  assertVerificationSnapshotAnswerSupported(answer, SemanticAppQueryKind.AuthoringOrientation);
  return answer.value as SemanticAuthoringOrientationResult;
}

function readPagedRows<TRow>(
  app: AuthoringVerificationAppSnapshotSource,
  kind: SemanticAppQueryKind,
  pageSize: number,
): readonly TRow[] {
  const rows: TRow[] = [];
  let cursor: string | null = null;
  do {
    const answer = app.ask({
      kind,
      page: { size: pageSize, cursor },
    });
    assertVerificationSnapshotAnswerSupported(answer, kind);
    rows.push(...readRowsValue<TRow>(answer, kind));
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
}

function readRowsValue<TRow>(
  answer: SemanticRuntimeAnswer<unknown>,
  kind: SemanticAppQueryKind,
): readonly TRow[] {
  const value = answer.value;
  if (value == null || typeof value !== 'object' || !Array.isArray((value as { rows?: unknown }).rows)) {
    throw new Error(`Expected ${kind} answer to return row-shaped value.`);
  }
  return (value as { rows: readonly TRow[] }).rows;
}

function readRouteFactRows(
  app: AuthoringVerificationAppSnapshotSource,
  topology: SemanticApplicationTopologyResult,
  pageSize: number,
): readonly object[] {
  return [
    ...expectedSemanticRouteFactRowsFor('topology-route', topology.routes),
    ...semanticRouteEffectQueryKinds.flatMap((query) =>
      expectedSemanticRouteFactRowsFor(
        query.routeProductKind,
        readPagedRows<object>(app, query.queryKind, pageSize),
      )
    ),
  ];
}

function assertVerificationSnapshotAnswerSupported(
  answer: SemanticRuntimeAnswer<unknown>,
  kind: SemanticAppQueryKind,
): void {
  if (answer.outcome === SemanticRuntimeAnswerOutcome.Unsupported) {
    throw new Error(`Cannot build authoring verification snapshot: ${kind} is unsupported for the opened app. ${answer.summary}`);
  }
}

function normalizeVerificationSnapshotPageSize(
  value: number | null | undefined,
): number {
  return value == null || !Number.isFinite(value) || value <= 0
    ? 1000
    : Math.floor(value);
}

function verificationObservationSnapshot(
  snapshot: AuthoringVerificationSnapshot,
): ExpectedSemanticEffectObservationSnapshot {
  return {
    projectShapeKind: snapshot.authoringOrientation.project.shapeKind,
    projectSourceRoles: snapshot.authoringOrientation.project.sourceRoles,
    appRoots: snapshot.summary.appRoots,
    resourceDefinitions: snapshot.summary.resourceDefinitions,
    components: snapshot.topology.components,
    styles: snapshot.topology.styles,
    services: snapshot.topology.services,
    stateCompositions: snapshot.topology.stateCompositions,
    serviceInteractions: snapshot.topology.serviceInteractions,
    serviceInteractionBindings: snapshot.topology.serviceInteractionBindings,
    compiledResources: snapshot.summary.compiledResources,
    templateDiagnostics: snapshot.templateDiagnostics ?? [],
    runtimeControllers: snapshot.runtimeControllerRows ?? snapshot.summary.runtimeControllers,
    runtimeWatchers: snapshot.runtimeWatchers ?? snapshot.summary.runtimeWatchers,
    runtimeWatcherObservedDependencies: snapshot.runtimeWatcherObservedDependencies ?? snapshot.summary.runtimeWatcherObservedDependencies,
    runtimeCompositions: snapshot.runtimeCompositions,
    bindingTargetAccesses: snapshot.bindingTargetAccesses ?? snapshot.summary.runtimeBindingTargetAccesses,
    targetOperations: snapshot.targetOperations ?? snapshot.summary.runtimeTargetOperations,
    bindingValueChannels: snapshot.bindingValueChannels ?? snapshot.summary.runtimeBindingValueChannels,
    bindingObservedDependencies: snapshot.bindingObservedDependencies ?? snapshot.summary.runtimeBindingObservedDependencies,
    computedObservationDefinitions: snapshot.computedObservationDefinitions ?? snapshot.summary.computedObservationDefinitions,
    computedObserverSources: snapshot.computedObserverSources ?? snapshot.summary.computedObserverSources,
    computedObserverObservedDependencies: snapshot.computedObserverObservedDependencies ?? snapshot.summary.computedObserverObservedDependencies,
    bindingBehaviorApplications: snapshot.bindingBehaviorApplications,
    i18nTranslationKeys: snapshot.i18nTranslationKeys,
    i18nTranslationBindings: snapshot.i18nTranslationBindings,
    stateStores: snapshot.stateStores,
    bindingDataFlows: snapshot.bindingDataFlows ?? snapshot.summary.runtimeBindingDataFlows,
    routeFacts: snapshot.summary.routeConfigs + snapshot.summary.routePatterns + snapshot.summary.routeEndpoints,
    routeFactRows: snapshot.routeFactRows,
    routes: snapshot.topology.routes,
    dependencyInjectionFacts: snapshot.summary.containers + snapshot.summary.resolverSlots + snapshot.summary.registrationAdmissions,
    capabilities: snapshot.authoringOrientation.capabilities,
    taste: snapshot.authoringOrientation.taste,
    repairClusters: snapshot.authoringOrientation.repairClusters,
    openSeams: snapshot.openSeams,
  };
}
