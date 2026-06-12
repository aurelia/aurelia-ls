import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { StateIdentity } from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import {
  StateGetterBinding,
  type StateGetterBindingStoreResolutionKind,
} from './model.js';

export interface StateGetterBindingProductSeed {
  readonly projectKey: string;
  readonly sourceAddressHandle: AddressHandle;
  readonly selectorSourceAddressHandle: AddressHandle;
  readonly targetSourceAddressHandle: AddressHandle | null;
  readonly targetKind: string;
  readonly targetName: string | null;
  readonly storeName: string | null | undefined;
  readonly storeResolutionKind: StateGetterBindingStoreResolutionKind;
  readonly storeProductHandle: ProductHandle | null;
  readonly storeIdentityHandle: IdentityHandle | null;
  readonly selectorText: string;
  readonly selectorReturnType: CheckerTypeReference | null;
  readonly targetMemberType: CheckerTypeReference | null;
  readonly openReason: string | null;
  readonly sourceRecords: readonly KernelStoreRecord[];
}

export interface StateGetterBindingProductEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly binding: StateGetterBinding;
}

interface StateGetterBindingProductHandles {
  readonly local: string;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

export function stateGetterBindingProductEmission(
  store: KernelStore,
  seed: StateGetterBindingProductSeed,
  index: number,
): StateGetterBindingProductEmission {
  const handles = stateGetterBindingProductHandles(store, seed, index);
  const binding = stateGetterBindingModel(seed, handles);
  return {
    binding,
    records: stateGetterBindingRecords(store, seed, handles),
  };
}

function stateGetterBindingProductHandles(
  store: KernelStore,
  seed: StateGetterBindingProductSeed,
  index: number,
): StateGetterBindingProductHandles {
  const local = [
    'state-getter-binding',
    localKeyPart(seed.projectKey),
    localKeyPart(seed.targetName ?? 'anonymous-target'),
    seed.storeName === undefined ? 'dynamic-store' : localKeyPart(seed.storeName ?? 'default'),
    `${index}`,
  ].join(':');
  return {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: store.handles.product(local),
    identityHandle: store.handles.identity(local),
  };
}

function stateGetterBindingModel(
  seed: StateGetterBindingProductSeed,
  handles: StateGetterBindingProductHandles,
): StateGetterBinding {
  return new StateGetterBinding(
    handles.productHandle,
    handles.identityHandle,
    seed.sourceAddressHandle,
    seed.selectorSourceAddressHandle,
    seed.targetSourceAddressHandle,
    seed.targetKind,
    seed.targetName,
    seed.storeName,
    seed.storeResolutionKind,
    seed.storeProductHandle,
    seed.storeIdentityHandle,
    seed.selectorText,
    seed.selectorReturnType,
    seed.targetMemberType,
    seed.openReason,
  );
}

function stateGetterBindingRecords(
  store: KernelStore,
  seed: StateGetterBindingProductSeed,
  handles: StateGetterBindingProductHandles,
): readonly KernelStoreRecord[] {
  return [
    ...seed.sourceRecords,
    stateGetterBindingEvidence(seed, handles),
    new ProvenanceRecord(handles.provenanceHandle, [handles.evidenceHandle]),
    stateGetterBindingIdentity(seed, handles),
    stateGetterBindingProduct(seed, handles),
    stateGetterBindingMaterialization(store, seed, handles),
  ];
}

function stateGetterBindingEvidence(
  seed: StateGetterBindingProductSeed,
  handles: StateGetterBindingProductHandles,
): EvidenceRecord {
  return new EvidenceRecord(
    handles.evidenceHandle,
    EvidenceKind.SemanticObservation,
    [EvidenceRole.Configuration, EvidenceRole.TransformOutput],
    'StateGetterBinding admitted from @fromState(...) decorator lifecycle hook registration.',
    seed.sourceAddressHandle,
  );
}

function stateGetterBindingIdentity(
  seed: StateGetterBindingProductSeed,
  handles: StateGetterBindingProductHandles,
): StateIdentity {
  return new StateIdentity(
    handles.identityHandle,
    KernelVocabulary.State.GetterBinding.key,
    seed.storeIdentityHandle,
    seed.sourceAddressHandle,
    seed.targetName,
  );
}

function stateGetterBindingProduct(
  seed: StateGetterBindingProductSeed,
  handles: StateGetterBindingProductHandles,
): MaterializedProduct {
  return new MaterializedProduct(
    handles.productHandle,
    KernelVocabulary.State.GetterBinding.key,
    handles.identityHandle,
    seed.sourceAddressHandle,
    handles.provenanceHandle,
  );
}

function stateGetterBindingMaterialization(
  store: KernelStore,
  seed: StateGetterBindingProductSeed,
  handles: StateGetterBindingProductHandles,
): MaterializationRecord {
  return new MaterializationRecord(
    store.handles.materialization(handles.local),
    handles.identityHandle,
    [handles.productHandle],
    [],
    [],
  );
}
