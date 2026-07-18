import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  type SemanticRuntime,
} from '../src/api/runtime.js';
import { aureliaContainerEvaluationForValue } from '../src/configuration/aurelia-evaluation-runtime.js';
import type { ConfigurationKernelEmission } from '../src/configuration/configuration-kernel-emitter.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
} from '../src/di/container-materializer.js';
import type { Container } from '../src/di/container.js';
import {
  readDiContainerApiCallSites,
  type DiContainerApiCallSite,
} from '../src/di/container-api-recognition.js';
import {
  ContainerResolutionFailureKind,
} from '../src/di/container-lookup.js';
import { ContainerDefaultResolverPolicy } from '../src/di/container-configuration.js';
import {
  DiProviderActivationState,
  DiProviderActivationView,
  type DiProviderActivationResult,
  type DiProviderActivationSession,
} from '../src/di/provider-activation.js';
import { ResolverResolutionKind } from '../src/di/resolver.js';
import { DiIssueKind, DiIssueSubjectKind } from '../src/di/di-issue.js';
import {
  isEvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../src/evaluation/project-evaluation.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';
import {
  DiKeyIdentityKind,
  TypeScriptDeclarationIdentity,
} from '../src/kernel/identity.js';
import {
  RegistryRegistrationAdmission,
  ResolverRegistrationAdmission,
  RegistrationStrategy,
} from '../src/registration/registration-admission.js';

const pressureFixtures = fileURLToPath(new URL('../fixtures/pressure', import.meta.url));

describe('DI provider model', () => {
  test('carries a createInterface default registration into the registration corridor', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-cyclic-dependency'),
      storeKey: 'test:di-provider-model:interface-default',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const admissions = app.emission.configuration.readConfiguration().registrationAdmissions;
    const configuration = app.emission.configuration.readConfiguration();
    const world = app.emission.appWorld.diWorld;
    const defaultRegistration = admissions.find((admission) =>
      admission instanceof ResolverRegistrationAdmission
      && admission.strategy === RegistrationStrategy.Singleton
      && admission.targetKey?.localName === 'IFoo'
    );

    expect(defaultRegistration).toBeInstanceOf(ResolverRegistrationAdmission);
    expect(defaultRegistration?.targetKey?.keyKind).toBe(DiKeyIdentityKind.Interface);
    const provider = defaultRegistration?.registeredValue?.identityHandle == null
      ? null
      : runtime.workspace.store.read(defaultRegistration.registeredValue.identityHandle);
    expect(provider).toBeInstanceOf(TypeScriptDeclarationIdentity);
    expect((provider as TypeScriptDeclarationIdentity | null)?.localName).toBe('Foo');
    expect(world.containers).toHaveLength(2);
    const standaloneContainer = configuration.containers.find((container) =>
      configuration.aurelias.every((aurelia) => aurelia.container.productHandle !== container.productHandle)
    ) ?? null;
    const interfaceSlot = world.resolverSlots.find((slot) => slot.resolver?._key.localName === 'IFoo') ?? null;
    expect(standaloneContainer).not.toBeNull();
    expect(interfaceSlot?.container.productHandle).toBe(standaloneContainer?.productHandle);
    expect(world.selfResolverSlots).toHaveLength(2);
    const cycleIssue = world.issues.find((issue) => issue.issueKind === DiIssueKind.CyclicDependency) ?? null;
    expect(cycleIssue?.subject).toEqual({
      kind: DiIssueSubjectKind.DependencyCycle,
      entryKeyExpressionText: 'IFoo',
      entryKeyName: 'IFoo',
      cycle: [{
        keyName: 'IFoo',
        implementationName: 'Foo',
        dependencyKeyName: 'IFoo',
        sourcePath: 'src/main.ts',
      }],
    });
  });

  test('distinguishes callback and cached-callback resolver answers', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-key-identity'),
      storeKey: 'test:di-provider-model:callback-lifetime',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld.diWorld;
    const callbackSlot = world.resolverSlots.find((slot) => slot.resolver?._key.localName === 'callback-service');
    const cachedCallbackSlot = world.resolverSlots.find((slot) => slot.resolver?._key.localName === 'cached-callback-service');
    const admissions = app.emission.configuration.readConfiguration().registrationAdmissions;
    const callbackProvider = admissions.find((admission) => admission.targetKey?.localName === 'callback-service')
      ?.registeredValue?.identityHandle ?? null;
    const cachedCallbackProvider = admissions.find((admission) => admission.targetKey?.localName === 'cached-callback-service')
      ?.registeredValue?.identityHandle ?? null;
    const directProvider = admissions.find((admission) => admission.targetKey?.localName === 'direct-provider')
      ?.registeredValue?.identityHandle ?? null;
    const reexportedProvider = admissions.find((admission) => admission.targetKey?.localName === 'reexported-provider')
      ?.registeredValue?.identityHandle ?? null;
    const requestor = world.containers[0] ?? null;

    expect(callbackProvider).not.toBeNull();
    expect(callbackProvider).toBe(cachedCallbackProvider);
    expect(directProvider).not.toBeNull();
    expect(directProvider).toBe(reexportedProvider);
    expect(callbackSlot?.resolver).not.toBeNull();
    expect(cachedCallbackSlot?.resolver).not.toBeNull();
    expect(requestor).not.toBeNull();
    expect(callbackSlot?.resolver?.resolve(requestor!, requestor!).resolutionKind).toBe(ResolverResolutionKind.Callback);
    expect(cachedCallbackSlot?.resolver?.resolve(requestor!, requestor!).resolutionKind).toBe(ResolverResolutionKind.CachedCallback);
  });

  test('activates exact instances, aliases, and registration-time lexical values', async () => {
    const fixture = await openProviderActivationFixture('value-provenance');
    const session = fixture.activation.createSession();
    const exactInstanceRead = activateNamedSite(fixture, session, 'exactInstanceRead');

    expect(exactInstanceRead.reason).toBeNull();
    expect(exactInstanceRead).toMatchObject({ state: DiProviderActivationState.Value });
    expect(marker(exactInstanceRead.value)).toBe('exact-instance');
    expect(marker(activateNamedSite(fixture, session, 'lexicalRead').value)).toBe('lexical-before');
    expect(marker(activateNamedSite(fixture, session, 'aliasRead').value)).toBe('exact-instance');
    expect(marker(activateNamedSite(fixture, session, 'aliasChainRead').value)).toBe('exact-instance');
  });

  test('preserves singleton and transient provider lifetime within one activation session', async () => {
    const fixture = await openProviderActivationFixture('provider-lifetime');
    const session = fixture.activation.createSession();
    const singletonOne = activateNamedSite(fixture, session, 'singletonReadOne');
    const singletonTwo = activateNamedSite(fixture, session, 'singletonReadTwo');
    const transientOne = activateNamedSite(fixture, session, 'transientReadOne');
    const transientTwo = activateNamedSite(fixture, session, 'transientReadTwo');

    expect(singletonOne.state).toBe(DiProviderActivationState.Value);
    expect(singletonTwo.value).toBe(singletonOne.value);
    expect(transientOne.state).toBe(DiProviderActivationState.Value);
    expect(transientTwo.state).toBe(DiProviderActivationState.Value);
    expect(transientTwo.value).not.toBe(transientOne.value);
  });

  test('spends interface defaults during JIT and fresh activation without declaration-name joins', async () => {
    const fixture = await openProviderActivationFixture('interface-default-activation');
    const session = fixture.activation.createSession();
    const singletonOne = activateNamedSite(fixture, session, 'interfaceDefaultSingletonReadOne');
    const singletonTwo = activateNamedSite(fixture, session, 'interfaceDefaultSingletonReadTwo');
    const transientOne = activateNamedSite(fixture, session, 'interfaceDefaultTransientReadOne');
    const transientTwo = activateNamedSite(fixture, session, 'interfaceDefaultTransientReadTwo');
    const fresh = activateNamedSite(fixture, session, 'interfaceDefaultFreshRead');
    const missing = activateNamedSite(fixture, session, 'interfaceMissingFreshRead');
    const instance = activateNamedSite(fixture, session, 'interfaceInstanceFreshRead');

    expect(marker(singletonOne.value)).toBe('default-singleton');
    expect(singletonTwo.value).toBe(singletonOne.value);
    expect(marker(transientOne.value)).toBe('default-transient');
    expect(marker(transientTwo.value)).toBe('default-transient');
    expect(transientTwo.value).not.toBe(transientOne.value);
    expect(marker(fresh.value)).toBe('default-singleton');
    expect(fresh.value).not.toBe(singletonOne.value);
    expect(missing).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
    });
    expect(instance).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
    });
  });

  test('models the complete Aurelia resolver family and requestor-local scope', async () => {
    const fixture = await openProviderActivationFixture('resolver-family');
    const session = fixture.activation.createSession();
    const child = new ContainerChildMaterializer(fixture.runtime.workspace.store, fixture.runtime.workspace.store)
      .materializeChild(new ContainerChildMaterializationRequest(
        'di-provider-activation-test-child',
        fixture.container,
        null,
        'activation-test-child',
      ))
      .container;

    expect(activateNamedSite(fixture, session, 'optionalMissingRead', child).state)
      .toBe(DiProviderActivationState.Undefined);
    expect(activateNamedSite(fixture, session, 'optionalResourceMissingRead', child).state)
      .toBe(DiProviderActivationState.Undefined);
    expect(activateNamedSite(fixture, session, 'ownRootRead', child).state)
      .toBe(DiProviderActivationState.Undefined);
    const resourceRootRead = activateNamedSite(fixture, session, 'resourceRootRead', child);
    expect(resourceRootRead).toMatchObject({ state: DiProviderActivationState.Value });
    expect(marker(resourceRootRead.value)).toBe('root-only');
    expect(activateNamedSite(fixture, session, 'lazyRead', child).state)
      .toBe(DiProviderActivationState.Deferred);
    expect(activateNamedSite(fixture, session, 'factoryRead', child).state)
      .toBe(DiProviderActivationState.Deferred);
    expect(activateNamedSite(fixture, session, 'ignoredRead', child).state)
      .toBe(DiProviderActivationState.Undefined);

    const multi = arrayMarkers(activateNamedSite(fixture, session, 'allMultiRead', child).value);
    const multiAncestors = arrayMarkers(activateNamedSite(fixture, session, 'allMultiAncestorsRead', child).value);
    const multiResources = arrayMarkers(activateNamedSite(fixture, session, 'allMultiResourcesRead', child).value);
    expect(multi).toEqual(['multi-first', 'multi-second']);
    expect(multiAncestors).toEqual(['multi-first', 'multi-second']);
    expect(multiResources).toEqual(['multi-first', 'multi-second']);
    expect(marker(activateNamedSite(fixture, session, 'lastMultiRead', child).value)).toBe('multi-second');

    const freshOne = activateNamedSite(fixture, session, 'newInstanceReadOne', child);
    const freshTwo = activateNamedSite(fixture, session, 'newInstanceReadTwo', child);
    expect(freshOne.state).toBe(DiProviderActivationState.Value);
    expect(freshTwo.state).toBe(DiProviderActivationState.Value);
    expect(freshTwo.value).not.toBe(freshOne.value);

    const scoped = activateNamedSite(fixture, session, 'scopedInstanceRead', child);
    expect(scoped.state).toBe(DiProviderActivationState.Value);
    expect(activateNamedSite(fixture, session, 'ownScopedRead', child).value).toBe(scoped.value);
    expect(arrayValues(activateNamedSite(fixture, session, 'allScopedRead', child).value)).toEqual([scoped.value]);
    expect(arrayValues(activateNamedSite(fixture, session, 'allScopedAncestorsRead', child).value))
      .toEqual([scoped.value, expect.anything()]);
    expect(arrayValues(activateNamedSite(fixture, session, 'allScopedResourcesRead', child).value))
      .toEqual([scoped.value, expect.anything()]);

    const singleton = activateNamedSite(fixture, session, 'singletonReadOne', child);
    expect(instanceProperty(singleton.value, 'scoped')).toBe(scoped.value);
    expect(arrayValues(instanceProperty(singleton.value, 'pair'))).toEqual([
      expect.objectContaining({ kind: EvaluationValueKind.Object }),
      scoped.value,
    ]);
  });

  test('respects authored lookup order instead of consulting the completed container retroactively', async () => {
    const fixture = await openProviderActivationFixture('lookup-order');
    const session = fixture.activation.createSession();
    const before = activateNamedSite(fixture, session, 'beforeRegistrationRead');
    const after = activateNamedSite(fixture, session, 'afterRegistrationRead');

    expect(before.state).toBe(DiProviderActivationState.Failed);
    expect(marker(after.value)).toBe('late-instance');
  });

  test('uses registry completion and keeps container-mutating registry bodies open', async () => {
    const fixture = await openProviderActivationFixture('registry-jit-completion');
    const implicit = activateContainerSite(fixture, 'registryImplicitUndefinedRead');
    const explicit = activateContainerSite(fixture, 'registryExplicitNullRead');
    const returnedResolver = activateContainerSite(fixture, 'registryReturnedResolverRead');
    const installing = activateContainerSite(fixture, 'registryInstallingRead');

    expect(implicit).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.NullResolverFromRegister,
    });
    expect(explicit).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.NullResolverFromRegister,
    });
    expect(returnedResolver).toMatchObject({
      state: DiProviderActivationState.Open,
      failureKind: null,
    });
    expect(installing).toMatchObject({
      state: DiProviderActivationState.Open,
      failureKind: null,
    });
  });

  test('spends evaluated source-container configuration without receiver spelling heuristics', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-default-resolver-none'),
      storeKey: 'test:di-provider-model:container-configuration',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const configuration = app.emission.appWorld.configuration;
    const containers = configuration.containers.map((container) => container.readConfiguration());
    const noneConfigurations = containers.filter((container) =>
      container.defaultResolverPolicy === ContainerDefaultResolverPolicy.None
    );
    const transientConfigurations = containers.filter((container) =>
      container.defaultResolverPolicy === ContainerDefaultResolverPolicy.Transient
    );
    const noneIssues = app.emission.appWorld.diWorld.issues.filter((issue) =>
      issue.issueKind === DiIssueKind.NoneResolverFound
    );
    const nullishIssues = app.emission.appWorld.diWorld.issues.filter((issue) =>
      issue.issueKind === DiIssueKind.NullUndefinedKey
    );

    expect(noneConfigurations).toHaveLength(2);
    expect(noneConfigurations[0]).toMatchObject({
      inheritParentResources: true,
      defaultResolverPolicy: ContainerDefaultResolverPolicy.None,
    });
    expect(noneConfigurations.every((container) => container.sourceAddressHandle != null)).toBe(true);
    expect(noneConfigurations.every((container) =>
      container.fieldProvenance.some((entry) => entry.field === 'defaultResolverPolicy')
    )).toBe(true);
    expect(transientConfigurations).toHaveLength(1);
    expect(noneIssues).toHaveLength(2);
    expect(nullishIssues).toHaveLength(0);
  });

  test('derives compiler visibility from recursively spent DI registrations', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-nested-compiler-registration'),
      storeKey: 'test:di-provider-model:compiler-visibility',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const appContainer = world.configuration.aurelias[0]?.container.productHandle ?? null;
    const spentAdmissions = new Map(world.configuration.registrationAdmissions.map((admission) => [
      admission.productHandle,
      admission,
    ]));
    const appOperations = world.diWorld.registrationOperations.filter((operation) =>
      operation.container.productHandle === appContainer
    );

    expect(appOperations.map((operation) =>
      spentAdmissions.get(operation.admissionProductHandle ?? '')
    ).map((admission) =>
      admission instanceof RegistryRegistrationAdmission ? admission.registryValue?.localName ?? null : null
    )).toEqual(['OuterRegistry', 'CompilerRegistry', 'StandardConfiguration']);
    const operationMaterializations = runtime.workspace.store.readMaterializations().filter((materialization) =>
      appOperations.some((operation) => materialization.productHandles.includes(operation.productHandle))
    );
    expect(operationMaterializations).toHaveLength(3);
    expect(operationMaterializations.flatMap((materialization) => materialization.openSeamHandles).length)
      .toBe(0);
    expect(world.compilerWorlds).toHaveLength(1);
    expect(world.compilerWorlds[0]?.attributePatterns.length).toBeGreaterThan(0);
    expect(world.compilerWorlds[0]?.bindingCommands.length).toBeGreaterThan(0);
    expect(world.compilerWorlds[0]?.runtimeRenderers.length).toBeGreaterThan(0);
  });

  test('spends only registry calls reached on the concrete execution path', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-path-honesty'),
      storeKey: 'test:di-provider-model:registry-path-honesty',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const admissions = new Map(world.configuration.registrationAdmissions.map((admission) => [
      admission.productHandle,
      admission,
    ]));
    const operationNames = world.diWorld.registrationOperations.map((operation) => {
      const admission = admissions.get(operation.admissionProductHandle ?? '') ?? null;
      return admission instanceof RegistryRegistrationAdmission
        ? admission.registryValue?.localName ?? null
        : null;
    });

    expect(operationNames).toEqual([
      'OuterRegistry',
      'MarkerRegistry',
      'MarkerRegistry',
      'StandardConfiguration',
    ]);
    expect(operationNames).not.toContain('FalseRegistry');
    expect(operationNames).not.toContain('ReturnedRegistry');
    expect(operationNames).not.toContain('NestedRegistry');
    const operationMaterializations = runtime.workspace.store.readMaterializations().filter((materialization) =>
      world.diWorld.registrationOperations.some((operation) =>
        materialization.productHandles.includes(operation.productHandle)
      )
    );
    expect(operationMaterializations.flatMap((materialization) => materialization.openSeamHandles)).toHaveLength(0);
    expect(world.compilerWorlds).toHaveLength(1);
  });

  test('stops a recursive registry cascade before later compiler effects', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-recursive-compiler-block'),
      storeKey: 'test:di-provider-model:recursive-registry',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const admissions = new Map(world.configuration.registrationAdmissions.map((admission) => [
      admission.productHandle,
      admission,
    ]));
    const operationNames = world.diWorld.registrationOperations.map((operation) => {
      const admission = admissions.get(operation.admissionProductHandle ?? '') ?? null;
      return admission instanceof RegistryRegistrationAdmission
        ? admission.registryValue?.localName ?? null
        : null;
    });

    expect(operationNames).toEqual(['RecursiveRegistry', 'RecursiveRegistry']);
    expect(world.diWorld.issues.filter((issue) => issue.issueKind === DiIssueKind.UnableAutoRegister)).toHaveLength(1);
    expect(world.compilerWorlds).toHaveLength(0);
  });

  test('does not spend registry effects after an unresolved control-flow boundary', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-open-branch'),
      storeKey: 'test:di-provider-model:registry-open-branch',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;

    expect(world.diWorld.registrationOperations).toHaveLength(1);
    expect(world.diWorld.openSeams.length).toBeGreaterThan(0);
    expect(world.compilerWorlds).toHaveLength(0);
  });

  test('constructs a compiler world from a direct canonical compiler provider', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-custom-template-compiler'),
      storeKey: 'test:di-provider-model:custom-template-compiler',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const compilerSlot = world.diWorld.resolverSlots.find((slot) =>
      slot.resolver?._key.localName === 'ITemplateCompiler'
    ) ?? null;

    expect(compilerSlot).not.toBeNull();
    expect(world.compilerWorlds).toHaveLength(1);
    expect(world.compilerWorlds[0]?.attributePatterns).toHaveLength(0);
    expect(world.compilerWorlds[0]?.bindingCommands).toHaveLength(0);
    expect(world.compilerWorlds[0]?.runtimeRenderers).toHaveLength(0);
  });

  test('conserves composition-owned containers and contextual providers through public projections', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'au-compose-dynamic-composition'),
      storeKey: 'test:di-provider-model:composition-container-projection',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const resources = app.emission.templates.resources;
    const expectedByDefinition = new Map(resources.map((resource) => [
      resource.compilation.definition.name,
      {
        controllers: resource.runtimeAnalysis.readRuntimeControllers().length,
        childContainers: resource.runtimeAnalysis.readRuntimeChildContainers().length,
        contextSlots: resource.runtimeAnalysis.readRuntimeChildContextResolverSlots().length,
      },
    ]));
    const expectedControllers = [...expectedByDefinition.values()].reduce(
      (total, counts) => total + counts.controllers,
      0,
    ) + app.emission.routeComponentAgents.readControllers().length;
    const expectedChildContainers = [...expectedByDefinition.values()].reduce(
      (total, counts) => total + counts.childContainers,
      0,
    );
    const expectedContextSlots = [...expectedByDefinition.values()].reduce(
      (total, counts) => total + counts.contextSlots,
      0,
    );

    expect(app.summary().value).toMatchObject({
      runtimeControllers: expectedControllers,
      runtimeChildContainers: expectedChildContainers,
      runtimeChildContextResolverSlots: expectedContextSlots,
    });
    const templateRows = app.ask({
      kind: 'template-compilations',
      page: { size: 100 },
    }).value.rows;
    expect(templateRows).toHaveLength(expectedByDefinition.size);
    for (const row of templateRows) {
      const expected = expectedByDefinition.get(row.definitionName);
      expect(expected).toBeDefined();
      expect(row).toMatchObject({
        runtimeControllers: expected?.controllers,
        runtimeChildContainers: expected?.childContainers,
        runtimeChildContextResolverSlots: expected?.contextSlots,
      });
    }

    const compositionRows = app.ask({
      kind: 'runtime-compositions',
      page: { size: 100 },
    }).value.rows;
    const composedContainers = resources.reduce(
      (total, resource) => total + resource.runtimeAnalysis.runtimeComposition.childContainers.length,
      0,
    );
    const composedContextSlots = resources.reduce(
      (total, resource) => total + resource.runtimeAnalysis.runtimeComposition.childContainers.reduce(
        (resourceTotal, child) => resourceTotal + child.contextResolverSlots.length,
        0,
      ),
      0,
    );
    expect(compositionRows.reduce((total, row) => total + row.composedChildContainerCount, 0))
      .toBe(composedContainers);
    expect(compositionRows.reduce((total, row) => total + row.composedChildContextResolverSlotCount, 0))
      .toBe(composedContextSlots);
  });

  test('keeps renderer contextual providers under the enclosing container computation', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'recursive-custom-element-surfaces'),
      storeKey: 'test:di-provider-model:renderer-context-providers',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const renderings = app.emission.templates.resources.map((resource) =>
      resource.runtimeAnalysis.runtimeRendering
    );
    const childContainers = renderings.flatMap((rendering) => rendering.childContainers);
    const contextSlots = renderings.flatMap((rendering) => rendering.childContextResolverSlots);
    const containersByProduct = new Map(childContainers.map((container) => [container.productHandle, container]));

    expect(contextSlots.length).toBeGreaterThan(0);
    expect(contextSlots.every((slot) => {
      const container = containersByProduct.get(slot.container.productHandle) ?? null;
      return container?.readResolverSlots(slot.keyIdentityHandle).includes(slot) === true;
    })).toBe(true);
    expect(contextSlots.every((slot) => runtime.workspace.store.read(slot.productHandle) == null)).toBe(true);
  });
});

interface ProviderActivationFixture {
  readonly runtime: SemanticRuntime;
  readonly activation: DiProviderActivationView;
  readonly container: Container;
  readonly sites: ReadonlyMap<string, DiContainerApiCallSite>;
  readonly evaluation: StaticProjectEvaluationResult;
}

async function openProviderActivationFixture(
  testKey: string,
): Promise<ProviderActivationFixture> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureFixtures, 'di-provider-activation'),
    storeKey: `test:di-provider-model:${testKey}`,
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const configuration = app.emission.appWorld.configuration;
  const container = activationContainerForFixture(app.emission.evaluation, configuration);
  if (container == null) {
    throw new Error('Expected the DI provider activation fixture container to be modeled.');
  }
  const sites = new Map<string, DiContainerApiCallSite>();
  for (const site of readDiContainerApiCallSites(app.project, app.emission.typeSystem)) {
    const name = enclosingVariableName(site.sourceNode);
    if (name != null) {
      sites.set(name, site);
    }
  }
  return {
    runtime,
    activation: new DiProviderActivationView(
      runtime.workspace.store,
      app.emission.evaluation,
      app.emission.typeSystem,
      configuration,
      app.emission.appWorld.diWorld,
    ),
    container,
    sites,
    evaluation: app.emission.evaluation,
  };
}

function activationContainerForFixture(
  evaluation: StaticProjectEvaluationResult,
  configuration: ConfigurationKernelEmission,
): Container | null {
  const source = evaluation.readEvaluatedSources().find((candidate) =>
    candidate.admission.path.replace(/\\/g, '/').endsWith('src/main.ts')
  ) ?? null;
  const value = source?.evaluation.environment.readValue('container') ?? null;
  const containerEvaluation = value == null ? null : aureliaContainerEvaluationForValue(value);
  return containerEvaluation == null
    ? null
    : configuration.evaluationBindings.containersByEvaluation.get(containerEvaluation) ?? null;
}

function activateNamedSite(
  fixture: ProviderActivationFixture,
  session: DiProviderActivationSession,
  name: string,
  requestor = fixture.container,
): DiProviderActivationResult {
  const site = fixture.sites.get(name);
  if (site?.keyExpression == null) {
    throw new Error(`Expected a modeled container.get key at ${name}.`);
  }
  const source = fixture.evaluation.sources.find((candidate) =>
    isEvaluatedProjectSource(candidate) && candidate.sourceFile === site.sourceNode.getSourceFile()
  );
  if (source == null || !isEvaluatedProjectSource(source)) {
    throw new Error(`Expected an evaluated source for ${name}.`);
  }
  const call = source.evaluation.executedCalls.find((candidate) => candidate.expression === site.sourceNode);
  if (call == null) {
    throw new Error(`Expected an executed-call witness for ${name}.`);
  }
  return session.activateExecutedEntryExpression(
    requestor,
    site.keyExpression,
    call,
    site.sourceNode,
  );
}

function activateContainerSite(
  fixture: ProviderActivationFixture,
  name: string,
): DiProviderActivationResult {
  const site = fixture.sites.get(name);
  if (site == null) {
    throw new Error(`Expected a modeled container API call at ${name}.`);
  }
  const result = fixture.activation.activateContainerGet(site);
  if (result == null) {
    throw new Error(`Expected provider activation at ${name}.`);
  }
  return result;
}

function enclosingVariableName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node;
  while (current != null) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    current = current.parent;
  }
  return null;
}

function marker(value: EvaluationValue | null): string | null {
  const candidate = instanceProperty(value, 'marker');
  return candidate?.kind === EvaluationValueKind.String ? candidate.value : null;
}

function instanceProperty(value: EvaluationValue | null, name: string): EvaluationValue | null {
  if (value?.kind !== EvaluationValueKind.Object && value?.kind !== EvaluationValueKind.Instance) {
    return null;
  }
  return value.properties.get(name)?.value ?? null;
}

function arrayValues(value: EvaluationValue | null): readonly EvaluationValue[] {
  return value?.kind === EvaluationValueKind.Array
    ? value.elements.map((element) => element.value)
    : [];
}

function arrayMarkers(value: EvaluationValue | null): readonly (string | null)[] {
  return arrayValues(value).map(marker);
}
