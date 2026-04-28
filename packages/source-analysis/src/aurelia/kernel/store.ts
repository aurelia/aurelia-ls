import type { SemanticAddress } from './address.js';
import type { SemanticClaim } from './claim.js';
import type { SemanticIdentity } from './identity.js';
import type { MaterializationRecord, MaterializedProduct } from './materialization.js';
import type { ClaimPredicateKey } from './vocabulary.js';
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

/** Hot in-memory analysis store for normalized kernel records and handle expansion. */
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
        return;
      case 'materialization-record':
        this.materializations.set(record.handle, record);
        return;
    }
  }
}
