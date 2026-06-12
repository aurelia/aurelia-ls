import assert from 'node:assert/strict';
import { ExpressionParser } from '../out/expression/expression-parser.js';
import { ScopeExpressionRootKind } from '../out/expression/ast.js';
import { ExpressionParseResultKind } from '../out/expression/parse-result-algebra.js';

const parser = new ExpressionParser();

assertObjectLiteralShorthand('{a}', ['a'], ['a']);
assertObjectLiteralShorthand('{a,b:b,c}', ['a', 'b', 'c'], ['a', 'b', 'c']);
assertObjectLiteralShorthand('{requestId}', ['requestId'], ['requestId']);
assertObjectLiteralShorthand("{'a':a,b}", ['a', 'b'], ['a', 'b']);

const numericShorthand = parser.parse('{1}', 'IsProperty');
assert.notEqual(numericShorthand.kind, ExpressionParseResultKind.ExpressionSuccess);

const adjacentIdentifier = parser.parse('{a b}', 'IsProperty');
assert.equal(adjacentIdentifier.kind, ExpressionParseResultKind.CompleteInputParseError);
assert.match(adjacentIdentifier.message, /Expected ',' or '}'/);

assertScopeExpressionRoot('title', 'AccessScope', ScopeExpressionRootKind.BindingContext, 0);
assertScopeExpressionRoot('$this.title', 'AccessScope', ScopeExpressionRootKind.CurrentBindingContext, 0);
assertScopeExpressionRoot('$this.titleLength()', 'CallScope', ScopeExpressionRootKind.CurrentBindingContext, 0);
assertScopeExpressionRoot('$parent.title', 'AccessScope', ScopeExpressionRootKind.AncestorBindingContext, 1);
assertScopeExpressionRoot('$parent.$parent.titleLength()', 'CallScope', ScopeExpressionRootKind.AncestorBindingContext, 2);

console.log(JSON.stringify({ ok: true, contract: 'expression-object-literal-shorthand' }));

function assertObjectLiteralShorthand(expression, expectedKeys, expectedAccessNames) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, 'ObjectLiteral', expression);
  assert.deepEqual(result.ast.keys, expectedKeys, expression);
  assert.deepEqual(result.ast.values.map((value) => value.$kind), expectedAccessNames.map(() => 'AccessScope'), expression);
  assert.deepEqual(result.ast.values.map((value) => value.name.name), expectedAccessNames, expression);
  assert.deepEqual(
    result.ast.values.map((value) => value.rootKind),
    expectedAccessNames.map(() => ScopeExpressionRootKind.BindingContext),
    expression,
  );
}

function assertScopeExpressionRoot(expression, expectedKind, expectedRootKind, expectedAncestor) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, expectedKind, expression);
  assert.equal(result.ast.rootKind, expectedRootKind, expression);
  assert.equal(result.ast.ancestor, expectedAncestor, expression);
}
