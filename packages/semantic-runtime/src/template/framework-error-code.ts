import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia template-compiler error-code labels that semantic-runtime can cite
 * when its compiler emulation reaches the same framework failure boundary.
 */
export const TemplateCompilerFrameworkErrorCode = {
  /** `template-compiler ErrorNames.attribute_pattern_duplicate`; an AttributeParser registration tried to reuse an already registered attribute-pattern string. */
  AttributePatternDuplicate: frameworkErrorCode('template-compiler', 'ErrorNames', 'attribute_pattern_duplicate', 'AUR0089'),
  /** `template-compiler ErrorNames.binding_command_existed`; binding-command registration found an existing command key and dev-mode warned. */
  BindingCommandExisted: frameworkErrorCode('template-compiler', 'ErrorNames', 'binding_command_existed', 'AUR0157'),
  /** `template-compiler ErrorNames.compiler_root_is_local`; the root template itself was marked as a local custom element. */
  CompilerRootIsLocal: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_root_is_local', 'AUR0701'),
  /** `template-compiler ErrorNames.compiler_invalid_surrogate_attr`; a root template surrogate used an attribute that cannot be applied to the host surrogate. */
  CompilerInvalidSurrogateAttribute: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_invalid_surrogate_attr', 'AUR0702'),
  /** `template-compiler ErrorNames.compiler_no_tc_on_surrogate`; a root template surrogate used a template controller. */
  CompilerNoTemplateControllerOnSurrogate: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_no_tc_on_surrogate', 'AUR0703'),
  /** `template-compiler ErrorNames.compiler_invalid_let_command`; a <let> attribute used a command other than `.bind`. */
  CompilerInvalidLetCommand: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_invalid_let_command', 'AUR0704'),
  /** `template-compiler ErrorNames.compiler_au_slot_on_non_element`; an au-slot projection was authored under a non custom element. */
  CompilerAuSlotOnNonElement: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_au_slot_on_non_element', 'AUR0706'),
  /** `template-compiler ErrorNames.compiler_binding_to_non_bindable`; an inline custom-attribute binding segment targeted a non-bindable property. */
  CompilerBindingToNonBindable: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_binding_to_non_bindable', 'AUR0707'),
  /** `template-compiler ErrorNames.compiler_template_only_local_template`; a custom-element template only contained local element templates. */
  CompilerTemplateOnlyLocalTemplate: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_template_only_local_template', 'AUR0708'),
  /** `template-compiler ErrorNames.compiler_local_el_not_under_root`; a local element template was not a direct root child. */
  CompilerLocalElementNotUnderRoot: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_local_el_not_under_root', 'AUR0709'),
  /** `template-compiler ErrorNames.compiler_local_el_bindable_not_under_root`; a local element bindable was not directly under that local template. */
  CompilerLocalElementBindableNotUnderRoot: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_local_el_bindable_not_under_root', 'AUR0710'),
  /** `template-compiler ErrorNames.compiler_local_el_bindable_name_missing`; a local element bindable omitted its required name. */
  CompilerLocalElementBindableNameMissing: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_local_el_bindable_name_missing', 'AUR0711'),
  /** `template-compiler ErrorNames.compiler_local_el_bindable_duplicate`; local element bindable property/attribute names were duplicated. */
  CompilerLocalElementBindableDuplicate: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_local_el_bindable_duplicate', 'AUR0712'),
  /** `template-compiler ErrorNames.compiler_local_name_empty`; a local element template used an empty as-custom-element name. */
  CompilerLocalNameEmpty: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_local_name_empty', 'AUR0715'),
  /** `template-compiler ErrorNames.compiler_duplicate_local_name`; two local element templates used the same name. */
  CompilerDuplicateLocalName: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_duplicate_local_name', 'AUR0716'),
  /** `template-compiler ErrorNames.compiler_slot_without_shadowdom`; a <slot> element was authored in a component without shadow DOM. */
  CompilerSlotWithoutShadowDom: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_slot_without_shadowdom', 'AUR0717'),
  /** `template-compiler ErrorNames.compiler_no_reserved_spread_syntax`; reserved spread syntax was used where the compiler cannot spread bindables. */
  CompilerNoReservedSpreadSyntax: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_no_reserved_spread_syntax', 'AUR0720'),
  /** `template-compiler ErrorNames.compiler_no_reserved_$bindable`; `$bindables` was used outside a custom-element bindable-spread context. */
  CompilerNoReservedBindableSyntax: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_no_reserved_$bindable', 'AUR0721'),
  /** `template-compiler ErrorNames.compiler_invalid_class_binding_syntax`; comma-separated class binding produced no class tokens. */
  CompilerInvalidClassBindingSyntax: frameworkErrorCode('template-compiler', 'ErrorNames', 'compiler_invalid_class_binding_syntax', 'AUR0723'),
  /** `template-compiler ErrorNames.no_spread_template_controller`; compileSpread rejected a captured template controller. */
  NoSpreadTemplateController: frameworkErrorCode('template-compiler', 'ErrorNames', 'no_spread_template_controller', 'AUR9998'),
} as const;

export type TemplateCompilerFrameworkErrorCode =
  typeof TemplateCompilerFrameworkErrorCode[keyof typeof TemplateCompilerFrameworkErrorCode];

/**
 * Runtime-html controller/template-controller error-code labels that semantic-runtime can cite
 * when controller/scope emulation reaches the same framework failure boundary.
 */
export const RuntimeHtmlControllerFrameworkErrorCode = {
  /** `runtime-html ErrorNames.element_res_not_found`; CustomElementRenderer could not resolve a named custom element resource. */
  ElementResourceNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'element_res_not_found', 'AUR0752'),
  /** `runtime-html ErrorNames.attribute_res_not_found`; CustomAttributeRenderer could not resolve a named custom attribute resource. */
  AttributeResourceNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'attribute_res_not_found', 'AUR0753'),
  /** `runtime-html ErrorNames.attribute_tc_res_not_found`; TemplateControllerRenderer could not resolve a named template-controller resource. */
  AttributeTemplateControllerResourceNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'attribute_tc_res_not_found', 'AUR0754'),
  /** `runtime-html ErrorNames.view_factory_provider_not_ready`; a resource view model resolved IViewFactory outside a prepared template-controller provider. */
  ViewFactoryProviderNotReady: frameworkErrorCode('runtime-html', 'ErrorNames', 'view_factory_provider_not_ready', 'AUR0755'),
  /** `runtime-html ErrorNames.controller_property_not_coercible`; bindable observer setup could not install a coercer. */
  ControllerPropertyNotCoercible: frameworkErrorCode('runtime-html', 'ErrorNames', 'controller_property_not_coercible', 'AUR0507'),
  /** `runtime-html ErrorNames.controller_property_no_change_handler`; bindable observer setup could not install a change callback. */
  ControllerPropertyNoChangeHandler: frameworkErrorCode('runtime-html', 'ErrorNames', 'controller_property_no_change_handler', 'AUR0508'),
  /** `runtime-html ErrorNames.repeat_invalid_key_binding_command`; Repeat rejected an unsupported command on the `key` option. */
  RepeatInvalidKeyBindingCommand: frameworkErrorCode('runtime-html', 'ErrorNames', 'repeat_invalid_key_binding_command', 'AUR0775'),
  /** `runtime-html ErrorNames.repeat_extraneous_binding`; Repeat received an unsupported iterator option target. */
  RepeatExtraneousBinding: frameworkErrorCode('runtime-html', 'ErrorNames', 'repeat_extraneous_binding', 'AUR0776'),
  /** `runtime-html ErrorNames.repeat_non_iterable`; RepeatableHandlerResolver fell through to the unknown handler. */
  RepeatNonIterable: frameworkErrorCode('runtime-html', 'ErrorNames', 'repeat_non_iterable', 'AUR0777'),
  /** `runtime-html ErrorNames.repeat_invalid_contextual_binding_command`; Repeat rejected an unsupported command on `contextual`. */
  RepeatInvalidContextualBindingCommand: frameworkErrorCode('runtime-html', 'ErrorNames', 'repeat_invalid_contextual_binding_command', 'AUR0821'),
  /** `runtime-html ErrorNames.portal_invalid_insert_position`; Portal received an unsupported InsertPosition. */
  PortalInvalidInsertPosition: frameworkErrorCode('runtime-html', 'ErrorNames', 'portal_invalid_insert_position', 'AUR0779'),
  /** `runtime-html ErrorNames.portal_query_empty`; strict Portal target resolution received an empty selector. */
  PortalQueryEmpty: frameworkErrorCode('runtime-html', 'ErrorNames', 'portal_query_empty', 'AUR0811'),
  /** `runtime-html ErrorNames.portal_no_target`; strict Portal target resolution produced no target. */
  PortalNoTarget: frameworkErrorCode('runtime-html', 'ErrorNames', 'portal_no_target', 'AUR0812'),
  /** `runtime-html ErrorNames.promise_invalid_usage`; pending/then/catch link could not find its parent promise. */
  PromiseInvalidUsage: frameworkErrorCode('runtime-html', 'ErrorNames', 'promise_invalid_usage', 'AUR0813'),
  /** `runtime-html ErrorNames.au_compose_invalid_scope_behavior`; AuCompose scopeBehavior setter rejected the value. */
  AuComposeInvalidScopeBehavior: frameworkErrorCode('runtime-html', 'ErrorNames', 'au_compose_invalid_scope_behavior', 'AUR0805'),
  /** `runtime-html ErrorNames.au_compose_component_name_not_found`; AuCompose could not resolve a string component name. */
  AuComposeComponentNameNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'au_compose_component_name_not_found', 'AUR0806'),
  /** `runtime-html ErrorNames.au_compose_invalid_flush_mode`; AuCompose flushMode setter rejected the value. */
  AuComposeInvalidFlushMode: frameworkErrorCode('runtime-html', 'ErrorNames', 'au_compose_invalid_flush_mode', 'AUR0809'),
  /** `runtime-html ErrorNames.else_without_if`; Else link did not find a preceding If sibling. */
  ElseWithoutIf: frameworkErrorCode('runtime-html', 'ErrorNames', 'else_without_if', 'AUR0810'),
  /** `runtime-html ErrorNames.switch_invalid_usage`; case/default-case link could not find its parent switch. */
  SwitchInvalidUsage: frameworkErrorCode('runtime-html', 'ErrorNames', 'switch_invalid_usage', 'AUR0815'),
  /** `runtime-html ErrorNames.switch_no_multiple_default`; a switch received more than one default-case. */
  SwitchNoMultipleDefault: frameworkErrorCode('runtime-html', 'ErrorNames', 'switch_no_multiple_default', 'AUR0816'),
} as const;

export type RuntimeHtmlControllerFrameworkErrorCode =
  typeof RuntimeHtmlControllerFrameworkErrorCode[keyof typeof RuntimeHtmlControllerFrameworkErrorCode];

/**
 * Runtime-html renderer error-code labels that semantic-runtime can cite
 * when renderer dispatch reaches the same framework failure boundary.
 */
export const RuntimeHtmlRendererFrameworkErrorCode = {
  /** `runtime-html ErrorNames.not_supported_view_ref_api`; RefBindingRenderer received `view.ref`, which runtime-html does not expose. */
  NotSupportedViewRefApi: frameworkErrorCode('runtime-html', 'ErrorNames', 'not_supported_view_ref_api', 'AUR0750'),
  /** `runtime-html ErrorNames.ref_not_found`; RefBindingRenderer could not find a named custom attribute or custom element ref target. */
  RefNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'ref_not_found', 'AUR0751'),
  /** `runtime-html ErrorNames.node_is_not_a_host`; RefBindingRenderer asked for a controller/component ref on a non custom-element host. */
  NodeIsNotHost: frameworkErrorCode('runtime-html', 'ErrorNames', 'node_is_not_a_host', 'AUR0762'),
  /** `runtime-html ErrorNames.node_is_not_a_host2`; named RefBindingRenderer fallback asked for a custom-element controller on a non custom-element host. */
  NodeIsNotHost2: frameworkErrorCode('runtime-html', 'ErrorNames', 'node_is_not_a_host2', 'AUR0763'),
  /** `runtime-html ErrorNames.spreading_invalid_target`; SpreadValueRenderer received a target other than `$bindables`. */
  SpreadingInvalidTarget: frameworkErrorCode('runtime-html', 'ErrorNames', 'spreading_invalid_target', 'AUR0820'),
} as const;

export type RuntimeHtmlRendererFrameworkErrorCode =
  typeof RuntimeHtmlRendererFrameworkErrorCode[keyof typeof RuntimeHtmlRendererFrameworkErrorCode];

/**
 * Runtime-html binding error-code labels that semantic-runtime can cite
 * when runtime binding emulation reaches the same framework failure boundary.
 */
export const RuntimeHtmlBindingFrameworkErrorCode = {
  /** `runtime-html ErrorNames.no_spread_scope_context_found`; SpreadBinding could not find the parent hydration/scope context for captured attributes. */
  NoSpreadScopeContextFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'no_spread_scope_context_found', 'AUR9999'),
  /** `runtime-html ErrorNames.no_spread_template_controller`; SpreadBinding was asked to admit a template-controller child. */
  NoSpreadTemplateController: frameworkErrorCode('runtime-html', 'ErrorNames', 'no_spread_template_controller', 'AUR9998'),
} as const;

export type RuntimeHtmlBindingFrameworkErrorCode =
  typeof RuntimeHtmlBindingFrameworkErrorCode[keyof typeof RuntimeHtmlBindingFrameworkErrorCode];

/**
 * Runtime-html binding-behavior error-code labels that semantic-runtime can cite
 * when bind-time behavior application reaches the same framework failure boundary.
 */
export const RuntimeHtmlBindingBehaviorFrameworkErrorCode = {
  /** `runtime-html ErrorNames.self_behavior_invalid_usage`; self was applied to a non-listener binding. */
  SelfBehaviorInvalidUsage: frameworkErrorCode('runtime-html', 'ErrorNames', 'self_behavior_invalid_usage', 'AUR0801'),
  /** `runtime-html ErrorNames.update_trigger_behavior_no_triggers`; updateTrigger was applied without event arguments. */
  UpdateTriggerNoTriggers: frameworkErrorCode('runtime-html', 'ErrorNames', 'update_trigger_behavior_no_triggers', 'AUR0802'),
  /** `runtime-html ErrorNames.update_trigger_invalid_usage`; updateTrigger was applied to a binding without from-view flow. */
  UpdateTriggerInvalidUsage: frameworkErrorCode('runtime-html', 'ErrorNames', 'update_trigger_invalid_usage', 'AUR0803'),
  /** `runtime-html ErrorNames.signal_behavior_invalid_usage`; signal was applied to a binding without handleChange. */
  SignalBehaviorInvalidUsage: frameworkErrorCode('runtime-html', 'ErrorNames', 'signal_behavior_invalid_usage', 'AUR0817'),
  /** `runtime-html ErrorNames.signal_behavior_no_signals`; signal was applied without signal names. */
  SignalBehaviorNoSignals: frameworkErrorCode('runtime-html', 'ErrorNames', 'signal_behavior_no_signals', 'AUR0818'),
  /** `runtime-html ErrorNames.update_trigger_behavior_node_property_not_observable`; no NodeObserverLocator event config exists for the target property. */
  UpdateTriggerNodePropertyNotObservable: frameworkErrorCode('runtime-html', 'ErrorNames', 'update_trigger_behavior_node_property_not_observable', 'AUR9992'),
  /** `runtime-html ErrorNames.attr_behavior_invalid_binding`; attr was applied to a non-property binding. */
  AttrBehaviorInvalidBinding: frameworkErrorCode('runtime-html', 'ErrorNames', 'attr_behavior_invalid_binding', 'AUR9994'),
  /** `runtime-html ErrorNames.binding_already_has_rate_limited`; throttle/debounce tried to rate-limit the same binding twice. */
  BindingAlreadyHasRateLimited: frameworkErrorCode('runtime-html', 'ErrorNames', 'binding_already_has_rate_limited', 'AUR9996'),
  /** `runtime-html ErrorNames.binding_already_has_target_subscriber`; more than one bind-time path provided a PropertyBinding target subscriber. */
  BindingAlreadyHasTargetSubscriber: frameworkErrorCode('runtime-html', 'ErrorNames', 'binding_already_has_target_subscriber', 'AUR9995'),
} as const;

export type RuntimeHtmlBindingBehaviorFrameworkErrorCode =
  typeof RuntimeHtmlBindingBehaviorFrameworkErrorCode[keyof typeof RuntimeHtmlBindingBehaviorFrameworkErrorCode];

/**
 * Validation-html binding-behavior/controller error-code labels that semantic-runtime can cite
 * when validation binding semantics reaches the same framework failure boundary.
 */
export const ValidationHtmlBindingBehaviorFrameworkErrorCode = {
  /** `validation-html ErrorNames.validate_binding_behavior_on_invalid_binding_type`; validate was applied to a non-PropertyBinding. */
  ValidateBindingBehaviorOnInvalidBindingType: frameworkErrorCode('validation-html', 'ErrorNames', 'validate_binding_behavior_on_invalid_binding_type', 'AUR4200'),
  /** `validation-html ErrorNames.validate_binding_behavior_extraneous_args`; validate received more than trigger/controller/rules arguments. */
  ValidateBindingBehaviorExtraneousArgs: frameworkErrorCode('validation-html', 'ErrorNames', 'validate_binding_behavior_extraneous_args', 'AUR4201'),
  /** `validation-html ErrorNames.validate_binding_behavior_invalid_trigger_name`; validate trigger argument was not a ValidationTrigger. */
  ValidateBindingBehaviorInvalidTriggerName: frameworkErrorCode('validation-html', 'ErrorNames', 'validate_binding_behavior_invalid_trigger_name', 'AUR4202'),
  /** `validation-html ErrorNames.validate_binding_behavior_invalid_controller`; validate controller argument was non-null and not a ValidationController. */
  ValidateBindingBehaviorInvalidController: frameworkErrorCode('validation-html', 'ErrorNames', 'validate_binding_behavior_invalid_controller', 'AUR4203'),
  /** `validation-html ErrorNames.validate_binding_behavior_invalid_binding_target`; validate target was neither a Node nor a custom-element view model. */
  ValidateBindingBehaviorInvalidBindingTarget: frameworkErrorCode('validation-html', 'ErrorNames', 'validate_binding_behavior_invalid_binding_target', 'AUR4204'),
  /** `validation-html ErrorNames.validation_controller_unknown_expression`; validation property path parsing met an unsupported expression kind. */
  ValidationControllerUnknownExpression: frameworkErrorCode('validation-html', 'ErrorNames', 'validation_controller_unknown_expression', 'AUR4205'),
} as const;

export type ValidationHtmlBindingBehaviorFrameworkErrorCode =
  typeof ValidationHtmlBindingBehaviorFrameworkErrorCode[keyof typeof ValidationHtmlBindingBehaviorFrameworkErrorCode];

/**
 * Runtime-html value-converter error-code labels that semantic-runtime can cite
 * when converter invocation reaches the same framework failure boundary.
 */
export const RuntimeHtmlValueConverterFrameworkErrorCode = {
  /** `runtime-html ErrorNames.method_not_implemented`; the default ISanitizer implementation was invoked by sanitize. */
  SanitizerMethodNotImplemented: frameworkErrorCode('runtime-html', 'ErrorNames', 'method_not_implemented', 'AUR0099'),
} as const;

export type RuntimeHtmlValueConverterFrameworkErrorCode =
  typeof RuntimeHtmlValueConverterFrameworkErrorCode[keyof typeof RuntimeHtmlValueConverterFrameworkErrorCode];
