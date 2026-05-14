import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import { ValidationIdentity } from '../kernel/identity.js';
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
  ValidationIssue,
  type ValidationIssueKind,
  type ValidationIssuePhase,
} from './validation-issue.js';
import type { ValidationFrameworkErrorCode } from './framework-error-code.js';

export type ValidationIssuePublication = IssuePublication<ValidationIssue>;

export class ValidationIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    projectKey: string,
    ownerIdentityHandle: IdentityHandle | null,
    phase: ValidationIssuePhase,
    issueKind: ValidationIssueKind,
    message: string,
    frameworkErrorCode: ValidationFrameworkErrorCode,
    sourceAddressHandle: AddressHandle | null,
    localName: string | null,
  ): ValidationIssuePublication {
    const local = [
      'validation-issue',
      localKeyPart(projectKey),
      localKeyPart(issueKind),
      localKeyPart(localName ?? 'open'),
      localKeyPart(ownerIdentityHandle ?? 'no-owner'),
      `${sourceAddressHandle ?? 'no-source'}`,
    ].join(':');
    return publishIssueProduct(this.store, {
      local,
      productKindKey: KernelVocabulary.Validation.Issue.key,
      evidenceRoles: [EvidenceRole.Usage, EvidenceRole.Diagnostic],
      evidenceSummary: message,
      sourceAddressHandle,
      materializationOwnerHandle: ownerIdentityHandle ?? sourceAddressHandle,
      createIssue: ({ productHandle, identityHandle }) => new ValidationIssue(
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
      createIdentity: (identityHandle) => new ValidationIdentity(
        identityHandle,
        KernelVocabulary.Validation.Issue.key,
        ownerIdentityHandle,
        sourceAddressHandle,
        localName,
      ),
    });
  }
}
