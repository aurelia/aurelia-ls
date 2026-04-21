import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

import { describe, expect, it } from './test-harness.js';

import {
  ANALYZABILITY_BAND_KINDS,
  CompiledElementNode,
  CompiledTextNode,
  AttributePatternDefinition,
  Aurelia,
  AppRoot,
  AuthoredElementNode,
  AuthoredTextNode,
  AttributeController,
  BindingBehaviorDefinition,
  BindingCommandDefinition,
  CompilerAuthoredAttribute,
  CompilerChildWorldFormation,
  CompilerConsultedWorld,
  ControllerOwnedTemplateBranch,
  CurrentTargetPreparation,
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
  CustomAttributePreparation,
  CustomAttributeRenderer,
  CustomAttributeDefinition,
  BindableEntry,
  BindableSurface,
  CustomAttributeIdentity,
  CustomAttributePolicy,
  CustomElementPreparation,
  CustomElementRenderer,
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
  ElementController,
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
  PassiveInstructionRenderer,
  OPEN_RESIDUAL_KINDS,
  PreparedResourceHydrationBundle,
  ProgramRef,
  Registration,
  RegistrationRef,
  RegistrationIntake,
  RegistrationPayload,
  RegistrationProduction,
  RegistrationResolverBasis,
  RegistrationTransition,
  Rendering,
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
  TemplateControllerRenderer,
  TemplateControllerPreparation,
  TemplateControllerDefinition,
  TemplateNodeRef,
  TemplateRef,
  TypeScriptWorldConstruction,
  ValueConverterDefinition,
  ViewFactory,
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
    expect(context.getCommand('bind')?.buildBasis.valueHandling.kind).toBe('compile-parse');
    expect(context.getCommand('bind')?.buildBasis.valueHandling.parserEntrySeed).toBe('etIsProperty');
    expect(context.getCommand('trigger')?.buildBasis.ignoreAttr).toBe(true);
    expect(context.planBindingCommandValueParse(context.getCommand('for')!, 'item of items').status).toBe('planned');
    const parsed = context.parseAttribute('value.bind', 'message');
    expect(parsed.status).toBe('selected');
    expect(parsed.syntax?.target).toBe('value');
    expect(parsed.candidates[0]?.match?.definition.pattern).toBe('PART.PART');
    expect(context.readTemplateCompilerHooks()).toEqual([]);
    expect(context.hasService('ExpressionParser')).toBe(true);
    expect(child.world).toBe(world.compilerWorld);
    expect(child.root).toBe(context);
  });

  it('materializes a runtime-shaped rendering surface with builtin renderer instances', () => {
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

    expect(world.rendering).toBeInstanceOf(Rendering);
    const renderers = world.rendering.readAll();
    expect(renderers.length).toBeGreaterThanOrEqual(10);
    expect(renderers.every((current) =>
      typeof current.referenceName === 'string'
      && current.admission != null,
    )).toBe(true);

    const tc = world.rendering.findByInstructionKind('hydrate-template-controller');
    const ce = world.rendering.findByInstructionKind('hydrate-element');
    const ca = world.rendering.findByInstructionKind('hydrate-attribute');
    const listener = world.rendering.findByInstructionKind('listener-binding');
    const spread = world.rendering.findByInstructionKind('spread-value-binding');

    expect(tc).toBeInstanceOf(TemplateControllerRenderer);
    expect(tc?.referenceName).toBe('TemplateControllerRenderer');
    expect(tc?.admission.ownerContribution.configuration.sourceExport.name).toBe('StandardConfiguration');

    expect(ce).toBeInstanceOf(CustomElementRenderer);
    expect(ce?.referenceName).toBe('CustomElementRenderer');
    expect(ca).toBeInstanceOf(CustomAttributeRenderer);
    expect(ca?.referenceName).toBe('CustomAttributeRenderer');
    expect(listener).toBeInstanceOf(PassiveInstructionRenderer);
    expect(listener?.referenceName).toBe('ListenerBindingRenderer');
    expect(spread).toBeInstanceOf(PassiveInstructionRenderer);
    expect(spread?.referenceName).toBe('SpreadValueRenderer');

    expect(world.compilerWorld.inspectState().rendererCount).toBe(renderers.length);
    expect(world.rendering.openSeams.map((current) => current.kind)).toContain('resource-renderer-preparation-open');
  });

  it('prepares custom-attribute renderer contexts over lowered custom-attribute uses', () => {
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
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'ShowHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<div show.bind="isVisible"></div>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    const preparations = compiler.prepareCustomAttributes(parentController, root);
    expect(preparations).toHaveLength(1);
    const preparation = preparations[0];
    expect(preparation).toBeInstanceOf(CustomAttributePreparation);
    expect(preparation?.resource.name).toBe('show');
    expect(preparation?.controller).toBeInstanceOf(AttributeController);
    expect(preparation?.controller.parent).toBe(parentController);
    expect(preparation?.controller.world.world.parentId).toBe(parentController.world.world.id);
    expect(preparation?.invocation.worldFormation.requestedMode).toBe('child-world');
    expect(preparation?.invocation.openSeams.map((current) => current.kind)).toContain('published-di-surface-open');
    expect(preparation?.lowering.assignments[0]?.bindingCommandName).toBe('bind');
    expect(preparation?.openSeams.map((current) => current.kind)).toContain('prop-render-open');
  });

  it('prepares custom-element renderer contexts over element receivers', () => {
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
      `compiler-world:${standardWorld.world.id}:fancy-card-prep`,
      standardWorld.world,
      [...standardWorld.visibleResources, fancyCard],
      standardWorld.compilerWorld.renderers,
      standardWorld.compilerWorld.resourceResolver.readAdmissions(),
      standardWorld.compilerCapabilities,
      standardWorld.containerStateEntries,
      standardWorld.containerStateOpenSeams,
      standardWorld.compilerWorld.rendering.openSeams,
      standardWorld.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'CardHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<fancy-card title.bind="cardTitle"></fancy-card>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    const preparation = compiler.prepareCustomElement(parentController, root);
    expect(preparation).toBeInstanceOf(CustomElementPreparation);
    if (!(preparation instanceof CustomElementPreparation)) {
      throw new Error('Expected custom-element preparation to be created.');
    }

    expect(preparation.resource.name).toBe('fancy-card');
    expect(preparation.controller).toBeInstanceOf(ElementController);
    expect(preparation.controller.parent).toBe(parentController);
    expect(preparation.controller.world.world.parentId).toBe(parentController.world.world.id);
    expect(preparation.invocation.worldFormation.requestedMode).toBe('child-world');
    expect(preparation.renderLocation).not.toBeNull();
    expect(preparation.invocation.openSeams.map((current) => current.kind)).toContain('projection-slots-open');
    expect(preparation.openSeams.map((current) => current.kind)).toContain('projection-open');
  });

  it('prepares one runtime-shaped current target and exposes a CE internal-template branch when no TC owns the element', () => {
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
      `compiler-world:${standardWorld.world.id}:fancy-card-aggregate`,
      standardWorld.world,
      [...standardWorld.visibleResources, fancyCard],
      standardWorld.compilerWorld.renderers,
      standardWorld.compilerWorld.resourceResolver.readAdmissions(),
      standardWorld.compilerCapabilities,
      standardWorld.containerStateEntries,
      standardWorld.containerStateOpenSeams,
      standardWorld.compilerWorld.rendering.openSeams,
      standardWorld.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'CardAggregateHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<fancy-card title.bind="cardTitle"></fancy-card>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    const bundle = compiler.prepareInstructionBundle(root);
    expect(bundle).toBeInstanceOf(PreparedResourceHydrationBundle);
    expect(bundle.mode).toBe('resource-row');
    expect(bundle.elementInstruction?.resource.name).toBe('fancy-card');
    expect(bundle.attributeInstructions).toEqual([]);
    const preparation = compiler.prepareCurrentTarget(parentController, root);
    expect(preparation).toBeInstanceOf(CurrentTargetPreparation);
    expect(preparation.mode).toBe('resource-current-target');
    expect(preparation.instructionBundle.mode).toBe(bundle.mode);
    expect(preparation.instructionBundle.elementInstruction?.resource.name).toBe('fancy-card');
    expect(preparation.customElement).toBeInstanceOf(CustomElementPreparation);
    expect(preparation.templateController).toBeNull();
    expect(preparation.customAttributes).toEqual([]);
    expect(preparation.templateBranches).toHaveLength(1);

    const branch = preparation.templateBranches[0];
    expect(branch).toBeInstanceOf(ControllerOwnedTemplateBranch);
    expect(branch?.kind).toBe('custom-element-internal-template');
    expect(branch?.ownerResource.name).toBe('fancy-card');
    expect(branch?.realizationPolicy).toBe('immediate-controller-hydration');
    expect(branch?.templateSource?.kind).toBe('inline-string');
    expect(branch?.rawTemplateText).toBe('<div>${title}</div>');
    expect(branch?.templateRef?.file.path).toContain('custom-element-fixture.ts');
    expect(branch?.openSeams).toEqual([]);
  });

  it('uses template-controller current-target preparation and defers CE/CA work into the recursive TC branch', () => {
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
    const decoratedCard = customElementFramework.resources().readCustomElements().find((current) => current.name === 'decorated-card');
    expect(decoratedCard).toBeDefined();
    if (decoratedCard == null) {
      throw new Error('Expected DecoratedCard custom element to exist.');
    }

    const compilerWorld = new CompilerConsultedWorld(
      `compiler-world:${standardWorld.world.id}:tc-current-target`,
      standardWorld.world,
      [...standardWorld.visibleResources, decoratedCard],
      standardWorld.compilerWorld.renderers,
      standardWorld.compilerWorld.resourceResolver.readAdmissions(),
      standardWorld.compilerCapabilities,
      standardWorld.containerStateEntries,
      standardWorld.containerStateOpenSeams,
      standardWorld.compilerWorld.rendering.openSeams,
      standardWorld.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'TemplateControllerAggregateHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<decorated-card if.bind="ready" show.bind="isVisible"></decorated-card>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    const bundle = compiler.prepareInstructionBundle(root);
    expect(bundle).toBeInstanceOf(PreparedResourceHydrationBundle);
    expect(bundle.mode).toBe('template-controller-row');
    expect(bundle.templateControllerInstruction?.resource.name).toBe('if');
    expect(bundle.attributeInstructions).toEqual([]);
    expect(bundle.elementInstruction).toBeNull();
    const preparation = compiler.prepareCurrentTarget(parentController, root);
    expect(preparation.mode).toBe('template-controller-current-target');
    expect(preparation.instructionBundle.mode).toBe(bundle.mode);
    expect(preparation.instructionBundle.templateControllerInstruction?.resource.name).toBe('if');
    expect(preparation.templateController).toBeInstanceOf(TemplateControllerPreparation);
    expect(preparation.customElement).toBeNull();
    expect(preparation.customAttributes).toEqual([]);
    expect(preparation.openSeams.map((current) => current.kind)).toContain('nested-resource-preparation-deferred');
    expect(preparation.templateBranches).toHaveLength(1);

    const branch = preparation.templateBranches[0];
    expect(branch).toBeInstanceOf(ControllerOwnedTemplateBranch);
    expect(branch?.kind).toBe('template-controller-view');
    expect(branch?.ownerResource.name).toBe('if');
    expect(branch?.realizationPolicy).toBe('deferred-view-factory-realization');
    expect(branch?.hasAnonymousDefinition()).toBe(true);
    expect(branch?.anonymousDefinition?.structuralCarrier?.classification.receiverElement?.name).toBe('decorated-card');
    expect(branch?.anonymousDefinition?.structuralCarrier?.classification.items.map((current) => current.lane)).toEqual([
      'template-controller',
      'custom-attribute',
    ]);
    expect(branch?.anonymousDefinition?.structuralCarrier?.classification.items[1]?.authored.rawName).toBe('show.bind');
  });

  it('materializes compiler-facing CA/TC bindables info with explicit and synthesized primary bindables', () => {
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

    const program = createProgramHandle();
    const file = createFileHandle(program);
    const tooltipNode = createNodeHandle(file, 'ClassDeclaration', 560, 600);
    const tooltipSymbol = createSymbolHandle(file, tooltipNode, 'Tooltip');
    const tooltip = new CustomAttributeDefinition(
      'resource:ca:tooltip',
      tooltipSymbol,
      new CustomAttributeIdentity(
        'tooltip',
        [],
        createKeyHandle(tooltipSymbol, 'au:resource:custom-attribute:tooltip', 'resource'),
      ),
      new BindableSurface(),
      new CustomAttributePolicy(),
    );
    const compilerWorld = new CompilerConsultedWorld(
      `${world.compilerWorld.id}:bindables-info`,
      world.compilerWorld.world,
      [...world.visibleResources, tooltip],
      world.compilerWorld.renderers,
      world.compilerWorld.resourceResolver.readAdmissions(),
      world.compilerCapabilities,
      world.containerStateEntries,
      world.containerStateOpenSeams,
      world.compilerWorld.rendering.openSeams,
      world.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const context = compiler.createCompilationContext();

    const show = context.findAttribute('show');
    expect(show).toBeDefined();
    if (show == null || show.kind !== 'custom-attribute') {
      throw new Error('Expected show custom attribute to exist.');
    }

    const showBindables = context.readAttributeBindablesInfo(show);
    expect(showBindables.primary?.name).toBe('value');
    expect(showBindables.primary?.origin).toBe('authored-entry');
    expect(showBindables.primaryProvenance?.mode).toBe('selected-authored');
    expect(showBindables.readByAttr('show-delay')?.name).toBe('delay');

    const tooltipDef = context.findAttribute('tooltip');
    expect(tooltipDef).toBeDefined();
    if (tooltipDef == null || tooltipDef.kind !== 'custom-attribute') {
      throw new Error('Expected tooltip custom attribute to exist.');
    }

    const tooltipBindables = context.readAttributeBindablesInfo(tooltipDef);
    expect(tooltipBindables.primary?.name).toBe('value');
    expect(tooltipBindables.primary?.attribute).toBe('value');
    expect(tooltipBindables.primary?.origin).toBe('synthesized-default-property');
    expect(tooltipBindables.primaryProvenance?.mode).toBe('synthesized-default-property');
    expect(tooltipBindables.primaryProvenance?.defaultPropertyName).toBe('value');
    expect(tooltipBindables.readByAttr('value')?.origin).toBe('synthesized-default-property');
    expect(tooltipBindables.openSeams).toEqual([]);

    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'TooltipHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<div tooltip="hello"></div>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected tooltip host compilation to produce an element node.');
    }

    const lowering = root.structuralCarrier.customAttributeBindings[0];
    expect(lowering?.assignments[0]?.bindable.origin).toBe('synthesized-default-property');
    expect(lowering?.assignments[0]?.bindable.name).toBe('value');
  });

  it('parses authored templates into a tolerant provenance-bearing tree', () => {
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
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'FooElement');
    const template = createTemplateHandle(file, owner);
    const authored = compiler.parseAuthoredTemplate(
      template,
      '<div if.bind="ready"><span>${message}</span></div>',
    );

    expect(authored.openSeams).toEqual([]);
    expect(authored.root.children).toHaveLength(1);
    expect(authored.root.provenance.ref?.nodeKind).toBe('fragment');
    const div = authored.root.children[0];
    expect(div).toBeInstanceOf(AuthoredElementNode);
    if (!(div instanceof AuthoredElementNode)) {
      throw new Error('Expected root child to be an authored element node.');
    }

    expect(div.tagName).toBe('div');
    expect(div.attributes.map((current) => current.rawName)).toEqual(['if.bind']);
    expect(div.attributes[0]?.provenance.ref?.nodeKind).toBe('attribute');
    const span = div.children[0];
    expect(span).toBeInstanceOf(AuthoredElementNode);
    if (!(span instanceof AuthoredElementNode)) {
      throw new Error('Expected span child to be an authored element node.');
    }

    expect(span.tagName).toBe('span');
    const text = span.children[0];
    expect(text).toBeInstanceOf(AuthoredTextNode);
    if (!(text instanceof AuthoredTextNode)) {
      throw new Error('Expected span child to be an authored text node.');
    }

    expect(text.value).toBe('${message}');
    expect(text.provenance.ref?.nodeKind).toBe('text');
  });

  it('lowers template controllers through generic inside-out structural carriers over authored templates', () => {
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

    const program = createProgramHandle();
    const file = createFileHandle(program);
    const unlessNode = createNodeHandle(file, 'ClassDeclaration', 500, 540);
    const unlessSymbol = createSymbolHandle(file, unlessNode, 'Unless');
    const unless = new TemplateControllerDefinition(
      'resource:tc:unless',
      unlessSymbol,
      new CustomAttributeIdentity(
        'unless',
        [],
        createKeyHandle(unlessSymbol, 'au:resource:template-controller:unless', 'resource'),
      ),
      new BindableSurface([], [
        new BindableEntry('value', 'value'),
      ]),
      new CustomAttributePolicy(
        'value',
        null,
        'reuse',
        true,
      ),
    );
    const compilerWorld = new CompilerConsultedWorld(
      `${world.compilerWorld.id}:template-controllers`,
      world.compilerWorld.world,
      [...world.visibleResources, unless],
      world.compilerWorld.renderers,
      world.compilerWorld.resourceResolver.readAdmissions(),
      world.compilerCapabilities,
      world.containerStateEntries,
      world.containerStateOpenSeams,
      world.compilerWorld.rendering.openSeams,
      world.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'FooElement');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<div if.bind="ready" unless.bind="busy"><span>${message}</span></div>',
    );

    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    expect(root.templateControllerLowering).not.toBeNull();
    expect(root.templateControllerLowering?.sourceOrderedInstructions.map((current) => current.resource.name)).toEqual([
      'if',
      'unless',
    ]);
    expect(root.templateControllerLowering?.outermostInstruction.resource.name).toBe('if');
    expect(root.templateControllerLowering?.outermostInstruction.props[0]?.bindable.name).toBe('value');
    expect(root.templateControllerLowering?.outermostInstruction.props[0]?.bindingCommandName).toBe('bind');
    expect(root.templateControllerLowering?.outermostInstruction.definition.templateKind).toBe('marker-only-wrapper');
    expect(root.templateControllerLowering?.outermostInstruction.definition.nestedInstructions[0]?.resource.name).toBe('unless');
    expect(root.templateControllerLowering?.innermostDefinition.templateKind).toBe('wrapped-authored-element');
    expect(root.templateControllerLowering?.innermostDefinition.structuralCarrier?.authored.tagName).toBe('div');
    expect(root.structuralCarrier.classification.items.map((current) => current.lane)).toEqual([
      'template-controller',
      'template-controller',
    ]);
    expect(root.openSeams.map((current) => current.kind)).toContain('element-direct-lowering-open');
    const compiledSpan = root.structuralCarrier.childCompilations[0];
    expect(compiledSpan).toBeInstanceOf(CompiledElementNode);
    if (!(compiledSpan instanceof CompiledElementNode)) {
      throw new Error('Expected compiled child to be an element compilation.');
    }

    const compiledText = compiledSpan.structuralCarrier.childCompilations[0];
    expect(compiledText).toBeInstanceOf(CompiledTextNode);
    if (!(compiledText instanceof CompiledTextNode)) {
      throw new Error('Expected compiled span child to be a text compilation.');
    }

    expect(compiledText.interpolationDetected).toBe(true);
    expect(compiledText.openSeams.map((current) => current.kind)).toContain('text-interpolation-open');
  });

  it('prepares generic template-controller runtime preparation through controller child worlds and view factories', () => {
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

    const program = createProgramHandle();
    const file = createFileHandle(program);
    const unlessNode = createNodeHandle(file, 'ClassDeclaration', 500, 540);
    const unlessSymbol = createSymbolHandle(file, unlessNode, 'Unless');
    const unless = new TemplateControllerDefinition(
      'resource:tc:unless',
      unlessSymbol,
      new CustomAttributeIdentity(
        'unless',
        [],
        createKeyHandle(unlessSymbol, 'au:resource:template-controller:unless', 'resource'),
      ),
      new BindableSurface([], [
        new BindableEntry('value', 'value'),
      ]),
      new CustomAttributePolicy(
        'value',
        null,
        'reuse',
        true,
      ),
    );
    const compilerWorld = new CompilerConsultedWorld(
      `${world.compilerWorld.id}:unless`,
      world.compilerWorld.world,
      [...world.visibleResources, unless],
      world.compilerWorld.renderers,
      world.compilerWorld.resourceResolver.readAdmissions(),
      world.compilerCapabilities,
      world.containerStateEntries,
      world.containerStateOpenSeams,
      world.compilerWorld.rendering.openSeams,
      world.compilerWorld.openSeams,
    );
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'HostElement');
    const template = createTemplateHandle(file, owner);
    const compiler = new TemplateCompiler(compilerWorld);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<div if.bind="ready" unless.bind="busy"></div>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    expect(parentController).toBeInstanceOf(ElementController);

    const preparation = compiler.prepareTemplateController(parentController, root);
    expect(preparation).toBeInstanceOf(TemplateControllerPreparation);
    if (!(preparation instanceof TemplateControllerPreparation)) {
      throw new Error('Expected template-controller preparation to be created.');
    }

    expect(preparation.resource.name).toBe('if');
    expect(preparation.profile.profileKind).toBe('builtin');
    expect(preparation.controller).toBeInstanceOf(AttributeController);
    expect(preparation.controller.parent).toBe(parentController);
    expect(preparation.controller.world.world.parentId).toBe(parentController.world.world.id);
    expect(preparation.controller.worldFormation).toBeInstanceOf(CompilerChildWorldFormation);
    expect(preparation.controller.worldFormation?.requestedMode).toBe('child-world');
    expect(preparation.invocation.worldFormation.requestedMode).toBe('child-world');
    expect(preparation.viewFactory).toBeInstanceOf(ViewFactory);
    expect(preparation.viewFactory.definition.nestedInstructions[0]?.resource.name).toBe('unless');
    expect(preparation.viewFactory.worldFormation?.requestedMode).toBe('reuse-parent-world');
    expect(preparation.viewFactory.world).toBe(parentController.world);
    expect(preparation.renderLocation.hostElement).toBe(root);
    expect(preparation.openSeams.map((current) => current.kind)).toContain('view-realization-deferred');
    expect(preparation.invocation.openSeams.map((current) => current.kind)).toContain('published-di-surface-open');
  });

  it('requests a fresh inherited-resource view world for template controllers with containerStrategy=new', () => {
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

    const program = createProgramHandle();
    const file = createFileHandle(program);
    const tcNode = createNodeHandle(file, 'ClassDeclaration', 600, 660);
    const tcSymbol = createSymbolHandle(file, tcNode, 'PortalLike');
    const portalLike = new TemplateControllerDefinition(
      'resource:tc:portal-like',
      tcSymbol,
      new CustomAttributeIdentity(
        'portal-like',
        [],
        createKeyHandle(tcSymbol, 'au:resource:template-controller:portal-like', 'resource'),
      ),
      new BindableSurface([], [
        new BindableEntry('value', 'value'),
      ]),
      new CustomAttributePolicy(
        'value',
        null,
        'new',
        true,
      ),
    );
    const compilerWorld = new CompilerConsultedWorld(
      `${world.compilerWorld.id}:portal-like`,
      world.compilerWorld.world,
      [...world.visibleResources, portalLike],
      world.compilerWorld.renderers,
      world.compilerWorld.resourceResolver.readAdmissions(),
      world.compilerCapabilities,
      world.containerStateEntries,
      world.containerStateOpenSeams,
      world.compilerWorld.rendering.openSeams,
      world.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'PortalHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<div portal-like.bind=\"target\"></div>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    const preparation = compiler.prepareTemplateController(parentController, root);
    expect(preparation).toBeInstanceOf(TemplateControllerPreparation);
    if (!(preparation instanceof TemplateControllerPreparation)) {
      throw new Error('Expected template-controller preparation to be created.');
    }

    expect(preparation.resource.name).toBe('portal-like');
    expect(preparation.profile.profileKind).toBe('custom');
    expect(preparation.openSeams.map((current) => current.kind)).toContain('linked-branch-profile-open');
    expect(preparation.viewFactory.worldFormation?.requestedMode).toBe('child-world-inherit-parent-resources');
    expect(preparation.viewFactory.world.world.id).not.toBe(parentController.world.world.id);
    expect(preparation.viewFactory.world.world.parentId).toBe(parentController.world.world.id);
    expect(preparation.viewFactory.world.openSeams.map((current) => current.kind)).toContain('resource-map-topology-open');
    expect(preparation.controller.world.world.parentId).toBe(parentController.world.world.id);
    expect(preparation.controller.worldFormation?.openSeams.map((current) => current.kind)).toContain('dependency-registration-open');
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
      'command-owned-attribute',
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

  it('materializes binding-command build basis from declaration source', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const byName = new Map(
      framework.resources().readBindingCommands().map((current) => [
        current.type.kind === 'symbol'
          ? current.type.name ?? current.name ?? '<unknown>'
          : current.name ?? '<unknown>',
        current,
      ]),
    );
    const bind = byName.get('DefaultBindingCommand');
    const forCommand = byName.get('ForBindingCommand');
    const trigger = byName.get('TriggerBindingCommand');

    expect(bind).toBeDefined();
    expect(forCommand).toBeDefined();
    expect(trigger).toBeDefined();
    if (bind == null || forCommand == null || trigger == null) {
      throw new Error('Expected binding command fixtures to materialize.');
    }

    expect(bind.buildBasis.ignoreAttr).toBe(false);
    expect(bind.buildBasis.emission.shape).toBe('object-literal-return');
    expect(bind.buildBasis.emission.instructionIdentitySeed).toBe('itPropertyBinding');
    expect(bind.buildBasis.valueHandling.kind).toBe('compile-parse');
    expect(bind.buildBasis.valueHandling.parserEntrySeed).toBe('etIsProperty');
    expect(bind.buildBasis.readProvenance('ignore-attr')?.selected?.carrier).toBe('ignore-attr-getter');

    expect(forCommand.buildBasis.ignoreAttr).toBe(false);
    expect(forCommand.buildBasis.emission.shape).toBe('object-literal-return');
    expect(forCommand.buildBasis.emission.instructionIdentitySeed).toBe('itIteratorBinding');
    expect(forCommand.buildBasis.valueHandling.kind).toBe('compile-parse');
    expect(forCommand.buildBasis.valueHandling.parserEntrySeed).toBe('IsIterator');

    expect(trigger.buildBasis.ignoreAttr).toBe(true);
    expect(trigger.buildBasis.emission.shape).toBe('object-literal-return');
    expect(trigger.buildBasis.emission.instructionIdentitySeed).toBe('itListenerBinding');
    expect(trigger.buildBasis.valueHandling.kind).toBe('compile-parse');
    expect(trigger.buildBasis.valueHandling.parserEntrySeed).toBe('etIsFunction');
  });

  it('materializes custom-attribute and template-controller support bundles from declaration source', () => {
    const fixture = createConfigurationFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const show = framework.resources().readCustomAttributes().find((current) => current.name === 'show');
    const ifTc = framework.resources().readTemplateControllers().find((current) => current.name === 'if');

    expect(show).toBeDefined();
    expect(ifTc).toBeDefined();
    if (show == null || ifTc == null) {
      throw new Error('Expected custom attribute and template controller fixtures to materialize.');
    }

    const showValue = show.bindableSurface.entries.find((current) => current.name === 'value');
    expect(show.defaultProperty).toBe('value');
    expect(show.noMultiBindings).toBe(false);
    expect(show.bindableSurface.entries.map((current) => current.name)).toEqual(['value', 'delay']);
    expect(showValue?.mode).toBe('toView');
    expect(show.bindableSurface.readProvenance()?.mode).toBe('merged');
    expect(show.policy.readProvenance('default-property')?.selected?.carrier).toBe('static-au-property');

    expect(ifTc.policy.isTemplateController).toBe(true);
    expect(ifTc.defaultProperty).toBe('value');
    expect(ifTc.containerStrategy).toBe('reuse');
    expect(ifTc.bindableSurface.entries.map((current) => current.name)).toEqual(['value']);
    expect(ifTc.policy.readProvenance('is-template-controller')?.selected?.carrier).toBe('static-au-property');
    expect(ifTc.policy.readProvenance('container-strategy')?.selected?.carrier).toBe('static-au-property');
  });

  it('materializes declaration-local lifecycle hook surfaces for CE, CA, and TC resources', () => {
    const fixture = createLifecycleResourceFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const ce = framework.resources().readCustomElements().find((current) => current.name === 'lifecycle-card');
    const ca = framework.resources().readCustomAttributes().find((current) => current.name === 'focus');
    const tc = framework.resources().readTemplateControllers().find((current) => current.name === 'guard');

    expect(ce).toBeDefined();
    expect(ca).toBeDefined();
    expect(tc).toBeDefined();
    if (ce == null || ca == null || tc == null) {
      throw new Error('Expected lifecycle fixture resources to materialize.');
    }

    expect(ce.lifecycleHooks.has('define')).toBe(true);
    expect(ce.lifecycleHooks.has('hydrating')).toBe(true);
    expect(ce.lifecycleHooks.has('hydrated')).toBe(true);
    expect(ce.lifecycleHooks.has('created')).toBe(true);
    expect(ce.lifecycleHooks.has('binding')).toBe(true);
    expect(ce.lifecycleHooks.has('attaching')).toBe(true);
    expect(ce.lifecycleHooks.has('dispose')).toBe(true);
    expect(ce.lifecycleHooks.readProvenance('define')?.selected?.carrier).toBe('instance-method');

    expect(ca.lifecycleHooks.has('created')).toBe(true);
    expect(ca.lifecycleHooks.has('binding')).toBe(true);
    expect(ca.lifecycleHooks.has('unbinding')).toBe(true);
    expect(ca.lifecycleHooks.has('dispose')).toBe(true);
    expect(ca.lifecycleHooks.has('link')).toBe(true);
    expect(ca.lifecycleHooks.readProvenance('link')?.selected?.carrier).toBe('instance-method');

    expect(tc.lifecycleHooks.has('link')).toBe(true);
    expect(tc.lifecycleHooks.has('attaching')).toBe(true);
    expect(tc.lifecycleHooks.has('accept')).toBe(true);
    expect(tc.lifecycleHooks.readProvenance('attaching')?.selected?.carrier).toBe('instance-method');
  });

  it('materializes declaration-local watch surfaces for CE, CA, and TC resources', () => {
    const fixture = createWatchResourceFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const ce = framework.resources().readCustomElements().find((current) => current.name === 'watched-card');
    const ca = framework.resources().readCustomAttributes().find((current) => current.name === 'observed');
    const tc = framework.resources().readTemplateControllers().find((current) => current.name === 'guard');

    expect(ce).toBeDefined();
    expect(ca).toBeDefined();
    expect(tc).toBeDefined();
    if (ce == null || ca == null || tc == null) {
      throw new Error('Expected watch fixture resources to materialize.');
    }

    expect(ce.watchSurface.declarations).toHaveLength(2);
    const ceClassWatch = ce.watchSurface.declarations.find((current) => current.origin === 'class-decorator');
    const ceMethodWatch = ce.watchSurface.declarations.find((current) => current.callback.kind === 'decorated-method');
    expect(ceClassWatch?.expression.kind).toBe('string-expression');
    expect(ceClassWatch?.expression.text).toBe('items.length');
    expect(ceClassWatch?.callback.kind).toBe('named-method');
    expect(ceClassWatch?.callback.name).toBe('itemsChanged');
    expect(ceClassWatch?.callback.source).not.toBeNull();
    expect(ceClassWatch?.flush).toBe('sync');
    expect(ceMethodWatch?.expression.kind).toBe('dependency-collector');
    expect(ceMethodWatch?.expression.dependencyPath).toEqual(['isOpen']);
    expect(ceMethodWatch?.callback.name).toBe('handleOpen');
    expect(ceMethodWatch?.flush).toBe('async');

    expect(ca.watchSurface.declarations).toHaveLength(1);
    const caWatch = ca.watchSurface.declarations[0];
    expect(caWatch?.expression.kind).toBe('dependency-collector');
    expect(caWatch?.expression.dependencyPath).toEqual(['value']);
    expect(caWatch?.callback.kind).toBe('inline-callback');
    expect(caWatch?.flush).toBe('async');

    expect(tc.watchSurface.declarations).toHaveLength(1);
    const tcWatch = tc.watchSurface.declarations[0];
    expect(tcWatch?.origin).toBe('class-decorator');
    expect(tcWatch?.expression.kind).toBe('string-expression');
    expect(tcWatch?.expression.text).toBe('when');
    expect(tcWatch?.callback.kind).toBe('named-method');
    expect(tcWatch?.callback.name).toBe('whenChanged');
  });

  it('materializes declaration-local @children surfaces for custom elements and keeps hydrating spend explicit', () => {
    const fixture = createChildrenResourceFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const ce = framework.resources().readCustomElements().find((current) => current.name === 'query-card');
    expect(ce).toBeDefined();
    if (ce == null) {
      throw new Error('Expected @children fixture custom element to materialize.');
    }

    expect(ce.childrenSurface.declarations).toHaveLength(4);
    const items = ce.childrenSurface.readByPropertyName('items')[0];
    const rows = ce.childrenSurface.readByPropertyName('rows')[0];
    const sections = ce.childrenSurface.readByPropertyName('sections')[0];
    const invalid = ce.childrenSurface.readByPropertyName('invalidNodes')[0];

    expect(items?.query.kind).toBe('default-elements');
    expect(items?.query.selectorText).toBe('*');
    expect(items?.callback.kind).toBe('default-name');
    expect(items?.callback.name).toBe('itemsChanged');
    expect(items?.callback.source).not.toBeNull();
    expect(items?.filter.kind).toBe('none');
    expect(items?.map.kind).toBe('none');

    expect(rows?.query.kind).toBe('selector-string');
    expect(rows?.query.selectorText).toBe('li');
    expect(rows?.callback.kind).toBe('default-name');
    expect(rows?.callback.name).toBe('rowsChanged');

    expect(sections?.query.kind).toBe('all-nodes');
    expect(sections?.callback.kind).toBe('named-method');
    expect(sections?.callback.name).toBe('sectionsChanged');
    expect(sections?.callback.source).not.toBeNull();
    expect(sections?.filter.kind).toBe('inline-function');
    expect(sections?.map.kind).toBe('inline-function');

    expect(invalid?.query.kind).toBe('selector-string');
    expect(invalid?.query.note).toContain('rejects queries');

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

    const compilerWorld = new CompilerConsultedWorld(
      `compiler-world:${standardWorld.world.id}:children-card`,
      standardWorld.world,
      [...standardWorld.visibleResources, ce],
      standardWorld.compilerWorld.renderers,
      standardWorld.compilerWorld.resourceResolver.readAdmissions(),
      standardWorld.compilerCapabilities,
      standardWorld.containerStateEntries,
      standardWorld.containerStateOpenSeams,
      standardWorld.compilerWorld.rendering.openSeams,
      standardWorld.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'ChildrenHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<query-card></query-card>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    const preparation = compiler.prepareCustomElement(parentController, root);
    expect(preparation).toBeInstanceOf(CustomElementPreparation);
    if (!(preparation instanceof CustomElementPreparation)) {
      throw new Error('Expected custom-element preparation to be created.');
    }

    expect(preparation.openSeams.map((current) => current.kind)).toContain('children-binding-open');
  });

  it('materializes declaration-local @slotted surfaces for custom elements and keeps watcher spend explicit', () => {
    const fixture = createSlottedResourceFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const ce = framework.resources().readCustomElements().find((current) => current.name === 'content-panel');
    expect(ce).toBeDefined();
    if (ce == null) {
      throw new Error('Expected @slotted fixture custom element to materialize.');
    }

    expect(ce.slottedSurface.declarations).toHaveLength(4);
    const content = ce.slottedSurface.readByPropertyName('content')[0];
    const rows = ce.slottedSurface.readByPropertyName('rows')[0];
    const allPanels = ce.slottedSurface.readByPropertyName('allPanels')[0];
    const sidebarNodes = ce.slottedSurface.readByPropertyName('sidebarNodes')[0];

    expect(content?.query.kind).toBe('default-elements');
    expect(content?.query.selectorText).toBe('*');
    expect(content?.slotTarget.kind).toBe('default-slot');
    expect(content?.slotTarget.name).toBe('default');
    expect(content?.callback.kind).toBe('default-name');
    expect(content?.callback.name).toBe('contentChanged');
    expect(content?.callback.source).not.toBeNull();

    expect(rows?.query.kind).toBe('selector-string');
    expect(rows?.query.selectorText).toBe('li');
    expect(rows?.slotTarget.kind).toBe('default-slot');
    expect(rows?.callback.kind).toBe('default-name');
    expect(rows?.callback.name).toBe('rowsChanged');

    expect(allPanels?.query.kind).toBe('selector-string');
    expect(allPanels?.query.selectorText).toBe('section');
    expect(allPanels?.slotTarget.kind).toBe('all-slots');
    expect(allPanels?.slotTarget.name).toBe('*');

    expect(sidebarNodes?.query.kind).toBe('all-nodes');
    expect(sidebarNodes?.slotTarget.kind).toBe('named-slot');
    expect(sidebarNodes?.slotTarget.name).toBe('sidebar');
    expect(sidebarNodes?.callback.kind).toBe('named-method');
    expect(sidebarNodes?.callback.name).toBe('sidebarChanged');
    expect(sidebarNodes?.callback.source).not.toBeNull();

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

    const compilerWorld = new CompilerConsultedWorld(
      `compiler-world:${standardWorld.world.id}:content-panel`,
      standardWorld.world,
      [...standardWorld.visibleResources, ce],
      standardWorld.compilerWorld.renderers,
      standardWorld.compilerWorld.resourceResolver.readAdmissions(),
      standardWorld.compilerCapabilities,
      standardWorld.containerStateEntries,
      standardWorld.containerStateOpenSeams,
      standardWorld.compilerWorld.rendering.openSeams,
      standardWorld.compilerWorld.openSeams,
    );
    const compiler = new TemplateCompiler(compilerWorld);
    const program = createProgramHandle();
    const file = createFileHandle(program);
    const ownerNode = createNodeHandle(file, 'ClassDeclaration', 10, 40);
    const owner = createSymbolHandle(file, ownerNode, 'SlottedHost');
    const template = createTemplateHandle(file, owner);
    const compiled = compiler.compileAuthoredTemplate(
      template,
      '<content-panel></content-panel>',
    );
    const root = compiled.rootNodes[0];
    expect(root).toBeInstanceOf(CompiledElementNode);
    if (!(root instanceof CompiledElementNode)) {
      throw new Error('Expected root compiled node to be an element compilation.');
    }

    const parentController = compiler.createElementController(null, null, root);
    const preparation = compiler.prepareCustomElement(parentController, root);
    expect(preparation).toBeInstanceOf(CustomElementPreparation);
    if (!(preparation instanceof CustomElementPreparation)) {
      throw new Error('Expected custom-element preparation to be created.');
    }

    expect(preparation.openSeams.map((current) => current.kind)).toContain('slotted-watcher-open');
  });

  it('materializes value-converter and binding-behavior support bundles from declaration source', () => {
    const fixture = createBehavioralResourceFixture();
    const framework = new Framework(fixture.rootDir, {
      rootDir: fixture.rootDir,
      exports: fixture.exports,
      resourceSeeds: fixture.resourceSeeds,
    });

    const converter = framework.resources().readValueConverters().find((current) => current.name === 'relativeTime');
    const behavior = framework.resources().readBindingBehaviors().find((current) => current.name === 'debounce');

    expect(converter).toBeDefined();
    expect(behavior).toBeDefined();
    if (converter == null || behavior == null) {
      throw new Error('Expected value-converter and binding-behavior fixtures to materialize.');
    }

    expect(converter.aliases).toEqual(['rt']);
    expect(converter.behavior.signals).toEqual(['clock-tick', 'locale-changed']);
    expect(converter.behavior.withContext).toBe(true);
    expect(converter.behavior.declaresToView).toBe(true);
    expect(converter.behavior.declaresFromView).toBe(true);
    expect(converter.identity.readProvenance('name')?.selected?.carrier).toBe('static-au-property');
    expect(converter.behavior.readProvenance('signals')?.selected?.carrier).toBe('instance-property');
    expect(converter.behavior.readProvenance('to-view')?.selected?.carrier).toBe('instance-method');

    expect(behavior.aliases).toEqual(['debounced']);
    expect(behavior.execution.instanceKind).toBe('factory');
    expect(behavior.execution.declaresBind).toBe(true);
    expect(behavior.execution.declaresUnbind).toBe(true);
    expect(behavior.identity.readProvenance('name')?.selected?.carrier).toBe('static-au-property');
    expect(behavior.execution.readProvenance('instance-kind')?.selected?.carrier).toBe('instance-property');
    expect(behavior.execution.readProvenance('bind')?.selected?.carrier).toBe('instance-method');
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
      standardWorld.compilerWorld.renderers,
      standardWorld.compilerWorld.resourceResolver.readAdmissions(),
      standardWorld.compilerCapabilities,
      standardWorld.containerStateEntries,
      standardWorld.containerStateOpenSeams,
      standardWorld.compilerWorld.rendering.openSeams,
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
    expect(decoratedTitleBindable?.witness?.carrier).toBe('static-own-property');
    expect(decoratedTitleBindable?.readProvenance('attribute')?.mode).toBe('selected');
    expect(decoratedTitleBindable?.readProvenance('attribute')?.selected?.carrier).toBe('static-own-property');
    expect(decoratedTitleBindable?.readProvenance('attribute')?.contributors.map((current) => current.carrier)).toEqual([
      'static-own-property',
    ]);
    expect(decoratedTitleBindable?.resolution?.selected?.witness?.carrier).toBe('static-own-property');
    expect(decoratedTitleBindable?.resolution?.shadowed.map((current) => current.witness?.carrier)).toEqual([
      'bindable-decorator',
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
      new BindableSurface(),
      new CustomElementDependencyContribution(),
      new CustomElementTemplateSource('open'),
    ),
    new CustomAttributeDefinition(
      'resource:ca:bar',
      attributeSymbol,
      new CustomAttributeIdentity(
        'bar',
        ['bar-attribute'],
        createKeyHandle(attributeSymbol, 'au:resource:custom-attribute:bar', 'resource'),
      ),
      undefined,
      undefined,
      undefined,
      'toView',
    ),
    new TemplateControllerDefinition(
      'resource:tc:if',
      controllerSymbol,
      new CustomAttributeIdentity(
        'if',
        [],
        createKeyHandle(controllerSymbol, 'au:resource:template-controller:if', 'resource'),
      ),
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
declare const InternalBindingMode: {
  oneTime: unknown;
  toView: unknown;
  fromView: unknown;
  twoWay: unknown;
};
declare const etIsProperty: unknown;
declare const etIsFunction: unknown;
declare const itPropertyBinding: unknown;
declare const itIteratorBinding: unknown;
declare const itListenerBinding: unknown;
declare function camelCase(value: string): string;
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
export class Show {
  static $au = {
    type: 'custom-attribute',
    name: 'show',
    defaultProperty: 'value',
    noMultiBindings: false,
    bindables: {
      value: { mode: 'toView' },
      delay: { attribute: 'show-delay' },
    },
  };
}
export class If {
  static $au = {
    type: 'custom-attribute',
    name: 'if',
    isTemplateController: true,
    defaultProperty: 'value',
    containerStrategy: 'reuse',
    bindables: {
      value: { mode: 'toView' },
    },
  };
}
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
export class DefaultBindingCommand {
  public static readonly $au = {
    type: 'binding-command',
    name: 'bind',
  };

  public get ignoreAttr() { return false; }

  public build(info: { attr: { rawValue: string; target: string }; bindable: { mode?: unknown; name: string } | null; node: unknown }, exprParser: { parse(value: string, entry: unknown): unknown }, attrMapper: { isTwoWay(node: unknown, target: string): boolean; map(node: unknown, target: string): string | null }) {
    const attr = info.attr;
    const bindable = info.bindable;
    let value = attr.rawValue;
    let target = attr.target;
    let mode;
    value = value === '' ? camelCase(target) : value;
    if (bindable == null) {
      mode = attrMapper.isTwoWay(info.node, target) ? InternalBindingMode.twoWay : InternalBindingMode.toView;
      target = attrMapper.map(info.node, target) ?? camelCase(target);
    } else {
      mode = bindable.mode === 0 || bindable.mode == null ? InternalBindingMode.toView : bindable.mode;
      target = bindable.name;
    }
    return {
      type: itPropertyBinding,
      from: exprParser.parse(value, etIsProperty),
      to: target,
      mode,
    };
  }
}
export class ForBindingCommand {
  public static readonly $au = {
    type: 'binding-command',
    name: 'for',
  };

  public get ignoreAttr() { return false; }

  public build(info: { attr: { rawValue: string; target: string }; bindable: { name: string } | null }, exprParser: { parse(value: string, entry: unknown): unknown }) {
    const target = info.bindable == null
      ? camelCase(info.attr.target)
      : info.bindable.name;

    return {
      type: itIteratorBinding,
      from: exprParser.parse(info.attr.rawValue, 'IsIterator'),
      to: target,
    };
  }
}
export class TriggerBindingCommand {
  public static readonly $au = {
    type: 'binding-command',
    name: 'trigger',
  };

  public get ignoreAttr() { return true; }

  public build(info: { attr: { rawValue: string; target: string; parts?: readonly string[] | null } }, exprParser: { parse(value: string, entry: unknown): unknown }) {
    return {
      type: itListenerBinding,
      from: exprParser.parse(info.attr.rawValue, etIsFunction),
      to: info.attr.target,
      modifier: info.attr.parts?.[2] ?? null,
    };
  }
}
export const SetPropertyRenderer = renderer(class SetPropertyRenderer {});
export const CustomElementRenderer = renderer(class CustomElementRenderer {});
export const CustomAttributeRenderer = renderer(class CustomAttributeRenderer {});
export const TemplateControllerRenderer = renderer(class TemplateControllerRenderer {});
export const LetElementRenderer = renderer(class LetElementRenderer {});
export const RefBindingRenderer = renderer(class RefBindingRenderer {});
export const InterpolationBindingRenderer = renderer(class InterpolationBindingRenderer {});
export const PropertyBindingRenderer = renderer(class PropertyBindingRenderer {});
export const IteratorBindingRenderer = renderer(class IteratorBindingRenderer {});
export const TextBindingRenderer = renderer(class TextBindingRenderer {});
export const ListenerBindingRenderer = renderer(class ListenerBindingRenderer {});
export const SetAttributeRenderer = renderer(class SetAttributeRenderer {});
export const SetClassAttributeRenderer = renderer(class SetClassAttributeRenderer {});
export const SetStyleAttributeRenderer = renderer(class SetStyleAttributeRenderer {});
export const StylePropertyBindingRenderer = renderer(class StylePropertyBindingRenderer {});
export const AttributeBindingRenderer = renderer(class AttributeBindingRenderer {});
export const SpreadRenderer = renderer(class SpreadRenderer {});
export const SpreadValueRenderer = renderer(class SpreadValueRenderer {});
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
  SetPropertyRenderer,
  CustomElementRenderer,
  CustomAttributeRenderer,
  TemplateControllerRenderer,
  LetElementRenderer,
  RefBindingRenderer,
  InterpolationBindingRenderer,
  PropertyBindingRenderer,
  IteratorBindingRenderer,
  TextBindingRenderer,
  ListenerBindingRenderer,
  SetAttributeRenderer,
  SetClassAttributeRenderer,
  SetStyleAttributeRenderer,
  StylePropertyBindingRenderer,
  AttributeBindingRenderer,
  SpreadRenderer,
  SpreadValueRenderer,
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

function createBehavioralResourceFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly resourceSeeds: readonly ResourceDefinition[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-behavioral-resources-'));
  const filePath = path.join(rootDir, 'behavioral-resource-fixture.ts');
  const sourceText = `
export class RelativeTimeValueConverter {
  static $au = {
    type: 'value-converter',
    name: 'relativeTime',
    aliases: ['rt'],
  };

  public readonly signals = ['clock-tick', 'locale-changed'];
  public readonly withContext = true;

  public toView(value: unknown) {
    return value;
  }

  public fromView(value: unknown) {
    return value;
  }
}

export class DebounceBindingBehavior {
  static $au = {
    type: 'binding-behavior',
    name: 'debounce',
    aliases: ['debounced'],
  };

  public readonly type = 'factory';

  public bind(_scope: unknown, _binding: unknown, _delay?: number) {}

  public unbind(_scope: unknown, _binding: unknown) {}
}
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:behavioral-resource-fixture',
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
  const converter = byName.get('RelativeTimeValueConverter');
  const behavior = byName.get('DebounceBindingBehavior');
  if (converter == null || behavior == null) {
    throw new Error('Expected behavioral resource fixture exports to exist.');
  }

  return {
    exports,
    rootDir,
    resourceSeeds: [
      new ValueConverterDefinition(
        'resource:vc:relative-time',
        converter.symbol!,
        createKeyHandle(converter.symbol!, 'au:resource:value-converter:relativeTime', 'resource'),
        'relativeTime',
        [],
      ),
      new BindingBehaviorDefinition(
        'resource:bb:debounce',
        behavior.symbol!,
        createKeyHandle(behavior.symbol!, 'au:resource:binding-behavior:debounce', 'resource'),
        'debounce',
        [],
      ),
    ],
  };
}

function createLifecycleResourceFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly resourceSeeds: readonly ResourceDefinition[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-lifecycle-resources-'));
  const filePath = path.join(rootDir, 'lifecycle-resource-fixture.ts');
  const sourceText = `
export class LifecycleCard {
  static $au = {
    type: 'custom-element',
    name: 'lifecycle-card',
  };

  define() {}
  hydrating() {}
  hydrated() {}
  created() {}
  binding() {}
  attaching() {}
  dispose() {}
}

export class FocusAttribute {
  static $au = {
    type: 'custom-attribute',
    name: 'focus',
  };

  created() {}
  binding() {}
  unbinding() {}
  dispose() {}
  link() {}
}

export class GuardController {
  static $au = {
    type: 'custom-attribute',
    name: 'guard',
    isTemplateController: true,
  };

  link() {}
  attaching() {}
  accept() {}
}
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:lifecycle-resource-fixture',
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
  const ce = byName.get('LifecycleCard');
  const ca = byName.get('FocusAttribute');
  const tc = byName.get('GuardController');
  if (ce == null || ca == null || tc == null) {
    throw new Error('Expected lifecycle resource fixture exports to exist.');
  }

  return {
    exports,
    rootDir,
    resourceSeeds: [
      new CustomElementDefinition(
        'resource:ce:lifecycle-card',
        ce.symbol!,
        new CustomElementIdentity(
          'lifecycle-card',
          [],
          createKeyHandle(ce.symbol!, 'au:resource:custom-element:lifecycle-card', 'resource'),
        ),
      ),
      new CustomAttributeDefinition(
        'resource:ca:focus',
        ca.symbol!,
        new CustomAttributeIdentity(
          'focus',
          [],
          createKeyHandle(ca.symbol!, 'au:resource:custom-attribute:focus', 'resource'),
        ),
      ),
      new TemplateControllerDefinition(
        'resource:tc:guard',
        tc.symbol!,
        new CustomAttributeIdentity(
          'guard',
          [],
          createKeyHandle(tc.symbol!, 'au:resource:template-controller:guard', 'resource'),
        ),
      ),
    ],
  };
}

function createWatchResourceFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly resourceSeeds: readonly ResourceDefinition[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-watch-resources-'));
  const filePath = path.join(rootDir, 'watch-resource-fixture.ts');
  const sourceText = `
declare function watch(...args: unknown[]): unknown;

@watch('items.length', 'itemsChanged', { flush: 'sync' })
export class WatchedCard {
  static $au = {
    type: 'custom-element',
    name: 'watched-card',
  };

  public itemsChanged() {}

  @watch(vm => vm.isOpen)
  public handleOpen() {}
}

@watch(vm => vm.value, (_next, _prev, vm) => vm.valueChanged())
export class ObservedAttribute {
  static $au = {
    type: 'custom-attribute',
    name: 'observed',
  };

  public valueChanged() {}
}

@watch('when', 'whenChanged')
export class GuardController {
  static $au = {
    type: 'custom-attribute',
    name: 'guard',
    isTemplateController: true,
  };

  public whenChanged() {}
}
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:watch-resource-fixture',
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
  const ce = byName.get('WatchedCard');
  const ca = byName.get('ObservedAttribute');
  const tc = byName.get('GuardController');
  if (ce == null || ca == null || tc == null) {
    throw new Error('Expected watch resource fixture exports to exist.');
  }

  return {
    exports,
    rootDir,
    resourceSeeds: [
      new CustomElementDefinition(
        'resource:ce:watched-card',
        ce.symbol!,
        new CustomElementIdentity(
          'watched-card',
          [],
          createKeyHandle(ce.symbol!, 'au:resource:custom-element:watched-card', 'resource'),
        ),
      ),
      new CustomAttributeDefinition(
        'resource:ca:observed',
        ca.symbol!,
        new CustomAttributeIdentity(
          'observed',
          [],
          createKeyHandle(ca.symbol!, 'au:resource:custom-attribute:observed', 'resource'),
        ),
      ),
      new TemplateControllerDefinition(
        'resource:tc:guard',
        tc.symbol!,
        new CustomAttributeIdentity(
          'guard',
          [],
          createKeyHandle(tc.symbol!, 'au:resource:template-controller:guard', 'resource'),
        ),
      ),
    ],
  };
}

function createChildrenResourceFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly resourceSeeds: readonly ResourceDefinition[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-children-resources-'));
  const filePath = path.join(rootDir, 'children-resource-fixture.ts');
  const sourceText = `
declare function children(...args: unknown[]): unknown;

export class QueryCard {
  static $au = {
    type: 'custom-element',
    name: 'query-card',
  };

  public itemsChanged() {}
  public sectionsChanged() {}

  @children
  public items: unknown[] = [];

  @children('li')
  public rows: unknown[] = [];

  @children({
    query: '$all',
    callback: 'sectionsChanged',
    filter: (_node, vm) => vm !== null,
    map: node => node.nodeName,
  })
  public sections: unknown[] = [];

  @children({ query: 'section > *' })
  public invalidNodes: unknown[] = [];
}
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:children-resource-fixture',
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
  const ce = byName.get('QueryCard');
  if (ce == null) {
    throw new Error('Expected @children fixture export to exist.');
  }

  return {
    exports,
    rootDir,
    resourceSeeds: [
      new CustomElementDefinition(
        'resource:ce:query-card',
        ce.symbol!,
        new CustomElementIdentity(
          'query-card',
          [],
          createKeyHandle(ce.symbol!, 'au:resource:custom-element:query-card', 'resource'),
        ),
      ),
    ],
  };
}

function createSlottedResourceFixture(): {
  readonly exports: readonly DeclarationExport[];
  readonly resourceSeeds: readonly ResourceDefinition[];
  readonly rootDir: string;
} {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-clean-room-slotted-resources-'));
  const filePath = path.join(rootDir, 'slotted-resource-fixture.ts');
  const sourceText = `
declare function slotted(...args: unknown[]): unknown;

export class ContentPanel {
  static $au = {
    type: 'custom-element',
    name: 'content-panel',
    template: '<au-slot></au-slot><au-slot name="sidebar"></au-slot>',
  };

  public contentChanged() {}
  public sidebarChanged() {}

  @slotted()
  public content: unknown[] = [];

  @slotted('li')
  public rows: unknown[] = [];

  @slotted('section', '*')
  public allPanels: unknown[] = [];

  @slotted({
    query: '$all',
    slotName: 'sidebar',
    callback: 'sidebarChanged',
  })
  public sidebarNodes: unknown[] = [];
}
`;
  fs.writeFileSync(filePath, sourceText, 'utf8');

  const program = new ProgramRef(
    'program:slotted-resource-fixture',
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
  const ce = byName.get('ContentPanel');
  if (ce == null) {
    throw new Error('Expected @slotted fixture export to exist.');
  }

  return {
    exports,
    rootDir,
    resourceSeeds: [
      new CustomElementDefinition(
        'resource:ce:content-panel',
        ce.symbol!,
        new CustomElementIdentity(
          'content-panel',
          [],
          createKeyHandle(ce.symbol!, 'au:resource:custom-element:content-panel', 'resource'),
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
      new CustomAttributeIdentity(
        'show',
        [],
        createKeyHandle(show!.symbol!, 'au:resource:custom-attribute:show', 'resource'),
      ),
    ),
    new TemplateControllerDefinition(
      'resource:tc:if',
      ifTc!.symbol!,
      new CustomAttributeIdentity(
        'if',
        [],
        createKeyHandle(ifTc!.symbol!, 'au:resource:template-controller:if', 'resource'),
      ),
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
