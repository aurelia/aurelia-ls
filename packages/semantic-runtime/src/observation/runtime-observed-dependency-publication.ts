import { SemanticClaim } from '../kernel/claim.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
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
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';

export interface RuntimeObservedDependencyProduct extends RuntimeObservedDependencyDraft {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly accessUseProductHandle: ProductHandle;
  readonly sourceAddressHandle: AddressHandle | null;
}

export interface RuntimeObservedDependencyPublicationOwner {
  readonly identityHandle: IdentityHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

export interface RuntimeObservedDependencyPublicationClaim {
  readonly localName: string;
  readonly subjectProductHandle: ProductHandle;
  readonly predicateKey: ClaimPredicateKey;
}

export interface RuntimeObservedDependencyPublicationInput {
  readonly store: KernelStore;
  readonly local: string;
  readonly owner: RuntimeObservedDependencyPublicationOwner;
  readonly dependency: RuntimeObservedDependencyProduct;
  readonly index: number;
  readonly provenanceHandle: ProvenanceHandle;
  readonly claims: readonly RuntimeObservedDependencyPublicationClaim[];
}

interface RuntimeObservedDependencyPublicationFrame {
  readonly claims: readonly SemanticClaim[];
}

/** Publish a runtime observed-dependency product plus owner-specific usage claims. */
export function runtimeObservedDependencyRecords(
  input: RuntimeObservedDependencyPublicationInput,
): readonly KernelStoreRecord[] {
  const frame = runtimeObservedDependencyPublicationFrame(input);
  return runtimeObservedDependencyKernelRecords(input, frame);
}

function runtimeObservedDependencyPublicationFrame(
  input: RuntimeObservedDependencyPublicationInput,
): RuntimeObservedDependencyPublicationFrame {
  const claims = input.claims.map((claim) => new SemanticClaim(
    input.store.handles.claim(`${input.local}:${claim.localName}`),
    claim.subjectProductHandle,
    claim.predicateKey,
    input.dependency.productHandle,
    input.provenanceHandle,
  ));
  return { claims };
}

function runtimeObservedDependencyKernelRecords(
  input: RuntimeObservedDependencyPublicationInput,
  frame: RuntimeObservedDependencyPublicationFrame,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      input.dependency.identityHandle,
      KernelVocabulary.Binding.ObservedDependency.key,
      input.owner.identityHandle,
      input.dependency.sourceAddressHandle,
      runtimeObservedDependencyIdentityLocalName(input.dependency, input.index),
    ),
    new MaterializedProduct(
      input.dependency.productHandle,
      KernelVocabulary.Binding.ObservedDependency.key,
      input.dependency.identityHandle,
      input.dependency.sourceAddressHandle,
      input.provenanceHandle,
    ),
    ...frame.claims,
    new MaterializationRecord(
      input.store.handles.materialization(input.local),
      input.dependency.identityHandle,
      [input.dependency.productHandle],
      frame.claims.map((claim) => claim.handle),
      [],
    ),
  ];
}
