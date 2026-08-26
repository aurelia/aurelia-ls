import {
  isRuntimeArrayInstanceType,
} from '../type-system/checker-collection-types.js';
import type {
  ExpressionAstNode,
} from '../expression/ast.js';
import { runtimeAssignmentTargetAstForExpression } from '../expression/runtime-assignment.js';
import {
  BindingScope,
} from '../configuration/scope.js';
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
  materializationOpenSeamHandlesForOwners,
} from '../kernel/materialization.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
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
  type CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from '../type-system/expression-type-evaluation.js';
import type { RuntimeAssignmentValueConverterWritebackStage } from '../type-system/value-converter-writeback.js';
import {
  CheckerExpressionTypeEvaluationContext,
} from '../type-system/expression-type-context.js';
import {
  type CheckerExpressionTypeWorld,
} from '../type-system/expression-type-world.js';
import {
  checkerRepeatableElementTypeInfo,
} from '../type-system/checker-related-types.js';
import {
  checkerCallableReferenceReturnAssignableToPrimitiveType,
} from '../type-system/checker-primitive-types.js';
import {
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import {
  CheckerTypeShapeAccess,
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import {
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import {
  bindingExpressionAstForProduct,
} from '../template/expression-parse-product.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { ObservationProductDetails } from './product-details.js';
import {
  ListenerBinding,
  PropertyBinding,
  RefBinding,
  RuntimeBindingTargetAccessStrategy,
  SpreadValueBinding,
  StateDispatchBinding,
  type RuntimeBinding,
  type RuntimeBindingSourceOperation,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingDataFlow,
  RuntimeBindingDataFlowValueConverterWritebackStage,
  RuntimeBindingDataFlowDirection,
  RuntimeBindingSourceEvaluationKind,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
  RuntimeBindingDataFlowSourceKind,
  RuntimeBindingDataFlowTypeMismatchKind,
  RuntimeBindingObservedDependency,
  type RuntimeBindingValueChannel,
  RuntimeBindingValueChannelKind,
  RuntimeBindingValueChannelTargetMutationKind,
} from './runtime-binding-observation.js';
import {
  RuntimeObservedDependencyKind,
  RuntimeObservedMemberSourceRoute,
} from './runtime-observed-dependency.js';
import {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from '../runtime-expression/runtime-operation.js';
import {
  RuntimeExpressionOperationKind,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import {
  runtimeBindingSourceLifecycleIncludesOperation,
  runtimeBindingSourceLifecycle,
} from './runtime-binding-source-lifecycle.js';
import {
  type RuntimeBindingExpressionScopeProjectionReader,
} from './runtime-binding-expression-scope.js';
import {
  checkerContextForRuntimeBindingSourceExpressionProjection,
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
  type RuntimeBindingSourceExpressionContextProjection,
  type RuntimeBindingSourceExpressionProjection,
} from './runtime-binding-source-expression-context.js';
import {
  type RuntimeObservedDependencyAccessUseDraft,
} from './runtime-observed-dependency-draft.js';
import {
  runtimeObservedDependencyOccurrence,
  type RuntimeObservedMemberSourceProjection,
} from './observed-dependency-member-source.js';
import {
  runtimeObservedDependencyRecords,
} from './runtime-observed-dependency-publication.js';
import {
  RuntimeHtmlObservationFrameworkErrorCode,
  RuntimeObservationFrameworkErrorCode,
  type ObservationFrameworkErrorCode,
} from './framework-error-code.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type {
  RuntimeBindingObservationEffectDraft,
  RuntimeExpressionAccessEmission,
} from './runtime-expression-access-materializer.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { RuntimeExpressionResourcePlan } from '../template/runtime-expression-resource-plan.js';
import {
  RuntimeValueConverterApplicationPhase,
} from '../template/runtime-value-converter.js';
import type { RuntimeValueConverterEmission } from '../template/runtime-value-converter-materializer.js';
import type { RuntimeBindingValueChannelEmission } from './binding-value-channel-materializer.js';
import { expressionSourceSpansEqual } from '../expression/source-span.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import {
  expressionProductHandleForBinding,
  instructionScopeLookup,
  isRuntimeDataFlowBinding,
  isRuntimeSourceOnlyDataFlowBinding,
  runtimeBindingSourceExpression,
  runtimeBindingSourceExpressionChainIndex,
  type RuntimeInstructionScopeLookup,
  type RuntimeDataFlowBinding,
} from './runtime-binding-expression.js';
import {
  templateBindingModeIncludesSourceToTarget,
  templateBindingModeIncludesTargetToSource,
} from '../template/runtime-binding-mode-behavior.js';
import {
  BindingDataFlowSourceWriteCapabilityProjector,
  runtimeAssignmentInputScopeForAccessScope,
} from './binding-source-write-capability.js';
import {
  BindingDataFlowSourceInfoProjector,
  spreadSourceInfo,
  type SourceExpressionInfo,
} from './binding-data-flow-source-info.js';
import {
  BindingDataFlowAssignabilityEvaluator,
  bindingValueChannelMutatesCollection,
  type BindingDataFlowAssignabilityTypeAccess,
} from './binding-data-flow-assignability.js';
import {
  sourceAssignmentForDataFlow,
} from './binding-data-flow-source-assignment.js';
import {
  bindingDataFlowDirectionIncludesSourceToTarget,
  bindingDataFlowDirectionIncludesTargetToSource,
} from './binding-data-flow-direction.js';

export class RuntimeBindingDataFlowMaterializationRequest {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Runtime binding products produced by renderer dispatch. */
    readonly runtimeBindings: RuntimeRenderingEmission,
    /** Reached binding-behavior effects that determine runtime direction. */
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
    /** Existing converter phase applications used as lifecycle/source identity for writeback stages. */
    readonly valueConverters: RuntimeValueConverterEmission,
    /** Controller.bind target-side products produced by binding-owned target setup. */
    readonly controllerBind: RuntimeControllerBindEmission,
    /** Value channels visible to runtime property, attribute, and interpolation bindings. */
    readonly valueChannels: RuntimeBindingValueChannelEmission,
    /** Authored access resolutions, runtime uses, and their derived connectable effects. */
    readonly expressionAccesses: RuntimeExpressionAccessEmission,
    /** Runtime Scope applications visible to instruction-owned expressions. */
    readonly scopes: TemplateScopeConstructionEmission,
    /** Runtime-analysis expression world shared by scope, value-channel, and data-flow phases. */
    readonly expressionWorld: CheckerExpressionTypeWorld,
  ) {}
}

export class RuntimeBindingDataFlowEmission {
  private readonly dataFlowsByBinding = new Map<ProductHandle, RuntimeBindingDataFlow[]>();
  private readonly observedDependenciesByBinding = new Map<ProductHandle, RuntimeBindingObservedDependency[]>();

  constructor(
    /** Runtime binding data-flow products materialized for property, attribute, and interpolation bindings. */
    readonly dataFlows: readonly RuntimeBindingDataFlow[],
    /** Source-side expression dependencies collected for source-to-target binding evaluation. */
    readonly observedDependencies: readonly RuntimeBindingObservedDependency[],
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
    for (const dependency of observedDependencies) {
      if (dependency.binding.productHandle == null) {
        continue;
      }
      let rows = this.observedDependenciesByBinding.get(dependency.binding.productHandle);
      if (rows === undefined) {
        rows = [];
        this.observedDependenciesByBinding.set(dependency.binding.productHandle, rows);
      }
      rows.push(dependency);
    }
  }

  readDataFlowsForBinding(productHandle: ProductHandle): readonly RuntimeBindingDataFlow[] {
    return this.dataFlowsByBinding.get(productHandle) ?? [];
  }

  readObservedDependenciesForBinding(productHandle: ProductHandle): readonly RuntimeBindingObservedDependency[] {
    return this.observedDependenciesByBinding.get(productHandle) ?? [];
  }
}

interface BindingDataFlowSourceSet {
  readonly records: readonly KernelStoreRecord[];
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
}

interface BindingDataFlowRecordEmission {
  readonly dataFlow: RuntimeBindingDataFlow;
  readonly observedDependencies: readonly RuntimeBindingObservedDependency[];
  readonly openSeams: readonly OpenSeam[];
  readonly records: readonly KernelStoreRecord[];
}

interface BindingDataFlowProductEmission {
  readonly dataFlow: RuntimeBindingDataFlow;
  readonly observedDependencies: readonly RuntimeBindingObservedDependency[];
  readonly localOpenReasons: readonly BindingDataFlowOpenReason[];
}

interface BindingDataFlowOpenSeamEmission {
  readonly openSeams: readonly OpenSeam[];
  readonly openSeamHandles: readonly OpenSeam['handle'][];
  readonly records: readonly KernelStoreRecord[];
}

class BindingDataFlowMaterializationFrame {
  readonly records: KernelStoreRecord[];
  readonly dataFlows: RuntimeBindingDataFlow[] = [];
  readonly observedDependencies: RuntimeBindingObservedDependency[] = [];
  readonly openSeams: OpenSeam[] = [];

  constructor(
    readonly source: BindingDataFlowSourceSet,
    readonly instructionScopes: RuntimeInstructionScopeLookup,
    readonly context: BindingDataFlowSharedContext,
  ) {
    this.records = [...source.records];
  }

  record(emission: BindingDataFlowRecordEmission): void {
    this.records.push(...emission.records);
    this.openSeams.push(...emission.openSeams);
    this.dataFlows.push(emission.dataFlow);
    this.observedDependencies.push(...emission.observedDependencies);
  }

  toEmission(): RuntimeBindingDataFlowEmission {
    return new RuntimeBindingDataFlowEmission(this.dataFlows, this.observedDependencies, this.openSeams, this.records);
  }
}

type BindingDataFlowSharedContext = {
  readonly runtimeBindings: RuntimeRenderingEmission;
  readonly instructionScopes: RuntimeInstructionScopeLookup;
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader;
  readonly sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector;
  readonly draftMaterializer: RuntimeBindingDataFlowDraftMaterializer;
};

type BindingDataFlowContext = BindingDataFlowSharedContext & {
  readonly evaluator: CheckerExpressionTypeEvaluator;
  readonly resourceScope: TemplateResourceScope;
};

type DataFlowTarget = {
  readonly localSuffix: string;
  readonly sourceOnly: boolean;
  /** Generated spread-member operation selected by this target, when applicable. */
  readonly spreadMemberOperationIndex: number | null;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
};

type DataFlowDraft = {
  readonly ast: ExpressionAstNode | null;
  readonly bindingScope: BindingScope | null;
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly realization: RuntimeOperationRealization;
  readonly sourceEvaluationKind: RuntimeBindingSourceEvaluationKind;
  readonly sourceEvaluationReachability: RuntimeOperationReachability;
  readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind;
  readonly strictBinding: boolean | null;
  readonly expressionProductHandle: ProductHandle | null;
  readonly expressionChainIndex: number | null;
  readonly sourceKind: RuntimeBindingDataFlowSourceKind;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  /** Type of the authored source expression before a spread target selects one guarded member value. */
  readonly sourceExpressionType: CheckerTypeReference | null;
  readonly sourceType: CheckerTypeReference | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | null;
  readonly sourceAssignmentTargetType: CheckerTypeReference | null;
  readonly sourceAssignmentTargetSourceAddressHandle: AddressHandle | null;
  readonly targetPropertyType: CheckerTypeReference | null;
  readonly targetValueType: CheckerTypeReference | null;
  readonly targetToSourceValueType: CheckerTypeReference | null;
  readonly targetToSourceValueTypeOpenReason: string | null;
  readonly targetToSourceValueTypeOpenKind: CheckerExpressionTypeOpenKind | null;
  readonly valueConverterWritebackStages: readonly RuntimeBindingDataFlowValueConverterWritebackStage[];
  readonly sourceWritable: boolean | null;
  readonly sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | null;
  readonly sourceAssignmentReason: string | null;
  readonly sourceAssignmentReasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[];
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly sourceToTargetTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[];
  readonly targetToSourceTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[];
  readonly frameworkErrorCode: ObservationFrameworkErrorCode | null;
  readonly openReason: string | null;
};

interface BindingDataFlowOpenReason {
  readonly reasonKind: OpenSeamReasonKind;
  readonly summary: string;
}

function runtimeBindingDataFlowForDraft(
  store: KernelStore,
  local: string,
  binding: RuntimeDataFlowBinding,
  accessUseProductHandles: readonly ProductHandle[],
  target: DataFlowTarget,
  scope: BindingScope | null,
  draft: DataFlowDraft,
): RuntimeBindingDataFlow {
  return new RuntimeBindingDataFlow(
    store.handles.product(`${local}:binding-data-flow`), store.handles.identity(`${local}:binding-data-flow`),
    binding.toReference(),
    accessUseProductHandles,
    target.targetAccess?.toReference() ?? null, target.targetOperation?.toReference() ?? null,
    target.sourceOperation?.toReference() ?? null, target.valueChannel?.toReference() ?? null,
    draft.expressionProductHandle,
    draft.expressionChainIndex,
    draft.bindingScope?.toReference() ?? scope?.toReference() ?? null,
    draft.direction,
    draft.realization,
    draft.sourceEvaluationKind,
    draft.sourceEvaluationReachability,
    draft.targetMutationKind,
    draft.strictBinding,
    draft.sourceKind,
    draft.sourceName,
    draft.sourceRootName,
    draft.sourceType,
    draft.sourceTypeOpenReason,
    draft.sourceTypeOpenKind,
    draft.sourceAssignmentTargetType,
    draft.sourceAssignmentTargetSourceAddressHandle,
    draft.targetPropertyType,
    draft.targetValueType,
    draft.targetToSourceValueType,
    draft.targetToSourceValueTypeOpenReason,
    draft.targetToSourceValueTypeOpenKind,
    draft.valueConverterWritebackStages,
    draft.sourceWritable,
    draft.sourceAssignmentKind, draft.sourceAssignmentReason,
    draft.sourceAssignmentReasonKinds,
    draft.sourceToTargetAssignable, draft.targetToSourceAssignable,
    draft.sourceToTargetTypeMismatchKinds, draft.targetToSourceTypeMismatchKinds,
    draft.frameworkErrorCode,
    draft.openReason,
    binding.sourceAddressHandle,
  );
}

type DataFlowTargetTypes = {
  readonly spreadTargetProperty: string | null;
  readonly targetPropertyType: CheckerTypeReference | null;
  readonly targetValueType: CheckerTypeReference | null;
};

type DataFlowExpressionFacts = {
  readonly expressionProductHandle: ProductHandle | null;
  readonly expressionChainIndex: number | null;
  readonly ast: ExpressionAstNode | null;
  readonly expressionTypeLocal: string;
};

type DataFlowSourceProjection = {
  readonly sourceInfo: SourceExpressionInfo;
  readonly sourceScope: BindingScope | null;
  readonly realization: RuntimeOperationRealization;
  readonly sourceExpressionType: CheckerTypeReference | null;
  readonly sourceType: CheckerTypeReference | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | null;
  readonly sourceAssignmentValueType: CheckerTypeReference | null;
  readonly targetToSourceValueType: CheckerTypeReference | null;
  readonly targetToSourceValueTypeOpenReason: string | null;
  readonly targetToSourceValueTypeOpenKind: CheckerExpressionTypeOpenKind | null;
  readonly valueConverterWritebackStages: readonly RuntimeAssignmentValueConverterWritebackStage[];
};

/** Materializes binding data-flow edges after target observers and instruction scopes are both known. */
export class RuntimeBindingDataFlowMaterializer {
  constructor(
    /** Hot analysis store that receives binding data-flow products. */
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {}

  materialize(input: RuntimeBindingDataFlowMaterializationRequest): RuntimeBindingDataFlowEmission {
    const emission = this.recordsForDataFlows(input);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `binding-data-flow:${input.localKey}`),
      [
        ...publishProductDetails(ObservationProductDetails.RuntimeBindingDataFlow, emission.dataFlows),
        ...publishProductDetails(
          ObservationProductDetails.RuntimeBindingObservedDependency,
          emission.observedDependencies,
        ),
      ],
    ));
    return emission;
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
    const instructionScopes = instructionScopeLookup(input.scopes.instructionScopes);
    const bindingExpressionScopes = input.scopes.bindingExpressionScopes;
    return new BindingDataFlowMaterializationFrame(source, instructionScopes, {
      runtimeBindings: input.runtimeBindings,
      instructionScopes,
      bindingExpressionScopes,
      sourceExpressionContexts: new RuntimeBindingSourceExpressionContextProjector(
        input.runtimeBindings,
        instructionScopes,
        bindingExpressionScopes,
        input.expressionResourcePlan,
      ),
      draftMaterializer: new RuntimeBindingDataFlowDraftMaterializer(
        this.store,
        input.expressionWorld.projector,
      ),
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
    if (!runtimeBindingSourceLifecycleIncludesOperation(
      runtimeBindingSourceLifecycle(binding, input.expressionResourcePlan),
    )) {
      return;
    }
    const renderContext = input.runtimeBindings.requireRenderContextForBinding(binding.productHandle);
    const context: BindingDataFlowContext = {
      ...frame.context,
      evaluator: input.expressionWorld.evaluator(renderContext.resourceScope),
      resourceScope: renderContext.resourceScope,
    };
    const scope = frame.instructionScopes.scopeForBinding(input.runtimeBindings, binding);
    const targets = dataFlowTargetsForBinding(
      binding,
      input.controllerBind.readTargetAccessesForBinding(binding.productHandle),
      input.controllerBind.readTargetOperationsForBinding(binding.productHandle),
      input.controllerBind.readSourceOperationsForBinding(binding.productHandle),
      input.valueChannels.readValueChannelsForBinding(binding.productHandle),
    );
    for (const target of targets) {
      frame.record(this.recordsForDataFlow(
        input,
        frame.source,
        context,
        binding,
        index,
        target,
        scope,
      ));
    }
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
    const products = this.dataFlowForBinding(input, binding, target, scope, context, local);
    const dataFlow = products.dataFlow;
    const claim = this.claimForDataFlow(local, binding, dataFlow, source);
    const accessUseClaims = this.claimsForDataFlowAccessUses(local, dataFlow, source);
    const openSeams = this.openSeamEmissionForDataFlow(
      local,
      binding,
      target,
      products.localOpenReasons,
      source,
    );
    return {
      dataFlow,
      observedDependencies: products.observedDependencies,
      openSeams: openSeams.openSeams,
      records: [
        ...openSeams.records,
        ...this.dataFlowRecords(
          local,
          binding,
          target,
          dataFlow,
          claim,
          accessUseClaims,
          openSeams.openSeamHandles,
          source,
        ),
        ...this.observedDependencyRecords(local, binding, dataFlow, products.observedDependencies, source),
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

  private claimsForDataFlowAccessUses(
    local: string,
    dataFlow: RuntimeBindingDataFlow,
    source: BindingDataFlowSourceSet,
  ): readonly SemanticClaim[] {
    return dataFlow.accessUseProductHandles.map((accessUseProductHandle, index) =>
      new SemanticClaim(
        this.store.handles.claim(`${local}:data-flow-uses-access-use:${index}`),
        dataFlow.productHandle,
        KernelVocabulary.RuntimeExpression.DataFlowUsesAccessUse.key,
        accessUseProductHandle,
        source.provenanceHandle,
      )
    );
  }

  private openSeamEmissionForDataFlow(
    local: string,
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    localOpenReasons: readonly BindingDataFlowOpenReason[],
    source: BindingDataFlowSourceSet,
  ): BindingDataFlowOpenSeamEmission {
    const inheritedOpenSeamHandles = materializationOpenSeamHandlesForOwners(
      this.publication,
      [
        target.targetAccess?.identityHandle,
        target.targetOperation?.identityHandle,
        target.sourceOperation?.identityHandle,
        target.valueChannel?.identityHandle,
      ].filter((handle): handle is NonNullable<typeof handle> => handle != null),
    );
    if (localOpenReasons.length === 0) {
      return {
        openSeams: [],
        openSeamHandles: inheritedOpenSeamHandles,
        records: [],
      };
    }
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    const openSeam = this.recordOpenSeam(
      `${local}:open-data-flow`,
      localOpenReasons.map((reason) => reason.summary).join(' '),
      binding.sourceAddressHandle,
      source,
      records,
      openSeams,
      KernelVocabulary.Binding.OpenDataFlow.key,
      [...new Set(localOpenReasons.map((reason) => reason.reasonKind))].sort(),
    );
    return {
      openSeams,
      openSeamHandles: [...new Set([...inheritedOpenSeamHandles, openSeam.handle])].sort(),
      records,
    };
  }

  private dataFlowForBinding(
    input: RuntimeBindingDataFlowMaterializationRequest,
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    scope: BindingScope | null,
    context: BindingDataFlowContext,
    local: string,
  ): BindingDataFlowProductEmission {
    const strictBinding = input.runtimeBindings
      .requireRenderContextForBinding(binding.productHandle)
      .renderingController.strict;
    const draft = context.draftMaterializer.dataFlowDraftForBinding(
      binding,
      target,
      scope,
      context.evaluator,
      context.sourceExpressionContexts,
      strictBinding,
      input.expressionResourcePlan,
      input.valueConverters,
      context.resourceScope,
      local,
    );
    const dataFlow = runtimeBindingDataFlowForDraft(
      this.store,
      local,
      binding,
      accessUsesForDataFlowTarget(
        binding,
        target,
        input.expressionAccesses.readAccessUsesForBinding(binding.productHandle),
      )
        .map((accessUse) => accessUse.productHandle),
      target,
      scope,
      draft,
    );
    return {
      dataFlow,
      localOpenReasons: localOpenReasonsForDataFlow(draft, target, scope),
      observedDependencies: this.observedDependenciesForDataFlow(
        input,
        local,
        binding,
        target,
        dataFlow,
        scope,
        draft,
        context,
      ),
    };
  }

  private observedDependenciesForDataFlow(
    input: RuntimeBindingDataFlowMaterializationRequest,
    local: string,
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    dataFlow: RuntimeBindingDataFlow,
    scope: BindingScope | null,
    draft: DataFlowDraft,
    context: BindingDataFlowContext,
  ): readonly RuntimeBindingObservedDependency[] {
    if (
      draft.ast == null
      || draft.sourceEvaluationKind !== RuntimeBindingSourceEvaluationKind.ConnectableRead
      || draft.sourceEvaluationReachability !== RuntimeOperationReachability.Reached
    ) {
      return [];
    }
    return observationEffectsForDataFlowTarget(
      binding,
      target,
      input.expressionAccesses.readObservationEffectsForBinding(binding.productHandle),
    )
      .map((effect, index) => this.observedDependencyForDraft(
        `${local}:observed-dependency:${index}`,
        binding,
        dataFlow,
        effect.accessUse.expressionProductHandle,
        effect.scope,
        effect.dependency,
        effect.memberProjection,
      ));
  }

  private observedDependencyForDraft(
    dependencyLocal: string,
    binding: RuntimeDataFlowBinding,
    dataFlow: RuntimeBindingDataFlow,
    expressionProductHandle: ProductHandle | null,
    scope: BindingScope | null,
    dependency: RuntimeObservedDependencyAccessUseDraft,
    memberProjection: RuntimeObservedMemberSourceProjection | null,
  ): RuntimeBindingObservedDependency {
    return new RuntimeBindingObservedDependency(
      this.store.handles.product(dependencyLocal),
      this.store.handles.identity(dependencyLocal),
      binding.toReference(),
      dataFlow.productHandle,
      expressionProductHandle,
      scope?.toReference() ?? null,
      dataFlow.realization,
      runtimeObservedDependencyOccurrence({
        dependency,
        scope,
        projection: memberProjection,
      }),
    );
  }

  private dataFlowRecords(
    local: string,
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    dataFlow: RuntimeBindingDataFlow,
    claim: SemanticClaim,
    accessUseClaims: readonly SemanticClaim[],
    openSeamHandles: readonly OpenSeam['handle'][],
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
      ...accessUseClaims,
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:binding-data-flow`),
        dataFlow.identityHandle,
        [dataFlow.productHandle],
        [claim.handle, ...accessUseClaims.map((accessUseClaim) => accessUseClaim.handle)],
        openSeamHandles,
      ),
    ];
  }

  private observedDependencyRecords(
    local: string,
    binding: RuntimeDataFlowBinding,
    dataFlow: RuntimeBindingDataFlow,
    dependencies: readonly RuntimeBindingObservedDependency[],
    source: BindingDataFlowSourceSet,
  ): readonly KernelStoreRecord[] {
    return dependencies.flatMap((dependency, index) => {
      const dependencyLocal = `${local}:observed-dependency:${index}`;
      return runtimeObservedDependencyRecords({
        store: this.store,
        local: dependencyLocal,
        owner: {
          identityHandle: binding.identityHandle,
        },
        dependency,
        index,
        provenanceHandle: source.provenanceHandle,
        claims: [
          {
            localName: 'runtime-binding-uses-observed-dependency',
            subjectProductHandle: binding.productHandle,
            predicateKey: KernelVocabulary.Binding.RuntimeBindingUsesObservedDependency.key,
          },
          {
            localName: 'data-flow-uses-observed-dependency',
            subjectProductHandle: dataFlow.productHandle,
            predicateKey: KernelVocabulary.Binding.DataFlowUsesObservedDependency.key,
          },
        ],
      });
    });
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

function runtimeExpressionAccessUseParticipatesInDataFlow(
  accessUse: RuntimeExpressionAccessUse,
): boolean {
  switch (accessUse.operationKind) {
    case RuntimeExpressionOperationKind.BindingSource:
    case RuntimeExpressionOperationKind.InterpolationPart:
    case RuntimeExpressionOperationKind.SpreadMemberSource:
    case RuntimeExpressionOperationKind.ValueConverterArgument:
      return true;
    case RuntimeExpressionOperationKind.BindingBehaviorArgument:
    case RuntimeExpressionOperationKind.RepeatKey:
    case RuntimeExpressionOperationKind.RepeatContextual:
    case RuntimeExpressionOperationKind.WatcherExpression:
    case RuntimeExpressionOperationKind.WatcherGetter:
    case RuntimeExpressionOperationKind.EffectExpression:
    case RuntimeExpressionOperationKind.EffectGetter:
    case RuntimeExpressionOperationKind.EffectRunCallback:
    case RuntimeExpressionOperationKind.ComputedGetter:
    case RuntimeExpressionOperationKind.ComputedDependencyKey:
    case RuntimeExpressionOperationKind.ComputedDependencyFunction:
      return false;
  }
}

function accessUsesForDataFlowTarget(
  binding: RuntimeDataFlowBinding,
  target: DataFlowTarget,
  accessUses: readonly RuntimeExpressionAccessUse[],
): readonly RuntimeExpressionAccessUse[] {
  const participating = accessUses.filter(runtimeExpressionAccessUseParticipatesInDataFlow);
  if (!(binding instanceof SpreadValueBinding)) {
    return participating;
  }
  if (target.sourceOnly) {
    return participating.filter(
      (accessUse) => accessUse.operationKind !== RuntimeExpressionOperationKind.SpreadMemberSource,
    );
  }
  return participating.filter(
    (accessUse) =>
      accessUse.operationKind === RuntimeExpressionOperationKind.SpreadMemberSource
      && accessUse.operationIndex === target.spreadMemberOperationIndex,
  );
}

function observationEffectsForDataFlowTarget(
  binding: RuntimeDataFlowBinding,
  target: DataFlowTarget,
  effects: readonly RuntimeBindingObservationEffectDraft[],
): readonly RuntimeBindingObservationEffectDraft[] {
  if (!(binding instanceof SpreadValueBinding)) {
    return effects;
  }
  if (target.sourceOnly) {
    return effects.filter(
      (effect) => effect.accessUse.operationKind !== RuntimeExpressionOperationKind.SpreadMemberSource,
    );
  }
  return effects.filter(
    (effect) =>
      effect.accessUse.operationKind === RuntimeExpressionOperationKind.SpreadMemberSource
      && effect.accessUse.operationIndex === target.spreadMemberOperationIndex,
  );
}

class RuntimeBindingDataFlowDraftMaterializer {
  private readonly typeAccess: BindingDataFlowTypeAccess;
  private readonly sourceProjector: BindingDataFlowSourceProjector;
  private readonly assignability: BindingDataFlowAssignabilityEvaluator;

  constructor(
    private readonly store: KernelStore,
    private readonly typeProjector: CheckerTypeProjector,
  ) {
    this.typeAccess = new BindingDataFlowTypeAccess(store, typeProjector);
    this.sourceProjector = new BindingDataFlowSourceProjector(store, this.typeAccess);
    this.assignability = new BindingDataFlowAssignabilityEvaluator(this.typeAccess);
  }

  dataFlowDraftForBinding(
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector,
    strictBinding: boolean | null,
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    valueConverters: RuntimeValueConverterEmission,
    resourceScope: TemplateResourceScope | null,
    local: string,
  ): DataFlowDraft {
    const lifecycle = dataFlowLifecycleForBinding(binding, expressionResourcePlan, target.sourceOnly);
    const targetMutationKind = target.sourceOnly
      ? RuntimeBindingValueChannelTargetMutationKind.NoTargetWrite
      : target.valueChannel?.targetMutationKind ?? RuntimeBindingValueChannelTargetMutationKind.Open;
    const direction = dataFlowDirectionForTargetMutation(lifecycle.direction, targetMutationKind);
    const needsSourceWriteCapability = bindingDataFlowDirectionIncludesTargetToSource(direction);
    const sourceEvaluationConnectable = lifecycle.sourceEvaluationKind === RuntimeBindingSourceEvaluationKind.ConnectableRead;
    const expressionFacts = this.dataFlowExpressionFacts(binding, scope, local);
    const targetTypes = this.dataFlowTargetTypes(binding, target);
    const sourceProjection = this.sourceProjector.dataFlowSourceProjection(
      binding,
      target,
      scope,
      evaluator,
      sourceExpressionContexts,
      needsSourceWriteCapability,
      sourceEvaluationConnectable,
      expressionFacts,
      targetTypes,
    );
    const assignability = this.assignability.dataFlowAssignability(
      direction,
      sourceProjection.sourceType,
      targetTypes.targetValueType,
      sourceProjection.sourceAssignmentValueType,
      sourceProjection.targetToSourceValueType,
      target.valueChannel,
    );
    const sourceAssignment = sourceAssignmentForDataFlow({
      direction,
      sourceWriteCapability: sourceProjection.sourceInfo.sourceWriteCapability,
      targetToSourceAssignable: assignability.targetToSourceAssignable,
      valueChannel: target.valueChannel,
      sourceAssignmentValueType: sourceProjection.sourceAssignmentValueType,
      targetToSourceValueType: sourceProjection.targetToSourceValueType,
    });
    const openReason = openReasonForDataFlow({
      direction,
      sourceOnly: target.sourceOnly,
      targetAccess: target.targetAccess,
      targetOperation: target.targetOperation,
      sourceOperation: target.sourceOperation,
      valueChannel: target.valueChannel,
      scope,
      ast: expressionFacts.ast,
      sourceOpenReason: sourceProjection.targetToSourceValueTypeOpenReason,
      sourceAssignmentKind: sourceAssignment.kind,
    });
    const frameworkErrorCode = this.frameworkErrorCodeForDataFlow(
      direction,
      target.targetAccess,
      target.valueChannel,
      sourceProjection.sourceType,
    );

    return {
      ast: expressionFacts.ast,
      bindingScope: sourceProjection.sourceScope,
      expressionProductHandle: expressionFacts.expressionProductHandle,
      expressionChainIndex: expressionFacts.expressionChainIndex,
      direction,
      realization: sourceProjection.realization,
      sourceEvaluationKind: lifecycle.sourceEvaluationKind,
      sourceEvaluationReachability: lifecycle.sourceEvaluationReachability,
      targetMutationKind,
      strictBinding,
      sourceKind: sourceProjection.sourceInfo.sourceKind,
      sourceName: sourceProjection.sourceInfo.sourceName,
      sourceRootName: sourceProjection.sourceInfo.sourceRootName,
      sourceExpressionType: sourceProjection.sourceExpressionType,
      sourceType: sourceProjection.sourceType,
      sourceTypeOpenReason: sourceProjection.sourceTypeOpenReason,
      sourceTypeOpenKind: sourceProjection.sourceTypeOpenKind,
      sourceAssignmentTargetType: needsSourceWriteCapability
        ? sourceProjection.sourceAssignmentValueType
          ?? sourceProjection.sourceInfo.sourceWriteCapability?.assignmentTargetType
          ?? sourceProjection.sourceType
        : null,
      sourceAssignmentTargetSourceAddressHandle: needsSourceWriteCapability
        ? sourceProjection.sourceInfo.sourceWriteCapability?.assignmentTargetSourceAddressHandle ?? null
        : null,
      targetPropertyType: targetTypes.targetPropertyType,
      targetValueType: targetTypes.targetValueType,
      targetToSourceValueType: sourceProjection.targetToSourceValueType,
      targetToSourceValueTypeOpenReason: sourceProjection.targetToSourceValueTypeOpenReason,
      targetToSourceValueTypeOpenKind: sourceProjection.targetToSourceValueTypeOpenKind,
      valueConverterWritebackStages: this.valueConverterWritebackStages(
        binding,
        expressionFacts.expressionProductHandle,
        sourceProjection.valueConverterWritebackStages,
        expressionResourcePlan,
        valueConverters,
      ),
      sourceWritable: needsSourceWriteCapability
        ? sourceProjection.sourceInfo.sourceWriteCapability?.checkerWritable ?? null
        : null,
      sourceAssignmentKind: sourceAssignment.kind,
      sourceAssignmentReason: sourceAssignment.reason,
      sourceAssignmentReasonKinds: sourceAssignment.reasonKinds,
      sourceToTargetAssignable: assignability.sourceToTargetAssignable,
      targetToSourceAssignable: assignability.targetToSourceAssignable,
      sourceToTargetTypeMismatchKinds: assignability.sourceToTargetTypeMismatchKinds,
      targetToSourceTypeMismatchKinds: assignability.targetToSourceTypeMismatchKinds,
      frameworkErrorCode,
      openReason,
    };
  }

  private valueConverterWritebackStages(
    binding: RuntimeDataFlowBinding,
    expressionProductHandle: ProductHandle | null,
    stages: readonly RuntimeAssignmentValueConverterWritebackStage[],
    expressionResourcePlan: RuntimeExpressionResourcePlan,
    valueConverters: RuntimeValueConverterEmission,
  ): readonly RuntimeBindingDataFlowValueConverterWritebackStage[] {
    return stages.map((stage) => {
      const entry = expressionResourcePlan.converterEntries.find((candidate) =>
        candidate.binding.productHandle === binding.productHandle
        && candidate.expressionProductHandle === expressionProductHandle
        && expressionSourceSpansEqual(candidate.expression.name.span, stage.converter.name.span)
      ) ?? null;
      const application = entry == null
        ? null
        : valueConverters.readApplicationsForPlanEntry(entry).find((candidate) =>
            candidate.phase === RuntimeValueConverterApplicationPhase.FromView
          ) ?? null;
      if (application == null) {
        throw new Error(
          `Value-converter writeback stage '${stage.converter.name.name}' at converter stage ${stage.stageIndex} `
          + `has no matching from-view application for binding '${binding.productHandle}'.`,
        );
      }
      return new RuntimeBindingDataFlowValueConverterWritebackStage(
        stage.converter.name.name,
        stage.stageIndex,
        application.toReference(),
        application.origin,
        application.runtimeChainDepth,
        application.phaseOrder,
        application.phaseReachability,
        stage.state,
        stage.inputType,
        stage.outputType,
        stage.openReason,
        stage.openKind,
        application.sourceAddressHandle,
      );
    });
  }

  private frameworkErrorCodeForDataFlow(
    direction: RuntimeBindingDataFlowDirection,
    targetAccess: RuntimeBindingTargetAccess | null,
    valueChannel: RuntimeBindingValueChannel | null,
    sourceType: CheckerTypeReference | null,
  ): ObservationFrameworkErrorCode | null {
    if (!bindingDataFlowDirectionIncludesSourceToTarget(direction)) {
      return null;
    }
    if (targetAccess?.strategy === RuntimeBindingTargetAccessStrategy.CollectionSizeObserver) {
      return RuntimeObservationFrameworkErrorCode.AssignReadonlySize;
    }
    if (
      targetAccess?.strategy === RuntimeBindingTargetAccessStrategy.ComputedObserver
      && targetAccess.isWritable === false
    ) {
      return RuntimeObservationFrameworkErrorCode.AssignReadonlyComputedProperty;
    }
    return valueChannel?.channelKind === RuntimeBindingValueChannelKind.SelectSingleOptionValue
      && this.typeAccess.isRuntimeArrayInstanceType(sourceType)
      ? RuntimeHtmlObservationFrameworkErrorCode.SelectObserverArrayOnNonMultiSelect
      : null;
  }

  private dataFlowExpressionFacts(
    binding: RuntimeDataFlowBinding,
    scope: BindingScope | null,
    local: string,
  ): DataFlowExpressionFacts {
    const expressionProductHandle = expressionProductHandleForBinding(binding);
    const ast = runtimeBindingSourceExpression(this.typeProjector.publication, binding);
    return {
      expressionProductHandle,
      expressionChainIndex: runtimeBindingSourceExpressionChainIndex(binding),
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
}

class BindingDataFlowSourceProjector {
  private readonly sourceInfo: BindingDataFlowSourceInfoProjector;

  constructor(
    private readonly store: KernelStore,
    private readonly typeAccess: BindingDataFlowTypeAccess,
  ) {
    this.sourceInfo = new BindingDataFlowSourceInfoProjector(
      new BindingDataFlowSourceWriteCapabilityProjector(store, typeAccess.publication, typeAccess),
    );
  }

  dataFlowSourceProjection(
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector,
    needsSourceWriteCapability: boolean,
    sourceEvaluationConnectable: boolean,
    expressionFacts: DataFlowExpressionFacts,
    targetTypes: DataFlowTargetTypes,
  ): DataFlowSourceProjection {
    const assignmentTarget = expressionFacts.ast == null
      ? null
      : runtimeAssignmentTargetAstForExpression(expressionFacts.ast);
    const sourceScope = scope != null
      && needsSourceWriteCapability
      && assignmentTarget?.$kind === 'AccessScope'
      ? runtimeAssignmentInputScopeForAccessScope(assignmentTarget, binding.instructionProductHandle, scope)
      : scope;
    const expressionSite = sourceScope == null || expressionFacts.ast == null
      ? null
      : sourceExpressionContexts.projectSource({
          binding,
          expressionProductHandle: expressionFacts.expressionProductHandle,
          expressionChainIndex: expressionFacts.expressionChainIndex,
          expression: expressionFacts.ast,
          localKey: `${expressionFacts.expressionTypeLocal}:source`,
          sourceScope,
        });
    const sourceInfo = this.dataFlowSourceInfo(
      binding,
      expressionSite,
      evaluator,
      needsSourceWriteCapability,
      expressionFacts,
      binding instanceof SpreadValueBinding ? null : targetTypes.targetValueType,
    );
    const sourceEvaluation = expressionSite == null
      || expressionSite.kind === RuntimeBindingSourceExpressionProjectionKind.Open
      ? null
      : evaluator.evaluate(checkerContextForRuntimeBindingSourceExpressionProjection(
        expressionSite,
        sourceEvaluationConnectable,
        binding instanceof SpreadValueBinding ? null : targetTypes.targetValueType,
      ));
    const evaluatedSourceType = sourceInfo.sourceTypeHint
      ?? (sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? sourceEvaluation.typeReference
        : null);
    const realization = target.valueChannel?.realization ?? RuntimeOperationRealization.Direct;
    const sourceType = targetTypes.spreadTargetProperty == null
      ? evaluatedSourceType
      : target.valueChannel?.admittedSourceValueType ?? null;
    const sourceTypeOpenReason = sourceInfo.sourceTypeHint != null
      ? null
      : sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Open
        ? sourceEvaluation.summary
        : null;
    const sourceTypeOpenKind = sourceInfo.sourceTypeHint != null
      ? null
      : sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Open
        ? sourceEvaluation.openKind
        : null;
    const sourceAssignmentValueType = needsSourceWriteCapability
      ? sourceInfo.sourceAssignmentValueTypeHint !== undefined
        ? sourceInfo.sourceAssignmentValueTypeHint
        : sourceType
      : null;
    const targetToSourceValueType = needsSourceWriteCapability
      ? sourceInfo.targetToSourceValueTypeHint !== undefined
        ? sourceInfo.targetToSourceValueTypeHint
        : targetTypes.targetValueType
      : null;
    return {
      sourceInfo: targetTypes.spreadTargetProperty == null
        ? sourceInfo
        : spreadSourceInfo(sourceInfo, targetTypes.spreadTargetProperty),
      sourceScope: expressionSite?.kind === RuntimeBindingSourceExpressionProjectionKind.Context
        ? expressionSite.scope
        : null,
      realization,
      sourceExpressionType: evaluatedSourceType,
      sourceType,
      sourceTypeOpenReason,
      sourceTypeOpenKind,
      sourceAssignmentValueType,
      targetToSourceValueType,
      targetToSourceValueTypeOpenReason: sourceInfo.targetToSourceValueTypeOpenReason ?? null,
      targetToSourceValueTypeOpenKind: sourceInfo.targetToSourceValueTypeOpenKind ?? null,
      valueConverterWritebackStages: sourceInfo.valueConverterWritebackStages,
    };
  }

  private dataFlowSourceInfo(
    binding: RuntimeDataFlowBinding,
    expressionSite: RuntimeBindingSourceExpressionProjection | null,
    evaluator: CheckerExpressionTypeEvaluator,
    needsSourceWriteCapability: boolean,
    expressionFacts: DataFlowExpressionFacts,
    targetValueType: CheckerTypeReference | null,
  ): SourceExpressionInfo {
    if (expressionFacts.ast == null
      || expressionSite == null
      || expressionSite.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
      return this.sourceInfo.open(needsSourceWriteCapability);
    }
    return this.sourceInfo.forExpression(
      expressionSite,
      evaluator,
      needsSourceWriteCapability,
      targetValueType,
    );
  }
}

class BindingDataFlowTypeAccess implements BindingDataFlowAssignabilityTypeAccess {
  private readonly shapeAccess: CheckerTypeShapeAccess;
  readonly publication: KernelPublicationContext;

  constructor(
    readonly store: KernelStore,
    typeProjector: CheckerTypeProjector,
  ) {
    this.shapeAccess = new CheckerTypeShapeAccess(store, typeProjector);
    this.publication = typeProjector.publication;
  }

  readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return reference == null ? null : this.shapeAccess.resolveReference(reference);
  }

  isRuntimeArrayInstanceType(reference: CheckerTypeReference | null): boolean {
    const carrier = this.readTypeShape(reference)?.carrier ?? null;
    return carrier == null
      ? false
      : isRuntimeArrayInstanceType(carrier.checker, carrier.type);
  }

  isRepeatSourceRuntimeAccepted(reference: CheckerTypeReference | null): boolean | null {
    const carrier = this.readTypeShape(reference)?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    const repeatable = checkerRepeatableElementTypeInfo(carrier.checker, carrier.type);
    if (repeatable.unsupportedConstituents > 0) {
      return false;
    }
    if (repeatable.openConstituents > 0) {
      return null;
    }
    return true;
  }

  isCallableBooleanFunction(reference: CheckerTypeReference | null, runtimeArgumentCount: number = 0): boolean | null {
    return checkerCallableReferenceReturnAssignableToPrimitiveType(
      this.publication,
      reference,
      'boolean',
      runtimeArgumentCount,
    );
  }

  memberWriteAccess(
    ownerType: CheckerTypeShape,
    memberName: string,
  ) {
    return this.shapeAccess.memberWriteAccess(ownerType, memberName);
  }

  keyedWriteAccess(
    ownerType: CheckerTypeShape,
    keyType: CheckerTypeShape,
  ) {
    return this.shapeAccess.keyedWriteAccess(ownerType, keyType);
  }
}

function directionForBindingMode(bindingMode: TemplateBindingMode): RuntimeBindingDataFlowDirection {
  const sourceToTarget = templateBindingModeIncludesSourceToTarget(bindingMode);
  const targetToSource = templateBindingModeIncludesTargetToSource(bindingMode);
  if (sourceToTarget && targetToSource) {
    return RuntimeBindingDataFlowDirection.TwoWay;
  }
  if (sourceToTarget) {
    return RuntimeBindingDataFlowDirection.SourceToTarget;
  }
  if (targetToSource) {
    return RuntimeBindingDataFlowDirection.TargetToSource;
  }
  return RuntimeBindingDataFlowDirection.Open;
}

function dataFlowDirectionForTargetMutation(
  direction: RuntimeBindingDataFlowDirection,
  targetMutationKind: RuntimeBindingValueChannelTargetMutationKind,
): RuntimeBindingDataFlowDirection {
  if (targetMutationKind !== RuntimeBindingValueChannelTargetMutationKind.SuppressesTargetWrite
    && targetMutationKind !== RuntimeBindingValueChannelTargetMutationKind.NoTargetWrite) {
    return direction;
  }
  switch (direction) {
    case RuntimeBindingDataFlowDirection.SourceToTarget:
      return RuntimeBindingDataFlowDirection.SourceRead;
    case RuntimeBindingDataFlowDirection.TwoWay:
      return RuntimeBindingDataFlowDirection.TargetToSource;
    default:
      return direction;
  }
}

type RuntimeBindingDataFlowLifecycle = {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly sourceEvaluationKind: RuntimeBindingSourceEvaluationKind;
  readonly sourceEvaluationReachability: RuntimeOperationReachability;
};

function dataFlowLifecycleForBinding(
  binding: RuntimeDataFlowBinding,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
  sourceOnly: boolean,
): RuntimeBindingDataFlowLifecycle {
  const lifecycle = runtimeBindingSourceLifecycle(binding, expressionResourcePlan);
  if (binding instanceof PropertyBinding) {
    const bindingMode = expressionResourcePlan.effectivePropertyBindingMode(binding);
    return {
      direction: sourceOnly
        ? RuntimeBindingDataFlowDirection.SourceRead
        : directionForBindingMode(bindingMode),
      sourceEvaluationKind: lifecycle.evaluationKind,
      sourceEvaluationReachability: lifecycle.evaluationReachability,
    };
  }
  if (binding instanceof RefBinding) {
    return {
      direction: RuntimeBindingDataFlowDirection.TargetToSource,
      sourceEvaluationKind: lifecycle.evaluationKind,
      sourceEvaluationReachability: lifecycle.evaluationReachability,
    };
  }
  return {
    direction: sourceOnly
      ? RuntimeBindingDataFlowDirection.SourceRead
      : RuntimeBindingDataFlowDirection.SourceToTarget,
    sourceEvaluationKind: lifecycle.evaluationKind,
    sourceEvaluationReachability: lifecycle.evaluationReachability,
  };
}

function dataFlowTargetsForBinding(
  binding: RuntimeDataFlowBinding,
  targetAccesses: readonly RuntimeBindingTargetAccess[],
  targetOperations: readonly RuntimeBindingTargetOperation[],
  sourceOperations: readonly RuntimeBindingSourceOperation[],
  valueChannels: readonly RuntimeBindingValueChannel[],
): readonly DataFlowTarget[] {
  if (binding instanceof SpreadValueBinding) {
    const sourceRead: DataFlowTarget = {
      localSuffix: ':source-read',
      sourceOnly: true,
      spreadMemberOperationIndex: null,
      targetAccess: null,
      targetOperation: null,
      sourceOperation: null,
      valueChannel: null,
    };
    return [sourceRead, ...valueChannels.map((valueChannel) => {
      const targetIndex = targetAccesses.findIndex((candidate) =>
        candidate.productHandle === valueChannel.targetAccess?.productHandle
      );
      const targetAccess = targetAccesses[targetIndex] ?? null;
      if (targetAccess == null || targetIndex < 0) {
        throw new Error(`Spread value channel '${valueChannel.productHandle}' did not retain its target access.`);
      }
      return {
        localSuffix: `:spread-target:${targetIndex}:${targetAccess.targetProperty}`,
        sourceOnly: false,
        spreadMemberOperationIndex: targetIndex,
        targetAccess,
        targetOperation: null,
        sourceOperation: null,
        valueChannel,
      };
    })];
  }
  return [{
    localSuffix: '',
    sourceOnly: isRuntimeSourceOnlyDataFlowBinding(binding),
    spreadMemberOperationIndex: null,
    targetAccess: targetAccesses[0] ?? null,
    targetOperation: targetOperations[0] ?? null,
    sourceOperation: sourceOperations[0] ?? null,
    valueChannel: valueChannels[0] ?? null,
  }];
}

function openReasonForDataFlow(input: {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly sourceOnly: boolean;
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
  if (!input.sourceOnly && input.targetAccess == null && input.targetOperation == null && input.sourceOperation == null) {
    reasons.push('Runtime binding did not carry a target accessor/observer, direct target-operation, or source-operation product.');
  } else if (input.targetAccess?.openReason != null) {
    reasons.push(input.targetAccess.openReason);
  } else if (input.targetOperation?.openReason != null) {
    reasons.push(input.targetOperation.openReason);
  } else if (input.sourceOperation?.openReason != null) {
    reasons.push(input.sourceOperation.openReason);
  }
  if (!input.sourceOnly && input.valueChannel == null) {
    reasons.push('Runtime binding did not carry a value-channel product.');
  } else if (input.valueChannel?.openReason != null) {
    reasons.push(input.valueChannel.openReason);
  }
  if (input.scope == null) {
    reasons.push('Runtime instruction scope was not available for binding expression lookup.');
  }
  if (input.ast == null) {
    reasons.push('Runtime binding source did not expose an evaluable expression AST for binding data flow.');
  }
  if (input.sourceOpenReason != null) {
    reasons.push(input.sourceOpenReason);
  }
  if (bindingDataFlowDirectionIncludesTargetToSource(input.direction) && !bindingValueChannelMutatesCollection(input.valueChannel)) {
    if (input.sourceAssignmentKind === RuntimeBindingDataFlowSourceAssignmentKind.Open) {
      reasons.push('Target-to-source data flow could not prove runtime source assignment.');
    }
  }
  const distinctReasons = [...new Set(reasons)];
  return distinctReasons.length === 0 ? null : distinctReasons.join(' ');
}

function localOpenReasonsForDataFlow(
  draft: DataFlowDraft,
  target: DataFlowTarget,
  scope: BindingScope | null,
): readonly BindingDataFlowOpenReason[] {
  const reasons: BindingDataFlowOpenReason[] = [];
  const add = (reasonKind: OpenSeamReasonKind, summary: string): void => {
    if (!reasons.some((reason) => reason.reasonKind === reasonKind && reason.summary === summary)) {
      reasons.push({ reasonKind, summary });
    }
  };
  if (draft.direction === RuntimeBindingDataFlowDirection.Open) {
    add(
      OpenSeamReasonKind.BindingModeOpen,
      'Binding mode did not close to source-to-target, target-to-source, or two-way data flow.',
    );
  }
  if (!target.sourceOnly
    && target.targetAccess == null
    && target.targetOperation == null
    && target.sourceOperation == null) {
    add(
      OpenSeamReasonKind.BindingTargetProductMissing,
      'Runtime binding did not carry a target accessor, direct target operation, or source operation.',
    );
  }
  if (!target.sourceOnly && target.valueChannel == null) {
    add(
      OpenSeamReasonKind.BindingValueChannelProductMissing,
      'Runtime binding did not carry a value-channel product.',
    );
  }
  if (scope == null) {
    add(
      OpenSeamReasonKind.BindingScopeOpen,
      'Runtime instruction scope was not available for binding expression lookup.',
    );
  }
  if (draft.ast == null) {
    add(
      OpenSeamReasonKind.BindingExpressionOpen,
      'Runtime binding source did not expose an evaluable expression AST for binding data flow.',
    );
  }
  for (const reasonKind of openSeamReasonKindsForExpressionOpen(
    draft.sourceTypeOpenKind,
    draft.sourceTypeOpenReason,
  )) {
    add(reasonKind, draft.sourceTypeOpenReason!);
  }
  for (const reasonKind of openSeamReasonKindsForExpressionOpen(
    draft.targetToSourceValueTypeOpenKind,
    draft.targetToSourceValueTypeOpenReason,
  )) {
    add(reasonKind, draft.targetToSourceValueTypeOpenReason!);
  }
  if (
    bindingDataFlowDirectionIncludesTargetToSource(draft.direction)
    && !bindingValueChannelMutatesCollection(target.valueChannel)
    && draft.sourceAssignmentKind === RuntimeBindingDataFlowSourceAssignmentKind.Open
  ) {
    add(
      OpenSeamReasonKind.BindingSourceAssignmentOpen,
      'Target-to-source data flow could not prove runtime source assignment.',
    );
  }
  return reasons;
}

function openSeamReasonKindsForExpressionOpen(
  openKind: CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}` | null,
  openReason: string | null,
): readonly OpenSeamReasonKind[] {
  if (openReason == null) {
    return [];
  }
  switch (openKind) {
    case CheckerExpressionTypeOpenKind.MissingBindingScope:
    case CheckerExpressionTypeOpenKind.MissingAncestor:
    case CheckerExpressionTypeOpenKind.MissingContext:
    case CheckerExpressionTypeOpenKind.MissingContextType:
    case CheckerExpressionTypeOpenKind.HostContextNotFound:
    case CheckerExpressionTypeOpenKind.MissingSlotType:
      return [OpenSeamReasonKind.BindingSourceSlotNoStaticValue];
    case CheckerExpressionTypeOpenKind.MissingMember:
    case CheckerExpressionTypeOpenKind.MissingMemberValueType:
      return [OpenSeamReasonKind.BindingSourceMemberNoStaticValue];
    case CheckerExpressionTypeOpenKind.UnsupportedGlobalAccess:
    case CheckerExpressionTypeOpenKind.UnsupportedKeyedAccess:
    case CheckerExpressionTypeOpenKind.UnsupportedCallTarget:
    case CheckerExpressionTypeOpenKind.UnsupportedConstruct:
    case CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation:
    case CheckerExpressionTypeOpenKind.UnsupportedBindingPattern:
    case CheckerExpressionTypeOpenKind.UnsupportedExpression:
      return [OpenSeamReasonKind.BindingSourceUnsupportedExpression];
    case CheckerExpressionTypeOpenKind.MissingValueConverterResource:
    case CheckerExpressionTypeOpenKind.MissingBindingBehaviorResource:
    case CheckerExpressionTypeOpenKind.MissingStateStore:
    case CheckerExpressionTypeOpenKind.DuplicateBindingBehavior:
    case CheckerExpressionTypeOpenKind.OpenValueConverter:
      return [OpenSeamReasonKind.BindingSourceResourceOpen];
    case CheckerExpressionTypeOpenKind.MissingTypeDetail:
    case CheckerExpressionTypeOpenKind.MissingIterableElementType:
    case CheckerExpressionTypeOpenKind.MissingChecker:
    case CheckerExpressionTypeOpenKind.NullishMemberAccess:
    case CheckerExpressionTypeOpenKind.NullishKeyedAccess:
    case CheckerExpressionTypeOpenKind.NullishCallTarget:
    case null:
      return [OpenSeamReasonKind.BindingSourceTypeOpen];
    default:
      return [OpenSeamReasonKind.BindingSourceTypeOpen];
  }
}
