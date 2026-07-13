import {
  TemplateBindingMode,
} from './instruction-ir.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';

/** Binding mode selected by runtime-html BindingModeBehavior during astBind(...). */
export function bindingModeForBindingBehaviorName(name: string): TemplateBindingMode | null {
  switch (name) {
    case BuiltInBindingBehaviorName.OneTime:
      return TemplateBindingMode.OneTime;
    case BuiltInBindingBehaviorName.ToView:
      return TemplateBindingMode.ToView;
    case BuiltInBindingBehaviorName.FromView:
      return TemplateBindingMode.FromView;
    case BuiltInBindingBehaviorName.TwoWay:
      return TemplateBindingMode.TwoWay;
    default:
      return null;
  }
}

/** True when a binding mode asks Aurelia to evaluate the source and write into the target. */
export function templateBindingModeIncludesSourceToTarget(bindingMode: TemplateBindingMode): boolean {
  return bindingMode === TemplateBindingMode.OneTime
    || bindingMode === TemplateBindingMode.ToView
    || bindingMode === TemplateBindingMode.TwoWay;
}

/** True when a binding mode asks Aurelia to observe the target and assign back into the source expression. */
export function templateBindingModeIncludesTargetToSource(bindingMode: TemplateBindingMode): boolean {
  return bindingMode === TemplateBindingMode.FromView
    || bindingMode === TemplateBindingMode.TwoWay;
}
