import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { LspExpressionParser } from "../../out/parsers/lsp-expression-parser.js";
import { splitInterpolationText } from "../../out/parsers/lsp-expression-parser.js";

/**
 * Helper: strip span information recursively from an AST node.
 * Used to compare structure without being brittle on offsets.
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

describe("interpolation splitting", () => {
  test("returns null when there is no interpolation", () => {
    const src = "just plain text";
    const split = splitInterpolationText(src);
    assert.equal(split, null);
  });

  test("unterminated ${ yields null", () => {
    const src = "Hello ${name";
    const split = splitInterpolationText(src);
    assert.equal(split, null);
  });

  test("simple hello ${name}", () => {
    const src = "Hello ${name}";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");

    assert.deepEqual(split.parts, ["Hello ", ""]);
    assert.equal(split.exprSpans.length, 1);

    const span0 = split.exprSpans[0];
    assert.equal(src.slice(span0.start, span0.end), "name");
    assert.equal(span0.start, 8);
    assert.equal(span0.end, 12);
  });

  test("adjacent interpolations ${a}${b}", () => {
    const src = "${a}${b}";
    const split = splitInterpolationText(src);
    assert.ok(split);

    assert.deepEqual(split.parts, ["", "", ""]);
    assert.equal(split.exprSpans.length, 2);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "a");
    assert.equal(src.slice(split.exprSpans[1].start, split.exprSpans[1].end), "b");
    assert.equal(split.exprSpans[0].start, 2);
    assert.equal(split.exprSpans[0].end, 3);
  });

  test("nested braces and strings inside interpolation", () => {
    const src = "x ${ foo ? { y: 1 } : { y: 2 } } y";
    const split = splitInterpolationText(src);
    assert.ok(split);

    assert.deepEqual(split.parts, ["x ", " y"]);
    assert.equal(split.exprSpans.length, 1);
    const exprText = src.slice(split.exprSpans[0].start, split.exprSpans[0].end);
    assert.equal(exprText, " foo ? { y: 1 } : { y: 2 } ");
    assert.equal(split.exprSpans[0].start, 4);
  });
});

describe("LspExpressionParser / Interpolation AST", () => {
  test("Hello ${name}", () => {
    const src = "Hello ${name}";
    const parser = new LspExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, ["Hello ", ""]);
    assert.equal(ast.expressions.length, 1);

    const expr = ast.expressions[0];
    assert.equal(expr.$kind, "AccessScope");
    assert.equal(expr.name, "name");
    assert.equal(expr.ancestor, 0);

    // Interpolation span should cover the whole source.
    assert.equal(src.slice(ast.span.start, ast.span.end), src);

    // Expression span should slice back to the inner expression text.
    assert.equal(src.slice(expr.span.start, expr.span.end), "name");
  });

  test("multiple interpolations: ${a} and ${b}", () => {
    const src = "${a} and ${b}";
    const parser = new LspExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, ["", " and ", ""]);
    assert.equal(ast.expressions.length, 2);

    const [aExpr, bExpr] = ast.expressions;
    assert.equal(aExpr.$kind, "AccessScope");
    assert.equal(aExpr.name, "a");
    assert.equal(bExpr.$kind, "AccessScope");
    assert.equal(bExpr.name, "b");

    assert.equal(src.slice(aExpr.span.start, aExpr.span.end), "a");
    assert.equal(src.slice(bExpr.span.start, bExpr.span.end), "b");
  });

  test("complex expression with ternary: ${cond ? 'a' : b}", () => {
    const src = "Value: ${cond ? 'a' : b}";
    const parser = new LspExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, ["Value: ", ""]);

    assert.equal(ast.expressions.length, 1);
    const expr = ast.expressions[0];

    // Shape: Conditional(cond, 'a', b)
    assert.equal(expr.$kind, "Conditional");
    assert.equal(expr.condition.$kind, "AccessScope");
    assert.equal(expr.condition.name, "cond");
    assert.equal(expr.yes.$kind, "PrimitiveLiteral");
    assert.equal(expr.yes.value, "a");
    assert.equal(expr.no.$kind, "AccessScope");
    assert.equal(expr.no.name, "b");

    // Expression span should slice back to the ternary body (without `${` / `}`).
    const exprText = src.slice(expr.span.start, expr.span.end);
    assert.equal(exprText, "cond ? 'a' : b");
  });

  test("no interpolation markers yields parts[0] only", () => {
    const src = "no interpolation here";
    const parser = new LspExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, [src]);
    assert.equal(ast.expressions.length, 0);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("unterminated ${ in text yields plain parts", () => {
    const src = "Hello ${name";
    const parser = new LspExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, [src]);
    assert.equal(ast.expressions.length, 0);
  });

  test("invalid inner expression becomes BadExpression", () => {
    const src = "Hello ${1 =}";
    const parser = new LspExpressionParser();
    const ast = parser.parse(src, "Interpolation");
    assert.equal(ast.expressions[0].$kind, "BadExpression");
    assert.equal(ast.expressions[0].message, "Left-hand side is not assignable");
    assert.ok(ast.expressions[0].span.start >= 7);
  });
});
