import type { SemanticAddress } from './address.js';
import type { SemanticClaim } from './claim.js';
import type { SemanticIdentity } from './identity.js';
import type { MaterializationRecord, MaterializedProduct } from './materialization.js';
import type { ClaimPredicateKey, ProductKindKey } from './vocabulary.js';
import {
  KernelClaimEndpointKind,
  KernelVocabularySlot,
  readClaimPredicateDefinition,
  readKernelVocabularyDefinition,
} from './vocabulary.js';
import type {
  AddressHandle,
  ClaimHandle,
  DerivationEdgeHandle,
  DerivationHandle,
  DerivationRuleHandle,
  EvidenceHandle,
  KernelRecordHandle,
  MaterializationHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
  IdentityHandle,
} from './handles.js';
import { KernelHandleFactory } from './handles.js';
import type { EvidenceRecord, EvidenceSet } from './evidence.js';
import type { ProvenanceRecord } from './provenance.js';
import type {
  DerivationEdge,
  DerivationRecord,
  DerivationRule,
  OpenSeam,
} from './derivation.js';

interface KernelStoreCommitIndex {
  readonly addresses: ReadonlyMap<AddressHandle, SemanticAddress>;
  readonly identities: ReadonlyMap<IdentityHandle, SemanticIdentity>;
  readonly products: ReadonlyMap<ProductHandle, MaterializedProduct>;
}

/** Any handle-bearing record admitted into the hot kernel store; not a semantic taxonomy. */
export type KernelStoreRecord =
  | SemanticAddress
  | SemanticIdentity
  | EvidenceRecord
  | EvidenceSet
  | ProvenanceRecord
  | SemanticClaim
  | DerivationEdge
  | DerivationRule
  | DerivationRecord
  | OpenSeam
  | MaterializedProduct
  | MaterializationRecord;

/** Coherent producer emission unit for the hot kernel store. */
export class KernelStoreBatch {
  constructor(
    /** Normalized records emitted together by one producer step. */
    readonly records: readonly KernelStoreRecord[] = [],
    /** Optional non-semantic label for debugging and inquiry traces. */
    readonly label: string | null = null,
  ) {}
}

function addToSet<TKey, TValue>(
  map: Map<TKey, Set<TValue>>,
  key: TKey,
  value: TValue,
): void {
  let values = map.get(key);
  if (values === undefined) {
    values = new Set();
    map.set(key, values);
  }
  values.add(value);
}

function readSet<TKey, TValue>(
  map: ReadonlyMap<TKey, ReadonlySet<TValue>>,
  key: TKey,
): readonly TValue[] {
  return [...(map.get(key) ?? [])];
}

/**
 * Hot in-memory analysis store for normalized kernel records and handle expansion.
 *
 * The store owns record identity, graph navigation, and vocabulary validation.
 * It does not currently own rich product-detail objects. Producers may carry
 * those objects in emissions while assembling the hot world, but durable
 * product expansion needs a typed layer rather than generic store payloads.
 */
export class KernelStore {
  readonly handles: KernelHandleFactory;
  private readonly records = new Map<KernelRecordHandle, KernelStoreRecord>();
  private readonly addresses = new Map<AddressHandle, SemanticAddress>();
  private readonly identities = new Map<IdentityHandle, SemanticIdentity>();
  private readonly evidence = new Map<EvidenceHandle, EvidenceRecord | EvidenceSet>();
  private readonly provenance = new Map<ProvenanceHandle, ProvenanceRecord>();
  private readonly claims = new Map<ClaimHandle, SemanticClaim>();
  private readonly derivationEdges = new Map<DerivationEdgeHandle, DerivationEdge>();
  private readonly derivationRules = new Map<DerivationRuleHandle, DerivationRule>();
  private readonly derivations = new Map<DerivationHandle, DerivationRecord>();
  private readonly openSeams = new Map<OpenSeamHandle, OpenSeam>();
  private readonly products = new Map<ProductHandle, MaterializedProduct>();
  private readonly materializations = new Map<MaterializationHandle, MaterializationRecord>();
  private readonly productsByKind = new Map<ProductKindKey, Set<ProductHandle>>();
  private readonly evidenceByAddress = new Map<AddressHandle, Set<EvidenceHandle>>();
  private readonly evidenceByIdentity = new Map<IdentityHandle, Set<EvidenceHandle>>();
  private readonly provenanceByEvidence = new Map<EvidenceHandle, Set<ProvenanceHandle>>();
  private readonly claimsBySubject = new Map<AddressHandle | IdentityHandle | ProductHandle, Set<ClaimHandle>>();
  private readonly claimsByObject = new Map<AddressHandle | IdentityHandle | ProductHandle, Set<ClaimHandle>>();
  private readonly claimsByPredicate = new Map<ClaimPredicateKey, Set<ClaimHandle>>();

  constructor(
    /** Human-readable key for the active analysis store; not a persistence authority. */
    storeKey: string,
  ) {
    this.handles = new KernelHandleFactory(storeKey);
  }

  /** Add a normalized kernel record and update cheap navigation indexes. */
  private add<TRecord extends KernelStoreRecord>(record: TRecord): TRecord {
    if (this.records.has(record.handle as KernelRecordHandle)) {
      throw new Error(`Duplicate kernel record handle in store: ${record.handle}`);
    }
    this.records.set(record.handle as KernelRecordHandle, record);
    this.indexRecord(record);
    return record;
  }

  /** Commit one producer batch atomically enough to prevent duplicate handles before indexing. */
  commit(batch: KernelStoreBatch): void {
    const batchLabel = batch.label ?? '(unnamed batch)';
    const batchHandles = new Set<KernelRecordHandle>();
    const pending = this.buildCommitIndex(batch.records);
    for (const record of batch.records) {
      const handle = record.handle as KernelRecordHandle;
      if (batchHandles.has(handle)) {
        throw new Error(`Duplicate kernel record handle within ${batchLabel}: ${record.handle}`);
      }
      batchHandles.add(handle);
      if (this.records.has(handle)) {
        throw new Error(`Duplicate kernel record handle in store while committing ${batchLabel}: ${record.handle}`);
      }
    }
    this.validateBatch(batch, pending, batchLabel);

    for (const record of batch.records) {
      this.add(record);
    }
  }

  /** Expand any handle-bearing record by store-local handle. */
  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    return this.records.get(handle) ?? null;
  }

  readAddress(handle: AddressHandle): SemanticAddress | null {
    return this.addresses.get(handle) ?? null;
  }

  readIdentity(handle: IdentityHandle): SemanticIdentity | null {
    return this.identities.get(handle) ?? null;
  }

  readEvidence(handle: EvidenceHandle): EvidenceRecord | EvidenceSet | null {
    return this.evidence.get(handle) ?? null;
  }

  readProvenance(handle: ProvenanceHandle): ProvenanceRecord | null {
    return this.provenance.get(handle) ?? null;
  }

  readClaim(handle: ClaimHandle): SemanticClaim | null {
    return this.claims.get(handle) ?? null;
  }

  readDerivationEdge(handle: DerivationEdgeHandle): DerivationEdge | null {
    return this.derivationEdges.get(handle) ?? null;
  }

  readDerivationRule(handle: DerivationRuleHandle): DerivationRule | null {
    return this.derivationRules.get(handle) ?? null;
  }

  readDerivation(handle: DerivationHandle): DerivationRecord | null {
    return this.derivations.get(handle) ?? null;
  }

  readOpenSeam(handle: OpenSeamHandle): OpenSeam | null {
    return this.openSeams.get(handle) ?? null;
  }

  readProduct(handle: ProductHandle): MaterializedProduct | null {
    return this.products.get(handle) ?? null;
  }

  readMaterialization(handle: MaterializationHandle): MaterializationRecord | null {
    return this.materializations.get(handle) ?? null;
  }

  readAllRecords(): readonly KernelStoreRecord[] {
    return [...this.records.values()];
  }

  readAddresses(): readonly SemanticAddress[] {
    return [...this.addresses.values()];
  }

  readIdentities(): readonly SemanticIdentity[] {
    return [...this.identities.values()];
  }

  readClaims(): readonly SemanticClaim[] {
    return [...this.claims.values()];
  }

  readEvidenceRecords(): readonly (EvidenceRecord | EvidenceSet)[] {
    return [...this.evidence.values()];
  }

  readProvenanceRecords(): readonly ProvenanceRecord[] {
    return [...this.provenance.values()];
  }

  readDerivationEdges(): readonly DerivationEdge[] {
    return [...this.derivationEdges.values()];
  }

  readDerivationRules(): readonly DerivationRule[] {
    return [...this.derivationRules.values()];
  }

  readDerivations(): readonly DerivationRecord[] {
    return [...this.derivations.values()];
  }

  readOpenSeams(): readonly OpenSeam[] {
    return [...this.openSeams.values()];
  }

  readProducts(): readonly MaterializedProduct[] {
    return [...this.products.values()];
  }

  readProductsByKind(productKindKey: ProductKindKey): readonly ProductHandle[] {
    return readSet(this.productsByKind, productKindKey);
  }

  readMaterializations(): readonly MaterializationRecord[] {
    return [...this.materializations.values()];
  }

  readEvidenceForAddress(handle: AddressHandle): readonly EvidenceHandle[] {
    return readSet(this.evidenceByAddress, handle);
  }

  readEvidenceForIdentity(handle: IdentityHandle): readonly EvidenceHandle[] {
    return readSet(this.evidenceByIdentity, handle);
  }

  readProvenanceForEvidence(handle: EvidenceHandle): readonly ProvenanceHandle[] {
    return readSet(this.provenanceByEvidence, handle);
  }

  readClaimsForSubject(handle: AddressHandle | IdentityHandle | ProductHandle): readonly ClaimHandle[] {
    return readSet(this.claimsBySubject, handle);
  }

  readClaimsForObject(handle: AddressHandle | IdentityHandle | ProductHandle): readonly ClaimHandle[] {
    return readSet(this.claimsByObject, handle);
  }

  readClaimsForPredicate(key: ClaimPredicateKey): readonly ClaimHandle[] {
    return readSet(this.claimsByPredicate, key);
  }

  private buildCommitIndex(records: readonly KernelStoreRecord[]): KernelStoreCommitIndex {
    const addresses = new Map<AddressHandle, SemanticAddress>();
    const identities = new Map<IdentityHandle, SemanticIdentity>();
    const products = new Map<ProductHandle, MaterializedProduct>();

    for (const record of records) {
      switch (record.kind) {
        case 'source-file-address':
        case 'source-span-address':
        case 'template-address':
        case 'template-node-address':
        case 'generated-address':
        case 'external-address':
          addresses.set(record.handle, record);
          break;
        case 'typescript-declaration-identity':
        case 'aurelia-resource-identity':
        case 'aurelia-attribute-pattern-identity':
        case 'di-key-identity':
        case 'container-identity':
        case 'di-product-identity':
        case 'registration-identity':
        case 'configuration-identity':
        case 'compiler-identity':
        case 'template-identity':
        case 'template-node-identity':
        case 'binding-identity':
        case 'instruction-identity':
        case 'generated-identity':
          identities.set(record.handle, record);
          break;
        case 'materialized-product':
          products.set(record.handle, record);
          break;
      }
    }

    return { addresses, identities, products };
  }

  private validateBatch(
    batch: KernelStoreBatch,
    pending: KernelStoreCommitIndex,
    batchLabel: string,
  ): void {
    for (const record of batch.records) {
      if (record.kind === 'materialized-product') {
        this.validateProduct(record, batchLabel);
      }
    }
    for (const record of batch.records) {
      if (record.kind === 'semantic-claim') {
        this.validateClaim(record, pending, batchLabel);
      }
    }
  }

  private validateProduct(
    product: MaterializedProduct,
    batchLabel: string,
  ): void {
    const definition = readKernelVocabularyDefinition(product.productKindKey);
    if (definition?.slot !== KernelVocabularySlot.ProductKind) {
      throw new Error(
        `Invalid product kind while committing ${batchLabel}: ${product.handle} uses ${product.productKindKey}.`,
      );
    }
  }

  private validateClaim(
    claim: SemanticClaim,
    pending: KernelStoreCommitIndex,
    batchLabel: string,
  ): void {
    const definition = readClaimPredicateDefinition(claim.predicateKey);
    const signature = definition?.claimSignature;
    if (signature == null) {
      throw new Error(
        `Invalid claim predicate while committing ${batchLabel}: ${claim.handle} uses ${claim.predicateKey}.`,
      );
    }

    this.validateClaimEndpoint(claim, 'subject', claim.subjectHandle, signature.subject, pending, batchLabel);
    this.validateClaimEndpoint(claim, 'object', claim.objectHandle, signature.object, pending, batchLabel);
  }

  private validateClaimEndpoint(
    claim: SemanticClaim,
    side: 'subject' | 'object',
    handle: AddressHandle | IdentityHandle | ProductHandle,
    signature: { readonly endpointKinds: readonly KernelClaimEndpointKind[]; readonly productKinds: readonly ProductKindKey[] },
    pending: KernelStoreCommitIndex,
    batchLabel: string,
  ): void {
    const address = pending.addresses.get(handle as AddressHandle) ?? this.addresses.get(handle as AddressHandle) ?? null;
    const identity = pending.identities.get(handle as IdentityHandle) ?? this.identities.get(handle as IdentityHandle) ?? null;
    const product = pending.products.get(handle as ProductHandle) ?? this.products.get(handle as ProductHandle) ?? null;
    const acceptedKinds = new Set(signature.endpointKinds);

    if (address == null && identity == null && product == null) {
      throw new Error(
        `Unknown ${side} endpoint while committing ${batchLabel}: ${claim.handle} (${claim.predicateKey}) references ${handle}.`,
      );
    }
    if (address != null && acceptedKinds.has(KernelClaimEndpointKind.Address)) {
      return;
    }
    if (identity != null && acceptedKinds.has(KernelClaimEndpointKind.Identity)) {
      return;
    }
    if (product != null && acceptedKinds.has(KernelClaimEndpointKind.Product)) {
      this.validateClaimProductEndpoint(claim, side, product, signature.productKinds, batchLabel);
      return;
    }

    throw new Error(
      `Invalid ${side} endpoint kind while committing ${batchLabel}: ${claim.handle} (${claim.predicateKey}) references ${handle}.`,
    );
  }

  private validateClaimProductEndpoint(
    claim: SemanticClaim,
    side: 'subject' | 'object',
    product: MaterializedProduct,
    expectedProductKinds: readonly ProductKindKey[],
    batchLabel: string,
  ): void {
    if (expectedProductKinds.length === 0 || expectedProductKinds.includes(product.productKindKey)) {
      return;
    }
    throw new Error(
      `Invalid ${side} product kind while committing ${batchLabel}: ${claim.handle} (${claim.predicateKey}) ` +
      `references ${product.handle} (${product.productKindKey}).`,
    );
  }

  private indexRecord(record: KernelStoreRecord): void {
    switch (record.kind) {
      case 'source-file-address':
      case 'source-span-address':
      case 'template-address':
      case 'template-node-address':
      case 'generated-address':
      case 'external-address':
        this.addresses.set(record.handle, record);
        return;
      case 'typescript-declaration-identity':
      case 'aurelia-resource-identity':
      case 'aurelia-attribute-pattern-identity':
      case 'di-key-identity':
      case 'container-identity':
      case 'di-product-identity':
      case 'registration-identity':
      case 'configuration-identity':
      case 'compiler-identity':
      case 'template-identity':
      case 'template-node-identity':
      case 'binding-identity':
      case 'instruction-identity':
      case 'generated-identity':
        this.identities.set(record.handle, record);
        return;
      case 'evidence-record':
        this.evidence.set(record.handle, record);
        if (record.addressHandle != null) {
          addToSet(this.evidenceByAddress, record.addressHandle, record.handle);
        }
        if (record.identityHandle != null) {
          addToSet(this.evidenceByIdentity, record.identityHandle, record.handle);
        }
        return;
      case 'evidence-set':
        this.evidence.set(record.handle, record);
        return;
      case 'provenance-record':
        this.provenance.set(record.handle, record);
        for (const evidenceHandle of record.evidenceHandles) {
          addToSet(this.provenanceByEvidence, evidenceHandle, record.handle);
        }
        return;
      case 'semantic-claim':
        this.claims.set(record.handle, record);
        addToSet(this.claimsBySubject, record.subjectHandle, record.handle);
        addToSet(this.claimsByObject, record.objectHandle, record.handle);
        addToSet(this.claimsByPredicate, record.predicateKey, record.handle);
        return;
      case 'derivation-edge':
        this.derivationEdges.set(record.handle, record);
        return;
      case 'derivation-rule':
        this.derivationRules.set(record.handle, record);
        return;
      case 'derivation-record':
        this.derivations.set(record.handle, record);
        return;
      case 'open-seam':
        this.openSeams.set(record.handle, record);
        return;
      case 'materialized-product':
        this.products.set(record.handle, record);
        addToSet(this.productsByKind, record.productKindKey, record.handle);
        return;
      case 'materialization-record':
        this.materializations.set(record.handle, record);
        return;
    }
  }
}
