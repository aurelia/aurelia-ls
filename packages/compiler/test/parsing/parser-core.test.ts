import { test, describe, expect } from "vitest";

import { ExpressionParser, toSourceFileId } from "@aurelia-ls/compiler";

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
  const parser = new ExpressionParser();
  const propAst = parser.parse(source, "IsProperty");
  const fnAst = parser.parse(source, "IsFunction");

  expect(
    stripSpans(fnAst),
    `IsFunction / IsProperty mismatch for: ${source}`,
  ).toEqual(stripSpans(propAst));

  return propAst;
}

describe("expression-parser / core (IsProperty & IsFunction)", () => {
  //
  // Identifiers / scope hops
  //
  test("identifier: foo (AccessScope ancestor 0)", () => {
    const src = "foo";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessScope");
    expect(ast.name.name).toBe("foo");
    expect(ast.ancestor).toBe(0);
    expect(src.slice(ast.name.span.start, ast.name.span.end)).toBe("foo");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("scope hop: $this.foo", () => {
    const src = "$this.foo";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessScope");
    expect(ast.name.name).toBe("foo");
    expect(ast.ancestor).toBe(0);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("scope hop: $parent.bar (ancestor 1)", () => {
    const src = "$parent.bar";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessScope");
    expect(ast.name.name).toBe("bar");
    expect(ast.ancestor).toBe(1);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("scope hop: $parent.$parent.baz (ancestor 2)", () => {
    const src = "$parent.$parent.baz";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessScope");
    expect(ast.name.name).toBe("baz");
    expect(ast.ancestor).toBe(2);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("boundary: this -> AccessBoundary", () => {
    const src = "this";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessBoundary");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("special scope: $this -> AccessThis ancestor 0", () => {
    const src = "$this";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessThis");
    expect(ast.ancestor).toBe(0);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("special scope: $parent -> AccessThis ancestor 1", () => {
    const src = "$parent";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessThis");
    expect(ast.ancestor).toBe(1);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("identifier with BMP characters", () => {
    const src = "\u00C9foo";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessScope");
    expect(ast.name.name).toBe("\u00C9foo");
  });

  //
  // Globals vs scopes / calls
  //
  test("CallGlobal: parseInt(x)", () => {
    const src = "parseInt(x)";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("CallGlobal");
    expect(ast.name.name).toBe("parseInt");
    expect(ast.args.length).toBe(1);

    const arg0 = ast.args[0];
    expect(arg0.$kind).toBe("AccessScope");
    expect(arg0.name.name).toBe("x");
    expect(arg0.ancestor).toBe(0);

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("CallMember on global object: Math.max(a, b)", () => {
    const src = "Math.max(a, b)";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("CallMember");
    expect(ast.name.name).toBe("max");
    expect(ast.optionalMember).toBe(false);
    expect(ast.optionalCall).toBe(false);

    expect(ast.object).toBeTruthy();
    expect(ast.object.$kind).toBe("AccessGlobal");
    expect(ast.object.name.name).toBe("Math");

    expect(ast.args.length).toBe(2);
    expect(ast.args[0].$kind).toBe("AccessScope");
    expect(ast.args[0].name.name).toBe("a");
    expect(ast.args[1].$kind).toBe("AccessScope");
    expect(ast.args[1].name.name).toBe("b");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("CallScope: foo(x) stays scoped, not global", () => {
    const src = "foo(x)";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("CallScope");
    expect(ast.name.name).toBe("foo");
    expect(ast.ancestor).toBe(0);
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("AccessScope");
    expect(ast.args[0].name.name).toBe("x");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("optional call on scope binding: foo?.()", () => {
    const src = "foo?.()";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("CallScope");
    expect(ast.name.name).toBe("foo");
    expect(ast.optional).toBe(true);
    expect(ast.ancestor).toBe(0);
    expect(ast.args.length).toBe(0);
  });

  test("optional call on member: user.get?.(id)", () => {
    const src = "user.get?.(id)";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("CallMember");
    expect(ast.name.name).toBe("get");
    expect(ast.optionalMember).toBe(false);
    expect(ast.optionalCall).toBe(true);

    expect(ast.object.$kind).toBe("AccessScope");
    expect(ast.object.name.name).toBe("user");

    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("AccessScope");
    expect(ast.args[0].name.name).toBe("id");
  });

  test("optional chaining + optional call: user?.get?.()", () => {
    const src = "user?.get?.()";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("CallMember");
    expect(ast.name.name).toBe("get");
    expect(ast.optionalMember).toBe(true);
    expect(ast.optionalCall).toBe(true);

    expect(ast.object.$kind).toBe("AccessScope");
    expect(ast.object.name.name).toBe("user");
    expect(ast.args.length).toBe(0);
  });

  //
  // Unary expressions
  //
  test("unary: !foo", () => {
    const src = "!foo";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Unary");
    expect(ast.operation).toBe("!");
    expect(ast.pos).toBe(0);
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("foo");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("unary: -x", () => {
    const src = "-x";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Unary");
    expect(ast.operation).toBe("-");
    expect(ast.pos).toBe(0);
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("x");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("unary: +x", () => {
    const src = "+x";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Unary");
    expect(ast.operation).toBe("+");
    expect(ast.pos).toBe(0);
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("x");
  });

  test("unary: typeof foo", () => {
    const ast = parseInBothModes("typeof foo");
    expect(ast.$kind).toBe("Unary");
    expect(ast.operation).toBe("typeof");
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("foo");
  });

  test("unary: void foo", () => {
    const ast = parseInBothModes("void foo");
    expect(ast.$kind).toBe("Unary");
    expect(ast.operation).toBe("void");
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("foo");
  });

  test("unary prefix: ++i", () => {
    const src = "++i";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Unary");
    expect(ast.operation).toBe("++");
    expect(ast.pos).toBe(0);
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("i");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("unary postfix: i++", () => {
    const src = "i++";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Unary");
    expect(ast.operation).toBe("++");
    expect(ast.pos).toBe(1);
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("i");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  //
  // Parenthesized expressions
  //
  test("parenthesized expression produces Paren node", () => {
    const src = "(foo)";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Paren");
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("foo");
    expect(ast.span.start).toBe(0);
    expect(ast.span.end).toBe(src.length);
    expect(src.slice(ast.expression.span.start, ast.expression.span.end)).toBe("foo");
  });

  test("paren can wrap a member target", () => {
    const src = "(foo).bar";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("AccessMember");
    expect(ast.name.name).toBe("bar");
    expect(src.slice(ast.name.span.start, ast.name.span.end)).toBe("bar");

    const obj = ast.object;
    expect(obj.$kind).toBe("Paren");
    expect(obj.expression.$kind).toBe("AccessScope");
    expect(obj.expression.name.name).toBe("foo");
  });

  //
  // Binary / precedence
  //
  test("binary precedence: 1 + 2 * 3", () => {
    const src = "1 + 2 * 3";
    const ast = parseInBothModes(src);

    expect(stripSpans(ast)).toEqual({
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

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("binary precedence: a && b || c -> (a && b) || c", () => {
    const src = "a && b || c";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Binary");
    expect(ast.operation).toBe("||");

    const left = ast.left;
    expect(left.$kind).toBe("Binary");
    expect(left.operation).toBe("&&");
    expect(left.left.$kind).toBe("AccessScope");
    expect(left.left.name.name).toBe("a");
    expect(left.right.$kind).toBe("AccessScope");
    expect(left.right.name.name).toBe("b");

    const right = ast.right;
    expect(right.$kind).toBe("AccessScope");
    expect(right.name.name).toBe("c");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("binary: nullish coalescing a ?? b", () => {
    const src = "a ?? b";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Binary");
    expect(ast.operation).toBe("??");
    expect(ast.left.$kind).toBe("AccessScope");
    expect(ast.right.$kind).toBe("AccessScope");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("binary: comparison a >= b", () => {
    const src = "a >= b";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Binary");
    expect(ast.operation).toBe(">=");
    expect(ast.left.$kind).toBe("AccessScope");
    expect(ast.left.name.name).toBe("a");
    expect(ast.right.$kind).toBe("AccessScope");
    expect(ast.right.name.name).toBe("b");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("binary: other comparisons and equality operators", () => {
    const eq = parseInBothModes("a === b");
    expect(eq.$kind).toBe("Binary");
    expect(eq.operation).toBe("===");

    const neq = parseInBothModes("a !== b");
    expect(neq.$kind).toBe("Binary");
    expect(neq.operation).toBe("!==");

    const looseEq = parseInBothModes("a == b");
    expect(looseEq.$kind).toBe("Binary");
    expect(looseEq.operation).toBe("==");

    const looseNeq = parseInBothModes("a != b");
    expect(looseNeq.$kind).toBe("Binary");
    expect(looseNeq.operation).toBe("!=");

    const lt = parseInBothModes("a < b");
    expect(lt.$kind).toBe("Binary");
    expect(lt.operation).toBe("<");

    const lte = parseInBothModes("a <= b");
    expect(lte.$kind).toBe("Binary");
    expect(lte.operation).toBe("<=");

    const gt = parseInBothModes("a > b");
    expect(gt.$kind).toBe("Binary");
    expect(gt.operation).toBe(">");
  });

  test("binary: arithmetic and misc operators", () => {
    const mod = parseInBothModes("a % b");
    expect(mod.$kind).toBe("Binary");
    expect(mod.operation).toBe("%");

    const div = parseInBothModes("a / b");
    expect(div.$kind).toBe("Binary");
    expect(div.operation).toBe("/");

    const sub = parseInBothModes("a - b");
    expect(sub.$kind).toBe("Binary");
    expect(sub.operation).toBe("-");

    const pow = parseInBothModes("a ** b");
    expect(pow.$kind).toBe("Binary");
    expect(pow.operation).toBe("**");

    const inst = parseInBothModes("a instanceof b");
    expect(inst.$kind).toBe("Binary");
    expect(inst.operation).toBe("instanceof");

    const inOp = parseInBothModes("a in b");
    expect(inOp.$kind).toBe("Binary");
    expect(inOp.operation).toBe("in");
  });

  test("binary precedence with parentheses: (1 + 2) * 3", () => {
    const src = "(1 + 2) * 3";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Binary");
    expect(ast.operation).toBe("*");

    const left = ast.left;
    expect(left.$kind).toBe("Paren");
    expect(left.expression.$kind).toBe("Binary");
    expect(left.expression.operation).toBe("+");
    expect(left.expression.left.$kind).toBe("PrimitiveLiteral");
    expect(left.expression.left.value).toBe(1);
    expect(left.expression.right.$kind).toBe("PrimitiveLiteral");
    expect(left.expression.right.value).toBe(2);
    expect(src.slice(left.span.start, left.span.end)).toBe("(1 + 2)");

    expect(ast.right.$kind).toBe("PrimitiveLiteral");
    expect(ast.right.value).toBe(3);

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("binary precedence with parentheses: a && (b || c)", () => {
    const src = "a && (b || c)";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Binary");
    expect(ast.operation).toBe("&&");

    const right = ast.right;
    expect(right.$kind).toBe("Paren");
    expect(right.expression.$kind).toBe("Binary");
    expect(right.expression.operation).toBe("||");
    expect(right.expression.left.$kind).toBe("AccessScope");
    expect(right.expression.left.name.name).toBe("b");
    expect(right.expression.right.$kind).toBe("AccessScope");
    expect(right.expression.right.name.name).toBe("c");
    expect(src.slice(right.span.start, right.span.end)).toBe("(b || c)");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  //
  // Conditional
  //
  test("conditional: cond ? a : b", () => {
    const src = "cond ? a : b";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Conditional");
    expect(ast.condition.$kind).toBe("AccessScope");
    expect(ast.condition.name.name).toBe("cond");
    expect(ast.yes.$kind).toBe("AccessScope");
    expect(ast.yes.name.name).toBe("a");
    expect(ast.no.$kind).toBe("AccessScope");
    expect(ast.no.name.name).toBe("b");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  //
  // Assignments
  //
  test("assignment: a = b", () => {
    const src = "a = b";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Assign");
    expect(ast.op).toBe("=");
    expect(ast.target.$kind).toBe("AccessScope");
    expect(ast.target.name.name).toBe("a");
    expect(ast.value.$kind).toBe("AccessScope");
    expect(ast.value.name.name).toBe("b");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("compound assignment: a -= b", () => {
    const ast = parseInBothModes("a -= b");
    expect(ast.$kind).toBe("Assign");
    expect(ast.op).toBe("-=");
  });

  test("compound assignment: a *= b", () => {
    const ast = parseInBothModes("a *= b");
    expect(ast.$kind).toBe("Assign");
    expect(ast.op).toBe("*=");
  });

  test("compound assignment: a /= b", () => {
    const ast = parseInBothModes("a /= b");
    expect(ast.$kind).toBe("Assign");
    expect(ast.op).toBe("/=");
  });

  test("compound assignment: a += b", () => {
    const src = "a += b";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Assign");
    expect(ast.op).toBe("+=");
    expect(ast.target.$kind).toBe("AccessScope");
    expect(ast.target.name.name).toBe("a");
    expect(ast.value.$kind).toBe("AccessScope");
    expect(ast.value.name.name).toBe("b");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("right-associative assignment: a = b = c", () => {
    const src = "a = b = c";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Assign");
    expect(ast.op).toBe("=");
    expect(ast.target.$kind).toBe("AccessScope");
    expect(ast.target.name.name).toBe("a");

    const inner = ast.value;
    expect(inner.$kind).toBe("Assign");
    expect(inner.op).toBe("=");
    expect(inner.target.$kind).toBe("AccessScope");
    expect(inner.target.name.name).toBe("b");
    expect(inner.value.$kind).toBe("AccessScope");
    expect(inner.value.name.name).toBe("c");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  //
  // Arrow functions
  //
  test("arrow: x => x + 1", () => {
    const src = "x => x + 1";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("ArrowFunction");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("BindingIdentifier");
    expect(ast.args[0].name.name).toBe("x");

    expect(ast.body.$kind).toBe("Binary");
    expect(ast.body.operation).toBe("+");
    expect(ast.body.left.$kind).toBe("AccessScope");
    expect(ast.body.left.name.name).toBe("x");
    expect(ast.body.right.$kind).toBe("PrimitiveLiteral");
    expect(ast.body.right.value).toBe(1);

    expect(ast.rest).toBe(false);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("arrow: (a, b) => a + b", () => {
    const src = "(a, b) => a + b";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("ArrowFunction");
    expect(ast.args.length).toBe(2);
    expect(ast.args[0].$kind).toBe("BindingIdentifier");
    expect(ast.args[0].name.name).toBe("a");
    expect(ast.args[1].$kind).toBe("BindingIdentifier");
    expect(ast.args[1].name.name).toBe("b");

    expect(ast.body.$kind).toBe("Binary");
    expect(ast.body.operation).toBe("+");
    expect(ast.body.left.$kind).toBe("AccessScope");
    expect(ast.body.left.name.name).toBe("a");
    expect(ast.body.right.$kind).toBe("AccessScope");
    expect(ast.body.right.name.name).toBe("b");

    expect(ast.rest).toBe(false);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("arrow: (a, ...rest) => a", () => {
    const src = "(a, ...rest) => a";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("ArrowFunction");
    expect(ast.args.length).toBe(2);
    expect(ast.args[0].$kind).toBe("BindingIdentifier");
    expect(ast.args[0].name.name).toBe("a");
    expect(ast.args[1].$kind).toBe("BindingIdentifier");
    expect(ast.args[1].name.name).toBe("rest");
    expect(ast.rest).toBe(true);
  });

  test("arrow: (...rest) => rest", () => {
    const src = "(...rest) => rest";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("ArrowFunction");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("BindingIdentifier");
    expect(ast.args[0].name.name).toBe("rest");
    expect(ast.rest).toBe(true);
  });

  test("arrow: () => x (zero parameters)", () => {
    const src = "() => x";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("ArrowFunction");
    expect(ast.args.length).toBe(0);
    expect(ast.body.$kind).toBe("AccessScope");
    expect(ast.body.name.name).toBe("x");
    expect(ast.rest).toBe(false);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("arrow: (x) => x + 1 (paren single param)", () => {
    const src = "(x) => x + 1";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("ArrowFunction");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("BindingIdentifier");
    expect(ast.args[0].name.name).toBe("x");

    expect(ast.body.$kind).toBe("Binary");
    expect(ast.body.operation).toBe("+");
    expect(ast.body.left.$kind).toBe("AccessScope");
    expect(ast.body.left.name.name).toBe("x");
    expect(ast.body.right.$kind).toBe("PrimitiveLiteral");
    expect(ast.body.right.value).toBe(1);

    expect(ast.rest).toBe(false);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  //
  // Tails: value converters / binding behaviors
  //
  test("value converter tail: amount | currency:'USD'", () => {
    const src = "amount | currency:'USD'";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("ValueConverter");
    expect(ast.name.name).toBe("currency");
    expect(src.slice(ast.name.span.start, ast.name.span.end)).toBe("currency");
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("amount");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("PrimitiveLiteral");
    expect(ast.args[0].value).toBe("USD");

    // Span for the value converter should cover everything up to the end of 'USD'
    expect(src.slice(ast.span.start, ast.span.end), "amount | currency:'USD'");
  });

  test("value converter + behavior tail: amount | currency:'USD' & throttle:100", () => {
    const src = "amount | currency:'USD' & throttle:100";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("BindingBehavior");
    expect(ast.name.name).toBe("throttle");
    expect(src.slice(ast.name.span.start, ast.name.span.end)).toBe("throttle");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("PrimitiveLiteral");
    expect(ast.args[0].value).toBe(100);

    // Inner value converter
    const vc = ast.expression;
    expect(vc.$kind).toBe("ValueConverter");
    expect(vc.name.name).toBe("currency");
    expect(vc.expression.$kind).toBe("AccessScope");
    expect(vc.expression.name.name).toBe("amount");
    expect(vc.args.length).toBe(1);
    expect(vc.args[0].$kind).toBe("PrimitiveLiteral");
    expect(vc.args[0].value).toBe("USD");

    // Spans:
    // - inner converter: up to the end of 'USD'
    expect(src.slice(vc.span.start, vc.span.end)).toBe("amount | currency:'USD'");
    // - outer behavior: full expression
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("binding behavior without converter: amount & throttle:100", () => {
    const src = "amount & throttle:100";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("BindingBehavior");
    expect(ast.name.name).toBe("throttle");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("PrimitiveLiteral");
    expect(ast.args[0].value).toBe(100);

    const expr = ast.expression;
    expect(expr.$kind).toBe("AccessScope");
    expect(expr.name.name).toBe("amount");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("multiple binding behaviors: amount & throttle:100 & debounce:50", () => {
    const src = "amount & throttle:100 & debounce:50";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("BindingBehavior");
    expect(ast.name.name).toBe("debounce");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("PrimitiveLiteral");
    expect(ast.args[0].value).toBe(50);

    const first = ast.expression;
    expect(first.$kind).toBe("BindingBehavior");
    expect(first.name.name).toBe("throttle");
    expect(first.args.length).toBe(1);
    expect(first.args[0].$kind).toBe("PrimitiveLiteral");
    expect(first.args[0].value).toBe(100);

    const innerExpr = first.expression;
    expect(innerExpr.$kind).toBe("AccessScope");
    expect(innerExpr.name.name).toBe("amount");

    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  //
  // Template literals
  //
  test("template literal", () => {
    const src = "`hello ${name}!`";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Template");
    expect(ast.cooked).toEqual(["hello ", "!"]);
    expect(ast.expressions.length).toBe(1);
    expect(ast.expressions[0].$kind).toBe("AccessScope");
    expect(ast.expressions[0].name.name).toBe("name");
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("template literal with no expressions", () => {
    const src = "`plain text`";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Template");
    expect(ast.cooked).toEqual(["plain text"]);
    expect(ast.expressions.length).toBe(0);
  });

  test("template literal with escaped backtick", () => {
    const src = "`hi \\` there`";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Template");
    expect(ast.cooked).toEqual(["hi \\` there"]);
    expect(ast.expressions.length).toBe(0);
  });

  test("template literal with multiple expressions", () => {
    const src = "`a${x}b${y}c`";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("Template");
    expect(ast.cooked).toEqual(["a", "b", "c"]);
    expect(ast.expressions.length).toBe(2);
    expect(ast.expressions[0].$kind).toBe("AccessScope");
    expect(ast.expressions[0].name.name).toBe("x");
    expect(ast.expressions[1].$kind).toBe("AccessScope");
    expect(ast.expressions[1].name.name).toBe("y");
  });

  test("tagged template literal", () => {
    const src = "format`a${x}b`";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("TaggedTemplate");
    expect(ast.func.$kind).toBe("AccessScope");
    expect(ast.func.name.name).toBe("format");
    expect(ast.cooked).toEqual(["a", "b"]);
    expect(ast.expressions.length).toBe(1);
    expect(ast.expressions[0].$kind).toBe("AccessScope");
    expect(ast.expressions[0].name.name).toBe("x");
  });

  test("tagged template literal with multiple expressions", () => {
    const src = "fmt`a${x}b${y}c`";
    const ast = parseInBothModes(src);

    expect(ast.$kind).toBe("TaggedTemplate");
    expect(ast.func.$kind).toBe("AccessScope");
    expect(ast.func.name.name).toBe("fmt");
    expect(ast.cooked).toEqual(["a", "b", "c"]);
    expect(ast.expressions.length).toBe(2);
    expect(ast.expressions[0].$kind).toBe("AccessScope");
    expect(ast.expressions[0].name.name).toBe("x");
    expect(ast.expressions[1].$kind).toBe("AccessScope");
    expect(ast.expressions[1].name.name).toBe("y");
  });

  test("malformed expression returns BadExpression (no throw)", () => {
    const ast = parseInBothModes("foo(");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ',' or ')' in argument list");
    expect(ast.span).toEqual({ start: 4, end: "foo(".length });
  });

  test("BadExpression carries parse provenance when rebased", () => {
    const parser = new ExpressionParser();
    const file = toSourceFileId("component.html");
    const baseSpan = { start: 10, end: 14, file };
    const ast = parser.parse("foo(", "IsProperty", { baseSpan });

    expect(ast.$kind).toBe("BadExpression");
    expect(ast.span.file).toBe(file);
    expect(ast.span.start).toBe(baseSpan.start + 4);
    expect(ast.span.end).toBe(baseSpan.start + 4);
    expect(ast.origin?.origin?.trace?.[0]?.by).toBe("parse");
  });

  test("baseSpan rebases assignment spans without double offset", () => {
    const parser = new ExpressionParser();
    const src = "a=b";
    const file = toSourceFileId("span.html");
    const baseSpan = { start: 100, end: 100 + src.length, file };

    const ast = parser.parse(src, "IsProperty", { baseSpan });

    expect(ast.$kind).toBe("Assign");
    expect(ast.span.start).toBe(baseSpan.start);
    expect(ast.span.end).toBe(baseSpan.end);
    expect(ast.span.file).toBe(file);

    expect(ast.target.span.start).toBe(baseSpan.start);
    expect(ast.target.span.end).toBe(baseSpan.start + 1);
    expect(ast.target.span.file).toBe(file);

    expect(ast.value.span.start).toBe(baseSpan.start + 2);
    expect(ast.value.span.end).toBe(baseSpan.start + src.length);
    expect(ast.value.span.file).toBe(file);
  });

  test("baseSpan rebases binary, conditional, and unary spans", () => {
    const parser = new ExpressionParser();
    const file = toSourceFileId("rebased.html");

    const binSrc = "a+b";
    const binBase = { start: 50, end: 50 + binSrc.length, file };
    const binary = parser.parse(binSrc, "IsProperty", { baseSpan: binBase });
    expect(binary.$kind).toBe("Binary");
    expect(binary.span.start).toBe(binBase.start);
    expect(binary.span.end).toBe(binBase.end);
    expect(binary.span.file).toBe(file);
    expect(binary.left.span.start).toBe(binBase.start);
    expect(binary.left.span.end).toBe(binBase.start + 1);
    expect(binary.right.span.start).toBe(binBase.start + 2);
    expect(binary.right.span.end).toBe(binBase.end);

    const condSrc = "a?b:c";
    const condBase = { start: 75, end: 75 + condSrc.length, file };
    const conditional = parser.parse(condSrc, "IsProperty", { baseSpan: condBase });
    expect(conditional.$kind).toBe("Conditional");
    expect(conditional.span.start).toBe(condBase.start);
    expect(conditional.span.end).toBe(condBase.end);
    expect(conditional.condition.span.start).toBe(condBase.start);
    expect(conditional.condition.span.end).toBe(condBase.start + 1);
    expect(conditional.yes.span.start).toBe(condBase.start + 2);
    expect(conditional.yes.span.end).toBe(condBase.start + 3);
    expect(conditional.no.span.start).toBe(condBase.start + 4);
    expect(conditional.no.span.end).toBe(condBase.end);

    const unarySrc = "-foo";
    const unaryBase = { start: 200, end: 200 + unarySrc.length, file };
    const unary = parser.parse(unarySrc, "IsProperty", { baseSpan: unaryBase });
    expect(unary.$kind).toBe("Unary");
    expect(unary.span.start).toBe(unaryBase.start);
    expect(unary.span.end).toBe(unaryBase.end);
    expect(unary.expression.$kind).toBe("AccessScope");
    expect(unary.expression.span.start).toBe(unaryBase.start + 1);
    expect(unary.expression.span.end).toBe(unaryBase.end);
  });

  test("iterator binding defaults preserve rebased spans", () => {
    const parser = new ExpressionParser();
    const src = "[a=foo] of items";
    const file = toSourceFileId("repeat.html");
    const baseSpan = { start: 400, end: 400 + src.length, file };

    const ast = parser.parse(src, "IsIterator", { baseSpan });
    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.span.start).toBe(baseSpan.start);
    expect(ast.span.end).toBe(baseSpan.end);
    expect(ast.span.file).toBe(file);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("ArrayBindingPattern");
    const first = decl.elements[0];
    expect(first.$kind).toBe("BindingPatternDefault");
    expect(first.span.start).toBe(baseSpan.start + 1);
    expect(first.span.end).toBe(baseSpan.start + 6);
    expect(first.span.file).toBe(file);
    expect(first.target.$kind).toBe("BindingIdentifier");
    expect(first.target.span.start).toBe(baseSpan.start + 1);
    expect(first.target.span.end).toBe(baseSpan.start + 2);
    expect(first.default.span.start).toBe(baseSpan.start + 3);
    expect(first.default.span.end).toBe(baseSpan.start + 6);
    expect(first.default.span.file).toBe(file);
  });

  test("bad nested segment in interpolation returns BadExpression", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("hello ${foo(}", "Interpolation");
    expect(ast.expressions[0].$kind).toBe("BadExpression");
    expect(ast.expressions[0].message, "Expected ',' or ')' in argument list");
  });

  test("non-assignable left-hand side yields BadExpression", () => {
    const ast = parseInBothModes("1 = foo");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Left-hand side is not assignable");
  });

  test("missing converter name after '|'", () => {
    const ast = parseInBothModes("value |");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected identifier after '|'");
  });

  test("missing behavior name after '&'", () => {
    const ast = parseInBothModes("value &");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("unterminated conditional expression", () => {
    const ast = parseInBothModes("cond ? a");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("unterminated template literal yields BadExpression", () => {
    const ast = parseInBothModes("`abc");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("optional chain with invalid member yields BadExpression", () => {
    const ast = parseInBothModes("foo?.123");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected identifier after '?.'");
  });

  test("bare '{' is rejected", () => {
    const ast = parseInBothModes("{");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("missing arrow body yields BadExpression", () => {
    const ast = parseInBothModes("x =>");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Unexpected token EOF in primary expression");
  });

  test("invalid arrow head with non-identifier param yields BadExpression", () => {
    const ast = parseInBothModes("(1) => x");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe(
      "Arrow functions currently support only a single identifier parameter in the LSP parser",
    );
  });

  test("rest parameter not last in arrow list yields BadExpression", () => {
    const ast = parseInBothModes("(...rest, a) => x");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Unexpected token Ellipsis in primary expression");
  });

  test("optional chain cannot be followed by tagged template", () => {
    const ast = parseInBothModes("foo?.`bar`");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("optional keyed access missing closing bracket yields BadExpression", () => {
    const ast = parseInBothModes("foo?.[bar");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ']' in indexed access");
  });

  test("converter arg separator without arg yields BadExpression", () => {
    const ast = parseInBothModes("value | conv:");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Unexpected token EOF in primary expression");
  });

  test("behavior arg separator without arg yields BadExpression", () => {
    const ast = parseInBothModes("value & beh:");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Unexpected token EOF in primary expression");
  });

  test("converter name must be an identifier", () => {
    const ast = parseInBothModes("value | 123");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected identifier after '|'");
  });

  test("behavior name must be an identifier", () => {
    const ast = parseInBothModes("value & 123");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected identifier after '&'");
  });

  test("parse with unknown expression type yields BadExpression", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("foo", "None");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("empty expression yields BadExpression", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("", "IsProperty");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.span).toEqual({ start: 0, end: 0 });
  });

  test("bare 'import' is rejected", () => {
    const ast = parseInBothModes("import");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("missing closing bracket in indexed access yields BadExpression", () => {
    const ast = parseInBothModes("foo[bar");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ']' in indexed access");
  });

  test("missing closing paren in call yields BadExpression", () => {
    const ast = parseInBothModes("foo(bar");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ',' or ')' in argument list");
  });

  test("object literal with invalid key yields BadExpression", () => {
    const ast = parseInBothModes("{ []: 1 }");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Invalid object literal key; expected identifier, string, or number");
  });

  test("array literal missing closing bracket yields BadExpression", () => {
    const ast = parseInBothModes("[1, 2");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("paren expression followed by => yields BadExpression (not an arrow head)", () => {
    const ast = parseInBothModes("(a + b) => c");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("complex optional chain with tails parses", () => {
    const src = "user?.profile?.getName()?.toUpperCase() | upper:'en' & throttle:100";
    const ast = parseInBothModes(src);
    expect(ast.$kind).toBe("BindingBehavior");
    expect(ast.name.name).toBe("throttle");
    expect(ast.args.length).toBe(1);

    const vc = ast.expression;
    expect(vc.$kind).toBe("ValueConverter");
    expect(vc.name.name).toBe("upper");
    expect(vc.args.length).toBe(1);

    const call = vc.expression;
    expect(call.$kind).toBe("CallMember");
    expect(call.name.name).toBe("toUpperCase");
    expect(call.optionalCall).toBe(false);
    expect(call.optionalMember).toBe(true);

    const innerCall = call.object;
    expect(innerCall.$kind).toBe("CallMember");
    expect(innerCall.optionalCall).toBe(false);
    expect(innerCall.optionalMember).toBe(true);

    const member = innerCall.object;
    expect(member.$kind).toBe("AccessMember");
    expect(member.name.name).toBe("profile");
    expect(member.optional).toBe(true);
  });

  test("optional call on member with optional member flag persists", () => {
    const src = "user?.getName?.()";
    const ast = parseInBothModes(src);
    expect(ast.$kind).toBe("CallMember");
    expect(ast.optionalMember).toBe(true);
    expect(ast.optionalCall).toBe(true);
    expect(ast.name.name).toBe("getName");
    expect(ast.object.$kind).toBe("AccessScope");
    expect(ast.object.name.name).toBe("user");
  });

  test("tuple-like nested optional chaining renders correctly", () => {
    const src = "a?.[b?.c]?.(d?.e)";
    const ast = parseInBothModes(src);
    expect(ast.$kind).toBe("CallFunction");
    expect(ast.optional).toBe(true);
    const keyed = ast.func;
    expect(keyed.$kind).toBe("AccessKeyed");
    expect(keyed.optional).toBe(true);
    expect(keyed.key.$kind).toBe("AccessMember");
    expect(keyed.key.optional).toBe(true);
    const member = keyed.key;
    expect(member.$kind).toBe("AccessMember");
    expect(member.name.name).toBe("c");
    expect(member.object.$kind).toBe("AccessScope");
    expect(member.object.name.name).toBe("b");
  });

  test("value converter with multiple args parses", () => {
    const src = "value | conv:1:two:true";
    const ast = parseInBothModes(src);
    expect(ast.$kind).toBe("ValueConverter");
    expect(ast.args.length).toBe(3);
    expect(ast.args[0].$kind).toBe("PrimitiveLiteral");
    expect(ast.args[1].$kind).toBe("AccessScope");
    expect(ast.args[1].name.name).toBe("two");
    expect(ast.args[2].$kind).toBe("PrimitiveLiteral");
    expect(ast.expression.$kind).toBe("AccessScope");
    expect(ast.expression.name.name).toBe("value");
  });

  test("trailing tokens after a valid expression return BadExpression", () => {
    const ast = parseInBothModes("foo bar");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Unexpected token after end of expression");
  });

  test("new expression without args parses", () => {
    const ast = parseInBothModes("new Foo");
    expect(ast.$kind).toBe("New");
    expect(ast.args.length).toBe(0);
    expect(ast.func.$kind).toBe("AccessScope");
    expect(ast.func.name.name).toBe("Foo");
  });

  test("new expression with member and args parses", () => {
    const ast = parseInBothModes("new foo.bar(1, baz)");
    expect(ast.$kind).toBe("New");
    expect(ast.args.length).toBe(0);
    expect(ast.func.$kind).toBe("CallMember");
    expect(ast.func.object.$kind).toBe("AccessScope");
    expect(ast.func.object.name.name).toBe("foo");
    expect(ast.func.name.name).toBe("bar");
    expect(ast.func.optionalMember).toBe(false);
    expect(ast.func.optionalCall).toBe(false);
    expect(ast.func.args.length).toBe(2);
    expect(ast.func.args[0].$kind).toBe("PrimitiveLiteral");
    expect(ast.func.args[0].value).toBe(1);
    expect(ast.func.args[1].$kind).toBe("AccessScope");
    expect(ast.func.args[1].name.name).toBe("baz");
  });

  test("member access without identifier yields BadExpression", () => {
    const ast = parseInBothModes("foo.");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected identifier after '.'");
  });

  test("non-optional keyed access sets optional to false", () => {
    const ast = parseInBothModes("items[index]");
    expect(ast.$kind).toBe("AccessKeyed");
    expect(ast.optional).toBe(false);
    expect(ast.object.$kind).toBe("AccessScope");
    expect(ast.object.name.name).toBe("items");
    expect(ast.key.$kind).toBe("AccessScope");
    expect(ast.key.name.name).toBe("index");
  });

  test("parenthesized callee produces CallFunction with inner expression intact", () => {
    const ast = parseInBothModes("(foo + bar)(baz)");
    expect(ast.$kind).toBe("CallFunction");
    expect(ast.optional).toBe(false);
    expect(ast.func.$kind).toBe("Paren");
    expect(ast.func.expression.$kind).toBe("Binary");
    expect(ast.func.expression.operation).toBe("+");
    expect(ast.func.expression.left.$kind).toBe("AccessScope");
    expect(ast.func.expression.left.name.name).toBe("foo");
    expect(ast.func.expression.right.$kind).toBe("AccessScope");
    expect(ast.func.expression.right.name.name).toBe("bar");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("AccessScope");
    expect(ast.args[0].name.name).toBe("baz");
  });

  test("trailing comma in call arguments is allowed", () => {
    const ast = parseInBothModes("fn(a,)");
    expect(ast.$kind).toBe("CallScope");
    expect(ast.args.length).toBe(1);
    expect(ast.args[0].$kind).toBe("AccessScope");
    expect(ast.args[0].name.name).toBe("a");
  });

  test("missing closing paren in grouped expression yields BadExpression", () => {
    const ast = parseInBothModes("(foo");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ')' to close parenthesized expression");
  });

  test("$this. without identifier yields BadExpression", () => {
    const ast = parseInBothModes("$this.");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected identifier after '$this.'");
  });

  test("$parent. without identifier yields BadExpression", () => {
    const ast = parseInBothModes("$parent.");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected identifier after '$parent.'");
  });

  test("array literal variants preserve holes and trailing commas", () => {
    const empty = parseInBothModes("[]");
    expect(empty.$kind).toBe("ArrayLiteral");
    expect(empty.elements.length).toBe(0);

    const single = parseInBothModes("[1]");
    expect(single.$kind).toBe("ArrayLiteral");
    expect(single.elements.length).toBe(1);
    expect(single.elements[0].$kind).toBe("PrimitiveLiteral");
    expect(single.elements[0].value).toBe(1);

    const holes = parseInBothModes("[, ,]");
    expect(holes.$kind).toBe("ArrayLiteral");
    expect(holes.elements.length).toBe(2);
    expect(holes.elements[0].$kind).toBe("PrimitiveLiteral");
    expect(holes.elements[0].value).toBe(undefined);
    expect(holes.elements[1].$kind).toBe("PrimitiveLiteral");
    expect(holes.elements[1].value).toBe(undefined);

    const trailing = parseInBothModes("[1,]");
    expect(trailing.$kind).toBe("ArrayLiteral");
    expect(trailing.elements.length).toBe(1);
    expect(trailing.elements[0].$kind).toBe("PrimitiveLiteral");
    expect(trailing.elements[0].value).toBe(1);
  });

  test("object literal with mixed keys and trailing comma parses", () => {
    const ast = parseInBothModes("{foo: bar, 1: two, 'three': 3,}");
    expect(ast.$kind).toBe("ObjectLiteral");
    expect(ast.keys).toEqual(["foo", 1, "three"]);
    expect(ast.values.length).toBe(3);
    expect(ast.values[0].$kind).toBe("AccessScope");
    expect(ast.values[0].name.name).toBe("bar");
    expect(ast.values[1].$kind).toBe("AccessScope");
    expect(ast.values[1].name.name).toBe("two");
    expect(ast.values[2].$kind).toBe("PrimitiveLiteral");
    expect(ast.values[2].value).toBe(3);
  });

  test("object literal without trailing comma parses", () => {
    const ast = parseInBothModes("{foo: bar}");
    expect(ast.$kind).toBe("ObjectLiteral");
    expect(ast.keys).toEqual(["foo"]);
    expect(ast.values.length).toBe(1);
    expect(ast.values[0].$kind).toBe("AccessScope");
    expect(ast.values[0].name.name).toBe("bar");
  });

  test("empty object literal parses", () => {
    const ast = parseInBothModes("{}");
    expect(ast.$kind).toBe("ObjectLiteral");
    expect(ast.keys.length).toBe(0);
    expect(ast.values.length).toBe(0);
  });

  test("missing colon after object literal key yields BadExpression", () => {
    const ast = parseInBothModes("{foo 1}");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ':' after object literal key");
  });

  test("object literal requires comma between properties", () => {
    const ast = parseInBothModes("{foo: 1 bar: 2}");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ',' or '}' in object literal");
  });

  test("IsCustom parsing returns a Custom expression", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("raw content", "IsCustom");
    expect(ast.$kind).toBe("Custom");
    expect(ast.value).toBe("raw content");
    expect(ast.span).toEqual({ start: 0, end: "raw content".length });
  });
});
