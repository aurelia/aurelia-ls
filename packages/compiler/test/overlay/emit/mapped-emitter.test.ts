import { test, describe, expect } from "vitest";
import { ExpressionParser } from "@aurelia-ls/compiler/parsing/expression-parser.js";
import { emitMappedExpression } from "@aurelia-ls/compiler/synthesis/overlay/mapped-emitter.js";
// --- Types ---

interface ExpectSegment {
  path: string;
  /** Expected span boundaries if we want to verify positions */
  spanStart?: number;
  spanEnd?: number;
}

interface BadExpressionAst {
  $kind: "BadExpression";
  span: { start: number; end: number };
  text: string;
  message: string;
  origin: null;
}

interface TestCase {
  name: string;
  src?: string;
  type?: string;
  ast?: BadExpressionAst;
  expectSegments?: ExpectSegment[];
  rejectSegments?: readonly string[];
  expectCode?: string;
}

describe("Overlay mapped emitter", () => {
  const cases: TestCase[] = [
    {
      name: "simple member",
      src: "foo.bar",
    },
    {
      name: "optional member",
      src: "foo?.bar",
    },
    {
      name: "keyed access",
      src: "foo[bar]",
    },
    {
      name: "nested chain with optional",
      src: "foo.bar?.baz[qux]",
    },
    {
      name: "call scope",
      src: "doThing(arg1, arg2)",
    },
    {
      name: "call member optional",
      src: "foo?.bar(baz)",
    },
    {
      name: "binary and conditional",
      src: "foo && bar ? baz : qux",
    },
    {
      name: "template literal",
      src: "`hi ${name} ${user.id}`",
    },
    {
      name: "object literal with nested member",
      src: "{ a: foo.bar, b: baz }",
    },
    {
      name: "array literal with member",
      src: "[foo.bar, baz]",
    },
    {
      name: "arrow function body",
      src: "(a, b) => a?.b",
    },
    {
      name: "logical/optional chain mix",
      src: "foo && foo.bar?.baz",
    },
    {
      name: "call with member args",
      src: "fn(foo.bar, baz?.qux)",
    },
    {
      name: "interpolation",
      src: "Hello ${name}!",
      type: "Interpolation",
    },
    {
      name: "optional call with keyed arg",
      src: "foo?.bar(baz.qux[0])",
    },
    {
      name: "new expression with member arg",
      src: "new Foo(bar.baz)",
    },
    {
      name: "tagged template with member",
      src: "tag`${user.name}`",
    },
    {
      name: "nested object with member value",
      src: "{ foo: { bar: baz.qux } }",
    },
    {
      name: "call scope path",
      src: "doThing(arg)",
    },
    {
      name: "call member path",
      src: "foo.bar(baz)",
    },
    {
      name: "call global path",
      src: "Math.max(a, b)",
    },
    {
      name: "call function optional",
      src: "fn?.(foo)",
    },
    {
      name: "optional + keyed span/path",
      src: "foo?.bar?.baz[qux]",
      expectSegments: [
        { path: "foo.bar.baz" },
        { path: "foo.bar" },
        { path: "foo" },
        { path: "qux" },
      ],
      rejectSegments: ["foo.bar.baz.qux", "foo.bar.baz[\"o.qux\"]"],
    },
    {
      name: "literal keyed path carries into chained member",
      src: "filters[0].value",
      expectSegments: [
        { path: "filters" },
        { path: 'filters["0"]' },
        { path: 'filters["0"].value' },
      ],
    },
    {
      name: "dynamic keyed chain keeps object path for member access",
      src: "x[reallyLongName].value",
      expectSegments: [
        { path: "x" },
        { path: "reallyLongName" },
        { path: "x.value" },
      ],
      rejectSegments: ["reallyLongName.value"],
    },
    {
      name: "$parent hop path",
      src: "$parent.$parent.vm.foo",
      expectSegments: [
        { path: "$parent.$parent.vm.foo" },
        { path: "$parent.$parent.vm" },
        { path: "$parent.$parent" },
      ],
    },
    {
      name: "bad expression placeholder",
      ast: {
        $kind: "BadExpression",
        span: { start: 10, end: 14 },
        text: "oops",
        message: "parse error",
        origin: null,
      },
      expectCode: "undefined/*bad*/",
    },
  ];

  for (const c of cases) {
    test(c.name, () => {
      const ast = c.ast ?? parse(c.src, c.type ?? "IsProperty");
      const emitted = emitMappedExpression(ast);
      expect(emitted, "expected emit result").toBeTruthy();
      expect(typeof emitted.code === "string" && emitted.code.length > 0).toBeTruthy();
      expect(Array.isArray(emitted.segments)).toBeTruthy();
      emitted.segments.forEach((seg) => {
        expect(seg.path && typeof seg.path === "string").toBeTruthy();
        expect(typeof seg.span.start === "number" && typeof seg.span.end === "number").toBeTruthy();
      });
      if (c.expectSegments) {
        const paths = emitted.segments.map((s) => s.path);
        for (const exp of c.expectSegments) {
          expect(paths.includes(exp.path), `expected path ${exp.path} in segments: ${paths.join(", ")}`).toBeTruthy();
        }
        if (c.rejectSegments) {
          for (const rejected of c.rejectSegments) {
            expect(paths.includes(rejected), `unexpected path ${rejected} in segments: ${paths.join(", ")}`).toBe(false);
          }
        }
      }
      if (c.expectCode) {
        expect(emitted.code).toBe(c.expectCode);
        expect(emitted.segments.length).toBe(0);
        expect(emitted.mappings.some((m) => m.source.start === (c.ast?.span.start ?? 0) && m.source.end === (c.ast?.span.end ?? 0))).toBeTruthy();
      }
    });
  }
});

function parse(src: string, type: string): unknown {
  const parser = new ExpressionParser();
  const ast = parser.parse(src, type);
  if (!ast) throw new Error(`failed to parse expression: ${src}`);
  return ast;
}

/**
 * Tests for overlay segment span positions.
 * These verify that member access spans include the dot operator,
 * ensuring contiguous coverage with no gaps.
 */
describe("Overlay segment spans include dot operator", () => {
  test("simple member access: .bar span starts at dot position", () => {
    // "foo.bar" emits as "this.foo.bar"
    // Segments: "foo" and "foo.bar"
    const ast = parse("foo.bar", "IsProperty");
    const result = emitMappedExpression(ast);

    const fooSeg = result.segments.find((s) => s.path === "foo");
    const fooBarSeg = result.segments.find((s) => s.path === "foo.bar");

    expect(fooSeg).toBeTruthy();
    expect(fooBarSeg).toBeTruthy();

    // In emitted code "this.foo.bar":
    // - "foo" is at positions 5-8 (after "this.")
    // - ".bar" is at positions 8-12 (dot + "bar")
    // The foo.bar segment should start at the dot (8), not at "b" (9)
    expect(fooBarSeg!.span.start).toBe(fooSeg!.span.end);
  });

  test("chained member access: segments are contiguous", () => {
    // "a.b.c" emits as "this.a.b.c"
    const ast = parse("a.b.c", "IsProperty");
    const result = emitMappedExpression(ast);

    const segments = result.segments.sort((x, y) => x.span.start - y.span.start);

    // Verify no gaps between segments
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]!.span.start).toBe(segments[i - 1]!.span.end);
    }
  });

  test("optional chaining: ?.bar span starts at question mark", () => {
    // "foo?.bar" emits as "this.foo?.bar"
    const ast = parse("foo?.bar", "IsProperty");
    const result = emitMappedExpression(ast);

    const fooSeg = result.segments.find((s) => s.path === "foo");
    const fooBarSeg = result.segments.find((s) => s.path === "foo.bar");

    expect(fooSeg).toBeTruthy();
    expect(fooBarSeg).toBeTruthy();

    // The foo.bar segment should start right after foo (at the "?")
    expect(fooBarSeg!.span.start).toBe(fooSeg!.span.end);

    // Verify the span length accounts for "?.bar" (5 chars)
    expect(fooBarSeg!.span.end - fooBarSeg!.span.start).toBe(5);
  });

  test("mixed chaining: regular and optional dots both included", () => {
    // "a.b?.c.d" has segments that are contiguous
    const ast = parse("a.b?.c.d", "IsProperty");
    const result = emitMappedExpression(ast);

    const segments = result.segments.sort((x, y) => x.span.start - y.span.start);

    // All segments should be contiguous (no gaps)
    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1]!;
      const curr = segments[i]!;
      expect(curr.span.start).toBe(prev.span.end);
    }
  });

  test("call member spans include dot for callee path", () => {
    // "foo.bar()" emits as "this.foo.bar()"
    // The CallMember doesn't produce a member segment for "foo.bar",
    // but "foo" should still have its segment
    const ast = parse("foo.bar()", "IsFunction");
    const result = emitMappedExpression(ast);

    // foo segment exists
    const fooSeg = result.segments.find((s) => s.path === "foo");
    expect(fooSeg).toBeTruthy();
  });

  test("call scope with member argument: argument spans are contiguous", () => {
    // "fn(a.b.c)" - the argument a.b.c should have contiguous segments
    const ast = parse("fn(a.b.c)", "IsFunction");
    const result = emitMappedExpression(ast);

    // Get segments for the argument member access
    const aSeg = result.segments.find((s) => s.path === "a");
    const abSeg = result.segments.find((s) => s.path === "a.b");
    const abcSeg = result.segments.find((s) => s.path === "a.b.c");

    expect(aSeg).toBeTruthy();
    expect(abSeg).toBeTruthy();
    expect(abcSeg).toBeTruthy();

    // Verify contiguous
    expect(abSeg!.span.start).toBe(aSeg!.span.end);
    expect(abcSeg!.span.start).toBe(abSeg!.span.end);
  });
});
