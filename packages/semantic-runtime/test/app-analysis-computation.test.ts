import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SemanticAppQueryKind, SemanticRuntimeDetail } from '../src/api/contracts.js';
import { ComputationCommitState } from '../src/kernel/computation-lifecycle.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import { SourceTextSnapshotState } from '../src/kernel/source-text-snapshot.js';
import { ResourceDiKeyIdentity } from '../src/kernel/identity.js';
import { SourceFileAddress } from '../src/kernel/address.js';
import { EvidenceRecord } from '../src/kernel/evidence.js';
import { ProvenanceRecord } from '../src/kernel/provenance.js';
import { ObservationProductDetails } from '../src/observation/product-details.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { StaticProjectEvaluationAcquisitionKind } from '../src/evaluation/project-evaluation.js';

class MutableSourceOverlay {
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

describe('app analysis computation', () => {
  test('rejects duplicate explicit project keys before boot can merge their input authority', async () => {
    const pressureRoot = path.resolve(fileURLToPath(new URL('../fixtures/pressure', import.meta.url)));
    await expect(createSemanticRuntime({
      workspaceRoot: pressureRoot,
      storeKey: 'contract:duplicate-project-key',
      projects: [
        { projectKey: 'duplicate', rootDir: 'template-completion-member-metadata' },
        { projectKey: 'duplicate', rootDir: 'au-compose-dynamic-composition' },
      ],
    })).rejects.toThrow(/duplicate project key 'duplicate'/);
  });

  test('publishes one complete app candidate atomically and invalidates every retained facade on replacement', async () => {
    const fixtureRoot = pressureFixtureRoot('au-compose-dynamic-composition');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:app-analysis-atomic-publication',
    });
    const incumbent = await runtime.openApp({ analysisDepth: 'runtime-topology' });
    const retainedExpressionWorld = incumbent.emission.templates.expressionWorld;
    const retainedInquiryWorld = retainedExpressionWorld.freshInquiryGeneration();
    const retainedAsk = incumbent.ask.bind(incumbent);
    const retainedCohortAuthority = incumbent.emission.templateCohorts;
    const retainedOwner = incumbent.emission.templates.cohortPlan.ownerPlans[0] ?? null;
    expect(retainedOwner).not.toBeNull();
    if (retainedOwner == null) {
      throw new Error('Expected the fixture to publish a template cohort owner.');
    }
    const retainedCohortSet = retainedCohortAuthority.cohortSetFor(retainedOwner.definition);
    const retainedCompilerWorldAuthority = retainedCohortSet.current()[0]?.compilerWorldAuthority ?? null;
    expect(retainedCompilerWorldAuthority).not.toBeNull();
    if (retainedCompilerWorldAuthority == null) {
      throw new Error('Expected the fixture to publish a compiler-world cohort.');
    }
    const incumbentCompilerWorld = retainedCompilerWorldAuthority.current();
    const baselineResource = incumbent.emission.templates.resources[0];
    const baselineSource = baselineResource?.compilation.unit.templateSource ?? null;
    expect(baselineSource).not.toBeNull();
    if (baselineResource == null || baselineSource == null) {
      throw new Error('Expected the fixture to publish a baseline template source.');
    }

    const store = runtime.workspace.store;
    const committedRecordHandles = new Set(store.readAllRecords().map((record) => record.handle));
    const attempt = runtime.appAnalysisComputations.prepare(incumbent.project, {
      analysisDepth: 'binding-observation',
    });
    const candidate = attempt.candidateEmission;
    const candidateResource = candidate.templates.resources.find(
      (resource) => resource.localKey === baselineResource.localKey,
    );
    const candidateSource = candidateResource?.compilation.unit.templateSource ?? null;
    const candidateDataFlow = candidate.templates.resources
      .flatMap((resource) => resource.runtimeAnalysis.bindingDataFlow.dataFlows)[0] ?? null;
    expect(candidateSource).not.toBeNull();
    expect(candidateDataFlow).not.toBeNull();
    if (candidateSource == null || candidateDataFlow == null) {
      throw new Error('Expected the deeper candidate to stage template-source and data-flow details.');
    }
    const candidatePublication = candidate.templates.expressionWorld.projector.publication;

    const supportRecordsPublishedDuringCandidate = store.readAllRecords()
      .filter((record) => !committedRecordHandles.has(record.handle));
    expect(supportRecordsPublishedDuringCandidate.every((record) =>
      record instanceof SourceFileAddress
        ? record.workspaceKey === runtime.workspace.workspaceKey
        : record instanceof EvidenceRecord || record instanceof ProvenanceRecord
    )).toBe(true);
    expect(store.read(candidateDataFlow.productHandle)).toBeNull();
    expect(store.productDetails.read(
      ObservationProductDetails.RuntimeBindingDataFlow,
      candidateDataFlow.productHandle,
    )).toBeNull();
    expect(candidatePublication.readProductDetail(
      ObservationProductDetails.RuntimeBindingDataFlow,
      candidateDataFlow.productHandle,
    )).toBe(candidateDataFlow);
    expect(store.productDetails.read(TemplateProductDetails.Source, baselineSource.productHandle)).toBe(baselineSource);
    expect(candidatePublication.readProductDetail(
      TemplateProductDetails.Source,
      candidateSource.productHandle,
    )).toBe(candidateSource);
    expect(incumbent.isCurrent()).toBe(true);

    const replacement = attempt.commit();
    const generation = replacement.committedGeneration;
    expect(replacement.commit.state).toBe(ComputationCommitState.Committed);
    expect(generation).not.toBeNull();
    if (generation == null) {
      throw new Error('Expected the full-app replacement to commit.');
    }
    expect(store.productDetails.read(
      ObservationProductDetails.RuntimeBindingDataFlow,
      candidateDataFlow.productHandle,
    )).toBe(candidateDataFlow);
    expect(store.productDetails.read(TemplateProductDetails.Source, candidateSource.productHandle)).toBe(candidateSource);
    expect(generation.emission.templates.expressionWorld.projector.publication.isCurrent()).toBe(true);
    expect(incumbent.isCurrent()).toBe(false);
    expect(() => incumbent.emission).toThrow(/no longer current/);
    expect(() => incumbent.queryClaims).toThrow(/no longer current/);
    expect(() => retainedAsk({ kind: SemanticAppQueryKind.TemplateCompilations })).toThrow(/no longer current/);
    expect(() => retainedExpressionWorld.evaluator()).toThrow(/no longer current/);
    expect(() => retainedInquiryWorld.evaluator()).toThrow(/no longer current/);
    expect(generation.emission.templateCohorts).toBe(retainedCohortAuthority);
    expect(retainedCompilerWorldAuthority.current()).not.toBe(incumbentCompilerWorld);

    expect(runtime.appAnalysisComputations.retire(generation)).toBe(true);
    expect(retainedCohortAuthority.current()).toBeNull();
    expect(() => retainedCompilerWorldAuthority.current()).toThrow(/no longer current/);
  }, 60_000);

  test('keeps the incumbent intact when source validation rejects a candidate and when an older run loses', async () => {
    const fixtureRoot = pressureFixtureRoot('au-compose-dynamic-composition');
    const sourceOverlay = new MutableSourceOverlay();
    const projectInputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(sourceOverlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:app-analysis-rejection',
      projectInputAuthority,
    });
    const incumbent = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const service = runtime.appAnalysisComputations;
    const incumbentGeneration = service.authorityFor(incumbent.project.projectKey).current();
    expect(incumbentGeneration).not.toBeNull();

    const racedAttempt = service.prepare(incumbent.project, { analysisDepth: 'runtime-topology' });
    const racedSource = racedAttempt.sourceSnapshots.find(
      (snapshot) => snapshot.state === SourceTextSnapshotState.Present,
    );
    expect(racedSource).toBeDefined();
    if (racedSource == null) {
      throw new Error('Expected the app candidate to retain at least one exact authored source snapshot.');
    }
    sourceOverlay.write(racedSource.fileName, `${racedSource.requireText()}\n<!-- raced -->`);
    const raced = racedAttempt.commit();
    expect(raced.commit.state).toBe(ComputationCommitState.RejectedInputsChanged);
    expect(raced.commit.transition.invalidReads).toContainEqual(expect.objectContaining({
      domain: 'source-text',
      changedFacets: ['content'],
    }));
    const authority = service.authorityFor(incumbent.project.projectKey);
    expect(authority.committed()?.key).toBe(incumbentGeneration?.key);
    expect(authority.current()).toBeNull();
    expect(incumbent.isCurrent()).toBe(false);
    sourceOverlay.clear(racedSource.fileName);
    expect(authority.current()?.key).toBe(incumbentGeneration?.key);
    expect(incumbent.isCurrent()).toBe(true);
    expect(incumbent.emission.templates.resources.length).toBeGreaterThan(0);

    const olderAttempt = service.prepare(incumbent.project, { analysisDepth: 'runtime-topology' });
    const winningAttempt = service.prepare(incumbent.project, { analysisDepth: 'binding-observation' });
    const winning = winningAttempt.commit();
    const winningGeneration = winning.committedGeneration;
    expect(winning.commit.state).toBe(ComputationCommitState.Committed);
    expect(winningGeneration).not.toBeNull();
    expect(olderAttempt.commit().commit.state).toBe(ComputationCommitState.RejectedSuperseded);
    expect(service.authorityFor(incumbent.project.projectKey).current()).toBe(winningGeneration);
    expect(incumbent.isCurrent()).toBe(false);

    if (winningGeneration == null) {
      throw new Error('Expected the winning app generation to become current.');
    }
    const ownedSource = winningGeneration.emission.templates.resources[0]?.compilation.unit.templateSource ?? null;
    expect(ownedSource).not.toBeNull();
    if (ownedSource == null) {
      throw new Error('Expected the winning generation to own a template source.');
    }
    expect(runtime.workspace.store.read(ownedSource.productHandle)).not.toBeNull();
    expect(service.retire(winningGeneration)).toBe(true);
    expect(runtime.workspace.store.read(ownedSource.productHandle)).toBeNull();
    expect(service.authorityFor(incumbent.project.projectKey).current()).toBeNull();
    expect(winningGeneration.isCurrent()).toBe(false);
    expect(() => winningGeneration.emission).toThrow(/no longer current/);
    expect(service.retire(winningGeneration)).toBe(false);
  }, 90_000);

  test('pins runtime caches to project-input generations and rejects retained objects after an input event', async () => {
    const fixtureRoot = pressureFixtureRoot('template-completion-member-metadata');
    const projectInputAuthority = new SemanticRuntimeProjectInputAuthority();
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:app-analysis-project-input-generation',
      projectInputAuthority,
    });
    const first = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const retainedAsk = first.ask.bind(first);
    expect(first.isCurrent()).toBe(true);

    projectInputAuthority.advance();
    expect(first.isCurrent()).toBe(false);
    expect(() => first.emission).toThrow(/no longer current/);
    expect(() => retainedAsk({ kind: SemanticAppQueryKind.TemplateCompilations })).toThrow(/no longer current/);

    const second = await runtime.openApp({ analysisDepth: 'binding-observation' });
    expect(second).not.toBe(first);
    expect(second.project.inputGeneration.revision).not.toBe(first.project.inputGeneration.revision);
    expect(second.isCurrent()).toBe(true);
    expect(second.emission.profile.evaluationAcquisitions).toEqual([
      expect.objectContaining({ kind: StaticProjectEvaluationAcquisitionKind.Reused }),
      expect.objectContaining({ kind: StaticProjectEvaluationAcquisitionKind.Reused }),
    ]);
    expect(runtime.analysisCacheOverview().value?.cachedAppCount).toBe(1);

    const beforeClear = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
    const clear = runtime.clearAnalysisCache().value;
    const afterClear = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
    expect(clear).not.toBeNull();
    if (clear == null) {
      throw new Error('Expected analysis-cache clear telemetry.');
    }
    expect(clear.disposedKernelRecords).toBe(beforeClear.totalRecords - afterClear.totalRecords);
    expect(clear.disposedProductDetails).toBe(beforeClear.productDetails - afterClear.productDetails);
    expect(clear.disposedHotDetails).toBe(beforeClear.hotDetails - afterClear.hotDetails);
    expect(clear.disposedKernelHandleCharacters).toBe(beforeClear.handleCharacters - afterClear.handleCharacters);
    expect(clear.remainingCachedApps).toBe(0);
    expect(afterClear.totalRecords).toBeGreaterThan(0);
    expect(second.isCurrent()).toBe(false);
  }, 60_000);

  test('retains independent project generations while replacing and clearing them exactly', async () => {
    const pressureRoot = path.resolve(fileURLToPath(new URL('../fixtures/pressure', import.meta.url)));
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureRoot,
      storeKey: 'contract:app-analysis-multi-project-generations',
      projects: [
        { projectKey: 'completion', rootDir: 'template-completion-member-metadata' },
        { projectKey: 'composition', rootDir: 'au-compose-dynamic-composition' },
      ],
    });

    const completion = await runtime.openApp({
      projectKey: 'completion',
      analysisDepth: 'runtime-topology',
    });
    const completionSource = completion.emission.templates.resources[0]?.compilation.unit.templateSource ?? null;
    expect(completionSource).not.toBeNull();
    if (completionSource == null) {
      throw new Error('Expected the completion project to publish a template source.');
    }

    const composition = await runtime.openApp({
      projectKey: 'composition',
      analysisDepth: 'runtime-topology',
    });
    const compositionSource = composition.emission.templates.resources[0]?.compilation.unit.templateSource ?? null;
    expect(compositionSource).not.toBeNull();
    if (compositionSource == null) {
      throw new Error('Expected the composition project to publish a template source.');
    }
    expect(completion.isCurrent()).toBe(true);
    expect(composition.isCurrent()).toBe(true);
    expect(runtime.workspace.store.read(completionSource.productHandle)).not.toBeNull();
    expect(runtime.workspace.store.read(compositionSource.productHandle)).not.toBeNull();
    expect(runtime.analysisCacheOverview().value?.cachedAppCount).toBe(2);

    const deeperCompletion = await runtime.openApp({
      projectKey: 'completion',
      analysisDepth: 'binding-observation',
    });
    expect(deeperCompletion).not.toBe(completion);
    expect(completion.isCurrent()).toBe(false);
    expect(deeperCompletion.isCurrent()).toBe(true);
    expect(composition.isCurrent()).toBe(true);
    expect(runtime.workspace.store.read(compositionSource.productHandle)).not.toBeNull();
    expect(runtime.analysisCacheOverview().value?.cachedAppCount).toBe(2);

    const beforeClear = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
    const clear = runtime.clearAnalysisCache().value;
    const afterClear = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
    expect(clear).not.toBeNull();
    if (clear == null) {
      throw new Error('Expected multi-project cache-clear telemetry.');
    }
    expect(clear.disposedCachedApps).toBe(2);
    expect(clear.disposedKernelRecords).toBe(beforeClear.totalRecords - afterClear.totalRecords);
    expect(clear.disposedProductDetails).toBe(beforeClear.productDetails - afterClear.productDetails);
    expect(clear.disposedHotDetails).toBe(beforeClear.hotDetails - afterClear.hotDetails);
    expect(clear.disposedKernelHandleCharacters).toBe(beforeClear.handleCharacters - afterClear.handleCharacters);
    expect(clear.remainingCachedApps).toBe(0);
    expect(deeperCompletion.isCurrent()).toBe(false);
    expect(composition.isCurrent()).toBe(false);
    expect(runtime.appAnalysisComputations.authorityFor('completion').current()).toBeNull();
    expect(runtime.appAnalysisComputations.authorityFor('composition').current()).toBeNull();
  }, 120_000);

  test('keeps same-layout project publications independently retireable', async () => {
    const pressureRoot = path.resolve(fileURLToPath(new URL('../fixtures/pressure', import.meta.url)));
    const projectRoot = 'resource-registration-effective-definitions';
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureRoot,
      storeKey: 'contract:app-analysis-independent-project-ownership',
      projects: [
        { projectKey: 'clone-a', rootDir: projectRoot },
        { projectKey: 'clone-b', rootDir: projectRoot },
      ],
    });
    const showKey = runtime.workspace.store.readIdentities().find(
      (identity) => identity instanceof ResourceDiKeyIdentity
        && identity.resourceKey === 'au:resource:custom-attribute:show',
    );
    const hideKey = runtime.workspace.store.readIdentities().find(
      (identity) => identity instanceof ResourceDiKeyIdentity
        && identity.resourceKey === 'au:resource:custom-attribute:hide',
    );
    expect(showKey).toBeInstanceOf(ResourceDiKeyIdentity);
    expect(hideKey).toBeInstanceOf(ResourceDiKeyIdentity);
    expect(showKey?.resourceHandle).toBe(hideKey?.resourceHandle);
    expect(showKey?.handle).not.toBe(hideKey?.handle);
    const cloneA = await runtime.openApp({ projectKey: 'clone-a', analysisDepth: 'binding-observation' });
    const cloneB = await runtime.openApp({ projectKey: 'clone-b', analysisDepth: 'binding-observation' });
    const definitionA = cloneA.emission.resources.readDefinitions().find((definition) => definition.name === 'alias-carrier') ?? null;
    const definitionB = cloneB.emission.resources.readDefinitions().find((definition) => definition.name === 'alias-carrier') ?? null;
    expect(definitionA?.identityHandle).not.toBeNull();
    expect(definitionB?.identityHandle).not.toBeNull();
    if (definitionA?.identityHandle == null || definitionB?.identityHandle == null) {
      throw new Error('Expected both logical projects to publish their own app resource identity.');
    }
    const resourceKeyA = runtime.workspace.store.readIdentities().find(
      (identity) => identity instanceof ResourceDiKeyIdentity && identity.resourceHandle === definitionA.identityHandle,
    );
    const resourceKeyB = runtime.workspace.store.readIdentities().find(
      (identity) => identity instanceof ResourceDiKeyIdentity && identity.resourceHandle === definitionB.identityHandle,
    );
    expect(resourceKeyA).toBeInstanceOf(ResourceDiKeyIdentity);
    expect(resourceKeyB).toBeInstanceOf(ResourceDiKeyIdentity);
    expect(resourceKeyA?.handle).not.toBe(resourceKeyB?.handle);
    const sharedProgramSources = runtime.workspace.store.readAddresses().filter(
      (address) => address instanceof SourceFileAddress
        && address.workspaceKey === runtime.workspace.workspaceKey
        && address.path.endsWith('.d.ts'),
    );
    const cloneASources = runtime.workspace.store.readAddresses().filter(
      (address): address is SourceFileAddress => address instanceof SourceFileAddress
        && address.workspaceKey === 'clone-a',
    );
    const cloneBSources = runtime.workspace.store.readAddresses().filter(
      (address): address is SourceFileAddress => address instanceof SourceFileAddress
        && address.workspaceKey === 'clone-b',
    );
    expect(sharedProgramSources.length).toBeGreaterThan(0);
    expect(cloneASources.length).toBeGreaterThan(0);
    expect(cloneBSources.length).toBeGreaterThan(0);
    expect(cloneASources.map((address) => address.path).sort()).toEqual(
      cloneBSources.map((address) => address.path).sort(),
    );
    const cloneBSourceHandles = new Set(cloneBSources.map((address) => address.handle));
    expect(cloneASources.every((address) => !cloneBSourceHandles.has(address.handle))).toBe(true);

    expect(cloneA.retireGeneration()).toBe(true);
    expect(cloneA.isCurrent()).toBe(false);
    expect(cloneB.isCurrent()).toBe(true);
    expect(runtime.appAnalysisComputations.authorityFor('clone-a').current()).toBeNull();
    expect(runtime.appAnalysisComputations.authorityFor('clone-b').current()).not.toBeNull();
    expect(showKey == null ? null : runtime.workspace.store.read(showKey.handle)).toBe(showKey);
    expect(cloneASources.every((address) => runtime.workspace.store.read(address.handle) === address)).toBe(true);
    expect(cloneBSources.every((address) => runtime.workspace.store.read(address.handle) === address)).toBe(true);
    expect(sharedProgramSources.every((address) => runtime.workspace.store.read(address.handle) === address)).toBe(true);
    runtime.clearAnalysisCache();
    expect(cloneB.isCurrent()).toBe(false);
  }, 120_000);

  test('keeps lazily projected targets alive when a handle-detail answer exposes them', async () => {
    const fixtureRoot = pressureFixtureRoot('template-completion-member-metadata');
    const templateFile = path.join(fixtureRoot, 'src/app.html');
    const sourceText = readFileSync(templateFile, 'utf8');
    const cursorOffset = sourceText.indexOf('$this.') + '$this.'.length;
    expect(cursorOffset).toBeGreaterThan('$this.'.length - 1);
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:app-analysis-handle-answer-lifetime',
    });

    const answer = await runtime.templateCursorInfo({
      cursor: { filePath: templateFile, offset: cursorOffset },
      detail: SemanticRuntimeDetail.Handles,
    });
    const ownerTypeHandle = answer.value?.memberOwnerType?.handles?.productHandle ?? null;
    expect(ownerTypeHandle).not.toBeNull();
    if (ownerTypeHandle == null) {
      throw new Error('Expected the cursor answer to expose its projected member-owner type handle.');
    }
    expect(runtime.workspace.store.read(ownerTypeHandle)).not.toBeNull();
    expect(runtime.workspace.store.productDetails.readEntry(ownerTypeHandle)).not.toBeNull();

    runtime.clearAnalysisCache();
    expect(runtime.workspace.store.read(ownerTypeHandle)).toBeNull();
    expect(runtime.workspace.store.productDetails.readEntry(ownerTypeHandle)).toBeNull();
  }, 60_000);

  test('retains an app generation for routed handle answers and rejects contradictory disposal', async () => {
    const fixtureRoot = pressureFixtureRoot('template-completion-member-metadata');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:app-analysis-routed-handle-lifetime',
    });
    const query = {
      kind: SemanticAppQueryKind.ResourceDefinitions,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 1 },
    } as const;

    const answer = await runtime.answerAppQuery(query);
    const definitionHandle = answer.value?.rows[0]?.handles?.definitionProductHandle ?? null;
    expect(definitionHandle).not.toBeNull();
    if (definitionHandle == null) {
      throw new Error('Expected a routed resource-definition answer to expose its product handle.');
    }
    expect(runtime.workspace.store.read(definitionHandle)).not.toBeNull();
    expect(runtime.analysisCacheOverview().value?.cachedAppCount).toBe(1);

    await expect(runtime.answerAppQuery({
      ...query,
      appRetention: 'dispose-app',
    })).rejects.toThrow(/detail='handles'.*appRetention='dispose-app'/);
    await expect(runtime.answerAppQueries({
      appRetention: 'dispose-app',
      queries: [query],
    })).rejects.toThrow(/detail='handles'.*appRetention='dispose-app'/);
    expect(runtime.workspace.store.read(definitionHandle)).not.toBeNull();

    runtime.clearAnalysisCache();
    expect(runtime.workspace.store.read(definitionHandle)).toBeNull();
  }, 60_000);
});

function pressureFixtureRoot(fixtureName: string): string {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  return path.join(packageRoot, 'fixtures/pressure', fixtureName);
}
