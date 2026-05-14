import type { SourceSpan } from '../expression/source-span.js';
import { EvidenceKind, EvidenceRecord, EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { ProductKindKey } from '../kernel/vocabulary.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { RuntimeAstFrameworkErrorCode } from '../type-system/framework-error-code.js';
import type { RuntimeHtmlControllerFrameworkErrorCode } from './framework-error-code.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

export const enum RuntimeBindingScopeIssuePhase {
  IteratorSourceProjection = 'iterator-source-projection',
  IteratorLocalProjection = 'iterator-local-projection',
}

export const enum RuntimeBindingScopeIssueKind {
  RepeatNonIterable = 'repeat-non-iterable',
  DestructuringNonObject = 'destructuring-non-object',
  ArrayRestNonArray = 'array-rest-non-array',
}

export const enum RuntimeBindingScopeIssueCertainty {
  Definite = 'definite',
  Possible = 'possible',
}

/** Runtime binding scope issue discovered while a scope effect is spent into a modeled Scope. */
export class RuntimeBindingScopeIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Binding.ScopeIssue.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly ownerScopeEffectProductHandle: ProductHandle,
    readonly ownerScopeEffectIdentityHandle: IdentityHandle,
    readonly phase: RuntimeBindingScopeIssuePhase,
    readonly issueKind: RuntimeBindingScopeIssueKind,
    readonly certainty: RuntimeBindingScopeIssueCertainty,
    readonly message: string,
    readonly frameworkErrorCode: RuntimeAstFrameworkErrorCode | RuntimeHtmlControllerFrameworkErrorCode | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly sourceSpan: SourceSpan | null,
    readonly sourceType: CheckerTypeReference | null,
  ) {}
}

export class RuntimeBindingScopeIssuePublication {
  constructor(
    readonly issue: RuntimeBindingScopeIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes framework-runtime issues discovered while spending runtime binding scope effects. */
export class RuntimeBindingScopeIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    local: string,
    ownerScopeEffectProductHandle: ProductHandle,
    ownerScopeEffectIdentityHandle: IdentityHandle,
    phase: RuntimeBindingScopeIssuePhase,
    issueKind: RuntimeBindingScopeIssueKind,
    certainty: RuntimeBindingScopeIssueCertainty,
    message: string,
    frameworkErrorCode: RuntimeAstFrameworkErrorCode | RuntimeHtmlControllerFrameworkErrorCode | null,
    sourceAddressHandle: AddressHandle | null,
    sourceSpan: SourceSpan | null,
    sourceType: CheckerTypeReference | null,
  ): RuntimeBindingScopeIssuePublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new RuntimeBindingScopeIssue(
      productHandle,
      identityHandle,
      ownerScopeEffectProductHandle,
      ownerScopeEffectIdentityHandle,
      phase,
      issueKind,
      certainty,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
      sourceSpan,
      sourceType,
    );
    return new RuntimeBindingScopeIssuePublication(issue, this.recordsForIssue(local, issue));
  }

  private recordsForIssue(
    local: string,
    issue: RuntimeBindingScopeIssue,
  ): readonly KernelStoreRecord[] {
    const evidenceHandle = this.store.handles.evidence(`${local}:evidence`);
    const provenanceHandle = this.store.handles.provenance(`${local}:provenance`);
    return [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Diagnostic, EvidenceRole.Scope],
        issue.message,
        issue.sourceAddressHandle,
        issue.ownerScopeEffectIdentityHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      new CompilerIdentity(
        issue.identityHandle,
        KernelVocabulary.Binding.ScopeIssue.key,
        issue.ownerScopeEffectIdentityHandle,
        issue.sourceAddressHandle,
        `${issue.phase}:${issue.issueKind}:${issue.certainty}`,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Binding.ScopeIssue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        provenanceHandle,
      ),
    ];
  }
}
