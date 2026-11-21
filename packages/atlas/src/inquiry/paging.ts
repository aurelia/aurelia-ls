import type { Inquiry } from "./inquiry.js";
import { clampBudget } from "./budget.js";

export interface PageRows<TValue> {
  readonly rows: readonly TValue[];
  readonly nextOffset?: number;
}

export function pageInfo(
  inquiry: Inquiry,
  returned: number,
  total: number,
  limit: number,
  nextOffset: number | undefined,
) {
  return {
    size: limit,
    cursor: inquiry.page?.cursor,
    returned,
    total,
    nextCursor: nextOffset === undefined ? undefined : String(nextOffset),
  };
}

export function pageRows<TValue>(
  rows: readonly TValue[],
  offset: number,
  limit: number,
): PageRows<TValue> {
  const page = rows.slice(offset, offset + limit);
  const nextOffset =
    offset + page.length < rows.length ? offset + page.length : undefined;
  return {
    rows: page,
    nextOffset,
  };
}

export function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  return cursor === undefined ? 0 : parseOffsetCursor(cursor) ?? 0;
}

/** Read a complete decimal cursor component emitted by an offset-based row family. */
export function parseOffsetCursor(cursor: string): number | undefined {
  if (!/^\d+$/u.test(cursor)) return undefined;
  const offset = Number(cursor);
  return Number.isSafeInteger(offset) ? offset : undefined;
}

export function rowLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.page?.size ?? inquiry.budget?.rows, 80, 1_000);
}

export function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
}
