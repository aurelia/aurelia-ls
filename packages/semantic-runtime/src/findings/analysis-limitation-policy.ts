/** Stable semantic rule IDs admitted by persisted project finding policy. */
export enum SemanticProjectFindingRuleId {
  DynamicRegistrationSpread = 'aurelia.analysis.dynamic-registration-spread',
}

export const SEMANTIC_PROJECT_FINDING_RULE_IDS = Object.freeze([
  SemanticProjectFindingRuleId.DynamicRegistrationSpread,
] as const);

export const SEMANTIC_PROJECT_FINDING_DISPOSITIONS = Object.freeze([
  'off',
  'information',
  'warning',
  'error',
] as const);

export type SemanticProjectFindingDisposition = (typeof SEMANTIC_PROJECT_FINDING_DISPOSITIONS)[number];
export type SemanticProjectFindingPolicyAuthority = 'default' | 'project-configuration';

export const DEFAULT_SEMANTIC_PROJECT_FINDING_RULE_DISPOSITIONS: Readonly<
  Record<SemanticProjectFindingRuleId, SemanticProjectFindingDisposition>
> = Object.freeze({
  [SemanticProjectFindingRuleId.DynamicRegistrationSpread]: 'information',
});

export interface SemanticProjectFindingPolicySourcePosition {
  readonly line: number;
  readonly character: number;
}

/** Source span retained without depending on the native project-configuration parser. */
export interface SemanticProjectFindingPolicySourceSpan {
  readonly filePath: string;
  readonly start: number;
  readonly end: number;
  readonly startPosition: SemanticProjectFindingPolicySourcePosition;
  readonly endPosition: SemanticProjectFindingPolicySourcePosition;
}

/** One accepted persisted rule override and its exact authored value. */
export interface SemanticProjectFindingRuleSetting {
  readonly ruleId: SemanticProjectFindingRuleId;
  readonly disposition: SemanticProjectFindingDisposition;
  readonly authority: 'project-configuration';
  readonly source: SemanticProjectFindingPolicySourceSpan;
}

/** Immutable persisted project policy. Defaults remain owned by this semantic rule catalog. */
export interface SemanticProjectFindingPolicy {
  readonly rules: readonly SemanticProjectFindingRuleSetting[];
}

/** Effective projection policy with enough provenance to explain why it won. */
export interface SemanticProjectFindingEffectivePolicy {
  readonly ruleId: SemanticProjectFindingRuleId;
  readonly disposition: SemanticProjectFindingDisposition;
  readonly authority: SemanticProjectFindingPolicyAuthority;
  readonly source: SemanticProjectFindingPolicySourceSpan | null;
}

export const EMPTY_SEMANTIC_PROJECT_FINDING_POLICY: SemanticProjectFindingPolicy = Object.freeze({
  rules: Object.freeze([]),
});

/** Resolve persisted project policy before the deterministic semantic-rule default. */
export function resolveSemanticProjectFindingRulePolicy(
  policy: SemanticProjectFindingPolicy,
  ruleId: SemanticProjectFindingRuleId,
): SemanticProjectFindingEffectivePolicy {
  const configured = policy.rules.find((rule) => rule.ruleId === ruleId) ?? null;
  return Object.freeze(configured == null
    ? {
        ruleId,
        disposition: DEFAULT_SEMANTIC_PROJECT_FINDING_RULE_DISPOSITIONS[ruleId],
        authority: 'default',
        source: null,
      }
    : {
        ruleId,
        disposition: configured.disposition,
        authority: configured.authority,
        source: configured.source,
      });
}
