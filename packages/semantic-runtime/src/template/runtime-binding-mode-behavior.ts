import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  type BindingBehaviorExpression,
} from '../expression/ast.js';
import {
  bindingBehaviorExpressions,
} from './binding-behavior-expression.js';
import {
  TemplateBindingMode,
} from './instruction-ir.js';
import type { TemplateResourceScope } from './compiler-world.js';
import { findVisibleTemplateResource } from './compiler-resource-lookup.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  type PropertyBinding,
} from './runtime-binding.js';
import { bindingExpressionAstForProduct } from './expression-parse-product.js';

/** Binding mode selected by runtime-html BindingModeBehavior during astBind(...). */
export function bindingModeForBindingBehaviorName(name: string): TemplateBindingMode | null {
  switch (name) {
    case 'oneTime':
      return TemplateBindingMode.OneTime;
    case 'toView':
      return TemplateBindingMode.ToView;
    case 'fromView':
      return TemplateBindingMode.FromView;
    case 'twoWay':
      return TemplateBindingMode.TwoWay;
    default:
      return null;
  }
}

export function effectiveTemplateBindingMode(
  store: KernelStore,
  initialMode: TemplateBindingMode,
  expressionProductHandle: ProductHandle | null,
  resourceScope: TemplateResourceScope | null,
): TemplateBindingMode {
  return bindingModeAfterBindingBehaviors(
    initialMode,
    bindingModeBehaviorExpressionsForExpressionProduct(store, expressionProductHandle),
    resourceScope,
  );
}

export function effectivePropertyBindingMode(
  store: KernelStore,
  binding: PropertyBinding,
  resourceScope: TemplateResourceScope | null,
): TemplateBindingMode {
  return effectiveTemplateBindingMode(store, binding.bindingMode, binding.expressionProductHandle, resourceScope);
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

export function bindingModeAfterBindingBehaviors(
  initialMode: TemplateBindingMode,
  behaviors: readonly BindingBehaviorExpression[],
  resourceScope: TemplateResourceScope | null,
): TemplateBindingMode {
  let mode = initialMode;
  for (const behavior of behaviors) {
    const behaviorMode = bindingModeForBindingBehaviorName(behavior.name.name);
    if (behaviorMode != null && bindingModeBehaviorIsVisible(resourceScope, behavior.name.name)) {
      mode = behaviorMode;
    }
  }
  return mode;
}

function bindingModeBehaviorIsVisible(resourceScope: TemplateResourceScope | null, name: string): boolean {
  return findVisibleTemplateResource(resourceScope, ResourceDefinitionKind.BindingBehavior, name) != null;
}

export function bindingModeBehaviorExpressionsForExpressionProduct(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): readonly BindingBehaviorExpression[] {
  const ast = bindingExpressionAstForProduct(store, expressionProductHandle);
  return ast == null ? [] : bindingBehaviorExpressions(ast);
}
