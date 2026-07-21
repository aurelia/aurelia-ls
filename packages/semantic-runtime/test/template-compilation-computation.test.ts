import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { AureliaAppWorldEmission } from '../src/configuration/app-world-composer.js';
import { SourceFileAddress, SourceLanguage, SourceSpanAddress } from '../src/kernel/address.js';
import type { AddressHandle, ProductHandle } from '../src/kernel/handles.js';
import { KernelStore, KernelStoreBatch } from '../src/kernel/store.js';
import {
  ComputationCommitState,
  computationProductDetailReadKey,
  computationRecordReadKey,
} from '../src/kernel/computation-lifecycle.js';
import {
  KernelPublicationDecisionKind,
  KernelPublicationPlan,
} from '../src/kernel/publication.js';
import { SourceTextSnapshotAuthority, SourceTextSnapshotState } from '../src/kernel/source-text-snapshot.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
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
  TemplateCompilationCohort,
  TemplateCompilationCohortKind,
  TemplateCompilationLocus,
  TemplateCompilationCohortSetAuthority,
} from '../src/template/template-compilation-cohort.js';
import {
  TemplateCompilationComputationRequest,
  TemplateCompilationComputationService,
} from '../src/template/template-compilation-computation.js';
import { TemplateCompilationProjectPass } from '../src/template/template-compilation-project-pass.js';
import { TemplateTypeSystemOverlayBuilder } from '../src/template/template-type-system-overlay.js';
import { ObservationProductDetails } from '../src/observation/product-details.js';

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

class OverlayTemplateSourceProvider {
  private readonly sourceTextByFileName = new Map<string, string>();

  write(fileName: string, sourceText: string): void {
    this.sourceTextByFileName.set(path.resolve(fileName), sourceText);
  }

  clear(fileName: string): void {
    this.sourceTextByFileName.delete(path.resolve(fileName));
  }

  readFile(fileName: string): string | undefined {
    return this.sourceTextByFileName.get(path.resolve(fileName));
  }

  fileExists(fileName: string): boolean | undefined {
    return this.sourceTextByFileName.has(path.resolve(fileName)) ? true : undefined;
  }
}

describe('template compilation computation', () => {
  test('keeps a full compiler and runtime analysis generation invisible until one publication', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-dynamic-composition');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-project-generation',
    });
    const app = await runtime.openApp({
      analysisDepth: 'binding-observation',
      telemetry: {
        capturePhaseKernel: true,
        capturePhaseKernelBreakdowns: true,
        capturePhaseDetailDensity: true,
        captureFineGrainedPhases: true,
      },
    });
    const stagedPublicationPhase = app.emission.templates.profile.phases.find((phase) =>
      (phase.kernel?.delta.totalRecords ?? 0) > 0
      && (phase.kernel?.recordKinds?.length ?? 0) > 0
      && (phase.kernel?.productDetailDensityDelta?.length ?? 0) > 0
    );
    expect(stagedPublicationPhase).toBeDefined();
    const store = runtime.workspace.store;
    const lifecycle = runtime.computationLifecycle;
    const productionGeneration = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
    const productionResource = app.emission.templates.resources.find((candidate) =>
      candidate.runtimeAnalysis.runtimeRendering.bindings.length > 0
    );
    expect(productionGeneration).not.toBeNull();
    expect(productionResource).toBeDefined();
    if (productionGeneration == null || productionResource == null) {
      throw new Error('Expected a committed production template family generation.');
    }
    const productionFamilyLocus = new TemplateCompilationLocus(
      app.project.projectKey,
      productionResource.compilation.familyOwnerHandle,
    );
    const productionFamily = lifecycle.readState(productionGeneration.computationId)?.children.find((child) =>
      child.locus.kind === productionFamilyLocus.kind
      && child.locus.reconciliationKey === productionFamilyLocus.reconciliationKey
    );
    expect(productionFamily?.reads).toContainEqual(expect.objectContaining({ domain: 'source-text' }));
    expect(productionFamily?.outputs.some(
      (output) => output.handle === productionResource.compilation.unit.templateSource.productHandle,
    )).toBe(true);
    const run = lifecycle.begin({
      kind: 'template-analysis-project-generation-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Full compiler/runtime transaction and post-commit expression-generation proof.',
    });
    const committedRecordCount = store.readAllRecords().length;
    const emission = new TemplateCompilationProjectPass(store, run, runtime.frameworkSupport).compile(
      app.emission.appWorld,
      app.emission.typeSystem,
      app.emission.resourceIndex,
      app.emission.routeContexts,
      {
        projectKey: `${app.project.projectKey}:staged-generation`,
        evaluation: app.emission.evaluation,
        stateStores: app.emission.state.readStores(),
        runtimeAnalysisDepth: app.emission.analysisDepth,
      },
    );
    const resource = emission.resources.find((candidate) =>
      candidate.runtimeAnalysis.runtimeRendering.bindings.length > 0
    );
    expect(resource).toBeDefined();
    if (resource == null) {
      throw new Error('Expected a staged template resource with runtime bindings.');
    }
    const source = resource.compilation.unit.templateSource;
    const binding = resource.runtimeAnalysis.runtimeRendering.bindings[0]!;
    const rootScope = resource.runtimeAnalysis.scopes.rootScope;
    const composition = emission.resources
      .flatMap((candidate) => candidate.runtimeAnalysis.runtimeComposition.contexts)[0];
    expect(composition).toBeDefined();
    if (composition == null) {
      throw new Error('Expected the staged fixture to materialize a runtime composition context.');
    }

    expect(store.readAllRecords()).toHaveLength(committedRecordCount);
    expect(store.read(source.productHandle)).toBeNull();
    expect(store.productDetails.read(TemplateProductDetails.Source, source.productHandle)).toBeNull();
    expect(store.productDetails.read(TemplateProductDetails.RuntimeBinding, binding.productHandle)).toBeNull();
    expect(store.productDetails.read(TemplateProductDetails.CompositionContext, composition.productHandle)).toBeNull();
    expect(run.read(source.productHandle)).not.toBeNull();
    expect(run.readProductDetail(TemplateProductDetails.Source, source.productHandle)).toBe(source);
    expect(run.readProductDetail(TemplateProductDetails.RuntimeBinding, binding.productHandle)).toBe(binding);
    expect(run.readProductDetail(TemplateProductDetails.CompositionContext, composition.productHandle)).toBe(composition);
    expect(run.read(rootScope.productHandle)).not.toBeNull();
    expect(emission.expressionWorld.projector.publication).toBe(run);

    expect(run.commit().state).toBe(ComputationCommitState.Committed);
    const state = lifecycle.readState(run.computationId);
    const familyLocus = new TemplateCompilationLocus(
      `${app.project.projectKey}:staged-generation`,
      resource.compilation.familyOwnerHandle,
    );
    const family = state?.children.find((child) =>
      child.locus.kind === familyLocus.kind
      && child.locus.reconciliationKey === familyLocus.reconciliationKey
    );
    expect(family).toBeDefined();
    if (family == null) {
      throw new Error('Expected the compiled resource family to own one child manifest.');
    }
    const remainder = state?.children.find((child) => child.locus.kind === 'computation-remainder');
    expect(remainder).toBeDefined();
    if (remainder == null) {
      throw new Error('Expected project-wide runtime analysis to remain in the outer computation remainder.');
    }
    expect(family.outputs.map((output) => output.readKey)).toEqual(expect.arrayContaining([
      computationRecordReadKey(source.productHandle),
      computationProductDetailReadKey(source.productHandle),
    ]));
    expect(family.outputs.map((output) => output.readKey)).not.toEqual(expect.arrayContaining([
      computationRecordReadKey(binding.productHandle),
      computationProductDetailReadKey(binding.productHandle),
      computationRecordReadKey(rootScope.productHandle),
    ]));
    expect(remainder.outputs.map((output) => output.readKey)).toEqual(expect.arrayContaining([
      computationRecordReadKey(binding.productHandle),
      computationProductDetailReadKey(binding.productHandle),
      computationRecordReadKey(rootScope.productHandle),
    ]));
    const runtimeInputHandles = [
      resource.compilation.definition.productHandle,
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
    ].filter((handle): handle is ProductHandle => handle != null);
    const remainderReadKeys = [
      ...remainder.reads.map((read) => read.readKey),
      ...remainder.candidateReads.map((read) => read.readKey),
    ];
    const familyOutputKeys = new Set(family.outputs.map((output) => output.readKey));
    const crossChildRuntimeInputKeys = runtimeInputHandles
      .flatMap((handle) => [computationRecordReadKey(handle), computationProductDetailReadKey(handle)])
      .filter((readKey) => familyOutputKeys.has(readKey));
    expect(crossChildRuntimeInputKeys.length).toBeGreaterThan(0);
    expect(remainderReadKeys).toEqual(expect.arrayContaining(crossChildRuntimeInputKeys));
    expect(state?.children.filter((child) =>
      child.reads.length === 0
      && child.candidateReads.length === 0
      && child.openReads.length === 0
      && child.outputs.length === 0
    )).toEqual([]);
    expect(store.productDetails.read(TemplateProductDetails.Source, source.productHandle)).toBe(source);
    expect(store.productDetails.read(TemplateProductDetails.RuntimeBinding, binding.productHandle)).toBe(binding);
    expect(store.productDetails.read(TemplateProductDetails.CompositionContext, composition.productHandle)).toBe(composition);
    expect(store.read(rootScope.productHandle)).not.toBeNull();
    expect(() => emission.expressionWorld.freshInquiryGeneration()).toThrow(/already finished/);
    const generationAuthority = lifecycle.admitCommittedGeneration(
      run.computationId,
      run.runSequence,
      'template-analysis-project-generation-test',
    );
    const committedEmission = emission.forCommittedGeneration(generationAuthority);
    const committedResource = committedEmission.resources.find((candidate) => candidate.localKey === resource.localKey);
    expect(committedResource).toBeDefined();
    if (committedResource == null) {
      throw new Error('Expected the committed generation to retain the staged template resource.');
    }
    expect(committedEmission.expressionWorld.freshInquiryGeneration().projector.publication)
      .toBe(committedEmission.expressionWorld.projector.publication);
    expect(new TemplateTypeSystemOverlayBuilder(store, app.emission.typeSystem).build(committedResource).overlaySource)
      .not.toBeNull();
  }, 30_000);

  test('uses the compiler front-door state as the production no-op policy', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/au-compose-dynamic-composition');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-project-generation:no-op-policy',
    });
    const app = await runtime.openApp();
    const baseline = app.emission.templates.resources[0]?.compilation.definition;
    if (baseline?.template == null) {
      throw new Error('Expected a compiled authored definition for the no-op policy fixture.');
    }
    const alreadyCompiled = customElementDefinitionWithTemplate(baseline, baseline.template, false);
    const appWorld = appWorldWithDefinition(app.emission.appWorld, baseline, alreadyCompiled);
    const run = runtime.computationLifecycle.begin({
      kind: 'template-compiler-no-op-policy-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Production compiler-front-door no-op policy proof.',
    });

    try {
      const emission = new TemplateCompilationProjectPass(
        runtime.workspace.store,
        run,
        runtime.frameworkSupport,
      ).compile(
        appWorld,
        app.emission.typeSystem,
        app.emission.resourceIndex,
        app.emission.routeContexts,
        {
          projectKey: `${app.project.projectKey}:no-op-policy`,
          evaluation: app.emission.evaluation,
          stateStores: app.emission.state.readStores(),
          runtimeAnalysisDepth: app.emission.analysisDepth,
        },
      );
      expect(emission.cohortPlan.ownerPlans.some((owner) => owner.definition === alreadyCompiled)).toBe(true);
      expect([
        ...emission.resources,
        ...emission.authoringResources,
      ].some((resource) => resource.compilation.definition === alreadyCompiled)).toBe(false);
    } finally {
      run.abort();
    }
  }, 30_000);

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
    const lifecycle = runtime.computationLifecycle;
    const sourceProvider = new MutableTemplateSourceProvider();
    const sourceAuthority = sourceSnapshotAuthority(sourceProvider, fixtureRoot, 'template-compilation');
    const compiler = new TemplateCompilationComputationService(store, lifecycle, sourceAuthority, runtime.frameworkSupport);
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
    const appRequest = new TemplateCompilationComputationRequest(
      app.project.projectKey,
      app.project.rootDir,
      new TemplateCompilationCohortSetAuthority(() => currentCohorts),
      baseline.definition,
    );
    const baselineProduct = store.read(baseline.compiledTemplate.compiledTemplate.productHandle);

    sourceProvider.write(templateFileName, originalText);
    const firstAttempt = compiler.prepare(appRequest);
    const firstCandidate = firstAttempt.candidateCompilations[0] ?? null;
    expect(firstCandidate).not.toBeNull();
    if (firstCandidate == null) {
      throw new Error('Expected the first computation-backed compilation candidate.');
    }
    expect(store.read(firstCandidate.unit.templateSource.productHandle)).toBeNull();

    const first = firstAttempt.commit();
    expect(first.commit.state).toBe(ComputationCommitState.Committed);
    expect(first.candidateCompilations[0]).toBe(firstCandidate);
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
    expect(equal.candidateCompilations[0]?.compiledTemplate.compiledTemplate).not.toBe(canonicalCompiledTemplate);

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
    expect(absent.candidateCompilations).toEqual([]);
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

    currentCohorts = [appCohort, authoringCohort];
    const authoringAttempt = compiler.prepare(appRequest);
    expect(authoringAttempt.computationId).toBe(firstAttempt.computationId);
    expect(authoringAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
    const authoringCandidate = authoringAttempt.candidateCompilations.find((candidate) =>
      candidate.appRootDefinitionProductHandle == null
    );
    expect(authoringCandidate?.unit.templateSource.productHandle).not.toBe(firstCandidate.unit.templateSource.productHandle);
    expect(authoringCandidate?.unit.templateSource.sourceAddressHandle)
      .toBe(firstCandidate.unit.templateSource.sourceAddressHandle);
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
    const lifecycle = runtime.computationLifecycle;
    const sourceProvider = new MutableTemplateSourceProvider();
    let currentCompilerWorld = baseline.parentCompilerWorld;
    const compilerWorldAuthority = new TemplateCompilerWorldAuthority(() => currentCompilerWorld);
    const compiler = new TemplateCompilationComputationService(
      store,
      lifecycle,
      sourceSnapshotAuthority(sourceProvider, fixtureRoot, 'template-compilation-cohort'),
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

    sourceProvider.write(templateFileName, originalText);
    const firstAttempt = compiler.prepare(request);
    const itemCardRead = firstAttempt.candidateCompilations[0]?.registeredReads.find((read) =>
      read instanceof TemplateCompilerReadObservation
      && read.readKind === TemplateCompilerReadKind.ElementResource
      && read.canonicalKey === 'item-card'
    );
    expect(itemCardRead?.resultParts.length).toBeGreaterThan(0);
    expect(firstAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    currentCompilerWorld = compilerWorldWithoutResource(
      baseline.parentCompilerWorld,
      (resource) => resource.name === 'item-card',
    );
    const absentItemCardAttempt = compiler.prepare(request);
    const absentItemCardRead = absentItemCardAttempt.candidateCompilations[0]?.registeredReads.find((read) =>
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

    currentCompilerWorld = baseline.parentCompilerWorld;
    const restoredItemCardAttempt = compiler.prepare(request);
    const restoredItemCardRead = restoredItemCardAttempt.candidateCompilations[0]?.registeredReads.find((read) =>
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
      baseline.parentCompilerWorld,
      baseline.definition,
      movedDefinition,
    );
    sourceProvider.write(movedTemplateFileName, originalText);
    const movedSourceAttempt = compiler.prepare(request);
    expect(movedSourceAttempt.computationId).toBe(firstAttempt.computationId);
    expect(movedSourceAttempt.source?.fileName).toBe(path.resolve(movedTemplateFileName));
    expect(movedSourceAttempt.candidateCompilations[0]?.definition).toBe(movedDefinition);
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

    currentCompilerWorld = baseline.parentCompilerWorld;
    const restoredSourceAttempt = compiler.prepare(request);
    expect(restoredSourceAttempt.computationId).toBe(firstAttempt.computationId);
    expect(restoredSourceAttempt.source?.fileName).toBe(path.resolve(templateFileName));
    expect(restoredSourceAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    const missingResourceText = originalText.replaceAll('item-card', 'fake-card');
    expect(missingResourceText.length).toBe(originalText.length);
    sourceProvider.write(templateFileName, missingResourceText);
    const secondAttempt = compiler.prepare(request);
    const fakeCardRead = secondAttempt.candidateCompilations[0]?.registeredReads.find((read) =>
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
      .map((resource) => resource.compilation.parentCompilerWorld)
      .find((world) => world.world.identityHandle !== baseline.parentCompilerWorld.world.identityHandle);
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

    currentCompilerWorld = baseline.parentCompilerWorld;
    const staleScopeWitnessAttempt = compiler.prepare(request);
    currentCompilerWorld = compilerWorldWithScopeSource(baseline.parentCompilerWorld, movedSpanHandle);
    const staleScopeWitness = staleScopeWitnessAttempt.commit();
    expect(staleScopeWitness.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(staleScopeWitness.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'template-compiler',
      changedFacets: expect.arrayContaining(['scope']),
    }));

    sourceProvider.remove(templateFileName);
    const alreadyCompiledDefinition = customElementDefinitionWithTemplate(
      baseline.definition,
      baseline.definition.template,
      false,
    );
    currentCompilerWorld = compilerWorldWithDefinition(
      baseline.parentCompilerWorld,
      baseline.definition,
      alreadyCompiledDefinition,
    );
    const alreadyCompiledAttempt = compiler.prepare(request);
    expect(alreadyCompiledAttempt.source).toBeNull();
    expect(alreadyCompiledAttempt.candidateCompilations).toEqual([]);
    expect(alreadyCompiledAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    const noTemplateDefinition = customElementDefinitionWithTemplate(
      baseline.definition,
      new CustomElementTemplateDefinition(CustomElementTemplateKind.None),
    );
    currentCompilerWorld = compilerWorldWithDefinition(
      baseline.parentCompilerWorld,
      baseline.definition,
      noTemplateDefinition,
    );
    const noTemplateAttempt = compiler.prepare(request);
    expect(noTemplateAttempt.source).toBeNull();
    expect(noTemplateAttempt.candidateCompilations).toEqual([]);
    expect(noTemplateAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    sourceProvider.write(templateFileName, originalText);
    currentCompilerWorld = baseline.parentCompilerWorld;
    const compiledAgainAttempt = compiler.prepare(request);
    expect(compiledAgainAttempt.source?.state).toBe(SourceTextSnapshotState.Present);
    expect(compiledAgainAttempt.candidateCompilations[0]).toBeDefined();
    expect(compiledAgainAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);

    const compilerWorldWithoutOwner = compilerWorldWithoutResource(
      baseline.parentCompilerWorld,
      (resource) => resource.definitionProductHandle === baseline.definition.productHandle,
    );
    currentCompilerWorld = compilerWorldWithoutOwner;
    const staleRemovedOwnerAttempt = compiler.prepare(request);
    expect(staleRemovedOwnerAttempt.source).toBeNull();
    expect(staleRemovedOwnerAttempt.candidateCompilations).toEqual([]);
    currentCompilerWorld = baseline.parentCompilerWorld;
    const staleRemovedOwner = staleRemovedOwnerAttempt.commit();
    expect(staleRemovedOwner.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(staleRemovedOwner.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'template-compiler',
    }));
    const retainedSourceHandle = firstAttempt.candidateCompilations[0]?.unit.templateSource.productHandle ?? null;
    expect(retainedSourceHandle).not.toBeNull();
    expect(retainedSourceHandle == null ? null : store.read(retainedSourceHandle)).not.toBeNull();

    currentCompilerWorld = compilerWorldWithoutOwner;
    const removedOwnerAttempt = compiler.prepare(request);
    expect(removedOwnerAttempt.source).toBeNull();
    expect(removedOwnerAttempt.candidateCompilations).toEqual([]);
    const removedOwner = removedOwnerAttempt.commit();
    expect(removedOwner.commit.state).toBe(ComputationCommitState.Committed);
    expect(removedOwner.commit.transition.publications).toContainEqual(expect.objectContaining({
      handle: firstAttempt.candidateCompilations[0]?.unit.templateSource.productHandle,
      decision: KernelPublicationDecisionKind.Withdraw,
    }));

    currentCompilerWorld = baseline.parentCompilerWorld;
    const restoredOwnerAttempt = compiler.prepare(request);
    expect(restoredOwnerAttempt.source?.state).toBe(SourceTextSnapshotState.Present);
    expect(restoredOwnerAttempt.candidateCompilations[0]).toBeDefined();
    expect(restoredOwnerAttempt.commit().commit.state).toBe(ComputationCommitState.Committed);
  }, 30_000);
});

function sourceSnapshotAuthority(
  sourceProvider: MutableTemplateSourceProvider,
  rootDir: string,
  projectKey: string,
): SourceTextSnapshotAuthority {
  const authority = new SemanticRuntimeProjectInputAuthority(
    new NodeSemanticRuntimeProjectInputHost(sourceProvider),
  );
  return new SourceTextSnapshotAuthority(authority.capture({ projectKey, rootDir }));
}

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

function appWorldWithDefinition(
  appWorld: AureliaAppWorldEmission,
  previous: CustomElementDefinition,
  next: CustomElementDefinition,
): AureliaAppWorldEmission {
  return new AureliaAppWorldEmission(
    appWorld.configuration,
    appWorld.diWorld,
    appWorld.configuredSyntax,
    appWorld.configuredResources,
    appWorld.configuredRenderers,
    appWorld.frameworkServiceCustomizations,
    appWorld.compilerWorlds.map((world) => compilerWorldWithDefinition(world, previous, next)),
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
  needsCompile = definition.needsCompile,
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
    needsCompile,
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
