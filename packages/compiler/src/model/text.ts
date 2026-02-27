import type { SourceFileId } from "./identity.js";
import type { SourceSpan } from "./span.js";
import { normalizeSpan } from "./span.js";

// Canonical text/offset helpers to avoid ad-hoc span math across layers.
export interface Position {
  line: number;
  character: number;
}

export interface TextRange {
  start: Position;
  end: Position;
}

export function spanToRange(span: SourceSpan, text: string): TextRange {
  return {
    start: positionAtOffset(text, span.start),
    end: positionAtOffset(text, span.end),
  };
}

export function rangeToSpan(
  range: TextRange,
  text: string,
  file?: SourceFileId,
): SourceSpan | null {
  const start = offsetAtPosition(text, range.start);
  const end = offsetAtPosition(text, range.end);
  if (start == null || end == null) return null;
  const span: SourceSpan = file ? { start, end, file } : { start, end };
  return normalizeSpan(span);
}

export function positionAtOffset(text: string, offset: number): Position {
  const length = text.length;
  const clamped = Math.max(0, Math.min(offset, length));
  const lineStarts = computeLineStarts(text);
  let line = 0;
  while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Number.POSITIVE_INFINITY) <= clamped) {
    line += 1;
  }
  const lineStart = lineStarts[line] ?? 0;
  const character = clamped - lineStart;
  return { line, character };
}

export function offsetAtPosition(text: string, position: Position): number | null {
  if (position.line < 0 || position.character < 0) return null;
  const lineStarts = computeLineStarts(text);
  if (position.line >= lineStarts.length) return null;
  const lineStart = lineStarts[position.line];
  if (lineStart === undefined) return null;
  const nextLine = lineStarts[position.line + 1];
  const lineEnd = nextLine ?? text.length;
  return Math.min(lineEnd, lineStart + position.character);
}

export function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 13 /* CR */ || ch === 10 /* LF */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      starts.push(i + 1);
    }
  }
  return starts;
}
