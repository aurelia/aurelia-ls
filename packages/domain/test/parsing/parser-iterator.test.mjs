import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { ExpressionParser } from "../../out/compiler/index.js";

function parseIterator(code) {
  const parser = new ExpressionParser();
  return parser.parse(code, "IsIterator");
}

describe("expression-parser / IsIterator (ForOfStatement)", () => {
  test("item of items", () => {
    const code = "item of items";
    const ast = parseIterator(code);

    assert.equal(ast.$kind, "ForOfStatement");
    assert.deepEqual(ast.span, { start: 0, end: code.length });
    assert.equal(ast.semiIdx, -1);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "BindingIdentifier");
    assert.equal(decl.name, "item");

    const iterable = ast.iterable;
    assert.equal(iterable.$kind, "AccessScope");
    assert.equal(iterable.name, "items");
  });

  test("item of items; key: id (semiIdx)", () => {
    const code = "item of items; key: id";
    const ast = parseIterator(code);

    assert.equal(ast.$kind, "ForOfStatement");
    assert.deepEqual(ast.span, { start: 0, end: code.length });

    const expectedSemi = code.indexOf(";");
    assert.equal(ast.semiIdx, expectedSemi);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "BindingIdentifier");
    assert.equal(decl.name, "item");

    const iterable = ast.iterable;
    assert.equal(iterable.$kind, "AccessScope");
    assert.equal(iterable.name, "items");
  });

  test("[value, index] of items", () => {
    const code = "[value, index] of items";
    const ast = parseIterator(code);

    assert.equal(ast.$kind, "ForOfStatement");
    assert.equal(ast.semiIdx, -1);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "ArrayBindingPattern");

    assert.equal(decl.elements.length, 2);

    const [valueBinding, indexBinding] = decl.elements;

    assert.equal(valueBinding.$kind, "BindingIdentifier");
    assert.equal(valueBinding.name, "value");

    assert.equal(indexBinding.$kind, "BindingIdentifier");
    assert.equal(indexBinding.name, "index");
  });

  test("{ key, value } of entries", () => {
    const code = "{ key, value } of entries";
    const ast = parseIterator(code);

    assert.equal(ast.$kind, "ForOfStatement");
    assert.equal(ast.semiIdx, -1);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "ObjectBindingPattern");

    assert.equal(decl.properties.length, 2);
    assert.deepEqual(decl.properties.map(p => p.key), ["key", "value"]);
    assert.equal(decl.properties[0].value.$kind, "BindingIdentifier");
    assert.equal(decl.properties[0].value.name, "key");
    assert.equal(decl.properties[1].value.$kind, "BindingIdentifier");
    assert.equal(decl.properties[1].value.name, "value");
  });

  test("{ key: alias } of entries", () => {
    const code = "{ key: alias } of entries";
    const ast = parseIterator(code);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "ObjectBindingPattern");

    assert.equal(decl.properties.length, 1);
    assert.equal(decl.properties[0].key, "key");
    assert.equal(decl.properties[0].value.$kind, "BindingIdentifier");
    assert.equal(decl.properties[0].value.name, "alias");
  });

  test("[first, , second, ...rest] of items", () => {
    const code = "[first, , second, ...rest] of items";
    const ast = parseIterator(code);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "ArrayBindingPattern");
    assert.equal(decl.elements.length, 3);

    assert.equal(decl.elements[0].$kind, "BindingIdentifier");
    assert.equal(decl.elements[1].$kind, "BindingPatternHole");
    assert.equal(decl.elements[2].$kind, "BindingIdentifier");
    assert.equal(decl.rest?.$kind, "BindingIdentifier");
    assert.equal(decl.rest?.name, "rest");
  });

  test("{ a: foo = bar, ...rest } of entries", () => {
    const code = "{ a: foo = bar, ...rest } of entries";
    const ast = parseIterator(code);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "ObjectBindingPattern");
    assert.equal(decl.properties.length, 1);

    const prop = decl.properties[0];
    assert.equal(prop.key, "a");
    assert.equal(prop.value.$kind, "BindingPatternDefault");
    assert.equal(prop.value.target.$kind, "BindingIdentifier");
    assert.equal(prop.value.target.name, "foo");
    assert.equal(prop.value.default.$kind, "AccessScope");
    assert.equal(prop.value.default.name, "bar");

    assert.equal(decl.rest?.$kind, "BindingIdentifier");
    assert.equal(decl.rest?.name, "rest");
  });

  test("[] of items is accepted and produces an empty array pattern", () => {
    const ast = parseIterator("[] of items");
    assert.equal(ast.$kind, "ForOfStatement");
    assert.equal(ast.declaration.$kind, "ArrayBindingPattern");
    assert.equal(ast.declaration.elements.length, 0);
    assert.equal(ast.declaration.rest, null);
  });

  test("[a,] of items allows a trailing comma", () => {
    const ast = parseIterator("[a,] of items");
    assert.equal(ast.$kind, "ForOfStatement");
    assert.equal(ast.declaration.$kind, "ArrayBindingPattern");
    assert.equal(ast.declaration.elements.length, 1);
    assert.equal(ast.declaration.elements[0].$kind, "BindingIdentifier");
    assert.equal(ast.declaration.elements[0].name, "a");
  });

  test("{} of items is accepted and produces an empty object pattern", () => {
    const ast = parseIterator("{} of items");
    assert.equal(ast.$kind, "ForOfStatement");
    const decl = ast.declaration;
    assert.equal(decl.$kind, "ObjectBindingPattern");
    assert.equal(decl.properties.length, 0);
    assert.equal(decl.rest, null);
  });

  test("array pattern rest must be followed by closing bracket", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("[...rest a] of items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected ']' after array pattern rest element");
    assert.ok(ast.span.start >= 0);
    assert.ok(ast.span.end >= ast.span.start);
  });

  test("object pattern rest must be followed by closing brace", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("{ ...rest a } of items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Expected '}' after object pattern rest element");
    assert.ok(ast.span.start >= 2);
    assert.ok(ast.span.end >= ast.span.start);
  });

  test("object pattern shorthand requires identifier keys", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("{ 'notId' } of items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Object binding pattern shorthand requires an identifier key");
    assert.equal(ast.text, "'notId'");
  });

  test("missing 'of' is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("'of' in place of lhs is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("of items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("missing rhs is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item of", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("trailing semicolon without tail is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item of items;", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("array pattern with rest not last is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("[a, ...rest, b] of items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Rest element must be in the last position of an array pattern");
  });

  test("object pattern with rest not last is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("{ ...rest, a } of items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Rest element must be in the last position of an object pattern");
  });

  test("invalid identifier 'import' in lhs is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("import of items", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
  });

  test("empty iterator header is rejected", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("", "IsIterator");
    assert.equal(ast.$kind, "BadExpression");
    assert.equal(ast.message, "Empty iterator header");
  });

  test("iterator header allows content after semicolon (semiIdx recorded)", () => {
    const parser = new ExpressionParser();
    const ast = parser.parse("item of items; key: id", "IsIterator");
    assert.equal(ast.$kind, "ForOfStatement");
    assert.equal(ast.semiIdx >= 0, true);
  });
});
