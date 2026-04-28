import ts from 'typescript';
import { readStaticStringArrayValue } from '../evaluation/expression-reader.js';
import {
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

const REGISTRATION_MODULES = new Set([
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

const KNOWN_FRAMEWORK_REGISTRATION_EXPORTS = new Map<string, readonly FrameworkRegistrationKind[]>([
  ['aurelia', [
    FrameworkRegistrationKind.StandardConfiguration,
    FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax,
    FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax,
    FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage,
    FrameworkRegistrationKind.RuntimeHtmlDefaultResources,
  ]],
  ['@aurelia/runtime-html', [
    FrameworkRegistrationKind.StandardConfiguration,
    FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax,
    FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax,
    FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage,
    FrameworkRegistrationKind.RuntimeHtmlDefaultResources,
  ]],
  ['@aurelia/i18n', [FrameworkRegistrationKind.I18nConfiguration]],
  ['@aurelia/state', [FrameworkRegistrationKind.StateDefaultConfiguration]],
]);

class ImportedBindings {
  readonly aureliaIdentifiers = new Set<string>();
  readonly aureliaNamespaces = new Set<string>();
  readonly aureliaInstanceIdentifiers = new Set<string>();
  readonly appTaskIdentifiers = new Set<string>();
  readonly appTaskNamespaces = new Set<string>();
  readonly registrationIdentifiers = new Set<string>();
  readonly registrationNamespaces = new Set<string>();
  readonly knownFrameworkRegistrationIdentifiers = new Map<string, FrameworkRegistrationKind>();
  readonly knownFrameworkRegistrationNamespaces = new Map<string, ReadonlySet<FrameworkRegistrationKind>>();
}

/** Recognizes Aurelia app/configuration flow over one evaluated source module. */
export class ConfigurationRecognitionProducer {
  recognize(context: ConfigurationRecognitionContext): readonly ConfigurationSequenceObservation[] {
    const bindings = readImportedBindings(context.sourceFile);
    const steps = [...readConfigurationSteps(context, bindings)]
      .sort((left, right) => compareNodes(context.sourceFile, left.sourceNode, right.sourceNode));

    if (steps.length === 0) {
      return [];
    }

    return [
      new ConfigurationSequenceObservation(
        sequenceKindForSteps(steps),
        context.sourceFile,
        context.moduleKey,
        steps,
      ),
    ];
  }
}

function readConfigurationSteps(
  context: ConfigurationRecognitionContext,
  bindings: ImportedBindings,
): readonly ConfigurationStepObservation[] {
  const steps: ConfigurationStepObservation[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node)) {
      const step = recognizeAureliaConstructor(node, bindings);
      if (step != null) {
        steps.push(step);
      }
    }

    if (ts.isCallExpression(node)) {
      const step = recognizeCall(context, node, bindings);
      if (step != null) {
        steps.push(step);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(context.sourceFile);
  return steps;
}

function recognizeAureliaConstructor(
  node: ts.NewExpression,
  bindings: ImportedBindings,
): ConfigurationStepObservation | null {
  const expression = unwrapExpression(node.expression);
  if (!isImportedAureliaExpression(expression, bindings)) {
    return null;
  }

  return new ConfigurationStepObservation(
    ConfigurationCarrierKind.AureliaConstructor,
    ConfigurationStepKind.CreateAurelia,
    node,
    readReferenceName(node.expression),
  );
}

function recognizeCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  bindings: ImportedBindings,
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
      [],
      missingArgumentOpen(call, call.arguments[0] ?? null, 'Aurelia.app(...) did not expose an app-root config argument.'),
    );
  }
  if (staticAurelia === 'register') {
    const registrationArguments = readRegisterArgumentObservations(
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
      registrationArguments.admissions,
      readSpreadOpens(call, bindings),
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
      const containerReceiver = isLikelyContainerReceiver(call);
      if (!aureliaReceiver && !containerReceiver) {
        return null;
      }
      const registrationArguments = readRegisterArgumentObservations(
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
        readSpreadOpens(call, bindings),
      );
    }
    case 'customize':
      if (!isKnownConfigurationCustomizeCall(call, bindings)) {
        return null;
      }
      return new ConfigurationStepObservation(
        ConfigurationCarrierKind.CustomizeCall,
        ConfigurationStepKind.Customize,
        call,
        readCallReceiverName(call),
        null,
        [],
        readCustomizeContributions(context, call),
        [],
        callbackOpenForCall(call, 'Configuration customize callback is preserved for later evaluation.'),
      );
    default:
      if (isKnownConfigurationBuilderCall(call, memberName, bindings)) {
        return new ConfigurationStepObservation(
          ConfigurationCarrierKind.BuilderMethodCall,
          ConfigurationStepKind.BuilderMutation,
          call,
          readCallReceiverName(call),
          null,
          [],
          readBuilderContributions(context, call, memberName),
        );
      }
      return null;
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
    }

    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      if (AURELIA_MODULES.has(moduleName)) {
        bindings.aureliaNamespaces.add(namedBindings.name.text);
      }
      if (APP_TASK_MODULES.has(moduleName)) {
        bindings.appTaskNamespaces.add(namedBindings.name.text);
      }
      if (REGISTRATION_MODULES.has(moduleName)) {
        bindings.registrationNamespaces.add(namedBindings.name.text);
      }
      const knownFrameworkRegistrationExports = KNOWN_FRAMEWORK_REGISTRATION_EXPORTS.get(moduleName);
      if (knownFrameworkRegistrationExports != null) {
        bindings.knownFrameworkRegistrationNamespaces.set(namedBindings.name.text, new Set(knownFrameworkRegistrationExports));
      }
      continue;
    }

    for (const element of namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (AURELIA_MODULES.has(moduleName) && importedName === 'Aurelia') {
        bindings.aureliaIdentifiers.add(element.name.text);
      }
      if (APP_TASK_MODULES.has(moduleName) && importedName === 'AppTask') {
        bindings.appTaskIdentifiers.add(element.name.text);
      }
      if (REGISTRATION_MODULES.has(moduleName) && importedName === 'Registration') {
        bindings.registrationIdentifiers.add(element.name.text);
      }
      const knownFrameworkRegistration = readKnownFrameworkRegistrationExport(moduleName, importedName);
      if (knownFrameworkRegistration != null) {
        bindings.knownFrameworkRegistrationIdentifiers.set(element.name.text, knownFrameworkRegistration);
      }
    }
  }
  collectAureliaInstanceIdentifiers(sourceFile, bindings);
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
    return new AppRootConfigObservation(
      current,
      null,
      new ConfigurationTargetObservation(readReferenceName(current), current, false),
      null,
      null,
      null,
    );
  }

  const openSeams: ConfigurationRecognitionOpen[] = [];
  const hostExpression = readObjectPropertyExpression(current, 'host');
  const componentExpression = readObjectPropertyExpression(current, 'component');
  const component = componentExpression == null
    ? null
    : new ConfigurationTargetObservation(readReferenceName(componentExpression), componentExpression, false);
  const allowActionlessForm = readBooleanObjectProperty(context, current, 'allowActionlessForm');
  const strictBinding = readBooleanObjectProperty(context, current, 'strictBinding');
  const ssrScopeExpression = readObjectPropertyExpression(current, 'ssrScope');

  if (hostExpression == null) {
    openSeams.push(new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationOption.key,
      'AppRoot config did not expose a closed host property.',
      current,
    ));
  }
  if (component == null) {
    openSeams.push(new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationTarget.key,
      'AppRoot config did not expose a closed component property.',
      current,
    ));
  }

  return new AppRootConfigObservation(
    current,
    hostExpression,
    component,
    allowActionlessForm,
    strictBinding,
    ssrScopeExpression,
    openSeams,
  );
}

function readRegisterArgumentObservations(
  call: ts.CallExpression,
  bindings: ImportedBindings,
  carrierKind: RegistrationCarrierKind,
  admissionKind: RegistrationAdmissionKind,
): {
  readonly admissions: readonly RegistrationAdmissionObservation[];
  readonly appTasks: readonly AppTaskObservation[];
} {
  const admissions: RegistrationAdmissionObservation[] = [];
  const appTasks: AppTaskObservation[] = [];
  for (const argument of call.arguments) {
    if (ts.isSpreadElement(argument)) {
      const frameworkGroup = recognizeKnownFrameworkRegistrationGroupSpread(argument, bindings, admissionKind, carrierKind);
      admissions.push(frameworkGroup ?? new RegistrationAdmissionObservation(
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
      ));
      continue;
    }

    const factory = recognizeRegistrationFactoryArgument(argument, bindings, admissionKind, carrierKind);
    if (factory != null) {
      admissions.push(factory);
      continue;
    }

    const knownConfiguration = recognizeKnownConfigurationRegistryArgument(argument, bindings, admissionKind, carrierKind);
    if (knownConfiguration != null) {
      admissions.push(knownConfiguration);
      continue;
    }

    const appTask = ts.isCallExpression(unwrapExpression(argument))
      ? recognizeAppTaskFactory(unwrapExpression(argument) as ts.CallExpression, bindings)
      : null;
    if (appTask != null) {
      appTasks.push(appTask);
      admissions.push(registrationObservationForAppTask(appTask, carrierKind, admissionKind));
      continue;
    }

    admissions.push(new RegistrationAdmissionObservation(
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
    ));
  }
  return { admissions, appTasks };
}

function recognizeRegistrationFactoryArgument(
  expression: ts.Expression,
  bindings: ImportedBindings,
  admissionKind: RegistrationAdmissionKind,
  carrierKind: RegistrationCarrierKind,
): RegistrationAdmissionObservation | null {
  const factoryName = readRegistrationFactoryName(expression, bindings);
  if (factoryName == null) {
    return null;
  }
  const shape = REGISTRATION_FACTORY_SHAPES.get(factoryName);
  if (shape == null || !ts.isCallExpression(unwrapExpression(expression))) {
    return null;
  }
  const call = unwrapExpression(expression) as ts.CallExpression;
  const openSeams: RegistrationRecognitionOpen[] = [];
  const keyArgument = readRequiredArgument(
    call,
    shape.keyArgumentIndex,
    KernelVocabulary.Registration.OpenKeyExpression.key,
    `Registration.${factoryName}(...) did not expose a target key.`,
    openSeams,
  );
  const valueArgument = shape.value == null
    ? null
    : readRequiredArgument(call, shape.value.argumentIndex, shape.value.missingOpenKind, `Registration.${factoryName}(...) did not expose a registered value.`, openSeams);

  if (shape.callbackBodyIsOpen && valueArgument != null) {
    openSeams.push(new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenCallbackBody.key,
      `Registration.${factoryName}(...) supplies a callback body that registration recognition does not execute.`,
      valueArgument,
    ));
  }

  return new RegistrationAdmissionObservation(
    carrierKind,
    admissionKind,
    shape.strategy,
    shape.keyRole,
    call,
    keyArgument == null ? null : new RegistrationKeyObservation(readReferenceName(keyArgument), keyArgument),
    valueArgument == null || shape.value == null
      ? null
      : new RegistrationValueObservation(shape.value.valueKind, readReferenceName(valueArgument), valueArgument, isDeclarationExpression(valueArgument)),
    factoryName === 'defer' ? readDeferredRegistryParameters(call) : [],
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
  if (callee.name.text === 'withStore') {
    const receiver = unwrapExpression(callee.expression);
    return ts.isCallExpression(receiver)
      ? readKnownConfigurationRegistryKind(receiver, bindings)
      : null;
  }

  const receiver = readKnownConfigurationReference(callee.expression, bindings);
  if (
    receiver === FrameworkRegistrationKind.StandardConfiguration
    || receiver === FrameworkRegistrationKind.I18nConfiguration
  ) {
    return callee.name.text === 'customize' ? receiver : null;
  }
  if (receiver === FrameworkRegistrationKind.StateDefaultConfiguration) {
    return callee.name.text === 'init' ? receiver : null;
  }
  return null;
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
  const exports = KNOWN_FRAMEWORK_REGISTRATION_EXPORTS.get(moduleName);
  if (exports == null) {
    return null;
  }
  return frameworkRegistrationKindForExportName(importedName, exports);
}

function frameworkRegistrationKindForExportName(
  exportName: string,
  exports: readonly FrameworkRegistrationKind[] | ReadonlySet<FrameworkRegistrationKind>,
): FrameworkRegistrationKind | null {
  const kind = frameworkRegistrationKindForRuntimeExportName(exportName);
  return kind != null && hasFrameworkRegistrationKind(exports, kind) ? kind : null;
}

function frameworkRegistrationKindForRuntimeExportName(exportName: string): FrameworkRegistrationKind | null {
  switch (exportName) {
    case 'StandardConfiguration':
      return FrameworkRegistrationKind.StandardConfiguration;
    case 'I18nConfiguration':
      return FrameworkRegistrationKind.I18nConfiguration;
    case 'StateDefaultConfiguration':
      return FrameworkRegistrationKind.StateDefaultConfiguration;
    case 'DefaultBindingSyntax':
      return FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax;
    case 'ShortHandBindingSyntax':
      return FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax;
    case 'DefaultBindingLanguage':
      return FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage;
    case 'DefaultResources':
      return FrameworkRegistrationKind.RuntimeHtmlDefaultResources;
    default:
      return null;
  }
}

function hasFrameworkRegistrationKind(
  exports: readonly FrameworkRegistrationKind[] | ReadonlySet<FrameworkRegistrationKind>,
  kind: FrameworkRegistrationKind,
): boolean {
  return 'has' in exports ? exports.has(kind) : exports.includes(kind);
}

function isKnownConfigurationKind(kind: FrameworkRegistrationKind): boolean {
  switch (kind) {
    case FrameworkRegistrationKind.StandardConfiguration:
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return true;
    case FrameworkRegistrationKind.AppTask:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return false;
  }
}

function isFrameworkRegistrationGroupKind(kind: FrameworkRegistrationKind): boolean {
  switch (kind) {
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return true;
    case FrameworkRegistrationKind.AppTask:
    case FrameworkRegistrationKind.StandardConfiguration:
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return false;
  }
}

function traceNameForFrameworkRegistrationKind(kind: FrameworkRegistrationKind): string {
  switch (kind) {
    case FrameworkRegistrationKind.AppTask:
      return 'AppTask';
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'StandardConfiguration';
    case FrameworkRegistrationKind.I18nConfiguration:
      return 'I18nConfiguration';
    case FrameworkRegistrationKind.StateDefaultConfiguration:
      return 'StateDefaultConfiguration';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'DefaultBindingSyntax';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'ShortHandBindingSyntax';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'DefaultBindingLanguage';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources';
  }
}

function isKnownConfigurationCustomizeCall(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): boolean {
  const frameworkKind = readKnownConfigurationRegistryKind(call, bindings);
  return frameworkKind === FrameworkRegistrationKind.StandardConfiguration
    || frameworkKind === FrameworkRegistrationKind.I18nConfiguration;
}

function isKnownConfigurationBuilderCall(
  call: ts.CallExpression,
  memberName: string | null,
  bindings: ImportedBindings,
): boolean {
  if (memberName !== 'init' && memberName !== 'withStore') {
    return false;
  }
  return readKnownConfigurationRegistryKind(call, bindings) === FrameworkRegistrationKind.StateDefaultConfiguration;
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

function readCustomizeContributions(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
): readonly ConfigurationOptionContributionObservation[] {
  const callback = call.arguments[0] ?? null;
  if (callback == null || ts.isSpreadElement(callback)) {
    return [];
  }
  const callbackContribution = new ConfigurationOptionContributionObservation(
    ConfigurationOptionContributionKind.CustomizeCallback,
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
    ...readCustomizeAssignmentContributions(context, callback),
  ];
}

function readCustomizeAssignmentContributions(
  context: ConfigurationRecognitionContext,
  callback: ts.Expression,
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
): readonly ConfigurationOptionContributionObservation[] {
  const contributions: ConfigurationOptionContributionObservation[] = [];
  call.arguments.forEach((argument, index) => {
    if (ts.isSpreadElement(argument)) {
      contributions.push(new ConfigurationOptionContributionObservation(
        ConfigurationOptionContributionKind.BuilderArgument,
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
  if (value == null) {
    return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Unknown, expression, null, [], readReferenceName(expression));
  }
  switch (value.kind) {
    case 'boolean':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Boolean, expression, value.value, [], readReferenceName(expression));
    case 'string':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.String, expression, value.value, [], readReferenceName(expression));
    case 'number':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Number, expression, value.value, [], readReferenceName(expression));
    case 'null':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Null, expression, null, [], readReferenceName(expression));
    case 'array': {
      const stringValues = readStaticStringArrayValue(value);
      return stringValues == null
        ? new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Array, expression, null, [], readReferenceName(expression))
        : new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.StringArray, expression, null, stringValues, readReferenceName(expression));
    }
    case 'object':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Object, expression, null, [], readReferenceName(expression));
    case 'function':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Callback, expression, null, [], readReferenceName(expression));
    case 'class':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Identity, expression, null, [], readReferenceName(expression));
    case 'bigint':
    case 'module-namespace':
    case 'undefined':
    case 'unknown':
      return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Unknown, expression, null, [], readReferenceName(expression));
  }
  return new ConfigurationOptionValueObservation(ConfigurationOptionValueKind.Unknown, expression, null, [], readReferenceName(expression));
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

function isLikelyContainerReceiver(call: ts.CallExpression): boolean {
  const receiverName = readCallReceiverName(call);
  return receiverName != null && /^(c|container|rootContainer|childContainer)$/i.test(receiverName);
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
    && (isAureliaReceiver(parent, bindings) || isLikelyContainerReceiver(parent));
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

function readSpreadOpens(
  call: ts.CallExpression,
  bindings: ImportedBindings,
): readonly ConfigurationRecognitionOpen[] {
  return call.arguments
    .filter(ts.isSpreadElement)
    .filter((argument) => !isKnownFrameworkRegistrationGroupSpread(argument, bindings))
    .map((argument) => new ConfigurationRecognitionOpen(
      KernelVocabulary.Registration.OpenSpread.key,
      'Configuration register call contains a spread argument that must be resolved before registration spending.',
      argument,
    ));
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

function callbackOpenForCall(
  call: ts.CallExpression,
  summary: string,
): readonly ConfigurationRecognitionOpen[] {
  return call.arguments.length === 0
    ? []
    : [new ConfigurationRecognitionOpen(KernelVocabulary.Configuration.OpenConfigurationCallback.key, summary, call.arguments[0]!)];
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
      step.stepKind === ConfigurationStepKind.ContainerRegister
      || step.stepKind === ConfigurationStepKind.AppTaskFactory
      || step.stepKind === ConfigurationStepKind.Customize
      || step.stepKind === ConfigurationStepKind.BuilderMutation
    )
      ? ConfigurationSequenceKind.Plugin
      : ConfigurationSequenceKind.Unknown;
}

function compareNodes(sourceFile: ts.SourceFile, left: ts.Node, right: ts.Node): number {
  const start = left.getStart(sourceFile) - right.getStart(sourceFile);
  return start === 0 ? left.end - right.end : start;
}
