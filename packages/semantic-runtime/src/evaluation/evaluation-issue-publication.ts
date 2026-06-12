import type { EvidenceRole } from '../kernel/evidence.js';
import type { AddressHandle } from '../kernel/handles.js';
import { EvaluationIdentity } from '../kernel/identity.js';
import { publishIssueProduct } from '../kernel/issue-publication.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  EvaluationIssue,
  EvaluationIssueKind,
  EvaluationIssuePhase,
  EvaluationIssueSubjectKind,
} from './evaluation-issue.js';
import type { EvaluationFrameworkErrorCode } from './framework-error-code.js';
import type { EvaluationRawErrorAuthority } from './framework-raw-error-authority.js';
import type { EvaluationValueKind } from './values.js';

export class EvaluationIssuePublication {
  constructor(
    readonly issue: EvaluationIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export interface EvaluationIssuePublishInput {
  readonly local: string;
  readonly projectKey: string;
  readonly phase: EvaluationIssuePhase;
  readonly issueKind: EvaluationIssueKind;
  readonly subjectKind: EvaluationIssueSubjectKind;
  readonly message: string;
  readonly frameworkErrorCode: EvaluationFrameworkErrorCode | null;
  readonly frameworkRawErrorAuthority: EvaluationRawErrorAuthority | null;
  readonly actualValueKind: EvaluationValueKind | null;
  readonly rejectedValueText: string | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly ownerHandle: AddressHandle | null;
  readonly evidenceRoles: readonly EvidenceRole[];
}

/** Evaluation-specific issue publisher over the shared kernel issue product primitive. */
export class EvaluationIssuePublisher {
  constructor(
    private readonly store: KernelStore,
  ) {}

  publish(input: EvaluationIssuePublishInput): EvaluationIssuePublication {
    const publication = publishIssueProduct(this.store, {
      local: input.local,
      productKindKey: KernelVocabulary.Evaluation.Issue.key,
      evidenceRoles: input.evidenceRoles,
      evidenceSummary: input.message,
      sourceAddressHandle: input.sourceAddressHandle,
      materializationOwnerHandle: null,
      createIssue: (handles) => new EvaluationIssue(
        handles.productHandle,
        handles.identityHandle,
        input.projectKey,
        input.phase,
        input.issueKind,
        input.subjectKind,
        input.message,
        input.frameworkErrorCode,
        input.frameworkRawErrorAuthority,
        input.actualValueKind,
        input.rejectedValueText,
        input.sourceAddressHandle,
      ),
      createIdentity: (identityHandle, issue) => new EvaluationIdentity(
        identityHandle,
        KernelVocabulary.Evaluation.Issue.key,
        input.ownerHandle,
        input.sourceAddressHandle,
        issue.issueKind,
      ),
    });
    return new EvaluationIssuePublication(publication.issue, publication.records);
  }
}
