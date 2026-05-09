import ts from 'typescript';
import { readStaticStringArrayValue } from '../evaluation/expression-reader.js';
import {
  EvaluationValueKind,
  type EvaluationClassValue,
  type EvaluationFunctionValue,
  type EvaluationInstanceValue,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  readDeclarationLocalName,
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
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  RegistrationKeyObservation,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from '../registration/registration-observation.js';
import {
  FrameworkRegistrationKind,
  RegistrationValueKind,
} from '../registration/registration-reference.js';
import {
  frameworkRegistrationKindForExportName,
  frameworkRegistrationKindSupportsChainMethod,
  frameworkRegistrationKindsForModule,
  isFrameworkRegistrationGroupKind,
  isKnownConfigurationKind,
  traceNameForFrameworkRegistrationKind,
} from '../registration/framework-registration-manifest.js';
import { aureliaFrameworkRegistrationKindForEvaluationValue } from './aurelia-evaluation-runtime.js';
import {
  AppTaskCallbackKind,
  AppTaskSlot,
} from './app-task.js';
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
  ConfigurationRecognitionOpen,
  ConfigurationSequenceObservation,
  ConfigurationStepObservation,
  ConfigurationTargetObservation,
} from './configuration-observation.js';

const AURELIA_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime-html',
]);

const AURELIA_BROWSER_FACADE_MODULE = 'aurelia';

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

const APP_TASK_SLOT_NAMES = new Set<string>([
  AppTaskSlot.Creating,
  AppTaskSlot.Hydrating,
  AppTaskSlot.Hydrated,
  AppTaskSlot.Activating,
  AppTaskSlot.Activated,
  AppTaskSlot.Deactivating,
  AppTaskSlot.Deactivated,
]);

class ImportedBindings {
  readonly aureliaIdentifiers = new Set<string>();
  readonly aureliaNamespaces = new Set<string>();
  readonly aureliaBrowserFacadeIdentifiers = new Set<string>();
  readonly aureliaBrowserFacadeNamespaces = new Set<string>();
  readonly aureliaInstanceIdentifiers = new Set<string>();
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
  readonly knownFrameworkRegistrationIdentifiers = new Map<string, FrameworkRegistrationKind>();
  readonly knownFrameworkRegistrationNamespaces = new Map<string, ReadonlySet<FrameworkRegistrationKind>>();
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
  const globalSteps: ConfigurationStepObservation[] = [];
  const registrySequences: ConfigurationSequenceObservation[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isMethodDeclaration(node) && isRegistryRegisterMethod(node, bindings)) {
      const registrySteps = readRegistryRegisterMethodSteps(context, bindings, node);
      registrySequences.push(new ConfigurationSequenceObservation(
        ConfigurationSequenceKind.Registry,
        node,
        registryRegisterMethodLocalName(node),
        registrySteps,
      ));
      return;
    }

    if (ts.isNewExpression(node)) {
      const step = recognizeAureliaConstructor(node, bindings);
      if (step != null) {
        globalSteps.push(step);
      }
    }

    if (ts.isCallExpression(node)) {
      const step = recognizeCall(context, node, bindings, false);
      if (step != null) {
        globalSteps.push(step);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  const sequences = [
    ...globalSequenceForSteps(context, globalSteps),
    ...registrySequences,
  ];
  return sequences.sort((left, right) => compareNodes(context.sourceFile, left.sourceNode, right.sourceNode));
}

function globalSequenceForSteps(
  context: ConfigurationRecognitionContext,
  steps: readonly ConfigurationStepObservation[],
): readonly ConfigurationSequenceObservation[] {
  const sorted = [...steps].sort((left, right) => compareNodes(context.sourceFile, left.sourceNode, right.sourceNode));
  return sorted.length === 0
    ? []
    : [
      new ConfigurationSequenceObservation(
        sequenceKindForSteps(sorted),
        context.sourceFile,
        context.moduleKey,
        sorted,
      ),
    ];
}

function readRegistryRegisterMethodSteps(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
  method: ts.MethodDeclaration,
): readonly ConfigurationStepObservation[] {
  const body = method.body;
  if (body == null) {
    return [];
  }
  const steps = readRegistryBodySteps(context, bindings, body, new Set());
  return steps.sort((left, right) => compareNodes(context.sourceFile, left.sourceNode, right.sourceNode));
}

function readRegistryBodySteps(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
  body: ts.Node,
  inlinedFunctionStarts: Set<number>,
): ConfigurationStepObservation[] {
  const steps: ConfigurationStepObservation[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const step = recognizeCall(context, node, bindings, true);
      if (step != null) {
        steps.push(step);
      } else {
        steps.push(...readRegistryHelperCallSteps(context, bindings, node, inlinedFunctionStarts));
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
  inlinedFunctionStarts: Set<number>,
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
  if (inlinedFunctionStarts.has(helperStart)) {
    return [];
  }
  inlinedFunctionStarts.add(helperStart);
  return readRegistryBodySteps(context, bindings, helper.body, inlinedFunctionStarts);
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
  node: ts.NewExpression,
  bindings: ImportedBindings,
): ConfigurationStepObservation | null {
  const expression = unwrapExpression(node.expression);
  if (!isImportedAureliaExpression(expression, bindings)) {
    return null;
  }

  const defaultAdmissions = isImportedAureliaBrowserFacadeExpression(expression, bindings) && (node.arguments?.length ?? 0) === 0
    ? [aureliaBrowserFacadeDefaultRegistration(node)]
    : [];
  return new ConfigurationStepObservation(
    ConfigurationCarrierKind.AureliaConstructor,
    ConfigurationStepKind.CreateAurelia,
    node,
    readReferenceName(node.expression),
    null,
    [],
    [],
    defaultAdmissions,
  );
}

function recognizeCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
  insideRegistryRegisterMethod: boolean,
): ConfigurationStepObservation | null {
  const appTask = recognizeAppTaskFactory(call, bindings);
  if (appTask != null && !isRegisterArgumentExpression(call, bindings)) {
    return new ConfigurationStepObservation(
      ConfigurationCarrierKind.AppTaskFactoryCall,
      ConfigurationStepKind.AppTaskFactory,
      call,
      'AppTask',
      null,
      [appTask],
      [],
      [],
      appTask.openSeams,
    );
  }

  const staticAurelia = readAureliaStaticMethod(call, bindings);
  if (staticAurelia === 'app') {
    return new ConfigurationStepObservation(
      ConfigurationCarrierKind.AureliaStaticApp,
      ConfigurationStepKind.AureliaApp,
      call,
      'Aurelia',
      readAppRootConfig(context, call.arguments[0] ?? null),
      [],
      [],
      isAureliaStaticBrowserFacadeCall(call, bindings)
        ? [aureliaBrowserFacadeDefaultRegistration(call)]
        : [],
      missingArgumentOpen(call, call.arguments[0] ?? null, 'Aurelia.app(...) did not expose an app-root config argument.'),
    );
  }
  if (staticAurelia === 'register') {
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
        ...(isAureliaStaticBrowserFacadeCall(call, bindings)
          ? [aureliaBrowserFacadeDefaultRegistration(call)]
          : []),
        ...registrationArguments.admissions,
      ],
      readSpreadOpens(context, call, bindings),
    );
  }

  const memberName = readCallMemberName(call);
  switch (memberName) {
    case 'app':
      if (!isAureliaReceiver(call, bindings)) {
        return null;
      }
      return new ConfigurationStepObservation(
        ConfigurationCarrierKind.AureliaAppCall,
        ConfigurationStepKind.AureliaApp,
        call,
        readCallReceiverName(call),
        readAppRootConfig(context, call.arguments[0] ?? null),
        [],
        [],
        [],
        missingArgumentOpen(call, call.arguments[0] ?? null, 'Aurelia app call did not expose an app-root config argument.'),
      );
    case 'register': {
      const aureliaReceiver = isAureliaReceiver(call, bindings);
      const containerReceiver = isContainerReceiver(call, bindings);
      if (insideRegistryRegisterMethod && containerReceiver) {
        const registrationArguments = readRegisterArgumentObservations(
          context,
          call,
          bindings,
          RegistrationCarrierKind.RegistryRegisterMethod,
          RegistrationAdmissionKind.RegistryMethod,
        );
        return new ConfigurationStepObservation(
          ConfigurationCarrierKind.RegistryRegisterMethod,
          ConfigurationStepKind.RegistryRegister,
          call,
          readCallReceiverName(call),
          null,
          registrationArguments.appTasks,
          [],
          registrationArguments.admissions,
          readSpreadOpens(context, call, bindings),
        );
      }
      if (!aureliaReceiver && !containerReceiver) {
        return null;
      }
      const registrationArguments = readRegisterArgumentObservations(
        context,
        call,
        bindings,
        aureliaReceiver ? RegistrationCarrierKind.AureliaRegisterCall : RegistrationCarrierKind.ContainerRegisterCall,
        aureliaReceiver ? RegistrationAdmissionKind.AureliaRegisterArgument : RegistrationAdmissionKind.ContainerRegisterArgument,
      );
      return new ConfigurationStepObservation(
        aureliaReceiver ? ConfigurationCarrierKind.AureliaRegisterCall : ConfigurationCarrierKind.ContainerRegisterCall,
        aureliaReceiver ? ConfigurationStepKind.AureliaRegister : ConfigurationStepKind.ContainerRegister,
        call,
        readCallReceiverName(call),
        null,
        registrationArguments.appTasks,
        [],
        registrationArguments.admissions,
        readSpreadOpens(context, call, bindings),
      );
    }
    case 'customize': {
      const frameworkKind = readKnownConfigurationRegistryKind(call, bindings);
      if (frameworkKind == null || !frameworkRegistrationKindSupportsChainMethod(frameworkKind, 'customize')) {
        return null;
      }
      return new ConfigurationStepObservation(
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
    default: {
      const frameworkKind = readKnownConfigurationRegistryKind(call, bindings);
      if (
        memberName != null
        && frameworkKind != null
        && frameworkRegistrationKindSupportsChainMethod(frameworkKind, memberName)
      ) {
        return new ConfigurationStepObservation(
          ConfigurationCarrierKind.BuilderMethodCall,
          ConfigurationStepKind.BuilderMutation,
          call,
          readCallReceiverName(call),
          null,
          [],
          readBuilderContributions(context, call, memberName, frameworkKind),
        );
      }
      return null;
    }
  }
}

function readImportedBindings(sourceFile: ts.SourceFile): ImportedBindings {
  const bindings = new ImportedBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const moduleName = statement.moduleSpecifier.text;
    const namedBindings = statement.importClause?.namedBindings;
    const defaultImport = statement.importClause?.name ?? null;
    if (defaultImport != null && AURELIA_MODULES.has(moduleName)) {
      bindings.aureliaIdentifiers.add(defaultImport.text);
      if (moduleName === AURELIA_BROWSER_FACADE_MODULE) {
        bindings.aureliaBrowserFacadeIdentifiers.add(defaultImport.text);
      }
    }

    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      if (AURELIA_MODULES.has(moduleName)) {
        bindings.aureliaNamespaces.add(namedBindings.name.text);
      }
      if (moduleName === AURELIA_BROWSER_FACADE_MODULE) {
        bindings.aureliaBrowserFacadeNamespaces.add(namedBindings.name.text);
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
      const knownFrameworkRegistrationExports = frameworkRegistrationKindsForModule(moduleName);
      if (knownFrameworkRegistrationExports != null) {
        bindings.knownFrameworkRegistrationNamespaces.set(namedBindings.name.text, new Set(knownFrameworkRegistrationExports));
      }
      continue;
    }

    for (const element of namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (AURELIA_MODULES.has(moduleName) && importedName === 'Aurelia') {
        bindings.aureliaIdentifiers.add(element.name.text);
        if (moduleName === AURELIA_BROWSER_FACADE_MODULE) {
          bindings.aureliaBrowserFacadeIdentifiers.add(element.name.text);
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
      const knownFrameworkRegistration = readKnownFrameworkRegistrationExport(moduleName, importedName);
      if (knownFrameworkRegistration != null) {
        bindings.knownFrameworkRegistrationIdentifiers.set(element.name.text, knownFrameworkRegistration);
      }
    }
  }
  collectAureliaInstanceIdentifiers(sourceFile, bindings);
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
    return appRootValueConfigObservation(current);
  }

  const hostExpression = readObjectPropertyExpression(current, 'host');
  const component = readAppRootComponentTarget(current);
  const allowActionlessForm = readBooleanObjectProperty(context, current, 'allowActionlessForm');
  const strictBinding = readBooleanObjectProperty(context, current, 'strictBinding');
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
  expression: ts.Expression,
): AppRootConfigObservation {
  return new AppRootConfigObservation(
    expression,
    null,
    new ConfigurationTargetObservation(readReferenceName(expression), expression, false),
    null,
    null,
    null,
  );
}

function readAppRootComponentTarget(
  object: ts.ObjectLiteralExpression,
): ConfigurationTargetObservation | null {
  const componentExpression = readObjectPropertyExpression(object, 'component');
  return componentExpression == null
    ? null
    : new ConfigurationTargetObservation(readReferenceName(componentExpression), componentExpression, false);
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
    const knownFrameworkGroup = recognizeKnownFrameworkRegistrationGroupSpread(argument, bindings, admissionKind, carrierKind);
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
  const factory = recognizeRegistrationFactoryArgument(argument, bindings, admissionKind, carrierKind);
  if (factory != null) {
    return [registerArgumentObservation(factory)];
  }

  const knownConfiguration = recognizeKnownConfigurationRegistryArgument(argument, bindings, admissionKind, carrierKind);
  if (knownConfiguration != null) {
    return [registerArgumentObservation(knownConfiguration)];
  }

  const evaluated = recognizeEvaluatedRegisterArgument(context, argument, bindings, admissionKind, carrierKind);
  if (evaluated != null) {
    return evaluated;
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
  if (hasEvaluationRegisterFunction(read.value)) {
    return [registerArgumentObservation(registryAdmissionForEvaluatedValue(
      context,
      argument,
      read.value as EvaluationRegistryValue,
      read.openSeams,
      admissionKind,
      carrierKind,
      bindings,
    ))];
  }
  if (isPlainClassFallbackValue(read.value)) {
    return [registerArgumentObservation(plainClassSelfRegistrationArgument(argument, read.value, read.openSeams, admissionKind, carrierKind))];
  }
  if (read.value?.kind === EvaluationValueKind.Object) {
    return recognizeEvaluatedObjectMapArgument(context, argument, read.value, read.openSeams, bindings, admissionKind, carrierKind);
  }
  return null;
}

function registryAdmissionForEvaluatedValue(
  context: ConfigurationRecognitionContext,
  argument: ts.Expression,
  value: EvaluationRegistryValue,
  openSeams: ReturnType<ConfigurationRecognitionContext['expressionReader']['evaluateExpression']>['openSeams'],
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
  bindings: ImportedBindings,
): RegistrationAdmissionObservation {
  const valueSource = registryValueSource(context, argument, value);
  const frameworkKind = ts.isCallExpression(valueSource.node) && recognizeAppTaskFactory(valueSource.node, bindings) != null
    ? FrameworkRegistrationKind.AppTask
    : aureliaFrameworkRegistrationKindForEvaluationValue(value);
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Registry,
    RegistrationKeyRole.Unknown,
    argument,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Registry,
      readReferenceName(argument) ?? evaluatedValueLocalName(value) ?? 'IRegistry',
      valueSource.node,
      isDeclarationValueNode(valueSource.node),
      null,
      frameworkKind,
      valueSource.sourceFileAddressHandle,
    ),
    [],
    openSeams.map((seam) => new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenStrategy.key,
      seam.summary,
      seam.node ?? argument,
    )),
  );
}

function plainClassSelfRegistrationArgument(
  argument: ts.Expression,
  value: EvaluationClassValue | EvaluationFunctionValue,
  openSeams: ReturnType<ConfigurationRecognitionContext['expressionReader']['evaluateExpression']>['openSeams'],
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): RegistrationAdmissionObservation {
  const localName = readReferenceName(argument) ?? evaluatedValueLocalName(value);
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.Singleton,
    RegistrationKeyRole.AdmittedKey,
    argument,
    new RegistrationKeyObservation(localName, argument),
    new RegistrationValueObservation(
      RegistrationValueKind.PlainClass,
      localName,
      argument,
      isDeclarationValueNode(argument),
    ),
    [],
    openSeams.map((seam) => new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenValueExpression.key,
      seam.summary,
      seam.node ?? argument,
    )),
  );
}

function recognizeEvaluatedObjectMapArgument(
  context: ConfigurationRecognitionContext,
  argument: ts.Expression,
  value: EvaluationObjectValue,
  openSeams: ReturnType<ConfigurationRecognitionContext['expressionReader']['evaluateExpression']>['openSeams'],
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): readonly RegisterArgumentObservation[] {
  const observations: RegisterArgumentObservation[] = [];
  for (const property of value.properties.values()) {
    if (!isRegisterObjectMapValue(property.value)) {
      continue;
    }
    const propertyExpression = objectMapPropertyExpression(property.node);
    if (propertyExpression == null) {
      continue;
    }
    observations.push(...recognizeRegisterArgument(
      context,
      propertyExpression,
      bindings,
      RegistrationAdmissionKind.ObjectMapEntry,
      RegistrationCarrierKind.ObjectMapEntry,
    ));
  }
  if (value.mayHaveUnknownProperties || openSeams.length > 0) {
    observations.push(registerArgumentObservation(openObjectMapRegistrationArgument(
      argument,
      openSeams,
      carrierKind,
      admissionKind,
    )));
  }
  return observations;
}

function registryValueSource(
  context: ConfigurationRecognitionContext,
  argument: ts.Expression,
  value: EvaluationRegistryValue,
): {
  readonly node: ts.Node;
  readonly sourceFileAddressHandle: RegistrationValueObservation['sourceFileAddressHandle'];
} {
  const valueNode = value.kind === EvaluationValueKind.Instance
    ? value.classValue.declaration
    : value.node ?? null;
  if (valueNode == null) {
    return { node: argument, sourceFileAddressHandle: null };
  }
  const sourceFileAddressHandle = context.sourceFileAddressHandleForNode(valueNode);
  return sourceFileAddressHandle == null
    ? { node: argument, sourceFileAddressHandle: null }
    : { node: valueNode, sourceFileAddressHandle };
}

type EvaluationRegistryValue = EvaluationObjectValue | EvaluationClassValue | EvaluationFunctionValue | EvaluationInstanceValue;

function hasEvaluationRegisterFunction(value: EvaluationValue | null): boolean {
  if (
    value?.kind !== EvaluationValueKind.Object
    && value?.kind !== EvaluationValueKind.Class
    && value?.kind !== EvaluationValueKind.Function
    && value?.kind !== EvaluationValueKind.Instance
  ) {
    return false;
  }
  return value.properties.get('register')?.value.kind === EvaluationValueKind.Function;
}

function isPlainClassFallbackValue(value: EvaluationValue | null): value is EvaluationClassValue | EvaluationFunctionValue {
  if (value?.kind === EvaluationValueKind.Class) {
    return true;
  }
  return value?.kind === EvaluationValueKind.Function
    && isConstructableFunctionValue(value);
}

function isRegisterObjectMapValue(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
      return true;
    case EvaluationValueKind.Function:
      return hasEvaluationRegisterFunction(value) || isConstructableFunctionValue(value);
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return false;
  }
}

function isConstructableFunctionValue(value: EvaluationFunctionValue): boolean {
  return ts.isFunctionDeclaration(value.declaration) || ts.isFunctionExpression(value.declaration);
}

function evaluatedValueLocalName(value: EvaluationRegistryValue | EvaluationClassValue | EvaluationFunctionValue): string | null {
  const node = value.node;
  if (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function) {
    return declarationNameText(value.declaration.name) ?? (node != null && ts.isExpression(node) ? readReferenceName(node) : null);
  }
  if (value.kind === EvaluationValueKind.Instance) {
    return declarationNameText(value.classValue.declaration.name) ?? (node != null && ts.isExpression(node) ? readReferenceName(node) : null);
  }
  if (node == null) {
    return null;
  }
  if (ts.isObjectLiteralExpression(node)) {
    return registryObjectLiteralLocalName(node);
  }
  return ts.isExpression(node) ? readReferenceName(node) : null;
}

function declarationNameText(name: ts.PropertyName | ts.BindingName | undefined): string | null {
  if (name == null) {
    return null;
  }
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function objectMapPropertyExpression(node: ts.Node): ts.Expression | null {
  if (ts.isPropertyAssignment(node)) {
    return node.initializer;
  }
  if (ts.isShorthandPropertyAssignment(node)) {
    return node.name;
  }
  return ts.isExpression(node) ? node : null;
}

function openObjectMapRegistrationArgument(
  argument: ts.Expression,
  openSeams: ReturnType<ConfigurationRecognitionContext['expressionReader']['evaluateExpression']>['openSeams'],
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.ObjectMap,
    RegistrationKeyRole.Unknown,
    argument,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.ObjectMap,
      readReferenceName(argument),
      argument,
      isDeclarationValueNode(argument),
    ),
    [],
    openSeams.length === 0
      ? [new RegistrationRecognitionOpen(
        KernelVocabulary.Registration.OpenValueExpression.key,
        'Object-map registration may contain entries that static evaluation could not enumerate.',
        argument,
      )]
      : openSeams.map((seam) => new RegistrationRecognitionOpen(
        KernelVocabulary.Registration.OpenValueExpression.key,
        seam.summary,
        seam.node ?? argument,
      )),
  );
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
  expression: ts.Expression,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): RegistrationAdmissionObservation | null {
  const match = readRegistrationFactoryCallMatch(expression, bindings);
  if (match == null) {
    return null;
  }
  const openSeams: RegistrationRecognitionOpen[] = [];
  const keyArgument = readRegistrationFactoryKeyArgument(match, openSeams);
  const valueArgument = readRegistrationFactoryValueArgument(match, openSeams);

  return registrationAdmissionForFactoryCall(match, carrierKind, admissionKind, keyArgument, valueArgument, openSeams);
}

function readRegistrationFactoryCallMatch(
  expression: ts.Expression,
  bindings: ImportedBindings,
): RegistrationFactoryCallMatch | null {
  const factoryName = readRegistrationFactoryName(expression, bindings);
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
  return readRequiredArgument(
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
    : readRequiredArgument(
      match.call,
      match.shape.value.argumentIndex,
      match.shape.value.missingOpenKind,
      `Registration.${match.factoryName}(...) did not expose a registered value.`,
      openSeams,
    );
}

function registrationAdmissionForFactoryCall(
  match: RegistrationFactoryCallMatch,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
  keyArgument: ts.Expression | null,
  valueArgument: ts.Expression | null,
  openSeams: readonly RegistrationRecognitionOpen[],
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    match.shape.strategy,
    match.shape.keyRole,
    match.call,
    keyArgument == null ? null : new RegistrationKeyObservation(readReferenceName(keyArgument), keyArgument),
    valueArgument == null || match.shape.value == null
      ? null
      : new RegistrationValueObservation(match.shape.value.valueKind, readReferenceName(valueArgument), valueArgument, isDeclarationExpression(valueArgument)),
    match.factoryName === 'defer' ? readDeferredRegistryParameters(match.call) : [],
    openSeams,
  );
}

function recognizeKnownConfigurationRegistryArgument(
  expression: ts.Expression,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): RegistrationAdmissionObservation | null {
  const frameworkKind = readKnownConfigurationRegistryKind(expression, bindings);
  if (frameworkKind == null) {
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
): {
  readonly node: ts.Node;
  readonly localName: string | null;
  readonly sourceFileAddressHandle: RegistrationValueObservation['sourceFileAddressHandle'];
} | null {
  const checker = context.typeSystem?.checker ?? null;
  if (checker == null) {
    return null;
  }

  const current = unwrapExpression(expression);
  const type = checker.getTypeAtLocation(current);
  if (!checkerTypeHasCallableRegister(checker, type, current)) {
    return null;
  }

  const declaration = checkerValueDeclaration(checker, current);
  const sourceFileAddressHandle = declaration == null
    ? null
    : context.sourceFileAddressHandleForNode(declaration);
  if (declaration == null || sourceFileAddressHandle == null) {
    return {
      node: expression,
      localName: readReferenceName(expression) ?? 'IRegistry',
      sourceFileAddressHandle: null,
    };
  }
  return {
    node: declaration,
    localName: readDeclarationLocalName(declaration) ?? readReferenceName(expression) ?? 'IRegistry',
    sourceFileAddressHandle,
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
  return checkerRegisterMemberIsCallable(checker, type, sourceNode)
    || checkerRegisterMemberIsCallable(checker, checker.getApparentType(type), sourceNode);
}

function checkerRegisterMemberIsCallable(
  checker: ts.TypeChecker,
  type: ts.Type,
  sourceNode: ts.Node,
): boolean {
  const register = checker.getPropertyOfType(type, 'register');
  if (register == null) {
    return false;
  }
  const declaration = register.valueDeclaration ?? register.declarations?.[0] ?? sourceNode;
  return checker.getTypeOfSymbolAtLocation(register, declaration).getCallSignatures().length > 0;
}

function checkerValueDeclaration(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Declaration | null {
  const symbol = checkerSymbolForValue(checker, expression);
  return symbol?.valueDeclaration ?? symbol?.declarations?.find(isValueDeclaration) ?? null;
}

function checkerSymbolForValue(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  const symbol = checker.getSymbolAtLocation(expression);
  if (symbol == null) {
    return null;
  }
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function isValueDeclaration(declaration: ts.Declaration): boolean {
  return ts.isVariableDeclaration(declaration)
    || ts.isClassDeclaration(declaration)
    || ts.isFunctionDeclaration(declaration)
    || ts.isEnumDeclaration(declaration)
    || ts.isImportSpecifier(declaration)
    || ts.isPropertyDeclaration(declaration)
    || ts.isPropertySignature(declaration);
}

function recognizeKnownFrameworkRegistrationGroupSpread(
  spread: ts.SpreadElement,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): RegistrationAdmissionObservation | null {
  const frameworkKind = readKnownFrameworkRegistrationReference(spread.expression, bindings);
  if (frameworkKind == null || !isFrameworkRegistrationGroupKind(frameworkKind)) {
    return null;
  }

  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    RegistrationStrategy.FrameworkGroup,
    RegistrationKeyRole.Unknown,
    spread,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.FrameworkRegistration,
      readReferenceName(spread.expression) ?? traceNameForFrameworkRegistrationKind(frameworkKind),
      spread.expression,
      false,
      null,
      frameworkKind,
    ),
    [],
    [],
  );
}

function isKnownFrameworkRegistrationGroupSpread(
  spread: ts.SpreadElement,
  bindings: ImportedBindings,
): boolean {
  const frameworkKind = readKnownFrameworkRegistrationReference(spread.expression, bindings);
  return frameworkKind != null && isFrameworkRegistrationGroupKind(frameworkKind);
}

function readKnownConfigurationRegistryKind(
  expression: ts.Expression,
  bindings: ImportedBindings,
): FrameworkRegistrationKind | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current) || ts.isPropertyAccessExpression(current)) {
    const direct = readKnownConfigurationReference(current, bindings);
    return direct === FrameworkRegistrationKind.StateDefaultConfiguration ? null : direct;
  }
  if (!ts.isCallExpression(current)) {
    return null;
  }

  const callee = unwrapExpression(current.expression);
  if (!ts.isPropertyAccessExpression(callee)) {
    return null;
  }
  const receiver = readKnownConfigurationReference(callee.expression, bindings)
    ?? (ts.isCallExpression(unwrapExpression(callee.expression))
      ? readKnownConfigurationRegistryKind(unwrapExpression(callee.expression) as ts.CallExpression, bindings)
      : null);
  return receiver != null && frameworkRegistrationKindSupportsChainMethod(receiver, callee.name.text)
    ? receiver
    : null;
}

function readKnownConfigurationReference(
  expression: ts.Expression,
  bindings: ImportedBindings,
): FrameworkRegistrationKind | null {
  const kind = readKnownFrameworkRegistrationReference(expression, bindings);
  return kind != null && isKnownConfigurationKind(kind) ? kind : null;
}

function readKnownFrameworkRegistrationReference(
  expression: ts.Expression,
  bindings: ImportedBindings,
): FrameworkRegistrationKind | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.knownFrameworkRegistrationIdentifiers.get(current.text) ?? null;
  }
  if (!ts.isPropertyAccessExpression(current)) {
    return null;
  }
  const namespace = unwrapExpression(current.expression);
  if (!ts.isIdentifier(namespace)) {
    return null;
  }
  const exports = bindings.knownFrameworkRegistrationNamespaces.get(namespace.text);
  if (exports == null) {
    return null;
  }
  return frameworkRegistrationKindForExportName(current.name.text, exports);
}

function readKnownFrameworkRegistrationExport(
  moduleName: string,
  importedName: string,
): FrameworkRegistrationKind | null {
  const exports = frameworkRegistrationKindsForModule(moduleName);
  if (exports == null) {
    return null;
  }
  return frameworkRegistrationKindForExportName(importedName, exports);
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
    appTask.openSeams.map((seam) => new RegistrationRecognitionOpen(seam.openKind, seam.summary, seam.node)),
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
      evaluationOpenSeams(context, property.initializer),
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
    evaluationOpenSeams(context, assignment.valueExpression),
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
      evaluationOpenSeams(context, argument),
    ));
  });
  return contributions;
}

function readOptionValue(
  context: ConfigurationRecognitionContext,
  expression: ts.Expression,
): ConfigurationOptionValueObservation {
  const read = context.expressionReader.evaluateExpression(expression);
  const value = read.value;
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
    case 'undefined':
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

function readBooleanObjectProperty(
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

function readObjectPropertyExpression(
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || readPropertyName(property.name) !== propertyName) {
      continue;
    }
    return property.initializer;
  }
  return null;
}

function readAureliaStaticMethod(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): string | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  return isImportedAureliaExpression(expression.expression, bindings)
    ? expression.name.text
    : null;
}

function isAureliaStaticBrowserFacadeCall(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    && isImportedAureliaBrowserFacadeExpression(expression.expression, bindings);
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
  return readReferenceName(expression.expression);
}

function isAureliaReceiver(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    && isAureliaValueExpression(expression.expression, bindings);
}

function collectAureliaInstanceIdentifiers(
  sourceFile: ts.SourceFile,
  bindings: ImportedBindings,
): void {
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer != null
      && isAureliaValueExpression(node.initializer, bindings)
    ) {
      bindings.aureliaInstanceIdentifiers.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
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

function isRegistryRegisterMethod(
  method: ts.MethodDeclaration,
  bindings: ImportedBindings,
): boolean {
  return readPropertyName(method.name) === 'register'
    && isRegistryOwner(method)
    && isContainerParameter(method.parameters[0], bindings);
}

function isRegistryOwner(
  method: ts.MethodDeclaration,
): boolean {
  const owner = method.parent;
  if (ts.isObjectLiteralExpression(owner)) {
    return true;
  }
  if (ts.isClassLike(owner)) {
    return true;
  }
  return false;
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

function registryRegisterMethodLocalName(method: ts.MethodDeclaration): string | null {
  const owner = method.parent;
  if (ts.isObjectLiteralExpression(owner)) {
    const ownerName = registryObjectLiteralLocalName(owner);
    return ownerName == null ? 'register' : `${ownerName}.register`;
  }
  if (ts.isClassLike(owner)) {
    return owner.name == null ? 'register' : `${owner.name.text}.register`;
  }
  return 'register';
}

function registryObjectLiteralLocalName(literal: ts.ObjectLiteralExpression): string | null {
  let current: ts.Node = literal;
  while (
    current.parent != null
    && (
      ts.isAsExpression(current.parent)
      || ts.isTypeAssertionExpression(current.parent)
      || ts.isParenthesizedExpression(current.parent)
      || ts.isNonNullExpression(current.parent)
      || ts.isSatisfiesExpression(current.parent)
    )
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  if (parent == null) {
    return null;
  }
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent)) {
    return readPropertyName(parent.name);
  }
  if (ts.isReturnStatement(parent)) {
    const owner = enclosingFunctionLocalName(parent);
    return owner == null ? null : `${owner}.return`;
  }
  return null;
}

function enclosingFunctionLocalName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current != null) {
    if (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isMethodDeclaration(current)) {
      return current.name == null ? null : readPropertyName(current.name);
    }
    if (ts.isArrowFunction(current)) {
      return arrowFunctionLocalName(current);
    }
    current = current.parent;
  }
  return null;
}

function arrowFunctionLocalName(node: ts.ArrowFunction): string | null {
  const parent = node.parent;
  return ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)
    ? parent.name.text
    : null;
}

function isAureliaValueExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.aureliaInstanceIdentifiers.has(current.text);
  }
  if (ts.isNewExpression(current)) {
    return isImportedAureliaExpression(current.expression, bindings);
  }
  if (!ts.isCallExpression(current)) {
    return false;
  }
  const callee = unwrapExpression(current.expression);
  if (!ts.isPropertyAccessExpression(callee)) {
    return false;
  }
  return (callee.name.text === 'app' || callee.name.text === 'register')
    && (isImportedAureliaExpression(callee.expression, bindings) || isAureliaValueExpression(callee.expression, bindings));
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

function isRegisterArgumentExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  let current: ts.Node = expression;
  while (
    current.parent != null
    && (
      ts.isAsExpression(current.parent)
      || ts.isTypeAssertionExpression(current.parent)
      || ts.isParenthesizedExpression(current.parent)
      || ts.isNonNullExpression(current.parent)
      || ts.isSatisfiesExpression(current.parent)
    )
  ) {
    current = current.parent;
  }
  const parent = current.parent;
  return parent != null
    && ts.isCallExpression(parent)
    && parent.arguments.some((argument) => argument === current)
    && readCallMemberName(parent) === 'register'
    && (isAureliaReceiver(parent, bindings) || isContainerReceiver(parent, bindings));
}

function isImportedAureliaExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.aureliaIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'Aurelia'
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.aureliaNamespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

function isImportedAureliaBrowserFacadeExpression(
  expression: ts.Expression,
  bindings: ImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.aureliaBrowserFacadeIdentifiers.has(current.text);
  }
  if (!ts.isPropertyAccessExpression(current) || current.name.text !== 'Aurelia') {
    return false;
  }
  const namespace = unwrapExpression(current.expression);
  return ts.isIdentifier(namespace) && bindings.aureliaBrowserFacadeNamespaces.has(namespace.text);
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

function readRegistrationFactoryName(
  expression: ts.Expression,
  bindings: ImportedBindings,
): string | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const callee = unwrapExpression(current.expression);
  if (!ts.isPropertyAccessExpression(callee)) {
    return null;
  }
  const receiver = unwrapExpression(callee.expression);
  if (ts.isIdentifier(receiver) && bindings.registrationIdentifiers.has(receiver.text)) {
    return callee.name.text;
  }
  if (
    ts.isPropertyAccessExpression(receiver)
    && receiver.name.text === 'Registration'
    && ts.isIdentifier(unwrapExpression(receiver.expression))
    && bindings.registrationNamespaces.has((unwrapExpression(receiver.expression) as ts.Identifier).text)
  ) {
    return callee.name.text;
  }
  return null;
}

function readRequiredArgument(
  call: ts.CallExpression,
  index: number,
  openKind: RegistrationRecognitionOpen['openKind'],
  missingSummary: string,
  openSeams: RegistrationRecognitionOpen[],
): ts.Expression | null {
  const argument = call.arguments[index] ?? null;
  if (argument == null || ts.isSpreadElement(argument)) {
    openSeams.push(new RegistrationRecognitionOpen(openKind, missingSummary, argument ?? call));
    return null;
  }
  return argument;
}

function readDeferredRegistryParameters(
  call: ts.CallExpression,
): readonly RegistrationValueObservation[] {
  return call.arguments.slice(1).map((argument) => new RegistrationValueObservation(
    RegistrationValueKind.Unknown,
    readReferenceName(argument),
    argument,
    isDeclarationExpression(argument),
  ));
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

function isDeclarationValueNode(node: ts.Node): boolean {
  return ts.isClassDeclaration(node)
    || ts.isFunctionDeclaration(node)
    || (ts.isExpression(node) && isDeclarationExpression(node));
}

function readSpreadOpens(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
): readonly ConfigurationRecognitionOpen[] {
  return call.arguments
    .filter(ts.isSpreadElement)
    .filter((argument) => !isRecognizedRegisterSpread(context, argument, bindings))
    .map((argument) => new ConfigurationRecognitionOpen(
      KernelVocabulary.Registration.OpenSpread.key,
      'Configuration register call contains a spread argument that must be resolved before registration spending.',
      argument,
    ));
}

function isRecognizedRegisterSpread(
  context: ConfigurationRecognitionContext,
  argument: ts.SpreadElement,
  bindings: ImportedBindings,
): boolean {
  if (isKnownFrameworkRegistrationGroupSpread(argument, bindings)) {
    return true;
  }
  const value = context.expressionReader.evaluateExpression(argument.expression).value;
  return value?.kind === EvaluationValueKind.Array && !value.mayHaveUnknownElements && !value.mayHaveUnknownOrder;
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
  return context.expressionReader.evaluateExpression(expression).openSeams.map((seam) => new ConfigurationRecognitionOpen(
    KernelVocabulary.Configuration.OpenConfigurationOption.key,
    seam.summary,
    seam.node ?? expression,
  ));
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
      step.stepKind === ConfigurationStepKind.ContainerRegister
      || step.stepKind === ConfigurationStepKind.AppTaskFactory
      || step.stepKind === ConfigurationStepKind.Customize
    )
      ? ConfigurationSequenceKind.Plugin
      : ConfigurationSequenceKind.Unknown;
}

function compareNodes(sourceFile: ts.SourceFile, left: ts.Node, right: ts.Node): number {
  const start = left.getStart(sourceFile) - right.getStart(sourceFile);
  return start === 0 ? left.end - right.end : start;
}
