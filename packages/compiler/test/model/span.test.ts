import { describe, test, expect } from "vitest";

import {
  spanLength,
  normalizeSpan,
  normalizeSpanMaybe,
  spanFromBounds,
  spanFromRange,
  isEmptySpan,
  coverSpans,
  offsetSpan,
  intersectSpans,
  spanContains,
  spanEquals,
  spanContainsOffset,
  narrowestContainingSpan,
  pickNarrowestContaining,
  toSourceSpan,
  toSourceLoc,
  toSourceFileId,
} from "../../src/model/span.js";

describe("span utilities", () => {
  test("spanLength and empties", () => {
    expect(spanLength(null)).toBe(0);
    expect(spanLength({ start: 5, end: 5 })).toBe(0);
    expect(spanLength({ start: 10, end: 3 })).toBe(0);
    expect(isEmptySpan({ start: 2, end: 2 })).toBe(true);
  });

  test("normalizeSpan swaps bounds when inverted", () => {
    const norm = normalizeSpan({ start: 9, end: 2 });
    expect(norm.start).toBe(2);
    expect(norm.end).toBe(9);
    expect(normalizeSpanMaybe(null)).toBeNull();
  });

  test("spanFromBounds/spanFromRange normalize", () => {
    expect(spanFromBounds(3, 1)).toEqual({ start: 1, end: 3 });
    expect(spanFromRange([5, 7])).toEqual({ start: 5, end: 7 });
  });

  test("coverSpans merges and preserves file metadata", () => {
    const file = toSourceFileId("/app/main.html");
    const spans = [
      { start: 10, end: 12, file },
      { start: 2, end: 5, file },
      null,
    ];
    const merged = coverSpans(spans);
    expect(merged).toEqual({ start: 2, end: 12, file });
  });

  test("offsetSpan shifts spans and intersectSpans handles overlap", () => {
    expect(offsetSpan({ start: 1, end: 3 }, 2)).toEqual({ start: 3, end: 5 });
    expect(intersectSpans({ start: 0, end: 5 }, { start: 3, end: 6 })).toEqual({
      start: 3,
      end: 5,
    });
    expect(intersectSpans({ start: 0, end: 2 }, { start: 3, end: 5 })).toBeNull();
  });

  test("spanContains/spanEquals/spanContainsOffset", () => {
    const a = { start: 0, end: 10 };
    const b = { start: 2, end: 5 };
    expect(spanContains(a, b)).toBe(true);
    expect(spanContains(b, a)).toBe(false);
    expect(spanEquals(a, b)).toBe(false);
    expect(spanContainsOffset(a, 9)).toBe(true);
    expect(spanContainsOffset(a, 10)).toBe(false);
  });

  test("narrowestContainingSpan/pickNarrowestContaining", () => {
    const spans = [
      { start: 0, end: 10, tag: "wide" },
      { start: 2, end: 6, tag: "narrow" },
      { start: 3, end: 4, tag: "tight" },
    ];
    const narrowest = narrowestContainingSpan(spans, 3);
    expect(narrowest?.tag).toBe("tight");

    const picked = pickNarrowestContaining(spans, 3, (s) => s);
    expect(picked?.tag).toBe("tight");
  });

  test("toSourceSpan/toSourceLoc attach file", () => {
    const file = toSourceFileId("/app/entry.html");
    const span = { start: 1, end: 4 };
    expect(toSourceSpan(span)).toEqual({ start: 1, end: 4 });
    expect(toSourceSpan(span, file)).toEqual({ start: 1, end: 4, file });
    expect(toSourceLoc(span, file)).toEqual({ file, span });
  });
});
