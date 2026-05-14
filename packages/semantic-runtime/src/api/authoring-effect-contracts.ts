import { readAuthoringTasteValueDescriptor } from '../authoring/ontology.js';
import type { ExpectedSemanticEffect } from '../authoring/expected-effect.js';
import { uniqueValues } from '../collections.js';
import type { SemanticAuthoringExpectedEffectContractRow } from './contracts.js';

export function semanticAuthoringExpectedEffectContractRow(
  effect: ExpectedSemanticEffect,
): SemanticAuthoringExpectedEffectContractRow {
  const tasteDescriptor = effect.tasteValueKey == null
    ? null
    : readAuthoringTasteValueDescriptor(effect.tasteValueKey);
  return {
    effectKind: effect.effectKind,
    scope: effect.scope,
    role: effect.role,
    topologyNodeKind: effect.topologyNodeKind,
    cardinality: effect.cardinality,
    count: effect.count,
    semanticTargetKey: effect.semanticTargetKey,
    filterCount: effect.filters.length,
    filterFields: uniqueValues(effect.filters.map((filter) => filter.field)),
    filters: effect.filters.map((filter) => ({
      field: filter.field,
      value: filter.value,
    })),
    capabilityKey: effect.capabilityKey,
    minimumSupportState: effect.minimumSupportState,
    tasteAxisKey: effect.tasteAxisKey,
    tasteValueKey: effect.tasteValueKey,
    tasteValueLayer: tasteDescriptor?.layer ?? null,
    tasteValueOntologySummary: tasteDescriptor?.summary ?? null,
    summary: effect.summary,
  };
}
