import { createHash } from 'node:crypto';
import {
  InquiryPageRequest,
  PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE,
} from '../inquiry/page.js';
import {
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticRuntimeDetail,
  SemanticRuntimePageCursorProblemKind,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticRuntimePageCursorProblem,
  type SemanticRuntimePageInput,
  type SemanticRuntimePagePolicy,
  type SemanticRuntimePageResult,
} from './contracts.js';

const PAGE_CURSOR_VERSION = 'srp1';
const PAGE_ORDERING_VERSION = `${SEMANTIC_RUNTIME_API_VERSION}:ordered-rows-v1`;

interface SemanticRuntimePageScope {
  readonly queryKey: string;
  readonly epochKey: string;
  readonly orderingKey: string;
  readonly policy: SemanticRuntimePagePolicy | null;
}

export interface SemanticRuntimeAnswerOptions {
  readonly page?: SemanticRuntimePageResult | null;
  readonly continuations?: readonly SemanticRuntimeContinuationRow[];
  readonly selection: SemanticRuntimeAnswerSelection | `${SemanticRuntimeAnswerSelection}`;
  readonly coverage: SemanticRuntimeAnswerCoverage | `${SemanticRuntimeAnswerCoverage}`;
}

export interface ProjectedPageRowsOptions {
  /**
   * Deterministic cheap identity for the complete ordered candidate universe when a direct internal call did not bind
   * the page to a semantic query/epoch scope. Public runtime pages are already bound and never evaluate this callback.
   */
  readonly unboundCursorBasis: () => unknown;
}

/** Canonical state for collection/static-catalog answers whose semantic basis is fully enumerated. */
export const COMPLETE_COLLECTION_ANSWER_OPTIONS = {
  selection: SemanticRuntimeAnswerSelection.NotApplicable,
  coverage: SemanticRuntimeAnswerCoverage.Complete,
} as const satisfies SemanticRuntimeAnswerOptions;

/** Canonical state for invalid and unsupported requests where semantic coverage was never attempted. */
export const NON_APPLICABLE_ANSWER_OPTIONS = {
  selection: SemanticRuntimeAnswerSelection.NotApplicable,
  coverage: SemanticRuntimeAnswerCoverage.NotApplicable,
} as const satisfies SemanticRuntimeAnswerOptions;

const pageScopes = new WeakMap<SemanticRuntimePageInput, SemanticRuntimePageScope>();

export function toPageRequest(page: SemanticRuntimePageInput | undefined): InquiryPageRequest {
  assertSemanticRuntimePageInput(page);
  return new InquiryPageRequest(page?.size ?? PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE, page?.cursor ?? null);
}

/** Answer-reuse identity for transport page bounds applied before a retained answer is materialized. */
export function semanticRuntimePagePolicyReuseKey(
  policy: SemanticRuntimePagePolicy | null | undefined,
): string {
  assertSemanticRuntimePagePolicy(policy);
  return JSON.stringify([
    normalizedPositiveLimit(policy?.maxSize) ?? 'unbounded-size',
    normalizedPositiveLimit(policy?.maxRowsJsonBytes) ?? 'unbounded-bytes',
  ]);
}

/**
 * Bind an otherwise transport-shaped page request to the semantic query and input generation that own its cursor.
 *
 * The binding is deliberately non-serializable: callers only see opaque cursors, while query identity remains owned by
 * the runtime boundary rather than becoming a client-supplied assertion.
 */
export function bindSemanticRuntimePageInput(
  page: SemanticRuntimePageInput | undefined,
  scope: Omit<SemanticRuntimePageScope, 'policy'>,
  policy?: SemanticRuntimePagePolicy | null,
): SemanticRuntimePageInput {
  assertSemanticRuntimePageInput(page);
  assertSemanticRuntimePagePolicy(policy);
  const bound = {
    size: page?.size,
    cursor: page?.cursor ?? null,
  };
  const inherited = page == null ? null : pageScopes.get(page) ?? null;
  pageScopes.set(bound, {
    queryKey: scope.queryKey,
    epochKey: scope.epochKey,
    orderingKey: scope.orderingKey,
    policy: policy ?? inherited?.policy ?? null,
  });
  return bound;
}

export function answer<TValue>(
  result: SemanticRuntimeAnswerResult | `${SemanticRuntimeAnswerResult}`,
  summary: string,
  value: TValue,
  options: SemanticRuntimeAnswerOptions,
): SemanticRuntimeAnswer<TValue> {
  const cursorProblem = options.page?.cursorProblem;
  const effectiveResult = cursorProblem == null
    ? result as SemanticRuntimeAnswerResult
    : SemanticRuntimeAnswerResult.Invalid;
  const selection = cursorProblem == null
    ? options.selection
    : SemanticRuntimeAnswerSelection.NotApplicable;
  const coverage = cursorProblem == null
    ? options.coverage
    : SemanticRuntimeAnswerCoverage.NotApplicable;
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    result: effectiveResult,
    selection: selection as SemanticRuntimeAnswerSelection,
    coverage: coverage as SemanticRuntimeAnswerCoverage,
    summary: cursorProblem?.message ?? summary,
    value,
    page: options.page ?? null,
    ...(options.continuations == null || options.continuations.length === 0
      ? {}
      : { continuations: options.continuations }),
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
  return pageProjectedRows(rows, page, (row) => row, {
    // Preserve the pre-existing direct-call cursor fingerprint byte for byte.
    unboundCursorBasis: () => rows,
  });
}

/**
 * Page a deterministic one-candidate-to-one-row universe before spending its potentially expensive public projection.
 *
 * Ordering and filtering belong to the caller. With a byte policy, one rejected projected row may be inspected as the
 * exact budget lookahead; it never advances the cursor or enters the returned page.
 */
export function pageProjectedRows<TCandidate, TRow>(
  orderedCandidates: readonly TCandidate[],
  page: SemanticRuntimePageInput | undefined,
  projectRow: (candidate: TCandidate) => TRow,
  options: ProjectedPageRowsOptions,
): {
  readonly rows: readonly TRow[];
  readonly page: SemanticRuntimePageResult;
} {
  assertSemanticRuntimePageInput(page);
  const scope = page == null ? null : pageScopes.get(page) ?? null;
  const policy = scope?.policy ?? null;
  const requestedSize = page?.size ?? PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE;
  const maxSize = normalizedPositiveLimit(policy?.maxSize);
  const size = maxSize == null ? requestedSize : Math.min(requestedSize, maxSize);
  const cursor = page?.cursor ?? null;
  const cursorScope = pageCursorScope(scope, options.unboundCursorBasis);
  const parsed = cursor == null
    ? { start: 0, problem: null }
    : parsePageCursor(cursor, cursorScope, orderedCandidates.length);
  if (parsed.problem != null) {
    return {
      rows: [],
      page: pageResult({
        requestedSize,
        size,
        cursor,
        nextCursor: null,
        returnedRows: 0,
        totalRows: orderedCandidates.length,
        exhausted: false,
        cursorProblem: parsed.problem,
        maxSize,
      }),
    };
  }

  const start = parsed.start;
  const pageWindow = orderedCandidates.slice(start, start + size);
  const maxRowsJsonBytes = normalizedPositiveLimit(policy?.maxRowsJsonBytes);
  const selected = maxRowsJsonBytes == null
    ? projectPageWindow(pageWindow, projectRow)
    : projectRowsWithinEstimatedJsonByteBudget(pageWindow, projectRow, maxRowsJsonBytes);
  const byteClamped = selected.rows.length < pageWindow.length;
  const nextOffset = start + selected.rows.length;
  const exhausted = nextOffset >= orderedCandidates.length;
  const nextCursor = exhausted
    ? null
    : encodePageCursor(cursorScope, nextOffset);
  return {
    rows: selected.rows,
    page: pageResult({
      requestedSize,
      size,
      cursor,
      nextCursor,
      returnedRows: selected.rows.length,
      totalRows: orderedCandidates.length,
      exhausted,
      estimatedRowsJsonBytes: selected.estimatedRowsJsonBytes,
      maxRowsJsonBytes,
      byteClamped,
      maxSize,
    }),
  };
}

function pageCursorScope(
  scope: SemanticRuntimePageScope | null,
  unboundCursorBasis: () => unknown,
): Required<Pick<SemanticRuntimePageScope, 'queryKey' | 'epochKey' | 'orderingKey'>> {
  if (scope != null) {
    return scope;
  }
  const serializedBasis = JSON.stringify(unboundCursorBasis());
  if (serializedBasis == null) {
    throw new TypeError('Semantic-runtime direct page cursor basis must be JSON-serializable.');
  }
  return {
    queryKey: 'direct-pageRows-call',
    epochKey: fingerprint(serializedBasis),
    orderingKey: PAGE_ORDERING_VERSION,
  };
}

function encodePageCursor(
  scope: Required<Pick<SemanticRuntimePageScope, 'queryKey' | 'epochKey' | 'orderingKey'>>,
  offset: number,
): string {
  return [
    PAGE_CURSOR_VERSION,
    fingerprint(scope.queryKey),
    fingerprint(scope.epochKey),
    fingerprint(`${PAGE_ORDERING_VERSION}:${scope.orderingKey}`),
    String(offset),
  ].join('.');
}

function parsePageCursor(
  cursor: string,
  scope: Required<Pick<SemanticRuntimePageScope, 'queryKey' | 'epochKey' | 'orderingKey'>>,
  rowCount: number,
): { readonly start: number; readonly problem: SemanticRuntimePageCursorProblem | null } {
  const parts = cursor.split('.');
  if (parts.length !== 5 || parts[0] !== PAGE_CURSOR_VERSION || !/^(0|[1-9]\d*)$/.test(parts[4] ?? '')) {
    return cursorProblem(
      SemanticRuntimePageCursorProblemKind.Malformed,
      'The page cursor is malformed or belongs to an unsupported cursor version; restart paging without a cursor.',
    );
  }
  if (parts[1] !== fingerprint(scope.queryKey)) {
    return cursorProblem(
      SemanticRuntimePageCursorProblemKind.QueryMismatch,
      'The page cursor belongs to a different query shape or selector set; restart paging without a cursor.',
    );
  }
  if (parts[2] !== fingerprint(scope.epochKey)) {
    return cursorProblem(
      SemanticRuntimePageCursorProblemKind.Stale,
      'The page cursor belongs to an older project input generation; restart paging against the current sources.',
    );
  }
  if (parts[3] !== fingerprint(`${PAGE_ORDERING_VERSION}:${scope.orderingKey}`)) {
    return cursorProblem(
      SemanticRuntimePageCursorProblemKind.OrderingMismatch,
      'The page cursor belongs to a different row-ordering contract; restart paging without a cursor.',
    );
  }
  const offsetText = parts[4] as string;
  const start = Number.parseInt(offsetText, 10);
  if (!Number.isSafeInteger(start) || start > rowCount) {
    return cursorProblem(
      SemanticRuntimePageCursorProblemKind.OffsetOutOfRange,
      `The page cursor offset ${offsetText} is outside the current ${rowCount}-row result; restart paging without a cursor.`,
    );
  }
  return { start, problem: null };
}

function cursorProblem(
  kind: SemanticRuntimePageCursorProblemKind,
  message: string,
): { readonly start: number; readonly problem: SemanticRuntimePageCursorProblem } {
  return {
    start: 0,
    problem: { kind, message },
  };
}

function pageResult(input: {
  readonly requestedSize: number;
  readonly size: number;
  readonly cursor: string | null;
  readonly nextCursor: string | null;
  readonly returnedRows: number;
  readonly totalRows: number;
  readonly exhausted: boolean;
  readonly cursorProblem?: SemanticRuntimePageCursorProblem;
  readonly estimatedRowsJsonBytes?: number;
  readonly maxRowsJsonBytes?: number | null;
  readonly byteClamped?: boolean;
  readonly maxSize?: number | null;
}): SemanticRuntimePageResult {
  return {
    size: input.size,
    cursor: input.cursor,
    nextCursor: input.nextCursor,
    returnedRows: input.returnedRows,
    totalRows: input.totalRows,
    exhausted: input.exhausted,
    ...(input.cursorProblem == null ? {} : { cursorProblem: input.cursorProblem }),
    ...(input.estimatedRowsJsonBytes == null ? {} : { estimatedRowsJsonBytes: input.estimatedRowsJsonBytes }),
    ...(input.maxRowsJsonBytes == null ? {} : { maxRowsJsonBytes: input.maxRowsJsonBytes }),
    ...(input.byteClamped === true ? { byteClamped: true } : {}),
    ...(input.maxSize == null || input.requestedSize === input.size
      ? {}
      : {
        requestedSize: input.requestedSize,
        maxSize: input.maxSize,
        clamped: true,
      }),
  };
}

function normalizedPositiveLimit(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return value;
}

function assertSemanticRuntimePageInput(
  page: SemanticRuntimePageInput | null | undefined,
): void {
  const size = page?.size;
  if (size != null && (!Number.isSafeInteger(size) || size < 0)) {
    throw new RangeError(`Semantic-runtime page size must be a non-negative safe integer; received ${String(size)}.`);
  }
}

function assertSemanticRuntimePagePolicy(
  policy: SemanticRuntimePagePolicy | null | undefined,
): void {
  for (const [name, value] of [
    ['maxSize', policy?.maxSize],
    ['maxRowsJsonBytes', policy?.maxRowsJsonBytes],
  ] as const) {
    if (value != null && (!Number.isSafeInteger(value) || value <= 0)) {
      throw new RangeError(`Semantic-runtime page policy ${name} must be a positive safe integer; received ${String(value)}.`);
    }
  }
}

function projectPageWindow<TCandidate, TRow>(
  candidates: readonly TCandidate[],
  projectRow: (candidate: TCandidate) => TRow,
): {
  readonly rows: readonly TRow[];
  readonly estimatedRowsJsonBytes: number;
} {
  const rows = candidates.map(projectRow);
  return {
    rows,
    estimatedRowsJsonBytes: estimatedJsonBytes(rows),
  };
}

function projectRowsWithinEstimatedJsonByteBudget<TCandidate, TRow>(
  candidates: readonly TCandidate[],
  projectRow: (candidate: TCandidate) => TRow,
  maxBytes: number,
): {
  readonly rows: readonly TRow[];
  readonly estimatedRowsJsonBytes: number;
} {
  if (candidates.length === 0) {
    return {
      rows: [],
      estimatedRowsJsonBytes: 2,
    };
  }

  const selected: TRow[] = [];
  let estimatedBytes = 2;
  for (const candidate of candidates) {
    const row = projectRow(candidate);
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

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('base64url').slice(0, 16);
}
