import {
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import { SourceFileRole } from '../kernel/address.js';
import type { SourceFileAdmission } from '../boot/frames.js';
import type {
  SemanticAppDiagnosticRow,
  SemanticAppDiagnosticSummaryRow,
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
  SemanticTypeScriptDiagnosticRow,
  SemanticValidationIssueRow,
} from './contracts.js';
import {
  semanticSourceReferenceMatchesFilePath,
  type SemanticSourceReference,
} from './source-reference.js';

export function appDiagnosticRows(
  sources: readonly SourceFileAdmission[],
  projectKey: string,
  query: SemanticAppQuery,
  typeScriptRows: readonly SemanticTypeScriptDiagnosticRow[],
  evaluationRows: readonly SemanticEvaluationIssueRow[],
  configurationRows: readonly SemanticConfigurationIssueRow[],
  diRows: readonly SemanticDiIssueRow[],
  observationRows: readonly SemanticObservationIssueRow[],
  templateRows: readonly SemanticTemplateDiagnosticRow[],
  frameworkRows: readonly SemanticAppDiagnosticRow[],
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
    ...typeScriptRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => typeScriptAppDiagnosticRow(row)),
    ...evaluationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(evaluationAppDiagnosticRow(row), projectKey, sources)),
    ...configurationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(configurationAppDiagnosticRow(row), projectKey, sources)),
    ...diRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(diAppDiagnosticRow(row), projectKey, sources)),
    ...observationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(observationAppDiagnosticRow(row), projectKey, sources)),
    ...templateRows
      .filter(templateDiagnosticContributesToAppDiagnostics)
      .map((row) => appDiagnosticRowWithSourceRole(templateAppDiagnosticRow(projectKey, row), projectKey, sources)),
    ...frameworkRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(row, projectKey, sources)),
    ...resourceRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(resourceAppDiagnosticRow(row), projectKey, sources)),
    ...stateRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(stateAppDiagnosticRow(row), projectKey, sources)),
    ...validationRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(validationAppDiagnosticRow(row), projectKey, sources)),
    ...fetchClientRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(fetchClientAppDiagnosticRow(row), projectKey, sources)),
    ...dialogRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(dialogAppDiagnosticRow(row), projectKey, sources)),
    ...routerRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(routerAppDiagnosticRow(row), projectKey, sources)),
    ...routeRows
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(routeAppDiagnosticRow(row), projectKey, sources)),
  ].sort((left, right) =>
    `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.diagnosticDomain}:${left.diagnosticKind}`
      .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.diagnosticDomain}:${right.diagnosticKind}`)
      );
}

export function appDiagnosticSummaryRows(
  rows: readonly SemanticAppDiagnosticRow[],
): readonly SemanticAppDiagnosticSummaryRow[] {
  const clusters = new Map<string, DiagnosticSummaryCluster>();
  for (const row of rows) {
    const key = diagnosticSummaryKey(row);
    let cluster = clusters.get(key);
    if (cluster == null) {
      cluster = {
        diagnosticDomain: row.diagnosticDomain,
        diagnosticKind: row.diagnosticKind,
        diagnosticAuthority: row.diagnosticAuthority,
        frameworkErrorCode: row.frameworkErrorCode,
        severity: row.severity,
        relatedQueryKind: row.relatedQueryKind,
        count: 0,
        sourceFiles: new Set<string>(),
        sourceRoles: new Map<string, number>(),
        sampleSummary: row.summary,
        sampleSources: [],
      };
      clusters.set(key, cluster);
    }
    cluster.count += 1;
    if (row.source?.path != null) {
      cluster.sourceFiles.add(row.source.path);
    }
    if (row.sourceRole != null) {
      cluster.sourceRoles.set(row.sourceRole, (cluster.sourceRoles.get(row.sourceRole) ?? 0) + 1);
    }
    if (row.source != null && cluster.sampleSources.length < 3 && !cluster.sampleSources.some((source) => source.label === row.source?.label)) {
      cluster.sampleSources.push(row.source);
    }
  }
  return [...clusters.values()]
    .map((cluster): SemanticAppDiagnosticSummaryRow => ({
      diagnosticDomain: cluster.diagnosticDomain,
      diagnosticKind: cluster.diagnosticKind,
      diagnosticAuthority: cluster.diagnosticAuthority,
      frameworkErrorCode: cluster.frameworkErrorCode,
      severity: cluster.severity,
      relatedQueryKind: cluster.relatedQueryKind,
      count: cluster.count,
      sourceFileCount: cluster.sourceFiles.size,
      sourceRoles: appDiagnosticSourceRoleCounts(cluster.sourceRoles),
      sampleSummary: cluster.sampleSummary,
      sampleSources: cluster.sampleSources,
    }))
    .sort((left, right) =>
      right.count - left.count
      || left.diagnosticDomain.localeCompare(right.diagnosticDomain)
      || left.diagnosticKind.localeCompare(right.diagnosticKind)
      || left.severity.localeCompare(right.severity)
      || (left.frameworkErrorCode ?? '').localeCompare(right.frameworkErrorCode ?? '')
    );
}

interface DiagnosticSummaryCluster {
  readonly diagnosticDomain: SemanticAppDiagnosticRow['diagnosticDomain'];
  readonly diagnosticKind: string;
  readonly diagnosticAuthority: SemanticAppDiagnosticRow['diagnosticAuthority'];
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticAppDiagnosticRow['severity'];
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  count: number;
  readonly sourceFiles: Set<string>;
  readonly sourceRoles: Map<string, number>;
  readonly sampleSummary: string;
  readonly sampleSources: SemanticSourceReference[];
}

function diagnosticSummaryKey(row: SemanticAppDiagnosticRow): string {
  return [
    row.diagnosticDomain,
    row.diagnosticKind,
    row.diagnosticAuthority,
    row.frameworkErrorCode ?? 'none',
    row.severity,
    row.relatedQueryKind,
  ].join('\0');
}

function templateDiagnosticContributesToAppDiagnostics(
  row: SemanticTemplateDiagnosticRow,
): boolean {
  return row.diagnosticKind !== 'router-framework-error';
}

function typeScriptAppDiagnosticRow(
  row: SemanticTypeScriptDiagnosticRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'typescript',
    diagnosticKind: row.diagnosticKind,
    diagnosticAuthority: 'typescript',
    frameworkErrorCode: null,
    severity: row.severity,
    summary: row.message,
    source: row.source,
    sourceRole: row.sourceRole,
    relatedQueryKind: 'typescript-diagnostics' satisfies `${SemanticAppQueryKind}`,
  };
}

function appDiagnosticSourceRoleCounts(
  roles: ReadonlyMap<string, number>,
): SemanticAppDiagnosticSummaryRow['sourceRoles'] {
  return [...roles.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role));
}

function appDiagnosticRowWithSourceRole(
  row: SemanticAppDiagnosticRow,
  projectKey: string,
  sources: readonly SourceFileAdmission[],
): SemanticAppDiagnosticRow {
  if (row.sourceRole != null) {
    return row;
  }
  const sourceRole = sourceRoleForDiagnosticReference(projectKey, sources, row.source);
  return sourceRole == null ? row : { ...row, sourceRole };
}

function sourceRoleForDiagnosticReference(
  projectKey: string,
  sources: readonly SourceFileAdmission[],
  source: SemanticSourceReference | null,
): SemanticAppDiagnosticRow['sourceRole'] {
  if (source == null) {
    return null;
  }
  if (source.path != null) {
    const path = source.path;
    const admission = sources.find((candidate) => sourcePathMatchesFileName(candidate.path, path)) ?? null;
    if (admission != null) {
      return admission.role;
    }
  }
  if (source.sourceWorkspaceKey != null && source.sourceWorkspaceKey !== projectKey) {
    return source.sourceFileRole === SourceFileRole.Declaration || source.sourceFileRole === SourceFileRole.Generated
      ? source.sourceFileRole
      : SourceFileRole.ExternalSource;
  }
  if (source.sourceFileRole != null) {
    return source.sourceFileRole;
  }
  return sourceRoleForDiagnosticReference(projectKey, sources, source.anchor ?? null);
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
    || diagnosticSourceReferenceMatches(source, filePath);
}

function diagnosticSourceReferenceMatches(
  source: SemanticSourceReference | null,
  filePath: string,
): boolean {
  return semanticSourceReferenceMatchesFilePath(source, filePath);
}
