import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { AureliaAppWorldEmission } from '../src/configuration/app-world-composer.js';
import {
  type KernelPublicationWriterId,
  StagedKernelPublicationContext,
} from '../src/kernel/publication.js';
import { TemplateCompilerReadView } from '../src/template/compiler-read-view.js';
import { TemplateResourceVisibilityKind } from '../src/template/compiler-world-reference.js';
import {
  TemplateCompilationAdmissionOriginKind,
  TemplateCompilationCohortKind,
  TemplateCompilationCohortProjectAuthority,
  TemplateCompilationCohortProjectPlan,
  TemplateCompilationOwnerPlan,
} from '../src/template/template-compilation-cohort.js';
import {
  TemplateCompilationCohortPlanner,
  TemplateCompilationCohortPlanningPhase,
  TemplateCompilationCohortPlanningRequest,
} from '../src/template/template-compilation-cohort-planner.js';
import { TemplateTypeSystemOverlayBuilder } from '../src/template/template-type-system-overlay.js';

describe('template compilation cohort planning', () => {
  test('selects source-filtered authoring owners from the staged app generation', async () => {
    const fixtureRoot = fixturePath('resource-metadata-errors');
    const sourceFile = path.join(fixtureRoot, 'src/resource-metadata-errors-app.ts');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-cohort-plan:staged-authoring-source',
    });
    const app = await runtime.openApp({
      includeAuthoringTemplates: true,
      authoringTemplateSourceFiles: [sourceFile],
    });

    expect(owner(app.emission.templates.cohortPlan, 'containerless-slot-conflict').cohorts.map((cohort) => cohort.kind))
      .toEqual([TemplateCompilationCohortKind.Authoring]);
    const slotConflict = app.emission.templates.authoringResources.find((resource) =>
      resource.compilation.definition.name === 'containerless-slot-conflict'
    );
    expect(slotConflict?.compilation.compiledTemplate.issues.map((issue) => issue.frameworkErrorCode))
      .toContain('AUR0717');
  }, 30_000);

  test('partitions routeable owners by app-root context and retains every admission origin', async () => {
    const fixtureRoot = fixturePath('router-configuration-root-ownership');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-cohort-plan:route-ownership',
    });
    const app = await runtime.openApp({ includeAuthoringTemplates: true });
    const plan = app.emission.templates.cohortPlan;
    const rootNames = new Map(plan.appRootCompilerWorlds.map((world) => [
      world.world.appRoot?.productHandle ?? '',
      world.resourceScope.resources.find((resource) =>
        resource.visibilityKind === TemplateResourceVisibilityKind.AppRoot
      )?.name ?? '',
    ]));

    expect(appCohortRootNames(plan, rootNames, 'first-child')).toEqual(['first-router-root']);
    expect(appCohortRootNames(plan, rootNames, 'shared-child')).toEqual([
      'shared-router-root',
      'shared-router-root',
    ]);
    expect(appCohortRootNames(plan, rootNames, 'registry-child')).toEqual(['registry-router-root']);
    expect(appCohortRootNames(plan, rootNames, 'duplicate-child')).toEqual([]);
    expect(owner(plan, 'duplicate-child').cohorts.map((cohort) => cohort.kind))
      .toEqual([TemplateCompilationCohortKind.Authoring]);

    for (const ownerPlan of plan.ownerPlans) {
      for (const cohort of ownerPlan.cohorts) {
        expect(cohort.parentCompilerWorld.resourceScope.resources.some((resource) =>
          resource.definitionProductHandle === ownerPlan.definition.productHandle
        )).toBe(true);
      }
      for (const cohort of app.emission.templateCohorts.cohortSetFor(ownerPlan.definition).current()) {
        const readView = new TemplateCompilerReadView(runtime.workspace.store, cohort.compilerWorldAuthority);
        expect(readView.templateOwnerResource(ownerPlan.definition)).not.toBeNull();
      }
    }

    expect(originKinds(plan, 'first-router-root')).toEqual(expect.arrayContaining([
      TemplateCompilationAdmissionOriginKind.AppVisibility,
      TemplateCompilationAdmissionOriginKind.RouteComponent,
    ]));
    expect(originKinds(plan, 'first-child')).toEqual([
      TemplateCompilationAdmissionOriginKind.RouteComponent,
    ]);
    expect(originKinds(plan, 'shared-child')).toEqual([
      TemplateCompilationAdmissionOriginKind.RouteComponent,
      TemplateCompilationAdmissionOriginKind.RouteComponent,
    ]);

    const reorderedAppWorld = new AureliaAppWorldEmission(
      app.emission.appWorld.configuration,
      app.emission.appWorld.diWorld,
      app.emission.appWorld.configuredSyntax,
      app.emission.appWorld.configuredResources,
      app.emission.appWorld.configuredRenderers,
      app.emission.appWorld.frameworkServiceCustomizations,
      [...app.emission.appWorld.compilerWorlds].reverse(),
    );
    const committedRecordCount = runtime.workspace.store.readAllRecords().length;
    const appGeneration = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
    expect(appGeneration).not.toBeNull();
    if (appGeneration == null) {
      throw new Error('Expected a current app-analysis generation.');
    }
    const currentComputation = runtime.computationLifecycle.readState(appGeneration.computationId);
    expect(currentComputation).not.toBeNull();
    if (currentComputation == null) {
      throw new Error('Expected a current app-analysis computation.');
    }
    const reorderedPlan = new TemplateCompilationCohortPlanner(
      runtime.workspace.store,
      new StagedKernelPublicationContext(
        runtime.workspace.store,
        currentComputation.publication,
        'test:reordered-cohort-plan' as KernelPublicationWriterId,
      ),
      runtime.frameworkSupport,
    ).plan(new TemplateCompilationCohortPlanningRequest(
      app.project.projectKey,
      reorderedAppWorld,
      app.emission.typeSystem,
      app.emission.resourceIndex,
      app.emission.routeContexts,
      true,
      [],
      null,
      {
        measure<TValue>(_phase: TemplateCompilationCohortPlanningPhase, read: () => TValue): TValue {
          return read();
        },
      },
    ));
    expect(planOccurrenceKeys(reorderedPlan)).toEqual(planOccurrenceKeys(plan));
    expect(runtime.workspace.store.readAllRecords()).toHaveLength(committedRecordCount);

    const overlayBuilder = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem);
    const overlayFileNames = [
      ...app.emission.templates.resources,
      ...app.emission.templates.authoringResources,
    ].flatMap((resource) => {
      const overlaySource = overlayBuilder.build(resource).overlaySource;
      return overlaySource == null ? [] : [overlaySource.fileName];
    });
    expect(new Set(overlayFileNames).size).toBe(overlayFileNames.length);
  }, 30_000);

  test('updates complete owner cohort sets without leaving removed world authorities callable', async () => {
    const fixtureRoot = fixturePath('router-configuration-root-ownership');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-cohort-plan:current-authority',
    });
    const app = await runtime.openApp({ includeAuthoringTemplates: true });
    let currentPlan = app.emission.templates.cohortPlan;
    const sharedChild = owner(currentPlan, 'shared-child');
    const authority = new TemplateCompilationCohortProjectAuthority(() => currentPlan);
    const cohortSet = authority.cohortSetFor(sharedChild.definition);
    const initialCohorts = cohortSet.current();
    expect(initialCohorts).toHaveLength(2);
    expect(() => new TemplateCompilationOwnerPlan(
      sharedChild.definition,
      [sharedChild.cohorts[0]!, sharedChild.cohorts[0]!],
    )).toThrow(/duplicate cohort/u);
    expect(() => new TemplateCompilationCohortProjectPlan(
      currentPlan.projectKey,
      currentPlan.appRootCompilerWorlds,
      [sharedChild, sharedChild],
      currentPlan.authoringCompilerWorld,
    )).toThrow(/duplicate owner/u);

    const retainedCohortPlan = sharedChild.cohorts[0]!;
    const removedCohort = initialCohorts.find((cohort) => cohort.key !== retainedCohortPlan.key)!;
    const removedWorldRead = new TemplateCompilerReadView(
      runtime.workspace.store,
      removedCohort.compilerWorldAuthority,
    );
    expect(removedWorldRead.templateOwnerResource(sharedChild.definition)).not.toBeNull();
    const compilerWorldObservation = removedWorldRead.readAll()[0]!;

    const retainedSharedChild = new TemplateCompilationOwnerPlan(
      sharedChild.definition,
      [retainedCohortPlan],
    );
    currentPlan = new TemplateCompilationCohortProjectPlan(
      currentPlan.projectKey,
      [...currentPlan.appRootCompilerWorlds].reverse(),
      currentPlan.ownerPlans.map((candidate) =>
        candidate.ownerHandle === sharedChild.ownerHandle ? retainedSharedChild : candidate
      ),
      currentPlan.authoringCompilerWorld,
    );

    expect(cohortSet.current().map((cohort) => cohort.key)).toEqual([retainedCohortPlan.key]);
    expect(removedCohort.compilerWorldAuthority.readCurrent()).toBeNull();
    expect(compilerWorldObservation.validate()).toEqual(expect.objectContaining({
      isCurrent: false,
      changedFacets: expect.arrayContaining(['scope', 'closure', 'result']),
    }));
  }, 30_000);
});

function fixturePath(name: string): string {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  return path.join(packageRoot, 'fixtures/pressure', name);
}

function owner(
  plan: TemplateCompilationCohortProjectPlan,
  name: string,
): TemplateCompilationOwnerPlan {
  const result = plan.ownerPlans.find((candidate) => candidate.definition.name === name);
  if (result == null) {
    throw new Error(`Expected template cohort owner ${name}.`);
  }
  return result;
}

function appCohortRootNames(
  plan: TemplateCompilationCohortProjectPlan,
  roots: ReadonlyMap<string, string>,
  ownerName: string,
): readonly string[] {
  return owner(plan, ownerName).cohorts.flatMap((cohort) => {
    if (cohort.kind !== TemplateCompilationCohortKind.App) {
      return [];
    }
    const appRoot = cohort.parentCompilerWorld.world.appRoot?.productHandle ?? '';
    return [roots.get(appRoot) ?? ''];
  });
}

function originKinds(
  plan: TemplateCompilationCohortProjectPlan,
  ownerName: string,
): readonly TemplateCompilationAdmissionOriginKind[] {
  return owner(plan, ownerName).cohorts.flatMap((cohort) => cohort.admissions.map((origin) => origin.kind));
}

function planOccurrenceKeys(
  plan: TemplateCompilationCohortProjectPlan,
): readonly string[] {
  return plan.ownerPlans.flatMap((ownerPlan) => ownerPlan.cohorts.map((cohort) => [
    ownerPlan.ownerHandle,
    cohort.key,
    cohort.parentCompilerWorld.resourceScope.identityHandle,
  ].join('|'))).sort();
}
