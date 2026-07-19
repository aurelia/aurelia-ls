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
  EvaluationArrayValue,
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
import {
  REGISTRATION_FACTORY_SHAPES,
  type RegistrationFactoryShape,
} from '../registration/registration-factory-shapes.js';
import {
  FrameworkRegistrationKind,
  RegistryBodyInterpretationState,
  RegistryBodyKind,
  RegistryBodyReference,
  type RegistrationValueKind,
} from '../registration/registration-reference.js';
import {
  frameworkRegistrationExportEntriesForModule,
  frameworkRegistrationKindForExportName,
  frameworkRegistrationKindsForModule,
} from '../registration/framework-registration-manifest.js';

const DI_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const AURELIA_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

const AURELIA_BROWSER_FACADE_MODULE = 'aurelia';

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
    const customize = () => undefined;
    const withChild = () => undefined;
    const init = () => undefined;
    const withStore = () => undefined;
    function create() {}
    function shadowDOM() {}
    function creating() {}
    function hydrating() {}
    function hydrated() {}
    function activating() {}
    function activated() {}
    function deactivating() {}
    function deactivated() {}
    function createDialogConfiguration() {}
    function instance() {}
    function singleton() {}
    function transient() {}
    function callback() {}
    function cachedCallback() {}
    function aliasTo() {}
    function defer() {}
    function Boolean(value) { return !!value; }
  `,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const syntheticEnvironment = new ModuleEnvironmentRecord('semantic-runtime:aurelia-evaluation-runtime');
const syntheticFunctions = new Map<string, EvaluationFunctionValue>();
const frameworkRegistrationEvaluationsByValue = new WeakMap<object, AureliaFrameworkRegistrationEvaluation>();
const frameworkRegistrationFactoryEvaluationsByValue = new WeakMap<object, AureliaFrameworkRegistrationFactoryEvaluation>();
const registrationFactoryEvaluationsByValue = new WeakMap<object, AureliaRegistrationFactoryEvaluation>();
const aureliaSyntheticCallsByFunction = new WeakMap<EvaluationFunctionValue, AureliaSyntheticCall>();
const registryBodiesByObject = new WeakMap<EvaluationObjectValue, RegistryBodyReference>();
const resolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const consumedResolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const invalidResolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const resolverBuilderEffectsByObject = new WeakMap<EvaluationObjectValue, AureliaInterfaceDefaultRegistrationEffect>();
const resolverBuilderEffectsByResult = new WeakMap<EvaluationObjectValue, AureliaInterfaceDefaultRegistrationEffect>();
const interfaceEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaInterfaceEvaluation>();
const containerEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaContainerEvaluation>();
const containerEvaluationsByExpression = new WeakMap<ts.Expression, AureliaContainerEvaluation>();
const aureliaFacadeEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaFacadeEvaluation>();
const aureliaFacadeEvaluationsByExpression = new WeakMap<ts.Expression, AureliaFacadeEvaluation>();
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

export const enum AureliaContainerEvaluationKind {
  /** Root container produced by an authored `createContainer(...)` call. */
  AuthoredRoot = 'authored-root',
  /** Child container produced by an authored `container.createChild(...)` call. */
  AuthoredChild = 'authored-child',
  /** Default root container created by the low-level runtime-html Aurelia facade. */
  RuntimeFacadeDefault = 'runtime-facade-default',
  /** Configured root container created by the browser quick-start Aurelia facade. */
  BrowserFacadeDefault = 'browser-facade-default',
}

/** Candidate-local identity for one runtime container value. */
export class AureliaContainerEvaluation {
  constructor(
    readonly kind: AureliaContainerEvaluationKind,
    readonly sourceNode: ts.Expression,
    readonly configurationExpression: ts.Expression | null,
    readonly parent: AureliaContainerEvaluation | null = null,
  ) {}
}

export const enum AureliaFacadeContainerState {
  /** The selected runtime container has exact evaluator identity. */
  Closed = 'closed',
  /** An explicit constructor container was present but did not close to a modeled container value. */
  Open = 'open',
}

/** Candidate-local identity for one Aurelia facade and its exact selected container. */
export class AureliaFacadeEvaluation {
  constructor(
    readonly sourceNode: ts.NewExpression | ts.CallExpression,
    readonly containerState: AureliaFacadeContainerState,
    readonly containerEvaluation: AureliaContainerEvaluation | null,
    readonly includesBrowserDefaults: boolean,
  ) {}
}

export class AureliaFrameworkRegistrationEvaluation {
  constructor(
    readonly kind: FrameworkRegistrationKind,
  ) {}
}

/** Framework export whose methods produce registries but which is not itself a semantic registration package. */
export class AureliaFrameworkRegistrationFactoryEvaluation {
  constructor(
    readonly resultKind: FrameworkRegistrationKind,
  ) {}
}

/** Evaluator-local meaning of one concrete `Registration.*(...)` result. */
export class AureliaRegistrationFactoryEvaluation {
  constructor(
    readonly factoryName: string,
    readonly shape: RegistrationFactoryShape,
    readonly sourceNode: ts.CallExpression,
    readonly argumentValues: readonly (EvaluationValue | null)[],
  ) {}
}

type AureliaSyntheticCall = (
  call: ts.CallExpression,
  receiver: EvaluationValue | null,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
) => EvaluationValue;

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
  if (ts.isFunctionDeclaration(statement) && statement.name != null) {
    const value = new EvaluationFunctionValue(statement, syntheticEnvironment, statement);
    syntheticFunctions.set(statement.name.text, value);
    syntheticEnvironment.initializeBinding(statement.name.text, value, EvaluationBindingKind.Function, false, statement);
    continue;
  }
  if (!ts.isVariableStatement(statement)) {
    continue;
  }
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name) || declaration.initializer == null || !ts.isArrowFunction(declaration.initializer)) {
      continue;
    }
    const value = new EvaluationFunctionValue(declaration.initializer, syntheticEnvironment, declaration.initializer);
    syntheticFunctions.set(declaration.name.text, value);
    syntheticEnvironment.initializeBinding(declaration.name.text, value, EvaluationBindingKind.Const, false, declaration);
  }
}

export const aureliaStaticEvaluationRuntimeHost: StaticEvaluationRuntimeHost = {
  transferValueMetadata(source, target, transfer): void {
    const frameworkRegistration = frameworkRegistrationEvaluationsByValue.get(source);
    if (frameworkRegistration != null) {
      frameworkRegistrationEvaluationsByValue.set(target, frameworkRegistration);
    }
    const frameworkRegistrationFactory = frameworkRegistrationFactoryEvaluationsByValue.get(source);
    if (frameworkRegistrationFactory != null) {
      frameworkRegistrationFactoryEvaluationsByValue.set(target, frameworkRegistrationFactory);
    }
    const registrationFactory = registrationFactoryEvaluationsByValue.get(source);
    if (registrationFactory != null) {
      registrationFactoryEvaluationsByValue.set(
        target,
        new AureliaRegistrationFactoryEvaluation(
          registrationFactory.factoryName,
          registrationFactory.shape,
          registrationFactory.sourceNode,
          registrationFactory.argumentValues.map((value) => value == null ? null : transfer.forkValue(value)),
        ),
      );
    }
    if (source.kind === EvaluationValueKind.Function && target.kind === EvaluationValueKind.Function) {
      const syntheticCall = aureliaSyntheticCallsByFunction.get(source);
      if (syntheticCall != null) {
        aureliaSyntheticCallsByFunction.set(target, syntheticCall);
      }
    }
    if (source.kind !== EvaluationValueKind.Object || target.kind !== EvaluationValueKind.Object) {
      return;
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
    const aureliaFacadeEvaluation = aureliaFacadeEvaluationsByObject.get(source);
    if (aureliaFacadeEvaluation != null) {
      aureliaFacadeEvaluationsByObject.set(target, aureliaFacadeEvaluation);
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
    const aureliaFacadeValue = evaluateAureliaFacadeCall(call, environment, moduleKey, depth, host);
    if (aureliaFacadeValue != null) {
      return aureliaFacadeValue;
    }

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
      const callee = host.evaluateExpression(expression, environment, moduleKey, depth + 1);
      const syntheticCall = callee.kind === EvaluationValueKind.Function
        ? aureliaSyntheticCallsByFunction.get(callee) ?? null
        : null;
      if (syntheticCall != null) {
        return syntheticCall(call, receiver, environment, moduleKey, depth, host);
      }
      host.restore(checkpoint);
    }

    if (ts.isIdentifier(expression)) {
      const checkpoint = host.checkpoint();
      const directCallee = host.evaluateExpression(expression, environment, moduleKey, depth + 1);
      const directSyntheticCall = directCallee.kind === EvaluationValueKind.Function
        ? aureliaSyntheticCallsByFunction.get(directCallee) ?? null
        : null;
      if (directSyntheticCall != null) {
        return directSyntheticCall(call, null, environment, moduleKey, depth, host);
      }
      host.restore(checkpoint);
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

  evaluateNewExpression(
    expression: ts.NewExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue | null {
    return evaluateAureliaFacadeConstruction(expression, environment, moduleKey, depth, host);
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

export function aureliaFacadeEvaluationForValue(
  value: EvaluationValue | null,
): AureliaFacadeEvaluation | null {
  return value?.kind === EvaluationValueKind.Object
    ? aureliaFacadeEvaluationsByObject.get(value) ?? null
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

function evaluateAureliaFacadeConstruction(
  expression: ts.NewExpression,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationObjectValue | null {
  const facadeModule = aureliaFacadeModuleForExpression(expression.expression);
  if (facadeModule == null) {
    return null;
  }

  const containerArgument = expression.arguments?.[0] ?? null;
  const containerArgumentValue = containerArgument == null || ts.isSpreadElement(containerArgument)
    ? null
    : host.evaluateExpression(containerArgument, environment, moduleKey, depth + 1);
  const usesDefaultContainer = containerArgument == null
    || containerArgumentValue?.kind === EvaluationValueKind.Undefined;
  const selectedContainer = usesDefaultContainer
    ? null
    : aureliaContainerEvaluationForValue(containerArgumentValue);
  const includesBrowserDefaults = facadeModule === AURELIA_BROWSER_FACADE_MODULE && usesDefaultContainer;
  const containerEvaluation = usesDefaultContainer
    ? implicitFacadeContainerEvaluation(expression, includesBrowserDefaults)
    : selectedContainer;
  const facade = aureliaFacadeEvaluationsByExpression.get(expression)
    ?? new AureliaFacadeEvaluation(
      expression,
      !usesDefaultContainer && selectedContainer == null
        ? AureliaFacadeContainerState.Open
        : AureliaFacadeContainerState.Closed,
      containerEvaluation,
      includesBrowserDefaults,
    );
  aureliaFacadeEvaluationsByExpression.set(expression, facade);
  return aureliaFacadeObject(facade, expression);
}

function evaluateAureliaFacadeCall(
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
  const methodName = expression.name.text;

  if (
    (methodName === 'register' || methodName === 'app')
    && aureliaFacadeModuleForExpression(expression.expression) === AURELIA_BROWSER_FACADE_MODULE
  ) {
    const facade = aureliaFacadeEvaluationsByExpression.get(call)
      ?? new AureliaFacadeEvaluation(
        call,
        AureliaFacadeContainerState.Closed,
        implicitFacadeContainerEvaluation(call, true),
        true,
      );
    aureliaFacadeEvaluationsByExpression.set(call, facade);
    return aureliaFacadeObject(facade, call);
  }

  if (methodName !== 'register' && methodName !== 'app') {
    return null;
  }
  const checkpoint = host.checkpoint();
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  const facade = aureliaFacadeEvaluationForValue(receiver);
  if (facade == null || receiver.kind !== EvaluationValueKind.Object) {
    host.restore(checkpoint);
    return null;
  }
  return receiver;
}

function implicitFacadeContainerEvaluation(
  expression: ts.NewExpression | ts.CallExpression,
  includesBrowserDefaults: boolean,
): AureliaContainerEvaluation {
  const existing = containerEvaluationsByExpression.get(expression);
  if (existing != null) {
    return existing;
  }
  const evaluation = new AureliaContainerEvaluation(
    includesBrowserDefaults
      ? AureliaContainerEvaluationKind.BrowserFacadeDefault
      : AureliaContainerEvaluationKind.RuntimeFacadeDefault,
    expression,
    null,
  );
  containerEvaluationsByExpression.set(expression, evaluation);
  return evaluation;
}

function aureliaFacadeObject(
  facade: AureliaFacadeEvaluation,
  node: ts.Node,
): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map(), false, node);
  aureliaFacadeEvaluationsByObject.set(value, facade);
  return value;
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
    const evaluation = containerEvaluationsByExpression.get(call)
      ?? new AureliaContainerEvaluation(
        AureliaContainerEvaluationKind.AuthoredRoot,
        call,
        call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0]) ? call.arguments[0] : null,
      );
    containerEvaluationsByExpression.set(call, evaluation);
    const value = new EvaluationObjectValue(new Map(), false, call);
    containerEvaluationsByObject.set(value, evaluation);
    return value;
  }
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const receiver = host.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
  const parent = aureliaContainerEvaluationForValue(receiver);
  if (parent == null || receiver.kind !== EvaluationValueKind.Object) {
    return null;
  }
  if (expression.name.text === 'register') {
    return receiver;
  }
  if (expression.name.text !== 'createChild') {
    return null;
  }
  const evaluation = containerEvaluationsByExpression.get(call)
    ?? new AureliaContainerEvaluation(
      AureliaContainerEvaluationKind.AuthoredChild,
      call,
      call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0]) ? call.arguments[0] : null,
      parent,
    );
  containerEvaluationsByExpression.set(call, evaluation);
  const child = new EvaluationObjectValue(new Map(), false, call);
  containerEvaluationsByObject.set(child, evaluation);
  return child;
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
  return aureliaFrameworkRegistrationEvaluationForValue(value)?.kind ?? null;
}

export function aureliaFrameworkRegistrationFactoryEvaluationForValue(
  value: EvaluationValue | null,
): AureliaFrameworkRegistrationFactoryEvaluation | null {
  if (value == null) {
    return null;
  }
  return frameworkRegistrationFactoryEvaluationsByValue.get(value) ?? null;
}

export function aureliaRegistrationFactoryEvaluationForValue(
  value: EvaluationValue | null,
): AureliaRegistrationFactoryEvaluation | null {
  if (value == null) {
    return null;
  }
  return registrationFactoryEvaluationsByValue.get(value) ?? null;
}

export function aureliaFrameworkRegistrationEvaluationForValue(
  value: EvaluationValue | null,
): AureliaFrameworkRegistrationEvaluation | null {
  if (value == null) {
    return null;
  }
  return frameworkRegistrationEvaluationsByValue.get(value) ?? null;
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
    if (
      entry.importKind === EvaluationImportKind.Named
      && entry.exportName === 'Registration'
      && DI_MODULES.has(entry.moduleSpecifier)
    ) {
      return registrationFactoryNamespace(entry.node);
    }
    const frameworkValue = aureliaFrameworkExternalImportValue(entry);
    if (frameworkValue != null) {
      return frameworkValue;
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

function aureliaFrameworkExternalImportValue(
  entry: EvaluationImportEntry,
): EvaluationValue | null {
  if (entry.importKind !== EvaluationImportKind.Named || entry.exportName == null) {
    return null;
  }
  if (entry.moduleSpecifier === '@aurelia/dialog' && entry.exportName === 'createDialogConfiguration') {
    return syntheticFunctionForCall('createDialogConfiguration', (call) => dialogConfigurationValue(call));
  }
  const moduleKinds = frameworkRegistrationKindsForModule(entry.moduleSpecifier);
  const frameworkKind = moduleKinds == null
    ? null
    : frameworkRegistrationKindForExportName(entry.exportName, moduleKinds);
  return frameworkKind == null
    ? null
    : frameworkRegistrationExportValue(frameworkKind, entry.node);
}

function aureliaExternalNamespaceValue(
  entry: EvaluationImportEntry,
): EvaluationBoundaryObjectValue | null {
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const exportEntry of frameworkRegistrationExportEntriesForModule(entry.moduleSpecifier) ?? []) {
    properties.set(exportEntry.exportName, new EvaluationObjectProperty(
      exportEntry.exportName,
      frameworkRegistrationExportValue(exportEntry.kind, entry.node),
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  if (entry.moduleSpecifier === '@aurelia/dialog') {
    properties.set('createDialogConfiguration', new EvaluationObjectProperty(
      'createDialogConfiguration',
      syntheticFunctionForCall('createDialogConfiguration', (call) => dialogConfigurationValue(call)),
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
    properties.set('Registration', new EvaluationObjectProperty(
      'Registration',
      registrationFactoryNamespace(entry.node),
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

function registrationFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return new EvaluationObjectValue(new Map(
    [...REGISTRATION_FACTORY_SHAPES].map(([factoryName, shape]) => syntheticCallProperty(
      factoryName,
      (call, _receiver, environment, moduleKey, depth, host) =>
        registrationFactoryValue(call, factoryName, shape, environment, moduleKey, depth, host),
    )),
  ), false, node);
}

function registrationFactoryValue(
  call: ts.CallExpression,
  factoryName: string,
  shape: RegistrationFactoryShape,
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticIntrinsicEvaluationHost,
): EvaluationObjectValue {
  const value = registryObject(call);
  registrationFactoryEvaluationsByValue.set(value, new AureliaRegistrationFactoryEvaluation(
    factoryName,
    shape,
    call,
    call.arguments.map((argument) => ts.isSpreadElement(argument)
      ? null
      : host.evaluateExpression(argument, environment, moduleKey, depth + 1)),
  ));
  return value;
}

function frameworkRegistrationExportValue(
  kind: FrameworkRegistrationKind,
  node: ts.Node,
): EvaluationValue {
  switch (kind) {
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
    case FrameworkRegistrationKind.RouterDefaultComponents:
    case FrameworkRegistrationKind.RouterDefaultResources:
      return frameworkRegistrationGroupValue(kind, node);
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return stateConfigurationFactoryNamespace(node);
    case FrameworkRegistrationKind.AppTask:
      return appTaskFactoryNamespace(node);
    case FrameworkRegistrationKind.LoggerConfiguration:
      return loggerConfigurationFactoryNamespace(node);
    case FrameworkRegistrationKind.StyleConfiguration:
      return styleConfigurationFactoryNamespace(node);
    case FrameworkRegistrationKind.StandardConfiguration:
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.ValidationConfiguration:
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
    case FrameworkRegistrationKind.ValidationI18nConfiguration:
      return customizableFrameworkRegistryValue(kind, node);
    case FrameworkRegistrationKind.RouterConfiguration:
      return routerConfigurationValue(node);
    case FrameworkRegistrationKind.DialogConfiguration:
      return dialogConfigurationValue(node);
    case FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration:
      return frameworkRegistryValue(kind, node);
  }
}

function frameworkRegistrationGroupValue(
  kind: FrameworkRegistrationKind,
  node: ts.Node,
): EvaluationArrayValue {
  const value = new EvaluationArrayValue([], true, node);
  frameworkRegistrationEvaluationsByValue.set(value, new AureliaFrameworkRegistrationEvaluation(kind));
  return value;
}

function frameworkRegistryValue(
  kind: FrameworkRegistrationKind,
  node: ts.Node,
  properties: readonly [string, EvaluationObjectProperty][] = [],
): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map([
    objectProperty('register'),
    ...properties,
  ]), false, node);
  frameworkRegistrationEvaluationsByValue.set(value, new AureliaFrameworkRegistrationEvaluation(kind));
  return value;
}

function customizableFrameworkRegistryValue(
  kind: FrameworkRegistrationKind,
  node: ts.Node,
): EvaluationObjectValue {
  return frameworkRegistryValue(kind, node, [
    syntheticCallProperty('customize', (call) => customizableFrameworkRegistryValue(kind, call)),
  ]);
}

function routerConfigurationValue(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistryValue(FrameworkRegistrationKind.RouterConfiguration, node, [
    syntheticCallProperty('customize', (call) =>
      frameworkRegistryValue(FrameworkRegistrationKind.RouterConfiguration, call)),
  ]);
}

function dialogConfigurationValue(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistryValue(FrameworkRegistrationKind.DialogConfiguration, node, [
    syntheticCallProperty('customize', (call) => dialogConfigurationValue(call)),
    syntheticCallProperty('withChild', (call, receiver) => receiver ?? dialogConfigurationValue(call)),
  ]);
}

function stateConfigurationFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.StateDefaultConfiguration, node, [
    syntheticCallProperty('init', (call) => stateConfigurationValue(call)),
  ]);
}

function stateConfigurationValue(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistryValue(FrameworkRegistrationKind.StateDefaultConfiguration, node, [
    syntheticCallProperty('withStore', (call, receiver) => receiver ?? stateConfigurationValue(call)),
  ]);
}

function appTaskFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.AppTask, node,
    [...APP_TASK_SLOT_NAMES].map((slot) => syntheticCallProperty(
      slot,
      (call) => frameworkRegistryValue(FrameworkRegistrationKind.AppTask, call),
    )),
  );
}

function loggerConfigurationFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.LoggerConfiguration, node, [
    syntheticCallProperty('create', (call) =>
      frameworkRegistryValue(FrameworkRegistrationKind.LoggerConfiguration, call)),
  ]);
}

function styleConfigurationFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.StyleConfiguration, node, [
    syntheticCallProperty('shadowDOM', (call) =>
      frameworkRegistryValue(FrameworkRegistrationKind.StyleConfiguration, call)),
  ]);
}

function frameworkRegistrationFactoryNamespace(
  resultKind: FrameworkRegistrationKind,
  node: ts.Node,
  properties: readonly [string, EvaluationObjectProperty][],
): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map(properties), false, node);
  frameworkRegistrationFactoryEvaluationsByValue.set(
    value,
    new AureliaFrameworkRegistrationFactoryEvaluation(resultKind),
  );
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
  if (
    result.analyzedModule?.mayHaveUnknownItems === true
    || result.analyzedModule?.mayHaveUnknownOrder === true
  ) {
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
  const value = syntheticFunctions.get(name);
  if (value == null) {
    throw new Error(`Missing synthetic Aurelia evaluation function for '${name}'.`);
  }
  return [name, new EvaluationObjectProperty(name, value, value.declaration, EvaluationObjectPropertyState.Closed)];
}

function syntheticCallProperty(
  name: string,
  evaluateCall: AureliaSyntheticCall,
): [string, EvaluationObjectProperty] {
  const value = syntheticFunctionForCall(name, evaluateCall);
  return [name, new EvaluationObjectProperty(name, value, value.declaration, EvaluationObjectPropertyState.Closed)];
}

function syntheticFunctionForCall(
  name: string,
  evaluateCall: AureliaSyntheticCall,
): EvaluationFunctionValue {
  const template = syntheticFunctions.get(name);
  if (template == null) {
    throw new Error(`Missing synthetic Aurelia evaluation function for '${name}'.`);
  }
  const value = new EvaluationFunctionValue(
    template.declaration,
    template.environment,
    template.node,
    template.properties,
  );
  aureliaSyntheticCallsByFunction.set(value, evaluateCall);
  return value;
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

function aureliaFacadeModuleForExpression(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return sourceFileImportModuleForLocal(
      current.getSourceFile(),
      current.text,
      'Aurelia',
      AURELIA_MODULES,
      true,
    );
  }
  if (!ts.isPropertyAccessExpression(current) || current.name.text !== 'Aurelia') {
    return null;
  }
  const namespace = unwrapExpression(current.expression);
  return ts.isIdentifier(namespace)
    ? sourceFileImportModuleForNamespace(namespace.getSourceFile(), namespace.text, AURELIA_MODULES)
    : null;
}

function sourceFileImportModuleForLocal(
  sourceFile: ts.SourceFile,
  localName: string,
  importedName: string,
  modules: ReadonlySet<string>,
  includeDefault: boolean,
): string | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !modules.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const clause = statement.importClause;
    if (includeDefault && clause?.name?.text === localName) {
      return statement.moduleSpecifier.text;
    }
    const named = clause?.namedBindings;
    if (named != null && ts.isNamedImports(named) && named.elements.some((element) =>
      element.name.text === localName
      && (element.propertyName?.text ?? element.name.text) === importedName
    )) {
      return statement.moduleSpecifier.text;
    }
  }
  return null;
}

function sourceFileImportModuleForNamespace(
  sourceFile: ts.SourceFile,
  localName: string,
  modules: ReadonlySet<string>,
): string | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !modules.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const named = statement.importClause?.namedBindings;
    if (named != null && ts.isNamespaceImport(named) && named.name.text === localName) {
      return statement.moduleSpecifier.text;
    }
  }
  return null;
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
