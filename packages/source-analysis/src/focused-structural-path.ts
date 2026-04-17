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

  const finalEvaluation = evaluateFilePathStructuralClaims(analysis.structuralRuntime, filePath, {
    repoSourceFiles: analysis.repoSourceFiles,
  });
  const tierLabel = finalEvaluation.operationalAnalyzabilityTier ?? '(not yet closed)';
  const blockerSummary = finalEvaluation.blockerReasons[0]?.message ?? 'No structural blocker recorded.';
  const lines = finalEvaluation.status === 'supported'
    ? [`Path evaluator closes on ${filePath} as ${tierLabel}.`]
    : [`Path evaluator still leaves ${filePath} open: ${blockerSummary}`];
  const tag: OutcomeTag | null = finalEvaluation.status === 'supported' ? null : 'open-boundary';
  const trust: TrustProfile | null = finalEvaluation.status === 'supported'
    ? {
      kind: 'grounded',
      summary: `The live path evaluator closes on ${filePath} through structural claim evidence.`,
    }
    : {
      kind: finalEvaluation.status === 'unclaimed' ? 'frontier' : 'qualified',
      summary: blockerSummary,
    };

  return {
    evaluation: finalEvaluation,
    facts: [
      { label: 'path source coverage', value: finalEvaluation.sourceCoverage },
      { label: 'path evaluator status', value: finalEvaluation.status },
      { label: 'path evaluator tier', value: tierLabel },
      { label: 'path evaluator blockers', value: `${finalEvaluation.blockerReasons.length}` },
    ],
    lines,
    tag,
    trust,
    closureBasis: [{
      kind: finalEvaluation.status === 'supported' ? 'route' : 'boundary',
      summary: finalEvaluation.status === 'supported'
        ? `${filePath} closes as ${tierLabel} under structural path evaluator ${finalEvaluation.evaluatorId}.`
        : `${filePath} is still blocked under structural path evaluator ${finalEvaluation.evaluatorId}: ${blockerSummary}`,
      provenanceRefs: [
        finalEvaluation.evaluatorId,
        ...finalEvaluation.supportingClaimIds,
        ...finalEvaluation.blockerReasons.flatMap((reason) => reason.claimIds),
      ].slice(0, 16),
    }],
    issues: finalEvaluation.status === 'supported'
      ? []
      : [{
        code: `path-evaluator-${finalEvaluation.status}`,
        message: blockerSummary,
        severity: 'warning',
        origin: 'boundary',
      }],
    provenance: [{
      kind: 'route',
      label: 'Focused structural path evaluation',
      detail: `${finalEvaluation.evaluatorId}:${finalEvaluation.sourceCoverage}:${finalEvaluation.status}:${finalEvaluation.operationalAnalyzabilityTier ?? 'none'}`,
    }],
  };
}
