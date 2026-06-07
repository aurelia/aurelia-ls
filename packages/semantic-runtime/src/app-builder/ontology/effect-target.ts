import {
  APP_BUILDER_EFFECT_CONTRACT_IDS,
  AppBuilderEffectContractId,
  appBuilderUniqueEffectContractIds,
} from './effect.js';
import {
  AppBuilderControlManifestRowId,
} from './control.js';
import {
  AppBuilderOntologyRelationKind,
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  APP_BUILDER_ONTOLOGY_RELATION_ROWS,
} from './relation-index.js';
import {
  appBuilderOntologyRowRefKey,
} from './row-descriptor.js';

const EFFECT_TARGET_REVERSE_RELATION_KINDS = new Set<AppBuilderOntologyRelationKind>([
  AppBuilderOntologyRelationKind.UsesApplicationPattern,
  AppBuilderOntologyRelationKind.CoordinatesCollectionConcept,
  AppBuilderOntologyRelationKind.CoordinatesControlPattern,
  AppBuilderOntologyRelationKind.UsesControlRealizationPolicy,
  AppBuilderOntologyRelationKind.CoordinatesControlManifest,
  AppBuilderOntologyRelationKind.CoordinatesStylingMechanism,
  AppBuilderOntologyRelationKind.CoordinatesVisualPolicy,
]);

const PROMISED_EFFECT_IDS_BY_ROW_KEY = groupPromisedEffectIdsByRowKey();
const EFFECT_TARGET_PREDECESSORS_BY_ROW_KEY = groupEffectTargetPredecessorsByRowKey();

/** Return effect contracts reachable from one ontology target through declared app-builder graph rows. */
export function appBuilderEffectContractIdsForTargetRef(
  targetRef: AppBuilderOntologyRowRef,
): readonly AppBuilderEffectContractId[] {
  if (targetRef.kind === AppBuilderOntologyRowKind.EffectContract) {
    return isAppBuilderEffectContractId(targetRef.id)
      ? [targetRef.id]
      : [];
  }

  const effectIds: AppBuilderEffectContractId[] = [];
  if (targetRef.kind === AppBuilderOntologyRowKind.ControlManifest) {
    effectIds.push(...effectContractIdsForDirectControlManifest(targetRef.id));
  }
  const visited = new Set<string>();
  const queue: AppBuilderOntologyRowRef[] = [targetRef];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null) {
      continue;
    }
    const key = appBuilderOntologyRowRefKey(current);
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);
    effectIds.push(...(PROMISED_EFFECT_IDS_BY_ROW_KEY.get(key) ?? []));
    queue.push(...(EFFECT_TARGET_PREDECESSORS_BY_ROW_KEY.get(key) ?? []));
  }
  return appBuilderUniqueEffectContractIds(effectIds);
}

/** Direct component/control manifest witnesses promised by a named effect contract. */
export function appBuilderDirectControlManifestIdsForEffectContract(
  id: AppBuilderEffectContractId,
): readonly AppBuilderControlManifestRowId[] {
  switch (id) {
    case AppBuilderEffectContractId.ComponentManifestPublication:
      return [
        AppBuilderControlManifestRowId.ComponentApiManifest,
        AppBuilderControlManifestRowId.AccessibilityContract,
        AppBuilderControlManifestRowId.ValueContract,
        AppBuilderControlManifestRowId.StyleContract,
        AppBuilderControlManifestRowId.ExternalManifestAdapter,
      ];
    case AppBuilderEffectContractId.ControlUseInventory:
      return [AppBuilderControlManifestRowId.ControlUseInventory];
    case AppBuilderEffectContractId.SourcePlanPreview:
    case AppBuilderEffectContractId.SemanticRuntimeReopen:
    case AppBuilderEffectContractId.ExistingAppFactRead:
      return [];
  }
}

function groupPromisedEffectIdsByRowKey(): ReadonlyMap<string, readonly AppBuilderEffectContractId[]> {
  const grouped = new Map<string, AppBuilderEffectContractId[]>();
  for (const relation of APP_BUILDER_ONTOLOGY_RELATION_ROWS) {
    if (relation.relationKind !== AppBuilderOntologyRelationKind.PromisesEffect) {
      continue;
    }
    if (!isAppBuilderEffectContractId(relation.to.id)) {
      continue;
    }
    const key = appBuilderOntologyRowRefKey(relation.from);
    grouped.set(key, [...(grouped.get(key) ?? []), relation.to.id]);
  }
  return uniqueEffectIdMap(grouped);
}

function groupEffectTargetPredecessorsByRowKey(): ReadonlyMap<string, readonly AppBuilderOntologyRowRef[]> {
  const grouped = new Map<string, AppBuilderOntologyRowRef[]>();
  for (const relation of APP_BUILDER_ONTOLOGY_RELATION_ROWS) {
    if (!EFFECT_TARGET_REVERSE_RELATION_KINDS.has(relation.relationKind)) {
      continue;
    }
    const key = appBuilderOntologyRowRefKey(relation.to);
    grouped.set(key, [...(grouped.get(key) ?? []), relation.from]);
  }
  return uniqueRowRefMap(grouped);
}

function uniqueEffectIdMap(
  grouped: ReadonlyMap<string, readonly AppBuilderEffectContractId[]>,
): ReadonlyMap<string, readonly AppBuilderEffectContractId[]> {
  return new Map(
    [...grouped.entries()].map(([key, effectIds]) => [
      key,
      appBuilderUniqueEffectContractIds(effectIds),
    ]),
  );
}

function uniqueRowRefMap(
  grouped: ReadonlyMap<string, readonly AppBuilderOntologyRowRef[]>,
): ReadonlyMap<string, readonly AppBuilderOntologyRowRef[]> {
  return new Map(
    [...grouped.entries()].map(([key, refs]) => [
      key,
      uniqueRowRefs(refs),
    ]),
  );
}

function uniqueRowRefs(
  refs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderOntologyRowRef[] {
  const seen = new Set<string>();
  const unique: AppBuilderOntologyRowRef[] = [];
  for (const ref of refs) {
    const key = appBuilderOntologyRowRefKey(ref);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

function effectContractIdsForDirectControlManifest(
  manifestId: string,
): readonly AppBuilderEffectContractId[] {
  return APP_BUILDER_EFFECT_CONTRACT_IDS.filter((effectId) =>
    appBuilderDirectControlManifestIdsForEffectContract(effectId).includes(manifestId as AppBuilderControlManifestRowId)
  );
}

function isAppBuilderEffectContractId(
  value: string,
): value is AppBuilderEffectContractId {
  return APP_BUILDER_EFFECT_CONTRACT_IDS.includes(value as AppBuilderEffectContractId);
}
