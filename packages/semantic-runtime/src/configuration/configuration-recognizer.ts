import ts from 'typescript';
import { openSeamReasonKindsForEvaluationRead } from '../evaluation/boundary-open-reason.js';
import { readEvaluationEnumerableOwnEntries } from '../evaluation/enumerable-own-properties.js';
import {
  readStaticSourceLiteralValue,
  readStaticStringArrayValue,
  StaticInvocationEvidenceExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  isStaticInvocationOccurrence,
  StaticInvocationPreparationBoundaryKind,
  type StaticInvocationPreparationBoundary,
} from '../evaluation/invocation.js';
import { evaluationOpenSeamDefaultReasonKinds } from '../evaluation/seams.js';
import {
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  type EvaluationClassValue,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  readDeclarationLocalName,
  readObjectPropertyExpression,
  readPropertyName,
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  RegistrationAdmissionKind,
  RegistrationKeyRole,
  RegistrationStrategy,
} from '../registration/registration-admission.js';
import {
  REGISTRATION_FACTORY_SHAPES,
  type RegistrationFactoryShape,
} from '../registration/registration-factory-shapes.js';
import {
  readDeferredRegistryParameters,
  readRegistrationFactoryNameFromExpression,
  readRequiredRegistrationFactoryArgument,
} from '../registration/registration-factory-arguments.js';
import {
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from '../registration/registration-observation.js';
import {
  FrameworkRegistrationKind,
  RegistrationValueKind,
} from '../registration/registration-reference.js';
import {
  frameworkRegistrationKindForExportName,
  frameworkRegistrationKindsForModule,
  traceNameForFrameworkRegistrationKind,
} from '../registration/framework-registration-manifest.js';
import { registrationAdmissionForEvaluatedFactory } from '../registration/evaluated-registration-factory.js';
import { projectEvaluatedRegistrationValue } from '../registration/evaluated-registration-projector.js';
import {
  evaluatedConstructableValueSource,
  evaluatedRegistryValueObservation,
  evaluatedValueLocalName,
  hasEvaluationRegisterFunction,
  isDeclarationValueNode,
  registryObjectLiteralLocalName,
  registryValueSource,
  type EvaluatedRegistrationValueSource,
  type EvaluatedRegistryValue,
} from '../registration/evaluated-registration-value.js';
import {
  AureliaInterfaceDefaultRegistrationState,
  aureliaContainerEvaluationForValue,
  aureliaFacadeEvaluationForValue,
  aureliaFrameworkRegistrationEvaluationForValue,
  aureliaFrameworkRegistrationKindForEvaluationValue,
  aureliaFrameworkRegistrationValueForKind,
  aureliaRegistryBodyForEvaluationValue,
  AureliaContainerEvaluationKind,
  AureliaFacadeContainerState,
  type AureliaContainerEvaluation,
  type AureliaFacadeEvaluation,
  type AureliaInterfaceDefaultRegistrationEffect,
} from './aurelia-evaluation-runtime.js';
import {
  APP_TASK_SLOTS,
  AppTaskCallbackKind,
  AppTaskSlot,
} from './app-task.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
  firstSymbolDeclaration,
  symbolForExpression,
} from '../type-system/checker-node-helpers.js';
import {
  ConfigurationOptionContributionKind,
  ConfigurationOptionValueKind,
} from './configuration-option.js';
import {
  ConfigurationSequenceKind,
  ConfigurationStepKind,
} from './configuration-sequence.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import {
  AppRootConfigObservation,
  AppTaskObservation,
  ConfigurationCallbackObservation,
  ConfigurationCarrierKind,
  ConfigurationOptionContributionObservation,
  ConfigurationOptionValueObservation,
  configurationRecognitionOpensForEvaluationRead,
  ConfigurationRecognitionOpen,
  ConfigurationSequenceObservation,
  ConfigurationStepObservation,
  ConfigurationTargetObservation,
} from './configuration-observation.js';

const REGISTRATION_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const CONTAINER_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const REGISTRY_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const APP_TASK_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

const APP_TASK_SLOT_NAMES = new Set<string>(APP_TASK_SLOTS);

class ImportedBindings {
  readonly appTaskIdentifiers = new Set<string>();
  readonly appTaskNamespaces = new Set<string>();
  readonly registrationIdentifiers = new Set<string>();
  readonly registrationNamespaces = new Set<string>();
  readonly containerIdentifiers = new Set<string>();
  readonly containerFactoryIdentifiers = new Set<string>();
  readonly containerNamespaces = new Set<string>();
  readonly containerDiIdentifiers = new Set<string>();
  readonly containerTypeIdentifiers = new Set<string>();
  readonly registryTypeIdentifiers = new Set<string>();
  readonly frameworkRegistrationIdentifiers = new Map<string, FrameworkRegistrationKind>();
  readonly frameworkRegistrationNamespaces = new Map<string, readonly FrameworkRegistrationKind[]>();
}

interface RegisterArgumentObservationSet {
  readonly admissions: RegistrationAdmissionObservation[];
  readonly appTasks: AppTaskObservation[];
}

interface RegisterArgumentObservation {
  readonly admission: RegistrationAdmissionObservation;
  readonly appTask: AppTaskObservation | null;
}

class RegistrationFactoryCallMatch {
  constructor(
    readonly factoryName: string,
    readonly shape: RegistrationFactoryShape,
    readonly call: ts.CallExpression,
  ) {}
}

type ConfigurationSequenceEvaluation = AureliaFacadeEvaluation | AureliaContainerEvaluation;

class ConfigurationPreparationObservation {
  constructor(
    readonly owner: ConfigurationSequenceEvaluation,
    readonly sequenceKind: ConfigurationSequenceKind,
    readonly sourceNode: ts.CallExpression,
    readonly receiverLocalName: string | null,
    readonly openSeams: readonly ConfigurationRecognitionOpen[],
  ) {}
}

class GlobalConfigurationSequenceGroup {
  readonly steps: ConfigurationStepObservation[] = [];
  readonly openSeams: ConfigurationRecognitionOpen[] = [];

  constructor(
    readonly owner: ConfigurationSequenceEvaluation | ConfigurationStepObservation,
    readonly sourceNode: ts.Node,
    readonly localName: string | null,
    readonly sequenceKindHint: ConfigurationSequenceKind = ConfigurationSequenceKind.Unknown,
  ) {}
}

/** Recognizes Aurelia app/configuration flow over one evaluated source module. */
export class ConfigurationRecognizer {
  recognize(context: ConfigurationRecognitionContext): readonly ConfigurationSequenceObservation[] {
    const bindings = readImportedBindings(context.sourceFile);
    return readConfigurationSequences(context, bindings);
  }
}

function readConfigurationSequences(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
): readonly ConfigurationSequenceObservation[] {
  const registrySequences: ConfigurationSequenceObservation[] = [];

  const visit = (node: ts.Node): void => {
    const registryFunction = readRegistryFunctionSource(node, bindings);
    if (registryFunction != null) {
      const registrySteps = readRegistryFunctionSteps(context, bindings, registryFunction.functionLike);
      registrySequences.push(new ConfigurationSequenceObservation(
        ConfigurationSequenceKind.Registry,
        registryFunction.owner,
        registryFunction.localName,
        registrySteps,
      ));
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  const global = readGlobalConfigurationObservations(context, bindings);
  return [
    ...globalSequenceForObservations(context, global.steps, global.preparations),
    ...registrySequences.sort((left, right) => compareNodes(
      context.sourceFile,
      left.sourceNode,
      right.sourceNode,
    )),
  ];
}

function readGlobalConfigurationObservations(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
): {
  readonly steps: readonly ConfigurationStepObservation[];
  readonly preparations: readonly ConfigurationPreparationObservation[];
} {
  const steps: ConfigurationStepObservation[] = [];
  const preparations: ConfigurationPreparationObservation[] = [];
  for (const invocation of context.evaluation.invocationEvaluations) {
    const invocationContext = context.withExpressionReader(new StaticInvocationEvidenceExpressionReader(
      invocation.moduleKey,
      [invocation],
    ));
    if (!isStaticInvocationOccurrence(invocation)) {
      const preparation = recognizeConfigurationPreparationBoundary(invocationContext, invocation);
      if (preparation != null) {
        preparations.push(preparation);
      }
      continue;
    }
    const step = ts.isNewExpression(invocation.node)
      ? recognizeAureliaConstructor(invocationContext, invocation.node)
      : recognizeCall(invocationContext, invocation.node, bindings, false);
    if (step != null) {
      const executionOrdinal = context.sourceIndex.executionOrdinalForInvocation(invocation);
      steps.push(executionOrdinal == null ? step : step.withExecutionOrdinal(executionOrdinal));
    }
  }
  return { steps, preparations };
}

function recognizeConfigurationPreparationBoundary(
  context: ConfigurationRecognitionContext,
  boundary: StaticInvocationPreparationBoundary,
): ConfigurationPreparationObservation | null {
  if (
    boundary.boundaryKind !== StaticInvocationPreparationBoundaryKind.ArgumentListOpen
    || !ts.isCallExpression(boundary.node)
    || readCallMemberName(boundary.node) !== 'register'
  ) {
    return null;
  }
  const aureliaEvaluation = aureliaFacadeEvaluationForCallReceiver(context, boundary.node);
  const containerEvaluation = aureliaEvaluation == null
    ? containerEvaluationForCallReceiver(context, boundary.node)
    : null;
  const owner = aureliaEvaluation ?? containerEvaluation;
  if (owner == null) {
    return null;
  }
  const fallbackNode = boundary.node.arguments.find(ts.isSpreadElement) ?? boundary.node;
  const openSeams = boundary.openSeams.length === 0
    ? [new ConfigurationRecognitionOpen(
        KernelVocabulary.Registration.OpenSpread.key,
        'Configuration register invocation did not reach dispatch because its argument list stayed open.',
        fallbackNode,
      )]
    : boundary.openSeams.map((seam) => new ConfigurationRecognitionOpen(
        KernelVocabulary.Registration.OpenSpread.key,
        seam.summary,
        seam.node,
        seam.reasonKinds.length === 0
          ? evaluationOpenSeamDefaultReasonKinds(seam.seamKind)
          : seam.reasonKinds,
      ));
  return new ConfigurationPreparationObservation(
    owner,
    aureliaEvaluation == null ? ConfigurationSequenceKind.Container : ConfigurationSequenceKind.App,
    boundary.node,
    readCallReceiverName(boundary.node),
    openSeams,
  );
}

function globalSequenceForObservations(
  context: ConfigurationRecognitionContext,
  steps: readonly ConfigurationStepObservation[],
  preparations: readonly ConfigurationPreparationObservation[],
): readonly ConfigurationSequenceObservation[] {
  if (steps.length === 0 && preparations.length === 0) {
    return [];
  }
  if (
    preparations.length === 0
    && !steps.some((step) => step.aureliaEvaluation != null || step.containerEvaluation != null)
  ) {
    return [new ConfigurationSequenceObservation(
      sequenceKindForSteps(steps),
      context.sourceFile,
      context.moduleKey,
      steps,
    )];
  }

  const groups = new Map<ConfigurationSequenceEvaluation | ConfigurationStepObservation, GlobalConfigurationSequenceGroup>();
  for (const step of steps) {
    const owner: ConfigurationSequenceEvaluation | ConfigurationStepObservation =
      step.aureliaEvaluation ?? step.containerEvaluation ?? step;
    const existing = groups.get(owner);
    if (existing == null) {
      const group = new GlobalConfigurationSequenceGroup(owner, step.sourceNode, step.receiverLocalName);
      group.steps.push(step);
      groups.set(owner, group);
    } else {
      existing.steps.push(step);
    }
  }
  for (const preparation of preparations) {
    const existing = groups.get(preparation.owner);
    if (existing == null) {
      const group = new GlobalConfigurationSequenceGroup(
        preparation.owner,
        preparation.sourceNode,
        preparation.receiverLocalName,
        preparation.sequenceKind,
      );
      group.openSeams.push(...preparation.openSeams);
      groups.set(preparation.owner, group);
    } else {
      existing.openSeams.push(...preparation.openSeams);
    }
  }
  return [...groups.values()].map((group) => {
    const stepKind = sequenceKindForSteps(group.steps);
    return new ConfigurationSequenceObservation(
      stepKind === ConfigurationSequenceKind.Unknown ? group.sequenceKindHint : stepKind,
      group.sourceNode,
      group.steps.find((step) => step.receiverLocalName != null)?.receiverLocalName ?? group.localName,
      group.steps,
      group.openSeams,
    );
  });
}

function readRegistryFunctionSteps(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
  functionLike: ts.FunctionLikeDeclaration,
): readonly ConfigurationStepObservation[] {
  const body = functionLike.body;
  if (body == null) {
    return [];
  }
  const steps = readRegistryBodySteps(context, bindings, body, new Set());
  return [...new Map(steps.map((step) => [step.sourceNode, step])).values()]
    .sort((left, right) => compareNodes(context.sourceFile, left.sourceNode, right.sourceNode));
}

function readRegistryBodySteps(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
  body: ts.Node,
  activeFunctionStarts: Set<number>,
): ConfigurationStepObservation[] {
  const steps: ConfigurationStepObservation[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const step = recognizeCall(context, node, bindings, true);
      if (step != null) {
        steps.push(step);
      } else {
        steps.push(...readRegistryHelperCallSteps(context, bindings, node, activeFunctionStarts));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return steps;
}

function readRegistryHelperCallSteps(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
  call: ts.CallExpression,
  activeFunctionStarts: Set<number>,
): readonly ConfigurationStepObservation[] {
  const expression = unwrapExpression(call.expression);
  if (!ts.isIdentifier(expression)) {
    return [];
  }
  const helper = findSourceFunctionDeclaration(context.sourceFile, expression.text);
  if (helper?.body == null) {
    return [];
  }
  const helperStart = helper.getStart(context.sourceFile);
  if (activeFunctionStarts.has(helperStart)) {
    return [];
  }
  activeFunctionStarts.add(helperStart);
  try {
    return readRegistryBodySteps(context, bindings, helper.body, activeFunctionStarts);
  } finally {
    activeFunctionStarts.delete(helperStart);
  }
}

function findSourceFunctionDeclaration(
  sourceFile: ts.SourceFile,
  name: string,
): ts.FunctionDeclaration | null {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
      return statement;
    }
  }
  return null;
}

function recognizeAureliaConstructor(
  context: ConfigurationRecognitionContext,
  node: ts.NewExpression,
): ConfigurationStepObservation | null {
  const evaluation = aureliaFacadeEvaluationForValue(
    context.expressionReader.evaluateExpression(node).value,
  );
  if (evaluation == null) {
    return null;
  }

  const defaultAdmissions = evaluation.includesBrowserDefaults
    ? [aureliaBrowserFacadeDefaultRegistration(node)]
    : [];
  return new ConfigurationStepObservation(
    ConfigurationCarrierKind.AureliaConstructor,
    ConfigurationStepKind.CreateAurelia,
    node,
    aureliaConstructorLocalName(node) ?? readReferenceName(node.expression),
    null,
    [],
    [],
    defaultAdmissions,
    aureliaFacadeOpenSeams(evaluation, node),
    null,
    evaluation,
  );
}

function aureliaConstructorLocalName(
  node: ts.NewExpression,
): string | null {
  const parent = node.parent;
  return ts.isVariableDeclaration(parent) && parent.initializer === node && ts.isIdentifier(parent.name)
    ? parent.name.text
    : null;
}

function recognizeCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  insideRegistryRegisterMethod: boolean,
): ConfigurationStepObservation | null {
  return recognizeContainerFactoryCall(context, call, bindings)
    ?? recognizeStaticAureliaCall(context, call, bindings)
    ?? recognizeMemberCall(context, call, bindings, insideRegistryRegisterMethod);
}

function recognizeContainerFactoryCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  _bindings: ImportedBindings,
): ConfigurationStepObservation | null {
  const containerEvaluation = aureliaContainerEvaluationForValue(
    context.expressionReader.evaluateExpression(call).value,
  );
  if (
    containerEvaluation == null
    || containerEvaluation.sourceNode !== call
    || (
      containerEvaluation.kind !== AureliaContainerEvaluationKind.AuthoredRoot
      && containerEvaluation.kind !== AureliaContainerEvaluationKind.AuthoredChild
    )
  ) {
    return null;
  }
  const isChild = containerEvaluation.kind === AureliaContainerEvaluationKind.AuthoredChild;
  return new ConfigurationStepObservation(
    isChild
      ? ConfigurationCarrierKind.ContainerChildFactoryCall
      : ConfigurationCarrierKind.ContainerFactoryCall,
    isChild
      ? ConfigurationStepKind.CreateChildContainer
      : ConfigurationStepKind.CreateContainer,
    call,
    containerFactoryLocalName(call),
    null,
    [],
    [],
    [],
    [],
    containerEvaluation,
  );
}

function containerFactoryLocalName(call: ts.CallExpression): string | null {
  const parent = call.parent;
  return ts.isVariableDeclaration(parent) && parent.initializer === call && ts.isIdentifier(parent.name)
    ? parent.name.text
    : null;
}

function recognizeStaticAureliaCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
): ConfigurationStepObservation | null {
  const evaluation = aureliaFacadeEvaluationForValue(
    context.expressionReader.evaluateExpression(call).value,
  );
  if (evaluation == null || evaluation.sourceNode !== call) {
    return null;
  }
  switch (readCallMemberName(call)) {
    case 'app':
      return recognizeStaticAureliaAppCall(context, call, evaluation);
    case 'register':
      return recognizeStaticAureliaRegisterCall(context, call, bindings, evaluation);
    default:
      return null;
  }
}

function recognizeStaticAureliaAppCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  evaluation: AureliaFacadeEvaluation,
): ConfigurationStepObservation {
  return new ConfigurationStepObservation(
    ConfigurationCarrierKind.AureliaStaticApp,
    ConfigurationStepKind.AureliaApp,
    call,
    'Aurelia',
    readAppRootConfig(context, call.arguments[0] ?? null),
    [],
    [],
    evaluation.includesBrowserDefaults
      ? [aureliaBrowserFacadeDefaultRegistration(call)]
      : [],
    [
      ...missingArgumentOpen(call, call.arguments[0] ?? null, 'Aurelia.app(...) did not expose an app-root config argument.'),
      ...aureliaFacadeOpenSeams(evaluation, call),
    ],
    null,
    evaluation,
  );
}

function recognizeStaticAureliaRegisterCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  evaluation: AureliaFacadeEvaluation,
): ConfigurationStepObservation {
  const registrationArguments = readRegisterArgumentObservations(
    context,
    call,
    bindings,
    RegistrationCarrierKind.AureliaRegisterCall,
    RegistrationAdmissionKind.AureliaRegisterArgument,
  );
  return new ConfigurationStepObservation(
    ConfigurationCarrierKind.AureliaStaticRegister,
    ConfigurationStepKind.AureliaRegister,
    call,
    'Aurelia',
    null,
    registrationArguments.appTasks,
    [],
    [
      ...(evaluation.includesBrowserDefaults
        ? [aureliaBrowserFacadeDefaultRegistration(call)]
        : []),
      ...registrationArguments.admissions,
    ],
    [
      ...readSpreadOpens(context, call),
      ...aureliaFacadeOpenSeams(evaluation, call),
    ],
    null,
    evaluation,
  );
}

function recognizeMemberCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  insideRegistryRegisterMethod: boolean,
): ConfigurationStepObservation | null {
  const memberName = readCallMemberName(call);
  switch (memberName) {
    case 'app':
      return recognizeAureliaAppCall(context, call, bindings);
    case 'register':
      return recognizeRegisterCall(context, call, bindings, insideRegistryRegisterMethod);
    case 'customize':
      return recognizeCustomizeCall(context, call, bindings, insideRegistryRegisterMethod);
    default:
      return recognizeBuilderMutationCall(context, call, memberName, bindings, insideRegistryRegisterMethod);
  }
}

function recognizeAureliaAppCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  _bindings: ImportedBindings,
): ConfigurationStepObservation | null {
  const evaluation = aureliaFacadeEvaluationForCallReceiver(context, call);
  return evaluation == null
    ? null
    : new ConfigurationStepObservation(
      ConfigurationCarrierKind.AureliaAppCall,
      ConfigurationStepKind.AureliaApp,
      call,
      readCallReceiverName(call),
      readAppRootConfig(context, call.arguments[0] ?? null),
      [],
      [],
      [],
      [
        ...missingArgumentOpen(call, call.arguments[0] ?? null, 'Aurelia app call did not expose an app-root config argument.'),
        ...aureliaFacadeOpenSeams(evaluation, call),
      ],
      null,
      evaluation,
    );
}

function recognizeRegisterCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  insideRegistryRegisterMethod: boolean,
): ConfigurationStepObservation | null {
  const aureliaEvaluation = aureliaFacadeEvaluationForCallReceiver(context, call);
  const aureliaReceiver = aureliaEvaluation != null;
  const containerEvaluation = containerEvaluationForCallReceiver(context, call);
  const containerReceiver = containerEvaluation != null || isContainerReceiver(call, bindings);
  if (insideRegistryRegisterMethod && containerReceiver) {
    return recognizeRegisterCallForCarrier(
      context,
      call,
      bindings,
      ConfigurationCarrierKind.RegistryRegisterMethod,
      ConfigurationStepKind.RegistryRegister,
      RegistrationCarrierKind.RegistryRegisterMethod,
      RegistrationAdmissionKind.RegistryMethod,
      null,
    );
  }
  if (!aureliaReceiver && !containerReceiver) {
    return null;
  }
  return recognizeRegisterCallForCarrier(
    context,
    call,
    bindings,
    aureliaReceiver ? ConfigurationCarrierKind.AureliaRegisterCall : ConfigurationCarrierKind.ContainerRegisterCall,
    aureliaReceiver ? ConfigurationStepKind.AureliaRegister : ConfigurationStepKind.ContainerRegister,
    aureliaReceiver ? RegistrationCarrierKind.AureliaRegisterCall : RegistrationCarrierKind.ContainerRegisterCall,
    aureliaReceiver ? RegistrationAdmissionKind.AureliaRegisterArgument : RegistrationAdmissionKind.ContainerRegisterArgument,
    aureliaEvaluation,
  );
}

function recognizeRegisterCallForCarrier(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  carrierKind: ConfigurationCarrierKind,
  stepKind: ConfigurationStepKind,
  registrationCarrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
  aureliaEvaluation: AureliaFacadeEvaluation | null,
): ConfigurationStepObservation {
  const registrationArguments = readRegisterArgumentObservations(
    context,
    call,
    bindings,
    registrationCarrierKind,
    admissionKind,
  );
  const containerEvaluation = stepKind === ConfigurationStepKind.ContainerRegister
    ? containerEvaluationForCallReceiver(context, call)
    : null;
  return new ConfigurationStepObservation(
    carrierKind,
    stepKind,
    call,
    readCallReceiverName(call),
    null,
    registrationArguments.appTasks,
    [],
    registrationArguments.admissions,
    readSpreadOpens(context, call),
    containerEvaluation,
    aureliaEvaluation,
  );
}

function aureliaFacadeOpenSeams(
  evaluation: AureliaFacadeEvaluation,
  node: ts.Expression,
): readonly ConfigurationRecognitionOpen[] {
  return evaluation.containerState === AureliaFacadeContainerState.Closed
    ? []
    : [new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationTarget.key,
      'Aurelia facade received an explicit container whose runtime identity did not close during static evaluation.',
      node,
    )];
}

function containerEvaluationForCallReceiver(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
): AureliaContainerEvaluation | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  return aureliaContainerEvaluationForValue(
    context.expressionReader.evaluateExpression(expression.expression).value,
  );
}

function aureliaFacadeEvaluationForCallReceiver(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
): AureliaFacadeEvaluation | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  return aureliaFacadeEvaluationForValue(
    context.expressionReader.evaluateExpression(expression.expression).value,
  );
}

function recognizeCustomizeCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  insideRegistryRegisterMethod: boolean,
): ConfigurationStepObservation | null {
  const frameworkKind = readFrameworkRegistryKind(
    context,
    call,
    bindings,
    insideRegistryRegisterMethod,
  );
  return frameworkKind == null
    ? null
    : new ConfigurationStepObservation(
      ConfigurationCarrierKind.CustomizeCall,
      ConfigurationStepKind.Customize,
      call,
      readCallReceiverName(call),
      null,
      [],
      readCustomizeContributions(context, call, frameworkKind),
      [],
      customizeCallbackOpenForCall(call),
    );
}

function recognizeBuilderMutationCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  memberName: string | null,
  bindings: ImportedBindings,
  insideRegistryRegisterMethod: boolean,
): ConfigurationStepObservation | null {
  const frameworkKind = readFrameworkRegistryKind(
    context,
    call,
    bindings,
    insideRegistryRegisterMethod,
  );
  return memberName == null
    || frameworkKind == null
    ? null
    : new ConfigurationStepObservation(
      ConfigurationCarrierKind.BuilderMethodCall,
      ConfigurationStepKind.BuilderMutation,
      call,
      readCallReceiverName(call),
      null,
      [],
      readBuilderContributions(context, call, memberName, frameworkKind),
    );
}

function readImportedBindings(sourceFile: ts.SourceFile): ImportedBindings {
  const bindings = new ImportedBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const moduleName = statement.moduleSpecifier.text;
    const frameworkRegistrationKinds = frameworkRegistrationKindsForModule(moduleName);
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      if (frameworkRegistrationKinds != null) {
        bindings.frameworkRegistrationNamespaces.set(namedBindings.name.text, frameworkRegistrationKinds);
      }
      if (APP_TASK_MODULES.has(moduleName)) {
        bindings.appTaskNamespaces.add(namedBindings.name.text);
      }
      if (REGISTRATION_MODULES.has(moduleName)) {
        bindings.registrationNamespaces.add(namedBindings.name.text);
      }
      if (CONTAINER_MODULES.has(moduleName)) {
        bindings.containerNamespaces.add(namedBindings.name.text);
      }
      continue;
    }

    for (const element of namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (frameworkRegistrationKinds != null) {
        const frameworkRegistrationKind = frameworkRegistrationKindForExportName(
          importedName,
          frameworkRegistrationKinds,
        );
        if (frameworkRegistrationKind != null) {
          bindings.frameworkRegistrationIdentifiers.set(element.name.text, frameworkRegistrationKind);
        }
      }
      if (APP_TASK_MODULES.has(moduleName) && importedName === 'AppTask') {
        bindings.appTaskIdentifiers.add(element.name.text);
      }
      if (REGISTRATION_MODULES.has(moduleName) && importedName === 'Registration') {
        bindings.registrationIdentifiers.add(element.name.text);
      }
      if (REGISTRY_MODULES.has(moduleName) && importedName === 'IRegistry') {
        bindings.registryTypeIdentifiers.add(element.name.text);
      }
      if (CONTAINER_MODULES.has(moduleName) && importedName === 'createContainer') {
        bindings.containerFactoryIdentifiers.add(element.name.text);
      }
      if (CONTAINER_MODULES.has(moduleName) && importedName === 'DI') {
        bindings.containerDiIdentifiers.add(element.name.text);
      }
      if (CONTAINER_MODULES.has(moduleName) && importedName === 'IContainer') {
        bindings.containerTypeIdentifiers.add(element.name.text);
      }
    }
  }
  collectContainerIdentifiers(sourceFile, bindings);
  return bindings;
}

function recognizeAppTaskFactory(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): AppTaskObservation | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const slot = expression.name.text;
  if (!APP_TASK_SLOT_NAMES.has(slot) || !isImportedAppTaskExpression(expression.expression, bindings)) {
    return null;
  }

  const openSeams: ConfigurationRecognitionOpen[] = [];
  const first = call.arguments[0] ?? null;
  const second = call.arguments[1] ?? null;
  if (first == null || ts.isSpreadElement(first)) {
    openSeams.push(new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationCallback.key,
      `AppTask.${slot}(...) did not expose a callback argument.`,
      first ?? call,
    ));
  }
  for (const argument of call.arguments) {
    if (ts.isSpreadElement(argument)) {
      openSeams.push(new ConfigurationRecognitionOpen(
        KernelVocabulary.Registration.OpenSpread.key,
        `AppTask.${slot}(...) contains a spread argument that AppTask recognition cannot close.`,
        argument,
      ));
    }
  }

  const callbackExpression = second == null || ts.isSpreadElement(second)
    ? first
    : second;
  return new AppTaskObservation(
    slot as AppTaskSlot,
    second == null || ts.isSpreadElement(second) ? AppTaskCallbackKind.NoArgument : AppTaskCallbackKind.ResolvedKey,
    second == null || ts.isSpreadElement(second) ? null : first,
    callbackExpression == null || ts.isSpreadElement(callbackExpression) ? null : readCallback(callbackExpression),
    call,
    openSeams,
  );
}

function readAppRootConfig(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression | null,
): AppRootConfigObservation | null {
  if (expression == null || ts.isSpreadElement(expression)) {
    return null;
  }

  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return appRootValueConfigObservation(context, current);
  }

  const hostExpression = readObjectPropertyExpression(current, 'host');
  const component = readAppRootComponentTarget(context, current);
  const allowActionlessForm = readConfigurationBooleanObjectProperty(context, current, 'allowActionlessForm');
  const strictBinding = readConfigurationBooleanObjectProperty(context, current, 'strictBinding');
  const ssrScopeExpression = readObjectPropertyExpression(current, 'ssrScope');

  return new AppRootConfigObservation(
    current,
    hostExpression,
    component,
    allowActionlessForm,
    strictBinding,
    ssrScopeExpression,
    appRootConfigOpenSeams(current, hostExpression, component),
  );
}

function appRootValueConfigObservation(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
): AppRootConfigObservation {
  const evaluation = context.expressionReader.evaluateExpression(expression);
  return new AppRootConfigObservation(
    expression,
    null,
    new ConfigurationTargetObservation(readReferenceName(expression), expression, false, evaluation),
    null,
    null,
    null,
  );
}

function readAppRootComponentTarget(
  context: ConfigurationRecognitionContext,
  object: ts.ObjectLiteralExpression,
): ConfigurationTargetObservation | null {
  const componentExpression = readObjectPropertyExpression(object, 'component');
  return componentExpression == null
    ? null
    : new ConfigurationTargetObservation(
        readReferenceName(componentExpression),
        componentExpression,
        false,
        context.expressionReader.evaluateExpression(componentExpression),
      );
}

function appRootConfigOpenSeams(
  object: ts.ObjectLiteralExpression,
  hostExpression: ts.Expression | null,
  component: ConfigurationTargetObservation | null,
): readonly ConfigurationRecognitionOpen[] {
  const openSeams: ConfigurationRecognitionOpen[] = [];
  if (hostExpression == null) {
    openSeams.push(new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationOption.key,
      'AppRoot config did not expose a closed host property.',
      object,
    ));
  }
  if (component == null) {
    openSeams.push(new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationTarget.key,
      'AppRoot config did not expose a closed component property.',
      object,
    ));
  } else {
    const reasonKinds = openSeamReasonKindsForEvaluationRead(component.evaluation);
    if (reasonKinds.length > 0) {
      openSeams.push(new ConfigurationRecognitionOpen(
        KernelVocabulary.Configuration.OpenConfigurationTarget.key,
        'AppRoot component evaluation retained open or abrupt static-evaluation pressure.',
        component.node,
        reasonKinds,
      ));
    }
  }
  return openSeams;
}

function readRegisterArgumentObservations(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): {
  readonly admissions: readonly RegistrationAdmissionObservation[];
  readonly appTasks: readonly AppTaskObservation[];
} {
  const observations: RegisterArgumentObservationSet = { admissions: [], appTasks: [] };
  for (const argument of call.arguments) {
    appendRegisterArgumentObservations(
      observations,
      recognizeRegisterArgument(context, argument, bindings, admissionKind, carrierKind),
    );
  }
  return observations;
}

function appendRegisterArgumentObservations(
  observations: RegisterArgumentObservationSet,
  entries: readonly RegisterArgumentObservation[],
): void {
  for (const observation of entries) {
    observations.admissions.push(observation.admission);
    if (observation.appTask != null) {
      observations.appTasks.push(observation.appTask);
    }
  }
}

function recognizeRegisterArgument(
  context: ConfigurationRecognitionContext,
  argument: ts.Expression,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): readonly RegisterArgumentObservation[] {
  if (ts.isSpreadElement(argument)) {
    const knownFrameworkGroup = recognizeEvaluatedFrameworkRegistrationGroup(
      context,
      argument.expression,
      admissionKind,
      carrierKind,
    );
    if (knownFrameworkGroup != null) {
      return [registerArgumentObservation(knownFrameworkGroup)];
    }
    return recognizeStaticRegisterSpread(context, argument, bindings, admissionKind, carrierKind)
      ?? [registerArgumentObservation(unknownSpreadRegistrationArgument(argument, carrierKind, admissionKind))];
  }

  return recognizeRegisterArgumentExpression(context, argument, bindings, admissionKind, carrierKind);
}

function recognizeRegisterArgumentExpression(
  context: ConfigurationRecognitionContext,
  argument: ts.Expression,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): readonly RegisterArgumentObservation[] {
  const evaluated = recognizeEvaluatedRegisterArgument(context, argument, bindings, admissionKind, carrierKind);
  if (evaluated != null) {
    return evaluated;
  }

  const factory = recognizeRegistrationFactoryArgument(context, argument, bindings, admissionKind);
  if (factory != null) {
    return [registerArgumentObservation(factory)];
  }

  if (carrierKind === RegistrationCarrierKind.RegistryRegisterMethod) {
    const frameworkKind = sourceFrameworkRegistrationKind(argument, bindings);
    if (frameworkKind != null) {
      const frameworkValue = aureliaFrameworkRegistrationValueForKind(frameworkKind, argument);
      const frameworkRegistration = recognizeEvaluatedRegistrationValue(
        context,
        argument,
        frameworkValue,
        [],
        bindings,
        admissionKind,
        carrierKind,
        null,
        new Set(),
      );
      if (frameworkRegistration != null) {
        return frameworkRegistration;
      }
    }
  }

  const checkerRegistry = recognizeCheckerRegistryArgument(context, argument, admissionKind, carrierKind);
  if (checkerRegistry != null) {
    return [registerArgumentObservation(checkerRegistry)];
  }

  const appTask = recognizeRegisterArgumentAppTask(argument, bindings);
  return appTask == null
    ? [registerArgumentObservation(unknownRegistrationArgument(argument, carrierKind, admissionKind))]
    : [registerArgumentObservation(registrationObservationForAppTask(appTask, carrierKind, admissionKind), appTask)];
}

function recognizeEvaluatedFrameworkRegistrationGroup(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): RegistrationAdmissionObservation | null {
  const value = context.expressionReader.evaluateExpression(expression).value;
  const frameworkRegistration = aureliaFrameworkRegistrationEvaluationForValue(value);
  return value?.kind !== EvaluationValueKind.Array || frameworkRegistration == null
    ? null
    : frameworkRegistrationGroupArgument(
        expression,
        frameworkRegistration.kind,
        carrierKind,
        admissionKind,
      ).withEvaluatedCarrierValue(value);
}

function recognizeStaticRegisterSpread(
  context: ConfigurationRecognitionContext,
  spread: ts.SpreadElement,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): readonly RegisterArgumentObservation[] | null {
  const read = context.expressionReader.evaluateExpression(spread.expression);
  if (read.value?.kind !== EvaluationValueKind.Array) {
    return null;
  }
  const observations = read.value.elements.flatMap((element) =>
    element.expression == null
      ? [registerArgumentObservation(unknownSpreadRegistrationArgument(spread, carrierKind, admissionKind))]
      : recognizeRegisterArgument(context, element.expression, bindings, admissionKind, carrierKind)
  );
  return read.value.mayHaveUnknownElements || read.value.mayHaveUnknownOrder
    ? [
      ...observations,
      registerArgumentObservation(unknownSpreadRegistrationArgument(spread, carrierKind, admissionKind)),
    ]
    : observations;
}

function recognizeEvaluatedRegisterArgument(
  context: ConfigurationRecognitionContext,
  argument: ts.Expression,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): readonly RegisterArgumentObservation[] | null {
  const read = context.expressionReader.evaluateExpression(argument);
  return recognizeEvaluatedRegistrationValue(
    context,
    argument,
    read.value,
    read.openSeams,
    bindings,
    admissionKind,
    carrierKind,
    null,
    new Set(),
  );
}

function recognizeEvaluatedRegistrationValue(
  context: ConfigurationRecognitionContext,
  argument: ts.Expression,
  value: EvaluationValue | null,
  openSeams: ReturnType<ConfigurationRecognitionContext['expressionReader']['evaluateExpression']>['openSeams'],
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
  localNameHint: string | null,
  _activeCarriers: Set<EvaluationValue>,
): readonly RegisterArgumentObservation[] | null {
  const projected = projectEvaluatedRegistrationValue(
    context,
    argument,
    value,
    openSeams,
    admissionKind,
    carrierKind,
    localNameHint,
    (expression, nestedAdmissionKind) => recognizeRegistrationFactoryArgument(
      context,
      expression,
      bindings,
      nestedAdmissionKind,
    ),
  );
  return projected?.map((admission) => {
    const source = admission.registeredValue?.node ?? null;
    const appTask = admission.registeredValue?.frameworkKind === FrameworkRegistrationKind.AppTask
      && source != null
      && ts.isCallExpression(source)
      ? recognizeAppTaskFactory(source, bindings)
      : null;
    return registerArgumentObservation(admission, appTask);
  }) ?? null;
}

function registerArgumentObservation(
  admission: RegistrationAdmissionObservation,
  appTask: AppTaskObservation | null = null,
): RegisterArgumentObservation {
  return { admission, appTask };
}

function recognizeRegisterArgumentAppTask(
  argument: ts.Expression,
  bindings: ImportedBindings,
): AppTaskObservation | null {
  const current = unwrapExpression(argument);
  return ts.isCallExpression(current)
    ? recognizeAppTaskFactory(current, bindings)
    : null;
}

function unknownSpreadRegistrationArgument(
  argument: ts.SpreadElement,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Unknown,
    RegistrationKeyRole.Unknown,
    argument,
    null,
    null,
    [],
    [new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenSpread.key,
      'Register call contains a spread argument that registration recognition cannot close yet.',
      argument,
    )],
  );
}

function unknownRegistrationArgument(
  argument: ts.Expression,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Unknown,
    RegistrationKeyRole.Unknown,
    argument,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Unknown,
      readReferenceName(argument),
      argument,
      isDeclarationExpression(argument),
    ),
    [],
    [new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenStrategy.key,
      'Register call argument could not yet be classified as resolver, registry, resource, object map, or plain class fallback.',
      argument,
    )],
  );
}

function recognizeRegistrationFactoryArgument(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation | null {
  const match = readRegistrationFactoryCallMatch(expression, bindings);
  if (match == null) {
    return null;
  }
  const openSeams: RegistrationRecognitionOpen[] = [];
  const keyArgument = readRegistrationFactoryKeyArgument(match, openSeams);
  const valueArgument = readRegistrationFactoryValueArgument(match, openSeams);

  return registrationAdmissionForFactoryCall(context, match, admissionKind, keyArgument, valueArgument, openSeams);
}

function readRegistrationFactoryCallMatch(
  expression: ts.Expression,
  bindings: ImportedBindings,
): RegistrationFactoryCallMatch | null {
  const factoryName = readRegistrationFactoryNameFromExpression(expression, {
    identifiers: bindings.registrationIdentifiers,
    namespaces: bindings.registrationNamespaces,
  });
  const shape = factoryName == null ? null : REGISTRATION_FACTORY_SHAPES.get(factoryName) ?? null;
  const call = unwrapExpression(expression);
  return factoryName != null && shape != null && ts.isCallExpression(call)
    ? new RegistrationFactoryCallMatch(factoryName, shape, call)
    : null;
}

function readRegistrationFactoryKeyArgument(
  match: RegistrationFactoryCallMatch,
  openSeams: RegistrationRecognitionOpen[],
): ts.Expression | null {
  return readRequiredRegistrationFactoryArgument(
    match.call,
    match.shape.keyArgumentIndex,
    KernelVocabulary.Registration.OpenKeyExpression.key,
    `Registration.${match.factoryName}(...) did not expose a target key.`,
    openSeams,
  );
}

function readRegistrationFactoryValueArgument(
  match: RegistrationFactoryCallMatch,
  openSeams: RegistrationRecognitionOpen[],
): ts.Expression | null {
  return match.shape.value == null
    ? null
    : readRequiredRegistrationFactoryArgument(
      match.call,
      match.shape.value.argumentIndex,
      match.shape.value.missingOpenKind,
      `Registration.${match.factoryName}(...) did not expose a registered value.`,
      openSeams,
    );
}

function registrationAdmissionForFactoryCall(
  context: ConfigurationRecognitionContext,
  match: RegistrationFactoryCallMatch,
  admissionKind: RegistrationAdmissionKind,
  keyArgument: ts.Expression | null,
  valueArgument: ts.Expression | null,
  openSeams: readonly RegistrationRecognitionOpen[],
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.RegistrationFactoryCall,
    admissionKind,
    match.shape.strategy,
    match.shape.keyRole,
    match.call,
    keyArgument == null ? null : context.registrationKeyObservation(keyArgument),
    valueArgument == null || match.shape.value == null
      ? null
      : registrationValueObservation(context, match.shape.value.valueKind, valueArgument),
    match.factoryName === 'defer' ? readDeferredRegistryParameters(match.call, isDeclarationExpression) : [],
    openSeams,
  );
}

function registrationValueObservation(
  context: ConfigurationRecognitionContext,
  valueKind: RegistrationValueKind,
  valueArgument: ts.Expression,
): RegistrationValueObservation {
  if (valueKind === RegistrationValueKind.AliasTarget) {
    return new RegistrationValueObservation(
      valueKind,
      readReferenceName(valueArgument),
      valueArgument,
      false,
      null,
      null,
      null,
      null,
      null,
      context.registrationKeyObservation(valueArgument),
    );
  }
  if (valueKind === RegistrationValueKind.Constructable) {
    const read = context.expressionReader.evaluateExpression(valueArgument);
    const value = read.value;
    if (value != null && (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function)) {
      const valueSource = evaluatedConstructableValueSource(context, valueArgument, value);
      return new RegistrationValueObservation(
        valueKind,
        readReferenceName(valueArgument) ?? evaluatedValueLocalName(value),
        valueSource.node,
        true,
        null,
        null,
        valueSource.sourceFileAddressHandle,
        valueSource.moduleKey,
      );
    }
  }
  return new RegistrationValueObservation(
    valueKind,
    readReferenceName(valueArgument),
    valueArgument,
    isDeclarationExpression(valueArgument),
  );
}

function readFrameworkRegistryKind(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
  bindings: ImportedBindings,
  allowSourceInventory: boolean,
): FrameworkRegistrationKind | null {
  const value = context.expressionReader.evaluateExpression(expression).value;
  const evaluated = !hasEvaluationRegisterFunction(value)
    ? null
    : aureliaFrameworkRegistrationKindForEvaluationValue(value);
  return evaluated ?? (allowSourceInventory
    ? sourceFrameworkRegistrationKind(expression, bindings)
    : null);
}

function sourceFrameworkRegistrationKind(
  expression: ts.Expression,
  bindings: ImportedBindings,
): FrameworkRegistrationKind | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.frameworkRegistrationIdentifiers.get(current.text) ?? null;
  }
  if (ts.isCallExpression(current)) {
    return sourceFrameworkRegistrationKind(current.expression, bindings);
  }
  if (!ts.isPropertyAccessExpression(current)) {
    return null;
  }
  const namespaceKinds = ts.isIdentifier(current.expression)
    ? bindings.frameworkRegistrationNamespaces.get(current.expression.text) ?? null
    : null;
  return namespaceKinds == null
    ? sourceFrameworkRegistrationKind(current.expression, bindings)
    : frameworkRegistrationKindForExportName(current.name.text, namespaceKinds);
}

function recognizeCheckerRegistryArgument(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): RegistrationAdmissionObservation | null {
  const valueSource = checkerRegistryValueSource(context, expression);
  if (valueSource == null) {
    return null;
  }

  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Registry,
    RegistrationKeyRole.Unknown,
    expression,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Registry,
      valueSource.localName,
      valueSource.node,
      isDeclarationValueNode(valueSource.node),
      null,
      null,
      valueSource.sourceFileAddressHandle,
    ),
    [],
    [],
  );
}

function checkerRegistryValueSource(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
): NamedRegistryValueSource | null {
  const typeSystem = context.typeSystem;
  if (typeSystem == null) {
    return null;
  }

  const current = unwrapExpression(expression);
  const checker = typeSystem.checker;
  const type = typeSystem.readProgramTypeAtLocation(current);
  const programCurrent = typeSystem.readProgramExpression(current);
  if (type == null || programCurrent == null || !checkerTypeHasCallableRegister(checker, type, programCurrent)) {
    return null;
  }

  const symbol = symbolForExpression(checker, programCurrent);
  const declaration = symbol == null ? null : firstSymbolDeclaration(symbol);
  return declaration == null
    ? checkerRegistryExpressionSource(expression)
    : checkerRegistryDeclarationSource(context, expression, declaration);
}

interface NamedRegistryValueSource extends EvaluatedRegistrationValueSource {
  readonly localName: string | null;
}

function checkerRegistryDeclarationSource(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
  declaration: ts.Declaration,
): NamedRegistryValueSource {
  const sourceFileAddressHandle = context.sourceFileAddressHandleForNode(declaration);
  if (sourceFileAddressHandle == null) {
    return checkerRegistryExpressionSource(expression);
  }
  const valueNode = registryDeclarationValueNode(declaration);
  return {
    node: valueNode,
    localName: readDeclarationLocalName(declaration) ?? readReferenceName(expression) ?? 'IRegistry',
    sourceFileAddressHandle: context.sourceFileAddressHandleForNode(valueNode) ?? sourceFileAddressHandle,
    moduleKey: context.typeSystem?.readModuleKeyForSourceFile(declaration.getSourceFile()) ?? null,
  };
}

function registryDeclarationValueNode(declaration: ts.Declaration): ts.Node {
  if (
    (ts.isVariableDeclaration(declaration) || ts.isPropertyDeclaration(declaration))
    && declaration.initializer != null
  ) {
    const initializer = unwrapExpression(declaration.initializer);
    if (ts.isObjectLiteralExpression(initializer) || ts.isClassExpression(initializer)) {
      return initializer;
    }
  }
  return declaration;
}

function checkerRegistryExpressionSource(expression: ts.Expression): NamedRegistryValueSource {
  return {
    node: expression,
    localName: readReferenceName(expression) ?? 'IRegistry',
    sourceFileAddressHandle: null,
    moduleKey: null,
  };
}

function checkerTypeHasCallableRegister(
  checker: ts.TypeChecker,
  type: ts.Type,
  sourceNode: ts.Node,
): boolean {
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
    return false;
  }
  const register = checkerPropertySymbol(checker, type, 'register');
  if (register == null) {
    return false;
  }
  const registerType = checkerSymbolValueType(checker, register, sourceNode);
  return (registerType?.getCallSignatures().length ?? 0) > 0;
}

function frameworkRegistrationGroupArgument(
  expression: ts.Expression,
  frameworkKind: FrameworkRegistrationKind,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
  sourceNode: ts.Node = expression,
): RegistrationAdmissionObservation {

  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.FrameworkGroup,
    RegistrationKeyRole.Unknown,
    sourceNode,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.FrameworkRegistration,
      readReferenceName(expression) ?? traceNameForFrameworkRegistrationKind(frameworkKind),
      expression,
      false,
      null,
      frameworkKind,
    ),
    [],
    [],
  );
}

function registrationObservationForAppTask(
  appTask: AppTaskObservation,
  carrierKind: RegistrationCarrierKind = RegistrationCarrierKind.RegistryRegisterMethod,
  admissionKind: RegistrationAdmissionKind = RegistrationAdmissionKind.RegistryMethod,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Registry,
    RegistrationKeyRole.Unknown,
    appTask.sourceNode,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Registry,
      `AppTask.${appTask.slot}`,
      appTask.sourceNode,
      false,
      null,
      FrameworkRegistrationKind.AppTask,
    ),
    [],
    appTask.openSeams.map((seam) => new RegistrationRecognitionOpen(seam.openKind, seam.summary, seam.node, seam.reasonKinds)),
  );
}

function aureliaBrowserFacadeDefaultRegistration(
  sourceNode: ts.Node,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.AureliaFacadeDefault,
    RegistrationAdmissionKind.AureliaFacadeDefault,
    RegistrationStrategy.Registry,
    RegistrationKeyRole.Unknown,
    sourceNode,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Registry,
      'Aurelia facade StandardConfiguration',
      sourceNode,
      false,
      null,
      FrameworkRegistrationKind.StandardConfiguration,
    ),
  );
}

function readCustomizeContributions(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  frameworkKind: FrameworkRegistrationKind,
): readonly ConfigurationOptionContributionObservation[] {
  const callback = call.arguments[0] ?? null;
  if (callback == null || ts.isSpreadElement(callback)) {
    return [];
  }
  const current = unwrapExpression(callback);
  if (ts.isObjectLiteralExpression(current)) {
    return readCustomizeObjectContributions(context, current, frameworkKind);
  }
  const callbackContribution = new ConfigurationOptionContributionObservation(
    ConfigurationOptionContributionKind.CustomizeCallback,
    frameworkKind,
    ['customize'],
    new ConfigurationOptionValueObservation(
      ConfigurationOptionValueKind.Callback,
      callback,
      null,
      [],
      readReferenceName(callback),
    ),
    callback,
    evaluationOpenSeams(context, callback),
  );
  return [
    callbackContribution,
    ...readCustomizeAssignmentContributions(context, callback, frameworkKind),
  ];
}

function readCustomizeObjectContributions(
  context: ConfigurationRecognitionContext,
  object: ts.ObjectLiteralExpression,
  frameworkKind: FrameworkRegistrationKind,
): readonly ConfigurationOptionContributionObservation[] {
  return object.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return [];
    }
    const propertyName = readPropertyName(property.name);
    if (propertyName == null) {
      return [];
    }
    return [new ConfigurationOptionContributionObservation(
      ConfigurationOptionContributionKind.CustomizeObject,
      frameworkKind,
      [propertyName],
      readOptionValue(context, property.initializer),
      property,
      optionValueOpenSeams(context, property.initializer),
    )];
  });
}

function readCustomizeAssignmentContributions(
  context: ConfigurationRecognitionContext,
  callback: ts.Expression,
  frameworkKind: FrameworkRegistrationKind,
): readonly ConfigurationOptionContributionObservation[] {
  const current = unwrapExpression(callback);
  if (!ts.isArrowFunction(current) && !ts.isFunctionExpression(current)) {
    return [];
  }
  const parameter = current.parameters[0];
  if (parameter == null || !ts.isIdentifier(parameter.name)) {
    return [];
  }

  const assignments = readDirectOptionAssignments(current.body, parameter.name.text);
  return assignments.map((assignment) => new ConfigurationOptionContributionObservation(
    ConfigurationOptionContributionKind.CustomizeCallback,
    frameworkKind,
    assignment.optionPath,
    readOptionValue(context, assignment.valueExpression),
    assignment.sourceNode,
    optionValueOpenSeams(context, assignment.valueExpression),
  ));
}

function readDirectOptionAssignments(
  body: ts.ConciseBody,
  parameterName: string,
): readonly {
  readonly optionPath: readonly string[];
  readonly valueExpression: ts.Expression;
  readonly sourceNode: ts.Node;
}[] {
  const assignments: {
    readonly optionPath: readonly string[];
    readonly valueExpression: ts.Expression;
    readonly sourceNode: ts.Node;
  }[] = [];
  const expressions = ts.isBlock(body)
    ? body.statements
      .filter(ts.isExpressionStatement)
      .map((statement) => statement.expression)
    : [body];

  for (const expression of expressions) {
    const assignment = unwrapExpression(expression);
    if (!ts.isBinaryExpression(assignment) || assignment.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
      continue;
    }
    const optionPath = readOptionAssignmentPath(assignment.left, parameterName);
    if (optionPath == null) {
      continue;
    }
    assignments.push({
      optionPath,
      valueExpression: assignment.right,
      sourceNode: assignment,
    });
  }
  return assignments;
}

function readOptionAssignmentPath(
  expression: ts.Expression,
  parameterName: string,
): readonly string[] | null {
  const segments: string[] = [];
  let current = unwrapExpression(expression);
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    if (ts.isPropertyAccessExpression(current)) {
      segments.unshift(current.name.text);
      current = unwrapExpression(current.expression);
      continue;
    }

    const argument = current.argumentExpression == null
      ? null
      : unwrapExpression(current.argumentExpression);
    if (argument == null || (!ts.isStringLiteral(argument) && !ts.isNoSubstitutionTemplateLiteral(argument))) {
      return null;
    }
    segments.unshift(argument.text);
    current = unwrapExpression(current.expression);
  }

  return ts.isIdentifier(current) && current.text === parameterName && segments.length > 0
    ? segments
    : null;
}

function readBuilderContributions(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  methodName: string | null,
  frameworkKind: FrameworkRegistrationKind,
): readonly ConfigurationOptionContributionObservation[] {
  const contributions: ConfigurationOptionContributionObservation[] = [];
  call.arguments.forEach((argument, index) => {
    if (ts.isSpreadElement(argument)) {
      contributions.push(new ConfigurationOptionContributionObservation(
        ConfigurationOptionContributionKind.BuilderArgument,
        frameworkKind,
        [methodName ?? 'builder', `${index}`],
        new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Unknown, null),
        argument,
        [new ConfigurationRecognitionOpen(
          KernelVocabulary.Configuration.OpenConfigurationOption.key,
          'Builder method contains a spread argument whose option contribution cannot close yet.',
          argument,
        )],
      ));
      return;
    }
    contributions.push(new ConfigurationOptionContributionObservation(
      ConfigurationOptionContributionKind.BuilderArgument,
      frameworkKind,
      [methodName ?? 'builder', `${index}`],
      readOptionValue(context, argument),
      argument,
      optionValueOpenSeams(context, argument),
    ));
  });
  return contributions;
}

function readOptionValue(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
): ConfigurationOptionValueObservation {
  const read = context.expressionReader.evaluateExpression(expression);
  const value = read.value ?? readStaticSourceLiteralValue(expression);
  const traceName = readReferenceName(expression);
  return value == null
    ? optionValueObservation(expression, ConfigurationOptionValueKind.Unknown, traceName)
    : optionValueObservationForEvaluation(expression, value, traceName);
}

function optionValueObservationForEvaluation(
  expression: ts.Expression,
  value: EvaluationValue,
  traceName: string | null,
): ConfigurationOptionValueObservation {
  switch (value.kind) {
    case 'boolean':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Boolean, traceName, value.value);
    case 'string':
      return optionValueObservation(expression, ConfigurationOptionValueKind.String, traceName, value.value);
    case 'number':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Number, traceName, value.value);
    case 'null':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Null, traceName);
    case 'array':
      return optionArrayValueObservation(expression, value, traceName);
    case 'set':
    case 'map':
    case 'regular-expression':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Object, traceName);
    case 'object':
    case 'boundary-object':
    case 'instance':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Object, traceName);
    case 'function':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Callback, traceName);
    case 'class':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Identity, traceName);
    case 'bigint':
    case 'module-namespace':
    case 'boundary-value':
    case 'promise':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Unknown, traceName);
    case 'undefined':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Undefined, traceName);
    case 'unknown':
      return optionValueObservation(expression, ConfigurationOptionValueKind.Unknown, traceName);
  }
  return optionValueObservation(expression, ConfigurationOptionValueKind.Unknown, traceName);
}

function optionArrayValueObservation(
  expression: ts.Expression,
  value: Extract<EvaluationValue, { readonly kind: 'array' }>,
  traceName: string | null,
): ConfigurationOptionValueObservation {
  const stringValues = readStaticStringArrayValue(value);
  return stringValues == null
    ? optionValueObservation(expression, ConfigurationOptionValueKind.Array, traceName)
    : optionValueObservation(expression, ConfigurationOptionValueKind.StringArray, traceName, null, stringValues);
}

function optionValueObservation(
  expression: ts.Expression,
  valueKind: ConfigurationOptionValueKind,
  traceName: string | null,
  value: string | number | boolean | null = null,
  stringValues: readonly string[] = [],
): ConfigurationOptionValueObservation {
  return new ConfigurationOptionValueObservation(valueKind, expression, value, stringValues, traceName);
}

function readConfigurationBooleanObjectProperty(
  context: ConfigurationRecognitionContext,
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean | null {
  const expression = readObjectPropertyExpression(object, propertyName);
  if (expression == null) {
    return null;
  }
  const value = context.expressionReader.evaluateExpression(expression).value;
  return value?.kind === 'boolean' ? value.value : null;
}

function readCallMemberName(call: ts.CallExpression): string | null {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression) ? expression.name.text : null;
}

function readCallReceiverName(call: ts.CallExpression): string | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  return readReceiverExpressionName(expression.expression);
}

function readReceiverExpressionName(
  expression: ts.Expression,
): string | null {
  const direct = readReferenceName(expression);
  if (direct != null) {
    return direct;
  }
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const callee = unwrapExpression(current.expression);
  return ts.isPropertyAccessExpression(callee)
    ? readReceiverExpressionName(callee.expression)
    : null;
}

function collectContainerIdentifiers(
  sourceFile: ts.SourceFile,
  bindings: ImportedBindings,
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (
        isContainerTypeNode(node.type, bindings)
        || (node.initializer != null && isContainerValueExpression(node.initializer, bindings))
      ) {
        bindings.containerIdentifiers.add(node.name.text);
      }
    }
    if (
      (ts.isParameter(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node))
      && ts.isIdentifier(node.name)
      && (
        isContainerTypeNode(node.type, bindings)
        || (ts.isParameter(node) && isContainerParameterName(node.name.text))
      )
    ) {
      bindings.containerIdentifiers.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

class RegistryFunctionSource {
  constructor(
    readonly functionLike: ts.FunctionLikeDeclaration,
    readonly owner: ts.Node,
    readonly localName: string | null,
  ) {}
}

function readRegistryFunctionSource(
  node: ts.Node,
  bindings: ImportedBindings,
): RegistryFunctionSource | null {
  if (!ts.isMethodDeclaration(node) && !ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) {
    return null;
  }
  if (!isContainerParameter(node.parameters[0], bindings)) {
    return null;
  }
  if (ts.isMethodDeclaration(node)) {
    if (
      readPropertyName(node.name) !== 'register'
      || (!ts.isObjectLiteralExpression(node.parent) && !ts.isClassLike(node.parent))
    ) {
      return null;
    }
    return new RegistryFunctionSource(node, node.parent, registryOwnerLocalName(node.parent));
  }
  const property = node.parent;
  if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === 'register') {
    return new RegistryFunctionSource(node, property.parent, registryOwnerLocalName(property.parent));
  }
  if (ts.isPropertyDeclaration(property) && readPropertyName(property.name) === 'register' && ts.isClassLike(property.parent)) {
    return new RegistryFunctionSource(node, property.parent, registryOwnerLocalName(property.parent));
  }
  return null;
}

function isContainerParameter(
  parameter: ts.ParameterDeclaration | undefined,
  bindings: ImportedBindings,
): boolean {
  return parameter != null
    && ts.isIdentifier(parameter.name)
    && (
      isContainerTypeNode(parameter.type, bindings)
      || isContainerParameterName(parameter.name.text)
    );
}

function isContainerParameterName(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized === 'container' || normalized === 'ctn';
}

function registryOwnerLocalName(owner: ts.Node): string | null {
  if (ts.isObjectLiteralExpression(owner)) {
    const ownerName = registryObjectLiteralLocalName(owner);
    return ownerName == null ? 'register' : `${ownerName}.register`;
  }
  if (ts.isClassLike(owner)) {
    return owner.name == null ? 'register' : `${owner.name.text}.register`;
  }
  return 'register';
}

function isContainerReceiver(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    && isContainerValueExpression(expression.expression, bindings);
}

function isContainerValueExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.containerIdentifiers.has(current.text);
  }
  if (ts.isPropertyAccessExpression(current)) {
    return bindings.containerIdentifiers.has(current.name.text);
  }
  return ts.isCallExpression(current) && isContainerFactoryCall(current, bindings);
}

function isContainerFactoryCall(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): boolean {
  const expression = unwrapExpression(call.expression);
  if (ts.isIdentifier(expression)) {
    return bindings.containerFactoryIdentifiers.has(expression.text);
  }
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'createContainer') {
    return false;
  }
  const receiver = unwrapExpression(expression.expression);
  return isImportedContainerNamespaceExpression(receiver, bindings)
    || isImportedDiExpression(receiver, bindings);
}

function isImportedDiExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.containerDiIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'DI'
    && isImportedContainerNamespaceExpression(current.expression, bindings);
}

function isImportedContainerNamespaceExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isIdentifier(current) && bindings.containerNamespaces.has(current.text);
}

function isContainerTypeNode(
  typeNode: ts.TypeNode | undefined,
  bindings: ImportedBindings,
): boolean {
  return typeNode != null
    && ts.isTypeReferenceNode(typeNode)
    && isContainerTypeName(typeNode.typeName, bindings);
}

function isContainerTypeName(
  typeName: ts.EntityName,
  bindings: ImportedBindings,
): boolean {
  if (ts.isIdentifier(typeName)) {
    return bindings.containerTypeIdentifiers.has(typeName.text);
  }
  return typeName.right.text === 'IContainer'
    && ts.isIdentifier(typeName.left)
    && bindings.containerNamespaces.has(typeName.left.text);
}

function isRegistryTypeNode(
  typeNode: ts.TypeNode | undefined,
  bindings: ImportedBindings,
): boolean {
  return typeNode != null
    && ts.isTypeReferenceNode(typeNode)
    && isRegistryTypeName(typeNode.typeName, bindings);
}

function isRegistryTypeName(
  typeName: ts.EntityName | ts.Expression,
  bindings: ImportedBindings,
): boolean {
  if (ts.isIdentifier(typeName)) {
    return bindings.registryTypeIdentifiers.has(typeName.text);
  }
  if (ts.isPropertyAccessExpression(typeName)) {
    return typeName.name.text === 'IRegistry'
      && ts.isIdentifier(typeName.expression)
      && bindings.containerNamespaces.has(typeName.expression.text);
  }
  if (ts.isQualifiedName(typeName)) {
    return typeName.right.text === 'IRegistry'
      && ts.isIdentifier(typeName.left)
      && bindings.containerNamespaces.has(typeName.left.text);
  }
  return false;
}

function isImportedAppTaskExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.appTaskIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'AppTask'
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.appTaskNamespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

function readCallback(
  expression: ts.Expression,
): ConfigurationCallbackObservation {
  const current = unwrapExpression(expression);
  const localName = ts.isFunctionExpression(current) || ts.isArrowFunction(current)
    ? current.name?.text ?? null
    : readReferenceName(current);
  return new ConfigurationCallbackObservation(localName, current, ts.isFunctionExpression(current) && current.name != null);
}

function isDeclarationExpression(expression: ts.Expression): boolean {
  const current = unwrapExpression(expression);
  return ts.isClassExpression(current) || ts.isFunctionExpression(current);
}

function readSpreadOpens(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
): readonly ConfigurationRecognitionOpen[] {
  return call.arguments
    .filter(ts.isSpreadElement)
    .filter((argument) => !isRecognizedRegisterSpread(context, argument))
    .map((argument) => new ConfigurationRecognitionOpen(
      KernelVocabulary.Registration.OpenSpread.key,
      'Configuration register call contains a spread argument that must be resolved before registration spending.',
      argument,
    ));
}

function isRecognizedRegisterSpread(
  context: ConfigurationRecognitionContext,
  argument: ts.SpreadElement,
): boolean {
  const value = context.expressionReader.evaluateExpression(argument.expression).value;
  return value?.kind === EvaluationValueKind.Array
    && (
      aureliaFrameworkRegistrationEvaluationForValue(value) != null
      || (!value.mayHaveUnknownElements && !value.mayHaveUnknownOrder)
    );
}

function missingArgumentOpen(
  call: ts.CallExpression,
  argument: ts.Expression | null,
  summary: string,
): readonly ConfigurationRecognitionOpen[] {
  return argument == null
    ? [new ConfigurationRecognitionOpen(KernelVocabulary.Configuration.OpenConfigurationOption.key, summary, call)]
    : [];
}

function customizeCallbackOpenForCall(
  call: ts.CallExpression,
): readonly ConfigurationRecognitionOpen[] {
  const callback = call.arguments[0] ?? null;
  if (callback == null || ts.isSpreadElement(callback)) {
    return [];
  }
  return customizeCallbackBodyIsFullyModeled(callback)
    ? []
    : [new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationCallback.key,
      'Configuration customize callback has control flow or side effects beyond direct option assignments.',
      callback,
    )];
}

function customizeCallbackBodyIsFullyModeled(
  callback: ts.Expression,
): boolean {
  const current = unwrapExpression(callback);
  if (ts.isObjectLiteralExpression(current)) {
    return current.properties.every((property) =>
      ts.isPropertyAssignment(property) && readPropertyName(property.name) != null
    );
  }
  if (!ts.isArrowFunction(current) && !ts.isFunctionExpression(current)) {
    return false;
  }
  const parameter = current.parameters[0];
  if (parameter == null || !ts.isIdentifier(parameter.name)) {
    return false;
  }
  const parameterName = parameter.name.text;
  if (!ts.isBlock(current.body)) {
    return expressionIsDirectOptionAssignment(current.body, parameterName);
  }
  return current.body.statements.every((statement) =>
    ts.isExpressionStatement(statement) &&
    expressionIsDirectOptionAssignment(statement.expression, parameterName)
  );
}

function expressionIsDirectOptionAssignment(
  expression: ts.Expression,
  parameterName: string,
): boolean {
  const assignment = unwrapExpression(expression);
  return ts.isBinaryExpression(assignment) &&
    assignment.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    readOptionAssignmentPath(assignment.left, parameterName) !== null;
}

function evaluationOpenSeams(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
): readonly ConfigurationRecognitionOpen[] {
  return configurationRecognitionOpensForEvaluationRead(
    context.expressionReader.evaluateExpression(expression),
    KernelVocabulary.Configuration.OpenConfigurationOption.key,
    'Configuration expression retained open or abrupt static-evaluation pressure.',
    expression,
  );
}

function optionValueOpenSeams(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
): readonly ConfigurationRecognitionOpen[] {
  const read = context.expressionReader.evaluateExpression(expression);
  return read.value == null && readStaticSourceLiteralValue(expression) != null
    ? []
    : configurationRecognitionOpensForEvaluationRead(
        read,
        KernelVocabulary.Configuration.OpenConfigurationOption.key,
        'Configuration option retained open or abrupt static-evaluation pressure.',
        expression,
      );
}

function sequenceKindForSteps(
  steps: readonly ConfigurationStepObservation[],
): ConfigurationSequenceKind {
  return steps.some((step) =>
    step.stepKind === ConfigurationStepKind.CreateAurelia
    || step.stepKind === ConfigurationStepKind.AureliaApp
    || step.stepKind === ConfigurationStepKind.AureliaRegister
  )
    ? ConfigurationSequenceKind.App
    : steps.some((step) =>
      step.stepKind === ConfigurationStepKind.RegistryRegister
    )
      ? ConfigurationSequenceKind.Registry
    : steps.some((step) =>
      step.stepKind === ConfigurationStepKind.BuilderMutation
      || step.stepKind === ConfigurationStepKind.OptionContribution
    )
      ? ConfigurationSequenceKind.Builder
    : steps.some((step) =>
      step.stepKind === ConfigurationStepKind.CreateContainer
      || step.stepKind === ConfigurationStepKind.CreateChildContainer
      || step.stepKind === ConfigurationStepKind.ContainerRegister
    )
      ? ConfigurationSequenceKind.Container
    : steps.some((step) => step.stepKind === ConfigurationStepKind.Customize)
      ? ConfigurationSequenceKind.Plugin
      : ConfigurationSequenceKind.Unknown;
}

function compareNodes(sourceFile: ts.SourceFile, left: ts.Node, right: ts.Node): number {
  const start = left.getStart(sourceFile) - right.getStart(sourceFile);
  return start === 0 ? left.end - right.end : start;
}
