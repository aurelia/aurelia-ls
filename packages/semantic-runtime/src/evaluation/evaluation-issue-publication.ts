import {
  EvaluationIdentity,
} from '../kernel/identity.js';
import {
  MaterializedProduct,
} from '../kernel/materialization.js';
import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type {
  EvaluationIssue,
} from './evaluation-issue.js';

export class EvaluationIssuePublication {
  constructor(
    readonly issue: EvaluationIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export function evaluationIssueProductRecords(
  store: KernelStore,
  issue: EvaluationIssue,
  ownerHandle: AddressHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new EvaluationIdentity(
      issue.identityHandle,
      KernelVocabulary.Evaluation.Issue.key,
      ownerHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Evaluation.Issue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}
