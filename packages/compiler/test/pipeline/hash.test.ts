import { describe, test, expect } from "vitest";

import { stableHash, stableHashSemantics, stableSerialize } from "../../src/pipeline/hash.js";

describe("pipeline hash utilities", () => {
  test("stableSerialize sorts object keys deterministically", () => {
    const a = stableHash({ a: 1, b: 2 });
    const b = stableHash({ b: 2, a: 1 });
    expect(a).toBe(b);
  });

  test("stableSerialize normalizes Map/Set ordering", () => {
    const mapA = new Map<string, number>([["a", 1], ["b", 2]]);
    const mapB = new Map<string, number>([["b", 2], ["a", 1]]);
    expect(stableHash(mapA)).toBe(stableHash(mapB));

    const setA = new Set([3, 1, 2]);
    const setB = new Set([2, 3, 1]);
    expect(stableHash(setA)).toBe(stableHash(setB));
  });

  test("stableSerialize handles undefined and function values", () => {
    const text = stableSerialize({ a: undefined, fn: () => null });
    expect(text).toBe('{"a":null,"fn":"<fn>"}');
  });

  test("stableHashSemantics omits node keys", () => {
    const a = stableHashSemantics({ node: { ignored: true }, value: 1 });
    const b = stableHashSemantics({ value: 1 });
    expect(a).toBe(b);
  });
});
