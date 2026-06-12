import {
  clampPublicInquiryPageSize,
  InquiryPageRequest,
  PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE,
  PUBLIC_INQUIRY_MAX_PAGE_SIZE,
  PUBLIC_INQUIRY_MAX_PAGE_ROW_JSON_BYTES,
} from '../inquiry/page.js';
import {
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticRuntimeAnswerClosure,
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
  closure: SemanticRuntimeAnswerClosure | `${SemanticRuntimeAnswerClosure}` = closureForAnswer(outcome, page),
): SemanticRuntimeAnswer<TValue> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: outcome as SemanticRuntimeAnswerOutcome,
    closure: closure as SemanticRuntimeAnswerClosure,
    summary,
    value,
    page,
    ...(continuations.length === 0 ? {} : { continuations }),
  };
}

export function closureForAnswer(
  outcome: SemanticRuntimeAnswerOutcome | `${SemanticRuntimeAnswerOutcome}`,
  page: SemanticRuntimePageResult | null = null,
): SemanticRuntimeAnswerClosure {
  if (page?.nextCursor != null) {
    return SemanticRuntimeAnswerClosure.Paged;
  }
  switch (outcome) {
    case SemanticRuntimeAnswerOutcome.Hit:
    case SemanticRuntimeAnswerOutcome.Miss:
      return SemanticRuntimeAnswerClosure.Complete;
    case SemanticRuntimeAnswerOutcome.Unsupported:
      return SemanticRuntimeAnswerClosure.Unsupported;
    case SemanticRuntimeAnswerOutcome.Partial:
      return SemanticRuntimeAnswerClosure.Open;
    default:
      return SemanticRuntimeAnswerClosure.Open;
  }
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
  const pageWindow = rows.slice(safeStart, safeStart + size);
  const selected = rowsWithinEstimatedJsonByteBudget(pageWindow, PUBLIC_INQUIRY_MAX_PAGE_ROW_JSON_BYTES);
  const byteClamped = selected.rows.length < pageWindow.length;
  const nextCursor = selected.rows.length > 0 && safeStart + selected.rows.length < rows.length
    ? `${PAGE_CURSOR_AFTER_PREFIX}${safeStart + selected.rows.length - 1}`
    : null;
  return {
    rows: selected.rows,
    page: {
      size,
      cursor,
      nextCursor,
      returnedRows: selected.rows.length,
      totalRows: rows.length,
      estimatedRowsJsonBytes: selected.estimatedRowsJsonBytes,
      ...(byteClamped
        ? {
          maxRowsJsonBytes: PUBLIC_INQUIRY_MAX_PAGE_ROW_JSON_BYTES,
          byteClamped: true,
        }
        : {}),
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

function rowsWithinEstimatedJsonByteBudget<TRow>(
  rows: readonly TRow[],
  maxBytes: number,
): {
  readonly rows: readonly TRow[];
  readonly estimatedRowsJsonBytes: number;
} {
  if (rows.length === 0) {
    return {
      rows,
      estimatedRowsJsonBytes: 2,
    };
  }

  const selected: TRow[] = [];
  let estimatedBytes = 2;
  for (const row of rows) {
    const rowBytes = estimatedJsonBytes(row);
    const separatorBytes = selected.length === 0 ? 0 : 1;
    if (selected.length > 0 && estimatedBytes + separatorBytes + rowBytes > maxBytes) {
      break;
    }
    selected.push(row);
    estimatedBytes += separatorBytes + rowBytes;
    if (estimatedBytes > maxBytes) {
      break;
    }
  }

  return {
    rows: selected,
    estimatedRowsJsonBytes: estimatedBytes,
  };
}

function estimatedJsonBytes(value: unknown): number {
  const json = JSON.stringify(value);
  return json == null ? 0 : new TextEncoder().encode(json).byteLength;
}
