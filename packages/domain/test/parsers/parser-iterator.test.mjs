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

    assert.deepEqual(decl.keys, ["key", "value"]);
    assert.equal(decl.values.length, 2);

    const [keyBinding, valueBinding] = decl.values;
    assert.equal(keyBinding.$kind, "BindingIdentifier");
    assert.equal(keyBinding.name, "key");
    assert.equal(valueBinding.$kind, "BindingIdentifier");
    assert.equal(valueBinding.name, "value");
  });

  test("{ key: alias } of entries", () => {
    const code = "{ key: alias } of entries";
    const ast = parseIterator(code);

    const decl = ast.declaration;
    assert.equal(decl.$kind, "ObjectBindingPattern");

    assert.deepEqual(decl.keys, ["key"]);
    assert.equal(decl.values.length, 1);

    const binding = decl.values[0];
    assert.equal(binding.$kind, "BindingIdentifier");
    assert.equal(binding.name, "alias");
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
