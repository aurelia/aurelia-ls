import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { SemanticAppQueryKind } from '../src/api/contracts.js';
import {
  SemanticApplicationEntrypointPolicy,
} from '../src/configuration/app-analysis.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { readSemanticProjectAppSourceSyntax } from '../src/boot/project-shape.js';
import { SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE } from '../src/kernel/analysis-currentness.js';
import { ComputationReadValidationScope } from '../src/kernel/computation-lifecycle.js';
import { resourceConventionToolingEvaluationProfile } from '../src/resources/resource-convention-transform-admission.js';
import {
  AureliaAppWorldProjectPass,
} from '../src/configuration/app-world-project-pass.js';
import {
  SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
  SemanticApplicationEntrypointSelectionRequiredError,
  readSemanticApplicationEntrypointPreflight,
  readSemanticApplicationEntrypointSourcePreflight,
} from '../src/configuration/application-entrypoint-preflight.js';

describe('application entrypoint preflight', () => {
  afterEach(() => vi.restoreAllMocks());

  test('refuses disjoint application entrypoint graphs before TypeSystem and template construction', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureFixtureRoot('observer-setup-selection'),
      storeKey: 'contract:application-entrypoint-disjoint-preflight',
    });
    const projectEvaluationAcquire = vi.spyOn(runtime.projectEvaluations, 'acquire');
    const projectEvaluationReplacement = vi.spyOn(runtime.projectEvaluations, 'acquireReplacement');
    const typeSystemAcquire = vi.spyOn(runtime.typeSystemProjects, 'acquire');
    const constructAppWorld = vi.spyOn(AureliaAppWorldProjectPass.prototype, 'constructAndEmit');
    const kernelBeforeRefusal = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });

    let failure: unknown;
    try {
      await runtime.openApp({ analysisDepth: 'runtime-topology' });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(SemanticApplicationEntrypointSelectionRequiredError);
    expect(failure).toMatchObject({
      code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
      activationSourceCount: 3,
      activationSiteCount: 3,
      entrypointClusterCount: 3,
      entrypointEvidenceKind: 'authored-direct',
    });
    expect(projectEvaluationAcquire).not.toHaveBeenCalled();
    expect(projectEvaluationReplacement).not.toHaveBeenCalled();
    expect(typeSystemAcquire).not.toHaveBeenCalled();
    expect(constructAppWorld).not.toHaveBeenCalled();
    expect(runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false }).totalRecords)
      .toBe(kernelBeforeRefusal.totalRecords);

    const aggregate = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      applicationEntrypointPolicy: SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs,
    });
    expect(aggregate.emission.appWorld.compilerWorlds).toHaveLength(3);
    expect(projectEvaluationAcquire).toHaveBeenCalledTimes(1);
    expect(projectEvaluationReplacement).toHaveBeenCalledTimes(1);
    expect(typeSystemAcquire).toHaveBeenCalledTimes(1);
    expect(constructAppWorld).toHaveBeenCalledTimes(1);

    const aggregateAnswer = aggregate.ask({ kind: SemanticAppQueryKind.AppTopology });
    expect(aggregateAnswer.applicationEntrypointPolicy)
      .toBe(SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs);
    const queryClaimsBeforeRefusal = runtime.analysisCacheOverview({
      rowLimit: 8,
      includeQueryClaimRows: true,
    }).value.cachedApps[0]?.queryClaims;

    // An explicitly aggregated cached app must not bypass the default refusal on a later request.
    await expect(runtime.openApp({ analysisDepth: 'runtime-topology' })).rejects.toMatchObject({
      code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
      entrypointClusterCount: 3,
    });
    const queryClaimsAfterRefusal = runtime.analysisCacheOverview({
      rowLimit: 8,
      includeQueryClaimRows: true,
    }).value.cachedApps[0]?.queryClaims;
    expect(queryClaimsAfterRefusal).toEqual(queryClaimsBeforeRefusal);
    expect(aggregate.isCurrent()).toBe(true);
    expect(await runtime.openApp({
      analysisDepth: 'runtime-topology',
      applicationEntrypointPolicy: SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs,
    })).toBe(aggregate);
    expect(projectEvaluationAcquire).toHaveBeenCalledTimes(1);
    expect(projectEvaluationReplacement).toHaveBeenCalledTimes(1);
    expect(typeSystemAcquire).toHaveBeenCalledTimes(1);
    expect(constructAppWorld).toHaveBeenCalledTimes(1);

    runtime.workspace.projectInputAuthority.advance();
    await expect(runtime.openApp({ analysisDepth: 'runtime-topology' })).rejects.toMatchObject({
      code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
      entrypointClusterCount: 3,
    });
    expect(aggregate.isCurrent()).toBe(false);
    expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);
    expect(runtime.projectEvaluations.readEntryCount()).toBe(0);
    expect(runtime.typeSystemProjects.readEntryCount()).toBe(0);
  }, 30_000);

  test('retires a newly evaluated fallback when closed evidence refuses the project', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': [
        `import Aurelia from 'aurelia';`,
        `function start() {`,
        `  return Aurelia.app({ host: document.body, component: {} });`,
        `}`,
        `void start();`,
      ].join('\n'),
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-evaluated-refusal-retirement',
      });
      const kernelBefore = runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });

      await expect(runtime.openApp({ analysisDepth: 'runtime-topology' })).rejects.toMatchObject({
        code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
        entrypointEvidenceKind: 'evaluated-closed',
        entrypointSelectionReason: 'independent-graphs',
        entrypointClusterCount: 2,
      });

      expect(runtime.projectEvaluations.readEntryCount()).toBe(0);
      expect(runtime.typeSystemProjects.readEntryCount()).toBe(0);
      expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);
      expect(runtime.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false }).totalRecords)
        .toBe(kernelBefore.totalRecords);
    });
  }, 30_000);

  test('binds evaluator replacement authority to the exact probed project generation', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureFixtureRoot('app-pattern-convention-minimal-app'),
      storeKey: 'contract:application-entrypoint-replacement-proof',
    });
    const project = runtime.workspace.projects[0]!;
    const probe = runtime.projectEvaluations.probeCurrent(
      project,
      aureliaAppProjectEvaluationProfile,
      new ComputationReadValidationScope(),
    );
    expect(probe.access).toBeNull();
    expect(probe.replacementProof).not.toBeNull();
    if (probe.replacementProof == null) throw new Error('Expected evaluator replacement proof.');

    runtime.workspace.projectInputAuthority.advance();
    const rebound = project.forInputGeneration(runtime.workspace.projectInputAuthority.capture(project));
    expect(() => runtime.projectEvaluations.acquireReplacement(
      rebound,
      aureliaAppProjectEvaluationProfile,
      new ComputationReadValidationScope(),
      probe.replacementProof,
    )).toThrow(/exact failed current-generation probe/u);
    expect(runtime.projectEvaluations.readEntryCount()).toBe(0);
  });

  test('revalidates source-graph evidence before repeating an early refusal', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-source-currentness',
      });
      const previousProject = runtime.workspace.projects[0]!;
      const moduleResolutionPolicy = aureliaAppProjectEvaluationProfile.prepare().options.moduleResolutionPolicy!;
      expect(readSemanticApplicationEntrypointSourcePreflight(
        previousProject,
        moduleResolutionPolicy,
      )).toMatchObject({
        activationSourceCount: 2,
        entrypointClusterCount: 2,
      });

      fs.writeFileSync(path.join(workspaceRoot, 'src/second.ts'), 'export const helper = true;\n');
      expect(() => readSemanticApplicationEntrypointSourcePreflight(
        previousProject,
        moduleResolutionPolicy,
      )).toThrow(expect.objectContaining({
        code: SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE,
      }));

      runtime.workspace.projectInputAuthority.advance();
      const currentProject = previousProject.forInputGeneration(
        runtime.workspace.projectInputAuthority.capture(previousProject),
      );
      expect(readSemanticApplicationEntrypointSourcePreflight(
        currentProject,
        moduleResolutionPolicy,
      )).toMatchObject({
        activationSourceCount: 1,
        entrypointClusterCount: 1,
        connectivity: 'not-required',
      });
    });
  }, 30_000);

  test('prunes stale app, evaluator, and TypeSystem generations when an edit introduces a refused entrypoint', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': 'export const helper = true;\n',
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-stale-upstream-pruning',
      });
      await runtime.openApp({ analysisDepth: 'runtime-topology' });
      expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(1);
      expect(runtime.projectEvaluations.readEntryCount()).toBeGreaterThan(0);
      expect(runtime.typeSystemProjects.readEntryCount()).toBe(1);

      fs.writeFileSync(path.join(workspaceRoot, 'src/second.ts'), [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'));
      runtime.workspace.projectInputAuthority.advance();

      await expect(runtime.openApp({ analysisDepth: 'runtime-topology' })).rejects.toMatchObject({
        code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
        entrypointEvidenceKind: 'authored-direct',
        entrypointClusterCount: 2,
      });
      expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);
      expect(runtime.projectEvaluations.readEntryCount()).toBe(0);
      expect(runtime.typeSystemProjects.readEntryCount()).toBe(0);
    });
  }, 30_000);

  test('retires a stale evaluator-only generation when an edit introduces a refused entrypoint', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': 'export const helper = true;\n',
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-stale-evaluator-only-pruning',
      });
      const projectKey = runtime.workspace.projects[0]!.projectKey;
      await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.UnresolvedModules,
        projectKey,
      });
      expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);
      expect(runtime.projectEvaluations.readEntryCount()).toBeGreaterThan(0);
      expect(runtime.typeSystemProjects.readEntryCount()).toBe(0);

      fs.writeFileSync(path.join(workspaceRoot, 'src/second.ts'), [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'));
      runtime.workspace.projectInputAuthority.advance();

      await expect(runtime.openApp({
        projectKey,
        analysisDepth: 'runtime-topology',
      })).rejects.toMatchObject({
        code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
        entrypointEvidenceKind: 'authored-direct',
        entrypointClusterCount: 2,
      });
      expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);
      expect(runtime.projectEvaluations.readEntryCount()).toBe(0);
      expect(runtime.typeSystemProjects.readEntryCount()).toBe(0);
    });
  }, 30_000);

  test('retires the stale app evaluator while preserving current profiles after dispose-app, edit, and refusal', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': 'export const helper = true;\n',
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-disposed-app-evaluator-pruning',
      });
      const projectKey = runtime.workspace.projects[0]!.projectKey;
      await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.AppDiagnostics,
        projectKey,
        appRetention: 'dispose-app',
        typeSystemDependencyCacheClearPolicy: 'preserve',
      });
      expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);
      expect(runtime.projectEvaluations.readEntryCount()).toBeGreaterThanOrEqual(2);
      expect(runtime.projectEvaluations.hasCommittedGeneration(
        projectKey,
        aureliaAppProjectEvaluationProfile,
      )).toBe(true);
      expect(runtime.projectEvaluations.hasCommittedGeneration(
        projectKey,
        resourceConventionToolingEvaluationProfile,
      )).toBe(true);
      expect(runtime.typeSystemProjects.readEntryCount()).toBe(0);

      fs.writeFileSync(path.join(workspaceRoot, 'src/second.ts'), [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'));
      runtime.workspace.projectInputAuthority.advance();

      await expect(runtime.openApp({
        projectKey,
        analysisDepth: 'runtime-topology',
      })).rejects.toMatchObject({
        code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
        entrypointEvidenceKind: 'authored-direct',
        entrypointClusterCount: 2,
      });
      expect(runtime.analysisCacheOverview().value.cachedAppCount).toBe(0);
      expect(runtime.projectEvaluations.hasCommittedGeneration(
        projectKey,
        aureliaAppProjectEvaluationProfile,
      )).toBe(false);
      expect(runtime.projectEvaluations.hasCommittedGeneration(
        projectKey,
        resourceConventionToolingEvaluationProfile,
      )).toBe(true);
      expect(runtime.projectEvaluations.readEntryCount()).toBe(1);
      expect(runtime.typeSystemProjects.readEntryCount()).toBe(0);
    });
  }, 30_000);

  test('allows intersecting multi-source activation graphs without an aggregate opt-in', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureFixtureRoot('di-authored-app-containers'),
      storeKey: 'contract:application-entrypoint-intersecting-preflight',
    });

    const app = await runtime.openApp({ analysisDepth: 'runtime-topology' });

    expect(app.emission.appWorld.compilerWorlds).toHaveLength(2);
    expect(app.ask({ kind: SemanticAppQueryKind.AppTopology }).applicationEntrypointPolicy)
      .toBe(SemanticApplicationEntrypointPolicy.RequireSingleGraph);
    const initialProgram = app.emission.typeSystem.program;
    const initialProject = app.project;
    const aggregate = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      applicationEntrypointPolicy: SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs,
    });
    expect(aggregate.emission.typeSystem.program).toBe(initialProgram);
    expect(aggregate.emission.profile.typeSystemAcquisition.kind).toBe('reused');
    expect(aggregate.emission.profile.evaluationAcquisitions.map((acquisition) => acquisition.kind))
      .toEqual(['reused', 'reused']);
    expect(aggregate.ask({ kind: SemanticAppQueryKind.AppTopology }).applicationEntrypointPolicy)
      .toBe(SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs);
    const baseline = runtime.projectEvaluations
      .acquire(initialProject, aureliaAppProjectEvaluationProfile)
      .readBaseline();
    const retainedInvocationEvidence = baseline.readEvaluatedSources().map((source) => ({
      evaluation: source.evaluation,
      invocationEvaluations: source.evaluation.invocationEvaluations,
      invocationRows: [...source.evaluation.invocationEvaluations],
    }));
    const firstPreflight = readSemanticApplicationEntrypointPreflight(baseline);
    const repeatedPreflight = readSemanticApplicationEntrypointPreflight(baseline);
    expect(firstPreflight).toMatchObject({
      evidenceKind: 'evaluated-closed',
      connectivity: 'complete',
      entrypointClusterCount: 1,
    });
    expect(repeatedPreflight).toEqual(firstPreflight);
    for (const retained of retainedInvocationEvidence) {
      expect(retained.evaluation.invocationEvaluations).toBe(retained.invocationEvaluations);
      expect([...retained.evaluation.invocationEvaluations]).toEqual(retained.invocationRows);
    }
    expect(runtime.analysisCacheOverview({ rowLimit: 1 }).value.cachedApps).toContainEqual(
      expect.objectContaining({
        applicationEntrypointPolicy: SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs,
      }),
    );
  }, 30_000);

  test('refuses inconclusive executable connectivity before entering the evaluator boundary', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `import './missing-script';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-unresolved-connectivity',
      });
      const projectEvaluationAcquire = vi.spyOn(runtime.projectEvaluations, 'acquire');
      const projectEvaluationReplacement = vi.spyOn(runtime.projectEvaluations, 'acquireReplacement');

      await expect(runtime.openApp({ analysisDepth: 'runtime-topology' })).rejects.toMatchObject({
        code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
        entrypointEvidenceKind: 'authored-direct',
        entrypointSelectionReason: 'connectivity-inconclusive',
        entrypointClusterCount: 2,
      });
      expect(projectEvaluationAcquire).not.toHaveBeenCalled();
      expect(projectEvaluationReplacement).not.toHaveBeenCalled();

      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        applicationEntrypointPolicy: SemanticApplicationEntrypointPolicy.AggregateIndependentGraphs,
      });
      const preflight = readSemanticApplicationEntrypointPreflight(app.emission.evaluation);
      expect(preflight).toMatchObject({
        evidenceKind: 'evaluated-closed',
        connectivity: 'inconclusive',
        entrypointClusterCount: 2,
      });
      expect(preflight.openExecutableModuleEdgeCount).toBeGreaterThan(0);
      expect(projectEvaluationAcquire).toHaveBeenCalledTimes(1);
      expect(projectEvaluationReplacement).toHaveBeenCalledTimes(1);
    });
  }, 30_000);

  test('recognizes import-equals as a shared static entrypoint ancestor', async () => {
    await withTemporaryApp({
      'src/root.ts': [
        `import first = require('./first');`,
        `import second = require('./second');`,
        `void first;`,
        `void second;`,
      ].join('\n'),
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
        `export const first = true;`,
      ].join('\n'),
      'src/second.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
        `export const second = true;`,
      ].join('\n'),
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-import-equals-connectivity',
      });

      const preflight = readSemanticApplicationEntrypointSourcePreflight(
        runtime.workspace.projects[0]!,
        aureliaAppProjectEvaluationProfile.prepare().options.moduleResolutionPolicy!,
      );
      expect(preflight).toMatchObject({
        evidenceKind: 'authored-direct',
        connectivity: 'complete',
        activationSourceCount: 2,
        entrypointClusterCount: 1,
      });
      await expect(runtime.openApp({ analysisDepth: 'runtime-topology' })).resolves.toBeDefined();
    });
  }, 30_000);

  test('keeps non-literal dynamic module connectivity inconclusive before evaluation', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `const target = './second';`,
        `void import(target);`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-dynamic-connectivity',
      });
      const preflight = readSemanticApplicationEntrypointSourcePreflight(
        runtime.workspace.projects[0]!,
        aureliaAppProjectEvaluationProfile.prepare().options.moduleResolutionPolicy!,
      );
      expect(preflight).toMatchObject({
        evidenceKind: 'authored-direct',
        connectivity: 'inconclusive',
        entrypointClusterCount: 2,
      });
      expect(preflight.openExecutableModuleEdgeCount).toBeGreaterThan(0);
    });
  });

  test('keeps unresolved project path-alias connectivity inconclusive before evaluation', async () => {
    await withTemporaryApp({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@local/*': ['src/*'] },
        },
        include: ['src/**/*.ts'],
      }),
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `import '@local/missing-bridge';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-path-alias-connectivity',
      });
      const preflight = readSemanticApplicationEntrypointSourcePreflight(
        runtime.workspace.projects[0]!,
        aureliaAppProjectEvaluationProfile.prepare().options.moduleResolutionPolicy!,
      );
      expect(preflight).toMatchObject({
        evidenceKind: 'authored-direct',
        connectivity: 'inconclusive',
        entrypointClusterCount: 2,
      });
      expect(preflight.openExecutableModuleEdgeCount).toBeGreaterThan(0);
    });
  });

  test('ignores unresolved inert assets but excludes nested helper calls from direct entrypoint evidence', async () => {
    await withTemporaryApp({
      'src/first.ts': [
        `import Aurelia from 'aurelia';`,
        `import './missing.scss';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/helper.ts': [
        `import Aurelia from 'aurelia';`,
        `export function configure() {`,
        `  return Aurelia.app({ host: document.body, component: {} });`,
        `}`,
      ].join('\n'),
      'src/reassigned.ts': [
        `import Aurelia from 'aurelia';`,
        `declare const fake: Aurelia;`,
        `let au = new Aurelia();`,
        `au = fake;`,
        `void au.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/second.ts': [
        `import Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
      'src/type-only.ts': [
        `import type Aurelia from 'aurelia';`,
        `void Aurelia.app({ host: document.body, component: {} });`,
      ].join('\n'),
    }, async (workspaceRoot) => {
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'contract:application-entrypoint-inert-asset-connectivity',
      });
      const syntax = readSemanticProjectAppSourceSyntax(runtime.workspace.projects[0]!);
      expect(syntax.find((source) => source.sourcePath.endsWith('helper.ts'))).toMatchObject({
        authoredDirectApplicationEntrypointCount: 0,
        signals: expect.arrayContaining([expect.objectContaining({ signal: 'aurelia-app-call', count: 1 })]),
      });
      expect(syntax.find((source) => source.sourcePath.endsWith('reassigned.ts')))
        .toMatchObject({ authoredDirectApplicationEntrypointCount: 0 });
      expect(syntax.find((source) => source.sourcePath.endsWith('type-only.ts')))
        .toMatchObject({ authoredDirectApplicationEntrypointCount: 0, signals: [] });
      const projectEvaluationAcquire = vi.spyOn(runtime.projectEvaluations, 'acquire');

      await expect(runtime.openApp({ analysisDepth: 'runtime-topology' })).rejects.toMatchObject({
        code: SEMANTIC_RUNTIME_APP_ENTRYPOINT_SELECTION_REQUIRED_ERROR_CODE,
        entrypointEvidenceKind: 'authored-direct',
        entrypointClusterCount: 2,
      });
      expect(projectEvaluationAcquire).not.toHaveBeenCalled();
    });
  }, 30_000);
});

function pressureFixtureRoot(fixtureName: string): string {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  return path.join(packageRoot, 'fixtures/pressure', fixtureName);
}

async function withTemporaryApp(
  files: Readonly<Record<string, string>>,
  operation: (workspaceRoot: string) => Promise<void>,
): Promise<void> {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-entrypoint-preflight-'));
  try {
    fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify({
      private: true,
      type: 'module',
      dependencies: { aurelia: '*' },
    }));
    for (const [relativePath, contents] of Object.entries(files)) {
      const fileName = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(fileName), { recursive: true });
      fs.writeFileSync(fileName, contents);
    }
    await operation(workspaceRoot);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}
