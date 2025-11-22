import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { LspExpressionParser } from "../../out/parsers/lsp-expression-parser.js";
import { toSourceFileId } from "../../out/compiler/model/identity.js";

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

  test("unary: +x", () => {
    const src = "+x";
    const ast = parseInBothModes(src);

    assert.equal(ast.$kind, "Unary");
    assert.equal(ast.operation, "+");
    assert.equal(ast.pos, 0);
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "x");
  });

  test("unary: typeof foo", () => {
    const ast = parseInBothModes("typeof foo");
    assert.equal(ast.$kind, "Unary");
    assert.equal(ast.operation, "typeof");
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "foo");
  });

  test("unary: void foo", () => {
    const ast = parseInBothModes("void foo");
    assert.equal(ast.$kind, "Unary");
    assert.equal(ast.operation, "void");
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "foo");
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

  test("binary: other comparisons and equality operators", () => {
    const eq = parseInBothModes("a === b");
    assert.equal(eq.$kind, "Binary");
    assert.equal(eq.operation, "===");

    const neq = parseInBothModes("a !== b");
    assert.equal(neq.$kind, "Binary");
    assert.equal(neq.operation, "!==");

    const looseEq = parseInBothModes("a == b");
    assert.equal(looseEq.$kind, "Binary");
    assert.equal(looseEq.operation, "==");

    const looseNeq = parseInBothModes("a != b");
    assert.equal(looseNeq.$kind, "Binary");
    assert.equal(looseNeq.operation, "!=");

    const lt = parseInBothModes("a < b");
    assert.equal(lt.$kind, "Binary");
    assert.equal(lt.operation, "<");

    const lte = parseInBothModes("a <= b");
    assert.equal(lte.$kind, "Binary");
    assert.equal(lte.operation, "<=");

    const gt = parseInBothModes("a > b");
    assert.equal(gt.$kind, "Binary");
    assert.equal(gt.operation, ">");
  });

  test("binary: arithmetic and misc operators", () => {
    const mod = parseInBothModes("a % b");
    assert.equal(mod.$kind, "Binary");
    assert.equal(mod.operation, "%");

    const div = parseInBothModes("a / b");
    assert.equal(div.$kind, "Binary");
    assert.equal(div.operation, "/");

    const sub = parseInBothModes("a - b");
    assert.equal(sub.$kind, "Binary");
    assert.equal(sub.operation, "-");

    const pow = parseInBothModes("a ** b");
    assert.equal(pow.$kind, "Binary");
    assert.equal(pow.operation, "**");

    const inst = parseInBothModes("a instanceof b");
    assert.equal(inst.$kind, "Binary");
    assert.equal(inst.operation, "instanceof");

    const inOp = parseInBothModes("a in b");
    assert.equal(inOp.$kind, "Binary");
    assert.equal(inOp.operation, "in");
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

  test("compound assignment: a -= b", () => {
    const ast = parseInBothModes("a -= b");
    assert.equal(ast.$kind, "Assign");
    assert.equal(ast.op, "-=");
  });

  test("compound assignment: a *= b", () => {
    const ast = parseInBothModes("a *= b");
    assert.equal(ast.$kind, "Assign");
    assert.equal(ast.op, "*=");
  });

  test("compound assignment: a /= b", () => {
    const ast = parseInBothModes("a /= b");
    assert.equal(ast.$kind, "Assign");
    assert.equal(ast.op, "/=");
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
    assert.equal(ast.message, "Expected ',' or ')' in argument list");
    assert.deepEqual(ast.span, { start: 4, end: "foo(".length });
  });

  test("BadExpression carries parse provenance when rebased", () => {
    const parser = new LspExpressionParser();
    const file = toSourceFileId("component.html");
    const baseSpan = { start: 10, end: 14, file };
    const ast = parser.parse("foo(", "IsProperty", { baseSpan });

    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.span.file, file);
    assert.equal(ast.span.start, baseSpan.start + 4);
    assert.equal(ast.span.end, baseSpan.start + 4);
    assert.equal(ast.origin?.origin?.trace?.[0]?.by, "parse");
  });

  test("baseSpan rebases assignment spans without double offset", () => {
    const parser = new LspExpressionParser();
    const src = "a=b";
    const file = toSourceFileId("span.html");
    const baseSpan = { start: 100, end: 100 + src.length, file };

    const ast = parser.parse(src, "IsProperty", { baseSpan });

    assert.equal(ast.$kind, "Assign");
    assert.equal(ast.span.start, baseSpan.start);
    assert.equal(ast.span.end, baseSpan.end);
    assert.equal(ast.span.file, file);

    assert.equal(ast.target.span.start, baseSpan.start);
    assert.equal(ast.target.span.end, baseSpan.start + 1);
    assert.equal(ast.target.span.file, file);

    assert.equal(ast.value.span.start, baseSpan.start + 2);
    assert.equal(ast.value.span.end, baseSpan.start + src.length);
    assert.equal(ast.value.span.file, file);
  });

  test("baseSpan rebases binary, conditional, and unary spans", () => {
    const parser = new LspExpressionParser();
    const file = toSourceFileId("rebased.html");

    const binSrc = "a+b";
    const binBase = { start: 50, end: 50 + binSrc.length, file };
    const binary = parser.parse(binSrc, "IsProperty", { baseSpan: binBase });
    assert.equal(binary.$kind, "Binary");
    assert.equal(binary.span.start, binBase.start);
    assert.equal(binary.span.end, binBase.end);
    assert.equal(binary.span.file, file);
    assert.equal(binary.left.span.start, binBase.start);
    assert.equal(binary.left.span.end, binBase.start + 1);
    assert.equal(binary.right.span.start, binBase.start + 2);
    assert.equal(binary.right.span.end, binBase.end);

    const condSrc = "a?b:c";
    const condBase = { start: 75, end: 75 + condSrc.length, file };
    const conditional = parser.parse(condSrc, "IsProperty", { baseSpan: condBase });
    assert.equal(conditional.$kind, "Conditional");
    assert.equal(conditional.span.start, condBase.start);
    assert.equal(conditional.span.end, condBase.end);
    assert.equal(conditional.condition.span.start, condBase.start);
    assert.equal(conditional.condition.span.end, condBase.start + 1);
    assert.equal(conditional.yes.span.start, condBase.start + 2);
    assert.equal(conditional.yes.span.end, condBase.start + 3);
    assert.equal(conditional.no.span.start, condBase.start + 4);
    assert.equal(conditional.no.span.end, condBase.end);

    const unarySrc = "-foo";
    const unaryBase = { start: 200, end: 200 + unarySrc.length, file };
    const unary = parser.parse(unarySrc, "IsProperty", { baseSpan: unaryBase });
    assert.equal(unary.$kind, "Unary");
    assert.equal(unary.span.start, unaryBase.start);
    assert.equal(unary.span.end, unaryBase.end);
    assert.equal(unary.expression.$kind, "AccessScope");
    assert.equal(unary.expression.span.start, unaryBase.start + 1);
    assert.equal(unary.expression.span.end, unaryBase.end);
  });

  test("iterator binding defaults preserve rebased spans", () => {
    const parser = new LspExpressionParser();
    const src = "[a=foo] of items";
    const file = toSourceFileId("repeat.html");
    const baseSpan = { start: 400, end: 400 + src.length, file };

    const ast = parser.parse(src, "IsIterator", { baseSpan });
    assert.equal(ast.$kind, "ForOfStatement");
    assert.equal(ast.span.start, baseSpan.start);
    assert.equal(ast.span.end, baseSpan.end);
    assert.equal(ast.span.file, file);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "ArrayBindingPattern");
    const first = decl.elements[0];
    assert.equal(first.$kind, "BindingPatternDefault");
    assert.equal(first.span.start, baseSpan.start + 1);
    assert.equal(first.span.end, baseSpan.start + 6);
    assert.equal(first.span.file, file);
    assert.equal(first.target.$kind, "BindingIdentifier");
    assert.equal(first.target.span.start, baseSpan.start + 1);
    assert.equal(first.target.span.end, baseSpan.start + 2);
    assert.equal(first.default.span.start, baseSpan.start + 3);
    assert.equal(first.default.span.end, baseSpan.start + 6);
    assert.equal(first.default.span.file, file);
  });

  test("bad nested segment in interpolation returns BadExpression", () => {
    const parser = new LspExpressionParser();
    const ast = parser.parse("hello ${foo(}", "Interpolation");
    assert.equal(ast.expressions[0].$kind, "BadExpression");
    assert.equal(ast.expressions[0].message, "Expected ',' or ')' in argument list");
  });

  test("non-assignable left-hand side yields BadExpression", () => {
    const ast = parseInBothModes("1 = foo");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Left-hand side is not assignable");
  });

  test("missing converter name after '|'", () => {
    const ast = parseInBothModes("value |");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected identifier after '|'");
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
    assert.equal(ast.message, "Expected identifier after '?.'");
  });

  test("bare '{' is rejected", () => {
    const ast = parseInBothModes("{");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("missing arrow body yields BadExpression", () => {
    const ast = parseInBothModes("x =>");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Unexpected token EOF in primary expression");
  });

  test("invalid arrow head with non-identifier param yields BadExpression", () => {
    const ast = parseInBothModes("(1) => x");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(
      ast.message,
      "Arrow functions currently support only a single identifier parameter in the LSP parser",
    );
  });

  test("rest parameter not last in arrow list yields BadExpression", () => {
    const ast = parseInBothModes("(...rest, a) => x");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Unexpected token Ellipsis in primary expression");
  });

  test("optional chain cannot be followed by tagged template", () => {
    const ast = parseInBothModes("foo?.`bar`");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("optional keyed access missing closing bracket yields BadExpression", () => {
    const ast = parseInBothModes("foo?.[bar");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected ']' in indexed access");
  });

  test("converter arg separator without arg yields BadExpression", () => {
    const ast = parseInBothModes("value | conv:");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Unexpected token EOF in primary expression");
  });

  test("behavior arg separator without arg yields BadExpression", () => {
    const ast = parseInBothModes("value & beh:");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Unexpected token EOF in primary expression");
  });

  test("converter name must be an identifier", () => {
    const ast = parseInBothModes("value | 123");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected identifier after '|'");
  });

  test("behavior name must be an identifier", () => {
    const ast = parseInBothModes("value & 123");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected identifier after '&'");
  });

  test("parse with unknown expression type yields BadExpression", () => {
    const parser = new LspExpressionParser();
    const ast = parser.parse("foo", "None");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("empty expression yields BadExpression", () => {
    const parser = new LspExpressionParser();
    const ast = parser.parse("", "IsProperty");
    assert.equal(ast.$kind, "BadExpression");
    assert.deepEqual(ast.span, { start: 0, end: 0 });
  });

  test("bare 'import' is rejected", () => {
    const ast = parseInBothModes("import");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("missing closing bracket in indexed access yields BadExpression", () => {
    const ast = parseInBothModes("foo[bar");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected ']' in indexed access");
  });

  test("missing closing paren in call yields BadExpression", () => {
    const ast = parseInBothModes("foo(bar");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected ',' or ')' in argument list");
  });

  test("object literal with invalid key yields BadExpression", () => {
    const ast = parseInBothModes("{ []: 1 }");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Invalid object literal key; expected identifier, string, or number");
  });

  test("array literal missing closing bracket yields BadExpression", () => {
    const ast = parseInBothModes("[1, 2");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("paren expression followed by => yields BadExpression (not an arrow head)", () => {
    const ast = parseInBothModes("(a + b) => c");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("complex optional chain with tails parses", () => {
    const src = "user?.profile?.getName()?.toUpperCase() | upper:'en' & throttle:100";
    const ast = parseInBothModes(src);
    assert.equal(ast.$kind, "BindingBehavior");
    assert.equal(ast.name, "throttle");
    assert.equal(ast.args.length, 1);

    const vc = ast.expression;
    assert.equal(vc.$kind, "ValueConverter");
    assert.equal(vc.name, "upper");
    assert.equal(vc.args.length, 1);

    const call = vc.expression;
    assert.equal(call.$kind, "CallMember");
    assert.equal(call.name, "toUpperCase");
    assert.equal(call.optionalCall, false);
    assert.equal(call.optionalMember, true);

    const innerCall = call.object;
    assert.equal(innerCall.$kind, "CallMember");
    assert.equal(innerCall.optionalCall, false);
    assert.equal(innerCall.optionalMember, true);

    const member = innerCall.object;
    assert.equal(member.$kind, "AccessMember");
    assert.equal(member.name, "profile");
    assert.equal(member.optional, true);
  });

  test("optional call on member with optional member flag persists", () => {
    const src = "user?.getName?.()";
    const ast = parseInBothModes(src);
    assert.equal(ast.$kind, "CallMember");
    assert.equal(ast.optionalMember, true);
    assert.equal(ast.optionalCall, true);
    assert.equal(ast.name, "getName");
    assert.equal(ast.object.$kind, "AccessScope");
    assert.equal(ast.object.name, "user");
  });

  test("tuple-like nested optional chaining renders correctly", () => {
    const src = "a?.[b?.c]?.(d?.e)";
    const ast = parseInBothModes(src);
    assert.equal(ast.$kind, "CallFunction");
    assert.equal(ast.optional, true);
    const keyed = ast.func;
    assert.equal(keyed.$kind, "AccessKeyed");
    assert.equal(keyed.optional, true);
    assert.equal(keyed.key.$kind, "AccessMember");
    assert.equal(keyed.key.optional, true);
    const member = keyed.key;
    assert.equal(member.$kind, "AccessMember");
    assert.equal(member.name, "c");
    assert.equal(member.object.$kind, "AccessScope");
    assert.equal(member.object.name, "b");
  });

  test("value converter with multiple args parses", () => {
    const src = "value | conv:1:two:true";
    const ast = parseInBothModes(src);
    assert.equal(ast.$kind, "ValueConverter");
    assert.equal(ast.args.length, 3);
    assert.equal(ast.args[0].$kind, "PrimitiveLiteral");
    assert.equal(ast.args[1].$kind, "AccessScope");
    assert.equal(ast.args[1].name, "two");
    assert.equal(ast.args[2].$kind, "PrimitiveLiteral");
    assert.equal(ast.expression.$kind, "AccessScope");
    assert.equal(ast.expression.name, "value");
  });

  test("trailing tokens after a valid expression return BadExpression", () => {
    const ast = parseInBothModes("foo bar");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Unexpected token after end of expression");
  });

  test("new expression without args parses", () => {
    const ast = parseInBothModes("new Foo");
    assert.equal(ast.$kind, "New");
    assert.equal(ast.args.length, 0);
    assert.equal(ast.func.$kind, "AccessScope");
    assert.equal(ast.func.name, "Foo");
  });

  test("new expression with member and args parses", () => {
    const ast = parseInBothModes("new foo.bar(1, baz)");
    assert.equal(ast.$kind, "New");
    assert.equal(ast.args.length, 0);
    assert.equal(ast.func.$kind, "CallMember");
    assert.equal(ast.func.object.$kind, "AccessScope");
    assert.equal(ast.func.object.name, "foo");
    assert.equal(ast.func.name, "bar");
    assert.equal(ast.func.optionalMember, false);
    assert.equal(ast.func.optionalCall, false);
    assert.equal(ast.func.args.length, 2);
    assert.equal(ast.func.args[0].$kind, "PrimitiveLiteral");
    assert.equal(ast.func.args[0].value, 1);
    assert.equal(ast.func.args[1].$kind, "AccessScope");
    assert.equal(ast.func.args[1].name, "baz");
  });

  test("member access without identifier yields BadExpression", () => {
    const ast = parseInBothModes("foo.");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected identifier after '.'");
  });

  test("non-optional keyed access sets optional to false", () => {
    const ast = parseInBothModes("items[index]");
    assert.equal(ast.$kind, "AccessKeyed");
    assert.equal(ast.optional, false);
    assert.equal(ast.object.$kind, "AccessScope");
    assert.equal(ast.object.name, "items");
    assert.equal(ast.key.$kind, "AccessScope");
    assert.equal(ast.key.name, "index");
  });

  test("parenthesized callee produces CallFunction with inner expression intact", () => {
    const ast = parseInBothModes("(foo + bar)(baz)");
    assert.equal(ast.$kind, "CallFunction");
    assert.equal(ast.optional, false);
    assert.equal(ast.func.$kind, "Paren");
    assert.equal(ast.func.expression.$kind, "Binary");
    assert.equal(ast.func.expression.operation, "+");
    assert.equal(ast.func.expression.left.$kind, "AccessScope");
    assert.equal(ast.func.expression.left.name, "foo");
    assert.equal(ast.func.expression.right.$kind, "AccessScope");
    assert.equal(ast.func.expression.right.name, "bar");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "AccessScope");
    assert.equal(ast.args[0].name, "baz");
  });

  test("trailing comma in call arguments is allowed", () => {
    const ast = parseInBothModes("fn(a,)");
    assert.equal(ast.$kind, "CallScope");
    assert.equal(ast.args.length, 1);
    assert.equal(ast.args[0].$kind, "AccessScope");
    assert.equal(ast.args[0].name, "a");
  });

  test("missing closing paren in grouped expression yields BadExpression", () => {
    const ast = parseInBothModes("(foo");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected ')' to close parenthesized expression");
  });

  test("$this. without identifier yields BadExpression", () => {
    const ast = parseInBothModes("$this.");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected identifier after '$this.'");
  });

  test("$parent. without identifier yields BadExpression", () => {
    const ast = parseInBothModes("$parent.");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected identifier after '$parent.'");
  });

  test("array literal variants preserve holes and trailing commas", () => {
    const empty = parseInBothModes("[]");
    assert.equal(empty.$kind, "ArrayLiteral");
    assert.equal(empty.elements.length, 0);

    const single = parseInBothModes("[1]");
    assert.equal(single.$kind, "ArrayLiteral");
    assert.equal(single.elements.length, 1);
    assert.equal(single.elements[0].$kind, "PrimitiveLiteral");
    assert.equal(single.elements[0].value, 1);

    const holes = parseInBothModes("[, ,]");
    assert.equal(holes.$kind, "ArrayLiteral");
    assert.equal(holes.elements.length, 2);
    assert.equal(holes.elements[0].$kind, "PrimitiveLiteral");
    assert.equal(holes.elements[0].value, undefined);
    assert.equal(holes.elements[1].$kind, "PrimitiveLiteral");
    assert.equal(holes.elements[1].value, undefined);

    const trailing = parseInBothModes("[1,]");
    assert.equal(trailing.$kind, "ArrayLiteral");
    assert.equal(trailing.elements.length, 1);
    assert.equal(trailing.elements[0].$kind, "PrimitiveLiteral");
    assert.equal(trailing.elements[0].value, 1);
  });

  test("object literal with mixed keys and trailing comma parses", () => {
    const ast = parseInBothModes("{foo: bar, 1: two, 'three': 3,}");
    assert.equal(ast.$kind, "ObjectLiteral");
    assert.deepEqual(ast.keys, ["foo", 1, "three"]);
    assert.equal(ast.values.length, 3);
    assert.equal(ast.values[0].$kind, "AccessScope");
    assert.equal(ast.values[0].name, "bar");
    assert.equal(ast.values[1].$kind, "AccessScope");
    assert.equal(ast.values[1].name, "two");
    assert.equal(ast.values[2].$kind, "PrimitiveLiteral");
    assert.equal(ast.values[2].value, 3);
  });

  test("object literal without trailing comma parses", () => {
    const ast = parseInBothModes("{foo: bar}");
    assert.equal(ast.$kind, "ObjectLiteral");
    assert.deepEqual(ast.keys, ["foo"]);
    assert.equal(ast.values.length, 1);
    assert.equal(ast.values[0].$kind, "AccessScope");
    assert.equal(ast.values[0].name, "bar");
  });

  test("empty object literal parses", () => {
    const ast = parseInBothModes("{}");
    assert.equal(ast.$kind, "ObjectLiteral");
    assert.equal(ast.keys.length, 0);
    assert.equal(ast.values.length, 0);
  });

  test("missing colon after object literal key yields BadExpression", () => {
    const ast = parseInBothModes("{foo 1}");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected ':' after object literal key");
  });

  test("object literal requires comma between properties", () => {
    const ast = parseInBothModes("{foo: 1 bar: 2}");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected ',' or '}' in object literal");
  });

  test("IsCustom parsing returns a Custom expression", () => {
    const parser = new LspExpressionParser();
    const ast = parser.parse("raw content", "IsCustom");
    assert.equal(ast.$kind, "Custom");
    assert.equal(ast.value, "raw content");
    assert.deepEqual(ast.span, { start: 0, end: "raw content".length });
  });
});
