import {
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import { SourceFileRole } from '../kernel/address.js';
import { externalizeSourceFileRole } from '../kernel/source-classification.js';
import type { SourceFileAdmission } from '../boot/frames.js';
import { DiIssueSubjectKind } from '../di/di-issue.js';
import type {
  SemanticAppDiagnosticPhase,
  SemanticAppDiagnosticRow,
  SemanticAppDiagnosticSummaryRow,
  SemanticAnalysisLimitationRow,
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
  analysisLimitationRows: readonly SemanticAnalysisLimitationRow[],
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
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
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
    ...analysisLimitationRows
      .filter((row) => row.effectivePolicy.disposition !== 'off')
      .filter((row) => diagnosticSourceMatches(row.source, sourceFilePath))
      .map((row) => appDiagnosticRowWithSourceRole(
        analysisLimitationAppDiagnosticRow(projectKey, row),
        projectKey,
        sources,
      )),
  ].sort((left, right) =>
    `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.diagnosticDomain}:${left.diagnosticKind}`
      .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.diagnosticDomain}:${right.diagnosticKind}`)
      );
}

function analysisLimitationAppDiagnosticRow(
  projectKey: string,
  row: SemanticAnalysisLimitationRow,
): SemanticAppDiagnosticRow {
  if (row.effectivePolicy.disposition === 'off') {
    throw new Error(`Suppressed analysis limitation '${row.findingKey}' cannot enter app diagnostics.`);
  }
  return {
    projectKey,
    diagnosticDomain: 'analysis',
    phase: null,
    diagnosticKind: row.ruleId,
    diagnosticAuthority: 'semantic-authoring-policy',
    frameworkErrorCode: null,
    frameworkRawErrorAuthority: null,
    severity: row.effectivePolicy.disposition,
    summary: `${row.title}. ${row.explanation} ${row.action}`,
    missingInput: null,
    missingInputs: [],
    source: row.source,
    subject: null,
    diagnosticIdentityHandle: null,
    relatedInformation: [],
    suggestion: null,
    sourceRole: null,
    relatedQueryKind: 'analysis-limitations' satisfies `${SemanticAppQueryKind}`,
  };
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
  readonly diagnosticKind: SemanticAppDiagnosticRow['diagnosticKind'];
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

/** Shared admission boundary for template facts entering app-level diagnostic presentation. */
export function templateDiagnosticContributesToAppDiagnostics(
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
    phase: row.phase,
    diagnosticKind: row.diagnosticKind,
    diagnosticAuthority: 'typescript',
    typeScriptDiagnosticCode: row.code,
    frameworkErrorCode: null,
    frameworkRawErrorAuthority: null,
    severity: row.severity,
    summary: row.message,
    missingInput: null,
    missingInputs: [],
    source: row.source,
    subject: null,
    diagnosticIdentityHandle: null,
    relatedInformation: row.relatedInformation.map((related) => ({
      code: `TS${related.code}`,
      message: related.message,
      source: related.source,
      sourceRole: related.sourceRole,
    })),
    suggestion: null,
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
  if (source.sourceWorkspaceKey != null && source.sourceWorkspaceKey !== projectKey) {
    return externalizeSourceFileRole(source.sourceFileRole ?? SourceFileRole.Unknown);
  }
  if (
    source.sourceFileRole === SourceFileRole.ExternalSource
    || source.sourceFileRole === SourceFileRole.Generated
  ) {
    return source.sourceFileRole;
  }
  if (source.path != null) {
    const path = source.path;
    const admission = sources.find((candidate) => sourcePathMatchesFileName(candidate.path, path)) ?? null;
    if (admission != null) {
      return admission.role;
    }
  }
  if (source.sourceFileRole != null) {
    return source.sourceFileRole;
  }
  return sourceRoleForDiagnosticReference(projectKey, sources, source.anchor ?? null);
}

type AppDiagnosticHandles = NonNullable<SemanticAppDiagnosticRow['handles']>;

interface OwnedIssueDiagnosticRow {
  readonly projectKey: string;
  readonly phase: SemanticAppDiagnosticPhase;
  readonly issueKind: SemanticAppDiagnosticRow['diagnosticKind'];
  readonly diagnosticAuthority: SemanticAppDiagnosticRow['diagnosticAuthority'];
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticAppDiagnosticRow['severity'];
  readonly message: string;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: AppDiagnosticHandles['productHandle'];
    readonly identityHandle: AppDiagnosticHandles['identityHandle'];
    readonly sourceAddressHandle: AppDiagnosticHandles['sourceAddressHandle'];
  };
}

interface OwnedIssueDiagnosticFacets {
  readonly frameworkRawErrorAuthority?: string | null;
  readonly missingInput?: string | null;
  readonly missingInputs?: readonly string[];
  readonly subject?: SemanticAppDiagnosticRow['subject'];
  readonly relatedInformation?: SemanticAppDiagnosticRow['relatedInformation'];
  readonly suggestion?: SemanticAppDiagnosticRow['suggestion'];
  readonly ownerIdentityHandle?: AppDiagnosticHandles['ownerIdentityHandle'];
  readonly relatedSourceAddressHandles?: AppDiagnosticHandles['relatedSourceAddressHandles'];
}

function ownedIssueAppDiagnosticRow(
  row: OwnedIssueDiagnosticRow,
  diagnosticDomain: SemanticAppDiagnosticRow['diagnosticDomain'],
  relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  facets: OwnedIssueDiagnosticFacets = {},
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain,
    phase: row.phase,
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    frameworkRawErrorAuthority: facets.frameworkRawErrorAuthority ?? null,
    severity: row.severity,
    summary: row.message,
    missingInput: facets.missingInput ?? null,
    missingInputs: facets.missingInputs ?? [],
    source: row.source,
    subject: facets.subject ?? null,
    diagnosticIdentityHandle: null,
    relatedInformation: facets.relatedInformation ?? [],
    suggestion: facets.suggestion ?? null,
    sourceRole: null,
    relatedQueryKind,
    ...appDiagnosticHandles(
      row.handles,
      facets.ownerIdentityHandle ?? null,
      facets.relatedSourceAddressHandles ?? [],
    ),
  };
}

function appDiagnosticHandles(
  handles: OwnedIssueDiagnosticRow['handles'],
  ownerIdentityHandle: AppDiagnosticHandles['ownerIdentityHandle'],
  relatedSourceAddressHandles: AppDiagnosticHandles['relatedSourceAddressHandles'],
  overlayOrigin: Pick<AppDiagnosticHandles, 'overlayOriginKey' | 'overlayFileName' | 'overlaySegmentLabel'> | null = null,
): { readonly handles?: AppDiagnosticHandles } {
  if (handles == null) {
    return {};
  }
  return {
    handles: {
      productHandle: handles.productHandle,
      identityHandle: handles.identityHandle,
      ownerIdentityHandle,
      sourceAddressHandle: handles.sourceAddressHandle,
      relatedSourceAddressHandles,
      templateSourceAddressHandle: null,
      resourceDefinitionProductHandle: null,
      overlayOriginKey: overlayOrigin?.overlayOriginKey ?? null,
      overlayFileName: overlayOrigin?.overlayFileName ?? null,
      overlaySegmentLabel: overlayOrigin?.overlaySegmentLabel ?? null,
    },
  };
}

function evaluationAppDiagnosticRow(
  row: SemanticEvaluationIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'evaluation', 'evaluation-issues', {
    frameworkRawErrorAuthority: row.frameworkRawErrorAuthority,
    subject: {
      subjectKind: row.subjectKind,
      subjectName: null,
      source: row.source,
    },
  });
}

function configurationAppDiagnosticRow(
  row: SemanticConfigurationIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'configuration', 'configuration-issues');
}

function diAppDiagnosticRow(
  row: SemanticDiIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'di', 'di-issues', {
    subject: {
      subjectKind: row.subjectKind,
      subjectName: diDiagnosticSubjectName(row),
      source: row.source,
    },
  });
}

function diDiagnosticSubjectName(
  row: SemanticDiIssueRow,
): string | null {
  switch (row.subjectKind) {
    case DiIssueSubjectKind.ResourceSlot:
      return row.resourceKey;
    case DiIssueSubjectKind.ResolveCall:
      return row.resolveCall?.keyExpressionText ?? null;
    case DiIssueSubjectKind.InjectDecorator:
      return row.injectDecorator?.targetName ?? null;
    case DiIssueSubjectKind.ContainerApiCall:
      return row.containerApiCall?.wrappedKeyName
        ?? row.containerApiCall?.keyExpressionText
        ?? null;
    case DiIssueSubjectKind.DependencyCycle:
      return row.dependencyCycle?.entryKeyName ?? null;
    case DiIssueSubjectKind.RegistrationCascade:
      return null;
  }
  return null;
}

function observationAppDiagnosticRow(
  row: SemanticObservationIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'observation', 'observation-issues', {
    subject: row.subjectName == null
      ? null
      : {
        subjectKind: 'observation-member',
        subjectName: row.subjectName,
        source: row.source,
      },
    suggestion: row.suggestion,
    relatedInformation: row.relatedInformation,
    relatedSourceAddressHandles: row.handles?.relatedSourceAddressHandles ?? [],
  });
}

/** Shared normalization of one admitted template diagnostic into the app presentation vocabulary. */
export function templateAppDiagnosticRow(
  projectKey: string,
  row: SemanticTemplateDiagnosticRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey,
    diagnosticDomain: 'template',
    phase: row.phase,
    diagnosticKind: row.diagnosticKind,
    diagnosticAuthority: row.diagnosticAuthority,
    ...(row.typeScriptDiagnosticCode == null
      ? {}
      : { typeScriptDiagnosticCode: row.typeScriptDiagnosticCode }),
    frameworkErrorCode: row.frameworkErrorCode,
    frameworkRawErrorAuthority: null,
    severity: row.severity,
    summary: row.summary,
    missingInput: row.missingInput,
    missingInputs: row.missingInputs,
    source: row.source,
    subject: row.subject ?? null,
    diagnosticIdentityHandle: row.diagnosticIdentityHandle,
    ...(row.diagnosticRelations == null ? {} : { diagnosticRelations: row.diagnosticRelations }),
    relatedInformation: row.relatedInformation ?? [],
    suggestion: row.suggestion,
    sourceRole: null,
    relatedQueryKind: 'template-diagnostics' satisfies `${SemanticAppQueryKind}`,
    ...appDiagnosticHandles(
      row.handles == null
        ? undefined
        : {
          productHandle: row.handles.semanticProductHandle,
          identityHandle: row.handles.semanticIdentityHandle,
          sourceAddressHandle: row.handles.sourceAddressHandle,
        },
      null,
      [],
      {
        overlayOriginKey: row.handles?.overlayOriginKey ?? null,
        overlayFileName: row.handles?.overlayFileName ?? null,
        overlaySegmentLabel: row.handles?.overlaySegmentLabel ?? null,
      },
    ),
  };
}

function resourceAppDiagnosticRow(
  row: SemanticResourceIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'resource', 'resource-issues', {
    subject: row.resource.resourceKind == null
      ? null
      : {
        subjectKind: row.resource.resourceKind,
        subjectName: row.resource.name ?? row.resource.key,
        source: row.source ?? row.resource.source,
      },
    relatedInformation: row.relatedInformation,
    ownerIdentityHandle: row.handles?.ownerDefinitionIdentityHandle ?? null,
    relatedSourceAddressHandles: row.handles?.relatedSourceAddressHandles ?? [],
  });
}

function stateAppDiagnosticRow(
  row: SemanticStateIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'state', 'state-issues', {
    frameworkRawErrorAuthority: row.frameworkRawErrorAuthority,
    ownerIdentityHandle: row.handles?.ownerIdentityHandle ?? null,
  });
}

function validationAppDiagnosticRow(
  row: SemanticValidationIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'validation', 'validation-issues', {
    ownerIdentityHandle: row.handles?.ownerIdentityHandle ?? null,
  });
}

function fetchClientAppDiagnosticRow(
  row: SemanticFetchClientIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'fetch-client', 'fetch-client-issues', {
    ownerIdentityHandle: row.handles?.ownerIdentityHandle ?? null,
  });
}

function dialogAppDiagnosticRow(
  row: SemanticDialogIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'dialog', 'dialog-issues', {
    ownerIdentityHandle: row.handles?.ownerIdentityHandle ?? null,
  });
}

export function routerAppDiagnosticRow(
  row: SemanticRouterIssueRow,
): SemanticAppDiagnosticRow {
  return ownedIssueAppDiagnosticRow(row, 'router', 'router-issues', {
    missingInput: row.missingInput,
    missingInputs: row.missingInputs,
    suggestion: row.suggestion,
    relatedInformation: row.relatedInformation,
    relatedSourceAddressHandles: row.handles?.relatedSourceAddressHandles ?? [],
  });
}

function routeAppDiagnosticRow(
  row: SemanticRouteRecognizerIssueRow,
): SemanticAppDiagnosticRow {
  return {
    projectKey: row.projectKey,
    diagnosticDomain: 'route-recognizer',
    phase: null,
    diagnosticKind: row.issueKind,
    diagnosticAuthority: row.diagnosticAuthority,
    frameworkErrorCode: row.frameworkErrorCode,
    frameworkRawErrorAuthority: row.frameworkRawErrorAuthority,
    severity: 'error',
    summary: row.message,
    missingInput: null,
    missingInputs: [],
    source: row.source,
    subject: null,
    diagnosticIdentityHandle: null,
    relatedInformation: [],
    suggestion: null,
    sourceRole: null,
    relatedQueryKind: 'route-recognizer-issues' satisfies `${SemanticAppQueryKind}`,
    ...appDiagnosticHandles(row.handles, null, []),
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
