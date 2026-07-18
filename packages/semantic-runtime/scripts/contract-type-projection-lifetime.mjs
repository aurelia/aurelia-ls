import ts from 'typescript';
import { KernelStore } from '../out/kernel/store.js';
import { CheckerTypeProjector } from '../out/type-system/checker-projector.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../out/type-system/checker-type-member-surface.js';
import { registerIsolatedCheckerDeclarationSourceContext } from '../out/type-system/declaration-source.js';
import { TypeSystemHotDetails } from '../out/type-system/product-details.js';
import {
  CheckerIndexedAccessKeyKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
} from '../out/type-system/type-shape.js';

const failures = [];

verifyCanonicalProjectionFollowsKernelLifetime();
verifyCheckerEpochsDoNotShareHotProjections();
verifySyntheticArrayMembersAreOwnedHotDetails();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: TypeChecker projection identity follows kernel lifetime and Program epochs.');

function verifyCanonicalProjectionFollowsKernelLifetime() {
  const fixture = createCheckerFixture();
  const store = new KernelStore('contract-type-projection-lifetime');
  const projector = new CheckerTypeProjector(store, store);
  const marker = store.markLifetime();
  const first = projector.ensureProjection({
    localKey: 'foo',
    checker: fixture.checker,
    type: fixture.type,
    sourceNode: fixture.sourceNode,
  });

  expect(store.productDetails.size === 1, 'Type projection should attach one product detail.');

  const sameEpochOtherSite = projector.ensureProjection({
    localKey: 'bar',
    checker: fixture.checker,
    type: fixture.type,
    sourceNode: fixture.sourceNode,
  });
  expect(sameEpochOtherSite === first, 'Equivalent projections inside one checker epoch should converge canonically.');

  const disposal = store.disposeSince(marker);
  expect(disposal.productDetails === 1, 'Disposing the answer-local marker should remove the projected type detail.');
  expect(disposal.hotDetails === 2, 'Disposing the answer-local marker should remove hot member details for the projected type.');
  expect(store.productDetails.size === 0, 'Product details should be empty after marker disposal.');

  const second = projector.ensureProjection({
    localKey: 'foo',
    checker: fixture.checker,
    type: fixture.type,
    sourceNode: fixture.sourceNode,
  });
  expect(second !== first, 'Reprojecting after disposal should materialize a fresh type detail, not reuse a stale object.');
  expect(second.productHandle === first.productHandle, 'Reprojecting the same local key should reuse the stable product handle after disposal.');
  expect(store.productDetails.size === 1, 'Fresh projection should attach a new product detail after disposal.');
}

function verifyCheckerEpochsDoNotShareHotProjections() {
  const firstFixture = createCheckerFixture('export interface Foo { bar: string; baz: number; }');
  const secondFixture = createCheckerFixture('export interface Foo { bar: string; baz: number; }');
  const store = new KernelStore('contract-type-projection-epochs');
  const projector = new CheckerTypeProjector(store, store);
  const first = projector.ensureProjection({
    localKey: 'same-site',
    checker: firstFixture.checker,
    type: firstFixture.type,
    sourceNode: firstFixture.sourceNode,
  });
  const second = projector.ensureProjection({
    localKey: 'same-site',
    checker: secondFixture.checker,
    type: secondFixture.type,
    sourceNode: secondFixture.sourceNode,
  });

  expect(first !== second, 'Distinct TypeChecker epochs must not reuse one hot type-shape object.');
  expect(first.productHandle !== second.productHandle, 'Distinct TypeChecker epochs must own distinct product handles.');
  expect(first.checkerKey !== second.checkerKey, 'Checker keys must carry the owning Program epoch.');
  expect(first.carrier?.checker === firstFixture.checker, 'First projection must retain the first checker carrier.');
  expect(second.carrier?.checker === secondFixture.checker, 'Second projection must retain the second checker carrier.');
}

function verifySyntheticArrayMembersAreOwnedHotDetails() {
  const store = new KernelStore('contract-synthetic-array-member-ownership');
  const projector = new CheckerTypeProjector(store, store);
  const element = projector.ensureSyntheticProjection({
    localKey: 'synthetic-array-element',
    shapeKind: CheckerTypeShapeKind.Primitive,
    display: 'string',
    members: [],
    origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
  });
  const array = projector.ensureSyntheticProjection({
    localKey: 'synthetic-array',
    shapeKind: CheckerTypeShapeKind.Object,
    display: 'string[]',
    members: [],
    indexedValueType: element.toReference(),
    indexedAccessKeyKind: CheckerIndexedAccessKeyKind.Number,
    iteratedValueType: element.toReference(),
    origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
  });

  const members = readOrProjectCheckerTypeMembersInProjection(projector, array, array.productHandle);
  const repeatedMembers = readOrProjectCheckerTypeMembersInProjection(projector, array, 'another-caller-local-key');
  expect(members.length > 0, 'Synthetic Array member enumeration should expose the runtime Array surface.');
  expect(
    repeatedMembers.map((member) => member.detailHandle).join('\n')
      === members.map((member) => member.detailHandle).join('\n'),
    'Synthetic Array member handles should derive from owner shape and member name, not caller-local seeds.',
  );
  expect(
    store.hotDetails.readEntries().filter((entry) => entry.slot === TypeSystemHotDetails.TypeMember).length
      === members.length,
    'Repeated enumeration of one synthetic Array owner should not duplicate its member hot details.',
  );
  for (const member of members) {
    const entry = store.hotDetails.readEntry(member.detailHandle);
    expect(
      store.hotDetails.read(TypeSystemHotDetails.TypeMember, member.detailHandle) === member,
      `Synthetic Array member ${member.name} should be admitted to the TypeMember hot-detail slot.`,
    );
    expect(
      entry?.ownerProductHandle === array.productHandle,
      `Synthetic Array member ${member.name} should be owned by its Array type-shape product.`,
    );
  }
}

function createCheckerFixture(sourceText = 'export interface Foo { bar: string; baz: number; }') {
  const fileName = 'contract-type-projection.ts';
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
  registerIsolatedCheckerDeclarationSourceContext(checker, 'contract-type-projection-lifetime');
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

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}
