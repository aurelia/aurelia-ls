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

export interface FrameworkRegistrationEffects {
  readonly resolvers: readonly FrameworkResolverEffect[];
  readonly factories: readonly FrameworkFactoryEffect[];
  readonly appTasks: readonly FrameworkAppTaskEffect[];
}

const frameworkResolverEffects: readonly FrameworkResolverEffect[] = [
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
];

export function frameworkRegistrationEffectsForKind(
  kind: FrameworkRegistrationKind,
): FrameworkRegistrationEffects {
  const capabilities = new Set(frameworkRegistrationCapabilitiesForKind(kind));
  return {
    resolvers: frameworkResolverEffects.filter((effect) => capabilities.has(effect.capability)),
    factories: frameworkFactoryEffects.filter((effect) => capabilities.has(effect.capability)),
    appTasks: frameworkAppTaskEffects.filter((effect) => capabilities.has(effect.capability)),
  };
}
