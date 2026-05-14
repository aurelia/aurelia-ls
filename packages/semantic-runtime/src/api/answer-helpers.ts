import { InquiryPageRequest } from '../inquiry/page.js';
import {
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticRuntimePageResult,
} from './contracts.js';

export function toPageRequest(page: SemanticRuntimePageInput | undefined): InquiryPageRequest {
  return new InquiryPageRequest(page?.size ?? 50, page?.cursor ?? null);
}

export function answer<TValue>(
  outcome: SemanticRuntimeAnswerOutcome | `${SemanticRuntimeAnswerOutcome}`,
  summary: string,
  value: TValue,
  page: SemanticRuntimePageResult | null = null,
): SemanticRuntimeAnswer<TValue> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: outcome as SemanticRuntimeAnswerOutcome,
    summary,
    value,
    page,
  };
}

export function includeHandles(detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`): boolean {
  return detail === SemanticRuntimeDetail.Handles;
}

export function pageRows<TRow>(
  rows: readonly TRow[],
  page: SemanticRuntimePageInput | undefined,
): {
  readonly rows: readonly TRow[];
  readonly page: SemanticRuntimePageResult;
} {
  const size = Math.max(0, page?.size ?? 50);
  const cursor = page?.cursor ?? null;
  const start = cursor == null ? 0 : cursorStart(cursor, rows.length);
  const safeStart = start < 0 ? rows.length : start;
  const selected = rows.slice(safeStart, safeStart + size);
  const nextCursor = selected.length > 0 && safeStart + selected.length < rows.length
    ? `offset:${safeStart + selected.length - 1}`
    : null;
  return {
    rows: selected,
    page: {
      size,
      cursor,
      nextCursor,
      returnedRows: selected.length,
      totalRows: rows.length,
    },
  };
}

export function outcomeForPagedRows(paged: { readonly page: SemanticRuntimePageResult }): SemanticRuntimeAnswerOutcome {
  return paged.page.nextCursor == null
    ? SemanticRuntimeAnswerOutcome.Hit
    : SemanticRuntimeAnswerOutcome.Partial;
}

function cursorStart(
  cursor: string,
  rowCount: number,
): number {
  if (cursor.startsWith('offset:')) {
    const offset = Number.parseInt(cursor.slice('offset:'.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rowCount;
  }
  return rowCount;
}
