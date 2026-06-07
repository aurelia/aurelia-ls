import { APP_BUILDER_AFFORDANCE_ROWS } from './affordance.js';
import { APP_BUILDER_APPLICATION_PATTERN_ROWS } from './application-pattern.js';
import { APP_BUILDER_COLLECTION_CONCEPT_ROWS } from './collection.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_ROWS,
  APP_BUILDER_CONTROL_PATTERN_ROWS,
  APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS,
} from './control.js';
import {
  AppBuilderInputFacetId,
  type AppBuilderInputFacetRow,
} from './input.js';
import { APP_BUILDER_POLICY_AXIS_ROWS } from './policy.js';
import {
  AppBuilderOntologyRelationKind,
  appBuilderOntologyRelationRows,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  appBuilderOntologyRowDescriptor,
  appBuilderOntologyRowRefKey,
} from './row-descriptor.js';
import {
  appBuilderSourceLoweringSurfaceKindsForTarget,
  type AppBuilderSourceLoweringSurfaceKind,
} from './source-lowering-surface.js';
import {
  APP_BUILDER_STYLING_MECHANISM_ROWS,
  APP_BUILDER_VISUAL_POLICY_ROWS,
} from './style.js';

/** How precisely a source-lowerable target declares dependence on an input facet. */
export enum AppBuilderInputFacetSourceLoweringConsumerKind {
  /** The target's input dependency explicitly names this facet. */
  ExplicitFacetDependency = 'explicit-facet-dependency',
  /** The target depends on the whole input contract without facet-level narrowing. */
  BroadContractDependency = 'broad-contract-dependency',
}

/** Stable value list for input-facet source-lowering consumer dependency kinds. */
export const APP_BUILDER_INPUT_FACET_SOURCE_LOWERING_CONSUMER_KINDS = [
  AppBuilderInputFacetSourceLoweringConsumerKind.ExplicitFacetDependency,
  AppBuilderInputFacetSourceLoweringConsumerKind.BroadContractDependency,
] as const;

/** Source-lowerable ontology target that consumes an input facet as caller/app fact payload. */
export interface AppBuilderInputFacetSourceLoweringConsumerRow {
  /** Source-lowerable ontology target that consumes the facet. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Human-readable title for the source-lowerable target. */
  readonly targetTitle: string;
  /** Registered source-lowering surfaces that can spend the target. */
  readonly sourceLoweringSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[];
  /** Whether the target names the facet directly or depends on the whole contract. */
  readonly consumerKind: AppBuilderInputFacetSourceLoweringConsumerKind;
  /** Compact explanation of the consumer relationship. */
  readonly summary: string;
}

interface InputFacetSourceLoweringConsumerCandidate {
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly inputContractId: string;
  readonly inputFacetIds?: readonly AppBuilderInputFacetId[];
}

const SOURCE_LOWERING_INPUT_DEPENDENCY_CANDIDATES: readonly InputFacetSourceLoweringConsumerCandidate[] =
  appBuilderOntologyRelationRows({
    inputContracts: [],
    affordances: APP_BUILDER_AFFORDANCE_ROWS,
    policyAxes: APP_BUILDER_POLICY_AXIS_ROWS,
    applicationPatterns: APP_BUILDER_APPLICATION_PATTERN_ROWS,
    collectionConcepts: APP_BUILDER_COLLECTION_CONCEPT_ROWS,
    controlPatterns: APP_BUILDER_CONTROL_PATTERN_ROWS,
    controlRealizationPolicies: APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS,
    controlManifests: APP_BUILDER_CONTROL_MANIFEST_ROWS,
    stylingMechanisms: APP_BUILDER_STYLING_MECHANISM_ROWS,
    visualPolicies: APP_BUILDER_VISUAL_POLICY_ROWS,
  })
    .filter((row) => row.relationKind === AppBuilderOntologyRelationKind.InputDependency)
    .filter((row) => appBuilderSourceLoweringSurfaceKindsForTarget(row.from).length > 0)
    .map((row) => ({
      targetRef: row.from,
      inputContractId: row.to.id,
      ...(row.inputFacetIds == null ? {} : { inputFacetIds: row.inputFacetIds }),
    }));

/** Return source-lowerable target rows that currently consume a fine-grained input facet. */
export function appBuilderSourceLoweringConsumersForInputFacet(
  facet: AppBuilderInputFacetRow,
): readonly AppBuilderInputFacetSourceLoweringConsumerRow[] {
  const consumerKindsByTarget = new Map<string, AppBuilderInputFacetSourceLoweringConsumerKind>();
  for (const candidate of SOURCE_LOWERING_INPUT_DEPENDENCY_CANDIDATES) {
    if (candidate.inputContractId !== facet.contractId) {
      continue;
    }
    const consumerKind = sourceLoweringConsumerKindForCandidate(candidate, facet.id);
    if (consumerKind == null) {
      continue;
    }
    const key = appBuilderOntologyRowRefKey(candidate.targetRef);
    const existing = consumerKindsByTarget.get(key);
    if (existing === AppBuilderInputFacetSourceLoweringConsumerKind.ExplicitFacetDependency) {
      continue;
    }
    consumerKindsByTarget.set(key, consumerKind);
  }
  return [...consumerKindsByTarget.entries()]
    .map(([targetKey, consumerKind]) => {
      const targetRef = SOURCE_LOWERING_INPUT_DEPENDENCY_CANDIDATES.find((candidate) =>
        appBuilderOntologyRowRefKey(candidate.targetRef) === targetKey
      )!.targetRef;
      const descriptor = appBuilderOntologyRowDescriptor(targetRef);
      return {
        targetRef,
        targetTitle: descriptor?.title ?? `${targetRef.kind}:${targetRef.id}`,
        sourceLoweringSurfaceKinds: appBuilderSourceLoweringSurfaceKindsForTarget(targetRef),
        consumerKind,
        summary: sourceLoweringConsumerSummary(facet, targetRef, consumerKind),
      };
    })
    .sort(compareSourceLoweringConsumerRows);
}

function sourceLoweringConsumerKindForCandidate(
  candidate: InputFacetSourceLoweringConsumerCandidate,
  facetId: AppBuilderInputFacetId,
): AppBuilderInputFacetSourceLoweringConsumerKind | null {
  if (candidate.inputFacetIds == null || candidate.inputFacetIds.length === 0) {
    return AppBuilderInputFacetSourceLoweringConsumerKind.BroadContractDependency;
  }
  return candidate.inputFacetIds.includes(facetId)
    ? AppBuilderInputFacetSourceLoweringConsumerKind.ExplicitFacetDependency
    : null;
}

function sourceLoweringConsumerSummary(
  facet: AppBuilderInputFacetRow,
  targetRef: AppBuilderOntologyRowRef,
  consumerKind: AppBuilderInputFacetSourceLoweringConsumerKind,
): string {
  switch (consumerKind) {
    case AppBuilderInputFacetSourceLoweringConsumerKind.ExplicitFacetDependency:
      return `Source-lowerable target '${targetRef.kind}:${targetRef.id}' explicitly names input facet '${facet.id}'.`;
    case AppBuilderInputFacetSourceLoweringConsumerKind.BroadContractDependency:
      return `Source-lowerable target '${targetRef.kind}:${targetRef.id}' depends on input contract '${facet.contractId}' without facet narrowing; treat this as broad contract pressure, not proof that every facet is spent.`;
  }
}

function compareSourceLoweringConsumerRows(
  left: AppBuilderInputFacetSourceLoweringConsumerRow,
  right: AppBuilderInputFacetSourceLoweringConsumerRow,
): number {
  return sourceLoweringConsumerKindRank(left.consumerKind) - sourceLoweringConsumerKindRank(right.consumerKind)
    || left.targetRef.kind.localeCompare(right.targetRef.kind)
    || left.targetRef.id.localeCompare(right.targetRef.id);
}

function sourceLoweringConsumerKindRank(
  kind: AppBuilderInputFacetSourceLoweringConsumerKind,
): number {
  switch (kind) {
    case AppBuilderInputFacetSourceLoweringConsumerKind.ExplicitFacetDependency:
      return 0;
    case AppBuilderInputFacetSourceLoweringConsumerKind.BroadContractDependency:
      return 1;
  }
}
