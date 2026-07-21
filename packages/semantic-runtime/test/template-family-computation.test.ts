import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  ComputationCommitState,
  computationProductDetailReadKey,
  computationRecordReadKey,
} from '../src/kernel/computation-lifecycle.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeProjectInputScope,
} from '../src/kernel/project-input.js';
import { SourceTextSnapshotAuthority } from '../src/kernel/source-text-snapshot.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import { CustomAttributeDefinition } from '../src/resources/custom-attribute-definition.js';
import { TemplateCompilerFrameworkErrorCode } from '../src/template/framework-error-code.js';
import {
  TemplateCompilerReadObservation,
  TemplateCompilerReadKind,
  TemplateCompilerScopeClosureState,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import {
  TemplateResourceResolverService,
  TemplateResourceScope,
} from '../src/template/compiler-world.js';
import { TemplateCompilerWorldEmission } from '../src/template/compiler-world-materializer.js';
import { TemplateVisibleResource } from '../src/template/compiler-world-reference.js';
import {
  TemplateCompilationCohort,
  TemplateCompilationCohortKind,
  TemplateCompilationLocus,
  TemplateCompilationCohortSetAuthority,
} from '../src/template/template-compilation-cohort.js';
import {
  TemplateCompilationComputationRequest,
  TemplateCompilationComputationService,
  type TemplateCompilationComputationAttempt,
} from '../src/template/template-compilation-computation.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import { resourceLocalRuntimeBindings } from '../src/template/runtime-resource-ownership.js';

class MutableTemplateSourceProvider {
  private readonly sourceTextByFileName = new Map<string, string>();
  failReads = false;

  write(fileName: string, sourceText: string): void {
    this.sourceTextByFileName.set(path.resolve(fileName), sourceText);
  }

  readFile(fileName: string): string | undefined {
    if (this.failReads) {
      throw new Error('Injected source-provider failure.');
    }
    return this.sourceTextByFileName.get(path.resolve(fileName));
  }

  fileExists(fileName: string): boolean {
    return this.sourceTextByFileName.has(path.resolve(fileName));
  }
}

function mutableSourceSnapshotAuthority(
  project: SemanticRuntimeProjectInputScope,
  sourceProvider: MutableTemplateSourceProvider,
): SourceTextSnapshotAuthority {
  const inputAuthority = new SemanticRuntimeProjectInputAuthority(
    new NodeSemanticRuntimeProjectInputHost(sourceProvider),
  );
  return new SourceTextSnapshotAuthority(inputAuthority.capture(project));
}

describe('template family computation', () => {
  test('consumes the complete cohort authority published by the production project pass', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templateFileName = path.join(fixtureRoot, 'src/app.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-family-computation:project-cohort-authority',
    });
    const app = await runtime.openApp();
    const baseline = app.emission.templates.resources[0]?.compilation;
    if (baseline == null) {
      throw new Error('Expected the fixture app template to be compiled.');
    }

    const cohorts = app.emission.templateCohorts.cohortSetFor(baseline.definition);
    expect(cohorts.current().map((cohort) => cohort.analysisContextProductHandle)).toEqual([
      baseline.analysisContextProductHandle,
    ]);
    const sourceProvider = new MutableTemplateSourceProvider();
    sourceProvider.write(templateFileName, readFileSync(templateFileName, 'utf8'));
    const compiler = new TemplateCompilationComputationService(
      runtime.workspace.store,
      runtime.computationLifecycle,
      mutableSourceSnapshotAuthority(app.project, sourceProvider),
      runtime.frameworkSupport,
    );
    const attempt = compiler.prepare(new TemplateCompilationComputationRequest(
      app.project.projectKey,
      app.project.rootDir,
      cohorts,
      baseline.definition,
    ));

    expect(compilationNames(attempt)).toEqual(['app']);
    expect(attempt.commit().commit.state).toBe(ComputationCommitState.Committed);
  }, 30_000);

  test('reconciles recursive local-template families by authored identity across complete cohort sets', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templateFileName = path.join(fixtureRoot, 'src/app.html');
    const originalText = readFileSync(templateFileName, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-family-computation',
    });
    const app = await runtime.openApp();
    const baseline = app.emission.templates.resources[0]?.compilation;
    expect(baseline).toBeDefined();
    if (baseline == null) {
      throw new Error('Expected the fixture app template to be compiled.');
    }

    const store = runtime.workspace.store;
    const lifecycle = runtime.computationLifecycle;
    const sourceProvider = new MutableTemplateSourceProvider();
    const compilerWorldAuthority = TemplateCompilerWorldAuthority.fixed(baseline.parentCompilerWorld);
    const appCohort = new TemplateCompilationCohort(
      TemplateCompilationCohortKind.App,
      baseline.analysisContextProductHandle,
      baseline.appRootDefinitionProductHandle,
      compilerWorldAuthority,
    );
    const authoringCohort = new TemplateCompilationCohort(
      TemplateCompilationCohortKind.Authoring,
      baseline.parentCompilerWorld.world.productHandle,
      null,
      compilerWorldAuthority,
    );
    let currentCohorts: readonly TemplateCompilationCohort[] = [appCohort];
    const request = new TemplateCompilationComputationRequest(
      app.project.projectKey,
      app.project.rootDir,
      new TemplateCompilationCohortSetAuthority(() => currentCohorts),
      baseline.definition,
    );
    const compiler = new TemplateCompilationComputationService(
      store,
      lifecycle,
      mutableSourceSnapshotAuthority(app.project, sourceProvider),
      runtime.frameworkSupport,
    );
    const unrelatedBaselineProduct = store.read(baseline.compiledTemplate.compiledTemplate.productHandle);

    sourceProvider.write(templateFileName, originalText);
    const initial = compiler.prepare(request);
    expect(initial.commit().commit.state).toBe(ComputationCommitState.Committed);

    const directFamily = localTemplateFamilyMarkup('local-icon', true, false);
    sourceProvider.write(templateFileName, directFamily);
    const familyAttempt = compiler.prepare(request);
    expect(compilationNames(familyAttempt)).toEqual(['app', 'local-chip', 'local-icon', 'nested-local']);
    const firstFamily = compilationsByName(familyAttempt);
    const localChip = firstFamily.get('local-chip')!;
    const localIcon = firstFamily.get('local-icon')!;
    const nestedLocal = firstFamily.get('nested-local')!;
    const familyOwnerHandle = baseline.definition.identityHandle ?? baseline.definition.productHandle;
    expect(familyOwnerHandle).not.toBeNull();
    expect(familyAttempt.candidateCompilations.every(
      (compilation) => compilation.familyOwnerHandle === familyOwnerHandle,
    )).toBe(true);
    expect(store.read(localChip.definition.productHandle!)).toBeNull();
    expect(store.productDetails.read(ResourceProductDetails.Definition, localChip.definition.productHandle!)).toBeNull();
    const localReads = familyAttempt.candidateCompilations.flatMap((compilation) =>
      compilation.registeredReads.filter((read): read is TemplateCompilerReadObservation =>
        read instanceof TemplateCompilerReadObservation
      )
    );
    const localResourceReads = localReads.filter((read) =>
      ['local-chip', 'local-icon', 'nested-local'].includes(read.canonicalKey)
    );
    expect(localResourceReads.length).toBeGreaterThan(0);
    expect(localResourceReads.every((read) => read.closure.state === TemplateCompilerScopeClosureState.Closed))
      .toBe(true);
    const family = familyAttempt.commit();
    expect(family.commit.state).toBe(ComputationCommitState.Committed);
    const familyLocus = new TemplateCompilationLocus(app.project.projectKey, familyOwnerHandle!);
    const familyState = lifecycle.readState(familyAttempt.computationId)?.children.find((child) =>
      child.locus.kind === familyLocus.kind
      && child.locus.reconciliationKey === familyLocus.reconciliationKey
    );
    expect(familyState?.outputs.some((output) => output.handle === nestedLocal.unit.compilationUnit.productHandle))
      .toBe(true);
    expect(store.read(localChip.definition.productHandle!)).not.toBeNull();
    expect(store.productDetails.read(ResourceProductDetails.Definition, localChip.definition.productHandle!))
      .toBe(localChip.definition);
    expect(store.read(baseline.compiledTemplate.compiledTemplate.productHandle)).toBe(unrelatedBaselineProduct);

    sourceProvider.write(templateFileName, localTemplateFamilyMarkup('local-icon', true, true));
    const reorderedAttempt = compiler.prepare(request);
    const reordered = compilationsByName(reorderedAttempt);
    expect(stableCompilationHandles(reordered.get('local-chip')!)).toEqual(stableCompilationHandles(localChip));
    expect(stableCompilationHandles(reordered.get('local-icon')!)).toEqual(stableCompilationHandles(localIcon));
    expect(stableCompilationHandles(reordered.get('nested-local')!)).toEqual(stableCompilationHandles(nestedLocal));
    const reorder = reorderedAttempt.commit();
    expect(reorder.commit.state).toBe(ComputationCommitState.Committed);
    for (const handle of [
      localChip.definition.productHandle!,
      localIcon.definition.productHandle!,
      nestedLocal.definition.productHandle!,
    ]) {
      expect(reorder.commit.transition.publications).not.toContainEqual(expect.objectContaining({
        handle,
        decision: KernelPublicationDecisionKind.Publish,
      }));
      expect(reorder.commit.transition.publications).not.toContainEqual(expect.objectContaining({
        handle,
        decision: KernelPublicationDecisionKind.Withdraw,
      }));
    }
    expect(reorder.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: localChip.definition.sourceAddressHandle,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));

    sourceProvider.write(templateFileName, localTemplateFamilyMarkup('local-glyph', true, false));
    const staleRename = compiler.prepare(request);
    sourceProvider.write(templateFileName, localTemplateFamilyMarkup('local-mark', true, false));
    const winningRename = compiler.prepare(request);
    const winningRenameCompilations = compilationsByName(winningRename);
    const localMark = winningRenameCompilations.get('local-mark')!;
    const renamedNestedLocal = winningRenameCompilations.get('nested-local')!;
    const winningRenameResult = winningRename.commit();
    expect(winningRenameResult.commit.state).toBe(ComputationCommitState.Committed);
    expect(staleRename.commit().commit.state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.read(localIcon.definition.productHandle!)).toBeNull();
    expect(store.read(localMark.definition.productHandle!)).not.toBeNull();
    expect(winningRenameResult.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: nestedLocal.definition.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    sourceProvider.write(templateFileName, localTemplateFamilyMarkup('local-mark', false, false));
    const withoutNestedAttempt = compiler.prepare(request);
    const withoutNested = compilationsByName(withoutNestedAttempt);
    expect(withoutNested.has('nested-local')).toBe(false);
    expect(withoutNested.get('local-chip')?.definition.productHandle).toBe(localChip.definition.productHandle);
    const withoutNestedResult = withoutNestedAttempt.commit();
    expect(withoutNestedResult.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: renamedNestedLocal.definition.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    sourceProvider.write(templateFileName, localTemplateFamilyMarkup(null, false, false));
    const missingSiblingAttempt = compiler.prepare(request);
    const missingSibling = compilationsByName(missingSiblingAttempt);
    expect(missingSibling.has('local-mark')).toBe(false);
    expect(missingSibling.get('local-chip')?.registeredReads).toContainEqual(expect.objectContaining({
      canonicalKey: 'local-mark',
      resultParts: [],
    }));
    expect(missingSiblingAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
    expect(store.read(localMark.definition.productHandle!)).toBeNull();

    sourceProvider.write(templateFileName, directFamily);
    expect(compiler.prepare(request).commit().commit.state).toBe(ComputationCommitState.Committed);
    const stateBeforeFailure = lifecycle.readState(initial.computationId)!;
    const retainedDefinition = store.productDetails.read(
      ResourceProductDetails.Definition,
      localChip.definition.productHandle!,
    );
    sourceProvider.failReads = true;
    expect(() => compiler.prepare(request)).toThrow('Injected source-provider failure');
    sourceProvider.failReads = false;
    expect(lifecycle.readState(initial.computationId)).toBe(stateBeforeFailure);
    expect(store.productDetails.read(ResourceProductDetails.Definition, localChip.definition.productHandle!))
      .toBe(retainedDefinition);

    currentCohorts = [authoringCohort, appCohort];
    const crossCohortAttempt = compiler.prepare(request);
    const appLocalChip = compilationFor(crossCohortAttempt, 'local-chip', true);
    const authoringLocalChip = compilationFor(crossCohortAttempt, 'local-chip', false);
    expect(appLocalChip.definition.productHandle).toBe(authoringLocalChip.definition.productHandle);
    expect(appLocalChip.unit.compilationUnit.productHandle).not.toBe(authoringLocalChip.unit.compilationUnit.productHandle);
    expect(appLocalChip.unit.templateSource.sourceAddressHandle)
      .toBe(authoringLocalChip.unit.templateSource.sourceAddressHandle);
    const crossCohort = crossCohortAttempt.commit();
    expect(crossCohort.commit.state).toBe(ComputationCommitState.Committed);
    expect(lifecycle.readState(initial.computationId)?.reads).toContainEqual(expect.objectContaining({
      domain: 'template-compilation-cohorts',
    }));

    currentCohorts = [appCohort];
    const appOnlyAttempt = compiler.prepare(request);
    const retainedAppLocalChip = compilationFor(appOnlyAttempt, 'local-chip', true);
    const appOnly = appOnlyAttempt.commit();
    expect(appOnly.commit.state).toBe(ComputationCommitState.Committed);
    expect(store.read(authoringLocalChip.unit.compilationUnit.productHandle)).toBeNull();
    expect(store.read(retainedAppLocalChip.definition.productHandle!)).not.toBeNull();
    expect(store.read(retainedAppLocalChip.unit.compilationUnit.productHandle)).not.toBeNull();

    const staleCohortSet = compiler.prepare(request);
    currentCohorts = [appCohort, authoringCohort];
    const rejectedCohortSet = staleCohortSet.commit();
    expect(rejectedCohortSet.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(rejectedCohortSet.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'template-compilation-cohorts',
      changedFacets: ['membership'],
    }));
    currentCohorts = [appCohort];

    sourceProvider.write(templateFileName, duplicateLocalTemplateMarkup());
    const invalidAttempt = compiler.prepare(request);
    expect(compilationNames(invalidAttempt)).toEqual(['app']);
    expect(invalidAttempt.candidateCompilations[0]?.compiledTemplate.issues).toContainEqual(expect.objectContaining({
      frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerDuplicateLocalName,
    }));
    const invalid = invalidAttempt.commit();
    expect(invalid.commit.state).toBe(ComputationCommitState.Committed);
    expect(invalid.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: retainedAppLocalChip.definition.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));
    expect(store.read(baseline.compiledTemplate.compiledTemplate.productHandle)).toBe(unrelatedBaselineProduct);
  }, 30_000);

  test('rejects a prepared family when only a local child dependency changes', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templateFileName = path.join(fixtureRoot, 'src/app.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-family-computation:child-read',
    });
    const app = await runtime.openApp();
    const baseline = app.emission.templates.resources[0]?.compilation;
    if (baseline == null) {
      throw new Error('Expected the fixture app template to be compiled.');
    }

    let currentCompilerWorld = baseline.parentCompilerWorld;
    const compilerWorldAuthority = new TemplateCompilerWorldAuthority(() => currentCompilerWorld);
    const store = runtime.workspace.store;
    const lifecycle = runtime.computationLifecycle;
    const sourceProvider = new MutableTemplateSourceProvider();
    const compiler = new TemplateCompilationComputationService(
      store,
      lifecycle,
      mutableSourceSnapshotAuthority(app.project, sourceProvider),
      runtime.frameworkSupport,
    );
    const request = new TemplateCompilationComputationRequest(
      app.project.projectKey,
      app.project.rootDir,
      TemplateCompilationCohortSetAuthority.fixed(new TemplateCompilationCohort(
        TemplateCompilationCohortKind.App,
        baseline.analysisContextProductHandle,
        baseline.appRootDefinitionProductHandle,
        compilerWorldAuthority,
      )),
      baseline.definition,
    );
    sourceProvider.write(templateFileName, `<template>
  <template as-custom-element="local-child">
    <div if.bind="title">\${title}</div>
  </template>
  <local-child></local-child>
</template>
`);

    const attempt = compiler.prepare(request);
    const localChild = compilationsByName(attempt).get('local-child')!;
    const childIfRead = localChild.registeredReads.find((read) =>
      read instanceof TemplateCompilerReadObservation
      && read.readKind === TemplateCompilerReadKind.Bindables
    );
    expect(childIfRead).toBeDefined();
    const ifResource = currentCompilerWorld.resourceResolver.resources.find((resource) =>
      resource.name === 'if' && resource.definition instanceof CustomAttributeDefinition
    );
    if (!(ifResource?.definition instanceof CustomAttributeDefinition)) {
      throw new Error('Expected the RuntimeHtml if template controller in the compiler world.');
    }
    const changedIf = customAttributeDefinitionWithoutBindables(ifResource.definition);
    currentCompilerWorld = compilerWorldWithDefinition(currentCompilerWorld, ifResource.definition, changedIf);

    const result = attempt.commit();
    expect(result.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(result.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'template-compiler',
      readKey: childIfRead?.readKey,
      changedFacets: expect.arrayContaining(['result']),
    }));
    expect(store.read(localChild.definition.productHandle!)).toBeNull();
  }, 30_000);

  test('keeps recursively rendered child bindings out of their authored parent resource', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-registration-local-templates');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-family-computation:runtime-ownership',
    });
    const app = await runtime.openApp();
    const store = runtime.workspace.store;
    const parent = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'local-templates-app'
    );
    if (parent == null) {
      throw new Error('Expected the local-template fixture family to be runtime analyzed.');
    }
    const familyLocalKeyPrefix = `${parent.compilation.localKey}:local-template:`;
    const localResources = app.emission.templates.resources.filter((resource) =>
      resource.compilation.localKey.startsWith(familyLocalKeyPrefix)
    );
    expect(localResources.map((resource) => resource.compilation.definition.name).sort()).toEqual([
      'local-chip',
      'local-icon',
      'nested-local',
      'outer-local',
    ]);
    expect(localResources.every(
      (resource) => resource.compilation.familyOwnerHandle === parent.compilation.familyOwnerHandle,
    )).toBe(true);
    const outerLocal = localResources.find((resource) => resource.compilation.definition.name === 'outer-local');
    const nestedLocal = localResources.find((resource) => resource.compilation.definition.name === 'nested-local');
    expect(nestedLocal?.compilation.localKey).toBe(
      `${outerLocal?.compilation.localKey}:local-template:nested-local`,
    );
    const generation = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
    const familyLocus = new TemplateCompilationLocus(
      app.project.projectKey,
      parent.compilation.familyOwnerHandle,
    );
    const family = generation == null
      ? null
      : runtime.computationLifecycle.readState(generation.computationId)?.children.find((child) =>
          child.locus.kind === familyLocus.kind
          && child.locus.reconciliationKey === familyLocus.reconciliationKey
        ) ?? null;
    expect(family).not.toBeNull();
    expect(family?.outputs.map((output) => output.handle)).toEqual(expect.arrayContaining(
      localResources.map((resource) => resource.compilation.unit.compilationUnit.productHandle),
    ));
    const remainder = generation == null
      ? null
      : runtime.computationLifecycle.readState(generation.computationId)?.children.find(
          (child) => child.locus.kind === 'computation-remainder',
        ) ?? null;
    expect(remainder).not.toBeNull();
    const familyOutputKeys = new Set(family?.outputs.map((output) => output.readKey));
    const remainderReadKeys = new Set([
      ...(remainder?.reads ?? []).map((read) => read.readKey),
      ...(remainder?.candidateReads ?? []).map((read) => read.readKey),
    ]);
    const familyResources = [parent, ...localResources];
    const runtimeInputHandles = familyResources.flatMap((resource) => [
      ...(resource.compilation.definition.productHandle == null
        ? []
        : [resource.compilation.definition.productHandle]),
      resource.compilation.compiledTemplate.compiledTemplate.productHandle,
      ...resource.compilation.compiledTemplate.renderTargets.map((target) => target.productHandle),
      ...resource.compilation.compiledTemplate.instructionSequences.map((sequence) => sequence.productHandle),
      ...resource.compilation.compiledTemplate.instructions.map((instruction) => instruction.productHandle),
      resource.compilation.compilerWorld.world.productHandle,
      resource.compilation.compilerWorld.resourceScope.productHandle,
      resource.compilation.compilerWorld.rendering.productHandle,
      resource.compilation.compilerWorld.templateCompiler.productHandle,
      resource.compilation.compilerWorld.resourceResolver.productHandle,
      resource.compilation.compilerWorld.expressionParser.productHandle,
      resource.compilation.compilerWorld.attributeMapper.productHandle,
      resource.compilation.compilerWorld.bindingCommandResolver.productHandle,
      ...resource.compilation.authoredAttributeSyntaxes.map((syntax) => syntax.productHandle),
    ]);
    const familyOwnedRuntimeInputKeys = runtimeInputHandles
      .flatMap((handle) => [computationRecordReadKey(handle), computationProductDetailReadKey(handle)])
      .filter((readKey) => familyOutputKeys.has(readKey));
    expect(familyOwnedRuntimeInputKeys.length).toBeGreaterThan(0);
    expect([...remainderReadKeys]).toEqual(expect.arrayContaining(familyOwnedRuntimeInputKeys));
    for (const resource of localResources) {
      expect(remainderReadKeys).toContain(computationRecordReadKey(resource.compilation.definition.productHandle!));
      expect(remainderReadKeys).toContain(
        computationProductDetailReadKey(resource.compilation.definition.productHandle!),
      );
    }
    const familyOwnedInstructionKeys = familyResources
      .flatMap((resource) => resource.compilation.compiledTemplate.instructions)
      .map((instruction) => computationProductDetailReadKey(instruction.productHandle))
      .filter((readKey) => familyOutputKeys.has(readKey));
    expect(familyOwnedInstructionKeys.length).toBeGreaterThan(0);
    expect([...remainderReadKeys]).toEqual(expect.arrayContaining(familyOwnedInstructionKeys));
    const localWorld = localResources.find((resource) =>
      resource.compilation.compilerWorld !== resource.compilation.parentCompilerWorld
    )?.compilation.compilerWorld ?? null;
    expect(localWorld).not.toBeNull();
    if (localWorld == null) {
      throw new Error('Expected a family-derived compiler world for local templates.');
    }
    expect([...remainderReadKeys]).toEqual(expect.arrayContaining([
      computationRecordReadKey(localWorld.world.productHandle),
      computationProductDetailReadKey(localWorld.world.productHandle),
      computationRecordReadKey(localWorld.resourceScope.productHandle),
      computationProductDetailReadKey(localWorld.resourceScope.productHandle),
    ]));
    const parentBindingHandles = new Set(
      resourceLocalRuntimeBindings(store, parent).map((binding) => binding.productHandle),
    );
    const childBindingHandles = new Set(
      localResources.flatMap((resource) =>
        resourceLocalRuntimeBindings(store, resource).map((binding) => binding.productHandle)
      ),
    );
    expect(parentBindingHandles.size).toBeGreaterThan(0);
    expect(childBindingHandles.size).toBeGreaterThan(0);
    expect([...parentBindingHandles].filter((handle) => childBindingHandles.has(handle))).toEqual([]);
  }, 30_000);
});

function localTemplateFamilyMarkup(
  siblingName: string | null,
  includeNested: boolean,
  reverseOrder: boolean,
): string {
  const siblingUsage = siblingName ?? 'local-mark';
  const chip = `  <template as-custom-element="local-chip">
    <bindable name="label" attribute="public-label"></bindable>
    <${siblingUsage} value.bind="label"></${siblingUsage}>
  </template>`;
  const sibling = siblingName == null
    ? null
    : `  <template as-custom-element="${siblingName}">
    <bindable name="value"></bindable>
${includeNested ? `    <template as-custom-element="nested-local">
      <bindable name="nestedValue" attribute="nested-value"></bindable>
      <em>\${nestedValue}</em>
    </template>
    <nested-local nested-value.bind="value"></nested-local>` : '    <span>\${value}</span>'}
  </template>`;
  const declarations = sibling == null
    ? [chip]
    : reverseOrder ? [sibling, chip] : [chip, sibling];
  return `<template>
${declarations.join('\n\n')}

  <local-chip public-label.bind="title"></local-chip>
  ${siblingName == null ? '' : `<${siblingName} value.bind="title"></${siblingName}>`}
</template>
`;
}

function compilationNames(attempt: TemplateCompilationComputationAttempt): readonly string[] {
  return attempt.candidateCompilations.map((compilation) => compilation.definition.name);
}

function duplicateLocalTemplateMarkup(): string {
  return `<template>
  <template as-custom-element="local-chip"><span>one</span></template>
  <template as-custom-element="local-chip"><span>two</span></template>
  <div>owner content</div>
</template>
`;
}

function compilationsByName(
  attempt: TemplateCompilationComputationAttempt,
): ReadonlyMap<string, TemplateResourceCompilationEmission> {
  return new Map(attempt.candidateCompilations.map((compilation) => [compilation.definition.name, compilation]));
}

function compilationFor(
  attempt: TemplateCompilationComputationAttempt,
  name: string,
  appCohort: boolean,
): TemplateResourceCompilationEmission {
  const compilation = attempt.candidateCompilations.find((candidate) =>
    candidate.definition.name === name
    && (candidate.appRootDefinitionProductHandle != null) === appCohort
  );
  if (compilation == null) {
    throw new Error(`Expected ${appCohort ? 'app' : 'authoring'} compilation for ${name}.`);
  }
  return compilation;
}

function stableCompilationHandles(compilation: TemplateResourceCompilationEmission): object {
  return {
    definition: compilation.definition.productHandle,
    compilationUnit: compilation.unit.compilationUnit.productHandle,
    templateSource: compilation.unit.templateSource.productHandle,
    compiledTemplate: compilation.compiledTemplate.compiledTemplate.productHandle,
  };
}

function customAttributeDefinitionWithoutBindables(
  definition: CustomAttributeDefinition,
): CustomAttributeDefinition {
  return new CustomAttributeDefinition(
    definition.productHandle,
    definition.identityHandle,
    definition.sourceAddressHandle,
    definition.target,
    definition.name,
    definition.aliases,
    definition.key,
    definition.isTemplateController,
    [],
    definition.noMultiBindings,
    definition.watches,
    definition.dependencies,
    definition.containerStrategy,
    definition.defaultProperty,
    definition.contributions,
    definition.fieldProvenance,
    definition.nameSourceAddressHandle,
  );
}

function compilerWorldWithDefinition(
  world: TemplateCompilerWorldEmission,
  previous: CustomAttributeDefinition,
  next: CustomAttributeDefinition,
): TemplateCompilerWorldEmission {
  const replace = (resource: TemplateVisibleResource) =>
    resource.definition === previous
      ? new TemplateVisibleResource(
        resource.resourceKind,
        resource.name,
        resource.aliases,
        resource.resourceProductHandle,
        resource.resourceIdentityHandle,
        resource.definitionProductHandle,
        next,
        resource.visibilityKind,
        resource.sourceAddressHandle,
      )
      : resource;
  return new TemplateCompilerWorldEmission(
    world.container,
    world.world,
    new TemplateResourceScope(
      world.resourceScope.productHandle,
      world.resourceScope.identityHandle,
      world.resourceScope.container,
      world.resourceScope.resources.map(replace),
      world.resourceScope.syntaxResources,
      world.resourceScope.sourceAddressHandle,
      world.resourceScope.fieldProvenance,
    ),
    world.templateCompiler,
    new TemplateResourceResolverService(
      world.resourceResolver.productHandle,
      world.resourceResolver.identityHandle,
      world.resourceResolver.container,
      world.resourceResolver.resources.map(replace),
      world.resourceResolver.sourceAddressHandle,
      world.resourceResolver.fieldProvenance,
    ),
    world.expressionParser,
    world.attributeMapper,
    world.rendering,
    world.attributeParser,
    world.attributeParserMachine,
    world.bindingCommandResolver,
    world.attributePatterns,
    world.bindingCommands,
    world.runtimeRenderers,
    world.issues,
    world.syntaxResources,
    world.records,
  );
}
