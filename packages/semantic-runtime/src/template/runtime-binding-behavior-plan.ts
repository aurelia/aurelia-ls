import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { BindingBehaviorExpression, IsAssign } from '../expression/ast.js';
import { BuiltInBindingBehaviorName } from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  NodeObserverLocatorConfiguration,
  ObserverLocator,
} from '../observation/observer-locator.js';
import {
  bindingBehaviorResourceOccurrences,
  type ExpressionResourceOccurrence,
} from './expression-resource-occurrence.js';
import { bindingExpressionAstForProduct } from './expression-parse-product.js';
import { findVisibleTemplateResource } from './compiler-resource-lookup.js';
import type { TemplateResourceScope } from './compiler-world.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';
import { TemplateBindingMode } from './instruction-ir.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
  LetBinding,
  ListenerBinding,
  PropertyBinding,
  RefBinding,
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetKind,
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingTarget,
} from './runtime-binding.js';
import {
  AttrBindingBehavior,
  DebounceBindingBehavior,
  SelfBindingBehavior,
  SignalBindingBehavior,
  ThrottleBindingBehavior,
  UpdateTriggerBindingBehavior,
  ValidateBindingBehavior,
  ValidateBindingBehaviorArgumentKind,
  ValidationController,
  RuntimeBindingBehaviorIssueKind,
  type BuiltInBindingBehaviorBindIssue,
  type ValidateBindingBehaviorArgument,
} from './runtime-binding-behavior.js';
import {
  RuntimeBindingBehaviorBindEffectReader,
  type RuntimeBindingBehaviorBindEffects,
} from './runtime-binding-behavior-effect.js';
import { bindingModeForBindingBehaviorName } from './runtime-binding-mode-behavior.js';
import { RuntimeHtmlBindingBehaviorFrameworkErrorCode } from './framework-error-code.js';
import { RuntimeHtmlAstFrameworkErrorCode } from '../type-system/framework-error-code.js';
import { expressionProductHandlesForRuntimeBinding } from './runtime-binding-expression-products.js';
import { RuntimeExpressionResourceBindReachability } from './runtime-expression-resource.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import {
  runtimeBindingAccessTarget,
  runtimeBindingTargetController,
} from './runtime-binding-target-resolution.js';

type RateLimitBindingBehaviorName =
  | BuiltInBindingBehaviorName.Debounce
  | BuiltInBindingBehaviorName.Throttle;

export class RuntimeBindingTargetObserverOverride {
  constructor(
    /** Replacement observer strategy, or null when the behavior only reconfigures the selected node observer. */
    readonly strategy: RuntimeBindingTargetAccessStrategy | null,
    /** Exact replacement event names; null when authored arguments are runtime-dependent. */
    readonly eventNames: readonly string[] | null,
  ) {}
}

export class RuntimeBindingBehaviorPlanEntry {
  constructor(
    readonly bindingIndex: number,
    readonly expressionIndex: number,
    readonly behaviorIndex: number,
    readonly binding: RuntimeBinding,
    readonly resource: TemplateVisibleResource | null,
    readonly expressionProductHandle: ProductHandle,
    readonly occurrence: ExpressionResourceOccurrence<BindingBehaviorExpression>,
    readonly bindReachability: RuntimeExpressionResourceBindReachability,
    readonly bindOrder: number | null,
    readonly phaseOrder: number | null,
    readonly issue: BuiltInBindingBehaviorBindIssue | null,
  ) {}
}

/** One authority for binding-behavior bind reachability and the state mutations that downstream binding phases spend. */
export class RuntimeBindingBehaviorPlan {
  static readonly empty = new RuntimeBindingBehaviorPlan([], new Map(), new Map());

  private readonly effectiveModesByExpression = new Map<ProductHandle, TemplateBindingMode>();
  private readonly targetObserverOverridesByBinding = new Map<ProductHandle, RuntimeBindingTargetObserverOverride>();
  private readonly firstFailureDepthByExpressionChain = new Map<string, number>();

  constructor(
    readonly entries: readonly RuntimeBindingBehaviorPlanEntry[],
    effectiveModesByExpression: ReadonlyMap<ProductHandle, TemplateBindingMode>,
    targetObserverOverridesByBinding: ReadonlyMap<ProductHandle, RuntimeBindingTargetObserverOverride>,
  ) {
    for (const [expressionProductHandle, mode] of effectiveModesByExpression) {
      this.effectiveModesByExpression.set(expressionProductHandle, mode);
    }
    for (const [bindingProductHandle, override] of targetObserverOverridesByBinding) {
      this.targetObserverOverridesByBinding.set(bindingProductHandle, override);
    }
    for (const entry of entries) {
      if (entry.issue == null) {
        continue;
      }
      const key = expressionChainKey(entry.expressionProductHandle, entry.occurrence.chainIndex);
      const current = this.firstFailureDepthByExpressionChain.get(key);
      if (current == null || entry.occurrence.chainDepth < current) {
        this.firstFailureDepthByExpressionChain.set(key, entry.occurrence.chainDepth);
      }
    }
  }

  effectiveMode(
    initialMode: TemplateBindingMode,
    expressionProductHandle: ProductHandle | null,
  ): TemplateBindingMode {
    return expressionProductHandle == null
      ? initialMode
      : this.effectiveModesByExpression.get(expressionProductHandle) ?? initialMode;
  }

  effectivePropertyBindingMode(binding: PropertyBinding): TemplateBindingMode {
    return this.effectiveMode(binding.bindingMode, binding.expressionProductHandle);
  }

  readTargetObserverOverride(
    bindingProductHandle: ProductHandle,
  ): RuntimeBindingTargetObserverOverride | null {
    return this.targetObserverOverridesByBinding.get(bindingProductHandle) ?? null;
  }

  readFirstFailureDepth(
    expressionProductHandle: ProductHandle,
    chainIndex: number,
  ): number | null {
    return this.firstFailureDepthByExpressionChain.get(
      expressionChainKey(expressionProductHandle, chainIndex),
    ) ?? null;
  }
}

export class RuntimeBindingBehaviorPlanningRequest {
  constructor(
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly resourceScope: TemplateResourceScope | null,
    readonly nodeObserverLocatorConfiguration: NodeObserverLocatorConfiguration | null,
  ) {}
}

class BindingBehaviorBindState {
  private rateLimitBehaviorName: RateLimitBindingBehaviorName | null = null;
  private targetSubscriberBehaviorName: string | null = null;
  private readonly appliedBehaviorNames = new Set<string>();
  private targetObserverOverride: RuntimeBindingTargetObserverOverride | null = null;

  constructor(private currentBindingMode: TemplateBindingMode | null) {}

  readBindingMode(): TemplateBindingMode | null {
    return this.currentBindingMode;
  }

  setBindingMode(bindingMode: TemplateBindingMode): void {
    this.currentBindingMode = bindingMode;
  }

  hasAppliedBehavior(behaviorName: string): boolean {
    return this.appliedBehaviorNames.has(behaviorName);
  }

  markAppliedBehavior(behaviorName: string): void {
    this.appliedBehaviorNames.add(behaviorName);
  }

  hasDifferentRateLimitBehavior(behaviorName: RateLimitBindingBehaviorName): boolean {
    return this.rateLimitBehaviorName != null && this.rateLimitBehaviorName !== behaviorName;
  }

  markRateLimitBehavior(behaviorName: RateLimitBindingBehaviorName): void {
    this.rateLimitBehaviorName ??= behaviorName;
  }

  hasTargetSubscriber(): boolean {
    return this.targetSubscriberBehaviorName != null;
  }

  markTargetSubscriber(behaviorName: string): void {
    this.targetSubscriberBehaviorName ??= behaviorName;
  }

  setTargetObserverOverride(override: RuntimeBindingTargetObserverOverride): void {
    this.targetObserverOverride = override;
  }

  readTargetObserverOverride(): RuntimeBindingTargetObserverOverride | null {
    return this.targetObserverOverride;
  }
}

class BindingBehaviorChainState {
  readonly bindState: BindingBehaviorBindState;
  blocked = false;
  nextPhaseOrder = 0;

  constructor(initialMode: TemplateBindingMode | null) {
    this.bindState = new BindingBehaviorBindState(initialMode);
  }
}

/** Plans framework `astBind(...)` behavior effects before target observer/accessor selection. */
export class RuntimeBindingBehaviorPlanner {
  private readonly attr = new AttrBindingBehavior();
  private readonly debounce = new DebounceBindingBehavior();
  private readonly self = new SelfBindingBehavior();
  private readonly signal = new SignalBindingBehavior();
  private readonly throttle = new ThrottleBindingBehavior();
  private readonly updateTrigger = new UpdateTriggerBindingBehavior();
  private readonly validate = new ValidateBindingBehavior();
  private readonly validationController = new ValidationController();

  constructor(readonly store: KernelStore) {}

  plan(input: RuntimeBindingBehaviorPlanningRequest): RuntimeBindingBehaviorPlan {
    const entries: RuntimeBindingBehaviorPlanEntry[] = [];
    const effectiveModesByExpression = new Map<ProductHandle, TemplateBindingMode>();
    const targetObserverOverridesByBinding = new Map<ProductHandle, RuntimeBindingTargetObserverOverride>();
    const bindEffects = new RuntimeBindingBehaviorBindEffectReader(this.store);
    const observerLocator = new ObserverLocator(
      this.store,
      input.nodeObserverLocatorConfiguration ?? NodeObserverLocatorConfiguration.empty,
    );

    for (const [bindingIndex, binding] of input.runtimeRendering.bindings.entries()) {
      const targetController = runtimeBindingTargetController(input.runtimeRendering, binding);
      const target = runtimeBindingAccessTarget(this.store, binding, targetController);
      const expressionProductHandles = expressionProductHandlesForRuntimeBinding(binding);
      for (const [expressionIndex, expressionProductHandle] of expressionProductHandles.entries()) {
        const ast = bindingExpressionAstForProduct(this.store, expressionProductHandle);
        if (ast == null) {
          continue;
        }
        const chainStates = new Map<number, BindingBehaviorChainState>();
        for (const [behaviorIndex, occurrence] of bindingBehaviorResourceOccurrences(ast).entries()) {
          let chainState = chainStates.get(occurrence.chainIndex);
          if (chainState == null) {
            chainState = new BindingBehaviorChainState(binding instanceof PropertyBinding ? binding.bindingMode : null);
            chainStates.set(occurrence.chainIndex, chainState);
          }
          const reached = !chainState.blocked;
          const phaseOrder = reached ? chainState.nextPhaseOrder++ : null;
          const resource = findVisibleTemplateResource(
            input.resourceScope,
            ResourceDefinitionKind.BindingBehavior,
            occurrence.expression.name.name,
          );
          const issue = reached
            ? this.issueForBindingBehavior(
                binding,
                target,
                observerLocator,
                occurrence,
                chainState.bindState,
                bindEffects.readEffects(resource),
                resource != null,
              )
            : null;
          entries.push(new RuntimeBindingBehaviorPlanEntry(
            bindingIndex,
            expressionIndex,
            behaviorIndex,
            binding,
            resource,
            expressionProductHandle,
            occurrence,
            reached
              ? RuntimeExpressionResourceBindReachability.Reached
              : RuntimeExpressionResourceBindReachability.BlockedByOuterFailure,
            reached ? occurrence.chainDepth : null,
            phaseOrder,
            issue,
          ));
          if (reached && issue != null) {
            chainState.blocked = true;
          }
        }
        const chainState = chainStates.get(0);
        if (binding instanceof PropertyBinding && chainState != null) {
          effectiveModesByExpression.set(
            expressionProductHandle,
            chainState.bindState.readBindingMode() ?? binding.bindingMode,
          );
          const override = chainState.bindState.readTargetObserverOverride();
          if (override != null) {
            targetObserverOverridesByBinding.set(binding.productHandle, override);
          }
        }
      }
    }

    return new RuntimeBindingBehaviorPlan(entries, effectiveModesByExpression, targetObserverOverridesByBinding);
  }

  private issueForBindingBehavior(
    binding: RuntimeBinding,
    target: RuntimeBindingTarget,
    observerLocator: ObserverLocator,
    occurrence: ExpressionResourceOccurrence<BindingBehaviorExpression>,
    bindState: BindingBehaviorBindState,
    effects: RuntimeBindingBehaviorBindEffects,
    resourceResolved: boolean,
  ): BuiltInBindingBehaviorBindIssue | null {
    const behavior = occurrence.expression;
    if (!resourceResolved) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.ResourceNotFound,
        message: `Binding behavior '${behavior.name.name}' was not resolved through the current compiler resource scope.`,
        frameworkErrorCode: RuntimeHtmlAstFrameworkErrorCode.AstBehaviorNotFound,
      };
    }
    if (bindState.hasAppliedBehavior(behavior.name.name)) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.DuplicateApplication,
        message: `Binding behavior '${behavior.name.name}' is already applied to this binding.`,
        frameworkErrorCode: RuntimeHtmlAstFrameworkErrorCode.AstBehaviorDuplicated,
      };
    }
    bindState.markAppliedBehavior(behavior.name.name);
    const bindingMode = bindingModeForBindingBehaviorName(behavior.name.name);
    if (bindingMode != null) {
      bindState.setBindingMode(bindingMode);
      return null;
    }
    switch (behavior.name.name) {
      case BuiltInBindingBehaviorName.Attr: {
        const issue = this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.attr.bind({
          bindingIsPropertyBinding: binding instanceof PropertyBinding,
        }));
        if (issue == null) {
          bindState.setTargetObserverOverride(new RuntimeBindingTargetObserverOverride(
            RuntimeBindingTargetAccessStrategy.DataAttributeAccessor,
            [],
          ));
        }
        return issue;
      }
      case BuiltInBindingBehaviorName.Debounce:
        return this.afterTargetSubscriberEffects(
          behavior.name.name,
          bindState,
          effects,
          this.rateLimitIssue(binding, bindState, this.debounce.name),
        );
      case BuiltInBindingBehaviorName.Self:
        return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.self.bind({
          bindingIsListenerBinding: binding instanceof ListenerBinding,
        }));
      case BuiltInBindingBehaviorName.Signal:
        return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.signal.bind({
          bindingCanHandleChange: bindingSupportsHandleChange(binding),
          signalArgumentCount: behavior.args.length,
        }));
      case BuiltInBindingBehaviorName.Throttle:
        return this.afterTargetSubscriberEffects(
          behavior.name.name,
          bindState,
          effects,
          this.rateLimitIssue(binding, bindState, this.throttle.name),
        );
      case BuiltInBindingBehaviorName.UpdateTrigger: {
        const issue = this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.updateTrigger.bind({
          eventArgumentCount: behavior.args.length,
          bindingIsPropertyBinding: binding instanceof PropertyBinding,
          bindingAllowsTargetToSource: binding instanceof PropertyBinding
            && bindingModeAllowsTargetToSource(bindState.readBindingMode() ?? binding.bindingMode),
          hasNodeObserverConfig: binding instanceof PropertyBinding
            && bindingModeAllowsTargetToSource(bindState.readBindingMode() ?? binding.bindingMode)
            ? observerLocator.hasNodeObserverConfig(target, binding.target)
            : null,
          targetProperty: binding instanceof PropertyBinding ? binding.target : null,
        }));
        if (issue == null) {
          bindState.setTargetObserverOverride(new RuntimeBindingTargetObserverOverride(
            null,
            staticStringArguments(behavior.args),
          ));
        }
        return issue;
      }
      case BuiltInBindingBehaviorName.Validate:
        return this.afterValidateBindingEffects(behavior, bindState, effects, this.validate.bind({
          bindingIsPropertyBinding: binding instanceof PropertyBinding,
          targetIsNodeOrControllerViewModel: validateTargetIsNodeOrControllerViewModel(target),
          argumentCount: behavior.args.length,
          triggerArgument: validateTriggerArgument(behavior.args[0] ?? null),
          controllerArgument: validateControllerArgument(behavior.args[1] ?? null),
          preExtraneousArgumentsCannotThrow: validatePreExtraneousArgumentsCannotThrow(behavior),
        }));
      default:
        return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, null);
    }
  }

  private afterTargetSubscriberEffects(
    behaviorName: string,
    bindState: BindingBehaviorBindState,
    effects: RuntimeBindingBehaviorBindEffects,
    previousIssue: BuiltInBindingBehaviorBindIssue | null,
  ): BuiltInBindingBehaviorBindIssue | null {
    if (previousIssue != null || effects.directTargetSubscriberCalls === 0) {
      return previousIssue;
    }
    if (bindState.hasTargetSubscriber() || effects.directTargetSubscriberCalls > 1) {
      return {
        issueKind: RuntimeBindingBehaviorIssueKind.BindingAlreadyHasTargetSubscriber,
        message: 'More than one binding behavior path provides a PropertyBinding target subscriber.',
        frameworkErrorCode: RuntimeHtmlBindingBehaviorFrameworkErrorCode.BindingAlreadyHasTargetSubscriber,
      };
    }
    bindState.markTargetSubscriber(behaviorName);
    return null;
  }

  private afterValidateBindingEffects(
    behavior: BindingBehaviorExpression,
    bindState: BindingBehaviorBindState,
    effects: RuntimeBindingBehaviorBindEffects,
    previousIssue: BuiltInBindingBehaviorBindIssue | null,
  ): BuiltInBindingBehaviorBindIssue | null {
    return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, previousIssue)
      ?? this.validationController.propertyExpressionIssue(
        validationControllerUnsupportedExpressionKind(behavior.expression),
      );
  }

  private rateLimitIssue(
    binding: RuntimeBinding,
    bindState: BindingBehaviorBindState,
    behaviorName: RateLimitBindingBehaviorName,
  ): BuiltInBindingBehaviorBindIssue | null {
    if (!bindingSupportsRateLimit(binding)) {
      return null;
    }
    const behavior = behaviorName === this.debounce.name ? this.debounce : this.throttle;
    const issue = behavior.bind({ rateLimitAlreadyApplied: bindState.hasDifferentRateLimitBehavior(behaviorName) });
    if (issue == null) {
      bindState.markRateLimitBehavior(behaviorName);
    }
    return issue;
  }
}

function expressionChainKey(expressionProductHandle: ProductHandle, chainIndex: number): string {
  return `${expressionProductHandle}:${chainIndex}`;
}

function bindingModeAllowsTargetToSource(bindingMode: TemplateBindingMode): boolean {
  return bindingMode === TemplateBindingMode.FromView || bindingMode === TemplateBindingMode.TwoWay;
}

function bindingSupportsHandleChange(binding: RuntimeBinding): boolean {
  return binding instanceof PropertyBinding
    || binding instanceof AttributeBinding
    || binding instanceof LetBinding
    || binding instanceof InterpolationBinding
    || binding instanceof RefBinding
    || binding instanceof ContentBinding
    || binding instanceof SpreadValueBinding;
}

function bindingSupportsRateLimit(binding: RuntimeBinding): boolean {
  return bindingSupportsHandleChange(binding) || binding instanceof ListenerBinding;
}

function validateTargetIsNodeOrControllerViewModel(target: RuntimeBindingTarget): boolean | null {
  switch (target.targetKind) {
    case RuntimeBindingTargetKind.Node:
    case RuntimeBindingTargetKind.Host:
    case RuntimeBindingTargetKind.ControllerViewModel:
      return true;
    case RuntimeBindingTargetKind.BindingContext:
    case RuntimeBindingTargetKind.OverrideContext:
    case RuntimeBindingTargetKind.Controller:
    case RuntimeBindingTargetKind.StateStore:
      return false;
    case RuntimeBindingTargetKind.Unknown:
      return null;
  }
}

function validatePreExtraneousArgumentsCannotThrow(
  behavior: BindingBehaviorExpression,
): boolean {
  return validateTriggerArgument(behavior.args[0] ?? null).kind !== ValidateBindingBehaviorArgumentKind.Unknown
    && validateControllerArgument(behavior.args[1] ?? null).kind !== ValidateBindingBehaviorArgumentKind.Unknown;
}

function validateTriggerArgument(arg: IsAssign | null): ValidateBindingBehaviorArgument {
  const staticValue = staticValidationArgumentValue(arg);
  if (staticValue.kind === ValidateBindingBehaviorArgumentKind.Nullish
    || staticValue.kind === ValidateBindingBehaviorArgumentKind.Unknown) {
    return staticValue;
  }
  return typeof staticValue.value === 'string'
    ? { kind: ValidateBindingBehaviorArgumentKind.TriggerString, value: staticValue.value }
    : { kind: ValidateBindingBehaviorArgumentKind.InvalidStatic, value: staticValue.value };
}

function validateControllerArgument(arg: IsAssign | null): ValidateBindingBehaviorArgument {
  const staticValue = staticValidationArgumentValue(arg);
  return staticValue.kind === ValidateBindingBehaviorArgumentKind.Nullish
    || staticValue.kind === ValidateBindingBehaviorArgumentKind.Unknown
    ? staticValue
    : { kind: ValidateBindingBehaviorArgumentKind.InvalidStatic, value: staticValue.value };
}

function staticValidationArgumentValue(arg: IsAssign | null): ValidateBindingBehaviorArgument {
  if (arg == null || (arg.$kind === 'PrimitiveLiteral' && arg.value == null)) {
    return { kind: ValidateBindingBehaviorArgumentKind.Nullish, value: null };
  }
  if (arg.$kind === 'PrimitiveLiteral') {
    return { kind: ValidateBindingBehaviorArgumentKind.InvalidStatic, value: String(arg.value) };
  }
  if (arg.$kind === 'Template' && arg.expressions.length === 0 && arg.cooked.length === 1) {
    return { kind: ValidateBindingBehaviorArgumentKind.InvalidStatic, value: arg.cooked[0] ?? '' };
  }
  if (arg.$kind === 'ArrayLiteral' || arg.$kind === 'ObjectLiteral') {
    return { kind: ValidateBindingBehaviorArgumentKind.InvalidStatic, value: arg.$kind };
  }
  return { kind: ValidateBindingBehaviorArgumentKind.Unknown, value: null };
}

function validationControllerUnsupportedExpressionKind(
  expression: BindingBehaviorExpression['expression'],
): string | null {
  let current = expression;
  while (current.$kind !== 'AccessScope') {
    switch (current.$kind) {
      case 'BindingBehavior':
      case 'ValueConverter':
        current = current.expression;
        break;
      case 'AccessMember':
      case 'AccessKeyed':
        current = current.object;
        break;
      default:
        return current.$kind;
    }
  }
  return null;
}

function staticStringArguments(args: readonly IsAssign[]): readonly string[] | null {
  const values: string[] = [];
  for (const arg of args) {
    if (arg.$kind === 'PrimitiveLiteral' && typeof arg.value === 'string') {
      values.push(arg.value);
      continue;
    }
    if (arg.$kind === 'Template' && arg.expressions.length === 0 && arg.cooked.length === 1) {
      values.push(arg.cooked[0] ?? '');
      continue;
    }
    return null;
  }
  return values;
}
