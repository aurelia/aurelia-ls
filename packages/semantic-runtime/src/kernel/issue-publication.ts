import {
  EvidenceKind,
  EvidenceRecord,
  type EvidenceRole,
} from './evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from './handles.js';
import type { SemanticIdentity } from './identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
  type MaterializationOwnerHandle,
} from './materialization.js';
import { ProvenanceRecord } from './provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from './store.js';
import type { ProductKindKey } from './vocabulary.js';

export interface IssuePublication<TIssue> {
  readonly issue: TIssue;
  readonly records: readonly KernelStoreRecord[];
}

export interface IssueProductHandles {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

export interface IssueProductPublicationSpec<TIssue> {
  readonly local: string;
  readonly productKindKey: ProductKindKey;
  readonly evidenceKind?: EvidenceKind;
  readonly evidenceRoles: readonly EvidenceRole[];
  readonly evidenceSummary: string;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly materializationOwnerHandle: MaterializationOwnerHandle | null;
  readonly createIssue: (handles: IssueProductHandles) => TIssue;
  readonly createIdentity: (identityHandle: IdentityHandle, issue: TIssue) => SemanticIdentity;
}

/** Publish the common evidence/provenance/identity/product record set for source-backed diagnostics. */
export function publishIssueProduct<TIssue>(
  store: KernelStore,
  spec: IssueProductPublicationSpec<TIssue>,
): IssuePublication<TIssue> {
  const productHandle = store.handles.product(spec.local);
  const identityHandle = store.handles.identity(spec.local);
  const evidenceHandle = store.handles.evidence(spec.local);
  const provenanceHandle = store.handles.provenance(spec.local);
  const issue = spec.createIssue({ productHandle, identityHandle });
  const records: KernelStoreRecord[] = [
    new EvidenceRecord(
      evidenceHandle,
      spec.evidenceKind ?? EvidenceKind.SemanticObservation,
      spec.evidenceRoles,
      spec.evidenceSummary,
      spec.sourceAddressHandle,
    ),
    new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
    spec.createIdentity(identityHandle, issue),
    new MaterializedProduct(
      productHandle,
      spec.productKindKey,
      identityHandle,
      spec.sourceAddressHandle,
      provenanceHandle,
    ),
  ];

  if (spec.materializationOwnerHandle != null) {
    records.push(new MaterializationRecord(
      store.handles.materialization(spec.local),
      spec.materializationOwnerHandle,
      [productHandle],
    ));
  }

  return { issue, records };
}

/** Add records discovered by a caller to an existing issue publication. */
export function issuePublicationWithRecords<TIssue>(
  publication: IssuePublication<TIssue>,
  records: readonly KernelStoreRecord[],
): IssuePublication<TIssue> {
  return {
    issue: publication.issue,
    records: [...records, ...publication.records],
  };
}
