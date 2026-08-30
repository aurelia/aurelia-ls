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
  AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER,
  AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX,
  AOT_RUNTIME_CONFIGURATION_PROTOCOL,
  AotExpressionParser,
  AotRuntimeConfiguration,
  AotRuntimeConfigurationModuleEmitter,
  AotRuntimeConfigurationPlan,
  AotTemplateCompiler,
  type AotRuntimeExpressionEntry,
  type AotRuntimeRegistrationPlan,
  type AotRuntimeRegistrationReference,
} from '../src/runtime-configuration.js';

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

  it('admits compiler-final definitions and closes the null-template AuSlot path', () => {
    const compiler = new AotTemplateCompiler();
    const compiled = { name: 'app', template: {}, needsCompile: false };
    const auSlot = { name: 'au-slot', template: null, needsCompile: true };

    expect(compiler.compile(compiled)).toBe(compiled);
    expect(compiler.compile(auSlot)).toBe(auSlot);
    expect(auSlot.needsCompile).toBe(false);
  });

  it('refuses every real template compile and spread compile', () => {
    const compiler = new AotTemplateCompiler();

    expect(() => compiler.compile({ name: 'late-view', template: '<p>late</p>', needsCompile: true }))
      .toThrowError('AOT template compiler refused runtime compilation for "late-view".');
    expect(() => compiler.compileSpread())
      .toThrowError('AOT template compiler refused runtime spread compilation.');
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
