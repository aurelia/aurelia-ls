import { test, describe, expect } from "vitest";

import { ExpressionParser, splitInterpolationText, toSourceFileId } from "@aurelia-ls/compiler";

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
    expect(split).toBeNull();
  });

  test("unterminated ${ yields null", () => {
    const src = "Hello ${name";
    const split = splitInterpolationText(src);
    expect(split).toBeNull();
  });

  test("simple hello ${name}", () => {
    const src = "Hello ${name}";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();

    expect(split.parts).toEqual(["Hello ", ""]);
    expect(split.exprSpans.length).toBe(1);

    const span0 = split.exprSpans[0];
    expect(src.slice(span0.start, span0.end)).toBe("name");
    expect(span0.start).toBe(8);
    expect(span0.end).toBe(12);
  });

  test("adjacent interpolations ${a}${b}", () => {
    const src = "${a}${b}";
    const split = splitInterpolationText(src);
    expect(split).toBeTruthy();

    expect(split.parts).toEqual(["", "", ""]);
    expect(split.exprSpans.length).toBe(2);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("a");
    expect(src.slice(split.exprSpans[1].start, split.exprSpans[1].end)).toBe("b");
    expect(split.exprSpans[0].start).toBe(2);
    expect(split.exprSpans[0].end).toBe(3);
  });

  test("nested braces and strings inside interpolation", () => {
    const src = "x ${ foo ? { y: 1 } : { y: 2 } } y";
    const split = splitInterpolationText(src);
    expect(split).toBeTruthy();

    expect(split.parts).toEqual(["x ", " y"]);
    expect(split.exprSpans.length).toBe(1);
    const exprText = src.slice(split.exprSpans[0].start, split.exprSpans[0].end);
    expect(exprText).toBe(" foo ? { y: 1 } : { y: 2 } ");
    expect(split.exprSpans[0].start).toBe(4);
  });

  // ==========================================================================
  // Quote-related edge cases (literal quotes in HTML text content)
  // These tests ensure quotes OUTSIDE ${...} are treated as literal characters,
  // not as JavaScript string delimiters.
  // ==========================================================================

  test("double quotes surrounding interpolation: \"${x}\"", () => {
    const src = '"${x}"';
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(['"', '"']);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("x");
  });

  test("single quotes surrounding interpolation: '${x}'", () => {
    const src = "'${x}'";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["'", "'"]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("x");
  });

  test("backticks surrounding interpolation: `${x}`", () => {
    const src = "`${x}`";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["`", "`"]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("x");
  });

  test("multiple interpolations with quotes: \"${a}\" and '${b}'", () => {
    const src = '"${a}" and \'${b}\'';
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(['"', '" and \'', "'"]);
    expect(split.exprSpans.length).toBe(2);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("a");
    expect(src.slice(split.exprSpans[1].start, split.exprSpans[1].end)).toBe("b");
  });

  test("realistic pattern: Name: \"${name}\" (${len} chars)", () => {
    const src = 'Name: "${name}" (${len} chars)';
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(['Name: "', '" (', ' chars)']);
    expect(split.exprSpans.length).toBe(2);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("name");
    expect(src.slice(split.exprSpans[1].start, split.exprSpans[1].end)).toBe("len");
  });

  test("apostrophe after interpolation: It's ${name}'s turn", () => {
    const src = "It's ${name}'s turn";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["It's ", "'s turn"]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("name");
  });

  test("quote inside expression (should still work): ${obj[\"key\"]}", () => {
    const src = '${obj["key"]}';
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["", ""]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe('obj["key"]');
  });

  test("quotes both outside and inside: \"${obj['k']}\"", () => {
    const src = "\"${obj['k']}\"";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(['"', '"']);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("obj['k']");
  });

  test("unmatched quote before interpolation: say \"${msg}", () => {
    const src = 'say "${msg}';
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(['say "', '']);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("msg");
  });

  test("unmatched quote after interpolation: ${msg}\" said", () => {
    const src = '${msg}" said';
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(['', '" said']);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("msg");
  });

  // ==========================================================================
  // Additional edge cases
  // ==========================================================================

  test("backslash escapes interpolation: \\${x} returns null", () => {
    // ECMAScript template literal semantics: \$ escapes the dollar sign.
    // The entire \${x} is treated as literal text, no interpolation detected.
    const src = "\\${x}";
    const split = splitInterpolationText(src);
    expect(split, "escaped interpolation should return null").toBeNull();
  });

  test("escaped interpolation with following real interpolation: \\${a} ${b}", () => {
    const src = "\\${a} ${b}";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    // Only ${b} is parsed as interpolation; \${a} is escaped literal text
    expect(split.parts).toEqual(["\\${a} ", ""]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("b");
  });

  test("whitespace inside expression: ${  name  }", () => {
    const src = "${  name  }";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["", ""]);
    expect(split.exprSpans.length).toBe(1);
    // The expression text includes the whitespace
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("  name  ");
  });

  test("closing brace immediately after expression: ${a}}", () => {
    // Extra closing brace is literal text
    const src = "${a}}";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["", "}"]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("a");
  });

  test("template literal inside interpolation: ${`nested ${x}`}", () => {
    const src = "${`nested ${x}`}";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["", ""]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("`nested ${x}`");
  });

  test("newlines in static text around interpolation", () => {
    const src = "line1\n${x}\nline3";
    const split = splitInterpolationText(src);
    expect(split, "expected splitInterpolationText to return a result").toBeTruthy();
    expect(split.parts).toEqual(["line1\n", "\nline3"]);
    expect(split.exprSpans.length).toBe(1);
    expect(src.slice(split.exprSpans[0].start, split.exprSpans[0].end)).toBe("x");
  });
});

describe("ExpressionParser / Interpolation AST", () => {
  test("Hello ${name}", () => {
    const src = "Hello ${name}";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual(["Hello ", ""]);
    expect(ast.expressions.length).toBe(1);

    const expr = ast.expressions[0];
    expect(expr.$kind).toBe("AccessScope");
    expect(expr.name).toBe("name");
    expect(expr.ancestor).toBe(0);

    // Interpolation span should cover the whole source.
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);

    // Expression span should slice back to the inner expression text.
    expect(src.slice(expr.span.start, expr.span.end)).toBe("name");
  });

  test("rebases spans when parse context includes file + baseSpan", () => {
    const src = "Hello ${name}";
    const parser = new ExpressionParser();
    const file = toSourceFileId("template.html");
    const baseSpan = { start: 50, end: 50 + src.length, file };

    const ast = parser.parse(src, "Interpolation", { baseSpan });

    expect(ast.span.file).toBe(file);
    expect(ast.span.start).toBe(baseSpan.start);
    expect(ast.span.end).toBe(baseSpan.end);

    const expr = ast.expressions[0];
    expect(expr.span.file).toBe(file);
    expect(expr.span.start).toBe(baseSpan.start + 8);
    expect(expr.span.end).toBe(baseSpan.start + 12);
  });

  test("multiple interpolations: ${a} and ${b}", () => {
    const src = "${a} and ${b}";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual(["", " and ", ""]);
    expect(ast.expressions.length).toBe(2);

    const [aExpr, bExpr] = ast.expressions;
    expect(aExpr.$kind).toBe("AccessScope");
    expect(aExpr.name).toBe("a");
    expect(bExpr.$kind).toBe("AccessScope");
    expect(bExpr.name).toBe("b");

    expect(src.slice(aExpr.span.start, aExpr.span.end)).toBe("a");
    expect(src.slice(bExpr.span.start, bExpr.span.end)).toBe("b");
  });

  test("complex expression with ternary: ${cond ? 'a' : b}", () => {
    const src = "Value: ${cond ? 'a' : b}";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual(["Value: ", ""]);

    expect(ast.expressions.length).toBe(1);
    const expr = ast.expressions[0];

    // Shape: Conditional(cond, 'a', b)
    expect(expr.$kind).toBe("Conditional");
    expect(expr.condition.$kind).toBe("AccessScope");
    expect(expr.condition.name).toBe("cond");
    expect(expr.yes.$kind).toBe("PrimitiveLiteral");
    expect(expr.yes.value).toBe("a");
    expect(expr.no.$kind).toBe("AccessScope");
    expect(expr.no.name).toBe("b");

    // Expression span should slice back to the ternary body (without `${` / `}`).
    const exprText = src.slice(expr.span.start, expr.span.end);
    expect(exprText).toBe("cond ? 'a' : b");
  });

  test("no interpolation markers yields parts[0] only", () => {
    const src = "no interpolation here";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual([src]);
    expect(ast.expressions.length).toBe(0);
    expect(src.slice(ast.span.start, ast.span.end)).toBe(src);
  });

  test("unterminated ${ in text yields plain parts", () => {
    const src = "Hello ${name";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual([src]);
    expect(ast.expressions.length).toBe(0);
  });

  test("invalid inner expression becomes BadExpression", () => {
    const src = "Hello ${1 =}";
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");
    expect(ast.expressions[0].$kind).toBe("BadExpression");
    expect(ast.expressions[0].message).toBe("Left-hand side is not assignable");
    expect(ast.expressions[0].span.start >= 7).toBe(true);
  });

  // ==========================================================================
  // Quote-related edge cases (literal quotes in HTML text content)
  // These tests ensure full AST parsing works with quotes around interpolations.
  // ==========================================================================

  test("AST: double quotes surrounding interpolation", () => {
    const src = '"${name}"';
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual(['"', '"']);
    expect(ast.expressions.length).toBe(1);
    expect(ast.expressions[0].$kind).toBe("AccessScope");
    expect(ast.expressions[0].name).toBe("name");
  });

  test("AST: realistic pattern with quotes and multiple interpolations", () => {
    const src = 'Name: "${name}" (${len} chars)';
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual(['Name: "', '" (', ' chars)']);
    expect(ast.expressions.length).toBe(2);

    const [nameExpr, lenExpr] = ast.expressions;
    expect(nameExpr.$kind).toBe("AccessScope");
    expect(nameExpr.name).toBe("name");
    expect(lenExpr.$kind).toBe("AccessScope");
    expect(lenExpr.name).toBe("len");

    // Verify spans point to correct positions
    expect(src.slice(nameExpr.span.start, nameExpr.span.end)).toBe("name");
    expect(src.slice(lenExpr.span.start, lenExpr.span.end)).toBe("len");
  });

  test("AST: quotes outside and keyed access inside", () => {
    const src = '"${obj["key"]}"';
    const parser = new ExpressionParser();
    const ast = parser.parse(src, "Interpolation");

    expect(ast.$kind).toBe("Interpolation");
    expect(ast.parts).toEqual(['"', '"']);
    expect(ast.expressions.length).toBe(1);
    expect(ast.expressions[0].$kind).toBe("AccessKeyed");
    expect(ast.expressions[0].object.name).toBe("obj");
    expect(ast.expressions[0].key.value).toBe("key");
  });
});
