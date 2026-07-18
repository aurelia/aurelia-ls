import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { ConfigurationRecognitionProjectPass } from '../src/configuration/configuration-recognition-project-pass.js';
import { ComputationCommitState } from '../src/kernel/computation-lifecycle.js';
import { ResourceDefinitionIndex } from '../src/resources/resource-definition-index.js';
import { resourceConventionToolingEvaluationProfile } from '../src/resources/resource-convention-transform-admission.js';
import { ResourceRecognitionProjectPass } from '../src/resources/resource-recognition-project-pass.js';
import { RouterProductDetails } from '../src/router/product-details.js';
import { RouteConfigConvergenceProjectPass } from '../src/router/route-config-convergence.js';
import { RouteConfigRecognitionProjectPass } from '../src/router/route-config-recognition.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

describe('router publication', () => {
  test('keeps recognized and converged route products inside one caller-owned candidate', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:router-publication',
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

    const resourceRun = runtime.computationLifecycle.begin({
      kind: 'router-publication-resource-prerequisite',
      reconciliationKey: project.projectKey,
      summary: `resource prerequisite for ${project.projectKey}`,
    });
    const resources = new ResourceRecognitionProjectPass().recognizeAndEmit(
      store,
      project,
      evaluation,
      conventionToolingEvaluation,
      typeSystem,
      resourceRun,
    );
    expect(resourceRun.commit().state).toBe(ComputationCommitState.Committed);
    const resourceIndex = ResourceDefinitionIndex.fromProject(resources);
    const locus = {
      kind: 'router-publication-test',
      reconciliationKey: project.projectKey,
      summary: `router publication for ${project.projectKey}`,
    };

    const prepare = (publication: ReturnType<typeof runtime.computationLifecycle.begin>) => {
      const configuration = new ConfigurationRecognitionProjectPass().recognizeAndEmit(
        store,
        project,
        resourceIndex,
        evaluation,
        typeSystem,
        publication,
      );
      const contributions = new RouteConfigRecognitionProjectPass().recognizeAndEmit(
        publication,
        project,
        evaluation,
        resourceIndex,
      );
      const routes = new RouteConfigConvergenceProjectPass().convergeAndEmit(
        publication,
        project,
        contributions,
        resourceIndex,
        configuration,
      );
      return { contributions, routes };
    };

    const abortedRun = runtime.computationLifecycle.begin(locus);
    const aborted = prepare(abortedRun);
    const contribution = aborted.contributions.readContributions()[0];
    const route = aborted.routes.readRouteConfigs()[0];
    expect(contribution).toBeDefined();
    expect(route).toBeDefined();
    if (contribution == null || route == null) {
      throw new Error('Expected storefront route products.');
    }
    expect(store.read(contribution.productHandle)).toBeNull();
    expect(store.read(route.productHandle)).toBeNull();
    expect(abortedRun.readProductDetail(
      RouterProductDetails.RouteConfigContribution,
      contribution.productHandle,
    )).toBe(contribution);
    expect(abortedRun.readProductDetail(RouterProductDetails.RouteConfig, route.productHandle)).toBe(route);
    abortedRun.abort();
    expect(store.read(contribution.productHandle)).toBeNull();
    expect(store.productDetails.read(
      RouterProductDetails.RouteConfigContribution,
      contribution.productHandle,
    )).toBeNull();
    expect(store.productDetails.read(RouterProductDetails.RouteConfig, route.productHandle)).toBeNull();

    const committedRun = runtime.computationLifecycle.begin(locus);
    const committed = prepare(committedRun);
    const committedContribution = committed.contributions.readContributions().find((candidate) =>
      candidate.productHandle === contribution.productHandle
    );
    const committedRoute = committed.routes.readRouteConfigs().find((candidate) =>
      candidate.productHandle === route.productHandle
    );
    expect(committedContribution).toBeDefined();
    expect(committedRoute).toBeDefined();
    expect(committedRun.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(
      RouterProductDetails.RouteConfigContribution,
      contribution.productHandle,
    )).toBe(committedContribution);
    expect(store.productDetails.read(RouterProductDetails.RouteConfig, route.productHandle)).toBe(committedRoute);
  }, 30_000);
});
