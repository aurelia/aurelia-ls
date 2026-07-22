import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  SemanticApp,
  SemanticRuntime,
  createSemanticRuntime,
} from '../src/api/runtime.js';
import {
  AureliaAppAnalysisPhase,
  type AureliaAppWorldProjectEmission,
} from '../src/configuration/app-world-project-pass.js';
import {
  ComputationChildTransitionKind,
  ComputationCommitState,
  computationProductDetailReadKey,
  computationRecordReadKey,
  type ComputationChildState,
  type ComputationOutput,
  type ComputationState,
  type ComputationTransition,
} from '../src/kernel/computation-lifecycle.js';
import type { IdentityHandle, ProductHandle } from '../src/kernel/handles.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputReadKind,
} from '../src/kernel/project-input.js';
import { sourceFileAddressForAddress } from '../src/kernel/source-address.js';
import {
  CustomElementDefinition,
  CustomElementTemplateKind,
} from '../src/resources/custom-element-definition.js';
import { BuiltInBindingBehaviorName } from '../src/resources/built-in-resources.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import {
  TemplateCompilerReadKind,
  TemplateCompilerReadObservation,
  TemplateCompilerScopeClosureState,
} from '../src/template/compiler-read-view.js';
import { readVisibleTemplateResourceDefinition } from '../src/template/compiler-resource-lookup.js';
import { TemplateCompilerFrameworkErrorCode } from '../src/template/framework-error-code.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { TemplateCompilationLocus } from '../src/template/template-compilation-cohort.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import type { TemplateRuntimeAnalysisEmission } from '../src/template/template-runtime-analysis.js';
import { resourceLocalRuntimeBindings } from '../src/template/runtime-resource-ownership.js';
import { RuntimeValueConverterIssueKind } from '../src/template/runtime-value-converter.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

describe('production template-family lifecycle', () => {
  test('stages a complete recursive family before atomically assigning child ownership', async () => {
    const fixtureRoot = pressureFixtureRoot('template-completion-member-metadata');
    const templateFileName = path.join(fixtureRoot, 'src/app.html');
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-family-staging',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });

    overlay.write(templateFileName, localTemplateFamilyMarkup('local-icon', true, false));
    inputAuthority.advance();
    const project = baseline.project.forInputGeneration(inputAuthority.capture(baseline.project));
    const attempt = runtime.appAnalysisComputations.prepare(project, {
      analysisDepth: 'binding-observation',
    });
    const family = familyCompilationsByName(attempt.candidateEmission, 'app');
    const owner = requireCompilation(family, 'app');
    const localChip = requireCompilation(family, 'local-chip');
    const localIcon = requireCompilation(family, 'local-icon');
    const nestedLocal = requireCompilation(family, 'nested-local');
    const familyOwnerHandle = owner.familyOwnerHandle;

    expect([...family.values()].every(
      (compilation) => compilation.familyOwnerHandle === familyOwnerHandle,
    )).toBe(true);
    for (const local of [localChip, localIcon, nestedLocal]) {
      expect(runtime.workspace.store.read(local.definition.productHandle!)).toBeNull();
      expect(runtime.workspace.store.productDetails.read(
        ResourceProductDetails.Definition,
        local.definition.productHandle!,
      )).toBeNull();
    }
    const localResourceReads = [...family.values()].flatMap((compilation) =>
      compilation.registeredReads.filter((read): read is TemplateCompilerReadObservation =>
        read instanceof TemplateCompilerReadObservation
          && ['local-chip', 'local-icon', 'nested-local'].includes(read.canonicalKey)
      )
    );
    expect(localResourceReads.length).toBeGreaterThan(0);
    expect(localResourceReads.every(
      (read) => read.closure.state === TemplateCompilerScopeClosureState.Closed,
    )).toBe(true);

    const committed = attempt.commit();
    expect(committed.commit.state).toBe(ComputationCommitState.Committed);
    const appState = currentAppState(runtime, project.projectKey);
    expect(appState.children.some((child) =>
      child.locus.kind === 'computation-remainder'
    )).toBe(false);
    expect(appState.children.filter((child) =>
      child.locus.kind === 'aurelia-app-analysis-phase'
    ).map((child) => child.locus.reconciliationKey).sort()).toEqual([
      JSON.stringify([project.projectKey, AureliaAppAnalysisPhase.PostTemplate]),
      JSON.stringify([project.projectKey, AureliaAppAnalysisPhase.PreTemplate]),
      JSON.stringify([project.projectKey, AureliaAppAnalysisPhase.TemplateRuntime]),
    ]);
    const familyLocus = new TemplateCompilationLocus(project.projectKey, familyOwnerHandle);
    const familyState = appState.children.find((child) =>
      child.locus.kind === familyLocus.kind
        && child.locus.reconciliationKey === familyLocus.reconciliationKey
    ) ?? null;
    expect(familyState).not.toBeNull();
    expect(familyState?.hasOnlyRevisionedReads).toBe(true);
    expect(familyState?.openReads).toEqual([]);
    expect(familyState?.outputs).toContainEqual(expect.objectContaining({
      handle: nestedLocal.unit.compilationUnit.productHandle,
    }));
    expect(runtime.workspace.store.productDetails.read(
      ResourceProductDetails.Definition,
      localChip.definition.productHandle!,
    )).toBe(localChip.definition);
  }, 90_000);

  test('rebuilds local-template compiler worlds when inherited service configuration changes', async () => {
    const fixtureRoot = pressureFixtureRoot('node-observer-config-errors');
    const mainFileName = path.join(fixtureRoot, 'src/main.ts');
    const appFileName = path.join(fixtureRoot, 'src/node-observer-config-errors-app.ts');
    const originalMain = readFileSync(mainFileName, 'utf8');
    const originalApp = readFileSync(appFileName, 'utf8');
    const changedMain = originalMain.replace("events: ['change']", "events: ['inputx']");
    const localMarkup = [
      '<template>',
      '<template as-custom-element="local-chip">',
      '<bindable name="value"></bindable>',
      '<input value.two-way="value">',
      '</template>',
      '<local-chip value.bind="message"></local-chip>',
      '</template>',
    ].join('');
    const appWithLocal = originalApp.replace(
      /template: '[^']*',/u,
      `template: '${localMarkup}',`,
    );
    expect(changedMain).not.toBe(originalMain);
    expect(changedMain.length).toBe(originalMain.length);
    expect(appWithLocal).not.toBe(originalApp);

    const overlay = new MutableProjectSourceOverlay();
    overlay.write(appFileName, appWithLocal);
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:local-template-compiler-world-service-transition',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineRoot = baseline.emission.appWorld.compilerWorlds[0];
    const baselineOwner = requireNamedCompilation(baseline.emission, 'node-observer-config-errors-app');
    const baselineLocal = requireNamedCompilation(baseline.emission, 'local-chip');
    if (baselineRoot == null) {
      throw new Error('Expected an app-root compiler world.');
    }
    const baselineDerived = baselineOwner.compilerWorld;
    expect(baselineOwner.parentCompilerWorld).toBe(baselineRoot);
    expect(baselineDerived).not.toBe(baselineRoot);
    expect(baselineLocal.compilerWorld).toBe(baselineLocal.parentCompilerWorld);
    expect(baselineLocal.compilerWorld.world.productHandle).toBe(baselineDerived.world.productHandle);

    overlay.write(mainFileName, changedMain);
    const changed = await reopenApp(runtime, inputAuthority, baseline);
    const changedRoot = changed.emission.appWorld.compilerWorlds[0];
    const changedOwner = requireNamedCompilation(changed.emission, 'node-observer-config-errors-app');
    const changedLocal = requireNamedCompilation(changed.emission, 'local-chip');
    if (changedRoot == null) {
      throw new Error('Expected a replacement app-root compiler world.');
    }
    const changedDerived = changedOwner.compilerWorld;
    const transition = latestTransition(runtime, changed);

    expect(changedRoot.world.productHandle).toBe(baselineRoot.world.productHandle);
    expect(changedDerived.world.productHandle).toBe(baselineDerived.world.productHandle);
    expect(changedRoot.container.productHandle).toBe(baselineRoot.container.productHandle);
    expect(changedRoot).not.toBe(baselineRoot);
    expect(changedOwner).not.toBe(baselineOwner);
    expect(changedLocal).not.toBe(baselineLocal);
    expect(changedDerived).not.toBe(baselineDerived);
    expect(changedOwner.parentCompilerWorld).toBe(changedRoot);
    expect(changedDerived).not.toBe(changedRoot);
    expect(changedLocal.compilerWorld).toBe(changedLocal.parentCompilerWorld);
    expect(changedLocal.compilerWorld.world.productHandle).toBe(changedDerived.world.productHandle);
    expect(observerEvents(baselineRoot)).toEqual(['change']);
    expect(observerEvents(baselineDerived)).toEqual(['change']);
    expect(observerEvents(baselineLocal.compilerWorld)).toEqual(['change']);
    expect(observerEvents(changedRoot)).toEqual(['inputx']);
    expect(observerEvents(changedDerived)).toEqual(['inputx']);
    expect(observerEvents(changedLocal.compilerWorld)).toEqual(['inputx']);

    for (const world of [baselineRoot, baselineDerived]) {
      expect(transition.publications).toContainEqual(expect.objectContaining({
        handle: world.world.productHandle,
        detailKind: TemplateProductDetails.World.detailKind,
        decision: KernelPublicationDecisionKind.Replace,
      }));
    }
  }, 90_000);

  test('reconciles recursive local-template transitions through the atomic app computation', async () => {
    const fixtureRoot = pressureFixtureRoot('template-completion-member-metadata');
    const templateFileName = path.join(fixtureRoot, 'src/app.html');
    const originalText = readFileSync(templateFileName, 'utf8');
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-family-transitions',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });

    overlay.write(templateFileName, localTemplateFamilyMarkup('local-icon', true, false));
    const first = await reopenApp(runtime, inputAuthority, baseline);
    expect(familyCompilationNames(first.emission, 'app')).toEqual([
      'app',
      'local-chip',
      'local-icon',
      'nested-local',
    ]);
    const firstFamily = familyCompilationsByName(first.emission, 'app');
    const localChip = requireCompilation(firstFamily, 'local-chip');
    const localIcon = requireCompilation(firstFamily, 'local-icon');
    const nestedLocal = requireCompilation(firstFamily, 'nested-local');

    overlay.write(templateFileName, localTemplateFamilyMarkup('local-icon', true, true));
    const reordered = await reopenApp(runtime, inputAuthority, first);
    const reorderedFamily = familyCompilationsByName(reordered.emission, 'app');
    expect(stableCompilationHandles(requireCompilation(reorderedFamily, 'local-chip')))
      .toEqual(stableCompilationHandles(localChip));
    expect(stableCompilationHandles(requireCompilation(reorderedFamily, 'local-icon')))
      .toEqual(stableCompilationHandles(localIcon));
    expect(stableCompilationHandles(requireCompilation(reorderedFamily, 'nested-local')))
      .toEqual(stableCompilationHandles(nestedLocal));
    const reorderTransition = latestTransition(runtime, reordered);
    for (const handle of [
      localChip.definition.productHandle,
      localIcon.definition.productHandle,
      nestedLocal.definition.productHandle,
    ]) {
      expect(handle).not.toBeNull();
      expect(reorderTransition.publications).not.toContainEqual(expect.objectContaining({
        handle,
        decision: KernelPublicationDecisionKind.Publish,
      }));
      expect(reorderTransition.publications).not.toContainEqual(expect.objectContaining({
        handle,
        decision: KernelPublicationDecisionKind.Withdraw,
      }));
    }
    expect(reorderTransition.publications).toContainEqual(expect.objectContaining({
      handle: localChip.definition.sourceAddressHandle,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));
    expect(reorderTransition.publications).toContainEqual(expect.objectContaining({
      handle: localChip.definition.productHandle,
      detailKind: ResourceProductDetails.Definition.detailKind,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));

    overlay.write(templateFileName, localTemplateFamilyMarkup('local-glyph', true, false));
    inputAuthority.advance();
    const staleProject = reordered.project.forInputGeneration(inputAuthority.capture(reordered.project));
    const staleRename = runtime.appAnalysisComputations.prepare(staleProject, {
      analysisDepth: 'binding-observation',
    });
    overlay.write(templateFileName, localTemplateFamilyMarkup('local-mark', true, false));
    inputAuthority.advance();
    const winningProject = reordered.project.forInputGeneration(inputAuthority.capture(reordered.project));
    const winningRename = runtime.appAnalysisComputations.prepare(winningProject, {
      analysisDepth: 'binding-observation',
    });
    const winningRenameResult = winningRename.commit();
    expect(winningRenameResult.commit.state).toBe(ComputationCommitState.Committed);
    expect(staleRename.commit().commit.state).toBe(ComputationCommitState.RejectedSuperseded);
    const renamedEmission = requireCommittedEmission(winningRenameResult.committedGeneration?.emission ?? null);
    const renamedFamily = familyCompilationsByName(renamedEmission, 'app');
    const localMark = requireCompilation(renamedFamily, 'local-mark');
    const renamedNestedLocal = requireCompilation(renamedFamily, 'nested-local');
    expect(runtime.workspace.store.read(localIcon.definition.productHandle!)).toBeNull();
    expect(runtime.workspace.store.read(localMark.definition.productHandle!)).not.toBeNull();
    expect(winningRenameResult.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: nestedLocal.definition.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    overlay.write(templateFileName, localTemplateFamilyMarkup('local-mark', false, false));
    inputAuthority.advance();
    const withoutNestedProject = winningProject.forInputGeneration(inputAuthority.capture(winningProject));
    const withoutNestedAttempt = runtime.appAnalysisComputations.prepare(withoutNestedProject, {
      analysisDepth: 'binding-observation',
    });
    expect(familyCompilationsByName(withoutNestedAttempt.candidateEmission, 'app').has('nested-local')).toBe(false);
    const withoutNested = withoutNestedAttempt.commit();
    expect(withoutNested.commit.state).toBe(ComputationCommitState.Committed);
    expect(withoutNested.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: renamedNestedLocal.definition.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    overlay.write(templateFileName, localTemplateFamilyMarkup(null, false, false));
    inputAuthority.advance();
    const missingSiblingProject = withoutNestedProject.forInputGeneration(inputAuthority.capture(withoutNestedProject));
    const missingSiblingAttempt = runtime.appAnalysisComputations.prepare(missingSiblingProject, {
      analysisDepth: 'binding-observation',
    });
    const missingSiblingFamily = familyCompilationsByName(missingSiblingAttempt.candidateEmission, 'app');
    expect(missingSiblingFamily.has('local-mark')).toBe(false);
    expect(requireCompilation(missingSiblingFamily, 'local-chip').registeredReads).toContainEqual(
      expect.objectContaining({ canonicalKey: 'local-mark', resultParts: [] }),
    );
    expect(missingSiblingAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
    expect(runtime.workspace.store.read(localMark.definition.productHandle!)).toBeNull();

    overlay.write(templateFileName, localTemplateFamilyMarkup('local-icon', true, false));
    inputAuthority.advance();
    const restoredProject = missingSiblingProject.forInputGeneration(inputAuthority.capture(missingSiblingProject));
    const restoredAttempt = runtime.appAnalysisComputations.prepare(restoredProject, {
      analysisDepth: 'binding-observation',
    });
    expect(restoredAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
    const retainedState = currentAppState(runtime, restoredProject.projectKey);
    const retainedLocalChip = runtime.workspace.store.productDetails.read(
      // Definition occupancy is the canonical family-root detail used by later carry-forward.
      ResourceProductDetails.Definition,
      localChip.definition.productHandle!,
    );
    overlay.fail(templateFileName);
    inputAuthority.advance();
    const failedProject = restoredProject.forInputGeneration(inputAuthority.capture(restoredProject));
    expect(() => runtime.appAnalysisComputations.prepare(failedProject, {
      analysisDepth: 'binding-observation',
    })).toThrow('Injected project-source failure');
    overlay.resume();
    expect(runtime.computationLifecycle.readState(retainedState.computationId)).toBe(retainedState);
    expect(runtime.workspace.store.productDetails.read(
      ResourceProductDetails.Definition,
      localChip.definition.productHandle!,
    )).toBe(retainedLocalChip);

    overlay.write(templateFileName, duplicateLocalTemplateMarkup());
    inputAuthority.advance();
    const invalidProject = restoredProject.forInputGeneration(inputAuthority.capture(restoredProject));
    const invalidAttempt = runtime.appAnalysisComputations.prepare(invalidProject, {
      analysisDepth: 'binding-observation',
    });
    expect(familyCompilationNames(invalidAttempt.candidateEmission, 'app')).toEqual(['app']);
    expect(requireNamedCompilation(invalidAttempt.candidateEmission, 'app').compiledTemplate.issues)
      .toContainEqual(expect.objectContaining({
        frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerDuplicateLocalName,
      }));
    const invalid = invalidAttempt.commit();
    expect(invalid.commit.state).toBe(ComputationCommitState.Committed);
    expect(invalid.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: localChip.definition.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    const invalidApp = requireNamedCompilation(invalidAttempt.candidateEmission, 'app');
    overlay.remove(templateFileName);
    inputAuthority.advance();
    const absentProject = invalidProject.forInputGeneration(inputAuthority.capture(invalidProject));
    const absentAttempt = runtime.appAnalysisComputations.prepare(absentProject, {
      analysisDepth: 'binding-observation',
    });
    const absentApp = requireNamedCompilation(absentAttempt.candidateEmission, 'app');
    expect(absentApp.unit.templateSource.sourceKind).toBe('open');
    expect(absentApp.unit.templateSource.markup).toBeNull();
    expect(stableCompilationHandles(absentApp)).toEqual(stableCompilationHandles(invalidApp));
    const absent = absentAttempt.commit();
    expect(absent.commit.state).toBe(ComputationCommitState.Committed);
    expect(absent.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: invalidApp.unit.templateSource.productHandle,
      detailKind: TemplateProductDetails.Source.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));

    overlay.write(templateFileName, originalText);
    inputAuthority.advance();
    const restoredSourceProject = absentProject.forInputGeneration(inputAuthority.capture(absentProject));
    const restoredSourceAttempt = runtime.appAnalysisComputations.prepare(restoredSourceProject, {
      analysisDepth: 'binding-observation',
    });
    expect(familyCompilationNames(restoredSourceAttempt.candidateEmission, 'app')).toEqual(['app']);
    const restoredSourceApp = requireNamedCompilation(restoredSourceAttempt.candidateEmission, 'app');
    expect(restoredSourceApp.unit.templateSource.sourceKind).toBe('markup');
    expect(stableCompilationHandles(restoredSourceApp)).toEqual(stableCompilationHandles(invalidApp));
    expect(restoredSourceAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
  }, 120_000);

  test('keeps recursively rendered child bindings out of their authored parent resource', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-local-templates');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-family-runtime-ownership',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const parent = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'local-templates-app'
    ) ?? null;
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

    const state = currentAppState(runtime, app.project.projectKey);
    const family = requireFamilyChildState(
      runtime,
      app.project.projectKey,
      parent.compilation.familyOwnerHandle,
    );
    const templateRuntime = state.children.find((child) =>
      child.locus.kind === 'aurelia-app-analysis-phase'
      && child.locus.reconciliationKey === JSON.stringify([
        app.project.projectKey,
        AureliaAppAnalysisPhase.TemplateRuntime,
      ])
    ) ?? null;
    const postTemplate = state.children.find((child) =>
      child.locus.kind === 'aurelia-app-analysis-phase'
      && child.locus.reconciliationKey === JSON.stringify([
        app.project.projectKey,
        AureliaAppAnalysisPhase.PostTemplate,
      ])
    ) ?? null;
    expect(templateRuntime).not.toBeNull();
    expect(templateRuntime?.openReads).toEqual([]);
    expect(postTemplate).not.toBeNull();
    expect(postTemplate?.resultDependencies).toEqual([
      expect.objectContaining({ producerChildId: templateRuntime?.childId }),
    ]);
    const familyOutputKeys = new Set(family.outputs.map((output) => output.readKey));
    const templateRuntimeReadKeys = new Set([
      ...(templateRuntime?.reads ?? []).map((read) => read.readKey),
      ...(templateRuntime?.candidateReads ?? []).map((read) => read.readKey),
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
    expect([...templateRuntimeReadKeys]).toEqual(expect.arrayContaining(familyOwnedRuntimeInputKeys));
    for (const resource of localResources) {
      expect(templateRuntimeReadKeys).toContain(
        computationRecordReadKey(resource.compilation.definition.productHandle!),
      );
      expect(templateRuntimeReadKeys).toContain(
        computationProductDetailReadKey(resource.compilation.definition.productHandle!),
      );
    }
    const familyOwnedInstructionKeys = familyResources
      .flatMap((resource) => resource.compilation.compiledTemplate.instructions)
      .map((instruction) => computationProductDetailReadKey(instruction.productHandle))
      .filter((readKey) => familyOutputKeys.has(readKey));
    expect(familyOwnedInstructionKeys.length).toBeGreaterThan(0);
    expect([...templateRuntimeReadKeys]).toEqual(expect.arrayContaining(familyOwnedInstructionKeys));
    const localWorld = localResources.find((resource) =>
      resource.compilation.compilerWorld !== resource.compilation.parentCompilerWorld
    )?.compilation.compilerWorld ?? null;
    if (localWorld == null) {
      throw new Error('Expected a family-derived compiler world for local templates.');
    }
    expect([...templateRuntimeReadKeys]).toEqual(expect.arrayContaining([
      computationRecordReadKey(localWorld.world.productHandle),
      computationProductDetailReadKey(localWorld.world.productHandle),
      computationRecordReadKey(localWorld.resourceScope.productHandle),
      computationProductDetailReadKey(localWorld.resourceScope.productHandle),
    ]));

    const parentBindingHandles = new Set(
      resourceLocalRuntimeBindings(runtime.workspace.store, parent).map((binding) => binding.productHandle),
    );
    const childBindingHandles = new Set(
      localResources.flatMap((resource) =>
        resourceLocalRuntimeBindings(runtime.workspace.store, resource).map((binding) => binding.productHandle)
      ),
    );
    expect(parentBindingHandles.size).toBeGreaterThan(0);
    expect(childBindingHandles.size).toBeGreaterThan(0);
    expect([...parentBindingHandles].filter((handle) => childBindingHandles.has(handle))).toEqual([]);
  }, 60_000);

  test('adds and withdraws complete authoring owner cohorts through production planning', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-metadata-errors');
    const sourceFileName = path.join(fixtureRoot, 'src/resource-metadata-errors-app.ts');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-owner-membership',
    });
    const baseline = await runtime.openApp({
      analysisDepth: 'binding-observation',
      includeAuthoringTemplates: false,
    });
    expect(ownerPlanNames(baseline.emission)).not.toContain('containerless-slot-conflict');

    const authoring = await runtime.openApp({
      analysisDepth: 'binding-observation',
      includeAuthoringTemplates: true,
      authoringTemplateSourceFiles: [sourceFileName],
    });
    const authoringOwner = authoring.emission.templates.cohortPlan.ownerPlans.find(
      (owner) => owner.definition.name === 'containerless-slot-conflict',
    ) ?? null;
    expect(authoringOwner?.cohorts.map((cohort) => cohort.kind)).toEqual(['authoring']);
    const authoringCompilation = authoring.emission.templates.authoringResources.find(
      (resource) => resource.compilation.definition.name === 'containerless-slot-conflict',
    )?.compilation ?? null;
    expect(authoringCompilation).not.toBeNull();
    if (authoringCompilation == null) {
      throw new Error('Expected the selected authoring owner to compile in production.');
    }
    expect(latestTransition(runtime, authoring).publications).toContainEqual(expect.objectContaining({
      handle: authoringCompilation.unit.compilationUnit.productHandle,
      decision: KernelPublicationDecisionKind.Publish,
    }));

    const removedAttempt = runtime.appAnalysisComputations.prepare(authoring.project, {
      analysisDepth: 'binding-observation',
      includeAuthoringTemplates: false,
    });
    const removed = removedAttempt.commit();
    expect(removed.commit.state).toBe(ComputationCommitState.Committed);
    const removedEmission = requireCommittedEmission(removed.committedGeneration?.emission ?? null);
    expect(ownerPlanNames(removedEmission)).not.toContain('containerless-slot-conflict');
    expect(removed.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: authoringCompilation.unit.compilationUnit.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));
    expect(runtime.workspace.store.read(authoringCompilation.unit.compilationUnit.productHandle)).toBeNull();
  }, 90_000);

  test('retains equal compilations and replaces source text with a refreshed full-span witness', async () => {
    const fixtureRoot = pressureFixtureRoot('template-completion-member-metadata');
    const templateFileName = path.join(fixtureRoot, 'src/app.html');
    const originalText = readFileSync(templateFileName, 'utf8');
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-source-replacement',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineCompilation = requireNamedCompilation(baseline.emission, 'app');
    const baselineRootWorld = baseline.emission.appWorld.compilerWorlds[0];
    const sourceHandle = baselineCompilation.unit.templateSource.productHandle;
    const sourceAddressHandle = baselineCompilation.unit.templateSource.sourceAddressHandle;
    expect(sourceAddressHandle).not.toBeNull();
    const canonicalCompiledTemplate = runtime.workspace.store.productDetails.read(
      TemplateProductDetails.CompiledTemplate,
      baselineCompilation.compiledTemplate.compiledTemplate.productHandle,
    );
    const canonicalRootWorld = baselineRootWorld == null
      ? null
      : runtime.workspace.store.productDetails.read(
          TemplateProductDetails.World,
          baselineRootWorld.world.productHandle,
        );
    const baselineRuntimeAnalysisByLocalKey = new Map(
      baseline.emission.templates.resources.map((resource) => [
        resource.compilation.localKey,
        resource.runtimeAnalysis,
      ]),
    );
    const baselinePostTemplate = baseline.emission.postTemplate;
    const equal = await reopenApp(runtime, inputAuthority, baseline);
    const equalCompilation = requireNamedCompilation(equal.emission, 'app');
    const equalRootWorld = equal.emission.appWorld.compilerWorlds[0];
    expect(baselineRootWorld).toBeDefined();
    expect(equalRootWorld).toBeDefined();
    expect(equalRootWorld).not.toBe(baselineRootWorld);
    expect(equalRootWorld?.container).not.toBe(baselineRootWorld?.container);
    expect(equalRootWorld?.world).not.toBe(canonicalRootWorld);
    expect(equalCompilation).not.toBe(baselineCompilation);
    expect(equalCompilation.parentCompilerWorld).toBe(equalRootWorld);
    expect(equalCompilation.compilerWorld.container).toBe(equalRootWorld?.container);
    for (const baselineRead of baselineCompilation.registeredReads) {
      const equalRead = equalCompilation.registeredReads.find((read) => read.readKey === baselineRead.readKey) ?? null;
      expect(equalRead).not.toBeNull();
      expect(equalRead).not.toBe(baselineRead);
      expect(equalRead?.validate().isCurrent).toBe(true);
    }
    const equalTransition = latestTransition(runtime, equal);
    expect(equalTransition.children).toContainEqual(expect.objectContaining({
      locus: expect.objectContaining({
        reconciliationKey: JSON.stringify([
          equal.project.projectKey,
          AureliaAppAnalysisPhase.TemplateRuntime,
        ]),
      }),
      kind: ComputationChildTransitionKind.Carried,
    }));
    expect(equalTransition.children).toContainEqual(expect.objectContaining({
      locus: expect.objectContaining({
        reconciliationKey: JSON.stringify([
          equal.project.projectKey,
          AureliaAppAnalysisPhase.PostTemplate,
        ]),
      }),
      kind: ComputationChildTransitionKind.Carried,
    }));
    expect(equal.emission.postTemplate).not.toBe(baselinePostTemplate);
    for (const resource of equal.emission.templates.resources) {
      const previousRuntimeAnalysis = baselineRuntimeAnalysisByLocalKey.get(resource.compilation.localKey) ?? null;
      expect(previousRuntimeAnalysis).not.toBeNull();
      if (previousRuntimeAnalysis != null) {
        expectCarriedRuntimeAnalysis(previousRuntimeAnalysis, resource.runtimeAnalysis);
      }
    }
    if (baselineRootWorld == null) {
      throw new Error('Expected an app-root compiler world.');
    }
    for (const [slot, handle] of [
      [TemplateProductDetails.World, baselineRootWorld.world.productHandle],
      [TemplateProductDetails.ResourceScope, baselineRootWorld.resourceScope.productHandle],
      [TemplateProductDetails.TemplateCompilerService, baselineRootWorld.templateCompiler.productHandle],
      [TemplateProductDetails.ResourceResolverService, baselineRootWorld.resourceResolver.productHandle],
      [TemplateProductDetails.ExpressionParserService, baselineRootWorld.expressionParser.productHandle],
      [TemplateProductDetails.AttributeMapperService, baselineRootWorld.attributeMapper.productHandle],
      [TemplateProductDetails.RenderingService, baselineRootWorld.rendering.productHandle],
      [TemplateProductDetails.AttributeParserService, baselineRootWorld.attributeParser.productHandle],
      [TemplateProductDetails.AttributeParserMachine, baselineRootWorld.attributeParserMachine.productHandle],
      [TemplateProductDetails.BindingCommandResolver, baselineRootWorld.bindingCommandResolver.productHandle],
    ] as const) {
      expect(equalTransition.publications).toContainEqual(expect.objectContaining({
        handle,
        detailKind: slot.detailKind,
        decision: KernelPublicationDecisionKind.Retain,
      }));
    }
    expect(runtime.workspace.store.productDetails.read(
      TemplateProductDetails.World,
      baselineRootWorld.world.productHandle,
    )).toBe(canonicalRootWorld);
    expect(equalTransition.publications).toContainEqual(expect.objectContaining({
      handle: baselineCompilation.compiledTemplate.compiledTemplate.productHandle,
      detailKind: TemplateProductDetails.CompiledTemplate.detailKind,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(runtime.workspace.store.productDetails.read(
      TemplateProductDetails.CompiledTemplate,
      baselineCompilation.compiledTemplate.compiledTemplate.productHandle,
    )).toBe(canonicalCompiledTemplate);
    expect(equalCompilation.compiledTemplate.compiledTemplate).toBe(canonicalCompiledTemplate);

    const expandedText = originalText.replace('<p>${}</p>', '<section>${}</section>');
    expect(expandedText.length).toBeGreaterThan(originalText.length);
    overlay.write(templateFileName, expandedText);
    const expanded = await reopenApp(runtime, inputAuthority, equal);
    const expandedCompilation = requireNamedCompilation(expanded.emission, 'app');
    const expandedTransition = latestTransition(runtime, expanded);
    expect(expandedCompilation.unit.templateSource.markup).toBe(expandedText);
    expect(expandedTransition.changedReads).toContainEqual(expect.objectContaining({
      domain: 'project-input',
      readKey: projectInputPathReadKey(SemanticRuntimeProjectInputReadKind.FileContent, templateFileName),
    }));
    expect(expandedTransition.publications).toContainEqual(expect.objectContaining({
      handle: sourceHandle,
      detailKind: TemplateProductDetails.Source.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(expandedTransition.publications).toContainEqual(expect.objectContaining({
      handle: sourceAddressHandle,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));
    expect(sourceAddressHandle == null ? null : runtime.workspace.store.readAddress(sourceAddressHandle))
      .toEqual(expect.objectContaining({ start: 0, end: expandedText.length }));
    expect(runtime.workspace.store.productDetails.read(
      TemplateProductDetails.Source,
      sourceHandle,
    )?.markup).toBe(expandedText);
  }, 90_000);

  test('carries built-in binding-behavior analysis from its compiler-selected catalog header', async () => {
    const fixtureRoot = pressureFixtureRoot('app-pattern-routed-catalog-storefront');
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-built-in-resource-carry',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const debounce = baseline.emission.templates.resources.flatMap((resource) =>
      resource.runtimeAnalysis.expressionResourcePlan.behaviorEntries
    ).find((entry) => entry.builtInResource?.name === BuiltInBindingBehaviorName.Debounce) ?? null;
    expect(debounce).not.toBeNull();
    const baselineRuntimeAnalysisByLocalKey = new Map(
      baseline.emission.templates.resources.map((resource) => [
        resource.compilation.localKey,
        resource.runtimeAnalysis,
      ]),
    );

    const carried = await reopenApp(runtime, inputAuthority, baseline);
    const transition = latestTransition(runtime, carried);
    expect(transition.children).toContainEqual(expect.objectContaining({
      locus: expect.objectContaining({
        reconciliationKey: JSON.stringify([
          carried.project.projectKey,
          AureliaAppAnalysisPhase.TemplateRuntime,
        ]),
      }),
      kind: ComputationChildTransitionKind.Carried,
    }));
    expect(transition.children).toContainEqual(expect.objectContaining({
      locus: expect.objectContaining({
        reconciliationKey: JSON.stringify([
          carried.project.projectKey,
          AureliaAppAnalysisPhase.PostTemplate,
        ]),
      }),
      kind: ComputationChildTransitionKind.Carried,
    }));
    const state = currentAppState(runtime, carried.project.projectKey);
    const templateRuntime = state.children.find((child) =>
      child.locus.kind === 'aurelia-app-analysis-phase'
      && child.locus.reconciliationKey === JSON.stringify([
        carried.project.projectKey,
        AureliaAppAnalysisPhase.TemplateRuntime,
      ])
    ) ?? null;
    const postTemplate = state.children.find((child) =>
      child.locus.kind === 'aurelia-app-analysis-phase'
      && child.locus.reconciliationKey === JSON.stringify([
        carried.project.projectKey,
        AureliaAppAnalysisPhase.PostTemplate,
      ])
    ) ?? null;
    expect(templateRuntime?.openReads).toEqual([]);
    expect(postTemplate?.openReads).toEqual([]);
    expect(postTemplate?.resultDependencies).toEqual([
      expect.objectContaining({ producerChildId: templateRuntime?.childId }),
    ]);
    for (const resource of carried.emission.templates.resources) {
      const previous = baselineRuntimeAnalysisByLocalKey.get(resource.compilation.localKey) ?? null;
      expect(previous).not.toBeNull();
      if (previous != null) {
        expectCarriedRuntimeAnalysis(previous, resource.runtimeAnalysis);
      }
    }
  }, 90_000);

  test('rebinds retained template families to current DI state before runtime value-converter analysis', async () => {
    const fixtureRoot = pressureFixtureRoot('sanitize-value-converter-custom');
    const mainFileName = path.join(fixtureRoot, 'src/main.ts');
    const originalMain = readFileSync(mainFileName, 'utf8');
    const registration = '    Registration.singleton(ISanitizer, AppSanitizer),';
    const registrationComment = `    /*${' '.repeat(registration.length - 8)}*/`;
    const withoutSanitizer = originalMain.replace(registration, registrationComment);
    expect(withoutSanitizer).not.toBe(originalMain);
    expect(withoutSanitizer.length).toBe(originalMain.length);

    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-family-current-di-state',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineCompilation = requireNamedCompilation(baseline.emission, 'sanitize-value-converter-custom-app');
    const baselineRootWorld = baseline.emission.appWorld.compilerWorlds[0];
    expect(sanitizerIssues(baseline.emission)).toEqual([]);

    overlay.write(mainFileName, withoutSanitizer);
    const without = await reopenApp(runtime, inputAuthority, baseline);
    const withoutCompilation = requireNamedCompilation(without.emission, 'sanitize-value-converter-custom-app');
    const withoutRootWorld = without.emission.appWorld.compilerWorlds[0];
    expect(withoutRootWorld).not.toBe(baselineRootWorld);
    expect(withoutRootWorld?.container).not.toBe(baselineRootWorld?.container);
    expect(withoutCompilation).not.toBe(baselineCompilation);
    expect(withoutCompilation.compilerWorld.container).toBe(withoutRootWorld?.container);
    expect(withoutCompilation.compiledTemplate.compiledTemplate).toBe(
      baselineCompilation.compiledTemplate.compiledTemplate,
    );
    expect(sanitizerIssues(without.emission)).toEqual([
      RuntimeValueConverterIssueKind.SanitizerMethodNotImplemented,
    ]);
    expect(latestTransition(runtime, without).publications).toContainEqual(expect.objectContaining({
      handle: baselineCompilation.compiledTemplate.compiledTemplate.productHandle,
      detailKind: TemplateProductDetails.CompiledTemplate.detailKind,
      decision: KernelPublicationDecisionKind.Retain,
    }));

    overlay.write(mainFileName, originalMain);
    const restored = await reopenApp(runtime, inputAuthority, without);
    expect(sanitizerIssues(restored.emission)).toEqual([]);
  }, 90_000);

  test('withdraws and restores the exact family closure for both compiler front-door no-op states', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-local-templates');
    const resourceFileName = path.join(fixtureRoot, 'src/global-resources.ts');
    const originalText = readFileSync(resourceFileName, 'utf8');
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-front-door-states',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineHelper = requireNamedCompilation(baseline.emission, 'global-helper');
    const familyOwnerHandle = baselineHelper.familyOwnerHandle;
    const baselineChild = requireFamilyChildState(runtime, baseline.project.projectKey, familyOwnerHandle);
    expect(baselineChild.outputs.length).toBeGreaterThan(0);

    overlay.write(
      resourceFileName,
      originalText.replace("name: 'global-helper',", "name: 'global-helper',\n  needsCompile: false,"),
    );
    const alreadyCompiled = await reopenApp(runtime, inputAuthority, baseline);
    expect(hasNamedCompilation(alreadyCompiled.emission, 'global-helper')).toBe(false);
    const alreadyCompiledDefinition = requireCustomElementDefinition(alreadyCompiled.emission, 'global-helper');
    expect(alreadyCompiledDefinition.needsCompile).toBe(false);
    expect(alreadyCompiledDefinition.template?.kind).toBe(CustomElementTemplateKind.Markup);
    expectFamilyClosureWithdrawn(latestTransition(runtime, alreadyCompiled), baselineChild.outputs);
    expect(findFamilyChildState(runtime, alreadyCompiled.project.projectKey, familyOwnerHandle)).toBeNull();

    overlay.write(resourceFileName, originalText);
    const restoredAfterAlreadyCompiled = await reopenApp(runtime, inputAuthority, alreadyCompiled);
    const restoredHelper = requireNamedCompilation(restoredAfterAlreadyCompiled.emission, 'global-helper');
    expect(restoredHelper.familyOwnerHandle).toBe(familyOwnerHandle);
    const restoredChild = requireFamilyChildState(
      runtime,
      restoredAfterAlreadyCompiled.project.projectKey,
      familyOwnerHandle,
    );
    expect(outputKeys(restoredChild.outputs)).toEqual(outputKeys(baselineChild.outputs));
    expectFamilyClosurePublished(latestTransition(runtime, restoredAfterAlreadyCompiled), restoredChild.outputs);

    overlay.write(
      resourceFileName,
      originalText.replace("template: '<template>helper ${value}</template>',", 'template: null,'),
    );
    const noTemplate = await reopenApp(runtime, inputAuthority, restoredAfterAlreadyCompiled);
    expect(hasNamedCompilation(noTemplate.emission, 'global-helper')).toBe(false);
    expect(requireCustomElementDefinition(noTemplate.emission, 'global-helper').template?.kind)
      .toBe(CustomElementTemplateKind.None);
    expectFamilyClosureWithdrawn(latestTransition(runtime, noTemplate), restoredChild.outputs);
    expect(findFamilyChildState(runtime, noTemplate.project.projectKey, familyOwnerHandle)).toBeNull();

    overlay.write(resourceFileName, originalText);
    const restoredAfterNoTemplate = await reopenApp(runtime, inputAuthority, noTemplate);
    expect(requireNamedCompilation(restoredAfterNoTemplate.emission, 'global-helper').familyOwnerHandle)
      .toBe(familyOwnerHandle);
    const restoredAgainChild = requireFamilyChildState(
      runtime,
      restoredAfterNoTemplate.project.projectKey,
      familyOwnerHandle,
    );
    expect(outputKeys(restoredAgainChild.outputs)).toEqual(outputKeys(baselineChild.outputs));
    expectFamilyClosurePublished(latestTransition(runtime, restoredAfterNoTemplate), restoredAgainChild.outputs);
  }, 120_000);

  test('re-evaluates a dependent family and retains equal output after an upstream bindable change', async () => {
    const fixtureRoot = pressureFixtureRoot('app-pattern-routed-catalog-storefront');
    const itemCardFileName = path.join(fixtureRoot, 'src/components/item-card.ts');
    const originalItemCard = readFileSync(itemCardFileName, 'utf8');
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-family-upstream-definition',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineItemList = requireNamedCompilation(baseline.emission, 'item-list-route');
    const baselineItemDetail = requireNamedCompilation(baseline.emission, 'item-detail-route');
    const itemCardDefinitionHandle = baseline.emission.resourceIndex.entries.find((entry) =>
      entry.definition.name === 'item-card'
    )?.definition.productHandle ?? null;
    expect(itemCardDefinitionHandle).not.toBeNull();
    if (itemCardDefinitionHandle == null) {
      throw new Error('Expected the item-card resource definition.');
    }
    const baselineState = currentAppState(runtime, baseline.project.projectKey);
    const preTemplate = baselineState.children.find((child) =>
      child.locus.kind === 'aurelia-app-analysis-phase'
      && child.locus.reconciliationKey === JSON.stringify([
        baseline.project.projectKey,
        AureliaAppAnalysisPhase.PreTemplate,
      ])
    ) ?? null;
    const baselineItemListFamily = requireFamilyChildState(
      runtime,
      baseline.project.projectKey,
      baselineItemList.familyOwnerHandle,
    );
    expect(preTemplate).not.toBeNull();
    expect(baselineItemListFamily.structuralDependencies).toContainEqual(expect.objectContaining({
      readKey: computationProductDetailReadKey(itemCardDefinitionHandle),
      producerChildId: preTemplate?.childId,
    }));
    const baselineBindableRead = requireCompilerRead(
      baselineItemList,
      TemplateCompilerReadKind.Bindables,
      itemCardDefinitionHandle,
    );
    expect(baselineBindableRead.resultParts).toContain('item');
    const retainedUnrelatedTemplate = runtime.workspace.store.productDetails.read(
      TemplateProductDetails.CompiledTemplate,
      baselineItemDetail.compiledTemplate.compiledTemplate.productHandle,
    );

    overlay.write(
      itemCardFileName,
      originalItemCard.replace('@bindable item: Item | null = null;', '@bindable entry: Item | null = null;'),
    );
    const changed = await reopenApp(runtime, inputAuthority, baseline);
    const changedItemList = requireNamedCompilation(changed.emission, 'item-list-route');
    const changedItemCard = requireNamedCompilation(changed.emission, 'item-card');
    expect(changedItemList.definition).toBe(requireCustomElementDefinition(changed.emission, 'item-list-route'));
    expect(changedItemCard.definition).toBe(requireCustomElementDefinition(changed.emission, 'item-card'));
    const changedBindableRead = requireCompilerRead(
      changedItemList,
      TemplateCompilerReadKind.Bindables,
      itemCardDefinitionHandle,
    );
    expect(changedBindableRead.readKey).toBe(baselineBindableRead.readKey);
    expect(changedBindableRead.observedRevision).not.toBe(baselineBindableRead.observedRevision);
    expect(changedBindableRead.resultParts).toContain('entry');
    expect(changedBindableRead.resultParts).not.toContain('item');
    const changedTransition = latestTransition(runtime, changed);
    expect(changedTransition.publications).toContainEqual(expect.objectContaining({
      handle: itemCardDefinitionHandle,
      detailKind: ResourceProductDetails.Definition.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(changedTransition.publications).toContainEqual(expect.objectContaining({
      handle: changedItemList.compilerWorld.resourceScope.productHandle,
      detailKind: TemplateProductDetails.ResourceScope.detailKind,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    const canonicalChangedScope = runtime.workspace.store.productDetails.read(
      TemplateProductDetails.ResourceScope,
      changedItemList.compilerWorld.resourceScope.productHandle,
    );
    const canonicalItemCardReference = canonicalChangedScope?.resources.find((resource) =>
      resource.name === 'item-card'
    ) ?? null;
    const canonicalItemCard = canonicalItemCardReference == null
      ? null
      : readVisibleTemplateResourceDefinition(runtime.workspace.store, canonicalItemCardReference);
    expect(canonicalItemCard).toBeInstanceOf(CustomElementDefinition);
    expect(canonicalItemCard instanceof CustomElementDefinition
      ? canonicalItemCard.bindables.map((bindable) => bindable.name)
      : null).toContain('entry');
    expect(changedTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: baselineBindableRead.readKey,
      previousRevision: baselineBindableRead.observedRevision,
      nextRevision: changedBindableRead.observedRevision,
    }));
    expect(changedTransition.publications).toContainEqual(expect.objectContaining({
      handle: changedItemList.compiledTemplate.compiledTemplate.productHandle,
      detailKind: TemplateProductDetails.CompiledTemplate.detailKind,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(changedTransition.publications).toContainEqual(expect.objectContaining({
      handle: baselineItemDetail.compiledTemplate.compiledTemplate.productHandle,
      detailKind: TemplateProductDetails.CompiledTemplate.detailKind,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(runtime.workspace.store.productDetails.read(
      TemplateProductDetails.CompiledTemplate,
      baselineItemDetail.compiledTemplate.compiledTemplate.productHandle,
    )).toBe(retainedUnrelatedTemplate);

    overlay.write(itemCardFileName, originalItemCard);
    const restored = await reopenApp(runtime, inputAuthority, changed);
    const restoredItemList = requireNamedCompilation(restored.emission, 'item-list-route');
    expect(requireCompilerRead(
      restoredItemList,
      TemplateCompilerReadKind.Bindables,
      itemCardDefinitionHandle,
    ).resultParts).toContain('item');
  }, 120_000);

  test('tracks resource availability and authored lookup-key changes as distinct production reads', async () => {
    const fixtureRoot = pressureFixtureRoot('app-pattern-routed-catalog-storefront');
    const routeFileName = path.join(fixtureRoot, 'src/routes/item-list-route.ts');
    const templateFileName = path.join(fixtureRoot, 'src/routes/item-list-route.html');
    const originalRoute = readFileSync(routeFileName, 'utf8');
    const originalTemplate = readFileSync(templateFileName, 'utf8');
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-resource-reads',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineItemList = requireNamedCompilation(baseline.emission, 'item-list-route');
    const positiveItemCardRead = requireCompilerRead(
      baselineItemList,
      TemplateCompilerReadKind.ElementResource,
      'item-card',
    );
    expect(positiveItemCardRead.resultParts.length).toBeGreaterThan(0);

    overlay.write(routeFileName, originalRoute.replace('dependencies: [ItemCard],', 'dependencies: [],'));
    const unavailable = await reopenApp(runtime, inputAuthority, baseline);
    const unavailableItemList = requireNamedCompilation(unavailable.emission, 'item-list-route');
    const negativeItemCardRead = requireCompilerRead(
      unavailableItemList,
      TemplateCompilerReadKind.ElementResource,
      'item-card',
    );
    expect(negativeItemCardRead.resultParts).toEqual([]);
    const unavailableTransition = latestTransition(runtime, unavailable);
    expect(unavailableTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: positiveItemCardRead.readKey,
      nextRevision: null,
    }));
    expect(unavailableTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: negativeItemCardRead.readKey,
      previousRevision: null,
      nextRevision: negativeItemCardRead.observedRevision,
    }));

    overlay.write(routeFileName, originalRoute);
    const availableAgain = await reopenApp(runtime, inputAuthority, unavailable);
    const restoredItemCardRead = requireCompilerRead(
      requireNamedCompilation(availableAgain.emission, 'item-list-route'),
      TemplateCompilerReadKind.ElementResource,
      'item-card',
    );
    expect(restoredItemCardRead.resultParts.length).toBeGreaterThan(0);
    const availableAgainTransition = latestTransition(runtime, availableAgain);
    expect(availableAgainTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: negativeItemCardRead.readKey,
      nextRevision: null,
    }));
    expect(availableAgainTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: restoredItemCardRead.readKey,
      previousRevision: null,
      nextRevision: restoredItemCardRead.observedRevision,
    }));

    overlay.write(templateFileName, originalTemplate.replaceAll('item-card', 'fake-card'));
    const alternateKey = await reopenApp(runtime, inputAuthority, availableAgain);
    const alternateKeyItemList = requireNamedCompilation(alternateKey.emission, 'item-list-route');
    const fakeCardRead = requireCompilerRead(
      alternateKeyItemList,
      TemplateCompilerReadKind.ElementResource,
      'fake-card',
    );
    expect(fakeCardRead.resultParts).toEqual([]);
    expect(findCompilerRead(
      alternateKeyItemList,
      TemplateCompilerReadKind.ElementResource,
      'item-card',
    )).toBeNull();
    const alternateKeyTransition = latestTransition(runtime, alternateKey);
    expect(alternateKeyTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: restoredItemCardRead.readKey,
      nextRevision: null,
    }));
    expect(alternateKeyTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: fakeCardRead.readKey,
      previousRevision: null,
      nextRevision: fakeCardRead.observedRevision,
    }));

    overlay.write(templateFileName, originalTemplate);
    const originalKeyAgain = await reopenApp(runtime, inputAuthority, alternateKey);
    const finalItemCardRead = requireCompilerRead(
      requireNamedCompilation(originalKeyAgain.emission, 'item-list-route'),
      TemplateCompilerReadKind.ElementResource,
      'item-card',
    );
    expect(finalItemCardRead.resultParts.length).toBeGreaterThan(0);
    const restoredKeyTransition = latestTransition(runtime, originalKeyAgain);
    expect(restoredKeyTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: fakeCardRead.readKey,
      nextRevision: null,
    }));
    expect(restoredKeyTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: finalItemCardRead.readKey,
      previousRevision: null,
      nextRevision: finalItemCardRead.observedRevision,
    }));
  }, 150_000);

  test('relocates an external HTML import and rejects a prepared relocation after its source generation changes', async () => {
    const fixtureRoot = pressureFixtureRoot('app-pattern-routed-catalog-storefront');
    const routeFileName = path.join(fixtureRoot, 'src/routes/item-list-route.ts');
    const originalTemplateFileName = path.join(fixtureRoot, 'src/routes/item-list-route.html');
    const relocatedTemplateFileName = path.join(fixtureRoot, 'src/routes/item-list-route-relocated.html');
    const redirectedTemplateFileName = path.join(fixtureRoot, 'src/routes/item-list-route-redirected.html');
    const originalRoute = readFileSync(routeFileName, 'utf8');
    const originalTemplate = readFileSync(originalTemplateFileName, 'utf8');
    const relocatedTemplate = `${originalTemplate}\n<!-- relocated -->\n`;
    const redirectedTemplate = `${originalTemplate}\n<!-- redirected -->\n`;
    const relocatedRoute = originalRoute.replace(
      "import template from './item-list-route.html';",
      "import template from './item-list-route-relocated.html';",
    );
    const redirectedRoute = originalRoute.replace(
      "import template from './item-list-route.html';",
      "import template from './item-list-route-redirected.html';",
    );
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-source-relocation',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });

    overlay.write(relocatedTemplateFileName, relocatedTemplate);
    overlay.write(routeFileName, relocatedRoute);
    const relocated = await reopenApp(runtime, inputAuthority, baseline);
    const relocatedCompilation = requireNamedCompilation(relocated.emission, 'item-list-route');
    expect(relocatedCompilation.unit.templateSource.markup).toBe(relocatedTemplate);
    const relocatedSourceAddressHandle = relocatedCompilation.unit.templateSource.sourceAddressHandle;
    expect(relocatedSourceAddressHandle).not.toBeNull();
    const relocatedSourceFile = sourceFileAddressForAddress(
      runtime.workspace.store,
      relocatedSourceAddressHandle,
    );
    expect(relocatedSourceFile).not.toBeNull();
    expect(path.normalize(relocatedSourceFile?.path ?? '').endsWith(
      path.normalize('src/routes/item-list-route-relocated.html'),
    )).toBe(true);
    const relocatedTransition = latestTransition(runtime, relocated);
    expect(relocatedTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: projectInputPathReadKey(
        SemanticRuntimeProjectInputReadKind.FileContent,
        originalTemplateFileName,
      ),
      nextRevision: null,
    }));
    expect(relocatedTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: projectInputPathReadKey(
        SemanticRuntimeProjectInputReadKind.FileContent,
        relocatedTemplateFileName,
      ),
      previousRevision: null,
    }));

    overlay.write(redirectedTemplateFileName, redirectedTemplate);
    overlay.write(routeFileName, redirectedRoute);
    const redirected = await reopenApp(runtime, inputAuthority, relocated);
    const redirectedCompilation = requireNamedCompilation(redirected.emission, 'item-list-route');
    expect(redirectedCompilation.unit.templateSource.markup).toBe(redirectedTemplate);
    const redirectedSourceFile = sourceFileAddressForAddress(
      runtime.workspace.store,
      redirectedCompilation.unit.templateSource.sourceAddressHandle,
    );
    expect(path.normalize(redirectedSourceFile?.path ?? '').endsWith(
      path.normalize('src/routes/item-list-route-redirected.html'),
    )).toBe(true);
    const redirectedTransition = latestTransition(runtime, redirected);
    expect(redirectedTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: projectInputPathReadKey(
        SemanticRuntimeProjectInputReadKind.FileContent,
        relocatedTemplateFileName,
      ),
      nextRevision: null,
    }));
    expect(redirectedTransition.changedReads).toContainEqual(expect.objectContaining({
      readKey: projectInputPathReadKey(
        SemanticRuntimeProjectInputReadKind.FileContent,
        redirectedTemplateFileName,
      ),
      previousRevision: null,
    }));

    const raceOverlay = new MutableProjectSourceOverlay();
    const raceInputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(raceOverlay),
    );
    const raceRuntime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:production-template-source-relocation-race',
      projectInputAuthority: raceInputAuthority,
    });
    const raceBaseline = await raceRuntime.openApp({ analysisDepth: 'binding-observation' });
    const raceBaselineSourceHandle = requireNamedCompilation(
      raceBaseline.emission,
      'item-list-route',
    ).unit.templateSource.productHandle;
    raceOverlay.write(redirectedTemplateFileName, redirectedTemplate);
    raceOverlay.write(routeFileName, redirectedRoute);
    raceInputAuthority.advance();
    const redirectedProject = raceBaseline.project.forInputGeneration(
      raceInputAuthority.capture(raceBaseline.project),
    );
    const redirectedAttempt = raceRuntime.appAnalysisComputations.prepare(redirectedProject, {
      analysisDepth: 'binding-observation',
    });
    expect(requireNamedCompilation(redirectedAttempt.candidateEmission, 'item-list-route').unit.templateSource.markup)
      .toBe(redirectedTemplate);

    raceOverlay.write(routeFileName, originalRoute);
    raceInputAuthority.advance();
    const rejected = redirectedAttempt.commit();
    expect(rejected.commit.state).toBe(ComputationCommitState.RejectedCurrentnessChanged);
    expect(rejected.commit.transition.invalidReads).toEqual([]);
    expect(rejected.commit.transition.invalidCurrentnessGuards).toEqual([
      expect.objectContaining({ guardKey: redirectedProject.inputGeneration.currentnessGuardKey }),
    ]);
    expect(raceRuntime.workspace.store.productDetails.read(
      TemplateProductDetails.Source,
      raceBaselineSourceHandle,
    )?.markup).toBe(originalTemplate);
  }, 150_000);
});

async function reopenApp(
  runtime: SemanticRuntime,
  inputAuthority: SemanticRuntimeProjectInputAuthority,
  previous: SemanticApp,
): Promise<SemanticApp> {
  inputAuthority.advance();
  return runtime.openApp({
    projectKey: previous.project.projectKey,
    analysisDepth: 'binding-observation',
  });
}

function latestTransition(runtime: SemanticRuntime, app: SemanticApp): ComputationTransition {
  const generation = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
  if (generation == null) {
    throw new Error('Expected a current production app generation.');
  }
  const transition = runtime.computationLifecycle.readTransitions(generation.computationId).at(-1) ?? null;
  if (transition == null) {
    throw new Error('Expected the production app replacement to record a transition.');
  }
  return transition;
}

function currentAppState(runtime: SemanticRuntime, projectKey: string): ComputationState {
  const generation = runtime.appAnalysisComputations.authorityFor(projectKey).current();
  if (generation == null) {
    throw new Error('Expected a current production app generation.');
  }
  const state = runtime.computationLifecycle.readState(generation.computationId);
  if (state == null) {
    throw new Error('Expected the current production app lifecycle state.');
  }
  return state;
}

function findFamilyChildState(
  runtime: SemanticRuntime,
  projectKey: string,
  familyOwnerHandle: IdentityHandle | ProductHandle,
): ComputationChildState | null {
  const locus = new TemplateCompilationLocus(projectKey, familyOwnerHandle);
  return currentAppState(runtime, projectKey).children.find((child) =>
    child.locus.kind === locus.kind
      && child.locus.reconciliationKey === locus.reconciliationKey
  ) ?? null;
}

function requireFamilyChildState(
  runtime: SemanticRuntime,
  projectKey: string,
  familyOwnerHandle: IdentityHandle | ProductHandle,
): ComputationChildState {
  const state = findFamilyChildState(runtime, projectKey, familyOwnerHandle);
  if (state == null) {
    throw new Error(`Expected template-family child state for ${familyOwnerHandle}.`);
  }
  return state;
}

function outputKeys(outputs: readonly ComputationOutput[]): readonly string[] {
  return outputs
    .map((output) => `${output.surface}:${output.detailKind}:${output.handle}`)
    .sort();
}

function expectCarriedRuntimeAnalysis(
  previous: TemplateRuntimeAnalysisEmission,
  current: TemplateRuntimeAnalysisEmission,
): void {
  expect(current).not.toBe(previous);
  for (const key of [
    'runtimeRendering',
    'expressionResourcePlan',
    'scopes',
    'controllerBind',
    'i18nTranslationBinding',
    'bindingBehavior',
    'valueConverter',
    'bindingValueChannel',
    'bindingDataFlow',
    'runtimeComposition',
  ] as const) {
    expect(current[key]).toBe(previous[key]);
  }
  expect(current.expressionWorld).not.toBe(previous.expressionWorld);
  expect(current.profile.totalMilliseconds).toBe(0);
  expect(current.profile.phases).toEqual([]);
}

function expectFamilyClosureWithdrawn(
  transition: ComputationTransition,
  outputs: readonly ComputationOutput[],
): void {
  for (const output of outputs) {
    expect(transition.publications).toContainEqual(expect.objectContaining({
      surface: output.surface,
      handle: output.handle,
      detailKind: output.detailKind,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));
  }
}

function expectFamilyClosurePublished(
  transition: ComputationTransition,
  outputs: readonly ComputationOutput[],
): void {
  for (const output of outputs) {
    expect(transition.publications).toContainEqual(expect.objectContaining({
      surface: output.surface,
      handle: output.handle,
      detailKind: output.detailKind,
      decision: KernelPublicationDecisionKind.Publish,
    }));
  }
}

function requireCommittedEmission(
  emission: AureliaAppWorldProjectEmission | null,
): AureliaAppWorldProjectEmission {
  if (emission == null) {
    throw new Error('Expected the production app replacement to expose its committed emission.');
  }
  return emission;
}

function familyCompilationsByName(
  emission: AureliaAppWorldProjectEmission,
  familyName: string,
): ReadonlyMap<string, TemplateResourceCompilationEmission> {
  const owner = emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === familyName
  )?.compilation ?? null;
  if (owner == null) {
    throw new Error(`Expected template family owner ${familyName}.`);
  }
  return new Map(emission.templates.resources
    .filter((resource) => resource.compilation.familyOwnerHandle === owner.familyOwnerHandle)
    .map((resource) => [resource.compilation.definition.name, resource.compilation]));
}

function familyCompilationNames(
  emission: AureliaAppWorldProjectEmission,
  familyName: string,
): readonly string[] {
  return [...familyCompilationsByName(emission, familyName).keys()].sort();
}

function requireCompilation(
  compilations: ReadonlyMap<string, TemplateResourceCompilationEmission>,
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = compilations.get(name) ?? null;
  if (compilation == null) {
    throw new Error(`Expected template compilation ${name}.`);
  }
  return compilation;
}

function requireNamedCompilation(
  emission: AureliaAppWorldProjectEmission,
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === name
  )?.compilation ?? null;
  if (compilation == null) {
    throw new Error(`Expected production template compilation ${name}.`);
  }
  return compilation;
}

function hasNamedCompilation(
  emission: AureliaAppWorldProjectEmission,
  name: string,
): boolean {
  return emission.templates.resources.some((resource) => resource.compilation.definition.name === name);
}

function requireCustomElementDefinition(
  emission: AureliaAppWorldProjectEmission,
  name: string,
): CustomElementDefinition {
  const definition = emission.resourceIndex.entries.find((entry) => entry.definition.name === name)
    ?.definition ?? null;
  if (!(definition instanceof CustomElementDefinition)) {
    throw new Error(`Expected custom-element definition ${name}.`);
  }
  return definition;
}

function requireCompilerRead(
  compilation: TemplateResourceCompilationEmission,
  readKind: TemplateCompilerReadKind,
  canonicalKey: string,
): TemplateCompilerReadObservation {
  const read = findCompilerRead(compilation, readKind, canonicalKey);
  if (read == null) {
    throw new Error(`Expected compiler read ${readKind}:${canonicalKey} in ${compilation.definition.name}.`);
  }
  return read;
}

function findCompilerRead(
  compilation: TemplateResourceCompilationEmission,
  readKind: TemplateCompilerReadKind,
  canonicalKey: string,
): TemplateCompilerReadObservation | null {
  return compilation.registeredReads.find((candidate): candidate is TemplateCompilerReadObservation =>
    candidate instanceof TemplateCompilerReadObservation
      && candidate.readKind === readKind
      && candidate.canonicalKey === canonicalKey
  ) ?? null;
}

function ownerPlanNames(emission: AureliaAppWorldProjectEmission): readonly string[] {
  return emission.templates.cohortPlan.ownerPlans.map((owner) => owner.definition.name).sort();
}

function stableCompilationHandles(compilation: TemplateResourceCompilationEmission): object {
  return {
    definition: compilation.definition.productHandle,
    compilationUnit: compilation.unit.compilationUnit.productHandle,
    templateSource: compilation.unit.templateSource.productHandle,
    compiledTemplate: compilation.compiledTemplate.compiledTemplate.productHandle,
  };
}

function observerEvents(
  world: TemplateResourceCompilationEmission['compilerWorld'],
): readonly string[] | null {
  return world.world.nodeObserverLocatorConfiguration?.nodeConfigs.find(
    (config) => config.tagName === 'MY-ELEMENT' && config.propertyName === 'value',
  )?.config.eventNames ?? null;
}

function sanitizerIssues(emission: AureliaAppWorldProjectEmission): readonly RuntimeValueConverterIssueKind[] {
  return emission.templates.resources.flatMap((resource) =>
    resource.runtimeAnalysis.valueConverter.issues
      .map((issue) => issue.issueKind)
      .filter((kind): kind is RuntimeValueConverterIssueKind.SanitizerMethodNotImplemented =>
        kind === RuntimeValueConverterIssueKind.SanitizerMethodNotImplemented
      )
  );
}

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
    <nested-local nested-value.bind="value"></nested-local>` : '    <span>${value}</span>'}
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

function duplicateLocalTemplateMarkup(): string {
  return `<template>
  <template as-custom-element="local-chip"><span>one</span></template>
  <template as-custom-element="local-chip"><span>two</span></template>
  <div>owner content</div>
</template>
`;
}

function pressureFixtureRoot(name: string): string {
  return path.resolve(fileURLToPath(new URL(`../fixtures/pressure/${name}`, import.meta.url)));
}

function projectInputPathReadKey(
  kind: SemanticRuntimeProjectInputReadKind,
  fileName: string,
): string {
  const normalized = path.resolve(fileName).replace(/\\/g, '/');
  const locus = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  return `project-input:${kind}:${locus}`;
}
