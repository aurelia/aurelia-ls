import {
  SourceSpanAddress,
  SourceSpanRole,
} from './address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  type EvidenceRole,
} from './evidence.js';
import type {
  AddressHandle,
  OpenSeamHandle,
} from './handles.js';
import { MaterializationRecord } from './materialization.js';
import { OpenSeam, type OpenSeamReasonKind, type OpenSeamReasonSource } from './open-seam.js';
import { ProvenanceRecord } from './provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from './store.js';
import type { OpenSeamKindKey } from './vocabulary.js';

export interface SourceOpenSeamInput {
  readonly localKey: string;
  readonly openKind: OpenSeamKindKey;
  readonly summary: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly start: number;
  readonly end: number;
  readonly evidenceRoles: readonly EvidenceRole[];
  readonly reasonKinds?: readonly OpenSeamReasonKind[];
  readonly reasonSources?: readonly OpenSeamReasonSource[];
  readonly includeProvenanceRecord?: boolean;
}

export class SourceOpenSeamEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handle: OpenSeamHandle,
    readonly addressHandle: AddressHandle,
  ) {}
}

export class SourceOpenSeamBatchEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handles: readonly OpenSeamHandle[],
  ) {}
}

export function recordsForSourceOpenSeams(
  store: KernelStore,
  inputs: readonly SourceOpenSeamInput[],
): SourceOpenSeamBatchEmission {
  return sourceOpenSeamBatch(inputs.map((input) => recordsForSourceOpenSeam(store, input)));
}

/** Publish source-backed seams as failed materializations rather than free-standing analysis evidence. */
export function recordsForSourceOpenMaterializations(
  store: KernelStore,
  inputs: readonly SourceOpenSeamInput[],
): SourceOpenSeamBatchEmission {
  return sourceOpenSeamBatch(inputs.map((input) => recordsForSourceOpenMaterialization(store, input)));
}

export function recordsForSourceOpenSeam(
  store: KernelStore,
  input: SourceOpenSeamInput,
): SourceOpenSeamEmission {
  const addressHandle = store.handles.address(`${input.localKey}:span`);
  const evidenceHandle = store.handles.evidence(input.localKey);
  const provenanceHandle = store.handles.provenance(input.localKey);
  const openSeamHandle = store.handles.openSeam(input.localKey);
  const records: KernelStoreRecord[] = [
    new SourceSpanAddress(
      addressHandle,
      input.sourceFileAddressHandle,
      input.start,
      input.end,
      SourceSpanRole.Range,
    ),
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      input.evidenceRoles,
      input.summary,
      addressHandle,
    ),
  ];

  if (input.includeProvenanceRecord) {
    records.push(new ProvenanceRecord(
      provenanceHandle,
      [evidenceHandle],
    ));
  }

  records.push(new OpenSeam(
    openSeamHandle,
    input.openKind,
    input.summary,
    addressHandle,
    evidenceHandle,
    input.reasonKinds ?? [],
    input.reasonSources ?? [],
  ));

  return new SourceOpenSeamEmission(records, openSeamHandle, addressHandle);
}

/** Publish one source-backed attempt which produced only unresolved pressure. */
export function recordsForSourceOpenMaterialization(
  store: KernelStore,
  input: SourceOpenSeamInput,
): SourceOpenSeamEmission {
  const emission = recordsForSourceOpenSeam(store, input);
  return new SourceOpenSeamEmission(
    [
      ...emission.records,
      new MaterializationRecord(
        store.handles.materialization(input.localKey),
        emission.addressHandle,
        [],
        [],
        [emission.handle],
      ),
    ],
    emission.handle,
    emission.addressHandle,
  );
}

function sourceOpenSeamBatch(
  emissions: readonly SourceOpenSeamEmission[],
): SourceOpenSeamBatchEmission {
  return new SourceOpenSeamBatchEmission(
    emissions.flatMap((emission) => emission.records),
    emissions.map((emission) => emission.handle),
  );
}
