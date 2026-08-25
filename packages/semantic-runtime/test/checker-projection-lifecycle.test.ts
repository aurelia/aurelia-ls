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
import { CheckerRuntimeObjectMemberAdmissionKind } from '../src/type-system/checker-related-types.js';
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
import {
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
} from '../src/type-system/type-shape.js';

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

  test('classifies runtime object/member guards across unions and weak shapes', () => {
    const { checker, declaration } = checkerFixture(`
      class Base {
        get title(): string {
          return 'inherited';
        }
      }
      const viewModel = null as unknown as {
        required: { title: string; count: number };
        nullable: { title: string } | null;
        union: { title: string } | { count: number };
        optional: { title?: string };
        indexed: { [key: string]: string };
        primitive: number;
        dynamic: unknown;
        callable: (() => void) & { title: string };
        constructable: typeof Base;
        inherited: Base;
        structural: { title: string };
      };
    `);
    const store = new KernelStore('checker-runtime-object-member-admission');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const run = lifecycle.begin(locus('runtime-object-member-admission'));
    const projector = new CheckerTypeProjector(store, run);
    const access = new CheckerTypeShapeAccess(store, projector);
    const root = projector.ensureProjection({
      localKey: 'view-model',
      checker,
      type: checker.getTypeAtLocation(declaration.name),
      sourceNode: declaration,
    });
    const owner = (name: string) => {
      const shape = access.memberValueType(root, name, `view-model:${name}`);
      expect(shape).not.toBeNull();
      return shape!;
    };
    const guarded = (name: string, memberName = 'title') =>
      access.runtimeObjectMemberValueAccess(owner(name), memberName, `view-model:${name}:${memberName}`);

    const requiredTitle = guarded('required');
    expect(requiredTitle.admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Guaranteed);
    expect(requiredTitle.valueType?.display).toBe('string');
    expect(requiredTitle.memberKind).toBe(CheckerTypeMemberKind.Property);
    expect(requiredTitle.memberSourceAddressHandle).not.toBeNull();
    const nullableTitle = guarded('nullable');
    expect(nullableTitle.admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Conditional);
    expect(nullableTitle.valueType?.display).toBe('string');
    expect(nullableTitle.memberKind).toBe(CheckerTypeMemberKind.Property);
    expect(nullableTitle.memberSourceAddressHandle).not.toBeNull();
    expect(guarded('union').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Open);
    expect(guarded('union').valueType?.display).toBe('unknown');
    expect(guarded('union').memberSourceAddressHandle).toBeNull();
    expect(guarded('union', 'tone').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Open);
    expect(guarded('union', 'tone').valueType?.display).toBe('unknown');
    expect(guarded('optional').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Conditional);
    expect(guarded('optional', 'tone').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Open);
    expect(guarded('indexed').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Conditional);
    expect(guarded('indexed').valueType?.display).toBe('string');
    expect(guarded('primitive').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Impossible);
    expect(guarded('dynamic').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Open);
    expect(guarded('callable').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Impossible);
    expect(guarded('constructable').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Impossible);
    expect(guarded('inherited').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Guaranteed);
    expect(guarded('inherited', 'count').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Open);
    expect(guarded('structural', 'count').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Open);

    const exactObjectLiteral = projector.ensureSyntheticProjection({
      localKey: 'exact-object-literal',
      shapeKind: CheckerTypeShapeKind.Object,
      display: '{ title: unknown }',
      members: [{
        name: 'title',
        valueType: null,
        memberKind: CheckerTypeMemberKind.Property,
      }],
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
    });
    expect(access.runtimeObjectMemberValueAccess(
      exactObjectLiteral,
      'count',
      'exact-object-literal:count',
    ).admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Impossible);

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
  });

  test('classifies broad standard-library function and object interfaces by runtime identity', () => {
    const { checker, declaration } = checkerFixture(`
      const viewModel = null as unknown as {
        broadFunction: Function;
        callableInterface: CallableFunction;
        newableInterface: NewableFunction;
        broadObject: Object;
      };
    `, 'checker-standard-library-runtime-identity', projectTypeSystemProgramSources, true);
    const store = new KernelStore('checker-standard-library-runtime-identity');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const run = lifecycle.begin(locus('standard-library-runtime-identity'));
    const projector = new CheckerTypeProjector(store, run);
    const access = new CheckerTypeShapeAccess(store, projector);
    const root = projector.ensureProjection({
      localKey: 'view-model',
      checker,
      type: checker.getTypeAtLocation(declaration.name),
      sourceNode: declaration,
    });
    const guarded = (name: string, memberName = 'title') => {
      const owner = access.memberValueType(root, name, `view-model:${name}`);
      expect(owner).not.toBeNull();
      return access.runtimeObjectMemberValueAccess(
        owner!,
        memberName,
        `view-model:${name}:${memberName}`,
      );
    };

    expect(guarded('broadFunction', 'name').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Impossible);
    expect(guarded('callableInterface', 'name').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Impossible);
    expect(guarded('newableInterface', 'name').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Impossible);
    expect(guarded('broadObject').admissionKind).toBe(CheckerRuntimeObjectMemberAdmissionKind.Open);

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
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
  includeDefaultLibrary = false,
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
  const options: ts.CompilerOptions = {
    noLib: !includeDefaultLibrary,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const compilerHost = ts.createCompilerHost(options);
  const fileExists = compilerHost.fileExists.bind(compilerHost);
  const readFile = compilerHost.readFile.bind(compilerHost);
  const getSourceFile = compilerHost.getSourceFile.bind(compilerHost);
  compilerHost.fileExists = (candidate) =>
    path.resolve(candidate) === fileName || (includeDefaultLibrary && fileExists(candidate));
  compilerHost.readFile = (candidate) =>
    path.resolve(candidate) === fileName ? sourceText : includeDefaultLibrary ? readFile(candidate) : undefined;
  compilerHost.getSourceFile = (candidate, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(candidate) === fileName
      ? sourceFile
      : includeDefaultLibrary
        ? getSourceFile(candidate, languageVersion, onError, shouldCreateNewSourceFile)
        : undefined;
  const program = ts.createProgram({
    rootNames: [fileName],
    options,
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
