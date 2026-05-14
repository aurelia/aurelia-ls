import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import type {
  RuntimeHtmlBindingFrameworkErrorCode,
} from './framework-error-code.js';
import type {
  I18nTranslationBindingFrameworkErrorCode,
} from '../i18n/framework-error-code.js';
import type {
  RuntimeBindingReference,
} from './runtime-binding.js';

export type RuntimeBindingFrameworkErrorCode =
  | RuntimeHtmlBindingFrameworkErrorCode
  | I18nTranslationBindingFrameworkErrorCode;

export const enum RuntimeBindingIssuePhase {
  SpreadCreate = 'spread-create',
  SpreadChildAdmission = 'spread-child-admission',
  SpreadBind = 'spread-bind',
  TranslationCreate = 'translation-create',
  TranslationBind = 'translation-bind',
}

export const enum RuntimeBindingIssueKind {
  SpreadScopeContextMissing = 'spread-scope-context-missing',
  SpreadTemplateControllerUnsupported = 'spread-template-controller-unsupported',
  TranslationKeyNotFound = 'translation-key-not-found',
  TranslationParameterAlreadyExists = 'translation-parameter-already-exists',
  TranslationKeyInvalid = 'translation-key-invalid',
}

export type RuntimeBindingIssueField =
  | 'binding'
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'frameworkErrorCode'
  | 'source';

/** Framework-runtime issue discovered while a modeled runtime binding executes its own lifecycle. */
export class RuntimeBindingIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Binding.RuntimeBindingIssue.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly phase: RuntimeBindingIssuePhase,
    readonly issueKind: RuntimeBindingIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: RuntimeBindingFrameworkErrorCode | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingIssueField>[] = [],
  ) {}
}

export class RuntimeBindingIssuePublication {
  constructor(
    readonly issue: RuntimeBindingIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes binding-owned framework runtime issue products such as SpreadBinding failures. */
export class RuntimeBindingIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    local: string,
    binding: RuntimeBindingReference,
    ownerIdentityHandle: IdentityHandle,
    provenanceHandle: ProvenanceHandle,
    phase: RuntimeBindingIssuePhase,
    issueKind: RuntimeBindingIssueKind,
    message: string,
    frameworkErrorCode: RuntimeBindingFrameworkErrorCode | null,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeBindingIssuePublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new RuntimeBindingIssue(
      productHandle,
      identityHandle,
      binding,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
    );
    return new RuntimeBindingIssuePublication(
      issue,
      recordsForRuntimeBindingIssue(issue, ownerIdentityHandle, provenanceHandle),
    );
  }
}

function recordsForRuntimeBindingIssue(
  issue: RuntimeBindingIssue,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      issue.identityHandle,
      KernelVocabulary.Binding.RuntimeBindingIssue.key,
      ownerIdentityHandle,
      issue.sourceAddressHandle,
      `${issue.phase}:${issue.issueKind}`,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Binding.RuntimeBindingIssue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}
