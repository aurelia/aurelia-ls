import type { AnalysisViews } from './analysis-views.js';
import type {
  ClosureBasis,
  Issue,
  OutcomeTag,
  TrustProfile,
} from './outcome-algebra.js';
import type { InquiryProvenanceEntry } from './inquiry-model.js';
import {
  evaluateFilePathStructuralClaims,
  type StructuralPathEvaluation,
} from './structural-evaluators.js';

export interface FocusedStructuralPathContext {
  readonly evaluation: StructuralPathEvaluation;
  readonly facts: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly lines: readonly string[];
  readonly tag: OutcomeTag | null;
  readonly trust: TrustProfile | null;
  readonly closureBasis: readonly ClosureBasis[];
  readonly issues: readonly Issue[];
  readonly provenance: readonly InquiryProvenanceEntry[];
}

export function inspectFocusedStructuralPath(
  analysis: AnalysisViews,
  filePath: string,
): FocusedStructuralPathContext | null {
  if (!analysis.structuralRuntime) {
    return null;
  }

  const evaluation = evaluateFilePathStructuralClaims(analysis.structuralRuntime, filePath);
  const tierLabel = evaluation.operationalAnalyzabilityTier ?? '(not yet closed)';
  const blockerSummary = evaluation.blockerReasons[0]?.message ?? 'No structural blocker recorded.';
  const lines = evaluation.status === 'supported'
    ? [`Path evaluator closes on ${filePath} as ${tierLabel}.`]
    : [`Path evaluator still leaves ${filePath} open: ${blockerSummary}`];
  const tag: OutcomeTag | null = evaluation.status === 'supported' ? null : 'open-boundary';
  const trust: TrustProfile | null = evaluation.status === 'supported'
    ? {
      kind: 'grounded',
      summary: `The live path evaluator closes on ${filePath} through structural claim evidence.`,
    }
    : {
      kind: evaluation.status === 'unclaimed' ? 'frontier' : 'qualified',
      summary: blockerSummary,
    };

  return {
    evaluation,
    facts: [
      { label: 'path evaluator status', value: evaluation.status },
      { label: 'path evaluator tier', value: tierLabel },
      { label: 'path evaluator blockers', value: `${evaluation.blockerReasons.length}` },
    ],
    lines,
    tag,
    trust,
    closureBasis: [{
      kind: evaluation.status === 'supported' ? 'route' : 'boundary',
      summary: evaluation.status === 'supported'
        ? `${filePath} closes as ${tierLabel} under structural path evaluator ${evaluation.evaluatorId}.`
        : `${filePath} is still blocked under structural path evaluator ${evaluation.evaluatorId}: ${blockerSummary}`,
      provenanceRefs: [
        evaluation.evaluatorId,
        ...evaluation.supportingClaimIds,
        ...evaluation.blockerReasons.flatMap((reason) => reason.claimIds),
      ].slice(0, 16),
    }],
    issues: evaluation.status === 'supported'
      ? []
      : [{
        code: `path-evaluator-${evaluation.status}`,
        message: blockerSummary,
        severity: 'warning',
        origin: 'boundary',
      }],
    provenance: [{
      kind: 'route',
      label: 'Focused structural path evaluation',
      detail: `${evaluation.evaluatorId}:${evaluation.status}:${evaluation.operationalAnalyzabilityTier ?? 'none'}`,
    }],
  };
}
