import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { EvaluationIssue } from '../evaluation/evaluation-issue.js';
import type { KernelStore } from '../kernel/store.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticEvaluationIssueRow,
  SemanticEvaluationIssuesResult,
} from './contracts.js';

export function readEvaluationIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticEvaluationIssuesResult['rows'] {
  return emission.evaluationIssues.readIssues()
    .map((issue) => evaluationIssueRow(store, issue, handles))
    .sort((left, right) =>
      `${left.phase}:${left.issueKind}:${left.source?.label ?? ''}`
        .localeCompare(`${right.phase}:${right.issueKind}:${right.source?.label ?? ''}`)
    );
}

function evaluationIssueRow(
  store: KernelStore,
  issue: EvaluationIssue,
  handles: boolean,
): SemanticEvaluationIssueRow {
  return {
    projectKey: issue.projectKey,
    phase: issue.phase,
    issueKind: issue.issueKind,
    subjectKind: issue.subjectKind,
    diagnosticAuthority: issue.frameworkErrorCode != null
      ? 'framework-error-code'
      : issue.frameworkRawErrorAuthority != null
        ? 'framework-runtime-behavior'
        : 'semantic-runtime-product',
    frameworkErrorCode: issue.frameworkErrorCode,
    frameworkRawErrorAuthority: issue.frameworkRawErrorAuthority?.key ?? null,
    severity: issue.severity,
    message: issue.message,
    actualValueKind: issue.actualValueKind,
    inputExpressionText: issue.inputExpressionText,
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
