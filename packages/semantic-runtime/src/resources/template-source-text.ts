import { TemplateSourceOffsetMap } from './custom-element-definition.js';

export class TemplateSourceTextView {
  constructor(
    readonly markup: string,
    readonly sourceMap: TemplateSourceOffsetMap | null,
  ) {}
}

/** Remove source ranges while retaining an exact boundary map to the original markup. */
export function stripTemplateSourceRanges(
  markup: string,
  ranges: readonly (readonly [number, number])[],
): TemplateSourceTextView {
  if (ranges.length === 0) {
    return new TemplateSourceTextView(markup, null);
  }

  const pieces: string[] = [];
  const offsets: number[] = [];
  let cursor = 0;
  for (const [start, end] of normalizeTemplateSourceRanges(ranges, markup.length)) {
    appendKeptRange(markup, cursor, start, pieces, offsets);
    cursor = end;
  }
  appendKeptRange(markup, cursor, markup.length, pieces, offsets);
  offsets.push(markup.length);

  const stripped = pieces.join('');
  return new TemplateSourceTextView(
    stripped,
    new TemplateSourceOffsetMap(stripped.length, offsets),
  );
}

/** Blank compiler-owned carriers in place so every surviving source offset remains stable. */
export function blankTemplateSourceRanges(
  markup: string,
  ranges: readonly (readonly [number, number])[],
): string {
  if (ranges.length === 0) {
    return markup;
  }
  const characters = markup.split('');
  for (const [start, end] of normalizeTemplateSourceRanges(ranges, markup.length)) {
    for (let index = start; index < end; index++) {
      const character = characters[index];
      if (character !== '\r' && character !== '\n') {
        characters[index] = ' ';
      }
    }
  }
  return characters.join('');
}

/** Slice one contiguous compiler source view while preserving any existing authored-source mapping. */
export function sliceTemplateSourceText(
  markup: string,
  sourceMap: TemplateSourceOffsetMap | null,
  start: number,
  end: number,
): TemplateSourceTextView {
  const boundedStart = Math.max(0, Math.min(markup.length, start));
  const boundedEnd = Math.max(boundedStart, Math.min(markup.length, end));
  const sliced = markup.slice(boundedStart, boundedEnd);
  if (sourceMap == null) {
    return new TemplateSourceTextView(sliced, null);
  }
  const offsets = sourceMap.decodedToSourceOffsets.slice(boundedStart, boundedEnd + 1);
  return offsets.length === sliced.length + 1
    ? new TemplateSourceTextView(sliced, new TemplateSourceOffsetMap(sliced.length, offsets))
    : new TemplateSourceTextView(sliced, null);
}

function appendKeptRange(
  markup: string,
  start: number,
  end: number,
  pieces: string[],
  offsets: number[],
): void {
  if (end <= start) {
    return;
  }
  pieces.push(markup.slice(start, end));
  for (let index = start; index < end; index++) {
    offsets.push(index);
  }
}

function normalizeTemplateSourceRanges(
  ranges: readonly (readonly [number, number])[],
  textLength: number,
): readonly (readonly [number, number])[] {
  const sorted = ranges
    .map(([start, end]) => [Math.max(0, start), Math.min(textLength, end)] as const)
    .filter(([start, end]) => end > start)
    .sort(([leftStart, leftEnd], [rightStart, rightEnd]) =>
      leftStart - rightStart || leftEnd - rightEnd
    );
  const result: Array<readonly [number, number]> = [];
  for (const [start, end] of sorted) {
    const previous = result[result.length - 1] ?? null;
    if (previous == null || start > previous[1]) {
      result.push([start, end]);
      continue;
    }
    result[result.length - 1] = [previous[0], Math.max(previous[1], end)];
  }
  return result;
}
