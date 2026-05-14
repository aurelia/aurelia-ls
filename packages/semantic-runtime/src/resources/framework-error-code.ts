import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia runtime-html resource/controller error-code labels that resource
 * metadata convergence can cite when it models the same framework failure.
 */
export const ResourceFrameworkErrorCode = {
  /** `runtime-html ErrorNames.binding_behavior_def_not_found`; BindingBehavior.getDefinition could not find metadata/static $au. */
  BindingBehaviorDefinitionNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'binding_behavior_def_not_found', 'AUR0151'),
  /** `runtime-html ErrorNames.value_converter_def_not_found`; ValueConverter.getDefinition could not find metadata/static $au. */
  ValueConverterDefinitionNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'value_converter_def_not_found', 'AUR0152'),
  /** `runtime-html ErrorNames.attribute_def_not_found`; CustomAttribute.getDefinition could not find metadata/static $au. */
  AttributeDefinitionNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'attribute_def_not_found', 'AUR0759'),
  /** `runtime-html ErrorNames.element_def_not_found`; CustomElement.getDefinition could not find metadata/static $au. */
  ElementDefinitionNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'element_def_not_found', 'AUR0760'),
  /** `runtime-html ErrorNames.element_only_name`; CustomElementDefinition.create received only a string name and no type. */
  ElementOnlyName: frameworkErrorCode('runtime-html', 'ErrorNames', 'element_only_name', 'AUR0761'),
  /** `runtime-html ErrorNames.watch_null_config`; @watch received a nullish expression/config argument. */
  WatchNullConfig: frameworkErrorCode('runtime-html', 'ErrorNames', 'watch_null_config', 'AUR0772'),
  /** `runtime-html ErrorNames.watch_invalid_change_handler`; a class @watch callback is not callable or present on the prototype. */
  WatchInvalidChangeHandler: frameworkErrorCode('runtime-html', 'ErrorNames', 'watch_invalid_change_handler', 'AUR0773'),
  /** `runtime-html ErrorNames.watch_non_method_decorator_usage`; @watch decorated a static or non-method member. */
  WatchNonMethodDecoratorUsage: frameworkErrorCode('runtime-html', 'ErrorNames', 'watch_non_method_decorator_usage', 'AUR0774'),
  /** `runtime-html ErrorNames.invalid_bindable_decorator_usage_symbol`; @bindable targeted a symbol/non-string property name. */
  InvalidBindableDecoratorUsageSymbol: frameworkErrorCode('runtime-html', 'ErrorNames', 'invalid_bindable_decorator_usage_symbol', 'AUR0227'),
  /** `runtime-html ErrorNames.invalid_bindable_decorator_usage_class_without_configuration`; class @bindable received null config. */
  InvalidBindableDecoratorUsageClassWithoutConfiguration: frameworkErrorCode('runtime-html', 'ErrorNames', 'invalid_bindable_decorator_usage_class_without_configuration', 'AUR0228'),
  /** `runtime-html ErrorNames.invalid_bindable_decorator_usage_class_without_property_name_configuration`; class @bindable config lacks a property name. */
  InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration: frameworkErrorCode('runtime-html', 'ErrorNames', 'invalid_bindable_decorator_usage_class_without_property_name_configuration', 'AUR0229'),
  /** `runtime-html ErrorNames.invalid_process_content_hook`; @processContent did not resolve to a static function hook. */
  InvalidProcessContentHook: frameworkErrorCode('runtime-html', 'ErrorNames', 'invalid_process_content_hook', 'AUR0766'),
  /** `runtime-html ErrorNames.children_invalid_query`; @children received a query with whitespace or child-combinator syntax. */
  ChildrenInvalidQuery: frameworkErrorCode('runtime-html', 'ErrorNames', 'children_invalid_query', 'AUR9989'),
  /** `runtime-html ErrorNames.slotted_decorator_invalid_usage`; @slotted decorated a non-field target. */
  SlottedDecoratorInvalidUsage: frameworkErrorCode('runtime-html', 'ErrorNames', 'slotted_decorator_invalid_usage', 'AUR9990'),
  /** `runtime-html ErrorNames.controller_no_shadow_on_containerless`; containerless custom element also requests shadow DOM or slots. */
  ControllerNoShadowOnContainerless: frameworkErrorCode('runtime-html', 'ErrorNames', 'controller_no_shadow_on_containerless', 'AUR0501'),
  /** `runtime-html ErrorNames.controller_watch_invalid_callback`; controller watcher hydration could not resolve a callable callback. */
  ControllerWatchInvalidCallback: frameworkErrorCode('runtime-html', 'ErrorNames', 'controller_watch_invalid_callback', 'AUR0506'),
  /** `runtime-html ErrorNames.element_existed`; a custom element definition is registered into a container that already has the element key. */
  ElementExisted: frameworkErrorCode('runtime-html', 'ErrorNames', 'element_existed', 'AUR0153'),
  /** `runtime-html ErrorNames.attribute_existed`; a custom attribute/template-controller definition is registered into a container that already has the attribute key. */
  AttributeExisted: frameworkErrorCode('runtime-html', 'ErrorNames', 'attribute_existed', 'AUR0154'),
  /** `runtime-html ErrorNames.value_converter_existed`; a value-converter definition is registered into a container that already has the converter key. */
  ValueConverterExisted: frameworkErrorCode('runtime-html', 'ErrorNames', 'value_converter_existed', 'AUR0155'),
  /** `runtime-html ErrorNames.binding_behavior_existed`; a binding-behavior definition is registered into a container that already has the behavior key. */
  BindingBehaviorExisted: frameworkErrorCode('runtime-html', 'ErrorNames', 'binding_behavior_existed', 'AUR0156'),
} as const;

export type ResourceFrameworkErrorCode =
  typeof ResourceFrameworkErrorCode[keyof typeof ResourceFrameworkErrorCode];
