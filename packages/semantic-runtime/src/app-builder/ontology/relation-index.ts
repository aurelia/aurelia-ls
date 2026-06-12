import {
  APP_BUILDER_AFFORDANCE_ROWS,
} from './affordance.js';
import {
  APP_BUILDER_APPLICATION_PATTERN_ROWS,
} from './application-pattern.js';
import {
  APP_BUILDER_COLLECTION_CONCEPT_ROWS,
} from './collection.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_ROWS,
  APP_BUILDER_CONTROL_PATTERN_ROWS,
  APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS,
} from './control.js';
import {
  APP_BUILDER_INPUT_CONTRACT_ROWS,
} from './input.js';
import {
  APP_BUILDER_POLICY_AXIS_ROWS,
} from './policy.js';
import {
  appBuilderOntologyRelationRows,
  type AppBuilderOntologyRelationKind,
  type AppBuilderOntologyRowRef,
  type AppBuilderOntologyRelationRow,
} from './relation.js';
import {
  appBuilderOntologyRowRefKey,
} from './row-descriptor.js';
import {
  APP_BUILDER_STYLING_MECHANISM_ROWS,
  APP_BUILDER_VISUAL_POLICY_ROWS,
} from './style.js';

/** Full app-builder ontology relation graph for projections that need cross-domain joins. */
export const APP_BUILDER_ONTOLOGY_RELATION_ROWS: readonly AppBuilderOntologyRelationRow[] = appBuilderOntologyRelationRows({
  inputContracts: APP_BUILDER_INPUT_CONTRACT_ROWS,
  affordances: APP_BUILDER_AFFORDANCE_ROWS,
  policyAxes: APP_BUILDER_POLICY_AXIS_ROWS,
  applicationPatterns: APP_BUILDER_APPLICATION_PATTERN_ROWS,
  collectionConcepts: APP_BUILDER_COLLECTION_CONCEPT_ROWS,
  controlPatterns: APP_BUILDER_CONTROL_PATTERN_ROWS,
  controlRealizationPolicies: APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS,
  controlManifests: APP_BUILDER_CONTROL_MANIFEST_ROWS,
  stylingMechanisms: APP_BUILDER_STYLING_MECHANISM_ROWS,
  visualPolicies: APP_BUILDER_VISUAL_POLICY_ROWS,
});

const ONTOLOGY_RELATION_ROWS_BY_FROM_KEY = groupRelationRowsByEndpoint('from');
const ONTOLOGY_RELATION_ROWS_BY_TO_KEY = groupRelationRowsByEndpoint('to');

/** Read full-graph relation rows leaving one ontology row. */
export function appBuilderOntologyRelationsFrom(
  ref: AppBuilderOntologyRowRef,
  relationKinds: readonly AppBuilderOntologyRelationKind[] | null = null,
): readonly AppBuilderOntologyRelationRow[] {
  return filterRelationKinds(ONTOLOGY_RELATION_ROWS_BY_FROM_KEY.get(appBuilderOntologyRowRefKey(ref)) ?? [], relationKinds);
}

/** Read full-graph relation rows entering one ontology row. */
export function appBuilderOntologyRelationsTo(
  ref: AppBuilderOntologyRowRef,
  relationKinds: readonly AppBuilderOntologyRelationKind[] | null = null,
): readonly AppBuilderOntologyRelationRow[] {
  return filterRelationKinds(ONTOLOGY_RELATION_ROWS_BY_TO_KEY.get(appBuilderOntologyRowRefKey(ref)) ?? [], relationKinds);
}

function groupRelationRowsByEndpoint(
  endpoint: 'from' | 'to',
): ReadonlyMap<string, readonly AppBuilderOntologyRelationRow[]> {
  const grouped = new Map<string, AppBuilderOntologyRelationRow[]>();
  for (const relation of APP_BUILDER_ONTOLOGY_RELATION_ROWS) {
    const key = appBuilderOntologyRowRefKey(relation[endpoint]);
    grouped.set(key, [...(grouped.get(key) ?? []), relation]);
  }
  return grouped;
}

function filterRelationKinds(
  rows: readonly AppBuilderOntologyRelationRow[],
  relationKinds: readonly AppBuilderOntologyRelationKind[] | null,
): readonly AppBuilderOntologyRelationRow[] {
  if (relationKinds == null || relationKinds.length === 0) {
    return rows;
  }
  return rows.filter((row) => relationKinds.includes(row.relationKind));
}
