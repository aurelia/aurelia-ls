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
import type { RuntimeHtmlRendererFrameworkErrorCode } from './framework-error-code.js';
import type { RuntimeRendererReference } from './runtime-renderer-reference.js';

export const enum RuntimeRendererIssuePhase {
  Render = 'render',
}

export const enum RuntimeRendererIssueKind {
  NotSupportedViewRefApi = 'not-supported-view-ref-api',
  RefHostIsNotCustomElement = 'ref-host-is-not-custom-element',
  NamedRefHostIsNotCustomElement = 'named-ref-host-is-not-custom-element',
  RefTargetNotFound = 'ref-target-not-found',
  SpreadingInvalidTarget = 'spreading-invalid-target',
}

export type RuntimeRendererIssueField =
  | 'renderer'
  | 'instruction'
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'frameworkErrorCode'
  | 'source';

/** Framework-runtime issue discovered while an IRenderer spends a lowered instruction. */
export class RuntimeRendererIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Compiler.RuntimeRendererIssue.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly phase: RuntimeRendererIssuePhase,
    readonly issueKind: RuntimeRendererIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: RuntimeHtmlRendererFrameworkErrorCode | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererIssueField>[] = [],
  ) {}
}

export class RuntimeRendererIssuePublication {
  constructor(
    readonly issue: RuntimeRendererIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes renderer-owned framework runtime issue products. */
export class RuntimeRendererIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    local: string,
    renderer: RuntimeRendererReference,
    instructionProductHandle: ProductHandle,
    instructionIdentityHandle: IdentityHandle,
    provenanceHandle: ProvenanceHandle,
    phase: RuntimeRendererIssuePhase,
    issueKind: RuntimeRendererIssueKind,
    message: string,
    frameworkErrorCode: RuntimeHtmlRendererFrameworkErrorCode | null,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeRendererIssuePublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new RuntimeRendererIssue(
      productHandle,
      identityHandle,
      renderer,
      instructionProductHandle,
      instructionIdentityHandle,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
    );
    return new RuntimeRendererIssuePublication(issue, recordsForRuntimeRendererIssue(issue, provenanceHandle));
  }
}

function recordsForRuntimeRendererIssue(
  issue: RuntimeRendererIssue,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      issue.identityHandle,
      KernelVocabulary.Compiler.RuntimeRendererIssue.key,
      issue.renderer.identityHandle ?? issue.instructionIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Compiler.RuntimeRendererIssue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}
