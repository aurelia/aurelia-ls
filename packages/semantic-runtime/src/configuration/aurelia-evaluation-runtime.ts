import ts from 'typescript';
import {
  EvaluationBindingKind,
  ModuleEnvironmentRecord,
} from '../evaluation/environment.js';
import type { StaticEvaluationRuntimeHost } from '../evaluation/evaluator.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import {
  EvaluationImportKind,
  type EvaluationImportEntry,
} from '../evaluation/module-graph.js';
import type { StaticModuleExternalValueResolver } from '../evaluation/module-evaluator.js';
import {
  ModuleLoader,
  ModuleLoaderTransformStatus,
} from '../evaluation/module-loader.js';
import { EvaluationOpenSeamKind } from '../evaluation/seams.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationFunctionValue,
  EvaluationUndefined,
  EvaluationValueKind,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import {
  isAureliaResolveExpression,
  isAureliaResolveWrapperExpression,
} from '../di/resolve-expression.js';
import {
  FrameworkRegistrationKind,
  RegistryBodyInterpretationState,
  RegistryBodyKind,
  RegistryBodyReference,
} from '../registration/registration-reference.js';

const APP_TASK_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

const DI_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const MODULE_LOADER_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const APP_TASK_SLOT_NAMES = new Set([
  'creating',
  'hydrating',
  'hydrated',
  'activating',
  'activated',
  'deactivating',
  'deactivated',
]);

const DIALOG_MODULES = new Set([
  '@aurelia/dialog',
]);

const BINDING_MODE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
  '@aurelia/template-compiler',
]);

const BINDING_MODE_VALUES = new Map([
  ['default', 0],
  ['defaultMode', 0],
  ['oneTime', 1],
  ['toView', 2],
  ['fromView', 4],
  ['twoWay', 6],
]);

const syntheticSource = ts.createSourceFile(
  'semantic-runtime:aurelia-evaluation-runtime.ts',
  `
    function register() {}
    function customize() { return { register() {} }; }
    function withChild() { return { register() {} }; }
    function Boolean(value) { return !!value; }
  `,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const syntheticEnvironment = new ModuleEnvironmentRecord('semantic-runtime:aurelia-evaluation-runtime');
const syntheticFunctions = new Map<string, EvaluationFunctionValue>();
const frameworkRegistrationKindsByObject = new WeakMap<EvaluationObjectValue, FrameworkRegistrationKind>();
const registryBodiesByObject = new WeakMap<EvaluationObjectValue, RegistryBodyReference>();

type AureliaResolveDirectKey =
  | {
      readonly kind: 'key';
      readonly expression: ts.Expression;
    }
  | {
      readonly kind: 'value';
      readonly value: EvaluationValue;
    };

for (const statement of syntheticSource.statements) {
  if (!ts.isFunctionDeclaration(statement) || statement.name == null) {
    continue;
  }
  const value = new EvaluationFunctionValue(statement, syntheticEnvironment, statement);
  syntheticFunctions.set(statement.name.text, value);
  syntheticEnvironment.initializeBinding(statement.name.text, value, EvaluationBindingKind.Function, false, statement);
}

export const aureliaStaticEvaluationRuntimeHost: StaticEvaluationRuntimeHost = {
  resolveIdentifier(
    identifier: ts.Identifier,
  ): EvaluationValue | null {
    switch (identifier.text) {
      case 'process':
        return processObject(identifier);
      case 'window':
      case 'self':
      case 'globalThis':
      case 'document':
      case 'customElements':
      case 'console':
        return ambientObject(identifier.text, identifier);
      case 'Symbol':
        return ambientObject('Symbol', identifier);
      case 'Boolean':
        return syntheticFunctions.get('Boolean') ?? null;
      default:
        return null;
    }
  },

  evaluateCallExpression(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue | null {
    void environment;
    void moduleKey;
    void depth;
    void host;

    const expression = unwrapExpression(call.expression);
    const resolveValue = evaluateAureliaResolveCall(call, expression, environment, moduleKey, depth, host);
    if (resolveValue != null) {
      return resolveValue;
    }

    if (
      ts.isPropertyAccessExpression(expression)
      && (expression.name.text === 'customize' || expression.name.text === 'withChild')
    ) {
      const checkpoint = host.checkpoint();
      const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
      const frameworkKind = aureliaFrameworkRegistrationKindForEvaluationValue(receiver);
      if (frameworkKind === FrameworkRegistrationKind.DialogConfiguration) {
        return dialogConfigurationObject(call);
      }
      const callee = host.evaluateExpression(expression, environment, moduleKey, depth + 1);
      if (isSyntheticDialogConfigurationChainFunction(callee, expression.name.text)) {
        return dialogConfigurationObject(call);
      }
      host.restore(checkpoint);
    }

    if (
      ts.isPropertyAccessExpression(expression)
      && APP_TASK_SLOT_NAMES.has(expression.name.text)
      && ts.isIdentifier(expression.expression)
      && sourceFileImportsLocal(expression.expression.getSourceFile(), expression.expression.text, 'AppTask', APP_TASK_MODULES)
    ) {
      return registryObject(call);
    }

    if (
      ts.isIdentifier(expression)
      && isDialogConfigurationFactoryIdentifier(expression)
    ) {
      return dialogConfigurationObject(call);
    }

    if (isAliasedResourcesRegistryCall(expression)) {
      return registryObject(
        call,
        aliasedResourcesRegistryBody(call, environment, moduleKey, depth + 1, host),
      );
    }

    if (
      ts.isPropertyAccessExpression(expression)
      && expression.name.text === 'createInterface'
      && ts.isIdentifier(expression.expression)
      && sourceFileImportsLocal(expression.expression.getSourceFile(), expression.expression.text, 'DI', DI_MODULES)
    ) {
      return new EvaluationObjectValue(new Map(), false, call);
    }

    return null;
  },
};

function evaluateAureliaResolveCall(
  call: ts.CallExpression,
  expression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  if (!isAureliaResolveActivationCall(expression, environment)) {
    return null;
  }
  const directKey = aureliaResolveDirectKey(call, moduleKey, host);
  if (directKey.kind === 'value') {
    return directKey.value;
  }
  return evaluateAureliaResolveDirectClassKey(directKey.expression, call, environment, moduleKey, depth, host);
}

function isAureliaResolveActivationCall(
  expression: ts.Expression,
  environment: ModuleEnvironmentRecord,
): boolean {
  return isAureliaResolveExpression(expression) && environment.readValue('this') != null;
}

function aureliaResolveDirectKey(
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): AureliaResolveDirectKey {
  const keyExpression = call.arguments[0];
  if (keyExpression == null || ts.isSpreadElement(keyExpression)) {
    return {
      kind: 'value',
      value: host.unknown(
        'Aurelia resolve(...) did not receive a direct DI key expression.',
        call,
        moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      ),
    };
  }
  if (!isAureliaResolveWrapperExpression(unwrapExpression(keyExpression))) {
    return { kind: 'key', expression: keyExpression };
  }
  return {
    kind: 'value',
    value: host.unknown(
      'Aurelia resolve(...) DI key wrapper resolution is not modeled by the evaluator-local activation slice yet.',
      keyExpression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    ),
  };
}

function evaluateAureliaResolveDirectClassKey(
  keyExpression: ts.Expression,
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const key = host.evaluateExpression(keyExpression, environment, moduleKey, depth + 1);
  if (key.kind === EvaluationValueKind.Unknown) {
    return key;
  }
  if (key.kind !== EvaluationValueKind.Class) {
    return host.unknown(
      'Aurelia resolve(...) key did not reduce to an evaluator-local class; DI registration lookup is not modeled by this activation slice yet.',
      keyExpression,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  return host.evaluateClassInstantiation(key, call, [], moduleKey, depth + 1);
}

export function aureliaFrameworkRegistrationKindForEvaluationValue(
  value: EvaluationValue | null,
): FrameworkRegistrationKind | null {
  if (value?.kind !== EvaluationValueKind.Object) {
    return null;
  }
  return frameworkRegistrationKindsByObject.get(value)
    ?? (isSyntheticDialogConfigurationObject(value) ? FrameworkRegistrationKind.DialogConfiguration : null);
}

export function aureliaRegistryBodyForEvaluationValue(
  value: EvaluationValue | null,
): RegistryBodyReference | null {
  return value?.kind === EvaluationValueKind.Object
    ? registryBodiesByObject.get(value) ?? null
    : null;
}

export const aureliaExternalEvaluationValueResolver: StaticModuleExternalValueResolver = {
  resolveImportValue(
    _fromModuleKey: string,
    entry: EvaluationImportEntry,
  ): EvaluationValue | null {
    if (entry.importKind !== EvaluationImportKind.Named) {
      return null;
    }
    if (!BINDING_MODE_MODULES.has(entry.moduleSpecifier)) {
      return null;
    }
    if (entry.exportName === 'BindingMode') {
      return bindingModeObject(entry.node);
    }
    const mode = entry.exportName == null
      ? null
      : BINDING_MODE_VALUES.get(entry.exportName) ?? null;
    return mode == null
      ? null
      : new EvaluationNumberValue(mode, entry.node);
  },
};

function dialogConfigurationObject(node: ts.Node): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map([
    objectProperty('register'),
    objectProperty('customize'),
    objectProperty('withChild'),
  ]), false, node);
  frameworkRegistrationKindsByObject.set(value, FrameworkRegistrationKind.DialogConfiguration);
  return value;
}

function registryObject(node: ts.Node, registryBody: RegistryBodyReference | null = null): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map([
    objectProperty('register'),
  ]), false, node);
  if (registryBody != null) {
    registryBodiesByObject.set(value, registryBody);
  }
  return value;
}

function aliasedResourcesRegistryBody(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): RegistryBodyReference {
  const input = call.arguments[0] == null
    ? EvaluationUndefined
    : evaluateAliasedResourcesRegistryArgument(call.arguments[0]!, environment, moduleKey, depth + 1, host);
  const result = new ModuleLoader().load(input);
  if (result.status === ModuleLoaderTransformStatus.InvalidInput) {
    return new RegistryBodyReference(
      RegistryBodyKind.AliasedResourcesRegistry,
      RegistryBodyInterpretationState.Interpreted,
    );
  }
  if (result.status === ModuleLoaderTransformStatus.Open) {
    return new RegistryBodyReference(
      RegistryBodyKind.AliasedResourcesRegistry,
      RegistryBodyInterpretationState.Open,
    );
  }
  return new RegistryBodyReference(
    RegistryBodyKind.AliasedResourcesRegistry,
    aliasedResourcesRegistryAliasArgumentsClosed(call, environment, moduleKey, depth + 1, host)
      ? RegistryBodyInterpretationState.Interpreted
      : RegistryBodyInterpretationState.Open,
  );
}

function evaluateAliasedResourcesRegistryArgument(
  argument: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  if (ts.isSpreadElement(argument)) {
    return host.unknown(
      'aliasedResourcesRegistry(...) spread argument stayed open.',
      argument,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  return host.evaluateExpression(argument, environment, moduleKey, depth + 1);
}

function aliasedResourcesRegistryAliasArgumentsClosed(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): boolean {
  const mainAlias = call.arguments[1] == null
    ? EvaluationUndefined
    : evaluateAliasedResourcesRegistryArgument(call.arguments[1]!, environment, moduleKey, depth + 1, host);
  if (
    mainAlias.kind !== EvaluationValueKind.Undefined
    && mainAlias.kind !== EvaluationValueKind.Null
    && mainAlias.kind !== EvaluationValueKind.String
  ) {
    return false;
  }
  const aliases = call.arguments[2] == null
    ? EvaluationUndefined
    : evaluateAliasedResourcesRegistryArgument(call.arguments[2]!, environment, moduleKey, depth + 1, host);
  if (aliases.kind === EvaluationValueKind.Undefined || aliases.kind === EvaluationValueKind.Null) {
    return true;
  }
  if (aliases.kind !== EvaluationValueKind.Object || aliases.mayHaveUnknownProperties) {
    return false;
  }
  for (const property of aliases.properties.values()) {
    if (property.value.kind !== EvaluationValueKind.String) {
      return false;
    }
  }
  return true;
}

function objectProperty(name: 'register' | 'customize' | 'withChild'): [string, EvaluationObjectProperty] {
  const value = syntheticFunctions.get(name) ?? syntheticFunctions.get('register')!;
  return [name, new EvaluationObjectProperty(name, value, value.declaration)];
}

function isSyntheticDialogConfigurationObject(value: EvaluationObjectValue): boolean {
  return isSyntheticDialogConfigurationChainFunction(value.properties.get('customize')?.value ?? null, 'customize')
    && isSyntheticDialogConfigurationChainFunction(value.properties.get('withChild')?.value ?? null, 'withChild');
}

function isSyntheticDialogConfigurationChainFunction(
  value: EvaluationValue | null,
  name: string,
): boolean {
  const expected = name === 'customize' || name === 'withChild'
    ? syntheticFunctions.get(name)
    : null;
  return expected != null
    && value?.kind === EvaluationValueKind.Function
    && value.declaration === expected.declaration;
}

function bindingModeObject(node: ts.Node): EvaluationObjectValue {
  return new EvaluationObjectValue(new Map(
    [...BINDING_MODE_VALUES.entries()]
      .filter(([name]) => name !== 'defaultMode')
      .map(([name, value]) => [
        name,
        new EvaluationObjectProperty(name, new EvaluationNumberValue(value, node), node),
      ]),
  ), false, node);
}

function processObject(node: ts.Node): EvaluationBoundaryObjectValue {
  return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, 'process', new Map([
    ['env', new EvaluationObjectProperty('env', ambientObject('process.env', node), node)],
  ]), node);
}

function ambientObject(name: string, node: ts.Node): EvaluationBoundaryObjectValue {
  return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, name, new Map(), node);
}

function sourceFileImportsLocal(
  sourceFile: ts.SourceFile,
  localName: string,
  importedName: string,
  modules: ReadonlySet<string>,
): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !modules.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const clause = statement.importClause;
    const named = clause?.namedBindings;
    if (named == null || !ts.isNamedImports(named)) {
      continue;
    }
    if (named.elements.some((element) =>
      element.name.text === localName
      && (element.propertyName?.text ?? element.name.text) === importedName
    )) {
      return true;
    }
  }
  return false;
}

function sourceFileImportsNamespace(
  sourceFile: ts.SourceFile,
  localName: string,
  modules: ReadonlySet<string>,
): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !modules.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const named = statement.importClause?.namedBindings;
    if (named != null && ts.isNamespaceImport(named) && named.name.text === localName) {
      return true;
    }
  }
  return false;
}

function isAliasedResourcesRegistryCall(
  expression: ts.Expression,
): boolean {
  if (ts.isIdentifier(expression)) {
    return sourceFileImportsLocal(
      expression.getSourceFile(),
      expression.text,
      'aliasedResourcesRegistry',
      MODULE_LOADER_MODULES,
    );
  }
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'aliasedResourcesRegistry') {
    return false;
  }
  const namespace = unwrapExpression(expression.expression);
  return ts.isIdentifier(namespace)
    && sourceFileImportsNamespace(namespace.getSourceFile(), namespace.text, MODULE_LOADER_MODULES);
}

function isDialogConfigurationFactoryIdentifier(identifier: ts.Identifier): boolean {
  return sourceFileImportsLocal(identifier.getSourceFile(), identifier.text, 'createDialogConfiguration', DIALOG_MODULES)
    || (
      identifier.text === 'createDialogConfiguration'
      && isAureliaDialogConfigurationSource(identifier.getSourceFile())
    );
}

function isAureliaDialogConfigurationSource(sourceFile: ts.SourceFile): boolean {
  const normalized = sourceFile.fileName.replace(/\\/g, '/');
  return normalized.endsWith('/packages/dialog/src/dialog-configuration.ts')
    || normalized.endsWith('/@aurelia/dialog/src/dialog-configuration.ts');
}
