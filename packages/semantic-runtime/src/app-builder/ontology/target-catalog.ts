import {
  appBuilderEffectContractIdsForTargetRef,
} from './effect-target.js';
import type {
  AppBuilderEffectContractId,
} from './effect.js';
import {
  AppBuilderInputReadinessState,
  appBuilderInputReadinessIssueForTargetSelectionIssue,
  appBuilderInputReadiness,
  type AppBuilderInputReadinessDependencyRow,
  type AppBuilderInputReadinessIssue,
  type AppBuilderInputReadinessTargetRow,
  type AppBuilderSuppliedInput,
} from './input-readiness.js';
import {
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
  appBuilderOntologyRowRefKey,
  type AppBuilderOntologyRowDescriptor,
} from './row-descriptor.js';
import {
  AppBuilderOntologyDomain,
  type AppBuilderOntologyStatus,
  type AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
} from './status.js';
import {
  appBuilderDefaultingCandidateForTarget,
  appBuilderDefaultingCandidatePolicyRow,
  type AppBuilderDefaultingCandidatePolicyRow,
} from '../policy/defaulting-candidate-policy.js';
import {
  appBuilderRequiresPolicySatisfaction,
} from '../policy/policy-satisfaction.js';
import {
  appBuilderRecommendationStatusRank,
} from '../policy/recommendation-policy.js';
import {
  appBuilderDecisionBundleInputCounts,
  type AppBuilderDecisionBundle,
} from '../policy/decision-bundle.js';
import {
  appBuilderNormalizeOntologyTargetSelection,
  type AppBuilderOntologyTargetSelector,
} from './target-selector.js';
import {
  appBuilderSourceLoweringSurfaceKindsForTarget,
  type AppBuilderSourceLoweringSurfaceKind,
} from './source-lowering-surface.js';
import {
  appBuilderSourceLoweringRequestFieldSummary,
  appBuilderSourceLoweringRequestFieldsForTarget,
  type AppBuilderSourceLoweringRequestFieldSummary,
  type AppBuilderSourceLoweringRequestFieldRequirement,
} from './source-lowering-request-field.js';

/** Filter request for app-builder ontology targets that can be selected by later queries. */
export interface AppBuilderTargetCatalogRequest {
  /** Include only these exact ontology row references; empty or omitted means no exact-ref filter. */
  readonly targetRefs?: readonly AppBuilderOntologyRowRef[] | null;
  /** Include only these compact kind/id target selectors; normalized to exact refs before filtering. */
  readonly targetSelectors?: readonly AppBuilderOntologyTargetSelector[] | null;
  /** Include only these ontology domains; empty or omitted means all domains. */
  readonly domains?: readonly AppBuilderOntologyDomain[] | null;
  /** Include only these row kinds; empty or omitted means all row kinds. */
  readonly targetKinds?: readonly AppBuilderOntologyRowKind[] | null;
  /** Include only rows with these recommendation statuses. */
  readonly recommendationStatuses?: readonly AppBuilderRecommendationStatus[] | null;
  /** Include only rows whose status has one of these grounding authorities. */
  readonly reasonAuthorities?: readonly AppBuilderOntologyReasonAuthority[] | null;
  /** Include only rows with or without executable source lowering when specified. */
  readonly sourceLoweringImplemented?: boolean | null;
  /** Include only rows spendable by at least one requested app-builder source-lowering surface. */
  readonly sourceLoweringSurfaceKinds?: readonly AppBuilderSourceLoweringSurfaceKind[] | null;
  /** Include only rows currently admitted as local defaulting candidates when specified. */
  readonly defaultingCandidate?: boolean | null;
  /** Include only rows that do or do not require explicit input when specified. */
  readonly requiresExplicitInput?: boolean | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness filtering. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include compact input-readiness counts for each returned target; defaults to true. */
  readonly includeInputReadiness?: boolean | null;
  /** Include full dependency rows on each target; defaults to false because callers can drill into input-readiness. */
  readonly includeInputDependencies?: boolean | null;
  /** Include full source-lowering request-field rows on each target; defaults to false because summaries keep counts and names. */
  readonly includeSourceLoweringRequestFields?: boolean | null;
  /** Include only target rows that have at least one dependency in one of these states. */
  readonly readinessStates?: readonly AppBuilderInputReadinessState[] | null;
}

/** Compact input-readiness counts for one app-builder target row. */
export interface AppBuilderTargetCatalogReadinessSummary {
  /** Number of input dependency rows inspected for this target. */
  readonly inputDependencyCount: number;
  /** Number of satisfied dependencies. */
  readonly satisfiedCount: number;
  /** Number of absent required dependencies. */
  readonly missingRequiredCount: number;
  /** Number of absent recommended dependencies. */
  readonly missingRecommendedCount: number;
  /** Number of absent optional dependencies. */
  readonly missingOptionalCount: number;
  /** Number of deferred dependencies. */
  readonly deferredCount: number;
  /** Number of supplied inputs rejected for this target. */
  readonly rejectedInputCount: number;
}

/** App-builder ontology target row with status and optional readiness facts. */
export interface AppBuilderTargetCatalogRow {
  /** Stable ontology row reference for later targetRefs. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Short display title. */
  readonly title: string;
  /** Compact row explanation. */
  readonly summary: string;
  /** Honest modeling/implementation/recommendation status for this target. */
  readonly status: AppBuilderOntologyStatus;
  /** Whether this row is admitted as a local fallback candidate after caller/context narrowing. */
  readonly defaultingCandidate: boolean;
  /** Reviewable scope/rationale for a local defaulting candidate. */
  readonly defaultingCandidatePolicy?: AppBuilderDefaultingCandidatePolicyRow;
  /** Whether this contextual executable row needs explicit policy satisfaction before broad source lowering. */
  readonly policySatisfactionRequired: boolean;
  /** Source-lowering surfaces that can spend this target row. */
  readonly sourceLoweringSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[];
  /** Per-call source-lowering request fields still needed after durable input readiness passes when explicitly requested. */
  readonly sourceLoweringRequestFields?: readonly AppBuilderSourceLoweringRequestFieldRequirement[];
  /** Compact count/field-name summary for per-call source-lowering request fields. */
  readonly sourceLoweringRequestFieldSummary: AppBuilderSourceLoweringRequestFieldSummary;
  /** Effect contracts associated with affordances or patterns that can spend this target. */
  readonly effectContractIds: readonly AppBuilderEffectContractId[];
  /** Compact readiness counts when requested. */
  readonly inputReadiness?: AppBuilderTargetCatalogReadinessSummary;
  /** Full input dependency rows when requested explicitly. */
  readonly inputDependencies?: readonly AppBuilderInputReadinessDependencyRow[];
}

/** Read-only target catalog for app-builder ontology selections. */
export interface AppBuilderTargetCatalog {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selectable ontology rows after filters and optional readiness filtering. */
  readonly rows: readonly AppBuilderTargetCatalogRow[];
  /** Issues found while projecting supplied-input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether compact readiness counts were included. */
  readonly inputReadinessIncluded: boolean;
  /** Whether full dependency rows were included. */
  readonly inputDependenciesIncluded: boolean;
  /** Number of supplied input markers considered. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

/** Return selectable ontology target rows with honest status and optional readiness counts. */
export function appBuilderTargetCatalog(
  request: AppBuilderTargetCatalogRequest = {},
): AppBuilderTargetCatalog {
  const targetSelection = appBuilderNormalizeOntologyTargetSelection(request);
  const targetRefKeys = targetSelection.selectionProvided
    ? new Set(targetSelection.targetRefs.map(appBuilderOntologyRowRefKey))
    : null;
  const descriptors = APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.filter((descriptor) =>
    targetDescriptorMatches(descriptor, request, targetRefKeys)
  );
  const includeInputReadiness = request.includeInputReadiness !== false;
  const needsReadinessForFilter = request.readinessStates != null && request.readinessStates.length > 0;
  const inputDependenciesIncluded = request.includeInputDependencies === true;
  const sourceLoweringRequestFieldsIncluded = request.includeSourceLoweringRequestFields === true;
  const readiness = includeInputReadiness || inputDependenciesIncluded || needsReadinessForFilter
    ? appBuilderInputReadiness({
      targetRefs: descriptors.map((descriptor) => descriptor.ref),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByTargetKey = new Map<string, AppBuilderInputReadinessTargetRow>(
    readiness?.targets.map((target) => [appBuilderOntologyRowRefKey(target.targetRef), target]) ?? [],
  );
  const selectionIssues = targetSelection.issues.map(appBuilderInputReadinessIssueForTargetSelectionIssue);
  const readinessIssues = readiness?.issues ?? [];
  const issues = [...selectionIssues, ...readinessIssues];
  const unorderedRows = descriptors
    .filter((descriptor) => readinessFilterMatches(
      readinessByTargetKey.get(appBuilderOntologyRowRefKey(descriptor.ref)),
      request,
    ))
    .map((descriptor): AppBuilderTargetCatalogRow => {
      const readiness = readinessByTargetKey.get(appBuilderOntologyRowRefKey(descriptor.ref));
      const sourceLoweringRequestFields = appBuilderSourceLoweringRequestFieldsForTarget(descriptor.ref);
      const defaultingCandidate = appBuilderDefaultingCandidateForTarget(
        descriptor.ref,
        descriptor.status.recommendationStatus,
      );
      const defaultingCandidatePolicy = defaultingCandidate
        ? appBuilderDefaultingCandidatePolicyRow(descriptor.ref)
        : null;
      return {
        targetRef: descriptor.ref,
        title: descriptor.title,
        summary: descriptor.summary,
        status: descriptor.status,
        defaultingCandidate,
        ...(defaultingCandidatePolicy == null ? {} : { defaultingCandidatePolicy }),
        policySatisfactionRequired: appBuilderRequiresPolicySatisfaction(descriptor.status),
        sourceLoweringSurfaceKinds: appBuilderSourceLoweringSurfaceKindsForTarget(descriptor.ref),
        sourceLoweringRequestFieldSummary: appBuilderSourceLoweringRequestFieldSummary(sourceLoweringRequestFields, {
          includeRequestFieldNames: sourceLoweringRequestFieldsIncluded,
        }),
        effectContractIds: appBuilderEffectContractIdsForTargetRef(descriptor.ref),
        ...(sourceLoweringRequestFieldsIncluded ? { sourceLoweringRequestFields } : {}),
        ...(includeInputReadiness && readiness != null
          ? {
            inputReadiness: targetReadinessSummary(readiness),
          }
          : {}),
        ...(inputDependenciesIncluded && readiness != null
          ? { inputDependencies: readiness.inputDependencies }
          : {}),
      };
    });
  const rows = targetCatalogRowsInPresentationOrder(unorderedRows, request, targetSelection.targetRefs);
  const orderKind = targetCatalogPresentationOrderKind(request);
  const sourceLoweringRequestFieldCount = rows.reduce((sum, row) =>
    sum + row.sourceLoweringRequestFieldSummary.requestFieldCount, 0);
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    rows,
    issues,
    inputReadinessIncluded: includeInputReadiness,
    inputDependenciesIncluded,
    ...inputCounts,
    displayText: `App-builder target catalog: ${rows.length} target row(s), order=${orderKind}, inputReadiness=${includeInputReadiness}, dependencies=${inputDependenciesIncluded}, sourceLoweringRequestFieldRows=${sourceLoweringRequestFieldsIncluded}, sourceLoweringRequestFields=${sourceLoweringRequestFieldCount}, issues=${issues.length}${hasTargetCatalogFilters(request) ? '; filtered=true' : ''}.`,
  };
}

/** Return target-catalog rows in AI-facing menu order without mutating exact targetRef requests. */
function targetCatalogRowsInPresentationOrder(
  rows: readonly AppBuilderTargetCatalogRow[],
  request: AppBuilderTargetCatalogRequest,
  selectedTargetRefs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderTargetCatalogRow[] {
  if (targetCatalogPresentationOrderKind(request) === 'targetRefs') {
    const orderByTargetRefKey = new Map<string, number>();
    for (const [index, targetRef] of selectedTargetRefs.entries()) {
      const key = appBuilderOntologyRowRefKey(targetRef);
      if (!orderByTargetRefKey.has(key)) {
        orderByTargetRefKey.set(key, index);
      }
    }
    return [...rows].sort((left, right) =>
      (orderByTargetRefKey.get(appBuilderOntologyRowRefKey(left.targetRef)) ?? Number.MAX_SAFE_INTEGER)
      - (orderByTargetRefKey.get(appBuilderOntologyRowRefKey(right.targetRef)) ?? Number.MAX_SAFE_INTEGER)
    );
  }
  return [...rows].sort(compareTargetCatalogRows);
}

function targetCatalogPresentationOrderKind(
  request: AppBuilderTargetCatalogRequest,
): 'actionable-first' | 'targetRefs' {
  if (targetCatalogTargetSelectionProvided(request)) {
    return 'targetRefs';
  }
  return 'actionable-first';
}

function compareTargetCatalogRows(
  left: AppBuilderTargetCatalogRow,
  right: AppBuilderTargetCatalogRow,
): number {
  return targetCatalogActionabilityRank(left) - targetCatalogActionabilityRank(right) ||
    targetCatalogRecommendationRank(left) - targetCatalogRecommendationRank(right) ||
    targetCatalogRowKindRank(left.targetRef.kind) - targetCatalogRowKindRank(right.targetRef.kind) ||
    left.title.localeCompare(right.title) ||
    left.targetRef.id.localeCompare(right.targetRef.id);
}

function targetCatalogActionabilityRank(
  row: AppBuilderTargetCatalogRow,
): number {
  if (row.status.sourceLoweringImplemented) {
    return 0;
  }
  if (row.sourceLoweringSurfaceKinds.length > 0) {
    return 1;
  }
  if (appBuilderDefaultingCandidateForTarget(row.targetRef, row.status.recommendationStatus)) {
    return 2;
  }
  return 3;
}

function targetCatalogRecommendationRank(
  row: AppBuilderTargetCatalogRow,
): number {
  const recommendationRank = appBuilderRecommendationStatusRank(row.status.recommendationStatus);
  const defaultingCandidate = appBuilderDefaultingCandidateForTarget(row.targetRef, row.status.recommendationStatus);
  return recommendationRank * 2 + (defaultingCandidate ? 0 : 1);
}

function targetCatalogRowKindRank(
  kind: AppBuilderOntologyRowKind,
): number {
  return TARGET_CATALOG_ROW_KIND_RANKS[kind];
}

const TARGET_CATALOG_ROW_KIND_RANKS: Readonly<Record<AppBuilderOntologyRowKind, number>> = {
  [AppBuilderOntologyRowKind.ApplicationPattern]: 0,
  [AppBuilderOntologyRowKind.ControlPattern]: 1,
  [AppBuilderOntologyRowKind.Affordance]: 2,
  [AppBuilderOntologyRowKind.CollectionConcept]: 3,
  [AppBuilderOntologyRowKind.ControlManifest]: 4,
  [AppBuilderOntologyRowKind.StylingMechanism]: 5,
  [AppBuilderOntologyRowKind.VisualPolicy]: 6,
  [AppBuilderOntologyRowKind.ControlRealizationPolicy]: 7,
  [AppBuilderOntologyRowKind.PolicyAxis]: 8,
  [AppBuilderOntologyRowKind.InputContract]: 9,
  [AppBuilderOntologyRowKind.InputFacet]: 10,
  [AppBuilderOntologyRowKind.EffectContract]: 11,
};

function targetDescriptorMatches(
  descriptor: AppBuilderOntologyRowDescriptor,
  request: AppBuilderTargetCatalogRequest,
  targetRefKeys: ReadonlySet<string> | null,
): boolean {
  return (
    (targetRefKeys == null || targetRefKeys.has(appBuilderOntologyRowRefKey(descriptor.ref)))
    && (request.domains == null
      || request.domains.length === 0
      || request.domains.includes(descriptor.ref.domain))
    && (request.targetKinds == null
      || request.targetKinds.length === 0
      || request.targetKinds.includes(descriptor.ref.kind))
    && (request.recommendationStatuses == null
      || request.recommendationStatuses.length === 0
      || request.recommendationStatuses.includes(descriptor.status.recommendationStatus))
    && (request.reasonAuthorities == null
      || request.reasonAuthorities.length === 0
      || request.reasonAuthorities.includes(descriptor.status.reasonAuthority))
    && (request.sourceLoweringImplemented == null
      || descriptor.status.sourceLoweringImplemented === request.sourceLoweringImplemented)
    && (request.sourceLoweringSurfaceKinds == null
      || request.sourceLoweringSurfaceKinds.length === 0
      || request.sourceLoweringSurfaceKinds.some((surfaceKind) =>
        appBuilderSourceLoweringSurfaceKindsForTarget(descriptor.ref).includes(surfaceKind)
      ))
    && (request.defaultingCandidate == null
      || appBuilderDefaultingCandidateForTarget(
        descriptor.ref,
        descriptor.status.recommendationStatus,
      ) === request.defaultingCandidate)
    && (request.requiresExplicitInput == null || descriptor.status.requiresExplicitInput === request.requiresExplicitInput)
  );
}

function readinessFilterMatches(
  readiness: AppBuilderInputReadinessTargetRow | undefined,
  request: AppBuilderTargetCatalogRequest,
): boolean {
  if (request.readinessStates == null || request.readinessStates.length === 0) {
    return true;
  }
  return readiness?.inputDependencies.some((dependency) =>
    request.readinessStates?.includes(dependency.state) === true
  ) ?? false;
}

function targetReadinessSummary(
  readiness: AppBuilderInputReadinessTargetRow,
): AppBuilderTargetCatalogReadinessSummary {
  return {
    inputDependencyCount: readiness.inputDependencies.length,
    satisfiedCount: readiness.satisfiedCount,
    missingRequiredCount: readiness.missingRequiredCount,
    missingRecommendedCount: readiness.missingRecommendedCount,
    missingOptionalCount: readiness.inputDependencies.filter((row) =>
      row.state === AppBuilderInputReadinessState.MissingOptional
    ).length,
    deferredCount: readiness.deferredCount,
    rejectedInputCount: readiness.inputDependencies.reduce((sum, row) =>
      sum + row.rejectedInputs.length, 0),
  };
}

function hasTargetCatalogFilters(
  request: AppBuilderTargetCatalogRequest,
): boolean {
  return (request.targetRefs != null && request.targetRefs.length > 0)
    || (request.targetSelectors != null && request.targetSelectors.length > 0)
    || (request.domains != null && request.domains.length > 0)
    || (request.targetKinds != null && request.targetKinds.length > 0)
    || (request.recommendationStatuses != null && request.recommendationStatuses.length > 0)
    || (request.reasonAuthorities != null && request.reasonAuthorities.length > 0)
    || request.sourceLoweringImplemented != null
    || (request.sourceLoweringSurfaceKinds != null && request.sourceLoweringSurfaceKinds.length > 0)
    || request.defaultingCandidate != null
    || request.requiresExplicitInput != null
    || request.includeInputReadiness === false
    || request.includeInputDependencies === true
    || (request.readinessStates != null && request.readinessStates.length > 0);
}

function targetCatalogTargetSelectionProvided(
  request: AppBuilderTargetCatalogRequest,
): boolean {
  return (request.targetRefs != null && request.targetRefs.length > 0)
    || (request.targetSelectors != null && request.targetSelectors.length > 0);
}
