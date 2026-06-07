import {
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  AppBuilderSuppliedInputSource,
  appBuilderUniqueInputFacetIds,
} from '../ontology/input.js';
import type {
  AppBuilderSuppliedInput,
  AppBuilderSuppliedInputFacetPayload,
} from '../ontology/input-readiness.js';
import type {
  AppBuilderOntologyRowRef,
} from '../ontology/relation.js';

/** Provenance for a request-local decision bundle before it expands into supplied inputs. */
export enum AppBuilderDecisionBundleSource {
  /** The caller or AI explicitly grouped these decisions for this inquiry. */
  ExplicitCallerSelection = 'explicit-caller-selection',
  /** Operator-reviewed app-builder policy supplied these decisions as defaults. */
  OperatorReviewedDefault = 'operator-reviewed-default',
  /** Aurelia or web platform semantics supply this decision as a deterministic default. */
  FrameworkDefault = 'framework-default',
}

/** Stable value list for decision-bundle source transport schemas. */
export const APP_BUILDER_DECISION_BUNDLE_SOURCES = [
  AppBuilderDecisionBundleSource.ExplicitCallerSelection,
  AppBuilderDecisionBundleSource.OperatorReviewedDefault,
  AppBuilderDecisionBundleSource.FrameworkDefault,
] as const;

/** One explicit decision that can satisfy an input contract or selected input facets. */
export interface AppBuilderDecisionBundleDecision {
  /** Input contract this decision satisfies. */
  readonly inputContractId: AppBuilderInputContractId | `${AppBuilderInputContractId}`;
  /** Specific facets satisfied by this decision; omitted means the whole input contract. */
  readonly inputFacetIds?: readonly (AppBuilderInputFacetId | `${AppBuilderInputFacetId}`)[] | null;
  /** Concrete facet payloads carried by this decision. */
  readonly facetPayloads?: readonly AppBuilderSuppliedInputFacetPayload[] | null;
  /** Target rows this decision was made for, when it is not globally applicable. */
  readonly targetRefs?: readonly AppBuilderOntologyRowRef[] | null;
  /** Optional review label for this decision. */
  readonly label?: string;
  /** Optional compact explanation of the decision. */
  readonly summary?: string;
}

/** Request-local bundle of explicit app-builder decisions, not a named profile. */
export interface AppBuilderDecisionBundle {
  /** Optional request-local id; this is not a stable named profile id. */
  readonly bundleId?: string | null;
  /** Provenance for the grouped decisions. */
  readonly sourceId: AppBuilderDecisionBundleSource | `${AppBuilderDecisionBundleSource}`;
  /** Decisions carried by this bundle. */
  readonly decisions: readonly AppBuilderDecisionBundleDecision[];
  /** Optional review label for this bundle. */
  readonly label?: string;
  /** Optional compact explanation of the bundle. */
  readonly summary?: string;
}

/** Expansion row showing how one decision bundle contributed a supplied input marker. */
export interface AppBuilderDecisionBundleExpansionRow {
  /** Zero-based bundle position in the request. */
  readonly bundleIndex: number;
  /** Optional request-local bundle id. */
  readonly bundleId?: string | null;
  /** Bundle provenance before supplied-input expansion. */
  readonly bundleSourceId: AppBuilderDecisionBundleSource | `${AppBuilderDecisionBundleSource}`;
  /** Zero-based decision position inside the bundle. */
  readonly decisionIndex: number;
  /** Input contract this decision supplies after expansion. */
  readonly inputContractId: AppBuilderInputContractId | `${AppBuilderInputContractId}`;
  /** Facets this decision supplies after expansion. */
  readonly inputFacetIds: readonly (AppBuilderInputFacetId | `${AppBuilderInputFacetId}`)[];
  /** Number of concrete facet payloads carried by this decision. */
  readonly facetPayloadCount: number;
  /** Target rows this decision was declared for. */
  readonly targetRefs: readonly AppBuilderOntologyRowRef[];
  /** Supplied-input source used by input-readiness after expansion. */
  readonly suppliedInputSourceId: AppBuilderSuppliedInputSource | `${AppBuilderSuppliedInputSource}`;
  /** Supplied input marker produced by this decision. */
  readonly suppliedInput: AppBuilderSuppliedInput;
  /** Compact explanation suitable for preflight/readiness answers. */
  readonly summary: string;
}

/** Compact counts for request-local decisions after supplied-input expansion. */
export interface AppBuilderDecisionBundleInputCounts {
  /** Number of supplied input markers considered after decision-bundle expansion. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

/** Expand request-local decision bundles into supplied-input markers with explicit provenance. */
export function appBuilderDecisionBundleExpansionRows(
  decisionBundles: readonly AppBuilderDecisionBundle[] | null | undefined,
): readonly AppBuilderDecisionBundleExpansionRow[] {
  return (decisionBundles ?? []).flatMap((bundle, bundleIndex) =>
    bundle.decisions.map((decision, decisionIndex): AppBuilderDecisionBundleExpansionRow => {
      const suppliedInputSourceId = appBuilderSuppliedInputSourceForDecisionBundleSource(bundle.sourceId);
      const inputFacetIds = appBuilderUniqueInputFacetIds((decision.inputFacetIds ?? []) as readonly AppBuilderInputFacetId[]);
      const targetRefs = decision.targetRefs ?? [];
      const summary = decisionBundleExpansionSummary(bundle, bundleIndex, decision);
      const suppliedInput: AppBuilderSuppliedInput = {
        inputContractId: decision.inputContractId,
        sourceId: suppliedInputSourceId,
        ...(inputFacetIds.length === 0 ? {} : { inputFacetIds }),
        ...(targetRefs.length === 0 ? {} : { targetRefs }),
        ...(decision.facetPayloads == null ? {} : { facetPayloads: decision.facetPayloads }),
        label: decision.label ?? bundle.label ?? decisionBundleFallbackLabel(bundle, bundleIndex),
        summary: decision.summary ?? bundle.summary ?? summary,
      };
      return {
        bundleIndex,
        bundleId: bundle.bundleId,
        bundleSourceId: bundle.sourceId,
        decisionIndex,
        inputContractId: decision.inputContractId,
        inputFacetIds,
        facetPayloadCount: decision.facetPayloads?.length ?? 0,
        targetRefs,
        suppliedInputSourceId,
        suppliedInput,
        summary,
      };
    })
  );
}

/** Combine explicit supplied-input markers with decision-bundle expansions. */
export function appBuilderSuppliedInputsWithDecisionBundles(
  suppliedInputs: readonly AppBuilderSuppliedInput[] | null | undefined,
  decisionBundles: readonly AppBuilderDecisionBundle[] | null | undefined,
): readonly AppBuilderSuppliedInput[] {
  return [
    ...(suppliedInputs ?? []),
    ...appBuilderDecisionBundleExpansionRows(decisionBundles).map((row) => row.suppliedInput),
  ];
}

/** Return supplied input markers whose target scope includes the selected ontology row. */
export function appBuilderSuppliedInputsForTarget(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  targetRef: AppBuilderOntologyRowRef,
): readonly AppBuilderSuppliedInput[] {
  return suppliedInputs.filter((input) => appBuilderSuppliedInputAppliesToTarget(input, targetRef));
}

/** Expand decision bundles and keep only supplied inputs that apply to the selected ontology row. */
export function appBuilderSuppliedInputsWithDecisionBundlesForTarget(
  suppliedInputs: readonly AppBuilderSuppliedInput[] | null | undefined,
  decisionBundles: readonly AppBuilderDecisionBundle[] | null | undefined,
  targetRef: AppBuilderOntologyRowRef,
): readonly AppBuilderSuppliedInput[] {
  return appBuilderSuppliedInputsForTarget(
    appBuilderSuppliedInputsWithDecisionBundles(suppliedInputs, decisionBundles),
    targetRef,
  );
}

/** Count the decisions inside request-local decision bundles. */
export function appBuilderDecisionBundleDecisionCount(
  decisionBundles: readonly AppBuilderDecisionBundle[] | null | undefined,
): number {
  return (decisionBundles ?? []).reduce((sum, bundle) => sum + bundle.decisions.length, 0);
}

/** Count explicit supplied inputs plus request-local decision-bundle expansions. */
export function appBuilderDecisionBundleInputCounts(
  suppliedInputs: readonly AppBuilderSuppliedInput[] | null | undefined,
  decisionBundles: readonly AppBuilderDecisionBundle[] | null | undefined,
): AppBuilderDecisionBundleInputCounts {
  const explicitSuppliedInputCount = suppliedInputs?.length ?? 0;
  const decisionBundleCount = decisionBundles?.length ?? 0;
  const decisionBundleDecisionCount = appBuilderDecisionBundleDecisionCount(decisionBundles);
  return {
    suppliedInputCount: explicitSuppliedInputCount + decisionBundleDecisionCount,
    explicitSuppliedInputCount,
    decisionBundleCount,
    decisionBundleDecisionCount,
  };
}

/** Map a decision-bundle source to the supplied-input source seen by readiness. */
export function appBuilderSuppliedInputSourceForDecisionBundleSource(
  sourceId: AppBuilderDecisionBundleSource | `${AppBuilderDecisionBundleSource}`,
): AppBuilderSuppliedInputSource {
  switch (sourceId) {
    case AppBuilderDecisionBundleSource.ExplicitCallerSelection:
      return AppBuilderSuppliedInputSource.ExplicitCallerInput;
    case AppBuilderDecisionBundleSource.OperatorReviewedDefault:
    case AppBuilderDecisionBundleSource.FrameworkDefault:
      return AppBuilderSuppliedInputSource.DecisionBundle;
  }
  return AppBuilderSuppliedInputSource.DecisionBundle;
}

function decisionBundleFallbackLabel(
  bundle: AppBuilderDecisionBundle,
  bundleIndex: number,
): string {
  return bundle.bundleId == null || bundle.bundleId.length === 0
    ? `decision-bundle-${bundleIndex + 1}`
    : bundle.bundleId;
}

function decisionBundleExpansionSummary(
  bundle: AppBuilderDecisionBundle,
  bundleIndex: number,
  decision: AppBuilderDecisionBundleDecision,
): string {
  const facetText = decision.inputFacetIds == null || decision.inputFacetIds.length === 0
    ? 'whole contract'
    : `facets ${decision.inputFacetIds.join(', ')}`;
  const targetText = decision.targetRefs == null || decision.targetRefs.length === 0
    ? 'target-global'
    : `target-scoped to ${decision.targetRefs.map(decisionBundleTargetText).join(', ')}`;
  return `Decision bundle '${decisionBundleFallbackLabel(bundle, bundleIndex)}' supplies '${decision.inputContractId}' ${facetText} from '${bundle.sourceId}' (${targetText}).`;
}

function appBuilderSuppliedInputAppliesToTarget(
  suppliedInput: AppBuilderSuppliedInput,
  targetRef: AppBuilderOntologyRowRef,
): boolean {
  const targetRefs = suppliedInput.targetRefs ?? [];
  return targetRefs.length === 0 || targetRefs.some((candidate) => sameOntologyRowRef(candidate, targetRef));
}

function sameOntologyRowRef(
  left: AppBuilderOntologyRowRef,
  right: AppBuilderOntologyRowRef,
): boolean {
  return left.kind === right.kind
    && left.domain === right.domain
    && left.id === right.id;
}

function decisionBundleTargetText(
  targetRef: AppBuilderOntologyRowRef,
): string {
  return `${targetRef.kind}:${targetRef.id}`;
}
