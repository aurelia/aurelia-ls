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
  if (cursor === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function rowLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.page?.size ?? inquiry.budget?.rows, 80, 1_000);
}

export function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
}
