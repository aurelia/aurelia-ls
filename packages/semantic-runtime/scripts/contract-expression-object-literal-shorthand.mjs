import assert from 'node:assert/strict';
import { ExpressionParser } from '../out/expression/expression-parser.js';
import { ScopeExpressionSyntaxOrigin } from '../out/expression/ast.js';
import { ExpressionParseResultKind } from '../out/expression/parse-result-algebra.js';
import { ExpressionParseResultInspector } from '../out/expression/parse-result-inspection.js';

const parser = new ExpressionParser();

assertObjectLiteralShorthand('{a}', ['a'], ['a'], ['a']);
assertObjectLiteralShorthand('{a,b:b,c}', ['a', 'b', 'c'], ['a', 'b', 'c'], ['a', 'b', 'c']);
assertObjectLiteralShorthand('{requestId}', ['requestId'], ['requestId'], ['requestId']);
assertObjectLiteralShorthand("{'a':a,b}", ['a', 'b'], ['a', 'b'], ["'a'", 'b']);

assertObjectLiteralKeyContext('{ a: value,  b: other }', 'a', ['a', 'b'], 'a');
assertObjectLiteralKeyContext('{ a: value,  b: other }', '  b', ['a', 'b'], null, 1);
assertObjectLiteralValueContext('{ a: value,  b: other }', 'value');
assertObjectLiteralKeyContext('{  }', '{', [], null, 1);
assertObjectLiteralKeyContext('{ outer: { nested: value } }', 'nested', ['nested'], 'nested', 0, 1);
assertObjectLiteralFrontierKeyContext('{ outer: {  ', [], null, 1);

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

function assertObjectLiteralShorthand(expression, expectedKeys, expectedAccessNames, expectedKeyTexts) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, 'ObjectLiteral', expression);
  assert.deepEqual(result.ast.keys, expectedKeys, expression);
  assert.deepEqual(result.ast.keySpans.map((span) => expression.slice(span.start, span.end)), expectedKeyTexts, expression);
  assert.deepEqual(result.ast.values.map((value) => value.$kind), expectedAccessNames.map(() => 'AccessScope'), expression);
  assert.deepEqual(result.ast.values.map((value) => value.name.name), expectedAccessNames, expression);
  assert.deepEqual(
    result.ast.values.map((value) => value.syntaxOrigin),
    expectedAccessNames.map(() => ScopeExpressionSyntaxOrigin.Ordinary),
    expression,
  );
}

function assertObjectLiteralKeyContext(expression, marker, expectedKeys, expectedActiveKey, offsetDelta = 0, expectedDepth = 0) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  const offset = expression.indexOf(marker) + offsetDelta;
  const context = ExpressionParseResultInspector.objectLiteralKeyContextAtOffset(result, offset);
  assert.notEqual(context, null, `${expression}@${offset}`);
  assert.deepEqual(context.keys, expectedKeys, `${expression}@${offset}`);
  assert.equal(context.activeKey, expectedActiveKey, `${expression}@${offset}`);
  assert.equal(context.objectDepth, expectedDepth, `${expression}@${offset}`);
}

function assertObjectLiteralValueContext(expression, marker) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  const offset = expression.indexOf(marker) + 1;
  assert.equal(ExpressionParseResultInspector.objectLiteralKeyContextAtOffset(result, offset), null, `${expression}@${offset}`);
}

function assertObjectLiteralFrontierKeyContext(expression, expectedKeys, expectedActiveKey, expectedDepth) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.PropertyLikeFrontierPublication, expression);
  const context = ExpressionParseResultInspector.objectLiteralKeyContextAtOffset(result, expression.length);
  assert.notEqual(context, null, `${expression}@${expression.length}`);
  assert.deepEqual(context.keys, expectedKeys, `${expression}@${expression.length}`);
  assert.equal(context.activeKey, expectedActiveKey, `${expression}@${expression.length}`);
  assert.equal(context.objectDepth, expectedDepth, `${expression}@${expression.length}`);
}

function assertScopeExpressionOrigin(expression, expectedKind, expectedOrigin, expectedAncestor) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, expectedKind, expression);
  assert.equal(result.ast.syntaxOrigin, expectedOrigin, expression);
  assert.equal(result.ast.ancestor, expectedAncestor, expression);
}
