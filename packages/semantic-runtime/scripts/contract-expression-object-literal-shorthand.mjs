import assert from 'node:assert/strict';
import { ExpressionParser } from '../out/expression/expression-parser.js';
import { AuthoredScopePathKind } from '../out/expression/ast.js';
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

assertScopeExpressionPath('title', 'AccessScope', null, 0, [], false);
assertScopeExpressionPath('$this.title', 'AccessScope', AuthoredScopePathKind.CurrentBindingContext, 0, ['$this'], false);
assertScopeExpressionPath('$this.titleLength()', 'CallScope', AuthoredScopePathKind.CurrentBindingContext, 0, ['$this'], false);
assertScopeExpressionPath('$parent.title', 'AccessScope', AuthoredScopePathKind.AncestorBindingContext, 1, ['$parent'], false);
assertScopeExpressionPath('$parent.$parent.titleLength()', 'CallScope', AuthoredScopePathKind.AncestorBindingContext, 2, ['$parent', '$parent'], false);
assertScopeExpressionPath('$parent?.title', 'AccessScope', AuthoredScopePathKind.AncestorBindingContext, 1, ['$parent'], true);
assertArrowScopeExpressionPath(
  'items.map(item => $this.heading)',
  (ast) => ast.args[0].body,
  AuthoredScopePathKind.CurrentBindingContext,
  1,
  ['$this'],
);
assertArrowScopeExpressionPath(
  'items.map(item => items.map(inner => $parent.heading))',
  (ast) => ast.args[0].body.args[0].body,
  AuthoredScopePathKind.AncestorBindingContext,
  3,
  ['$parent'],
);
assertArrowScopeExpressionPath(
  'items.map(item => item.label)',
  (ast) => ast.args[0].body.object,
  null,
  0,
  [],
);
assertNotAssignable('maybeItem?.score++');
assertNotAssignable('++maybeItem?.score');

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
    result.ast.values.map((value) => value.authoredScopePath),
    expectedAccessNames.map(() => null),
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

function assertScopeExpressionPath(expression, expectedKind, expectedPathKind, expectedAncestor, expectedQualifiers, expectedOptionalAccess) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  assert.equal(result.ast.$kind, expectedKind, expression);
  assert.equal(result.ast.authoredScopePath?.pathKind ?? null, expectedPathKind, expression);
  assert.equal(result.ast.ancestor, expectedAncestor, expression);
  assert.deepEqual(
    result.ast.authoredScopePath?.qualifierSpans.map((span) => expression.slice(span.start, span.end)) ?? [],
    expectedQualifiers,
    expression,
  );
  assert.equal(
    result.ast.$kind === 'CallScope'
      ? result.ast.optionalAccess
      : result.ast.optional,
    expectedOptionalAccess,
    expression,
  );
}

function assertArrowScopeExpressionPath(expression, select, expectedPathKind, expectedAncestor, expectedQualifiers) {
  const result = parser.parse(expression, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, expression);
  const scopeExpression = select(result.ast);
  assert.equal(scopeExpression.$kind, 'AccessScope', expression);
  assert.equal(scopeExpression.authoredScopePath?.pathKind ?? null, expectedPathKind, expression);
  assert.equal(scopeExpression.ancestor, expectedAncestor, expression);
  assert.deepEqual(
    scopeExpression.authoredScopePath?.qualifierSpans.map((span) => expression.slice(span.start, span.end)) ?? [],
    expectedQualifiers,
    expression,
  );
}

function assertNotAssignable(expression) {
  const result = parser.parse(expression, 'IsFunction');
  assert.equal(result.kind, ExpressionParseResultKind.CompleteInputParseError, expression);
  assert.equal(result.frameworkErrorCode, 'AUR0158', expression);
}
