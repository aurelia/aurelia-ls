import type {
  SemanticAddress,
  SourceFileAddress,
} from './address.js';
import type { SemanticClaim } from './claim.js';
import type { SemanticIdentity } from './identity.js';
import type { MaterializationRecord, MaterializedProduct } from './materialization.js';
import { HotDetailCatalog } from './hot-details.js';
import { ProductDetailCatalog } from './product-details.js';
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
  EvidenceHandle,
  KernelRecordHandle,
  MaterializationHandle,
  OpenSeamHandle,
  ProductHandle,
  ProvenanceHandle,
  IdentityHandle,
} from './handles.js';
import { KernelHandleFactory } from './handles.js';
import type { EvidenceRecord } from './evidence.js';
import type { ProvenanceRecord } from './provenance.js';
import type { OpenSeam } from './open-seam.js';
import {
  countSemanticRuntimeRows,
  countSemanticRuntimeRowsBy,
  sortedCountRows,
  type SemanticRuntimeCountRow,
  type SemanticRuntimeDetailDensityRow,
  type SemanticRuntimeKernelCountSnapshot,
  type SemanticRuntimeKernelDensitySnapshot,
  type SemanticRuntimeKernelTelemetryOptions,
} from '../telemetry/kernel-density.js';
import {
  readSemanticRuntimeDetailDensityRows,
} from '../telemetry/detail-density.js';

interface KernelStoreCommitIndex {
  readonly addresses: ReadonlyMap<AddressHandle, SemanticAddress>;
  readonly identities: ReadonlyMap<IdentityHandle, SemanticIdentity>;
  readonly products: ReadonlyMap<ProductHandle, MaterializedProduct>;
  readonly claims: ReadonlyMap<ClaimHandle, SemanticClaim>;
}

export interface KernelStoreMarker {
  readonly records: number;
  readonly productDetails: number;
  readonly hotDetails: number;
}

export interface KernelStoreDisposalSummary {
  readonly records: number;
  readonly productDetails: number;
  readonly hotDetails: number;
  readonly handleCharacters: number;
}

export interface KernelStoreDetailDensityDelta {
  readonly productDetailDensity: readonly SemanticRuntimeDetailDensityRow[];
  readonly hotDetailDensity: readonly SemanticRuntimeDetailDensityRow[];
}

export interface KernelStoreDensityDelta {
  readonly recordKinds: readonly SemanticRuntimeCountRow[];
  readonly sourceSpanRoles: readonly SemanticRuntimeCountRow[];
  readonly productKinds: readonly SemanticRuntimeCountRow[];
  readonly productDetailKinds: readonly SemanticRuntimeCountRow[];
  readonly hotDetailKinds: readonly SemanticRuntimeCountRow[];
}

export interface KernelStoreDisposalContext {
  readonly marker: KernelStoreMarker;
  readonly summary: KernelStoreDisposalSummary;
}

export interface KernelStoreSidecarIndex {
  readonly key: string;
  readonly summary: string;
  readEntryCount(): number;
  dispose(context: KernelStoreDisposalContext): void;
}

export interface KernelStoreSidecarIndexRow {
  readonly key: string;
  readonly entries: number;
  readonly summary: string;
}

/** Any handle-bearing record admitted into the hot kernel store; not a semantic taxonomy. */
export type KernelStoreRecord =
  | SemanticAddress
  | SemanticIdentity
  | EvidenceRecord
  | ProvenanceRecord
  | SemanticClaim
  | OpenSeam
  | MaterializedProduct
  | MaterializationRecord;

/** Coherent record-emission unit for the hot kernel store. */
export class KernelStoreBatch {
  constructor(
    /** Normalized records emitted together by one analysis step. */
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

function removeFromSet<TKey, TValue>(
  map: Map<TKey, Set<TValue>>,
  key: TKey,
  value: TValue,
): void {
  const values = map.get(key);
  if (values === undefined) {
    return;
  }
  values.delete(value);
  if (values.size === 0) {
    map.delete(key);
  }
}

function handleCharactersByRecordKind(records: Iterable<KernelStoreRecord>) {
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(record.kind, (counts.get(record.kind) ?? 0) + record.handle.length);
  }
  return sortedCountRows(counts);
}

function handleCharactersByProductKind(records: Iterable<MaterializedProduct>) {
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(record.productKindKey, (counts.get(record.productKindKey) ?? 0) + record.handle.length);
  }
  return sortedCountRows(counts);
}

function sourceSpanRoleRows(records: Iterable<SemanticAddress>) {
  return countSemanticRuntimeRowsBy(
    records,
    (record) => record.kind === 'source-span-address' ? record.role : null,
  );
}

function sourceFileRoleRows(records: Iterable<SemanticAddress>) {
  return countSemanticRuntimeRowsBy(
    records,
    (record) => record.kind === 'source-file-address' ? record.role : null,
  );
}

function handleCharactersBySourceSpanRole(records: Iterable<SemanticAddress>) {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (record.kind !== 'source-span-address') {
      continue;
    }
    counts.set(record.role, (counts.get(record.role) ?? 0) + record.handle.length);
  }
  return sortedCountRows(counts);
}

function countDetailKindRows(entries: Iterable<{ readonly slot: { readonly detailKind: string } }>): readonly SemanticRuntimeCountRow[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.slot.detailKind, (counts.get(entry.slot.detailKind) ?? 0) + 1);
  }
  return sortedCountRows(counts);
}

/**
 * Hot in-memory analysis store for normalized kernel records and handle expansion.
 *
 * The store owns record identity, graph navigation, and vocabulary validation.
 * It does not currently own rich product-detail objects. Materializers may carry
 * those objects in emissions while assembling the hot world, but durable
 * product expansion needs a typed layer rather than generic store payloads.
 */
export class KernelStore {
  readonly handles: KernelHandleFactory;
  private readonly records = new Map<KernelRecordHandle, KernelStoreRecord>();
  private readonly recordOrder: KernelRecordHandle[] = [];
  private readonly addresses = new Map<AddressHandle, SemanticAddress>();
  private readonly identities = new Map<IdentityHandle, SemanticIdentity>();
  private readonly evidence = new Map<EvidenceHandle, EvidenceRecord>();
  private readonly provenance = new Map<ProvenanceHandle, ProvenanceRecord>();
  private readonly claims = new Map<ClaimHandle, SemanticClaim>();
  private readonly openSeams = new Map<OpenSeamHandle, OpenSeam>();
  private readonly products = new Map<ProductHandle, MaterializedProduct>();
  private readonly materializations = new Map<MaterializationHandle, MaterializationRecord>();
  private readonly sourceFileAddressesByPath = new Map<string, Set<AddressHandle>>();
  private readonly productsByKind = new Map<ProductKindKey, Set<ProductHandle>>();
  private readonly evidenceByAddress = new Map<AddressHandle, Set<EvidenceHandle>>();
  private readonly evidenceByIdentity = new Map<IdentityHandle, Set<EvidenceHandle>>();
  private readonly provenanceByEvidence = new Map<EvidenceHandle, Set<ProvenanceHandle>>();
  private readonly claimsBySubject = new Map<AddressHandle | IdentityHandle | ProductHandle, Set<ClaimHandle>>();
  private readonly claimsByObject = new Map<AddressHandle | IdentityHandle | ProductHandle, Set<ClaimHandle>>();
  private readonly claimsByPredicate = new Map<ClaimPredicateKey, Set<ClaimHandle>>();
  private readonly sidecarIndexes = new Map<string, KernelStoreSidecarIndex>();
  private handleCharacterCount = 0;
  readonly hotDetails = new HotDetailCatalog();
  readonly productDetails: ProductDetailCatalog;

  constructor(
    /** Human-readable key for the active analysis store; not a persistence authority. */
    storeKey: string,
  ) {
    this.handles = new KernelHandleFactory(storeKey);
    this.productDetails = new ProductDetailCatalog((handle) => this.readProduct(handle));
  }

  /** Add a normalized kernel record and update cheap navigation indexes. */
  private add<TRecord extends KernelStoreRecord>(record: TRecord): TRecord {
    if (this.records.has(record.handle as KernelRecordHandle)) {
      throw new Error(`Duplicate kernel record handle in store: ${record.handle}`);
    }
    this.records.set(record.handle as KernelRecordHandle, record);
    this.recordOrder.push(record.handle as KernelRecordHandle);
    this.handleCharacterCount += record.handle.length;
    this.indexRecord(record);
    return record;
  }

  /** Commit one record batch atomically enough to prevent duplicate handles before indexing. */
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

  mark(): KernelStoreMarker {
    return {
      records: this.recordOrder.length,
      productDetails: this.productDetails.mark(),
      hotDetails: this.hotDetails.mark(),
    };
  }

  disposeSince(marker: KernelStoreMarker): KernelStoreDisposalSummary {
    const productDetails = this.productDetails.removeSince(marker.productDetails);
    const hotDetails = this.hotDetails.removeSince(marker.hotDetails);
    let records = 0;
    let handleCharacters = 0;
    while (this.recordOrder.length > marker.records) {
      const handle = this.recordOrder.pop();
      if (handle == null) {
        continue;
      }
      const record = this.records.get(handle) ?? null;
      if (record == null) {
        continue;
      }
      this.records.delete(handle);
      this.handleCharacterCount -= record.handle.length;
      handleCharacters += record.handle.length;
      this.removeRecordFromIndexes(record);
      records += 1;
    }
    const summary = { records, productDetails, hotDetails, handleCharacters };
    this.notifySidecarIndexes({ marker, summary });
    return summary;
  }

  /** Register a store-local sidecar index whose entries mirror kernel/product-detail lifetimes. */
  registerSidecarIndex(index: KernelStoreSidecarIndex): () => void {
    const existing = this.sidecarIndexes.get(index.key);
    if (existing != null && existing !== index) {
      throw new Error(`Kernel sidecar index already registered for ${index.key}.`);
    }
    this.sidecarIndexes.set(index.key, index);
    return () => {
      if (this.sidecarIndexes.get(index.key) === index) {
        this.sidecarIndexes.delete(index.key);
      }
    };
  }

  readSidecarIndexRows(): readonly KernelStoreSidecarIndexRow[] {
    return [...this.sidecarIndexes.values()]
      .map((index) => ({
        key: index.key,
        entries: index.readEntryCount(),
        summary: index.summary,
      }))
      .sort((left, right) => right.entries - left.entries || left.key.localeCompare(right.key));
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

  readEvidence(handle: EvidenceHandle): EvidenceRecord | null {
    return this.evidence.get(handle) ?? null;
  }

  readProvenance(handle: ProvenanceHandle): ProvenanceRecord | null {
    return this.provenance.get(handle) ?? null;
  }

  readClaim(handle: ClaimHandle): SemanticClaim | null {
    return this.claims.get(handle) ?? null;
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

  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[] {
    const normalizedFileName = normalizeSourcePath(fileName);
    const matches = new Map<AddressHandle, SourceFileAddress>();
    for (const candidate of sourcePathSuffixes(fileName)) {
      for (const handle of this.sourceFileAddressesByPath.get(candidate) ?? []) {
        const address = this.addresses.get(handle);
        if (address?.kind === 'source-file-address') {
          matches.set(handle, address);
        }
      }
    }
    return [...matches.values()]
      .sort((left, right) =>
        sourcePathMatchScore(right.path, normalizedFileName) - sourcePathMatchScore(left.path, normalizedFileName)
      );
  }

  readBestSourceFileAddressForFileName(fileName: string): SourceFileAddress | null {
    return this.readSourceFileAddressesByFileName(fileName)[0] ?? null;
  }

  readIdentities(): readonly SemanticIdentity[] {
    return [...this.identities.values()];
  }

  readClaims(): readonly SemanticClaim[] {
    return [...this.claims.values()];
  }

  readEvidenceRecords(): readonly EvidenceRecord[] {
    return [...this.evidence.values()];
  }

  readProvenanceRecords(): readonly ProvenanceRecord[] {
    return [...this.provenance.values()];
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

  /** Snapshot kernel size for telemetry; this does not expand product details or source text. */
  readTelemetrySnapshot(
    options: SemanticRuntimeKernelTelemetryOptions = {},
  ): SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot {
    const counts: SemanticRuntimeKernelCountSnapshot = {
      totalRecords: this.records.size,
      addresses: this.addresses.size,
      identities: this.identities.size,
      evidence: this.evidence.size,
      provenance: this.provenance.size,
      claims: this.claims.size,
      openSeams: this.openSeams.size,
      products: this.products.size,
      materializations: this.materializations.size,
      productDetails: this.productDetails.size,
      hotDetails: this.hotDetails.size,
      handleCharacters: this.handleCharacterCount,
    };
    if (options.includeBreakdowns !== true) {
      return counts;
    }
    return {
      ...counts,
      recordKinds: countSemanticRuntimeRowsBy(this.records.values(), (record) => record.kind),
      addressKinds: countSemanticRuntimeRowsBy(this.addresses.values(), (record) => record.kind),
      sourceSpanRoles: sourceSpanRoleRows(this.addresses.values()),
      sourceFileRoles: sourceFileRoleRows(this.addresses.values()),
      identityKinds: countSemanticRuntimeRowsBy(this.identities.values(), (record) => record.kind),
      productKinds: sortedCountRows(new Map([...this.productsByKind].map(([key, handles]) => [key, handles.size]))),
      productDetailKinds: sortedCountRows(this.productDetails.readDetailKindCounts()),
      hotDetailKinds: sortedCountRows(this.hotDetails.readDetailKindCounts()),
      claimPredicates: countSemanticRuntimeRowsBy(this.claims.values(), (claim) => claim.predicateKey),
      openSeamKinds: countSemanticRuntimeRowsBy(this.openSeams.values(), (seam) => seam.seamKindKey),
      recordKindHandleCharacters: handleCharactersByRecordKind(this.records.values()),
      productKindHandleCharacters: handleCharactersByProductKind(this.products.values()),
      sourceSpanRoleHandleCharacters: handleCharactersBySourceSpanRole(this.addresses.values()),
      sidecarIndexes: this.readSidecarIndexRows(),
      ...(options.includeDetailDensity === true
        ? this.readDetailDensitySince({ records: 0, productDetails: 0, hotDetails: 0 })
        : {}),
    };
  }

  readDetailDensitySince(marker: KernelStoreMarker): KernelStoreDetailDensityDelta {
    return {
      productDetailDensity: readSemanticRuntimeDetailDensityRows(
        this.productDetails.readEntriesSince(marker.productDetails).map((entry) => {
          return {
            detailKind: entry.slot.detailKind,
            detail: entry.detail,
            envelopeHandles: [
              entry.product.handle,
              entry.product.identityHandle,
              entry.product.addressHandle,
              entry.product.provenanceHandle,
            ].filter((handle) => handle != null).map((handle) => String(handle)),
          };
        }),
      ),
      hotDetailDensity: readSemanticRuntimeDetailDensityRows(
        this.hotDetails.readEntriesSince(marker.hotDetails).map((entry) => ({
          detailKind: entry.slot.detailKind,
          detail: entry.detail,
          envelopeHandles: [entry.handle],
        })),
      ),
    };
  }

  readDensitySince(marker: KernelStoreMarker): KernelStoreDensityDelta {
    const recordKinds = new Map<string, number>();
    const sourceSpanRoles = new Map<string, number>();
    const productKinds = new Map<string, number>();
    for (let index = marker.records; index < this.recordOrder.length; index += 1) {
      const handle = this.recordOrder[index];
      if (handle == null) {
        continue;
      }
      const record = this.records.get(handle) ?? null;
      if (record == null) {
        continue;
      }
      recordKinds.set(record.kind, (recordKinds.get(record.kind) ?? 0) + 1);
      if (record.kind === 'source-span-address') {
        sourceSpanRoles.set(record.role, (sourceSpanRoles.get(record.role) ?? 0) + 1);
      }
      if (record.kind === 'materialized-product') {
        productKinds.set(record.productKindKey, (productKinds.get(record.productKindKey) ?? 0) + 1);
      }
    }
    return {
      recordKinds: sortedCountRows(recordKinds),
      sourceSpanRoles: sortedCountRows(sourceSpanRoles),
      productKinds: sortedCountRows(productKinds),
      productDetailKinds: countDetailKindRows(this.productDetails.readEntriesSince(marker.productDetails)),
      hotDetailKinds: countDetailKindRows(this.hotDetails.readEntriesSince(marker.hotDetails)),
    };
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
    const claims = new Map<ClaimHandle, SemanticClaim>();

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
        case 'resource-product-identity':
        case 'evaluation-identity':
        case 'configuration-identity':
        case 'router-identity':
        case 'route-recognizer-identity':
        case 'i18n-identity':
        case 'state-identity':
        case 'validation-identity':
        case 'fetch-client-identity':
        case 'dialog-identity':
        case 'compiler-identity':
        case 'template-identity':
        case 'template-node-identity':
        case 'binding-identity':
        case 'instruction-identity':
        case 'type-system-identity':
          identities.set(record.handle, record);
          break;
        case 'materialized-product':
          products.set(record.handle, record);
          break;
        case 'semantic-claim':
          claims.set(record.handle, record);
          break;
      }
    }

    return { addresses, identities, products, claims };
  }

  private validateBatch(
    batch: KernelStoreBatch,
    pending: KernelStoreCommitIndex,
    batchLabel: string,
  ): void {
    for (const record of batch.records) {
      if (record.kind === 'materialized-product') {
        this.validateProduct(record, pending, batchLabel);
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
    pending: KernelStoreCommitIndex,
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
        if (record.kind === 'source-file-address') {
          for (const suffix of sourcePathSuffixes(record.path)) {
            addToSet(this.sourceFileAddressesByPath, suffix, record.handle);
          }
        }
        return;
      case 'typescript-declaration-identity':
      case 'aurelia-resource-identity':
      case 'aurelia-attribute-pattern-identity':
      case 'di-key-identity':
      case 'container-identity':
      case 'di-product-identity':
      case 'registration-identity':
      case 'resource-product-identity':
      case 'evaluation-identity':
      case 'configuration-identity':
      case 'router-identity':
      case 'route-recognizer-identity':
      case 'i18n-identity':
      case 'state-identity':
      case 'validation-identity':
      case 'fetch-client-identity':
      case 'dialog-identity':
      case 'compiler-identity':
      case 'template-identity':
      case 'template-node-identity':
      case 'binding-identity':
      case 'instruction-identity':
      case 'type-system-identity':
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

  private removeRecordFromIndexes(record: KernelStoreRecord): void {
    switch (record.kind) {
      case 'source-file-address':
        this.addresses.delete(record.handle);
        for (const suffix of sourcePathSuffixes(record.path)) {
          removeFromSet(this.sourceFileAddressesByPath, suffix, record.handle);
        }
        return;
      case 'source-span-address':
      case 'template-address':
      case 'template-node-address':
      case 'generated-address':
      case 'external-address':
        this.addresses.delete(record.handle);
        return;
      case 'typescript-declaration-identity':
      case 'aurelia-resource-identity':
      case 'aurelia-attribute-pattern-identity':
      case 'di-key-identity':
      case 'container-identity':
      case 'di-product-identity':
      case 'registration-identity':
      case 'resource-product-identity':
      case 'evaluation-identity':
      case 'configuration-identity':
      case 'router-identity':
      case 'route-recognizer-identity':
      case 'i18n-identity':
      case 'state-identity':
      case 'validation-identity':
      case 'fetch-client-identity':
      case 'dialog-identity':
      case 'compiler-identity':
      case 'template-identity':
      case 'template-node-identity':
      case 'binding-identity':
      case 'instruction-identity':
      case 'type-system-identity':
        this.identities.delete(record.handle);
        return;
      case 'evidence-record':
        this.evidence.delete(record.handle);
        if (record.addressHandle != null) {
          removeFromSet(this.evidenceByAddress, record.addressHandle, record.handle);
        }
        if (record.identityHandle != null) {
          removeFromSet(this.evidenceByIdentity, record.identityHandle, record.handle);
        }
        return;
      case 'provenance-record':
        this.provenance.delete(record.handle);
        for (const evidenceHandle of record.evidenceHandles) {
          removeFromSet(this.provenanceByEvidence, evidenceHandle, record.handle);
        }
        return;
      case 'semantic-claim':
        this.claims.delete(record.handle);
        removeFromSet(this.claimsBySubject, record.subjectHandle, record.handle);
        removeFromSet(this.claimsByObject, record.objectHandle, record.handle);
        removeFromSet(this.claimsByPredicate, record.predicateKey, record.handle);
        return;
      case 'open-seam':
        this.openSeams.delete(record.handle);
        return;
      case 'materialized-product':
        this.products.delete(record.handle);
        removeFromSet(this.productsByKind, record.productKindKey, record.handle);
        this.productDetails.remove(record.handle);
        return;
      case 'materialization-record':
        this.materializations.delete(record.handle);
        return;
    }
  }

  private notifySidecarIndexes(context: KernelStoreDisposalContext): void {
    if (this.sidecarIndexes.size === 0) {
      return;
    }
    for (const index of this.sidecarIndexes.values()) {
      index.dispose(context);
    }
  }
}

function normalizeSourcePath(fileName: string): string {
  return fileName.replace(/\\/g, '/');
}

function sourcePathMatchScore(
  addressPath: string,
  normalizedFileName: string,
): number {
  const normalizedAddressPath = normalizeSourcePath(addressPath);
  if (normalizedAddressPath === normalizedFileName) {
    return 1_000_000 + normalizedAddressPath.length;
  }
  if (normalizedFileName.endsWith(`/${normalizedAddressPath}`)) {
    return 900_000 + normalizedAddressPath.length;
  }
  if (normalizedAddressPath.endsWith(`/${normalizedFileName}`)) {
    return 800_000 + normalizedFileName.length;
  }
  return commonPathSuffixLength(normalizedAddressPath, normalizedFileName);
}

function commonPathSuffixLength(
  left: string,
  right: string,
): number {
  const leftParts = left.split('/').filter((part) => part.length > 0);
  const rightParts = right.split('/').filter((part) => part.length > 0);
  let leftIndex = leftParts.length - 1;
  let rightIndex = rightParts.length - 1;
  let length = 0;
  while (leftIndex >= 0 && rightIndex >= 0 && leftParts[leftIndex] === rightParts[rightIndex]) {
    length += leftParts[leftIndex]!.length + 1;
    leftIndex--;
    rightIndex--;
  }
  return length;
}

function sourcePathSuffixes(fileName: string): readonly string[] {
  const normalized = normalizeSourcePath(fileName);
  const parts = normalized.split('/').filter((part) => part.length > 0);
  const suffixes = new Set<string>([normalized]);
  for (let index = 0; index < parts.length; index++) {
    suffixes.add(parts.slice(index).join('/'));
  }
  return [...suffixes];
}
