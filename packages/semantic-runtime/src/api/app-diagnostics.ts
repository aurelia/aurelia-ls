import {
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import type {
  SemanticAppDiagnosticRow,
  SemanticAppQuery,
  SemanticAppQueryKind,
  SemanticConfigurationIssueRow,
  SemanticDiIssueRow,
  SemanticDialogIssueRow,
  SemanticEvaluationIssueRow,
  SemanticFetchClientIssueRow,
  SemanticObservationIssueRow,
  SemanticResourceIssueRow,
  SemanticRouterIssueRow,
  SemanticRouteRecognizerIssueRow,
  SemanticStateIssueRow,
  SemanticTemplateDiagnosticRow,
  SemanticValidationIssueRow,
} from './contracts.js';
import type { SemanticSourceReference } from './source-reference.js';

export function appDiagnosticRows(
  projectKey: string,
  query: SemanticAppQuery,
  evaluationRows: readonly SemanticEvaluationIssueRow[],
  configurationRows: readonly SemanticConfigurationIssueRow[],
  diRows: readonly SemanticDiIssueRow[],
  observationRows: readonly SemanticObservationIssueRow[],
  templateRows: readonly SemanticTemplateDiagnosticRow[],
  resourceRows: readonly SemanticResourceIssueRow[],
  stateRows: readonly SemanticStateIssueRow[],
  validationRows: readonly SemanticValidationIssueRow[],
  fetchClientRows: readonly SemanticFetchClientIssueRow[],
  dialogRows: readonly SemanticDialogIssueRow[],
  routerRows: readonly SemanticRouterIssueRow[],
  routeRows: readonly SemanticRouteRecognizerIssueRow[],
): readonly SemanticAppDiagnosticRow[] {
  const sourceFilePath = query.sourceFile?.filePath ?? null;
  return [
    ...evaluationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(evaluationAppDiagnosticRow),
    ...configurationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(configurationAppDiagnosticRow),
    ...diRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(diAppDiagnosticRow),
    ...observationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(observationAppDiagnosticRow),
    ...templateRows.map((row) => templateAppDiagnosticRow(projectKey, row)),
    ...resourceRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(resourceAppDiagnosticRow),
    ...stateRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(stateAppDiagnosticRow),
    ...validationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(validationAppDiagnosticRow),
    ...fetchClientRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(fetchClientAppDiagnosticRow),
    ...dialogRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(dialogAppDiagnosticRow),
    ...routerRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(routerAppDiagnosticRow),
    ...routeRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map(routeAppDiagnosticRow),
  ].sort((left, right) =>
    `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.diagnosticDomain}:${left.diagnosticKind}`
      .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.diagnosticDomain}:${right.diagnosticKind}`)
      );
}

function evaluationAppDiagnosticRow(
  row: SemanticEvaluationIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'evaluation',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    frameworkRawErrorAuthority: row.frameworkRawErrorAuthority,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'evaluation-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function configurationAppDiagnosticRow(
  row: SemanticConfigurationIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'configuration',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'configuration-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function diAppDiagnosticRow(
  row: SemanticDiIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'di',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'di-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function observationAppDiagnosticRow(
  row: SemanticObservationIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'observation',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'observation-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function templateAppDiagnosticRow(
  projectKey: string,
  row: SemanticTemplateDiagnosticRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey,
    diagnosticDomain: 'template',
    diagnosticKind: row.diagnosticKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.summary,
    source: row.source,
    relatedQueryKind: 'template-diagnostics' satisfies `${SemanticAppQueryKind}`,
  };
}

function resourceAppDiagnosticRow(
  row: SemanticResourceIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'resource',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'resource-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function stateAppDiagnosticRow(
  row: SemanticStateIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'state',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    frameworkRawErrorAuthority: row.frameworkRawErrorAuthority,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'state-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function validationAppDiagnosticRow(
  row: SemanticValidationIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'validation',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'validation-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function fetchClientAppDiagnosticRow(
  row: SemanticFetchClientIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'fetch-client',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'fetch-client-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function dialogAppDiagnosticRow(
  row: SemanticDialogIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'dialog',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'dialog-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function routerAppDiagnosticRow(
  row: SemanticRouterIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'router',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'router-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function routeAppDiagnosticRow(
  row: SemanticRouteRecognizerIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'route-recognizer',
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    frameworkRawErrorAuthority: row.frameworkRawErrorAuthority,
    severity: 'error',
    summary: row.message,
    source: row.source,
    relatedQueryKind: 'route-recognizer-issues' satisfies `${SemanticAppQueryKind}`,
  };
}

function diagnosticSourceMatches(
  source: SemanticSourceReference | null,
  filePath: string | null,
): boolean {
  return filePath == null
    || (source?.path != null && sourcePathMatchesFileName(source.path, filePath));
}
