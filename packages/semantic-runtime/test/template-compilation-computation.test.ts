import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SourceFileAddress, SourceLanguage, SourceSpanAddress } from '../src/kernel/address.js';
import type { AddressHandle } from '../src/kernel/handles.js';
import { KernelStore, KernelStoreBatch } from '../src/kernel/store.js';
import {
  ComputationCommitState,
  ComputationLifecycleRegistry,
} from '../src/kernel/computation-lifecycle.js';
import {
  KernelPublicationDecisionKind,
  KernelPublicationPlan,
} from '../src/kernel/publication.js';
import { SourceTextSnapshotAuthority, SourceTextSnapshotState } from '../src/kernel/source-text-snapshot.js';
import {
  CustomElementDefinition,
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
} from '../src/resources/custom-element-definition.js';
import {
  TemplateCompilerReadKind,
  TemplateCompilerReadObservation,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import {
  TemplateResourceResolverService,
  TemplateResourceScope,
} from '../src/template/compiler-world.js';
import { TemplateCompilerWorldEmission } from '../src/template/compiler-world-materializer.js';
import { TemplateVisibleResource } from '../src/template/compiler-world-reference.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { compareCompiledTemplateDetails } from '../src/template/compiled-template-comparison.js';
import { CompiledTemplate, CompiledTemplateState } from '../src/template/compiled-template.js';
import {
  TemplateCompilationCohortKind,
  TemplateCompilationComputationRequest,
  TemplateCompilationComputationService,
} from '../src/template/template-compilation-computation.js';

class MutableTemplateSourceProvider {
  private readonly sourceTextByFileName = new Map<string, string>();

  write(fileName: string, sourceText: string): void {
    this.sourceTextByFileName.set(path.resolve(fileName), sourceText);
  }

  remove(fileName: string): void {
    this.sourceTextByFileName.delete(path.resolve(fileName));
  }

  readFile(fileName: string): string | undefined {
    return this.sourceTextByFileName.get(path.resolve(fileName));
  }

  fileExists(fileName: string): boolean {
    return this.sourceTextByFileName.has(path.resolve(fileName));
  }
}

describe('template compilation computation', () => {
  test('refreshes a compiled-template witness when a stable address handle moves', () => {
    const store = new KernelStore('compiled-template-witness-comparison');
    const sourceFileHandle = store.handles.address('source-file');
    const sourceSpanHandle = store.handles.address('source-span');
    const runtime = new CompiledTemplate(
      store.handles.product('compiled'),
      store.handles.identity('compiled'),
      store.handles.product('html'),
      CompiledTemplateState.Complete,
      [],
      null,
      sourceSpanHandle,
    );
    const sourceFile = new SourceFileAddress(
      sourceFileHandle,
      'test',
      'src/app.html',
      SourceLanguage.Html,
    );
    const previousSpan = new SourceSpanAddress(
      sourceSpanHandle,
      sourceFile.handle,
      0,
      10,
    );
    const nextSpan = new SourceSpanAddress(
      sourceSpanHandle,
      sourceFile.handle,
      4,
      14,
    );

    expect(compareCompiledTemplateDetails(runtime, runtime, {
      readPrevious: (handle) => handle === previousSpan.handle ? previousSpan : sourceFile,
      readNext: (handle) => handle === nextSpan.handle ? nextSpan : sourceFile,
    })).toBe(KernelPublicationDecisionKind.RefreshWitness);
  });

  test('replaces one real front-door publication without exposing stale or partial worlds', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templateFileName = path.join(fixtureRoot, 'src/app.html');
    const originalText = readFileSync(templateFileName, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-computation',
    });
    const app = await runtime.openApp();
    const baseline = app.emission.templates.resources[0]?.compilation;
    expect(baseline).toBeDefined();
    if (baseline == null || baseline.definition.template == null) {
      throw new Error('Expected the fixture app template to be compiled.');
    }

    const store = runtime.workspace.store;
    const lifecycle = new ComputationLifecycleRegistry(store);
    const sourceProvider = new MutableTemplateSourceProvider();
    const sourceAuthority = new SourceTextSnapshotAuthority(sourceProvider);
    const compiler = new TemplateCompilationComputationService(store, lifecycle, sourceAuthority);
    const compilerWorldAuthority = TemplateCompilerWorldAuthority.fixed(baseline.compilerWorld);
    const request = (cohortKind: TemplateCompilationCohortKind) =>
      new TemplateCompilationComputationRequest(
        app.project.projectKey,
        app.project.rootDir,
        cohortKind,
        baseline.analysisContextProductHandle,
        cohortKind === TemplateCompilationCohortKind.App
          ? baseline.appRootDefinitionProductHandle
          : null,
        compilerWorldAuthority,
        baseline.definition,
      );
    const appRequest = request(TemplateCompilationCohortKind.App);
    const baselineProduct = store.read(baseline.compiledTemplate.compiledTemplate.productHandle);

    sourceProvider.write(templateFileName, originalText);
    const firstAttempt = compiler.prepare(appRequest);
    const firstCandidate = firstAttempt.candidateCompilation;
    expect(firstCandidate).not.toBeNull();
    if (firstCandidate == null) {
      throw new Error('Expected the first computation-backed compilation candidate.');
    }
    expect(store.read(firstCandidate.unit.templateSource.productHandle)).toBeNull();

    const first = firstAttempt.commit();
    expect(first.commit.state).toBe(ComputationCommitState.Committed);
    expect(first.candidateCompilation).toBe(firstCandidate);
    expect(store.productDetails.read(
      TemplateProductDetails.Source,
      firstCandidate.unit.templateSource.productHandle,
    )?.markup).toBe(originalText);
    const authoredSourceAddressHandle = firstCandidate.unit.templateSource.sourceAddressHandle;
    expect(authoredSourceAddressHandle).not.toBeNull();
    expect(authoredSourceAddressHandle == null ? null : store.readAddress(authoredSourceAddressHandle))
      .toEqual(expect.objectContaining({ start: 0, end: originalText.length }));
    expect(lifecycle.readState(firstAttempt.computationId)?.reads.map((read) => read.domain)).toEqual(
      expect.arrayContaining(['source-text', 'template-compiler', 'kernel-record']),
    );

    const canonicalCompiledTemplate = store.productDetails.read(
      TemplateProductDetails.CompiledTemplate,
      firstCandidate.compiledTemplate.compiledTemplate.productHandle,
    );
    const equalAttempt = compiler.prepare(appRequest);
    const equal = equalAttempt.commit();
    expect(equal.commit.transition.publications).toContainEqual(expect.objectContaining({
      surface: 'product-detail',
      detailKind: TemplateProductDetails.CompiledTemplate.detailKind,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(store.productDetails.read(
      TemplateProductDetails.CompiledTemplate,
      firstCandidate.compiledTemplate.compiledTemplate.productHandle,
    )).toBe(canonicalCompiledTemplate);
    expect(equal.candidateCompilation?.compiledTemplate.compiledTemplate).not.toBe(canonicalCompiledTemplate);

    const italicText = replaceFirstParagraphTag(originalText, 'i');
    sourceProvider.write(templateFileName, italicText);
    const secondAttempt = compiler.prepare(appRequest);
    expect(secondAttempt.computationId).toBe(firstAttempt.computationId);
    expect(store.productDetails.read(
      TemplateProductDetails.Source,
      firstCandidate.unit.templateSource.productHandle,
    )?.markup).toBe(originalText);

    const second = secondAttempt.commit();
    expect(second.commit.state).toBe(ComputationCommitState.Committed);
    expect(first.source).not.toBeNull();
    expect(second.source).not.toBeNull();
    expect(second.commit.transition.changedReads).toContainEqual(expect.objectContaining({
      domain: 'source-text',
      previousRevision: first.source?.observedRevision,
      nextRevision: second.source?.observedRevision,
    }));
    expect(second.commit.transition.publications).toContainEqual(expect.objectContaining({
      surface: 'product-detail',
      detailKind: TemplateProductDetails.Source.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));
    expect(store.productDetails.read(
      TemplateProductDetails.Source,
      firstCandidate.unit.templateSource.productHandle,
    )?.markup).toBe(italicText);
    expect(store.read(baseline.compiledTemplate.compiledTemplate.productHandle)).toBe(baselineProduct);

    const expandedText = replaceFirstParagraphTag(originalText, 'section');
    sourceProvider.write(templateFileName, expandedText);
    const expandedAttempt = compiler.prepare(appRequest);
    const expanded = expandedAttempt.commit();
    expect(expanded.commit.state).toBe(ComputationCommitState.Committed);
    expect(expanded.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: authoredSourceAddressHandle,
      decision: KernelPublicationDecisionKind.RefreshWitness,
    }));
    expect(authoredSourceAddressHandle == null ? null : store.readAddress(authoredSourceAddressHandle))
      .toEqual(expect.objectContaining({ start: 0, end: expandedText.length }));

    const boldText = replaceFirstParagraphTag(originalText, 'b');
    sourceProvider.write(templateFileName, boldText);
    const staleAttempt = compiler.prepare(appRequest);
    const underlineText = replaceFirstParagraphTag(originalText, 'u');
    sourceProvider.write(templateFileName, underlineText);
    const winningAttempt = compiler.prepare(appRequest);
    expect(winningAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
    expect(staleAttempt.commit().commit.state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(store.productDetails.read(
      TemplateProductDetails.Source,
      firstCandidate.unit.templateSource.productHandle,
    )?.markup).toBe(underlineText);

    const strikeText = replaceFirstParagraphTag(originalText, 's');
    sourceProvider.write(templateFileName, strikeText);
    const changedInputAttempt = compiler.prepare(appRequest);
    const quoteText = replaceFirstParagraphTag(originalText, 'q');
    sourceProvider.write(templateFileName, quoteText);
    const changedInput = changedInputAttempt.commit();
    expect(changedInput.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(changedInput.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'source-text',
      changedFacets: ['content'],
    }));
    expect(store.productDetails.read(
      TemplateProductDetails.Source,
      firstCandidate.unit.templateSource.productHandle,
    )?.markup).toBe(underlineText);

    sourceProvider.remove(templateFileName);
    const absentAttempt = compiler.prepare(appRequest);
    expect(absentAttempt.source?.state).toBe(SourceTextSnapshotState.Absent);
    const absent = absentAttempt.commit();
    expect(absent.commit.state).toBe(ComputationCommitState.Committed);
    expect(absent.candidateCompilation).toBeNull();
    expect(absent.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: firstCandidate.unit.templateSource.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));
    expect(store.read(firstCandidate.unit.templateSource.productHandle)).toBeNull();

    sourceProvider.write(templateFileName, originalText);
    const restoredAttempt = compiler.prepare(appRequest);
    expect(restoredAttempt.computationId).toBe(firstAttempt.computationId);
    expect(restoredAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(
      TemplateProductDetails.Source,
      firstCandidate.unit.templateSource.productHandle,
    )?.markup).toBe(originalText);

    const authoringAttempt = compiler.prepare(
      request(TemplateCompilationCohortKind.Authoring),
    );
    expect(authoringAttempt.computationId).not.toBe(firstAttempt.computationId);
    expect(authoringAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
    expect(authoringAttempt.candidateCompilation?.unit.templateSource.productHandle)
      .not.toBe(firstCandidate.unit.templateSource.productHandle);
    expect(store.read(firstCandidate.unit.templateSource.productHandle)).not.toBeNull();
  }, 30_000);

  test('replaces real positive and negative resource reads when authored lookup keys change', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
    const templateFileName = path.join(fixtureRoot, 'src/routes/item-list-route.html');
    const originalText = readFileSync(templateFileName, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-computation:lookup-transition',
    });
    const app = await runtime.openApp();
    const baseline = app.emission.templates.resources
      .find((resource) => resource.compilation.definition.name === 'item-list-route')
      ?.compilation;
    expect(baseline).toBeDefined();
    if (baseline == null || baseline.definition.template == null) {
      throw new Error('Expected the routed item-list template to be compiled.');
    }

    const store = runtime.workspace.store;
    const lifecycle = new ComputationLifecycleRegistry(store);
    const sourceProvider = new MutableTemplateSourceProvider();
    let currentCompilerWorld = baseline.compilerWorld;
    const compilerWorldAuthority = new TemplateCompilerWorldAuthority(() => currentCompilerWorld);
    const compiler = new TemplateCompilationComputationService(
      store,
      lifecycle,
      new SourceTextSnapshotAuthority(sourceProvider),
    );
    const request = new TemplateCompilationComputationRequest(
      app.project.projectKey,
      app.project.rootDir,
      TemplateCompilationCohortKind.App,
      baseline.analysisContextProductHandle,
      baseline.appRootDefinitionProductHandle,
      compilerWorldAuthority,
      baseline.definition,
    );

    sourceProvider.write(templateFileName, originalText);
    const firstAttempt = compiler.prepare(request);
    const itemCardRead = firstAttempt.candidateCompilation?.registeredReads.find((read) =>
      read instanceof TemplateCompilerReadObservation
      && read.readKind === TemplateCompilerReadKind.ElementResource
      && read.canonicalKey === 'item-card'
    );
    expect(itemCardRead?.resultParts.length).toBeGreaterThan(0);
    expect(firstAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    currentCompilerWorld = compilerWorldWithoutResource(
      baseline.compilerWorld,
      (resource) => resource.name === 'item-card',
    );
    const absentItemCardAttempt = compiler.prepare(request);
    const absentItemCardRead = absentItemCardAttempt.candidateCompilation?.registeredReads.find((read) =>
      read instanceof TemplateCompilerReadObservation
      && read.readKind === TemplateCompilerReadKind.ElementResource
      && read.canonicalKey === 'item-card'
    );
    expect(absentItemCardRead?.readKey).toBe(itemCardRead?.readKey);
    expect(absentItemCardRead?.resultParts).toEqual([]);
    const absentItemCard = absentItemCardAttempt.commit();
    expect(absentItemCard.commit.state).toBe(ComputationCommitState.Committed);
    expect(absentItemCard.commit.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: itemCardRead?.readKey,
      previousRevision: itemCardRead?.observedRevision,
      nextRevision: absentItemCardRead?.observedRevision,
    }));

    currentCompilerWorld = baseline.compilerWorld;
    const restoredItemCardAttempt = compiler.prepare(request);
    const restoredItemCardRead = restoredItemCardAttempt.candidateCompilation?.registeredReads.find((read) =>
      read instanceof TemplateCompilerReadObservation
      && read.readKind === TemplateCompilerReadKind.ElementResource
      && read.canonicalKey === 'item-card'
    );
    expect(restoredItemCardRead?.resultParts.length).toBeGreaterThan(0);
    const restoredItemCard = restoredItemCardAttempt.commit();
    expect(restoredItemCard.commit.state).toBe(ComputationCommitState.Committed);
    expect(restoredItemCard.commit.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: itemCardRead?.readKey,
      previousRevision: absentItemCardRead?.observedRevision,
      nextRevision: restoredItemCardRead?.observedRevision,
    }));

    const movedTemplateFileName = path.join(fixtureRoot, 'src/routes/item-list-route-moved.html');
    const movedFileHandle = store.handles.address('test:moved-template-file');
    const movedSpanHandle = store.handles.address('test:moved-template-span');
    const sourceAddressLocus = {
      kind: 'test-source-address',
      reconciliationKey: 'item-list-route-moved',
      summary: 'Mutable external template source address used by the lifecycle race proof.',
    };
    const publishMovedTemplateAddress = (fileName: string) => {
      const run = lifecycle.begin(sourceAddressLocus);
      run.publish(new KernelPublicationPlan(new KernelStoreBatch([
        new SourceFileAddress(
          movedFileHandle,
          app.project.projectKey,
          path.relative(app.project.rootDir, fileName),
          SourceLanguage.Html,
        ),
        new SourceSpanAddress(movedSpanHandle, movedFileHandle, 0, originalText.length),
      ], `test:moved-template-source:${path.basename(fileName)}`)));
      return run.commit();
    };
    expect(publishMovedTemplateAddress(movedTemplateFileName).state).toBe(ComputationCommitState.Committed);
    const movedDefinition = customElementDefinitionWithTemplate(
      baseline.definition,
      new CustomElementTemplateDefinition(
        CustomElementTemplateKind.Markup,
        originalText,
        movedSpanHandle,
      ),
    );
    currentCompilerWorld = compilerWorldWithDefinition(
      baseline.compilerWorld,
      baseline.definition,
      movedDefinition,
    );
    sourceProvider.write(movedTemplateFileName, originalText);
    const movedSourceAttempt = compiler.prepare(request);
    expect(movedSourceAttempt.computationId).toBe(firstAttempt.computationId);
    expect(movedSourceAttempt.source?.fileName).toBe(path.resolve(movedTemplateFileName));
    expect(movedSourceAttempt.candidateCompilation?.definition).toBe(movedDefinition);
    const movedSource = movedSourceAttempt.commit();
    expect(movedSource.commit.state).toBe(ComputationCommitState.Committed);
    expect(movedSource.commit.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: `source:${path.resolve(templateFileName)}`,
      nextRevision: null,
    }));
    expect(movedSource.commit.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: `source:${path.resolve(movedTemplateFileName)}`,
      previousRevision: null,
    }));

    const staleAddressAttempt = compiler.prepare(request);
    const redirectedTemplateFileName = path.join(fixtureRoot, 'src/routes/item-list-route-redirected.html');
    sourceProvider.write(redirectedTemplateFileName, originalText);
    expect(publishMovedTemplateAddress(redirectedTemplateFileName).state).toBe(ComputationCommitState.Committed);
    const staleAddress = staleAddressAttempt.commit();
    expect(staleAddress.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(staleAddress.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'kernel-record',
      readKey: `kernel-record:${movedFileHandle}`,
      changedFacets: ['record'],
    }));

    const redirectedSourceAttempt = compiler.prepare(request);
    expect(redirectedSourceAttempt.source?.fileName).toBe(path.resolve(redirectedTemplateFileName));
    expect(redirectedSourceAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    currentCompilerWorld = baseline.compilerWorld;
    const restoredSourceAttempt = compiler.prepare(request);
    expect(restoredSourceAttempt.computationId).toBe(firstAttempt.computationId);
    expect(restoredSourceAttempt.source?.fileName).toBe(path.resolve(templateFileName));
    expect(restoredSourceAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    const missingResourceText = originalText.replaceAll('item-card', 'fake-card');
    expect(missingResourceText.length).toBe(originalText.length);
    sourceProvider.write(templateFileName, missingResourceText);
    const secondAttempt = compiler.prepare(request);
    const fakeCardRead = secondAttempt.candidateCompilation?.registeredReads.find((read) =>
      read instanceof TemplateCompilerReadObservation
      && read.readKind === TemplateCompilerReadKind.ElementResource
      && read.canonicalKey === 'fake-card'
    );
    expect(fakeCardRead?.resultParts).toEqual([]);

    const second = secondAttempt.commit();
    expect(second.commit.state).toBe(ComputationCommitState.Committed);
    expect(second.commit.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: itemCardRead?.readKey,
      nextRevision: null,
    }));
    expect(second.commit.transition.changedReads).toContainEqual(expect.objectContaining({
      readKey: fakeCardRead?.readKey,
      previousRevision: null,
    }));

    const alternateCompilerWorld = app.emission.templates.resources
      .map((resource) => resource.compilation.compilerWorld)
      .find((world) => world.world.identityHandle !== baseline.compilerWorld.world.identityHandle);
    expect(alternateCompilerWorld).toBeDefined();
    if (alternateCompilerWorld == null) {
      throw new Error('Expected a second compiler cohort in the routed storefront fixture.');
    }
    sourceProvider.write(templateFileName, originalText);
    const oldWorldAttempt = compiler.prepare(request);
    currentCompilerWorld = alternateCompilerWorld;
    const oldWorld = oldWorldAttempt.commit();
    expect(oldWorld.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(oldWorld.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'template-compiler',
      changedFacets: expect.arrayContaining(['scope']),
    }));

    currentCompilerWorld = baseline.compilerWorld;
    const staleScopeWitnessAttempt = compiler.prepare(request);
    currentCompilerWorld = compilerWorldWithScopeSource(baseline.compilerWorld, movedSpanHandle);
    const staleScopeWitness = staleScopeWitnessAttempt.commit();
    expect(staleScopeWitness.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(staleScopeWitness.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'template-compiler',
      changedFacets: expect.arrayContaining(['scope']),
    }));

    const compilerWorldWithoutOwner = compilerWorldWithoutResource(
      baseline.compilerWorld,
      (resource) => resource.definitionProductHandle === baseline.definition.productHandle,
    );
    currentCompilerWorld = compilerWorldWithoutOwner;
    const staleRemovedOwnerAttempt = compiler.prepare(request);
    expect(staleRemovedOwnerAttempt.source).toBeNull();
    expect(staleRemovedOwnerAttempt.candidateCompilation).toBeNull();
    currentCompilerWorld = baseline.compilerWorld;
    const staleRemovedOwner = staleRemovedOwnerAttempt.commit();
    expect(staleRemovedOwner.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(staleRemovedOwner.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'template-compiler',
    }));
    const retainedSourceHandle = firstAttempt.candidateCompilation?.unit.templateSource.productHandle ?? null;
    expect(retainedSourceHandle).not.toBeNull();
    expect(retainedSourceHandle == null ? null : store.read(retainedSourceHandle)).not.toBeNull();

    currentCompilerWorld = compilerWorldWithoutOwner;
    const removedOwnerAttempt = compiler.prepare(request);
    expect(removedOwnerAttempt.source).toBeNull();
    expect(removedOwnerAttempt.candidateCompilation).toBeNull();
    const removedOwner = removedOwnerAttempt.commit();
    expect(removedOwner.commit.state).toBe(ComputationCommitState.Committed);
    expect(removedOwner.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: firstAttempt.candidateCompilation?.unit.templateSource.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    currentCompilerWorld = baseline.compilerWorld;
    const restoredOwnerAttempt = compiler.prepare(request);
    expect(restoredOwnerAttempt.source?.state).toBe(SourceTextSnapshotState.Present);
    expect(restoredOwnerAttempt.candidateCompilation).not.toBeNull();
    expect(restoredOwnerAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
  }, 30_000);
});

function compilerWorldWithoutResource(
  world: TemplateCompilerWorldEmission,
  exclude: (resource: TemplateVisibleResource) => boolean,
): TemplateCompilerWorldEmission {
  const scopedResources = world.resourceScope.resources.filter((resource) => !exclude(resource));
  const resolverResources = world.resourceResolver.resources.filter((resource) => !exclude(resource));
  return compilerWorldWithResourceSets(world, scopedResources, resolverResources);
}

function compilerWorldWithDefinition(
  world: TemplateCompilerWorldEmission,
  previous: CustomElementDefinition,
  next: CustomElementDefinition,
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
  return compilerWorldWithResourceSets(
    world,
    world.resourceScope.resources.map(replace),
    world.resourceResolver.resources.map(replace),
  );
}

function compilerWorldWithScopeSource(
  world: TemplateCompilerWorldEmission,
  sourceAddressHandle: AddressHandle,
): TemplateCompilerWorldEmission {
  return compilerWorldWithResourceSets(
    world,
    world.resourceScope.resources,
    world.resourceResolver.resources,
    sourceAddressHandle,
  );
}

function compilerWorldWithResourceSets(
  world: TemplateCompilerWorldEmission,
  scopedResources: readonly TemplateVisibleResource[],
  resolverResources: readonly TemplateVisibleResource[],
  scopeSourceAddressHandle = world.resourceScope.sourceAddressHandle,
): TemplateCompilerWorldEmission {
  return new TemplateCompilerWorldEmission(
    world.container,
    world.world,
    new TemplateResourceScope(
      world.resourceScope.productHandle,
      world.resourceScope.identityHandle,
      world.resourceScope.container,
      scopedResources,
      world.resourceScope.syntaxResources,
      scopeSourceAddressHandle,
      world.resourceScope.fieldProvenance,
    ),
    world.templateCompiler,
    new TemplateResourceResolverService(
      world.resourceResolver.productHandle,
      world.resourceResolver.identityHandle,
      world.resourceResolver.container,
      resolverResources,
      world.resourceResolver.sourceAddressHandle,
      world.resourceResolver.fieldProvenance,
    ),
    world.expressionParser,
    world.attributeMapper,
    world.nodeObserverLocatorConfiguration,
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

function customElementDefinitionWithTemplate(
  definition: CustomElementDefinition,
  template: CustomElementTemplateDefinition,
): CustomElementDefinition {
  return new CustomElementDefinition(
    definition.productHandle,
    definition.identityHandle,
    definition.sourceAddressHandle,
    definition.target,
    definition.name,
    definition.aliases,
    definition.key,
    definition.capture,
    template,
    definition.instructions,
    definition.dependencies,
    definition.injectable,
    definition.needsCompile,
    definition.surrogates,
    definition.bindables,
    definition.containerless,
    definition.shadowOptions,
    definition.hasSlots,
    definition.enhance,
    definition.watches,
    definition.strict,
    definition.processContent,
    definition.contributions,
    definition.fieldProvenance,
    definition.nameSourceAddressHandle,
  );
}

function replaceFirstParagraphTag(sourceText: string, tagName: string): string {
  return sourceText.replace('<p>', `<${tagName}>`).replace('</p>', `</${tagName}>`);
}
