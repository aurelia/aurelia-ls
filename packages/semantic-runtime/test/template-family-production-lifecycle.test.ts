import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  SemanticApp,
  SemanticRuntime,
  createSemanticRuntime,
} from '../src/api/runtime.js';
import type { AureliaAppWorldProjectEmission } from '../src/configuration/app-world-project-pass.js';
import {
  ComputationCommitState,
  type ComputationState,
  type ComputationTransition,
} from '../src/kernel/computation-lifecycle.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeSourceTextOverlay,
} from '../src/kernel/project-input.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import {
  TemplateCompilerReadKind,
  TemplateCompilerReadObservation,
} from '../src/template/compiler-read-view.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';

class MutableProjectSourceOverlay implements SemanticRuntimeSourceTextOverlay {
  private readonly valuesByFileName = new Map<string, string | null>();
  private failedFileName: string | null = null;

  write(fileName: string, sourceText: string): void {
    this.valuesByFileName.set(path.resolve(fileName), sourceText);
  }

  remove(fileName: string): void {
    this.valuesByFileName.set(path.resolve(fileName), null);
  }

  fail(fileName: string): void {
    this.failedFileName = path.resolve(fileName);
  }

  resume(): void {
    this.failedFileName = null;
  }

  readFile(fileName: string): string | undefined {
    const resolved = path.resolve(fileName);
    if (resolved === this.failedFileName) {
      throw new Error('Injected project-source failure.');
    }
    return this.valuesByFileName.get(resolved) ?? undefined;
  }

  fileExists(fileName: string): boolean | undefined {
    const value = this.valuesByFileName.get(path.resolve(fileName));
    return value === undefined ? undefined : value !== null;
  }
}

describe('production template-family lifecycle', () => {
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

function requireCompilerRead(
  compilation: TemplateResourceCompilationEmission,
  readKind: TemplateCompilerReadKind,
  canonicalKey: string,
): TemplateCompilerReadObservation {
  const read = compilation.registeredReads.find((candidate): candidate is TemplateCompilerReadObservation =>
    candidate instanceof TemplateCompilerReadObservation
      && candidate.readKind === readKind
      && candidate.canonicalKey === canonicalKey
  ) ?? null;
  if (read == null) {
    throw new Error(`Expected compiler read ${readKind}:${canonicalKey} in ${compilation.definition.name}.`);
  }
  return read;
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
