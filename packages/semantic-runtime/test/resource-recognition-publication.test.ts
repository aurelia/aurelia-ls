import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { ComputationCommitState } from '../src/kernel/computation-lifecycle.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import { resourceConventionToolingEvaluationProfile } from '../src/resources/resource-convention-transform-admission.js';
import { ResourceRecognitionProjectPass } from '../src/resources/resource-recognition-project-pass.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

describe('resource recognition publication', () => {
  test('stages and replaces one complete resource project closure through its caller', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:resource-recognition-publication',
    });
    const project = runtime.workspace.projects[0];
    if (project == null) {
      throw new Error('Expected the fixture to boot one project.');
    }
    const store = runtime.workspace.store;
    const evaluation = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile).generation.readBaseline();
    const conventionToolingEvaluation = runtime.projectEvaluations.acquire(
      project,
      resourceConventionToolingEvaluationProfile,
    ).generation;
    const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);
    const locus = {
      kind: 'resource-recognition-project-test',
      reconciliationKey: project.projectKey,
      summary: `resource recognition for ${project.projectKey}`,
    };

    const firstRun = runtime.computationLifecycle.begin(locus);
    const first = new ResourceRecognitionProjectPass().recognizeAndEmit(
      store,
      project,
      evaluation,
      conventionToolingEvaluation,
      typeSystem,
      firstRun,
    );
    const firstDefinition = first.readDefinitions()[0];
    expect(firstDefinition).toBeDefined();
    if (firstDefinition?.productHandle == null) {
      throw new Error('Expected a converged resource definition product.');
    }
    expect(store.read(firstDefinition.productHandle)).toBeNull();
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBeNull();
    expect(firstRun.read(firstDefinition.productHandle)).not.toBeNull();
    expect(firstRun.readProductDetail(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(firstDefinition);
    expect(firstRun.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(firstDefinition);

    const secondRun = runtime.computationLifecycle.begin(locus);
    const second = new ResourceRecognitionProjectPass().recognizeAndEmit(
      store,
      project,
      evaluation,
      conventionToolingEvaluation,
      typeSystem,
      secondRun,
    );
    const replacement = second.readDefinitions().find((definition) =>
      definition.productHandle === firstDefinition.productHandle
    );
    expect(replacement).toBeDefined();
    expect(replacement).not.toBe(firstDefinition);
    expect(secondRun.readProductDetail(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(replacement);
    expect(secondRun.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(replacement);
  }, 30_000);
});
