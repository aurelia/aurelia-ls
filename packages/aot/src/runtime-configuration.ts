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

/** One public runtime registration value that a generated module can import directly. */
export interface AotRuntimeRegistrationReference {
  readonly moduleSpecifier: string;
  readonly exportName: string;
}

/** Aggregate fallback or exact ordered leaves for one independently residualizable runtime slot. */
export type AotRuntimeRegistrationSelection =
  | {
    readonly kind: 'conservative-group';
    readonly group: AotRuntimeRegistrationReference;
  }
  | {
    readonly kind: 'exact-leaves';
    readonly leaves: readonly AotRuntimeRegistrationReference[];
  };

/** Build-owned registration selections. Semantic-runtime decides whether each slot is closed. */
export interface AotRuntimeRegistrationPlan {
  readonly resources: AotRuntimeRegistrationSelection;
  readonly eventModifier: AotRuntimeRegistrationReference | null;
  readonly renderers: AotRuntimeRegistrationSelection;
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
 * Default registration order used when semantic-runtime cannot close an independently selectable runtime group.
 * Exact leaf plans retain the same relative family order while omitting families with no required members.
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

const runtimeHtmlRegistration = (exportName: string): AotRuntimeRegistrationReference => ({
  moduleSpecifier: '@aurelia/runtime-html',
  exportName,
});

const conservativeRuntimeRegistrations: AotRuntimeRegistrationPlan = {
  resources: {
    kind: 'conservative-group',
    group: runtimeHtmlRegistration('DefaultResources'),
  },
  eventModifier: runtimeHtmlRegistration('EventModifierRegistration'),
  renderers: {
    kind: 'conservative-group',
    group: runtimeHtmlRegistration('DefaultRenderers'),
  },
};

/** Build-owned inputs for one AOT runtime module. */
export class AotRuntimeConfigurationPlan {
  public readonly registrationOrder: readonly AotRuntimeRegistrationKind[];

  public constructor(
    public readonly expressions: readonly AotRuntimeExpressionEntry[] = [],
    public readonly coercion: AotRuntimeCoercionOptions = defaultCoercionOptions,
    public readonly registrations: AotRuntimeRegistrationPlan = conservativeRuntimeRegistrations,
  ) {
    assertDistinctExpressions(expressions);
    this.registrationOrder = registrations === conservativeRuntimeRegistrations
      ? AOT_CONSERVATIVE_RUNTIME_REGISTRATION_ORDER
      : effectiveRuntimeRegistrationOrder(registrations);
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
  readonly registrations: AotRuntimeRegistrationPlan;
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
    public readonly resources: readonly unknown[],
    /** Null is the generated-module sentinel for an omitted event modifier registration. */
    public readonly eventModifierRegistration: unknown,
    public readonly renderers: readonly unknown[],
  ) {}

  public register(container: AotRegistrationContainer): unknown {
    if (this.eventModifierRegistration == null) {
      return container.register(
        this.coercionRegistration,
        this.expressionParserRegistration,
        this.templateCompilerRegistration,
        this.dirtyCheckerRegistration,
        this.nodeObserverLocatorRegistration,
        ...this.resources,
        ...this.renderers,
      );
    }
    return container.register(
      this.coercionRegistration,
      this.expressionParserRegistration,
      this.templateCompilerRegistration,
      this.dirtyCheckerRegistration,
      this.nodeObserverLocatorRegistration,
      ...this.resources,
      this.eventModifierRegistration,
      ...this.renderers,
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
      registrationOrder: plan.registrationOrder,
      registrations: plan.registrations,
    }, AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX);
    const planHash = createHash('sha256').update(canonicalPlan).digest('hex');
    const planDigest = `sha256:${planHash}`;
    const moduleId = `${AOT_RUNTIME_CONFIGURATION_MODULE_PREFIX}${planHash}` as const;
    const registrationImports = runtimeRegistrationImports(plan.registrations);
    const lines = [
      ...registrationImports.lines,
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
      `  ${runtimeRegistrationSelectionExpression(plan.registrations.resources, registrationImports)},`,
      `  ${plan.registrations.eventModifier == null
        ? 'null'
        : registrationImports.localNameFor(plan.registrations.eventModifier)},`,
      `  ${runtimeRegistrationSelectionExpression(plan.registrations.renderers, registrationImports)},`,
      ');',
      '',
      ...emitAotBrowserFacade(),
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
      registrations: plan.registrations,
    };
  }
}

interface RuntimeRegistrationImports {
  readonly lines: readonly string[];
  localNameFor(reference: AotRuntimeRegistrationReference): string;
}

function runtimeRegistrationImports(plan: AotRuntimeRegistrationPlan): RuntimeRegistrationImports {
  const fixedBindings = [
    { moduleSpecifier: '@aurelia/kernel', exportName: 'DI', localName: 'DI' },
    { moduleSpecifier: '@aurelia/kernel', exportName: 'Registration', localName: 'Registration' },
    {
      moduleSpecifier: '@aurelia/expression-parser',
      exportName: 'IExpressionParser',
      localName: 'IExpressionParser',
    },
    {
      moduleSpecifier: '@aurelia/platform-browser',
      exportName: 'BrowserPlatform',
      localName: 'BrowserPlatform',
    },
    { moduleSpecifier: '@aurelia/runtime', exportName: 'DirtyChecker', localName: 'DirtyChecker' },
    {
      moduleSpecifier: '@aurelia/runtime',
      exportName: 'ICoercionConfiguration',
      localName: 'ICoercionConfiguration',
    },
    {
      moduleSpecifier: '@aurelia/template-compiler',
      exportName: 'ITemplateCompiler',
      localName: 'ITemplateCompiler',
    },
    {
      moduleSpecifier: '@aurelia/runtime-html',
      exportName: 'Aurelia',
      localName: 'RuntimeHtmlAurelia',
    },
    {
      moduleSpecifier: '@aurelia/runtime-html',
      exportName: 'CustomElement',
      localName: 'CustomElement',
    },
    {
      moduleSpecifier: '@aurelia/runtime-html',
      exportName: 'IPlatform',
      localName: 'IPlatform',
    },
    {
      moduleSpecifier: '@aurelia/runtime-html',
      exportName: 'NodeObserverLocator',
      localName: 'NodeObserverLocator',
    },
  ] as const;
  const references = [
    ...runtimeRegistrationSelectionReferences(plan.resources),
    ...(plan.eventModifier == null ? [] : [plan.eventModifier]),
    ...runtimeRegistrationSelectionReferences(plan.renderers),
  ];
  const uniqueReferences = new Map<string, AotRuntimeRegistrationReference>();
  for (const reference of references) {
    uniqueReferences.set(runtimeRegistrationReferenceKey(reference), reference);
  }

  const orderedReferences = [...uniqueReferences.values()].sort((left, right) =>
    left.moduleSpecifier.localeCompare(right.moduleSpecifier)
    || left.exportName.localeCompare(right.exportName)
  );
  const localNames = new Map<string, string>();
  const bindingsByModule = new Map<string, { exportName: string; localName: string }[]>();
  for (const binding of fixedBindings) {
    let bindings = bindingsByModule.get(binding.moduleSpecifier);
    if (bindings == null) {
      bindingsByModule.set(binding.moduleSpecifier, bindings = []);
    }
    bindings.push({ exportName: binding.exportName, localName: binding.localName });
    localNames.set(runtimeRegistrationReferenceKey(binding), binding.localName);
  }

  let generatedIndex = 0;
  for (const reference of orderedReferences) {
    const key = runtimeRegistrationReferenceKey(reference);
    if (localNames.has(key)) continue;

    const localName = `$aotRegistration${generatedIndex++}`;
    localNames.set(key, localName);
    let bindings = bindingsByModule.get(reference.moduleSpecifier);
    if (bindings == null) {
      bindingsByModule.set(reference.moduleSpecifier, bindings = []);
    }
    bindings.push({ exportName: reference.exportName, localName });
  }

  const lines = [...bindingsByModule.entries()].map(([moduleSpecifier, bindings]) =>
    `import { ${bindings.map(({ exportName, localName }) =>
      exportName === localName ? exportName : `${exportName} as ${localName}`
    ).join(', ')} } from ${JSON.stringify(moduleSpecifier)};`
  );
  return {
    lines,
    localNameFor(reference) {
      const localName = localNames.get(runtimeRegistrationReferenceKey(reference));
      if (localName == null) {
        throw new Error(
          `AOT runtime registration import is missing ${reference.moduleSpecifier}:${reference.exportName}.`,
        );
      }
      return localName;
    },
  };
}

function runtimeRegistrationSelectionExpression(
  selection: AotRuntimeRegistrationSelection,
  imports: RuntimeRegistrationImports,
): string {
  if (selection.kind === 'conservative-group') {
    return imports.localNameFor(selection.group);
  }
  return `[${selection.leaves.map((leaf) => imports.localNameFor(leaf)).join(', ')}]`;
}

function runtimeRegistrationSelectionReferences(
  selection: AotRuntimeRegistrationSelection,
): readonly AotRuntimeRegistrationReference[] {
  return selection.kind === 'conservative-group' ? [selection.group] : selection.leaves;
}

function runtimeRegistrationReferenceKey(reference: AotRuntimeRegistrationReference): string {
  return `${reference.moduleSpecifier}\0${reference.exportName}`;
}

function effectiveRuntimeRegistrationOrder(
  plan: AotRuntimeRegistrationPlan,
): readonly AotRuntimeRegistrationKind[] {
  const order: AotRuntimeRegistrationKind[] = [
    'coercion',
    'expression-parser',
    'template-compiler',
    'dirty-checker',
    'node-observer-locator',
  ];
  if (runtimeRegistrationSelectionReferences(plan.resources).length > 0) {
    order.push('default-resources');
  }
  if (plan.eventModifier != null) {
    order.push('event-modifier');
  }
  if (runtimeRegistrationSelectionReferences(plan.renderers).length > 0) {
    order.push('default-renderers');
  }
  return order;
}

/**
 * The browser facade is emitted explicitly because it belongs to the generated module, not to this
 * Node-side package. Keeping its imported names visible here avoids a class-toString contract whose
 * lexical dependencies could drift independently of the generated imports.
 */
function emitAotBrowserFacade(): string[] {
  return [
    'export const AotPlatform = BrowserPlatform.getOrCreate(globalThis);',
    '',
    'function createAotContainer() {',
    '  return DI.createContainer().register(',
    '    Registration.instance(IPlatform, AotPlatform),',
    '    AotConfiguration,',
    '  );',
    '}',
    '',
    'export class AotBrowserAurelia extends RuntimeHtmlAurelia {',
    '  constructor(container = createAotContainer()) {',
    '    super(container);',
    '  }',
    '',
    '  static app(config) {',
    '    return new AotBrowserAurelia().app(config);',
    '  }',
    '',
    '  static enhance(config) {',
    '    return new AotBrowserAurelia().enhance(config);',
    '  }',
    '',
    '  static register(...params) {',
    '    return new AotBrowserAurelia().register(...params);',
    '  }',
    '',
    '  app(config) {',
    '    if (CustomElement.isType(config)) {',
    '      const definition = CustomElement.getDefinition(config);',
    '      let host = document.querySelector(definition.name);',
    '      if (host === null) {',
    '        host = document.body;',
    '      }',
    '      return super.app({ host, component: config });',
    '    }',
    '',
    '    return super.app(config);',
    '  }',
    '}',
  ];
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
