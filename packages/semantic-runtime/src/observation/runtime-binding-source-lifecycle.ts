import { TemplateBindingMode } from '../template/instruction-ir.js';
import {
  ListenerBinding,
  PropertyBinding,
  RefBinding,
  StateDispatchBinding,
} from '../template/runtime-binding.js';
import type { RuntimeExpressionResourcePlan } from '../template/runtime-expression-resource-plan.js';
import type { RuntimeExpressionBinding } from './runtime-binding-expression.js';
import {
  RuntimeBindingSourceEvaluationKind,
} from './runtime-binding-observation.js';
import type { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';

/** Source-side astEvaluate/astAssign lifecycle shared by data-flow and access-use materialization. */
export class RuntimeBindingSourceLifecycle {
  constructor(
    readonly evaluationKind: RuntimeBindingSourceEvaluationKind,
    readonly evaluationReachability: RuntimeOperationReachability,
    readonly includesSourceAssignment: boolean,
  ) {}
}

/** Project binding kind and effective mode into the source lifecycle Aurelia actually spends. */
export function runtimeBindingSourceLifecycle(
  binding: RuntimeExpressionBinding,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
): RuntimeBindingSourceLifecycle {
  const evaluationReachability = expressionResourcePlan.readSourceEvaluationReachability(
    binding.productHandle,
  );
  if (binding instanceof ListenerBinding || binding instanceof StateDispatchBinding) {
    return new RuntimeBindingSourceLifecycle(
      RuntimeBindingSourceEvaluationKind.UntrackedRead,
      evaluationReachability,
      false,
    );
  }
  if (binding instanceof PropertyBinding) {
    const mode = expressionResourcePlan.effectivePropertyBindingMode(binding);
    return new RuntimeBindingSourceLifecycle(
      sourceEvaluationKindForBindingMode(mode),
      evaluationReachability,
      mode === TemplateBindingMode.FromView || mode === TemplateBindingMode.TwoWay,
    );
  }
  if (binding instanceof RefBinding) {
    return new RuntimeBindingSourceLifecycle(
      RuntimeBindingSourceEvaluationKind.AssignmentOnly,
      evaluationReachability,
      true,
    );
  }
  return new RuntimeBindingSourceLifecycle(
    RuntimeBindingSourceEvaluationKind.ConnectableRead,
    evaluationReachability,
    false,
  );
}

function sourceEvaluationKindForBindingMode(
  bindingMode: TemplateBindingMode,
): RuntimeBindingSourceEvaluationKind {
  switch (bindingMode) {
    case TemplateBindingMode.OneTime:
      return RuntimeBindingSourceEvaluationKind.UntrackedRead;
    case TemplateBindingMode.ToView:
    case TemplateBindingMode.TwoWay:
      return RuntimeBindingSourceEvaluationKind.ConnectableRead;
    case TemplateBindingMode.FromView:
      return RuntimeBindingSourceEvaluationKind.AssignmentOnly;
    case TemplateBindingMode.Default:
    case TemplateBindingMode.Open:
      return RuntimeBindingSourceEvaluationKind.Open;
  }
}
