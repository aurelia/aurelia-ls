import { describe, test, expect } from "vitest";

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
  normalizePathForId,
  toSourceFileId,
  HierarchicalIdBuilder,
  NodeIdGen,
  DomIdAllocator,
  NodeAddressBuilder,
  SequentialIdAllocator,
  FrameIdAllocator,
} from "../../src/model/identity.js";

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

  test("normalizePathForId and toSourceFileId respect platform rules", () => {
    const normalized = normalizePathForId("C:\\Foo\\Bar");
    const expected = process.platform === "win32" ? "c:/foo/bar" : "C:/Foo/Bar";

    expect(normalized).toBe(expected);
    expect(toSourceFileId("C:\\Foo\\Bar")).toBe(expected);
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
