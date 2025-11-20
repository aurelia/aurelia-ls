import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { LspExpressionParser } from "../../out/parsers/lsp-expression-parser.js";

/**
 * Helper: strip span information recursively from an AST node.
 * This lets us deep-compare structure without being brittle on offsets.
 */
function stripSpans(value) {
  if (Array.isArray(value)) {
    return value.map(stripSpans);
  }
  if (value && typeof value === "object") {
    const clone = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === "span") continue;
      clone[key] = stripSpans(val);
    }
    return clone;
  }
  return value;
}

/**
 * Parse the same source in both IsProperty and IsFunction modes and assert
 * that they produce identical ASTs (ignoring spans). Returns the IsProperty AST.
 */
function parseInBothModes(source) {
  const parser = new LspExpressionParser();
  const propAst = parser.parse(source, "IsProperty");
  const fnAst = parser.parse(source, "IsFunction");

  assert.deepEqual(
    stripSpans(fnAst),
    stripSpans(propAst),
    `IsFunction / IsProperty mismatch for: ${source}`,
  );

  return propAst;
}

describe("lsp-expression-parser / core (IsProperty & IsFunction)", () => {
  //
  // Identifiers / scope hops
  //
  test("identifier: foo (AccessScope ancestor 0)", () => {
    const src = "foo";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessScope");
    assert.equal(ast.name, "foo");
    assert.equal(ast.ancestor, 0);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("scope hop: $this.foo", () => {
    const src = "$this.foo";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessScope");
    assert.equal(ast.name, "foo");
    assert.equal(ast.ancestor, 0);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("scope hop: $parent.bar (ancestor 1)", () => {
    const src = "$parent.bar";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessScope");
    assert.equal(ast.name, "bar");
    assert.equal(ast.ancestor, 1);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("scope hop: $parent.$parent.baz (ancestor 2)", () => {
    const src = "$parent.$parent.baz";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessScope");
    assert.equal(ast.name, "baz");
    assert.equal(ast.ancestor, 2);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("boundary: this -> AccessBoundary", () => {
    const src = "this";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessBoundary");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("special scope: $this -> AccessThis ancestor 0", () => {
    const src = "$this";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessThis");
    assert.equal(ast.ancestor, 0);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("special scope: $parent -> AccessThis ancestor 1", () => {
    const src = "$parent";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessThis");
    assert.equal(ast.ancestor, 1);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("identifier with BMP characters", () => {
    const src = "\u00C9foo";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessScope");
    assert.equal(ast.name, "\u00C9foo");
  });

  //
  // Globals vs scopes / calls
  //
  test("CallGlobal: parseInt(x)", () => {
    const src = "parseInt(x)";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "CallGlobal");
    assert.equal(ast.name, "parseInt");
    assert.equal(ast.args.length, 1);

    const arg0 = ast.args[0];
    assert.equal(arg0.$kind, "AccessScope");
    assert.equal(arg0.name, "x");
    assert.equal(arg0.ancestor, 0);

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("CallMember on global object: Math.max(a, b)", () => {
    const src = "Math.max(a, b)";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "CallMember");
    assert.equal(ast.name, "max");
    assert.equal(ast.optionalMember, false);
    assert.equal(ast.optionalCall, false);

    assert.ok(ast.object);
    assert.equal(ast.object.$kind, "AccessGlobal");
    assert.equal(ast.object.name, "Math");

    assert.equal(ast.args.length, 2);
    assert.equal(ast.args[0].$kind, "AccessScope");
    assert.equal(ast.args[0].name, "a");
    assert.equal(ast.args[1].$kind, "AccessScope");
    assert.equal(ast.args[1].name, "b");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("CallScope: foo(x) stays scoped, not global", () => {
    const src = "foo(x)";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "CallScope");
    assert.equal(ast.name, "foo");
    assert.equal(ast.ancestor, 0);
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "AccessScope");
    assert.equal(ast.args[0].name, "x");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("optional call on scope binding: foo?.()", () => {
    const src = "foo?.()";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "CallScope");
    assert.equal(ast.name, "foo");
    assert.equal(ast.optional, true);
    assert.equal(ast.ancestor, 0);
    assert.equal(ast.args.length, 0);
  });

  test("optional call on member: user.get?.(id)", () => {
    const src = "user.get?.(id)";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "CallMember");
    assert.equal(ast.name, "get");
    assert.equal(ast.optionalMember, false);
    assert.equal(ast.optionalCall, true);

    assert.equal(ast.object.$kind, "AccessScope");
    assert.equal(ast.object.name, "user");

    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "AccessScope");
    assert.equal(ast.args[0].name, "id");
  });

  test("optional chaining + optional call: user?.get?.()", () => {
    const src = "user?.get?.()";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "CallMember");
    assert.equal(ast.name, "get");
    assert.equal(ast.optionalMember, true);
    assert.equal(ast.optionalCall, true);

    assert.equal(ast.object.$kind, "AccessScope");
    assert.equal(ast.object.name, "user");
    assert.equal(ast.args.length, 0);
  });

  //
  // Unary expressions
  //
  test("unary: !foo", () => {
    const src = "!foo";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Unary");
    assert.equal(ast.operation, "!");
    assert.equal(ast.pos, 0);
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "foo");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("unary: -x", () => {
    const src = "-x";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Unary");
    assert.equal(ast.operation, "-");
    assert.equal(ast.pos, 0);
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "x");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("unary prefix: ++i", () => {
    const src = "++i";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Unary");
    assert.equal(ast.operation, "++");
    assert.equal(ast.pos, 0);
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "i");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("unary postfix: i++", () => {
    const src = "i++";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Unary");
    assert.equal(ast.operation, "++");
    assert.equal(ast.pos, 1);
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "i");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  //
  // Parenthesized expressions
  //
  test("parenthesized expression produces Paren node", () => {
    const src = "(foo)";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Paren");
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "foo");
    assert.equal(ast.span.start, 0);
    assert.equal(ast.span.end, src.length);
    assert.equal(src.slice(ast.expression.span.start, ast.expression.span.end), "foo");
  });

  test("paren can wrap a member target", () => {
    const src = "(foo).bar";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "AccessMember");
    assert.equal(ast.name, "bar");

    const obj = ast.object;
    assert.equal(obj.$kind, "Paren");
    assert.equal(obj.expression.$kind, "AccessScope");
    assert.equal(obj.expression.name, "foo");
  });

  //
  // Binary / precedence
  //
  test("binary precedence: 1 + 2 * 3", () => {
    const src = "1 + 2 * 3";
    const ast = parseInBothModes(src);

    assert.deepEqual(stripSpans(ast), {
      $kind: "Binary",
      operation: "+",
      left: {
        $kind: "PrimitiveLiteral",
        value: 1,
      },
      right: {
        $kind: "Binary",
        operation: "*",
        left: {
          $kind: "PrimitiveLiteral",
          value: 2,
        },
        right: {
          $kind: "PrimitiveLiteral",
          value: 3,
        },
      },
    });

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("binary precedence: a && b || c -> (a && b) || c", () => {
    const src = "a && b || c";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Binary");
    assert.equal(ast.operation, "||");

    const left = ast.left;
    assert.equal(left.$kind, "Binary");
    assert.equal(left.operation, "&&");
    assert.equal(left.left.$kind, "AccessScope");
    assert.equal(left.left.name, "a");
    assert.equal(left.right.$kind, "AccessScope");
    assert.equal(left.right.name, "b");

    const right = ast.right;
    assert.equal(right.$kind, "AccessScope");
    assert.equal(right.name, "c");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("binary: nullish coalescing a ?? b", () => {
    const src = "a ?? b";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Binary");
    assert.equal(ast.operation, "??");
    assert.equal(ast.left.$kind, "AccessScope");
    assert.equal(ast.right.$kind, "AccessScope");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("binary: comparison a >= b", () => {
    const src = "a >= b";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Binary");
    assert.equal(ast.operation, ">=");
    assert.equal(ast.left.$kind, "AccessScope");
    assert.equal(ast.left.name, "a");
    assert.equal(ast.right.$kind, "AccessScope");
    assert.equal(ast.right.name, "b");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("binary precedence with parentheses: (1 + 2) * 3", () => {
    const src = "(1 + 2) * 3";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Binary");
    assert.equal(ast.operation, "*");

    const left = ast.left;
    assert.equal(left.$kind, "Paren");
    assert.equal(left.expression.$kind, "Binary");
    assert.equal(left.expression.operation, "+");
    assert.equal(left.expression.left.$kind, "PrimitiveLiteral");
    assert.equal(left.expression.left.value, 1);
    assert.equal(left.expression.right.$kind, "PrimitiveLiteral");
    assert.equal(left.expression.right.value, 2);
    assert.equal(src.slice(left.span.start, left.span.end), "(1 + 2)");

    assert.equal(ast.right.$kind, "PrimitiveLiteral");
    assert.equal(ast.right.value, 3);

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("binary precedence with parentheses: a && (b || c)", () => {
    const src = "a && (b || c)";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Binary");
    assert.equal(ast.operation, "&&");

    const right = ast.right;
    assert.equal(right.$kind, "Paren");
    assert.equal(right.expression.$kind, "Binary");
    assert.equal(right.expression.operation, "||");
    assert.equal(right.expression.left.$kind, "AccessScope");
    assert.equal(right.expression.left.name, "b");
    assert.equal(right.expression.right.$kind, "AccessScope");
    assert.equal(right.expression.right.name, "c");
    assert.equal(src.slice(right.span.start, right.span.end), "(b || c)");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  //
  // Conditional
  //
  test("conditional: cond ? a : b", () => {
    const src = "cond ? a : b";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Conditional");
    assert.equal(ast.condition.$kind, "AccessScope");
    assert.equal(ast.condition.name, "cond");
    assert.equal(ast.yes.$kind, "AccessScope");
    assert.equal(ast.yes.name, "a");
    assert.equal(ast.no.$kind, "AccessScope");
    assert.equal(ast.no.name, "b");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  //
  // Assignments
  //
  test("assignment: a = b", () => {
    const src = "a = b";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Assign");
    assert.equal(ast.op, "=");
    assert.equal(ast.target.$kind, "AccessScope");
    assert.equal(ast.target.name, "a");
    assert.equal(ast.value.$kind, "AccessScope");
    assert.equal(ast.value.name, "b");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("compound assignment: a += b", () => {
    const src = "a += b";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Assign");
    assert.equal(ast.op, "+=");
    assert.equal(ast.target.$kind, "AccessScope");
    assert.equal(ast.target.name, "a");
    assert.equal(ast.value.$kind, "AccessScope");
    assert.equal(ast.value.name, "b");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("right-associative assignment: a = b = c", () => {
    const src = "a = b = c";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Assign");
    assert.equal(ast.op, "=");
    assert.equal(ast.target.$kind, "AccessScope");
    assert.equal(ast.target.name, "a");

    const inner = ast.value;
    assert.equal(inner.$kind, "Assign");
    assert.equal(inner.op, "=");
    assert.equal(inner.target.$kind, "AccessScope");
    assert.equal(inner.target.name, "b");
    assert.equal(inner.value.$kind, "AccessScope");
    assert.equal(inner.value.name, "c");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  //
  // Arrow functions
  //
  test("arrow: x => x + 1", () => {
    const src = "x => x + 1";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "ArrowFunction");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "BindingIdentifier");
    assert.equal(ast.args[0].name, "x");

    assert.equal(ast.body.$kind, "Binary");
    assert.equal(ast.body.operation, "+");
    assert.equal(ast.body.left.$kind, "AccessScope");
    assert.equal(ast.body.left.name, "x");
    assert.equal(ast.body.right.$kind, "PrimitiveLiteral");
    assert.equal(ast.body.right.value, 1);

    assert.equal(ast.rest, false);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("arrow: (a, b) => a + b", () => {
    const src = "(a, b) => a + b";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "ArrowFunction");
    assert.equal(ast.args.length, 2);
    assert.equal(ast.args[0].$kind, "BindingIdentifier");
    assert.equal(ast.args[0].name, "a");
    assert.equal(ast.args[1].$kind, "BindingIdentifier");
    assert.equal(ast.args[1].name, "b");

    assert.equal(ast.body.$kind, "Binary");
    assert.equal(ast.body.operation, "+");
    assert.equal(ast.body.left.$kind, "AccessScope");
    assert.equal(ast.body.left.name, "a");
    assert.equal(ast.body.right.$kind, "AccessScope");
    assert.equal(ast.body.right.name, "b");

    assert.equal(ast.rest, false);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("arrow: (a, ...rest) => a", () => {
    const src = "(a, ...rest) => a";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "ArrowFunction");
    assert.equal(ast.args.length, 2);
    assert.equal(ast.args[0].$kind, "BindingIdentifier");
    assert.equal(ast.args[0].name, "a");
    assert.equal(ast.args[1].$kind, "BindingIdentifier");
    assert.equal(ast.args[1].name, "rest");
    assert.equal(ast.rest, true);
  });

  test("arrow: (...rest) => rest", () => {
    const src = "(...rest) => rest";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "ArrowFunction");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "BindingIdentifier");
    assert.equal(ast.args[0].name, "rest");
    assert.equal(ast.rest, true);
  });

  test("arrow: () => x (zero parameters)", () => {
    const src = "() => x";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "ArrowFunction");
    assert.equal(ast.args.length, 0);
    assert.equal(ast.body.$kind, "AccessScope");
    assert.equal(ast.body.name, "x");
    assert.equal(ast.rest, false);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("arrow: (x) => x + 1 (paren single param)", () => {
    const src = "(x) => x + 1";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "ArrowFunction");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "BindingIdentifier");
    assert.equal(ast.args[0].name, "x");

    assert.equal(ast.body.$kind, "Binary");
    assert.equal(ast.body.operation, "+");
    assert.equal(ast.body.left.$kind, "AccessScope");
    assert.equal(ast.body.left.name, "x");
    assert.equal(ast.body.right.$kind, "PrimitiveLiteral");
    assert.equal(ast.body.right.value, 1);

    assert.equal(ast.rest, false);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  //
  // Tails: value converters / binding behaviors
  //
  test("value converter tail: amount | currency:'USD'", () => {
    const src = "amount | currency:'USD'";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "ValueConverter");
    assert.equal(ast.name, "currency");
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "amount");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "PrimitiveLiteral");
    assert.equal(ast.args[0].value, "USD");

    // Span for the value converter should cover everything up to the end of 'USD'
    assert.equal(src.slice(ast.span.start, ast.span.end), "amount | currency:'USD'");
  });

  test("value converter + behavior tail: amount | currency:'USD' & throttle:100", () => {
    const src = "amount | currency:'USD' & throttle:100";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "BindingBehavior");
    assert.equal(ast.name, "throttle");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "PrimitiveLiteral");
    assert.equal(ast.args[0].value, 100);

    // Inner value converter
    const vc = ast.expression;
    assert.equal(vc.$kind, "ValueConverter");
    assert.equal(vc.name, "currency");
    assert.equal(vc.expression.$kind, "AccessScope");
    assert.equal(vc.expression.name, "amount");
    assert.equal(vc.args.length, 1);
    assert.equal(vc.args[0].$kind, "PrimitiveLiteral");
    assert.equal(vc.args[0].value, "USD");

    // Spans:
    // - inner converter: up to the end of 'USD'
    assert.equal(
      src.slice(vc.span.start, vc.span.end),
      "amount | currency:'USD'",
    );
    // - outer behavior: full expression
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("binding behavior without converter: amount & throttle:100", () => {
    const src = "amount & throttle:100";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "BindingBehavior");
    assert.equal(ast.name, "throttle");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "PrimitiveLiteral");
    assert.equal(ast.args[0].value, 100);

    const expr = ast.expression;
    assert.equal(expr.$kind, "AccessScope");
    assert.equal(expr.name, "amount");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("multiple binding behaviors: amount & throttle:100 & debounce:50", () => {
    const src = "amount & throttle:100 & debounce:50";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "BindingBehavior");
    assert.equal(ast.name, "debounce");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "PrimitiveLiteral");
    assert.equal(ast.args[0].value, 50);

    const first = ast.expression;
    assert.equal(first.$kind, "BindingBehavior");
    assert.equal(first.name, "throttle");
    assert.equal(first.args.length, 1);
    assert.equal(first.args[0].$kind, "PrimitiveLiteral");
    assert.equal(first.args[0].value, 100);

    const innerExpr = first.expression;
    assert.equal(innerExpr.$kind, "AccessScope");
    assert.equal(innerExpr.name, "amount");

    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  //
  // Template literals
  //
  test("template literal", () => {
    const src = "`hello ${name}!`";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Template");
    assert.deepEqual(ast.cooked, ["hello ", "!"]);
    assert.equal(ast.expressions.length, 1);
    assert.equal(ast.expressions[0].$kind, "AccessScope");
    assert.equal(ast.expressions[0].name, "name");
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("template literal with no expressions", () => {
    const src = "`plain text`";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Template");
    assert.deepEqual(ast.cooked, ["plain text"]);
    assert.equal(ast.expressions.length, 0);
  });

  test("template literal with escaped backtick", () => {
    const src = "`hi \\` there`";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Template");
    assert.deepEqual(ast.cooked, ["hi \\` there"]);
    assert.equal(ast.expressions.length, 0);
  });

  test("template literal with multiple expressions", () => {
    const src = "`a${x}b${y}c`";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Template");
    assert.deepEqual(ast.cooked, ["a", "b", "c"]);
    assert.equal(ast.expressions.length, 2);
    assert.equal(ast.expressions[0].$kind, "AccessScope");
    assert.equal(ast.expressions[0].name, "x");
    assert.equal(ast.expressions[1].$kind, "AccessScope");
    assert.equal(ast.expressions[1].name, "y");
  });

  test("tagged template literal", () => {
    const src = "format`a${x}b`";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "TaggedTemplate");
    assert.equal(ast.func.$kind, "AccessScope");
    assert.equal(ast.func.name, "format");
    assert.deepEqual(ast.cooked, ["a", "b"]);
    assert.equal(ast.expressions.length, 1);
    assert.equal(ast.expressions[0].$kind, "AccessScope");
    assert.equal(ast.expressions[0].name, "x");
  });

  test("tagged template literal with multiple expressions", () => {
    const src = "fmt`a${x}b${y}c`";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "TaggedTemplate");
    assert.equal(ast.func.$kind, "AccessScope");
    assert.equal(ast.func.name, "fmt");
    assert.deepEqual(ast.cooked, ["a", "b", "c"]);
    assert.equal(ast.expressions.length, 2);
    assert.equal(ast.expressions[0].$kind, "AccessScope");
    assert.equal(ast.expressions[0].name, "x");
    assert.equal(ast.expressions[1].$kind, "AccessScope");
    assert.equal(ast.expressions[1].name, "y");
  });

  test("malformed expression returns BadExpression (no throw)", () => {
    const ast = parseInBothModes("foo(");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("bad nested segment in interpolation returns BadExpression", () => {
    const parser = new LspExpressionParser();
    const ast = parser.parse("hello ${foo(}", "Interpolation");
    assert.equal(ast.expressions[0].$kind, "BadExpression");
  });

  test("non-assignable left-hand side yields BadExpression", () => {
    const ast = parseInBothModes("1 = foo");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("missing converter name after '|'", () => {
    const ast = parseInBothModes("value |");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("missing behavior name after '&'", () => {
    const ast = parseInBothModes("value &");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("unterminated conditional expression", () => {
    const ast = parseInBothModes("cond ? a");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("unterminated template literal yields BadExpression", () => {
    const ast = parseInBothModes("`abc");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("optional chain with invalid member yields BadExpression", () => {
    const ast = parseInBothModes("foo?.123");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("bare '{' is rejected", () => {
    const ast = parseInBothModes("{");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("missing arrow body yields BadExpression", () => {
    const ast = parseInBothModes("x =>");
    assert.equal(ast.$kind, "BadExpression");
  });
});
