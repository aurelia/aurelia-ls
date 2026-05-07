/** Parsed segment from an inline custom-attribute multi-binding value. */
export class ParsedMultiBindingSegment {
  constructor(
    readonly segmentIndex: number,
    readonly rawName: string,
    readonly rawValue: string,
    readonly start: number,
    readonly end: number,
    readonly valueStart: number,
    readonly valueEnd: number,
  ) {}
}

/** Parse Aurelia inline multi-binding syntax into source-offset-preserving segments. */
export function parseInlineMultiBindingSegments(
  rawValue: string,
): readonly ParsedMultiBindingSegment[] {
  const segments: ParsedMultiBindingSegment[] = [];
  const len = rawValue.length;
  let start = 0;
  let segmentIndex = 0;
  for (let i = 0; i < len; i += 1) {
    const ch = rawValue.charCodeAt(i);
    if (ch === 92 /* backslash */) {
      i += 1;
      continue;
    }
    if (ch !== 58 /* colon */) {
      continue;
    }

    const rawName = rawValue.slice(start, i);
    let valueStart = i + 1;
    while (valueStart < len && rawValue.charCodeAt(valueStart) <= 32 /* space */) {
      valueStart += 1;
    }

    let valueEnd = len;
    let cursor = valueStart;
    for (; cursor < len; cursor += 1) {
      const valueCh = rawValue.charCodeAt(cursor);
      if (valueCh === 92 /* backslash */) {
        cursor += 1;
        continue;
      }
      if (valueCh === 59 /* semicolon */) {
        valueEnd = cursor;
        break;
      }
    }

    segments.push(new ParsedMultiBindingSegment(
      segmentIndex++,
      rawName,
      rawValue.slice(valueStart, valueEnd),
      start,
      valueEnd,
      valueStart,
      valueEnd,
    ));

    let nextStart = valueEnd < len ? valueEnd + 1 : valueEnd;
    while (nextStart < len && rawValue.charCodeAt(nextStart) <= 32 /* space */) {
      nextStart += 1;
    }
    start = nextStart;
    i = nextStart - 1;
  }
  return segments;
}
