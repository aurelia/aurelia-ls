import {
  AppTaskSlot,
} from '../configuration/app-task.js';
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

const frameworkResolverEffects: readonly FrameworkResolverEffect[] = [
  {
    capability: FrameworkRegistrationCapability.RuntimeHtmlCompilerServices,
    keyName: FrameworkIntrinsicDiKey.ITemplateCompiler,
    strategy: ResolverStrategy.alias,
    valueKind: RegistrationValueKind.AliasTarget,
    valueName: 'TemplateCompiler',
  },
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
      frameworkResolverEffects.filter((effect) => capabilities.has(effect.capability)),
    ),
    factories: keepLastFrameworkEffectByKey(
      frameworkFactoryEffects.filter((effect) => capabilities.has(effect.capability)),
    ),
    appTasks: frameworkAppTaskEffects.filter((effect) => capabilities.has(effect.capability)),
  };
}

function frameworkDiRegistrationOpenSummary(kind: FrameworkRegistrationKind): string | null {
  switch (kind) {
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingSyntax:
      return 'DefaultBindingSyntax catalog effects are modeled, but EventModifierRegistration and remaining DI provider effects are not replayed yet.';
    case FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax:
      return 'ShortHandBindingSyntax catalog effects are modeled, but its DI registration body is not replayed yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultBindingLanguage:
      return 'DefaultBindingLanguage catalog effects are modeled, but its DI registration body is not replayed yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultResources:
      return 'DefaultResources resource slots are modeled, but non-resource DI effects from the registration body remain open.';
    case FrameworkRegistrationKind.RuntimeHtmlArrayLikeHandler:
      return null;
    case FrameworkRegistrationKind.RuntimeHtmlDefaultComponents:
      return 'DefaultComponents compiler services are modeled, but remaining DI registrations are not replayed yet.';
    case FrameworkRegistrationKind.RuntimeHtmlDefaultRenderers:
      return 'DefaultRenderers renderer catalog is modeled, but remaining DI registrations are not replayed yet.';
    case FrameworkRegistrationKind.StandardConfiguration:
      return 'StandardConfiguration catalogs and compiler-world services are modeled, but its complete DI provider and coercion-configuration effects are not replayed yet.';
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
