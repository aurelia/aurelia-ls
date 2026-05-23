import ts from 'typescript';
import {
  collectionElementTypeFor,
  isRuntimeArrayInstanceType,
  mapKeyTypeFor,
  mapValueTypeFor,
  mutableCollectionElementTypeFor,
  mutableMapKeyTypeFor,
  mutableMapValueTypeFor,
  stringLiteralValuesForType,
} from './checker-type-helpers.js';
import type {
  AccessKeyedExpression,
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
  type CheckerExpressionTypeEvaluation,
} from '../type-system/expression-type-evaluation.js';
import {
  type CheckerExpressionTypeWorld,
} from '../type-system/expression-type-world.js';
import {
  TypeSystemHotDetails,
} from '../type-system/product-details.js';
import {
  checkerRepeatableElementTypeInfo,
  checkerNullishType,
  checkerTypeShapeIsDefinitelyNullish,
} from '../type-system/checker-related-types.js';
import {
  checkerTypeReferenceAssignable,
} from '../type-system/checker-type-assignability.js';
import {
  CheckerTypeShapeKind,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';
import {
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import {
  CheckerTypeShapeAccess,
  CheckerTypeShapeMemberWriteAccessKind,
  checkerTypeMemberWriteAccess,
  readCheckerTypeShape,
  type CheckerTypeShapeMemberWriteAccess,
} from '../type-system/checker-type-shape-access.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import {
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import {
  BuiltInTemplateControllerFlowKind,
  frameworkTemplateControllerSemanticsForName,
} from '../template/template-controller-semantics.js';
import { TemplateProductDetails } from '../template/product-details.js';
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
  type RuntimeBindingPrimitiveValue,
  RuntimeObservedDependencyKind,
  type RuntimeBindingValueChannel,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';
import {
  runtimeBindingPrimitiveValueAssignableToType,
  runtimeBindingStringPrimitiveDomain,
} from './runtime-binding-primitive-value.js';
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
  distinctRuntimeObservedDependencyDrafts,
  runtimeObservedDependencyIdentityLocalName,
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';
import {
  RuntimeHtmlObservationFrameworkErrorCode,
  RuntimeObservationFrameworkErrorCode,
  type ObservationFrameworkErrorCode,
} from './framework-error-code.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { RuntimeBindingValueChannelEmission } from './binding-value-channel-materializer.js';
import type {
  TemplateExpressionParse,
} from '../template/value-site.js';
import {
  sourceAddressForRuntimeExpressionBounds,
  sourceAddressRecordsForRuntimeExpressionBounds,
} from '../template/runtime-expression-source-address.js';
import {
  runtimeAcceptedBindingExpressionAstForParse,
  runtimeAssignmentTargetAstForExpression,
  runtimeAssignmentValueConverterChainForExpression,
} from '../template/expression-parse-projection.js';
import { unwrapExpressionAstNodeParens } from '../expression/parse-result-inspection.js';
import {
  expressionSourceName,
  expressionSourceRootName,
} from '../expression/expression-source-name.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import {
  expressionProductHandleForBinding,
  instructionScopeLookup,
  isRuntimeExpressionBinding,
  type RuntimeInstructionScopeLookup,
  type RuntimeExpressionBinding,
} from './runtime-binding-expression.js';
import {
  effectivePropertyBindingMode,
} from '../template/runtime-binding-mode-behavior.js';

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

type SourceExpressionInfo = {
  readonly sourceKind: RuntimeBindingDataFlowSourceKind;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly sourceWriteCapability: SourceWriteCapability | null;
  readonly sourceTypeHint?: CheckerTypeReference | null;
  readonly sourceAssignmentValueTypeHint?: CheckerTypeReference | null;
  readonly targetToSourceValueTypeHint?: CheckerTypeReference | null;
  readonly targetToSourceValueTypeOpenReason?: string | null;
  readonly targetToSourceValueTypeOpenKind?: CheckerExpressionTypeOpenKind | null;
};

type BindingDataFlowContext = {
  readonly evaluator: CheckerExpressionTypeEvaluator;
  readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjector;
  readonly resourceScope: TemplateResourceScope | null;
};

type ObservedMemberProjection = {
  readonly memberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly sourceAddressHandle: AddressHandle | null;
};

const emptyObservedMemberProjection: ObservedMemberProjection = {
  memberKind: null,
  sourceAddressHandle: null,
};

function directObservedMemberProjectionForDependency(
  dependency: RuntimeObservedDependencyDraft,
): ObservedMemberProjection | null {
  if (dependency.observedMemberKind == null && dependency.observedMemberSourceAddressHandle == null) {
    return null;
  }
  return {
    memberKind: dependency.observedMemberKind ?? null,
    sourceAddressHandle: dependency.observedMemberSourceAddressHandle ?? null,
  };
}

type DataFlowTarget = {
  readonly localSuffix: string;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
};

type DataFlowDraft = {
  readonly ast: ExpressionAstNode | null;
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
    scope?.toReference() ?? null,
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
  readonly sourceType: CheckerTypeReference | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | null;
  readonly sourceAssignmentValueType: CheckerTypeReference | null;
  readonly targetToSourceValueType: CheckerTypeReference | null;
  readonly targetToSourceValueTypeOpenReason: string | null;
  readonly targetToSourceValueTypeOpenKind: CheckerExpressionTypeOpenKind | null;
};

type DataFlowAssignability = {
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly sourceToTargetTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[];
  readonly targetToSourceTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[];
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
  readonly assignmentTargetSourceAddressHandle: AddressHandle | null;
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
    return new BindingDataFlowMaterializationFrame(source, instructionScopes, {
      evaluator,
      bindingExpressionScopes: new RuntimeBindingExpressionScopeProjector(this.store, input.expressionWorld),
      resourceScope: input.resourceScope,
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
      context.bindingExpressionScopes,
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
    if (draft.ast == null || !directionIncludesSourceToTarget(draft.direction)) {
      return [];
    }
    const observedDependencyInputs = scope == null
      ? [{
          expression: draft.ast,
          scope: null as BindingScope | null,
          dependencies: distinctRuntimeObservedDependencyDrafts(
            collectRuntimeConnectableObservedDependencyDrafts(draft.ast, null),
          ),
        }]
      : context.bindingExpressionScopes.projectSourceExpressions({
          expression: draft.ast,
          scope,
          localKey: `${local}:observed-dependency:runtime-expression-scope`,
          sourceAddressHandle: binding.sourceAddressHandle,
        }).map((projection, segmentIndex) => {
          const canUseRuntimeArrayMethod = projection.scope == null
            ? null
            : this.templateArrayMethodPolicy(binding, projection.scope, context.evaluator, local);
          return {
            expression: projection.expression,
            scope: projection.scope,
            dependencies: distinctRuntimeObservedDependencyDrafts([
              ...collectRuntimeConnectableObservedDependencyDrafts(projection.expression, canUseRuntimeArrayMethod),
              ...(projection.scope == null
                ? []
                : collectRuntimeTrackableMethodObservedDependencyDrafts({
                  expression: projection.expression,
                  scope: projection.scope,
                  store: this.store,
                  evaluator: context.evaluator,
                  localKey: `${local}:interpolation-part:${segmentIndex}`,
                  sourceAddressHandle: binding.sourceAddressHandle,
                })),
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
        const observedMember = input.scope == null
        ? emptyObservedMemberProjection
        : this.observedMemberProjectionForDependency(
          input.expression,
          dependency,
          input.scope,
          context.evaluator,
          local,
          binding.sourceAddressHandle,
        );
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
        observedMember.memberKind,
        observedMember.sourceAddressHandle,
        dependency.spanStart,
        dependency.spanEnd,
        dependencySource.handle,
        [],
      );
      })
    );
  }

  private observedMemberProjectionForDependency(
    expression: ExpressionAstNode,
    dependency: RuntimeObservedDependencyDraft & {
      readonly memberNameSpanStart?: number | null;
      readonly scopeLookupAncestor?: number | null;
    },
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
  ): ObservedMemberProjection {
    const directProjection = directObservedMemberProjectionForDependency(dependency);
    if (directProjection != null) {
      return directProjection;
    }
    const memberNameSpanStart = 'memberNameSpanStart' in dependency
      ? dependency.memberNameSpanStart ?? null
      : null;
    if (dependency.memberName == null || memberNameSpanStart == null) {
      if (dependency.keyExpression != null) {
        return this.observedOwnerSourceProjectionForDependency(dependency, scope, evaluator, local);
      }
      return this.observedScopeNameProjectionForDependency(dependency, scope, evaluator, local);
    }
    const access = evaluator.evaluateMemberValueAccessAtOffset(
      expression,
      memberNameSpanStart,
      dependency.memberName,
      scope,
      `${local}:observed-dependency:member:${dependency.spanStart ?? 'open'}:${localKeyPart(dependency.memberName)}`,
      sourceAddressHandle,
    );
    const ownerSource = this.observedOwnerSourceProjectionForDependency(dependency, scope, evaluator, local);
    if (access == null) {
      return ownerSource;
    }
    return {
      memberKind: access.memberKind,
      sourceAddressHandle: access.sourceAddressHandle ?? ownerSource.sourceAddressHandle,
    };
  }

  private observedScopeNameProjectionForDependency(
    dependency: RuntimeObservedDependencyDraft & { readonly scopeLookupAncestor?: number | null },
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
  ): ObservedMemberProjection {
    const name = dependency.sourceName ?? dependency.sourceRootName;
    if (name == null) {
      return emptyObservedMemberProjection;
    }
    const isScopeExpression =
      (dependency.expressionKind === 'AccessScope' || dependency.expressionKind === 'CallScope')
      && dependency.scopeLookupAncestor != null;
    const isDirectCollectionOwner =
      dependency.dependencyKind === RuntimeObservedDependencyKind.TemplateCollectionRead
      && dependency.memberName == null
      && dependency.keyExpression == null
      && dependency.sourceName === dependency.sourceRootName
      && dependency.sourceName === name
      && dependency.scopeLookupAncestor != null;
    if (!isScopeExpression && !isDirectCollectionOwner) {
      return emptyObservedMemberProjection;
    }
    const lookup = scope.locate(name, dependency.scopeLookupAncestor ?? 0);
    if (lookup.slot != null) {
      const access = evaluator.memberValueAccessForReference(
        lookup.context?.contextType ?? null,
        name,
        `${local}:observed-dependency:scope-slot:${dependency.spanStart ?? 'open'}:${localKeyPart(name)}`,
      );
      return {
        memberKind: access?.memberKind ?? null,
        sourceAddressHandle: lookup.slot.sourceAddressHandle ?? access?.sourceAddressHandle ?? null,
      };
    }
    const access = evaluator.memberValueAccessForReference(
      lookup.context?.contextType ?? null,
      name,
      `${local}:observed-dependency:scope-name:${dependency.spanStart ?? 'open'}:${localKeyPart(name)}`,
    );
    return access == null
      ? emptyObservedMemberProjection
      : {
        memberKind: access.memberKind,
        sourceAddressHandle: access.sourceAddressHandle,
      };
  }

  private observedOwnerSourceProjectionForDependency(
    dependency: RuntimeObservedDependencyDraft & { readonly scopeLookupAncestor?: number | null },
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
  ): ObservedMemberProjection {
    const rootName = dependency.sourceRootName;
    if (rootName == null || dependency.scopeLookupAncestor == null) {
      return emptyObservedMemberProjection;
    }
    const lookup = scope.locate(rootName, dependency.scopeLookupAncestor);
    if (lookup.slot != null) {
      return {
        memberKind: null,
        sourceAddressHandle: lookup.slot.sourceAddressHandle,
      };
    }
    const access = evaluator.memberValueAccessForReference(
      lookup.context?.contextType ?? null,
      rootName,
      `${local}:observed-dependency:owner-source:${dependency.spanStart ?? 'open'}:${localKeyPart(rootName)}`,
    );
    return access == null
      ? emptyObservedMemberProjection
      : {
        memberKind: null,
        sourceAddressHandle: access.sourceAddressHandle,
      };
  }

  private templateArrayMethodPolicy(
    binding: RuntimeDataFlowBinding,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
  ): RuntimeTemplateArrayMethodPolicy {
    return (expression, rootExpression) => {
      const ownerType = evaluator.evaluateMemberOwnerAtOffset(
        rootExpression,
        expression.name.span.start,
        scope,
        `${local}:observed-dependency:collection-owner:${expression.span.start}:${expression.name.span.start}:${expression.name.name}`,
        binding.sourceAddressHandle,
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
    return dependencies.flatMap((dependency, index): readonly KernelStoreRecord[] => {
      const dependencyLocal = `${local}:observed-dependency:${index}`;
      const dependencySource = sourceAddressRecordsForRuntimeExpressionBounds(
        this.store,
        dependency.sourceAddressHandle,
        binding.sourceAddressHandle,
        dependency.spanStart,
        dependency.spanEnd,
      );
      const bindingClaim = new SemanticClaim(
        this.store.handles.claim(`${dependencyLocal}:runtime-binding-uses-observed-dependency`),
        binding.productHandle,
        KernelVocabulary.Binding.RuntimeBindingUsesObservedDependency.key,
        dependency.productHandle,
        source.provenanceHandle,
      );
      const dataFlowClaim = new SemanticClaim(
        this.store.handles.claim(`${dependencyLocal}:data-flow-uses-observed-dependency`),
        dataFlow.productHandle,
        KernelVocabulary.Binding.DataFlowUsesObservedDependency.key,
        dependency.productHandle,
        source.provenanceHandle,
      );
      return [
        ...dependencySource.records,
        new CompilerIdentity(
          dependency.identityHandle,
          KernelVocabulary.Binding.ObservedDependency.key,
          binding.identityHandle,
          dependencySource.handle,
          runtimeObservedDependencyIdentityLocalName(dependency, index),
        ),
        new MaterializedProduct(
          dependency.productHandle,
          KernelVocabulary.Binding.ObservedDependency.key,
          dependency.identityHandle,
          dependencySource.handle,
          source.provenanceHandle,
        ),
        bindingClaim,
        dataFlowClaim,
        new MaterializationRecord(
          this.store.handles.materialization(dependencyLocal),
          dependency.identityHandle,
          [dependency.productHandle],
          [bindingClaim.handle, dataFlowClaim.handle],
          [],
        ),
      ];
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
    bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
    strictBinding: boolean | null,
    resourceScope: TemplateResourceScope | null,
    local: string,
  ): DataFlowDraft {
    const direction = directionForBinding(this.store, binding, resourceScope);
    const needsSourceWriteCapability = directionIncludesTargetToSource(direction);
    const sourceEvaluationConnectable = directionIncludesSourceToTarget(direction);
    const expressionFacts = this.dataFlowExpressionFacts(binding, scope, local);
    const targetTypes = this.dataFlowTargetTypes(binding, target);
    const sourceProjection = this.sourceProjector.dataFlowSourceProjection(
      binding,
      target,
      scope,
      evaluator,
      bindingExpressionScopes,
      needsSourceWriteCapability,
      strictBinding,
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
      sourceInfo: sourceProjection.sourceInfo,
      targetToSourceAssignable: assignability.targetToSourceAssignable,
      valueChannel: target.valueChannel,
      sourceAssignmentValueType: sourceProjection.sourceAssignmentValueType,
      targetToSourceValueType: sourceProjection.targetToSourceValueType,
    });
    const openReason = openReasonForDataFlow({
      direction,
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
    if (!directionIncludesSourceToTarget(direction)) {
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

  private readParse(productHandle: ProductHandle | null): TemplateExpressionParse | null {
    return productHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  }
}

class BindingDataFlowSourceProjector {
  private readonly sourceWriteCapability: BindingDataFlowSourceWriteCapabilityProjector;

  constructor(
    private readonly store: KernelStore,
    private readonly typeAccess: BindingDataFlowTypeAccess,
  ) {
    this.sourceWriteCapability = new BindingDataFlowSourceWriteCapabilityProjector(store, typeAccess);
  }

  dataFlowSourceProjection(
    binding: RuntimeDataFlowBinding,
    target: DataFlowTarget,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
    needsSourceWriteCapability: boolean,
    strictBinding: boolean | null,
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
    const sourceInfo = this.dataFlowSourceInfo(
      binding,
      scope,
      evaluator,
      bindingExpressionScopes,
      needsSourceWriteCapability,
      strictBinding,
      expressionFacts,
      templateControllerAlias,
      targetTypes.targetValueType,
    );
    const sourceEvaluation = templateControllerAlias != null || scope == null || expressionFacts.ast == null
      ? null
      : evaluator.evaluateWithScope(
        expressionFacts.ast,
        scope,
        expressionFacts.expressionTypeLocal,
        binding.sourceAddressHandle,
        targetTypes.targetValueType,
        { connectable: sourceEvaluationConnectable, strict: strictBinding },
      );
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
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    bindingExpressionScopes: RuntimeBindingExpressionScopeProjector,
    needsSourceWriteCapability: boolean,
    strictBinding: boolean | null,
    expressionFacts: DataFlowExpressionFacts,
    templateControllerAlias: string | null,
    targetValueType: CheckerTypeReference | null,
  ): SourceExpressionInfo {
    if (templateControllerAlias != null) {
      return {
        sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
        sourceName: templateControllerAlias,
        sourceRootName: templateControllerAlias,
        sourceWriteCapability: needsSourceWriteCapability ? sourceWriteCapabilityWritable() : null,
      };
    }
    if (scope == null || expressionFacts.ast == null) {
      return openSourceExpressionInfo(needsSourceWriteCapability);
    }
    const expressionScope = bindingExpressionScopes.project({
      expression: expressionFacts.ast,
      scope,
      localKey: `${expressionFacts.expressionTypeLocal}:source-info:runtime-expression-scope`,
      sourceAddressHandle: binding.sourceAddressHandle,
    });
    if (expressionScope.scope == null) {
      return openSourceExpressionInfo(needsSourceWriteCapability);
    }
    return this.sourceInfoForExpression(
      expressionScope.expression,
      expressionScope.scope,
      evaluator,
      expressionFacts.expressionTypeLocal,
      binding.sourceAddressHandle,
      needsSourceWriteCapability,
      strictBinding,
      targetValueType,
    );
  }

  private sourceInfoForExpression(
    expression: ExpressionAstNode,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
    needsSourceWriteCapability: boolean,
    strictBinding: boolean | null,
    targetValueType: CheckerTypeReference | null,
  ): SourceExpressionInfo {
    const unwrapped = runtimeAssignmentTargetAstForExpression(expression);
    const writeback = needsSourceWriteCapability
      ? this.valueConverterWritebackProjection(
        expression,
        unwrapped,
        scope,
        evaluator,
        local,
        sourceAddressHandle,
        strictBinding,
        targetValueType,
      )
      : {};
    switch (unwrapped.$kind) {
      case 'AccessScope':
        const syntheticWritebackTypeHint = needsSourceWriteCapability && isSyntheticWritebackLocal(unwrapped)
          ? targetValueType
          : null;
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.ScopeName,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapability.forAccessScope(unwrapped, scope, targetValueType)
            : null,
          sourceTypeHint: syntheticWritebackTypeHint,
          ...writeback,
        };
      case 'AccessMember':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Member,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapability.forAccessMember(
              unwrapped,
              scope,
              evaluator,
              local,
              sourceAddressHandle,
              strictBinding,
            )
            : null,
          ...writeback,
        };
      case 'AccessKeyed':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Keyed,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? this.sourceWriteCapability.forAccessKeyed(
              unwrapped,
              scope,
              evaluator,
              local,
              sourceAddressHandle,
              strictBinding,
            )
            : null,
          ...writeback,
        };
      case 'AccessThis':
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.This,
          sourceName: '$this',
          sourceRootName: '$this',
          sourceWriteCapability: needsSourceWriteCapability
            ? sourceWriteCapabilityRuntimeUnassignable(
              'Aurelia astAssign does not assign to AccessThis expressions.',
              RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
            )
            : null,
          ...writeback,
        };
      default:
        return {
          sourceKind: RuntimeBindingDataFlowSourceKind.Other,
          sourceName: expressionSourceName(unwrapped),
          sourceRootName: expressionSourceRootName(unwrapped),
          sourceWriteCapability: needsSourceWriteCapability
            ? sourceWriteCapabilityRuntimeUnassignable(
              `Aurelia astAssign does not assign to expression kind '${unwrapped.$kind}'.`,
              RuntimeBindingDataFlowSourceAssignmentReasonKind.RuntimeExpressionUnassignable,
            )
            : null,
          ...writeback,
        };
    }
  }

  private valueConverterWritebackProjection(
    expression: ExpressionAstNode,
    unwrapped: ExpressionAstNode,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
    strictBinding: boolean | null,
    targetValueType: CheckerTypeReference | null,
  ): Pick<
    SourceExpressionInfo,
    | 'sourceAssignmentValueTypeHint'
    | 'targetToSourceValueTypeHint'
    | 'targetToSourceValueTypeOpenReason'
    | 'targetToSourceValueTypeOpenKind'
  > {
    const converters = runtimeAssignmentValueConverterChainForExpression(expression);
    if (converters.length === 0) {
      return {};
    }

    const targetEvaluation = evaluator.evaluateWithScope(
      unwrapped,
      scope,
      `${local}:assignment-target`,
      sourceAddressHandle,
      null,
      { connectable: false, strict: strictBinding },
    );
    const sourceAssignmentValueTypeHint = targetEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? targetEvaluation.typeReference
      : null;
    if (targetValueType == null) {
      return {
        sourceAssignmentValueTypeHint,
        targetToSourceValueTypeHint: null,
      };
    }

    let current = targetValueType;
    for (let index = 0; index < converters.length; index++) {
      const converter = converters[index]!;
      const evaluation = evaluator.evaluateValueConverterMethodFromType(
        converter,
        'fromView',
        current,
        scope,
        `${local}:converter:${index}:${converter.name.name}:from-view`,
        sourceAddressHandle,
      );
      if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
        return {
          sourceAssignmentValueTypeHint,
          targetToSourceValueTypeHint: null,
          targetToSourceValueTypeOpenReason: evaluation.summary,
          targetToSourceValueTypeOpenKind: evaluation.openKind,
        };
      }
      current = evaluation.typeReference;
    }

    return {
      sourceAssignmentValueTypeHint,
      targetToSourceValueTypeHint: current,
    };
  }
}

class BindingDataFlowSourceWriteCapabilityProjector {
  constructor(
    private readonly store: KernelStore,
    private readonly typeAccess: BindingDataFlowTypeAccess,
  ) {}

  forAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
    targetValueType: CheckerTypeReference | null,
  ): SourceWriteCapability {
    if (isHostAccessScope(expression)) {
      return sourceWriteCapabilityRuntimeUnassignable(
        "Aurelia astAssign rejects assignment to the reserved '$host' access scope.",
        RuntimeBindingDataFlowSourceAssignmentReasonKind.HostAccessScopeAssignment,
      );
    }
    const lookup = scope.lookup(expression.name.name, expression.ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return sourceWriteCapabilityOpen(
        'Scope lookup could not resolve the requested ancestor for runtime assignment.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeLookupMissingAncestor,
      );
    }
    if (lookup.slot == null && isSyntheticWritebackLocal(expression)) {
      return sourceWriteCapabilityWritable(targetValueType);
    }
    if (lookup.slot == null) {
      const contextType = lookup.context?.contextType ?? null;
      const contextShape = this.typeAccess.readTypeShape(contextType);
      if (contextShape != null) {
        return sourceWriteCapabilityForMemberAccess(
          this.typeAccess.memberWriteAccess(contextShape, expression.name.name),
          contextShape.display ?? contextType?.display ?? null,
          contextType,
        );
      }
    }
    return lookup.slot == null
      ? sourceWriteCapabilityTypeScriptStrictness(
        'Scope lookup did not expose a TypeChecker slot; Aurelia astAssign can still write to the runtime context.',
        null,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotMissingTypeCheckerMember,
      )
      : this.forSlot(lookup.slot);
  }

  forAccessMember(
    expression: AccessMemberExpression,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
    strictBinding: boolean | null,
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
    const ownerShape = ownerEvaluation.typeShape;
    if (strictBinding === true && checkerTypeShapeIsDefinitelyNullish(ownerShape)) {
      return sourceWriteCapabilityRuntimeUnassignable(
        `Aurelia strict astAssign rejects member assignment '${expression.name.name}' because the owner type is definitely nullish.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.NullishAssignment,
      );
    }
    return sourceWriteCapabilityForMemberAccess(
      this.typeAccess.memberWriteAccess(ownerShape, expression.name.name),
      ownerShape.display ?? ownerEvaluation.typeReference.display,
      ownerEvaluation.typeReference,
    );
  }

  forAccessKeyed(
    expression: AccessKeyedExpression,
    scope: BindingScope,
    evaluator: CheckerExpressionTypeEvaluator,
    local: string,
    sourceAddressHandle: AddressHandle | null,
    strictBinding: boolean | null,
  ): SourceWriteCapability {
    const ownerEvaluation = evaluator.evaluateWithScope(
      expression.object,
      scope,
      `${local}:owner:keyed`,
      sourceAddressHandle,
    );
    if (strictBinding !== true) {
      return sourceWriteCapabilityWritable(null, sourceWriteCapabilitySourceForOwnerEvaluation(ownerEvaluation));
    }
    if (ownerEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return sourceWriteCapabilityOpen(
        ownerEvaluation.summary,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerTypeOpen,
      );
    }
    const ownerShape = ownerEvaluation.typeShape;
    return checkerTypeShapeIsDefinitelyNullish(ownerShape)
      ? sourceWriteCapabilityRuntimeUnassignable(
        'Aurelia strict astAssign rejects keyed assignment because the owner type is definitely nullish.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.NullishAssignment,
        null,
        sourceWriteCapabilitySourceForOwnerEvaluation(ownerEvaluation),
      )
      : sourceWriteCapabilityWritable(null, sourceWriteCapabilitySourceForOwnerEvaluation(ownerEvaluation));
  }

  private forSlot(slot: BindingContextSlot): SourceWriteCapability {
    if (slot.targetProductHandle == null) {
      return sourceWriteCapabilityTypeScriptStrictness(
        'Scope slot is runtime-only and does not carry a TypeChecker member product; Aurelia astAssign can still write to the runtime context.',
        null,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotRuntimeOnly,
      );
    }
    const member = this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
    return member == null
      ? sourceWriteCapabilityOpen(
        'Scope slot member product was not available for runtime assignment policy.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.ScopeSlotTypeCheckerMemberUnavailable,
      )
      : sourceWriteCapabilityForMemberAccess(
        checkerTypeMemberWriteAccess(member, this.store),
        member.ownerType.display,
        member.ownerType,
      );
  }
}

class BindingDataFlowAssignabilityEvaluator {
  constructor(private readonly typeAccess: BindingDataFlowTypeAccess) {}

  dataFlowAssignability(
    direction: RuntimeBindingDataFlowDirection,
    sourceType: CheckerTypeReference | null,
    targetValueType: CheckerTypeReference | null,
    sourceAssignmentValueType: CheckerTypeReference | null,
    targetToSourceValueType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): DataFlowAssignability {
    const sourceToTargetAssignable = directionIncludesSourceToTarget(direction)
      ? this.isSourceAssignableToTarget(sourceType, targetValueType, valueChannel)
      : null;
    const targetToSourceAssignable = directionIncludesTargetToSource(direction)
      ? this.isTargetAssignableToSource(targetToSourceValueType, sourceAssignmentValueType, valueChannel)
      : null;
    return {
      sourceToTargetAssignable,
      targetToSourceAssignable,
      sourceToTargetTypeMismatchKinds: sourceToTargetAssignable === false
        && this.nullishTypeBlocksAssignment(sourceType, targetValueType)
        ? [RuntimeBindingDataFlowTypeMismatchKind.SourceNullishToRequiredTarget]
        : [],
      targetToSourceTypeMismatchKinds: targetToSourceAssignable === false
        && this.nullishTypeBlocksAssignment(targetToSourceValueType, sourceAssignmentValueType)
        ? [RuntimeBindingDataFlowTypeMismatchKind.TargetNullishToRequiredSource]
        : [],
    };
  }

  private nullishTypeBlocksAssignment(
    from: CheckerTypeReference | null,
    to: CheckerTypeReference | null,
  ): boolean {
    const fromCarrier = this.typeAccess.readTypeShape(from)?.carrier ?? null;
    const toCarrier = this.typeAccess.readTypeShape(to)?.carrier ?? null;
    if (fromCarrier == null || toCarrier == null || fromCarrier.checker !== toCarrier.checker) {
      return false;
    }
    if (!typeIncludesNullish(fromCarrier.checker, fromCarrier.type)) {
      return false;
    }
    return fromCarrier.checker.isTypeAssignableTo(
      fromCarrier.checker.getNonNullableType(fromCarrier.type),
      toCarrier.type,
    );
  }

  private isTypeAssignable(
    from: CheckerTypeReference | null,
    to: CheckerTypeReference | null,
  ): boolean | null {
    return checkerTypeReferenceAssignable(this.typeAccess.store, from, to);
  }

  private isSourceAssignableToTarget(
    sourceType: CheckerTypeReference | null,
    targetType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const observerSync = this.observerSourceToTargetRuntimeAcceptance(sourceType, valueChannel);
    if (observerSync != null) {
      return observerSync;
    }
    const valueDomain = valueChannel?.valueDomain ?? [];
    const primitiveValueDomain = this.primitiveValueDomain(valueChannel);
    if (primitiveValueDomain.length > 0 && valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedRadioValue) {
      return this.isPrimitiveDomainAssignableToType(primitiveValueDomain, sourceType);
    }
    if (valueChannelMutatesCollection(valueChannel)) {
      return primitiveValueDomain.length > 0
        ? this.isPrimitiveDomainObservableFromSourceCollection(primitiveValueDomain, sourceType, valueChannel)
        : this.isTypeObservableFromSourceCollection(targetType, sourceType, valueChannel);
    }
    if (valueChannel?.channelKind === RuntimeBindingValueChannelKind.TemplateControllerIteration) {
      return this.typeAccess.isRepeatSourceRuntimeAccepted(sourceType);
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

  private observerSourceToTargetRuntimeAcceptance(
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    if (sourceType == null || valueChannel == null) {
      return null;
    }
    switch (valueChannel.channelKind) {
      case RuntimeBindingValueChannelKind.CustomMatcherFunction:
        return this.typeAccess.isCallableBooleanFunction(sourceType);
      case RuntimeBindingValueChannelKind.SelectSingleOptionValue:
        return !this.typeAccess.isRuntimeArrayInstanceType(sourceType);
      case RuntimeBindingValueChannelKind.CheckedRadioValue:
      case RuntimeBindingValueChannelKind.CheckedBoolean:
      case RuntimeBindingValueChannelKind.CheckedDynamicModelValue:
        return true;
      default:
        return null;
    }
  }

  private isTargetAssignableToSource(
    targetType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const valueDomain = valueChannel?.valueDomain ?? [];
    const primitiveValueDomain = this.primitiveValueDomain(valueChannel);
    if (valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedDynamicModelValue) {
      return primitiveValueDomain.length > 0
        ? this.isPrimitiveDomainAssignableToDynamicCheckedSource(primitiveValueDomain, sourceType, valueChannel)
        : this.isTypeAssignableToDynamicCheckedSource(targetType, sourceType, valueChannel);
    }
    if (valueChannelHasCoupling(valueChannel, RuntimeBindingValueChannelCouplingKind.SelectDynamicArraySourceShape)) {
      return null;
    }
    if (valueChannelMutatesCollection(valueChannel)) {
      return primitiveValueDomain.length > 0
        ? this.isPrimitiveDomainAssignableToSourceMutation(primitiveValueDomain, sourceType, valueChannel)
        : this.isTypeAssignableToSourceMutationValue(targetType, sourceType, valueChannel);
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

  private primitiveValueDomain(
    valueChannel: RuntimeBindingValueChannel | null,
  ): readonly RuntimeBindingPrimitiveValue[] {
    const direct = valueChannel?.primitiveValueDomain ?? [];
    return direct.length > 0
      ? direct
      : runtimeBindingStringPrimitiveDomain(valueChannel?.valueDomain ?? []);
  }

  private isPrimitiveDomainAssignableToType(
    values: readonly RuntimeBindingPrimitiveValue[],
    to: CheckerTypeReference | null,
  ): boolean | null {
    const toShape = this.typeAccess.readTypeShape(to);
    const toCarrier = toShape?.carrier ?? null;
    if (toCarrier == null) {
      return null;
    }
    return values.every((value) =>
      runtimeBindingPrimitiveValueAssignableToType(value, toCarrier.checker, toCarrier.type)
    );
  }

  private isStringDomainAssignableToType(
    values: readonly string[],
    to: CheckerTypeReference | null,
  ): boolean | null {
    const toShape = this.typeAccess.readTypeShape(to);
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
    const fromShape = this.typeAccess.readTypeShape(from);
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

  private isPrimitiveDomainObservableFromSourceCollection(
    values: readonly RuntimeBindingPrimitiveValue[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    if (sourceCarrier == null) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : collectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    if (elementType == null) {
      return null;
    }
    const keyAssignable = values.every((value) =>
      runtimeBindingPrimitiveValueAssignableToType(value, sourceCarrier.checker, elementType)
    );
    return valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? keyAssignable && this.isBooleanObservableFromMapValue(sourceCarrier.checker, sourceCarrier.type)
      : keyAssignable;
  }

  private isTypeObservableFromSourceCollection(
    valueType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    const valueShape = this.typeAccess.readTypeShape(valueType);
    const valueCarrier = valueShape?.carrier ?? null;
    if (sourceCarrier == null || valueCarrier == null || sourceCarrier.checker !== valueCarrier.checker) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : collectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    const keyAssignable = elementType == null
      ? null
      : sourceCarrier.checker.isTypeAssignableTo(valueCarrier.type, elementType);
    if (!valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type) || keyAssignable == null) {
      return keyAssignable;
    }
    return keyAssignable && this.isBooleanObservableFromMapValue(sourceCarrier.checker, sourceCarrier.type);
  }

  private isStringDomainAssignableToSourceMutation(
    values: readonly string[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    if (sourceCarrier == null) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mutableMapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : mutableCollectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    if (elementType == null) {
      return this.hasReadonlyCollectionSource(sourceCarrier.checker, sourceCarrier.type, valueChannel)
        ? false
        : null;
    }
    const keyAssignable = values.every((value) =>
      sourceCarrier.checker.isTypeAssignableTo(sourceCarrier.checker.getStringLiteralType(value), elementType)
    );
    return valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? keyAssignable && this.isBooleanAssignableToMapValue(sourceCarrier.checker, sourceCarrier.type)
      : keyAssignable;
  }

  private isPrimitiveDomainAssignableToSourceMutation(
    values: readonly RuntimeBindingPrimitiveValue[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    if (sourceCarrier == null) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mutableMapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : mutableCollectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    if (elementType == null) {
      return this.hasReadonlyCollectionSource(sourceCarrier.checker, sourceCarrier.type, valueChannel)
        ? false
        : null;
    }
    const keyAssignable = values.every((value) =>
      runtimeBindingPrimitiveValueAssignableToType(value, sourceCarrier.checker, elementType)
    );
    return valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? keyAssignable && this.isBooleanAssignableToMapValue(sourceCarrier.checker, sourceCarrier.type)
      : keyAssignable;
  }

  private isTypeAssignableToSourceMutationValue(
    valueType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    const valueShape = this.typeAccess.readTypeShape(valueType);
    const valueCarrier = valueShape?.carrier ?? null;
    if (sourceCarrier == null || valueCarrier == null || sourceCarrier.checker !== valueCarrier.checker) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mutableMapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : mutableCollectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    const keyAssignable = elementType == null
      ? (this.hasReadonlyCollectionSource(sourceCarrier.checker, sourceCarrier.type, valueChannel) ? false : null)
      : sourceCarrier.checker.isTypeAssignableTo(valueCarrier.type, elementType);
    if (!valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type) || keyAssignable == null) {
      return keyAssignable;
    }
    return keyAssignable && this.isBooleanAssignableToMapValue(sourceCarrier.checker, sourceCarrier.type);
  }

  private isPrimitiveDomainAssignableToDynamicCheckedSource(
    values: readonly RuntimeBindingPrimitiveValue[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const booleanAssignable = this.isBooleanAssignableToSource(sourceType);
    const mutationAssignable = this.isPrimitiveDomainAssignableToSourceMutation(values, sourceType, valueChannel);
    return combineDynamicCheckedAssignment(booleanAssignable, mutationAssignable);
  }

  private isTypeAssignableToDynamicCheckedSource(
    valueType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const booleanAssignable = this.isBooleanAssignableToSource(sourceType);
    const mutationAssignable = this.isTypeAssignableToSourceMutationValue(valueType, sourceType, valueChannel);
    return combineDynamicCheckedAssignment(booleanAssignable, mutationAssignable);
  }

  private isBooleanAssignableToSource(
    sourceType: CheckerTypeReference | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    return sourceCarrier == null
      ? null
      : sourceCarrier.checker.isTypeAssignableTo(sourceCarrier.checker.getBooleanType(), sourceCarrier.type);
  }

  private hasReadonlyCollectionSource(
    checker: ts.TypeChecker,
    sourceType: ts.Type,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean {
    return valueChannelUsesMapMutation(valueChannel, checker, sourceType)
      ? mapKeyTypeFor(checker, sourceType) != null
      : collectionElementTypeFor(checker, sourceType) != null;
  }

  private isBooleanAssignableToMapValue(
    checker: ts.TypeChecker,
    sourceType: ts.Type,
  ): boolean {
    const valueType = mutableMapValueTypeFor(checker, sourceType);
    return valueType == null
      ? false
      : checker.isTypeAssignableTo(checker.getBooleanType(), valueType);
  }

  private isBooleanObservableFromMapValue(
    checker: ts.TypeChecker,
    sourceType: ts.Type,
  ): boolean {
    const valueType = mapValueTypeFor(checker, sourceType);
    return valueType == null
      ? false
      : checker.isTypeAssignableTo(checker.getBooleanType(), valueType);
  }
}

function checkerTypeMayBeRuntimeArrayInstance(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  if (type.isUnion()) {
    const nonNullish = type.types.filter((part) => !checkerNullishType(checker, part));
    return nonNullish.length > 0
      && nonNullish.some((part) => checkerTypeMayBeRuntimeArrayInstance(checker, part));
  }
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) !== 0) {
    return true;
  }
  return checker.isArrayType(type) || checker.isTupleType(type);
}

class BindingDataFlowTypeAccess {
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

  isCallableBooleanFunction(reference: CheckerTypeReference | null): boolean | null {
    const shape = this.readTypeShape(reference);
    if (shape == null) {
      return isLightweightCallableBooleanFunction(reference);
    }
    if (shape.callReturnType == null) {
      const displayAcceptance = isBooleanLikeFunctionReturnDisplay(shape.display);
      if (displayAcceptance != null) {
        return displayAcceptance;
      }
      return shape.shapeKind === CheckerTypeShapeKind.Any || shape.shapeKind === CheckerTypeShapeKind.Unknown
        ? null
        : false;
    }
    return this.isBooleanReturnType(shape.callReturnType);
  }

  private isBooleanReturnType(reference: CheckerTypeReference | null): boolean | null {
    if (reference == null) {
      return null;
    }
    const returnShape = this.readTypeShape(reference);
    const returnCarrier = returnShape?.carrier ?? null;
    if (returnCarrier != null) {
      return returnCarrier.checker.isTypeAssignableTo(returnCarrier.type, returnCarrier.checker.getBooleanType());
    }
    return isBooleanLikeTypeDisplay(returnShape?.display ?? reference.display ?? null);
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
  ): CheckerTypeShapeMemberWriteAccess {
    return this.shapeAccess.memberWriteAccess(ownerType, memberName);
  }
}

function isBooleanLikeTypeDisplay(display: string | null): boolean | null {
  if (display == null || display === 'unknown' || display === 'any') {
    return null;
  }
  return display === 'boolean'
    || display === 'true'
    || display === 'false'
    || display.split('|').map((part) => part.trim()).every((part) => part === 'true' || part === 'false');
}

function isLightweightCallableBooleanFunction(reference: CheckerTypeReference | null): boolean | null {
  if (reference == null
    || reference.shapeKind === CheckerTypeShapeKind.Any
    || reference.shapeKind === CheckerTypeShapeKind.Unknown) {
    return null;
  }
  if (reference.shapeKind !== CheckerTypeShapeKind.Function) {
    return false;
  }
  return isBooleanLikeFunctionReturnDisplay(reference.display);
}

function isBooleanLikeFunctionReturnDisplay(display: string | null): boolean | null {
  if (display == null) {
    return null;
  }
  const arrowIndex = display.lastIndexOf('=>');
  return arrowIndex < 0
    ? null
    : isBooleanLikeTypeDisplay(display.slice(arrowIndex + 2).trim());
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

function directionForBinding(
  store: KernelStore,
  binding: RuntimeDataFlowBinding,
  resourceScope: TemplateResourceScope | null,
): RuntimeBindingDataFlowDirection {
  if (binding instanceof PropertyBinding) {
    return directionForBindingMode(effectivePropertyBindingMode(store, binding, resourceScope));
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

function sourceAssignmentForDataFlow(input: {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly sourceInfo: SourceExpressionInfo;
  readonly targetToSourceAssignable: boolean | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
  readonly sourceAssignmentValueType: CheckerTypeReference | null;
  readonly targetToSourceValueType: CheckerTypeReference | null;
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
      const typeReason = targetToSourceStrictnessReason(
        input.targetToSourceAssignable,
        input.targetToSourceValueType,
        input.sourceAssignmentValueType,
      );
      return typeReason == null
        ? { kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignable, reason: null, reasonKinds: [] }
        : {
          kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness,
          reason: typeReason.reason,
          reasonKinds: [typeReason.kind],
      };
    }
    case SourceWriteCapabilityKind.TypeScriptStrictness: {
      const typeReason = targetToSourceStrictnessReason(
        input.targetToSourceAssignable,
        input.targetToSourceValueType,
        input.sourceAssignmentValueType,
      );
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
  targetToSourceValueType: CheckerTypeReference | null,
  sourceAssignmentValueType: CheckerTypeReference | null,
): { readonly kind: RuntimeBindingDataFlowSourceAssignmentReasonKind; readonly reason: string } | null {
  return targetToSourceAssignable === false
    ? {
      kind: RuntimeBindingDataFlowSourceAssignmentReasonKind.TargetToSourceTypeMismatch,
      reason: `TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (${typeDisplay(targetToSourceValueType)} -> ${typeDisplay(sourceAssignmentValueType)}); Aurelia runtime still passes the observer value to astAssign.`,
    }
    : null;
}

function typeIncludesNullish(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  return type.isUnion()
    ? type.types.some((constituent) => checkerNullishType(checker, constituent))
    : checkerNullishType(checker, type);
}

function typeDisplay(reference: CheckerTypeReference | null): string {
  return reference?.display ?? 'unknown';
}

function combineDynamicCheckedAssignment(
  booleanAssignable: boolean | null,
  mutationAssignable: boolean | null,
): boolean | null {
  if (booleanAssignable === false || mutationAssignable === false) {
    return false;
  }
  if (booleanAssignable == null || mutationAssignable == null) {
    return null;
  }
  return true;
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

function valueChannelMutatesCollection(valueChannel: RuntimeBindingValueChannel | null): boolean {
  return valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedCollectionMembership
    || valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean
    || valueChannel?.channelKind === RuntimeBindingValueChannelKind.SelectMultipleOptionValues;
}

function valueChannelHasCoupling(
  valueChannel: RuntimeBindingValueChannel | null,
  coupling: RuntimeBindingValueChannelCouplingKind,
): boolean {
  return valueChannel?.observerCouplings.includes(coupling) === true;
}

function valueChannelUsesMapMutation(
  valueChannel: RuntimeBindingValueChannel | null,
  checker: ts.TypeChecker,
  sourceType: ts.Type,
): boolean {
  if (valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean) {
    return true;
  }
  return valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedDynamicModelValue
    && mapKeyTypeFor(checker, sourceType) != null
    && collectionElementTypeFor(checker, sourceType) == null;
}

function openSourceExpressionInfo(needsSourceWriteCapability: boolean): SourceExpressionInfo {
  return {
    sourceKind: RuntimeBindingDataFlowSourceKind.Open,
    sourceName: null,
    sourceRootName: null,
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
    sourceRootName: base.sourceRootName,
    sourceWriteCapability: base.sourceWriteCapability == null
      ? null
      : sourceWriteCapabilityOpen(
        'SpreadValueBinding source property assignment policy has not been projected from the spread source member.',
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SpreadSourceMemberPolicyOpen,
      ),
  };
}

function isSyntheticWritebackLocal(expression: AccessScopeExpression): boolean {
  return expression.ancestor === 0
    && expression.name.name.startsWith('$')
    && !isHostAccessScope(expression);
}

function isHostAccessScope(expression: AccessScopeExpression): boolean {
  return expression.ancestor === 0 && expression.name.name === '$host';
}

function sourceWriteCapabilityWritable(
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.Writable,
    checkerWritable: true,
    reason: null,
    reasonKind: null,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

function sourceWriteCapabilityTypeScriptStrictness(
  reason: string,
  checkerWritable: boolean | null,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.TypeScriptStrictness,
    checkerWritable,
    reason,
    reasonKind,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

function sourceWriteCapabilityRuntimeUnassignable(
  reason: string,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.RuntimeUnassignable,
    checkerWritable: false,
    reason,
    reasonKind,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

function sourceWriteCapabilityOpen(
  reason: string,
  reasonKind: RuntimeBindingDataFlowSourceAssignmentReasonKind,
  assignmentTargetType: CheckerTypeReference | null = null,
  assignmentTargetSourceAddressHandle: AddressHandle | null = null,
): SourceWriteCapability {
  return {
    capabilityKind: SourceWriteCapabilityKind.Open,
    checkerWritable: null,
    reason,
    reasonKind,
    assignmentTargetType,
    assignmentTargetSourceAddressHandle,
  };
}

function sourceWriteCapabilityForMemberAccess(
  access: CheckerTypeShapeMemberWriteAccess,
  ownerDisplay: string | null,
  assignmentTargetType: CheckerTypeReference | null,
): SourceWriteCapability {
  const sourceAddressHandle = access.sourceAddressHandle;
  switch (access.accessKind) {
    case CheckerTypeShapeMemberWriteAccessKind.Writable:
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexWritable:
      return sourceWriteCapabilityWritable(null, sourceAddressHandle);
    case CheckerTypeShapeMemberWriteAccessKind.MethodLike:
      return sourceWriteCapabilityRuntimeUnassignable(
        `Source member '${access.memberName}' is a ${access.memberKind ?? 'member'} and is not an Aurelia astAssign target.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberRuntimeUnassignable,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.GetterWithoutSetter:
      return sourceWriteCapabilityRuntimeUnassignable(
        `Source member '${access.memberName}' is a getter without a setter at runtime.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberGetterWithoutSetter,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.Readonly:
      return sourceWriteCapabilityTypeScriptStrictness(
        `Source member '${access.memberName}' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment.`,
        access.checkerWritable,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.StringIndexReadonly:
      return sourceWriteCapabilityTypeScriptStrictness(
        `Owner type '${ownerDisplay ?? 'unknown'}' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects.`,
        access.checkerWritable,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberReadonly,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.DeclarationMissing:
      return sourceWriteCapabilityOpen(
        `Source member '${access.memberName}' did not expose declarations for assignment policy.`,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.SourceMemberDeclarationMissing,
        null,
        sourceAddressHandle,
      );
    case CheckerTypeShapeMemberWriteAccessKind.Missing:
      return sourceWriteCapabilityTypeScriptStrictness(
        `Owner type '${ownerDisplay ?? 'unknown'}' did not project member '${access.memberName}'; Aurelia astAssign can still write to runtime objects.`,
        access.checkerWritable,
        RuntimeBindingDataFlowSourceAssignmentReasonKind.OwnerMemberNotProjected,
        assignmentTargetType,
        sourceAddressHandle,
      );
  }
}

function sourceWriteCapabilitySourceForOwnerEvaluation(
  evaluation: CheckerExpressionTypeEvaluation,
): AddressHandle | null {
  return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ? evaluation.sourceAddressHandle
    : evaluation.subject?.sourceAddressHandle
      ?? evaluation.partialTypeReference?.sourceAddressHandle
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
