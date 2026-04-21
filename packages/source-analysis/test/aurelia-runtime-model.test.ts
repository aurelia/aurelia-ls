import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { describe, expect, it } from './test-harness.js';

import {
  ANALYZABILITY_BAND_KINDS,
  AttributePatternDefinition,
  Aurelia,
  AppRoot,
  BindingBehaviorDefinition,
  BindingCommandDefinition,
  CompilerAuthoredAttribute,
  CompilerConsultedWorld,
  ConfigurationRegistrationScanner,
  CONTAINER_STATE_OPEN_SEAM_KINDS,
  CONTAINER_STATE_PROVENANCE_MODES,
  CONTAINER_STATE_SLOT_KINDS,
  CONTAINER_STATE_TOPOLOGY_HOOK_KINDS,
  CURRENT_WORLD_SENSITIVITY_KINDS,
  ContainerStateCandidate,
  ContainerStateClosureBasis,
  ContainerStateMaterializer,
  ContainerWorldRef,
  ContainerStateEntry,
  ContainerStateProvenance,
  ContainerStateQualification,
  ContainerStateSlot,
  CustomAttributeDefinition,
  CustomElementBindableSurface,
  CustomElementDefinition,
  CustomElementDependencyContribution,
  CustomElementIdentity,
  CustomElementPolicy,
  CustomElementTemplateSource,
  DependencyAssociation,
  DependencyAssociationMaterializer,
  DependencyAssociationProvenance,
  DependencyAssociationSource,
  DependencyContributor,
  DependencyRequest,
  DEPENDENCY_RESOLVED_SUBJECT_KINDS,
  DependencySite,
  Export,
  Framework,
  InterfaceKey,
  InterfaceKeyDefaultRegistration,
  KeyRef,
  LookupModifier,
  LookupRequest,
  REGISTRY_FACTORY_METHOD_ROLE_KINDS,
  REGISTRY_OBJECT_ORIGIN_KINDS,
  MATERIALIZATION_TIMING_KINDS,
  LOOKUP_REGIME_KINDS,
  OPEN_RESIDUAL_KINDS,
  ProgramRef,
  Registration,
  RegistrationRef,
  RegistrationIntake,
  RegistrationPayload,
  RegistrationProduction,
  RegistrationResolverBasis,
  RegistrationTransition,
  ResourceReferenceRef,
  ResourceLookupRegime,
  Resolver,
  RESOURCE_LOOKUP_REGIME_KINDS,
  REGISTRATION_INTAKE_KINDS,
  REGISTRATION_PAYLOAD_KINDS,
  REGISTRATION_PRODUCTION_KINDS,
  REGISTRATION_STAGE_KINDS,
  REGISTRATION_STRATEGY_KINDS,
  REGISTRATION_TRANSITION_CLASS_KINDS,
  SourceFileRef,
  SourceNodeRef,
  SourceSpan,
  SymbolRef,
  TemplateCompiler,
  TemplateControllerDefinition,
  TemplateNodeRef,
  TemplateRef,
  TypeScriptWorldConstruction,
  ValueConverterDefinition,
  Workspace,
  type DeclarationExport,
  type ResourceDefinition,
} from '../src/aurelia/index.js';

describe('Aurelia clean-room runtime model', () => {
  it('stores keyed registrations behind handle-based container lookups', () => {
    const workspace = new Workspace('repo', { program: createProgramHandle() });
    const aurelia = workspace.createAurelia();
    const file = createFileHandle(workspace.program());
    const source = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const symbol = createSymbolHandle(file, source, 'IFoo');
    const key = createKeyHandle(symbol, 'IFoo', 'interface-symbol');
    const registration = createRegistrationHandle(source, symbol, aurelia.container.world, key);

    aurelia.register(registration);
    const resolved = aurelia.container.get(key);
    const resolver = aurelia.container.getResolver(key);

    expect(resolved).toBeInstanceOf(Registration);
    expect(resolved?.ref).toEqual(registration);
    expect(resolver).toBeInstanceOf(Resolver);
    expect(resolver?.latest()?.ref).toEqual(registration);
  });

  it('uses Aurelia and AppRoot as the root taxonomy above the container', () => {
    const workspace = new Workspace('repo', { program: createProgramHandle() });
    const aurelia = workspace.createAurelia();
    const file = createFileHandle(workspace.program());
    const source = createNodeHandle(file, 'ClassDeclaration', 10, 60);
    const symbol = createSymbolHandle(file, source, 'FooElement');
    const resourceKey = createKeyHandle(symbol, 'au:resource:custom-element:foo', 'resource');
    const registration = createRegistrationHandle(source, symbol, aurelia.container.world, resourceKey);
    aurelia.register(registration);

    const template = createTemplateHandle(file, symbol);
    const root = aurelia.app({
      host: source,
      component: symbol,
    });
    const compilerWorld = new CompilerConsultedWorld(
      `compiler-world:${root!.handle.id}`,
      root!.handle,
      [
        new CustomElementDefinition(
          'resource:ce:foo',
          symbol,
          new CustomElementIdentity(
            'foo',
            [],
            resourceKey,
          ),
        ),
      ],
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const compiled = compiler.compile(template);
    const context = compiler.createCompilationContext();
    const resolvedResource = compiler.world.resourceResolver.resolveReference(
      new ResourceReferenceRef(
        'resource-ref:foo',
        new TemplateNodeRef(
          'template-node:element',
          template,
          'element',
          [0],
          source,
        ),
        'custom-element',
        resourceKey,
        'foo',
      ),
    );

    expect(root).toBeInstanceOf(AppRoot);
    expect(aurelia).toBeInstanceOf(Aurelia);
    expect(compiled.template).toEqual(template);
    expect(context.findElement('foo')?.name).toBe('foo');
    expect(resolvedResource?.key?.id).toBe(resourceKey.id);
  });

  it('exposes workspace, framework, project, and declaration-world ownership surfaces', () => {
    const workspace = new Workspace('repo', { program: createProgramHandle() });
    const aurelia = workspace.createAurelia();
    const resources = createResourceDefinitions(workspace.program());
    const exportRecord: DeclarationExport = {
      name: 'FooElement',
      symbol: createSymbolHandle(createFileHandle(workspace.program()), createNodeHandle(createFileHandle(workspace.program()), 'ClassDeclaration', 1, 10), 'FooElement'),
      sourceFile: createFileHandle(workspace.program()),
    };
    const framework = new Framework('repo/aurelia', {
      rootDir: 'repo/aurelia',
      packageNames: ['@aurelia/kernel', '@aurelia/runtime-html'],
      exports: [exportRecord],
      resourceSeeds: resources,
    });
    workspace.setFramework(framework);
    const project = workspace.createProject({
      rootDir: 'repo/app',
      name: 'app',
      exports: [exportRecord],
      resourceSeeds: resources,
      aurelia,
      appRoot: aurelia.app({
        host: null,
        component: exportRecord.symbol,
      }),
    });

    expect(workspace.framework()).toBe(framework);
    expect(project.declarationWorld().hasExport('FooElement')).toBe(true);
    expect(framework.readPackageNames()).toEqual(['@aurelia/kernel', '@aurelia/runtime-html']);
    expect(framework.declarationWorld().readExportNames()).toEqual(['FooElement']);
    expect(framework.exports().readAll()[0]).toBeInstanceOf(Export);
    expect(framework.exports().readAll()[0]?.readSurface().exportedName).toBe('FooElement');
    expect(framework.exports().readAll()[0]?.readValueSurface().kind).toBe('class-declaration');
    expect(framework.exports().readAll()[0]?.readValueSurface().requiredChecks).toContain('decorator');
    expect(framework.exports().readAll()[0]?.readClassification().kind).toBe('unknown');
    expect(project.readExports().map((current) => current.name)).toEqual(['FooElement']);
    expect(project.resources().readCandidates()).toHaveLength(0);
    expect(project.resources().readDefinitionCarriers()).toHaveLength(0);
    expect(framework.resources().readCustomElements()).toHaveLength(1);
    expect(project.resources().readValueConverters()).toHaveLength(1);
    expect(project.appRoot()).toBeDefined();
    expect(project.aurelia()).toBe(aurelia);
  });

  it('models DI and registration as layered clean-room primitives instead of one runtime-compressed object', () => {
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const declaration = createNodeHandle(file, 'VariableDeclaration', 300, 340);
    const owner = createSymbolHandle(file, declaration, 'ILogger');
    const key = createKeyHandle(owner, 'ILogger', 'interface-symbol');
    const world = new ContainerWorldRef('world:root', owner, null);

    const interfaceKey = new InterfaceKey(
      'interface-key:ILogger',
      owner,
      key,
      'ILogger',
      new InterfaceKeyDefaultRegistration(
        'singleton',
        declaration,
        key,
        'DI.createInterface may carry a default singleton registration builder.',
      ),
    );

    const dependencyRequest = new DependencyRequest(
      'helper-wrapped',
      declaration,
      'identifier-name',
      'ILogger',
      [
        new LookupModifier('optional'),
      ],
      null,
      'Dependency request wrapped in optional(...) helper sugar.',
    );
    const dependencyContributor = new DependencyContributor(
      new DependencyAssociationSource(
        'annotation-paramtypes',
        'Constructor dependency associated through Aurelia annotation metadata.',
      ),
      dependencyRequest,
      declaration,
      'Selected contributor for the constructor slot.',
    );
    const dependencyAssociation = new DependencyAssociation(
      'dependency:ctor:ILogger',
      new DependencySite(
        'constructor-parameter',
        owner,
        declaration,
        'parameter[0]',
      ),
      dependencyRequest,
      key,
      new DependencyAssociationProvenance(
        'selected',
        dependencyContributor,
        [dependencyContributor],
        'Single explicit contributor on this constructor dependency slot.',
      ),
      'Constructor dependency associated through DI metadata or inject arrays.',
    );

    const payload = new RegistrationPayload(
      'constructable-type',
      declaration,
      owner,
      null,
      'Default singleton registration payload points at the owning constructable.',
    );

    const production = new RegistrationProduction(
      'production:interface-default:ILogger',
      'singleton',
      owner,
      declaration,
      world,
      key,
      payload,
      'Default interface registration production.',
    );

    const intake = new RegistrationIntake(
      'intake:direct-register:ILogger',
      'direct-register-call',
      declaration,
      owner,
      world,
      [production],
      'Container.register intake over the produced registration.',
    );

    const transition = new RegistrationTransition(
      'transition:key-addition:ILogger',
      intake,
      production,
      'explicit-iregistry-register',
      'key-space-addition',
      'Transition from produced registration into container-state consequence.',
    );
    const resolverBasis = new RegistrationResolverBasis(
      'singleton',
      'Resolver/value-form basis for this keyed state.',
    );
    const qualification = new ContainerStateQualification(
      'direct',
      'eager',
      'lookup-regime-sensitive',
      'none',
      'Lookup/topology qualification remains explicit and separate from lineage.',
    );
    const closureBasis = new ContainerStateClosureBasis(
      'statically-closable',
      [],
      'Subject-owned analyzability band carried separately from downstream spend tiers.',
    );

    const entry = new ContainerStateEntry(
      'entry:ILogger',
      world,
      key,
      qualification,
      closureBasis,
      [
        new ContainerStateSlot(
          'slot:ILogger',
          'constructable-activation',
          transition,
          resolverBasis,
          payload,
          owner,
          null,
          null,
          'Entry carries one constructable-backed activation slot.',
        ),
      ],
      new ContainerStateProvenance(
        'selected',
        transition,
        [transition],
        'Single explicit transition on this key.',
      ),
      'Stable container-state entry over the transition set.',
    );

    const lookup = new LookupRequest(
      'lookup:ILogger',
      key,
      'direct',
      ['optional'],
      new ResourceLookupRegime(
        'optional-resource',
        'Resource-semantic lookup can still be layered over a generic lookup request when needed.',
      ),
      true,
    );

    expect(ANALYZABILITY_BAND_KINDS).toContain('statically-closable');
    expect(CONTAINER_STATE_OPEN_SEAM_KINDS).toContain('policy-generated-state-open');
    expect(CONTAINER_STATE_PROVENANCE_MODES).toContain('aggregated');
    expect(CONTAINER_STATE_SLOT_KINDS).toContain('alias-forward');
    expect(CONTAINER_STATE_TOPOLOGY_HOOK_KINDS).toContain('parent-resource-inheritance');
    expect(CURRENT_WORLD_SENSITIVITY_KINDS).toContain('lookup-regime-sensitive');
    expect(LOOKUP_REGIME_KINDS).toContain('resource');
    expect(MATERIALIZATION_TIMING_KINDS).toContain('deferred-to-slot');
    expect(OPEN_RESIDUAL_KINDS).toContain('callback-body-opaque');
    expect(REGISTRATION_PRODUCTION_KINDS).toContain('implementation-register');
    expect(REGISTRATION_INTAKE_KINDS).toContain('static-au-register');
    expect(REGISTRATION_PAYLOAD_KINDS).toContain('alias-target');
    expect(REGISTRATION_STAGE_KINDS).toContain('legacy-static-au-register');
    expect(REGISTRATION_STRATEGY_KINDS).toContain('array-aggregation');
    expect(REGISTRATION_TRANSITION_CLASS_KINDS).toContain('lifecycle-slot-attachment');
    expect(RESOURCE_LOOKUP_REGIME_KINDS).toContain('all-resources');
    expect(interfaceKey.defaultRegistration?.kind).toBe('singleton');
    expect(interfaceKey.defaultRegistration?.source).toBe(declaration);
    expect(dependencyAssociation.source?.kind).toBe('annotation-paramtypes');
    expect(dependencyAssociation.lookupModifiers[0]?.kind).toBe('optional');
    expect(production.payload).toBe(payload);
    expect(intake.productions[0]).toBe(production);
    expect(entry.slots[0]?.transition).toBe(transition);
    expect(entry.slots[0]?.resolverBasis).toBe(resolverBasis);
    expect(entry.qualification).toBe(qualification);
    expect(entry.closureBasis).toBe(closureBasis);
    expect(entry.transitions[0]).toBe(transition);
    expect(lookup.modifiers).toContain('optional');
    expect(lookup.resourceRegime?.kind).toBe('optional-resource');
  });

  it('materializes ordinary DI associations from source-explicit constructor and field surfaces', () => {
    const fixture = createDependencyFixture();
    const byName = new Map(fixture.exports.map((current) => [current.name, current]));
    const materializer = new DependencyAssociationMaterializer();

    const staticInjected = materializer.materialize(byName.get('StaticInjectedService')!.symbol!);
    const decorated = materializer.materialize(byName.get('DecoratedInjectedService')!.symbol!);
    const fieldInjected = materializer.materialize(byName.get('FieldInjectedService')!.symbol!);
    const resolved = materializer.materialize(byName.get('ResolveBackedService')!.symbol!);
    const overlaid = materializer.materialize(byName.get('OverlaidMetadataService')!.symbol!);
    const typedOnly = materializer.materialize(byName.get('TypedOnlyService')!.symbol!);
    const inherited = materializer.materialize(byName.get('InheritedService')!.symbol!);

    expect(staticInjected.associations.map((current) => `${current.site.location}:${current.request.candidateName}:${current.lookupModifiers[0]?.kind ?? 'none'}`)).toEqual([
      'parameter[0]:IPlatform:none',
      'parameter[1]:ILogger:optional',
      'parameter[2]:ConsoleSink:new-instance-of',
    ]);
    expect(staticInjected.associations.every((current) => current.source?.kind === 'static-inject')).toBe(true);

    expect(decorated.associations.map((current) => `${current.site.kind}:${current.site.location}:${current.request.candidateName}:${current.lookupModifiers[0]?.kind ?? 'none'}`)).toEqual([
      'constructor-parameter:parameter[0]:ILogger:optional',
      'constructor-parameter:parameter[1]:ISink:all',
      'resolve-call:parameter[0]:ILogger:optional',
      'resolve-call:parameter[1]:ISink:all',
    ]);
    expect(decorated.associations[0]?.provenance?.mode).toBe('selected');
    expect(decorated.associations[0]?.source?.kind).toBe('annotation-paramtypes');
    expect(decorated.associations[2]?.source?.kind).toBe('resolve-call');

    expect(fieldInjected.associations.map((current) => `${current.site.location}:${current.request.candidateName}:${current.lookupModifiers[0]?.kind ?? 'none'}`)).toEqual([
      'field:loggerFactory:ILogger:lazy',
    ]);
    expect(fieldInjected.associations[0]?.site.kind).toBe('instance-field');
    expect(fieldInjected.associations[0]?.source?.kind).toBe('annotation-paramtypes');

    expect(overlaid.associations.map((current) => `${current.site.kind}:${current.site.location}:${current.request.candidateName}:${current.lookupModifiers[0]?.kind ?? 'none'}`)).toEqual([
      'constructor-parameter:parameter[0]:IPlatform:none',
    ]);
    expect(overlaid.associations[0]?.provenance?.mode).toBe('overlay');
    expect(overlaid.associations[0]?.source?.kind).toBe('static-inject');
    expect(overlaid.associations[0]?.provenance?.contributors.map((current) => current.source.kind).sort()).toEqual([
      'annotation-paramtypes',
      'static-inject',
    ]);

    expect(resolved.associations.map((current) => `${current.site.location}:${current.request.candidateName}:${current.lookupModifiers[0]?.kind ?? 'none'}:${current.request.resourceLookupRegime?.kind ?? 'generic'}`)).toEqual([
      'field:currentLogger:ILogger:optional:generic',
      'field:renderLocal:IRenderer:none:resource',
      'field:tag:log-tag:none:generic',
      'field:tuple[0]:ILogger:none:generic',
      'field:tuple[1]:ISink:all:generic',
      'field:tuple[2]:ConsoleSink:new-instance-for-scope:generic',
      'parameter[0]:IPlatform:none:generic',
      'parameter[1]:ILogger:optional:generic',
    ]);
    expect(resolved.associations.every((current) => current.source?.kind === 'resolve-call')).toBe(true);

    expect(typedOnly.associations).toHaveLength(0);
    expect(typedOnly.openSeams.some((current) => current.kind === 'design-paramtypes-open')).toBe(true);
    expect(inherited.openSeams.some((current) => current.kind === 'prototype-fallback-open')).toBe(true);
    expect(materializer.inspectState().parsedFileCount).toBeGreaterThan(0);
    expect(DEPENDENCY_RESOLVED_SUBJECT_KINDS).toContain('interface-symbol');
    expect(staticInjected.associations[0]?.resolvedSubject?.kind).toBe('interface-symbol');
    expect(staticInjected.associations[0]?.resolvedSubject?.interfaceKey?.friendlyName).toBe('IPlatform');
    expect(staticInjected.associations[1]?.resolvedSubject?.kind).toBe('interface-symbol');
    expect(staticInjected.associations[2]?.resolvedSubject?.kind).toBe('constructable');
    expect(decorated.associations[1]?.resolvedSubject?.interfaceKey?.defaultRegistration?.kind).toBe('cached-callback');
    expect(resolved.associations.find((current) => current.site.location === 'field:renderLocal')?.resolvedSubject?.kind).toBe('interface-symbol');
    expect(resolved.associations.find((current) => current.site.location === 'field:tag')?.resolvedSubject?.kind).toBe('property');
  });

  it('materializes keyed container-state entries into slots with DI-backed constructable activation', () => {
    const fixture = createDependencyFixture();
    const byName = new Map(fixture.exports.map((current) => [current.name, current]));
    const staticInjected = byName.get('StaticInjectedService')?.symbol;
    const overlaid = byName.get('OverlaidMetadataService')?.symbol;
    if (staticInjected == null || overlaid == null || staticInjected.declaration == null || overlaid.declaration == null) {
      throw new Error('Expected dependency fixture class exports to exist.');
    }

    const world = new ContainerWorldRef('world:di-root', staticInjected, null);
    const serviceKey = createKeyHandle(staticInjected, 'StaticInjectedService', 'constructable');
    const aliasKey = createKeyHandle(staticInjected, 'StaticInjectedAlias', 'property');
    const tagKey = createKeyHandle(staticInjected, 'log-tag', 'property');

    const singletonPayload = new RegistrationPayload(
      'constructable-type',
      staticInjected.declaration,
      staticInjected,
      null,
      'Singleton activation over a constructable class.',
    );
    const singletonProduction = new RegistrationProduction(
      'production:static-injected-singleton',
      'singleton',
      staticInjected,
      staticInjected.declaration,
      world,
      serviceKey,
      singletonPayload,
      'Explicit singleton registration for the DI-backed class.',
    );
    const singletonIntake = new RegistrationIntake(
      'intake:static-injected-singleton',
      'direct-register-call',
      staticInjected.declaration,
      staticInjected,
      world,
      [singletonProduction],
      'Direct container.register(...) intake for the singleton constructable.',
    );
    const singletonTransition = new RegistrationTransition(
      'transition:static-injected-singleton',
      singletonIntake,
      singletonProduction,
      'explicit-iregistry-register',
      'key-space-addition',
      'Singleton constructable activation enters keyed container state.',
    );
    const singletonCandidate = new ContainerStateCandidate(
      'candidate:static-injected-singleton',
      world,
      serviceKey,
      singletonTransition,
      new RegistrationResolverBasis('singleton'),
      new ContainerStateQualification(
        'direct',
        'eager',
        'lookup-regime-sensitive',
        'none',
      ),
      new ContainerStateClosureBasis(
        'statically-closable',
        [],
      ),
      'Qualified state candidate for the singleton constructable.',
    );

    const aliasPayload = new RegistrationPayload(
      'alias-target',
      staticInjected.declaration,
      null,
      serviceKey,
      'Alias forwards to the constructable key.',
    );
    const aliasProduction = new RegistrationProduction(
      'production:static-injected-alias',
      'alias',
      staticInjected,
      staticInjected.declaration,
      world,
      aliasKey,
      aliasPayload,
      'Alias production over the same constructable activation.',
    );
    const aliasTransition = new RegistrationTransition(
      'transition:static-injected-alias',
      new RegistrationIntake(
        'intake:static-injected-alias',
        'direct-register-call',
        staticInjected.declaration,
        staticInjected,
        world,
        [aliasProduction],
        'Direct intake for alias forwarding.',
      ),
      aliasProduction,
      'explicit-iregistry-register',
      'alias-linkage',
      'Alias linkage enters keyed state separately from the base constructable key.',
    );
    const aliasCandidate = new ContainerStateCandidate(
      'candidate:static-injected-alias',
      world,
      aliasKey,
      aliasTransition,
      new RegistrationResolverBasis('alias'),
      new ContainerStateQualification(
        'direct',
        'eager',
        'lookup-regime-sensitive',
        'none',
      ),
      new ContainerStateClosureBasis(
        'statically-closable',
        [],
      ),
      'Qualified state candidate for alias forwarding.',
    );

    const firstTagProduction = new RegistrationProduction(
      'production:first-log-tag',
      'instance',
      overlaid,
      overlaid.declaration,
      world,
      tagKey,
      new RegistrationPayload(
        'instance-value',
        overlaid.declaration,
        null,
        null,
        'First tag instance value.',
      ),
      'First log-tag instance production.',
    );
    const secondTagProduction = new RegistrationProduction(
      'production:second-log-tag',
      'instance',
      staticInjected,
      staticInjected.declaration,
      world,
      tagKey,
      new RegistrationPayload(
        'instance-value',
        staticInjected.declaration,
        null,
        null,
        'Second tag instance value.',
      ),
      'Second log-tag instance production.',
    );
    const firstTagTransition = new RegistrationTransition(
      'transition:first-log-tag',
      new RegistrationIntake(
        'intake:first-log-tag',
        'direct-register-call',
        overlaid.declaration,
        overlaid,
        world,
        [firstTagProduction],
        'First explicit instance intake on the same property key.',
      ),
      firstTagProduction,
      'explicit-iregistry-register',
      'key-space-addition',
      'First instance slot for log-tag.',
    );
    const secondTagCandidate = new ContainerStateQualification(
      'direct',
      'eager',
      'lookup-regime-sensitive',
      'none',
    );
    const firstTagCandidate = new ContainerStateCandidate(
      'candidate:first-log-tag',
      world,
      tagKey,
      firstTagTransition,
      new RegistrationResolverBasis('instance'),
      secondTagCandidate,
      new ContainerStateClosureBasis(
        'statically-closable',
        [],
      ),
      'First explicit instance candidate on the same property key.',
    );
    const secondTagTransition = new RegistrationTransition(
      'transition:second-log-tag',
      new RegistrationIntake(
        'intake:second-log-tag',
        'direct-register-call',
        staticInjected.declaration,
        staticInjected,
        world,
        [secondTagProduction],
        'Second explicit instance intake on the same property key.',
      ),
      secondTagProduction,
      'explicit-iregistry-register',
      'key-space-addition',
      'Second instance slot for log-tag.',
    );
    const secondTagStateCandidate = new ContainerStateCandidate(
      'candidate:second-log-tag',
      world,
      tagKey,
      secondTagTransition,
      new RegistrationResolverBasis('instance'),
      secondTagCandidate,
      new ContainerStateClosureBasis(
        'statically-closable',
        [],
      ),
      'Second explicit instance candidate on the same property key.',
    );

    const materializer = new ContainerStateMaterializer();
    const materialization = materializer.materialize([
      singletonCandidate,
      aliasCandidate,
      firstTagCandidate,
      secondTagStateCandidate,
    ]);

    const serviceEntry = materialization.entries.find((current) => current.key.id === serviceKey.id);
    const aliasEntry = materialization.entries.find((current) => current.key.id === aliasKey.id);
    const tagEntry = materialization.entries.find((current) => current.key.id === tagKey.id);

    expect(serviceEntry?.slots[0]?.kind).toBe('constructable-activation');
    expect(serviceEntry?.qualification?.lookupRegime).toBe('direct');
    expect(serviceEntry?.closureBasis?.analyzabilityBand).toBe('statically-closable');
    expect(serviceEntry?.slots[0]?.dependencyMaterialization?.associations.map((current) => `${current.site.location}:${current.request.candidateName}`)).toEqual([
      'parameter[0]:IPlatform',
      'parameter[1]:ILogger',
      'parameter[2]:ConsoleSink',
    ]);
    expect(serviceEntry?.provenance?.mode).toBe('selected');
    expect(serviceEntry?.transitions).toEqual([singletonTransition]);

    expect(aliasEntry?.slots[0]?.kind).toBe('alias-forward');
    expect(aliasEntry?.slots[0]?.targetKey).toEqual(serviceKey);

    expect(tagEntry?.slots.map((current) => current.kind)).toEqual([
      'instance-value',
      'instance-value',
    ]);
    expect(tagEntry?.provenance?.mode).toBe('aggregated');
    expect(tagEntry?.provenance?.selectedTransition).toBe(secondTagTransition);

    expect(materialization.openSeams.some((current) => current.kind === 'policy-generated-state-open')).toBe(true);
    expect(materializer.inspectState().dependencyMaterializerState.parsedFileCount).toBeGreaterThan(0);
  });

  it('classifies bundle arrays and registry configuration exports from syntax-only variable surfaces', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
    });

    const bundles = framework.configurations().readBundleArrays();
    const registries = framework.configurations().readRegistryObjects();

    expect(REGISTRY_OBJECT_ORIGIN_KINDS).toContain('factory-return');
    expect(REGISTRY_FACTORY_METHOD_ROLE_KINDS).toContain('configuration-customizer');
    expect(bundles.map((current) => current.sourceExport.name)).toEqual([
      'DefaultComponents',
      'DefaultResources',
      'DefaultBindingSyntax',
      'DefaultBindingLanguage',
      'DefaultRenderers',
      'DialogRegistrations',
    ]);
    expect(bundles.find((current) => current.sourceExport.name === 'DefaultResources')?.elementNames).toEqual([
      'DebounceBindingBehavior',
      'OneTimeBindingBehavior',
      'ToViewBindingBehavior',
      'AuCompose',
      'Show',
      'If',
    ]);
    expect(bundles.find((current) => current.sourceExport.name === 'globalAttributeNames')).toBeUndefined();

    const standard = registries.find((current) => current.sourceExport.name === 'StandardConfiguration');
    const router = registries.find((current) => current.sourceExport.name === 'RouterConfiguration');
    const style = registries.find((current) => current.sourceExport.name === 'StyleConfiguration');
    const logger = registries.find((current) => current.sourceExport.name === 'LoggerConfiguration');
    const dialog = registries.find((current) => current.sourceExport.name === 'DialogConfigurationStandard');

    expect(standard?.originKind).toBe('factory-return');
    expect(standard?.registerMethod?.bundleSpreads.map((current) => current.referenceName)).toEqual([
      'DefaultComponents',
      'DefaultResources',
      'DefaultBindingSyntax',
      'DefaultBindingLanguage',
      'DefaultRenderers',
    ]);
    expect(standard?.factoryMethods.find((current) => current.name === 'customize')?.role).toBe('configuration-customizer');

    expect(router?.originKind).toBe('object-literal');
    expect(router?.registerMethod?.helperCalls.map((current) => current.calleeName)).toContain('configure');
    expect(router?.factoryMethods.find((current) => current.name === 'customize')?.returnsRegistry).toBe(true);

    expect(style?.registerMethod).toBeNull();
    expect(style?.factoryMethods.find((current) => current.name === 'shadowDOM')?.returnsRegistry).toBe(true);
    expect(style?.factoryMethods.find((current) => current.name === 'shadowDOM')?.helperCalls.map((current) => current.calleeName)).toContain('AppTask.creating');

    expect(logger?.originKind).toBe('wrapped-object-literal');
    expect(logger?.factoryMethods.find((current) => current.name === 'create')?.returnsRegistry).toBe(true);

    expect(dialog?.originKind).toBe('factory-return');
    expect(dialog?.registerMethod?.helperCalls.map((current) => current.calleeName)).toEqual([
      'ctn.register',
      'singletonRegistration',
      'AppTask.creating',
      'instanceRegistration',
    ]);
  });

  it('translates direct configuration helper calls into first registration productions', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
    });
    const scanner = new ConfigurationRegistrationScanner({
      configurations: framework.configurations(),
    });

    const productions = scanner.scanAll();
    const standard = productions.filter((current) => current.ownerConfiguration.sourceExport.name === 'StandardConfiguration');
    const style = productions.filter((current) => current.ownerConfiguration.sourceExport.name === 'StyleConfiguration');
    const dialog = productions.filter((current) => current.ownerConfiguration.sourceExport.name === 'DialogConfigurationStandard');
    const logger = productions.filter((current) => current.ownerConfiguration.sourceExport.name === 'LoggerConfiguration');
    const state = productions.filter((current) => current.ownerConfiguration.sourceExport.name === 'StateDefaultConfiguration');

    expect(standard.some((current) => current.production.kind === 'instance')).toBe(true);
    expect(standard.some((current) => current.apiIngress.api?.id === 'registration.instance')).toBe(true);
    expect(style.some((current) => current.production.kind === 'lifecycle-slot-task')).toBe(true);
    expect(style.some((current) => current.apiIngress.api?.id === 'app-task.creating')).toBe(true);
    expect(style.some((current) => current.production.kind === 'instance')).toBe(false);
    expect(dialog.some((current) => current.production.kind === 'lifecycle-slot-task')).toBe(true);
    expect(dialog.some((current) => current.production.kind === 'instance')).toBe(true);
    expect(dialog.some((current) => current.production.kind === 'singleton')).toBe(true);
    expect(dialog.some((current) => current.apiIngress.api?.id === 'registration.singleton')).toBe(true);
    expect(logger).toHaveLength(0);
    expect(state).toHaveLength(0);
  });

  it('materializes a concrete contribution slice for StandardConfiguration', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const contribution = framework.configurationContributions().findByExportName('StandardConfiguration')[0];
    expect(contribution).toBeDefined();
    if (contribution == null) {
      throw new Error('Expected StandardConfiguration contribution to exist.');
    }
    const subjectByName = new Map(
      contribution.admittedSubjects.map((current) => [current.referenceName, current]),
    );

    expect(contribution.directRegisterArguments.map((current) => current.referenceName)).toEqual([
      'ExpressionParser',
    ]);
    expect(contribution.bundleExpansions.map((current) => current.bundle?.sourceExport.name ?? null)).toEqual([
      'DefaultComponents',
      'DefaultResources',
      'DefaultBindingSyntax',
      'DefaultBindingLanguage',
      'DefaultRenderers',
    ]);
    expect(contribution.directProductions.some((current) => current.apiIngress.api?.id === 'registration.instance')).toBe(true);
    expect(subjectByName.get('ExpressionParser')?.carrier).toBe('service');
    expect(subjectByName.get('ExpressionParser')?.policy).toBe('service-container');
    expect(subjectByName.get('RuntimeTemplateCompilerImplementation')?.carrier).toBe('registry');
    expect(subjectByName.get('RuntimeTemplateCompilerImplementation')?.policy).toBe('registry-registration');
    expect(subjectByName.get('DebounceBindingBehavior')?.carrier).toBe('resource-definition');
    expect(subjectByName.get('DebounceBindingBehavior')?.policy).toBe('template-local-or-root');
    expect(subjectByName.get('DebounceBindingBehavior')?.declarationKind).toBe('binding-behavior');
    expect(subjectByName.get('DotSeparatedAttributePattern')?.carrier).toBe('registrable-metadata-registry');
    expect(subjectByName.get('DotSeparatedAttributePattern')?.policy).toBe('compiler-root-only');
    expect(subjectByName.get('DotSeparatedAttributePattern')?.declarationKind).toBe('attribute-pattern');
    expect(subjectByName.get('DefaultBindingCommand')?.carrier).toBe('resource-definition');
    expect(subjectByName.get('DefaultBindingCommand')?.policy).toBe('compiler-root-only');
    expect(subjectByName.get('DefaultBindingCommand')?.declarationKind).toBe('binding-command');
    expect(subjectByName.get('PropertyBindingRenderer')?.carrier).toBe('renderer');
    expect(subjectByName.get('PropertyBindingRenderer')?.policy).toBe('instruction-renderer');
    const bindingCommandCapabilities = contribution.compilerCapabilities
      .filter((current) => current.kind === 'binding-command')
      .map((current) => current.name)
      .sort();
    const attributePatternCapabilities = contribution.compilerCapabilities
      .filter((current) => current.kind === 'attribute-pattern')
      .map((current) => current.pattern)
      .sort();
    expect(bindingCommandCapabilities).toEqual(['bind', 'for', 'trigger']);
    expect(attributePatternCapabilities).toEqual(['PART.PART', 'PART.trigger:PART']);
    expect(contribution.openSeams.some((current) => current.includes('Returned registry interiors'))).toBe(true);
  });

  it('constructs a consulted TypeScript world from StandardConfiguration contributions', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const world = framework.worldConstructions().findByConfigurationExportName('StandardConfiguration')[0];
    expect(world).toBeInstanceOf(TypeScriptWorldConstruction);
    if (world == null) {
      throw new Error('Expected StandardConfiguration world construction to exist.');
    }

    expect(world.findResourceDefinition('binding-behavior', 'debounce')?.kind).toBe('binding-behavior');
    expect(world.findResourceDefinition('binding-command', 'bind')?.kind).toBe('binding-command');
    expect(world.compilerWorld.resourceResolver.findElement('au-compose')?.name).toBe('au-compose');
    expect(world.compilerWorld.resourceResolver.findAttribute('show')?.kind).toBe('custom-attribute');
    expect(world.compilerWorld.resourceResolver.findAttribute('if')?.kind).toBe('template-controller');
    expect(world.compilerWorld.bindingCommands.get('bind')?.name).toBe('bind');
    const bindSyntax = world.compilerWorld.attributeParser.parse('value.bind', 'message');
    const triggerSyntax = world.compilerWorld.attributeParser.parse('click.trigger:delegate', 'doThing');
    const fallbackSyntax = world.compilerWorld.attributeParser.parse('plain-attr', 'value');
    const showAdmission = world.compilerWorld.resourceResolver.readAdmission(
      world.compilerWorld.resourceResolver.findAttribute('show')!,
    );
    expect(bindSyntax.status).toBe('selected');
    expect(bindSyntax.syntax?.command).toBe('bind');
    expect(bindSyntax.syntax?.provenance?.kind).toBe('pattern-handler-return');
    expect(bindSyntax.candidates).toHaveLength(1);
    expect(bindSyntax.candidates[0]?.match?.definition.pattern).toBe('PART.PART');
    expect(bindSyntax.candidates[0]?.match?.admission?.ownerContributions[0]?.configuration.sourceExport.name).toBe('StandardConfiguration');
    expect(bindSyntax.candidates[0]?.match?.admission?.admittedSubjects[0]?.referenceName).toBe('DotSeparatedAttributePattern');
    expect(triggerSyntax.status).toBe('selected');
    expect(triggerSyntax.syntax?.command).toBe('trigger');
    expect(triggerSyntax.syntax?.parts).toEqual(['click', 'trigger', 'delegate']);
    expect(fallbackSyntax.status).toBe('fallback');
    expect(fallbackSyntax.syntax?.target).toBe('plain-attr');
    expect(fallbackSyntax.syntax?.provenance?.kind).toBe('fallback-no-pattern');
    expect(showAdmission?.ownerContributions[0]?.configuration.sourceExport.name).toBe('StandardConfiguration');
    expect(showAdmission?.admittedSubjects[0]?.referenceName).toBe('Show');
    expect(world.compilerWorld.services.has('ExpressionParser')).toBe(true);
    expect(world.readCompilerCapabilitiesByKind('binding-command').map((current) => current.name)).toEqual([
      'bind',
      'for',
      'trigger',
    ]);
    expect(world.containerStateEntries.some((current) => current.key.debugName === 'ExpressionParser')).toBe(true);
    expect(world.containerStateEntries.find((current) => current.key.debugName === 'ExpressionParser')?.slots[0]?.kind).toBe('constructable-activation');
    expect(world.compilerWorld.inspectState().resourceCount).toBeGreaterThan(0);
    expect(world.openSeams.some((current) => current.kind === 'production-state-open')).toBe(true);
    expect(world.openSeams.some((current) => current.kind === 'resource-registration-state-open')).toBe(true);
    expect(world.openSeams.some((current) => current.kind === 'world-placement-open')).toBe(true);
    expect(framework.worldConstructions().inspectState().allCached).toBe(true);
  });

  it('surfaces template compiler hooks shallowly from direct registry call witnesses', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const contribution = framework.configurationContributions().findByExportName('CompilerConfiguration')[0];
    expect(contribution).toBeDefined();
    if (contribution == null) {
      throw new Error('Expected CompilerConfiguration contribution to exist.');
    }

    const hookCapabilities = contribution.compilerCapabilities.filter((current) => current.kind === 'template-compiler-hook');
    expect(hookCapabilities).toHaveLength(1);
    expect(hookCapabilities[0]?.hookName).toBe('CompilingHook');

    const world = framework.worldConstructions().findByConfigurationExportName('CompilerConfiguration')[0];
    expect(world?.compilerWorld.templateCompilerHooks.findAll().map((current) => current.hookName)).toEqual([
      'CompilingHook',
    ]);
  });

  it('creates a compiler-shaped compilation context from a consulted world', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const world = framework.worldConstructions().findByConfigurationExportName('StandardConfiguration')[0];
    expect(world).toBeDefined();
    if (world == null) {
      throw new Error('Expected StandardConfiguration world construction to exist.');
    }

    const compiler = new TemplateCompiler(world.compilerWorld);
    const context = compiler.createCompilationContext();
    const child = context.createChild();

    expect(context.findElement('au-compose')?.name).toBe('au-compose');
    expect(context.findAttribute('show')?.kind).toBe('custom-attribute');
    expect(context.findTemplateController('if')?.kind).toBe('template-controller');
    expect(context.getCommand('for')?.name).toBe('for');
    const parsed = context.parseAttribute('value.bind', 'message');
    expect(parsed.status).toBe('selected');
    expect(parsed.syntax?.target).toBe('value');
    expect(parsed.candidates[0]?.match?.definition.pattern).toBe('PART.PART');
    expect(context.readTemplateCompilerHooks()).toEqual([]);
    expect(context.hasService('ExpressionParser')).toBe(true);
    expect(child.world).toBe(world.compilerWorld);
    expect(child.root).toBe(context);
  });

  it('routes authored attributes through the first JIT-shaped classification lanes', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const world = framework.worldConstructions().findByConfigurationExportName('StandardConfiguration')[0];
    expect(world).toBeDefined();
    if (world == null) {
      throw new Error('Expected StandardConfiguration world construction to exist.');
    }

    const compiler = new TemplateCompiler(world.compilerWorld);
    const classification = compiler.classifyElementAttributes('div', [
      new CompilerAuthoredAttribute('authored:containerless', 'containerless', ''),
      new CompilerAuthoredAttribute('authored:spread', '...$attrs', ''),
      new CompilerAuthoredAttribute('authored:show', 'show.bind', 'isVisible'),
      new CompilerAuthoredAttribute('authored:if', 'if.bind', 'ready'),
      new CompilerAuthoredAttribute('authored:click', 'click.trigger:delegate', 'doThing'),
    ]);

    expect(classification.receiverElement).toBeNull();
    expect(classification.hasContainerless).toBe(true);
    expect(classification.captured).toEqual([]);
    expect(classification.items.map((current) => current.lane)).toEqual([
      'special-attribute',
      'spread-transferred-bindings',
      'custom-attribute',
      'template-controller',
      'plain-attribute',
    ]);
    expect(classification.items[2]?.attributeResource?.kind).toBe('custom-attribute');
    expect(classification.items[3]?.attributeResource?.kind).toBe('template-controller');
    expect(classification.items[4]?.bindingCommand?.name).toBe('trigger');
    expect(classification.items[2]?.provenance?.attributeResourceAdmission?.admittedSubjects[0]?.referenceName).toBe('Show');
    expect(classification.items[3]?.provenance?.attributeResourceAdmission?.admittedSubjects[0]?.referenceName).toBe('If');
    expect(classification.items[4]?.provenance?.bindingCommandAdmission?.admittedSubjects[0]?.referenceName).toBe('TriggerBindingCommand');
    expect(classification.items[2]?.openSeams.map((current) => current.kind)).toContain('custom-attribute-bindables-open');
    expect(classification.items[3]?.openSeams.map((current) => current.kind)).toContain('template-controller-lowering-open');
    expect(classification.items[4]?.openSeams.map((current) => current.kind)).toContain('binding-command-lowering-open');
  });

  it('shows capture and bindable pressure on a capturing custom-element receiver', () => {
    const configFixture = createConfigurationFixture();
    const configFramework = new Framework(configFixture.rootDir, {
      rootDir: configFixture.rootDir,
      exports: configFixture.exports,
      resourceSeeds: configFixture.resourceSeeds,
    });
    const standardWorld = configFramework.worldConstructions().findByConfigurationExportName('StandardConfiguration')[0];
    expect(standardWorld).toBeDefined();
    if (standardWorld == null) {
      throw new Error('Expected StandardConfiguration world construction to exist.');
    }

    const customElementFixture = createCustomElementFixture();
    const customElementFramework = new Framework(customElementFixture.rootDir, {
      rootDir: customElementFixture.rootDir,
      exports: customElementFixture.exports,
      resourceSeeds: customElementFixture.resourceSeeds,
    });
    const fancyCard = customElementFramework.resources().readCustomElements().find((current) => current.name === 'fancy-card');
    expect(fancyCard).toBeDefined();
    if (fancyCard == null) {
      throw new Error('Expected FancyCard custom element to exist.');
    }

    const compilerWorld = new CompilerConsultedWorld(
      `compiler-world:${standardWorld.world.id}:fancy-card`,
      standardWorld.world,
      [...standardWorld.visibleResources, fancyCard],
      standardWorld.compilerWorld.resourceResolver.readAdmissions(),
      standardWorld.compilerCapabilities,
      standardWorld.containerStateEntries,
      standardWorld.containerStateOpenSeams,
      standardWorld.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const classification = compiler.classifyElementAttributes('fancy-card', [
      new CompilerAuthoredAttribute('authored:title', 'title.bind', 'cardTitle'),
      new CompilerAuthoredAttribute('authored:show', 'show.bind', 'isVisible'),
      new CompilerAuthoredAttribute('authored:if', 'if.bind', 'ready'),
    ]);

    expect(classification.receiverElement?.name).toBe('fancy-card');
    expect(classification.receiverElementAdmission).toBeNull();
    expect(classification.captured.map((current) => current.authored.rawName)).toEqual(['show.bind']);
    expect(classification.items.map((current) => current.lane)).toEqual([
      'custom-element-bindable',
      'captured-attribute',
      'template-controller',
    ]);
    expect(classification.items[0]?.customElementBindable?.name).toBe('title');
    expect(classification.items[0]?.provenance?.receiverElementAdmission).toBeNull();
    expect(classification.items[1]?.attributeResource?.name).toBe('show');
    expect(classification.items[1]?.provenance?.attributeResourceAdmission?.ownerContributions[0]?.configuration.sourceExport.name).toBe('StandardConfiguration');
    expect(classification.items[2]?.attributeResource?.kind).toBe('template-controller');
  });

  it('decomposes custom element support bundles without pretending instructions are declaration ingress', () => {
    const fixture = createCustomElementFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const byName = new Map(
      framework.resources().readCustomElements().map((current) => [current.name, current]),
    );
    const fancy = byName.get('fancy-card');
    const precompiled = byName.get('precompiled-card');
    const decorated = byName.get('decorated-card');
    const layeredDeps = byName.get('layered-deps-card');

    expect(fancy).toBeDefined();
    expect(precompiled).toBeDefined();
    expect(decorated).toBeDefined();
    expect(layeredDeps).toBeDefined();
    if (fancy == null || precompiled == null || decorated == null || layeredDeps == null) {
      throw new Error('Expected custom element fixtures to materialize.');
    }
    const fancyTitleBindable = fancy.bindableSurface.entries.find((current) => current.name === 'title');
    const decoratedTitleBindable = decorated.bindableSurface.entries.find((current) => current.name === 'title');

    expect(fancy.identity.provenance.map((current) => `${current.field}:${current.mode}`)).toEqual([
      'name:selected',
      'aliases:merged',
    ]);
    expect(fancy.aliases).toEqual(['f-card', 'legacy-card']);
    expect(fancy.bindableSurface.entries.map((current) => current.name)).toEqual(['title', 'count']);
    expect(fancyTitleBindable?.attribute).toBe('card-title');
    expect(fancyTitleBindable?.callback).toBe('titleUpdated');
    expect(fancyTitleBindable?.mode).toBe('twoWay');
    expect(fancyTitleBindable?.nullable).toBe(false);
    expect(fancyTitleBindable?.witness?.field).toBe('name');
    expect(fancyTitleBindable?.witness?.carrier).toBe('static-au-property');
    expect(fancyTitleBindable?.readProvenance('mode')?.selected?.carrier).toBe('static-au-property');
    expect(fancy.bindableSurface.readProvenance()?.mode).toBe('merged');
    expect(fancy.dependencies.entries.map((current) => current.referenceName)).toEqual(['DepOne', 'DepTwo']);
    expect(fancy.dependencies.entries[0]?.witness.field).toBe('dependencies');
    expect(fancy.dependencies.readProvenance()?.mode).toBe('merged');
    expect(fancy.policy.captureKind).toBe('boolean');
    expect(fancy.policy.containerless).toBe(true);
    expect(fancy.policy.shadowMode).toBe('open');
    expect(fancy.policy.readProvenance('capture')?.selected?.carrier).toBe('static-au-property');
    expect(fancy.templateSource.kind).toBe('inline-string');
    expect(fancy.templateSource.provenance?.field).toBe('template');

    expect(precompiled.policy.processContentKind).toBe('string-key');
    expect(precompiled.policy.readProvenance('process-content')?.selected?.carrier).toBe('static-au-property');
    expect(precompiled.templateSource.kind).toBe('none');

    expect(decorated.name).toBe('decorated-card');
    expect(decorated.identity.readProvenance('name')?.selected?.carrier).toBe('annotation-decorator');
    expect(decorated.policy.containerless).toBe(true);
    expect(decorated.policy.readProvenance('containerless')?.selected?.carrier).toBe('annotation-decorator');
    expect(decorated.policy.shadowMode).toBe('open');
    expect(decorated.policy.readProvenance('shadow-options')?.selected?.carrier).toBe('annotation-decorator');
    expect(decorated.bindableSurface.entries.map((current) => current.name)).toContain('title');
    expect(decoratedTitleBindable?.attribute).toBe('static-title');
    expect(decoratedTitleBindable?.mode).toBe('oneTime');
    expect(decoratedTitleBindable?.witness?.carrier).toBe('bindable-decorator');
    expect(decoratedTitleBindable?.readProvenance('attribute')?.mode).toBe('selected');
    expect(decoratedTitleBindable?.readProvenance('attribute')?.selected?.carrier).toBe('static-own-property');
    expect(decoratedTitleBindable?.readProvenance('attribute')?.contributors.map((current) => current.carrier).sort()).toEqual([
      'bindable-decorator',
      'static-own-property',
    ]);
    expect(decorated.policy.processContentKind).toBe('function-hook');
    expect(decorated.policy.readProvenance('process-content')?.selected?.carrier).toBe('annotation-decorator');
    expect(decorated.templateSource.provenance?.selected?.carrier).toBe('annotation-decorator');

    expect(layeredDeps.dependencies.sources[0]?.kind).toBe('merged-array');
    expect(layeredDeps.dependencies.entries.map((current) => current.referenceName)).toEqual(['sharedDeps', 'moreDeps']);
    expect(layeredDeps.dependencies.entries[0]?.linkSeedKind).toBe('identifier-name');
  });
});

function createProgramHandle(): ProgramRef {
  return new ProgramRef(
    'program:test',
    'repo',
    'tsconfig.json',
  );
}

function createFileHandle(program: ProgramRef): SourceFileRef {
  return new SourceFileRef(
    'file:src/example.ts',
    program,
    'src/example.ts',
  );
}

function createNodeHandle(
  file: SourceFileRef,
  nodeKind: string,
  start: number,
  end: number,
): SourceNodeRef {
  return new SourceNodeRef(
    `node:${nodeKind}:${start}-${end}`,
    file,
    nodeKind,
    new SourceSpan(start, end),
  );
}

function createSymbolHandle(
  file: SourceFileRef,
  declaration: SourceNodeRef,
  name: string,
): SymbolRef {
  return new SymbolRef(
    `symbol:${name}`,
    file,
    name,
    [name],
    declaration,
  );
}

function createKeyHandle(
  owner: SymbolRef,
  debugName: string,
  keyKind: KeyRef['keyKind'],
): KeyRef {
  return new KeyRef(
    `key:${keyKind}:${debugName}`,
    keyKind,
    owner,
    debugName,
  );
}

function createRegistrationHandle(
  source: SourceNodeRef,
  owner: SymbolRef,
  world: ContainerWorldRef,
  key: KeyRef,
): RegistrationRef {
  return new RegistrationRef(
    `registration:${key.id}`,
    owner,
    source,
    world,
    key,
  );
}

function createTemplateHandle(
  file: SourceFileRef,
  owner: SymbolRef,
): TemplateRef {
  return new TemplateRef(
    'template:foo',
    owner,
    file,
    new SourceSpan(0, 20),
  );
}

function createResourceDefinitions(
  program: ProgramRef,
): readonly ResourceDefinition[] {
  const file = createFileHandle(program);
  const elementNode = createNodeHandle(file, 'ClassDeclaration', 20, 50);
  const attributeNode = createNodeHandle(file, 'ClassDeclaration', 60, 90);
  const controllerNode = createNodeHandle(file, 'ClassDeclaration', 100, 130);
  const converterNode = createNodeHandle(file, 'ClassDeclaration', 140, 170);
  const behaviorNode = createNodeHandle(file, 'ClassDeclaration', 180, 210);
  const commandNode = createNodeHandle(file, 'ClassDeclaration', 220, 250);
  const patternNode = createNodeHandle(file, 'ClassDeclaration', 260, 290);

  const elementSymbol = createSymbolHandle(file, elementNode, 'FooElement');
  const attributeSymbol = createSymbolHandle(file, attributeNode, 'BarAttribute');
  const controllerSymbol = createSymbolHandle(file, controllerNode, 'If');
  const converterSymbol = createSymbolHandle(file, converterNode, 'DateFormatValueConverter');
  const behaviorSymbol = createSymbolHandle(file, behaviorNode, 'ThrottleBindingBehavior');
  const commandSymbol = createSymbolHandle(file, commandNode, 'TriggerBindingCommand');
  const patternSymbol = createSymbolHandle(file, patternNode, 'AtPrefixedTriggerPattern');

  return [
    new CustomElementDefinition(
      'resource:ce:foo',
      elementSymbol,
      new CustomElementIdentity(
        'foo',
        ['foo-element'],
        createKeyHandle(elementSymbol, 'au:resource:custom-element:foo', 'resource'),
      ),
      new CustomElementPolicy(),
      new CustomElementBindableSurface(),
      new CustomElementDependencyContribution(),
      new CustomElementTemplateSource('open', null),
    ),
    new CustomAttributeDefinition(
      'resource:ca:bar',
      attributeSymbol,
      createKeyHandle(attributeSymbol, 'au:resource:custom-attribute:bar', 'resource'),
      'bar',
      ['bar-attribute'],
      'toView',
      false,
    ),
    new TemplateControllerDefinition(
      'resource:tc:if',
      controllerSymbol,
      createKeyHandle(controllerSymbol, 'au:resource:template-controller:if', 'resource'),
      'if',
      [],
    ),
    new ValueConverterDefinition(
      'resource:vc:date-format',
      converterSymbol,
      createKeyHandle(converterSymbol, 'au:resource:value-converter:dateFormat', 'resource'),
      'dateFormat',
      [],
    ),
    new BindingBehaviorDefinition(
      'resource:bb:throttle',
      behaviorSymbol,
      createKeyHandle(behaviorSymbol, 'au:resource:binding-behavior:throttle', 'resource'),
      'throttle',
      [],
    ),
    new BindingCommandDefinition(
      'resource:bc:trigger',
      commandSymbol,
      createKeyHandle(commandSymbol, 'au:resource:binding-command:trigger', 'resource'),
      'trigger',
      ['t'],
    ),
    new AttributePatternDefinition(
      'resource:ap:@trigger',
      patternSymbol,
      createKeyHandle(patternSymbol, 'au:resource:attribute-pattern:@trigger', 'resource'),
      '@trigger',
      ['trigger'],
    ),
  ];
}

function createConfigurationFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly resourceSeeds: readonly ResourceDefinition[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-config-'));
  const filePath = path.join(rootDir, 'configuration-fixture.ts');
  const utilitiesPath = path.join(rootDir, 'utilities-di.ts');
  fs.writeFileSync(
    utilitiesPath,
    `
import { Registration } from '@aurelia/kernel';

export const singletonRegistration = Registration.singleton;
export const instanceRegistration = Registration.instance;
`,
    'utf8',
  );
  const sourceText = `
import { AppTask } from '@aurelia/runtime-html';
import { singletonRegistration, instanceRegistration } from './utilities-di';

declare const noop: unknown;
declare const IContainer: unknown;
declare function toLookup<T>(value: T): T;
declare function configure(...args: unknown[]): unknown;
declare function renderer<T>(value: T): T;
declare const TemplateCompilerHooks: { define(value: unknown): unknown };
declare const DialogService: unknown;
declare class AttrSyntax {
  constructor(
    rawName: string,
    rawValue: string,
    target: string,
    command: string | null,
    parts?: readonly string[] | null,
  );
}

export class ExpressionParser {}
export const RuntimeTemplateCompilerImplementation = {
  register(container: unknown) {
    return container;
  },
};
export class DirtyChecker {}
export class NodeObserverLocator {}
export class DebounceBindingBehavior {}
export class OneTimeBindingBehavior {}
export class ToViewBindingBehavior {}
export class AuCompose {}
export class Show {}
export class If {}
export class DotSeparatedAttributePattern {
  public 'PART.PART'(rawName: string, rawValue: string, parts: readonly string[]) {
    return new AttrSyntax(rawName, rawValue, parts[0], parts[1]);
  }

  public 'PART.PART.PART'(rawName: string, rawValue: string, parts: readonly string[]) {
    return new AttrSyntax(rawName, rawValue, \`\${parts[0]}.\${parts[1]}\`, parts[2]);
  }
}
export class EventAttributePattern {
  public 'PART.trigger:PART'(rawName: string, rawValue: string, parts: readonly string[]) {
    return new AttrSyntax(rawName, rawValue, parts[0], 'trigger', parts);
  }
}
export class DefaultBindingCommand {}
export class ForBindingCommand {}
export class TriggerBindingCommand {}
export const PropertyBindingRenderer = renderer(class PropertyBindingRenderer {});
export const IteratorBindingRenderer = renderer(class IteratorBindingRenderer {});
export const DefaultComponents = [
  RuntimeTemplateCompilerImplementation,
  DirtyChecker,
  NodeObserverLocator,
];

export const DefaultResources = [
  DebounceBindingBehavior,
  OneTimeBindingBehavior,
  ToViewBindingBehavior,
  AuCompose,
  Show,
  If,
];

export const DefaultBindingSyntax = [
  DotSeparatedAttributePattern,
  EventAttributePattern,
];

export const DefaultBindingLanguage = [
  DefaultBindingCommand,
  ForBindingCommand,
  TriggerBindingCommand,
];

export const DefaultRenderers = [
  PropertyBindingRenderer,
  IteratorBindingRenderer,
];

export const DialogRegistrations = [
  DialogService,
];

export const globalAttributeNames = [
  'class',
  'style',
];

function createConfiguration(optionsProvider: unknown) {
  return {
    optionsProvider,
        register(container: { register(...args: unknown[]): unknown }) {
          return container.register(
            ExpressionParser,
            instanceRegistration('ICoercionConfiguration', {}),
            ...DefaultComponents,
            ...DefaultResources,
            ...DefaultBindingSyntax,
        ...DefaultBindingLanguage,
        ...DefaultRenderers,
      );
    },
    customize(cb?: unknown) {
      return createConfiguration(cb ?? optionsProvider);
    },
  };
}

export const StandardConfiguration = createConfiguration(noop);

export const RouterConfiguration = {
  register(container: unknown) {
    return configure(container);
  },
  customize(options?: unknown) {
    return {
      register(container: unknown) {
        return configure(container, options);
      },
    };
  },
};

export const StyleConfiguration = {
  shadowDOM(config: unknown) {
    return AppTask.creating(IContainer, container => {
      return config ?? container;
    });
  },
};

export const LoggerConfiguration = toLookup({
  create() {
        return toLookup({
          register(container: { register(...args: unknown[]): unknown }) {
            return container.register(
              instanceRegistration('ILogConfig', { level: 'warn' }),
              singletonRegistration('ISink', class Sink {}),
            );
          },
        });
  },
});

export const CompilerConfiguration = {
  register(container: { register(...args: unknown[]): unknown }) {
    return container.register(
      TemplateCompilerHooks.define(class CompilingHook {}),
    );
  },
};

function createDialogConfiguration(cb: unknown) {
  return {
    register: (ctn: { register(...args: unknown[]): unknown }) => ctn.register(
      singletonRegistration('IDialogGlobalSettings', class Settings {}),
      AppTask.creating(() => cb),
      instanceRegistration('IDialogChildSettings', new Map()),
    ),
    customize(nextCb?: unknown) {
      return createDialogConfiguration(nextCb ?? cb);
    },
  };
}

export const DialogConfigurationStandard = createDialogConfiguration(noop);

export const StateDefaultConfiguration = {
  init() {
    const createStoreRegistration = () => {
      return AppTask.creating(IContainer, c => {
        return c.register(
          instanceRegistration('Store', {}),
        );
      });
    };

    return {
      register(c: { register(...args: unknown[]): unknown }) {
        return c.register(createStoreRegistration());
      },
    };
  },
};
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:configuration-fixture',
    rootDir,
    null,
  );
  const file = new SourceFileRef(
    `file:${filePath}`,
    program,
    filePath,
  );
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const exports: DeclarationExport[] = [];
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        const declarationRef = new SourceNodeRef(
          `node:${declaration.name.text}:${declaration.getStart()}-${declaration.end}`,
          file,
          'VariableDeclaration',
          new SourceSpan(declaration.getStart(), declaration.end),
        );
        const symbolRef = new SymbolRef(
          `symbol:${declaration.name.text}`,
          file,
          declaration.name.text,
          [declaration.name.text],
          declarationRef,
        );
        exports.push({
          name: declaration.name.text,
          symbol: symbolRef,
          sourceFile: file,
        });
      }
      continue;
    }

    if (ts.isClassDeclaration(statement) && statement.name != null) {
      const declarationRef = new SourceNodeRef(
        `node:${statement.name.text}:${statement.getStart()}-${statement.end}`,
        file,
        'ClassDeclaration',
        new SourceSpan(statement.getStart(), statement.end),
      );
      const symbolRef = new SymbolRef(
        `symbol:${statement.name.text}`,
        file,
        statement.name.text,
        [statement.name.text],
        declarationRef,
      );
      exports.push({
        name: statement.name.text,
        symbol: symbolRef,
        sourceFile: file,
      });
    }
  }

  return {
    exports,
    resourceSeeds: createConfigurationFixtureResources(exports),
    rootDir,
  };
}

function createCustomElementFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly resourceSeeds: readonly ResourceDefinition[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-ce-'));
  const filePath = path.join(rootDir, 'custom-element-fixture.ts');
  const sourceText = `
declare const noop: unknown;
declare function customElement(definition: unknown): ClassDecorator;
declare function useShadowDOM(options?: unknown): ClassDecorator;
declare function containerless(target: unknown, context?: unknown): void;
declare function bindable(config?: unknown): any;
declare function processContent(hook?: unknown): any;

export class DepOne {}
export class DepTwo {}
const sharedDeps = [DepOne];
const moreDeps = [DepTwo];

export class FancyCard {
  static aliases = ['legacy-card'];
  static $au = {
    type: 'custom-element',
    name: 'fancy-card',
    aliases: ['f-card'],
    bindables: [{ name: 'title', attribute: 'card-title', callback: 'titleUpdated', mode: 'twoWay', nullable: false }, 'count'],
    dependencies: [DepOne, DepTwo],
    capture: true,
    containerless: true,
    shadowOptions: { mode: 'open' },
    template: '<div>\${title}</div>',
  };
}

export class PrecompiledCard {
  static $au = {
    type: 'custom-element',
    name: 'precompiled-card',
    processContent: 'transformContent',
    instructions: [[noop]],
  };
}

export class LayeredDepsCard {
  static $au = {
    type: 'custom-element',
    name: 'layered-deps-card',
  };

  static dependencies = [...sharedDeps, ...moreDeps];
}

@customElement({ name: 'decorated-card', aliases: ['d-card'], template: '<div></div>' })
@useShadowDOM()
@containerless
export class DecoratedCard {
  static bindables = {
    title: {
      attribute: 'static-title',
      mode: 'oneTime',
    },
  };

  @bindable({ mode: 'twoWay', attribute: 'decorated-title' })
  title = '';

  @processContent()
  compileTemplate() {}
}
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:custom-element-fixture',
    rootDir,
    null,
  );
  const file = new SourceFileRef(
    `file:${filePath}`,
    program,
    filePath,
  );
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const exports: DeclarationExport[] = [];
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement) || !ts.isClassDeclaration(statement) || statement.name == null) {
      continue;
    }

    const declarationRef = new SourceNodeRef(
      `node:${statement.name.text}:${statement.getStart()}-${statement.end}`,
      file,
      'ClassDeclaration',
      new SourceSpan(statement.getStart(), statement.end),
    );
    const symbolRef = new SymbolRef(
      `symbol:${statement.name.text}`,
      file,
      statement.name.text,
      [statement.name.text],
      declarationRef,
    );
    exports.push({
      name: statement.name.text,
      symbol: symbolRef,
      sourceFile: file,
    });
  }

  const byName = new Map(exports.map((current) => [current.name, current]));
  const fancy = byName.get('FancyCard');
  const precompiled = byName.get('PrecompiledCard');
  const layeredDeps = byName.get('LayeredDepsCard');
  const decorated = byName.get('DecoratedCard');
  if (fancy == null || precompiled == null || layeredDeps == null || decorated == null) {
    throw new Error('Expected CE fixture exports to exist.');
  }

  return {
    exports,
    rootDir,
    resourceSeeds: [
      new CustomElementDefinition(
        'resource:ce:fancy-card',
        fancy.symbol!,
        new CustomElementIdentity(
          'fancy-card',
          [],
          createKeyHandle(fancy.symbol!, 'au:resource:custom-element:fancy-card', 'resource'),
        ),
      ),
      new CustomElementDefinition(
        'resource:ce:precompiled-card',
        precompiled.symbol!,
        new CustomElementIdentity(
          'precompiled-card',
          [],
          createKeyHandle(precompiled.symbol!, 'au:resource:custom-element:precompiled-card', 'resource'),
        ),
      ),
      new CustomElementDefinition(
        'resource:ce:layered-deps-card',
        layeredDeps.symbol!,
        new CustomElementIdentity(
          'layered-deps-card',
          [],
          createKeyHandle(layeredDeps.symbol!, 'au:resource:custom-element:layered-deps-card', 'resource'),
        ),
      ),
      new CustomElementDefinition(
        'resource:ce:decorated-card',
        decorated.symbol!,
        new CustomElementIdentity(
          'decorated-card',
          [],
          createKeyHandle(decorated.symbol!, 'au:resource:custom-element:decorated-card', 'resource'),
        ),
      ),
    ],
  };
}

function hasExportModifier(
  statement: ts.Node,
): boolean {
  const modifiers = ts.canHaveModifiers(statement)
    ? ts.getModifiers(statement)
    : void 0;
  return modifiers?.some((current: ts.ModifierLike) => current.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function createDependencyFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-di-'));
  const filePath = path.join(rootDir, 'dependency-fixture.ts');
  const sourceText = `
declare const DI: {
  createInterface<T>(name?: string, configure?: (builder: {
    instance(value: unknown): unknown;
    singleton(value: unknown): unknown;
    transient(value: unknown): unknown;
    callback(value: unknown): unknown;
    cachedCallback(value: unknown): unknown;
    aliasTo(value: unknown): unknown;
  }) => unknown): unknown;
};
declare function inject(...deps: unknown[]): any;
declare function optional<T>(value: T): T;
declare function lazy<T>(value: T): T;
declare function all<T>(value: T): T;
declare function resource<T>(value: T): T;
declare function newInstanceOf<T>(value: T): T;
declare function newInstanceForScope<T>(value: T): T;
declare function resolve<T>(...keys: unknown[]): T;

export const IPlatform = DI.createInterface<object>('IPlatform');
export const ILogger = DI.createInterface<object>('ILogger');
export const ISink = DI.createInterface<object>('ISink', builder => builder.cachedCallback(ConsoleSink));
export const IRenderer = DI.createInterface<object>('IRenderer');

export class ConsoleSink {}

export class StaticInjectedService {
  static inject = [IPlatform, optional(ILogger), newInstanceOf(ConsoleSink)];
}

@inject(optional(ILogger), all(ISink))
export class DecoratedInjectedService {
  constructor(
    logger = resolve(optional(ILogger)),
    sinks = resolve(all(ISink)),
  ) {}
}

export class FieldInjectedService {
  @inject(lazy(ILogger))
  loggerFactory: unknown;
}

export class ResolveBackedService {
  currentLogger = resolve(optional(ILogger));
  renderLocal = resolve(resource(IRenderer));
  tuple = resolve(ILogger, all(ISink), newInstanceForScope(ConsoleSink));
  tag = resolve('log-tag');

  constructor(
    platform = resolve(IPlatform),
    logger = resolve(optional(ILogger)),
  ) {}
}

@inject(optional(ILogger))
export class OverlaidMetadataService {
  static inject = [IPlatform];
}

export class TypedOnlyService {
  constructor(readonly sink: ConsoleSink) {}
}

export class BaseInjectedService {
  static inject = [IPlatform];
}

export class InheritedService extends BaseInjectedService {}
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:dependency-fixture',
    rootDir,
    null,
  );
  const file = new SourceFileRef(
    `file:${filePath}`,
    program,
    filePath,
  );
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const exports: DeclarationExport[] = [];
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement) || !ts.isClassDeclaration(statement) || statement.name == null) {
      continue;
    }

    const declarationRef = new SourceNodeRef(
      `node:${statement.name.text}:${statement.getStart()}-${statement.end}`,
      file,
      'ClassDeclaration',
      new SourceSpan(statement.getStart(), statement.end),
    );
    const symbolRef = new SymbolRef(
      `symbol:${statement.name.text}`,
      file,
      statement.name.text,
      [statement.name.text],
      declarationRef,
    );
    exports.push({
      name: statement.name.text,
      symbol: symbolRef,
      sourceFile: file,
    });
  }

  return {
    exports,
    rootDir,
  };
}

function createConfigurationFixtureResources(
  exports: readonly DeclarationExport[],
): readonly ResourceDefinition[] {
  const byName = new Map(exports.map((current) => [current.name, current]));
  const debounce = byName.get('DebounceBindingBehavior');
  const oneTime = byName.get('OneTimeBindingBehavior');
  const toView = byName.get('ToViewBindingBehavior');
  const auCompose = byName.get('AuCompose');
  const show = byName.get('Show');
  const ifTc = byName.get('If');
  const dotSeparated = byName.get('DotSeparatedAttributePattern');
  const eventPattern = byName.get('EventAttributePattern');
  const defaultCommand = byName.get('DefaultBindingCommand');
  const forCommand = byName.get('ForBindingCommand');
  const triggerCommand = byName.get('TriggerBindingCommand');

  return [
    new CustomElementDefinition(
      'resource:ce:au-compose',
      auCompose!.symbol!,
      new CustomElementIdentity(
        'au-compose',
        [],
        createKeyHandle(auCompose!.symbol!, 'au:resource:custom-element:au-compose', 'resource'),
      ),
    ),
    new CustomAttributeDefinition(
      'resource:ca:show',
      show!.symbol!,
      createKeyHandle(show!.symbol!, 'au:resource:custom-attribute:show', 'resource'),
      'show',
      [],
      null,
      false,
    ),
    new TemplateControllerDefinition(
      'resource:tc:if',
      ifTc!.symbol!,
      createKeyHandle(ifTc!.symbol!, 'au:resource:template-controller:if', 'resource'),
      'if',
      [],
    ),
    new BindingBehaviorDefinition(
      'resource:bb:debounce',
      debounce!.symbol!,
      createKeyHandle(debounce!.symbol!, 'au:resource:binding-behavior:debounce', 'resource'),
      'debounce',
      [],
    ),
    new BindingBehaviorDefinition(
      'resource:bb:one-time',
      oneTime!.symbol!,
      createKeyHandle(oneTime!.symbol!, 'au:resource:binding-behavior:oneTime', 'resource'),
      'oneTime',
      [],
    ),
    new BindingBehaviorDefinition(
      'resource:bb:to-view',
      toView!.symbol!,
      createKeyHandle(toView!.symbol!, 'au:resource:binding-behavior:toView', 'resource'),
      'toView',
      [],
    ),
    new AttributePatternDefinition(
      'resource:ap:dot-separated',
      dotSeparated!.symbol!,
      createKeyHandle(dotSeparated!.symbol!, 'au:resource:attribute-pattern:dot-separated', 'resource'),
      'PART.PART',
      ['.'],
    ),
    new AttributePatternDefinition(
      'resource:ap:event',
      eventPattern!.symbol!,
      createKeyHandle(eventPattern!.symbol!, 'au:resource:attribute-pattern:event', 'resource'),
      'PART.trigger:PART',
      ['.', ':'],
    ),
    new BindingCommandDefinition(
      'resource:bc:default',
      defaultCommand!.symbol!,
      createKeyHandle(defaultCommand!.symbol!, 'au:resource:binding-command:default', 'resource'),
      'bind',
      [],
    ),
    new BindingCommandDefinition(
      'resource:bc:for',
      forCommand!.symbol!,
      createKeyHandle(forCommand!.symbol!, 'au:resource:binding-command:for', 'resource'),
      'for',
      [],
    ),
    new BindingCommandDefinition(
      'resource:bc:trigger',
      triggerCommand!.symbol!,
      createKeyHandle(triggerCommand!.symbol!, 'au:resource:binding-command:trigger', 'resource'),
      'trigger',
      [],
    ),
  ];
}
