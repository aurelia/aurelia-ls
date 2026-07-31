/** Default row count for public semantic-runtime API pages when callers omit page.size. */
export const PUBLIC_INQUIRY_DEFAULT_PAGE_SIZE = 50;

export class InquiryPageRequest {
  constructor(
    /** Maximum rows requested for this page. */
    readonly size: number = 200,
    /** Opaque cursor returned by a previous answer; null starts at the first row. */
    readonly cursor: string | null = null,
  ) {}
}

export class InquiryPageInfo {
  constructor(
    /** Requested page size after local clamping or defaults. */
    readonly size: number,
    /** Cursor used to request this page. */
    readonly cursor: string | null,
    /** Cursor for the next page, or null when there is no known next page. */
    readonly nextCursor: string | null,
    /** Rows returned in this page. */
    readonly returned: number,
    /** Total rows in the current store/query basis when cheaply known. */
    readonly total: number | null = null,
    /** Caller-requested size before public page-size clamping. */
    readonly requestedSize: number | null = null,
    /** Maximum public page size applied when the request was clamped. */
    readonly maxSize: number | null = null,
    /** True when size is smaller than the caller-requested page size. */
    readonly clamped: boolean = false,
    /** Estimated UTF-8 JSON bytes for the returned row array. */
    readonly estimatedRowsJsonBytes: number | null = null,
    /** Maximum estimated row JSON bytes used when this page stopped early by payload budget. */
    readonly maxRowsJsonBytes: number | null = null,
    /** True when row selection stopped before `size` because the estimated row payload budget was reached. */
    readonly byteClamped: boolean = false,
  ) {}
}
