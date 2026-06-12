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
import { RouteRecognizerIdentity, RouterIdentity, type SemanticIdentity } from '../kernel/identity.js';
import {
  type MaterializationOwnerHandle,
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { OpenSeam, type OpenSeamReasonKind, type OpenSeamReasonSource } from '../kernel/open-seam.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { OpenSeamKindKey, ProductKindKey } from '../kernel/vocabulary.js';

export interface RouterIdentityProductRecordSpec {
  readonly local: string;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly productKindKey: ProductKindKey;
  readonly ownerHandle: IdentityHandle | null;
  readonly materializationOwnerHandle?: MaterializationOwnerHandle;
  readonly materializationProductHandles?: readonly ProductHandle[];
  readonly sourceAddressHandle: AddressHandle | null;
  readonly localName: string | null;
  readonly provenanceHandle: ProvenanceHandle;
}

export interface RouterProductRecordSpec extends RouterIdentityProductRecordSpec {
  readonly evidenceHandle: EvidenceHandle;
  readonly evidenceKind: EvidenceKind;
  readonly evidenceRoles: readonly EvidenceRole[];
  readonly evidenceSummary: string;
}

export interface RouterOpenSeamRecordSpec {
  readonly local: string;
  readonly seamKindKey: OpenSeamKindKey;
  readonly ownerHandle: MaterializationOwnerHandle;
  readonly summary: string;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly reasonKinds: readonly OpenSeamReasonKind[];
  readonly reasonSources?: readonly OpenSeamReasonSource[];
  readonly evidenceKind: EvidenceKind;
  readonly evidenceRoles: readonly EvidenceRole[];
}

export interface RouterOpenSeamRecordEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly openSeam: OpenSeam;
}

export function routerProductRecords(
  store: KernelStore,
  spec: RouterProductRecordSpec,
): readonly KernelStoreRecord[] {
  return evidenceBackedProductRecords(store, spec, routerIdentity(spec));
}

export function routerIdentityProductRecords(
  store: KernelStore,
  spec: RouterIdentityProductRecordSpec,
): readonly KernelStoreRecord[] {
  return productEnvelopeRecords(store, spec, routerIdentity(spec));
}

export function routeRecognizerProductRecords(
  store: KernelStore,
  spec: RouterProductRecordSpec,
): readonly KernelStoreRecord[] {
  return evidenceBackedProductRecords(store, spec, routeRecognizerIdentity(spec));
}

function evidenceBackedProductRecords(
  store: KernelStore,
  spec: RouterProductRecordSpec,
  identity: SemanticIdentity,
): readonly KernelStoreRecord[] {
  return [
    new EvidenceRecord(
      spec.evidenceHandle,
      spec.evidenceKind,
      spec.evidenceRoles,
      spec.evidenceSummary,
      spec.sourceAddressHandle,
    ),
    new ProvenanceRecord(spec.provenanceHandle, [spec.evidenceHandle]),
    ...productEnvelopeRecords(store, spec, identity),
  ];
}

function productEnvelopeRecords(
  store: KernelStore,
  spec: RouterIdentityProductRecordSpec,
  identity: SemanticIdentity,
): readonly KernelStoreRecord[] {
  return [
    identity,
    new MaterializedProduct(
      spec.productHandle,
      spec.productKindKey,
      spec.identityHandle,
      spec.sourceAddressHandle,
      spec.provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(spec.local),
      spec.materializationOwnerHandle ?? spec.ownerHandle ?? spec.identityHandle,
      spec.materializationProductHandles ?? [spec.productHandle],
      [],
      [],
    ),
  ];
}

function routerIdentity(
  spec: RouterIdentityProductRecordSpec,
): RouterIdentity {
  return new RouterIdentity(
    spec.identityHandle,
    spec.productKindKey,
    spec.ownerHandle,
    spec.sourceAddressHandle,
    spec.localName,
  );
}

function routeRecognizerIdentity(
  spec: RouterIdentityProductRecordSpec,
): RouteRecognizerIdentity {
  return new RouteRecognizerIdentity(
    spec.identityHandle,
    spec.productKindKey,
    spec.ownerHandle,
    spec.sourceAddressHandle,
    spec.localName,
  );
}

export function routerOpenSeamRecords(
  store: KernelStore,
  spec: RouterOpenSeamRecordSpec,
): RouterOpenSeamRecordEmission {
  const evidenceHandle = store.handles.evidence(spec.local);
  const openSeam = new OpenSeam(
    store.handles.openSeam(spec.local),
    spec.seamKindKey,
    spec.summary,
    spec.sourceAddressHandle,
    evidenceHandle,
    spec.reasonKinds,
    spec.reasonSources ?? [],
  );
  return {
    openSeam,
    records: [
      new EvidenceRecord(
        evidenceHandle,
        spec.evidenceKind,
        spec.evidenceRoles,
        spec.summary,
        spec.sourceAddressHandle,
      ),
      openSeam,
      new MaterializationRecord(
        store.handles.materialization(spec.local),
        spec.ownerHandle,
        [],
        [],
        [openSeam.handle],
      ),
    ],
  };
}
