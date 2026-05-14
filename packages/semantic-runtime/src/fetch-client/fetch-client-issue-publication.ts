import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import { FetchClientIdentity } from '../kernel/identity.js';
import {
  type IssuePublication,
  publishIssueProduct,
} from '../kernel/issue-publication.js';
import { localKeyPart } from '../kernel/local-key.js';
import type {
  KernelStore,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  FetchClientIssue,
  type FetchClientIssueKind,
  type FetchClientIssuePhase,
} from './fetch-client-issue.js';
import type { FetchClientFrameworkErrorCode } from './framework-error-code.js';

export type FetchClientIssuePublication = IssuePublication<FetchClientIssue>;

export class FetchClientIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    projectKey: string,
    ownerIdentityHandle: IdentityHandle | null,
    phase: FetchClientIssuePhase,
    issueKind: FetchClientIssueKind,
    message: string,
    frameworkErrorCode: FetchClientFrameworkErrorCode,
    sourceAddressHandle: AddressHandle | null,
    localName: string | null,
  ): FetchClientIssuePublication {
    const local = [
      'fetch-client-issue',
      localKeyPart(projectKey),
      localKeyPart(issueKind),
      localKeyPart(localName ?? 'open'),
      localKeyPart(ownerIdentityHandle ?? 'no-owner'),
      `${sourceAddressHandle ?? 'no-source'}`,
    ].join(':');
    return publishIssueProduct(this.store, {
      local,
      productKindKey: KernelVocabulary.FetchClient.Issue.key,
      evidenceRoles: [EvidenceRole.Configuration, EvidenceRole.Diagnostic],
      evidenceSummary: message,
      sourceAddressHandle,
      materializationOwnerHandle: ownerIdentityHandle ?? sourceAddressHandle,
      createIssue: ({ productHandle, identityHandle }) => new FetchClientIssue(
        productHandle,
        identityHandle,
        projectKey,
        ownerIdentityHandle,
        phase,
        issueKind,
        message,
        frameworkErrorCode,
        localName,
        sourceAddressHandle,
      ),
      createIdentity: (identityHandle) => new FetchClientIdentity(
        identityHandle,
        KernelVocabulary.FetchClient.Issue.key,
        ownerIdentityHandle,
        sourceAddressHandle,
        localName,
      ),
    });
  }
}
