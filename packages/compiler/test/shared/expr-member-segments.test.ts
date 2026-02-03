/**
 * Unit tests for collectExprMemberSegments in expr-utils.ts
 *
 * These tests verify that member access spans are computed correctly,
 * specifically that:
 * 1. Spans are absolute (not re-offset by base)
 * 2. Member spans include the dot operator for contiguous coverage
 * 3. Chained access produces multiple segments with correct spans
 */

import { describe, test, expect } from "vitest";
import { ExpressionParser } from "@aurelia-ls/compiler";
import type { ExprTableEntry, SourceSpan, ExprIdMap } from "@aurelia-ls/compiler";
import { collectExprMemberSegments } from "../../src/shared/expr-utils.js";

// Helper to parse an expression and build an ExprTableEntry
function parseExpr(src: string, baseOffset = 0): { entry: ExprTableEntry; base: SourceSpan } {
  const parser = new ExpressionParser();
  const base: SourceSpan = { start: baseOffset, end: baseOffset + src.length, file: "test.html" };
  // Pass context as object with baseSpan to get absolute spans
  const ast = parser.parse(src, "IsProperty", { baseSpan: base });
  if (!ast) throw new Error(`Failed to parse: ${src}`);

  const entry: ExprTableEntry = {
    id: "test-expr-1",
    expressionType: "IsProperty",
    ast,
  };

  return { entry, base };
}

// Helper to get segments for an expression
function getSegments(
  src: string,
  baseOffset = 0,
): { path: string; start: number; end: number; text: string }[] {
  const { entry, base } = parseExpr(src, baseOffset);
  const exprSpans: ExprIdMap<SourceSpan> = new Map([[entry.id, base]]);
  const result = collectExprMemberSegments([entry], exprSpans);
  const segments = result.get(entry.id) ?? [];

  return segments.map((seg) => ({
    path: seg.path,
    start: seg.span.start,
    end: seg.span.end,
    // Compute what text the span would cover in the original expression
    text: src.slice(seg.span.start - baseOffset, seg.span.end - baseOffset),
  }));
}

describe("collectExprMemberSegments", () => {
  describe("simple member access", () => {
    test("single property produces one segment covering the identifier", () => {
      const segments = getSegments("foo", 10);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toEqual({
        path: "foo",
        start: 10,
        end: 13,
        text: "foo",
      });
    });

    test("member access includes the dot in the member segment", () => {
      // Expression: "foo.bar" at offset 10
      // Expected: "foo" segment at 10-13, ".bar" segment at 13-17
      const segments = getSegments("foo.bar", 10);

      expect(segments).toHaveLength(2);

      // Root segment: "foo"
      expect(segments.find((s) => s.path === "foo")).toEqual({
        path: "foo",
        start: 10,
        end: 13,
        text: "foo",
      });

      // Member segment: ".bar" (includes the dot)
      expect(segments.find((s) => s.path === "foo.bar")).toEqual({
        path: "foo.bar",
        start: 13, // starts at the dot
        end: 17,
        text: ".bar",
      });
    });

    test("segments are contiguous (no gaps at dot)", () => {
      const segments = getSegments("foo.bar", 0);

      const fooSeg = segments.find((s) => s.path === "foo")!;
      const barSeg = segments.find((s) => s.path === "foo.bar")!;

      // The end of "foo" should equal the start of ".bar"
      expect(fooSeg.end).toBe(barSeg.start);
    });
  });

  describe("chained member access", () => {
    test("three-level chain produces three segments", () => {
      const segments = getSegments("a.b.c", 0);

      expect(segments).toHaveLength(3);
      expect(segments.map((s) => s.path).sort()).toEqual(["a", "a.b", "a.b.c"]);
    });

    test("each member segment includes its dot", () => {
      // "a.b.c" -> "a" at 0-1, ".b" at 1-3, ".c" at 3-5
      const segments = getSegments("a.b.c", 0);

      expect(segments.find((s) => s.path === "a")).toEqual({
        path: "a",
        start: 0,
        end: 1,
        text: "a",
      });

      expect(segments.find((s) => s.path === "a.b")).toEqual({
        path: "a.b",
        start: 1,
        end: 3,
        text: ".b",
      });

      expect(segments.find((s) => s.path === "a.b.c")).toEqual({
        path: "a.b.c",
        start: 3,
        end: 5,
        text: ".c",
      });
    });

    test("long chain maintains contiguous coverage", () => {
      const segments = getSegments("person.address.city.name", 100);

      // Sort by start offset
      const sorted = [...segments].sort((a, b) => a.start - b.start);

      // Verify contiguous coverage
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.start).toBe(sorted[i - 1]!.end);
      }

      // Verify full coverage
      expect(sorted[0]!.start).toBe(100);
      expect(sorted[sorted.length - 1]!.end).toBe(100 + "person.address.city.name".length);
    });
  });

  describe("optional chaining", () => {
    test("optional member access includes ?. in the member segment", () => {
      // "foo?.bar" -> "foo" at 0-3, "?.bar" at 3-8
      const segments = getSegments("foo?.bar", 0);

      expect(segments).toHaveLength(2);

      expect(segments.find((s) => s.path === "foo")).toEqual({
        path: "foo",
        start: 0,
        end: 3,
        text: "foo",
      });

      expect(segments.find((s) => s.path === "foo.bar")).toEqual({
        path: "foo.bar",
        start: 3,
        end: 8,
        text: "?.bar",
      });
    });

    test("mixed regular and optional chaining", () => {
      // "a.b?.c.d" -> segments for a, a.b, a.b.c, a.b.c.d
      const segments = getSegments("a.b?.c.d", 0);

      expect(segments).toHaveLength(4);

      // Verify the optional chain segment includes ?.
      const cSeg = segments.find((s) => s.path === "a.b.c")!;
      expect(cSeg.text).toBe("?.c");
    });
  });

  describe("with base offset (simulating template embedding)", () => {
    test("spans are absolute when expression is embedded in template", () => {
      // Simulating: <div>${person.name}</div>
      // The expression "person.name" starts at offset 7 (after "<div>${")
      const segments = getSegments("person.name", 7);

      expect(segments.find((s) => s.path === "person")).toEqual({
        path: "person",
        start: 7,
        end: 13,
        text: "person",
      });

      expect(segments.find((s) => s.path === "person.name")).toEqual({
        path: "person.name",
        start: 13,
        end: 18,
        text: ".name",
      });
    });

    test("different base offsets produce correctly shifted spans", () => {
      const expr = "x.y";

      const at0 = getSegments(expr, 0);
      const at100 = getSegments(expr, 100);
      const at1000 = getSegments(expr, 1000);

      // All should have same relative structure
      expect(at0.find((s) => s.path === "x")!.start).toBe(0);
      expect(at100.find((s) => s.path === "x")!.start).toBe(100);
      expect(at1000.find((s) => s.path === "x")!.start).toBe(1000);

      // Member segment starts right after root
      expect(at0.find((s) => s.path === "x.y")!.start).toBe(1);
      expect(at100.find((s) => s.path === "x.y")!.start).toBe(101);
      expect(at1000.find((s) => s.path === "x.y")!.start).toBe(1001);
    });
  });

  describe("$parent and $this", () => {
    test("$parent.foo produces single segment with hop notation", () => {
      // $parent.foo parses as AccessMember with AccessThis ancestor=1
      // The path notation is "$parent^1.foo" (the ^1 indicates ancestor hop)
      const segments = getSegments("$parent.foo", 0);

      expect(segments).toHaveLength(1);
      expect(segments[0]!.path).toBe("$parent^1.foo");
    });

    test("nested $parent.$parent produces path with cumulative hops", () => {
      // $parent.$parent.bar parses as nested ancestor hops
      // The path format uses ^N to indicate total ancestor depth
      const segments = getSegments("$parent.$parent.bar", 0);

      expect(segments).toHaveLength(1);
      // The parser tracks cumulative ancestor depth
      expect(segments[0]!.path).toBe("$parent^2.bar");
    });
  });

  describe("edge cases", () => {
    test("call expression callee and arguments produce segments", () => {
      // "foo.bar(baz.qux)" produces segments for:
      // - foo (the AccessScope)
      // - baz, baz.qux (the argument member access)
      // Note: foo.bar is a CallMember, not an AccessMember, so the "bar" part
      // doesn't get a member segment (it's the function name, not a property access)
      const segments = getSegments("foo.bar(baz.qux)", 0);

      const paths = segments.map((s) => s.path);
      expect(paths).toContain("foo");
      expect(paths).toContain("baz");
      expect(paths).toContain("baz.qux");
      // foo.bar is NOT a member access, it's a method call
      expect(paths).not.toContain("foo.bar");
    });

    test("keyed access with string literal", () => {
      // "foo['bar']" produces segments for foo and foo["bar"]
      const segments = getSegments("foo['bar']", 0);

      const paths = segments.map((s) => s.path);
      expect(paths).toContain("foo");
      expect(paths).toContain('foo["bar"]');
    });

    test("mixed member and keyed access", () => {
      // "a.b[c].d" -> paths for a, a.b, a.b[c] (dynamic key), a.b[c].d
      // Note: dynamic key [c] doesn't produce a string path
      const segments = getSegments("a.b[c].d", 0);

      const paths = segments.map((s) => s.path);
      expect(paths).toContain("a");
      expect(paths).toContain("a.b");
      // The [c] part doesn't extend the path since c is dynamic
    });

    test("empty expression table returns empty map", () => {
      const result = collectExprMemberSegments([], new Map());
      expect(result.size).toBe(0);
    });

    test("expression without member access produces single root segment", () => {
      const segments = getSegments("value", 50);

      expect(segments).toHaveLength(1);
      expect(segments[0]!.path).toBe("value");
    });
  });
});
