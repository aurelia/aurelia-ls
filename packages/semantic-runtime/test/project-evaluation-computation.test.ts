import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { createSemanticRuntime, type SemanticRuntime } from '../src/api/runtime.js';
import {
  SemanticAppQueryKind,
} from '../src/api/contracts.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import {
  aureliaInterfaceEvaluationForValue,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import {
  StaticProjectEvaluationAcquisitionKind,
  StaticProjectEvaluationComputationPreparation,
  StaticProjectEvaluationComputationProfile,
  StaticProjectEvaluationOptions,
  type StaticProjectEvaluationResult,
} from '../src/evaluation/project-evaluation.js';
import {
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationValueKind,
} from '../src/evaluation/values.js';
import { SourceFileRole } from '../src/kernel/address.js';
import { SemanticRuntimeProjectInputReadKind } from '../src/kernel/project-input.js';
import {
  resourceConventionToolingEvaluationProfile,
} from '../src/resources/resource-convention-transform-admission.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('reusable project evaluation computations', () => {
  test('shares one app evaluator identity while keeping tooling semantics in a separate profile', async () => {
    const { runtime, project } = await createEvaluationRuntime();

    const query = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.UnresolvedModules,
      projectKey: project.projectKey,
      telemetry: {},
    });
    expect(query.profile?.appWorldFreeProfile?.acquisitionKind)
      .toBe(StaticProjectEvaluationAcquisitionKind.Computed);

    const firstAppAccess = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    expect(firstAppAccess.kind).toBe(StaticProjectEvaluationAcquisitionKind.Reused);
    const baseline = firstAppAccess.readBaseline();
    expect(new Set(baseline.readEvaluatedSources().map((source) => source.evaluation.runtimeHost))).toHaveLength(1);
    const app = await runtime.openApp({ projectKey: project.projectKey });
    expect(app.emission.evaluation).not.toBe(baseline);
    expect(new Set(app.emission.evaluation.readEvaluatedSources().map((source) => source.evaluation.runtimeHost)))
      .toHaveLength(1);
    expect(app.emission.profile.phases.map((phase) => phase.name)).not.toContain('static-evaluation');
    expect(app.emission.profile.evaluationAcquisitions).toEqual([
      expect.objectContaining({
        profileKey: 'aurelia-app',
        kind: StaticProjectEvaluationAcquisitionKind.Reused,
      }),
      expect.objectContaining({
        profileKey: 'aurelia-vite-convention-tooling',
        kind: StaticProjectEvaluationAcquisitionKind.Computed,
      }),
    ]);

    const baselineState = evaluatedBinding(baseline, 'entry.ts', 'state');
    const appState = evaluatedBinding(app.emission.evaluation, 'entry.ts', 'state');
    expect(appState).not.toBe(baselineState);
    const baselineInterface = aureliaInterfaceEvaluationForValue(
      evaluatedBinding(baseline, 'entry.ts', 'IState'),
    );
    const appInterface = aureliaInterfaceEvaluationForValue(
      evaluatedBinding(app.emission.evaluation, 'entry.ts', 'IState'),
    );
    expect(appInterface).not.toBe(baselineInterface);
    expect(appInterface?.defaultRegistration?.value).toBe(appState);
    expect(baselineInterface?.defaultRegistration?.value).toBe(baselineState);
    if (appState.kind !== EvaluationValueKind.Object || baselineState.kind !== EvaluationValueKind.Object) {
      throw new Error('Expected app and baseline state bindings to remain object-valued.');
    }
    appState.properties.set('count', new EvaluationObjectProperty(
      'count',
      new EvaluationNumberValue(7),
      null,
      EvaluationObjectPropertyState.Closed,
    ));
    expect(readNumberProperty(appState.properties, 'count')).toBe(7);
    expect(readNumberProperty(baselineState.properties, 'count')).toBe(1);

    const toolingAccess = runtime.projectEvaluations.acquire(project, resourceConventionToolingEvaluationProfile);
    expect(toolingAccess.kind).toBe(StaticProjectEvaluationAcquisitionKind.Reused);
    expect(toolingAccess.generation).not.toBe(firstAppAccess.generation);
    expect(toolingAccess.generation.profileKey).toBe('aurelia-vite-convention-tooling');
    expect(toolingAccess.readBaseline().sources.map((source) => source.admission.path))
      .toContain('vite.config.ts');
    expect(baseline.sources.map((source) => source.admission.path))
      .not.toContain('vite.config.ts');
    const appInputKeys = baseline.readRegisteredInputs().map((read) => read.readKey);
    const toolingInputKeys = toolingAccess.readBaseline().readRegisteredInputs().map((read) => read.readKey);
    expect(appInputKeys.some((key) => key.includes('entry.ts'))).toBe(true);
    expect(appInputKeys.some((key) => key.includes('vite.config.ts'))).toBe(false);
    expect(toolingInputKeys.some((key) => key.includes('vite.config.ts'))).toBe(true);
    expect(toolingInputKeys.some((key) => key.includes('entry.ts'))).toBe(false);
    const appAmbientRead = appInputKeys.find((key) => key.startsWith('static-evaluation-ambient-globals:'));
    const toolingAmbientRead = toolingInputKeys.find((key) => key.startsWith('static-evaluation-ambient-globals:'));
    expect(appAmbientRead).toBe('static-evaluation-ambient-globals:app');
    expect(toolingAmbientRead).toBe(appAmbientRead);
    expect(runtime.computationLifecycle.readersFor(appAmbientRead!)).toHaveLength(2);
    expect(runtime.projectEvaluations.readEntryCount()).toBe(2);
  }, 30_000);

  test('rejects two semantic profile owners behind one evaluator locus key', async () => {
    const { runtime, project } = await createEvaluationRuntime();
    runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    const conflictingProfile = new StaticProjectEvaluationComputationProfile(
      aureliaAppProjectEvaluationProfile.key,
      aureliaAppProjectEvaluationProfile.revision,
      'Conflicting app evaluator profile.',
      () => new StaticProjectEvaluationComputationPreparation(new StaticProjectEvaluationOptions(), null),
    );

    expect(() => runtime.projectEvaluations.acquire(project, conflictingProfile))
      .toThrow(/more than one in-process owner/);
  }, 30_000);

  test('reuses an exact-input-valid evaluator across an event-only project-input generation', async () => {
    const { runtime, project } = await createEvaluationRuntime();
    const first = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    expect(first.kind).toBe(StaticProjectEvaluationAcquisitionKind.Computed);

    runtime.workspace.projectInputAuthority.advance();
    const nextProject = project.forInputGeneration(
      runtime.workspace.projectInputAuthority.capture(project),
    );
    expect(nextProject.inputGeneration.revision).not.toBe(project.inputGeneration.revision);
    expect(nextProject.observedRevision).toBe(project.observedRevision);

    const second = runtime.projectEvaluations.acquire(nextProject, aureliaAppProjectEvaluationProfile);
    expect(second.kind).toBe(StaticProjectEvaluationAcquisitionKind.Reused);
    expect(second.generation).toBe(first.generation);
    expect(second.readBaseline().project).toBe(nextProject);
    expect(first.generation.isCurrent()).toBe(true);
    const state = runtime.computationLifecycle.readState(first.generation.computationAuthority.computationId);
    expect(state?.reads.some((read) => read.domain.startsWith('project-input-generation'))).toBe(false);
    expect(runtime.computationLifecycle.readersFor(nextProject.inputGeneration.currentnessGuardKey)).toEqual([]);
  }, 30_000);

  test('invalidates a negative module read and preserves the admitted baseline across speculative forks', async () => {
    const { runtime, project, root } = await createEvaluationRuntime();
    await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.UnresolvedModules,
      projectKey: project.projectKey,
    });
    const first = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile).generation;
    const firstBaseline = first.readBaseline();
    expect(firstBaseline.readUnresolvedModules()).not.toHaveLength(0);
    expect(project.inputGeneration.readRegisteredInputs()).toContainEqual(expect.objectContaining({
      kind: SemanticRuntimeProjectInputReadKind.FileExistence,
      value: false,
      readKey: expect.stringContaining('missing'),
    }));

    const baselineState = evaluatedBinding(firstBaseline, 'entry.ts', 'state');
    const forkedState = evaluatedBinding(first.forkSession(), 'entry.ts', 'state');
    expect(baselineState.kind).toBe(EvaluationValueKind.Object);
    expect(forkedState.kind).toBe(EvaluationValueKind.Object);
    if (baselineState.kind !== EvaluationValueKind.Object || forkedState.kind !== EvaluationValueKind.Object) {
      throw new Error('Expected object-valued state bindings.');
    }
    expect(forkedState).not.toBe(baselineState);
    forkedState.properties.set('count', new EvaluationObjectProperty(
      'count',
      new EvaluationNumberValue(2),
      null,
      EvaluationObjectPropertyState.Closed,
    ));
    expect(readNumberProperty(forkedState.properties, 'count')).toBe(2);
    expect(readNumberProperty(baselineState.properties, 'count')).toBe(1);

    writeFileSync(path.join(root, 'missing.ts'), 'export const admitted = true;', 'utf8');
    await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.UnresolvedModules,
      projectKey: project.projectKey,
    });
    const currentProject = project.forInputGeneration(runtime.workspace.projectInputAuthority.capture(project));
    const second = runtime.projectEvaluations.acquire(currentProject, aureliaAppProjectEvaluationProfile).generation;
    expect(first.isCurrent()).toBe(false);
    expect(second).not.toBe(first);
    expect(second.readBaseline().readUnresolvedModules()).toHaveLength(0);
    expect(second.readBaseline().sources.map((source) => source.admission.path)).toContain('missing.ts');
    const admittedMissingSource = runtime.workspace.store.readSourceFileAddressesByFileName('missing.ts')[0];
    expect(admittedMissingSource).toBeDefined();
    expect(runtime.computationLifecycle.readState(second.computationAuthority.computationId)?.outputs)
      .not.toContainEqual(expect.objectContaining({ handle: admittedMissingSource?.handle }));

    writeFileSync(path.join(root, 'entry.ts'), [
      "import { DI } from '@aurelia/kernel';",
      'export const state = { count: 1 };',
      "export const IState = DI.createInterface('IState', builder => builder.instance(state));",
      "export const ISelf = DI.createInterface('ISelf', builder => builder.instance(builder));",
    ].join('\n'), 'utf8');
    const withoutImportProject = project.forInputGeneration(runtime.workspace.projectInputAuthority.capture(project));
    const withoutImport = runtime.projectEvaluations.acquire(
      withoutImportProject,
      aureliaAppProjectEvaluationProfile,
    ).generation;
    expect(withoutImport).not.toBe(second);
    expect(withoutImport.readBaseline().sources.map((source) => source.admission.path)).not.toContain('missing.ts');
    expect(runtime.workspace.store.read(admittedMissingSource!.handle)).toBe(admittedMissingSource);
  }, 30_000);

  test('rejects a stale ambient-declaration read and recomputes it once a new input generation is captured', async () => {
    const { runtime, project, root } = await createEvaluationRuntime();
    const first = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile).generation;

    writeFileSync(path.join(root, 'globals.d.ts'), 'declare const SECOND_AMBIENT: string;', 'utf8');
    expect(() => runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile))
      .toThrow(/rejected as rejected-inputs-changed/);

    const currentProject = project.forInputGeneration(runtime.workspace.projectInputAuthority.capture(project));
    const second = runtime.projectEvaluations.acquire(currentProject, aureliaAppProjectEvaluationProfile);
    expect(second.kind).toBe(StaticProjectEvaluationAcquisitionKind.Computed);
    expect(second.generation).not.toBe(first);
  }, 30_000);

  test('retires app, TypeScript, and evaluator generations during explicit analysis-cache clearing', async () => {
    const { runtime, project } = await createEvaluationRuntime();
    const app = await runtime.openApp({ projectKey: project.projectKey });
    const appEvaluation = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile).generation;
    const toolingEvaluation = runtime.projectEvaluations.acquire(
      project,
      resourceConventionToolingEvaluationProfile,
    ).generation;

    const cleared = runtime.clearAnalysisCache().value;
    expect(cleared).not.toBeNull();
    if (cleared == null) {
      throw new Error('Expected analysis-cache clear result.');
    }
    expect(cleared.disposedCachedApps).toBe(1);
    expect(cleared.disposedTypeSystemProjects).toBe(1);
    expect(cleared.disposedStaticProjectEvaluations).toBe(2);
    expect(cleared.remainingTypeSystemProjects).toBe(0);
    expect(cleared.remainingStaticProjectEvaluations).toBe(0);
    expect(runtime.computationLifecycle.readersFor('static-evaluation-ambient-globals:app')).toHaveLength(0);
    expect(app.isCurrent()).toBe(false);
    expect(appEvaluation.isCurrent()).toBe(false);
    expect(toolingEvaluation.isCurrent()).toBe(false);

    const reacquired = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    expect(reacquired.kind).toBe(StaticProjectEvaluationAcquisitionKind.Computed);
    expect(reacquired.generation).not.toBe(appEvaluation);
  }, 30_000);
});

async function createEvaluationRuntime(): Promise<{
  readonly runtime: SemanticRuntime;
  readonly project: SemanticRuntime['workspace']['projects'][number];
  readonly root: string;
}> {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-ls-project-evaluation-computation-'));
  temporaryRoots.push(root);
  writeFileSync(path.join(root, 'entry.ts'), [
    "import { DI } from '@aurelia/kernel';",
    "import './missing';",
    'export const state = { count: 1 };',
    "export const IState = DI.createInterface('IState', builder => builder.instance(state));",
    "export const ISelf = DI.createInterface('ISelf', builder => builder.instance(builder));",
  ].join('\n'), 'utf8');
  writeFileSync(path.join(root, 'vite.config.ts'), [
    "import { aurelia } from '@aurelia/vite-plugin';",
    "import { defineConfig } from 'vite';",
    'export default defineConfig({ plugins: [aurelia()] });',
  ].join('\n'), 'utf8');
  writeFileSync(path.join(root, 'globals.d.ts'), 'declare const FIRST_AMBIENT: string;', 'utf8');
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    storeKey: `test:project-evaluation-computation:${path.basename(root)}`,
    projects: [{
      projectKey: 'app',
      rootDir: root,
      sourceFiles: [
        { path: 'entry.ts', role: SourceFileRole.AppSource },
        { path: 'vite.config.ts', role: SourceFileRole.ToolingConfig },
        { path: 'globals.d.ts', role: SourceFileRole.Declaration },
      ],
    }],
  });
  const project = runtime.workspace.projects[0];
  if (project == null) {
    throw new Error('Expected one booted project.');
  }
  return { runtime, project, root };
}

function evaluatedBinding(
  evaluation: StaticProjectEvaluationResult,
  sourcePath: string,
  bindingName: string,
) {
  const source = evaluation.readEvaluatedSources().find((candidate) => candidate.admission.path === sourcePath);
  const value = source?.evaluation.environment.readValue(bindingName) ?? null;
  if (value == null) {
    throw new Error(`Expected evaluated binding ${sourcePath}:${bindingName}.`);
  }
  return value;
}

function readNumberProperty(
  properties: ReadonlyMap<string, EvaluationObjectProperty>,
  name: string,
): number | null {
  const value = properties.get(name)?.value ?? null;
  return value?.kind === EvaluationValueKind.Number ? value.value : null;
}
