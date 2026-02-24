import path from "node:path";
import { describe, test, expect } from "vitest";

import { resolveSourceFile, toSourceFileId, normalizePathForId } from "../../out/model/index.js";
import {
  authoredOrigin,
  syntheticOrigin,
  inferredOrigin,
  provenanceSpan,
  authoredProvenance,
  syntheticProvenance,
  inferredProvenance,
  preferOrigin,
  appendTrace,
  originFromSpan,
  provenanceFromSpan,
} from "../../out/model/origin.js";
import {
  brandString,
  idKey,
  idFromKey,
  unbrand,
  idMapGet,
  toIdMap,
  idMapEntries,
  exprIdMapGet,
  toExprIdMap,
  hashIdentity,
  deterministicStringId,
  defaultPathCaseSensitivity,
  HierarchicalIdBuilder,
  NodeIdGen,
  DomIdAllocator,
  NodeAddressBuilder,
  SequentialIdAllocator,
  FrameIdAllocator,
} from "../../out/model/identity.js";
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
} from "../../out/model/span.js";

// ===========================================================================
// source
// ===========================================================================

describe("source file resolution", () => {
  test("resolveSourceFile keeps SourceFileId/hashKey stable for absolute input across cwd changes", () => {
    const root = path.resolve(path.sep, "repo");
    const absolute = path.join(root, "src", "app.html");
    const fromRoot = resolveSourceFile(absolute, root);
    const fromNested = resolveSourceFile(absolute, path.join(root, "packages"));

    expect(fromRoot.id).toBe(toSourceFileId(absolute));
    expect(fromNested.id).toBe(toSourceFileId(absolute));
    expect(fromRoot.hashKey).toBe(normalizePathForId(absolute));
    expect(fromNested.hashKey).toBe(normalizePathForId(absolute));
  });

  test("resolveSourceFile canonicalizes relative input to the same absolute identity", () => {
    const root = path.resolve(path.sep, "repo");
    const relative = path.join("src", "component.html");
    const absolute = path.join(root, "src", "component.html");
    const fromRelative = resolveSourceFile(relative, root);
    const fromAbsolute = resolveSourceFile(absolute, root);

    expect(fromRelative.id).toBe(toSourceFileId(absolute));
    expect(fromAbsolute.id).toBe(toSourceFileId(absolute));
    expect(fromRelative.hashKey).toBe(normalizePathForId(absolute));
    expect(fromAbsolute.hashKey).toBe(normalizePathForId(absolute));
  });
});

// ===========================================================================
// origin
// ===========================================================================

describe("origin helpers", () => {
  test("origin builders attach kind, span, and description", () => {
    const span = { start: 1, end: 4 };
    const authored = authoredOrigin(span, "authored");
    const synthetic = syntheticOrigin("synthetic", span, authored);
    const inferred = inferredOrigin("inferred", null, synthetic);

    expect(authored).toEqual({ kind: "authored", span, description: "authored" });
    expect(synthetic.kind).toBe("synthetic");
    expect(synthetic.derivedFrom).toBe(authored);
    expect(inferred.kind).toBe("inferred");
    expect(inferred.span).toBeNull();
  });

  test("provenanceSpan prefers origin span, then fallback span", () => {
    const origin = authoredOrigin({ start: 2, end: 5 });
    const fallback = { start: 10, end: 12 };

    expect(provenanceSpan(origin)).toEqual({ start: 2, end: 5 });
    expect(provenanceSpan({ origin, fallbackSpan: fallback })).toEqual({ start: 2, end: 5 });
    expect(provenanceSpan({ origin: null, fallbackSpan: fallback })).toEqual(fallback);
    expect(provenanceSpan(null)).toBeNull();
  });

  test("provenance builders wrap origin + fallback span", () => {
    const span = { start: 3, end: 7 };
    const authored = authoredProvenance(span, "auth");
    const synthetic = syntheticProvenance("syn", span);
    const inferred = inferredProvenance("inf", null);

    expect(authored.origin?.kind).toBe("authored");
    expect(authored.fallbackSpan).toEqual(span);
    expect(synthetic.origin?.kind).toBe("synthetic");
    expect(inferred.origin?.kind).toBe("inferred");
    expect(inferred.fallbackSpan).toBeNull();
  });

  test("preferOrigin, appendTrace, and originFromSpan", () => {
    const span = { start: 1, end: 2 };
    const base = authoredOrigin(span);
    const next = syntheticOrigin("next");

    expect(preferOrigin(null, next)).toBe(next);
    expect(preferOrigin(base, next)).toBe(base);

    const traced = appendTrace(base, { by: "stage-1", span });
    expect(traced.trace?.length).toBe(1);

    const withTrace = originFromSpan("stage-2", span, "desc");
    expect(withTrace.trace?.[0]?.by).toBe("stage-2");
    expect(withTrace.description).toBe("desc");
  });

  test("provenanceFromSpan attaches origin trace and fallback", () => {
    const span = { start: 4, end: 9 };
    const prov = provenanceFromSpan("stage-3", span);
    expect(prov.fallbackSpan).toEqual(span);
    expect(prov.origin?.trace?.[0]?.by).toBe("stage-3");
  });
});

// ===========================================================================
// identity
// ===========================================================================

describe("identity helpers", () => {
  test("branding helpers round-trip id values", () => {
    const id = brandString<"ExprId">("expr-1");
    expect(unbrand(id)).toBe("expr-1");
    expect(idKey(id)).toBe("expr-1");
    expect(idFromKey<"ExprId">(idKey(id))).toBe(id);
  });

  test("id map helpers support map and record inputs", () => {
    const id = brandString<"ExprId">("e1");
    const map = new Map([[id, 10]]);
    const record = { [id]: 20 } as Record<string, number>;

    expect(idMapGet(map, id)).toBe(10);
    expect(idMapGet(record as unknown as Record<string, number>, id)).toBe(20);
    expect(idMapGet(null, id)).toBeUndefined();
  });

  test("toIdMap/idMapEntries skip undefined record values", () => {
    const id = brandString<"ExprId">("e1");
    const missing = brandString<"ExprId">("e2");
    const record = { [id]: "value", [missing]: undefined } as Record<string, string | undefined>;

    const map = toIdMap(record as unknown as Record<string, string>);
    expect(map.size).toBe(1);
    expect(map.get(id)).toBe("value");

    const entries = Array.from(idMapEntries(record as unknown as Record<string, string>));
    expect(entries).toEqual([[id, "value"]]);
  });

  test("exprIdMap helpers adapt the generic map utilities", () => {
    const id = brandString<"ExprId">("expr");
    const record = { [id]: 42 } as Record<string, number>;

    expect(exprIdMapGet(record as unknown as Record<string, number>, id)).toBe(42);
    expect(toExprIdMap(record as unknown as Record<string, number>).get(id)).toBe(42);
  });

  test("hashIdentity and deterministicStringId are stable", () => {
    expect(hashIdentity("hello")).toBe(hashIdentity("hello"));
    expect(hashIdentity("hello")).not.toBe(hashIdentity("world"));

    const id1 = deterministicStringId<"ExprId">("expr", ["a", "b"]);
    const id2 = deterministicStringId<"ExprId">("expr", ["a", "b"]);
    const id3 = deterministicStringId<"ExprId">("expr", ["a", "c"]);

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1.startsWith("expr_")).toBe(true);
  });

  test("normalizePathForId and toSourceFileId respect the shared case oracle", () => {
    const normalized = normalizePathForId("C:\\Foo\\Bar");
    const expected = defaultPathCaseSensitivity() ? "C:/Foo/Bar" : "c:/foo/bar";

    expect(normalized).toBe(expected);
    expect(toSourceFileId("C:\\Foo\\Bar")).toBe(expected);
    expect(normalizePathForId("C:\\Foo\\Bar", true)).toBe("C:/Foo/Bar");
    expect(normalizePathForId("C:\\Foo\\Bar", false)).toBe("c:/foo/bar");
  });

  test("HierarchicalIdBuilder and NodeIdGen build stable ids", () => {
    const builder = new HierarchicalIdBuilder<"NodeId">("root", ".");
    expect(builder.current()).toBe("root");
    expect(builder.push(1)).toBe("root.1");
    expect(builder.push(2)).toBe("root.1.2");
    builder.pop();
    expect(builder.current()).toBe("root.1");
    expect(builder.withSuffix("#text")).toBe("root.1#text");

    const nodeGen = new NodeIdGen();
    expect(nodeGen.pushElement(2)).toBe("0/2");
    nodeGen.pop();
    expect(nodeGen.current()).toBe("0");
  });

  test("DomIdAllocator tracks siblings and child stacks", () => {
    const alloc = new DomIdAllocator();
    expect(() => alloc.nextElement()).toThrow(/enterChildren/);

    alloc.enterChildren();
    expect(alloc.nextElement()).toBe("0/0");
    alloc.exitElement();
    expect(alloc.nextText()).toBe("0#text@0");
    expect(alloc.nextText()).toBe("0#text@1");
    alloc.exitChildren();

    const within = alloc.withinChildren(() => alloc.nextElement());
    expect(within).toBe("0/0");
    expect(() => alloc.nextElement()).toThrow(/enterChildren/);
  });

  test("NodeAddressBuilder and SequentialIdAllocator emit deterministic ids", () => {
    const template = brandString<"TemplateId">("t0");
    const builder = new NodeAddressBuilder(template);
    expect(builder.current()).toEqual({ template, node: "0" });
    expect(builder.push(1)).toEqual({ template, node: "0/1" });
    builder.pop();
    expect(builder.withSuffix("#comment@0")).toEqual({ template, node: "0#comment@0" });

    const seq = new SequentialIdAllocator<"FrameId">(5);
    expect(seq.allocate()).toBe(5);
    expect(seq.allocate()).toBe(6);

    const frameSeq = new FrameIdAllocator();
    expect(frameSeq.allocate()).toBe(0);
  });
});

// ===========================================================================
// span
// ===========================================================================

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
