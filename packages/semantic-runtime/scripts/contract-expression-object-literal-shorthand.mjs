import assert from 'node:assert/strict';
import { ExpressionParser } from '../out/expression/expression-parser.js';
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

console.log(JSON.stringify({ ok: true, contract: 'expression-object-literal-shorthand' }));

function assertObjectLiteralShorthand(expression, expectedKeys, expectedAccessNames) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, 'ObjectLiteral', expression);
  assert.deepEqual(result.ast.keys, expectedKeys, expression);
  assert.deepEqual(result.ast.values.map((value) => value.$kind), expectedAccessNames.map(() => 'AccessScope'), expression);
  assert.deepEqual(result.ast.values.map((value) => value.name.name), expectedAccessNames, expression);
}
