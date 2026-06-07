import {
  AppBuilderAffordanceId,
  type AppBuilderAffordanceRow,
} from './affordance.js';
import {
  type AppBuilderApplicationPatternRow,
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import {
  AppBuilderCollectionConceptId,
  type AppBuilderCollectionConceptRow,
} from './collection.js';
import {
  AppBuilderControlManifestRowId,
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
  type AppBuilderControlManifestRow,
  type AppBuilderControlPatternRow,
  type AppBuilderControlRealizationPolicyRow,
} from './control.js';
import { AppBuilderEffectContractId } from './effect.js';
import {
  type AppBuilderInputFacetId,
  appBuilderInputFacetIdsByContractId,
  type AppBuilderInputDependencyFacetOwner,
  type AppBuilderInputContractRow,
} from './input.js';
import {
  type AppBuilderPolicyAxisRow,
} from './policy.js';
import {
  AppBuilderStylingMechanismId,
  type AppBuilderStylingMechanismRow,
  AppBuilderVisualPolicyId,
  type AppBuilderVisualPolicyRow,
} from './style.js';
import { AppBuilderOntologyDomain } from './status.js';

/** Fine-grained ontology row family used for graph references inside a broad domain. */
export enum AppBuilderOntologyRowKind {
  /** Required or supplied app-builder input contract row. */
  InputContract = 'input-contract',
  /** Fine-grained input facet row owned by an input contract. */
  InputFacet = 'input-facet',
  /** App-builder policy axis row. */
  PolicyAxis = 'policy-axis',
  /** Effect or verification promise row. */
  EffectContract = 'effect-contract',
  /** App-building move row. */
  Affordance = 'affordance',
  /** Application design pattern row. */
  ApplicationPattern = 'application-pattern',
  /** Collection source/query/projection/table concept row. */
  CollectionConcept = 'collection-concept',
  /** Native-first or deferred rich control pattern row. */
  ControlPattern = 'control-pattern',
  /** Source realization policy for inline, wrapper, external, or existing controls. */
  ControlRealizationPolicy = 'control-realization-policy',
  /** Canonical control/component manifest scaffold row. */
  ControlManifest = 'control-manifest',
  /** Framework/tooling styling mechanism row. */
  StylingMechanism = 'styling-mechanism',
  /** Visual/style responsibility policy row. */
  VisualPolicy = 'visual-policy',
}

/** Stable value list for ontology row-kind transport schemas. */
export const APP_BUILDER_ONTOLOGY_ROW_KINDS = [
  AppBuilderOntologyRowKind.InputContract,
  AppBuilderOntologyRowKind.InputFacet,
  AppBuilderOntologyRowKind.PolicyAxis,
  AppBuilderOntologyRowKind.EffectContract,
  AppBuilderOntologyRowKind.Affordance,
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderOntologyRowKind.CollectionConcept,
  AppBuilderOntologyRowKind.ControlPattern,
  AppBuilderOntologyRowKind.ControlRealizationPolicy,
  AppBuilderOntologyRowKind.ControlManifest,
  AppBuilderOntologyRowKind.StylingMechanism,
  AppBuilderOntologyRowKind.VisualPolicy,
] as const;

/** Typed reference to one ontology row without assuming ids are globally unique. */
export interface AppBuilderOntologyRowRef {
  /** Fine-grained row family. */
  readonly kind: AppBuilderOntologyRowKind;
  /** Coarse ontology domain that owns this row family. */
  readonly domain: AppBuilderOntologyDomain;
  /** Row id inside the row family. */
  readonly id: string;
}

/** Relationship kind between two read-only app-builder ontology rows. */
export enum AppBuilderOntologyRelationKind {
  /** The source input contract contains the target input facet. */
  HasInputFacet = 'has-input-facet',
  /** The source row depends on the target input contract; necessity lives on the contract/readiness projection. */
  InputDependency = 'input-dependency',
  /** The source affordance promises the target effect contract when source lowering exists. */
  PromisesEffect = 'promises-effect',
  /** The source affordance can lead to the target affordance as a follow-up move. */
  FollowUpAffordance = 'follow-up-affordance',
  /** The source affordance coordinates or may spend the target application pattern. */
  UsesApplicationPattern = 'uses-application-pattern',
  /** The source application pattern commonly coordinates with the target application pattern. */
  CompanionApplicationPattern = 'companion-application-pattern',
  /** The source application pattern coordinates the target collection concept. */
  CoordinatesCollectionConcept = 'coordinates-collection-concept',
  /** The source application pattern coordinates the target control pattern. */
  CoordinatesControlPattern = 'coordinates-control-pattern',
  /** The source control pattern can be realized through the target control realization policy. */
  UsesControlRealizationPolicy = 'uses-control-realization-policy',
  /** The source application pattern coordinates the target control/component manifest row. */
  CoordinatesControlManifest = 'coordinates-control-manifest',
  /** The source application pattern coordinates the target styling mechanism. */
  CoordinatesStylingMechanism = 'coordinates-styling-mechanism',
  /** The source application pattern coordinates the target visual policy. */
  CoordinatesVisualPolicy = 'coordinates-visual-policy',
}

/** Stable value list for ontology relation-kind transport schemas. */
export const APP_BUILDER_ONTOLOGY_RELATION_KINDS = [
  AppBuilderOntologyRelationKind.HasInputFacet,
  AppBuilderOntologyRelationKind.InputDependency,
  AppBuilderOntologyRelationKind.PromisesEffect,
  AppBuilderOntologyRelationKind.FollowUpAffordance,
  AppBuilderOntologyRelationKind.UsesApplicationPattern,
  AppBuilderOntologyRelationKind.CompanionApplicationPattern,
  AppBuilderOntologyRelationKind.CoordinatesCollectionConcept,
  AppBuilderOntologyRelationKind.CoordinatesControlPattern,
  AppBuilderOntologyRelationKind.UsesControlRealizationPolicy,
  AppBuilderOntologyRelationKind.CoordinatesControlManifest,
  AppBuilderOntologyRelationKind.CoordinatesStylingMechanism,
  AppBuilderOntologyRelationKind.CoordinatesVisualPolicy,
] as const;

/** Read-only graph edge between app-builder ontology rows. */
export interface AppBuilderOntologyRelationRow {
  /** Ontology row that owns the relationship. */
  readonly from: AppBuilderOntologyRowRef;
  /** Relationship between the two rows. */
  readonly relationKind: AppBuilderOntologyRelationKind;
  /** Ontology row that is required, promised, or reachable. */
  readonly to: AppBuilderOntologyRowRef;
  /** Selected facets when an input dependency intentionally narrows a broad input contract. */
  readonly inputFacetIds?: readonly AppBuilderInputFacetId[];
}

/** Row sets that can currently publish ontology relations. */
export interface AppBuilderOntologyRelationSourceRows {
  readonly inputContracts: readonly AppBuilderInputContractRow[];
  readonly affordances: readonly AppBuilderAffordanceRow[];
  readonly policyAxes: readonly AppBuilderPolicyAxisRow[];
  readonly applicationPatterns: readonly AppBuilderApplicationPatternRow[];
  readonly collectionConcepts: readonly AppBuilderCollectionConceptRow[];
  readonly controlPatterns: readonly AppBuilderControlPatternRow[];
  readonly controlRealizationPolicies: readonly AppBuilderControlRealizationPolicyRow[];
  readonly controlManifests: readonly AppBuilderControlManifestRow[];
  readonly stylingMechanisms: readonly AppBuilderStylingMechanismRow[];
  readonly visualPolicies: readonly AppBuilderVisualPolicyRow[];
}

/** Build read-only graph edges for the ontology rows returned by a catalog query. */
export function appBuilderOntologyRelationRows(
  rows: AppBuilderOntologyRelationSourceRows,
): readonly AppBuilderOntologyRelationRow[] {
  return [
    ...rows.inputContracts.flatMap((row) => inputFacetRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputContract, row.id),
      row.facetIds,
    )),
    ...rows.policyAxes.flatMap((row) => inputDependencyRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.PolicyAxis, row.id),
      row,
    )),
    ...rows.affordances.flatMap((row) => [
      ...inputDependencyRelations(appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, row.id), row),
      ...promisedEffectRelations(appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, row.id), row.effectContractIds),
      ...followUpAffordanceRelations(appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, row.id), row.followUpIds),
      ...applicationPatternRelations(appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, row.id), row.applicationPatternIds),
    ]),
    ...rows.applicationPatterns.flatMap((row) => inputDependencyRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, row.id),
      row,
    )),
    ...rows.applicationPatterns.flatMap((row) => applicationPatternConceptRelations(row)),
    ...rows.collectionConcepts.flatMap((row) => inputDependencyRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.CollectionConcept, row.id),
      row,
    )),
    ...rows.controlPatterns.flatMap((row) => inputDependencyRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, row.id),
      row,
    )),
    ...rows.controlPatterns.flatMap((row) => controlRealizationPolicyRelations(row)),
    ...rows.controlRealizationPolicies.flatMap((row) => inputDependencyRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlRealizationPolicy, row.id),
      row,
    )),
    ...rows.controlManifests.flatMap((row) => inputDependencyRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlManifest, row.id),
      row,
    )),
    ...rows.visualPolicies.flatMap((row) => inputDependencyRelations(
      appBuilderOntologyRowRef(AppBuilderOntologyRowKind.VisualPolicy, row.id),
      row,
    )),
  ];
}

/** Build a stable ontology row ref for row-family-local ids. */
export function appBuilderOntologyRowRef(
  kind: AppBuilderOntologyRowKind,
  id: string,
): AppBuilderOntologyRowRef {
  return {
    kind,
    domain: appBuilderOntologyDomainForRowKind(kind),
    id,
  };
}

/** Resolve the coarse ontology domain for a fine-grained row kind. */
export function appBuilderOntologyDomainForRowKind(
  kind: AppBuilderOntologyRowKind,
): AppBuilderOntologyDomain {
  switch (kind) {
    case AppBuilderOntologyRowKind.InputContract:
    case AppBuilderOntologyRowKind.InputFacet:
      return AppBuilderOntologyDomain.Input;
    case AppBuilderOntologyRowKind.PolicyAxis:
      return AppBuilderOntologyDomain.Policy;
    case AppBuilderOntologyRowKind.EffectContract:
      return AppBuilderOntologyDomain.Effect;
    case AppBuilderOntologyRowKind.Affordance:
      return AppBuilderOntologyDomain.Affordance;
    case AppBuilderOntologyRowKind.ApplicationPattern:
      return AppBuilderOntologyDomain.ApplicationPattern;
    case AppBuilderOntologyRowKind.CollectionConcept:
      return AppBuilderOntologyDomain.Collection;
    case AppBuilderOntologyRowKind.ControlPattern:
    case AppBuilderOntologyRowKind.ControlRealizationPolicy:
    case AppBuilderOntologyRowKind.ControlManifest:
      return AppBuilderOntologyDomain.Control;
    case AppBuilderOntologyRowKind.StylingMechanism:
    case AppBuilderOntologyRowKind.VisualPolicy:
      return AppBuilderOntologyDomain.Style;
  }
}

function inputDependencyRelations(
  from: AppBuilderOntologyRowRef,
  row: AppBuilderInputDependencyFacetOwner,
): readonly AppBuilderOntologyRelationRow[] {
  const facetIdsByContract = appBuilderInputFacetIdsByContractId(row.inputFacetSelections);
  return row.inputContractIds.map((id) => {
    const inputFacetIds = facetIdsByContract?.get(id);
    return {
      from,
      relationKind: AppBuilderOntologyRelationKind.InputDependency,
      to: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputContract, id),
      ...(inputFacetIds == null ? {} : { inputFacetIds }),
    };
  });
}

function inputFacetRelations(
  from: AppBuilderOntologyRowRef,
  facetIds: readonly AppBuilderInputFacetId[],
): readonly AppBuilderOntologyRelationRow[] {
  return facetIds.map((id) => ({
    from,
    relationKind: AppBuilderOntologyRelationKind.HasInputFacet,
    to: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, id),
  }));
}

function promisedEffectRelations(
  from: AppBuilderOntologyRowRef,
  effectIds: readonly AppBuilderEffectContractId[],
): readonly AppBuilderOntologyRelationRow[] {
  return effectIds.map((id) => ({
    from,
    relationKind: AppBuilderOntologyRelationKind.PromisesEffect,
    to: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.EffectContract, id),
  }));
}

function followUpAffordanceRelations(
  from: AppBuilderOntologyRowRef,
  affordanceIds: readonly AppBuilderAffordanceId[],
): readonly AppBuilderOntologyRelationRow[] {
  return affordanceIds.map((id) => ({
    from,
    relationKind: AppBuilderOntologyRelationKind.FollowUpAffordance,
    to: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, id),
  }));
}

function applicationPatternRelations(
  from: AppBuilderOntologyRowRef,
  applicationPatternIds: readonly AppBuilderApplicationPatternId[],
): readonly AppBuilderOntologyRelationRow[] {
  return applicationPatternIds.map((id) => ({
    from,
    relationKind: AppBuilderOntologyRelationKind.UsesApplicationPattern,
    to: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, id),
  }));
}

function applicationPatternConceptRelations(
  row: AppBuilderApplicationPatternRow,
): readonly AppBuilderOntologyRelationRow[] {
  const from = appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, row.id);
  return [
    ...(row.companionPatternIds ?? []).map((id) => conceptRelation(
      from,
      AppBuilderOntologyRelationKind.CompanionApplicationPattern,
      AppBuilderOntologyRowKind.ApplicationPattern,
      id,
    )),
    ...row.collectionConceptIds.map((id) => conceptRelation(
      from,
      AppBuilderOntologyRelationKind.CoordinatesCollectionConcept,
      AppBuilderOntologyRowKind.CollectionConcept,
      id,
    )),
    ...row.controlPatternIds.map((id) => conceptRelation(
      from,
      AppBuilderOntologyRelationKind.CoordinatesControlPattern,
      AppBuilderOntologyRowKind.ControlPattern,
      id,
    )),
    ...row.controlManifestIds.map((id) => conceptRelation(
      from,
      AppBuilderOntologyRelationKind.CoordinatesControlManifest,
      AppBuilderOntologyRowKind.ControlManifest,
      id,
    )),
    ...row.stylingMechanismIds.map((id) => conceptRelation(
      from,
      AppBuilderOntologyRelationKind.CoordinatesStylingMechanism,
      AppBuilderOntologyRowKind.StylingMechanism,
      id,
    )),
    ...row.visualPolicyIds.map((id) => conceptRelation(
      from,
      AppBuilderOntologyRelationKind.CoordinatesVisualPolicy,
      AppBuilderOntologyRowKind.VisualPolicy,
      id,
    )),
  ];
}

function controlRealizationPolicyRelations(
  row: AppBuilderControlPatternRow,
): readonly AppBuilderOntologyRelationRow[] {
  const from = appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, row.id);
  return row.realizationPolicyIds.map((id) => conceptRelation(
    from,
    AppBuilderOntologyRelationKind.UsesControlRealizationPolicy,
    AppBuilderOntologyRowKind.ControlRealizationPolicy,
    id,
  ));
}

function conceptRelation(
  from: AppBuilderOntologyRowRef,
  relationKind: AppBuilderOntologyRelationKind,
  toKind: AppBuilderOntologyRowKind,
  id:
    | AppBuilderApplicationPatternId
    | AppBuilderCollectionConceptId
    | AppBuilderControlPatternId
    | AppBuilderControlRealizationPolicyId
    | AppBuilderControlManifestRowId
    | AppBuilderStylingMechanismId
    | AppBuilderVisualPolicyId,
): AppBuilderOntologyRelationRow {
  return {
    from,
    relationKind,
    to: appBuilderOntologyRowRef(toKind, id),
  };
}
