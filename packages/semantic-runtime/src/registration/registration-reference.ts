import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';

export const enum RegistrationValueKind {
  /** Use when a registration value expression was observed but not classified. */
  Unknown = 'unknown',
  /** Concrete instance value registered for a key. */
  Instance = 'instance',
  /** Constructable class value registered for singleton or transient activation. */
  Constructable = 'constructable',
  /** Callback function used to produce a value at resolution time. */
  Callback = 'callback',
  /** Callback function whose produced value is cached by the resolver. */
  CachedCallback = 'cached-callback',
  /** Original key or provider targeted by an alias registration. */
  AliasTarget = 'alias-target',
  /** Explicit resolver object supplied to the container. */
  Resolver = 'resolver',
  /** Factory value registered through container factory APIs. */
  Factory = 'factory',
  /** Aurelia resource definition value admitted through container registration. */
  ResourceDefinition = 'resource-definition',
  /** Static `$au` resource class admitted through container registration. */
  StaticResourceType = 'static-resource-type',
  /** IRegistry-compatible object or class with a register method. */
  Registry = 'registry',
  /** Object-map value whose own object/function properties are recursively admitted. */
  ObjectMap = 'object-map',
  /** Plain class admitted by the container's fallback self-registration branch. */
  PlainClass = 'plain-class',
  /** Framework-owned registration group admitted through a recognized spread. */
  FrameworkRegistration = 'framework-registration',
}

export const enum FrameworkRegistrationKind {
  /** Runtime registry shape is known to be an AppTask admission. */
  AppTask = 'app-task',
  /** RuntimeHtml StandardConfiguration registry. */
  StandardConfiguration = 'standard-configuration',
  /** I18n plugin configuration registry. */
  I18nConfiguration = 'i18n-configuration',
  /** Validation core configuration registry. */
  ValidationConfiguration = 'validation-configuration',
  /** Validation HTML configuration registry. */
  ValidationHtmlConfiguration = 'validation-html-configuration',
  /** Router plugin configuration registry. */
  RouterConfiguration = 'router-configuration',
  /** Router DefaultComponents registration group. */
  RouterDefaultComponents = 'router.default-components',
  /** Router DefaultResources registration group. */
  RouterDefaultResources = 'router.default-resources',
  /** State plugin default configuration registry. */
  StateDefaultConfiguration = 'state-default-configuration',
  /** Dialog plugin configuration registry. */
  DialogConfiguration = 'dialog-configuration',
  /** UI virtualization plugin configuration registry. */
  UiVirtualizationDefaultConfiguration = 'ui-virtualization.default-configuration',
  /** RuntimeHtml DefaultComponents registration group. */
  RuntimeHtmlDefaultComponents = 'runtime-html.default-components',
  /** RuntimeHtml DefaultBindingSyntax registration group. */
  RuntimeHtmlDefaultBindingSyntax = 'runtime-html.default-binding-syntax',
  /** RuntimeHtml ShortHandBindingSyntax registration group. */
  RuntimeHtmlShortHandBindingSyntax = 'runtime-html.short-hand-binding-syntax',
  /** RuntimeHtml DefaultBindingLanguage registration group. */
  RuntimeHtmlDefaultBindingLanguage = 'runtime-html.default-binding-language',
  /** RuntimeHtml DefaultResources registration group. */
  RuntimeHtmlDefaultResources = 'runtime-html.default-resources',
  /** RuntimeHtml DefaultRenderers registration group. */
  RuntimeHtmlDefaultRenderers = 'runtime-html.default-renderers',
}

export const enum RegistryBodyKind {
  /** Kernel `aliasedResourcesRegistry(mod, mainAlias, aliases)` registry body. */
  AliasedResourcesRegistry = 'aliased-resources-registry',
}

export const enum RegistryBodyInterpretationState {
  /** The registry body exists but still depends on open source/evaluation facts. */
  Open = 'open',
  /** The registry body has been interpreted enough for DI spending to avoid a generic body-open seam. */
  Interpreted = 'interpreted',
}

export class RegistryBodyReference {
  constructor(
    /** Framework/runtime body shape represented by this IRegistry value. */
    readonly bodyKind: RegistryBodyKind,
    /** Whether this body has been interpreted in the current static product lane. */
    readonly state: RegistryBodyInterpretationState,
  ) {}
}

/** Source-level reference to the DI key offered by a registration admission. */
export class RegistrationKeyReference {
  constructor(
    /** DI key identity when the key expression has been classified. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the key expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local name or literal preview for traces when the identity is still open. */
    readonly localName: string | null,
  ) {}
}

/** Source-level reference to the value, resolver, registry, or resource admitted by registration. */
export class RegistrationValueReference {
  constructor(
    /** Classified registration value lane. */
    readonly valueKind: RegistrationValueKind,
    /** Identity for declaration-like values such as classes, callbacks, resolvers, or registries. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for values already materialized by another layer, such as resources. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the value expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local value name for traces when no identity exists yet. */
    readonly localName: string | null,
    /** Known framework registration effect package, when recognized from source. */
    readonly frameworkKind: FrameworkRegistrationKind | null = null,
    /** Known registry-body semantics, when an IRegistry value was produced by a framework registry factory. */
    readonly registryBody: RegistryBodyReference | null = null,
  ) {}
}
