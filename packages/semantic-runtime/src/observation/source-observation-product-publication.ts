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
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
  type SourceSpanSite,
} from '../kernel/source-address.js';
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

interface SourceObservationProductPublicationFrame {
  readonly source: SourceSpanAddressPublication;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

/** Publish the shared source/evidence/provenance envelope for source-backed observation products. */
export function sourceObservationProductRecords(
  input: SourceObservationProductRecordInput,
): SourceObservationProductRecordSet {
  const frame = sourceObservationProductPublicationFrame(input);
  return new SourceObservationProductRecordSet(
    frame.productHandle,
    frame.identityHandle,
    frame.source.handle,
    frame.evidenceHandle,
    frame.provenanceHandle,
    sourceObservationProductKernelRecords(input, frame),
  );
}

function sourceObservationProductPublicationFrame(
  input: SourceObservationProductRecordInput,
): SourceObservationProductPublicationFrame {
  const source = sourceSpanAddressForSite(input.store, input.local, input.site);
  return {
    source,
    evidenceHandle: input.store.handles.evidence(`${input.local}:evidence`),
    provenanceHandle: input.store.handles.provenance(`${input.local}:provenance`),
    productHandle: input.store.handles.product(input.local),
    identityHandle: input.store.handles.identity(input.local),
  };
}

function sourceObservationProductKernelRecords(
  input: SourceObservationProductRecordInput,
  frame: SourceObservationProductPublicationFrame,
): readonly KernelStoreRecord[] {
  return [
    ...frame.source.records,
    new EvidenceRecord(
      frame.evidenceHandle,
      EvidenceKind.SourceObservation,
      input.evidenceRoles,
      input.evidenceSummary,
      frame.source.handle,
    ),
    new ProvenanceRecord(frame.provenanceHandle, [frame.evidenceHandle]),
    new ObservationIdentity(
      frame.identityHandle,
      input.productKindKey,
      input.identityOwnerHandle,
      frame.source.handle,
      input.identityLocalName,
    ),
    new MaterializedProduct(
      frame.productHandle,
      input.productKindKey,
      frame.identityHandle,
      frame.source.handle,
      frame.provenanceHandle,
    ),
  ];
}
