import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  type SemanticApp,
  type SemanticRuntime,
} from '../src/api/runtime.js';
import { AppTaskSlot } from '../src/configuration/app-task.js';
import {
  aureliaContainerEvaluationForValue,
  aureliaFacadeEvaluationForValue,
} from '../src/configuration/aurelia-evaluation-runtime.js';
import type { ConfigurationKernelEmission } from '../src/configuration/configuration-kernel-emitter.js';
import {
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
} from '../src/di/container-materializer.js';
import { frameworkRegistrationKindForOperation } from '../src/di/container-registration.js';
import type { Container } from '../src/di/container.js';
import type { ContainerResolverSlot } from '../src/di/container-slot.js';
import {
  readDiContainerApiCallSites,
  type DiContainerApiCallSite,
} from '../src/di/container-api-recognition.js';
import { readDiResolveCallSites } from '../src/di/resolve-call-recognition.js';
import {
  ContainerResolutionFailureKind,
  frameworkErrorCodeForContainerResolutionFailureKind,
} from '../src/di/container-lookup.js';
import {
  DiClassDependencyAuthority,
  DiClassDependencyNamedState,
  DiClassDependencyPositionState,
  DiClassDependencyProjectView,
  DiClassDependencySlotState,
  type DiClassDependencyPlan,
} from '../src/di/class-dependency-plan.js';
import { ContainerDefaultResolverPolicy } from '../src/di/container-configuration.js';
import {
  DiProviderActivationState,
  DiProviderActivationView,
  noDiProviderActivationValues,
  type DiProviderActivationResult,
  type DiProviderActivationSession,
} from '../src/di/provider-activation.js';
import {
  Resolver,
  ResolverResolutionKind,
} from '../src/di/resolver.js';
import { InstanceProvider } from '../src/di/instance-provider.js';
import { ParameterizedRegistry, RegistryValue } from '../src/di/registry.js';
import type { DiWorldConstructionEmission } from '../src/di/world-construction.js';
import {
  DiIssueKind,
  DiIssueSubjectKind,
  DiRegistryApplicationFailureKind,
} from '../src/di/di-issue.js';
import {
  isEvaluatedProjectSource,
  StaticProjectEvaluationResult,
  StaticProjectEvaluationSourceResult,
} from '../src/evaluation/project-evaluation.js';
import {
  EvaluationObjectValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';
import type { IdentityHandle, ProductHandle } from '../src/kernel/handles.js';
import { evaluationValueOwnOpenSeams } from '../src/evaluation/value-pressure.js';
import {
  SourceFileAddress,
  SourceSpanAddress,
} from '../src/kernel/address.js';
import {
  DiKeyIdentityKind,
  StringDiKeyIdentity,
  TypeScriptDeclarationIdentity,
} from '../src/kernel/identity.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import {
  FrameworkRegistrationAdmission,
  OpenRegistrationAdmission,
  RegistrationAdmissionKind,
  ResourceRegistrationAdmission,
  RegistryRegistrationAdmission,
  ResolverRegistrationAdmission,
  RegistrationStrategy,
} from '../src/registration/registration-admission.js';
import { frameworkRegistrationKindForRegistrationEvidence } from '../src/registration/evaluated-registration-classifier.js';
import {
  EvaluatedRegistrationCarrier,
  RegistrationCarrierKind,
} from '../src/registration/registration-observation.js';
import { FrameworkRegistrationKind } from '../src/registration/registration-reference.js';
import { ResourceIssueKind } from '../src/resources/resource-issue.js';
import {
  TypeSystemProjectBuilder,
  type TypeSystemProject,
} from '../src/type-system/project.js';

const pressureFixtures = fileURLToPath(new URL('../fixtures/pressure', import.meta.url));

describe('DI provider model', () => {
  test('lets exact evaluator evidence reject stale framework source classification', () => {
    const sourceFile = ts.createSourceFile(
      'framework-registration-authority.ts',
      '({ register() {} })',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const expression = (sourceFile.statements[0] as ts.ExpressionStatement).expression;
    const admission = new FrameworkRegistrationAdmission(
      'framework-registration-admission' as ProductHandle,
      'framework-registration-identity' as IdentityHandle,
      RegistrationCarrierKind.AureliaRegisterCall,
      RegistrationAdmissionKind.AureliaRegisterArgument,
      FrameworkRegistrationKind.StandardConfiguration,
      null,
      null,
    );
    const exactNonFrameworkValue = new EvaluatedRegistrationCarrier(
      expression,
      new EvaluationObjectValue(new Map(), false, expression),
    );

    expect(frameworkRegistrationKindForRegistrationEvidence(admission, null))
      .toBe(FrameworkRegistrationKind.StandardConfiguration);
    expect(frameworkRegistrationKindForRegistrationEvidence(admission, exactNonFrameworkValue))
      .toBeNull();
  });

  test('keeps checker-recognized DI sites Program-owned and bridges exact evaluator carriers', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-provider-activation'),
      storeKey: 'test:di-provider-model:checker-evaluator-carrier-bridge',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const evaluatedSource = app.emission.evaluation.readEvaluatedSources().find((candidate) =>
      isEvaluatedProjectSource(candidate)
      && candidate.admission.path.replace(/\\/g, '/').endsWith('src/main.ts')
    );
    if (evaluatedSource == null || !isEvaluatedProjectSource(evaluatedSource)) {
      throw new Error('Expected the provider fixture main source to be evaluated.');
    }
    const programSource = app.emission.typeSystem.readProgramSourceFileByProjectPath('src/main.ts');
    if (programSource == null) {
      throw new Error('Expected the provider fixture main source in the Program.');
    }
    expect(programSource).not.toBe(evaluatedSource.sourceFile);

    const containerSite = readDiContainerApiCallSites(app.project, app.emission.typeSystem).find((site) =>
      enclosingVariableName(site.sourceNode) === 'exactInstanceRead'
    );
    if (containerSite == null) {
      throw new Error('Expected the exact-instance container call site.');
    }
    const containerAccess = containerSite.sourceNode.expression;
    expect(ts.isPropertyAccessExpression(containerAccess)).toBe(true);
    expect(containerSite.sourceNode.getSourceFile()).toBe(programSource);
    expect(containerSite.receiverExpression)
      .toBe(ts.isPropertyAccessExpression(containerAccess) ? containerAccess.expression : null);
    expect(containerSite.keyExpression).toBe(containerSite.sourceNode.arguments[0]);
    const evaluatedContainerCall = app.emission.typeSystem.readEvaluatedNode(containerSite.sourceNode);
    if (evaluatedContainerCall == null) {
      throw new Error('Expected an evaluator counterpart for the container call.');
    }
    const evaluatedContainerAccess = evaluatedContainerCall.expression;
    expect(ts.isPropertyAccessExpression(evaluatedContainerAccess)).toBe(true);
    expect(evaluatedContainerCall.getSourceFile()).toBe(evaluatedSource.sourceFile);
    expect(app.emission.typeSystem.readEvaluatedNode(containerSite.receiverExpression))
      .toBe(ts.isPropertyAccessExpression(evaluatedContainerAccess) ? evaluatedContainerAccess.expression : null);
    expect(app.emission.typeSystem.readEvaluatedNode(containerSite.keyExpression!))
      .toBe(evaluatedContainerCall.arguments[0]);
    expect(evaluatedSource.evaluation.invocations.some((invocation) =>
      invocation.node === evaluatedContainerCall
    )).toBe(true);
    expect(app.emission.typeSystem.readProgramNode(evaluatedContainerCall)).toBe(containerSite.sourceNode);

    const resolveSite = readDiResolveCallSites(app.project, app.emission.typeSystem).find((site) =>
      site.enclosingClassName === 'SingletonConsumer'
      && site.keyExpressionText === "'scoped-alias'"
    );
    if (resolveSite == null) {
      throw new Error('Expected the SingletonConsumer resolve call site.');
    }
    expect(resolveSite.sourceNode.getSourceFile()).toBe(programSource);
    expect(resolveSite.keyExpression).toBe(resolveSite.sourceNode.arguments[0]);
    const evaluatedResolveCall = app.emission.typeSystem.readEvaluatedNode(resolveSite.sourceNode);
    if (evaluatedResolveCall == null) {
      throw new Error('Expected an evaluator counterpart for the resolve call.');
    }
    expect(evaluatedResolveCall.getSourceFile()).toBe(evaluatedSource.sourceFile);
    expect(app.emission.typeSystem.readEvaluatedNode(resolveSite.keyExpression!))
      .toBe(evaluatedResolveCall.arguments[0]);
    expect(app.emission.typeSystem.readProgramNode(evaluatedResolveCall)).toBe(resolveSite.sourceNode);
  }, 30_000);

  test('retains checker-recognized DI facts when a parsed Program root has no evaluation', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-provider-activation'),
      storeKey: 'test:di-provider-model:program-only-di-sites',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineEvaluation = app.emission.evaluation;
    const mainSource = baselineEvaluation.sources.find((source) =>
      source.admission.path.replace(/\\/g, '/').endsWith('src/main.ts')
    );
    if (mainSource?.sourceFile == null || mainSource.evaluation == null) {
      throw new Error('Expected an evaluated provider fixture main source.');
    }
    const programOnlyMain = new StaticProjectEvaluationSourceResult(
      mainSource.admission,
      mainSource.moduleKey,
      mainSource.sourceFile,
      null,
      mainSource.unresolvedModules,
      mainSource.origins,
      mainSource.packageOrigin,
    );
    const programOnlyEvaluation = new StaticProjectEvaluationResult(
      app.project,
      baselineEvaluation.sources.map((source) => source === mainSource ? programOnlyMain : source),
      baselineEvaluation.evaluationOrderModuleKeys,
      baselineEvaluation.profile,
      baselineEvaluation.graphOpenValues,
    );
    const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport)
      .build(app.project, programOnlyEvaluation);
    const programSource = typeSystem.readProgramSourceFileByProjectPath('src/main.ts');
    if (programSource == null) {
      throw new Error('Expected the parsed Program-only main source.');
    }
    expect(typeSystem.readEvaluatedNode(programSource)).toBeNull();

    const baselineContainerSites = readDiContainerApiCallSites(app.project, app.emission.typeSystem);
    const programOnlyContainerSites = readDiContainerApiCallSites(app.project, typeSystem);
    expect(diContainerSiteRecognitionKeys(programOnlyContainerSites))
      .toEqual(diContainerSiteRecognitionKeys(baselineContainerSites));
    const exactInstanceRead = programOnlyContainerSites.find((site) =>
      enclosingVariableName(site.sourceNode) === 'exactInstanceRead'
    );
    expect(exactInstanceRead?.sourceNode.getSourceFile()).toBe(programSource);
    expect(exactInstanceRead == null ? null : typeSystem.readEvaluatedNode(exactInstanceRead.sourceNode)).toBeNull();

    const baselineResolveSites = readDiResolveCallSites(app.project, app.emission.typeSystem);
    const programOnlyResolveSites = readDiResolveCallSites(app.project, typeSystem);
    expect(diResolveSiteRecognitionKeys(programOnlyResolveSites))
      .toEqual(diResolveSiteRecognitionKeys(baselineResolveSites));
    const scopedAliasResolve = programOnlyResolveSites.find((site) =>
      site.enclosingClassName === 'SingletonConsumer'
      && site.keyExpressionText === "'scoped-alias'"
    );
    expect(scopedAliasResolve?.sourceNode.getSourceFile()).toBe(programSource);
    expect(scopedAliasResolve == null ? null : typeSystem.readEvaluatedNode(scopedAliasResolve.sourceNode)).toBeNull();
  }, 30_000);

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
    const interfaceSlot = world.resolverSlots.find((slot) => resolverKeyName(slot) === 'IFoo') ?? null;
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
    const configuration = app.emission.configuration.readConfiguration();
    const world = app.emission.appWorld.diWorld;
    const callbackSlot = world.resolverSlots.find((slot) => resolverKeyName(slot) === 'callback-service');
    const cachedCallbackSlot = world.resolverSlots.find((slot) => resolverKeyName(slot) === 'cached-callback-service');
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

  test('matches Aurelia class dependency timing, precedence, sparse slots, and metadata inheritance', async () => {
    const fixture = await openProviderActivationFixture(
      'class-dependency-topology',
      'di-class-dependency-topology',
    );
    const session = fixture.activation.createSession();
    const activate = (name: string): DiProviderActivationResult =>
      activateNamedSite(fixture, session, name);
    const dependencyMarker = (name: string): string | null =>
      marker(instanceProperty(activate(name).value, 'dependency'));

    expect(dependencyMarker('definitionTimeRead')).toBe('first-dependency');

    const sparseStatic = activate('sparseStaticRead');
    expect(sparseStatic.state).toBe(DiProviderActivationState.Value);
    expect(instanceProperty(sparseStatic.value, 'first')?.kind).toBe(EvaluationValueKind.Undefined);
    expect(marker(instanceProperty(sparseStatic.value, 'second'))).toBe('second-dependency');
    expect(activate('explicitUndefinedStaticRead').state).toBe(DiProviderActivationState.Failed);
    expect(activate('invalidStaticRead').state).toBe(DiProviderActivationState.Failed);

    expect(activate('inheritedGetterRead').state).toBe(DiProviderActivationState.Value);
    const staticCacheBaseFirstBase = activate('staticCacheBaseFirstBaseRead');
    const staticCacheBaseFirstDerived = activate('staticCacheBaseFirstDerivedRead');
    expect(staticCacheBaseFirstBase).toMatchObject({ state: DiProviderActivationState.Value });
    expect(staticCacheBaseFirstDerived).toMatchObject({ state: DiProviderActivationState.Value });
    expect(marker(instanceProperty(staticCacheBaseFirstBase.value, 'dependency'))).toBe('first-dependency');
    expect(marker(instanceProperty(staticCacheBaseFirstDerived.value, 'ownDependency'))).toBe('second-dependency');
    expect(marker(instanceProperty(activate('staticCacheDerivedFirstDerivedRead').value, 'ownDependency')))
      .toBe('second-dependency');
    expect(dependencyMarker('staticCacheDerivedFirstBaseRead')).toBe('first-dependency');
    expect(dependencyMarker('decoratorCacheBaseFirstBaseRead')).toBe('first-dependency');
    expect(marker(instanceProperty(activate('decoratorCacheBaseFirstDerivedRead').value, 'ownDependency')))
      .toBe('second-dependency');
    expect(marker(instanceProperty(activate('decoratorCacheDerivedFirstDerivedRead').value, 'ownDependency')))
      .toBe('second-dependency');
    expect(dependencyMarker('decoratorCacheDerivedFirstBaseRead')).toBe('first-dependency');

    const dependencyPlans = new DiClassDependencyProjectView(fixture.evaluation, fixture.typeSystem);
    for (const [className, authority, dependencyName] of [
      ['StaticCacheBaseFirstBase', DiClassDependencyAuthority.StaticInject, 'FirstDependency'],
      ['StaticCacheBaseFirstDerived', DiClassDependencyAuthority.StaticInject, 'SecondDependency'],
      ['StaticCacheDerivedFirstBase', DiClassDependencyAuthority.StaticInject, 'FirstDependency'],
      ['StaticCacheDerivedFirstDerived', DiClassDependencyAuthority.StaticInject, 'SecondDependency'],
      ['DecoratorCacheBaseFirstBase', DiClassDependencyAuthority.AureliaAnnotation, 'FirstDependency'],
      ['DecoratorCacheBaseFirstDerived', DiClassDependencyAuthority.AureliaAnnotation, 'SecondDependency'],
      ['DecoratorCacheDerivedFirstBase', DiClassDependencyAuthority.AureliaAnnotation, 'FirstDependency'],
      ['DecoratorCacheDerivedFirstDerived', DiClassDependencyAuthority.AureliaAnnotation, 'SecondDependency'],
    ] as const) {
      assertExactLocalClassDependencyPlan(
        readClassDependencyPlan(fixture, dependencyPlans, className),
        authority,
        dependencyName,
      );
    }

    expect(dependencyMarker('cachedGetterReadOne')).toBe('first-dependency');
    expect(dependencyMarker('cachedGetterReadTwo')).toBe('first-dependency');
    expect(dependencyMarker('staticPrecedenceRead')).toBe('first-dependency');
    expect(dependencyMarker('undefinedStaticRead')).toBe('first-dependency');
    expect(dependencyMarker('stackedDecoratorRead')).toBe('first-dependency');

    const sparseDecorator = activate('sparseDecoratorRead');
    expect(sparseDecorator.state).toBe(DiProviderActivationState.Value);
    expect(instanceProperty(sparseDecorator.value, 'first')?.kind).toBe(EvaluationValueKind.Undefined);
    expect(marker(instanceProperty(sparseDecorator.value, 'second'))).toBe('second-dependency');

    expect(activate('fieldMetadataRead').state).toBe(DiProviderActivationState.Value);
    expect(dependencyMarker('reexportedAliasRead')).toBe('first-dependency');
    expect(dependencyMarker('namespaceAliasRead')).toBe('second-dependency');
    expect(instanceProperty(activate('reexportedResolverRead').value, 'dependency')?.kind)
      .toBe(EvaluationValueKind.Undefined);
    expect(instanceProperty(activate('bareResolverRead').value, 'dependency')?.kind)
      .toBe(EvaluationValueKind.Undefined);
    expect(dependencyMarker('nestedResolverRead')).toBe('first-dependency');

    const leftToRightFailure = activate('leftToRightFailureRead');
    expect(leftToRightFailure.state).toBe(DiProviderActivationState.Failed);
    expect(leftToRightFailure.failureKind).toBe(ContainerResolutionFailureKind.UnableJitNonConstructor);
    expect(leftToRightFailure.reason).toContain("key kind 'string'");
    expect(leftToRightFailure.cycle).toBeNull();
  });

  test('keeps legacy design:paramtypes honest without losing own empty metadata', async () => {
    const fixture = await openProviderActivationFixture(
      'design-paramtypes-boundary',
      'di-design-paramtypes-boundary',
    );
    const session = fixture.activation.createSession();
    const metadata = activateNamedSite(fixture, session, 'metadataRead');
    const emptyMetadata = activateNamedSite(fixture, session, 'emptyMetadataRead');

    expect(metadata.state).toBe(DiProviderActivationState.Open);
    expect(metadata.reason).toContain('design:paramtypes');
    expect(emptyMetadata.state).toBe(DiProviderActivationState.Value);
    expect(emptyMetadata.reason).toBeNull();
  });

  test('spends interface defaults during JIT and fresh activation without declaration-name joins', async () => {
    const fixture = await openProviderActivationFixture('interface-default-activation');
    const session = fixture.activation.createSession();
    const singletonOne = activateNamedSite(fixture, session, 'interfaceDefaultSingletonReadOne');
    const singletonTwo = activateNamedSite(fixture, session, 'interfaceDefaultSingletonReadTwo');
    const transientOne = activateNamedSite(fixture, session, 'interfaceDefaultTransientReadOne');
    const transientTwo = activateNamedSite(fixture, session, 'interfaceDefaultTransientReadTwo');
    const fresh = activateNamedSite(fixture, session, 'interfaceDefaultFreshRead');
    const directMissing = activateNamedSite(fixture, session, 'interfaceMissingRead');
    const missing = activateNamedSite(fixture, session, 'interfaceMissingFreshRead');
    const scopedMissing = activateNamedSite(fixture, session, 'interfaceMissingScopedRead');
    const instance = activateNamedSite(fixture, session, 'interfaceInstanceFreshRead');

    expect(marker(singletonOne.value)).toBe('default-singleton');
    expect(singletonTwo.value).toBe(singletonOne.value);
    expect(marker(transientOne.value)).toBe('default-transient');
    expect(marker(transientTwo.value)).toBe('default-transient');
    expect(transientTwo.value).not.toBe(transientOne.value);
    expect(marker(fresh.value)).toBe('default-singleton');
    expect(fresh.value).not.toBe(singletonOne.value);
    expect(directMissing).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.NoJitInterface,
    });
    expect(missing).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
    });
    expect(scopedMissing).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
    });
    expect(instance).toMatchObject({
      state: DiProviderActivationState.Failed,
      failureKind: ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
    });
    expect(frameworkErrorCodeForContainerResolutionFailureKind(directMissing.failureKind)).toBe('AUR0012');
    expect(frameworkErrorCodeForContainerResolutionFailureKind(missing.failureKind)).toBe('AUR0017');
    expect(frameworkErrorCodeForContainerResolutionFailureKind(scopedMissing.failureKind)).toBe('AUR0017');

    const issueRows = fixture.app.diIssues({ size: 100 }).value.rows;
    expect(issueRows.find((row) => row.containerApiCall?.keyExpressionText === 'IMissingDefault'))
      .toMatchObject({
        diagnosticAuthority: 'framework-error-code',
        frameworkErrorCode: 'AUR0012',
        containerApiCall: {
          methodKind: 'get',
          keyWrapperKind: null,
          wrappedKeyName: null,
        },
      });
    expect(issueRows.find((row) => row.containerApiCall?.keyWrapperKind === 'newInstanceOf'
      && row.containerApiCall.wrappedKeyName === 'IMissingDefault'))
      .toMatchObject({
        diagnosticAuthority: 'framework-error-code',
        frameworkErrorCode: 'AUR0017',
      });
    expect(issueRows.find((row) => row.containerApiCall?.keyWrapperKind === 'newInstanceForScope'
      && row.containerApiCall.wrappedKeyName === 'IMissingDefault'))
      .toMatchObject({
        diagnosticAuthority: 'framework-error-code',
        frameworkErrorCode: 'AUR0017',
      });
  });

  test('models the complete Aurelia resolver family and requestor-local scope', async () => {
    const fixture = await openProviderActivationFixture('resolver-family');
    const session = fixture.activation.createSession();
    const child = new ContainerChildMaterializer(fixture.runtime.workspace.store, fixture.runtime.workspace.store)
      .materializeChild(new ContainerChildMaterializationRequest({
        localKey: 'di-provider-activation-test-child',
        parent: fixture.container,
        sourceAddressHandle: null,
        localName: 'activation-test-child',
      }))
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
    const multiSpread = arrayMarkers(activateNamedSite(fixture, session, 'allMultiSpreadRead', child).value);
    const multiResources = arrayMarkers(activateNamedSite(fixture, session, 'allMultiResourcesRead', child).value);
    expect(multi).toEqual(['multi-first', 'multi-second']);
    expect(multiAncestors).toEqual(['multi-first', 'multi-second']);
    expect(multiSpread).toEqual(['multi-first', 'multi-second']);
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

    const identityConsumer = activateNamedSite(fixture, session, 'resolverIdentityConsumerRead', child);
    expect(identityConsumer.state).toBe(DiProviderActivationState.Value);
    expect(instanceProperty(identityConsumer.value, 'missing')?.kind).toBe(EvaluationValueKind.Undefined);
    expect(marker(instanceProperty(identityConsumer.value, 'last'))).toBe('multi-second');
    expect(arrayMarkers(instanceProperty(identityConsumer.value, 'pair'))).toEqual([
      'root-only',
      'exact-instance',
    ]);
    expect(arrayValues(instanceProperty(identityConsumer.value, 'empty'))).toEqual([]);
  });

  test('respects authored lookup order instead of consulting the completed container retroactively', async () => {
    const fixture = await openProviderActivationFixture('lookup-order');
    const session = fixture.activation.createSession();
    const before = activateNamedSite(fixture, session, 'beforeRegistrationRead');
    const after = activateNamedSite(fixture, session, 'afterRegistrationRead');

    expect(before.state).toBe(DiProviderActivationState.Failed);
    expect(marker(after.value)).toBe('late-instance');
  });

  test('replays cached singleton pressure without flattening it onto its consumer', async () => {
    const fixture = await openProviderActivationFixture('nested-singleton-pressure');
    const session = fixture.activation.createSession();
    const consumer = activateNamedSite(fixture, session, 'openSingletonConsumerRead');
    const singleton = activateNamedSite(fixture, session, 'openSingletonReadAfterConsumer');

    expect(consumer.state).toBe(DiProviderActivationState.Value);
    expect(singleton.state).toBe(DiProviderActivationState.Value);
    const service = instanceProperty(consumer.value, 'service');
    expect(service).toBe(singleton.value);
    expect(consumer.openSeams).toHaveLength(0);
    expect(singleton.openSeams).toHaveLength(1);
    expect(evaluationValueOwnOpenSeams(service!).map(activationSeamKey))
      .toEqual(singleton.openSeams.map(activationSeamKey));

    const secondSessionSingleton = activateNamedSite(
      fixture,
      fixture.activation.createSession(),
      'openSingletonReadAfterConsumer',
    );
    expect(secondSessionSingleton.openSeams).toHaveLength(1);
    expect(secondSessionSingleton.value).not.toBe(singleton.value);
  });

  test('retains partial all values and pressure-bearing wrapper inputs', async () => {
    const fixture = await openProviderActivationFixture('partial-aggregate-pressure');
    const session = fixture.activation.createSession();
    const partial = activateNamedSite(fixture, session, 'partialMultiRead');

    expect(partial.state).toBe(DiProviderActivationState.Multiple);
    expect(arrayMarkers(partial.value)).toEqual(['partial-multi']);
    expect(partial.value?.kind).toBe(EvaluationValueKind.Array);
    if (partial.value?.kind !== EvaluationValueKind.Array) {
      throw new Error('Expected all(...) to retain an evaluator array value.');
    }
    expect(partial.value.shape.exactLength).toBeNull();
    expect(partial.value.shape.hasExactElements).toBe(false);
    expect(partial.value.shape.hasExactOrder).toBe(true);
    expect(partial.reason).toContain('runtime callback boundary');

    const directKey = activateNamedSite(fixture, session, 'pressuredKeyRead');
    const containerKey = activateContainerSite(fixture, 'pressuredKeyRead');
    const ancestors = activateNamedSite(fixture, session, 'pressuredAncestorRead');
    const receiver = activateContainerSite(fixture, 'pressuredReceiverRead');
    expect(marker(directKey.value)).toBe('exact-instance');
    expect(marker(containerKey.value)).toBe('exact-instance');
    expect(arrayMarkers(ancestors.value)).toEqual(['multi-first', 'multi-second']);
    expect(marker(receiver.value)).toBe('exact-instance');
    expect(directKey.openSeams).toHaveLength(1);
    expect(containerKey.openSeams.map(activationSeamKey)).toEqual(directKey.openSeams.map(activationSeamKey));
    expect(ancestors.openSeams).toHaveLength(1);
    expect(receiver.openSeams).toHaveLength(1);
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
    expect(fixture.diWorld.openSeams.flatMap((seam) => seam.reasonKinds))
      .not.toContain(OpenSeamReasonKind.DiRegistrationContainerOpen);
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
    const appOperations = world.diWorld.registrationOperations.filter((operation) =>
      operation.container.productHandle === appContainer
    );

    expect(appOperations.map((operation) =>
      operation.admission
    ).map((admission) =>
      admission instanceof RegistryRegistrationAdmission ? admission.registryValue?.localName ?? null : null
    )).toEqual(['OuterRegistry', 'CompilerRegistry', 'StandardConfiguration']);
    const operationMaterializations = runtime.workspace.store.readMaterializations().filter((materialization) =>
      appOperations.some((operation) => materialization.productHandles.includes(operation.productHandle))
    );
    expect(operationMaterializations).toHaveLength(3);
    const operationOpenSeams = operationMaterializations
      .flatMap((materialization) => materialization.openSeamHandles)
      .map((handle) => runtime.workspace.store.readOpenSeam(handle));
    expect(operationOpenSeams).toHaveLength(1);
    expect(operationOpenSeams[0]?.reasonKinds).toContain(OpenSeamReasonKind.DiRegistryBodyOpen);
    expect(world.compilerWorlds).toHaveLength(1);
    expect(world.compilerWorlds[0]?.attributePatterns.length).toBeGreaterThan(0);
    expect(world.compilerWorlds[0]?.bindingCommands.length).toBeGreaterThan(0);
    expect(world.compilerWorlds[0]?.runtimeRenderers.length).toBeGreaterThan(0);
  });

  test('spends arrays, module maps, and function-valued registry bodies without registering factory namespaces', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registration-carriers'),
      storeKey: 'test:di-provider-model:registration-carriers',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const resolverNames = world.diWorld.resolverSlots.map(resolverKeyName);

    const frameworkKinds = world.diWorld.registrationOperations.flatMap((operation) => {
      const frameworkKind = frameworkRegistrationKindForOperation(operation);
      return frameworkKind == null ? [] : [frameworkKind];
    });

    expect(resolverNames).toEqual(expect.arrayContaining([
      'nested-method',
      'nested-arrow',
      'nested-instance',
      'nested-singleton',
      'module-method',
      'module-arrow',
      'module-instance',
      'ModulePlainClass',
      'SecondModulePlainClass',
      'after-unknown-spread',
    ]));
    expect(resolverNames).not.toContain('before-unknown-spread');
    const moduleClassSlots = world.diWorld.resolverSlots.filter((slot) =>
      resolverKeyName(slot) === 'ModulePlainClass'
      || resolverKeyName(slot) === 'SecondModulePlainClass'
    );
    expect(moduleClassSlots).toHaveLength(2);
    expect(new Set(moduleClassSlots.map((slot) => slot.keyIdentityHandle)).size).toBe(2);
    expect(frameworkKinds).toContain(FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax);
    expect(frameworkKinds).toContain(FrameworkRegistrationKind.LoggerConfiguration);
    expect(frameworkKinds).toContain(FrameworkRegistrationKind.StyleConfiguration);
    expect(frameworkKinds).toContain(FrameworkRegistrationKind.ValidationI18nConfiguration);
    expect(frameworkKinds).not.toContain(FrameworkRegistrationKind.StateDefaultConfiguration);
    expect(frameworkKinds).not.toContain(FrameworkRegistrationKind.AppTask);
    expect(resolverNames).not.toEqual(expect.arrayContaining([
      'init',
      'creating',
      'hydrating',
      'hydrated',
      'activating',
      'activated',
      'deactivating',
      'deactivated',
    ]));
    expect(resolverNames).toEqual(expect.arrayContaining([
      'ILogConfig',
      'IValidationMessageProvider',
      'I18nKeyConfiguration',
    ]));
    expect(world.diWorld.resolverSlots.find((slot) =>
      resolverKeyName(slot) === 'IValidationMessageProvider'
    )?.resolver?._state?.localName).toBe('LocalizedValidationMessageProvider');
    expect(world.diWorld.factorySlots).toHaveLength(1);
    expect(world.diWorld.appTasks).toEqual([
      expect.objectContaining({
        slot: AppTaskSlot.Creating,
        callback: expect.objectContaining({
          localName: 'StyleConfiguration install shared shadow-DOM styles',
        }),
      }),
    ]);
    const registrationOpenSummaries = app.emission.configuration.readObservations().flatMap((observation) =>
      observation.steps.flatMap((step) =>
        step.registrationAdmissions.flatMap((admission) => admission.openSeams.map((seam) => seam.summary))
      )
    );
    expect(registrationOpenSummaries).toEqual(expect.arrayContaining([
      expect.stringContaining('StateDefaultConfiguration is a factory namespace'),
      expect.stringContaining('AppTask is a factory namespace'),
    ]));
    expect(world.diWorld.openSeams.map((seam) => seam.summary)).toEqual(expect.arrayContaining([
      expect.stringContaining('option-selected sink registrations remain open'),
      expect.stringContaining('customization callback may replace provider types'),
    ]));
    expect(world.compilerWorlds).toHaveLength(0);
  });

  test('preserves authored container and facade identity across module and child boundaries', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-authored-app-containers'),
      storeKey: 'test:di-provider-model:authored-app-containers',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const evaluation = app.emission.evaluation;
    const configuration = app.emission.appWorld.configuration;
    const primaryEvaluation = aureliaContainerEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/containers.ts', 'primaryContainer'),
    );
    const secondaryEvaluation = aureliaContainerEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/containers.ts', 'secondaryContainer'),
    );
    const childParentEvaluation = aureliaContainerEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/containers.ts', 'childParentContainer'),
    );
    const childEvaluation = aureliaContainerEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/containers.ts', 'childContainer'),
    );
    const primaryFacadeEvaluation = aureliaFacadeEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/primary-facade.ts', 'primaryFacade'),
    );
    const implicitFacadeEvaluation = aureliaFacadeEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/implicit-facade.ts', 'implicitFacade'),
    );
    const undefinedDefaultFacadeEvaluation = aureliaFacadeEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/undefined-default-app.ts', 'undefinedDefaultFacade'),
    );
    const chainedStaticFacadeEvaluation = aureliaFacadeEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/static-apps.ts', 'chainedStaticFacade'),
    );
    const registrationOnlyFacadeEvaluation = aureliaFacadeEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/static-apps.ts', 'registrationOnlyFacade'),
    );
    const independentStaticFacadeEvaluation = aureliaFacadeEvaluationForValue(
      evaluatedSourceValue(evaluation, 'src/static-apps.ts', 'independentStaticFacade'),
    );

    expect(primaryEvaluation).not.toBeNull();
    expect(secondaryEvaluation).not.toBeNull();
    expect(childParentEvaluation).not.toBeNull();
    expect(childEvaluation).not.toBeNull();
    expect(primaryFacadeEvaluation).not.toBeNull();
    expect(implicitFacadeEvaluation).not.toBeNull();
    expect(undefinedDefaultFacadeEvaluation).not.toBeNull();
    expect(chainedStaticFacadeEvaluation).not.toBeNull();
    expect(registrationOnlyFacadeEvaluation).not.toBeNull();
    expect(independentStaticFacadeEvaluation).not.toBeNull();
    expect(chainedStaticFacadeEvaluation).not.toBe(registrationOnlyFacadeEvaluation);
    expect(registrationOnlyFacadeEvaluation).not.toBe(independentStaticFacadeEvaluation);

    const primaryContainer = configuration.evaluationBindings.containersByEvaluation.get(primaryEvaluation!) ?? null;
    const secondaryContainer = configuration.evaluationBindings.containersByEvaluation.get(secondaryEvaluation!) ?? null;
    const childParentContainer = configuration.evaluationBindings.containersByEvaluation.get(childParentEvaluation!) ?? null;
    const childContainer = configuration.evaluationBindings.containersByEvaluation.get(childEvaluation!) ?? null;
    const primaryAurelia = configuration.evaluationBindings.aureliasByEvaluation.get(primaryFacadeEvaluation!) ?? null;
    const implicitAurelia = configuration.evaluationBindings.aureliasByEvaluation.get(implicitFacadeEvaluation!) ?? null;
    const undefinedDefaultAurelia = configuration.evaluationBindings.aureliasByEvaluation.get(
      undefinedDefaultFacadeEvaluation!,
    ) ?? null;

    expect(configuration.containers).toHaveLength(9);
    expect(configuration.aurelias).toHaveLength(8);
    expect(app.emission.configuration.readObservations().flatMap((observation) =>
      observation.steps.flatMap((step) => step.openSeams)
    ).some((seam) => seam.summary.includes('explicit container whose runtime identity did not close'))).toBe(false);
    expect(primaryContainer).not.toBeNull();
    expect(secondaryContainer).not.toBeNull();
    expect(childParentContainer).not.toBeNull();
    expect(childContainer?.parent).toBe(childParentContainer);
    expect(new Set([
      primaryContainer?.productHandle,
      secondaryContainer?.productHandle,
      childParentContainer?.productHandle,
      childContainer?.productHandle,
    ]).size).toBe(4);
    expect(primaryAurelia?.container.productHandle).toBe(primaryContainer?.productHandle);
    expect(implicitAurelia?.container.productHandle).not.toBe(primaryContainer?.productHandle);
    expect(implicitAurelia?.container.productHandle).not.toBe(secondaryContainer?.productHandle);
    expect(undefinedDefaultAurelia?.container.productHandle).not.toBe(implicitAurelia?.container.productHandle);
    expect(sourcePathForAddress(runtime, primaryAurelia?.sourceAddressHandle ?? null))
      .toBe('src/primary-facade.ts');

    const primaryAppRoots = configuration.appRoots.filter((root) =>
      root.container.productHandle === primaryContainer?.productHandle
    );
    expect(primaryAppRoots).toHaveLength(2);
    expect(primaryAppRoots.map((root) => sourcePathForAddress(runtime, root.sourceAddressHandle)).sort())
      .toEqual(['src/primary-app.ts', 'src/primary-replacement-app.ts']);
    expect(new Set(primaryAppRoots.map((root) => root.productHandle)).size).toBe(2);
    const replacementRoot = primaryAppRoots.find((root) =>
      sourcePathForAddress(runtime, root.sourceAddressHandle) === 'src/primary-replacement-app.ts'
    ) ?? null;
    const primaryConstructorProviderSlots = app.emission.appWorld.diWorld.resolverSlots.filter(
      (slot): slot is ContainerResolverSlot & { readonly resolver: InstanceProvider } =>
      slot.container.productHandle === primaryContainer?.productHandle
      && slot.resolver instanceof InstanceProvider
    );
    expect(primaryConstructorProviderSlots.map((slot) => slot.resolver.friendlyName).sort())
      .toEqual(['Aurelia', 'IAppRoot', 'IAurelia']);
    expect(primaryConstructorProviderSlots.map((slot) => slot.resolver)).toContain(primaryAurelia?.rootProvider);
    expect(primaryAurelia?.rootProvider.resolve().value?.productHandle).toBe(replacementRoot?.productHandle);
    expect(primaryConstructorProviderSlots.filter((slot) =>
      slot.resolver.friendlyName !== 'IAppRoot'
    ).every((slot) =>
      slot.resolver.resolve().value?.productHandle === primaryAurelia?.productHandle
    )).toBe(true);
    expect(app.emission.appWorld.diWorld.resolvers).toEqual(expect.arrayContaining(
      primaryConstructorProviderSlots.map((slot) => slot.resolver),
    ));

    assertExactConfigurationCausality(runtime, configuration);

    const resolverOwners = new Map(app.emission.appWorld.diWorld.resolverSlots.flatMap((slot) =>
      resolverKeyName(slot) == null
        ? []
        : [[resolverKeyName(slot)!, slot.container.productHandle] as const]
    ));
    expect(resolverOwners.get('primary-root')).toBe(primaryContainer?.productHandle);
    expect(resolverOwners.get('primary-app')).toBe(primaryContainer?.productHandle);
    expect(resolverOwners.get('secondary-root')).toBe(secondaryContainer?.productHandle);
    expect(resolverOwners.get('secondary-app')).toBe(secondaryContainer?.productHandle);
    expect(resolverOwners.get('parent-only')).toBe(childParentContainer?.productHandle);
    expect(resolverOwners.get('child-only')).toBe(childContainer?.productHandle);
    expect(resolverOwners.get('child-app')).toBe(childContainer?.productHandle);
    expect(resolverOwners.get('implicit-app')).toBe(implicitAurelia?.container.productHandle);
    expect(resolverOwners.get('static-chain')).not.toBe(resolverOwners.get('static-registration-only'));

    expect(app.emission.appWorld.diWorld.registrationOperations.flatMap((operation) => {
      const admission = operation.admission;
      const localName = admission instanceof ResolverRegistrationAdmission
        ? admission.registeredValue?.localName ?? null
        : null;
      return localName === 'ChildContainerRegistrationValue' || localName === 'ChildAppRegistrationValue'
        ? [localName]
        : [];
    })).toEqual(['ChildContainerRegistrationValue', 'ChildAppRegistrationValue']);
  });

  test('spends only registry calls reached on the concrete execution path', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-path-honesty'),
      storeKey: 'test:di-provider-model:registry-path-honesty',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const operationNames = world.diWorld.registrationOperations.map((operation) => {
      const admission = operation.admission;
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
    const operationOpenSeams = operationMaterializations
      .flatMap((materialization) => materialization.openSeamHandles)
      .map((handle) => runtime.workspace.store.readOpenSeam(handle));
    expect(operationOpenSeams).toHaveLength(1);
    expect(operationOpenSeams[0]?.reasonKinds).toContain(OpenSeamReasonKind.DiRegistryBodyOpen);
    expect(world.compilerWorlds).toHaveLength(1);
  });

  test('spends registry helpers in call-time order with occurrence-local values', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-execution-order'),
      storeKey: 'test:di-provider-model:registry-execution-order',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const orderedResolverNames = world.diWorld.resolverSlots
      .map(resolverKeyName)
      .filter((name) => name?.startsWith('execution-source-'));

    expect(orderedResolverNames).toEqual([
      'execution-source-second',
      'execution-source-first',
    ]);
    expect(world.diWorld.registrationOperations.map((operation) => operation.ordinal))
      .toEqual(world.diWorld.registrationOperations.map((_, index) => index));
    expect(new Set(world.diWorld.registrationOperations.map((operation) => operation.productHandle)).size)
      .toBe(world.diWorld.registrationOperations.length);
    expect(world.compilerWorlds).toHaveLength(1);
  });

  test('preserves a nested registry module guard across repeated applications', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-nested-guarded-registry'),
      storeKey: 'test:di-provider-model:nested-guarded-registry',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld.diWorld;
    const relevantOperations = world.registrationOperations.flatMap((operation) => {
      const admission = operation.admission;
      if (admission instanceof RegistryRegistrationAdmission) {
        const localName = admission.registryValue?.localName ?? null;
        if (localName === 'OuterRegistry') {
          return [{ operation, localName }];
        }
        if (localName === 'InnerRegistry') {
          return [{ operation, localName: 'SecondContainerInnerRegistry' }];
        }
        return [];
      }
      if (
        admission instanceof OpenRegistrationAdmission
        && operation.registrationValue instanceof RegistryValue
        && admission.registeredValue?.localName === 'innerRegistry'
      ) {
        return [{ operation, localName: 'InnerRegistry' }];
      }
      if (
        admission instanceof OpenRegistrationAdmission
        && operation.registrationValue instanceof RegistryValue
        && admission.registeredValue?.localName === 'mutableRegistry'
      ) {
        return [{ operation, localName: 'MutableRegistry' }];
      }
      if (admission instanceof ResourceRegistrationAdmission) {
        const localName = admission.registeredValue?.localName ?? null;
        return [
          'GuardedOnceCustomAttribute',
          'FirstEffectCustomAttribute',
          'SecondEffectCustomAttribute',
        ].includes(localName ?? '')
          ? [{ operation, localName }]
          : [];
      }
      return [];
    });
    const innerOperations = relevantOperations.filter(({ localName }) => localName === 'InnerRegistry');
    const mutableOperations = relevantOperations.filter(({ localName }) => localName === 'MutableRegistry');
    const secondContainerInnerOperations = relevantOperations.filter(({ localName }) =>
      localName === 'SecondContainerInnerRegistry'
    );
    const resourceOperations = relevantOperations.filter(({ localName }) => localName === 'GuardedOnceCustomAttribute');
    const innerOperationSeams = runtime.workspace.store.readMaterializations()
      .filter((materialization) => innerOperations.some(({ operation }) =>
        materialization.productHandles.includes(operation.productHandle)
      ))
      .flatMap((materialization) => materialization.openSeamHandles)
      .map((handle) => runtime.workspace.store.readOpenSeam(handle))
      .filter((seam) => seam != null);
    const mutableOperationSeams = runtime.workspace.store.readMaterializations()
      .filter((materialization) => mutableOperations.some(({ operation }) =>
        materialization.productHandles.includes(operation.productHandle)
      ))
      .flatMap((materialization) => materialization.openSeamHandles)
      .map((handle) => runtime.workspace.store.readOpenSeam(handle))
      .filter((seam) => seam != null);
    const resourceKey = 'au:resource:custom-attribute:guarded-once';

    expect(relevantOperations.map(({ localName }) => localName)).toEqual([
      'OuterRegistry',
      'InnerRegistry',
      'GuardedOnceCustomAttribute',
      'InnerRegistry',
      'MutableRegistry',
      'FirstEffectCustomAttribute',
      'MutableRegistry',
      'SecondEffectCustomAttribute',
      'SecondContainerInnerRegistry',
    ]);
    expect(innerOperations).toHaveLength(2);
    expect(innerOperations.every(({ operation }) =>
      operation.admission instanceof OpenRegistrationAdmission
      && operation.evidenceAuthority === 'evaluation'
    )).toBe(true);
    expect(new Set(innerOperations.map(({ operation }) => operation.admission)).size).toBe(1);
    expect(new Set(innerOperations.map(({ operation }) => operation.registrationValue)).size).toBe(1);
    expect(new Set(innerOperations.map(({ operation }) => operation.productHandle)).size).toBe(2);
    expect(new Set(innerOperations.map(({ operation }) => operation.ordinal)).size).toBe(2);
    expect(mutableOperations).toHaveLength(2);
    expect(new Set(mutableOperations.map(({ operation }) => operation.admission)).size).toBe(1);
    expect(new Set(mutableOperations.map(({ operation }) => operation.registrationValue)).size).toBe(1);
    expect(secondContainerInnerOperations).toHaveLength(1);
    expect(secondContainerInnerOperations[0]?.operation.container.productHandle)
      .not.toBe(innerOperations[0]?.operation.container.productHandle);
    expect(resourceOperations).toHaveLength(1);
    expect(world.resourceSlots.filter((slot) => [
      resourceKey,
      'au:resource:custom-attribute:first-effect',
      'au:resource:custom-attribute:second-effect',
    ].includes(slot.resourceKey))).toHaveLength(3);
    expect(world.resourceSlotExclusions.filter((exclusion) => exclusion.resourceKey === resourceKey)).toHaveLength(0);
    expect(world.resourceIssues.filter((issue) =>
      issue.issueKind === ResourceIssueKind.CustomAttributeAlreadyRegistered
    )).toHaveLength(0);
    expect(innerOperationSeams).toHaveLength(0);
    expect(mutableOperationSeams).toHaveLength(0);
    const secondContainerOperationSeams = runtime.workspace.store.readMaterializations()
      .filter((materialization) => secondContainerInnerOperations.some(({ operation }) =>
        materialization.productHandles.includes(operation.productHandle)
      ))
      .flatMap((materialization) => materialization.openSeamHandles);
    expect(secondContainerOperationSeams).toHaveLength(1);
    expect(runtime.workspace.store.readOpenSeam(secondContainerOperationSeams[0]!)?.reasonKinds)
      .toContain(OpenSeamReasonKind.DiRegistryBodyOpen);
    expect(world.resourceSlots.filter((slot) =>
      slot.resourceKey === resourceKey
      && slot.container.productHandle === secondContainerInnerOperations[0]?.operation.container.productHandle
    )).toHaveLength(0);

    const configurationAdmissions = app.emission.appWorld.configuration.registrationAdmissions;
    const innerAdmission = configurationAdmissions.find((admission) =>
      admission instanceof OpenRegistrationAdmission
      && admission.registeredValue?.localName === 'innerRegistry'
    );
    const mutableAdmission = configurationAdmissions.find((admission) =>
      admission instanceof OpenRegistrationAdmission
      && admission.registeredValue?.localName === 'mutableRegistry'
    );
    expect(innerAdmission).toBeInstanceOf(OpenRegistrationAdmission);
    expect(mutableAdmission).toBeInstanceOf(OpenRegistrationAdmission);
    expect(innerOperations.every(({ operation }) => operation.admission === innerAdmission)).toBe(true);
    expect(mutableOperations.every(({ operation }) => operation.admission === mutableAdmission)).toBe(true);
    const innerRegistryValue = innerOperations[0]?.operation.registrationValue;
    const mutableRegistryValue = mutableOperations[0]?.operation.registrationValue;
    expect(innerRegistryValue).toBeInstanceOf(RegistryValue);
    expect(mutableRegistryValue).toBeInstanceOf(RegistryValue);
    expect(secondContainerInnerOperations[0]?.operation.registrationValue).toBe(innerRegistryValue);
    expect((innerRegistryValue as RegistryValue).registryValue?.localName).toBe('InnerRegistry');
    expect((mutableRegistryValue as RegistryValue).registryValue?.localName).toBe('MutableRegistry');
    expect(sourcePathForAddress(runtime, (innerRegistryValue as RegistryValue).registryValue?.addressHandle ?? null))
      .toMatch(/src\/guarded-registry\.ts$/u);
    expect(sourcePathForAddress(runtime, (mutableRegistryValue as RegistryValue).registryValue?.addressHandle ?? null))
      .toMatch(/src\/main\.ts$/u);
    for (const { operation } of [...innerOperations, ...mutableOperations]) {
      expect(sourcePathForAddress(runtime, operation.sourceAddressHandle)).toMatch(/src\/main\.ts$/u);
      const claims = runtime.workspace.store.readClaimsForSubject(operation.productHandle)
        .map((handle) => runtime.workspace.store.readClaim(handle));
      const applies = claims.find((claim) =>
        claim?.predicateKey === KernelVocabulary.Di.AppliesRegistration.key
        && claim.objectHandle === operation.admission.productHandle
      );
      const uses = claims.find((claim) =>
        claim?.predicateKey === KernelVocabulary.Di.UsesRegistrationValue.key
        && claim.objectHandle === operation.registrationValue?.productHandle
      );
      const materialization = runtime.workspace.store.readMaterializations().find((candidate) =>
        candidate.productHandles.includes(operation.productHandle)
      );
      expect(applies).toBeDefined();
      expect(uses).toBeDefined();
      expect(materialization?.claimHandles).toEqual(expect.arrayContaining([
        applies!.handle,
        uses!.handle,
      ]));
    }

    const registrySource = app.emission.evaluation.sources.find((source) =>
      isEvaluatedProjectSource(source) && /guarded-registry\.ts$/u.test(source.moduleKey)
    );
    expect(registrySource != null && isEvaluatedProjectSource(registrySource)).toBe(true);
    expect(registrySource != null && isEvaluatedProjectSource(registrySource)
      ? registrySource.evaluation.environment.readValue('registered')
      : null
    ).toMatchObject({ kind: EvaluationValueKind.Boolean, value: false });

    const freshRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-nested-guarded-registry'),
      storeKey: 'test:di-provider-model:nested-guarded-registry:fresh-world',
    });
    const freshApp = await freshRuntime.openApp({ analysisDepth: 'binding-observation' });
    const freshWorld = freshApp.emission.appWorld.diWorld;
    const guardedResourceKeys = [
      resourceKey,
      'au:resource:custom-attribute:first-effect',
      'au:resource:custom-attribute:second-effect',
    ];
    expect(freshWorld.resourceSlots.filter((slot) =>
      guardedResourceKeys.includes(slot.resourceKey)
    )).toHaveLength(3);
    expect(freshWorld.resourceSlotExclusions.filter((exclusion) =>
      guardedResourceKeys.includes(exclusion.resourceKey)
    )).toHaveLength(0);
    expect(freshWorld.resourceIssues.filter((issue) =>
      issue.issueKind === ResourceIssueKind.CustomAttributeAlreadyRegistered
    )).toHaveLength(0);
    const freshInnerRegistryValue = freshWorld.registrationOperations.find((operation) =>
      operation.admission instanceof OpenRegistrationAdmission
      && operation.admission.registeredValue?.localName === 'innerRegistry'
      && operation.registrationValue instanceof RegistryValue
    )?.registrationValue;
    expect(freshInnerRegistryValue).toBeInstanceOf(RegistryValue);
    expect(freshInnerRegistryValue).not.toBe(innerRegistryValue);
  });

  test('keeps changed immutable registry snapshots open instead of replaying stale state', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-snapshot-state-boundary'),
      storeKey: 'test:di-provider-model:registry-snapshot-state-boundary',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld.diWorld;
    const registryOperations = world.registrationOperations.filter((operation) =>
      operation.registrationValue instanceof RegistryValue
      && operation.registrationValue.registryValue?.localName === 'SnapshotRegistry'
    );
    const resetRegistryOperations = world.registrationOperations.filter((operation) =>
      operation.registrationValue instanceof RegistryValue
      && operation.registrationValue.registryValue?.localName === 'ResetRegistry'
    );
    const arrowRegistryOperations = world.registrationOperations.filter((operation) =>
      operation.registrationValue instanceof RegistryValue
      && operation.admission instanceof RegistryRegistrationAdmission
      && operation.admission.registryValue?.localName === 'ArrowRegistry'
    );
    const resourceOperationNames = world.registrationOperations.flatMap((operation) => {
      const admission = operation.admission;
      return admission instanceof ResourceRegistrationAdmission
        ? [admission.registeredValue.localName]
        : [];
    });
    const registryOperationSeams = registryOperations.map((operation) =>
      runtime.workspace.store.readMaterializations()
        .filter((materialization) => materialization.productHandles.includes(operation.productHandle))
        .flatMap((materialization) => materialization.openSeamHandles)
        .map((handle) => runtime.workspace.store.readOpenSeam(handle))
        .filter((seam) => seam != null)
    );
    const resetRegistryOperationSeams = resetRegistryOperations.map((operation) =>
      runtime.workspace.store.readMaterializations()
        .filter((materialization) => materialization.productHandles.includes(operation.productHandle))
        .flatMap((materialization) => materialization.openSeamHandles)
        .map((handle) => runtime.workspace.store.readOpenSeam(handle))
        .filter((seam) => seam != null)
    );
    const arrowRegistryOperationSeams = arrowRegistryOperations.map((operation) =>
      runtime.workspace.store.readMaterializations()
        .filter((materialization) => materialization.productHandles.includes(operation.productHandle))
        .flatMap((materialization) => materialization.openSeamHandles)
        .map((handle) => runtime.workspace.store.readOpenSeam(handle))
        .filter((seam) => seam != null)
    );

    expect(registryOperations).toHaveLength(2);
    expect(new Set(registryOperations.map((operation) => operation.registrationValue)).size).toBe(1);
    expect(resourceOperationNames).toContain('SnapshotFirstCustomAttribute');
    expect(resourceOperationNames).not.toContain('SnapshotSecondCustomAttribute');
    expect(registryOperationSeams[0]).toHaveLength(0);
    expect(registryOperationSeams[1]?.some((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.DiRegistryBodyOpen)
    )).toBe(true);
    expect(resetRegistryOperations).toHaveLength(2);
    expect(new Set(resetRegistryOperations.map((operation) => operation.registrationValue)).size).toBe(1);
    expect(resourceOperationNames).toContain('ResetFirstCustomAttribute');
    expect(resourceOperationNames).not.toContain('ResetSecondCustomAttribute');
    expect(resetRegistryOperationSeams[0]).toHaveLength(0);
    expect(resetRegistryOperationSeams[1]?.some((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.DiRegistryBodyOpen)
    )).toBe(true);
    expect(arrowRegistryOperations).toHaveLength(2);
    expect(new Set(arrowRegistryOperations.map((operation) => operation.registrationValue)).size).toBe(1);
    expect(resourceOperationNames).toContain('ArrowFirstCustomAttribute');
    expect(resourceOperationNames).not.toContain('ArrowSecondCustomAttribute');
    expect(arrowRegistryOperationSeams[0]).toHaveLength(0);
    expect(arrowRegistryOperationSeams[1]?.some((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.DiRegistryBodyOpen)
    )).toBe(true);
    expect(world.resourceIssues.filter((issue) =>
      issue.issueKind === ResourceIssueKind.CustomAttributeAlreadyRegistered
    )).toHaveLength(0);
  });

  test('preserves caught and finally effects from nested registry failures', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-nested-failure-control'),
      storeKey: 'test:di-provider-model:registry-nested-failure-control',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const resolverNames = world.diWorld.resolverSlots.map(resolverKeyName);

    expect(resolverNames).toEqual(expect.arrayContaining([
      'caught-inner-before-throw',
      'caught-outer-after-catch',
      'finally-inner-before-throw',
      'finally-outer-effect',
      'mixed-outer-after-catch',
      'mixed-inner-before-throw',
      'deferred-outer-after-catch',
      'deferred-fallback-after-catch',
    ]));
    expect(resolverNames).not.toContain('finally-unreachable');
    expect(resolverNames).not.toContain('caught-outer-wrong-value');
    expect(resolverNames).not.toContain('deferred-outer-wrong-value');
    expect(resolverNames).not.toContain('deferred-fallback-wrong-value');
    expect(world.diWorld.issues.filter((issue) =>
      issue.issueKind === DiIssueKind.RegistryApplicationFailed
    )).toHaveLength(2);
    expect(world.compilerWorlds).toHaveLength(1);
    expect(world.compilerWorlds[0]?.attributePatterns.length).toBeGreaterThan(0);
  });

  test('reifies repeated registration applications without collapsing admission or container identity', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registration-application-topology'),
      storeKey: 'test:di-provider-model:registration-application-topology',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld.diWorld;
    const resolver = world.resolvers.find((candidate) =>
      candidate instanceof Resolver
      && candidate._key.localName === 'shared-registration-application'
    ) ?? null;
    const operations = world.registrationOperations.filter((operation) =>
      operation.registrationValue === resolver
    );
    const admission = operations[0]?.admission ?? null;
    const resolverSlots = world.resolverSlots.filter((slot) => slot.resolver === resolver);

    expect(admission).toBeInstanceOf(RegistryRegistrationAdmission);
    expect(resolver).toBeInstanceOf(Resolver);
    expect(world.resolvers.filter((candidate) => candidate === resolver)).toHaveLength(1);
    expect(operations).toHaveLength(3);
    expect(operations.every((operation) => operation.admission === admission)).toBe(true);
    expect(operations.every((operation) => operation.registrationValue === resolver)).toBe(true);
    expect(new Set(operations.map((operation) => operation.productHandle)).size).toBe(3);
    expect(new Set(operations.map((operation) => operation.identityHandle)).size).toBe(3);
    expect(new Set(operations.map((operation) => operation.container.productHandle)).size).toBe(2);
    expect(resolverSlots).toHaveLength(3);
    expect(new Set(resolverSlots.map((slot) => slot.container.productHandle)).size).toBe(2);
    expect(operations.map((operation) => operation.ordinal)).toEqual(
      [...operations].sort((left, right) => left.ordinal - right.ordinal).map((operation) => operation.ordinal),
    );
    const sharedTaskRegistrations = world.registeredAppTasks.filter((registration) => {
      const taskAdmission = registration.operation.admission;
      return taskAdmission instanceof RegistryRegistrationAdmission
        && taskAdmission.registryValue?.localName === 'sharedTask';
    });
    expect(sharedTaskRegistrations).toHaveLength(2);
    expect(new Set(sharedTaskRegistrations.map((registration) => registration.task.productHandle)).size).toBe(1);
    expect(new Set(sharedTaskRegistrations.map((registration) => registration.operation.productHandle)).size).toBe(2);
    expect(new Set(sharedTaskRegistrations.map((registration) => registration.operation.identityHandle)).size).toBe(2);
    expect(new Set(sharedTaskRegistrations.map((registration) => registration.operation.ordinal)).size).toBe(2);
    expect(new Set(sharedTaskRegistrations.map((registration) =>
      registration.operation.registrationValue?.productHandle
    )).size).toBe(1);

    for (const operation of operations) {
      const containerProducesOperation = runtime.workspace.store
        .readClaimsForSubject(operation.container.productHandle!)
        .map((handle) => runtime.workspace.store.readClaim(handle))
        .find((claim) =>
          claim?.predicateKey === KernelVocabulary.Di.ProducesProduct.key
          && claim.objectHandle === operation.productHandle
        ) ?? null;
      const operationAppliesAdmission = runtime.workspace.store
        .readClaimsForSubject(operation.productHandle)
        .map((handle) => runtime.workspace.store.readClaim(handle))
        .find((claim) =>
          claim?.predicateKey === KernelVocabulary.Di.AppliesRegistration.key
          && claim.objectHandle === admission?.productHandle
        ) ?? null;
      const operationUsesRegistrationValue = runtime.workspace.store
        .readClaimsForSubject(operation.productHandle)
        .map((handle) => runtime.workspace.store.readClaim(handle))
        .find((claim) =>
          claim?.predicateKey === KernelVocabulary.Di.UsesRegistrationValue.key
          && claim.objectHandle === resolver?.productHandle
        ) ?? null;
      const materialization = runtime.workspace.store.readMaterializations().find((candidate) =>
        candidate.productHandles.includes(operation.productHandle)
      ) ?? null;

      expect(containerProducesOperation).not.toBeNull();
      expect(operationAppliesAdmission).not.toBeNull();
      expect(operationUsesRegistrationValue).not.toBeNull();
      expect(materialization?.claimHandles).toEqual(expect.arrayContaining([
        containerProducesOperation!.handle,
        operationAppliesAdmission!.handle,
        operationUsesRegistrationValue!.handle,
      ]));
      expect(runtime.workspace.store.readClaimsForSubject(operation.productHandle)
        .map((handle) => runtime.workspace.store.readClaim(handle))
        .filter((claim) =>
          claim?.predicateKey === KernelVocabulary.Di.ProducesProduct.key
        )
        .every((claim) =>
          claim?.objectHandle !== resolver?.productHandle
          && !operations.some((candidate) => candidate.productHandle === claim?.objectHandle)
        ))
        .toBe(true);
    }
  });

  test('spends parameterized registries through live handler and fallback branches', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-parameterized-registry-topology'),
      storeKey: 'test:di-provider-model:parameterized-registry-topology',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld.diWorld;
    const resolverNames = world.resolverSlots
      .flatMap((slot) => {
        const identity = runtime.workspace.store.read(slot.keyIdentityHandle);
        return identity instanceof StringDiKeyIdentity ? [identity.value] : [];
      });
    const parameterizedOperations = world.registrationOperations.filter((operation) =>
      operation.registrationValue instanceof ParameterizedRegistry
    );
    const operationOpenSeams = runtime.workspace.store.readMaterializations()
      .filter((materialization) => parameterizedOperations.some((operation) =>
        materialization.productHandles.includes(operation.productHandle)
      ))
      .flatMap((materialization) => materialization.openSeamHandles)
      .map((handle) => runtime.workspace.store.readOpenSeam(handle))
      .filter((seam) => seam != null);

    expect(resolverNames).toEqual(expect.arrayContaining([
      'deferred-shared-1',
      'deferred-shared-2',
      'deferred-alias-3',
      'deferred-transient-1-1',
      'deferred-transient-2-1',
      'fallback-registry-value',
      'fallback-carrier-value',
      'late-fallback-value',
    ]));
    expect(resolverNames).not.toContain('deferred-callback-1');
    expect(world.parameterizedRegistries).toHaveLength(7);
    expect(parameterizedOperations).toHaveLength(8);
    expect(operationOpenSeams.filter((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.DiRegistryBodyOpen)
    )).toHaveLength(1);
  });

  test('preserves registry effects, pressure, and fatal completion without taking invalid fallback paths', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-completion-topology'),
      storeKey: 'test:di-provider-model:registry-completion-topology',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld.diWorld;
    const resolverNames = world.resolverSlots.flatMap((slot) => {
      const identity = runtime.workspace.store.read(slot.keyIdentityHandle);
      return identity instanceof StringDiKeyIdentity ? [identity.value] : [];
    });
    const failureIssues = world.issues.filter((issue) =>
      issue.issueKind === DiIssueKind.RegistryApplicationFailed
    );
    const cycleIssues = world.issues.filter((issue) =>
      issue.issueKind === DiIssueKind.CyclicDependency
    );

    expect(resolverNames).toEqual(expect.arrayContaining([
      'partial-before-throw',
      'caught-inside-catch',
      'caught-after-catch',
      'audit-pressure-effect',
    ]));
    expect(resolverNames).not.toEqual(expect.arrayContaining([
      'partial-after-throw',
      'partial-after-registry',
      'non-callable-fallback',
      'non-callable-after-defer',
      'failed-handler-fallback',
      'failed-handler-after-defer',
      'cyclic-handler-effect',
      'cyclic-handler-fallback',
      'cyclic-handler-after-defer',
    ]));
    expect(failureIssues.map((issue) =>
      issue.subject.kind === DiIssueSubjectKind.RegistrationCascade
        ? issue.subject.failureKind
        : null
    )).toEqual(expect.arrayContaining([
      DiRegistryApplicationFailureKind.AbruptCompletion,
      DiRegistryApplicationFailureKind.HandlerRegisterNotCallable,
      DiRegistryApplicationFailureKind.HandlerResolution,
    ]));
    expect(cycleIssues).toHaveLength(1);

    const auditOperation = world.registrationOperations.find((operation) =>
      operation.admission instanceof RegistryRegistrationAdmission
      && operation.admission.registryValue?.localName === 'AuditPressureRegistry'
    );
    const auditMaterialization = runtime.workspace.store.readMaterializations().find((materialization) =>
      auditOperation != null && materialization.productHandles.includes(auditOperation.productHandle)
    );
    const auditSeams = auditMaterialization?.openSeamHandles.flatMap((handle) => {
      const seam = runtime.workspace.store.readOpenSeam(handle);
      return seam == null ? [] : [seam];
    }) ?? [];
    expect(auditSeams.some((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.HostEnvironmentValue)
    )).toBe(true);
  });

  test('spends repeated global configuration calls from definite occurrence evidence', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'configuration-execution-order'),
      storeKey: 'test:di-provider-model:configuration-execution-order',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const orderedResolverNames = world.diWorld.resolverSlots.flatMap((slot) => {
      const identity = runtime.workspace.store.read(slot.keyIdentityHandle);
      return identity instanceof StringDiKeyIdentity && identity.value.startsWith('global-')
        ? [identity.value]
        : [];
    });

    expect(orderedResolverNames).toEqual([
      'global-called-second-in-source',
      'global-called-first-in-source',
    ]);
    expect(orderedResolverNames).not.toContain('global-never-executed');
    expect(world.diWorld.registrationOperations.map((operation) => operation.ordinal))
      .toEqual(world.diWorld.registrationOperations.map((_, index) => index));
  });

  test('retains registration-owned seam identity when DI spends an open admission', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registration-open-reasons'),
      storeKey: 'test:di-provider-model:open-registration-causality',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const admission = world.configuration.registrationAdmissions.find((candidate) =>
      candidate instanceof OpenRegistrationAdmission
    );
    const operation = world.diWorld.registrationOperations.find((candidate) =>
      candidate.admission === admission
    );
    const admissionMaterialization = runtime.workspace.store.readMaterializations().find((materialization) =>
      admission != null && materialization.productHandles.includes(admission.productHandle)
    );
    const operationMaterialization = runtime.workspace.store.readMaterializations().find((materialization) =>
      operation != null && materialization.productHandles.includes(operation.productHandle)
    );

    expect(admission).toBeInstanceOf(OpenRegistrationAdmission);
    expect(operation).toBeDefined();
    expect(admissionMaterialization?.openSeamHandles).toHaveLength(1);
    expect(operationMaterialization?.openSeamHandles).toEqual(admissionMaterialization?.openSeamHandles);
    expect(runtime.workspace.store.readOpenSeam(operationMaterialization!.openSeamHandles[0]!)?.reasonKinds)
      .toEqual([OpenSeamReasonKind.RegistrationStrategyOpen]);
  });

  test('stops a recursive registry cascade before later compiler effects', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'di-registry-recursive-compiler-block'),
      storeKey: 'test:di-provider-model:recursive-registry',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const world = app.emission.appWorld;
    const operationNames = world.diWorld.registrationOperations.map((operation) => {
      const admission = operation.admission;
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
      resolverKeyName(slot) === 'ITemplateCompiler'
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

  test('preserves exact projection resource imports and hydration-context providers', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureFixtures, 'content-projection-topology'),
      storeKey: 'test:di-provider-model:content-projection-context',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const resource = app.emission.templates.resources.find((candidate) =>
      candidate.compilation.definition.name === 'content-projection-topology-app'
    );
    const rendering = resource?.runtimeAnalysis.runtimeRendering;
    const selected = rendering?.contentProjectionViews.find((view) =>
      view.selectionKind === 'projected'
        && view.slotName === 'heading'
        && view.factoryContainer?.readResourceSlots().some((slot) =>
          slot.resourceKey === 'au:resource:value-converter:projectionLabel'
        )
    );
    const fallback = rendering?.contentProjectionViews.find((view) =>
      view.selectionKind === 'fallback'
        && view.factoryContainer?.readResourceSlots().some((slot) =>
          slot.resourceKey === 'au:resource:value-converter:fallbackLabel'
        )
    );

    expect(selected).toBeDefined();
    expect(fallback).toBeDefined();
    if (rendering == null || selected?.factoryContainer == null || fallback?.factoryContainer == null) {
      throw new Error('Expected selected and fallback projection factory containers.');
    }

    expect(selected.factoryContainer.readResourceSlots().map((slot) => slot.resourceKey))
      .toEqual([
        'au:resource:value-converter:projectionLabel',
        'au:resource:custom-element:scoped-compose-widget',
        'au:resource:custom-element:opaque-content-shell',
      ]);
    expect(fallback.factoryContainer.readResourceSlots().map((slot) => slot.resourceKey))
      .toEqual([
        'au:resource:value-converter:fallbackLabel',
        'au:resource:binding-behavior:fallbackAudit',
        'au:resource:custom-element:scoped-compose-widget',
      ]);
    const selectedScopedElement = selected.factoryContainer.readResourceSlots().find((slot) =>
      slot.resourceKey === 'au:resource:custom-element:scoped-compose-widget'
    );
    const fallbackScopedElement = fallback.factoryContainer.readResourceSlots().find((slot) =>
      slot.resourceKey === 'au:resource:custom-element:scoped-compose-widget'
    );
    expect(selectedScopedElement?.resourceProductHandle)
      .toBe(app.emission.resourceIndex.lookupByLocalName('DeclaringComposeWidget')?.productHandle);
    expect(fallbackScopedElement?.resourceProductHandle)
      .toBe(app.emission.resourceIndex.lookupByLocalName('ReceivingComposeWidget')?.productHandle);
    expect(selectedScopedElement?.resourceProductHandle)
      .not.toBe(fallbackScopedElement?.resourceProductHandle);

    for (const slot of [
      ...selected.factoryContainer.readResourceSlots(),
      ...fallback.factoryContainer.readResourceSlots(),
    ]) {
      const subjectClaims = runtime.workspace.store.readClaimsForSubject(slot.productHandle)
        .map((handle) => runtime.workspace.store.readClaim(handle));
      const objectClaims = runtime.workspace.store.readClaimsForObject(slot.productHandle)
        .map((handle) => runtime.workspace.store.readClaim(handle));
      expect(subjectClaims.some((claim) =>
        claim?.predicateKey === KernelVocabulary.Di.ResourceSlotImportedFrom.key
      )).toBe(true);
      expect(objectClaims.some((claim) =>
        claim?.predicateKey === KernelVocabulary.Di.ProducesProduct.key
      )).toBe(true);
    }

    const selectedContextProvider = rendering.childContextResolverSlots.find((slot) =>
      slot.container.productHandle === selected.factoryContainer?.productHandle
        && slot.resolver instanceof InstanceProvider
        && slot.resolver.friendlyName === 'IHydrationContext'
    );
    expect(selectedContextProvider?.resolver).toBeInstanceOf(InstanceProvider);
    expect((selectedContextProvider?.resolver as InstanceProvider).resolve().value?.productHandle)
      .toBe(selected.factoryHydrationContext?.productHandle);
    expect(selected.syntheticController?.readHydrationContext()?.productHandle)
      .toBe(selected.factoryHydrationContext?.productHandle);

    expect(rendering.childContextResolverSlots.some((slot) =>
      slot.container.productHandle === fallback.factoryContainer?.productHandle
        && slot.resolver instanceof InstanceProvider
        && slot.resolver.friendlyName === 'IHydrationContext'
    )).toBe(false);
    expect(fallback.syntheticController?.readHydrationContext()?.productHandle)
      .toBe(fallback.receivingController?.readHydrationContext()?.productHandle);
  });
});

interface ProviderActivationFixture {
  readonly app: SemanticApp;
  readonly runtime: SemanticRuntime;
  readonly activation: DiProviderActivationView;
  readonly container: Container;
  readonly sites: ReadonlyMap<string, DiContainerApiCallSite>;
  readonly evaluation: StaticProjectEvaluationResult;
  readonly typeSystem: TypeSystemProject;
  readonly diWorld: DiWorldConstructionEmission;
}

async function openProviderActivationFixture(
  testKey: string,
  fixtureName: string = 'di-provider-activation',
): Promise<ProviderActivationFixture> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureFixtures, fixtureName),
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
    app,
    runtime,
    activation: new DiProviderActivationView(
      runtime.workspace.store,
      app.emission.evaluation,
      app.emission.typeSystem,
      configuration,
      app.emission.appWorld.diWorld,
      noDiProviderActivationValues,
    ),
    container,
    sites,
    evaluation: app.emission.evaluation,
    typeSystem: app.emission.typeSystem,
    diWorld: app.emission.appWorld.diWorld,
  };
}

function readClassDependencyPlan(
  fixture: ProviderActivationFixture,
  plans: DiClassDependencyProjectView,
  className: string,
): DiClassDependencyPlan {
  const source = fixture.typeSystem.readProgramSourceFileByProjectPath('src/main.ts');
  const declaration = source?.statements.find((statement): statement is ts.ClassDeclaration =>
    ts.isClassDeclaration(statement) && statement.name?.text === className
  ) ?? null;
  if (declaration == null) {
    throw new Error(`Expected the ${className} class declaration.`);
  }
  const plan = plans.readForDeclaration(declaration);
  if (plan == null) {
    throw new Error(`Expected a class dependency plan for ${className}.`);
  }
  return plan;
}

function assertExactLocalClassDependencyPlan(
  plan: DiClassDependencyPlan,
  authority: DiClassDependencyAuthority,
  dependencyName: string,
): void {
  expect(plan.authority).toBe(authority);
  expect(plan.positionState).toBe(DiClassDependencyPositionState.Exact);
  expect(plan.namedState).toBe(DiClassDependencyNamedState.Exact);
  expect(plan.inheritedPlan).toBeNull();
  expect(plan.slots).toHaveLength(1);

  const slot = plan.slots[0]!;
  expect(slot.state).toBe(DiClassDependencySlotState.Present);
  expect(slot.sourceExpression?.getText()).toBe(dependencyName);
  expect(slot.lookupKeyExpression?.getText()).toBe(dependencyName);
  expect(slot.carrierExpression.getText()).toBe(dependencyName);
  expect(slot.evidence?.openSeams).toHaveLength(0);
  expect(slot.evidence?.value.kind).toBe(EvaluationValueKind.Class);
  expect(slot.evidence?.value.kind === EvaluationValueKind.Class
    ? slot.evidence.value.declaration.name?.getText()
    : null).toBe(dependencyName);
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

function evaluatedSourceValue(
  evaluation: StaticProjectEvaluationResult,
  sourcePath: string,
  localName: string,
): EvaluationValue | null {
  const normalized = sourcePath.replace(/\\/g, '/');
  const source = evaluation.readEvaluatedSources().find((candidate) =>
    candidate.admission.path.replace(/\\/g, '/').endsWith(normalized)
  ) ?? null;
  return source?.evaluation.environment.readValue(localName) ?? null;
}

function assertExactConfigurationCausality(
  runtime: SemanticRuntime,
  configuration: ConfigurationKernelEmission,
): void {
  const store = runtime.workspace.store;
  const targetClaims = store.readClaims().filter((claim) =>
    claim.predicateKey === KernelVocabulary.Configuration.TargetsProduct.key
  );
  const producerClaims = store.readClaims().filter((claim) =>
    claim.predicateKey === KernelVocabulary.Configuration.ProducesProduct.key
  );
  const producedProductHandles = configuration.steps.flatMap((step) => step.producedProductHandles);

  expect(new Set(producedProductHandles).size).toBe(producedProductHandles.length);
  for (const step of configuration.steps) {
    expect(targetClaims.filter((claim) => claim.subjectHandle === step.productHandle)
      .map((claim) => claim.objectHandle))
      .toEqual(step.targetProductHandle == null ? [] : [step.targetProductHandle]);
    const stepProducerClaims = producerClaims.filter((claim) => claim.subjectHandle === step.productHandle);
    expect(stepProducerClaims.map((claim) => claim.objectHandle)).toEqual(step.producedProductHandles);

    for (const outputHandle of step.producedProductHandles) {
      const producerClaim = stepProducerClaims.find((claim) => claim.objectHandle === outputHandle) ?? null;
      const materializations = store.readMaterializations().filter((materialization) =>
        materialization.productHandles.includes(outputHandle)
      );
      expect(producerClaim).not.toBeNull();
      expect(materializations).toHaveLength(1);
      expect(materializations[0]?.claimHandles).toContain(producerClaim?.handle);
    }
  }

  expect(producerClaims.filter((claim) => producedProductHandles.includes(claim.objectHandle)))
    .toHaveLength(producedProductHandles.length);
}

function sourcePathForAddress(
  runtime: SemanticRuntime,
  addressHandle: Parameters<SemanticRuntime['workspace']['store']['readAddress']>[0] | null,
): string | null {
  if (addressHandle == null) {
    return null;
  }
  const address = runtime.workspace.store.readAddress(addressHandle);
  if (!(address instanceof SourceSpanAddress)) {
    return null;
  }
  const file = runtime.workspace.store.readAddress(address.fileHandle);
  return file instanceof SourceFileAddress ? file.path.replace(/\\/g, '/') : null;
}

function resolverKeyName(slot: ContainerResolverSlot): string | null {
  return slot.resolver instanceof Resolver ? slot.resolver._key.localName : null;
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
  const sourceNode = fixture.typeSystem.readEvaluatedNode(site.sourceNode);
  const keyExpression = sourceNode?.arguments[0] ?? null;
  if (sourceNode == null || keyExpression == null) {
    throw new Error(`Expected exact evaluator carriers for ${name}.`);
  }
  const source = fixture.evaluation.sources.find((candidate) =>
    isEvaluatedProjectSource(candidate) && candidate.sourceFile === sourceNode.getSourceFile()
  );
  if (source == null || !isEvaluatedProjectSource(source)) {
    throw new Error(`Expected an evaluated source for ${name}.`);
  }
  const invocation = source.evaluation.invocations.find((candidate) => candidate.node === sourceNode);
  if (invocation == null) {
    throw new Error(`Expected an invocation occurrence for ${name}.`);
  }
  return session.activateInvocationArgument(
    requestor,
    keyExpression,
    invocation,
    sourceNode,
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

function diContainerSiteRecognitionKeys(
  sites: readonly DiContainerApiCallSite[],
): readonly string[] {
  return sites.map((site) => [
    site.sourcePath,
    site.start,
    site.end,
    site.methodKind,
    site.keyExpressionText,
    site.receiverText,
  ].join(':'));
}

function diResolveSiteRecognitionKeys(
  sites: ReturnType<typeof readDiResolveCallSites>,
): readonly string[] {
  return sites.map((site) => [
    site.sourcePath,
    site.start,
    site.end,
    site.keyExpressionText,
    site.enclosingClassName,
    site.enclosingMemberName,
  ].join(':'));
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

function activationSeamKey(
  seam: DiProviderActivationResult['openSeams'][number],
): string {
  return [
    seam.seamKind,
    seam.moduleKey,
    seam.node.getStart(seam.sourceFile),
    seam.node.end,
    seam.summary,
  ].join(':');
}

function arrayMarkers(value: EvaluationValue | null): readonly (string | null)[] {
  return arrayValues(value).map(marker);
}
