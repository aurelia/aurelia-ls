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
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { OpenSeam } from '../kernel/open-seam.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
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
import {
  RuntimeBindingSourceOperation,
  RuntimeBindingSourceOperationAuthority,
  type RuntimeBindingSourceOperationRequest,
  RuntimeBindingTarget,
  RuntimeBindingTargetAccess,
  type RuntimeBindingTargetAccessRequest,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetOperation,
  RuntimeBindingTargetOperationAuthority,
  RuntimeBindingTargetOperationKind,
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
    private readonly store: KernelStore,
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
  ): void {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
    );
    openSeams.push(seam);
    records.push(seam);
  }

  targetAccessPublication(
    local: string,
    request: RuntimeBindingTargetAccessRequest,
    target: RuntimeBindingTarget,
    lookup: ObserverLocatorLookupResult,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeControllerBindProductPublication<RuntimeBindingTargetAccess> {
    const handles = this.productHandles(local);
    const access = this.targetAccessProduct(handles, request, target, lookup);
    const claim = this.runtimeBindingProductClaim(
      `${handles.local}:runtime-binding-uses-target-access`,
      request.binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesTargetAccess.key,
      handles.productHandle,
      source,
    );
    const records = this.runtimeBindingProductRecords(
      handles,
      KernelVocabulary.Binding.TargetAccess.key,
      request.binding.identityHandle,
      request.binding.sourceAddressHandle,
      source,
      `${request.lookup}:${target.targetKind}:${request.targetProperty}`,
      'target-access',
      claim,
    );
    return new RuntimeControllerBindProductPublication(handles.local, access, claim, records);
  }

  targetOperationPublication(
    local: string,
    request: RuntimeBindingTargetOperationRequest,
    target: RuntimeBindingTarget,
    operationKind: RuntimeBindingTargetOperationKind,
    openReason: string | null,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeControllerBindProductPublication<RuntimeBindingTargetOperation> {
    const handles = this.productHandles(local);
    const operation = this.targetOperationProduct(handles, request, target, operationKind, openReason);
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
      request.binding.sourceAddressHandle,
      source,
      `${operationKind}:${target.targetKind}:${request.targetAttribute}:${request.targetProperty}`,
      'target-operation',
      claim,
    );
    return new RuntimeControllerBindProductPublication(handles.local, operation, claim, records);
  }

  sourceOperationPublication(
    local: string,
    request: RuntimeBindingSourceOperationRequest,
    target: RuntimeBindingSourceOperationTarget,
    operationKind: RuntimeBindingSourceOperation['operationKind'],
    openReason: string | null,
    source: RuntimeControllerBindSourceSet,
  ): RuntimeControllerBindProductPublication<RuntimeBindingSourceOperation> {
    const handles = this.productHandles(local);
    const operation = this.sourceOperationProduct(handles, request, target, operationKind, openReason);
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
      request.binding.sourceAddressHandle,
      source,
      `${operationKind}:${target.targetKind}:${request.targetName}`,
      'source-operation',
      claim,
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
      lookup.eventNames,
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
      request.binding.sourceAddressHandle,
    );
  }

  private targetOperationProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingTargetOperationRequest,
    target: RuntimeBindingTarget,
    operationKind: RuntimeBindingTargetOperationKind,
    openReason: string | null,
  ): RuntimeBindingTargetOperation {
    return new RuntimeBindingTargetOperation(
      handles.productHandle,
      handles.identityHandle,
      RuntimeTargetOperationOwnerKind.RuntimeBinding,
      request.binding.toReference(),
      null,
      request.binding.instructionProductHandle,
      request.binding.instructionIdentityHandle,
      target.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetAttribute,
      request.targetProperty,
      null,
      operationKind,
      request.affectedNames,
      this.targetOperationAuthority(openReason),
      openReason,
      request.binding.sourceAddressHandle,
    );
  }

  private sourceOperationProduct(
    handles: RuntimeControllerBindProductHandles,
    request: RuntimeBindingSourceOperationRequest,
    target: RuntimeBindingSourceOperationTarget,
    operationKind: RuntimeBindingSourceOperation['operationKind'],
    openReason: string | null,
  ): RuntimeBindingSourceOperation {
    return new RuntimeBindingSourceOperation(
      handles.productHandle,
      handles.identityHandle,
      request.binding.toReference(),
      request.binding.instructionProductHandle,
      request.binding.instructionIdentityHandle,
      target.targetKind,
      target.targetNode,
      target.targetControllerProductHandle,
      request.targetName,
      target.targetType,
      operationKind,
      this.sourceOperationAuthority(openReason),
      openReason,
      request.binding.sourceAddressHandle,
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
