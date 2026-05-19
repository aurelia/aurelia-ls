import {
  EvidenceKind,
  EvidenceRecord,
  type EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { ObservationIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import { sourceSpanAddressForSite, type SourceSpanSite } from '../kernel/source-address.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { ProductKindKey } from '../kernel/vocabulary.js';

export interface SourceObservationProductRecordInput {
  readonly store: KernelStore;
  readonly local: string;
  readonly site: SourceSpanSite;
  readonly productKindKey: ProductKindKey;
  readonly evidenceRoles: readonly EvidenceRole[];
  readonly evidenceSummary: string;
  readonly identityOwnerHandle: IdentityHandle | null;
  readonly identityLocalName: string | null;
}

export class SourceObservationProductRecordSet {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle,
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publish the shared source/evidence/provenance envelope for source-backed observation products. */
export function sourceObservationProductRecords(
  input: SourceObservationProductRecordInput,
): SourceObservationProductRecordSet {
  const source = sourceSpanAddressForSite(input.store, input.local, input.site);
  const evidenceHandle = input.store.handles.evidence(`${input.local}:evidence`);
  const provenanceHandle = input.store.handles.provenance(`${input.local}:provenance`);
  const productHandle = input.store.handles.product(input.local);
  const identityHandle = input.store.handles.identity(input.local);
  return new SourceObservationProductRecordSet(
    productHandle,
    identityHandle,
    source.handle,
    evidenceHandle,
    provenanceHandle,
    [
      ...source.records,
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SourceObservation,
        input.evidenceRoles,
        input.evidenceSummary,
        source.handle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      new ObservationIdentity(
        identityHandle,
        input.productKindKey,
        input.identityOwnerHandle,
        source.handle,
        input.identityLocalName,
      ),
      new MaterializedProduct(
        productHandle,
        input.productKindKey,
        identityHandle,
        source.handle,
        provenanceHandle,
      ),
    ],
  );
}
