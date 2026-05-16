import type ts from 'typescript';
import { EvidenceKind, EvidenceRole } from '../kernel/evidence.js';
import type { AddressHandle } from '../kernel/handles.js';
import { ConfigurationIdentity } from '../kernel/identity.js';
import {
  publishIssueProduct,
  type IssuePublication,
} from '../kernel/issue-publication.js';
import { SourceSpanRole } from '../kernel/address.js';
import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import { ConfigurationKernelPublication } from './configuration-publication.js';
import {
  ConfigurationIssue,
  ConfigurationIssueKind,
  ConfigurationIssuePhase,
} from './configuration-issue.js';
import type { ConfigurationFrameworkErrorCode } from './framework-error-code.js';

export type ConfigurationIssueProductPublication = IssuePublication<ConfigurationIssue>;

export class ConfigurationIssuePublication {
  constructor(
    readonly issue: ConfigurationIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export interface ConfigurationIssuePublishInput {
  readonly local: string;
  readonly projectKey: string;
  readonly phase: ConfigurationIssuePhase;
  readonly issueKind: ConfigurationIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: ConfigurationFrameworkErrorCode | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly ownerHandle: AddressHandle | null;
  readonly evidenceRoles: readonly EvidenceRole[];
}

/** Publishes configuration-owned framework diagnostics as first-class products. */
export class ConfigurationIssuePublisher {
  private readonly publication: ConfigurationKernelPublication;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publication = new ConfigurationKernelPublication(store);
  }

  publish(input: ConfigurationIssuePublishInput): ConfigurationIssuePublication {
    const publication = publishIssueProduct(this.store, {
      local: input.local,
      productKindKey: KernelVocabulary.Configuration.Issue.key,
      evidenceRoles: input.evidenceRoles,
      evidenceSummary: input.message,
      sourceAddressHandle: input.sourceAddressHandle,
      materializationOwnerHandle: input.ownerHandle ?? input.sourceAddressHandle,
      createIssue: ({ productHandle, identityHandle }) => new ConfigurationIssue(
        productHandle,
        identityHandle,
        input.projectKey,
        input.phase,
        input.issueKind,
        input.message,
        input.sourceAddressHandle,
        input.frameworkErrorCode,
      ),
      createIdentity: (identityHandle, issue) => new ConfigurationIdentity(
        identityHandle,
        KernelVocabulary.Configuration.Issue.key,
        null,
        input.sourceAddressHandle,
        issue.issueKind,
      ),
    });
    return new ConfigurationIssuePublication(publication.issue, publication.records);
  }

  publishForNode(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    local: string,
    issueKind: ConfigurationIssueKind,
    message: string,
    frameworkErrorCode: ConfigurationFrameworkErrorCode | null,
    phase: ConfigurationIssuePhase = ConfigurationIssuePhase.FrameworkServiceCustomization,
  ): ConfigurationIssuePublication {
    const source = this.publication.recordsForSource(
      context,
      node,
      `${local}:span`,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
      message,
      SourceSpanRole.Range,
    );
    const publication = this.publish({
      local,
      projectKey: context.projectKey,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle: source.addressHandle,
      ownerHandle: source.addressHandle,
      evidenceRoles: [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
    });
    return new ConfigurationIssuePublication(publication.issue, [...source.records, ...publication.records]);
  }
}
