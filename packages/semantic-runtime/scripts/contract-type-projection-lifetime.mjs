import ts from 'typescript';
import { KernelStore } from '../out/kernel/store.js';
import { CheckerTypeProjector } from '../out/type-system/checker-projector.js';

const failures = [];

verifyTypeShapeIndexPrunesWithKernelDisposal();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: TypeChecker projection indexes mirror kernel product-detail lifetime.');

function verifyTypeShapeIndexPrunesWithKernelDisposal() {
  const fixture = createCheckerFixture();
  const store = new KernelStore('contract-type-projection-lifetime');
  const projector = new CheckerTypeProjector(store);
  const marker = store.mark();
  const first = projector.ensureProjection({
    localKey: 'foo',
    checker: fixture.checker,
    type: fixture.type,
    sourceNode: fixture.sourceNode,
  });

  expect(typeShapeIndexEntryCount(store) === 1, 'Type-shape sidecar index should record the projected checker shape.');
  expect(store.productDetails.size === 1, 'Type projection should attach one product detail.');

  const disposal = store.disposeSince(marker);
  expect(disposal.productDetails === 1, 'Disposing the answer-local marker should remove the projected type detail.');
  expect(disposal.hotDetails === 2, 'Disposing the answer-local marker should remove hot member details for the projected type.');
  expect(store.productDetails.size === 0, 'Product details should be empty after marker disposal.');
  expect(typeShapeIndexEntryCount(store) === 0, 'Type-shape sidecar index should prune disposed product-detail handles.');

  const second = projector.ensureProjection({
    localKey: 'foo',
    checker: fixture.checker,
    type: fixture.type,
    sourceNode: fixture.sourceNode,
  });
  expect(second !== first, 'Reprojecting after disposal should materialize a fresh type detail, not reuse a stale object.');
  expect(second.productHandle === first.productHandle, 'Reprojecting the same local key should reuse the stable product handle after disposal.');
  expect(store.productDetails.size === 1, 'Fresh projection should attach a new product detail after disposal.');
  expect(typeShapeIndexEntryCount(store) === 1, 'Fresh projection should repopulate the sidecar index after disposal.');
}

function createCheckerFixture() {
  const fileName = 'contract-type-projection.ts';
  const sourceText = 'export interface Foo { bar: string; baz: number; }';
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    noLib: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
  };
  const defaultHost = ts.createCompilerHost(compilerOptions);
  const host = {
    ...defaultHost,
    fileExists(name) {
      return name === fileName;
    },
    getSourceFile(name) {
      return name === fileName ? sourceFile : undefined;
    },
    readFile(name) {
      return name === fileName ? sourceText : undefined;
    },
    writeFile() {},
  };
  const program = ts.createProgram([fileName], compilerOptions, host);
  const checker = program.getTypeChecker();
  const programSourceFile = program.getSourceFile(fileName);
  const declaration = programSourceFile?.statements.find(ts.isInterfaceDeclaration) ?? null;
  const symbol = declaration == null ? null : checker.getSymbolAtLocation(declaration.name);
  if (declaration == null || symbol == null) {
    throw new Error('Contract fixture did not produce a checker-visible Foo interface.');
  }
  return {
    checker,
    sourceNode: declaration.name,
    type: checker.getDeclaredTypeOfSymbol(symbol),
  };
}

function typeShapeIndexEntryCount(store) {
  const row = store.readTelemetrySnapshot({ includeBreakdowns: true }).sidecarIndexes.find((candidate) =>
    candidate.key === 'type-system.checker-type-shape-index'
  );
  return row?.entries ?? 0;
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
