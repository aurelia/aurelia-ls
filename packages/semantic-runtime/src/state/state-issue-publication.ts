import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import { StateIdentity } from '../kernel/identity.js';
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
  StateIssue,
  type StateIssueKind,
  type StateIssuePhase,
} from './state-issue.js';
import type { StateRawErrorAuthority } from './framework-raw-error-authority.js';

export type StateIssuePublication = IssuePublication<StateIssue>;

export class StateIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    projectKey: string,
    ownerIdentityHandle: IdentityHandle | null,
    phase: StateIssuePhase,
    issueKind: StateIssueKind,
    message: string,
    frameworkRawErrorAuthority: StateRawErrorAuthority | null,
    sourceAddressHandle: AddressHandle | null,
    localName: string | null,
  ): StateIssuePublication {
    const local = [
      'state-issue',
      localKeyPart(projectKey),
      localKeyPart(issueKind),
      localKeyPart(localName ?? 'open'),
      localKeyPart(ownerIdentityHandle ?? 'no-owner'),
      `${sourceAddressHandle ?? 'no-source'}`,
    ].join(':');
    return publishIssueProduct(this.store, {
      local,
      productKindKey: KernelVocabulary.State.Issue.key,
      evidenceRoles: [EvidenceRole.Configuration, EvidenceRole.Diagnostic],
      evidenceSummary: message,
      sourceAddressHandle,
      materializationOwnerHandle: ownerIdentityHandle ?? sourceAddressHandle,
      createIssue: ({ productHandle, identityHandle }) => new StateIssue(
        productHandle,
        identityHandle,
        projectKey,
        ownerIdentityHandle,
        phase,
        issueKind,
        message,
        frameworkRawErrorAuthority,
        localName,
        sourceAddressHandle,
      ),
      createIdentity: (identityHandle) => new StateIdentity(
        identityHandle,
        KernelVocabulary.State.Issue.key,
        ownerIdentityHandle,
        sourceAddressHandle,
        localName,
      ),
    });
  }
}
