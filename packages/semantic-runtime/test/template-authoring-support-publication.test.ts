import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { DiKeyIdentityEmitter } from '../src/di/di-key-identity-emitter.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyLocal,
} from '../src/di/framework-intrinsic-di-key.js';
import { FrameworkSupportAuthority } from '../src/framework/framework-support-authority.js';
import {
  ComputationCommitState,
  ComputationLifecycleRegistry,
} from '../src/kernel/computation-lifecycle.js';
import { KernelStore } from '../src/kernel/store.js';
import { RuntimeHtmlBuiltInResourceCatalogs } from '../src/resources/built-in-resources.js';
import { BuiltInResourceTargetProjectionMaterializer } from '../src/resources/built-in-resource-catalog-materializer.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import { readBuiltInResourceForDefinition } from '../src/resources/resource-definition-lineage.js';
import { RuntimeHtmlBuiltInSyntaxCatalogs } from '../src/template/built-in-syntax.js';
import {
  RuntimeHtmlDefaultRenderers,
  RuntimeRendererGroup,
  RuntimeRendererPackage,
} from '../src/template/runtime-renderer.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

describe('template authoring support publication', () => {
  test('keeps canonical support independent of the app computation that borrows it', () => {
    const store = new KernelStore('template-authoring-support-publication');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const initialCounts = store.readKernelCountSnapshot();
    const support = new FrameworkSupportAuthority(store, lifecycle, 'template-authoring-support');
    support.initializeKnownSupport();
    const supportCounts = store.readKernelCountSnapshot();
    expect(supportCounts.totalRecords).toBeGreaterThan(initialCounts.totalRecords);
    expect(supportCounts.productDetails).toBeGreaterThan(initialCounts.productDetails);
    const containerKeyHandle = store.handles.identity(
      frameworkIntrinsicDiKeyLocal(FrameworkIntrinsicDiKey.IContainer),
    );
    expect(store.read(containerKeyHandle)).toMatchObject({
      kind: 'di-key-identity',
      interfaceName: FrameworkIntrinsicDiKey.IContainer,
      keyAddressHandle: null,
    });

    const resources = support.materializeResourceCatalogs(Object.values(RuntimeHtmlBuiltInResourceCatalogs));
    const definition = resources.resources.find((resource) => resource.definition != null)?.definition ?? null;
    expect(definition).not.toBeNull();
    expect(readBuiltInResourceForDefinition(
      store,
      definition!.productHandle,
    )).toBe(resources.resources.find((resource) => resource.definition === definition)!.resource);

    const appRun = lifecycle.begin({
      kind: 'template-authoring-support-consumer',
      reconciliationKey: 'project',
      summary: 'App candidate borrows canonical authoring support.',
    });
    support.materializeSyntaxCatalogs(Object.values(RuntimeHtmlBuiltInSyntaxCatalogs));
    support.materializeResourceCatalogs(Object.values(RuntimeHtmlBuiltInResourceCatalogs));
    support.materializeRendererCatalogs([{
      packageId: RuntimeRendererPackage.RuntimeHtml,
      group: RuntimeRendererGroup.RuntimeHtmlDefaultRenderers,
      renderers: RuntimeHtmlDefaultRenderers,
    }]);
    const appOwnedKeyRecords = [];
    new DiKeyIdentityEmitter(appRun).emitInterfaceKeyIdentity(
      appOwnedKeyRecords,
      containerKeyHandle,
      FrameworkIntrinsicDiKey.IContainer,
      store.handles.address('app-owned-container-site'),
    );
    expect(appOwnedKeyRecords).toEqual([]);
    expect(appRun.readKernelCountSnapshot()).toEqual(supportCounts);
    appRun.abort();
    expect(store.readKernelCountSnapshot()).toEqual(supportCounts);
  });

  test('replaces app checker projections without changing canonical framework definitions', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-authoring-support-checker-projection',
    });
    const project = runtime.workspace.projects[0];
    if (project == null) {
      throw new Error('Expected the fixture to boot one project.');
    }
    const store = runtime.workspace.store;
    const canonical = runtime.frameworkSupport.materializeResourceCatalogs([
      RuntimeHtmlBuiltInResourceCatalogs.DefaultResources,
    ]);
    const canonicalResource = canonical.resources.find((resource) => resource.definition != null);
    if (canonicalResource?.definition?.productHandle == null) {
      throw new Error('Expected canonical RuntimeHtml resource definition support.');
    }
    expect(canonicalResource.definition.target?.targetType).toBeNull();

    const evaluation = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile).generation.readBaseline();
    const typeSystems = new TypeSystemProjectBuilder(runtime.frameworkSupport);
    const firstTypeSystem = typeSystems.build(project, evaluation);
    const secondTypeSystem = typeSystems.build(project, evaluation);
    expect(secondTypeSystem.epoch.key).not.toBe(firstTypeSystem.epoch.key);
    const locus = {
      kind: 'template-authoring-support-checker-projection',
      reconciliationKey: project.projectKey,
      summary: 'App-owned checker projection of canonical framework support.',
    };

    const abortedRun = runtime.computationLifecycle.begin(locus);
    const abortedProjection = new BuiltInResourceTargetProjectionMaterializer(store, abortedRun)
      .project(canonical, firstTypeSystem);
    const abortedDefinition = projectedDefinitionFor(abortedProjection, canonicalResource.resource.name);
    expect(abortedDefinition.productHandle).not.toBe(canonicalResource.definition.productHandle);
    expect(abortedRun.read(abortedDefinition.productHandle!)).not.toBeNull();
    expect(store.read(abortedDefinition.productHandle!)).toBeNull();
    abortedRun.abort();
    expect(store.read(abortedDefinition.productHandle!)).toBeNull();

    const firstRun = runtime.computationLifecycle.begin(locus);
    const firstProjection = new BuiltInResourceTargetProjectionMaterializer(store, firstRun)
      .project(canonical, firstTypeSystem);
    const firstDefinition = projectedDefinitionFor(firstProjection, canonicalResource.resource.name);
    expect(firstRun.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle!))
      .toBe(firstDefinition);

    const secondRun = runtime.computationLifecycle.begin(locus);
    const secondProjection = new BuiltInResourceTargetProjectionMaterializer(store, secondRun)
      .project(canonical, secondTypeSystem);
    const secondDefinition = projectedDefinitionFor(secondProjection, canonicalResource.resource.name);
    expect(secondDefinition.productHandle).not.toBe(firstDefinition.productHandle);
    expect(secondRun.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.read(firstDefinition.productHandle!)).toBeNull();
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle!)).toBeNull();
    expect(store.productDetails.read(ResourceProductDetails.Definition, secondDefinition.productHandle!))
      .toBe(secondDefinition);
    expect(store.productDetails.read(
      ResourceProductDetails.Definition,
      canonicalResource.definition.productHandle,
    )).toBe(canonicalResource.definition);
  }, 30_000);
});

function projectedDefinitionFor(
  emission: ReturnType<BuiltInResourceTargetProjectionMaterializer['project']>,
  name: string,
) {
  const definition = emission.resources.find((resource) => resource.resource.name === name)?.definition ?? null;
  if (definition?.productHandle == null) {
    throw new Error(`Expected projected built-in resource definition ${name}.`);
  }
  return definition;
}
