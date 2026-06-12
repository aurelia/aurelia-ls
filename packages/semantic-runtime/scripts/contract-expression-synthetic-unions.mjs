import assert from 'node:assert/strict';
import ts from 'typescript';
import { BindingContextKind, BindingScopeConstructionRequest, BindingScopeOwnerKind } from '../out/configuration/scope.js';
import { BindingScopeMaterializer } from '../out/configuration/scope-materializer.js';
import { ExpressionParser } from '../out/expression/expression-parser.js';
import { ExpressionParseResultKind } from '../out/expression/parse-result-algebra.js';
import { KernelStore } from '../out/kernel/store.js';
import { CheckerTypeProjector, CheckerTypeMemberProjectionPolicy } from '../out/type-system/checker-projector.js';
import { CheckerExpressionTypeEvaluator } from '../out/type-system/expression-type-evaluator.js';
import { CheckerExpressionTypeEvaluationContext } from '../out/type-system/expression-type-context.js';
import { CheckerExpressionTypeEvaluationResultKind } from '../out/type-system/expression-type-evaluation.js';
import { TypeSystemProductDetails } from '../out/type-system/product-details.js';
import { CheckerTypeProjectionOrigin } from '../out/type-system/type-shape.js';

const sourceFileName = 'contract-expression-synthetic-unions.ts';
const sourceText = 'export interface ContractRoot { value: string; }\n';
const sourceFile = ts.createSourceFile(sourceFileName, sourceText, ts.ScriptTarget.Latest, true);
const host = ts.createCompilerHost({ strict: true, target: ts.ScriptTarget.Latest, noEmit: true });
const originalGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
  fileName === sourceFileName
    ? sourceFile
    : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
host.readFile = (fileName) => fileName === sourceFileName ? sourceText : ts.sys.readFile(fileName);
host.fileExists = (fileName) => fileName === sourceFileName || ts.sys.fileExists(fileName);

const program = ts.createProgram([sourceFileName], { strict: true, target: ts.ScriptTarget.Latest, noEmit: true }, host);
const checker = program.getTypeChecker();
const rootInterface = sourceFile.statements.find(ts.isInterfaceDeclaration);
assert.notEqual(rootInterface, undefined);

const store = new KernelStore('contract-expression-synthetic-unions');
const projector = new CheckerTypeProjector(store);
const rootReference = projector.ensureProjection({
  localKey: 'contract-expression-synthetic-unions:root',
  checker,
  type: checker.getTypeAtLocation(rootInterface.name),
  origin: CheckerTypeProjectionOrigin.TypeChecker,
  sourceNode: rootInterface,
  memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
}).toReference();

const scope = new BindingScopeMaterializer(store).construct(new BindingScopeConstructionRequest(
  'contract-expression-synthetic-unions:scope',
  BindingScopeOwnerKind.SyntheticView,
  null,
  null,
  null,
  BindingContextKind.Synthetic,
  rootReference,
  [],
  null,
  [],
  true,
  null,
)).scope;

const evaluator = new CheckerExpressionTypeEvaluator(store, projector);
const parser = new ExpressionParser();
const literalArraySource = "[{ id: 'first', label: 'First' }, { id: 'second', label: 'Second' }]";

assertArrayLiteralElementUnion();
assertRepeatLocalElementUnion();
assertSyntheticArrayMethodUnion();
assertSyntheticArrayCallbackMemberOwner();

console.log(JSON.stringify({ ok: true, contract: 'expression-synthetic-unions' }));

function assertArrayLiteralElementUnion() {
  const parsed = parser.parse(literalArraySource, 'IsProperty');
  assert.equal(parsed.kind, ExpressionParseResultKind.ExpressionSuccess, literalArraySource);
  const result = evaluator.evaluate(CheckerExpressionTypeEvaluationContext.knownScope(
    parsed.ast,
    scope,
    'contract-expression-synthetic-unions:array-literal',
  ));
  assert.equal(result.kind, CheckerExpressionTypeEvaluationResultKind.Type, literalArraySource);
  const element = typeShapeFor(result.typeShape.iteratedValueType);
  assert.notEqual(element, null, 'Expected the array literal to carry an iterated element type.');
  assertMemberDisplay(element, 'id', '"first" | "second"');
  assertMemberDisplay(element, 'label', '"First" | "Second"');
}

function assertRepeatLocalElementUnion() {
  const parsed = parser.parse(`item of ${literalArraySource}`, 'IsIterator');
  assert.equal(parsed.kind, ExpressionParseResultKind.IteratorSuccess, 'iterator parse');
  const projection = evaluator.evaluateIteratorProjection(CheckerExpressionTypeEvaluationContext.knownScope(
    parsed.ast,
    scope,
    'contract-expression-synthetic-unions:repeat',
  ));
  assert.equal(projection.element.kind, CheckerExpressionTypeEvaluationResultKind.Type, 'iterator element');
  assertMemberDisplay(projection.element.typeShape, 'id', '"first" | "second"');
  const local = projection.locals.locals.find((candidate) => candidate.name === 'item') ?? null;
  assert.notEqual(local?.typeReference ?? null, null, 'Expected repeat local `item` to carry the synthetic union element type.');
  assert.equal(typeShapeFor(local.typeReference)?.display, projection.element.typeShape.display);
}

function assertSyntheticArrayMethodUnion() {
  const mapResult = evaluateExpression(`${literalArraySource}.map(item => item.id)`);
  assert.equal(mapResult.typeShape.display, 'Array<"first" | "second">', 'Array.map result');
  const mapElement = typeShapeFor(mapResult.typeShape.iteratedValueType);
  assert.equal(mapElement?.display, '"first" | "second"', 'Array.map iterated result');

  const filterResult = evaluateExpression(`${literalArraySource}.filter(item => item.id === 'first')`);
  assert.equal(filterResult.typeShape.display, 'Array<{ id: "first"; label: "First" } | { id: "second"; label: "Second" }>', 'Array.filter result');
  assertMemberDisplay(typeShapeFor(filterResult.typeShape.iteratedValueType), 'id', '"first" | "second"');

  const filterWithHostCallResult = evaluateExpression(`${literalArraySource}.filter(item => item.id.localeCompare('first') === 0)`);
  assertMemberDisplay(typeShapeFor(filterWithHostCallResult.typeShape.iteratedValueType), 'label', '"First" | "Second"');

  const findResult = evaluateExpression(`${literalArraySource}.find(item => item.id === 'first')`);
  assert.equal(findResult.typeShape.display, '{ id: "first"; label: "First" } | { id: "second"; label: "Second" } | undefined', 'Array.find result');

  const findLastIndexResult = evaluateExpression(`${literalArraySource}.findLastIndex(item => item.id === 'second')`);
  assert.equal(findLastIndexResult.typeShape.display, 'number', 'Array.findLastIndex result');

  const atResult = evaluateExpression(`${literalArraySource}.at(0)`);
  assert.equal(atResult.typeShape.display, '{ id: "first"; label: "First" } | { id: "second"; label: "Second" } | undefined', 'Array.at result');

  const concatResult = evaluateExpression(`${literalArraySource}.concat([{ id: 'third', label: 'Third', extra: true }])`);
  assertMemberDisplay(typeShapeFor(concatResult.typeShape.iteratedValueType), 'id', '"first" | "second" | "third"');

  const toReversedResult = evaluateExpression(`${literalArraySource}.toReversed()`);
  assertMemberDisplay(typeShapeFor(toReversedResult.typeShape.iteratedValueType), 'label', '"First" | "Second"');

  const toSortedResult = evaluateExpression(`${literalArraySource}.toSorted((left, right) => left.id.localeCompare(right.id))`);
  assertMemberDisplay(typeShapeFor(toSortedResult.typeShape.iteratedValueType), 'label', '"First" | "Second"');

  const toSplicedResult = evaluateExpression(`${literalArraySource}.toSpliced(0, 1, { id: 'third', label: 'Third' })`);
  assertMemberDisplay(typeShapeFor(toSplicedResult.typeShape.iteratedValueType), 'id', '"first" | "second"');

  const withResult = evaluateExpression(`${literalArraySource}.with(0, { id: 'third', label: 'Third' })`);
  assertMemberDisplay(typeShapeFor(withResult.typeShape.iteratedValueType), 'id', '"first" | "second"');

  const pushResult = evaluateExpression(`${literalArraySource}.push({ id: 'third', label: 'Third' })`);
  assert.equal(pushResult.typeShape.display, 'number', 'Array.push result');
}

function assertSyntheticArrayCallbackMemberOwner() {
  const source = `${literalArraySource}.map(item => item.id)`;
  const parsed = parser.parse(source, 'IsProperty');
  assert.equal(parsed.kind, ExpressionParseResultKind.ExpressionSuccess, source);
  const offset = source.indexOf('item.id') + 'item.'.length;
  const owner = evaluator.evaluateMemberOwnerAtOffset(
    CheckerExpressionTypeEvaluationContext.knownScope(
      parsed.ast,
      scope,
      'contract-expression-synthetic-unions:member-owner',
    ),
    offset,
  );
  assert.equal(owner.kind, CheckerExpressionTypeEvaluationResultKind.Type, 'Array.map callback member owner');
  assertMemberDisplay(owner.typeShape, 'id', '"first" | "second"');
  assertMemberDisplay(owner.typeShape, 'label', '"First" | "Second"');
}

function evaluateExpression(source) {
  const parsed = parser.parse(source, 'IsProperty');
  assert.equal(parsed.kind, ExpressionParseResultKind.ExpressionSuccess, source);
  const result = evaluator.evaluate(CheckerExpressionTypeEvaluationContext.knownScope(
    parsed.ast,
    scope,
    `contract-expression-synthetic-unions:expr:${source}`,
  ));
  assert.equal(result.kind, CheckerExpressionTypeEvaluationResultKind.Type, source);
  return result;
}

function assertMemberDisplay(shape, memberName, expectedDisplay) {
  const member = shape.members.find((candidate) => candidate.name === memberName) ?? null;
  assert.notEqual(member, null, `Expected member ${memberName} on ${shape.display}.`);
  const memberShape = typeShapeFor(member.valueType);
  assert.notEqual(memberShape, null, `Expected member ${memberName} to carry a projected value type.`);
  assert.equal(memberShape.display, expectedDisplay, `member ${memberName}`);
}

function typeShapeFor(reference) {
  return reference?.productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
}
