import {
  readHotDetailEntry,
  type HotDetailEntry,
  type HotDetailReadView,
  type HotDetailSlot,
  type PreparedHotDetailEntry,
} from './hot-details.js';
import type {
  KernelHandleFactory,
  KernelRecordHandle,
  HotDetailHandle,
  ProductHandle,
} from './handles.js';
import {
  readProductDetailEnvelope,
  type PreparedProductDetailEntry,
  type ProductDetailEntry,
  type ProductDetailReadView,
  type ProductDetailSlot,
} from './product-details.js';
import {
  KernelReadProjectionRevision,
  type KernelReadProjectionRevisionView,
  type KernelStore,
  type KernelMaterializationReadView,
  type KernelRecordCollectionReadView,
  type KernelSourceFileReadView,
  type KernelStoreDensityDelta,
  type KernelStoreDetailDensityDelta,
  type KernelStoreObservationMarker,
  type KernelStoreRecord,
  type KernelTelemetryReadView,
} from './store.js';
import { SourceFileAddress } from './address.js';
import {
  MaterializedProduct,
  sameMaterializedProductEnvelope,
  type MaterializationOwnerHandle,
  type MaterializationRecord,
} from './materialization.js';
import {
  isSemanticAddressRecord,
  isSemanticIdentityRecord,
  sourceFilePathMayMatchFileName,
} from './source-address.js';
import {
  countSemanticRuntimeRowsBy,
  type SemanticRuntimeKernelCountSnapshot,
} from '../telemetry/kernel-density.js';
import { readSemanticRuntimeDetailDensityRows } from '../telemetry/detail-density.js';
import type { CurrentnessAuthority, GenerationAuthority } from './generation-authority.js';
import { KernelPublicationSurface } from './publication-surface.js';
import type { KernelDetailReferenceClosure } from './detail-references.js';
import type { KernelPublicationDecisionKind } from './publication-comparison.js';

export {
  KernelPublicationDecisionKind,
  type KernelComparablePublicationDecision,
  type KernelDetailComparator,
  type KernelPublicationComparisonContext,
} from './publication-comparison.js';

/** How a staged detail behaves when its handle is already owned by another publication. */
export const enum KernelDetailAdmission {
  /** The detail is owned by this publication and an unrelated existing detail is an error. */
  Required = 'required',
  /** Reuse an unrelated existing detail with the same slot instead of claiming ownership. */
  IfAbsent = 'if-absent',
}

/** One typed product-detail attachment staged beside its kernel product envelope. */
export class KernelProductDetailPublication<TDetail> {
  readonly references: KernelDetailReferenceClosure;

  constructor(
    readonly slot: ProductDetailSlot<TDetail>,
    readonly productHandle: ProductHandle,
    readonly detail: TDetail,
    readonly admission: KernelDetailAdmission = KernelDetailAdmission.Required,
  ) {
    this.references = slot.referencesFor(detail);
    Object.freeze(this);
  }
}

/** One typed epoch-local hot detail staged beside a computation publication. */
export class KernelHotDetailPublication<TDetail> {
  readonly references: KernelDetailReferenceClosure;

  constructor(
    readonly slot: HotDetailSlot<TDetail>,
    readonly ownerProductHandle: ProductHandle,
    readonly handle: HotDetailHandle,
    readonly detail: TDetail,
    readonly admission: KernelDetailAdmission = KernelDetailAdmission.Required,
  ) {
    this.references = slot.referencesFor(detail);
    Object.freeze(this);
  }
}

/** Seal one normalized record and every embedded collection at its publication boundary. */
function sealKernelRecord<TRecord extends KernelStoreRecord>(record: TRecord): TRecord {
  switch (record.kind) {
    case 'template-node-address':
      Object.freeze(record.path);
      break;
    case 'evidence-record':
      Object.freeze(record.roles);
      break;
    case 'provenance-record':
      Object.freeze(record.evidenceHandles);
      break;
    case 'open-seam':
      Object.freeze(record.reasonKinds);
      for (const source of record.reasonSources) {
        Object.freeze(source);
      }
      Object.freeze(record.reasonSources);
      break;
    case 'materialization-record':
      Object.freeze(record.productHandles);
      Object.freeze(record.claimHandles);
      Object.freeze(record.openSeamHandles);
      break;
    case 'source-file-address':
    case 'source-span-address':
    case 'template-address':
    case 'generated-address':
    case 'external-address':
    case 'typescript-declaration-identity':
    case 'aurelia-resource-identity':
    case 'aurelia-attribute-pattern-identity':
    case 'container-identity':
    case 'di-product-identity':
    case 'di-key-identity':
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
    case 'semantic-claim':
    case 'materialized-product':
      break;
  }
  return Object.freeze(record);
}

/** Coherent normalized-record emission carried by an immediate or staged publication. */
export class KernelStoreBatch {
  readonly records: readonly KernelStoreRecord[];
  readonly label: string | null;

  constructor(
    /** Normalized records emitted together by one analysis step. */
    records: readonly KernelStoreRecord[] = [],
    /** Optional non-semantic label for debugging and inquiry traces. */
    label: string | null = null,
  ) {
    this.records = Object.freeze(records.map(sealKernelRecord));
    this.label = label;
    Object.freeze(this);
  }
}

export function publishProductDetail<TDetail>(
  slot: ProductDetailSlot<TDetail>,
  productHandle: ProductHandle,
  detail: TDetail,
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
): KernelProductDetailPublication<unknown> {
  return new KernelProductDetailPublication(
    slot,
    productHandle,
    detail,
    admission,
  );
}

export function publishHotDetail<TDetail>(
  slot: HotDetailSlot<TDetail>,
  ownerProductHandle: ProductHandle,
  handle: HotDetailHandle,
  detail: TDetail,
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
): KernelHotDetailPublication<unknown> {
  return new KernelHotDetailPublication(
    slot,
    ownerProductHandle,
    handle,
    detail,
    admission,
  );
}

export function publishProductDetails<TDetail extends { readonly productHandle: ProductHandle }>(
  slot: ProductDetailSlot<TDetail>,
  details: readonly TDetail[],
  admission: KernelDetailAdmission = KernelDetailAdmission.Required,
): readonly KernelProductDetailPublication<unknown>[] {
  return details.map((detail) => publishProductDetail(slot, detail.productHandle, detail, admission));
}

/** Complete staged mutation emitted by one or more materializer phases. */
export class KernelPublicationPlan {
  readonly batch: KernelStoreBatch;
  readonly productDetails: readonly KernelProductDetailPublication<unknown>[];
  readonly hotDetails: readonly KernelHotDetailPublication<unknown>[];
  readonly productDetailAdmissionSnapshots: readonly KernelProductDetailAdmissionSnapshot[];
  readonly hotDetailAdmissionSnapshots: readonly KernelHotDetailAdmissionSnapshot[];

  constructor(
    batch: KernelStoreBatch,
    productDetails: readonly KernelProductDetailPublication<unknown>[] = [],
    hotDetails: readonly KernelHotDetailPublication<unknown>[] = [],
    /** Foreign product-detail admission decisions observed by a staged run. */
    productDetailAdmissionSnapshots: readonly KernelProductDetailAdmissionSnapshot[] = [],
    /** Foreign hot-detail admission decisions observed by a staged run. */
    hotDetailAdmissionSnapshots: readonly KernelHotDetailAdmissionSnapshot[] = [],
  ) {
    this.batch = batch;
    this.productDetails = Object.freeze([...productDetails]);
    this.hotDetails = Object.freeze([...hotDetails]);
    this.productDetailAdmissionSnapshots = Object.freeze([...productDetailAdmissionSnapshots]);
    this.hotDetailAdmissionSnapshots = Object.freeze([...hotDetailAdmissionSnapshots]);
    Object.freeze(this);
  }

}

/** One exact publication entry named by carry or decision-preview authority. */
export interface KernelPublicationEntryDescriptor {
  readonly surface: KernelPublicationSurface;
  readonly handle: string;
  readonly detailKind: string;
}

/** Store revision captured when a staged operation consumes one exact committed entry. */
export class KernelCommittedEntryRevision {
  constructor(
    readonly actualKind: string | null,
    readonly mutationOrdinal: number | null,
    readonly lifetimeOrdinal: number | null,
  ) {
    Object.freeze(this);
  }
}

declare const kernelPublicationWriterIdBrand: unique symbol;

/** Run-local writer identity retained while one outer publication is being staged. */
export type KernelPublicationWriterId = string & { readonly [kernelPublicationWriterIdBrand]: true };

/** Exact candidate revision captured when a staged read consumes another run-local write. */
export class KernelStagedEntryRevision {
  private constructor(
    /** Null for the candidate-local absence created by hiding this computation's prior generation. */
    readonly writerId: KernelPublicationWriterId | null,
    readonly surface: KernelPublicationSurface,
    readonly handle: string,
    readonly actualKind: string | null,
    readonly mutationOrdinal: number | null,
  ) {
    Object.freeze(this);
  }

  static absent(surface: KernelPublicationSurface, handle: string): KernelStagedEntryRevision {
    return new KernelStagedEntryRevision(null, surface, handle, null, null);
  }

  static present(
    writerId: KernelPublicationWriterId,
    surface: KernelPublicationSurface,
    handle: string,
    actualKind: string,
    mutationOrdinal: number,
  ): KernelStagedEntryRevision {
    return new KernelStagedEntryRevision(writerId, surface, handle, actualKind, mutationOrdinal);
  }
}

/** Exact staged lookup plus the foreign committed revision that supplied it, when one did. */
export class StagedKernelRead<TValue> {
  constructor(
    readonly value: TValue | null,
    readonly committedRevision: KernelCommittedEntryRevision | null,
    readonly stagedRevision: KernelStagedEntryRevision | null,
  ) {}
}

/** Candidate-normalized owner membership plus the committed and staged rows that supplied it. */
export class StagedKernelMaterializationOwnerRead {
  readonly records: readonly MaterializationRecord[];
  readonly committedRecords: readonly MaterializationRecord[];
  readonly stagedRecords: readonly MaterializationRecord[];
  readonly excludedRecordHandles: readonly KernelRecordHandle[];

  constructor(
    records: readonly MaterializationRecord[],
    committedRecords: readonly MaterializationRecord[],
    stagedRecords: readonly MaterializationRecord[],
    excludedRecordHandles: readonly KernelRecordHandle[],
  ) {
    this.records = Object.freeze([...records]);
    this.committedRecords = Object.freeze([...committedRecords]);
    this.stagedRecords = Object.freeze([...stagedRecords]);
    this.excludedRecordHandles = Object.freeze([...excludedRecordHandles]);
    Object.freeze(this);
  }
}

/** Exact staged-plus-prospective kernel projection retained by one child's rebased domain reads. */
export interface KernelProspectiveCarryReadView extends ProductDetailReadView, KernelReadProjectionRevisionView {
  readonly outputEntriesByKey: ReadonlyMap<string, KernelPublicationEntryDescriptor>;
  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[];
  /** Preview-owned product publication whose projected closure may be reused only by this carry attempt. */
  readProductDetailPublication(productHandle: ProductHandle): KernelProductDetailPublication<unknown> | null;
  /** Preview-owned hot publication whose projected closure may be reused only by this carry attempt. */
  readHotDetailPublication(handle: HotDetailHandle): KernelHotDetailPublication<unknown> | null;
}

class StagedKernelProspectiveCarryReadView implements KernelProspectiveCarryReadView {
  private ownerSnapshotRevision: KernelReadProjectionRevision | null = null;
  private readonly ownerSnapshots = new Map<MaterializationOwnerHandle, readonly MaterializationRecord[]>();
  private readonly productDetailPublications = new Map<ProductHandle, KernelProductDetailPublication<unknown>>();
  private readonly hotDetailPublications = new Map<HotDetailHandle, KernelHotDetailPublication<unknown>>();

  constructor(
    private readonly publications: StagedKernelPublicationContext,
    private readonly materializationsByOwner: ReadonlyMap<
      MaterializationOwnerHandle,
      readonly MaterializationRecord[]
    >,
    private readonly productDetailsByHandle: ReadonlyMap<ProductHandle, ProductDetailEntry<unknown>>,
    private readonly hotDetailsByHandle: ReadonlyMap<HotDetailHandle, HotDetailEntry<unknown>>,
    readonly outputEntriesByKey: ReadonlyMap<string, KernelPublicationEntryDescriptor>,
  ) {}

  readProjectionRevision(): KernelReadProjectionRevision {
    const current = this.publications.readProjectionRevision();
    return new KernelReadProjectionRevision(
      this,
      current.committedMutationOrdinal,
      current.candidateMutationOrdinal,
    );
  }

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    this.refreshOwnerSnapshots();
    const existing = this.ownerSnapshots.get(ownerHandle);
    if (existing != null) return existing;
    const records = new Map(
      this.publications.previewMaterializationOwnerCandidate(ownerHandle).records
        .map((record) => [record.handle, record]),
    );
    for (const record of this.materializationsByOwner.get(ownerHandle) ?? []) {
      records.set(record.handle, record);
    }
    const snapshot = Object.freeze(
      [...records.values()].sort((left, right) => left.handle.localeCompare(right.handle)),
    );
    this.ownerSnapshots.set(ownerHandle, snapshot);
    return snapshot;
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    return this.publications.previewProductDetailAfterCarry(
      slot,
      productHandle,
      this.productDetailsByHandle.get(productHandle) ?? null,
    );
  }

  readProductDetailPublication(productHandle: ProductHandle): KernelProductDetailPublication<unknown> | null {
    const existing = this.productDetailPublications.get(productHandle);
    if (existing != null) return existing;
    const entry = this.productDetailsByHandle.get(productHandle) ?? null;
    if (entry == null) return null;
    const publication = new KernelProductDetailPublication(entry.slot, productHandle, entry.detail);
    this.productDetailPublications.set(productHandle, publication);
    return publication;
  }

  readHotDetailPublication(handle: HotDetailHandle): KernelHotDetailPublication<unknown> | null {
    const existing = this.hotDetailPublications.get(handle);
    if (existing != null) return existing;
    const entry = this.hotDetailsByHandle.get(handle) ?? null;
    if (entry == null) return null;
    const publication = new KernelHotDetailPublication(
      entry.slot,
      entry.ownerProductHandle,
      handle,
      entry.detail,
    );
    this.hotDetailPublications.set(handle, publication);
    return publication;
  }

  private refreshOwnerSnapshots(): void {
    const current = this.publications.readProjectionRevision();
    if (this.ownerSnapshotRevision?.equals(current) === true) return;
    this.ownerSnapshotRevision = current;
    this.ownerSnapshots.clear();
  }
}

/** Exact foreign product-detail entry, or absence, used by one staged admission decision. */
export class KernelProductDetailAdmissionSnapshot {
  constructor(
    readonly productHandle: ProductHandle,
    readonly detailKind: string,
    readonly expectedEntry: ProductDetailEntry<unknown> | null,
    readonly committedRevision: KernelCommittedEntryRevision,
  ) {
    Object.freeze(this);
  }
}

/** Exact foreign hot-detail entry, or absence, used by one staged admission decision. */
export class KernelHotDetailAdmissionSnapshot {
  constructor(
    readonly handle: HotDetailHandle,
    readonly detailKind: string,
    readonly expectedEntry: HotDetailEntry<unknown> | null,
    readonly committedRevision: KernelCommittedEntryRevision,
  ) {
    Object.freeze(this);
  }
}

/** Child writer whose `IfAbsent` publication consumed one exact committed product-detail decision. */
export class KernelProductDetailAdmissionAttempt {
  constructor(
    readonly writerId: KernelPublicationWriterId,
    readonly snapshot: KernelProductDetailAdmissionSnapshot,
  ) {
    Object.freeze(this);
  }
}

/** Child writer whose `IfAbsent` publication consumed one exact committed hot-detail decision. */
export class KernelHotDetailAdmissionAttempt {
  constructor(
    readonly writerId: KernelPublicationWriterId,
    readonly snapshot: KernelHotDetailAdmissionSnapshot,
  ) {
    Object.freeze(this);
  }
}

/** Exact store entries currently owned by one committed computation. */
export class KernelPublicationManifest {
  static readonly empty = new KernelPublicationManifest();

  readonly recordHandles: readonly KernelRecordHandle[];
  readonly productDetailHandles: readonly ProductHandle[];
  readonly hotDetailHandles: readonly HotDetailHandle[];
  /** Monotone lifetime inherited from this lineage or advanced to its youngest positive dependency. */
  readonly lifetimeOrdinal: number | null;

  constructor(
    recordHandles: readonly KernelRecordHandle[] = [],
    productDetailHandles: readonly ProductHandle[] = [],
    hotDetailHandles: readonly HotDetailHandle[] = [],
    lifetimeOrdinal: number | null = null,
  ) {
    this.recordHandles = Object.freeze([...recordHandles]);
    this.productDetailHandles = Object.freeze([...productDetailHandles]);
    this.hotDetailHandles = Object.freeze([...hotDetailHandles]);
    this.lifetimeOrdinal = lifetimeOrdinal;
    Object.freeze(this);
  }
}

/** One retain/refresh/replace/withdraw decision in an admitted publication. */
export class KernelPublicationDecision {
  constructor(
    readonly handle: string,
    readonly surface: KernelPublicationSurface,
    readonly detailKind: string,
    readonly decision: KernelPublicationDecisionKind,
  ) {
    Object.freeze(this);
  }
}

/** Result of atomically replacing one prior manifest. */
export class KernelPublicationReplacement {
  readonly decisions: readonly KernelPublicationDecision[];

  constructor(
    readonly manifest: KernelPublicationManifest,
    decisions: readonly KernelPublicationDecision[],
  ) {
    this.decisions = Object.freeze([...decisions]);
    Object.freeze(this);
  }
}

const sealedKernelPublicationCandidateAuthority = Object.freeze({});
const kernelPublicationDecisionPreviewCandidateAuthority = Object.freeze({});
const sealedKernelPublicationCandidateLineages = new WeakMap<object, {
  readonly store: KernelStore;
  readonly previousPublication: KernelPublicationManifest;
}>();
const spentSealedKernelPublicationCandidates = new WeakSet<object>();
const kernelPublicationDecisionPreviewCandidates = new WeakSet<object>();

function publicationEntriesByKey(
  entries: readonly KernelPublicationEntryDescriptor[],
): ReadonlyMap<string, KernelPublicationEntryDescriptor> {
  const entriesByKey = new Map<string, KernelPublicationEntryDescriptor>();
  for (const entry of entries) {
    const snapshot = Object.freeze({
      surface: entry.surface,
      handle: entry.handle,
      detailKind: entry.detailKind,
    });
    const key = stagedRevisionKey(snapshot.surface, snapshot.handle);
    const existing = entriesByKey.get(key) ?? null;
    if (existing != null && existing.detailKind !== snapshot.detailKind) {
      throw new Error(`Publication entry ${key} has conflicting kinds ${existing.detailKind} and ${snapshot.detailKind}.`);
    }
    entriesByKey.set(key, snapshot);
  }
  return new ImmutableMapView(entriesByKey);
}

/** Read-only ownership transfer over a map that its producer will no longer mutate. */
class ImmutableMapView<TKey, TValue> implements ReadonlyMap<TKey, TValue> {
  readonly #source: ReadonlyMap<TKey, TValue>;

  constructor(source: ReadonlyMap<TKey, TValue>) {
    this.#source = source;
    Object.freeze(this);
  }

  get size(): number {
    return this.#source.size;
  }

  get(key: TKey): TValue | undefined {
    return this.#source.get(key);
  }

  has(key: TKey): boolean {
    return this.#source.has(key);
  }

  forEach(
    callbackfn: (value: TValue, key: TKey, map: ReadonlyMap<TKey, TValue>) => void,
    thisArg?: unknown,
  ): void {
    for (const [key, value] of this.#source) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  entries(): MapIterator<[TKey, TValue]> {
    return this.#source.entries();
  }

  keys(): MapIterator<TKey> {
    return this.#source.keys();
  }

  values(): MapIterator<TValue> {
    return this.#source.values();
  }

  [Symbol.iterator](): MapIterator<[TKey, TValue]> {
    return this.entries();
  }
}

function publicationEntryFromIndexes(
  indexes: readonly ReadonlyMap<string, KernelPublicationEntryDescriptor>[],
  key: string,
): KernelPublicationEntryDescriptor | null {
  for (let index = indexes.length - 1; index >= 0; index -= 1) {
    const entry = indexes[index]?.get(key);
    if (entry != null) return entry;
  }
  return null;
}

/** Final run-local publication authority minted only by sealing one exact staged store lineage. */
export class SealedKernelPublicationCandidate {
  readonly #retainedOutputsByKey: ReadonlyMap<string, KernelPublicationEntryDescriptor>;
  readonly #recordRevisions: ReadonlyMap<KernelRecordHandle, KernelStagedEntryRevision>;
  readonly #productDetailRevisions: ReadonlyMap<ProductHandle, KernelStagedEntryRevision>;
  readonly #hotDetailRevisions: ReadonlyMap<HotDetailHandle, KernelStagedEntryRevision>;
  readonly recordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>;
  readonly productDetailsByHandle: ReadonlyMap<ProductHandle, KernelProductDetailPublication<unknown>>;
  readonly hotDetailsByHandle: ReadonlyMap<HotDetailHandle, KernelHotDetailPublication<unknown>>;

  constructor(
    authority: object,
    store: KernelStore,
    previousPublication: KernelPublicationManifest,
    readonly plan: KernelPublicationPlan,
    retainedOutputsByKey: ReadonlyMap<string, KernelPublicationEntryDescriptor>,
    recordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
    productDetailsByHandle: ReadonlyMap<ProductHandle, KernelProductDetailPublication<unknown>>,
    hotDetailsByHandle: ReadonlyMap<HotDetailHandle, KernelHotDetailPublication<unknown>>,
    recordRevisions: ReadonlyMap<KernelRecordHandle, KernelStagedEntryRevision>,
    productDetailRevisions: ReadonlyMap<ProductHandle, KernelStagedEntryRevision>,
    hotDetailRevisions: ReadonlyMap<HotDetailHandle, KernelStagedEntryRevision>,
    readonly productDetailAdmissionAttempts: readonly KernelProductDetailAdmissionAttempt[],
    readonly hotDetailAdmissionAttempts: readonly KernelHotDetailAdmissionAttempt[],
  ) {
    if (authority !== sealedKernelPublicationCandidateAuthority) {
      throw new Error('Kernel publication candidates can only be minted by sealing staged publication.');
    }
    this.#retainedOutputsByKey = new ImmutableMapView(retainedOutputsByKey);
    this.recordsByHandle = new ImmutableMapView(recordsByHandle);
    this.productDetailsByHandle = new ImmutableMapView(productDetailsByHandle);
    this.hotDetailsByHandle = new ImmutableMapView(hotDetailsByHandle);
    this.#recordRevisions = recordRevisions;
    this.#productDetailRevisions = productDetailRevisions;
    this.#hotDetailRevisions = hotDetailRevisions;
    this.productDetailAdmissionAttempts = Object.freeze([...productDetailAdmissionAttempts]);
    this.hotDetailAdmissionAttempts = Object.freeze([...hotDetailAdmissionAttempts]);
    sealedKernelPublicationCandidateLineages.set(this, Object.freeze({ store, previousPublication }));
    Object.freeze(this);
  }

  explicitlyRetains(
    surface: KernelPublicationSurface,
    handle: string,
    detailKind: string,
  ): boolean {
    return this.#retainedOutputsByKey.get(stagedRevisionKey(surface, handle))?.detailKind === detailKind;
  }

  readStagedRevision(
    surface: KernelPublicationSurface,
    handle: string,
  ): KernelStagedEntryRevision | null {
    switch (surface) {
      case KernelPublicationSurface.Record:
        return this.#recordRevisions.get(handle as KernelRecordHandle) ?? null;
      case KernelPublicationSurface.ProductDetail:
        return this.#productDetailRevisions.get(handle as ProductHandle) ?? null;
      case KernelPublicationSurface.HotDetail:
        return this.#hotDetailRevisions.get(handle as HotDetailHandle) ?? null;
    }
  }
}

/** Consume one final candidate only against the exact store and prior manifest that minted it. */
export function consumeSealedKernelPublicationCandidate(
  candidate: SealedKernelPublicationCandidate,
  store: KernelStore,
): KernelPublicationManifest {
  const lineage = sealedKernelPublicationCandidateLineages.get(candidate) ?? null;
  if (lineage == null) {
    throw new Error('Kernel publication decision candidate authority was not minted by sealed staged publication.');
  }
  if (lineage.store !== store) {
    throw new Error('Kernel publication decision candidate belongs to a different kernel store.');
  }
  if (spentSealedKernelPublicationCandidates.has(candidate)) {
    throw new Error('Kernel publication decision candidate has already been spent.');
  }
  spentSealedKernelPublicationCandidates.add(candidate);
  return lineage.previousPublication;
}

function mintSealedKernelPublicationCandidate(
  store: KernelStore,
  previousPublication: KernelPublicationManifest,
  plan: KernelPublicationPlan,
  retainedOutputsByKey: ReadonlyMap<string, KernelPublicationEntryDescriptor>,
  recordsByHandle: ReadonlyMap<KernelRecordHandle, KernelStoreRecord>,
  productDetailsByHandle: ReadonlyMap<ProductHandle, KernelProductDetailPublication<unknown>>,
  hotDetailsByHandle: ReadonlyMap<HotDetailHandle, KernelHotDetailPublication<unknown>>,
  recordRevisions: ReadonlyMap<KernelRecordHandle, KernelStagedEntryRevision>,
  productDetailRevisions: ReadonlyMap<ProductHandle, KernelStagedEntryRevision>,
  hotDetailRevisions: ReadonlyMap<HotDetailHandle, KernelStagedEntryRevision>,
  productDetailAdmissionAttempts: readonly KernelProductDetailAdmissionAttempt[],
  hotDetailAdmissionAttempts: readonly KernelHotDetailAdmissionAttempt[],
): SealedKernelPublicationCandidate {
  return new SealedKernelPublicationCandidate(
    sealedKernelPublicationCandidateAuthority,
    store,
    previousPublication,
    plan,
    retainedOutputsByKey,
    recordsByHandle,
    productDetailsByHandle,
    hotDetailsByHandle,
    recordRevisions,
    productDetailRevisions,
    hotDetailRevisions,
    productDetailAdmissionAttempts,
    hotDetailAdmissionAttempts,
  );
}

/** Targeted carry-retention candidate that can be spent only by the non-mutating preview boundary. */
export class KernelPublicationDecisionPreviewCandidate {
  readonly #retainedOutputIndexes: readonly ReadonlyMap<string, KernelPublicationEntryDescriptor>[];
  readonly targets: readonly KernelPublicationEntryDescriptor[];

  constructor(
    authority: object,
    readonly previousPublication: KernelPublicationManifest,
    readonly label: string,
    targetsByKey: ReadonlyMap<string, KernelPublicationEntryDescriptor>,
    retainedOutputIndexes: readonly ReadonlyMap<string, KernelPublicationEntryDescriptor>[],
    private readonly readRecordValue: (handle: KernelRecordHandle) => KernelStoreRecord | null,
    private readonly readProductDetailValue:
      (handle: ProductHandle) => KernelProductDetailPublication<unknown> | null,
    private readonly readHotDetailValue:
      (handle: HotDetailHandle) => KernelHotDetailPublication<unknown> | null,
    private readonly hasPreviousRecordValue: (handle: KernelRecordHandle) => boolean,
    private readonly hasStagedRecordValue: (handle: KernelRecordHandle) => boolean,
    private readonly assertCurrentValue: () => void,
  ) {
    if (authority !== kernelPublicationDecisionPreviewCandidateAuthority) {
      throw new Error('Kernel publication decision preview candidates can only be minted by staged publication.');
    }
    this.targets = Object.freeze([...targetsByKey.values()]);
    this.#retainedOutputIndexes = Object.freeze([...retainedOutputIndexes]);
    kernelPublicationDecisionPreviewCandidates.add(this);
    Object.freeze(this);
  }

  explicitlyRetains(
    surface: KernelPublicationSurface,
    handle: string,
    detailKind: string,
  ): boolean {
    return publicationEntryFromIndexes(
      this.#retainedOutputIndexes,
      stagedRevisionKey(surface, handle),
    )?.detailKind === detailKind;
  }

  readRecord(handle: KernelRecordHandle): KernelStoreRecord | null {
    return this.readRecordValue(handle);
  }

  readProductDetail(handle: ProductHandle): KernelProductDetailPublication<unknown> | null {
    return this.readProductDetailValue(handle);
  }

  readHotDetail(handle: HotDetailHandle): KernelHotDetailPublication<unknown> | null {
    return this.readHotDetailValue(handle);
  }

  hasPreviousRecord(handle: KernelRecordHandle): boolean {
    return this.hasPreviousRecordValue(handle);
  }

  hasStagedRecord(handle: KernelRecordHandle): boolean {
    return this.hasStagedRecordValue(handle);
  }

  assertCurrent(): void {
    this.assertCurrentValue();
  }
}

/** Assert that decision preview received authority minted for preview rather than final replacement. */
export function assertKernelPublicationDecisionPreviewCandidate(
  candidate: KernelPublicationDecisionPreviewCandidate,
): void {
  if (!kernelPublicationDecisionPreviewCandidates.has(candidate)) {
    throw new Error('Kernel publication decision preview authority was not minted by staged publication.');
  }
}

function mintKernelPublicationDecisionPreviewCandidate(
  previousPublication: KernelPublicationManifest,
  label: string,
  targetsByKey: ReadonlyMap<string, KernelPublicationEntryDescriptor>,
  retainedOutputIndexes: readonly ReadonlyMap<string, KernelPublicationEntryDescriptor>[],
  readRecord: (handle: KernelRecordHandle) => KernelStoreRecord | null,
  readProductDetail: (handle: ProductHandle) => KernelProductDetailPublication<unknown> | null,
  readHotDetail: (handle: HotDetailHandle) => KernelHotDetailPublication<unknown> | null,
  hasPreviousRecord: (handle: KernelRecordHandle) => boolean,
  hasStagedRecord: (handle: KernelRecordHandle) => boolean,
  assertCurrent: () => void,
): KernelPublicationDecisionPreviewCandidate {
  return new KernelPublicationDecisionPreviewCandidate(
    kernelPublicationDecisionPreviewCandidateAuthority,
    previousPublication,
    label,
    targetsByKey,
    retainedOutputIndexes,
    readRecord,
    readProductDetail,
    readHotDetail,
    hasPreviousRecord,
    hasStagedRecord,
    assertCurrent,
  );
}

/** Required read/write boundary used by materializers in immediate or staged mode. */
export interface KernelPublicationContext
  extends KernelRecordCollectionReadView, KernelSourceFileReadView, KernelMaterializationReadView,
    ProductDetailReadView, HotDetailReadView,
    KernelTelemetryReadView,
    CurrentnessAuthority {
  publish(plan: KernelPublicationPlan): void;
}

/** Store publication view revoked with the committed computation generation that exposed it. */
export class GenerationBoundKernelPublicationContext implements KernelPublicationContext {
  constructor(
    private readonly delegate: KernelPublicationContext,
    private readonly authority: GenerationAuthority,
  ) {}

  get handles(): KernelHandleFactory {
    this.requireCurrent();
    return this.delegate.handles;
  }

  isCurrent(): boolean {
    return this.authority.isCurrent() && this.delegate.isCurrent();
  }

  requireCurrent(): void {
    this.authority.requireCurrent();
    this.delegate.requireCurrent();
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    this.requireCurrent();
    return this.delegate.read(handle);
  }

  readAllRecords(): readonly KernelStoreRecord[] {
    this.requireCurrent();
    return this.delegate.readAllRecords();
  }

  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[] {
    this.requireCurrent();
    return this.delegate.readSourceFileAddressesByFileName(fileName);
  }

  readMaterializations(): readonly MaterializationRecord[] {
    this.requireCurrent();
    return this.delegate.readMaterializations();
  }

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    this.requireCurrent();
    return this.delegate.readMaterializationsByOwner(ownerHandle);
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    this.requireCurrent();
    return this.delegate.readProductDetail(slot, productHandle);
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null {
    this.requireCurrent();
    return this.delegate.readHotDetail(slot, handle);
  }

  markObservation(): KernelStoreObservationMarker {
    this.requireCurrent();
    return this.delegate.markObservation();
  }

  readKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot {
    this.requireCurrent();
    return this.delegate.readKernelCountSnapshot();
  }

  readDensitySince(marker: KernelStoreObservationMarker): KernelStoreDensityDelta {
    this.requireCurrent();
    return this.delegate.readDensitySince(marker);
  }

  readDetailDensitySince(marker: KernelStoreObservationMarker): KernelStoreDetailDensityDelta {
    this.requireCurrent();
    return this.delegate.readDetailDensitySince(marker);
  }

  publish(plan: KernelPublicationPlan): void {
    this.requireCurrent();
    this.delegate.publish(plan);
  }
}

/** Run-local collector that keeps every materializer write invisible until lifecycle commit. */
export class StagedKernelPublicationContext implements KernelPublicationContext, KernelReadProjectionRevisionView {
  private readonly records = new Map<KernelRecordHandle, KernelStoreRecord>();
  private readonly productDetails = new Map<ProductHandle, KernelProductDetailPublication<unknown>>();
  private readonly hotDetails = new Map<HotDetailHandle, KernelHotDetailPublication<unknown>>();
  private readonly recordRevisions = new Map<KernelRecordHandle, KernelStagedEntryRevision>();
  private readonly productDetailRevisions = new Map<ProductHandle, KernelStagedEntryRevision>();
  private readonly hotDetailRevisions = new Map<HotDetailHandle, KernelStagedEntryRevision>();
  private readonly productDetailAdmissionSnapshots = new Map<ProductHandle, KernelProductDetailAdmissionSnapshot>();
  private readonly hotDetailAdmissionSnapshots = new Map<HotDetailHandle, KernelHotDetailAdmissionSnapshot>();
  private readonly productDetailAdmissionWriters = new Map<ProductHandle, Set<KernelPublicationWriterId>>();
  private readonly hotDetailAdmissionWriters = new Map<HotDetailHandle, Set<KernelPublicationWriterId>>();
  private carriedOutputsByKey = new Map<string, KernelPublicationEntryDescriptor>();
  private readonly stagedMaterializationsByOwner = new Map<
    MaterializationOwnerHandle,
    MaterializationRecord[]
  >();
  private readonly observedMaterializationOwners = new Set<MaterializationOwnerHandle>();
  private readonly prospectiveCarryReadViews = new WeakSet<KernelProspectiveCarryReadView>();
  private readonly previousRecordHandles: ReadonlySet<KernelRecordHandle>;
  private readonly previousProductDetailHandles: ReadonlySet<ProductHandle>;
  private readonly previousHotDetailHandles: ReadonlySet<HotDetailHandle>;
  private readonly baseKernelCounts: SemanticRuntimeKernelCountSnapshot;
  private nextMutationOrdinal = 0;
  private failedPublication: Error | null = null;
  private sealed = false;
  private candidateBindingsPreparedForCommit = false;
  private candidateBindingsFinished = false;
  private readonly stagedProductDetailBindings = new Map<
    KernelProductDetailPublication<unknown>,
    PreparedProductDetailEntry<unknown>
  >();
  private readonly stagedHotDetailBindings = new Map<
    KernelHotDetailPublication<unknown>,
    PreparedHotDetailEntry<unknown>
  >();

  constructor(
    private readonly store: KernelStore,
    private readonly previousPublication: KernelPublicationManifest,
    private readonly defaultWriterId: KernelPublicationWriterId,
  ) {
    this.previousRecordHandles = new Set(previousPublication.recordHandles);
    this.previousProductDetailHandles = new Set(previousPublication.productDetailHandles);
    this.previousHotDetailHandles = new Set(previousPublication.hotDetailHandles);
    this.baseKernelCounts = kernelCountsWithoutPreviousPublication(store, previousPublication);
  }

  get handles(): KernelHandleFactory {
    this.requireCurrent();
    return this.store.handles;
  }

  readProjectionRevision(): KernelReadProjectionRevision {
    this.requireCurrent();
    return new KernelReadProjectionRevision(
      this,
      this.store.readProjectionRevision().committedMutationOrdinal,
      this.nextMutationOrdinal,
    );
  }

  isCurrent(): boolean {
    return this.failedPublication == null;
  }

  requireCurrent(): void {
    this.assertHealthy();
  }

  read(handle: KernelRecordHandle): KernelStoreRecord | null {
    return this.readRecordWithRevision(handle).value;
  }

  /** Read one staged-or-committed record without mistaking this computation's own output for an input. */
  readRecordWithRevision(handle: KernelRecordHandle): StagedKernelRead<KernelStoreRecord> {
    this.requireCurrent();
    const staged = this.records.get(handle) ?? null;
    if (staged != null) {
      return new StagedKernelRead(staged, null, this.recordStagedRevision(staged));
    }
    if (this.previousRecordHandles.has(handle)) {
      return new StagedKernelRead<KernelStoreRecord>(
        null,
        null,
        KernelStagedEntryRevision.absent(KernelPublicationSurface.Record, handle),
      );
    }
    const committed = this.store.read(handle);
    return new StagedKernelRead(
      committed,
      new KernelCommittedEntryRevision(
        committed?.kind ?? null,
        this.store.readRecordRevision(handle),
        this.store.readRecordLifetimeOrdinal(handle),
      ),
      null,
    );
  }

  readAllRecords(): readonly KernelStoreRecord[] {
    this.requireCurrent();
    return [
      ...this.store.readAllRecords().filter((record) => !this.previousRecordHandles.has(record.handle)),
      ...this.records.values(),
    ];
  }

  readSourceFileAddressesByFileName(fileName: string): readonly SourceFileAddress[] {
    this.requireCurrent();
    const addresses = new Map(
      this.store.readSourceFileAddressesByFileName(fileName)
        .filter((address) => !this.previousRecordHandles.has(address.handle))
        .map((address) => [address.handle, address]),
    );
    for (const record of this.records.values()) {
      if (record instanceof SourceFileAddress && sourceFilePathMayMatchFileName(record, fileName)) {
        addresses.set(record.handle, record);
      }
    }
    return [...addresses.values()];
  }

  readMaterializations(): readonly MaterializationRecord[] {
    this.requireCurrent();
    const materializations = new Map(
      this.store.readMaterializations()
        .filter((record) => !this.previousRecordHandles.has(record.handle))
        .map((record) => [record.handle, record]),
    );
    for (const record of this.records.values()) {
      if (record.kind === 'materialization-record') {
        materializations.set(record.handle, record);
      }
    }
    return [...materializations.values()];
  }

  readMaterializationsByOwner(ownerHandle: MaterializationOwnerHandle): readonly MaterializationRecord[] {
    return this.readMaterializationOwnerCandidate(ownerHandle).records;
  }

  /** Read one exact owner set while retaining which rows are foreign inputs and which are candidate outputs. */
  readMaterializationOwnerCandidate(ownerHandle: MaterializationOwnerHandle): StagedKernelMaterializationOwnerRead {
    this.observeMaterializationOwner(ownerHandle);
    return this.previewMaterializationOwnerCandidate(ownerHandle);
  }

  /** Inspect one exact owner set without freezing candidate absence during speculative carry preflight. */
  previewMaterializationOwnerCandidate(ownerHandle: MaterializationOwnerHandle): StagedKernelMaterializationOwnerRead {
    this.requireCurrent();
    const committed = new Map(
      this.store.readMaterializationsByOwner(ownerHandle)
        .filter((record) => !this.previousRecordHandles.has(record.handle))
        .map((record) => [record.handle, record]),
    );
    const previous = this.store.readMaterializationsByOwner(ownerHandle)
      .filter((record) => this.previousRecordHandles.has(record.handle));
    const staged = [...this.stagedMaterializationsByOwner.get(ownerHandle) ?? []]
      .sort((left, right) => left.handle.localeCompare(right.handle));
    for (const record of staged) {
      committed.delete(record.handle);
    }
    const committedRecords = [...committed.values()].sort((left, right) => left.handle.localeCompare(right.handle));
    const records = [...committedRecords, ...staged].sort((left, right) => left.handle.localeCompare(right.handle));
    return new StagedKernelMaterializationOwnerRead(
      records,
      committedRecords,
      staged,
      [...new Set([...previous, ...staged].map((record) => record.handle))].sort(),
    );
  }

  /** Create the staged-plus-prospective projection retained by one prior child's rebased domain reads. */
  createProspectiveCarryReadView(
    outputs: readonly KernelPublicationEntryDescriptor[],
  ): KernelProspectiveCarryReadView {
    this.assertPreparing();
    const materializationsByOwner = new Map<MaterializationOwnerHandle, MaterializationRecord[]>();
    const productDetailsByHandle = new Map<ProductHandle, ProductDetailEntry<unknown>>();
    const hotDetailsByHandle = new Map<HotDetailHandle, HotDetailEntry<unknown>>();
    const outputEntriesByKey = publicationEntriesByKey(outputs);
    for (const output of outputEntriesByKey.values()) {
      if (
        output.surface === KernelPublicationSurface.Record
        && output.detailKind === 'materialization-record'
      ) {
        const record = this.previousRecordForCarry(output);
        if (record.kind !== 'materialization-record') {
          throw new Error(`Cannot project record ${record.handle}; it is not a materialization.`);
        }
        const records = materializationsByOwner.get(record.ownerHandle);
        if (records == null) {
          materializationsByOwner.set(record.ownerHandle, [record]);
        } else {
          records.push(record);
        }
      } else if (output.surface === KernelPublicationSurface.ProductDetail) {
        productDetailsByHandle.set(
          output.handle as ProductHandle,
          this.previousProductDetailForCarry(output),
        );
      } else if (output.surface === KernelPublicationSurface.HotDetail) {
        hotDetailsByHandle.set(
          output.handle as HotDetailHandle,
          this.previousHotDetailForCarry(output),
        );
      }
    }
    const view = new StagedKernelProspectiveCarryReadView(
      this,
      materializationsByOwner,
      productDetailsByHandle,
      hotDetailsByHandle,
      outputEntriesByKey,
    );
    this.prospectiveCarryReadViews.add(view);
    return view;
  }

  /** Read one typed detail as it would appear after a proposed child carry, without staging that carry. */
  previewProductDetailAfterCarry<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
    carried: ProductDetailEntry<unknown> | null,
  ): TDetail | null {
    this.requireCurrent();
    const staged = this.productDetails.get(productHandle) ?? null;
    if (staged != null) {
      return this.readProductDetail(slot, productHandle);
    }
    if (carried == null) {
      return this.readProductDetail(slot, productHandle);
    }
    return carried.slot === slot ? carried.detail as TDetail : null;
  }

  /** Freeze one owner set after a speculative reader has committed to its observed membership. */
  observeMaterializationOwner(ownerHandle: MaterializationOwnerHandle): void {
    this.requireCurrent();
    if (!this.sealed) {
      this.observedMaterializationOwners.add(ownerHandle);
    }
  }

  readProductDetail<TDetail>(slot: ProductDetailSlot<TDetail>, productHandle: ProductHandle): TDetail | null {
    return this.readProductDetailWithRevision(slot, productHandle).value;
  }

  /** Read one typed detail while preserving whether a foreign committed entry supplied the answer. */
  readProductDetailWithRevision<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
  ): StagedKernelRead<TDetail> {
    this.requireCurrent();
    const staged = this.productDetails.get(productHandle) ?? null;
    const admission = this.productDetailAdmissionSnapshots.get(productHandle) ?? null;
    const existingEntry = admission == null
      ? this.previousProductDetailHandles.has(productHandle)
        ? null
        : this.store.productDetails.readEntry(productHandle)
      : admission.expectedEntry;
    const existing = existingEntry?.slot === slot
      ? existingEntry.detail as TDetail
      : null;
    if (staged == null) {
      const hidesPrevious = this.previousProductDetailHandles.has(productHandle);
      const committedRevision = hidesPrevious
        ? null
        : admission?.committedRevision ?? new KernelCommittedEntryRevision(
            existingEntry?.slot.detailKind ?? null,
            this.store.productDetails.readMutationOrdinal(productHandle),
            this.store.productDetails.readLifetimeOrdinal(productHandle),
          );
      return new StagedKernelRead(
        existing,
        committedRevision,
        hidesPrevious
          ? KernelStagedEntryRevision.absent(KernelPublicationSurface.ProductDetail, productHandle)
          : null,
      );
    }
    if (staged.admission === KernelDetailAdmission.IfAbsent && existingEntry != null) {
      return new StagedKernelRead(
        existing,
        admission?.committedRevision ?? new KernelCommittedEntryRevision(
          existingEntry.slot.detailKind,
          this.store.productDetails.readMutationOrdinal(productHandle),
          this.store.productDetails.readLifetimeOrdinal(productHandle),
        ),
        null,
      );
    }
    return staged.slot !== slot
      ? new StagedKernelRead<TDetail>(null, null, this.productDetailStagedRevision(staged))
      : new StagedKernelRead(
          this.bindStagedProductDetail(staged) as TDetail,
          null,
          this.productDetailStagedRevision(staged),
        );
  }

  readHotDetail<TDetail>(slot: HotDetailSlot<TDetail>, handle: HotDetailHandle): TDetail | null {
    return this.readHotDetailWithRevision(slot, handle).value;
  }

  /** Read one typed hot detail while preserving whether a foreign committed entry supplied the answer. */
  readHotDetailWithRevision<TDetail>(
    slot: HotDetailSlot<TDetail>,
    handle: HotDetailHandle,
  ): StagedKernelRead<TDetail> {
    this.requireCurrent();
    const staged = this.hotDetails.get(handle) ?? null;
    const admission = this.hotDetailAdmissionSnapshots.get(handle) ?? null;
    const existingEntry = admission == null
      ? this.previousHotDetailHandles.has(handle)
        ? null
        : this.store.hotDetails.readEntry(handle)
      : admission.expectedEntry;
    const existing = existingEntry?.slot === slot
      ? existingEntry.detail as TDetail
      : null;
    if (staged == null) {
      const hidesPrevious = this.previousHotDetailHandles.has(handle);
      const committedRevision = hidesPrevious
        ? null
        : admission?.committedRevision ?? new KernelCommittedEntryRevision(
            existingEntry?.slot.detailKind ?? null,
            this.store.hotDetails.readMutationOrdinal(handle),
            this.store.hotDetails.readLifetimeOrdinal(handle),
          );
      return new StagedKernelRead(
        existing,
        committedRevision,
        hidesPrevious
          ? KernelStagedEntryRevision.absent(KernelPublicationSurface.HotDetail, handle)
          : null,
      );
    }
    if (staged.admission === KernelDetailAdmission.IfAbsent && existingEntry != null) {
      return new StagedKernelRead(
        existing,
        admission?.committedRevision ?? new KernelCommittedEntryRevision(
          existingEntry.slot.detailKind,
          this.store.hotDetails.readMutationOrdinal(handle),
          this.store.hotDetails.readLifetimeOrdinal(handle),
        ),
        null,
      );
    }
    return staged.slot !== slot
      ? new StagedKernelRead<TDetail>(null, null, this.hotDetailStagedRevision(staged))
      : new StagedKernelRead(
          this.bindStagedHotDetail(staged) as TDetail,
          null,
          this.hotDetailStagedRevision(staged),
        );
  }

  markObservation(): KernelStoreObservationMarker {
    this.requireCurrent();
    return { nextMutationOrdinal: this.nextMutationOrdinal };
  }

  readKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot {
    this.requireCurrent();
    const counts = mutableKernelCounts(this.baseKernelCounts);
    for (const record of this.records.values()) {
      if (this.stagedRecordContributes(record.handle)) {
        applyKernelRecordCount(counts, record, 1);
      }
    }
    counts.productDetails += [...this.productDetails.values()]
      .filter((publication) => this.stagedProductDetailContributes(publication))
      .length;
    counts.hotDetails += [...this.hotDetails.values()]
      .filter((publication) => this.stagedHotDetailContributes(publication))
      .length;
    return counts;
  }

  readDensitySince(marker: KernelStoreObservationMarker): KernelStoreDensityDelta {
    this.requireCurrent();
    const records = [...this.records.values()].filter((record) =>
      (this.recordRevisions.get(record.handle)?.mutationOrdinal ?? -1) >= marker.nextMutationOrdinal
      && this.stagedRecordContributes(record.handle)
    );
    const productDetails = [...this.productDetails.values()].filter((publication) =>
      (this.productDetailRevisions.get(publication.productHandle)?.mutationOrdinal ?? -1) >= marker.nextMutationOrdinal
      && this.stagedProductDetailContributes(publication)
    );
    const hotDetails = [...this.hotDetails.values()].filter((publication) =>
      (this.hotDetailRevisions.get(publication.handle)?.mutationOrdinal ?? -1) >= marker.nextMutationOrdinal
      && this.stagedHotDetailContributes(publication)
    );
    return {
      recordKinds: countSemanticRuntimeRowsBy(records, (record) => record.kind),
      sourceSpanRoles: countSemanticRuntimeRowsBy(
        records,
        (record) => record.kind === 'source-span-address' ? record.role : null,
      ),
      productKinds: countSemanticRuntimeRowsBy(
        records,
        (record) => record.kind === 'materialized-product' ? record.productKindKey : null,
      ),
      productDetailKinds: countSemanticRuntimeRowsBy(productDetails, (publication) => publication.slot.detailKind),
      hotDetailKinds: countSemanticRuntimeRowsBy(hotDetails, (publication) => publication.slot.detailKind),
    };
  }

  readDetailDensitySince(marker: KernelStoreObservationMarker): KernelStoreDetailDensityDelta {
    this.requireCurrent();
    const productDetails = [...this.productDetails.values()].filter((publication) =>
      (this.productDetailRevisions.get(publication.productHandle)?.mutationOrdinal ?? -1) >= marker.nextMutationOrdinal
      && this.stagedProductDetailContributes(publication)
    );
    const hotDetails = [...this.hotDetails.values()].filter((publication) =>
      (this.hotDetailRevisions.get(publication.handle)?.mutationOrdinal ?? -1) >= marker.nextMutationOrdinal
      && this.stagedHotDetailContributes(publication)
    );
    return {
      productDetailDensity: readSemanticRuntimeDetailDensityRows(productDetails.map((publication) => {
        const product = this.read(publication.productHandle);
        return {
          detailKind: publication.slot.detailKind,
          detail: publication.detail,
          envelopeHandles: product?.kind === 'materialized-product'
            ? [
              product.handle,
              product.identityHandle,
              product.addressHandle,
              product.provenanceHandle,
            ].filter((handle) => handle != null).map((handle) => String(handle))
            : [publication.productHandle],
        };
      })),
      hotDetailDensity: readSemanticRuntimeDetailDensityRows(hotDetails.map((publication) => ({
        detailKind: publication.slot.detailKind,
        detail: publication.detail,
        envelopeHandles: [publication.ownerProductHandle, publication.handle],
      }))),
    };
  }

  publish(plan: KernelPublicationPlan): void {
    this.publishFrom(this.defaultWriterId, plan);
  }

  /** Stage one complete materializer emission under the child writer that actually produced it. */
  publishFrom(
    writerId: KernelPublicationWriterId,
    plan: KernelPublicationPlan,
  ): readonly KernelStagedEntryRevision[] {
    this.assertPreparing();
    // These maps belong only to this candidate. A failed write poisons every read and commit path;
    // finishCandidateBindings(false) is the sole permitted cleanup and restores external leases.
    try {
      if (plan.productDetailAdmissionSnapshots.length > 0 || plan.hotDetailAdmissionSnapshots.length > 0) {
        throw new Error('A staged publication cannot import admission snapshots from another transaction.');
      }
      const stagedReads: KernelStagedEntryRevision[] = [];

      for (const record of plan.batch.records) {
        const handle = record.handle;
        if (
          record.kind === 'materialization-record'
          && this.observedMaterializationOwners.has(record.ownerHandle)
        ) {
          throw new Error(
            `Staged publication cannot add materialization ${handle} after owner ${record.ownerHandle} was observed.`,
          );
        }
        if (this.records.has(handle)) {
          throw new Error(`Staged publication emitted duplicate kernel record ${handle}.`);
        }
        this.records.set(handle, record);
        this.recordRevisions.set(handle, KernelStagedEntryRevision.present(
          writerId,
          KernelPublicationSurface.Record,
          handle,
          record.kind,
          this.nextMutationOrdinal++,
        ));
      }
      for (const publication of plan.productDetails) {
        const outcome = this.stageProductDetail(writerId, publication);
        if (outcome === StagedDetailOutcome.Added) {
          const revision = KernelStagedEntryRevision.present(
            writerId,
            KernelPublicationSurface.ProductDetail,
            publication.productHandle,
            publication.slot.detailKind,
            this.nextMutationOrdinal++,
          );
          this.productDetailRevisions.set(publication.productHandle, revision);
          if (
            publication.admission === KernelDetailAdmission.IfAbsent
            && this.productDetailAdmissionSnapshots.get(publication.productHandle)?.expectedEntry == null
          ) {
            stagedReads.push(revision);
          }
        } else if (outcome === StagedDetailOutcome.ReusedStaged) {
          stagedReads.push(requiredStagedRevision(
            this.productDetailRevisions,
            publication.productHandle,
            KernelPublicationSurface.ProductDetail,
          ));
        }
      }
      for (const publication of plan.hotDetails) {
        const outcome = this.stageHotDetail(writerId, publication);
        if (outcome === StagedDetailOutcome.Added) {
          const revision = KernelStagedEntryRevision.present(
            writerId,
            KernelPublicationSurface.HotDetail,
            publication.handle,
            publication.slot.detailKind,
            this.nextMutationOrdinal++,
          );
          this.hotDetailRevisions.set(publication.handle, revision);
          if (
            publication.admission === KernelDetailAdmission.IfAbsent
            && this.hotDetailAdmissionSnapshots.get(publication.handle)?.expectedEntry == null
          ) {
            stagedReads.push(revision);
          }
        } else if (outcome === StagedDetailOutcome.ReusedStaged) {
          stagedReads.push(requiredStagedRevision(
            this.hotDetailRevisions,
            publication.handle,
            KernelPublicationSurface.HotDetail,
          ));
        }
      }

      for (const record of plan.batch.records) {
        if (record.kind !== 'materialization-record') continue;
        const records = this.stagedMaterializationsByOwner.get(record.ownerHandle);
        if (records == null) {
          this.stagedMaterializationsByOwner.set(record.ownerHandle, [record]);
        } else {
          records.push(record);
        }
      }
      return stagedReads;
    } catch (error) {
      this.failedPublication = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  /** Stage one prior child's exact owned entries under its stable writer identity. */
  carryFrom(
    writerId: KernelPublicationWriterId,
    prospectiveCarry: KernelProspectiveCarryReadView,
  ): readonly KernelStagedEntryRevision[] {
    this.assertPreparing();
    this.assertProspectiveCarryReadView(prospectiveCarry);
    const carriedOutputsByKey = new Map(this.carriedOutputsByKey);
    const records: KernelStoreRecord[] = [];
    const productDetails: KernelProductDetailPublication<unknown>[] = [];
    const hotDetails: KernelHotDetailPublication<unknown>[] = [];

    for (const output of prospectiveCarry.outputEntriesByKey.values()) {
      const key = stagedRevisionKey(output.surface, output.handle);
      const existing = carriedOutputsByKey.get(key) ?? null;
      if (existing != null && existing.detailKind !== output.detailKind) {
        throw new Error(`Cannot carry ${key}; it has conflicting kinds ${existing.detailKind} and ${output.detailKind}.`);
      }
      carriedOutputsByKey.set(key, output);
      switch (output.surface) {
        case KernelPublicationSurface.Record: {
          records.push(this.previousRecordForCarry(output));
          break;
        }
        case KernelPublicationSurface.ProductDetail: {
          const handle = output.handle as ProductHandle;
          const entry = this.previousProductDetailForCarry(output);
          const publication = prospectiveCarry.readProductDetailPublication(handle);
          if (publication?.slot !== entry.slot || publication.detail !== entry.detail) {
            throw new Error(`Cannot carry product detail ${handle}; its projected entry no longer matches the store.`);
          }
          productDetails.push(publication);
          break;
        }
        case KernelPublicationSurface.HotDetail: {
          const handle = output.handle as HotDetailHandle;
          const entry = this.previousHotDetailForCarry(output);
          const publication = prospectiveCarry.readHotDetailPublication(handle);
          if (
            publication?.slot !== entry.slot
            || publication.ownerProductHandle !== entry.ownerProductHandle
            || publication.detail !== entry.detail
          ) {
            throw new Error(`Cannot carry hot detail ${handle}; its projected entry no longer matches the store.`);
          }
          hotDetails.push(publication);
          break;
        }
      }
    }

    const reads = this.publishFrom(
      writerId,
      new KernelPublicationPlan(
        new KernelStoreBatch(records, `carry:${writerId}`),
        productDetails,
        hotDetails,
      ),
    );
    this.carriedOutputsByKey = carriedOutputsByKey;
    return reads;
  }

  private previousRecordForCarry(output: KernelPublicationEntryDescriptor): KernelStoreRecord {
    const handle = output.handle as KernelRecordHandle;
    if (!this.previousRecordHandles.has(handle)) {
      throw new Error(`Cannot carry record ${handle}; it is not owned by the prior publication.`);
    }
    const record = this.store.read(handle);
    if (record == null || record.kind !== output.detailKind) {
      throw new Error(`Cannot carry record ${handle}; its committed kind no longer matches ${output.detailKind}.`);
    }
    return record;
  }

  private previousProductDetailForCarry(output: KernelPublicationEntryDescriptor): ProductDetailEntry<unknown> {
    const handle = output.handle as ProductHandle;
    if (!this.previousProductDetailHandles.has(handle)) {
      throw new Error(`Cannot carry product detail ${handle}; it is not owned by the prior publication.`);
    }
    const entry = this.store.productDetails.readEntry(handle);
    if (entry == null || entry.slot.detailKind !== output.detailKind) {
      throw new Error(
        `Cannot carry product detail ${handle}; its committed slot no longer matches ${output.detailKind}.`,
      );
    }
    return entry;
  }

  private previousHotDetailForCarry(output: KernelPublicationEntryDescriptor): HotDetailEntry<unknown> {
    const handle = output.handle as HotDetailHandle;
    if (!this.previousHotDetailHandles.has(handle)) {
      throw new Error(`Cannot carry hot detail ${handle}; it is not owned by the prior publication.`);
    }
    const entry = this.store.hotDetails.readEntry(handle);
    if (entry == null || entry.slot.detailKind !== output.detailKind) {
      throw new Error(`Cannot carry hot detail ${handle}; its committed slot no longer matches ${output.detailKind}.`);
    }
    return entry;
  }

  /** Freeze one coherent publication/revision view before any input validator can run. */
  seal(label: string): SealedKernelPublicationCandidate {
    this.assertPreparing();
    this.sealed = true;
    return mintSealedKernelPublicationCandidate(
      this.store,
      this.previousPublication,
      this.toPlanUnchecked(label),
      this.carriedOutputsByKey,
      this.records,
      this.productDetails,
      this.hotDetails,
      this.recordRevisions,
      this.productDetailRevisions,
      this.hotDetailRevisions,
      admissionAttempts(
        this.productDetailAdmissionSnapshots,
        this.productDetailAdmissionWriters,
        KernelProductDetailAdmissionAttempt,
      ),
      admissionAttempts(
        this.hotDetailAdmissionSnapshots,
        this.hotDetailAdmissionWriters,
        KernelHotDetailAdmissionAttempt,
      ),
    );
  }

  /** Describe only the candidate decisions that must retain before one prior child can be carried. */
  toDecisionPreviewCandidate(
    label: string,
    targets: readonly KernelPublicationEntryDescriptor[],
    prospectiveCarry: KernelProspectiveCarryReadView | null = null,
  ): KernelPublicationDecisionPreviewCandidate {
    this.assertPreparing();
    if (prospectiveCarry != null) {
      this.assertProspectiveCarryReadView(prospectiveCarry);
    }
    const retainedOutputIndexes = prospectiveCarry == null
      ? [this.carriedOutputsByKey]
      : [this.carriedOutputsByKey, prospectiveCarry.outputEntriesByKey];
    if (prospectiveCarry != null) {
      for (const [key, output] of prospectiveCarry.outputEntriesByKey) {
        const existing = this.carriedOutputsByKey.get(key);
        if (existing != null && existing.detailKind !== output.detailKind) {
          throw new Error(
            `Cannot preview ${key}; carried kind ${existing.detailKind} conflicts with ${output.detailKind}.`,
          );
        }
      }
    }
    const targetsByKey = publicationEntriesByKey(targets);
    for (const target of targetsByKey.values()) {
      if (!this.previousOwns(target.surface, target.handle)) {
        throw new Error(`Cannot preview ${target.surface} ${target.handle}; it is not owned by the prior publication.`);
      }
      const retained = publicationEntryFromIndexes(
        retainedOutputIndexes,
        stagedRevisionKey(target.surface, target.handle),
      );
      if (retained != null) {
        if (retained.detailKind !== target.detailKind) {
          throw new Error(
            `Cannot preview ${target.surface} ${target.handle}; retained kind ${retained.detailKind} does not match `
            + `${target.detailKind}.`,
          );
        }
        continue;
      }
      const staged = this.readStagedRevision(target.surface, target.handle);
      if (staged == null || staged.actualKind !== target.detailKind) {
        throw new Error(
          `Cannot preview ${target.surface} ${target.handle}; the current candidate does not publish ${target.detailKind}.`,
        );
      }
    }

    const expectedMutationOrdinal = this.nextMutationOrdinal;
    return mintKernelPublicationDecisionPreviewCandidate(
      this.previousPublication,
      label,
      targetsByKey,
      retainedOutputIndexes,
      (handle) => this.records.get(handle) ?? this.store.read(handle),
      (handle) => {
        const staged = this.productDetails.get(handle) ?? null;
        if (staged != null) return staged;
        const carried = prospectiveCarry?.readProductDetailPublication(handle) ?? null;
        if (carried != null) return carried;
        const entry = this.store.productDetails.readEntry(handle);
        return entry == null ? null : new KernelProductDetailPublication(entry.slot, handle, entry.detail);
      },
      (handle) => {
        const staged = this.hotDetails.get(handle) ?? null;
        if (staged != null) return staged;
        const carried = prospectiveCarry?.readHotDetailPublication(handle) ?? null;
        if (carried != null) return carried;
        const entry = this.store.hotDetails.readEntry(handle);
        return entry == null ? null : new KernelHotDetailPublication(
          entry.slot,
          entry.ownerProductHandle,
          handle,
          entry.detail,
        );
      },
      (handle) => this.previousRecordHandles.has(handle),
      (handle) => this.records.has(handle),
      () => {
        this.assertPreparing();
        if (this.nextMutationOrdinal !== expectedMutationOrdinal) {
          throw new Error(`Publication decision preview ${label} is stale after candidate mutation.`);
        }
      },
    );
  }

  private assertProspectiveCarryReadView(view: KernelProspectiveCarryReadView): void {
    if (!this.prospectiveCarryReadViews.has(view)) {
      throw new Error('Prospective carry read view does not belong to this staged publication.');
    }
  }

  private previousOwns(surface: KernelPublicationSurface, handle: string): boolean {
    switch (surface) {
      case KernelPublicationSurface.Record:
        return this.previousRecordHandles.has(handle as KernelRecordHandle);
      case KernelPublicationSurface.ProductDetail:
        return this.previousProductDetailHandles.has(handle as ProductHandle);
      case KernelPublicationSurface.HotDetail:
        return this.previousHotDetailHandles.has(handle as HotDetailHandle);
    }
  }

  /** Restore superseded candidate leases before any durable publication can be admitted. */
  prepareCandidateBindingsForCommit(): void {
    this.assertHealthy();
    if (!this.sealed) {
      throw new Error('Staged candidate bindings cannot be prepared before publication is sealed.');
    }
    if (this.candidateBindingsPreparedForCommit || this.candidateBindingsFinished) {
      throw new Error('Staged candidate bindings have already been prepared for commit.');
    }
    this.candidateBindingsPreparedForCommit = true;
    const errors: unknown[] = [];
    for (const [publication, prepared] of [...this.stagedHotDetailBindings].reverse()) {
      if (this.hotDetails.get(publication.handle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
        this.stagedHotDetailBindings.delete(publication);
      } catch (error) {
        errors.push(error);
      }
    }
    for (const [publication, prepared] of [...this.stagedProductDetailBindings].reverse()) {
      if (this.productDetails.get(publication.productHandle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
        this.stagedProductDetailBindings.delete(publication);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Superseded candidate detail bindings could not be restored before commit.');
    }
  }

  /** Close every reversible binding lease created while sibling children inspected staged details. */
  finishCandidateBindings(committed: boolean): void {
    if (this.candidateBindingsFinished) {
      throw new Error('Staged candidate bindings have already been finalized.');
    }
    this.candidateBindingsFinished = true;
    const errors: unknown[] = [];
    for (const [publication, prepared] of [...this.stagedHotDetailBindings].reverse()) {
      if (committed && this.hotDetails.get(publication.handle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
      } catch (error) {
        errors.push(error);
      }
    }
    for (const [publication, prepared] of [...this.stagedProductDetailBindings].reverse()) {
      if (committed && this.productDetails.get(publication.productHandle) === publication) {
        continue;
      }
      try {
        prepared.restoreCandidateBinding();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Staged candidate detail bindings could not be finalized.');
    }
  }

  private toPlanUnchecked(label: string): KernelPublicationPlan {
    return new KernelPublicationPlan(
      new KernelStoreBatch(
        [...this.records.values()],
        label,
      ),
      [...this.productDetails.values()],
      [...this.hotDetails.values()],
      [...this.productDetailAdmissionSnapshots.values()],
      [...this.hotDetailAdmissionSnapshots.values()],
    );
  }

  /** Current exact candidate revision for validating one child-to-child staged read. */
  readStagedRevision(
    surface: KernelPublicationSurface,
    handle: string,
  ): KernelStagedEntryRevision | null {
    this.requireCurrent();
    switch (surface) {
      case KernelPublicationSurface.Record:
        return this.recordRevisions.get(handle as KernelRecordHandle) ?? null;
      case KernelPublicationSurface.ProductDetail:
        return this.productDetailRevisions.get(handle as ProductHandle) ?? null;
      case KernelPublicationSurface.HotDetail:
        return this.hotDetailRevisions.get(handle as HotDetailHandle) ?? null;
    }
  }

  /** Whether one child has already staged output or an admission decision in this candidate. */
  hasStagedActivityFrom(writerId: KernelPublicationWriterId): boolean {
    this.requireCurrent();
    return [...this.recordRevisions.values()].some((revision) => revision.writerId === writerId)
      || [...this.productDetailRevisions.values()].some((revision) => revision.writerId === writerId)
      || [...this.hotDetailRevisions.values()].some((revision) => revision.writerId === writerId)
      || [...this.productDetailAdmissionWriters.values()].some((writers) => writers.has(writerId))
      || [...this.hotDetailAdmissionWriters.values()].some((writers) => writers.has(writerId));
  }

  /** Candidate-normalized absence across staged output, hidden prior ownership, and foreign committed occupancy. */
  isCandidateEntryAbsent(surface: KernelPublicationSurface, handle: string): boolean {
    if (this.readStagedRevision(surface, handle) != null) {
      return false;
    }
    switch (surface) {
      case KernelPublicationSurface.Record:
        return this.previousRecordHandles.has(handle as KernelRecordHandle)
          || this.store.read(handle as KernelRecordHandle) == null;
      case KernelPublicationSurface.ProductDetail:
        return this.previousProductDetailHandles.has(handle as ProductHandle)
          || this.store.productDetails.readEntry(handle as ProductHandle) == null;
      case KernelPublicationSurface.HotDetail:
        return this.previousHotDetailHandles.has(handle as HotDetailHandle)
          || this.store.hotDetails.readEntry(handle as HotDetailHandle) == null;
    }
  }

  private recordStagedRevision(record: KernelStoreRecord): KernelStagedEntryRevision {
    return requiredStagedRevision(
      this.recordRevisions,
      record.handle,
      KernelPublicationSurface.Record,
    );
  }

  private productDetailStagedRevision(
    publication: KernelProductDetailPublication<unknown>,
  ): KernelStagedEntryRevision {
    return requiredStagedRevision(
      this.productDetailRevisions,
      publication.productHandle,
      KernelPublicationSurface.ProductDetail,
    );
  }

  private hotDetailStagedRevision(
    publication: KernelHotDetailPublication<unknown>,
  ): KernelStagedEntryRevision {
    return requiredStagedRevision(
      this.hotDetailRevisions,
      publication.handle,
      KernelPublicationSurface.HotDetail,
    );
  }

  private stageProductDetail(
    writerId: KernelPublicationWriterId,
    publication: KernelProductDetailPublication<unknown>,
  ): StagedDetailOutcome {
    const existing = this.productDetails.get(publication.productHandle) ?? null;
    if (existing == null) {
      const admission = this.productDetailAdmissionSnapshot(publication);
      if (publication.admission === KernelDetailAdmission.Required && admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.productHandle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      if (publication.admission === KernelDetailAdmission.IfAbsent && admission?.expectedEntry != null) {
        registerAdmissionWriter(this.productDetailAdmissionWriters, publication.productHandle, writerId);
      }
      this.productDetails.set(publication.productHandle, publication);
      return StagedDetailOutcome.Added;
    }
    if (existing.slot !== publication.slot) {
      throw new Error(
        `Staged publication emitted conflicting product details for ${publication.productHandle}: `
        + `distinct ${existing.slot.detailKind} and ${publication.slot.detailKind} slot contracts.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      const admission = this.productDetailAdmissionSnapshots.get(publication.productHandle) ?? null;
      if (admission?.expectedEntry != null) {
        registerAdmissionWriter(this.productDetailAdmissionWriters, publication.productHandle, writerId);
        return StagedDetailOutcome.ReusedCommitted;
      }
      return StagedDetailOutcome.ReusedStaged;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      const admission = this.productDetailAdmissionSnapshots.get(publication.productHandle) ?? null;
      if (admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.productHandle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      this.productDetails.set(publication.productHandle, publication);
      return StagedDetailOutcome.Added;
    }
    throw new Error(`Staged publication emitted duplicate product detail ${publication.productHandle}.`);
  }

  private stageHotDetail(
    writerId: KernelPublicationWriterId,
    publication: KernelHotDetailPublication<unknown>,
  ): StagedDetailOutcome {
    const existing = this.hotDetails.get(publication.handle) ?? null;
    if (existing == null) {
      const admission = this.hotDetailAdmissionSnapshot(publication);
      if (publication.admission === KernelDetailAdmission.Required && admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.handle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      if (publication.admission === KernelDetailAdmission.IfAbsent && admission?.expectedEntry != null) {
        registerAdmissionWriter(this.hotDetailAdmissionWriters, publication.handle, writerId);
      }
      this.hotDetails.set(publication.handle, publication);
      return StagedDetailOutcome.Added;
    }
    if (existing.slot !== publication.slot) {
      throw new Error(
        `Staged publication emitted conflicting hot details for ${publication.handle}: `
        + `distinct ${existing.slot.detailKind} and ${publication.slot.detailKind} slot contracts.`,
      );
    }
    if (existing.ownerProductHandle !== publication.ownerProductHandle) {
      throw new Error(
        `Staged publication emitted conflicting owners for hot detail ${publication.handle}: `
        + `${existing.ownerProductHandle} and ${publication.ownerProductHandle}.`,
      );
    }
    if (publication.admission === KernelDetailAdmission.IfAbsent) {
      const admission = this.hotDetailAdmissionSnapshots.get(publication.handle) ?? null;
      if (admission?.expectedEntry != null) {
        registerAdmissionWriter(this.hotDetailAdmissionWriters, publication.handle, writerId);
        return StagedDetailOutcome.ReusedCommitted;
      }
      return StagedDetailOutcome.ReusedStaged;
    }
    if (existing.admission === KernelDetailAdmission.IfAbsent) {
      const admission = this.hotDetailAdmissionSnapshots.get(publication.handle) ?? null;
      if (admission?.expectedEntry != null) {
        throw new Error(
          `Staged publication cannot claim ${publication.slot.detailKind}; `
          + `${publication.handle} already has ${admission.expectedEntry.slot.detailKind}.`,
        );
      }
      this.hotDetails.set(publication.handle, publication);
      return StagedDetailOutcome.Added;
    }
    throw new Error(`Staged publication emitted duplicate hot detail ${publication.handle}.`);
  }

  private productDetailAdmissionSnapshot(
    publication: KernelProductDetailPublication<unknown>,
  ): KernelProductDetailAdmissionSnapshot | null {
    if (this.previousProductDetailHandles.has(publication.productHandle)) {
      return null;
    }
    let snapshot = this.productDetailAdmissionSnapshots.get(publication.productHandle);
    if (snapshot == null) {
      const expectedEntry = this.store.productDetails.readEntry(publication.productHandle);
      if (expectedEntry != null && expectedEntry.slot !== publication.slot) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.productHandle} already has `
          + `a distinct ${expectedEntry.slot.detailKind} slot contract.`,
        );
      }
      snapshot = new KernelProductDetailAdmissionSnapshot(
        publication.productHandle,
        publication.slot.detailKind,
        expectedEntry,
        new KernelCommittedEntryRevision(
          expectedEntry?.slot.detailKind ?? null,
          this.store.productDetails.readMutationOrdinal(publication.productHandle),
          this.store.productDetails.readLifetimeOrdinal(publication.productHandle),
        ),
      );
      this.productDetailAdmissionSnapshots.set(publication.productHandle, snapshot);
    }
    return snapshot;
  }

  private hotDetailAdmissionSnapshot(
    publication: KernelHotDetailPublication<unknown>,
  ): KernelHotDetailAdmissionSnapshot | null {
    if (this.previousHotDetailHandles.has(publication.handle)) {
      return null;
    }
    let snapshot = this.hotDetailAdmissionSnapshots.get(publication.handle);
    if (snapshot == null) {
      const expectedEntry = this.store.hotDetails.readEntry(publication.handle);
      if (expectedEntry != null && expectedEntry.slot !== publication.slot) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.handle} already has `
          + `a distinct ${expectedEntry.slot.detailKind} slot contract.`,
        );
      }
      if (expectedEntry != null && expectedEntry.ownerProductHandle !== publication.ownerProductHandle) {
        throw new Error(
          `Staged publication cannot attach ${publication.slot.detailKind}; ${publication.handle} is owned by `
          + `${expectedEntry.ownerProductHandle}, not ${publication.ownerProductHandle}.`,
        );
      }
      snapshot = new KernelHotDetailAdmissionSnapshot(
        publication.handle,
        publication.slot.detailKind,
        expectedEntry,
        new KernelCommittedEntryRevision(
          expectedEntry?.slot.detailKind ?? null,
          this.store.hotDetails.readMutationOrdinal(publication.handle),
          this.store.hotDetails.readLifetimeOrdinal(publication.handle),
        ),
      );
      this.hotDetailAdmissionSnapshots.set(publication.handle, snapshot);
    }
    return snapshot;
  }

  private stagedRecordContributes(handle: KernelRecordHandle): boolean {
    return this.previousRecordHandles.has(handle) || this.store.read(handle) == null;
  }

  private stagedProductDetailContributes(publication: KernelProductDetailPublication<unknown>): boolean {
    return this.previousProductDetailHandles.has(publication.productHandle)
      || this.productDetailAdmissionSnapshots.get(publication.productHandle)?.expectedEntry == null;
  }

  private stagedHotDetailContributes(publication: KernelHotDetailPublication<unknown>): boolean {
    return this.previousHotDetailHandles.has(publication.handle)
      || this.hotDetailAdmissionSnapshots.get(publication.handle)?.expectedEntry == null;
  }

  private bindStagedProductDetail(publication: KernelProductDetailPublication<unknown>): unknown {
    return this.prepareCandidateRead(() => {
      const product = this.read(publication.productHandle);
      if (!(product instanceof MaterializedProduct)) {
        throw new Error(
          `Staged product detail ${publication.slot.detailKind} has no materialized-product envelope `
          + `${publication.productHandle}.`,
        );
      }
      const committedEnvelope = readProductDetailEnvelope(publication.detail);
      if (committedEnvelope != null) {
        if (committedEnvelope.handle !== product.handle) {
          throw new Error(
            `Product detail is already bound to ${committedEnvelope.handle}; cannot stage it for ${product.handle}.`,
          );
        }
        if (!sameMaterializedProductEnvelope(committedEnvelope, product)) {
          throw new Error(
            `Committed product detail ${publication.slot.detailKind} cannot supply candidate ${product.handle}; `
            + 'its materialized-product envelope changed. Emit a fresh detail object for this generation.',
          );
        }
        // Keep the committed weak binding visible until the candidate is admitted atomically.
        return publication.detail;
      }
      let prepared = this.stagedProductDetailBindings.get(publication);
      if (prepared == null) {
        prepared = this.store.productDetails.prepareReplacementEntry(
          publication.slot,
          product,
          publication.detail,
          publication.references,
        );
        prepared.admitCandidateBinding();
        this.stagedProductDetailBindings.set(publication, prepared);
      }
      return publication.detail;
    });
  }

  private bindStagedHotDetail(publication: KernelHotDetailPublication<unknown>): unknown {
    return this.prepareCandidateRead(() => {
      const owner = this.read(publication.ownerProductHandle);
      if (!(owner instanceof MaterializedProduct)) {
        throw new Error(
          `Staged hot detail ${publication.slot.detailKind} has no materialized-product owner `
          + `${publication.ownerProductHandle}.`,
        );
      }
      const committedEntry = readHotDetailEntry(publication.detail);
      if (committedEntry != null) {
        if (
          committedEntry.handle !== publication.handle
          || committedEntry.ownerProductHandle !== owner.handle
          || committedEntry.slot !== publication.slot
        ) {
          throw new Error(
            `Hot detail is already bound to ${committedEntry.handle} under ${committedEntry.ownerProductHandle}; `
            + `cannot stage it for ${publication.handle} under ${owner.handle}.`,
          );
        }
        if (!sameMaterializedProductEnvelope(committedEntry.owner, owner)) {
          throw new Error(
            `Committed hot detail ${publication.slot.detailKind} cannot supply candidate ${publication.handle}; `
            + 'its owner product envelope changed. Emit a fresh detail object for this generation.',
          );
        }
        // Store admission refreshes the owner object only after every fallible preflight succeeds.
        return publication.detail;
      }
      let prepared = this.stagedHotDetailBindings.get(publication);
      if (prepared == null) {
        prepared = this.store.hotDetails.prepareReplacementEntry(
          publication.slot,
          owner,
          publication.handle,
          publication.detail,
          publication.references,
        );
        prepared.admitCandidateBinding();
        this.stagedHotDetailBindings.set(publication, prepared);
      }
      return publication.detail;
    });
  }

  private prepareCandidateRead<TValue>(prepare: () => TValue): TValue {
    try {
      return prepare();
    } catch (error) {
      this.failedPublication = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  private assertHealthy(): void {
    if (this.failedPublication != null) {
      throw new Error(
        `Staged publication cannot continue after a failed write: ${this.failedPublication.message}`,
      );
    }
  }

  private assertPreparing(): void {
    this.assertHealthy();
    if (this.sealed) {
      throw new Error('Staged kernel publication is sealed for commit.');
    }
  }
}

const enum StagedDetailOutcome {
  Added,
  ReusedStaged,
  ReusedCommitted,
}

function stagedRevisionKey(surface: KernelPublicationSurface, handle: string): string {
  return `${surface}\0${handle}`;
}

function registerAdmissionWriter<THandle extends string>(
  writersByHandle: Map<THandle, Set<KernelPublicationWriterId>>,
  handle: THandle,
  writerId: KernelPublicationWriterId,
): void {
  const writers = writersByHandle.get(handle) ?? new Set<KernelPublicationWriterId>();
  writers.add(writerId);
  writersByHandle.set(handle, writers);
}

function admissionAttempts<
  THandle extends string,
  TSnapshot,
  TAttempt,
>(
  snapshots: ReadonlyMap<THandle, TSnapshot>,
  writersByHandle: ReadonlyMap<THandle, ReadonlySet<KernelPublicationWriterId>>,
  Attempt: new (writerId: KernelPublicationWriterId, snapshot: TSnapshot) => TAttempt,
): readonly TAttempt[] {
  return [...writersByHandle].flatMap(([handle, writers]) => {
    const snapshot = snapshots.get(handle);
    if (snapshot == null) {
      throw new Error(`Admission writers for ${handle} have no exact catalog snapshot.`);
    }
    return [...writers].map((writerId) => new Attempt(writerId, snapshot));
  });
}

function requiredStagedRevision<THandle extends string>(
  revisions: ReadonlyMap<THandle, KernelStagedEntryRevision>,
  handle: THandle,
  surface: KernelPublicationSurface,
): KernelStagedEntryRevision {
  const revision = revisions.get(handle);
  if (revision == null) {
    throw new Error(`Staged ${surface} ${handle} has no mutation revision.`);
  }
  return revision;
}

type MutableKernelCountSnapshot = {
  -readonly [TKey in keyof SemanticRuntimeKernelCountSnapshot]: SemanticRuntimeKernelCountSnapshot[TKey];
};

function kernelCountsWithoutPreviousPublication(
  store: KernelStore,
  previous: KernelPublicationManifest,
): SemanticRuntimeKernelCountSnapshot {
  const counts = mutableKernelCounts(store.readKernelCountSnapshot());
  for (const handle of previous.recordHandles) {
    const record = store.read(handle);
    if (record != null) {
      applyKernelRecordCount(counts, record, -1);
    }
  }
  counts.productDetails -= previous.productDetailHandles
    .filter((handle) => store.productDetails.readEntry(handle) != null)
    .length;
  counts.hotDetails -= previous.hotDetailHandles
    .filter((handle) => store.hotDetails.readEntry(handle) != null)
    .length;
  return counts;
}

function mutableKernelCounts(snapshot: SemanticRuntimeKernelCountSnapshot): MutableKernelCountSnapshot {
  return { ...snapshot };
}

function applyKernelRecordCount(
  counts: MutableKernelCountSnapshot,
  record: KernelStoreRecord,
  direction: 1 | -1,
): void {
  counts.totalRecords += direction;
  counts.handleCharacters += direction * record.handle.length;
  if (isSemanticAddressRecord(record)) {
    counts.addresses += direction;
    return;
  }
  if (isSemanticIdentityRecord(record)) {
    counts.identities += direction;
    return;
  }
  switch (record.kind) {
    case 'evidence-record':
      counts.evidence += direction;
      return;
    case 'provenance-record':
      counts.provenance += direction;
      return;
    case 'semantic-claim':
      counts.claims += direction;
      return;
    case 'open-seam':
      counts.openSeams += direction;
      return;
    case 'materialized-product':
      counts.products += direction;
      return;
    case 'materialization-record':
      counts.materializations += direction;
      return;
  }
}
