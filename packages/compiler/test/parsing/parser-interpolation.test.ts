import { test, describe } from "vitest";
import assert from "node:assert/strict";

import { ExpressionParser, splitInterpolationText, toSourceFileId } from "../../out/compiler/index.js";

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

  // ==========================================================================
  // Quote-related edge cases (literal quotes in HTML text content)
  // These tests ensure quotes OUTSIDE ${...} are treated as literal characters,
  // not as JavaScript string delimiters.
  // ==========================================================================

  test("double quotes surrounding interpolation: \"${x}\"", () => {
    const src = '"${x}"';
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ['"', '"']);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "x");
  });

  test("single quotes surrounding interpolation: '${x}'", () => {
    const src = "'${x}'";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["'", "'"]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "x");
  });

  test("backticks surrounding interpolation: `${x}`", () => {
    const src = "`${x}`";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["`", "`"]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "x");
  });

  test("multiple interpolations with quotes: \"${a}\" and '${b}'", () => {
    const src = '"${a}" and \'${b}\'';
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ['"', '" and \'', "'"]);
    assert.equal(split.exprSpans.length, 2);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "a");
    assert.equal(src.slice(split.exprSpans[1].start, split.exprSpans[1].end), "b");
  });

  test("realistic pattern: Name: \"${name}\" (${len} chars)", () => {
    const src = 'Name: "${name}" (${len} chars)';
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ['Name: "', '" (', ' chars)']);
    assert.equal(split.exprSpans.length, 2);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "name");
    assert.equal(src.slice(split.exprSpans[1].start, split.exprSpans[1].end), "len");
  });

  test("apostrophe after interpolation: It's ${name}'s turn", () => {
    const src = "It's ${name}'s turn";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["It's ", "'s turn"]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "name");
  });

  test("quote inside expression (should still work): ${obj[\"key\"]}", () => {
    const src = '${obj["key"]}';
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["", ""]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), 'obj["key"]');
  });

  test("quotes both outside and inside: \"${obj['k']}\"", () => {
    const src = "\"${obj['k']}\"";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ['"', '"']);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "obj['k']");
  });

  test("unmatched quote before interpolation: say \"${msg}", () => {
    const src = 'say "${msg}';
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ['say "', '']);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "msg");
  });

  test("unmatched quote after interpolation: ${msg}\" said", () => {
    const src = '${msg}" said';
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ['', '" said']);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "msg");
  });

  // ==========================================================================
  // Additional edge cases
  // ==========================================================================

  test("backslash escapes interpolation: \\${x} returns null", () => {
    // ECMAScript template literal semantics: \$ escapes the dollar sign.
    // The entire \${x} is treated as literal text, no interpolation detected.
    const src = "\\${x}";
    const split = splitInterpolationText(src);
    assert.equal(split, null, "escaped interpolation should return null");
  });

  test("escaped interpolation with following real interpolation: \\${a} ${b}", () => {
    const src = "\\${a} ${b}";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    // Only ${b} is parsed as interpolation; \${a} is escaped literal text
    assert.deepEqual(split.parts, ["\\${a} ", ""]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "b");
  });

  test("whitespace inside expression: ${  name  }", () => {
    const src = "${  name  }";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["", ""]);
    assert.equal(split.exprSpans.length, 1);
    // The expression text includes the whitespace
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "  name  ");
  });

  test("closing brace immediately after expression: ${a}}", () => {
    // Extra closing brace is literal text
    const src = "${a}}";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["", "}"]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "a");
  });

  test("template literal inside interpolation: ${`nested ${x}`}", () => {
    const src = "${`nested ${x}`}";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["", ""]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "`nested ${x}`");
  });

  test("newlines in static text around interpolation", () => {
    const src = "line1\n${x}\nline3";
    const split = splitInterpolationText(src);
    assert.ok(split, "expected splitInterpolationText to return a result");
    assert.deepEqual(split.parts, ["line1\n", "\nline3"]);
    assert.equal(split.exprSpans.length, 1);
    assert.equal(src.slice(split.exprSpans[0].start, split.exprSpans[0].end), "x");
  });
});

describe("ExpressionParser / Interpolation AST", () => {
  test("Hello ${name}", () => {
    const src = "Hello ${name}";
    const parser = new ExpressionParser();
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

  test("rebases spans when parse context includes file + baseSpan", () => {
    const src = "Hello ${name}";
    const parser = new ExpressionParser();
    const file = toSourceFileId("template.html");
    const baseSpan = { start: 50, end: 50 + src.length, file };

    const ast = parser.parse(src, "Interpolation", { baseSpan });

    assert.equal(ast.span.file, file);
    assert.equal(ast.span.start, baseSpan.start);
    assert.equal(ast.span.end, baseSpan.end);

    const expr = ast.expressions[0];
    assert.equal(expr.span.file, file);
    assert.equal(expr.span.start, baseSpan.start + 8);
    assert.equal(expr.span.end, baseSpan.start + 12);
  });

  test("multiple interpolations: ${a} and ${b}", () => {
    const src = "${a} and ${b}";
    const parser = new ExpressionParser();
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
    const parser = new ExpressionParser();
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
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, [src]);
    assert.equal(ast.expressions.length, 0);
    assert.equal(src.slice(ast.span.start, ast.span.end), src);
  });

  test("unterminated ${ in text yields plain parts", () => {
    const src = "Hello ${name";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, [src]);
    assert.equal(ast.expressions.length, 0);
  });

  test("invalid inner expression becomes BadExpression", () => {
    const src = "Hello ${1 =}";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");
    assert.equal(ast.expressions[0].$kind, "BadExpression");
    assert.equal(ast.expressions[0].message, "Left-hand side is not assignable");
    assert.ok(ast.expressions[0].span.start >= 7);
  });

  // ==========================================================================
  // Quote-related edge cases (literal quotes in HTML text content)
  // These tests ensure full AST parsing works with quotes around interpolations.
  // ==========================================================================

  test("AST: double quotes surrounding interpolation", () => {
    const src = '"${name}"';
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, ['"', '"']);
    assert.equal(ast.expressions.length, 1);
    assert.equal(ast.expressions[0].$kind, "AccessScope");
    assert.equal(ast.expressions[0].name, "name");
  });

  test("AST: realistic pattern with quotes and multiple interpolations", () => {
    const src = 'Name: "${name}" (${len} chars)';
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, ['Name: "', '" (', ' chars)']);
    assert.equal(ast.expressions.length, 2);

    const [nameExpr, lenExpr] = ast.expressions;
    assert.equal(nameExpr.$kind, "AccessScope");
    assert.equal(nameExpr.name, "name");
    assert.equal(lenExpr.$kind, "AccessScope");
    assert.equal(lenExpr.name, "len");

    // Verify spans point to correct positions
    assert.equal(src.slice(nameExpr.span.start, nameExpr.span.end), "name");
    assert.equal(src.slice(lenExpr.span.start, lenExpr.span.end), "len");
  });

  test("AST: quotes outside and keyed access inside", () => {
    const src = '"${obj["key"]}"';
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    assert.equal(ast.$kind, "Interpolation");
    assert.deepEqual(ast.parts, ['"', '"']);
    assert.equal(ast.expressions.length, 1);
    assert.equal(ast.expressions[0].$kind, "AccessKeyed");
    assert.equal(ast.expressions[0].object.name, "obj");
    assert.equal(ast.expressions[0].key.value, "key");
  });
});
