import type { BindingScopeReference } from '../configuration/scope.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type {
  RuntimeBindingReference,
  RuntimeBindingSourceOperationReference,
  RuntimeBindingTargetAccessReference,
  RuntimeBindingTargetOperationReference,
} from '../template/runtime-binding.js';

export const enum RuntimeBindingValueChannelKind {
  RawProperty = 'raw-property',
  RefTarget = 'ref-target',
  TextContent = 'text-content',
  AttributeValue = 'attribute-value',
  ClassAttributeTokens = 'class-attribute-tokens',
  ClassToggle = 'class-toggle',
  StyleAttributeRules = 'style-attribute-rules',
  StylePropertyValue = 'style-property-value',
  SelectSingleOptionValue = 'select-single-option-value',
  SelectMultipleOptionValues = 'select-multiple-option-values',
  CheckedBoolean = 'checked-boolean',
  CheckedRadioValue = 'checked-radio-value',
  CheckedCollectionMembership = 'checked-collection-membership',
  CheckedModel = 'checked-model',
  Open = 'open',
}

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

export const enum RuntimeBindingDataFlowDirection {
  SourceToTarget = 'source-to-target',
  TargetToSource = 'target-to-source',
  TwoWay = 'two-way',
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

export const enum RuntimeBindingDataFlowSourceAssignmentKind {
  RuntimeAssignable = 'runtime-assignable',
  RuntimeAssignableWithTypeScriptStrictness = 'runtime-assignable-with-typescript-strictness',
  RuntimeUnassignable = 'runtime-unassignable',
  Open = 'open',
}

export type RuntimeBindingDataFlowField =
  | 'binding'
  | 'targetAccess'
  | 'targetOperation'
  | 'sourceOperation'
  | 'valueChannel'
  | 'expression'
  | 'scope'
  | 'direction'
  | 'sourceKind'
  | 'sourceName'
  | 'sourceType'
  | 'sourceTypeOpenReason'
  | 'targetPropertyType'
  | 'targetValueType'
  | 'sourceWritable'
  | 'sourceAssignmentKind'
  | 'sourceAssignmentReason'
  | 'sourceToTargetAssignable'
  | 'targetToSourceAssignable'
  | 'openReason'
  | 'source';

export type RuntimeBindingValueChannelField =
  | 'binding'
  | 'targetAccess'
  | 'targetOperation'
  | 'sourceOperation'
  | 'channelKind'
  | 'authority'
  | 'rawTargetPropertyType'
  | 'runtimeValueType'
  | 'valueDomain'
  | 'isCollection'
  | 'openReason'
  | 'source';

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
    readonly rawTargetPropertyType: CheckerTypeReference | null,
    readonly runtimeValueType: CheckerTypeReference | null,
    readonly valueDomain: readonly string[],
    readonly isCollection: boolean | null,
    readonly openReason: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingValueChannelField>[] = [],
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

/** Runtime binding source/target data-flow edge computed from Scope lookup plus target-side facts. */
export class RuntimeBindingDataFlow {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly targetAccess: RuntimeBindingTargetAccessReference | null,
    readonly targetOperation: RuntimeBindingTargetOperationReference | null,
    readonly sourceOperation: RuntimeBindingSourceOperationReference | null,
    readonly valueChannel: RuntimeBindingValueChannelReference | null,
    readonly expressionProductHandle: ProductHandle | null,
    readonly bindingScope: BindingScopeReference | null,
    readonly direction: RuntimeBindingDataFlowDirection,
    readonly sourceKind: RuntimeBindingDataFlowSourceKind,
    readonly sourceName: string | null,
    readonly sourceType: CheckerTypeReference | null,
    readonly sourceTypeOpenReason: string | null,
    readonly targetPropertyType: CheckerTypeReference | null,
    readonly targetValueType: CheckerTypeReference | null,
    readonly sourceWritable: boolean | null,
    readonly sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | null,
    readonly sourceAssignmentReason: string | null,
    readonly sourceToTargetAssignable: boolean | null,
    readonly targetToSourceAssignable: boolean | null,
    readonly openReason: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingDataFlowField>[] = [],
  ) {}
}
