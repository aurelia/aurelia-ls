import { createHash } from 'node:crypto';

import type { RuntimeExpressionAstValue } from '@aurelia-ls/semantic-runtime/browser-template';

import { emitAotJavaScriptValue } from './template-module-emitter.js';

export const AOT_RUNTIME_CONFIGURATION_PROTOCOL = 'aurelia-aot/runtime-configuration/v1';
export const AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX = 'virtual:aurelia-aot/configuration/';

export type AotRuntimeExpressionType =
  | 'None'
  | 'Interpolation'
  | 'IsIterator'
  | 'IsChainable'
  | 'IsFunction'
  | 'IsProperty'
  | 'IsCustom';

export interface AotRuntimeExpressionEntry {
  readonly expressionType: AotRuntimeExpressionType;
  readonly source: string;
  /** The exact framework-shaped AST already projected into the compiled handoff. */
  readonly value: RuntimeExpressionAstValue;
}

export interface AotRuntimeCoercionOptions {
  readonly enableCoercion: boolean;
  readonly coerceNullish: boolean;
}

export type AotRuntimeRegistrationKind =
  | 'coercion'
  | 'expression-parser'
  | 'template-compiler'
  | 'dirty-checker'
  | 'node-observer-locator'
  | 'default-resources'
  | 'event-modifier'
  | 'default-renderers';

/**
 * The first AOT configuration deliberately preserves StandardConfiguration's ordinary runtime surface.
 * Selective registration pruning is a later whole-program decision.
 */
export const AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER: readonly AotRuntimeRegistrationKind[] = [
  'coercion',
  'expression-parser',
  'template-compiler',
  'dirty-checker',
  'node-observer-locator',
  'default-resources',
  'event-modifier',
  'default-renderers',
];

const defaultCoercionOptions: AotRuntimeCoercionOptions = {
  enableCoercion: false,
  coerceNullish: false,
};

/** Build-owned inputs for one conservative AOT runtime module. */
export class AotRuntimeConfigurationPlan {
  public readonly registrationOrder = AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER;

  public constructor(
    public readonly expressions: readonly AotRuntimeExpressionEntry[] = [],
    public readonly coercion: AotRuntimeCoercionOptions = defaultCoercionOptions,
  ) {
    assertDistinctExpressions(expressions);
  }
}

export interface AotRuntimeConfigurationModuleArtifact {
  readonly protocol: typeof AOT_RUNTIME_CONFIGURATION_PROTOCOL;
  readonly moduleId: `${typeof AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX}${string}`;
  readonly planDigest: string;
  readonly code: string;
  readonly digest: string;
  readonly expressionCount: number;
  readonly registrationOrder: readonly AotRuntimeRegistrationKind[];
}

/** A string-only expression service: every admitted runtime request must have an emitted AST. */
export class AotExpressionParser {
  readonly #lookup = new Map<AotRuntimeExpressionType, Map<string, RuntimeExpressionAstValue>>();

  public constructor(entries: readonly AotRuntimeExpressionEntry[]) {
    for (const entry of entries) {
      let expressions = this.#lookup.get(entry.expressionType);
      if (expressions == null) {
        this.#lookup.set(
          entry.expressionType,
          expressions = new Map<string, RuntimeExpressionAstValue>(),
        );
      }
      if (expressions.has(entry.source)) {
        throw new Error(
          `AOT expression table contains duplicate ${entry.expressionType} source ${JSON.stringify(entry.source)}.`,
        );
      }
      expressions.set(entry.source, entry.value);
    }
  }

  public parse(source: string, expressionType: AotRuntimeExpressionType): RuntimeExpressionAstValue {
    const value = this.#lookup.get(expressionType)?.get(source);
    if (value === void 0) {
      throw new Error(
        `AOT expression parser has no precompiled ${expressionType} source ${JSON.stringify(source)}.`,
      );
    }
    return value;
  }
}

interface AotCompilableDefinition {
  readonly name?: string;
  readonly template?: unknown;
  needsCompile?: boolean;
}

/** Compiler-interface closure for compiler-final definitions and Aurelia's null-template built-ins. */
export class AotTemplateCompiler {
  public debug = false;
  public resolveResources = true;

  public compile<TDefinition extends AotCompilableDefinition>(definition: TDefinition): TDefinition {
    if (definition.needsCompile === false) return definition;
    if (definition.template == null) {
      definition.needsCompile = false;
      return definition;
    }
    throw new Error(
      `AOT template compiler refused runtime compilation for ${JSON.stringify(definition.name ?? '(anonymous)')}.`,
    );
  }

  public compileSpread(): never {
    throw new Error('AOT template compiler refused runtime spread compilation.');
  }
}

interface AotRegistrationContainer {
  register(...registrations: unknown[]): unknown;
}

/** Fixed registration order shared by generated modules and direct DI contract tests. */
export class AotRuntimeConfiguration {
  public constructor(
    public readonly coercionRegistration: unknown,
    public readonly expressionParserRegistration: unknown,
    public readonly templateCompilerRegistration: unknown,
    public readonly dirtyCheckerRegistration: unknown,
    public readonly nodeObserverLocatorRegistration: unknown,
    public readonly defaultResources: readonly unknown[],
    public readonly eventModifierRegistration: unknown,
    public readonly defaultRenderers: readonly unknown[],
  ) {}

  public register(container: AotRegistrationContainer): unknown {
    return container.register(
      this.coercionRegistration,
      this.expressionParserRegistration,
      this.templateCompilerRegistration,
      this.dirtyCheckerRegistration,
      this.nodeObserverLocatorRegistration,
      ...this.defaultResources,
      this.eventModifierRegistration,
      ...this.defaultRenderers,
    );
  }
}

/** Emit the browser-side configuration as a build-specific virtual module, not an import of this Node package. */
export class AotRuntimeConfigurationModuleEmitter {
  public emit(plan: AotRuntimeConfigurationPlan): AotRuntimeConfigurationModuleArtifact {
    const expressions = [...plan.expressions].sort((left, right) =>
      left.expressionType.localeCompare(right.expressionType) || left.source.localeCompare(right.source)
    );
    const expressionValues = expressions.map((entry) => [
      entry.expressionType,
      entry.source,
      entry.value,
    ]);
    const canonicalPlan = emitAotJavaScriptValue({
      coercion: plan.coercion,
      expressions: expressionValues,
      protocol: AOT_RUNTIME_CONFIGURATION_PROTOCOL,
    }, AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX);
    const planHash = createHash('sha256').update(canonicalPlan).digest('hex');
    const planDigest = `sha256:${planHash}`;
    const moduleId = `${AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX}${planHash}` as const;
    const lines = [
      "import { Registration } from '@aurelia/kernel';",
      "import { IExpressionParser } from '@aurelia/expression-parser';",
      "import { DirtyChecker, ICoercionConfiguration } from '@aurelia/runtime';",
      "import { ITemplateCompiler } from '@aurelia/template-compiler';",
      'import {',
      '  DefaultRenderers,',
      '  DefaultResources,',
      '  EventModifierRegistration,',
      '  NodeObserverLocator,',
      "} from '@aurelia/runtime-html';",
      '',
      `export ${AotExpressionParser.toString()}`,
      '',
      `export ${AotTemplateCompiler.toString()}`,
      '',
      `export ${AotRuntimeConfiguration.toString()}`,
      '',
      `export const aotRuntimeConfigurationProtocol = ${JSON.stringify(AOT_RUNTIME_CONFIGURATION_PROTOCOL)};`,
      `export const aotRuntimeConfigurationPlanDigest = ${JSON.stringify(planDigest)};`,
      '',
      `const $expressions = ${emitAotJavaScriptValue(expressionValues, moduleId)}`,
      '  .map(([expressionType, source, value]) => ({ expressionType, source, value }));',
      '',
      'export const AotConfiguration = new AotRuntimeConfiguration(',
      `  Registration.instance(ICoercionConfiguration, ${emitAotJavaScriptValue(plan.coercion, moduleId)}),`,
      '  Registration.instance(IExpressionParser, new AotExpressionParser($expressions)),',
      '  Registration.instance(ITemplateCompiler, new AotTemplateCompiler()),',
      '  DirtyChecker,',
      '  NodeObserverLocator,',
      '  DefaultResources,',
      '  EventModifierRegistration,',
      '  DefaultRenderers,',
      ');',
      '',
      'export default AotConfiguration;',
      '',
    ];
    const code = lines.join('\n');
    return {
      protocol: AOT_RUNTIME_CONFIGURATION_PROTOCOL,
      moduleId,
      planDigest,
      code,
      digest: `sha256:${createHash('sha256').update(code).digest('hex')}`,
      expressionCount: expressions.length,
      registrationOrder: plan.registrationOrder,
    };
  }
}

function assertDistinctExpressions(expressions: readonly AotRuntimeExpressionEntry[]): void {
  const keys = new Set<string>();
  for (const expression of expressions) {
    const key = `${expression.expressionType}\0${expression.source}`;
    if (keys.has(key)) {
      throw new Error(
        `AOT runtime plan contains duplicate ${expression.expressionType} source ${JSON.stringify(expression.source)}.`,
      );
    }
    keys.add(key);
  }
}
