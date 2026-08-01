import type { BindingScope } from '../configuration/scope.js';
import type { BindingScopeConstructionEmission } from '../configuration/scope-materializer.js';
import type { Container } from '../di/container.js';
import type {
  ExpressionAstNode,
  IsValueConverter,
} from '../expression/ast.js';
import { ValueConverterExpression } from '../expression/ast.js';
import { unwrapExpressionAstNodeParens } from '../expression/parse-result-inspection.js';
import { expressionSourceSpanContains } from '../expression/source-span.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { auLink } from '../kernel/au-link.js';
import type { KernelSourceFileReadView } from '../kernel/store.js';
import {
  STATE_BINDING_BEHAVIOR_NAME,
  StateBindingScopeProjector,
} from '../state/state-binding-scope.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import type { RuntimeExpressionResourcePlan } from '../template/runtime-expression-resource-plan.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import { runtimeOperationMayBeReached } from '../runtime-expression/runtime-operation.js';

export class RuntimeBindingExpressionScopeProjection {
  constructor(
    /** Expression that Aurelia will evaluate after binding-behavior bind-time side effects have run. */
    readonly expression: ExpressionAstNode,
    /** Scope that the binding will use for source evaluation, or null when a scope-changing behavior stays open. */
    readonly scope: BindingScope | null,
    /** Reason a scope-changing binding behavior could not close, when applicable. */
    readonly openReason: string | null,
  ) {}
}

class RuntimeBindingExpressionScopeProjectionEntry {
  constructor(
    readonly bindingScopeKey: string,
    readonly authoredExpression: ExpressionAstNode,
    readonly projection: RuntimeBindingExpressionScopeProjection,
  ) {}
}

/** Read-only authority for binding-behavior source-scope handoffs materialized during template scope construction. */
export interface RuntimeBindingExpressionScopeProjectionReader {
  project(input: RuntimeBindingExpressionScopeProjectionRequest): RuntimeBindingExpressionScopeProjection;
  projectSourceExpressions(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): readonly RuntimeBindingExpressionScopeProjection[];
}

/** Immutable source-scope handoffs shared by every post-scope runtime-analysis and query consumer. */
export class RuntimeBindingExpressionScopeProjectionTable implements RuntimeBindingExpressionScopeProjectionReader {
  private readonly projectionsByBindingScope = new Map<
    string,
    readonly RuntimeBindingExpressionScopeProjectionEntry[]
  >();

  constructor(
    private readonly projections: ReadonlyMap<string, RuntimeBindingExpressionScopeProjectionEntry>,
    private readonly unparsedBindingScopes: ReadonlyMap<string, BindingScope>,
  ) {
    const grouped = new Map<string, RuntimeBindingExpressionScopeProjectionEntry[]>();
    for (const entry of projections.values()) {
      const entries = grouped.get(entry.bindingScopeKey);
      if (entries == null) {
        grouped.set(entry.bindingScopeKey, [entry]);
      } else {
        entries.push(entry);
      }
    }
    for (const [key, entries] of grouped) {
      this.projectionsByBindingScope.set(key, entries);
    }
  }

  project(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): RuntimeBindingExpressionScopeProjection {
    const retained = this.projections.get(runtimeBindingExpressionScopeProjectionKey(input));
    if (retained != null) {
      return retained.projection;
    }
    const bindingScopeKey = runtimeBindingExpressionScopeKey(input.bindingProductHandle, input.scope.productHandle);
    const enclosing = smallestEnclosingRuntimeBindingExpressionScopeProjection(
      this.projectionsByBindingScope.get(bindingScopeKey) ?? [],
      input.expression,
    );
    if (enclosing != null) {
      const sourceExpressionContainsSelection = expressionSourceSpanContains(
        enclosing.projection.expression.span,
        input.expression.span,
      );
      return new RuntimeBindingExpressionScopeProjection(
        input.expression,
        sourceExpressionContainsSelection ? enclosing.projection.scope : input.scope,
        sourceExpressionContainsSelection ? enclosing.projection.openReason : null,
      );
    }
    const containing = commonRuntimeBindingExpressionScopeProjectionForContainedEntries(
      this.projectionsByBindingScope.get(bindingScopeKey) ?? [],
      input.expression,
    );
    if (containing != null) {
      return new RuntimeBindingExpressionScopeProjection(
        input.expression,
        containing.scope,
        containing.openReason,
      );
    }
    const unparsedScope = this.unparsedBindingScopes.get(bindingScopeKey);
    return unparsedScope != null
      ? new RuntimeBindingExpressionScopeProjection(input.expression, unparsedScope, null)
      : new RuntimeBindingExpressionScopeProjection(
      input.expression,
      null,
      'The rendered binding source-scope handoff was not materialized during template scope construction.',
    );
  }

  projectSourceExpressions(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): readonly RuntimeBindingExpressionScopeProjection[] {
    const expression = unwrapExpressionAstNodeParens(input.expression);
    if (expression.$kind !== 'Interpolation') {
      return [this.project(input)];
    }
    return expression.expressions.map((part, index) =>
      this.project({
        ...input,
        expression: part,
        localKey: `${input.localKey}:interpolation-part:${index}`,
      })
    );
  }

}

export interface RuntimeBindingExpressionScopeProjectionRequest {
  /** Exact rendered binding whose resource-plan application owns this lifecycle handoff. */
  readonly bindingProductHandle: ProductHandle;
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope;
  readonly localKey: string;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly resourceScope: TemplateResourceScope;
  /** Active runtime container visible to binding-behavior DI resolution. */
  readonly activeContainer: Container | null;
}

/**
 * Projects the binding-behavior `astBind(...)` handoff that changes a binding's later source-evaluation scope.
 *
 * `astEvaluate(...)` unwraps binding behaviors and does not connectably evaluate their arguments. The state binding
 * behavior is special because its `bind(...)` calls `binding.useScope(createStateBindingScope(...))`, so subsequent
 * source reads happen against the store-backed scope rather than the original instruction scope.
 */
@auLink('runtime:astBind')
export class RuntimeBindingExpressionScopeProjector implements RuntimeBindingExpressionScopeProjectionReader {
  private readonly projections = new Map<string, RuntimeBindingExpressionScopeProjectionEntry>();
  private readonly unparsedBindingScopes = new Map<string, BindingScope>();
  private readonly scopeEmissions = new Map<ProductHandle, BindingScopeConstructionEmission>();

  constructor(
    readonly kernel: KernelSourceFileReadView,
    readonly expressionWorld: CheckerExpressionTypeWorld,
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
  ) {}

  project(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): RuntimeBindingExpressionScopeProjection {
    const key = runtimeBindingExpressionScopeProjectionKey(input);
    const retained = this.projections.get(key);
    if (retained != null) {
      return retained.projection;
    }
    const projection = this.projectAstBindEffects(
      unwrapExpressionAstNodeParens(input.expression),
      input.scope,
      input.localKey,
      input.sourceAddressHandle,
      input.bindingProductHandle,
      input.resourceScope,
      input.activeContainer,
    );
    this.projections.set(key, new RuntimeBindingExpressionScopeProjectionEntry(
      runtimeBindingExpressionScopeKey(input.bindingProductHandle, input.scope.productHandle),
      input.expression,
      projection,
    ));
    return projection;
  }

  retainUnparsedBindingScope(
    bindingProductHandle: ProductHandle,
    scope: BindingScope,
  ): void {
    this.unparsedBindingScopes.set(
      runtimeBindingExpressionScopeKey(bindingProductHandle, scope.productHandle),
      scope,
    );
  }

  projectSourceExpressions(
    input: RuntimeBindingExpressionScopeProjectionRequest,
  ): readonly RuntimeBindingExpressionScopeProjection[] {
    const expression = unwrapExpressionAstNodeParens(input.expression);
    if (expression.$kind !== 'Interpolation') {
      return [this.project(input)];
    }
    return expression.expressions.map((part, index) =>
      this.project({
        ...input,
        expression: part,
        localKey: `${input.localKey}:interpolation-part:${index}`,
      })
    );
  }

  readScopeEmissions(): readonly BindingScopeConstructionEmission[] {
    return [...this.scopeEmissions.values()];
  }

  toProjectionTable(): RuntimeBindingExpressionScopeProjectionTable {
    return new RuntimeBindingExpressionScopeProjectionTable(
      new Map(this.projections),
      new Map(this.unparsedBindingScopes),
    );
  }

  private projectAstBindEffects(
    expression: ExpressionAstNode,
    scope: BindingScope | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    bindingProductHandle: ProductHandle,
    resourceScope: TemplateResourceScope,
    activeContainer: Container | null,
  ): RuntimeBindingExpressionScopeProjection {
    const unwrapped = unwrapExpressionAstNodeParens(expression);
    if (unwrapped.$kind === 'ValueConverter') {
      const projectedInput = this.projectAstBindEffects(
        unwrapped.expression,
        scope,
        `${localKey}:value-converter:${unwrapped.name.name}`,
        sourceAddressHandle,
        bindingProductHandle,
        resourceScope,
        activeContainer,
      );
      return new RuntimeBindingExpressionScopeProjection(
        new ValueConverterExpression(
          unwrapped.span,
          projectedInput.expression as IsValueConverter,
          unwrapped.name,
          unwrapped.args,
        ),
        projectedInput.scope,
        projectedInput.openReason,
      );
    }
    if (unwrapped.$kind !== 'BindingBehavior') {
      return new RuntimeBindingExpressionScopeProjection(unwrapped, scope, null);
    }

    const planEntry = this.expressionResourcePlan.readBindingBehaviorEntry(
      unwrapped,
      bindingProductHandle,
    );
    const admitted = planEntry != null
      && runtimeOperationMayBeReached(planEntry.bindReachability)
      && planEntry.issue == null;
    if (planEntry == null && unwrapped.name.name === STATE_BINDING_BEHAVIOR_NAME) {
      return new RuntimeBindingExpressionScopeProjection(
        unwrapped.expression,
        null,
        'The state binding behavior did not retain an expression-resource plan entry for this rendered binding.',
      );
    }
    if (
      planEntry?.builtInResource?.name === BuiltInBindingBehaviorName.State
      && !admitted
    ) {
      return new RuntimeBindingExpressionScopeProjection(
        unwrapped.expression,
        null,
        'The state binding behavior did not reach its source-scope handoff for this rendered binding.',
      );
    }
    const behaviorScope = admitted && planEntry.builtInResource?.name === BuiltInBindingBehaviorName.State
      ? this.projectStateBindingBehaviorScope(
          unwrapped,
          scope,
          bindingProductHandle,
          sourceAddressHandle,
          activeContainer,
        )
      : new RuntimeBindingExpressionScopeProjection(unwrapped.expression, scope, null);
    const projectedConverter = admitted
      ? this.expressionResourcePlan.readProjectedConverterForBindingBehavior(
          unwrapped,
          bindingProductHandle,
        )
      : null;
    if (projectedConverter != null) {
      const projectedInput = this.projectAstBindEffects(
        unwrapped.expression,
        behaviorScope.scope,
        `${localKey}:behavior:${unwrapped.name.name}:value-converter-input`,
        sourceAddressHandle,
        bindingProductHandle,
        resourceScope,
        activeContainer,
      );
      return new RuntimeBindingExpressionScopeProjection(
        new ValueConverterExpression(
          projectedConverter.expression.span,
          projectedInput.expression as IsValueConverter,
          projectedConverter.expression.name,
          projectedConverter.expression.args,
        ),
        projectedInput.scope,
        behaviorScope.openReason ?? projectedInput.openReason,
      );
    }
    const projectedInner = this.projectAstBindEffects(
      unwrapped.expression,
      behaviorScope.scope,
      `${localKey}:behavior:${unwrapped.name.name}`,
      sourceAddressHandle,
      bindingProductHandle,
      resourceScope,
      activeContainer,
    );
    return new RuntimeBindingExpressionScopeProjection(
      projectedInner.expression,
      projectedInner.scope,
      behaviorScope.openReason ?? projectedInner.openReason,
    );
  }

  private projectStateBindingBehaviorScope(
    expression: ExpressionAstNode & { readonly $kind: 'BindingBehavior' },
    scope: BindingScope | null,
    bindingProductHandle: ProductHandle,
    sourceAddressHandle: AddressHandle | null,
    activeContainer: Container | null,
  ): RuntimeBindingExpressionScopeProjection {
    if (scope == null) {
      return new RuntimeBindingExpressionScopeProjection(
        expression.expression,
        null,
        'A previous state binding behavior did not produce a store-backed binding scope.',
      );
    }
    if (activeContainer == null) {
      return new RuntimeBindingExpressionScopeProjection(
        expression.expression,
        null,
        'The state binding behavior did not retain the active runtime container needed to resolve IStoreRegistry.',
      );
    }
    const storeSelection = this.expressionWorld.stateStoreSelectionForContainer(activeContainer);
    const stateScope = new StateBindingScopeProjector(
      this.kernel,
      storeSelection,
      this.expressionWorld.projector,
    ).scopeForBindingBehavior(
      expression,
      scope,
      bindingProductHandle,
      sourceAddressHandle,
    );
    if (stateScope.emission != null) {
      this.scopeEmissions.set(stateScope.emission.scope.productHandle, stateScope.emission);
    }
    return new RuntimeBindingExpressionScopeProjection(
      expression.expression,
      stateScope.scope,
      stateScope.openReason,
    );
  }
}

function runtimeBindingExpressionScopeProjectionKey(
  input: RuntimeBindingExpressionScopeProjectionRequest,
): string {
  return [
    input.bindingProductHandle,
    input.scope.productHandle,
    input.expression.span.file?.id ?? '',
    input.expression.span.start,
    input.expression.span.end,
  ].join('\0');
}

function runtimeBindingExpressionScopeKey(
  bindingProductHandle: ProductHandle,
  scopeProductHandle: ProductHandle,
): string {
  return `${bindingProductHandle}\0${scopeProductHandle}`;
}

function smallestEnclosingRuntimeBindingExpressionScopeProjection(
  entries: readonly RuntimeBindingExpressionScopeProjectionEntry[],
  expression: ExpressionAstNode,
): RuntimeBindingExpressionScopeProjectionEntry | null {
  let selected: RuntimeBindingExpressionScopeProjectionEntry | null = null;
  for (const entry of entries) {
    if (!expressionSourceSpanContains(entry.authoredExpression.span, expression.span)) {
      continue;
    }
    if (
      selected == null
      || entry.authoredExpression.span.end - entry.authoredExpression.span.start
        < selected.authoredExpression.span.end - selected.authoredExpression.span.start
    ) {
      selected = entry;
    }
  }
  return selected;
}

function commonRuntimeBindingExpressionScopeProjectionForContainedEntries(
  entries: readonly RuntimeBindingExpressionScopeProjectionEntry[],
  expression: ExpressionAstNode,
): RuntimeBindingExpressionScopeProjection | null {
  const contained = entries.filter((entry) =>
    expressionSourceSpanContains(expression.span, entry.authoredExpression.span)
  );
  const first = contained[0]?.projection ?? null;
  if (first == null) {
    return null;
  }
  return contained.every((entry) =>
    entry.projection.scope?.productHandle === first.scope?.productHandle
    && entry.projection.openReason === first.openReason
  )
    ? first
    : null;
}

/** True when the binding source can change Scope during `astBind(...)` under the modeled semantic-runtime rules. */
export function runtimeBindingExpressionUsesModeledScopeChangingBindingBehavior(
  expression: ExpressionAstNode,
): boolean {
  const unwrapped = unwrapExpressionAstNodeParens(expression);
  if (unwrapped.$kind === 'Interpolation') {
    return unwrapped.expressions.some(runtimeBindingExpressionUsesModeledScopeChangingBindingBehavior);
  }
  let current: ExpressionAstNode = unwrapped;
  while (current.$kind === 'BindingBehavior') {
    if (current.name.name === STATE_BINDING_BEHAVIOR_NAME) {
      return true;
    }
    current = unwrapExpressionAstNodeParens(current.expression);
  }
  return false;
}
