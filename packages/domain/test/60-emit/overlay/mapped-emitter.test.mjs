import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { LspExpressionParser } from "../../../out/compiler/parsing/lsp-expression-parser.js";
import { emitMappedExpression } from "../../../out/compiler/phases/50-plan/overlay/mapped-emitter.js";

describe("Overlay mapped emitter", () => {
  const cases = [
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
        { path: "foo.bar.baz.qux" },
        { path: "foo.bar.baz" },
        { path: "foo.bar" },
        { path: "foo" },
        { path: "qux" },
      ],
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
      assert.ok(emitted, "expected emit result");
      assert.ok(typeof emitted.code === "string" && emitted.code.length > 0);
      assert.ok(Array.isArray(emitted.segments));
      emitted.segments.forEach((seg) => {
        assert.ok(seg.path && typeof seg.path === "string");
        assert.ok(typeof seg.span.start === "number" && typeof seg.span.end === "number");
      });
      if (c.expectSegments) {
        const paths = emitted.segments.map((s) => s.path);
        for (const exp of c.expectSegments) {
          assert.ok(paths.includes(exp.path), `expected path ${exp.path} in segments: ${paths.join(", ")}`);
        }
      }
      if (c.expectCode) {
        assert.equal(emitted.code, c.expectCode);
        assert.equal(emitted.segments.length, 0);
        assert.ok(emitted.mappings.some((m) => m.source.start === (c.ast?.span.start ?? 0) && m.source.end === (c.ast?.span.end ?? 0)));
      }
    });
  }
});

function parse(src, type) {
  const parser = new LspExpressionParser();
  const ast = parser.parse(src, type);
  if (!ast) throw new Error(`failed to parse expression: ${src}`);
  return ast;
}
