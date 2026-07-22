import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { AureliaAppWorldEmission } from '../src/configuration/app-world-composer.js';
import {
  type KernelPublicationWriterId,
  StagedKernelPublicationContext,
} from '../src/kernel/publication.js';
import type { ProductDetailSlot } from '../src/kernel/product-details.js';
import type { ProductHandle } from '../src/kernel/handles.js';
import {
  KernelReadProjectionRevision,
  type KernelStore,
} from '../src/kernel/store.js';
import type {
  MaterializationOwnerHandle,
  MaterializationRecord,
} from '../src/kernel/materialization.js';
import {
  TemplateCompilerReadObservation,
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import { TemplateResourceVisibilityKind } from '../src/template/compiler-world-reference.js';
import { TemplateCompilerWorldMaterializer } from '../src/template/compiler-world-materializer.js';
import {
  TemplateCompilationAdmissionOriginKind,
  TemplateCompilationCohortKind,
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
        const readView = new TemplateCompilerReadView(
          runtime.workspace.store,
          TemplateCompilerWorldAuthority.fixed(cohort.parentCompilerWorld),
        );
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
    const projectionWriter = 'test:reordered-cohort-plan' as KernelPublicationWriterId;
    const projection = new StagedKernelPublicationContext(
      runtime.workspace.store,
      currentComputation.publication,
      projectionWriter,
    );
    const compilerWorlds = new TemplateCompilerWorldMaterializer(projection);
    for (const world of reorderedAppWorld.compilerWorlds) {
      compilerWorlds.publish(`test-replay:${world.world.productHandle}`, world);
    }
    const reorderedPlan = new TemplateCompilationCohortPlanner(
      runtime.workspace.store,
      projection,
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
    expect(projection.hasStagedActivityFrom(projectionWriter)).toBe(true);
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

  test('shares compiler-scope closure validation until the kernel projection revision advances', async () => {
    const fixtureRoot = fixturePath('router-configuration-root-ownership');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-read-shared-validation',
    });
    const app = await runtime.openApp({ includeAuthoringTemplates: true });
    const world = owner(app.emission.templates.cohortPlan, 'first-child').cohorts[0]?.parentCompilerWorld ?? null;
    expect(world).not.toBeNull();
    if (world == null) {
      throw new Error('Expected a compiler world for first-child.');
    }

    const observedStore = new CountingTemplateCompilerReadStore(runtime.workspace.store);
    const observedView = new TemplateCompilerReadView(
      observedStore,
      TemplateCompilerWorldAuthority.fixed(world),
    );
    observedView.element('first-child');
    observedView.resolveResources();
    const reads = observedView.readAll();
    expect(reads.length).toBeGreaterThan(1);
    expect(observedStore.ownerReadCount).toBeGreaterThan(0);

    const currentStore = new CountingTemplateCompilerReadStore(runtime.workspace.store);
    const rebase = TemplateCompilerReadObservation.createRebaser(
      currentStore,
      TemplateCompilerWorldAuthority.fixed(world),
    );
    const rebased = reads.map((read) => rebase(read));
    expect(rebased.every((read) => read != null)).toBe(true);
    const readsPerSnapshot = currentStore.ownerReadCount;
    expect(readsPerSnapshot).toBeGreaterThan(0);

    for (const read of rebased) {
      expect(read?.validate().isCurrent).toBe(true);
    }
    expect(currentStore.ownerReadCount).toBe(readsPerSnapshot);

    currentStore.advanceCandidateRevision();
    for (const read of rebased) {
      expect(read?.validate().isCurrent).toBe(true);
    }
    expect(currentStore.ownerReadCount).toBe(readsPerSnapshot * 2);
  }, 30_000);

  test('indexes immutable owner plans and rejects duplicate owner or cohort identities', async () => {
    const fixtureRoot = fixturePath('router-configuration-root-ownership');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compilation-cohort-plan:current-authority',
    });
    const app = await runtime.openApp({ includeAuthoringTemplates: true });
    const currentPlan = app.emission.templates.cohortPlan;
    const sharedChild = owner(currentPlan, 'shared-child');
    expect(sharedChild.cohorts).toHaveLength(2);
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
    const retainedSharedChild = new TemplateCompilationOwnerPlan(
      sharedChild.definition,
      [retainedCohortPlan],
    );
    const retainedPlan = new TemplateCompilationCohortProjectPlan(
      currentPlan.projectKey,
      [...currentPlan.appRootCompilerWorlds].reverse(),
      currentPlan.ownerPlans.map((candidate) =>
        candidate.ownerHandle === sharedChild.ownerHandle ? retainedSharedChild : candidate
      ),
      currentPlan.authoringCompilerWorld,
    );

    expect(owner(retainedPlan, 'shared-child').cohorts).toEqual([retainedCohortPlan]);
    const removedCohort = sharedChild.cohorts.find((cohort) => cohort.key !== retainedCohortPlan.key)!;
    expect(owner(retainedPlan, 'shared-child').cohorts).not.toContain(removedCohort);
    expect(sharedChild.cohorts).toContain(removedCohort);
  }, 30_000);
});

class CountingTemplateCompilerReadStore {
  private candidateMutationOrdinal = 0;
  ownerReadCount = 0;

  constructor(private readonly store: KernelStore) {}

  readProjectionRevision(): KernelReadProjectionRevision {
    const committed = this.store.readProjectionRevision();
    return new KernelReadProjectionRevision(
      committed.committedMutationOrdinal,
      this.candidateMutationOrdinal,
    );
  }

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    this.ownerReadCount += 1;
    return this.store.readMaterializationsByOwner(ownerHandle);
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    return this.store.readProductDetail(slot, productHandle);
  }

  advanceCandidateRevision(): void {
    this.candidateMutationOrdinal += 1;
  }
}

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
