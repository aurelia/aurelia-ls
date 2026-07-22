import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SourceFileAddress, SourceLanguage, SourceSpanAddress } from '../src/kernel/address.js';
import type { ProductHandle } from '../src/kernel/handles.js';
import { KernelStore } from '../src/kernel/store.js';
import {
  ComputationCommitState,
  computationProductDetailReadKey,
  computationRecordReadKey,
} from '../src/kernel/computation-lifecycle.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import {
  CustomElementDefinition,
  CustomElementTemplateDefinition,
} from '../src/resources/custom-element-definition.js';
import {
  ResourceDefinitionIndex,
  ResourceDefinitionIndexEntry,
} from '../src/resources/resource-definition-index.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { compareCompiledTemplateDetails } from '../src/template/compiled-template-comparison.js';
import { CompiledTemplate, CompiledTemplateState } from '../src/template/compiled-template.js';
import { TemplateCompilationLocus } from '../src/template/template-compilation-cohort.js';
import { TemplateCompilationProjectPass } from '../src/template/template-compilation-project-pass.js';
import { TemplateTypeSystemOverlayBuilder } from '../src/template/template-type-system-overlay.js';
import { ObservationProductDetails } from '../src/observation/product-details.js';

describe('template compilation project pass', () => {
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
    expect(productionFamily?.reads).toContainEqual(expect.objectContaining({
      domain: 'project-input',
      readKey: expect.stringContaining('project-input:file-content:'),
    }));
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
    expect(new TemplateTypeSystemOverlayBuilder(store, app.emission.project, app.emission.typeSystem)
      .build(committedResource).overlaySource)
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
    const resourceIndex = resourceIndexWithDefinition(app.emission.resourceIndex, baseline, alreadyCompiled);
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
        app.emission.appWorld,
        app.emission.typeSystem,
        resourceIndex,
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
      compareRecordHandles: (previousHandle, nextHandle) => {
        if (previousHandle !== nextHandle) {
          return KernelPublicationDecisionKind.Replace;
        }
        return previousHandle === previousSpan.handle
          ? KernelPublicationDecisionKind.RefreshWitness
          : KernelPublicationDecisionKind.Retain;
      },
    })).toBe(KernelPublicationDecisionKind.RefreshWitness);
  });

});

function resourceIndexWithDefinition(
  index: ResourceDefinitionIndex,
  previous: CustomElementDefinition,
  next: CustomElementDefinition,
): ResourceDefinitionIndex {
  return new ResourceDefinitionIndex(
    index.entries.map((entry) => new ResourceDefinitionIndexEntry(
      entry.moduleKey,
      entry.localName,
      entry.sourceNode,
      entry.definition === previous ? next : entry.definition,
    )),
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
