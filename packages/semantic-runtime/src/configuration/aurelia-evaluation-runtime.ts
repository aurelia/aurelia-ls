import ts from 'typescript';
import {
  EvaluationBindingKind,
  ModuleEnvironmentRecord,
} from '../evaluation/environment.js';
import type {
  StaticEvaluationRuntimeHost,
  StaticEvaluationValueMetadataTransfer,
} from '../evaluation/evaluator.js';
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
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationFunctionValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { unwrapExpression } from '../evaluation/ts-syntax.js';
import {
  isAureliaResolveExpression,
  isAureliaResolveWrapperExpression,
} from '../di/resolve-expression.js';
import { ContainerDefaultResolverPolicy } from '../di/container-configuration.js';
import {
  RegistrationStrategy,
} from '../registration/registration-admission.js';
import { REGISTRATION_FACTORY_SHAPES } from '../registration/registration-factory-shapes.js';
import {
  FrameworkRegistrationKind,
  RegistryBodyInterpretationState,
  RegistryBodyKind,
  RegistryBodyReference,
  type RegistrationValueKind,
} from '../registration/registration-reference.js';
import {
  frameworkRegistrationDescriptorForKind,
  frameworkRegistrationExportEntriesForModule,
  frameworkRegistrationKindForExportName,
  frameworkRegistrationKindsForModule,
  frameworkRegistrationKindSupportsChainMethod,
} from '../registration/framework-registration-manifest.js';

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
const resolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const consumedResolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const invalidResolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const resolverBuilderEffectsByObject = new WeakMap<EvaluationObjectValue, AureliaInterfaceDefaultRegistrationEffect>();
const resolverBuilderEffectsByResult = new WeakMap<EvaluationObjectValue, AureliaInterfaceDefaultRegistrationEffect>();
const interfaceEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaInterfaceEvaluation>();
const containerEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaContainerEvaluation>();
const containerEvaluationsByCall = new WeakMap<ts.CallExpression, AureliaContainerEvaluation>();
const containerDefaultResolverPoliciesByValue = new WeakMap<object, ContainerDefaultResolverPolicy>();

export const enum AureliaInterfaceDefaultRegistrationState {
  /** Interface key has no configure callback and therefore no default registration. */
  None = 'none',
  /** A configure callback exists but its resolver-builder effect did not close. */
  Open = 'open',
  /** The configure callback selected one modeled resolver-builder strategy and value. */
  Closed = 'closed',
}

export class AureliaInterfaceDefaultRegistrationEffect {
  constructor(
    readonly strategy: RegistrationStrategy,
    readonly valueKind: RegistrationValueKind,
    readonly value: EvaluationValue,
    readonly valueExpression: ts.Expression | null,
    readonly sourceNode: ts.CallExpression,
  ) {}
}

export class AureliaInterfaceEvaluation {
  constructor(
    readonly friendlyName: string,
    readonly defaultRegistrationState: AureliaInterfaceDefaultRegistrationState,
    readonly defaultRegistration: AureliaInterfaceDefaultRegistrationEffect | null,
    readonly sourceNode: ts.CallExpression,
  ) {}
}

/** Candidate-local identity for one runtime `createContainer(...)` result. */
export class AureliaContainerEvaluation {
  constructor(
    readonly sourceNode: ts.CallExpression,
    readonly configurationExpression: ts.Expression | null,
  ) {}
}

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
  transferValueMetadata(source, target, transfer): void {
    if (source.kind !== EvaluationValueKind.Object || target.kind !== EvaluationValueKind.Object) {
      return;
    }
    const frameworkKind = frameworkRegistrationKindsByObject.get(source);
    if (frameworkKind != null) {
      frameworkRegistrationKindsByObject.set(target, frameworkKind);
    }
    const registryBody = registryBodiesByObject.get(source);
    if (registryBody != null) {
      registryBodiesByObject.set(target, registryBody);
    }
    const interfaceEvaluation = interfaceEvaluationsByObject.get(source);
    if (interfaceEvaluation != null) {
      interfaceEvaluationsByObject.set(target, forkAureliaInterfaceEvaluation(interfaceEvaluation, transfer));
    }
    const containerEvaluation = containerEvaluationsByObject.get(source);
    if (containerEvaluation != null) {
      containerEvaluationsByObject.set(target, containerEvaluation);
    }
    if (resolverBuilderObjects.has(source)) {
      resolverBuilderObjects.add(target);
    }
    if (consumedResolverBuilderObjects.has(source)) {
      consumedResolverBuilderObjects.add(target);
    }
    if (invalidResolverBuilderObjects.has(source)) {
      invalidResolverBuilderObjects.add(target);
    }
    const builderEffect = resolverBuilderEffectsByObject.get(source);
    if (builderEffect != null) {
      resolverBuilderEffectsByObject.set(target, forkAureliaDefaultRegistrationEffect(builderEffect, transfer));
    }
    const resultEffect = resolverBuilderEffectsByResult.get(source);
    if (resultEffect != null) {
      resolverBuilderEffectsByResult.set(target, forkAureliaDefaultRegistrationEffect(resultEffect, transfer));
    }
  },

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
    const resolverBuilder = evaluateResolverBuilderCall(call, environment, moduleKey, depth, host);
    if (resolverBuilder != null) {
      return resolverBuilder;
    }

    const expression = unwrapExpression(call.expression);
    const resolveValue = evaluateAureliaResolveCall(call, expression, environment, moduleKey, depth, host);
    if (resolveValue != null) {
      return resolveValue;
    }

    const containerValue = evaluateAureliaContainerCall(call, expression, environment, moduleKey, depth, host);
    if (containerValue != null) {
      return containerValue;
    }

    if (ts.isPropertyAccessExpression(expression)) {
      const checkpoint = host.checkpoint();
      const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
      const frameworkKind = aureliaFrameworkRegistrationKindForEvaluationValue(receiver);
      if (frameworkKind != null && frameworkRegistrationKindSupportsChainMethod(frameworkKind, expression.name.text)) {
        return frameworkRegistrationObject(frameworkKind, call);
      }
      const callee = host.evaluateExpression(expression, environment, moduleKey, depth + 1);
      if (isSyntheticDialogConfigurationChainFunction(callee, expression.name.text)) {
        return frameworkRegistrationObject(FrameworkRegistrationKind.DialogConfiguration, call);
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
      return frameworkRegistrationObject(FrameworkRegistrationKind.DialogConfiguration, call);
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
      return evaluateCreateInterfaceCall(call, environment, moduleKey, depth, host);
    }

    return null;
  },
};

function forkAureliaInterfaceEvaluation(
  source: AureliaInterfaceEvaluation,
  transfer: StaticEvaluationValueMetadataTransfer,
): AureliaInterfaceEvaluation {
  return new AureliaInterfaceEvaluation(
    source.friendlyName,
    source.defaultRegistrationState,
    source.defaultRegistration == null
      ? null
      : forkAureliaDefaultRegistrationEffect(source.defaultRegistration, transfer),
    source.sourceNode,
  );
}

function forkAureliaDefaultRegistrationEffect(
  source: AureliaInterfaceDefaultRegistrationEffect,
  transfer: StaticEvaluationValueMetadataTransfer,
): AureliaInterfaceDefaultRegistrationEffect {
  return new AureliaInterfaceDefaultRegistrationEffect(
    source.strategy,
    source.valueKind,
    transfer.forkValue(source.value),
    source.valueExpression,
    source.sourceNode,
  );
}

export function aureliaInterfaceEvaluationForValue(
  value: EvaluationValue | null,
): AureliaInterfaceEvaluation | null {
  return value?.kind === EvaluationValueKind.Object
    ? interfaceEvaluationsByObject.get(value) ?? null
    : null;
}

export function aureliaContainerEvaluationForValue(
  value: EvaluationValue | null,
): AureliaContainerEvaluation | null {
  return value?.kind === EvaluationValueKind.Object
    ? containerEvaluationsByObject.get(value) ?? null
    : null;
}

/** Read the framework-owned `DefaultResolver` function represented by an evaluator value. */
export function aureliaContainerDefaultResolverPolicyForValue(
  value: EvaluationValue | null,
): ContainerDefaultResolverPolicy | null {
  return value == null
    ? null
    : containerDefaultResolverPoliciesByValue.get(value) ?? null;
}

function evaluateAureliaContainerCall(
  call: ts.CallExpression,
  expression: ts.Expression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationObjectValue | null {
  if (isAureliaCreateContainerExpression(expression)) {
    const evaluation = containerEvaluationsByCall.get(call)
      ?? new AureliaContainerEvaluation(
        call,
        call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0]) ? call.arguments[0] : null,
      );
    containerEvaluationsByCall.set(call, evaluation);
    const value = new EvaluationObjectValue(new Map(), false, call);
    containerEvaluationsByObject.set(value, evaluation);
    return value;
  }
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'register') {
    return null;
  }
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  return aureliaContainerEvaluationForValue(receiver) == null || receiver.kind !== EvaluationValueKind.Object
    ? null
    : receiver;
}

function isAureliaCreateContainerExpression(
  expression: ts.Expression,
): boolean {
  if (ts.isIdentifier(expression)) {
    return sourceFileImportsLocal(
      expression.getSourceFile(),
      expression.text,
      'createContainer',
      DI_MODULES,
    );
  }
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'createContainer') {
    return false;
  }
  const receiver = unwrapExpression(expression.expression);
  if (ts.isIdentifier(receiver)) {
    return sourceFileImportsLocal(receiver.getSourceFile(), receiver.text, 'DI', DI_MODULES)
      || sourceFileImportsNamespace(receiver.getSourceFile(), receiver.text, DI_MODULES);
  }
  return ts.isPropertyAccessExpression(receiver)
    && receiver.name.text === 'DI'
    && ts.isIdentifier(unwrapExpression(receiver.expression))
    && sourceFileImportsNamespace(
      receiver.getSourceFile(),
      (unwrapExpression(receiver.expression) as ts.Identifier).text,
      DI_MODULES,
    );
}

function evaluateCreateInterfaceCall(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationObjectValue {
  const first = call.arguments[0] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[0], environment, moduleKey, depth + 1);
  const second = call.arguments[1] == null
    ? EvaluationUndefined
    : host.evaluateExpression(call.arguments[1], environment, moduleKey, depth + 1);
  const friendlyName = first.kind === EvaluationValueKind.String ? first.value : '(anonymous)';
  const configure = first.kind === EvaluationValueKind.Function
    ? first
    : second.kind === EvaluationValueKind.Function
      ? second
      : null;
  const hasConfigureArgument = first.kind === EvaluationValueKind.Function
    || call.arguments[1] != null
    || (call.arguments[0] != null && first.kind !== EvaluationValueKind.String);
  const interfaceValue = interfaceEvaluationObject(call, friendlyName, hasConfigureArgument);
  if (!hasConfigureArgument) {
    interfaceEvaluationsByObject.set(interfaceValue, new AureliaInterfaceEvaluation(
      friendlyName,
      AureliaInterfaceDefaultRegistrationState.None,
      null,
      call,
    ));
    return interfaceValue;
  }
  if (configure == null) {
    interfaceEvaluationsByObject.set(interfaceValue, new AureliaInterfaceEvaluation(
      friendlyName,
      AureliaInterfaceDefaultRegistrationState.Open,
      null,
      call,
    ));
    return interfaceValue;
  }

  const builder = resolverBuilderObject(call);
  const result = host.evaluateFunctionWithArguments(configure, call, [builder], moduleKey, depth + 1);
  const effect = resolverBuilderEffectsByObject.get(builder)
    ?? (result.kind === EvaluationValueKind.Object ? resolverBuilderEffectsByResult.get(result) ?? null : null);
  const closed = effect != null && !invalidResolverBuilderObjects.has(builder);
  interfaceEvaluationsByObject.set(interfaceValue, new AureliaInterfaceEvaluation(
    friendlyName,
    closed
      ? AureliaInterfaceDefaultRegistrationState.Closed
      : AureliaInterfaceDefaultRegistrationState.Open,
    closed ? effect : null,
    call,
  ));
  return interfaceValue;
}

function interfaceEvaluationObject(
  call: ts.CallExpression,
  friendlyName: string,
  hasConfigureArgument: boolean,
): EvaluationObjectValue {
  const properties = new Map<string, EvaluationObjectProperty>([
    ['$isInterface', new EvaluationObjectProperty(
      '$isInterface',
      new EvaluationBooleanValue(true, call),
      call,
      EvaluationObjectPropertyState.Closed,
    )],
    ['friendlyName', new EvaluationObjectProperty(
      'friendlyName',
      new EvaluationStringValue(friendlyName, call),
      call,
      EvaluationObjectPropertyState.Closed,
    )],
  ]);
  if (hasConfigureArgument) {
    properties.set('register', new EvaluationObjectProperty(
      'register',
      syntheticFunctions.get('register')!,
      call,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  return new EvaluationObjectValue(properties, false, call);
}

function resolverBuilderObject(node: ts.Node): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map(), false, node);
  resolverBuilderObjects.add(value);
  return value;
}

function evaluateResolverBuilderCall(
  call: ts.CallExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const shape = REGISTRATION_FACTORY_SHAPES.get(expression.name.text) ?? null;
  if (shape?.value == null) {
    return null;
  }
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  if (receiver.kind !== EvaluationValueKind.Object || !resolverBuilderObjects.has(receiver)) {
    return null;
  }
  if (consumedResolverBuilderObjects.has(receiver)) {
    invalidResolverBuilderObjects.add(receiver);
    return host.unknown(
      'DI interface default registration invoked one ResolverBuilder more than once.',
      call,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  consumedResolverBuilderObjects.add(receiver);
  const valueExpression = call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0])
    ? call.arguments[0]
    : null;
  const value = valueExpression == null
    ? EvaluationUndefined
    : host.evaluateExpression(valueExpression, environment, moduleKey, depth + 1);
  const effect = new AureliaInterfaceDefaultRegistrationEffect(
    shape.strategy,
    shape.value.valueKind,
    value,
    valueExpression,
    call,
  );
  const result = new EvaluationObjectValue(new Map(), false, call);
  resolverBuilderEffectsByObject.set(receiver, effect);
  resolverBuilderEffectsByResult.set(result, effect);
  return result;
}

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
    if (entry.importKind === EvaluationImportKind.Namespace) {
      const namespace = aureliaExternalNamespaceValue(entry);
      if (namespace != null) {
        return namespace;
      }
    }
    if (
      entry.importKind === EvaluationImportKind.Named
      && entry.exportName === 'DefaultResolver'
      && DI_MODULES.has(entry.moduleSpecifier)
    ) {
      return defaultResolverObject(entry.node);
    }
    const frameworkRegistration = frameworkRegistrationExternalImportValue(entry);
    if (frameworkRegistration != null) {
      return frameworkRegistration;
    }
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

function frameworkRegistrationExternalImportValue(
  entry: EvaluationImportEntry,
): EvaluationValue | null {
  const exportEntries = frameworkRegistrationExportEntriesForModule(entry.moduleSpecifier);
  if (exportEntries == null) {
    return null;
  }
  if (entry.importKind !== EvaluationImportKind.Named || entry.exportName == null) {
    return null;
  }
  const moduleKinds = frameworkRegistrationKindsForModule(entry.moduleSpecifier);
  const frameworkKind = moduleKinds == null
    ? null
    : frameworkRegistrationKindForExportName(entry.exportName, moduleKinds);
  return frameworkKind == null
    ? null
    : frameworkRegistrationObject(frameworkKind, entry.node);
}

function aureliaExternalNamespaceValue(
  entry: EvaluationImportEntry,
): EvaluationBoundaryObjectValue | null {
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const exportEntry of frameworkRegistrationExportEntriesForModule(entry.moduleSpecifier) ?? []) {
    properties.set(exportEntry.exportName, new EvaluationObjectProperty(
      exportEntry.exportName,
      frameworkRegistrationObject(exportEntry.kind, entry.node),
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  if (DI_MODULES.has(entry.moduleSpecifier)) {
    properties.set('DefaultResolver', new EvaluationObjectProperty(
      'DefaultResolver',
      defaultResolverObject(entry.node),
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  return properties.size === 0
    ? null
    : new EvaluationBoundaryObjectValue(
        EvaluationBoundaryKind.ExternalModule,
        `namespace import '${entry.moduleSpecifier}'`,
        properties,
        entry.node,
      );
}

function defaultResolverObject(node: ts.Node): EvaluationObjectValue {
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const policy of [
    ContainerDefaultResolverPolicy.None,
    ContainerDefaultResolverPolicy.Singleton,
    ContainerDefaultResolverPolicy.Transient,
  ] as const) {
    const value = new EvaluationBoundaryValue(
      EvaluationBoundaryKind.ExternalModule,
      `DefaultResolver.${policy}`,
      node,
    );
    containerDefaultResolverPoliciesByValue.set(value, policy);
    properties.set(policy, new EvaluationObjectProperty(
      policy,
      value,
      node,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  return new EvaluationObjectValue(properties, false, node);
}

function frameworkRegistrationObject(kind: FrameworkRegistrationKind, node: ts.Node): EvaluationObjectValue {
  const descriptor = frameworkRegistrationDescriptorForKind(kind);
  const value = new EvaluationObjectValue(new Map([
    objectProperty('register'),
    ...descriptor.chainMethods.map((methodName) => objectProperty(methodName)),
  ]), false, node);
  frameworkRegistrationKindsByObject.set(value, kind);
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

function objectProperty(name: string): [string, EvaluationObjectProperty] {
  const value = syntheticFunctions.get(name) ?? syntheticFunctions.get('register')!;
  return [name, new EvaluationObjectProperty(name, value, value.declaration, EvaluationObjectPropertyState.Closed)];
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
        new EvaluationObjectProperty(name, new EvaluationNumberValue(value, node), node, EvaluationObjectPropertyState.Closed),
      ]),
  ), false, node);
}

function processObject(node: ts.Node): EvaluationBoundaryObjectValue {
  return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, 'process', new Map([
    ['env', new EvaluationObjectProperty('env', ambientObject('process.env', node), node, EvaluationObjectPropertyState.Closed)],
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
