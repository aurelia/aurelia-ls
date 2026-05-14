import type ts from 'typescript';
import { EvidenceKind, EvidenceRole } from '../kernel/evidence.js';
import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import { SourceSpanRole } from '../kernel/address.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationRecognitionContext } from './configuration-recognition-context.js';
import { ConfigurationKernelPublication } from './configuration-publication.js';
import {
  ConfigurationIssue,
  ConfigurationIssueKind,
  ConfigurationIssuePhase,
} from './configuration-issue.js';
import type { ConfigurationFrameworkErrorCode } from './framework-error-code.js';

export class ConfigurationIssuePublication {
  constructor(
    readonly issue: ConfigurationIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes configuration-owned framework diagnostics as first-class products. */
export class ConfigurationIssuePublisher {
  private readonly publication: ConfigurationKernelPublication;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publication = new ConfigurationKernelPublication(store);
  }

  publish(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    local: string,
    issueKind: ConfigurationIssueKind,
    message: string,
    frameworkErrorCode: ConfigurationFrameworkErrorCode | null,
  ): ConfigurationIssuePublication {
    const source = this.publication.recordsForSource(
      context,
      node,
      local,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
      message,
      SourceSpanRole.Range,
    );
    const handles = this.publication.configurationProductHandles(local);
    const issue = new ConfigurationIssue(
      handles.productHandle,
      handles.identityHandle,
      context.projectKey,
      ConfigurationIssuePhase.FrameworkServiceCustomization,
      issueKind,
      message,
      source.addressHandle,
      frameworkErrorCode,
    );
    const productRecords = this.publication.configurationProductRecords({
      local,
      productHandle: issue.productHandle,
      identityHandle: issue.identityHandle,
      productKindKey: KernelVocabulary.Configuration.Issue.key,
      ownerHandle: null,
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
      localName: issue.issueKind,
    });
    return new ConfigurationIssuePublication(issue, [...source.records, ...productRecords]);
  }
}
