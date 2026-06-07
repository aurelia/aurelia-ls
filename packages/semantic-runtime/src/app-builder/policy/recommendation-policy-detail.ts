import {
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
} from '../ontology/row-descriptor.js';
import {
  appBuilderNormalizeOntologyTargetSelection,
  type AppBuilderOntologyTargetSelectionIssue,
  type AppBuilderOntologyTargetSelector,
} from '../ontology/target-selector.js';
import type {
  AppBuilderOntologyRowRef,
} from '../ontology/relation.js';
import {
  AppBuilderRecommendationStatus,
} from '../ontology/status.js';
import {
  appBuilderRecommendationPolicyRows,
  appBuilderRecommendationPolicySummary,
  type AppBuilderRecommendationApplicabilityKind,
  type AppBuilderRecommendationEvidenceKind,
  type AppBuilderRecommendationPolicyRow,
  type AppBuilderRecommendationPolicySummary,
} from './recommendation-policy.js';
import {
  appBuilderRequiresPolicySatisfaction,
} from './policy-satisfaction.js';

/** Filter request for the read-only app-builder recommendation/defaulting policy projection. */
export interface AppBuilderRecommendationPolicyDetailRequest {
  /** Exact ontology rows to inspect; omitted means all admitted rows. */
  readonly targetRefs?: readonly AppBuilderOntologyRowRef[] | null;
  /** Compact target selectors accepted before exact refs are known. */
  readonly targetSelectors?: readonly AppBuilderOntologyTargetSelector[] | null;
  /** Include only rows with these recommendation postures. */
  readonly recommendationStatuses?: readonly AppBuilderRecommendationStatus[] | null;
  /** Include only rows with at least one matching applicability lane. */
  readonly applicabilityKinds?: readonly AppBuilderRecommendationApplicabilityKind[] | null;
  /** Include only rows with at least one matching evidence lane. */
  readonly evidenceKinds?: readonly AppBuilderRecommendationEvidenceKind[] | null;
  /** Include only rows with or without executable source lowering when specified. */
  readonly sourceLoweringImplemented?: boolean | null;
  /** Include only rows admitted as local defaulting candidates when specified. */
  readonly defaultingCandidate?: boolean | null;
  /** Include only rows that do or do not require explicit input when specified. */
  readonly requiresExplicitInput?: boolean | null;
  /** Include only executable contextual rows that would need future policy-satisfaction review. */
  readonly policySatisfactionCandidates?: boolean | null;
  /** Include full policy rows; defaults to false so compact callers receive counts first. */
  readonly includeRows?: boolean | null;
}

/** Read-only recommendation/defaulting policy projection for AI and operator review. */
export interface AppBuilderRecommendationPolicyDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Compact counts for the filtered recommendation-policy terrain. */
  readonly summary: AppBuilderRecommendationPolicySummary;
  /** Filtered recommendation-policy rows when requested. */
  readonly rows: readonly AppBuilderRecommendationPolicyRow[];
  /** Issues found while normalizing exact refs or compact selectors. */
  readonly issues: readonly AppBuilderOntologyTargetSelectionIssue[];
  /** Whether rows were included or only the summary/counts were returned. */
  readonly rowsIncluded: boolean;
  /** Whether the caller supplied any target selection. */
  readonly selectionProvided: boolean;
  /** Number of rows before filters were applied. */
  readonly totalRowCount: number;
  /** Number of rows after filters were applied. */
  readonly filteredRowCount: number;
  /** Executable contextual rows in the filtered set that would need policy-satisfaction review. */
  readonly policySatisfactionCandidateCount: number;
}

/** Return recommendation/defaulting policy rows without selecting policy or lowering source. */
export function appBuilderRecommendationPolicyDetail(
  request: AppBuilderRecommendationPolicyDetailRequest = {},
): AppBuilderRecommendationPolicyDetail {
  const selection = appBuilderNormalizeOntologyTargetSelection(request);
  const selectedTargetKeys = selection.selectionProvided
    ? new Set(selection.targetRefs.map(appBuilderRecommendationPolicyTargetKey))
    : null;
  const allRows = appBuilderRecommendationPolicyRows(APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS);
  const unorderedFilteredRows = allRows.filter((row) =>
    (selectedTargetKeys == null || selectedTargetKeys.has(appBuilderRecommendationPolicyTargetKey(row.targetRef)))
    && recommendationPolicyRowMatches(row, request)
  );
  const filteredRows = recommendationPolicyRowsInPresentationOrder(unorderedFilteredRows, selection);
  const rowsIncluded = request.includeRows === true;
  const policySatisfactionCandidateCount = filteredRows.filter(appBuilderPolicySatisfactionCandidateRow).length;
  return {
    summary: appBuilderRecommendationPolicySummary(filteredRows),
    rows: rowsIncluded ? filteredRows : [],
    issues: selection.issues,
    rowsIncluded,
    selectionProvided: selection.selectionProvided,
    totalRowCount: allRows.length,
    filteredRowCount: filteredRows.length,
    policySatisfactionCandidateCount,
    displayText: `App-builder recommendation policy: ${filteredRows.length}/${allRows.length} row(s), policySatisfactionCandidates=${policySatisfactionCandidateCount}, rowsIncluded=${rowsIncluded}, issues=${selection.issues.length}.`,
  };
}

/** Return whether a policy row is an executable contextual row needing explicit policy/defaulting review. */
export function appBuilderPolicySatisfactionCandidateRow(
  row: AppBuilderRecommendationPolicyRow,
): boolean {
  return appBuilderRequiresPolicySatisfaction(row);
}

function recommendationPolicyRowsInPresentationOrder(
  rows: readonly AppBuilderRecommendationPolicyRow[],
  selection: ReturnType<typeof appBuilderNormalizeOntologyTargetSelection>,
): readonly AppBuilderRecommendationPolicyRow[] {
  if (!selection.selectionProvided) {
    return rows;
  }
  const orderByTargetRefKey = new Map<string, number>();
  for (const [index, targetRef] of selection.targetRefs.entries()) {
    const key = appBuilderRecommendationPolicyTargetKey(targetRef);
    if (!orderByTargetRefKey.has(key)) {
      orderByTargetRefKey.set(key, index);
    }
  }
  return [...rows].sort((left, right) =>
    (orderByTargetRefKey.get(appBuilderRecommendationPolicyTargetKey(left.targetRef)) ?? Number.MAX_SAFE_INTEGER)
    - (orderByTargetRefKey.get(appBuilderRecommendationPolicyTargetKey(right.targetRef)) ?? Number.MAX_SAFE_INTEGER)
  );
}

function recommendationPolicyRowMatches(
  row: AppBuilderRecommendationPolicyRow,
  request: AppBuilderRecommendationPolicyDetailRequest,
): boolean {
  return (request.recommendationStatuses == null
      || request.recommendationStatuses.length === 0
      || request.recommendationStatuses.includes(row.recommendationStatus))
    && (request.applicabilityKinds == null
      || request.applicabilityKinds.length === 0
      || row.applicability.some((applicability) => request.applicabilityKinds?.includes(applicability.kind) === true))
    && (request.evidenceKinds == null
      || request.evidenceKinds.length === 0
      || row.evidence.some((evidence) => request.evidenceKinds?.includes(evidence.kind) === true))
    && (request.sourceLoweringImplemented == null
      || row.sourceLoweringImplemented === request.sourceLoweringImplemented)
    && (request.defaultingCandidate == null
      || row.defaultingCandidate === request.defaultingCandidate)
    && (request.requiresExplicitInput == null
      || row.requiresExplicitInput === request.requiresExplicitInput)
    && (request.policySatisfactionCandidates == null
      || appBuilderPolicySatisfactionCandidateRow(row) === request.policySatisfactionCandidates);
}

function appBuilderRecommendationPolicyTargetKey(
  targetRef: AppBuilderOntologyRowRef,
): string {
  return `${targetRef.kind}\0${targetRef.domain}\0${targetRef.id}`;
}
