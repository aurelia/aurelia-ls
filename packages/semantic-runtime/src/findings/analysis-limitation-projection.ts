import { SourceFileRole } from '../kernel/address.js';
import {
  OpenSeamBoundaryKind,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import { InquiryAnswerCoverage } from '../inquiry/answer.js';
import type {
  SemanticAnalysisLimitationMaterializationEvidence,
  SemanticAnalysisLimitationProductEvidence,
  SemanticAnalysisLimitationRow,
  SemanticSourceRange,
} from '../api/contracts.js';
import {
  SemanticAnalysisLimitationAuthority,
  SemanticOpenSeamPressureKind,
} from '../api/contracts.js';
import type { OpenSeamProjectionFact } from '../api/open-seam-projections.js';
import {
  semanticExactSourceReference,
  type SemanticSourceReference,
} from '../api/source-reference.js';
import {
  resolveSemanticProjectFindingRulePolicy,
  SemanticProjectFindingRuleId,
  type SemanticProjectFindingEffectivePolicy,
  type SemanticProjectFindingPolicy,
} from './analysis-limitation-policy.js';

export interface SemanticAnalysisLimitationProjection {
  readonly effectivePolicies: readonly SemanticProjectFindingEffectivePolicy[];
  readonly candidateCount: number;
  readonly suppressedCandidateCount: number;
  readonly rows: readonly SemanticAnalysisLimitationRow[];
}

interface AnalysisLimitationRule {
  readonly ruleId: SemanticProjectFindingRuleId;
  readonly title: string;
  readonly explanation: string;
  readonly action: string;
  readonly reasonSummary: string;
  readonly matches: (fact: OpenSeamProjectionFact) => boolean;
}

interface AnalysisLimitationCandidate {
  readonly rule: AnalysisLimitationRule;
  readonly findingKey: string;
  readonly source: SemanticSourceReference;
  readonly sourceRange: SemanticSourceRange;
  readonly siteKey: string;
  readonly facts: OpenSeamProjectionFact[];
}

const DYNAMIC_REGISTRATION_SPREAD_REASON_KINDS = new Set<string>([
  OpenSeamReasonKind.StaticEvaluationDynamicCall,
  OpenSeamReasonKind.StaticEvaluationDynamicBranch,
  OpenSeamReasonKind.StaticEvaluationDynamicLoop,
  OpenSeamReasonKind.StaticEvaluationDynamicImport,
  OpenSeamReasonKind.RegistrationSpreadOpen,
]);

const ANALYSIS_LIMITATION_RULES: readonly AnalysisLimitationRule[] = Object.freeze([
  {
    ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    title: 'Dynamic registration spread limits resource analysis',
    explanation:
      'A runtime-dependent spread prevents static analysis from proving every registration and resource contributed at this point.',
    action:
      'Register statically known entries explicitly, or keep this rule informational or off when runtime registration is intentional.',
    reasonSummary: 'The authored registration spread did not close to a statically enumerable registration set',
    matches: dynamicRegistrationSpreadRuleMatches,
  },
]);

/**
 * Project actionable analysis limitations from exact seam causality.
 *
 * This is deliberately not a projection of every product-pressure seam. Each admitted rule owns its own causal,
 * source-attribution, and affected-product predicate. Evidence-only and tool-coverage seams remain available through
 * the open-seam queries but cannot enter this default product surface.
 */
export function projectSemanticAnalysisLimitations(
  facts: readonly OpenSeamProjectionFact[],
  policy: SemanticProjectFindingPolicy,
  sourceRangeForSource: (source: SemanticSourceReference | null) => SemanticSourceRange | null,
): SemanticAnalysisLimitationProjection {
  const effectivePolicies = ANALYSIS_LIMITATION_RULES.map((rule) =>
    resolveSemanticProjectFindingRulePolicy(policy, rule.ruleId)
  );
  const candidates = analysisLimitationCandidates(facts, sourceRangeForSource);
  const effectivePolicyByRule = new Map(effectivePolicies.map((entry) => [entry.ruleId, entry]));
  const rows: SemanticAnalysisLimitationRow[] = [];
  let suppressedCandidateCount = 0;

  for (const candidate of candidates) {
    const effectivePolicy = effectivePolicyByRule.get(candidate.rule.ruleId);
    if (effectivePolicy == null) {
      throw new Error(`Analysis limitation rule '${candidate.rule.ruleId}' has no effective policy.`);
    }
    if (effectivePolicy.disposition === 'off') {
      suppressedCandidateCount += 1;
      continue;
    }
    rows.push(analysisLimitationRow(candidate, effectivePolicy));
  }

  return {
    effectivePolicies,
    candidateCount: candidates.length,
    suppressedCandidateCount,
    rows,
  };
}

function analysisLimitationCandidates(
  facts: readonly OpenSeamProjectionFact[],
  sourceRangeForSource: (source: SemanticSourceReference | null) => SemanticSourceRange | null,
): readonly AnalysisLimitationCandidate[] {
  const candidates = new Map<string, AnalysisLimitationCandidate>();
  for (const rule of ANALYSIS_LIMITATION_RULES) {
    for (const fact of facts) {
      if (!rule.matches(fact)) {
        continue;
      }
      const exactSource = semanticExactSourceReference(fact.source);
      const sourceRange = sourceRangeForSource(exactSource);
      if (
        exactSource?.path == null
        || exactSource.start == null
        || exactSource.end == null
        || sourceRange == null
      ) {
        continue;
      }
      const findingKey = stableAnalysisLimitationFindingKey(rule.ruleId, exactSource);
      const existing = candidates.get(findingKey);
      if (existing == null) {
        candidates.set(findingKey, {
          rule,
          findingKey,
          source: exactSource,
          sourceRange,
          siteKey: fact.siteKey,
          facts: [fact],
        });
      } else {
        existing.facts.push(fact);
      }
    }
  }
  return [...candidates.values()].sort((left, right) => left.findingKey.localeCompare(right.findingKey));
}

function analysisLimitationRow(
  candidate: AnalysisLimitationCandidate,
  effectivePolicy: SemanticProjectFindingEffectivePolicy,
): SemanticAnalysisLimitationRow {
  const facts = candidate.facts;
  return {
    findingKey: candidate.findingKey,
    ruleId: candidate.rule.ruleId,
    authority: SemanticAnalysisLimitationAuthority.SemanticRuntimeRule,
    title: candidate.rule.title,
    explanation: candidate.rule.explanation,
    action: candidate.rule.action,
    reason: {
      summary: candidate.rule.reasonSummary,
      seamKindKeys: uniqueSorted(facts.map((fact) => fact.seamKindKey)),
      boundaryKinds: uniqueSorted(facts.flatMap((fact) => [...fact.boundaryKinds])),
      reasonKinds: uniqueSorted(facts.flatMap((fact) => [...fact.reasonKinds])),
    },
    source: candidate.source,
    sourceRange: candidate.sourceRange,
    currentCoverage: InquiryAnswerCoverage.Open,
    evidence: {
      openSeamSiteKey: candidate.siteKey,
      seamKeys: uniqueSorted(facts.map((fact) => fact.seamKey)),
      materializations: analysisLimitationMaterializationEvidence(facts),
      products: analysisLimitationProductEvidence(facts),
    },
    effectivePolicy,
  };
}

function analysisLimitationMaterializationEvidence(
  facts: readonly OpenSeamProjectionFact[],
): readonly SemanticAnalysisLimitationMaterializationEvidence[] {
  const rows = new Map<string, SemanticAnalysisLimitationMaterializationEvidence>();
  for (const impact of facts.flatMap((fact) => [...fact.impacts])) {
    rows.set(impact.impactKey, {
      impactKey: impact.impactKey,
      outcome: impact.outcome,
      ownerKey: impact.owner.ownerKey,
      productKeys: uniqueSorted(impact.products.map((product) => product.productKey)),
      productKindKeys: uniqueSorted(impact.products.map((product) => product.product.productKindKey)),
    });
  }
  return [...rows.values()].sort((left, right) => left.impactKey.localeCompare(right.impactKey));
}

function analysisLimitationProductEvidence(
  facts: readonly OpenSeamProjectionFact[],
): readonly SemanticAnalysisLimitationProductEvidence[] {
  const rows = new Map<string, SemanticAnalysisLimitationProductEvidence>();
  for (const product of facts.flatMap((fact) =>
    fact.impacts.flatMap((impact) => [...impact.products])
  )) {
    rows.set(product.productKey, {
      productKey: product.productKey,
      productKindKey: product.product.productKindKey,
      source: product.source,
    });
  }
  return [...rows.values()].sort((left, right) =>
    left.productKindKey.localeCompare(right.productKindKey)
    || left.productKey.localeCompare(right.productKey)
  );
}

function dynamicRegistrationSpreadRuleMatches(fact: OpenSeamProjectionFact): boolean {
  if (
    fact.seamKindKey !== 'registration.open-spread'
    || fact.pressureKind !== SemanticOpenSeamPressureKind.ProductPressure
    || fact.sourceRole !== SourceFileRole.AppSource
    || !fact.reasonKinds.some((reason) => DYNAMIC_REGISTRATION_SPREAD_REASON_KINDS.has(reason))
    || fact.boundaryKinds.some((boundary) =>
      boundary !== OpenSeamBoundaryKind.RuntimeExecutionBoundary
      && boundary !== OpenSeamBoundaryKind.FrameworkSemanticBoundary
    )
  ) {
    return false;
  }
  const exactSource = semanticExactSourceReference(fact.source);
  return exactSource?.path != null
    && exactSource.start != null
    && exactSource.end != null
    && fact.impacts.some((impact) =>
      impact.products.some((product) => product.product.productKindKey === 'configuration.sequence')
    );
}

/** Stable public finding identity for one rule at one exact authored spread locus. */
function stableAnalysisLimitationFindingKey(
  ruleId: SemanticProjectFindingRuleId,
  source: SemanticSourceReference,
): string {
  return `analysis-limitation:${JSON.stringify([
    ruleId,
    source.sourceWorkspaceKey ?? '',
    source.path ?? '',
    source.start ?? -1,
    source.end ?? -1,
  ])}`;
}

function uniqueSorted<TValue extends string>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)].sort();
}
