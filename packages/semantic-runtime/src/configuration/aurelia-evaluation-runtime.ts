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
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationFunctionValue,
  EvaluationValueKind,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';

const APP_TASK_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

const DI_MODULES = new Set([
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
    if (
      ts.isPropertyAccessExpression(expression)
      && (expression.name.text === 'customize' || expression.name.text === 'withChild')
    ) {
      const mark = host.markOpenSeams();
      const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
      const frameworkKind = aureliaFrameworkRegistrationKindForEvaluationValue(receiver);
      if (frameworkKind === FrameworkRegistrationKind.DialogConfiguration) {
        return dialogConfigurationObject(call);
      }
      const callee = host.evaluateExpression(expression, environment, moduleKey, depth + 1);
      if (isSyntheticDialogConfigurationChainFunction(callee, expression.name.text)) {
        return dialogConfigurationObject(call);
      }
      host.restoreOpenSeams(mark);
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

export function aureliaFrameworkRegistrationKindForEvaluationValue(
  value: EvaluationValue | null,
): FrameworkRegistrationKind | null {
  if (value?.kind !== EvaluationValueKind.Object) {
    return null;
  }
  return frameworkRegistrationKindsByObject.get(value)
    ?? (isSyntheticDialogConfigurationObject(value) ? FrameworkRegistrationKind.DialogConfiguration : null);
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

function registryObject(node: ts.Node): EvaluationObjectValue {
  return new EvaluationObjectValue(new Map([
    objectProperty('register'),
  ]), false, node);
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
