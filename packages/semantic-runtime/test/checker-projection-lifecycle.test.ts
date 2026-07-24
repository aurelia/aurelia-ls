import path from 'node:path';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  BindingContextKind,
  BindingScopeBindingContextConstruction,
  BindingScopeConstructionRequest,
  BindingScopeOwnerKind,
} from '../src/configuration/scope.js';
import { BindingScopeMaterializer } from '../src/configuration/scope-materializer.js';
import { ConfigurationProductDetails } from '../src/configuration/product-details.js';
import {
  ComputationCommitState,
  ComputationLifecycleRegistry,
  type ComputationLocus,
} from '../src/kernel/computation-lifecycle.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import { KernelStore } from '../src/kernel/store.js';
import { SourceSpanRole } from '../src/kernel/address.js';
import { CheckerTypeProjector } from '../src/type-system/checker-projector.js';
import { CheckerTypeShapeAccess } from '../src/type-system/checker-type-shape-access.js';
import {
  CheckerDeclarationSourceContext,
  registerCheckerDeclarationSourceContext,
  sourceSpanForCheckerNode,
} from '../src/type-system/declaration-source.js';
import {
  projectTypeSystemProgramSources,
  TypeSystemProgramSourceAuthority,
  type TypeSystemProgramSourceCatalog,
} from '../src/type-system/program-source-authority.js';
import { TypeSystemProductDetails } from '../src/type-system/product-details.js';

describe('checker projection lifecycle', () => {
  test('keeps semantic handles stable while replacing fresh Program carriers atomically', () => {
    const sourceText = `const viewModel = { item: 'Featured' };`;
    const store = new KernelStore('checker-projection-stable-carrier');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const programSources = new TypeSystemProgramSourceAuthority(
      store,
      lifecycle,
      'checker-projection-stable-carrier',
    );
    const firstFixture = checkerFixture(sourceText, 'stable-projection-project', programSources);
    const firstRun = lifecycle.begin(locus('stable-carrier'));
    const first = new CheckerTypeProjector(store, firstRun).ensureProjection({
      localKey: 'view-model',
      checker: firstFixture.checker,
      type: firstFixture.checker.getTypeAtLocation(firstFixture.declaration.name),
      sourceNode: firstFixture.declaration,
    });
    const firstMember = first.members.find((member) => member.name === 'item') ?? null;
    expect(firstMember).not.toBeNull();
    expect(firstRun.commit().state).toBe(ComputationCommitState.Committed);

    const retainedRun = lifecycle.begin(locus('stable-carrier'));
    const retained = new CheckerTypeProjector(store, retainedRun).ensureProjection({
      localKey: 'view-model',
      checker: firstFixture.checker,
      type: firstFixture.checker.getTypeAtLocation(firstFixture.declaration.name),
      sourceNode: firstFixture.declaration,
    });
    const retainedMember = retained.members.find((member) => member.name === 'item') ?? null;
    expect(retained).not.toBe(first);
    expect(retainedMember).not.toBe(firstMember);
    const retainedCommit = retainedRun.commit();
    expect(retainedCommit.state).toBe(ComputationCommitState.Committed);
    expect(retainedCommit.transition.publications).toContainEqual(expect.objectContaining({
      handle: retained.productHandle,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(retainedCommit.transition.publications).toContainEqual(expect.objectContaining({
      handle: retainedMember?.detailHandle,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(store.readProductDetail(TypeSystemProductDetails.TypeShape, retained.productHandle)).toBe(first);

    const abortedFixture = checkerFixture(sourceText, 'stable-projection-project', programSources);
    const abortedRun = lifecycle.begin(locus('stable-carrier'));
    const aborted = new CheckerTypeProjector(store, abortedRun).ensureProjection({
      localKey: 'view-model',
      checker: abortedFixture.checker,
      type: abortedFixture.checker.getTypeAtLocation(abortedFixture.declaration.name),
      sourceNode: abortedFixture.declaration,
    });
    expect(aborted.productHandle).toBe(first.productHandle);
    expect(aborted.identityHandle).toBe(first.identityHandle);
    expect(aborted.members[0]?.detailHandle).toBe(firstMember?.detailHandle);
    expect(aborted.carrier?.checker).toBe(abortedFixture.checker);
    expect(store.readProductDetail(TypeSystemProductDetails.TypeShape, first.productHandle)).toBe(first);
    abortedRun.abort();
    expect(store.readProductDetail(TypeSystemProductDetails.TypeShape, first.productHandle)).toBe(first);

    const nextFixture = checkerFixture(sourceText, 'stable-projection-project', programSources);
    const nextRun = lifecycle.begin(locus('stable-carrier'));
    const next = new CheckerTypeProjector(store, nextRun).ensureProjection({
      localKey: 'view-model',
      checker: nextFixture.checker,
      type: nextFixture.checker.getTypeAtLocation(nextFixture.declaration.name),
      sourceNode: nextFixture.declaration,
    });
    const nextMember = next.members.find((member) => member.name === 'item') ?? null;
    expect(next.productHandle).toBe(first.productHandle);
    expect(next.identityHandle).toBe(first.identityHandle);
    expect(next.semanticKey).toBe(first.semanticKey);
    expect(nextMember?.detailHandle).toBe(firstMember?.detailHandle);
    expect(next).not.toBe(first);
    expect(nextMember).not.toBe(firstMember);
    expect(next.carrier?.checker).toBe(nextFixture.checker);
    expect(nextMember?.carrier?.checker).toBe(nextFixture.checker);
    const committed = nextRun.commit();
    expect(committed.state).toBe(ComputationCommitState.Committed);
    expect(committed.transition.publications).toContainEqual(expect.objectContaining({
      handle: next.productHandle,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(committed.transition.publications).toContainEqual(expect.objectContaining({
      handle: nextMember?.detailHandle,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.readProductDetail(TypeSystemProductDetails.TypeShape, next.productHandle)).toBe(next);
  });

  test('namespaces equal checker types by logical project rather than Program epoch', () => {
    const sourceText = `const viewModel = { item: 'Featured' };`;
    const firstFixture = checkerFixture(sourceText, 'projection-project-a');
    const secondFixture = checkerFixture(sourceText, 'projection-project-b');
    const store = new KernelStore('checker-projection-project-namespace');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const firstRun = lifecycle.begin(locus('projection-project-a'));
    const first = new CheckerTypeProjector(store, firstRun).ensureProjection({
      localKey: 'view-model',
      checker: firstFixture.checker,
      type: firstFixture.checker.getTypeAtLocation(firstFixture.declaration.name),
      sourceNode: firstFixture.declaration,
    });
    expect(firstRun.commit().state).toBe(ComputationCommitState.Committed);
    const secondRun = lifecycle.begin(locus('projection-project-b'));
    const second = new CheckerTypeProjector(store, secondRun).ensureProjection({
      localKey: 'view-model',
      checker: secondFixture.checker,
      type: secondFixture.checker.getTypeAtLocation(secondFixture.declaration.name),
      sourceNode: secondFixture.declaration,
    });
    expect(second.productHandle).not.toBe(first.productHandle);
    expect(second.identityHandle).not.toBe(first.identityHandle);
    expect(second.semanticKey).not.toBe(first.semanticKey);
    expect(secondRun.commit().state).toBe(ComputationCommitState.Committed);
  });

  test('rejects borrowing a stale hot carrier before its owner refreshes the projection', () => {
    const sourceText = `const viewModel = { item: 'Featured' };`;
    const firstFixture = checkerFixture(sourceText, 'stale-projection-project');
    const nextFixture = checkerFixture(sourceText, 'stale-projection-project');
    const store = new KernelStore('checker-projection-stale-borrow');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const owner = lifecycle.begin(locus('stale-carrier-owner'));
    new CheckerTypeProjector(store, owner).ensureProjection({
      localKey: 'view-model',
      checker: firstFixture.checker,
      type: firstFixture.checker.getTypeAtLocation(firstFixture.declaration.name),
      sourceNode: firstFixture.declaration,
    });
    expect(owner.commit().state).toBe(ComputationCommitState.Committed);

    const borrower = lifecycle.begin(locus('stale-carrier-borrower'));
    expect(() => new CheckerTypeProjector(store, borrower).ensureProjection({
      localKey: 'view-model',
      checker: nextFixture.checker,
      type: nextFixture.checker.getTypeAtLocation(nextFixture.declaration.name),
      sourceNode: nextFixture.declaration,
    })).toThrow('belongs to a different TypeChecker epoch');
    borrower.abort();
  });

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

  test('keeps checker declaration sources and derived scopes inside one staged generation', () => {
    const { checker, declaration } = checkerFixture(`
      const viewModel = {
        item: { label: 'Featured' },
      };
    `);
    const store = new KernelStore('checker-projection-staged-scope-generation');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const run = lifecycle.begin(locus('staged-binding-scope'));
    const projector = new CheckerTypeProjector(store, run);
    const access = new CheckerTypeShapeAccess(store, projector);
    const root = projector.ensureProjection({
      localKey: 'view-model',
      checker,
      type: checker.getTypeAtLocation(declaration.name),
      sourceNode: declaration,
    });
    const scope = new BindingScopeMaterializer(store, projector).construct(new BindingScopeConstructionRequest(
      'view-model-scope',
      BindingScopeOwnerKind.SyntheticView,
      null,
      null,
      null,
      BindingScopeBindingContextConstruction.materialize(
        BindingContextKind.Synthetic,
        root.toReference(),
      ),
      null,
      [],
      true,
      root.sourceAddressHandle,
    )).scope;
    const item = access.memberValueAccess(root, 'item', 'view-model:item');
    const laterSource = sourceSpanForCheckerNode(
      run,
      checker,
      'view-model:later-source',
      declaration,
      SourceSpanRole.Name,
    );

    expect(store.read(scope.productHandle)).toBeNull();
    expect(store.readProductDetail(ConfigurationProductDetails.BindingScope, scope.productHandle)).toBeNull();
    expect(projector.publication.readProductDetail(ConfigurationProductDetails.BindingScope, scope.productHandle))
      .toBe(scope);
    expect(item.memberSourceAddressHandle).not.toBeNull();
    expect(item.memberSourceAddressHandle == null ? null : store.read(item.memberSourceAddressHandle)).toBeNull();
    expect(item.memberSourceAddressHandle == null ? null : projector.publication.read(item.memberSourceAddressHandle))
      .not.toBeNull();
    expect(laterSource.records).toEqual([laterSource.address]);

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.readProductDetail(ConfigurationProductDetails.BindingScope, scope.productHandle)).toBe(scope);
    expect(item.memberSourceAddressHandle == null ? null : store.read(item.memberSourceAddressHandle)).not.toBeNull();
  });
});

function locus(owner: string): ComputationLocus {
  return {
    kind: 'template-analysis',
    reconciliationKey: `project:test|owner:${owner}|cohort:app-root:default|role:app`,
    summary: owner,
  };
}

function checkerFixture(
  sourceText: string,
  projectKey = 'checker-projection-lifecycle',
  programSources: TypeSystemProgramSourceCatalog = projectTypeSystemProgramSources,
): {
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
  const statement = sourceFile.statements.find(ts.isVariableStatement);
  if (!ts.isVariableStatement(statement)) {
    throw new Error('Expected checker fixture variable statement.');
  }
  const declaration = statement.declarationList.declarations[0];
  if (declaration == null || !ts.isIdentifier(declaration.name)) {
    throw new Error('Expected checker fixture identifier declaration.');
  }
  const checker = program.getTypeChecker();
  registerCheckerDeclarationSourceContext(
    checker,
    new CheckerDeclarationSourceContext(projectKey, programSources, new Set()),
  );
  return { checker, declaration };
}
