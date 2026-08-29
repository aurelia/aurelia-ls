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

  it('emits one build-specific browser module without importing StandardConfiguration or AOT core', () => {
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
    expect(artifact.code).toContain("import { IExpressionParser } from '@aurelia/expression-parser';");
    expect(artifact.code).toContain("import { ITemplateCompiler } from '@aurelia/template-compiler';");
    expect(artifact.code).toContain('export class AotExpressionParser');
    expect(artifact.code).toContain('export class AotTemplateCompiler');
    expect(artifact.code).toContain('export class AotRuntimeConfiguration');
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

  it('rejects ambiguous expression keys before emission', () => {
    expect(() => new AotRuntimeConfigurationPlan([
      expressions[0]!,
      { ...expressions[0]!, value: { $kind: 'AccessScope', name: 'other', ancestor: 0 } },
    ])).toThrowError('AOT runtime plan contains duplicate IsProperty source "message".');
  });
});
