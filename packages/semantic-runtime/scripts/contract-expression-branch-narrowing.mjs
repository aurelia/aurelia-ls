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
import { CheckerTypeProjectionOrigin } from '../out/type-system/type-shape.js';

const sourceFileName = 'contract-expression-branch-narrowing.ts';
const sourceText = `
class PhysicalProduct { shippingWeight = 1; }
class DigitalProduct { downloadUrl = ''; }
type MixedProduct = PhysicalProduct | DigitalProduct;

interface BookItem { kind: 'book'; pages: number; }
interface ServiceItem { kind: 'service'; duration: number; }
interface ArchivedItem { kind: 'archived'; archivedAt: Date; }
type CatalogItem = BookItem | ServiceItem | ArchivedItem;

interface ContractRoot {
  currentItem: CatalogItem;
  probedItem: CatalogItem;
  mixedProduct: MixedProduct;
  mixedConstructed: MixedProduct | Date;
  physicalProductType: typeof PhysicalProduct;
  overloadedProductType: { new (label: string): PhysicalProduct; new (id: number): DigitalProduct; };
  currentPrimitive: string | number;
  bookOnly(value: BookItem): 'book';
  notBookOnly(value: ServiceItem | ArchivedItem): 'other';
  stringOnly(value: string): 'string';
  numberOnly(value: number): 'number';
  physicalOnly(value: PhysicalProduct): 'physical';
  digitalOnly(value: DigitalProduct): 'digital';
  productOnly(value: MixedProduct): 'product';
  dateOnly(value: Date): 'date';
}
`;

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
const rootInterface = sourceFile.statements.find((statement) =>
  ts.isInterfaceDeclaration(statement) && statement.name.text === 'ContractRoot'
);
assert.notEqual(rootInterface, undefined);

const store = new KernelStore('contract-expression-branch-narrowing');
const projector = new CheckerTypeProjector(store);
const rootReference = projector.ensureProjection({
  localKey: 'contract-expression-branch-narrowing:root',
  checker,
  type: checker.getTypeAtLocation(rootInterface.name),
  origin: CheckerTypeProjectionOrigin.TypeChecker,
  sourceNode: rootInterface,
  memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
}).toReference();

const scope = new BindingScopeMaterializer(store).construct(new BindingScopeConstructionRequest(
  'contract-expression-branch-narrowing:scope',
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

assertExpressionType(
  "currentItem.kind === 'book' ? bookOnly(currentItem) : notBookOnly(currentItem)",
  '"book" | "other"',
);
assertExpressionType(
  "typeof currentPrimitive === 'string' ? stringOnly(currentPrimitive) : numberOnly(currentPrimitive)",
  '"string" | "number"',
);
assertExpressionType(
  "'pages' in probedItem ? bookOnly(probedItem) : notBookOnly(probedItem)",
  '"book" | "other"',
);
assertExpressionType(
  'mixedProduct instanceof physicalProductType ? physicalOnly(mixedProduct) : digitalOnly(mixedProduct)',
  '"physical" | "digital"',
);
assertExpressionType(
  'mixedConstructed instanceof overloadedProductType ? productOnly(mixedConstructed) : dateOnly(mixedConstructed)',
  '"product" | "date"',
);
assertExpressionType(
  "'pages' in probedItem && bookOnly(probedItem)",
  'boolean | "book"',
);
assertExpressionType(
  'mixedProduct instanceof physicalProductType && physicalOnly(mixedProduct)',
  'boolean | "physical"',
);

console.log(JSON.stringify({ ok: true, contract: 'expression-branch-narrowing' }));

function assertExpressionType(source, expectedDisplay) {
  const parsed = parser.parse(source, 'IsProperty');
  assert.equal(parsed.kind, ExpressionParseResultKind.ExpressionSuccess, source);
  const result = evaluator.evaluate(CheckerExpressionTypeEvaluationContext.knownScope(
    parsed.ast,
    scope,
    `contract-expression-branch-narrowing:${source}`,
  ));
  assert.equal(result.kind, CheckerExpressionTypeEvaluationResultKind.Type, source);
  assert.equal(result.typeShape.display, expectedDisplay, source);
}
