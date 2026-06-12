import {
  APP_BUILDER_AFFORDANCE_ROWS,
  type AppBuilderAffordanceRow,
} from './affordance.js';
import {
  APP_BUILDER_APPLICATION_PATTERN_ROWS,
  type AppBuilderApplicationPatternRow,
} from './application-pattern.js';
import {
  APP_BUILDER_COLLECTION_FEATURE_ROWS,
  APP_BUILDER_COLLECTION_CONCEPT_ROWS,
  type AppBuilderCollectionFeatureRow,
  type AppBuilderCollectionConceptRow,
} from './collection.js';
import {
  APP_BUILDER_CONTROLS,
  type AppBuilderControlDescriptor,
} from '../control-catalog.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_ROWS,
  APP_BUILDER_CONTROL_PATTERN_ROWS,
  APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS,
  type AppBuilderControlManifestRow,
  type AppBuilderControlPatternRow,
  type AppBuilderControlRealizationPolicyRow,
} from './control.js';
import {
  APP_BUILDER_EFFECT_CONTRACT_ROWS,
  type AppBuilderEffectContractRow,
} from './effect.js';
import {
  appBuilderDirectControlManifestIdsForEffectContract,
  appBuilderEffectContractIdsForTargetRef,
} from './effect-target.js';
import {
  appBuilderSelectRows,
  appBuilderUniqueIds,
} from './detail-helpers.js';
import {
  APP_BUILDER_STYLING_MECHANISM_ROWS,
  APP_BUILDER_VISUAL_POLICY_ROWS,
  type AppBuilderStylingMechanismRow,
  type AppBuilderVisualPolicyRow,
} from './style.js';
import {
  AppBuilderOntologyRelationKind,
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  appBuilderOntologyRelationsFrom,
  appBuilderOntologyRelationsTo,
} from './relation-index.js';

const COLLECTION_CONCEPTS_BY_ID = new Map(
  APP_BUILDER_COLLECTION_CONCEPT_ROWS.map((row) => [row.id, row]),
);

const COLLECTION_FEATURES_BY_ID = new Map(
  APP_BUILDER_COLLECTION_FEATURE_ROWS.map((row) => [row.id, row]),
);

const APPLICATION_PATTERNS_BY_ID = new Map(
  APP_BUILDER_APPLICATION_PATTERN_ROWS.map((row) => [row.id, row]),
);

const CONTROL_PATTERNS_BY_ID = new Map(
  APP_BUILDER_CONTROL_PATTERN_ROWS.map((row) => [row.id, row]),
);

const CONTROL_MANIFESTS_BY_ID = new Map(
  APP_BUILDER_CONTROL_MANIFEST_ROWS.map((row) => [row.id, row]),
);

const EFFECT_CONTRACTS_BY_ID = new Map(
  APP_BUILDER_EFFECT_CONTRACT_ROWS.map((row) => [row.id, row]),
);

const CONTROL_DESCRIPTORS_BY_ID = new Map(
  APP_BUILDER_CONTROLS.map((row) => [row.id, row]),
);

const CONTROL_REALIZATION_POLICIES_BY_ID = new Map(
  APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS.map((row) => [row.id, row]),
);

const STYLING_MECHANISMS_BY_ID = new Map(
  APP_BUILDER_STYLING_MECHANISM_ROWS.map((row) => [row.id, row]),
);

const VISUAL_POLICIES_BY_ID = new Map(
  APP_BUILDER_VISUAL_POLICY_ROWS.map((row) => [row.id, row]),
);

const AFFORDANCES_BY_ID = new Map(
  APP_BUILDER_AFFORDANCE_ROWS.map((row) => [row.id, row]),
);

/** Read effect contracts promised by selected affordances. */
export function appBuilderEffectContractsForAffordances(
  affordances: readonly AppBuilderAffordanceRow[],
): readonly AppBuilderEffectContractRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      affordances,
      AppBuilderOntologyRowKind.Affordance,
      AppBuilderOntologyRowKind.EffectContract,
      AppBuilderOntologyRelationKind.PromisesEffect,
    ),
    EFFECT_CONTRACTS_BY_ID,
  );
}

/** Read effect contracts associated with selected ontology targets through the shared effect-target graph. */
export function appBuilderEffectContractsForTargetRefs(
  refs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderEffectContractRow[] {
  return appBuilderSelectRows(
    appBuilderUniqueIds(refs.flatMap(appBuilderEffectContractIdsForTargetRef)),
    EFFECT_CONTRACTS_BY_ID,
  );
}

/** Read effect contracts for which selected control manifests are direct witness rows. */
export function appBuilderDirectEffectContractsForControlManifests(
  controlManifests: readonly AppBuilderControlManifestRow[],
): readonly AppBuilderEffectContractRow[] {
  const manifestIds = new Set(controlManifests.map((row) => row.id));
  return appBuilderSelectRows(
    APP_BUILDER_EFFECT_CONTRACT_ROWS
      .filter((row) => appBuilderDirectControlManifestIdsForEffectContract(row.id).some((id) => manifestIds.has(id)))
      .map((row) => row.id),
    EFFECT_CONTRACTS_BY_ID,
  );
}

/** Read follow-up affordances reachable from selected affordances. */
export function appBuilderFollowUpAffordancesForAffordances(
  affordances: readonly AppBuilderAffordanceRow[],
): readonly AppBuilderAffordanceRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      affordances,
      AppBuilderOntologyRowKind.Affordance,
      AppBuilderOntologyRowKind.Affordance,
      AppBuilderOntologyRelationKind.FollowUpAffordance,
    ),
    AFFORDANCES_BY_ID,
  );
}

/** Read application-pattern rows associated with selected affordances. */
export function appBuilderApplicationPatternsForAffordances(
  affordances: readonly AppBuilderAffordanceRow[],
): readonly AppBuilderApplicationPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      affordances,
      AppBuilderOntologyRowKind.Affordance,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRelationKind.UsesApplicationPattern,
    ),
    APPLICATION_PATTERNS_BY_ID,
  );
}

/** Read app-building affordances that promise selected effect contracts. */
export function appBuilderAffordancesForEffectContracts(
  effectContracts: readonly AppBuilderEffectContractRow[],
): readonly AppBuilderAffordanceRow[] {
  return appBuilderSelectRows(
    appBuilderUniqueIds(effectContracts.flatMap((effectContract) =>
      appBuilderRelationSourceIds(
        AppBuilderOntologyRowKind.Affordance,
        AppBuilderOntologyRowKind.EffectContract,
        effectContract.id,
        AppBuilderOntologyRelationKind.PromisesEffect,
      )
    )),
    AFFORDANCES_BY_ID,
  );
}

/** Read application-pattern rows that coordinate a selected collection concept. */
export function appBuilderApplicationPatternsForCollectionConcept(
  collectionConcept: AppBuilderCollectionConceptRow,
): readonly AppBuilderApplicationPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationSourceIds(
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.CollectionConcept,
      collectionConcept.id,
      AppBuilderOntologyRelationKind.CoordinatesCollectionConcept,
    ),
    APPLICATION_PATTERNS_BY_ID,
  );
}

/** Read application-pattern rows that coordinate a selected control pattern. */
export function appBuilderApplicationPatternsForControlPattern(
  controlPattern: AppBuilderControlPatternRow,
): readonly AppBuilderApplicationPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationSourceIds(
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.ControlPattern,
      controlPattern.id,
      AppBuilderOntologyRelationKind.CoordinatesControlPattern,
    ),
    APPLICATION_PATTERNS_BY_ID,
  );
}

/** Read application-pattern rows that coordinate a selected control/component manifest row. */
export function appBuilderApplicationPatternsForControlManifest(
  controlManifest: AppBuilderControlManifestRow,
): readonly AppBuilderApplicationPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationSourceIds(
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.ControlManifest,
      controlManifest.id,
      AppBuilderOntologyRelationKind.CoordinatesControlManifest,
    ),
    APPLICATION_PATTERNS_BY_ID,
  );
}

/** Read application-pattern rows that coordinate a selected styling mechanism. */
export function appBuilderApplicationPatternsForStylingMechanism(
  stylingMechanism: AppBuilderStylingMechanismRow,
): readonly AppBuilderApplicationPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationSourceIds(
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.StylingMechanism,
      stylingMechanism.id,
      AppBuilderOntologyRelationKind.CoordinatesStylingMechanism,
    ),
    APPLICATION_PATTERNS_BY_ID,
  );
}

/** Read application-pattern rows that coordinate a selected visual policy. */
export function appBuilderApplicationPatternsForVisualPolicy(
  visualPolicy: AppBuilderVisualPolicyRow,
): readonly AppBuilderApplicationPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationSourceIds(
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.VisualPolicy,
      visualPolicy.id,
      AppBuilderOntologyRelationKind.CoordinatesVisualPolicy,
    ),
    APPLICATION_PATTERNS_BY_ID,
  );
}

/** Read collection concepts coordinated by a set of application patterns. */
export function appBuilderCollectionConceptsForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderCollectionConceptRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      applicationPatterns,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.CollectionConcept,
      AppBuilderOntologyRelationKind.CoordinatesCollectionConcept,
    ),
    COLLECTION_CONCEPTS_BY_ID,
  );
}

/** Read caller-selectable collection features associated with selected collection concepts. */
export function appBuilderCollectionFeaturesForCollectionConcepts(
  collectionConcepts: readonly AppBuilderCollectionConceptRow[],
): readonly AppBuilderCollectionFeatureRow[] {
  const conceptIds = new Set(collectionConcepts.map((row) => row.id));
  return appBuilderSelectRows(
    appBuilderUniqueIds(APP_BUILDER_COLLECTION_FEATURE_ROWS
      .filter((row) => row.conceptIds.some((id) => conceptIds.has(id)))
      .map((row) => row.id)),
    COLLECTION_FEATURES_BY_ID,
  );
}

/** Read caller-selectable collection features associated with selected application patterns. */
export function appBuilderCollectionFeaturesForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderCollectionFeatureRow[] {
  return appBuilderCollectionFeaturesForCollectionConcepts(
    appBuilderCollectionConceptsForApplicationPatterns(applicationPatterns),
  );
}

/** Read application patterns commonly coordinated with selected application patterns. */
export function appBuilderCompanionApplicationPatternsForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderApplicationPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      applicationPatterns,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRelationKind.CompanionApplicationPattern,
    ),
    APPLICATION_PATTERNS_BY_ID,
  );
}

/** Read control patterns coordinated by a set of application patterns. */
export function appBuilderControlPatternsForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderControlPatternRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      applicationPatterns,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.ControlPattern,
      AppBuilderOntologyRelationKind.CoordinatesControlPattern,
    ),
    CONTROL_PATTERNS_BY_ID,
  );
}

/** Read control/component manifest rows coordinated by a set of application patterns. */
export function appBuilderControlManifestsForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderControlManifestRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      applicationPatterns,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.ControlManifest,
      AppBuilderOntologyRelationKind.CoordinatesControlManifest,
    ),
    CONTROL_MANIFESTS_BY_ID,
  );
}

/** Read styling mechanisms coordinated by a set of application patterns. */
export function appBuilderStylingMechanismsForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderStylingMechanismRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      applicationPatterns,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.StylingMechanism,
      AppBuilderOntologyRelationKind.CoordinatesStylingMechanism,
    ),
    STYLING_MECHANISMS_BY_ID,
  );
}

/** Read visual policies coordinated by a set of application patterns. */
export function appBuilderVisualPoliciesForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderVisualPolicyRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      applicationPatterns,
      AppBuilderOntologyRowKind.ApplicationPattern,
      AppBuilderOntologyRowKind.VisualPolicy,
      AppBuilderOntologyRelationKind.CoordinatesVisualPolicy,
    ),
    VISUAL_POLICIES_BY_ID,
  );
}

/** Read app-building affordances associated with a set of application patterns. */
export function appBuilderAffordancesForApplicationPatterns(
  applicationPatterns: readonly AppBuilderApplicationPatternRow[],
): readonly AppBuilderAffordanceRow[] {
  return appBuilderSelectRows(
    appBuilderUniqueIds(applicationPatterns.flatMap((pattern) =>
      appBuilderOntologyRelationsTo(
        appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, pattern.id),
        [AppBuilderOntologyRelationKind.UsesApplicationPattern],
      )
        .filter((relation) => relation.from.kind === AppBuilderOntologyRowKind.Affordance)
        .map((relation) => relation.from.id as AppBuilderAffordanceRow['id'])
    )),
    AFFORDANCES_BY_ID,
  );
}

/** Read concrete native leaf-control descriptors for selected control patterns. */
export function appBuilderControlDescriptorsForControlPatterns(
  controlPatterns: readonly AppBuilderControlPatternRow[],
): readonly AppBuilderControlDescriptor[] {
  return appBuilderSelectRows(
    appBuilderUniqueIds(controlPatterns.flatMap((row) => row.leafControlIds)),
    CONTROL_DESCRIPTORS_BY_ID,
  );
}

/** Read realization policy rows for selected control patterns. */
export function appBuilderControlRealizationPoliciesForControlPatterns(
  controlPatterns: readonly AppBuilderControlPatternRow[],
): readonly AppBuilderControlRealizationPolicyRow[] {
  return appBuilderSelectRows(
    appBuilderRelationTargetIds(
      controlPatterns,
      AppBuilderOntologyRowKind.ControlPattern,
      AppBuilderOntologyRowKind.ControlRealizationPolicy,
      AppBuilderOntologyRelationKind.UsesControlRealizationPolicy,
    ),
    CONTROL_REALIZATION_POLICIES_BY_ID,
  );
}

function appBuilderRelationSourceIds(
  sourceKind: AppBuilderOntologyRowKind,
  targetKind: AppBuilderOntologyRowKind,
  targetId: string,
  relationKind: AppBuilderOntologyRelationKind,
): readonly string[] {
  return appBuilderUniqueIds(appBuilderOntologyRelationsTo(
    appBuilderOntologyRowRef(targetKind, targetId),
    [relationKind],
  )
    .filter((relation) => relation.from.kind === sourceKind)
    .map((relation) => relation.from.id));
}

function appBuilderRelationTargetIds<Row extends { readonly id: string }>(
  rows: readonly Row[],
  sourceKind: AppBuilderOntologyRowKind,
  targetKind: AppBuilderOntologyRowKind,
  relationKind: AppBuilderOntologyRelationKind,
): readonly string[] {
  return appBuilderUniqueIds(rows.flatMap((row) =>
    appBuilderOntologyRelationsFrom(
      appBuilderOntologyRowRef(sourceKind, row.id),
      [relationKind],
    )
      .filter((relation) => relation.to.kind === targetKind)
      .map((relation) => relation.to.id)
  ));
}
