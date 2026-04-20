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
  ConfigurationRegistrationScanner,
  ContainerWorldRef,
  ContainerStateEntry,
  CustomAttributeDefinition,
  CustomElementDefinition,
  DependencyAssociation,
  DependencyAssociationSource,
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
  RegistrationTransition,
  ResourceResolver,
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
    const compiler = new TemplateCompiler(root!.handle, new ResourceResolver());
    const compiled = compiler.compile(template);
    const resolvedResource = compiler.resourceResolver.resolve(
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
      root!.container,
    );
    const resolvedResources = resolvedResource?.all() ?? [];

    expect(root).toBeInstanceOf(AppRoot);
    expect(aurelia).toBeInstanceOf(Aurelia);
    expect(compiled.template).toEqual(template);
    expect(resolvedResource).toBeInstanceOf(Resolver);
    expect(resolvedResources.map((current) => current.ref)).toEqual([registration]);
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

    const dependencyAssociation = new DependencyAssociation(
      'dependency:ctor:ILogger',
      new DependencySite(
        'constructor-parameter',
        owner,
        declaration,
        'parameter[0]',
      ),
      new DependencyAssociationSource(
        'annotation-paramtypes',
        'Constructor dependency associated through Aurelia annotation metadata.',
      ),
      key,
      [
        new LookupModifier('optional'),
      ],
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
      world,
      key,
      'singleton',
      'explicit-iregistry-register',
      'key-space-addition',
      'eager',
      'direct',
      'closed',
      [],
      'Transition from produced registration into container-state consequence.',
    );

    const entry = new ContainerStateEntry(
      'entry:ILogger',
      world,
      key,
      [transition],
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

    expect(ANALYZABILITY_BAND_KINDS).toContain('closed');
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
    expect(dependencyAssociation.source.kind).toBe('annotation-paramtypes');
    expect(dependencyAssociation.lookupModifiers[0]?.kind).toBe('optional');
    expect(production.payload).toBe(payload);
    expect(intake.productions[0]).toBe(production);
    expect(entry.transitions[0]).toBe(transition);
    expect(lookup.modifiers).toContain('optional');
    expect(lookup.resourceRegime?.kind).toBe('optional-resource');
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
    expect(subjectByName.get('ExpressionParser')?.kind).toBe('service');
    expect(subjectByName.get('RuntimeTemplateCompilerImplementation')?.kind).toBe('registry');
    expect(subjectByName.get('DebounceBindingBehavior')?.kind).toBe('template-resource');
    expect(subjectByName.get('DebounceBindingBehavior')?.resourceKind).toBe('binding-behavior');
    expect(subjectByName.get('DotSeparatedAttributePattern')?.kind).toBe('compiler-resource');
    expect(subjectByName.get('DotSeparatedAttributePattern')?.resourceKind).toBe('attribute-pattern');
    expect(subjectByName.get('DefaultBindingCommand')?.kind).toBe('compiler-resource');
    expect(subjectByName.get('DefaultBindingCommand')?.resourceKind).toBe('binding-command');
    expect(subjectByName.get('PropertyBindingRenderer')?.kind).toBe('renderer');
    expect(contribution.openSeams.some((current) => current.includes('Returned registry interiors'))).toBe(true);
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
      createKeyHandle(elementSymbol, 'au:resource:custom-element:foo', 'resource'),
      'foo',
      ['foo-element'],
      ['value'],
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
declare const DialogService: unknown;

export const ExpressionParser = class ExpressionParser {};
export const RuntimeTemplateCompilerImplementation = {
  register(container: unknown) {
    return container;
  },
};
export const DirtyChecker = class DirtyChecker {};
export const NodeObserverLocator = class NodeObserverLocator {};
export const DebounceBindingBehavior = class DebounceBindingBehavior {};
export const OneTimeBindingBehavior = class OneTimeBindingBehavior {};
export const ToViewBindingBehavior = class ToViewBindingBehavior {};
export const DotSeparatedAttributePattern = class DotSeparatedAttributePattern {};
export const EventAttributePattern = class EventAttributePattern {};
export const DefaultBindingCommand = class DefaultBindingCommand {};
export const ForBindingCommand = class ForBindingCommand {};
export const PropertyBindingRenderer = class PropertyBindingRenderer {};
export const IteratorBindingRenderer = class IteratorBindingRenderer {};
export const DefaultComponents = [
  RuntimeTemplateCompilerImplementation,
  DirtyChecker,
  NodeObserverLocator,
];

export const DefaultResources = [
  DebounceBindingBehavior,
  OneTimeBindingBehavior,
  ToViewBindingBehavior,
];

export const DefaultBindingSyntax = [
  DotSeparatedAttributePattern,
  EventAttributePattern,
];

export const DefaultBindingLanguage = [
  DefaultBindingCommand,
  ForBindingCommand,
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
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    if (!hasExportModifier(statement)) {
      continue;
    }

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
  }

  return {
    exports,
    resourceSeeds: createConfigurationFixtureResources(exports),
    rootDir,
  };
}

function hasExportModifier(
  statement: ts.VariableStatement,
): boolean {
  return statement.modifiers?.some((current) => current.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function createConfigurationFixtureResources(
  exports: readonly DeclarationExport[],
): readonly ResourceDefinition[] {
  const byName = new Map(exports.map((current) => [current.name, current]));
  const debounce = byName.get('DebounceBindingBehavior');
  const oneTime = byName.get('OneTimeBindingBehavior');
  const toView = byName.get('ToViewBindingBehavior');
  const dotSeparated = byName.get('DotSeparatedAttributePattern');
  const eventPattern = byName.get('EventAttributePattern');
  const defaultCommand = byName.get('DefaultBindingCommand');
  const forCommand = byName.get('ForBindingCommand');

  return [
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
  ];
}
