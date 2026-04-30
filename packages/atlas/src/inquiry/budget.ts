/** Budget lanes shared by large inquiry answers. */
export interface Budget {
  /** Generic row limit for tabular or list-shaped answers. */
  readonly rows?: number;
  /** Group limit for clustered evidence or grouped projection rows. */
  readonly groups?: number;
  /** Fact limit for normalized fact projections. */
  readonly facts?: number;
  /** Route limit for path, corridor, or graph-route projections. */
  readonly routes?: number;
  /** Evidence rows retained per subject before continuations should broaden. */
  readonly evidencePerSubject?: number;
  /** Traversal or evaluator depth limit. */
  readonly depth?: number;
  /** Maximum source text characters returned. */
  readonly textChars?: number;
}

/** Caller request for one page of an ordered answer. */
export interface PageRequest {
  /** Requested page size before local clamping. */
  readonly size?: number;
  /** Opaque cursor returned by a previous answer. */
  readonly cursor?: string;
}

/** Page state returned by an answer. */
export interface PageInfo {
  /** Effective page size used by the lens. */
  readonly size: number;
  /** Cursor consumed for this page, if any. */
  readonly cursor?: string;
  /** Cursor for the next page, when another page is known. */
  readonly nextCursor?: string;
  /** Number of rows returned in this page. */
  readonly returned: number;
  /** Total rows when the lens can cheaply know the full basis. */
  readonly total?: number;
}

/** Clamp one numeric budget lane into a positive bounded integer. */
export function clampBudget(value: number | undefined, defaultValue: number, max: number): number {
  if (value === undefined) {
    return defaultValue;
  }
  return Math.max(1, Math.min(Math.trunc(value), max));
}

/** Merge caller and lens budgets, letting the later budget override exact lanes. */
export function mergeBudget(base: Budget | undefined, override: Budget | undefined): Budget | undefined {
  if (base === undefined) {
    return override;
  }
  if (override === undefined) {
    return base;
  }
  return {
    ...base,
    ...override,
  };
}
