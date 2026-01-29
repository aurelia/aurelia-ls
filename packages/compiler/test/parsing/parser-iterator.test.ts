import { test, describe, expect } from "vitest";

import { ExpressionParser } from "@aurelia-ls/compiler";

function parseIterator(code) {
  const parser = new ExpressionParser();
  return parser.parse(code, "IsIterator");
}

describe("expression-parser / IsIterator (ForOfStatement)", () => {
  test("item of items", () => {
    const code = "item of items";
    const ast = parseIterator(code);

    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.span).toEqual({ start: 0, end: code.length });
    expect(ast.semiIdx).toBe(-1);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("BindingIdentifier");
    expect(decl.name.name).toBe("item");

    const iterable = ast.iterable;
    expect(iterable.$kind).toBe("AccessScope");
    expect(iterable.name.name).toBe("items");
  });

  test("item of items; key: id (semiIdx)", () => {
    const code = "item of items; key: id";
    const ast = parseIterator(code);

    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.span).toEqual({ start: 0, end: code.length });

    const expectedSemi = code.indexOf(";");
    expect(ast.semiIdx).toBe(expectedSemi);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("BindingIdentifier");
    expect(decl.name.name).toBe("item");

    const iterable = ast.iterable;
    expect(iterable.$kind).toBe("AccessScope");
    expect(iterable.name.name).toBe("items");
  });

  test("[value, index] of items", () => {
    const code = "[value, index] of items";
    const ast = parseIterator(code);

    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.semiIdx).toBe(-1);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("ArrayBindingPattern");

    expect(decl.elements.length).toBe(2);

    const [valueBinding, indexBinding] = decl.elements;

    expect(valueBinding.$kind).toBe("BindingIdentifier");
    expect(valueBinding.name.name).toBe("value");

    expect(indexBinding.$kind).toBe("BindingIdentifier");
    expect(indexBinding.name.name).toBe("index");
  });

  test("{ key, value } of entries", () => {
    const code = "{ key, value } of entries";
    const ast = parseIterator(code);

    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.semiIdx).toBe(-1);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("ObjectBindingPattern");

    expect(decl.properties.length).toBe(2);
    expect(decl.properties.map(p => p.key)).toEqual(["key", "value"]);
    expect(decl.properties[0].value.$kind).toBe("BindingIdentifier");
    expect(decl.properties[0].value.name.name).toBe("key");
    expect(decl.properties[1].value.$kind).toBe("BindingIdentifier");
    expect(decl.properties[1].value.name.name).toBe("value");
  });

  test("{ key: alias } of entries", () => {
    const code = "{ key: alias } of entries";
    const ast = parseIterator(code);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("ObjectBindingPattern");

    expect(decl.properties.length).toBe(1);
    expect(decl.properties[0].key).toBe("key");
    expect(decl.properties[0].value.$kind).toBe("BindingIdentifier");
    expect(decl.properties[0].value.name.name).toBe("alias");
  });

  test("[first, , second, ...rest] of items", () => {
    const code = "[first, , second, ...rest] of items";
    const ast = parseIterator(code);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("ArrayBindingPattern");
    expect(decl.elements.length).toBe(3);

    expect(decl.elements[0].$kind).toBe("BindingIdentifier");
    expect(decl.elements[1].$kind).toBe("BindingPatternHole");
    expect(decl.elements[2].$kind).toBe("BindingIdentifier");
    expect(decl.rest?.$kind).toBe("BindingIdentifier");
    expect(decl.rest?.name.name).toBe("rest");
  });

  test("{ a: foo = bar, ...rest } of entries", () => {
    const code = "{ a: foo = bar, ...rest } of entries";
    const ast = parseIterator(code);

    const decl = ast.declaration;
    expect(decl.$kind).toBe("ObjectBindingPattern");
    expect(decl.properties.length).toBe(1);

    const prop = decl.properties[0];
    expect(prop.key).toBe("a");
    expect(prop.value.$kind).toBe("BindingPatternDefault");
    expect(prop.value.target.$kind).toBe("BindingIdentifier");
    expect(prop.value.target.name.name).toBe("foo");
    expect(prop.value.default.$kind).toBe("AccessScope");
    expect(prop.value.default.name.name).toBe("bar");

    expect(decl.rest?.$kind).toBe("BindingIdentifier");
    expect(decl.rest?.name.name).toBe("rest");
  });

  test("[] of items is accepted and produces an empty array pattern", () => {
    const ast = parseIterator("[] of items");
    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.declaration.$kind).toBe("ArrayBindingPattern");
    expect(ast.declaration.elements.length).toBe(0);
    expect(ast.declaration.rest).toBe(null);
  });

  test("[a,] of items allows a trailing comma", () => {
    const ast = parseIterator("[a,] of items");
    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.declaration.$kind).toBe("ArrayBindingPattern");
    expect(ast.declaration.elements.length).toBe(1);
    expect(ast.declaration.elements[0].$kind).toBe("BindingIdentifier");
    expect(ast.declaration.elements[0].name.name).toBe("a");
  });

  test("{} of items is accepted and produces an empty object pattern", () => {
    const ast = parseIterator("{} of items");
    expect(ast.$kind).toBe("ForOfStatement");
    const decl = ast.declaration;
    expect(decl.$kind).toBe("ObjectBindingPattern");
    expect(decl.properties.length).toBe(0);
    expect(decl.rest).toBe(null);
  });

  test("array pattern rest must be followed by closing bracket", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("[...rest a] of items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected ']' after array pattern rest element");
    expect(ast.span.start >= 0).toBe(true);
    expect(ast.span.end >= ast.span.start).toBe(true);
  });

  test("object pattern rest must be followed by closing brace", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("{ ...rest a } of items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Expected '}' after object pattern rest element");
    expect(ast.span.start >= 2).toBe(true);
    expect(ast.span.end >= ast.span.start).toBe(true);
  });

  test("object pattern shorthand requires identifier keys", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("{ 'notId' } of items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Object binding pattern shorthand requires an identifier key");
    expect(ast.text).toBe("'notId'");
  });

  test("missing 'of' is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("'of' in place of lhs is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("of items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("missing rhs is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item of", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("trailing semicolon without tail is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item of items;", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("array pattern with rest not last is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("[a, ...rest, b] of items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Rest element must be in the last position of an array pattern");
  });

  test("object pattern with rest not last is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("{ ...rest, a } of items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Rest element must be in the last position of an object pattern");
  });

  test("invalid identifier 'import' in lhs is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("import of items", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
  });

  test("empty iterator header is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("", "IsIterator");
    expect(ast.$kind).toBe("BadExpression");
    expect(ast.message).toBe("Empty iterator header");
  });

  test("iterator header allows content after semicolon (semiIdx recorded)", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item of items; key: id", "IsIterator");
    expect(ast.$kind).toBe("ForOfStatement");
    expect(ast.semiIdx >= 0).toBe(true);
  });
});
