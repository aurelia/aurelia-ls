import {
  clampPublicInquiryPageSize,
  InquiryPageRequest,
  PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE,
  PUBLIC_INQUIRY_MAX_PAGE_SIZE,
} from '../inquiry/page.js';
import {
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticRuntimePageInput,
  type SemanticRuntimePageResult,
} from './contracts.js';

const PAGE_CURSOR_AFTER_PREFIX = 'after:';
const PAGE_CURSOR_OFFSET_PREFIX = 'offset:';

export function toPageRequest(page: SemanticRuntimePageInput | undefined): InquiryPageRequest {
  return new InquiryPageRequest(Math.max(0, page?.size ?? PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE), page?.cursor ?? null);
}

export function answer<TValue>(
  outcome: SemanticRuntimeAnswerOutcome | `${SemanticRuntimeAnswerOutcome}`,
  summary: string,
  value: TValue,
  page: SemanticRuntimePageResult | null = null,
  continuations: readonly SemanticRuntimeContinuationRow[] = [],
): SemanticRuntimeAnswer<TValue> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: outcome as SemanticRuntimeAnswerOutcome,
    summary,
    value,
    page,
    ...(continuations.length === 0 ? {} : { continuations }),
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
  const requestedSize = page?.size ?? PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE;
  const size = clampPublicInquiryPageSize(requestedSize);
  const cursor = page?.cursor ?? null;
  const start = cursor == null ? 0 : cursorStart(cursor, rows.length);
  const safeStart = start < 0 ? rows.length : start;
  const selected = rows.slice(safeStart, safeStart + size);
  const nextCursor = selected.length > 0 && safeStart + selected.length < rows.length
    ? `${PAGE_CURSOR_AFTER_PREFIX}${safeStart + selected.length - 1}`
    : null;
  return {
    rows: selected,
    page: {
      size,
      cursor,
      nextCursor,
      returnedRows: selected.length,
      totalRows: rows.length,
      ...(requestedSize === size
        ? {}
        : {
          requestedSize,
          maxSize: PUBLIC_INQUIRY_MAX_PAGE_SIZE,
          clamped: true,
        }),
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
  if (cursor.startsWith(PAGE_CURSOR_AFTER_PREFIX)) {
    const offset = Number.parseInt(cursor.slice(PAGE_CURSOR_AFTER_PREFIX.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rowCount;
  }
  if (cursor.startsWith(PAGE_CURSOR_OFFSET_PREFIX)) {
    const offset = Number.parseInt(cursor.slice(PAGE_CURSOR_OFFSET_PREFIX.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rowCount;
  }
  return rowCount;
}
