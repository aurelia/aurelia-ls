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
import { OpenSeam, type OpenSeamReasonKind } from './open-seam.js';
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
  readonly includeProvenanceRecord?: boolean;
}

export class SourceOpenSeamEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly handle: OpenSeamHandle,
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
  const records: KernelStoreRecord[] = [];
  const handles: OpenSeamHandle[] = [];
  for (const input of inputs) {
    const emission = recordsForSourceOpenSeam(store, input);
    records.push(...emission.records);
    handles.push(emission.handle);
  }
  return new SourceOpenSeamBatchEmission(records, handles);
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
  ));

  return new SourceOpenSeamEmission(records, openSeamHandle);
}
