import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityAvailabilityState,
  type FrameworkCapabilityDemand,
  type FrameworkCapabilityPackageEvidence,
  FrameworkCapabilityDemandSiteKind,
} from '../framework/capability-demand.js';
import {
  FrameworkRegistrationCapability,
} from '../registration/framework-registration-manifest.js';
import type { KernelStore } from '../kernel/store.js';
import {
  SemanticAppQueryKind,
  type SemanticFrameworkCapabilityDemandActionability,
  type SemanticFrameworkCapabilityDemandRow,
  type SemanticFrameworkCapabilityDemandsResult,
  type SemanticFrameworkCapabilityPackageEvidenceRow,
  type SemanticAppDiagnosticRow,
  type SemanticRuntimeSourceFileInput,
} from './contracts.js';
import {
  frameworkCapabilityDemandDiagnostic,
} from './template-diagnostic-policy.js';
import {
  describeAddress,
  semanticSourceReferenceMatchesFilePath,
} from './source-reference.js';

/** Project framework capability-demand products into the public app-query row surface. */
export function readFrameworkCapabilityDemandRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  includeHandles: boolean,
  sourceFile?: SemanticRuntimeSourceFileInput | null,
): readonly SemanticFrameworkCapabilityDemandRow[] {
  const sourceFilePath = sourceFile?.filePath ?? null;
  return emission.capabilityDemands.readDemands()
    .map((demand) => frameworkCapabilityDemandRow(store, demand, includeHandles))
    .filter((row) => sourceFilePath == null || frameworkCapabilityDemandRowMatchesSourceFile(row, sourceFilePath))
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.siteKind}:${left.requiredCapability}:${left.authoredName}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.siteKind}:${right.requiredCapability}:${right.authoredName}`)
    );
}

export function frameworkCapabilityDemandsDisplayText(
  rows: readonly SemanticFrameworkCapabilityDemandRow[],
  totalRows: number,
): SemanticFrameworkCapabilityDemandsResult['displayText'] {
  const byAdmission = countBy(rows, (row) => row.admissionState);
  const bySite = countBy(rows, (row) => row.siteKind);
  const lines = [
    `Framework capability demands: ${rows.length} of ${totalRows} row(s).`,
  ];
  if (rows.length > 0) {
    lines.push(`Admission: ${formatCounts(byAdmission)}.`);
    lines.push(`Sites: ${formatCounts(bySite)}.`);
  }
  if (rows.some((row) => row.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted)) {
    lines.push('Missing registrations are diagnostic/action candidates; edit placement remains source-edit-policy-open until a bootstrap/import planner chooses the exact change.');
  }
  if (rows.some((row) => row.admissionState === FrameworkCapabilityAdmissionState.AdmissionUnknown)) {
    lines.push('Unknown admissions should be inspected with open-seam rows before accusing a missing registration.');
  }
  if (rows.some((row) => row.admissionState === FrameworkCapabilityAdmissionState.AdmittedChainUnproven)) {
    lines.push('Chain-unproven admissions found provider evidence, but semantic-runtime could not prove the consulting container chain.');
  }
  return lines.join('\n');
}

/** Project source-faced framework capability demands into unified app diagnostics. */
export function readFrameworkCapabilityDemandDiagnosticRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly SemanticAppDiagnosticRow[] {
  return emission.capabilityDemands.readDemands()
    .filter((demand) =>
      demand.siteKind === FrameworkCapabilityDemandSiteKind.SourceServiceApi
      && demand.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted
    )
    .flatMap((demand): readonly SemanticAppDiagnosticRow[] => {
      const source = describeAddress(store, demand.sourceAddressHandle);
      if (source == null) {
        return [];
      }
      const diagnostic = frameworkCapabilityDemandDiagnostic(demand, source);
      return [{
        projectKey: demand.projectKey,
        diagnosticDomain: 'framework',
        diagnosticKind: diagnostic.diagnosticKind,
        diagnosticAuthority: diagnostic.diagnosticAuthority,
        frameworkErrorCode: diagnostic.frameworkErrorCode,
        severity: diagnostic.severity,
        summary: diagnostic.summary,
        missingInput: diagnostic.missingInput,
        missingInputs: diagnostic.missingInputs,
        source: diagnostic.source,
        suggestion: diagnostic.suggestion,
        relatedQueryKind: relatedQueryKindForCapability(demand.requiredCapability),
        handles: {
          productHandle: demand.productHandle,
          identityHandle: demand.identityHandle,
          ownerIdentityHandle: demand.ownerIdentityHandle,
          sourceAddressHandle: demand.sourceAddressHandle,
          templateSourceAddressHandle: demand.templateSourceAddressHandle,
          resourceDefinitionProductHandle: demand.resourceDefinitionProductHandle,
        },
      }];
    })
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.diagnosticKind}:${left.missingInput ?? ''}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.diagnosticKind}:${right.missingInput ?? ''}`)
    );
}

function frameworkCapabilityDemandRow(
  store: KernelStore,
  demand: FrameworkCapabilityDemand,
  includeHandles: boolean,
): SemanticFrameworkCapabilityDemandRow {
  const source = describeAddress(store, demand.sourceAddressHandle);
  const templateSource = describeAddress(store, demand.templateSourceAddressHandle);
  return {
    projectKey: demand.projectKey,
    siteKind: demand.siteKind,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    requiredRegistrationKinds: demand.requiredRegistrationKinds,
    candidateModuleNames: demand.candidateModuleNames,
    admissionState: demand.admissionState,
    availabilityState: demand.availabilityState,
    actionability: frameworkCapabilityDemandActionability(demand),
    packageEvidence: demand.packageEvidence.map((evidence) =>
      frameworkCapabilityPackageEvidenceRow(store, evidence, includeHandles)
    ),
    recommendedModuleName: demand.recommendedModuleName,
    authoredName: demand.authoredName,
    source,
    templateSource,
    blockingOpenSeamCount: demand.blockingOpenSeamHandles.length,
    relatedQueryKind: relatedQueryKindForCapability(demand.requiredCapability),
    summary: frameworkCapabilityDemandSummary(demand),
    ...(includeHandles ? {
      handles: {
        productHandle: demand.productHandle,
        identityHandle: demand.identityHandle,
        ownerIdentityHandle: demand.ownerIdentityHandle,
        sourceAddressHandle: demand.sourceAddressHandle,
        templateSourceAddressHandle: demand.templateSourceAddressHandle,
        resourceDefinitionProductHandle: demand.resourceDefinitionProductHandle,
        blockingOpenSeamHandles: demand.blockingOpenSeamHandles,
      },
    } : {}),
  };
}

function frameworkCapabilityPackageEvidenceRow(
  store: KernelStore,
  evidence: FrameworkCapabilityPackageEvidence,
  includeHandles: boolean,
): SemanticFrameworkCapabilityPackageEvidenceRow {
  return {
    evidenceKind: evidence.evidenceKind,
    packageName: evidence.packageName,
    moduleName: evidence.moduleName,
    scope: evidence.scope,
    source: describeAddress(store, evidence.sourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        sourceAddressHandle: evidence.sourceAddressHandle,
      },
    } : {}),
  };
}

function frameworkCapabilityDemandActionability(
  demand: FrameworkCapabilityDemand,
): SemanticFrameworkCapabilityDemandActionability {
  switch (demand.admissionState) {
    case FrameworkCapabilityAdmissionState.Admitted:
      return 'registered';
    case FrameworkCapabilityAdmissionState.NotAdmitted:
      return 'missing-registration';
    case FrameworkCapabilityAdmissionState.AdmissionUnknown:
      return 'registration-status-unknown';
    case FrameworkCapabilityAdmissionState.AdmittedChainUnproven:
      return 'provider-visible-chain-unproven';
  }
}

function frameworkCapabilityDemandSummary(
  demand: FrameworkCapabilityDemand,
): string {
  const moduleText = demand.recommendedModuleName == null
    ? 'no recommended module'
    : `recommended module ${demand.recommendedModuleName}`;
  const availabilityText = demand.availabilityState === FrameworkCapabilityAvailabilityState.EvidenceFound
    ? 'local package/import evidence found'
    : 'no local package/import evidence';
  return `${demand.siteKind} "${demand.authoredName}" requires ${demand.requiredCapability}; admission=${demand.admissionState}; ${availabilityText}; ${moduleText}.`;
}

function frameworkCapabilityDemandRowMatchesSourceFile(
  row: SemanticFrameworkCapabilityDemandRow,
  sourceFilePath: string,
): boolean {
  return semanticSourceReferenceMatchesFilePath(row.source, sourceFilePath)
    || semanticSourceReferenceMatchesFilePath(row.templateSource, sourceFilePath)
    || row.packageEvidence.some((evidence) => semanticSourceReferenceMatchesFilePath(evidence.source, sourceFilePath));
}

function countBy(
  rows: readonly SemanticFrameworkCapabilityDemandRow[],
  key: (row: SemanticFrameworkCapabilityDemandRow) => string,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function formatCounts(counts: ReadonlyMap<string, number>): string {
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([key, count]) => `${key}(${count})`)
    .join(', ');
}

export function relatedQueryKindForCapability(
  capability: FrameworkRegistrationCapability,
): SemanticAppQueryKind {
  switch (capability) {
    case FrameworkRegistrationCapability.DialogServiceResolvers:
      return SemanticAppQueryKind.DialogIssues;
    case FrameworkRegistrationCapability.ValidationServiceResolvers:
      return SemanticAppQueryKind.ValidationIssues;
    case FrameworkRegistrationCapability.ValidationHtmlServiceResolvers:
      return SemanticAppQueryKind.ValidationIssues;
    case FrameworkRegistrationCapability.I18nServiceResolvers:
      return SemanticAppQueryKind.I18nTranslationBindings;
    case FrameworkRegistrationCapability.RouterConfigurationResolvers:
    case FrameworkRegistrationCapability.RouterDefaultComponents:
    case FrameworkRegistrationCapability.RouterDefaultResources:
    case FrameworkRegistrationCapability.RouterLifecycleTasks:
      return SemanticAppQueryKind.RouterIssues;
    case FrameworkRegistrationCapability.StateStoreResolvers:
    case FrameworkRegistrationCapability.StateStoreTasks:
      return SemanticAppQueryKind.StateIssues;
    default:
      return SemanticAppQueryKind.ConfigurationIssues;
  }
}
