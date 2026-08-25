import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
  type OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import {
  aggregateFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStoreReadView,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ClaimPredicateKey,
  type OpenSeamKindKey,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import type {
  ObserverLocatorLookupResult,
} from '../observation/observer-locator.js';
import type {
  RuntimeOperationReachability,
} from '../runtime-expression/runtime-operation.js';
import {
  RuntimeBindingSourceOperation,
  RuntimeBindingSourceOperationAuthority,
  type RuntimeBindingSourceOperationRequest,
  type RuntimeBindingTarget,
  RuntimeBindingTargetAccess,
  type RuntimeBindingTargetAccessField,
  type RuntimeBindingTargetAccessProvenance,
  type RuntimeBindingTargetAccessRequest,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetOperation,
  RuntimeBindingTargetOperationAuthority,
  type RuntimeBindingTargetOperationKind,
  type RuntimeBindingTargetOperationRequest,
  RuntimeTargetOperationOwnerKind,
} from './runtime-binding.js';

export class RuntimeControllerBindSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class RuntimeControllerBindProductHandles {
  constructor(
    readonly local: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

export class RuntimeControllerBindProductPublication<TProduct> {
  constructor(
    readonly local: string,
    readonly product: TProduct,
    readonly claim: SemanticClaim,
    readonly records: readonly KernelStoreRecord[],
  ) {}

  appendTo(
    records: KernelStoreRecord[],
    claims: SemanticClaim[],
    products: TProduct[],
  ): void {
    claims.push(this.claim);
    products.push(this.product);
    records.push(...this.records);
  }
}

class RuntimeBindingTargetAccessProvenancePublication {
  constructor(
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingTargetAccessField>[],
    readonly records: readonly ProvenanceRecord[],
  ) {}
}

export class RuntimeBindingSourceOperationTarget {
  constructor(
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetNode: RuntimeBindingSourceOperation['targetNode'],
    readonly targetControllerProductHandle: ProductHandle | null,
    readonly targetType: RuntimeBindingSourceOperation['targetType'],
    readonly openReason: string | null,
  ) {}

  static open(openReason: string): RuntimeBindingSourceOperationTarget {
    return new RuntimeBindingSourceOperationTarget(
      RuntimeBindingTargetKind.Unknown,
      null,
      null,
      null,
      openReason,
    );
  }
}

export class RuntimeControllerBindPublisher {
  constructor(
    private readonly store: KernelStoreReadView,
  ) {}

  recordsForSource(local: string): RuntimeControllerBindSourceSet {
    const evidenceHandle = this.store.handles.evidence(`runtime-controller-bind:${local}`);
    const provenanceHandle = this.store.handles.provenance(`runtime-controller-bind:${local}`);
    return new RuntimeControllerBindSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime Controller.bind materialization from rendered controller bindings and binding-owned target semantics.',
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

  recordOpenSeam(
    local: string,
    summary: string,
    addressHandle: AddressHandle | null,
    source: RuntimeControllerBindSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Binding.OpenTargetAccess.key,
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

  targetAccessPublication(
    local: string,
    request: RuntimeBindingTargetAccessRequest,
    target: RuntimeBindingTarget,
    lookup: ObserverLocatorLookupResult,
    bindReachability: RuntimeOperationReachability,
    source: RuntimeControllerBindSourceSet,
    openSeamHandles: readonly OpenSeamHandle[],
  ): RuntimeControllerBindProductPublication<RuntimeBindingTargetAccess> {
    const handles = this.productHandles(local);
    const provenance = this.targetAccessProvenancePublication(handles.local, lookup.selectionProvenance);
    const access = this.targetAccessProduct(
      handles,
      request,
      target,
      lookup,
      bindReachability,
      provenance.fieldProvenance,
    );
    const claim = this.runtimeBindingProductClaim(
      `${handles.local}:runtime-binding-uses-target-access`,
      request.binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesTargetAccess.key,
      handles.productHandle,
      source,
    );
    const records = [
      ...provenance.records,
      ...this.runtimeBindingProductRecords(
        handles,
        KernelVocabulary.Binding.TargetAccess.key,
        request.binding.identityHandle,
        request.sourceAddressHandle,
        source,
        `${request.lookup}:${target.targetKind}:${request.targetProperty}`,
        'target-access',
        claim,
        openSeamHandles,
      ),
    ];
    return new RuntimeControllerBindProductPublication(handles.local, access, claim, records);
  }

  targetOperationPublication(
    local: string,
    request: RuntimeBindingTargetOperationRequest,
    target: RuntimeBindingTarget,
    operationKind: RuntimeBindingTargetOperationKind,
    openReason: string | null,
    reachability: RuntimeOperationReachability,
    source: RuntimeControllerBindSourceSet,
    openSeamHandles: readonly OpenSeamHandle[],
  ): RuntimeControllerBindProductPublication<RuntimeBindingTargetOperation> {
    const handles = this.productHandles(local);
    const operation = this.targetOperationProduct(
      handles,
      request,
      target,
      operationKind,
      openReason,
      reachability,
    );
    const claim = this.runtimeBindingProductClaim(
      `${handles.local}:runtime-binding-uses-target-operation`,
      request.binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesTargetOperation.key,
      handles.productHandle,
      source,
    );
    const records = this.runtimeBindingProductRecords(
      handles,
      KernelVocabulary.Binding.TargetOperation.key,
      request.binding.identityHandle,
      request.sourceAddressHandle,
      source,
      `${operationKind}:${target.targetKind}:${request.targetAttribute}:${request.targetProperty}`,
      'target-operation',
      claim,
      openSeamHandles,
    );
    return new RuntimeControllerBindProductPublication(handles.local, operation, claim, records);
  }

  sourceOperationPublication(
    local: string,
    request: RuntimeBindingSourceOperationRequest,
    target: RuntimeBindingSourceOperationTarget,
    operationKind: RuntimeBindingSourceOperation['operationKind'],
    openReason: string | null,
    reachability: RuntimeOperationReachability,
    source: RuntimeControllerBindSourceSet,
    openSeamHandles: readonly OpenSeamHandle[],
  ): RuntimeControllerBindProductPublication<RuntimeBindingSourceOperation> {
    const handles = this.productHandles(local);
    const operation = this.sourceOperationProduct(
      handles,
      request,
      target,
      operationKind,
      openReason,
      reachability,
    );
    const claim = this.runtimeBindingProductClaim(
      `${handles.local}:runtime-binding-uses-source-operation`,
      request.binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesSourceOperation.key,
      handles.productHandle,
      source,
    );
    const records = this.runtimeBindingProductRecords(
      handles,
      KernelVocabulary.Binding.SourceOperation.key,
      request.binding.identityHandle,
      request.sourceAddressHandle,
      source,
      `${operationKind}:${target.targetKind}:${request.targetName}`,
      'source-operation',
      claim,
      openSeamHandles,
    );
    return new RuntimeControllerBindProductPublication(handles.local, operation, claim, records);
  }

  private productHandles(local: string): RuntimeControllerBindProductHandles {
    return new RuntimeControllerBindProductHandles(
      local,
      this.store.handles.product(local),
      this.store.handles.identity(local),
    );
  }

  private targetAccessProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingTargetAccessRequest,
    target: RuntimeBindingTarget,
    lookup: ObserverLocatorLookupResult,
    bindReachability: RuntimeOperationReachability,
    fieldProvenance: readonly FieldProvenance<RuntimeBindingTargetAccessField>[],
  ): RuntimeBindingTargetAccess {
    return new RuntimeBindingTargetAccess(
      handles.productHandle,
      handles.identityHandle,
      request.binding.toReference(),
      request.lookup,
      lookup.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetProperty,
      lookup.strategy,
      lookup.fallbackStrategy,
      lookup.observerCacheDisposition,
      lookup.supportsCallback,
      lookup.supportsCoercer,
      lookup.observerSourceProductHandle,
      lookup.observerSourceIdentityHandle,
      lookup.observerSourceAddressHandle,
      lookup.objectObservationAdapters,
      lookup.controllerObserverSetupOutcome,
      bindReachability,
      lookup.nodeObserverConfig,
      lookup.targetType,
      lookup.targetTypeSource,
      lookup.propertyType,
      lookup.propertyExists,
      lookup.isWritable,
      lookup.isObservable,
      lookup.authority,
      lookup.openReason,
      lookup.frameworkErrorCode,
      lookup.diagnosticReason,
      request.sourceAddressHandle,
      lookup.selectionProvenance,
      fieldProvenance,
    );
  }

  private targetAccessProvenancePublication(
    local: string,
    provenance: RuntimeBindingTargetAccessProvenance,
  ): RuntimeBindingTargetAccessProvenancePublication {
    const fieldProvenance: FieldProvenance<RuntimeBindingTargetAccessField>[] = [];
    const records: ProvenanceRecord[] = [];

    const attach = (
      fields: readonly RuntimeBindingTargetAccessField[],
      causes: readonly ProvenanceHandle[],
      lane: string,
    ): void => {
      const firstField = fields[0];
      if (firstField == null) {
        return;
      }
      const aggregation = aggregateFieldProvenance(
        firstField,
        causes,
        this.store.handles.provenance(`${local}:selection:${lane}`),
        (handle) => {
          const record = this.store.read(handle);
          return record instanceof ProvenanceRecord ? record : null;
        },
      );
      if (aggregation.fieldProvenance == null) {
        return;
      }
      fieldProvenance.push(aggregation.fieldProvenance);
      for (const field of fields.slice(1)) {
        fieldProvenance.push(new FieldProvenance(
          field,
          aggregation.fieldProvenance.provenanceHandle,
        ));
      }
      records.push(...aggregation.records);
    };

    attach(
      ['strategy', 'fallbackStrategy', 'observerCacheDisposition'],
      provenance.selectionDecisionHandles(),
      'decision',
    );
    attach(['observerSource'], provenance.observerSource, 'observer-source');
    attach(['objectObservationAdapters'], provenance.objectObservationAdapters, 'object-adapters');
    attach(['controllerObserverSetup'], provenance.controllerObserverSetup, 'controller-setup');

    return new RuntimeBindingTargetAccessProvenancePublication(fieldProvenance, records);
  }

  private targetOperationProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingTargetOperationRequest,
    target: RuntimeBindingTarget,
    operationKind: RuntimeBindingTargetOperationKind,
    openReason: string | null,
    reachability: RuntimeOperationReachability,
  ): RuntimeBindingTargetOperation {
    return new RuntimeBindingTargetOperation(
      handles.productHandle,
      handles.identityHandle,
      RuntimeTargetOperationOwnerKind.RuntimeBinding,
      request.binding.toReference(),
      null,
      request.binding.instructionProductHandle,
      target.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetAttribute,
      request.targetProperty,
      null,
      operationKind,
      request.affectedNames,
      reachability,
      this.targetOperationAuthority(openReason),
      openReason,
      request.sourceAddressHandle,
    );
  }

  private sourceOperationProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingSourceOperationRequest,
    target: RuntimeBindingSourceOperationTarget,
    operationKind: RuntimeBindingSourceOperation['operationKind'],
    openReason: string | null,
    reachability: RuntimeOperationReachability,
  ): RuntimeBindingSourceOperation {
    return new RuntimeBindingSourceOperation(
      handles.productHandle,
      handles.identityHandle,
      request.binding.toReference(),
      request.binding.instructionProductHandle,
      target.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetName,
      target.targetType,
      operationKind,
      reachability,
      this.sourceOperationAuthority(openReason),
      openReason,
      request.sourceAddressHandle,
    );
  }

  private runtimeBindingProductClaim(
    local: string,
    bindingProductHandle: ProductHandle,
    predicateKey: ClaimPredicateKey,
    productHandle: ProductHandle,
    source: RuntimeControllerBindSourceSet,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(local),
      bindingProductHandle,
      predicateKey,
      productHandle,
      source.provenanceHandle,
    );
  }

  private runtimeBindingProductRecords(
    handles: RuntimeControllerBindProductHandles,
    productKindKey: ProductKindKey,
    parentIdentityHandle: IdentityHandle,
    sourceAddressHandle: AddressHandle | null,
    source: RuntimeControllerBindSourceSet,
    identityValue: string,
    materializationSlot: string,
    claim: SemanticClaim,
    openSeamHandles: readonly OpenSeamHandle[],
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        handles.identityHandle,
        productKindKey,
        parentIdentityHandle,
        sourceAddressHandle,
        identityValue,
      ),
      new MaterializedProduct(
        handles.productHandle,
        productKindKey,
        handles.identityHandle,
        sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`${handles.local}:${materializationSlot}`),
        handles.identityHandle,
        [handles.productHandle],
        [claim.handle],
        openSeamHandles,
      ),
    ];
  }

  private targetOperationAuthority(openReason: string | null): RuntimeBindingTargetOperationAuthority {
    return openReason == null
      ? RuntimeBindingTargetOperationAuthority.RuntimeBindingImplementation
      : RuntimeBindingTargetOperationAuthority.Open;
  }

  private sourceOperationAuthority(openReason: string | null): RuntimeBindingSourceOperationAuthority {
    return openReason == null
      ? RuntimeBindingSourceOperationAuthority.RuntimeBindingImplementation
      : RuntimeBindingSourceOperationAuthority.Open;
  }
}
