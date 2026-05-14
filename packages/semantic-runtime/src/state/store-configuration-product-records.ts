import type { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
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
import {
  StateStoreConfiguration,
  type StateStoreOptionsOrHandlerKind,
} from './model.js';

export interface StateStoreConfigurationProductSeed {
  readonly projectKey: string;
  readonly ownerIdentityHandle: IdentityHandle;
  readonly name: string | null;
  readonly isDefault: boolean;
  readonly initialStateKind: ConfigurationOptionValueKind | `${ConfigurationOptionValueKind}` | null;
  readonly optionsOrHandlerKind: StateStoreOptionsOrHandlerKind;
  readonly actionHandlerCount: number;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly nameSourceAddressHandle: AddressHandle | null;
  readonly initialStateSourceAddressHandle: AddressHandle | null;
  readonly optionsOrHandlerSourceAddressHandle: AddressHandle | null;
  readonly actionHandlerSourceAddressHandles: readonly AddressHandle[];
}

export interface StateStoreConfigurationProductEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly store: StateStoreConfiguration;
}

interface StateStoreConfigurationProductHandles {
  readonly local: string;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

export function stateStoreConfigurationProductEmission(
  store: KernelStore,
  seed: StateStoreConfigurationProductSeed,
  index: number,
): StateStoreConfigurationProductEmission {
  const handles = stateStoreConfigurationProductHandles(store, seed, index);
  const configuration = stateStoreConfigurationModel(seed, handles);
  return {
    store: configuration,
    records: stateStoreConfigurationRecords(store, seed, handles),
  };
}

function stateStoreConfigurationProductHandles(
  store: KernelStore,
  seed: StateStoreConfigurationProductSeed,
  index: number,
): StateStoreConfigurationProductHandles {
  const local = [
    'state-store-configuration',
    localKeyPart(seed.projectKey),
    `${index}`,
    localKeyPart(seed.name ?? 'open'),
  ].join(':');
  return {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: store.handles.product(local),
    identityHandle: store.handles.identity(local),
  };
}

function stateStoreConfigurationModel(
  seed: StateStoreConfigurationProductSeed,
  handles: StateStoreConfigurationProductHandles,
): StateStoreConfiguration {
  return new StateStoreConfiguration(
    handles.productHandle,
    handles.identityHandle,
    seed.name,
    seed.isDefault,
    seed.initialStateKind,
    seed.optionsOrHandlerKind,
    seed.actionHandlerCount,
    seed.sourceAddressHandle,
    seed.nameSourceAddressHandle,
    seed.initialStateSourceAddressHandle,
    seed.optionsOrHandlerSourceAddressHandle,
    seed.actionHandlerSourceAddressHandles,
  );
}

function stateStoreConfigurationRecords(
  store: KernelStore,
  seed: StateStoreConfigurationProductSeed,
  handles: StateStoreConfigurationProductHandles,
): readonly KernelStoreRecord[] {
  return [
    stateStoreConfigurationEvidence(seed, handles),
    new ProvenanceRecord(handles.provenanceHandle, [handles.evidenceHandle]),
    stateStoreConfigurationIdentity(seed, handles),
    stateStoreConfigurationProduct(seed, handles),
    stateStoreConfigurationMaterialization(store, seed, handles),
  ];
}

function stateStoreConfigurationEvidence(
  seed: StateStoreConfigurationProductSeed,
  handles: StateStoreConfigurationProductHandles,
): EvidenceRecord {
  return new EvidenceRecord(
    handles.evidenceHandle,
    EvidenceKind.ConfigurationFlow,
    [EvidenceRole.Configuration],
    'State store configuration admitted from StateDefaultConfiguration builder flow before AppTask execution.',
    seed.sourceAddressHandle,
  );
}

function stateStoreConfigurationIdentity(
  seed: StateStoreConfigurationProductSeed,
  handles: StateStoreConfigurationProductHandles,
): StateIdentity {
  return new StateIdentity(
    handles.identityHandle,
    KernelVocabulary.State.StoreConfiguration.key,
    seed.ownerIdentityHandle,
    seed.sourceAddressHandle,
    seed.name,
  );
}

function stateStoreConfigurationProduct(
  seed: StateStoreConfigurationProductSeed,
  handles: StateStoreConfigurationProductHandles,
): MaterializedProduct {
  return new MaterializedProduct(
    handles.productHandle,
    KernelVocabulary.State.StoreConfiguration.key,
    handles.identityHandle,
    seed.sourceAddressHandle,
    handles.provenanceHandle,
  );
}

function stateStoreConfigurationMaterialization(
  store: KernelStore,
  seed: StateStoreConfigurationProductSeed,
  handles: StateStoreConfigurationProductHandles,
): MaterializationRecord {
  return new MaterializationRecord(
    store.handles.materialization(handles.local),
    seed.ownerIdentityHandle,
    [handles.productHandle],
    [],
    [],
  );
}
