import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { LspExpressionParser } from "../../out/parsers/lsp-expression-parser.js";

function parseAs(expression, mode = "IsProperty") {
  const parser = new LspExpressionParser();
  return parser.parse(expression, mode);
}

function spanText(source, node) {
  return source.slice(node.span.start, node.span.end);
}

describe("LspExpressionParser (core IsProperty/IsFunction)", () => {
  // ---------------------------------------------------------------------------
  // Identifiers, $this / $parent scope hops, and this
  // ---------------------------------------------------------------------------
  describe("identifiers and scope hops", () => {
    test("simple identifier 'foo'", () => {
      const src = "foo";
      const ast = parseAs(src, "IsProperty");
      assert.equal(ast.$kind, "AccessScope");
      assert.equal(ast.name, "foo");
      assert.equal(ast.ancestor, 0);
      assert.equal(spanText(src, ast), "foo");
    });

    test("$this / $parent / this", () => {
      const parser = new LspExpressionParser();

      {
        const src = "$this.foo";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "AccessScope");
        assert.equal(ast.name, "foo");
        assert.equal(ast.ancestor, 0);
        assert.equal(spanText(src, ast), src);
      }

      {
        const src = "$parent.bar";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "AccessScope");
        assert.equal(ast.name, "bar");
        assert.equal(ast.ancestor, 1);
        assert.equal(spanText(src, ast), src);
      }

      {
        const src = "$parent.$parent.baz";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "AccessScope");
        assert.equal(ast.name, "baz");
        assert.equal(ast.ancestor, 2);
        assert.equal(spanText(src, ast), src);
      }

      {
        const src = "$parent.$parent";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "AccessThis");
        assert.equal(ast.ancestor, 2);
        assert.equal(spanText(src, ast), src);
      }
    });

    test("bare 'this' → AccessBoundary", () => {
      const src = "this";
      const ast = parseAs(src, "IsProperty");
      assert.equal(ast.$kind, "AccessBoundary");
      assert.equal(spanText(src, ast), "this");
    });
  });

  // ---------------------------------------------------------------------------
  // Globals vs scopes
  // ---------------------------------------------------------------------------
  describe("globals vs scopes", () => {
    test("parseInt(x) and Math.max(a, b)", () => {
      const parser = new LspExpressionParser();

      {
        const src = "parseInt(x)";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "CallGlobal");
        assert.equal(ast.name, "parseInt");
        assert.equal(ast.args.length, 1);
        const arg = ast.args[0];
        assert.equal(arg.$kind, "AccessScope");
        assert.equal(arg.name, "x");
        assert.equal(spanText(src, ast), src);
      }

      {
        const src = "Math.max(a, b)";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "CallMember");
        assert.equal(ast.name, "max");
        assert.equal(ast.args.length, 2);

        const object = ast.object;
        assert.equal(object.$kind, "AccessGlobal");
        assert.equal(object.name, "Math");

        const [aArg, bArg] = ast.args;
        assert.equal(aArg.$kind, "AccessScope");
        assert.equal(aArg.name, "a");
        assert.equal(bArg.$kind, "AccessScope");
        assert.equal(bArg.name, "b");

        assert.equal(spanText(src, ast), src);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Unary / ++ --
  // ---------------------------------------------------------------------------
  describe("unary expressions", () => {
    test("prefix unary operators", () => {
      const parser = new LspExpressionParser();

      {
        const src = "!foo";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Unary");
        assert.equal(ast.operation, "!");
        assert.equal(ast.pos, 0);
        assert.equal(ast.expression.$kind, "AccessScope");
        assert.equal(ast.expression.name, "foo");
        assert.equal(spanText(src, ast), src);
        assert.equal(spanText(src, ast.expression), "foo");
      }

      {
        const src = "-x";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Unary");
        assert.equal(ast.operation, "-");
        assert.equal(ast.pos, 0);
        assert.equal(ast.expression.$kind, "AccessScope");
        assert.equal(ast.expression.name, "x");
        assert.equal(spanText(src, ast), src);
      }
    });

    test("prefix and postfix ++", () => {
      const parser = new LspExpressionParser();

      {
        const src = "++i";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Unary");
        assert.equal(ast.operation, "++");
        assert.equal(ast.pos, 0);
        assert.equal(ast.expression.$kind, "AccessScope");
        assert.equal(ast.expression.name, "i");
        assert.equal(spanText(src, ast), src);
      }

      {
        const src = "i++";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Unary");
        assert.equal(ast.operation, "++");
        assert.equal(ast.pos, 1);
        assert.equal(ast.expression.$kind, "AccessScope");
        assert.equal(ast.expression.name, "i");
        assert.equal(spanText(src, ast), src);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Binary / precedence
  // ---------------------------------------------------------------------------
  describe("binary expressions and precedence", () => {
    test("1 + 2 * 3", () => {
      const src = "1 + 2 * 3";
      const ast = parseAs(src, "IsProperty");
      assert.equal(ast.$kind, "Binary");
      assert.equal(ast.operation, "+");
      assert.equal(spanText(src, ast), src);

      const left = ast.left;
      const right = ast.right;

      assert.equal(left.$kind, "PrimitiveLiteral");
      assert.equal(left.value, 1);

      assert.equal(right.$kind, "Binary");
      assert.equal(right.operation, "*");
      assert.equal(right.left.$kind, "PrimitiveLiteral");
      assert.equal(right.left.value, 2);
      assert.equal(right.right.$kind, "PrimitiveLiteral");
      assert.equal(right.right.value, 3);

      assert.equal(spanText(src, right), "2 * 3");
    });

    test("logical && and || precedence", () => {
      const src = "a && b || c";
      const ast = parseAs(src, "IsProperty");
      assert.equal(ast.$kind, "Binary");
      assert.equal(ast.operation, "||");

      const left = ast.left;
      const right = ast.right;

      assert.equal(left.$kind, "Binary");
      assert.equal(left.operation, "&&");
      assert.equal(right.$kind, "AccessScope");
      assert.equal(right.name, "c");

      assert.equal(spanText(src, ast), src);
      assert.equal(spanText(src, left), "a && b");
    });

    test("nullish coalescing and comparisons", () => {
      const parser = new LspExpressionParser();

      {
        const src = "a ?? b";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Binary");
        assert.equal(ast.operation, "??");
        assert.equal(spanText(src, ast), src);
      }

      const cases = [
        ["a < b", "<"],
        ["a <= b", "<="],
        ["a > b", ">"],
        ["a >= b", ">="],
        ["a instanceof b", "instanceof"],
        ["a in b", "in"],
      ];

      for (const [src, op] of cases) {
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Binary");
        assert.equal(ast.operation, op);
        assert.equal(spanText(src, ast), src);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Conditionals
  // ---------------------------------------------------------------------------
  describe("conditional expressions", () => {
    test("cond ? a : b", () => {
      const src = "cond ? a : b";
      const ast = parseAs(src, "IsProperty");
      assert.equal(ast.$kind, "Conditional");
      assert.equal(ast.condition.$kind, "AccessScope");
      assert.equal(ast.condition.name, "cond");
      assert.equal(ast.yes.$kind, "AccessScope");
      assert.equal(ast.yes.name, "a");
      assert.equal(ast.no.$kind, "AccessScope");
      assert.equal(ast.no.name, "b");
      assert.equal(spanText(src, ast), src);
      assert.equal(spanText(src, ast.condition), "cond");
    });
  });

  // ---------------------------------------------------------------------------
  // Assignments
  // ---------------------------------------------------------------------------
  describe("assignments", () => {
    test("simple and compound assignments", () => {
      const parser = new LspExpressionParser();

      {
        const src = "a = b";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Assign");
        assert.equal(ast.op, "=");
        assert.equal(ast.target.$kind, "AccessScope");
        assert.equal(ast.target.name, "a");
        assert.equal(ast.value.$kind, "AccessScope");
        assert.equal(ast.value.name, "b");
        assert.equal(spanText(src, ast), src);
      }

      {
        const src = "a += b";
        const ast = parser.parse(src, "IsProperty");
        assert.equal(ast.$kind, "Assign");
        assert.equal(ast.op, "+=");
        assert.equal(ast.target.$kind, "AccessScope");
        assert.equal(ast.target.name, "a");
        assert.equal(ast.value.$kind, "AccessScope");
        assert.equal(ast.value.name, "b");
        assert.equal(spanText(src, ast), src);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Arrow functions
  // ---------------------------------------------------------------------------
  describe("arrow functions", () => {
    test("single-parameter arrow", () => {
      const src = "x => x + 1";
      const ast = parseAs(src, "IsProperty");

      assert.equal(ast.$kind, "ArrowFunction");
      assert.equal(ast.args.length, 1);
      assert.equal(ast.args[0].$kind, "BindingIdentifier");
      assert.equal(ast.args[0].name, "x");

      const body = ast.body;
      assert.equal(body.$kind, "Binary");
      assert.equal(body.operation, "+");
      assert.equal(body.left.$kind, "AccessScope");
      assert.equal(body.left.name, "x");
      assert.equal(body.right.$kind, "PrimitiveLiteral");
      assert.equal(body.right.value, 1);

      assert.equal(spanText(src, ast), src);
    });

    test("parenthesized multi-parameter arrow", () => {
      const src = "(a, b) => a + b";
      const ast = parseAs(src, "IsProperty");

      assert.equal(ast.$kind, "ArrowFunction");
      assert.equal(ast.args.length, 2);
      assert.equal(ast.args[0].$kind, "BindingIdentifier");
      assert.equal(ast.args[0].name, "a");
      assert.equal(ast.args[1].$kind, "BindingIdentifier");
      assert.equal(ast.args[1].name, "b");

      const body = ast.body;
      assert.equal(body.$kind, "Binary");
      assert.equal(body.operation, "+");
      assert.equal(body.left.$kind, "AccessScope");
      assert.equal(body.left.name, "a");
      assert.equal(body.right.$kind, "AccessScope");
      assert.equal(body.right.name, "b");

      assert.equal(spanText(src, ast), src);
    });
  });

  // ---------------------------------------------------------------------------
  // Value converters & binding behaviors
  // ---------------------------------------------------------------------------
  describe("value converters and binding behaviors", () => {
    test("single value converter tail", () => {
      const src = "amount | currency:'USD'";
      const ast = parseAs(src, "IsProperty");

      assert.equal(ast.$kind, "ValueConverter");
      assert.equal(ast.name, "currency");
      assert.equal(ast.args.length, 1);

      const base = ast.expression;
      assert.equal(base.$kind, "AccessScope");
      assert.equal(base.name, "amount");

      const arg = ast.args[0];
      assert.equal(arg.$kind, "PrimitiveLiteral");
      assert.equal(arg.value, "USD");

      assert.equal(spanText(src, ast), src);
      assert.equal(spanText(src, base), "amount");
    });

    test("converter + behavior tail chain", () => {
      const src = "amount | currency:'USD' & throttle:100";
      const ast = parseAs(src, "IsProperty");

      assert.equal(ast.$kind, "BindingBehavior");
      assert.equal(ast.name, "throttle");
      assert.equal(ast.args.length, 1);
      const behaviorArg = ast.args[0];
      assert.equal(behaviorArg.$kind, "PrimitiveLiteral");
      assert.equal(behaviorArg.value, 100);

      const vc = ast.expression;
      assert.equal(vc.$kind, "ValueConverter");
      assert.equal(vc.name, "currency");
      assert.equal(vc.args.length, 1);

      const vcArg = vc.args[0];
      assert.equal(vcArg.$kind, "PrimitiveLiteral");
      assert.equal(vcArg.value, "USD");

      const base = vc.expression;
      assert.equal(base.$kind, "AccessScope");
      assert.equal(base.name, "amount");

      assert.equal(spanText(src, ast), src);
      assert.equal(spanText(src, vc), "amount | currency:'USD'");
      assert.equal(spanText(src, base), "amount");
    });
  });

  // ---------------------------------------------------------------------------
  // ExpressionType modes
  // ---------------------------------------------------------------------------
  describe("ExpressionType modes", () => {
    test("IsProperty and IsFunction behave identically for core expressions", () => {
      const parser = new LspExpressionParser();
      const expressions = [
        "foo",
        "$this.foo",
        "$parent.$parent.baz",
        "parseInt(x)",
        "Math.max(a, b)",
        "!foo",
        "1 + 2 * 3",
        "cond ? a : b",
        "a = b",
        "x => x + 1",
        "(a, b) => a + b",
        "amount | currency:'USD'",
        "amount | currency:'USD' & throttle:100",
      ];

      for (const code of expressions) {
        const propAst = parser.parse(code, "IsProperty");
        const fnAst = parser.parse(code, "IsFunction");
        assert.deepEqual(
          fnAst,
          propAst,
          `AST mismatch between IsFunction and IsProperty for ${code}`,
        );
      }
    });
  });
});
