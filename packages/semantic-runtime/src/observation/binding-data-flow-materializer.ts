import ts from 'typescript';
import {
  collectionElementTypeFor,
  stringLiteralValuesForType,
} from './checker-type-helpers.js';
import type {
  AccessMemberExpression,
  AccessScopeExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import {
  ExpressionParseResultKind,
} from '../expression/parse-result-algebra.js';
import {
  BindingScope,
  BindingScopeLookupKind,
  type BindingContextSlot,
} from '../configuration/scope.js';
import {
  ConfigurationProductDetails,
} from '../configuration/product-details.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeMemberKind,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import {
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import {
  BuiltInTemplateControllerFlowKind,
  runtimeHtmlTemplateControllerSemanticsForName,
} from '../template/template-controller-semantics.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { ObservationProductDetails } from './product-details.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
  PropertyBinding,
  RefBinding,
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingSourceOperation,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingDataFlow,
  type RuntimeBindingDataFlowField,
  RuntimeBindingDataFlowDirection,
  RuntimeBindingDataFlowSourceKind,
  type RuntimeBindingValueChannel,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { RuntimeBindingValueChannelEmission } from './binding-value-channel-materializer.js';
import type {
  TemplateExpressionParse,
} from '../template/value-site.js';
import type {
  TemplateScopeConstructionEmission,
  TemplateInstructionScopeApplication,
} from '../template/template-controller-scope-materializer.js';

type RuntimeDataFlowBinding =
  | PropertyBinding
  | AttributeBinding
  | InterpolationBinding
  | ContentBinding
  | RefBinding
  | SpreadValueBinding;

export class RuntimeBindingDataFlowMaterializationRequest {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Runtime binding products produced by renderer dispatch. */
    readonly runtimeBindings: RuntimeRenderingEmission,
    /** Controller.bind target-side products produced by binding-owned target setup. */
    readonly controllerBind: RuntimeControllerBindEmission,
    /** Value channels visible to runtime property, attribute, and interpolation bindings. */
    readonly valueChannels: RuntimeBindingValueChannelEmission,
    /** Runtime Scope applications visible to instruction-owned expressions. */
    readonly scopes: TemplateScopeConstructionEmission,
    /** Compiler resource scope visible to expression semantics such as value converters. */
    readonly resourceScope: TemplateResourceScope | null = null,
  ) {}
}

export class RuntimeBindingDataFlowEmission {
  private readonly dataFlowsByBinding = new Map<ProductHandle, RuntimeBindingDataFlow[]>();

  constructor(
    /** Runtime binding data-flow products materialized for property, attribute, and interpolation bindings. */
    readonly dataFlows: readonly RuntimeBindingDataFlow[],
    /** Open source/scope/observer pressures encountered while creating flow products. */
    readonly openSeams: readonly OpenSeam[],
    /** Kernel records emitted for data-flow products, claims, provenance, and seams. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const dataFlow of dataFlows) {
      if (dataFlow.binding.productHandle == null) {
        continue;
      }
      let rows = this.dataFlowsByBinding.get(dataFlow.binding.productHandle);
      if (rows === undefined) {
        rows = [];
        this.dataFlowsByBinding.set(dataFlow.binding.productHandle, rows);
      }
      rows.push(dataFlow);
    }
  }

  readDataFlowsForBinding(productHandle: ProductHandle): readonly RuntimeBindingDataFlow[] {
    return this.dataFlowsByBinding.get(productHandle) ?? [];
  }
}

class BindingDataFlowSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class BindingDataFlowRecordEmission {
  constructor(
    readonly dataFlow: RuntimeBindingDataFlow,
    readonly openSeams: readonly OpenSeam[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class BindingDataFlowMaterializationFrame {
  readonly records: KernelStoreRecord[];
  readonly dataFlows: RuntimeBindingDataFlow[] = [];
  readonly openSeams: OpenSeam[] = [];

  constructor(
    readonly source: BindingDataFlowSourceSet,
    readonly instructionScopes: ReadonlyMap<ProductHandle, BindingScope>,
    readonly context: BindingDataFlowContext,
  ) {
    this.records = [...source.records];
  }

  record(emission: BindingDataFlowRecordEmission): void {
    this.records.push(...emission.records);
    this.openSeams.push(...emission.openSeams);
    this.dataFlows.push(emission.dataFlow);
  }

  toEmission(): RuntimeBindingDataFlowEmission {
    return new RuntimeBindingDataFlowEmission(this.dataFlows, this.openSeams, this.records);
  }
}

type SourceExpressionInfo = {
  readonly sourceKind: RuntimeBindingDataFlowSourceKind;
  readonly sourceName: string | null;
  readonly sourceWritable: boolean | null;
};

type BindingDataFlowContext = {
  readonly evaluator: CheckerExpressionTypeEvaluator;
};

type DataFlowTarget = {
  readonly localSuffix: string;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
};

type DataFlowDraft = {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly expressionProductHandle: ProductHandle | null;
  readonly sourceKind: RuntimeBindingDataFlowSourceKind;
  readonly sourceName: string | null;
  readonly sourceType: CheckerTypeReference | null;
  readonly targetPropertyType: CheckerTypeReference | null;
  readonly targetValueType: CheckerTypeReference | null;
  readonly sourceWritable: boolean | null;
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly openReason: string | null;
};

/** Materializes binding data-flow edges after target observers and instruction scopes are both known. */
export class RuntimeBindingDataFlowMaterializer {
  private readonly typeProjector: CheckerTypeProjector;

  constructor(
    /** Hot analysis store that receives binding data-flow products. */
    readonly store: KernelStore,
  ) {
    this.typeProjector = new CheckerTypeProjector(store);
  }

  materialize(input: RuntimeBindingDataFlowMaterializationRequest): RuntimeBindingDataFlowEmission {
    const emission = this.recordsForDataFlows(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `binding-data-flow:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: RuntimeBindingDataFlowEmission): void {
    for (const dataFlow of emission.dataFlows) {
      this.store.productDetails.add(ObservationProductDetails.RuntimeBindingDataFlow, dataFlow.productHandle, dataFlow);
    }
  }

  private recordsForDataFlows(input: RuntimeBindingDataFlowMaterializationRequest): RuntimeBindingDataFlowEmission {
    const frame = this.dataFlowMaterializationFrame(input);
    input.runtimeBindings.bindings.forEach((binding, index) =>
      this.recordDataFlowsForBinding(input, binding, index, frame)
    );
    return frame.toEmission();
  }

  private dataFlowMaterializationFrame(
    input: RuntimeBindingDataFlowMaterializationRequest,
  ): BindingDataFlowMaterializationFrame {
    const source = this.recordsForSource(input.localKey);
    const instructionScopes = instructionScopeMap(input.scopes.instructionScopes);
    const evaluator = new CheckerExpressionTypeEvaluator(this.store, this.typeProjector, input.resourceScope);
    return new BindingDataFlowMaterializationFrame(source, instructionScopes, {
      evaluator,
    });
  }

  private recordDataFlowsForBinding(
    input: RuntimeBindingDataFlowMaterializationRequest,
    binding: RuntimeBinding,
    index: number,
    frame: BindingDataFlowMaterializationFrame,
  ): void {
    if (!isRuntimeDataFlowBinding(binding)) {
      return;
    }
    const scope = frame.instructionScopes.get(binding.instructionProductHandle) ?? null;
    const targets = dataFlowTargetsForBinding(
      binding,
      input.controllerBind.readTargetAccessesForBinding(binding.productHandle),
      input.controllerBind.readTargetOperationsForBinding(binding.productHandle),
      input.controllerBind.readSourceOperationsForBinding(binding.productHandle),
      input.valueChannels.readValueChannelsForBinding(binding.productHandle),
    );
    targets.forEach((target) => frame.record(this.recordsForDataFlow(
      input,
      frame.source,
      frame.context,
      binding,
      index,
      target,
      scope,
    )));
  }

  private recordsForDataFlow(
    input: RuntimeBindingDataFlowMaterializationRequest,
    source: BindingDataFlowSourceSet,
    context: BindingDataFlowContext,
    binding: RuntimeDataFlowBinding,
    bindingIndex: number,
    target: DataFlowTarget,
    scope: BindingScope | null,
  ): BindingDataFlowRecordEmission {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    const local = `${input.localKey}:binding:${bindingIndex}:${binding.productHandle}${target.localSuffix}`;
    const dataFlow = this.dataFlowForBinding(binding, target, scope, context.evaluator, local, source);
    const claim = new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-uses-data-flow`),
      binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesDataFlow.key,
      dataFlow.productHandle,
      source.provenanceHandle,
    );
    if (dataFlow.openReason != null) {
      this.recordOpenSeam(
        `${local}:open-data-flow`,
        dataFlow.openReason,
        binding.sourceAddressHandle,
        source,
        records,
        openSeams,
        KernelVocabulary.Binding.OpenDataFlow.key,
      );
    }
    records.push(...this.dataFlowRecords(local, binding, target, dataFlow, claim, openSeams, source));
    return new BindingDataFlowRecordEmission(dataFlow, openSeams, records);
  }

  private dataFlowForBinding(
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    source: BindingDataFlowSourceSet,
  ): RuntimeBindingDataFlow {
    const draft = this.dataFlowDraftForBinding(binding, target, scope, evaluator, local);
    return new RuntimeBindingDataFlow(
      this.store.handles.product(`${local}:binding-data-flow`),
      this.store.handles.identity(`${local}:binding-data-flow`),
      binding.toReference(),
      target.targetAccess?.toReference() ?? null,
      target.targetOperation?.toReference() ?? null,
      target.sourceOperation?.toReference() ?? null,
      target.valueChannel?.toReference() ?? null,
      draft.expressionProductHandle,
      scope?.toReference() ?? null,
      draft.direction,
      draft.sourceKind,
      draft.sourceName,
      draft.sourceType,
      draft.targetPropertyType,
      draft.targetValueType,
      draft.sourceWritable,
      draft.sourceToTargetAssignable,
      draft.targetToSourceAssignable,
      draft.openReason,
      binding.sourceAddressHandle,
      this.dataFlowProvenance(target, scope, draft, source),
    );
  }

  private dataFlowDraftForBinding(
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
  ): DataFlowDraft {
    const direction = directionForBinding(binding);
    const expressionProductHandle = expressionProductHandleForBinding(binding);
    const parse = this.readParse(expressionProductHandle);
    const ast = parse == null ? null : expressionAstForParse(parse);
    const spreadTargetProperty = binding instanceof SpreadValueBinding
      ? target.targetAccess?.targetProperty ?? null
      : null;
    const targetPropertyType = target.targetAccess?.propertyType ?? null;
    const targetValueType = target.valueChannel?.runtimeValueType ?? target.sourceOperation?.targetType ?? targetPropertyType;
    const templateControllerAlias = templateControllerResultAlias(this.store, binding, target.targetAccess, ast);
    const baseSourceInfo = templateControllerAlias != null
      ? {
        sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
        sourceName: templateControllerAlias,
        sourceWritable: true,
      }
      : scope == null || ast == null
      ? openSourceExpressionInfo()
      : this.sourceInfoForExpression(ast, scope, evaluator, `${local}:source`, binding.sourceAddressHandle);
    const sourceEvaluation = templateControllerAlias != null || scope == null || ast == null
      ? null
      : evaluator.evaluateWithScope(ast, scope, `${local}:source-type`, binding.sourceAddressHandle);
    const evaluatedSourceType = sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? sourceEvaluation.typeReference
      : templateControllerAlias != null
        ? targetValueType
      : null;
    const sourceType = spreadTargetProperty == null
      ? evaluatedSourceType
      : this.memberType(evaluatedSourceType, spreadTargetProperty);
    const sourceInfo = spreadTargetProperty == null
      ? baseSourceInfo
      : spreadSourceInfo(baseSourceInfo, spreadTargetProperty);
    const sourceToTargetAssignable = directionIncludesSourceToTarget(direction)
      ? this.isSourceAssignableToTarget(sourceType, targetValueType, target.valueChannel)
      : null;
    const targetToSourceAssignable = directionIncludesTargetToSource(direction)
      ? this.isTargetAssignableToSource(targetValueType, sourceType, target.valueChannel)
      : null;
    const openReason = openReasonForDataFlow({
      direction,
      targetAccess: target.targetAccess,
      targetOperation: target.targetOperation,
      sourceOperation: target.sourceOperation,
      valueChannel: target.valueChannel,
      scope,
      ast,
      sourceEvaluation,
      sourceOpenReason: spreadTargetProperty != null && sourceType == null
        ? `SpreadValueBinding source expression type did not expose bindable property '${spreadTargetProperty}'.`
        : null,
      sourceWritable: directionIncludesTargetToSource(direction) ? sourceInfo.sourceWritable : null,
    });

    return {
      expressionProductHandle,
      direction,
      sourceKind: sourceInfo.sourceKind,
      sourceName: sourceInfo.sourceName,
      sourceType,
      targetPropertyType,
      targetValueType,
      sourceWritable: directionIncludesTargetToSource(direction) ? sourceInfo.sourceWritable : null,
      sourceToTargetAssignable,
      targetToSourceAssignable,
      openReason,
    };
  }

  private dataFlowRecords(
    local: string,
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    dataFlow: RuntimeBindingDataFlow,
    claim: SemanticClaim,
    openSeams: readonly OpenSeam[],
    source: BindingDataFlowSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        dataFlow.identityHandle,
        KernelVocabulary.Binding.DataFlow.key,
        binding.identityHandle,
        binding.sourceAddressHandle,
        `${dataFlow.direction}:${dataFlow.sourceName ?? dataFlow.sourceKind}:${target.targetAccess?.targetProperty ?? binding.target}`,
      ),
      new MaterializedProduct(
        dataFlow.productHandle,
        KernelVocabulary.Binding.DataFlow.key,
        dataFlow.identityHandle,
        binding.sourceAddressHandle,
        source.provenanceHandle,
      ),
      claim,
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:binding-data-flow`),
        dataFlow.identityHandle,
        [dataFlow.productHandle],
        [claim.handle],
        openSeams.map((seam) => seam.handle),
      ),
    ];
  }

  private dataFlowProvenance(
    target: DataFlowTarget,
    scope: BindingScope | null,
    draft: DataFlowDraft,
    source: BindingDataFlowSourceSet,
  ): readonly FieldProvenance<RuntimeBindingDataFlowField>[] {
    return compactFieldProvenance<RuntimeBindingDataFlowField>([
      new FieldProvenance('binding', source.provenanceHandle),
      target.targetAccess == null ? null : new FieldProvenance('targetAccess', source.provenanceHandle),
      target.targetOperation == null ? null : new FieldProvenance('targetOperation', source.provenanceHandle),
      target.sourceOperation == null ? null : new FieldProvenance('sourceOperation', source.provenanceHandle),
      target.valueChannel == null ? null : new FieldProvenance('valueChannel', source.provenanceHandle),
      draft.expressionProductHandle == null ? null : new FieldProvenance('expression', source.provenanceHandle),
      scope == null ? null : new FieldProvenance('scope', source.provenanceHandle),
      new FieldProvenance('direction', source.provenanceHandle),
      new FieldProvenance('sourceKind', source.provenanceHandle),
      draft.sourceName == null ? null : new FieldProvenance('sourceName', source.provenanceHandle),
      draft.sourceType == null ? null : new FieldProvenance('sourceType', source.provenanceHandle),
      draft.targetPropertyType == null ? null : new FieldProvenance('targetPropertyType', source.provenanceHandle),
      draft.targetValueType == null ? null : new FieldProvenance('targetValueType', source.provenanceHandle),
      draft.sourceWritable == null ? null : new FieldProvenance('sourceWritable', source.provenanceHandle),
      draft.sourceToTargetAssignable == null ? null : new FieldProvenance('sourceToTargetAssignable', source.provenanceHandle),
      draft.targetToSourceAssignable == null ? null : new FieldProvenance('targetToSourceAssignable', source.provenanceHandle),
      draft.openReason == null ? null : new FieldProvenance('openReason', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
  }

  private sourceInfoForExpression(
    expression: ExpressionAstNode,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
  ): SourceExpressionInfo {
    const unwrapped = unwrapParen(expression);
    switch (unwrapped.$kind) {
      case 'AccessScope':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWritable: this.sourceWritableForAccessScope(unwrapped, scope),
        };
      case 'AccessMember':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Member,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWritable: this.sourceWritableForAccessMember(unwrapped, scope, evaluator, local, sourceAddressHandle),
        };
      case 'AccessKeyed':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Keyed,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWritable: true,
        };
      case 'AccessThis':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.This,
          sourceName: '$this',
          sourceWritable: false,
        };
      default:
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Other,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWritable: false,
        };
    }
  }

  private sourceWritableForAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
  ): boolean | null {
    const lookup = scope.lookup(expression.name.name, expression.ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return null;
    }
    return lookup.slot == null ? null : this.slotWritable(lookup.slot);
  }

  private sourceWritableForAccessMember(
    expression: AccessMemberExpression,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
  ): boolean | null {
    const ownerEvaluation = evaluator.evaluateWithScope(
      expression.object,
      scope,
      `${local}:owner:${expression.name.name}`,
      sourceAddressHandle,
    );
    if (ownerEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return null;
    }
    const ownerShape = this.readTypeShape(ownerEvaluation.typeReference);
    const member = ownerShape?.members.find((candidate) => candidate.name === expression.name.name) ?? null;
    return member == null ? null : memberWritable(member);
  }

  private slotWritable(slot: BindingContextSlot): boolean | null {
    if (slot.targetProductHandle == null) {
      return null;
    }
    const member = this.store.productDetails.read(TypeSystemProductDetails.TypeMember, slot.targetProductHandle);
    return member == null ? null : memberWritable(member);
  }

  private isTypeAssignable(
    from: CheckerTypeReference | null,
    to: CheckerTypeReference | null,
  ): boolean | null {
    const fromShape = this.readTypeShape(from);
    const toShape = this.readTypeShape(to);
    const fromCarrier = fromShape?.carrier ?? null;
    const toCarrier = toShape?.carrier ?? null;
    if (fromCarrier == null || toCarrier == null || fromCarrier.checker !== toCarrier.checker) {
      if (from?.display != null && to?.display != null && from.display === to.display) {
        return true;
      }
      return null;
    }
    return fromCarrier.checker.isTypeAssignableTo(fromCarrier.type, toCarrier.type);
  }

  private isSourceAssignableToTarget(
    sourceType: CheckerTypeReference | null,
    targetType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const valueDomain = valueChannel?.valueDomain ?? [];
    if (valueDomain.length > 0 && valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedRadioValue) {
      return this.isStringDomainAssignableToType(valueDomain, sourceType);
    }
    if (valueDomain.length > 0 && valueChannelMutatesCollection(valueChannel)) {
      return this.isStringDomainAssignableToCollectionElement(valueDomain, sourceType);
    }
    const checkerAssignable = this.isTypeAssignable(sourceType, targetType);
    if (checkerAssignable != null) {
      return checkerAssignable;
    }
    if (valueDomain.length === 0) {
      return null;
    }
    return this.isTypeAssignableToStringDomain(sourceType, valueDomain);
  }

  private isTargetAssignableToSource(
    targetType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const valueDomain = valueChannel?.valueDomain ?? [];
    if (valueDomain.length > 0 && valueChannelMutatesCollection(valueChannel)) {
      return this.isStringDomainAssignableToCollectionElement(valueDomain, sourceType);
    }
    const checkerAssignable = this.isTypeAssignable(targetType, sourceType);
    if (checkerAssignable != null) {
      return checkerAssignable;
    }
    if (valueDomain.length === 0) {
      return null;
    }
    return this.isStringDomainAssignableToType(valueDomain, sourceType);
  }

  private isStringDomainAssignableToType(
    values: readonly string[],
    to: CheckerTypeReference | null,
  ): boolean | null {
    const toShape = this.readTypeShape(to);
    const toCarrier = toShape?.carrier ?? null;
    if (toCarrier == null) {
      return null;
    }
    return values.every((value) =>
      toCarrier.checker.isTypeAssignableTo(toCarrier.checker.getStringLiteralType(value), toCarrier.type)
    );
  }

  private isTypeAssignableToStringDomain(
    from: CheckerTypeReference | null,
    values: readonly string[],
  ): boolean | null {
    const fromShape = this.readTypeShape(from);
    const fromCarrier = fromShape?.carrier ?? null;
    if (fromCarrier == null) {
      return null;
    }
    const sourceValues = stringLiteralValuesForType(fromCarrier.type);
    if (sourceValues == null) {
      return false;
    }
    return sourceValues.every((value) => values.includes(value));
  }

  private isStringDomainAssignableToCollectionElement(
    values: readonly string[],
    sourceType: CheckerTypeReference | null,
  ): boolean | null {
    const sourceShape = this.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    if (sourceCarrier == null) {
      return null;
    }
    const elementType = collectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    if (elementType == null) {
      return null;
    }
    return values.every((value) =>
      sourceCarrier.checker.isTypeAssignableTo(sourceCarrier.checker.getStringLiteralType(value), elementType)
    );
  }

  private readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return reference?.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  }

  private memberType(
    reference: CheckerTypeReference | null,
    propertyName: string,
  ): CheckerTypeReference | null {
    const shape = this.readTypeShape(reference);
    const member = shape?.members.find((candidate) => candidate.name === propertyName) ?? null;
    return member?.valueType ?? null;
  }

  private readParse(productHandle: ProductHandle | null): TemplateExpressionParse | null {
    return productHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  }

  private recordOpenSeam(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    source: BindingDataFlowSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Binding.OpenDataFlow.key,
  ): OpenSeam {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
    );
    openSeams.push(seam);
    records.push(seam);
    return seam;
  }

  private recordsForSource(local: string): BindingDataFlowSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-data-flow:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-data-flow:${local}`);
    return new BindingDataFlowSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Scope, EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Binding data-flow emulation from runtime Scope lookup plus target-side facts.',
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

function expressionAstForParse(parse: TemplateExpressionParse): ExpressionAstNode | null {
  switch (parse.result.kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.OpaqueSuccess:
      return parse.result.ast;
    case ExpressionParseResultKind.IteratorSuccess:
      return parse.result.ast.iterable;
    case ExpressionParseResultKind.InterpolationSuccess:
      return parse.result.ast;
    default:
      return null;
  }
}

function instructionScopeMap(
  applications: readonly TemplateInstructionScopeApplication[],
): ReadonlyMap<ProductHandle, BindingScope> {
  const result = new Map<ProductHandle, BindingScope>();
  for (const application of applications) {
    if (!result.has(application.instructionProductHandle)) {
      result.set(application.instructionProductHandle, application.scope);
    }
  }
  return result;
}

function directionForBindingMode(bindingMode: TemplateBindingMode): RuntimeBindingDataFlowDirection {
  switch (bindingMode) {
    case TemplateBindingMode.OneTime:
    case TemplateBindingMode.ToView:
      return RuntimeBindingDataFlowDirection.SourceToTarget;
    case TemplateBindingMode.FromView:
      return RuntimeBindingDataFlowDirection.TargetToSource;
    case TemplateBindingMode.TwoWay:
      return RuntimeBindingDataFlowDirection.TwoWay;
    case TemplateBindingMode.Default:
    case TemplateBindingMode.Open:
      return RuntimeBindingDataFlowDirection.Open;
  }
}

function directionForBinding(binding: RuntimeDataFlowBinding): RuntimeBindingDataFlowDirection {
  if (binding instanceof PropertyBinding) {
    return directionForBindingMode(binding.bindingMode);
  }
  if (binding instanceof RefBinding) {
    return RuntimeBindingDataFlowDirection.TargetToSource;
  }
  return RuntimeBindingDataFlowDirection.SourceToTarget;
}

function directionIncludesSourceToTarget(direction: RuntimeBindingDataFlowDirection): boolean {
  return direction === RuntimeBindingDataFlowDirection.SourceToTarget
    || direction === RuntimeBindingDataFlowDirection.TwoWay;
}

function directionIncludesTargetToSource(direction: RuntimeBindingDataFlowDirection): boolean {
  return direction === RuntimeBindingDataFlowDirection.TargetToSource
    || direction === RuntimeBindingDataFlowDirection.TwoWay;
}

function expressionProductHandleForBinding(binding: RuntimeDataFlowBinding): ProductHandle | null {
  if (binding instanceof InterpolationBinding) {
    return binding.expressionProductHandles[0] ?? null;
  }
  return binding.expressionProductHandle;
}

function isRuntimeDataFlowBinding(binding: RuntimeBinding): binding is RuntimeDataFlowBinding {
  return binding instanceof PropertyBinding
    || binding instanceof AttributeBinding
    || binding instanceof InterpolationBinding
    || binding instanceof ContentBinding
    || binding instanceof RefBinding
    || binding instanceof SpreadValueBinding;
}

function dataFlowTargetsForBinding(
  binding: RuntimeDataFlowBinding,
  targetAccesses: readonly RuntimeBindingTargetAccess[],
  targetOperations: readonly RuntimeBindingTargetOperation[],
  sourceOperations: readonly RuntimeBindingSourceOperation[],
  valueChannels: readonly RuntimeBindingValueChannel[],
): readonly DataFlowTarget[] {
  if (binding instanceof SpreadValueBinding && targetAccesses.length > 0) {
    return targetAccesses.map((targetAccess, index) => ({
      localSuffix: `:${index}:${targetAccess.targetProperty}`,
      targetAccess,
      targetOperation: null,
      sourceOperation: null,
      valueChannel: valueChannels.find((candidate) =>
        candidate.targetAccess?.productHandle === targetAccess.productHandle
      ) ?? null,
    }));
  }
  return [{
    localSuffix: '',
    targetAccess: targetAccesses[0] ?? null,
    targetOperation: targetOperations[0] ?? null,
    sourceOperation: sourceOperations[0] ?? null,
    valueChannel: valueChannels[0] ?? null,
  }];
}

function templateControllerResultAlias(
  store: KernelStore,
  binding: RuntimeDataFlowBinding,
  targetAccess: RuntimeBindingTargetAccess | null,
  ast: ExpressionAstNode | null,
): string | null {
  if (!(binding instanceof PropertyBinding)
    || binding.bindingMode !== TemplateBindingMode.FromView
    || binding.target !== 'value'
    || targetAccess?.targetControllerProductHandle == null
    || ast == null) {
    return null;
  }
  const unwrapped = unwrapParen(ast);
  if (unwrapped.$kind !== 'AccessScope' || unwrapped.ancestor !== 0) {
    return null;
  }
  const controller = store.productDetails.read(
    ConfigurationProductDetails.Controller,
    targetAccess.targetControllerProductHandle,
  );
  const controllerName = controller == null || !('name' in controller)
    ? null
    : controller.name;
  const semantics = controllerName == null
    ? null
    : runtimeHtmlTemplateControllerSemanticsForName(controllerName);
  return semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled
    || semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseRejected
    ? unwrapped.name.name
    : null;
}

function openReasonForDataFlow(input: {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
  readonly scope: BindingScope | null;
  readonly ast: ExpressionAstNode | null;
  readonly sourceEvaluation: ReturnType<CheckerExpressionTypeEvaluator['evaluateWithScope']> | null;
  readonly sourceOpenReason: string | null;
  readonly sourceWritable: boolean | null;
}): string | null {
  const reasons: string[] = [];
  if (input.direction === RuntimeBindingDataFlowDirection.Open) {
    reasons.push('Binding mode did not close to source-to-target, target-to-source, or two-way data flow.');
  }
  if (input.targetAccess == null && input.targetOperation == null && input.sourceOperation == null) {
    reasons.push('Runtime binding did not carry a target accessor/observer, direct target-operation, or source-operation product.');
  } else if (input.targetAccess?.openReason != null) {
    reasons.push(input.targetAccess.openReason);
  } else if (input.targetOperation?.openReason != null) {
    reasons.push(input.targetOperation.openReason);
  } else if (input.sourceOperation?.openReason != null) {
    reasons.push(input.sourceOperation.openReason);
  }
  if (input.valueChannel == null) {
    reasons.push('Runtime binding did not carry a value-channel product.');
  } else if (input.valueChannel.openReason != null) {
    reasons.push(input.valueChannel.openReason);
  }
  if (input.scope == null) {
    reasons.push('Runtime instruction scope was not available for binding expression lookup.');
  }
  if (input.ast == null) {
    reasons.push('Expression parser result did not expose an evaluable expression AST for binding data flow.');
  }
  if (input.sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
    reasons.push(input.sourceEvaluation.summary);
  }
  if (input.sourceOpenReason != null) {
    reasons.push(input.sourceOpenReason);
  }
  if (directionIncludesTargetToSource(input.direction) && !valueChannelMutatesCollection(input.valueChannel)) {
    if (input.sourceWritable === false) {
      reasons.push('Target-to-source data flow points at a source expression that is not assignable.');
    } else if (input.sourceWritable == null) {
      reasons.push('Target-to-source data flow could not prove that the source expression is assignable.');
    }
  }
  return reasons.length === 0 ? null : reasons.join(' ');
}

function valueChannelMutatesCollection(valueChannel: RuntimeBindingValueChannel | null): boolean {
  return valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedCollectionMembership
    || valueChannel?.channelKind === RuntimeBindingValueChannelKind.SelectMultipleOptionValues;
}

function openSourceExpressionInfo(): SourceExpressionInfo {
  return {
    sourceKind: RuntimeBindingDataFlowSourceKind.Open,
    sourceName: null,
    sourceWritable: null,
  };
}

function spreadSourceInfo(
  base: SourceExpressionInfo,
  targetProperty: string,
): SourceExpressionInfo {
  return {
    sourceKind: RuntimeBindingDataFlowSourceKind.Member,
    sourceName: base.sourceName == null ? targetProperty : `${base.sourceName}.${targetProperty}`,
    sourceWritable: null,
  };
}

function unwrapParen(expression: ExpressionAstNode): ExpressionAstNode {
  return expression.$kind === 'Paren'
    ? unwrapParen(expression.expression)
    : expression;
}

function sourceNameForExpression(expression: ExpressionAstNode): string | null {
  switch (expression.$kind) {
    case 'AccessScope':
      return expression.name.name;
    case 'AccessMember': {
      const owner = sourceNameForExpression(expression.object);
      return owner == null ? expression.name.name : `${owner}.${expression.name.name}`;
    }
    case 'AccessKeyed': {
      const owner = sourceNameForExpression(expression.object);
      return owner == null ? null : `${owner}[]`;
    }
    case 'AccessThis':
      return expression.ancestor === 0 ? '$this' : `$parent:${expression.ancestor}`;
    case 'Paren':
      return sourceNameForExpression(expression.expression);
    case 'ValueConverter':
      return sourceNameForExpression(expression.expression);
    case 'BindingBehavior':
      return sourceNameForExpression(expression.expression);
    case 'Unary':
      return sourceNameForExpression(expression.expression);
    case 'Binary':
      return compactSourceNames([
        sourceNameForExpression(expression.left),
        sourceNameForExpression(expression.right),
      ]);
    case 'Conditional':
      return compactSourceNames([
        sourceNameForExpression(expression.condition),
        sourceNameForExpression(expression.yes),
        sourceNameForExpression(expression.no),
      ]);
    case 'Interpolation':
      return compactSourceNames(expression.expressions.map((part) => sourceNameForExpression(part)));
    case 'CallScope':
      return expression.name.name;
    case 'CallMember': {
      const owner = sourceNameForExpression(expression.object);
      return owner == null ? `${expression.name.name}()` : `${owner}.${expression.name.name}()`;
    }
    default:
      return null;
  }
}

function compactSourceNames(names: readonly (string | null)[]): string | null {
  const compact = names.filter((name): name is string => name != null);
  return compact.length === 0 ? null : [...new Set(compact)].join(', ');
}

function memberWritable(member: CheckerTypeMember): boolean | null {
  if (member.memberKind === CheckerTypeMemberKind.Method
    || member.memberKind === CheckerTypeMemberKind.Constructor
    || member.memberKind === CheckerTypeMemberKind.CallSignature) {
    return false;
  }
  if (member.isReadonly) {
    return false;
  }
  const declarations = member.carrier?.declarations ?? [];
  if (declarations.some((declaration) => ts.isSetAccessorDeclaration(declaration))) {
    return true;
  }
  if (declarations.some((declaration) => ts.isGetAccessorDeclaration(declaration))) {
    return false;
  }
  return declarations.length === 0 ? null : true;
}
