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
  OpenSeamReasonKind,
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
  checkerExpressionTypeLocalKey,
} from '../kernel/local-key.js';
import {
  CheckerExpressionTypeEvaluationCache,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  checkerDeclarationsAreReadonly,
  checkerSymbolMemberKind,
  declarationsForCheckerSymbol,
} from '../type-system/checker-member-surface.js';
import {
  CheckerTypeMember,
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
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
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
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
import {
  runtimeAcceptedBindingExpressionAstForParse,
} from '../template/expression-parse-projection.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import {
  expressionProductHandleForBinding,
  instructionScopeMap,
  isRuntimeExpressionBinding,
  type RuntimeExpressionBinding,
} from './runtime-binding-expression.js';

type RuntimeDataFlowBinding = RuntimeExpressionBinding;

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
    /** Runtime-analysis shared cache for expression type evaluations keyed by scope/expression/role. */
    readonly expressionTypeCache: CheckerExpressionTypeEvaluationCache = new CheckerExpressionTypeEvaluationCache(),
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

interface BindingDataFlowSourceSet {
  readonly records: readonly KernelStoreRecord[];
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
}

interface BindingDataFlowRecordEmission {
  readonly dataFlow: RuntimeBindingDataFlow;
  readonly openSeams: readonly OpenSeam[];
  readonly records: readonly KernelStoreRecord[];
}

interface BindingDataFlowOpenSeamEmission {
  readonly openSeams: readonly OpenSeam[];
  readonly records: readonly KernelStoreRecord[];
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
  readonly sourceWriteCapability: SourceWriteCapability | null;
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
  readonly sourceTypeOpenReason: string | null;
  readonly sourceAssignmentTargetType: CheckerTypeReference | null;
  readonly targetPropertyType: CheckerTypeReference | null;
  readonly targetValueType: CheckerTypeReference | null;
  readonly sourceWritable: boolean | null;
  readonly sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | null;
  readonly sourceAssignmentReason: string | null;
  readonly sourceAssignmentReasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[];
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly openReason: string | null;
};

function runtimeBindingDataFlowForDraft(
  store: KernelStore,
  local: string,
  binding: RuntimeDataFlowBinding,
  target: DataFlowTarget,
  scope: BindingScope | null,
  draft: DataFlowDraft,
  fieldProvenance: readonly FieldProvenance<RuntimeBindingDataFlowField>[],
): RuntimeBindingDataFlow {
  return new RuntimeBindingDataFlow(
    store.handles.product(`${local}:binding-data-flow`), store.handles.identity(`${local}:binding-data-flow`),
    binding.toReference(),
    target.targetAccess?.toReference() ?? null, target.targetOperation?.toReference() ?? null,
    target.sourceOperation?.toReference() ?? null, target.valueChannel?.toReference() ?? null,
    draft.expressionProductHandle,
    scope?.toReference() ?? null,
    draft.direction,
    draft.sourceKind,
    draft.sourceName,
    draft.sourceType,
    draft.sourceTypeOpenReason,
    draft.sourceAssignmentTargetType,
    draft.targetPropertyType,
    draft.targetValueType,
    draft.sourceWritable,
    draft.sourceAssignmentKind, draft.sourceAssignmentReason,
    draft.sourceAssignmentReasonKinds,
    draft.sourceToTargetAssignable, draft.targetToSourceAssignable,
    draft.openReason,
    binding.sourceAddressHandle,
    fieldProvenance,
  );
}

type DataFlowTargetTypes = {
  readonly spreadTargetProperty: string | null;
  readonly targetPropertyType: CheckerTypeReference | null;
  readonly targetValueType: CheckerTypeReference | null;
};

type DataFlowExpressionFacts = {
  readonly expressionProductHandle: ProductHandle | null;
  readonly ast: ExpressionAstNode | null;
  readonly expressionTypeLocal: string;
};

type DataFlowSourceProjection = {
  readonly sourceInfo: SourceExpressionInfo;
  readonly sourceType: CheckerTypeReference | null;
  readonly sourceTypeOpenReason: string | null;
};

type DataFlowAssignability = {
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
};

const enum SourceWriteCapabilityKind {
  Writable = 'writable',
  TypeScriptStrictness = 'typescript-strictness',
  RuntimeUnassignable = 'runtime-unassignable',
  Open = 'open',
}

type SourceWriteCapability = {
  readonly capabilityKind: SourceWriteCapabilityKind;
  readonly checkerWritable: boolean | null;
  readonly reason: string | null;
  readonly reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind | null;
  readonly assignmentTargetType: CheckerTypeReference | null;
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
    const evaluator = new CheckerExpressionTypeEvaluator(
      this.store,
      this.typeProjector,
      input.resourceScope,
      input.expressionTypeCache,
    );
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
    if (!isRuntimeExpressionBinding(binding)) {
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
    const local = `${input.localKey}:binding:${bindingIndex}:${binding.productHandle}${target.localSuffix}`;
    const dataFlow = this.dataFlowForBinding(binding, target, scope, context.evaluator, local, source);
    const claim = this.claimForDataFlow(local, binding, dataFlow, source);
    const openSeams = this.openSeamEmissionForDataFlow(local, binding, target, dataFlow, source);
    return {
      dataFlow,
      openSeams: openSeams.openSeams,
      records: [
        ...openSeams.records,
        ...this.dataFlowRecords(local, binding, target, dataFlow, claim, openSeams.openSeams, source),
      ],
    };
  }

  private claimForDataFlow(
    local: string,
    binding: RuntimeDataFlowBinding,
    dataFlow: RuntimeBindingDataFlow,
    source: BindingDataFlowSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-uses-data-flow`),
      binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesDataFlow.key,
      dataFlow.productHandle,
      source.provenanceHandle,
    );
  }

  private openSeamEmissionForDataFlow(
    local: string,
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    dataFlow: RuntimeBindingDataFlow,
    source: BindingDataFlowSourceSet,
  ): BindingDataFlowOpenSeamEmission {
    if (dataFlow.openReason == null) {
      return { openSeams: [], records: [] };
    }
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    this.recordOpenSeam(
      `${local}:open-data-flow`,
      dataFlow.openReason,
      binding.sourceAddressHandle,
      source,
      records,
      openSeams,
      KernelVocabulary.Binding.OpenDataFlow.key,
      target.valueChannel?.openReasonKinds ?? [],
    );
    return { openSeams, records };
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
    return runtimeBindingDataFlowForDraft(
      this.store,
      local,
      binding,
      target,
      scope,
      draft,
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
    const needsSourceWriteCapability = directionIncludesTargetToSource(direction);
    const expressionFacts = this.dataFlowExpressionFacts(binding, scope, local);
    const targetTypes = this.dataFlowTargetTypes(binding, target);
    const sourceProjection = this.dataFlowSourceProjection(
      binding,
      target,
      scope,
      evaluator,
      needsSourceWriteCapability,
      expressionFacts,
      targetTypes,
    );
    const assignability = this.dataFlowAssignability(
      direction,
      sourceProjection.sourceType,
      targetTypes.targetValueType,
      target.valueChannel,
    );
    const sourceAssignment = sourceAssignmentForDataFlow({
      direction,
      sourceInfo: sourceProjection.sourceInfo,
      targetToSourceAssignable: assignability.targetToSourceAssignable,
      valueChannel: target.valueChannel,
      sourceType: sourceProjection.sourceType,
      targetValueType: targetTypes.targetValueType,
    });
    const openReason = openReasonForDataFlow({
      direction,
      targetAccess: target.targetAccess,
      targetOperation: target.targetOperation,
      sourceOperation: target.sourceOperation,
      valueChannel: target.valueChannel,
      scope,
      ast: expressionFacts.ast,
      sourceOpenReason: null,
      sourceAssignmentKind: sourceAssignment.kind,
    });

    return {
      expressionProductHandle: expressionFacts.expressionProductHandle,
      direction,
      sourceKind: sourceProjection.sourceInfo.sourceKind,
      sourceName: sourceProjection.sourceInfo.sourceName,
      sourceType: sourceProjection.sourceType,
      sourceTypeOpenReason: sourceProjection.sourceTypeOpenReason,
      sourceAssignmentTargetType: needsSourceWriteCapability
        ? sourceProjection.sourceInfo.sourceWriteCapability?.assignmentTargetType ?? sourceProjection.sourceType
        : null,
      targetPropertyType: targetTypes.targetPropertyType,
      targetValueType: targetTypes.targetValueType,
      sourceWritable: needsSourceWriteCapability
        ? sourceProjection.sourceInfo.sourceWriteCapability?.checkerWritable ?? null
        : null,
      sourceAssignmentKind: sourceAssignment.kind,
      sourceAssignmentReason: sourceAssignment.reason,
      sourceAssignmentReasonKinds: sourceAssignment.reasonKinds,
      sourceToTargetAssignable: assignability.sourceToTargetAssignable,
      targetToSourceAssignable: assignability.targetToSourceAssignable,
      openReason,
    };
  }

  private dataFlowExpressionFacts(
    binding: RuntimeDataFlowBinding,
    scope: BindingScope | null,
    local: string,
  ): DataFlowExpressionFacts {
    const expressionProductHandle = expressionProductHandleForBinding(binding);
    const parse = this.readParse(expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    return {
      expressionProductHandle,
      ast,
      expressionTypeLocal: scope == null || ast == null
        ? local
        : checkerExpressionTypeLocalKey(scope.productHandle, binding.productHandle, expressionProductHandle),
    };
  }

  private dataFlowTargetTypes(
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
  ): DataFlowTargetTypes {
    const targetPropertyType = target.targetAccess?.propertyType ?? null;
    return {
      spreadTargetProperty: binding instanceof SpreadValueBinding
        ? target.targetAccess?.targetProperty ?? null
        : null,
      targetPropertyType,
      targetValueType: target.valueChannel?.runtimeValueType ?? target.sourceOperation?.targetType ?? targetPropertyType,
    };
  }

  private dataFlowSourceProjection(
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    needsSourceWriteCapability: boolean,
    expressionFacts: DataFlowExpressionFacts,
    targetTypes: DataFlowTargetTypes,
  ): DataFlowSourceProjection {
    const templateControllerAlias = templateControllerResultAlias(
      this.store,
      binding,
      target.targetAccess,
      expressionFacts.ast,
    );
    const sourceInfo = this.dataFlowSourceInfo(
      binding,
      scope,
      evaluator,
      needsSourceWriteCapability,
      expressionFacts,
      templateControllerAlias,
    );
    const sourceEvaluation = templateControllerAlias != null || scope == null || expressionFacts.ast == null
      ? null
      : evaluator.evaluateWithScope(
        expressionFacts.ast,
        scope,
        expressionFacts.expressionTypeLocal,
        binding.sourceAddressHandle,
        targetTypes.targetValueType,
      );
    const evaluatedSourceType = sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? sourceEvaluation.typeReference
      : templateControllerAlias != null
        ? targetTypes.targetValueType
        : null;
    const sourceType = targetTypes.spreadTargetProperty == null
      ? evaluatedSourceType
      : this.memberType(evaluatedSourceType, targetTypes.spreadTargetProperty);
    const spreadSourceTypeOpenReason = targetTypes.spreadTargetProperty != null
      && evaluatedSourceType != null
      && sourceType == null
      ? `SpreadValueBinding source expression type did not expose bindable property '${targetTypes.spreadTargetProperty}'.`
      : null;
    return {
      sourceInfo: targetTypes.spreadTargetProperty == null
        ? sourceInfo
        : spreadSourceInfo(sourceInfo, targetTypes.spreadTargetProperty),
      sourceType,
      sourceTypeOpenReason: sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Open
        ? sourceEvaluation.summary
        : spreadSourceTypeOpenReason,
    };
  }

  private dataFlowSourceInfo(
    binding: RuntimeDataFlowBinding,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    needsSourceWriteCapability: boolean,
    expressionFacts: DataFlowExpressionFacts,
    templateControllerAlias: string | null,
  ): SourceExpressionInfo {
    if (templateControllerAlias != null) {
      return {
        sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
        sourceName: templateControllerAlias,
        sourceWriteCapability: needsSourceWriteCapability ? sourceWriteCapabilityWritable() : null,
      };
    }
    if (scope == null || expressionFacts.ast == null) {
      return openSourceExpressionInfo(needsSourceWriteCapability);
    }
    return this.sourceInfoForExpression(
      expressionFacts.ast,
      scope,
      evaluator,
      expressionFacts.expressionTypeLocal,
      binding.sourceAddressHandle,
      needsSourceWriteCapability,
    );
  }

  private dataFlowAssignability(
    direction: RuntimeBindingDataFlowDirection,
    sourceType: CheckerTypeReference | null,
    targetValueType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): DataFlowAssignability {
    return {
      sourceToTargetAssignable: directionIncludesSourceToTarget(direction)
        ? this.isSourceAssignableToTarget(sourceType, targetValueType, valueChannel)
        : null,
      targetToSourceAssignable: directionIncludesTargetToSource(direction)
        ? this.isTargetAssignableToSource(targetValueType, sourceType, valueChannel)
        : null,
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
      draft.sourceTypeOpenReason == null ? null : new FieldProvenance('sourceTypeOpenReason', source.provenanceHandle),
      draft.sourceAssignmentTargetType == null ? null : new FieldProvenance('sourceAssignmentTargetType', source.provenanceHandle),
      draft.targetPropertyType == null ? null : new FieldProvenance('targetPropertyType', source.provenanceHandle),
      draft.targetValueType == null ? null : new FieldProvenance('targetValueType', source.provenanceHandle),
      draft.sourceWritable == null ? null : new FieldProvenance('sourceWritable', source.provenanceHandle),
      draft.sourceAssignmentKind == null ? null : new FieldProvenance('sourceAssignmentKind', source.provenanceHandle),
      draft.sourceAssignmentReason == null ? null : new FieldProvenance('sourceAssignmentReason', source.provenanceHandle),
      draft.sourceAssignmentReasonKinds.length === 0 ? null : new FieldProvenance('sourceAssignmentReasonKinds', source.provenanceHandle),
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
    needsSourceWriteCapability: boolean,
  ): SourceExpressionInfo {
    const unwrapped = unwrapParen(expression);
    switch (unwrapped.$kind) {
      case 'BindingBehavior':
      case 'ValueConverter':
        return this.sourceInfoForExpression(
          unwrapped.expression,
          scope,
          evaluator,
          local,
          sourceAddressHandle,
          needsSourceWriteCapability,
        );
      case 'AccessScope':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapabilityForAccessScope(unwrapped, scope)
            : null,
        };
      case 'AccessMember':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Member,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapabilityForAccessMember(
              unwrapped,
              scope,
              evaluator,
              local,
              sourceAddressHandle,
            )
            : null,
        };
      case 'AccessKeyed':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Keyed,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability ? sourceWriteCapabilityWritable() : null,
        };
      case 'AccessThis':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.This,
          sourceName: '$this',
          sourceWriteCapability: needsSourceWriteCapability
            ? sourceWriteCapabilityRuntimeUnassignable(
              'Aurelia astAssign does not assign to AccessThis expressions.',
              RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
            )
            : null,
        };
      default:
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Other,
          sourceName: sourceNameForExpression(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? sourceWriteCapabilityRuntimeUnassignable(
              `Aurelia astAssign does not assign to expression kind '${unwrapped.$kind}'.`,
              RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
            )
            : null,
        };
    }
  }

  private sourceWriteCapabilityForAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
  ): SourceWriteCapability {
    const lookup = scope.lookup(expression.name.name, expression.ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return sourceWriteCapabilityOpen(
        'Scope lookup could not resolve the requested ancestor for runtime assignment.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeLookupMissingAncestor,
      );
    }
    return lookup.slot == null
      ? sourceWriteCapabilityTypeScriptStrictness(
        'Scope lookup did not expose a TypeChecker slot; Aurelia astAssign can still write to the runtime context.',
        null,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotMissingTypeCheckerMember,
      )
      : this.slotWriteCapability(lookup.slot);
  }

  private sourceWriteCapabilityForAccessMember(
    expression: AccessMemberExpression,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
  ): SourceWriteCapability {
    const ownerEvaluation = evaluator.evaluateWithScope(
      expression.object,
      scope,
      `${local}:owner:${expression.name.name}`,
      sourceAddressHandle,
    );
    if (ownerEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return sourceWriteCapabilityOpen(
        ownerEvaluation.summary,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerTypeOpen,
      );
    }
    const ownerShape = this.readTypeShape(ownerEvaluation.typeReference);
    const member = ownerShape?.members.find((candidate) => candidate.name === expression.name.name) ?? null;
    if (member != null) {
      return memberWriteCapability(member);
    }
    const checkerMember = checkerMemberForOwnerType(ownerShape, expression.name.name);
    if (checkerMember != null) {
      return checkerSymbolWriteCapability(checkerMember.symbol, checkerMember.declarations);
    }
    const stringIndexInfo = checkerStringIndexInfoForOwnerType(ownerShape);
    if (stringIndexInfo != null) {
      return stringIndexInfo.isReadonly
        ? sourceWriteCapabilityTypeScriptStrictness(
          `Owner type '${ownerShape?.display ?? ownerEvaluation.typeReference.display ?? 'unknown'}' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects.`,
          false,
          RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly,
        )
        : sourceWriteCapabilityWritable();
    }
    return sourceWriteCapabilityTypeScriptStrictness(
      `Owner type '${ownerShape?.display ?? ownerEvaluation.typeReference.display ?? 'unknown'}' did not project member '${expression.name.name}'; Aurelia astAssign can still write to runtime objects.`,
      null,
      RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerMemberNotProjected,
      ownerEvaluation.typeReference,
    );
  }

  private slotWriteCapability(slot: BindingContextSlot): SourceWriteCapability {
    if (slot.targetProductHandle == null) {
      return sourceWriteCapabilityTypeScriptStrictness(
        'Scope slot is runtime-only and does not carry a TypeChecker member product; Aurelia astAssign can still write to the runtime context.',
        null,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotRuntimeOnly,
      );
    }
    const member = this.store.productDetails.read(TypeSystemProductDetails.TypeMember, slot.targetProductHandle);
    return member == null
      ? sourceWriteCapabilityOpen(
        'Scope slot member product was not available for runtime assignment policy.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotTypeCheckerMemberUnavailable,
      )
      : memberWriteCapability(member);
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
    if (valueChannelMutatesCollection(valueChannel)) {
      return valueDomain.length > 0
        ? this.isStringDomainAssignableToCollectionElement(valueDomain, sourceType)
        : this.isTypeAssignableToCollectionElement(targetType, sourceType);
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
    if (valueChannelMutatesCollection(valueChannel)) {
      return valueDomain.length > 0
        ? this.isStringDomainAssignableToCollectionElement(valueDomain, sourceType)
        : this.isTypeAssignableToCollectionElement(targetType, sourceType);
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

  private isTypeAssignableToCollectionElement(
    valueType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
  ): boolean | null {
    const sourceShape = this.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    const valueShape = this.readTypeShape(valueType);
    const valueCarrier = valueShape?.carrier ?? null;
    if (sourceCarrier == null || valueCarrier == null || sourceCarrier.checker !== valueCarrier.checker) {
      return null;
    }
    const elementType = collectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    return elementType == null
      ? null
      : sourceCarrier.checker.isTypeAssignableTo(valueCarrier.type, elementType);
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
    if (member?.valueType != null) {
      return member.valueType;
    }
    if (shape == null || reference == null) {
      return null;
    }
    return this.projectCheckerMemberType(reference, shape, propertyName);
  }

  private projectCheckerMemberType(
    reference: CheckerTypeReference,
    shape: CheckerTypeShape,
    propertyName: string,
  ): CheckerTypeReference | null {
    const carrier = shape.carrier;
    if (carrier == null) {
      return null;
    }
    const checker = carrier.checker;
    const symbol = checker.getPropertyOfType(carrier.type, propertyName)
      ?? checker.getPropertyOfType(checker.getApparentType(carrier.type), propertyName);
    if (symbol == null) {
      return null;
    }
    const location = carrier.declarations[0]
      ?? symbol.valueDeclaration
      ?? symbol.declarations?.[0]
      ?? null;
    if (location == null) {
      return null;
    }
    const type = checker.getTypeOfSymbolAtLocation(symbol, location);
    return this.typeProjector.ensureProjection({
      localKey: `${reference.productHandle ?? reference.checkerKey ?? 'open'}:member:${propertyName}`,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: location,
    } satisfies CheckerTypeProjectionRequest).toReference();
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
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): OpenSeam {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
      reasonKinds,
    );
    openSeams.push(seam);
    records.push(seam);
    return seam;
  }

  private recordsForSource(local: string): BindingDataFlowSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-data-flow:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-data-flow:${local}`);
    return {
      records: [
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
    };
  }
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

function sourceAssignmentForDataFlow(input: {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly sourceInfo: SourceExpressionInfo;
  readonly targetToSourceAssignable: boolean | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
  readonly sourceType: CheckerTypeReference | null;
  readonly targetValueType: CheckerTypeReference | null;
}): {
  readonly kind: RuntimeBindingDataFlowSourceAssignmentKind | null;
  readonly reason: string | null;
  readonly reasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[];
} {
  if (!directionIncludesTargetToSource(input.direction) || valueChannelMutatesCollection(input.valueChannel)) {
    return { kind: null, reason: null, reasonKinds: [] };
  }
  const sourceWriteCapability = input.sourceInfo.sourceWriteCapability;
  if (sourceWriteCapability == null) {
    return {
      kind: RuntimeBindingDataFlowSourceAssignmentKind.Open,
      reason: 'Target-to-source data flow did not request source write capability.',
      reasonKinds: [],
    };
  }
  switch (sourceWriteCapability.capabilityKind) {
    case SourceWriteCapabilityKind.Writable: {
      const typeReason = targetToSourceStrictnessReason(input.targetToSourceAssignable, input.targetValueType, input.sourceType);
      return typeReason == null
        ? { kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignable, reason: null, reasonKinds: [] }
        : {
          kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness,
          reason: typeReason.reason,
          reasonKinds: [typeReason.kind],
        };
    }
    case SourceWriteCapabilityKind.TypeScriptStrictness: {
      const typeReason = targetToSourceStrictnessReason(input.targetToSourceAssignable, input.targetValueType, input.sourceType);
      const reasons = compactStrings([
        sourceWriteCapability.reason,
        typeReason?.reason,
      ]);
      return {
        kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness,
        reason: reasons.join(' '),
        reasonKinds: compactReasonKinds([
          sourceWriteCapability.reasonKind,
          typeReason?.kind,
        ]),
      };
    }
    case SourceWriteCapabilityKind.RuntimeUnassignable:
      return {
        kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeUnassignable,
        reason: sourceWriteCapability.reason,
        reasonKinds: compactReasonKinds([sourceWriteCapability.reasonKind]),
      };
    case SourceWriteCapabilityKind.Open:
      return {
        kind: RuntimeBindingDataFlowSourceAssignmentKind.Open,
        reason: sourceWriteCapability.reason,
        reasonKinds: compactReasonKinds([sourceWriteCapability.reasonKind]),
      };
  }
}

function targetToSourceStrictnessReason(
  targetToSourceAssignable: boolean | null,
  targetValueType: CheckerTypeReference | null,
  sourceType: CheckerTypeReference | null,
): { readonly kind: RuntimeBindingDataFlowSourceAssignmentReasonKind; readonly reason: string } | null {
  return targetToSourceAssignable === false
    ? {
      kind: RuntimeBindingDataFlowSourceAssignmentReasonKind.TargetToSourceTypeMismatch,
      reason: `TypeChecker target-to-source assignment is not assignable (${typeDisplay(targetValueType)} -> ${typeDisplay(sourceType)}); Aurelia runtime still passes the observer value to astAssign.`,
    }
    : null;
}

function typeDisplay(reference: CheckerTypeReference | null): string {
  return reference?.display ?? 'unknown';
}

function openReasonForDataFlow(input: {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
  readonly scope: BindingScope | null;
  readonly ast: ExpressionAstNode | null;
  readonly sourceOpenReason: string | null;
  readonly sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | null;
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
  if (input.sourceOpenReason != null) {
    reasons.push(input.sourceOpenReason);
  }
  if (directionIncludesTargetToSource(input.direction) && !valueChannelMutatesCollection(input.valueChannel)) {
    if (input.sourceAssignmentKind === RuntimeBindingDataFlowSourceAssignmentKind.Open) {
      reasons.push('Target-to-source data flow could not prove runtime source assignment.');
    }
  }
  return reasons.length === 0 ? null : reasons.join(' ');
}

function valueChannelMutatesCollection(valueChannel: RuntimeBindingValueChannel | null): boolean {
  return valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedCollectionMembership
    || valueChannel?.channelKind === RuntimeBindingValueChannelKind.SelectMultipleOptionValues;
}

function openSourceExpressionInfo(needsSourceWriteCapability: boolean): SourceExpressionInfo {
  return {
    sourceKind: RuntimeBindingDataFlowSourceKind.Open,
    sourceName: null,
    sourceWriteCapability: needsSourceWriteCapability
      ? sourceWriteCapabilityOpen(
        'Binding expression source could not be resolved.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceUnresolved,
      )
      : null,
  };
}

function spreadSourceInfo(
  base: SourceExpressionInfo,
  targetProperty: string,
): SourceExpressionInfo {
  return {
    sourceKind: RuntimeBindingDataFlowSourceKind.Member,
    sourceName: base.sourceName == null ? targetProperty : `${base.sourceName}.${targetProperty}`,
    sourceWriteCapability: base.sourceWriteCapability == null
      ? null
      : sourceWriteCapabilityOpen(
        'SpreadValueBinding source property assignment policy has not been projected from the spread source member.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SpreadSourceMemberPolicyOpen,
      ),
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

function sourceWriteCapabilityWritable(): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.Writable,
    checkerWritable: true,
    reason: null,
    reasonKind: null,
    assignmentTargetType: null,
  };
}

function sourceWriteCapabilityTypeScriptStrictness(
  reason: string,
  checkerWritable: boolean | null,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
  assignmentTargetType: CheckerTypeReference | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.TypeScriptStrictness,
    checkerWritable,
    reason,
    reasonKind,
    assignmentTargetType,
  };
}

function sourceWriteCapabilityRuntimeUnassignable(
  reason: string,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.RuntimeUnassignable,
    checkerWritable: false,
    reason,
    reasonKind,
    assignmentTargetType: null,
  };
}

function sourceWriteCapabilityOpen(
  reason: string,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.Open,
    checkerWritable: null,
    reason,
    reasonKind,
    assignmentTargetType: null,
  };
}

function memberWriteCapability(member: CheckerTypeMember): SourceWriteCapability {
  return memberSurfaceWriteCapability(
    member.name,
    member.memberKind,
    member.isReadonly,
    member.carrier?.declarations ?? [],
  );
}

function checkerSymbolWriteCapability(
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
): SourceWriteCapability {
  return memberSurfaceWriteCapability(
    symbol.getName(),
    checkerSymbolMemberKind(symbol, declarations),
    checkerDeclarationsAreReadonly(declarations),
    declarations,
  );
}

function memberSurfaceWriteCapability(
  memberName: string,
  memberKind: CheckerTypeMemberKind,
  isReadonly: boolean,
  declarations: readonly ts.Declaration[],
): SourceWriteCapability {
  if (memberKind === CheckerTypeMemberKind.Method
    || memberKind === CheckerTypeMemberKind.Constructor
    || memberKind === CheckerTypeMemberKind.CallSignature) {
    return sourceWriteCapabilityRuntimeUnassignable(
      `Source member '${memberName}' is a ${memberKind} and is not an Aurelia astAssign target.`,
      RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberRuntimeUnassignable,
    );
  }
  if (declarations.some((declaration) => ts.isSetAccessorDeclaration(declaration))) {
    return sourceWriteCapabilityWritable();
  }
  if (declarations.some((declaration) => ts.isGetAccessorDeclaration(declaration))) {
    return sourceWriteCapabilityRuntimeUnassignable(
      `Source member '${memberName}' is a getter without a setter at runtime.`,
      RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberGetterWithoutSetter,
    );
  }
  if (isReadonly) {
    return sourceWriteCapabilityTypeScriptStrictness(
      `Source member '${memberName}' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment.`,
      false,
      RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly,
    );
  }
  return declarations.length === 0
    ? sourceWriteCapabilityOpen(
      `Source member '${memberName}' did not expose declarations for assignment policy.`,
      RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberDeclarationMissing,
    )
    : sourceWriteCapabilityWritable();
}

function checkerMemberForOwnerType(
  ownerType: CheckerTypeShape | null,
  memberName: string,
): { readonly symbol: ts.Symbol; readonly declarations: readonly ts.Declaration[] } | null {
  const carrier = ownerType?.carrier ?? null;
  if (carrier == null) {
    return null;
  }
  const symbol = carrier.checker.getPropertyOfType(carrier.type, memberName)
    ?? carrier.checker.getPropertyOfType(carrier.checker.getApparentType(carrier.type), memberName);
  if (symbol == null) {
    return null;
  }
  return {
    symbol,
    declarations: declarationsForCheckerSymbol(symbol),
  };
}

function checkerStringIndexInfoForOwnerType(
  ownerType: CheckerTypeShape | null,
): ts.IndexInfo | null {
  const carrier = ownerType?.carrier ?? null;
  if (carrier == null) {
    return null;
  }
  return carrier.checker.getIndexInfoOfType(carrier.type, ts.IndexKind.String)
    ?? carrier.checker.getIndexInfoOfType(carrier.checker.getApparentType(carrier.type), ts.IndexKind.String)
    ?? null;
}

function compactStrings(values: readonly (string | null | undefined)[]): readonly string[] {
  return values.filter((value): value is string => value != null && value.length > 0);
}

function compactReasonKinds(
  values: readonly (RuntimeBindingDataFlowSourceAssignmentReasonKind | null | undefined)[],
): readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[] {
  return [...new Set(values.filter((value): value is RuntimeBindingDataFlowSourceAssignmentReasonKind => value != null))];
}
