import { describe, expect, it } from './test-harness.js';

import {
  Aurelia,
  AppRoot,
  ContainerWorldRef,
  Framework,
  KeyRef,
  ProgramRef,
  Registration,
  RegistrationRef,
  ResourceResolver,
  ResourceReferenceRef,
  Resolver,
  SourceFileRef,
  SourceNodeRef,
  SourceSpan,
  SymbolRef,
  TemplateCompiler,
  TemplateNodeRef,
  TemplateRef,
  TypeScriptEvaluator,
  ValueView,
  Workspace,
  type DeclarationExport,
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
    const exportRecord: DeclarationExport = {
      name: 'FooElement',
      symbol: createSymbolHandle(createFileHandle(workspace.program()), createNodeHandle(createFileHandle(workspace.program()), 'ClassDeclaration', 1, 10), 'FooElement'),
      sourceFile: createFileHandle(workspace.program()),
    };
    const framework = new Framework('repo/aurelia', {
      rootDir: 'repo/aurelia',
      packageNames: ['@aurelia/kernel', '@aurelia/runtime-html'],
      exports: [exportRecord],
    });
    workspace.setFramework(framework);
    const project = workspace.createProject({
      rootDir: 'repo/app',
      name: 'app',
      exports: [exportRecord],
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
    expect(project.appRoot()).toBeDefined();
    expect(project.aurelia()).toBe(aurelia);
  });

  it('exposes a bounded evaluator scaffold that returns shaped views instead of raw values', () => {
    const workspace = new Workspace('repo', { program: createProgramHandle() });
    const evaluator = workspace.typeScriptEvaluator();
    const file = createFileHandle(workspace.program());
    const source = createNodeHandle(file, 'VariableDeclaration', 5, 20);
    const symbol = createSymbolHandle(file, source, 'Foo');
    const key = createKeyHandle(symbol, 'Foo', 'interface-symbol');
    const registration = createRegistrationHandle(
      source,
      symbol,
      workspace.createAurelia().container.world,
      key,
    );

    const symbolView = evaluator.evaluate(symbol);
    const registrationView = evaluator.evaluate(registration);

    expect(evaluator).toBeInstanceOf(TypeScriptEvaluator);
    expect(symbolView).toBeInstanceOf(ValueView);
    expect(symbolView.kind).toBe('symbolic');
    expect(symbolView.summary).toBe('Foo');
    expect(registrationView.kind).toBe('structured');
    expect(registrationView.boundary?.kind).toBe('not-yet-materialized');
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
