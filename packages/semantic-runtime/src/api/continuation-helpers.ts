import type { InquiryContinuationIntent } from '../inquiry/continuation-intent.js';
import type {
  SemanticAppQuery,
  SemanticRuntimeContinuationRow,
  SemanticRuntimePageInput,
} from './contracts.js';
import type {
  SemanticRuntimeAppBuilderQueryRequest,
} from './app-builder.js';

/** Page envelope for continuation rows that inherit caller page size but not caller cursor. */
export function semanticRuntimeContinuationPageInput(
  query: { readonly page?: SemanticRuntimePageInput | null },
): SemanticRuntimePageInput {
  return {
    size: query.page?.size ?? 50,
  };
}

/** Merge continuation rows by public target/evidence identity while preserving first-seen order. */
export function mergeSemanticRuntimeContinuationRows(
  existing: readonly SemanticRuntimeContinuationRow[],
  added: readonly SemanticRuntimeContinuationRow[],
): readonly SemanticRuntimeContinuationRow[] {
  const rows: SemanticRuntimeContinuationRow[] = [];
  const seen = new Set<string>();
  for (const row of [...existing, ...added]) {
    const key = semanticRuntimeContinuationKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

/** Check whether a public continuation row serves at least one caller-requested next-move intent. */
export function semanticRuntimeContinuationMatchesRequestedIntents(
  row: SemanticRuntimeContinuationRow,
  requestedIntents: readonly InquiryContinuationIntent[],
): boolean {
  return row.intents.length === 0 || row.intents.some((intent) => requestedIntents.includes(intent as InquiryContinuationIntent));
}

/** Thread the caller's continuation intent filter into an app-query continuation target. */
export function semanticRuntimeContinuationWithAppQueryIntentFilter(
  row: SemanticRuntimeContinuationRow,
  requestedIntents: readonly InquiryContinuationIntent[],
): SemanticRuntimeContinuationRow {
  if (row.targetQuery == null) {
    return row;
  }
  return {
    ...row,
    targetQuery: {
      ...row.targetQuery,
      continuationIntents: requestedIntents,
    } satisfies SemanticAppQuery,
  };
}

/** Thread the caller's continuation intent filter into an app-builder continuation target. */
export function semanticRuntimeContinuationWithAppBuilderQueryIntentFilter(
  row: SemanticRuntimeContinuationRow,
  requestedIntents: readonly InquiryContinuationIntent[],
): SemanticRuntimeContinuationRow {
  if (row.targetAppBuilderQuery == null) {
    return row;
  }
  return {
    ...row,
    targetAppBuilderQuery: {
      ...row.targetAppBuilderQuery,
      continuationIntents: requestedIntents,
    } satisfies SemanticRuntimeAppBuilderQueryRequest,
  };
}

function semanticRuntimeContinuationKey(row: SemanticRuntimeContinuationRow): string {
  return [
    row.kind,
    row.targetQueryKind ?? '',
    row.targetAppBuilderQueryKind ?? '',
    JSON.stringify(row.targetQuery ?? null),
    JSON.stringify(row.targetAppBuilderQuery ?? null),
    JSON.stringify(row.intents ?? []),
    JSON.stringify(row.evidence ?? null),
    JSON.stringify(row.blockers ?? []),
  ].join('\u0000');
}
