import { frameworkErrorCode } from '../kernel/framework-error-code.js';

export const RuntimeObservationFrameworkErrorCode = {
  InvalidAstTrackDecoratorUsage: frameworkErrorCode(
    'runtime',
    'ErrorNames',
    'ast_track_decorator_not_a_method',
    'AUR0117',
  ),
  InvalidObservableDecoratorUsage: frameworkErrorCode(
    'runtime',
    'ErrorNames',
    'invalid_observable_decorator_usage',
    'AUR0224',
  ),
  StoppingStoppedEffect: frameworkErrorCode(
    'runtime',
    'ErrorNames',
    'stopping_a_stopped_effect',
    'AUR0225',
  ),
  AssignReadonlySize: frameworkErrorCode(
    'runtime',
    'ErrorNames',
    'assign_readonly_size',
    'AUR0220',
  ),
  AssignReadonlyComputedProperty: frameworkErrorCode(
    'runtime',
    'ErrorNames',
    'assign_readonly_readonly_property_from_computed',
    'AUR0221',
  ),
  ComputedNotGetter: frameworkErrorCode(
    'runtime',
    'ErrorNames',
    'computed_not_getter',
    'AUR0228',
  ),
} as const;

export type RuntimeObservationFrameworkErrorCode =
  typeof RuntimeObservationFrameworkErrorCode[keyof typeof RuntimeObservationFrameworkErrorCode];

export const RuntimeHtmlObservationFrameworkErrorCode = {
  NodeObserverStrategyNotFound: frameworkErrorCode(
    'runtime-html',
    'ErrorNames',
    'node_observer_strategy_not_found',
    'AUR0652',
  ),
  SelectObserverArrayOnNonMultiSelect: frameworkErrorCode(
    'runtime-html',
    'ErrorNames',
    'select_observer_array_on_non_multi_select',
    'AUR0654',
  ),
} as const;

export type RuntimeHtmlObservationFrameworkErrorCode =
  typeof RuntimeHtmlObservationFrameworkErrorCode[keyof typeof RuntimeHtmlObservationFrameworkErrorCode];

export type ObservationFrameworkErrorCode =
  | RuntimeObservationFrameworkErrorCode
  | RuntimeHtmlObservationFrameworkErrorCode;
