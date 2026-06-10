import {
  checkerTypeMayBeRuntimeArrayInstance,
  isRuntimeArrayInstanceType,
} from '../type-system/checker-collection-types.js';
import type {
  ExpressionAstNode,
} from '../expression/ast.js';
import {
  BindingScope,
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
  localKeyPart,
} from '../kernel/local-key.js';
import {
  type CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from '../type-system/expression-type-evaluation.js';
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
  BuiltInTemplateControllerFlowKind,
  frameworkTemplateControllerSemanticsForName,
} from '../template/template-controller-semantics.js';
import { bindingExpressionAstForProduct } from '../template/expression-parse-product.js';
import { ObservationProductDetails } from './product-details.js';
import {
  PropertyBinding,
  RefBinding,
  RuntimeBindingTargetAccessStrategy,
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
  RuntimeBindingDataFlowTypeMismatchKind,
  RuntimeBindingObservedDependency,
  type RuntimeBindingValueChannel,
  RuntimeBindingValueChannelKind,
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
import type { RuntimeBindingValueChannelEmission } from './binding-value-channel-materializer.js';
import {
  sourceAddressForRuntimeExpressionBounds,
} from '../template/runtime-expression-source-address.js';
import { unwrapExpressionAstNodeParens } from '../expression/parse-result-inspection.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import {
  expressionProductHandleForBinding,
  instructionScopeLookup,
  isRuntimeDataFlowBinding,
  isRuntimeSourceOnlyDataFlowBinding,
  type RuntimeInstructionScopeLookup,
  type RuntimeDataFlowBinding,
} from './runtime-binding-expression.js';
import {
  effectivePropertyBindingMode,
  templateBindingModeIncludesSourceToTarget,
  templateBindingModeIncludesTargetToSource,
} from '../template/runtime-binding-mode-behavior.js';
import {
  BindingDataFlowSourceWriteCapabilityProjector,
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
  bindingDataFlowDirectionIncludesSourceEvaluation,
  bindingDataFlowDirectionIncludesSourceToTarget,
  bindingDataFlowDirectionIncludesTargetToSource,
} from './binding-data-flow-direction.js';

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
    readonly context: BindingDataFlowContext,
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

type BindingDataFlowContext = {
  readonly evaluator: CheckerExpressionTypeEvaluator;
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
  readonly sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector;
  readonly resourceScope: TemplateResourceScope | null;
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

type DataFlowTarget = {
  readonly localSuffix: string;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
};

type DataFlowDraft = {
  readonly ast: ExpressionAstNode | null;
  readonly bindingScope: BindingScope | null;
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly strictBinding: boolean | null;
  readonly expressionProductHandle: ProductHandle | null;
  readonly sourceKind: RuntimeBindingDataFlowSourceKind;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly sourceType: CheckerTypeReference | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | null;
  readonly sourceAssignmentTargetType: CheckerTypeReference | null;
  readonly sourceAssignmentTargetSourceAddressHandle: AddressHandle | null;
  readonly targetPropertyType: CheckerTypeReference | null;
  readonly targetValueType: CheckerTypeReference | null;
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
  readonly sourceType: CheckerTypeReference | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | null;
  readonly sourceAssignmentValueType: CheckerTypeReference | null;
  readonly targetToSourceValueType: CheckerTypeReference | null;
  readonly targetToSourceValueTypeOpenReason: string | null;
  readonly targetToSourceValueTypeOpenKind: CheckerExpressionTypeOpenKind | null;
};

/** Materializes binding data-flow edges after target observers and instruction scopes are both known. */
export class RuntimeBindingDataFlowMaterializer {
  private readonly typeProjector: CheckerTypeProjector;
  private readonly draftMaterializer: RuntimeBindingDataFlowDraftMaterializer;

  constructor(
    /** Hot analysis store that receives binding data-flow products. */
    readonly store: KernelStore,
  ) {
    this.typeProjector = new CheckerTypeProjector(store);
    this.draftMaterializer = new RuntimeBindingDataFlowDraftMaterializer(store, this.typeProjector);
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
    for (const dependency of emission.observedDependencies) {
      this.store.productDetails.add(
        ObservationProductDetails.RuntimeBindingObservedDependency,
        dependency.productHandle,
        dependency,
      );
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
    const instructionScopes = instructionScopeLookup(input.scopes.instructionScopes);
    const evaluator = input.expressionWorld.evaluator(input.resourceScope);
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(this.store, input.expressionWorld);
    return new BindingDataFlowMaterializationFrame(source, instructionScopes, {
      evaluator,
      bindingExpressionScopes,
      sourceExpressionContexts: new RuntimeBindingSourceExpressionContextProjector(
        input.runtimeBindings,
        instructionScopes,
        bindingExpressionScopes,
      ),
      resourceScope: input.resourceScope,
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
    const scope = frame.instructionScopes.scopeForBinding(input.runtimeBindings, binding);
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
    const strictBinding = input.runtimeBindings.readRenderContextForBinding(binding.productHandle)?.renderingController.strict ?? null;
    const draft = this.draftMaterializer.dataFlowDraftForBinding(
      binding,
      target,
      scope,
      context.evaluator,
      context.sourceExpressionContexts,
      strictBinding,
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
      observedDependencies: this.observedDependenciesForDataFlow(local, binding, dataFlow, scope, draft, context),
    };
  }

  private observedDependenciesForDataFlow(
    local: string,
    binding: RuntimeDataFlowBinding,
    dataFlow: RuntimeBindingDataFlow,
    scope: BindingScope | null,
    draft: DataFlowDraft,
    context: BindingDataFlowContext,
  ): readonly RuntimeBindingObservedDependency[] {
    if (draft.ast == null || !bindingDataFlowDirectionIncludesSourceEvaluation(draft.direction)) {
      return [];
    }
    const ast = draft.ast;
    const observedDependencyInputs: readonly ObservedDependencyInput[] = scope == null
      ? [{
          expression: ast,
          scope: null,
          checkerContext: null,
          dependencies: distinctRuntimeObservedDependencyDrafts(
            collectRuntimeConnectableObservedDependencyDrafts(ast, null),
          ),
        }]
      : context.sourceExpressionContexts.projectSourceExpressions({
          binding,
          expression: ast,
          localKey: `${local}:observed-dependency:source-expression`,
          sourceScope: scope,
        }).map((projection, segmentIndex): ObservedDependencyInput => {
          if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
            return {
              expression: ast,
              scope: null,
              checkerContext: null,
              dependencies: distinctRuntimeObservedDependencyDrafts(
                collectRuntimeConnectableObservedDependencyDrafts(ast, null),
              ),
            };
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
                evaluator: context.evaluator,
              }),
            ]),
          };
        });
    let dependencyIndex = 0;
    return observedDependencyInputs.flatMap((input) =>
      input.dependencies.map((dependency) => {
        const index = dependencyIndex++;
        const dependencyLocal = `${local}:observed-dependency:${index}`;
        const dependencySource = sourceAddressForRuntimeExpressionBounds(
          this.store,
          dependencyLocal,
          binding.sourceAddressHandle,
          dependency.spanStart,
          dependency.spanEnd,
        );
        const observedMember = input.checkerContext == null
          ? null
          : observedMemberSourceForBindingDependency({
            dependency,
            checkerContext: input.checkerContext,
            evaluator: context.evaluator,
            localKey: local,
          });
        return new RuntimeBindingObservedDependency(
          this.store.handles.product(dependencyLocal),
          this.store.handles.identity(dependencyLocal),
          binding.toReference(),
          dataFlow.productHandle,
          draft.expressionProductHandle,
          input.scope?.toReference() ?? null,
          dependency.dependencyKind,
          dependency.expressionKind,
          dependency.sourceName,
          dependency.sourceRootName,
          dependency.memberName,
          dependency.keyExpression,
          dependency.methodName,
          observedMember?.observedMemberKind ?? null,
          observedMember?.observedMemberSourceAddressHandle ?? null,
          dependency.spanStart,
          dependency.spanEnd,
          dependencySource.handle,
          [],
        );
      })
    );
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
    const carrier = readCheckerTypeShape(this.store, reference)?.carrier ?? null;
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
    typeProjector: CheckerTypeProjector,
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
    resourceScope: TemplateResourceScope | null,
    local: string,
  ): DataFlowDraft {
    const direction = directionForBinding(this.store, binding, resourceScope);
    const needsSourceWriteCapability = bindingDataFlowDirectionIncludesTargetToSource(direction);
    const sourceEvaluationConnectable = bindingDataFlowDirectionIncludesSourceEvaluation(direction);
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
      sourceOnly: isRuntimeSourceOnlyDataFlowBinding(binding),
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
      strictBinding,
      sourceKind: sourceProjection.sourceInfo.sourceKind,
      sourceName: sourceProjection.sourceInfo.sourceName,
      sourceRootName: sourceProjection.sourceInfo.sourceRootName,
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
    const ast = bindingExpressionAstForProduct(this.store, expressionProductHandle);
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
      new BindingDataFlowSourceWriteCapabilityProjector(store, typeAccess),
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
    const templateControllerAlias = templateControllerResultAlias(
      this.store,
      binding,
      target.targetAccess,
      expressionFacts.ast,
    );
    const expressionSite = templateControllerAlias != null || scope == null || expressionFacts.ast == null
      ? null
      : sourceExpressionContexts.projectSource({
        binding,
        expression: expressionFacts.ast,
        localKey: `${expressionFacts.expressionTypeLocal}:source`,
        sourceScope: scope,
      });
    const sourceInfo = this.dataFlowSourceInfo(
      binding,
      expressionSite,
      evaluator,
      needsSourceWriteCapability,
      expressionFacts,
      templateControllerAlias,
      targetTypes.targetValueType,
    );
    const sourceEvaluation = templateControllerAlias != null
      || expressionSite == null
      || expressionSite.kind === RuntimeBindingSourceExpressionProjectionKind.Open
      ? null
      : evaluator.evaluate(checkerContextForRuntimeBindingSourceExpressionProjection(
        expressionSite,
        sourceEvaluationConnectable,
        targetTypes.targetValueType,
      ));
    const evaluatedSourceType = sourceInfo.sourceTypeHint
      ?? (sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? sourceEvaluation.typeReference
        : templateControllerAlias != null
          ? targetTypes.targetValueType
          : null);
    const sourceType = targetTypes.spreadTargetProperty == null
      ? evaluatedSourceType
      : this.typeAccess.memberType(evaluatedSourceType, targetTypes.spreadTargetProperty);
    const spreadSourceTypeOpenReason = targetTypes.spreadTargetProperty != null
      && evaluatedSourceType != null
      && sourceType == null
      ? `SpreadValueBinding source expression type did not expose bindable property '${targetTypes.spreadTargetProperty}'.`
      : null;
    const sourceTypeOpenReason = sourceInfo.sourceTypeHint != null
      ? null
      : sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Open
        ? sourceEvaluation.summary
        : spreadSourceTypeOpenReason;
    const sourceTypeOpenKind = sourceInfo.sourceTypeHint != null
      ? null
      : sourceEvaluation?.kind === CheckerExpressionTypeEvaluationResultKind.Open
        ? sourceEvaluation.openKind
        : spreadSourceTypeOpenReason != null
          ? CheckerExpressionTypeOpenKind.MissingMember
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
        : templateControllerAlias != null
          ? scope
          : null,
      sourceType,
      sourceTypeOpenReason,
      sourceTypeOpenKind,
      sourceAssignmentValueType,
      targetToSourceValueType,
      targetToSourceValueTypeOpenReason: sourceInfo.targetToSourceValueTypeOpenReason ?? null,
      targetToSourceValueTypeOpenKind: sourceInfo.targetToSourceValueTypeOpenKind ?? null,
    };
  }

  private dataFlowSourceInfo(
    binding: RuntimeDataFlowBinding,
    expressionSite: RuntimeBindingSourceExpressionProjection | null,
    evaluator: CheckerExpressionTypeEvaluator,
    needsSourceWriteCapability: boolean,
    expressionFacts: DataFlowExpressionFacts,
    templateControllerAlias: string | null,
    targetValueType: CheckerTypeReference | null,
  ): SourceExpressionInfo {
    if (templateControllerAlias != null) {
      return this.sourceInfo.templateControllerAlias(templateControllerAlias, needsSourceWriteCapability);
    }
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

  constructor(
    readonly store: KernelStore,
    typeProjector: CheckerTypeProjector,
  ) {
    this.shapeAccess = new CheckerTypeShapeAccess(store, typeProjector);
  }

  readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return readCheckerTypeShape(this.store, reference);
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
    return checkerCallableReferenceReturnAssignableToPrimitiveType(this.store, reference, 'boolean', runtimeArgumentCount);
  }

  memberType(
    reference: CheckerTypeReference | null,
    propertyName: string,
  ): CheckerTypeReference | null {
    const shape = this.readTypeShape(reference);
    if (shape == null || reference == null) {
      return null;
    }
    return this.shapeAccess.memberValueType(
      shape,
      propertyName,
      `${reference.productHandle ?? reference.checkerKey ?? 'open'}:member:${propertyName}`,
    )?.toReference() ?? null;
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

function directionForBinding(
  store: KernelStore,
  binding: RuntimeDataFlowBinding,
  resourceScope: TemplateResourceScope | null,
): RuntimeBindingDataFlowDirection {
  if (isRuntimeSourceOnlyDataFlowBinding(binding)) {
    return RuntimeBindingDataFlowDirection.SourceRead;
  }
  if (binding instanceof PropertyBinding) {
    return directionForBindingMode(effectivePropertyBindingMode(store, binding, resourceScope));
  }
  if (binding instanceof RefBinding) {
    return RuntimeBindingDataFlowDirection.TargetToSource;
  }
  return RuntimeBindingDataFlowDirection.SourceToTarget;
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
  const unwrapped = unwrapExpressionAstNodeParens(ast);
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
    : frameworkTemplateControllerSemanticsForName(controllerName);
  return semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled
    || semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseRejected
    ? unwrapped.name.name
    : null;
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
    reasons.push('Expression parser result did not expose an evaluable expression AST for binding data flow.');
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
