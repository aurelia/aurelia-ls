import path from 'node:path';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  ComputationCommitState,
  ComputationLifecycleRegistry,
  type ComputationLocus,
} from '../src/kernel/computation-lifecycle.js';
import { KernelStore } from '../src/kernel/store.js';
import { CheckerTypeProjector } from '../src/type-system/checker-projector.js';
import { CheckerTypeShapeAccess } from '../src/type-system/checker-type-shape-access.js';
import { TypeSystemProductDetails } from '../src/type-system/product-details.js';

describe('checker projection lifecycle', () => {
  test('resolves newly projected nested shapes inside one staged generation', () => {
    const { checker, declaration } = checkerFixture(`
      const viewModel = {
        item: { label: 'Featured' },
      };
    `);
    const store = new KernelStore('checker-projection-staged-generation');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const run = lifecycle.begin(locus('staged-nested-shapes'));
    const projector = new CheckerTypeProjector(store, run);
    const access = new CheckerTypeShapeAccess(store, projector);
    const root = projector.ensureProjection({
      localKey: 'view-model',
      checker,
      type: checker.getTypeAtLocation(declaration.name),
      sourceNode: declaration,
    });

    expect(store.readProductDetail(TypeSystemProductDetails.TypeShape, root.productHandle)).toBeNull();
    expect(access.resolveReference(root.toReference())).toBe(root);

    const item = access.memberValueType(root, 'item', 'view-model:item');
    expect(item).not.toBeNull();
    expect(item == null ? null : access.resolveReference(item.toReference())).toBe(item);
    expect(item == null ? null : access.memberValueType(item, 'label', 'view-model:item:label')?.display)
      .toMatch(/Featured|string/u);

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.readProductDetail(TypeSystemProductDetails.TypeShape, root.productHandle)).toBe(root);
  });
});

function locus(owner: string): ComputationLocus {
  return {
    kind: 'template-analysis',
    reconciliationKey: `project:test|owner:${owner}|cohort:app-root:default|role:app`,
    summary: owner,
  };
}

function checkerFixture(sourceText: string): {
  readonly checker: ts.TypeChecker;
  readonly declaration: ts.VariableDeclaration;
} {
  const fileName = path.resolve('checker-projection-lifecycle.ts');
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const compilerHost = ts.createCompilerHost({ noLib: true, strict: true });
  compilerHost.fileExists = (candidate) => path.resolve(candidate) === fileName;
  compilerHost.readFile = (candidate) => path.resolve(candidate) === fileName ? sourceText : undefined;
  compilerHost.getSourceFile = (candidate) => path.resolve(candidate) === fileName ? sourceFile : undefined;
  const program = ts.createProgram({
    rootNames: [fileName],
    options: { noLib: true, strict: true },
    host: compilerHost,
  });
  const statement = sourceFile.statements[0];
  if (!ts.isVariableStatement(statement)) {
    throw new Error('Expected checker fixture variable statement.');
  }
  const declaration = statement.declarationList.declarations[0];
  if (declaration == null || !ts.isIdentifier(declaration.name)) {
    throw new Error('Expected checker fixture identifier declaration.');
  }
  return { checker: program.getTypeChecker(), declaration };
}
