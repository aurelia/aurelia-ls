import type {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectKind,
} from '../../fixture-verification/expected-effect.js';

/** Compact expected-effect row for app-builder previews and source-plan reopen witnesses. */
export interface AppBuilderExpectedSemanticEffectPreview {
  /** Product-facing expectation, not a file snapshot assertion. */
  readonly summary: string;
  /** Semantic fact family the verifier should inspect after reopening. */
  readonly effectKind: ExpectedSemanticEffect['effectKind'];
  /** Broad fact scope used for verifier dispatch and reporting. */
  readonly scope: ExpectedSemanticEffect['scope'];
  /** Optional app topology node this expectation belongs to. */
  readonly topologyNodeKind: ExpectedSemanticEffect['topologyNodeKind'];
  /** Cardinality rule for matching reopened facts. */
  readonly cardinality: ExpectedSemanticEffect['cardinality'];
  /** Count used by exact and at-least cardinalities. */
  readonly count: ExpectedSemanticEffect['count'];
  /** Whether this row is baseline verification, signature evidence, or discriminator evidence. */
  readonly role: ExpectedSemanticEffect['role'];
  /** Compact stable grouping key derived from kind, cardinality, count, and filters. */
  readonly semanticTargetKey: string;
  /** Field/value predicates for row-shaped fact families. */
  readonly filters: readonly AppBuilderExpectedSemanticEffectFilterPreview[];
}

/** Compact expected-effect field predicate for app-builder previews. */
export interface AppBuilderExpectedSemanticEffectFilterPreview {
  /** Stable API row field or nested field path. */
  readonly field: string;
  /** Expected scalar value; generated source text is intentionally not stored here. */
  readonly value: string | number | boolean | null;
}

/** Read compact effect kinds from concrete expected-effect rows. */
export function appBuilderExpectedSemanticEffectKinds(
  effects: readonly ExpectedSemanticEffect[],
): readonly ExpectedSemanticEffectKind[] {
  return [...new Set(effects.map((effect) => effect.effectKind))];
}

/** Project concrete expected effects into the public app-builder preview shape. */
export function appBuilderExpectedSemanticEffectPreviews(
  effects: readonly ExpectedSemanticEffect[],
): readonly AppBuilderExpectedSemanticEffectPreview[] {
  return effects.map(appBuilderExpectedSemanticEffectPreview);
}

/** Project one concrete expected effect into the public app-builder preview shape. */
export function appBuilderExpectedSemanticEffectPreview(
  effect: ExpectedSemanticEffect,
): AppBuilderExpectedSemanticEffectPreview {
  return {
    summary: effect.summary,
    effectKind: effect.effectKind,
    scope: effect.scope,
    topologyNodeKind: effect.topologyNodeKind,
    cardinality: effect.cardinality,
    count: effect.count,
    role: effect.role,
    semanticTargetKey: effect.semanticTargetKey,
    filters: effect.filters.map((filter) => ({
      field: filter.field,
      value: filter.value,
    })),
  };
}
