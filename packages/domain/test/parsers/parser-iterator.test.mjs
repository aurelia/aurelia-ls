import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { LspExpressionParser } from "../../out/parsers/lsp-expression-parser.js";

function parseIterator(code) {
  const parser = new LspExpressionParser();
  return parser.parse(code, "IsIterator");
}

describe("lsp-expression-parser / IsIterator (ForOfStatement)", () => {
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

  test("missing 'of' is rejected", () => {
    const parser = new LspExpressionParser();
    assert.throws(
      () => parser.parse("item items", "IsIterator"),
      /of/i,
    );
  });

  test("'of' in place of lhs is rejected", () => {
    const parser = new LspExpressionParser();
    assert.throws(
      () => parser.parse("of items", "IsIterator"),
    );
  });
});
