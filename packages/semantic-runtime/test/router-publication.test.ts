import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { ConfigurationRecognitionProjectPass } from '../src/configuration/configuration-recognition-project-pass.js';
import {
  ComputationCommitState,
  ComputationReadValidationScope,
} from '../src/kernel/computation-lifecycle.js';
import { ResourceDefinitionIndex } from '../src/resources/resource-definition-index.js';
import { resourceConventionToolingEvaluationProfile } from '../src/resources/resource-convention-transform-admission.js';
import { ResourceRecognitionProjectPass } from '../src/resources/resource-recognition-project-pass.js';
import { RouterProductDetails } from '../src/router/product-details.js';
import {
  RouteConfigExecutionKind,
  RouteConfigOriginKind,
} from '../src/router/model.js';
import { RouteConfigConvergenceProjectPass } from '../src/router/route-config-convergence.js';
import { RouteConfigRecognitionProjectPass } from '../src/router/route-config-recognition.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

describe('router publication', () => {
  test('spends each reached Route.configure occurrence without replaying the source site', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/route-config-execution-order');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:route-config-execution-order',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const configureContributions = app.emission.routeConfigContributions.readContributions()
      .filter((contribution) =>
        contribution.originKind === RouteConfigOriginKind.ConfigureCall
        && contribution.component?.localName === 'ConfiguredRoute'
      );
    const executed = configureContributions.filter((contribution) =>
      contribution.executionKind === RouteConfigExecutionKind.Executed
    );
    const unproven = configureContributions.filter((contribution) =>
      contribution.executionKind === RouteConfigExecutionKind.Unproven
    );

    expect(executed.map((contribution) => contribution.id)).toEqual([
      'first-execution',
      'second-execution',
    ]);
    expect(executed.map((contribution) => contribution.paths)).toEqual([
      ['first-execution'],
      ['second-execution'],
    ]);
    expect(executed.map((contribution) => contribution.executionOrder))
      .toEqual([...executed.map((contribution) => contribution.executionOrder)].sort((left, right) => left! - right!));
    expect(new Set(executed.map((contribution) => contribution.executionOrder)).size).toBe(2);
    expect(unproven.map((contribution) => contribution.id)).toEqual(['never-executed']);

    const effective = app.emission.routes.readRouteConfigs().find((route) =>
      route.component?.localName === 'ConfiguredRoute'
      && route.sourceContribution?.productHandle === executed[1]?.productHandle
    );
    expect(effective?.id).toBe('second-execution');
    expect(effective?.paths).toEqual(['second-execution']);
  }, 30_000);

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
    const validationScope = new ComputationReadValidationScope();
    const evaluation = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
      validationScope,
    ).readBaseline();
    const conventionToolingEvaluation = runtime.projectEvaluations.acquire(
      project,
      resourceConventionToolingEvaluationProfile,
      validationScope,
    );
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
        typeSystem,
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
