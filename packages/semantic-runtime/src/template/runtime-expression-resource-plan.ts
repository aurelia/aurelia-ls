import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import type {
  BindingBehaviorExpression,
  IsAssign,
  ValueConverterExpression,
} from '../expression/ast.js';
import {
  bindingBehaviorProjectsThroughValueConverter,
  bindingBehaviorValueConverterProjection,
} from '../expression/binding-behavior-bind-effects.js';
import {
  BuiltInBindingBehaviorName,
  type BuiltInResource,
} from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  NodeObserverLocatorConfiguration,
  ObserverLocator,
} from '../observation/observer-locator.js';
import {
  expressionResourceOccurrences,
  isBindingBehaviorOccurrence,
  isValueConverterOccurrence,
  type ExpressionResourceOccurrence,
} from './expression-resource-occurrence.js';
import { bindingExpressionAstForProduct } from './expression-parse-product.js';
import {
  findVisibleTemplateResource,
  readBuiltInVisibleTemplateResource,
} from './compiler-resource-lookup.js';
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
import {
  RuntimeExpressionResourceApplicationOrigin,
  RuntimeExpressionResourceBindReachability,
  RuntimeExpressionResourcePhaseReachability,
} from './runtime-expression-resource.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import {
  runtimeBindingAccessTarget,
  runtimeBindingTargetController,
} from './runtime-binding-target-resolution.js';

type RateLimitBindingBehaviorName =
  | BuiltInBindingBehaviorName.Debounce
  | BuiltInBindingBehaviorName.Throttle;

type BuiltInBindingBehaviorResource = Extract<
  BuiltInResource,
  { readonly resourceKind: ResourceDefinitionKind.BindingBehavior }
>;

type BuiltInValueConverterResource = Extract<
  BuiltInResource,
  { readonly resourceKind: ResourceDefinitionKind.ValueConverter }
>;

export class RuntimeBindingTargetObserverOverride {
  constructor(
    /** Replacement observer strategy, or null when the behavior only reconfigures the selected node observer. */
    readonly strategy: RuntimeBindingTargetAccessStrategy | null,
    /** Exact replacement event names; null when authored arguments are runtime-dependent. */
    readonly eventNames: readonly string[] | null,
  ) {}
}

export class RuntimeBindingBehaviorPlanEntry {
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly origin = RuntimeExpressionResourceApplicationOrigin.Authored;

  constructor(
    readonly bindingIndex: number,
    readonly expressionIndex: number,
    readonly behaviorIndex: number,
    readonly binding: RuntimeBinding,
    readonly resource: TemplateVisibleResource | null,
    readonly builtInResource: BuiltInBindingBehaviorResource | null,
    readonly bindEffects: RuntimeBindingBehaviorBindEffects,
    readonly expressionProductHandle: ProductHandle,
    readonly occurrence: ExpressionResourceOccurrence<BindingBehaviorExpression>,
    /** Depth in the authored AST, excluding any bind-time resource projection. */
    readonly authoredChainDepth: number,
    /** Depth in the runtime AST after reached binding-behavior projections. */
    readonly runtimeChainDepth: number,
    readonly bindReachability: RuntimeExpressionResourceBindReachability,
    readonly bindOrder: number | null,
    readonly phaseOrder: number | null,
    readonly issue: BuiltInBindingBehaviorBindIssue | null,
  ) {}
}

export class RuntimeValueConverterPlanEntry {
  readonly resourceKind = ResourceDefinitionKind.ValueConverter;

  constructor(
    readonly bindingIndex: number,
    readonly expressionIndex: number,
    readonly converterIndex: number,
    readonly binding: RuntimeBinding,
    readonly resource: TemplateVisibleResource | null,
    readonly builtInResource: BuiltInValueConverterResource | null,
    readonly expressionProductHandle: ProductHandle,
    readonly expression: ValueConverterExpression,
    /** Authored behavior that inserted this converter during bind, or null for an authored converter. */
    readonly projectedByBehavior: BindingBehaviorExpression | null,
    readonly chainIndex: number,
    /** Null for a converter inserted by a reached binding behavior. */
    readonly authoredChainDepth: number | null,
    /** Depth in the runtime AST after reached binding-behavior projections. */
    readonly runtimeChainDepth: number,
    readonly origin: RuntimeExpressionResourceApplicationOrigin,
    readonly bindReachability: RuntimeExpressionResourceBindReachability,
    readonly bindOrder: number | null,
  ) {}
}

export type RuntimeExpressionResourcePlanEntry =
  | RuntimeBindingBehaviorPlanEntry
  | RuntimeValueConverterPlanEntry;

class RuntimeValueConverterPhaseOrder {
  constructor(
    readonly toView: number,
    readonly fromView: number,
  ) {}
}

/** One authority for runtime expression-resource order, reachability, and pre-access binding state. */
export class RuntimeExpressionResourcePlan {
  static readonly empty = new RuntimeExpressionResourcePlan([], new Map(), new Map());

  private readonly effectiveModesByExpression = new Map<ProductHandle, TemplateBindingMode>();
  private readonly targetObserverOverridesByBinding = new Map<ProductHandle, RuntimeBindingTargetObserverOverride>();
  private readonly converterPhaseOrders = new Map<RuntimeValueConverterPlanEntry, RuntimeValueConverterPhaseOrder>();
  private readonly failedBindChains = new Set<string>();
  private readonly behaviorEntriesByExpression = new Map<BindingBehaviorExpression, RuntimeBindingBehaviorPlanEntry[]>();
  private readonly projectedConvertersByBehavior = new Map<BindingBehaviorExpression, RuntimeValueConverterPlanEntry[]>();
  readonly behaviorEntries: readonly RuntimeBindingBehaviorPlanEntry[];
  readonly converterEntries: readonly RuntimeValueConverterPlanEntry[];

  constructor(
    readonly entries: readonly RuntimeExpressionResourcePlanEntry[],
    effectiveModesByExpression: ReadonlyMap<ProductHandle, TemplateBindingMode>,
    targetObserverOverridesByBinding: ReadonlyMap<ProductHandle, RuntimeBindingTargetObserverOverride>,
  ) {
    for (const [expressionProductHandle, mode] of effectiveModesByExpression) {
      this.effectiveModesByExpression.set(expressionProductHandle, mode);
    }
    for (const [bindingProductHandle, override] of targetObserverOverridesByBinding) {
      this.targetObserverOverridesByBinding.set(bindingProductHandle, override);
    }
    this.behaviorEntries = entries.filter(isBindingBehaviorPlanEntry);
    this.converterEntries = entries.filter(isValueConverterPlanEntry);
    for (const entry of this.behaviorEntries) {
      appendPlanEntry(this.behaviorEntriesByExpression, entry.occurrence.expression, entry);
    }
    for (const entry of this.converterEntries) {
      if (entry.projectedByBehavior != null) {
        appendPlanEntry(this.projectedConvertersByBehavior, entry.projectedByBehavior, entry);
      }
    }
    for (const entry of entries) {
      if (entry.bindReachability !== RuntimeExpressionResourceBindReachability.Reached
        || (isBindingBehaviorPlanEntry(entry) && entry.issue != null)
        || (isValueConverterPlanEntry(entry) && entry.resource == null)) {
        this.failedBindChains.add(expressionChainKey(entry.expressionProductHandle, chainIndexForPlanEntry(entry)));
      }
    }
    const convertersByChain = new Map<string, RuntimeValueConverterPlanEntry[]>();
    for (const entry of this.converterEntries) {
      const key = expressionChainKey(entry.expressionProductHandle, entry.chainIndex);
      if (entry.bindReachability !== RuntimeExpressionResourceBindReachability.Reached
        || entry.resource == null
        || this.failedBindChains.has(key)) {
        continue;
      }
      const converters = convertersByChain.get(key) ?? [];
      converters.push(entry);
      convertersByChain.set(key, converters);
    }
    for (const converters of convertersByChain.values()) {
      converters.forEach((entry, index) => {
        this.converterPhaseOrders.set(
          entry,
          new RuntimeValueConverterPhaseOrder(converters.length - index - 1, index),
        );
      });
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

  readValueConverterPhaseOrder(
    entry: RuntimeValueConverterPlanEntry,
  ): RuntimeValueConverterPhaseOrder | null {
    return this.converterPhaseOrders.get(entry) ?? null;
  }

  /** Reachability after the complete `astBind(...)` chain, before conversion or teardown can run. */
  readPostBindPhaseReachability(
    entry: RuntimeExpressionResourcePlanEntry,
  ): RuntimeExpressionResourcePhaseReachability {
    if (entry.bindReachability !== RuntimeExpressionResourceBindReachability.Reached) {
      return RuntimeExpressionResourcePhaseReachability.BlockedByOuterFailure;
    }
    return this.failedBindChains.has(expressionChainKey(entry.expressionProductHandle, chainIndexForPlanEntry(entry)))
      ? RuntimeExpressionResourcePhaseReachability.BlockedByBindFailure
      : RuntimeExpressionResourcePhaseReachability.Reached;
  }

  /** Unique runtime application for one authored behavior AST, or null when reused applications disagree. */
  readBindingBehaviorEntry(
    expression: BindingBehaviorExpression,
  ): RuntimeBindingBehaviorPlanEntry | null {
    const entries = this.behaviorEntriesByExpression.get(expression) ?? [];
    return entries.length === 1 ? entries[0]! : null;
  }

  /** Unique converter inserted by one reached binding behavior, if that behavior projected through a converter. */
  readProjectedConverterForBindingBehavior(
    expression: BindingBehaviorExpression,
  ): RuntimeValueConverterPlanEntry | null {
    const entries = this.projectedConvertersByBehavior.get(expression) ?? [];
    return entries.length === 1 ? entries[0]! : null;
  }
}

export class RuntimeExpressionResourcePlanningRequest {
  constructor(
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly resourceScope: TemplateResourceScope | null,
    readonly nodeObserverLocatorConfiguration: NodeObserverLocatorConfiguration | null,
    readonly expressionWorld: CheckerExpressionTypeWorld,
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
  nextRuntimeChainDepth = 0;
  nextBindOrder = 0;

  constructor(initialMode: TemplateBindingMode | null) {
    this.bindState = new BindingBehaviorBindState(initialMode);
  }
}

/** Plans framework `astBind(...)` behavior effects before target observer/accessor selection. */
export class RuntimeExpressionResourcePlanner {
  private readonly attr = new AttrBindingBehavior();
  private readonly debounce = new DebounceBindingBehavior();
  private readonly self = new SelfBindingBehavior();
  private readonly signal = new SignalBindingBehavior();
  private readonly throttle = new ThrottleBindingBehavior();
  private readonly updateTrigger = new UpdateTriggerBindingBehavior();
  private readonly validate = new ValidateBindingBehavior();
  private readonly validationController = new ValidationController();

  constructor(readonly store: KernelStore) {}

  plan(input: RuntimeExpressionResourcePlanningRequest): RuntimeExpressionResourcePlan {
    const entries: RuntimeExpressionResourcePlanEntry[] = [];
    const effectiveModesByExpression = new Map<ProductHandle, TemplateBindingMode>();
    const targetObserverOverridesByBinding = new Map<ProductHandle, RuntimeBindingTargetObserverOverride>();
    const bindEffects = new RuntimeBindingBehaviorBindEffectReader(input.expressionWorld.projector.publication);
    const observerLocator = new ObserverLocator(
      this.store,
      input.expressionWorld.projector,
      input.nodeObserverLocatorConfiguration ?? NodeObserverLocatorConfiguration.empty,
    );

    for (const [bindingIndex, binding] of input.runtimeRendering.bindings.entries()) {
      const targetController = runtimeBindingTargetController(input.runtimeRendering, binding);
      const target = runtimeBindingAccessTarget(input.expressionWorld.projector.publication, binding, targetController);
      const expressionProductHandles = expressionProductHandlesForRuntimeBinding(binding);
      for (const [expressionIndex, expressionProductHandle] of expressionProductHandles.entries()) {
        const ast = bindingExpressionAstForProduct(input.expressionWorld.projector.publication, expressionProductHandle);
        if (ast == null) {
          continue;
        }
        const chainStates = new Map<number, BindingBehaviorChainState>();
        let behaviorIndex = 0;
        let converterIndex = 0;
        for (const occurrence of expressionResourceOccurrences(ast)) {
          let chainState = chainStates.get(occurrence.chainIndex);
          if (chainState == null) {
            chainState = new BindingBehaviorChainState(binding instanceof PropertyBinding ? binding.bindingMode : null);
            chainStates.set(occurrence.chainIndex, chainState);
          }
          const reached = !chainState.blocked;
          const runtimeChainDepth = chainState.nextRuntimeChainDepth++;
          const bindOrder = reached ? chainState.nextBindOrder++ : null;
          if (isBindingBehaviorOccurrence(occurrence)) {
            const resource = findVisibleTemplateResource(
              input.resourceScope,
              ResourceDefinitionKind.BindingBehavior,
              occurrence.expression.name.name,
            );
            const builtInResource = asBuiltInBindingBehaviorResource(
              readBuiltInVisibleTemplateResource(input.expressionWorld.projector.publication, resource),
            );
            const resourceBindEffects = bindEffects.readEffects(resource);
            const issue = reached
              ? this.issueForBindingBehavior(
                  binding,
                  target,
                  observerLocator,
                  occurrence,
                  chainState.bindState,
                  resourceBindEffects,
                  resource,
                  builtInResource,
                )
              : null;
            entries.push(new RuntimeBindingBehaviorPlanEntry(
              bindingIndex,
              expressionIndex,
              behaviorIndex++,
              binding,
              resource,
              builtInResource,
              resourceBindEffects,
              expressionProductHandle,
              occurrence,
              occurrence.chainDepth,
              runtimeChainDepth,
              reached
                ? RuntimeExpressionResourceBindReachability.Reached
                : RuntimeExpressionResourceBindReachability.BlockedByOuterFailure,
              bindOrder,
              bindOrder,
              issue,
            ));
            if (reached && issue != null) {
              chainState.blocked = true;
              continue;
            }
            if (reached
              && builtInResource != null
              && bindingBehaviorProjectsThroughValueConverter(occurrence.expression)) {
              const projected = bindingBehaviorValueConverterProjection(occurrence.expression);
              const projectedResource = findVisibleTemplateResource(
                input.resourceScope,
                ResourceDefinitionKind.ValueConverter,
                projected.name.name,
              );
              const projectedBuiltInResource = asBuiltInValueConverterResource(
                readBuiltInVisibleTemplateResource(input.expressionWorld.projector.publication, projectedResource),
              );
              entries.push(new RuntimeValueConverterPlanEntry(
                bindingIndex,
                expressionIndex,
                converterIndex++,
                binding,
                projectedResource,
                projectedBuiltInResource,
                expressionProductHandle,
                projected,
                occurrence.expression,
                occurrence.chainIndex,
                null,
                chainState.nextRuntimeChainDepth++,
                RuntimeExpressionResourceApplicationOrigin.BindingBehaviorProjection,
                RuntimeExpressionResourceBindReachability.Reached,
                chainState.nextBindOrder++,
              ));
              if (projectedResource == null) {
                chainState.blocked = true;
              }
            }
            continue;
          }

          if (!isValueConverterOccurrence(occurrence)) {
            continue;
          }
          const resource = findVisibleTemplateResource(
            input.resourceScope,
            ResourceDefinitionKind.ValueConverter,
            occurrence.expression.name.name,
          );
          const builtInResource = asBuiltInValueConverterResource(
            readBuiltInVisibleTemplateResource(input.expressionWorld.projector.publication, resource),
          );
          entries.push(new RuntimeValueConverterPlanEntry(
            bindingIndex,
            expressionIndex,
            converterIndex++,
            binding,
            resource,
            builtInResource,
            expressionProductHandle,
            occurrence.expression,
            null,
            occurrence.chainIndex,
            occurrence.chainDepth,
            runtimeChainDepth,
            RuntimeExpressionResourceApplicationOrigin.Authored,
            reached
              ? RuntimeExpressionResourceBindReachability.Reached
              : RuntimeExpressionResourceBindReachability.BlockedByOuterFailure,
            bindOrder,
          ));
          if (reached && resource == null) {
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

    return new RuntimeExpressionResourcePlan(entries, effectiveModesByExpression, targetObserverOverridesByBinding);
  }

  private issueForBindingBehavior(
    binding: RuntimeBinding,
    target: RuntimeBindingTarget,
    observerLocator: ObserverLocator,
    occurrence: ExpressionResourceOccurrence<BindingBehaviorExpression>,
    bindState: BindingBehaviorBindState,
    effects: RuntimeBindingBehaviorBindEffects,
    resource: TemplateVisibleResource | null,
    builtInResource: BuiltInBindingBehaviorResource | null,
  ): BuiltInBindingBehaviorBindIssue | null {
    const behavior = occurrence.expression;
    if (resource == null) {
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
    if (builtInResource == null) {
      return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, null);
    }
    const bindingMode = bindingModeForBindingBehaviorName(builtInResource.name);
    if (bindingMode != null) {
      bindState.setBindingMode(bindingMode);
      return null;
    }
    switch (builtInResource.name) {
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

function asBuiltInBindingBehaviorResource(
  resource: BuiltInResource | null,
): BuiltInBindingBehaviorResource | null {
  return resource?.resourceKind === ResourceDefinitionKind.BindingBehavior ? resource : null;
}

function asBuiltInValueConverterResource(
  resource: BuiltInResource | null,
): BuiltInValueConverterResource | null {
  return resource?.resourceKind === ResourceDefinitionKind.ValueConverter ? resource : null;
}

function isBindingBehaviorPlanEntry(
  entry: RuntimeExpressionResourcePlanEntry,
): entry is RuntimeBindingBehaviorPlanEntry {
  return entry.resourceKind === ResourceDefinitionKind.BindingBehavior;
}

function isValueConverterPlanEntry(
  entry: RuntimeExpressionResourcePlanEntry,
): entry is RuntimeValueConverterPlanEntry {
  return entry.resourceKind === ResourceDefinitionKind.ValueConverter;
}

function expressionChainKey(expressionProductHandle: ProductHandle, chainIndex: number): string {
  return `${expressionProductHandle}:${chainIndex}`;
}

function chainIndexForPlanEntry(entry: RuntimeExpressionResourcePlanEntry): number {
  return isBindingBehaviorPlanEntry(entry)
    ? entry.occurrence.chainIndex
    : entry.chainIndex;
}

function appendPlanEntry<TKey, TValue>(
  index: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue,
): void {
  const values = index.get(key) ?? [];
  values.push(value);
  index.set(key, values);
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
