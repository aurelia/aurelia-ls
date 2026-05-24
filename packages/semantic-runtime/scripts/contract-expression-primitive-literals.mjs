import ts from 'typescript';
import { KernelStore } from '../out/kernel/store.js';
import { BindingContextKind, BindingScopeConstructionRequest, BindingScopeOwnerKind } from '../out/configuration/scope.js';
import { BindingScopeMaterializer } from '../out/configuration/scope-materializer.js';
import { SourceSpan } from '../out/expression/source-span.js';
import { PrimitiveLiteralExpression } from '../out/expression/ast.js';
import { CheckerTypeProjector, CheckerTypeMemberProjectionPolicy } from '../out/type-system/checker-projector.js';
import { CheckerExpressionTypeEvaluator } from '../out/type-system/expression-type-evaluator.js';
import { CheckerExpressionTypeEvaluationResultKind } from '../out/type-system/expression-type-evaluation.js';
import { CheckerTypeProjectionOrigin } from '../out/type-system/type-shape.js';

const sourceFileName = 'contract-expression-primitive-literals.ts';
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
const rootType = rootInterface == null ? checker.getUnknownType() : checker.getTypeAtLocation(rootInterface.name);
const store = new KernelStore('contract-expression-primitive-literals');
const projector = new CheckerTypeProjector(store);
const rootReference = projector.ensureProjection({
  localKey: 'contract-expression-primitive-literals:root',
  checker,
  type: rootType,
  origin: CheckerTypeProjectionOrigin.TypeChecker,
  sourceNode: rootInterface ?? sourceFile,
  sourceAddressHandle: null,
  display: checker.typeToString(rootType),
  memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
}).toReference();
const scope = new BindingScopeMaterializer(store).construct(new BindingScopeConstructionRequest(
  'contract-expression-primitive-literals:scope',
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
const failures = [];

assertLiteralType('string literal', 'open', '"open"');
assertLiteralType('number literal', 42, '42');
assertLiteralType('true literal', true, 'true');
assertLiteralType('false literal', false, 'false');
assertLiteralType('undefined literal', undefined, 'undefined');
assertLiteralType('null literal', null, 'null');
assertCacheDistinguishesSameLocalKeySourceSpans();

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true }, null, 2));
}

function assertLiteralType(label, value, expectedDisplay) {
  const expression = new PrimitiveLiteralExpression(new SourceSpan(0, 0, null), value);
  const result = evaluator.evaluateWithScope(expression, scope, `contract-expression-primitive-literals:${label}`);
  if (result.kind !== CheckerExpressionTypeEvaluationResultKind.Type) {
    failures.push(`Expected ${label} to project a TypeChecker type, observed ${result.kind}.`);
    return;
  }
  if (result.typeShape.display !== expectedDisplay) {
    failures.push(`Expected ${label} to project ${expectedDisplay}, observed ${result.typeShape.display}.`);
  }
}

function assertCacheDistinguishesSameLocalKeySourceSpans() {
  const sourceAddressHandle = 'contract-expression-primitive-literals:source-file-address';
  const first = new PrimitiveLiteralExpression(new SourceSpan(1, 2, null), 'first');
  const second = new PrimitiveLiteralExpression(new SourceSpan(3, 4, null), 'second');
  const firstResult = evaluator.evaluateWithScope(first, scope, 'contract-expression-primitive-literals:shared-local-key', sourceAddressHandle);
  const secondResult = evaluator.evaluateWithScope(second, scope, 'contract-expression-primitive-literals:shared-local-key', sourceAddressHandle);
  if (firstResult.kind !== CheckerExpressionTypeEvaluationResultKind.Type || secondResult.kind !== CheckerExpressionTypeEvaluationResultKind.Type) {
    failures.push('Expected shared-local-key primitive literals to project TypeChecker types.');
    return;
  }
  if (firstResult.typeShape.display !== '"first"') {
    failures.push(`Expected first shared-local-key literal to remain \"first\", observed ${firstResult.typeShape.display}.`);
  }
  if (secondResult.typeShape.display !== '"second"') {
    failures.push(`Expected second shared-local-key literal to remain \"second\", observed ${secondResult.typeShape.display}.`);
  }
}
