import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/** Exact Aurelia framework errors modeled by the evaluation/module-loader substrate. */
export const EvaluationFrameworkErrorCode = {
  /** `kernel ErrorNames.invalid_module_transform_input`; ModuleLoader received a rejected transform input. */
  InvalidModuleTransformInput: frameworkErrorCode('kernel', 'ErrorNames', 'invalid_module_transform_input', 'AUR0021'),
  /** `kernel ErrorNames.event_aggregator_publish_invalid_event_name`; EventAggregator.publish received a falsy channel/instance. */
  EventAggregatorPublishInvalidEventName: frameworkErrorCode('kernel', 'ErrorNames', 'event_aggregator_publish_invalid_event_name', 'AUR0018'),
  /** `kernel ErrorNames.event_aggregator_subscribe_invalid_event_name`; EventAggregator.subscribe received a falsy channel/type. */
  EventAggregatorSubscribeInvalidEventName: frameworkErrorCode('kernel', 'ErrorNames', 'event_aggregator_subscribe_invalid_event_name', 'AUR0019'),
  /** `kernel ErrorNames.first_defined_no_value`; firstDefined(...) received no non-undefined values. */
  FirstDefinedNoValue: frameworkErrorCode('kernel', 'ErrorNames', 'first_defined_no_value', 'AUR0020'),
} as const;

export type EvaluationFrameworkErrorCode =
  typeof EvaluationFrameworkErrorCode[keyof typeof EvaluationFrameworkErrorCode];
