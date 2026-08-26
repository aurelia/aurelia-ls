import { FrameworkRegistrationKind } from './registration-reference.js';

export const enum FrameworkRegistrationCapability {
  /** Runtime services needed before semantic-runtime can construct an app-root compiler world. */
  RuntimeHtmlCompilerServices = 'runtime-html.compiler-services',
  /** Root/container registration package installs one or more TemplateCompilerHooks entries. */
  TemplateCompilerHooks = 'template-compiler.hooks',
  /** RuntimeHtml default attribute patterns such as `ref` and dotted command syntax. */
  RuntimeHtmlDefaultBindingSyntax = 'runtime-html.default-binding-syntax',
  /** RuntimeHtml shorthand attribute patterns such as `@trigger` and `:bind`. */
  RuntimeHtmlShortHandBindingSyntax = 'runtime-html.short-hand-binding-syntax',
  /** RuntimeHtml default binding commands such as `.bind`, `.for`, `.trigger`, `.class`, `.style`, and spread. */
  RuntimeHtmlDefaultBindingLanguage = 'runtime-html.default-binding-language',
  /** RuntimeHtml default built-in resources such as `if`, `repeat`, `promise`, `focus`, and `show`. */
  RuntimeHtmlDefaultResources = 'runtime-html.default-resources',
  /** RuntimeHtml ArrayLikeHandler admission for custom array-like repeat sources. */
  RuntimeHtmlArrayLikeRepeatHandler = 'runtime-html.array-like-repeat-handler',
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
  /** Validation i18n provider overrides and key configuration. */
  ValidationI18nServiceResolvers = 'validation-i18n.service-resolvers',
  /** Logger configuration resolver registrations such as `ILogConfig`. */
  LoggerServiceResolvers = 'logger.service-resolvers',
  /** Shadow-DOM style configuration task that installs shared styles during app creation. */
  StyleLifecycleTasks = 'style.lifecycle-tasks',
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

interface FrameworkRegistrationDescriptor {
  readonly kind: FrameworkRegistrationKind;
  /** Canonical export name used in traces and diagnostics. */
  readonly exportName: string;
  /** Other exports that admit the same coarse capability package but may have different defaults. */
  readonly alternateExportNames?: readonly string[];
  readonly moduleNames: readonly string[];
  /** Export selected by a generic source operation, or null when author input is required first. */
  readonly sourceRegistrationExportName: string | null;
  readonly capabilities: readonly FrameworkRegistrationCapability[];
}

export interface FrameworkRegistrationExportEntry {
  /** Runtime export name, including aliases, that refers to a known framework registration package. */
  readonly exportName: string;
  /** Framework registration package carried by this runtime export. */
  readonly kind: FrameworkRegistrationKind;
}

const frameworkRegistrationDescriptors: readonly FrameworkRegistrationDescriptor[] = [
  {
    kind: FrameworkRegistrationKind.StandardConfiguration,
    exportName: 'StandardConfiguration',
    moduleNames: ['@aurelia/runtime-html'],
    sourceRegistrationExportName: 'StandardConfiguration',
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
    sourceRegistrationExportName: 'DefaultComponents',
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlCompilerServices],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax,
    exportName: 'DefaultBindingSyntax',
    moduleNames: ['@aurelia/runtime-html'],
    sourceRegistrationExportName: 'DefaultBindingSyntax',
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax,
    exportName: 'ShortHandBindingSyntax',
    moduleNames: ['aurelia', '@aurelia/runtime-html'],
    sourceRegistrationExportName: 'ShortHandBindingSyntax',
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage,
    exportName: 'DefaultBindingLanguage',
    moduleNames: ['@aurelia/runtime-html'],
    sourceRegistrationExportName: 'DefaultBindingLanguage',
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultResources,
    exportName: 'DefaultResources',
    moduleNames: ['@aurelia/runtime-html'],
    sourceRegistrationExportName: 'DefaultResources',
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultResources],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlArrayLikeHandler,
    exportName: 'ArrayLikeHandler',
    moduleNames: ['aurelia', '@aurelia/runtime-html'],
    sourceRegistrationExportName: 'ArrayLikeHandler',
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlArrayLikeRepeatHandler],
  },
  {
    kind: FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers,
    exportName: 'DefaultRenderers',
    moduleNames: ['@aurelia/runtime-html'],
    sourceRegistrationExportName: 'DefaultRenderers',
    capabilities: [FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers],
  },
  {
    kind: FrameworkRegistrationKind.I18nConfiguration,
    exportName: 'I18nConfiguration',
    moduleNames: ['@aurelia/i18n'],
    sourceRegistrationExportName: 'I18nConfiguration',
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
    sourceRegistrationExportName: 'ValidationConfiguration',
    capabilities: [
      FrameworkRegistrationCapability.ValidationServiceResolvers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.ValidationHtmlConfiguration,
    exportName: 'ValidationHtmlConfiguration',
    moduleNames: ['@aurelia/validation-html'],
    sourceRegistrationExportName: 'ValidationHtmlConfiguration',
    capabilities: [
      FrameworkRegistrationCapability.ValidationServiceResolvers,
      FrameworkRegistrationCapability.ValidationHtmlDefaultResources,
      FrameworkRegistrationCapability.ValidationHtmlServiceResolvers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.ValidationI18nConfiguration,
    exportName: 'ValidationI18nConfiguration',
    moduleNames: ['@aurelia/validation-i18n'],
    sourceRegistrationExportName: 'ValidationI18nConfiguration',
    capabilities: [
      FrameworkRegistrationCapability.ValidationServiceResolvers,
      FrameworkRegistrationCapability.ValidationHtmlDefaultResources,
      FrameworkRegistrationCapability.ValidationHtmlServiceResolvers,
      FrameworkRegistrationCapability.ValidationI18nServiceResolvers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.LoggerConfiguration,
    exportName: 'LoggerConfiguration',
    moduleNames: ['aurelia', '@aurelia/kernel'],
    sourceRegistrationExportName: null,
    capabilities: [FrameworkRegistrationCapability.LoggerServiceResolvers],
  },
  {
    kind: FrameworkRegistrationKind.StyleConfiguration,
    exportName: 'StyleConfiguration',
    moduleNames: ['aurelia', '@aurelia/runtime-html'],
    sourceRegistrationExportName: null,
    capabilities: [FrameworkRegistrationCapability.StyleLifecycleTasks],
  },
  {
    kind: FrameworkRegistrationKind.RouterConfiguration,
    exportName: 'RouterConfiguration',
    moduleNames: ['@aurelia/router'],
    sourceRegistrationExportName: 'RouterConfiguration',
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
    sourceRegistrationExportName: 'DefaultComponents',
    capabilities: [FrameworkRegistrationCapability.RouterDefaultComponents],
  },
  {
    kind: FrameworkRegistrationKind.RouterDefaultResources,
    exportName: 'DefaultResources',
    moduleNames: ['@aurelia/router'],
    sourceRegistrationExportName: 'DefaultResources',
    capabilities: [FrameworkRegistrationCapability.RouterDefaultResources],
  },
  {
    kind: FrameworkRegistrationKind.StateDefaultConfiguration,
    exportName: 'StateDefaultConfiguration',
    moduleNames: ['@aurelia/state'],
    sourceRegistrationExportName: null,
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
    alternateExportNames: ['DialogConfigurationStandard', 'DialogConfigurationClassic'],
    moduleNames: ['@aurelia/dialog'],
    sourceRegistrationExportName: 'DialogConfigurationStandard',
    capabilities: [
      FrameworkRegistrationCapability.DialogServiceResolvers,
      FrameworkRegistrationCapability.DialogLifecycleTasks,
    ],
  },
  {
    kind: FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration,
    exportName: 'DefaultVirtualizationConfiguration',
    moduleNames: ['@aurelia/ui-virtualization'],
    sourceRegistrationExportName: 'DefaultVirtualizationConfiguration',
    capabilities: [
      FrameworkRegistrationCapability.UiVirtualizationDefaultResources,
      FrameworkRegistrationCapability.UiVirtualizationServiceResolvers,
    ],
  },
  {
    kind: FrameworkRegistrationKind.AppTask,
    exportName: 'AppTask',
    moduleNames: ['aurelia', '@aurelia/runtime-html'],
    sourceRegistrationExportName: null,
    capabilities: [FrameworkRegistrationCapability.AppTask],
  },
];

const descriptorsByKind = new Map<FrameworkRegistrationKind, FrameworkRegistrationDescriptor>(
  frameworkRegistrationDescriptors.map((descriptor) => [descriptor.kind, descriptor]),
);

const frameworkRegistrationKindsByModule = buildKindsByModule(frameworkRegistrationDescriptors);
const frameworkRegistrationExportEntriesByModule = buildExportEntriesByModule(frameworkRegistrationDescriptors);
const frameworkRegistrationKindsByCapability = buildKindsByCapability(frameworkRegistrationDescriptors);

/** Closed public vocabulary accepted by framework-capability selectors at transport boundaries. */
export const FRAMEWORK_REGISTRATION_CAPABILITIES: readonly FrameworkRegistrationCapability[] =
  [...frameworkRegistrationKindsByCapability.keys()]
    .sort((left, right) => left.localeCompare(right));

const frameworkRegistrationCapabilitySet: ReadonlySet<string> = new Set(FRAMEWORK_REGISTRATION_CAPABILITIES);

export function isFrameworkRegistrationCapability(
  value: unknown,
): value is FrameworkRegistrationCapability {
  return typeof value === 'string' && frameworkRegistrationCapabilitySet.has(value);
}

export function frameworkRegistrationCapabilityFromString(
  value: string,
): FrameworkRegistrationCapability | null {
  return isFrameworkRegistrationCapability(value) ? value : null;
}

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

export function frameworkRegistrationExportEntriesForModule(
  moduleName: string,
): readonly FrameworkRegistrationExportEntry[] | null {
  return frameworkRegistrationExportEntriesByModule.get(moduleName) ?? null;
}

export function frameworkRegistrationKindForExportName(
  exportName: string,
  exports: readonly FrameworkRegistrationKind[] | ReadonlySet<FrameworkRegistrationKind>,
): FrameworkRegistrationKind | null {
  for (const descriptor of frameworkRegistrationDescriptors) {
    if (
      hasFrameworkRegistrationKind(exports, descriptor.kind)
      && frameworkRegistrationDescriptorExportNames(descriptor).includes(exportName)
    ) {
      return descriptor.kind;
    }
  }
  return null;
}

export function traceNameForFrameworkRegistrationKind(kind: FrameworkRegistrationKind): string {
  return frameworkRegistrationDescriptorForKind(kind).exportName;
}

export function frameworkRegistrationSourceExportNameForKind(
  kind: FrameworkRegistrationKind,
): string | null {
  return frameworkRegistrationDescriptorForKind(kind).sourceRegistrationExportName;
}

export function frameworkRegistrationCapabilitiesForKind(
  kind: FrameworkRegistrationKind,
): readonly FrameworkRegistrationCapability[] {
  return frameworkRegistrationDescriptorForKind(kind).capabilities;
}

export function frameworkRegistrationKindsForCapability(
  capability: FrameworkRegistrationCapability,
): readonly FrameworkRegistrationKind[] {
  return frameworkRegistrationKindsByCapability.get(capability) ?? [];
}

export function frameworkRegistrationModuleNamesForCapability(
  capability: FrameworkRegistrationCapability,
): readonly string[] {
  return uniqueStrings(
    frameworkRegistrationKindsForCapability(capability)
      .flatMap((kind) => frameworkRegistrationDescriptorForKind(kind).moduleNames),
  );
}

export function frameworkRegistrationKindCarriesCapability(
  kind: FrameworkRegistrationKind,
  capability: FrameworkRegistrationCapability,
): boolean {
  return frameworkRegistrationCapabilitiesForKind(kind).includes(capability);
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

function buildExportEntriesByModule(
  descriptors: readonly FrameworkRegistrationDescriptor[],
): ReadonlyMap<string, readonly FrameworkRegistrationExportEntry[]> {
  const mutable = new Map<string, FrameworkRegistrationExportEntry[]>();
  for (const descriptor of descriptors) {
    for (const moduleName of descriptor.moduleNames) {
      let entries = mutable.get(moduleName);
      if (entries == null) {
        entries = [];
        mutable.set(moduleName, entries);
      }
      for (const exportName of frameworkRegistrationDescriptorExportNames(descriptor)) {
        entries.push({ exportName, kind: descriptor.kind });
      }
    }
  }
  return mutable;
}

function buildKindsByCapability(
  descriptors: readonly FrameworkRegistrationDescriptor[],
): ReadonlyMap<FrameworkRegistrationCapability, readonly FrameworkRegistrationKind[]> {
  const mutable = new Map<FrameworkRegistrationCapability, FrameworkRegistrationKind[]>();
  for (const descriptor of descriptors) {
    for (const capability of descriptor.capabilities) {
      let kinds = mutable.get(capability);
      if (kinds == null) {
        kinds = [];
        mutable.set(capability, kinds);
      }
      kinds.push(descriptor.kind);
    }
  }
  return mutable;
}

function frameworkRegistrationDescriptorExportNames(
  descriptor: FrameworkRegistrationDescriptor,
): readonly string[] {
  return [descriptor.exportName, ...(descriptor.alternateExportNames ?? [])];
}

function hasFrameworkRegistrationKind(
  exports: readonly FrameworkRegistrationKind[] | ReadonlySet<FrameworkRegistrationKind>,
  kind: FrameworkRegistrationKind,
): boolean {
  return 'has' in exports ? exports.has(kind) : exports.includes(kind);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
