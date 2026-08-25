import { TemplateBindingMode } from '../template/instruction-ir.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
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
import type { ProductHandle } from '../kernel/handles.js';
import { runtimeBindingInitialMode } from '../template/runtime-binding-mode-behavior.js';

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
  return runtimeBindingSourceLifecycleForModes(
    binding,
    expressionResourcePlan.readEffectiveBindingModes(binding.productHandle),
    expressionResourcePlan.readSourceEvaluationReachability(binding.productHandle),
  );
}

/** Source lifecycle for one exact authored expression chain, including interpolation-part mode behavior. */
export function runtimeBindingSourceChainLifecycle(
  binding: RuntimeExpressionBinding,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
  expressionProductHandle: ProductHandle | null,
  expressionChainIndex: number,
): RuntimeBindingSourceLifecycle {
  const initialMode = runtimeBindingInitialMode(binding);
  const effectiveMode = expressionResourcePlan.readExpressionChainEffectiveBindingMode(
    binding.productHandle,
    expressionProductHandle,
    expressionChainIndex,
  ) ?? initialMode;
  return runtimeBindingSourceLifecycleForModes(
    binding,
    effectiveMode == null ? [] : [effectiveMode],
    expressionResourcePlan.readExpressionChainSourceEvaluationReachability(
      binding.productHandle,
      expressionProductHandle,
      expressionChainIndex,
    ),
  );
}

function runtimeBindingSourceLifecycleForModes(
  binding: RuntimeExpressionBinding,
  effectiveModes: readonly TemplateBindingMode[],
  evaluationReachability: RuntimeOperationReachability,
): RuntimeBindingSourceLifecycle {
  if (binding instanceof ListenerBinding || binding instanceof StateDispatchBinding) {
    return new RuntimeBindingSourceLifecycle(
      RuntimeBindingSourceEvaluationKind.UntrackedRead,
      evaluationReachability,
      false,
    );
  }
  if (binding instanceof PropertyBinding) {
    const mode = effectiveModes[0] ?? binding.bindingMode;
    return new RuntimeBindingSourceLifecycle(
      sourceEvaluationKindForPropertyBindingMode(mode),
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
  if (binding instanceof AttributeBinding) {
    const modes = effectiveModes.length > 0
      ? effectiveModes
      : [runtimeBindingInitialMode(binding) ?? TemplateBindingMode.ToView];
    return new RuntimeBindingSourceLifecycle(
      sourceEvaluationKindForAttributeBindingModes(modes),
      evaluationReachability,
      false,
    );
  }
  if (binding instanceof InterpolationBinding || binding instanceof ContentBinding) {
    const modes = effectiveModes.length > 0
      ? effectiveModes
      : [runtimeBindingInitialMode(binding) ?? TemplateBindingMode.ToView];
    return new RuntimeBindingSourceLifecycle(
      sourceEvaluationKindForAlwaysValueProducingModes(modes),
      evaluationReachability,
      false,
    );
  }
  return new RuntimeBindingSourceLifecycle(
    RuntimeBindingSourceEvaluationKind.ConnectableRead,
    evaluationReachability,
    false,
  );
}

function sourceEvaluationKindForPropertyBindingMode(
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

function sourceEvaluationKindForAttributeBindingModes(
  bindingModes: readonly TemplateBindingMode[],
): RuntimeBindingSourceEvaluationKind {
  if (bindingModes.some((mode) => mode === TemplateBindingMode.Default || mode === TemplateBindingMode.Open)) {
    return RuntimeBindingSourceEvaluationKind.Open;
  }
  if (bindingModes.some((mode) => mode === TemplateBindingMode.ToView || mode === TemplateBindingMode.TwoWay)) {
    return RuntimeBindingSourceEvaluationKind.ConnectableRead;
  }
  return bindingModes.some((mode) => mode === TemplateBindingMode.OneTime)
    ? RuntimeBindingSourceEvaluationKind.UntrackedRead
    : RuntimeBindingSourceEvaluationKind.NotEvaluated;
}

function sourceEvaluationKindForAlwaysValueProducingModes(
  bindingModes: readonly TemplateBindingMode[],
): RuntimeBindingSourceEvaluationKind {
  if (bindingModes.some((mode) => mode === TemplateBindingMode.Default || mode === TemplateBindingMode.Open)) {
    return RuntimeBindingSourceEvaluationKind.Open;
  }
  return bindingModes.some((mode) => mode === TemplateBindingMode.ToView || mode === TemplateBindingMode.TwoWay)
    ? RuntimeBindingSourceEvaluationKind.ConnectableRead
    : RuntimeBindingSourceEvaluationKind.UntrackedRead;
}

/** Whether Aurelia executes `astEvaluate(...)` for this source lifecycle. */
export function runtimeBindingSourceEvaluationKindIncludesRead(
  kind: RuntimeBindingSourceEvaluationKind,
): boolean {
  return kind === RuntimeBindingSourceEvaluationKind.ConnectableRead
    || kind === RuntimeBindingSourceEvaluationKind.UntrackedRead
    || kind === RuntimeBindingSourceEvaluationKind.Open;
}

/** Whether the binding lifecycle contains a source-side value read or assignment operation. */
export function runtimeBindingSourceLifecycleIncludesOperation(
  lifecycle: RuntimeBindingSourceLifecycle,
): boolean {
  return runtimeBindingSourceEvaluationKindIncludesRead(lifecycle.evaluationKind)
    || lifecycle.includesSourceAssignment;
}
