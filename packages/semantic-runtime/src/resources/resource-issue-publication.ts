import {
  ResourceProductIdentity,
} from '../kernel/identity.js';
import {
  MaterializedProduct,
} from '../kernel/materialization.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  ResourceIssue,
  type ResourceIssueKind,
  type ResourceIssuePhase,
  type ResourceIssueSeverity,
} from './resource-issue.js';

export class ResourceIssuePublication {
  constructor(
    readonly issue: ResourceIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes source-backed resource metadata issue products. */
export class ResourceIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    local: string,
    projectKey: string,
    ownerDefinitionIdentityHandle: IdentityHandle | null,
    provenanceHandle: ProvenanceHandle,
    phase: ResourceIssuePhase,
    issueKind: ResourceIssueKind,
    message: string,
    frameworkErrorCode: string | null,
    sourceAddressHandle: AddressHandle | null,
    severity: ResourceIssueSeverity = 'error',
  ): ResourceIssuePublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new ResourceIssue(
      productHandle,
      identityHandle,
      projectKey,
      ownerDefinitionIdentityHandle,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
      [],
      severity,
    );
    return new ResourceIssuePublication(
      issue,
      resourceIssueRecords(issue, ownerDefinitionIdentityHandle, provenanceHandle),
    );
  }
}

function resourceIssueRecords(
  issue: ResourceIssue,
  ownerDefinitionIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new ResourceProductIdentity(
      issue.identityHandle,
      KernelVocabulary.Resource.Issue.key,
      ownerDefinitionIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Resource.Issue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}
