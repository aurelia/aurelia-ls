/**
 * Parser-local source span carriers.
 *
 * This file exists so the expression parser does not depend on the removed pre-kernel address scaffold. These spans
 * are parser-local current-input coordinates, not kernel addresses. Callers that need durable
 * navigation should translate parser spans into kernel `SourceSpanAddress` records at the materializer boundary.
 */

export class SourceFileRef {
  constructor(
    readonly id: string,
    readonly path: string,
  ) {}
}

// Keep span carriers method-free so they stay cheap, structurally friendly,
// and easy to pass through parser-local helper layers without extra wrappers.
export class TextSpan {
  constructor(
    readonly start: number,
    readonly end: number,
  ) {}
}

export class SourceSpan {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly file?: SourceFileRef | null,
  ) {}
}

export type SpanLike = TextSpan | SourceSpan;

export function expressionSpanContainsOffset(
  span: SpanLike,
  offset: number,
): boolean {
  return span.start <= offset && offset <= span.end;
}

function hasSourceSpanFileSlot(span: SpanLike): span is SourceSpan {
  return span instanceof SourceSpan
    || Object.prototype.hasOwnProperty.call(span, 'file');
}

function recreateSpanLike<TSpan extends SpanLike>(
  span: TSpan,
  start: number,
  end: number,
): TSpan {
  return (
    hasSourceSpanFileSlot(span)
      ? new SourceSpan(start, end, span.file ?? null)
      : new TextSpan(start, end)
  ) as TSpan;
}

export function normalizeSpan(span: SourceSpan): SourceSpan;
export function normalizeSpan(span: TextSpan): TextSpan;

export function normalizeSpan<TSpan extends SpanLike>(
  span: TSpan,
): TSpan {
  if (span.start <= span.end) {
    return span;
  }

  return recreateSpanLike(span, span.end, span.start);
}

export function spanFromBounds(
  start: number,
  end: number,
): TextSpan {
  return start <= end
    ? new TextSpan(start, end)
    : new TextSpan(end, start);
}

export function sourceSpanFromBounds(
  start: number,
  end: number,
  file: SourceFileRef | null = null,
): SourceSpan {
  return start <= end
    ? new SourceSpan(start, end, file)
    : new SourceSpan(end, start, file);
}

export function absoluteSpan(
  relative: TextSpan | null | undefined,
  base: SourceSpan | null | undefined,
): SourceSpan | null {
  if (relative == null || base == null) {
    return null;
  }

  const start = base.start + relative.start;
  const end = base.start + relative.end;
  return sourceSpanFromBounds(start, end, base.file ?? null);
}

export function absoluteTextSpan(
  relative: TextSpan,
  base: SourceSpan,
): SourceSpan {
  const start = base.start + relative.start;
  const end = base.start + relative.end;
  return sourceSpanFromBounds(start, end, base.file ?? null);
}

export function ensureSpanFile(
  span: SourceSpan | null | undefined,
  file: SourceFileRef | null | undefined,
): SourceSpan | null {
  if (span == null) {
    return null;
  }

  if (span.file != null || file == null) {
    return normalizeSpan(span);
  }

  return sourceSpanFromBounds(span.start, span.end, file);
}
