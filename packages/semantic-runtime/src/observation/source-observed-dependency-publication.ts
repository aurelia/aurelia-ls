import { SemanticClaim } from '../kernel/claim.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { ObservationIdentity } from '../kernel/identity.js';
import {
  MaterializedProduct,
  MaterializationRecord,
} from '../kernel/materialization.js';
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
} from './runtime-observed-dependency-draft.js';
import type { RuntimeObservedDependencyOccurrence } from './runtime-observed-dependency.js';

export interface SourceObservedDependencyOwner {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle | null;
  readonly addressHandle: AddressHandle | null;
}

export interface SourceObservedDependencyRecordInput {
  readonly store: KernelStore;
  readonly local: string;
  readonly owner: SourceObservedDependencyOwner;
  readonly occurrence: RuntimeObservedDependencyOccurrence;
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

interface SourceObservedDependencyPublicationFrame {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly claim: SemanticClaim;
}

/** Publish a source-observer-owned dependency read without rediscovering source provenance from a carrier address. */
export function sourceObservedDependencyRecords(
  input: SourceObservedDependencyRecordInput,
): SourceObservedDependencyRecordSet {
  const frame = sourceObservedDependencyPublicationFrame(input);
  return new SourceObservedDependencyRecordSet(
    frame.productHandle,
    frame.identityHandle,
    frame.sourceAddressHandle,
    sourceObservedDependencyKernelRecords(input, frame),
  );
}

function sourceObservedDependencyPublicationFrame(
  input: SourceObservedDependencyRecordInput,
): SourceObservedDependencyPublicationFrame {
  const productHandle = input.store.handles.product(input.local);
  const identityHandle = input.store.handles.identity(input.local);
  const sourceAddressHandle = input.occurrence.sourceAddressHandle;
  const claim = new SemanticClaim(
    input.store.handles.claim(`${input.local}:${input.claimLocalName}`),
    input.owner.productHandle,
    input.claimPredicateKey,
    productHandle,
    input.provenanceHandle,
  );
  return {
    productHandle,
    identityHandle,
    sourceAddressHandle,
    claim,
  };
}

function sourceObservedDependencyKernelRecords(
  input: SourceObservedDependencyRecordInput,
  frame: SourceObservedDependencyPublicationFrame,
): readonly KernelStoreRecord[] {
  return [
    new ObservationIdentity(
      frame.identityHandle,
      KernelVocabulary.Binding.ObservedDependency.key,
      input.owner.identityHandle,
      frame.sourceAddressHandle,
      runtimeObservedDependencyIdentityLocalName(input.occurrence, input.index),
    ),
    new MaterializedProduct(
      frame.productHandle,
      KernelVocabulary.Binding.ObservedDependency.key,
      frame.identityHandle,
      frame.sourceAddressHandle,
      input.provenanceHandle,
    ),
    frame.claim,
    new MaterializationRecord(
      input.store.handles.materialization(input.local),
      frame.identityHandle,
      [frame.productHandle],
      [frame.claim.handle],
    ),
  ];
}
