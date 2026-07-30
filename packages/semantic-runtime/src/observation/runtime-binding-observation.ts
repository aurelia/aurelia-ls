import type { BindingScopeReference } from '../configuration/scope.js';
import type {
  AddressHandle,
  HotDetailHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  CheckerTypeMemberKind,
  CheckerTypeReference,
} from '../type-system/type-shape.js';
import type {
  RuntimeBindingReference,
  RuntimeBindingSourceOperationReference,
  RuntimeBindingTargetAccessReference,
  RuntimeBindingTargetOperationReference,
  RuntimeNodeObserverConfigFieldState,
} from '../template/runtime-binding.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { CheckerExpressionTypeOpenKind } from '../type-system/expression-type-evaluation.js';
import type { RuntimeValueConverterWritebackStageState } from '../type-system/value-converter-writeback.js';
import type {
  RuntimeExpressionResourceApplicationOrigin,
} from '../template/runtime-expression-resource.js';
import type {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from '../runtime-expression/runtime-operation.js';
import type { RuntimeValueConverterApplicationReference } from '../template/runtime-value-converter.js';
import type { ObservationFrameworkErrorCode } from './framework-error-code.js';

export const enum RuntimeBindingValueChannelKind {
  RawProperty = 'raw-property',
  /** Property transport governed by ValueAttributeObserver nullish/default and readonly policy. */
  ValueAttributeObserverProperty = 'value-attribute-observer-property',
  RefTarget = 'ref-target',
  ScopeSlot = 'scope-slot',
  TextContent = 'text-content',
  AttributeValue = 'attribute-value',
  ClassAttributeTokens = 'class-attribute-tokens',
  ClassToggle = 'class-toggle',
  StyleAttributeRules = 'style-attribute-rules',
  StylePropertyValue = 'style-property-value',
  TemplateControllerTruthiness = 'template-controller-truthiness',
  TemplateControllerValueScope = 'template-controller-value-scope',
  TemplateControllerSwitchValue = 'template-controller-switch-value',
  TemplateControllerSwitchCaseValue = 'template-controller-switch-case-value',
  TemplateControllerPromiseValue = 'template-controller-promise-value',
  TemplateControllerPromiseBranchValue = 'template-controller-promise-branch-value',
  TemplateControllerIteration = 'template-controller-iteration',
  SelectSingleOptionValue = 'select-single-option-value',
  SelectMultipleOptionValues = 'select-multiple-option-values',
  SelectDynamicOptionValue = 'select-dynamic-option-value',
  CheckedBoolean = 'checked-boolean',
  CheckedRadioValue = 'checked-radio-value',
  CheckedCollectionMembership = 'checked-collection-membership',
  CheckedMapKeyedBoolean = 'checked-map-keyed-boolean',
  CheckedDynamicModelValue = 'checked-dynamic-model-value',
  CheckedModel = 'checked-model',
  ElementModelValue = 'element-model-value',
  CustomMatcherFunction = 'custom-matcher-function',
  EventHandlerInvocation = 'event-handler-invocation',
  StateDispatchAction = 'state-dispatch-action',
  /** Router `load` params object accepted by `LoadCustomAttribute.valueChanged(...)`. */
  RouterParameters = 'router-parameters',
  RejectedTargetAccess = 'rejected-target-access',
  Open = 'open',
}

/** Stable value list for runtime binding value-channel transport and catalog projections. */
export const RUNTIME_BINDING_VALUE_CHANNEL_KINDS = [
  RuntimeBindingValueChannelKind.RawProperty,
  RuntimeBindingValueChannelKind.ValueAttributeObserverProperty,
  RuntimeBindingValueChannelKind.RefTarget,
  RuntimeBindingValueChannelKind.ScopeSlot,
  RuntimeBindingValueChannelKind.TextContent,
  RuntimeBindingValueChannelKind.AttributeValue,
  RuntimeBindingValueChannelKind.ClassAttributeTokens,
  RuntimeBindingValueChannelKind.ClassToggle,
  RuntimeBindingValueChannelKind.StyleAttributeRules,
  RuntimeBindingValueChannelKind.StylePropertyValue,
  RuntimeBindingValueChannelKind.TemplateControllerTruthiness,
  RuntimeBindingValueChannelKind.TemplateControllerValueScope,
  RuntimeBindingValueChannelKind.TemplateControllerSwitchValue,
  RuntimeBindingValueChannelKind.TemplateControllerSwitchCaseValue,
  RuntimeBindingValueChannelKind.TemplateControllerPromiseValue,
  RuntimeBindingValueChannelKind.TemplateControllerPromiseBranchValue,
  RuntimeBindingValueChannelKind.TemplateControllerIteration,
  RuntimeBindingValueChannelKind.SelectSingleOptionValue,
  RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
  RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
  RuntimeBindingValueChannelKind.CheckedBoolean,
  RuntimeBindingValueChannelKind.CheckedRadioValue,
  RuntimeBindingValueChannelKind.CheckedCollectionMembership,
  RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean,
  RuntimeBindingValueChannelKind.CheckedDynamicModelValue,
  RuntimeBindingValueChannelKind.CheckedModel,
  RuntimeBindingValueChannelKind.ElementModelValue,
  RuntimeBindingValueChannelKind.CustomMatcherFunction,
  RuntimeBindingValueChannelKind.EventHandlerInvocation,
  RuntimeBindingValueChannelKind.StateDispatchAction,
  RuntimeBindingValueChannelKind.RouterParameters,
  RuntimeBindingValueChannelKind.RejectedTargetAccess,
  RuntimeBindingValueChannelKind.Open,
] as const;

export const enum RuntimeBindingValueChannelAuthority {
  TargetAccess = 'target-access',
  TargetOperation = 'target-operation',
  SourceOperation = 'source-operation',
  StaticTemplate = 'static-template',
  StaticTemplateAndTypeChecker = 'static-template-and-type-checker',
  BindingExpression = 'binding-expression',
  BindingExpressionAndTypeChecker = 'binding-expression-and-type-checker',
  ObserverSemantics = 'observer-semantics',
  Open = 'open',
}

/** Source-value mutation policy selected by the target-side runtime transport. */
export const enum RuntimeBindingValueChannelTargetMutationKind {
  /** The selected accessor or observer writes source values into its target. */
  WritesTarget = 'writes-target',
  /** The selected observer accepts source updates but deliberately suppresses its target write. */
  SuppressesTargetWrite = 'suppresses-target-write',
  /** This channel does not transport source values into a target property. */
  NoTargetWrite = 'no-target-write',
  /** App-owned or unclosed observer behavior prevents a truthful target-mutation claim. */
  Open = 'open',
}

export const enum RuntimeBindingValueChannelCouplingKind {
  SelectOptionValueDomain = 'select-option-value-domain',
  SelectOptionListMutationObserver = 'select-option-list-mutation-observer',
  SelectArrayObserver = 'select-array-observer',
  SelectArrayMutation = 'select-array-mutation',
  SelectDynamicMultipleMode = 'select-dynamic-multiple-mode',
  SelectDynamicArraySourceShape = 'select-dynamic-array-source-shape',
  CheckedElementValueDomain = 'checked-element-value-domain',
  CheckedElementValueObserver = 'checked-element-value-observer',
  CheckedCollectionObserver = 'checked-collection-observer',
  CheckedDynamicSourceShape = 'checked-dynamic-source-shape',
  CheckedBooleanSync = 'checked-boolean-sync',
  CheckedRadioValueSync = 'checked-radio-value-sync',
  CheckedCollectionMembershipMutation = 'checked-collection-membership-mutation',
  CheckedMapKeyedBooleanMutation = 'checked-map-keyed-boolean-mutation',
  CustomMatcherComparison = 'custom-matcher-comparison',
}

export const enum RuntimeBindingPrimitiveValueKind {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Null = 'null',
  Undefined = 'undefined',
}

export type RuntimeBindingPrimitiveValue =
  | {
    readonly kind: RuntimeBindingPrimitiveValueKind.String;
    readonly value: string;
  }
  | {
    readonly kind: RuntimeBindingPrimitiveValueKind.Number;
    readonly value: number;
  }
  | {
    readonly kind: RuntimeBindingPrimitiveValueKind.Boolean;
    readonly value: boolean;
  }
  | {
    readonly kind: RuntimeBindingPrimitiveValueKind.Null;
  }
  | {
    readonly kind: RuntimeBindingPrimitiveValueKind.Undefined;
  };

export const enum RuntimeBindingDataFlowDirection {
  /** Source expression is evaluated for lifecycle/dependency purposes without writing a generic target. */
  SourceRead = 'source-read',
  SourceToTarget = 'source-to-target',
  TargetToSource = 'target-to-source',
  TwoWay = 'two-way',
  Open = 'open',
}

/** Runtime `astEvaluate` lifecycle for the binding source expression. */
export const enum RuntimeBindingSourceEvaluationKind {
  /** Source reads are collected by the binding's active connectable. */
  ConnectableRead = 'connectable-read',
  /** Source is evaluated without dependency collection, such as an event handler or one-time binding. */
  UntrackedRead = 'untracked-read',
  /** Source syntax is used as an assignment target rather than evaluated for a value during binding. */
  AssignmentOnly = 'assignment-only',
  /** The binding retains authored source syntax but performs neither source evaluation nor assignment. */
  NotEvaluated = 'not-evaluated',
  /** The binding lifecycle did not prove how the source expression is evaluated. */
  Open = 'open',
}

export const enum RuntimeBindingDataFlowSourceKind {
  ScopeName = 'scope-name',
  Member = 'member',
  Keyed = 'keyed',
  This = 'this',
  Other = 'other',
  Open = 'open',
}

export const enum RuntimeObservedDependencyKind {
  TemplateExpressionRead = 'template-expression-read',
  TemplateCollectionRead = 'template-collection-read',
  ProxyPropertyRead = 'proxy-property-read',
  ProxyCollectionRead = 'proxy-collection-read',
  ObservablePropertyRead = 'observable-property-read',
  DeepPropertyRead = 'deep-property-read',
  DeepCollectionRead = 'deep-collection-read',
}

export const enum RuntimeBindingDataFlowSourceAssignmentKind {
  RuntimeAssignable = 'runtime-assignable',
  RuntimeAssignableWithTypeScriptStrictness = 'runtime-assignable-with-typescript-strictness',
  RuntimeUnassignable = 'runtime-unassignable',
  FrameworkManagedReadOnly = 'framework-managed-read-only',
  Open = 'open',
}

export const enum RuntimeBindingDataFlowSourceAssignmentReasonKind {
  SourceUnresolved = 'source-unresolved',
  ScopeLookupMissingAncestor = 'scope-lookup-missing-ancestor',
  ScopeSlotMissingTypeCheckerMember = 'scope-slot-missing-typechecker-member',
  ScopeSlotTypeCheckerMemberUnavailable = 'scope-slot-typechecker-member-unavailable',
  ScopeSlotRuntimeOnly = 'scope-slot-runtime-only',
  ScopeSlotFrameworkManaged = 'scope-slot-framework-managed',
  OwnerTypeOpen = 'owner-type-open',
  /** Key expression type could not be projected far enough to prove keyed source write policy. */
  KeyTypeOpen = 'key-type-open',
  OwnerMemberNotProjected = 'owner-member-not-projected',
  SourceMemberRuntimeUnassignable = 'source-member-runtime-unassignable',
  SourceMemberGetterWithoutSetter = 'source-member-getter-without-setter',
  SourceMemberReadonly = 'source-member-readonly',
  SourceMemberDeclarationMissing = 'source-member-declaration-missing',
  HostAccessScopeAssignment = 'host-access-scope-assignment',
  NullishAssignment = 'nullish-assignment',
  RuntimeExpressionUnassignable = 'runtime-expression-unassignable',
  SpreadSourceMemberPolicyOpen = 'spread-source-member-policy-open',
  TargetToSourceTypeMismatch = 'target-to-source-type-mismatch',
}

export const enum RuntimeBindingDataFlowTypeMismatchKind {
  SourceNullishToRequiredTarget = 'source-nullish-to-required-target',
  TargetNullishToRequiredSource = 'target-nullish-to-required-source',
}

export const enum RuntimeObservedMemberSourceState {
  Source = 'source',
  TemporaryValue = 'temporary-value',
  RuntimeScopeName = 'runtime-scope-name',
  ScopeOpen = 'scope-open',
  Open = 'open',
}

/**
 * Provenance of `observedMemberSourceAddressHandle`. The state above says whether a source route is
 * closed at all; the route says WHOSE declaration the address is. Only `member-declaration` rows may
 * be treated as proof that the address is the observed member's own declaration; `owner-value` rows
 * carry the owner/root declaration as a best-effort navigation aid for weak, dynamic, keyed, or
 * index-signature-shaped owners and must never be matched against a member declaration span.
 */
export const enum RuntimeObservedMemberSourceRoute {
  MemberDeclaration = 'member-declaration',
  OwnerValue = 'owner-value',
}

/** Reference to a runtime value channel without expanding checker facts. */
export class RuntimeBindingValueChannelReference {
  constructor(
    /** Runtime value strategy represented by the value channel product. */
    readonly channelKind: RuntimeBindingValueChannelKind,
    /** Product handle for the value-channel product, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the value-channel product, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source or generated address for the binding site. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Expression read that participates in runtime template connectable dependency collection for a binding. */
export class RuntimeBindingObservedDependency {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly dataFlowProductHandle: ProductHandle,
    /** Exact authored or generated access occurrence that induced this observation effect. */
    readonly accessUseProductHandle: ProductHandle,
    readonly expressionProductHandle: ProductHandle | null,
    readonly bindingScope: BindingScopeReference | null,
    /** Whether dependency collection is direct or belongs to a guarded runtime-created inner binding. */
    readonly realization: RuntimeOperationRealization,
    readonly dependencyKind: RuntimeObservedDependencyKind,
    readonly expressionKind: string,
    readonly sourceName: string | null,
    readonly sourceRootName: string | null,
    readonly memberName: string | null,
    readonly keyExpression: string | null,
    readonly methodName: string | null,
    readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null,
    readonly observedMemberSourceAddressHandle: AddressHandle | null,
    readonly observedMemberSourceState: RuntimeObservedMemberSourceState,
    readonly observedMemberSourceRoute: RuntimeObservedMemberSourceRoute | null,
    readonly spanStart: number | null,
    readonly spanEnd: number | null,
    /** Authored bounds of the member-name token inside the expression, for AccessMember/CallMember reads. */
    readonly memberNameSpanStart: number | null,
    readonly memberNameSpanEnd: number | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/**
 * Runtime value channel selected by a binding's accessor/observer, direct target operation, or source operation.
 *
 * This captures the value shape Aurelia actually transports, which can be narrower than the raw DOM property type. For
 * example `HTMLSelectElement.value` is `string`, but `SelectValueObserver` can transport a static option domain such as
 * `'ship' | 'pickup'` back into the view-model.
 */
export class RuntimeBindingValueChannel {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly targetAccess: RuntimeBindingTargetAccessReference | null,
    readonly targetOperation: RuntimeBindingTargetOperationReference | null,
    readonly sourceOperation: RuntimeBindingSourceOperationReference | null,
    readonly channelKind: RuntimeBindingValueChannelKind,
    readonly authority: RuntimeBindingValueChannelAuthority,
    readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind,
    readonly nullishDefault: RuntimeBindingPrimitiveValue | null,
    readonly nullishDefaultState: RuntimeNodeObserverConfigFieldState | null,
    readonly rawTargetPropertyType: CheckerTypeReference | null,
    readonly runtimeValueType: CheckerTypeReference | null,
    /** Whether this channel exists directly or only after a runtime object/member guard succeeds. */
    readonly realization: RuntimeOperationRealization,
    /** Whether controller setup and expression-resource binding reach this value transport. */
    readonly bindReachability: RuntimeOperationReachability,
    /** Object type tested by a guarded source-member read; null for direct channels. */
    readonly admittedSourceOwnerType: CheckerTypeReference | null,
    /** Source member value on the successful guard branch; null for direct channels. */
    readonly admittedSourceValueType: CheckerTypeReference | null,
    /** Member kind shared by every admitted runtime lane, when one can be proven. */
    readonly admittedSourceMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null,
    /** Exact projected member shared by every admitted runtime lane, when one can be proven. */
    readonly admittedSourceMemberHandle: HotDetailHandle | null,
    /** Declaration source shared by every admitted runtime lane, when one can be proven. */
    readonly admittedSourceMemberSourceAddressHandle: AddressHandle | null,
    readonly valueDomain: readonly string[],
    readonly primitiveValueDomain: readonly RuntimeBindingPrimitiveValue[],
    readonly isCollection: boolean | null,
    readonly usesCustomMatcher: boolean,
    readonly observerCouplings: readonly RuntimeBindingValueChannelCouplingKind[],
    readonly openReason: string | null,
    readonly openReasonKinds: readonly OpenSeamReasonKind[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  toReference(): RuntimeBindingValueChannelReference {
    return new RuntimeBindingValueChannelReference(
      this.channelKind,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** One target-specific TypeChecker projection of a value-converter `fromView` application. */
export class RuntimeBindingDataFlowValueConverterWritebackStage {
  constructor(
    readonly converterName: string,
    /** Outer-to-inner structural order used by Aurelia `astAssign`. */
    readonly stageIndex: number,
    /** Runtime application identity for the same converter occurrence and from-view phase. */
    readonly application: RuntimeValueConverterApplicationReference,
    readonly origin: RuntimeExpressionResourceApplicationOrigin,
    readonly runtimeChainDepth: number,
    /** Runtime execution order; null when converter invocation is blocked. */
    readonly phaseOrder: number | null,
    readonly phaseReachability: RuntimeOperationReachability,
    readonly projectionState: RuntimeValueConverterWritebackStageState,
    /** Best-known checker input; `input-open` stages may carry a partial prior output. */
    readonly inputType: CheckerTypeReference | null,
    /** Closed output for `type`, partial output for `open`, and null for `input-open`. */
    readonly outputType: CheckerTypeReference | null,
    readonly openReason: string | null,
    readonly openKind: CheckerExpressionTypeOpenKind | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Runtime binding source/target data-flow edge computed from Scope lookup plus target-side facts. */
export class RuntimeBindingDataFlow {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    /** Owner-qualified source and value-converter accesses spent by this flow edge. */
    readonly accessUseProductHandles: readonly ProductHandle[],
    readonly targetAccess: RuntimeBindingTargetAccessReference | null,
    readonly targetOperation: RuntimeBindingTargetOperationReference | null,
    readonly sourceOperation: RuntimeBindingSourceOperationReference | null,
    readonly valueChannel: RuntimeBindingValueChannelReference | null,
    readonly expressionProductHandle: ProductHandle | null,
    readonly bindingScope: BindingScopeReference | null,
    readonly direction: RuntimeBindingDataFlowDirection,
    /** Whether this edge is direct or depends on runtime creation of a guarded inner binding. */
    readonly realization: RuntimeOperationRealization,
    readonly sourceEvaluationKind: RuntimeBindingSourceEvaluationKind,
    /** Whether expression-resource `astBind(...)` completed far enough for source evaluation to run. */
    readonly sourceEvaluationReachability: RuntimeOperationReachability,
    readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind,
    readonly strictBinding: boolean | null,
    readonly sourceKind: RuntimeBindingDataFlowSourceKind,
    readonly sourceName: string | null,
    readonly sourceRootName: string | null,
    readonly sourceType: CheckerTypeReference | null,
    readonly sourceTypeOpenReason: string | null,
    readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}` | null,
    readonly sourceAssignmentTargetType: CheckerTypeReference | null,
    readonly sourceAssignmentTargetSourceAddressHandle: AddressHandle | null,
    readonly targetPropertyType: CheckerTypeReference | null,
    readonly targetValueType: CheckerTypeReference | null,
    /** Final value handed to the unwrapped assignment target after every projected `fromView` stage. */
    readonly targetToSourceValueType: CheckerTypeReference | null,
    readonly targetToSourceValueTypeOpenReason: string | null,
    readonly targetToSourceValueTypeOpenKind: CheckerExpressionTypeOpenKind | null,
    readonly valueConverterWritebackStages: readonly RuntimeBindingDataFlowValueConverterWritebackStage[],
    readonly sourceWritable: boolean | null,
    readonly sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | null,
    readonly sourceAssignmentReason: string | null,
    readonly sourceAssignmentReasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[],
    readonly sourceToTargetAssignable: boolean | null,
    readonly targetToSourceAssignable: boolean | null,
    readonly sourceToTargetTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[],
    readonly targetToSourceTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[],
    readonly frameworkErrorCode: ObservationFrameworkErrorCode | null,
    readonly openReason: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}
