import assert from 'node:assert/strict';
import { ExpressionParser } from '../out/expression/expression-parser.js';
import { ScopeExpressionSyntaxOrigin } from '../out/expression/ast.js';
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

assertScopeExpressionOrigin('title', 'AccessScope', ScopeExpressionSyntaxOrigin.Ordinary, 0);
assertScopeExpressionOrigin('$this.title', 'AccessScope', ScopeExpressionSyntaxOrigin.CurrentBindingContext, 0);
assertScopeExpressionOrigin('$this.titleLength()', 'CallScope', ScopeExpressionSyntaxOrigin.CurrentBindingContext, 0);
assertScopeExpressionOrigin('$parent.title', 'AccessScope', ScopeExpressionSyntaxOrigin.AncestorBindingContext, 1);
assertScopeExpressionOrigin('$parent.$parent.titleLength()', 'CallScope', ScopeExpressionSyntaxOrigin.AncestorBindingContext, 2);

console.log(JSON.stringify({ ok: true, contract: 'expression-object-literal-shorthand' }));

function assertObjectLiteralShorthand(expression, expectedKeys, expectedAccessNames) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, 'ObjectLiteral', expression);
  assert.deepEqual(result.ast.keys, expectedKeys, expression);
  assert.deepEqual(result.ast.values.map((value) => value.$kind), expectedAccessNames.map(() => 'AccessScope'), expression);
  assert.deepEqual(result.ast.values.map((value) => value.name.name), expectedAccessNames, expression);
  assert.deepEqual(
    result.ast.values.map((value) => value.syntaxOrigin),
    expectedAccessNames.map(() => ScopeExpressionSyntaxOrigin.Ordinary),
    expression,
  );
}

function assertScopeExpressionOrigin(expression, expectedKind, expectedOrigin, expectedAncestor) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, expectedKind, expression);
  assert.equal(result.ast.syntaxOrigin, expectedOrigin, expression);
  assert.equal(result.ast.ancestor, expectedAncestor, expression);
}
