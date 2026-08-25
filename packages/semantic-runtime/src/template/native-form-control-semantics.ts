import { BuiltInBindingCommandTargetName } from './binding-command-target.js';

export const nativeFormControlMatcherTarget = BuiltInBindingCommandTargetName.Matcher;

export interface NativeInputCheckedBindingSemantics {
  readonly nodeName: 'INPUT';
  readonly inputTypes: readonly ['checkbox', 'radio'];
  readonly modelTarget: BuiltInBindingCommandTargetName.Model;
  readonly valueTarget: BuiltInBindingCommandTargetName.Value;
  /** Runtime element-value sources in framework precedence order. */
  readonly elementValueTargets: readonly [
    BuiltInBindingCommandTargetName.Model,
    BuiltInBindingCommandTargetName.Value,
  ];
  readonly matcherTarget: BuiltInBindingCommandTargetName.Matcher;
  readonly checkedTarget: BuiltInBindingCommandTargetName.Checked;
  /** Targets that must initialize before the checked binding selects its observer behavior. */
  readonly initializationPredecessorTargets: readonly [
    BuiltInBindingCommandTargetName.Model,
    BuiltInBindingCommandTargetName.Value,
    BuiltInBindingCommandTargetName.Matcher,
  ];
}

export interface NativeSelectValueBindingSemantics {
  readonly nodeName: 'SELECT';
  readonly optionModelTarget: BuiltInBindingCommandTargetName.Model;
  readonly optionValueTarget: BuiltInBindingCommandTargetName.Value;
  /** Runtime option-value sources in framework precedence order. */
  readonly optionValueTargets: readonly [
    BuiltInBindingCommandTargetName.Model,
    BuiltInBindingCommandTargetName.Value,
  ];
  readonly multipleTarget: BuiltInBindingCommandTargetName.Multiple;
  readonly valueTarget: BuiltInBindingCommandTargetName.Value;
  readonly matcherTarget: BuiltInBindingCommandTargetName.Matcher;
  /** Targets that must initialize before the value binding selects scalar versus collection behavior. */
  readonly initializationPredecessorTargets: readonly [BuiltInBindingCommandTargetName.Multiple];
}

/** Shared framework semantics behind compiler ordering and CheckedObserver value-domain analysis. */
export const nativeInputCheckedBindingSemantics: NativeInputCheckedBindingSemantics = {
  nodeName: 'INPUT',
  inputTypes: ['checkbox', 'radio'],
  modelTarget: BuiltInBindingCommandTargetName.Model,
  valueTarget: BuiltInBindingCommandTargetName.Value,
  elementValueTargets: [
    BuiltInBindingCommandTargetName.Model,
    BuiltInBindingCommandTargetName.Value,
  ],
  matcherTarget: nativeFormControlMatcherTarget,
  checkedTarget: BuiltInBindingCommandTargetName.Checked,
  initializationPredecessorTargets: [
    BuiltInBindingCommandTargetName.Model,
    BuiltInBindingCommandTargetName.Value,
    BuiltInBindingCommandTargetName.Matcher,
  ],
};

/** Shared framework semantics behind compiler ordering and SelectValueObserver multiple-mode analysis. */
export const nativeSelectValueBindingSemantics: NativeSelectValueBindingSemantics = {
  nodeName: 'SELECT',
  optionModelTarget: BuiltInBindingCommandTargetName.Model,
  optionValueTarget: BuiltInBindingCommandTargetName.Value,
  optionValueTargets: [
    BuiltInBindingCommandTargetName.Model,
    BuiltInBindingCommandTargetName.Value,
  ],
  multipleTarget: BuiltInBindingCommandTargetName.Multiple,
  valueTarget: BuiltInBindingCommandTargetName.Value,
  matcherTarget: nativeFormControlMatcherTarget,
  initializationPredecessorTargets: [BuiltInBindingCommandTargetName.Multiple],
};

export function isNativeInputCheckedType(value: string): value is 'checkbox' | 'radio' {
  return (nativeInputCheckedBindingSemantics.inputTypes as readonly string[]).includes(value);
}

export function isNativeInputCheckedInitializationPredecessor(target: string): boolean {
  return (nativeInputCheckedBindingSemantics.initializationPredecessorTargets as readonly string[]).includes(target);
}
