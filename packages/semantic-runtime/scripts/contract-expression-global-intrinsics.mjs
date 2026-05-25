import assert from 'node:assert/strict';
import ts from 'typescript';
import { ExpressionParser } from '../out/expression/expression-parser.js';
import { ExpressionParseResultKind } from '../out/expression/parse-result-algebra.js';
import { StaticEvaluator } from '../out/evaluation/evaluator.js';
import {
  AureliaGlobalIntrinsicEvaluationKind,
  evaluateAureliaExpressionGlobalAccess,
  evaluateAureliaExpressionGlobalCall,
  evaluateAureliaExpressionGlobalConstructor,
  evaluateAureliaExpressionGlobalMemberCall,
} from '../out/evaluation/global-intrinsics.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  EvaluationStringValue,
} from '../out/evaluation/values.js';

const parser = new ExpressionParser();
const admittedGlobalNames = [
  'Infinity',
  'NaN',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'Array',
  'BigInt',
  'Boolean',
  'Date',
  'Map',
  'Number',
  'Object',
  'RegExp',
  'Set',
  'String',
  'JSON',
  'Math',
  'Intl',
];

for (const name of admittedGlobalNames) {
  const result = parser.parse(name, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, name);
  assert.equal(result.ast.$kind, 'AccessGlobal', name);
}

assertGlobalCallParses('parseInt("42", 10)', 'parseInt');
assertGlobalCallValue('parseInt', [
  new EvaluationStringValue('42'),
  new EvaluationNumberValue(10),
], 42);
assertGlobalCallValue('isNaN', [new EvaluationStringValue('x')], true);
assertGlobalCallValue('isFinite', [new EvaluationStringValue('12')], true);
assertGlobalCallValue('Number', [new EvaluationStringValue('4.5')], 4.5);
assertGlobalCallValue('Boolean', [new EvaluationNumberValue(0)], false);
assertGlobalCallValue('String', [new EvaluationNumberValue(7)], '7');
assertGlobalCallValue('encodeURIComponent', [new EvaluationStringValue('a b')], 'a%20b');
assertGlobalConstructorParses('new RegExp("x", "i")', 'RegExp');
assertGlobalConstructorValue('RegExp', [new EvaluationStringValue('x'), new EvaluationStringValue('i')], 'regexp:x/i');
assertGlobalConstructorValue('Array', [new EvaluationStringValue('x')], ['x']);
assertGlobalConstructorValue('Object', [], objectValue([]));

const math = evaluateAureliaExpressionGlobalAccess('Math');
assert.equal(math?.kind, 'boundary-object');
assertGlobalMemberCallValue(math, 'max', [
  new EvaluationNumberValue(2),
  new EvaluationNumberValue(5),
], 5);
assert.equal(math.properties.get('PI')?.value.kind, 'number');

const json = evaluateAureliaExpressionGlobalAccess('JSON');
assertGlobalMemberCallValue(json, 'parse', [new EvaluationStringValue('{"a":1}')], objectValue([
  ['a', new EvaluationNumberValue(1)],
]));
assertGlobalMemberCallValue(json, 'stringify', [objectValue([
  ['a', new EvaluationNumberValue(1)],
])], '{"a":1}');

const objectGlobal = evaluateAureliaExpressionGlobalAccess('Object');
assertGlobalMemberCallValue(objectGlobal, 'keys', [objectValue([
  ['a', new EvaluationNumberValue(1)],
  ['b', new EvaluationStringValue('two')],
])], ['a', 'b']);

const arrayGlobal = evaluateAureliaExpressionGlobalAccess('Array');
assertGlobalMemberCallValue(arrayGlobal, 'isArray', [
  new EvaluationArrayValue([], false),
], true);

const objectToString = evaluateAureliaExpressionGlobalMemberCall(
  new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'Object.prototype.toString'),
  'call',
  [new EvaluationArrayValue([], false)],
);
assert.equal(objectToString?.kind, AureliaGlobalIntrinsicEvaluationKind.Value);
assert.equal(objectToString.value.kind, 'string');
assert.equal(objectToString.value.value, '[object Array]');

assertStaticEvaluatorSharesGlobalIntrinsics();

console.log(JSON.stringify({ ok: true, contract: 'expression-global-intrinsics' }));

function assertGlobalCallParses(source, name) {
  const result = parser.parse(source, 'IsFunction');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, source);
  assert.equal(result.ast.$kind, 'CallGlobal', source);
  assert.equal(result.ast.name.name, name, source);
}

function assertGlobalCallValue(name, args, expected) {
  const result = evaluateAureliaExpressionGlobalCall(name, args);
  assert.equal(result.kind, AureliaGlobalIntrinsicEvaluationKind.Value, name);
  assertEvaluationValue(result.value, expected, name);
}

function assertGlobalConstructorParses(source, name) {
  const result = parser.parse(source, 'IsProperty');
  assert.equal(result.kind, ExpressionParseResultKind.ExpressionSuccess, source);
  assert.equal(result.ast.$kind, 'New', source);
  assert.equal(result.ast.func.$kind, 'AccessGlobal', source);
  assert.equal(result.ast.func.name.name, name, source);
}

function assertGlobalConstructorValue(name, args, expected) {
  const result = evaluateAureliaExpressionGlobalConstructor(name, args);
  assert.equal(result.kind, AureliaGlobalIntrinsicEvaluationKind.Value, name);
  assertEvaluationValue(result.value, expected, name);
}

function assertGlobalMemberCallValue(receiver, memberName, args, expected) {
  assert.notEqual(receiver, null, memberName);
  const result = evaluateAureliaExpressionGlobalMemberCall(receiver, memberName, args);
  assert.equal(result?.kind, AureliaGlobalIntrinsicEvaluationKind.Value, memberName);
  assertEvaluationValue(result.value, expected, memberName);
}

function assertEvaluationValue(value, expected, label) {
  if (typeof expected === 'string' && expected.startsWith('regexp:')) {
    assert.equal(value.kind, 'regular-expression', label);
    assert.equal(`regexp:${value.pattern}/${value.flags}`, expected, label);
    return;
  }
  if (typeof expected === 'string') {
    assert.equal(value.kind, 'string', label);
    assert.equal(value.value, expected, label);
    return;
  }
  if (typeof expected === 'number') {
    assert.equal(value.kind, 'number', label);
    assert.equal(value.value, expected, label);
    return;
  }
  if (typeof expected === 'boolean') {
    assert.equal(value.kind, 'boolean', label);
    assert.equal(value.value, expected, label);
    return;
  }
  if (Array.isArray(expected)) {
    assert.equal(value.kind, 'array', label);
    assert.deepEqual(value.elements.map((element) =>
      element.value.kind === 'string' || element.value.kind === 'number' || element.value.kind === 'boolean'
        ? element.value.value
        : element.value.kind
    ), expected, label);
    return;
  }
  if (expected instanceof EvaluationObjectValue) {
    assert.equal(value.kind, 'object', label);
    assert.deepEqual(
      [...value.properties].map(([key, property]) => [key, property.value.kind === 'number' ? property.value.value : property.value.value]),
      [...expected.properties].map(([key, property]) => [key, property.value.kind === 'number' ? property.value.value : property.value.value]),
      label,
    );
    return;
  }
  assert.fail(`Unsupported expected assertion for ${label}.`);
}

function objectValue(entries) {
  return new EvaluationObjectValue(new Map(entries.map(([name, entry]) => [
    name,
    new EvaluationObjectProperty(name, entry, null),
  ])), false);
}

function assertStaticEvaluatorSharesGlobalIntrinsics() {
  const sourceFile = ts.createSourceFile(
    'contract-expression-global-intrinsics.ts',
    `
      const parsed = parseInt("42", 10);
      const maximum = Math.max(2, 5);
      const encoded = encodeURIComponent("a b");
      const object = new Object();
      const negative = -5;
      const numeric = +"4";
      const inverted = !0;
      const globalKind = typeof Math;
      const voided = void parsed;
      const objectCheck = object instanceof Object;
      const arrayCheck = [] instanceof Array;
      const hasA = "a" in { a: 1 };
      const hasMissing = "missing" in { a: 1 };
      const lastEven = [1, 2, 3, 4].findLast(value => value % 2 === 0);
      const lastEvenIndex = [1, 2, 3, 4].findLastIndex(value => value % 2 === 0);
      const lastTwoIndex = [1, 2, 3, 2].lastIndexOf(2);
      const reversed = [1, 2, 3].toReversed();
      const sorted = [3, 1, 2].toSorted((left, right) => left - right);
      const spliced = [1, 2, 3].toSpliced(1, 1, 9);
      const replaced = [1, 2, 3].with(-1, 9);
    `,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const result = new StaticEvaluator().evaluateSourceFile(sourceFile);
  assert.equal(result.openSeams.length, 0);
  assert.equal(result.environment.readValue('parsed')?.value, 42);
  assert.equal(result.environment.readValue('maximum')?.value, 5);
  assert.equal(result.environment.readValue('encoded')?.value, 'a%20b');
  assert.equal(result.environment.readValue('object')?.kind, 'object');
  assert.equal(result.environment.readValue('negative')?.value, -5);
  assert.equal(result.environment.readValue('numeric')?.value, 4);
  assert.equal(result.environment.readValue('inverted')?.value, true);
  assert.equal(result.environment.readValue('globalKind')?.value, 'object');
  assert.equal(result.environment.readValue('voided')?.kind, 'undefined');
  assert.equal(result.environment.readValue('objectCheck')?.value, true);
  assert.equal(result.environment.readValue('arrayCheck')?.value, true);
  assert.equal(result.environment.readValue('hasA')?.value, true);
  assert.equal(result.environment.readValue('hasMissing')?.value, false);
  assert.equal(result.environment.readValue('lastEven')?.value, 4);
  assert.equal(result.environment.readValue('lastEvenIndex')?.value, 3);
  assert.equal(result.environment.readValue('lastTwoIndex')?.value, 3);
  assert.deepEqual(arrayPrimitiveValues(result.environment.readValue('reversed')), [3, 2, 1]);
  assert.deepEqual(arrayPrimitiveValues(result.environment.readValue('sorted')), [1, 2, 3]);
  assert.deepEqual(arrayPrimitiveValues(result.environment.readValue('spliced')), [1, 9, 3]);
  assert.deepEqual(arrayPrimitiveValues(result.environment.readValue('replaced')), [1, 2, 9]);
}

function arrayPrimitiveValues(value) {
  assert.equal(value?.kind, 'array');
  return value.elements.map((element) => element.value.value);
}
