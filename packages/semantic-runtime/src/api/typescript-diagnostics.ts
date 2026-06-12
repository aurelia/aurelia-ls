import type { TypeSystemDiagnostic } from '../type-system/diagnostics.js';
import {
  readTypeSystemProjectDiagnostics,
  readTypeSystemProjectSourceDiagnostics,
} from '../type-system/diagnostics.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { sourcePathMatchesFileName } from '../kernel/source-address.js';
import type { SourceFileAdmission } from '../boot/frames.js';
import {
  answer,
  outcomeForPagedRows,
  pageRows,
} from './answer-helpers.js';
import {
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticRuntimeSourceFileInput,
  type SemanticTemplateCursorDiagnosticSeverity,
  type SemanticTypeScriptDiagnosticRelatedInformationRow,
  type SemanticTypeScriptDiagnosticRow,
  type SemanticTypeScriptDiagnosticsResult,
  type SemanticTypeScriptDiagnosticSummaryResult,
  type SemanticTypeScriptDiagnosticSummaryRow,
} from './contracts.js';
import type { SemanticSourceReference } from './source-reference.js';
import {
  semanticTypeScriptEnvironmentDisplayText,
  semanticTypeScriptEnvironmentSummary,
} from './typescript-environment.js';

const TYPESCRIPT_DIAGNOSTIC_DISPLAY_LIMIT = 4;

export function readSemanticTypeScriptDiagnostics(
  typeSystem: TypeSystemProject,
  projectKey: string,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  page?: SemanticRuntimePageInput,
): SemanticRuntimeAnswer<SemanticTypeScriptDiagnosticsResult> {
  const rows = readSemanticTypeScriptDiagnosticRows(typeSystem, projectKey, sourceFile);
  const paged = pageRows(rows, page);
  const typeScript = semanticTypeScriptEnvironmentSummary(typeSystem);
  return answer(
    outcomeForPagedRows(paged),
    `Returned ${paged.rows.length} of ${rows.length} TypeScript diagnostic row(s).`,
    {
      displayText: semanticTypeScriptDiagnosticsDisplayText(paged.rows, rows.length, typeScript),
      typeScript,
      rows: paged.rows,
    },
    paged.page,
  );
}

export function readSemanticTypeScriptDiagnosticSummary(
  typeSystem: TypeSystemProject,
  projectKey: string,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  page?: SemanticRuntimePageInput,
): SemanticRuntimeAnswer<SemanticTypeScriptDiagnosticSummaryResult> {
  const diagnosticRows = readSemanticTypeScriptDiagnosticRows(typeSystem, projectKey, sourceFile);
  const rows = semanticTypeScriptDiagnosticSummaryRows(diagnosticRows);
  const paged = pageRows(rows, page);
  const typeScript = semanticTypeScriptEnvironmentSummary(typeSystem);
  return answer(
    outcomeForPagedRows(paged),
    `Returned ${paged.rows.length} of ${rows.length} TypeScript diagnostic cluster(s) covering ${diagnosticRows.length} diagnostic row(s).`,
    {
      totalDiagnosticRows: diagnosticRows.length,
      displayText: semanticTypeScriptDiagnosticSummaryDisplayText(paged.rows, diagnosticRows.length, typeScript),
      typeScript,
      rows: paged.rows,
    },
    paged.page,
  );
}

export function readSemanticTypeScriptDiagnosticRows(
  typeSystem: TypeSystemProject,
  projectKey: string,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
): readonly SemanticTypeScriptDiagnosticRow[] {
  const sourceFilePath = sourceFile?.filePath ?? null;
  const diagnostics = sourceFilePath == null
    ? readTypeSystemProjectDiagnostics(typeSystem)
    : readTypeSystemProjectSourceDiagnostics(typeSystem, sourceFilePath);
  return diagnostics
    .map((diagnostic) => semanticTypeScriptDiagnosticRow(typeSystem, projectKey, diagnostic))
    .filter((row) => typeScriptDiagnosticMatchesSource(row, sourceFilePath));
}

export function semanticTypeScriptDiagnosticSummaryRows(
  rows: readonly SemanticTypeScriptDiagnosticRow[],
): readonly SemanticTypeScriptDiagnosticSummaryRow[] {
  const clusters = new Map<string, MutableTypeScriptDiagnosticSummary>();
  for (const row of rows) {
    const key = [
      row.phase,
      row.category,
      row.code,
      row.typescriptSource ?? '',
      row.severity,
    ].join('\0');
    let cluster = clusters.get(key);
    if (cluster == null) {
      cluster = {
        phase: row.phase,
        category: row.category,
        code: row.code,
        diagnosticKind: row.diagnosticKind,
        severity: row.severity,
        typescriptSource: row.typescriptSource,
        count: 0,
        sourceFiles: new Set<string>(),
        sourceRoles: new Map<string, number>(),
        sampleMessage: row.message,
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
    .map((cluster): SemanticTypeScriptDiagnosticSummaryRow => ({
      phase: cluster.phase,
      category: cluster.category,
      code: cluster.code,
      diagnosticKind: cluster.diagnosticKind,
      severity: cluster.severity,
      typescriptSource: cluster.typescriptSource,
      count: cluster.count,
      sourceFileCount: cluster.sourceFiles.size,
      sourceRoles: typeScriptDiagnosticSourceRoleCounts(cluster.sourceRoles),
      sampleMessage: cluster.sampleMessage,
      sampleSources: cluster.sampleSources,
    }))
    .sort((left, right) =>
      right.count - left.count
      || left.severity.localeCompare(right.severity)
      || left.code - right.code
      || left.phase.localeCompare(right.phase)
    );
}

interface MutableTypeScriptDiagnosticSummary {
  readonly phase: SemanticTypeScriptDiagnosticSummaryRow['phase'];
  readonly category: SemanticTypeScriptDiagnosticSummaryRow['category'];
  readonly code: number;
  readonly diagnosticKind: string;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly typescriptSource: string | null;
  count: number;
  readonly sourceFiles: Set<string>;
  readonly sourceRoles: Map<string, number>;
  readonly sampleMessage: string;
  readonly sampleSources: SemanticSourceReference[];
}

function semanticTypeScriptDiagnosticRow(
  typeSystem: TypeSystemProject,
  projectKey: string,
  diagnostic: TypeSystemDiagnostic,
): SemanticTypeScriptDiagnosticRow {
  const sourceRole = sourceRoleForTypeSystemDiagnostic(typeSystem, diagnostic.source);
  return {
    projectKey,
    phase: diagnostic.phase,
    category: diagnostic.category,
    code: diagnostic.code,
    diagnosticKind: `TS${diagnostic.code}`,
    severity: semanticTypeScriptDiagnosticSeverity(diagnostic.category),
    message: diagnostic.message,
    typescriptSource: diagnostic.typescriptSource,
    source: sourceReferenceForTypeSystemDiagnostic(diagnostic.source),
    sourceRole,
    relatedInformation: diagnostic.relatedInformation.map((related): SemanticTypeScriptDiagnosticRelatedInformationRow => ({
      category: related.category,
      code: related.code,
      message: related.message,
      typescriptSource: related.typescriptSource,
      source: sourceReferenceForTypeSystemDiagnostic(related.source),
      sourceRole: sourceRoleForTypeSystemDiagnostic(typeSystem, related.source),
    })),
  };
}

function sourceRoleForTypeSystemDiagnostic(
  typeSystem: TypeSystemProject,
  source: TypeSystemDiagnostic['source'],
): SemanticTypeScriptDiagnosticRow['sourceRole'] {
  if (source == null) {
    return null;
  }
  return sourceAdmissionForDiagnosticFileName(typeSystem.project.sourceFiles, source.fileName)?.role
    ?? typeSystem.readProgramSourceFileRole(source.fileName);
}

function sourceAdmissionForDiagnosticFileName(
  sources: readonly SourceFileAdmission[],
  fileName: string,
): SourceFileAdmission | null {
  return sources.find((source) => sourcePathMatchesFileName(source.path, fileName)) ?? null;
}

function sourceReferenceForTypeSystemDiagnostic(
  source: TypeSystemDiagnostic['source'],
): SemanticSourceReference | null {
  if (source == null) {
    return null;
  }
  return {
    kind: 'typescript-diagnostic',
    label: `${source.fileName}@${source.start}..${source.end}`,
    path: source.fileName,
    start: source.start,
    end: source.end,
    role: `line:${source.line}:character:${source.character}`,
  };
}

export function semanticTypeScriptDiagnosticSeverity(
  category: TypeSystemDiagnostic['category'],
): SemanticTemplateCursorDiagnosticSeverity {
  switch (category) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'suggestion':
    case 'message':
      return 'information';
  }
}

function typeScriptDiagnosticMatchesSource(
  row: SemanticTypeScriptDiagnosticRow,
  filePath: string | null,
): boolean {
  return filePath == null
    || (row.source?.path != null && sourcePathMatchesFileName(row.source.path, filePath));
}

function semanticTypeScriptDiagnosticsDisplayText(
  rows: readonly SemanticTypeScriptDiagnosticRow[],
  totalRows: number,
  typeScript: SemanticTypeScriptDiagnosticsResult['typeScript'],
): string {
  const lines = [
    `TypeScript diagnostics: returned ${rows.length} of ${totalRows} row(s).`,
    semanticTypeScriptEnvironmentDisplayText(typeScript),
  ];
  if (totalRows === 0) {
    lines.push('Pressure: no ordinary TypeScript diagnostics in this locus.');
  } else {
    lines.push(`Severity: ${typeScriptDiagnosticCountDisplay(rows, (row) => row.severity)}.`);
    lines.push(`Codes: ${rows.slice(0, TYPESCRIPT_DIAGNOSTIC_DISPLAY_LIMIT).map((row) => row.diagnosticKind).join(', ')}${rows.length > TYPESCRIPT_DIAGNOSTIC_DISPLAY_LIMIT ? ', ...' : ''}.`);
    lines.push(`Samples: ${rows.slice(0, TYPESCRIPT_DIAGNOSTIC_DISPLAY_LIMIT).map((row) =>
      `${row.diagnosticKind}: ${trimTypeScriptDiagnosticMessage(row.message)}`
    ).join(' | ')}.`);
    lines.push('Next: fix these with the same priority as tsc/noEmit errors, then rerun app diagnostics after lint or formatter autofixes.');
  }
  return lines.join('\n');
}

function semanticTypeScriptDiagnosticSummaryDisplayText(
  rows: readonly SemanticTypeScriptDiagnosticSummaryRow[],
  totalDiagnosticRows: number,
  typeScript: SemanticTypeScriptDiagnosticSummaryResult['typeScript'],
): string {
  const lines = [
    `TypeScript diagnostic clusters: returned ${rows.length} cluster(s) covering ${totalDiagnosticRows} diagnostic row(s).`,
    semanticTypeScriptEnvironmentDisplayText(typeScript),
  ];
  if (totalDiagnosticRows === 0) {
    lines.push('Pressure: no ordinary TypeScript diagnostics in this locus.');
  } else {
    lines.push(`Severity: ${typeScriptDiagnosticCountDisplay(rows, (row) => row.severity)}.`);
    lines.push(`Clusters: ${rows.slice(0, TYPESCRIPT_DIAGNOSTIC_DISPLAY_LIMIT).map((row) =>
      `${row.diagnosticKind} ${row.severity} x${row.count} (${row.phase})`
    ).join(' | ')}.`);
    lines.push('Next: page typescript-diagnostics for exact source rows, and rerun diagnostic-overview after lint autofixes.');
  }
  return lines.join('\n');
}

function typeScriptDiagnosticCountDisplay<TRow>(
  rows: readonly TRow[],
  read: (row: TRow) => string,
): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = read(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function typeScriptDiagnosticSourceRoleCounts(
  roles: ReadonlyMap<string, number>,
): SemanticTypeScriptDiagnosticSummaryRow['sourceRoles'] {
  return [...roles.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role));
}

function trimTypeScriptDiagnosticMessage(message: string): string {
  const firstLine = message.split(/\r?\n/u)[0] ?? '';
  return firstLine.length <= 140 ? firstLine : `${firstLine.slice(0, 137)}...`;
}
