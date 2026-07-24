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
} from '../kernel/vocabulary.js';
import {
  type CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  type CheckerExpressionTypeWorld,
} from '../type-system/expression-type-world.js';
import { ObservationProductDetails } from './product-details.js';
import {
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetOperationKind,
  RuntimeNodeObserverConfigFieldState,
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingSourceOperation,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingValueChannel,
  RuntimeBindingValueChannelTargetMutationKind,
} from './runtime-binding-observation.js';
import { runtimeBindingPrimitiveValueFromExpressionValue } from './runtime-binding-primitive-value.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { RuntimeExpressionResourcePlan } from '../template/runtime-expression-resource-plan.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import {
  instructionScopeLookup,
  isRuntimeValueChannelBinding,
} from './runtime-binding-expression.js';
import {
  RuntimeBindingExpressionScopeProjector,
} from './runtime-binding-expression-scope.js';
import {
  RuntimeBindingSourceExpressionContextProjector,
} from './runtime-binding-source-expression-context.js';
import {
  RuntimeBindingValueChannelDraftMaterializer,
  type BindingValueChannelDraftContext,
  type RuntimeBindingValueChannelDraft,
  type RuntimeValueChannelBinding,
} from './binding-value-channel-drafts.js';

export class RuntimeBindingValueChannelMaterializationRequest {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Runtime binding products produced by renderer dispatch. */
    readonly runtimeBindings: RuntimeRenderingEmission,
    /** Reached expression-resource effects that determine runtime source projection. */
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
    /** Controller.bind target-side products produced by binding-owned target setup. */
    readonly controllerBind: RuntimeControllerBindEmission,
    /** Runtime Scope applications visible to instruction-owned expressions. */
    readonly scopes: TemplateScopeConstructionEmission,
    /** Runtime-analysis expression world shared by scope, value-channel, and data-flow phases. */
    readonly expressionWorld: CheckerExpressionTypeWorld,
    /** Current TypeChecker epoch used by listener event maps and checker-backed value-channel refinements. */
    readonly typeSystem: TypeSystemProject | null = null,
  ) {}
}

export class RuntimeBindingValueChannelEmission {
  private readonly valueChannelsByBinding = new Map<ProductHandle, RuntimeBindingValueChannel[]>();

  constructor(
    /** Runtime binding value-channel products materialized for property, attribute, and interpolation bindings. */
    readonly valueChannels: readonly RuntimeBindingValueChannel[],
    /** Open observer/value-shape pressures encountered while creating channel products. */
    readonly openSeams: readonly OpenSeam[],
    /** Kernel records emitted for value-channel products, claims, provenance, and seams. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const valueChannel of valueChannels) {
      if (valueChannel.binding.productHandle == null) {
        continue;
      }
      let rows = this.valueChannelsByBinding.get(valueChannel.binding.productHandle);
      if (rows === undefined) {
        rows = [];
        this.valueChannelsByBinding.set(valueChannel.binding.productHandle, rows);
      }
      rows.push(valueChannel);
    }
  }

  readValueChannelsForBinding(productHandle: ProductHandle): readonly RuntimeBindingValueChannel[] {
    return this.valueChannelsByBinding.get(productHandle) ?? [];
  }
}

interface BindingValueChannelSourceSet {
  readonly records: readonly KernelStoreRecord[];
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
}

interface BindingValueChannelRecordEmission {
  readonly valueChannel: RuntimeBindingValueChannel;
  readonly openSeams: readonly OpenSeam[];
  readonly records: readonly KernelStoreRecord[];
}

interface BindingValueChannelOpenSeamEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly openSeams: readonly OpenSeam[];
}

type ValueChannelDraft = RuntimeBindingValueChannelDraft;

type BindingValueChannelContext = BindingValueChannelDraftContext;

type ValueChannelTarget = {
  readonly localSuffix: string;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
};

/** Materializes the value shape that sits between target-side runtime behavior and binding data flow. */
export class RuntimeBindingValueChannelMaterializer {
  constructor(
    /** Hot analysis store that receives binding value-channel products. */
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {}

  materialize(input: RuntimeBindingValueChannelMaterializationRequest): RuntimeBindingValueChannelEmission {
    const emission = this.recordsForValueChannels(input);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `binding-value-channel:${input.localKey}`),
      publishProductDetails(ObservationProductDetails.RuntimeBindingValueChannel, emission.valueChannels),
    ));
    return emission;
  }

  private recordsForValueChannels(input: RuntimeBindingValueChannelMaterializationRequest): RuntimeBindingValueChannelEmission {
    const records: KernelStoreRecord[] = [];
    const valueChannels: RuntimeBindingValueChannel[] = [];
    const openSeams: OpenSeam[] = [];
    const source = this.recordsForSource(input.localKey);
    records.push(...source.records);
    const instructionScopes = instructionScopeLookup(input.scopes.instructionScopes);
    const bindingExpressionScopes = new RuntimeBindingExpressionScopeProjector(
      this.store,
      input.expressionWorld,
      input.expressionResourcePlan,
    );
    const sourceExpressionContexts = new RuntimeBindingSourceExpressionContextProjector(
      input.runtimeBindings,
      instructionScopes,
      bindingExpressionScopes,
    );
    const channelDrafts = new RuntimeBindingValueChannelDraftMaterializer(
      this.store,
      input.expressionWorld.projector,
    );

    input.runtimeBindings.bindings.forEach((binding, index) => {
      const renderContext = input.runtimeBindings.requireRenderContextForBinding(binding.productHandle);
      for (const emission of this.recordsForBindingValueChannels(input, channelDrafts, source, {
        input: {
          runtimeBindings: input.runtimeBindings,
          controllerBind: input.controllerBind,
        },
        instructionScopes,
        sourceExpressionContexts,
        evaluator: input.expressionWorld.evaluator(renderContext.resourceScope),
        typeSystem: input.typeSystem,
      }, binding, index)) {
        records.push(...emission.records);
        openSeams.push(...emission.openSeams);
        valueChannels.push(emission.valueChannel);
      }
    });

    return new RuntimeBindingValueChannelEmission(valueChannels, openSeams, records);
  }

  private recordsForBindingValueChannels(
    input: RuntimeBindingValueChannelMaterializationRequest,
    channelDrafts: RuntimeBindingValueChannelDraftMaterializer,
    source: BindingValueChannelSourceSet,
    context: BindingValueChannelContext,
    binding: RuntimeBinding,
    bindingIndex: number,
  ): readonly BindingValueChannelRecordEmission[] {
    if (!isRuntimeValueChannelBinding(binding)) {
      return [];
    }
    const targetAccesses = input.controllerBind.readTargetAccessesForBinding(binding.productHandle);
    const targetOperations = input.controllerBind.readTargetOperationsForBinding(binding.productHandle);
    const sourceOperations = input.controllerBind.readSourceOperationsForBinding(binding.productHandle);
    const targets = valueChannelTargetsForBinding(binding, targetAccesses, targetOperations, sourceOperations);
    return targets.map((target) =>
      this.recordsForValueChannel(input, channelDrafts, source, context, binding, bindingIndex, target)
    );
  }

  private recordsForValueChannel(
    input: RuntimeBindingValueChannelMaterializationRequest,
    channelDrafts: RuntimeBindingValueChannelDraftMaterializer,
    source: BindingValueChannelSourceSet,
    context: BindingValueChannelContext,
    binding: RuntimeValueChannelBinding,
    bindingIndex: number,
    target: ValueChannelTarget,
  ): BindingValueChannelRecordEmission {
    const local = `${input.localKey}:binding:${bindingIndex}:${binding.productHandle}:value-channel${target.localSuffix}`;
    const draft = channelDrafts.valueChannelDraftForBinding(
      local,
      binding,
      target.targetAccess,
      target.targetOperation,
      target.sourceOperation,
      context,
    );
    const valueChannel = this.valueChannelForTarget(local, binding, target, draft);
    const claim = this.valueChannelClaim(local, binding, valueChannel, source);
    const open = this.openSeamForValueChannel(local, valueChannel, binding, source);
    return {
      valueChannel,
      openSeams: open.openSeams,
      records: [
        ...open.records,
        ...this.valueChannelRecords(local, binding, target, valueChannel, claim, open.openSeams, source),
      ],
    };
  }

  private valueChannelClaim(
    local: string,
    binding: RuntimeValueChannelBinding,
    valueChannel: RuntimeBindingValueChannel,
    source: BindingValueChannelSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-uses-value-channel`),
      binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesValueChannel.key,
      valueChannel.productHandle,
      source.provenanceHandle,
    );
  }

  private openSeamForValueChannel(
    local: string,
    valueChannel: RuntimeBindingValueChannel,
    binding: RuntimeValueChannelBinding,
    source: BindingValueChannelSourceSet,
  ): BindingValueChannelOpenSeamEmission {
    if (valueChannel.openReason == null) {
      return { records: [], openSeams: [] };
    }
    const seam = new OpenSeam(
      this.store.handles.openSeam(`${local}:open-value-channel`),
      KernelVocabulary.Binding.OpenValueChannel.key,
      valueChannel.openReason,
      binding.sourceAddressHandle,
      source.evidenceHandle,
      valueChannel.openReasonKinds,
    );
    return { records: [seam], openSeams: [seam] };
  }

  private valueChannelForTarget(
    local: string,
    binding: RuntimeValueChannelBinding,
    target: ValueChannelTarget,
    draft: ValueChannelDraft,
  ): RuntimeBindingValueChannel {
    const targetMutationKind = valueChannelTargetMutationKind(target);
    const nullishDefault = valueAttributeNullishDefault(target.targetAccess);
    return new RuntimeBindingValueChannel(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      binding.toReference(),
      target.targetAccess?.toReference() ?? null,
      target.targetOperation?.toReference() ?? null,
      target.sourceOperation?.toReference() ?? null,
      draft.channelKind,
      draft.authority,
      targetMutationKind,
      nullishDefault.value,
      nullishDefault.state,
      target.targetAccess?.propertyType ?? null,
      draft.runtimeValueType,
      draft.valueDomain,
      draft.primitiveValueDomain ?? [],
      draft.isCollection,
      draft.usesCustomMatcher ?? false,
      draft.observerCouplings ?? [],
      draft.openReason,
      draft.openReasonKinds ?? [],
      binding.sourceAddressHandle,
    );
  }

  private valueChannelRecords(
    local: string,
    binding: RuntimeValueChannelBinding,
    target: ValueChannelTarget,
    valueChannel: RuntimeBindingValueChannel,
    claim: SemanticClaim,
    openSeams: readonly OpenSeam[],
    source: BindingValueChannelSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        valueChannel.identityHandle,
        KernelVocabulary.Binding.ValueChannel.key,
        binding.identityHandle,
        binding.sourceAddressHandle,
        `${valueChannel.channelKind}:${target.targetAccess?.targetProperty ?? binding.target}`,
      ),
      new MaterializedProduct(
        valueChannel.productHandle,
        KernelVocabulary.Binding.ValueChannel.key,
        valueChannel.identityHandle,
        binding.sourceAddressHandle,
        source.provenanceHandle,
      ),
      claim,
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:binding-value-channel`),
        valueChannel.identityHandle,
        [valueChannel.productHandle],
        [claim.handle],
        openSeams.map((seam) => seam.handle),
      ),
    ];
  }

  private recordsForSource(local: string): BindingValueChannelSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-value-channel:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-value-channel:${local}`);
    return {
      records: [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Binding value-channel emulation from target-side products and observer-specific runtime value semantics.',
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

function valueChannelTargetMutationKind(
  target: ValueChannelTarget,
): RuntimeBindingValueChannelTargetMutationKind {
  const targetAccess = target.targetAccess;
  if (targetAccess != null) {
    if (targetAccess.strategy === RuntimeBindingTargetAccessStrategy.ValueAttributeObserver) {
      const config = targetAccess.nodeObserverConfig;
      if (config == null || config.fieldState('readonly') === RuntimeNodeObserverConfigFieldState.Open) {
        return RuntimeBindingValueChannelTargetMutationKind.Open;
      }
      return config.readonlyValue === true
        ? RuntimeBindingValueChannelTargetMutationKind.SuppressesTargetWrite
        : RuntimeBindingValueChannelTargetMutationKind.WritesTarget;
    }
    return targetAccess.strategy === RuntimeBindingTargetAccessStrategy.CustomNodeObserver
      || targetAccess.strategy === RuntimeBindingTargetAccessStrategy.Unknown
      ? RuntimeBindingValueChannelTargetMutationKind.Open
      : RuntimeBindingValueChannelTargetMutationKind.WritesTarget;
  }
  if (target.targetOperation != null) {
    return target.targetOperation.operationKind === RuntimeBindingTargetOperationKind.EventListenerAdd
      ? RuntimeBindingValueChannelTargetMutationKind.NoTargetWrite
      : RuntimeBindingValueChannelTargetMutationKind.WritesTarget;
  }
  return target.sourceOperation != null
    ? RuntimeBindingValueChannelTargetMutationKind.NoTargetWrite
    : RuntimeBindingValueChannelTargetMutationKind.Open;
}

function valueAttributeNullishDefault(
  targetAccess: RuntimeBindingTargetAccess | null,
): {
  readonly value: RuntimeBindingValueChannel['nullishDefault'];
  readonly state: RuntimeBindingValueChannel['nullishDefaultState'];
} {
  if (targetAccess?.strategy !== RuntimeBindingTargetAccessStrategy.ValueAttributeObserver) {
    return { value: null, state: null };
  }
  const config = targetAccess.nodeObserverConfig;
  if (config == null) {
    return { value: null, state: RuntimeNodeObserverConfigFieldState.Open };
  }
  const state = config.fieldState('default');
  return {
    value: state === RuntimeNodeObserverConfigFieldState.Open
      ? null
      : runtimeBindingPrimitiveValueFromExpressionValue(config.defaultValue),
    state,
  };
}

function valueChannelTargetsForBinding(
  binding: RuntimeValueChannelBinding,
  targetAccesses: readonly RuntimeBindingTargetAccess[],
  targetOperations: readonly RuntimeBindingTargetOperation[],
  sourceOperations: readonly RuntimeBindingSourceOperation[],
): readonly ValueChannelTarget[] {
  if (binding instanceof SpreadValueBinding && targetAccesses.length > 0) {
    return targetAccesses.map((targetAccess, index) => ({
      localSuffix: `:${index}:${targetAccess.targetProperty}`,
      targetAccess,
      targetOperation: null,
      sourceOperation: null,
    }));
  }
  return [{
    localSuffix: '',
    targetAccess: targetAccesses[0] ?? null,
    targetOperation: targetOperations[0] ?? null,
    sourceOperation: sourceOperations[0] ?? null,
  }];
}
