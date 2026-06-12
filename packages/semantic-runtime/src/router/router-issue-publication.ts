import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle, IdentityHandle } from '../kernel/handles.js';
import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { RouterIssueModel } from './model.js';
import { routerProductRecords } from './router-product-records.js';

export interface RouterIssuePublicationInput {
  readonly local: string;
  readonly issue: RouterIssueModel;
  readonly ownerHandle: IdentityHandle;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly localName: string | null;
  readonly evidenceSummary: string;
}

export function routerIssueProductRecords(
  store: KernelStore,
  input: RouterIssuePublicationInput,
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local: input.local,
    evidenceHandle: store.handles.evidence(input.local),
    provenanceHandle: store.handles.provenance(input.local),
    productHandle: input.issue.productHandle,
    identityHandle: input.issue.identityHandle,
    productKindKey: KernelVocabulary.Router.Issue.key,
    ownerHandle: input.ownerHandle,
    sourceAddressHandle: input.sourceAddressHandle,
    localName: input.localName,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.Diagnostic],
    evidenceSummary: input.evidenceSummary,
  });
}
