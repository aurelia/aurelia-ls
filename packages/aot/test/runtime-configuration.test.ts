import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { DI, Registration } from '@aurelia/kernel';
import { IExpressionParser } from '@aurelia/expression-parser';
import {
  DirtyChecker,
  ICoercionConfiguration,
  IDirtyChecker,
  INodeObserverLocator,
} from '@aurelia/runtime';
import {
  DefaultRenderers,
  DefaultResources,
  EventModifierRegistration,
  IEventModifier,
  IModifiedEventHandlerCreator,
  IRenderer,
  NodeObserverLocator,
} from '@aurelia/runtime-html';
import { ITemplateCompiler } from '@aurelia/template-compiler';
import { describe, expect, it } from 'vitest';

import {
  AOT_COMPILED_DEFINITION_IDENTITY,
  AOT_RUNTIME_SPREAD_CAPTURE,
  AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER,
  AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX,
  AOT_RUNTIME_CONFIGURATION_PROTOCOL,
  AOT_RUNTIME_SPREAD_PLAN,
  AOT_RUNTIME_SPREAD_PLAN_PROTOCOL,
  AotExpressionParser,
  AotRuntimeConfiguration,
  AotRuntimeConfigurationModuleEmitter,
  AotRuntimeConfigurationPlan,
  AotTemplateCompiler,
  type AotRuntimeExpressionEntry,
  type AotRuntimeRegistrationPlan,
  type AotRuntimeRegistrationReference,
  type AotRuntimeSpreadPlan,
  type AotRuntimeSpreadPlanCase,
} from '../src/runtime-configuration.js';
import { emitAotJavaScriptValue } from '../src/template-module-emitter.js';

const propertyAst = { $kind: 'AccessScope', name: 'message', ancestor: 0 } as const;
const iteratorAst = {
  $kind: 'ForOfStatement',
  declaration: { $kind: 'BindingIdentifier', name: 'item' },
  iterable: { $kind: 'AccessScope', name: 'items', ancestor: 0 },
  semiIdx: -1,
} as const;

const expressions: readonly AotRuntimeExpressionEntry[] = [
  { expressionType: 'IsProperty', source: 'message', value: propertyAst },
  { expressionType: 'IsIterator', source: 'item of items', value: iteratorAst },
];

const plainInterpolation: AotRuntimeExpressionEntry = {
  expressionType: 'Interpolation', source: 'greeting', value: undefined,
};

const runtimeHtmlReference = (exportName: string): AotRuntimeRegistrationReference => ({
  moduleSpecifier: '@aurelia/runtime-html',
  exportName,
});

const storefrontResourceReferences = [
  'DebounceBindingBehavior',
  'If',
  'Else',
  'Repeat',
  'Switch',
  'Case',
  'DefaultCase',
  'PromiseTemplateController',
  'PendingTemplateController',
  'FulfilledTemplateController',
  'RejectedTemplateController',
].map(runtimeHtmlReference);

const storefrontRendererReferences = [
  'PropertyBindingRenderer',
  'IteratorBindingRenderer',
  'InterpolationBindingRenderer',
  'SetPropertyRenderer',
  'CustomElementRenderer',
  'CustomAttributeRenderer',
  'TemplateControllerRenderer',
  'LetElementRenderer',
  'ListenerBindingRenderer',
  'AttributeBindingRenderer',
  'TextBindingRenderer',
].map(runtimeHtmlReference);

describe('AOT runtime configuration', () => {
  it('returns only exact precompiled expression values and preserves their identity', () => {
    const parser = new AotExpressionParser(expressions);

    expect(parser.parse('message', 'IsProperty')).toBe(propertyAst);
    expect(parser.parse('item of items', 'IsIterator')).toBe(iteratorAst);
    expect(() => parser.parse('message', 'IsFunction')).toThrowError(
      'AOT expression parser has no precompiled IsFunction source "message".',
    );
    expect(() => parser.parse('missing', 'IsProperty')).toThrowError(
      'AOT expression parser has no precompiled IsProperty source "missing".',
    );
  });

  it('distinguishes a known interpolation-free source from missing runtime requests', () => {
    const interpolationAst = {
      $kind: 'Interpolation',
      parts: ['', ''],
      expressions: [propertyAst],
      isMulti: false,
      firstExpression: propertyAst,
    } as const;
    const parser = new AotExpressionParser([
      plainInterpolation,
      { expressionType: 'Interpolation', source: '${message}', value: interpolationAst },
    ]);

    expect(parser.parse('greeting', 'Interpolation')).toBeUndefined();
    expect(parser.parse('${message}', 'Interpolation')).toBe(interpolationAst);
    expect(() => parser.parse('missing', 'Interpolation')).toThrowError(
      'AOT expression parser has no precompiled Interpolation source "missing".',
    );
    expect(() => parser.parse('greeting', 'IsProperty')).toThrowError(
      'AOT expression parser has no precompiled IsProperty source "greeting".',
    );
    expect(() => new AotExpressionParser([]).parse('greeting', 'Interpolation')).toThrowError(
      'AOT expression parser has no precompiled Interpolation source "greeting".',
    );
  });

  it('rejects duplicate interpolation-free entries in both the parser and runtime plan', () => {
    const duplicateEntries = [plainInterpolation, plainInterpolation];
    expect(() => new AotExpressionParser(duplicateEntries)).toThrowError(
      'AOT expression table contains duplicate Interpolation source "greeting".',
    );
    expect(() => new AotRuntimeConfigurationPlan(duplicateEntries)).toThrowError(
      'AOT runtime plan contains duplicate Interpolation source "greeting".',
    );
  });

  it('executes emitted interpolation-free results without admitting missing sources', async () => {
    const artifact = new AotRuntimeConfigurationModuleEmitter().emit(
      new AotRuntimeConfigurationPlan([...expressions, plainInterpolation]),
    );
    const outputRoot = await mkdtemp(path.resolve(import.meta.dirname, '../.tmp-runtime-configuration-'));
    const outputPath = path.join(outputRoot, 'configuration.mjs');
    try {
      await writeFile(outputPath, artifact.code, 'utf8');
      const generated = await import(pathToFileURL(outputPath).href) as {
        readonly AotExpressionParser: typeof AotExpressionParser;
        readonly AotConfiguration: AotRuntimeConfiguration;
      };
      const container = DI.createContainer();
      generated.AotConfiguration.register(container);
      const parser = container.get(IExpressionParser);
      const property = parser.parse('message', 'IsProperty');

      expect(artifact.expressionCount).toBe(3);
      expect(parser.parse('greeting', 'Interpolation')).toBeUndefined();
      expect(property).toEqual(propertyAst);
      expect(parser.parse('message', 'IsProperty')).toBe(property);
      expect(() => parser.parse('missing', 'Interpolation')).toThrowError(
        'AOT expression parser has no precompiled Interpolation source "missing".',
      );
      expect(() => parser.parse('greeting', 'IsProperty')).toThrowError(
        'AOT expression parser has no precompiled IsProperty source "greeting".',
      );
      expect(() => new generated.AotExpressionParser([]).parse('greeting', 'Interpolation')).toThrowError(
        'AOT expression parser has no precompiled Interpolation source "greeting".',
      );
      expect(() => new generated.AotExpressionParser([plainInterpolation, plainInterpolation])).toThrowError(
        'AOT expression table contains duplicate Interpolation source "greeting".',
      );
    } finally {
      await rm(outputRoot, { recursive: true, force: true });
    }
  });

  it('admits compiler-final definitions and closes the null-template AuSlot path', () => {
    const compiler = new AotTemplateCompiler();
    const compiled = { name: 'app', template: {}, needsCompile: false };
    const auSlot = { name: 'au-slot', template: null, needsCompile: true };

    expect(compiler.compile(compiled)).toBe(compiled);
    expect(compiler.compile(auSlot)).toBe(auSlot);
    expect(auSlot.needsCompile).toBe(false);
  });

  it('refuses every real template compile', () => {
    const compiler = new AotTemplateCompiler();

    expect(() => compiler.compile({ name: 'late-view', template: '<p>late</p>', needsCompile: true }))
      .toThrowError('AOT template compiler refused runtime compilation for "late-view".');
  });

  it('returns the cached instructions for one exact attached spread case', () => {
    const compiler = new AotTemplateCompiler();
    const requestor = {
      name: 'field-shell',
      key: 'au:resource:custom-element:field-shell',
    };
    const captures = [{
      rawName: 'value.bind',
      rawValue: 'request.customerName',
      target: 'value',
      command: 'bind',
      parts: null,
    }];
    const target = {
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      localName: 'input',
      nodeName: 'INPUT',
    };
    const instructions = [{ type: 34, value: 'text', to: 'type' }] as const;
    const spreadCase = {
      captureOrdinals: [0],
      requestorName: requestor.name,
      requestorKey: requestor.key,
      requestorDefinitionIdentity: null,
      targetNamespaceUri: target.namespaceURI,
      targetLocalName: target.localName,
      targetDefinitionMatch: 'structural',
      targetDefinitionName: null,
      targetDefinitionKey: null,
      targetDefinitionIdentity: null,
      instructions,
    } satisfies AotRuntimeSpreadPlanCase;
    attachSpreadPlan(captures, [spreadCase]);
    const unavailableContainer = new Proxy({}, {
      get() {
        throw new Error('compileSpread consulted the runtime container');
      },
    });

    expect(AOT_RUNTIME_SPREAD_PLAN).toBe(Symbol.for(AOT_RUNTIME_SPREAD_PLAN_PROTOCOL));
    expect(AotTemplateCompiler.spreadPlan).toBe(AOT_RUNTIME_SPREAD_PLAN);
    expect(AotTemplateCompiler.spreadCapture).toBe(AOT_RUNTIME_SPREAD_CAPTURE);
    expect(AotTemplateCompiler.definitionIdentity).toBe(AOT_COMPILED_DEFINITION_IDENTITY);
    expect(Object.getOwnPropertyDescriptor(captures, AOT_RUNTIME_SPREAD_PLAN)).toMatchObject({
      enumerable: false,
      value: [spreadCase],
    });
    expect(compiler.compileSpread(requestor, [], unavailableContainer, target)).toEqual([]);
    expect(compiler.compileSpread(requestor, captures, unavailableContainer, target)).toBe(instructions);
    expect(AotTemplateCompiler.toString()).toContain(AOT_RUNTIME_SPREAD_PLAN_PROTOCOL);
    expect(AotTemplateCompiler.toString()).not.toContain('AOT_RUNTIME_SPREAD_PLAN');
  });

  it('fails closed for untagged, unmatched, and ambiguous spread plans', () => {
    const compiler = new AotTemplateCompiler();
    const requestor = {
      name: 'field-shell',
      key: 'au:resource:custom-element:field-shell',
    };
    const input = {
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      localName: 'input',
    };
    const instructions = [{ type: 34, value: 'text', to: 'type' }] as const;
    const spreadCase = {
      captureOrdinals: [0],
      requestorName: requestor.name,
      requestorKey: requestor.key,
      requestorDefinitionIdentity: null,
      targetNamespaceUri: input.namespaceURI,
      targetLocalName: input.localName,
      targetDefinitionMatch: 'structural',
      targetDefinitionName: null,
      targetDefinitionKey: null,
      targetDefinitionIdentity: null,
      instructions,
    } satisfies AotRuntimeSpreadPlanCase;
    const tagged = [{}];
    attachSpreadPlan(tagged, [spreadCase]);
    const ambiguous = [{}];
    attachSpreadPlan(ambiguous, [spreadCase, { ...spreadCase, instructions: [{ type: 34, value: 'email', to: 'type' }] }]);
    const customTarget = { ...input, localName: 'target-card' };
    const firstCustomCase = {
      ...spreadCase,
      targetLocalName: customTarget.localName,
      targetDefinitionName: 'first-target-card',
      targetDefinitionKey: 'au:resource:custom-element:first-target-card',
    };
    const secondCustomCase = {
      ...firstCustomCase,
      targetDefinitionName: 'second-target-card',
      targetDefinitionKey: 'au:resource:custom-element:second-target-card',
      instructions: [{ type: 34, value: 'email', to: 'type' }] as const,
    };
    const explicitSecondCustomCase = {
      ...secondCustomCase,
      targetDefinitionMatch: 'explicit-definition' as const,
      targetDefinitionIdentity: 'second-target-definition',
    };
    const singleCustomTarget = [{}];
    attachSpreadPlan(singleCustomTarget, [firstCustomCase]);
    const ambiguousCustomTarget = [{}];
    attachSpreadPlan(ambiguousCustomTarget, [firstCustomCase, secondCustomCase]);
    const explicitCustomTarget = [{}];
    attachSpreadPlan(explicitCustomTarget, [firstCustomCase, explicitSecondCustomCase]);
    const explicitOnlyCustomTarget = [{}];
    attachSpreadPlan(explicitOnlyCustomTarget, [explicitSecondCustomCase]);

    expect(() => compiler.compileSpread(requestor, [{}], {}, input)).toThrowError(
      'AOT template compiler has no precompiled spread plan for 1 captured attributes on requestor "field-shell" ("au:resource:custom-element:field-shell").',
    );
    expect(() => compiler.compileSpread(requestor, tagged, {}, { ...input, localName: 'textarea' }))
      .toThrowError(/spread plan has no case/u);
    expect(() => compiler.compileSpread(requestor, tagged, {}, input, {
      name: 'target-card',
      key: 'au:resource:custom-element:target-card',
    })).toThrowError(/spread plan has no case/u);
    expect(() => compiler.compileSpread(requestor, ambiguous, {}, input))
      .toThrowError(/spread plan has 2 ambiguous cases/u);
    expect(compiler.compileSpread(requestor, singleCustomTarget, {}, customTarget))
      .toBe(firstCustomCase.instructions);
    expect(() => compiler.compileSpread(requestor, ambiguousCustomTarget, {}, customTarget))
      .toThrowError(/spread plan has 2 ambiguous cases/u);
    expect(() => compiler.compileSpread(requestor, explicitOnlyCustomTarget, {}, customTarget))
      .toThrowError(/spread plan has no case/u);
    const explicitDefinition = {
      name: explicitSecondCustomCase.targetDefinitionName,
      key: explicitSecondCustomCase.targetDefinitionKey,
      [AOT_COMPILED_DEFINITION_IDENTITY]: explicitSecondCustomCase.targetDefinitionIdentity,
    };
    expect(compiler.compileSpread(
      requestor,
      explicitCustomTarget,
      {},
      customTarget,
      explicitDefinition,
    )).toBe(explicitSecondCustomCase.instructions);
  });

  it('selects whole precompiled capture partitions by retained syntax and exact definition identity', () => {
    const compiler = new AotTemplateCompiler();
    const requestor = { name: 'au-compose', key: 'au:resource:custom-element:au-compose' };
    const component = {
      name: 'field', key: 'au:resource:custom-element:field',
      [AOT_COMPILED_DEFINITION_IDENTITY]: 'field-A',
    };
    const otherComponent = { ...component, [AOT_COMPILED_DEFINITION_IDENTITY]: 'field-B' };
    const host = { namespaceURI: 'http://www.w3.org/1999/xhtml', localName: 'field' };
    const captures = [{ target: 'value' }, { target: 'class' }, { target: 'title' }];
    const transferred = [{ type: 51, instruction: { type: 10, value: 'value', to: 'value' } }] as const;
    const forwarded = [{ type: 35, value: 'field' }, { type: 34, value: 'title', to: 'title' }] as const;
    const hostCase: AotRuntimeSpreadPlanCase = {
      captureOrdinals: [0],
      requestorName: requestor.name, requestorKey: requestor.key, requestorDefinitionIdentity: null,
      targetNamespaceUri: host.namespaceURI, targetLocalName: host.localName,
      targetDefinitionMatch: 'explicit-definition', targetDefinitionName: component.name,
      targetDefinitionKey: component.key, targetDefinitionIdentity: 'field-A', instructions: transferred,
    };
    const forwardedCase: AotRuntimeSpreadPlanCase = {
      captureOrdinals: [1, 2],
      requestorName: component.name, requestorKey: component.key, requestorDefinitionIdentity: 'field-A',
      targetNamespaceUri: host.namespaceURI, targetLocalName: 'input', targetDefinitionMatch: 'structural',
      targetDefinitionName: null, targetDefinitionKey: null, targetDefinitionIdentity: null, instructions: forwarded,
    };
    attachSpreadPlan(captures, [hostCase, forwardedCase]);
    const [captured, transfer] = captures.reduce<[object[], object[]]>((groups, syntax) => {
      groups[syntax.target === 'value' ? 1 : 0].push(syntax);
      return groups;
    }, [[], []]);
    expect(Object.getOwnPropertySymbols(transfer)).toEqual([]);
    expect(compiler.compileSpread(requestor, transfer, {}, host, component)).toBe(transferred);
    expect(compiler.compileSpread(component, captured, {}, { ...host, localName: 'input' })).toBe(forwarded);
    expect(() => compiler.compileSpread(requestor, transfer, {}, host, otherComponent)).toThrow(/no case/u);
    expect(() => compiler.compileSpread(requestor, transfer, {}, host, { name: component.name, key: component.key }))
      .toThrow(/no case/u);
    expect(() => compiler.compileSpread(otherComponent, captured, {}, { ...host, localName: 'input' })).toThrow(/no case/u);
    expect(() => compiler.compileSpread(component, [...captured].reverse(), {}, { ...host, localName: 'input' }))
      .toThrow(/no case/u);
    expect(() => compiler.compileSpread(component, [captures[1], { ...captures[2] }], {}, { ...host, localName: 'input' }))
      .toThrow(/one emitted capture origin/u);
    const foreign = [{ target: 'title' }];
    attachSpreadPlan(foreign, [forwardedCase]);
    expect(() => compiler.compileSpread(component, [captures[1], foreign[0]], {}, { ...host, localName: 'input' }))
      .toThrow(/one emitted capture origin/u);
    expect(() => compiler.compileSpread(requestor, captures, {}, host, component)).toThrow(/no case/u);
    expect(compiler.compileSpread(requestor, [], {}, host, component)).toEqual([]);
  });

  it('registers the conservative surface in StandardConfiguration-compatible order', () => {
    const groups = {
      coercion: Symbol('coercion'),
      parser: Symbol('parser'),
      compiler: Symbol('compiler'),
      dirty: Symbol('dirty'),
      node: Symbol('node'),
      resources: [Symbol('resource-1'), Symbol('resource-2')],
      eventModifier: Symbol('event-modifier'),
      renderers: [Symbol('renderer-1'), Symbol('renderer-2')],
    };
    let registrations: readonly unknown[] = [];
    const container = {
      register(...values: unknown[]) {
        registrations = values;
        return this;
      },
    };
    const configuration = new AotRuntimeConfiguration(
      groups.coercion,
      groups.parser,
      groups.compiler,
      groups.dirty,
      groups.node,
      groups.resources,
      groups.eventModifier,
      groups.renderers,
    );

    expect(configuration.register(container)).toBe(container);
    expect(registrations).toEqual([
      groups.coercion,
      groups.parser,
      groups.compiler,
      groups.dirty,
      groups.node,
      ...groups.resources,
      groups.eventModifier,
      ...groups.renderers,
    ]);
    expect(AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER).toEqual([
      'coercion',
      'expression-parser',
      'template-compiler',
      'dirty-checker',
      'node-observer-locator',
      'default-resources',
      'event-modifier',
      'default-renderers',
    ]);
  });

  it('omits an absent event modifier without registering a null placeholder', () => {
    const groups = {
      coercion: Symbol('coercion'),
      parser: Symbol('parser'),
      compiler: Symbol('compiler'),
      dirty: Symbol('dirty'),
      node: Symbol('node'),
      resource: Symbol('resource'),
      renderer: Symbol('renderer'),
    };
    let registrations: readonly unknown[] = [];
    const container = {
      register(...values: unknown[]) {
        registrations = values;
        return this;
      },
    };
    const configuration = new AotRuntimeConfiguration(
      groups.coercion,
      groups.parser,
      groups.compiler,
      groups.dirty,
      groups.node,
      [groups.resource],
      null,
      [groups.renderer],
    );

    expect(configuration.register(container)).toBe(container);
    expect(registrations).toEqual([
      groups.coercion,
      groups.parser,
      groups.compiler,
      groups.dirty,
      groups.node,
      groups.resource,
      groups.renderer,
    ]);
    expect(registrations).not.toContain(null);
  });

  it('retains conservative event services when exact resource and renderer groups are empty', () => {
    const eventModifier = runtimeHtmlReference('EventModifierRegistration');
    const registrations: AotRuntimeRegistrationPlan = {
      resources: { kind: 'exact-leaves', leaves: [] },
      eventModifier,
      renderers: { kind: 'exact-leaves', leaves: [] },
    };
    const artifact = new AotRuntimeConfigurationModuleEmitter().emit(
      new AotRuntimeConfigurationPlan([], void 0, registrations),
    );
    const eventAlias = importedRegistrationAlias(artifact.code, eventModifier);

    expect(artifact.registrationOrder).toEqual([
      'coercion',
      'expression-parser',
      'template-compiler',
      'dirty-checker',
      'node-observer-locator',
      'event-modifier',
    ]);
    expect(artifact.code).toContain(`  [],\n  ${eventAlias},\n  [],\n);`);
    expect(artifact.code).not.toContain('DefaultResources');
    expect(artifact.code).not.toContain('DefaultRenderers');
    expect(artifact.code).not.toContain('DefaultBindingSyntax');

    const container = DI.createContainer();
    new AotRuntimeConfiguration(
      null,
      null,
      null,
      null,
      null,
      [],
      EventModifierRegistration,
      [],
    ).register(container);

    expect(container.getAll(IEventModifier)).toHaveLength(1);
    expect(container.has(IModifiedEventHandlerCreator, false)).toBe(true);
    expect(container.get(IModifiedEventHandlerCreator)).toBeDefined();
  });

  it('replaces compiler/parser services while retaining the ordinary framework registrations', () => {
    const container = DI.createContainer();
    const parser = new AotExpressionParser(expressions);
    const compiler = new AotTemplateCompiler();
    const coercion = { enableCoercion: false, coerceNullish: false };
    const configuration = new AotRuntimeConfiguration(
      Registration.instance(ICoercionConfiguration, coercion),
      Registration.instance(IExpressionParser, parser),
      Registration.instance(ITemplateCompiler, compiler),
      DirtyChecker,
      NodeObserverLocator,
      DefaultResources,
      EventModifierRegistration,
      DefaultRenderers,
    );

    configuration.register(container);

    expect(container.get(IExpressionParser)).toBe(parser);
    expect(container.get(ITemplateCompiler)).toBe(compiler);
    expect(container.get(ICoercionConfiguration)).toBe(coercion);
    expect(container.has(IDirtyChecker, false)).toBe(true);
    expect(container.has(INodeObserverLocator, false)).toBe(true);
    expect(container.has(IEventModifier, false)).toBe(true);
    expect(container.has(IRenderer, false)).toBe(true);
  });

  it('emits one build-specific browser module with an AOT-native quick-start facade', () => {
    const plan = new AotRuntimeConfigurationPlan([...expressions].reverse(), {
      enableCoercion: true,
      coerceNullish: true,
    });
    const artifact = new AotRuntimeConfigurationModuleEmitter().emit(plan);

    expect(artifact.protocol).toBe(AOT_RUNTIME_CONFIGURATION_PROTOCOL);
    expect(artifact.moduleId).toMatch(
      /^virtual:aurelia-aot\/configuration\/[a-f0-9]{64}$/u,
    );
    expect(artifact.moduleId.startsWith(AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX)).toBe(true);
    expect(artifact.planDigest).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(artifact.expressionCount).toBe(2);
    expect(artifact.registrationOrder).toBe(AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER);
    expect(artifact.digest).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(artifact.code).not.toContain('StandardConfiguration');
    expect(artifact.code).not.toContain('DefaultBindingSyntax');
    expect(artifact.code).not.toContain('DefaultBindingLanguage');
    expect(artifact.code).not.toContain('@aurelia-ls/aot');
    expect(artifact.code).not.toContain("from 'aurelia'");
    expect(artifact.code).toContain('import { DI, Registration } from "@aurelia/kernel";');
    expect(artifact.code).toContain('import { IExpressionParser } from "@aurelia/expression-parser";');
    expect(artifact.code).toContain('import { BrowserPlatform } from "@aurelia/platform-browser";');
    expect(artifact.code).toContain('import { ITemplateCompiler } from "@aurelia/template-compiler";');
    expect(artifact.code).toContain('Aurelia as RuntimeHtmlAurelia');
    expect(artifact.code).toContain('export class AotExpressionParser');
    expect(artifact.code).toContain('export class AotTemplateCompiler');
    expect(artifact.code).toContain('export class AotRuntimeConfiguration');
    expect(artifact.code).toContain(
      'export const AotPlatform = BrowserPlatform.getOrCreate(globalThis);',
    );
    expect(artifact.code).toContain(
      'export class AotBrowserAurelia extends RuntimeHtmlAurelia',
    );
    expect(artifact.code).toContain('constructor(container = createAotContainer())');
    expect(artifact.code).toContain('Registration.instance(IPlatform, AotPlatform)');
    expect(artifact.code).toContain('return new AotBrowserAurelia().app(config);');
    expect(artifact.code).toContain('return new AotBrowserAurelia().enhance(config);');
    expect(artifact.code).toContain('return new AotBrowserAurelia().register(...params);');
    expect(artifact.code).toContain('if (CustomElement.isType(config))');
    expect(artifact.code).toContain('let host = document.querySelector(definition.name);');
    expect(artifact.code).toContain('host = document.body;');
    expect(artifact.code).toContain('return super.app({ host, component: config });');
    expect(artifact.code).toContain(
      `export const aotRuntimeConfigurationProtocol = ${JSON.stringify(AOT_RUNTIME_CONFIGURATION_PROTOCOL)};`,
    );
    expect(artifact.code).toContain(
      `export const aotRuntimeConfigurationPlanDigest = ${JSON.stringify(artifact.planDigest)};`,
    );
    expect(artifact.code.indexOf('"IsIterator"')).toBeLessThan(artifact.code.indexOf('"IsProperty"'));
    expect(artifact.code).toContain('"enableCoercion": true');
    expect(new AotRuntimeConfigurationModuleEmitter().emit(plan)).toEqual(artifact);
  });

  it('versions lookup compiler semantics into the runtime module address', () => {
    const artifact = new AotRuntimeConfigurationModuleEmitter().emit(new AotRuntimeConfigurationPlan());
    const legacyCanonicalPlan = emitAotJavaScriptValue({
      coercion: { enableCoercion: false, coerceNullish: false },
      expressions: [],
      protocol: 'aurelia-aot/runtime-configuration/v1',
      registrationOrder: artifact.registrationOrder,
      registrations: artifact.registrations,
    }, AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX);
    const legacyModuleId = `${AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX}${
      createHash('sha256').update(legacyCanonicalPlan).digest('hex')
    }`;

    expect(AOT_RUNTIME_CONFIGURATION_PROTOCOL).toBe('aurelia-aot/runtime-configuration/v2');
    expect(artifact.moduleId).not.toBe(legacyModuleId);
    expect(artifact.planDigest).not.toBe(`sha256:${legacyModuleId.slice(AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX.length)}`);
  });

  it('emits the storefront exact leaves in semantic order without aggregate imports', () => {
    const registrations: AotRuntimeRegistrationPlan = {
      resources: { kind: 'exact-leaves', leaves: storefrontResourceReferences },
      eventModifier: null,
      renderers: { kind: 'exact-leaves', leaves: storefrontRendererReferences },
    };
    const artifact = new AotRuntimeConfigurationModuleEmitter().emit(
      new AotRuntimeConfigurationPlan([], void 0, registrations),
    );

    expect(artifact.registrations).toBe(registrations);
    expect(artifact.registrationOrder).toEqual(
      AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER.filter((kind) => kind !== 'event-modifier'),
    );
    expect(artifact.code).not.toContain('DefaultResources');
    expect(artifact.code).not.toContain('DefaultRenderers');
    expect(artifact.code).not.toContain('EventModifierRegistration');
    for (const reference of [...storefrontResourceReferences, ...storefrontRendererReferences]) {
      expect(artifact.code).toContain(reference.exportName);
    }
    expect(artifact.code.match(/from "@aurelia\/runtime-html";/gu)).toHaveLength(1);

    const resourceAliases = storefrontResourceReferences.map((reference) =>
      importedRegistrationAlias(artifact.code, reference)
    );
    const rendererAliases = storefrontRendererReferences.map((reference) =>
      importedRegistrationAlias(artifact.code, reference)
    );
    expect(artifact.code).toContain(`  [${resourceAliases.join(', ')}],`);
    expect(artifact.code).toContain(`  [${rendererAliases.join(', ')}],`);
  });

  it('groups collision-safe leaf imports by module and admits empty slots', () => {
    const duplicateNameFromA = { moduleSpecifier: 'example-a', exportName: 'Shared' };
    const duplicateNameFromB = { moduleSpecifier: 'example-b', exportName: 'Shared' };
    const registrations: AotRuntimeRegistrationPlan = {
      resources: {
        kind: 'exact-leaves',
        leaves: [duplicateNameFromB, duplicateNameFromA],
      },
      eventModifier: null,
      renderers: { kind: 'exact-leaves', leaves: [] },
    };
    const artifact = new AotRuntimeConfigurationModuleEmitter().emit(
      new AotRuntimeConfigurationPlan([], void 0, registrations),
    );
    const aliasA = importedRegistrationAlias(artifact.code, duplicateNameFromA);
    const aliasB = importedRegistrationAlias(artifact.code, duplicateNameFromB);

    expect(aliasA).not.toBe(aliasB);
    expect(artifact.code).toContain(`import { Shared as ${aliasA} } from "example-a";`);
    expect(artifact.code).toContain(`import { Shared as ${aliasB} } from "example-b";`);
    expect(artifact.code).toContain(`  [${aliasB}, ${aliasA}],`);
    expect(artifact.code).toContain('  null,');
    expect(artifact.code).toContain('  [],');
    expect(artifact.registrationOrder).toEqual([
      'coercion',
      'expression-parser',
      'template-compiler',
      'dirty-checker',
      'node-observer-locator',
      'default-resources',
    ]);
  });

  it('addresses canonical plans independently of expression ordering', () => {
    const emitter = new AotRuntimeConfigurationModuleEmitter();
    const ordinary = emitter.emit(new AotRuntimeConfigurationPlan(expressions));
    const reordered = emitter.emit(new AotRuntimeConfigurationPlan([...expressions].reverse()));
    const coercing = emitter.emit(new AotRuntimeConfigurationPlan(expressions, {
      enableCoercion: true,
      coerceNullish: false,
    }));
    const changedAst = emitter.emit(new AotRuntimeConfigurationPlan([
      { ...expressions[0]!, value: { $kind: 'AccessScope', name: 'other', ancestor: 0 } },
      expressions[1]!,
    ]));

    expect(reordered.moduleId).toBe(ordinary.moduleId);
    expect(reordered.planDigest).toBe(ordinary.planDigest);
    expect(coercing.moduleId).not.toBe(ordinary.moduleId);
    expect(changedAst.moduleId).not.toBe(ordinary.moduleId);
  });

  it('addresses registration selection shape, event inclusion, and ordered leaves', () => {
    const emitter = new AotRuntimeConfigurationModuleEmitter();
    const first = runtimeHtmlReference('First');
    const second = runtimeHtmlReference('Second');
    const exact = (leaves: readonly AotRuntimeRegistrationReference[], eventModifier = false) =>
      emitter.emit(new AotRuntimeConfigurationPlan([], void 0, {
        resources: { kind: 'exact-leaves', leaves },
        eventModifier: eventModifier ? runtimeHtmlReference('EventModifierRegistration') : null,
        renderers: { kind: 'exact-leaves', leaves: [] },
      }));
    const ordered = exact([first, second]);
    const reordered = exact([second, first]);
    const withEventModifier = exact([first, second], true);
    const conservative = emitter.emit(new AotRuntimeConfigurationPlan([], void 0, {
      resources: { kind: 'conservative-group', group: first },
      eventModifier: null,
      renderers: { kind: 'exact-leaves', leaves: [] },
    }));

    expect(reordered.planDigest).not.toBe(ordered.planDigest);
    expect(withEventModifier.planDigest).not.toBe(ordered.planDigest);
    expect(conservative.planDigest).not.toBe(exact([first]).planDigest);
    expect(ordered.registrations.resources).toEqual({
      kind: 'exact-leaves',
      leaves: [first, second],
    });
  });

  it('rejects ambiguous expression keys before emission', () => {
    expect(() => new AotRuntimeConfigurationPlan([
      expressions[0]!,
      { ...expressions[0]!, value: { $kind: 'AccessScope', name: 'other', ancestor: 0 } },
    ])).toThrowError('AOT runtime plan contains duplicate IsProperty source "message".');
  });
});

function importedRegistrationAlias(
  code: string,
  reference: AotRuntimeRegistrationReference,
): string {
  const importLine = code.split('\n').find((line) =>
    line.endsWith(`from ${JSON.stringify(reference.moduleSpecifier)};`)
  );
  const match = importLine?.match(new RegExp(`\\b${reference.exportName} as (\\$aotRegistration\\d+)\\b`, 'u'));
  if (match?.[1] == null) {
    throw new Error(`Missing generated import for ${reference.moduleSpecifier}:${reference.exportName}.`);
  }
  return match[1];
}

function attachSpreadPlan(captures: readonly object[], plan: AotRuntimeSpreadPlan): void {
  Object.defineProperty(captures, AOT_RUNTIME_SPREAD_PLAN, { value: plan });
  captures.forEach((capture, ordinal) => {
    Object.defineProperty(capture, AOT_RUNTIME_SPREAD_CAPTURE, { value: { plan, ordinal } });
  });
}
