import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import {
  ObservationIdentity,
} from '../kernel/identity.js';
import {
  MaterializedProduct,
} from '../kernel/materialization.js';
import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  ObservationIssue,
  type ObservationIssueKind,
  type ObservationIssuePhase,
} from './observation-issue.js';
import type { ObservationFrameworkErrorCode } from './framework-error-code.js';

export class ObservationIssuePublication {
  constructor(
    readonly issue: ObservationIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes source-backed observation issue products. */
export class ObservationIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    local: string,
    projectKey: string,
    phase: ObservationIssuePhase,
    issueKind: ObservationIssueKind,
    message: string,
    frameworkErrorCode: ObservationFrameworkErrorCode | null,
    sourceAddressHandle: AddressHandle | null,
  ): ObservationIssuePublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const source = recordsForObservationIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
    );
    const issue = new ObservationIssue(
      productHandle,
      identityHandle,
      projectKey,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
      [],
    );
    return new ObservationIssuePublication(
      issue,
      [
        ...source.records,
        ...observationIssueRecords(issue, source.provenanceHandle),
      ],
    );
  }
}

function recordsForObservationIssueSource(
  store: KernelStore,
  local: string,
  summary: string,
  addressHandle: AddressHandle | null,
): {
  readonly records: readonly KernelStoreRecord[];
  readonly provenanceHandle: ProvenanceHandle;
} {
  const evidenceHandle = store.handles.evidence(`${local}:evidence`);
  const provenanceHandle = store.handles.provenance(`${local}:provenance`);
  return {
    records: [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SourceObservation,
        [EvidenceRole.Diagnostic],
        summary,
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ],
    provenanceHandle,
  };
}

function observationIssueRecords(
  issue: ObservationIssue,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new ObservationIdentity(
      issue.identityHandle,
      KernelVocabulary.Observation.Issue.key,
      null,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Observation.Issue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}
