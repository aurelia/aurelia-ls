/* =======================================================================================
 * Span primitives (text/source ranges)
 * ---------------------------------------------------------------------------------------
 * - Minimal shared shapes for authored/source offsets
 * - Helpers for length/coverage/offset/normalization
 * ======================================================================================= */

import type { SourceFileId } from "./identity.js";

export interface TextSpan {
  /**
   * Offsets into the expression string being parsed.
   * 0-based UTF-16 code units, [start, end) (end is exclusive).
   */
  start: number;
  end: number;
}

export interface SourceSpan extends TextSpan {
  file?: SourceFileId | string;
}

export interface SourceLoc {
  file: SourceFileId | string;
  span: TextSpan;
}

export type SpanLike = TextSpan | SourceSpan;

export function spanLength(span: SpanLike | null | undefined): number {
  return span ? Math.max(0, span.end - span.start) : 0;
}

export function isEmptySpan(span: SpanLike | null | undefined): boolean {
  return spanLength(span) === 0;
}

export function normalizeSpan<TSpan extends SpanLike>(span: TSpan): TSpan {
  if (span.start <= span.end) return span;
  return { ...span, start: span.end, end: span.start } as TSpan;
}

export function coverSpans<TSpan extends SpanLike>(spans: Iterable<TSpan | null | undefined>): TSpan | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let template: TSpan | undefined;

  for (const span of spans) {
    if (!span) continue;
    template ??= span;
    min = Math.min(min, span.start);
    max = Math.max(max, span.end);
  }

  if (!template || min === Number.POSITIVE_INFINITY) return null;
  return { ...(template as object), start: min, end: max } as TSpan;
}

export function offsetSpan<TSpan extends SpanLike>(span: TSpan, delta: number): TSpan {
  return { ...span, start: span.start + delta, end: span.end + delta } as TSpan;
}

export function intersectSpans<TSpan extends SpanLike>(
  a: TSpan | null | undefined,
  b: TSpan | null | undefined,
): TSpan | null {
  if (!a || !b) return null;
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  if (end <= start) return null;
  return { ...(a as object), start, end } as TSpan;
}

export function spanContains(haystack: SpanLike | null | undefined, needle: SpanLike | null | undefined): boolean {
  if (!haystack || !needle) return false;
  return haystack.start <= needle.start && haystack.end >= needle.end;
}

export function spanEquals(a: SpanLike | null | undefined, b: SpanLike | null | undefined): boolean {
  if (!a || !b) return false;
  return a.start === b.start && a.end === b.end && ("file" in a ? (a as SourceSpan).file : undefined) === ("file" in b ? (b as SourceSpan).file : undefined);
}

export function toSourceSpan(span: TextSpan, file?: string): SourceSpan {
  return file === undefined ? { ...span } : { ...span, file };
}

export function toSourceLoc(span: TextSpan, file: SourceFileId | string): SourceLoc {
  return { file, span };
}
