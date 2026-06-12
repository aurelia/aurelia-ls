import {
  CompilerIdentity,
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
  TemplateCompilerIssue,
  type TemplateCompilerIssueKind,
  type TemplateCompilerIssuePhase,
  type TemplateCompilerIssueSeverity,
} from './compiler-issue.js';

export class TemplateCompilerIssuePublication {
  constructor(
    readonly issue: TemplateCompilerIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes source-backed template-compiler issue products from compiler passes. */
export class TemplateCompilerIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    local: string,
    ownerIdentityHandle: IdentityHandle,
    provenanceHandle: ProvenanceHandle,
    phase: TemplateCompilerIssuePhase,
    issueKind: TemplateCompilerIssueKind,
    message: string,
    frameworkErrorCode: string | null,
    sourceAddressHandle: AddressHandle | null,
    severity: TemplateCompilerIssueSeverity = 'error',
  ): TemplateCompilerIssuePublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new TemplateCompilerIssue(
      productHandle,
      identityHandle,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
      [],
      severity,
    );
    return new TemplateCompilerIssuePublication(
      issue,
      compilerIssueRecords(issue, ownerIdentityHandle, provenanceHandle),
    );
  }
}

function compilerIssueRecords(
  issue: TemplateCompilerIssue,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      issue.identityHandle,
      KernelVocabulary.Compiler.Issue.key,
      ownerIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Compiler.Issue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}
