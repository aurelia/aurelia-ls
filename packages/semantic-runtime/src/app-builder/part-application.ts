/** Where an app-builder part can attach in authored Aurelia/template source. */
export enum AppBuilderPartApplicationSiteKind {
  /** Native element, custom element, or framework custom element tag. */
  TemplateElement = 'template-element',
  /** Attribute or custom attribute on an existing element. */
  TemplateAttribute = 'template-attribute',
  /** Aurelia binding command on a target property, attribute, or event. */
  BindingCommandTarget = 'binding-command-target',
  /** Text-node interpolation expression. */
  TextInterpolation = 'text-interpolation',
  /** Tail modifier inside an Aurelia binding expression. */
  BindingExpressionModifier = 'binding-expression-modifier',
  /** Tail modifier that is only valid on an Aurelia listener binding expression. */
  EventBindingExpressionModifier = 'event-binding-expression-modifier',
  /** Template-controller attribute that creates a child view/scope boundary. */
  TemplateController = 'template-controller',
  /** Companion branch attached to a parent template-controller region. */
  TemplateControllerBranch = 'template-controller-branch',
  /** TypeScript decorator attached to a class, member, or accessor declaration. */
  TypeScriptDecorator = 'typescript-decorator',
  /** TypeScript object-literal property inside a framework metadata/configuration object. */
  TypeScriptObjectProperty = 'typescript-object-property',
  /** TypeScript expression fragment such as a registry/configuration expression. */
  TypeScriptExpression = 'typescript-expression',
  /** TypeScript top-level declaration such as a type alias, interface, or helper declaration. */
  TypeScriptTopLevelDeclaration = 'typescript-top-level-declaration',
  /** TypeScript class member such as a lifecycle method. */
  TypeScriptClassMember = 'typescript-class-member',
}

/** Stable value list for public part-application-site input schemas. */
export const APP_BUILDER_PART_APPLICATION_SITE_KINDS = [
  AppBuilderPartApplicationSiteKind.TemplateElement,
  AppBuilderPartApplicationSiteKind.TemplateAttribute,
  AppBuilderPartApplicationSiteKind.BindingCommandTarget,
  AppBuilderPartApplicationSiteKind.TextInterpolation,
  AppBuilderPartApplicationSiteKind.BindingExpressionModifier,
  AppBuilderPartApplicationSiteKind.EventBindingExpressionModifier,
  AppBuilderPartApplicationSiteKind.TemplateController,
  AppBuilderPartApplicationSiteKind.TemplateControllerBranch,
  AppBuilderPartApplicationSiteKind.TypeScriptDecorator,
  AppBuilderPartApplicationSiteKind.TypeScriptObjectProperty,
  AppBuilderPartApplicationSiteKind.TypeScriptExpression,
  AppBuilderPartApplicationSiteKind.TypeScriptTopLevelDeclaration,
  AppBuilderPartApplicationSiteKind.TypeScriptClassMember,
] as const;

/** Family of source operation a part will eventually lower through. */
export enum AppBuilderPartOperationKind {
  /** Create a bound native control or control group. */
  CreateControl = 'create-control',
  /** Add or update a non-control binding surface such as text, ref, class, style, or event. */
  ApplyBindingPart = 'apply-binding-part',
  /** Add a template-controller boundary such as if, repeat, with, switch, promise, or portal. */
  ApplyTemplateController = 'apply-template-controller',
  /** Add a companion branch such as else, case, default-case, pending, then, or catch. */
  ApplyTemplateControllerBranch = 'apply-template-controller-branch',
  /** Wrap a binding expression in a binding behavior resource. */
  ApplyBindingBehavior = 'apply-binding-behavior',
  /** Wrap a binding expression in a value converter resource. */
  ApplyValueConverter = 'apply-value-converter',
  /** Place a framework-provided custom element or custom attribute. */
  ApplyFrameworkResource = 'apply-framework-resource',
  /** Apply compiler-owned framework template syntax that is not a resource or binding command. */
  ApplyFrameworkSyntax = 'apply-framework-syntax',
  /** Apply a framework TypeScript API such as a decorator or helper call. */
  ApplyFrameworkApi = 'apply-framework-api',
  /** Apply resource-definition metadata such as local resource dependencies. */
  ApplyResourceMetadata = 'apply-resource-metadata',
  /** Add an Aurelia component lifecycle hook method to a view-model class. */
  ApplyComponentLifecycleHook = 'apply-component-lifecycle-hook',
}

/** How an app-builder part's listed value channels become concrete runtime binding channels. */
export enum AppBuilderPartValueChannelResolutionKind {
  /** The part's own source form owns the listed value-channel family before caller-specific source is parsed. */
  PartOwned = 'part-owned',
  /** The authored target/tag must pass through target-access and ObserverLocator semantics before the channel is known. */
  TargetObserverResolved = 'target-observer-resolved',
  /** This part does not directly create a runtime binding value-channel. */
  NotApplicable = 'not-applicable',
}

/** Stable value list for filtering parts by their value-channel resolution posture. */
export const APP_BUILDER_PART_VALUE_CHANNEL_RESOLUTION_KINDS = [
  AppBuilderPartValueChannelResolutionKind.PartOwned,
  AppBuilderPartValueChannelResolutionKind.TargetObserverResolved,
  AppBuilderPartValueChannelResolutionKind.NotApplicable,
] as const;

/** Stable value list for public part-operation input schemas and filters. */
export const APP_BUILDER_PART_OPERATION_KINDS = [
  AppBuilderPartOperationKind.CreateControl,
  AppBuilderPartOperationKind.ApplyBindingPart,
  AppBuilderPartOperationKind.ApplyTemplateController,
  AppBuilderPartOperationKind.ApplyTemplateControllerBranch,
  AppBuilderPartOperationKind.ApplyBindingBehavior,
  AppBuilderPartOperationKind.ApplyValueConverter,
  AppBuilderPartOperationKind.ApplyFrameworkResource,
  AppBuilderPartOperationKind.ApplyFrameworkSyntax,
  AppBuilderPartOperationKind.ApplyFrameworkApi,
  AppBuilderPartOperationKind.ApplyResourceMetadata,
  AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
] as const;

/** Caller-supplied slot category needed before a part operation can lower to source. */
export enum AppBuilderPartSlotKind {
  /** Existing or new Aurelia binding expression. */
  BindingExpression = 'binding-expression',
  /** DOM event name such as click or submit. */
  EventName = 'event-name',
  /** View-model handler or action expression. */
  HandlerExpression = 'handler-expression',
  /** View-model/member reference target name. */
  ReferenceName = 'reference-name',
  /** CSS class token. */
  ClassToken = 'class-token',
  /** CSS property name. */
  CssProperty = 'css-property',
  /** Generic HTML or Aurelia attribute name. */
  AttributeName = 'attribute-name',
  /** Binding-command target before the command suffix, such as `value` in `value.bind`. */
  BindingCommandTargetName = 'binding-command-target-name',
  /** Optional @aurelia/state store name used by `.state` / `.dispatch` command suffixes. */
  StateStoreName = 'state-store-name',
  /** TypeScript selector callback over a configured @aurelia/state store state object. */
  StateSelectorExpression = 'state-selector-expression',
  /** Template-local variable name. */
  LocalName = 'local-name',
  /** Iterable expression used by repeat-like controllers. */
  IterableExpression = 'iterable-expression',
  /** Value-domain expression for choice controls. */
  ValueDomainExpression = 'value-domain-expression',
  /** Option value or model expression. */
  OptionValueExpression = 'option-value-expression',
  /** Choice option binding target: native `value` channel or Aurelia `model` identity channel. */
  OptionBindingKind = 'option-binding-kind',
  /** Option display expression used inside generated choice-control labels. */
  OptionLabelExpression = 'option-label-expression',
  /** Equality matcher expression for choice controls. */
  MatcherExpression = 'matcher-expression',
  /** Static HTML name attribute used to group native radio options. */
  RadioGroupName = 'radio-group-name',
  /** Static required attribute emitted from caller-supplied field-local constraint policy. */
  NativeRequired = 'native-required',
  /** Static minimum character count used by native text-like controls. */
  TextMinLength = 'text-min-length',
  /** Static maximum character count used by native text-like controls. */
  TextMaxLength = 'text-max-length',
  /** Static native pattern attribute used by native text-like controls. */
  TextPattern = 'text-pattern',
  /** Static numeric minimum used by native number/range controls. */
  NumericMinimum = 'numeric-minimum',
  /** Static numeric maximum used by native number/range controls. */
  NumericMaximum = 'numeric-maximum',
  /** Static numeric step used by native number/range controls. */
  NumericStep = 'numeric-step',
  /** Route or navigation instruction. */
  RouteInstruction = 'route-instruction',
  /** Route params object expression. */
  RouteParamsExpression = 'route-params-expression',
  /** Route context expression. */
  RouteContextExpression = 'route-context-expression',
  /** From-view active-state expression for router links. */
  RouteActiveExpression = 'route-active-expression',
  /** Router load target attribute name. */
  RouteTargetAttributeName = 'route-target-attribute-name',
  /** Static `au-viewport` name bindable value. */
  ViewportName = 'viewport-name',
  /** Static `au-viewport` used-by bindable value. */
  ViewportUsedBy = 'viewport-used-by',
  /** Static `au-viewport` default route value. */
  ViewportDefault = 'viewport-default',
  /** Static `au-viewport` fallback route/component value. */
  ViewportFallback = 'viewport-fallback',
  /** Dynamic `au-compose` component expression lowered as `component.bind`. */
  CompositionComponentExpression = 'composition-component-expression',
  /** Dynamic `au-compose` template expression lowered as `template.bind`. */
  CompositionTemplateExpression = 'composition-template-expression',
  /** Dynamic `au-compose` model expression lowered as `model.bind`. */
  CompositionModelExpression = 'composition-model-expression',
  /** Static `au-compose` scope-behavior literal. */
  CompositionScopeBehavior = 'composition-scope-behavior',
  /** Static `au-compose` host tag literal for template-only composition. */
  CompositionTagName = 'composition-tag-name',
  /** Static `au-compose` flush-mode literal. */
  CompositionFlushMode = 'composition-flush-mode',
  /** Static `au-slot` projection slot name. */
  ProjectionSlotName = 'projection-slot-name',
  /** Expression that receives validation-html exposed errors. */
  ValidationErrorsExpression = 'validation-errors-expression',
  /** Optional validation controller expression for validation-html subscribers. */
  ValidationControllerExpression = 'validation-controller-expression',
  /** Optional argument list for a binding behavior. */
  BindingBehaviorArguments = 'binding-behavior-arguments',
  /** Optional argument list for a value converter. */
  ValueConverterArguments = 'value-converter-arguments',
  /** Static i18n translation key expression, including optional target segments such as `[title]app.name`. */
  TranslationKeyExpression = 'translation-key-expression',
  /** Aurelia expression object supplied to i18n `t-params.bind`. */
  TranslationParametersExpression = 'translation-parameters-expression',
  /** Portal target expression or selector. */
  PortalTarget = 'portal-target',
  /** Portal DOM insertion position. */
  PortalPosition = 'portal-position',
  /** Portal render-context selector or expression. */
  PortalRenderContext = 'portal-render-context',
  /** Portal static strict flag. */
  PortalStrict = 'portal-strict',
  /** Custom-element resource name used by template-local compiler syntax such as `as-element`. */
  CustomElementResourceName = 'custom-element-resource-name',
  /** Named Aurelia resource name used by decorators, static `$au`, and define-call carriers. */
  ResourceName = 'resource-name',
  /** TypeScript template expression inside custom-element definition metadata. */
  ResourceTemplateExpression = 'resource-template-expression',
  /** TypeScript expression list inside a resource definition `dependencies: [...]` array. */
  ResourceDependencyExpressionList = 'resource-dependency-expression-list',
  /** TypeScript class/type expression used by imperative resource definition calls. */
  ResourceTypeExpression = 'resource-type-expression',
  /** TypeScript object expressions inside an `AttributePattern.create([...])` pattern array. */
  AttributePatternDefinitionExpressionList = 'attribute-pattern-definition-expression-list',
  /** TypeScript object expression passed to the router `@route(...)` decorator. */
  RouteConfigurationExpression = 'route-configuration-expression',
  /** TypeScript receiver expression for `RouteContext.getRouteParameters(...)`; omit to use `resolve(IRouteContext)`. */
  RouteContextReceiverExpression = 'route-context-receiver-expression',
  /** TypeScript object type argument for a `RouteContext.getRouteParameters<...>()` read. */
  RouteParameterType = 'route-parameter-type',
  /** RouteContext parameter merge strategy literal. */
  RouteParameterMergeStrategy = 'route-parameter-merge-strategy',
  /** Static include-query-params option for `RouteContext.getRouteParameters(...)`. */
  RouteIncludeQueryParams = 'route-include-query-params',
  /** Optional argument expression for Aurelia's `@computed(...)` decorator. */
  ComputedDecoratorArgumentExpression = 'computed-decorator-argument-expression',
  /** AppTask lifecycle slot name such as `creating` or `activated`. */
  AppTaskSlotName = 'app-task-slot-name',
  /** Optional DI key expression for keyed AppTask callbacks. */
  AppTaskKeyExpression = 'app-task-key-expression',
  /** Callback expression invoked by an AppTask registration. */
  AppTaskCallbackExpression = 'app-task-callback-expression',
  /** TypeScript statements inside a generated method body. */
  TypeScriptMethodBodyStatements = 'typescript-method-body-statements',
}

/** Stable value list for public part-slot assignment schemas. */
export const APP_BUILDER_PART_SLOT_KINDS = [
  AppBuilderPartSlotKind.BindingExpression,
  AppBuilderPartSlotKind.EventName,
  AppBuilderPartSlotKind.HandlerExpression,
  AppBuilderPartSlotKind.ReferenceName,
  AppBuilderPartSlotKind.ClassToken,
  AppBuilderPartSlotKind.CssProperty,
  AppBuilderPartSlotKind.AttributeName,
  AppBuilderPartSlotKind.BindingCommandTargetName,
  AppBuilderPartSlotKind.StateStoreName,
  AppBuilderPartSlotKind.StateSelectorExpression,
  AppBuilderPartSlotKind.LocalName,
  AppBuilderPartSlotKind.IterableExpression,
  AppBuilderPartSlotKind.ValueDomainExpression,
  AppBuilderPartSlotKind.OptionValueExpression,
  AppBuilderPartSlotKind.OptionBindingKind,
  AppBuilderPartSlotKind.OptionLabelExpression,
  AppBuilderPartSlotKind.MatcherExpression,
  AppBuilderPartSlotKind.RadioGroupName,
  AppBuilderPartSlotKind.NativeRequired,
  AppBuilderPartSlotKind.TextMinLength,
  AppBuilderPartSlotKind.TextMaxLength,
  AppBuilderPartSlotKind.TextPattern,
  AppBuilderPartSlotKind.NumericMinimum,
  AppBuilderPartSlotKind.NumericMaximum,
  AppBuilderPartSlotKind.NumericStep,
  AppBuilderPartSlotKind.RouteInstruction,
  AppBuilderPartSlotKind.RouteParamsExpression,
  AppBuilderPartSlotKind.RouteContextExpression,
  AppBuilderPartSlotKind.RouteActiveExpression,
  AppBuilderPartSlotKind.RouteTargetAttributeName,
  AppBuilderPartSlotKind.ViewportName,
  AppBuilderPartSlotKind.ViewportUsedBy,
  AppBuilderPartSlotKind.ViewportDefault,
  AppBuilderPartSlotKind.ViewportFallback,
  AppBuilderPartSlotKind.CompositionComponentExpression,
  AppBuilderPartSlotKind.CompositionTemplateExpression,
  AppBuilderPartSlotKind.CompositionModelExpression,
  AppBuilderPartSlotKind.CompositionScopeBehavior,
  AppBuilderPartSlotKind.CompositionTagName,
  AppBuilderPartSlotKind.CompositionFlushMode,
  AppBuilderPartSlotKind.ProjectionSlotName,
  AppBuilderPartSlotKind.ValidationErrorsExpression,
  AppBuilderPartSlotKind.ValidationControllerExpression,
  AppBuilderPartSlotKind.BindingBehaviorArguments,
  AppBuilderPartSlotKind.ValueConverterArguments,
  AppBuilderPartSlotKind.TranslationKeyExpression,
  AppBuilderPartSlotKind.TranslationParametersExpression,
  AppBuilderPartSlotKind.PortalTarget,
  AppBuilderPartSlotKind.PortalPosition,
  AppBuilderPartSlotKind.PortalRenderContext,
  AppBuilderPartSlotKind.PortalStrict,
  AppBuilderPartSlotKind.CustomElementResourceName,
  AppBuilderPartSlotKind.ResourceName,
  AppBuilderPartSlotKind.ResourceTemplateExpression,
  AppBuilderPartSlotKind.ResourceDependencyExpressionList,
  AppBuilderPartSlotKind.ResourceTypeExpression,
  AppBuilderPartSlotKind.AttributePatternDefinitionExpressionList,
  AppBuilderPartSlotKind.RouteConfigurationExpression,
  AppBuilderPartSlotKind.RouteContextReceiverExpression,
  AppBuilderPartSlotKind.RouteParameterType,
  AppBuilderPartSlotKind.RouteParameterMergeStrategy,
  AppBuilderPartSlotKind.RouteIncludeQueryParams,
  AppBuilderPartSlotKind.ComputedDecoratorArgumentExpression,
  AppBuilderPartSlotKind.AppTaskSlotName,
  AppBuilderPartSlotKind.AppTaskKeyExpression,
  AppBuilderPartSlotKind.AppTaskCallbackExpression,
  AppBuilderPartSlotKind.TypeScriptMethodBodyStatements,
] as const;

/** Grammar family expected for a caller-supplied source-lowering slot value. */
export enum AppBuilderPartSlotValueLanguage {
  /** Plain identifier-like name in the generated source context. */
  Identifier = 'identifier',
  /** DOM event name such as `click` or `submit`. */
  DomEventName = 'dom-event-name',
  /** HTML, SVG, or Aurelia target attribute name. */
  HtmlAttributeName = 'html-attribute-name',
  /** Static HTML attribute value that is escaped by the authored-template serializer. */
  HtmlAttributeValue = 'html-attribute-value',
  /** CSS class token without selector punctuation. */
  CssClassToken = 'css-class-token',
  /** CSS property name in authored style-binding syntax. */
  CssPropertyName = 'css-property-name',
  /** Aurelia binding expression parsed in the current template binding scope. */
  AureliaBindingExpression = 'aurelia-binding-expression',
  /** Aurelia event-handler expression parsed as a function/call binding value. */
  AureliaFunctionExpression = 'aurelia-function-expression',
  /** Aurelia expression that supplies the iterable side of an iterator header. */
  AureliaIterableValueExpression = 'aurelia-iterable-value-expression',
  /** Closed value selecting how choice options expose their model/value channel. */
  ChoiceOptionBindingKind = 'choice-option-binding-kind',
  /** Static @aurelia/state store name that can survive command-argument and TypeScript API source forms. */
  StateStoreName = 'state-store-name',
  /** Colon-separated Aurelia expression argument list for converters or behaviors. */
  AureliaExpressionArgumentList = 'aurelia-expression-argument-list',
  /** String navigation instruction accepted by router `load` and internal `href`, including route-context prefixes. */
  RouterNavigationInstruction = 'router-navigation-instruction',
  /** Static router route expression accepted by route-like router properties without a caller context. */
  RouterRouteExpression = 'router-route-expression',
  /** Closed route-context parameter merge strategy accepted by `getRouteParameters(...)`. */
  RouteContextParameterMergeStrategy = 'route-context-parameter-merge-strategy',
  /** Router viewport name bindable value. */
  RouterViewportName = 'router-viewport-name',
  /** Router component filter used by `au-viewport used-by`. */
  RouterComponentFilter = 'router-component-filter',
  /** Static projection slot name used by `au-slot name`. */
  ProjectionSlotName = 'projection-slot-name',
  /** Static HTML tag name literal. */
  HtmlTagName = 'html-tag-name',
  /** Closed value selecting runtime-html `AuCompose.scopeBehavior`. */
  AuComposeScopeBehavior = 'au-compose-scope-behavior',
  /** Closed value selecting runtime-html `AuCompose.flushMode`. */
  AuComposeFlushMode = 'au-compose-flush-mode',
  /** Static or dynamic i18n translation key expression. */
  I18nTranslationKey = 'i18n-translation-key',
  /** Portal target selector or target expression. */
  PortalTarget = 'portal-target',
  /** Closed value selecting a portal DOM insertion position. */
  PortalInsertPosition = 'portal-insert-position',
  /** Static boolean literal text. */
  BooleanLiteral = 'boolean-literal',
  /** Static numeric literal text for native HTML attributes such as min, max, and step. */
  NumericLiteral = 'numeric-literal',
  /** Custom-element resource name as used by compiler special syntax. */
  ResourceName = 'resource-name',
  /** TypeScript expression fragment. */
  TypeScriptExpression = 'typescript-expression',
  /** TypeScript type fragment. */
  TypeScriptType = 'typescript-type',
  /** TypeScript expression-list fragment. */
  TypeScriptExpressionList = 'typescript-expression-list',
  /** TypeScript statement-list fragment. */
  TypeScriptStatements = 'typescript-statements',
  /** Aurelia AppTask lifecycle slot name. */
  AppTaskSlotName = 'app-task-slot-name',
}

/** Stable value list for part-slot value language filters and source validation. */
export const APP_BUILDER_PART_SLOT_VALUE_LANGUAGES = [
  AppBuilderPartSlotValueLanguage.Identifier,
  AppBuilderPartSlotValueLanguage.DomEventName,
  AppBuilderPartSlotValueLanguage.HtmlAttributeName,
  AppBuilderPartSlotValueLanguage.HtmlAttributeValue,
  AppBuilderPartSlotValueLanguage.CssClassToken,
  AppBuilderPartSlotValueLanguage.CssPropertyName,
  AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
  AppBuilderPartSlotValueLanguage.AureliaFunctionExpression,
  AppBuilderPartSlotValueLanguage.AureliaIterableValueExpression,
  AppBuilderPartSlotValueLanguage.ChoiceOptionBindingKind,
  AppBuilderPartSlotValueLanguage.StateStoreName,
  AppBuilderPartSlotValueLanguage.AureliaExpressionArgumentList,
  AppBuilderPartSlotValueLanguage.RouterNavigationInstruction,
  AppBuilderPartSlotValueLanguage.RouterRouteExpression,
  AppBuilderPartSlotValueLanguage.RouteContextParameterMergeStrategy,
  AppBuilderPartSlotValueLanguage.RouterViewportName,
  AppBuilderPartSlotValueLanguage.RouterComponentFilter,
  AppBuilderPartSlotValueLanguage.ProjectionSlotName,
  AppBuilderPartSlotValueLanguage.HtmlTagName,
  AppBuilderPartSlotValueLanguage.AuComposeScopeBehavior,
  AppBuilderPartSlotValueLanguage.AuComposeFlushMode,
  AppBuilderPartSlotValueLanguage.I18nTranslationKey,
  AppBuilderPartSlotValueLanguage.PortalTarget,
  AppBuilderPartSlotValueLanguage.PortalInsertPosition,
  AppBuilderPartSlotValueLanguage.BooleanLiteral,
  AppBuilderPartSlotValueLanguage.NumericLiteral,
  AppBuilderPartSlotValueLanguage.ResourceName,
  AppBuilderPartSlotValueLanguage.TypeScriptExpression,
  AppBuilderPartSlotValueLanguage.TypeScriptType,
  AppBuilderPartSlotValueLanguage.TypeScriptExpressionList,
  AppBuilderPartSlotValueLanguage.TypeScriptStatements,
  AppBuilderPartSlotValueLanguage.AppTaskSlotName,
] as const;

/** One app-builder source-lowering slot with its expected value language. */
export interface AppBuilderPartSlotDescriptor {
  readonly slotKind: AppBuilderPartSlotKind;
  readonly valueLanguage: AppBuilderPartSlotValueLanguage;
  readonly summary: string;
}

/** Integrity issue category for the slot descriptor catalog. */
export enum AppBuilderPartSlotCatalogIssueKind {
  /** A public slot kind has no descriptor row. */
  MissingDescriptor = 'missing-descriptor',
  /** More than one descriptor row exists for a slot kind. */
  DuplicateDescriptor = 'duplicate-descriptor',
  /** A descriptor row names a slot kind that is not in the public slot-kind list. */
  UnknownSlotKind = 'unknown-slot-kind',
}

/** Integrity issue for the slot descriptor catalog. */
export interface AppBuilderPartSlotCatalogIssue {
  readonly issueKind: AppBuilderPartSlotCatalogIssueKind;
  readonly slotKind: AppBuilderPartSlotKind;
}

/** Stable descriptions for all source-lowering slot kinds. */
export const APP_BUILDER_PART_SLOT_DESCRIPTORS: readonly AppBuilderPartSlotDescriptor[] = [
  {
    slotKind: AppBuilderPartSlotKind.BindingExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia binding expression parsed against the active template scope.',
  },
  {
    slotKind: AppBuilderPartSlotKind.EventName,
    valueLanguage: AppBuilderPartSlotValueLanguage.DomEventName,
    summary: 'DOM event name before an Aurelia event binding command.',
  },
  {
    slotKind: AppBuilderPartSlotKind.HandlerExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaFunctionExpression,
    summary: 'Aurelia event handler expression, usually a view-model method call.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ReferenceName,
    valueLanguage: AppBuilderPartSlotValueLanguage.Identifier,
    summary: 'View-model/member identifier that receives a ref capture.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ClassToken,
    valueLanguage: AppBuilderPartSlotValueLanguage.CssClassToken,
    summary: 'Single CSS class token before the `.class` command suffix.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CssProperty,
    valueLanguage: AppBuilderPartSlotValueLanguage.CssPropertyName,
    summary: 'CSS property name before the `.style` command suffix.',
  },
  {
    slotKind: AppBuilderPartSlotKind.AttributeName,
    valueLanguage: AppBuilderPartSlotValueLanguage.HtmlAttributeName,
    summary: 'HTML/SVG/custom attribute target before a binding command suffix.',
  },
  {
    slotKind: AppBuilderPartSlotKind.BindingCommandTargetName,
    valueLanguage: AppBuilderPartSlotValueLanguage.HtmlAttributeName,
    summary: 'Target property or attribute name before a binding-command suffix.',
  },
  {
    slotKind: AppBuilderPartSlotKind.StateStoreName,
    valueLanguage: AppBuilderPartSlotValueLanguage.StateStoreName,
    summary: 'Optional named @aurelia/state store selector that remains valid in `.state:NAME`, `.dispatch:NAME`, and `@fromState(...)` source.',
  },
  {
    slotKind: AppBuilderPartSlotKind.StateSelectorExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript selector callback passed to @aurelia/state APIs.',
  },
  {
    slotKind: AppBuilderPartSlotKind.LocalName,
    valueLanguage: AppBuilderPartSlotValueLanguage.Identifier,
    summary: 'Template-local variable or resource-local name.',
  },
  {
    slotKind: AppBuilderPartSlotKind.IterableExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaIterableValueExpression,
    summary: 'Aurelia expression used as the iterable value in an iterator header.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ValueDomainExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaIterableValueExpression,
    summary: 'Aurelia expression that supplies the option domain for choice controls.',
  },
  {
    slotKind: AppBuilderPartSlotKind.OptionValueExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression for an option/input value or model binding.',
  },
  {
    slotKind: AppBuilderPartSlotKind.OptionBindingKind,
    valueLanguage: AppBuilderPartSlotValueLanguage.ChoiceOptionBindingKind,
    summary: 'Choice option binding channel: native value semantics or Aurelia model identity semantics.',
  },
  {
    slotKind: AppBuilderPartSlotKind.OptionLabelExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression rendered as the visible label for each generated choice option.',
  },
  {
    slotKind: AppBuilderPartSlotKind.MatcherExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression that resolves to a checked/select equality matcher.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RadioGroupName,
    valueLanguage: AppBuilderPartSlotValueLanguage.HtmlAttributeValue,
    summary: 'Static name attribute shared by all generated radio inputs in one group.',
  },
  {
    slotKind: AppBuilderPartSlotKind.NativeRequired,
    valueLanguage: AppBuilderPartSlotValueLanguage.BooleanLiteral,
    summary: 'Static required attribute for native browser constraint validation; not an Aurelia validation-library rule.',
  },
  {
    slotKind: AppBuilderPartSlotKind.TextMinLength,
    valueLanguage: AppBuilderPartSlotValueLanguage.NumericLiteral,
    summary: 'Static minimum character count for native text-like controls.',
  },
  {
    slotKind: AppBuilderPartSlotKind.TextMaxLength,
    valueLanguage: AppBuilderPartSlotValueLanguage.NumericLiteral,
    summary: 'Static maximum character count for native text-like controls.',
  },
  {
    slotKind: AppBuilderPartSlotKind.TextPattern,
    valueLanguage: AppBuilderPartSlotValueLanguage.HtmlAttributeValue,
    summary: 'Static native pattern attribute for field-local format constraints.',
  },
  {
    slotKind: AppBuilderPartSlotKind.NumericMinimum,
    valueLanguage: AppBuilderPartSlotValueLanguage.NumericLiteral,
    summary: 'Static minimum value for native number/range controls.',
  },
  {
    slotKind: AppBuilderPartSlotKind.NumericMaximum,
    valueLanguage: AppBuilderPartSlotValueLanguage.NumericLiteral,
    summary: 'Static maximum value for native number/range controls.',
  },
  {
    slotKind: AppBuilderPartSlotKind.NumericStep,
    valueLanguage: AppBuilderPartSlotValueLanguage.NumericLiteral,
    summary: 'Static step interval for native number/range controls.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteInstruction,
    valueLanguage: AppBuilderPartSlotValueLanguage.RouterNavigationInstruction,
    summary: 'Router string navigation instruction for href/load surfaces, including context-relative prefixes.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteParamsExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression lowered into a router load params binding.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteContextExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression lowered into a router load context binding.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteActiveExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression lowered into a router active-state binding.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteTargetAttributeName,
    valueLanguage: AppBuilderPartSlotValueLanguage.HtmlAttributeName,
    summary: 'Target attribute name used by the router load custom attribute.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ViewportName,
    valueLanguage: AppBuilderPartSlotValueLanguage.RouterViewportName,
    summary: 'Static router viewport name.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ViewportUsedBy,
    valueLanguage: AppBuilderPartSlotValueLanguage.RouterComponentFilter,
    summary: 'Static routeable-component filter for a router viewport.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ViewportDefault,
    valueLanguage: AppBuilderPartSlotValueLanguage.RouterRouteExpression,
    summary: 'Static router default instruction for a viewport.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ViewportFallback,
    valueLanguage: AppBuilderPartSlotValueLanguage.RouterRouteExpression,
    summary: 'Static router fallback instruction for a viewport.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CompositionComponentExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression lowered as the `au-compose` component bindable.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CompositionTemplateExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression lowered as the `au-compose` template bindable.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CompositionModelExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression lowered as the `au-compose` model bindable.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CompositionScopeBehavior,
    valueLanguage: AppBuilderPartSlotValueLanguage.AuComposeScopeBehavior,
    summary: 'Static `au-compose` scope-behavior literal accepted by the framework setter.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CompositionTagName,
    valueLanguage: AppBuilderPartSlotValueLanguage.HtmlTagName,
    summary: 'Static host tag literal used by `au-compose` template-only composition.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CompositionFlushMode,
    valueLanguage: AppBuilderPartSlotValueLanguage.AuComposeFlushMode,
    summary: 'Static `au-compose` flush-mode literal accepted by the framework setter.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ProjectionSlotName,
    valueLanguage: AppBuilderPartSlotValueLanguage.ProjectionSlotName,
    summary: 'Static projection slot name used by `au-slot name`.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ValidationErrorsExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression that receives validation-html exposed errors.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ValidationControllerExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia expression that supplies a validation-html controller.',
  },
  {
    slotKind: AppBuilderPartSlotKind.BindingBehaviorArguments,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaExpressionArgumentList,
    summary: 'Raw Aurelia binding-behavior argument tail after the behavior name.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ValueConverterArguments,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaExpressionArgumentList,
    summary: 'Raw Aurelia value-converter argument tail after the converter name.',
  },
  {
    slotKind: AppBuilderPartSlotKind.TranslationKeyExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.I18nTranslationKey,
    summary: 'i18n translation key or keyed target expression accepted by the i18n commands.',
  },
  {
    slotKind: AppBuilderPartSlotKind.TranslationParametersExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.AureliaBindingExpression,
    summary: 'Aurelia object expression passed to i18n translation parameters.',
  },
  {
    slotKind: AppBuilderPartSlotKind.PortalTarget,
    valueLanguage: AppBuilderPartSlotValueLanguage.PortalTarget,
    summary: 'Portal target selector or portal target expression.',
  },
  {
    slotKind: AppBuilderPartSlotKind.PortalPosition,
    valueLanguage: AppBuilderPartSlotValueLanguage.PortalInsertPosition,
    summary: 'Portal DOM insertion position literal.',
  },
  {
    slotKind: AppBuilderPartSlotKind.PortalRenderContext,
    valueLanguage: AppBuilderPartSlotValueLanguage.PortalTarget,
    summary: 'Portal render-context selector or expression used when resolving a target selector.',
  },
  {
    slotKind: AppBuilderPartSlotKind.PortalStrict,
    valueLanguage: AppBuilderPartSlotValueLanguage.BooleanLiteral,
    summary: 'Static portal strict flag literal.',
  },
  {
    slotKind: AppBuilderPartSlotKind.CustomElementResourceName,
    valueLanguage: AppBuilderPartSlotValueLanguage.ResourceName,
    summary: 'Custom-element resource name accepted by compiler special syntax.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ResourceName,
    valueLanguage: AppBuilderPartSlotValueLanguage.ResourceName,
    summary: 'Named Aurelia resource name used by explicit TypeScript resource-definition APIs.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ResourceTemplateExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript template expression inside custom-element definition metadata.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ResourceDependencyExpressionList,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpressionList,
    summary: 'TypeScript expression list inside a resource dependencies array.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ResourceTypeExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript class/type expression passed to an imperative resource definition call.',
  },
  {
    slotKind: AppBuilderPartSlotKind.AttributePatternDefinitionExpressionList,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpressionList,
    summary: 'TypeScript object expression list inside an AttributePattern.create pattern array.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteConfigurationExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript object expression passed to the router @route decorator.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteContextReceiverExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript expression that already resolves to an IRouteContext receiver; omit this slot to lower `resolve(IRouteContext)` with imports.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteParameterType,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptType,
    summary: 'TypeScript object type argument that describes route and query parameters returned by getRouteParameters.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteParameterMergeStrategy,
    valueLanguage: AppBuilderPartSlotValueLanguage.RouteContextParameterMergeStrategy,
    summary: 'RouteContext parameter merge strategy passed as a type argument and options field.',
  },
  {
    slotKind: AppBuilderPartSlotKind.RouteIncludeQueryParams,
    valueLanguage: AppBuilderPartSlotValueLanguage.BooleanLiteral,
    summary: 'Static includeQueryParams option passed to RouteContext.getRouteParameters.',
  },
  {
    slotKind: AppBuilderPartSlotKind.ComputedDecoratorArgumentExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript argument expression passed to the computed decorator.',
  },
  {
    slotKind: AppBuilderPartSlotKind.AppTaskSlotName,
    valueLanguage: AppBuilderPartSlotValueLanguage.AppTaskSlotName,
    summary: 'Aurelia AppTask lifecycle slot name.',
  },
  {
    slotKind: AppBuilderPartSlotKind.AppTaskKeyExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript DI key expression passed to keyed AppTask registration.',
  },
  {
    slotKind: AppBuilderPartSlotKind.AppTaskCallbackExpression,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptExpression,
    summary: 'TypeScript callback expression passed to AppTask registration.',
  },
  {
    slotKind: AppBuilderPartSlotKind.TypeScriptMethodBodyStatements,
    valueLanguage: AppBuilderPartSlotValueLanguage.TypeScriptStatements,
    summary: 'TypeScript statements inserted into a generated class method body.',
  },
];

/** Look up the source-lowering slot descriptor for a slot kind. */
export function appBuilderPartSlotDescriptor(slotKind: AppBuilderPartSlotKind): AppBuilderPartSlotDescriptor {
  const descriptor = APP_BUILDER_PART_SLOT_DESCRIPTORS.find((candidate) => candidate.slotKind === slotKind);
  if (descriptor == null) {
    throw new Error(`Unknown app-builder part slot '${slotKind}'.`);
  }
  return descriptor;
}

/** Check that every public source-lowering slot has exactly one value-language descriptor. */
export function appBuilderPartSlotCatalogIssues(): readonly AppBuilderPartSlotCatalogIssue[] {
  const issues: AppBuilderPartSlotCatalogIssue[] = [];
  const publicSlots = new Set(APP_BUILDER_PART_SLOT_KINDS);
  const descriptorCountBySlot = new Map<AppBuilderPartSlotKind, number>();
  for (const descriptor of APP_BUILDER_PART_SLOT_DESCRIPTORS) {
    descriptorCountBySlot.set(descriptor.slotKind, (descriptorCountBySlot.get(descriptor.slotKind) ?? 0) + 1);
    if (!publicSlots.has(descriptor.slotKind)) {
      issues.push({
        issueKind: AppBuilderPartSlotCatalogIssueKind.UnknownSlotKind,
        slotKind: descriptor.slotKind,
      });
    }
  }
  for (const slotKind of APP_BUILDER_PART_SLOT_KINDS) {
    const count = descriptorCountBySlot.get(slotKind) ?? 0;
    if (count === 0) {
      issues.push({
        issueKind: AppBuilderPartSlotCatalogIssueKind.MissingDescriptor,
        slotKind,
      });
    } else if (count > 1) {
      issues.push({
        issueKind: AppBuilderPartSlotCatalogIssueKind.DuplicateDescriptor,
        slotKind,
      });
    }
  }
  return issues;
}
