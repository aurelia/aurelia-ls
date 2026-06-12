import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import { DialogIdentity } from '../kernel/identity.js';
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
  DialogIssue,
  type DialogIssueKind,
  type DialogIssuePhase,
} from './dialog-issue.js';
import type { DialogFrameworkErrorCode } from './framework-error-code.js';

export type DialogIssuePublication = IssuePublication<DialogIssue>;

export class DialogIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    projectKey: string,
    ownerIdentityHandle: IdentityHandle | null,
    phase: DialogIssuePhase,
    issueKind: DialogIssueKind,
    message: string,
    frameworkErrorCode: DialogFrameworkErrorCode,
    sourceAddressHandle: AddressHandle | null,
    localName: string | null,
  ): DialogIssuePublication {
    const local = [
      'dialog-issue',
      localKeyPart(projectKey),
      localKeyPart(issueKind),
      localKeyPart(localName ?? 'open'),
      localKeyPart(ownerIdentityHandle ?? 'no-owner'),
      `${sourceAddressHandle ?? 'no-source'}`,
    ].join(':');
    return publishIssueProduct(this.store, {
      local,
      productKindKey: KernelVocabulary.Dialog.Issue.key,
      evidenceRoles: [EvidenceRole.Configuration, EvidenceRole.Diagnostic],
      evidenceSummary: message,
      sourceAddressHandle,
      materializationOwnerHandle: ownerIdentityHandle ?? sourceAddressHandle,
      createIssue: ({ productHandle, identityHandle }) => new DialogIssue(
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
      createIdentity: (identityHandle) => new DialogIdentity(
        identityHandle,
        KernelVocabulary.Dialog.Issue.key,
        ownerIdentityHandle,
        sourceAddressHandle,
        localName,
      ),
    });
  }
}
