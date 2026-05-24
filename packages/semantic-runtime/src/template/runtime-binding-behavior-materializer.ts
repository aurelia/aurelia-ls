import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  type BindingBehaviorExpression,
  type IsAssign,
} from '../expression/ast.js';
import {
  bindingBehaviorExpressions,
} from './binding-behavior-expression.js';
import { bindingExpressionAstForProduct } from './expression-parse-product.js';
import { TemplateProductDetails } from './product-details.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
  LetBinding,
  ListenerBinding,
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetKind,
  RefBinding,
  PropertyBinding,
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingTargetAccess,
} from './runtime-binding.js';
import { TemplateBindingMode } from './instruction-ir.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import type { RuntimeControllerBindEmission } from './runtime-controller-bind-materializer.js';
import type { TemplateResourceScope } from './compiler-world.js';
import {
  AttrBindingBehavior,
  DebounceBindingBehavior,
  RuntimeBindingBehaviorApplication,
  RuntimeBindingBehaviorApplicationPhase,
  RuntimeBindingBehaviorIssue,
  RuntimeBindingBehaviorIssueKind,
  RuntimeBindingBehaviorIssuePhase,
  SelfBindingBehavior,
  SignalBindingBehavior,
  ThrottleBindingBehavior,
  UpdateTriggerBindingBehavior,
  ValidateBindingBehavior,
  ValidateBindingBehaviorArgumentKind,
  ValidationController,
  type BuiltInBindingBehaviorBindIssue,
  type ValidateBindingBehaviorArgument,
} from './runtime-binding-behavior.js';
import {
  RuntimeBindingBehaviorBindEffectReader,
  type RuntimeBindingBehaviorBindEffects,
} from './runtime-binding-behavior-effect.js';
import { RuntimeHtmlBindingBehaviorFrameworkErrorCode } from './framework-error-code.js';
import { expressionProductHandlesForRuntimeBinding } from './runtime-binding-expression-products.js';
import { sourceAddressForRuntimeExpressionSpan } from './runtime-expression-source-address.js';
import { appendRuntimeBindingProductValue } from './runtime-binding-product-index.js';
import {
  bindingModeForBindingBehaviorName,
} from './runtime-binding-mode-behavior.js';

export class RuntimeBindingBehaviorMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly controllerBind: RuntimeControllerBindEmission,
    readonly resourceScope: TemplateResourceScope | null,
  ) {}
}

export class RuntimeBindingBehaviorEmission {
  private readonly applicationsByBinding = new Map<string, RuntimeBindingBehaviorApplication[]>();
  private readonly issuesByBinding = new Map<string, RuntimeBindingBehaviorIssue[]>();

  constructor(
    readonly applications: readonly RuntimeBindingBehaviorApplication[],
    readonly issues: readonly RuntimeBindingBehaviorIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const application of applications) {
      if (application.binding.productHandle == null) {
        continue;
      }
      appendRuntimeBindingProductValue(this.applicationsByBinding, application.binding.productHandle, application);
    }
    for (const issue of issues) {
      if (issue.binding.productHandle == null) {
        continue;
      }
      appendRuntimeBindingProductValue(this.issuesByBinding, issue.binding.productHandle, issue);
    }
  }

  readApplicationsForBinding(productHandle: ProductHandle): readonly RuntimeBindingBehaviorApplication[] {
    return this.applicationsByBinding.get(productHandle) ?? [];
  }

  readIssuesForBinding(productHandle: ProductHandle): readonly RuntimeBindingBehaviorIssue[] {
    return this.issuesByBinding.get(productHandle) ?? [];
  }
}

class RuntimeBindingBehaviorSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class RuntimeBindingBehaviorPublication {
  constructor(
    readonly application: RuntimeBindingBehaviorApplication,
    readonly issues: readonly RuntimeBindingBehaviorIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class BindingBehaviorBindState {
  private rateLimitBehaviorName: 'debounce' | 'throttle' | null = null;
  private targetSubscriberBehaviorName: string | null = null;

  constructor(
    private currentBindingMode: TemplateBindingMode | null,
  ) {}

  readBindingMode(): TemplateBindingMode | null {
    return this.currentBindingMode;
  }

  setBindingMode(bindingMode: TemplateBindingMode): void {
    this.currentBindingMode = bindingMode;
  }

  hasDifferentRateLimitBehavior(behaviorName: 'debounce' | 'throttle'): boolean {
    return this.rateLimitBehaviorName != null
      && this.rateLimitBehaviorName !== behaviorName;
  }

  markRateLimitBehavior(behaviorName: 'debounce' | 'throttle'): void {
    this.rateLimitBehaviorName ??= behaviorName;
  }

  hasTargetSubscriber(): boolean {
    return this.targetSubscriberBehaviorName != null;
  }

  markTargetSubscriber(behaviorName: string): void {
    this.targetSubscriberBehaviorName ??= behaviorName;
  }
}

/** Materializes runtime binding-behavior applications after Controller.bind target facts exist. */
export class RuntimeBindingBehaviorMaterializer {
  private readonly attr = new AttrBindingBehavior();
  private readonly debounce = new DebounceBindingBehavior();
  private readonly self = new SelfBindingBehavior();
  private readonly signal = new SignalBindingBehavior();
  private readonly throttle = new ThrottleBindingBehavior();
  private readonly updateTrigger = new UpdateTriggerBindingBehavior();
  private readonly validate = new ValidateBindingBehavior();
  private readonly validationController = new ValidationController();

  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(input: RuntimeBindingBehaviorMaterializationRequest): RuntimeBindingBehaviorEmission {
    const emission = this.recordsForBindingBehaviors(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `binding-behavior:${input.localKey}`));
    }
    for (const application of emission.applications) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingBehaviorApplication, application.productHandle, application);
    }
    for (const issue of emission.issues) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingBehaviorIssue, issue.productHandle, issue);
    }
    return emission;
  }

  private recordsForBindingBehaviors(
    input: RuntimeBindingBehaviorMaterializationRequest,
  ): RuntimeBindingBehaviorEmission {
    const source = this.recordsForSource(input.localKey);
    const bindEffects = new RuntimeBindingBehaviorBindEffectReader(this.store, input.resourceScope);
    const applications: RuntimeBindingBehaviorApplication[] = [];
    const issues: RuntimeBindingBehaviorIssue[] = [];
    const records: KernelStoreRecord[] = [...source.records];

    input.runtimeRendering.bindings.forEach((binding, bindingIndex) => {
      const targetAccess = firstTargetAccess(input.controllerBind, binding);
      expressionProductHandlesForRuntimeBinding(binding).forEach((expressionProductHandle, expressionIndex) => {
        const ast = bindingExpressionAstForProduct(this.store, expressionProductHandle);
        if (ast == null) {
          return;
        }
        const bindState = new BindingBehaviorBindState(binding instanceof PropertyBinding ? binding.bindingMode : null);
        const behaviors = bindingBehaviorExpressions(ast);
        for (let behaviorIndex = 0; behaviorIndex < behaviors.length; behaviorIndex++) {
          const behavior = behaviors[behaviorIndex]!;
          const publication = this.bindingBehaviorPublication(
            `${input.localKey}:binding:${bindingIndex}:expression:${expressionIndex}:behavior:${behaviorIndex}:${behavior.name.name}`,
            binding,
            targetAccess,
            behavior,
            bindState,
            bindEffects,
            source,
          );
          if (publication == null) {
            continue;
          }
          applications.push(publication.application);
          issues.push(...publication.issues);
          records.push(...publication.records);
          if (publication.issues.length > 0) {
            break;
          }
        }
      });
    });

    return new RuntimeBindingBehaviorEmission(applications, issues, records);
  }

  private bindingBehaviorPublication(
    local: string,
    binding: RuntimeBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    behavior: BindingBehaviorExpression,
    bindState: BindingBehaviorBindState,
    bindEffects: RuntimeBindingBehaviorBindEffectReader,
    source: RuntimeBindingBehaviorSourceSet,
  ): RuntimeBindingBehaviorPublication | null {
    const resource = bindEffects.findResource(behavior.name.name);
    const effects = bindEffects.readEffects(resource);
    const issue = this.issueForBindingBehavior(binding, targetAccess, behavior, bindState, effects, resource != null);
    if (issue === undefined) {
      return null;
    }
    const expressionSource = sourceAddressForRuntimeExpressionSpan(
      this.store,
      local,
      binding.sourceAddressHandle,
      behavior.name.span,
    );
    const application = this.applicationProduct(local, binding, targetAccess, behavior, expressionSource.handle, source);
    const issueProduct = issue == null
      ? null
      : this.issueProduct(`${local}:issue:${issue.issueKind}`, application, binding, targetAccess, issue, expressionSource.handle, source);
    return new RuntimeBindingBehaviorPublication(
      application,
      issueProduct == null ? [] : [issueProduct],
      [
        ...expressionSource.records,
        ...recordsForApplication(application, binding.identityHandle, source.provenanceHandle),
        ...(issueProduct == null
          ? []
          : recordsForIssue(issueProduct, application.identityHandle, source.provenanceHandle)),
      ],
    );
  }

  private issueForBindingBehavior(
    binding: RuntimeBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    behavior: BindingBehaviorExpression,
    bindState: BindingBehaviorBindState,
    effects: RuntimeBindingBehaviorBindEffects,
    resourceResolved: boolean,
  ): BuiltInBindingBehaviorBindIssue | null | undefined {
    const bindingModeBehaviorMode = bindingModeForBindingBehaviorName(behavior.name.name);
    if (bindingModeBehaviorMode != null) {
      if (!resourceResolved) {
        return undefined;
      }
      bindState.setBindingMode(bindingModeBehaviorMode);
      return null;
    }
    switch (behavior.name.name) {
      case 'attr':
        return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.attr.bind({
          bindingIsPropertyBinding: binding instanceof PropertyBinding,
        }));
      case 'debounce':
        return this.afterTargetSubscriberEffects(
          behavior.name.name,
          bindState,
          effects,
          this.rateLimitIssue(binding, bindState, this.debounce.name),
        );
      case 'self':
        return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.self.bind({
          bindingIsListenerBinding: binding instanceof ListenerBinding,
        }));
      case 'signal':
        return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.signal.bind({
          bindingCanHandleChange: bindingSupportsHandleChange(binding),
          signalArgumentCount: behavior.args.length,
        }));
      case 'throttle':
        return this.afterTargetSubscriberEffects(
          behavior.name.name,
          bindState,
          effects,
          this.rateLimitIssue(binding, bindState, this.throttle.name),
        );
      case 'updateTrigger':
        return this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, this.updateTrigger.bind({
          eventArgumentCount: behavior.args.length,
          bindingIsPropertyBinding: binding instanceof PropertyBinding,
          bindingAllowsTargetToSource: binding instanceof PropertyBinding
            && bindingModeAllowsTargetToSource(bindState.readBindingMode() ?? binding.bindingMode),
          hasNodeObserverConfig: binding instanceof PropertyBinding
            && bindingModeAllowsTargetToSource(bindState.readBindingMode() ?? binding.bindingMode)
            ? targetAccessHasNodeObserverConfig(targetAccess)
            : null,
          targetProperty: binding instanceof PropertyBinding ? binding.target : null,
        }));
      case 'validate':
        if (!resourceResolved) {
          return undefined;
        }
        return this.afterValidateBindingEffects(behavior, bindState, effects, this.validate.bind({
          bindingIsPropertyBinding: binding instanceof PropertyBinding,
          targetIsNodeOrControllerViewModel: validateTargetIsNodeOrControllerViewModel(targetAccess),
          argumentCount: behavior.args.length,
          triggerArgument: validateTriggerArgument(behavior.args[0] ?? null),
          controllerArgument: validateControllerArgument(behavior.args[1] ?? null),
          preExtraneousArgumentsCannotThrow: validatePreExtraneousArgumentsCannotThrow(behavior),
        }));
      default:
        return resourceResolved
          ? this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, null)
          : undefined;
    }
  }

  private afterTargetSubscriberEffects(
    behaviorName: string,
    bindState: BindingBehaviorBindState,
    effects: RuntimeBindingBehaviorBindEffects,
    previousIssue: BuiltInBindingBehaviorBindIssue | null,
  ): BuiltInBindingBehaviorBindIssue | null {
    if (previousIssue != null) {
      return previousIssue;
    }
    if (effects.directTargetSubscriberCalls === 0) {
      return null;
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
    const bindIssue = this.afterTargetSubscriberEffects(behavior.name.name, bindState, effects, previousIssue);
    return bindIssue
      ?? this.validationController.propertyExpressionIssue(validationControllerUnsupportedExpressionKind(behavior.expression));
  }

  private rateLimitIssue(
    binding: RuntimeBinding,
    bindState: BindingBehaviorBindState,
    behaviorName: 'debounce' | 'throttle',
  ): BuiltInBindingBehaviorBindIssue | null {
    if (!bindingSupportsRateLimit(binding)) {
      return null;
    }
    const behavior = behaviorName === this.debounce.name ? this.debounce : this.throttle;
    const issue = behavior.bind({
      rateLimitAlreadyApplied: bindState.hasDifferentRateLimitBehavior(behaviorName),
    });
    if (issue == null) {
      bindState.markRateLimitBehavior(behaviorName);
    }
    return issue;
  }

  private applicationProduct(
    local: string,
    binding: RuntimeBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    behavior: BindingBehaviorExpression,
    sourceAddressHandle: AddressHandle | null,
    source: RuntimeBindingBehaviorSourceSet,
  ): RuntimeBindingBehaviorApplication {
    return new RuntimeBindingBehaviorApplication(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      binding.toReference(),
      targetAccess?.toReference() ?? null,
      RuntimeBindingBehaviorApplicationPhase.Bind,
      behavior.name.name,
      behavior.args.length,
      behavior.args.flatMap(staticArgumentValueForArg),
      sourceAddressHandle,
    );
  }

  private issueProduct(
    local: string,
    application: RuntimeBindingBehaviorApplication,
    binding: RuntimeBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    issue: BuiltInBindingBehaviorBindIssue,
    sourceAddressHandle: AddressHandle | null,
    source: RuntimeBindingBehaviorSourceSet,
  ): RuntimeBindingBehaviorIssue {
    return new RuntimeBindingBehaviorIssue(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      application.toReference(),
      binding.toReference(),
      targetAccess?.toReference() ?? null,
      RuntimeBindingBehaviorIssuePhase.Bind,
      issue.issueKind,
      issue.message,
      issue.frameworkErrorCode,
      sourceAddressHandle,
    );
  }

  private recordsForSource(local: string): RuntimeBindingBehaviorSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-behavior:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-behavior:${local}`);
    return new RuntimeBindingBehaviorSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime binding-behavior materialization from rendered bindings and Controller.bind target facts.',
          null,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }
}

function recordsForApplication(
  application: RuntimeBindingBehaviorApplication,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      application.identityHandle,
      KernelVocabulary.Binding.BehaviorApplication.key,
      ownerIdentityHandle,
      application.sourceAddressHandle,
      application.behaviorName,
    ),
    new MaterializedProduct(
      application.productHandle,
      KernelVocabulary.Binding.BehaviorApplication.key,
      application.identityHandle,
      application.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function recordsForIssue(
  issue: RuntimeBindingBehaviorIssue,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      issue.identityHandle,
      KernelVocabulary.Binding.BehaviorIssue.key,
      ownerIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Binding.BehaviorIssue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function firstTargetAccess(
  controllerBind: RuntimeControllerBindEmission,
  binding: RuntimeBinding,
): RuntimeBindingTargetAccess | null {
  return controllerBind.readTargetAccessesForBinding(binding.productHandle)[0] ?? null;
}

function bindingModeAllowsTargetToSource(bindingMode: TemplateBindingMode): boolean {
  return bindingMode === TemplateBindingMode.FromView
    || bindingMode === TemplateBindingMode.TwoWay;
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
  return bindingSupportsHandleChange(binding)
    || binding instanceof ListenerBinding;
}

function targetAccessHasNodeObserverConfig(targetAccess: RuntimeBindingTargetAccess | null): boolean | null {
  if (targetAccess == null) {
    return null;
  }
  switch (targetAccess.strategy) {
    case RuntimeBindingTargetAccessStrategy.CheckedObserver:
    case RuntimeBindingTargetAccessStrategy.SelectValueObserver:
    case RuntimeBindingTargetAccessStrategy.ValueAttributeObserver:
      return true;
    default:
      return false;
  }
}

function validateTargetIsNodeOrControllerViewModel(targetAccess: RuntimeBindingTargetAccess | null): boolean | null {
  if (targetAccess == null) {
    return null;
  }
  switch (targetAccess.targetKind) {
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

function validatePreExtraneousArgumentsCannotThrow(behavior: BindingBehaviorExpression): boolean {
  return validateTriggerArgument(behavior.args[0] ?? null).kind !== ValidateBindingBehaviorArgumentKind.Unknown
    && validateControllerArgument(behavior.args[1] ?? null).kind !== ValidateBindingBehaviorArgumentKind.Unknown;
}

function validateTriggerArgument(arg: IsAssign | null): ValidateBindingBehaviorArgument {
  const staticValue = staticValidationArgumentValue(arg);
  if (staticValue.kind === ValidateBindingBehaviorArgumentKind.Nullish
    || staticValue.kind === ValidateBindingBehaviorArgumentKind.Unknown) {
    return staticValue;
  }
  if (typeof staticValue.value === 'string') {
    return {
      kind: ValidateBindingBehaviorArgumentKind.TriggerString,
      value: staticValue.value,
    };
  }
  return {
    kind: ValidateBindingBehaviorArgumentKind.InvalidStatic,
    value: staticValue.value,
  };
}

function validateControllerArgument(arg: IsAssign | null): ValidateBindingBehaviorArgument {
  const staticValue = staticValidationArgumentValue(arg);
  if (staticValue.kind === ValidateBindingBehaviorArgumentKind.Nullish
    || staticValue.kind === ValidateBindingBehaviorArgumentKind.Unknown) {
    return staticValue;
  }
  return {
    kind: ValidateBindingBehaviorArgumentKind.InvalidStatic,
    value: staticValue.value,
  };
}

function staticValidationArgumentValue(arg: IsAssign | null): ValidateBindingBehaviorArgument {
  if (arg == null) {
    return {
      kind: ValidateBindingBehaviorArgumentKind.Nullish,
      value: null,
    };
  }
  if (arg.$kind === 'PrimitiveLiteral') {
    if (arg.value == null) {
      return {
        kind: ValidateBindingBehaviorArgumentKind.Nullish,
        value: null,
      };
    }
    return {
      kind: ValidateBindingBehaviorArgumentKind.InvalidStatic,
      value: String(arg.value),
    };
  }
  if (arg.$kind === 'Template' && arg.expressions.length === 0 && arg.cooked.length === 1) {
    return {
      kind: ValidateBindingBehaviorArgumentKind.InvalidStatic,
      value: arg.cooked[0] ?? '',
    };
  }
  if (arg.$kind === 'ArrayLiteral' || arg.$kind === 'ObjectLiteral') {
    return {
      kind: ValidateBindingBehaviorArgumentKind.InvalidStatic,
      value: arg.$kind,
    };
  }
  return {
    kind: ValidateBindingBehaviorArgumentKind.Unknown,
    value: null,
  };
}

function validationControllerUnsupportedExpressionKind(
  expression: BindingBehaviorExpression['expression'],
): string | null {
  let current: BindingBehaviorExpression['expression'] | null = expression;
  while (current != null && current.$kind !== 'AccessScope') {
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

function staticArgumentValueForArg(arg: IsAssign): readonly string[] {
  if (arg.$kind === 'PrimitiveLiteral') {
    return [String(arg.value)];
  }
  if (arg.$kind === 'Template' && arg.expressions.length === 0 && arg.cooked.length === 1) {
    const cooked = arg.cooked[0];
    return cooked == null ? [] : [cooked];
  }
  return [];
}
