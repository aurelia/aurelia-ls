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
  ) {}
}
