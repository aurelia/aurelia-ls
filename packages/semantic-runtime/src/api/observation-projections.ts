import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type { ObservationIssue } from '../observation/observation-issue.js';
import {
  ObservationProductDetails,
} from '../observation/product-details.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticObservationIssueRow,
  SemanticObservationIssuesResult,
} from './contracts.js';

export function readObservationIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticObservationIssuesResult['rows'] {
  return readProjectObservationIssues(emission, store)
    .map((issue) => observationIssueRow(store, issue, handles))
    .sort((left, right) =>
      `${left.phase}:${left.issueKind}:${left.source?.label ?? ''}`
        .localeCompare(`${right.phase}:${right.issueKind}:${right.source?.label ?? ''}`)
    );
}

function readProjectObservationIssues(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly ObservationIssue[] {
  return store.productDetails.readBySlot(ObservationProductDetails.Issue)
    .map((entry) => entry.detail)
    .filter((issue) => issue.projectKey === emission.project.projectKey);
}

function observationIssueRow(
  store: KernelStore,
  issue: ObservationIssue,
  handles: boolean,
): SemanticObservationIssueRow {
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
