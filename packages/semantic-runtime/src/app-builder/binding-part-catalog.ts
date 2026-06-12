import { RuntimeBindingValueChannelKind } from '../observation/runtime-binding-observation.js';
import { BuiltInBindingCommandName, BuiltInSyntaxPackage } from '../template/built-in-syntax.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
  AppBuilderPartValueChannelResolutionKind,
} from './part-application.js';
import {
  appBuilderBuiltInBindingCommandRef,
  type AppBuilderBuiltInBindingCommandRef,
} from './part-syntax.js';

/** Non-control binding parts and the Aurelia value-channels they realize. */

/** Category of a non-control binding part. */
export enum AppBuilderBindingPartKind {
  /** Render a value into text content. */
  ValueDisplay = 'value-display',
  /** Invoke a handler on a DOM event. */
  EventListener = 'event-listener',
  /** Capture a rendered element/view-model into a reference. */
  ElementReference = 'element-reference',
  /** Drive element class tokens from a value. */
  ClassBinding = 'class-binding',
  /** Drive element inline styles from a value. */
  StyleBinding = 'style-binding',
  /** Drive a generic element attribute from a value. */
  AttributeBinding = 'attribute-binding',
  /** Declare a template-local scope variable. */
  LocalScope = 'local-scope',
  /** Supply an option/input value as an object model. */
  ModelValue = 'model-value',
  /** Supply a custom equality function for checked/select matching. */
  CustomMatcher = 'custom-matcher',
  /** Read from a configured @aurelia/state store into a target property. */
  StateBinding = 'state-binding',
  /** Dispatch a state action on a DOM event. */
  StateDispatch = 'state-dispatch',
  /** Localize text or attributes through i18n translation binding syntax. */
  TranslationBinding = 'translation-binding',
}

/** Stable identity of a non-control binding part. */
export enum AppBuilderBindingPartId {
  /** `${expr}` text interpolation. */
  TextInterpolation = 'text-interpolation',
  /** `event.trigger` DOM event listener. */
  EventListener = 'event-listener',
  /** `event.capture` DOM event listener during capture phase. */
  EventCaptureListener = 'event-capture-listener',
  /** `ref` / `target.ref` element or view-model reference capture. */
  ElementRef = 'element-ref',
  /** `class.bind` whole-class-list binding. */
  ClassListBinding = 'class-list-binding',
  /** `token.class` single-class toggle. */
  ClassTokenToggle = 'class-token-toggle',
  /** `style.bind` whole-style binding. */
  StyleRulesBinding = 'style-rules-binding',
  /** `property.style` single-style-property binding. */
  StylePropertyBinding = 'style-property-binding',
  /** `attribute.bind` generic attribute binding. */
  AttributeBinding = 'attribute-binding',
  /** `attribute.to-view` read-only generic attribute binding. */
  AttributeToViewBinding = 'attribute-to-view-binding',
  /** `<let x.bind>` template-local scope variable. */
  LetBinding = 'let-binding',
  /** `model.bind` object value for an option/input. */
  ElementModelValue = 'element-model-value',
  /** `matcher.bind` custom equality function. */
  CustomMatcher = 'custom-matcher',
  /** `target.state` store-state binding. */
  StateBinding = 'state-binding',
  /** `event.dispatch` state action dispatch. */
  StateDispatch = 'state-dispatch',
  /** Static `t` translation binding. */
  Translation = 'translation',
  /** Dynamic `t.bind` translation binding. */
  DynamicTranslation = 'dynamic-translation',
  /** `t-params.bind` translation-parameter binding. */
  TranslationParameters = 'translation-parameters',
}

/** One neutral non-control binding part: the template target it connects and the value-channel it realizes. */
export interface AppBuilderBindingPartDescriptor {
  readonly id: AppBuilderBindingPartId;
  readonly kind: AppBuilderBindingPartKind;
  readonly title: string;
  readonly summary: string;
  /** Template target this part connects to. */
  readonly target: string;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Built-in binding-command handler that owns this syntax, when the part lowers through one. */
  readonly syntax?: AppBuilderBuiltInBindingCommandRef;
  /** Source locus families where this part can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-lowering operation family for this binding part. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this part can lower to template source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this part may accept for richer lowering. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  /** How this part's value-channel list closes against runtime observer semantics. */
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  /** Realized or candidate Aurelia value-channel families grounded in the observation read model. */
  readonly valueChannels: readonly RuntimeBindingValueChannelKind[];
}

/** Candidate value channels selected after generic binding-command targets pass through ObserverLocator semantics. */
export const APP_BUILDER_TARGET_OBSERVER_VALUE_CHANNELS: readonly RuntimeBindingValueChannelKind[] = [
  RuntimeBindingValueChannelKind.RawProperty,
  RuntimeBindingValueChannelKind.AttributeValue,
  RuntimeBindingValueChannelKind.ClassAttributeTokens,
  RuntimeBindingValueChannelKind.StyleAttributeRules,
  RuntimeBindingValueChannelKind.CheckedBoolean,
  RuntimeBindingValueChannelKind.CheckedRadioValue,
  RuntimeBindingValueChannelKind.CheckedCollectionMembership,
  RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean,
  RuntimeBindingValueChannelKind.CheckedDynamicModelValue,
  RuntimeBindingValueChannelKind.CheckedModel,
  RuntimeBindingValueChannelKind.SelectSingleOptionValue,
  RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
  RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
  RuntimeBindingValueChannelKind.ElementModelValue,
  RuntimeBindingValueChannelKind.CustomMatcherFunction,
];

export const APP_BUILDER_BINDING_PARTS: readonly AppBuilderBindingPartDescriptor[] = [
  {
    id: AppBuilderBindingPartId.TextInterpolation,
    kind: AppBuilderBindingPartKind.ValueDisplay,
    title: 'Text Interpolation',
    summary: 'Render a view-model value into text content (to-view display).',
    target: 'text node',
    syntaxCue: '${EXPRESSION}',
    applicationSites: [AppBuilderPartApplicationSiteKind.TextInterpolation],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.TextContent],
  },
  {
    id: AppBuilderBindingPartId.EventListener,
    kind: AppBuilderBindingPartKind.EventListener,
    title: 'Event Listener',
    summary: 'Invoke a view-model handler on a DOM event.',
    target: 'element event',
    syntaxCue: 'EVENT.trigger',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Trigger),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.EventName,
      AppBuilderPartSlotKind.HandlerExpression,
    ],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.EventHandlerInvocation],
  },
  {
    id: AppBuilderBindingPartId.EventCaptureListener,
    kind: AppBuilderBindingPartKind.EventListener,
    title: 'Capture Event Listener',
    summary: 'Invoke a view-model handler during the DOM event capture phase.',
    target: 'element event',
    syntaxCue: 'EVENT.capture',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Capture),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.EventName,
      AppBuilderPartSlotKind.HandlerExpression,
    ],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.EventHandlerInvocation],
  },
  {
    id: AppBuilderBindingPartId.ElementRef,
    kind: AppBuilderBindingPartKind.ElementReference,
    title: 'Element Reference',
    summary: 'Capture a rendered element or view-model into a view-model reference for direct access.',
    target: 'element',
    syntaxCue: 'ref / TARGET.ref',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Ref),
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.ReferenceName],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RefTarget],
  },
  {
    id: AppBuilderBindingPartId.ClassListBinding,
    kind: AppBuilderBindingPartKind.ClassBinding,
    title: 'Class List Binding',
    summary: 'Drive the full element class list from a string or object value.',
    target: 'class attribute',
    syntaxCue: 'class.bind',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.ClassAttributeTokens],
  },
  {
    id: AppBuilderBindingPartId.ClassTokenToggle,
    kind: AppBuilderBindingPartKind.ClassBinding,
    title: 'Class Token Toggle',
    summary: 'Toggle a single class token from a boolean value.',
    target: 'single class token',
    syntaxCue: 'TOKEN.class',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Class),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.ClassToken,
      AppBuilderPartSlotKind.BindingExpression,
    ],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.ClassToggle],
  },
  {
    id: AppBuilderBindingPartId.StyleRulesBinding,
    kind: AppBuilderBindingPartKind.StyleBinding,
    title: 'Style Rules Binding',
    summary: 'Drive the inline style attribute from a string or object value.',
    target: 'style attribute',
    syntaxCue: 'style.bind',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.StyleAttributeRules],
  },
  {
    id: AppBuilderBindingPartId.StylePropertyBinding,
    kind: AppBuilderBindingPartKind.StyleBinding,
    title: 'Style Property Binding',
    summary: 'Drive a single CSS property from a value.',
    target: 'single style property',
    syntaxCue: 'PROPERTY.style',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Style),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.CssProperty,
      AppBuilderPartSlotKind.BindingExpression,
    ],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.StylePropertyValue],
  },
  {
    id: AppBuilderBindingPartId.AttributeBinding,
    kind: AppBuilderBindingPartKind.AttributeBinding,
    title: 'Attribute Binding',
    summary: 'Drive a generic element attribute from a value.',
    target: 'element attribute',
    syntaxCue: 'ATTRIBUTE.bind',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.AttributeName,
      AppBuilderPartSlotKind.BindingExpression,
    ],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.TargetObserverResolved,
    valueChannels: APP_BUILDER_TARGET_OBSERVER_VALUE_CHANNELS,
  },
  {
    id: AppBuilderBindingPartId.AttributeToViewBinding,
    kind: AppBuilderBindingPartKind.AttributeBinding,
    title: 'Attribute To-View Binding',
    summary: 'Render a value into a generic element attribute without writing DOM changes back into the source.',
    target: 'element attribute',
    syntaxCue: 'ATTRIBUTE.to-view',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.ToView),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.AttributeName,
      AppBuilderPartSlotKind.BindingExpression,
    ],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.TargetObserverResolved,
    valueChannels: APP_BUILDER_TARGET_OBSERVER_VALUE_CHANNELS,
  },
  {
    id: AppBuilderBindingPartId.LetBinding,
    kind: AppBuilderBindingPartKind.LocalScope,
    title: 'Let Binding',
    summary: 'Declare a template-local scope variable from an expression.',
    target: 'let element',
    syntaxCue: '<let NAME.bind="EXPRESSION">',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.LocalName,
      AppBuilderPartSlotKind.BindingExpression,
    ],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.ScopeSlot],
  },
  {
    id: AppBuilderBindingPartId.ElementModelValue,
    kind: AppBuilderBindingPartKind.ModelValue,
    title: 'Element Model Value',
    summary: 'Supply an option/input value as an object model (for object-valued choice controls).',
    target: 'input / option',
    syntaxCue: 'model.bind',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.OptionValueExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.ElementModelValue],
  },
  {
    id: AppBuilderBindingPartId.CustomMatcher,
    kind: AppBuilderBindingPartKind.CustomMatcher,
    title: 'Custom Matcher',
    summary: 'Supply a custom equality function for checked/select value matching.',
    target: 'input / select',
    syntaxCue: 'matcher.bind',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.MatcherExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.CustomMatcherFunction],
  },
  {
    id: AppBuilderBindingPartId.StateBinding,
    kind: AppBuilderBindingPartKind.StateBinding,
    title: 'State Binding',
    summary: 'Read a configured @aurelia/state store expression into a target property.',
    target: 'element property',
    syntaxCue: 'TARGET.state',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.State, BuiltInBindingCommandName.State),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.BindingCommandTargetName,
      AppBuilderPartSlotKind.BindingExpression,
    ],
    optionalSlotKinds: [AppBuilderPartSlotKind.StateStoreName],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
  },
  {
    id: AppBuilderBindingPartId.StateDispatch,
    kind: AppBuilderBindingPartKind.StateDispatch,
    title: 'State Dispatch',
    summary: 'Dispatch a state action expression on a DOM event.',
    target: 'element event',
    syntaxCue: 'EVENT.dispatch',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.State, BuiltInBindingCommandName.Dispatch),
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingCommandTarget],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.EventName,
      AppBuilderPartSlotKind.BindingExpression,
    ],
    optionalSlotKinds: [AppBuilderPartSlotKind.StateStoreName],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.StateDispatchAction],
  },
  {
    id: AppBuilderBindingPartId.Translation,
    kind: AppBuilderBindingPartKind.TranslationBinding,
    title: 'Translation Binding',
    summary: 'Translate static i18n keys into element text or attribute targets through the `t` binding command.',
    target: 'element text or attribute',
    syntaxCue: 't="KEY"',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.I18n, BuiltInBindingCommandName.Translation),
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.TranslationKeyExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.TextContent],
  },
  {
    id: AppBuilderBindingPartId.DynamicTranslation,
    kind: AppBuilderBindingPartKind.TranslationBinding,
    title: 'Dynamic Translation Binding',
    summary: 'Translate a dynamic key expression through `t.bind` when the key comes from view-model state.',
    target: 'element text or attribute',
    syntaxCue: 't.bind="EXPRESSION"',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.I18n, BuiltInBindingCommandName.TranslationBind),
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.TextContent],
  },
  {
    id: AppBuilderBindingPartId.TranslationParameters,
    kind: AppBuilderBindingPartKind.TranslationBinding,
    title: 'Translation Parameters',
    summary: 'Supply interpolation parameters to the same element translation binding through `t-params.bind`.',
    target: 'translation binding parameters',
    syntaxCue: 't-params.bind="PARAMS"',
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.I18n, BuiltInBindingCommandName.TranslationParametersBind),
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyBindingPart,
    requiredSlotKinds: [AppBuilderPartSlotKind.TranslationParametersExpression],
    optionalSlotKinds: [],
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.TextContent],
  },
];

/** Look up a binding-part descriptor by id. */
export function appBuilderBindingPartDescriptor(id: AppBuilderBindingPartId): AppBuilderBindingPartDescriptor {
  const part = APP_BUILDER_BINDING_PARTS.find((candidate) => candidate.id === id);
  if (part == null) {
    throw new Error(`Unknown app-builder binding part '${id}'.`);
  }
  return part;
}
