import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { ConfigurationIssue } from '../configuration/configuration-issue.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import type { KernelStore } from '../kernel/store.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticConfigurationIssueRow,
  SemanticConfigurationIssuesResult,
} from './contracts.js';

export function readConfigurationIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticConfigurationIssuesResult['rows'] {
  return readProjectConfigurationIssues(emission, store)
    .map((issue) => configurationIssueRow(store, issue, handles))
    .sort((left, right) =>
      `${left.phase}:${left.issueKind}:${left.source?.label ?? ''}`
        .localeCompare(`${right.phase}:${right.issueKind}:${right.source?.label ?? ''}`)
    );
}

function readProjectConfigurationIssues(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly ConfigurationIssue[] {
  return store.productDetails.readBySlot(ConfigurationProductDetails.Issue)
    .map((entry) => entry.detail)
    .filter((issue) => issue.projectKey === emission.project.projectKey);
}

function configurationIssueRow(
  store: KernelStore,
  issue: ConfigurationIssue,
  handles: boolean,
): SemanticConfigurationIssueRow {
  return {
    projectKey: issue.projectKey,
    phase: issue.phase,
    issueKind: issue.issueKind,
    diagnosticAuthority: issue.frameworkErrorCode == null ? 'semantic-runtime-product' : 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: 'error',
    message: issue.message,
    source: describeAddress(store, issue.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      },
    } : {}),
  };
}
