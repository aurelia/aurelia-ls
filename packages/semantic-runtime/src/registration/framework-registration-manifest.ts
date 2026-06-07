import {
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from './registration-admission.js';
import { FrameworkRegistrationKind } from './registration-reference.js';

export const enum FrameworkRegistrationCapability {
  /** Runtime services needed before semantic-runtime can construct an app-root compiler world. */
  RuntimeHtmlCompilerServices = 'runtime-html.compiler-services',
  /** RuntimeHtml default attribute patterns such as `ref` and dotted command syntax. */
  RuntimeHtmlDefaultBindingSyntax = 'runtime-html.default-binding-syntax',
  /** RuntimeHtml shorthand attribute patterns such as `@trigger` and `:bind`. */
  RuntimeHtmlShortHandBindingSyntax = 'runtime-html.short-hand-binding-syntax',
  /** RuntimeHtml default binding commands such as `.bind`, `.for`, `.trigger`, `.class`, `.style`, and spread. */
  RuntimeHtmlDefaultBindingLanguage = 'runtime-html.default-binding-language',
  /** RuntimeHtml default built-in resources such as `if`, `repeat`, `promise`, `focus`, and `show`. */
  RuntimeHtmlDefaultResources = 'runtime-html.default-resources',
  /** RuntimeHtml default renderer registrations that hydrate compiler instructions into runtime products. */
  RuntimeHtmlDefaultRenderers = 'runtime-html.default-renderers',
  /** I18n plugin resource headers such as translation/date/number/relative-time converters and behaviors. */
  I18nDefaultResources = 'i18n.default-resources',
  /** I18n translation attribute patterns and binding commands, including configured aliases. */
  I18nTranslationSyntax = 'i18n.translation-syntax',
  /** I18n translation runtime renderers for `t`, `t.bind`, and `t-params`. */
  I18nTranslationRenderers = 'i18n.translation-renderers',
  /** I18n service resolver registrations such as `I18nInitOptions`, `II18nextWrapper`, and `I18N`. */
  I18nServiceResolvers = 'i18n.service-resolvers',
  /** I18n lifecycle task that waits on `I18N.initPromise` during app activation. */
  I18nLifecycleTasks = 'i18n.lifecycle-tasks',
  /** Validation core service registrations such as validators, rules, messages, and hydrators. */
  ValidationServiceResolvers = 'validation.service-resolvers',
  /** Validation HTML resource headers such as `validate`, `validation-errors`, and `validation-container`. */
  ValidationHtmlDefaultResources = 'validation-html.default-resources',
  /** Validation HTML service registrations such as the validation controller factory and default trigger. */
  ValidationHtmlServiceResolvers = 'validation-html.service-resolvers',
  /** Router package default service registrations such as `IRouter`. */
  RouterDefaultComponents = 'router.default-components',
  /** Router package default resources such as `au-viewport`, `load`, and `href`. */
  RouterDefaultResources = 'router.default-resources',
  /** RouterConfiguration option resolver registrations such as `IBaseHref` and `IRouterOptions`. */
  RouterConfigurationResolvers = 'router.configuration-resolvers',
  /** RouterConfiguration lifecycle AppTasks that connect RouteContext and router start/stop to AppRoot dispatch. */
  RouterLifecycleTasks = 'router.lifecycle-tasks',
  /** State plugin resource headers such as the `state` binding behavior. */
  StateDefaultResources = 'state.default-resources',
  /** State plugin attribute pattern and binding commands for `state` and `dispatch`. */
  StateBindingSyntax = 'state.binding-syntax',
  /** State plugin renderers for state and dispatch binding instructions. */
  StateRuntimeRenderers = 'state.runtime-renderers',
  /** State plugin service resolver registrations such as `IStoreRegistry`. */
  StateStoreResolvers = 'state.store-resolvers',
  /** State plugin lifecycle task that creates/registers stores during app creation. */
  StateStoreTasks = 'state.store-tasks',
  /** Dialog plugin service registrations such as dialog settings and DialogService. */
  DialogServiceResolvers = 'dialog.service-resolvers',
  /** Dialog plugin lifecycle task that applies the configured global settings provider. */
  DialogLifecycleTasks = 'dialog.lifecycle-tasks',
  /** UI virtualization plugin resource headers such as the `virtual-repeat` template controller. */
  UiVirtualizationDefaultResources = 'ui-virtualization.default-resources',
  /** UI virtualization plugin service registrations such as `ICollectionStrategyLocator` and `IDomRenderer`. */
  UiVirtualizationServiceResolvers = 'ui-virtualization.service-resolvers',
  /** AppTask admission that is selected by lifecycle-slot dispatch rather than DI world spending. */
  AppTask = 'app-task',
}

export const enum FrameworkRegistrationRole {
  /** A runtime `IRegistry`-shaped configuration value that can be registered directly. */
  Configuration = 'configuration',
  /** A decomposed registration array/group that is normally spread into `register(...)`. */
  RegistrationGroup = 'registration-group',
  /** A lifecycle task registry selected by app lifecycle dispatch. */
  AppTask = 'app-task',
}

interface FrameworkRegistrationDescriptor {
  readonly kind: FrameworkRegistrationKind;
  readonly exportName: string;
  readonly aliasExportNames?: readonly string[];
  readonly moduleNames: readonly string[];
  readonly role: FrameworkRegistrationRole;
  readonly chainMethods: readonly string[];
  readonly capabilities: readonly FrameworkRegistrationCapability[];
}

const frameworkRegistrationDescriptors: readonly FrameworkRegistrationDescriptor[] = [
  {
    kind: FrameworkRegistrationKind.StandardConfiguration,
    exportName: 'StandardConfiguration',
    moduleNames: ['@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: ['customize'],
    capabilities: [
      FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
      FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
      FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage,
      FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
      FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultComponents,
    exportName: 'DefaultComponents',
    moduleNames: ['@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlCompilerServices],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax,
    exportName: 'DefaultBindingSyntax',
    moduleNames: ['@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax,
    exportName: 'ShortHandBindingSyntax',
    moduleNames: ['aurelia', '@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage,
    exportName: 'DefaultBindingLanguage',
    moduleNames: ['@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultResources,
    exportName: 'DefaultResources',
    moduleNames: ['@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultResources],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers,
    exportName: 'DefaultRenderers',
    moduleNames: ['@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers],
  },
  {
    kind: FrameworkRegistrationKind.I18nConfiguration,
    exportName: 'I18nConfiguration',
    moduleNames: ['@aurelia/i18n'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: ['customize'],
    capabilities: [
      FrameworkRegistrationCapability.I18nDefaultResources,
      FrameworkRegistrationCapability.I18nTranslationSyntax,
      FrameworkRegistrationCapability.I18nTranslationRenderers,
      FrameworkRegistrationCapability.I18nServiceResolvers,
      FrameworkRegistrationCapability.I18nLifecycleTasks,
    ],
  },
  {
    kind: FrameworkRegistrationKind.ValidationConfiguration,
    exportName: 'ValidationConfiguration',
    moduleNames: ['@aurelia/validation'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: ['customize'],
    capabilities: [
      FrameworkRegistrationCapability.ValidationServiceResolvers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.ValidationHtmlConfiguration,
    exportName: 'ValidationHtmlConfiguration',
    moduleNames: ['@aurelia/validation-html'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: ['customize'],
    capabilities: [
      FrameworkRegistrationCapability.ValidationServiceResolvers,
      FrameworkRegistrationCapability.ValidationHtmlDefaultResources,
      FrameworkRegistrationCapability.ValidationHtmlServiceResolvers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.RouterConfiguration,
    exportName: 'RouterConfiguration',
    moduleNames: ['@aurelia/router'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: ['customize'],
    capabilities: [
      FrameworkRegistrationCapability.RouterConfigurationResolvers,
      FrameworkRegistrationCapability.RouterLifecycleTasks,
      FrameworkRegistrationCapability.RouterDefaultComponents,
      FrameworkRegistrationCapability.RouterDefaultResources,
    ],
  },
  {
    kind: FrameworkRegistrationKind.RouterDefaultComponents,
    exportName: 'DefaultComponents',
    moduleNames: ['@aurelia/router'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RouterDefaultComponents],
  },
  {
    kind: FrameworkRegistrationKind.RouterDefaultResources,
    exportName: 'DefaultResources',
    moduleNames: ['@aurelia/router'],
    role: FrameworkRegistrationRole.RegistrationGroup,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.RouterDefaultResources],
  },
  {
    kind: FrameworkRegistrationKind.StateDefaultConfiguration,
    exportName: 'StateDefaultConfiguration',
    moduleNames: ['@aurelia/state'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: ['init', 'withStore'],
    capabilities: [
      FrameworkRegistrationCapability.StateDefaultResources,
      FrameworkRegistrationCapability.StateBindingSyntax,
      FrameworkRegistrationCapability.StateRuntimeRenderers,
      FrameworkRegistrationCapability.StateStoreResolvers,
      FrameworkRegistrationCapability.StateStoreTasks,
    ],
  },
  {
    kind: FrameworkRegistrationKind.DialogConfiguration,
    exportName: 'DialogConfiguration',
    aliasExportNames: ['DialogConfigurationStandard', 'DialogConfigurationClassic'],
    moduleNames: ['@aurelia/dialog'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: ['customize', 'withChild'],
    capabilities: [
      FrameworkRegistrationCapability.DialogServiceResolvers,
      FrameworkRegistrationCapability.DialogLifecycleTasks,
    ],
  },
  {
    kind: FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration,
    exportName: 'DefaultVirtualizationConfiguration',
    moduleNames: ['@aurelia/ui-virtualization'],
    role: FrameworkRegistrationRole.Configuration,
    chainMethods: [],
    capabilities: [
      FrameworkRegistrationCapability.UiVirtualizationDefaultResources,
      FrameworkRegistrationCapability.UiVirtualizationServiceResolvers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.AppTask,
    exportName: 'AppTask',
    moduleNames: ['aurelia', '@aurelia/runtime-html'],
    role: FrameworkRegistrationRole.AppTask,
    chainMethods: [],
    capabilities: [FrameworkRegistrationCapability.AppTask],
  },
];

const descriptorsByKind = new Map<FrameworkRegistrationKind, FrameworkRegistrationDescriptor>(
  frameworkRegistrationDescriptors.map((descriptor) => [descriptor.kind, descriptor]),
);

const frameworkRegistrationKindsByModule = buildKindsByModule(frameworkRegistrationDescriptors);

export function frameworkRegistrationDescriptorForKind(
  kind: FrameworkRegistrationKind,
): FrameworkRegistrationDescriptor {
  const descriptor = descriptorsByKind.get(kind);
  if (descriptor == null) {
    throw new Error(`Unknown framework registration kind: ${kind}`);
  }
  return descriptor;
}

export function frameworkRegistrationKindsForModule(
  moduleName: string,
): readonly FrameworkRegistrationKind[] | null {
  return frameworkRegistrationKindsByModule.get(moduleName) ?? null;
}

export function frameworkRegistrationKindForRuntimeExportName(
  exportName: string,
): FrameworkRegistrationKind | null {
  for (const descriptor of frameworkRegistrationDescriptors) {
    if (frameworkRegistrationDescriptorExportNames(descriptor).includes(exportName)) {
      return descriptor.kind;
    }
  }
  return null;
}

export function frameworkRegistrationKindForExportName(
  exportName: string,
  exports: readonly FrameworkRegistrationKind[] | ReadonlySet<FrameworkRegistrationKind>,
): FrameworkRegistrationKind | null {
  const kind = frameworkRegistrationKindForRuntimeExportName(exportName);
  return kind != null && hasFrameworkRegistrationKind(exports, kind) ? kind : null;
}

export function traceNameForFrameworkRegistrationKind(kind: FrameworkRegistrationKind): string {
  return frameworkRegistrationDescriptorForKind(kind).exportName;
}

export function isKnownConfigurationKind(kind: FrameworkRegistrationKind): boolean {
  return frameworkRegistrationDescriptorForKind(kind).role === FrameworkRegistrationRole.Configuration;
}

export function isFrameworkRegistrationGroupKind(kind: FrameworkRegistrationKind): boolean {
  return frameworkRegistrationDescriptorForKind(kind).role === FrameworkRegistrationRole.RegistrationGroup;
}

export function frameworkRegistrationKindSupportsChainMethod(
  kind: FrameworkRegistrationKind,
  methodName: string,
): boolean {
  return frameworkRegistrationDescriptorForKind(kind).chainMethods.includes(methodName);
}

export function frameworkRegistrationCapabilitiesForKind(
  kind: FrameworkRegistrationKind,
): readonly FrameworkRegistrationCapability[] {
  return frameworkRegistrationDescriptorForKind(kind).capabilities;
}

export function frameworkRegistrationKindCarriesCapability(
  kind: FrameworkRegistrationKind,
  capability: FrameworkRegistrationCapability,
): boolean {
  return frameworkRegistrationCapabilitiesForKind(kind).includes(capability);
}

export function frameworkRegistrationAdmissionCarriesCapability(
  admission: RegistrationAdmissionProduct,
  capability: FrameworkRegistrationCapability,
): boolean {
  const kind = frameworkRegistrationKindForAdmission(admission);
  return kind == null ? false : frameworkRegistrationKindCarriesCapability(kind, capability);
}

function buildKindsByModule(
  descriptors: readonly FrameworkRegistrationDescriptor[],
): ReadonlyMap<string, readonly FrameworkRegistrationKind[]> {
  const mutable = new Map<string, FrameworkRegistrationKind[]>();
  for (const descriptor of descriptors) {
    for (const moduleName of descriptor.moduleNames) {
      let kinds = mutable.get(moduleName);
      if (kinds == null) {
        kinds = [];
        mutable.set(moduleName, kinds);
      }
      kinds.push(descriptor.kind);
    }
  }
  return mutable;
}

function frameworkRegistrationDescriptorExportNames(
  descriptor: FrameworkRegistrationDescriptor,
): readonly string[] {
  return [descriptor.exportName, ...(descriptor.aliasExportNames ?? [])];
}

function hasFrameworkRegistrationKind(
  exports: readonly FrameworkRegistrationKind[] | ReadonlySet<FrameworkRegistrationKind>,
  kind: FrameworkRegistrationKind,
): boolean {
  return 'has' in exports ? exports.has(kind) : exports.includes(kind);
}
