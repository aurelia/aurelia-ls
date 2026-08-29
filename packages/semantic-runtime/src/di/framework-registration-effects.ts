import {
  AppTaskSlot,
} from '../configuration/app-task.js';
import type { AureliaAppWorldEmission } from '../configuration/app-world-composer.js';
import {
  FrameworkCapabilityConfigurationState,
  standardConfigurationCoercionConfigurationForAdmission,
} from '../configuration/framework-capability-configuration.js';
import type {
  StandardConfigurationCoercionConfiguration,
} from '../configuration/framework-capability-configuration.js';
import type { KernelMaterializationReadView } from '../kernel/store.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilitiesForKind,
} from '../registration/framework-registration-manifest.js';
import {
  FrameworkRegistrationKind,
  RegistrationValueKind,
} from '../registration/registration-reference.js';
import {
  ResolverStrategy,
} from './resolver.js';
import { FrameworkIntrinsicDiKey } from './framework-intrinsic-di-key.js';
import type { ContainerRegistrationOperation } from './container-registration.js';

export interface FrameworkResolverEffect {
  readonly capability: FrameworkRegistrationCapability;
  readonly keyName: string;
  readonly strategy: ResolverStrategy;
  readonly valueKind: RegistrationValueKind | null;
  readonly valueName: string | null;
}

export interface FrameworkFactoryEffect {
  readonly capability: FrameworkRegistrationCapability;
  readonly keyName: string;
  readonly factoryName: string;
}

export interface FrameworkAppTaskEffect {
  readonly capability: FrameworkRegistrationCapability;
  readonly slot: AppTaskSlot;
  readonly keyName: string;
  readonly callbackName: string;
}

export const enum FrameworkDiEffectCoverageState {
  /** Every DI provider effect relevant to the modeled app world is represented. */
  Closed = 'closed',
  /** Known DI provider effects are represented, but additional runtime registrations remain. */
  Partial = 'partial',
}

/** DI-owned projection of a framework registration package; catalog families own their own closure. */
export interface FrameworkDiRegistrationEffects {
  readonly coverageState: FrameworkDiEffectCoverageState;
  /** Honest residual pressure when DI provider replay is only partially modeled. */
  readonly openSummary: string | null;
  readonly resolvers: readonly FrameworkResolverEffect[];
  readonly factories: readonly FrameworkFactoryEffect[];
  readonly appTasks: readonly FrameworkAppTaskEffect[];
}

/** Ordered framework-registration fact lane, independent of any consumer's retention or pruning policy. */
export const enum FrameworkRegistrationEffectKind {
  Configuration = 'configuration',
  Resolver = 'resolver',
  Capability = 'capability',
}

export class FrameworkConfigurationRegistrationEffect {
  readonly effectKind = FrameworkRegistrationEffectKind.Configuration;
  readonly keyName = 'ICoercionConfiguration';

  constructor(
    readonly configuration: StandardConfigurationCoercionConfiguration,
  ) {}
}

export class FrameworkOrderedResolverEffect {
  readonly effectKind = FrameworkRegistrationEffectKind.Resolver;

  constructor(readonly resolver: FrameworkResolverEffect) {}
}

/**
 * One catalog-bearing registration group at its exact position inside StandardConfiguration.
 * Detailed syntax, resource, and renderer membership stays with the existing capability-owned catalogs.
 */
export class FrameworkCapabilityRegistrationEffect {
  readonly effectKind = FrameworkRegistrationEffectKind.Capability;

  constructor(
    readonly capability: FrameworkRegistrationCapability,
    readonly registrationKind: FrameworkRegistrationKind,
    readonly exportName: string,
  ) {}
}

export type FrameworkOrderedRegistrationEffect =
  | FrameworkConfigurationRegistrationEffect
  | FrameworkOrderedResolverEffect
  | FrameworkCapabilityRegistrationEffect;

/** Exact StandardConfiguration registration occurrence with its ordered, consumer-neutral effects. */
export class StandardConfigurationRegistrationEffects {
  constructor(
    readonly operation: ContainerRegistrationOperation,
    readonly coverageState: FrameworkDiEffectCoverageState,
    readonly openSummary: string | null,
    readonly effects: readonly FrameworkOrderedRegistrationEffect[],
  ) {}
}

const standardConfigurationDirectResolverEffects: readonly FrameworkResolverEffect[] = [
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'ICoercionConfiguration',
    strategy: ResolverStrategy.instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'StandardConfiguration coercion options',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'ExpressionParser',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ExpressionParser',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'IExpressionParser',
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'ExpressionParser',
  },
];

const defaultComponentResolverEffects: readonly FrameworkResolverEffect[] = [
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'TemplateCompiler',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'TemplateCompiler',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: FrameworkIntrinsicDiKey.ITemplateCompiler,
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'TemplateCompiler',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'AttrMapper',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'AttrMapper',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'IAttrMapper',
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'AttrMapper',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'ResourceResolver',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ResourceResolver',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'IResourceResolver',
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'ResourceResolver',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'DirtyChecker',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'DirtyChecker',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'IDirtyChecker',
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'DirtyChecker',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'NodeObserverLocator',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'NodeObserverLocator',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: 'INodeObserverLocator',
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'NodeObserverLocator',
  },
];

const eventModifierResolverEffects: readonly FrameworkResolverEffect[] = [
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
    keyName: 'IEventModifier',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'EventModifier',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
    keyName: 'IModifiedEventHandlerCreator',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ModifiedMouseEventHandler',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
    keyName: 'IModifiedEventHandlerCreator',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ModifiedKeyboardEventHandler',
  },
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
    keyName: 'IModifiedEventHandlerCreator',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ModifiedEventHandler',
  },
];

const frameworkResolverEffects: readonly FrameworkResolverEffect[] = [
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlArrayLikeRepeatHandler,
    keyName: FrameworkIntrinsicDiKey.IRepeatableHandler,
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ArrayLikeHandler',
  },
  {
    capability: FrameworkRegistrationCapability.I18nServiceResolvers,
    keyName: 'I18nInitOptions',
    strategy: ResolverStrategy.callback,
    valueKind: RegistrationValueKind.Callback,
    valueName: 'I18nConfiguration init options callback',
  },
  {
    capability: FrameworkRegistrationCapability.I18nServiceResolvers,
    keyName: 'II18nextWrapper',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'I18nextWrapper',
  },
  {
    capability: FrameworkRegistrationCapability.I18nServiceResolvers,
    keyName: 'I18N',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'I18nService',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationServiceResolvers,
    keyName: 'ICustomMessages',
    strategy: ResolverStrategy.instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'Validation custom messages',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationServiceResolvers,
    keyName: 'IValidator',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'StandardValidator',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationServiceResolvers,
    keyName: 'IValidationMessageProvider',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ValidationMessageProvider',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationServiceResolvers,
    keyName: 'IValidationExpressionHydrator',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ModelValidationExpressionHydrator',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationServiceResolvers,
    keyName: 'IValidationRules',
    strategy: ResolverStrategy.transient,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'ValidationRules',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationHtmlServiceResolvers,
    keyName: 'IDefaultTrigger',
    strategy: ResolverStrategy.instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'ValidationTrigger.focusout',
  },
  {
    capability: FrameworkRegistrationCapability.LoggerServiceResolvers,
    keyName: 'ILogConfig',
    strategy: ResolverStrategy.instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'LoggerConfiguration LogConfig',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationI18nServiceResolvers,
    keyName: 'IValidationMessageProvider',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'LocalizedValidationMessageProvider',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationI18nServiceResolvers,
    keyName: 'I18nKeyConfiguration',
    strategy: ResolverStrategy.callback,
    valueKind: RegistrationValueKind.Callback,
    valueName: 'Validation i18n key configuration callback',
  },
  {
    capability: FrameworkRegistrationCapability.RouterConfigurationResolvers,
    keyName: 'IBaseHref',
    strategy: ResolverStrategy.callback,
    valueKind: RegistrationValueKind.CachedCallback,
    valueName: 'RouterConfiguration IBaseHref callback',
  },
  {
    capability: FrameworkRegistrationCapability.RouterConfigurationResolvers,
    keyName: 'IRouterOptions',
    strategy: ResolverStrategy.instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'RouterOptions',
  },
  {
    capability: FrameworkRegistrationCapability.RouterConfigurationResolvers,
    keyName: 'RouterOptions',
    strategy: ResolverStrategy.instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'RouterOptions',
  },
  {
    capability: FrameworkRegistrationCapability.RouterDefaultComponents,
    keyName: 'IRouter',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'Router',
  },
  {
    capability: FrameworkRegistrationCapability.StateStoreResolvers,
    keyName: 'IStoreRegistry',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'StoreRegistry',
  },
  {
    capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    keyName: 'IDialogGlobalSettings',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'Dialog global settings',
  },
  {
    capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    keyName: 'DialogService',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'DialogService',
  },
  {
    capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    keyName: 'IDialogService',
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'DialogService',
  },
  {
    capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    keyName: 'IDialogChildSettings',
    strategy: ResolverStrategy.instance,
    valueKind: RegistrationValueKind.Instance,
    valueName: 'Dialog child settings map',
  },
  {
    capability: FrameworkRegistrationCapability.UiVirtualizationServiceResolvers,
    keyName: 'ICollectionStrategyLocator',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'CollectionStrategyLocator',
  },
  {
    capability: FrameworkRegistrationCapability.UiVirtualizationServiceResolvers,
    keyName: 'IDomRenderer',
    strategy: ResolverStrategy.singleton,
    valueKind: RegistrationValueKind.Constructable,
    valueName: 'DefaultDomRenderer',
  },
];

const frameworkFactoryEffects: readonly FrameworkFactoryEffect[] = [
  {
    capability: FrameworkRegistrationCapability.ValidationHtmlServiceResolvers,
    keyName: 'IValidationController',
    factoryName: 'ValidationControllerFactory',
  },
  {
    capability: FrameworkRegistrationCapability.ValidationI18nServiceResolvers,
    keyName: 'IValidationController',
    factoryName: 'LocalizedValidationControllerFactory',
  },
];

const frameworkAppTaskEffects: readonly FrameworkAppTaskEffect[] = [
  {
    capability: FrameworkRegistrationCapability.I18nLifecycleTasks,
    slot: AppTaskSlot.Activating,
    keyName: 'I18N',
    callbackName: 'i18n.initPromise',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Creating,
    keyName: 'IRouter',
    callbackName: 'RouterConfiguration ensure router instance',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Hydrated,
    keyName: 'IContainer',
    callbackName: 'RouteContext.setRoot',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Activated,
    keyName: 'IRouter',
    callbackName: 'router.start(true)',
  },
  {
    capability: FrameworkRegistrationCapability.RouterLifecycleTasks,
    slot: AppTaskSlot.Deactivated,
    keyName: 'IRouter',
    callbackName: 'router.stop()',
  },
  {
    capability: FrameworkRegistrationCapability.StateStoreTasks,
    slot: AppTaskSlot.Creating,
    keyName: 'IContainer',
    callbackName: 'StateDefaultConfiguration create/register store',
  },
  {
    capability: FrameworkRegistrationCapability.DialogLifecycleTasks,
    slot: AppTaskSlot.Creating,
    keyName: 'IDialogGlobalSettings',
    callbackName: 'DialogConfiguration settings provider',
  },
  {
    capability: FrameworkRegistrationCapability.StyleLifecycleTasks,
    slot: AppTaskSlot.Creating,
    keyName: 'IContainer',
    callbackName: 'StyleConfiguration install shared shadow-DOM styles',
  },
];

export function frameworkDiRegistrationEffectsForKind(
  kind: FrameworkRegistrationKind,
): FrameworkDiRegistrationEffects {
  const capabilities = new Set(frameworkRegistrationCapabilitiesForKind(kind));
  const openSummary = frameworkDiRegistrationOpenSummary(kind);
  return {
    coverageState: openSummary == null
      ? FrameworkDiEffectCoverageState.Closed
      : FrameworkDiEffectCoverageState.Partial,
    openSummary,
    resolvers: keepLastFrameworkEffectByKey(
      frameworkResolverEffectsForKind(kind, capabilities),
    ),
    factories: keepLastFrameworkEffectByKey(
      frameworkFactoryEffects.filter((effect) => capabilities.has(effect.capability)),
    ),
    appTasks: frameworkAppTaskEffects.filter((effect) => capabilities.has(effect.capability)),
  };
}

/**
 * Project exact StandardConfiguration occurrences that were spent into the app world.
 *
 * This is intentionally an ordered fact view. It neither selects effects nor recommends a generated configuration.
 * The legacy DI view above remains key-deduplicated for existing container-world consumers.
 */
export function standardConfigurationRegistrationEffectsForAppWorld(
  store: KernelMaterializationReadView,
  appWorld: Pick<AureliaAppWorldEmission, 'configuration' | 'diWorld'>,
): readonly StandardConfigurationRegistrationEffects[] {
  return appWorld.diWorld.registrationOperations.flatMap((operation) => {
    const registrationKind = operation.frameworkRegistrationKind;
    if (registrationKind !== FrameworkRegistrationKind.StandardConfiguration) {
      return [];
    }
    const diEffects = frameworkDiRegistrationEffectsForKind(registrationKind);
    const coercion = standardConfigurationCoercionConfigurationForAdmission(
      store,
      appWorld.configuration,
      operation.admission,
    );
    return [new StandardConfigurationRegistrationEffects(
      operation,
      diEffects.coverageState,
      frameworkRegistrationOperationOpenSummary(diEffects.openSummary, coercion),
      orderedStandardConfigurationEffects(coercion),
    )];
  });
}

function orderedStandardConfigurationEffects(
  coercion: StandardConfigurationCoercionConfiguration,
): readonly FrameworkOrderedRegistrationEffect[] {
  return [
    new FrameworkConfigurationRegistrationEffect(coercion),
    ...orderedResolvers(standardConfigurationDirectResolverEffects.slice(1)),
    ...orderedResolvers(defaultComponentResolverEffects),
    runtimeHtmlCapabilityEffect(
      FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
      FrameworkRegistrationKind.RuntimeHtmlDefaultResources,
      'DefaultResources',
    ),
    runtimeHtmlCapabilityEffect(
      FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
      FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax,
      'DefaultBindingSyntax',
    ),
    ...orderedResolvers(eventModifierResolverEffects),
    runtimeHtmlCapabilityEffect(
      FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage,
      FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage,
      'DefaultBindingLanguage',
    ),
    runtimeHtmlCapabilityEffect(
      FrameworkRegistrationCapability.RuntimeHtmlDefaultRenderers,
      FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers,
      'DefaultRenderers',
    ),
  ];
}

function frameworkResolverEffectsForKind(
  kind: FrameworkRegistrationKind,
  capabilities: ReadonlySet<FrameworkRegistrationCapability>,
): readonly FrameworkResolverEffect[] {
  const generic = frameworkResolverEffects.filter((effect) => capabilities.has(effect.capability));
  switch (kind) {
    case FrameworkRegistrationKind.StandardConfiguration:
      return [
        ...standardConfigurationDirectResolverEffects,
        ...defaultComponentResolverEffects,
        ...eventModifierResolverEffects,
        ...generic,
      ];
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return [...defaultComponentResolverEffects, ...generic];
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return [...eventModifierResolverEffects, ...generic];
    default:
      return generic;
  }
}

function orderedResolvers(
  resolvers: readonly FrameworkResolverEffect[],
): readonly FrameworkOrderedResolverEffect[] {
  return resolvers.map((resolver) => new FrameworkOrderedResolverEffect(resolver));
}

function runtimeHtmlCapabilityEffect(
  capability: FrameworkRegistrationCapability,
  registrationKind: FrameworkRegistrationKind,
  exportName: string,
): FrameworkCapabilityRegistrationEffect {
  return new FrameworkCapabilityRegistrationEffect(capability, registrationKind, exportName);
}

function frameworkRegistrationOperationOpenSummary(
  staticSummary: string | null,
  coercion: StandardConfigurationCoercionConfiguration | null,
): string | null {
  const coercionOpen = coercion != null && (
    coercion.enableCoercion.state === FrameworkCapabilityConfigurationState.Open
    || coercion.coerceNullish.state === FrameworkCapabilityConfigurationState.Open
  );
  if (!coercionOpen) {
    return staticSummary;
  }
  const coercionSummary = 'StandardConfiguration coercion customization retains open callback or value pressure.';
  return staticSummary == null ? coercionSummary : `${staticSummary} ${coercionSummary}`;
}

function frameworkDiRegistrationOpenSummary(kind: FrameworkRegistrationKind): string | null {
  switch (kind) {
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'DefaultBindingSyntax catalogs and EventModifierRegistration providers are modeled, but individual attribute-pattern service mutations remain catalog-owned.';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'ShortHandBindingSyntax catalog effects are modeled, but its DI registration body is not replayed yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'DefaultBindingLanguage catalog effects are modeled, but individual resource registration bodies are not replayed as ordered DI operations.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources resource slots and Promise compiler-pattern syntax are modeled, but the public group mixes both families and remains a coarse registration package.';
    case FrameworkRegistrationKind.RuntimeHtmlArrayLikeHandler:
      return null;
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return 'DefaultComponents compiler and observer providers are modeled, but constructor-initialized service state remains outside registration-effect replay.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'DefaultRenderers catalog effects are modeled, but individual multi-resolver registration rows remain catalog-owned.';
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'StandardConfiguration known providers, coercion options, and catalog groups are ordered; nested resource and syntax groups retain their declared partial posture.';
    case FrameworkRegistrationKind.I18nConfiguration:
    case FrameworkRegistrationKind.ValidationConfiguration:
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
    case FrameworkRegistrationKind.RouterConfiguration:
    case FrameworkRegistrationKind.RouterDefaultComponents:
    case FrameworkRegistrationKind.RouterDefaultResources:
    case FrameworkRegistrationKind.UiVirtualizationDefaultConfiguration:
    case FrameworkRegistrationKind.StateDefaultConfiguration:
    case FrameworkRegistrationKind.DialogConfiguration:
    case FrameworkRegistrationKind.AppTask:
    case FrameworkRegistrationKind.StyleConfiguration:
      return null;
    case FrameworkRegistrationKind.LoggerConfiguration:
      return 'LoggerConfiguration installs ILogConfig, but option-selected sink registrations remain open.';
    case FrameworkRegistrationKind.ValidationI18nConfiguration:
      return 'ValidationI18nConfiguration installs localized defaults, but a customization callback may replace provider types and key options.';
  }
}

function keepLastFrameworkEffectByKey<TEffect extends { readonly keyName: string }>(
  effects: readonly TEffect[],
): readonly TEffect[] {
  const lastIndexByKey = new Map(effects.map((effect, index) => [effect.keyName, index]));
  return effects.filter((effect, index) => lastIndexByKey.get(effect.keyName) === index);
}
