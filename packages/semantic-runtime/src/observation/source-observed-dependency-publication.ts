import { SemanticClaim } from '../kernel/claim.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { ObservationIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  type ClaimPredicateKey,
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  runtimeObservedDependencyIdentityLocalName,
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';

export interface SourceObservedDependencyOwner {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle | null;
  readonly addressHandle: AddressHandle | null;
}

export interface SourceObservedDependencyRecordInput {
  readonly store: KernelStore;
  readonly local: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly owner: SourceObservedDependencyOwner;
  readonly draft: RuntimeObservedDependencyDraft;
  readonly index: number;
  readonly provenanceHandle: ProvenanceHandle;
  readonly claimPredicateKey: ClaimPredicateKey;
  readonly claimLocalName: string;
}

export class SourceObservedDependencyRecordSet {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publish a source-observer-owned dependency read without rediscovering source provenance from a carrier address. */
export function sourceObservedDependencyRecords(
  input: SourceObservedDependencyRecordInput,
): SourceObservedDependencyRecordSet {
  const productHandle = input.store.handles.product(input.local);
  const identityHandle = input.store.handles.identity(input.local);
  const source = input.draft.spanStart == null || input.draft.spanEnd == null
    ? null
    : sourceSpanAddressForSite(input.store, input.local, {
      sourceFileAddressHandle: input.sourceFileAddressHandle,
      start: input.draft.spanStart,
      end: input.draft.spanEnd,
    });
  const sourceAddressHandle = source?.handle ?? input.owner.addressHandle;
  const claim = new SemanticClaim(
    input.store.handles.claim(`${input.local}:${input.claimLocalName}`),
    input.owner.productHandle,
    input.claimPredicateKey,
    productHandle,
    input.provenanceHandle,
  );
  return new SourceObservedDependencyRecordSet(
    productHandle,
    identityHandle,
    sourceAddressHandle,
    [
      ...(source?.records ?? []),
      new ObservationIdentity(
        identityHandle,
        KernelVocabulary.Binding.ObservedDependency.key,
        input.owner.identityHandle,
        sourceAddressHandle,
        runtimeObservedDependencyIdentityLocalName(input.draft, input.index),
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Binding.ObservedDependency.key,
        identityHandle,
        sourceAddressHandle,
        input.provenanceHandle,
      ),
      claim,
      new MaterializationRecord(
        input.store.handles.materialization(input.local),
        identityHandle,
        [productHandle],
        [claim.handle],
      ),
    ],
  );
}
