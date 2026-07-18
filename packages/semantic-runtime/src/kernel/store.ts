import type {
  SemanticAddress,
  SourceFileAddress,
} from './address.js';
import type { SemanticClaim } from './claim.js';
import type { SemanticIdentity } from './identity.js';
import type { MaterializationRecord, MaterializedProduct } from './materialization.js';
import {
  HotDetailCatalog,
  HotDetailEntry,
  type PreparedHotDetailEntry,
  type HotDetailSlot,
} from './hot-details.js';
import {
  ProductDetailCatalog,
  ProductDetailEntry,
  type PreparedProductDetailEntry,
  type ProductDetailSlot,
} from './product-details.js';
import type { ClaimPredicateKey, ProductKindKey } from './vocabulary.js';
import { applyObjectFieldNormalizations } from './object-field-normalization.js';
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
  HotDetailHandle,
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
import { normalizeHostPath } from './source-address.js';
import {
  KernelDetailAdmission,
  KernelPublicationDecision,
  KernelPublicationDecisionKind,
  KernelPublicationManifest,
  KernelPublicationSurface,
  KernelStoreBatch,
  type KernelPublicationComparisonContext,
  type KernelHotDetailPublication,
  type KernelProductDetailPublication,
  type KernelPublicationPlan,
  KernelPublicationReplacement,
} from './publication.js';
import {
  compareKernelRecords,
  referencedKernelRecordHandles,
} from './record-comparison.js';

export { KernelStoreBatch } from './publication.js';

interface KernelStoreCommitIndex {
  readonly addresses: ReadonlyMap<AddressHandle, SemanticAddress>;
  readonly identities: ReadonlyMap<IdentityHandle, SemanticIdentity>;
  readonly products: ReadonlyMap<ProductHandle, MaterializedProduct>;
  readonly claims: ReadonlyMap<ClaimHandle, SemanticClaim>;
}

interface PreparedProductDetailPublication {
  readonly ownedHandles: readonly ProductHandle[];
  readonly add: readonly KernelProductDetailPublication<unknown>[];
  readonly remove: ReadonlySet<ProductHandle>;
  readonly decisions: readonly KernelPublicationDecision[];
}

interface PreparedHotDetailPublication {
  readonly ownedHandles: readonly HotDetailHandle[];
  readonly add: readonly KernelHotDetailPublication<unknown>[];
  readonly remove: ReadonlySet<HotDetailHandle>;
  readonly decisions: readonly KernelPublicationDecision[];
}

/** Boundary for reclaiming entries born inside a later answer or app epoch. */
export interface KernelStoreLifetimeMarker {
  readonly nextLifetimeOrdinal: number;
}

/** Boundary for observing surviving writes without assigning their ownership lifetime. */
export interface KernelStoreObservationMarker {
  readonly nextMutationOrdinal: number;
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

/** Count and mutation-delta boundary shared by committed stores and staged publication views. */
export interface KernelTelemetryReadView {
  markObservation(): KernelStoreObservationMarker;
  readKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot;
  readDetailDensitySince(marker: KernelStoreObservationMarker): KernelStoreDetailDensityDelta;
  readDensitySince(marker: KernelStoreObservationMarker): KernelStoreDensityDelta;
}

export interface KernelStoreDisposalContext {
  readonly marker: KernelStoreLifetimeMarker;
  readonly summary: KernelStoreDisposalSummary;
}

export interface KernelStoreSidecarIndex {
  readonly key: string;
  readonly summary: string;
  readEntryCount(): number;
  dispose(context: KernelStoreDisposalContext): void;
  /** Whether replacing this detail requires a lifecycle participant not admitted by the current computation. */
  hasProductDetail(productHandle: ProductHandle): boolean;
}

export interface KernelStoreSidecarIndexRow {
  readonly key: string;
  readonly entries: number;
  readonly summary: string;
}

/** Store-owned computation state that must reconcile when lifetime disposal removes its publications. */
export interface KernelStoreComputationLifecycle {
  dispose(context: KernelStoreDisposalContext): void;
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

/** Narrow kernel surface available while a computation is building its next publication. */
export interface KernelStoreReadView {
  readonly handles: KernelHandleFactory;
  read(handle: KernelRecordHandle): KernelStoreRecord | null;
}

/** Candidate-aware source-file lookup shared by committed stores and staged publications. */
export interface KernelSourceFileReadView extends KernelStoreReadView {
  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[];
}

/** Candidate-aware enumeration of the complete normalized kernel record set. */
export interface KernelRecordCollectionReadView extends KernelStoreReadView {
  readAllRecords(): readonly KernelStoreRecord[];
}

/** Read boundary for consumers whose support/closure proof depends on materialization ownership. */
export interface KernelMaterializationReadView extends KernelStoreReadView {
  readMaterializations(): readonly MaterializationRecord[];
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
  private readonly recordLifetimeOrdinalByHandle = new Map<KernelRecordHandle, number>();
  private readonly recordMutationOrdinalByHandle = new Map<KernelRecordHandle, number>();
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
  private readonly directPublicationOwner = {};
  private readonly activePublicationOwners = new Map<KernelPublicationManifest, object>();
  private computationLifecycle: KernelStoreComputationLifecycle | null = null;
  private handleCharacterCount = 0;
  private nextLifetimeOrdinal = 0;
  private nextMutationOrdinal = 0;
  readonly hotDetails: HotDetailCatalog;
  readonly productDetails: ProductDetailCatalog;

  constructor(
    /** Human-readable key for the active analysis store; not a persistence authority. */
    storeKey: string,
  ) {
    this.handles = new KernelHandleFactory(storeKey);
    const allocateLifetimeOrdinal = () => this.allocateLifetimeOrdinal();
    const allocateMutationOrdinal = () => this.allocateMutationOrdinal();
    this.productDetails = new ProductDetailCatalog(
      (handle) => this.readProduct(handle),
      allocateLifetimeOrdinal,
      allocateMutationOrdinal,
    );
    this.hotDetails = new HotDetailCatalog(
      (handle) => this.readProduct(handle),
      allocateLifetimeOrdinal,
      allocateMutationOrdinal,
    );
  }

  readProductDetail<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
  ): TDetail | null {
    return this.productDetails.read(slot, productHandle);
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null {
    return this.hotDetails.read(slot, handle);
  }

  private allocateLifetimeOrdinal(): number {
    return this.nextLifetimeOrdinal++;
  }

  private allocateMutationOrdinal(): number {
    return this.nextMutationOrdinal++;
  }

  /** Add a normalized kernel record and update cheap navigation indexes. */
  private add<TRecord extends KernelStoreRecord>(
    record: TRecord,
    lifetimeOrdinal: number,
  ): TRecord {
    if (this.records.has(record.handle as KernelRecordHandle)) {
      throw new Error(`Duplicate kernel record handle in store: ${record.handle}`);
    }
    this.records.set(record.handle as KernelRecordHandle, record);
    this.recordOrder.push(record.handle as KernelRecordHandle);
    this.recordLifetimeOrdinalByHandle.set(record.handle, lifetimeOrdinal);
    this.recordMutationOrdinalByHandle.set(record.handle, this.allocateMutationOrdinal());
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

    const lifetimeOrdinal = this.allocateLifetimeOrdinal();
    for (const record of batch.records) {
      this.add(record, lifetimeOrdinal);
    }
  }

  /** Commit only the records from a batch whose handles are not already present in this store. */
  commitMissing(batch: KernelStoreBatch): void {
    const missing = batch.records.filter((record) => !this.records.has(record.handle as KernelRecordHandle));
    if (missing.length === 0) {
      return;
    }
    this.commit(new KernelStoreBatch(missing, batch.label));
  }

  /** Publish immediately when no computation transaction owns the current analysis. */
  publish(plan: KernelPublicationPlan): void {
    if (plan.batch.records.length > 0) {
      this.commit(plan.batch);
    }
    for (const publication of plan.productDetails) {
      if (publication.admission === KernelDetailAdmission.IfAbsent) {
        this.productDetails.addIfAbsent(publication.slot, publication.productHandle, publication.detail);
      } else {
        this.productDetails.add(publication.slot, publication.productHandle, publication.detail);
      }
    }
    for (const publication of plan.hotDetails) {
      const owner = this.readProduct(publication.ownerProductHandle);
      if (owner == null) {
        throw new Error(
          `Cannot attach hot detail ${publication.slot.detailKind}; owner product `
          + `${publication.ownerProductHandle} is not committed.`,
        );
      }
      if (publication.admission === KernelDetailAdmission.IfAbsent) {
        this.hotDetails.addIfAbsent(
          publication.slot,
          publication.ownerProductHandle,
          publication.handle,
          publication.detail,
        );
      } else {
        this.hotDetails.add(
          publication.slot,
          publication.ownerProductHandle,
          publication.handle,
          publication.detail,
        );
      }
    }
  }

  /** Immediate store publication is not tied to a replaceable computation generation. */
  isCurrent(): boolean {
    return true;
  }

  requireCurrent(): void {}

  /**
   * Prevalidate and synchronously replace one computation-owned publication across kernel and detail catalogs.
   *
   * JavaScript cannot interleave readers inside the mutation, and every operation that can fail is checked first.
   * Sidecar reconciliation runs only after the complete post-state is visible.
   */
  replacePublication(
    previous: KernelPublicationManifest,
    next: KernelPublicationPlan,
    owner: object = this.directPublicationOwner,
  ): KernelPublicationReplacement {
    const label = next.batch.label ?? '(unnamed publication)';
    this.validatePublicationManifestAuthority(previous, owner, label);
    const previousRecordHandles = new Set(previous.recordHandles);
    const previousProductDetailHandles = new Set(previous.productDetailHandles);
    const previousHotDetailHandles = new Set(previous.hotDetailHandles);
    this.validatePublicationManifest(
      previousRecordHandles,
      previousProductDetailHandles,
      previousHotDetailHandles,
      previous.lifetimeOrdinal,
      label,
    );
    this.validatePublicationAdmissionSnapshots(next, label);

    const recordsByHandle = this.publicationRecordsByHandle(next.batch.records, previousRecordHandles, label);
    const productDetailsByHandle = normalizedProductDetailPublications(next.productDetails, label);
    const hotDetailsByHandle = normalizedHotDetailPublications(next.hotDetails, label);
    const pending = this.buildCommitIndex(next.batch.records);
    this.validateBatch(next.batch, pending, label, previousRecordHandles);
    this.validatePublicationReferences(next.batch.records, recordsByHandle, previousRecordHandles, label);

    const recordDecisions = this.recordPublicationDecisions(previousRecordHandles, recordsByHandle);
    const comparisonContext = this.publicationComparisonContext(recordsByHandle, previousRecordHandles);
    const recordKindsByHandle = new Map<KernelRecordHandle, string>();
    for (const handle of new Set([...previousRecordHandles, ...recordsByHandle.keys()])) {
      recordKindsByHandle.set(handle, recordsByHandle.get(handle)?.kind ?? this.records.get(handle)?.kind ?? 'kernel-record');
    }
    const productDetailPlan = this.prepareProductDetailPublication(
      previousProductDetailHandles,
      productDetailsByHandle,
      recordsByHandle,
      previousRecordHandles,
      recordDecisions,
      comparisonContext,
      label,
    );
    const hotDetailPlan = this.prepareHotDetailPublication(
      previousHotDetailHandles,
      hotDetailsByHandle,
      recordsByHandle,
      previousRecordHandles,
      recordDecisions,
      comparisonContext,
      label,
    );
    const withdrawnRecordHandles = handlesForDecision(recordDecisions, KernelPublicationDecisionKind.Withdraw);
    this.validateSurvivingReferences(withdrawnRecordHandles, previousRecordHandles, label);

    const replacedRecordHandles = handlesForDecisions(recordDecisions, [
      KernelPublicationDecisionKind.RefreshWitness,
      KernelPublicationDecisionKind.Replace,
    ]);
    const recordsToRemove = new Set([...withdrawnRecordHandles, ...replacedRecordHandles]);
    const recordsToAdd = next.batch.records.filter((record) => {
      const decision = recordDecisions.get(record.handle);
      return decision === KernelPublicationDecisionKind.Publish
        || decision === KernelPublicationDecisionKind.RefreshWitness
        || decision === KernelPublicationDecisionKind.Replace;
    });

    this.validateNoForeignDetailRemoval(
      recordsToRemove,
      previousProductDetailHandles,
      previousHotDetailHandles,
      label,
    );
    this.validateNoSidecarReplacement(productDetailPlan.remove, label);
    const preparedDetails = this.preparePublicationDetailBindings(
      productDetailPlan.add,
      hotDetailPlan.add,
      recordsByHandle,
      previousRecordHandles,
      recordDecisions,
    );

    const dependencyLifetimeOrdinal = this.publicationDependencyLifetimeOrdinal(
      next,
      recordsByHandle,
    );
    const lifetimeOrdinal = Math.max(
      previous.lifetimeOrdinal ?? this.allocateLifetimeOrdinal(),
      dependencyLifetimeOrdinal ?? -1,
    );

    applyObjectFieldNormalizations([
      ...preparedDetails.productDetails.flatMap((entry) => entry.binding.normalizations),
      ...preparedDetails.hotDetails.flatMap((entry) => entry.binding.normalizations),
    ]);

    for (const handle of productDetailPlan.remove) {
      this.productDetails.remove(handle);
    }
    for (const handle of hotDetailPlan.remove) {
      this.hotDetails.remove(handle);
    }
    for (const handle of recordsToRemove) {
      this.removeRecord(handle);
    }
    for (const record of recordsToAdd) {
      this.add(record, lifetimeOrdinal);
    }
    for (const entry of preparedDetails.productDetails) {
      this.productDetails.addPreparedAtLifetime(entry, lifetimeOrdinal);
    }
    for (const entry of preparedDetails.hotDetails) {
      this.hotDetails.addPreparedAtLifetime(entry, lifetimeOrdinal);
    }
    for (const handle of recordsByHandle.keys()) {
      this.recordLifetimeOrdinalByHandle.set(handle, lifetimeOrdinal);
    }
    for (const handle of productDetailPlan.ownedHandles) {
      this.productDetails.promoteLifetimeOrdinal(handle, lifetimeOrdinal);
    }
    for (const handle of hotDetailPlan.ownedHandles) {
      this.hotDetails.promoteLifetimeOrdinal(handle, lifetimeOrdinal);
    }

    const decisions = [
      ...publicationDecisionRows(
        recordDecisions,
        KernelPublicationSurface.Record,
        (handle) => recordKindsByHandle.get(handle) ?? 'kernel-record',
      ),
      ...productDetailPlan.decisions,
      ...hotDetailPlan.decisions,
    ];
    const manifest = new KernelPublicationManifest(
      [...recordsByHandle.keys()],
      productDetailPlan.ownedHandles,
      hotDetailPlan.ownedHandles,
      lifetimeOrdinal,
    );
    if (previous !== KernelPublicationManifest.empty) {
      this.activePublicationOwners.delete(previous);
    }
    if (manifest !== KernelPublicationManifest.empty) {
      this.activePublicationOwners.set(manifest, owner);
    }
    return new KernelPublicationReplacement(manifest, decisions);
  }

  private validatePublicationManifestAuthority(
    manifest: KernelPublicationManifest,
    owner: object,
    label: string,
  ): void {
    if (
      manifest !== KernelPublicationManifest.empty
      && this.activePublicationOwners.get(manifest) !== owner
    ) {
      throw new Error(`Publication ${label} cannot replace a stale or foreign publication manifest.`);
    }
  }

  /** Revoke a committed manifest when lifetime disposal removes its computation state. */
  retirePublicationManifest(manifest: KernelPublicationManifest, owner: object): void {
    if (manifest === KernelPublicationManifest.empty) {
      return;
    }
    if (this.activePublicationOwners.get(manifest) !== owner) {
      throw new Error('Cannot retire a stale, foreign, or differently owned publication manifest.');
    }
    this.activePublicationOwners.delete(manifest);
  }

  private validatePublicationManifest(
    recordHandles: ReadonlySet<KernelRecordHandle>,
    productDetailHandles: ReadonlySet<ProductHandle>,
    hotDetailHandles: ReadonlySet<HotDetailHandle>,
    lifetimeOrdinal: number | null,
    label: string,
  ): void {
    if (
      lifetimeOrdinal == null
      && (recordHandles.size > 0 || productDetailHandles.size > 0 || hotDetailHandles.size > 0)
    ) {
      throw new Error(`Publication ${label} cannot replace owned entries without their lifetime identity.`);
    }
    for (const handle of recordHandles) {
      if (!this.records.has(handle)) {
        throw new Error(`Publication ${label} cannot replace missing owned record ${handle}.`);
      }
      if (this.recordLifetimeOrdinalByHandle.get(handle) !== lifetimeOrdinal) {
        throw new Error(`Publication ${label} does not own record ${handle}.`);
      }
    }
    for (const handle of productDetailHandles) {
      if (this.productDetails.readEntry(handle) == null) {
        throw new Error(`Publication ${label} cannot replace missing owned product detail ${handle}.`);
      }
      if (this.productDetails.readLifetimeOrdinal(handle) !== lifetimeOrdinal) {
        throw new Error(`Publication ${label} does not own product detail ${handle}.`);
      }
    }
    for (const handle of hotDetailHandles) {
      if (this.hotDetails.readEntry(handle) == null) {
        throw new Error(`Publication ${label} cannot replace missing owned hot detail ${handle}.`);
      }
      if (this.hotDetails.readLifetimeOrdinal(handle) !== lifetimeOrdinal) {
        throw new Error(`Publication ${label} does not own hot detail ${handle}.`);
      }
    }
  }

  private validatePublicationAdmissionSnapshots(
    plan: KernelPublicationPlan,
    label: string,
  ): void {
    const productHandles = new Set<ProductHandle>();
    for (const snapshot of plan.productDetailAdmissionSnapshots) {
      if (productHandles.has(snapshot.productHandle)) {
        throw new Error(`Publication ${label} has duplicate admission evidence for ${snapshot.productHandle}.`);
      }
      productHandles.add(snapshot.productHandle);
      if (this.productDetails.readEntry(snapshot.productHandle) !== snapshot.expectedEntry) {
        throw new Error(
          `Publication ${label} cannot commit product detail ${snapshot.productHandle}; `
          + 'catalog admission changed after staging.',
        );
      }
    }
    const hotHandles = new Set<HotDetailHandle>();
    for (const snapshot of plan.hotDetailAdmissionSnapshots) {
      if (hotHandles.has(snapshot.handle)) {
        throw new Error(`Publication ${label} has duplicate admission evidence for ${snapshot.handle}.`);
      }
      hotHandles.add(snapshot.handle);
      if (this.hotDetails.readEntry(snapshot.handle) !== snapshot.expectedEntry) {
        throw new Error(
          `Publication ${label} cannot commit hot detail ${snapshot.handle}; `
          + 'catalog admission changed after staging.',
        );
      }
    }
  }

  private publicationRecordsByHandle(
    records: readonly KernelStoreRecord[],
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    label: string,
  ): ReadonlyMap<KernelRecordHandle, KernelStoreRecord> {
    const byHandle = new Map<KernelRecordHandle, KernelStoreRecord>();
    for (const record of records) {
      const handle = record.handle;
      if (byHandle.has(handle)) {
        throw new Error(`Duplicate kernel record handle within ${label}: ${handle}.`);
      }
      if (this.records.has(handle) && !previousRecordHandles.has(handle)) {
        throw new Error(`Publication ${label} cannot claim record ${handle}; another owner already published it.`);
      }
      byHandle.set(handle, record);
    }
    return byHandle;
  }

  private validatePublicationReferences(
    records: readonly KernelStoreRecord[],
    nextByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    label: string,
  ): void {
    for (const record of records) {
      for (const reference of referencedKernelRecordHandles(record)) {
        const survives = nextByHandle.has(reference)
          || (this.records.has(reference) && !previousRecordHandles.has(reference));
        if (!survives) {
          throw new Error(
            `Publication ${label} leaves ${record.handle} referencing unavailable record ${reference}.`,
          );
        }
      }
    }
  }

  private publicationDependencyLifetimeOrdinal(
    plan: KernelPublicationPlan,
    nextByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
  ): number | null {
    let lifetimeOrdinal = plan.minimumLifetimeOrdinal;
    for (const record of plan.batch.records) {
      for (const reference of referencedKernelRecordHandles(record)) {
        if (nextByHandle.has(reference)) {
          continue;
        }
        lifetimeOrdinal = maxOptionalOrdinal(
          lifetimeOrdinal,
          this.recordLifetimeOrdinalByHandle.get(reference) ?? null,
        );
      }
    }
    for (const publication of plan.productDetails) {
      if (!nextByHandle.has(publication.productHandle)) {
        lifetimeOrdinal = maxOptionalOrdinal(
          lifetimeOrdinal,
          this.recordLifetimeOrdinalByHandle.get(publication.productHandle) ?? null,
        );
      }
    }
    for (const publication of plan.hotDetails) {
      if (!nextByHandle.has(publication.ownerProductHandle)) {
        lifetimeOrdinal = maxOptionalOrdinal(
          lifetimeOrdinal,
          this.recordLifetimeOrdinalByHandle.get(publication.ownerProductHandle) ?? null,
        );
      }
    }
    for (const snapshot of plan.productDetailAdmissionSnapshots) {
      if (snapshot.expectedEntry != null) {
        lifetimeOrdinal = maxOptionalOrdinal(
          lifetimeOrdinal,
          this.productDetails.readLifetimeOrdinal(snapshot.productHandle),
        );
      }
    }
    for (const snapshot of plan.hotDetailAdmissionSnapshots) {
      if (snapshot.expectedEntry != null) {
        lifetimeOrdinal = maxOptionalOrdinal(
          lifetimeOrdinal,
          this.hotDetails.readLifetimeOrdinal(snapshot.handle),
        );
      }
    }
    return lifetimeOrdinal;
  }

  private recordPublicationDecisions(
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    nextByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
  ): ReadonlyMap<KernelRecordHandle, KernelPublicationDecisionKind> {
    const decisions = new Map<KernelRecordHandle, KernelPublicationDecisionKind>();
    for (const handle of previousRecordHandles) {
      const next = nextByHandle.get(handle) ?? null;
      const previous = this.records.get(handle) ?? null;
      decisions.set(
        handle,
        next == null || previous == null
          ? KernelPublicationDecisionKind.Withdraw
          : compareKernelRecords(previous, next),
      );
    }
    for (const handle of nextByHandle.keys()) {
      if (!previousRecordHandles.has(handle)) {
        decisions.set(handle, KernelPublicationDecisionKind.Publish);
      }
    }
    return decisions;
  }

  private publicationComparisonContext(
    nextByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousHandles: ReadonlySet<KernelRecordHandle>,
  ): KernelPublicationComparisonContext {
    return {
      readPrevious: (handle) => this.records.get(handle) ?? null,
      readNext: (handle) => nextByHandle.get(handle)
        ?? (previousHandles.has(handle) ? null : this.records.get(handle) ?? null),
    };
  }

  private prepareProductDetailPublication(
    previousHandles: ReadonlySet<ProductHandle>,
    nextByHandle: ReadonlyMap<ProductHandle, KernelProductDetailPublication<unknown>>,
    nextRecordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    recordDecisions: ReadonlyMap<KernelRecordHandle, KernelPublicationDecisionKind>,
    comparisonContext: KernelPublicationComparisonContext,
    label: string,
  ): PreparedProductDetailPublication {
    const ownedHandles: ProductHandle[] = [];
    const add: KernelProductDetailPublication<unknown>[] = [];
    const remove = new Set<ProductHandle>();
    const decisions: KernelPublicationDecision[] = [];

    for (const handle of previousHandles) {
      const publication = nextByHandle.get(handle) ?? null;
      const existing = this.productDetails.readEntry(handle);
      if (publication == null) {
        remove.add(handle);
        decisions.push(new KernelPublicationDecision(
          handle,
          KernelPublicationSurface.ProductDetail,
          existing?.slot.detailKind ?? 'product-detail',
          KernelPublicationDecisionKind.Withdraw,
        ));
        continue;
      }
      if (existing == null) {
        throw new Error(`Publication ${label} lost owned product detail ${handle} before replacement.`);
      }
      this.validateProductDetailEnvelope(publication, nextRecordsByHandle, previousRecordHandles, label);
      let decision = compareProductDetailPublication(existing, publication, comparisonContext);
      const productDecision = recordDecisions.get(handle);
      if (decision === KernelPublicationDecisionKind.Retain && productDecision !== KernelPublicationDecisionKind.Retain) {
        decision = KernelPublicationDecisionKind.RefreshWitness;
      }
      ownedHandles.push(handle);
      decisions.push(new KernelPublicationDecision(
        handle,
        KernelPublicationSurface.ProductDetail,
        publication.slot.detailKind,
        decision,
      ));
      if (decision !== KernelPublicationDecisionKind.Retain) {
        remove.add(handle);
        add.push(publication);
      }
    }

    for (const [handle, publication] of nextByHandle) {
      if (previousHandles.has(handle)) {
        continue;
      }
      this.validateProductDetailEnvelope(publication, nextRecordsByHandle, previousRecordHandles, label);
      const existing = this.productDetails.readEntry(handle);
      if (existing != null) {
        if (
          publication.admission !== KernelDetailAdmission.IfAbsent
          || existing.slot.detailKind !== publication.slot.detailKind
        ) {
          throw new Error(
            `Publication ${label} cannot attach ${publication.slot.detailKind}; ${handle} already has `
            + `${existing.slot.detailKind}.`,
          );
        }
        continue;
      }
      ownedHandles.push(handle);
      add.push(publication);
      decisions.push(new KernelPublicationDecision(
        handle,
        KernelPublicationSurface.ProductDetail,
        publication.slot.detailKind,
        KernelPublicationDecisionKind.Publish,
      ));
    }

    return { ownedHandles, add, remove, decisions };
  }

  private validateProductDetailEnvelope(
    publication: KernelProductDetailPublication<unknown>,
    nextRecordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    label: string,
  ): void {
    const product = this.productInPublicationPostState(
      publication.productHandle,
      nextRecordsByHandle,
      previousRecordHandles,
    );
    if (product == null) {
      throw new Error(
        `Publication ${label} cannot attach ${publication.slot.detailKind}; product `
        + `${publication.productHandle} is absent from the post-state.`,
      );
    }
    if (product.productKindKey !== publication.slot.productKindKey) {
      throw new Error(
        `Publication ${label} cannot attach ${publication.slot.detailKind}; product `
        + `${publication.productHandle} has kind ${product.productKindKey}, expected ${publication.slot.productKindKey}.`,
      );
    }
  }

  private prepareHotDetailPublication(
    previousHandles: ReadonlySet<HotDetailHandle>,
    nextByHandle: ReadonlyMap<HotDetailHandle, KernelHotDetailPublication<unknown>>,
    nextRecordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    recordDecisions: ReadonlyMap<KernelRecordHandle, KernelPublicationDecisionKind>,
    comparisonContext: KernelPublicationComparisonContext,
    label: string,
  ): PreparedHotDetailPublication {
    const ownedHandles: HotDetailHandle[] = [];
    const add: KernelHotDetailPublication<unknown>[] = [];
    const remove = new Set<HotDetailHandle>();
    const decisions: KernelPublicationDecision[] = [];

    for (const handle of previousHandles) {
      const publication = nextByHandle.get(handle) ?? null;
      const existing = this.hotDetails.readEntry(handle);
      if (publication == null) {
        remove.add(handle);
        decisions.push(new KernelPublicationDecision(
          handle,
          KernelPublicationSurface.HotDetail,
          existing?.slot.detailKind ?? 'hot-detail',
          KernelPublicationDecisionKind.Withdraw,
        ));
        continue;
      }
      if (existing == null) {
        throw new Error(`Publication ${label} lost owned hot detail ${handle} before replacement.`);
      }
      this.validateHotDetailOwner(publication, nextRecordsByHandle, previousRecordHandles, label);
      if (existing.ownerProductHandle !== publication.ownerProductHandle) {
        throw new Error(
          `Publication ${label} cannot move hot detail ${handle} from owner `
          + `${existing.ownerProductHandle} to ${publication.ownerProductHandle}.`,
        );
      }
      let decision = compareHotDetailPublication(existing, publication, comparisonContext);
      const ownerDecision = recordDecisions.get(publication.ownerProductHandle);
      if (
        decision === KernelPublicationDecisionKind.Retain
        && ownerDecision != null
        && ownerDecision !== KernelPublicationDecisionKind.Retain
      ) {
        decision = KernelPublicationDecisionKind.RefreshWitness;
      }
      ownedHandles.push(handle);
      decisions.push(new KernelPublicationDecision(
        handle,
        KernelPublicationSurface.HotDetail,
        publication.slot.detailKind,
        decision,
      ));
      if (decision !== KernelPublicationDecisionKind.Retain) {
        remove.add(handle);
        add.push(publication);
      }
    }

    for (const [handle, publication] of nextByHandle) {
      if (previousHandles.has(handle)) {
        continue;
      }
      this.validateHotDetailOwner(publication, nextRecordsByHandle, previousRecordHandles, label);
      const existing = this.hotDetails.readEntry(handle);
      if (existing != null) {
        if (
          publication.admission !== KernelDetailAdmission.IfAbsent
          || existing.slot.detailKind !== publication.slot.detailKind
        ) {
          throw new Error(
            `Publication ${label} cannot attach ${publication.slot.detailKind}; ${handle} already has `
            + `${existing.slot.detailKind}.`,
          );
        }
        if (existing.ownerProductHandle !== publication.ownerProductHandle) {
          throw new Error(
            `Publication ${label} cannot reuse hot detail ${handle}; it is owned by `
            + `${existing.ownerProductHandle}, not ${publication.ownerProductHandle}.`,
          );
        }
        continue;
      }
      ownedHandles.push(handle);
      add.push(publication);
      decisions.push(new KernelPublicationDecision(
        handle,
        KernelPublicationSurface.HotDetail,
        publication.slot.detailKind,
        KernelPublicationDecisionKind.Publish,
      ));
    }
    return { ownedHandles, add, remove, decisions };
  }

  private validateHotDetailOwner(
    publication: KernelHotDetailPublication<unknown>,
    nextRecordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    label: string,
  ): void {
    const owner = this.productInPublicationPostState(
      publication.ownerProductHandle,
      nextRecordsByHandle,
      previousRecordHandles,
    );
    if (owner == null) {
      throw new Error(
        `Publication ${label} cannot attach ${publication.slot.detailKind}; owner product `
        + `${publication.ownerProductHandle} is absent from the post-state.`,
      );
    }
    if (owner.productKindKey !== publication.slot.ownerProductKindKey) {
      throw new Error(
        `Publication ${label} cannot attach ${publication.slot.detailKind}; owner product `
        + `${publication.ownerProductHandle} has kind ${owner.productKindKey}, expected `
        + `${publication.slot.ownerProductKindKey}.`,
      );
    }
  }

  private productInPublicationPostState(
    productHandle: ProductHandle,
    nextRecordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    recordDecisions: ReadonlyMap<KernelRecordHandle, KernelPublicationDecisionKind> | null = null,
  ): MaterializedProduct | null {
    if (recordDecisions?.get(productHandle) === KernelPublicationDecisionKind.Retain) {
      return this.products.get(productHandle) ?? null;
    }
    const staged = nextRecordsByHandle.get(productHandle) ?? null;
    if (staged != null) {
      return staged.kind === 'materialized-product' ? staged : null;
    }
    return previousRecordHandles.has(productHandle)
      ? null
      : this.products.get(productHandle) ?? null;
  }

  private validateSurvivingReferences(
    withdrawnHandles: ReadonlySet<KernelRecordHandle>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    label: string,
  ): void {
    if (withdrawnHandles.size === 0) {
      return;
    }
    for (const record of this.records.values()) {
      if (previousRecordHandles.has(record.handle)) {
        continue;
      }
      const dangling = referencedKernelRecordHandles(record).find((handle) => withdrawnHandles.has(handle));
      if (dangling != null) {
        throw new Error(
          `Publication ${label} cannot withdraw ${dangling}; surviving record ${record.handle} still references it.`,
        );
      }
    }
  }

  private validateNoForeignDetailRemoval(
    removedRecordHandles: ReadonlySet<KernelRecordHandle>,
    ownedProductDetailHandles: ReadonlySet<ProductHandle>,
    ownedHotDetailHandles: ReadonlySet<HotDetailHandle>,
    label: string,
  ): void {
    for (const handle of removedRecordHandles) {
      const record = this.records.get(handle) ?? null;
      if (
        record?.kind === 'materialized-product'
        && this.productDetails.readEntry(record.handle) != null
        && !ownedProductDetailHandles.has(record.handle)
      ) {
        throw new Error(
          `Publication ${label} cannot replace product ${record.handle}; its attached detail is owned elsewhere.`,
        );
      }
      if (record?.kind === 'materialized-product') {
        const foreignHotDetail = this.hotDetails.readByOwnerProduct(record.handle)
          .find((entry) => !ownedHotDetailHandles.has(entry.handle));
        if (foreignHotDetail != null) {
          throw new Error(
            `Publication ${label} cannot replace product ${record.handle}; hot detail `
            + `${foreignHotDetail.handle} is owned elsewhere.`,
          );
        }
      }
    }
  }

  private validateNoSidecarReplacement(
    removedProductDetailHandles: ReadonlySet<ProductHandle>,
    label: string,
  ): void {
    for (const index of this.sidecarIndexes.values()) {
      const handle = [...removedProductDetailHandles].find((candidate) => index.hasProductDetail(candidate));
      if (handle != null) {
        throw new Error(
          `Publication ${label} cannot replace sidecar-indexed detail ${handle}; `
          + `index ${index.key} has no registered lifecycle participant.`,
        );
      }
    }
  }

  private preparePublicationDetailBindings(
    productDetails: readonly KernelProductDetailPublication<unknown>[],
    hotDetails: readonly KernelHotDetailPublication<unknown>[],
    nextRecordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    previousRecordHandles: ReadonlySet<KernelRecordHandle>,
    recordDecisions: ReadonlyMap<KernelRecordHandle, KernelPublicationDecisionKind>,
  ): {
    readonly productDetails: readonly PreparedProductDetailEntry<unknown>[];
    readonly hotDetails: readonly PreparedHotDetailEntry<unknown>[];
  } {
    const ownerByDetail = new Map<object, string>();
    const preparedProductDetails: PreparedProductDetailEntry<unknown>[] = [];
    const preparedHotDetails: PreparedHotDetailEntry<unknown>[] = [];
    for (const publication of productDetails) {
      const product = this.productInPublicationPostState(
        publication.productHandle,
        nextRecordsByHandle,
        previousRecordHandles,
        recordDecisions,
      );
      if (product == null) {
        throw new Error(`Cannot prebind product detail ${publication.productHandle}; product is absent.`);
      }
      validateUniqueDetailOwner(publication.detail, `product ${publication.productHandle}`, ownerByDetail);
      preparedProductDetails.push(this.productDetails.prepareReplacementEntry(
        publication.slot,
        product,
        publication.detail,
      ));
    }
    for (const publication of hotDetails) {
      const owner = this.productInPublicationPostState(
        publication.ownerProductHandle,
        nextRecordsByHandle,
        previousRecordHandles,
        recordDecisions,
      );
      if (owner == null) {
        throw new Error(
          `Cannot prebind hot detail ${publication.handle}; owner product `
          + `${publication.ownerProductHandle} is absent.`,
        );
      }
      validateUniqueDetailOwner(publication.detail, `hot detail ${publication.handle}`, ownerByDetail);
      preparedHotDetails.push(this.hotDetails.prepareReplacementEntry(
        publication.slot,
        owner,
        publication.handle,
        publication.detail,
      ));
    }
    return { productDetails: preparedProductDetails, hotDetails: preparedHotDetails };
  }

  private removeRecord(handle: KernelRecordHandle): void {
    const record = this.records.get(handle) ?? null;
    if (record == null) {
      return;
    }
    this.records.delete(handle);
    const orderIndex = this.recordOrder.indexOf(handle);
    if (orderIndex >= 0) {
      this.recordOrder.splice(orderIndex, 1);
    }
    this.recordLifetimeOrdinalByHandle.delete(handle);
    this.recordMutationOrdinalByHandle.delete(handle);
    this.handleCharacterCount -= record.handle.length;
    this.removeRecordFromIndexes(record);
  }

  markLifetime(): KernelStoreLifetimeMarker {
    return { nextLifetimeOrdinal: this.nextLifetimeOrdinal };
  }

  markObservation(): KernelStoreObservationMarker {
    return { nextMutationOrdinal: this.nextMutationOrdinal };
  }

  disposeSince(marker: KernelStoreLifetimeMarker): KernelStoreDisposalSummary {
    const productDetails = this.productDetails.removeAtOrAfterLifetime(marker.nextLifetimeOrdinal);
    const hotDetails = this.hotDetails.removeAtOrAfterLifetime(marker.nextLifetimeOrdinal);
    let records = 0;
    let handleCharacters = 0;
    for (const handle of [...this.recordOrder].reverse()) {
      if ((this.recordLifetimeOrdinalByHandle.get(handle) ?? -1) < marker.nextLifetimeOrdinal) {
        continue;
      }
      const record = this.records.get(handle) ?? null;
      if (record == null) {
        continue;
      }
      this.records.delete(handle);
      const orderIndex = this.recordOrder.indexOf(handle);
      if (orderIndex >= 0) {
        this.recordOrder.splice(orderIndex, 1);
      }
      this.recordLifetimeOrdinalByHandle.delete(handle);
      this.recordMutationOrdinalByHandle.delete(handle);
      this.handleCharacterCount -= record.handle.length;
      handleCharacters += record.handle.length;
      this.removeRecordFromIndexes(record);
      records += 1;
    }
    const summary = { records, productDetails, hotDetails, handleCharacters };
    this.computationLifecycle?.dispose({ marker, summary });
    for (const manifest of this.activePublicationOwners.keys()) {
      if ((manifest.lifetimeOrdinal ?? -1) >= marker.nextLifetimeOrdinal) {
        this.activePublicationOwners.delete(manifest);
      }
    }
    this.notifySidecarIndexes({ marker, summary });
    return summary;
  }

  /**
   * Reclaim direct answer-local entries without crossing active computation ownership.
   *
   * Unlike `disposeSince`, this does not retire computation generations. It preserves every entry
   * named by an active publication manifest, including publications committed after the marker.
   */
  disposeUnownedSince(marker: KernelStoreLifetimeMarker): KernelStoreDisposalSummary {
    const retainedRecordHandles = new Set<KernelRecordHandle>();
    const retainedProductDetailHandles = new Set<ProductHandle>();
    const retainedHotDetailHandles = new Set<HotDetailHandle>();
    for (const manifest of this.activePublicationOwners.keys()) {
      for (const handle of manifest.recordHandles) {
        retainedRecordHandles.add(handle);
      }
      for (const handle of manifest.productDetailHandles) {
        retainedProductDetailHandles.add(handle);
        retainedRecordHandles.add(handle);
      }
      for (const handle of manifest.hotDetailHandles) {
        retainedHotDetailHandles.add(handle);
        const ownerProductHandle = this.hotDetails.readEntry(handle)?.ownerProductHandle;
        if (ownerProductHandle != null) {
          retainedRecordHandles.add(ownerProductHandle);
        }
      }
    }
    this.expandRetainedRecordClosure(retainedRecordHandles);

    const productDetails = this.productDetails.removeUnretainedAtOrAfterLifetime(
      marker.nextLifetimeOrdinal,
      retainedProductDetailHandles,
    );
    const hotDetails = this.hotDetails.removeUnretainedAtOrAfterLifetime(
      marker.nextLifetimeOrdinal,
      retainedHotDetailHandles,
    );
    let records = 0;
    let handleCharacters = 0;
    for (const handle of [...this.recordOrder].reverse()) {
      if (
        retainedRecordHandles.has(handle)
        || (this.recordLifetimeOrdinalByHandle.get(handle) ?? -1) < marker.nextLifetimeOrdinal
      ) {
        continue;
      }
      const record = this.records.get(handle) ?? null;
      if (record == null) {
        continue;
      }
      this.removeRecord(handle);
      handleCharacters += record.handle.length;
      records += 1;
    }
    const summary = { records, productDetails, hotDetails, handleCharacters };
    this.notifySidecarIndexes({ marker, summary });
    return summary;
  }

  /** Keep every normalized record required to resolve an active publication's retained outputs. */
  private expandRetainedRecordClosure(retainedHandles: Set<KernelRecordHandle>): void {
    const pending = [...retainedHandles];
    for (let index = 0; index < pending.length; index += 1) {
      const record = this.records.get(pending[index]!) ?? null;
      if (record == null) {
        continue;
      }
      for (const reference of referencedKernelRecordHandles(record)) {
        if (retainedHandles.has(reference)) {
          continue;
        }
        retainedHandles.add(reference);
        pending.push(reference);
      }
    }
  }

  /** Admit the one computation lifecycle allowed to own replaceable publications in this store. */
  registerComputationLifecycle(lifecycle: KernelStoreComputationLifecycle): void {
    if (this.computationLifecycle != null && this.computationLifecycle !== lifecycle) {
      throw new Error('Kernel store already has a computation lifecycle registry.');
    }
    this.computationLifecycle = lifecycle;
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

  /** Exact store-local revision for a normalized record, including witness-only replacement. */
  readRecordRevision(handle: KernelRecordHandle): number | null {
    return this.recordMutationOrdinalByHandle.get(handle) ?? null;
  }

  /** Store-local ownership lifetime for a positive kernel-record dependency. */
  readRecordLifetimeOrdinal(handle: KernelRecordHandle): number | null {
    return this.recordLifetimeOrdinalByHandle.get(handle) ?? null;
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
    const normalizedFileName = normalizeHostPath(fileName);
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
  readKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot {
    return {
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
  }

  readTelemetrySnapshot(
    options: SemanticRuntimeKernelTelemetryOptions = {},
  ): SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot {
    const counts = this.readKernelCountSnapshot();
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
          ? this.readDetailDensitySince({ nextMutationOrdinal: 0 })
        : {}),
    };
  }

  readDetailDensitySince(marker: KernelStoreObservationMarker): KernelStoreDetailDensityDelta {
    return {
      productDetailDensity: readSemanticRuntimeDetailDensityRows(
        this.productDetails.readEntriesChangedSince(marker.nextMutationOrdinal).map((entry) => {
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
        this.hotDetails.readEntriesChangedSince(marker.nextMutationOrdinal).map((entry) => ({
          detailKind: entry.slot.detailKind,
          detail: entry.detail,
          envelopeHandles: [entry.ownerProductHandle, entry.handle],
        })),
      ),
    };
  }

  readDensitySince(marker: KernelStoreObservationMarker): KernelStoreDensityDelta {
    const recordKinds = new Map<string, number>();
    const sourceSpanRoles = new Map<string, number>();
    const productKinds = new Map<string, number>();
    for (const handle of this.recordOrder) {
      if ((this.recordMutationOrdinalByHandle.get(handle) ?? -1) < marker.nextMutationOrdinal) {
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
      productDetailKinds: countDetailKindRows(
        this.productDetails.readEntriesChangedSince(marker.nextMutationOrdinal),
      ),
      hotDetailKinds: countDetailKindRows(
        this.hotDetails.readEntriesChangedSince(marker.nextMutationOrdinal),
      ),
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
        case 'observation-identity':
        case 'configuration-identity':
        case 'framework-identity':
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
    replacedHandles: ReadonlySet<KernelRecordHandle> = new Set(),
  ): void {
    for (const record of batch.records) {
      if (record.kind === 'materialized-product') {
        this.validateProduct(record, pending, batchLabel);
      }
    }
    for (const record of batch.records) {
      if (record.kind === 'semantic-claim') {
        this.validateClaim(record, pending, batchLabel, replacedHandles);
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
    replacedHandles: ReadonlySet<KernelRecordHandle>,
  ): void {
    const definition = readClaimPredicateDefinition(claim.predicateKey);
    const signature = definition?.claimSignature;
    if (signature == null) {
      throw new Error(
        `Invalid claim predicate while committing ${batchLabel}: ${claim.handle} uses ${claim.predicateKey}.`,
      );
    }

    this.validateClaimEndpoint(claim, 'subject', claim.subjectHandle, signature.subject, pending, batchLabel, replacedHandles);
    this.validateClaimEndpoint(claim, 'object', claim.objectHandle, signature.object, pending, batchLabel, replacedHandles);
  }

  private validateClaimEndpoint(
    claim: SemanticClaim,
    side: 'subject' | 'object',
    handle: AddressHandle | IdentityHandle | ProductHandle,
    signature: { readonly endpointKinds: readonly KernelClaimEndpointKind[]; readonly productKinds: readonly ProductKindKey[] },
    pending: KernelStoreCommitIndex,
    batchLabel: string,
    replacedHandles: ReadonlySet<KernelRecordHandle>,
  ): void {
    const address = pending.addresses.get(handle as AddressHandle)
      ?? (replacedHandles.has(handle) ? null : this.addresses.get(handle as AddressHandle) ?? null);
    const identity = pending.identities.get(handle as IdentityHandle)
      ?? (replacedHandles.has(handle) ? null : this.identities.get(handle as IdentityHandle) ?? null);
    const product = pending.products.get(handle as ProductHandle)
      ?? (replacedHandles.has(handle) ? null : this.products.get(handle as ProductHandle) ?? null);
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
      case 'observation-identity':
      case 'configuration-identity':
      case 'framework-identity':
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
      case 'observation-identity':
      case 'configuration-identity':
      case 'framework-identity':
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

function maxOptionalOrdinal(left: number | null, right: number | null): number | null {
  return left == null ? right : right == null ? left : Math.max(left, right);
}

function normalizedProductDetailPublications(
  publications: readonly KernelProductDetailPublication<unknown>[],
  label: string,
): ReadonlyMap<ProductHandle, KernelProductDetailPublication<unknown>> {
  const byHandle = new Map<ProductHandle, KernelProductDetailPublication<unknown>>();
  for (const publication of publications) {
    const existing = byHandle.get(publication.productHandle);
    if (existing == null) {
      byHandle.set(publication.productHandle, publication);
      continue;
    }
    if (existing.slot.detailKind !== publication.slot.detailKind) {
      throw new Error(
        `Publication ${label} stages conflicting detail slots for ${publication.productHandle}: `
        + `${existing.slot.detailKind} and ${publication.slot.detailKind}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      continue;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      byHandle.set(publication.productHandle, publication);
      continue;
    }
    throw new Error(`Publication ${label} stages duplicate product detail ${publication.productHandle}.`);
  }
  return byHandle;
}

function normalizedHotDetailPublications(
  publications: readonly KernelHotDetailPublication<unknown>[],
  label: string,
): ReadonlyMap<HotDetailHandle, KernelHotDetailPublication<unknown>> {
  const byHandle = new Map<HotDetailHandle, KernelHotDetailPublication<unknown>>();
  for (const publication of publications) {
    const existing = byHandle.get(publication.handle);
    if (existing == null) {
      byHandle.set(publication.handle, publication);
      continue;
    }
    if (existing.slot.detailKind !== publication.slot.detailKind) {
      throw new Error(
        `Publication ${label} stages conflicting hot-detail slots for ${publication.handle}: `
        + `${existing.slot.detailKind} and ${publication.slot.detailKind}.`,
      );
    }
    if (existing.ownerProductHandle !== publication.ownerProductHandle) {
      throw new Error(
        `Publication ${label} stages conflicting owners for hot detail ${publication.handle}: `
        + `${existing.ownerProductHandle} and ${publication.ownerProductHandle}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      continue;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      byHandle.set(publication.handle, publication);
      continue;
    }
    throw new Error(`Publication ${label} stages duplicate hot detail ${publication.handle}.`);
  }
  return byHandle;
}

function validateUniqueDetailOwner(
  detail: unknown,
  owner: string,
  ownerByDetail: Map<object, string>,
): void {
  if (detail == null || typeof detail !== 'object') {
    return;
  }
  const existingOwner = ownerByDetail.get(detail);
  if (existingOwner != null && existingOwner !== owner) {
    throw new Error(`One detail object cannot be staged for both ${existingOwner} and ${owner}.`);
  }
  ownerByDetail.set(detail, owner);
}

function compareProductDetailPublication(
  previous: ProductDetailEntry<unknown>,
  next: KernelProductDetailPublication<unknown>,
  context: KernelPublicationComparisonContext,
): KernelPublicationDecisionKind {
  if (previous.slot.detailKind !== next.slot.detailKind) {
    return KernelPublicationDecisionKind.Replace;
  }
  if (previous.detail === next.detail) {
    return KernelPublicationDecisionKind.Retain;
  }
  return next.compare?.(previous.detail, next.detail, context) ?? KernelPublicationDecisionKind.Replace;
}

function compareHotDetailPublication(
  previous: HotDetailEntry<unknown>,
  next: KernelHotDetailPublication<unknown>,
  context: KernelPublicationComparisonContext,
): KernelPublicationDecisionKind {
  if (previous.slot.detailKind !== next.slot.detailKind) {
    return KernelPublicationDecisionKind.Replace;
  }
  if (previous.detail === next.detail) {
    return KernelPublicationDecisionKind.Retain;
  }
  return next.compare?.(previous.detail, next.detail, context) ?? KernelPublicationDecisionKind.Replace;
}

function handlesForDecision<THandle extends string>(
  decisions: ReadonlyMap<THandle, KernelPublicationDecisionKind>,
  decision: KernelPublicationDecisionKind,
): ReadonlySet<THandle> {
  return handlesForDecisions(decisions, [decision]);
}

function handlesForDecisions<THandle extends string>(
  decisions: ReadonlyMap<THandle, KernelPublicationDecisionKind>,
  expected: readonly KernelPublicationDecisionKind[],
): ReadonlySet<THandle> {
  const accepted = new Set(expected);
  return new Set([...decisions]
    .filter(([, decision]) => accepted.has(decision))
    .map(([handle]) => handle));
}

function publicationDecisionRows<THandle extends string>(
  decisions: ReadonlyMap<THandle, KernelPublicationDecisionKind>,
  surface: KernelPublicationSurface,
  detailKind: (handle: THandle) => string,
): readonly KernelPublicationDecision[] {
  return [...decisions].map(([handle, decision]) => new KernelPublicationDecision(
    handle,
    surface,
    detailKind(handle),
    decision,
  ));
}

function sourcePathMatchScore(
  addressPath: string,
  normalizedFileName: string,
): number {
  const normalizedAddressPath = normalizeHostPath(addressPath);
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
  const normalized = normalizeHostPath(fileName);
  const parts = normalized.split('/').filter((part) => part.length > 0);
  const suffixes = new Set<string>([normalized]);
  for (let index = 0; index < parts.length; index++) {
    suffixes.add(parts.slice(index).join('/'));
  }
  return [...suffixes];
}
