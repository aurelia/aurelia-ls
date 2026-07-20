import ts from 'typescript';
import {
  EvaluationBindingKind,
  ModuleEnvironmentRecord,
} from '../evaluation/environment.js';
import type {
  StaticEvaluationRuntimeHost,
  StaticEvaluationRuntimeHostOperations,
  StaticEvaluationValueMetadataTransfer,
} from '../evaluation/evaluator.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import {
  EvaluationArgumentList,
  EvaluationAuthoredArgument,
} from '../evaluation/argument-list.js';
import {
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationDispatch,
  type StaticInvocationFrame,
} from '../evaluation/invocation.js';
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
import { EvaluationValueEvidence } from '../evaluation/value-pressure.js';
import {
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationArrayElement,
  EvaluationArrayShape,
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
import {
  AURELIA_RESOLVER_KEY_KIND_BY_EXPORT,
  aureliaResolverKeyKindForExportName,
  type DiAureliaResolverExportName,
} from '../di/resolver-wrapper-recognition.js';
import { ContainerDefaultResolverPolicy } from '../di/container-configuration.js';
import { DiResolverKeyKind } from '../kernel/identity.js';
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
import {
  APP_TASK_SLOTS,
  AppTaskCallbackKind,
  type AppTaskSlot,
} from './app-task.js';

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
    function app() {}
    function start() {}
    function Aurelia() {}
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
    function resolve() {}
    function createContainer() {}
    function createInterface() {}
    function createChild() {}
    function aliasedResourcesRegistry() {}
    function resolverFactory() {}
    function resolver() {}
    function Boolean(value) { return !!value; }
  `,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const syntheticEnvironment = new ModuleEnvironmentRecord('semantic-runtime:aurelia-evaluation-runtime', null);
const syntheticFunctions = new Map<string, EvaluationFunctionValue>();
const frameworkRegistrationEvaluationsByValue = new WeakMap<object, AureliaFrameworkRegistrationEvaluation>();
const frameworkRegistrationFactoryEvaluationsByValue = new WeakMap<object, AureliaFrameworkRegistrationFactoryEvaluation>();
const registrationFactoryEvaluationsByValue = new WeakMap<object, AureliaRegistrationFactoryEvaluation>();
const appTaskEvaluationsByValue = new WeakMap<object, AureliaAppTaskEvaluation>();
const aureliaSyntheticCallsByFunction = new WeakMap<EvaluationFunctionValue, AureliaSyntheticCall>();
const aureliaResolveFunctions = new WeakSet<EvaluationFunctionValue>();
const aureliaResolverEvaluationsByValue = new WeakMap<object, AureliaResolverEvaluation>();
const registryBodiesByObject = new WeakMap<EvaluationObjectValue, RegistryBodyReference>();
const resolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const consumedResolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const invalidResolverBuilderObjects = new WeakSet<EvaluationObjectValue>();
const resolverBuilderEffectsByObject = new WeakMap<EvaluationObjectValue, AureliaInterfaceDefaultRegistrationEffect>();
const resolverBuilderEffectsByResult = new WeakMap<EvaluationObjectValue, AureliaInterfaceDefaultRegistrationEffect>();
const interfaceEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaInterfaceEvaluation>();
const containerEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaContainerEvaluation>();
const aureliaFacadeEvaluationsByObject = new WeakMap<EvaluationObjectValue, AureliaFacadeEvaluation>();
const aureliaFacadeModulesByConstructor = new WeakMap<EvaluationFunctionValue, string>();
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
    readonly argumentList: EvaluationArgumentList,
  ) {}
}

/** Evaluator-local meaning retained by one concrete `AppTask.*(...)` registry value. */
export class AureliaAppTaskEvaluation {
  constructor(
    readonly slot: AppTaskSlot,
    readonly callbackKind: AppTaskCallbackKind,
    readonly keyExpression: ts.Expression | null,
    readonly key: EvaluationValueEvidence | null,
    readonly callbackExpression: ts.Expression | null,
    readonly callback: EvaluationValueEvidence | null,
    readonly sourceNode: ts.CallExpression,
  ) {}
}

/** Evaluator-local meaning of one built-in Aurelia resolver value. */
export class AureliaResolverEvaluation {
  constructor(
    readonly resolverKind: DiResolverKeyKind,
    readonly sourceNode: ts.Node,
    readonly argumentList: EvaluationArgumentList | null,
  ) {}
}

type AureliaSyntheticCall = (
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
) => EvaluationValue;

for (const statement of syntheticSource.statements) {
  if (ts.isFunctionDeclaration(statement) && statement.name != null) {
    const value = new EvaluationFunctionValue(statement, syntheticEnvironment, statement);
    syntheticFunctions.set(statement.name.text, value);
    syntheticEnvironment.initializeBinding(statement.name.text, value, EvaluationBindingKind.Function, false, statement, []);
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
    syntheticEnvironment.initializeBinding(declaration.name.text, value, EvaluationBindingKind.Const, false, declaration, []);
  }
}

const aureliaStaticEvaluationRuntimeHostOperations: StaticEvaluationRuntimeHostOperations = {
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
          forkEvaluationArgumentList(registrationFactory.argumentList, transfer),
        ),
      );
    }
    const appTask = appTaskEvaluationsByValue.get(source);
    if (appTask != null) {
      appTaskEvaluationsByValue.set(target, new AureliaAppTaskEvaluation(
        appTask.slot,
        appTask.callbackKind,
        appTask.keyExpression,
        appTask.key == null
          ? null
          : new EvaluationValueEvidence(transfer.forkValue(appTask.key.value), appTask.key.openSeams),
        appTask.callbackExpression,
        appTask.callback == null
          ? null
          : new EvaluationValueEvidence(transfer.forkValue(appTask.callback.value), appTask.callback.openSeams),
        appTask.sourceNode,
      ));
    }
    if (source.kind === EvaluationValueKind.Function && target.kind === EvaluationValueKind.Function) {
      const syntheticCall = aureliaSyntheticCallsByFunction.get(source);
      if (syntheticCall != null) {
        aureliaSyntheticCallsByFunction.set(target, syntheticCall);
      }
      if (aureliaResolveFunctions.has(source)) {
        aureliaResolveFunctions.add(target);
      }
      const facadeModule = aureliaFacadeModulesByConstructor.get(source);
      if (facadeModule != null) {
        aureliaFacadeModulesByConstructor.set(target, facadeModule);
      }
    }
    const resolverEvaluation = aureliaResolverEvaluationsByValue.get(source);
    if (resolverEvaluation != null) {
      aureliaResolverEvaluationsByValue.set(target, new AureliaResolverEvaluation(
        resolverEvaluation.resolverKind,
        resolverEvaluation.sourceNode,
        resolverEvaluation.argumentList == null
          ? null
          : forkEvaluationArgumentList(resolverEvaluation.argumentList, transfer),
      ));
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

  evaluateInvocation(
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch {
    if (frame.kind === StaticInvocationKind.Construct) {
      const value = evaluateAureliaFacadeConstruction(frame);
      return value == null ? StaticInvocationNotApplicable : staticInvocationValue(value);
    }

    const callee = frame.callee.value;
    const syntheticCall = callee.kind === EvaluationValueKind.Function
      ? aureliaSyntheticCallsByFunction.get(callee) ?? null
      : null;
    if (syntheticCall != null) {
      return staticInvocationValue(syntheticCall(frame, host));
    }

    return StaticInvocationNotApplicable;
  },
};

export const aureliaStaticEvaluationRuntimeHost: StaticEvaluationRuntimeHost = {
  ...aureliaStaticEvaluationRuntimeHostOperations,
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
  frame: StaticInvocationFrame,
): EvaluationObjectValue | null {
  const expression = frame.node as ts.NewExpression;
  const callee = frame.callee.value;
  const facadeModule = callee.kind === EvaluationValueKind.Function
    ? aureliaFacadeModulesByConstructor.get(callee) ?? null
    : null;
  if (facadeModule == null) {
    return null;
  }

  const argumentEvidence = frame.argumentList.exactEvidence();
  const containerArgument = expression.arguments?.[0] ?? null;
  const containerArgumentValue = argumentEvidence?.[0]?.value ?? null;
  const usesDefaultContainer = argumentEvidence != null && (
    containerArgument == null
    || containerArgumentValue?.kind === EvaluationValueKind.Undefined
  );
  const selectedContainer = usesDefaultContainer
    ? null
    : aureliaContainerEvaluationForValue(containerArgumentValue);
  const includesBrowserDefaults = facadeModule === AURELIA_BROWSER_FACADE_MODULE && usesDefaultContainer;
  const containerEvaluation = usesDefaultContainer
    ? implicitFacadeContainerEvaluation(expression, includesBrowserDefaults)
    : selectedContainer;
  const facade = new AureliaFacadeEvaluation(
    expression,
    !usesDefaultContainer && selectedContainer == null
      ? AureliaFacadeContainerState.Open
      : AureliaFacadeContainerState.Closed,
    containerEvaluation,
    includesBrowserDefaults,
  );
  return aureliaFacadeObject(facade, expression);
}

function evaluateAureliaFacadeInstanceCall(frame: StaticInvocationFrame): EvaluationValue {
  const receiver = frame.thisValue?.value ?? null;
  const facade = aureliaFacadeEvaluationForValue(receiver);
  if (facade == null || receiver?.kind !== EvaluationValueKind.Object) {
    return EvaluationUndefined;
  }
  return receiver;
}

function evaluateAureliaFacadeStartCall(frame: StaticInvocationFrame): EvaluationValue {
  return new EvaluationBoundaryValue(
    EvaluationBoundaryKind.AsyncExecution,
    'Aurelia.start() completion',
    frame.node,
  );
}

function evaluateAureliaStaticFacadeCall(frame: StaticInvocationFrame): EvaluationValue {
  const call = frame.node as ts.CallExpression;
  const facade = new AureliaFacadeEvaluation(
    call,
    AureliaFacadeContainerState.Closed,
    implicitFacadeContainerEvaluation(call, true),
    true,
  );
  return aureliaFacadeObject(facade, call);
}

function implicitFacadeContainerEvaluation(
  expression: ts.NewExpression | ts.CallExpression,
  includesBrowserDefaults: boolean,
): AureliaContainerEvaluation {
  return new AureliaContainerEvaluation(
    includesBrowserDefaults
      ? AureliaContainerEvaluationKind.BrowserFacadeDefault
      : AureliaContainerEvaluationKind.RuntimeFacadeDefault,
    expression,
    null,
  );
}

function aureliaFacadeObject(
  facade: AureliaFacadeEvaluation,
  node: ts.Node,
): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map([
    syntheticCallProperty('register', evaluateAureliaFacadeInstanceCall),
    syntheticCallProperty('app', evaluateAureliaFacadeInstanceCall),
    syntheticCallProperty('start', evaluateAureliaFacadeStartCall),
  ]), false, node);
  aureliaFacadeEvaluationsByObject.set(value, facade);
  return value;
}

function evaluateCreateContainerCall(
  frame: StaticInvocationFrame,
): EvaluationObjectValue {
  const call = frame.node as ts.CallExpression;
  const evaluation = new AureliaContainerEvaluation(
    AureliaContainerEvaluationKind.AuthoredRoot,
    call,
    call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0]) ? call.arguments[0] : null,
  );
  return aureliaContainerObject(evaluation, call);
}

function evaluateAureliaContainerRegisterCall(
  frame: StaticInvocationFrame,
): EvaluationValue {
  const receiver = frame.thisValue?.value ?? null;
  return aureliaContainerEvaluationForValue(receiver) != null
    && receiver?.kind === EvaluationValueKind.Object
    ? receiver
    : EvaluationUndefined;
}

function evaluateAureliaCreateChildCall(
  frame: StaticInvocationFrame,
): EvaluationValue {
  const call = frame.node as ts.CallExpression;
  const receiver = frame.thisValue?.value ?? null;
  const parent = aureliaContainerEvaluationForValue(receiver);
  if (parent == null || receiver?.kind !== EvaluationValueKind.Object) {
    return EvaluationUndefined;
  }
  const evaluation = new AureliaContainerEvaluation(
    AureliaContainerEvaluationKind.AuthoredChild,
    call,
    call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0]) ? call.arguments[0] : null,
    parent,
  );
  return aureliaContainerObject(evaluation, call);
}

function aureliaContainerObject(
  evaluation: AureliaContainerEvaluation,
  node: ts.Node,
): EvaluationObjectValue {
  const value = new EvaluationObjectValue(new Map([
    syntheticCallProperty('register', evaluateAureliaContainerRegisterCall),
    syntheticCallProperty('createChild', evaluateAureliaCreateChildCall),
  ]), false, node);
  containerEvaluationsByObject.set(value, evaluation);
  return value;
}

function evaluateCreateInterfaceCall(
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
): EvaluationObjectValue {
  const call = frame.node as ts.CallExpression;
  const arguments_ = exactAureliaInvocationArguments(frame, host);
  if (arguments_ == null) {
    const interfaceValue = interfaceEvaluationObject(call, '(anonymous)', true);
    interfaceEvaluationsByObject.set(interfaceValue, new AureliaInterfaceEvaluation(
      '(anonymous)',
      AureliaInterfaceDefaultRegistrationState.Open,
      null,
      call,
    ));
    return interfaceValue;
  }
  const first = arguments_[0]?.value ?? EvaluationUndefined;
  const second = arguments_[1]?.value ?? EvaluationUndefined;
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
  const result = host.evaluateFunctionWithArguments(
    configure,
    call,
    [new EvaluationValueEvidence(builder, [])],
    frame.moduleKey,
    frame.depth + 1,
    null,
  );
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
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const [name, shape] of REGISTRATION_FACTORY_SHAPES) {
    const valueShape = shape.value;
    if (valueShape == null) {
      continue;
    }
    properties.set(...syntheticCallProperty(
      name,
      (frame, host) => evaluateResolverBuilderCall(
        frame,
        host,
        shape.strategy,
        valueShape.valueKind,
      ),
    ));
  }
  const value = new EvaluationObjectValue(properties, false, node);
  resolverBuilderObjects.add(value);
  return value;
}

function evaluateResolverBuilderCall(
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
  strategy: RegistrationStrategy,
  valueKind: RegistrationValueKind,
): EvaluationValue {
  const call = frame.node as ts.CallExpression;
  const receiver = frame.thisValue?.value ?? null;
  if (receiver?.kind !== EvaluationValueKind.Object || !resolverBuilderObjects.has(receiver)) {
    return EvaluationUndefined;
  }
  if (consumedResolverBuilderObjects.has(receiver)) {
    invalidResolverBuilderObjects.add(receiver);
    return host.unknown(
      'DI interface default registration invoked one ResolverBuilder more than once.',
      call,
      frame.moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  consumedResolverBuilderObjects.add(receiver);
  const arguments_ = exactAureliaInvocationArguments(frame, host);
  if (arguments_ == null) {
    invalidResolverBuilderObjects.add(receiver);
    return host.unknown(
      'DI interface default registration argument list did not close.',
      call,
      frame.moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }
  const valueExpression = call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0])
    ? call.arguments[0]
    : null;
  const value = valueExpression == null
    ? EvaluationUndefined
    : arguments_[0]?.value ?? EvaluationUndefined;
  const effect = new AureliaInterfaceDefaultRegistrationEffect(
    strategy,
    valueKind,
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
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  return host.unknown(
    'Aurelia resolve(...) requires an active modeled DI container.',
    frame.node,
    frame.moduleKey,
    EvaluationOpenSeamKind.DynamicCall,
  );
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

export function aureliaAppTaskEvaluationForValue(
  value: EvaluationValue | null,
): AureliaAppTaskEvaluation | null {
  return value == null ? null : appTaskEvaluationsByValue.get(value) ?? null;
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

/** Whether an evaluator function is Aurelia's imported ambient `resolve` API. */
export function isAureliaResolveEvaluationFunction(
  value: EvaluationValue | null,
): value is EvaluationFunctionValue {
  return value?.kind === EvaluationValueKind.Function
    && aureliaResolveFunctions.has(value);
}

/** Built-in resolver identity and prepared arguments retained on an evaluated resolver value. */
export function aureliaResolverEvaluationForValue(
  value: EvaluationValue | null,
): AureliaResolverEvaluation | null {
  return value == null ? null : aureliaResolverEvaluationsByValue.get(value) ?? null;
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
    const facadeValue = aureliaFacadeExternalImportValue(entry);
    if (facadeValue != null) {
      return facadeValue;
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
    if (
      entry.importKind === EvaluationImportKind.Named
      && entry.exportName === 'aliasedResourcesRegistry'
      && MODULE_LOADER_MODULES.has(entry.moduleSpecifier)
    ) {
      return aliasedResourcesRegistryFunction();
    }
    const diValue = aureliaDiExternalImportValue(entry);
    if (diValue != null) {
      return diValue;
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
    return syntheticFunctionForCall('createDialogConfiguration', (frame) => dialogConfigurationValue(frame.node));
  }
  const moduleKinds = frameworkRegistrationKindsForModule(entry.moduleSpecifier);
  const frameworkKind = moduleKinds == null
    ? null
    : frameworkRegistrationKindForExportName(entry.exportName, moduleKinds);
  return frameworkKind == null
    ? null
    : aureliaFrameworkRegistrationValueForKind(frameworkKind, entry.node);
}

function aureliaFacadeExternalImportValue(
  entry: EvaluationImportEntry,
): EvaluationFunctionValue | null {
  if (!AURELIA_MODULES.has(entry.moduleSpecifier)) {
    return null;
  }
  const isNamedFacade = entry.importKind === EvaluationImportKind.Named && entry.exportName === 'Aurelia';
  const isBrowserDefault = entry.importKind === EvaluationImportKind.Default
    && entry.moduleSpecifier === AURELIA_BROWSER_FACADE_MODULE;
  return isNamedFacade || isBrowserDefault
    ? aureliaFacadeConstructor(entry.moduleSpecifier, entry.node)
    : null;
}

function aureliaDiExternalImportValue(
  entry: EvaluationImportEntry,
): EvaluationValue | null {
  if (
    entry.importKind !== EvaluationImportKind.Named
    || entry.exportName == null
    || !DI_MODULES.has(entry.moduleSpecifier)
  ) {
    return null;
  }
  if (entry.exportName === 'resolve') {
    return aureliaResolveFunction(entry.node);
  }
  if (entry.exportName === 'DI') {
    return aureliaDiObject(entry.node, entry.moduleSpecifier);
  }
  const resolverKind = aureliaResolverKeyKindForExportName(entry.exportName);
  return resolverKind == null
    ? null
    : resolverKind === DiResolverKeyKind.Ignore
      ? aureliaResolverValue(resolverKind, entry.node, null)
      : aureliaResolverFactoryFunction(entry.exportName, resolverKind);
}

function aureliaExternalNamespaceValue(
  entry: EvaluationImportEntry,
): EvaluationBoundaryObjectValue | null {
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const exportEntry of frameworkRegistrationExportEntriesForModule(entry.moduleSpecifier) ?? []) {
    properties.set(exportEntry.exportName, new EvaluationObjectProperty(
      exportEntry.exportName,
      aureliaFrameworkRegistrationValueForKind(exportEntry.kind, entry.node),
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  if (entry.moduleSpecifier === '@aurelia/dialog') {
    properties.set('createDialogConfiguration', new EvaluationObjectProperty(
      'createDialogConfiguration',
      syntheticFunctionForCall('createDialogConfiguration', (frame) => dialogConfigurationValue(frame.node)),
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  if (DI_MODULES.has(entry.moduleSpecifier)) {
    properties.set('DI', new EvaluationObjectProperty(
      'DI',
      aureliaDiObject(entry.node, entry.moduleSpecifier),
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
    properties.set('resolve', new EvaluationObjectProperty(
      'resolve',
      aureliaResolveFunction(entry.node),
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
    for (const [exportName, resolverKind] of Object.entries(AURELIA_RESOLVER_KEY_KIND_BY_EXPORT) as readonly [DiAureliaResolverExportName, DiResolverKeyKind][]) {
      properties.set(exportName, new EvaluationObjectProperty(
        exportName,
        resolverKind === DiResolverKeyKind.Ignore
          ? aureliaResolverValue(resolverKind, entry.node, null)
          : aureliaResolverFactoryFunction(exportName, resolverKind),
        entry.node,
        EvaluationObjectPropertyState.Closed,
      ));
    }
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
  if (AURELIA_MODULES.has(entry.moduleSpecifier)) {
    const constructor = aureliaFacadeConstructor(entry.moduleSpecifier, entry.node);
    properties.set('Aurelia', new EvaluationObjectProperty(
      'Aurelia',
      constructor,
      entry.node,
      EvaluationObjectPropertyState.Closed,
    ));
    if (entry.moduleSpecifier === AURELIA_BROWSER_FACADE_MODULE) {
      properties.set('default', new EvaluationObjectProperty(
        'default',
        constructor,
        entry.node,
        EvaluationObjectPropertyState.Closed,
      ));
    }
  }
  if (MODULE_LOADER_MODULES.has(entry.moduleSpecifier)) {
    properties.set('aliasedResourcesRegistry', new EvaluationObjectProperty(
      'aliasedResourcesRegistry',
      aliasedResourcesRegistryFunction(),
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

function aureliaFacadeConstructor(
  moduleSpecifier: string,
  node: ts.Node,
): EvaluationFunctionValue {
  const properties = moduleSpecifier === AURELIA_BROWSER_FACADE_MODULE
    ? new Map([
        syntheticCallProperty('register', evaluateAureliaStaticFacadeCall),
        syntheticCallProperty('app', evaluateAureliaStaticFacadeCall),
      ])
    : new Map<string, EvaluationObjectProperty>();
  const value = new EvaluationFunctionValue(
    syntheticFunctions.get('Aurelia')!.declaration,
    syntheticEnvironment,
    node,
    properties,
  );
  aureliaFacadeModulesByConstructor.set(value, moduleSpecifier);
  return value;
}

function aureliaDiObject(
  node: ts.Node,
  moduleSpecifier: string,
): EvaluationBoundaryObjectValue {
  return new EvaluationBoundaryObjectValue(
    EvaluationBoundaryKind.ExternalModule,
    `${moduleSpecifier}.DI`,
    new Map([
      syntheticCallProperty('createContainer', evaluateCreateContainerCall),
      syntheticCallProperty('createInterface', evaluateCreateInterfaceCall),
    ]),
    node,
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
      (frame) => registrationFactoryValue(frame, factoryName, shape),
    )),
  ), false, node);
}

function registrationFactoryValue(
  frame: StaticInvocationFrame,
  factoryName: string,
  shape: RegistrationFactoryShape,
): EvaluationObjectValue {
  const call = frame.node as ts.CallExpression;
  const value = registryObject(call);
  registrationFactoryEvaluationsByValue.set(value, new AureliaRegistrationFactoryEvaluation(
    factoryName,
    shape,
    call,
    frame.argumentList,
  ));
  return value;
}

/** Build the canonical evaluator value shape for one known framework registration export. */
export function aureliaFrameworkRegistrationValueForKind(
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
  const value = new EvaluationArrayValue(
    [],
    node,
    EvaluationArrayShape.from({
      exactLength: null,
      hasExactElements: false,
      hasExactOrder: true,
      uncertainties: [],
      extentOpenSeams: [],
      elementOpenSeams: [],
      orderOpenSeams: [],
    }),
  );
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
    syntheticCallProperty('customize', (frame) => customizableFrameworkRegistryValue(kind, frame.node)),
  ]);
}

function routerConfigurationValue(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistryValue(FrameworkRegistrationKind.RouterConfiguration, node, [
    syntheticCallProperty('customize', (frame) =>
      frameworkRegistryValue(FrameworkRegistrationKind.RouterConfiguration, frame.node)),
  ]);
}

function dialogConfigurationValue(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistryValue(FrameworkRegistrationKind.DialogConfiguration, node, [
    syntheticCallProperty('customize', (frame) => dialogConfigurationValue(frame.node)),
    syntheticCallProperty('withChild', (frame) => frame.thisValue?.value ?? dialogConfigurationValue(frame.node)),
  ]);
}

function stateConfigurationFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.StateDefaultConfiguration, node, [
    syntheticCallProperty('init', (frame) => stateConfigurationValue(frame.node)),
  ]);
}

function stateConfigurationValue(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistryValue(FrameworkRegistrationKind.StateDefaultConfiguration, node, [
    syntheticCallProperty('withStore', (frame) => frame.thisValue?.value ?? stateConfigurationValue(frame.node)),
  ]);
}

function appTaskFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.AppTask, node,
    APP_TASK_SLOTS.map((slot) => syntheticCallProperty(
      slot,
      (frame, host) => appTaskRegistryValue(slot, frame, host),
    )),
  );
}

function appTaskRegistryValue(
  slot: AppTaskSlot,
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
): EvaluationObjectValue {
  const value = frameworkRegistryValue(FrameworkRegistrationKind.AppTask, frame.node);
  const arguments_ = exactAureliaInvocationArguments(frame, host);
  const call = frame.node as ts.CallExpression;
  const keyed = (arguments_?.length ?? 0) >= 2;
  const keyIndex = keyed ? 0 : -1;
  const callbackIndex = keyed ? 1 : 0;
  const keyArgument = keyIndex < 0 ? null : frame.argumentList.authoredArguments[keyIndex] ?? null;
  const callbackArgument = frame.argumentList.authoredArguments[callbackIndex] ?? null;
  appTaskEvaluationsByValue.set(value, new AureliaAppTaskEvaluation(
    slot,
    keyed ? AppTaskCallbackKind.ResolvedKey : AppTaskCallbackKind.NoArgument,
    keyArgument?.valueExpression ?? null,
    keyIndex < 0 ? null : arguments_?.[keyIndex] ?? null,
    callbackArgument?.valueExpression ?? null,
    arguments_?.[callbackIndex] ?? null,
    call,
  ));
  return value;
}

function loggerConfigurationFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.LoggerConfiguration, node, [
    syntheticCallProperty('create', (frame) =>
      frameworkRegistryValue(FrameworkRegistrationKind.LoggerConfiguration, frame.node)),
  ]);
}

function styleConfigurationFactoryNamespace(node: ts.Node): EvaluationObjectValue {
  return frameworkRegistrationFactoryNamespace(FrameworkRegistrationKind.StyleConfiguration, node, [
    syntheticCallProperty('shadowDOM', (frame) =>
      frameworkRegistryValue(FrameworkRegistrationKind.StyleConfiguration, frame.node)),
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

function aliasedResourcesRegistryFunction(): EvaluationFunctionValue {
  return syntheticFunctionForCall('aliasedResourcesRegistry', (frame, host) => registryObject(
    frame.node,
    aliasedResourcesRegistryBody(frame, host),
  ));
}

function aliasedResourcesRegistryBody(
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
): RegistryBodyReference {
  const arguments_ = exactAureliaInvocationArguments(frame, host);
  if (arguments_ == null) {
    return new RegistryBodyReference(
      RegistryBodyKind.AliasedResourcesRegistry,
      RegistryBodyInterpretationState.Open,
    );
  }
  const input = arguments_[0]?.value ?? EvaluationUndefined;
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
    aliasedResourcesRegistryAliasArgumentsClosed(arguments_)
      ? RegistryBodyInterpretationState.Interpreted
      : RegistryBodyInterpretationState.Open,
  );
}

function aliasedResourcesRegistryAliasArgumentsClosed(
  arguments_: readonly EvaluationValueEvidence[],
): boolean {
  const mainAlias = arguments_[1]?.value ?? EvaluationUndefined;
  if (
    mainAlias.kind !== EvaluationValueKind.Undefined
    && mainAlias.kind !== EvaluationValueKind.Null
    && mainAlias.kind !== EvaluationValueKind.String
  ) {
    return false;
  }
  const aliases = arguments_[2]?.value ?? EvaluationUndefined;
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

function exactAureliaInvocationArguments(
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
): readonly EvaluationValueEvidence[] | null {
  const arguments_ = frame.argumentList.exactEvidence();
  if (arguments_ == null) {
    return null;
  }
  host.replayOpenSeams(arguments_.flatMap((argument) => argument.openSeams));
  return arguments_;
}

function syntheticCallProperty(
  name: string,
  evaluateCall: AureliaSyntheticCall,
): [string, EvaluationObjectProperty] {
  const value = syntheticFunctionForCall(name, evaluateCall);
  return [name, new EvaluationObjectProperty(name, value, value.declaration, EvaluationObjectPropertyState.Closed)];
}

function aureliaResolveFunction(node: ts.Node): EvaluationFunctionValue {
  const value = syntheticFunctionForCall('resolve', (frame, host) =>
    evaluateAureliaResolveCall(frame, host)
  );
  aureliaResolveFunctions.add(value);
  return value;
}

function aureliaResolverFactoryFunction(
  exportName: string,
  resolverKind: DiResolverKeyKind,
): EvaluationFunctionValue {
  return syntheticFunctionForCall('resolverFactory', (frame) =>
    aureliaResolverValue(resolverKind, frame.node, frame.argumentList)
  );
}

function aureliaResolverValue(
  resolverKind: DiResolverKeyKind,
  sourceNode: ts.Node,
  argumentList: EvaluationArgumentList | null,
): EvaluationFunctionValue | EvaluationObjectValue {
  const value = resolverKind === DiResolverKeyKind.Last
    ? new EvaluationObjectValue(new Map(), false, sourceNode)
    : syntheticFunctionValue('resolver');
  aureliaResolverEvaluationsByValue.set(
    value,
    new AureliaResolverEvaluation(resolverKind, sourceNode, argumentList),
  );
  return value;
}

function syntheticFunctionValue(name: string): EvaluationFunctionValue {
  const template = syntheticFunctions.get(name);
  if (template == null) {
    throw new Error(`Missing synthetic Aurelia evaluation function for '${name}'.`);
  }
  return new EvaluationFunctionValue(
    template.declaration,
    template.environment,
    template.node,
    template.properties,
  );
}

function syntheticFunctionForCall(
  name: string,
  evaluateCall: AureliaSyntheticCall,
): EvaluationFunctionValue {
  const value = syntheticFunctionValue(name);
  aureliaSyntheticCallsByFunction.set(value, evaluateCall);
  return value;
}

function forkEvaluationArgumentList(
  argumentList: EvaluationArgumentList,
  transfer: StaticEvaluationValueMetadataTransfer,
): EvaluationArgumentList {
  return new EvaluationArgumentList(
    argumentList.authoredArguments.map((argument) => new EvaluationAuthoredArgument(
      argument.node,
      argument.valueExpression,
      new EvaluationValueEvidence(
        transfer.forkValue(argument.evidence.value),
        argument.evidence.openSeams,
      ),
    )),
    argumentList.elements.map((element) => new EvaluationArrayElement(
      transfer.forkValue(element.value),
      element.expression,
      element.openSeams,
      element.runtimeIndex,
    )),
    argumentList.shape,
    argumentList.outcome,
  );
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
