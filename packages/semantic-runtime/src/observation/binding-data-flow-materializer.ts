import {
  checkerTypeMayBeRuntimeArrayInstance,
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
} from '../kernel/materialization.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import {
  FieldProvenance,
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
  localKeyPart,
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
  CheckerExpressionTypeBindingBehaviorEvaluation,
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
  IteratorBindingInstruction,
  MultiAttrInstruction,
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import {
  bindingExpressionAstForProduct,
  readTemplateExpressionParse,
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
  RuntimeBindingRealization,
  RuntimeBindingDataFlowValueConverterWritebackStage,
  type RuntimeBindingDataFlowField,
  RuntimeBindingDataFlowDirection,
  RuntimeBindingSourceEvaluationKind,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
  RuntimeBindingDataFlowSourceKind,
  RuntimeBindingDataFlowTypeMismatchKind,
  RuntimeBindingObservedDependency,
  RuntimeObservedDependencyKind,
  RuntimeObservedMemberSourceRoute,
  type RuntimeBindingValueChannel,
  RuntimeBindingValueChannelKind,
  RuntimeBindingValueChannelTargetMutationKind,
} from './runtime-binding-observation.js';
import {
  collectRuntimeConnectableObservedDependencyDrafts,
  type RuntimeTemplateArrayMethodPolicy,
} from './connectable-observed-dependency.js';
import {
  collectRuntimeTrackableMethodObservedDependencyDrafts,
} from './trackable-method-observed-dependency.js';
import {
  RuntimeBindingExpressionScopeProjector,
} from './runtime-binding-expression-scope.js';
import {
  checkerContextForRuntimeBindingSourceExpressionProjection,
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
  type RuntimeBindingSourceExpressionContextProjection,
  type RuntimeBindingSourceExpressionProjection,
} from './runtime-binding-source-expression-context.js';
import {
  distinctRuntimeObservedDependencyDrafts,
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';
import {
  observedMemberSourceForBindingDependency,
  observedMemberSourceStateForBindingDependency,
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
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { RuntimeExpressionResourcePlan } from '../template/runtime-expression-resource-plan.js';
import { RuntimeExpressionResourcePhaseReachability } from '../template/runtime-expression-resource.js';
import {
  RuntimeValueConverterApplicationPhase,
} from '../template/runtime-value-converter.js';
import type { RuntimeValueConverterEmission } from '../template/runtime-value-converter-materializer.js';
import type { RuntimeBindingValueChannelEmission } from './binding-value-channel-materializer.js';
import {
  sourceAddressForRuntimeExpressionBounds,
} from '../template/runtime-expression-source-address.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import {
  expressionProductHandleForBinding,
  instructionScopeLookup,
  isRuntimeDataFlowBinding,
  isRuntimeSourceOnlyDataFlowBinding,
  runtimeBindingSourceExpression,
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
}

interface BindingDataFlowOpenSeamEmission {
  readonly openSeams: readonly OpenSeam[];
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
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
  readonly sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector;
  readonly draftMaterializer: RuntimeBindingDataFlowDraftMaterializer;
};

type BindingDataFlowContext = BindingDataFlowSharedContext & {
  readonly evaluator: CheckerExpressionTypeEvaluator;
  readonly resourceScope: TemplateResourceScope;
};

type ObservedDependencyInput = {
  readonly expression: ExpressionAstNode;
  readonly scope: null;
  readonly checkerContext: null;
  readonly dependencies: readonly RuntimeObservedDependencyDraft[];
} | {
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope;
  readonly checkerContext: CheckerExpressionTypeEvaluationContext;
  readonly dependencies: readonly RuntimeObservedDependencyDraft[];
};

type ObservedExpressionSite = {
  readonly expressionProductHandle: ProductHandle | null;
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope | null;
  readonly sourceAddressHandle: AddressHandle | null;
  /** Null means the ordinary runtime-binding source lifecycle owns this expression. */
  readonly bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation | null;
};

type ObservedExpressionDependencyInput = {
  readonly site: ObservedExpressionSite;
  readonly input: ObservedDependencyInput;
};

type DataFlowTarget = {
  readonly localSuffix: string;
  readonly sourceOnly: boolean;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
};

type DataFlowDraft = {
  readonly ast: ExpressionAstNode | null;
  readonly bindingScope: BindingScope | null;
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly realization: RuntimeBindingRealization;
  readonly sourceEvaluationKind: RuntimeBindingSourceEvaluationKind;
  readonly sourceEvaluationReachability: RuntimeExpressionResourcePhaseReachability;
  readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind;
  readonly strictBinding: boolean | null;
  readonly expressionProductHandle: ProductHandle | null;
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
  readonly sourceScope: BindingScope | null;
  readonly realization: RuntimeBindingRealization;
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
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(
      this.store,
      input.expressionWorld,
      input.expressionResourcePlan,
    );
    return new BindingDataFlowMaterializationFrame(source, instructionScopes, {
      runtimeBindings: input.runtimeBindings,
      instructionScopes,
      bindingExpressionScopes,
      sourceExpressionContexts: new RuntimeBindingSourceExpressionContextProjector(
        input.runtimeBindings,
        instructionScopes,
        bindingExpressionScopes,
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
    const openSeams = this.openSeamEmissionForDataFlow(local, binding, target, dataFlow, source);
    return {
      dataFlow,
      observedDependencies: products.observedDependencies,
      openSeams: openSeams.openSeams,
      records: [
        ...openSeams.records,
        ...this.dataFlowRecords(local, binding, target, dataFlow, claim, openSeams.openSeams, source),
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
      openSeamReasonKindsForDataFlow(dataFlow, target),
    );
    return { openSeams, records };
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
      target,
      scope,
      draft,
      [],
    );
    return {
      dataFlow,
      observedDependencies: this.observedDependenciesForDataFlow(
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
      || draft.sourceEvaluationReachability !== RuntimeExpressionResourcePhaseReachability.Reached
    ) {
      return [];
    }
    if (binding instanceof SpreadValueBinding && !target.sourceOnly) {
      return this.observedSpreadMemberDependency(local, binding, target, dataFlow, scope, draft);
    }
    const observedDependencyInputs = this.observedExpressionSites(
      binding,
      scope,
      draft,
      context,
    ).flatMap((site, siteIndex) =>
      this.observedDependencyInputsForExpressionSite(
        binding,
        site,
        `${local}:observed-dependency:source-expression:${siteIndex}`,
        context,
      ).map((input): ObservedExpressionDependencyInput => ({ site, input }))
    );
    let dependencyIndex = 0;
    return observedDependencyInputs.flatMap(({ site, input }) =>
      input.dependencies.map((dependency) => {
        const index = dependencyIndex++;
        const dependencyLocal = `${local}:observed-dependency:${index}`;
        const observedMember = input.checkerContext == null
          ? null
          : observedMemberSourceForBindingDependency({
            dependency,
            checkerContext: input.checkerContext,
            evaluator: context.evaluator,
            localKey: local,
          });
        return this.observedDependencyForDraft(
          dependencyLocal,
          binding,
          dataFlow,
          site.expressionProductHandle,
          input.checkerContext?.scope ?? input.scope,
          site.sourceAddressHandle,
          dependency,
          observedMember,
        );
      })
    );
  }

  /**
   * Aurelia's outer SpreadValueBinding observes the authored object expression, then each admitted inner
   * PropertyBinding observes one generated AccessScope member. Project that generated read onto the honest outer
   * expression locus without inventing a member token that does not exist in source.
   */
  private observedSpreadMemberDependency(
    local: string,
    binding: SpreadValueBinding,
    target: DataFlowTarget,
    dataFlow: RuntimeBindingDataFlow,
    scope: BindingScope | null,
    draft: DataFlowDraft,
  ): readonly RuntimeBindingObservedDependency[] {
    const targetProperty = target.targetAccess?.targetProperty ?? null;
    if (targetProperty == null || draft.ast == null) {
      throw new Error(`Spread data-flow '${dataFlow.productHandle}' did not retain its admitted target member.`);
    }
    const memberSourceAddressHandle = target.valueChannel?.admittedSourceMemberSourceAddressHandle ?? null;
    const ownerSourceAddressHandle = draft.sourceExpressionType?.sourceAddressHandle ?? null;
    const observedMemberSourceAddressHandle = memberSourceAddressHandle ?? ownerSourceAddressHandle;
    const observedMemberSourceRoute = memberSourceAddressHandle != null
      ? RuntimeObservedMemberSourceRoute.MemberDeclaration
      : ownerSourceAddressHandle != null
        ? RuntimeObservedMemberSourceRoute.OwnerValue
        : null;
    const dependency: RuntimeObservedDependencyDraft = {
      dependencyKind: RuntimeObservedDependencyKind.TemplateExpressionRead,
      expressionKind: 'AccessMember',
      sourceName: dataFlow.sourceName,
      sourceRootName: dataFlow.sourceRootName,
      memberName: targetProperty,
      keyExpression: null,
      methodName: null,
      observedMemberKind: target.valueChannel?.admittedSourceMemberKind ?? null,
      observedMemberSourceAddressHandle,
      observedMemberSourceRoute,
      memberNameSpanStart: null,
      memberNameSpanEnd: null,
      scopeLookupAncestor: null,
      spanStart: draft.ast.span.start,
      spanEnd: draft.ast.span.end,
    };
    const parse = readTemplateExpressionParse(this.publication, draft.expressionProductHandle);
    const memberProjection: RuntimeObservedMemberSourceProjection = {
      observedMemberKind: target.valueChannel?.admittedSourceMemberKind ?? null,
      observedMemberSourceAddressHandle,
      observedMemberSourceRoute,
    };
    return [this.observedDependencyForDraft(
      `${local}:observed-dependency:0`,
      binding,
      dataFlow,
      draft.expressionProductHandle,
      draft.bindingScope ?? scope,
      parse?.sourceAddressHandle ?? binding.sourceAddressHandle,
      dependency,
      memberProjection,
    )];
  }

  private observedDependencyForDraft(
    dependencyLocal: string,
    binding: RuntimeDataFlowBinding,
    dataFlow: RuntimeBindingDataFlow,
    expressionProductHandle: ProductHandle | null,
    scope: BindingScope | null,
    sourceAddressHandle: AddressHandle | null,
    dependency: RuntimeObservedDependencyDraft,
    memberProjection: RuntimeObservedMemberSourceProjection | null,
  ): RuntimeBindingObservedDependency {
    const dependencySource = sourceAddressForRuntimeExpressionBounds(
      this.publication,
      dependencyLocal,
      sourceAddressHandle,
      dependency.spanStart,
      dependency.spanEnd,
    );
    return new RuntimeBindingObservedDependency(
      this.store.handles.product(dependencyLocal),
      this.store.handles.identity(dependencyLocal),
      binding.toReference(),
      dataFlow.productHandle,
      expressionProductHandle,
      scope?.toReference() ?? null,
      dataFlow.realization,
      dependency.dependencyKind,
      dependency.expressionKind,
      dependency.sourceName,
      dependency.sourceRootName,
      dependency.memberName,
      dependency.keyExpression,
      dependency.methodName,
      memberProjection?.observedMemberKind ?? null,
      memberProjection?.observedMemberSourceAddressHandle ?? null,
      observedMemberSourceStateForBindingDependency({
        dependency,
        scope,
        projection: memberProjection,
      }),
      memberProjection?.observedMemberSourceRoute ?? null,
      dependency.spanStart,
      dependency.spanEnd,
      dependency.memberNameSpanStart ?? null,
      dependency.memberNameSpanEnd ?? null,
      dependencySource.handle,
      [],
    );
  }

  private observedExpressionSites(
    binding: RuntimeDataFlowBinding,
    scope: BindingScope | null,
    draft: DataFlowDraft,
    context: BindingDataFlowContext,
  ): readonly ObservedExpressionSite[] {
    const primaryParse = readTemplateExpressionParse(this.publication, draft.expressionProductHandle);
    const sites: ObservedExpressionSite[] = [{
      expressionProductHandle: draft.expressionProductHandle,
      expression: draft.ast!,
      scope,
      sourceAddressHandle: primaryParse?.sourceAddressHandle ?? binding.sourceAddressHandle,
      bindingBehavior: null,
    }];
    const instruction = this.publication.readProductDetail(
      TemplateProductDetails.Instruction,
      binding.instructionProductHandle,
    );
    if (!(instruction instanceof IteratorBindingInstruction)) {
      return sites;
    }
    const controllerProductHandle = context.runtimeBindings
      .requireRenderContextForBinding(binding.productHandle)
      .sourceController.productHandle;
    for (const handle of instruction.tailInstructionProductHandles) {
      const tail = this.publication.readProductDetail(TemplateProductDetails.Instruction, handle);
      if (!(tail instanceof MultiAttrInstruction)
        || tail.command !== 'bind'
        || tail.expressionProductHandle == null) {
        continue;
      }
      const expression = bindingExpressionAstForProduct(this.publication, tail.expressionProductHandle);
      if (expression == null) {
        continue;
      }
      const parse = readTemplateExpressionParse(this.publication, tail.expressionProductHandle);
      sites.push({
        expressionProductHandle: tail.expressionProductHandle,
        expression,
        scope: context.instructionScopes.scopeForInstruction(tail.productHandle, controllerProductHandle),
        sourceAddressHandle: parse?.sourceAddressHandle ?? tail.sourceAddressHandle,
        // Repeat invokes astEvaluate directly for key/contextual expressions; it never astBinds these auxiliary ASTs.
        bindingBehavior: CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly,
      });
    }
    return sites;
  }

  private observedDependencyInputsForExpressionSite(
    binding: RuntimeDataFlowBinding,
    site: ObservedExpressionSite,
    local: string,
    context: BindingDataFlowContext,
  ): readonly ObservedDependencyInput[] {
    if (site.scope == null) {
      return [this.openObservedDependencyInput(site.expression)];
    }
    const request = {
      binding,
      expression: site.expression,
      localKey: local,
      sourceScope: site.scope,
    };
    const projections = site.bindingBehavior == null
      ? context.sourceExpressionContexts.projectSourceExpressions(request)
      : context.sourceExpressionContexts.projectSourceExpressionsWithBindingBehavior(request, site.bindingBehavior);
    return projections.map((projection): ObservedDependencyInput => {
      if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
        return this.openObservedDependencyInput(site.expression);
      }
      const checkerContext = checkerContextForRuntimeBindingSourceExpressionProjection(projection, true);
      const canUseRuntimeArrayMethod = this.templateArrayMethodPolicy(
        context.evaluator,
        checkerContext,
      );
      return {
        expression: projection.expression,
        scope: projection.scope,
        checkerContext,
        dependencies: distinctRuntimeObservedDependencyDrafts([
          ...collectRuntimeConnectableObservedDependencyDrafts(projection.expression, canUseRuntimeArrayMethod),
          ...collectRuntimeTrackableMethodObservedDependencyDrafts({
            checkerContext,
            store: this.store,
            publication: this.publication,
            evaluator: context.evaluator,
          }),
        ]),
      };
    });
  }

  private openObservedDependencyInput(
    expression: ExpressionAstNode,
  ): ObservedDependencyInput {
    return {
      expression,
      scope: null,
      checkerContext: null,
      dependencies: distinctRuntimeObservedDependencyDrafts(
        collectRuntimeConnectableObservedDependencyDrafts(expression, null),
      ),
    };
  }

  private templateArrayMethodPolicy(
    evaluator: CheckerExpressionTypeEvaluator,
    checkerContext: CheckerExpressionTypeEvaluationContext,
  ): RuntimeTemplateArrayMethodPolicy {
    return (expression, rootExpression) => {
      const ownerType = evaluator.evaluateMemberOwnerAtOffset(
        checkerContext.child(
          rootExpression,
          `observed-dependency:collection-owner:${expression.span.start}:${expression.name.span.start}:${localKeyPart(expression.name.name)}`,
        ),
        expression.name.span.start,
      );
      const typeReference = ownerType.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? ownerType.typeReference
        : ownerType.partialTypeReference;
      return this.mayBeRuntimeArrayInstance(typeReference);
    };
  }

  private mayBeRuntimeArrayInstance(
    reference: CheckerTypeReference | null,
  ): boolean {
    if (reference == null) {
      return true;
    }
    const carrier = readCheckerTypeShape(this.publication, reference)?.carrier ?? null;
    return carrier == null
      ? true
      : checkerTypeMayBeRuntimeArrayInstance(carrier.checker, carrier.type);
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
        publication: this.publication,
        local: dependencyLocal,
        owner: {
          identityHandle: binding.identityHandle,
          sourceAddressHandle: binding.sourceAddressHandle,
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
    valueConverters: RuntimeValueConverterEmission,
  ): readonly RuntimeBindingDataFlowValueConverterWritebackStage[] {
    const applications = valueConverters.readApplicationsForBinding(binding.productHandle).filter((application) =>
      application.phase === RuntimeValueConverterApplicationPhase.FromView
      && application.expressionProductHandle === expressionProductHandle
      && application.chainIndex === 0
    );
    return stages.map((stage) => {
      const application = applications.find((candidate) =>
        candidate.runtimeChainDepth === stage.stageIndex
        && candidate.converterName === stage.converter.name.name
      ) ?? null;
      if (application == null) {
        throw new Error(
          `Value-converter writeback stage '${stage.converter.name.name}' at runtime depth ${stage.stageIndex} `
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
    const realization = target.valueChannel?.realization ?? RuntimeBindingRealization.Direct;
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
  readonly sourceEvaluationReachability: RuntimeExpressionResourcePhaseReachability;
};

function dataFlowLifecycleForBinding(
  binding: RuntimeDataFlowBinding,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
  sourceOnly: boolean,
): RuntimeBindingDataFlowLifecycle {
  const sourceEvaluationReachability = expressionResourcePlan.readSourceEvaluationReachability(
    binding.productHandle,
  );
  if (sourceOnly) {
    return {
      direction: RuntimeBindingDataFlowDirection.SourceRead,
      sourceEvaluationKind: binding instanceof ListenerBinding || binding instanceof StateDispatchBinding
        ? RuntimeBindingSourceEvaluationKind.UntrackedRead
        : RuntimeBindingSourceEvaluationKind.ConnectableRead,
      sourceEvaluationReachability,
    };
  }
  if (binding instanceof PropertyBinding) {
    const bindingMode = expressionResourcePlan.effectivePropertyBindingMode(binding);
    return {
      direction: directionForBindingMode(bindingMode),
      sourceEvaluationKind: sourceEvaluationKindForBindingMode(bindingMode),
      sourceEvaluationReachability,
    };
  }
  if (binding instanceof RefBinding) {
    return {
      direction: RuntimeBindingDataFlowDirection.TargetToSource,
      sourceEvaluationKind: RuntimeBindingSourceEvaluationKind.AssignmentOnly,
      sourceEvaluationReachability,
    };
  }
  return {
    direction: RuntimeBindingDataFlowDirection.SourceToTarget,
    sourceEvaluationKind: RuntimeBindingSourceEvaluationKind.ConnectableRead,
    sourceEvaluationReachability,
  };
}

function sourceEvaluationKindForBindingMode(bindingMode: TemplateBindingMode): RuntimeBindingSourceEvaluationKind {
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

function openSeamReasonKindsForDataFlow(
  dataFlow: RuntimeBindingDataFlow,
  target: DataFlowTarget,
): readonly OpenSeamReasonKind[] {
  const reasons = [
    ...(target.valueChannel?.openReasonKinds ?? []),
    ...openSeamReasonKindsForExpressionOpen(dataFlow.sourceTypeOpenKind, dataFlow.sourceTypeOpenReason),
  ];
  if (reasons.length === 0 && dataFlow.openReason != null) {
    reasons.push(OpenSeamReasonKind.BindingSourceUnsupportedExpression);
  }
  return [...new Set(reasons)].sort((left, right) => left.localeCompare(right));
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
