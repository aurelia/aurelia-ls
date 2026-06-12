import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import type { ConfigurationRecognitionProjectResult } from './configuration-recognition-project-pass.js';
import {
  type ConfigurationOptionContribution,
} from './configuration-option.js';
import {
  ConfigurationIssue,
  ConfigurationIssueKind,
  ConfigurationIssuePhase,
} from './configuration-issue.js';
import { ConfigurationKernelPublication } from './configuration-publication.js';
import { ConfigurationProductDetails } from './product-details.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';

const I18N_CONFIGURATION_OPTIONS = new Set([
  'initOptions',
  'translationAttributeAliases',
  'i18nextWrapper',
]);

const ROUTER_CONFIGURATION_OPTIONS = new Set([
  'activeClass',
  'basePath',
  'buildTitle',
  'historyStrategy',
  'restorePreviousRouteTreeOnError',
  'treatQueryAsParameters',
  'useEagerLoading',
  'useHref',
  'useNavigationModel',
  'useUrlFragmentHash',
]);

class ConfigurationOptionShapeIssuePublication {
  constructor(
    readonly issue: ConfigurationIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export class ConfigurationOptionShapeIssueProjectResult {
  constructor(
    readonly issues: readonly ConfigurationIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes source-backed diagnostics for known framework configuration option paths. */
export class ConfigurationOptionShapeIssueMaterializer {
  private readonly publication: ConfigurationKernelPublication;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publication = new ConfigurationKernelPublication(store);
  }

  materializeAndEmit(
    configuration: ConfigurationRecognitionProjectResult,
  ): ConfigurationOptionShapeIssueProjectResult {
    const issues = invalidConfigurationOptionPaths(configuration)
      .map((contribution, index) => this.issueForContribution(configuration, contribution, index));
    const records = issues.flatMap((issue) => issue.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `configuration-option-shape-issues:${configuration.project.projectKey}`));
    }
    for (const issue of issues) {
      this.store.productDetails.add(ConfigurationProductDetails.Issue, issue.issue.productHandle, issue.issue);
    }
    return new ConfigurationOptionShapeIssueProjectResult(
      issues.map((issue) => issue.issue),
      records,
    );
  }

  private issueForContribution(
    configuration: ConfigurationRecognitionProjectResult,
    contribution: ConfigurationOptionContribution,
    index: number,
  ): ConfigurationOptionShapeIssuePublication {
    const message = configurationOptionShapeIssueMessage(contribution)
      ?? 'Configuration option path is not valid for this framework configuration.';
    const local = configurationOptionShapeIssueLocalKey(configuration, contribution, index);
    const evidenceHandle = this.store.handles.evidence(`${local}:evidence`);
    const provenanceHandle = this.store.handles.provenance(`${local}:provenance`);
    const handles = this.publication.configurationProductHandles(local);
    const issue = new ConfigurationIssue(
      handles.productHandle,
      handles.identityHandle,
      configuration.project.projectKey,
      ConfigurationIssuePhase.ConfigurationOptions,
      ConfigurationIssueKind.UnknownConfigurationOption,
      message,
      contribution.sourceAddressHandle,
      null,
    );
    return new ConfigurationOptionShapeIssuePublication(issue, [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
        message,
        contribution.sourceAddressHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      ...this.publication.configurationProductRecords({
        local,
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        productKindKey: KernelVocabulary.Configuration.Issue.key,
        ownerHandle: null,
        sourceAddressHandle: issue.sourceAddressHandle,
        provenanceHandle,
        localName: issue.issueKind,
      }),
    ]);
  }
}

function invalidConfigurationOptionPaths(
  configuration: ConfigurationRecognitionProjectResult,
): readonly ConfigurationOptionContribution[] {
  return configuration.readConfiguration().optionContributions.filter((contribution) =>
    configurationOptionShapeIssueMessage(contribution) != null
  );
}

function configurationOptionShapeIssueMessage(
  contribution: ConfigurationOptionContribution,
): string | null {
  if (contribution.configurationKind == null || contribution.optionPath[0] === 'customize') {
    return null;
  }
  const path = contribution.optionPath.join('.');
  switch (contribution.configurationKind) {
    case FrameworkRegistrationKind.I18nConfiguration:
      return i18nConfigurationOptionPathIsKnown(contribution.optionPath)
        ? null
        : `I18nConfiguration does not define '${path}' as a top-level customize option; translation resources belong under initOptions.resources.`;
    case FrameworkRegistrationKind.RouterConfiguration:
      return routerConfigurationOptionPathIsKnown(contribution.optionPath)
        ? null
        : `RouterConfiguration does not define '${path}' as a customize option.`;
    default:
      return null;
  }
}

function i18nConfigurationOptionPathIsKnown(
  optionPath: readonly string[],
): boolean {
  const first = optionPath[0] ?? null;
  if (first == null || !I18N_CONFIGURATION_OPTIONS.has(first)) {
    return false;
  }
  return first === 'initOptions' || optionPath.length === 1;
}

function routerConfigurationOptionPathIsKnown(
  optionPath: readonly string[],
): boolean {
  return optionPath.length === 1 && ROUTER_CONFIGURATION_OPTIONS.has(optionPath[0] ?? '');
}

function configurationOptionShapeIssueLocalKey(
  configuration: ConfigurationRecognitionProjectResult,
  contribution: ConfigurationOptionContribution,
  index: number,
): string {
  return [
    'configuration-option-shape-issue',
    localKeyPart(configuration.project.projectKey),
    localKeyPart(contribution.configurationKind ?? 'unknown'),
    localKeyPart(contribution.optionPath.join('.') || 'root'),
    localKeyPart(contribution.productHandle),
    index,
  ].join(':');
}
